import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as P from './props.js';

// Every model the stations ask for, by id. A Blender model listed in public/models/manifest.json
// replaces the procedural one; anything not listed (or that fails to load) falls back.
// See docs/MODEL_BRIEF.md for the ids, sizes and part names a replacement must keep.
const BUILDERS = {
  canoe_birch: (o) => P.buildCanoe(o),
  canoe_plastic: (o) => P.buildCanoe({ ...o, plastic: true }),
  hiawatha_belt: (o) => P.buildBelt(o),
  shell_whelk: () => P.buildWhelk(),
  shell_quahog: () => P.buildQuahog(),
  wigwam: () => P.buildWigwam(),
  longhouse: (o) => P.buildLonghouse(o),
  council_fire: () => P.buildFire(),
  tree_of_peace: () => P.buildTreeOfPeace(),
  bow_set: () => P.buildBow(),
  tool_snowshoes: () => P.buildSnowshoes(),
  tool_toboggan: () => P.buildToboggan(),
  tool_leister: () => P.buildLeister(),
  tool_hooks: () => P.buildHooks(),
  trade_kettle: () => P.buildKettle(),
  basket: () => P.buildBasket(),
  bench: () => P.buildBench(),
  fish_rack: () => P.buildFishRack(),
  shore_rocks: () => P.buildShoreRocks(),
  driftwood: () => P.buildDriftwood(),
  canoe_paddle: () => P.buildPaddle(),
  porpoise: () => P.buildPorpoise(),
  gull: () => P.buildGull(),
  lake_rock: () => P.buildLakeRock(),
  shell_strings: () => P.buildShellStrings(),
  loon: () => P.buildLoon(),
};

let manifest = {};
const loader = new GLTFLoader();
const cache = new Map();

export async function loadManifest() {
  if (new URLSearchParams(location.search).has('procedural')) return; // compare against the stand-ins
  try {
    const r = await fetch('models/manifest.json', { cache: 'no-cache' });
    if (r.ok) manifest = (await r.json()).models || {};
  } catch { /* no manifest: everything is procedural */ }
}

export async function makeModel(id, opts = {}) {
  const entry = manifest[id];
  if (entry && !opts.procedural) {
    try {
      if (!cache.has(id)) cache.set(id, loader.loadAsync(`models/${entry.file}`));
      const gltf = await cache.get(id);
      const obj = gltf.scene.clone(true);
      obj.name = id;
      if (entry.scale) obj.scale.setScalar(entry.scale);
      obj.traverse((o) => {
        if (o.isMesh && o.name === 'water_mask') { P.asWaterMask(o); return; }
        if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.material = o.material.clone(); }
        // Blender custom properties arrive as userData; `explode` may come as a string "x,y,z"
        if (typeof o.userData.explode === 'string') o.userData.explode = o.userData.explode.split(',').map(Number);
      });
      obj.userData.source = 'glb';
      return obj;
    } catch (e) {
      console.warn(`[models] ${entry.file} failed, using the procedural ${id}`, e);
    }
  }
  if (!BUILDERS[id]) return null; // Blender-only models (the forest trees) have no stand-in
  const obj = BUILDERS[id](opts);
  obj.userData.source = 'procedural';
  return obj;
}

export function modelSources() {
  return Object.keys(BUILDERS).map((id) => ({ id, file: manifest[id]?.file || null }));
}
