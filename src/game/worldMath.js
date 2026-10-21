export const WORLD_LIMIT = 23;
export const PLAYER_RADIUS = 0.32;
export function gameKey(event) {
  if (/^Key[A-Z]$/.test(event.code || '') || /^(Arrow|Shift|Escape)/.test(event.code || '')) return event.code;
  if (/^[a-z]$/i.test(event.key || '')) return `Key${event.key.toUpperCase()}`;
  return event.key === ' ' ? 'Space' : event.key;
}
// Rectangles shared by visible architecture and movement collision.
export const WALLS = [
  { x: -8, z: -1, w: 0.35, d: 18 },
  { x: 8, z: -1, w: 0.35, d: 18 },
  { x: 0, z: -10, w: 16, d: 0.35 },
  { x: -5.7, z: 8, w: 4.6, d: 0.35 },
  { x: 5.7, z: 8, w: 4.6, d: 0.35 },
  { x: -6.3, z: 12, w: 2.7, d: 2.3 },
  { x: 6.3, z: 12, w: 2.7, d: 2.3 },
];
export const SLOTS = [[-3.8, 2.5], [0, 1.8], [3.8, 2.5], [-3.8, -2], [0, -2.8], [3.8, -2], [-3.5, -6.6], [0, -6.8], [3.5, -6.6], [0, 5]];
export const DIVIDER_WALLS = [{ x: 0, z: -3.2, w: 0.15, d: 13.4 }, { x: 0, z: 7.4, w: 0.15, d: 1.2 }];
export function residentSlot(index, penId, divided, total = 10) {
  if (divided) {
    const col = index % 3, row = Math.floor(index / 3), x = (penId === 0 ? -1 : 1) * [1.3, 3.6, 5.9][col];
    return [x, 5.4 - row * 2.6];
  }
  if (total > 10) return [[-5.8, -2.9, 0, 2.9, 5.8][index % 5], 5.3 - Math.floor(index / 5) * 3];
  if (index < SLOTS.length) return SLOTS[index];
  const i = index - 10; return [[-5, -1.5, 1.5, 5][i % 4], 5.5 - Math.floor(i / 4) * 2.7];
}
export function safeSpawn(obstacles) {
  for (const [x, z] of [[0, 5.5], [0, 7.2], [-1.1, 6.1], [1.1, 6.1], [-2, 9.5], [2, 9.5]]) if (canStand(x, z, obstacles)) return { x, z };
  return { x: 0, z: 10 };
}
export function canStand(x, z, obstacles = WALLS) {
  if (Math.abs(x) > WORLD_LIMIT - PLAYER_RADIUS || Math.abs(z) > WORLD_LIMIT - PLAYER_RADIUS) return false;
  return !obstacles.some(o => {
    const closestX = Math.max(o.x - o.w / 2, Math.min(x, o.x + o.w / 2));
    const closestZ = Math.max(o.z - o.d / 2, Math.min(z, o.z + o.d / 2));
    return Math.hypot(x - closestX, z - closestZ) < PLAYER_RADIUS;
  });
}
export function movePlayer(position, dx, dz, obstacles = WALLS) {
  let { x, z } = position;
  // Substeps prevent tunnelling through walls after a slow frame.
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.12));
  for (let i = 0; i < steps; i++) {
    if (canStand(x + dx / steps, z, obstacles)) x += dx / steps;
    if (canStand(x, z + dz / steps, obstacles)) z += dz / steps;
  }
  return { x, z };
}
export function movementVector(forward, strafe, yaw, distance) {
  const length = Math.hypot(forward, strafe) || 1;
  return { x: (Math.cos(yaw) * strafe - Math.sin(yaw) * forward) / length * distance,
    z: (-Math.sin(yaw) * strafe - Math.cos(yaw) * forward) / length * distance };
}

export function hasLineOfSight(from, to, obstacles = WALLS) {
  const dx = to.x - from.x, dz = to.z - from.z;
  return !obstacles.some(o => {
    let lo = 0, hi = 1;
    for (const [origin, delta, min, max] of [[from.x, dx, o.x - o.w / 2, o.x + o.w / 2], [from.z, dz, o.z - o.d / 2, o.z + o.d / 2]]) {
      if (Math.abs(delta) < 1e-8) { if (origin < min || origin > max) return false; }
      else { const a = (min - origin) / delta, b = (max - origin) / delta; lo = Math.max(lo, Math.min(a, b)); hi = Math.min(hi, Math.max(a, b)); }
      if (lo > hi) return false;
    }
    return hi > 0.02 && lo < 0.98;
  });
}

// A generous body-sized aiming cone avoids pixel-perfect raycasts missing the
// sheep when the player stands close and the reticle passes above its head.
export function interactionTarget(position, direction, candidates, obstacles = WALLS) {
  let best = null, bestScore = Infinity;
  const forwardLength = Math.hypot(direction.x, direction.z) || 1;
  for (const candidate of candidates) {
    const dx = candidate.position.x - position.x, dz = candidate.position.z - position.z;
    const planar = Math.hypot(dx, dz);
    const dot = (dx * direction.x + dz * direction.z) / Math.max(0.001, planar * forwardLength);
    const surfaceDistance = Math.max(0, planar - 0.75);
    const targetPitch = Math.atan2((candidate.height || 1) - position.y, Math.max(0.01, planar));
    const viewPitch = Math.atan2(direction.y, forwardLength);
    if (surfaceDistance > 8 || dot < 0.9 || Math.abs(targetPitch - viewPitch) > 0.7 || !hasLineOfSight(position, candidate.position, obstacles)) continue;
    const score = (1 - dot) * 12 + surfaceDistance;
    if (score < bestScore) { bestScore = score; best = { animal: candidate.animal, distance: surfaceDistance }; }
  }
  return best;
}
