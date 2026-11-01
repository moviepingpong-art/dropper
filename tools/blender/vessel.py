# 灯火の器（2026-11-01〜、重吉さんの決め）。金の縁のガラスの杯に光の水。python3 vessel.py -- <out.png> <灯 0..10> [大きさ] [サンプル]
# 動画は vessel-drop.py（しずくで1灯）・vessel-overflow.py（10灯目にあふれる）がこのファイルを読んで使う。光のにじみは vessel-glow.py。まとめて書き出すのは vessel-encode.sh
# 灯火の器（金の縁のガラスの杯）。python3 vessel.py -- <out.png> <level 0..10> [size] [samples]
import bpy, bmesh, math, sys
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else 'v.png'; LV = float(argv[1]) if len(argv) > 1 else 5; SZ = int(argv[2]) if len(argv) > 2 else 480; SM = int(argv[3]) if len(argv) > 3 else 96
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
Z0, Z1 = 0.80, 1.60  # 杯の底と縁
def rb(z):  # 杯の外がわの半径
    t = min(1, max(0, (z - Z0 + 0.04) / (Z1 - Z0 + 0.04)))
    return 0.07 + 0.55 * (1 - (1 - t) ** 2.2) ** 0.85
def lathe(name, prof, seg=96, cap_top=False, cap_bot=False):
    bm = bmesh.new(); rings = []
    for r, z in prof:
        ring = [bm.verts.new((r * math.cos(2 * math.pi * i / seg), r * math.sin(2 * math.pi * i / seg), z)) for i in range(seg)]
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        for i in range(seg): bm.faces.new((a[i], a[(i + 1) % seg], b[(i + 1) % seg], b[i]))
    if cap_top: bm.faces.new(list(reversed(rings[-1])))
    if cap_bot: bm.faces.new(rings[0])
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob); return ob
def mat(name, **k):
    m = bpy.data.materials.new(name); m.use_nodes = True; n = m.node_tree.nodes; b = n['Principled BSDF']
    for kk, v in k.items(): b.inputs[kk].default_value = v
    return m
glass = mat('glass', **{'Base Color': (0.97, 0.95, 0.9, 1), 'Roughness': 0.03, 'Transmission Weight': 1.0, 'IOR': 1.45})
gold = mat('gold', **{'Base Color': (1.0, 0.72, 0.32, 1), 'Metallic': 1.0, 'Roughness': 0.22})
# ガラスの杯（外と内を1枚の殻に）
N = 40; zs = [Z0 - 0.04 + (Z1 - Z0 + 0.04) * i / N for i in range(N + 1)]
outer = [(rb(z), z) for z in zs]; inner = [(max(0.001, rb(z) - 0.03), z) for z in reversed(zs)]
inner[-1] = (0.001, Z0 - 0.005)
cup = lathe('cup', outer + inner[:-1] + [(0.001, Z0 + 0.0)], cap_bot=False); cup.data.materials.append(glass)
# 脚（ガラス）と台（ガラスに金の縁）
stem = lathe('stem', [(0.30, 0.0), (0.46, 0.02), (0.48, 0.05), (0.30, 0.09), (0.10, 0.16), (0.055, 0.30), (0.05, 0.55), (0.06, 0.70), (0.09, 0.78), (0.07, 0.80)], cap_bot=True); stem.data.materials.append(glass)
stem.data.polygons[-1].use_smooth = False
def torus(name, R, r, z):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, location=(0, 0, z), major_segments=128, minor_segments=20)
    o = bpy.context.object; o.name = name; o.data.materials.append(gold); bpy.ops.object.shade_smooth(); return o
torus('rim', rb(Z1) - 0.012, 0.022, Z1)
torus('foot', 0.47, 0.022, 0.035)
torus('knob', 0.075, 0.03, 0.44)
torus('neck', 0.085, 0.018, 0.77)
# 光の水（器の内がわ、水面まで）。毎コマ作り直す（水面の波・高さ）
def light_mat():
    lm = bpy.data.materials.new('light'); lm.use_nodes = True; nt = lm.node_tree; nt.nodes.clear()
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 1.0
    lw = nt.nodes.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.35
    inv = nt.nodes.new('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1; nt.links.new(lw.outputs['Facing'], inv.inputs[1])
    geo = nt.nodes.new('ShaderNodeNewGeometry'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(geo.outputs['Normal'], sep.inputs[0])
    # 上を向いた面（水面）は、波で少し傾いても暗くしない（波の谷が黒い輪に見えたため）
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 0.25; mr.inputs['From Max'].default_value = 0.5; mr.clamp = True; nt.links.new(sep.outputs['Z'], mr.inputs['Value'])
    mx = nt.nodes.new('ShaderNodeMath'); mx.operation = 'MAXIMUM'; nt.links.new(inv.outputs[0], mx.inputs[0]); nt.links.new(mr.outputs['Result'], mx.inputs[1])
    ramp = nt.nodes.new('ShaderNodeValToRGB'); E = ramp.color_ramp.elements
    E[0].position = 0.0; E[0].color = (0.85, 0.28, 0.04, 1); E[1].position = 0.95; E[1].color = (1.0, 0.80, 0.42, 1)
    mid = E.new(0.55); mid.color = (1.0, 0.52, 0.10, 1)
    nt.links.new(mx.outputs[0], ramp.inputs[0]); nt.links.new(ramp.outputs[0], em.inputs['Color'])
    out = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(em.outputs[0], out.inputs[0]); return lm
LM = light_mat()
def zlev(lv): return Z0 + 0.01 + (Z1 - 0.05 - Z0) * lv / 10
def liquid(lv, wave=lambda r: 0.0, seg=96):
    old = bpy.data.objects.get('liq')
    if old: me = old.data; bpy.data.objects.remove(old); bpy.data.meshes.remove(me)
    if lv <= 0.01: return None
    zt = zlev(lv); M = 30; lz = [Z0 + 0.01 + (zt - Z0 - 0.01) * i / M for i in range(M + 1)]
    rt = max(0.002, rb(zt) - 0.036)
    prof = [(0.001, Z0 + 0.01)] + [(max(0.002, rb(z) - 0.036), z) for z in lz[1:-1]] + [(rt, zt + wave(rt))]
    K = 28; prof += [(rt * (K - k) / K, zt + wave(rt * (K - k) / K)) for k in range(1, K)]
    o = lathe('liq', prof, seg=seg, cap_top=True); o.data.materials.append(LM); return o
def liquid_over(dome, spill, wave=lambda r: 0.0, seg=128):
    """満ちて縁の上まで盛り上がった光。spill 0→1 で、水面のふちが金の縁の上へ出る。dome は真ん中の盛り上がりの高さ"""
    old = bpy.data.objects.get('liq')
    if old: me = old.data; bpy.data.objects.remove(old); bpy.data.meshes.remove(me)
    zi = Z1 - 0.012; M = 30; lz = [Z0 + 0.01 + (zi - Z0 - 0.01) * i / M for i in range(M + 1)]
    re = rb(Z1) - 0.036 + spill * 0.058; ze = Z1 - 0.008 + spill * 0.034
    prof = [(0.001, Z0 + 0.01)] + [(max(0.002, rb(z) - 0.036), z) for z in lz[1:]] + [(re, ze)]
    K = 40
    for k in range(1, K):
        r = re * (K - k) / K; x = r / re
        # ふちはまるく立ち上がり（表面張力）、真ん中へゆるやかに盛り上がる
        h = dome * (1 - x ** 2) ** 0.55 + 0.022 * spill * (1 - math.exp(-(1 - x) * 18))
        prof.append((r, ze + h + wave(r)))
    o = lathe('liq', prof, seg=seg, cap_top=True); o.data.materials.append(LM); return o
LV0 = LV
# 照明：うしろの左右から細い光（ガラスの輪郭）、上から弱い光
for x, e in ((-2.2, 300), (2.2, 300)):
    bpy.ops.object.light_add(type='AREA', location=(x, 2.0, 1.4)); o = bpy.context.object; o.data.energy = e; o.data.size = 1.6; o.data.color = (1, 0.88, 0.7)
    o.rotation_euler = (0, 0, 0); c = o.constraints.new('TRACK_TO'); c.target = bpy.data.objects['cup']; c.track_axis = 'TRACK_NEGATIVE_Z'
bpy.ops.object.light_add(type='AREA', location=(0, -2.5, 3.0)); o = bpy.context.object; o.data.energy = 60; o.data.size = 2
c = o.constraints.new('TRACK_TO'); c.target = bpy.data.objects['cup']; c.track_axis = 'TRACK_NEGATIVE_Z'
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.012, 0.014, 0.03, 1); w.node_tree.nodes['Background'].inputs['Strength'].default_value = 1
bpy.ops.object.camera_add(location=(0, -5.2, 1.55)); cam = bpy.context.object; sc.camera = cam
cam.data.lens = 70; cam.rotation_euler = (math.radians(85), 0, 0)
cam.location.z = 1.95; cam.rotation_euler = (math.radians(81), 0, 0)
sc.render.engine = 'CYCLES'; sc.cycles.samples = SM; sc.cycles.use_denoising = True; sc.cycles.device = 'CPU'
sc.render.resolution_x = SZ; sc.render.resolution_y = int(SZ * 1.15); sc.render.film_transparent = True; sc.cycles.film_transparent_glass = True
sc.view_settings.view_transform = 'Standard'
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'; sc.render.filepath = OUT

bpy.ops.object.light_add(type='POINT', location=(0, 0, 1.0)); INL = bpy.context.object; INL.data.color = (1, 0.72, 0.38); INL.data.shadow_soft_size = 0.2
def inner_light(lv, boost=0.0):
    INL.location.z = (Z0 + zlev(max(lv, 0.3))) / 2 + 0.05; INL.data.energy = (0 if lv <= 0.01 else 40 + 25 * lv) * (1 + boost)
if __name__ == '__main__' and not globals().get('FILM'):
    liquid(LV); inner_light(LV); bpy.ops.render.render(write_still=True)
