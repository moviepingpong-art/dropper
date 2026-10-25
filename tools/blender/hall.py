# わたしの展示室：中世風の石の通路に絨毯を敷き、両側の壁に額縁を掛けた場面を Blender で書き出す。
#   python3 hall.py -- <出力.png> [幅px] [サンプル数] [preview|empty]
#   preview … 額縁にカードの見本をはめて撮る（見てもらう用）
#   empty   … 額縁なしの通路だけ（ページで額縁とカードを重ねる用）。各枠の窓の四隅（画面上の位置）も JSON に書く
#   door    … 額縁なしの通路の奥に、部屋の入口の木の扉（door.py）。夜の美術館の部屋1〜4の前
import bpy, bmesh, math, sys, os, json
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
a = sys.argv[sys.argv.index('--') + 1:]
OUT = a[0]; PX = int(a[1]) if len(a) > 1 else 1200; SAMPLES = int(a[2]) if len(a) > 2 else 96
MODE = a[3] if len(a) > 3 else 'preview'
bpy.ops.wm.read_factory_settings(use_empty=True)
import frame as F
sc = bpy.context.scene

HW, WALL, LEN = 2.0, 2.8, 14.0          # 通路の半分の幅・壁の高さ・長さ
SLOTS_Y = [2.5, 4.4, 6.3][:int(os.environ.get('SLOTS', 2))]  # 片側2つ＝両側で4つ（わたしの展示室）。SLOTS=3 で片側3つ＝6つ（夜の美術館の最後の通路）
S = 1.1                                 # 額縁の大きさ（窓の高さ 0.85m）
FZ = 1.5                                 # 額縁の中心の高さ


def mat_nodes(name):
    m = bpy.data.materials.new(name); m.use_nodes = True
    return m, m.node_tree, m.node_tree.nodes['Principled BSDF']


def stone_mat(name, scale, c1, c2, mortar=(0.03, 0.028, 0.025), rough=0.85, bump=0.3, row=0.5):
    m, nt, b = mat_nodes(name)
    co = nt.nodes.new('ShaderNodeTexCoord')
    br = nt.nodes.new('ShaderNodeTexBrick')
    br.inputs['Scale'].default_value = scale; br.inputs['Mortar Size'].default_value = 0.012
    br.inputs['Color1'].default_value = (*c1, 1); br.inputs['Color2'].default_value = (*c2, 1)
    br.inputs['Mortar'].default_value = (*mortar, 1); br.inputs['Row Height'].default_value = row
    nt.links.new(co.outputs['Object'], br.inputs['Vector'])
    n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = 18; n.inputs['Detail'].default_value = 8
    nt.links.new(co.outputs['Object'], n.inputs['Vector'])
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs['Factor'].default_value = .5
    nt.links.new(br.outputs['Color'], mix.inputs['A']); nt.links.new(n.outputs['Color'], mix.inputs['B'])
    nt.links.new(mix.outputs['Result'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = rough
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = bump
    mx = nt.nodes.new('ShaderNodeMath'); mx.operation = 'ADD'
    nt.links.new(br.outputs['Fac'], mx.inputs[0]); nt.links.new(n.outputs['Fac'], mx.inputs[1])
    nt.links.new(mx.outputs[0], bp.inputs['Height']); nt.links.new(bp.outputs['Normal'], b.inputs['Normal'])
    return m


def image_mat(name, path, rough=0.9, scale=(1, 1), sheen=0.0, emit=0.0):
    m, nt, b = mat_nodes(name)
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(path)
    if scale != (1, 1):
        co = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping')
        mp.inputs['Scale'].default_value = (scale[0], scale[1], 1)
        nt.links.new(co.outputs['UV'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], t.inputs['Vector'])
    nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = rough
    if sheen: b.inputs['Sheen Weight'].default_value = sheen
    if emit:
        nt.links.new(t.outputs['Color'], b.inputs['Emission Color']); b.inputs['Emission Strength'].default_value = emit
    return m


def emit_mat(name, color, strength):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.remove(nt.nodes['Principled BSDF'])
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (*color, 1); e.inputs['Strength'].default_value = strength
    nt.links.new(e.outputs[0], nt.nodes['Material Output'].inputs[0])
    return m


def box(loc, size, mat, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object; o.scale = size
    if bevel:
        bv = o.modifiers.new('b', 'BEVEL'); bv.width = bevel; bv.segments = 2
    o.data.materials.append(mat); return o


def plane(loc, size, rot, mat):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object; o.scale = (*size, 1); o.data.materials.append(mat)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True); return o


# ---- 通路 ----
floor_m = stone_mat('floor', 1.4, (0.20, 0.18, 0.16), (0.14, 0.12, 0.11), rough=0.6, bump=0.15, row=1.0)
wall_m = stone_mat('wall', 2.6, (0.36, 0.28, 0.20), (0.27, 0.21, 0.15), bump=0.5)
plane((0, LEN / 2, 0), (2 * HW, LEN + 2), (0, 0, 0), floor_m)
for sx in (-1, 1):
    plane((sx * HW, LEN / 2, WALL / 2), (LEN + 2, WALL), (math.radians(90), 0, math.radians(90)), wall_m)
# 天井：半円のヴォールト
bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=HW, depth=LEN + 2, location=(0, LEN / 2, WALL), rotation=(math.radians(90), 0, 0))
v = bpy.context.object
bm = bmesh.new(); bm.from_mesh(v.data)
bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, 0), plane_no=(0, 1, 0), clear_inner=True)
bm.to_mesh(v.data); bm.free()
v.data.materials.append(stone_mat('vault', 3.0, (0.16, 0.14, 0.12), (0.12, 0.10, 0.09), bump=0.3))
bpy.ops.object.shade_smooth()
# 柱と、天井をまたぐアーチのリブ（額縁の間ごと）
pil_m, _nt, _b = mat_nodes('pillar')
_n = _nt.nodes.new('ShaderNodeTexNoise'); _n.inputs['Scale'].default_value = 9; _n.inputs['Detail'].default_value = 10
_r = _nt.nodes.new('ShaderNodeValToRGB'); _r.color_ramp.elements[0].color = (0.14, 0.11, 0.08, 1); _r.color_ramp.elements[1].color = (0.30, 0.25, 0.19, 1)
_nt.links.new(_n.outputs['Fac'], _r.inputs['Fac']); _nt.links.new(_r.outputs['Color'], _b.inputs['Base Color'])
_bp = _nt.nodes.new('ShaderNodeBump'); _bp.inputs['Strength'].default_value = 0.25
_nt.links.new(_n.outputs['Fac'], _bp.inputs['Height']); _nt.links.new(_bp.outputs['Normal'], _b.inputs['Normal']); _b.inputs['Roughness'].default_value = 0.8
PIL = [SLOTS_Y[0] - 0.95 + 1.9 * k for k in range(6)]   # 額縁のない奥にも柱を続けて、通路を深く見せる
for y in PIL:
    for sx in (-1, 1):
        box((sx * (HW - 0.05), y, WALL / 2), (0.10, 0.36, WALL), pil_m, bevel=0.015)
        box((sx * (HW - 0.07), y, 0.15), (0.14, 0.44, 0.3), pil_m, bevel=0.015)      # 柱の台
        box((sx * (HW - 0.08), y, WALL - 0.08), (0.16, 0.44, 0.16), pil_m, bevel=0.015)  # 柱頭
    bpy.ops.mesh.primitive_torus_add(major_radius=HW - 0.06, minor_radius=0.08, major_segments=64, minor_segments=10,
                                     location=(0, y, WALL), rotation=(math.radians(90), 0, 0))
    t = bpy.context.object
    bm = bmesh.new(); bm.from_mesh(t.data)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, 0), plane_no=(0, 1, 0), clear_inner=True)
    bm.to_mesh(t.data); bm.free(); t.scale = (1, 1, 1); t.data.materials.append(pil_m); bpy.ops.object.shade_smooth()
    # 柱に燭台（小さな炎と光）
    for sx in (-1, 1):
        x = sx * (HW - 0.18)
        box((x + sx * 0.04, y, 2.05), (0.1, 0.05, 0.03), F.gold_mat('sconce', worn=False))
        bpy.ops.mesh.primitive_cylinder_add(radius=0.022, depth=0.12, location=(x, y, 2.13))
        bpy.context.object.data.materials.append(F.principled('candle', (0.9, 0.85, 0.72), rough=0.6))
        F.sphere((x, y, 2.215), 0.016, emit_mat('flame', (1.0, 0.62, 0.22), 60), scale=(1, 1, 1.8), seg=12)
        bpy.ops.object.light_add(type='POINT', location=(x, y, 2.26))
        L = bpy.context.object; L.data.energy = 14; L.data.color = (1.0, 0.62, 0.3); L.data.shadow_soft_size = 0.05

# 絨毯：少し厚みのある板に模様を貼る（模様 1.5m × 6m を繰り返す）
CW = 1.5
car = plane((0, LEN / 2 - 0.5, 0.006), (CW, LEN + 1), (0, 0, 0), image_mat('carpet', os.path.join(HERE, 'carpet.png'), rough=0.95, scale=(1, (LEN + 1) / 6.0), sheen=0.6))
sol = car.modifiers.new('s', 'SOLIDIFY'); sol.thickness = 0.012
# 金の房（絨毯の手前の端）
for i in range(16):
    x = -CW / 2 + 0.05 + i * (CW - 0.1) / 15
    bpy.ops.mesh.primitive_cylinder_add(radius=0.012, depth=0.08, location=(x, -1.0 - 0.04, 0.008), rotation=(math.radians(90), 0, 0))
    bpy.context.object.data.materials.append(F.gold_mat('tassel', worn=False))

# 奥：アーチの扉から朝の光
END = LEN - 1.0
plane((0, END + 0.02, WALL / 2 + 0.3), (2 * HW, WALL + 2), (math.radians(90), 0, 0), wall_m)
if MODE == 'door':
    import door as DOOR
    DOOR.build(END, wall_m)
else:
    door = emit_mat('dawnlight', (1.0, 0.78, 0.45), 6.0)
    plane((0, END, 1.05), (1.1, 2.1), (math.radians(90), 0, 0), door)
    bpy.ops.mesh.primitive_circle_add(vertices=32, radius=0.55, fill_type='NGON', location=(0, END, 2.1), rotation=(math.radians(90), 0, 0))
    bpy.context.object.data.materials.append(door)
    bpy.ops.object.light_add(type='AREA', location=(0, END - 0.3, 1.4)); L = bpy.context.object
    L.data.energy = 120; L.data.size = 1.2; L.data.color = (1.0, 0.8, 0.5); L.rotation_euler = (math.radians(90), 0, 0)

# ---- 額縁を掛ける ----
cards = sorted(p for p in os.listdir(HERE) if p.startswith('card') and p.endswith('.png'))
slots = []
for side, sx in (('L', -1), ('R', 1)):
    for i, y in enumerate(SLOTS_Y):
        slots.append((side, sx, i, y))
KINDS = ['dawn', 'quiet', 'quiet', 'dawn', 'dawn', 'quiet']
win_px = []
for n, (side, sx, i, y) in enumerate(slots):
    kind = KINDS[n]
    rot = (math.radians(90), 0, math.radians(-90 if sx > 0 else 90))
    loc = (sx * (HW - 0.015), y, FZ)
    if MODE in ('preview', 'frames'):
        parent, M, et, _, _ = F.build(kind)
        if cards and MODE == 'preview':
            pm = image_mat('card%d' % n, os.path.join(HERE, cards[n % len(cards)]), rough=0.5)
            bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 0.004))
            cp = bpy.context.object; cp.scale = (F.WW, F.WH, 1); cp.data.materials.append(pm); cp.parent = parent
        parent.scale = (S, S, S); parent.rotation_euler = rot; parent.location = loc
    # 額縁の下の真鍮の名札（字はページで重ねる）
    PZ = FZ - F.WH * S / 2 - 0.3
    if MODE != 'door': box((sx * (HW - 0.012), y, PZ), (0.02, 0.56, 0.12), F.principled('brass', (0.78, 0.6, 0.32), metal=1.0, rough=0.35), bevel=0.006)
    # 額縁ごとの上からの灯り（絵を照らす小さなスポット）
    bpy.ops.object.light_add(type='SPOT', location=(sx * (HW - 0.9), y, WALL - 0.1))
    L = bpy.context.object; L.data.energy = 160; L.data.spot_size = math.radians(38); L.data.spot_blend = 0.6
    L.data.color = (1.0, 0.86, 0.66); L.data.shadow_soft_size = 0.1
    d = Vector(loc) - L.location; L.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    win_px.append({'side': side, 'i': i, 'kind': kind, 'y': y,
                   'plate_world': [[sx * (HW - 0.024), y + sgn * 0.28 * -sx, PZ + v * 0.06] for (sgn, v) in [(-1, 1), (1, 1), (1, -1), (-1, -1)]],
                   'corners_world': [[sx * (HW - 0.02), y + sgn * F.WW * S / 2 * -sx, FZ + v * F.WH * S / 2] for (sgn, v) in [(-1, 1), (1, 1), (1, -1), (-1, -1)]]})

# ---- 空気・カメラ ----
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.01, 0.012, 0.02, 1)
w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.3
bpy.ops.object.light_add(type='AREA', location=(0, 0.5, WALL + 1.2)); L = bpy.context.object
L.data.energy = 60; L.data.size = 3; L.data.color = (0.75, 0.8, 1.0)

bpy.ops.object.camera_add(location=(0, float(os.environ.get('CAMY', -0.9)), 1.5), rotation=(math.radians(88), 0, 0))  # CAMY＝カメラの前後（扉の前に立つときは奥へ寄せる）
cam = bpy.context.object; sc.camera = cam; cam.data.lens = 20
sc.render.resolution_x = PX; sc.render.resolution_y = round(PX * 2 / 3)
sc.render.engine = 'CYCLES'; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True
sc.cycles.max_bounces = 6
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'
sc.render.image_settings.file_format = 'PNG'
sc.render.filepath = OUT
bpy.ops.render.render(write_still=True)

# 窓の四隅を画面の割合で（左上が 0,0）
# vis＝窓がカメラの前にあって、画面に少しでも入るか（前に進んだ絵では、手前の枠が後ろへ回る）
for s in win_px:
    zs = []
    for k in ('corners', 'plate'):
        s[k] = []
        for c in s.pop(k + '_world'):
            p = world_to_camera_view(sc, cam, Vector(c))
            s[k].append([round(p.x, 4), round(1 - p.y, 4)]); zs.append(p.z)
    xs = [q[0] for q in s['corners']]
    s['vis'] = min(zs) > 0.05 and max(xs) > 0.02 and min(xs) < 0.98
json.dump({'w': sc.render.resolution_x, 'h': sc.render.resolution_y, 'slots': win_px}, open(OUT.rsplit('.', 1)[0] + '.json', 'w'), ensure_ascii=False, indent=1)
print('DONE')
