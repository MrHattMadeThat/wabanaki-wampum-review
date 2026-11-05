// The question panel. One task at a time: renderTask(host, task, hooks) draws it into `host` and returns a
// controller with pick(name), which main.js calls when a 3D part or its scene label is clicked.
//
// hooks.emit(event) tells the stage (and the scene labels) what happened:
//   { type: 'select', pick }                    an item linked to a 3D part is selected (pick may be null)
//   { type: 'item-correct', pick, item, answer } a match item was answered correctly
//   { type: 'option', pick }                    a choice option linked to a 3D part was clicked
// hooks.dropTarget(x, y) returns the 3D part name under a screen point, for answers dragged onto the scene.
// hooks.done({ firstTry }) when the task is solved.
//
// Every task has the same two parts: .q-body (the question) and .q-foot (feedback and the explanation),
// which sits at the bottom of the panel next to the Next button, so nothing pushes the answers out of view.

import { MAP } from './map-data.js';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const button = (cls, text) => {
  const b = el('button', cls, text);
  b.type = 'button';
  return b;
};

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Feedback and explanation live in the foot.
function footer(foot) {
  const say = el('p', 'feedback');
  say.setAttribute('role', 'status');
  foot.append(say);
  return {
    say(text, kind = '') { say.textContent = text; say.className = `feedback ${kind}`; },
    clear() { say.textContent = ''; say.className = 'feedback'; },
    // the win and the why in one box, so a solved question doesn't grow
    solved(headline, text) {
      say.textContent = ''; say.className = 'feedback';
      const box = el('p', 'explain');
      box.append(el('strong', null, headline + ' '), document.createTextNode(text || ''));
      foot.append(box);
    },
  };
}

// Pointer dragging for answer chips. A press that doesn't move is a tap.
// onMove(x, y) while dragging, onDrop(x, y) at the end, onTap() for a tap.
function draggable(chip, label, { onMove, onDrop, onTap }) {
  let start = null, ghost = null;
  chip.style.touchAction = 'none';
  chip.addEventListener('pointerdown', (e) => {
    if (chip.disabled) return;
    start = [e.clientX, e.clientY];
    chip.setPointerCapture(e.pointerId);
  });
  chip.addEventListener('pointermove', (e) => {
    if (!start) return;
    if (!ghost && Math.hypot(e.clientX - start[0], e.clientY - start[1]) > 6) {
      ghost = el('div', 'ghost', label);
      document.body.append(ghost);
      chip.classList.add('dragging');
    }
    if (ghost) {
      ghost.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      onMove?.(e.clientX, e.clientY);
    }
  });
  const end = (e, cancelled) => {
    if (!start) return;
    start = null;
    chip.classList.remove('dragging');
    if (ghost) {
      ghost.remove();
      ghost = null;
      if (!cancelled) onDrop(e.clientX, e.clientY);
      else onMove?.(-1, -1);
    } else if (!cancelled) onTap();
  };
  chip.addEventListener('pointerup', (e) => end(e, false));
  chip.addEventListener('pointercancel', (e) => end(e, true));
  // keyboard: Enter/Space is a tap
  chip.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap(); } });
}

// Some tasks put things outside the panel (the map card). They register a cleanup here.
let cleanup = null;
export function clearTask() {
  cleanup?.();
  cleanup = null;
}

export function renderTask(host, task, hooks) {
  clearTask();
  host.replaceChildren();
  const body = el('div', 'q-body');
  const foot = el('div', 'q-foot');
  if (task.lead) body.append(el('p', 'lead', task.lead)); // a little setup before the question
  body.append(el('p', 'prompt', task.prompt));
  host.append(body, foot);
  const kind = { choice, multi, order, match, answer3, mapdrop }[task.type];
  return kind(body, footer(foot), task, hooks) || { pick() {} };
}

// ------------------------------------------------------------------ choice

function choice(body, fb, task, hooks) {
  const list = el('div', 'options');
  let wrong = 0, solved = false;
  const buttons = shuffle(task.options).map((o) => {
    const b = button('option', o.text);
    b.dataset.pick = o.pick || '';
    b.onclick = () => {
      if (solved || b.disabled) return;
      if (o.pick) hooks.emit({ type: 'option', pick: o.pick });
      if (o.correct) {
        solved = true;
        b.classList.add('right');
        buttons.forEach((x) => (x.disabled = true));
        fb.solved('Yes.', task.explain);
        hooks.done({ firstTry: wrong === 0 });
      } else {
        wrong++;
        b.classList.add('wrong');
        b.disabled = true;
        fb.say(o.why || 'Not that one. Try again.', 'bad');
      }
    };
    list.append(b);
    return b;
  });
  body.append(list);
  return { pick(name) { buttons.find((b) => b.dataset.pick === name)?.click(); } };
}

// ------------------------------------------------------------------ multi

function multi(body, fb, task, hooks) {
  const list = el('div', `options${task.options.length > 6 ? ' two' : ''}`);
  const chosen = new Set();
  const want = task.options.filter((o) => o.correct).length;
  let tries = 0, solved = false;
  const buttons = shuffle(task.options).map((o) => {
    const b = button('option toggle', o.text);
    b.setAttribute('aria-pressed', 'false');
    b.onclick = () => {
      if (solved || b.disabled) return;
      chosen.has(o) ? chosen.delete(o) : chosen.add(o);
      b.setAttribute('aria-pressed', String(chosen.has(o)));
      fb.clear();
    };
    list.append(b);
    return { b, o };
  });
  const check = button('primary small', 'Check');
  check.onclick = () => {
    if (solved) return;
    tries++;
    const bad = [...chosen].filter((o) => !o.correct);
    const good = [...chosen].filter((o) => o.correct).length;
    if (!bad.length && good === want) {
      solved = true;
      buttons.forEach(({ b, o }) => { b.disabled = true; if (o.correct) b.classList.add('right'); });
      check.remove();
      body.querySelector('.hint')?.remove();
      fb.solved(`All ${want}.`, task.explain);
      hooks.done({ firstTry: tries === 1 });
      return;
    }
    for (const o of bad) {
      const it = buttons.find((x) => x.o === o);
      it.b.classList.add('wrong'); it.b.disabled = true; it.b.setAttribute('aria-pressed', 'false');
      chosen.delete(o);
    }
    const lines = [];
    if (bad.length) lines.push(bad.map((o) => o.why || `“${o.text}” doesn’t belong.`).join(' '));
    if (good < want) lines.push(`You have ${good} of ${want}. Keep going.`);
    fb.say(lines.join(' '), 'bad');
  };
  body.append(el('p', 'hint', `Pick ${want}, then check.`), list, check);
}

// ------------------------------------------------------------------ order

// Two columns in the panel (which widens for it): the cards, shuffled, and a numbered list. Drag a card onto a number
// (or tap a card, then a number). Dropping on a filled number swaps the two. Check locks the right ones in
// and sends the rest back to the pile.
function order(body, fb, task, hooks) {
  const n = task.items.length;
  const pileOrder = shuffle(task.items.map((_, i) => i));
  const slots = Array(n).fill(null); // which item sits at each number
  const locked = Array(n).fill(false);
  let selected = null, tries = 0, solved = false, over = null;

  const board = el('div', 'orderboard');
  const pileCol = el('section', 'board-col pile');
  const listCol = el('section', 'board-col');
  const check = button('primary small', 'Check the order');
  const listHead = el('div', 'board-head');
  listHead.append(el('h2', null, 'In order'), check);
  pileCol.append(el('h2', null, 'Cards'));
  const pile = el('div', 'pile-cards');
  const list = el('ol', 'order-slots');
  pileCol.append(pile);
  listCol.append(listHead, list);
  board.append(pileCol, listCol);
  body.append(el('p', 'hint', 'Drag the cards onto the numbers, or tap a card and then a number. Drop on a filled number to swap.'), board);
  document.body.classList.add('wide-panel');
  dispatchEvent(new Event('resize')); // re-frame the scene beside the wider panel
  cleanup = () => { document.body.classList.remove('wide-panel'); dispatchEvent(new Event('resize')); };

  const slotOf = (it) => slots.indexOf(it);
  const targetAt = (x, y) => {
    for (const e of document.elementsFromPoint(x, y)) {
      if (e.dataset?.slot != null) return { slot: +e.dataset.slot };
      if (e === pileCol || pileCol.contains(e)) return { pile: true };
    }
    return null;
  };
  // Put item `it` at slot `to` (or back in the pile when `to` is null). A card already there goes where `it` came from.
  function place(it, to) {
    const from = slotOf(it);
    if (to != null) {
      if (locked[to] || from === to) return;
      const there = slots[to];
      slots[to] = it;
      if (from >= 0) slots[from] = there; // swap, or leave the old number empty
    } else if (from >= 0) {
      if (locked[from]) return;
      slots[from] = null;
    }
    selected = null;
    fb.clear();
    draw();
  }

  function card(it) {
    const c = button('order-card', task.items[it]);
    const at = slotOf(it);
    if (at >= 0 && locked[at]) { c.classList.add('right'); c.disabled = true; return c; }
    if (selected === it) c.classList.add('picked');
    draggable(c, task.items[it], {
      onMove: (x, y) => {
        const t = targetAt(x, y);
        const id = t?.slot ?? null;
        if (over !== id) { list.querySelector('.over')?.classList.remove('over'); over = id; if (id != null) list.children[id]?.classList.add('over'); }
      },
      onDrop: (x, y) => {
        list.querySelector('.over')?.classList.remove('over'); over = null;
        const t = targetAt(x, y);
        if (t?.slot != null) place(it, t.slot);
        else if (t?.pile) place(it, null);
      },
      onTap: () => { selected = selected === it ? null : it; draw(); },
    });
    return c;
  }

  function draw() {
    pile.replaceChildren(...pileOrder.filter((it) => slotOf(it) < 0).map(card));
    if (!pile.children.length) pile.append(el('p', 'pile-empty', solved ? 'All in order.' : 'All placed. Check the order.'));
    list.replaceChildren(...slots.map((it, k) => {
      const li = el('li', `order-slot${it == null ? ' empty' : ''}${locked[k] ? ' right' : ''}`);
      li.dataset.slot = k;
      li.append(el('span', 'slot-num', String(k + 1)));
      if (it == null) li.append(el('span', 'slot-hint', selected != null ? 'Tap to put it here' : ''));
      else li.append(card(it));
      li.onclick = (e) => {
        if (selected == null || e.target.closest('.order-card')) return;
        place(selected, k);
      };
      return li;
    }));
    check.disabled = solved || slots.includes(null);
  }
  pileCol.addEventListener('click', (e) => {
    if (selected != null && slotOf(selected) >= 0 && !e.target.closest('.order-card')) place(selected, null);
  });

  check.onclick = () => {
    tries++;
    let right = 0;
    slots.forEach((it, k) => {
      if (it === k) { locked[k] = true; right++; } else if (!locked[k]) slots[k] = null;
    });
    if (right === n) {
      solved = true;
      check.remove();
      body.querySelector('.hint')?.remove();
      // the pile is empty now: show the finished order on its own, in two short columns
      pileCol.remove();
      board.classList.add('solved');
      list.style.gridTemplateRows = `repeat(${Math.ceil(n / 2)}, auto)`;
      draw();
      fb.solved('That’s the order.', task.explain);
      hooks.done({ firstTry: tries === 1 });
      return;
    }
    draw();
    fb.say(`${right} of ${n} are in the right place, and they’re locked in green. The rest are back with the cards. Try again.`, 'bad');
  };
  draw();
}

// ------------------------------------------------------------------ match

function match(body, fb, task, hooks) {
  const rows = el('div', 'match-rows');
  const palette = el('div', 'palette');
  const done = new Set();
  const rowEls = new Map();
  const reusable = task.choices.length < task.items.length; // a sort into two or three piles
  const linked = task.items.some((it) => it.pick);
  // Long answers (definitions, descriptions) read better as a list, with the short items as pills above.
  const wide = task.choices.reduce((n, c) => n + c.label.length, 0) / task.choices.length > 28;
  if (wide) { rows.classList.add('pills'); palette.classList.add('defs'); }
  let current = null, wrong = 0, solved = false;

  function select(item) {
    if (!item || done.has(item.id)) return;
    current = item;
    rowEls.forEach((r, id) => r.classList.toggle('current', id === item.id));
    hooks.emit({ type: 'select', pick: item.pick || null });
    fb.clear();
  }
  const hoverRow = (id) => rowEls.forEach((r, rid) => r.classList.toggle('over', rid === id));

  function answer(item, c, chip) {
    if (!item || done.has(item.id)) return;
    const r = rowEls.get(item.id);
    if (c.id === item.answer) {
      done.add(item.id);
      r.classList.remove('current');
      r.classList.add('right');
      r.disabled = true;
      r.querySelector('.match-answer').textContent = c.label;
      hooks.emit({ type: 'item-correct', pick: item.pick || null, item: item.id, answer: c.label });
      fb.clear();
      if (!reusable) chip.disabled = true;
      if (wide) { chip.classList.add('used'); chip.prepend(el('b', null, item.label)); }
      if (done.size === task.items.length) {
        solved = true;
        current = null;
        // the list now says it all: wide keeps the matched definitions, narrow keeps the answered rows
        body.querySelector('.hint')?.remove();
        if (wide) rows.remove();
        else palette.remove();
        fb.solved('All matched.', task.explain);
        hooks.done({ firstTry: wrong === 0 });
      } else if (item === current || !current || done.has(current.id)) {
        select(task.items.find((it) => !done.has(it.id)));
      }
    } else {
      wrong++;
      select(item);
      r.classList.remove('shake'); void r.offsetWidth; r.classList.add('shake');
      fb.say(c.why || `Not “${c.label}” for ${item.label.toLowerCase()}. Try another.`, 'bad');
    }
  }

  task.items.forEach((item, k) => {
    const r = button('match-row');
    r.dataset.item = item.id;
    r.append(el('span', 'match-num', String(k + 1)), el('span', 'match-label', item.label), el('span', 'match-answer', '?'));
    r.onclick = () => select(item);
    rows.append(r);
    rowEls.set(item.id, r);
  });

  // Where a dragged chip lands: a row in the panel, or a part (or its label) in the scene.
  const itemAt = (x, y) => {
    const row = document.elementsFromPoint(x, y).find((e) => e.dataset?.item);
    if (row) return task.items.find((it) => it.id === row.dataset.item);
    const pick = linked ? hooks.dropTarget(x, y) : null;
    return pick ? task.items.find((it) => it.pick === pick) : null;
  };

  for (const c of shuffle(task.choices)) {
    const chip = button('chip', c.label);
    draggable(chip, c.label, {
      onMove: (x, y) => hoverRow(itemAt(x, y)?.id),
      onDrop: (x, y) => { hoverRow(null); if (!solved) answer(itemAt(x, y), c, chip); },
      onTap: () => {
        if (solved || chip.disabled) return;
        if (!current) { fb.say('Pick something on the list first.'); return; }
        answer(current, c, chip);
      },
    });
    palette.append(chip);
  }

  const how = linked
    ? 'Drag each answer onto its part, in the list or in the scene. Or pick a part, then tap its answer.'
    : 'Drag each answer onto its row, or pick a row and then tap its answer.';
  body.append(rows, el('p', 'hint', how), palette);
  select(task.items[0]);
  return { pick(name) { select(task.items.find((it) => it.pick === name)); } };
}

// ------------------------------------------------------------------ answer3

function answer3(body, fb, task, hooks) {
  const area = el('div', 'answer3');
  const built = el('div', 'built');
  body.append(built, area);
  let wrong = 0;

  const line = (label, text) => {
    const p = el('p', 'built-line');
    p.append(el('strong', null, label + ' '), document.createTextNode(text));
    built.append(p);
  };

  function step(title, options, onRight) {
    area.replaceChildren(el('p', 'step', title));
    const list = el('div', 'options');
    for (const o of shuffle(options)) {
      const b = button('option', o.text);
      b.onclick = () => {
        if (o.ok) { fb.clear(); onRight(o); return; }
        wrong++;
        b.classList.add('wrong'); b.disabled = true;
        fb.say(o.why, 'bad');
      };
      list.append(b);
    }
    area.append(list);
  }

  step('Part 1 · Pick a way the canoe gave people control. Any of these can work.',
    task.claims.map((c) => ({ text: c.claim, ok: true, c })),
    ({ c }) => {
      line('How:', c.claim);
      const others = task.claims.filter((x) => x !== c);
      step('Part 2 · Which detail from the reading backs that up?', [
        { text: c.detail, ok: true },
        ...shuffle(others).slice(0, 2).map((x) => ({ text: x.detail, why: `That’s true, but it backs up a different point: “${x.claim}”` })),
        ...task.wrongDetails.slice(0, 1).map((t) => ({ text: t, why: 'That isn’t true. Check the reading.' })),
      ], () => {
        line('Detail:', c.detail);
        step('Part 3 · Why does that detail matter?', [
          { text: c.why, ok: true },
          ...shuffle(others).slice(0, 2).map((x) => ({ text: x.why, why: `That’s a good reason, but for a different point: “${x.claim}”` })),
        ], () => {
          line('Why it matters:', c.why);
          area.replaceChildren();
          fb.solved('That’s a three-part answer. On the test, write it in your own words.', task.explain);
          hooks.done({ firstTry: wrong === 0 });
        });
      });
    });
}

// ------------------------------------------------------------------ mapdrop

const SVG = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}, text) => {
  const e = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text != null) e.textContent = text;
  return e;
};

// Drag each name onto its homeland on a map of New Brunswick. Tap a name and then the map works too.
function mapdrop(body, fb, task, hooks) {
  body.append(el('p', 'hint', 'Drag each name onto its homeland on the map. Or tap a name, then tap the map.'));
  const project = ([lon, lat]) => [(lon - MAP.proj.w) * MAP.proj.kx, (MAP.proj.n - lat) * MAP.proj.ky];

  const card = el('div', 'mapcard');
  const map = svg('svg', { viewBox: `0 0 ${MAP.w} ${MAP.h}`, role: 'img', 'aria-label': 'Map of New Brunswick, Nova Scotia, Prince Edward Island and the Gaspé' });
  map.append(svg('rect', { width: MAP.w, height: MAP.h, class: 'sea' }));
  const L = MAP.land;
  for (const k of ['me', 'qc', 'lab', 'nb', 'ns', 'pe', 'nf']) map.append(svg('path', { d: L[k], class: 'land' }));
  const clip = svg('clipPath', { id: 'homeland-clip' });
  clip.append(svg('path', { d: L.nb + L.ns + L.pe + L.nf + L.qc }));
  map.append(clip);
  const zones = svg('g', { 'clip-path': 'url(#homeland-clip)' });
  const regionEls = {};
  for (const [id, d] of Object.entries(MAP.regions)) {
    const r = svg('path', { d, class: `region r-${id}`, 'data-region': id });
    zones.append(r);
    regionEls[id] = r;
  }
  map.append(zones);
  for (const k of ['me', 'qc', 'lab', 'nb', 'ns', 'pe', 'nf']) map.append(svg('path', { d: L[k], class: 'coast' }));
  const P = MAP.places;
  map.append(svg('path', { d: P.wolastoq, class: 'river' }));
  const label = (xy, text, cls) => map.append(svg('text', { x: xy[0], y: xy[1], class: cls }, text));
  label(P.wolastoqLabel, 'Wolastoq (Saint John River)', 'place river-label');
  label(P.passamaquoddy, 'Passamaquoddy Bay', 'place water-label');
  label(P.fundy, 'Bay of Fundy', 'place water-label');
  label(P.gulf, 'Gulf of St. Lawrence', 'place water-label');
  map.append(svg('circle', { cx: P.stGeorge[0], cy: P.stGeorge[1], r: 9, class: 'town' }));
  label([P.stGeorge[0] - 14, P.stGeorge[1] - 12], 'St. George', 'place town-label');
  const names = svg('g');
  map.append(names);

  const tray = el('div', 'tray');
  card.append(map, tray);
  document.body.append(card);
  document.body.classList.add('mapping');
  cleanup = () => { card.remove(); document.body.classList.remove('mapping'); };

  const placed = new Set();
  let wrong = 0, selected = null, over = null;

  const regionAt = (x, y) => document.elementsFromPoint(x, y).find((e) => e.dataset?.region)?.dataset.region || null;
  const hover = (id) => {
    if (over === id) return;
    if (over) regionEls[over].classList.remove('over');
    over = id;
    if (over && !placed.has(over)) regionEls[over].classList.add('over');
  };

  function drop(item, regionId, chip) {
    hover(null);
    if (!regionId) return;
    if (placed.has(regionId)) { fb.say('That homeland already has its name. Try another spot.', 'bad'); return; }
    if (regionId === item.id) {
      placed.add(regionId);
      regionEls[regionId].classList.add('named');
      const at = project(task.regions[regionId].at);
      names.append(svg('text', { x: at[0], y: at[1], class: 'name' }, item.label));
      chip.remove();
      selected = null;
      fb.say(`Yes: ${item.label}.`, 'good');
      if (placed.size === task.items.length) {
        fb.solved('All three homelands named.', task.explain);
        hooks.done({ firstTry: wrong === 0 });
      }
    } else {
      wrong++;
      chip.classList.remove('shake'); void chip.offsetWidth; chip.classList.add('shake');
      fb.say(`Not ${item.label}. ${task.regions[regionId].hint} Try again.`, 'bad');
    }
  }

  for (const item of shuffle(task.items)) {
    const chip = button('chip map-chip', item.label);
    chip.dataset.id = item.id;
    draggable(chip, item.label, {
      onMove: (x, y) => hover(regionAt(x, y)),
      onDrop: (x, y) => drop(item, regionAt(x, y), chip),
      onTap: () => {
        tray.querySelectorAll('.map-chip').forEach((c) => c.classList.toggle('picked', c === chip && selected !== item));
        selected = selected === item ? null : item;
        fb.say(selected ? `Now tap the homeland of the ${item.label}.` : '');
      },
    });
    tray.append(chip);
  }

  map.addEventListener('click', (e) => {
    if (!selected) return;
    drop(selected, regionAt(e.clientX, e.clientY), tray.querySelector(`[data-id="${selected.id}"]`));
  });
}
