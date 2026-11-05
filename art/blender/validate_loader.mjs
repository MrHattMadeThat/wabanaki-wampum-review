// Run with Node from the repo root: node art/blender/validate_loader.mjs
// Exercise the actual site loader and camp assembly with local file responses.
// No browser, network server, source edits or DOM rendering is needed.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { loadManifest, makeModel } from '../../src/models.js';
import { buildStation } from '../../src/stations.js';

const OriginalRequest = globalThis.Request;
globalThis.Request = class Request extends OriginalRequest {
  constructor(input, options) {
    super(typeof input === 'string' ? new URL(input, 'http://model-check.invalid/').href : input, options);
  }
};
globalThis.fetch = async (input) => {
  const url = new URL(typeof input === 'string' ? input : input.url, 'http://model-check.invalid/');
  assert.match(url.pathname, /^\/models\/[a-z_]+\.(json|glb)$/);
  const data = await readFile(new URL('../../public' + url.pathname, import.meta.url));
  return new Response(data, { headers: { 'Content-Length': String(data.byteLength) } });
};
globalThis.ProgressEvent = class ProgressEvent {
  constructor(type, init) { this.type = type; Object.assign(this, init); }
};

globalThis.location = { search: '' };
await loadManifest();
const manifest = JSON.parse(await readFile(new URL('../../public/models/manifest.json', import.meta.url)));
const bowOffsets = { bow_wood: [0, 0, 0], bow_sinew: [0, 0.34, 0.04],
  bow_flint: [0.2, 0.2, 0.04], bow_gum: [0.16, -0.24, 0.04] };

for (const id of Object.keys(manifest.models)) {
  const object = await makeModel(id);
  const clone = await makeModel(id);
  assert.equal(object.userData.source, 'glb');
  assert.notEqual(object, clone);
  if (id in { canoe_birch: 1, canoe_plastic: 1 }) {
    assert.deepEqual(object.getObjectByName('part_frame').userData.explode, [0, 0.9, 0]);
    const mask = object.getObjectByName('water_mask');
    assert.ok(mask?.isMesh);
    assert.equal(mask.material.colorWrite, false);
    assert.equal(mask.castShadow, false);
    assert.equal(mask.renderOrder, -1);
  }
  if (id === 'bow_set') {
    for (const [name, offset] of Object.entries(bowOffsets)) {
      const part = object.getObjectByName(name);
      assert.ok(part);
      assert.deepEqual(part.userData.explode, offset);
      let meshes = 0;
      part.traverse(child => { if (child.isMesh) meshes++; });
      assert.ok(meshes > 0);
    }
    assert.equal(object.getObjectByName('display_rack').userData.explode, undefined);
  }
  if (['shore_rocks', 'driftwood'].includes(id)) {
    const prefix = id === 'shore_rocks' ? 'rock_' : 'drift_';
    for (let i = 1; i <= (id === 'shore_rocks' ? 4 : 2); i++) {
      const child = object.getObjectByName(prefix + i);
      assert.ok(child);
      // The complete child, including its weed/root details, must be movable
      // without moving any of its siblings.
      const sibling = object.getObjectByName(prefix + (i === 1 ? 2 : 1));
      const home = sibling.position.clone();
      child.position.x += 1;
      assert.ok(sibling.position.equals(home));
    }
  }
  if (['tree_birch', 'tree_spruce', 'tree_cedar'].includes(id)) {
    const meshes = [];
    object.traverse(child => { if (child.isMesh) meshes.push(child); });
    assert.equal(meshes.length, 1);
    assert.ok(meshes[0].geometry.getAttribute('color'));
    assert.equal(meshes[0].material.vertexColors, true);
    assert.equal(Array.isArray(meshes[0].material), false);
    assert.notEqual(meshes[0].material, clone.getObjectByName(meshes[0].name).material);
  }
  console.log(`${id}: actual site loader selects glb; cloning and model contracts OK`);
}

// A tiny element stub is sufficient for the camp's static CSS2D kettle tag.
// Only assembly behaviour is tested here, not the DOM or the browser renderer.
globalThis.document = { createElement: () => ({
  style: {}, setAttribute() {},
  getContext: () => ({ createRadialGradient: () => ({ addColorStop() {} }), fillRect() {} }),
}) };
const camp = await buildStation('camp', {
  heightAt: () => 0,
  make: async id => id === 'bow_set' ? makeModel(id) : new THREE.Group(),
});
const bow = camp.group.getObjectByName('bow_set');
const rack = bow.getObjectByName('display_rack');
const rackHome = rack.position.clone();
const homes = Object.fromEntries(Object.keys(bowOffsets).map(name => [name, bow.getObjectByName(name).position.clone()]));
assert.deepEqual(camp.picks, Object.keys(bowOffsets));
camp.react({ type: 'task-start', index: 0 });
camp.update(1 / 3);
for (const [name, offset] of Object.entries(bowOffsets)) {
  const part = bow.getObjectByName(name);
  assert.ok(part.position.distanceTo(homes[name].clone().add(new THREE.Vector3(...offset))) < 1e-6);
}
assert.ok(rack.position.equals(rackHome));
camp.react({ type: 'item-correct', pick: 'bow_gum' });
camp.update(1 / 3);
assert.ok(bow.getObjectByName('bow_gum').position.equals(homes.bow_gum));
assert.ok(bow.getObjectByName('bow_sinew').position.distanceTo(homes.bow_sinew) > 0.3);
camp.react({ type: 'task-start', index: 1 });
camp.update(1 / 3);
for (const name of Object.keys(bowOffsets)) assert.ok(bow.getObjectByName(name).position.equals(homes[name]));
assert.ok(rack.position.equals(rackHome));
console.log('bow_set: actual camp assembly explodes, returns answered parts and reassembles; rack stays fixed');
