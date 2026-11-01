# 1灯ふえる：光のしずくが落ちて、ポチャンと水面が揺れ、1段上がる。
# python3 vdrop.py -- <outdir> <L0> <L1> [size] [samples] [only_frame]
import sys, os, math, random
argv = sys.argv[sys.argv.index('--') + 1:]
OUTD, L0, L1 = argv[0], float(argv[1]), float(argv[2]); SZ = int(argv[3]) if len(argv) > 3 else 360; SM = int(argv[4]) if len(argv) > 4 else 48
ONLY = int(argv[5]) if len(argv) > 5 else None
sys.argv = [sys.argv[0], '--', '/dev/null', str(L0), str(SZ), str(SM)]
FILM = True
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'vessel.py')).read())
os.makedirs(OUTD, exist_ok=True)
FPS, NF, TI = 24, 52, 16            # 52コマ（約2.2秒）。16コマ目に水面へ
ZS = 2.85                           # しずくの落ちはじめ（画面の上の外）
# しずく：涙の形（下が丸く上がとがる）
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.075, segments=32, ring_count=16); drop = bpy.context.object; drop.name = 'drop'
for v in drop.data.vertices:
    if v.co.z > 0: v.co.x *= (1 - v.co.z / 0.075 * 0.75); v.co.y *= (1 - v.co.z / 0.075 * 0.75); v.co.z *= 2.4
bpy.ops.object.shade_smooth()
dm = bpy.data.materials.new('dropm'); dm.use_nodes = True; nt = dm.node_tree; nt.nodes.clear()
e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (1.0, 0.85, 0.5, 1); e.inputs['Strength'].default_value = 3.5
o = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(e.outputs[0], o.inputs[0]); drop.data.materials.append(dm)
bpy.ops.object.light_add(type='POINT'); DL = bpy.context.object; DL.data.color = (1, 0.8, 0.45); DL.data.shadow_soft_size = 0.05
# はねる小さな粒（王冠のように）
random.seed(7); SPL = []
for i in range(7):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.024 + random.random() * 0.012, segments=12, ring_count=8); p = bpy.context.object; p.data.materials.append(dm); bpy.ops.object.shade_smooth()
    a = 2 * math.pi * i / 7 + random.random() * 0.4; SPL.append((p, math.cos(a), math.sin(a), 0.3 + random.random() * 0.2, 1.2 + random.random() * 0.5))
# 真ん中から跳ね上がる光の玉（しずくの返り）
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.045, segments=16, ring_count=10); JET = bpy.context.object; JET.data.materials.append(dm); bpy.ops.object.shade_smooth()
# 水面に広がる光の輪（3つ）
RINGS = []
for i in range(3):
    m = bpy.data.materials.new(f'ring{i}'); m.use_nodes = True; nt2 = m.node_tree; nt2.nodes.clear()
    # 輪は光を足すだけ（透明＋発光）。薄れたときに下の水面を隠して灰色・黒に見えないように
    e2 = nt2.nodes.new('ShaderNodeEmission'); e2.inputs['Color'].default_value = (1.0, 0.97, 0.88, 1); o2 = nt2.nodes.new('ShaderNodeOutputMaterial')
    tb = nt2.nodes.new('ShaderNodeBsdfTransparent'); ad = nt2.nodes.new('ShaderNodeAddShader')
    nt2.links.new(tb.outputs[0], ad.inputs[0]); nt2.links.new(e2.outputs[0], ad.inputs[1]); nt2.links.new(ad.outputs[0], o2.inputs[0])
    RINGS.append((m, e2))
def ring(i, c, z):  # 輪は毎コマ作り直す（拡大すると線が細くなるため）
    old = bpy.data.objects.get(f'ring{i}')
    if old: me = old.data; bpy.data.objects.remove(old); bpy.data.meshes.remove(me)
    if c is None: return
    bpy.ops.mesh.primitive_torus_add(major_radius=c, minor_radius=0.013, major_segments=128, minor_segments=8, location=(0, 0, z))
    o = bpy.context.object; o.name = f'ring{i}'; o.scale = (1, 1, 0.5); o.data.materials.append(RINGS[i][0])
def ease(x): x = min(1, max(0, x)); return x * x * (3 - 2 * x)
zt0 = zlev(L0)
for f in range(NF):
    if ONLY is not None and f != ONLY: continue
    t = f / FPS; ti = TI / FPS; tau = t - ti
    lv = L0 + (L1 - L0) * ease((f - TI) / 26) if f > TI else L0
    if tau < 0:   # 落ちている
        z = ZS - (ZS - zt0) * (f / TI) ** 2; drop.hide_render = False; drop.location = (0, 0, z); drop.scale = (1, 1, 1 + 0.6 * (f / TI))
        DL.location = (0, 0, z); DL.data.energy = 8; wv = lambda r: 0.0; boost = 0
    else:          # 水面に入った：真ん中がへこんで、輪が外へ広がる
        drop.hide_render = True; DL.data.energy = 0
        A = 0.05 * math.exp(-tau * 2.0)
        def wv(r, tau=tau, A=A):
            c = 0.32 * tau + 0.02
            ring = A * math.cos(26 * (r - c)) * math.exp(-((r - c) ** 2) / 0.012)
            dip = -0.05 * math.exp(-r * r / 0.003) * math.exp(-tau * 9) + 0.03 * math.exp(-r * r / 0.002) * math.exp(-((tau - 0.18) ** 2) / 0.006)
            return ring + dip
        boost = 1.2 * math.exp(-tau * 4)
    liquid(lv, wv); inner_light(lv, boost)
    zs_ = zlev(lv); rt_ = max(0.002, rb(zs_) - 0.036)
    for i, (m, e2) in enumerate(RINGS):
        c = 0.30 * (tau - 0.09 * i) + 0.02
        if tau < 0 or c < 0.03 or c > rt_ - 0.015: ring(i, None, 0); continue
        ring(i, c, zs_ + wv(c) + 0.006); e2.inputs['Strength'].default_value = 6.0 * math.exp(-tau * 1.6) * (1 - c / rt_) ** 0.5
    tj = tau - 0.08
    if 0 < tj < 0.32:
        zj = zt0 + 1.3 * tj - 4.9 * tj * tj; JET.hide_render = zj < zt0; JET.location = (0, 0, zj)
    else: JET.hide_render = True
    for p, cx, cy, vh, vz in SPL:   # 粒は水面から跳ねて、落ちて消える
        if tau < 0 or tau > 0.6: p.hide_render = True; continue
        zz = zt0 + vz * tau - 4.9 * tau * tau; rr = vh * tau
        p.hide_render = zz < zt0 - 0.01; p.location = (cx * rr, cy * rr, zz)
    fp = os.path.join(OUTD, f'{f:04d}.png')
    if os.path.exists(fp) and os.path.getsize(fp) > 1000: continue  # 続きから
    sc.render.filepath = fp; bpy.ops.render.render(write_still=True)
