import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceDawn, gameReducer as reduce, makeResidents, newGame, readSave, SAVE_KEY, dogAvailable, overrun } from './rules.js';
import { WOLVES, evolveWolf, spawnWolves, absorbDamage, calculateStrike } from './catalog.js';
import { PATTERN_REGISTRY } from '../canvas/patterns/AttackPatterns.js';
import { BulletPool } from '../canvas/BulletPool.js';
import { CombatEngine } from '../canvas/CombatEngine.js';

function wolf(type = 'normal', day = 1) { return { ...evolveWolf(type, day), id: `test-${type}`, wolf: true, penId: 0, checked: [], name: 'Cừu 01', defeated: false, eatenProgress: 0 }; }
function atNight(type = 'normal', day = 1) { const s = { ...newGame(), day }; return reduce(s, { type: 'NIGHT', residents: [wolf(type, day), ...s.flock.map(a => ({ ...a, wolf: false, checked: [], name: 'Cừu thật' }))] }); }
function fighting(type = 'normal') { let s = atNight(type); s = reduce(s, { type: 'CHECK', id: `test-${type}`, part: 'wool' }); return reduce(s, { type: 'COMBAT' }); }

test('win requires 200 gold and explicit farm sale, never a five-night deadline', () => {
  let s = newGame();
  assert.equal(s.targetGold, 200); assert.equal(s.energy, 2);
  assert.equal(reduce(s, { type: 'SELL' }).phase, 'day');
  for (let i = 0; i < 24; i++) s = advanceDawn({ ...s, phase: 'night', residents: [] }, () => 0.9);
  assert.equal(s.day, 25); assert.equal(s.phase, 'day');
  assert.equal(reduce({ ...s, gold: 200 }, { type: 'SELL' }).phase, 'win');
  assert.equal(reduce({ ...s, phase: 'night', gold: 200 }, { type: 'SELL' }).phase, 'night');
});
test('one adult earns one gold; babies mature after two days without earning early', () => {
  const start = newGame();
  const day2 = advanceDawn({ ...start, residents: [] }, () => 0.9);
  assert.equal(day2.gold - start.gold, 6); assert.equal(day2.flock.filter(s => s.age === 'baby').length, 2);
  const day3 = advanceDawn({ ...day2, residents: [] }, () => 0.9);
  assert.equal(day3.gold - day2.gold, 6); assert.equal(day3.flock.filter(s => s.age === 'adult').length, 8);
  assert.equal(advanceDawn({ ...day3, residents: [] }, () => 0.9).gold - day3.gold, 8);
});
test('rain needs hay or a roof and the sunshine doll changes tomorrow weather', () => {
  let s = { ...newGame(), farm: { ...newGame().farm, weather: 'rainy', fed: false } };
  assert.equal(advanceDawn({ ...s, residents: [] }, () => 0).gold, s.gold);
  s = reduce(s, { type: 'BUY', item: 'hay' }); s = reduce(s, { type: 'FEED' });
  assert.equal(s.farm.fed, true); assert.equal(s.inventory.hay, 0);
  s = reduce(s, { type: 'BUY', item: 'sunDoll' }); s = reduce(s, { type: 'USE', item: 'sunDoll' });
  assert.equal(advanceDawn({ ...s, residents: [] }, () => 0).farm.weather, 'sunny');
  assert.equal(reduce({ ...newGame(), farm: { ...newGame().farm, fed: false } }, { type: 'BUY', item: 'roof' }).farm.fed, true);
});
test('shops enforce prices, merchant presence and unique farm upgrades', () => {
  let s = reduce(newGame(), { type: 'BUY', item: 'fence' });
  assert.equal(s.gold, 20); assert.equal(s.farm.divided, true); assert.deepEqual(new Set(s.flock.map(a => a.penId)), new Set([0, 1]));
  assert.equal(reduce(s, { type: 'BUY', item: 'fence' }).gold, 20);
  assert.equal(reduce({ ...s, merchant: { present: false } }, { type: 'BUY', item: 'ammo' }).player.ammo, 0);
  assert.equal(reduce({ ...s, gold: 0 }, { type: 'BUY', item: 'roof' }).farm.roof, false);
});
test('investigation spends one of two energy; repeated checks are free; shearing uses a 2-gold battery', () => {
  let s = atNight();
  s = reduce(s, { type: 'CHECK', id: 'test-normal', part: 'eyes' }); assert.equal(s.energy, 1); assert.equal(s.phase, 'night');
  assert.deepEqual(reduce(s, { type: 'CHECK', id: 'test-normal', part: 'eyes' }), s);
  s = reduce(s, { type: 'CHECK', id: 'test-normal', part: 'wool' });
  assert.equal(s.phase, 'reveal'); assert.equal(s.energy, 0); assert.equal(s.inventory.battery, 1);
  const tired = { ...atNight(), player: { ...newGame().player, energy: 0 }, inventory: { ...newGame().inventory, beer: 1 } };
  const refreshed = reduce(tired, { type: 'USE', item: 'beer' }); assert.equal(refreshed.energy, 2); assert.equal(refreshed.inventory.beer, 0);
  const noBattery = { ...atNight(), inventory: { ...newGame().inventory, battery: 0 } };
  assert.equal(reduce(noBattery, { type: 'CHECK', id: 'test-normal', part: 'wool' }).energy, 2);
});
test('matching tells expose each species and a full moon suppresses every tell', () => {
  for (const type of ['normal', 'rabid', 'pup', 'lean', 'alpha']) {
    const s = atNight(type, WOLVES[type].minNight);
    assert.equal(reduce(s, { type: 'CHECK', id: `test-${type}`, part: WOLVES[type].tell }).phase, 'reveal');
  }
  let s = atNight('normal', 7);
  assert.deepEqual(s.residents[0].tells, []);
  s = reduce(s, { type: 'CHECK', id: 'test-normal', part: 'paws' }); assert.equal(s.phase, 'night');
  assert.equal(reduce(s, { type: 'CHECK', id: 'test-normal', part: 'wool' }).phase, 'reveal');
  assert.equal(reduce(atNight('white', 8), { type: 'CHECK', id: 'test-white', part: 'eyes' }).phase, 'night');
});
test('strict overrun threshold is greater than 50 percent and wolves persist into next night', () => {
  assert.equal(overrun(8, 4), false); assert.equal(overrun(8, 5), true);
  const s = atNight('normal');
  const dawn = advanceDawn(s, () => 0.9);
  assert.equal(dawn.sheep, 7); assert.equal(dawn.wolves.length, 1);
  const residents = makeResidents(dawn.day, dawn.flock, () => 0, { wolves: dawn.wolves, divided: false });
  assert.equal(residents.filter(a => a.wolf).length, 2);
  const invaded = reduce(newGame(), { type: 'NIGHT', residents: Array.from({ length: 5 }, (_, i) => ({ ...wolf(), id: `w${i}` })) });
  assert.equal(invaded.phase, 'lose');
});
test('lean wolves eat one every two days while Alpha eats two per night', () => {
  let s = atNight('lean', 4); let d = advanceDawn(s, () => 0.9); assert.equal(d.sheep, 8);
  d = advanceDawn({ ...d, residents: d.wolves }, () => 0.9); assert.equal(d.sheep, 7);
  assert.equal(advanceDawn(atNight('alpha', 8), () => 0.9).sheep, 6);
});
test('dog detects no pups, blocks one blow, buffs damage and is exhausted the following night', () => {
  let s = reduce(atNight('pup', 4), { type: 'DOG_SCAN', penId: 0 }); assert.equal(s.dog.lastScan.danger, false);
  s = reduce(atNight(), { type: 'DOG_SCAN', penId: 0 }); assert.equal(s.dog.lastScan.danger, true);
  s = reduce(fighting(), { type: 'DOG' }); assert.equal(s.combat.shieldAvailable, true); assert.equal(s.dog.exhaustedThroughNight, 2);
  s = reduce(s, { type: 'DAMAGE', amount: 90, bleed: true }); assert.equal(s.hp, 100); assert.equal(s.combat.shieldAvailable, false);
  s = reduce(s, { type: 'DAMAGE', amount: 10 }); assert.equal(s.hp, 90);
  assert.equal(dogAvailable({ ...s, day: 2 }), false); assert.equal(dogAvailable({ ...s, day: 3 }), true);
  assert.equal(calculateStrike(0.5, s.player, wolf(), true, () => 1).damage, 36);
});
test('armor absorbs before HP, repair restores durability, and penetrating rabid hits bleed', () => {
  const player = { ...newGame().player, armor: { durability: 5, maxDurability: 20 } };
  const result = absorbDamage(player, 12); assert.equal(result.player.armor.durability, 0); assert.equal(result.player.hp, 93); assert.equal(player.armor.durability, 5);
  let s = fighting('rabid'); s = { ...s, player: { ...s.player, armor: { durability: 5, maxDurability: 20 } } };
  s = reduce(s, { type: 'DAMAGE', amount: 10, bleed: true }); assert.equal(s.hp, 95); assert.equal(s.combat.bleedTurns, 3);
  s = reduce(s, { type: 'END_DODGE' }); assert.equal(s.hp, 93); assert.equal(s.combat.bleedTurns, 2);
  s = { ...s, inventory: { ...s.inventory, repairKit: 1 } }; s = reduce(s, { type: 'USE', item: 'repairKit' }); assert.equal(s.player.armor.durability, 15);
  assert.equal(reduce(s, { type: 'DAMAGE', amount: 999 }).phase, 'lose');
});
test('guns need ammo, consume one per shot and have a wider critical zone; lean evades at 30 percent', () => {
  const player = newGame().player;
  assert.equal(calculateStrike(0.5, { ...player, weapon: 'gun', ammo: 0 }, wolf(), false, () => 1).damage, 0);
  assert.equal(calculateStrike(0.65, { ...player, weapon: 'gun', ammo: 1 }, wolf(), false, () => 1).label, 'Critical!');
  assert.notEqual(calculateStrike(0.65, player, wolf(), false, () => 1).label, 'Critical!');
  assert.equal(calculateStrike(0.5, player, wolf('lean'), false, () => 0.29).damage, 0);
  assert.equal(calculateStrike(0.5, player, wolf('lean'), false, () => 0.31).damage, 30);
  let s = fighting(); s = { ...s, player: { ...s.player, weapon: 'gun', ammo: 1 } };
  s = reduce(s, { type: 'STRIKE', position: 0.5, roll: 0.9 }); assert.equal(s.player.ammo, 0);
});
test('spawn milestones and evolution never leak advanced species into early nights', () => {
  for (let day = 1; day <= 3; day++) for (const roll of [0, 0.4, 0.99]) assert.ok(['normal', 'rabid'].includes(spawnWolves(day, 8, false, () => roll)[0].type));
  assert.equal(spawnWolves(4, 8, false, () => 0.7)[0].type, 'pup');
  assert.equal(spawnWolves(4, 8, false, () => 0.9)[0].type, 'lean');
  assert.equal(spawnWolves(8, 8, false, () => 0.8)[0].type, 'alpha');
  assert.equal(spawnWolves(8, 8, false, () => 0.99)[0].type, 'white');
  assert.ok(evolveWolf('normal', 7).hp > evolveWolf('normal', 3).hp); assert.equal(evolveWolf('normal', 3).evolution, 0);
  assert.equal(spawnWolves(100, 0).length, 0);
});
test('each species has three real, finite Canvas attack patterns', () => {
  const bounds = { x: 60, y: 60, w: 280, h: 280 };
  for (const definition of Object.values(WOLVES)) {
    assert.equal(definition.patternPool.length, 3);
    for (const name of definition.patternPool) {
      assert.equal(typeof PATTERN_REGISTRY[name], 'function'); const pool = new BulletPool(200); let spawned = 0;
      for (let frame = 1; frame <= 360; frame++) { PATTERN_REGISTRY[name](pool, frame, bounds, definition.speed); spawned += pool.activeCount; pool.update(16.67, bounds); }
      assert.ok(spawned > 0, name); assert.ok(pool.pool.every(b => [b.x, b.y, b.vx, b.vy].every(Number.isFinite)), name);
    }
  }
});
test('Canvas enemy turns end exactly once after their fixed-step duration', () => {
  let ended = 0; const instance = new CombatEngine({ getContext: () => ({}) }, wolf(), () => {}, () => ended++);
  instance.currentPattern = () => {};
  for (let i = 0; i < 600; i++) instance._update(1000 / 60);
  assert.equal(ended, 1); assert.equal(instance.isEnemyTurn, false);
});
test('save migration preserves money/flock and valid new combat saves restore equipment', () => {
  const v2 = { version: 2, day: 9, gold: 83, sheep: 6, hp: 75, phase: 'win', defeated: 3 };
  const migrated = readSave({ getItem: key => key === 'under-the-wool-v2' ? JSON.stringify(v2) : null });
  assert.equal(migrated.gold, 83); assert.equal(migrated.sheep, 6); assert.equal(migrated.phase, 'day'); assert.equal(migrated.day, 9);
  const s = fighting('white'); assert.deepEqual(readSave({ getItem: key => key === SAVE_KEY ? JSON.stringify(s) : null }), s);
  assert.equal(readSave({ getItem: () => '{oops' }), null);
  assert.equal(readSave({ getItem: () => JSON.stringify({ ...newGame(), player: { ...newGame().player, hp: -1 } }) }), null);
});
