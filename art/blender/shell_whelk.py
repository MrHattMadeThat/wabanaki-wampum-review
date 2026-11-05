"""The whelk: a large sea snail. Its twisted centre (the columella) gave the white beads.

A parametric spiral shell: a tube that widens as it winds down from the pointed spire to the
opening, ending in a long canal. About 0.4 m long, a little larger than life so it reads on the bench.
"""
import math
import os
import sys

sys.path.append(os.path.dirname(__file__))
import bpy  # noqa: E402
import common  # noqa: E402

common.reset()
root = common.root("shell_whelk")

TURNS, NT, NP = 4.6, 220, 18
B = 0.16  # growth per radian
R_END = 0.085
verts, faces, cols = [], [], []
theta_end = TURNS * 2 * math.pi
for i in range(NT + 1):
    th = theta_end * i / NT
    R = R_END * math.exp(B * (th - theta_end))
    cx, cy, cz = R * math.cos(th), R * math.sin(th), -1.55 * R  # spire up, widening downward
    rho = 0.78 * R
    for j in range(NP):
        ph = 2 * math.pi * j / NP
        # knobs on the shoulder of each whorl
        knob = 1 + 0.08 * max(0.0, math.cos(ph - 0.6)) * (0.5 + 0.5 * math.cos(th * 9))
        nx, ny = math.cos(th), math.sin(th)
        verts.append((cx + rho * knob * math.cos(ph) * nx, cy + rho * knob * math.cos(ph) * ny, cz + rho * knob * math.sin(ph)))
for i in range(NT):
    for j in range(NP):
        a = i * NP + j
        b = i * NP + (j + 1) % NP
        faces.append((a, b, b + NP, a + NP))

# canal: taper the last ring down into a spout
last = NT * NP
ring_c = [sum(verts[last + j][k] for j in range(NP)) / NP for k in range(3)]
steps = 8
for s in range(1, steps + 1):
    t = s / steps
    for j in range(NP):
        x, y, z = verts[last + j]
        k = 1 - 0.85 * t
        verts.append((ring_c[0] + (x - ring_c[0]) * k * 0.6, ring_c[1] + (y - ring_c[1]) * k * 0.6, ring_c[2] + (z - ring_c[2]) * k * 0.6 - 0.12 * t))
    base = last + (s - 1) * NP
    for j in range(NP):
        a, b = base + j, base + (j + 1) % NP
        faces.append((a, b, b + NP, a + NP))

shell = common.mesh_object("whelk_body", verts, faces, common.material("whelk", (0.89, 0.83, 0.72), 0.45), parent=root)

# lay it on its side, opening down, resting on z=0
shell.rotation_euler = (math.radians(90), 0, math.radians(20))
bpy.context.view_layer.update()
minz = min((shell.matrix_world @ v.co).z for v in shell.data.vertices)
shell.location.z -= minz

common.export("shell_whelk")
