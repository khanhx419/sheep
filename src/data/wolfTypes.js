/* ============================================================
 * wolfTypes.js — Wolf Definitions (Phase 1: 4 loại)
 * Sheep Farm Defense
 * ============================================================ */

export const WOLF_TYPES = {
  normal: {
    id: 'normal',
    name: 'Sói Bình Thường',
    description: 'Chân to bất thường, lộ ra khi kiểm tra kỹ.',
    hp: 30,
    speed: 1,
    damage: 10,
    disguise: 'adult',        // Ngụy trang thành cừu trưởng thành
    tells: ['paws'],          // Manh mối: chân to
    minNight: 1,
    dogDetect: true,          // Chó sủa được
    evasion: 0,
    eatRate: 1,               // 1 đêm ăn 1 con
    statusEffect: null,
    specialMechanic: null,
    patternPool: ['normalRain', 'normalSpiral', 'normalWave'],
    scaling: { hpPerNight: 3, speedPerNight: 0.05 },
    color: '#cc3333',         // Placeholder color
  },

  rabid: {
    id: 'rabid',
    name: 'Sói Dại',
    description: 'Mắt đỏ ngầu, chảy dãi. Đánh loạn xạ gây chảy máu.',
    hp: 25,
    speed: 1.5,
    damage: 8,
    disguise: 'adult',
    tells: ['red_eyes', 'drool'],
    minNight: 1,
    dogDetect: true,
    evasion: 0,
    eatRate: 1,
    statusEffect: 'bleed',   // Gây hiệu ứng chảy máu (DOT)
    specialMechanic: null,
    patternPool: ['rabidChaos', 'rabidBurst', 'rabidZigzag'],
    scaling: { hpPerNight: 2, speedPerNight: 0.08 },
    color: '#ff4444',
  },

  pup: {
    id: 'pup',
    name: 'Sói Con',
    description: 'Trà trộn với cừu con. Chó không phát hiện được.',
    hp: 15,
    speed: 2,
    damage: 5,
    disguise: 'baby',         // Ngụy trang thành cừu con
    tells: ['teeth'],         // Răng nhọn
    minNight: 4,
    dogDetect: false,         // Chó KHÔNG sủa
    evasion: 0,
    eatRate: 0.5,             // 2 đêm mới ăn 1 con
    statusEffect: null,
    specialMechanic: null,
    patternPool: ['pupDash', 'pupScatter', 'pupRapid'],
    scaling: { hpPerNight: 1, speedPerNight: 0.1 },
    color: '#ff8866',
  },

  lean: {
    id: 'lean',
    name: 'Sói Gầy',
    description: 'Ngụy trang thành cừu đã cạo lông. Lộ xương sườn. Né giỏi.',
    hp: 35,
    speed: 1,
    damage: 12,
    disguise: 'sheared',      // Ngụy trang cừu cạo lông
    tells: ['ribs'],          // Xương sườn lộ
    minNight: 4,
    dogDetect: true,
    evasion: 0.3,             // 30% né đòn
    eatRate: 0.5,             // 2 đêm ăn 1 con
    statusEffect: null,
    specialMechanic: null,
    patternPool: ['leanSlice', 'leanFade', 'leanTrap'],
    scaling: { hpPerNight: 3, speedPerNight: 0.05 },
    color: '#996644',
  },
};

/**
 * Lấy danh sách sói đủ điều kiện xuất hiện theo đêm hiện tại
 */
export function getEligibleWolves(nightNumber) {
  return Object.values(WOLF_TYPES).filter(w => nightNumber >= w.minNight);
}
