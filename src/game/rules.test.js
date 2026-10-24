import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceDawn, gameReducer as reduce, makeResidents, newGame, readSave, SAVE_KEY, dogAvailable, overrun, farmAnimals, visibleHerdCount, nextWeather } from './rules.js';
import { MEADOW_PATCHES } from './worldMath.js';
import { WOLVES, evolveWolf, spawnWolves, absorbDamage, calculateStrike } from './catalog.js';
import { PATTERN_REGISTRY } from '../canvas/patterns/AttackPatterns.js';
import { BulletPool } from '../canvas/BulletPool.js';
import { CombatEngine } from '../canvas/CombatEngine.js';

test('herd presentation counts disguised wolves, hides names and keeps real economy separate', () => {
  let s = newGame(); s.flock = s.flock.slice(0, 7);
  assert.equal(visibleHerdCount(s), 7);
  const wolf = { ...evolveWolf('normal', 1), id: 'hidden-wolf', wolf: true, penId: 0, name: 'Sói thường', checked: [] };
  s = reduce(s, { type: 'NIGHT', residents: [wolf, ...s.flock.map(a => ({ ...a, wolf: false, checked: [], name: 'Tên riêng' }))] });
  assert.equal(s.sheep, 7, 'income and overrun still use real sheep');
  assert.equal(visibleHerdCount(s), 8, 'HUD matches all eight visible bodies');
  for (const difficulty of ['easy', 'normal', 'hard']) assert.deepEqual(farmAnimals({ ...s, difficulty }).map(a => a.name), ['#01', '#02', '#03', '#04', '#05', '#06', '#07', '#08']);
  const defeated = { ...s, residents: s.residents.map(a => a.id === wolf.id ? { ...a, defeated: true } : a) };
  assert.equal(visibleHerdCount(defeated), 7); assert.equal(farmAnimals(defeated)[0].name, '#02', 'remaining tags do not shift');
  assert.equal(visibleHerdCount({ ...s, phase: 'day' }), 7);
});

test('hay must be cut inside each outdoor plot, once per plot per day, with a twelve-bundle storage limit', () => {
  let s = reduce(newGame(), { type: 'PASTURE' }); assert.equal(s.farm.pastureOpen, true);
  const cut = patch => ({ type: 'CUT_GRASS', patch, position: { x: MEADOW_PATCHES[patch].x, z: MEADOW_PATCHES[patch].z } });
  for (const action of [{ type: 'CUT_GRASS' }, { ...cut(0), position: { x: 0, z: 5 } }, { ...cut(0), patch: 1 }, { ...cut(0), patch: 99 }, { ...cut(0), patch: '0' }, { ...cut(0), position: { x: NaN, z: 14.5 } }]) {
    assert.equal(reduce(s, action).inventory.hay, 0, 'menu and remote actions cannot harvest');
  }
  s = reduce(s, cut(0)); assert.equal(s.inventory.hay, 2); assert.equal(s.farm.grassCut, 1);
  assert.equal(reduce(s, cut(0)).inventory.hay, 2, 'the same patch cannot be cut twice');
  s = reduce(s, cut(1)); assert.equal(s.inventory.hay, 4); assert.equal(s.farm.grassCut, 2);
  assert.equal(reduce(s, cut(1)).inventory.hay, 4);
  s = reduce(s, { type: 'NIGHT', residents: [] }); assert.equal(s.farm.pastureOpen, false);
  s = advanceDawn(s, () => .9); assert.equal(s.farm.grassCut, 0); assert.deepEqual(s.farm.cutPatches, []);
  s = reduce(s, cut(0)); assert.equal(s.inventory.hay, 6, 'plots regrow every dawn');
  const almostFull = { ...newGame(), inventory: { ...newGame().inventory, hay: 11 } };
  const full = reduce(almostFull, cut(0)); assert.equal(full.inventory.hay, 12);
  assert.equal(reduce(full, cut(1)).inventory.hay, 12); assert.deepEqual(reduce(full, cut(1)).farm.cutPatches, [0], 'full storage does not waste uncut grass');
  for (const state of [{ ...newGame(), phase: 'night' }, { ...newGame(), farm: { ...newGame().farm, weather: 'rainy' } }]) {
    assert.equal(reduce(state, cut(0)).inventory.hay, 0); assert.deepEqual(reduce(state, cut(0)).farm.cutPatches, []);
  }
});

test('vegetable chores are removed and old crop saves do not keep their state', () => {
  const s = newGame();
  assert.deepEqual(reduce(s, { type: 'WATER' }), s); assert.deepEqual(reduce(s, { type: 'HARVEST' }), s);
  const legacy = { ...s, farm: { ...s.farm, watered: true, cropGrowth: 3, cropHarvested: true } };
  const loaded = readSave({ getItem: () => JSON.stringify(legacy) });
  for (const key of ['watered', 'cropGrowth', 'cropHarvested']) assert.equal(key in loaded.farm, false);
});

test('rain has an independent 25 percent chance every day, including the day after rain', () => {
  for (const previous of ['sunny', 'rainy']) {
    const farm = { ...newGame().farm, weather: previous };
    assert.equal(nextWeather(farm, () => .249999), 'rainy');
    assert.equal(nextWeather(farm, () => .25), 'sunny');
    const rainCount = Array.from({ length: 400 }, (_, i) => nextWeather(farm, () => (i + .5) / 400)).filter(w => w === 'rainy').length;
    assert.equal(rainCount, 100);
    const dawn = advanceDawn({ ...newGame(), farm, residents: [] }, () => .1);
    assert.equal(dawn.farm.weather, 'rainy');
    assert.equal(advanceDawn({ ...dawn, residents: [] }, () => .1).farm.weather, 'rainy', 'rain yesterday does not reduce or increase today chance');
  }
  assert.equal(nextWeather({ nextSunny: true, weather: 'rainy' }, () => 0), 'sunny');
});

test('sun doll overrides weather and removed rain dolls cannot be used', () => {
  let s = newGame(); s.inventory = { ...s.inventory, sunDoll: 1, rainDoll: 1 };
  s = reduce(s, { type: 'USE', item: 'sunDoll' }); s = reduce(s, { type: 'USE', item: 'rainDoll' });
  assert.equal(s.farm.nextSunny, true); assert.equal(s.inventory.rainDoll, undefined);
  s = advanceDawn({ ...s, residents: [] }, () => .9);
  assert.equal(s.farm.weather, 'sunny');
  s = { ...s, farm: { ...s.farm, weather: 'rainy' } };
  assert.equal(reduce(s, { type: 'CUT_GRASS' }).inventory.hay, 0);
});

test('sleep from night still resolves surviving wolves and advances exactly one morning', () => {
  let s = newGame(); const wolf = { ...evolveWolf('normal', 1), id: 'sleep-wolf', wolf: true, penId: 0 };
  s = reduce(s, { type: 'NIGHT', residents: [wolf] }); const count = s.sheep;
  s = reduce(s, { type: 'SLEEP', random: () => .9 });
  assert.equal(s.phase, 'day'); assert.equal(s.day, 2); assert.equal(s.sheep, count - 1); assert.equal(s.wolves.length, 1);
  const fromDay = reduce(newGame(), { type: 'SLEEP', random: () => .9 }); assert.equal(fromDay.day, 2);
});

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
  const day3 = advanceDawn({ ...day2, farm: { ...day2.farm, fed: true }, residents: [] }, () => 0.9);
  assert.equal(day3.gold - day2.gold, 6); assert.equal(day3.flock.filter(s => s.age === 'adult').length, 8);
  assert.equal(advanceDawn({ ...day3, farm: { ...day3.farm, fed: true }, residents: [] }, () => 0.9).gold - day3.gold, 8);
});
test('rain needs hay even with a roof and the sunshine doll changes tomorrow weather', () => {
  let s = { ...newGame(), farm: { ...newGame().farm, weather: 'rainy', fed: false } };
  s.flock = s.flock.map(a => ({ ...a, hunger: 35 }));
  assert.equal(advanceDawn({ ...s, residents: [] }, () => 0).gold, s.gold);
  s = reduce(s, { type: 'BUY', item: 'hay' }); s = reduce(s, { type: 'FEED' });
  assert.equal(s.farm.fed, true); assert.equal(s.inventory.hay, 0);
  s = reduce(s, { type: 'BUY', item: 'sunDoll' }); s = reduce(s, { type: 'USE', item: 'sunDoll' });
  assert.equal(advanceDawn({ ...s, residents: [] }, () => 0).farm.weather, 'sunny');
  assert.equal(reduce({ ...newGame(), farm: { ...newGame().farm, fed: false } }, { type: 'UPGRADE_FARM', item: 'roof' }).farm.fed, false);
});
test('one daily construction improves a single shared enclosure and vendor stock stays available', () => {
  let s = reduce(newGame(), { type: 'UPGRADE_FARM', item: 'fence' });
  assert.equal(s.gold, 21); assert.equal(s.farm.divided, false); assert.deepEqual(new Set(s.flock.map(a => a.penId)), new Set([0]));
  assert.equal(reduce(s, { type: 'UPGRADE_FARM', item: 'expand' }).gold, 21);
  assert.equal(reduce({ ...s, merchant: { present: false } }, { type: 'BUY', item: 'ammo' }).player.ammo, 1);
  s = advanceDawn({ ...s, residents: [] }, () => .9);
  s = reduce(s, { type: 'UPGRADE_FARM', item: 'expand' }); assert.equal(s.farm.capacity, 12);
  assert.equal(reduce({ ...s, gold: 0 }, { type: 'UPGRADE_FARM', item: 'roof' }).farm.roof, false);
});

test('weapon purchases unlock guns and armor bonuses stop when durability reaches zero', () => {
  let s = newGame(); assert.equal(reduce(s, { type: 'SWITCH_WEAPON' }).player.weapon, 'tool');
  s = reduce(s, { type: 'BUY', item: 'gun' }); assert.equal(s.player.ammo, 3); assert.equal(s.player.ownsGun, true);
  assert.equal(reduce(s, { type: 'SWITCH_WEAPON' }).player.weapon, 'gun');
  const wolf = evolveWolf('normal', 1), player = newGame().player;
  const base = calculateStrike(.5, player, wolf, false, () => 1).damage;
  assert.ok(calculateStrike(.5, { ...player, toolBonus: .35 }, wolf, false, () => 1).damage > base);
  assert.ok(calculateStrike(.5, { ...player, armor: { itemId: 'armorHeavy', durability: 40 } }, wolf, false, () => 1).damage > base);
  assert.equal(calculateStrike(.5, { ...player, armor: { itemId: 'armorHeavy', durability: 0 } }, wolf, false, () => 1).damage, base);
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
test('Shiba scan blocks combat support until morning; fighting alone has no cooldown', () => {
  let s = reduce(atNight('pup', 4), { type: 'DOG_SCAN', penId: 0 }); assert.equal(s.dog.lastScan.danger, false);
  s = reduce(atNight(), { type: 'DOG_SCAN', penId: 0 }); assert.equal(s.dog.lastScan.danger, true);
  assert.equal(dogAvailable(s), false); assert.equal(dogAvailable({ ...s, day: 2 }), true);
  s = reduce(fighting(), { type: 'DOG' }); assert.equal(s.combat.shieldAvailable, true); assert.equal(s.dog.exhaustedThroughNight, 0);
  s = reduce(s, { type: 'DAMAGE', amount: 90, bleed: true }); assert.equal(s.hp, 100); assert.equal(s.combat.shieldAvailable, false);
  s = reduce(s, { type: 'DAMAGE', amount: 10 }); assert.equal(s.hp, 90);
  assert.equal(dogAvailable({ ...s, day: 2 }), true);
  assert.equal(calculateStrike(0.5, s.player, wolf(), true, () => 1).damage, 18);
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
  assert.equal(calculateStrike(0.5, player, wolf('lean'), false, () => 0.31).damage, 18);
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
