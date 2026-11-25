import * as THREE from 'three';

export const FIRST_LIGHT_DURATION = 23;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function smootherstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function makeFinish(color, metalness = 0.25, roughness = 0.45) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}

function drawMainframeReadout(ctx, stepText, statusText, online) {
  ctx.fillStyle = '#07111a';
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = online ? '#e5b869' : '#4a647c';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 496, 240);

  ctx.fillStyle = online ? '#8ef5b4' : '#e5b869';
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(statusText, 256, 62);

  ctx.fillStyle = online ? '#56f09f' : '#ffcf6e';
  ctx.font = 'bold 92px monospace';
  ctx.fillText(stepText, 256, 152);

  ctx.fillStyle = '#7ea3bd';
  ctx.font = '600 20px monospace';
  ctx.fillText('SEQ 0 · 1 · 2 · 3', 256, 218);
}

const SKY_VERT = `
varying vec3 vWorldDir;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldDir = normalize(position);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const SKY_FRAG = `
uniform float uTime;
uniform float uSkyReveal;
varying vec3 vWorldDir;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
        mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
        mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
    f.z
  );
}

float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.04;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 d = normalize(vWorldDir);
  float h = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 zenith = vec3(0.015, 0.028, 0.085);
  vec3 midSky = vec3(0.035, 0.082, 0.21);
  vec3 horizon = vec3(0.075, 0.145, 0.30);
  vec3 col = mix(horizon, midSky, smoothstep(0.35, 0.72, h));
  col = mix(col, zenith, smoothstep(0.68, 1.0, h));

  vec3 galNormal = normalize(vec3(0.34, 0.56, -0.75));
  float galDist = abs(dot(d, galNormal));
  float galBand = exp(-galDist * galDist * 13.0);
  float neb = fbm(d * 5.2 + vec3(0.0, uTime * 0.008, 0.0));
  float wisps = fbm(d * 11.5 - vec3(uTime * 0.012, 0.0, 0.0));
  float dustLane = smoothstep(0.35, 0.75, wisps);

  vec3 goldDust = vec3(0.95, 0.72, 0.36);
  vec3 violetNeb = vec3(0.42, 0.28, 0.78);
  vec3 cyanGas = vec3(0.18, 0.68, 0.85);
  vec3 milky = mix(violetNeb, goldDust, smoothstep(0.35, 0.8, neb));
  milky = mix(milky, cyanGas, wisps * 0.42);
  col += milky * galBand * (0.28 + 0.72 * neb) * (1.0 - 0.38 * dustLane) * 0.65 * uSkyReveal;

  float auroraWave = sin(d.x * 5.5 + uTime * 0.32 + neb * 4.2);
  float auroraArc = exp(-pow(d.z + 0.52 + 0.16 * auroraWave, 2.0) * 14.0);
  float auroraHeight = smoothstep(0.18, 0.55, d.y) * smoothstep(0.95, 0.42, d.y);
  vec3 auroraCol = mix(vec3(0.20, 0.90, 0.66), vec3(0.60, 0.40, 0.96), 0.5 + 0.5 * sin(d.x * 3.2 - uTime * 0.25));
  col += auroraCol * auroraArc * auroraHeight * (0.28 + 0.45 * wisps) * uSkyReveal;

  gl_FragColor = vec4(col, 1.0);
}
`;

const STAR_VERT = `
attribute float aSize;
attribute float aPhase;
attribute vec3 aColor;
uniform float uTime;
uniform float uPixelRatio;
varying vec3 vColor;
varying float vAlpha;

void main() {
  vColor = aColor;
  float twinkle = 0.72 + 0.28 * sin(uTime * 2.1 + aPhase);
  vAlpha = twinkle;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = clamp(aSize * uPixelRatio * (270.0 / max(40.0, -mv.z)) * (0.85 + 0.2 * twinkle), 1.5, 18.0);
  gl_Position = projectionMatrix * mv;
}
`;

const STAR_FRAG = `
uniform float uSkyReveal;
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float r = length(uv);
  if (r > 0.5) discard;
  float core = exp(-r * r * 28.0);
  float crossSpike = exp(-abs(uv.x) * 28.0) * exp(-abs(uv.y) * 5.5) + exp(-abs(uv.y) * 28.0) * exp(-abs(uv.x) * 5.5);
  float intensity = clamp(core + crossSpike * 0.35, 0.0, 1.0);
  gl_FragColor = vec4(vColor, intensity * vAlpha * uSkyReveal);
}
`;

const PHASE_COPY = [
  {
    eyebrow: 'ACT I · CORE BOOT',
    title: 'MAINFRAME ONLINE',
    sub: 'Binary clock locked · Sequence 0 → 1 → 2 → 3 verified'
  },
  {
    eyebrow: 'ACT II · POWER DISTRIBUTION',
    title: 'CONDUITS ENGAGED',
    sub: 'Power bus, timing bank, arithmetic unit, and dome drive active'
  },
  {
    eyebrow: 'ACT III · DOME MECHANISM',
    title: 'SHUTTERS OPENING',
    sub: 'Azimuth gear ring engaged · Zenith aperture clearing'
  },
  {
    eyebrow: 'ACT IV · ALIGNMENT',
    title: 'FIRST LIGHT ACQUIRED',
    sub: 'Equatorial brass refractor locked · Celestial chart online'
  },
  {
    eyebrow: 'ACT V · DEEP SKY TELEMETRY',
    title: 'LITTLE CIRCUIT OBSERVATORY',
    sub: 'All systems nominal · Observatory dome open'
  }
];

export function createFirstLightScene({ onlineCount = 11, totalCount = 11 } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#040713');
  scene.fog = new THREE.FogExp2('#060c1f', 0.0042);

  const camera = new THREE.PerspectiveCamera(44, 16 / 9, 0.1, 600);
  camera.position.set(4.5, 3.3, 2.2);

  // Lighting
  const hemiLight = new THREE.HemisphereLight('#8cb8f5', '#2b1e16', 0.85);
  const keyLight = new THREE.DirectionalLight('#ffdf9e', 1.65);
  keyLight.position.set(-14, 24, 18);
  const starMoonLight = new THREE.DirectionalLight('#7cc7ff', 0.25);
  starMoonLight.position.set(6, 38, -22);
  const coreLight = new THREE.PointLight('#f5bc5b', 0.4, 26, 1.6);
  coreLight.position.set(0, 3.0, 6.2);
  const astrolabeLight = new THREE.PointLight('#6ce7ff', 0.2, 22, 1.5);
  astrolabeLight.position.set(0, 5.4, -10.5);
  const pierLight = new THREE.PointLight('#ffd27a', 0.25, 22, 1.5);
  pierLight.position.set(0, 3.8, -1.5);
  scene.add(hemiLight, keyLight, starMoonLight, coreLight, astrolabeLight, pierLight);

  // Materials
  const slateMat = makeFinish('#151d2d', 0.28, 0.62);
  const darkIronMat = makeFinish('#1e283b', 0.52, 0.46);
  const walnutMat = makeFinish('#4c3322', 0.12, 0.68);
  const brassMat = makeFinish('#cf9f4e', 0.72, 0.28);
  const copperMat = makeFinish('#c97542', 0.65, 0.34);
  const domeShellMat = makeFinish('#131b2c', 0.42, 0.54);
  const shutterMat = makeFinish('#192338', 0.48, 0.48);

  // Sky Dome Shader
  const skyUniforms = {
    uTime: { value: 0 },
    uSkyReveal: { value: 0.18 }
  };
  const skyMat = new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    side: THREE.BackSide,
    depthWrite: false
  });
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(220, 40, 28), skyMat);
  scene.add(skyDome);

  // 2,400 Spectral Twinkling Stars
  const rng = seededRandom(4242);
  const starCount = 2400;
  const starPos = new Float32Array(starCount * 3);
  const starSizes = new Float32Array(starCount);
  const starPhases = new Float32Array(starCount);
  const starColors = new Float32Array(starCount * 3);
  const palette = [
    new THREE.Color('#b8dcff'),
    new THREE.Color('#fff9ef'),
    new THREE.Color('#ffe29a'),
    new THREE.Color('#ffb57b'),
    new THREE.Color('#c8e8ff')
  ];
  const galAxis = new THREE.Vector3(0.34, 0.56, -0.75).normalize();
  const vTmp = new THREE.Vector3();
  for (let i = 0; i < starCount; i++) {
    let dir;
    if (i < starCount * 0.42) {
      // Cluster densely along Milky Way plane
      const angle = rng() * Math.PI * 2;
      const spread = (rng() - 0.5) * 0.32;
      const tangent = new THREE.Vector3(1, 0, 0).cross(galAxis).normalize();
      const bitangent = new THREE.Vector3().crossVectors(galAxis, tangent).normalize();
      dir = tangent.multiplyScalar(Math.cos(angle))
        .addScaledVector(bitangent, Math.sin(angle))
        .addScaledVector(galAxis, spread)
        .normalize();
      if (dir.y < 0.05) dir.y = Math.abs(dir.y) + 0.08;
      dir.normalize();
    } else {
      const u = rng();
      const v = rng();
      const theta = Math.acos(0.05 + u * 0.95);
      const phi = v * Math.PI * 2;
      dir = vTmp.set(
        Math.sin(theta) * Math.cos(phi),
        Math.cos(theta),
        Math.sin(theta) * Math.sin(phi)
      ).clone();
    }
    const radius = 175 + rng() * 25;
    starPos[i * 3] = dir.x * radius;
    starPos[i * 3 + 1] = dir.y * radius;
    starPos[i * 3 + 2] = dir.z * radius;
    starSizes[i] = 1.6 + Math.pow(rng(), 2.8) * 5.2;
    starPhases[i] = rng() * Math.PI * 2;
    const c = palette[Math.floor(rng() * palette.length)];
    starColors[i * 3] = c.r;
    starColors[i * 3 + 1] = c.g;
    starColors[i * 3 + 2] = c.b;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('aSize', new THREE.BufferAttribute(starSizes, 1));
  starGeo.setAttribute('aPhase', new THREE.BufferAttribute(starPhases, 1));
  starGeo.setAttribute('aColor', new THREE.BufferAttribute(starColors, 3));
  const starMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: skyUniforms.uTime,
      uSkyReveal: skyUniforms.uSkyReveal,
      uPixelRatio: { value: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1 }
    },
    vertexShader: STAR_VERT,
    fragmentShader: STAR_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const starPoints = new THREE.Points(starGeo, starMat);
  scene.add(starPoints);

  // 4 Golden Celestial Constellations high along north-zenith sky
  const constellationDefs = [
    // Hourglass / Orion-inspired
    {
      nodes: [[-18, 92, -88], [-6, 98, -90], [-11, 86, -86], [-20, 74, -82], [-8, 72, -84], [-14, 86, -86]],
      edges: [[0, 1], [0, 2], [1, 5], [2, 3], [5, 4], [3, 4], [2, 5]]
    },
    // Northern Cross
    {
      nodes: [[12, 118, -72], [18, 108, -78], [24, 98, -84], [8, 102, -76], [28, 113, -79]],
      edges: [[0, 1], [1, 2], [3, 1], [1, 4]]
    },
    // W-Crown / Cassiopeia
    {
      nodes: [[-10, 128, -48], [-3, 122, -52], [4, 129, -46], [11, 123, -50], [18, 130, -44]],
      edges: [[0, 1], [1, 2], [2, 3], [3, 4]]
    },
    // Big Dipper arc overhead
    {
      nodes: [[-28, 112, -58], [-21, 116, -54], [-15, 112, -50], [-8, 109, -48], [-2, 103, -46], [2, 111, -44], [-8, 109, -48]],
      edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 2]]
    }
  ];
  const constVerts = [];
  const constAnchorMeshes = [];
  const constAnchorMat = new THREE.MeshBasicMaterial({ color: '#ffe594', transparent: true, opacity: 0 });
  const anchorGeo = new THREE.OctahedronGeometry(0.65, 0);
  for (const con of constellationDefs) {
    for (const [x, y, z] of con.nodes) {
      const m = new THREE.Mesh(anchorGeo, constAnchorMat);
      m.position.set(x, y, z);
      scene.add(m);
      constAnchorMeshes.push(m);
    }
    for (const [a, b] of con.edges) {
      constVerts.push(...con.nodes[a], ...con.nodes[b]);
    }
  }
  const constLineGeo = new THREE.BufferGeometry();
  constLineGeo.setAttribute('position', new THREE.Float32BufferAttribute(constVerts, 3));
  const constLineMat = new THREE.LineBasicMaterial({ color: '#ffd978', transparent: true, opacity: 0 });
  const constellationLines = new THREE.LineSegments(constLineGeo, constLineMat);
  scene.add(constellationLines);

  // Blazing Comet
  const cometGroup = new THREE.Group();
  const cometHeadMat = new THREE.MeshBasicMaterial({ color: '#e6fbff', transparent: true, opacity: 0 });
  const cometAuraMat = new THREE.MeshBasicMaterial({ color: '#5ee6ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const cometIonMat = new THREE.MeshBasicMaterial({ color: '#58d8ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const cometDustMat = new THREE.MeshBasicMaterial({ color: '#ffd485', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const cometCore = new THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 10), cometHeadMat);
  const cometAura = new THREE.Mesh(new THREE.SphereGeometry(1.45, 14, 10), cometAuraMat);
  const ionTail = new THREE.Mesh(new THREE.ConeGeometry(1.3, 18, 12, 1, true), cometIonMat);
  ionTail.position.y = 9.0;
  ionTail.rotation.x = Math.PI;
  const dustTail = new THREE.Mesh(new THREE.ConeGeometry(2.1, 14, 12, 1, true), cometDustMat);
  dustTail.position.y = 7.0;
  dustTail.rotation.x = Math.PI;
  dustTail.rotation.z = 0.09;
  const tailPivot = new THREE.Group();
  tailPivot.add(ionTail, dustTail);

  const sparkleCount = 48;
  const sparklePos = new Float32Array(sparkleCount * 3);
  for (let i = 0; i < sparkleCount; i++) {
    const d = 1 + rng() * 14;
    const s = (d / 14) * 1.1;
    sparklePos[i * 3] = (rng() - 0.5) * s;
    sparklePos[i * 3 + 1] = d;
    sparklePos[i * 3 + 2] = (rng() - 0.5) * s;
  }
  const sparkleGeo = new THREE.BufferGeometry();
  sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparklePos, 3));
  const sparkleMat = new THREE.PointsMaterial({ color: '#9cf3ff', size: 0.55, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  tailPivot.add(new THREE.Points(sparkleGeo, sparkleMat));

  cometGroup.add(cometCore, cometAura, tailPivot);
  cometGroup.visible = false;
  scene.add(cometGroup);

  // Rotunda Floor, Compass Rings & 12 Perimeter Columns
  const rotunda = new THREE.Group();
  scene.add(rotunda);

  const floorMesh = new THREE.Mesh(new THREE.CylinderGeometry(24.2, 24.4, 0.5, 48), slateMat);
  floorMesh.position.y = -0.25;
  rotunda.add(floorMesh);

  for (const ringR of [5.5, 11.5, 17.5, 22.8]) {
    const rMesh = new THREE.Mesh(new THREE.TorusGeometry(ringR, 0.08, 8, 64), brassMat);
    rMesh.rotation.x = Math.PI / 2;
    rMesh.position.y = 0.04;
    rotunda.add(rMesh);
  }
  const tickGeo = new THREE.BoxGeometry(0.1, 0.04, 1.35);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const tMesh = new THREE.Mesh(tickGeo, brassMat);
    tMesh.position.set(Math.sin(a) * 21.8, 0.03, Math.cos(a) * 21.8);
    tMesh.rotation.y = a;
    rotunda.add(tMesh);
  }

  // Outer cylindrical parapet wall & columns
  const parapet = new THREE.Mesh(new THREE.CylinderGeometry(23.6, 23.8, 3.2, 48, 1, true), darkIronMat);
  parapet.material.side = THREE.DoubleSide;
  parapet.position.y = 1.6;
  rotunda.add(parapet);

  const sconceMats = [];
  const colShaftGeo = new THREE.CylinderGeometry(0.46, 0.56, 13.5, 14);
  const colCapGeo = new THREE.CylinderGeometry(0.74, 0.5, 0.65, 14);
  const sconceGeo = new THREE.SphereGeometry(0.24, 10, 8);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
    const cx = Math.sin(a) * 22.8;
    const cz = Math.cos(a) * 22.8;
    const col = new THREE.Mesh(colShaftGeo, darkIronMat);
    col.position.set(cx, 6.75, cz);
    const cap = new THREE.Mesh(colCapGeo, brassMat);
    cap.position.set(cx, 13.25, cz);
    const base = new THREE.Mesh(colCapGeo, brassMat);
    base.position.set(cx, 0.35, cz);
    const sMat = new THREE.MeshStandardMaterial({ color: '#473620', emissive: '#ffb84d', emissiveIntensity: 0.12 });
    const sconce = new THREE.Mesh(sconceGeo, sMat);
    sconce.position.set(Math.sin(a) * 22.1, 5.4, Math.cos(a) * 22.1);
    sconceMats.push(sMat);
    rotunda.add(col, cap, base, sconce);
  }

  // Azimuth Geared Ring & Observatory Dome + Bi-Parting Shutters
  const domeGroup = new THREE.Group();
  domeGroup.position.set(0, 13.5, 0);
  rotunda.add(domeGroup);

  const trackRing = new THREE.Mesh(new THREE.TorusGeometry(22.9, 0.42, 10, 64), brassMat);
  trackRing.rotation.x = Math.PI / 2;
  domeGroup.add(trackRing);

  // Two side dome hemisphere shells leaving a North-South slit corridor
  const leftDomeShell = new THREE.Mesh(
    new THREE.SphereGeometry(23.0, 22, 18, -0.36 * Math.PI, 0.72 * Math.PI, 0.06, Math.PI * 0.48),
    domeShellMat
  );
  leftDomeShell.material.side = THREE.DoubleSide;
  const rightDomeShell = new THREE.Mesh(
    new THREE.SphereGeometry(23.0, 22, 18, 0.64 * Math.PI, 0.72 * Math.PI, 0.06, Math.PI * 0.48),
    domeShellMat
  );
  rightDomeShell.material.side = THREE.DoubleSide;
  domeGroup.add(leftDomeShell, rightDomeShell);

  // Brass arch ribs framing both sides of the shutter corridor
  for (const ribX of [-6.4, 6.4]) {
    const rRadius = Math.sqrt(Math.max(40, 23.1 * 23.1 - ribX * ribX));
    const rib = new THREE.Mesh(new THREE.TorusGeometry(rRadius, 0.22, 8, 42, Math.PI), brassMat);
    rib.rotation.y = Math.PI / 2;
    rib.position.x = ribX;
    domeGroup.add(rib);
  }
  for (const rotY of [-0.9, -0.45, 0.45, 0.9]) {
    const meridian = new THREE.Mesh(new THREE.TorusGeometry(23.05, 0.14, 8, 36, Math.PI * 0.48), brassMat);
    meridian.rotation.y = rotY;
    domeGroup.add(meridian);
  }

  // Bi-parting Twin Shutters covering south and north halves of the slit when closed
  const leftShutter = new THREE.Group();
  const rightShutter = new THREE.Group();
  domeGroup.add(leftShutter, rightShutter);

  const lSouth = new THREE.Mesh(new THREE.SphereGeometry(23.22, 12, 16, 0.35 * Math.PI, 0.155 * Math.PI, 0.01, Math.PI * 0.495), shutterMat);
  const lNorth = new THREE.Mesh(new THREE.SphereGeometry(23.22, 12, 16, 1.495 * Math.PI, 0.155 * Math.PI, 0.01, Math.PI * 0.495), shutterMat);
  const lSeam = new THREE.Mesh(new THREE.TorusGeometry(23.34, 0.19, 8, 42, Math.PI), brassMat);
  lSeam.rotation.y = Math.PI / 2;
  leftShutter.add(lSouth, lNorth, lSeam);

  const rSouth = new THREE.Mesh(new THREE.SphereGeometry(23.22, 12, 16, 0.495 * Math.PI, 0.155 * Math.PI, 0.01, Math.PI * 0.495), shutterMat);
  const rNorth = new THREE.Mesh(new THREE.SphereGeometry(23.22, 12, 16, 1.35 * Math.PI, 0.155 * Math.PI, 0.01, Math.PI * 0.495), shutterMat);
  const rSeam = new THREE.Mesh(new THREE.TorusGeometry(23.34, 0.19, 8, 42, Math.PI), brassMat);
  rSeam.rotation.y = Math.PI / 2;
  rightShutter.add(rSouth, rNorth, rSeam);

  // Volumetric moonlight slit shaft (lights up when dome opens)
  const shaftMat = new THREE.MeshBasicMaterial({
    color: '#9ad8ff',
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const slitShaft = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 8.8, 34, 18, 1, true), shaftMat);
  slitShaft.position.set(0, 17, -2.5);
  slitShaft.rotation.x = 0.22;
  rotunda.add(slitShaft);

  // Hero Mainframe Console at (0, 0, 8.2) facing -Z
  const mainframe = new THREE.Group();
  mainframe.position.set(0, 0, 8.2);
  rotunda.add(mainframe);
  const cabinetBody = new THREE.Mesh(new THREE.BoxGeometry(8.6, 4.4, 1.4), walnutMat);
  cabinetBody.position.y = 2.2;
  const cabinetFace = new THREE.Mesh(new THREE.BoxGeometry(8.1, 3.9, 0.3), darkIronMat);
  cabinetFace.position.set(0, 2.2, -0.62);
  const cabinetCrown = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.26, 1.65), brassMat);
  cabinetCrown.position.y = 4.52;
  mainframe.add(cabinetBody, cabinetFace, cabinetCrown);
  for (const bx of [-4.25, 4.25]) {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.26, 4.4, 1.55), brassMat);
    trim.position.set(bx, 2.2, 0);
    mainframe.add(trim);
  }

  // Live 4-bit Readout Canvas on Mainframe
  let readoutCtx = null;
  let readoutTex = null;
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    readoutCtx = canvas.getContext('2d');
    if (readoutCtx) {
      drawMainframeReadout(readoutCtx, '0', 'SEQUENCE CHECK', false);
      readoutTex = new THREE.CanvasTexture(canvas);
      readoutTex.colorSpace = THREE.SRGBColorSpace;
    }
  }
  const readoutMat = readoutTex
    ? new THREE.MeshBasicMaterial({ map: readoutTex })
    : new THREE.MeshBasicMaterial({ color: '#56f09f' });
  const readoutScreen = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), readoutMat);
  readoutScreen.position.set(0, 3.05, -0.80);
  readoutScreen.rotation.y = Math.PI;
  const readoutBezel = new THREE.Mesh(new THREE.BoxGeometry(2.85, 1.52, 0.1), brassMat);
  readoutBezel.position.set(0, 3.05, -0.76);
  mainframe.add(readoutBezel, readoutScreen);

  // 5 Feed Lamps & 6 Core Module Bays on Mainframe face
  const mfFeedMats = [];
  for (let i = 0; i < 5; i++) {
    const x = -2.6 + i * 1.3;
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.42, 0.12), brassMat);
    bezel.position.set(x, 0.95, -0.76);
    const lMat = new THREE.MeshStandardMaterial({ color: '#3b3022', emissive: '#f5b849', emissiveIntensity: 0.1 });
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.28, 0.08), lMat);
    lamp.position.set(x, 0.95, -0.81);
    mfFeedMats.push(lMat);
    mainframe.add(bezel, lamp);
  }
  const mfCoreMats = [];
  for (let i = 0; i < 6; i++) {
    const sideX = i < 3 ? -3.45 + i * 0.78 : 1.9 + (i - 3) * 0.78;
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.58, 1.5, 0.12), brassMat);
    bezel.position.set(sideX, 3.05, -0.76);
    const cMat = new THREE.MeshStandardMaterial({ color: '#1b2937', emissive: '#6ef0a8', emissiveIntensity: 0.08 });
    const bay = new THREE.Mesh(new THREE.BoxGeometry(0.44, 1.3, 0.08), cMat);
    bay.position.set(sideX, 3.05, -0.81);
    mfCoreMats.push(cMat);
    mainframe.add(bezel, bay);
  }

  // 6 Floor Power Conduits connecting Mainframe -> Pier & Columns
  const conduitRoutes = [
    [new THREE.Vector3(-1.4, 0.06, 7.2), new THREE.Vector3(-0.9, 0.06, -1.5)],
    [new THREE.Vector3(1.4, 0.06, 7.2), new THREE.Vector3(0.9, 0.06, -1.5)],
    [new THREE.Vector3(-2.6, 0.06, 7.2), new THREE.Vector3(-13.5, 0.06, 3.2)],
    [new THREE.Vector3(2.6, 0.06, 7.2), new THREE.Vector3(13.5, 0.06, 3.2)],
    [new THREE.Vector3(-1.1, 0.06, -1.5), new THREE.Vector3(-8.5, 0.06, -13.5)],
    [new THREE.Vector3(1.1, 0.06, -1.5), new THREE.Vector3(8.5, 0.06, -13.5)]
  ];
  const conduits = [];
  const beadGeo = new THREE.SphereGeometry(0.22, 10, 8);
  const pulseBeadMat = new THREE.MeshBasicMaterial({ color: '#ffe58f' });
  for (let i = 0; i < conduitRoutes.length; i++) {
    const [a, b] = conduitRoutes[i];
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const angleY = Math.atan2(dir.x, dir.z);

    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, len), brassMat);
    rail.position.copy(mid);
    rail.rotation.y = angleY;
    const stripMat = new THREE.MeshStandardMaterial({ color: '#2b241d', emissive: '#ffba42', emissiveIntensity: 0.05 });
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, len - 0.15), stripMat);
    strip.position.copy(mid);
    strip.rotation.y = angleY;
    const bead = new THREE.Mesh(beadGeo, pulseBeadMat);
    bead.visible = false;
    rotunda.add(rail, strip, bead);
    conduits.push({ a, b, stripMat, bead, order: i });
  }

  // Hero Equatorial Brass Refractor Telescope at (0, 0, -1.5)
  const dais = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.6, 0.45, 32), darkIronMat);
  dais.position.set(0, 0.22, -1.5);
  const daisRim = new THREE.Mesh(new THREE.TorusGeometry(5.35, 0.1, 8, 48), brassMat);
  daisRim.rotation.x = Math.PI / 2;
  daisRim.position.set(0, 0.46, -1.5);
  rotunda.add(dais, daisRim);

  const pierBase = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.35, 3.9, 20), darkIronMat);
  pierBase.position.set(0, 2.35, -1.5);
  const pierCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 0.98, 0.34, 24), brassMat);
  pierCollar.position.set(0, 4.3, -1.5);
  rotunda.add(pierBase, pierCollar);

  const telescopeYaw = new THREE.Group();
  telescopeYaw.position.set(0, 4.6, -1.5);
  rotunda.add(telescopeYaw);

  const yokeArmL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.6, 0.55), brassMat);
  yokeArmL.position.set(-0.95, 0.65, 0);
  const yokeArmR = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.6, 0.55), brassMat);
  yokeArmR.position.set(0.95, 0.65, 0);
  const yokeBase = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.36, 0.8), darkIronMat);
  telescopeYaw.add(yokeArmL, yokeArmR, yokeBase);

  const tubePivot = new THREE.Group();
  tubePivot.position.set(0, 1.25, 0);
  tubePivot.rotation.x = 0.28;
  telescopeYaw.add(tubePivot);

  const mainTube = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.62, 13.8, 24), brassMat);
  mainTube.rotation.x = Math.PI / 2;
  mainTube.position.z = -1.6;
  const dewShield = new THREE.Mesh(new THREE.CylinderGeometry(0.70, 0.64, 2.2, 24), copperMat);
  dewShield.rotation.x = Math.PI / 2;
  dewShield.position.z = -9.1;
  for (const bandZ of [-6.8, -3.6, -0.5, 2.8]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.075, 8, 28), darkIronMat);
    band.position.z = bandZ;
    tubePivot.add(band);
  }
  const eyepiece = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 1.6, 16), darkIronMat);
  eyepiece.rotation.x = Math.PI / 2;
  eyepiece.position.z = 5.6;
  const finderBar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.12), brassMat);
  finderBar.position.set(0.55, 0.52, -2.5);
  const finderTube = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 3.4, 14), copperMat);
  finderTube.rotation.x = Math.PI / 2;
  finderTube.position.set(0.55, 0.78, -2.8);
  const counterRod = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.5, 10), brassMat);
  counterRod.position.set(0, -1.25, 1.4);
  const counterWeight = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.48, 20), darkIronMat);
  counterWeight.position.set(0, -2.15, 1.4);

  const lensMat = new THREE.MeshStandardMaterial({ color: '#4db8ff', emissive: '#6ce2ff', emissiveIntensity: 0.25, roughness: 0.12, metalness: 0.4 });
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.60, 0.60, 0.1, 24), lensMat);
  lens.rotation.x = Math.PI / 2;
  lens.position.z = -10.1;

  // Skyward First Light Alignment Beam
  const alignBeamMat = new THREE.MeshBasicMaterial({
    color: '#88e8ff',
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const alignBeam = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 0.65, 58, 18, 1, true), alignBeamMat);
  alignBeam.rotation.x = -Math.PI / 2;
  alignBeam.position.z = -39;

  tubePivot.add(mainTube, dewShield, eyepiece, finderBar, finderTube, counterRod, counterWeight, lens, alignBeam);

  // Triple-Ring Celestial Astrolabe Sphere at (0, 5.4, -10.5)
  const astrolabePedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 1.05, 2.4, 16), darkIronMat);
  astrolabePedestal.position.set(0, 1.2, -10.5);
  rotunda.add(astrolabePedestal);

  const astrolabe = new THREE.Group();
  astrolabe.position.set(0, 5.4, -10.5);
  rotunda.add(astrolabe);
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(2.85, 0.11, 10, 48), brassMat);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.095, 10, 40), copperMat);
  const ring3 = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.08, 8, 36), brassMat);
  ring2.rotation.y = 0.7;
  ring3.rotation.x = 0.9;
  const starCoreMat = new THREE.MeshStandardMaterial({ color: '#ffd97a', emissive: '#ffd25a', emissiveIntensity: 0.3, roughness: 0.2 });
  const starCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.58, 0), starCoreMat);
  astrolabe.add(ring1, ring2, ring3, starCore);

  // 260 Floating Warm Golden Dust Motes
  const dustCount = 260;
  const dustBase = new Float32Array(dustCount * 3);
  const dustPos = new Float32Array(dustCount * 3);
  const dustPhase = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i++) {
    const a = rng() * Math.PI * 2;
    const rad = 2 + Math.sqrt(rng()) * 19;
    dustBase[i * 3] = Math.sin(a) * rad;
    dustBase[i * 3 + 1] = 0.8 + rng() * 14.5;
    dustBase[i * 3 + 2] = Math.cos(a) * rad;
    dustPhase[i] = rng() * Math.PI * 2;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({ color: '#ffe199', size: 0.16, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false });
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  rotunda.add(dustPoints);

  // Camera Choreography state
  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const state = {
    time: 0,
    progress: 0,
    finished: false,
    flash: 0,
    shutterOpen: 0,
    telescopePitch: 0.28,
    phaseIndex: 0,
    ...PHASE_COPY[0]
  };
  let lastReadoutStep = '0:0';

  function update(dt = 0) {
    const safeDt = Math.max(0, Math.min(0.1, Number.isFinite(dt) ? dt : 0));
    state.time += safeDt;
    const t = state.time;
    state.progress = clamp(t / FIRST_LIGHT_DURATION, 0, 1);
    if (t >= FIRST_LIGHT_DURATION) state.finished = true;

    skyUniforms.uTime.value = t;

    // 1. Mainframe Act 1 sequence (0 -> 1 -> 2 -> 3 -> ONLINE)
    const seqDone = t >= 3.2;
    const stepDigit = seqDone ? `${onlineCount}/${totalCount}` : String(Math.min(3, Math.floor(t / 0.8)));
    const readKey = `${seqDone ? 1 : 0}:${stepDigit}`;
    if (readKey !== lastReadoutStep && readoutCtx && readoutTex) {
      lastReadoutStep = readKey;
      drawMainframeReadout(readoutCtx, stepDigit, seqDone ? 'MAINFRAME ONLINE' : 'SEQUENCE CHECK', seqDone);
      readoutTex.needsUpdate = true;
    }

    const coreProgress = clamp((t - 0.3) / 2.8, 0, 1);
    const activeCores = Math.round(coreProgress * mfCoreMats.length);
    for (let i = 0; i < mfCoreMats.length; i++) {
      mfCoreMats[i].emissiveIntensity = i < activeCores ? 1.85 : 0.08;
    }
    const conduitWarmup = smoothstep(3.4, 7.6, t);
    for (let i = 0; i < mfFeedMats.length; i++) {
      const lit = t >= 3.6 + i * 0.45 ? 1.7 : 0.1;
      mfFeedMats[i].emissiveIntensity = lit;
    }
    coreLight.intensity = 0.4 + coreProgress * 2.1;

    // 2. Floor Power Conduits & Sconces
    for (const c of conduits) {
      const fireAt = 3.8 + c.order * 0.48;
      const pulse = clamp((t - fireAt) / 1.4, 0, 1);
      c.stripMat.emissiveIntensity = 0.05 + smoothstep(fireAt, fireAt + 0.6, t) * 1.9;
      c.bead.visible = t >= fireAt;
      if (c.bead.visible) {
        const travel = (t >= fireAt + 1.4) ? ((t * 0.85 + c.order * 0.17) % 1) : pulse;
        c.bead.position.lerpVectors(c.a, c.b, travel);
        c.bead.position.y = 0.16;
      }
    }
    for (let i = 0; i < sconceMats.length; i++) {
      const sLit = smoothstep(4.2 + (i % 6) * 0.35, 5.4 + (i % 6) * 0.35, t);
      sconceMats[i].emissiveIntensity = 0.12 + sLit * 1.7;
    }

    // 3. Observatory Dome Azimuth Spin & Bi-parting Shutters
    const shutterOpen = smootherstep(7.8, 12.6, t);
    state.shutterOpen = shutterOpen;
    domeGroup.rotation.y = smoothstep(7.6, 13.0, t) * 0.22;
    leftShutter.rotation.z = 0.42 * shutterOpen;
    rightShutter.rotation.z = -0.42 * shutterOpen;

    skyUniforms.uSkyReveal.value = 0.18 + 0.82 * shutterOpen;
    starMoonLight.intensity = 0.22 + 1.15 * shutterOpen;
    shaftMat.opacity = shutterOpen * (0.095 + 0.015 * Math.sin(t * 1.4));

    // 4. Hero Telescope Slew, First Light Flash & Astrolabe Precession
    const slew = smootherstep(8.8, 14.2, t);
    const pitch = 0.28 + slew * 0.68;
    state.telescopePitch = pitch;
    tubePivot.rotation.x = pitch;
    telescopeYaw.rotation.y = Math.sin(slew * Math.PI) * -0.14;

    const firstLightOn = smoothstep(12.3, 13.2, t);
    lensMat.emissiveIntensity = 0.25 + firstLightOn * 2.5;
    alignBeamMat.opacity = firstLightOn * (0.22 + 0.04 * Math.sin(t * 3.1));
    pierLight.intensity = 0.25 + firstLightOn * 2.6;

    // Brief golden First Light flash pulse around t = 12.6 s
    const flashRise = smoothstep(12.45, 12.85, t);
    const flashFall = 1 - smoothstep(12.85, 13.9, t);
    state.flash = flashRise * flashFall * 0.58;

    // Astrolabe precession
    const astroSpeed = 0.15 + conduitWarmup * 0.75 + firstLightOn * 0.65;
    ring1.rotation.y += astroSpeed * 0.7 * safeDt;
    ring1.rotation.x += astroSpeed * 0.22 * safeDt;
    ring2.rotation.x -= astroSpeed * 1.05 * safeDt;
    ring2.rotation.z += astroSpeed * 0.35 * safeDt;
    ring3.rotation.y -= astroSpeed * 1.35 * safeDt;
    starCore.rotation.y += astroSpeed * 1.6 * safeDt;
    starCoreMat.emissiveIntensity = 0.3 + conduitWarmup * 1.2 + firstLightOn * 1.9;
    astrolabeLight.intensity = 0.2 + conduitWarmup * 1.4 + firstLightOn * 1.8;

    // 5. Constellations & Comet
    const constReveal = smoothstep(12.4, 16.0, t);
    const breathe = 0.85 + 0.15 * Math.sin(t * 1.8);
    constAnchorMat.opacity = constReveal * breathe;
    constLineMat.opacity = constReveal * 0.74 * breathe;

    let cometPhase = -1;
    if (t >= 13.0 && t <= 18.6) {
      cometPhase = (t - 13.0) / 5.6;
    } else if (t > 18.6) {
      const cycle = (t - 18.6) % 14.0;
      if (cycle < 6.4) cometPhase = cycle / 6.4;
    }
    if (cometPhase >= 0 && cometPhase <= 1) {
      cometGroup.visible = true;
      const cx = -42 + cometPhase * 86;
      const cy = 92 + Math.sin(cometPhase * Math.PI) * 18;
      const cz = -96 + cometPhase * 12;
      cometGroup.position.set(cx, cy, cz);
      const fade = Math.sin(cometPhase * Math.PI);
      cometHeadMat.opacity = fade;
      cometAuraMat.opacity = fade * 0.55;
      cometIonMat.opacity = fade * 0.42;
      cometDustMat.opacity = fade * 0.28;
      sparkleMat.opacity = fade * 0.85;
      // Align tail behind motion vector (-X, slight -Y slope)
      const tailDir = new THREE.Vector3(-1, -0.22 * Math.cos(cometPhase * Math.PI), -0.14).normalize();
      tailPivot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tailDir);
    } else {
      cometGroup.visible = false;
    }

    // 6. Dust motes drift
    for (let i = 0; i < dustCount; i++) {
      const ph = dustPhase[i];
      dustPos[i * 3] = dustBase[i * 3] + Math.sin(t * 0.45 + ph) * 0.45;
      dustPos[i * 3 + 1] = dustBase[i * 3 + 1] + Math.sin(t * 0.32 + ph * 1.3) * 0.35;
      dustPos[i * 3 + 2] = dustBase[i * 3 + 2] + Math.cos(t * 0.4 + ph * 0.8) * 0.45;
    }
    dustGeo.attributes.position.needsUpdate = true;

    // 7. 5-Act Camera Choreography & Captions
    let phaseIndex = 0;
    if (t < 3.8) {
      phaseIndex = 0;
      const k = smootherstep(0, 3.8, t);
      camPos.set(4.5 - k * 7.1, 3.3 + k * 0.9, 2.2 + k * 0.9);
      camLook.set(0, 2.9 - k * 0.5, 8.1);
    } else if (t < 7.8) {
      phaseIndex = 1;
      const k = smootherstep(3.8, 7.8, t);
      camPos.set(-2.6 + k * 10.6, 4.2 + k * 2.5, 3.1 - k * 5.8);
      camLook.set(0, 2.4 + k * 1.4, 8.1 - k * 9.6);
    } else if (t < 12.6) {
      phaseIndex = 2;
      const k = smootherstep(7.8, 12.6, t);
      const rumbleAmt = Math.sin(k * Math.PI) * 0.085;
      const shakeX = Math.sin(t * 43) * rumbleAmt;
      const shakeY = Math.cos(t * 57) * rumbleAmt;
      camPos.set(8.0 + k * 1.4 + shakeX, 6.7 - k * 3.9 + shakeY, -2.7 + k * 12.2);
      camLook.set(0, 3.8 + k * 15.8, -1.5 - k * 6.5);
    } else if (t < 17.8) {
      phaseIndex = 3;
      const k = smootherstep(12.6, 17.8, t);
      camPos.set(9.4 - k * 15.8, 2.8 + k * 6.8, 9.5 - k * 4.0);
      camLook.set(-1.5 + k * 1.5, 19.6 + k * 6.0, -8.0 - k * 18.0);
    } else {
      phaseIndex = 4;
      const holdT = t - 17.8;
      const angle = holdT * 0.14 - 0.5;
      const r = 13.5 + Math.sin(holdT * 0.25) * 1.5;
      camPos.set(Math.sin(angle) * r, 8.2 + Math.sin(holdT * 0.2) * 1.2, Math.cos(angle) * r + 1.5);
      camLook.set(0, 12.0 + Math.sin(holdT * 0.18) * 1.5, -14.0);
    }

    camera.position.copy(camPos);
    camera.lookAt(camLook);

    if (state.phaseIndex !== phaseIndex) {
      state.phaseIndex = phaseIndex;
      Object.assign(state, PHASE_COPY[phaseIndex]);
    }
    return state;
  }

  function setPixelRatio(pr) {
    starMat.uniforms.uPixelRatio.value = Math.min(pr || 1, 2);
  }

  function dispose() {
    const geos = new Set();
    const mats = new Set();
    const texs = new Set();
    scene.traverse(obj => {
      if (obj.geometry) geos.add(obj.geometry);
      if (obj.material) {
        const list = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of list) {
          mats.add(m);
          if (m.map) texs.add(m.map);
        }
      }
    });
    geos.forEach(g => g.dispose());
    texs.forEach(tx => tx.dispose());
    mats.forEach(m => m.dispose());
  }

  return {
    scene,
    camera,
    state,
    update,
    setPixelRatio,
    dispose
  };
}
