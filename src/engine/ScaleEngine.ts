/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ScaleEngine - Unified physical scale conversion system for the galaxy simulation.
 *
 * Design principle: 1 AU = 1000 scene units.
 * All real distances are preserved. Planet sizes are true to life.
 * When viewed from far away, tiny planets remain visible via point sprites / glow sprites.
 */

// ---------------------------------------------------------------------------
// Fundamental physical constants (km)
// ---------------------------------------------------------------------------
export const PHYSICAL_CONSTANTS = {
  AU_IN_KM: 149_597_870.7,
  LIGHT_YEAR_IN_KM: 9_460_730_472_580.8,
  SUN_RADIUS_KM: 696_340,
  EARTH_RADIUS_KM: 6_371.0,
  EARTH_MOON_DISTANCE_KM: 384_400,
} as const;

// ---------------------------------------------------------------------------
// Scene scale: 1 AU = 1000 scene units
// ---------------------------------------------------------------------------
export const UNIVERSE_SCALE = {
  /** Scene units per AU */
  AU: 1000,

  /** Scene units per km */
  get KM() {
    return UNIVERSE_SCALE.AU / PHYSICAL_CONSTANTS.AU_IN_KM;
  },

  /** Scene units per light-year */
  get LIGHT_YEAR() {
    return UNIVERSE_SCALE.AU * (PHYSICAL_CONSTANTS.LIGHT_YEAR_IN_KM / PHYSICAL_CONSTANTS.AU_IN_KM);
  },
} as const;

// ---------------------------------------------------------------------------
// Conversion functions
// ---------------------------------------------------------------------------

/**
 * Convert kilometers to scene units.
 * @param km Distance in kilometers
 * @returns Distance in scene units
 */
export function kmToSceneUnits(km: number): number {
  return km * UNIVERSE_SCALE.KM;
}

/**
 * Convert astronomical units (AU) to scene units.
 * @param au Distance in AU
 * @returns Distance in scene units
 */
export function auToSceneUnits(au: number): number {
  return au * UNIVERSE_SCALE.AU;
}

/**
 * Convert light-years to scene units.
 * @param ly Distance in light-years
 * @returns Distance in scene units
 */
export function lyToSceneUnits(ly: number): number {
  return ly * UNIVERSE_SCALE.LIGHT_YEAR;
}

// ---------------------------------------------------------------------------
// Celestial body radii in scene units (true physical scale)
// ---------------------------------------------------------------------------

const RADIUS_MAP_KM: Record<string, number> = {
  sun: 696_340,
  mercury: 2_439.7,
  venus: 6_051.8,
  earth: 6_371.0,
  moon: 1_737.4,
  mars: 3_389.5,
  jupiter: 69_911,
  saturn: 58_232,
  uranus: 25_362,
  neptune: 24_622,
};

/**
 * Get the real physical radius of a celestial body in scene units.
 * @param id Celestial body ID (e.g. 'earth', 'jupiter', 'sun')
 * @returns Radius in scene units
 */
export function getRealRadius(id: string): number {
  const radiusKm = RADIUS_MAP_KM[id.toLowerCase()];
  if (radiusKm === undefined) {
    console.warn(`[ScaleEngine] Unknown body ID: ${id}`);
    return 0;
  }
  return kmToSceneUnits(radiusKm);
}

// ---------------------------------------------------------------------------
// Celestial body orbital distances in scene units (true physical scale)
// ---------------------------------------------------------------------------

/** Semi-major axis in AU, from NASA JPL Horizons / IAU 2015 nominal values */
const ORBITAL_DISTANCE_AU: Record<string, number> = {
  mercury: 0.3871,
  venus: 0.7233,
  earth: 1.0000,
  mars: 1.5237,
  jupiter: 5.2028,
  saturn: 9.5388,
  uranus: 19.1914,
  neptune: 30.0611,
  // Moon relative to Earth center
  moon: 0.00257,
};

/**
 * Get the real physical orbital distance (semi-major axis) of a body in scene units.
 * For planets this is heliocentric distance. For the moon it is geocentric distance.
 * @param id Celestial body ID
 * @returns Distance in scene units
 */
export function getRealDistance(id: string): number {
  const au = ORBITAL_DISTANCE_AU[id.toLowerCase()];
  if (au === undefined) {
    console.warn(`[ScaleEngine] Unknown orbit ID: ${id}`);
    return 0;
  }
  return auToSceneUnits(au);
}

// ---------------------------------------------------------------------------
// Satellite real distances (in planet radii) and real radius ratios
// ---------------------------------------------------------------------------

export interface SatelliteScaleDef {
  name: string;
  /** Orbital distance in planet radii (not diameters) */
  realDistanceRadii: number;
  /** Satellite radius in planet radii */
  realRadiusRatio: number;
}

/**
 * Real satellite orbital data in units of the parent planet's radius.
 * All values computed from NASA fact sheets:
 *   realDistanceRadii = orbital_distance_km / parent_radius_km
 *   realRadiusRatio   = satellite_radius_km / parent_radius_km
 */
export const SATELLITE_SCALE_DATA: Record<string, SatelliteScaleDef[]> = {
  mercury: [],
  venus: [],
  earth: [
    {
      name: 'moon',
      realDistanceRadii: 60.31, // 384,400 km / 6,371 km = 60.31 Earth radii
      realRadiusRatio: 0.2727,  // 1,737.4 km / 6,371 km = 0.2727
    },
  ],
  mars: [
    {
      name: 'phobos',
      realDistanceRadii: 2.766, // 9,377 km / 3,389.5 km = 2.766 Mars radii
      realRadiusRatio: 0.00058, // ~11.3 km / 3,389.5 km
    },
    {
      name: 'deimos',
      realDistanceRadii: 6.921, // 23,463 km / 3,389.5 km = 6.921 Mars radii
      realRadiusRatio: 0.00018, // ~6.2 km / 3,389.5 km
    },
  ],
  jupiter: [
    {
      name: 'io',
      realDistanceRadii: 6.031,   // 421,700 km / 69,911 km = 6.031 Jupiter radii
      realRadiusRatio: 0.0261,    // 1,821.6 km / 69,911 km
    },
    {
      name: 'europa',
      realDistanceRadii: 9.596,   // 670,900 km / 69,911 km = 9.596 Jupiter radii
      realRadiusRatio: 0.0223,    // 1,560.8 km / 69,911 km
    },
    {
      name: 'ganymede',
      realDistanceRadii: 15.311,  // 1,070,400 km / 69,911 km = 15.311 Jupiter radii
      realRadiusRatio: 0.0377,    // 2,634.1 km / 69,911 km
    },
    {
      name: 'callisto',
      realDistanceRadii: 26.93,   // 1,882,700 km / 69,911 km = 26.93 Jupiter radii
      realRadiusRatio: 0.0345,    // 2,410.3 km / 69,911 km
    },
  ],
  saturn: [
    {
      name: 'titan',
      realDistanceRadii: 20.982,  // 1,221,870 km / 58,232 km = 20.982 Saturn radii
      realRadiusRatio: 0.0442,    // 2,574.7 km / 58,232 km
    },
    {
      name: 'rhea',
      realDistanceRadii: 9.052,   // 527,108 km / 58,232 km = 9.052 Saturn radii
      realRadiusRatio: 0.0131,    // 763.8 km / 58,232 km
    },
    {
      name: 'enceladus',
      realDistanceRadii: 4.086,   // 238,020 km / 58,232 km = 4.086 Saturn radii
      realRadiusRatio: 0.0043,    // 252.1 km / 58,232 km
    },
  ],
  uranus: [
    {
      name: 'titania',
      realDistanceRadii: 17.187,  // 435,910 km / 25,362 km = 17.187 Uranus radii
      realRadiusRatio: 0.0311,    // 788.9 km / 25,362 km
    },
    {
      name: 'oberon',
      realDistanceRadii: 23.007,  // 583,520 km / 25,362 km = 23.007 Uranus radii
      realRadiusRatio: 0.0300,    // 761.4 km / 25,362 km
    },
    {
      name: 'ariel',
      realDistanceRadii: 7.532,   // 190,900 km / 25,362 km = 7.532 Uranus radii
      realRadiusRatio: 0.0228,    // 578.9 km / 25,362 km
    },
  ],
  neptune: [
    {
      name: 'triton',
      realDistanceRadii: 14.408,  // 354,760 km / 24,622 km = 14.408 Neptune radii
      realRadiusRatio: 0.0550,    // 1,353.4 km / 24,622 km
    },
    {
      name: 'proteus',
      realDistanceRadii: 4.778,   // 117,647 km / 24,622 km = 4.778 Neptune radii
      realRadiusRatio: 0.0085,    // 210.0 km / 24,622 km
    },
  ],
};

// ---------------------------------------------------------------------------
// Utility: compute satellite absolute scene-unit position from parent
// ---------------------------------------------------------------------------

/**
 * Compute a satellite's orbital distance in scene units given its parent planet ID.
 * @param parentId Parent planet ID (e.g. 'earth', 'jupiter')
 * @param satelliteName Satellite name (e.g. 'moon', 'io')
 * @returns Orbital distance in scene units, or 0 if unknown
 */
export function getSatelliteRealDistanceInSceneUnits(parentId: string, satelliteName: string): number {
  const parentRadius = getRealRadius(parentId);
  const satellites = SATELLITE_SCALE_DATA[parentId.toLowerCase()];
  if (!satellites) return 0;
  const sat = satellites.find(s => s.name.toLowerCase() === satelliteName.toLowerCase());
  if (!sat) return 0;
  return parentRadius * sat.realDistanceRadii;
}

/**
 * Compute a satellite's radius in scene units given its parent planet ID.
 * @param parentId Parent planet ID
 * @param satelliteName Satellite name
 * @returns Radius in scene units, or 0 if unknown
 */
export function getSatelliteRealRadiusInSceneUnits(parentId: string, satelliteName: string): number {
  const parentRadius = getRealRadius(parentId);
  const satellites = SATELLITE_SCALE_DATA[parentId.toLowerCase()];
  if (!satellites) return 0;
  const sat = satellites.find(s => s.name.toLowerCase() === satelliteName.toLowerCase());
  if (!sat) return 0;
  return parentRadius * sat.realRadiusRatio;
}

// ---------------------------------------------------------------------------
// Backward compatibility helpers (legacy ORBIT_SCALE = 22.0 system)
// ---------------------------------------------------------------------------

/** Legacy scale factor used in UniverseViewer: 1 AU = 22 scene units */
export const LEGACY_ORBIT_SCALE = 22.0;

/**
 * Convert scene units from the new ScaleEngine system to the legacy system.
 * @param sceneUnits Value in new scene units (1 AU = 1000)
 * @returns Value in legacy scene units (1 AU = 22)
 */
export function toLegacyScale(sceneUnits: number): number {
  return sceneUnits * (LEGACY_ORBIT_SCALE / UNIVERSE_SCALE.AU);
}

/**
 * Convert scene units from the legacy system to the new ScaleEngine system.
 * @param legacyUnits Value in legacy scene units (1 AU = 22)
 * @returns Value in new scene units (1 AU = 1000)
 */
export function fromLegacyScale(legacyUnits: number): number {
  return legacyUnits * (UNIVERSE_SCALE.AU / LEGACY_ORBIT_SCALE);
}
