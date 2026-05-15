/* ============================================================
 * BulletPool.js — Object Pool cho đạn (Bullet Hell)
 * 
 * Pre-allocate ~200 bullet objects, toggle active flag.
 * Tránh GC stutter khi spawn/destroy hàng trăm đạn.
 * ============================================================ */

export class BulletPool {
  constructor(size = 200) {
    this.pool = [];
    for (let i = 0; i < size; i++) {
      this.pool.push({
        active: false,
        x: 0, y: 0,
        vx: 0, vy: 0,
        radius: 4,
        color: '#ffffff',
        type: 'normal', // 'normal' | 'bleed' | 'homing'
        lifetime: 0,
      });
    }
  }

  /**
   * Spawn 1 bullet từ pool
   * @returns {object|null} Bullet object hoặc null nếu pool đầy
   */
  spawn(x, y, vx, vy, opts = {}) {
    const bullet = this.pool.find(b => !b.active);
    if (!bullet) return null; // Pool đầy

    bullet.active = true;
    bullet.x = x;
    bullet.y = y;
    bullet.vx = vx;
    bullet.vy = vy;
    bullet.radius = opts.radius || 4;
    bullet.color = opts.color || '#ffffff';
    bullet.type = opts.type || 'normal';
    bullet.lifetime = 0;
    return bullet;
  }

  /**
   * Update tất cả bullet active
   * @param {number} dt - Delta time (ms)
   * @param {{ x, y, w, h }} bounds - Battle box bounds
   */
  update(dt, bounds) {
    const dtSec = dt / 16.67; // Normalize to ~60fps
    for (const b of this.pool) {
      if (!b.active) continue;

      b.x += b.vx * dtSec;
      b.y += b.vy * dtSec;
      b.lifetime++;

      // Deactivate nếu ra ngoài bounds (+ margin)
      const margin = 20;
      if (
        b.x < bounds.x - margin ||
        b.x > bounds.x + bounds.w + margin ||
        b.y < bounds.y - margin ||
        b.y > bounds.y + bounds.h + margin
      ) {
        b.active = false;
      }
    }
  }

  /**
   * Vẽ tất cả bullet active lên Canvas
   */
  draw(ctx) {
    for (const b of this.pool) {
      if (!b.active) continue;

      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.fill();

      // Glow effect
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  /**
   * Kiểm tra va chạm với player heart (circle collision)
   * @param {{ x, y, size }} heart - Player heart hitbox
   * @returns {Array} Bullets đã va chạm
   */
  checkCollision(heart) {
    const hits = [];
    const heartR = heart.size / 2;

    for (const b of this.pool) {
      if (!b.active) continue;

      const dx = b.x - heart.x;
      const dy = b.y - heart.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < heartR + b.radius) {
        hits.push(b);
        b.active = false; // Bullet biến mất khi trúng
      }
    }
    return hits;
  }

  /**
   * Deactivate tất cả bullets
   */
  clear() {
    for (const b of this.pool) {
      b.active = false;
    }
  }

  /**
   * Đếm số bullet đang active
   */
  get activeCount() {
    return this.pool.filter(b => b.active).length;
  }
}
