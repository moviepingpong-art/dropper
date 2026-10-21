# 額縁2種を Blender で組み立てて、背景と窓を透明にした PNG に書き出す。
#   blender の代わりに: python3 frame.py -- <dawn|quiet> <出力.png> [幅px] [サンプル数]
# 額縁は寝かせて組み（XY 平面・高さ Z）、真上から正投影のカメラで撮る。窓（カードが入る穴）は透明のまま残す。
import bpy, bmesh, math, sys, json
from mathutils import Vector

MAIN = __name__ == '__main__'
if MAIN:
    a = sys.argv[sys.argv.index('--') + 1:]
    KIND, OUT = a[0], a[1]
    PX = int(a[2]) if len(a) > 2 else 720
    SAMPLES = int(a[3]) if len(a) > 3 else 96
    bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

# 窓はカード（180×276）と同じ縦横比
WW, WH = 0.652, 1.0


def principled(name, color, metal=0.0, rough=0.5, coat=0.0, aniso=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    if coat: b.inputs['Coat Weight'].default_value = coat
    if aniso: b.inputs['Anisotropic'].default_value = aniso
    return m


def gold_mat(name='gold', worn=True):
    # 金箔：少しむらのある金。くぼみはやや暗く（Pointiness の代わりにノイズで）
    m = principled(name, (1.0, 0.72, 0.30), metal=1.0, rough=0.22)
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    if worn:
        n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = 60; n.inputs['Detail'].default_value = 6
        r = nt.nodes.new('ShaderNodeValToRGB')
        r.color_ramp.elements[0].position = .35; r.color_ramp.elements[0].color = (0.45, 0.26, 0.07, 1)
        r.color_ramp.elements[1].position = .75; r.color_ramp.elements[1].color = (0.95, 0.66, 0.24, 1)
        nt.links.new(n.outputs['Fac'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], b.inputs['Base Color'])
        rr = nt.nodes.new('ShaderNodeMapRange'); rr.inputs['To Min'].default_value = .16; rr.inputs['To Max'].default_value = .34
        nt.links.new(n.outputs['Fac'], rr.inputs['Value']); nt.links.new(rr.outputs['Result'], b.inputs['Roughness'])
    return m


def silver_mat(name='silver'):
    return principled(name, (0.86, 0.88, 0.92), metal=1.0, rough=0.3)


def wood_mat(name='walnut'):
    # くるみ材：UV の v（辺に沿う向き）に木目が流れる
    m = principled(name, (0.16, 0.08, 0.04), rough=0.5, coat=0.15)
    m.node_tree.nodes['Principled BSDF'].inputs['Coat Roughness'].default_value = 0.35
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    uv = nt.nodes.new('ShaderNodeTexCoord')
    w = nt.nodes.new('ShaderNodeTexWave'); w.wave_type = 'BANDS'; w.bands_direction = 'X'
    w.inputs['Scale'].default_value = 14; w.inputs['Distortion'].default_value = 2.2; w.inputs['Detail'].default_value = 5
    w.inputs['Detail Scale'].default_value = 1.6
    nt.links.new(uv.outputs['UV'], w.inputs['Vector'])
    r = nt.nodes.new('ShaderNodeValToRGB')
    r.color_ramp.elements[0].color = (0.02, 0.009, 0.004, 1); r.color_ramp.elements[1].color = (0.12, 0.055, 0.022, 1)
    nt.links.new(w.outputs['Fac'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], b.inputs['Base Color'])
    return m


def velvet_mat(name, color):
    m = principled(name, color, rough=0.9)
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Sheen Weight'].default_value = 0.4; b.inputs['Sheen Tint'].default_value = (1, .8, .7, 1)
    return m


def moulding(name, profile, mat, ww=WW, wh=WH):
    """profile: [(d, z), ...] を窓の縁から外へ。各点で四角い輪をつくり、隣どうしを面でつなぐ（角は45度の留め）。
    UV は u＝輪の番号の割合、v＝辺に沿う長さ（木目用）"""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    rings = []
    for d, z in profile:
        hx, hy = ww / 2 + d, wh / 2 + d
        rings.append([bm.verts.new((x, y, z)) for x, y in [(-hx, -hy), (hx, -hy), (hx, hy), (-hx, hy)]])
    uvl = bm.loops.layers.uv.new()
    n = len(rings)
    for i in range(n - 1):
        for s in range(4):
            v = [rings[i][s], rings[i][(s + 1) % 4], rings[i + 1][(s + 1) % 4], rings[i + 1][s]]
            f = bm.faces.new(v)
            for lp in f.loops:
                co = lp.vert.co; k = rings[i].count(lp.vert) and i or i + 1
                along = co.x if s % 2 == 0 else co.y
                lp[uvl].uv = (k / (n - 1) * .25, along)
    bm.normal_update()
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); sc.collection.objects.link(o)
    o.data.materials.append(mat)
    # 外向きに面をそろえ、角度でなめらかに
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(40))
    o.select_set(False)
    return o


def arc(d0, d1, z0, z1, peak, n=8, concave=False):
    """d0→d1 を、両端 z0・z1、中ほどが peak だけ盛り上がる（へこむ）半円ぎみの弧で"""
    pts = []
    for i in range(n + 1):
        t = i / n
        z = z0 + (z1 - z0) * t + (-1 if concave else 1) * peak * math.sin(math.pi * t)
        pts.append((d0 + (d1 - d0) * t, z))
    return pts


def sphere(loc, r, mat, scale=(1, 1, 1), seg=24):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=seg, ring_count=seg // 2)
    o = bpy.context.object; o.scale = scale; o.data.materials.append(mat); bpy.ops.object.shade_smooth()
    return o


def beads_along(d, z, r, gap, mat, ww=WW, wh=WH, skip_corner=0.0):
    hx, hy = ww / 2 + d, wh / 2 + d
    for (x0, y0, x1, y1) in [(-hx, -hy, hx, -hy), (hx, -hy, hx, hy), (hx, hy, -hx, hy), (-hx, hy, -hx, -hy)]:
        L = math.hypot(x1 - x0, y1 - y0); n = int((L - 2 * skip_corner) / gap)
        for i in range(n + 1):
            t = (skip_corner + i * (L - 2 * skip_corner) / max(n, 1)) / L
            sphere((x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, z), r, mat, seg=12)


def rosette(loc, r, mat, petals=8, z=0.0):
    # 花形の飾り：まん中の玉と、まわりの平たい花びら
    sphere(loc, r * .42, mat, scale=(1, 1, .8))
    for i in range(petals):
        a_ = i / petals * math.tau
        p = (loc[0] + math.cos(a_) * r * .62, loc[1] + math.sin(a_) * r * .62, loc[2] - r * .1)
        o = sphere(p, r * .36, mat, scale=(1.35, .7, .5), seg=16); o.rotation_euler.z = a_


def acanthus(cx, cy, sx, sy, z, s, mat):
    # 角の葉飾り：角から2方向へ、小さくなる玉を並べた巻き葉
    rosette((cx, cy, z + s * .35), s * .9, mat, petals=10)
    for dirx, diry in [(-sx, 0), (0, -sy)]:
        for k in range(1, 6):
            t = k / 6
            r = s * (0.42 - 0.05 * k)
            curl = math.sin(t * math.pi) * s * .35
            px = cx + dirx * (s * 1.3 * k / 2.2) + (diry and sx * curl or 0) * .0
            py = cy + diry * (s * 1.3 * k / 2.2)
            px += (0 if dirx else -sx * curl * .4); py += (0 if diry else -sy * curl * .4)
            o = sphere((px, py, z + r * .5), r, mat, scale=(1.5 if dirx else .75, .75 if dirx else 1.5, .55), seg=16)


def crest(cx, cy, z, s, mat):
    # 上の真ん中の貝殻の飾り：扇に広がる畝と、下の玉
    for i in range(11):
        a_ = math.radians(20 + i * 14)
        L = s * (1.0 if i % 2 == 0 else .85)
        bpy.ops.mesh.primitive_cylinder_add(radius=s * .09, depth=L, location=(cx + math.cos(a_) * L / 2, cy + math.sin(a_) * L / 2, z))
        o = bpy.context.object; o.rotation_euler = (math.radians(90), 0, a_ - math.radians(90)); o.scale = (1, .6, 1)
        o.data.materials.append(mat); bpy.ops.object.shade_smooth()
        sphere((cx + math.cos(a_) * L, cy + math.sin(a_) * L, z), s * .11, mat, seg=14)
    sphere((cx, cy, z), s * .28, mat, scale=(1.2, .9, .8))


# ---- 額縁を組む（展示室 hall.py からも呼ぶ。できた物はすべて1つの空の親の下に入れて返す） ----
def build(KIND):
    global sc
    sc = bpy.context.scene
    before = set(sc.objects)
    if KIND == 'dawn':
        M = 0.19
        gold = gold_mat()
        prof = [(-0.004, 0.0), (0.0, 0.018)]
        prof += arc(0.0, 0.012, 0.018, 0.03, 0.004, 4)                  # 内側の細い縁
        prof += arc(0.012, 0.04, 0.03, 0.035, 0.012, 8, concave=True)   # くぼみ
        prof += arc(0.04, 0.105, 0.035, 0.05, 0.035, 14)                # 太い丸
        prof += [(0.11, 0.046), (0.15, 0.046)]                          # 平らな帯（玉を並べる）
        prof += arc(0.15, 0.178, 0.046, 0.03, 0.02, 8)                  # 外の玉縁
        prof += [(0.186, 0.02), (M, 0.0)]
        moulding('frame', prof, gold)
        # 窓の内側に、えんじのビロードの細い敷き
        moulding('liner', [(-0.03, 0.006), (-0.03, 0.016), (-0.004, 0.018), (-0.004, 0.0)], velvet_mat('velvet', (0.06, 0.005, 0.01)))
        beads_along(0.13, 0.05, 0.0075, 0.021, gold, skip_corner=0.06)
        for sx in (-1, 1):
            for sy in (-1, 1):
                acanthus(sx * (WW / 2 + 0.13), sy * (WH / 2 + 0.13), sx, sy, 0.05, 0.05, gold)
        NOC = bool(__import__('os').environ.get('NOCREST'))   # 小さな額縁用：上の貝殻を付けない（上辺をそろえるため）
        if not NOC: crest(0, WH / 2 + 0.17, 0.05, 0.12, gold)
        # 下の真ん中の小さな飾り
        rosette((0, -(WH / 2 + 0.13), 0.06), 0.04, gold, petals=8)
        key = [(-1.6, 1.8, 1.1, 260, (1.0, 0.84, 0.6)), (1.6, -0.8, 1.4, 50, (0.6, 0.7, 1.0))]
        extra_top = 0.0 if NOC else 0.17 + 0.12
        REFL = 0.35
    else:
        M = 0.16
        wood = wood_mat(); silver = silver_mat()
        prof = [(-0.004, 0.0), (0.0, 0.012)]
        moulding('slip', prof + arc(0.0, 0.026, 0.012, 0.016, 0.01, 8) + [(0.03, 0.012)], silver)   # 内側の銀の縁
        prof2 = [(0.03, 0.012)] + arc(0.03, 0.06, 0.012, 0.04, 0.008, 6) + [(0.07, 0.044), (0.13, 0.044)]
        prof2 += arc(0.13, 0.155, 0.044, 0.02, 0.012, 6) + [(M, 0.0)]
        moulding('frame', prof2, wood)
        # 角の銀の金具（L字）と鋲
        for sx in (-1, 1):
            for sy in (-1, 1):
                cx, cy = sx * (WW / 2 + 0.1), sy * (WH / 2 + 0.1)
                for (lx, ly, w_, h_) in [(cx - sx * 0.035, cy, 0.11, 0.045), (cx, cy - sy * 0.05625, 0.045, 0.0675)]:
                    bpy.ops.mesh.primitive_cube_add(size=1, location=(lx, ly, 0.05))
                    o = bpy.context.object; o.scale = (w_, h_, 0.016)
                    bv = o.modifiers.new('b', 'BEVEL'); bv.width = 0.007; bv.segments = 4
                    bpy.ops.object.shade_smooth()
                    o.data.materials.append(silver)
                for (px, py) in [(cx, cy), (cx - sx * 0.06, cy), (cx, cy - sy * 0.06)]:
                    sphere((px, py, 0.056), 0.008, silver, scale=(1, 1, .6), seg=12)
        # 上に小さな銀の葉飾り
        rosette((0, WH / 2 + 0.1, 0.05), 0.035, silver, petals=6)
        key = [(-1.6, 1.8, 1.1, 230, (1.0, 0.93, 0.85)), (1.6, -0.8, 1.4, 60, (0.65, 0.75, 1.0))]
        extra_top = 0.0
        REFL = 0.9
    parent = bpy.data.objects.new('frame_' + KIND, None); sc.collection.objects.link(parent)
    for o in set(sc.objects) - before - {parent}:
        if o.parent is None: o.parent = parent
    return parent, M, extra_top, key, REFL


if MAIN:
    _, M, extra_top, key, REFL = build(KIND)

    # ---- 光 ----
    # 真上の大きな面（カメラには映らず、映りこみだけ）：平らな金属が真っ黒に見えないように
    bpy.ops.mesh.primitive_plane_add(size=6, location=(-0.6, 0.6, 9))
    rp = bpy.context.object; em = bpy.data.materials.new('refl'); em.use_nodes = True
    en = em.node_tree.nodes; en.remove(en['Principled BSDF']); e_ = en.new('ShaderNodeEmission')
    e_.inputs['Strength'].default_value = REFL; em.node_tree.links.new(e_.outputs[0], en['Material Output'].inputs[0])
    rp.data.materials.append(em); rp.visible_camera = False; rp.visible_diffuse = False
    for (x, y, z, e, col) in key:
        bpy.ops.object.light_add(type='AREA', location=(x, y, z))
        L = bpy.context.object; L.data.energy = e; L.data.size = 1.6; L.data.color = col
        d = Vector((0, 0, 0)) - L.location; L.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.02, 0.022, 0.035, 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.25

    # ---- カメラ：真上から正投影。余白は少しだけ ----
    OW, OH = WW + 2 * M + 0.04, WH + 2 * M + 0.04 + extra_top
    cy = extra_top / 2
    bpy.ops.object.camera_add(location=(0, cy, 5)); cam = bpy.context.object; sc.camera = cam
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = max(OW, OH)
    sc.render.resolution_x = PX; sc.render.resolution_y = round(PX * OH / OW)
    cam.data.sensor_fit = 'HORIZONTAL'; cam.data.ortho_scale = OW
    sc.render.engine = 'CYCLES'; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'
    sc.render.filepath = OUT
    bpy.ops.render.render(write_still=True)

    # 窓の位置（画像の左上からの割合）をページの CSS 用に書いておく
    px = sc.render.resolution_x / OW
    win = {'w': sc.render.resolution_x, 'h': sc.render.resolution_y,
           'left': round((OW / 2 - WW / 2) * px), 'top': round((OH / 2 + cy - WH / 2) * px),
           'ww': round(WW * px), 'wh': round(WH * px)}
    json.dump(win, open(OUT.rsplit('.', 1)[0] + '.json', 'w'))
    print('WIN', win)
