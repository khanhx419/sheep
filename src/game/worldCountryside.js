import * as T from 'three';

const TAU = Math.PI * 2;
const CLEARANCE = 25.3;
const TERRAIN_RADIUS = 176;
const smooth = (a, b, value) => { const t = T.MathUtils.clamp((value - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const seed = value => { const n = Math.sin(value * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };

// Height remains flush with the existing farm ground before gently rising into
// broad fields. There is no vertical backdrop wall or floating ground edge.
export function countrysideHeight(x, z) {
  const distance = Math.hypot(x, z), edge = Math.max(Math.abs(x), Math.abs(z));
  const rolling = 2.2 + Math.sin(x * .043 + .7) * 1.1 + Math.sin(z * .052) * .7 + Math.sin((x + z) * .026) * 1.3;
  return -.022 + smooth(CLEARANCE, 66, edge) * Math.max(.15, rolling)
    + smooth(78, 168, distance) * (3.2 + Math.sin(Math.atan2(z, x) * 5 + .4) * 1.3);
}

/** Quiet, fully procedural scenery outside the playable farm square.
 * All resources belong to this controller; the farm model kit must not dispose
 * them. A single Group keeps the static batching pass from merging these meshes.
 */
export function createCountryside(scene) {
  const root = new T.Group(); root.name = 'Đồng quê 360°'; scene.add(root);
  const geometries = new Set(), materials = new Set(), materialTints = new Map(), landmarks = [];
  const retainGeometry = geometry => (geometries.add(geometry), geometry);
  const retainMaterial = material => (materials.add(material), materialTints.set(material, material.color.clone()), material);
  const material = (color, extra = {}) => retainMaterial(new T.MeshStandardMaterial({ color, roughness: 1, ...extra }));
  const sphere = retainGeometry(new T.SphereGeometry(1, 9, 7));
  const trunkShape = retainGeometry(new T.CylinderGeometry(.72, 1, 1, 6));
  const cone = retainGeometry(new T.ConeGeometry(1, 1, 7));
  const instanceTransform = new T.Object3D(), color = new T.Color();
  const windClock = { value: 0 };

  function coloredGeometry(positions, colors) {
    const geometry = retainGeometry(new T.BufferGeometry());
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals(); geometry.computeBoundingSphere(); return geometry;
  }
  function triangle(positions, colors, a, b, c, tint) {
    positions.push(...a, ...b, ...c); for (let i = 0; i < 3; i++) colors.push(tint.r, tint.g, tint.b);
  }
  function surface(name, positions, colors, mat = material(0xffffff, { vertexColors: true })) {
    const mesh = new T.Mesh(coloredGeometry(positions, colors), mat); mesh.name = name; mesh.receiveShadow = true; root.add(mesh); return mesh;
  }
  function instanced(name, geometry, mat, transforms) {
    const mesh = new T.InstancedMesh(geometry, mat, transforms.length); mesh.name = name;
    transforms.forEach((entry, index) => {
      instanceTransform.position.set(entry.x, entry.y, entry.z);
      instanceTransform.rotation.set(entry.rx || 0, entry.ry || 0, entry.rz || 0);
      instanceTransform.scale.set(entry.sx, entry.sy, entry.sz); instanceTransform.updateMatrix();
      mesh.setMatrixAt(index, instanceTransform.matrix);
      if (entry.color !== undefined) mesh.setColorAt(index, color.set(entry.color));
    });
    mesh.computeBoundingSphere(); root.add(mesh); return mesh;
  }

  // Small, irregular rectangular fields are colored into the terrain itself.
  const fieldColors = [0x829367, 0x899765, 0xa1a16e, 0x758965, 0x929d71, 0xa8a078, 0x7a916e];
  const terrainPositions = [], terrainColors = [], step = 4;
  for (let x = -TERRAIN_RADIUS; x < TERRAIN_RADIUS; x += step) for (let z = -TERRAIN_RADIUS; z < TERRAIN_RADIUS; z += step) {
    const cx = x + step / 2, cz = z + step / 2;
    if (Math.hypot(cx, cz) > TERRAIN_RADIUS || Math.abs(cx) < CLEARANCE + step / 2 && Math.abs(cz) < CLEARANCE + step / 2) continue;
    const column = Math.floor((cx + 7) / 26), row = Math.floor((cz + 3) / 22), field = Math.floor(seed(column * 13 + row * 31) * fieldColors.length);
    color.set(fieldColors[field]);
    const nearFarm = 1 - smooth(28, 48, Math.max(Math.abs(cx), Math.abs(cz)));
    color.lerp(new T.Color(0x6e875e), nearFarm * .75);
    color.multiplyScalar(.96 + seed(column * 17 + row * 3) * .08);
    const a = [x, countrysideHeight(x, z), z], b = [x, countrysideHeight(x, z + step), z + step];
    const c = [x + step, countrysideHeight(x + step, z + step), z + step], d = [x + step, countrysideHeight(x + step, z), z];
    triangle(terrainPositions, terrainColors, a, b, d, color); triangle(terrainPositions, terrainColors, b, c, d, color);
  }
  const terrain = surface('Những thửa ruộng nối liền mặt đất', terrainPositions, terrainColors);

  // Two rolling ridges encircle the entire farm. Closed angular sampling keeps
  // the panorama seamless, while broad sloping foothills avoid giant ellipsoids.
  const ridgeMaterials = [];
  for (const [layer, radius, baseTint] of [[0, 129, 0x7b938b], [1, 158, 0x92a4a0]]) {
    const positions = [], colors = [], segments = 128, bands = 6;
    function vertex(angle, band) {
      const t = band / bands, r = radius + t * 29;
      const ridge = 10 + layer * 2 + Math.sin(angle * 3 + layer * 1.3) * 3.2 + Math.sin(angle * 7 + .4) * 1.8 + Math.cos(angle * 11) * .7;
      const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
      return [x, countrysideHeight(x, z) + Math.sin(t * Math.PI * .82) * ridge - 1.3, z];
    }
    for (let segment = 0; segment < segments; segment++) for (let band = 0; band < bands; band++) {
      const a = segment / segments * TAU, b = (segment + 1) / segments * TAU;
      color.set(baseTint).multiplyScalar(.95 + Math.cos(a - .7) * .055 + band * .008);
      triangle(positions, colors, vertex(a, band), vertex(a, band + 1), vertex(b, band), color);
      triangle(positions, colors, vertex(b, band), vertex(a, band + 1), vertex(b, band + 1), color);
    }
    const mat = retainMaterial(new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 1, emissive: baseTint, emissiveIntensity: .13, side: T.DoubleSide }));
    ridgeMaterials.push(mat); surface(`Dải đồi xa ${layer + 1}`, positions, colors, mat);
  }

  // The lane continues the farm's existing road and bends away between fields.
  const laneSamples = [];
  for (let i = 0; i <= 74; i++) {
    const z = 25.4 + i * 1.65;
    const x = Math.sin((z - 22) * .04) * 7.5 + Math.sin(z * .013) * (z - 25.4) * .12 - 1.1;
    laneSamples.push({ x, z });
  }
  function laneStrip(width, elevation, tint, name) {
    const positions = [], colors = []; color.set(tint);
    for (let i = 1; i < laneSamples.length; i++) {
      const a = laneSamples[i - 1], b = laneSamples[i], angle = Math.atan2(b.z - a.z, b.x - a.x), ox = -Math.sin(angle) * width / 2, oz = Math.cos(angle) * width / 2;
      const point = (sample, side) => { const x = sample.x + ox * side, z = sample.z + oz * side; return [x, countrysideHeight(x, z) + elevation, z]; };
      triangle(positions, colors, point(a, -1), point(a, 1), point(b, -1), color);
      triangle(positions, colors, point(b, -1), point(a, 1), point(b, 1), color);
    }
    return surface(name, positions, colors);
  }
  laneStrip(4.2, .035, 0xb4aa83, 'Bờ đường cỏ úa');
  laneStrip(2.9, .053, 0xa59a79, 'Con đường quê uốn xa');

  const trunks = [], leaves = [], pines = [], hedges = [];
  // Low field divisions are interrupted often enough to leave long open views.
  for (const [x1, z1, x2, z2] of [[-71, -38, -31, -38], [31, -38, 74, -38], [-67, 43, -33, 43], [34, 57, 80, 57], [-82, 5, -82, 39], [58, -78, 58, -44], [-30, -83, 12, -83], [40, 31, 74, 31]]) {
    const length = Math.hypot(x2 - x1, z2 - z1), count = Math.ceil(length / 2.3);
    for (let i = 0; i <= count; i++) {
      if (i % 13 === 5 || i % 13 === 6) continue;
      const t = i / count, x = T.MathUtils.lerp(x1, x2, t), z = T.MathUtils.lerp(z1, z2, t);
      hedges.push({ x, z, y: countrysideHeight(x, z) + .5, sx: 1.35, sy: .65 + seed(i) * .25, sz: 1.1, color: i % 3 ? 0x6c815d : 0x7b8b63 });
    }
  }
  function tree(x, z, scale, index, conifer = false) {
    const y = countrysideHeight(x, z);
    trunks.push({ x, z, y: y + scale * 1.25, sx: .18 * scale, sy: 2.5 * scale, sz: .18 * scale });
    if (conifer) for (let tier = 0; tier < 2; tier++) pines.push({ x, z, y: y + (2.5 + tier * 1.25) * scale, sx: (1.25 - tier * .24) * scale, sy: 2.9 * scale, sz: (1.25 - tier * .24) * scale, color: tier ? 0x607b63 : 0x536e59 });
    else for (let lobe = 0; lobe < 3; lobe++) leaves.push({ x: x + Math.sin(lobe * 2.4 + index) * .65 * scale, z: z + Math.cos(lobe * 2.4 + index) * .55 * scale, y: y + (2.8 + (lobe === 2 ? .65 : 0)) * scale, sx: 1.3 * scale, sy: 1.22 * scale, sz: 1.3 * scale, color: [0x728b61, 0x829569, 0x657f60][(lobe + index) % 3] });
    landmarks.push({ kind: conifer ? 'forest' : 'orchard', x, z });
  }
  // A close woodland edge frames the rear and sides. The southern fields
  // remain open, with the lane disappearing into another distant forest belt.
  for (let row = 0; row < 3; row++) for (let column = 0; column < 4; column++) tree(-47 - column * 5.5, 18 + row * 6, .8 + seed(row * 4 + column) * .2, row * 4 + column);
  for (let i = 0; i < 92; i++) {
    const angle = Math.PI + i / 91 * Math.PI, radius = 40 + seed(i + 100) * 24;
    tree(Math.cos(angle) * radius, Math.sin(angle) * radius, 1.05 + seed(i + 23) * .65, i, i % 4 !== 0);
  }
  for (let i = 0; i < 30; i++) {
    const side = i % 2 ? 1 : -1, x = side * (37 + seed(i + 201) * 13), z = -7 + Math.floor(i / 2) * 3.1;
    tree(x, z, 1.05 + seed(i + 301) * .45, i + 92, i % 3 !== 0);
  }
  for (let i = 0; i < 66; i++) {
    const angle = .05 + i / 65 * (Math.PI - .1), radius = 92 + seed(i + 401) * 22;
    tree(Math.cos(angle) * radius, Math.sin(angle) * radius, 1.05 + seed(i + 501) * .65, i + 122, i % 4 !== 0);
  }
  instanced('Hàng cây bụi thấp giữa các cánh đồng', sphere, material(0xffffff), hedges);
  instanced('Thân cây phía xa', trunkShape, material(0x776c50), trunks);
  function foliageMaterial(weight) {
    const mat = material(0xffffff);
    mat.onBeforeCompile = shader => {
      shader.uniforms.countrysideTime = windClock;
      shader.vertexShader = 'uniform float countrysideTime;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n transformed.x += sin(countrysideTime*.85+instanceMatrix[3].x*.21+instanceMatrix[3].z*.17)*.045*max(position.y+${weight},0.);`);
    };
    mat.customProgramCacheKey = () => `countryside-foliage-${weight}`;
    return mat;
  }
  instanced('Vườn cây và tán lá', sphere, foliageMaterial('.25'), leaves);
  instanced('Rừng bao quanh nông trại', cone, foliageMaterial('.5'), pines);

  // Distinct plots near the lane make the south view read as farmland from
  // ground level. Parallel furrows and close-spaced grain form coherent rows,
  // rather than scattering isolated decorative spikes across the horizon.
  const cropFields = [
    { x: -16, z: 42, w: 20, d: 18, rows: 12, tint: 0xc3ad72 },
    { x: 23.6, z: 42, w: 18, d: 14, rows: 10, tint: 0xb8aa6b },
    { x: -6, z: 66, w: 21, d: 16, rows: 12, tint: 0xc2b67e },
  ];
  const soilPositions = [], soilColors = [], stalkPositions = [], stalkColors = [], stalks = [];
  for (const [fieldIndex, field] of cropFields.entries()) {
    for (let row = 0; row < field.rows; row++) {
      const x1 = field.x - field.w / 2 + row / field.rows * field.w, x2 = x1 + field.w / field.rows;
      const strips = Math.ceil(field.d / 2);
      color.set(row % 2 ? 0x9e936b : 0x887e5d);
      for (let strip = 0; strip < strips; strip++) {
        const z1 = field.z - field.d / 2 + strip / strips * field.d, z2 = field.z - field.d / 2 + (strip + 1) / strips * field.d;
        const point = (x, z) => [x, countrysideHeight(x, z) + .095, z];
        triangle(soilPositions, soilColors, point(x1, z1), point(x1, z2), point(x2, z1), color);
        triangle(soilPositions, soilColors, point(x2, z1), point(x1, z2), point(x2, z2), color);
      }
      const count = Math.floor(field.d / .55);
      for (let i = 0; i < count; i++) for (let side = 0; side < 2; side++) {
        const id = fieldIndex * 3000 + row * 100 + i * 2 + side;
        const x = (x1 + x2) / 2 + (side - .5) * .38 + (seed(id) - .5) * .1;
        const z = field.z - field.d / 2 + .3 + i * .55 + seed(id + 5) * .12;
        const scale = .84 + seed(id + 15) * .24;
        stalks.push({ x, z, y: countrysideHeight(x, z) + .09, sx: scale, sy: scale * (fieldIndex === 1 ? .9 : 1), sz: scale, ry: seed(id + 40) * .45 - .22, color: field.tint });
      }
    }
    landmarks.push({ kind: 'crop-field', x: field.x, z: field.z });
  }
  surface('Thửa ruộng và những luống đất', soilPositions, soilColors);
  // A compact stalk combines a stem, two bent leaves and a pointed grain head.
  // The entire crop is one instanced draw, including all three fields.
  color.set(0xffffff);
  const stalkFace = (a, b, c) => triangle(stalkPositions, stalkColors, a, b, c, color);
  for (const [a, b] of [[[-.025, 0, 0], [.025, 0, 0]], [[0, 0, -.025], [0, 0, .025]]]) {
    stalkFace(a, b, [a[0], .65, a[2]]); stalkFace(b, [b[0], .65, b[2]], [a[0], .65, a[2]]);
  }
  stalkFace([0, .22, 0], [-.25, .43, .03], [-.07, .31, .08]);
  stalkFace([0, .37, 0], [.25, .55, -.02], [.07, .44, -.08]);
  for (let side = 0; side < 4; side++) {
    const a = side / 4 * TAU, b = (side + 1) / 4 * TAU;
    const p = [Math.cos(a) * .075, .67, Math.sin(a) * .075], q = [Math.cos(b) * .075, .67, Math.sin(b) * .075];
    stalkFace([0, .94, 0], p, q); stalkFace([0, .56, 0], q, p);
  }
  const cropMaterial = material(0xffffff, { vertexColors: true, side: T.DoubleSide });
  cropMaterial.onBeforeCompile = shader => {
    shader.uniforms.countrysideTime = windClock;
    shader.vertexShader = 'uniform float countrysideTime;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed.x += sin(countrysideTime*1.25+instanceMatrix[3].x*.7+instanceMatrix[3].z*.4)*.055*position.y*position.y;');
  };
  instanced('Những hàng ngũ cốc vàng', coloredGeometry(stalkPositions, stalkColors), cropMaterial, stalks);

  const hay = [];
  for (let i = 0; i < 13; i++) {
    const x = 37 + seed(i + 20) * 28, z = -20 + seed(i + 70) * 25;
    hay.push({ x, z, y: countrysideHeight(x, z) + .55, sx: .68, sy: 1.15, sz: .68, rx: Math.PI / 2, ry: seed(i) * Math.PI, color: i % 2 ? 0xb4a375 : 0xa99d71 });
    landmarks.push({ kind: 'hay', x, z });
  }
  instanced('Cuộn cỏ khô ngoài đồng', trunkShape, material(0xffffff), hay);

  let disposed = false;
  const neutral = new T.Color(0xffffff), rainyTint = new T.Color(0xc5d1cc), nightTint = new T.Color(0xa8b9cc);
  root.userData = { kind: 'countryside', clearance: CLEARANCE, radius: 187, landmarks, laneSamples, drawCalls: root.children.length, terrain };
  return {
    root,
    update(time, night = false, rainy = false) {
      if (disposed) return;
      windClock.value = time;
      const nightAmount = T.MathUtils.clamp(Number(night) || 0, 0, 1), rainAmount = T.MathUtils.clamp(Number(rainy) || 0, 0, 1);
      color.copy(neutral).lerp(nightTint, nightAmount * .22).lerp(rainyTint, rainAmount * .22);
      for (const mat of materials) mat.color.copy(materialTints.get(mat)).multiply(color);
      ridgeMaterials.forEach(mat => { mat.emissiveIntensity = T.MathUtils.lerp(.13, .025, nightAmount) * (1 - rainAmount * .35); });
      root.userData.time = time; root.userData.night = !!night; root.userData.rainy = !!rainy;
    },
    dispose() {
      if (disposed) return; disposed = true; scene.remove(root);
      geometries.forEach(geometry => geometry.dispose()); materials.forEach(mat => mat.dispose());
    },
  };
}
