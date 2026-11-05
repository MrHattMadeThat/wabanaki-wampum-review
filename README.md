# The Open Path

A 3D review for the Grade 7 *Wabanaki and Wampum* unit. Students walk a path from Passamaquoddy Bay at
sunrise, up the river by canoe, over the portage, and west to the Tree of Peace at sunset. There are 13 stops
and 32 questions, and every one of the unit quiz's 13 topics is covered. Each answer strings a bead: purple
for the first try (the rare colour), white otherwise.

The path runs east to west on purpose. The Hiawatha Belt reads the same way, like the path of the sun.

## Running it

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:5641. Useful URL options:

- `?stop=belt` jumps straight to a stop (ids are in `src/content.js`)
- `?free` lets you jump to any stop from the bead string, not just the ones reached
- `?q=low` turns off shadows and high-DPI rendering for weak machines

`npm run check` checks the question data. `npm run build` makes `dist/`, a static folder that works from any
file server or GitHub Pages.

## Where things are

| File | What it holds |
|---|---|
| `src/content.js` | Every stop, intro and question, with the why for each wrong answer |
| `src/layout.js` | Where each stop sits in the world, and its camera |
| `src/world.js` | Terrain, river, lake, water, sky, and the sunrise-to-sunset light |
| `src/stations.js` | The 3D stage at each stop and how it reacts to answers |
| `src/props.js` | Procedural stand-in models, including the bead-by-bead Hiawatha Belt |
| `src/models.js` | Loads Blender models listed in `public/models/manifest.json`, or falls back to `props.js` |
| `src/tasks.js` | The question types: choice, select-all, order, match, three-part answer |
| `art/blender/` | Blender Python scripts that build and export models |
| `docs/MODEL_BRIEF.md` | What each model must be, for whoever builds them |

## Sources

The content comes from the unit review, which was built from the class readings *Woven Words*, *The Canoe
That Grew in the Woods* and *Made by Hand, Chosen Together*. Questions are reworded from the quiz on purpose.

Three.js is MIT licensed. All models are original.
