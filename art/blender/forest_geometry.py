"""Single-mesh, single-material trees for instanced shore and river scenery.

Species silhouettes and baked vertex colours carry the detail at 30 m. Each
tree is deterministic, grounded, texture-free, and below 3,000 triangles.
"""
import math
import random

from mathutils import Vector

import common
from geometry import Mesh


def paint(mesh, start, color, rng=None, variation=0.05):
    for i in range(start, len(mesh.verts)):
        shade = rng.uniform(1 - variation, 1 + variation) if rng else 1
        mesh.colors[i] = tuple(min(1, c * shade) for c in color) + (1,)


def colored_tube(mesh, points, radii, color, rng, sides=5):
    start = len(mesh.verts)
    mesh.tube(points, radii, sides=sides)
    paint(mesh, start, color, rng)


def ground(mesh):
    min_z = min(p[2] for p in mesh.verts)
    mesh.verts = [(x, y, z - min_z) for x, y, z in mesh.verts]


def birch():
    mesh, rng = Mesh(), random.Random(411)
    white, dark = (0.82, 0.82, 0.70), (0.065, 0.055, 0.040)
    crowns = []
    for trunk in range(2):
        height = 12.4 - trunk * 1.8
        lean = Vector((0.65 if trunk == 0 else -1.3, -0.35 + trunk * 0.7, 0))
        base = Vector((trunk * 0.16 - 0.08, 0, 0))

        def at(t):
            return base + lean * t ** 1.4 + Vector((0, 0, height * t))

        colored_tube(mesh, [at(i / 12) for i in range(13)],
                     [0.145 * (1 - i / 14) ** 0.8 for i in range(13)], white, rng, sides=7)
        # Short horizontal marks and branch scars sit on the actual leaning
        # trunk. No texture atlas or separate dark material is needed.
        for j in range(42):
            t = rng.uniform(0.035, 0.93)
            center = at(t)
            radius = 0.145 * (1 - t * 12 / 14) ** 0.8
            angle = rng.uniform(0, math.tau)
            arc = rng.uniform(0.24, 0.65)
            dz = rng.uniform(0.008, 0.024)
            indices = []
            for aa, zz in ((angle - arc, -dz), (angle + arc, -dz),
                           (angle + arc, dz), (angle - arc, dz)):
                p = center + Vector(((radius + 0.003) * math.cos(aa),
                                      (radius + 0.003) * math.sin(aa), zz))
                indices.append(mesh.vertex(p, (*dark, 1)))
            mesh.face(indices)
        for j in range(7):
            t = 0.47 + j * 0.070
            angle = j * 2.39996 + trunk
            length = (1.8 - j * 0.10) * rng.uniform(0.85, 1.15)
            direction = Vector((math.cos(angle), math.sin(angle), 0))
            origin = at(t)
            tip = origin + direction * length + Vector((0, 0, 0.8 + j * 0.02))
            colored_tube(mesh, [origin, origin.lerp(tip, 0.58), tip], [0.055, 0.030, 0.008], white, rng)
            scar = origin + direction * (0.145 * (1 - t * 12 / 14) ** 0.8)
            start = len(mesh.verts)
            mesh.ellipsoid(scar, (0.065, 0.065, 0.095), segments=6, rings=3)
            paint(mesh, start, dark)
            crowns.append((tip, direction))
            if j % 2 == 0:
                tip2 = origin.lerp(tip, 0.6) + Vector((-direction.y, direction.x, 0.5)) * 0.8
                colored_tube(mesh, [origin.lerp(tip, 0.6), tip2], [0.025, 0.005], white, rng, sides=4)
                crowns.append((tip2, direction))
        crowns.append((at(1), Vector((0, 0, 1))))
    for center, direction in crowns:
        # Small flattened crowns separated by air. Individual leaves break the
        # edges; the main clumps retain a readable summer canopy from afar.
        start = len(mesh.verts)
        mesh.ellipsoid(center, (0.78, 0.64, 0.54), segments=6, rings=4)
        for i in range(start, len(mesh.verts)):
            x, y, z = mesh.verts[i]
            mesh.verts[i] = (x + rng.uniform(-0.055, 0.055), y + rng.uniform(-0.055, 0.055), z + rng.uniform(-0.05, 0.05))
        paint(mesh, start, (0.34, 0.47, 0.115), rng, 0.18)
        for j in range(3):
            angle = math.tau * j / 3 + rng.random()
            p = Vector(center) + Vector((math.cos(angle) * 0.75, math.sin(angle) * 0.64, rng.uniform(-0.15, 0.22)))
            start = len(mesh.verts)
            mesh.ellipsoid(p, (0.23, 0.15, 0.045), segments=4, rings=2)
            paint(mesh, start, (0.44, 0.55, 0.15), rng, 0.12)
    return mesh


def spruce():
    mesh, rng = Mesh(), random.Random(422)
    bark = (0.19, 0.13, 0.08)
    colored_tube(mesh, [(0, 0, i * 0.65) for i in range(21)],
                 [0.19 * (1 - i / 22) for i in range(21)], bark, rng, sides=6)
    for tier in range(12):
        height = 1.35 + tier * 0.99
        spread = 2.05 * (1 - tier / 13) ** 0.86
        for branch in range(6):
            angle = branch * math.tau / 6 + tier * 1.17 + rng.uniform(-0.16, 0.16)
            direction = Vector((math.cos(angle), math.sin(angle), -0.19)).normalized()
            length = spread * rng.uniform(0.88, 1.1)
            p = Vector((0, 0, height))
            tip = p + direction * length
            colored_tube(mesh, [p, tip], [0.034, 0.006], bark, rng, sides=4)
            start = len(mesh.verts)
            rotation = Vector((0, 0, 1)).rotation_difference(direction).to_matrix()
            mesh.ellipsoid(p + direction * length * 0.44,
                           (0.52, 0.52, 0.72 * length),
                           segments=6, rings=3, rotation=rotation)
            paint(mesh, start, (0.047, 0.115, 0.095), rng, 0.22)
    # A continuous narrow leader closes the crown into a dark spire.
    start = len(mesh.verts)
    mesh.ellipsoid((0, 0, 12.4), (0.30, 0.28, 0.90), segments=6, rings=3)
    paint(mesh, start, (0.055, 0.135, 0.10), rng)
    return mesh


def cedar_fan(mesh, center, direction, size, rng):
    along = Vector(direction).normalized()
    across = Vector((-along.y, along.x, 0)).normalized()
    normal = along.cross(across).normalized()
    center = Vector(center)
    ring = [mesh.vertex(center, (0.23, 0.32, 0.095, 1))]
    for j in range(13):
        angle = -1.12 + j * 2.24 / 12
        radius = size * (1.0 if j % 2 == 0 else 0.80)
        p = center + (along * math.cos(angle) + across * math.sin(angle)) * radius
        color = (0.29, 0.40, 0.115) if j % 2 else (0.36, 0.46, 0.15)
        ring.append(mesh.vertex(p, (*color, 1)))
    a = mesh.vertex(center + along * size * 0.43 + normal * size * 0.025, (0.30, 0.41, 0.13, 1))
    b = mesh.vertex(center + along * size * 0.43 - normal * size * 0.025, (0.23, 0.33, 0.10, 1))
    for j in range(len(ring)):
        k = (j + 1) % len(ring)
        mesh.face((ring[j], ring[k], a))
        mesh.face((ring[k], ring[j], b))


def cedar():
    mesh, rng = Mesh(), random.Random(433)
    bark = (0.30, 0.21, 0.145)
    trunk_points = [(0.22 * math.sin(i * 0.62), 0.13 * math.sin(i * 0.83), i * 0.70) for i in range(14)]
    colored_tube(mesh, trunk_points, [0.23 * (1 - i / 15) for i in range(14)], bark, rng, sides=7)
    # Narrow, raised bark strands run down the lower crooked trunk.
    for j in range(8):
        angle = j * math.tau / 8
        points = [Vector(trunk_points[i]) + Vector((math.cos(angle), math.sin(angle), 0)) * (0.23 * (1 - i / 15) + 0.004)
                  for i in range(7)]
        colored_tube(mesh, points, [0.010] * len(points), (0.41, 0.29, 0.19), rng, sides=3)
    for tier in range(6):
        height = 2.5 + tier * 1.1
        length = 2.0 - tier * 0.22
        for branch in range(4):
            angle = branch * math.pi / 2 + tier * 1.26
            direction = Vector((math.cos(angle), math.sin(angle), 0.28)).normalized()
            p = Vector((0.1 * math.sin(height), 0, height))
            tip = p + direction * length
            colored_tube(mesh, [p, p.lerp(tip, 0.55), tip], [0.055, 0.026, 0.006], bark, rng, sides=4)
            for t, sign in ((0.55, -1), (0.90, 1)):
                d = (direction + Vector((-direction.y, direction.x, 0)) * sign * 0.35).normalized()
                cedar_fan(mesh, p.lerp(tip, t), d, 0.80 if tier < 4 else 0.65, rng)
    for angle in (0, 2.1, 4.2):
        cedar_fan(mesh, (0.2, 0, 8.7), (math.cos(angle) * 0.2, math.sin(angle) * 0.2, 1), 0.65, rng)
    return mesh


def build(species):
    common.reset()
    model_id = "tree_" + species
    root = common.root(model_id)
    mesh = {"birch": birch, "spruce": spruce, "cedar": cedar}[species]()
    ground(mesh)
    mesh.object(model_id + "_mesh", [common.material(model_id + " vertex colours", (1, 1, 1), 0.86, use_vertex_color=True)],
                root, vertex_color=True)
    common.export(model_id)
