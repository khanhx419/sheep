/* ============================================================
 * investigationSystem.js - Night Investigation Logic
 * ============================================================ */

export function dogCheck(penId, infiltratedWolves, dogAvailable) {
  if (!dogAvailable) {
    return { canCheck: false, reason: 'Cho dang kiet suc, khong the giup.' };
  }

  const wolvesInPen = infiltratedWolves.filter(
    (wolf) => wolf.penId === penId && wolf.dogDetect !== false
  );

  return {
    canCheck: true,
    hasDangerousWolf: wolvesInPen.length > 0,
  };
}

export function investigateSheep(method, targetId, sheep, infiltratedWolves) {
  const wolf = infiltratedWolves.find((candidate) => candidate.fakeSheepId === targetId);

  if (!wolf) {
    return {
      isWolf: false,
      wolfData: null,
      clue: getInnocentClue(method),
    };
  }

  const detected = canDetectWithMethod(method, wolf);
  if (detected) {
    return {
      isWolf: true,
      wolfData: wolf,
      clue: getWolfClue(method, wolf),
    };
  }

  return {
    isWolf: false,
    wolfData: null,
    clue: getInconclusiveClue(method),
  };
}

function canDetectWithMethod(method, wolf) {
  // Shear should always reveal the disguise instead of depending on tells.
  if (method === 'shear') return true;

  if (wolf.tells.length === 0) return false;

  const methodToTells = {
    check_paws: ['paws'],
    check_teeth: ['teeth'],
    check_eyes: ['red_eyes', 'drool'],
  };

  const detectableTells = methodToTells[method] || [];
  return wolf.tells.some((tell) => detectableTells.includes(tell));
}

function getInnocentClue(method) {
  const clues = {
    check_paws: 'Chan binh thuong, mong tron gon gang.',
    check_teeth: 'Rang co, khong co gi bat thuong.',
    check_eyes: 'Mat hien, anh nhin ngay tho.',
    shear: 'Long muot deu, da hong khoe manh.',
  };
  return clues[method] || 'Khong phat hien gi bat thuong.';
}

function getWolfClue(method, wolf) {
  const clues = {
    check_paws: `CHAN QUA TO! Day la ${wolf.name}!`,
    check_teeth: `RANG NHON HOAT! Day la ${wolf.name}!`,
    check_eyes: `MAT DO NGAU, nuoc dai chay rong! ${wolf.name}!`,
    shear: `Lo nguyen hinh! Day la ${wolf.name}!`,
  };
  return clues[method] || `Phat hien ${wolf.name}!`;
}

function getInconclusiveClue(method) {
  const clues = {
    check_paws: 'Chan hoi la nhung khong chac.',
    check_teeth: 'Rang trong binh thuong.',
    check_eyes: 'Khong thay gi dac biet.',
    shear: 'Long hoi thua nhung co the do thoi tiet.',
  };
  return clues[method] || 'Khong ro rang lam.';
}

export function assignFakeSheepIds(wolves, nextSheepId) {
  let id = nextSheepId;
  return wolves.map((wolf) => ({
    ...wolf,
    fakeSheepId: id++,
  }));
}
