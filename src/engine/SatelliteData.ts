/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SatelliteData — Natural satellite orbital elements and visual properties.
 *
 * Provides simplified circular-orbit ephemerides for major moons in the Solar System.
 * All distances are real physical values. Orbital planes are approximated to the
 * ecliptic plane (error < 3° for Jupiter's Galilean moons), sufficient for sky-dome
 * visualization.
 */

import { CELESTIAL_PHYSICS } from './OrbitEngine';

export interface SatelliteDef {
  id: string;
  nameZh: string;
  nameEn: string;
  parentId: string;        // Parent planet ID
  semiMajorAxisKm: number; // km
  periodDays: number;      // Orbital period in Earth days
  inclinationDeg: number;  // Inclination to orbital reference plane (degrees)
  initialPhaseRad: number; // Phase at J2000.0 (radians)
  orbitPlane: 'ecliptic' | 'planetary_equator'; // Reference plane for inclination
  eccentricity: number;    // Orbital eccentricity
  argumentOfPeriapsisDeg: number; // Argument of periapsis (degrees)
  color: number;
  magnitude: number;       // Apparent magnitude from parent surface
  radiusKm: number;
}

/** AU per km */
const KM_TO_AU = 1.0 / 1.496e8;

/** Major satellites with real orbital parameters */
export const SATELLITE_CATALOG: SatelliteDef[] = [
  // Martian moons
  {
    id: 'phobos', nameZh: '火卫一 Phobos', nameEn: 'Phobos',
    parentId: 'mars', semiMajorAxisKm: 9377, periodDays: 0.3189,
    inclinationDeg: 1.09, initialPhaseRad: 0.5, orbitPlane: 'planetary_equator', eccentricity: 0.0151, argumentOfPeriapsisDeg: 0, color: 0x90a4ae,
    magnitude: -1.0, radiusKm: 11.2
  },
  {
    id: 'deimos', nameZh: '火卫二 Deimos', nameEn: 'Deimos',
    parentId: 'mars', semiMajorAxisKm: 23460, periodDays: 1.263,
    inclinationDeg: 1.79, initialPhaseRad: 2.1, orbitPlane: 'planetary_equator', eccentricity: 0.0002, argumentOfPeriapsisDeg: 0, color: 0xb0bec5,
    magnitude: 0.5, radiusKm: 6.2
  },
  // Galilean moons of Jupiter
  {
    id: 'io', nameZh: '木卫一 Io', nameEn: 'Io',
    parentId: 'jupiter', semiMajorAxisKm: 421700, periodDays: 1.769,
    inclinationDeg: 0.05, initialPhaseRad: 0.0, orbitPlane: 'planetary_equator', eccentricity: 0.0041, argumentOfPeriapsisDeg: 0, color: 0xffeb3b,
    magnitude: -2.0, radiusKm: 1821.6
  },
  {
    id: 'europa', nameZh: '木卫二 Europa', nameEn: 'Europa',
    parentId: 'jupiter', semiMajorAxisKm: 671034, periodDays: 3.551,
    inclinationDeg: 0.47, initialPhaseRad: 1.2, orbitPlane: 'planetary_equator', eccentricity: 0.0094, argumentOfPeriapsisDeg: 0, color: 0x80deea,
    magnitude: -1.5, radiusKm: 1560.8
  },
  {
    id: 'ganymede', nameZh: '木卫三 Ganymede', nameEn: 'Ganymede',
    parentId: 'jupiter', semiMajorAxisKm: 1070412, periodDays: 7.155,
    inclinationDeg: 0.21, initialPhaseRad: 2.5, orbitPlane: 'planetary_equator', eccentricity: 0.0013, argumentOfPeriapsisDeg: 0, color: 0xc8b896,
    magnitude: -2.2, radiusKm: 2634.1
  },
  {
    id: 'callisto', nameZh: '木卫四 Callisto', nameEn: 'Callisto',
    parentId: 'jupiter', semiMajorAxisKm: 1882709, periodDays: 16.689,
    inclinationDeg: 0.28, initialPhaseRad: 4.0, orbitPlane: 'planetary_equator', eccentricity: 0.0074, argumentOfPeriapsisDeg: 0, color: 0x8d6e63,
    magnitude: -1.2, radiusKm: 2410.3
  },
  // Saturnian moons
  {
    id: 'titan', nameZh: '土卫六 Titan', nameEn: 'Titan',
    parentId: 'saturn', semiMajorAxisKm: 1221870, periodDays: 15.945,
    inclinationDeg: 0.35, initialPhaseRad: 1.0, orbitPlane: 'planetary_equator', eccentricity: 0.0288, argumentOfPeriapsisDeg: 0, color: 0xd4a76a,
    magnitude: -1.5, radiusKm: 2575.5
  },
  {
    id: 'rhea', nameZh: '土卫五 Rhea', nameEn: 'Rhea',
    parentId: 'saturn', semiMajorAxisKm: 527040, periodDays: 4.518,
    inclinationDeg: 0.35, initialPhaseRad: 2.0, orbitPlane: 'planetary_equator', eccentricity: 0.001, argumentOfPeriapsisDeg: 0, color: 0xb0bebe,
    magnitude: -1.0, radiusKm: 763.8
  },
  {
    id: 'enceladus', nameZh: '土卫二 Enceladus', nameEn: 'Enceladus',
    parentId: 'saturn', semiMajorAxisKm: 238020, periodDays: 1.370,
    inclinationDeg: 0.35, initialPhaseRad: 3.0, orbitPlane: 'planetary_equator', eccentricity: 0.0047, argumentOfPeriapsisDeg: 0, color: 0xe0f2f1,
    magnitude: 0.0, radiusKm: 252.1
  },
  // Uranian moons
  {
    id: 'titania', nameZh: '天卫三 Titania', nameEn: 'Titania',
    parentId: 'uranus', semiMajorAxisKm: 435910, periodDays: 8.706,
    inclinationDeg: 0.14, initialPhaseRad: 0.8, orbitPlane: 'planetary_equator', eccentricity: 0.0011, argumentOfPeriapsisDeg: 0, color: 0xc0c0c0,
    magnitude: -0.5, radiusKm: 788.4
  },
  {
    id: 'oberon', nameZh: '天卫四 Oberon', nameEn: 'Oberon',
    parentId: 'uranus', semiMajorAxisKm: 583520, periodDays: 13.463,
    inclinationDeg: 0.14, initialPhaseRad: 2.5, orbitPlane: 'planetary_equator', eccentricity: 0.0014, argumentOfPeriapsisDeg: 0, color: 0xd1c4e9,
    magnitude: 0.0, radiusKm: 761.4
  },
  {
    id: 'ariel', nameZh: '天卫一 Ariel', nameEn: 'Ariel',
    parentId: 'uranus', semiMajorAxisKm: 190900, periodDays: 2.520,
    inclinationDeg: 0.14, initialPhaseRad: 1.0, orbitPlane: 'planetary_equator', eccentricity: 0.0012, argumentOfPeriapsisDeg: 0, color: 0xe0f2f1,
    magnitude: 0.0, radiusKm: 578.9
  },
  // Neptunian moons
  {
    id: 'triton', nameZh: '海卫一 Triton', nameEn: 'Triton',
    parentId: 'neptune', semiMajorAxisKm: 354760, periodDays: 5.877,
    inclinationDeg: 157.0, initialPhaseRad: 1.5, orbitPlane: 'planetary_equator', eccentricity: 0.000016, argumentOfPeriapsisDeg: 0, color: 0xa0c4e8,
    magnitude: -1.0, radiusKm: 1353.4
  },
  {
    id: 'proteus', nameZh: '海卫八 Proteus', nameEn: 'Proteus',
    parentId: 'neptune', semiMajorAxisKm: 117647, periodDays: 1.122,
    inclinationDeg: 0.0, initialPhaseRad: 0.5, orbitPlane: 'planetary_equator', eccentricity: 0.0005, argumentOfPeriapsisDeg: 0, color: 0xb0bec5,
    magnitude: 1.0, radiusKm: 210.0
  },
];

/** Group satellites by parent planet for fast lookup */
export const SATELLITES_BY_PARENT: Record<string, SatelliteDef[]> = (() => {
  const map: Record<string, SatelliteDef[]> = {};
  for (const sat of SATELLITE_CATALOG) {
    if (!map[sat.parentId]) map[sat.parentId] = [];
    map[sat.parentId].push(sat);
  }
  return map;
})();

/**
 * Compute heliocentric position of a satellite at given J2000 days.
 * Uses circular orbit approximation in the ecliptic plane.
 */
export function getSatelliteHeliocentricPosition(
  sat: SatelliteDef,
  days: number
): { x: number; y: number; z: number } {
  const { semiMajorAxisKm, periodDays, inclinationDeg, initialPhaseRad, eccentricity, argumentOfPeriapsisDeg } = sat;

  const aAU = semiMajorAxisKm * KM_TO_AU;
  const iRad = (inclinationDeg * Math.PI) / 180.0;
  const omegaRad = (argumentOfPeriapsisDeg * Math.PI) / 180.0;

  // Mean anomaly: phase advances 2π per orbital period
  let M = ((days / periodDays) * 2 * Math.PI + initialPhaseRad) % (2 * Math.PI);
  if (M < 0) M += 2 * Math.PI;

  let xOrb: number;
  let yOrb: number;

  if (eccentricity < 1e-6) {
    // Circular orbit: true anomaly = mean anomaly
    xOrb = aAU * Math.cos(M);
    yOrb = aAU * Math.sin(M);
  } else {
    // Solve Kepler's equation: E - e * sin(E) = M
    let E = M;
    const e = eccentricity;
    for (let count = 0; count < 5; count++) {
      const deltaE = (E - e * Math.sin(E) - M) / (1.0 - e * Math.cos(E));
      E -= deltaE;
    }
    // Position in orbital plane (periapsis along +x)
    const xPlane = aAU * (Math.cos(E) - e);
    const yPlane = aAU * Math.sqrt(1.0 - e * e) * Math.sin(E);
    // Rotate by argument of periapsis around orbital normal
    xOrb = xPlane * Math.cos(omegaRad) - yPlane * Math.sin(omegaRad);
    yOrb = xPlane * Math.sin(omegaRad) + yPlane * Math.cos(omegaRad);
  }

  // Apply inclination (rotation around line of nodes = x-axis)
  let x = xOrb;
  let y = yOrb * Math.cos(iRad);
  let z = yOrb * Math.sin(iRad);

  // If defined relative to planetary equator, rotate to ecliptic frame
  if (sat.orbitPlane === 'planetary_equator') {
    const phys = CELESTIAL_PHYSICS[sat.parentId as keyof typeof CELESTIAL_PHYSICS];
    if (phys) {
      const obliqRad = (phys.obliquity * Math.PI) / 180.0;
      const cosO = Math.cos(obliqRad);
      const sinO = Math.sin(obliqRad);
      // Rotate by -obliquity around X-axis: equator → ecliptic
      const yEcl = y * cosO + z * sinO;
      const zEcl = -y * sinO + z * cosO;
      y = yEcl;
      z = zEcl;
    }
  }

  // Add to parent's heliocentric position
  return { x, y, z };
}

/**
 * Compute angular diameter (arcminutes) of a satellite as seen from its parent.
 */
export function getSatelliteAngularDiameter(sat: SatelliteDef): number {
  return (2 * sat.radiusKm / sat.semiMajorAxisKm) * (180.0 / Math.PI) * 60.0;
}
