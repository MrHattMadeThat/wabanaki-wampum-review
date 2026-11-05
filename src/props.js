import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Procedural stand-ins. Each one follows the naming rules in docs/MODEL_BRIEF.md, so a Blender
// model dropped into public/models/ can replace it without changing any station code.

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });

function shadowed(obj) {
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return obj;
}

// ------------------------------------------------------------------ textures

let barkTex;
function birchBark() {
  if (barkTex) return barkTex;
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#e9dfc6'; g.fillRect(0, 0, 512, 128);
  let s = 3;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 260; i++) { // lenticels: short dark dashes along the grain
    g.fillStyle = `rgba(${60 + r() * 40},${45 + r() * 30},${35},${0.35 + r() * 0.5})`;
    g.fillRect(r() * 512, r() * 128, 4 + r() * 22, 1 + r() * 1.6);
  }
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(200,170,120,${0.15 + r() * 0.2})`;
    g.fillRect(r() * 512, r() * 128, 30 + r() * 80, 6 + r() * 10);
  }
  barkTex = new THREE.CanvasTexture(c);
  barkTex.colorSpace = THREE.SRGBColorSpace;
  barkTex.wrapS = barkTex.wrapT = THREE.RepeatWrapping;
  barkTex.repeat.set(3, 1);
  return barkTex;
}

// ------------------------------------------------------------------ canoe

// Hull shape: u runs bow to stern (0..1), a runs around the cross-section (-PI/2..PI/2).
function hull(L, B, D) {
  const half = (u) => { const s = Math.abs(2 * u - 1); return (B / 2) * Math.pow(Math.max(0, 1 - Math.pow(s, 2.2)), 0.7); };
  const top = (u) => D + 0.34 * Math.pow(Math.abs(2 * u - 1), 4);
  const bot = (u) => 0.13 * Math.pow(Math.abs(2 * u - 1), 3);
  const at = (u, a, k = 1) => new THREE.Vector3(
    (u - 0.5) * L,
    bot(u) + (top(u) - bot(u)) * (1 - Math.cos(a)),
    half(u) * Math.sin(a) * k,
  );
  return { at, top, half };
}

function hullSkin(h, nu = 64, na = 22) {
  const geo = new THREE.BufferGeometry();
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= nu; i++) {
    for (let j = 0; j <= na; j++) {
      const p = h.at(i / nu, -Math.PI / 2 + (Math.PI * j) / na);
      pos.push(p.x, p.y, p.z); uv.push(i / nu, j / na);
    }
  }
  for (let i = 0; i < nu; i++) for (let j = 0; j < na; j++) {
    const a = i * (na + 1) + j, b = a + na + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1); // wound so normals face outward
  }
  geo.setIndex(idx);
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  return geo;
}

function tubeThrough(points, r, seg = 4) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), points.length * 4, r, seg, false);
}

// A birch bark canoe in four named parts. `explode` on each part's userData says which way it flies apart.
export function buildCanoe({ plastic = false, length = 4.8 } = {}) {
  const L = length, B = length * 0.19, D = length * 0.075;
  const h = hull(L, B, D);
  const root = new THREE.Group();
  root.name = plastic ? 'canoe_plastic' : 'canoe_birch';

  const skinGeo = hullSkin(h);
  const skin = new THREE.Group();
  skin.name = 'part_skin';
  if (plastic) {
    skin.add(new THREE.Mesh(skinGeo, mat('#c4422f', { roughness: 0.35, side: THREE.DoubleSide })));
  } else {
    skin.add(new THREE.Mesh(skinGeo, mat('#ffffff', { map: birchBark(), side: THREE.FrontSide })));
    skin.add(new THREE.Mesh(skinGeo, mat('#b9824f', { side: THREE.BackSide }))); // the inner bark is warm orange-brown
  }
  skin.userData.explode = [0, 0, 0]; // the skin stays put; everything else lifts off it
  root.add(skin);

  // frame: ribs, gunwales and thwarts (white cedar, or aluminum on the store canoe)
  const frame = new THREE.Group();
  frame.name = 'part_frame';
  const cedar = mat(plastic ? '#b9bec4' : '#d9bd8e', plastic ? { metalness: 0.6, roughness: 0.4 } : {});
  const frameGeos = [];
  for (const side of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 24; i++) pts.push(h.at(0.015 + (0.97 * i) / 24, (side * Math.PI) / 2));
    frameGeos.push(tubeThrough(pts, L * 0.008));
  }
  for (const u of [0.3, 0.5, 0.7]) {
    const a = h.at(u, -Math.PI / 2), b = h.at(u, Math.PI / 2);
    frameGeos.push(new THREE.BoxGeometry(L * 0.012, L * 0.006, b.z - a.z).translate(a.x, a.y - L * 0.004, 0));
  }
  if (!plastic) {
    for (let k = 0; k < 15; k++) {
      const u = 0.13 + (0.74 * k) / 14;
      const pts = [];
      for (let j = 0; j <= 10; j++) pts.push(h.at(u, -Math.PI / 2 + (Math.PI * j) / 10, 0.94).multiply(new THREE.Vector3(1, 1, 1)).add(new THREE.Vector3(0, 0.012, 0)));
      frameGeos.push(tubeThrough(pts, L * 0.005, 3));
    }
  }
  frame.add(new THREE.Mesh(mergeGeometries(frameGeos), cedar));
  frame.userData.explode = [0, 0.9, 0];
  root.add(frame);

  if (!plastic) {
    // lashing: spruce root wrapped around the gunwales
    const lashing = new THREE.Group();
    lashing.name = 'part_lashing';
    const ring = new THREE.TorusGeometry(L * 0.011, L * 0.0028, 4, 8).rotateY(Math.PI / 2);
    const wraps = [];
    for (const side of [-1, 1]) for (let i = 0; i < 34; i++) {
      const p = h.at(0.04 + (0.92 * i) / 33, (side * Math.PI) / 2);
      for (const dx of [-0.012, 0, 0.012]) wraps.push(ring.clone().translate(p.x + dx * L, p.y, p.z));
    }
    lashing.add(new THREE.Mesh(mergeGeometries(wraps), mat('#8c6a43')));
    lashing.userData.explode = [0, 1.7, 0];
    root.add(lashing);

    // gum: dark spruce gum along the panel seams and the two stems
    const gum = new THREE.Group();
    gum.name = 'part_gum';
    const seams = [];
    for (const u of [0.004, 0.24, 0.5, 0.76, 0.996]) {
      const pts = [];
      for (let j = 0; j <= 12; j++) pts.push(h.at(u, -Math.PI / 2 + (Math.PI * j) / 12, 1.04));
      seams.push(tubeThrough(pts, L * 0.0045, 4));
    }
    gum.add(new THREE.Mesh(mergeGeometries(seams), mat('#2a1c13', { roughness: 0.35 })));
    gum.userData.explode = [0, 2.5, 0];
    root.add(gum);
  }
  shadowed(root);
  root.add(waterMask(h));
  return root;
}

// An invisible lid across the canoe's opening. It is drawn just before the water and only writes depth,
// so the water plane can't show through the floor of a floating canoe. GLB canoes get the same material
// on any object named `water_mask` (see models.js).
export function maskMaterial() {
  return new THREE.MeshBasicMaterial({ colorWrite: false, transparent: true, side: THREE.DoubleSide });
}
export function asWaterMask(mesh) {
  mesh.material = maskMaterial();
  mesh.renderOrder = -1;
  mesh.castShadow = mesh.receiveShadow = false;
  mesh.raycast = () => {};
  return mesh;
}
function waterMask(h, n = 40) {
  const pos = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const a = h.at(i / n, -Math.PI / 2), b = h.at(i / n, Math.PI / 2);
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const m = asWaterMask(new THREE.Mesh(g));
  m.name = 'water_mask';
  return m;
}

// ------------------------------------------------------------------ the Hiawatha Belt

// An invisible box the player can click; glow() makes it show.
const pickBox = () => {
  const m = new THREE.MeshBasicMaterial({ color: '#fff6c8', transparent: true, opacity: 0, depthWrite: false });
  m.userData.pickBox = true;
  return m;
};

export const BELT = { cols: 173, rows: 38 }; // 6,574 beads, one of the two counts in the reading

// The pattern. c runs west (0) to east (172); r runs bottom (0) to top (37), and the top points north.
const SQUARES = [148, 116, 56, 24]; // Mohawk, Oneida, Cayuga, Seneca (east to west)
const TREE = 86;
function inSquare(c, r, cx) {
  const dx = Math.abs(c - cx), dy = Math.abs(r - 18.5);
  return { edge: Math.max(dx, dy) <= 11 && Math.max(dx, dy) > 8, inside: Math.max(dx, dy) <= 8 };
}
function inTree(c, r) {
  const dx = Math.abs(c - TREE);
  if (dx <= 1 && r >= 4 && r <= 20) return true; // trunk
  if (r >= 4 && r <= 6 && dx <= 6 && dx >= 4 - (r - 4)) return true; // roots, reaching out
  const w = 11 - Math.abs(r - 24) * 0.95; // a broad crown
  if (r >= 14 && r <= 34 && dx <= w && dx > w - 3.2) return true;
  return false;
}
function isWhite(c, r) {
  for (const cx of SQUARES) {
    const s = inSquare(c, r, cx);
    if (s.edge) return true;
    if (s.inside) return false;
  }
  if (inTree(c, r)) return true;
  const inCrown = r >= 14 && r <= 34 && Math.abs(c - TREE) <= 11 - Math.abs(r - 24) * 0.95 - 3.2;
  if (inCrown) return false;
  return r >= 17 && r <= 20; // the path of peace, out past both ends
}

export function buildBelt({ length = 2.2 } = {}) {
  const { cols, rows } = BELT;
  const pitch = length / cols;
  const root = new THREE.Group();
  root.name = 'hiawatha_belt';
  const bead = new THREE.CylinderGeometry(pitch * 0.47, pitch * 0.47, pitch * 0.94, 7, 1);
  const beads = new THREE.InstancedMesh(bead, new THREE.MeshStandardMaterial({ roughness: 0.38, metalness: 0.05 }), cols * rows);
  const white = new THREE.Color('#efe9dc'), purple = new THREE.Color('#47284f'), c = new THREE.Color();
  const m = new THREE.Matrix4();
  let i = 0;
  for (let col = 0; col < cols; col++) for (let r = 0; r < rows; r++) {
    const x = (col - (cols - 1) / 2) * pitch, y = (r - (rows - 1) / 2) * pitch;
    m.makeRotationZ((Math.sin(col * 3.1 + r * 1.7) * 0.06)).setPosition(x, y, 0);
    beads.setMatrixAt(i, m);
    c.copy(isWhite(col, r) ? white : purple).offsetHSL(0, 0, (Math.sin(col * 12.9898 + r * 78.233) * 0.5) * 0.04);
    beads.setColorAt(i++, c);
  }
  beads.castShadow = beads.receiveShadow = true;
  root.add(beads);

  // pickable slots, east (1) to west (5)
  const slotCols = [148, 116, 86, 56, 24];
  slotCols.forEach((col, k) => {
    const x = (col - (cols - 1) / 2) * pitch;
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(pitch * 25, pitch * 34, pitch * 2),
      pickBox(),
    );
    box.position.set(x, 0, pitch);
    box.name = `slot_${k + 1}`;
    root.add(box);
  });
  const line = new THREE.Mesh(
    new THREE.BoxGeometry(length, pitch * 5, pitch * 2),
    pickBox(),
  );
  line.position.set(0, (18.5 - (rows - 1) / 2) * pitch, pitch * 1.5);
  line.name = 'belt_line';
  line.renderOrder = 2;
  root.add(line);
  return root;
}

// ------------------------------------------------------------------ shells

export function buildWhelk() {
  const pts = [];
  // profile from the spire tip down to the siphonal canal, with whorl bumps
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const y = 0.42 - t * 0.5;
    let r = t < 0.55 ? Math.pow(t / 0.55, 0.85) * 0.17 : 0.17 - Math.pow((t - 0.55) / 0.45, 0.7) * 0.15;
    r += Math.max(0, Math.sin(t * 34)) * 0.012 * (t < 0.6 ? 1 : 0);
    pts.push(new THREE.Vector2(Math.max(0.004, r), y));
  }
  const g = new THREE.LatheGeometry(pts, 20);
  const col = [], p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const band = 0.5 + 0.5 * Math.sin(p.getY(i) * 70 + Math.atan2(p.getZ(i), p.getX(i)) * 1.5);
    const c = new THREE.Color('#e9dcc2').lerp(new THREE.Color('#b99a72'), band * 0.45);
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, mat('#fff', { vertexColors: true, roughness: 0.5 }));
  m.rotation.z = 1.25;
  m.position.y = 0.16;
  const root = new THREE.Group();
  root.name = 'shell_whelk';
  root.add(m);
  return shadowed(root);
}

export function buildQuahog() {
  const root = new THREE.Group();
  root.name = 'shell_quahog';
  const valve = (open) => {
    const g = new THREE.SphereGeometry(0.16, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.42, 0.88);
    const outer = new THREE.Mesh(g, mat('#9b9386', { roughness: 0.75, side: THREE.FrontSide }));
    // inside: white, with the purple patch along the inside edge
    const ig = g.clone();
    const col = [], p = ig.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const rim = 1 - p.getY(i) / 0.067;
      const along = Math.atan2(p.getZ(i), p.getX(i));
      const patch = rim > 0.72 && Math.sin(along) > -0.35 ? 1 : 0;
      const c = new THREE.Color('#f3efe8').lerp(new THREE.Color('#4f2458'), patch);
      col.push(c.r, c.g, c.b);
    }
    ig.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const inner = new THREE.Mesh(ig, mat('#fff', { vertexColors: true, roughness: 0.4, side: THREE.BackSide }));
    const v = new THREE.Group();
    v.add(outer, inner);
    if (open) { v.rotation.x = Math.PI; v.position.set(0.34, 0.07, 0); }
    else v.position.y = 0.0;
    return v;
  };
  root.add(valve(false), valve(true));
  return shadowed(root);
}

// ------------------------------------------------------------------ dwellings and camp

export function buildWigwam() {
  const root = new THREE.Group();
  root.name = 'wigwam';
  const cone = new THREE.ConeGeometry(2.1, 3.6, 12, 1, true).translate(0, 1.8, 0);
  root.add(new THREE.Mesh(cone, mat('#fff', { map: birchBark(), side: THREE.DoubleSide, flatShading: true })));
  const poles = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const g = new THREE.CylinderGeometry(0.03, 0.04, 4.3, 4).translate(0, 2.15, 0);
    g.applyMatrix4(new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(Math.sin(a), 0, -Math.cos(a)), -0.5)); // lean in, crossing above the smoke hole
    g.translate(Math.cos(a) * 2.0, 0, Math.sin(a) * 2.0);
    poles.push(g);
  }
  root.add(new THREE.Mesh(mergeGeometries(poles), mat('#6b4d34')));
  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.3), mat('#3a2a1e'));
  door.position.set(0, 0.65, 1.62); door.rotation.x = -0.5;
  root.add(door);
  return shadowed(root);
}

export function buildLonghouse({ length = 14 } = {}) {
  const root = new THREE.Group();
  root.name = 'longhouse';
  const body = new THREE.CylinderGeometry(2.6, 2.6, length, 18, 1, true, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2);
  const shell = new THREE.Mesh(body, mat('#8b6e52', { side: THREE.DoubleSide, flatShading: true }));
  shell.scale.set(1, 1.25, 1);
  shell.position.y = 0;
  root.add(shell);
  for (const s of [-1, 1]) {
    const end = new THREE.Mesh(new THREE.CircleGeometry(2.6, 18, 0, Math.PI), mat('#7a5f46', { side: THREE.DoubleSide }));
    end.scale.y = 1.25;
    end.rotation.y = Math.PI / 2;
    end.position.x = (s * length) / 2;
    root.add(end);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.9), mat('#2b2018'));
    door.rotation.y = s * Math.PI / 2;
    door.position.set(s * (length / 2 + 0.02), 0.95, 0);
    root.add(door);
  }
  // bark panel lines
  const ribs = [];
  for (let i = 0; i <= 12; i++) {
    const x = -length / 2 + (i * length) / 12;
    ribs.push(new THREE.TorusGeometry(2.62, 0.04, 4, 18, Math.PI).rotateY(Math.PI / 2).scale(1, 1.25, 1).translate(x, 0, 0));
  }
  root.add(new THREE.Mesh(mergeGeometries(ribs), mat('#5a4330')));
  return shadowed(root);
}

export function buildFire() {
  const root = new THREE.Group();
  root.name = 'council_fire';
  const logs = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    logs.push(new THREE.CylinderGeometry(0.07, 0.08, 1.0, 6).rotateZ(Math.PI / 2 - 0.5).rotateY(a).translate(Math.cos(a) * 0.22, 0.2, Math.sin(a) * 0.22));
  }
  root.add(new THREE.Mesh(mergeGeometries(logs), mat('#4a3324')));
  const stones = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    stones.push(new THREE.DodecahedronGeometry(0.15, 0).scale(1, 0.6, 1).translate(Math.cos(a) * 0.75, 0.05, Math.sin(a) * 0.75));
  }
  root.add(new THREE.Mesh(mergeGeometries(stones), mat('#77736b', { flatShading: true })));
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.9, 8, 1, true), new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.85 }));
  flame.position.y = 0.6;
  flame.name = 'flame';
  const core = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.55, 8, 1, true), new THREE.MeshBasicMaterial({ color: '#fff0b0' }));
  core.position.y = 0.45;
  core.name = 'flame_core';
  const light = new THREE.PointLight('#ff9a4a', 6, 9, 1.6);
  light.position.y = 0.9;
  light.name = 'fire_light';
  root.add(flame, core, light);
  shadowed(root);
  flame.castShadow = core.castShadow = false;
  return root;
}

export function buildStone(i) {
  const g = new THREE.DodecahedronGeometry(0.5, 1).scale(0.7, 1.15, 0.45);
  const p = g.attributes.position;
  for (let k = 0; k < p.count; k++) p.setXYZ(k, p.getX(k) * (1 + Math.sin(k * 3.7 + i) * 0.06), p.getY(k), p.getZ(k));
  g.computeVertexNormals();
  g.translate(0, 0.5, 0);
  const m = new THREE.Mesh(g, mat('#9a958a', { flatShading: true, emissive: '#ffcf70', emissiveIntensity: 0 }));
  m.name = `stone_${i + 1}`;
  return shadowed(m);
}

// White pine with an eagle on top, roots reaching out along the ground.
export function buildTreeOfPeace() {
  const root = new THREE.Group();
  root.name = 'tree_of_peace';
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.75, 16, 9).translate(0, 8, 0), mat('#6a4b36'));
  root.add(trunk);
  const tiers = [];
  let s = 5;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 9; i++) {
    const y = 5 + i * 1.45;
    const spread = 4.2 - i * 0.32;
    for (let k = 0; k < 4; k++) {
      const a = r() * Math.PI * 2;
      tiers.push(new THREE.IcosahedronGeometry(1.6 - i * 0.08, 0).scale(1.6, 0.42, 1.2).rotateY(a).translate(Math.cos(a) * spread * 0.5, y + r() * 0.5, Math.sin(a) * spread * 0.5));
    }
  }
  const crown = new THREE.Mesh(mergeGeometries(tiers), mat('#355f3a', { flatShading: true }));
  root.add(crown);
  const roots = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const pts = [];
    for (let k = 0; k <= 8; k++) pts.push(new THREE.Vector3(Math.cos(a) * (0.6 + k * 2.4), 0.1 - k * 0.002, Math.sin(a) * (0.6 + k * 2.4) + Math.sin(k) * 0.5));
    roots.push(tubeThrough(pts, 0.18, 6));
  }
  const rootMesh = new THREE.Mesh(mergeGeometries(roots), mat('#efe9dc', { roughness: 0.6 }));
  rootMesh.name = 'roots';
  root.add(rootMesh);
  // eagle placeholder: body, wings, white head
  const eagle = new THREE.Group();
  eagle.name = 'eagle';
  eagle.add(new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8).scale(0.8, 0.8, 1.5), mat('#3b2a1e')));
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mat('#f3efe6'));
  head.position.set(0, 0.25, 0.32);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 6).rotateX(Math.PI / 2), mat('#e3b53a'));
  beak.position.set(0, 0.22, 0.48);
  for (const sgn of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.4), mat('#3b2a1e'));
    w.position.set(sgn * 0.45, 0.1, 0); w.rotation.z = sgn * 0.35;
    eagle.add(w);
  }
  eagle.add(head, beak);
  eagle.position.y = 18.4;
  root.add(eagle);
  return shadowed(root);
}

// ------------------------------------------------------------------ tools

export function buildSnowshoes() {
  const root = new THREE.Group();
  root.name = 'tool_snowshoes';
  for (const x of [-0.25, 0.25]) {
    const frame = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.018, 5, 24).scale(0.45, 1, 1).rotateX(Math.PI / 2), mat('#c7a77c'));
    const web = new THREE.Mesh(new THREE.CircleGeometry(0.41, 20).scale(0.44, 1, 1).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: '#8b6a48', wireframe: true }));
    const g = new THREE.Group();
    g.add(frame, web);
    g.position.set(x, 0.03, 0);
    root.add(g);
  }
  return shadowed(root);
}

export function buildToboggan() {
  const root = new THREE.Group();
  root.name = 'tool_toboggan';
  const pts = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    if (t < 0.8) pts.push(new THREE.Vector3(-1.1 + t * 2.4, 0.03, 0));
    else { const a = ((t - 0.8) / 0.2) * Math.PI * 0.9; pts.push(new THREE.Vector3(0.82 + Math.sin(a) * 0.22, 0.25 - Math.cos(a) * 0.22, 0)); }
  }
  const shape = new THREE.Shape();
  shape.moveTo(-0.22, -0.012); shape.lineTo(0.22, -0.012); shape.lineTo(0.22, 0.012); shape.lineTo(-0.22, 0.012);
  const geo = new THREE.ExtrudeGeometry(shape, { steps: 40, bevelEnabled: false, extrudePath: new THREE.CatmullRomCurve3(pts) });
  root.add(new THREE.Mesh(geo, mat('#d0a873')));
  return shadowed(root);
}

export function buildLeister() {
  const root = new THREE.Group();
  root.name = 'tool_leister';
  root.add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 2.4, 6).rotateZ(Math.PI / 2), mat('#8b6a48')));
  for (const s of [-1, 1]) {
    const pts = [new THREE.Vector3(1.15, 0, 0), new THREE.Vector3(1.35, 0, s * 0.07), new THREE.Vector3(1.55, 0, s * 0.05)];
    root.add(new THREE.Mesh(tubeThrough(pts, 0.012, 4), mat('#b28c5e')));
  }
  root.position.y = 0.04;
  return shadowed(root);
}

export function buildHooks() {
  const root = new THREE.Group();
  root.name = 'tool_hooks';
  for (let i = 0; i < 3; i++) {
    const g = new THREE.TorusGeometry(0.05, 0.008, 4, 10, Math.PI * 1.3).rotateX(Math.PI / 2);
    const m = new THREE.Mesh(g, mat('#efe6d2'));
    m.position.set(i * 0.14 - 0.14, 0.01, 0);
    root.add(m);
  }
  return shadowed(root);
}

export function buildKettle() {
  const root = new THREE.Group();
  root.name = 'trade_kettle';
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 10, 0, Math.PI * 2, Math.PI * 0.25, Math.PI * 0.75), mat('#b3672f', { metalness: 0.7, roughness: 0.35, side: THREE.DoubleSide }));
  body.position.y = 0.18;
  const bail = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.008, 4, 16, Math.PI), mat('#444'));
  bail.position.y = 0.33;
  root.add(body, bail);
  return shadowed(root);
}

export function buildBasket() {
  const root = new THREE.Group();
  root.name = 'basket';
  root.add(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.22, 14, 1, true).translate(0, 0.11, 0), mat('#b38a55', { side: THREE.DoubleSide, wireframe: false })));
  root.add(new THREE.Mesh(new THREE.CircleGeometry(0.22, 14).rotateX(-Math.PI / 2).translate(0, 0.01, 0), mat('#a07b4a')));
  return shadowed(root);
}

export function buildBench() {
  const root = new THREE.Group();
  root.name = 'bench';
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.7), mat('#8d6b4b'));
  top.position.y = 0.55;
  root.add(top);
  for (const x of [-0.65, 0.65]) for (const z of [-0.25, 0.25]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.55, 5), mat('#6b4d34'));
    leg.position.set(x, 0.27, z);
    root.add(leg);
  }
  const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.08, 10), mat('#8a867e', { flatShading: true }));
  stone.position.set(-0.5, 0.63, 0.05);
  stone.name = 'grinding_stone';
  root.add(stone);
  return shadowed(root);
}

export function buildBeadString(n = 40, spacing = 0.03) {
  const g = new THREE.CylinderGeometry(0.009, 0.009, 0.026, 6).rotateZ(Math.PI / 2);
  const m = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ roughness: 0.4 }), n);
  const mx = new THREE.Matrix4(), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    mx.makeTranslation((i - n / 2) * spacing, 0, Math.sin(i * 0.4) * 0.05);
    m.setMatrixAt(i, mx);
    m.setColorAt(i, c.set(i % 6 < 4 ? '#efe9dc' : '#47284f'));
  }
  m.castShadow = true;
  m.name = 'bead_string';
  return m;
}
