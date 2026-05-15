/* ============================================================
 * CombatEngine.js — Canvas Combat Loop
 * 
 * Chạy requestAnimationFrame, TÁCH BIỆT khỏi React render.
 * Giao tiếp với React qua:
 * - useRef (dữ liệu mutable)
 * - throttled callbacks (dispatch actions)
 * ============================================================ */

import { BulletPool } from './BulletPool.js';
import { PlayerHeart } from './PlayerHeart.js';
import { getRandomPattern } from './patterns/AttackPatterns.js';
import { BATTLE_BOX, CANVAS_WIDTH, CANVAS_HEIGHT } from '../data/constants.js';

export class CombatEngine {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} wolf - Wolf data (from state.activeCombatWolf)
   * @param {function} onDamage - Callback khi player bị trúng (throttled by caller)
   * @param {function} onPatternEnd - Callback khi pattern kết thúc (player's turn)
   */
  constructor(canvas, wolf, onDamage, onPatternEnd) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.wolf = wolf;

    this.onDamage = onDamage;
    this.onPatternEnd = onPatternEnd;

    // Core objects
    this.bulletPool = new BulletPool(200);
    this.heart = new PlayerHeart(BATTLE_BOX);

    // Pattern
    this.currentPattern = getRandomPattern(wolf.patternPool);
    this.frame = 0;
    this.patternDuration = 300; // ~5 giây ở 60fps
    this.isEnemyTurn = true;

    // Loop control
    this.running = false;
    this.animFrameId = null;
    this.lastTime = 0;

    // Damage throttle (100ms)
    this._lastDamageDispatch = 0;
    this._pendingDamage = 0;

    // Bind keyboard handlers
    this._onKeyDown = (e) => this.heart.handleKeyDown(e);
    this._onKeyUp = (e) => this.heart.handleKeyUp(e);
  }

  /**
   * Bắt đầu combat loop
   */
  start() {
    this.running = true;
    this.lastTime = performance.now();

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);

    this._loop(performance.now());
  }

  /**
   * Dừng combat loop (gọi khi unmount hoặc combat kết thúc)
   */
  stop() {
    this.running = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
  }

  /**
   * Main game loop
   */
  _loop(now) {
    if (!this.running) return;

    const dt = Math.min(now - this.lastTime, 33); // Cap tại ~30fps min
    this.lastTime = now;

    this._update(dt);
    this._draw();

    this.animFrameId = requestAnimationFrame((t) => this._loop(t));
  }

  /**
   * Update logic
   */
  _update(dt) {
    if (!this.isEnemyTurn) return;

    this.frame++;

    // Spawn bullets theo pattern
    this.currentPattern(this.bulletPool, this.frame, BATTLE_BOX, this.wolf.speed);

    // Update bullets
    this.bulletPool.update(dt, BATTLE_BOX);

    // Update player heart
    this.heart.update(dt);

    // Collision detection
    const hits = this.bulletPool.checkCollision(this.heart);
    if (hits.length > 0) {
      const totalDmg = hits.reduce((sum, b) => sum + this.wolf.damage, 0);
      this._pendingDamage += totalDmg;

      // Throttle dispatch: tối đa 100ms/lần
      const now = performance.now();
      if (now - this._lastDamageDispatch >= 100) {
        this.onDamage(this._pendingDamage, hits.some(b => b.type === 'bleed'));
        this._pendingDamage = 0;
        this._lastDamageDispatch = now;
      }
    }

    // Kết thúc pattern → chuyển sang lượt player
    if (this.frame >= this.patternDuration) {
      this.isEnemyTurn = false;
      this.bulletPool.clear();
      this.heart.reset();
      // Flush remaining damage
      if (this._pendingDamage > 0) {
        this.onDamage(this._pendingDamage, false);
        this._pendingDamage = 0;
      }
      this.onPatternEnd();
    }
  }

  /**
   * Render frame
   */
  _draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Battle box border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(BATTLE_BOX.x, BATTLE_BOX.y, BATTLE_BOX.w, BATTLE_BOX.h);

    if (this.isEnemyTurn) {
      // Draw bullets
      this.bulletPool.draw(ctx);

      // Draw player heart
      this.heart.draw(ctx);

      // Turn indicator
      ctx.fillStyle = '#ff6b6b';
      ctx.font = '14px "VT323", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Sói đang tấn công!`, CANVAS_WIDTH / 2, BATTLE_BOX.y - 10);
    } else {
      // Player's turn — hiển thị thông báo
      ctx.fillStyle = '#4dabf7';
      ctx.font = '18px "VT323", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Lượt của bạn!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    }

    // Wolf info (góc trên)
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px "Inter", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${this.wolf.name}`, 10, 20);
    ctx.fillText(`HP: ${this.wolf.hp}`, 10, 38);
  }

  /**
   * Bắt đầu lượt sói mới (sau khi player tấn công)
   */
  startEnemyTurn() {
    this.isEnemyTurn = true;
    this.frame = 0;
    // Chọn pattern mới ngẫu nhiên
    this.currentPattern = getRandomPattern(this.wolf.patternPool);
    this.heart.reset();
    this.bulletPool.clear();
  }

  /**
   * Cập nhật wolf data (khi HP thay đổi từ React side)
   */
  updateWolf(wolf) {
    this.wolf = wolf;
  }
}
