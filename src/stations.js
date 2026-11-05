import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { buildStone, buildBeadString } from './props.js';
import { ANCHORS } from './layout.js';
import { STATIONS } from './content.js';

// The 3D stage at each stop. build(id, ctx) returns:
//   group        placed at the anchor, on the ground (or the water)
//   picks        names of the 3D parts the tasks can link to
//   update(dt, t)
//   react(event) events from tasks.js, plus { type: 'task-start' | 'task-done', index }

export function tag(text, cls = '') {
  const d = document.createElement('div');
  d.className = `tag ${cls}`;
  d.textContent = text;
  return new CSS2DObject(d);
}

const GLOW = new THREE.Color('#ffcf70');
export function glow(obj, on) {
  obj?.traverse((o) => {
    if (!o.isMesh) return;
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of ms) {
      if (m.userData.pickBox) {
        m.opacity = on ? 0.32 : 0;
      } else if (m.emissive) {
        m.emissive.copy(GLOW);
        m.emissiveIntensity = on ? 0.5 : 0;
      }
    }
  });
}

function base(ctx, id) {
  const a = ANCHORS[id];
  const group = new THREE.Group();
  group.name = `station_${id}`;
  const y = a.water ? 0 : ctx.heightAt(a.at[0], a.at[1]);
  group.position.set(a.at[0], y, a.at[1]);
  return { group, waterY: -y };
}

// Lights up one pickable (or a list of them) at a time.
function highlighter(group) {
  let lit = [];
  return (names) => {
    lit.forEach((o) => glow(o, false));
    lit = [names].flat().filter(Boolean).map((n) => group.getObjectByName(n)).filter(Boolean);
    lit.forEach((o) => glow(o, true));
  };
}

// A model in named parts that flies apart for the stop's first question and comes back together
// one part at a time as each part is answered (the canoe, the bow). `explode` on a part's userData
// says where it goes.
function assembly(model, names) {
  const parts = names.map((n) => model.getObjectByName(n)).filter(Boolean);
  parts.forEach((p) => { p.userData.home = p.position.clone(); p.userData.k = 0; });
  const assembled = new Set();
  let exploded = false;
  const light = highlighter(model);
  const v = new THREE.Vector3();
  return {
    picks: parts.map((p) => p.name),
    update(dt) {
      for (const p of parts) {
        const goal = exploded && !assembled.has(p.name) ? 1 : 0;
        p.userData.k += (goal - p.userData.k) * Math.min(1, dt * 3);
        p.position.copy(p.userData.home).add(v.set(...(p.userData.explode || [0, 0, 0])).multiplyScalar(p.userData.k));
      }
    },
    react(e) {
      if (e.type === 'task-start') { exploded = e.index === 0; assembled.clear(); light(null); }
      if (e.type === 'select') light(e.pick);
      if (e.type === 'item-correct' && e.pick) assembled.add(e.pick);
      if (e.type === 'task-done') light(null);
    },
  };
}

// ------------------------------------------------------------------ small living things

let puffTex;
function puffTexture() {
  if (puffTex) return puffTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.5, 'rgba(255,255,255,0.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  puffTex = new THREE.CanvasTexture(c);
  return puffTex;
}

// A thin column of smoke: soft puffs that rise, spread and fade, leaning a little with the wind.
export function smoke(parent, at, { count = 14, rise = 0.45, life = 9, size = 1.6, wind = [0.12, 0, -0.05] } = {}) {
  const puffs = [];
  for (let i = 0; i < count; i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTexture(), color: '#b9b2ab', transparent: true, depthWrite: false, opacity: 0 }));
    m.userData.age = (i / count) * life;
    parent.add(m);
    puffs.push(m);
  }
  return (dt) => {
    for (const m of puffs) {
      const a = (m.userData.age = (m.userData.age + dt) % life) / life;
      m.position.set(at[0] + wind[0] * a * life + Math.sin(a * 9 + m.id) * 0.1 * a, at[1] + rise * a * life, at[2] + wind[2] * a * life);
      m.scale.setScalar(0.35 + size * a);
      m.material.opacity = Math.sin(Math.PI * Math.min(1, a * 1.4)) * 0.3 * (1 - a);
    }
  };
}

const BUILD = {
  // A summer fishing camp on the beach at sunrise: the canoe pulled up out of the water, a fire, a wigwam,
  // fish drying on a rack. Gulls overhead, porpoises surfacing out in the bay.
  async dawn(ctx) {
    const s = base(ctx, 'dawn');
    const a = ANCHORS.dawn, gy = s.group.position.y;
    const put = (o, x, z, ry = 0, dy = 0) => {
      o.position.set(x, ctx.heightAt(a.at[0] + x, a.at[1] + z) - gy + dy, z);
      o.rotation.y = ry;
      s.group.add(o);
      return o;
    };
    const canoe = await ctx.make('canoe_birch');
    put(canoe, 3.4, 0.4, 0.12, 0.02);
    canoe.rotation.z = -0.16; // resting on the slope of the beach, bow to the water
    const paddle = await ctx.make('canoe_paddle');
    paddle.position.set(0.3, 0.4, 0); paddle.rotation.set(0.05, Math.PI / 2 - 0.2, 0);
    canoe.add(paddle);

    const wig = await ctx.make('wigwam');
    put(wig, -1, -8.5, Math.PI / 2 + 0.2);
    const wig2 = await ctx.make('wigwam');
    put(wig2, 3.5, -15, Math.PI / 2 - 0.3);
    const fire = await ctx.make('council_fire');
    put(fire, -1.2, -3).scale.setScalar(0.55);
    const rack = await ctx.make('fish_rack');
    put(rack, 2, -4.5, -0.5);

    const rocks = await ctx.make('shore_rocks');
    const spots = { rock_1: [4.4, 2.6, 0.3], rock_2: [6.6, -7.4, 1.2], rock_3: [8.5, 3.5, 2.1], rock_4: [10, -13, 0.7] };
    for (const [name, [x, z, ry]] of Object.entries(spots)) {
      const r = rocks.getObjectByName(name);
      if (r) put(r, x, z, ry, -0.15);
    }
    const drift = await ctx.make('driftwood');
    for (const [name, x, z, ry] of [['drift_1', -2.5, 1.5, 0.7], ['drift_2', 6, -10.5, -0.4]]) {
      const d = drift.getObjectByName(name);
      if (d) put(d, x, z, ry, -0.05);
    }

    // smoke from the fire and out of the wigwam's smoke hole
    const fireAt = fire.position, wigAt = wig.position;
    const smokes = [
      smoke(s.group, [fireAt.x, fireAt.y + 0.6, fireAt.z], { count: 16, size: 1.8 }),
      smoke(s.group, [wigAt.x, wigAt.y + 3.5, wigAt.z], { count: 10, size: 1.3, rise: 0.35 }),
    ];
    const flame = fire.getObjectByName('flame'), core = fire.getObjectByName('flame_core'), light = fire.getObjectByName('fire_light');

    // porpoises out in the bay, in the path of the sunrise
    const pods = [];
    for (const [x, z, period, off] of [[34, -2, 9, 0], [44, 5, 11, 4], [58, -6, 13, 8]]) {
      const pp = await ctx.make('porpoise');
      pp.position.set(x, -gy - 2, z);
      s.group.add(pp);
      pods.push({ pp, x, z, period, off });
    }
    const gulls = [];
    for (let i = 0; i < 3; i++) {
      const gl = await ctx.make('gull');
      s.group.add(gl);
      gulls.push({ gl, r: 9 + i * 3.5, h: 7 + i * 2.2, speed: 0.22 - i * 0.03, off: i * 2.1, wl: gl.getObjectByName('wing_l'), wr: gl.getObjectByName('wing_r') });
    }

    return {
      ...s,
      update(dt, t) {
        smokes.forEach((f) => f(dt));
        const f = 1 + Math.sin(t * 13) * 0.08 + Math.sin(t * 7.3) * 0.06;
        if (flame) flame.scale.set(1, f, 1);
        if (core) core.scale.set(1, 2 - f, 1);
        if (light) light.intensity = 3 + f * 1.5;
        for (const { pp, x, z, period, off } of pods) {
          const u = ((t + off) % period) / 2.2; // 2.2 s above water, then a long dive
          if (u > 1) { pp.visible = false; continue; }
          pp.visible = true;
          pp.position.set(x + u * 2.6, -gy - 0.78 + Math.sin(Math.PI * u) * 0.62, z); // origin at its belly: the back and fin break the surface
          pp.rotation.z = Math.cos(Math.PI * u) * 0.55; // nose up as it rises, down as it dives
        }
        for (const gg of gulls) {
          const ang = t * gg.speed + gg.off;
          gg.gl.position.set(8 + Math.cos(ang) * gg.r, gg.h + Math.sin(t * 0.4 + gg.off) * 0.6, Math.sin(ang) * gg.r * 0.7);
          // nose (+x) along the circle, banking in toward its centre
          gg.gl.rotation.set(-0.25, Math.atan2(-Math.cos(ang) * 0.7, -Math.sin(ang)), 0, 'YXZ');
          const flap = Math.sin(t * 7 + gg.off) * (Math.sin(t * 0.6 + gg.off) > 0.2 ? 0.5 : 0.08);
          if (gg.wl) gg.wl.rotation.x = flap;
          if (gg.wr) gg.wr.rotation.x = -flap;
        }
      },
    };
  },

  async canoe(ctx) {
    const s = base(ctx, 'canoe');
    const canoe = await ctx.make('canoe_birch');
    canoe.position.y = 0.42;
    canoe.rotation.y = -0.25;
    s.group.add(canoe);
    for (const x of [-1.2, 1.2]) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.4, 7).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#6b4d34' }));
      log.position.set(x * Math.cos(0.25), 0.12, x * Math.sin(0.25));
      log.rotation.y = -0.25;
      log.castShadow = true;
      s.group.add(log);
    }
    return { ...s, ...assembly(canoe, ['part_skin', 'part_frame', 'part_lashing', 'part_gum']) };
  },

  async repair(ctx) {
    const s = base(ctx, 'repair');
    const birch = await ctx.make('canoe_birch');
    const plastic = await ctx.make('canoe_plastic');
    birch.position.set(-0.2, 0.05, -1.4); birch.rotation.set(0, 0.2, 0.12);
    plastic.position.set(0.3, 0.05, 1.3); plastic.rotation.set(0, 0.2, -0.1);
    s.group.add(birch, plastic);
    // a crack in the plastic hull
    const crack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.01), new THREE.MeshBasicMaterial({ color: '#1d1a17' }));
    crack.position.set(0.3, 0.16, 0.48); crack.rotation.z = 0.3;
    if (plastic.userData.source !== 'glb') plastic.add(crack); // the Blender model has its own
    const t1 = tag('Birch bark'); t1.position.set(0, 1.0, 0); birch.add(t1);
    const t2 = tag('Store-bought'); t2.position.set(0, 1.0, 0); plastic.add(t2);
    // leaks: drips under each canoe
    const drip = (parent, x) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), new THREE.MeshBasicMaterial({ color: '#7fb6d6' }));
      m.position.set(x, 0.1, 0);
      parent.add(m);
      return m;
    };
    const drips = [drip(birch, 0.4), drip(birch, 0.42), drip(plastic, 0.3), drip(plastic, 0.32)];
    let birchFixed = false;
    return {
      ...s,
      update(dt, t) {
        drips.forEach((d, i) => {
          const off = ((t * 0.8 + i * 0.5) % 1);
          d.position.y = 0.12 - off * 0.25;
          d.visible = !(birchFixed && i < 2);
        });
      },
      react(e) {
        if (e.type === 'task-done' && e.index === 0) birchFixed = true;
        if (e.type === 'task-start' && e.index === 0) birchFixed = false;
      },
    };
  },

  async camp(ctx) {
    const s = base(ctx, 'camp');
    const wig = await ctx.make('wigwam');
    wig.position.set(-6, 0, -7);
    const place = async (id, x, z, ry = 0, y = 0) => {
      const o = await ctx.make(id);
      o.position.set(x, y, z); o.rotation.y = ry;
      s.group.add(o);
      return o;
    };
    s.group.add(wig);
    const campSmoke = smoke(s.group, [wig.position.x, 3.5, wig.position.z], { count: 10, size: 1.3, rise: 0.35 });
    await place('tool_snowshoes', -1.5, -1.1, 0.9);
    const kettle = await place('trade_kettle', 1.3, -1.4, 0);
    const kt = tag('Traded'); kt.position.set(0, 0.6, 0); kettle.add(kt);
    // the bow and arrow on their bench, turned to face the camera
    const cam = ANCHORS.camp.cam;
    const bow = await place('bow_set', 0, 0, Math.atan2(cam[0], cam[2]));
    // the string lifts up and to the left, so its label doesn't sit on the bow's
    const string = bow.getObjectByName('bow_sinew');
    if (string) string.userData.explode = [-0.36, 0.3, 0.04];
    const build = assembly(bow, ['bow_wood', 'bow_sinew', 'bow_flint', 'bow_gum']);
    return { ...s, ...build, update(dt, t) { build.update(dt, t); campSmoke(dt); } };
  },

  async messengers(ctx) {
    const s = base(ctx, 'messengers');
    const fleet = [];
    for (let i = 0; i < 4; i++) {
      const c = await ctx.make('canoe_birch', { length: 4.2 });
      c.position.set(-4.5 + i * 3, s.waterY - 0.1, -1 + (i % 2) * 1.8);
      c.rotation.y = 0.05 * i;
      c.userData.home = c.position.clone();
      c.userData.dir = i % 2 ? 1 : -1;
      s.group.add(c);
      fleet.push(c);
    }
    let go = 0;
    return {
      ...s,
      update(dt, t) {
        fleet.forEach((c, i) => {
          if (go) {
            c.position.x += c.userData.dir * dt * (2.4 + i * 0.2);
            if (Math.abs(c.position.x - c.userData.home.x) > 70) c.visible = false;
          }
          c.position.y = c.userData.home.y + Math.sin(t * 1.2 + i) * 0.03;
          c.rotation.z = Math.sin(t + i) * 0.02;
        });
      },
      react(e) {
        if (e.type === 'task-done' && e.index === 0) go = 1;
        if (e.type === 'task-start' && e.index === 0) {
          go = 0;
          fleet.forEach((c) => { c.position.copy(c.userData.home); c.visible = true; });
        }
      },
    };
  },

  async portage(ctx) {
    const s = base(ctx, 'portage');
    const canoe = await ctx.make('canoe_birch', { length: 4.2 });
    canoe.rotation.set(Math.PI, -0.5, 0);
    canoe.position.set(0, 1.75, 0);
    s.group.add(canoe);
    const wood = new THREE.MeshStandardMaterial({ color: '#6b4d34' });
    for (const x of [-1.2, 1.2]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.6, 6), wood);
      post.position.set(x * Math.cos(0.5), 0.8, -x * Math.sin(-0.5));
      post.castShadow = true;
      s.group.add(post);
    }
    const trail = new THREE.Mesh(new THREE.PlaneGeometry(14, 1.4).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#8b7a5a', roughness: 1 }));
    trail.position.set(-4, 0.03, 0.6); trail.rotation.y = 0.1; trail.receiveShadow = true;
    s.group.add(trail);
    return s;
  },

  async crossing(ctx) {
    const s = base(ctx, 'crossing');
    const cairn = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45 - i * 0.07, 0).scale(1.2, 0.55, 1), new THREE.MeshStandardMaterial({ color: '#8f8a7f', flatShading: true }));
      r.position.y = 0.2 + i * 0.36; r.rotation.y = i;
      r.castShadow = true;
      cairn.add(r);
    }
    s.group.add(cairn);
    const west = tag('West · Haudenosaunee, People of the Longhouse', 'far');
    west.position.set(-34, 6, -4);
    const east = tag('East · Wabanaki, People of the Dawn', 'far');
    east.position.set(30, 5, 6);
    s.group.add(west, east);
    return s;
  },

  async story(ctx) {
    const s = base(ctx, 'story');
    const a = ANCHORS.story;
    const f = new THREE.Vector3(-a.cam[0], 0, -a.cam[2]).normalize();
    const right = new THREE.Vector3(-f.z, 0, f.x);
    const names = STATIONS.find((x) => x.id === 'story').stones;
    const stones = names.map((name, k) => {
      const st = buildStone(k);
      const o = k - (names.length - 1) / 2;
      st.position.copy(right.clone().multiplyScalar(o * 1.25)).addScaledVector(f, Math.abs(o) ** 2 * -0.12 + 0.8);
      st.lookAt(st.position.clone().sub(f));
      const n = tag(String(k + 1), 'num stone');
      n.position.set(0, k % 2 ? 1.95 : 1.45, 0); // staggered so neighbouring names don't overlap
      st.add(n);
      s.group.add(st);
      return { st, n, name };
    });
    // how many stones each question lights: the war, the Peacemaker and Hiawatha's grief; then the strings
    // and the condolence; then the rest of the story, which the next stops tell
    const UPTO = [3, 5, names.length];
    let want = 0, shown = 0, timer = 0;
    const set = (k, on) => {
      const { st, n, name } = stones[k];
      st.material.emissiveIntensity = on ? 0.45 : 0;
      n.element.textContent = on ? `${k + 1} · ${name}` : String(k + 1);
      n.element.classList.toggle('lit', on);
    };
    return {
      ...s,
      update(dt) {
        if (shown >= want) return;
        timer += dt;
        if (timer > 0.35) { timer = 0; set(shown++, true); }
      },
      react(e) {
        if (e.type === 'task-start') {
          want = e.index ? UPTO[e.index - 1] : 0;
          while (shown > want) set(--shown, false);
        }
        if (e.type === 'task-done') { want = Math.max(want, UPTO[e.index] ?? names.length); timer = 0.35; }
      },
    };
  },

  async fire(ctx) {
    const s = base(ctx, 'fire');
    const fire = await ctx.make('council_fire');
    s.group.add(fire);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3;
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 1.5, 7).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#5d4330' }));
      log.position.set(Math.cos(a) * 2.6, 0.16, Math.sin(a) * 2.6);
      log.rotation.y = -a + Math.PI / 2;
      log.castShadow = true;
      s.group.add(log);
    }
    const flame = fire.getObjectByName('flame'), core = fire.getObjectByName('flame_core'), light = fire.getObjectByName('fire_light');
    return {
      ...s,
      update(dt, t) {
        const f = 1 + Math.sin(t * 13) * 0.08 + Math.sin(t * 7.3) * 0.06;
        if (flame) flame.scale.set(1, f, 1);
        if (core) core.scale.set(1, 2 - f, 1);
        if (light) light.intensity = 5 + f * 2;
      },
    };
  },

  async shells(ctx) {
    const s = base(ctx, 'shells');
    const bench = await ctx.make('bench');
    s.group.add(bench);
    const whelk = await ctx.make('shell_whelk');
    whelk.position.set(-0.05, 0.59, 0.05);
    const quahog = await ctx.make('shell_quahog');
    quahog.position.set(0.42, 0.6, 0.0);
    // the Blender quahog's open valve faces Blender +Y, which is away from this camera: turn it round
    const face = quahog.userData.source === 'glb' ? Math.PI : 0;
    quahog.rotation.y = face;
    const basket = await ctx.make('basket');
    basket.position.set(-1.2, 0, 0.5);
    const beads = buildBeadString(30, 0.03);
    beads.position.set(-0.35, 0.61, 0.22);
    s.group.add(whelk, quahog, basket, beads);
    const tw = tag('whelk'); tw.position.set(0, 0.35, 0); whelk.add(tw);
    const tq = tag('quahog'); tq.position.set(0.15, 0.35, 0); quahog.add(tq);
    const light = highlighter(s.group);
    let show = 0;
    return {
      ...s,
      picks: ['shell_whelk', 'shell_quahog'],
      update(dt, t) {
        quahog.position.y = 0.6 + show * (0.25 + Math.sin(t * 1.5) * 0.02);
        // lift it and tip the purple inside edge toward the student, swaying a little
        quahog.rotation.y = face + show * Math.sin(t * 0.8) * 0.35;
        quahog.rotation.x = show * 0.5;
      },
      react(e) {
        if (e.type === 'option' || e.type === 'select') light(e.pick);
        if (e.type === 'task-done') light(null); // the glow would wash out the purple edge
        if (e.type === 'task-done' && e.index === 0) show = 1;
        if (e.type === 'task-start' && e.index === 0) show = 0;
      },
    };
  },

  async belt(ctx) {
    const s = base(ctx, 'belt');
    const house = await ctx.make('longhouse');
    house.rotation.y = Math.PI / 2;
    house.position.set(0, 0, -13);
    s.group.add(house);
    const belt = await ctx.make('hiawatha_belt');
    belt.position.set(0, 1.2, 0);
    belt.rotation.x = -0.42;
    s.group.add(belt);
    const wood = new THREE.MeshStandardMaterial({ color: '#6b4d34' });
    for (const x of [-1.25, 1.25]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.8, 6), wood);
      post.position.set(x, 0.9, -0.2);
      post.castShadow = true;
      s.group.add(post);
    }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.6, 6).rotateZ(Math.PI / 2), wood);
    bar.position.set(0, 1.72, -0.2);
    s.group.add(bar);
    const ends = [tag('east →', 'dir'), tag('← west', 'dir')];
    ends[0].position.set(1.28, 0.08, 0); ends[1].position.set(-1.28, 0.08, 0);
    belt.add(...ends);
    const light = highlighter(belt);
    return {
      ...s,
      picks: ['slot_1', 'slot_2', 'slot_3', 'slot_4', 'slot_5', 'belt_line'],
      react(e) {
        // the squares question shows the four squares, the tree question shows the tree
        if (e.type === 'task-start') light([['slot_1', 'slot_2', 'slot_4', 'slot_5'], 'slot_3'][e.index] || null);
        if (e.type === 'select' || e.type === 'option') light(e.pick);
        if (e.type === 'task-done') light(null);
      },
    };
  },

  async council(ctx) {
    const s = base(ctx, 'council');
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 1.3, 7).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#5d4330' }));
      log.position.set(Math.cos(a) * 3, 0.15, Math.sin(a) * 3);
      log.rotation.y = -a + Math.PI / 2;
      log.castShadow = true;
      s.group.add(log);
    }
    const mat = new THREE.Mesh(new THREE.CircleGeometry(1.2, 24).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#8a6b4a' }));
    mat.position.y = 0.02;
    mat.receiveShadow = true;
    s.group.add(mat);
    for (let i = 0; i < 5; i++) {
      const str = buildBeadString(26, 0.032);
      str.position.set(-0.5 + i * 0.25, 0.04, -0.3 + (i % 2) * 0.3);
      str.rotation.y = 1.2 + i * 0.3;
      s.group.add(str);
    }
    return s;
  },

  async tree(ctx) {
    const s = base(ctx, 'tree');
    const tree = await ctx.make('tree_of_peace');
    s.group.add(tree);
    const mound = new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.18, 1), new THREE.MeshStandardMaterial({ color: '#6f6248', roughness: 1 }));
    mound.receiveShadow = true;
    s.group.add(mound);
    const eagle = tree.getObjectByName('eagle');
    const y0 = eagle?.position.y;
    return {
      ...s,
      update(dt, t) {
        if (eagle) { eagle.position.y = y0 + Math.sin(t * 0.8) * 0.06; eagle.rotation.y = Math.sin(t * 0.25) * 0.8; }
      },
    };
  },
};

export async function buildStation(id, ctx) {
  const st = await BUILD[id](ctx);
  return { picks: [], update() {}, react() {}, ...st };
}

// The trail: a worn earth footpath from the portage west past the Tree of Peace, running on out of sight
// the way the belt's path is left open. A ribbon laid on the ground mesh, its edges fading into the grass.
let dirtTex;
function dirt() {
  if (dirtTex) return dirtTex;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#a48b68'; g.fillRect(0, 0, 256, 256);
  let s = 11;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 2600; i++) { // grit
    const v = 120 + r() * 70;
    g.fillStyle = `rgba(${v},${v * 0.86},${v * 0.66},${0.25 + r() * 0.35})`;
    g.fillRect(r() * 256, r() * 256, 1 + r() * 2, 1 + r() * 2);
  }
  for (let i = 0; i < 70; i++) { // pebbles
    const v = 130 + r() * 60;
    g.fillStyle = `rgb(${v},${v * 0.97},${v * 0.92})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 1.5 + r() * 3, 1 + r() * 2, r() * 3, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < 12; i++) { // worn darker patches
    g.fillStyle = `rgba(90,70,48,${0.08 + r() * 0.1})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 20 + r() * 40, 8 + r() * 20, r() * 3, 0, Math.PI * 2); g.fill();
  }
  dirtTex = new THREE.CanvasTexture(c);
  dirtTex.colorSpace = THREE.SRGBColorSpace;
  dirtTex.wrapS = dirtTex.wrapT = THREE.RepeatWrapping;
  dirtTex.anisotropy = 4;
  return dirtTex;
}

export function buildTrail(scene, groundAt) {
  const ids = ['portage', 'crossing', 'story', 'fire', 'shells', 'belt', 'council', 'tree'];
  const pts = ids.map((id) => new THREE.Vector3(ANCHORS[id].at[0], 0, ANCHORS[id].at[1] + 6));
  pts.push(new THREE.Vector3(-300, 0, 4), new THREE.Vector3(-345, 0, 0));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const len = curve.getLength();
  const n = Math.ceil(len / 0.6);
  const across = [-1, -0.55, 0, 0.55, 1]; // fraction of the half-width
  const alpha = [0, 0.8, 1, 0.8, 0]; // soft edges
  const pos = [], uv = [], col = [], idx = [];
  const up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3();
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = curve.getPointAt(u), t = curve.getTangentAt(u).setY(0).normalize();
    side.crossVectors(up, t);
    const half = 0.85 + 0.2 * Math.sin(u * 97) + 0.1 * Math.sin(u * 311); // the path wanders in width
    across.forEach((a, j) => {
      const x = p.x + side.x * a * half, z = p.z + side.z * a * half;
      pos.push(x, Math.max(groundAt(x, z), 0) + 0.04, z);
      uv.push((a + 1) * 0.5, (u * len) / 2.2);
      const shade = 0.92 + 0.08 * Math.sin(u * 53 + j);
      col.push(shade, shade, shade, alpha[j]);
    });
    if (i < n) {
      const b = i * 5;
      for (let j = 0; j < 4; j++) idx.push(b + j, b + j + 5, b + j + 1, b + j + 1, b + j + 5, b + j + 6);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  g.setIndex(idx);
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
    map: dirt(), vertexColors: true, transparent: true, depthWrite: false, roughness: 1,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  }));
  mesh.receiveShadow = true;
  mesh.renderOrder = -2; // before the water and the canoes' water masks
  scene.add(mesh);
  return mesh;
}
