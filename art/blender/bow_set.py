"""A plain bow and one arrow on the camp's two-post display rack.

Blender -b -P art/blender/bow_set.py

Matches buildBow's dimensions and layout: X along the stave and arrow, Z up,
bow arc above its string, arrow below and pointing +X. The four named meshes
carry the site's three.js (Y-up) explode offsets, not Blender-space offsets.
The rack is a separate, static child. Both faces have full geometry so the
Blender +Y front and the site's opposite local view are equally readable.
"""
import math
import os
import sys

sys.path.append(os.path.dirname(__file__))
import common  # noqa: E402
from geometry import Mesh  # noqa: E402
from mathutils import Vector  # noqa: E402

common.reset()
root = common.root("bow_set")

wood_materials = [
    common.material("plain bow wood", (0.30, 0.135, 0.048), 0.78),
    common.material("bow wood side grain", (0.39, 0.205, 0.082), 0.83),
    common.material("pale arrow shaft", (0.62, 0.405, 0.19), 0.79),
    common.material("plain feather vanes", (0.40, 0.34, 0.25), 0.91),
    common.material("feather quills and barbs", (0.65, 0.57, 0.42), 0.90),
]
sinew_material = common.material("deer sinew bowstring", (0.72, 0.61, 0.40), 0.91)
flint_materials = [
    common.material("flint dark facets", (0.085, 0.10, 0.115), 0.40),
    common.material("flint fresh flakes", (0.17, 0.195, 0.21), 0.36),
    common.material("flint pale edges", (0.26, 0.28, 0.285), 0.45),
]
gum_material = common.material("dark spruce gum adhesive", (0.030, 0.018, 0.009), 0.29)
rack_materials = [
    common.material("plain wooden display rack", (0.21, 0.125, 0.058), 0.94),
    common.material("rack cut ends", (0.40, 0.27, 0.13), 0.94),
]

HALF, STRING_Z, ARROW_Z = 0.66, 1.06, 0.84
TAIL, NECK = -0.48, 0.36


def bow_at(t):
    return Vector((HALF * t, 0, STRING_Z + 0.20 * (1 - t * t) - 0.03 * t ** 4))


# A tapered, flattened stave, slightly fuller at the plain wooden handgrip.
wood = Mesh()
RINGS, SIDES = 48, 12
for i in range(RINGS + 1):
    t = -1 + 2 * i / RINGS
    center = bow_at(t)
    tangent = Vector((HALF, 0, -0.40 * t - 0.12 * t ** 3)).normalized()
    across = Vector((0, 1, 0))
    vertical = tangent.cross(across)
    taper = 0.40 + 0.60 * (1 - abs(t) ** 1.6)
    grip = 1 + 0.19 * math.exp(-(t / 0.12) ** 4)
    for j in range(SIDES):
        angle = math.tau * j / SIDES
        wood.vertex(center + across * math.cos(angle) * 0.014 * taper * grip
                    + vertical * math.sin(angle) * 0.023 * taper * grip)
    if i:
        for j in range(SIDES):
            a = (i - 1) * SIDES + j
            b = (i - 1) * SIDES + (j + 1) % SIDES
            wood.face((a, b, b + SIDES, a + SIDES), 1 if j in (2, 3, 8, 9) else 0)
wood.face(tuple(reversed(range(SIDES))))
wood.face(tuple(RINGS * SIDES + j for j in range(SIDES)))

# A straight shaft, with a shallow nock visible at its left end.
wood.tube([(TAIL, 0, ARROW_Z), (NECK + 0.025, 0, ARROW_Z)], [0.008, 0.007], 2, sides=10)
for side in (-1, 1):
    wood.tube([(TAIL - 0.012, side * 0.0045, ARROW_Z),
               (TAIL + 0.014, side * 0.0045, ARROW_Z)], 0.003, 2, sides=6)

# Three simple feather vanes. Give each a thin physical edge and individual
# barbs; the feathers ride with the wooden shaft in the sorting question.
for angle in (math.pi / 2, math.pi / 2 + math.tau / 3, math.pi / 2 + 2 * math.tau / 3):
    outward = Vector((0, math.cos(angle), math.sin(angle)))
    normal = Vector((1, 0, 0)).cross(outward)
    start = len(wood.verts)
    sections = 12
    for i in range(sections + 1):
        t = i / sections
        x = TAIL + 0.035 + 0.17 * t
        width = 0.008 + 0.031 * math.sin(math.pi * t) ** 0.72
        for side in (-1, 1):
            for radius in (0.006, width):
                wood.vertex(Vector((x, 0, ARROW_Z)) + outward * radius + normal * side * 0.0007)
        if i:
            a = start + (i - 1) * 4
            for face in ((a, a + 4, a + 5, a + 1), (a + 2, a + 3, a + 7, a + 6),
                         (a + 1, a + 5, a + 7, a + 3), (a, a + 2, a + 6, a + 4)):
                wood.face(tuple(reversed(face)), 3)
        if 0 < i < sections:
            x_back = x - 0.013
            for side in (-1, 1):
                p = Vector((x_back, 0, ARROW_Z)) + outward * 0.009 + normal * side * 0.0012
                q = Vector((x, 0, ARROW_Z)) + outward * (width - 0.003) + normal * side * 0.0012
                wood.tube([p, q], 0.00065, 4, sides=3)
    wood.face(tuple(start + j for j in (2, 3, 1, 0)), 3)
    end = start + sections * 4
    wood.face(tuple(end + j for j in (0, 1, 3, 2)), 3)
    wood.tube([Vector((TAIL + 0.025, 0, ARROW_Z)) + outward * 0.007,
               Vector((TAIL + 0.215, 0, ARROW_Z)) + outward * 0.007], 0.0013, 4, sides=5)
wood_ob = wood.object("bow_wood", wood_materials, root)
wood_ob["explode"] = "0,0,0"

# Two gently twisting sinew strands are deliberately a little generous in
# thickness, so the bowstring can still be read at the camp camera distance.
sinew = Mesh()
left, right = bow_at(-1), bow_at(1)
for strand in range(2):
    points = []
    for i in range(241):
        t = i / 240
        phase = t * math.tau * 24 + strand * math.pi
        p = left.lerp(right, t)
        p.y += 0.0021 * math.cos(phase)
        p.z += 0.0021 * math.sin(phase)
        points.append(p)
    sinew.tube(points, 0.0023, sides=5)
for side in (-1, 1):
    p = bow_at(side)
    sinew.tube([(p.x + 0.009 * math.sin(math.tau * j / 20),
                 0.010 * math.cos(math.tau * j / 20),
                 p.z + 0.010 * math.sin(math.tau * j / 20)) for j in range(21)],
               0.0025, sides=5, caps=False)
sinew_ob = sinew.object("bow_sinew", [sinew_material], root)
sinew_ob["explode"] = "0,0.34,0.04"

# A plain leaf-shaped, flaked point. An inset ridge on each face and the
# alternating edge chips produce flint facets rather than a metal-looking cone.
flint = Mesh()
outline = [(-0.016, -0.009), (0.010, -0.021), (0.040, -0.034), (0.067, -0.029),
           (0.094, -0.018), (0.142, 0), (0.094, 0.018), (0.067, 0.029),
           (0.040, 0.034), (0.010, 0.021), (-0.016, 0.009)]
edge = [flint.vertex((NECK + x, 0, ARROW_Z + z)) for x, z in outline]
for side in (-1, 1):
    inset = []
    for j, (x, z) in enumerate(outline):
        # The actual sharp tip stays on the outline; the inset ridge ends short
        # of it to make a visible, thin cutting edge all the way around.
        xx = 0.047 + (x - 0.047) * 0.57
        zz = z * (0.43 if j % 2 else 0.56)
        inset.append(flint.vertex((NECK + xx, side * (0.0075 if j % 2 else 0.010), ARROW_Z + zz)))
    center = flint.vertex((NECK + 0.050, side * 0.013, ARROW_Z))
    for j in range(len(edge)):
        k = (j + 1) % len(edge)
        faces = [(edge[j], edge[k], inset[j]), (edge[k], inset[k], inset[j]),
                 (inset[j], inset[k], center)]
        for n, face in enumerate(faces):
            flint.face(tuple(reversed(face)) if side == 1 else face, (j + n) % 3)
flint_ob = flint.object("bow_flint", flint_materials, root, smooth=False)
flint_ob["explode"] = "0.2,0.2,0.04"

# Dark adhesive surrounds the point's tang and the shaft. Nothing metallic,
# and no additional wrapping material that would change the teacher's four.
gum = Mesh()
gum.ellipsoid((NECK + 0.004, 0, ARROW_Z), (0.036, 0.014, 0.018), segments=16, rings=8)
for side in (-1, 1):
    gum.ellipsoid((NECK + 0.020, side * 0.007, ARROW_Z + side * 0.004),
                  (0.017, 0.010, 0.012), segments=10, rings=5)
gum_ob = gum.object("bow_gum", [gum_material], root)
gum_ob["explode"] = "0.16,-0.24,0.04"

# Plain two-post rack matches the stand-in's 1.8 m width and 1.7 m height.
# It is a display fixture and stays still while the learning parts separate.
rack = Mesh()
for side in (-1, 1):
    rack.tube([(side * 0.82, -0.065, 0), (side * 0.82, -0.065, 0.85),
               (side * 0.82, -0.065, 1.70)], [0.045, 0.041, 0.035], sides=10)
rack.tube([(-0.90, -0.065, 1.66), (0.90, -0.065, 1.66)], 0.030, sides=10)
rack_ob = rack.object("display_rack", rack_materials, root)
# End-grain slots only on the tube caps, no decorative fittings or fasteners.
for polygon in rack_ob.data.polygons:
    if len(polygon.vertices) > 4:
        polygon.material_index = 1

common.export("bow_set")
