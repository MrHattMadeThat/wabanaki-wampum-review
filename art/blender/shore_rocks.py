"""Four rounded pink-grey granite boulders with wet skirts and rockweed.

Each named child owns its weed and has its origin at its own base centre, so
the site can place and rotate the four sizes independently. Child translations
are only a spread-out authoring layout; no additional site code is required.
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
root = common.root("shore_rocks")
materials = [common.material("dry pink granite", (1, 1, 1), 0.88, use_vertex_color=True),
             common.material("wet granite skirt", (1, 1, 1), 0.28, use_vertex_color=True),
             common.material("olive brown rockweed", (1, 1, 1), 0.67, use_vertex_color=True)]

for index, (size, x) in enumerate(((0.5, -3.0), (1.0, -1.9), (1.6, -0.35), (2.5, 1.95)), 1):
    rng = random.Random(510 + index)
    mesh = Mesh()
    NT, NR = 32, 16
    height = size * 0.66

    def color(z, theta):
        grain = 0.025 * math.sin(theta * 19 + z * 71) + rng.uniform(-0.035, 0.035)
        shade = 0.38 if z < height * 0.25 else 1.0
        return ((0.40 + grain) * shade, (0.35 + grain) * shade, (0.32 + grain) * shade, 1)

    bottom = mesh.vertex((0, 0, 0), color(0, 0))
    for i in range(1, NR):
        phi = math.pi * i / NR
        z = height * (1 - math.cos(phi)) / 2
        for j in range(NT):
            theta = math.tau * j / NT
            bulge = 1 + 0.045 * math.sin(theta * 3 + i * 0.3) + 0.025 * math.cos(theta * 5 - phi)
            mesh.vertex((size * 0.5 * math.sin(phi) * math.cos(theta) * bulge,
                         size * 0.41 * math.sin(phi) * math.sin(theta) * bulge, z), color(z, theta))
    top = mesh.vertex((0, 0, height), color(height, 0))
    for j in range(NT):
        k = (j + 1) % NT
        mesh.face((bottom, 1 + k, 1 + j), 1)
        for i in range(NR - 2):
            a, b = 1 + i * NT + j, 1 + i * NT + k
            z = mesh.verts[a][2]
            mesh.face((a, b, b + NT, a + NT), 1 if z < height * 0.25 else 0)
        a = 1 + (NR - 2) * NT
        mesh.face((a + j, a + k, top), 0)
    # Rockweed is attached to, and remains part of, each movable boulder.
    for frond in range(19):
        theta = math.tau * frond / 19 + rng.uniform(-0.13, 0.13)
        z = height * rng.uniform(0.18, 0.29)
        radial = math.sqrt(max(0, 1 - (2 * z / height - 1) ** 2))
        p = Vector((size * 0.50 * radial * math.cos(theta), size * 0.41 * radial * math.sin(theta), z))
        outward = Vector((math.cos(theta), math.sin(theta), 0))
        across = Vector((-math.sin(theta), math.cos(theta), 0))
        points = [p + outward * size * 0.06 * t + across * size * 0.018 * math.sin(t * 6 + theta)
                  + Vector((0, 0, -z * 0.94 * t)) for t in (0, 0.25, 0.5, 0.75, 1)]
        start = len(mesh.verts)
        for i, point in enumerate(points):
            width = size * (0.007 + 0.007 * math.sin(math.pi * i / 4))
            for layer in (-1, 1):
                for side in (-1, 1):
                    mesh.vertex(point + across * side * width + outward * layer * size * 0.001,
                                (0.12, 0.115 + frond % 3 * 0.013, 0.035, 1))
            if i:
                a = start + (i - 1) * 4
                for face in ((a, a + 4, a + 5, a + 1), (a + 2, a + 3, a + 7, a + 6),
                             (a, a + 2, a + 6, a + 4), (a + 1, a + 5, a + 7, a + 3)):
                    mesh.face(tuple(reversed(face)), 2)
        mesh.face(tuple(start + j for j in (2, 3, 1, 0)), 2)
        end = start + 16
        mesh.face(tuple(end + j for j in (0, 1, 3, 2)), 2)
    child = mesh.object("rock_" + str(index), materials, root, vertex_color=True)
    child.location.x = x

common.export("shore_rocks")
