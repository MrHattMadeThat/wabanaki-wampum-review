"""Validate priority-one GLBs with standard Python; Blender is not required.

python art/blender/validate_models.py
Checks the files actually delivered to the site: budgets, names, extras,
vertex colours, water masks, scale, origin, and legal material/texture use.
"""
import json
import math
from pathlib import Path
import struct

OUT = Path(__file__).resolve().parents[2] / "public" / "models"
IDS = ("canoe_birch", "canoe_plastic", "shell_quahog", "tree_of_peace")


def read_glb(path):
    data = path.read_bytes()
    magic, version, size = struct.unpack_from("<4sII", data)
    assert (magic, version, size) == (b"glTF", 2, len(data)), path
    length, kind = struct.unpack_from("<I4s", data, 12)
    assert kind == b"JSON"
    return json.loads(data[20:20 + length])


def validate(model_id, manifest):
    path = OUT / (model_id + ".glb")
    gltf = read_glb(path)
    nodes = gltf["nodes"]
    names = {n.get("name"): n for n in nodes}
    assert model_id in names, f"missing root: {model_id}"
    assert manifest[model_id]["file"] == path.name
    assert path.stat().st_size < 2_000_000, f"{model_id}: exceeds 2 MB"
    triangles = 0
    for mesh in gltf["meshes"]:
        for primitive in mesh["primitives"]:
            assert primitive.get("mode", 4) == 4, "only triangles expected"
            triangles += gltf["accessors"][primitive["indices"]]["count"] // 3
    assert triangles < 30_000, f"{model_id}: {triangles} triangles"
    assert not gltf.get("textures"), "these models are texture-free"
    assert not gltf.get("cameras"), "preview rig leaked into export"
    for material in gltf["materials"]:
        assert "pbrMetallicRoughness" in material
        assert not material.get("extensions"), "plain Principled materials only"
    # Exported mesh coordinates use Y-up, with local eagle translated to its
    # perch. No scaled/rotated parents are used by these authoring scripts.
    bounds = [[math.inf] * 3, [-math.inf] * 3]
    for node in nodes:
        if "mesh" not in node or node.get("name") == "water_mask":
            continue
        assert "rotation" not in node and "scale" not in node and "matrix" not in node
        translation = node.get("translation", (0, 0, 0))
        for primitive in gltf["meshes"][node["mesh"]]["primitives"]:
            pos = gltf["accessors"][primitive["attributes"]["POSITION"]]
            for k in range(3):
                bounds[0][k] = min(bounds[0][k], pos["min"][k] + translation[k])
                bounds[1][k] = max(bounds[1][k], pos["max"][k] + translation[k])
    assert abs(bounds[0][1]) < 0.002, f"{model_id}: base not on ground: {bounds}"
    dimensions = [bounds[1][i] - bounds[0][i] for i in range(3)]
    if model_id.startswith("canoe_"):
        offsets = {"part_skin": "0,0,0", "part_frame": "0,0.9,0"}
        if model_id == "canoe_birch":
            offsets.update(part_lashing="0,1.7,0", part_gum="0,2.5,0")
        for name, offset in offsets.items():
            assert names[name]["extras"]["explode"] == offset
            assert "mesh" in names[name], f"{name} must be a separate mesh"
        assert "mesh" in names["water_mask"]
        assert 4.79 < dimensions[0] < 4.86 and 0.88 < dimensions[2] < 1.04
    if model_id == "shell_quahog":
        assert 0.31 < dimensions[0] < 0.33
        for name in ("lower_valve", "raised_valve"):
            mesh = gltf["meshes"][names[name]["mesh"]]
            assert all("COLOR_0" in p["attributes"] for p in mesh["primitives"])
    if model_id == "tree_of_peace":
        children = [nodes[i]["name"] for i in names[model_id]["children"]]
        assert "eagle" in children and "roots" in children
        assert 17.5 < dimensions[1] < 18.5
        assert names["eagle"]["translation"][1] > 17
    print(f"{model_id}: {triangles:,} triangles, {path.stat().st_size / 1024:.0f} KiB, "
          f"Y-up bounds {', '.join(f'{x:.3f}' for x in dimensions)} m; OK")


if __name__ == "__main__":
    manifest = json.loads((OUT / "manifest.json").read_text(encoding="utf-8"))["models"]
    for model_id in IDS:
        validate(model_id, manifest)
