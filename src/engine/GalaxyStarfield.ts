/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { BRIGHT_STARS, DetailedStar } from './StarDatabase';

// ---------------------------------------------------------------------------
// Constants & Configuration
// ---------------------------------------------------------------------------

/** 1 scene unit = 100 light years */
export const LY_PER_UNIT = 100;

/** Solar System position relative to galactic center (light years) */
export const SUN_POSITION_LY: THREE.Vector3 = new THREE.Vector3(26000, 0, 0);

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface GalaxyStar {
  x: number;      // scene units (X right)
  y: number;      // scene units (Y up)
  z: number;      // scene units (Z forward/depth)
  r: number;      // color R (0-1)
  g: number;      // color G (0-1)
  b: number;      // color B (0-1)
  size: number;   // point size multiplier
  type: 'real';
  distLy: number; // distance from Sun in ly
  mag: number;    // apparent magnitude
  nameKey?: string;
}

export interface GalaxyGeometryData {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  types: Uint8Array; // for debugging / filtering if needed
  starCount: number;
}

// ---------------------------------------------------------------------------
// Color Utilities
// ---------------------------------------------------------------------------

function hexToRgb(hex: number): { r: number; g: number; b: number } {
  return {
    r: ((hex >> 16) & 255) / 255,
    g: ((hex >> 8) & 255) / 255,
    b: (hex & 255) / 255,
  };
}

// ---------------------------------------------------------------------------
// Coordinate Conversion: Equatorial (RA, Dec, dist) -> Galactic Cartesian
// ---------------------------------------------------------------------------

/**
 * Convert equatorial coordinates to galactic Cartesian coordinates.
 * Returns position in light years relative to the Sun.
 *
 * Uses the J2000 equatorial-to-galactic rotation matrix.
 * Galactic center is at (l=0, b=0), North Galactic Pole at (l=0, b=90).
 *
 * Output coordinate system:
 *   X: toward galactic center (l=0, b=0)
 *   Y: toward galactic north (b=90)
 *   Z: toward galactic rotation direction (l=90, b=0)
 */
export function equatorialToGalacticCartesian(
  raHours: number,
  decDeg: number,
  distLy: number
): { x: number; y: number; z: number } {
  const raRad = (raHours * 15.0 * Math.PI) / 180.0; // hours -> degrees -> radians
  const decRad = (decDeg * Math.PI) / 180.0;

  const cosDec = Math.cos(decRad);
  const sinDec = Math.sin(decRad);
  const cosRa = Math.cos(raRad);
  const sinRa = Math.sin(raRad);

  // Unit vector in equatorial coordinates
  const uEqX = cosDec * cosRa;
  const uEqY = cosDec * sinRa;
  const uEqZ = sinDec;

  // J2000 equatorial -> galactic rotation matrix (IAU 1958 definition)
  // This transforms from equatorial unit vector to galactic unit vector
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
 * Convert galactic Cartesian (x toward GC, y north, z rotation direction)
 * to the scene coordinate system where:
 *   - Sun is at the origin of the starfield group
 *   - +X is right
 *   - +Y is up
 *   - +Z is forward/depth
 *
 * We align galactic plane roughly with XZ plane, with galactic center
 * along the -Z axis (so looking from Sun toward GC is looking down -Z).
 */
export function galacticToScene(
  galX: number,
  galY: number,
  galZ: number
): { x: number; y: number; z: number } {
  // Galactic X points toward GC -> we map this to -Z (forward into screen)
  // Galactic Y points north -> we map this to +Y (up)
  // Galactic Z points toward l=90 -> we map this to +X (right)
  return {
    x: galZ / LY_PER_UNIT,
    y: galY / LY_PER_UNIT,
    z: -galX / LY_PER_UNIT,
  };
}

// ---------------------------------------------------------------------------
// Star Generation
// ---------------------------------------------------------------------------

/**
 * Generate a realistic Milky Way starfield.
 *
 * ONLY real stars from StarDatabase are used. No procedural / random stars.
 *
 * @param _count Ignored — kept for API compatibility
 * @param _seed  Ignored — kept for API compatibility
 */
export function generateGalaxyStars(_count = 0, _seed = 0x9e3779b9): GalaxyStar[] {
  const stars: GalaxyStar[] = [];

  // ---- Real Bright Stars from StarDatabase ----
  for (const star of BRIGHT_STARS) {
    const gal = equatorialToGalacticCartesian(star.ra, star.dec, star.dist);
    const pos = galacticToScene(gal.x, gal.y, gal.z);
    const col = hexToRgb(star.color);

    // Brighter (lower mag) = larger size
    const magClamped = Math.max(-1.5, Math.min(star.mag, 6.0));
    const size = 1.2 + (3.0 - magClamped) * 0.4;

    stars.push({
      ...pos,
      ...col,
      size,
      type: 'real',
      distLy: star.dist,
      mag: star.mag,
      nameKey: star.nameKey,
    });
  }

  return stars;
}

// ---------------------------------------------------------------------------
// Geometry Builder
// ---------------------------------------------------------------------------

/**
 * Build THREE.BufferGeometry-ready data from generated galaxy stars.
 *
 * @param stars Array of GalaxyStar (from generateGalaxyStars)
 * @returns GalaxyGeometryData with Float32Arrays for positions, colors, sizes
 */
export function buildGalaxyGeometry(stars: GalaxyStar[]): GalaxyGeometryData {
  const count = stars.length;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const types = new Uint8Array(count);

  const typeMap: Record<string, number> = {
    real: 0,
  };

  for (let i = 0; i < count; i++) {
    const s = stars[i];
    positions[i * 3] = s.x;
    positions[i * 3 + 1] = s.y;
    positions[i * 3 + 2] = s.z;

    colors[i * 3] = s.r;
    colors[i * 3 + 1] = s.g;
    colors[i * 3 + 2] = s.b;

    sizes[i] = s.size;
    types[i] = typeMap[s.type] ?? 2;
  }

  return {
    positions,
    colors,
    sizes,
    types,
    starCount: count,
  };
}

/**
 * Convenience function: generate stars and return geometry data in one call.
 *
 * @param proceduralCount Number of procedural stars to generate
 * @param seed Random seed
 * @returns GalaxyGeometryData ready for THREE.BufferGeometry
 */
export function getGalaxyGeometry(proceduralCount = 20000, seed = 0x9e3779b9): GalaxyGeometryData {
  const stars = generateGalaxyStars(proceduralCount, seed);
  return buildGalaxyGeometry(stars);
}

/**
 * Create a ready-to-use THREE.BufferGeometry from galaxy data.
 *
 * @param data GalaxyGeometryData from buildGalaxyGeometry or getGalaxyGeometry
 * @returns THREE.BufferGeometry with position, color, and size attributes
 */
export function createGalaxyBufferGeometry(data: GalaxyGeometryData): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(data.colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(data.sizes, 1));
  return geometry;
}

/**
 * Create a THREE.Points object with the galaxy starfield.
 *
 * @param proceduralCount Number of procedural stars
 * @param seed Random seed
 * @returns THREE.Points ready to add to a scene or group
 */
export function createGalaxyPoints(proceduralCount = 20000, seed = 0x9e3779b9): THREE.Points {
  const data = getGalaxyGeometry(proceduralCount, seed);
  const geometry = createGalaxyBufferGeometry(data);

  const material = new THREE.PointsMaterial({
    size: 0.25,
    vertexColors: true,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  return new THREE.Points(geometry, material);
}

// ---------------------------------------------------------------------------
// Group Factory (positions the Sun correctly relative to galactic center)
// ---------------------------------------------------------------------------

/**
 * Create a complete galaxy group with the starfield positioned so that
 * the Solar System is at the origin of the group's local space.
 *
 * The group is rotated to approximate the real orientation:
 * - Galactic plane roughly aligned with XZ plane
 * - Solar System located on the +X side (Orion Arm)
 *
 * @param proceduralCount Number of procedural stars
 * @param seed Random seed
 * @returns THREE.Group containing the galaxy Points
 */
export function createGalaxyGroup(proceduralCount = 20000, seed = 0x9e3779b9): THREE.Group {
  const group = new THREE.Group();
  group.name = 'galaxy-starfield-group';

  const points = createGalaxyPoints(proceduralCount, seed);
  group.add(points);

  // The star positions are already computed relative to the Sun,
  // so no additional offset is needed. The group origin = Sun position.

  return group;
}

// ---------------------------------------------------------------------------
// Utility Exports
// ---------------------------------------------------------------------------

/** Get the scene-coordinate position of the galactic center (for reference) */
export function getGalacticCenterScenePosition(): THREE.Vector3 {
  // GC is at (-SUN_POSITION_LY.x, 0, 0) in galactic coords
  // Convert to scene: galX = -26000, galY = 0, galZ = 0
  const pos = galacticToScene(-SUN_POSITION_LY.x, 0, 0);
  return new THREE.Vector3(pos.x, pos.y, pos.z);
}

/** Get the approximate scene-coordinate direction toward the galactic center from the Sun */
export function getGalacticCenterDirection(): THREE.Vector3 {
  return new THREE.Vector3(0, 0, 1).normalize(); // GC is along +Z in scene coords
}

/** Re-export bright star count for convenience */
export { BRIGHT_STARS };
export type { DetailedStar };
