import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createModelKit } from './worldModels.js';

function collect(object, predicate) {
  const result = []; object.traverse(child => { if (predicate(child)) result.push(child); }); return result;
}
test('each disguise has its own visible three-dimensional identifying feature', () => {
  const kit = createModelKit();
  for (const tell of ['eyes', 'paws', 'tail']) {
    const model = kit.sheep({ id: tell, wolf: true, tell }, 0);
    const feature = collect(model, o => o.userData.part === tell);
    assert.ok(feature.length > 0, `${tell} must exist in the actual model`);
    if (tell === 'eyes') assert.ok(feature.every(o => o.material.emissive.getHex() === 0xe63716));
    if (tell === 'paws') assert.equal(feature.length, 12);
    if (tell === 'tail') assert.ok(feature[0].position.z < 0);
  }
  const innocent = kit.sheep({ id: 'innocent', wolf: false }, 0);
  assert.equal(collect(innocent, o => o.userData.part === 'paws' || o.userData.part === 'tail').length, 0);
  assert.equal(collect(innocent, o => o.isMesh && o.material.emissive?.getHex() === 0xe63716).length, 0);
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
  assert.ok(setPieces.length > 10 && setPieces.length < 60, 'static scenery should be batched into a small number of draw calls');
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
