/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * StellarField3D — True 3D galactic star field.
 *
 * Renders Hipparcos stars at their real 3D galactic coordinates.
 * Sun is at origin. Scale: 1 light-year = 2 scene units.
 *
 * Uses equatorial → galactic Cartesian conversion from GalaxyStarfield.
 */

import * as THREE from 'three';
import { HipparcosStar, bvToRgb } from './HipparcosLoader';

/** Scale: 1 ly = N scene units. Chosen so nearby stars fit in camera far plane. */
export const LY_PER_SCENE_UNIT = 2.0;

/** Max distance to render (ly). With scale 2 and far plane 2500, max ~1250 ly. */
export const MAX_RENDER_DISTANCE_LY = 1200;

/**
 * Convert equatorial (RA hours, Dec deg, dist ly) to galactic Cartesian
 * relative to the Sun.
 *
 * Output: x toward galactic center, y toward galactic north, z toward l=90.
 */
export function equatorialToGalacticCartesian(
  raHours: number,
  decDeg: number,
  distLy: number
): { x: number; y: number; z: number } {
  const raRad = (raHours * 15.0 * Math.PI) / 180.0;
  const decRad = (decDeg * Math.PI) / 180.0;

  const cosDec = Math.cos(decRad);
  const sinDec = Math.sin(decRad);
  const cosRa = Math.cos(raRad);
  const sinRa = Math.sin(raRad);

  const uEqX = cosDec * cosRa;
  const uEqY = cosDec * sinRa;
  const uEqZ = sinDec;

  // J2000 equatorial → galactic rotation matrix (IAU 1958)
  const uGalX =
    -0.0548755609 * uEqX - 0.8734370905 * uEqY - 0.4838350156 * uEqZ;
  const uGalY =
    -0.4941094278 * uEqX + 0.4448296297 * uEqY - 0.7469822444 * uEqZ;
  const uGalZ =
    0.8676661490 * uEqX + 0.1980763734 * uEqY - 0.4559837761 * uEqZ;

  return {
    x: uGalX * distLy,
    y: uGalY * distLy,
    z: uGalZ * distLy,
  };
}

/**
 * Convert galactic Cartesian to the Three.js scene coordinate system.
 * Aligns galactic plane with XZ, Sun at origin.
 */
export function galacticToScene(
  galX: number,
  galY: number,
  galZ: number
): { x: number; y: number; z: number } {
  // Galactic X → +Z (forward/depth)
  // Galactic Y → +Y (up)
  // Galactic Z → +X (right)
  return {
    x: galZ * LY_PER_SCENE_UNIT,
    y: galY * LY_PER_SCENE_UNIT,
    z: galX * LY_PER_SCENE_UNIT,
  };
}

export interface StellarFieldData {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  count: number;
}

/**
 * Build 3D stellar field geometry from Hipparcos catalog.
 * Filters out stars beyond MAX_RENDER_DISTANCE_LY.
 */
export function buildStellarField3D(stars: HipparcosStar[]): StellarFieldData {
  // Pre-filter to valid stars with distance
  const validStars = stars.filter(
    s => s.dist > 0 && s.dist <= MAX_RENDER_DISTANCE_LY
  );
  const count = validStars.length;

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const star = validStars[i];
    const gal = equatorialToGalacticCartesian(star.ra, star.dec, star.dist);
    const pos = galacticToScene(gal.x, gal.y, gal.z);

    positions[i * 3] = pos.x;
    positions[i * 3 + 1] = pos.y;
    positions[i * 3 + 2] = pos.z;

    const col = bvToRgb(star.bv);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;

    // Size: based on apparent magnitude only (stars are point sources)
    const magT = Math.max(-1.5, Math.min(star.mag, 6.5));
    const magSize = 3.0 - (magT + 1.5) * (2.0 / 8.0);
    sizes[i] = magSize;
  }

  return { positions, colors, sizes, count };
}

/**
 * Create a THREE.Points object with the 3D stellar field.
 */
export function createStellarFieldPoints(data: StellarFieldData): THREE.Points {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(data.colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(data.sizes, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uOpacity: { value: 1.0 },
    },
    vertexShader: /* glsl */ `
      attribute float size;
      varying vec3 vColor;
      uniform float uPixelRatio;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * uPixelRatio * (400.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      uniform float uOpacity;
      void main() {
        float d = distance(gl_PointCoord, vec2(0.5));
        if (d > 0.5) discard;
        float strength = 1.0 - d * 2.0;
        strength = pow(strength, 2.5);
        gl_FragColor = vec4(vColor, strength * uOpacity);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexColors: true,
  });

  const points = new THREE.Points(geometry, material);
  points.name = 'stellar-field-3d';
  return points;
}

/**
 * Convenience: build + create in one call.
 */
export function createStellarFieldFromCatalog(stars: HipparcosStar[]): THREE.Points {
  const data = buildStellarField3D(stars);
  return createStellarFieldPoints(data);
}
