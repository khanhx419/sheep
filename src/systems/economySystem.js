/* ============================================================
 * economySystem.js — Day Cycle, Income, Weather, Merchant
 * ============================================================ */

import { ITEMS, getShopItems } from '../data/items.js';
import {
  INCOME_PER_ADULT_SHEEP, RAIN_CHANCE, MERCHANT_CHANCE,
} from '../data/constants.js';
import { spawnWolvesForNight } from './wolfSpawner.js';

/**
 * Xử lý chuyển ngày: tính thu nhập, sói ăn cừu, thời tiết, merchant...
 * Trả về payload cho action ADVANCE_DAY
 */
export function processAdvanceDay(state) {
  const newDay = state.day + 1;
  const messages = [];

  // 1. Thu nhập: 1 xu/cừu trưởng thành
  const adultSheep = state.sheep.filter(s => s.age === 'adult');
  const income = adultSheep.length * INCOME_PER_ADULT_SHEEP;
  messages.push(`🐑 ${adultSheep.length} cừu lớn → +${income} Xu`);

  // 2. Sói chưa phát hiện ăn cừu
  const sheepEaten = [];
  for (const wolf of state.infiltratedWolves) {
    // eatRate: 1 = ăn 1 con/đêm, 0.5 = 2 đêm ăn 1 con
    const shouldEat = wolf.eatRate >= 1
      ? true
      : Math.random() < wolf.eatRate;

    if (shouldEat) {
      // Tìm cừu cùng chuồng để ăn
      const eatCount = Math.ceil(wolf.eatRate);
      const preyInPen = state.sheep.filter(
        s => s.penId === wolf.penId && !sheepEaten.includes(s.id)
      );
      for (let i = 0; i < eatCount && i < preyInPen.length; i++) {
        sheepEaten.push(preyInPen[i].id);
      }
    }
  }
  if (sheepEaten.length > 0) {
    messages.push(`🐺 Sói đã ăn ${sheepEaten.length} con cừu trong đêm!`);
  }

  // 3. Thời tiết
  const weather = Math.random() < RAIN_CHANCE ? 'rainy' : 'sunny';
  if (weather === 'rainy') {
    messages.push('🌧️ Trời mưa! Cừu cần Cỏ khô hoặc Mái che.');
  }

  // 4. Thương nhân
  const merchantPresent = Math.random() < MERCHANT_CHANCE;
  const merchantStock = merchantPresent ? generateMerchantStock() : [];
  if (merchantPresent) {
    messages.push('🧙 Thương nhân bí ẩn đã xuất hiện!');
  }

  // 5. Spawn sói mới cho đêm tới
  const remainingSheep = state.sheep.length - sheepEaten.length;
  const { wolves: wolvesToSpawn, isFullMoon } = spawnWolvesForNight(newDay, remainingSheep);
  if (isFullMoon) {
    messages.push('🌕 Đêm trăng tròn! Sói ẩn mình hoàn toàn...');
  }

  // 6. Cừu mới sinh (1 con mỗi 5 ngày nếu có >= 3 cừu adult)
  const newSheep = [];
  if (adultSheep.length >= 3 && newDay % 5 === 0) {
    newSheep.push({ age: 'baby', penId: 0 });
    messages.push('🐣 Một chú cừu con mới sinh!');
  }

  return {
    newDay,
    income,
    sheepEaten,
    newSheep,
    weather,
    merchantPresent,
    merchantStock,
    isFullMoon,
    wolvesToSpawn,
    messages,
  };
}

/**
 * Random stock cho thương nhân
 */
function generateMerchantStock() {
  const allMerchantItems = getShopItems('merchant');
  // Chọn 3-5 items ngẫu nhiên
  const count = 3 + Math.floor(Math.random() * 3);
  const shuffled = [...allMerchantItems].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(item => ({
    itemId: item.id,
    stock: 1 + Math.floor(Math.random() * 3),
  }));
}
