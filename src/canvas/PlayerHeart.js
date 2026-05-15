/* ============================================================
 * PlayerHeart.js — Player entity trong combat (trái tim xanh)
 * Di chuyển bằng WASD hoặc Arrow keys trong battle box
 * ============================================================ */

import { HEART_SIZE, HEART_SPEED } from '../data/constants.js';

export class PlayerHeart {
  constructor(bounds) {
    this.bounds = bounds;
    this.size = HEART_SIZE;
    this.speed = HEART_SPEED;
    // Bắt đầu ở giữa battle box
    this.x = bounds.x + bounds.w / 2;
    this.y = bounds.y + bounds.h / 2;

    // Input state
    this.keys = { up: false, down: false, left: false, right: false };
  }

  /**
   * Xử lý keyboard input
   */
  handleKeyDown(e) {
    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W': this.keys.up = true; break;
      case 'ArrowDown': case 's': case 'S': this.keys.down = true; break;
      case 'ArrowLeft': case 'a': case 'A': this.keys.left = true; break;
      case 'ArrowRight': case 'd': case 'D': this.keys.right = true; break;
    }
  }

  handleKeyUp(e) {
    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W': this.keys.up = false; break;
      case 'ArrowDown': case 's': case 'S': this.keys.down = false; break;
      case 'ArrowLeft': case 'a': case 'A': this.keys.left = false; break;
      case 'ArrowRight': case 'd': case 'D': this.keys.right = false; break;
    }
  }

  /**
   * Update position, clamp trong battle box
   */
  update(dt) {
    const dtNorm = dt / 16.67;
    let dx = 0, dy = 0;
    if (this.keys.up) dy -= this.speed;
    if (this.keys.down) dy += this.speed;
    if (this.keys.left) dx -= this.speed;
    if (this.keys.right) dx += this.speed;

    // Diagonal normalization
    if (dx !== 0 && dy !== 0) {
      dx *= 0.707;
      dy *= 0.707;
    }

    this.x += dx * dtNorm;
    this.y += dy * dtNorm;

    // Clamp trong battle box
    const half = this.size / 2;
    this.x = Math.max(this.bounds.x + half, Math.min(this.bounds.x + this.bounds.w - half, this.x));
    this.y = Math.max(this.bounds.y + half, Math.min(this.bounds.y + this.bounds.h - half, this.y));
  }

  /**
   * Vẽ trái tim player (placeholder: hình tròn xanh dương)
   */
  draw(ctx) {
    // Outer glow
    ctx.shadowColor = '#4dabf7';
    ctx.shadowBlur = 10;

    // Vẽ trái tim đơn giản bằng hình học
    const x = this.x;
    const y = this.y;
    const s = this.size;

    ctx.fillStyle = '#4dabf7';
    ctx.beginPath();
    // Heart shape dùng bezier curves
    ctx.moveTo(x, y + s * 0.3);
    ctx.bezierCurveTo(x, y - s * 0.1, x - s * 0.5, y - s * 0.1, x - s * 0.5, y + s * 0.1);
    ctx.bezierCurveTo(x - s * 0.5, y + s * 0.35, x, y + s * 0.55, x, y + s * 0.6);
    ctx.bezierCurveTo(x, y + s * 0.55, x + s * 0.5, y + s * 0.35, x + s * 0.5, y + s * 0.1);
    ctx.bezierCurveTo(x + s * 0.5, y - s * 0.1, x, y - s * 0.1, x, y + s * 0.3);
    ctx.fill();

    ctx.shadowBlur = 0;
  }

  /**
   * Reset position về giữa battle box
   */
  reset() {
    this.x = this.bounds.x + this.bounds.w / 2;
    this.y = this.bounds.y + this.bounds.h / 2;
    this.keys = { up: false, down: false, left: false, right: false };
  }
}
