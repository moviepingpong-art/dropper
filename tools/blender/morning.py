# 朝の場面：夜が明けた美術館の正面と庭を Blender で書き出す（朝の画面のいちばん上の帯。1120×400＝表示の2倍）。
#   python3 morning.py -- <dawn|quiet> <段階1-5> <出力.png> [幅px] [サンプル数]
#   夜明け＝光が育つ（細い光→光の筋→金の粒→鳥が飛ぶ→館全体が金色）。太陽の高さと館の染まり方が段階で変わる
#   静かな朝＝やすらぎが育つ（朝もや→花一輪→花びらが舞う→小鳥が鳴く→庭いっぱいの花）。花・枝の小鳥が段階で増える
#   FILM=<フォルダ> を付けると、カメラが館のまわりを回る20秒の映像（480コマ。2026-10-26 に5秒→10秒→20秒（半分の速さ）にし、館に奥行きと、寄り1回・引き1回のズームを足した。ページは1回だけ流し、ループしない）を書き出す（夜明けの画面の映像。2026-10-25 重吉さんの決め）
#     斜め上から入り、正面・横へ回って元の所へ戻る。できたコマは飛ばすので、止まっても同じ命令で続きから。CAMT=0.25 なら その1コマだけ試す
#   動くもの（金の粒・飛ぶ鳥・舞う花びら・光の間の金の柱と銀の雨）はページの canvas が上に重ねる（night-app.js の drawScene）
import bpy, math, sys, random, os
from mathutils import Vector, Matrix

a = sys.argv[sys.argv.index('--') + 1:]
KIND = a[0]; LV = int(a[1]); OUT = a[2]
PX = int(a[3]) if len(a) > 3 else 1120; SAMPLES = int(a[4]) if len(a) > 4 else 96
DAWN = KIND == 'dawn'
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
random.seed(7)


def mat(name, color, rough=0.8, metal=0.0, emit=None, es=0.0, alpha=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = es
    if alpha < 1: b.inputs['Alpha'].default_value = alpha
    return m


def stone(name, c1, c2):
    m = mat(name, c1, 0.75); nt = m.node_tree; b = nt.nodes['Principled BSDF']
    n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = 6; n.inputs['Detail'].default_value = 6
    r = nt.nodes.new('ShaderNodeValToRGB')
    r.color_ramp.elements[0].color = (*c2, 1); r.color_ramp.elements[1].color = (*c1, 1)
    nt.links.new(n.outputs['Fac'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], b.inputs['Base Color'])
    return m


def grass(name):
    m = mat(name, (0.05, 0.09, 0.04), 0.95); nt = m.node_tree; b = nt.nodes['Principled BSDF']
    n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = 40; n.inputs['Detail'].default_value = 4
    r = nt.nodes.new('ShaderNodeValToRGB')
    r.color_ramp.elements[0].color = (0.025, 0.05, 0.022, 1); r.color_ramp.elements[1].color = (0.07, 0.12, 0.05, 1)
    nt.links.new(n.outputs['Fac'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], b.inputs['Base Color'])
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = .4
    nt.links.new(n.outputs['Fac'], bp.inputs['Height']); nt.links.new(bp.outputs['Normal'], b.inputs['Normal'])
    return m


def stained(name, strength, scale=7.0):
    # ステンドグラス：石の目のような小さなガラス片（ルビー・サファイア・エメラルド・琥珀・紫）を黒い鉛の線でつなぐ。中から灯りが透ける
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    nt.nodes.remove(nt.nodes['Principled BSDF'])
    co = nt.nodes.new('ShaderNodeTexCoord')
    v = nt.nodes.new('ShaderNodeTexVoronoi'); v.inputs['Scale'].default_value = scale
    nt.links.new(co.outputs['Object'], v.inputs['Vector'])
    sp = nt.nodes.new('ShaderNodeSeparateColor'); nt.links.new(v.outputs['Color'], sp.inputs[0])
    r = nt.nodes.new('ShaderNodeValToRGB'); r.color_ramp.interpolation = 'CONSTANT'
    cols = [(0.75, 0.04, 0.06), (0.05, 0.15, 0.8), (0.95, 0.6, 0.08), (0.06, 0.55, 0.2), (0.45, 0.08, 0.6), (0.95, 0.85, 0.5)]
    r.color_ramp.elements[0].color = (*cols[0], 1); r.color_ramp.elements[1].position = 1 / 6; r.color_ramp.elements[1].color = (*cols[1], 1)
    for i, c in enumerate(cols[2:]):
        e = r.color_ramp.elements.new((i + 2) / 6); e.color = (*c, 1)
    nt.links.new(sp.outputs[0], r.inputs['Fac'])
    ed = nt.nodes.new('ShaderNodeTexVoronoi'); ed.feature = 'DISTANCE_TO_EDGE'; ed.inputs['Scale'].default_value = scale
    nt.links.new(co.outputs['Object'], ed.inputs['Vector'])
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 0.02; mr.inputs['From Max'].default_value = 0.05
    nt.links.new(ed.outputs['Distance'], mr.inputs['Value'])
    mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.inputs['A'].default_value = (0, 0, 0, 1)
    nt.links.new(mr.outputs['Result'], mx.inputs['Factor']); nt.links.new(r.outputs['Color'], mx.inputs['B'])
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Strength'].default_value = strength
    nt.links.new(mx.outputs['Result'], e.inputs['Color'])
    nt.links.new(e.outputs[0], nt.nodes['Material Output'].inputs[0])
    return m


def box(loc, size, m, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object; o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        bv = o.modifiers.new('b', 'BEVEL'); bv.width = bevel; bv.segments = 2
    o.data.materials.append(m); return o


def cyl(loc, r, d, m, verts=24, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=d, location=loc, vertices=verts, rotation=rot)
    o = bpy.context.object; o.data.materials.append(m); bpy.ops.object.shade_smooth(); return o


def ball(loc, scale, m):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=loc, segments=16, ring_count=8)
    o = bpy.context.object; o.scale = scale; o.data.materials.append(m); bpy.ops.object.shade_smooth(); return o


# ---- 美術館：中央に6本柱の玄関（破風に浮き彫り・梁に館の名）、奥に円い屋根、両側に翼の棟（アーチの窓・付け柱・欄干と壺）、
#      大階段の両脇に台座の像、柱の間に展覧会の垂れ幕。段階が進むほど灯りと飾りが増え、5段階目は金で華やぐ ----
gold = DAWN and LV >= 5
FEST = LV >= 5
ST = stone('stone', (0.66, 0.58, 0.47) if gold else (0.50, 0.49, 0.48), (0.42, 0.35, 0.26) if gold else (0.31, 0.30, 0.31))
if gold:
    b = ST.node_tree.nodes['Principled BSDF']
    b.inputs['Emission Color'].default_value = (1.0, 0.62, 0.25, 1); b.inputs['Emission Strength'].default_value = 0.25
WALL = stone('wall', (0.56, 0.47, 0.36) if gold else (0.40, 0.39, 0.39), (0.36, 0.29, 0.21) if gold else (0.25, 0.25, 0.27))
GILD = mat('gild', (1.0, 0.72, 0.32), 0.25, 1.0) if FEST else ST          # 5段階目だけ金箔
ROOF = mat('roof', (0.16, 0.25, 0.23) if not gold else (0.30, 0.28, 0.16), 0.5, 0.6)  # 円い屋根は緑青の銅
lit = [0.4, 0.6, 0.8, 1.0, 1.25][LV - 1]                                     # 窓の灯り
WIN = mat('win', (0, 0, 0), 1, emit=(1.0, 0.72, 0.42), es=2.0 * lit)
DOOR = mat('door', (0, 0, 0), 1, emit=(1.0, 0.70, 0.38), es=3 + LV)
GLASS = stained('glass', 1.2 * lit)
DARK = mat('dark', (0.02, 0.02, 0.025), 0.9)
W2, TOP, CH = 4.2, 0.9, 3.4                 # 玄関の幅の半分・基壇の高さ・柱の高さ


def column(x, y, h, r):
    # 溝のある柱（32角＋縦の溝の凹凸）・礎盤・イオニア式の柱頭（左右の渦巻き）
    c = cyl((x, y, TOP + h / 2), r, h, ST, 32)
    for k in range(16):
        an = k / 16 * math.tau
        box((x + math.cos(an) * r, y + math.sin(an) * r, TOP + h / 2), (0.025, 0.025, h * 0.92), ST)
    cyl((x, y, TOP + 0.06), r * 1.35, 0.12, ST, 32); cyl((x, y, TOP + 0.17), r * 1.2, 0.1, ST, 32)
    box((x, y, TOP + h - 0.04), (r * 2.9, r * 2.0, 0.08), ST)
    for sx in (-1, 1): cyl((x + sx * r * 1.15, y - 0.02, TOP + h - 0.16), r * 0.36, r * 2.0, ST, 16, rot=(math.pi / 2, 0, 0))
    box((x, y, TOP + h + 0.04), (r * 3.0, r * 3.0, 0.08), ST)


def entab(x0, x1, y0, y1, z, h):
    # 梁：下の帯・浮き彫りの帯・軒
    box(((x0 + x1) / 2, (y0 + y1) / 2, z + h * .2), (x1 - x0, y1 - y0, h * .4), ST)
    box(((x0 + x1) / 2, (y0 + y1) / 2 - .02, z + h * .6), (x1 - x0 - .1, y1 - y0, h * .4), ST)
    box(((x0 + x1) / 2, (y0 + y1) / 2 - .05, z + h * .92), (x1 - x0 + .3, y1 - y0 + .2, h * .16), ST, 0.01)
    for i in range(int((x1 - x0) / .32)):   # 軒の下の歯飾り
        box((x0 + .16 + i * .32, y0 - .08, z + h * .8), (.14, .1, .08), ST)


# 大階段（玄関の前へ広がる）と基壇
for i in range(6):
    box((0, -2.4 - 0.32 * (5 - i) + 0.2, 0.075 + 0.15 * i), (2 * W2 + 2.4 - 0.25 * i, 0.32 * (6 - i) + 2.6, 0.15), ST, 0.01)
box((0, 2.5, TOP / 2), (26, 6.4, TOP), ST, 0.02)
# 玄関の奥の壁・扉と両脇の窓・扉の上の飾り
box((0, 0.9, TOP + 2.1), (2 * W2, 0.4, 4.2), WALL)
box((0, 0.69, TOP + 1.25), (1.2, 0.05, 2.5), DOOR)
box((0, 0.66, TOP + 2.62), (1.6, 0.1, 0.16), ST, 0.01)
for x in (-0.68, 0.68): box((x, 0.66, TOP + 1.3), (0.16, 0.1, 2.6), ST, 0.01)
bpy.ops.mesh.primitive_torus_add(major_radius=0.62, minor_radius=0.06, location=(0, 0.64, TOP + 2.62), rotation=(math.pi / 2, 0, 0))
bpy.context.object.data.materials.append(GILD)
for x in (-2.7, -1.6, 1.6, 2.7):
    box((x, 0.69, TOP + 1.3), (0.5, 0.05, 1.3), WIN)
    box((x, 0.66, TOP + 2.05), (0.7, 0.1, 0.1), ST, 0.01)
    box((x, 0.69, TOP + 2.75), (0.5, 0.05, 0.5), GLASS)
for i in range(6):
    column(-W2 + 0.55 + i * (2 * W2 - 1.1) / 5, -0.75, CH, 0.25)
Z1 = TOP + CH + 0.08
entab(-W2 - .15, W2 + .15, -1.15, 0.9, Z1, 0.75)
# 梁に館の名
bpy.ops.object.text_add(location=(0, -1.17, Z1 + 0.42), rotation=(math.pi / 2, 0, 0))
t = bpy.context.object; t.data.body = 'MVSEVM ARTIVM'; t.data.align_x = 'CENTER'; t.data.align_y = 'CENTER'
t.data.size = 0.3; t.data.extrude = 0.01; t.data.space_character = 1.25; t.data.materials.append(GILD if FEST else DARK)
# 破風（三角）と浮き彫り（真ん中に円い紋章、両側へ低くなる人の影のような凹凸）
Z2 = Z1 + 0.75
verts = [(-W2 - .3, -1.25, Z2), (W2 + .3, -1.25, Z2), (0, -1.25, Z2 + 1.45), (-W2 - .3, 0.9, Z2), (W2 + .3, 0.9, Z2), (0, 0.9, Z2 + 1.45)]
me = bpy.data.meshes.new('ped'); me.from_pydata(verts, [], [(0, 1, 2), (3, 5, 4), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)]); me.update()
o = bpy.data.objects.new('ped', me); sc.collection.objects.link(o); o.data.materials.append(ST)
# 破風のふち：ひとまわり大きい三角を手前に置き、中を少しへこませて縁取りに見せる
def prism(name, x, z0, h, y0, y1, m):
    vs = [(-x, y0, z0), (x, y0, z0), (0, y0, z0 + h), (-x, y1, z0), (x, y1, z0), (0, y1, z0 + h)]
    me = bpy.data.meshes.new(name); me.from_pydata(vs, [], [(0, 1, 2), (3, 5, 4), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)]); me.update()
    o = bpy.data.objects.new(name, me); sc.collection.objects.link(o); o.data.materials.append(m); return o
prism('pedrim', W2 + .5, Z2 - .02, 1.62, -1.38, -1.2, ST)
prism('pedin', W2 - .05, Z2 + .1, 1.2, -1.42, -1.38, WALL)
# 破風の真ん中のばら窓（円いステンドグラス・放射の桟・ふちの輪）
cyl((0, -1.45, Z2 + 0.6), 0.46, 0.04, stained('rose', 1.6 * lit, 9.0), 48, rot=(math.pi / 2, 0, 0))
for k in range(12):
    sp_ = box((0, -1.48, Z2 + 0.6), (0.9, 0.03, 0.025), ST); sp_.rotation_euler = (0, k / 12 * math.pi, 0)
bpy.ops.mesh.primitive_torus_add(major_radius=0.48, minor_radius=0.05, location=(0, -1.47, Z2 + 0.6), rotation=(math.pi / 2, 0, 0))
bpy.context.object.data.materials.append(GILD)
cyl((0, -1.5, Z2 + 0.6), 0.09, 0.05, GILD, 24, rot=(math.pi / 2, 0, 0))
random.seed(11)
for sgn in (-1, 1):
    for k in range(6):
        x = sgn * (0.75 + k * 0.52); hh = (1.2 * (1 - abs(x) / (W2 - .05))) * 0.7
        ball((x, -1.45, Z2 + hh / 2 + 0.12), (0.13, 0.06, hh / 2), ST)
        ball((x, -1.45, Z2 + hh + 0.15), (0.08, 0.06, 0.08), ST)
random.seed(7)
# 破風の上の飾り（頂と両端）
for x, z in [(0, Z2 + 1.55), (-W2 - .2, Z2 + .15), (W2 + .2, Z2 + .15)]:
    box((x, -1.1, z), (0.35, 0.35, 0.25), ST); ball((x, -1.1, z + 0.32), (0.16, 0.16, 0.22), GILD)
# 奥の円い屋根（胴・付け柱・屋根・頂の明かり塔）
cyl((0, 4.0, Z1 + 0.9), 3.0, 1.8, WALL, 48)
for k in range(24):
    an = k / 24 * math.tau
    box((math.cos(an) * 3.02, 4.0 + math.sin(an) * 3.02, Z1 + 0.9), (0.14, 0.14, 1.8), ST)
    if k % 2 == 0 and math.sin(an) < 0: box((math.cos(an + .13) * 3.01, 4.0 + math.sin(an + .13) * 3.01, Z1 + 1.0), (0.3, 0.05, 0.8), GLASS)
cyl((0, 4.0, Z1 + 1.88), 3.15, 0.16, ST, 48)
bpy.ops.mesh.primitive_uv_sphere_add(radius=3.0, location=(0, 4.0, Z1 + 1.95), segments=48, ring_count=24)
o = bpy.context.object; o.scale = (1, 1, 0.82); o.data.materials.append(ROOF); bpy.ops.object.shade_smooth()
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='DESELECT'); bpy.ops.object.mode_set(mode='OBJECT')
for v in o.data.vertices:
    if v.co.z < 0: v.co.z = 0
for k in range(12):   # 屋根の筋
    an = k / 12 * math.tau
    bpy.ops.mesh.primitive_torus_add(major_radius=3.0, minor_radius=0.04, location=(0, 4.0, Z1 + 1.95), rotation=(math.pi / 2, 0, an))
    tt = bpy.context.object; tt.scale = (1, 0.82, 1); tt.data.materials.append(GILD if FEST else ST)
cyl((0, 4.0, Z1 + 4.6), 0.45, 0.7, ST, 16)
for k in range(8): box((math.cos(k / 8 * math.tau) * .46, 4.0 + math.sin(k / 8 * math.tau) * .46, Z1 + 4.6), (.12, .12, .6), WIN if LV >= 3 else ST)
bpy.ops.mesh.primitive_cone_add(radius1=0.55, depth=0.5, location=(0, 4.0, Z1 + 5.2), vertices=16)
bpy.context.object.data.materials.append(ROOF)
ball((0, 4.0, Z1 + 5.55), (0.12, 0.12, 0.12), GILD)
# 両側の翼の棟（アーチの窓・付け柱・軒・欄干と壺）
for sgn in (-1, 1):
    cx = sgn * 8.3
    box((cx, 2.2, TOP + 2.3), (8.0, 3.6, 4.6), WALL)
    for k in range(5):
        x = cx + (k - 2) * 1.5
        box((x + 0.75, 0.38, TOP + 2.3), (0.3, 0.12, 4.4), ST)   # 付け柱
        box((x, 0.39, TOP + 1.6), (0.7, 0.05, 1.6), WIN)          # 1階の窓
        bpy.ops.mesh.primitive_cylinder_add(radius=0.35, depth=0.05, location=(x, 0.39, TOP + 2.4), rotation=(math.pi / 2, 0, 0), vertices=24)
        bpy.context.object.data.materials.append(GLASS)          # アーチのステンドグラス
        box((x, 0.37, TOP + 0.75), (0.95, 0.12, 0.1), ST, 0.01)
        box((x, 0.39, TOP + 3.65), (0.55, 0.05, 0.7), WIN)        # 2階の小窓
        box((x, 0.36, TOP + 3.25), (0.75, 0.12, 0.08), ST, 0.01)
    box((cx - sgn * 3.95, 0.38, TOP + 2.3), (0.3, 0.12, 4.4), ST)
    box((cx, 0.3, TOP + 4.5), (8.3, 0.3, 0.25), ST, 0.01)        # 軒
    box((cx, 0.3, TOP + 4.85), (8.2, 0.2, 0.1), ST)              # 欄干の手すり
    for k in range(40):
        cyl((cx - 4.0 + k * 0.205, 0.3, TOP + 4.7), 0.045, 0.32, ST, 8)
    for k in range(5):
        x = cx + (k - 2) * 2.0
        box((x, 0.3, TOP + 4.8), (0.25, 0.25, 0.3), ST)
        ball((x, 0.3, TOP + 5.15), (0.13, 0.13, 0.18), GILD if FEST else ST)   # 壺
# 映像のときは館に奥行きを足す（2026-10-26 重吉さんの決め）：翼の棟が奥へ折れて中庭を囲み、円い屋根の後ろに長い展示の棟、いちばん奥に回廊の棟
if os.environ.get('FILM'):
    for sgn in (-1, 1):
        ox = sgn * 10.5
        box((ox, 10.0, TOP + 2.3), (3.6, 12.0, 4.6), WALL)                 # 奥へ折れる翼
        box((ox, 10.0, TOP + 4.5), (3.9, 12.3, 0.25), ST, 0.01)            # 軒
        box((ox, 10.0, TOP + 4.85), (3.8, 12.2, 0.1), ST)                 # 欄干の手すり
        fx = ox + sgn * 1.81
        for k in range(7):
            y = 5.2 + k * 1.6
            box((fx, y + 0.8, TOP + 2.3), (0.12, 0.3, 4.4), ST)              # 付け柱
            box((fx, y, TOP + 1.6), (0.05, 0.7, 1.6), WIN)                    # 1階の窓
            bpy.ops.mesh.primitive_cylinder_add(radius=0.35, depth=0.05, location=(fx, y, TOP + 2.4), rotation=(0, math.pi / 2, 0), vertices=24)
            bpy.context.object.data.materials.append(GLASS)
            box((fx, y, TOP + 3.65), (0.05, 0.55, 0.7), WIN)                  # 2階の小窓
            box((fx, y, TOP + 4.8), (0.25, 0.25, 0.3), ST); ball((fx, y, TOP + 5.15), (0.13, 0.13, 0.18), GILD if FEST else ST)
    # 円い屋根の後ろの長い展示の棟（高窓の列と、切妻の屋根）
    box((0, 11.0, TOP + 2.9), (6.0, 9.0, 5.8), WALL)
    for k in range(5):
        for sgn in (-1, 1):
            box((sgn * 3.01, 7.6 + k * 1.7, TOP + 4.6), (0.05, 0.8, 1.2), WIN)
    bpy.ops.mesh.primitive_cylinder_add(radius=3.4, depth=9.2, location=(0, 11.0, TOP + 5.8), rotation=(math.pi / 2, 0, 0), vertices=3)
    o = bpy.context.object; o.scale = (1, 0.5, 1); o.rotation_euler = (math.pi / 2, 0, 0); o.data.materials.append(ROOF)
    # いちばん奥の回廊の棟（中庭を閉じる）
    box((0, 17.0, TOP + 2.0), (24.6, 3.0, 4.0), WALL)
    box((0, 17.0, TOP + 4.1), (24.9, 3.3, 0.25), ST, 0.01)
    for k in range(16):
        box((-11.25 + k * 1.5, 15.48, TOP + 1.5), (0.6, 0.05, 1.5), WIN)
    # 中庭の噴水
    cyl((0, 5.2 + 3.0, 0.3), 1.6, 0.6, ST, 32); cyl((0, 8.2, 0.62), 1.4, 0.06, mat('water', (0.2, 0.3, 0.4), 0.05, emit=(1.0, 0.8, 0.5), es=0.3), 32)
# 大階段の両脇の台座と像（座る獅子のかわりに、外套をまとった立ち姿）
for sgn in (-1, 1):
    x = sgn * (W2 + 1.6)
    box((x, -4.3, 0.55), (1.1, 1.4, 1.1), ST, 0.02); box((x, -4.3, 1.15), (1.25, 1.55, 0.1), ST, 0.01)
    ball((x, -4.3, 1.75), (0.32, 0.26, 0.6), GILD if FEST else ST)
    ball((x, -4.3, 2.48), (0.16, 0.16, 0.19), GILD if FEST else ST)
    cyl((x + sgn * -0.25, -4.3, 2.3), 0.04, 1.0, GILD if FEST else ST, 8, rot=(0, sgn * 0.3, 0))
# 柱の間の展覧会の垂れ幕（段階が進むと増え、5段階目は4枚）
nb = [0, 0, 0, 2, 4][LV - 1]
BAN = [mat('ban1', (0.55, 0.06, 0.08) if DAWN else (0.75, 0.55, 0.62), 0.6), mat('ban2', (0.08, 0.12, 0.35) if DAWN else (0.55, 0.62, 0.78), 0.6)]
xs = [-W2 + 0.55 + i * (2 * W2 - 1.1) / 5 for i in range(6)]
for j, k in enumerate([1, 3, 0, 4][:nb]):
    x = (xs[k] + xs[k + 1]) / 2
    box((x, -0.95, Z1 - 1.1), (0.75, 0.03, 2.0), BAN[j % 2])
    box((x, -0.97, Z1 - 0.08), (0.85, 0.05, 0.06), GILD)
    box((x, -0.98, Z1 - 1.6), (0.5, 0.01, 0.3), GILD)

# ---- 庭：芝・扉へ続く石の道・両脇の低い生け垣 ----
G = grass('grass')
bpy.ops.mesh.primitive_plane_add(size=900, location=(0, 0, 0)); bpy.context.object.data.materials.append(G)
PATH = stone('path', (0.36, 0.34, 0.32), (0.22, 0.21, 0.2))
box((0, -11, 0.01), (1.8, 13, 0.02), PATH)
# 道の両脇の街灯（灯りは段階で明るくなる）
LAMP = mat('lamp', (0.04, 0.04, 0.045), 0.4, 0.8)
GLOBE = mat('globe', (1, 1, 1), 0.3, emit=(1.0, 0.78, 0.45), es=[0.4, 1.0, 2.0, 3.0, 4.5][LV - 1])
for x in (-2.2, 2.2):
    for y in (-9.5, -14.5):
        cyl((x, y, 1.0), 0.05, 2.0, LAMP, 8); cyl((x, y, 0.06), 0.14, 0.12, LAMP, 12)
        ball((x, y, 2.15), (0.17, 0.17, 0.2), GLOBE)
HEDGE = mat('hedge', (0.03, 0.06, 0.03), 0.9)
TREE = mat('tree', (0.025, 0.05, 0.028), 0.95)
# 5段階目の木：夜明けは金色の葉、静かな朝は満開の花の木
NEAR = mat('near', (0.55, 0.36, 0.08), 0.7, emit=(1.0, 0.6, 0.2), es=0.15) if gold else (mat('near', (0.85, 0.55, 0.65), 0.7) if FEST else TREE)
TRUNK = mat('trunk', (0.04, 0.03, 0.025), 0.95)
tex = bpy.data.textures.new('leaf', 'CLOUDS'); tex.noise_scale = 0.35; tex.noise_depth = 3


def bush(loc, scale, m, amt=0.25):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4, radius=1, location=loc)
    o = bpy.context.object; o.scale = scale; bpy.ops.object.transform_apply(scale=True)
    d = o.modifiers.new('d', 'DISPLACE'); d.texture = tex; d.strength = amt * min(scale); d.mid_level = 0.5
    o.data.materials.append(m); bpy.ops.object.shade_smooth(); return o


# 館の両脇に刈りこんだ細い木（糸杉）、道の両脇に低い生け垣
for x in (-1, 1):
    for j, (dx, y, hh) in enumerate([(13.2, -1.2, 1.6), (14.2, -0.2, 1.4)]):
        bush((x * dx, y, hh), (0.42, 0.42, hh), HEDGE, 0.12)
# 地平の遠い森（低い木の列）
random.seed(3)
for i in range(70):
    x = -120 + i * 3.6 + random.uniform(-1, 1); y = 70 + random.uniform(-6, 6); sz = random.uniform(1.6, 3.2)
    bush((x, y, sz * .6), (sz * 1.3, sz, sz), TREE, 0.3)
random.seed(7)
# 遠くの木々（館の右の奥。左は太陽が昇る側なので空けておく）
for x, y, sz in [(-3.2, -9, .45), (3.4, -10, .5), (-5.5, -13, .55), (6, -12.5, .5), (-8.5, -7, .6), (8.8, -6, .6)]:
    bush((x, y, sz * .8), (sz * 1.4, sz * 1.2, sz), HEDGE, 0.3)
for x, y, s in [(17.5, 6, 2.8), (20.5, 9, 3.3), (-19, 9, 2.6)]:
    bush((x, y, s * 1.35), (s, s, s * 1.05), NEAR, 0.35)
    cyl((x, y, s * .3), 0.18, s * .6, TRUNK, 8)

# ---- 静かな朝：花・枝と小鳥 ----
FLOWERS = {}


def flower(x, y, h, col, r=0.07):
    # 色ごとに1本だけ組み（茎・花びら5枚・芯）、あとは同じ形を大きさを変えて置く（数百本でも速い）
    if col[0] not in FLOWERS:
        STEM = bpy.data.materials.get('stem') or mat('stem', (0.06, 0.13, 0.05), 0.8)
        parts = [cyl((0, 0, 0.5), 0.012, 1.0, STEM, 6)]
        pm = mat('pet' + col[0], col[1], 0.5)
        for p in range(5):
            an = p / 5 * math.tau + 0.3
            parts.append(ball((math.cos(an) * .8 * .1, math.sin(an) * .35 * .1, 1 + math.sin(an) * .5 * .1), (.07, .05, .05), pm))
        parts.append(ball((0, -.02, 1), (.04, .03, .04), bpy.data.materials.get('fcen') or mat('fcen', (0.9, 0.72, 0.3), 0.6)))
        bpy.ops.object.select_all(action='DESELECT')
        for o in parts: o.select_set(True)
        bpy.context.view_layer.objects.active = parts[0]; bpy.ops.object.join()
        t = bpy.context.object; t.data.transform(Matrix.Translation((0, 0, 0.5)))   # 根もとを原点に
        FLOWERS[col[0]] = t; t.location = (0, 0, -50)
    o = FLOWERS[col[0]].copy(); sc.collection.objects.link(o)
    # 形は「高さ1・花の半径0.1」。花の大きさ r と高さ h に合わせて縦横を変える
    o.location = (x, y, 0); o.scale = (r / .1, r / .1, h); o.rotation_euler = (0, 0, random.random() * math.tau)
    return o


COLS = [('w', (0.9, 0.9, 0.92)), ('p', (0.9, 0.35, 0.5)), ('y', (0.95, 0.72, 0.2)), ('v', (0.5, 0.35, 0.85)), ('r', (0.85, 0.15, 0.18))]
if not DAWN and LV >= 2:
    flower(0.95, -13.5, 0.7, COLS[0], 0.2)          # 花一輪（道の脇、手前）
if not DAWN and LV >= 3:
    for i in range(5):
        flower(-1.2 - random.random() * 2, -10 - random.random() * 4, .45 + random.random() * .2, COLS[i % 2], .14)
if not DAWN and LV >= 5:                              # 庭いっぱいの花
    for i in range(700):
        x = random.uniform(-14, 14); y = random.uniform(-15, -2.8)
        if abs(x) < 1.1 or (y > -5.2 and abs(x) < 7): continue
        flower(x, y, .3 + random.random() * .4, COLS[random.randrange(5)], .13 + random.random() * .09)
if not DAWN and LV >= 4:                              # 枝にとまる小鳥2羽（右手前の木から伸びる枝）
    BR = mat('branch', (0.06, 0.045, 0.03), 0.9)
    cyl((6.2, -19.0, 5.0), 0.04, 4.0, BR, 8, rot=(0, math.radians(80), math.radians(-6)))
    BD = mat('bird', (0.10, 0.085, 0.075), 0.7)
    BB = mat('belly', (0.55, 0.42, 0.30), 0.7)
    for k, (bx, fl) in enumerate([(4.9, 1), (5.7, -1)]):
        bz = 5.0 + (bx - 6.2) * -0.17 + 0.18
        ball((bx, -19.0, bz), (0.2, 0.15, 0.15), BD)
        ball((bx + 0.05 * fl, -19.09, bz - 0.03), (0.12, 0.09, 0.1), BB)
        ball((bx + 0.17 * fl, -19.0, bz + 0.13), (0.1, 0.1, 0.1), BD)
        bpy.ops.mesh.primitive_cone_add(radius1=0.03, depth=0.1, location=(bx + 0.29 * fl, -19.0, bz + 0.14), rotation=(0, math.radians(90 * fl), 0))
        bpy.context.object.data.materials.append(mat('beak%d' % k, (0.8, 0.55, 0.2), 0.6))
        bpy.ops.mesh.primitive_cone_add(radius1=0.09, depth=0.27, location=(bx - 0.26 * fl, -19.0, bz - 0.03), rotation=(0, math.radians(-100 * fl), 0))
        bpy.context.object.data.materials.append(BD)

# ---- もや（静かな朝はどの段階も。段階が進むと薄くなり、庭が見えてくる）・夜明けの1〜2段階目の淡いもや ----
def fog(dens, col, top=2.6):
    # 地面に近いほど濃い霧（箱の中の体積。上へ行くほど薄く消える）
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, top / 2))
    o = bpy.context.object; o.scale = (90, 90, top)
    m = bpy.data.materials.new('fog'); m.use_nodes = True; nt = m.node_tree
    nt.nodes.remove(nt.nodes['Principled BSDF'])
    v = nt.nodes.new('ShaderNodeVolumePrincipled'); v.inputs['Color'].default_value = (*col, 1)
    co = nt.nodes.new('ShaderNodeTexCoord'); sp = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(co.outputs['Generated'], sp.inputs[0])
    r = nt.nodes.new('ShaderNodeMapRange'); r.inputs['From Min'].default_value = 0; r.inputs['From Max'].default_value = 1
    r.inputs['To Min'].default_value = dens; r.inputs['To Max'].default_value = 0
    nt.links.new(sp.outputs['Z'], r.inputs['Value'])
    pw = nt.nodes.new('ShaderNodeMath'); pw.operation = 'POWER'; pw.inputs[1].default_value = 1.0
    nt.links.new(r.outputs['Result'], v.inputs['Density'])
    nt.links.new(v.outputs[0], nt.nodes['Material Output'].inputs['Volume'])
    o.data.materials.append(m); o.visible_shadow = False
    return o
if not DAWN:
    fog([0.09, 0.07, 0.05, 0.035, 0.015][LV - 1], (0.80, 0.86, 0.92))
elif LV <= 2:
    fog([0.05, 0.03][LV - 1], (1.0, 0.85, 0.75), 2.0)

SUN_EL = [0.4, 1.6, 2.8, 4.2, 6.0][LV - 1] if DAWN else 12
SUN_AZ = -20.0                                    # 館の左奥から昇る（画面の左上）。光の筋はページの canvas が太陽の位置から描く

# ---- 空と光 ----
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
nt = w.node_tree; bg = nt.nodes['Background']
if DAWN:
    sk = nt.nodes.new('ShaderNodeTexSky')
    sk.sky_type = 'NISHITA' if 'NISHITA' in [e.identifier for e in sk.bl_rna.properties['sky_type'].enum_items] else sk.sky_type
    sk.sun_elevation = math.radians(SUN_EL); sk.sun_rotation = math.radians(SUN_AZ)
    sk.sun_disc = True; sk.sun_size = math.radians(1.2)
    try: sk.air_density = 1.6; sk.dust_density = 2.5 + (5 - LV) * 0.5
    except Exception: pass
    tint = nt.nodes.new('ShaderNodeMix'); tint.data_type = 'RGBA'; tint.blend_type = 'MULTIPLY'
    tint.inputs['Factor'].default_value = [0.2, 0.3, 0.4, 0.5, 0.75][LV - 1]; tint.inputs['B'].default_value = (1.0, 0.62, 0.28, 1)
    nt.links.new(sk.outputs['Color'], tint.inputs['A']); nt.links.new(tint.outputs['Result'], bg.inputs['Color'])
    bg.inputs['Strength'].default_value = [0.05, 0.07, 0.09, 0.11, 0.13][LV - 1]
else:
    tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Generated'], sep.inputs[0])
    r = nt.nodes.new('ShaderNodeValToRGB')
    r.color_ramp.elements[0].position = 0.5; r.color_ramp.elements[0].color = (0.30, 0.36, 0.44, 1)
    r.color_ramp.elements[1].position = 0.75; r.color_ramp.elements[1].color = (0.06, 0.09, 0.16, 1)
    e = r.color_ramp.elements.new(0.56); e.color = (0.55 + .04 * LV, 0.58 + .03 * LV, 0.62, 1) if LV < 5 else (0.95, 0.80, 0.78, 1)
    if LV >= 5: r.color_ramp.elements[0].color = (0.62, 0.58, 0.66, 1)
    nt.links.new(sep.outputs['Z'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], bg.inputs['Color'])
    bg.inputs['Strength'].default_value = 0.6 + 0.08 * LV

sun = bpy.data.lights.new('sun', 'SUN')
so = bpy.data.objects.new('sun', sun); sc.collection.objects.link(so)
if DAWN:
    # 太陽は館の後ろ。正面は逆光なので、手前から弱い色の光を足す
    so.rotation_euler = (math.radians(90 - SUN_EL), 0, math.radians(180 - SUN_AZ))
    sun.energy = [0.6, 1.2, 2.0, 3.0, 4.0][LV - 1]; sun.color = (1.0, 0.62, 0.35); sun.angle = math.radians(2)
    fl = bpy.data.lights.new('fill', 'SUN'); fo = bpy.data.objects.new('fill', fl); sc.collection.objects.link(fo)
    fo.rotation_euler = (math.radians(70), 0, math.radians(-25))
    fl.energy = [0.25, 0.4, 0.6, 0.9, 2.6][LV - 1]; fl.color = (1.0, 0.75, 0.5) if gold else (0.8, 0.7, 0.75)
else:
    # 静かな朝：薄曇りのやわらかい光（左上の手前から）
    so.rotation_euler = (math.radians(55), 0, math.radians(-35))
    sun.energy = 0.5 + 0.18 * LV; sun.color = (0.85, 0.9, 1.0); sun.angle = math.radians(25)

# ---- カメラ：庭の道の上から館の正面を見上げる（横長の帯） ----
cam = bpy.data.cameras.new('cam'); cam.lens = 30; cam.sensor_width = 36
co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
co.location = (0, -30, 3.2)
d = Vector((0, 0, 4.0)) - co.location
co.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()

sc.render.resolution_x = PX; sc.render.resolution_y = round(PX * 400 / 1120)
sc.render.engine = 'CYCLES'; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True
sc.cycles.max_bounces = 6; sc.cycles.transparent_max_bounces = 32
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'
sc.render.image_settings.file_format = 'PNG'
FILM = os.environ.get('FILM'); NF = 480
def glow_post(path):
    # 灯りのにじみ（明るい所をぼかして足す）。5段階目は強く、華やかに
    from PIL import Image, ImageFilter, ImageChops
    im = Image.open(path).convert('RGB')
    hi = im.point(lambda v: max(0, v - 200) * 4)
    glow = hi.filter(ImageFilter.GaussianBlur(PX / 90))
    k = [0.3, 0.35, 0.4, 0.5, 0.7][LV - 1]
    ImageChops.add(im, glow.point(lambda v: int(v * k))).save(path)
def orbit(t):
    # 0〜1 で1周（20秒。2026-10-26 に半分の速さに）：左の高い所から入り、左の横・正面の低い所・右の横・右奥の高い所をめぐって元へ戻る。
    # 途中でズームの寄り（破風と館の名）と引き（館ぜんたい）を1回ずつ入れる（重吉さんの決め）
    a = 2 * math.pi * t
    az = math.radians(-62 * math.cos(a) + 12 * math.sin(2 * a))
    h = 6.8 + 3.2 * math.cos(2 * a) + 1.4 * math.sin(a)
    r = 33 + 5.0 * math.cos(a) ** 2
    C = Vector((0, 5.0, 0))
    co.location = C + Vector((r * math.sin(az), -r * math.cos(az), h))
    # ズーム：寄り1回（正面の上から破風と館の名へ。レンズ 30 → 56）・引き1回（正面の低い所から館ぜんたいへ → 22）。重吉さんの決め
    z = math.sin(a)
    cam.lens = 30 + (26 * z if z > 0 else 8 * z)
    look = Vector((0, 5.0, 3.8)).lerp(Vector((0, 0.0, TOP + 5.2)), max(0.0, z) ** 1.5)
    co.rotation_euler = (look - co.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.view_layer.update()   # これが無いと、画面の位置を前のコマのカメラで計算してしまう
# 館のまわりを舞う精霊の道（7体。ページがその夜の7体をここに描く）。1周の間に整数回まわるので、ループの継ぎ目で途切れない
SPIRITS = [(11, 9, 4.0, 1, 0.0), (13, 11, 6.5, -1, 0.9), (9.5, 8, 7.5, 1, 2.1), (15, 12, 3.2, -1, 3.0), (12, 10, 9.0, 1, 4.2), (10.5, 13, 5.0, 2, 5.0), (14, 9.5, 8.0, -2, 1.6)]
def spirit_pos(j, t):
    rx, ry, z, k, ph = SPIRITS[j]
    a = 2 * math.pi * k * t + ph
    return Vector((rx * math.cos(a), 5.0 + ry * math.sin(a), z + 0.8 * math.sin(4 * math.pi * t + j)))
def spirits():
    dg = bpy.context.evaluated_depsgraph_get(); out = []
    for j in range(len(SPIRITS)):
        p = spirit_pos(j, CUR_T); q = world_to_camera_view(sc, co, p)
        d = (p - co.location).length
        hit, loc, *_ = sc.ray_cast(dg, co.location, (p - co.location).normalized(), distance=d - 0.3)
        size = 0.9 * cam.lens / (d * cam.sensor_width)                     # 1体の大きさ（絵の幅の割合）
        out.append([round(q.x, 4), round(1 - q.y, 4), round(size, 4), 0 if hit or q.z < 0 else 1])
    return out
from bpy_extras.object_utils import world_to_camera_view
def marks():
    # 太陽・扉の上の画面上の位置（割合）。動画ではコマごとに変わるので、ページはコマの番号で読む
    az, el = math.radians(SUN_AZ), math.radians(SUN_EL)
    p = world_to_camera_view(sc, co, co.location + Vector((math.sin(az) * math.cos(el), math.cos(az) * math.cos(el), math.sin(el))) * 1000)
    q = world_to_camera_view(sc, co, Vector((0, 0.69, TOP + 2.0)))
    return [round(p.x, 4), round(1 - p.y, 4), round(q.x, 4), round(1 - q.y, 4)]
if FILM:
    os.makedirs(FILM, exist_ok=True)
    import json
    M, S = [], []
    for i in range(NF):
        CUR_T = i / NF; orbit(CUR_T); M.append(marks()); S.append(spirits())
    json.dump({'fps': 24, 'n': NF, 'm': M, 's': S}, open(os.path.join(FILM, 'film.json'), 'w'))
    one = os.environ.get('CAMT')
    sh = os.environ.get('SHARD')   # 「k/N」なら i%N==k のコマだけ（いくつも並べて走らせるとき）
    kk, nn = map(int, sh.split('/')) if sh else (0, 1)
    for i in ([None] if one else [i for i in range(NF) if i % nn == kk]):
        t = float(one) if one else i / NF
        f = os.path.join(FILM, f'test-{t:.2f}.png' if one else f'{i:04d}.png')
        if os.path.exists(f): continue
        orbit(t); sc.render.filepath = f + '.tmp.png'
        bpy.ops.render.render(write_still=True)
        glow_post(f + '.tmp.png'); os.replace(f + '.tmp.png', f)
    sys.exit(0)
sc.render.filepath = OUT
bpy.ops.render.render(write_still=True)
glow_post(OUT)
# 太陽の画面上の位置（割合。canvas が光の筋・金の柱をここから描く）
from bpy_extras.object_utils import world_to_camera_view
import json
az, el = math.radians(SUN_AZ), math.radians(SUN_EL)
p = world_to_camera_view(sc, co, co.location + Vector((math.sin(az) * math.cos(el), math.cos(az) * math.cos(el), math.sin(el))) * 1000)
J = {'sun': [round(p.x, 4), round(1 - p.y, 4)]}
# 小鳥の頭の上（canvas が鳴き声の小さな光を出す所）・館の扉の上（金の柱を立てる所）
pp = lambda v: [round(q.x, 4), round(1 - q.y, 4)] if (q := world_to_camera_view(sc, co, Vector(v))) else None
J['birds'] = [pp((bx + 0.17 * fl, -19.0, 5.0 + (bx - 6.2) * -0.17 + 0.18 + 0.3)) for bx, fl in [(4.9, 1), (5.7, -1)]]
J['door'] = pp((0, 0.69, TOP + 2.0))
json.dump(J, open(OUT.rsplit('.', 1)[0] + '.json', 'w'))
