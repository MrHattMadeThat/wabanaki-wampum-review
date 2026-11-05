"""Render the exported GLBs, not the authoring scene, for repeatable visual QA.

Blender -b -P art/blender/preview_models.py -- canoe_birch
Writes art/previews/<id>.png (also underside / crown / eagle detail views).
The water mask is hidden just as it is in the site. No preview rig is saved
into the .blend sources or exported into the production models.
"""
import math
import os
import sys

sys.path.append(os.path.dirname(__file__))
import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402
import common  # noqa: E402

model_id = sys.argv[sys.argv.index("--") + 1]
common.reset()
bpy.ops.import_scene.gltf(filepath=os.path.join(common.OUT, model_id + ".glb"))
for ob in bpy.context.scene.objects:
    if ob.name == "water_mask":
        ob.hide_render = True
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 24
scene.cycles.use_denoising = True
scene.render.resolution_x = 960
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.render.threads_mode = "FIXED"
scene.render.threads = 8
scene.world = bpy.data.worlds.new("preview backdrop")
scene.world.use_nodes = True
scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.18, 0.20, 0.23, 1)
scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.4
scene.view_settings.view_transform = "AgX"
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False

bpy.ops.object.camera_add()
camera = bpy.context.object
camera.data.type = "ORTHO"
scene.camera = camera


def render(suffix, eye, target, scale):
    camera.location = eye
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.ortho_scale = scale
    # Recreate a scale-appropriate softbox and rim light for each view.
    for ob in list(scene.objects):
        if ob.type == "LIGHT":
            bpy.data.objects.remove(ob, do_unlink=True)
    for direction, power in (((-0.6, 0.6, 1.3), 160), ((0.6, -0.6, 0.8), 100)):
        bpy.ops.object.light_add(type="AREA", location=Vector(target) + Vector(direction) * scale)
        lamp = bpy.context.object
        lamp.data.energy = power * scale * scale / 5
        lamp.data.shape = "DISK"
        lamp.data.size = scale
        lamp.rotation_euler = (Vector(target) - lamp.location).to_track_quat("-Z", "Y").to_euler()
    out = os.path.join(common.ROOT, "art", "previews")
    os.makedirs(out, exist_ok=True)
    scene.render.filepath = os.path.join(out, model_id + suffix + ".png")
    bpy.ops.render.render(write_still=True)


if model_id.startswith("canoe_"):
    render("", (3.4, -5.8, 4.3), (0, 0, 0.22), 5.8)
    if model_id == "canoe_birch":
        render("_underside", (1.8, -4.8, -3.3), (0, 0, 0.25), 5.8)
elif model_id == "shell_quahog":
    render("", (0.38, 0.70, 0.50), (0, 0.02, 0.16), 0.67)
    render("_outside", (-0.4, -0.65, 0.40), (0, 0.02, 0.16), 0.67)
elif model_id == "tree_of_peace":
    render("", (29, 40, 26), (0, 0, 6.5), 45)
    render("_crown", (16, 23, 17), (0, 0, 11.1), 19.5)
    render("_eagle", (1.8, 2.8, 18.8), (0, 0.05, 17.85), 1.2)
else:
    raise ValueError("No preview camera for " + model_id)
