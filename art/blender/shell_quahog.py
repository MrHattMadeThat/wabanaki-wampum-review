"""Open, hinged quahog: purple is confined to the inside margin of each valve.

Both concave interiors face +Y (the bench camera); one valve is tipped up.
Concentric growth ridges are modelled, and the soft purple transition uses
vertex colours so it survives glTF without a texture or procedural shader.
"""
import math
import os
import sys

sys.path.append(os.path.dirname(__file__))
import common  # noqa: E402
from geometry import Mesh  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

common.reset()
root = common.root("shell_quahog")
mat = common.material("quahog natural shell colours", (1, 1, 1), 0.44, use_vertex_color=True)
NR, NT = 56, 64


def blend(a, b, t):
    return tuple(a[k] * (1 - t) + b[k] * t for k in range(3)) + (1,)


def valve(name, tilt, yaw, inverted=False):
    mesh = Mesh()
    rotation = Matrix.Rotation(yaw, 3, "Z") @ Matrix.Rotation(tilt, 3, "X")

    def point(r, theta, inside):
        # Broad oval outline, subtly pinched towards the hinge; no scallop ribs.
        pinch = 1 - 0.14 * max(0, math.sin(theta)) ** 4
        x = 0.16 * r * math.cos(theta) * pinch
        y = -0.13 + 0.13 * r * math.sin(theta)
        z = -0.052 * (1 - r * r)
        if not inside:
            z -= 0.0045 + 0.0012 * math.sin(r * math.tau * 16 + 0.30 * math.sin(theta * 3)) ** 6 * r
        return rotation @ Vector((x, y, -z if inverted else z)) + Vector((0, 0, 0.061))

    centers, starts = [], []
    for inside in (False, True):
        color = (0.45, 0.40, 0.31, 1) if not inside else (0.91, 0.88, 0.80, 1)
        centers.append(mesh.vertex(point(0, 0, inside), color))
        starts.append(len(mesh.verts))
        for i in range(1, NR + 1):
            r = i / NR
            for j in range(NT):
                theta = math.tau * j / NT
                if inside:
                    # The hinge stays chalk white; purple occupies the inner lip
                    # away from it, fading gradually into the smooth white bowl.
                    margin = max(0, min(1, (r - 0.71) / 0.24))
                    margin = margin * margin * (3 - 2 * margin)
                    away_from_hinge = max(0, min(1, (0.83 - math.sin(theta)) / 0.42))
                    color = blend((0.91, 0.88, 0.80), (0.12, 0.025, 0.17), margin * away_from_hinge)
                else:
                    growth = math.sin(r * math.tau * 16 + 0.30 * math.sin(theta * 3))
                    shade = 0.035 * growth + 0.02 * math.sin(theta * 7 + r * 9)
                    color = (0.43 + shade, 0.385 + shade, 0.30 + shade, 1)
                mesh.vertex(point(r, theta, inside), color)
        start = starts[-1]
        for j in range(NT):
            k = (j + 1) % NT
            face = (centers[-1], start + j, start + k)
            mesh.face(face if inside else tuple(reversed(face)))
            for i in range(NR - 1):
                a, b = start + i * NT + j, start + i * NT + k
                face = (a, a + NT, b + NT, b)
                mesh.face(face if inside else tuple(reversed(face)))
    for j in range(NT):
        k = (j + 1) % NT
        a, b = starts[0] + (NR - 1) * NT, starts[1] + (NR - 1) * NT
        mesh.face((a + j, a + k, b + k, b + j))
    if inverted:
        mesh.faces = [tuple(reversed(face)) for face in mesh.faces]
    return mesh.object(name, [mat], root, vertex_color=True)


# Hinge at the back of the lower valve, tipped shell extends up and behind it.
# From +Y both interiors are visible. Total width remains 0.32 m.
valve("lower_valve", math.radians(9), math.pi)
valve("raised_valve", math.radians(-112), math.pi, inverted=True)
hinge = Mesh()
hinge.ellipsoid((0, 0, 0.059), (0.033, 0.009, 0.007), segments=16)
hinge.object("hinge", [common.material("plain shell hinge", (0.52, 0.45, 0.34), 0.72)], root)

min_z = min(v.co.z for ob in root.children for v in ob.data.vertices)
for ob in root.children:
    for v in ob.data.vertices:
        v.co.z -= min_z
common.export("shell_quahog")
