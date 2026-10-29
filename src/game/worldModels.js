import { translate, subscribeLanguage } from './i18n.js';
import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { WALLS, DOG_HOME } from './worldMath.js';
import { landscape, farmStall } from './worldLandscape.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createMeadow } from './worldMeadow.js';
import { createCountryside } from './worldCountryside.js';
import { createFarmAmbience } from './worldAmbience.js';
import { createFarmPlanting } from './worldPlanting.js';

// All game-world art is real geometry, so clues remain visible from every side.
export function createModelKit() {
  const geometries = new Set(), materials = new Set(), textures = new Set(), extraDisposers = [];
  const sphere = new T.SphereGeometry(1, 20, 14), box = new RoundedBoxGeometry(1, 1, 1, 1, .035);
  geometries.add(sphere); geometries.add(box);
  const colors = new Map();
  function mat(color, emissive = 0) {
    const key = `${color}-${emissive}`;
    if (!colors.has(key)) {
      const m = new T.MeshStandardMaterial({ color, roughness: 0.88, emissive, emissiveIntensity: emissive ? 0.7 : 0 });
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
  const shadowPixels = new Uint8Array(32 * 32 * 4);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const i = (y * 32 + x) * 4, radius = Math.hypot((x - 15.5) / 15.5, (y - 15.5) / 15.5);
    shadowPixels[i + 3] = Math.round(Math.max(0, 1 - radius) ** 1.5 * 100);
  }
  const shadowTexture = new T.DataTexture(shadowPixels, 32, 32); shadowTexture.needsUpdate = true; textures.add(shadowTexture);
  const shadowMaterial = new T.MeshBasicMaterial({ color: 0x232327, map: shadowTexture, transparent: true, depthWrite: false }); materials.add(shadowMaterial);
  const shadowGeometry = new T.PlaneGeometry(2.4, 2.8); geometries.add(shadowGeometry);
  function cylinder(parent, color, radius, height, x, y, z, top = radius, sides = 8) {
    const g = new T.CylinderGeometry(top, radius, height, sides); geometries.add(g);
    return mesh(parent, g, mat(color), x, y, z);
  }
  function bake(parent) {
    parent.updateMatrixWorld(true);
    const batches = new Map();
    for (const object of [...parent.children]) if (object.isMesh && !object.material.transparent && !object.userData.part) {
      if (!batches.has(object.material)) batches.set(object.material, []);
      batches.get(object.material).push(object);
    }
    for (const [material, objects] of batches) {
      if (objects.length < 2) continue;
      const transformed = objects.map(o => { o.updateMatrix(); const geometry = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); return geometry.applyMatrix4(o.matrix); });
      const merged = mergeGeometries(transformed, false); transformed.forEach(g => g.dispose());
      if (!merged) continue;
      geometries.add(merged);
      const baked = new T.Mesh(merged, material); baked.castShadow = true; baked.receiveShadow = true;
      parent.add(baked); objects.forEach(o => parent.remove(o));
    }
  }
  function sheep(animal, index, difficulty = 'normal') {
    const group = new T.Group();
    const clue = difficulty === 'hard' ? .15 : difficulty === 'easy' ? .8 : .55;
    const showClues = animal.wolf && !animal.hidden;
    const wool = new T.Group(); group.add(wool);
    const sheared = animal.isSheared || animal.disguise === 'sheared';
    const shade = [0xf6e9ce, 0xe8ddc7, 0xfff3da][index % 3];
    const warmWool = [0xe7d6b7, 0xd6c9b3, 0xeadcc2][index % 3];
    ball(wool, sheared ? 0xc1a98b : shade, 0, 0.92, 0, sheared ? 0.52 : 0.74, sheared ? 0.49 : 0.69, sheared ? 0.72 : 0.92);
    for (let row = 0; !sheared && row < 4; row++) for (let j = 0; j < 10; j++) {
      const a = j / 10 * Math.PI * 2 + row * 0.31;
      const radius = [0.43, 0.6, 0.57, 0.36][row], puff = 0.25 + Math.sin(j * 7 + row * 3) * 0.025;
      ball(wool, row === 0 || j % 7 === 0 ? warmWool : shade, Math.cos(a) * radius, 0.55 + row * 0.27, Math.sin(a) * radius * 1.27, puff, puff * 1.04, puff * 1.1);
    }
    if (showClues && animal.type === 'lean') for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
      const rib = cube(group, difficulty === 'hard' ? 0xb29b80 : 0x9d856d, side * .51, .95, -.42 + i * .23, .045, .35 * clue, .045); rib.rotation.x = -.2;
      rib.userData.part = 'body';
    }
    if (showClues && animal.type === 'alpha') { wool.scale.set(1 + .32 * clue, 1 + .08 * clue, 1 + .12 * clue); wool.userData.part = 'body'; }
    const head = new T.Group(); head.position.set(0, 1.2, 0.73); group.add(head);
    ball(head, 0x726056, 0, 0, 0, 0.34, 0.4, 0.35);
    ball(head, 0xa88c76, 0, -0.15, 0.26, 0.28, 0.21, 0.2);
    ball(head, 0x3e3534, 0, -0.08, 0.44, 0.085, 0.06, 0.055);
    ball(head, 0x6e534b, 0, -0.235, 0.431, 0.06, 0.013, 0.012);
    const eyes = [], ears = [], legs = [];
    if (showClues && animal.type === 'rabid') { const drool = ball(head, 0xa6ad92, .14, -.33, .42, .035 * clue, .19 * clue, .035 * clue); drool.userData.part = 'teeth'; }
    if (showClues && (animal.tell === 'teeth' || animal.type === 'pup')) {
      ball(head, 0x382d29, 0, -.22, .4, .17, .075 * clue, .065);
      for (const side of [-1, 1]) { const g = new T.ConeGeometry(.045 * clue, .16 * clue, 5); geometries.add(g); const fang = mesh(head, g, mat(0xd6c9b3), side * .1, -.25, .46); fang.rotation.z = Math.PI; fang.userData.part = 'teeth'; }
    }
    for (const side of [-1, 1]) {
      const ear = new T.Group(); ear.position.set(side * 0.33, 0.05, 0); ear.rotation.z = side * -0.28; head.add(ear); ears.push(ear);
      ball(ear, 0x8a7463, side * 0.15, 0, 0, 0.25, 0.105, 0.15);
      ball(ear, 0xd6a598, side * 0.16, 0.035, 0.065, 0.17, 0.05, 0.07);
      ball(head, shade, side * 0.13, 0.35, -0.08, 0.2, 0.14, 0.19);
      const eye = new T.Group(); eye.position.set(side * 0.16, 0.085, 0.28); head.add(eye); eyes.push(eye);
      ball(eye, 0x58483f, 0, 0, -0.005, 0.13, 0.155, 0.095);
      ball(eye, 0xfff5e3, 0, 0, 0.018, 0.115, 0.14, 0.083);
      const suspiciousEyes = showClues && animal.tell === 'eyes';
      const irisColor = suspiciousEyes ? difficulty === 'hard' ? 0x48413b : difficulty === 'easy' ? 0x9a4937 : 0x6b493e : 0x383e38;
      const iris = mesh(eye, sphere, mat(irisColor), 0, -.004, .09, .068, .087, .032);
      iris.userData.part = 'eyes';
      ball(eye, 0xfff8e5, -0.021, 0.028, 0.12, 0.022);
      ball(eye, 0xfff8e5, 0.02, -0.03, 0.12, 0.009);
      for (const z of [-0.46, 0.48]) {
        const leg = new T.Group(); leg.position.set(side * .43, .49, z); group.add(leg); legs.push(leg);
        cylinder(leg, 0x87684d, 0.105, 0.42, 0, -.21, 0);
        ball(leg, 0x3e3831, 0, -.34, .04, 0.145, 0.13, 0.19);
        if (showClues && animal.tell === 'paws') for (let claw = -1; claw <= 1; claw++) {
          const g = new T.ConeGeometry(.05 * clue, .22 * clue, 5); geometries.add(g);
          const m = mesh(leg, g, mat(difficulty === 'hard' ? 0x827664 : 0xa69d85), claw * .07, -.39, .235);
          m.rotation.x = Math.PI / 2; m.userData.part = 'paws';
        }
      }
    }
    const tail = new T.Group(); group.add(tail);
    if (showClues && animal.tell === 'tail') {
      tail.position.set(0, .83, -.98); tail.rotation.x = -.35; tail.scale.setScalar(clue);
      ball(tail, 0x515d65, 0, -0.25, -0.35, 0.2, 0.3, 0.58);
      ball(tail, 0x9a9a8b, 0, -0.39, -0.78, 0.13, 0.18, 0.28); tail.userData.part = 'tail';
    } else { tail.position.set(0, .91, -.88); ball(tail, shade, 0, 0, 0, .2, .21, .21); }
    group.userData = { animalId: animal.id, head, wool, eyes, ears, legs, tail, baseY: 0, index };
    if (animal.age === 'baby' || animal.disguise === 'baby') group.scale.setScalar(0.63);
    group.rotation.y = [0.25, -0.25, 0.5, -0.5, 0.1][index % 5];
    const ringGeometry = new T.RingGeometry(0.88, 0.92, 40); geometries.add(ringGeometry);
    const ringMat = new T.MeshBasicMaterial({ color: 0xe6c686, side: T.DoubleSide, transparent: true, opacity: 0.8 }); materials.add(ringMat);
    const ring = new T.Mesh(ringGeometry, ringMat); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.055; ring.visible = false; group.add(ring); group.userData.ring = ring;
    const shadow = new T.Mesh(shadowGeometry, shadowMaterial); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.045; shadow.renderOrder = 1; group.add(shadow);
    const hungerBar = new T.Group(); hungerBar.position.y = 1.81; hungerBar.visible = false; group.add(hungerBar);
    const barGeometry = new T.PlaneGeometry(1, .055); geometries.add(barGeometry);
    const backMat = new T.MeshBasicMaterial({ color: 0x253e31, side: T.DoubleSide }), fillMat = new T.MeshBasicMaterial({ color: 0xb8cf80, side: T.DoubleSide }); materials.add(backMat); materials.add(fillMat);
    const back = new T.Mesh(barGeometry, backMat), fill = new T.Mesh(barGeometry, fillMat); fill.position.z = .002; hungerBar.add(back, fill); group.userData.hungerBar = hungerBar; group.userData.hungerFill = fill;
    legs.forEach(bake); bake(tail); bake(wool); bake(head); bake(group);
    return group;
  }
  function environment(scene) {
    cube(scene, 0x617a59, 0, -0.25, 0, 320, 0.45, 320);
    cube(scene, 0x897856, 0, -0.015, -1, 16, 0.08, 18);
    // Irregular boards and inset seams break up the formerly empty floor.
    for (let row = 0; row < 24; row++) for (const side of [-1, 1]) {
      cube(scene, [0x8b7556, 0x96805d, 0x816d53][row % 3], side * 4.08, 0.028, -9.5 + row * 0.73, 7.65, 0.035, 0.705);
      if (row % 3 === 0) for (const x of [-7.2, -0.6, 0.6, 7.2]) ball(scene, 0x594d3e, x, 0.052, -9.5 + row * 0.73, 0.026, 0.006, 0.026);
    }
    // Broad planks, intentionally simplified like a hand-built cartoon set.
    const barnStart = scene.children.length;
    for (let i = 0; i < 16; i++) {
      for (const side of [-1, 1]) cube(scene, i % 2 ? 0x72513a : 0x7c593d, side * 8, 1.7, -9.45 + i * 1.1, 0.26, 3.4, 1.04);
      cube(scene, i % 2 ? 0x6c4c36 : 0x77523a, -7.5 + i, 1.7, -10, 0.96, 3.4, 0.3);
    }
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) cube(scene, 0x77523a, side * (3.9 + i * 1.1), 1.7, 8, 1.04, 3.4, 0.25);
      for (const z of [-9.8, -4, 2, 7.9]) cube(scene, 0x483b30, side * 7.7, 2.1, z, 0.42, 4.2, 0.42);
      cube(scene, 0x4c3d31, side * 7.8, 3.3, -1, 0.4, 0.4, 18.5);
      // Raised roof with a central skylight lets moonlight into the barn.
      const roof = cube(scene, 0x454e4b, side * 4.4, 4.5, -1, 8.2, 0.2, 18.8); roof.rotation.z = side * -0.22; roof.userData.roofPanel = true;
      for (const z of [-7, 0, 6]) cube(scene, 0x50412f, 0, 3.5, z, 16.2, 0.22, 0.24);
      for (const z of [-5.5, 1.4]) {
        cube(scene, 0x303e39, side * 7.2, 2.4, z, 0.28, 0.52, 0.28);
        mesh(scene, box, mat(0xffce87, 0xffb85a), side * 7.2, 2.4, z + 0.16, 0.19, 0.32, 0.18);
        for (const offset of [-0.12, 0.12]) cube(scene, 0x303e39, side * 7.2 + offset, 2.4, z + 0.25, 0.026, 0.48, 0.026);
        cube(scene, 0x303e39, side * 7.2, 2.12, z + 0.1, 0.36, 0.07, 0.35);
        cube(scene, 0x303e39, side * 7.2, 2.68, z + 0.1, 0.38, 0.1, 0.36);
        const lantern = new T.PointLight(0xffc17d, 9, 10, 1.6); lantern.position.set(side * 7, 2.35, z + 0.4); scene.add(lantern);
      }
    }
    // Timber joints, loft shutters, and blue window panes establish a readable set.
    for (const z of [-8, -3, 3, 7.5]) for (const side of [-1, 1]) {
      const brace = cube(scene, 0x574330, side * 6.7, 3.2, z, 2.4, 0.18, 0.22); brace.rotation.z = side * -0.63;
      const rafter = cube(scene, 0x766047, side * 4.2, 4.15, z, 8.3, 0.16, 0.16); rafter.rotation.z = side * -0.22;
    }
    for (const x of [-5.15, 5.15]) {
      cube(scene, 0x3b3933, x, 2.35, -9.78, 2.3, 1.65, 0.16);
      mesh(scene, box, mat(0x8ebcc1, 0x304e64), x, 2.35, -9.67, 1.98, 1.35, 0.04);
      for (const side of [-1, 1]) {
        cube(scene, 0xb39160, x + side * 1.1, 2.35, -9.55, 0.13, 1.8, 0.16);
        cube(scene, 0xb39160, x, 2.35 + side * 0.8, -9.55, 2.3, 0.13, 0.16);
      }
      cube(scene, 0x705b42, x, 2.35, -9.5, 0.075, 1.6, 0.12);
      cube(scene, 0x705b42, x, 2.35, -9.5, 2.2, 0.075, 0.12);
      cube(scene, 0xb39160, x, 1.49, -9.45, 2.5, 0.12, 0.45);
    }
    cube(scene, 0x5b4936, 0, 2.9, -9.55, 5.2, 0.19, 0.7);
    for (let i = 0; i < 7; i++) cube(scene, i % 2 ? 0x94754c : 0x8a6a43, -1.53 + i * 0.51, 2.75, -9.73, 0.47, 1.9, 0.14);
    for (const y of [1.95, 3.5]) cube(scene, 0x4c4033, 0, y, -9.56, 3.65, 0.12, 0.14);
    const loftBrace = cube(scene, 0x4c4033, 0, 2.72, -9.53, 3.6, 0.12, 0.12); loftBrace.rotation.z = 0.43;
    for (const side of [-1, 1]) {
      cube(scene, 0x9d7c4e, side * 3.45, 1.8, 8, 0.38, 3.65, 0.42);
      for (const z of [-8.5, -5, -1.5, 2, 5.5]) {
        cube(scene, 0x96714e, side * 7.84, 1.05, z, 0.08, 0.13, 3.3);
        const brace = cube(scene, 0x4f3f31, side * 7.78, 1.1, z, 0.09, 1.6, 0.12); brace.rotation.x = 0.65;
      }
      // Small feeders are flush with the wall, clear of the playable aisles.
      cube(scene, 0x67543e, side * 7.5, 0.4, -3.5, 0.6, 0.65, 3.1);
      cube(scene, 0xc2a56a, side * 7.5, 0.75, -3.5, 0.53, 0.16, 2.9);
      for (let i = 0; i < 7; i++) cube(scene, 0x9b7d52, side * 7.14, 0.56, -4.85 + i * 0.45, 0.07, 0.62, 0.07);
    }
    const barnShell = new T.Group();
    const roofCover = new T.Group();
    for (const piece of scene.children.slice(barnStart)) { scene.remove(piece); (piece.userData.roofPanel ? roofCover : barnShell).add(piece); }
    for (const side of [-1, 1]) for (const z of [-9.8, -4, 2, 7.9]) cube(roofCover, 0x483b30, side * 7.7, 2.1, z, .25, 4.2, .25);
    scene.add(roofCover); scene.userData.roofCover = roofCover; bake(roofCover);
    scene.add(barnShell); scene.userData.barnShell = barnShell; bake(barnShell);
    // Hay bales match two collision rectangles.
    for (const obstacle of WALLS.slice(5)) {
      cube(scene, 0xb59a56, obstacle.x, 0.5, obstacle.z, obstacle.w, 1, obstacle.d);
      cube(scene, 0x766240, obstacle.x, 0.5, obstacle.z, 0.13, 1.03, obstacle.d + 0.04);
      for (let i = 0; i < 8; i++) cube(scene, 0xc7aa65, obstacle.x - 1 + i * 0.29, 1.02, obstacle.z, 0.08, 0.04, 1.8);
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
    for (let i = 0; i < 290; i++) {
      const x = Math.sin(i * 18.13) * 21, z = Math.cos(i * 7.31) * 21;
      if (Math.abs(x) < 7.8 && z < 7.8 && z > -9.5) { const straw = cube(scene, i % 2 ? 0xc2ae7a : 0xa39062, x, 0.061, z, 0.24 + i % 3 * 0.09, 0.012, 0.025); straw.rotation.y = i; }

    }
    // Bake static set pieces into one mesh per material instead of hundreds
    // of individual draw calls. Dynamic animals remain independently selectable.
    landscape(scene, { cube, ball, cylinder, Group: T.Group });
    bake(scene.userData.shopCrates);
    bake(scene);
    const countryside = createCountryside(scene), ambience = createFarmAmbience(scene), planting = createFarmPlanting(scene);
    scene.userData.countryside = countryside; scene.userData.ambience = ambience; scene.userData.planting = planting;
    extraDisposers.push(() => countryside.dispose(), () => ambience.dispose(), () => planting.dispose());
  }
  function wolf(type = 'normal') {
    const group = new T.Group(), head = new T.Group(); head.position.set(0, 1.75, 0.22); group.add(head);
    const arms = [], legs = [], jaw = new T.Group(); jaw.position.set(0, -.21, .28); head.add(jaw);
    const fur = type === 'white' ? 0xdce6df : type === 'rabid' ? 0x67716b : 0x657b80;
    const light = type === 'white' ? 0xf4efdc : 0xa6b9ae;
    const lean = type === 'lean';
    ball(group, fur, 0, 1.12, -.04, lean ? .37 : .56, .68, lean ? .43 : .52);
    ball(group, fur, 0, 1.49, -.07, lean ? .44 : .64, .36, .46);
    ball(group, fur, 0, .68, -.08, lean ? .38 : .49, .3, .4);
    ball(group, light, 0, 1.26, lean ? .33 : .4, lean ? .28 : .37, .44, .16);
    for (const side of [-1, 1]) {
      const leg = new T.Group(); leg.position.set(side * 0.31, 0.47, 0); group.add(leg);
      legs.push(leg);
      ball(leg, fur, 0, 0, -.03, lean ? .18 : .23, .43, .25);
      ball(leg, 0x3e4848, 0, -0.32, 0.13, .24, .14, .34);
      const arm = new T.Group(); arm.position.set(side * (lean ? .43 : .54), 1.45, 0.04); arm.rotation.z = side * 0.22; group.add(arm);
      arms.push(arm);
      ball(arm, fur, side * 0.08, -0.22, 0.04, lean ? .18 : .23, .42, .25);
      ball(arm, 0x3e4848, side * 0.1, -0.55, 0.12, .23, .18, .26);
      for (let i = -1; i <= 1; i++) {
        const g = new T.ConeGeometry(0.035, 0.19, 6); geometries.add(g);
        const claw = mesh(arm, g, mat(0xe7d6b7), side * 0.1 + i * 0.085, -0.62, 0.27); claw.rotation.x = Math.PI * 0.7;
      }
      const earGeometry = new T.ConeGeometry(0.21, 0.6, 4); geometries.add(earGeometry);
      const ear = mesh(head, earGeometry, mat(fur), side * 0.27, 0.48, -0.02); ear.rotation.z = side * -0.18;
      ball(head, 0xb88d83, side * 0.27, 0.44, 0.085, 0.08, 0.18, 0.025);
      ball(head, light, side * 0.29, -0.1, 0.1, 0.24, 0.23, 0.21);
      const brow = ball(head, fur, side * 0.18, 0.2, 0.31, 0.16, 0.05, 0.08); brow.rotation.z = side * 0.3;
      const fangGeometry = new T.ConeGeometry(0.055, 0.19, 6); geometries.add(fangGeometry);
      const fang = mesh(jaw, fangGeometry, mat(0xf4efdc), side * .13, -.08, .25); fang.rotation.z = Math.PI;
    }
    ball(head, fur, 0, 0.08, 0, 0.4, 0.39, 0.33);
    // Eyes and muzzle extend beyond the face, keeping the expression readable.
    for (const side of [-1, 1]) {
      ball(head, type === 'rabid' ? 0xe99c79 : 0xe9cc8d, side * 0.17, 0.1, 0.342, 0.1, 0.06, 0.04);
      ball(head, 0x303938, side * 0.17, 0.1, 0.377, 0.027, 0.047, 0.018);
    }
    ball(jaw, 0x303938, 0, -.04, .07, .24, .09, .2);
    ball(head, light, 0, -0.1, 0.34, 0.24, 0.15, 0.27);
    ball(head, 0x303938, 0, -0.025, 0.57, 0.115, 0.085, 0.075);
    const tail = new T.Group(); tail.position.set(0, 0.7, -0.26); tail.rotation.x = -0.5; group.add(tail);
    ball(tail, fur, 0, -0.05, -0.45, 0.23, 0.24, 0.61); ball(tail, light, 0, -0.1, -0.88, 0.16, 0.17, 0.26);
    for (const side of [-1, 1]) for (let i = 0; i < 4; i++) ball(group, 0xe7d6b7, side * (0.27 + i * 0.06), 1.52 - i * 0.07, -0.1, 0.17);
    if (lean) for (const side of [-1, 1]) for (let i = 0; i < 3; i++) cube(group, light, side * .34, 1.1 + i * .13, .12, .04, .04, .3);
    const shadow = new T.Mesh(shadowGeometry, shadowMaterial); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.05; group.add(shadow);
    group.userData = { head, tail, arms, legs, jaw };
    const scale = type === 'alpha' ? 1.2 : type === 'pup' ? 0.73 : 1; group.scale.setScalar(scale);
    group.userData.baseScale = scale;
    for (const joint of [...arms, ...legs, jaw, tail, head, group]) bake(joint);
    return group;
  }
  function flashlight(camera) {
    const holder = new T.Group(); holder.position.set(0.3, -0.28, -0.6); holder.rotation.x = -Math.PI / 2; camera.add(holder);
    cylinder(holder, 0x384d42, 0.09, 0.42, 0, 0, 0);
    cylinder(holder, 0x252e2b, 0.135, 0.12, 0, 0.25, 0);
    mesh(holder, sphere, mat(0xe9d5a5, 0xd1b973), 0, 0.32, 0, 0.11, 0.02, 0.11);
    cube(holder, 0x94765c, 0.04, -0.03, 0.06, 0.19, 0.16, 0.12);
    return holder;
  }
  function sickle(camera) {
    const holder = new T.Group(); camera.add(holder); holder.position.set(.36, -.36, -.72);
    cylinder(holder, 0x9b7d52, .035, .54, 0, -.06, 0);
    const shape = new T.Shape();
    shape.moveTo(-.025, .18);
    shape.bezierCurveTo(-.08, .58, .26, .72, .46, .45);
    shape.quadraticCurveTo(.53, .35, .5, .22);
    shape.quadraticCurveTo(.4, .52, .19, .49);
    shape.quadraticCurveTo(.055, .45, .035, .18);
    shape.closePath(); const blade = new T.ExtrudeGeometry(shape, { depth: .018, bevelEnabled: false }); geometries.add(blade);
    mesh(holder, blade, mat(0xb9c8bc), 0, 0, 0);
    cylinder(holder, 0x697d76, .041, .065, 0, .18, 0);
    ball(holder, 0x94765c, 0, -.15, .035, .075, .1, .075); holder.visible = false;
    return holder;
  }
  function supplements(scene) {
    const meadow = createMeadow(scene); extraDisposers.push(() => meadow.dispose());
    const kennel = doghouse(); kennel.position.set(DOG_HOME.x, 0, DOG_HOME.z); scene.add(kennel);
    const sign = new T.Group(); sign.position.set(-4, 0, 9.5); scene.add(sign);
    for (const x of [-1.7, 1.7]) cube(sign, 0x67543e, x, 1.7, 0, .18, 3.4, .18);
    cube(sign, 0x67543e, 0, 2.45, 0, 4.5, 2.75, .18);
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 640;
      const c = canvas.getContext('2d');
      let texture;
      function paintGuide() { c.fillStyle = '#eee0ba'; c.fillRect(0, 0, 1024, 640);
      c.strokeStyle = '#947b50'; c.lineWidth = 9; c.strokeRect(18, 18, 988, 604);
      c.fillStyle = '#314c40'; c.font = 'bold 48px Georgia'; c.fillText(translate('SỔ TAY TRẠI SƯƠNG'), 65, 90);
      c.font = '28px sans-serif';
      ['WASD: đi lại · chuột: nhìn · Ctrl phải: mở chuột', 'E: tương tác khi đến gần · F: đèn · Esc: cài đặt', 'Ban ngày: cho ăn · ra đồng phía đông cắt cỏ.', 'Thương nhân: ngày 1, 3, 5… Dự trữ cỏ khi mưa.', 'Giường trong nhà: nghỉ đến tối / ngủ đến sáng.', 'Ban đêm: soi cừu, kiểm tra dấu hiệu của sói.', 'Chiến đấu: J đánh · K đỡ · Space né · WASD chạy.', 'Shiba kiểm tra chuồng: nghỉ tới sáng, không đánh.', 'Tab: sinh hoạt · I: túi đồ · H: gọi Shiba kiểm tra.'].forEach((line, i) => c.fillText(translate(line), 60, 157 + i * 49));
      if (texture) texture.needsUpdate=true;
      }
      paintGuide();
      texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; textures.add(texture);
      extraDisposers.push(subscribeLanguage(paintGuide));
      const material = new T.MeshBasicMaterial({ map: texture, side: T.DoubleSide }); materials.add(material);
      mesh(sign, box, material, 0, 2.45, .11, 4.3, 2.55, .015);
      const reverse = mesh(sign, box, material, 0, 2.45, -.11, 4.3, 2.55, .015); reverse.rotation.y = Math.PI;
    }
    const fenceStages = [0, 1, 2, 3].map(level => {
      const fence = new T.Group(); scene.add(fence);
      for (let i = 0; i <= 12; i++) for (const side of [-1, 1]) {
        const z = -9.5 + i * 1.4;
        const post = cube(fence, level ? 0x96714e : 0x81724e, side * 7.8, .58, z, level ? .18 : .1, level ? 1.3 : 1.05, .15); post.rotation.z = level ? 0 : Math.sin(i * 3) * .13;
        for (let rail = 0; rail < level + 1; rail++) cube(fence, level ? 0xc2a56a : 0x766240, side * 7.8, .35 + rail * .27, z, .1, level ? .11 : .045, 1.48);
      }
      for (let i = 0; i < 12; i++) { cube(fence, 0x96714e, -7.2 + i * 1.3, .58, -9.9, .12, 1.25, .12); for (let rail = 0; rail < level + 1; rail++) cube(fence, 0xc2a56a, -7.2 + i * 1.3, .35 + rail * .27, -9.9, 1.4, .09, .1); }
      for (const side of [-1, 1]) for (let i = 0; i < 4; i++) { cube(fence, 0x96714e, side * (3.6 + i * 1.35), .58, 8, .13, 1.25, .13); for (let rail = 0; rail <= level; rail++) cube(fence, 0xc2a56a, side * (4 + i * 1.15), .35 + rail * .27, 8, 1.2, .09, .1); }
      bake(fence); return fence;
    });
    const gates = [-1, 1].map(side => {
      const gate = new T.Group(); gate.position.set(side * 3.35, 0, 8); gate.userData.side = side; scene.add(gate);
      for (const y of [.35, .9]) cube(gate, 0x96714e, -side * 1.65, y, 0, 3.2, .16, .14);
      for (let i = 0; i < 6; i++) cube(gate, 0xc2a56a, -side * (.22 + i * .55), .62, 0, .08, 1.15, .12);
      bake(gate); return gate;
    });
    const storage = new T.Group(); storage.position.set(-8.5, 0, 18.6); scene.add(storage);
    for (let i = 0; i < 6; i++) { const bale = new T.Group(); storage.add(bale); cube(bale, 0xc2a56a, (i % 2 - .5) * .85, .3 + Math.floor(i / 2) * .48, 0, .8, .45, 1.1); cube(bale, 0x766240, (i % 2 - .5) * .85, .3 + Math.floor(i / 2) * .48, 0, .08, .47, 1.12); }
    const shop = new T.Group(); shop.position.set(4, 0, 12.7); scene.add(shop);
    farmStall(shop, { cube, ball, cylinder, Group: T.Group }); bake(shop); bake(shop.userData.clerk);
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
    cylinder(merchant, 0x31323c, 0.58, 1.6, 0, 0.8, 0, 0.25);
    const merchantHead = new T.Group(); merchantHead.position.set(0, 1.8, 0); merchant.add(merchantHead);
    ball(merchantHead, 0x2e3037, 0, 0, 0, .38, .42, .35);
    ball(merchantHead, 0x8e806a, 0, -.08, -.28, .17, .18, .1);
    for (const side of [-1, 1]) ball(merchantHead, 0xd6bc85, side * .055, -.025, -.369, .015, .018, .01);
    cylinder(merchant, 0x413c3b, 0.05, 1.8, 0.6, 0.9, 0);
    const lantern = new T.Group(); lantern.position.set(.6, 1.48, -.08); merchant.add(lantern);
    const loopGeometry = new T.TorusGeometry(.075, .015, 5, 10); geometries.add(loopGeometry);
    mesh(lantern, loopGeometry, mat(0x67543e), 0, -.05, 0);
    mesh(lantern, box, mat(0xe9c27c, 0xe2a450), 0, -.25, 0, .16, .23, .16);
    for (const y of [-.38, -.12]) cube(lantern, 0x67543e, 0, y, 0, .24, .045, .24);
    for (const x of [-.095, .095]) for (const z of [-.095, .095]) cube(lantern, 0x67543e, x, -.25, z, .02, .25, .02);
    const glow = new T.PointLight(0xeebf71, 7, 5, 1.5); glow.position.set(0, -.25, -.1); lantern.add(glow);
    const scale = new T.Group(); scale.position.set(0, .8, -.78); merchant.add(scale);
    cube(merchant, 0x67543e, 0, .73, -.75, 1.45, .13, .75);
    for (const x of [-.6, .6]) for (const z of [-1.03, -.48]) cylinder(merchant, 0x574330, .045, .7, x, .35, z);
    cylinder(scale, 0xbba070, .025, .47, 0, .24, 0);
    cylinder(scale, 0x9b8157, .16, .045, 0, .02, 0);
    const scaleBeam = new T.Group(); scaleBeam.position.y = .47; scale.add(scaleBeam);
    cube(scaleBeam, 0xd3b67b, 0, 0, 0, .92, .035, .04);
    for (const side of [-1, 1]) {
      cylinder(scaleBeam, 0xbba070, .008, .27, side * .37, -.135, 0);
      cylinder(scaleBeam, 0xbba070, .1, .05, side * .37, -.29, 0, .16);
    }
    const charmCard = cube(scaleBeam, 0xd9c6a2, .37, -.16, -.015, .12, .19, .015);
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 192;
      const context = canvas.getContext('2d'); context.fillStyle = '#d9c6a2'; context.fillRect(0, 0, 128, 192); context.strokeStyle = '#897954'; context.lineWidth = 5; context.strokeRect(10, 10, 108, 172); context.fillStyle = '#53624d'; context.font = 'bold 110px Georgia'; context.textAlign = 'center'; context.fillText('?', 64, 133);
      const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; textures.add(texture);
      const material = new T.MeshStandardMaterial({ map: texture, roughness: .9 }); materials.add(material); charmCard.material = material;
    }
    merchant.userData = { head: merchantHead, lantern, glow, scaleBeam }; bake(merchant); bake(merchantHead); bake(lantern); bake(scaleBeam);
    return { roofPatch, divider, deity, merchant, shop, storage, gates, fenceStages, kennel, meadow };
  }
  function doghouse() {
    const home = new T.Group();
    cube(home, 0x67543e, 0, .12, 0, 2, .22, 1.9);
    cube(home, 0xc2a56a, 0, .25, .1, 1.62, .08, 1.55);
    for (const side of [-1, 1]) {
      cube(home, 0x96714e, side * .87, .75, 0, .16, 1.1, 1.8);
      cube(home, 0xc2a56a, side * .68, .75, .84, .55, 1.1, .16);
      for (const y of [.48, .77, 1.06]) cube(home, 0x766240, side * .96, y, 0, .025, .028, 1.75);
      const roof = cube(home, 0x52646b, side * .53, 1.59, 0, 1.3, .16, 2.15); roof.rotation.z = -side * .52;
      cube(home, 0xc2a56a, side * .4, .69, .94, .08, 1, .08);
    }
    cube(home, 0x96714e, 0, .75, -.84, 1.6, 1.1, .16);
    cube(home, 0xc2a56a, 0, 1.2, .84, .85, .2, .16);
    const gableShape = new T.Shape(); gableShape.moveTo(-.93, 1.28); gableShape.lineTo(0, 1.91); gableShape.lineTo(.93, 1.28); gableShape.closePath();
    const gable = new T.ExtrudeGeometry(gableShape, { depth: .12, bevelEnabled: false }); geometries.add(gable);
    for (const z of [-.9, .78]) mesh(home, gable, mat(0x96714e), 0, 0, z);
    cube(home, 0x67543e, 0, 1.48, .96, .5, .22, .07);
    cube(home, 0xf1dfb9, 0, 1.48, 1.01, .23, .045, .025);
    for (const side of [-1, 1]) for (const y of [1.45, 1.51]) ball(home, 0xf1dfb9, side * .13, y, 1.01, .04);
    bake(home); return home;
  }
  function shiba({ sitting = false } = {}) {
    const dog = new T.Group(), body = new T.Group(), legs = [], ears = [], eyes = []; dog.add(body);
    if (sitting) {
      ball(body, 0xc79758, 0, .4, -.12, .29, .35, .3);
      ball(body, 0xf1dfb9, 0, .43, .13, .2, .25, .15);
      for (const side of [-1, 1]) {
        ball(dog, 0xc79758, side * .22, .17, -.14, .16, .16, .23);
        ball(dog, 0xf1dfb9, side * .13, .24, .22, .07, .22, .075);
        ball(dog, 0xf1dfb9, side * .13, .065, .27, .085, .06, .13);
      }
    } else {
      ball(body, 0xc79758, 0, .43, 0, .26, .28, .44);
      ball(body, 0xf1dfb9, 0, .37, .22, .21, .22, .23);
      for (const side of [-1, 1]) for (const z of [-.23, .23]) { const leg = new T.Group(); leg.position.set(side * .17, .32, z); dog.add(leg); ball(leg, 0xc79758, 0, -.13, 0, .065, .18, .07); legs.push(leg); }
    }
    const head = new T.Group(); head.position.set(0, sitting ? .82 : .72, sitting ? .16 : .36); dog.add(head);
    ball(head, 0xc79758, 0, 0, 0, .25, .24, .24); ball(head, 0xf1dfb9, 0, -.07, .16, .2, .14, .14);
    for (const side of [-1, 1]) {
      const ear = new T.Group(); ear.position.set(side * .17, .23, 0); head.add(ear); ears.push(ear);
      const g = new T.ConeGeometry(.1, .23, 4); geometries.add(g); mesh(ear, g, mat(0xc79758), 0, 0, 0);
      ball(ear, 0xd8aa96, 0, -.015, .055, .042, .065, .025);
      const eye = new T.Group(); eye.position.set(side * .11, .015, .21); head.add(eye); eyes.push(eye);
      ball(eye, 0x303938, 0, 0, 0, .026); ball(eye, 0xfff5e3, -.007, .008, .021, .008);
      ball(head, 0xf1dfb9, side * .11, .085, .19, .046, .025, .035);
    }
    ball(head, 0x303938, 0, -.03, .295, .043, .031, .03);
    const jaw = new T.Group(); jaw.position.set(0, -.1, .13); head.add(jaw);
    ball(jaw, 0x303938, 0, -.035, .08, .105, .025, .08);
    ball(jaw, 0xf1dfb9, 0, -.055, .07, .12, .045, .09);
    const tailGeometry = new T.TorusGeometry(.14, .065, 7, 16, Math.PI * 1.8); geometries.add(tailGeometry);
    const tail = mesh(dog, tailGeometry, mat(0xf1dfb9), sitting ? .2 : .03, sitting ? .32 : .65, -.4); tail.rotation.y = .7; tail.userData.part = 'wag';
    dog.userData = { head, tail, legs, body, ears, eyes, jaw }; bake(body); bake(dog); bake(head); return dog;
  }
  function farmer() {
    const actor = new T.Group(), legs = []; cylinder(actor, 0x647b70, .22, .55, 0, .8, 0, .3);
    ball(actor, 0xc5a07a, 0, 1.28, 0, .19, .23, .19);
    cylinder(actor, 0xc2a56a, .33, .06, 0, 1.47, 0); cylinder(actor, 0x9b7d52, .2, .17, 0, 1.56, 0);
    for (const side of [-1, 1]) { const leg = new T.Group(); leg.position.set(side * .13, .55, 0); actor.add(leg); cube(leg, 0x52646b, 0, -.25, 0, .16, .5, .17); ball(leg, 0x3e4848, 0, -.47, .06, .12, .08, .18); bake(leg); legs.push(leg); }
    const arm = new T.Group(); arm.position.set(.29, .95, 0); actor.add(arm);
    cube(arm, 0x647b70, 0, -.2, 0, .13, .4, .13); cube(arm, 0x9b7d52, 0, -.38, .27, .07, .07, .6);
    cube(arm, 0x8da59c, .03, -.37, .57, .3, .24, .07);
    const guardArm = new T.Group(); guardArm.position.set(-.29, .95, 0); actor.add(guardArm); cube(guardArm, 0x647b70, 0, -.2, 0, .13, .4, .13); ball(guardArm, 0xc5a07a, 0, -.4, .03, .08);
    actor.userData = { arm, guardArm, legs }; bake(actor); bake(arm); return actor;
  }
  return { sheep, wolf, shiba, doghouse, farmer, environment, flashlight, sickle, supplements, dispose() { extraDisposers.forEach(dispose => dispose()); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); } };
}
