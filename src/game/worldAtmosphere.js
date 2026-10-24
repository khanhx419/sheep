import * as T from 'three';

// All textures and particles are generated locally, including the feathered dots.
export function createAtmosphere(scene) {
  const uniforms = { time: { value: 0 }, night: { value: 0 }, rainy: { value: 0 } };
  const skyMaterial = new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false,
    uniforms,
    vertexShader: 'varying vec3 vDirection; void main(){vDirection=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec3 vDirection; uniform float night; uniform float rainy; uniform float time;
      float hashNoise(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float softNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(hashNoise(i),hashNoise(i+vec2(1.,0.)),f.x),mix(hashNoise(i+vec2(0.,1.)),hashNoise(i+vec2(1.)),f.x),f.y);}
      void main(){vec3 direction=normalize(vDirection);float h=smoothstep(-.1,.8,direction.y);
      vec3 day=mix(vec3(.81,.79,.65),vec3(.31,.57,.69),h);
      vec3 dusk=mix(vec3(.12,.23,.29),vec3(.025,.065,.14),h);
      vec3 color=mix(day,dusk,night);color=mix(color,mix(vec3(.36,.42,.42),vec3(.23,.31,.36),h),rainy*.7);
      // Soft, broad cloud banks drift as part of the sky draw call. Their
      // rounded edges deliberately read as painted game scenery.
      vec2 cloudUV=direction.xz/(max(direction.y,0.)+.35)*1.5+vec2(time*.008,0.);
      float cloudShape=softNoise(cloudUV)*.72+softNoise(cloudUV*2.1)*.28;
      float clouds=smoothstep(.48-rainy*.1,.69-rainy*.1,cloudShape)*smoothstep(.04,.22,direction.y);
      vec3 cloudColor=mix(vec3(.92,.88,.73),vec3(.18,.27,.33),night);
      cloudColor=mix(cloudColor,mix(vec3(.52,.57,.55),vec3(.15,.22,.28),night),rainy*.75);
      color=mix(color,cloudColor,clouds*.72);
      float sunDot=dot(direction,normalize(vec3(-8.,17.,11.)));
      float sunDisc=smoothstep(.9981,.9988,sunDot),sunHalo=pow(max(sunDot,0.),42.)*.2;
      color+=vec3(1.,.78,.42)*(sunDisc*.8+sunHalo)*(1.-night)*(1.-rainy*.9)*(1.-clouds*.8);
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
