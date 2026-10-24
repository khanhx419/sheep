import * as T from 'three';

export function faceCombatActor(model, target, lean = 0) {
  // lookAt may encode a backward heading as X/Z rotations of PI. Replacing
  // only Z with a hit reaction then flips the actor underneath the floor.
  model.rotation.set(0, Math.atan2(target.x - model.position.x, target.z - model.position.z), lean);
}

export function fitCombatCamera(camera, width, height) {
  camera.updateMatrixWorld(true);
  const bounds = new T.Box3();
  for (const x of [-6.1, 6.1]) for (const z of [-4.9, 5.4]) for (const y of [0, 4.4]) bounds.expandByPoint(new T.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse));
  const aspect = Math.max(.45, width / Math.max(1, height));
  const frameHeight = Math.max((bounds.max.y - bounds.min.y) / .8, (bounds.max.x - bounds.min.x) / (.9 * aspect));
  const cx = (bounds.max.x + bounds.min.x) / 2, cy = (bounds.max.y + bounds.min.y) / 2 - frameHeight * .035;
  camera.left = cx - frameHeight * aspect / 2; camera.right = cx + frameHeight * aspect / 2;
  camera.top = cy + frameHeight / 2; camera.bottom = cy - frameHeight / 2; camera.updateProjectionMatrix();
}

// Apply a complete pose each frame. Never scale to zero or displace the model
// away from its actual collider; recovery starts at the dash's real endpoint.
export function animateWolf(model, engine, { hitAt = -10, deadAt = null } = {}) {
  const { head, tail, arms, legs, jaw, baseScale } = model.userData;
  const t = engine.time, p = T.MathUtils.clamp(1 - engine.timer / Math.max(.01, engine.stageDuration), 0, 1);
  const windup = engine.stage === 'windup', strike = engine.stage === 'strike', recovering = engine.stage === 'recover';
  const step = Math.sin(t * 11), variation = engine.castCount % 2 ? 1 : -1;
  model.position.set(engine.wolf.x, .015 + Math.sin(t * 2.8) * .012, engine.wolf.z);
  const facing = engine.pattern === 'dash' && strike && engine.effects[0] ? engine.effects[0] : null;
  model.rotation.set(0, facing ? Math.atan2(facing.dx, facing.dz) : Math.atan2(engine.player.x - engine.wolf.x, engine.player.z - engine.wolf.z), 0);
  model.scale.setScalar(baseScale);
  head.rotation.set(Math.sin(t * 2) * .025, Math.sin(t * 1.4) * .035, 0);
  jaw.rotation.x = .06 + Math.sin(t * 2.5) * .025;
  tail.rotation.set(-.5, Math.sin(t * 3) * .12, 0);
  arms.forEach((arm, i) => arm.rotation.set(engine.stage === 'wait' ? -step * .1 * (i ? 1 : -1) : 0, 0, (i ? 1 : -1) * .22));
  legs.forEach((leg, i) => leg.rotation.set(engine.stage === 'wait' ? step * .2 * (i ? 1 : -1) : 0, 0, 0));
  if (windup) {
    model.position.y -= Math.sin(p * Math.PI / 2) * .07;
    head.rotation.x = -.15; jaw.rotation.x = .18 + p * .15;
    if (engine.pattern === 'dash') { model.rotation.x = .12 + p * .18; arms.forEach(a => { a.rotation.x = .45 + p * .4; }); }
    else if (engine.pattern === 'slam' || engine.pattern === 'rings') { arms.forEach(a => { a.rotation.x = -p * 2.3; }); head.rotation.x = -.2; }
    else if (engine.pattern === 'fan') { arms[variation > 0 ? 0 : 1].rotation.x = -1.7 * p; model.rotation.z = variation * p * .12; }
    else { head.rotation.x = -.2 - p * .4; jaw.rotation.x = .45; arms.forEach(a => { a.rotation.x = -.8 * p; }); }
  }
  if (strike) {
    const arc = Math.sin(p * Math.PI);
    jaw.rotation.x = .35 + arc * .2;
    if (engine.pattern === 'dash') { model.position.y += arc * .16; model.rotation.x = .28; arms.forEach(a => { a.rotation.x = -1.1; }); legs.forEach((leg, i) => { leg.rotation.x = Math.sin(p * Math.PI * 4 + i * Math.PI) * .6; }); }
    else if (engine.pattern === 'slam') { model.position.y += arc * .42; arms.forEach(a => { a.rotation.x = -2.3 + p * 3; }); model.rotation.x = p * .2; }
    else if (engine.pattern === 'fan') { arms.forEach((a, i) => { a.rotation.x = -.8 - Math.sin(p * Math.PI * 3 + i * Math.PI) * .9; }); model.rotation.z = Math.sin(p * Math.PI * 3) * .12; }
    else if (engine.pattern === 'rings') { legs[engine.castCount % 2].rotation.x = -arc * .8; model.position.y += arc * .15; arms.forEach(a => { a.rotation.x = -1 + p * 1.2; }); }
    else { head.rotation.x = -.55; jaw.rotation.x = .55; model.scale.y *= 1 + arc * .04; arms.forEach(a => { a.rotation.x = -.8; }); }
  }
  if (recovering) { head.rotation.x = .15 * (1 - p); model.rotation.x = .09 * (1 - p); jaw.rotation.x = .2 * (1 - p); }
  const hit = Math.max(0, 1 - (t - hitAt) / .3);
  model.rotation.z += Math.sin((t - hitAt) * 35) * hit * .1;
  if (deadAt != null) { const fall = T.MathUtils.clamp((t - deadAt) / .8, 0, 1); model.rotation.z = -.95 * fall; model.position.y = .05; arms.forEach(a => { a.rotation.x = .3; }); head.rotation.x = .3; }
  return { progress: p, strike, windup };
}
