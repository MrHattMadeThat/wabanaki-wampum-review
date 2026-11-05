// Checks the question data for mistakes a browser would only show one stop at a time.
// Run: npm run check
import { STATIONS } from '../src/content.js';
import { ANCHORS } from '../src/layout.js';

// Every 3D part a task may link to, by station (keep in step with `picks` in src/stations.js).
const PICKS = {
  canoe: ['part_skin', 'part_frame', 'part_lashing', 'part_gum'],
  camp: ['tool_snowshoes', 'tool_toboggan', 'tool_leister', 'tool_hooks'],
  shells: ['shell_whelk', 'shell_quahog'],
  belt: ['slot_1', 'slot_2', 'slot_3', 'slot_4', 'slot_5', 'belt_line'],
};

const errors = [];
const ids = new Set();
let tasks = 0;
for (const s of STATIONS) {
  const at = (msg) => errors.push(`${s.id}: ${msg}`);
  if (ids.has(s.id)) at('duplicate id');
  ids.add(s.id);
  if (!ANCHORS[s.id]) at('no anchor in layout.js');
  s.tasks.forEach((t, k) => {
    tasks++;
    const w = (msg) => at(`task ${k + 1} (${t.type}): ${msg}`);
    const pickOk = (p) => !p || (PICKS[s.id] || []).includes(p) || w(`unknown pick ${p}`);
    if (!t.prompt) w('no prompt');
    if (t.type === 'choice') {
      if (t.options.filter((o) => o.correct).length !== 1) w('needs exactly one correct option');
      t.options.forEach((o) => { if (!o.correct && !o.why) w(`wrong option without a why: ${o.text}`); pickOk(o.pick); });
    } else if (t.type === 'multi') {
      if (!t.options.some((o) => o.correct)) w('no correct options');
      t.options.forEach((o) => { if (!o.correct && !o.why) w(`wrong option without a why: ${o.text}`); });
    } else if (t.type === 'order') {
      if (t.items.length < 3) w('too short to order');
    } else if (t.type === 'match') {
      const cs = new Set(t.choices.map((c) => c.id));
      t.items.forEach((it) => { if (!cs.has(it.answer)) w(`answer ${it.answer} is not a choice`); pickOk(it.pick); });
      const used = new Set(t.items.map((it) => it.answer));
      t.choices.forEach((c) => { if (!used.has(c.id) && !c.why) w(`distractor ${c.id} has no why`); });
    } else if (t.type === 'mapdrop') {
      t.items.forEach((it) => { const r = t.regions[it.id]; if (!r?.at || !r.hint) w(`region ${it.id} needs at and hint`); });
    } else if (t.type === 'answer3') {
      if (t.claims.length < 3) w('needs at least three claims');
    } else w('unknown type');
  });
}
const quiz = new Set(STATIONS.flatMap((s) => [s.quiz, ...s.tasks.map((t) => t.quiz)]).filter(Boolean));
const missing = Array.from({ length: 13 }, (_, i) => i + 1).filter((q) => !quiz.has(q));
if (missing.length) errors.push(`quiz questions with no task: ${missing.join(', ')}`);

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`ok: ${STATIONS.length} stops, ${tasks} questions, all 13 quiz questions covered`);
