import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { PveEngine } from './PveEngine.js';
import { createModelKit } from './worldModels.js';
import { createAtmosphere } from './worldAtmosphere.js';
import { dogAvailable } from './rules.js';
import { sound } from './audio.js';
import { gameKey, imeInterruptsGame, releaseGameKey } from './worldMath.js';

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
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.domElement.setAttribute('aria-label', 'Đấu trường PvE 3D trong chuồng'); host.current.appendChild(renderer.domElement);
    const scene = new T.Scene(), kit = createModelKit(); kit.environment(scene); scene.userData.barnShell.visible = false; scene.userData.roofCover.visible = false;
    const set = kit.supplements(scene); set.fenceStages.forEach((f, i) => { f.visible = i === (latest.current.farm.fenceLevel || 0); });
    for (const key of ['roofPatch', 'divider', 'deity', 'merchant', 'shop', 'storage']) set[key].visible = false;
    set.gates.forEach(g => { g.rotation.y = g.userData.side * -1.45; });
    const atmosphere = createAtmosphere(scene); scene.fog = new T.FogExp2(0x273f49, .012);
    const camera = new T.OrthographicCamera(-9, 9, 6.8, -6.8, .1, 130); camera.position.set(8, 13, 15); camera.lookAt(0, .4, 0);
    scene.add(new T.HemisphereLight(0xb5cedb, 0x746548, 2));
    const light = new T.DirectionalLight(0xffdfa1, 2.6); light.position.set(-5, 12, 7); light.castShadow = true; light.shadow.mapSize.set(1024, 1024); Object.assign(light.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10 }); light.shadow.bias = -.0004; scene.add(light);
    const player = kit.farmer(), enemy = kit.wolf(wolf.type), dog = kit.shiba(); scene.add(player, enemy, dog);
    const sheep = latest.current.flock.map((s, i) => ({ id: s.id, x: (i % 2 ? 1 : -1) * (4.5 - Math.floor(i / 2) % 3 * 1.02), z: -3.4 + Math.floor(i / 6) * 1.05 }));
    const flock = sheep.map((position, i) => { const mesh = kit.sheep(latest.current.flock[i], i); mesh.scale.multiplyScalar(.55); mesh.position.set(position.x, 0, position.z); scene.add(mesh); return mesh; });
    const controller = new PveEngine({ type: wolf.type, day: latest.current.day, difficulty: latest.current.difficulty, sheep, dog: dogAvailable(latest.current),
      onHit: (amount, bleed) => { if (amount) { dispatch({ type: 'DAMAGE', amount, bleed }); sound('hit'); } },
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
    const resize = () => { const { width, height } = host.current.getBoundingClientRect(); if (!height) return; renderer.setSize(width, height, false); camera.left = -6.8 * width / height; camera.right = 6.8 * width / height; camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(host.current); resize();
    let frame, last = performance.now(), uiAt = 0, wonAt = 0;
    const draw = now => {
      frame = requestAnimationFrame(draw); const dt = Math.min(.05, (now - last) / 1000); last = now; if (document.hidden) { controller.keys.clear(); return; }
      const s = latest.current; controller.gun = s.player.weapon === 'gun';
      if (s.combatHp > 0 && !pause.current) controller.update(dt); else if (s.combatHp <= 0 && !wonAt) wonAt = now;
      if (wonAt && now - wonAt > 1000) { wonAt = Infinity; dispatch({ type: 'WON_FIGHT' }); }
      player.position.set(controller.player.x, Math.sin(now * .004) * .012, controller.player.z); player.lookAt(controller.wolf.x, player.position.y, controller.wolf.z);
      const swingAge = controller.time - controller.attackAt;
      player.userData.arm.rotation.x = swingAge < .5 ? -1.3 * Math.sin(Math.PI * Math.min(1, swingAge / .5)) : controller.blocking ? -.9 : 0;
      enemy.position.set(controller.wolf.x, 0, controller.wolf.z); enemy.lookAt(controller.player.x, 0, controller.player.z);
      enemy.userData.head.rotation.x = controller.stage === 'windup' ? -.2 : Math.sin(now * .003) * .03;
      enemy.rotation.z = controller.time - controller.attackAt < .16 ? Math.sin(now * .04) * .08 : 0;
      if (s.combatHp <= 0) enemy.rotation.z = -.9;
      if (controller.stage === 'strike' && controller.pattern === 'dash') enemy.position.addScaledVector(new T.Vector3(controller.effects[0].dx, 0, controller.effects[0].dz), Math.min(4, (.38 - controller.timer) * 12));
      const dogStrike = controller.time - controller.dogAt < .7;
      const target = controller.dog && dogStrike ? { x: enemy.position.x + .5, z: enemy.position.z } : { x: player.position.x + 1, z: player.position.z - .8 };
      dog.visible = controller.dog; dog.position.lerp(new T.Vector3(target.x, .02 + (dogStrike ? Math.abs(Math.sin(now * .008)) * .035 : 0), target.z), 1 - Math.exp(-dt * 4)); dog.lookAt(enemy.position.x, dog.position.y, enemy.position.z);
      shield.visible = controller.blocking; shield.position.copy(player.position); shield.position.y += .7;
      flock.forEach((mesh, i) => { const animal = s.flock.find(a => a.id === sheep[i].id); mesh.visible = !!animal; mesh.userData.head.rotation.x = Math.sin(now * .008 + i) * .04;
        mesh.userData.hungerBar.visible = !!animal && s.difficulty !== 'easy' && animal.hp < 100; mesh.userData.hungerBar.quaternion.copy(mesh.quaternion.clone().invert().multiply(camera.quaternion));
        const hp = (animal?.hp ?? 100) / 100; mesh.userData.hungerFill.scale.x = hp; mesh.userData.hungerFill.position.x = (hp - 1) / 2;
      });
      marks.forEach((mark, i) => { const effect = controller.effects[i]; for (const object of Object.values(mark)) object.visible = false; if (!effect) return;
        const telegraphLine = effect.line || effect.projectile && controller.stage === 'windup';
        const object = telegraphLine ? mark.line : effect.projectile && controller.stage === 'strike' ? mark.bullet : mark.ring; object.visible = true; object.material = controller.stage === 'strike' ? hitMat : warnMat;
        if (telegraphLine) { const length = effect.line ? effect.length : controller.projectileSpeed * 1.4; object.position.set(effect.x + effect.dx * length / 2, .06, effect.z + effect.dz * length / 2); object.rotation.set(-Math.PI / 2, 0, -Math.atan2(effect.dx, effect.dz)); object.scale.set(effect.line ? effect.width * 2 : effect.radius * 2, length, 1); }
        else { object.position.set(effect.x, effect.projectile && controller.stage === 'strike' ? .6 : .07, effect.z); object.scale.setScalar(object === mark.bullet ? effect.radius / .24 : effect.radius || .5); }
      });
      atmosphere.update(now / 1000, true); renderer.render(scene, camera);
      if (now - uiAt > 90) { uiAt = now; setView({ label: s.combatHp <= 0 ? 'Sói đã gục' : controller.label, stage: controller.stage, stamina: Math.round(controller.stamina), counter: controller.time < controller.counterUntil, attackReady: controller.time >= controller.attackReadyAt }); }
    }; frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener('keydown', down, true); document.removeEventListener('keyup', up, true); document.removeEventListener('compositionstart', blur); document.removeEventListener('compositionend', blur); document.removeEventListener('visibilitychange', blur); window.removeEventListener('blur', blur); atmosphere.dispose(); kit.dispose(); for (const g of [ringGeometry, lineGeometry, bulletGeometry, shield.geometry]) g.dispose(); warnMat.dispose(); hitMat.dispose(); shieldMat.dispose(); light.shadow.map?.dispose(); renderer.dispose(); renderer.domElement.remove(); engine.current = null; };
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
