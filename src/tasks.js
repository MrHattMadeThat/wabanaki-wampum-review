// The challenge panel. One task at a time: render(task) draws it into `host`, and calls
// hooks.emit(event) so the 3D stage can react, then hooks.done({ firstTry }) when it is solved.
//
// Events sent to the stage:
//   { type: 'select', pick }        an item or option linked to a 3D part is selected (pick may be null)
//   { type: 'item-correct', pick }  a match item was answered correctly
//   { type: 'option', pick }        a choice option linked to a 3D part was clicked

import { MAP } from './map-data.js';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function feedback(host) {
  const box = el('div', 'feedback');
  box.setAttribute('role', 'status');
  host.append(box);
  return {
    say(text, kind) { box.textContent = text; box.className = `feedback ${kind || ''}`; },
    clear() { box.textContent = ''; box.className = 'feedback'; },
  };
}

function explain(host, text) {
  if (!text) return;
  host.append(el('p', 'explain', text));
}

// Some tasks put things outside the panel (the map card). They register a cleanup here.
let cleanup = null;
export function clearTask() {
  cleanup?.();
  cleanup = null;
}

// Returns a controller with pick(name): the stage calls it when a 3D part is clicked.
export function renderTask(host, task, hooks) {
  clearTask();
  host.replaceChildren();
  host.append(el('p', 'prompt', task.prompt));
  const kind = { choice, multi, order, match, answer3, mapdrop }[task.type];
  return kind(host, task, hooks) || { pick() {} };
}

// ------------------------------------------------------------------ choice

function choice(host, task, hooks) {
  const list = el('div', 'options');
  const fb = feedback(host);
  let wrong = 0, solved = false;
  const buttons = shuffle(task.options).map((o) => {
    const b = el('button', 'option', o.text);
    b.type = 'button';
    b.onclick = () => {
      if (solved || b.disabled) return;
      if (o.pick) hooks.emit({ type: 'option', pick: o.pick });
      if (o.correct) {
        solved = true;
        b.classList.add('right');
        buttons.forEach((x) => (x.disabled = true));
        fb.say('Yes.', 'good');
        explain(host, task.explain);
        hooks.done({ firstTry: wrong === 0 });
      } else {
        wrong++;
        b.classList.add('wrong');
        b.disabled = true;
        fb.say(o.why || 'Not that one. Try again.', 'bad');
      }
    };
    b.dataset.pick = o.pick || '';
    list.append(b);
    return b;
  });
  host.insertBefore(list, host.querySelector('.feedback'));
  return {
    pick(name) { buttons.find((b) => b.dataset.pick === name)?.click(); },
  };
}

// ------------------------------------------------------------------ multi

function multi(host, task, hooks) {
  const list = el('div', 'options');
  const chosen = new Set();
  const want = task.options.filter((o) => o.correct).length;
  const fb = feedback(host);
  let tries = 0, solved = false;
  const buttons = shuffle(task.options).map((o) => {
    const b = el('button', 'option toggle', o.text);
    b.type = 'button';
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
  const check = el('button', 'primary', 'Check');
  check.type = 'button';
  check.onclick = () => {
    if (solved) return;
    tries++;
    const bad = [...chosen].filter((o) => !o.correct);
    const good = [...chosen].filter((o) => o.correct).length;
    if (!bad.length && good === want) {
      solved = true;
      buttons.forEach(({ b, o }) => { b.disabled = true; if (o.correct) b.classList.add('right'); });
      check.remove();
      fb.say(`All ${want}.`, 'good');
      explain(host, task.explain);
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
  host.insertBefore(list, host.querySelector('.feedback'));
  host.insertBefore(check, host.querySelector('.feedback'));
}

// ------------------------------------------------------------------ order

function order(host, task, hooks) {
  const n = task.items.length;
  const slots = Array(n).fill(null); // item index in each slot
  const locked = Array(n).fill(false);
  const slotList = el('ol', 'slots');
  const pool = el('div', 'pool');
  const fb = feedback(host);
  const check = el('button', 'primary', 'Check the order');
  check.type = 'button';
  let tries = 0, solved = false;
  const poolOrder = shuffle(task.items.map((_, i) => i));

  function draw() {
    slotList.replaceChildren(...slots.map((it, s) => {
      const li = el('li', `slot${locked[s] ? ' right' : ''}${it == null ? ' empty' : ''}`);
      const b = el('button', 'slot-btn', it == null ? 'Tap a card below' : task.items[it]);
      b.type = 'button';
      b.disabled = locked[s] || it == null;
      b.onclick = () => { slots[s] = null; fb.clear(); draw(); };
      li.append(b);
      return li;
    }));
    const placed = new Set(slots.filter((x) => x != null));
    pool.replaceChildren(...poolOrder.filter((i) => !placed.has(i)).map((i) => {
      const b = el('button', 'card', task.items[i]);
      b.type = 'button';
      b.onclick = () => {
        const s = slots.indexOf(null);
        if (s >= 0) { slots[s] = i; fb.clear(); draw(); }
      };
      return b;
    }));
    check.disabled = slots.includes(null);
    check.hidden = solved;
  }

  check.onclick = () => {
    tries++;
    let right = 0;
    slots.forEach((it, s) => {
      if (it === s) { locked[s] = true; right++; } else if (!locked[s]) slots[s] = null;
    });
    if (right === n) {
      solved = true;
      fb.say('That’s the order.', 'good');
      draw();
      explain(host, task.explain);
      hooks.done({ firstTry: tries === 1 });
      return;
    }
    fb.say(`${right} of ${n} are in the right place. Those stay; try the rest again.`, 'bad');
    draw();
  };

  host.append(slotList, pool, check);
  host.append(host.querySelector('.feedback'));
  draw();
}

// ------------------------------------------------------------------ match

function match(host, task, hooks) {
  const rows = el('div', 'match-rows');
  const palette = el('div', 'palette');
  const fb = feedback(host);
  const done = new Set();
  let current = null, wrong = 0;
  const rowEls = new Map();

  function select(item) {
    if (!item || done.has(item.id)) return;
    current = item;
    rowEls.forEach((r, id) => r.classList.toggle('current', id === item.id));
    palette.dataset.for = item.label;
    hooks.emit({ type: 'select', pick: item.pick || null });
    fb.clear();
  }

  for (const item of task.items) {
    const r = el('button', 'match-row');
    r.type = 'button';
    r.append(el('span', 'match-label', item.label), el('span', 'match-answer', '?'));
    r.onclick = () => select(item);
    rows.append(r);
    rowEls.set(item.id, r);
  }

  for (const c of shuffle(task.choices)) {
    const b = el('button', 'chip', c.label);
    b.type = 'button';
    b.onclick = () => {
      if (!current) { fb.say('Pick something on the left first.', ''); return; }
      const r = rowEls.get(current.id);
      if (c.id === current.answer) {
        done.add(current.id);
        r.classList.remove('current');
        r.classList.add('right');
        r.disabled = true;
        r.querySelector('.match-answer').textContent = c.label;
        hooks.emit({ type: 'item-correct', pick: current.pick || null, item: current.id, answer: c.label });
        fb.clear();
        // choices used once (when there are as many choices as items) can be retired
        const reusable = task.choices.length < task.items.length;
        if (!reusable) b.disabled = true;
        if (done.size === task.items.length) {
          current = null;
          fb.say('All matched.', 'good');
          explain(host, task.explain);
          hooks.done({ firstTry: wrong === 0 });
        } else {
          select(task.items.find((it) => !done.has(it.id)));
        }
      } else {
        wrong++;
        r.classList.remove('shake'); void r.offsetWidth; r.classList.add('shake');
        fb.say(c.why || `Not “${c.label}” for ${current.label.toLowerCase()}. Try another.`, 'bad');
      }
    };
    palette.append(b);
  }

  host.append(rows, el('p', 'hint', 'Pick one on the left, then its answer below.'), palette);
  host.append(host.querySelector('.feedback'));
  select(task.items[0]);
  return {
    pick(name) { select(task.items.find((it) => it.pick === name)); },
  };
}

// ------------------------------------------------------------------ answer3

function answer3(host, task, hooks) {
  const area = el('div', 'answer3');
  const built = el('div', 'built');
  const fb = feedback(host);
  host.append(area, built);
  host.append(host.querySelector('.feedback'));
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
      const b = el('button', 'option', o.text);
      b.type = 'button';
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
          fb.say('That’s a three-part answer. On the test, write it in your own words.', 'good');
          explain(host, task.explain);
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

// Drag each name onto its homeland on a map of the Maritimes. Tap a name and then the map works too.
function mapdrop(host, task, hooks) {
  const fb = feedback(host);
  host.insertBefore(el('p', 'hint', 'Drag each name onto its homeland on the map. Or tap a name, then tap the map.'), host.querySelector('.feedback'));
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
  cleanup = () => { card.remove(); ghost?.remove(); document.body.classList.remove('mapping'); };

  const placed = new Set();
  let wrong = 0, selected = null, ghost = null, over = null;

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
        fb.say('All three homelands named.', 'good');
        explain(host, task.explain);
        hooks.done({ firstTry: wrong === 0 });
      }
    } else {
      wrong++;
      chip.classList.remove('shake'); void chip.offsetWidth; chip.classList.add('shake');
      fb.say(`Not ${item.label}. ${task.regions[regionId].hint} Try again.`, 'bad');
    }
  }

  for (const item of shuffle(task.items)) {
    const chip = el('button', 'chip map-chip', item.label);
    chip.type = 'button';
    let start = null;
    chip.addEventListener('pointerdown', (e) => {
      start = [e.clientX, e.clientY];
      chip.setPointerCapture(e.pointerId);
    });
    chip.addEventListener('pointermove', (e) => {
      if (!start) return;
      if (!ghost && Math.hypot(e.clientX - start[0], e.clientY - start[1]) > 6) {
        ghost = el('div', 'ghost', item.label);
        document.body.append(ghost);
        chip.classList.add('dragging');
      }
      if (ghost) {
        ghost.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
        hover(regionAt(e.clientX, e.clientY));
      }
    });
    chip.addEventListener('pointerup', (e) => {
      const dragged = !!ghost;
      start = null;
      chip.classList.remove('dragging');
      if (dragged) {
        ghost.remove(); ghost = null;
        drop(item, regionAt(e.clientX, e.clientY), chip);
      } else {
        // tap to select, then tap the map
        tray.querySelectorAll('.map-chip').forEach((c) => c.classList.toggle('picked', c === chip && selected !== item));
        selected = selected === item ? null : item;
        fb.say(selected ? `Now tap the homeland of the ${item.label}.` : '', '');
      }
    });
    chip.addEventListener('pointercancel', () => { start = null; ghost?.remove(); ghost = null; hover(null); });
    chip.dataset.id = item.id;
    tray.append(chip);
  }

  map.addEventListener('click', (e) => {
    if (!selected) return;
    const chip = tray.querySelector(`[data-id="${selected.id}"]`);
    drop(selected, regionAt(e.clientX, e.clientY), chip);
  });
}
