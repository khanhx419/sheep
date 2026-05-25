/* ============================================================
 * CombatEngine.js - Canvas Combat Loop
 * ============================================================ */

import { BulletPool } from './BulletPool.js';
import { PlayerHeart } from './PlayerHeart.js';
import { getRandomPattern } from './patterns/AttackPatterns.js';
import { BATTLE_BOX, CANVAS_WIDTH, CANVAS_HEIGHT } from '../data/constants.js';

export class CombatEngine {
  constructor(canvas, wolf, onDamage, onPatternEnd) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.wolf = wolf;
    this.onDamage = onDamage;
    this.onPatternEnd = onPatternEnd;

    this.bulletPool = new BulletPool(200);
    this.heart = new PlayerHeart(BATTLE_BOX);

    this.currentPattern = getRandomPattern(wolf.patternPool);
    this.frame = 0;
    this.patternDuration = 360;
    this.startDelayFrames = 24;
    this.isEnemyTurn = true;

    this.running = false;
    this.animFrameId = null;
    this.lastTime = 0;

    this._lastDamageDispatch = 0;
    this._pendingDamage = 0;
    this._pendingBleed = false;
    this._hitCooldownMs = 0;

    this._onKeyDown = (e) => this.heart.handleKeyDown(e);
    this._onKeyUp = (e) => this.heart.handleKeyUp(e);
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    this._loop(performance.now());
  }

  stop() {
    this.running = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
  }

  _loop(now) {
    if (!this.running) return;

    const dt = Math.min(now - this.lastTime, 33);
    this.lastTime = now;

    this._update(dt);
    this._draw();

    this.animFrameId = requestAnimationFrame((time) => this._loop(time));
  }

  _update(dt) {
    if (!this.isEnemyTurn) return;

    this.frame += 1;
    this._hitCooldownMs = Math.max(0, this._hitCooldownMs - dt);
    const attackFrame = this.frame - this.startDelayFrames;

    if (attackFrame > 0) {
      this.currentPattern(this.bulletPool, attackFrame, BATTLE_BOX, this.wolf.speed);
    }

    this.bulletPool.update(dt, BATTLE_BOX);
    this.heart.update(dt);

    const hits = this.bulletPool.checkCollision(this.heart);
    if (hits.length > 0 && this._hitCooldownMs <= 0) {
      this._pendingDamage += this.wolf.damage;
      this._pendingBleed = this._pendingBleed || hits.some((bullet) => bullet.type === 'bleed');
      this._hitCooldownMs = 220;

      const now = performance.now();
      if (now - this._lastDamageDispatch >= 100) {
        this.onDamage(this._pendingDamage, this._pendingBleed);
        this._pendingDamage = 0;
        this._pendingBleed = false;
        this._lastDamageDispatch = now;
      }
    }

    if (attackFrame >= this.patternDuration) {
      this.isEnemyTurn = false;
      this.bulletPool.clear();
      this.heart.reset();
      if (this._pendingDamage > 0) {
        this.onDamage(this._pendingDamage, this._pendingBleed);
        this._pendingDamage = 0;
        this._pendingBleed = false;
      }
      this.onPatternEnd();
    }
  }

  _draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(BATTLE_BOX.x, BATTLE_BOX.y, BATTLE_BOX.w, BATTLE_BOX.h);

    if (this.isEnemyTurn) {
      this.bulletPool.draw(ctx);
      this.heart.draw(ctx);
      ctx.fillStyle = '#ff6b6b';
      ctx.font = '14px "VT323", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Soi dang tan cong!', CANVAS_WIDTH / 2, BATTLE_BOX.y - 10);
    } else {
      ctx.fillStyle = '#4dabf7';
      ctx.font = '18px "VT323", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Luot cua ban!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = '12px "Inter", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${this.wolf.name}`, 10, 20);
    ctx.fillText(`HP: ${this.wolf.hp}`, 10, 38);
  }

  startEnemyTurn() {
    this.isEnemyTurn = true;
    this.frame = 0;
    this._pendingDamage = 0;
    this._pendingBleed = false;
    this._hitCooldownMs = 0;
    this.currentPattern = getRandomPattern(this.wolf.patternPool);
    this.heart.reset();
    this.bulletPool.clear();
  }

  updateWolf(wolf) {
    this.wolf = wolf;
  }
}
