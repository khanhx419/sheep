/* ============================================================
 * wolfTypes.js - Wolf Definitions
 * Sheep Farm Defense
 * ============================================================ */

export const WOLF_TYPES = {
  normal: {
    id: 'normal',
    name: 'Soi Binh Thuong',
    description: 'Chan to bat thuong, lo ra khi kiem tra ky.',
    hp: 30,
    speed: 1,
    damage: 10,
    disguise: 'adult',
    tells: ['paws'],
    minNight: 1,
    dogDetect: true,
    evasion: 0,
    eatRate: 1,
    statusEffect: null,
    specialMechanic: null,
    patternPool: ['normalRain', 'normalSpiral', 'normalWave'],
    scaling: { hpPerNight: 3, speedPerNight: 0.025 },
    color: '#cc3333',
  },

  rabid: {
    id: 'rabid',
    name: 'Soi Dai',
    description: 'Mat do va chay dai. Dan gay chay mau nhung da co nhip ro rang hon.',
    hp: 25,
    speed: 1.5,
    damage: 8,
    disguise: 'adult',
    tells: ['red_eyes', 'drool'],
    minNight: 1,
    dogDetect: true,
    evasion: 0,
    eatRate: 1,
    statusEffect: 'bleed',
    specialMechanic: null,
    patternPool: ['rabidChaos', 'rabidBurst', 'rabidZigzag'],
    scaling: { hpPerNight: 2, speedPerNight: 0.04 },
    color: '#ff4444',
  },

  pup: {
    id: 'pup',
    name: 'Soi Con',
    description: 'Tra tron voi cuu con. Cho khong phat hien duoc.',
    hp: 15,
    speed: 2,
    damage: 5,
    disguise: 'baby',
    tells: ['teeth'],
    minNight: 4,
    dogDetect: false,
    evasion: 0,
    eatRate: 0.5,
    statusEffect: null,
    specialMechanic: null,
    patternPool: ['pupDash', 'pupScatter', 'pupRapid'],
    scaling: { hpPerNight: 1, speedPerNight: 0.045 },
    color: '#ff8866',
  },

  lean: {
    id: 'lean',
    name: 'Soi Gay',
    description: 'Nguy trang thanh cuu da cat long. Lo xuong suon va ne gioi.',
    hp: 35,
    speed: 1,
    damage: 12,
    disguise: 'sheared',
    tells: ['ribs'],
    minNight: 4,
    dogDetect: true,
    evasion: 0.3,
    eatRate: 0.5,
    statusEffect: null,
    specialMechanic: null,
    patternPool: ['leanSlice', 'leanFade', 'leanTrap'],
    scaling: { hpPerNight: 3, speedPerNight: 0.03 },
    color: '#996644',
  },
};

export function getEligibleWolves(nightNumber) {
  return Object.values(WOLF_TYPES).filter((wolf) => nightNumber >= wolf.minNight);
}
