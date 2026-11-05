"""Harbour porpoise, 1.6 m, nose +X, gently arched swimming pose.

Blunt head without a beak, triangular dorsal, small swept pectoral fins and
horizontal tail flukes. Original geometry and vertex colours only. No hunting
equipment or scene. Base-centre origin follows the model brief.
"""
import math
import os
import sys

sys.path.append(os.path.dirname(__file__))
import common  # noqa: E402
import bmesh  # noqa: E402
from geometry import Mesh  # noqa: E402

common.reset()
root = common.root("porpoise")
mesh = Mesh()
body_material = common.material("porpoise natural shading", (1, 1, 1), 0.42, use_vertex_color=True)
eye_material = common.material("porpoise eyes", (0.005, 0.006, 0.007), 0.3)


def shade(a):
    # a=+pi/2 is the dark back, a=-pi/2 the pale belly.
    t = max(0, min(1, (math.sin(a) + 0.40) / 1.1))
    t = t * t * (3 - 2 * t)
    return tuple((0.64, 0.65, 0.61)[i] * (1 - t) + (0.065, 0.085, 0.095)[i] * t for i in range(3)) + (1,)


# Cross-sections avoid the pointed dolphin beak that a stretched sphere makes.
sections = [(-0.68, 0.025, 0.025), (-0.60, 0.053, 0.050), (-0.45, 0.095, 0.10),
            (-0.22, 0.145, 0.17), (0.02, 0.175, 0.205), (0.25, 0.17, 0.195),
            (0.44, 0.13, 0.16), (0.60, 0.094, 0.115), (0.69, 0.070, 0.085),
            (0.74, 0.048, 0.057), (0.76, 0.028, 0.040)]
S = 28
for i, (x, ry, rz) in enumerate(sections):
    center_z = 0.27 + 0.055 * (1 - (x / 0.8) ** 2)
    for j in range(S):
        a = math.tau * j / S
        mesh.vertex((x, ry * math.cos(a), center_z + rz * math.sin(a)), shade(a))
    if i:
        for j in range(S):
            a, b = (i - 1) * S + j, (i - 1) * S + (j + 1) % S
            mesh.face((a, b, b + S, a + S))
mesh.face(tuple(reversed(range(S))))
mesh.face(tuple((len(sections) - 1) * S + j for j in range(S)))


def fin(outline, center, normal, thickness, color):
    ring = [mesh.vertex(p, (*color, 1)) for p in outline]
    for side in (-1, 1):
        c = mesh.vertex(tuple(center[i] + normal[i] * thickness * side for i in range(3)), (*color, 1))
        for j in range(len(ring)):
            k = (j + 1) % len(ring)
            face = (ring[j], ring[k], c)
            mesh.face(face if side == 1 else tuple(reversed(face)))


fin([(0.09, 0, 0.495), (-0.105, 0, 0.66), (-0.19, 0, 0.54), (-0.27, 0, 0.48)],
    (-0.10, 0, 0.535), (0, 1, 0), 0.012, (0.07, 0.09, 0.10))
for side in (-1, 1):
    fin([(0.32, side * 0.105, 0.24), (0.20, side * 0.23, 0.14),
         (0.015, side * 0.30, 0.095), (0.12, side * 0.14, 0.21)],
        (0.17, side * 0.18, 0.18), (0, 0, 1), 0.009, (0.18, 0.21, 0.21))
fin([(-0.63, 0, 0.29), (-0.69, 0.24, 0.29), (-0.84, 0.29, 0.275),
     (-0.78, 0.065, 0.27), (-0.75, 0, 0.27), (-0.78, -0.065, 0.27),
     (-0.84, -0.29, 0.275), (-0.69, -0.24, 0.29)],
    (-0.73, 0, 0.28), (0, 0, 1), 0.012, (0.08, 0.105, 0.11))
min_z = min(p[2] for p in mesh.verts)
mesh.verts = [(x + 0.04, y, z - min_z) for x, y, z in mesh.verts]
body = mesh.object("porpoise_body_and_fins", [body_material], root, vertex_color=True)
# Each fin is a closed, thin volume; consistently orient both faces even where
# the flukes' indented outline bends around the tail notch.
bm = bmesh.new()
bm.from_mesh(body.data)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.to_mesh(body.data)
bm.free()
eyes = Mesh()
for side in (-1, 1):
    eyes.ellipsoid((0.655, side * 0.084, 0.330 - min_z), (0.008, 0.004, 0.007), segments=8, rings=4)
eyes.object("small_eyes", [eye_material], root)
common.export("porpoise")
