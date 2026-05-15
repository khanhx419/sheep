/* ============================================================
 * combatSystem.js — Damage Calculation, Attack Meter Logic
 * ============================================================ */

import {
  TOOL_BASE_DAMAGE, GUN_BASE_DAMAGE,
  CRITICAL_MULTIPLIER, GOOD_MULTIPLIER, MISS_MULTIPLIER,
  CRITICAL_ZONE, GOOD_ZONE,
  DOG_DAMAGE_BUFF,
} from '../data/constants.js';

/**
 * Tính sát thương dựa trên vị trí trên thanh Attack Meter
 * @param {number} meterPosition - Vị trí 0..1 trên thanh
 * @param {'tool'|'gun'} weapon
 * @param {object} options - { dogAssist, buffs, wolfEvasion }
 * @returns {{ damage, rating, isCritical, evaded }}
 */
export function calculateAttackDamage(meterPosition, weapon, options = {}) {
  const { dogAssist = false, buffs = [], wolfEvasion = 0 } = options;

  // Base damage
  const baseDmg = weapon === 'gun' ? GUN_BASE_DAMAGE : TOOL_BASE_DAMAGE;

  // Xác định rating dựa trên khoảng cách từ center (0.5)
  const dist = Math.abs(meterPosition - 0.5); // 0 = perfect center
  let multiplier;
  let rating;
  let isCritical = false;

  if (dist <= CRITICAL_ZONE) {
    multiplier = CRITICAL_MULTIPLIER;
    rating = 'CRITICAL';
    isCritical = true;
  } else if (dist <= GOOD_ZONE) {
    multiplier = GOOD_MULTIPLIER;
    rating = 'TỐT';
  } else {
    multiplier = MISS_MULTIPLIER;
    rating = 'TRƯỢT';
  }

  let damage = Math.round(baseDmg * multiplier);

  // Dog buff
  if (dogAssist) {
    damage = Math.round(damage * (1 + DOG_DAMAGE_BUFF));
  }

  // Item buffs
  for (const buff of buffs) {
    if (buff.type === 'damage') {
      damage = Math.round(damage * buff.multiplier);
    }
  }

  // Wolf evasion check
  const evaded = Math.random() < wolfEvasion;
  if (evaded) {
    damage = 0;
    rating = 'NÉ!';
  }

  return { damage, rating, isCritical, evaded };
}

/**
 * Tính sát thương lên player (có armor durability)
 * @returns {{ hpDamage, armorDamage, armorBroken }}
 */
export function calculatePlayerDamage(rawDamage, armor) {
  let remaining = rawDamage;
  let armorDamage = 0;
  let armorBroken = false;

  if (armor && armor.durability > 0) {
    armorDamage = Math.min(remaining, armor.durability);
    remaining -= armorDamage;
    if (armor.durability - armorDamage <= 0) {
      armorBroken = true;
    }
  }

  return {
    hpDamage: remaining,
    armorDamage,
    armorBroken,
  };
}

/**
 * Xử lý hiệu ứng trạng thái (bleed, v.v.)
 */
export function processStatusEffect(effect, currentHp) {
  switch (effect) {
    case 'bleed':
      // Chảy máu: -2 HP mỗi turn
      return { hpLoss: 2, message: '🩸 Bạn đang chảy máu! (-2 HP)' };
    default:
      return { hpLoss: 0, message: '' };
  }
}
