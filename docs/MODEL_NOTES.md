# Priority 1 model delivery

The four original models follow `MODEL_BRIEF.md` and use `common.reset()`,
`common.root()` and `common.export()` like `shell_whelk.py`. No site source
changes are required. The manifest includes the four exported GLBs and retains
the existing whelk entry. Authoring scenes are in `art/blend/`.

## Rebuild and inspect

Run each command from the repository root (sequentially: exports update the same
manifest):

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' -b -P art/blender/canoe_birch.py
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' -b -P art/blender/canoe_plastic.py
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' -b -P art/blender/shell_quahog.py
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' -b -P art/blender/tree_of_peace.py
python art/blender/validate_models.py
```

`geometry.py` contains small mesh-building helpers; `canoe_geometry.py` keeps the
two hulls in the same shape family. Both canoes are 4.8 m long along Blender X.
There are no downloaded assets, textures, procedural shader nodes, or modifiers.
Quahog colours are exported vertex colours; other details use geometry and plain
Principled material slots. Every model stays below 30,000 triangles and 2 MB.

| Model | Exported triangles | GLB size |
|---|---:|---:|
| `canoe_birch` | 29,050 | 585 KiB |
| `canoe_plastic` | 8,852 | 163 KiB |
| `shell_quahog` | 28,832 | 678 KiB |
| `tree_of_peace` | 27,458 | 674 KiB |

For repeatable visual checks of the actual exported file:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' -b -P art/blender/preview_models.py -- canoe_birch
```

Substitute another model id for its views. Images go to `art/previews/`. This
imports the GLB, hides `water_mask`, and renders a temporary studio rig. Canoe
underside, shell exterior, tree crown and eagle detail cameras are included.
The preview camera and lights never enter the delivered source or GLB files.

## Model decisions

- **Birch canoe:** four separate meshes with the exact clickable names and
  string-valued `explode` offsets from the brief. Cream bark and lenticels outside;
  warm bark inside; cedar sheathing, flat ribs, two gunwales and three thwarts;
  spruce-root wraps and seam stitches; dark, slightly glossy gum on all panel
  seams and stems. No nails, metal fittings or decoration. The skin has thickness
  and a closed underside for floating and upside-down views.
- **Plastic canoe:** the same hull family in red, with aluminium rails and three
  thwarts, two dark moulded seats, and a branching dark crack with a stressed
  plastic edge on the Blender -Y side near the middle. The crack is a visible
  surface fissure, not an additional interactive part or animated leak.
- **Water masks:** one connected strip per canoe closes the opening. It is hidden
  in Blender previews, but included in glTF, where the existing loader assigns its
  invisible depth-only material. Keep it parented to the root, outside the four
  exploding parts.
- **Quahog:** two connected, open valves, each with a real inner and outer surface.
  The raised valve faces Blender +Y (the bench camera). The exterior is grey-tan
  with fine concentric growth ridges. Purple stays on the inner margin, fades
  into the chalk-white bowl, and leaves the hinge region pale. Maximum width
  is 0.32 m; the open pair is longer front-to-back than a single valve.
- **Tree of Peace:** straight white-pine trunk, loose horizontal bough tiers,
  uneven branch lengths and tapered needle tufts, with five-needle fascicles at
  the tips. The full tree including eagle is about 18.2 m tall. Four pale main
  roots run about 20 m outward from the trunk in separate directions, with small
  side roots. This follows the stand-in's *radial* root length, rather than
  interpreting 20 m as the entire root spread's diameter. The low mound is plain
  earth. No weapons, people, snakes or ceremony are depicted.
- **Eagle:** a single child mesh with folded wings, white head and tail, hooked
  beak and feet. Its local origin is at its perch, so the site's existing bobbing
  and turning animation moves the bird correctly. `roots` is also a direct child.

Construction details are simplified for readability and the triangle budget;
they are not a reconstruction of a specific historical canoe or shell specimen.
No additional motifs, historical claims or cultural scenes have been invented.

## Validation

Blender 5.2 headless exports and GLB round-trip studio renders were checked.
`validate_models.py` checks the delivered GLB triangle/file budgets, metre-scale
dimensions, ground-level base, root and part names, explode extras, water masks,
quahog vertex colours, eagle placement, and texture-free PBR materials.
`npm run check` and `npm run build` passed.

A Node smoke check also exercised the actual `src/models.js` loader with local
file responses: all four models selected `glb`, preserved their named parts,
cloned successfully, parsed the explode arrays and applied the depth-only water
mask material. Multi-material Blender meshes become named groups of primitives
in three.js; their names, extras and animation pivots remain on those groups.

The in-site browser check remains outstanding: the browser connection timed out,
and desktop Computer Use stopped because it could not determine the browser URL
confidently enough. Preview `?stop=canoe`, `?stop=repair`, `?stop=shells` and
`?stop=tree` to review the final lighting, picking and animation in the site.
