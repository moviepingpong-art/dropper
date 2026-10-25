# 最後の通路を奥へ進む映像（10秒・横3:2・24コマ）。4段階目の朝に精霊を額縁に飾ったときだけ流す（2026-10-25 重吉さんの決め）。
#   SLOTS=3 python3 lastwalk.py -- <出力フォルダ/> [幅px] [サンプル数] [最初のコマ] [最後のコマ]
#   サンプル数 0 … 書き出さずに、額縁の窓の四隅（コマごと）の JSON（walk.json）だけを書く
# 通路は hall.py の empty（額縁なし）をそのまま使い、カメラだけを動かす。額縁と作品と精霊は、ページが四隅に合わせて上に描く
import sys, os, json, math
import bpy  # bpy を先に読む（mathutils は bpy のあとでないと読めない）
from mathutils import Vector
HERE = os.path.dirname(os.path.abspath(__file__))
a = sys.argv[sys.argv.index('--') + 1:]
OUTD = a[0]; PX = int(a[1]) if len(a) > 1 else 960; SAMPLES = int(a[2]) if len(a) > 2 else 16
N = 240
F0 = int(a[3]) if len(a) > 3 else 1; F1 = int(a[4]) if len(a) > 4 else N
os.makedirs(OUTD, exist_ok=True)
os.environ.setdefault('SLOTS', '3')
src = open(os.path.join(HERE, 'hall.py'), encoding='utf-8').read()
src = src[:src.index("bpy.ops.object.camera_add(location=(0, float(os.environ")]
sys.argv = ['hall.py', '--', os.path.join(OUTD, 'x.png'), str(PX), str(max(1, SAMPLES)), 'empty']
g = {'__name__': '__main__', '__file__': os.path.join(HERE, 'hall.py')}
exec(compile(src, 'hall.py', 'exec'), g)
bpy, sc, win_px, world_to_camera_view = g['bpy'], g['sc'], g['win_px'], g['world_to_camera_view']
sc.render.fps = 24; sc.frame_start = 1; sc.frame_end = N

# カメラ：入口から、奥の2枚の前で少しゆっくりになり、光の扉の手前まで（最後の通路の3か所と同じ道）
bpy.ops.object.camera_add(location=(0, -0.9, 1.5), rotation=(math.radians(88), 0, 0))
cam = bpy.context.object; sc.camera = cam; cam.data.lens = 20
for f, y in [(1, -0.9), (90, 2.9), (140, 4.2), (N, 9.6)]:
    cam.location = (0, y, 1.5); cam.keyframe_insert('location', frame=f)
ad = cam.animation_data
for fc in getattr(ad.action, 'fcurves', []) if ad and ad.action else []:
    for kp in fc.keyframe_points: kp.interpolation = 'BEZIER'; kp.handle_left_type = kp.handle_right_type = 'AUTO_CLAMPED'
# 光の扉が近づくにつれて、まぶしくなる
for m in bpy.data.materials:
    for n in (m.node_tree.nodes if m.node_tree else []):
        if n.type == 'EMISSION' and m.name.startswith('dawnlight'):
            s0 = n.inputs['Strength'].default_value
            for f, k in [(1, 1.0), (150, 1.0), (N, 3.0)]: n.inputs['Strength'].default_value = s0 * k; n.inputs['Strength'].keyframe_insert('default_value', frame=f)

sc.render.resolution_x = PX; sc.render.resolution_y = round(PX * 2 / 3)
sc.render.engine = 'CYCLES'; sc.cycles.samples = max(1, SAMPLES); sc.cycles.use_denoising = True
sc.cycles.max_bounces = int(os.environ.get('BOUNCES', 4))
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'
sc.render.image_settings.file_format = 'PNG'

# 額縁の窓の四隅・名札の真ん中・見えるか、をコマごとに。並びは hall.py の slots と同じ（手前の左・手前の右・中の左…）
out = {'w': PX, 'h': sc.render.resolution_y, 'fps': 24, 'n': N, 'slots': [{'side': s['side'], 'i': s['i']} for s in win_px], 'f': []}
for f in range(1, N + 1):
    sc.frame_set(f); fr = []
    for s in win_px:
        cs = [world_to_camera_view(sc, cam, Vector(c)) for c in s['corners_world']]
        ps = [world_to_camera_view(sc, cam, Vector(c)) for c in s['plate_world']]
        vis = min(q.z for q in cs) > 0.05 and max(q.x for q in cs) > -0.05 and min(q.x for q in cs) < 1.05
        fr.append([[round(q.x, 4), round(1 - q.y, 4)] for q in cs] + [[round(sum(q.x for q in ps) / 4, 4), round(1 - sum(q.y for q in ps) / 4, 4)], 1 if vis else 0])
    out['f'].append(fr)
json.dump(out, open(os.path.join(OUTD, 'walk.json'), 'w'), separators=(',', ':'))
if SAMPLES > 0:
    for f in range(F0, F1 + 1):
        sc.frame_set(f); sc.render.filepath = os.path.join(OUTD, f'f{f:04d}.png')
        bpy.ops.render.render(write_still=True)
