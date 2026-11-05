"""Plain peeled-pole rack: two tripods, a crossbar and six split drying fish."""
import math
import os
import sys

sys.path.append(os.path.dirname(__file__))
import common  # noqa: E402
from geometry import Mesh  # noqa: E402
from mathutils import Vector  # noqa: E402

common.reset()
root = common.root("fish_rack")
wood = common.material("peeled rack poles", (0.57, 0.39, 0.20), 0.9)
cord = common.material("plain rack suspension", (0.40, 0.31, 0.18), 0.93)
fish_materials = [common.material("dry pale fish flesh", (0.64, 0.51, 0.31), 0.9),
                  common.material("dry silver brown fish skin", (0.32, 0.31, 0.25), 0.85),
                  common.material("fish centre ridge", (0.76, 0.65, 0.44), 0.91)]
poles = Mesh()
for side in (-1, 1):
    x = side * 1.02
    for dx, y in ((-0.22, -0.38), (0.22, -0.32), (0, 0.43)):
        poles.tube([(x + dx, y, 0.025), (x + dx * 0.3, y * 0.3, 1.1), (x, 0, 1.60)],
                   [0.035, 0.029, 0.024], sides=8)
poles.tube([(-1.25, 0, 1.50), (1.25, 0, 1.50)], 0.033, sides=10)
poles.object("peeled_poles", [wood], root)
suspension, fish = Mesh(), Mesh()
for index in range(6):
    x = -0.90 + index * 0.36
    ztop = 1.42
    length = 0.65 + 0.065 * math.sin(index * 1.7)
    # Tail at the bar, broad plain split body below. No species-specific
    # decoration or human activity is invented for this background prop.
    outline = [(0, 0), (-0.046, 0.025), (-0.026, -0.065), (-0.088, -0.19),
               (-0.10, -0.42), (-0.070, -0.60), (0, -0.65), (0.070, -0.60),
               (0.10, -0.42), (0.088, -0.19), (0.026, -0.065), (0.046, 0.025)]
    ring = [fish.vertex((x + xx, 0, ztop + zz * length / 0.65)) for xx, zz in outline]
    front = fish.vertex((x, -0.013, ztop - length * 0.51))
    back = fish.vertex((x, 0.013, ztop - length * 0.51))
    for j in range(len(ring)):
        k = (j + 1) % len(ring)
        fish.face((ring[j], ring[k], front), 0)
        fish.face((ring[k], ring[j], back), 1)
    fish.tube([(x, -0.014, ztop - 0.12), (x, -0.018, ztop - length + 0.07)], [0.005, 0.003], 2, sides=5)
    # Shallow paired grooves make the split surface legible without gore.
    for j in range(6):
        z = ztop - 0.18 - j * length * 0.065
        for side in (-1, 1):
            fish.tube([(x, -0.017, z), (x + side * 0.06, -0.009, z - 0.03)], 0.0018, 2, sides=3)
    suspension.tube([(x, 0, ztop), (x, -0.014, 1.50), (x, 0.014, 1.52), (x, 0.022, ztop)], 0.004, sides=5)
suspension.object("plain_suspension_loops", [cord], root)
fish.object("six_split_fish", fish_materials, root, smooth=False)
min_z = min(v.co.z for ob in root.children for v in ob.data.vertices)
for ob in root.children:
    for vertex in ob.data.vertices:
        vertex.co.z -= min_z
common.export("fish_rack")
