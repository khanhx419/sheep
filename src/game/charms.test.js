import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { charmOdds, balanceOdds, drawCharm, balanceDrift, CHARM_ITEMS, BOMB_DAMAGE } from './charms.js';
import { newGame, gameReducer as reduce, advanceDawn, readSave, SAVE_KEY } from './rules.js';
import { evolveWolf, calculateStrike } from './catalog.js';
import { PveEngine } from './PveEngine.js';
import { createCombatCharms } from './combatCharms.js';
const rollFor = (id, day = 1, coins = 3) => { const pool = charmOdds(day, coins); let before = 0; for (const row of pool) { if (row.id === id) return (before + row.chance / 2) / 100; before += row.chance; } throw new Error(id); };
const bet = (state, id, coins = 3, balanceRoll = .5) => reduce(state, { type: 'WEIGH_CHARM', coins, balanceRoll, charmRoll: rollFor(id, state.day, coins) });
const claim = state => reduce(state, { type: 'RESOLVE_CHARM', id: state.magic.ritual.id });
function fight() {
  let state = newGame(); const wolf = { ...evolveWolf('normal', 1), id: 'test-wolf', wolf: true, penId: 0, checked: [], defeated: false };
  state = reduce(state, { type: 'NIGHT', residents: [wolf] }); state = reduce(state, { type: 'CHECK', id: wolf.id, part: 'wool', breakRoll: 1 }); state = reduce(state, { type: 'COMBAT' }); return reduce(state, { type: 'PVE_BEGIN' });
}
const restore = state => readSave({ getItem: key => key === SAVE_KEY ? JSON.stringify(state) : null });

test('larger offerings raise actual VIP rewards while making balance harder; later interest remains rarer', () => {
  for (const day of [1, 11, 31, 100]) {
    let previous = null;
    for (let coins = 1; coins <= 12; coins++) {
      const pool = charmOdds(day, coins), odds = balanceOdds(day, coins);
      assert.ok(Math.abs(pool.reduce((sum, row) => sum + row.chance, 0) - 100) < 1e-8);
      assert.ok(Math.abs(pool.reduce((sum, row) => sum + row.receiveChance, 0) - odds.balanced) < 1e-8);
      assert.ok(odds.vip > 0 && odds.vip < odds.balanced && odds.balanced < 100);
      if (previous) { assert.ok(odds.vip > previous.vip); assert.ok(odds.balanced < previous.balanced); }
      for (const row of pool) assert.equal(drawCharm(day, rollFor(row.id, day, coins), coins), row.id);
      previous = odds;
    }
  }
  for (const coins of [1, 3, 6, 12]) assert.ok(charmOdds(31, coins).find(row => row.id === 'yieldCharm').receiveChance < charmOdds(1, coins).find(row => row.id === 'yieldCharm').receiveChance);
});

test('the saved signed weight deviation, rather than an unrelated success roll, decides balance', () => {
  for (const coins of [1, 3, 12]) for (const id of Object.keys(CHARM_ITEMS)) {
    for (const balanceRoll of [0, .05, .3, .5, .7, .95, .999]) {
      const state = bet(newGame(), id, coins, balanceRoll), ritual = state.magic.ritual;
      assert.ok(Math.abs(ritual.delta - (balanceRoll * 2 - 1) * balanceDrift(coins, id)) < 1e-10);
      assert.equal(ritual.balanced, Math.abs(ritual.delta) <= 1);
      assert.equal(state.gold, 25 - coins);
    }
  }
});

test('one paid offering per visit survives save/close/resume and awards its charm exactly once', () => {
  let state = bet(newGame(), 'bombCharm', 9);
  assert.equal(state.inventory.bombCharm || 0, 0, 'reward stays sealed until the ritual finishes');
  assert.equal(bet(state, 'yieldCharm', 12).gold, state.gold);
  assert.deepEqual(restore(state).magic, state.magic);
  assert.equal(reduce(state, { type: 'RESOLVE_CHARM', id: 'wrong' }).inventory.bombCharm || 0, 0);
  state = claim(restore(state)); assert.equal(state.inventory.bombCharm, 1);
  assert.equal(claim(state).inventory.bombCharm, 1);
  assert.equal(bet(state, 'blinkCharm').gold, state.gold);
  const night = reduce(bet(newGame(), 'blinkCharm'), { type: 'NIGHT', residents: [] });
  assert.equal(night.inventory.blinkCharm, 1, 'leaving before the animation ends does not lose the paid result');
  const nextVisit = { ...advanceDawn({ ...night, residents: [] }, () => .9), day: 3 };
  assert.equal(bet(nextVisit, 'speedCharm').gold, nextVisit.gold - 3);
});

test('failed offerings keep the cost; invalid stakes, absent merchants and direct charm purchases cannot bypass the scale', () => {
  const failed = claim(bet(newGame(), 'moonCharm', 12, .999));
  assert.equal(failed.gold, 13); assert.equal(failed.inventory.moonCharm || 0, 0);
  for (const coins of [0, -1, 13, 1.5, NaN, Infinity]) assert.equal(bet(newGame(), 'bombCharm', coins).gold, 25);
  assert.equal(bet({ ...newGame(), gold: 2 }, 'bombCharm', 3).gold, 2);
  assert.equal(bet({ ...newGame(), day: 2 }, 'bombCharm').gold, 25);
  assert.equal(bet({ ...newGame(), phase: 'night' }, 'bombCharm').gold, 25);
  assert.equal(reduce(newGame(), { type: 'BUY', item: 'bombCharm' }).inventory.bombCharm || 0, 0);
});

test('bombs and teleports consume owned charms; delayed bomb damage cannot be replayed after a reload', () => {
  let state = { ...fight(), inventory: { ...fight().inventory, bombCharm: 2, blinkCharm: 1 } };
  const hp = state.combatHp;
  state = reduce(state, { type: 'CAST_CHARM', item: 'bombCharm', id: 1 });
  assert.equal(state.inventory.bombCharm, 1); assert.equal(state.combatHp, hp);
  assert.equal(reduce(state, { type: 'CAST_CHARM', item: 'bombCharm', id: 2 }).inventory.bombCharm, 1);
  state = reduce(restore(state), { type: 'RESOLVE_BOMB', id: 1 }); assert.equal(state.combatHp, hp - BOMB_DAMAGE);
  assert.equal(reduce(state, { type: 'RESOLVE_BOMB', id: 1 }).combatHp, hp - BOMB_DAMAGE);
  state = reduce(state, { type: 'CAST_CHARM', item: 'blinkCharm', id: 2 }); assert.equal(state.inventory.blinkCharm, 0);
  assert.equal(reduce(state, { type: 'CAST_CHARM', item: 'blinkCharm', id: 3 }).inventory.blinkCharm, 0);
});

test('speed, stone and moon buffs work once and do not stack or survive their expiry', () => {
  let state = fight(); state = { ...state, inventory: { ...state.inventory, speedCharm: 2, wardCharm: 2, moonCharm: 2, strengthPotion: 1 } };
  state = reduce(state, { type: 'USE', item: 'speedCharm' }); assert.equal(state.player.speedBuff, 1.35);
  assert.equal(reduce(state, { type: 'USE', item: 'speedCharm' }).inventory.speedCharm, 1);
  state = reduce(state, { type: 'USE', item: 'moonCharm' }); assert.equal(state.player.charmDamageBuff, 1.3);
  assert.equal(calculateStrike(.65, state.player, evolveWolf('normal', 1), false, () => .99).damage, 14);
  assert.equal(reduce(state, { type: 'USE', item: 'strengthPotion' }).inventory.strengthPotion, 1);
  state = reduce(state, { type: 'USE', item: 'wardCharm' }); const hp = state.hp;
  state = reduce(state, { type: 'DAMAGE', amount: 30, bleed: true }); assert.equal(state.hp, hp); assert.equal(state.player.wardCharges, 0); assert.equal(state.combat.bleedTurns, 0);
  assert.equal(reduce(state, { type: 'DAMAGE', amount: 10 }).hp, hp - 10);
  state = reduce({ ...state, combat: { ...state.combat, wolfHp: 0 } }, { type: 'WON_FIGHT' });
  assert.equal(state.player.speedBuff, 1); assert.equal(state.player.charmDamageBuff, 1);
});

test('investigation and forage charms cannot be wasted at full energy or storage', () => {
  let state = newGame(); state.inventory = { ...state.inventory, insightCharm: 2, forageCharm: 2, hay: 12 };
  assert.equal(reduce(state, { type: 'USE', item: 'insightCharm' }).inventory.insightCharm, 2);
  assert.equal(reduce(state, { type: 'USE', item: 'forageCharm' }).inventory.forageCharm, 2);
  state = { ...state, phase: 'night', player: { ...state.player, energy: 1 } };
  state = reduce(state, { type: 'USE', item: 'insightCharm' }); assert.equal(state.player.energy, 2); assert.equal(state.inventory.insightCharm, 1);
  assert.equal(reduce(state, { type: 'USE', item: 'insightCharm' }).inventory.insightCharm, 1);
});

test('interest pays 150 percent once, respects hunger, and the bad charm adds only one dawn hunger penalty', () => {
  let state = newGame(); state.flock = state.flock.slice(0, 5); state.inventory = { ...state.inventory, yieldCharm: 2 };
  state = reduce(state, { type: 'USE', item: 'yieldCharm' }); assert.equal(state.farm.incomeMultiplier, 1.5);
  assert.equal(reduce(state, { type: 'USE', item: 'yieldCharm' }).inventory.yieldCharm, 1);
  const morning = advanceDawn(state, () => .9); assert.equal(morning.gold - state.gold, 7); assert.equal(morning.farm.incomeMultiplier, 1);
  assert.equal(advanceDawn({ ...state, farm: { ...state.farm, fed: false } }, () => .9).gold, state.gold);
  const cursed = claim(bet(newGame(), 'hungerCurse'));
  assert.equal(claim(cursed).farm.hungerCurse, 10);
  const hungry = advanceDawn(cursed, () => .9); assert.equal(hungry.flock[0].hunger, 25); assert.equal(hungry.farm.hungerCurse, 0);
  const boosted = { ...morning, inventory: { ...morning.inventory, forageCharm: 1, hay: 11 } };
  assert.equal(reduce(boosted, { type: 'USE', item: 'forageCharm' }).inventory.hay, 12);
});

test('teleport stays in the arena, avoids a dangerous landing when possible, and grants a brief evade window', () => {
  for (const position of [{ x: 0, z: 0 }, { x: 5, z: 4.3 }, { x: -5, z: -3.8 }]) {
    const engine = new PveEngine(); engine.player = { ...position }; engine.wolf = { x: 0, z: -2 };
    engine.keys.add('KeyD'); engine.effects = [{ x: position.x, z: position.z, radius: 1 }];
    assert.equal(engine.castCharm('blinkCharm', 1), true);
    assert.ok(Math.abs(engine.player.x) <= 5 && engine.player.z >= -3.8 && engine.player.z <= 4.3);
    assert.ok(Math.hypot(engine.player.x - position.x, engine.player.z - position.z) >= 1);
    assert.equal(engine.overlaps(engine.player, engine.effects[0]), false);
    assert.equal(engine.invulnerableUntil, .4); assert.equal(engine.castCharm('blinkCharm', 2), false);
  }
});

test('bombs resolve after flight exactly once and speed does not change attack recovery', () => {
  const hits = [], engine = new PveEngine({ onBombHit: id => hits.push(id) });
  assert.equal(engine.castCharm('bombCharm', 7), true);
  for (let i = 0; i < 12; i++) engine.update(.05); assert.deepEqual(hits, []);
  for (let i = 0; i < 20; i++) engine.update(.05); assert.deepEqual(hits, [7]);
  const normal = new PveEngine(), fast = new PveEngine(); fast.speedMultiplier = 1.35;
  normal.keys.add('KeyW'); fast.keys.add('KeyW'); for (let i = 0; i < 10; i++) { normal.update(.05); fast.update(.05); }
  assert.ok(Math.abs((2.5 - fast.player.z) / (2.5 - normal.player.z) - 1.35) < 1e-8);
  assert.equal(normal.attackReadyAt, fast.attackReadyAt);
});

test('combat spell effects keep finite transforms and release shared resources', () => {
  const scene = new T.Scene(), effects = createCombatCharms(scene), engine = new PveEngine();
  engine.castCharm('bombCharm', 1);
  for (let i = 0; i < 50; i++) { engine.update(.05); effects.update(engine); effects.root.traverse(part => assert.ok([...part.position, ...part.quaternion, ...part.scale].every(Number.isFinite))); }
  engine.castCharm('blinkCharm', 2); effects.update(engine);
  effects.dispose(); assert.equal(scene.children.length, 0);
});
