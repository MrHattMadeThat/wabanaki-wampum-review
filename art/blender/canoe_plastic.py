"""Red moulded comparison canoe, aluminium frame, two seats, visible hull crack."""
import os
import sys

sys.path.append(os.path.dirname(__file__))
from canoe_geometry import build  # noqa: E402

build(plastic=True)
