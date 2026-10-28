import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { charmPool, offeringOdds, offeringChance, diceOutcome, rollThreeDice, threeDiceOdds, LUCK_DICE, CHARM_ITEMS, BOMB_DAMAGE } from './charms.js';
import { newGame, gameReducer as reduce, advanceDawn, readSave, SAVE_KEY } from './rules.js';
import { evolveWolf, calculateStrike } from './catalog.js';
import { PveEngine } from './PveEngine.js';
import { createCombatCharms } from './combatCharms.js';
const bet = (state, id, balanceRoll = 0, coins = 3) => {
 const luck = state.magic?.luck?.day === state.day && !state.magic.luck.consumed ? state.magic.luck.multiplier : 1;
 let edge = 0, prizeRoll = 0;
 for (const row of charmPool(state.day, luck)) { if (row.id === id) { prizeRoll = edge + row.probability / 2; break; } edge += row.probability; }
 return reduce(state, { type: 'WEIGH_CHARM', coins, prizeRoll, balanceRoll });
};
const claim = state => reduce(state, { type: 'RESOLVE_CHARM', id: state.magic.ritual.id });
function fight() {
  let state = newGame(); const wolf = { ...evolveWolf('normal', 1), id: 'test-wolf', wolf: true, penId: 0, checked: [], defeated: false };
  state = reduce(state, { type: 'NIGHT', residents: [wolf] }); state = reduce(state, { type: 'CHECK', id: wolf.id, part: 'wool', breakRoll: 1 }); state = reduce(state, { type: 'COMBAT' }); return reduce(state, { type: 'PVE_BEGIN' });
}
const restore = state => readSave({ getItem: key => key === SAVE_KEY ? JSON.stringify(state) : null });

test('three dice use low below 12, middle exactly 12 and high above 12, including triples', () => {
 const counts={low:0,middle:0,high:0};
 for(let a=1;a<=6;a++) for(let b=1;b<=6;b++) for(let c=1;c<=6;c++) {
  const dice=[a,b,c],sum=a+b+c,expected=sum<12?'low':sum===12?'middle':'high';counts[expected]++;
  for(const choice of ['low','middle','high']) {
   const result=diceOutcome(dice,choice);assert.equal(result.side,expected);assert.equal(result.won,expected===choice);assert.equal(result.multiplier,result.won?2:1);

  }
 }
 assert.deepEqual(counts,{low:135,middle:25,high:56});
 assert.deepEqual(threeDiceOdds(),{low:.28,middle:.05,high:.28});
 assert.equal(diceOutcome([4,4,4],'middle').won,true);
});

test('dice decide wins from the selected guess before generating matching faces', () => {
 const expected={low:{low:2800,middle:500,high:6700},high:{low:6700,middle:500,high:2800},middle:{low:4750,middle:500,high:4750}};
 for(const choice of ['low','middle','high']) {
  const count={low:0,middle:0,high:0};let wins=0;
  for(let i=0;i<10000;i++) {
   const rolls=[(i+.5)/10000,((i*37)%1000+.5)/1000,((i*73)%1000+.5)/1000];
   const result=rollThreeDice(rolls,choice);count[result.side]++;if(result.won) wins++;
   assert.equal(result.won,rolls[0]<threeDiceOdds()[choice]);
   assert.deepEqual(diceOutcome(result.dice,choice),{total:result.total,triple:result.triple,side:result.side,won:result.won,multiplier:result.multiplier});
   assert.ok(result.dice.every(n=>Number.isInteger(n)&&n>=1&&n<=6));
  }
  assert.deepEqual(count,expected[choice]);assert.equal(wins,choice==='middle'?500:2800);
  const rate=threeDiceOdds()[choice];
  assert.equal(rollThreeDice([rate-1e-8,0,0],choice).won,true);
  assert.equal(rollThreeDice([rate,0,0],choice).won,false);
 }
 assert.equal(rollThreeDice([.1,0,0],'low').side,'low');
 assert.equal(rollThreeDice([.1,0,0],'high').side,'high');
});

test('dice charge five coins, persist the choice and consume luck for exactly one offering', () => {
 const rolls=[.01,.20,.40]; // 1,2,3: Xiu
 let state=reduce(newGame(), {type:'ROLL_LUCK',choice:'low',rolls});
 assert.equal(state.gold,20);assert.equal(state.magic.luck.multiplier,2);
 assert.equal(state.magic.luck.revealed,false);assert.equal(bet(state,'moonCharm').gold,20);
 assert.equal(reduce(state,{type:'REVEAL_LUCK',id:'wrong'}).magic.luck.revealed,false);
 state=reduce(restore(state),{type:'REVEAL_LUCK',id:state.magic.luck.id});assert.equal(state.magic.luck.revealed,true);
 assert.equal(reduce(state,{type:'REVEAL_LUCK',id:state.magic.luck.id}).gold,20);
 assert.deepEqual(restore(state).magic,state.magic);
 assert.equal(reduce(state,{type:'ROLL_LUCK',choice:'high',rolls}).gold,20);
 state=bet(state,'moonCharm');assert.equal(state.gold,17);assert.equal(state.magic.ritual.luck,2);
 assert.equal(reduce(state,{type:'ROLL_LUCK',choice:'high',rolls}).gold,17);
 state=claim(state);state=reduce(state,{type:'PREPARE_CHARM'});
 assert.equal(bet(state,'bombCharm').magic.ritual.luck,1);
 const reroll=reduce(state,{type:'ROLL_LUCK',choice:'high',rolls:[.9,.2,.4]});assert.equal(reroll.gold,12);assert.equal(reroll.magic.luck.multiplier,1);
 for(const value of [{choice:'wrong',rolls},{choice:'low',rolls:[0,1,.5]},{choice:'low',rolls:[.5,.5]}]) assert.equal(reduce(newGame(),{type:'ROLL_LUCK',...value}).gold,25);
 assert.equal(reduce({...newGame(),gold:4},{type:'ROLL_LUCK',choice:'low',rolls}).gold,4);
 assert.equal(reduce({...newGame(),day:2},{type:'ROLL_LUCK',choice:'low',rolls}).gold,25);
 const win=reduce(newGame(),{type:'ROLL_LUCK',choice:'high',rolls:[.01,.99,.99]});assert.equal(win.magic.luck.multiplier,2);
 const tampered=structuredClone(reroll);tampered.magic.luck.multiplier=2;assert.equal(restore(tampered),null);
});

test('normalized random pools never overflow and VIP remains rare even at maximum luck', () => {
 for (const day of [1,31,1000]) for (const {multiplier:luck} of LUCK_DICE) for (const coins of [1,3,12]) {
  const odds=offeringOdds(day,coins,luck);
  assert.ok(Math.abs(odds.reduce((n,r)=>n+r.probability,0)-1)<1e-12);
  assert.ok(odds.reduce((n,r)=>n+r.awarded,0)<1);
  for(const row of odds) { assert.ok(row.chance>0 && row.chance<=.98); assert.ok(row.awarded>=0 && row.awarded<=1); }
  assert.ok(odds.filter(r=>['moonCharm','yieldCharm'].includes(r.id)).reduce((n,r)=>n+r.probability,0)<.05);
 }
 assert.ok(charmPool(31,5).find(r=>r.id==='yieldCharm').probability<charmPool(1,5).find(r=>r.id==='yieldCharm').probability);
});

test('left pan wins when balanced or heavier; probabilities match sampled outcomes for every charm', () => {
 for (const id of Object.keys(CHARM_ITEMS)) for(const coins of [1,12]) for(const luck of [1,5]) {
  const chance=offeringChance(coins,luck,id); let wins=0;
  for(let i=0;i<200;i++) {
   const initial=newGame(); initial.magic.luck={day:1,face:luck===5?6:1,multiplier:luck};
   const state=bet(initial,id,(i+.5)/200,coins),r=state.magic.ritual;
   assert.equal(r.item,id); assert.equal(state.gold,25-coins); assert.equal(r.balanced,r.delta<=0);
   if(r.balanced) { wins++; assert.equal(claim(state).inventory[id],1); }
  }
  assert.ok(Math.abs(wins/200-chance)<.006);
 }
 const boundary=bet(newGame(),'forageCharm',offeringChance(3,1,'forageCharm'));
 assert.equal(boundary.magic.ritual.delta,0); assert.equal(boundary.magic.ritual.balanced,true);
});

test('offering, result and luck survive resume without paying twice or rerolling', () => {
 let state=bet(newGame(),'bombCharm');
 assert.deepEqual(restore(state).magic,state.magic);
 assert.equal(bet(state,'yieldCharm').gold,state.gold);
 assert.equal(reduce(state,{type:'RESOLVE_CHARM',id:'wrong'}).inventory.bombCharm||0,0);
 state=claim(restore(state)); assert.equal(state.inventory.bombCharm,1); assert.equal(claim(state).inventory.bombCharm,1);
 assert.equal(bet(state,'blinkCharm').gold,state.gold-3);
 const night=reduce(bet(newGame(),'blinkCharm'),{type:'NIGHT',residents:[]}); assert.equal(night.inventory.blinkCharm,1);
 const failed=claim(bet(newGame(),'moonCharm',.999)); assert.equal(failed.gold,22); assert.equal(failed.inventory.moonCharm||0,0);
 for(const coins of [0,-1,1.5,13,NaN,Infinity]) assert.equal(bet(newGame(),'bombCharm',0,coins).gold,25);
 assert.equal(bet({...newGame(),day:2},'bombCharm').gold,25);
 assert.equal(bet({...newGame(),phase:'night'},'bombCharm').gold,25);
 assert.equal(reduce(newGame(),{type:'BUY',item:'bombCharm'}).inventory.bombCharm||0,0);
 for(const roll of [-1,1,NaN]) assert.equal(reduce(newGame(),{type:'WEIGH_CHARM',coins:3,prizeRoll:roll,balanceRoll:0}).gold,25);
 const forged=reduce(newGame(),{type:'WEIGH_CHARM',coins:3,prizeRoll:0,balanceRoll:0,item:'yieldCharm',luck:999});
 assert.equal(forged.magic.ritual.item,'goldCharm'); assert.equal(forged.magic.ritual.luck,1);
});

test('a previously paid random-pool ritual keeps its result when loaded after the ticket update', () => {
  const state = newGame(); state.gold = 13;
  state.magic = { sequence: 1, lastWeighedDay: 1, ritual: { id: 'scale-1-1', day: 1, coins: 12, item: 'moonCharm', delta: 0, balanced: true, claimed: false } };
  const loaded = restore(state); assert.ok(loaded);
  const resolved = claim(loaded); assert.equal(resolved.gold, 13); assert.equal(resolved.inventory.moonCharm, 1);
  assert.equal(claim(resolved).inventory.moonCharm, 1);
  const ticket = newGame(); ticket.gold = 19;
  ticket.magic = { sequence: 1, lastWeighedDay: 1, ritual: { id: 'old-ticket', model: 'target-v1', day: 1, coins: 6, chance: .22, item: 'yieldCharm', delta: -.5, balanced: true, claimed: false } };
  assert.equal(claim(restore(ticket)).inventory.yieldCharm, 1);
  const tampered = bet(newGame(), 'bombCharm'); tampered.magic.ritual.luck = 999;
  assert.equal(restore(tampered), null);

});

test('money charms activate exactly once, never create inventory items and cannot make gold negative', () => {
 const plus=claim(bet(newGame(),'goldCharm'));assert.equal(plus.gold,34);assert.equal(claim(restore(plus)).gold,34);assert.equal(plus.inventory.goldCharm,undefined);
 const minus=claim(bet(newGame(),'debtCharm'));assert.equal(minus.gold,14);assert.equal(claim(restore(minus)).gold,14);assert.equal(minus.inventory.debtCharm,undefined);
 const poor=claim(bet({...newGame(),gold:4},'debtCharm'));assert.equal(poor.gold,0);assert.ok(restore(poor));
 const lost=claim(bet(newGame(),'debtCharm',.999));assert.equal(lost.gold,22);
 let state=newGame();for(let i=0;i<4;i++){state=claim(bet(state,'forageCharm'));} assert.equal(state.gold,13);assert.equal(state.inventory.forageCharm,4);
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
