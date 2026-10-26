import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { createModelKit } from './worldModels.js';
import { createAtmosphere } from './worldAtmosphere.js';
import { animateWolf } from './combatAnimation.js';

export default function CombatDiorama({ type, turn, hp, reveal = false }) {
  const host = useRef(null), latest = useRef(null);
  const [failed, setFailed] = useState(false);
  latest.current = { turn, hp, reveal };
  useEffect(() => {
    let renderer;
    try { renderer = new T.WebGLRenderer({ antialias: true, alpha: false }); }
    catch { setFailed(true); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFShadowMap; renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.domElement.setAttribute('aria-label', 'Sói 3D trong sân giao chiến ngoài chuồng'); host.current.appendChild(renderer.domElement);
    const scene = new T.Scene(); scene.fog = new T.FogExp2(0x263e47, 0.018);
    const camera = new T.PerspectiveCamera(44, 1, 0.1, 100);
    camera.position.set(0, 2.5, 22); camera.lookAt(0, 1.25, 15.5);
    const kit = createModelKit(); kit.environment(scene); const atmosphere = createAtmosphere(scene);
    scene.userData.shopCrates.visible = false;
    scene.add(new T.HemisphereLight(0xa5c6dc, 0x665e45, 1.9));
    const key = new T.DirectionalLight(0xffd79c, 3); key.position.set(-4, 7, 21); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -7; key.shadow.camera.right = 7;
    key.shadow.camera.top = 6; key.shadow.camera.bottom = -6; key.shadow.camera.far = 30;
    key.target.position.set(-1.6, 0, 16); key.shadow.bias = -0.0005; scene.add(key, key.target);
    const rim = new T.DirectionalLight(0x91bbdd, 2.3); rim.position.set(4, 5, 10); scene.add(rim);
    const wolf = kit.wolf(type); wolf.position.set(reveal ? 0 : -1.7, 0, 16); wolf.rotation.y = 0.12; scene.add(wolf);
    const resize = () => { const { width, height } = host.current.getBoundingClientRect(); if (!width || !height) return; renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(host.current); resize();
    let frame, previousHp = latest.current.hp, hitAt = -10, defeatedAt = null;
    const draw = now => {
      frame = requestAnimationFrame(draw); if (document.hidden) return;
      const t = now / 1000, current = latest.current;
      if (current.hp < previousHp) hitAt = t; previousHp = current.hp;
      if (current.turn === 'victory' && defeatedAt == null) defeatedAt = t;
      const cycle = t % 2.8, stage = current.turn !== 'enemy' ? 'wait' : cycle < 1.1 ? 'windup' : cycle < 2 ? 'strike' : 'recover';
      const start = stage === 'strike' ? 1.1 : stage === 'recover' ? 2 : 0, duration = stage === 'windup' ? 1.1 : stage === 'strike' ? .9 : .8;
      animateWolf(wolf, { time: t, timer: duration - (cycle - start), stageDuration: duration, castCount: Math.floor(t / 2.8), stage, pattern: reveal ? 'burst' : 'slam', player: { x: 0, z: 22 }, wolf: { x: reveal ? 0 : -1.7, z: 16 }, effects: [] }, { hitAt, deadAt: defeatedAt });
      atmosphere.update(t, true);
      scene.userData.countryside.update(t, true);
      scene.userData.ambience.update(t, { night: true });
      scene.userData.planting.update(t);
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); atmosphere.dispose(); kit.dispose(); key.shadow.map?.dispose(); renderer.dispose(); renderer.domElement.remove(); };
  }, [type, reveal]);
  return <div className="combat-diorama" ref={host}>{failed && <div className="combat-scene-fallback">☾<span>Sói đang chờ ngoài sân trại.</span></div>}</div>;
}
