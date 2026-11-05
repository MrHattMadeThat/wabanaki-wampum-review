"""Shared helpers for the model scripts. Each script builds one model and exports it.

Run one from the repo root:
  "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b -P art/blender/shell_whelk.py

Rules every model keeps (docs/MODEL_BRIEF.md has the full list):
  - metres, Z up in Blender (the exporter turns it into Y up), origin at the base centre
  - long objects run along Blender X
  - the root object is named with the model id; clickable parts keep their part_* / slot_* names
  - export lands in public/models/<id>.glb and is listed in public/models/manifest.json
"""
import json
import os

import bpy

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "public", "models")
SOURCES = os.path.join(ROOT, "art", "blend")


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def material(name, color, roughness=0.6, metallic=0.0, use_vertex_color=False):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if use_vertex_color:
        attr = m.node_tree.nodes.new("ShaderNodeVertexColor")
        m.node_tree.links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
    return m


def mesh_object(name, verts, faces, mat=None, parent=None, smooth=True):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    if mat:
        me.materials.append(mat)
    if parent:
        ob.parent = parent
    return ob


def root(model_id):
    ob = bpy.data.objects.new(model_id, None)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def export(model_id, save_blend=True):
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f"{model_id}.glb")
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_extras=True,  # custom properties (like `explode`) arrive as userData
        export_lights=True,  # the council fire carries its own point light
    )
    if save_blend:
        os.makedirs(SOURCES, exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SOURCES, f"{model_id}.blend"))
    manifest_path = os.path.join(OUT, "manifest.json")
    with open(manifest_path, encoding="utf-8") as f:
        manifest = json.load(f)
    manifest.setdefault("models", {})[model_id] = {"file": f"{model_id}.glb"}
    with open(manifest_path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(manifest, f, indent=2)
        f.write("\n")
    print(f"exported {path} ({os.path.getsize(path) // 1024} KB)")
