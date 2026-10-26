import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { charmOffers, charmOffer, CHARM_ITEMS, BOMB_DAMAGE } from './charms.js';
import { newGame, gameReducer as reduce, advanceDawn, readSave, SAVE_KEY } from './rules.js';
import { evolveWolf, calculateStrike } from './catalog.js';
import { PveEngine } from './PveEngine.js';
import { createCombatCharms } from './combatCharms.js';
const bet = (state, id, balanceRoll = .5) => reduce(state, { type: 'WEIGH_CHARM', item: id, balanceRoll });
const claim = state => reduce(state, { type: 'RESOLVE_CHARM', id: state.magic.ritual.id });
function fight() {
  let state = newGame(); const wolf = { ...evolveWolf('normal', 1), id: 'test-wolf', wolf: true, penId: 0, checked: [], defeated: false };
  state = reduce(state, { type: 'NIGHT', residents: [wolf] }); state = reduce(state, { type: 'CHECK', id: wolf.id, part: 'wool', breakRoll: 1 }); state = reduce(state, { type: 'COMBAT' }); return reduce(state, { type: 'PVE_BEGIN' });
}
const restore = state => readSave({ getItem: key => key === SAVE_KEY ? JSON.stringify(state) : null });

test('each selected charm ticket has its own fixed fee and chance, with expensive VIP rewards less likely', () => {
  const offers = charmOffers(1);
  assert.equal(offers.length, 8);
  assert.equal(charmOffer(1, 'forageCharm').price, 1); assert.equal(charmOffer(1, 'forageCharm').chance, .85);
  assert.equal(charmOffer(1, 'yieldCharm').price, 6); assert.equal(charmOffer(1, 'yieldCharm').chance, .22);
  for (const a of offers) for (const b of offers) if (a.price > b.price) assert.ok(a.chance < b.chance);
  assert.equal(charmOffer(1, 'hungerCurse'), null);
  assert.ok(charmOffer(31, 'yieldCharm').chance < charmOffer(1, 'yieldCharm').chance);
  assert.equal(charmOffer(100, 'yieldCharm').chance, .08);
});

test('the signed deviation reproduces each displayed ticket chance and only rewards the selected charm', () => {
  for (const day of [1, 31]) for (const id of Object.keys(CHARM_ITEMS)) {
    const offer = charmOffer(day, id);
    let wins = 0;
    for (let i = 0; i < 200; i++) {
      const roll = (i + .5) / 200, state = bet({ ...newGame(), day }, id, roll), ritual = state.magic.ritual;
      assert.ok(Math.abs(ritual.delta - (roll * 2 - 1) / offer.chance) < 1e-10);
      assert.equal(ritual.item, id); assert.equal(ritual.coins, offer.price); assert.equal(ritual.chance, offer.chance);
      assert.equal(ritual.balanced, Math.abs(ritual.delta) <= 1);
      assert.equal(state.gold, 25 - offer.price);
      if (ritual.balanced) { wins++; assert.equal(claim(state).inventory[id], 1); }
    }
    assert.ok(Math.abs(wins / 200 - offer.chance) < .011, 'advertised probability matches observed wins across the roll interval');
  }
});

test('one paid offering per visit survives save/close/resume and awards its selected charm exactly once', () => {
  let state = bet(newGame(), 'bombCharm');
  assert.equal(state.inventory.bombCharm || 0, 0);
  assert.equal(bet(state, 'yieldCharm').gold, state.gold);
  assert.deepEqual(restore(state).magic, state.magic);
  assert.equal(reduce(state, { type: 'RESOLVE_CHARM', id: 'wrong' }).inventory.bombCharm || 0, 0);
  state = claim(restore(state)); assert.equal(state.inventory.bombCharm, 1);
  assert.equal(claim(state).inventory.bombCharm, 1);
  assert.equal(bet(state, 'blinkCharm').gold, state.gold);
  const night = reduce(bet(newGame(), 'blinkCharm'), { type: 'NIGHT', residents: [] });
  assert.equal(night.inventory.blinkCharm, 1);
  const nextVisit = { ...advanceDawn({ ...night, residents: [] }, () => .9), day: 3 };
  assert.equal(bet(nextVisit, 'speedCharm').gold, nextVisit.gold - charmOffer(3, 'speedCharm').price);
});

test('failed tickets keep their fee and cannot choose a prize with a forged cheap price', () => {
  const failed = claim(bet(newGame(), 'moonCharm', .999));
  assert.equal(failed.gold, 20); assert.equal(failed.inventory.moonCharm || 0, 0);
  for (const item of ['unknown', 'hungerCurse', '', null]) assert.equal(bet(newGame(), item).gold, 25);
  const forged = reduce(newGame(), { type: 'WEIGH_CHARM', item: 'yieldCharm', coins: 1, balanceRoll: .5 });
  assert.equal(forged.gold, 19); assert.equal(forged.magic.ritual.coins, 6);
  assert.equal(bet({ ...newGame(), gold: 2 }, 'bombCharm').gold, 2);
  assert.equal(bet({ ...newGame(), day: 2 }, 'bombCharm').gold, 25);
  assert.equal(bet({ ...newGame(), phase: 'night' }, 'bombCharm').gold, 25);
  assert.equal(reduce(newGame(), { type: 'BUY', item: 'bombCharm' }).inventory.bombCharm || 0, 0);
});

test('a previously paid random-pool ritual keeps its result when loaded after the ticket update', () => {
  const state = newGame(); state.gold = 13;
  state.magic = { sequence: 1, lastWeighedDay: 1, ritual: { id: 'scale-1-1', day: 1, coins: 12, item: 'moonCharm', delta: 0, balanced: true, claimed: false } };
  const loaded = restore(state); assert.ok(loaded);
  const resolved = claim(loaded); assert.equal(resolved.gold, 13); assert.equal(resolved.inventory.moonCharm, 1);
  assert.equal(claim(resolved).inventory.moonCharm, 1);
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
  const legacy = newGame(); legacy.magic = { sequence: 1, lastWeighedDay: 1, ritual: { id: 'legacy-curse', day: 1, coins: 3, item: 'hungerCurse', delta: 0, balanced: true, claimed: false } };
  const cursed = claim(legacy);
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
