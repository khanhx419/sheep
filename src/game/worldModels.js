import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { WALLS } from './worldMath.js';

// All game-world art is real geometry, so clues remain visible from every side.
export function createModelKit() {
  const geometries = new Set(), materials = new Set();
  const sphere = new T.SphereGeometry(1, 10, 7), box = new T.BoxGeometry(1, 1, 1);
  geometries.add(sphere); geometries.add(box);
  const colors = new Map();
  function mat(color, emissive = 0) {
    const key = `${color}-${emissive}`;
    if (!colors.has(key)) {
      const m = new T.MeshStandardMaterial({ color, roughness: 1, flatShading: true, emissive, emissiveIntensity: emissive ? 0.7 : 0 });
      colors.set(key, m); materials.add(m);
    }
    return colors.get(key);
  }
  function mesh(parent, geometry, material, x, y, z, sx = 1, sy = sx, sz = sx) {
    const object = new T.Mesh(geometry, material);
    object.position.set(x, y, z); object.scale.set(sx, sy, sz);
    object.castShadow = true; object.receiveShadow = true; parent.add(object); return object;
  }
  const cube = (p, c, x, y, z, sx, sy, sz) => mesh(p, box, mat(c), x, y, z, sx, sy, sz);
  const ball = (p, c, x, y, z, sx, sy = sx, sz = sx) => mesh(p, sphere, mat(c), x, y, z, sx, sy, sz);
  function cylinder(parent, color, radius, height, x, y, z, top = radius, sides = 8) {
    const g = new T.CylinderGeometry(top, radius, height, sides); geometries.add(g);
    return mesh(parent, g, mat(color), x, y, z);
  }
  function sheep(animal, index) {
    const group = new T.Group();
    const wool = new T.Group(); group.add(wool);
    const sheared = animal.isSheared || animal.disguise === 'sheared';
    const shade = [0xece1be, 0xe5d8b7, 0xf2e9d0][index % 3];
    ball(wool, sheared ? 0xc1a98b : shade, 0, 0.92, 0, sheared ? 0.52 : 0.74, sheared ? 0.49 : 0.69, sheared ? 0.72 : 0.92);
    for (let row = 0; !sheared && row < 3; row++) for (let j = 0; j < 9; j++) {
      const a = j / 9 * Math.PI * 2 + row * 0.24;
      ball(wool, shade, Math.cos(a) * (row === 1 ? 0.6 : 0.46), 0.59 + row * 0.32, Math.sin(a) * (row === 1 ? 0.72 : 0.61), 0.28, 0.29, 0.3);
    }
    if (animal.type === 'lean' && !animal.hidden) for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
      const rib = cube(group, 0x7a6d5a, side * 0.5, 0.95, -0.42 + i * 0.23, 0.055, 0.35, 0.055); rib.rotation.x = -0.2;
      rib.userData.part = 'body';
    }
    if (animal.type === 'alpha' && !animal.hidden) { wool.scale.set(1.32, 1.08, 1.12); wool.userData.part = 'body'; }
    const head = new T.Group(); head.position.set(0, 1.2, 0.73); group.add(head);
    ball(head, 0x8a6a52, 0, 0, 0, 0.39, 0.43, 0.38);
    ball(head, 0xab8562, 0, -0.12, 0.25, 0.3, 0.23, 0.23);
    ball(head, 0x382d29, 0, -0.05, 0.45, 0.11, 0.075, 0.055);
    if (animal.type === 'rabid' && !animal.hidden) { const drool = ball(head, 0xc6d4b0, 0.14, -0.38, 0.42, 0.035, 0.19, 0.035); drool.userData.part = 'teeth'; }
    if ((animal.tell === 'teeth' || animal.type === 'pup') && !animal.hidden) {
      ball(head, 0x382d29, 0, -0.22, 0.4, 0.17, 0.075, 0.065);
      for (const side of [-1, 1]) { const g = new T.ConeGeometry(0.045, 0.16, 5); geometries.add(g); const fang = mesh(head, g, mat(0xf4e6ba), side * 0.1, -0.25, 0.46); fang.rotation.z = Math.PI; fang.userData.part = 'teeth'; }
    }
    for (const side of [-1, 1]) {
      const ear = ball(head, 0x957257, side * 0.43, 0.07, 0, 0.27, 0.1, 0.16); ear.rotation.z = side * -0.3;
      ball(head, 0xd4a38c, side * 0.45, 0.105, 0.065, 0.18, 0.045, 0.09);
      ball(head, shade, side * 0.15, 0.31, -0.02, 0.24, 0.19, 0.2);
      ball(head, 0xfff2d6, side * 0.18, 0.09, 0.29, 0.13, 0.16, 0.1);
      const iris = mesh(head, sphere, mat(animal.wolf && animal.tell === 'eyes' ? 0xbf3925 : 0x332c24,
        animal.wolf && animal.tell === 'eyes' ? 0xe63716 : 0), side * 0.18, 0.095, 0.372, 0.077, 0.105, 0.045);
      iris.userData.part = 'eyes';
      ball(head, 0xfff8e5, side * 0.18 - 0.02, 0.13, 0.411, 0.025);
      for (const z of [-0.46, 0.48]) {
        cylinder(group, 0x87684d, 0.105, 0.42, side * 0.43, 0.28, z);
        ball(group, 0x3e3831, side * 0.43, 0.15, z + 0.04, 0.145, 0.13, 0.19);
        if (animal.wolf && animal.tell === 'paws') for (let claw = -1; claw <= 1; claw++) {
          const g = new T.ConeGeometry(0.05, 0.25, 5); geometries.add(g);
          const m = mesh(group, g, mat(0xb9b7a6), side * 0.43 + claw * 0.085, 0.1, z + 0.24);
          m.rotation.x = Math.PI / 2; m.userData.part = 'paws';
        }
      }
    }
    if (animal.wolf && animal.tell === 'tail') {
      const tail = new T.Group(); tail.position.set(0, 0.83, -0.7); tail.rotation.x = -0.55; group.add(tail);
      ball(tail, 0x515d65, 0, -0.25, -0.35, 0.2, 0.3, 0.58);
      ball(tail, 0x9a9a8b, 0, -0.39, -0.78, 0.13, 0.18, 0.28); tail.userData.part = 'tail';
    } else ball(group, shade, 0, 0.91, -0.88, 0.2, 0.21, 0.21);
    group.userData = { animalId: animal.id, head, wool, baseY: 0, index };
    if (animal.age === 'baby' || animal.disguise === 'baby') group.scale.setScalar(0.63);
    group.rotation.y = [0.25, -0.25, 0.5, -0.5, 0.1][index % 5];
    const ringGeometry = new T.RingGeometry(0.88, 0.92, 40); geometries.add(ringGeometry);
    const ringMat = new T.MeshBasicMaterial({ color: 0xe6c686, side: T.DoubleSide, transparent: true, opacity: 0.8 }); materials.add(ringMat);
    const ring = new T.Mesh(ringGeometry, ringMat); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.055; ring.visible = false; group.add(ring); group.userData.ring = ring;
    return group;
  }
  function environment(scene) {
    cube(scene, 0x526b46, 0, -0.25, 0, 55, 0.45, 55);
    cube(scene, 0x81724e, 0, -0.015, -1, 16, 0.08, 18);
    // Broad planks, intentionally simplified like a hand-built cartoon set.
    for (let i = 0; i < 16; i++) {
      for (const side of [-1, 1]) cube(scene, i % 2 ? 0x72513a : 0x7c593d, side * 8, 1.7, -9.45 + i * 1.1, 0.26, 3.4, 1.04);
      cube(scene, i % 2 ? 0x6c4c36 : 0x77523a, -7.5 + i, 1.7, -10, 0.96, 3.4, 0.3);
    }
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) cube(scene, 0x77523a, side * (3.9 + i * 1.1), 1.7, 8, 1.04, 3.4, 0.25);
      for (const z of [-9.8, -4, 2, 7.9]) cube(scene, 0x483b30, side * 7.7, 2.1, z, 0.42, 4.2, 0.42);
      cube(scene, 0x4c3d31, side * 7.8, 3.3, -1, 0.4, 0.4, 18.5);
      // Raised roof with a central skylight lets moonlight into the barn.
      const roof = cube(scene, 0x493c34, side * 4.4, 4.5, -1, 8.2, 0.2, 18.8); roof.rotation.z = side * -0.22;
      for (const z of [-7, 0, 6]) cube(scene, 0x50412f, 0, 3.5, z, 16.2, 0.22, 0.24);
      for (const z of [-5.5, 1.4]) {
        cube(scene, 0x332d25, side * 7.2, 2.4, z, 0.25, 0.5, 0.25);
        mesh(scene, box, mat(0xf7b65d, 0xfca32e), side * 7.2, 2.4, z + 0.16, 0.18, 0.32, 0.18);
        const lantern = new T.PointLight(0xffba64, 13, 8, 1.6); lantern.position.set(side * 7, 2.35, z + 0.3); scene.add(lantern);
      }
    }
    // Hay bales match two collision rectangles.
    for (const obstacle of WALLS.slice(5)) {
      cube(scene, 0xb59a56, obstacle.x, 0.5, obstacle.z, obstacle.w, 1, obstacle.d);
      cube(scene, 0x766240, obstacle.x, 0.5, obstacle.z, 0.13, 1.03, obstacle.d + 0.04);
      for (let i = 0; i < 8; i++) cube(scene, 0xc7aa65, obstacle.x - 1 + i * 0.29, 1.02, obstacle.z, 0.08, 0.04, 1.8);
    }
    for (let i = 0; i < 46; i++) {
      const seed = i * 2.3999, radius = 26 + i % 3 * 3;
      const x = Math.cos(seed) * radius, z = Math.sin(seed) * radius;
      cylinder(scene, 0x5b4736, 0.18, 2.3, x, 1.15, z);
      for (let tier = 0; tier < 3; tier++) {
        const g = new T.ConeGeometry(2.2 - tier * 0.45, 3.7, 6); geometries.add(g);
        mesh(scene, g, mat([0x314c3b, 0x3b5a42, 0x456247][tier]), x, 3.2 + tier * 1.4, z);
      }
    }
    for (let i = 0; i < 23; i++) for (const side of [-1, 1]) {
      cube(scene, 0x715b41, side * 23.5, 0.7, -22 + i * 2, 0.15, 1.4, 0.15);
      cube(scene, 0x8e7550, side * 23.5, 0.6, -22 + i * 2, 0.1, 0.12, 2.1);
      cube(scene, 0x8e7550, side * 23.5, 1.15, -22 + i * 2, 0.1, 0.12, 2.1);
      cube(scene, 0x715b41, -22 + i * 2, 0.7, side * 23.5, 0.15, 1.4, 0.15);
      cube(scene, 0x8e7550, -22 + i * 2, 0.6, side * 23.5, 2.1, 0.12, 0.1);
      cube(scene, 0x8e7550, -22 + i * 2, 1.15, side * 23.5, 2.1, 0.12, 0.1);
    }
    // Scattered straw and tufted grass use seeded positions, never random per frame.
    for (let i = 0; i < 100; i++) {
      const x = Math.sin(i * 18.13) * 21, z = Math.cos(i * 7.31) * 21;
      if (Math.abs(x) < 8.5 && z < 8.5 && z > -10.5) { const straw = cube(scene, 0xb4a46f, x, 0.05, z, 0.35, 0.02, 0.04); straw.rotation.y = i; }
      else for (let j = 0; j < 3; j++) { const blade = cube(scene, i % 2 ? 0x799057 : 0x8a9a61, x + j * 0.09, 0.16, z, 0.04, 0.32, 0.08); blade.rotation.z = (j - 1) * 0.35; }
    }
    // Bake static set pieces into one mesh per material instead of hundreds
    // of individual draw calls. Dynamic animals remain independently selectable.
    scene.updateMatrixWorld(true);
    const batches = new Map();
    for (const object of [...scene.children]) if (object.isMesh) {
      if (!batches.has(object.material)) batches.set(object.material, []);
      batches.get(object.material).push(object);
    }
    for (const [material, objects] of batches) {
      const transformed = objects.map(o => o.geometry.clone().applyMatrix4(o.matrixWorld));
      const merged = mergeGeometries(transformed, false);
      transformed.forEach(g => g.dispose());
      if (!merged) continue;
      geometries.add(merged);
      const baked = new T.Mesh(merged, material); baked.castShadow = true; baked.receiveShadow = true;
      scene.add(baked); objects.forEach(o => scene.remove(o));
    }
  }
  function flashlight(camera) {
    const holder = new T.Group(); holder.position.set(0.3, -0.28, -0.6); holder.rotation.x = -Math.PI / 2; camera.add(holder);
    cylinder(holder, 0x384d42, 0.09, 0.42, 0, 0, 0);
    cylinder(holder, 0x252e2b, 0.135, 0.12, 0, 0.25, 0);
    mesh(holder, sphere, mat(0xe9d5a5, 0xd1b973), 0, 0.32, 0, 0.11, 0.02, 0.11);
    cube(holder, 0x94765c, 0.04, -0.03, 0.06, 0.19, 0.16, 0.12);
    return holder;
  }
  function supplements(scene) {
    const roofPatch = new T.Group(); scene.add(roofPatch); cube(roofPatch, 0x5d4b37, 0, 5.4, -1, 0.9, 0.16, 18.8);
    const divider = new T.Group(); scene.add(divider);
    for (const z of [-9.5, -6, -2.5, 1, 3.5, 6.8, 8]) cube(divider, 0x6b4e35, 0, 0.68, z, 0.16, 1.36, 0.16);
    for (const y of [0.5, 1]) { cube(divider, 0xa48152, 0, y, -3.2, 0.12, 0.13, 13.4); cube(divider, 0xa48152, 0, y, 7.4, 0.12, 0.13, 1.2); }
    const deity = new T.Group(); deity.position.set(20, 7, 31); scene.add(deity);
    ball(deity, 0x93aebc, 0, -2, 0, 3, 4, 2); ball(deity, 0x93aebc, 0, 1.7, 0, 2.7, 2.6, 1.8);
    ball(deity, 0x93aebc, 0, 0.8, -1.7, 1.5, 0.8, 1.7);
    for (const side of [-1, 1]) {
      const g = new T.ConeGeometry(1.3, 4, 4); geometries.add(g); mesh(deity, g, mat(0x93aebc), side * 1.9, 4.3, 0);
      const eye = ball(deity, 0xd9e2ed, side * 1, 2.2, -1.7, 0.27, 0.14, 0.12); eye.userData.eye = true;
    }
    deity.traverse(o => { if (o.isMesh) { const m = new T.MeshBasicMaterial({ color: o.material.color, transparent: true, opacity: 0, depthWrite: false }); materials.add(m); o.material = m; } });
    const merchant = new T.Group(); merchant.position.set(-4, 0, 12.5); scene.add(merchant);
    cylinder(merchant, 0x31323c, 0.58, 1.6, 0, 0.8, 0, 0.25); ball(merchant, 0x2e3037, 0, 1.8, 0, 0.38, 0.42, 0.35);
    ball(merchant, 0x8e806a, 0, 1.72, -0.28, 0.17, 0.18, 0.1); cylinder(merchant, 0x413c3b, 0.05, 1.8, 0.6, 0.9, 0);
    cube(merchant, 0x916b3c, 0.6, 1.15, -0.08, 0.2, 0.27, 0.2);
    const glow = new T.PointLight(0xeebf71, 7, 5, 1.5); glow.position.set(0.6, 1.1, -0.15); merchant.add(glow);
    return { roofPatch, divider, deity, merchant };
  }
  return { sheep, environment, flashlight, supplements, dispose() { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); } };
}
