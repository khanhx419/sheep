import * as T from 'three';
import { MEADOW_PATCHES, MEADOW_FENCES } from './worldMath.js';
import { curvedGrassGeometry, wildflowerGeometry } from './worldPlanting.js';

export function createMeadow(scene) {
  const root = new T.Group(); root.name = 'Đồng cỏ phía đông'; scene.add(root);
  const geometries = [], materials = [], textures = [], clock = { value: 0 };
  const geometry = g => (geometries.push(g), g), material = m => (materials.push(m), m);
  const box = geometry(new T.BoxGeometry(1, 1, 1));
  const wood = material(new T.MeshStandardMaterial({ color: 0x9f8156, roughness: .95 }));
  const straw = material(new T.MeshStandardMaterial({ color: 0xbaa66c, roughness: 1 }));
  function cube(parent, mat, x, y, z, sx, sy, sz) { const m = new T.Mesh(box, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = m.receiveShadow = true; parent.add(m); return m; }
  const ground = material(new T.MeshStandardMaterial({ color: 0x738b4e, roughness: 1 }));
  cube(root, ground, 14.2, -.01, 14.5, 8.4, .08, 8.6);
  for (let row = 0; row < 12; row++) cube(root, straw, 14.2, .033, 10.6 + row * .67, .45, .015, .56);
  const fenceInstances = [];
  for (const fence of MEADOW_FENCES) {
    const alongX = fence.w > fence.d, length = alongX ? fence.w : fence.d, count = Math.ceil(length / 1.5);
    for (let i = 0; i <= count; i++) { const offset = (i / count - .5) * length; fenceInstances.push([fence.x + (alongX ? offset : 0), .52, fence.z + (alongX ? 0 : offset), .13, 1.05, .13]); }
    for (const y of [.35, .72]) fenceInstances.push([fence.x, y, fence.z, alongX ? length : .09, .1, alongX ? .09 : length]);
  }
  const fences = new T.InstancedMesh(box, wood, fenceInstances.length), matrix = new T.Object3D();
  fenceInstances.forEach((v, i) => { matrix.position.set(...v.slice(0, 3)); matrix.scale.set(...v.slice(3)); matrix.updateMatrix(); fences.setMatrixAt(i, matrix.matrix); });
  fences.castShadow = fences.receiveShadow = true; root.add(fences);
  const sign = new T.Group(); sign.position.set(9.85, 0, 13.6); sign.rotation.y = -Math.PI / 2; root.add(sign);
  cube(sign, wood, 0, .8, 0, .12, 1.6, .12); cube(sign, wood, 0, 1.4, 0, 1.8, .7, .12);
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 192;
    const c = canvas.getContext('2d'); c.fillStyle = '#e8d6a4'; c.fillRect(0, 0, 512, 192); c.fillStyle = '#38543b'; c.textAlign = 'center'; c.font = 'bold 50px Georgia'; c.fillText('ĐỒNG CỎ', 256, 80); c.font = '25px sans-serif'; c.fillText('Đi vào luống · E để cắt', 256, 140);
    const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; textures.push(texture);
    const mat = material(new T.MeshBasicMaterial({ map: texture, side: T.DoubleSide })); cube(sign, mat, 0, 1.4, -.071, 1.75, .65, .01); cube(sign, mat, 0, 1.4, .071, 1.75, .65, .01);
  }
  const blade = geometry(curvedGrassGeometry());
  const grass = material(new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, side: T.DoubleSide, roughness: 1 }));
  grass.onBeforeCompile = shader => { shader.uniforms.meadowTime = clock; shader.vertexShader = 'uniform float meadowTime;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed.x += sin(meadowTime*1.8 + instanceMatrix[3].x*2.1 + instanceMatrix[3].z)*.12*position.y*position.y;'); };
  const flowerMat = material(new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, side: T.DoubleSide, roughness: 1 })), flowerGeometry = geometry(wildflowerGeometry());
  const patches = MEADOW_PATCHES.map((patch, index) => {
    const group = new T.Group(); group.position.set(patch.x, .04, patch.z); root.add(group);
    const blades = new T.InstancedMesh(blade, grass, 1500); blades.receiveShadow = true; blades.frustumCulled = false;
    const tint = new T.Color();
    for (let i = 0; i < blades.count; i++) {
      const x = Math.sin(i * 127.1 + index * 13) * (patch.w / 2 - .1), z = Math.sin(i * 311.7) * (patch.d / 2 - .1);
      matrix.position.set(x, 0, z); matrix.rotation.set(0, i * 2.399, Math.sin(i) * .1); matrix.scale.set(.7 + i % 4 * .15, .32 + i % 7 * .045, 1); matrix.updateMatrix(); blades.setMatrixAt(i, matrix.matrix);
      tint.set([0x809957, 0x92a65b, 0x57794a, 0xa1ae61, 0x6f914d][i % 5]); blades.setColorAt(i, tint);
    }
    group.add(blades);
    const flowers = new T.InstancedMesh(flowerGeometry, flowerMat, 40);
    for (let i = 0; i < 40; i++) { matrix.position.set(Math.sin(i * 9.1) * (patch.w / 2 - .25), 0, Math.cos(i * 8.4) * (patch.d / 2 - .25)); matrix.rotation.set(0, i * 2.399, 0); matrix.scale.setScalar(.8 + i % 3 * .12); matrix.updateMatrix(); flowers.setMatrixAt(i, matrix.matrix); } group.add(flowers);
    return group;
  });
  const clippings = new T.InstancedMesh(blade, grass, 24); clippings.frustumCulled = false; clippings.visible = false; root.add(clippings);
  for (let i = 0; i < clippings.count; i++) clippings.setColorAt(i, new T.Color(i % 2 ? 0x92a65b : 0x6f914d));
  return {
    root, patches,
    update(time, cutPatches = [], harvesting = null) {
      clock.value = time;
      patches.forEach((patch, i) => { const progress = harvesting?.patch === i ? harvesting.progress : 0; patch.scale.y = cutPatches.includes(i) ? .12 : 1 - progress * .85; });
      clippings.visible = !!harvesting;
      if (harvesting) { for (let i = 0; i < 24; i++) { const p = (time * 1.5 + i / 24) % 1, a = i * 2.399; matrix.position.set(harvesting.position.x + Math.sin(a) * p, .2 + Math.sin(p * Math.PI) * .8, harvesting.position.z + Math.cos(a) * p); matrix.rotation.set(time + i, a, time * 3); matrix.scale.set(.8, .15 * (1 - p), 1); matrix.updateMatrix(); clippings.setMatrixAt(i, matrix.matrix); } clippings.instanceMatrix.needsUpdate = true; }
    },
    dispose() { scene.remove(root); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); },
  };
}
