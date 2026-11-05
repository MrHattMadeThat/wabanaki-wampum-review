"""Four-metre birch-bark wigwam, open smoke hole and plain +Y door covering.

Overlapping bark sheets, stitched seams, an inner pole cone crossing above
the smoke hole, and outer retaining poles. Plain materials and no decoration,
people, ceremony, furnishings or additional cultural claims.
"""
import math
import os
import random
import sys

sys.path.append(os.path.dirname(__file__))
import common  # noqa: E402
from geometry import Mesh  # noqa: E402
from mathutils import Vector  # noqa: E402

common.reset()
root = common.root("wigwam")
rng = random.Random(615)
materials = [common.material("wigwam cream bark", (0.79, 0.74, 0.61), 0.89),
             common.material("wigwam pale bark sheets", (0.87, 0.81, 0.67), 0.88),
             common.material("wigwam warm inner bark", (0.42, 0.25, 0.115), 0.93),
             common.material("wigwam bark lenticels", (0.14, 0.095, 0.05), 0.95)]
pole_material = common.material("plain wigwam poles", (0.37, 0.235, 0.105), 0.88)
seam_material = common.material("plain bark seam stitching", (0.26, 0.17, 0.075), 0.94)
bark, poles, stitches = Mesh(), Mesh(), Mesh()


def at(theta, z, inset=0):
    radius = 2 * (1 - z / 3.1) + inset
    return Vector((radius * math.cos(theta), radius * math.sin(theta), z))


def sheet(a0, a1, z0, z1, slot, lift=0):
    n = 8
    start = len(bark.verts)
    for inside in (False, True):
        for z in (z0, z1):
            for j in range(n + 1):
                bark.vertex(at(a0 + (a1 - a0) * j / n, z, lift - (0.015 if inside else 0)))
    stride, surface = n + 1, (n + 1) * 2
    for j in range(n):
        face = (start + j, start + j + 1, start + stride + j + 1, start + stride + j)
        bark.face(face, slot)
        bark.face(tuple(i + surface for i in reversed(face)), 2)
        bark.face((start + j, start + surface + j, start + surface + j + 1, start + j + 1), 2)
        a = start + stride + j
        bark.face((a, a + 1, a + surface + 1, a + surface), slot)
    for j in (0, n):
        a = start + j
        face = (a, a + stride, a + surface + stride, a + surface)
        bark.face(tuple(reversed(face)) if j == n else face, slot)


N = 16
for band, (z0, z1) in enumerate(((0, 1.12), (1.0, 2.03), (1.91, 2.82))):
    for panel in range(N):
        a0 = panel * math.tau / N
        a1 = (panel + 1) * math.tau / N + 0.012
        center = (a0 + a1) / 2
        front = abs((center - math.pi / 2 + math.pi) % math.tau - math.pi) < 0.40
        bottom = max(z0, 1.40) if front else z0
        if bottom < z1:
            sheet(a0, a1, bottom, z1, (panel + band) % 2, band * 0.012)
    # Thin circumferential stitches across the overlapping band edge.
    if band:
        for j in range(56):
            a = math.tau * j / 56
            if z0 < 1.4 and abs((a - math.pi / 2 + math.pi) % math.tau - math.pi) < 0.42:
                continue
            stitches.tube([at(a - 0.008, z0 - 0.025, 0.026 + band * 0.012),
                           at(a + 0.008, z0 + 0.025, 0.026 + band * 0.012)], 0.0045, sides=4)

# One simple bark flap covering most of the front opening, with a narrow gap
# at its right edge. It reads as bark rather than an invented textile design.
sheet(math.pi / 2 - 0.29, math.pi / 2 + 0.36, 0.025, 1.40, 1, 0.045)

for j in range(N):
    a = math.tau * j / N
    p = at(a, 0, -0.045)
    tip = Vector((-0.22 * math.cos(a), -0.22 * math.sin(a), 3.43 + 0.035 * math.sin(j)))
    poles.tube([p, p.lerp(tip, 0.6), tip], [0.030, 0.025, 0.016], sides=6)
    # Retaining poles on the outside, ending below the open smoke hole.
    poles.tube([at(a + 0.09, 0.015, 0.035), at(a + 0.09, 1.38, 0.040), at(a + 0.09, 2.68, 0.047)],
               [0.023, 0.019, 0.012], sides=5)
    for k in range(20):
        z = 0.12 + k * 0.131
        if z < 1.4 and abs((a - math.pi / 2 + math.pi) % math.tau - math.pi) < 0.42:
            continue
        stitches.tube([at(a - 0.012, z - 0.025, 0.040), at(a + 0.012, z + 0.025, 0.044)], 0.004, sides=4)

# Horizontal lenticels follow each conical sheet rather than floating in space.
for j in range(310):
    a, z = rng.uniform(0, math.tau), rng.uniform(0.06, 2.74)
    if z < 1.4 and abs((a - math.pi / 2 + math.pi) % math.tau - math.pi) < 0.42:
        continue
    radius = 2 * (1 - z / 3.1)
    da = rng.uniform(0.018, 0.075) / max(0.25, radius)
    dz = rng.uniform(0.003, 0.008)
    band_lift = 0.012 * (2 if z > 1.91 else 1 if z > 1 else 0)
    start = len(bark.verts)
    for aa, zz in ((a - da, z), (a, z - dz), (a + da, z), (a, z + dz)):
        bark.vertex(at(aa, zz, band_lift + 0.002))
    bark.face(tuple(start + k for k in range(4)), 3)
bark.object("overlapping_birch_sheets_and_door", materials, root)
poles.object("inner_and_outer_poles", [pole_material], root)
stitches.object("sewn_panel_seams", [seam_material], root)
min_z = min(v.co.z for ob in root.children for v in ob.data.vertices)
for ob in root.children:
    for vertex in ob.data.vertices:
        vertex.co.z -= min_z
common.export("wigwam")
