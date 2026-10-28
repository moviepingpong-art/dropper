# 最後の部屋（5つ目）の映像：円い部屋の壁に7つの額縁。カメラが部屋に入り、額縁が1つずつ灯り、
# 光の粒が真ん中のともしびに集まって、天窓から光の柱が降りる（40秒・縦9:16・24コマ）。オープニングの作りを最後の部屋に置きかえた。
#   python3 lastroom.py -- <出力フォルダ/> [幅px] [サンプル数] [最初のコマ] [最後のコマ]
#   python3 lastroom.py -- <出力フォルダ/> 540 0        … 書き出さずに、窓の四隅（コマごと）の JSON だけを書く
# 額縁の窓は「抜き」（holdout）で透明にしてある。その夜の作品はページが窓の四隅（last.json）に合わせて下に描く。
# 光の柱の色（守り神の人生地図の色）もページが重ねる。絵の中は白い光のまま
import bpy, bmesh, math, sys, os, json, random
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
a = sys.argv[sys.argv.index('--') + 1:]
OUTD = a[0]; PX = int(a[1]) if len(a) > 1 else 540; SAMPLES = int(a[2]) if len(a) > 2 else 24
N = 960                        # 40秒（2026-10-27 に20秒から2倍に。額縁をゆっくり見られるように・重吉さんの決め）
# 20秒のときのコマ → 40秒のコマ。入口 0〜70→0〜120・額縁 70〜280→120〜645（30コマごと→75コマごと）・光の粒 280〜380→645〜795・天窓 380〜480→795〜960
def T(f):
    for a0, a1, b0, b1 in ((0, 70, 0, 120), (70, 280, 120, 645), (280, 380, 645, 795), (380, 480, 795, 960)):
        if f <= a1: return round(b0 + (f - a0) * (b1 - b0) / (a1 - a0))
    return N
F0 = int(a[3]) if len(a) > 3 else 1; F1 = int(a[4]) if len(a) > 4 else N
os.makedirs(OUTD, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
import frame as F
_r = open(os.path.join(HERE, 'room.py'), encoding='utf-8').read()  # 部屋の材料と箱の作り方は room.py と同じ（関数だけ借りる）
exec(_r[_r.index('def stone_mat'):_r.index('def half_torus')])
sc = bpy.context.scene
sc.render.fps = 24; sc.frame_start = 1; sc.frame_end = N
random.seed(7)

RR, WALL = 4.2, 4.4          # 部屋の半径・壁の高さ（その上に円い屋根）
BAYS = 8                      # 0＝入口（光の扉）、1〜7＝額縁
S = 1.35                      # 額縁の大きさ（窓 0.88×1.35m）
FZ = 2.05                     # 額縁の真ん中の高さ


def key(sock, pairs):
    for f, v in pairs: sock.default_value = v; sock.keyframe_insert('default_value', frame=f)


def keyp(obj, path, pairs):
    for f, v in pairs: setattr(obj, path, v); obj.keyframe_insert(path, frame=f)


# ---- 部屋：石の壁・柱・円い屋根と天窓・床 ----
def uv_stone(m, sx, sy):  # 円い壁と屋根は、石の目を UV（まわりの長さ×高さ、m）に沿わせる
    nt = m.node_tree; tc = nt.nodes['Texture Coordinate']; mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (sx, sy, 1)
    nt.links.new(tc.outputs['UV'], mp.inputs['Vector'])
    for n in nt.nodes:
        if n.type in ('TEX_BRICK', 'TEX_NOISE'): nt.links.new(mp.outputs['Vector'], n.inputs['Vector'])
    return m


wallm = uv_stone(stone_mat('wall', 5.5, (0.30, 0.25, 0.19), (0.24, 0.20, 0.15), bump=0.35), 2 * math.pi * RR, WALL)
floorm = stone_mat('floor', 1.6, (0.34, 0.30, 0.25), (0.22, 0.19, 0.16), bump=0.15, row=1.0, rough=0.7)
pil = F.principled('pillar', (0.30, 0.25, 0.19), rough=0.75)
gold = F.gold_mat('gold', worn=True)
ang = lambda i: math.radians(-90 + i * 360 / BAYS)  # 0番（入口）がカメラの後ろ（-Y）
bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=RR, depth=WALL, location=(0, 0, WALL / 2))
cyl = bpy.context.object; cyl.data.materials.append(wallm); cyl['wall'] = 1  # 利用者の画像を映す壁（柱・帯・額縁は別の物なので入らない）
bm = bmesh.new(); bm.from_mesh(cyl.data)
bmesh.ops.delete(bm, geom=[f for f in bm.faces if abs(f.normal.z) > 0.9], context='FACES')
bmesh.ops.reverse_faces(bm, faces=bm.faces[:]); bm.to_mesh(cyl.data); bm.free()
if os.environ.get('WALLPIC'):  # 見本：柱と柱のあいだの壁ごとに、1枚の画像を壁いっぱいに（はみ出しは切る）
    im = bpy.data.images.load(os.environ['WALLPIC']); ia = im.size[0] / im.size[1]; pa = (2 * math.pi * RR / BAYS) / WALL
    su, sv = (pa / ia, 1) if ia > pa else (1, ia / pa)
    bm = bmesh.new(); bm.from_mesh(cyl.data); uvl = bm.loops.layers.uv.verify(); st = 2 * math.pi / BAYS
    for f in bm.faces:
        c = f.calc_center_median(); b = math.floor(((math.atan2(c.y, c.x) - ang(0) + st / 2) % (2 * math.pi)) / st)
        for lp in f.loops:
            co_ = lp.vert.co; u = (((math.atan2(co_.y, co_.x) - ang(b) + math.pi) % (2 * math.pi)) - math.pi) / st + .5
            lp[uvl].uv = ((u - .5) * su + .5, (co_.z + WALL / 2) / WALL * sv + (1 - sv) / 2)
    bm.to_mesh(cyl.data); bm.free()
    wm = F.principled('wallpic', (1, 1, 1), rough=0.8); nt = wm.node_tree; tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = im
    nt.links.new(tx.outputs['Color'], nt.nodes['Principled BSDF'].inputs['Base Color']); cyl.data.materials[0] = wm
# 入口：壁に光の扉（アーチの形の明るい面）
door = emit_mat('door', (1.0, 0.93, 0.8), 0.0)
key(door.node_tree.nodes['Emission'].inputs['Strength'], [(1, 30.0), (T(40), 30.0), (T(90), 6.0)])
x, y = RR * math.cos(ang(0)), RR * math.sin(ang(0))
box((x * 0.995, y * 0.995, 1.25), (1.5, 0.05, 2.5), door)
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.75, depth=0.05, location=(x * 0.995, y * 0.995, 2.5), rotation=(math.radians(90), 0, 0))
bpy.context.object.data.materials.append(door)
# 床：石の円い敷きと、真ん中に金の象眼の輪
plane((0, 0, 0), (RR * 2.2, RR * 2.2), (0, 0, 0), floorm)
for r in (1.2, 2.6):
    bpy.ops.mesh.primitive_torus_add(major_radius=r, minor_radius=0.03, major_segments=96, minor_segments=6, location=(0, 0, 0.0))
    bpy.context.object.scale = (1, 1, 0.15); bpy.context.object.data.materials.append(gold)
# 屋根：半球。てっぺんに天窓（月の光が入る）
bpy.ops.mesh.primitive_uv_sphere_add(radius=RR, segments=96, ring_count=48, location=(0, 0, WALL))
dome = bpy.context.object
bm = bmesh.new(); bm.from_mesh(dome.data)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -0.01 or v.co.z > RR * 0.94], context='VERTS')
bmesh.ops.reverse_faces(bm, faces=bm.faces[:]); bm.to_mesh(dome.data); bm.free()
dome.data.materials.append(uv_stone(stone_mat('dome', 5.5, (0.05, 0.07, 0.16), (0.04, 0.055, 0.13), bump=0.2), 2 * math.pi * RR, math.pi * RR)); bpy.ops.object.shade_smooth()
for k in range(BAYS):  # 屋根の金の肋（あばら）
    bpy.ops.mesh.primitive_torus_add(major_radius=RR - 0.04, minor_radius=0.035, major_segments=96, minor_segments=6, location=(0, 0, WALL), rotation=(math.radians(90), 0, ang(k) + math.pi / BAYS + math.pi / 2))
    t = bpy.context.object; bm = bmesh.new(); bm.from_mesh(t.data)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, 0), plane_no=(0, 1, 0), clear_inner=True)
    bm.to_mesh(t.data); bm.free(); t.data.materials.append(gold)
# 屋根の金の星（夜空のように散らす）
star = emit_mat('star', (1.0, 0.8, 0.45), 6.0)
for _ in range(140):
    th = random.uniform(0, 2 * math.pi); ph = random.uniform(0.12, 1.15)
    p_ = Vector((math.cos(th) * math.cos(ph), math.sin(th) * math.cos(ph), math.sin(ph))) * (RR - 0.03) + Vector((0, 0, WALL))
    F.sphere(p_, random.uniform(0.012, 0.03), star, seg=8)
sky = emit_mat('oculus', (0.75, 0.82, 1.0), 0.0)
key(sky.node_tree.nodes['Emission'].inputs['Strength'], [(1, 1.5), (T(300), 1.5), (T(380), 14.0), (N, 18.0)])
bpy.ops.mesh.primitive_circle_add(vertices=48, radius=RR * 0.40, fill_type='NGON', location=(0, 0, WALL + RR * 0.93))
bpy.context.object.data.materials.append(sky)
bpy.ops.mesh.primitive_torus_add(major_radius=RR * 0.345, minor_radius=0.09, major_segments=64, minor_segments=8, location=(0, 0, WALL + RR * 0.935))
bpy.context.object.data.materials.append(gold)
# 壁の上の金の帯と、柱（額縁と額縁のあいだ）
for z, h in ((WALL - 0.12, 0.08), (0.35, 0.05)):
    bpy.ops.mesh.primitive_torus_add(major_radius=RR - 0.05, minor_radius=h, major_segments=96, minor_segments=6, location=(0, 0, z))
    bpy.context.object.data.materials.append(gold)
for k in range(BAYS):
    t = ang(k) + math.pi / BAYS
    x, y = (RR - 0.16) * math.cos(t), (RR - 0.16) * math.sin(t)
    box((x, y, WALL / 2), (0.36, 0.36, WALL), pil, bevel=0.03).rotation_euler.z = t
    box((x, y, WALL - 0.3), (0.5, 0.5, 0.18), pil, bevel=0.03).rotation_euler.z = t
    box((x, y, 0.15), (0.5, 0.5, 0.3), pil, bevel=0.03).rotation_euler.z = t
    # 柱ごとに燭台（ろうそくの小さな火と、壁を照らす暖かい光）
    cx, cy = (RR - 0.42) * math.cos(t), (RR - 0.42) * math.sin(t)
    box((cx, cy, 2.75), (0.12, 0.12, 0.05), gold)
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.028, depth=0.2, location=(cx, cy, 2.87)); bpy.context.object.data.materials.append(F.principled('candle', (0.9, 0.85, 0.72), rough=0.6))
    F.sphere((cx, cy, 3.0), 0.02, emit_mat('flame', (1.0, 0.62, 0.22), 60), scale=(1, 1, 1.8), seg=12)
    bpy.ops.object.light_add(type='POINT', location=(cx, cy, 3.02)); bpy.context.object.data.energy = 18; bpy.context.object.data.color = (1.0, 0.62, 0.3); bpy.context.object.data.shadow_soft_size = 0.05

# ---- 7つの額縁（夜明けと静かな朝をかわるがわる）。窓は抜き。上から小さな灯りが順に灯る ----
hold = bpy.data.materials.new('hold'); hold.use_nodes = True; nt = hold.node_tree
nt.nodes.remove(nt.nodes['Principled BSDF']); ho = nt.nodes.new('ShaderNodeHoldout'); nt.links.new(ho.outputs[0], nt.nodes['Material Output'].inputs[0])
# 額縁の絵（frame.py の JSON。night-app.js の FR と同じ数）。小さな額縁の窓は大きな額縁の窓の幅の 26%（SMALL）
FR = {'dawn': dict(w=720, h=1149, l=141, t=336, ww=438, wh=672, top=208, s=dict(w=300, h=398, l=59, t=59, ww=182, wh=280, top=6)),
      'quiet': dict(w=720, h=968, l=128, t=128, ww=464, wh=711, top=14, s=dict(w=300, h=403, l=53, t=53, ww=193, wh=296, top=6))}
SMALL = 0.26
LIT0, GAP = 120, 75           # 1つ目の額縁が灯るコマ・次までのコマ数
wins = []
for i in range(1, BAYS):
    t = ang(i); x, y = (RR - 0.03) * math.cos(t), (RR - 0.03) * math.sin(t)
    parent, M, et, _, _ = F.build('dawn' if i % 2 else 'quiet')
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 0.002)); wp = bpy.context.object
    wp.scale = (F.WW * 1.02, F.WH * 1.02, 1); wp.data.materials.append(hold); wp.parent = parent
    # 小さな額縁（精霊が見える）の所も抜く。ページが小さな額縁の絵と精霊を下に描く（灯籠などが前に来ても隠れるように）
    P = FR[('dawn' if i % 2 else 'quiet')]; Q = P['s']; u = F.WW / P['ww']; kk = P['ww'] * SMALL / Q['ww']
    x0 = (P['w'] - Q['w'] * kk) / 2; y0 = P['top'] - Q['top'] * kk; cx, cy = P['l'] + P['ww'] / 2, P['t'] + P['wh'] / 2
    bpy.ops.mesh.primitive_plane_add(size=1, location=((x0 + Q['w'] * kk / 2 - cx) * u, -(y0 + Q['h'] * kk / 2 - cy) * u, 0.1)); sp_ = bpy.context.object
    sp_.scale = (Q['w'] * kk * u, Q['h'] * kk * u, 1); sp_.data.materials.append(hold); sp_.parent = parent
    parent.scale = (S, S, S); parent.location = (x, y, FZ)
    parent.rotation_euler = (math.radians(90), 0, t - math.radians(90))  # 窓が部屋の真ん中を向く
    f0 = LIT0 + (i - 1) * GAP
    bpy.ops.object.light_add(type='SPOT', location=((RR - 1.3) * math.cos(t), (RR - 1.3) * math.sin(t), WALL - 0.2))
    L = bpy.context.object; L.data.spot_size = math.radians(40); L.data.spot_blend = 0.7; L.data.color = (1.0, 0.85, 0.62); L.data.shadow_soft_size = 0.15
    L.rotation_euler = (Vector((x, y, FZ)) - L.location).to_track_quat('-Z', 'Y').to_euler()
    keyp(L.data, 'energy', [(1, 0.0), (f0, 0.0), (f0 + 16, 420.0), (N, 420.0)])
    sc.frame_set(1)
    wins.append({'i': i, 'kind': 'dawn' if i % 2 else 'quiet', 'f0': f0, 'obj': parent,
                 'corners': [Vector((x, y, FZ)) + Vector((-math.sin(t) * sx * F.WW * S / 2, math.cos(t) * sx * F.WW * S / 2, sz * F.WH * S / 2)) for sx, sz in [(1, 1), (-1, 1), (-1, -1), (1, -1)]]})

# ---- 真ん中のともしび：台座の上の金の灯籠。光の粒が集まるほど明るくなる ----
box((0, 0, 0.45), (0.9, 0.9, 0.9), pil, bevel=0.04)
box((0, 0, 0.94), (1.05, 1.05, 0.08), gold, bevel=0.02)
bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.26, depth=0.62, location=(0, 0, 1.34)); lan = bpy.context.object
glass = F.principled('lantern', (1.0, 0.8, 0.55), rough=0.12)  # 琥珀色のガラス。中の火が透ける
gb = glass.node_tree.nodes['Principled BSDF']; gb.inputs['Transmission Weight'].default_value = 1.0; gb.inputs['IOR'].default_value = 1.3
lan.data.materials.append(glass)
for k in range(6):  # 金の桟
    t_ = k * math.pi / 3
    box((0.26 * math.cos(t_), 0.26 * math.sin(t_), 1.34), (0.035, 0.035, 0.64), gold)
flame = emit_mat('lflame', (1.0, 0.62, 0.25), 0.0)
key(flame.node_tree.nodes['Emission'].inputs['Strength'], [(1, 25.0), (T(300), 40.0), (T(380), 160.0), (N, 260.0)])
F.sphere((0, 0, 1.3), 0.07, flame, scale=(1, 1, 1.9), seg=16)
for z in (1.04, 1.66):
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.32, depth=0.06, location=(0, 0, z)); bpy.context.object.data.materials.append(gold)
bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=0.32, depth=0.3, location=(0, 0, 1.84)); bpy.context.object.data.materials.append(gold)
bpy.ops.object.light_add(type='POINT', location=(0, 0, 1.34)); LL = bpy.context.object
LL.data.color = (1.0, 0.72, 0.4); LL.data.shadow_soft_size = 0.25
keyp(LL.data, 'energy', [(1, 15.0), (T(300), 40.0), (T(380), 900.0), (N, 1400.0)])
# 光の粒：額縁から灯籠へ流れる（7本×10粒）。そのあと天窓へのぼる
mote = emit_mat('mote', (1.0, 0.8, 0.45), 30.0)
for w in wins:
    c = sum(w['corners'], Vector()) / 4
    for j in range(10):
        s0 = 290 + j * 4 + random.randint(0, 8); s1 = T(s0 + 55); s0 = T(s0)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.025, segments=10, ring_count=6, location=c); o = bpy.context.object; o.data.materials.append(mote)
        mid = c.lerp(Vector((0, 0, 1.4)), 0.5) + Vector((random.uniform(-.4, .4), random.uniform(-.4, .4), random.uniform(.3, 1.0)))
        keyp(o, 'scale', [(1, (0, 0, 0)), (s0 - 1, (0, 0, 0)), (s0, (1, 1, 1)), (s1, (1, 1, 1)), (s1 + 1, (0, 0, 0))])
        keyp(o, 'location', [(s0, c), ((s0 + s1) // 2, mid), (s1, Vector((0, 0, 1.4)))])
# ---- 空気：薄いもや。天窓からの光の柱がもやに映る ----
fog = bpy.data.materials.new('fog'); fog.use_nodes = True; nt = fog.node_tree; nt.nodes.remove(nt.nodes['Principled BSDF'])
vs = nt.nodes.new('ShaderNodeVolumeScatter'); vs.inputs['Density'].default_value = 0.03; nt.links.new(vs.outputs[0], nt.nodes['Material Output'].inputs['Volume'])
bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=RR - 0.3, depth=WALL + RR - 0.6, location=(0, 0, (WALL + RR) / 2 + 0.05))
bpy.context.object.data.materials.append(fog)
if os.environ.get('NOFOG'): bpy.data.objects.remove(bpy.context.object)  # もやは重い。光の柱はページが重ねるので、本番は抜く
bpy.ops.object.light_add(type='SPOT', location=(0, 0, WALL + RR * 0.93)); SP = bpy.context.object
SP.rotation_euler = (0, 0, 0); SP.data.spot_size = math.radians(30); SP.data.spot_blend = 0.4; SP.data.color = (0.85, 0.9, 1.0)
keyp(SP.data, 'energy', [(1, 200.0), (T(300), 200.0), (T(380), 4000.0), (N, 9000.0)])
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.01, 0.012, 0.02, 1); w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.05
bpy.ops.object.light_add(type='AREA', location=(0, 0, WALL + 1.5)); A = bpy.context.object; A.data.size = 4; A.data.color = (0.7, 0.78, 1.0)
keyp(A.data, 'energy', [(1, 25.0), (N, 40.0)])

# ---- カメラ：入口から入り（0〜5秒）、部屋の中をゆっくり回って額縁を1つずつ前で止まって見て（5〜27秒）、
#      真ん中の灯籠と天窓を見上げる（27〜40秒） ----
cam = bpy.data.cameras.new('cam'); cam.sensor_width = 36; cam.sensor_fit = 'VERTICAL'; cam.sensor_height = 36
co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
tgt = bpy.data.objects.new('tgt', None); sc.collection.objects.link(tgt)
c = co.constraints.new('TRACK_TO'); c.target = tgt; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'


def pol(r, t, z): return Vector((r * math.cos(t), r * math.sin(t), z))


CK = [(1, pol(RR - 0.4, ang(0), 1.6), pol(0, 0, 1.6), 22)]  # 入口の内側。灯籠の向こうの壁を見る
for i in range(1, BAYS):  # 額縁 i が灯るころ、部屋の真ん中の近くから、その額縁と両どなりを見る（ゆっくり回る）
    f0 = LIT0 + (i - 1) * GAP
    # 40秒（2026-10-27〜）：額縁の前で止まって、ゆっくり回りながら少し寄る（約2.3秒）。次の額縁へは約0.9秒で移る
    CK.append((f0 + 4, pol(0.95, ang(i) + math.radians(84), 1.6), pol(RR, ang(i), FZ - 0.05), 21))
    CK.append((f0 + GAP - 18, pol(0.95, ang(i) + math.radians(96), 1.6), pol(RR, ang(i), FZ - 0.05), 23))
CK += [(T(330), pol(2.6, ang(7) + math.radians(40), 1.3), pol(0, 0, 1.5), 20),
       (T(400), pol(2.3, ang(8) + math.radians(40), 0.9), pol(0, 0, 3.2), 18),
       (N, pol(1.6, ang(8) + math.radians(70), 0.7), pol(0, 0, WALL + RR * 0.9), 16)]
for f, p, t, lens in CK:
    co.location = p; co.keyframe_insert('location', frame=f); tgt.location = t; tgt.keyframe_insert('location', frame=f)
    cam.lens = lens; cam.keyframe_insert('lens', frame=f)
for ob in (co, tgt, cam):
    ad = ob.animation_data
    if ad and ad.action:
        for fc in getattr(ad.action, 'fcurves', []):
            for kp in fc.keyframe_points: kp.interpolation = 'BEZIER'; kp.handle_left_type = kp.handle_right_type = 'AUTO_CLAMPED'

sc.render.resolution_x = PX; sc.render.resolution_y = round(PX * 16 / 9)
sc.render.engine = 'CYCLES'; sc.cycles.samples = max(1, SAMPLES); sc.cycles.use_denoising = True; sc.cycles.max_bounces = int(os.environ.get('BOUNCES', 6))
sc.render.film_transparent = True
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'

# 壁の写し（2026-10-27〜）：画面の点（絵の割合 u, v。左上が 0）→ カメラから出る光線の向き d = D·(u, v, 1)。コマごとにカメラの位置 C（3つ）と D（3×3）。
# ページは壁の抜き（MASK）の所だけ、C + s·d と円い壁（半径 RR）の交わりから、柱と柱のあいだの壁のどこかを出して、利用者の画像を貼る
def cam_ray():
    fr = co.data.view_frame(scene=sc); M = co.matrix_world; C = M.translation
    tr, br, bl, tl = [M @ p_ - C for p_ in fr]  # view_frame は 右上・右下・左下・左上
    return [round(x, 5) for x in (*C, *(tr - tl), *(bl - tl), *tl)]


# 窓の四隅（絵の割合。左上・右上・右下・左下）・灯りの強さ（0〜1）・見えるか、と天窓の真ん中を、コマごとに書く
out = {'w': PX, 'h': sc.render.resolution_y, 'fps': 24, 'n': N, 'lit0': LIT0, 'gap': GAP, 'rr': RR, 'wall': WALL, 'bays': BAYS, 'a0': round(ang(0), 6), 'wins': [{'i': w_['i'], 'kind': w_['kind']} for w_ in wins], 'f': []}
for f in range(1, N + 1):
    sc.frame_set(f); fr = []
    for w_ in wins:
        cs = [world_to_camera_view(sc, co, p) for p in w_['corners']]
        vis = all(q.z > 0.05 for q in cs) and max(q.x for q in cs) > -0.05 and min(q.x for q in cs) < 1.05
        b = max(0.0, min(1.0, (f - w_['f0']) / 16))
        fr.append([[round(q.x, 4), round(1 - q.y, 4)] for q in cs] + [round(b, 2), 1 if vis else 0])
    oc = world_to_camera_view(sc, co, Vector((0, 0, WALL + RR * 0.94)))
    out['f'].append({'w': fr, 'oc': [round(oc.x, 4), round(1 - oc.y, 4), 1 if oc.z > 0 else 0], 'cam': cam_ray()})
json.dump(out, open(os.path.join(OUTD, 'last.json'), 'w'), separators=(',', ':'))
# 壁の抜き（MASK=1）：画像を映す壁だけ白、ほかは黒の白黒の絵。encode-film.sh wall が、透明の度合いの絵に灰色（128）として重ねる
if os.environ.get('MASK'):  # 壁の抜き：画像を映す壁だけ白、ほかは黒
    blk = emit_mat('mblack', (0, 0, 0), 1.0); wht = emit_mat('mwhite', (1, 1, 1), 1.0)
    for ob in sc.objects:
        if ob.type == 'LIGHT': ob.hide_render = True
        if ob.type != 'MESH': continue
        for sl in ob.material_slots:
            if sl.material and sl.material.name != 'hold': sl.material = wht if ob.get('wall') else blk
        if not ob.material_slots: ob.data.materials.append(wht if ob.get('wall') else blk)
    sc.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0
    sc.render.film_transparent = False; sc.cycles.samples = 4; sc.cycles.use_denoising = False; sc.cycles.max_bounces = 0
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
    sc.render.image_settings.color_mode = 'BW'
    for f in range(F0, F1 + 1):
        sc.frame_set(f); sc.render.filepath = os.path.join(OUTD, f'm{f:04d}.png'); bpy.ops.render.render(write_still=True)
    sys.exit(0)
if SAMPLES > 0:
    for f in range(F0, F1 + 1, int(os.environ.get('EVERY', 1))):  # EVERY=24 で1秒に1コマだけ（カメラの動きの試し）
        sc.frame_set(f); sc.render.filepath = os.path.join(OUTD, f'f{f:04d}.png')
        bpy.ops.render.render(write_still=True)
