export const WOLVES = {
  normal: { id: 'normal', name: 'Sói thường', minNight: 1, hp: 36, speed: 1, damage: 8, disguise: 'adult', tell: 'paws', tells: ['paws'], dogDetect: true, eatRate: 1, evasion: 0, patternPool: ['normalRain', 'normalSpiral', 'normalWave'], clue: 'Chân to, móng vuốt thò ra dưới lớp lông.', mechanic: 'Ăn 1 cừu mỗi đêm. Chó nhận ra mùi.' },
  rabid: { id: 'rabid', name: 'Sói dại', minNight: 1, hp: 30, speed: 1.35, damage: 6, disguise: 'adult', tell: 'eyes', tells: ['eyes', 'teeth'], dogDetect: true, eatRate: 1, evasion: 0, statusEffect: 'bleed', patternPool: ['rabidChaos', 'rabidBurst', 'rabidZigzag'], clue: 'Mắt đỏ, nước dãi chảy ở miệng.', mechanic: 'Đạn gây chảy máu 3 lượt nếu xuyên qua giáp.' },
  pup: { id: 'pup', name: 'Sói con', minNight: 4, hp: 22, speed: 1.65, damage: 4, disguise: 'baby', tell: 'teeth', tells: ['teeth'], dogDetect: false, eatRate: 0.5, evasion: 0, patternPool: ['pupDash', 'pupScatter', 'pupRapid'], clue: 'Nhỏ như cừu con nhưng có răng nanh.', mechanic: 'Chó không sủa. Đánh nhanh, sát thương thấp.' },
  lean: { id: 'lean', name: 'Sói gầy', minNight: 4, hp: 38, speed: 1.1, damage: 9, disguise: 'sheared', tell: 'body', tells: ['body'], dogDetect: true, eatRate: 0.5, evasion: 0.3, patternPool: ['leanSlice', 'leanFade', 'leanTrap'], clue: 'Giống cừu cạo lông, lộ xương sườn và dáng gầy.', mechanic: 'Hai ngày ăn một cừu; 30% né đòn người chơi.' },
  alpha: { id: 'alpha', name: 'Sói Alpha', minNight: 8, hp: 88, speed: 0.75, damage: 12, disguise: 'adult', tell: 'body', tells: ['body'], dogDetect: true, eatRate: 2, evasion: 0, patternPool: ['alphaWalls', 'alphaRings', 'alphaMarch'], clue: 'Bụng lớn bất thường dưới bộ lông.', mechanic: 'Một đêm ăn 2 cừu. Máu nhiều, đạn chậm.' },
  white: { id: 'white', name: 'Sói trắng', minNight: 8, hp: 48, speed: 1.1, damage: 8, disguise: 'adult', tell: null, tells: [], dogDetect: true, eatRate: 1, evasion: 0, specialMechanic: 'whiteout', patternPool: ['whitePulse', 'whiteCross', 'whiteVeil'], clue: 'Ngụy trang hoàn hảo; phải cạo lông để xác định.', mechanic: 'Sương trắng che từ giữa màn hình ra ngoài khi né đạn.' },
};
export const ITEMS = {
  hay: { id: 'hay', name: 'Cỏ khô', price: 1, shop: 'basic', description: 'Một bó cho đàn ăn trong một ngày mưa.' },
  battery: { id: 'battery', name: 'Pin tông đơ', price: 2, shop: 'basic', description: 'Một lần cạo lông; dùng thêm 1 năng lượng.' },
  sunDoll: { id: 'sunDoll', name: 'Búp bê cầu nắng', price: 3, shop: 'basic', description: 'Dùng để bảo đảm sáng mai trời nắng.' },
  fence: { id: 'fence', name: 'Hàng rào chia chuồng', price: 5, shop: 'basic', description: 'Chia A/B; kiểm tra theo chuồng bằng chó.' },
  roof: { id: 'roof', name: 'Mái che', price: 8, shop: 'basic', description: 'Che mưa cho đàn, không cần cỏ khô.' },
  sheep: { id: 'sheep', name: 'Cừu lớn', price: 10, shop: 'basic', description: 'Tạo 1 xu/ngày. Tối đa 16 cừu.' },
  lamb: { id: 'lamb', name: 'Cừu con', price: 6, shop: 'basic', description: 'Lớn sau 2 ngày, lúc nhỏ chưa có thu nhập.' },
  ammo: { id: 'ammo', name: 'Đạn súng', price: 3, shop: 'merchant', description: 'Một viên cho một phát bắn.' },
  armorLight: { id: 'armorLight', name: 'Giáp nhẹ', price: 8, shop: 'merchant', durability: 20, description: '20 độ bền; hấp thụ sát thương trước HP.' },
  armorHeavy: { id: 'armorHeavy', name: 'Giáp nặng', price: 15, shop: 'merchant', durability: 40, description: '40 độ bền; mua là trang bị ngay.' },
  repairKit: { id: 'repairKit', name: 'Bộ sửa giáp', price: 4, shop: 'merchant', description: 'Dùng để phục hồi 15 độ bền.' },
  beer: { id: 'beer', name: 'Bia thợ săn', price: 3, shop: 'merchant', description: 'Hồi 2 năng lượng, dùng ngoài chiến đấu.' },
  strengthPotion: { id: 'strengthPotion', name: 'Thuốc tăng lực', price: 6, shop: 'merchant', description: '+50% sát thương đến hết trận tiếp theo.' },
  medicine: { id: 'medicine', name: 'Thuốc hồi sức', price: 5, shop: 'merchant', description: 'Hồi 25 HP; dùng được trong combat.' },
};

export function spawnWeights(day) {
  const weights = day < 4 ? { normal: 65, rabid: 35 } : day < 8 ? { normal: 30, rabid: 25, pup: 25, lean: 20 } : { normal: 20, rabid: 20, pup: 15, lean: 15, alpha: 18, white: 12 };
  return Object.entries(weights).map(([type, weight]) => ({ type, weight }));
}
export function evolveWolf(type, day) {
  const definition = WOLVES[type], tier = Math.floor(Math.max(0, day - 1) / 3);
  return { ...definition, speciesName: definition.name, type, evolution: tier, hp: definition.hp + tier * (type === 'alpha' ? 8 : 4), speed: +(definition.speed * (1 + tier * 0.1)).toFixed(3), tells: day % 7 === 0 ? [] : [...definition.tells], tell: day % 7 === 0 ? null : definition.tell, hidden: day % 7 === 0 };
}
export function spawnWolves(day, sheepCount, divided = false, random = Math.random) {
  if (sheepCount <= 0) return [];
  const count = Math.min(1 + Math.floor(Math.max(0, day - 4) / 4), Math.max(1, Math.ceil(sheepCount * 0.3)));
  const weights = spawnWeights(day), total = weights.reduce((sum, a) => sum + a.weight, 0);
  return Array.from({ length: count }, (_, index) => {
    let roll = random() * total, type = weights[weights.length - 1].type;
    for (const candidate of weights) { roll -= candidate.weight; if (roll < 0) { type = candidate.type; break; } }
    return { ...evolveWolf(type, day), id: `wolf-${day}-${index}`, wolf: true, penId: divided ? Math.floor(random() * 2) : 0, invadedDay: day, eatenProgress: 0, checked: [], defeated: false };
  });
}
export function absorbDamage(player, amount) {
  const damage = Math.max(0, Number(amount) || 0), absorbed = Math.min(player.armor?.durability || 0, damage);
  return { player: { ...player, hp: Math.max(0, player.hp - (damage - absorbed)), armor: player.armor ? { ...player.armor, durability: player.armor.durability - absorbed } : null }, absorbed, hpDamage: damage - absorbed };
}
export function calculateStrike(position, player, wolf, dogUsed = false, random = Math.random) {
  if (player.weapon === 'gun' && player.ammo <= 0) return { damage: 0, label: 'Hết đạn', fired: false };
  const fired = player.weapon === 'gun';
  if (random() < wolf.evasion) return { damage: 0, label: 'Sói né được đòn!', fired };
  const distance = Math.abs(position - 0.5), critical = distance <= (fired ? 0.18 : 0.06), good = distance <= (fired ? 0.35 : 0.22);
  const damage = Math.round((fired ? 32 : 15) * (critical ? 2 : good ? 1 : 0.4) * (dogUsed ? 1.2 : 1) * (player.damageBuff || 1));
  return { damage, label: critical ? 'Critical!' : good ? 'Đánh trúng!' : 'Đòn sượt', fired };
}
