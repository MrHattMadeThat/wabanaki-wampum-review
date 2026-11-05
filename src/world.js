import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ANCHORS, RIVER, RIVER_WIDTH, LAKE, BAY_X, COVE, WORLD } from './layout.js';

// ------------------------------------------------------------------ noise

function hash(x, z) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, z) {
  let s = 0, amp = 0.5, f = 1;
  for (let i = 0; i < 4; i++) { s += amp * vnoise(x * f, z * f); f *= 2.03; amp *= 0.5; }
  return s;
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

// ------------------------------------------------------------------ ground height

// Distance from (x, z) to the river line, and how far along it (0 at the bay, 1 at the end).
function riverDist(x, z) {
  let best = Infinity, along = 0, total = 0;
  const lens = [];
  for (let i = 0; i < RIVER.length - 1; i++) {
    const [ax, az] = RIVER[i], [bx, bz] = RIVER[i + 1];
    lens.push(Math.hypot(bx - ax, bz - az)); total += lens[i];
  }
  let run = 0;
  for (let i = 0; i < RIVER.length - 1; i++) {
    const [ax, az] = RIVER[i], [bx, bz] = RIVER[i + 1];
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    const d = Math.hypot(x - (ax + dx * t), z - (az + dz * t));
    if (d < best) { best = d; along = (run + lens[i] * t) / total; }
    run += lens[i];
  }
  return { d: best, along };
}

function rawHeight(x, z) {
  let h = 2.2 + 7 * fbm(x * 0.011 + 3.1, z * 0.011 - 1.7);
  h += 10 * Math.exp(-(((x - 4) / 34) ** 2)); // the height of land the portage climbs over
  h += 16 * smooth(70, 170, Math.abs(z)); // valley sides, so the path reads as a valley
  // river
  if (x > 30) {
    const r = riverDist(x, z);
    const w = mix(RIVER_WIDTH[0], RIVER_WIDTH[1], r.along);
    const endFade = smooth(30, 48, x); // the river runs out at the portage
    h = mix(h, mix(h, -2.6, endFade), 1 - smooth(w * 0.55, w * 1.5, r.d));
  }
  // bay
  h = mix(h, -7, smooth(BAY_X - 12, BAY_X + 30, x));
  // the cove: a gentle beach where the steep bank would be (only ever lowers the land)
  const dc = Math.hypot(x - COVE.at[0], z - COVE.at[1]);
  if (dc < COVE.r) h = mix(h, Math.min(h, 0.15 - 0.17 * (x - COVE.shore)), 1 - smooth(COVE.r * 0.5, COVE.r, dc));
  // lake
  const dl = Math.hypot(x - LAKE.at[0], z - LAKE.at[1]);
  h = mix(-3, h, smooth(LAKE.r * 0.7, LAKE.r * 1.25, dl));
  return h;
}

// Each stop gets a flat stage, so props stand level.
const stages = Object.values(ANCHORS)
  .filter((a) => !a.water && a.flat !== false)
  .map((a) => ({ x: a.at[0], z: a.at[1], h: Math.max(0.7, rawHeight(a.at[0], a.at[1])) }));

export function heightAt(x, z) {
  let h = rawHeight(x, z);
  for (const s of stages) {
    const d = Math.hypot(x - s.x, z - s.z);
    if (d < 12 && h > 0.2) h = mix(s.h, h, smooth(5, 12, d)); // never fill in the river
  }
  return h;
}

// The height of the ground mesh as drawn: its flat triangles, not the smooth function above. Anything laid
// on the ground (the trail) follows this so it never sinks into a triangle.
let grid = null;
export function groundAt(x, z) {
  if (!grid) return heightAt(x, z);
  const { x0, z0, sx, sz, nx, nz, h } = grid;
  const gx = (x - x0) / sx, gz = (z - z0) / sz;
  const ix = Math.min(nx - 1, Math.max(0, Math.floor(gx))), iz = Math.min(nz - 1, Math.max(0, Math.floor(gz)));
  const fx = gx - ix, fz = gz - iz;
  const at = (i, j) => h[j * (nx + 1) + i];
  const ha = at(ix, iz), hb = at(ix, iz + 1), hc = at(ix + 1, iz + 1), hd = at(ix + 1, iz);
  // PlaneGeometry splits each cell into (a, b, d) and (b, c, d)
  return fx + fz <= 1 ? ha + (hd - ha) * fx + (hb - ha) * fz : hc + (hb - hc) * (1 - fx) + (hd - hc) * (1 - fz);
}

// ------------------------------------------------------------------ time of day

// p runs 0 → 1 along the path: sunrise in the east, noon over the portage, sunset in the west.
// Below 0 is the moment before sunrise that the title screen and the opening start from.
export const PREDAWN = -0.08;
const SKY_KEYS = [
  { p: PREDAWN, elev: -7, zen: '#0c1230', hor: '#7d5a72', sun: '#ff9060', sunI: 0.12, hemi: '#4a5a86', fog: '#3b4262' },
  { p: -0.03, elev: -0.6, zen: '#33457e', hor: '#ff9360', sun: '#ff7a3a', sunI: 0.9, hemi: '#9a86a8', fog: '#c98e82' },
  { p: 0.0, elev: 4, zen: '#4a64a0', hor: '#f7a676', sun: '#ffac6a', sunI: 2.4, hemi: '#c8b4d4', fog: '#dcaa93' },
  { p: 0.45, elev: 58, zen: '#4d88c7', hor: '#cfe2ee', sun: '#fff3df', sunI: 2.8, hemi: '#d8ecff', fog: '#d4e4ec' },
  { p: 1.0, elev: 7, zen: '#3e4f86', hor: '#f2a463', sun: '#ff9758', sunI: 2.3, hemi: '#d9b8a8', fog: '#e8ae84' },
];
const cA = new THREE.Color(), cB = new THREE.Color();
function lerpKey(p, key, out) {
  let i = 0;
  while (i < SKY_KEYS.length - 2 && p > SKY_KEYS[i + 1].p) i++;
  const a = SKY_KEYS[i], b = SKY_KEYS[i + 1];
  const t = smooth(a.p, b.p, p);
  if (typeof a[key] === 'number') return mix(a[key], b[key], t);
  return out.copy(cA.set(a[key])).lerp(cB.set(b[key]), t);
}

// ------------------------------------------------------------------ build

export function buildWorld(scene, renderer) {
  const world = new THREE.Group();
  scene.add(world);

  // sky dome
  const skyU = {
    zen: { value: new THREE.Color() }, hor: { value: new THREE.Color() },
    sunDir: { value: new THREE.Vector3(1, 0.1, 0) }, sunCol: { value: new THREE.Color() },
    night: { value: 0 },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(2000, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }`,
      fragmentShader: `uniform vec3 zen, hor, sunDir, sunCol; uniform float night; varying vec3 vDir;
        float hash3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        void main(){
          vec3 d = normalize(vDir);
          float h = max(d.y, 0.0);
          vec3 c = mix(hor, zen, pow(h, 0.55));
          float s = max(dot(d, normalize(sunDir)), 0.0);
          c += sunCol * (pow(s, 900.0) * 3.0 + pow(s, 12.0) * 0.35 + pow(s, 3.0) * 0.12 * (1.0 - h));
          // stars before dawn, fading out toward the sunrise side and the horizon
          if (night > 0.0) {
            vec3 cell = floor(d * 420.0);
            float st = step(0.9982, hash3(cell)) * (0.5 + 0.5 * hash3(cell + 7.0));
            c += vec3(0.9, 0.92, 1.0) * st * night * smoothstep(0.04, 0.3, d.y) * (1.0 - pow(s, 4.0));
          }
          if (d.y < 0.0) c = hor * 0.92;
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }),
  );
  sky.frustumCulled = false;
  sky.renderOrder = -1;
  world.add(sky);

  // lights
  const hemi = new THREE.HemisphereLight('#d8ecff', '#4c4a3c', 1.1);
  world.add(hemi);
  const sun = new THREE.DirectionalLight('#fff', 2.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 300 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  world.add(sun, sun.target);
  scene.fog = new THREE.Fog('#d4e4ec', 70, 520);

  // ground
  const W = WORLD.maxX - WORLD.minX, D = WORLD.maxZ - WORLD.minZ;
  const g = new THREE.PlaneGeometry(W, D, Math.round(W / 2.2), Math.round(D / 2.2));
  g.rotateX(-Math.PI / 2);
  g.translate(WORLD.minX + W / 2, 0, WORLD.minZ + D / 2);
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const grass = new THREE.Color('#6f8f4a'), grassDry = new THREE.Color('#9a9a5a'), sand = new THREE.Color('#cdbb8e');
  const rock = new THREE.Color('#7d776b'), bed = new THREE.Color('#5d6a5c'), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = heightAt(x, z);
    pos.setY(i, h);
    const n = fbm(x * 0.05, z * 0.05);
    c.copy(grass).lerp(grassDry, smooth(0.35, 0.75, n) * 0.7);
    if (x < 0) c.lerp(new THREE.Color('#7d9a4c'), 0.35); // greener west
    c.lerp(rock, smooth(14, 22, h) * 0.6);
    c.lerp(sand, 1 - smooth(0.25, 1.4, h));
    if (h < -0.3) c.copy(bed);
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  grid = { x0: WORLD.minX, z0: WORLD.minZ, nx: g.parameters.widthSegments, nz: g.parameters.heightSegments,
    sx: W / g.parameters.widthSegments, sz: D / g.parameters.heightSegments, h: Float32Array.from({ length: pos.count }, (_, i) => pos.getY(i)) };
  const ground = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  ground.receiveShadow = true;
  world.add(ground);

  // water
  const waterU = {
    time: { value: 0 }, sunDir: skyU.sunDir, sunCol: skyU.sunCol, hor: skyU.hor, zen: skyU.zen,
    deep: { value: new THREE.Color('#1f4b5c') },
  };
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(W + 3000, D + 3000, 1, 1).rotateX(-Math.PI / 2).translate(WORLD.minX + W / 2, 0, 0),
    new THREE.ShaderMaterial({
      transparent: true, fog: true,
      // shares the sky's uniform objects, so the water follows the time of day
      uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...waterU },
      vertexShader: `varying vec3 vW;
        #include <fog_pars_vertex>
        void main(){
          vec4 w = modelMatrix * vec4(position,1.0);
          vW = w.xyz;
          vec4 mvPosition = viewMatrix * w;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `uniform float time; uniform vec3 sunDir, sunCol, hor, zen, deep; varying vec3 vW;
        #include <fog_pars_fragment>
        void main(){
          vec2 p = vW.xz;
          // ripples in several directions; they fade with distance so far water doesn't shimmer in a grid
          float amp = 1.0 / (1.0 + distance(cameraPosition.xz, p) * 0.04);
          vec2 q = mat2(0.8, -0.6, 0.6, 0.8) * p;
          vec3 n = normalize(vec3(
            (sin(p.x*0.9 + time*1.3)*0.05 + sin(q.x*2.7 - q.y*1.3 + time*2.1)*0.03 + sin(q.y*4.3 + p.x*1.7 + time*1.7)*0.02) * amp,
            1.0,
            (sin(q.y*1.1 + time*1.1)*0.05 + sin(p.x*2.3 + q.y*2.9 - time*1.9)*0.03 + sin(q.x*3.7 - time*2.3)*0.02) * amp));
          vec3 v = normalize(cameraPosition - vW);
          float fr = pow(1.0 - max(dot(n, v), 0.0), 4.0);
          vec3 r = reflect(-v, n);
          vec3 skyc = mix(hor, zen, pow(max(r.y,0.0), 0.6));
          vec3 c = mix(deep, skyc, 0.25 + 0.65*fr);
          float sp = pow(max(dot(r, normalize(sunDir)), 0.0), 240.0);
          c += sunCol * sp * 2.5;
          gl_FragColor = vec4(c, 0.86 + 0.14*fr);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,
    }),
  );
  world.add(water);

  addForest(world);
  addRocks(world);

  // Called with p in 0..1 (progress along the path) and the point the camera is looking at.
  const tmp = new THREE.Color();
  function setTime(p, focus) {
    const elev = THREE.MathUtils.degToRad(lerpKey(p, 'elev'));
    const az = Math.PI * p; // east → south → west
    const dir = new THREE.Vector3(Math.cos(az) * Math.cos(elev), Math.sin(elev), Math.sin(az) * Math.cos(elev) * 0.55).normalize();
    skyU.sunDir.value.copy(dir);
    lerpKey(p, 'zen', skyU.zen.value);
    lerpKey(p, 'hor', skyU.hor.value);
    lerpKey(p, 'sun', skyU.sunCol.value);
    sun.color.copy(skyU.sunCol.value);
    sun.intensity = lerpKey(p, 'sunI');
    hemi.color.copy(lerpKey(p, 'hemi', tmp));
    skyU.night.value = 1 - smooth(PREDAWN, PREDAWN * 0.25, p);
    scene.fog.color.copy(lerpKey(p, 'fog', tmp));
    // keep the shadow box on whatever the camera is looking at
    sun.target.position.copy(focus);
    sun.position.copy(focus).addScaledVector(dir, 120);
  }

  return {
    setTime,
    tick(t, camera) { waterU.time.value = t; sky.position.copy(camera.position); },
  };
}

// ------------------------------------------------------------------ trees and rocks

function nearStage(x, z, r) {
  for (const a of Object.values(ANCHORS)) if (Math.hypot(x - a.at[0], z - a.at[1]) < r) return true;
  if (Math.hypot(x - COVE.at[0], z - COVE.at[1]) < 16 && r > 8) return true; // keep the beach open
  return false;
}

function treeKinds() {
  const spruce = mergeGeometries([
    new THREE.ConeGeometry(1.5, 3.2, 7).translate(0, 2.6, 0),
    new THREE.ConeGeometry(1.15, 2.6, 7).translate(0, 4.0, 0),
    new THREE.ConeGeometry(0.75, 2.0, 7).translate(0, 5.2, 0),
  ]);
  const pine = mergeGeometries([
    new THREE.IcosahedronGeometry(1.6, 0).scale(1.4, 0.55, 1.2).translate(0.3, 4.6, 0),
    new THREE.IcosahedronGeometry(1.4, 0).scale(1.3, 0.5, 1.2).translate(-0.6, 5.7, 0.3),
    new THREE.IcosahedronGeometry(1.1, 0).scale(1.2, 0.5, 1.1).translate(0.2, 6.7, -0.2),
  ]);
  const leafy = new THREE.IcosahedronGeometry(1.7, 1).scale(1, 0.95, 1).translate(0, 3.9, 0);
  const trunk = new THREE.CylinderGeometry(0.14, 0.22, 3.4, 5).translate(0, 1.7, 0);
  const tallTrunk = new THREE.CylinderGeometry(0.16, 0.26, 6, 5).translate(0, 3, 0);
  return [
    { name: 'spruce', crown: spruce, trunk, crownCol: '#2f5a3a', trunkCol: '#5b4636' },
    { name: 'birch', crown: leafy, trunk, crownCol: '#7da04a', trunkCol: '#e9e4d6' },
    { name: 'pine', crown: pine, trunk: tallTrunk, crownCol: '#3c6a3f', trunkCol: '#6a4c38' },
    { name: 'maple', crown: leafy, trunk, crownCol: '#5f8a3c', trunkCol: '#5b4636' },
  ];
}

function addForest(world) {
  const kinds = treeKinds();
  const spots = kinds.map(() => []);
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 9000 && spots.reduce((s, a) => s + a.length, 0) < 3200; i++) {
    const x = WORLD.minX + rnd() * (WORLD.maxX - WORLD.minX - 200);
    const z = WORLD.minZ + rnd() * (WORLD.maxZ - WORLD.minZ);
    const h = heightAt(x, z);
    if (h < 1.0 || nearStage(x, z, 14)) continue;
    if (Math.abs(z) < 24 && x < 40 && rnd() < 0.85) continue; // keep the walking path open
    if (fbm(x * 0.02, z * 0.02) < 0.38 && rnd() < 0.8) continue; // clearings
    const east = x > 10;
    const k = east ? (rnd() < 0.6 ? 0 : 1) : rnd() < 0.55 ? 2 : 3;
    spots[k].push([x, h, z, 0.75 + rnd() * 0.6, rnd() * Math.PI * 2]);
  }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const tint = new THREE.Color();
  kinds.forEach((k, ki) => {
    const list = spots[ki];
    if (!list.length) return;
    const crown = new THREE.InstancedMesh(k.crown, new THREE.MeshStandardMaterial({ color: '#fff', roughness: 0.9, flatShading: true }), list.length);
    const trunk = new THREE.InstancedMesh(k.trunk, new THREE.MeshStandardMaterial({ color: k.trunkCol, roughness: 0.9 }), list.length);
    list.forEach(([x, h, z, sc, r], i) => {
      m.compose(p.set(x, h - 0.1, z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r), s.setScalar(sc));
      crown.setMatrixAt(i, m); trunk.setMatrixAt(i, m);
      crown.setColorAt(i, tint.set(k.crownCol).offsetHSL((hash(x, z) - 0.5) * 0.04, 0, (hash(z, x) - 0.5) * 0.12));
    });
    crown.castShadow = trunk.castShadow = true;
    crown.receiveShadow = true;
    world.add(crown, trunk);
  });
}

function addRocks(world) {
  const list = [];
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 6000 && list.length < 500; i++) {
    const x = WORLD.minX + rnd() * (WORLD.maxX - WORLD.minX - 200);
    const z = WORLD.minZ + rnd() * (WORLD.maxZ - WORLD.minZ);
    const h = heightAt(x, z);
    if (h < -0.6 || h > 1.6 || nearStage(x, z, 8)) continue; // shorelines
    list.push([x, h, z, 0.3 + rnd() * 0.9]);
  }
  const mesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#8a857a', roughness: 1, flatShading: true }), list.length);
  const m = new THREE.Matrix4();
  list.forEach(([x, h, z, s], i) => {
    m.makeRotationY(hash(x, z) * 6).scale(new THREE.Vector3(s * 1.3, s * 0.6, s)).setPosition(x, h, z);
    mesh.setMatrixAt(i, m);
  });
  mesh.castShadow = mesh.receiveShadow = true;
  world.add(mesh);
}
