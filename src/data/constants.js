/* ============================================================
 * constants.js — Game Balance Constants
 * Sheep Farm Defense | Phase 1
 * ============================================================ */

// --- Economy ---
export const TARGET_GOLD = 200;
export const STARTING_GOLD = 10;
export const INCOME_PER_ADULT_SHEEP = 1;
export const STARTING_SHEEP_COUNT = 5;
export const BABY_GROW_DAYS = 2;          // Ngày để cừu con → cừu lớn
export const SHEAR_COST = 2;              // Xu/lần cạo lông (pin tông đơ)

// --- Player ---
export const PLAYER_MAX_HP = 100;
export const PLAYER_ENERGY_PER_NIGHT = 2; // Năng lượng điều tra mỗi đêm
export const DOG_DAMAGE_BUFF = 0.2;       // +20% damage khi gọi chó

// --- Combat ---
export const BATTLE_BOX = { x: 60, y: 60, w: 280, h: 280 }; // Canvas battle area
export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 400;
export const HEART_SIZE = 14;             // Player heart hitbox
export const HEART_SPEED = 3.5;           // Tốc độ di chuyển heart

// Attack meter
export const ATTACK_METER_SPEED_TOOL = 4;     // Nông cụ: khó căn hơn
export const ATTACK_METER_SPEED_GUN = 2.5;    // Súng: dễ căn hơn
export const CRITICAL_ZONE = 0.08;            // 8% vùng critical (giữa thanh)
export const GOOD_ZONE = 0.25;                // 25% vùng "tốt"
export const TOOL_BASE_DAMAGE = 15;
export const GUN_BASE_DAMAGE = 30;
export const CRITICAL_MULTIPLIER = 2.0;
export const GOOD_MULTIPLIER = 1.0;
export const MISS_MULTIPLIER = 0.3;

// --- Wolf Spawning ---
export const WOLF_BASE_COUNT = 1;         // Số sói tối thiểu mỗi đêm
export const WOLF_PER_NIGHTS = 3;         // Mỗi 3 đêm +1 sói
export const WOLF_CAP_RATIO = 0.3;        // Tối đa 30% số cừu hiện tại
export const LOSE_RATIO = 0.5;            // Thua khi sói >= 50% cừu

// --- Full Moon ---
export const FULL_MOON_CYCLE = 7;         // Trăng tròn mỗi 7 đêm

// --- Weather ---
export const RAIN_CHANCE = 0.25;          // 25% mưa

// --- Merchant ---
export const MERCHANT_CHANCE = 0.2;       // 20% thương nhân xuất hiện mỗi sáng

// --- Save System ---
export const SAVE_KEY = 'sheep_farm_defense_save';
export const SAVE_VERSION = 1;
