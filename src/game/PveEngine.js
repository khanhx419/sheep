export const DIFFICULTIES = { easy: { damage: .7, speed: .85 }, normal: { damage: 1, speed: 1 }, hard: { damage: 1.5, speed: 1.2 } };
export const ATTACK_RECOVERY = { tool: 1.05, gun: 1.45 };
export const DOG_ASSIST_INTERVAL = 7.5;
export function combatPressure(day = 1, seconds = 0) {
  return Math.min(1, Math.max(0, day - 1) / 15 * .7 + Math.min(1, Math.max(0, seconds) / 60) * .4);
}
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const arenaPoint = (x, z) => ({ x: Math.max(-5, Math.min(5, x)), z: Math.max(-3.8, Math.min(4.3, z)) });
export class PveEngine {
  constructor({ type = 'normal', day = 1, difficulty = 'normal', sheep = [], dog = false, gun = false, random = Math.random, onHit = () => {}, onAttack = () => {}, onSheepHit = () => {}, onDogHit = () => {}, onCycle = () => {}, onBombHit = () => {} } = {}) {
    Object.assign(this, { type, day, sheep, dog, gun, random, onHit, onAttack, onSheepHit, onDogHit, onCycle, onBombHit });
    this.rules = DIFFICULTIES[difficulty]; this.keys = new Set(); this.player = { x: 0, z: 2.5 }; this.wolf = { x: 0, z: -1 };
    this.time = 0; this.stage = 'wait'; this.timer = .9; this.effects = []; this.stamina = 100;
    this.attackAt = -10; this.attackReadyAt = 0; this.dodgeAt = -10; this.blockAt = -10; this.counterUntil = 0; this.invulnerableUntil = 0; this.dogAt = -10; this.dogAttackSeen = -10;
    this.pressure = combatPressure(day); this.projectileSpeed = 5.5;
    this.previous = ''; this.label = 'Sói đang tìm sơ hở'; this.hitIds = new Set();
    this.stageDuration = .9; this.castCount = 0; this.dashMotion = null;
    this.speedMultiplier = 1; this.charmReadyAt = 0; this.bomb = null; this.bombExplosion = null; this.blinkEffect = null;
  }
  castCharm(kind, id) {
    if (!['bombCharm', 'blinkCharm'].includes(kind) || this.time < this.charmReadyAt || kind === 'bombCharm' && this.bomb) return false;
    if (kind === 'bombCharm') this.bomb = { id, from: { ...this.player }, castAt: this.time };
    else {
      let dx = Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
      let dz = Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')) - Number(this.keys.has('KeyW') || this.keys.has('ArrowUp'));
      if (!dx && !dz) { dx = this.player.x - this.wolf.x; dz = this.player.z - this.wolf.z; }
      const heading = Math.atan2(dz || (!dx ? 1 : 0), dx), candidates = [];
      for (const offset of [0, .65, -.65, 1.3, -1.3, Math.PI]) {
        const p = arenaPoint(this.player.x + Math.cos(heading + offset) * 3.2, this.player.z + Math.sin(heading + offset) * 3.2);
        if (distance(p, this.player) >= 1) candidates.push(p);
      }
      const target = candidates.find(p => this.effects.every(effect => !this.overlaps(p, effect)) && distance(p, this.wolf) > 1.5) || candidates[0];
      if (!target) return false;
      this.blinkEffect = { from: { ...this.player }, to: target, at: this.time }; this.player = target;
      this.invulnerableUntil = Math.max(this.invulnerableUntil, this.time + .4);
    }
    this.charmReadyAt = this.time + 1; return true;
  }
  press(code) {
    if (code === 'Space' && this.time - this.dodgeAt > 1 && this.stamina >= 24) {
      this.dodgeAt = this.time; this.invulnerableUntil = this.time + .38; this.stamina -= 24;
      const x = Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA')), z = Number(this.keys.has('KeyS')) - Number(this.keys.has('KeyW'));
      const length = Math.hypot(x, z) || 1; this.player.x += x / length * 1.7; this.player.z += (z || (!x ? 1 : 0)) / length * 1.7;
    }
    if (code === 'KeyK' && !this.keys.has(code)) this.blockAt = this.time;
    if (code === 'KeyJ' && this.time >= this.attackReadyAt && (this.gun || distance(this.player, this.wolf) < 2.4)) {
      this.attackAt = this.time; this.attackReadyAt = this.time + ATTACK_RECOVERY[this.gun ? 'gun' : 'tool'];
      this.onAttack(this.counterUntil > this.time); this.counterUntil = 0;
    }
    this.keys.add(code);
  }
  release(code) { this.keys.delete(code); }
  // Reserve a reachable standing position clear for the entire next cast.
  // This includes projectile paths, not just their positions during windup.
  safeSpot(effects = this.effects) {
    const safe = p => effects.every(e => {
      if (!e.projectile && !e.line) return distance(p, e) > e.radius + .45;
      const length = e.projectile ? this.projectileSpeed * 1.4 : e.length;
      const along = Math.max(0, Math.min(length, (p.x - e.x) * e.dx + (p.z - e.z) * e.dz));
      return Math.hypot(p.x - e.x - along * e.dx, p.z - e.z - along * e.dz) > (e.projectile ? e.radius + .45 : e.width + .15);
    });
    if (safe(this.player)) return { ...this.player };
    const travel = 3.8 * Math.max(0, this.timer - .22);
    for (const fraction of [.5, .75, 1]) for (let i = 0; i < 32; i++) {
      const angle = i * Math.PI / 16;
      const point = arenaPoint(this.player.x + Math.sin(angle) * travel * fraction, this.player.z + Math.cos(angle) * travel * fraction);
      if (safe(point)) return point;
    }
    return null;
  }
  choose() {
    this.castCount++;
    const pools = { pup: ['dash', 'fan', 'dash', 'burst'], alpha: ['slam', 'rings', 'dash'], white: ['burst', 'rings', 'fan'], lean: ['dash', 'fan', 'slam'], rabid: ['burst', 'fan', 'dash', 'slam'] };
    const pool = (pools[this.type] || ['dash', 'slam', 'fan', 'burst']).filter(p => p !== this.previous);
    this.pattern = pool[Math.min(pool.length - 1, Math.floor(this.random() * pool.length))]; this.previous = this.pattern;
    this.pressure = combatPressure(this.day, this.time);
    this.projectileSpeed = Math.min(7, (5.5 + this.pressure) * this.rules.speed);
    this.hitIds.clear(); this.stage = 'windup';
    const speciesTempo = this.type === 'pup' ? 1.12 : this.type === 'alpha' ? .88 : 1;
    this.timer = Math.max(this.pattern === 'rings' ? 1.05 : .85, (1.05 + this.random() * .25 - this.pressure * .2) / (this.rules.speed * speciesTempo));
    this.stageDuration = this.timer;
    this.label = { dash: 'Lao tới', slam: 'Vồ chụp', fan: 'Vuốt gió', burst: 'Bẫy trăng', rings: 'Địa chấn' }[this.pattern];
    const p = { ...this.player };
    if (this.pattern === 'dash') {
      let dx = p.x - this.wolf.x, dz = p.z - this.wolf.z, length = Math.hypot(dx, dz);
      if (length < .05) { dx = p.x > 0 ? -1 : 1; dz = 0; length = 1; }
      const travel = Math.min(4.4, Math.max(0, length - 1.2)), end = arenaPoint(this.wolf.x + dx / length * travel, this.wolf.z + dz / length * travel);
      this.dashMotion = { from: { ...this.wolf }, to: end };
      this.effects = [{ x: this.wolf.x, z: this.wolf.z, dx: dx / length, dz: dz / length, length: Math.min(7, length + .6), width: .8, line: true }];
    } else if (this.pattern === 'fan') {
      const angle = Math.atan2(p.x - this.wolf.x, p.z - this.wolf.z);
      const count = this.pressure >= .7 ? 5 : this.pressure >= .35 ? 4 : 3;
      this.effects = Array.from({ length: count }, (_, i) => {
        const a = angle + (i - (count - 1) / 2) * .5;
        return { x: this.wolf.x, z: this.wolf.z, dx: Math.sin(a), dz: Math.cos(a), radius: .3, projectile: true };
      });
    } else {
      this.effects = [{ ...p, radius: this.pattern === 'rings' ? 2.3 : 1.35 }];
      if (this.pattern === 'burst') {
        const count = this.pressure >= .5 ? 3 : 2;
        for (let i = 1; i < count; i++) {
          const point = arenaPoint(p.x + (this.random() - .5) * 5, p.z + (this.random() - .5) * 5);
          if (this.effects.some(e => distance(e, point) < 1.3)) continue;
          const candidate = { ...point, radius: 1.15 };
          if (this.safeSpot([...this.effects, candidate])) this.effects.push(candidate);
        }
      }
    }
    while (!this.safeSpot() && this.effects.length > 1) this.effects.pop();
  }
  overlaps(p, e) {
    if (e.line) { const x = p.x - e.x, z = p.z - e.z, along = x * e.dx + z * e.dz; return along >= -.4 && along <= e.length && Math.abs(x * e.dz - z * e.dx) < e.width; }
    return distance(p, e) < e.radius + .3;
  }
  update(dt) {
    dt = Math.min(.05, Math.max(0, dt)); this.time += dt; this.timer -= dt;
    if (this.bomb && this.time - this.bomb.castAt >= .65) {
      const id = this.bomb.id; this.bomb = null; this.bombExplosion = { x: this.wolf.x, z: this.wolf.z, at: this.time }; this.onBombHit(id);
    }
    this.blocking = this.keys.has('KeyK') && this.stamina > 5;
    this.stamina = Math.max(0, Math.min(100, this.stamina + (this.blocking ? -15 : 20) * dt));
    const x = Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
    const z = Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')) - Number(this.keys.has('KeyW') || this.keys.has('ArrowUp'));
    const length = Math.hypot(x, z) || 1, speed = (this.blocking ? 1.6 : 3.8) * Math.max(1, Math.min(1.35, Number(this.speedMultiplier) || 1));
    this.player.x = Math.max(-5, Math.min(5, this.player.x + x / length * speed * dt));
    this.player.z = Math.max(-3.8, Math.min(4.3, this.player.z + z / length * speed * dt));
    if (this.stage === 'wait' && this.timer <= 0) this.choose();
    else if (this.stage === 'windup' && this.timer <= 0) { this.stage = 'strike'; this.timer = this.pattern === 'fan' ? 1.4 : .38; this.stageDuration = this.timer; }
    else if (this.stage === 'strike') {
      if (this.pattern === 'dash' && this.dashMotion) {
        const p = Math.min(1, Math.max(0, 1 - this.timer / this.stageDuration)), eased = p * p * (3 - 2 * p);
        const { from, to } = this.dashMotion;
        this.wolf = arenaPoint(from.x + (to.x - from.x) * eased, from.z + (to.z - from.z) * eased);
      }
      for (const e of this.effects) {
        if (e.projectile) { e.x += e.dx * dt * this.projectileSpeed; e.z += e.dz * dt * this.projectileSpeed; }
        if (this.overlaps(this.player, e) && !this.hitIds.has('player') && this.time >= this.invulnerableUntil) {
          this.hitIds.add('player'); const perfect = this.blocking && this.time - this.blockAt <= .22;
          const speciesDamage = this.type === 'pup' ? .5 : this.type === 'alpha' ? 1.5 : this.type === 'rabid' ? .8 : this.type === 'lean' ? 1.15 : 1;
          const evolution = 1 + Math.min(.35, Math.floor(Math.max(0, this.day - 1) / 3) * .05);
          this.onHit(perfect ? 0 : Math.ceil(14 * speciesDamage * evolution * this.rules.damage * (this.blocking ? .25 : 1)), this.type === 'rabid');
          if (perfect || this.blocking) this.counterUntil = this.time + 1.2;
        }
        for (const sheep of this.sheep) if (!this.hitIds.has(sheep.id) && this.overlaps(sheep, e)) { this.hitIds.add(sheep.id); this.onSheepHit(sheep.id); }
      }
      if (this.timer <= 0) { this.stage = 'recover'; this.timer = .9 - this.pressure * .15; this.stageDuration = this.timer; this.counterUntil = Math.max(this.counterUntil, this.time + this.timer); this.effects = []; this.dashMotion = null; }
    } else if (this.stage === 'recover' && this.timer <= 0) { this.stage = 'wait'; this.timer = Math.max(.4, (.75 + this.random() * .6 - this.pressure * .35) / this.rules.speed); this.stageDuration = this.timer; this.onCycle(); }
    if (this.dog && this.stage === 'recover' && this.time >= DOG_ASSIST_INTERVAL && this.time - this.dogAt >= DOG_ASSIST_INTERVAL && this.attackAt > this.dogAttackSeen && this.time - this.attackAt < 4 && distance(this.player, this.wolf) < 3.4) {
      this.dogAt = this.time; this.dogAttackSeen = this.attackAt; this.onDogHit();
    }
    if (this.stage === 'wait') {
      const dx = this.player.x - this.wolf.x, dz = this.player.z - this.wolf.z, len = Math.hypot(dx, dz);
      if (len > 1.8) { this.wolf.x += dx / len * dt * 1.2; this.wolf.z += dz / len * dt * 1.2; }
    }
  }
}
