import * as THREE from 'three';

/**
 * SunEffects.ts
 * Enhanced solar rendering effects for the galaxy simulation.
 * Provides procedural canvas textures and a multi-layer sun group
 * that looks impressive both up-close (solar system view) and
 * from galactic scale (bright point with diffraction spikes).
 *
 * LOD Architecture (基于场景单位, 1 AU = 22 units):
 *   - 近距离  (< 66 units = 3 AU):  光球层 Shader + 色球层 + 双层日冕 + Glow
 *   - 中距离  (66 ~ 22000 units):  简化表面 + Glow + 日冕淡出
 *   - 远距离  (> 22000 units):      Flare Sprite 星点模式 (衍射尖刺)
 */

// ---------------------------------------------------------------------------
// Shader Sources
// ---------------------------------------------------------------------------

const SUN_SURFACE_VERTEX_SHADER = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const SUN_SURFACE_FRAGMENT_SHADER = `
  uniform sampler2D uSunMap;
  uniform float uTime;
  uniform float uLimbDarkening;
  uniform float uTurbulenceScale;
  uniform float uTurbulenceSpeed;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  // Hash / Value noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    // 1. 基础贴图采样
    vec4 texColor = texture2D(uSunMap, vUv);

    // 2. 临边昏暗 (Limb Darkening): μ = cos(θ) = dot(view, normal)
    float mu = max(dot(vNormal, vViewDir), 0.0);
    float limbFactor = pow(mu, uLimbDarkening);

    // 3. 表面湍流 (模拟米粒组织 granulation)
    vec2 turbUv = vUv * uTurbulenceScale + vec2(uTime * uTurbulenceSpeed, uTime * uTurbulenceSpeed * 0.3);
    float turbulence = fbm(turbUv) * 0.12;

    // 4. 色球层边缘增强：μ 极小时加入红色/橙色光晕
    vec3 chromosphereColor = vec3(1.0, 0.30, 0.04);
    float chromosphereMix = pow(1.0 - mu, 3.0) * 0.45;

    // 5. 合成
    vec3 baseColor = texColor.rgb * (0.92 + turbulence);
    baseColor = mix(baseColor * limbFactor, chromosphereColor, chromosphereMix);

    // 6. 中央超亮核心（保持色彩信息，避免死白）
    float coreGlow = exp(-4.0 * (1.0 - mu));
    baseColor += vec3(1.0, 0.92, 0.72) * coreGlow * 0.12;

    gl_FragColor = vec4(baseColor, 1.0);
  }
`;

const CHROMOSPHERE_VERTEX_SHADER = `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPosition.xyz);
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const CHROMOSPHERE_FRAGMENT_SHADER = `
  uniform float uIntensity;
  uniform float uTime;

  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 2.5);

    // 针状体 (spicules) 随机突起模拟
    vec2 uv = vWorldPos.xy * 3.5 + vec2(uTime * 0.08, uTime * 0.05);
    float spicule = hash(uv) * hash(uv * 1.7 + 13.0);
    spicule = pow(spicule, 5.0) * fresnel * 3.5;

    // 基础色球层颜色：橙红 → 亮黄过渡
    vec3 baseColor = vec3(1.0, 0.35, 0.06);
    vec3 brightColor = vec3(1.0, 0.7, 0.25);
    float brightness = fresnel * uIntensity + spicule;
    vec3 color = mix(baseColor, brightColor, fresnel * 0.6) * brightness;

    float alpha = fresnel * uIntensity * 0.85 + spicule * 0.5;

    gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
  }
`;

// ---------------------------------------------------------------------------
// Texture Generators
// ---------------------------------------------------------------------------

/**
 * Create a radial gradient texture resembling a stellar photosphere glow.
 * Core: bright white-yellow, mid: warm orange, outer: deep red fading to transparent.
 */
export function createSunGlowTexture(size = 256): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0.0, 'rgba(255, 250, 235, 0.92)');   // bright white-yellow core
  grad.addColorStop(0.12, 'rgba(255, 230, 170, 0.72)');  // warm yellow
  grad.addColorStop(0.35, 'rgba(255, 175, 70, 0.48)');   // warm orange
  grad.addColorStop(0.65, 'rgba(230, 70, 30, 0.18)');    // deep red
  grad.addColorStop(1.0, 'rgba(60, 5, 0, 0)');           // fade to transparent

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Create a procedural corona texture with radial rays / filaments.
 * Simulates solar corona plasma structures using overlapping radial streaks.
 */
export function createSunCoronaTexture(size = 512): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;

  // Clear transparent
  ctx.clearRect(0, 0, size, size);

  // Base soft radial glow
  const baseGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
  baseGrad.addColorStop(0.0, 'rgba(255, 240, 200, 0.35)');
  baseGrad.addColorStop(0.3, 'rgba(255, 180, 90, 0.18)');
  baseGrad.addColorStop(0.7, 'rgba(200, 60, 20, 0.06)');
  baseGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, size, size);

  // Procedural radial streaks (filaments)
  const streakCount = 48;
  for (let i = 0; i < streakCount; i++) {
    const angle = (i / streakCount) * Math.PI * 2 + Math.random() * 0.3;
    const len = (size * 0.35) + Math.random() * (size * 0.15);
    const widthBase = (size * 0.008) + Math.random() * (size * 0.012);

    const x1 = cx + Math.cos(angle) * (size * 0.08);
    const y1 = cy + Math.sin(angle) * (size * 0.08);
    const x2 = cx + Math.cos(angle) * len;
    const y2 = cy + Math.sin(angle) * len;

    const streakGrad = ctx.createLinearGradient(x1, y1, x2, y2);
    streakGrad.addColorStop(0.0, 'rgba(255, 220, 160, 0.25)');
    streakGrad.addColorStop(0.5, 'rgba(255, 140, 60, 0.12)');
    streakGrad.addColorStop(1.0, 'rgba(180, 40, 10, 0)');

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 + Math.cos(angle + Math.PI / 2) * widthBase, y2);
    ctx.lineTo(x2 - Math.cos(angle + Math.PI / 2) * widthBase, y2);
    ctx.closePath();
    ctx.fillStyle = streakGrad;
    ctx.fill();
  }

  // Wispy secondary rays (thinner, more transparent)
  const wispCount = 64;
  for (let i = 0; i < wispCount; i++) {
    const angle = (i / wispCount) * Math.PI * 2 + Math.random() * 0.5;
    const len = (size * 0.25) + Math.random() * (size * 0.25);
    const widthBase = (size * 0.003) + Math.random() * (size * 0.006);

    const x1 = cx + Math.cos(angle) * (size * 0.05);
    const y1 = cy + Math.sin(angle) * (size * 0.05);
    const x2 = cx + Math.cos(angle) * len;
    const y2 = cy + Math.sin(angle) * len;

    const wispGrad = ctx.createLinearGradient(x1, y1, x2, y2);
    wispGrad.addColorStop(0.0, 'rgba(255, 200, 120, 0.15)');
    wispGrad.addColorStop(1.0, 'rgba(150, 50, 20, 0)');

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 + Math.cos(angle + Math.PI / 2) * widthBase, y2);
    ctx.lineTo(x2 - Math.cos(angle + Math.PI / 2) * widthBase, y2);
    ctx.closePath();
    ctx.fillStyle = wispGrad;
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Create an intense central bloom texture with star-like diffraction spikes.
 * Designed for far-away viewing: very bright center, rapid falloff, 4+2 spikes.
 */
export function createSolarFlareTexture(size = 256): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;

  // Clear transparent
  ctx.clearRect(0, 0, size, size);

  // Central bloom
  const bloomGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
  bloomGrad.addColorStop(0.0, 'rgba(255, 250, 240, 0.95)');
  bloomGrad.addColorStop(0.08, 'rgba(255, 240, 200, 0.7)');
  bloomGrad.addColorStop(0.25, 'rgba(255, 200, 100, 0.35)');
  bloomGrad.addColorStop(0.55, 'rgba(255, 100, 40, 0.1)');
  bloomGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = bloomGrad;
  ctx.fillRect(0, 0, size, size);

  // Helper to draw a diffraction spike
  const drawSpike = (
    angle: number,
    length: number,
    thickness: number,
    brightness: number
  ) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    const spikeGrad = ctx.createLinearGradient(0, 0, 0, -length);
    spikeGrad.addColorStop(0.0, `rgba(255, 250, 230, ${brightness})`);
    spikeGrad.addColorStop(0.3, `rgba(255, 220, 160, ${brightness * 0.6})`);
    spikeGrad.addColorStop(0.7, `rgba(255, 160, 80, ${brightness * 0.2})`);
    spikeGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

    ctx.beginPath();
    ctx.moveTo(-thickness / 2, 0);
    ctx.lineTo(0, -length);
    ctx.lineTo(thickness / 2, 0);
    ctx.closePath();
    ctx.fillStyle = spikeGrad;
    ctx.fill();
    ctx.restore();
  };

  // 4 primary spikes (cross)
  const primaryLength = size * 0.48;
  const primaryThickness = size * 0.035;
  drawSpike(0, primaryLength, primaryThickness, 0.85);
  drawSpike(Math.PI / 2, primaryLength, primaryThickness, 0.85);
  drawSpike(Math.PI, primaryLength, primaryThickness, 0.85);
  drawSpike(-Math.PI / 2, primaryLength, primaryThickness, 0.85);

  // 2 diagonal secondary spikes (dimmer, shorter)
  const secondaryLength = size * 0.32;
  const secondaryThickness = size * 0.018;
  drawSpike(Math.PI / 4, secondaryLength, secondaryThickness, 0.45);
  drawSpike(-Math.PI / 4, secondaryLength, secondaryThickness, 0.45);
  drawSpike((3 * Math.PI) / 4, secondaryLength, secondaryThickness, 0.45);
  drawSpike(-(3 * Math.PI) / 4, secondaryLength, secondaryThickness, 0.45);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// ---------------------------------------------------------------------------
// Sun Group Builder
// ---------------------------------------------------------------------------

export interface SunGroup extends THREE.Group {
  userData: {
    sunInnerMesh?: THREE.Mesh;
    sunSurfaceMaterial?: THREE.ShaderMaterial;
    sunBasicMaterial?: THREE.MeshBasicMaterial;
    chromosphereMesh?: THREE.Mesh;
    chromosphereMaterial?: THREE.ShaderMaterial;
    coronaInnerMesh?: THREE.Mesh;
    coronaOuterMesh?: THREE.Mesh;
    coronaRimMesh?: THREE.Mesh;
    glowSprite?: THREE.Sprite;
    flareSprite?: THREE.Sprite;
    /** Accumulated time for animation */
    elapsedTime?: number;
    /** Initial Y-rotation offsets for corona layers */
    coronaRotationOffset?: number;
    /** Current LOD distance threshold state */
    lodState?: 'close' | 'mid' | 'far';
  };
}

/**
 * Build a multi-layer sun group with:
 *   - Inner sphere (ShaderMaterial for close-up, MeshBasicMaterial for mid)
 *   - Chromosphere shell (close-up only)
 *   - Inner + Outer corona shells
 *   - Glow sprite (camera-facing photosphere glow)
 *   - Flare sprite (diffraction spikes for far-away viewing)
 *
 * @param radius  Base radius of the sun sphere.
 * @param sunTexture  Optional texture for the inner sun sphere. If omitted, a solid color is used.
 */
export function buildSunGroup(
  radius: number,
  sunTexture?: THREE.Texture
): SunGroup {
  const sunGroup = new THREE.Group() as SunGroup;
  sunGroup.userData = {
    elapsedTime: 0,
    coronaRotationOffset: Math.random() * Math.PI * 2,
    lodState: 'close',
  };

  // --- a. 太阳内球体：近距离 ShaderMaterial + 备用 BasicMaterial ---
  const sunGeo = new THREE.SphereGeometry(radius, 80, 40);

  // 近距离表面 Shader
  const sunSurfaceMat = new THREE.ShaderMaterial({
    vertexShader: SUN_SURFACE_VERTEX_SHADER,
    fragmentShader: SUN_SURFACE_FRAGMENT_SHADER,
    uniforms: {
      uSunMap: { value: sunTexture ?? null },
      uTime: { value: 0.0 },
      uLimbDarkening: { value: 0.6 },
      uTurbulenceScale: { value: 8.0 },
      uTurbulenceSpeed: { value: 0.005 },
    },
  });

  // 中距离备用 BasicMaterial
  const sunBasicMat = new THREE.MeshBasicMaterial({
    map: sunTexture ?? undefined,
    color: sunTexture ? 0xffffff : 0xffdd88,
  });

  const sunInnerMesh = new THREE.Mesh(sunGeo, sunSurfaceMat);
  sunInnerMesh.name = 'sun-inner-mesh';
  sunGroup.add(sunInnerMesh);

  sunGroup.userData.sunInnerMesh = sunInnerMesh;
  sunGroup.userData.sunSurfaceMaterial = sunSurfaceMat;
  sunGroup.userData.sunBasicMaterial = sunBasicMat;

  // --- b. 色球层 (Chromosphere) — 红色薄壳，仅近距离可见 ---
  const chromoGeo = new THREE.SphereGeometry(radius * 1.008, 64, 32);
  const chromoMat = new THREE.ShaderMaterial({
    vertexShader: CHROMOSPHERE_VERTEX_SHADER,
    fragmentShader: CHROMOSPHERE_FRAGMENT_SHADER,
    uniforms: {
      uIntensity: { value: 0.85 },
      uTime: { value: 0.0 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
  });
  const chromoMesh = new THREE.Mesh(chromoGeo, chromoMat);
  chromoMesh.name = 'sun-chromosphere';
  sunGroup.add(chromoMesh);
  sunGroup.userData.chromosphereMesh = chromoMesh;
  sunGroup.userData.chromosphereMaterial = chromoMat;

  // --- c. 内日冕 (Inner Corona) — 使用 procedural 径向射线纹理 ---
  const coronaTex = createSunCoronaTexture(512);
  const innerCoronaGeo = new THREE.SphereGeometry(radius * 1.15, 48, 24);
  const innerCoronaMat = new THREE.MeshBasicMaterial({
    map: coronaTex,
    color: 0xffaa66,
    transparent: true,
    opacity: 0.32,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.BackSide,
  });
  const innerCoronaMesh = new THREE.Mesh(innerCoronaGeo, innerCoronaMat);
  innerCoronaMesh.name = 'sun-corona-inner';
  sunGroup.add(innerCoronaMesh);
  sunGroup.userData.coronaInnerMesh = innerCoronaMesh;

  // --- d. 外日冕 (Outer Corona) — 更稀疏的等离子体 ---
  const outerCoronaGeo = new THREE.SphereGeometry(radius * 1.45, 48, 24);
  const outerCoronaMat = new THREE.MeshBasicMaterial({
    map: coronaTex,
    color: 0xff8866,
    transparent: true,
    opacity: 0.15,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.BackSide,
  });
  const outerCoronaMesh = new THREE.Mesh(outerCoronaGeo, outerCoronaMat);
  outerCoronaMesh.name = 'sun-corona-outer';
  sunGroup.add(outerCoronaMesh);
  sunGroup.userData.coronaOuterMesh = outerCoronaMesh;

  // --- e. Glow sprite (always faces camera, soft photosphere glow) ---
  const glowMat = new THREE.SpriteMaterial({
    map: createSunGlowTexture(),
    color: 0xffffff,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glowSprite = new THREE.Sprite(glowMat);
  glowSprite.name = 'sun-glow-sprite';
  glowSprite.scale.set(radius * 4.2, radius * 4.2, 1);
  sunGroup.add(glowSprite);
  sunGroup.userData.glowSprite = glowSprite;

  // --- f. Far-distance flare sprite (diffraction spikes for stellar point) ---
  const flareMat = new THREE.SpriteMaterial({
    map: createSolarFlareTexture(),
    color: 0xfff8e7,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 1.0,
  });
  const flareSprite = new THREE.Sprite(flareMat);
  flareSprite.name = 'sun-flare-sprite';
  flareSprite.scale.set(radius * 8, radius * 8, 1);
  sunGroup.add(flareSprite);
  sunGroup.userData.flareSprite = flareSprite;

  return sunGroup;
}

// ---------------------------------------------------------------------------
// Update / Animation (Three-Tier LOD)
// ---------------------------------------------------------------------------

/** Distance thresholds in scene units (1 AU = 22 units) */
const LOD_CLOSE = 66;    // 3 AU
const LOD_MID = 22000;   // 1000 AU

/**
 * Animate the sun group and adjust visibility/opacity based on camera distance.
 *
 * @param sunGroup        The group returned by buildSunGroup.
 * @param deltaTime       Time since last frame (seconds).
 * @param cameraDistance  Distance from camera to the sun group world position.
 */
export function updateSunEffects(
  sunGroup: SunGroup,
  deltaTime: number,
  cameraDistance: number
): void {
  const data = sunGroup.userData;
  data.elapsedTime = (data.elapsedTime ?? 0) + deltaTime;
  const t = data.elapsedTime;

  // Determine LOD tier
  let lod: 'close' | 'mid' | 'far';
  if (cameraDistance < LOD_CLOSE) {
    lod = 'close';
  } else if (cameraDistance < LOD_MID) {
    lod = 'mid';
  } else {
    lod = 'far';
  }
  data.lodState = lod;

  // --- 1. Surface material swap (close = Shader, mid = Basic) ---
  const sunInnerMesh = data.sunInnerMesh;
  const sunSurfaceMat = data.sunSurfaceMaterial;
  const sunBasicMat = data.sunBasicMaterial;

  if (sunInnerMesh) {
    if (lod === 'close') {
      if (sunSurfaceMat && sunInnerMesh.material !== sunSurfaceMat) {
        sunInnerMesh.material = sunSurfaceMat;
      }
      if (sunSurfaceMat) {
        sunSurfaceMat.uniforms.uTime.value = t;
      }
      sunInnerMesh.visible = true;
    } else if (lod === 'mid') {
      if (sunBasicMat && sunInnerMesh.material !== sunBasicMat) {
        sunInnerMesh.material = sunBasicMat;
      }
      sunInnerMesh.visible = true;
    } else {
      // far: mesh hidden, flare takes over
      sunInnerMesh.visible = false;
    }
  }

  // --- 2. Chromosphere (close only) ---
  const chromoMesh = data.chromosphereMesh;
  const chromoMat = data.chromosphereMaterial;
  if (chromoMesh && chromoMat) {
    if (lod === 'close') {
      chromoMat.uniforms.uTime.value = t;
      const targetInt = 0.85;
      chromoMat.uniforms.uIntensity.value = THREE.MathUtils.lerp(
        chromoMat.uniforms.uIntensity.value,
        targetInt,
        0.1
      );
      chromoMesh.visible = chromoMat.uniforms.uIntensity.value > 0.03;
    } else {
      chromoMat.uniforms.uIntensity.value = THREE.MathUtils.lerp(
        chromoMat.uniforms.uIntensity.value,
        0.0,
        0.12
      );
      chromoMesh.visible = chromoMat.uniforms.uIntensity.value > 0.03;
    }
  }

  // --- 3. Corona rotation (all tiers where visible) ---
  const coronaInner = data.coronaInnerMesh;
  const coronaOuter = data.coronaOuterMesh;

  if (coronaInner) {
    coronaInner.rotation.y = t * 0.02 + (data.coronaRotationOffset ?? 0);
  }
  if (coronaOuter) {
    coronaOuter.rotation.y = t * -0.015 + (data.coronaRotationOffset ?? 0) * 0.7;
  }

  // --- 4. Corona opacity fade with distance (close→mid transition) ---
  if (coronaInner && coronaInner.material instanceof THREE.MeshBasicMaterial) {
    if (lod === 'close') {
      coronaInner.material.opacity = THREE.MathUtils.lerp(coronaInner.material.opacity, 0.32, 0.08);
      coronaInner.visible = true;
    } else if (lod === 'mid') {
      const fade = Math.max(0.0, 1.0 - (cameraDistance - LOD_CLOSE) / 300);
      coronaInner.material.opacity = 0.32 * fade;
      coronaInner.visible = fade > 0.02;
    } else {
      coronaInner.visible = false;
    }
  }

  if (coronaOuter && coronaOuter.material instanceof THREE.MeshBasicMaterial) {
    if (lod === 'close') {
      coronaOuter.material.opacity = THREE.MathUtils.lerp(coronaOuter.material.opacity, 0.15, 0.08);
      coronaOuter.visible = true;
    } else if (lod === 'mid') {
      const fade = Math.max(0.0, 1.0 - (cameraDistance - LOD_CLOSE) / 400);
      coronaOuter.material.opacity = 0.15 * fade;
      coronaOuter.visible = fade > 0.02;
    } else {
      coronaOuter.visible = false;
    }
  }

  // --- 5. Glow sprite (close weakens to avoid blow-out, mid dominant, far hidden) ---
  const glowSprite = data.glowSprite;
  if (glowSprite && glowSprite.material instanceof THREE.SpriteMaterial) {
    let targetOpacity: number;
    if (lod === 'close') {
      targetOpacity = 0.4; // weakened to prevent blow-out when near
    } else if (lod === 'mid') {
      targetOpacity = 0.88;
    } else {
      targetOpacity = 0.0;
    }

    const pulse = Math.sin(t * 1.5) * 0.06 + Math.sin(t * 3.7) * 0.03;
    const finalOpacity = Math.max(0.15, Math.min(1.0, targetOpacity + pulse));

    glowSprite.material.opacity = THREE.MathUtils.lerp(glowSprite.material.opacity, finalOpacity, 0.1);
    glowSprite.visible = glowSprite.material.opacity > 0.02 && lod !== 'far';
  }

  // --- 6. Flare sprite (far mode star-point with diffraction spikes) ---
  const flareSprite = data.flareSprite;
  if (flareSprite && flareSprite.material instanceof THREE.SpriteMaterial) {
    if (lod === 'far') {
      // Inverse-square brightness falloff from 10 AU baseline
      const distAU = Math.max(cameraDistance / 22.0, 1.0);
      const brightnessRatio = Math.pow(10.0 / distAU, 2);
      const targetOpacity = Math.min(1.0, brightnessRatio * 1.5);

      flareSprite.material.opacity = THREE.MathUtils.lerp(flareSprite.material.opacity, targetOpacity, 0.08);
      flareSprite.visible = flareSprite.material.opacity > 0.02;

      // Stellar color temperature: G2V ~ 5778K → warm yellow-white
      const tempColor = new THREE.Color().setHSL(0.1, 0.35, Math.min(0.95, 0.6 + brightnessRatio * 0.3));
      flareSprite.material.color.lerp(tempColor, 0.05);
    } else {
      flareSprite.material.opacity = THREE.MathUtils.lerp(flareSprite.material.opacity, 0.0, 0.15);
      flareSprite.visible = flareSprite.material.opacity > 0.02;
    }
  }

}

// ---------------------------------------------------------------------------
// Screen Projection Helper
// ---------------------------------------------------------------------------

/**
 * Project the sun's world position to 2D screen coordinates.
 *
 * @returns  Screen position in CSS pixels, visibility flag, apparent scale, and opacity hint;
 *           or null if the sun is behind the camera.
 */
export function getSunScreenPosition(
  sunGroup: THREE.Group,
  camera: THREE.Camera,
  renderer: THREE.WebGLRenderer
): { x: number; y: number; visible: boolean; scale: number; opacity: number } | null {
  const sunPos = new THREE.Vector3();
  sunGroup.getWorldPosition(sunPos);

  // Check if behind camera
  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);
  const toSun = new THREE.Vector3().subVectors(sunPos, camera.position);
  if (toSun.dot(camDir) < 0) {
    return null;
  }

  const projected = sunPos.clone().project(camera);

  const width = renderer.domElement.clientWidth;
  const height = renderer.domElement.clientHeight;

  const x = (projected.x * 0.5 + 0.5) * width;
  const y = (-projected.y * 0.5 + 0.5) * height;

  // On-screen visibility
  const onScreen = projected.z >= -1 && projected.z <= 1 && x >= 0 && x <= width && y >= 0 && y <= height;

  // Apparent scale: angular diameter proxy
  const distance = camera.position.distanceTo(sunPos);
  const sunRadius = (sunGroup as SunGroup).userData?.sunInnerMesh
    ? ((sunGroup as SunGroup).userData.sunInnerMesh!.geometry as THREE.SphereGeometry).parameters.radius
    : 1.0;
  // Approximate angular size in pixels (very rough)
  const fov = (camera as THREE.PerspectiveCamera).fov ?? 50;
  const scale = (sunRadius / (distance * Math.tan((fov * Math.PI) / 360))) * Math.max(width, height);

  // Opacity hint: fade when extremely close (avoids blow-out) or very far
  let opacity = 1.0;
  if (distance < 5) {
    opacity = Math.max(0.2, distance / 5);
  } else if (distance > 1500) {
    opacity = Math.max(0.3, 1.0 - (distance - 1500) / 500);
  }

  return { x, y, visible: onScreen, scale, opacity };
}
