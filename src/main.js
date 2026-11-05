import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { STATIONS, BIG_IDEA } from './content.js';
import { ANCHORS } from './layout.js';
import { buildWorld, heightAt, groundAt } from './world.js';
import { loadManifest, makeModel } from './models.js';
import { buildStation, buildTrail } from './stations.js';
import { renderTask, clearTask } from './tasks.js';
import '@fontsource-variable/fraunces';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import './style.css';

const params = new URLSearchParams(location.search);
const low = params.get('q') === 'low';
const free = params.has('free'); // a teacher can jump to any stop
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (id) => document.getElementById(id);
const V = (a) => new THREE.Vector3(...a);

// ------------------------------------------------------------------ renderer

const host = $('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: params.has('capture') });
renderer.setPixelRatio(Math.min(devicePixelRatio, low ? 1 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = !low;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
host.appendChild(renderer.domElement);

const labels = new CSS2DRenderer();
Object.assign(labels.domElement.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
host.appendChild(labels.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 3000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.rotateSpeed = 0.6;
controls.enabled = false;

// Keep the stop centred in the space beside the panel, not behind it.
function resize() {
  const w = host.clientWidth, h = host.clientHeight;
  const panel = $('panel');
  const open = !document.body.classList.contains('collapsed') && !document.body.classList.contains('titled');
  const wide = innerWidth > 820;
  const beside = wide && open ? panel.offsetWidth + 24 : 0;
  const below = !wide && open ? Math.round(h * 0.56) : 0; // phones: the panel is a bottom sheet
  renderer.setSize(w, h);
  labels.setSize(w, h);
  camera.aspect = (w + beside) / (h + below);
  if (beside || below) camera.setViewOffset(w + beside, h + below, beside, below, w, h);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);

// ------------------------------------------------------------------ world and stops

const world = buildWorld(scene, renderer);
await loadManifest();
const ctx = { make: makeModel, heightAt };
const stages = await Promise.all(STATIONS.map((s) => buildStation(s.id, ctx)));
stages.forEach((s) => scene.add(s.group));
buildTrail(scene, groundAt);

const poses = STATIONS.map((s) => {
  const a = ANCHORS[s.id];
  const base = new THREE.Vector3(a.at[0], a.water ? 0 : heightAt(a.at[0], a.at[1]), a.at[1]);
  const eye = base.clone().add(V(a.cam));
  eye.y = Math.max(eye.y, heightAt(eye.x, eye.z) + 1.2, 1.2);
  return { eye, look: base.clone().add(V(a.look)) };
});

// ------------------------------------------------------------------ progress

const SAVE = 'open-path-v3'; // v3: the 2026-11-05 question rework (old saves would mark the wrong questions done)
function loadSave() {
  try { return JSON.parse(localStorage.getItem(SAVE)) || null; } catch { return null; }
}
function store() {
  try { localStorage.setItem(SAVE, JSON.stringify(save)); } catch { /* private window: progress lasts this visit only */ }
}
let save = loadSave() || { reached: 0, beads: {} };
const beadsFor = (id) => (save.beads[id] ||= []);
const stationDone = (i) => beadsFor(STATIONS[i].id).filter(Boolean).length === STATIONS[i].tasks.length;

// The bead string across the top: one bead per task. Purple for first try (the rare colour), white otherwise.
function drawString() {
  const bar = $('string');
  bar.replaceChildren(...STATIONS.map((s, i) => {
    const b = document.createElement('button');
    b.className = `knot${i === current ? ' here' : ''}`;
    b.type = 'button';
    b.title = s.title;
    b.setAttribute('aria-label', `${i + 1}. ${s.title}`);
    b.disabled = !(free || i <= save.reached) || travel != null;
    b.onclick = () => goTo(i);
    const got = beadsFor(s.id);
    s.tasks.forEach((_, k) => {
      const d = document.createElement('span');
      d.className = `bead ${got[k] || ''}`;
      b.append(d);
    });
    return b;
  }));
}

// ------------------------------------------------------------------ the panel

let current = 0, taskIndex = 0, controller = null;

// Which question to open when arriving: null for the first unanswered one, 'last' when stepping back.
let arriveAt = null;

function openStation(i) {
  const s = STATIONS[i], stage = stages[i];
  $('place').textContent = s.place;
  $('intro').textContent = s.intro;
  $('caption').hidden = false;
  $('title').textContent = s.title;
  $('step').textContent = `Stop ${i + 1} of ${STATIONS.length}`;
  const got = beadsFor(s.id);
  let first = s.tasks.findIndex((_, k) => !got[k]);
  if (arriveAt === 'last') first = s.tasks.length - 1;
  arriveAt = null;
  // replay what is already solved, so the stage looks the way the student left it
  for (let k = 0; k < (first < 0 ? s.tasks.length : first); k++) if (got[k]) stage.react({ type: 'task-done', index: k });
  if (first < 0) showStationDone(i);
  else showTask(i, first);
  drawString();
  $('task').scrollTop = 0;
}

// ------------------------------------------------------------------ labels on the 3D parts a question asks about

let itemTags = [];
function clearItemTags() {
  itemTags.forEach(({ tag }) => tag.removeFromParent());
  itemTags = [];
}
// One label above each part a match question links to. Clicking it selects that part; dropping an answer
// on it answers for that part; once answered it shows the answer.
function addItemTags(stage, task) {
  clearItemTags();
  if (task.type !== 'match') return;
  stage.group.updateMatrixWorld(true); // the stop may not have been drawn yet
  const box = new THREE.Box3(), top = new THREE.Vector3();
  task.items.forEach((item, k) => {
    const obj = item.pick && stage.group.getObjectByName(item.pick);
    if (!obj) return;
    box.setFromObject(obj, true);
    top.set((box.min.x + box.max.x) / 2, box.max.y, (box.min.z + box.max.z) / 2);
    const d = document.createElement('button');
    d.type = 'button';
    d.className = 'tag item';
    d.dataset.pick = item.pick;
    d.innerHTML = '<b></b><span></span>';
    d.firstChild.textContent = String(k + 1);
    d.lastChild.textContent = item.label;
    d.onclick = () => controller?.pick(item.pick);
    const tag = new CSS2DObject(d);
    tag.center.set(0.5, 1.15);
    tag.position.copy(obj.worldToLocal(top.clone()));
    obj.add(tag);
    itemTags.push({ tag, pick: item.pick, el: d });
  });
}
function tagsReact(e) {
  if (e.type === 'select') itemTags.forEach((t) => t.el.classList.toggle('current', t.pick === e.pick));
  if (e.type === 'item-correct') {
    const t = itemTags.find((x) => x.pick === e.pick);
    if (t) { t.el.classList.remove('current'); t.el.classList.add('done'); t.el.lastChild.textContent = e.answer; }
  }
}
// The 3D part (or its label) under a screen point, for answers dragged onto the scene.
function dropTarget(x, y) {
  const tag = document.elementsFromPoint(x, y).find((e) => e.classList?.contains('item') && e.dataset.pick);
  if (tag) return tag.dataset.pick;
  return pickAt({ clientX: x, clientY: y });
}

function showTask(i, k) {
  const s = STATIONS[i], stage = stages[i];
  taskIndex = k;
  $('count').textContent = s.tasks.length > 1 ? `Question ${k + 1} of ${s.tasks.length}` : '';
  stage.react({ type: 'task-start', index: k });
  const next = $('next');
  next.hidden = true;
  addItemTags(stage, s.tasks[k]);
  drawNav(i, k);
  $('task').scrollTop = 0;
  controller = renderTask($('task'), s.tasks[k], {
    emit: (e) => { stage.react(e); tagsReact(e); },
    dropTarget,
    done: ({ firstTry }) => {
      const got = beadsFor(s.id);
      if (!got[k]) got[k] = firstTry ? 'purple' : 'white';
      store();
      drawString();
      stage.react({ type: 'task-done', index: k });
      controller = null;
      drawNav(i, k);
      const last = k === s.tasks.length - 1;
      next.textContent = last ? (i === STATIONS.length - 1 ? 'Finish the path' : 'Carry on along the path →') : 'Next question →';
      next.onclick = () => (last ? leave(i) : showTask(i, k + 1));
      next.hidden = false;
      next.focus({ preventScroll: true });
    },
  });
}

function showStationDone(i) {
  clearTask();
  clearItemTags();
  const s = STATIONS[i];
  $('count').textContent = '';
  const box = $('task');
  box.replaceChildren();
  const p = document.createElement('p');
  p.className = 'explain';
  p.textContent = 'You have finished this stop.';
  const again = document.createElement('button');
  again.className = 'secondary';
  again.type = 'button';
  again.textContent = 'Try these questions again';
  again.onclick = () => showTask(i, 0);
  box.append(p, again);
  const next = $('next');
  next.hidden = false;
  next.textContent = i === STATIONS.length - 1 ? 'Finish the path' : 'Carry on along the path →';
  next.onclick = () => leave(i);
  controller = null;
  drawNav(i, -1);
  void s;
}

// Back and Next in the panel's header, with a dot per question at this stop. k is -1 on the "finished" screen.
// Back steps to the previous question, or to the last question of the previous stop. Next only moves past
// a question that has been answered; the dots jump to any question here.
function drawNav(i, k) {
  const s = STATIONS[i], got = beadsFor(s.id), n = s.tasks.length;
  const prev = $('prev'), fwd = $('fwd');
  prev.disabled = k === 0 && i === 0;
  prev.onclick = () => {
    if (k === -1) showTask(i, n - 1);
    else if (k > 0) showTask(i, k - 1);
    else { arriveAt = 'last'; goTo(i - 1); }
  };
  const answered = k === -1 || !!got[k];
  fwd.disabled = !answered || (k === -1 && i === STATIONS.length - 1);
  fwd.onclick = () => (k >= 0 && k < n - 1 ? showTask(i, k + 1) : leave(i));
  fwd.title = k >= 0 && k < n - 1 ? 'Next question' : 'Next stop';
  $('qdots').replaceChildren(...s.tasks.map((_, j) => {
    const d = document.createElement('button');
    d.type = 'button';
    d.className = `qdot ${got[j] || ''}${j === k ? ' here' : ''}`;
    d.setAttribute('aria-label', `Question ${j + 1}${got[j] ? ', answered' : ''}`);
    d.onclick = () => showTask(i, j);
    return d;
  }));
}

function leave(i) {
  if (i === STATIONS.length - 1) return finish();
  save.reached = Math.max(save.reached, i + 1);
  store();
  goTo(i + 1);
}

// ------------------------------------------------------------------ travel

let travel = null;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Only the stop you are at shows its labels. Others go on layer 1, which the camera doesn't see.
function showLabels(active) {
  stages.forEach((s, i) => s.group.traverse((o) => { if (o.isCSS2DObject) o.layers.set(i === active ? 0 : 1); }));
}

function goTo(i, instant = false) {
  if (travel) return;
  clearTask();
  clearItemTags();
  $('caption').hidden = true;
  showLabels(-1);
  const from = { eye: camera.position.clone(), look: controls.target.clone(), p: current / (STATIONS.length - 1) };
  const to = poses[i];
  const dist = from.eye.distanceTo(to.eye);
  const dur = instant ? 0 : reducedMotion ? 0.6 : Math.min(7, 2.4 + dist / 45);
  travel = { from, to, i, t: 0, dur, dist };
  controls.enabled = false;
  document.body.classList.add('travelling');
  drawString();
}

const tmpEye = new THREE.Vector3(), tmpLook = new THREE.Vector3(), ahead = new THREE.Vector3();
function stepTravel(dt) {
  const tr = travel;
  tr.t = tr.dur ? Math.min(1, tr.t + dt / tr.dur) : 1;
  const k = ease(tr.t);
  tmpEye.lerpVectors(tr.from.eye, tr.to.eye, k);
  tmpEye.y += Math.sin(Math.PI * k) * Math.min(26, 4 + tr.dist * 0.08); // rise up and glide over
  tmpEye.y = Math.max(tmpEye.y, heightAt(tmpEye.x, tmpEye.z) + 2);
  tmpLook.lerpVectors(tr.from.look, tr.to.look, k);
  // mid-flight, look ahead down the path instead of at the ground
  ahead.subVectors(tr.to.eye, tr.from.eye).setY(0).normalize().multiplyScalar(30).add(tmpEye).setY(tmpEye.y - 6);
  tmpLook.lerp(ahead, Math.sin(Math.PI * k) * 0.7);
  camera.position.copy(tmpEye);
  controls.target.copy(tmpLook);
  camera.lookAt(tmpLook);
  const p = THREE.MathUtils.lerp(tr.from.p, tr.i / (STATIONS.length - 1), k);
  world.setTime(p, tmpLook);
  if (tr.t >= 1) arrive(tr.i);
}

function arrive(i) {
  travel = null;
  current = i;
  resize(); // the panel may have just appeared
  const { eye, look } = poses[i];
  camera.position.copy(eye);
  controls.target.copy(look);
  const d = eye.distanceTo(look);
  controls.minDistance = d * 0.45;
  controls.maxDistance = d * 1.7;
  controls.minAzimuthAngle = -Infinity;
  controls.maxAzimuthAngle = Infinity;
  controls.update();
  const az = controls.getAzimuthalAngle();
  controls.minAzimuthAngle = az - 1.0;
  controls.maxAzimuthAngle = az + 1.0;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = 1.48;
  controls.enabled = true;
  document.body.classList.remove('travelling');
  showLabels(i);
  world.setTime(i / (STATIONS.length - 1), look);
  openStation(i);
}

// ------------------------------------------------------------------ clicking things in the scene

const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let downAt = null;

function pickAt(ev) {
  const stage = stages[current];
  if (!stage.picks.length || travel) return null;
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const objs = stage.picks.map((n) => stage.group.getObjectByName(n)).filter(Boolean);
  for (const hit of ray.intersectObjects(objs, true)) {
    for (let o = hit.object; o; o = o.parent) if (stage.picks.includes(o.name)) return o.name;
  }
  return null;
}
renderer.domElement.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
  const name = pickAt(e);
  if (name && controller) controller.pick(name);
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (e.buttons) return;
  renderer.domElement.style.cursor = controller && pickAt(e) ? 'pointer' : '';
});

// ------------------------------------------------------------------ title and finish

function start(fresh) {
  if (fresh) { save = { reached: 0, beads: {} }; store(); }
  $('title-screen').hidden = true;
  document.body.classList.remove('titled');
  const i = Math.min(save.reached, STATIONS.length - 1);
  if (i === 0) arrive(0);
  else goTo(i);
}

function finish() {
  clearTask();
  const all = STATIONS.flatMap((s) => beadsFor(s.id));
  const purple = all.filter((b) => b === 'purple').length;
  const total = STATIONS.reduce((n, s) => n + s.tasks.length, 0);
  $('finish-count').textContent = `${all.filter(Boolean).length} of ${total} beads strung. ${purple} purple.`;
  const list = $('finish-review');
  list.replaceChildren();
  STATIONS.forEach((s, i) => {
    const whites = beadsFor(s.id).filter((b) => b === 'white').length;
    if (!whites) return;
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'linkish';
    b.textContent = s.title;
    b.onclick = () => { $('finish').hidden = true; save.beads[s.id] = []; store(); goTo(i); };
    li.append(b, document.createTextNode(` · ${whites} white`));
    list.append(li);
  });
  $('finish-none').hidden = list.children.length > 0;
  $('finish').hidden = false;
}

$('big-idea').textContent = BIG_IDEA;
$('finish-idea').textContent = BIG_IDEA;
$('start').onclick = () => start(false);
$('restart').onclick = () => start(true);
$('restart').hidden = !loadSave();
$('start').textContent = save.reached > 0 ? 'Continue the path' : 'Start at dawn';
$('again').onclick = () => { $('finish').hidden = true; start(true); };
$('collapse').onclick = () => {
  document.body.classList.toggle('collapsed');
  $('collapse').setAttribute('aria-expanded', String(!document.body.classList.contains('collapsed')));
  resize();
};

// ------------------------------------------------------------------ loop

const clock = new THREE.Clock();
let t = 0;
resize();
camera.position.copy(poses[0].eye);
controls.target.copy(poses[0].look);
camera.lookAt(poses[0].look);
world.setTime(0, poses[0].look);
showLabels(-1);
drawString();
document.body.classList.remove('loading');

const jump = STATIONS.findIndex((s) => s.id === params.get('stop'));
if (jump >= 0) { $('title-screen').hidden = true; document.body.classList.remove('titled'); arrive(jump); }

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  t += dt;
  if (travel) stepTravel(dt);
  else if (document.body.classList.contains('titled')) {
    // slow drift over the bay while the title is up
    const p = poses[0];
    camera.position.copy(p.eye).add(new THREE.Vector3(Math.sin(t * 0.1) * 2, 0.5 + Math.sin(t * 0.13) * 0.4, Math.cos(t * 0.1) * 1.5));
    camera.lookAt(p.look);
  } else controls.update();
  const near = travel ? -1 : current;
  stages.forEach((s, i) => { if (Math.abs(i - (near < 0 ? travel.i : near)) <= 1) s.update(dt, t); });
  world.tick(t, camera);
  renderer.render(scene, camera);
  labels.render(scene, camera);
});

// for checks in the browser console
window.path = { goTo, arrive, stages, poses, camera, controls, render: () => renderer.render(scene, camera), get current() { return current; }, get save() { return save; } };
