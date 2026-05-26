/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ObserverEngine — Multi-reference-frame astronomical observation engine.
 *
 * Computes apparent sky positions (RA/Dec) of the Sun, planets, and natural
 * satellites as seen from the surface of any Solar System body.
 *
 * All coordinates use J2000.0 ecliptic frame internally, converted to
 * equatorial frame for final RA/Dec output.
 */

import { OrbitEngine, CELESTIAL_PHYSICS } from './OrbitEngine';
import { TimeEngine, J2000_TIMESTAMP } from './TimeEngine';
import {
  SATELLITE_CATALOG,
  SATELLITES_BY_PARENT,
  getSatelliteHeliocentricPosition,
  getSatelliteAngularDiameter,
} from './SatelliteData';
import type { ObserverContext, PlanetSkyInfo, SatelliteSkyInfo } from '../types/astronomy';

/** Obliquity of the ecliptic at J2000.0 (degrees) */
const OBLIQUITY_DEG = 23.439;
const OBLIQUITY_RAD = (OBLIQUITY_DEG * Math.PI) / 180.0;
const cosObliq = Math.cos(OBLIQUITY_RAD);
const sinObliq = Math.sin(OBLIQUITY_RAD);

/** Map satellite ID to its parent planet ID */
const SATELLITE_PARENT_MAP: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const sat of SATELLITE_CATALOG) {
    map[sat.id] = sat.parentId;
  }
  return map;
})();

/**
 * IAU 2009 planetary rotation poles in J2000.0 equatorial frame.
 * raDeg = right ascension of north pole (degrees)
 * decDeg = declination of north pole (degrees)
 */
const PLANET_ROTATION_AXES: Record<string, { raDeg: number; decDeg: number }> = {
  mercury: { raDeg: 281.01, decDeg: 61.45 },
  venus:   { raDeg: 272.76, decDeg: 67.16 },
  earth:   { raDeg: 0.00,   decDeg: 90.00 },
  mars:    { raDeg: 317.68, decDeg: 52.89 },
  jupiter: { raDeg: 268.05, decDeg: 64.49 },
  saturn:  { raDeg: 40.59,  decDeg: 83.54 },
  uranus:  { raDeg: 257.31, decDeg: -15.18 },
  neptune: { raDeg: 295.36, decDeg: 40.47 },
  moon:    { raDeg: 266.86, decDeg: 65.64 },
};

/** Fixed visual properties for planets when seen from other bodies */
const PLANET_VISUALS: Record<string, { color: number; baseMag: number }> = {
  mercury: { color: 0xb0b0b0, baseMag: -0.4 },
  venus:   { color: 0xffeed0, baseMag: -4.4 },
  earth:   { color: 0x4a90d9, baseMag: -3.5 },
  mars:    { color: 0xff5533, baseMag: -2.0 },
  jupiter: { color: 0xffd54f, baseMag: -2.7 },
  saturn:  { color: 0xffe57f, baseMag: 0.6 },
  uranus:  { color: 0x7fd4e0, baseMag: 5.3 },
  neptune: { color: 0x4b70dd, baseMag: 7.8 },
};

export class ObserverEngine {
  /**
   * Convert ecliptic Cartesian coordinates to equatorial coordinates.
   * Rotation about X-axis by obliquity angle ε.
   */
  static eclipticToEquatorial(x: number, y: number, z: number): { x: number; y: number; z: number } {
    return {
      x: x,
      y: y * cosObliq - z * sinObliq,
      z: y * sinObliq + z * cosObliq,
    };
  }

  /**
   * Convert a 3-D vector to Right Ascension (hours) and Declination (degrees).
   */
  static vectorToRADec(vx: number, vy: number, vz: number): { ra: number; dec: number } {
    let ra = Math.atan2(vy, vx) * 12.0 / Math.PI;
    if (ra < 0) ra += 24;
    const dec = Math.atan2(vz, Math.sqrt(vx * vx + vy * vy)) * 180.0 / Math.PI;
    return { ra, dec };
  }

  /**
   * Local Sidereal Time for any Solar System body.
   *
   * Earth uses the high-precision GMST formula from TimeEngine.
   * Other bodies use their rotationPeriod from CELESTIAL_PHYSICS.
   * Negative rotationPeriod (Venus, Uranus) yields retrograde sidereal time.
   */
  static getLocalSiderealTime(ctx: ObserverContext, timestamp: number): number {
    if (ctx.bodyId === 'earth') {
      return TimeEngine.getLocalSiderealTime(timestamp, ctx.longitude);
    }

    const phys = CELESTIAL_PHYSICS[ctx.bodyId as keyof typeof CELESTIAL_PHYSICS];
    if (!phys) {
      // Fallback: treat unknown body like Earth
      return TimeEngine.getLocalSiderealTime(timestamp, ctx.longitude);
    }

    const hoursSinceJ2000 = (timestamp - J2000_TIMESTAMP) / 3600000;
    // sidereal day count * 24 hours
    const gmst = ((hoursSinceJ2000 / Math.abs(phys.rotationPeriod)) * 24) % 24;
    const sign = phys.rotationPeriod >= 0 ? 1 : -1;
    let lst = (gmst * sign + ctx.longitude / 15) % 24;
    if (lst < 0) lst += 24;
    return lst;
  }

  /**
   * Apparent position of the Sun as seen from the observer's body.
   */
  static getSolarRADec(ctx: ObserverContext, days: number): { ra: number; dec: number } {
    const observerPos = OrbitEngine.getHeliocentricPosition(ctx.bodyId, days);
    // Sun direction = -observer position vector
    const eq = this.eclipticToEquatorial(-observerPos.x, -observerPos.y, -observerPos.z);
    return this.vectorToRADec(eq.x, eq.y, eq.z);
  }

  /**
   * Apparent position of a target planet as seen from the observer's body.
   */
  static getPlanetRADec(ctx: ObserverContext, targetId: string, days: number): PlanetSkyInfo {
    const observerPos = OrbitEngine.getHeliocentricPosition(ctx.bodyId, days);
    const targetPos = OrbitEngine.getHeliocentricPosition(targetId, days);
    const dx = targetPos.x - observerPos.x;
    const dy = targetPos.y - observerPos.y;
    const dz = targetPos.z - observerPos.z;
    const distAU = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const eq = this.eclipticToEquatorial(dx, dy, dz);
    const { ra, dec } = this.vectorToRADec(eq.x, eq.y, eq.z);

    const phys = CELESTIAL_PHYSICS[targetId as keyof typeof CELESTIAL_PHYSICS];
    const angularDiameter = phys
      ? (2 * phys.radius / (distAU * 1.496e8)) * (180.0 / Math.PI) * 60.0
      : 0;

    const visual = PLANET_VISUALS[targetId];
    // Simplified magnitude scaling with distance (crude but adequate for sky-dome)
    const magnitude = visual ? visual.baseMag + 5 * Math.log10(Math.max(distAU, 0.1)) : 0;

    return {
      id: targetId,
      ra,
      dec,
      distAU,
      angularDiameter,
      magnitude,
      color: visual?.color ?? 0xffffff,
    };
  }

  /**
   * All other planets visible from the observer's body.
   * Excludes the observer body itself and its parent planet (if the observer is a moon).
   */
  static getPlanetsInSky(ctx: ObserverContext, days: number): PlanetSkyInfo[] {
    const planetIds = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
    const exclude = new Set<string>([ctx.bodyId]);

    // If observer is a natural satellite, exclude its parent planet (parent handled as dominant body)
    const parentId = SATELLITE_PARENT_MAP[ctx.bodyId];
    if (parentId) exclude.add(parentId);

    return planetIds
      .filter((id) => !exclude.has(id))
      .map((id) => this.getPlanetRADec(ctx, id, days));
  }

  /**
   * Natural satellites visible from the observer's body.
   *
   * earth → Moon
   * moon  → Earth (tidally locked; Earth stays near zenith on the near side)
   * jupiter → Galilean moons
   * mars  → Phobos, Deimos
   * saturn → Titan
   * uranus → Titania
   * neptune → Triton
   */
  static getSatellitesInSky(ctx: ObserverContext, days: number): SatelliteSkyInfo[] {
    // If observer is on a natural satellite, its parent planet is handled as the dominant body.
    // Other moons of the same parent are not rendered in this simplified model.
    if (SATELLITE_PARENT_MAP[ctx.bodyId]) {
      return [];
    }

    switch (ctx.bodyId) {
      case 'earth':
        return [this.getMoonFromEarth(days)];
      case 'moon':
        return [this.getEarthFromMoon(ctx, days)];
      case 'jupiter':
        return this.getParentSatellites(ctx.bodyId, days);
      case 'mars':
        return this.getParentSatellites(ctx.bodyId, days);
      case 'saturn':
        return this.getParentSatellites(ctx.bodyId, days);
      case 'uranus':
        return this.getParentSatellites(ctx.bodyId, days);
      case 'neptune':
        return this.getParentSatellites(ctx.bodyId, days);
      default:
        return [];
    }
  }

  /** Moons orbiting the observer's body (e.g. Jupiter's Galilean moons). */
  private static getParentSatellites(parentId: string, days: number): SatelliteSkyInfo[] {
    const sats = SATELLITES_BY_PARENT[parentId] || [];
    const parentPos = OrbitEngine.getHeliocentricPosition(parentId, days);

    return sats.map((sat) => {
      const rel = getSatelliteHeliocentricPosition(sat, days);
      // Satellite heliocentric = parent + relative
      const satX = parentPos.x + rel.x;
      const satY = parentPos.y + rel.y;
      const satZ = parentPos.z + rel.z;

      // Vector from parent (observer) to satellite
      const eq = this.eclipticToEquatorial(rel.x, rel.y, rel.z);
      const { ra, dec } = this.vectorToRADec(eq.x, eq.y, eq.z);

      return {
        id: sat.id,
        nameZh: sat.nameZh,
        nameEn: sat.nameEn,
        ra,
        dec,
        angularDiameter: getSatelliteAngularDiameter(sat),
        magnitude: sat.magnitude,
        color: sat.color,
      };
    });
  }

  /** The Moon as seen from Earth. */
  private static getMoonFromEarth(days: number): SatelliteSkyInfo {
    const moonRel = OrbitEngine.getLunarRelativePosition(days);
    const eq = this.eclipticToEquatorial(moonRel.x, moonRel.y, moonRel.z);
    const { ra, dec } = this.vectorToRADec(eq.x, eq.y, eq.z);
    const distAU = Math.sqrt(moonRel.x * moonRel.x + moonRel.y * moonRel.y + moonRel.z * moonRel.z);
    const angularDiameter = (2 * 1737.4 / (distAU * 1.496e8)) * (180.0 / Math.PI) * 60.0;

    return {
      id: 'moon',
      nameZh: '月球',
      nameEn: 'The Moon',
      ra,
      dec,
      angularDiameter,
      magnitude: -12.74,
      color: 0xc8d4e0,
    };
  }

  /**
   * Earth as seen from the Moon.
   *
   * Simplified educational model: due to tidal locking, Earth remains near the
   * zenith for observers on the Moon's near side. We set RA = LST and Dec =
   * observer latitude so that the Earth appears at the zenith in the local
   * horizontal frame (altitude ≈ 90°). The actual variation from libration is
   * only ±7.9°, well within the visual tolerance of this sky-dome renderer.
   */
  private static getEarthFromMoon(ctx: ObserverContext, days: number): SatelliteSkyInfo {
    const timestamp = J2000_TIMESTAMP + days * 86400000;
    const lst = this.getLocalSiderealTime(ctx, timestamp);
    const distKm = 384400;
    const angularDiameter = (2 * 6371.0 / distKm) * (180.0 / Math.PI) * 60.0;

    return {
      id: 'earth',
      nameZh: '地球',
      nameEn: 'Earth',
      ra: lst,
      dec: ctx.latitude,
      angularDiameter,
      magnitude: -17.0,
      color: 0x4a90d9,
    };
  }

  /**
   * Rotate a direction vector from J2000 Earth equatorial frame to a body's
   * local equatorial frame (where the body's rotation axis is +z).
   */
  static j2000ToBodyEquatorial(
    bodyId: string,
    vx: number, vy: number, vz: number
  ): { x: number; y: number; z: number } {
    let effectiveBodyId = bodyId;
    if (!PLANET_ROTATION_AXES[bodyId]) {
      const parentId = SATELLITE_PARENT_MAP[bodyId];
      if (parentId && PLANET_ROTATION_AXES[parentId]) {
        effectiveBodyId = parentId;
      } else {
        return { x: vx, y: vy, z: vz };
      }
    }
    if (effectiveBodyId === 'earth') return { x: vx, y: vy, z: vz };

    const pole = PLANET_ROTATION_AXES[effectiveBodyId];

    const ra0 = (pole.raDeg * Math.PI) / 180.0;
    const dec0 = (pole.decDeg * Math.PI) / 180.0;

    // Planet pole unit vector in J2000 (this becomes +z in body frame)
    const pz_x = Math.cos(dec0) * Math.cos(ra0);
    const pz_y = Math.cos(dec0) * Math.sin(ra0);
    const pz_z = Math.sin(dec0);

    // Choose a temporary vector not parallel to pz
    const useX = Math.abs(pz_z) < 0.9;
    const tx = useX ? 0.0 : 1.0;
    const ty = 0.0;
    const tz = useX ? 1.0 : 0.0;

    // px_ref = temp × pz
    const rx = ty * pz_z - tz * pz_y;
    const ry = tz * pz_x - tx * pz_z;
    const rz = tx * pz_y - ty * pz_x;
    const rlen = Math.sqrt(rx * rx + ry * ry + rz * rz);
    const px_x = rx / rlen;
    const px_y = ry / rlen;
    const px_z = rz / rlen;

    // py = pz × px (right-handed)
    const py_x = pz_y * px_z - pz_z * px_y;
    const py_y = pz_z * px_x - pz_x * px_z;
    const py_z = pz_x * px_y - pz_y * px_x;

    // v_body = R^T * v_j2000, where columns of R are (px, py, pz)
    return {
      x: px_x * vx + px_y * vy + px_z * vz,
      y: py_x * vx + py_y * vy + py_z * vz,
      z: pz_x * vx + pz_y * vy + pz_z * vz,
    };
  }

  /**
   * Convert RA/Dec from J2000 Earth equatorial frame to a body's local
   * equatorial frame.  This ensures horizontal coordinates are computed in
   * the correct reference frame for the observer's planet/moon.
   */
  static toBodyEquatorial(
    bodyId: string,
    ra: number,   // hours, J2000 Earth equatorial
    dec: number   // degrees, J2000 Earth equatorial
  ): { ra: number; dec: number } {
    let effectiveBodyId = bodyId;
    if (!PLANET_ROTATION_AXES[bodyId]) {
      const parentId = SATELLITE_PARENT_MAP[bodyId];
      if (parentId && PLANET_ROTATION_AXES[parentId]) {
        effectiveBodyId = parentId;
      } else {
        return { ra, dec };
      }
    }
    if (effectiveBodyId === 'earth') {
      return { ra, dec };
    }

    const raRad = (ra * Math.PI) / 12.0;
    const decRad = (dec * Math.PI) / 180.0;
    const cosDec = Math.cos(decRad);

    const v = this.j2000ToBodyEquatorial(
      effectiveBodyId,
      cosDec * Math.cos(raRad),
      cosDec * Math.sin(raRad),
      Math.sin(decRad)
    );

    let newRa = Math.atan2(v.y, v.x) * 12.0 / Math.PI;
    if (newRa < 0) newRa += 24;
    const newDec = Math.atan2(v.z, Math.sqrt(v.x * v.x + v.y * v.y)) * 180.0 / Math.PI;

    return { ra: newRa, dec: newDec };
  }
}
