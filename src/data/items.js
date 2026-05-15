/* ============================================================
 * items.js — Shop & Merchant Items
 * Sheep Farm Defense
 * ============================================================ */

export const ITEM_CATEGORIES = {
  FARM: 'farm',
  COMBAT: 'combat',
  CONSUMABLE: 'consumable',
};

export const ITEMS = {
  // === CỬA HÀNG CƠ BẢN (ban ngày) ===
  hay: {
    id: 'hay',
    name: 'Cỏ Khô',
    description: 'Cho cừu ăn vào ngày mưa. Không có → cừu yếu đi.',
    price: 1,
    category: ITEM_CATEGORIES.FARM,
    stackable: true,
    shopType: 'basic',
  },
  battery: {
    id: 'battery',
    name: 'Pin Tông Đơ',
    description: 'Dùng để cạo lông cừu khi điều tra.',
    price: 2,
    category: ITEM_CATEGORIES.FARM,
    stackable: true,
    shopType: 'basic',
  },
  sunDoll: {
    id: 'sunDoll',
    name: 'Búp Bê Cầu Nắng',
    description: 'Đảm bảo ngày mai trời nắng.',
    price: 3,
    category: ITEM_CATEGORIES.FARM,
    stackable: true,
    shopType: 'basic',
  },
  fence: {
    id: 'fence',
    name: 'Hàng Rào Chia Chuồng',
    description: 'Chia chuồng thành nhiều khu, dễ quản lý hơn.',
    price: 5,
    category: ITEM_CATEGORIES.FARM,
    stackable: false,
    shopType: 'basic',
  },
  roof: {
    id: 'roof',
    name: 'Mái Che',
    description: 'Che mưa cho chuồng. Cừu không cần cỏ khô khi trời mưa.',
    price: 8,
    category: ITEM_CATEGORIES.FARM,
    stackable: false,
    shopType: 'basic',
  },

  // === THƯƠNG NHÂN LANG THANG ===
  ammo: {
    id: 'ammo',
    name: 'Đạn Súng',
    description: 'Đạn cho vũ khí tầm xa. Mỗi viên = 1 lượt bắn.',
    price: 3,
    category: ITEM_CATEGORIES.COMBAT,
    stackable: true,
    shopType: 'merchant',
  },
  armorLight: {
    id: 'armorLight',
    name: 'Giáp Nhẹ',
    description: 'Bảo hộ cơ bản. Độ bền: 20.',
    price: 8,
    category: ITEM_CATEGORIES.COMBAT,
    maxDurability: 20,
    stackable: false,
    shopType: 'merchant',
  },
  armorHeavy: {
    id: 'armorHeavy',
    name: 'Giáp Nặng',
    description: 'Bảo hộ tốt hơn. Độ bền: 40.',
    price: 15,
    category: ITEM_CATEGORIES.COMBAT,
    maxDurability: 40,
    stackable: false,
    shopType: 'merchant',
  },
  repairKit: {
    id: 'repairKit',
    name: 'Bộ Sửa Giáp',
    description: 'Hồi phục 15 độ bền giáp.',
    price: 4,
    category: ITEM_CATEGORIES.COMBAT,
    repairAmount: 15,
    stackable: true,
    shopType: 'merchant',
  },
  beer: {
    id: 'beer',
    name: 'Bia Thợ Săn',
    description: 'Hồi 30 HP. Dùng trong hoặc ngoài combat.',
    price: 3,
    category: ITEM_CATEGORIES.CONSUMABLE,
    healAmount: 30,
    stackable: true,
    shopType: 'merchant',
  },
  strengthPotion: {
    id: 'strengthPotion',
    name: 'Thuốc Tăng Lực',
    description: 'Tăng 50% sát thương cho trận combat tiếp theo.',
    price: 6,
    category: ITEM_CATEGORIES.CONSUMABLE,
    buffType: 'damage',
    buffMultiplier: 1.5,
    buffDuration: 1, // 1 trận
    stackable: true,
    shopType: 'merchant',
  },
};

/**
 * Lấy danh sách items theo loại shop
 */
export function getShopItems(shopType) {
  return Object.values(ITEMS).filter(item => item.shopType === shopType);
}
