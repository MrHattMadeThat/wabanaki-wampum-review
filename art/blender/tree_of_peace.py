"""White pine with loose horizontal boughs, pale spreading roots and an eagle.

Needles form airy, five-needle fascicles at twig tips, rather than leafy balls
or a solid conical crown. The roots and eagle are single, separately named
child meshes. Eagle geometry is local to its perch so site animation pivots
around the bird, not the foot of the tree. No figures, ceremony or weapons.
"""
import math
import os
import random
import sys

sys.path.append(os.path.dirname(__file__))
import common  # noqa: E402
from geometry import Mesh  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

common.reset()
root = common.root("tree_of_peace")
rng = random.Random(515)
bark = common.material("grey brown white pine bark", (0.22, 0.18, 0.125), 0.94)
bark_light = common.material("raised bark scales", (0.32, 0.27, 0.19), 0.95)
greens = [common.material("pine needles shadow", (0.045, 0.12, 0.065), 0.9),
          common.material("pine needles green", (0.09, 0.23, 0.12), 0.86),
          common.material("pine needles tips", (0.18, 0.32, 0.17), 0.85)]
wood, needles = Mesh(), Mesh()

# Gently tapering straight leader. Crown reaches 17.4 m; eagle adds 0.7 m.
wood.tube([(0.035 * math.sin(i * 0.4), 0.025 * math.sin(i * 0.7), i * 0.87 + 0.08) for i in range(21)],
          [0.52 * (1 - i / 23) ** 1.15 for i in range(21)], sides=12)
# Long, broken vertical bark scales keep the visible lower trunk from looking
# like a smooth dowel. These are plain geometry, no procedural texture.
for k in range(68):
    z = rng.uniform(0.35, 12.5)
    a = rng.uniform(0, math.tau)
    radius = 0.52 * (1 - z / 20) ** 1.15
    wood.tube([(math.cos(a) * radius, math.sin(a) * radius, z),
               (math.cos(a + 0.015) * radius * 0.98, math.sin(a + 0.015) * radius * 0.98, z + rng.uniform(0.18, 0.48))],
              [0.016, 0.008], material=1, sides=4)


def tuft(center, direction, size):
    """Five long slender needles per fascicle, several fascicles per shoot."""
    direction = Vector(direction).normalized()
    across = direction.cross(Vector((0, 0, 1)))
    if across.length < 0.01:
        across = Vector((1, 0, 0))
    across.normalize()
    up = direction.cross(across).normalized()
    # A narrow, pointed core lets the tuft read at the stop's camera distance;
    # distinct five-needle fascicles soften its outline at closer range.
    # Serrated rings give a brush-like silhouette instead of a smooth leafy
    # oval. Stagger the two rings so light breaks across the needle mass.
    start = len(needles.verts)
    base = needles.vertex(Vector(center) - direction * size * 0.46)
    for ring in range(2):
        for j in range(10):
            angle = math.tau * j / 10 + ring * 0.14
            radius = size * (0.33 if j % 2 else 0.16)
            p = (Vector(center) + direction * size * (-0.06 + ring * 0.43)
                 + across * math.cos(angle) * radius
                 + up * math.sin(angle) * radius * 0.65)
            needles.vertex(p)
    tip = needles.vertex(Vector(center) + direction * size * 0.87)
    for j in range(10):
        a, b = start + 1 + j, start + 1 + (j + 1) % 10
        needles.face((base, b, a), 1)
        needles.face((a, b, b + 10, a + 10), 1 if j % 2 else 0)
        needles.face((a + 10, b + 10, tip), 1)
    for f in range(2):
        phase = f * 2.39996
        outward = across * math.cos(phase) + up * math.sin(phase)
        base = Vector(center) + direction * (f / 2 - 0.5) * size * 0.6
        for n in range(5):
            angle = phase + (n - 2) * 0.18
            spread = across * math.cos(angle) + up * math.sin(angle)
            length = size * rng.uniform(0.7, 1.10)
            tip = base + direction * length * 0.78 + spread * length * (0.38 + f * 0.035)
            mid = base.lerp(tip, 0.56) + outward * size * 0.09
            width = across * size * 0.025
            a = needles.vertex(base)
            b = needles.vertex(mid - width)
            c = needles.vertex(tip)
            d = needles.vertex(mid + width)
            # Four-sided needle blades have front and back faces: no reliance
            # on transparent cards, textures or glTF double-sided materials.
            peak = needles.vertex(mid + up * size * 0.018)
            slot = rng.choices((0, 1, 2), (1, 5, 2))[0]
            for face in ((a, b, peak), (b, c, peak), (c, d, peak), (d, a, peak), (a, d, c, b)):
                needles.face(face, slot)


for tier in range(9):
    height = 5.3 + tier * 1.37
    spread = 4.0 - tier * 0.32
    count = 4 if tier < 7 else 3
    for branch in range(count):
        angle = branch * math.tau / count + tier * 1.38 + rng.uniform(-0.22, 0.22)
        length = spread * rng.uniform(0.8, 1.12)
        d = Vector((math.cos(angle), math.sin(angle), 0))
        origin = Vector((0, 0, height + rng.uniform(-0.16, 0.16)))
        points = [origin + d * length * t + Vector((0, 0, -0.25 * math.sin(math.pi * t) + 0.40 * t * t)) for t in (0, 0.25, 0.5, 0.75, 1)]
        wood.tube(points, [0.105 * (1 - tier * 0.065), 0.075, 0.045, 0.025, 0.009], sides=6)
        across = Vector((-d.y, d.x, 0))
        for shoot in range(4):
            t = 0.38 + shoot * 0.18
            side = -1 if shoot % 2 else 1
            p = origin + d * length * t + Vector((0, 0, -0.25 * math.sin(math.pi * t) + 0.40 * t * t))
            twig_dir = (d * 0.5 + across * side * 0.7 + Vector((0, 0, 0.18))).normalized()
            tip = p + twig_dir * (0.55 + (8 - tier) * 0.045)
            wood.tube([p, p.lerp(tip, 0.6), tip], [0.022, 0.012, 0.004], sides=5)
            tuft(tip, twig_dir, 0.74 if tier < 6 else 0.59)
        tuft(points[-1], d + Vector((0, 0, 0.25)), 0.80 if tier < 6 else 0.64)

wood.object("pine_trunk_and_boughs", [bark, bark_light], root)
needles.object("soft_pine_needle_tufts", greens, root)

roots = Mesh()
for k in range(4):
    angle = k * math.pi / 2 + 0.40
    points, radii = [], []
    for j in range(25):
        t = j / 24
        distance = 0.30 + 19.7 * t
        sway = 0.36 * math.sin(t * math.tau * 1.35) * math.sin(t * math.pi)
        points.append((math.cos(angle) * distance - math.sin(angle) * sway,
                       math.sin(angle) * distance + math.cos(angle) * sway,
                       0.065 + 0.20 * (1 - t) ** 2))
        radii.append(0.24 * (1 - t) ** 1.4 + 0.014)
    roots.tube(points, radii, sides=7)
    for j, side in ((5, -1), (11, 1), (17, -1)):
        p = Vector(points[j])
        d = Vector((math.cos(angle + side * 0.65), math.sin(angle + side * 0.65), 0))
        roots.tube([p, p + d * 1.2, p + d * 2.8 + Vector((0, 0, -0.03))],
                   [radii[j] * 0.6, 0.045, 0.008], sides=6)
roots.object("roots", [common.material("pale sheltering roots", (0.88, 0.86, 0.77), 0.83)], root)

mound = Mesh()
# An irregular low earth dome, not a ceremonial scene or a display of weapons.
mound.ellipsoid((0, 0, -0.02), (1.18, 1.04, 0.32), segments=28, rings=8)
# Flatten the buried lower half at ground level.
mound.verts = [(x, y, max(0, z)) for x, y, z in mound.verts]
# Remove the collapsed bottom faces, which would otherwise be degenerate.
keep = [(f, s) for f, s in zip(mound.faces, mound.slots) if any(mound.verts[i][2] > 0 for i in f)]
mound.faces, mound.slots = [f for f, _ in keep], [s for _, s in keep]
mound.object("low_earth_mound", [common.material("plain earth mound", (0.24, 0.15, 0.075), 1)], root)

eagle = Mesh()
bird_mats = [common.material("eagle brown feathers", (0.075, 0.045, 0.022), 0.9),
             common.material("eagle feather edges", (0.16, 0.105, 0.055), 0.88),
             common.material("eagle white head and tail", (0.92, 0.90, 0.80), 0.83),
             common.material("eagle beak and feet", (0.66, 0.39, 0.045), 0.66),
             common.material("eagle eyes", (0.007, 0.005, 0.003), 0.4)]
# Bird looks toward +Y, with folded wings and an unmistakable hooked beak.
eagle.ellipsoid((0, 0, 0.32), (0.20, 0.18, 0.32), segments=16, rings=8)
for side in (-1, 1):
    eagle.ellipsoid((side * 0.15, -0.045, 0.32), (0.09, 0.18, 0.25), segments=12)
    for j in range(5):
        eagle.ellipsoid((side * (0.16 + j * 0.007), -0.10 + j * 0.046, 0.20 - j * 0.006),
                        (0.037, 0.055, 0.17), material=j % 2, segments=8, rings=4,
                        rotation=Matrix.Rotation(-0.22, 3, "X"))
    eagle.tube([(side * 0.075, 0.035, 0.16), (side * 0.075, 0.07, 0.035)], 0.022, 3, sides=6)
    for j in range(3):
        x = side * 0.075 + (j - 1) * 0.024
        eagle.tube([(side * 0.075, 0.07, 0.04), (x, 0.14, 0.018), (x, 0.17, 0.026)], [0.013, 0.009, 0.004], 3, sides=5)
    eagle.ellipsoid((side * 0.09, 0.205, 0.645), (0.013, 0.013, 0.012), 4, segments=8, rings=4)
for j in range(5):
    eagle.ellipsoid(((j - 2) * 0.043, -0.19, 0.075), (0.033, 0.18, 0.035), 2, segments=8, rings=4)
eagle.ellipsoid((0, 0.115, 0.61), (0.127, 0.135, 0.14), 2, segments=16, rings=8)
eagle.tube([(0, 0.225, 0.645), (0, 0.31, 0.62), (0, 0.33, 0.565)], [0.055, 0.035, 0.004], 3, sides=7)
bird = eagle.object("eagle", bird_mats, root)
bird.location = (0.035 * math.sin(8), 0.025 * math.sin(14), 17.48)

common.export("tree_of_peace")
