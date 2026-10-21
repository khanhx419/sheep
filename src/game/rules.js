import { ITEMS, WOLVES, spawnWolves, evolveWolf, absorbDamage, calculateStrike } from './catalog.js';
export const SAVE_KEY = 'under-the-wool-v3';
export const SHEEP_NAMES = ['Bông', 'Mây', 'Sữa', 'Bắp', 'Mochi', 'Mè', 'Kem', 'Đậu'];
export const TELLS = ['eyes', 'paws', 'teeth', 'body', 'tail'];
export const TARGET_GOLD = 200;

function sheepEntity(id, age, day, penId = 0) { return { id, age, bornDay: day, penId, isSheared: false }; }
function projection(state) {
  return { ...state, hp: state.player.hp, sheep: state.flock.length, fence: Number(state.farm.divided), combatHp: state.combat?.wolfHp ?? null,
    combatDog: state.combat?.dogUsed || false, energy: state.player.energy, fullMoon: state.day % 7 === 0, deityStage: Math.min(1, Math.max(0, (state.day - 1) / 14)) };
}
export function newGame() {
  return projection({ version: 3, phase: 'day', day: 1, gold: 25, targetGold: TARGET_GOLD, nextId: 9,
    player: { id: 'player', hp: 100, maxHp: 100, energy: 2, maxEnergy: 2, weapon: 'tool', ammo: 0, armor: null, damageBuff: 1 },
    flock: Array.from({ length: 8 }, (_, i) => sheepEntity(`sheep-${i + 1}`, i < 6 ? 'adult' : 'baby', 1)),
    wolves: [], residents: [], activeId: null, combat: null, defeated: 0,
    farm: { divided: false, roof: false, fed: true, weather: 'sunny', nextSunny: false },
    inventory: { hay: 0, battery: 2, sunDoll: 0, repairKit: 0, beer: 0, strengthPotion: 0, medicine: 0 },
    merchant: { present: true }, dog: { exhaustedThroughNight: 0, lastScan: null },
    report: 'Bạn mua Trại Sương để kiếm 200 xu cưới vợ. Chủ cũ để lại cuốn sổ về bầy sói được một vị thần trong rừng ban nhận thức.', log: [] });
}
export function makeResidents(day, sheep, random = Math.random, options = {}) {
  const flock = Array.isArray(sheep) ? sheep : Array.from({ length: sheep }, (_, i) => sheepEntity(`s-${day}-${i}`, 'adult', day));
  const survivors = (options.wolves || []).map(w => ({ ...w, ...evolveWolf(w.type, day), id: w.id, wolf: true, penId: w.penId, eatenProgress: w.eatenProgress || 0, checked: [], defeated: false }));
  const wolves = [...survivors, ...spawnWolves(day, flock.length, !!options.divided, random)];
  const animals = [...flock.map(s => ({ ...s, wolf: false, checked: [] })), ...wolves.map(w => ({ ...w, age: w.disguise === 'baby' ? 'baby' : 'adult', isSheared: w.disguise === 'sheared' }))];
  for (let i = animals.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [animals[i], animals[j]] = [animals[j], animals[i]]; }
  return animals.map((a, i) => ({ ...a, name: `Cừu ${String(i + 1).padStart(2, '0')}` }));
}
export function dogAvailable(state) { return state.day > state.dog.exhaustedThroughNight; }
export function overrun(sheepCount, wolfCount) { return sheepCount === 0 || wolfCount > sheepCount * 0.5; }

export function advanceDawn(state, random = Math.random) {
  const surviving = state.residents.filter(a => a.wolf && !a.defeated);
  let flock = [...state.flock], eaten = 0;
  const wolves = surviving.map(w => {
    const total = (w.eatenProgress || 0) + w.eatRate, kills = Math.floor(total);
    let available = kills;
    while (available-- > 0) {
      const index = flock.findIndex(s => !state.farm.divided || s.penId === w.penId);
      if (index >= 0) { flock.splice(index, 1); eaten++; }
    }
    return { ...w, eatenProgress: total - kills, checked: [], defeated: false };
  });
  const income = state.farm.fed ? flock.filter(s => s.age === 'adult').length : 0;
  const day = state.day + 1;
  flock = flock.map(s => ({ ...s, age: s.age === 'baby' && day - s.bornDay >= 2 ? 'adult' : s.age, isSheared: false }));
  const weather = state.farm.nextSunny || random() >= 0.25 ? 'sunny' : 'rainy';
  const report = `${eaten ? `Sói ăn mất ${eaten} cừu.` : 'Đàn cừu qua đêm an toàn.'} Thu ${income} xu (${state.farm.fed ? '1 xu/cừu lớn' : 'đàn đói trong ngày mưa'}). ${day % 7 === 0 ? 'Đêm tới trăng tròn: chỉ còn tiếng hú, phải cạo lông.' : ''}`;
  const lost = overrun(flock.length, wolves.length);
  return projection({ ...state, day, phase: lost ? 'lose' : 'day', gold: state.gold + income, flock, wolves, residents: [], activeId: null, combat: null,
    farm: { ...state.farm, weather, fed: weather === 'sunny' || state.farm.roof, nextSunny: false }, merchant: { present: random() < 0.35 },
    player: { ...state.player, energy: 2 }, report: lost ? `Sói còn lại (${wolves.length}) vượt quá 50% đàn cừu (${flock.length}). Trang trại bị chiếm.` : report,
    log: [...state.log, `Đêm ${state.day}: ${report}`].slice(-30) });
}

function reduce(state, action) {
  switch (action.type) {
    case 'NEW': return newGame();
    case 'BUY': {
      const item = ITEMS[action.item];
      if (state.phase !== 'day' || !item || state.gold < item.price || (item.shop === 'merchant' && !state.merchant.present)) return state;
      if ((item.id === 'fence' && state.farm.divided) || (item.id === 'roof' && state.farm.roof) || (['sheep', 'lamb'].includes(item.id) && state.flock.length >= 16)) return state;
      let next = { ...state, gold: state.gold - item.price, report: `Đã mua ${item.name}. ${item.description}` };
      if (item.id === 'fence') {
        next.farm = { ...state.farm, divided: true };
        next.flock = state.flock.map((s, i) => ({ ...s, penId: i % 2 }));
      } else if (item.id === 'roof') next.farm = { ...state.farm, roof: true, fed: true };
      else if (['sheep', 'lamb'].includes(item.id)) { next.flock = [...state.flock, sheepEntity(`sheep-${state.nextId}`, item.id === 'lamb' ? 'baby' : 'adult', state.day, state.farm.divided ? state.flock.length % 2 : 0)]; next.nextId++; }
      else if (item.id === 'ammo') next.player = { ...state.player, ammo: state.player.ammo + 1 };
      else if (item.durability) next.player = { ...state.player, armor: { itemId: item.id, durability: item.durability, maxDurability: item.durability } };
      else next.inventory = { ...state.inventory, [item.id]: (state.inventory[item.id] || 0) + 1 };
      return next;
    }
    case 'FEED':
      if (state.phase !== 'day' || state.farm.fed || state.inventory.hay < 1) return state;
      return { ...state, inventory: { ...state.inventory, hay: state.inventory.hay - 1 }, farm: { ...state.farm, fed: true }, report: 'Đã cho cả đàn ăn cỏ khô. Cừu lớn sẽ tạo 1 xu/con sáng mai.' };
    case 'USE': {
      const id = action.item;
      if (!['day', 'night', 'combat'].includes(state.phase) || !state.inventory[id]) return state;
      let next = { ...state, player: { ...state.player }, report: `Đã dùng ${ITEMS[id]?.name || id}.` };
      if (id === 'beer' && state.phase !== 'combat' && state.player.energy < 2) next.player.energy = Math.min(2, state.player.energy + 2);
      else if (id === 'medicine' && state.player.hp < 100) next.player.hp = Math.min(100, state.player.hp + 25);
      else if (id === 'strengthPotion' && state.player.damageBuff === 1) next.player.damageBuff = 1.5;
      else if (id === 'repairKit' && state.player.armor && state.player.armor.durability < state.player.armor.maxDurability) next.player.armor = { ...state.player.armor, durability: Math.min(state.player.armor.maxDurability, state.player.armor.durability + 15) };
      else if (id === 'sunDoll' && state.phase === 'day' && !state.farm.nextSunny) next.farm = { ...state.farm, nextSunny: true };
      else return state;
      return { ...next, inventory: { ...state.inventory, [id]: state.inventory[id] - 1 } };
    }
    case 'NIGHT': {
      if (state.phase !== 'day') return state;
      const residents = action.residents || makeResidents(state.day, state.flock, Math.random, { wolves: state.wolves, divided: state.farm.divided });
      const wolves = residents.filter(a => a.wolf);
      const lose = overrun(state.flock.length, wolves.length);
      return { ...state, phase: lose ? 'lose' : 'night', residents, wolves, player: { ...state.player, energy: 2 }, dog: { ...state.dog, lastScan: null },
        report: lose ? `Số sói (${wolves.length}) đã vượt quá 50% đàn cừu (${state.flock.length}).` : state.day % 7 === 0 ? 'Trăng tròn. Không còn dấu hiệu trên cơ thể; tiếng hú vọng từ chuồng. Dùng pin tông đơ để cạo lông.' : 'Đi đến gần cừu và nhấn E. Mỗi đêm có 2 năng lượng. Móng chân, mắt, miệng và thân có thể lộ dấu hiệu.' };
    }
    case 'DOG_SCAN': {
      if (state.phase !== 'night') return state;
      if (!dogAvailable(state)) return { ...state, report: 'Chó đang kiệt sức sau trận chiến, đêm nay không giúp tìm sói.' };
      const danger = state.residents.some(a => a.wolf && !a.defeated && a.dogDetect && a.penId === action.penId);
      return { ...state, dog: { ...state.dog, lastScan: { day: state.day, penId: action.penId, danger } }, report: danger ? `GÂU! Chó báo có mùi sói trong chuồng ${action.penId === 0 ? 'A' : 'B'}.` : 'Chó im lặng. Cẩn thận: chó không phát hiện được sói con.' };
    }
    case 'CHECK': {
      if (state.phase !== 'night' || state.player.energy < 1 || ![...TELLS, 'wool'].includes(action.part)) return state;
      const animal = state.residents.find(a => a.id === action.id && !a.defeated);
      if (!animal || animal.checked.includes(action.part)) return state;
      const shear = action.part === 'wool';
      if (shear && !state.inventory.battery) return { ...state, report: 'Hết pin tông đơ. Mua pin ban ngày: 2 xu cho một lần cạo.' };
      const found = animal.wolf && (shear || animal.tells.includes(action.part));
      const inventory = shear ? { ...state.inventory, battery: state.inventory.battery - 1 } : state.inventory;
      const flock = shear ? state.flock.map(s => s.id === animal.id ? { ...s, isSheared: true } : s) : state.flock;
      return { ...state, inventory, flock, player: { ...state.player, energy: state.player.energy - 1 }, activeId: found ? animal.id : null, phase: found ? 'reveal' : 'night',
        combat: found ? { wolfHp: animal.hp, wolfMaxHp: animal.hp, dogUsed: false, shieldAvailable: false, bleedTurns: 0 } : null,
        report: found ? `${animal.name} xé lớp lông và hú lên!` : shear ? 'Dưới lớp lông là một con cừu thật.' : 'Bộ phận này chưa có dấu hiệu lạ. Hãy quan sát những chỗ khác.',
        residents: state.residents.map(a => a.id === animal.id ? { ...a, isSheared: shear || a.isSheared, checked: [...a.checked, action.part] } : a) };
    }
    case 'COMBAT': return state.phase === 'reveal' ? { ...state, phase: 'combat' } : state;
    case 'SWITCH_WEAPON': return ['day', 'combat'].includes(state.phase) ? { ...state, player: { ...state.player, weapon: state.player.weapon === 'tool' ? 'gun' : 'tool' } } : state;
    case 'STRIKE': {
      if (state.phase !== 'combat' || state.combat.wolfHp <= 0) return state;
      const wolf = state.residents.find(a => a.id === state.activeId);
      const result = calculateStrike(action.position, state.player, wolf, state.combat.dogUsed, action.roll == null ? action.random || Math.random : () => action.roll);
      return { ...state, player: { ...state.player, ammo: state.player.ammo - Number(result.fired) }, combat: { ...state.combat, wolfHp: Math.max(0, state.combat.wolfHp - result.damage), lastStrike: result } };
    }
    case 'DOG':
      return state.phase === 'combat' && dogAvailable(state) && !state.combat.dogUsed ? { ...state, combat: { ...state.combat, dogUsed: true, shieldAvailable: true }, dog: { ...state.dog, exhaustedThroughNight: state.day + 1 } } : state;
    case 'DAMAGE': {
      if (state.phase !== 'combat') return state;
      if (state.combat.shieldAvailable) return { ...state, combat: { ...state.combat, shieldAvailable: false }, report: 'Chó đỡ đòn thay bạn!' };
      const result = absorbDamage(state.player, action.amount);
      return { ...state, player: result.player, phase: result.player.hp <= 0 ? 'lose' : state.phase, combat: { ...state.combat, bleedTurns: action.bleed && result.hpDamage > 0 ? 3 : state.combat.bleedTurns }, report: result.player.hp <= 0 ? 'Bạn đã gục xuống khi bảo vệ đàn cừu.' : `Giáp chặn ${result.absorbed} sát thương, mất ${result.hpDamage} HP.` };
    }
    case 'END_DODGE': {
      if (state.phase !== 'combat' || !state.combat.bleedTurns) return state;
      const hp = Math.max(0, state.player.hp - 2);
      return { ...state, phase: hp <= 0 ? 'lose' : state.phase, player: { ...state.player, hp }, combat: { ...state.combat, bleedTurns: state.combat.bleedTurns - 1 }, report: hp <= 0 ? 'Bạn đã gục vì chảy máu.' : 'Chảy máu: mất 2 HP.' };
    }
    case 'WON_FIGHT': {
      if (state.phase !== 'combat' || state.combat.wolfHp > 0) return state;
      return { ...state, phase: 'night', defeated: state.defeated + 1, activeId: null, combat: null, player: { ...state.player, damageBuff: 1 },
        wolves: state.wolves.filter(w => w.id !== state.activeId), residents: state.residents.map(a => a.id === state.activeId ? { ...a, defeated: true } : a), report: 'Đã đuổi sói khỏi chuồng. Đàn cừu an toàn hơn. Tiền chỉ được tạo bởi cừu lớn mỗi ngày.' };
    }
    case 'DAWN': return state.phase === 'night' ? advanceDawn(state, action.random || Math.random) : state;
    case 'SELL': return state.phase === 'day' && state.gold >= state.targetGold ? { ...state, phase: 'win', report: 'Bạn bán lại trang trại, mang tiền trở về cưới người mình yêu. Ngoài rừng, sương mù vẫn chưa tan.' } : state;
    default: return state;
  }
}
export function gameReducer(state, action) { return projection(reduce(state, action)); }

export function migrateSave(saved) {
  if (saved?.version === 3) return saved;
  if (saved?.version !== 2 || !Number.isFinite(saved.gold) || !Number.isInteger(saved.sheep) || saved.sheep < 0 || saved.sheep > 16 || !Number.isFinite(saved.hp)) return null;
  const base = newGame();
  return projection({ ...base, day: Math.max(1, saved.day || 1), gold: saved.gold, player: { ...base.player, hp: Math.max(0, Math.min(100, saved.hp)) },
    flock: Array.from({ length: saved.sheep }, (_, i) => sheepEntity(`sheep-${i + 1}`, 'adult', 1)), nextId: saved.sheep + 1, defeated: saved.defeated || 0, phase: saved.hp <= 0 ? 'lose' : 'day',
    log: saved.log || [], report: 'Đã chuyển bản lưu sang Core GDD. Tiền và đàn cừu được giữ; bắt đầu lại buổi sáng để áp dụng kinh tế, sói và trang bị mới.' });
}
export function readSave(storage = localStorage) {
  try {
    const raw = storage.getItem(SAVE_KEY) || storage.getItem('under-the-wool-v2');
    const s = migrateSave(JSON.parse(raw));
    if (!s || !['day', 'night', 'reveal', 'combat', 'win', 'lose'].includes(s.phase) || !Number.isInteger(s.day) || s.day < 1 || !Number.isFinite(s.gold) || s.gold < 0 || !s.player || !Number.isFinite(s.player.hp) || s.player.hp < 0 || s.player.hp > 100 || !Number.isInteger(s.player.energy) || s.player.energy < 0 || s.player.energy > 2 || !Array.isArray(s.flock) || s.flock.length > 16 || !Array.isArray(s.wolves) || !Array.isArray(s.residents) || !Array.isArray(s.log) || !s.inventory || !s.farm || !s.dog) return null;
    if (s.flock.some(a => !a || typeof a.id !== 'string' || !['adult', 'baby'].includes(a.age) || ![0, 1].includes(a.penId)) || s.wolves.some(w => !WOLVES[w.type] || ![0, 1].includes(w.penId))) return null;
    if (!Number.isInteger(s.player.ammo) || s.player.ammo < 0 || !['gun', 'tool'].includes(s.player.weapon) || !Number.isFinite(s.targetGold) || s.targetGold <= 0 || !Number.isInteger(s.dog.exhaustedThroughNight) || !['sunny', 'rainy'].includes(s.farm.weather)) return null;
    if (Object.entries(s.inventory).some(([id, count]) => !ITEMS[id] || !Number.isInteger(count) || count < 0)) return null;
    if (s.player.armor && (!Number.isFinite(s.player.armor.maxDurability) || s.player.armor.maxDurability <= 0 || !Number.isFinite(s.player.armor.durability) || s.player.armor.durability < 0 || s.player.armor.durability > s.player.armor.maxDurability)) return null;
    if (s.residents.some(a => !a || typeof a.id !== 'string' || !Array.isArray(a.checked) || (a.wolf && (!WOLVES[a.type] || !Array.isArray(a.tells))))) return null;
    if (['combat', 'reveal'].includes(s.phase) && (!s.combat || !Number.isFinite(s.combat.wolfHp) || !s.residents.some(a => a.id === s.activeId && a.wolf && !a.defeated))) return null;
    return projection(s);
  } catch { return null; }
}
