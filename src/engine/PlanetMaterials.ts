/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

/**
 * Local texture paths for all celestial bodies and auxiliary maps.
 * These paths are served from the `/public/textures/` directory via Vite.
 */
export const TEXTURE_PATHS: Record<string, string> = {
  sun: '/textures/8k_sun.jpg',
  mercury: '/textures/8k_mercury.jpg',
  venus: '/textures/8k_venus_surface.jpg',
  earth: '/textures/8k_earth_daymap.jpg',
  moon: '/textures/8k_moon.jpg',
  mars: '/textures/8k_mars.jpg',
  jupiter: '/textures/8k_jupiter.jpg',
  saturn: '/textures/8k_saturn.jpg',
  uranus: '/textures/2k_uranus.jpg',
  neptune: '/textures/2k_neptune.jpg',
  earth_clouds: '/textures/8k_earth_clouds.jpg',
  earth_normal: '/textures/2k_earth_normal_map.jpg',
  earth_specular: '/textures/2k_earth_specular_map.jpg',
  saturn_ring_alpha: '/textures/8k_saturn_ring_alpha.png'
};

/** In-memory texture cache to avoid redundant network/disk loads. */
export const textureCache = new Map<string, THREE.Texture>();

/**
 * Create a fallback solid-color texture when a texture fails to load.
 * Uses an offscreen canvas so it works in both main thread and worker contexts.
 */
function createFallbackTexture(color: THREE.Color = new THREE.Color(0x888888)): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = `#${color.getHexString()}`;
  ctx.fillRect(0, 0, 64, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/**
 * Load a planet texture by its ID. Returns a cached texture if available,
 * otherwise initiates an asynchronous load via THREE.TextureLoader.
 *
 * @param id - Planet / map identifier (key of TEXTURE_PATHS)
 * @param onLoad - Optional callback fired when the texture finishes loading
 * @returns A THREE.Texture (either cached, a placeholder that updates in-place, or a fallback)
 */
export function loadPlanetTexture(id: string, onLoad?: () => void): THREE.Texture {
  // Return cached texture immediately
  const cached = textureCache.get(id);
  if (cached) {
    const img = cached.image as HTMLImageElement | undefined;
    if (img && img.complete !== false) {
      // Already fully loaded
      if (onLoad) {
        // Defer so caller always receives texture before callback fires
        setTimeout(onLoad, 0);
      }
    }
    return cached;
  }

  const path = TEXTURE_PATHS[id];
  if (!path) {
    console.warn(`[PlanetMaterials] Unknown texture id: "${id}". Returning gray fallback.`);
    const fallback = createFallbackTexture();
    textureCache.set(id, fallback);
    if (onLoad) setTimeout(onLoad, 0);
    return fallback;
  }

  // Create a fallback texture first so we never return undefined
  const fallbackColor = id === 'sun'
    ? new THREE.Color(0xffaa00)
    : id === 'earth'
      ? new THREE.Color(0x2266cc)
      : new THREE.Color(0x888888);
  const fallbackTex = createFallbackTexture(fallbackColor);
  textureCache.set(id, fallbackTex);

  const loader = new THREE.TextureLoader();
  loader.load(
    path,
    (loadedTex) => {
      loadedTex.colorSpace = THREE.SRGBColorSpace;

      // Cloud textures need RepeatWrapping on S for animation; others clamp
      if (id === 'earth_clouds') {
        loadedTex.wrapS = THREE.RepeatWrapping;
        loadedTex.wrapT = THREE.ClampToEdgeWrapping;
      } else {
        loadedTex.wrapS = THREE.ClampToEdgeWrapping;
        loadedTex.wrapT = THREE.ClampToEdgeWrapping;
      }

      // Copy loaded image data into the fallback texture's canvas so existing
      // materials referencing the fallback automatically pick up the real image.
      const img = loadedTex.image;
      const canvas = fallbackTex.image as HTMLCanvasElement;
      if (canvas && canvas.getContext) {
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          fallbackTex.wrapS = loadedTex.wrapS;
          fallbackTex.wrapT = loadedTex.wrapT;
          fallbackTex.colorSpace = loadedTex.colorSpace;
          fallbackTex.needsUpdate = true;
        }
      }

      if (onLoad) {
        onLoad();
      }
    },
    undefined,
    (err) => {
      console.warn(`[PlanetMaterials] Failed to load texture "${id}" from ${path}. Using fallback.`, err);
      if (onLoad) {
        onLoad();
      }
    }
  );

  return fallbackTex;
}

// ============================================================================
// Earth Atmosphere Shader
// ============================================================================

const ATMOSPHERE_VERTEX_SHADER = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ATMOSPHERE_FRAGMENT_SHADER = `
  uniform vec3 uSunDirection;
  uniform vec3 uAtmosphereColor;
  uniform float uIntensity;

  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    // View direction in view space
    vec3 viewDir = normalize(-vPosition);
    vec3 normal = normalize(vNormal);

    // Fresnel rim factor: strongest at grazing angles
    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);

    // Sun illumination dot product (world-space sun direction transformed
    // approximately into view-space via the normal matrix is not exact,
    // so we treat uSunDirection as already in view space or accept the
    // small error for a visual effect. For better accuracy the caller
    // should update uSunDirection each frame in world space and we rely
    // on the fact that normalMatrix * normal ~ view-space normal.)
    float sunDot = dot(normal, normalize(uSunDirection));

    // Day/night blend: clamp to 0..1
    float dayFactor = clamp(sunDot, 0.0, 1.0);

    // Rayleigh-like scattering: blue at horizon (high fresnel), white at
    // high view angles. We mix atmosphere color toward white based on
    // fresnel so the limb appears more saturated blue.
    vec3 scatterColor = mix(uAtmosphereColor, vec3(1.0, 1.0, 1.0), fresnel * 0.6);

    // Combine fresnel rim glow with day-side illumination
    float glow = fresnel * uIntensity * (0.3 + 0.7 * dayFactor);

    // Add a subtle horizon brightening term
    float horizon = pow(fresnel, 2.0) * 0.5 * dayFactor;

    vec3 finalColor = scatterColor * (glow + horizon);
    float alpha = glow + horizon * 0.5;

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

/**
 * Create a ShaderMaterial for Earth's atmospheric glow.
 *
 * The material is intended to be applied to a sphere slightly larger than
 * the planet surface sphere (e.g. radius * 1.06) with transparent rendering
 * and additive blending so it composites as a luminous shell.
 */
export function createEarthAtmosphereMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: ATMOSPHERE_VERTEX_SHADER,
    fragmentShader: ATMOSPHERE_FRAGMENT_SHADER,
    uniforms: {
      uSunDirection: { value: new THREE.Vector3(1.0, 0.0, 0.0) },
      uAtmosphereColor: { value: new THREE.Color(0.3, 0.6, 1.0) },
      uIntensity: { value: 1.5 }
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide
  });
}

// ============================================================================
// Earth Cloud Shader
// ============================================================================

const CLOUD_VERTEX_SHADER = `
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const CLOUD_FRAGMENT_SHADER = `
  uniform sampler2D uCloudMap;
  uniform float uTime;
  uniform vec3 uLightDirection;

  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    // Slow eastward drift
    vec2 uv = vec2(vUv.x + uTime * 0.0035, vUv.y);

    vec4 texColor = texture2D(uCloudMap, uv);
    float cloudDensity = texColor.r;

    // Diffuse lighting aligned with sun direction
    float diffuse = clamp(dot(vNormal, uLightDirection) * 1.1 + 0.1, 0.0, 1.0);

    // Fresnel rim glow for high-altitude Rayleigh scattering on clouds
    float fresnel = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 3.0);

    vec3 cloudColor = vec3(1.0, 1.0, 1.0);
    float alpha = cloudDensity * (diffuse * 0.88 + fresnel * 0.38);

    gl_FragColor = vec4(cloudColor, alpha);
  }
`;

/**
 * Create an animated cloud ShaderMaterial for Earth.
 *
 * @param cloudTexture - The cloud coverage texture (e.g. 8k_earth_clouds.jpg)
 * @returns A ShaderMaterial with time-driven UV drift and lighting
 */
export function createEarthCloudMaterial(cloudTexture: THREE.Texture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: CLOUD_VERTEX_SHADER,
    fragmentShader: CLOUD_FRAGMENT_SHADER,
    uniforms: {
      uCloudMap: { value: cloudTexture },
      uTime: { value: 0.0 },
      uLightDirection: { value: new THREE.Vector3(1.0, 0.0, 0.0) }
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending
  });
}

// ============================================================================
// Saturn Ring Shader
// ============================================================================

const RING_VERTEX_SHADER = `
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const RING_FRAGMENT_SHADER = `
  uniform sampler2D uRingMap;
  uniform vec3 uSunDirection;
  uniform float uOpacity;

  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    vec4 texColor = texture2D(uRingMap, vUv);

    // Use the alpha channel of the ring texture for transparency
    float alpha = texColor.a * uOpacity;

    // Simple Lambertian lighting from sun direction
    float sunDot = max(dot(normalize(vNormal), normalize(uSunDirection)), 0.0);
    float lighting = 0.3 + 0.7 * sunDot;

    vec3 color = texColor.rgb * lighting;

    gl_FragColor = vec4(color, alpha);
  }
`;

/**
 * Create a ShaderMaterial for Saturn's rings using an alpha-mapped texture.
 *
 * @param ringTexture - The ring texture (e.g. 8k_saturn_ring_alpha.png)
 * @returns A ShaderMaterial with alpha-based ring gaps and sun lighting
 */
export function createSaturnRingMaterial(ringTexture: THREE.Texture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: RING_VERTEX_SHADER,
    fragmentShader: RING_FRAGMENT_SHADER,
    uniforms: {
      uRingMap: { value: ringTexture },
      uSunDirection: { value: new THREE.Vector3(1.0, 0.0, 0.0) },
      uOpacity: { value: 0.9 }
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending
  });
}
