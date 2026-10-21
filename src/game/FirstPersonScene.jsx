import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { createModelKit } from './worldModels.js';
import { canStand, movePlayer, movementVector, interactionTarget, gameKey, residentSlot, safeSpawn, DIVIDER_WALLS, WALLS } from './worldMath.js';
import { Icon } from './ui.jsx';
import { sound, unlockAudio } from './audio.js';
import './firstPerson.css';

export default function FirstPersonScene({ animals, night, paused, selectedId, inspectionPart, onSelect, farm, deityStage = 0, dogSignals = [], fullMoon, onPenChange, merchantPresent, onMerchant, onSettings, onMenu, controlsRef, sensitivity = 1, children }) {
  const mount = useRef(null), engine = useRef(null), props = useRef(null);
  props.current = { animals, night, paused, selectedId, inspectionPart, onSelect, farm: farm || {}, deityStage, dogSignals, fullMoon, onPenChange, merchantPresent, onMerchant, onSettings, onMenu, sensitivity };
  const [error, setError] = useState('');
  const [locked, setLocked] = useState(false), [torch, setTorch] = useState(true);
  const [target, setTarget] = useState(null), [engaged, setEngaged] = useState(false);
  const [hint, setHint] = useState('Chuột khóa khi chơi · Ctrl phải mở/khóa chuột · Esc cài đặt.');

  useEffect(() => {
    const host = mount.current;
    let renderer;
    try { renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
    catch { setError('Trình duyệt chưa bật WebGL 2. Hãy mở game bằng Chrome hoặc Edge có tăng tốc đồ họa.'); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
    renderer.domElement.setAttribute('aria-label', 'Cảnh trại 3D góc nhìn thứ nhất');
    renderer.domElement.tabIndex = 0;
    host.appendChild(renderer.domElement);
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(72, 1, 0.07, 110);
    camera.rotation.order = 'YXZ'; camera.position.set(0, 1.65, 5.5); camera.rotation.x = -0.12; scene.add(camera);
    const kit = createModelKit(); kit.environment(scene); const meta = kit.supplements(scene);
    const heldTorch = kit.flashlight(camera);
    const sky = new T.HemisphereLight(0xa6bbca, 0x67603f, 1.7); scene.add(sky);
    const sun = new T.DirectionalLight(0xffdfae, 2.8); sun.position.set(-8, 17, 11); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -24; sun.shadow.camera.right = 24;
    sun.shadow.camera.top = 24; sun.shadow.camera.bottom = -24; sun.shadow.bias = -0.0007; scene.add(sun);
    const torchLight = new T.SpotLight(0xffe7b0, 45, 22, Math.PI / 7, 0.55, 1.3);
    torchLight.castShadow = true; torchLight.shadow.mapSize.set(1024, 1024); torchLight.shadow.bias = -0.0004;
    scene.add(torchLight); scene.add(torchLight.target);
    const moon = new T.Mesh(new T.SphereGeometry(2, 16, 12), new T.MeshBasicMaterial({ color: 0xd9e9d6 }));
    moon.position.set(16, 22, -35); scene.add(moon);
    const animalMap = new Map(), keys = new Set();
    const direction = new T.Vector3(), desiredPosition = new T.Vector3(), desiredLook = new T.Vector3();
    const world = { camera, animalMap, keys, torchOn: true, yaw: 0, pitch: -0.12, active: false, dragging: false, touchForward: 0, touchStrafe: 0, lastTarget: null, inspection: null };
    engine.current = world;
    const walls = () => [...WALLS, ...(props.current.farm.divided ? DIVIDER_WALLS : [])];
    const npcWalls = () => props.current.merchantPresent && !props.current.night ? [{ x: -4, z: 12.5, w: 0.8, d: 0.8 }] : [];
    function clearInput() { keys.clear(); world.dragging = false; world.touchForward = 0; world.touchStrafe = 0; }
    let lockPending = false, lockCancelled = false, disposed = false, manuallyUnlocked = false;
    function release() { lockCancelled = true; if (document.pointerLockElement === renderer.domElement) document.exitPointerLock(); clearInput(); }
    function focus() { renderer.domElement.focus({ preventScroll: true }); world.active = true; setEngaged(true); unlockAudio(); }
    async function lockMouse() {
      if (disposed || props.current.paused || props.current.selectedId || lockPending || document.pointerLockElement === renderer.domElement) return;
      focus(); manuallyUnlocked = false; lockCancelled = false; lockPending = true;
      try {
        if (!renderer.domElement.requestPointerLock) throw new Error('Pointer lock unavailable');
        await renderer.domElement.requestPointerLock();
        if (disposed || lockCancelled || props.current.paused || props.current.selectedId) release();
      } catch {
        if (!disposed && !lockCancelled) setHint('Không khóa được chuột trong cửa sổ này. Có thể kéo chuột để nhìn hoặc thử nút Khóa chuột.');
      } finally { lockPending = false; }
    }
    function pointerDown(event) {
      if (event.button !== 0 || props.current.paused || props.current.selectedId) return;
      focus(); world.dragging = true; world.dragX = event.clientX; world.dragY = event.clientY;
      if (event.pointerType === 'touch') renderer.domElement.setPointerCapture?.(event.pointerId);
      else if (!manuallyUnlocked) lockMouse();
    }
    function pointerMove(event) {
      if (!world.active || props.current.paused || props.current.selectedId) return;
      const pointerLocked = document.pointerLockElement === renderer.domElement;
      if (!pointerLocked && !world.dragging) return;
      const dx = pointerLocked ? event.movementX : event.clientX - world.dragX;
      const dy = pointerLocked ? event.movementY : event.clientY - world.dragY;
      world.dragX = event.clientX; world.dragY = event.clientY;
      world.yaw -= dx * 0.003 * props.current.sensitivity; world.pitch = T.MathUtils.clamp(world.pitch - dy * 0.003 * props.current.sensitivity, -1.2, 1.12);
    }
    function findTarget() {
      camera.getWorldDirection(direction);
      const candidates = [...animalMap.values()].map(o => ({ position: o.position, animal: o.userData.animal, height: o.userData.animal.age === 'baby' ? 0.7 : 1 }));
      if (props.current.merchantPresent && !props.current.night) candidates.push({ position: meta.merchant.position, height: 1.3, animal: { id: 'merchant', name: 'Thương nhân lang thang', merchant: true } });
      return interactionTarget(camera.position, direction, candidates, walls());
    }
    function interact() {
      if (props.current.paused || props.current.selectedId) return;
      const aim = findTarget();
      if (!aim) { setHint('Hướng tâm ngắm vào một con cừu rồi tiến đến gần.'); return; }
      if (aim.distance > 3.3) { setHint('Còn xa quá. Đi lại gần hơn để kiểm tra.'); return; }
      release();
      if (aim.animal.merchant) props.current.onMerchant?.(); else props.current.onSelect(aim.animal.id);
    }
    function keyDown(event) {
      // Check the physical right Ctrl before the modifier shortcut guard.
      if (event.code === 'ControlRight' || event.key === 'Control' && event.location === 2) {
        if (props.current.paused || props.current.selectedId || /INPUT|TEXTAREA/.test(event.target.tagName)) return;
        event.preventDefault();
        if (event.repeat) return;
        if (document.pointerLockElement === renderer.domElement || lockPending) {
          manuallyUnlocked = true; release(); world.active = false; setEngaged(false);
          setHint('Chuột đã mở · Nhấn Ctrl phải để khóa lại.');
        } else lockMouse();
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const code = gameKey(event);
      if (props.current.paused || props.current.selectedId || /INPUT|TEXTAREA/.test(event.target.tagName)) return;
      if (['Tab', 'KeyI'].includes(event.code)) { event.preventDefault(); if (!event.repeat) { release(); props.current.onMenu?.(event.code === 'KeyI' ? 'inventory' : 'farm'); } return; }
      if (code === 'KeyE') { if (!event.repeat) { event.preventDefault(); interact(); } return; }
      if (!world.active && document.activeElement !== renderer.domElement) return;
      world.active = true;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft'].includes(code)) event.preventDefault();
      keys.add(code);
      if (event.repeat) return;
      if (code === 'KeyF') { world.torchOn = !world.torchOn; setTorch(world.torchOn); }
      if (code === 'Escape') { event.preventDefault(); release(); world.active = false; setEngaged(false); props.current.onSettings?.(); }
    }
    function keyUp(event) { keys.delete(gameKey(event)); }
    function lockChange() {
      const captured = document.pointerLockElement === renderer.domElement;
      if (captured && (disposed || lockCancelled || props.current.paused || props.current.selectedId)) { release(); return; }
      const escaped = !captured && !lockCancelled && world.active && !props.current.paused && !props.current.selectedId;
      setLocked(captured); clearInput();
      if (escaped) props.current.onSettings?.();
      world.active = captured; setEngaged(captured);
      setHint(captured ? 'Rê chuột để nhìn · Ctrl phải mở chuột · Esc cài đặt.' : manuallyUnlocked ? 'Chuột đã mở · Nhấn Ctrl phải để khóa lại.' : 'Nhấn Ctrl phải hoặc bấm vào cảnh để khóa chuột.');
    }
    const up = () => { world.dragging = false; };
    const loseFocus = () => { clearInput(); world.active = false; setEngaged(false); };
    const visibility = () => { if (document.hidden) { release(); loseFocus(); } };
    renderer.domElement.addEventListener('pointerdown', pointerDown);
    const activateKeyboard = () => { world.active = true; setEngaged(true); };
    renderer.domElement.addEventListener('focus', activateKeyboard);
    renderer.domElement.addEventListener('pointermove', pointerMove);
    renderer.domElement.addEventListener('pointerup', up);
    renderer.domElement.addEventListener('lostpointercapture', up);
    document.addEventListener('keydown', keyDown); document.addEventListener('keyup', keyUp);
    document.addEventListener('pointerlockchange', lockChange); window.addEventListener('blur', loseFocus); document.addEventListener('visibilitychange', visibility);
    world.focus = focus; world.interact = interact; world.release = release;
    world.lock = lockMouse;
    if (controlsRef) controlsRef.current = world;
    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize); observer.observe(host); resize();
    let last = performance.now(), frame, tick = 0, lastPhase, populationChanged = false;
    function animate(now) {
      frame = requestAnimationFrame(animate);
      const dt = Math.min((now - last) / 1000, 0.045); last = now;
      if (document.hidden) return;
      const current = props.current;
      meta.roofPatch.visible = !!current.farm.roof; meta.divider.visible = !!current.farm.divided;
      meta.merchant.visible = !!current.merchantPresent && !current.night;
      meta.deity.visible = current.deityStage > 0;
      meta.deity.traverse(o => { if (o.isMesh) o.material.opacity = current.deityStage * (o.userData.eye ? 0.85 : 0.42); });
      if (lastPhase !== current.night) {
        lastPhase = current.night;
        scene.background = new T.Color(current.night ? 0x14232d : 0xbac8b0);
        scene.fog = new T.FogExp2(current.night ? 0x14232d : 0xbac8b0, current.night ? 0.025 : 0.012);
        sky.intensity = current.night ? 0.65 : 1.9; sky.color.set(current.night ? 0x809dbb : 0xcce4e8);
        sun.intensity = current.night ? 0.55 : 2.8; sun.color.set(current.night ? 0x90b0e4 : 0xffdfae);
        sun.castShadow = !current.night; torchLight.castShadow = current.night;
        moon.visible = current.night;
        world.lastPen = null;
        world.resetPopulation = true;
        if (current.night && current.fullMoon) sound('howl');
      }
      const ids = new Set(current.animals.map(a => a.id));
      if (current.animals.length > 10) world.dense = true;
      const layout = current.farm.divided ? 'pens' : world.dense ? 'dense' : 'sparse';
      if (world.layout !== layout || world.resetPopulation) { for (const object of animalMap.values()) scene.remove(object); animalMap.clear(); world.layout = layout; world.resetPopulation = false; }
      populationChanged = false;
      for (const [id, object] of animalMap) if (!ids.has(id)) { scene.remove(object); animalMap.delete(id); }
      const penIndexes = [0, 0];
      current.animals.forEach((animal, index) => {
        const p = animal.penId || 0, localIndex = penIndexes[p]++;
        const visualKey = `${animal.age}-${animal.isSheared}-${animal.type}-${animal.hidden}-${animal.tell}-${current.farm.divided}`;
        const previous = animalMap.get(animal.id);
        if (previous?.userData.visualKey === visualKey) { previous.userData.animal = animal; return; }
        if (previous) { scene.remove(previous); animalMap.delete(animal.id); }
        const capacity = current.farm.divided ? 18 : world.dense ? 25 : 10;
        const preferred = current.farm.divided ? localIndex : index;
        let slot = previous ? [previous.position.x, previous.position.z] : null;
        if (!slot) for (const candidateIndex of [preferred, ...Array.from({ length: capacity }, (_, i) => i)]) {
          const candidate = residentSlot(candidateIndex % capacity, p, !!current.farm.divided, world.dense ? 25 : 10);
          if ([...animalMap.values()].every(o => Math.hypot(o.position.x - candidate[0], o.position.z - candidate[1]) > 1.6)) { slot = candidate; break; }
        }
        slot ||= residentSlot(preferred % capacity, p, !!current.farm.divided, world.dense ? 25 : 10);
        const object = kit.sheep(animal, index);
        object.userData.visualKey = visualKey; object.userData.divided = current.farm.divided;
        object.position.set(slot[0], 0, slot[1]); object.userData.animal = animal;
        animalMap.set(animal.id, object); scene.add(object); populationChanged = true;
      });
      if (populationChanged && !current.selectedId && !canStand(camera.position.x, camera.position.z,
        [...walls(), ...npcWalls(), ...[...animalMap.values()].map(o => ({ x: o.position.x, z: o.position.z, w: 1.05, d: 1.35 }))])) {
        const spawn = safeSpawn([...walls(), ...npcWalls(), ...[...animalMap.values()].map(o => ({ x: o.position.x, z: o.position.z, w: 1.05, d: 1.35 }))]); camera.position.set(spawn.x, 1.65, spawn.z); world.yaw = 0; world.pitch = -0.12;
      }
      if (current.paused && !world.wasPaused) release();
      world.wasPaused = current.paused;
      const selected = animalMap.get(current.selectedId);
      if (selected) {
        if (!world.inspection) { world.inspection = { position: camera.position.clone(), yaw: world.yaw, pitch: world.pitch }; release(); }
        const part = current.inspectionPart;
        const size = selected.scale.x;
        const localPoint = part === 'paws' ? new T.Vector3(0, 0.18, 0.5) : part === 'tail' ? new T.Vector3(0, 0.65, -1.1) : part === 'body' ? new T.Vector3(0.5, 0.95, 0) : part === 'teeth' ? new T.Vector3(0, 0.97, 1.15) : new T.Vector3(0, 1.25, 1.05);
        const localCamera = part === 'tail' ? new T.Vector3(1.15, 0.9, -2.5) : part === 'paws' ? new T.Vector3(0.9, 0.45, 1.65) : part === 'body' ? new T.Vector3(2.7, 1.25, 0.5) : part === 'teeth' ? new T.Vector3(0.6, 1.2, 2.3) : part === 'eyes' ? new T.Vector3(1, 1.55, 2.2) : new T.Vector3(1.4, 1.6, 2.8);
        localPoint.multiplyScalar(size); localCamera.multiplyScalar(size);
        desiredLook.copy(localPoint).applyAxisAngle(T.Object3D.DEFAULT_UP, selected.rotation.y).add(selected.position);
        desiredPosition.copy(localCamera).applyAxisAngle(T.Object3D.DEFAULT_UP, selected.rotation.y).add(selected.position);
        camera.position.lerp(desiredPosition, 1 - Math.exp(-dt * 7)); camera.lookAt(desiredLook);
        camera.fov = T.MathUtils.lerp(camera.fov, part ? 39 : 53, 1 - Math.exp(-dt * 8)); camera.updateProjectionMatrix();
      } else {
        if (world.inspection) {
          camera.position.copy(world.inspection.position); world.yaw = world.inspection.yaw; world.pitch = world.inspection.pitch;
          const occupied = [...animalMap.values()].map(o => ({ x: o.position.x, z: o.position.z, w: 1.05, d: 1.35 }));
          if (!canStand(camera.position.x, camera.position.z, [...walls(), ...npcWalls(), ...occupied])) { const spawn = safeSpawn([...walls(), ...npcWalls(), ...occupied]); camera.position.set(spawn.x, 1.65, spawn.z); world.yaw = 0; world.pitch = -0.12; }
          world.inspection = null; setHint('Bấm vào cảnh để tiếp tục di chuyển.');
        }
        camera.fov = T.MathUtils.lerp(camera.fov, 72, 1 - Math.exp(-dt * 8)); camera.updateProjectionMatrix();
        if (!current.paused) {
          const pen = current.farm.divided && camera.position.x > 0 ? 1 : 0;
          if (world.lastPen !== pen) { world.lastPen = pen; current.onPenChange?.(pen); if (current.night && current.dogSignals[pen]) { sound('bark'); setHint(`Chó sủa: có mùi sói trong chuồng ${pen === 0 ? 'A' : 'B'}.`); } }
        }
        if (world.active && !current.paused) {
          if (keys.has('ArrowLeft')) world.yaw += dt * 1.6;
          if (keys.has('ArrowRight')) world.yaw -= dt * 1.6;
          const forward = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown')) + world.touchForward;
          const strafe = Number(keys.has('KeyD')) - Number(keys.has('KeyA')) + world.touchStrafe;
          const speed = keys.has('KeyC') ? 1.5 : keys.has('ShiftLeft') ? 4.3 : 2.6;
          const movement = movementVector(forward, strafe, world.yaw, speed * dt);
          const obstacles = [...animalMap.values()].map(o => ({ x: o.position.x, z: o.position.z, w: 1.05, d: 1.35 }));
          // World walls are kept in movePlayer's default list, with animal bodies added.
          const moved = movePlayer(camera.position, movement.x, movement.z, [...walls(), ...npcWalls(), ...obstacles]);
          camera.position.x = moved.x; camera.position.z = moved.z;
          const headHeight = (keys.has('KeyC') ? 0.8 : 1.65) + (Math.abs(forward) + Math.abs(strafe) > 0 ? Math.sin(now * 0.009) * 0.018 : 0);
          camera.position.y = T.MathUtils.lerp(camera.position.y, headHeight, 1 - Math.exp(-dt * 12));
        }
        camera.rotation.set(world.pitch, world.yaw, 0, 'YXZ');
      }
      for (const object of animalMap.values()) {
        object.position.y = Math.sin(now * 0.0018 + object.userData.index) * 0.018;
        object.userData.head.rotation.x = Math.sin(now * 0.0013 + object.userData.index) * 0.025;
        object.userData.ring.visible = selected === object;
      }
      heldTorch.visible = !selected && !current.paused;
      heldTorch.position.y = -0.28 + Math.sin(now * 0.0015) * 0.008;
      camera.getWorldDirection(direction);
      torchLight.position.copy(camera.position).addScaledVector(direction, 0.25);
      torchLight.target.position.copy(camera.position).addScaledVector(direction, 15);
      torchLight.intensity = world.torchOn ? (current.night ? 48 : 10) : 0;
      if (selected) { torchLight.intensity = current.night ? 40 : 12; torchLight.target.position.copy(desiredLook); }
      if (!selected && !current.paused && now - tick > 100) {
        tick = now;
        const found = findTarget(), object = found ? animalMap.get(found.animal.id) : null;
        world.lastTarget = found;
        for (const model of animalMap.values()) model.userData.ring.visible = model === object;
        const label = found ? `${found.animal.id}-${Math.round(found.distance * 2) / 2}` : '';
        if (label !== world.targetLabel) { world.targetLabel = label; setTarget(found ? { name: found.animal.name, merchant: found.animal.merchant, near: found.distance <= 3.3, distance: found.distance.toFixed(1) } : null); }
      }
      renderer.render(scene, camera);
    }
    frame = requestAnimationFrame(animate);
    return () => {
      disposed = true; if (controlsRef) controlsRef.current = null; cancelAnimationFrame(frame); observer.disconnect(); release();
      renderer.domElement.removeEventListener('pointerdown', pointerDown); renderer.domElement.removeEventListener('pointermove', pointerMove); renderer.domElement.removeEventListener('pointerup', up); renderer.domElement.removeEventListener('lostpointercapture', up);
      renderer.domElement.removeEventListener('focus', activateKeyboard);
      document.removeEventListener('keydown', keyDown); document.removeEventListener('keyup', keyUp); document.removeEventListener('pointerlockchange', lockChange); window.removeEventListener('blur', loseFocus); document.removeEventListener('visibilitychange', visibility);
      moon.geometry.dispose(); moon.material.dispose(); torchLight.shadow.map?.dispose(); sun.shadow.map?.dispose(); kit.dispose(); renderer.dispose(); renderer.domElement.remove(); engine.current = null;
    };
  }, []);

  function touchMove(event, forward, strafe) {
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    engine.current?.focus(); if (!engine.current) return;
    engine.current.touchForward = forward; engine.current.touchStrafe = strafe;
  }
  function stopTouch() { if (engine.current) { engine.current.touchForward = 0; engine.current.touchStrafe = 0; } }
  return <div className={`fp-scene ${selectedId ? 'fp-inspecting' : ''}`}>
    <div className="fp-canvas" ref={mount} />
    {error ? <div className="fp-error"><h3>Không thể mở cảnh 3D</h3><p>{error}</p></div> : <>
      <div className="fp-world-label"><i className="live-dot" />TRẠI SƯƠNG <span>{night ? 'CA GÁC BAN ĐÊM' : 'DẠO QUANH TRẠI'} · GÓC NHÌN THỨ NHẤT</span></div>
      {!paused && !selectedId && <><div className={`fp-crosshair ${target?.near ? 'has-target' : ''}`} aria-hidden="true"><i /><i /></div>
        <div className="fp-target" role="status">{target ? <><strong>{target.name}</strong><span>{target.distance} m · {target.near ? 'E — Kiểm tra' : 'Đi lại gần để kiểm tra'}</span></> : <span>Hướng tâm ngắm vào cừu để kiểm tra</span>}</div>
        <div className="fp-toolbar"><button className="fp-tool" onClick={() => { if (engine.current) { engine.current.torchOn = !engine.current.torchOn; setTorch(engine.current.torchOn); } }}><Icon name="lamp" size={16} />{torch ? 'Đèn bật' : 'Đèn tắt'}<kbd>F</kbd></button><button className="fp-tool" onClick={() => engine.current?.lock()}>{locked ? 'Chuột khóa · Ctrl phải để mở' : 'Khóa chuột · Ctrl phải'}</button></div>
        <div className="fp-bottom"><span><kbd>W A S D</kbd> Đi lại <i>·</i> Rê chuột / ← → nhìn <i>·</i> <kbd>Ctrl phải</kbd> Mở chuột <i>·</i> <kbd>C</kbd> Cúi <i>·</i> <kbd>Shift</kbd> Đi nhanh</span><span>{hint}</span></div>
        <button className="fp-interact button primary" disabled={!target?.near} onClick={() => engine.current?.interact()}><Icon name="eye" size={16} />{target?.merchant ? 'Gặp thương nhân' : night ? 'Kiểm tra tại chỗ' : 'Xem cừu tại chỗ'}<kbd>E</kbd></button>
        <div className="fp-touch-pad" aria-label="Điều khiển di chuyển"><button aria-label="Đi tới" onPointerDown={e => touchMove(e, 1, 0)} onPointerUp={stopTouch} onLostPointerCapture={stopTouch}>↑</button><div><button aria-label="Đi sang trái" onPointerDown={e => touchMove(e, 0, -1)} onPointerUp={stopTouch} onLostPointerCapture={stopTouch}>←</button><button aria-label="Đi lùi" onPointerDown={e => touchMove(e, -1, 0)} onPointerUp={stopTouch} onLostPointerCapture={stopTouch}>↓</button><button aria-label="Đi sang phải" onPointerDown={e => touchMove(e, 0, 1)} onPointerUp={stopTouch} onLostPointerCapture={stopTouch}>→</button></div></div>
      </>}
    </>}{children}
  </div>;
}

export function FieldInspection({ animal, state, dispatch, part, onPart, onClose }) {
  const daytime = state.phase === 'day';
  const [notice, setNotice] = useState(daytime ? 'Bạn đang nhìn cừu ngay trong chuồng. Ban đêm mới dùng năng lượng để điều tra.' : 'Chọn bộ phận để cúi gần, quan sát dấu hiệu rồi xác nhận.');
  function check(id) {
    if (!id || daytime || animal.checked.includes(id) || state.energy < 1 || id === 'wool' && !state.inventory.battery) return;
    dispatch({ type: 'CHECK', id: animal.id, part: id }); sound('click');
    setNotice(id === 'wool' ? 'Đã cạo lông. Con cừu này là thật.' : 'Không có dấu hiệu ở bộ phận vừa xem. Hãy soi những chỗ khác.');
  }
  useEffect(() => { const key = event => { if (event.code === 'Escape') { event.preventDefault(); onClose(); } }; document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key); }, [onClose]);
  return <section className="fp-inspect-panel" aria-label={`Kiểm tra tại chỗ ${animal.name}`}><div className="fp-inspect-title"><span className="eyebrow">{daytime ? 'QUAN SÁT' : 'ĐIỀU TRA'} · {animal.name}</span><button className="icon-button" aria-label="Trở lại di chuyển" onClick={onClose}><Icon name="close" size={16} /></button></div><h3>Nhìn kỹ dưới lớp lông.</h3><div className="fp-part-buttons">{[{ id: 'eyes', text: 'Mắt' }, { id: 'paws', text: 'Chân' }, { id: 'teeth', text: 'Miệng' }, { id: 'body', text: 'Thân' }, { id: 'tail', text: 'Đuôi' }].map(p => <button key={p.id} className={part === p.id ? 'active' : ''} onClick={() => { onPart(p.id); setNotice(daytime ? 'Có thể đi quanh và ngắm cừu. Trở lại vào ban đêm để tìm sói.' : 'Đã cúi gần. Hãy quan sát rồi bấm Kiểm tra nếu thấy khả nghi.'); }}>{p.text}{animal.checked?.includes(p.id) && ' ✓'}</button>)}</div><p role="status">{notice}</p>{!daytime && <div className="fp-check-buttons"><button className="button primary" disabled={!part || state.energy < 1 || animal.checked.includes(part)} onClick={() => check(part)}>Kiểm tra · −1</button><button className="button secondary" disabled={state.energy < 1 || !state.inventory.battery || animal.checked.includes('wool')} onClick={() => check('wool')}>Cạo lông · −1 + pin</button></div>}<small><Icon name="bolt" size={12} />{daytime ? `${animal.age === 'baby' ? 'Cừu con · lớn sau 2 ngày' : 'Cừu lớn · 1 xu/ngày'}` : `${state.energy}/2 năng lượng · ${state.inventory.battery} pin`} · Esc đứng dậy</small></section>;
}
