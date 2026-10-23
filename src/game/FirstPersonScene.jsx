import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { createModelKit } from './worldModels.js';
import { createAtmosphere } from './worldAtmosphere.js';
import { canStand, movePlayer, movementVector, interactionTarget, gameKey, imeInterruptsGame, releaseGameKey, residentSlot, safeSpawn, DIVIDER_WALLS, WALLS, OUTDOOR_WALLS, DOG_SEAT } from './worldMath.js';
import { Icon } from './ui.jsx';
import { sound, unlockAudio } from './audio.js';
import './firstPerson.css';

export default function FirstPersonScene({ animals, night, difficulty = 'normal', paused, suspended = false, selectedId, inspectionPart, onSelect, farm, deityStage = 0, dogSignals = [], fullMoon, onPenChange, merchantPresent, onMerchant, onSettings, onMenu, onAction, controlsRef, sensitivity = 1, children }) {
  const mount = useRef(null), engine = useRef(null), props = useRef(null);
  props.current = { animals, night, difficulty, paused, suspended, selectedId, inspectionPart, onSelect, farm: farm || {}, deityStage, dogSignals, fullMoon, onPenChange, merchantPresent, onMerchant, onSettings, onMenu, onAction, sensitivity };
  const [error, setError] = useState('');
  const [locked, setLocked] = useState(false), [torch, setTorch] = useState(true);
  const [target, setTarget] = useState(null), [engaged, setEngaged] = useState(false);
  const [outsideView, setOutsideView] = useState(false);
  const [hint, setHint] = useState('Chuột khóa khi chơi · Ctrl phải mở/khóa chuột · Esc cài đặt.');

  useEffect(() => {
    const host = mount.current;
    let renderer;
    try { renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
    catch { setError('Trình duyệt chưa bật WebGL 2. Hãy mở game bằng Chrome hoặc Edge có tăng tốc đồ họa.'); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.domElement.setAttribute('aria-label', 'Cảnh trại 3D góc nhìn thứ nhất');
    renderer.domElement.tabIndex = 0;
    host.appendChild(renderer.domElement);
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(72, 1, 0.07, 110);
    camera.rotation.order = 'YXZ'; camera.position.set(0, 1.65, 5.5); camera.rotation.x = -0.12; scene.add(camera);
    const kit = createModelKit(); kit.environment(scene); const meta = kit.supplements(scene);
    const shiba = kit.shiba({ sitting: true }); shiba.position.set(DOG_SEAT.x, 0, DOG_SEAT.z); scene.add(shiba);
    const atmosphere = createAtmosphere(scene);
    const heldTorch = kit.flashlight(camera);
    const sky = new T.HemisphereLight(0xc7dce4, 0x8a7761, 1.7); scene.add(sky);
    const rim = new T.DirectionalLight(0xb8d8ed, 0.6); rim.position.set(8, 8, -12); scene.add(rim);
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
    const walls = () => [...WALLS, ...OUTDOOR_WALLS, { x: 0, z: -5.425 - (props.current.farm.expansion || 0) * 2.2375, w: 16, d: .16 }];
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
      candidates.push({ position: meta.shop.position, interactionObstacle: OUTDOOR_WALLS.find(o => o.x === 4 && o.z === 12.7), height: 1.6, animal: { id: 'farm-shop', name: props.current.night ? 'Quầy đã đóng · Ngủ đến sáng để mua' : 'Người bán · Mở cửa hàng', shop: true, merchant: true } });
      candidates.push({ position: { x: -15.5, z: 16 }, height: .8, animal: { id: 'bed', name: 'Giường · Nghỉ ngơi', activity: 'home' } });
      candidates.push({ position: { x: -4, z: 9.5 }, interactionObstacle: OUTDOOR_WALLS.find(o => o.x === -4 && o.z === 9.5), height: 2, animal: { id: 'guide-board', name: 'Biển hướng dẫn', activity: 'guide' } });
      if (props.current.night) candidates.push({ position: shiba.position, height: .6, animal: { id: 'shiba', name: props.current.farm.dogReady ? 'Shiba · Kiểm tra chuồng (nghỉ hết đêm)' : props.current.farm.dogScan?.danger ? 'Shiba báo có sói · Nghỉ đến sáng' : 'Shiba không tìm thấy mùi sói · Nghỉ đến sáng', action: props.current.farm.dogReady ? 'DOG_SCAN' : 'DOG_STATUS' } });
      candidates.push({ position: { x: -8.5, z: 17.3 }, height: 1, animal: { id: 'store', name: 'Kho cỏ · Xem dự trữ', activity: 'inventory' } });
      if (!props.current.night) {
        candidates.push({ position: { x: 9.4, z: 11.4 }, height: .6, animal: { id: 'garden', name: props.current.farm.cropGrowth >= 3 ? 'Thu hoạch rau' : 'Tưới luống rau', action: props.current.farm.cropGrowth >= 3 ? 'HARVEST' : 'WATER' } });
        candidates.push({ position: { x: -11, z: 1 }, height: .6, animal: { id: 'grass', name: 'Bãi cỏ · Cắt cỏ dự trữ', action: 'CUT_GRASS' } });
        candidates.push({ position: { x: 0, z: 8.4 }, height: 1, animal: { id: 'gate', name: props.current.farm.pastureOpen ? 'Gọi cừu về chuồng' : 'Mở cửa cho cừu ra đồng', action: 'PASTURE' } });
      }
      return interactionTarget(camera.position, direction, candidates, walls());
    }
    function requestAction(type) {
      if (type === 'DOG_SCAN' && props.current.night && props.current.farm.dogReady) sound(props.current.animals.some(a => a.wolf && !a.defeated && a.dogDetect) ? 'bark' : 'click');
      props.current.onAction?.(type);
    }
    function interact() {
      if (props.current.paused || props.current.selectedId) return;
      const aim = findTarget();
      if (!aim) { setHint('Hướng tâm ngắm vào một con cừu rồi tiến đến gần.'); return; }
      if (aim.distance > 3.3) { setHint('Còn xa quá. Đi lại gần hơn để kiểm tra.'); return; }
      if (aim.animal.action) { requestAction(aim.animal.action); return; }
      release();
      if (aim.animal.activity) props.current.onMenu?.(aim.animal.activity);
      else if (aim.animal.shop) { if (props.current.night) setHint('Quầy đóng cửa vào ban đêm.'); else props.current.onMenu?.('shop'); }
      else if (aim.animal.merchant) props.current.onMerchant?.(); else props.current.onSelect(aim.animal.id);
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
      if (event.ctrlKey || event.metaKey || event.altKey || imeInterruptsGame(event)) { clearInput(); return; }
      const code = gameKey(event);
      if (props.current.paused || props.current.selectedId || /INPUT|TEXTAREA/.test(event.target.tagName)) return;
      if (['Tab', 'KeyI'].includes(event.code)) { event.preventDefault(); if (!event.repeat) { release(); props.current.onMenu?.(event.code === 'KeyI' ? 'inventory' : 'farm'); } return; }
      if (code === 'KeyH' && !event.repeat) { requestAction('DOG_SCAN'); return; }
      if (code === 'KeyE') { if (!event.repeat) { event.preventDefault(); interact(); } return; }
      if (!world.active && document.activeElement !== renderer.domElement) return;
      world.active = true;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft'].includes(code)) event.preventDefault();
      keys.add(code);
      if (event.repeat) return;
      if (code === 'KeyF') { world.torchOn = !world.torchOn; setTorch(world.torchOn); }
      if (code === 'Escape') { event.preventDefault(); release(); world.active = false; setEngaged(false); props.current.onSettings?.(); }
    }
    function keyUp(event) { releaseGameKey(keys, event); }
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
    document.addEventListener('keydown', keyDown, true); document.addEventListener('keyup', keyUp, true);
    document.addEventListener('compositionstart', clearInput); document.addEventListener('compositionend', clearInput);
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
      if (current.suspended) { if (!world.wasPaused) release(); world.wasPaused = true; return; }
      atmosphere.update(now / 1000, current.night, current.farm.weather === 'rainy');
      const dogHead = shiba.userData.head;
      const watching = camera.position.distanceTo(shiba.position) < 6;
      const headTurn = watching ? T.MathUtils.clamp(Math.atan2(camera.position.x - shiba.position.x, camera.position.z - shiba.position.z), -.7, .7) : 0;
      dogHead.rotation.y = T.MathUtils.damp(dogHead.rotation.y, headTurn, 4, dt);
      dogHead.rotation.z = Math.sin(now * .0014) * .035;
      meta.roofPatch.visible = !!current.farm.roof; meta.divider.visible = false;
      scene.userData.barnShell.visible = current.farm.fenceLevel >= 2;
      scene.userData.roofCover.visible = !!current.farm.roof;
      meta.fenceStages.forEach((fence, level) => { fence.visible = level === (current.farm.fenceLevel || 0); fence.scale.z = .75 + (current.farm.expansion || 0) * .125; fence.position.z = 8 * (1 - fence.scale.z); });
      meta.merchant.visible = !!current.merchantPresent && !current.night;
      if (meta.shop.userData.clerk) meta.shop.userData.clerk.visible = !current.night;
      meta.storage.children.forEach((bale, index) => { bale.visible = index < Math.ceil((current.farm.storedHay || 0) / 2); });
      const gateOpen = current.farm.pastureOpen || Math.hypot(camera.position.x, camera.position.z - 8) < 4;
      for (const gate of meta.gates) gate.rotation.y = T.MathUtils.lerp(gate.rotation.y, gateOpen ? gate.userData.side * -1.45 : 0, 1 - Math.exp(-dt * 5));
      meta.deity.visible = current.deityStage > 0;
      meta.deity.traverse(o => { if (o.isMesh) o.material.opacity = current.deityStage * (o.userData.eye ? 0.85 : 0.42); });
      if (lastPhase !== current.night) {
        lastPhase = current.night;
        scene.fog = new T.FogExp2(current.night ? 0x233947 : 0xb7c8b3, current.night ? 0.018 : 0.009);
        sky.intensity = current.night ? 0.85 : 2.1; sky.color.set(current.night ? 0x9cb9db : 0xd5e8e2);
        sun.intensity = current.night ? 0.8 : 2.5; sun.color.set(current.night ? 0x9fbce7 : 0xffdfa5);
        rim.intensity = current.night ? 0.9 : 0.35;
        sun.castShadow = !current.night; torchLight.castShadow = current.night;
        moon.visible = current.night;
        world.lastPen = null;
        world.resetPopulation = true;
        if (current.night && current.fullMoon) sound('howl');
      }
      const ids = new Set(current.animals.map(a => a.id));
      if (current.animals.length > 10) world.dense = true;
      const outside = !current.night && current.farm.pastureOpen;
      const layout = outside ? 'pasture' : `shared-${current.farm.expansion || 0}`;
      if (world.layout !== layout || world.resetPopulation) { for (const object of animalMap.values()) scene.remove(object); animalMap.clear(); world.layout = layout; world.resetPopulation = false; }
      populationChanged = false;
      for (const [id, object] of animalMap) if (!ids.has(id)) { scene.remove(object); animalMap.delete(id); }
      const penIndexes = [0, 0];
      current.animals.forEach((animal, index) => {
        const p = animal.penId || 0, localIndex = penIndexes[p]++;
        const visualKey = `${animal.age}-${animal.isSheared}-${animal.type}-${animal.hidden}-${animal.tell}-${current.farm.divided}-${current.difficulty}`;
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
        if (!outside) { const rows = Math.ceil(current.animals.length / 4), step = Math.min(2.65, (8.4 + (current.farm.expansion || 0) * 2.2375) / Math.max(1, rows - 1)); slot = [[-4.5, -1.5, 1.5, 4.5][index % 4], 4.2 - Math.floor(index / 4) * step]; }
        if (outside) slot = [-18 + index % 4 * 1.9, -6 + Math.floor(index / 4) * 2.2];
        const object = kit.sheep(animal, index, current.difficulty);
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
        const hunger = object.userData.animal.hunger ?? 100;
        object.userData.hungerBar.visible = !current.night && !selected && object.position.distanceTo(camera.position) < 5;
        object.userData.hungerBar.quaternion.copy(object.quaternion.clone().invert().multiply(camera.quaternion));
        object.userData.hungerFill.scale.x = hunger / 100; object.userData.hungerFill.position.x = (hunger / 100 - 1) / 2;
        object.position.y = Math.sin(now * 0.0018 + object.userData.index) * 0.018;
        object.userData.head.rotation.x = Math.sin(now * 0.0013 + object.userData.index) * 0.025;
        const blink = (now / 1000 + object.userData.index * 1.71) % 5.4;
        for (const eye of object.userData.eyes) eye.scale.y = blink < 0.13 ? 0.12 : 1;
        object.userData.ears.forEach((ear, i) => { ear.rotation.x = Math.sin(now * 0.0017 + object.userData.index + i * 2) * 0.07; });
        object.userData.ring.visible = selected === object;
      }
      heldTorch.visible = !selected && !current.paused;
      heldTorch.position.y = -0.28 + Math.sin(now * 0.0015) * 0.008;
      camera.getWorldDirection(direction);
      torchLight.position.copy(camera.position).addScaledVector(direction, 0.25);
      torchLight.target.position.copy(camera.position).addScaledVector(direction, 15);
      torchLight.intensity = world.torchOn ? (current.night ? 31 : 7) : 0;
      if (selected) { torchLight.intensity = current.night ? 24 : 9; torchLight.target.position.copy(desiredLook); }
      if (!selected && !current.paused && now - tick > 100) {
        setOutsideView(camera.position.z > 8.3 || Math.abs(camera.position.x) > 8.3);
        tick = now;
        const found = findTarget(), object = found ? animalMap.get(found.animal.id) : null;
        world.lastTarget = found;
        for (const model of animalMap.values()) model.userData.ring.visible = model === object;
        const label = found ? `${found.animal.id}-${found.animal.name}-${Math.round(found.distance * 2) / 2}` : '';
        if (label !== world.targetLabel) { world.targetLabel = label; setTarget(found ? { name: found.animal.name, merchant: found.animal.merchant, activity: found.animal.action || found.animal.activity, near: found.distance <= 3.3, distance: found.distance.toFixed(1) } : null); }
      }
      renderer.render(scene, camera);
    }
    frame = requestAnimationFrame(animate);
    return () => {
      disposed = true; if (controlsRef) controlsRef.current = null; cancelAnimationFrame(frame); observer.disconnect(); release();
      renderer.domElement.removeEventListener('pointerdown', pointerDown); renderer.domElement.removeEventListener('pointermove', pointerMove); renderer.domElement.removeEventListener('pointerup', up); renderer.domElement.removeEventListener('lostpointercapture', up);
      renderer.domElement.removeEventListener('focus', activateKeyboard);
      document.removeEventListener('keydown', keyDown, true); document.removeEventListener('keyup', keyUp, true); document.removeEventListener('compositionstart', clearInput); document.removeEventListener('compositionend', clearInput); document.removeEventListener('pointerlockchange', lockChange); window.removeEventListener('blur', loseFocus); document.removeEventListener('visibilitychange', visibility);
      atmosphere.dispose(); moon.geometry.dispose(); moon.material.dispose(); torchLight.shadow.map?.dispose(); sun.shadow.map?.dispose(); kit.dispose(); renderer.dispose(); renderer.domElement.remove(); engine.current = null;
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
    {outsideView && farm?.weather === 'rainy' && <div className="weather-rain" aria-hidden="true" />}
    {error ? <div className="fp-error"><h3>Không thể mở cảnh 3D</h3><p>{error}</p></div> : <>
      <div className="fp-world-label"><i className="live-dot" />TRẠI SƯƠNG <span>{night ? 'CA GÁC BAN ĐÊM' : 'DẠO QUANH TRẠI'} · GÓC NHÌN THỨ NHẤT</span></div>
      {!paused && !selectedId && <><div className={`fp-crosshair ${target?.near ? 'has-target' : ''}`} aria-hidden="true"><i /><i /></div>
        {target?.near && <div className="fp-target" role="status"><strong>{target.name}</strong><span>E · Tương tác</span></div>}
        <div className="fp-toolbar"><button className="fp-tool" onClick={() => { if (engine.current) { engine.current.torchOn = !engine.current.torchOn; setTorch(engine.current.torchOn); } }}><Icon name="lamp" size={16} />{torch ? 'Đèn bật' : 'Đèn tắt'}<kbd>F</kbd></button><button className="fp-tool" onClick={() => engine.current?.lock()}>{locked ? 'Chuột khóa · Ctrl phải để mở' : 'Khóa chuột · Ctrl phải'}</button></div>
        <div className="fp-bottom"><span><kbd>W A S D</kbd> Đi lại <i>·</i> Rê chuột / ← → nhìn <i>·</i> <kbd>Ctrl phải</kbd> Mở chuột <i>·</i> <kbd>C</kbd> Cúi <i>·</i> <kbd>Shift</kbd> Đi nhanh</span><span>{hint}</span></div>
        {target?.near && <button className="fp-interact button primary" onClick={() => engine.current?.interact()}>{target?.activity || target?.merchant ? target.name : night ? 'Kiểm tra' : 'Xem cừu'}<kbd>E</kbd></button>}
        <div className="fp-touch-pad" aria-label="Điều khiển di chuyển"><button aria-label="Đi tới" onPointerDown={e => touchMove(e, 1, 0)} onPointerUp={stopTouch} onLostPointerCapture={stopTouch}>↑</button><div><button aria-label="Đi sang trái" onPointerDown={e => touchMove(e, 0, -1)} onPointerUp={stopTouch} onLostPointerCapture={stopTouch}>←</button><button aria-label="Đi lùi" onPointerDown={e => touchMove(e, -1, 0)} onPointerUp={stopTouch} onLostPointerCapture={stopTouch}>↓</button><button aria-label="Đi sang phải" onPointerDown={e => touchMove(e, 0, 1)} onPointerUp={stopTouch} onLostPointerCapture={stopTouch}>→</button></div></div>
      </>}
    </>}{children}
  </div>;
}

export function FieldInspection({ animal, state, dispatch, part, onPart, onClose }) {
  const daytime = state.phase === 'day';
  const [notice, setNotice] = useState(daytime ? 'Bạn đang nhìn cừu ngay trong chuồng. Ban đêm mới dùng năng lượng để điều tra.' : 'Chọn bộ phận để cúi gần, quan sát dấu hiệu rồi xác nhận.');
  function check(id) {
    if (!id || daytime || animal.checked.includes(id) || state.energy < 1 || id === 'wool' && (!state.inventory.battery || !state.inventory.clipper)) return;
    dispatch({ type: 'CHECK', id: animal.id, part: id }); sound('click');
    setNotice(id === 'wool' ? 'Đã cạo lông. Con cừu này là thật.' : 'Không có dấu hiệu ở bộ phận vừa xem. Hãy soi những chỗ khác.');
  }
  useEffect(() => { const key = event => { if (event.code === 'Escape') { event.preventDefault(); onClose(); } }; document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key); }, [onClose]);
  useEffect(() => { if (!daytime && !state.inventory.clipper) setNotice('Tông đơ đã hỏng. Cần mua chiếc mới từ người bán ban ngày.'); }, [state.inventory.clipper, daytime]);
  return <section className="fp-inspect-panel" aria-label={`Kiểm tra tại chỗ ${animal.name}`}><div className="fp-inspect-title"><span className="eyebrow">{daytime ? 'QUAN SÁT' : 'ĐIỀU TRA'} · {animal.name}</span><button className="icon-button" aria-label="Trở lại di chuyển" onClick={onClose}><Icon name="close" size={16} /></button></div><h3>Nhìn kỹ dưới lớp lông.</h3><div className="fp-part-buttons">{[{ id: 'eyes', text: 'Mắt' }, { id: 'paws', text: 'Chân' }, { id: 'teeth', text: 'Miệng' }, { id: 'body', text: 'Thân' }, { id: 'tail', text: 'Đuôi' }].map(p => <button key={p.id} className={part === p.id ? 'active' : ''} onClick={() => { onPart(p.id); setNotice(daytime ? 'Có thể đi quanh và ngắm cừu. Trở lại vào ban đêm để tìm sói.' : 'Đã cúi gần. Hãy quan sát rồi bấm Kiểm tra nếu thấy khả nghi.'); }}>{p.text}{animal.checked?.includes(p.id) && ' ✓'}</button>)}</div><p role="status">{notice}</p>{!daytime && <div className="fp-check-buttons"><button className="button primary" disabled={!part || state.energy < 1 || animal.checked.includes(part)} onClick={() => check(part)}>Kiểm tra · −1</button><button className="button secondary" disabled={state.energy < 1 || !state.inventory.battery || !state.inventory.clipper || animal.checked.includes('wool')} onClick={() => check('wool')}>Cạo lông · −1 + pin</button></div>}<small><Icon name="bolt" size={12} />{daytime ? `${animal.age === 'baby' ? 'Cừu con · lớn sau 2 ngày' : 'Cừu lớn · 1 xu/ngày khi đủ no'}` : `${state.energy}/2 năng lượng · ${state.inventory.battery} pin`} · Esc đứng dậy</small></section>;
}
