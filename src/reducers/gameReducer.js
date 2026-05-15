/* ============================================================
 * gameReducer.js — Central State Management
 * Sheep Farm Defense
 *
 * Tất cả state transitions đều đi qua reducer này.
 * React components dispatch actions, reducer trả về state mới.
 * ============================================================ */

import {
  TARGET_GOLD, STARTING_GOLD, PLAYER_MAX_HP,
  PLAYER_ENERGY_PER_NIGHT, STARTING_SHEEP_COUNT,
  SAVE_KEY, SAVE_VERSION,
} from '../data/constants.js';

// --- Helpers ---
let _nextId = 1;
function nextId() { return _nextId++; }

function createSheep(age = 'adult', penId = 0) {
  return { id: nextId(), age, penId, daysAsAdult: age === 'adult' ? 1 : 0, isSheared: false };
}

// --- Initial State ---
export function createInitialState() {
  _nextId = 1;
  const sheep = [];
  for (let i = 0; i < STARTING_SHEEP_COUNT; i++) {
    sheep.push(createSheep('adult', 0));
  }

  return {
    version: SAVE_VERSION,
    phase: 'MENU',
    // Phases: MENU | FARM_DAY | SHOP | NIGHT_INVESTIGATE | COMBAT | WIN | LOSE

    day: 1,
    gold: STARTING_GOLD,
    targetGold: TARGET_GOLD,

    player: {
      hp: PLAYER_MAX_HP,
      maxHp: PLAYER_MAX_HP,
      energy: PLAYER_ENERGY_PER_NIGHT,
      weapon: 'tool',  // 'tool' | 'gun'
      ammo: 0,
      armor: null,      // { itemId, durability, maxDurability } hoặc null
      buffs: [],        // [{ type, multiplier, turnsLeft }]
    },

    sheep,
    // Sói đã ngụy trang vào chuồng (chưa bị phát hiện)
    infiltratedWolves: [],
    // Sói đang trong combat hiện tại
    activeCombatWolf: null,

    pens: [
      { id: 0, name: 'Chuồng A', fenced: true, roofed: false },
      { id: 1, name: 'Chuồng B', fenced: false, roofed: false },
    ],

    dog: {
      available: true,
      exhaustedUntilDay: 0,  // Ngày mà chó hết kiệt sức
    },

    inventory: [],  // [{ itemId, quantity }]

    weather: 'sunny',  // 'sunny' | 'rainy'
    nextWeatherOverride: null, // Dùng cho Búp bê cầu nắng

    merchant: {
      present: false,
      stock: [],
    },

    notebookUnlocked: ['normal', 'rabid'], // Wolf IDs đã mở trong sổ tay
    isFullMoon: false,

    // Kết quả điều tra đêm nay
    nightResults: {
      investigated: [],  // penIds đã kiểm tra
      foundWolves: [],   // Sói phát hiện
    },

    // Combat kết quả (để hiển thị sau combat)
    lastCombatResult: null, // { won, wolfType, damageDealt, damageTaken }

    // Message log
    messages: [],
  };
}

// --- Reducer ---
export function gameReducer(state, action) {
  switch (action.type) {

    // ========== PHASE TRANSITIONS ==========
    case 'START_GAME':
      return { ...createInitialState(), phase: 'FARM_DAY' };

    case 'LOAD_GAME':
      return { ...action.payload, phase: 'FARM_DAY' };

    case 'SET_PHASE':
      return { ...state, phase: action.payload };

    // ========== FARM DAY ==========
    case 'OPEN_SHOP':
      return { ...state, phase: 'SHOP' };

    case 'CLOSE_SHOP':
      return { ...state, phase: 'FARM_DAY' };

    case 'BUY_ITEM': {
      const { itemId, price } = action.payload;
      if (state.gold < price) return state;
      const inv = [...state.inventory];
      const existing = inv.find(i => i.itemId === itemId);
      if (existing) {
        existing.quantity += 1;
      } else {
        inv.push({ itemId, quantity: 1 });
      }
      return { ...state, gold: state.gold - price, inventory: inv };
    }

    case 'USE_ITEM': {
      const { itemId } = action.payload;
      const inv = state.inventory
        .map(i => i.itemId === itemId ? { ...i, quantity: i.quantity - 1 } : i)
        .filter(i => i.quantity > 0);
      return { ...state, inventory: inv };
    }

    case 'EQUIP_ARMOR': {
      const { itemId, maxDurability } = action.payload;
      return {
        ...state,
        player: {
          ...state.player,
          armor: { itemId, durability: maxDurability, maxDurability },
        },
      };
    }

    case 'REPAIR_ARMOR': {
      if (!state.player.armor) return state;
      const repairAmount = action.payload.amount;
      const armor = { ...state.player.armor };
      armor.durability = Math.min(armor.durability + repairAmount, armor.maxDurability);
      return { ...state, player: { ...state.player, armor } };
    }

    case 'SELL_FARM': {
      if (state.gold >= state.targetGold) {
        return { ...state, phase: 'WIN' };
      }
      return state;
    }

    // ========== NIGHT INVESTIGATION ==========
    case 'START_NIGHT': {
      return {
        ...state,
        phase: 'NIGHT_INVESTIGATE',
        player: { ...state.player, energy: PLAYER_ENERGY_PER_NIGHT },
        nightResults: { investigated: [], foundWolves: [] },
      };
    }

    case 'INVESTIGATE_PEN': {
      if (state.player.energy <= 0) return state;
      const { penId, method } = action.payload; // method: 'check_paws' | 'check_teeth' | 'shear'
      return {
        ...state,
        player: { ...state.player, energy: state.player.energy - 1 },
        nightResults: {
          ...state.nightResults,
          investigated: [...state.nightResults.investigated, { penId, method }],
        },
      };
    }

    case 'WOLF_FOUND': {
      const { wolf, sheepId } = action.payload;
      // Loại sói khỏi infiltrated, remove fake sheep
      const infiltratedWolves = state.infiltratedWolves.filter(w => w.id !== wolf.id);
      const sheep = state.sheep.filter(s => s.id !== sheepId);
      return {
        ...state,
        infiltratedWolves,
        sheep,
        activeCombatWolf: wolf,
        nightResults: {
          ...state.nightResults,
          foundWolves: [...state.nightResults.foundWolves, wolf],
        },
      };
    }

    case 'START_COMBAT':
      return { ...state, phase: 'COMBAT' };

    // ========== COMBAT ==========
    case 'COMBAT_DAMAGE_PLAYER': {
      const rawDmg = action.payload.damage;
      let remaining = rawDmg;
      let armor = state.player.armor ? { ...state.player.armor } : null;

      // Giáp hấp thụ trước
      if (armor && armor.durability > 0) {
        const absorbed = Math.min(remaining, armor.durability);
        armor.durability -= absorbed;
        remaining -= absorbed;
        if (armor.durability <= 0) armor = null; // Giáp vỡ
      }

      const newHp = Math.max(0, state.player.hp - remaining);
      return {
        ...state,
        player: { ...state.player, hp: newHp, armor },
      };
    }

    case 'COMBAT_DAMAGE_WOLF': {
      if (!state.activeCombatWolf) return state;
      const dmg = action.payload.damage;
      const wolf = {
        ...state.activeCombatWolf,
        hp: Math.max(0, state.activeCombatWolf.hp - dmg),
      };
      return { ...state, activeCombatWolf: wolf };
    }

    case 'COMBAT_USE_AMMO':
      return {
        ...state,
        player: { ...state.player, ammo: Math.max(0, state.player.ammo - 1) },
      };

    case 'CALL_DOG':
      return {
        ...state,
        dog: { ...state.dog, available: false, exhaustedUntilDay: state.day + 2 },
      };

    case 'END_COMBAT': {
      const { won, wolfType } = action.payload;
      // Mở notebook entry nếu chưa có
      const notebookUnlocked = state.notebookUnlocked.includes(wolfType)
        ? state.notebookUnlocked
        : [...state.notebookUnlocked, wolfType];

      return {
        ...state,
        phase: 'NIGHT_INVESTIGATE',
        activeCombatWolf: null,
        lastCombatResult: action.payload,
        notebookUnlocked,
      };
    }

    // ========== ADVANCE DAY ==========
    case 'ADVANCE_DAY': {
      const { newDay, income, sheepEaten, newSheep, weather,
              merchantPresent, merchantStock, isFullMoon, wolvesToSpawn,
              messages } = action.payload;

      // Cập nhật sheep: loại bị ăn, thêm con mới, tăng tuổi
      let updatedSheep = state.sheep
        .filter(s => !sheepEaten.includes(s.id))
        .map(s => {
          if (s.age === 'baby') {
            const newDays = (s.daysAsAdult || 0) + 1;
            if (newDays >= 2) return { ...s, age: 'adult', daysAsAdult: 0 };
            return { ...s, daysAsAdult: newDays };
          }
          return { ...s, isSheared: false }; // Reset sheared mỗi ngày
        });

      // Thêm cừu mới sinh (nếu có)
      newSheep.forEach(ns => updatedSheep.push(createSheep(ns.age, ns.penId)));

      // Dog recovery
      const dogAvailable = newDay >= state.dog.exhaustedUntilDay;

      return {
        ...state,
        day: newDay,
        gold: state.gold + income,
        sheep: updatedSheep,
        infiltratedWolves: [...state.infiltratedWolves, ...wolvesToSpawn],
        weather: state.nextWeatherOverride || weather,
        nextWeatherOverride: null,
        isFullMoon,
        merchant: {
          present: merchantPresent,
          stock: merchantStock,
        },
        dog: { ...state.dog, available: dogAvailable },
        phase: 'FARM_DAY',
        player: { ...state.player, hp: state.player.hp }, // HP không tự hồi
        messages: [...state.messages, ...messages].slice(-20), // Giữ 20 tin nhắn cuối
        nightResults: { investigated: [], foundWolves: [] },
        lastCombatResult: null,
      };
    }

    // ========== LOSE CONDITION ==========
    case 'CHECK_LOSE': {
      const totalSheep = state.sheep.length;
      const totalWolves = state.infiltratedWolves.length;
      if (totalSheep > 0 && totalWolves >= totalSheep * 0.5) {
        return { ...state, phase: 'LOSE' };
      }
      return state;
    }

    case 'HEAL_PLAYER': {
      const amount = action.payload.amount;
      return {
        ...state,
        player: {
          ...state.player,
          hp: Math.min(state.player.maxHp, state.player.hp + amount),
        },
      };
    }

    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload].slice(-20),
      };

    default:
      console.warn('Unknown action:', action.type);
      return state;
  }
}

// --- localStorage Save/Load ---
export function saveGame(state) {
  try {
    const saveData = { ...state, version: SAVE_VERSION };
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    return true;
  } catch (e) {
    console.error('Save failed:', e);
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    return migrateState(saved);
  } catch (e) {
    console.error('Load failed:', e);
    return null;
  }
}

/**
 * Deep-merge saved state với defaults mới.
 * Đảm bảo không crash khi thêm biến mới vào initialState.
 */
function migrateState(saved) {
  const defaults = createInitialState();

  // Nếu version quá cũ, reset
  if (!saved.version || saved.version < 1) {
    return null;
  }

  // Merge: giữ saved values, bổ sung keys mới từ defaults
  const merged = { ...defaults };
  for (const key of Object.keys(defaults)) {
    if (key in saved) {
      if (typeof defaults[key] === 'object' && defaults[key] !== null && !Array.isArray(defaults[key])) {
        // Shallow merge objects (player, dog, merchant, nightResults)
        merged[key] = { ...defaults[key], ...saved[key] };
      } else {
        merged[key] = saved[key];
      }
    }
  }
  merged.version = SAVE_VERSION;
  return merged;
}

export function deleteSave() {
  localStorage.removeItem(SAVE_KEY);
}
