# The Open Path: handoff

A 3D path review site for the Grade 7 NB *Wabanaki and Wampum* unit. Vite + three.js (WebGL, vanilla JS), no
framework, same stack as `../st-george-3d`. Started 2026-11-05. Read `README.md` for the file map.

## Ground rules

- **Audience:** Grade 7, lab PCs with integrated graphics. Short sentences. Keep each model under 30k triangles.
- **Content source:** `C:\Users\fraye\Downloads\Wabanaki_and_Wampum_Unit_Review.docx`. Every fact in
  `src/content.js` must trace to it or to the teacher (marked in a comment, like the bow materials). Don't add
  facts from memory.
- **Teach what was taught.** On 2026-11-06 the teacher also cut the Haudenosaunee nations' places (Eastern
  Door and so on) and the eagle question. On 2026-11-05 the teacher cut the sequencing questions (choosing a chief, the
  Hiawatha story: too hard to follow) and the belt's square-by-square nations (outside the curriculum). Don't
  bring them back.
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
  the belt shapes light for their questions, the messenger canoes leave, the mist on Hiawatha's lake thins.
- On arrival, already-solved tasks are replayed as `task-done` so the stage looks the way it was left.
- Screen layout: the stop's intro is a caption over the scene (bottom left); the panel holds only the question,
  with feedback right under it and Next pinned at the bottom. **No question may scroll inside the panel** at
  1366×650 (a 768px laptop with browser bars), before answering, after a wrong answer, or once solved. Re-check
  that whenever content or styles change. Match questions with picks get numbered labels on the 3D parts
  (`addItemTags` in main.js), and answers can be dragged onto those labels or the parts themselves.
- Ordering questions (none in use since 2026-11-05; the type still works) show two columns inside the panel,
  which widens for them (`body.wide-panel`) so the scene stays visible. A task's optional `lead` is a short
  setup paragraph above the prompt (the 1142 / 1451 question uses it).
- The canoe and the bow share `assembly()` in stations.js: the parts fly apart for the stop's first question
  and return as each is answered. The story stop (2026-11-06) is the lake where Hiawatha strung his shells:
  shell strings on a hide on a flat rock, reeds, a loon, and mist that thins with each of its three answers
  (the eight story stones went with the ordering question). Back / Next and one dot per question sit in the panel header
  (`drawNav` in main.js); Back from a stop's first question travels to the previous stop's last question.
- The opening (2026-11-05): the title waits over the bay before sunrise (`PREDAWN` sky key, stars). Start
  runs `stepIntro` in main.js: the sun comes up while `DAWN_LINES` (content.js) fade in and out, then the camera
  pulls back from `DAWN_VIEW` to the dawn camp and the first question opens. Skip ends it; students with an
  answer saved go straight to their stop. The lines hint at the name but never say "People of the Dawn",
  and the first stop is titled "First light", because question 1 asks what Wabanaki means.
- The dawn stop is a fishing camp on a beach cut by `COVE` (layout.js; the coast is a steep bank elsewhere).
  `flat: false` leaves its ground unlevelled, so each prop is set on the ground where it stands. Smoke
  (`smoke()` in stations.js), gulls and surfacing porpoises are code; the props are stand-ins for Codex's
  priority 4 models.
- Forest: within 55 m of the eastern stops, Codex's `tree_birch` and `tree_spruce` replace the simple
  stand-ins, and `tree_cedar` lines the riverbanks (`plantTrees` in world.js). They are instanced in one group
  per stop so a group off screen is skipped, about 500 trees in all. Everything else, and the whole forest
  under `?q=low`, stays the cheap stand-ins. `?procedural` ignores the manifest, to compare against stand-ins.
- The trail is an earth ribbon laid on the ground mesh as drawn (`groundAt` in world.js, which matches the
  mesh's own triangles), not on the smooth height function, so it never sinks in.
- The Hiawatha Belt pattern is traced from a 1909 photograph and the Haudenosaunee flag drawn from it: a solid
  diamond tree with a stem, inner squares taller than outer ones, the line into the tree lower than the rest.
  Beads are twice as long as wide, so the belt is about 2:1.
- Models: `models.js` loads `public/models/<id>.glb` if `manifest.json` lists it, otherwise builds the stand-in
  from `props.js`. The Hiawatha Belt is always procedural (38 × 173 = 6,574 beads, matching the reading).
- Blender: `art/blender/*.py`, run headless with Blender 5.2 (`common.export()` writes the glb, the .blend
  and the manifest entry). `shell_whelk` is the pipeline proof. Codex's brief is `docs/MODEL_BRIEF.md`.
- Progress is saved in `localStorage` (`open-path-v2`), a convenience only.

## Checking

- `npm run check` validates content.
- Preview: the `open-path` entry in `REPOS/.claude/launch.json` (port 5641). In the browser console,
  `path.arrive(n)` jumps to stop n, and `path.stages[n]` is its stage.
- There is no automated UI test. Verify in the browser and say so.
