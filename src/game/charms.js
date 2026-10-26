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
  hungerCurse: { name: 'Lời Nguyền Đói', glyph: 'curse', color: '#ad8f9f', description: 'Lá bùa đen tự kích hoạt: sáng mai cả đàn mất thêm 10 độ no.' },
};
export const CHARM_ITEMS = Object.fromEntries(Object.entries(CHARMS).filter(([id]) => id !== 'hungerCurse').map(([id, charm]) => [id, { ...charm, id, price: 0, shop: 'charm' }]));
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
