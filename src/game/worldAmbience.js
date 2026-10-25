import * as T from 'three';

// Decoration stays above buildings or beside distant field edges. Nothing here
// changes the walking bounds, interaction targets, or existing farm lights.
export function createFarmAmbience(scene) {
  const root = new T.Group(); root.name = 'Nhịp sống đồng quê'; scene.add(root);
  const geometries = new Set(), materials = new Set();
  const geometry = value => (geometries.add(value), value);
  const material = value => (materials.add(value), value);
  const transform = new T.Object3D();
  const wrap = value => value - Math.floor(value);
  const smooth = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };

  const puffGeometry = geometry(new T.SphereGeometry(1, 8, 6));
  const puffFade = new T.InstancedBufferAttribute(new Float32Array(7), 1); puffFade.setUsage(T.DynamicDrawUsage);
  puffGeometry.setAttribute('puffFade', puffFade);
  const smokeMaterial = material(new T.MeshBasicMaterial({ color: 0xc8c9ba, transparent: true, opacity: .16, depthWrite: false }));
  smokeMaterial.onBeforeCompile = shader => {
    shader.vertexShader = 'attribute float puffFade; varying float vPuffFade;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vPuffFade = puffFade;');
    shader.fragmentShader = 'varying float vPuffFade;\n' + shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.a *= vPuffFade;');
  };
  smokeMaterial.customProgramCacheKey = () => 'farm-chimney-fade-v1';
  const smoke = new T.InstancedMesh(puffGeometry, smokeMaterial, 7); smoke.name = 'Khói bếp'; smoke.instanceMatrix.setUsage(T.DynamicDrawUsage); smoke.frustumCulled = false; root.add(smoke);

  // One shared wing geometry serves both a handful of birds and butterflies.
  const wingGeometry = geometry(new T.BufferGeometry());
  wingGeometry.setAttribute('position', new T.Float32BufferAttribute([0, 0, 0, .64, .1, -.11, .4, .025, .19], 3)); wingGeometry.computeVertexNormals();
  const birdMaterial = material(new T.MeshBasicMaterial({ color: 0x465b58, side: T.DoubleSide, transparent: true, opacity: .8, depthWrite: false }));
  const birds = new T.InstancedMesh(wingGeometry, birdMaterial, 12); birds.name = 'Chim qua cánh đồng'; birds.instanceMatrix.setUsage(T.DynamicDrawUsage); birds.frustumCulled = false; root.add(birds);
  const butterflyMaterial = material(new T.MeshBasicMaterial({ color: 0xffffff, side: T.DoubleSide }));
  const butterflies = new T.InstancedMesh(wingGeometry, butterflyMaterial, 12); butterflies.name = 'Bướm ven đồng cỏ'; butterflies.instanceMatrix.setUsage(T.DynamicDrawUsage); butterflies.frustumCulled = false;
  const tint = new T.Color();
  for (let i = 0; i < 12; i++) butterflies.setColorAt(i, tint.setHex([0xe3bf73, 0xd79264, 0xe8dbc1][Math.floor(i / 2) % 3]));
  root.add(butterflies);

  const glowUniforms = { time: { value: 0 }, strength: { value: 0 } };
  const flyGeometry = geometry(new T.BufferGeometry()), flyPositions = new Float32Array(28 * 3);
  for (let i = 0; i < 28; i++) {
    const side = i % 2 ? 1 : -1;
    flyPositions.set([side * (19.7 + Math.sin(i * 3.17) * .8), .6 + i % 5 * .18, 10.6 + Math.floor(i / 2) * .65], i * 3);
  }
  flyGeometry.setAttribute('position', new T.BufferAttribute(flyPositions, 3));
  const flyMaterial = material(new T.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: glowUniforms,
    vertexShader: `uniform float time; varying float glow;
      void main(){float seed=position.x*1.7+position.z*3.1;vec3 p=position;
      p.x+=sin(time*.39+seed)*.42;p.z+=sin(time*.27+seed*1.3)*.37;p.y+=sin(time*.64+seed)*.2;
      glow=.45+.55*pow(.5+.5*sin(time*1.2+seed),2.);
      vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(45./max(1.,-mv.z),2.,5.);}`,
    fragmentShader: `uniform float strength;varying float glow;
      void main(){float soft=1.-smoothstep(.06,.5,length(gl_PointCoord-.5));gl_FragColor=vec4(.91,.86,.43,soft*glow*strength);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>}`,
  }));
  const fireflies = new T.Points(flyGeometry, flyMaterial); fireflies.name = 'Đom đóm hàng rào'; fireflies.frustumCulled = false; root.add(fireflies);

  const vaneMaterial = material(new T.MeshStandardMaterial({ color: 0x74664e, metalness: .28, roughness: .75 }));
  const stemGeometry = geometry(new T.CylinderGeometry(.025, .035, 1.15, 6));
  const stem = new T.Mesh(stemGeometry, vaneMaterial); stem.position.set(-14, 5.98, 17); root.add(stem);
  const vane = new T.Group(); vane.name = 'Chong chóng chỉ gió'; vane.position.set(-14, 6.52, 17); root.add(vane);
  const shaft = new T.Mesh(geometry(new T.CylinderGeometry(.025, .025, 1.35, 6)), vaneMaterial); shaft.rotation.z = Math.PI / 2; vane.add(shaft);
  const arrow = new T.Mesh(geometry(new T.ConeGeometry(.11, .27, 3)), vaneMaterial); arrow.position.x = .72; arrow.rotation.z = -Math.PI / 2; vane.add(arrow);
  const fin = new T.Mesh(geometry(new T.BoxGeometry(.3, .19, .035)), vaneMaterial); fin.position.x = -.55; vane.add(fin);

  let lastNight, lastRainy, disposed = false;
  function update(time, { night = false, rainy = false } = {}) {
    if (disposed) return;
    time = Number.isFinite(time) ? time : 0;
    if (night !== lastNight || rainy !== lastRainy) {
      smokeMaterial.color.setHex(night ? 0x7d8c92 : rainy ? 0xa3b1ab : 0xc8c9ba);
      smokeMaterial.opacity = night ? .1 : .16;
      birds.visible = !night && !rainy; butterflies.visible = !night && !rainy; fireflies.visible = night;
      glowUniforms.strength.value = night ? rainy ? .24 : .7 : 0;
      lastNight = night; lastRainy = rainy;
    }
    for (let i = 0; i < smoke.count; i++) {
      const p = wrap(time * .095 + i / smoke.count), size = .22 + p * .66;
      transform.position.set(-16.6 + p * p * (rainy ? 1.7 : 1.1) + Math.sin(time * .3 + i) * p * .1, 5.8 + p * 2.65, 16.2 + p * .3);
      transform.rotation.set(p * .6, i * 1.7, 0); transform.scale.set(size * 1.15, size * .8, size); transform.updateMatrix(); smoke.setMatrixAt(i, transform.matrix);
      puffFade.setX(i, Math.sin(p * Math.PI) ** 1.3);
    }
    smoke.instanceMatrix.needsUpdate = true; puffFade.needsUpdate = true;
    if (birds.visible) for (let i = 0; i < 6; i++) {
      // Independent traversals with gentle bends avoid a flock on a circular rail.
      const p = wrap(time * (.012 + i * .0006) + i * .163), north = i < 3;
      const x = north ? -55 + p * 110 : -35 - (i - 3) * 6 + Math.sin(p * Math.PI) * 4;
      const z = north ? 31 + i * 7 + Math.sin(p * Math.PI) * 5 : -55 + p * 110;
      const heading = north ? Math.atan2(110, Math.cos(p * Math.PI) * Math.PI * 5) : Math.atan2(Math.cos(p * Math.PI) * Math.PI * 4, 110);
      for (let side = 0; side < 2; side++) {
        const flap = Math.sin(time * (4.8 + i * .23) + i * 2) * .5;
        transform.position.set(x, 13 + i * .85 + Math.sin(time * .37 + i) * .35, z);
        transform.rotation.set(0, heading + (side ? 0 : Math.PI), .12 + flap); transform.scale.setScalar(.85); transform.updateMatrix(); birds.setMatrixAt(i * 2 + side, transform.matrix);
      }
    }
    if (birds.visible) birds.instanceMatrix.needsUpdate = true;
    if (butterflies.visible) for (let i = 0; i < 6; i++) {
      const x = 19.3 + Math.sin(time * (.47 + i * .013) + i * 2.1) * .6;
      const z = 11 + i * 1.12 + Math.sin(time * .33 + i * 1.7) * .5;
      const y = .72 + Math.sin(time * .68 + i) * .22;
      for (let side = 0; side < 2; side++) {
        transform.position.set(x, y, z); transform.rotation.set(.1, Math.sin(time * .4 + i) * .6 + (side ? 0 : Math.PI), .5 + Math.sin(time * 15 + i) * .7);
        transform.scale.setScalar(.22); transform.updateMatrix(); butterflies.setMatrixAt(i * 2 + side, transform.matrix);
      }
    }
    if (butterflies.visible) butterflies.instanceMatrix.needsUpdate = true;
    glowUniforms.time.value = time;
    const turn = Math.floor(time / 18), transition = smooth((wrap(time / 18) * 18 - 14) / 4);
    const from = Math.sin(turn * 2.399) * .85, to = Math.sin((turn + 1) * 2.399) * .85;
    vane.rotation.y = from + (to - from) * transition;
  }
  update(0);
  return { root, update, dispose() { if (disposed) return; disposed = true; scene.remove(root); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); } };
}
