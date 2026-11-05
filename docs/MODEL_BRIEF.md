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
| 2 | `bow_set` | `camp` | a 1.3 m bow and an arrow hung on a rack | `bow_wood`, `bow_sinew`, `bow_flint`, `bow_gum` |
| 3 | `tool_snowshoes` | `camp` | a pair, about 0.9 m long each | none (scenery) |
| 3 | `trade_kettle` | `camp` | 0.4 m across | none |
| 3 | `council_fire` | `fire` | 1.6 m across with its stone ring | children `flame`, `flame_core`, `fire_light` (see below) |
| 3 | `bench` | `shells` | 1.6 × 0.7 m, top at 0.59 m | child `grinding_stone` |
| 3 | `basket` | `shells` | 0.56 m across | none |
| 4 | `tree_birch` | everywhere (scattered) | 9–14 m tall | none |
| 4 | `tree_spruce` | everywhere (scattered) | 10–16 m tall | none |
| 4 | `tree_cedar` | river stops (scattered) | 7–10 m tall | none |
| 4 | `shore_rocks` | `dawn`, `repair` | four boulders, 0.5–2.5 m | children `rock_1`…`rock_4` |
| 4 | `driftwood` | `dawn` | two logs, 2–3 m | children `drift_1`, `drift_2` |
| 4 | `canoe_paddle` | `dawn`, `canoe`, `portage` | 1.5 m long | none |
| 4 | `fish_rack` | `dawn` | 2.5 m wide, 1.6 m tall | none |
| 4 | `porpoise` | `dawn` (out in the bay) | 1.6 m long | none |

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
- Add one more object, `water_mask`: a single flat-ish strip of faces closing the canoe's opening from gunwale
  to gunwale, bow to stern. The site makes it invisible and uses it to stop the water surface showing through the
  floor of a floating canoe. `canoe_plastic` needs one too.

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

### The fall camp

Changed 2026-11-05: the camp question is now about building a bow and arrow, so the leister, hooks and
toboggan are no longer placed. Their stand-ins stay in `props.js`; don't build them.

- `bow_set`: a bow and one arrow hung on a two-post rack, set up like the canoe. It has four named parts: the
  wood stays put and the others fly apart for the question (`explode` as an "x,y,z" custom property, in metres,
  in the rack's plane). The rack faces the camera (Blender +Y). The bow's arc is on top with the string under
  it, and the arrow hangs under that, pointing +X. Copy the layout of `buildBow` in `src/props.js`.
  - `bow_wood`: the bow stave, the arrow shaft and the fletching (the feathers ride with the shaft). Explode 0,0,0.
  - `bow_sinew`: the bowstring, sinew from a deer's tendon. The site moves it 0.36 left and 0.3 up (set in
    stations.js, so its label clears the bow's), whatever the file says.
  - `bow_flint`: a flaked flint arrowhead. Explode about 0.2 right and 0.2 up.
  - `bow_gum`: the dark spruce gum gluing the head into the shaft. Explode about 0.16 right and 0.24 down.
  - The materials come from the teacher, not the reading: wood, deer sinew, flint, spruce gum. Nothing iron.
- `tool_snowshoes`: scenery now. A pair of bent wooden frames laced with rawhide webbing.
- `trade_kettle`: a copper or brass kettle with a bail handle. This is the trade good that started the dependence
  the unit warns about, so it should look shiny and foreign next to the handmade tools.

### Small props

- `council_fire`: logs in a ring of stones. Keep three children with these names so the site can animate them:
  `flame` (a soft cone, unlit material), `flame_core` (a smaller brighter cone) and `fire_light` (a point light about 0.9 m up).
- `bench`, `basket`: plain handmade wood and woven splint. The bench's `grinding_stone` is a flat stone the
  beads were ground smooth on.

### Priority 4: the Dawnland shore and the forest (after `bow_set`)

Added 2026-11-05. The opening is being redesigned: a sunrise over the Bay of Fundy, then the camera finds a
canoe pulled up on a real shoreline with a summer fishing camp, instead of a canoe floating alone at sea.
The teacher is still choosing how the opening plays, but every version uses these models, so they are safe
to build now. The sky, the sunrise, smoke, birds and water are site code (Claude), not models.

**Trees.** The site scatters thousands of trees, so these are instanced and must be cheap: **under 3,000
triangles each**, one material each if you can (vertex colours for bark vs leaves are fine). Origin at the
base of the trunk. The three are the canoe trees from the reading, so a student should be able to tell them
apart at 30 m.
- `tree_birch`: white or paper birch, the canoe's skin. Chalk-white trunk with dark horizontal marks
  (lenticels) and black patches where branches left, often leaning, one to three trunks from the same base.
  Open, airy crown of small yellow-green leaves. Summer, not autumn.
- `tree_spruce`: red or black spruce, the roots and gum. A narrow dark blue-green spire, branches drooping
  slightly, the trunk barely showing.
- `tree_cedar`: eastern white cedar, the frame. A ragged, often crooked trunk with stringy reddish-grey bark,
  flat fan-shaped sprays of yellow-green foliage. It grows on riverbanks, so it is placed along the river.

**The shore.** New Brunswick's Fundy coast: big tides, so rocks show a dark wet band and a skirt of seaweed
low down.
- `shore_rocks`: four granite boulders as children `rock_1`…`rock_4` (0.5, 1, 1.6 and 2.5 m), grey with a
  pink cast, rounded by the sea, not sharp. Bottom 20–30 % darker and wetter, with olive-brown rockweed hanging
  off the lower edge. The site places and rotates each child on its own.
- `driftwood`: two weathered logs as children `drift_1` (2 m) and `drift_2` (3 m, with a stub of root). Bleached
  silver-grey, cracked along the grain.
- `canoe_paddle`: a single-blade wooden paddle, 1.5 m, long narrow blade, plain wood with a slight sheen. No
  painted designs (the reading doesn't describe any). It lies across the beached canoe.
- `fish_rack`: a drying rack of peeled poles: two tripods and a crossbar, 2.5 m wide, with five or six split
  fish hanging plainly. Families spent the summer in fishing villages on Passamaquoddy Bay; this says so
  without people.
- `porpoise`: a harbour porpoise, the everyday food the reading mentions. Small (1.6 m), dark grey back fading
  to pale belly, small triangular dorsal fin, blunt head with no beak. One gentle arched pose, nose along +X;
  the site moves it up through the water and back down. **No harpoons and no hunting scene.**

`wigwam` (priority 2 above) is also needed at the shore camp, so it moves up: build it right after these.

## What not to change

- `src/` belongs to the site. If a model needs something the code doesn't do yet (a new part name, an
  animation), write it in `docs/MODEL_NOTES.md` and leave the code alone.
- Stage only your own files when you commit: `art/`, `public/models/`, `docs/MODEL_NOTES.md`.
