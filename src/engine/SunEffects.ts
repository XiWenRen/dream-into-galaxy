import * as THREE from 'three';

/**
 * SunEffects.ts
 * Enhanced solar rendering effects for the galaxy simulation.
 * Provides procedural canvas textures and a multi-layer sun group
 * that looks impressive both up-close (solar system view) and
 * from galactic scale (bright point with diffraction spikes).
 */

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
  grad.addColorStop(0.0, 'rgba(255, 250, 220, 0.9)');   // bright white-yellow core
  grad.addColorStop(0.15, 'rgba(255, 230, 160, 0.75)'); // warm yellow
  grad.addColorStop(0.35, 'rgba(255, 180, 80, 0.5)');   // warm orange
  grad.addColorStop(0.65, 'rgba(220, 80, 40, 0.2)');    // deep red
  grad.addColorStop(1.0, 'rgba(80, 10, 0, 0)');         // fade to transparent

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
    coronaInnerMesh?: THREE.Mesh;
    coronaOuterMesh?: THREE.Mesh;
    coronaRimMesh?: THREE.Mesh;
    glowSprite?: THREE.Sprite;
    flareSprite?: THREE.Sprite;
    /** Accumulated time for animation */
    elapsedTime?: number;
    /** Initial Y-rotation offsets for corona layers */
    coronaRotationOffset?: number;
  };
}

/**
 * Build a multi-layer sun group with inner sphere, multiple corona shells,
 * a glow sprite, and a flare sprite for distant viewing.
 *
 * @param radius  Base radius of the sun sphere.
 * @param sunTexture  Optional texture for the inner sun sphere. If omitted, a solid color is used.
 */
export function buildSunGroup(
  radius: number,
  sunTexture?: THREE.Texture
): SunGroup {
  const sunGroup = new THREE.Group() as SunGroup;
  sunGroup.userData = { elapsedTime: 0, coronaRotationOffset: Math.random() * Math.PI * 2 };

  // a. Inner sun sphere
  const sunGeo = new THREE.SphereGeometry(radius, 64, 32);
  const sunMat = new THREE.MeshBasicMaterial({
    map: sunTexture ?? undefined,
    color: sunTexture ? 0xffffff : 0xffdd88,
  });
  const sunInnerMesh = new THREE.Mesh(sunGeo, sunMat);
  sunInnerMesh.name = 'sun-inner-mesh';
  sunGroup.add(sunInnerMesh);
  sunGroup.userData.sunInnerMesh = sunInnerMesh;

  // b. Corona inner mesh (bright gold)
  const coronaInnerGeo = new THREE.SphereGeometry(radius * 1.08, 32, 16);
  const coronaInnerMat = new THREE.MeshBasicMaterial({
    color: 0xffe066,
    transparent: true,
    opacity: 0.5,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const coronaInnerMesh = new THREE.Mesh(coronaInnerGeo, coronaInnerMat);
  coronaInnerMesh.name = 'sun-corona-inner';
  sunGroup.add(coronaInnerMesh);
  sunGroup.userData.coronaInnerMesh = coronaInnerMesh;

  // c. Corona outer mesh (orange)
  const coronaOuterGeo = new THREE.SphereGeometry(radius * 1.3, 32, 16);
  const coronaOuterMat = new THREE.MeshBasicMaterial({
    color: 0xff6600,
    transparent: true,
    opacity: 0.25,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const coronaOuterMesh = new THREE.Mesh(coronaOuterGeo, coronaOuterMat);
  coronaOuterMesh.name = 'sun-corona-outer';
  sunGroup.add(coronaOuterMesh);
  sunGroup.userData.coronaOuterMesh = coronaOuterMesh;

  // d. Corona rim mesh (wispy procedural corona texture)
  const coronaRimGeo = new THREE.SphereGeometry(radius * 1.6, 32, 16);
  const coronaRimMat = new THREE.MeshBasicMaterial({
    map: createSunCoronaTexture(),
    color: 0xffffff,
    transparent: true,
    opacity: 0.18,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const coronaRimMesh = new THREE.Mesh(coronaRimGeo, coronaRimMat);
  coronaRimMesh.name = 'sun-corona-rim';
  sunGroup.add(coronaRimMesh);
  sunGroup.userData.coronaRimMesh = coronaRimMesh;

  // e. Glow sprite (always faces camera, soft photosphere glow)
  const glowMat = new THREE.SpriteMaterial({
    map: createSunGlowTexture(),
    color: 0xffffff,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glowSprite = new THREE.Sprite(glowMat);
  glowSprite.name = 'sun-glow-sprite';
  glowSprite.scale.set(radius * 4, radius * 4, 1);
  sunGroup.add(glowSprite);
  sunGroup.userData.glowSprite = glowSprite;

  // f. Flare sprite (for very far away viewing)
  const flareMat = new THREE.SpriteMaterial({
    map: createSolarFlareTexture(),
    color: 0xffffff,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 1.0,
  });
  const flareSprite = new THREE.Sprite(flareMat);
  flareSprite.name = 'sun-flare-sprite';
  flareSprite.scale.set(radius * 6, radius * 6, 1);
  sunGroup.add(flareSprite);
  sunGroup.userData.flareSprite = flareSprite;

  return sunGroup;
}

// ---------------------------------------------------------------------------
// Update / Animation
// ---------------------------------------------------------------------------

/**
 * Animate the sun group and adjust visibility/opacity based on camera distance.
 *
 * @param sunGroup      The group returned by buildSunGroup.
 * @param deltaTime     Time since last frame (seconds).
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

  // Slow corona rotation for dynamic plasma feel
  const coronaInner = data.coronaInnerMesh;
  const coronaOuter = data.coronaOuterMesh;
  const coronaRim = data.coronaRimMesh;

  if (coronaInner) {
    coronaInner.rotation.y = t * 0.02 + (data.coronaRotationOffset ?? 0);
  }
  if (coronaOuter) {
    coronaOuter.rotation.y = t * -0.015 + (data.coronaRotationOffset ?? 0) * 0.7;
  }
  if (coronaRim) {
    coronaRim.rotation.y = t * 0.008 + (data.coronaRotationOffset ?? 0) * 1.3;
  }

  // Subtle stellar variability pulse on glow opacity
  const glowSprite = data.glowSprite;
  if (glowSprite && glowSprite.material instanceof THREE.SpriteMaterial) {
    const baseOpacity = 0.85;
    const pulse = Math.sin(t * 1.5) * 0.08 + Math.sin(t * 3.7) * 0.04;
    glowSprite.material.opacity = Math.max(0.4, Math.min(1.0, baseOpacity + pulse));
  }

  // LOD: adjust visibility of corona details vs flare based on camera distance
  const flareSprite = data.flareSprite;
  const isFar = cameraDistance > 500;

  if (flareSprite && flareSprite.material instanceof THREE.SpriteMaterial) {
    // Smooth transition between near and far
    const farFactor = Math.min(1.0, Math.max(0.0, (cameraDistance - 300) / 400));
    flareSprite.material.opacity = farFactor;
    flareSprite.visible = farFactor > 0.02;
  }

  if (coronaRim && coronaRim.material instanceof THREE.MeshBasicMaterial) {
    const rimFade = Math.max(0.0, 1.0 - (cameraDistance - 200) / 600);
    coronaRim.material.opacity = 0.18 * rimFade;
    coronaRim.visible = rimFade > 0.02;
  }

  if (coronaOuter && coronaOuter.material instanceof THREE.MeshBasicMaterial) {
    const outerFade = Math.max(0.0, 1.0 - (cameraDistance - 100) / 500);
    coronaOuter.material.opacity = 0.25 * outerFade;
  }

  if (coronaInner && coronaInner.material instanceof THREE.MeshBasicMaterial) {
    const innerFade = Math.max(0.0, 1.0 - (cameraDistance - 50) / 400);
    coronaInner.material.opacity = 0.5 * innerFade;
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
