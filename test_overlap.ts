import { OrbitEngine } from './src/engine/OrbitEngine';
import { AstrophenomenaEngine } from './src/engine/AstrophenomenaEngine';
import { TimeEngine } from './src/engine/TimeEngine';
import { SOLAR_TERMS } from './src/data/solarTerms';
import * as THREE from 'three';

const ORBIT_SCALE = 22.0;
const toThreePos = (p: { x: number, y: number, z: number }, scale = 1.0) => {
  return new THREE.Vector3(p.x * scale, p.z * scale, p.y * scale);
};

const currentYear = 2026;
console.log(`Verifying overlap for all 24 solar terms in year ${currentYear}...`);

let maxDistance = 0;

SOLAR_TERMS.forEach((term, index) => {
  // 1. Solve for the solar term's exact timestamp
  const targetTimestamp = AstrophenomenaEngine.getSolarTermTimestamp(currentYear, term.eclipticLongitude);
  const days = TimeEngine.getDaysSinceJ2000(targetTimestamp);

  // 2. Earth position at this timestamp (with offsets)
  const rawEarthPos = OrbitEngine.getHeliocentricPosition('earth', days, true);
  const realEarthPos = toThreePos(rawEarthPos, ORBIT_SCALE);

  // 3. Proposed Ghost Wrapper position (Keplerian position without offsets)
  const rawGhostWrapperPos = OrbitEngine.getHeliocentricPosition('earth', days, false);
  const ghostWrapperPos = toThreePos(rawGhostWrapperPos, ORBIT_SCALE);

  // 4. In the render loop, the group is translated by the current calibration offset
  const earthOffset = OrbitEngine.getCalibrationOffset('earth', days);
  const threeOffset = toThreePos(earthOffset, ORBIT_SCALE);
  const finalGhostPos = ghostWrapperPos.clone().add(threeOffset);

  const distance = realEarthPos.distanceTo(finalGhostPos);
  if (distance > maxDistance) {
    maxDistance = distance;
  }

  console.log(`Solar Term ${index.toString().padStart(2)} (${term.nameZh}): Distance = ${distance.toExponential(4)}`);
});

console.log(`\nMax Mismatch Distance: ${maxDistance.toExponential(4)}`);
