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
    this.accumulator = 0;

    this._lastDamageDispatch = 0;
    this._pendingDamage = 0;
    this._pendingBleed = false;
    this._hitCooldownMs = 0;

    this._onKeyDown = (e) => { if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) e.preventDefault(); this.heart.handleKeyDown(e); };
    this._onKeyUp = (e) => this.heart.handleKeyUp(e);
    this._onBlur = () => { this.heart.keys = { up: false, down: false, left: false, right: false }; };
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
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
    window.removeEventListener('blur', this._onBlur);
  }

  _loop(now) {
    if (!this.running) return;

    const dt = Math.min(now - this.lastTime, 100);
    this.lastTime = now;
    if (document.hidden) { this.accumulator = 0; this.animFrameId = requestAnimationFrame(time => this._loop(time)); return; }
    this.accumulator += dt;
    while (this.accumulator >= 1000 / 60) { this._update(1000 / 60); this.accumulator -= 1000 / 60; }
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
      this._hitCooldownMs = 600;

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
      if (this.wolf.specialMechanic === 'whiteout' && this.frame > 70) {
        const pulse = (Math.sin((this.frame - 70) / 48) + 1) / 2;
        const radius = 25 + pulse * BATTLE_BOX.w * 0.8;
        const cx = BATTLE_BOX.x + BATTLE_BOX.w / 2, cy = BATTLE_BOX.y + BATTLE_BOX.h / 2;
        const fog = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        fog.addColorStop(0, 'rgba(245,248,240,0.97)'); fog.addColorStop(0.65, 'rgba(245,248,240,0.82)'); fog.addColorStop(1, 'rgba(245,248,240,0)');
        ctx.save(); ctx.beginPath(); ctx.rect(BATTLE_BOX.x, BATTLE_BOX.y, BATTLE_BOX.w, BATTLE_BOX.h); ctx.clip(); ctx.fillStyle = fog; ctx.fillRect(BATTLE_BOX.x, BATTLE_BOX.y, BATTLE_BOX.w, BATTLE_BOX.h); ctx.restore();
      }
      ctx.fillStyle = '#ff6b6b';
      ctx.font = '14px "VT323", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('NÉ ĐẠN — WASD / MŨI TÊN', CANVAS_WIDTH / 2, BATTLE_BOX.y - 10);
    } else {
      ctx.fillStyle = '#4dabf7';
      ctx.font = '18px "VT323", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('LƯỢT CỦA BẠN', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
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
