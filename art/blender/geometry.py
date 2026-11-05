"""Small, texture-free mesh builders shared by the priority-one models.

All detail is geometry, material slots, or exported vertex colour. No shader
noise, external assets, modifiers, or context-dependent operator selections.
"""
import math

from mathutils import Vector

import common


class Mesh:
    def __init__(self):
        self.verts, self.faces, self.slots, self.colors = [], [], [], []

    def vertex(self, point, color=(1, 1, 1, 1)):
        self.verts.append(tuple(point))
        self.colors.append(tuple(color))
        return len(self.verts) - 1

    def face(self, indices, material=0):
        self.faces.append(tuple(indices))
        self.slots.append(material)

    def tube(self, points, radius, material=0, sides=6, caps=True):
        """Parallel-transport frames keep bent tubes from twisting at the poles."""
        points = [Vector(p) for p in points]
        start = len(self.verts)
        normal = None
        for i, p in enumerate(points):
            tangent = (points[min(i + 1, len(points) - 1)] - points[max(i - 1, 0)]).normalized()
            if normal is None:
                axis = Vector((0, 0, 1)) if abs(tangent.z) < 0.9 else Vector((0, 1, 0))
                normal = tangent.cross(axis).normalized()
            else:
                normal = (normal - tangent * normal.dot(tangent)).normalized()
            other = tangent.cross(normal)
            r = radius[i] if isinstance(radius, (list, tuple)) else radius
            for j in range(sides):
                a = j * math.tau / sides
                self.vertex(p + r * (normal * math.cos(a) + other * math.sin(a)))
            if i:
                for j in range(sides):
                    a = start + (i - 1) * sides + j
                    b = start + (i - 1) * sides + (j + 1) % sides
                    self.face((a, b, b + sides, a + sides), material)
        if caps:
            self.face(tuple(start + j for j in reversed(range(sides))), material)
            end = start + (len(points) - 1) * sides
            self.face(tuple(end + j for j in range(sides)), material)

    def ellipsoid(self, center, scale, material=0, segments=12, rings=6, rotation=None):
        center = Vector(center)

        def point(x, y, z):
            p = Vector((x * scale[0], y * scale[1], z * scale[2]))
            return center + (rotation @ p if rotation is not None else p)

        bottom = self.vertex(point(0, 0, -1))
        start = len(self.verts)
        for i in range(1, rings):
            a = math.pi * i / rings
            for j in range(segments):
                b = math.tau * j / segments
                self.vertex(point(math.sin(a) * math.cos(b), math.sin(a) * math.sin(b), -math.cos(a)))
        top = self.vertex(point(0, 0, 1))
        for j in range(segments):
            k = (j + 1) % segments
            self.face((bottom, start + k, start + j), material)
            for i in range(rings - 2):
                a, b = start + i * segments + j, start + i * segments + k
                self.face((a, b, b + segments, a + segments), material)
            a = start + (rings - 2) * segments
            self.face((a + j, a + k, top), material)

    def box(self, center, size, material=0):
        start = len(self.verts)
        for z in (-1, 1):
            for y in (-1, 1):
                for x in (-1, 1):
                    self.vertex(tuple(center[k] + v * size[k] / 2 for k, v in enumerate((x, y, z))))
        for f in ((0, 2, 3, 1), (4, 5, 7, 6), (0, 1, 5, 4), (2, 6, 7, 3), (0, 4, 6, 2), (1, 3, 7, 5)):
            self.face(tuple(start + i for i in f), material)

    def object(self, name, materials, parent=None, vertex_color=False, smooth=True):
        ob = common.mesh_object(name, self.verts, self.faces, parent=parent, smooth=smooth)
        for mat in materials:
            ob.data.materials.append(mat)
        for polygon, slot in zip(ob.data.polygons, self.slots):
            polygon.material_index = slot
        if vertex_color:
            colors = ob.data.color_attributes.new(name="Color", type="FLOAT_COLOR", domain="POINT")
            for datum, color in zip(colors.data, self.colors):
                datum.color = color
            ob.data.color_attributes.active_color = colors
        return ob
