# 夜の美術館の部屋の入口：中世風の木の扉（板・鉄の帯・鋲・輪の取っ手）を、通路の奥のアーチにはめる。
#   hall.py の door モードから呼ぶ（build(END, wall_m, n)。n は扉の上の部屋の番号 1〜4）
import bpy, bmesh, math
import frame as F

W, H, R = 1.1, 2.1, 0.55   # 扉の幅・まっすぐな部分の高さ・上の半円（通路の奥の光の入口と同じ大きさ）


def iron_mat():
    return F.principled('iron', (0.06, 0.055, 0.05), metal=0.9, rough=0.55)


def plank_mat(i):
    m = bpy.data.materials.new('plank%d' % i); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    co = nt.nodes.new('ShaderNodeTexCoord')
    w = nt.nodes.new('ShaderNodeTexWave'); w.wave_type = 'BANDS'; w.bands_direction = 'X'
    w.inputs['Scale'].default_value = 14 + i * 1.3; w.inputs['Distortion'].default_value = 2.5; w.inputs['Detail'].default_value = 4; w.inputs['Detail Scale'].default_value = 0.6
    nt.links.new(co.outputs['Object'], w.inputs['Vector'])
    r = nt.nodes.new('ShaderNodeValToRGB')
    r.color_ramp.elements[0].color = (0.10, 0.055, 0.03, 1); r.color_ramp.elements[1].color = (0.24, 0.14, 0.07, 1)
    nt.links.new(w.outputs['Fac'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], b.inputs['Base Color'])
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.35
    nt.links.new(w.outputs['Fac'], bp.inputs['Height']); nt.links.new(bp.outputs['Normal'], b.inputs['Normal'])
    b.inputs['Roughness'].default_value = 0.75
    return m


def plank(x0, x1, y, mat):
    # 1枚の板：半円の上ふちに沿って切った、厚み4cmの板
    xs = [x0 + (x1 - x0) * k / 6 for k in range(7)]
    top = [H + math.sqrt(max(R * R - x * x, 0)) for x in xs]
    bm = bmesh.new()
    vb = [bm.verts.new((x, y, 0)) for x in xs]
    vt = [bm.verts.new((x, y, z)) for x, z in zip(xs, top)]
    bm.faces.new(vb + vt[::-1])
    me = bpy.data.meshes.new('plank'); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('plank', me); bpy.context.collection.objects.link(o)
    s = o.modifiers.new('s', 'SOLIDIFY'); s.thickness = 0.045
    bv = o.modifiers.new('b', 'BEVEL'); bv.width = 0.006; bv.segments = 2
    o.data.materials.append(mat)
    return o


def build(END, wall_m, n=1):
    y = END - 0.03
    # 戸の奥は暗く（光を漏らさない）。板は8枚、色を少しずつ変える
    N = 8
    for i in range(N):
        x0 = -W / 2 + W * i / N + 0.004; x1 = -W / 2 + W * (i + 1) / N - 0.004
        plank(x0, x1, y, plank_mat(i))
    im = iron_mat()
    # 鉄の帯（横に3本。先は百合の形の代わりに丸く広げる）と鋲
    for z in (0.35, 1.05, 1.85):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0, y - 0.035, z)); o = bpy.context.object
        o.scale = (W * 0.98, 0.012, 0.07); o.data.materials.append(im)
        bv = o.modifiers.new('b', 'BEVEL'); bv.width = 0.004
        for k in range(9):
            x = -W / 2 + 0.07 + k * (W - 0.14) / 8
            F.sphere((x, y - 0.045, z), 0.017, im, seg=10)
        for sx in (-1, 1):
            F.sphere((sx * (W / 2 - 0.1), y - 0.04, z), 0.05, im, scale=(1, 0.3, 1), seg=14)
    # 上の半円に沿った鉄のふち
    bpy.ops.mesh.primitive_torus_add(major_radius=R - 0.02, minor_radius=0.025, major_segments=48, minor_segments=8,
                                     location=(0, y - 0.03, H), rotation=(math.radians(90), 0, 0))
    t = bpy.context.object
    bm = bmesh.new(); bm.from_mesh(t.data)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, 0), plane_no=(0, 1, 0), clear_inner=True)
    bm.to_mesh(t.data); bm.free(); t.data.materials.append(im)
    # 輪の取っ手と、その台
    F.sphere((0.32, y - 0.05, 1.15), 0.06, im, scale=(1, 0.35, 1), seg=16)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.085, minor_radius=0.013, location=(0.32, y - 0.07, 1.06), rotation=(math.radians(90), 0, 0))
    bpy.context.object.data.materials.append(im)
    # 石の枠（扉のまわりのアーチ）
    stone = F.principled('doorstone', (0.30, 0.25, 0.19), rough=0.85)
    for sx in (-1, 1):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(sx * (W / 2 + 0.09), y - 0.02, H / 2)); o = bpy.context.object
        o.scale = (0.18, 0.12, H); o.data.materials.append(stone)
        bv = o.modifiers.new('b', 'BEVEL'); bv.width = 0.01
    bpy.ops.mesh.primitive_torus_add(major_radius=R + 0.09, minor_radius=0.09, major_segments=48, minor_segments=4,
                                     location=(0, y - 0.02, H), rotation=(math.radians(90), 0, 0))
    t = bpy.context.object
    bm = bmesh.new(); bm.from_mesh(t.data)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, 0), plane_no=(0, 1, 0), clear_inner=True)
    bm.to_mesh(t.data); bm.free(); t.data.materials.append(stone)
    # 扉の上の真鍮の札（部屋の番号と名前はページで重ねる）
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, y - 0.07, H + R + 0.28)); o = bpy.context.object
    o.scale = (0.7, 0.02, 0.16); o.data.materials.append(F.principled('brass', (0.78, 0.6, 0.32), metal=1.0, rough=0.35))
    bv = o.modifiers.new('b', 'BEVEL'); bv.width = 0.008
    # 扉の両わきの小さな燭台（扉の前を照らす）
    for sx in (-1, 1):
        x = sx * (W / 2 + 0.32)
        bpy.ops.object.light_add(type='POINT', location=(x, y - 0.25, 1.9))
        L = bpy.context.object; L.data.energy = 18; L.data.color = (1.0, 0.62, 0.3); L.data.shadow_soft_size = 0.05
        F.sphere((x, y - 0.25, 1.86), 0.016, F.principled('fl', (1, .6, .2)), seg=10)
    # 扉のすき間から漏れるかすかな灯り（中に部屋があるのが分かるように）
    m = bpy.data.materials.new('gap'); m.use_nodes = True
    nt = m.node_tree; nt.nodes.remove(nt.nodes['Principled BSDF'])
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (1.0, 0.7, 0.35, 1); e.inputs['Strength'].default_value = 8
    nt.links.new(e.outputs[0], nt.nodes['Material Output'].inputs[0])
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, y + 0.01, 0.012), rotation=(math.radians(90), 0, 0))
    o = bpy.context.object; o.scale = (W, 0.02, 1); o.data.materials.append(m)
