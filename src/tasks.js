// The challenge panel. One task at a time: render(task) draws it into `host`, and calls
// hooks.emit(event) so the 3D stage can react, then hooks.done({ firstTry }) when it is solved.
//
// Events sent to the stage:
//   { type: 'select', pick }        an item or option linked to a 3D part is selected (pick may be null)
//   { type: 'item-correct', pick }  a match item was answered correctly
//   { type: 'option', pick }        a choice option linked to a 3D part was clicked

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

// Returns a controller with pick(name): the stage calls it when a 3D part is clicked.
export function renderTask(host, task, hooks) {
  host.replaceChildren();
  host.append(el('p', 'prompt', task.prompt));
  const kind = { choice, multi, order, match, answer3 }[task.type];
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
