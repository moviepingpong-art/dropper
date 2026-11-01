# 10灯目：しずくが落ちて器が満ち、光が縁からあふれて杯の外を伝い、台に光がたまり、光の粒が舞い上がる。
# python3 vflow.py -- <outdir> [size] [samples] [only_frame | a:b]
import sys, os, math, random
argv = sys.argv[sys.argv.index('--') + 1:]
OUTD = argv[0]; SZ = int(argv[1]) if len(argv) > 1 else 400; SM = int(argv[2]) if len(argv) > 2 else 32
RNG = argv[3] if len(argv) > 3 else None
sys.argv = [sys.argv[0], '--', '/dev/null', '9', str(SZ), str(SM)]
FILM = True
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'vessel.py')).read())
os.makedirs(OUTD, exist_ok=True)
FPS, NF, TI = 24, 172, 16
ZS = 2.85
def emat(name, col, add=True):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = col; o = nt.nodes.new('ShaderNodeOutputMaterial')
    if add:
        tb = nt.nodes.new('ShaderNodeBsdfTransparent'); ad = nt.nodes.new('ShaderNodeAddShader')
        nt.links.new(tb.outputs[0], ad.inputs[0]); nt.links.new(e.outputs[0], ad.inputs[1]); nt.links.new(ad.outputs[0], o.inputs[0])
    else: nt.links.new(e.outputs[0], o.inputs[0])
    return m, e
# しずく（1灯の動画と同じ形・少し明るい）
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.075, segments=32, ring_count=16); drop = bpy.context.object
for v in drop.data.vertices:
    if v.co.z > 0: v.co.x *= (1 - v.co.z / 0.075 * 0.75); v.co.y *= (1 - v.co.z / 0.075 * 0.75); v.co.z *= 2.4
bpy.ops.object.shade_smooth(); dm, de = emat('dropm', (1.0, 0.86, 0.52, 1), add=False); de.inputs['Strength'].default_value = 4.0; drop.data.materials.append(dm)
bpy.ops.object.light_add(type='POINT'); DL = bpy.context.object; DL.data.color = (1, 0.8, 0.45); DL.data.shadow_soft_size = 0.05
random.seed(7); SPL = []
for i in range(7):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.024 + random.random() * 0.012, segments=12, ring_count=8); p = bpy.context.object; p.data.materials.append(dm); bpy.ops.object.shade_smooth()
    a = 2 * math.pi * i / 7 + random.random() * 0.4; SPL.append((p, math.cos(a), math.sin(a), 0.3 + random.random() * 0.2, 1.2 + random.random() * 0.5))
RM, RE = emat('ring', (1.0, 0.97, 0.88, 1))
def ring(i, c, z, s):
    old = bpy.data.objects.get(f'ring{i}')
    if old: me = old.data; bpy.data.objects.remove(old); bpy.data.meshes.remove(me)
    if c is None: return
    bpy.ops.mesh.primitive_torus_add(major_radius=c, minor_radius=0.013, major_segments=128, minor_segments=8, location=(0, 0, z))
    o = bpy.context.object; o.name = f'ring{i}'; o.scale = (1, 1, 0.5)
    m = RM.copy(); m.node_tree.nodes['Emission'].inputs['Strength'].default_value = s; o.data.materials.append(m)
# あふれて杯の外を伝う光の筋：川のように蛇行し、太さも流れる速さもまちまち（重吉さん 2026-11-01）
SM_, SE = emat('stream', (1.0, 0.72, 0.36, 1), add=False); SE.inputs['Strength'].default_value = 1.7
random.seed(21)
def path(a0, reach, seed):
    rnd = random.Random(seed); A1, A2 = rnd.uniform(0.10, 0.22), rnd.uniform(0.02, 0.05); F1, F2 = rnd.uniform(1.6, 2.8), rnd.uniform(4.5, 6.5); P1, P2 = rnd.uniform(0, 6.3), rnd.uniform(0, 6.3)
    pts = []; N = 70
    for i in range(N + 1):       # 杯の外がわ（縁から底へ）。s は 0..1
        u = i / N; z = Z1 + 0.01 - (Z1 - Z0 + 0.03) * u
        a = a0 + A1 * math.sin(F1 * u * math.pi + P1) * (0.3 + u) + A2 * math.sin(F2 * u * math.pi + P2)
        r = rb(min(Z1, z)) + 0.010 + (0.02 if i == 0 else 0); pts.append((r * math.cos(a), r * math.sin(a), z))
    if reach > 1:
        aE = a
        for i in range(1, 22):  # 脚を伝って下へ（少しよじれる）
            u = i / 21; z = Z0 - 0.02 - (Z0 - 0.02 - 0.10) * u; aa = aE + 0.5 * math.sin(u * 3.0 + P1) * u
            r = 0.072 + 0.012 * math.sin(u * math.pi); r = r if z > 0.18 else 0.072 + (0.18 - z) * 1.6
            pts.append((r * math.cos(aa), r * math.sin(aa), z))
        for i in range(1, 16):  # 台の上を外へ、くねりながら
            u = i / 15; r = 0.2 + 0.25 * u; aa = aa + 0.06 * math.sin(u * 7 + P2)
            pts.append((r * math.cos(aa), r * math.sin(aa), 0.075 - 0.02 * u))
    return pts
STREAMS = []
spec = [  # 角度・どこまで届くか（1＝杯の底まで、2＝台まで）・太さ・流れ出す時刻・速さ
    (0.15, 2, 1.9, 0.00, 1.00), (0.95, 1, 0.8, 0.35, 0.70), (1.55, 2, 1.3, 0.15, 0.85), (2.30, 1, 0.6, 0.60, 0.60), (2.85, 2, 2.4, 0.05, 1.10),
    (3.60, 1, 1.0, 0.45, 0.75), (4.25, 2, 1.5, 0.25, 0.90), (4.90, 1, 0.7, 0.70, 0.65), (5.55, 2, 1.1, 0.30, 0.80)]
for k, (a0, reach, wd, d0, sp) in enumerate(spec):
    pts = path(a0, reach, 100 + k); rnd = random.Random(300 + k)
    # 太さの変化（ふくらんだり細くなったり）。縁を越えるところは広い
    n = len(pts); ws = []
    for i in range(n):
        u = i / (n - 1); ws.append(wd * (0.75 + 0.35 * math.sin(u * 9 + rnd.uniform(0, 6)) + 0.2 * math.sin(u * 23 + rnd.uniform(0, 6))) * (1 + 1.6 * math.exp(-u * 30)))
    L = [0.0]
    for p0, p1 in zip(pts, pts[1:]): L.append(L[-1] + math.dist(p0, p1))
    STREAMS.append((k, pts, ws, L, d0, sp))
def stream(k, pts, ws, L, frac, glow):
    old = bpy.data.objects.get(f's{k}')
    if old: cu = old.data; bpy.data.objects.remove(old); bpy.data.curves.remove(cu)
    if frac <= 0.005: return
    head = L[-1] * frac; m = max(2, sum(1 for x in L if x <= head))
    cu = bpy.data.curves.new(f's{k}', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = 0.008; cu.bevel_resolution = 4; cu.use_fill_caps = True
    sp_ = cu.splines.new('NURBS'); sp_.points.add(m - 1); sp_.use_endpoint_u = True; sp_.order_u = 3
    for i in range(m):
        d = head - L[i]; bulge = 1 + 0.9 * math.exp(-(d / 0.035) ** 2)   # 先の方は丸くふくらむ
        tip = min(1, d / 0.02 + 0.35)                                     # いちばん先は細く丸く
        sp_.points[i].co = (*pts[i], 1); sp_.points[i].radius = ws[i] * bulge * tip
    ob = bpy.data.objects.new(f's{k}', cu); sc.collection.objects.link(ob); ob.data.materials.append(SM_)
# 台にたまる光
bpy.ops.mesh.primitive_circle_add(vertices=128, radius=1, fill_type='NGON', location=(0, 0, 0.062)); POOL = bpy.context.object
PM, PE = emat('pool', (1.0, 0.6, 0.2, 1)); POOL.data.materials.append(PM)
# 舞い上がる光の粒（80）
MOTES = []; MM, ME = emat('mote', (1.0, 0.72, 0.32, 1), add=False); ME.inputs['Strength'].default_value = 2.4
for i in range(80):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1, segments=10, ring_count=6); p = bpy.context.object; p.data.materials.append(MM)
    src = random.random() < 0.6   # 6割は縁から、4割は台から
    MOTES.append((p, random.uniform(0, 2 * math.pi), (rb(Z1) if src else random.uniform(0.15, 0.45)), (Z1 if src else 0.07), 3.0 + random.uniform(0, 3.0), random.uniform(0.35, 0.7), random.uniform(0.010, 0.022), random.choice((-1, 1)) * random.uniform(0.6, 1.4)))
def ease(x): x = min(1, max(0, x)); return x * x * (3 - 2 * x)
zt0 = zlev(9); LE = LM.node_tree.nodes['Emission']
fr = range(NF)
if RNG and ':' in RNG: a, b = map(int, RNG.split(':')); fr = range(a, b)
elif RNG: fr = [int(RNG)]
for f in fr:
    t = f / FPS; ti = TI / FPS; tau = t - ti
    # 水面：9 → 10（1.0秒）→ 縁を越えて盛り上がる（2.0〜2.8秒）
    lv = 9 + ease((f - TI) / 24) + 0.55 * ease((t - 1.75) / 0.9)
    dome = 0.06 * ease((t - 1.9) / 0.8) * (1 - 0.35 * ease((t - 4.0) / 2.0))
    if tau < 0:
        z = ZS - (ZS - zt0) * (f / TI) ** 2; drop.hide_render = False; drop.location = (0, 0, z); drop.scale = (1, 1, 1 + 0.6 * (f / TI)); DL.location = (0, 0, z); DL.data.energy = 10
        wv0 = lambda r: 0.0
    else:
        drop.hide_render = True; DL.data.energy = 0; A = 0.05 * math.exp(-tau * 2.0)
        def wv0(r, tau=tau, A=A):
            c = 0.32 * tau + 0.02
            return A * math.cos(26 * (r - c)) * math.exp(-((r - c) ** 2) / 0.012) - 0.05 * math.exp(-r * r / 0.003) * math.exp(-tau * 9) + 0.03 * math.exp(-r * r / 0.002) * math.exp(-((tau - 0.18) ** 2) / 0.006)
    zs_ = zlev(min(lv, 10.5)); rt_ = max(0.002, rb(zs_) - 0.036)
    LE.inputs['Strength'].default_value = 1.0 + 0.8 * ease((t - 2.0) / 1.5) + 0.7 * ease((t - 5.6) / 0.8)
    if t < 2.05:
        wv = lambda r, w=wv0, R=rt_: w(r)
        liquid(min(lv, 10.5), wv)
    else:   # 縁まで満ちたら、表面張力でまるく盛り上がり（2.05〜3.0秒）、ふちが縁を越えて、少し沈みながらあふれ続ける
        dome = 0.15 * ease((t - 2.05) / 0.9) - 0.04 * ease((t - 3.4) / 2.0) + 0.006 * math.sin(t * 9)
        spill = ease((t - 2.5) / 0.5)
        liquid_over(dome, spill, lambda r: wv0(r) * 0.4)
    inner_light(lv, 0.6 * ease((t - 2.0) / 1.5) + 1.5 * ease((t - 5.6) / 0.8))
    wv = (lambda r, w=wv0: w(r))
    for i in range(3):
        c = 0.30 * (tau - 0.09 * i) + 0.02
        if tau < 0 or c < 0.03 or c > rt_ - 0.015 or t > 2.4: ring(i, None, 0, 0); continue
        ring(i, c, zs_ + wv(c) + 0.006, 6.0 * math.exp(-tau * 1.6) * (1 - c / rt_) ** 0.5)
    for p, cx, cy, vh, vz in SPL:
        if tau < 0 or tau > 0.6: p.hide_render = True; continue
        zz = zt0 + vz * tau - 4.9 * tau * tau; rr = vh * tau; p.hide_render = zz < zt0 - 0.01; p.location = (cx * rr, cy * rr, zz)
    for k, pts, ws, L, d0, sp in STREAMS:       # 2.8秒から流れ出す。粘りのある光なので、先は少しずつ遅くなる
        x = max(0, t - 2.8 - d0) * sp / 2.4; frac = min(1, 1 - (1 - min(1, x)) ** 1.6) if x > 0 else 0
        stream(k, pts, ws, L, frac, 0)
    pr = ease((t - 4.4) / 1.8); POOL.hide_render = pr <= 0.001; POOL.scale = (0.12 + 0.36 * pr, 0.12 + 0.36 * pr, 1); PE.inputs['Strength'].default_value = 0.9 * pr
    SE.inputs['Strength'].default_value = 1.3 + 0.7 * ease((t - 5.6) / 0.8)
    for p, a, r0, z0, t0, sp, sz, tw in MOTES:
        age = t - t0
        if age < 0 or age > 2.6: p.hide_render = True; continue
        p.hide_render = False; aa = a + tw * age; rr = r0 + 0.12 * age; zz = z0 + sp * age + 0.02 * math.sin(age * 5)
        s = sz * (1 - age / 2.6) ** 0.6; p.scale = (s, s, s); p.location = (rr * math.cos(aa), rr * math.sin(aa), zz)
    fp = os.path.join(OUTD, f'{f:04d}.png')
    if os.path.exists(fp) and os.path.getsize(fp) > 1000: continue  # 続きから
    sc.render.filepath = fp; bpy.ops.render.render(write_still=True)
