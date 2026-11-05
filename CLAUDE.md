# The Open Path: handoff

A 3D path review site for the Grade 7 NB *Wabanaki and Wampum* unit. Vite + three.js (WebGL, vanilla JS), no
framework, same stack as `../st-george-3d`. Started 2026-11-05. Read `README.md` for the file map.

## Ground rules

- **Audience:** Grade 7, lab PCs with integrated graphics. Short sentences. Keep each model under 30k triangles.
- **Content source:** `C:\Users\fraye\Downloads\Wabanaki_and_Wampum_Unit_Review.docx`. Every fact in
  `src/content.js` must trace to it. Don't add facts from memory.
- **Reword, don't copy** the quiz. Students should learn the idea, not memorise the wording.
- **Ceremony is something to know, not something to play.** No one performs the condolence ceremony, and it
  earns no points of its own; sequencing the story is fine. No people models yet. Tadodaho is never a boss
  fight. No weapons at the Tree of Peace.
- **Left out on purpose** (from the review's own notes): the Confederacy date (around 1680), the moving
  council fire, wampum as money (the teacher hasn't settled quiz question 9 on this, so money is neither a
  right nor a wrong answer anywhere), and the Kennebec (the five Wabanaki nations follow Card A: Mi'kmaq,
  Wolastoqiyik, Peskotomuhkati, Penobscot, Abenaki).
- Both readings' canoe wording counts: white or paper birch, spruce or pine gum.

## How it fits together

- `content.js` is data only. Each task's `pick` names a 3D part in that stop's stage (`stations.js`).
  `scripts/check-content.mjs` keeps a copy of the pick lists, so update both.
- `tasks.js` renders one task and emits events (`select`, `item-correct`, `option`); `main.js` adds
  `task-start` / `task-done`. Each stage's `react()` turns those into scene changes: the canoe reassembles,
  belt slots get nation labels, the messenger canoes leave, the story stones light.
- On arrival, already-solved tasks are replayed as `task-done` so the stage looks the way it was left.
- Models: `models.js` loads `public/models/<id>.glb` if `manifest.json` lists it, otherwise builds the stand-in
  from `props.js`. The Hiawatha Belt is always procedural (38 × 173 = 6,574 beads, matching the reading).
- Blender: `art/blender/*.py`, run headless with Blender 5.2 (`common.export()` writes the glb, the .blend
  and the manifest entry). `shell_whelk` is the pipeline proof. Codex's brief is `docs/MODEL_BRIEF.md`.
- Progress is saved in `localStorage` (`open-path-v1`), a convenience only.

## Checking

- `npm run check` validates content.
- Preview: the `open-path` entry in `REPOS/.claude/launch.json` (port 5641). In the browser console,
  `path.arrive(n)` jumps to stop n, and `path.stages[n]` is its stage.
- There is no automated UI test. Verify in the browser and say so.
