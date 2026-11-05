"""Two silver-grey, grain-cracked beach logs; the larger has a broken root stub."""
import math
import os
import random
import sys

sys.path.append(os.path.dirname(__file__))
import common  # noqa: E402
from geometry import Mesh  # noqa: E402
from forest_geometry import paint  # noqa: E402
from mathutils import Vector  # noqa: E402

common.reset()
root = common.root("driftwood")
materials = [common.material("bleached driftwood", (1, 1, 1), 0.94, use_vertex_color=True),
             common.material("dark grain cracks", (0.12, 0.105, 0.08), 1)]
for index, length in ((1, 2.0), (2, 3.0)):
    rng = random.Random(540 + index)
    mesh = Mesh()
    end = length / 2 if index == 1 else length / 2 - 0.34
    beginning = -length / 2
    radius = 0.11 if index == 1 else 0.17
    N, S = 18, 14

    def point(t, a, lift=0):
        x = beginning + (end - beginning) * t
        r = radius * (0.83 + 0.11 * math.cos(t * 5) + 0.055 * math.sin(a * 5 + t * 4))
        return Vector((x, (r + lift) * math.cos(a), radius + (r + lift) * math.sin(a) + 0.018 * math.sin(t * math.pi)))

    for i in range(N + 1):
        for j in range(S):
            p = point(i / N, math.tau * j / S)
            if i in (0, N):
                p.x += rng.uniform(0, 0.024) * (1 if i == 0 else -1)
            shade = rng.uniform(0.48, 0.62)
            mesh.vertex(p, (shade, shade * 0.97, shade * 0.88, 1))
        if i:
            for j in range(S):
                a, b = (i - 1) * S + j, (i - 1) * S + (j + 1) % S
                mesh.face((a, b, b + S, a + S))
    mesh.face(tuple(reversed(range(S))))
    mesh.face(tuple(N * S + j for j in range(S)))
    for j in range(13):
        angle = math.tau * j / 13
        start = len(mesh.verts)
        t0 = rng.uniform(0.01, 0.23)
        t1 = rng.uniform(0.72, 0.99)
        for i in range(9):
            t = t0 + (t1 - t0) * i / 8
            width = 0.022 * math.sin(math.pi * i / 8) + 0.004
            for side in (-1, 1):
                mesh.vertex(point(t, angle + 0.025 * math.sin(t * 13) + side * width, 0.003))
            if i:
                a = start + (i - 1) * 2
                mesh.face((a, a + 1, a + 3, a + 2), 1)
    if index == 2:
        for j in range(4):
            angle = j * math.tau / 4 + 0.4
            p = Vector((end - 0.12, 0, radius))
            tip = Vector((length / 2, math.cos(angle) * 0.30, max(0.025, radius + math.sin(angle) * 0.23)))
            start = len(mesh.verts)
            mesh.tube([p, p.lerp(tip, 0.6), tip], [0.075, 0.043, 0.012], sides=7)
            paint(mesh, start, (0.53, 0.51, 0.45), rng)
    min_z = min(p[2] for p in mesh.verts)
    mesh.verts = [(x, y, z - min_z) for x, y, z in mesh.verts]
    child = mesh.object("drift_" + str(index), materials, root, vertex_color=True)
    child.location.y = -0.45 if index == 1 else 0.45
common.export("driftwood")
