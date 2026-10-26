import * as T from 'three';

// Curved ribbons and leaf rosettes replace the old cones and round lawn blobs.
export function curvedGrassGeometry() {
  const positions = [], colors = [];
  const point = (t, side) => [.15 * t * t + side * .038 * (1 - t) ** .7, t, .12 * t * t];
  for (let i = 0; i < 5; i++) {
    const a = i / 5, b = (i + 1) / 5;
    for (const [t, side] of [[a, -1], [a, 1], [b, -1], [b, -1], [a, 1], [b, 1]]) {
      positions.push(...point(t, side)); const shade = .68 + t * .32; colors.push(shade, shade, shade);
    }
  }
  const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); geometry.computeVertexNormals(); return geometry;
}

export function wildflowerGeometry() {
  const positions = [], colors = [];
  const tri = (a, b, c, tint) => { positions.push(...a, ...b, ...c); const color = new T.Color(tint); for (let i = 0; i < 3; i++) colors.push(color.r, color.g, color.b); };
  tri([-.009, 0, 0], [.009, 0, 0], [.025, .48, 0], 0x63835a);
  tri([.025, .48, 0], [.009, 0, 0], [.04, .48, 0], 0x63835a);
  tri([0, .18, 0], [-.12, .29, .02], [-.035, .28, .045], 0x7d9b68);
  tri([.015, .28, 0], [.14, .37, -.03], [.065, .36, .04], 0x91a875);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2, b = a + .65, c = a - .65;
    const tip = [.03 + Math.cos(a) * .09, .5, Math.sin(a) * .09];
    tri([.03, .485, 0], [.03 + Math.cos(b) * .05, .48, Math.sin(b) * .05], tip, 0xf1ead3);
    tri([.03, .485, 0], tip, [.03 + Math.cos(c) * .05, .48, Math.sin(c) * .05], 0xe0ddbe);
    tri([.03, .5, 0], [.03 + Math.cos(a) * .025, .501, Math.sin(a) * .025], [.03 + Math.cos(a + 1.26) * .025, .501, Math.sin(a + 1.26) * .025], 0xd3ae5a);
  }
  const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); geometry.computeVertexNormals(); return geometry;
}

export function createFarmPlanting(scene) {
  const root = new T.Group(); root.name = 'Cỏ mềm và cây ven rào'; scene.add(root);
  const clock = { value: 0 }, geometries = [curvedGrassGeometry(), wildflowerGeometry()], materials = [];
  function foliageMaterial() {
    const mat = new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, side: T.DoubleSide, roughness: .95 }); materials.push(mat);
    mat.onBeforeCompile = shader => {
      shader.uniforms.plantTime = clock;
      shader.vertexShader = 'uniform float plantTime;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed.x += sin(plantTime*1.5+instanceMatrix[3].x*1.7+instanceMatrix[3].z)*.035*position.y*position.y;');
    };
    return mat;
  }
  const leafPositions = [], leafColors = [];
  for (let i = 0; i < 6; i++) {
    const a = i / 6, b = (i + 1) / 6;
    const point = (t, side) => [Math.sin(t * Math.PI) * .12 * side, .35 * t - .17 * t * t + (side ? 0 : .025 * Math.sin(t * Math.PI)), .48 * t];
    for (const side of [-1, 1]) for (const [t, s] of [[a, 0], [a, side], [b, 0], [b, 0], [a, side], [b, side]]) {
      leafPositions.push(...point(t, s)); const shade = .72 + t * .28; leafColors.push(shade, shade, shade);
    }
  }
  const leaf = new T.BufferGeometry(); leaf.setAttribute('position', new T.Float32BufferAttribute(leafPositions, 3)); leaf.setAttribute('color', new T.Float32BufferAttribute(leafColors, 3)); leaf.computeVertexNormals(); geometries.push(leaf);
  const roots = [[-20, -12], [-20.5, -2], [-20, 7], [-19.4, 12], [-10.5, -16], [-5, -20.5], [5, -20.5], [17, -20], [20.8, -8], [20.8, 1], [20.8, 9], [20.8, 17], [10.5, 21], [-8, 21.7]];
  // Low, broken leaf clumps follow the fence without making a continuous wall.
  for (let i = 0; i < 27; i++) for (const side of [-1, 1]) {
    const along = -21.5 + i * 1.65;
    if (i % 5 !== 1 && !(side > 0 && Math.abs(along) < 4)) roots.push([along, side * 23.35]);
    if (i % 5 !== 3) roots.push([side * 23.35, along]);
  }
  const leaves = new T.InstancedMesh(leaf, foliageMaterial(), roots.length * 9);
  const grass = new T.InstancedMesh(geometries[0], foliageMaterial(), roots.length * 12);
  const flowers = new T.InstancedMesh(geometries[1], foliageMaterial(), 94);
  const transform = new T.Object3D(), color = new T.Color();
  roots.forEach(([x, z], index) => {
    for (let i = 0; i < 9; i++) {
      transform.position.set(x + Math.sin(index * 2.4) * .13, .015, z + Math.cos(index * 2.4) * .13);
      transform.rotation.set(-.15 + i % 3 * .12, i * 2.399 + index, 0); transform.scale.setScalar(.6 + (i + index) % 5 * .12); transform.updateMatrix(); leaves.setMatrixAt(index * 9 + i, transform.matrix);
      leaves.setColorAt(index * 9 + i, color.setHex([0x719567, 0x86a075, 0x587c59][i % 3]));
    }
    for (let i = 0; i < 12; i++) {
      const a = i * 2.399 + index, radius = .25 + i % 4 * .16;
      transform.position.set(x + Math.sin(a) * radius, .015, z + Math.cos(a) * radius); transform.rotation.set(0, a, Math.sin(i) * .1); transform.scale.set(.8, .16 + i % 5 * .035, .8); transform.updateMatrix(); grass.setMatrixAt(index * 12 + i, transform.matrix);
      grass.setColorAt(index * 12 + i, color.setHex([0x7d9c68, 0x95ab78, 0x6a8d62][i % 3]));
    }
  });
  const flowerRoots = [...roots.slice(0, 14), [19.4, 11.5], [19.7, 14.5], [19.4, 17.2], [18.7, 20.7]];
  for (let i = 0; i < flowers.count; i++) {
    const [x, z] = flowerRoots[i % flowerRoots.length], a = i * 2.399;
    transform.position.set(x + Math.sin(a) * .45, .02, z + Math.cos(a) * .45); transform.rotation.set(0, a, .05 * Math.sin(i)); transform.scale.setScalar(.55 + i % 4 * .12); transform.updateMatrix(); flowers.setMatrixAt(i, transform.matrix);
  }
  for (const mesh of [leaves, grass, flowers]) { mesh.castShadow = mesh.receiveShadow = true; mesh.computeBoundingSphere(); root.add(mesh); }
  let disposed = false;
  return { root, update(time) { clock.value = Number.isFinite(time) ? time : 0; }, dispose() { if (disposed) return; disposed = true; scene.remove(root); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); } };
}
