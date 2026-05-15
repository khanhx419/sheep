/* ============================================================
 * wolfSpawner.js — Wolf Spawn & Evolution Algorithm
 * 
 * Thuật toán:
 * 1. Lọc sói đủ điều kiện theo đêm hiện tại
 * 2. Tính số sói spawn (tăng dần, cap theo % cừu)
 * 3. Weighted random chọn loại sói
 * 4. Apply evolution scaling (HP, speed tăng theo đêm)
 * 5. Trăng tròn: ẩn tất cả manh mối
 * ============================================================ */

import { WOLF_TYPES, getEligibleWolves } from '../data/wolfTypes.js';
import {
  WOLF_BASE_COUNT, WOLF_PER_NIGHTS, WOLF_CAP_RATIO, FULL_MOON_CYCLE,
} from '../data/constants.js';

let _wolfIdCounter = 1000;

/**
 * Spawn danh sách sói cho đêm hiện tại
 * @param {number} day - Ngày hiện tại (1-indexed)
 * @param {number} sheepCount - Số cừu hiện tại
 * @returns {{ wolves: Array, isFullMoon: boolean }}
 */
export function spawnWolvesForNight(day, sheepCount) {
  const isFullMoon = day % FULL_MOON_CYCLE === 0;
  const eligible = getEligibleWolves(day);

  if (eligible.length === 0 || sheepCount === 0) {
    return { wolves: [], isFullMoon };
  }

  // Số sói tăng dần: base + day/3, cap = 30% số cừu
  const rawCount = WOLF_BASE_COUNT + Math.floor(day / WOLF_PER_NIGHTS);
  const maxCount = Math.max(1, Math.ceil(sheepCount * WOLF_CAP_RATIO));
  const count = Math.min(rawCount, maxCount);

  // Weighted random: sói xuất hiện càng lâu → weight càng cao
  const weights = eligible.map(w => {
    const nightsSinceUnlock = day - w.minNight;
    return 1 + Math.min(nightsSinceUnlock, 5);
  });
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  const spawned = [];
  for (let i = 0; i < count; i++) {
    // Weighted random pick
    let roll = Math.random() * totalWeight;
    let picked = eligible[0];
    for (let j = 0; j < eligible.length; j++) {
      roll -= weights[j];
      if (roll <= 0) {
        picked = eligible[j];
        break;
      }
    }

    // Apply evolution scaling
    const evolved = applyEvolution(picked, day);

    // Trăng tròn: ẩn tất cả manh mối, chỉ hú
    if (isFullMoon) {
      evolved.tells = [];
      evolved.specialNote = 'Trăng tròn — sói hóa form ẩn, chỉ nghe tiếng hú.';
    }

    evolved.id = _wolfIdCounter++;
    evolved.penId = Math.floor(Math.random() * 2); // Random chuồng A hoặc B

    spawned.push(evolved);
  }

  return { wolves: spawned, isFullMoon };
}

/**
 * Apply evolution scaling dựa trên số đêm đã qua
 */
function applyEvolution(wolfDef, day) {
  const nightsSince = Math.max(0, day - wolfDef.minNight);
  return {
    ...wolfDef,
    hp: Math.round(wolfDef.hp + wolfDef.scaling.hpPerNight * nightsSince),
    speed: +(wolfDef.speed + wolfDef.scaling.speedPerNight * nightsSince).toFixed(2),
    // Giữ lại tất cả properties khác
    tells: [...wolfDef.tells],
  };
}

/**
 * Tính preview thông tin đêm (cho UI)
 */
export function getNightPreview(day) {
  const isFullMoon = day % FULL_MOON_CYCLE === 0;
  const eligible = getEligibleWolves(day);
  return {
    day,
    isFullMoon,
    eligibleWolfTypes: eligible.map(w => w.name),
    dangerLevel: Math.min(5, Math.floor(day / 3) + 1),
  };
}
