/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hipparcos Catalog Loader — async loading + B-V → RGB conversion.
 *
 * Data: 8,785 stars (mag ≤ 6.5) from Hipparcos catalog.
 * 8,718 stars have parallax-derived distances.
 */

export interface HipparcosStar {
  ra: number;          // hours (0-24)
  dec: number;         // degrees (-90 to +90)
  mag: number;         // V magnitude
  bv: number;          // B-V color index
  dist: number | null; // distance in light-years (from parallax, null if unknown)
  pmRa?: number;       // proper motion in RA (mas/year)
  pmDec?: number;      // proper motion in Dec (mas/year)
}

/** B-V color index → approximate RGB (based on blackbody + stellar classification) */
export function bvToRgb(bv: number): { r: number; g: number; b: number } {
  const t = Math.max(-0.4, Math.min(bv, 2.5));
  let r: number, g: number, b: number;

  if (t < -0.25) {
    r = 0.65; g = 0.78; b = 1.0;
  } else if (t < 0.0) {
    const p = (t + 0.25) / 0.25;
    r = 0.65 + p * 0.20;
    g = 0.78 + p * 0.12;
    b = 1.0;
  } else if (t < 0.3) {
    const p = t / 0.3;
    r = 0.85 + p * 0.12;
    g = 0.90 + p * 0.03;
    b = 1.0 - p * 0.08;
  } else if (t < 0.6) {
    const p = (t - 0.3) / 0.3;
    r = 0.97;
    g = 0.93 - p * 0.05;
    b = 0.92 - p * 0.25;
  } else if (t < 0.9) {
    const p = (t - 0.6) / 0.3;
    r = 0.97;
    g = 0.88 - p * 0.10;
    b = 0.67 - p * 0.27;
  } else if (t < 1.4) {
    const p = (t - 0.9) / 0.5;
    r = 0.97;
    g = 0.78 - p * 0.28;
    b = 0.40 - p * 0.22;
  } else {
    const p = Math.min((t - 1.4) / 0.6, 1.0);
    r = 0.97;
    g = 0.50 - p * 0.20;
    b = 0.18 - p * 0.10;
  }
  return { r, g, b };
}

let cachedStars: HipparcosStar[] | null = null;
let loadPromise: Promise<HipparcosStar[]> | null = null;

/**
 * Load the Hipparcos compact catalog asynchronously.
 * Caches result after first load.
 */
export async function loadHipparcosCatalog(): Promise<HipparcosStar[]> {
  if (cachedStars) return cachedStars;
  if (loadPromise) return loadPromise;

  loadPromise = fetch('/data/hipparcos_65.json')
    .then(res => {
      if (!res.ok) throw new Error(`Failed to load Hipparcos catalog: ${res.status}`);
      return res.json();
    })
    .then((raw: [number, number, number, number?, number?, number?, number?][]) => {
      cachedStars = raw.map(row => ({
        ra: row[0],
        dec: row[1],
        mag: row[2],
        bv: row[3] ?? 0.6,
        dist: row[4] ?? null, // null if parallax missing
        pmRa: row[5],
        pmDec: row[6],
      }));
      const withDist = cachedStars.filter(s => s.dist > 0).length;
      console.log(`[HipparcosLoader] Loaded ${cachedStars.length} stars (${withDist} with distance)`);
      return cachedStars;
    });

  return loadPromise;
}

/** Clear cache (useful for HMR / testing) */
export function clearHipparcosCache(): void {
  cachedStars = null;
  loadPromise = null;
}
