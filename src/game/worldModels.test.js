import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createModelKit } from './worldModels.js';
import { createAtmosphere } from './worldAtmosphere.js';

function collect(object, predicate) {
  const result = []; object.traverse(child => { if (predicate(child)) result.push(child); }); return result;
}
test('each disguise has its own visible three-dimensional identifying feature', () => {
  const kit = createModelKit();
  for (const tell of ['eyes', 'paws', 'tail']) {
    const model = kit.sheep({ id: tell, wolf: true, tell }, 0);
    const feature = collect(model, o => o.userData.part === tell);
    assert.ok(feature.length > 0, `${tell} must exist in the actual model`);
    if (tell === 'eyes') assert.ok(feature.every(o => o.material.color.getHex() === 0x6b493e && o.material.emissive.getHex() === 0), 'subtle eyes reflect light instead of glowing');
    if (tell === 'paws') assert.equal(feature.length, 12);
    if (tell === 'tail') assert.ok(feature[0].position.z < 0);
  }
  const innocent = kit.sheep({ id: 'innocent', wolf: false }, 0);
  assert.equal(collect(innocent, o => o.userData.part === 'paws' || o.userData.part === 'tail').length, 0);
  assert.equal(collect(innocent, o => o.isMesh && o.material.emissive?.getHex() === 0xe63716).length, 0);
  kit.dispose();
});

test('hard disguises keep tiny inspectable clues without glowing eyes or enlarged silhouettes', () => {
  const kit = createModelKit();
  for (const type of ['normal', 'pup', 'lean', 'alpha', 'rabid']) {
    const tell = { normal: 'paws', pup: 'teeth', lean: 'body', alpha: 'body', rabid: 'eyes' }[type];
    const animal = { id: type, type, wolf: true, tell, disguise: type === 'pup' ? 'baby' : type === 'lean' ? 'sheared' : 'adult' };
    const normal = kit.sheep(animal, 0, 'normal'), hard = kit.sheep(animal, 0, 'hard');
    const normalParts = collect(normal, o => o.userData.part === tell), hardParts = collect(hard, o => o.userData.part === tell);
    assert.ok(hardParts.length > 0, `${type} remains inspectable`);
    assert.ok(collect(hard, o => o.isMesh).every(o => !o.material.emissive?.getHex()), 'no light beacon reveals a disguise');
    if (type === 'alpha') { assert.ok(hard.userData.wool.scale.x < 1.05); assert.ok(hard.userData.wool.scale.x < normal.userData.wool.scale.x); }
    else if (type !== 'rabid') {
      const size = parts => parts.reduce((box, part) => box.union(new T.Box3().setFromObject(part)), new T.Box3()).getSize(new T.Vector3());
      assert.ok(size(hardParts).y < size(normalParts).y, `${type} clue is smaller on hard`);
    }
    const hidden = kit.sheep({ ...animal, hidden: true }, 0, 'hard');
    if (tell === 'eyes') assert.ok(collect(hidden, o => o.userData.part === 'eyes').every(o => o.material.color.getHex() === 0x383e38));
    else assert.equal(collect(hidden, o => o.userData.part === tell).length, 0, 'full moon overrides even stale tell metadata');
  }
  kit.dispose();
});
test('sheep fit the world, expose selectable metadata, and torch points away from camera', () => {
  const kit = createModelKit();
  const model = kit.sheep({ id: 's1' }, 0);
  model.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(model);
  assert.ok(bounds.max.y < 1.9 && bounds.min.y >= -0.01);
  assert.equal(model.userData.animalId, 's1'); assert.equal(model.userData.ring.visible, false);
  const camera = new T.PerspectiveCamera();
  const torch = kit.flashlight(camera); torch.updateMatrixWorld(true);
  const front = new T.Vector3(0, 0.32, 0).applyMatrix4(torch.matrixWorld);
  assert.ok(front.z < torch.position.z);
  kit.dispose();
});
test('environment can be constructed and disposed without browser globals or downloaded models', () => {
  const kit = createModelKit(), scene = new T.Scene();
  kit.environment(scene);
  const setPieces = collect(scene, o => o.isMesh);
  assert.ok(setPieces.length > 10 && setPieces.length < 70, 'scenery with separately upgradeable roof and barn should stay batched');
  assert.ok(setPieces.reduce((sum, o) => sum + o.geometry.attributes.position.count, 0) > 5000);
  assert.equal(collect(scene, o => o.isPointLight).length, 4);
  assert.ok(collect(scene, o => o.isMesh).every(o => Number.isFinite(o.position.x) && Number.isFinite(o.position.y) && Number.isFinite(o.position.z)));
  kit.dispose();
});
test('GDD disguises show their species clues, suppress them at full moon, and scale pups', () => {
  const kit = createModelKit();
  for (const type of ['pup', 'lean', 'alpha', 'rabid']) {
    const tell = type === 'pup' ? 'teeth' : type === 'rabid' ? 'eyes' : 'body';
    const definition = { type, wolf: true, tell, disguise: type === 'pup' ? 'baby' : type === 'lean' ? 'sheared' : 'adult' };
    const visible = kit.sheep({ ...definition, id: type }, 0);
    assert.ok(collect(visible, o => o.userData.part === tell).length > 0, `${type} clue`);
    const hidden = kit.sheep({ ...definition, id: type, tell: null, hidden: true }, 0);
    assert.equal(collect(hidden, o => o.userData.part === tell && (tell !== 'eyes' || o.material?.emissive?.getHex() === 0xe63716)).length, 0, `${type} full-moon disguise`);
    if (type === 'pup') assert.equal(visible.scale.x, 0.63);
  }
  const meta = kit.supplements(new T.Scene());
  assert.ok(meta.divider && meta.roofPatch && meta.deity && meta.merchant);
  kit.dispose();
});

test('all six combat wolves have finite geometry and a compact draw budget', () => {
  const kit = createModelKit();
  for (const type of ['normal', 'rabid', 'pup', 'lean', 'alpha', 'white']) {
    const model = kit.wolf(type); model.updateMatrixWorld(true);
    const bounds = new T.Box3().setFromObject(model);
    assert.ok(Number.isFinite(bounds.max.y) && bounds.max.y > 1.5 && bounds.max.y < 3.8);
    assert.ok(model.userData.head && model.userData.tail);
    assert.ok(collect(model, o => o.isMesh).length < 55);
    // Inspect the torso, excluding the tail and floor shadow, from the side.
    const torso = new T.Box3();
    model.children.filter(o => o.isMesh && !o.material.transparent).forEach(o => torso.union(new T.Box3().setFromObject(o)));
    const size = torso.getSize(new T.Vector3());
    assert.ok(size.z / model.scale.z >= .85, `${type} must have a solid chest and back`);
  }
  kit.dispose();
});

test('seated Shiba rests on the ground and the kennel doorway fits him', () => {
  const kit = createModelKit(), dog = kit.shiba({ sitting: true }), house = kit.doghouse();
  const bounds = new T.Box3().setFromObject(dog), home = new T.Box3().setFromObject(house);
  assert.ok(bounds.min.y >= -.01 && bounds.max.y < 1.3);
  assert.ok(bounds.getSize(new T.Vector3()).x < .8, 'dog fits the entrance');
  assert.ok(home.max.y > 1.8 && home.getSize(new T.Vector3()).x > 1.9);
  assert.ok(collect(house, o => o.isMesh).length < 10, 'kennel geometry stays batched');
  kit.dispose();
});

test('day and night atmosphere works without browser globals and releases its scene objects', () => {
  const scene = new T.Scene(), atmosphere = createAtmosphere(scene);
  atmosphere.update(1, false); atmosphere.update(2, true, true);
  assert.equal(scene.children.length, 3);
  for (const object of scene.children) {
    assert.equal(object.material.uniforms.night.value, 1);
    assert.equal(object.material.uniforms.rainy.value, 1);
    assert.ok([...object.geometry.attributes.position.array].every(Number.isFinite));
  }
  atmosphere.dispose(); assert.equal(scene.children.length, 0);
});
