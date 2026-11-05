import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { buildStone, buildBeadString } from './props.js';
import { ANCHORS } from './layout.js';

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

// Lights up one pickable at a time.
function highlighter(group) {
  let lit = null;
  return (name) => {
    if (lit) glow(lit, false);
    lit = name ? group.getObjectByName(name) : null;
    if (lit) glow(lit, true);
  };
}

const BUILD = {
  async dawn(ctx) {
    const s = base(ctx, 'dawn');
    const canoe = await ctx.make('canoe_birch');
    canoe.position.set(0, -0.12, 0);
    canoe.rotation.y = 0.35;
    s.group.add(canoe);
    return {
      ...s,
      update(dt, t) { canoe.rotation.z = Math.sin(t * 0.9) * 0.03; canoe.rotation.x = Math.sin(t * 0.7) * 0.02; canoe.position.y = -0.12 + Math.sin(t * 1.1) * 0.03; },
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
    const parts = ['part_skin', 'part_frame', 'part_lashing', 'part_gum'].map((n) => canoe.getObjectByName(n)).filter(Boolean);
    parts.forEach((p) => { p.userData.home = p.position.clone(); p.userData.k = 0; });
    const assembled = new Set();
    let exploded = false;
    const light = highlighter(canoe);
    return {
      ...s,
      picks: parts.map((p) => p.name),
      update(dt) {
        for (const p of parts) {
          const goal = exploded && !assembled.has(p.name) ? 1 : 0;
          p.userData.k += (goal - p.userData.k) * Math.min(1, dt * 3);
          const e = p.userData.explode || [0, 0, 0];
          p.position.copy(p.userData.home).add(new THREE.Vector3(...e).multiplyScalar(p.userData.k));
        }
      },
      react(e) {
        if (e.type === 'task-start') { exploded = e.index === 0; assembled.clear(); light(null); }
        if (e.type === 'select') light(e.pick);
        if (e.type === 'item-correct' && e.pick) assembled.add(e.pick);
        if (e.type === 'task-done') light(null);
      },
    };
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
    plastic.add(crack);
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
    wig.position.set(-3.2, 0, -2.4);
    const place = async (id, x, z, ry = 0, y = 0) => {
      const o = await ctx.make(id);
      o.position.set(x, y, z); o.rotation.y = ry;
      s.group.add(o);
      return o;
    };
    s.group.add(wig);
    await place('tool_snowshoes', 1.4, 1.2, 0.3);
    await place('tool_toboggan', 2.4, -1.2, -0.4);
    await place('tool_leister', -0.4, 2.0, 0.15);
    await place('tool_hooks', 0.4, 0.6, 0.1);
    const kettle = await place('trade_kettle', 3.6, 1.6, 0);
    const kt = tag('Traded'); kt.position.set(0, 0.6, 0); kettle.add(kt);
    const light = highlighter(s.group);
    return {
      ...s,
      picks: ['tool_snowshoes', 'tool_toboggan', 'tool_leister', 'tool_hooks'],
      react(e) { if (e.type === 'select') light(e.pick); if (e.type === 'task-done') light(null); },
    };
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
    const stones = [];
    for (let k = 0; k < 8; k++) {
      const st = buildStone(k);
      const o = k - 3.5;
      st.position.copy(right.clone().multiplyScalar(o * 1.25)).addScaledVector(f, Math.abs(o) ** 2 * -0.12 + 0.8);
      st.lookAt(st.position.clone().sub(f));
      const n = tag(String(k + 1), 'num');
      n.position.set(0, 1.45, 0);
      n.visible = false;
      st.add(n);
      s.group.add(st);
      stones.push({ st, n });
    }
    let lit = -1, timer = 0;
    return {
      ...s,
      update(dt) {
        if (lit < 0 || lit >= stones.length) return;
        timer += dt;
        if (timer > 0.35) {
          timer = 0;
          const { st, n } = stones[lit];
          st.material.emissiveIntensity = 0.45; n.visible = true;
          lit++;
        }
      },
      react(e) {
        if (e.type === 'task-start' && e.index === 0) {
          lit = -1;
          stones.forEach(({ st, n }) => { st.material.emissiveIntensity = 0; n.visible = false; });
        }
        if (e.type === 'task-done' && e.index === 0) { lit = 0; timer = 0; }
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
        quahog.rotation.y = show * t * 0.6;
        quahog.rotation.x = show * -0.6;
      },
      react(e) {
        if (e.type === 'option' || e.type === 'select') light(e.pick);
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
    belt.position.set(0, 1.12, 0);
    belt.rotation.x = -0.42;
    s.group.add(belt);
    const wood = new THREE.MeshStandardMaterial({ color: '#6b4d34' });
    for (const x of [-1.25, 1.25]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.4, 6), wood);
      post.position.set(x, 0.7, -0.15);
      post.castShadow = true;
      s.group.add(post);
    }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.6, 6).rotateZ(Math.PI / 2), wood);
    bar.position.set(0, 1.36, -0.12);
    s.group.add(bar);
    const ends = [tag('east →', 'dir'), tag('← west', 'dir')];
    ends[0].position.set(1.28, 0.08, 0); ends[1].position.set(-1.28, 0.08, 0);
    belt.add(...ends);
    const light = highlighter(belt);
    return {
      ...s,
      picks: ['slot_1', 'slot_2', 'slot_3', 'slot_4', 'slot_5', 'belt_line'],
      react(e) {
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

// The path of peace: a white bead line four beads wide, from the portage west past the Tree of Peace,
// left open at the end the way the belt's line is.
export function buildBeadPath(scene, heightAt) {
  const ids = ['portage', 'crossing', 'story', 'fire', 'shells', 'belt', 'council', 'tree'];
  const pts = ids.map((id) => new THREE.Vector3(ANCHORS[id].at[0], 0, ANCHORS[id].at[1] + 6));
  pts.push(new THREE.Vector3(-300, 0, 4), new THREE.Vector3(-345, 0, 0));
  const curve = new THREE.CatmullRomCurve3(pts);
  const len = curve.getLength();
  const step = 0.42, n = Math.floor(len / step);
  const g = new THREE.CylinderGeometry(0.06, 0.06, 0.4, 6).rotateX(Math.PI / 2);
  const mesh = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: '#f1ece0', roughness: 0.45 }), n * 4);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  let k = 0;
  for (let i = 0; i < n; i++) {
    const p = curve.getPointAt(i / n), t = curve.getTangentAt(i / n);
    t.y = 0; t.normalize();
    const side = new THREE.Vector3().crossVectors(up, t);
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), t);
    for (let r = 0; r < 4; r++) {
      const o = (r - 1.5) * 0.13;
      const x = p.x + side.x * o, z = p.z + side.z * o;
      m.compose(new THREE.Vector3(x, Math.max(heightAt(x, z), 0) + 0.06, z), q, new THREE.Vector3(1, 1, 1));
      mesh.setMatrixAt(k++, m);
    }
  }
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}
