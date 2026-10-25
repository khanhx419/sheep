import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createModelKit } from './worldModels.js';
import { createAtmosphere } from './worldAtmosphere.js';
import { createMeadow } from './worldMeadow.js';
import { createCountryside, countrysideHeight } from './worldCountryside.js';
import { createFarmAmbience } from './worldAmbience.js';
import { animateFarmSheep, animateFarmDog } from './farmAnimation.js';
import { animateWolf, fitCombatCamera, faceCombatActor } from './combatAnimation.js';

test('farmer remains upright when facing behind himself during hit and dodge reactions', () => {
  const kit = createModelKit(), actor = kit.farmer();
  actor.position.set(0, .01, 0);
  for (let i = 0; i < 32; i++) for (const lean of [-.25, 0, .25]) {
    const angle = i / 32 * Math.PI * 2;
    actor.lookAt(Math.sin(angle), .01, Math.cos(angle));
    faceCombatActor(actor, { x: Math.sin(angle), z: Math.cos(angle) }, lean);
    const bounds = new T.Box3().setFromObject(actor);
    assert.ok(bounds.max.y > 1.5 && bounds.min.y > -.15, 'body must stay above the arena floor');
    const up = new T.Vector3(0, 1, 0).applyQuaternion(actor.quaternion);
    assert.ok(up.y > .95, 'turning must not invert the actor');
  }
  kit.dispose();
});

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
  const scenery = new Set([...collect(scene.userData.countryside.root, o => o.isMesh), ...collect(scene.userData.ambience.root, o => o.isMesh)]);
  const corePieces = setPieces.filter(mesh => !scenery.has(mesh));
  assert.ok(corePieces.length > 10 && corePieces.length < 70, 'farm buildings retain their original batching budget');
  assert.ok(setPieces.length <= 80, 'farm plus twelve countryside batches and seven ambience meshes stay within eighty meshes');
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

test('all wolf poses keep finite transforms, positive scales and visible geometry throughout every skill', () => {
  const kit = createModelKit();
  for (const type of ['normal', 'rabid', 'pup', 'lean', 'alpha', 'white']) {
    const model = kit.wolf(type);
    for (const pattern of ['dash', 'slam', 'fan', 'burst', 'rings']) for (const stage of ['wait', 'windup', 'strike', 'recover']) for (const progress of [0, .2, .5, .8, 1]) {
      const e = { time: 10 + progress, timer: 1 - progress, stageDuration: 1, castCount: 3, stage, pattern, player: { x: 5, z: 4.3 }, wolf: { x: -5, z: -3.8 }, effects: [{ dx: 1, dz: 0 }] };
      animateWolf(model, e, { hitAt: e.time - .08 }); model.updateMatrixWorld(true);
      model.traverse(part => {
        assert.ok([...part.position, ...part.quaternion, ...part.scale].every(Number.isFinite), `${type}/${pattern}/${stage} transforms`);
        assert.ok(part.scale.x > 0 && part.scale.y > 0 && part.scale.z > 0, `${type}/${pattern}/${stage} cannot collapse`);
      });
      const bounds = new T.Box3().setFromObject(model), size = bounds.getSize(new T.Vector3());
      assert.ok([size.x, size.y, size.z].every(n => Number.isFinite(n) && n > .5), 'wolf never disappears into a zero-size pose');
      assert.ok(Math.hypot(model.position.x - e.wolf.x, model.position.z - e.wolf.z) < .01, 'animation stays on its actual collider');
      animateWolf(model, e, { deadAt: e.time - .4 });
    }
  }
  kit.dispose();
});

test('combat camera retains arena corners and full wolf height in narrow, square and wide views', () => {
  const camera = new T.OrthographicCamera(-9, 9, 6.8, -6.8, .1, 130);
  camera.position.set(8, 13, 15); camera.lookAt(0, .4, 0);
  for (const [width, height] of [[360, 800], [800, 800], [1440, 900], [2560, 720]]) {
    fitCombatCamera(camera, width, height);
    for (const x of [-6.1, 6.1]) for (const z of [-4.9, 5.4]) for (const y of [0, 4.4]) {
      const projected = new T.Vector3(x, y, z).project(camera);
      assert.ok([projected.x, projected.y, projected.z].every(Number.isFinite));
      assert.ok(Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1 && Math.abs(projected.z) < 1, `${width}x${height}: arena corner ${x}/${y}/${z} remains on screen`);
    }
  }
});

test('meadow grows, visibly cuts each plot independently, regrows next day and releases resources', () => {
  const scene = new T.Scene(), meadow = createMeadow(scene);
  assert.equal(scene.children.length, 1); assert.equal(meadow.patches.length, 2);
  const geometries = new Set(), materials = new Set();
  meadow.root.traverse(o => { if (o.geometry) geometries.add(o.geometry); if (o.material) materials.add(o.material); });
  let geometryDisposals = 0, materialDisposals = 0;
  geometries.forEach(g => g.addEventListener('dispose', () => geometryDisposals++));
  materials.forEach(m => m.addEventListener('dispose', () => materialDisposals++));
  meadow.update(0); assert.deepEqual(meadow.patches.map(p => p.scale.y), [1, 1]);
  meadow.update(1, [], { patch: 0, progress: .5, position: { x: 12.2, z: 14.5 } });
  assert.ok(meadow.patches[0].scale.y < 1 && meadow.patches[0].scale.y > .12); assert.equal(meadow.patches[1].scale.y, 1);
  meadow.update(2, [0]); assert.ok(meadow.patches[0].scale.y <= .15); assert.equal(meadow.patches[1].scale.y, 1);
  meadow.update(3, [0, 1]); assert.ok(meadow.patches.every(p => p.scale.y <= .15));
  meadow.update(4, []); assert.deepEqual(meadow.patches.map(p => p.scale.y), [1, 1], 'cleared daily cut state regrows both plots');
  meadow.root.traverse(o => { if (o.isMesh) assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite)); });
  meadow.dispose(); assert.equal(scene.children.length, 0); assert.equal(geometryDisposals, geometries.size); assert.equal(materialDisposals, materials.size);
});

test('countryside surrounds the farm through 360 degrees while every solid prop clears playable ground', () => {
  const scene = new T.Scene(), countryside = createCountryside(scene), root = countryside.root;
  const meshes = collect(root, o => o.isMesh), matrix = new T.Matrix4();
  assert.ok(meshes.length <= 14, 'fields, hills and woodland use a compact batch count');
  assert.ok(root.userData.landmarks.every(mark => mark.kind !== 'cottage' && mark.kind !== 'lane-pole'), 'surroundings contain no neighboring houses or utility poles');
  const nearForest = root.userData.landmarks.filter(mark => mark.kind === 'forest' && Math.hypot(mark.x, mark.z) < 65);
  assert.ok(nearForest.length >= 70, 'a nearby forest frames the farm rather than only distant sparse trees');
  assert.ok(meshes.reduce((n, mesh) => n + mesh.geometry.attributes.position.count, 0) < 60000, 'distant scenery keeps a modest geometry budget');
  for (const x of [-23, 0, 23]) for (const z of [-23, 0, 23]) assert.ok(Math.abs(countrysideHeight(x, z) + .022) < 1e-9, 'scenery does not raise the playable farm floor');
  root.updateMatrixWorld(true);
  for (const mesh of meshes) {
    assert.ok([...mesh.geometry.attributes.position.array].every(Number.isFinite));
    if (!mesh.isInstancedMesh) continue;
    mesh.geometry.computeBoundingBox();
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix); assert.ok(matrix.elements.every(Number.isFinite) && matrix.determinant() > 0);
      const bounds = mesh.geometry.boundingBox.clone().applyMatrix4(matrix);
      assert.ok(bounds.max.x < -25.3 || bounds.min.x > 25.3 || bounds.max.z < -25.3 || bounds.min.z > 25.3, `${mesh.name} never intrudes on walking lanes`);
    }
  }
  const ray = new T.Raycaster(); ray.near = 23; ray.far = 195;
  for (let i = 0; i < 36; i++) {
    const angle = i / 36 * Math.PI * 2;
    ray.set(new T.Vector3(0, 1.65, 0), new T.Vector3(Math.sin(angle), 0, Math.cos(angle)));
    assert.ok(ray.intersectObject(root, true).length > 0, `eye-level view at ${i * 10} degrees meets real countryside, without an open horizon gap`);
  }
  countryside.dispose(); assert.equal(scene.children.length, 0);
});

test('countryside weather tints are reversible and independent resources are released exactly once', () => {
  const scene = new T.Scene(), countryside = createCountryside(scene);
  const meshes = collect(countryside.root, o => o.isMesh), geometries = new Set(meshes.map(o => o.geometry)), materials = new Set(meshes.map(o => o.material));
  const dayColors = [...materials].map(mat => mat.color.getHex()), ridge = meshes.find(o => o.material.emissive?.getHex() > 0).material;
  const sunnyGlow = ridge.emissiveIntensity;
  countryside.update(5, false, true); assert.notDeepEqual([...materials].map(mat => mat.color.getHex()), dayColors); assert.ok(ridge.emissiveIntensity < sunnyGlow);
  const rainyGlow = ridge.emissiveIntensity;
  countryside.update(6, true, true); assert.ok(ridge.emissiveIntensity < rainyGlow);
  for (let i = 0; i < 20; i++) countryside.update(i, false, false);
  assert.deepEqual([...materials].map(mat => mat.color.getHex()), dayColors, 'weather updates never accumulate a permanent tint');
  let geometryDisposals = 0, materialDisposals = 0;
  geometries.forEach(g => g.addEventListener('dispose', () => geometryDisposals++)); materials.forEach(m => m.addEventListener('dispose', () => materialDisposals++));
  countryside.dispose(); countryside.dispose(); countryside.update(30, true, true);
  assert.equal(scene.children.length, 0); assert.equal(geometryDisposals, geometries.size); assert.equal(materialDisposals, materials.size);
});

test('farm ambience changes with weather and night, stays outside walking space and releases shared resources once', () => {
  const scene = new T.Scene(), light = new T.PointLight(0xffc17d, 9); scene.add(light);
  const ambience = createFarmAmbience(scene), objects = collect(ambience.root, o => o.isMesh || o.isPoints), matrix = new T.Matrix4();
  const smoke = ambience.root.getObjectByName('Khói bếp'), birds = ambience.root.getObjectByName('Chim qua cánh đồng'), butterflies = ambience.root.getObjectByName('Bướm ven đồng cỏ'), flies = ambience.root.getObjectByName('Đom đóm hàng rào');
  assert.ok(objects.length <= 8); assert.equal(collect(ambience.root, o => o.isLight).length, 0);
  const initialBird = Array.from(birds.instanceMatrix.array), initialSmoke = Array.from(smoke.instanceMatrix.array);
  for (const time of [0, .04, 1, 17.99, 18, 600, NaN]) for (const night of [false, true]) for (const rainy of [false, true]) {
    ambience.update(time, { night, rainy });
    assert.equal(birds.visible, !night && !rainy); assert.equal(butterflies.visible, !night && !rainy); assert.equal(flies.visible, night);
    assert.ok(smoke.material.opacity > 0 && smoke.material.opacity <= .2, 'smoke stays a soft accent');
    assert.ok([...smoke.geometry.attributes.puffFade.array].every(n => n >= 0 && n <= 1));
    for (const mesh of objects) if (mesh.isInstancedMesh) for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix); assert.ok(matrix.elements.every(Number.isFinite)); assert.ok(matrix.determinant() > 0, 'instances use supported positive scales');
      const p = new T.Vector3().setFromMatrixPosition(matrix);
      if (mesh === smoke) assert.ok(p.y >= 5.8 && p.y < 8.5 && Math.abs(p.x + 16.6) < 2 && Math.abs(p.z - 16.2) < .5, 'smoke emerges over the chimney');
      if (mesh === birds) assert.ok(p.y >= 12.5, 'bird flights stay above the farm');
      if (mesh === butterflies) assert.ok(p.x > 18.6 && p.z > 10 && p.z < 18, 'butterflies stay along the flower verge');
    }
  }
  ambience.update(4, { night: false, rainy: false });
  assert.notDeepEqual(Array.from(birds.instanceMatrix.array), initialBird); assert.notDeepEqual(Array.from(smoke.instanceMatrix.array), initialSmoke);
  ambience.update(4, { night: true }); const dryGlow = flies.material.uniforms.strength.value;
  ambience.update(4, { night: true, rainy: true }); assert.ok(flies.material.uniforms.strength.value < dryGlow);
  assert.equal(light.intensity, 9, 'ambient decoration does not take ownership of farm lights');
  const geometries = new Set(objects.map(o => o.geometry)), materials = new Set(objects.map(o => o.material));
  let disposals = 0; for (const resource of [...geometries, ...materials]) resource.addEventListener('dispose', () => disposals++);
  ambience.dispose(); ambience.dispose(); ambience.update(5);
  assert.deepEqual(scene.children, [light]); assert.equal(disposals, geometries.size + materials.size);
});

test('farm sheep animation preserves anchored roots and disguise scales across grazing, weather and inspection', () => {
  const kit = createModelKit();
  for (const type of ['normal', 'rabid', 'pup', 'lean', 'alpha', 'tail']) {
    const tell = { normal: 'paws', rabid: 'eyes', pup: 'teeth', lean: 'body', alpha: 'body', tail: 'tail' }[type];
    const model = kit.sheep({ id: type, type, wolf: true, tell, disguise: type === 'pup' ? 'baby' : type === 'lean' ? 'sheared' : 'adult' }, 0, 'hard');
    model.position.set(4, .02, -3); model.rotation.y = .4;
    const rootPose = [...model.position, ...model.quaternion, ...model.scale], woolScale = model.userData.wool.scale.clone(), tailScale = model.userData.tail.scale.clone();
    const clues = collect(model, o => o.userData.part && o !== model.userData.wool).map(part => ({ part, scale: part.scale.clone() }));
    assert.equal(model.userData.legs.length, 4); assert.equal(model.userData.eyes.length, 2); assert.equal(model.userData.ears.length, 2);
    const headY = model.userData.head.position.y;
    assert.ok(animateFarmSheep(model, 5, { grazing: true }).grazing > .9); assert.ok(model.userData.head.position.y < headY - .2, 'grazing lowers the head into grass');
    for (const options of [{ night: true, grazing: true }, { rainy: true, grazing: true }, { selected: true, grazing: true }]) {
      assert.equal(animateFarmSheep(model, 5, options).grazing, 0); assert.ok(Math.abs(model.userData.head.position.y - headY) < .01);
    }
    for (const time of [0, .09, 1, 5, 19.8, 600, NaN]) for (const options of [{ grazing: true }, { night: true }, { rainy: true }, { selected: true, playerPosition: { x: 4, z: -1 } }]) {
      animateFarmSheep(model, time, options);
      assert.deepEqual([...model.position, ...model.quaternion, ...model.scale], rootPose);
      assert.deepEqual(model.userData.tail.scale, tailScale);
      for (const axis of ['x', 'y', 'z']) assert.ok(Math.abs(model.userData.wool.scale[axis] / woolScale[axis] - 1) <= .0041, 'breathing retains the original alpha/clipped-wool silhouette');
      for (const { part, scale } of clues) assert.deepEqual(part.scale, scale, `${type} clue keeps its designed size`);
      model.traverse(part => assert.ok([...part.position, ...part.quaternion, ...part.scale].every(Number.isFinite)));
    }
    animateFarmSheep(model, 7, { night: true }); const pose = collect(model, () => true).map(part => [...part.position, ...part.quaternion, ...part.scale]);
    for (let frame = 0; frame < 50; frame++) animateFarmSheep(model, frame / 10, { grazing: true });
    animateFarmSheep(model, 7, { night: true }); assert.deepEqual(collect(model, () => true).map(part => [...part.position, ...part.quaternion, ...part.scale]), pose, 'animation does not drift after many frames');
  }
  kit.dispose();
});

test('seated Shiba blinks, watches, barks and yawns without moving away from its kennel', () => {
  const kit = createModelKit(), dog = kit.shiba({ sitting: true }); dog.position.set(-9.6, 0, 10.95); dog.rotation.y = .2;
  const rootPose = [...dog.position, ...dog.quaternion, ...dog.scale], jawRest = dog.userData.jaw.rotation.x;
  assert.equal(dog.userData.eyes.length, 2); assert.equal(dog.userData.ears.length, 2); assert.ok(dog.userData.body && dog.userData.tail);
  assert.equal(animateFarmDog(dog, 0, { alert: true }).barking, true); assert.ok(dog.userData.jaw.rotation.x > jawRest + .2);
  assert.equal(animateFarmDog(dog, 20, { night: true }).yawning, true); assert.ok(dog.userData.jaw.rotation.x > jawRest + .1);
  for (const time of [0, .08, 1, 4.18, 20, 600, NaN]) for (const night of [false, true]) for (const alert of [false, true]) {
    animateFarmDog(dog, time, { night, alert, playerPosition: { x: dog.position.x + 1, z: dog.position.z + 2 } });
    assert.deepEqual([...dog.position, ...dog.quaternion, ...dog.scale], rootPose);
    dog.traverse(part => {
      assert.ok([...part.position, ...part.quaternion, ...part.scale].every(Number.isFinite));
      assert.ok(part.scale.x > 0 && part.scale.y > 0 && part.scale.z > 0);
    });
  }
  kit.dispose();
});
