import test from 'node:test';
import assert from 'node:assert/strict';
import { PveEngine, combatPressure, DOG_ASSIST_INTERVAL } from './PveEngine.js';
import { newGame, gameReducer as reduce } from './rules.js';
import { evolveWolf, calculateStrike } from './catalog.js';
function fight() {
  let s = newGame(); const wolf = { ...evolveWolf('normal', 1), id: 'wolf', wolf: true, penId: 0, checked: [] };
  s = reduce(s, { type: 'NIGHT', residents: [wolf, ...s.flock.map(a => ({ ...a, wolf: false, checked: [] }))] });
  return reduce(reduce(s, { type: 'CHECK', id: wolf.id, part: 'wool', breakRoll: 1 }), { type: 'COMBAT' });
}
test('attack recovery prevents spam and cannot be bypassed by switching weapons', () => {
  const hits = [], e = new PveEngine({ onAttack: counter => hits.push(counter) });
  e.player = { x: 0, z: 0 }; e.wolf = { x: 0, z: 1 };
  e.press('KeyJ');
  for (let i = 0; i < 10; i++) { e.time += .1; e.release('KeyJ'); e.press('KeyJ'); }
  assert.equal(hits.length, 1);
  e.time = 1.05; e.counterUntil = 2; e.press('KeyJ');
  assert.deepEqual(hits, [false, true]);
  e.gun = true; e.time = 2.1; e.press('KeyJ'); assert.equal(hits.length, 3);
  e.gun = false; e.time = 3.2; e.press('KeyJ'); assert.equal(hits.length, 3);
  e.time = 3.55; e.press('KeyJ'); assert.equal(hits.length, 4);
  e.player.z = 5; e.time = 5; e.press('KeyJ'); assert.equal(hits.length, 4);
});
test('rebalanced damage keeps counters and gunshots stronger than ordinary melee', () => {
  const player = newGame().player, wolf = evolveWolf('normal', 1);
  assert.equal(calculateStrike(.65, player, wolf, false, () => 1).damage, 11);
  assert.equal(calculateStrike(.5, player, wolf, false, () => 1).damage, 18);
  assert.equal(calculateStrike(.75, { ...player, weapon: 'gun', ammo: 2 }, wolf, false, () => 1).damage, 24);
  assert.equal(calculateStrike(.5, { ...player, weapon: 'gun', ammo: 2 }, wolf, false, () => 1).damage, 38);
});
test('grazing fills hunger only in dry open pasture; rainy days require hay', () => {
  let s = newGame(); s.flock = s.flock.map(a => ({ ...a, hunger: 35 }));
  assert.equal(reduce(s, { type: 'GRAZE' }).flock[0].hunger, 35);
  s = reduce(s, { type: 'PASTURE' }); s = reduce(s, { type: 'GRAZE' }); assert.equal(s.flock[0].hunger, 39);
  s = { ...s, farm: { ...s.farm, weather: 'rainy' } }; assert.equal(reduce(s, { type: 'GRAZE' }).flock[0].hunger, 39);
  s = reduce(s, { type: 'BUY', item: 'hay' }); s = reduce(s, { type: 'FEED' }); assert.equal(s.flock[0].hunger, 100); assert.equal(s.inventory.hay, 0);
});
test('clipper survives first two uses, can break after third, and replacement resets wear', () => {
  let s = newGame(); s = reduce(s, { type: 'NIGHT', residents: s.flock.map(a => ({ ...a, wolf: false, checked: [] })) });
  s = { ...s, inventory: { ...s.inventory, battery: 8 } };
  for (let i = 0; i < 3; i++) { s = { ...s, player: { ...s.player, energy: 2 } }; s = reduce(s, { type: 'CHECK', id: s.flock[i].id, part: 'wool', breakRoll: 0 }); assert.equal(s.inventory.clipper, i < 2 ? 1 : 0); }
  assert.equal(s.player.clipperUses, 3); assert.equal(s.inventory.battery, 5);
  const failed = reduce(s, { type: 'CHECK', id: s.flock[4].id, part: 'wool' }); assert.equal(failed.inventory.battery, 5);
  s = reduce({ ...s, phase: 'day' }, { type: 'BUY', item: 'clipper' }); assert.equal(s.player.clipperUses, 0); assert.equal(s.inventory.clipper, 1);
});
test('difficulty protects sheep on easy and requires multiple real hits otherwise', () => {
  const s = fight(), id = s.flock[0].id;
  assert.equal(reduce({ ...s, difficulty: 'easy' }, { type: 'SHEEP_HIT', id }).flock[0].hp, 100);
  assert.equal(reduce({ ...s, difficulty: 'normal' }, { type: 'SHEEP_HIT', id }).flock[0].hp, 92);
  assert.equal(reduce({ ...s, difficulty: 'hard' }, { type: 'SHEEP_HIT', id }).flock[0].hp, 78);
  let hard = { ...s, difficulty: 'hard' }; for (let i = 0; i < 5; i++) hard = reduce(hard, { type: 'SHEEP_HIT', id }); assert.equal(hard.flock.some(a => a.id === id), false);
});
test('skills always telegraph, avoid immediate repeats, and deal one hit per cast', () => {
  let hits = 0; const e = new PveEngine({ random: () => .1, onHit: () => hits++ }); e.choose();
  const pattern = e.pattern; assert.equal(e.stage, 'windup'); assert.ok(e.effects.length); e.choose(); assert.notEqual(e.pattern, pattern);
  e.stage = 'strike'; e.timer = .3; e.effects = [{ ...e.player, radius: 2 }]; for (let i = 0; i < 5; i++) e.update(.05); assert.equal(hits, 1);
});
test('dodging avoids damage, blocking reduces it, perfect guard opens a counter', () => {
  let damage = -1; const e = new PveEngine({ onHit: amount => damage = amount });
  e.stage = 'strike'; e.timer = .3; e.effects = [{ ...e.player, radius: 4 }]; e.press('Space'); e.update(.05); assert.equal(damage, -1);
  e.time = 2; e.invulnerableUntil = 0; e.stage = 'strike'; e.timer = .3; e.effects = [{ ...e.player, radius: 4 }]; e.press('KeyK'); e.update(.05); assert.equal(damage, 0); assert.ok(e.counterUntil > e.time);
  e.hitIds.clear(); e.time += .5; e.update(.05); assert.equal(damage, 4);
});
test('dog cannot strike after a scan and PvE HP initialization is idempotent', () => {
  let s = fight(); s = reduce(s, { type: 'PVE_BEGIN' }); const hp = s.combatHp;
  assert.equal(reduce(s, { type: 'PVE_BEGIN' }).combatHp, hp);
  s = { ...s, dog: { ...s.dog, exhaustedThroughNight: s.day } };
  assert.equal(reduce(s, { type: 'PVE_DOG_HIT' }).combatHp, hp);
});

test('Shiba only assists active close combat during recovery and has a long cooldown', () => {
  let hits = 0; const e = new PveEngine({ dog: true, onDogHit: () => hits++ });
  e.player = { x: 0, z: 0 }; e.wolf = { x: 0, z: 1 };
  e.time = 10; e.stage = 'recover'; e.timer = 1; e.update(.01); assert.equal(hits, 0, 'no AFK dog attacks');
  e.press('KeyJ'); e.stage = 'strike'; e.timer = 1; e.effects = []; e.update(.01); assert.equal(hits, 0, 'wait for an opening');
  e.stage = 'recover'; e.timer = 1; e.update(.01); assert.equal(hits, 1);
  e.time += 2; e.press('KeyJ'); e.update(.01); assert.equal(hits, 1, 'no rapid follow-up');
  e.time = e.dogAt + DOG_ASSIST_INTERVAL; e.press('KeyJ'); e.stage = 'recover'; e.timer = 1; e.player = { x: -5, z: 4.3 }; e.update(.01); assert.equal(hits, 1, 'no remote assist');
  e.player = { x: 0, z: 0 }; e.update(.01); assert.equal(hits, 2);
  e.time += DOG_ASSIST_INTERVAL; e.stage = 'recover'; e.timer = 1; e.update(.01); assert.equal(hits, 2, 'needs a fresh player attack');
});
test('Shiba deals chip damage and leaves the finishing blow to the player', () => {
  let s = reduce(reduce(fight(), { type: 'PVE_BEGIN' }), { type: 'DOG' });
  const before = s.combatHp; s = reduce(s, { type: 'PVE_DOG_HIT' }); assert.equal(s.combatHp, before - 2);
  s = { ...s, combat: { ...s.combat, wolfHp: 2 } }; s = reduce(s, { type: 'PVE_DOG_HIT' }); assert.equal(s.combatHp, 1);
  assert.equal(reduce(s, { type: 'PVE_DOG_HIT' }).combatHp, 1);
});
test('pressure grows with nights and time, but keeps bounded hazards, telegraphs and recovery', () => {
  assert.ok(combatPressure(1, 0) < combatPressure(8, 0));
  assert.ok(combatPressure(8, 0) < combatPressure(8, 60));
  assert.equal(combatPressure(9999, 9999), 1);
  const early = new PveEngine({ random: () => .5 }), late = new PveEngine({ day: 30, random: () => .5 });
  early.choose(); late.choose(); assert.equal(early.effects.length, 3); assert.equal(late.effects.length, 5);
  for (const e of [early, late]) { e.stage = 'strike'; e.timer = 0; e.effects = []; e.update(.01); assert.ok(e.timer >= .75); }
  early.timer = 0; late.timer = 0; early.update(.01); late.update(.01);
  assert.ok(late.timer < early.timer); assert.ok(late.timer >= .4);
});
test('every generated skill has a walkable escape, even at late-night pressure and arena corners', () => {
  let seed = 463; const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const patterns = new Set();
  for (const type of ['normal', 'rabid', 'pup', 'lean', 'alpha', 'white']) for (const difficulty of ['easy', 'normal', 'hard']) for (const day of [1, 8, 100]) for (const [x, z] of [[0, 0], [-5, -3.8], [5, 4.3], [-5, 4.3], [5, -3.8]]) {
    const e = new PveEngine({ type, difficulty, day, random }); e.time = day === 100 ? 600 : 0; e.player = { x, z };
    for (let cast = 0; cast < 12; cast++) {
      e.choose(); patterns.add(e.pattern);
      assert.ok(e.effects.length <= 5); assert.ok(e.timer >= .85); assert.ok(e.projectileSpeed <= 7);
      const escape = e.safeSpot(); assert.ok(escape, `${type}/${difficulty}/${e.pattern} at ${x},${z}`);
      assert.ok(Math.abs(escape.x) <= 5 && escape.z >= -3.8 && escape.z <= 4.3);
      assert.ok(Math.hypot(escape.x - x, escape.z - z) / 3.8 + .22 <= e.timer + .001);
      // Walk there after reaction time, then stay through the complete cast.
      let damage = 0; e.onHit = amount => damage += amount; e.player = escape;
      const castDuration = e.pattern === 'fan' ? 1.4 : .38;
      e.stage = 'strike'; e.timer = castDuration;
      for (let frame = 0; frame <= Math.ceil(castDuration / .01); frame++) e.update(.01);
      assert.equal(damage, 0, `${e.pattern} must remain safe through its whole attack`);
      e.player = { x, z };
    }
  }
  assert.equal(patterns.size, 5);
});
test('wolf damage scales with nights and species while difficulty remains effective', () => {
  function hit(options) {
    let damage = 0; const e = new PveEngine({ ...options, onHit: amount => damage += amount });
    e.stage = 'strike'; e.timer = 1; e.effects = [{ ...e.player, radius: 1 }]; e.update(.01); return damage;
  }
  assert.equal(hit({}), 14);
  assert.ok(hit({ day: 22 }) > hit({ day: 1 }));
  assert.ok(hit({ type: 'alpha' }) > hit({})); assert.ok(hit({ type: 'pup' }) < hit({}));
  assert.ok(hit({ difficulty: 'easy' }) < hit({})); assert.ok(hit({ difficulty: 'hard' }) > hit({}));
});
