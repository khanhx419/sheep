import test from 'node:test';
import assert from 'node:assert/strict';
import { canStand, movePlayer, movementVector, interactionTarget, hasLineOfSight, gameKey, imeInterruptsGame, releaseGameKey, residentSlot, safeSpawn, WALLS, DIVIDER_WALLS, OUTDOOR_WALLS, DOG_HOME, DOG_SEAT, MEADOW_PATCHES, inMeadowPatch, outdoorWallsFor, SHOP_FOOTPRINT } from './worldMath.js';

test('the absent merchant leaves no invisible stall or crate collision', () => {
  for (const [x, z] of [[SHOP_FOOTPRINT.x, SHOP_FOOTPRINT.z], [7.2, 14.8]]) {
    assert.equal(canStand(x, z, [...WALLS, ...outdoorWallsFor(true)]), false);
    assert.equal(canStand(x, z, [...WALLS, ...outdoorWallsFor(false)]), true);
  }
  assert.ok(outdoorWallsFor(false).includes(DOG_HOME), 'only temporary shop objects disappear');
});

test('both hay plots are reachable on foot through the meadow entrance and surrounding fences block shortcuts', () => {
  const obstacles = [...WALLS, ...OUTDOOR_WALLS];
  let position = { x: 8.5, z: 12 };
  position = movePlayer(position, 3.7, 0, obstacles);
  assert.ok(Math.abs(position.x - MEADOW_PATCHES[0].x) < .001, 'the open entrance leads into the meadow');
  position = movePlayer(position, 0, 2.5, obstacles); assert.equal(inMeadowPatch(position, 0), true);
  position = movePlayer(position, 4, 0, obstacles); assert.equal(inMeadowPatch(position, 1), true);
  assert.equal(inMeadowPatch({ x: 0, z: 5 }, 0), false, 'barn cannot count as a cutting location');
  assert.equal(inMeadowPatch(MEADOW_PATCHES[0], 1), false); assert.equal(inMeadowPatch(MEADOW_PATCHES[0], '0'), false);
  const blocked = movePlayer({ x: 9, z: 16 }, 4, 0, obstacles);
  assert.ok(blocked.x < 9.7, 'fence beside the entrance is solid');
});

test('UniKey changed key text or Process/229 keyup cannot leave movement held', () => {
  const keys = new Set(['KeyW', 'KeyD']);
  releaseGameKey(keys, { code: 'KeyW', key: 'ư', isComposing: true, keyCode: 229 });
  assert.deepEqual([...keys], ['KeyD'], 'physical release does not cancel a different held key');
  releaseGameKey(keys, { code: 'Unidentified', key: 'Process', keyCode: 68 });
  assert.equal(keys.size, 0, 'legacy physical code releases the same key');
  keys.add('KeyW'); releaseGameKey(keys, { code: '', key: 'Process', keyCode: 229 });
  assert.equal(keys.size, 0, 'ambiguous IME release fails safe instead of walking forever');
  keys.add('KeyA'); releaseGameKey(keys, { code: 'Backspace', key: 'Backspace' }); assert.equal(keys.size, 0);
  assert.equal(gameKey({ code: 'KeyW', key: 'Process', keyCode: 229 }), 'KeyW');
  assert.equal(imeInterruptsGame({ code: 'KeyW', key: 'ư', isComposing: true, keyCode: 229 }), false);
  assert.equal(imeInterruptsGame({ code: '', key: 'Process', keyCode: 229 }), true);
  assert.equal(gameKey({ code: '', key: 'ư', which: 87 }), 'KeyW');
  keys.add('KeyW'); releaseGameKey(keys, { code: '', key: 'ư' }); assert.equal(keys.size, 0, 'accent-only keyup also stops movement');
  keys.add('ShiftLeft'); releaseGameKey(keys, { code: '', key: 'Shift', keyCode: 16 }); assert.equal(keys.size, 0);
});

test('doghouse blocks movement while seated Shiba remains reachable from the lane', () => {
  const obstacles = [...WALLS, ...OUTDOOR_WALLS];
  assert.equal(canStand(DOG_HOME.x, DOG_HOME.z, obstacles), false);
  assert.equal(canStand(DOG_SEAT.x, DOG_SEAT.z + 1, obstacles), true);
  const target = { position: DOG_SEAT, height: .65, animal: { id: 'shiba' } };
  assert.equal(interactionTarget({ x: DOG_SEAT.x, z: DOG_SEAT.z + 2, y: 1.65 }, { x: 0, y: -.5, z: -1 }, [target], obstacles)?.animal.id, 'shiba');
});

test('the barn doorway is walkable while planks and hay bales block the player', () => {
  assert.equal(canStand(0, 8), true);
  assert.equal(canStand(5, 8), false);
  assert.equal(canStand(8, -1), false);
  assert.equal(canStand(0, -10), false);
  assert.equal(canStand(-6.3, 12), false);
  assert.equal(canStand(23, 0), false);
  const throughDoor = movePlayer({ x: 0, z: 11 }, 0, -7);
  assert.ok(Math.abs(throughDoor.z - 4) < 0.001);
});

test('courtyard props block movement while the path and shop interaction stay accessible', () => {
  const obstacles = [...WALLS, ...OUTDOOR_WALLS];
  for (const prop of OUTDOOR_WALLS) assert.equal(canStand(prop.x, prop.z, obstacles), false);
  const path = movePlayer({ x: 0, z: 7 }, 0, 14, obstacles);
  assert.ok(Math.abs(path.z - 21) < 0.001, 'courtyard path stays clear');
  const shop = { position: { x: 4, z: 11.75 }, height: 1.45, animal: { id: 'farm-shop', shop: true } };
  for (const position of [{ x: 4, y: 1.65, z: 10.5 }, { x: 1.7, y: 1.65, z: 11.7 }]) {
    assert.ok(canStand(position.x, position.z, obstacles));
    const delta = { x: shop.position.x - position.x, y: -0.1, z: shop.position.z - position.z };
    assert.equal(interactionTarget(position, delta, [shop], obstacles)?.animal.id, 'farm-shop');
  }
});

test('farmhouse doorway leads inside and merchant interaction ignores only its own counter', () => {
  const obstacles = [...WALLS, ...OUTDOOR_WALLS];
  const inside = movePlayer({ x: -15, z: 13 }, 0, 4, obstacles);
  assert.ok(Math.abs(inside.z - 17) < .01);
  const shopWall = OUTDOOR_WALLS.find(o => o.x === 4);
  const candidate = { position: { x: 4, z: 12.7 }, height: 1.6, interactionObstacle: shopWall, animal: { id: 'vendor', merchant: true } };
  for (const position of [{ x: 4, y: 1.65, z: 10 }, { x: 1.7, y: 1.65, z: 12.7 }, { x: 4, y: 1.65, z: 15 }]) {
    assert.equal(interactionTarget(position, { x: 4 - position.x, y: 0, z: 12.7 - position.z }, [candidate], obstacles)?.animal.id, 'vendor');
  }
});
test('late-game populations fit inside the barn and a divider cannot trap the spawn point', () => {
  for (let i = 0; i < 24; i++) { const [x, z] = residentSlot(i, 0, false, 24); assert.ok(canStand(x, z)); assert.ok(Math.abs(x) < 7 && z > -9 && z < 7); }
  for (const penId of [0, 1]) for (let i = 0; i < 16; i++) { const [x, z] = residentSlot(i, penId, true); assert.ok(canStand(x, z, [...WALLS, ...DIVIDER_WALLS])); assert.equal(x > 0, penId === 1); }
  const spawn = safeSpawn([...WALLS, ...DIVIDER_WALLS]); assert.ok(canStand(spawn.x, spawn.z, [...WALLS, ...DIVIDER_WALLS]));
});
test('E targets the body surface even when the eye-level ray passes above the sheep', () => {
  const sheep = { position: { x: 0.2, z: 0 }, animal: { id: 's1' } };
  const found = interactionTarget({ x: 0, y: 1.65, z: 3 }, { x: 0, y: 0, z: -1 }, [sheep], []);
  assert.equal(found.animal.id, 's1'); assert.ok(found.distance < 3.3);
  assert.equal(interactionTarget({ x: 0, y: 1.65, z: 3 }, { x: 0, y: 0, z: 1 }, [sheep], []), null);
});
test('E and movement work when a browser provides key without a standard code', () => {
  assert.equal(gameKey({ key: 'e', code: '' }), 'KeyE');
  assert.equal(gameKey({ key: 'E', code: 'Unidentified' }), 'KeyE');
  assert.equal(gameKey({ key: 'w', code: '' }), 'KeyW');
  assert.equal(gameKey({ key: 'z', code: 'KeyW' }), 'KeyW');
  assert.equal(gameKey({ key: 'ArrowUp' }), 'ArrowUp');
});
test('E cannot interact through walls or the closed portion of a pen divider', () => {
  assert.equal(hasLineOfSight({ x: 7, z: 0 }, { x: 9, z: 0 }), false);
  assert.equal(hasLineOfSight({ x: -1, z: 0 }, { x: 1, z: 0 }, DIVIDER_WALLS), false);
  assert.equal(hasLineOfSight({ x: -1, z: 5 }, { x: 1, z: 5 }, DIVIDER_WALLS), true);
});
test('long movement cannot tunnel through a wall and diagonal motion slides along it', () => {
  const stopped = movePlayer({ x: 0, z: 0 }, 20, 0);
  assert.ok(stopped.x < 7.51 && stopped.x > 7.3);
  const sliding = movePlayer({ x: 7.3, z: 4 }, 2, -3);
  assert.ok(sliding.x < 7.51); assert.ok(Math.abs(sliding.z - 1) < 0.001);
});
test('the same speed applies diagonally and forward respects camera rotation', () => {
  const diagonal = movementVector(1, 1, 0, 3);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.z) - 3) < 0.0001);
  const forward = movementVector(1, 0, Math.PI / 2, 3);
  assert.ok(Math.abs(forward.x + 3) < 0.0001); assert.ok(Math.abs(forward.z) < 0.0001);
  assert.deepEqual(movementVector(0, 0, 0, 3), { x: 0, z: -0 });
});
test('animal bodies prevent walking through a sheep without blocking the whole aisle', () => {
  const obstacles = [...WALLS, { x: 0, z: 2, w: 1.05, d: 1.35 }];
  const stopped = movePlayer({ x: 0, z: 6 }, 0, -6, obstacles);
  assert.ok(stopped.z >= 2.99);
  const beside = movePlayer({ x: 2, z: 6 }, 0, -6, obstacles);
  assert.ok(Math.abs(beside.z) < 0.001);
});
