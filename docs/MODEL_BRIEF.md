# Model brief: The Open Path

This brief is for whoever builds the 3D models (Codex, or a person in Blender). The site already runs.
Every model below has a **procedural stand-in** in `src/props.js`. A model you export replaces its stand-in
automatically. You don't need to change any site code.

The site is a review game for a Grade 7 New Brunswick social studies unit, *Wabanaki and Wampum*.
Students walk a path from the Bay of Fundy at sunrise, up a river by canoe, over a portage, and west to the
Tree of Peace at sunset. At each stop they answer questions about objects in a 3D scene. The objects
have to be **accurate to the readings** and **readable at a glance**: clear silhouettes, honest materials,
nothing fussy.

## How a model gets into the site

1. Write a Blender Python script in `art/blender/<id>.py`. Copy the pattern in `art/blender/shell_whelk.py`
   and use the helpers in `art/blender/common.py`. Scripts are preferred over hand modelling so a model can
   be rebuilt and tweaked, but a hand-made `.blend` is fine if a script can't do the job.
2. Run it headless from the repo root:
   ```
   "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b -P art/blender/<id>.py
   ```
   `common.export("<id>")` writes `public/models/<id>.glb`, saves `art/blend/<id>.blend`, and lists the model in
   `public/models/manifest.json`.
3. Check it in the site: `npm run dev`, then open `http://localhost:5641/?stop=<stop>` (stop ids in the table
   below). In the browser console, `path.stages[n].group.getObjectByName('<id>').userData.source` should say
   `glb`. If it says `procedural`, the console shows why the file failed.
4. To fall back to the stand-in, delete the model's entry from `manifest.json`.

## Rules for every model

- **Units and axes:** metres. Z up in Blender (the exporter makes it Y up). Origin at the **base centre**,
  so the model sits on the ground at z = 0. Long things (canoes, belt, longhouse, toboggan, leister) run
  along **Blender X**.
- **Names:** the root object is named with the model id. Parts a student can click keep the exact names in
  the table below. The site finds them by name.
- **Materials:** Principled BSDF only: base colour, roughness, metallic, and optionally a normal map. Procedural
  shader nodes don't survive glTF export, so **bake** them to an image or use vertex colours. One texture
  at most 1024 × 1024 per model.
- **Budget:** under 30,000 triangles and under 2 MB per `.glb`. Students use lab PCs with integrated graphics.
- **Style:** stylised-realistic, like a good museum diorama. Clean shapes, believable materials, slightly
  generous scale where small things need to read (noted per model).
- **Original work only.** Build from scratch. Never import or trace a model or texture downloaded from the
  internet.

## Cultural care (read this before modelling)

The unit review sets these rules. They apply to models as much as to questions.

- **No people.** No human figures of any kind until the teacher decides how to handle that with Wabanaki
  guidance.
- **No ceremony.** Nothing that shows or stages the condolence ceremony or any other ceremony. Wampum
  strings lying on a mat are fine; a scene of a ceremony is not.
- **No weapons at the Tree of Peace.** The story says the weapons were buried. Show a mound, not weapons.
- **Tadodaho is not a monster.** Don't model him or snakes.
- **The Hiawatha Belt stays procedural.** `hiawatha_belt` is generated bead by bead from the real layout
  (38 rows × 173 columns = 6,574 beads, one of the two counts in the reading). Don't remodel it.
- When a detail isn't in the reading, keep it plain rather than invent it. If you aren't sure, leave a note in
  `docs/MODEL_NOTES.md` instead of guessing.

## The models

Priority 1 is what students spend the most time looking at. Do those first.

| Pri | id | Stop (`?stop=`) | Size | Clickable parts |
|---|---|---|---|---|
| 1 | `canoe_birch` | `canoe`, `dawn`, `repair`, `messengers`, `portage` | 4.8 m long | `part_skin`, `part_frame`, `part_lashing`, `part_gum` |
| 1 | `canoe_plastic` | `repair` | 4.8 m long | `part_skin`, `part_frame` |
| 1 | `shell_quahog` | `shells` | 0.32 m wide (about 3× life) | the root |
| 1 | `tree_of_peace` | `tree` | about 18 m tall | children `eagle` and `roots` |
| 2 | `shell_whelk` | `shells` | 0.4 m long | the root |
| 2 | `wigwam` | `camp` | 4 m across the base | none |
| 2 | `longhouse` | `belt` | 14 m long, about 6 m tall | none |
| 2 | `tool_snowshoes` | `camp` | a pair, about 0.9 m long each | the root |
| 2 | `tool_toboggan` | `camp` | 2.4 m long | the root |
| 2 | `tool_leister` | `camp` | 2.6 m long | the root |
| 2 | `tool_hooks` | `camp` | three hooks and a short line, about 3× life | the root |
| 3 | `trade_kettle` | `camp` | 0.4 m across | none |
| 3 | `council_fire` | `fire` | 1.6 m across with its stone ring | children `flame`, `flame_core`, `fire_light` (see below) |
| 3 | `bench` | `shells` | 1.6 × 0.7 m, top at 0.59 m | child `grinding_stone` |
| 3 | `basket` | `shells` | 0.56 m across | none |

### `canoe_birch`: the most important model

Every part came from the forest. The student matches each part to its material, and the canoe flies back
together part by part, so **the four parts must be separate objects** with these exact names:

| Object | What it is | Material in the reading |
|---|---|---|
| `part_skin` | the outer hull, in big sheets sewn together | birch bark: cream-white outside with dark horizontal lenticels; warm orange-tan inside |
| `part_frame` | ribs, the inside sheathing strips, two gunwales, three thwarts | split white cedar: pale honey-coloured wood |
| `part_lashing` | spruce root wrapped around the gunwales, and the stitching along the panel seams | spruce root: thin, tan-brown, like coarse thread |
| `part_gum` | the dark seal smeared over every seam and at both ends | spruce gum: nearly black, a little glossy |

- **No nails, no metal, nothing modern.** Students are asked about that directly.
- A Wabanaki river canoe: about 4.8 m long, 0.9 m wide, about 0.35 m deep amidships. The ends rise moderately
  and curve; they are not tall curled-over ends.
- Give each part a custom property `explode` holding a string `"x,y,z"`, the offset in metres (three.js axes:
  Y up) the part moves to in the exploded view. The stand-in uses: `part_skin` `"0,0,0"`, `part_frame` `"0,0.9,0"`,
  `part_lashing` `"0,1.7,0"`, `part_gum` `"0,2.5,0"`. Keep those unless something reads better.
- The canoe also appears **upside down** on a rack at the portage, and floating in the bay. It has to look
  right from below.

### `canoe_plastic`

The store-bought comparison, same size and shape family as the birch canoe. A one-piece moulded hull in a
bright red (`part_skin`). Aluminium gunwales, thwarts and two moulded seats (`part_frame`). Add a visible crack
in the hull on one side near the middle; the stop is about a leak far from any store.

### `shell_quahog`

Purple beads came **only** from a dark purple patch along the inside edge of the quahog shell. That patch is
what the student needs to see.

- Two valves, hinged and open, one tipped up so its inside faces the camera.
- Outside: grey-tan with fine concentric growth ridges.
- Inside: smooth chalky white, with a **deep purple band along the inside rim** (it shades into the white).
- About 3× life size so it reads on the bench.

### `tree_of_peace`

The five nations buried their weapons under a great white pine. Its roots spread out so other nations could
follow them to shelter. An eagle on top watches for danger.

- An eastern white pine: tall straight trunk, branches in loose horizontal tiers, soft tufted needle clumps,
  a slightly uneven crown. About 18 m tall. It must read as **a pine**, not a spruce cone or a round leafy tree.
- `eagle`: a separate child object perched at the very top, wings folded or half-open, looking out. The site bobs
  and turns it a little.
- `roots`: a separate child object. Pale, almost white roots reaching out along the ground in several directions,
  about 20 m long, so they meet the white bead path.
- At the foot of the trunk, a low earth mound. No weapons.

### `shell_whelk`

A pipeline test version is already in (`art/blender/shell_whelk.py`). White beads came from the whelk's
**twisted centre** (the columella). Improve it into a knobbed or channelled whelk, and consider showing the
twisted centre: a second half-shell cut lengthwise beside the whole one, so students can see where white beads
came from. If you add the cut-away, keep both inside the `shell_whelk` root.

### `wigwam`

A Wabanaki birch bark wigwam: a cone of poles crossing above a smoke hole, covered with overlapping sheets of
birch bark sewn and held down with outer poles. A door covering on the side facing +Y in Blender (toward the
camera).

### `longhouse`

A Haudenosaunee longhouse, the setting for reading the belt. A long building with a rounded roof: elm bark
sheets over a frame of bent poles, held with outer poles, a door at each end of the long axis (±X), smoke
holes along the ridge. About 14 m long here (real ones were often much longer).

### Tools at the fall camp

- `tool_snowshoes`: a pair. Bent wooden frames laced with rawhide webbing. They "kept hunters on top of deep snow."
- `tool_toboggan`: "split from rock maple" to carry heavy loads. Thin boards lashed side by side with crossbars,
  the front curled up and back.
- `tool_leister`: a fish spear with **two bendy hardwood prongs** on a long wooden shaft. Keep to that: the
  reading describes only the two prongs.
- `tool_hooks`: hooks of bone or fire-hardened wood, on line braided from basswood fibre. Larger than life.
- `trade_kettle`: a copper or brass kettle with a bail handle. This is the trade good that started the dependence
  the unit warns about, so it should look shiny and foreign next to the handmade tools.

### Small props

- `council_fire`: logs in a ring of stones. Keep three children with these names so the site can animate them:
  `flame` (a soft cone, unlit material), `flame_core` (a smaller brighter cone) and `fire_light` (a point light about 0.9 m up).
- `bench`, `basket`: plain handmade wood and woven splint. The bench's `grinding_stone` is a flat stone the
  beads were ground smooth on.

## What not to change

- `src/` belongs to the site. If a model needs something the code doesn't do yet (a new part name, an
  animation), write it in `docs/MODEL_NOTES.md` and leave the code alone.
- Stage only your own files when you commit: `art/`, `public/models/`, `docs/MODEL_NOTES.md`.
