# 夜の美術館の部屋の中：石の部屋の真ん中に大きな燭台。灯る前（月の光だけ）と、灯った後の2枚を書き出す。
#   python3 room.py -- <出力.png> [幅px] [サンプル数] [dark|lit]
# 部屋ごとの違い（名前・好む属性の色）はページで重ねる。絵は5部屋とも同じ1組
import bpy, bmesh, math, sys, os
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
a = sys.argv[sys.argv.index('--') + 1:]
OUT = a[0]; PX = int(a[1]) if len(a) > 1 else 1200; SAMPLES = int(a[2]) if len(a) > 2 else 96
LIT = (a[3] if len(a) > 3 else 'dark') == 'lit'
bpy.ops.wm.read_factory_settings(use_empty=True)
import frame as F
sc = bpy.context.scene

RW, RD, RH = 7.0, 7.0, 3.6   # 部屋の幅・奥行き・壁の高さ


def stone_mat(name, scale, c1, c2, bump=0.4, row=0.5, rough=0.85):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    co = nt.nodes.new('ShaderNodeTexCoord')
    br = nt.nodes.new('ShaderNodeTexBrick')
    br.inputs['Scale'].default_value = scale; br.inputs['Mortar Size'].default_value = 0.012
    br.inputs['Color1'].default_value = (*c1, 1); br.inputs['Color2'].default_value = (*c2, 1)
    br.inputs['Mortar'].default_value = (0.03, 0.028, 0.025, 1); br.inputs['Row Height'].default_value = row
    nt.links.new(co.outputs['Object'], br.inputs['Vector'])
    n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = 18; n.inputs['Detail'].default_value = 8
    nt.links.new(co.outputs['Object'], n.inputs['Vector'])
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs['Factor'].default_value = .5
    nt.links.new(br.outputs['Color'], mix.inputs['A']); nt.links.new(n.outputs['Color'], mix.inputs['B'])
    nt.links.new(mix.outputs['Result'], b.inputs['Base Color']); b.inputs['Roughness'].default_value = rough
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = bump
    nt.links.new(br.outputs['Fac'], bp.inputs['Height']); nt.links.new(bp.outputs['Normal'], b.inputs['Normal'])
    return m


def emit_mat(name, color, strength):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.remove(nt.nodes['Principled BSDF'])
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (*color, 1); e.inputs['Strength'].default_value = strength
    nt.links.new(e.outputs[0], nt.nodes['Material Output'].inputs[0]); return m


def box(loc, size, mat, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o = bpy.context.object; o.scale = size
    if bevel: bv = o.modifiers.new('b', 'BEVEL'); bv.width = bevel; bv.segments = 2
    o.data.materials.append(mat); return o


def plane(loc, size, rot, mat):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object; o.scale = (*size, 1); o.data.materials.append(mat)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True); return o


def half_torus(R, r, loc, mat, seg=48):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=seg, minor_segments=8, location=loc, rotation=(math.radians(90), 0, 0))
    t = bpy.context.object
    bm = bmesh.new(); bm.from_mesh(t.data)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, 0), plane_no=(0, 1, 0), clear_inner=True)
    bm.to_mesh(t.data); bm.free(); t.data.materials.append(mat); return t


wall = stone_mat('wall', 2.2, (0.34, 0.27, 0.20), (0.25, 0.20, 0.15))
floor = stone_mat('floor', 1.1, (0.30, 0.26, 0.22), (0.22, 0.19, 0.16), bump=0.15, row=1.0, rough=0.85)
plane((0, RD / 2, 0), (RW, RD), (0, 0, 0), floor)
plane((0, RD, RH / 2 + 1), (RW, RH + 2), (math.radians(90), 0, 0), wall)
for sx in (-1, 1):
    plane((sx * RW / 2, RD / 2, RH / 2 + 1), (RD, RH + 2), (math.radians(90), 0, math.radians(90)), wall)
plane((0, RD / 2, RH + 1.6), (RW, RD), (0, 0, 0), stone_mat('ceil', 2.0, (0.12, 0.10, 0.09), (0.09, 0.08, 0.07)))
pil = F.principled('pillar', (0.26, 0.21, 0.16), rough=0.8)
gold = F.gold_mat('gold', worn=True)

# 奥の壁：大きなアーチの壁がん（中は深い紺。灯ると金の光が満ちる）と、その両わきの柱
half_torus(1.35, 0.12, (0, RD - 0.05, 2.3), pil)
for sx in (-1, 1):
    box((sx * 1.35, RD - 0.05, 1.15), (0.26, 0.2, 2.3), pil, bevel=0.02)
niche = emit_mat('niche', (1.0, 0.74, 0.38) if LIT else (0.08, 0.12, 0.3), 1.8 if LIT else 0.6)
plane((0, RD - 0.02, 1.15), (2.45, 2.3), (math.radians(90), 0, 0), niche)
bpy.ops.mesh.primitive_circle_add(vertices=48, radius=1.225, fill_type='NGON', location=(0, RD - 0.02, 2.3), rotation=(math.radians(90), 0, 0))
c = bpy.context.object; bm = bmesh.new(); bm.from_mesh(c.data)
bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, 0), plane_no=(0, 1, 0), clear_inner=True)
bm.to_mesh(c.data); bm.free(); c.data.materials.append(niche)

# 両側の壁：細長いステンドグラスの窓（月の光が差す）
glass_cols = [(0.15, 0.3, 0.85), (0.8, 0.2, 0.25), (0.9, 0.7, 0.2), (0.2, 0.6, 0.4)]
for sx in (-1, 1):
    for k, y in enumerate((2.2, 4.6)):
        m = emit_mat('glass%d%d' % (sx, k), glass_cols[(k + (sx > 0) * 2) % 4], 2.5 if LIT else 1.6)
        plane((sx * (RW / 2 - 0.01), y, 2.0), (0.7, 1.8), (math.radians(90), 0, math.radians(90)), m)
        half_torus(0.42, 0.06, (sx * (RW / 2 - 0.03), y, 2.9), pil).rotation_euler = (math.radians(90), 0, math.radians(90))
        for d in (-1, 1):
            box((sx * (RW / 2 - 0.03), y + d * 0.42, 2.0), (0.1, 0.1, 1.8), pil)
        bpy.ops.object.light_add(type='AREA', location=(sx * (RW / 2 - 0.2), y, 2.2))
        L = bpy.context.object; L.data.energy = 40 if not LIT else 20; L.data.size = 0.8
        L.data.color = glass_cols[(k + (sx > 0) * 2) % 4]; L.rotation_euler = (0, math.radians(-90 * sx), 0)

# 真ん中：石の台の上に大きな燭台（金の受け皿と7本の蝋燭。灯ると炎）
box((0, 3.9, 0.12), (1.6, 1.6, 0.24), pil, bevel=0.03)
box((0, 3.9, 0.55), (0.9, 0.9, 0.7), pil, bevel=0.03)
bpy.ops.mesh.primitive_cylinder_add(radius=0.07, depth=1.1, location=(0, 3.9, 1.45)); bpy.context.object.data.materials.append(gold)
bpy.ops.mesh.primitive_cone_add(radius1=0.6, radius2=0.18, depth=0.18, location=(0, 3.9, 2.05)); bpy.context.object.data.materials.append(gold)
bpy.ops.mesh.primitive_torus_add(major_radius=0.6, minor_radius=0.03, location=(0, 3.9, 2.14)); bpy.context.object.data.materials.append(gold)
candle = F.principled('candle', (0.92, 0.87, 0.75), rough=0.6)
flame = emit_mat('flame', (1.0, 0.62, 0.22), 80)
for k in range(7):
    ang = 2 * math.pi * k / 7
    x, y = (0, 3.9) if k == 0 else (0.42 * math.cos(ang), 3.9 + 0.42 * math.sin(ang))
    h = 0.34 if k == 0 else 0.24
    bpy.ops.mesh.primitive_cylinder_add(radius=0.035, depth=h, location=(x, y, 2.16 + h / 2)); bpy.context.object.data.materials.append(candle)
    if LIT:
        F.sphere((x, y, 2.16 + h + 0.04), 0.022, flame, scale=(1, 1, 2.0), seg=12)
        bpy.ops.object.light_add(type='POINT', location=(x, y, 2.16 + h + 0.1))
        L = bpy.context.object; L.data.energy = 70; L.data.color = (1.0, 0.6, 0.28); L.data.shadow_soft_size = 0.06
if LIT:
    bpy.ops.object.light_add(type='POINT', location=(0, 3.9, 3.0)); L = bpy.context.object
    L.data.energy = 160; L.data.color = (1.0, 0.7, 0.4); L.data.shadow_soft_size = 0.6

# 床の四隅の小さな燭台（灯ると点く）
for sx in (-1, 1):
    for y in (1.2, 6.2):
        x = sx * (RW / 2 - 0.6)
        bpy.ops.mesh.primitive_cylinder_add(radius=0.05, depth=1.2, location=(x, y, 0.6)); bpy.context.object.data.materials.append(gold)
        if LIT:
            F.sphere((x, y, 1.26), 0.03, flame, scale=(1, 1, 1.8), seg=10)
            bpy.ops.object.light_add(type='POINT', location=(x, y, 1.32)); L = bpy.context.object
            L.data.energy = 40; L.data.color = (1.0, 0.62, 0.3)

# 空気（うすい霧で光の筋を出す）・月の光・カメラ（入口に立った目の高さ）
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.01, 0.015, 0.035, 1)
w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.4
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, RD / 2, RH / 2 + 0.85)); fog = bpy.context.object; fog.scale = (RW - 0.1, RD - 0.1, RH + 1.4)  # 床や壁と面を重ねない（重なると床が黒くなる）
fm = bpy.data.materials.new('fog'); fm.use_nodes = True; nt = fm.node_tree; nt.nodes.remove(nt.nodes['Principled BSDF'])
vs = nt.nodes.new('ShaderNodeVolumeScatter'); vs.inputs['Density'].default_value = 0.025
nt.links.new(vs.outputs[0], nt.nodes['Material Output'].inputs['Volume']); fog.data.materials.append(fm)
bpy.ops.object.light_add(type='AREA', location=(0, 1.0, RH + 1.2)); L = bpy.context.object
L.data.energy = 90 if not LIT else 40; L.data.size = 4; L.data.color = (0.55, 0.65, 1.0)

bpy.ops.object.camera_add(location=(0, -0.2, 1.55), rotation=(math.radians(86), 0, 0))
cam = bpy.context.object; sc.camera = cam; cam.data.lens = 18
sc.render.resolution_x = PX; sc.render.resolution_y = round(PX * 2 / 3)
sc.render.engine = 'CYCLES'; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True; sc.cycles.max_bounces = 6
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'
sc.render.image_settings.file_format = 'PNG'; sc.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print('DONE')
