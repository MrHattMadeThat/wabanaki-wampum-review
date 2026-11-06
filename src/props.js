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

// The pattern, traced from a 1909 photograph of the belt and the Haudenosaunee flag drawn from it.
// c runs west (0) to east (172); t counts rows down from the top edge (0..37), and the top points north.
// Wampum beads are about twice as long as they are wide, so one column is half as wide as one row is tall.
const OUTER = [155, 17]; // Mohawk (east) and Seneca (west)
const INNER = [118, 54]; // Oneida and Cayuga
const TREE = 86; // the Onondaga, in the centre
function square(c, t, cx, half, top, bottom) {
  const dx = Math.abs(c - cx);
  if (dx > half || t < top || t > bottom) return null;
  return dx > half - 3 || t < top + 2 || t > bottom - 2 ? 'edge' : 'inside'; // sides 3 beads wide, 2 rows deep
}
function inTree(c, t) {
  const dx = Math.abs(c - TREE);
  if (t >= 27 && t <= 32) return dx <= 1; // the stem
  if (t < 10 || t > 27) return false;
  // a solid diamond, pointed at the top and bottom, widest a little below its middle
  const half = t <= 19 ? (12 * (t - 10)) / 9 : (12 * (27 - t)) / 8;
  return dx <= half + 0.4;
}
function isWhite(c, t) {
  for (const cx of OUTER) { const s = square(c, t, cx, 9, 13, 24); if (s) return s === 'edge'; }
  for (const cx of INNER) { const s = square(c, t, cx, 12, 12, 25); if (s) return s === 'edge'; }
  if (inTree(c, t)) return true;
  // the path of peace: out to both ends between the squares, and a little lower where it meets the tree
  const between = c > INNER[1] + 12 && c < INNER[0] - 12;
  if (!between) return t === 18 || t === 19;
  return t === 21 || t === 22;
}

export function buildBelt({ length = 2.2 } = {}) {
  const { cols, rows } = BELT;
  const pitch = length / cols; // across one bead
  const rowPitch = pitch * 2; // along one bead
  const root = new THREE.Group();
  root.name = 'hiawatha_belt';
  const bead = new THREE.CylinderGeometry(pitch * 0.47, pitch * 0.47, rowPitch * 0.94, 7, 1);
  const beads = new THREE.InstancedMesh(bead, new THREE.MeshStandardMaterial({ roughness: 0.38, metalness: 0.05 }), cols * rows);
  const white = new THREE.Color('#efe9dc'), purple = new THREE.Color('#47284f'), c = new THREE.Color();
  const m = new THREE.Matrix4();
  let i = 0;
  for (let col = 0; col < cols; col++) for (let t = 0; t < rows; t++) {
    const x = (col - (cols - 1) / 2) * pitch, y = ((rows - 1) / 2 - t) * rowPitch;
    m.makeRotationZ(Math.sin(col * 3.1 + t * 1.7) * 0.03).setPosition(x, y, 0);
    beads.setMatrixAt(i, m);
    c.copy(isWhite(col, t) ? white : purple).offsetHSL(0, 0, (Math.sin(col * 12.9898 + t * 78.233) * 0.5) * 0.04);
    beads.setColorAt(i++, c);
  }
  beads.castShadow = beads.receiveShadow = true;
  root.add(beads);

  // pickable slots, east (1) to west (5)
  [OUTER[0], INNER[0], TREE, INNER[1], OUTER[1]].forEach((col, k) => {
    const box = new THREE.Mesh(new THREE.BoxGeometry(pitch * 27, rowPitch * 24, pitch * 2), pickBox());
    box.position.set((col - (cols - 1) / 2) * pitch, ((rows - 1) / 2 - 20) * rowPitch, pitch);
    box.name = `slot_${k + 1}`;
    root.add(box);
  });
  const line = new THREE.Mesh(new THREE.BoxGeometry(length, rowPitch * 3, pitch * 2), pickBox());
  line.position.set(0, ((rows - 1) / 2 - 18.5) * rowPitch, pitch * 1.5);
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

// ------------------------------------------------------------------ bow and arrow

// A bow and an arrow hung on a drying rack, in four named parts like the canoe. They hang in the rack's plane,
// which faces local +z (the viewer): the bow's arc on top with its string under it, the arrow below.
// The wood stays put; the other parts move off it in that plane when exploded, so they don't hide each other.
export function buildBow() {
  const root = new THREE.Group();
  root.name = 'bow_set';
  const pole = mat('#6b4d34');
  for (const x of [-0.82, 0.82]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.7, 6), pole);
    post.position.set(x, 0.85, -0.06);
    root.add(post);
  }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 6).rotateZ(Math.PI / 2), pole);
  bar.position.set(0, 1.66, -0.06);
  root.add(bar);

  const half = 0.66, bulge = 0.2, Ys = 1.06; // the bow: tip to tip along x, its string at y = Ys
  const r = 0.02;
  const bowAt = (t) => new THREE.Vector3(half * t, Ys + bulge * (1 - t * t) - 0.03 * t ** 4, 0);
  const Ya = 0.84, tail = -0.48, neck = 0.36; // the arrow, under the bow, pointing right

  // part: wood (the bow stave, the arrow shaft, and the feathers that ride along with the shaft)
  const wood = new THREE.Group();
  wood.name = 'bow_wood';
  const pts = [];
  for (let i = 0; i <= 24; i++) pts.push(bowAt(-1 + i / 12));
  wood.add(new THREE.Mesh(tubeThrough(pts, r, 6), mat('#6e4424')));
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.4, r * 1.4, 0.13, 8).rotateZ(Math.PI / 2), mat('#5e3b20'));
  grip.position.copy(bowAt(0));
  wood.add(grip);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, neck - tail, 6).rotateZ(Math.PI / 2), mat('#c9a26b'));
  shaft.position.set((neck + tail) / 2, Ya, 0);
  wood.add(shaft);
  for (const a of [Math.PI / 2, Math.PI / 2 + (2 * Math.PI) / 3, Math.PI / 2 + (4 * Math.PI) / 3]) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.03).translate(0, 0.017, 0), mat('#7c6d5c', { side: THREE.DoubleSide }));
    f.rotation.x = a;
    f.position.set(tail + 0.09, Ya, 0);
    wood.add(f);
  }
  wood.userData.explode = [0, 0, 0];
  root.add(wood);

  // a big invisible target for a thin or small part, so it is easy to click or drop on
  const hit = (w, h, x, y) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), new THREE.MeshBasicMaterial({ visible: false }));
    m.position.set(x, y, 0);
    return m;
  };

  // part: sinew (the bowstring)
  const sinew = new THREE.Group();
  sinew.name = 'bow_sinew';
  const a = bowAt(-1), b = bowAt(1);
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, a.distanceTo(b), 5).rotateZ(Math.PI / 2), mat('#eadcbc'));
  string.position.copy(a).add(b).multiplyScalar(0.5);
  sinew.add(string, hit(1.3, 0.07, 0, string.position.y));
  sinew.userData.explode = [-0.36, 0.3, 0.04]; // up and to the left, clear of the bow's label
  root.add(sinew);

  // part: flint (the arrowhead, a flat leaf-shaped point)
  const flint = new THREE.Group();
  flint.name = 'bow_flint';
  const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 0).scale(1.4, 0.6, 0.2), mat('#4d535b', { roughness: 0.35, flatShading: true }));
  head.position.set(neck + 0.065, Ya, 0);
  flint.add(head, hit(0.2, 0.12, neck + 0.065, Ya));
  flint.userData.explode = [0.2, 0.2, 0.04];
  root.add(flint);

  // part: gum (the dark glue sealing the head into the shaft)
  const gum = new THREE.Group();
  gum.name = 'bow_gum';
  const blob = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 6).scale(2.2, 1, 1), mat('#2a1c13', { roughness: 0.3 }));
  blob.position.set(neck, Ya, 0);
  gum.add(blob, hit(0.14, 0.09, neck, Ya));
  gum.userData.explode = [0.16, -0.24, 0.04];
  root.add(gum);

  return shadowed(root);
}

// ------------------------------------------------------------------ the dawn shore (stand-ins for docs/MODEL_BRIEF.md priority 4)

// A summer fishing camp's drying rack: two pole tripods, a crossbar, split fish hanging plainly.
export function buildFishRack() {
  const root = new THREE.Group();
  root.name = 'fish_rack';
  const pole = mat('#8a6d4e');
  const geos = [];
  for (const x of [-1.2, 1.2]) for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    const g = new THREE.CylinderGeometry(0.025, 0.035, 1.8, 5).translate(0, 0.9, 0);
    g.applyMatrix4(new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(Math.sin(a), 0, -Math.cos(a)), 0.28));
    geos.push(g.translate(x + Math.cos(a) * 0.25, 0, Math.sin(a) * 0.25));
  }
  geos.push(new THREE.CylinderGeometry(0.025, 0.025, 2.9, 5).rotateZ(Math.PI / 2).translate(0, 1.55, 0));
  root.add(new THREE.Mesh(mergeGeometries(geos), pole));
  const flesh = mat('#c98a6c', { roughness: 0.6 }), skin = mat('#5d6266', { roughness: 0.5 });
  for (let i = 0; i < 6; i++) {
    const x = -0.95 + i * 0.38;
    const fish = new THREE.Group();
    const side = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 6).scale(0.13, 0.62, 0.03), flesh);
    const back = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 6).scale(0.06, 0.6, 0.05), skin);
    back.position.z = -0.02;
    fish.add(side, back);
    fish.position.set(x, 1.55 - 0.36, 0);
    fish.rotation.y = (i % 2 ? 0.25 : -0.2);
    root.add(fish);
  }
  return shadowed(root);
}

// Four sea-rounded granite boulders. The bottom of each is darker and wet, with a skirt of rockweed:
// the Fundy tide goes out a long way.
export function buildShoreRocks() {
  const root = new THREE.Group();
  root.name = 'shore_rocks';
  const dry = new THREE.Color('#9c918b'), wet = new THREE.Color('#4d4842'), weed = new THREE.Color('#5f5426');
  [0.5, 1, 1.6, 2.5].forEach((size, k) => {
    const g = new THREE.IcosahedronGeometry(0.5, 2);
    const pos = g.attributes.position, col = [];
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i);
      const n = 1 + (Math.sin(v.x * 9.1 + k) + Math.sin(v.z * 7.3 - k * 2) + Math.sin(v.y * 11.7)) * 0.05;
      v.multiplyScalar(n).multiply(new THREE.Vector3(1.25, 0.7, 1));
      v.y = Math.max(v.y, -0.12); // a flat-ish base sitting in the sand
      pos.setXYZ(i, v.x * size, (v.y + 0.12) * size, v.z * size);
      const hgt = (v.y + 0.12) / 0.47; // 0 at the base, 1 at the top
      c.copy(dry).offsetHSL(0, 0, Math.sin(v.x * 23 + v.z * 17) * 0.03);
      c.lerp(wet, 1 - Math.min(1, Math.max(0, (hgt - 0.18) / 0.14)));
      if (hgt < 0.16) c.lerp(weed, 0.75);
      col.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat('#fff', { vertexColors: true, flatShading: true, roughness: 0.9 }));
    m.name = `rock_${k + 1}`;
    m.position.x = k * 2.5; // the site moves each one where it wants it
    root.add(m);
  });
  return shadowed(root);
}

// Two silver-grey logs washed up above the tide line.
export function buildDriftwood() {
  const root = new THREE.Group();
  root.name = 'driftwood';
  const wood = mat('#b8b0a3', { roughness: 0.95 });
  const a = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 2, 7).rotateZ(Math.PI / 2).translate(0, 0.11, 0), wood);
  a.name = 'drift_1';
  const b = new THREE.Group();
  b.name = 'drift_2';
  b.add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.18, 3, 7).rotateZ(Math.PI / 2).translate(0, 0.16, 0), wood));
  for (let i = 0; i < 5; i++) { // a stub of root at one end
    const r = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.6, 5).rotateZ(Math.PI / 2), wood);
    const ang = (i / 5) * Math.PI * 2;
    r.position.set(1.65, 0.18 + Math.sin(ang) * 0.12, Math.cos(ang) * 0.12);
    r.rotation.set(Math.sin(ang) * 0.6, Math.cos(ang) * 0.6, 0);
    b.add(r);
  }
  b.position.z = 1.2;
  root.add(a, b);
  return shadowed(root);
}

// A plain single-blade paddle, along x.
export function buildPaddle() {
  const root = new THREE.Group();
  root.name = 'canoe_paddle';
  const wood = mat('#c49a62', { roughness: 0.55 });
  root.add(new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.95, 6).rotateZ(Math.PI / 2).translate(-0.27, 0, 0), wood));
  root.add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 6).scale(0.58, 0.032, 0.15).translate(0.47, 0, 0), wood));
  root.add(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.1).translate(-0.75, 0, 0), wood));
  return shadowed(root);
}

// A harbour porpoise: dark back, pale belly, small triangular fin, nose along +x. The site moves it.
export function buildPorpoise() {
  const root = new THREE.Group();
  root.name = 'porpoise';
  const g = new THREE.SphereGeometry(0.5, 18, 10);
  const pos = g.attributes.position, col = [];
  const back = new THREE.Color('#2f363d'), belly = new THREE.Color('#bfc6c9'), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const taper = x < 0 ? 1 - Math.pow(-x / 0.5, 2) * 0.55 : 1 - Math.pow(x / 0.5, 3) * 0.25; // slimmer toward the tail
    pos.setXYZ(i, x * 1.6, y * 0.4 * taper, z * 0.42 * taper);
    c.copy(belly).lerp(back, Math.min(1, Math.max(0, y * 3 + 0.6)));
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  const skin = mat('#fff', { vertexColors: true, roughness: 0.35 });
  root.add(new THREE.Mesh(g, skin));
  const finShape = new THREE.Shape();
  finShape.moveTo(-0.14, 0); finShape.lineTo(0.12, 0); finShape.lineTo(-0.06, 0.2); finShape.lineTo(-0.14, 0);
  const fin = new THREE.Mesh(new THREE.ExtrudeGeometry(finShape, { depth: 0.03, bevelEnabled: false }).translate(0, 0, -0.015), mat('#2f363d'));
  fin.position.set(-0.05, 0.16, 0);
  const fluke = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 4).scale(0.16, 0.025, 0.42), mat('#2f363d'));
  fluke.position.set(-0.86, 0, 0);
  [...root.children].forEach((c) => { c.position.y += 0.2; }); // origin at the belly, like the Blender model
  root.add(fin, fluke);
  return shadowed(root);
}

// A gull: a white body and grey wings that the site flaps (children wing_l, wing_r).
export function buildGull() {
  const root = new THREE.Group();
  root.name = 'gull';
  root.add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 5).scale(0.42, 0.12, 0.12), mat('#f1f0ec')));
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), mat('#f1f0ec'));
  head.position.set(0.2, 0.03, 0);
  root.add(head);
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.name = s < 0 ? 'wing_l' : 'wing_r';
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.5).translate(0, 0, s * 0.25), mat('#a9b0b6'));
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.013, 0.12).translate(-0.02, 0, s * 0.46), mat('#2b2b2b'));
    pivot.add(wing, tip);
    root.add(pivot);
  }
  return root;
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

// ------------------------------------------------------------------ the lake (stand-ins for docs/MODEL_BRIEF.md priority 5)

// A big flat granite rock at the water's edge, top at userData.top. Fresh water: no seaweed.
export function buildLakeRock() {
  const root = new THREE.Group();
  root.name = 'lake_rock';
  const g = new THREE.IcosahedronGeometry(0.5, 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n = 1 + Math.sin(x * 8.3) * 0.04 + Math.sin(z * 9.1 + 1) * 0.04;
    pos.setXYZ(i, x * 2.6 * n, Math.min(y, 0.3) * 1.4 + 0.42, z * 1.7 * n); // a flattened, table-like top
  }
  g.computeVertexNormals();
  root.add(new THREE.Mesh(g, mat('#8f8b84', { flatShading: true, roughness: 0.95 })));
  root.userData.top = 0.84;
  return shadowed(root);
}

// Three strings of white shell beads lying on the rock, about twice life size so they read from the camera.
export function buildShellStrings() {
  const root = new THREE.Group();
  root.name = 'shell_strings';
  // laid on a dark hide, so the white shells show against the grey rock
  const hide = new THREE.Mesh(new THREE.CircleGeometry(0.62, 9).scale(1.35, 1, 0.85).rotateX(-Math.PI / 2), mat('#5a3e2b', { roughness: 1 }));
  hide.position.y = 0.006;
  hide.receiveShadow = true;
  root.add(hide);
  const bead = new THREE.CylinderGeometry(0.016, 0.016, 0.04, 7).rotateZ(Math.PI / 2);
  const cord = mat('#8a6a48');
  [[-0.2, 0.25, 26], [0.05, -0.1, 30], [0.25, 0.4, 22]].forEach(([z, turn, count], k) => {
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const u = i / 8;
      pts.push(new THREE.Vector3((u - 0.5) * count * 0.042, 0.017, z + Math.sin(u * Math.PI * 1.3 + k) * 0.08 + u * turn * 0.2));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    root.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.004, 4), cord));
    const beads = new THREE.InstancedMesh(bead, new THREE.MeshStandardMaterial({ roughness: 0.35 }), count);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const u = (i + 0.5) / count, p = curve.getPointAt(u), t = curve.getTangentAt(u);
      q.setFromUnitVectors(new THREE.Vector3(1, 0, 0), t);
      beads.setMatrixAt(i, m.compose(p, q, new THREE.Vector3(1, 1, 1)));
      beads.setColorAt(i, c.set('#efe9dc').offsetHSL(0, 0, (Math.sin(i * 7.7 + k) - 0.5) * 0.04));
    }
    beads.castShadow = true;
    root.add(beads);
  });
  return root;
}

// A common loon, floating: dark head and back, white chest. Nose along +x. The site moves it.
export function buildLoon() {
  const root = new THREE.Group();
  root.name = 'loon';
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8).scale(0.8, 0.28, 0.32), mat('#22262a', { roughness: 0.5 }));
  body.position.y = 0.05;
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 6).scale(0.35, 0.18, 0.26), mat('#e9e8e2'));
  chest.position.set(0.22, 0.06, 0);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.26, 7), mat('#1c2124'));
  neck.position.set(0.3, 0.2, 0); neck.rotation.z = -0.3;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6).scale(1.3, 1, 0.9), mat('#1c2124'));
  head.position.set(0.37, 0.33, 0);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.13, 5).rotateZ(-Math.PI / 2), mat('#2b2b2b'));
  beak.position.set(0.5, 0.32, 0);
  root.add(body, chest, neck, head, beak);
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
