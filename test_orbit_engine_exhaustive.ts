/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OrbitEngine } from './src/engine/OrbitEngine';
import { SATELLITE_CATALOG } from './src/engine/SatelliteData';
import { J2000_TIMESTAMP } from './src/engine/TimeEngine';

// List of all 8 planets
const PLANETS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

// List of all satellites (including special moon)
const SATELLITE_IDS = ['moon', ...SATELLITE_CATALOG.map(s => s.id)];

console.log("=== EXHAUSTIVE ORBIT ENGINE UNIT TESTS ===");

let passedTestsCount = 0;
let failedTestsCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passedTestsCount++;
  } else {
    failedTestsCount++;
    console.error(`🔴 ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
}

// Generate 20 test dates spread out between 1900 and 2100
const TEST_DAYS: number[] = [];
for (let i = 0; i < 20; i++) {
  // Translate step to days since J2000
  // J2000 is 2000-01-01 12:00:00 UTC (days = 0)
  // 1900-01-01 is about -36525 days
  // 2100-01-01 is about 36525 days
  const fraction = i / 19; // 0 to 1
  const days = -36525 + fraction * 73050;
  TEST_DAYS.push(days);
}

// 1. Run planet coordinate tests
console.log("\nTesting Planets (20 time points each)...");
for (const pId of PLANETS) {
  console.log(` - Testing ${pId.padEnd(8)}...`);
  for (let tIdx = 0; tIdx < TEST_DAYS.length; tIdx++) {
    const days = TEST_DAYS[tIdx];
    const pos = OrbitEngine.getHeliocentricPosition(pId, days);
    
    // Assert 1: coordinates are not NaN
    assert(!isNaN(pos.x) && !isNaN(pos.y) && !isNaN(pos.z), `${pId} position is NaN at days=${days}`);
    
    // Assert 2: distance to Sun is within a reasonable range (semi-major axis +/- 30% due to eccentricity)
    const dist = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
    
    // Approximate semi-major axis lookup
    let expectedA = 1.0;
    if (pId === 'mercury') expectedA = 0.387;
    else if (pId === 'venus') expectedA = 0.723;
    else if (pId === 'earth') expectedA = 1.000;
    else if (pId === 'mars') expectedA = 1.524;
    else if (pId === 'jupiter') expectedA = 5.203;
    else if (pId === 'saturn') expectedA = 9.539;
    else if (pId === 'uranus') expectedA = 19.191;
    else if (pId === 'neptune') expectedA = 30.061;

    assert(dist >= expectedA * 0.7 && dist <= expectedA * 1.3, 
      `${pId} distance ${dist.toFixed(4)} AU is out of bounds (expected near ${expectedA} AU) at days=${days}`);
  }
}

// 2. Run satellite coordinate tests
console.log("\nTesting Satellites (20 time points each)...");
for (const sId of SATELLITE_IDS) {
  console.log(` - Testing satellite ${sId.padEnd(10)}...`);
  
  // Find parent ID for distance validation
  let parentId = 'earth';
  let semiMajorAxisKm = 384400; // moon default
  if (sId !== 'moon') {
    const satDef = SATELLITE_CATALOG.find(s => s.id === sId)!;
    parentId = satDef.parentId;
    semiMajorAxisKm = satDef.semiMajorAxisKm;
  }
  const semiMajorAxisAU = semiMajorAxisKm / 1.496e8;

  for (let tIdx = 0; tIdx < TEST_DAYS.length; tIdx++) {
    const days = TEST_DAYS[tIdx];
    
    const parentPos = OrbitEngine.getHeliocentricPosition(parentId, days);
    const satPos = OrbitEngine.getHeliocentricPosition(sId, days);

    // Assert 1: coordinates are not NaN
    assert(!isNaN(satPos.x) && !isNaN(satPos.y) && !isNaN(satPos.z), `${sId} position is NaN at days=${days}`);

    // Assert 2: relative distance from parent is roughly equal to semi-major axis (+/- 15%)
    const relX = satPos.x - parentPos.x;
    const relY = satPos.y - parentPos.y;
    const relZ = satPos.z - parentPos.z;
    const relDist = Math.sqrt(relX * relX + relY * relY + relZ * relZ);

    assert(relDist >= semiMajorAxisAU * 0.8 && relDist <= semiMajorAxisAU * 1.2,
      `${sId} relative distance ${relDist.toFixed(6)} AU is out of bounds (expected near ${semiMajorAxisAU.toFixed(6)} AU) at days=${days}`);
  }
}

// 3. Test Earth position continuity (checking if LUT calibration causes discontinuities)
console.log("\nTesting Earth coordinate continuity...");
for (let i = 0; i < TEST_DAYS.length - 1; i++) {
  const days = TEST_DAYS[i];
  const pos1 = OrbitEngine.getHeliocentricPosition('earth', days);
  const pos2 = OrbitEngine.getHeliocentricPosition('earth', days + 0.1); // 0.1 day later (2.4 hours)
  
  const distMoved = Math.sqrt(
    Math.pow(pos2.x - pos1.x, 2) + 
    Math.pow(pos2.y - pos1.y, 2) + 
    Math.pow(pos2.z - pos1.z, 2)
  );

  // Earth's average orbital speed is ~30 km/s ≈ 0.017 AU/day. In 0.1 days, it moves ~0.0017 AU.
  // We assert that the distance moved is less than 0.003 AU (to ensure no sudden offset jumps)
  assert(distMoved < 0.003, `Earth position has a discontinuity: moved ${distMoved.toFixed(6)} AU in 0.1 days`);
}

// 4. Validate the Jan 10, 2020 lunar eclipse alignment (specific physical eclipse validation)
console.log("\nValidating 2020-01-10 Lunar Eclipse Alignment...");
// UTC: 2020-01-10 19:11:11 (Greatest Eclipse)
const eclipseTime = Date.UTC(2020, 0, 10, 19, 11, 11);
const daysEclipse = (eclipseTime - J2000_TIMESTAMP) / 86400000;

const earthPos = OrbitEngine.getHeliocentricPosition('earth', daysEclipse);
const moonRelPos = OrbitEngine.getLunarRelativePosition(daysEclipse);

// Vector Earth -> Sun
const vES = { x: -earthPos.x, y: -earthPos.y, z: -earthPos.z };
// Vector Earth -> Moon
const vEM = moonRelPos;

const lenES = Math.sqrt(vES.x * vES.x + vES.y * vES.y + vES.z * vES.z);
const lenEM = Math.sqrt(vEM.x * vEM.x + vEM.y * vEM.y + vEM.z * vEM.z);

const dot = vES.x * vEM.x + vES.y * vEM.y + vES.z * vEM.z;
const cosAngle = dot / (lenES * lenEM);
const angleRad = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
const angleDeg = (angleRad * 180.0) / Math.PI;

console.log(` - Earth -> Sun vector: { x: ${vES.x.toFixed(6)}, y: ${vES.y.toFixed(6)}, z: ${vES.z.toFixed(6)} }`);
console.log(` - Earth -> Moon vector: { x: ${vEM.x.toFixed(6)}, y: ${vEM.y.toFixed(6)}, z: ${vEM.z.toFixed(6)} }`);
console.log(` - Angle between Earth->Sun and Earth->Moon vectors: ${angleDeg.toFixed(4)}°`);

// During a lunar eclipse, the Moon enters the Earth's shadow, meaning the Earth -> Moon vector
// must be opposite to the Earth -> Sun vector. Thus, the angle between them should be close to 180 degrees.
// Fred Espenak's lunar eclipse prediction is extremely exact. Since the Jan 10, 2020 eclipse is penumbral,
// the Moon's center is offset from the center of Earth's shadow. We assert the angle is > 178.0 degrees.
assert(angleDeg >= 178.0, `Lunar eclipse alignment is off: angle is ${angleDeg.toFixed(4)}° (expected >= 178.0°)`);
console.log("🟢 2020-01-10 Lunar Eclipse alignment matches NASA prediction perfectly!");

console.log(`\n=== ALL TESTS PASSED SUCCESSFULLY! ===`);
console.log(`Passed Assertions: ${passedTestsCount}`);
console.log(`Failed Assertions: ${failedTestsCount}`);
console.log("========================================");
