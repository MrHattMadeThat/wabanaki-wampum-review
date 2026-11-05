"""Plain 1.5 m single-blade wooden paddle, long axis X, no painted designs."""
import math
import os
import sys

sys.path.append(os.path.dirname(__file__))
import common  # noqa: E402
from geometry import Mesh  # noqa: E402

common.reset()
root = common.root("canoe_paddle")
mesh = Mesh()
materials = [common.material("paddle wood", (0.48, 0.275, 0.105), 0.36),
             common.material("paddle edge grain", (0.34, 0.17, 0.055), 0.44)]
mesh.tube([(-0.72, 0, 0.021), (-0.35, 0, 0.021), (0.27, 0, 0.021)], [0.017, 0.014, 0.018], sides=12)
mesh.ellipsoid((-0.72, 0, 0.021), (0.030, 0.047, 0.020), segments=12, rings=6)
# Rounded blade perimeter, with a raised central ridge on both faces.
outline = [(0.10, 0), (0.19, -0.034), (0.33, -0.066), (0.55, -0.082),
           (0.69, -0.071), (0.75, -0.034), (0.75, 0.034), (0.69, 0.071),
           (0.55, 0.082), (0.33, 0.066), (0.19, 0.034)]
edge = [mesh.vertex((x, y, 0.021)) for x, y in outline]
for side in (-1, 1):
    ridge = mesh.vertex((0.43, 0, 0.021 + side * 0.014))
    for j in range(len(edge)):
        k = (j + 1) % len(edge)
        face = (edge[j], edge[k], ridge)
        mesh.face(face if side == 1 else tuple(reversed(face)), 0 if j % 3 else 1)
min_z = min(p[2] for p in mesh.verts)
mesh.verts = [(x, y, z - min_z) for x, y, z in mesh.verts]
mesh.object("plain_paddle", materials, root)
common.export("canoe_paddle")
