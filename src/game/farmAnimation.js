// Time is in seconds. Each pose is rebuilt from the rig's original transforms,
// so breathing and blinks never accumulate scale or change disguise details.
const restPoses = new WeakMap();
const TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const wrap = (value, period) => ((value % period) + period) % period;
const smooth = value => { const x = clamp(value, 0, 1); return x * x * (3 - 2 * x); };

function reset(part) {
  if (!part?.position || !part.rotation || !part.scale) return null;
  let rest = restPoses.get(part);
  if (!rest) {
    rest = {
      position: ['x', 'y', 'z'].map(axis => finite(part.position[axis])),
      rotation: ['x', 'y', 'z'].map(axis => finite(part.rotation[axis])),
      scale: ['x', 'y', 'z'].map(axis => finite(part.scale[axis], 1)),
    };
    restPoses.set(part, rest);
  }
  part.position.set(...rest.position);
  part.rotation.set(...rest.rotation);
  part.scale.set(...rest.scale);
  return part;
}

function event(time, period, duration) {
  const phase = wrap(time, period) / duration;
  return phase < 1 ? Math.sin(phase * Math.PI) ** 2 : 0;
}

function flick(time, period, duration) {
  const phase = wrap(time, period) / duration;
  return phase < 1 ? Math.sin(phase * Math.PI * 3) * Math.sin(phase * Math.PI) : 0;
}

function eyesPose(eyes, closure) {
  for (const eye of eyes || []) if (reset(eye)) eye.scale.y *= 1 - clamp(closure, 0, 1) * .9;
}

function playerGaze(model, playerPosition, maxDistance, limit) {
  if (![playerPosition?.x, playerPosition?.z, model?.position?.x, model?.position?.z].every(Number.isFinite)) return null;
  const dx = playerPosition.x - model.position.x, dz = playerPosition.z - model.position.z;
  if (Math.hypot(dx, dz) > maxDistance || Math.hypot(dx, dz) < .05) return null;
  const local = wrap(Math.atan2(dx, dz) - finite(model.rotation?.y) + Math.PI, TAU) - Math.PI;
  // Looking over the shoulder cannot twist a seated dog or sheep's head around.
  return { yaw: clamp(local, -limit, limit), front: Math.abs(local) < Math.PI * .65 };
}

export function animateFarmSheep(model, time, { night = false, rainy = false, grazing = false, selected = false, playerPosition = null } = {}) {
  if (!model?.userData) return { grazing: 0, blink: 0 };
  const rig = model.userData, t = finite(time), seed = finite(rig.index) * 1.713;
  const calm = selected ? .18 : night ? .55 : 1;
  const breathing = Math.sin(t * (night ? 1.6 : 2.1) + seed);
  const cycle = wrap(t + seed * 2.3, 18.5);
  const graze = grazing && !night && !rainy && !selected
    ? smooth(cycle / 1.25) * (1 - smooth((cycle - 11.8) / 1.6)) : 0;
  const shake = rainy && !selected ? flick(t + seed, 19.7, .65) : 0;
  const watch = selected ? null : playerGaze(model, playerPosition, 5.5, .42);
  const chewing = Math.sin(t * 7.3 + seed) * graze;

  if (reset(rig.wool)) {
    const breath = 1 + breathing * (selected ? .0018 : .004);
    rig.wool.scale.x *= breath;
    rig.wool.scale.z *= breath;
    rig.wool.scale.y *= 1 + breathing * .002;
    rig.wool.rotation.z += shake * .012;
  }
  if (reset(rig.head)) {
    rig.head.position.y += -.24 * graze + chewing * .004;
    rig.head.position.z += .055 * graze;
    rig.head.rotation.x += .64 * graze + (night && !selected ? .055 : 0)
      + Math.sin(t * .9 + seed) * .022 * calm + chewing * .018;
    const scan = Math.sin(t * .38 + seed) * .14;
    rig.head.rotation.y += (watch?.front ? watch.yaw * .7 + scan * .3 : scan) * calm * (1 - graze * .9);
    rig.head.rotation.z += Math.sin(t * .67 + seed) * .018 * calm + shake * .045;
  }
  if (reset(rig.jaw)) rig.jaw.rotation.x += graze * (.025 + (chewing + 1) * .025);
  for (let i = 0; i < (rig.ears || []).length; i++) {
    const ear = reset(rig.ears[i]);
    if (!ear) continue;
    const twitch = flick(t + seed + i * 2.17, 7.3 + i * 1.9, .42);
    ear.rotation.x += Math.sin(t * 1.1 + seed + i) * .025 * calm + twitch * .2 * calm;
    ear.rotation.z += twitch * (i ? -.08 : .08) * calm + shake * .1;
  }
  const blink = event(t + seed, selected ? 7.4 : night ? 4.7 : 5.8, .18);
  eyesPose(rig.eyes, blink);
  if (reset(rig.tail)) {
    // A disguised tail retains its clue scale and stays still during inspection.
    const clue = rig.tail.userData?.part === 'tail';
    const wag = selected ? 0 : (clue ? .035 : .12) * (night ? .45 : 1);
    rig.tail.rotation.y += Math.sin(t * 3.5 + seed) * wag;
    rig.tail.rotation.x += Math.sin(t * 1.7 + seed) * wag * .3;
  }
  for (let i = 0; i < (rig.legs || []).length; i++) {
    const leg = reset(rig.legs[i]);
    if (!leg) continue;
    const settle = selected || night ? 0 : event(t + seed + i * 3.6, 23.1, 1.1);
    leg.rotation.x += settle * (i % 2 ? -.055 : .055);
    leg.position.y += settle * .012;
  }
  return { grazing: graze, blink, shaking: shake !== 0 };
}

export function animateFarmDog(model, time, { night = false, alert = false, playerPosition = null } = {}) {
  if (!model?.userData) return { barking: false, blink: 0 };
  const rig = model.userData, t = finite(time);
  const watch = playerGaze(model, playerPosition, 6.5, .7);
  const breathe = Math.sin(t * (night && !alert ? 1.7 : 2.3));
  const bark = alert ? event(t + .2, 5.9, .46) : 0;
  const yawn = !alert && night ? event(t + 4.7, 24.3, 1.3) : 0;
  if (reset(rig.body)) {
    rig.body.scale.x *= 1 + breathe * .006;
    rig.body.scale.z *= 1 + breathe * .004;
  }
  if (reset(rig.head)) {
    rig.head.position.y += breathe * .003;
    rig.head.rotation.y += watch?.front ? watch.yaw : Math.sin(t * .28) * .13;
    rig.head.rotation.x += breathe * .014 + (night && !alert ? .035 : 0) - bark * .13 - yawn * .08;
    rig.head.rotation.z += Math.sin(t * .39) * (watch?.front ? .07 : .025);
  }
  if (reset(rig.jaw)) rig.jaw.rotation.x += bark * .32 + yawn * .25;
  for (let i = 0; i < (rig.ears || []).length; i++) {
    const ear = reset(rig.ears[i]);
    if (!ear) continue;
    const twitch = flick(t + i * 3.7, 8.6 + i * .8, .35);
    ear.rotation.x += twitch * .14 - (alert ? .08 : 0);
    ear.rotation.z += twitch * (i ? -.1 : .1);
  }
  const blink = event(t + .7, alert ? 6.4 : night ? 4.8 : 5.7, .16);
  eyesPose(rig.eyes, blink);
  if (reset(rig.tail)) {
    const wag = alert ? .24 : watch?.front ? .17 : night ? .035 : .065;
    rig.tail.rotation.z += Math.sin(t * (alert ? 8 : 4.3)) * wag;
    rig.tail.rotation.y += Math.sin(t * 3.2) * wag * .45;
  }
  // In the farm this is the seated kennel rig: no locomotion or root changes.
  for (const leg of rig.legs || []) reset(leg);
  return { barking: bark > .2, blink, yawning: yawn > .2 };
}
