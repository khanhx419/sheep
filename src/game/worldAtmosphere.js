import * as T from 'three';

// All textures and particles are generated locally, including the feathered dots.
export function createAtmosphere(scene) {
  const uniforms = { time: { value: 0 }, night: { value: 0 }, rainy: { value: 0 } };
  const skyMaterial = new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false,
    uniforms,
    vertexShader: 'varying vec3 vDirection; void main(){vDirection=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec3 vDirection; uniform float night; uniform float rainy;
      void main(){float h=smoothstep(-.1,.8,normalize(vDirection).y);
      vec3 day=mix(vec3(.72,.77,.66),vec3(.25,.48,.59),h);
      vec3 dusk=mix(vec3(.12,.23,.29),vec3(.025,.065,.14),h);
      vec3 color=mix(day,dusk,night);color=mix(color,vec3(.23,.30,.32),rainy*.4);
      gl_FragColor=vec4(color,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment> }`,
  });
  const skyGeometry = new T.SphereGeometry(85, 24, 16), sky = new T.Mesh(skyGeometry, skyMaterial); sky.renderOrder = -100; scene.add(sky);
  function particles(count, stars) {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = i * 2.3999;
      if (stars) { const y = 0.15 + (i % 79) / 95, r = Math.sqrt(1 - y * y) * 72; positions.set([Math.cos(a) * r, y * 72, Math.sin(a) * r], i * 3); }
      else positions.set([Math.sin(i * 13.7) * 20, 0.3 + (i % 23) * 0.17, Math.cos(i * 8.1) * 22], i * 3);
    }
    const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.BufferAttribute(positions, 3));
    const material = new T.ShaderMaterial({ uniforms, transparent: true, depthWrite: false,
      vertexShader: `uniform float time; varying float seed; void main(){vec3 p=position; seed=position.x*2.+position.z;
        ${stars ? '' : 'p.x+=sin(time*.3+seed)*.2; p.y+=sin(time*.4+seed)*.15;'}
        vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
        gl_PointSize=${stars ? '2.5' : 'clamp(35./-mv.z,1.,5.)'};}`,
      fragmentShader: `uniform float time; uniform float night; varying float seed;
        void main(){float a=1.-smoothstep(.05,.5,length(gl_PointCoord-.5));
        gl_FragColor=vec4(${stars ? 'vec3(.72,.86,1.)' : 'vec3(.88,.77,.48)'},a*${stars ? 'night*(.5+.3*sin(time*.5+seed))' : '(.16+night*.14)'});}` });
    const points = new T.Points(geometry, material); points.frustumCulled = false; scene.add(points); return points;
  }
  const stars = particles(180, true), dust = particles(95, false);
  return {
    update(time, night, rainy = false) { uniforms.time.value = time; uniforms.night.value = Number(night); uniforms.rainy.value = Number(rainy); },
    dispose() { for (const o of [sky, stars, dust]) { scene.remove(o); o.geometry.dispose(); o.material.dispose(); } },
  };
}
