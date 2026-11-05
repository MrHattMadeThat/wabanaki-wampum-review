"""Forest-built river canoe: bark, split cedar, spruce root, spruce gum.

Run from the repository root with Blender -b -P art/blender/canoe_birch.py.
The four meshes preserve the site's part names and three.js explode offsets.
"""
import os
import sys

sys.path.append(os.path.dirname(__file__))
from canoe_geometry import build  # noqa: E402

build(plastic=False)
