/* ============================================================
 * patterns/ — Wolf Attack Patterns
 * 
 * Mỗi pattern là 1 function(pool, frame, bounds, speed)
 * - pool: BulletPool instance
 * - frame: frame counter (reset mỗi turn)
 * - bounds: battle box { x, y, w, h }
 * - speed: wolf speed multiplier (evolution scaling)
 * ============================================================ */

// ========== SÓI BÌNH THƯỜNG ==========

/** Mưa đạn từ trên xuống, random X */
export function normalRain(pool, frame, bounds, speed = 1) {
  if (frame % Math.max(5, Math.floor(18 / speed)) === 0) {
    const count = 2 + Math.floor(speed);
    for (let i = 0; i < count; i++) {
      const x = bounds.x + Math.random() * bounds.w;
      pool.spawn(x, bounds.y, (Math.random() - 0.5) * 0.5, 1.5 * speed, {
        color: '#aaaaaa',
      });
    }
  }
}

/** Xoáy ốc từ trung tâm */
export function normalSpiral(pool, frame, bounds, speed = 1) {
  if (frame % Math.max(3, Math.floor(8 / speed)) === 0) {
    const cx = bounds.x + bounds.w / 2;
    const cy = bounds.y + bounds.h / 2;
    const angle = (frame * 0.12 * speed) % (Math.PI * 2);
    pool.spawn(cx, cy,
      Math.cos(angle) * 2 * speed,
      Math.sin(angle) * 2 * speed,
      { color: '#cccccc' }
    );
  }
}

/** Sóng ngang từ trái sang phải */
export function normalWave(pool, frame, bounds, speed = 1) {
  if (frame % Math.max(8, Math.floor(25 / speed)) === 0) {
    const rows = 3;
    for (let i = 0; i < rows; i++) {
      const y = bounds.y + (bounds.h / (rows + 1)) * (i + 1) + Math.sin(frame * 0.1) * 20;
      pool.spawn(bounds.x, y, 2 * speed, 0, { color: '#bbbbbb' });
    }
  }
}

// ========== SÓI DẠI (Chaotic patterns) ==========

/** Đạn bắn tứ phía, random hướng - loạn xạ */
export function rabidChaos(pool, frame, bounds, speed = 1) {
  if (frame % Math.max(3, Math.floor(6 / speed)) === 0) {
    const edges = ['top', 'bottom', 'left', 'right'];
    const edge = edges[Math.floor(Math.random() * 4)];
    let x, y, vx, vy;

    switch (edge) {
      case 'top':
        x = bounds.x + Math.random() * bounds.w;
        y = bounds.y;
        vx = (Math.random() - 0.5) * 2;
        vy = 1.5 + Math.random();
        break;
      case 'bottom':
        x = bounds.x + Math.random() * bounds.w;
        y = bounds.y + bounds.h;
        vx = (Math.random() - 0.5) * 2;
        vy = -(1.5 + Math.random());
        break;
      case 'left':
        x = bounds.x;
        y = bounds.y + Math.random() * bounds.h;
        vx = 1.5 + Math.random();
        vy = (Math.random() - 0.5) * 2;
        break;
      default:
        x = bounds.x + bounds.w;
        y = bounds.y + Math.random() * bounds.h;
        vx = -(1.5 + Math.random());
        vy = (Math.random() - 0.5) * 2;
    }

    pool.spawn(x, y, vx * speed, vy * speed, {
      color: '#ff4444', type: 'bleed', radius: 5,
    });
  }
}

/** Burst nổ ra từ trung tâm */
export function rabidBurst(pool, frame, bounds, speed = 1) {
  if (frame % Math.max(20, Math.floor(40 / speed)) === 0) {
    const cx = bounds.x + bounds.w / 2;
    const cy = bounds.y + bounds.h / 2;
    const count = 8 + Math.floor(speed * 2);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i;
      pool.spawn(cx, cy,
        Math.cos(angle) * 1.8 * speed,
        Math.sin(angle) * 1.8 * speed,
        { color: '#ff6666', type: 'bleed' }
      );
    }
  }
}

/** Zigzag - đạn nảy tường */
export function rabidZigzag(pool, frame, bounds, speed = 1) {
  if (frame % Math.max(10, Math.floor(20 / speed)) === 0) {
    const y = bounds.y + Math.random() * bounds.h;
    pool.spawn(bounds.x, y, 2.5 * speed, (Math.random() - 0.5) * 3, {
      color: '#ff3333', type: 'bleed', radius: 5,
    });
  }
}

// ========== SÓI CON (Fast, small bullets) ==========

/** Nhiều đạn nhỏ lao nhanh */
export function pupDash(pool, frame, bounds, speed = 1) {
  if (frame % Math.max(2, Math.floor(4 / speed)) === 0) {
    const x = bounds.x + Math.random() * bounds.w;
    pool.spawn(x, bounds.y, 0, 3 * speed, {
      color: '#ffaa66', radius: 3,
    });
  }
}

/** Scatter - bắn tán xạ từ 1 góc */
export function pupScatter(pool, frame, bounds, speed = 1) {
  if (frame % Math.max(12, Math.floor(20 / speed)) === 0) {
    const corners = [
      { x: bounds.x, y: bounds.y },
      { x: bounds.x + bounds.w, y: bounds.y },
      { x: bounds.x, y: bounds.y + bounds.h },
      { x: bounds.x + bounds.w, y: bounds.y + bounds.h },
    ];
    const corner = corners[Math.floor(Math.random() * 4)];
    const count = 5;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      pool.spawn(corner.x, corner.y,
        Math.cos(angle) * 2.5 * speed,
        Math.sin(angle) * 2.5 * speed,
        { color: '#ffcc88', radius: 3 }
      );
    }
  }
}

/** Rapid fire - bắn liên tục từ trên */
export function pupRapid(pool, frame, bounds, speed = 1) {
  if (frame % Math.max(2, Math.floor(3 / speed)) === 0) {
    const columns = 5;
    const col = Math.floor(Math.random() * columns);
    const x = bounds.x + (bounds.w / columns) * col + (bounds.w / columns / 2);
    pool.spawn(x, bounds.y, 0, 2.5 * speed, {
      color: '#ffbb77', radius: 3,
    });
  }
}

// ========== SÓI GẦY (Tricky patterns) ==========

/** Đạn bay chéo cắt ngang */
export function leanSlice(pool, frame, bounds, speed = 1) {
  if (frame % Math.max(6, Math.floor(12 / speed)) === 0) {
    // Cắt từ trái-trên sang phải-dưới
    const startX = bounds.x;
    const startY = bounds.y + Math.random() * bounds.h * 0.5;
    pool.spawn(startX, startY, 2.5 * speed, 1.5 * speed, {
      color: '#8B7355', radius: 4,
    });
    // Cắt ngược
    pool.spawn(bounds.x + bounds.w, startY, -2.5 * speed, 1.5 * speed, {
      color: '#8B7355', radius: 4,
    });
  }
}

/** Fade - đạn xuất hiện rồi biến mất, gây khó đoán */
export function leanFade(pool, frame, bounds, speed = 1) {
  if (frame % Math.max(8, Math.floor(15 / speed)) === 0) {
    const cx = bounds.x + bounds.w / 2 + (Math.random() - 0.5) * bounds.w * 0.6;
    const cy = bounds.y + bounds.h / 2 + (Math.random() - 0.5) * bounds.h * 0.6;
    const count = 4;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
      pool.spawn(cx, cy,
        Math.cos(angle) * 1.2 * speed,
        Math.sin(angle) * 1.2 * speed,
        { color: '#9B8B6B', radius: 5 }
      );
    }
  }
}

/** Trap - đạn tạo hàng rào bẫy */
export function leanTrap(pool, frame, bounds, speed = 1) {
  if (frame % Math.max(15, Math.floor(30 / speed)) === 0) {
    // Hàng ngang từ trái
    const y = bounds.y + Math.random() * bounds.h;
    const count = 6;
    const gap = bounds.w / count;
    const skipIdx = Math.floor(Math.random() * count); // 1 lỗ để thoát
    for (let i = 0; i < count; i++) {
      if (i === skipIdx) continue;
      pool.spawn(bounds.x + gap * i + gap / 2, bounds.y,
        0, 1.5 * speed,
        { color: '#7B6B4B', radius: 5 }
      );
    }
  }
}

// ========== PATTERN REGISTRY ==========

export const PATTERN_REGISTRY = {
  normalRain, normalSpiral, normalWave,
  rabidChaos, rabidBurst, rabidZigzag,
  pupDash, pupScatter, pupRapid,
  leanSlice, leanFade, leanTrap,
};

/**
 * Lấy random pattern từ pool của sói
 * @param {string[]} patternPool - Tên các pattern
 * @returns {Function}
 */
export function getRandomPattern(patternPool) {
  const name = patternPool[Math.floor(Math.random() * patternPool.length)];
  return PATTERN_REGISTRY[name] || normalRain;
}
