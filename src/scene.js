import * as THREE from 'three';

// Ashima Arts 3D simplex noise (MIT)
const noise = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const ACCENT = new THREE.Color('#c8ff3e');
const WHITE = new THREE.Color('#f2f2f2');

/**
 * Target state for the 3D scene. main.js tweens these values per section;
 * the render loop eases the live scene toward them.
 */
export const sceneState = {
  x: 2.4,
  y: 0,
  scale: 1,
  amp: 0.28,
  freq: 0.9,
  tilt: 0.35,
  ring: 1,
  wire: 0.35,
  glow: 0.4,
  opacity: 1,
};

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 8);

  const root = new THREE.Group();
  scene.add(root);
  const spin = new THREE.Group();
  root.add(spin);

  const pixelRatio = Math.min(window.devicePixelRatio, 2);

  // ---------- Core: noise-displaced fibonacci sphere of points ----------
  const COUNT = window.innerWidth < 768 ? 7000 : 14000;
  const positions = new Float32Array(COUNT * 3);
  const rands = new Float32Array(COUNT);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < COUNT; i++) {
    const y = 1 - (i / (COUNT - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const t = golden * i;
    positions.set([Math.cos(t) * r * 1.6, y * 1.6, Math.sin(t) * r * 1.6], i * 3);
    rands[i] = Math.random();
  }
  const coreGeo = new THREE.BufferGeometry();
  coreGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  coreGeo.setAttribute('aRand', new THREE.BufferAttribute(rands, 1));

  const coreUniforms = {
    uTime: { value: 0 },
    uAmp: { value: sceneState.amp },
    uFreq: { value: sceneState.freq },
    uSize: { value: 22 * pixelRatio },
    uColorA: { value: WHITE },
    uColorB: { value: ACCENT },
    uGlow: { value: sceneState.glow },
    uOpacity: { value: 1 },
    uMouse: { value: new THREE.Vector3(10, 10, 10) },
  };

  const coreMat = new THREE.ShaderMaterial({
    uniforms: coreUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      ${noise}
      uniform float uTime, uAmp, uFreq, uSize;
      uniform vec3 uMouse;
      attribute float aRand;
      varying float vNoise;
      varying float vRand;
      void main() {
        vec3 dir = normalize(position);
        float n = snoise(position * uFreq + vec3(uTime * 0.18));
        float n2 = snoise(position * uFreq * 2.6 - vec3(uTime * 0.25)) * 0.35;
        vec3 p = position + dir * (n + n2) * uAmp;
        // swell away from the pointer
        vec4 world = modelMatrix * vec4(p, 1.0);
        float md = distance(world.xyz, uMouse);
        p += dir * smoothstep(1.6, 0.0, md) * 0.35;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * (0.35 + aRand * 0.9) / -mv.z;
        vNoise = n + n2;
        vRand = aRand;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColorA, uColorB;
      uniform float uGlow, uOpacity;
      varying float vNoise;
      varying float vRand;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.05, d);
        float t = smoothstep(0.1, 0.9, vNoise) * uGlow + step(0.93, vRand) * 0.8;
        vec3 col = mix(uColorA, uColorB, clamp(t, 0.0, 1.0));
        gl_FragColor = vec4(col, a * uOpacity * (0.35 + vRand * 0.45));
      }
    `,
  });
  const core = new THREE.Points(coreGeo, coreMat);
  spin.add(core);

  // ---------- Inner wireframe ----------
  const wireMat = new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: sceneState.wire, blending: THREE.AdditiveBlending, depthWrite: false });
  const wire = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.85, 1)), wireMat);
  spin.add(wire);

  // ---------- Orbit ring ----------
  const RING = 2600;
  const ringPos = new Float32Array(RING * 3);
  for (let i = 0; i < RING; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 2.3 + Math.pow(Math.random(), 2) * 1.1;
    ringPos.set([Math.cos(a) * r, (Math.random() - 0.5) * 0.06, Math.sin(a) * r], i * 3);
  }
  const ringGeo = new THREE.BufferGeometry();
  ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPos, 3));
  const ringMat = new THREE.PointsMaterial({
    size: 0.018,
    color: 0xffffff,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const ring = new THREE.Points(ringGeo, ringMat);
  ring.rotation.x = 1.25;
  ring.rotation.z = 0.3;
  root.add(ring);

  // ---------- Background star field ----------
  const STARS = 1800;
  const starPos = new Float32Array(STARS * 3);
  for (let i = 0; i < STARS; i++) {
    starPos.set([(Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40, -Math.random() * 30 + 2], i * 3);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ size: 0.035, color: 0xffffff, transparent: true, opacity: 0.45, depthWrite: false }),
  );
  scene.add(stars);

  // ---------- Sizing ----------
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // ---------- Pointer ----------
  const pointer = new THREE.Vector2();
  const pointerEased = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hit = new THREE.Vector3(10, 10, 10);
  window.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  // ---------- Loop ----------
  const live = { ...sceneState };
  const timer = new THREE.Timer();
  let velocity = 0;
  let scrollY = 0;
  let intro = 0; // 0 → 1 entrance

  const lerp = (a, b, t) => a + (b - a) * t;

  function render() {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);
    const t = timer.getElapsed();
    const k = 1 - Math.pow(0.0015, dt); // frame-rate independent easing

    for (const key in sceneState) live[key] = lerp(live[key], sceneState[key], k);
    pointerEased.lerp(pointer, k);

    // Core placement
    const mobile = window.innerWidth < 768;
    root.position.x = mobile ? 0 : live.x;
    root.position.y = live.y + Math.sin(t * 0.6) * 0.06;
    const s = live.scale * (mobile ? 0.75 : 1) * (0.4 + intro * 0.6);
    root.scale.setScalar(s);
    root.rotation.x = live.tilt * 0.3 + pointerEased.y * 0.25;
    root.rotation.y = pointerEased.x * 0.35;

    spin.rotation.y += dt * (0.12 + Math.abs(velocity) * 0.004);
    spin.rotation.z = Math.sin(t * 0.2) * 0.15;
    wire.rotation.x -= dt * 0.25;
    wire.rotation.y += dt * 0.15;
    ring.rotation.y += dt * 0.05;

    coreUniforms.uTime.value = t;
    coreUniforms.uAmp.value = live.amp + Math.min(Math.abs(velocity) * 0.006, 0.35);
    coreUniforms.uFreq.value = live.freq;
    coreUniforms.uGlow.value = live.glow;
    coreUniforms.uOpacity.value = live.opacity * intro * (mobile ? 0.6 : 1);
    wireMat.opacity = live.wire * intro * (mobile ? 0.45 : 1);
    ringMat.opacity = 0.55 * live.ring * intro;

    // Pointer in world space for the swell effect
    raycaster.setFromCamera(pointer, camera);
    raycaster.ray.intersectPlane(plane, hit);
    coreUniforms.uMouse.value.lerp(hit, k);

    // Stars drift and parallax with scroll
    stars.position.y = scrollY * 0.0012;
    stars.rotation.z = t * 0.004;

    camera.position.x = pointerEased.x * 0.25;
    camera.position.y = pointerEased.y * 0.2;
    camera.lookAt(0, 0, 0);

    velocity *= 0.92;
    renderer.render(scene, camera);
  }

  return {
    render,
    setScroll(y, v) {
      scrollY = y;
      velocity = v;
    },
    setIntro(v) {
      intro = v;
    },
  };
}
