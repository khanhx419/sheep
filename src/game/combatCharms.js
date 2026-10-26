import * as T from 'three';

export function createCombatCharms(scene) {
  const root = new T.Group(); root.name = 'Phép thuật bùa'; scene.add(root);
  const cardGeometry = new T.BoxGeometry(.23, .36, .025), ringGeometry = new T.RingGeometry(.78, 1, 40), glowGeometry = new T.SphereGeometry(1, 12, 8);
  const paperMaterial = new T.MeshStandardMaterial({ color: 0xe5bd89, emissive: 0xd27b3d, emissiveIntensity: .7, roughness: .85 });
  const flameMaterial = new T.MeshBasicMaterial({ color: 0xeeaa69, transparent: true, opacity: .5, depthWrite: false });
  const ringMaterial = new T.MeshBasicMaterial({ color: 0xf1bf82, transparent: true, opacity: .7, side: T.DoubleSide, depthWrite: false });
  const blinkMaterial = new T.MeshBasicMaterial({ color: 0xb2b4f1, transparent: true, opacity: .6, side: T.DoubleSide, depthWrite: false });
  const paper = new T.Mesh(cardGeometry, paperMaterial), blast = new T.Mesh(glowGeometry, flameMaterial), blastRing = new T.Mesh(ringGeometry, ringMaterial);
  blastRing.rotation.x = -Math.PI / 2;
  const blinkRings = [0, 1].map(() => { const mesh = new T.Mesh(ringGeometry, blinkMaterial); mesh.rotation.x = -Math.PI / 2; root.add(mesh); return mesh; });
  const embers = new T.InstancedMesh(cardGeometry, paperMaterial, 20), transform = new T.Object3D(); embers.frustumCulled = false;
  root.add(paper, blast, blastRing, embers);
  return {
    root,
    update(engine) {
      const t = engine.time, bomb = engine.bomb, explosion = engine.bombExplosion, blink = engine.blinkEffect;
      paper.visible = !!bomb;
      if (bomb) { const p = Math.min(1, (t - bomb.castAt) / .65); paper.position.set(T.MathUtils.lerp(bomb.from.x, engine.wolf.x, p), .85 + Math.sin(p * Math.PI) * 2.7, T.MathUtils.lerp(bomb.from.z, engine.wolf.z, p)); paper.rotation.set(p * 8, p * 5, p * 10); }
      const age = explosion ? t - explosion.at : 10;
      blast.visible = blastRing.visible = age >= 0 && age < .65;
      if (blast.visible) { blast.position.set(explosion.x, .7, explosion.z); blast.scale.setScalar(.2 + age * 2.8); flameMaterial.opacity = .45 * (1 - age / .65); blastRing.position.set(explosion.x, .07, explosion.z); blastRing.scale.setScalar(.4 + age * 4); ringMaterial.opacity = .8 * (1 - age / .65); }
      const blinkAge = blink ? t - blink.at : 10;
      blinkRings.forEach((mesh, i) => { mesh.visible = blinkAge >= 0 && blinkAge < .6; if (mesh.visible) { const point = i ? blink.to : blink.from; mesh.position.set(point.x, .08 + Math.sin(blinkAge * Math.PI / .6) * .08, point.z); mesh.scale.setScalar((i ? .4 : 1) + blinkAge * (i ? 2 : -.8)); blinkMaterial.opacity = .8 * (1 - blinkAge / .6); } });
      const flash = blinkAge < age ? blink : explosion, life = Math.min(age, blinkAge);
      embers.visible = !!flash && life >= 0 && life < .6;
      if (embers.visible) for (let i = 0; i < 20; i++) {
        const point = flash.to || flash, a = i * 2.399;
        transform.position.set(point.x + Math.sin(a) * life * 3, .3 + Math.sin(life * Math.PI / .6) * (1 + i % 4 * .15), point.z + Math.cos(a) * life * 3);
        transform.rotation.set(a + life * 4, a, life * 8); transform.scale.setScalar(.4 * (1 - life / .6)); transform.updateMatrix(); embers.setMatrixAt(i, transform.matrix);
      }
      if (embers.visible) embers.instanceMatrix.needsUpdate = true;
    },
    dispose() { scene.remove(root); [cardGeometry, ringGeometry, glowGeometry].forEach(g => g.dispose()); [paperMaterial, flameMaterial, ringMaterial, blinkMaterial].forEach(m => m.dispose()); },
  };
}
