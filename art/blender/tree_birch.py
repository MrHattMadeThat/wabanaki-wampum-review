"""Instanced summer paper birch: pale leaning trunks and an open leafy crown."""
import os
import sys

sys.path.append(os.path.dirname(__file__))
from forest_geometry import build  # noqa: E402

build("birch")
