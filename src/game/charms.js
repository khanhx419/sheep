export const MIN_OFFERING = 1;
export const MAX_OFFERING = 12;
export const BOMB_DAMAGE = 34;
export const CHARMS = {
  forageCharm: { name: 'Bùa Cỏ Non', glyph: 'sprout', color: '#a8c887', description: 'Đổi thành 2 bó cỏ khô ngoài chiến đấu. Kho tối đa 12 bó.' },
  insightCharm: { name: 'Bùa Mắt Cú', glyph: 'eye', color: '#a9cbd0', description: 'Hồi 1 năng lượng điều tra ban đêm, tối đa 2.' },
  wardCharm: { name: 'Bùa Da Đá', glyph: 'shield', color: '#c4b6db', description: 'Chặn hoàn toàn một đòn của sói. Không cộng dồn; hết hạn sáng mai.' },
  moonCharm: { name: 'Bùa Trăng Bạc', glyph: 'moon', color: '#d3dce9', description: '+30% sát thương đến hết một trận. Không cộng dồn thuốc tăng lực.' },
  bombCharm: { name: 'Bùa Hỏa Bộc', glyph: 'bomb', color: '#e7a079', description: 'Trong trận: R hoặc nút Bùa nổ để ném vào sói, gây 34 sát thương. Không làm hại cừu.' },
  blinkCharm: { name: 'Bùa Dịch Chuyển', glyph: 'blink', color: '#b4aceb', description: 'Trong trận: Q hoặc nút Dịch chuyển. Đi tức thời khoảng 3 bước theo hướng WASD, mặc định lùi khỏi sói; bất tử 0,4 giây.' },
  speedCharm: { name: 'Bùa Phong Hành', glyph: 'wind', color: '#b8d9bd', description: '+35% tốc độ chạy đến hết một trận; không tăng tốc đánh. Không cộng dồn.' },
  yieldCharm: { name: 'Bùa Lợi Tức', glyph: 'coin', color: '#e9cb83', description: 'Nhận 150% thu nhập ở bình minh kế tiếp, làm tròn xuống. Đàn đói vẫn không sinh Xu. Không cộng dồn.' },
  goldCharm: { name: 'Bùa Tụ Tài', glyph: 'coinPlus', color: '#a07326', description: 'Tự kích hoạt sau khi lộ bùa: nhận ngay 12 Xu.' },
  debtCharm: { name: 'Bùa Hao Tài', glyph: 'coinMinus', color: '#a54452', description: 'Tự kích hoạt sau khi lộ bùa: mất 8 Xu, tối đa số Xu đang có.' },
  hungerCurse: { name: 'Lời Nguyền Đói', glyph: 'curse', color: '#ad8f9f', description: 'Lá bùa đen tự kích hoạt: sáng mai cả đàn mất thêm 10 độ no.' },
};
export const CHARM_ITEMS = Object.fromEntries(Object.entries(CHARMS).filter(([id]) => !['hungerCurse', 'goldCharm', 'debtCharm'].includes(id)).map(([id, charm]) => [id, { ...charm, id, price: 0, shop: 'charm' }]));
export function charmGrade(id) { return ['moonCharm', 'yieldCharm'].includes(id) ? 2 : ['forageCharm', 'insightCharm'].includes(id) ? 0 : 1; }
export const CHARM_TICKETS = {
  forageCharm: { price: 1, chance: .85 },
  insightCharm: { price: 2, chance: .75 },
  wardCharm: { price: 3, chance: .65 },
  speedCharm: { price: 3, chance: .62 },
  bombCharm: { price: 4, chance: .55 },
  blinkCharm: { price: 4, chance: .5 },
  moonCharm: { price: 5, chance: .35 },
  yieldCharm: { price: 6, chance: .22 },
};
export function charmOffer(day, id) {
  const ticket = CHARM_TICKETS[id];
  if (!ticket) return null;
  const chance = id === 'yieldCharm' ? Math.max(.08, ticket.chance - Math.floor(Math.max(0, day - 1) / 5) * .02) : ticket.chance;
  return { id, price: ticket.price, chance };
}
export function charmOffers(day = 1) { return Object.keys(CHARM_TICKETS).map(id => charmOffer(day, id)); }
// Pending rituals from the previous random-pool version keep their paid result.
export function ritualChance(ritual) {
  return ritual.chance ?? 1 / (1.25 + .055 * (ritual.coins - 1) + .13 * charmGrade(ritual.item));
}
export const DICE_COST = 5;
export const LUCK_DICE = [
 { face: 1, multiplier: 1, probability: .45 }, { face: 2, multiplier: 1.25, probability: .27 },
 { face: 3, multiplier: 1.5, probability: .16 }, { face: 4, multiplier: 2, probability: .08 },
 { face: 5, multiplier: 3, probability: .03 }, { face: 6, multiplier: 5, probability: .01 },
];
export function rollLuck(roll) {
 let edge = 0; return LUCK_DICE.find(row => roll < (edge += row.probability)) || LUCK_DICE.at(-1);
}
// Three fair dice: low 3–11, middle exactly 12, high 13–18.
export function diceOutcome(dice, choice) {
 const total = dice.reduce((sum, face) => sum + face, 0);
 const triple = dice.every(face => face === dice[0]);
 const side = total === 12 ? 'middle' : total < 12 ? 'low' : 'high';
 return { total, triple, side, won: side === choice, multiplier: side === choice ? 2 : 1 };
}
export const DICE_ODDS = Object.freeze({ low: .28, middle: .05, high: .28 });
const DICE_GROUPS = { low: [], middle: [], high: [] };
for(let a=1;a<=6;a++) for(let b=1;b<=6;b++) for(let c=1;c<=6;c++) {
 const dice=[a,b,c];DICE_GROUPS[diceOutcome(dice,'low').side].push(dice);
}
// Resolve win/loss against the selected guess first, then draw matching faces.
export function rollThreeDice(rolls, choice) {
 const won = rolls[0] < DICE_ODDS[choice];
 const side = won ? choice : choice === 'middle' ? (rolls[0] < (1 + DICE_ODDS.middle) / 2 ? 'low' : 'high') : rolls[0] < DICE_ODDS[choice] + DICE_ODDS.middle ? 'middle' : choice === 'low' ? 'high' : 'low';
 const group=DICE_GROUPS[side], picked=group[Math.floor(rolls[1]*group.length)];
 const turn=Math.floor(rolls[2]*3), dice=picked.map((_,i)=>picked[(i+turn)%3]);
 return { dice, choice, ...diceOutcome(dice, choice) };
}
export function threeDiceOdds() { return { ...DICE_ODDS }; }
function luckForTotal(total) { return total <= 6 ? 1 : total <= 9 ? 1.25 : total <= 12 ? 1.5 : total <= 14 ? 2 : total <= 16 ? 3 : 5; }
export function validSavedDice(luck) {
 if (!Array.isArray(luck.dice) || luck.dice.length !== 3 || luck.dice.some(face => !Number.isInteger(face) || face < 1 || face > 6)) return false;
 if (['high-low-v2','enchanted-v3','choice-v4'].includes(luck.model)) { const expected = diceOutcome(luck.dice, luck.choice); return typeof luck.revealed === 'boolean' && ['low','middle','high'].includes(luck.choice) && ['total','triple','side','won','multiplier'].every(key => luck[key] === expected[key]); }
 if (luck.model === 'tai-xiu-v1') { const total=luck.dice.reduce((n,f)=>n+f,0), triple=luck.dice.every(f=>f===luck.dice[0]), side=triple?'triple':total>=11?'tai':'xiu'; return ['tai','xiu'].includes(luck.choice) && luck.total===total && luck.triple===triple && luck.side===side && luck.won===(side===luck.choice) && luck.multiplier===(side===luck.choice?2:1); }
 return luck.total === luck.dice.reduce((n,f)=>n+f,0) && luck.multiplier === luckForTotal(luck.total);
}
export function charmPool(day = 1, luck = 1) {
 const weights = { goldCharm: 4, debtCharm: 2, forageCharm: 40, insightCharm: 28, wardCharm: 12, speedCharm: 10, bombCharm: 5, blinkCharm: 4, moonCharm: .8, yieldCharm: .2 / (1 + Math.floor(Math.max(0, day - 1) / 5) * .25) };
 const rows = Object.entries(weights).map(([id, weight]) => ({ id, weight: weight * Math.pow(luck, charmGrade(id) * .5) }));
 const total = rows.reduce((sum, row) => sum + row.weight, 0);
 return rows.map(row => ({ id: row.id, probability: row.weight / total }));
}
export function drawRandomCharm(day, luck, roll) {
 const pool = charmPool(day, luck); let edge = 0;
 return (pool.find(row => roll < (edge += row.probability)) || pool.at(-1)).id;
}
export function offeringChance(coins, luck, id) {
 const resistance = { goldCharm: 12, debtCharm: 3, forageCharm: 3, insightCharm: 4, wardCharm: 8, speedCharm: 8, bombCharm: 12, blinkCharm: 14, moonCharm: 35, yieldCharm: 60 }[id];
 return Math.min(.98, coins * luck / (coins * luck + resistance));
}
export function offeringOdds(day, coins, luck) {
 return charmPool(day, luck).map(row => ({ ...row, chance: offeringChance(coins, luck, row.id), awarded: row.probability * offeringChance(coins, luck, row.id) }));
}
export function canUseCharm(state, id) {
  if (!['day', 'night', 'combat'].includes(state.phase) || !(state.inventory[id] > 0)) return false;
  if (id === 'forageCharm') return state.phase !== 'combat' && state.inventory.hay < 12;
  if (id === 'insightCharm') return state.phase === 'night' && state.player.energy < 2;
  if (id === 'wardCharm') return !state.player.wardCharges;
  if (id === 'moonCharm') return !(state.player.charmDamageBuff > 1) && state.player.damageBuff === 1;
  if (id === 'speedCharm') return !(state.player.speedBuff > 1);
  if (id === 'yieldCharm') return state.phase !== 'combat' && !(state.farm.incomeMultiplier > 1);
  return false;
}
