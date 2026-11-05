"""The two 4.8 m river canoes share a moderately raised, curved hull.

The skin has real thickness and a closed underside. All the pieces of each
clickable part are collected into one mesh, including bark marks and stitching.
"""
import math
import random

from mathutils import Vector

import common
from geometry import Mesh

HALF_LENGTH = 2.4
NU, NA = 64, 24


def hull(u, a, inner=False, lift=0):
    s = abs(2 * u - 1)
    beam = 0.007 + 0.443 * max(0, 1 - s ** 2.2) ** 0.72
    bottom = 0.23 * s ** 4
    rim = 0.35 + 0.23 * s ** 4
    # Inset the inner skin, but keep a physical edge joining it to the outside.
    if inner:
        beam = max(0.003, beam - 0.009)
        bottom += 0.012
    return Vector(((u - 0.5) * 4.8, beam * math.sin(a), bottom + (rim - bottom) * (1 - math.cos(a)) + lift))


def skin_mesh(plastic):
    mesh = Mesh()
    stride = NA + 1
    surface = (NU + 1) * stride
    for inner in (False, True):
        offset = len(mesh.verts)
        for i in range(NU + 1):
            for j in range(NA + 1):
                mesh.vertex(hull(i / NU, -math.pi / 2 + math.pi * j / NA, inner))
        for i in range(NU):
            for j in range(NA):
                a = offset + i * stride + j
                face = (a, a + stride, a + stride + 1, a + 1)
                mesh.face(face if inner else tuple(reversed(face)), 0 if plastic else int(inner))
    # Close the rims and the two narrow stems, keeping the bottom opaque from below.
    for j in (0, NA):
        for i in range(NU):
            a, b = i * stride + j, (i + 1) * stride + j
            face = (a, a + surface, b + surface, b)
            mesh.face(tuple(reversed(face)) if j == NA else face, 0)
    for i in (0, NU):
        for j in range(NA):
            a = i * stride + j
            face = (a, a + 1, a + surface + 1, a + surface)
            mesh.face(tuple(reversed(face)) if i == 0 else face, 0)
    if not plastic:
        rng = random.Random(820)
        # Lenticels follow the bark grain across the length, on both exposed sides.
        for side in (-1, 1):
            for _ in range(190):
                u = rng.uniform(0.035, 0.965)
                a = side * rng.uniform(0.28, 1.5)
                du = rng.uniform(0.002, 0.014)
                da = rng.uniform(0.004, 0.014)
                start = len(mesh.verts)
                for uu, aa in ((u - du, a), (u, a - da), (u + du, a), (u, a + da)):
                    p = hull(uu, aa)
                    p.y += side * 0.0015
                    p.z -= 0.0015 * math.cos(a)
                    mesh.vertex(p)
                mesh.face(tuple(start + j for j in (3, 2, 1, 0)), 2 if rng.random() > 0.25 else 3)
    else:
        # A dark, branching fissure with an exposed pale plastic edge. Kept on the
        # skin so it follows the hull if a teacher explodes the comparison canoe.
        crack = [(0.487, -1.53), (0.491, -1.29), (0.482, -1.08), (0.495, -0.89), (0.488, -0.67)]
        for width, slot, lift in ((0.011, 2, 0.003), (0.005, 1, 0.004)):
            for path in (crack, [(0.482, -1.08), (0.467, -0.99), (0.461, -0.83)]):
                start = len(mesh.verts)
                for u, a in path:
                    for delta in (-width / 4.8, width / 4.8):
                        p = hull(u + delta, a)
                        p.y -= lift
                        mesh.vertex(p)
                for k in range(len(path) - 1):
                    a = start + k * 2
                    mesh.face((a, a + 2, a + 3, a + 1), slot)
    return mesh


def build(plastic=False):
    common.reset()
    model_id = "canoe_plastic" if plastic else "canoe_birch"
    root = common.root(model_id)
    if plastic:
        skin_materials = [common.material("moulded red plastic", (0.65, 0.025, 0.018), 0.33),
                          common.material("open crack shadow", (0.025, 0.008, 0.006), 0.95),
                          common.material("stressed plastic edge", (0.91, 0.30, 0.23), 0.65)]
    else:
        skin_materials = [common.material("cream birch bark", (0.87, 0.81, 0.66), 0.83),
                          common.material("warm inner bark", (0.56, 0.285, 0.12), 0.86),
                          common.material("dark bark lenticels", (0.15, 0.095, 0.055), 0.95),
                          common.material("faded bark lenticels", (0.39, 0.31, 0.22), 0.9)]
    skin = skin_mesh(plastic).object("part_skin", skin_materials, root)
    skin["explode"] = "0,0,0"

    frame = Mesh()
    if plastic:
        frame_materials = [common.material("aluminium", (0.65, 0.69, 0.72), 0.29, 0.8),
                           common.material("moulded charcoal seats", (0.065, 0.075, 0.08), 0.55)]
    else:
        frame_materials = [common.material("split white cedar", (0.72, 0.51, 0.27), 0.75),
                           common.material("cedar sheathing", (0.65, 0.43, 0.21), 0.85),
                           common.material("light cedar strips", (0.80, 0.60, 0.34), 0.78)]
        # Closely fitted longitudinal sheathing, laid under the crosswise ribs.
        for strip in range(15):
            a = -1.40 + strip * 0.20
            start = len(frame.verts)
            for i in range(49):
                u = 0.035 + 0.93 * i / 48
                for delta in (-0.091, 0.091):
                    frame.vertex(hull(u, a + delta, True, 0.003))
            for i in range(48):
                j = start + 2 * i
                frame.face((j + 2, j + 3, j + 1, j), 1 + strip % 2)
        # Wide, flat split ribs rather than round metal-looking rods.
        for i in range(23):
            u = 0.065 + 0.87 * i / 22
            start = len(frame.verts)
            for j in range(25):
                a = -1.53 + 3.06 * j / 24
                for du, lift in ((-0.005, 0.009), (0.005, 0.009), (0.005, 0.022), (-0.005, 0.022)):
                    p = hull(u + du, a, True, lift)
                    frame.vertex(p)
                if j:
                    for k in range(4):
                        b = start + (j - 1) * 4
                        frame.face((b + k, b + (k + 1) % 4, b + (k + 1) % 4 + 4, b + k + 4))
            frame.face(tuple(start + j for j in reversed(range(4))))
            frame.face(tuple(start + 96 + j for j in range(4)))
    for side in (-1, 1):
        frame.tube([hull(0.005 + 0.99 * i / 64, side * math.pi / 2, lift=0.006) for i in range(65)],
                   0.022 if plastic else 0.023, sides=8)
    for u in (0.29, 0.5, 0.71):
        p = hull(u, math.pi / 2)
        frame.box((p.x, 0, p.z - 0.012), (0.065, p.y * 1.94, 0.028))
    if plastic:
        for u in (0.23, 0.77):
            p = hull(u, math.pi / 2)
            frame.box((p.x, 0, p.z - 0.055), (0.30, p.y * 1.85, 0.035), 1)
            # Three raised channels make the two seat slabs read as moulded.
            for dx in (-0.09, 0, 0.09):
                frame.box((p.x + dx, 0, p.z - 0.032), (0.018, p.y * 1.67, 0.012), 1)
    frame_ob = frame.object("part_frame", frame_materials, root)
    frame_ob["explode"] = "0,0.9,0"

    if not plastic:
        lashing, gum = Mesh(), Mesh()
        for side in (-1, 1):
            for k in range(29):
                u = 0.025 + 0.95 * k / 28
                for dx in (-0.008, 0.008):
                    p = hull(u, side * math.pi / 2, lift=0.006)
                    lashing.tube([(p.x + dx + 0.007 * j / 10,
                                   p.y + 0.029 * math.cos(math.tau * j / 10),
                                   p.z + 0.029 * math.sin(math.tau * j / 10)) for j in range(11)],
                                 0.0035, sides=4, caps=False)
        for u in (0.007, 0.24, 0.50, 0.76, 0.993):
            # Visible on the outside, including when carried upside down.
            seam = []
            for j in range(33):
                a = -math.pi / 2 + math.pi * j / 32
                p = hull(u, a)
                p += Vector((0, 0.003 * math.sin(a), -0.003 * math.cos(a)))
                seam.append(p)
            gum.tube(seam, 0.010, sides=5)
            for j in range(15):
                a = -1.46 + 2.92 * j / 14
                stitch = []
                for k in range(5):
                    t = k / 4
                    p = hull(u + (t - 0.5) * 0.009, a + (t - 0.5) * 0.065)
                    p += Vector((0, (0.012 + 0.006 * math.sin(math.pi * t)) * math.sin(a),
                                 -(0.012 + 0.006 * math.sin(math.pi * t)) * math.cos(a)))
                    stitch.append(p)
                lashing.tube(stitch, 0.0035, sides=4)
        lashing_ob = lashing.object("part_lashing", [common.material("spruce root thread", (0.33, 0.20, 0.085), 0.83)], root)
        lashing_ob["explode"] = "0,1.7,0"
        gum_ob = gum.object("part_gum", [common.material("spruce gum seal", (0.035, 0.021, 0.012), 0.27)], root)
        gum_ob["explode"] = "0,2.5,0"

    mask = Mesh()
    for i in range(NU + 1):
        for side in (-1, 1):
            mask.vertex(hull(i / NU, side * math.pi / 2, lift=-0.016))
        if i:
            a = (i - 1) * 2
            mask.face((a, a + 1, a + 3, a + 2))
    water_mask = mask.object("water_mask", [common.material("water mask (hidden by site)", (0.1, 0.3, 0.4))], root)
    water_mask.hide_render = True  # glTF still exports it; the site assigns its depth-only material.
    water_mask.hide_set(True)

    # The gum seals project below the skin; translate the geometry, not the root
    # or part origins, to place the entire assembled object exactly on the ground.
    min_z = min(v.co.z for ob in root.children if ob.type == "MESH" and ob != water_mask for v in ob.data.vertices)
    for ob in root.children:
        for v in ob.data.vertices:
            v.co.z -= min_z
    common.export(model_id)
