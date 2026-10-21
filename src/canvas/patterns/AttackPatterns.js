/* ============================================================
 * patterns/ - Wolf Attack Patterns
 *
 * Moi pattern la 1 function(pool, frame, bounds, speed)
 * - pool: BulletPool instance
 * - frame: frame counter (reset moi turn)
 * - bounds: battle box { x, y, w, h }
 * - speed: wolf speed multiplier (evolution scaling)
 * ============================================================ */

function getWavePhase(frame, cycle) {
  const phase = frame % cycle;
  return { phase, wave: Math.floor(frame / cycle) };
}

// ========== SOI BINH THUONG ==========

export function normalRain(pool, frame, bounds, speed = 1) {
  const interval = Math.max(14, Math.floor(38 / speed));
  if (frame % interval !== 0) return;

  const lanes = 6;
  const gapStart = Math.floor(frame / interval) % (lanes - 1);
  const laneWidth = bounds.w / lanes;

  for (let lane = 0; lane < lanes; lane++) {
    if (lane === gapStart || lane === gapStart + 1) continue;

    const x = bounds.x + laneWidth * lane + laneWidth / 2;
    pool.spawn(x, bounds.y, 0, 1.35 * speed, {
      color: '#b8b8b8',
      radius: 4,
    });
  }
}

export function normalSpiral(pool, frame, bounds, speed = 1) {
  const interval = Math.max(10, Math.floor(28 / speed));
  if (frame % interval !== 0) return;

  const cx = bounds.x + bounds.w / 2;
  const cy = bounds.y + bounds.h / 2;
  const ringIndex = Math.floor(frame / interval);
  const bulletCount = 4;

  for (let i = 0; i < bulletCount; i++) {
    const angle = ringIndex * 0.45 + (Math.PI * 2 * i) / bulletCount;
    pool.spawn(cx, cy, Math.cos(angle) * 1.8 * speed, Math.sin(angle) * 1.8 * speed, {
      color: '#d0d0d0',
      radius: 4,
    });
  }
}

export function normalWave(pool, frame, bounds, speed = 1) {
  const interval = Math.max(18, Math.floor(36 / speed));
  if (frame % interval !== 0) return;

  const rows = 5;
  const gapRow = Math.floor(frame / interval) % rows;
  for (let row = 0; row < rows; row++) {
    if (row === gapRow) continue;

    const y = bounds.y + (bounds.h / (rows + 1)) * (row + 1);
    const vx = row % 2 === 0 ? 1.8 * speed : -1.8 * speed;
    const startX = vx > 0 ? bounds.x : bounds.x + bounds.w;
    pool.spawn(startX, y, vx, Math.sin((frame + row * 10) * 0.04) * 0.35, {
      color: '#bbbbbb',
      radius: 4,
    });
  }
}

// ========== SOI DAI ==========

export function rabidChaos(pool, frame, bounds, speed = 1) {
  const cycle = 96;
  const activeWindow = 54;
  const interval = Math.max(12, Math.floor(34 / speed));
  const { phase, wave } = getWavePhase(frame, cycle);
  if (phase >= activeWindow || phase % interval !== 0) return;

  const edge = wave % 4;
  const lanes = 5;
  const safeLane = (wave + Math.floor(phase / interval)) % lanes;

  for (let lane = 0; lane < lanes; lane++) {
    if (lane === safeLane) continue;

    const ratio = (lane + 0.5) / lanes;
    let x = bounds.x;
    let y = bounds.y;
    let targetX = bounds.x + bounds.w * ratio;
    let targetY = bounds.y + bounds.h * ratio;

    if (edge === 0) {
      x = bounds.x + bounds.w * ratio;
      y = bounds.y;
      targetY = bounds.y + bounds.h;
    } else if (edge === 1) {
      x = bounds.x + bounds.w;
      y = bounds.y + bounds.h * ratio;
      targetX = bounds.x;
    } else if (edge === 2) {
      x = bounds.x + bounds.w * ratio;
      y = bounds.y + bounds.h;
      targetY = bounds.y;
    } else {
      x = bounds.x;
      y = bounds.y + bounds.h * ratio;
      targetX = bounds.x + bounds.w;
    }

    const dx = targetX - x;
    const dy = targetY - y;
    const distance = Math.hypot(dx, dy) || 1;
    pool.spawn(x, y, (dx / distance) * 2 * speed, (dy / distance) * 2 * speed, {
      color: '#ff5252',
      type: 'bleed',
      radius: 5,
    });
  }
}

export function rabidBurst(pool, frame, bounds, speed = 1) {
  const interval = Math.max(30, Math.floor(64 / speed));
  if (frame % interval !== 0) return;

  const cx = bounds.x + bounds.w / 2;
  const cy = bounds.y + bounds.h / 2;
  const count = 12;
  const gapIndex = Math.floor(frame / interval) % count;

  for (let i = 0; i < count; i++) {
    if (i === gapIndex || i === (gapIndex + 1) % count) continue;

    const angle = (Math.PI * 2 * i) / count;
    pool.spawn(cx, cy, Math.cos(angle) * 1.75 * speed, Math.sin(angle) * 1.75 * speed, {
      color: '#ff6b6b',
      type: 'bleed',
      radius: 5,
    });
  }
}

export function rabidZigzag(pool, frame, bounds, speed = 1) {
  const cycle = 88;
  const activeWindow = 48;
  const interval = Math.max(16, Math.floor(38 / speed));
  const { phase, wave } = getWavePhase(frame, cycle);
  if (phase >= activeWindow || phase % interval !== 0) return;

  const rows = 5;
  const safeRow = (wave + Math.floor(phase / interval)) % rows;
  for (let row = 0; row < rows; row++) {
    if (row === safeRow) continue;

    const y = bounds.y + (bounds.h / (rows + 1)) * (row + 1);
    const fromLeft = (row + wave) % 2 === 0;
    pool.spawn(
      fromLeft ? bounds.x : bounds.x + bounds.w,
      y,
      (fromLeft ? 2.2 : -2.2) * speed,
      (row % 2 === 0 ? 0.7 : -0.7) * speed,
      {
        color: '#ff4040',
        type: 'bleed',
        radius: 5,
      }
    );
  }
}

// ========== SOI CON ==========

export function pupDash(pool, frame, bounds, speed = 1) {
  const interval = Math.max(16, Math.floor(32 / speed));
  if (frame % interval !== 0) return;

  const lanes = 7;
  const gapStart = Math.floor(frame / interval) % (lanes - 1);
  const laneWidth = bounds.w / lanes;

  for (let lane = 0; lane < lanes; lane++) {
    if (lane === gapStart || lane === gapStart + 1) continue;

    const x = bounds.x + laneWidth * lane + laneWidth / 2;
    pool.spawn(x, bounds.y, 0, 2.3 * speed, {
      color: '#ffaa66',
      radius: 3,
    });
  }
}

export function pupScatter(pool, frame, bounds, speed = 1) {
  const cycle = 84;
  const activeWindow = 36;
  const interval = Math.max(14, Math.floor(26 / speed));
  const { phase, wave } = getWavePhase(frame, cycle);
  if (phase >= activeWindow || phase % interval !== 0) return;

  const corners = [
    { x: bounds.x, y: bounds.y, angle: Math.PI / 4 },
    { x: bounds.x + bounds.w, y: bounds.y, angle: (3 * Math.PI) / 4 },
    { x: bounds.x, y: bounds.y + bounds.h, angle: -Math.PI / 4 },
    { x: bounds.x + bounds.w, y: bounds.y + bounds.h, angle: (-3 * Math.PI) / 4 },
  ];
  const corner = corners[wave % corners.length];
  const skipSlot = Math.floor(phase / interval) % 5;
  const spread = Math.PI / 2.6;

  for (let i = 0; i < 5; i++) {
    if (i === skipSlot) continue;

    const ratio = i / 4;
    const angle = corner.angle - spread / 2 + spread * ratio;
    pool.spawn(corner.x, corner.y, Math.cos(angle) * 2.2 * speed, Math.sin(angle) * 2.2 * speed, {
      color: '#ffcc88',
      radius: 3,
    });
  }
}

export function pupRapid(pool, frame, bounds, speed = 1) {
  const cycle = 90;
  const activeWindow = 40;
  const interval = Math.max(12, Math.floor(24 / speed));
  const { phase, wave } = getWavePhase(frame, cycle);
  if (phase >= activeWindow || phase % interval !== 0) return;

  const columns = 6;
  const safeStart = wave % (columns - 1);
  const width = bounds.w / columns;

  for (let col = 0; col < columns; col++) {
    if (col === safeStart || col === safeStart + 1) continue;

    const x = bounds.x + width * col + width / 2;
    pool.spawn(x, bounds.y, 0, 2.05 * speed, {
      color: '#ffbb77',
      radius: 3,
    });
  }
}

// ========== SOI GAY ==========

export function leanSlice(pool, frame, bounds, speed = 1) {
  if (frame % Math.max(12, Math.floor(24 / speed)) !== 0) return;

  const row = Math.floor(frame / Math.max(12, Math.floor(24 / speed))) % 4;
  const startY = bounds.y + bounds.h * (0.15 + row * 0.17);
  pool.spawn(bounds.x, startY, 2.2 * speed, 1.2 * speed, {
    color: '#8B7355',
    radius: 4,
  });
  pool.spawn(bounds.x + bounds.w, startY + 22, -2.2 * speed, 1.2 * speed, {
    color: '#8B7355',
    radius: 4,
  });
}

export function leanFade(pool, frame, bounds, speed = 1) {
  if (frame % Math.max(18, Math.floor(34 / speed)) !== 0) return;

  const cx = bounds.x + bounds.w / 2 + Math.sin(frame * 0.06) * bounds.w * 0.18;
  const cy = bounds.y + bounds.h / 2 + Math.cos(frame * 0.05) * bounds.h * 0.14;
  const count = 6;
  const gapIndex = Math.floor(frame / Math.max(18, Math.floor(34 / speed))) % count;

  for (let i = 0; i < count; i++) {
    if (i === gapIndex) continue;

    const angle = (Math.PI * 2 * i) / count;
    pool.spawn(cx, cy, Math.cos(angle) * 1.15 * speed, Math.sin(angle) * 1.15 * speed, {
      color: '#9B8B6B',
      radius: 5,
    });
  }
}

export function leanTrap(pool, frame, bounds, speed = 1) {
  if (frame % Math.max(18, Math.floor(42 / speed)) !== 0) return;

  const columns = 7;
  const gapStart = Math.floor(frame / Math.max(18, Math.floor(42 / speed))) % (columns - 1);
  const gap = bounds.w / columns;

  for (let i = 0; i < columns; i++) {
    if (i === gapStart || i === gapStart + 1) continue;

    pool.spawn(bounds.x + gap * i + gap / 2, bounds.y, 0, 1.45 * speed, {
      color: '#7B6B4B',
      radius: 5,
    });
  }
}

export function alphaWalls(pool, frame, bounds, speed = 1) {
  if (frame % 65 !== 0) return;
  const gap = Math.floor(frame / 65) % 5;
  for (let i = 0; i < 7; i++) if (i !== gap && i !== gap + 1) pool.spawn(bounds.x + (i + 0.5) * bounds.w / 7, bounds.y, 0, 1.5 * speed, { radius: 8, color: '#d9b06f' });
}
export function alphaRings(pool, frame, bounds, speed = 1) {
  if (frame % 85 !== 0) return;
  for (let i = 0; i < 12; i++) {
    if (i === Math.floor(frame / 85) % 12 || i === (Math.floor(frame / 85) + 1) % 12) continue;
    const angle = i / 12 * Math.PI * 2;
    pool.spawn(bounds.x + bounds.w / 2, bounds.y + bounds.h / 2, Math.cos(angle) * 1.8 * speed, Math.sin(angle) * 1.8 * speed, { radius: 7, color: '#bda36c' });
  }
}
export function alphaMarch(pool, frame, bounds, speed = 1) {
  if (frame % 70 !== 0) return;
  const gap = Math.floor(frame / 70) % 5;
  for (let i = 0; i < 7; i++) if (i !== gap && i !== gap + 1) pool.spawn(frame % 140 ? bounds.x : bounds.x + bounds.w, bounds.y + (i + 0.5) * bounds.h / 7, (frame % 140 ? 1 : -1) * speed, 0, { radius: 9, color: '#e0b68c' });
}
export function whitePulse(pool, frame, bounds, speed = 1) { normalRain(pool, frame, bounds, speed * 0.85); }
export function whiteCross(pool, frame, bounds, speed = 1) { normalWave(pool, frame, bounds, speed * 0.9); }
export function whiteVeil(pool, frame, bounds, speed = 1) { leanTrap(pool, frame, bounds, speed * 0.85); }

export const PATTERN_REGISTRY = {
  alphaWalls, alphaRings, alphaMarch, whitePulse, whiteCross, whiteVeil,
  normalRain,
  normalSpiral,
  normalWave,
  rabidChaos,
  rabidBurst,
  rabidZigzag,
  pupDash,
  pupScatter,
  pupRapid,
  leanSlice,
  leanFade,
  leanTrap,
};

export function getRandomPattern(patternPool) {
  const name = patternPool[Math.floor(Math.random() * patternPool.length)];
  return PATTERN_REGISTRY[name] || normalRain;
}
