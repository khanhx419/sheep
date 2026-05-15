/* ============================================================
 * investigationSystem.js — Night Investigation Logic
 * ============================================================ */

/**
 * Kiểm tra xem chuồng có sói không (chó sủa)
 * Chó KHÔNG sủa với sói con (dogDetect: false)
 */
export function dogCheck(penId, infiltratedWolves, dogAvailable) {
  if (!dogAvailable) {
    return { canCheck: false, reason: 'Chó đang kiệt sức, không thể giúp.' };
  }
  const wolvesInPen = infiltratedWolves.filter(
    w => w.penId === penId && w.dogDetect !== false
  );
  return {
    canCheck: true,
    hasDangerousWolf: wolvesInPen.length > 0,
    // Chó chỉ cho biết CÓ/KHÔNG, không nói loại nào
  };
}

/**
 * Điều tra 1 con cừu cụ thể bằng phương pháp nhất định
 * @param {'check_paws'|'check_teeth'|'check_eyes'|'shear'} method
 * @param {object} targetSheepOrWolf - Con cừu (hoặc sói ngụy trang) được kiểm tra
 * @param {Array} infiltratedWolves
 * @returns {{ isWolf: boolean, wolfData: object|null, clue: string }}
 */
export function investigateSheep(method, targetId, sheep, infiltratedWolves) {
  // Tìm xem target có phải sói ngụy trang không
  const wolf = infiltratedWolves.find(w => w.fakeSheepId === targetId);

  if (!wolf) {
    // Cừu thật
    return {
      isWolf: false,
      wolfData: null,
      clue: getInnocentClue(method),
    };
  }

  // Là sói! Kiểm tra xem method có phát hiện được tells không
  const detected = canDetectWithMethod(method, wolf);
  if (detected) {
    return {
      isWolf: true,
      wolfData: wolf,
      clue: getWolfClue(method, wolf),
    };
  }

  // Method không phù hợp → không phát hiện
  return {
    isWolf: false,
    wolfData: null,
    clue: getInconclusiveClue(method),
  };
}

/**
 * Kiểm tra method có phát hiện được sói dựa trên tells
 */
function canDetectWithMethod(method, wolf) {
  // Trăng tròn: ẩn tất cả tells
  if (wolf.tells.length === 0) return false;

  const methodToTells = {
    check_paws: ['paws'],
    check_teeth: ['teeth'],
    check_eyes: ['red_eyes', 'drool'],
    shear: ['ribs'],
  };

  const detectableTells = methodToTells[method] || [];
  return wolf.tells.some(t => detectableTells.includes(t));
}

function getInnocentClue(method) {
  const clues = {
    check_paws: '🐾 Chân bình thường, móng tròn gọn gàng.',
    check_teeth: '🦷 Răng cỏ, không có gì bất thường.',
    check_eyes: '👀 Mắt hiền, ánh nhìn ngây thơ.',
    shear: '✂️ Lông mượt đều, da hồng khỏe mạnh.',
  };
  return clues[method] || 'Không phát hiện gì bất thường.';
}

function getWolfClue(method, wolf) {
  const clues = {
    check_paws: `🐺 CHÂN QUÁ TO! Đây là ${wolf.name}!`,
    check_teeth: `🐺 RĂNG NHỌN HOẮT! Đây là ${wolf.name}!`,
    check_eyes: `🐺 MẮT ĐỎ NGẦU, nước dãi chảy ròng! ${wolf.name}!`,
    shear: `🐺 XƯƠNG SƯỜN LỒI RA! Đây là ${wolf.name}!`,
  };
  return clues[method] || `🐺 Phát hiện ${wolf.name}!`;
}

function getInconclusiveClue(method) {
  const clues = {
    check_paws: '🐾 Chân... hơi lạ nhưng không chắc.',
    check_teeth: '🦷 Răng trông bình thường.',
    check_eyes: '👀 Không thấy gì đặc biệt.',
    shear: '✂️ Lông hơi thưa nhưng có thể do thời tiết.',
  };
  return clues[method] || 'Không rõ ràng lắm...';
}

/**
 * Gắn fake sheep ID cho mỗi sói khi spawn vào chuồng
 * (để hiển thị chung với cừu thật trong UI)
 */
export function assignFakeSheepIds(wolves, nextSheepId) {
  let id = nextSheepId;
  return wolves.map(w => ({
    ...w,
    fakeSheepId: id++,
  }));
}
