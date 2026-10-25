import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { PveEngine } from './PveEngine.js';
import { createModelKit } from './worldModels.js';
import { createAtmosphere } from './worldAtmosphere.js';
import { dogAvailable } from './rules.js';
import { sound } from './audio.js';
import { gameKey, imeInterruptsGame, releaseGameKey } from './worldMath.js';
import { animateWolf, fitCombatCamera, faceCombatActor } from './combatAnimation.js';
import { animateFarmSheep, animateFarmDog } from './farmAnimation.js';

export default function PveCombat({ state, dispatch }) {
  const host = useRef(null), engine = useRef(null), latest = useRef(state); latest.current = state;
  const [view, setView] = useState({ label: 'Sói đang tìm sơ hở', stage: 'wait', stamina: 100, counter: false, attackReady: true }), [error, setError] = useState(false);
  const pause = useRef(false); const [paused, setPaused] = useState(false);
  const [itemsOpen, setItemsOpen] = useState(false);
  const wolf = state.residents.find(s => s.id === state.activeId);
  useEffect(() => {
    dispatch({ type: 'PVE_BEGIN' });
    let renderer;
    try { renderer = new T.WebGLRenderer({ antialias: true }); } catch { setError(true); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFShadowMap; renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.domElement.setAttribute('aria-label', 'Đấu trường PvE 3D trong chuồng'); host.current.appendChild(renderer.domElement);
    const scene = new T.Scene(), kit = createModelKit(); kit.environment(scene); scene.userData.barnShell.visible = false; scene.userData.roofCover.visible = false;
    const set = kit.supplements(scene); set.fenceStages.forEach((f, i) => { f.visible = i === (latest.current.farm.fenceLevel || 0); });
    for (const key of ['roofPatch', 'divider', 'deity', 'merchant', 'shop', 'storage']) set[key].visible = false;
    set.gates.forEach(g => { g.rotation.y = g.userData.side * -1.45; });
    const atmosphere = createAtmosphere(scene); scene.fog = new T.FogExp2(0x273f49, .012);
    const camera = new T.OrthographicCamera(-9, 9, 6.8, -6.8, .1, 130); camera.position.set(8, 13, 15); camera.lookAt(0, .4, 0);
    scene.add(new T.HemisphereLight(0xb5cedb, 0x55654f, 1.5));
    const light = new T.DirectionalLight(0xc7dcff, 2.4); light.position.set(-5, 12, 7); light.castShadow = true; light.shadow.mapSize.set(1024, 1024); Object.assign(light.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10 }); light.shadow.bias = -.0004; scene.add(light);
    const warm = new T.DirectionalLight(0xffd09b, .9); warm.position.set(3, 4, 9); scene.add(warm);
    const player = kit.farmer(), enemy = kit.wolf(wolf.type), dog = kit.shiba(); scene.add(player, enemy, dog);
    const sheep = latest.current.flock.map((s, i) => ({ id: s.id, x: (i % 2 ? 1 : -1) * (4.5 - Math.floor(i / 2) % 3 * 1.02), z: -3.4 + Math.floor(i / 6) * 1.05 }));
    const flock = sheep.map((position, i) => { const mesh = kit.sheep(latest.current.flock[i], i); mesh.scale.multiplyScalar(.55); mesh.position.set(position.x, 0, position.z); scene.add(mesh); return mesh; });
    let wolfHitAt = -10, playerHitAt = -10, previousHp = latest.current.combatHp;
    const controller = new PveEngine({ type: wolf.type, day: latest.current.day, difficulty: latest.current.difficulty, sheep, dog: dogAvailable(latest.current),
      onHit: (amount, bleed) => { playerHitAt = controller.time; if (amount) { dispatch({ type: 'DAMAGE', amount, bleed }); sound('hit'); } },
      onAttack: counter => {
        const s = latest.current; if (s.combatHp <= 0 || s.player.weapon === 'gun' && !s.player.ammo) return;
        dispatch({ type: 'STRIKE', position: counter ? .5 : s.player.weapon === 'gun' ? .75 : .65, roll: Math.random() }); sound('hit');
      },
      onSheepHit: id => dispatch({ type: 'SHEEP_HIT', id }),
      onDogHit: () => { if (dogAvailable(latest.current) && latest.current.combatHp > 0) dispatch({ type: 'PVE_DOG_HIT' }); },
      onCycle: () => dispatch({ type: 'END_DODGE' }),
    }); engine.current = controller;
    if (controller.dog) dispatch({ type: 'DOG' });
    const ringGeometry = new T.RingGeometry(.84, 1, 40), lineGeometry = new T.PlaneGeometry(1, 1), bulletGeometry = new T.SphereGeometry(.24, 10, 8);
    const warnMat = new T.MeshBasicMaterial({ color: 0xe5b76b, transparent: true, opacity: .65, side: T.DoubleSide, depthWrite: false });
    const hitMat = new T.MeshBasicMaterial({ color: 0xef6651, transparent: true, opacity: .8, side: T.DoubleSide, depthWrite: false });
    const shieldMat = new T.MeshBasicMaterial({ color: 0x97d6c1, transparent: true, opacity: .25, wireframe: true });
    const shield = new T.Mesh(new T.SphereGeometry(.7, 12, 8), shieldMat); scene.add(shield);
    const slashGeometry = new T.RingGeometry(.7, .76, 24, 1, -.7, 2), slashMaterial = new T.MeshBasicMaterial({ color: 0xffd69b, transparent: true, opacity: .8, side: T.DoubleSide, depthWrite: false });
    const slash = new T.Mesh(slashGeometry, slashMaterial), wolfSlash = new T.Group(); scene.add(slash, wolfSlash);
    const wolfSlashMaterial = slashMaterial.clone(); wolfSlashMaterial.color.set(0xf1a287);
    for (let i = 0; i < 3; i++) { const claw = new T.Mesh(slashGeometry, wolfSlashMaterial); claw.position.y = i * .15; wolfSlash.add(claw); }
    const sparkGeometry = new T.OctahedronGeometry(.055), sparkMaterial = new T.MeshBasicMaterial({ color: 0xffe8b0 });
    const sparks = new T.InstancedMesh(sparkGeometry, sparkMaterial, 12), sparkTransform = new T.Object3D(); sparks.frustumCulled = false; scene.add(sparks);
    const marks = Array.from({ length: 5 }, () => { const ring = new T.Mesh(ringGeometry, warnMat), line = new T.Mesh(lineGeometry, warnMat), bullet = new T.Mesh(bulletGeometry, hitMat); ring.rotation.x = line.rotation.x = -Math.PI / 2; scene.add(ring, line, bullet); return { ring, line, bullet }; });
    const down = e => {
      if (e.ctrlKey || e.metaKey || e.altKey || imeInterruptsGame(e)) { controller.keys.clear(); return; }
      const code = gameKey(e);
      if (code === 'Escape' && !e.repeat) { pause.current = !pause.current; setPaused(pause.current); controller.keys.clear(); return; }
      if (pause.current || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyJ', 'KeyK'].includes(code)) { e.preventDefault(); if (!e.repeat || !['Space', 'KeyJ'].includes(code)) controller.press(code); }
    };
    const up = e => releaseGameKey(controller.keys, e), blur = () => controller.keys.clear();
    document.addEventListener('keydown', down, true); document.addEventListener('keyup', up, true); window.addEventListener('blur', blur);
    document.addEventListener('compositionstart', blur); document.addEventListener('compositionend', blur); document.addEventListener('visibilitychange', blur);
    const resize = () => { const { width, height } = host.current.getBoundingClientRect(); if (!height) return; renderer.setSize(width, height, false); fitCombatCamera(camera, width, height); };
    const observer = new ResizeObserver(resize); observer.observe(host.current); resize();
    let frame, last = performance.now(), uiAt = 0, wonAt = 0;
    const draw = now => {
      frame = requestAnimationFrame(draw); const dt = Math.min(.05, (now - last) / 1000); last = now; if (document.hidden) { controller.keys.clear(); return; }
      const s = latest.current; controller.gun = s.player.weapon === 'gun';
      if (s.combatHp > 0 && !pause.current) controller.update(dt); else if (s.combatHp <= 0 && !wonAt) wonAt = now;
      if (wonAt && now - wonAt > 1000) { wonAt = Infinity; dispatch({ type: 'WON_FIGHT' }); }
      if (s.combatHp < previousHp) wolfHitAt = controller.time; previousHp = s.combatHp;
      const moving = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].some(key => controller.keys.has(key)), dodgeAge = controller.time - controller.dodgeAt;
      player.position.set(controller.player.x, dodgeAge < .38 ? Math.sin(dodgeAge / .38 * Math.PI) * .16 : moving ? Math.abs(Math.sin(controller.time * 10)) * .035 : .01, controller.player.z);
      faceCombatActor(player, controller.wolf, dodgeAge < .38 ? Math.sin(dodgeAge / .38 * Math.PI) * .25 : Math.max(0, 1 - (controller.time - playerHitAt) / .25) * Math.sin(controller.time * 35) * .1);
      player.userData.legs.forEach((leg, i) => { leg.rotation.x = moving ? Math.sin(controller.time * 11 + i * Math.PI) * .5 : 0; });
      player.userData.guardArm.rotation.x = controller.blocking ? -1.3 : moving ? Math.sin(controller.time * 11) * .15 : 0;
      const swingAge = controller.time - controller.attackAt;
      player.userData.arm.rotation.x = swingAge < .5 ? -1.3 * Math.sin(Math.PI * Math.min(1, swingAge / .5)) : controller.blocking ? -.9 : 0;
      const deathElapsed = s.combatHp <= 0 ? Number.isFinite(wonAt) ? Math.min(1.2, (now - wonAt) / 1000) : 1.2 : 0;
      const pose = animateWolf(enemy, deathElapsed ? { ...controller, time: controller.time + deathElapsed } : controller, { hitAt: wolfHitAt, deadAt: s.combatHp <= 0 ? controller.time : null });
      slash.visible = swingAge < .5; slash.position.copy(player.position).add(new T.Vector3(Math.sin(player.rotation.y) * .6, .9, Math.cos(player.rotation.y) * .6)); slash.rotation.set(-.4, player.rotation.y, -1.5 + swingAge * 7); slashMaterial.opacity = Math.max(0, 1 - swingAge / .5) * .8;
      wolfSlash.visible = pose.strike && ['fan', 'slam', 'dash'].includes(controller.pattern); wolfSlash.position.copy(enemy.position).add(new T.Vector3(0, 1, 0)); wolfSlash.rotation.set(-.3, enemy.rotation.y, -.9 + pose.progress * 2.8);
      const hitAge = controller.time - wolfHitAt; sparks.visible = hitAge < .4;
      if (sparks.visible) { for (let i = 0; i < 12; i++) { const angle = i * 2.399; sparkTransform.position.set(enemy.position.x + Math.sin(angle) * hitAge * 2.8, 1 + hitAge * 2 - hitAge * hitAge * 5 + i % 3 * .1, enemy.position.z + Math.cos(angle) * hitAge * 2.8); sparkTransform.scale.setScalar(1 - hitAge / .4); sparkTransform.updateMatrix(); sparks.setMatrixAt(i, sparkTransform.matrix); } sparks.instanceMatrix.needsUpdate = true; }
      const dogStrike = controller.time - controller.dogAt < .7;
      const target = controller.dog && dogStrike ? { x: enemy.position.x + .5, z: enemy.position.z } : { x: player.position.x + 1, z: player.position.z - .8 };
      dog.visible = controller.dog; dog.position.lerp(new T.Vector3(target.x, .02 + (dogStrike ? Math.abs(Math.sin(now * .008)) * .035 : 0), target.z), 1 - Math.exp(-dt * 4)); dog.lookAt(enemy.position.x, dog.position.y, enemy.position.z);
      animateFarmDog(dog, controller.time, { night: true, alert: dogStrike, playerPosition: enemy.position });
      dog.userData.tail.rotation.z = Math.sin(controller.time * (dogStrike ? 12 : 3)) * .2;
      dog.userData.head.rotation.x = dogStrike ? Math.sin(controller.time * 12) * .14 : .02;
      dog.userData.legs.forEach((leg, i) => { leg.rotation.x = dogStrike ? Math.sin(controller.time * 14 + i * Math.PI) * .5 : 0; });
      shield.visible = controller.blocking; shield.position.copy(player.position); shield.position.y += .7;
      flock.forEach((mesh, i) => { const animal = s.flock.find(a => a.id === sheep[i].id); mesh.visible = !!animal;
        animateFarmSheep(mesh, controller.time, { night: true });
        mesh.userData.head.rotation.x += Math.sin(controller.time * 8 + i) * .04; mesh.position.y = pose.strike ? Math.abs(Math.sin(controller.time * 18 + i)) * .035 : 0; mesh.userData.ears.forEach((ear, side) => { ear.rotation.z = (side ? 1 : -1) * (pose.strike ? .6 : .28); });
        mesh.userData.hungerBar.visible = !!animal && s.difficulty !== 'easy' && animal.hp < 100; mesh.userData.hungerBar.quaternion.copy(mesh.quaternion.clone().invert().multiply(camera.quaternion));
        const hp = (animal?.hp ?? 100) / 100; mesh.userData.hungerFill.scale.x = hp; mesh.userData.hungerFill.position.x = (hp - 1) / 2;
      });
      marks.forEach((mark, i) => { const effect = controller.effects[i]; for (const object of Object.values(mark)) object.visible = false; if (!effect) return;
        const telegraphLine = effect.line || effect.projectile && controller.stage === 'windup';
        const object = telegraphLine ? mark.line : effect.projectile && controller.stage === 'strike' ? mark.bullet : mark.ring; object.visible = true; object.material = controller.stage === 'strike' ? hitMat : warnMat;
        if (telegraphLine) { const length = effect.line ? effect.length : controller.projectileSpeed * 1.4; object.position.set(effect.x + effect.dx * length / 2, .06, effect.z + effect.dz * length / 2); object.rotation.set(-Math.PI / 2, 0, -Math.atan2(effect.dx, effect.dz)); object.scale.set(effect.line ? effect.width * 2 : effect.radius * 2, length, 1); }
        else { object.position.set(effect.x, effect.projectile && controller.stage === 'strike' ? .6 : .07, effect.z); object.scale.setScalar(object === mark.bullet ? effect.radius / .24 : effect.radius || .5); }
      });
      atmosphere.update(controller.time, true, s.farm.weather === 'rainy');
      scene.userData.countryside.update(controller.time, true, s.farm.weather === 'rainy');
      scene.userData.ambience.update(controller.time, { night: true, rainy: s.farm.weather === 'rainy' });
      renderer.render(scene, camera);
      if (now - uiAt > 90) { uiAt = now; setView({ label: s.combatHp <= 0 ? 'Sói đã gục' : controller.label, stage: controller.stage, stamina: Math.round(controller.stamina), counter: controller.time < controller.counterUntil, attackReady: controller.time >= controller.attackReadyAt }); }
    }; frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener('keydown', down, true); document.removeEventListener('keyup', up, true); document.removeEventListener('compositionstart', blur); document.removeEventListener('compositionend', blur); document.removeEventListener('visibilitychange', blur); window.removeEventListener('blur', blur); atmosphere.dispose(); kit.dispose(); for (const g of [ringGeometry, lineGeometry, bulletGeometry, shield.geometry]) g.dispose(); slashGeometry.dispose(); slashMaterial.dispose(); wolfSlashMaterial.dispose(); sparkGeometry.dispose(); sparkMaterial.dispose(); warnMat.dispose(); hitMat.dispose(); shieldMat.dispose(); light.shadow.map?.dispose(); renderer.dispose(); renderer.domElement.remove(); engine.current = null; };
  }, [state.activeId, state.difficulty, dispatch]);
  function press(code) { if (!pause.current) engine.current?.press(code); }
  return <div className="pve-combat"><div className="pve-scene" ref={host} />{error && <div className="pve-error">Không thể dựng cảnh chiến đấu WebGL. Hãy bật tăng tốc đồ họa và tải lại game.</div>}
    {paused && <div className="pve-pause"><h2>Tạm dừng</h2><button className="button primary" onClick={() => { pause.current = false; setPaused(false); }}>Tiếp tục trận đấu</button></div>}
    <div className="pve-enemy"><strong>{wolf.speciesName || wolf.name}</strong><div><i style={{ width: `${state.combatHp / state.combat.wolfMaxHp * 100}%` }} /></div><span>{state.combatHp}/{state.combat.wolfMaxHp} HP</span></div>
    <div className={`pve-skill ${view.stage}`}>{view.stage === 'windup' ? `⚠ ${view.label}` : view.counter ? 'Sơ hở · Phản đòn!' : view.stage === 'strike' ? view.label : ''}</div>
    <div className="pve-controls"><div className="pve-stamina"><span>Thể lực</span><div><i style={{ width: `${view.stamina}%` }} /></div></div><div className="pve-buttons"><button disabled={paused || !view.attackReady || state.combatHp <= 0} onClick={() => press('KeyJ')}>{view.attackReady ? 'Tấn công · J' : 'Hồi đòn…'}</button><button onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); press('KeyK'); }} onPointerUp={() => engine.current?.release('KeyK')} onLostPointerCapture={() => engine.current?.release('KeyK')}>Đỡ · K</button><button onClick={() => press('Space')}>Né · Space</button><button onClick={() => dispatch({ type: 'SWITCH_WEAPON' })}>{state.player.weapon === 'gun' ? `Súng · ${state.player.ammo}` : 'Cận chiến'}</button><button onClick={() => setItemsOpen(v => !v)}>Vật phẩm</button></div>{itemsOpen && <div className="pve-buttons pve-items">{[['medicine', 'Hồi máu'], ['repairKit', 'Sửa giáp'], ['strengthPotion', 'Tăng lực']].map(([id, name]) => <button key={id} disabled={!state.inventory[id] || paused} onClick={() => dispatch({ type: 'USE', item: id })}>{name} ×{state.inventory[id]}</button>)}</div>}<small>{dogAvailable(state) ? 'Shiba đang hỗ trợ' : 'Shiba nghỉ sau khi kiểm tra'} · {state.difficulty === 'easy' ? 'Cừu được bảo vệ' : `Đàn còn ${state.flock.length} con`}</small></div>
    <div className="pve-move">{[['↑', 'KeyW'], ['←', 'KeyA'], ['↓', 'KeyS'], ['→', 'KeyD']].map(([label, key]) => <button key={key} onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); press(key); }} onPointerUp={() => engine.current?.release(key)} onLostPointerCapture={() => engine.current?.release(key)}>{label}</button>)}</div>
  </div>;
}
