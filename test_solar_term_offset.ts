import { OrbitEngine } from './src/engine/OrbitEngine';
import { AstrophenomenaEngine } from './src/engine/AstrophenomenaEngine';
import { TimeEngine } from './src/engine/TimeEngine';
import { SOLAR_TERMS } from './src/data/solarTerms';
import * as THREE from 'three';

const ORBIT_SCALE = 22.0;
const toThreePos = (p: { x: number, y: number, z: number }, scale = 1.0) => {
  return new THREE.Vector3(p.x * scale, p.z * scale, p.y * scale);
};

// 1. Calculate target timestamp for Mangzhong (index 8) in 2026
const termIndex = 8; // Mangzhong
const term = SOLAR_TERMS[termIndex];
const currentYear = 2026;
const targetTimestamp = AstrophenomenaEngine.getSolarTermTimestamp(currentYear, term.eclipticLongitude);

const daysSinceJ2000 = TimeEngine.getDaysSinceJ2000(targetTimestamp);

// 2. Earth position logic from the frame loop (UniverseViewer.tsx)
const rawPos = OrbitEngine.getHeliocentricPosition('earth', daysSinceJ2000);
const realPos = toThreePos(rawPos, ORBIT_SCALE);

// 3. Ghost position logic from UniverseViewer.tsx
const e = 0.0167;
const longPeriRad = (102.937 * Math.PI) / 180;
const lonRad = ((term.eclipticLongitude + 180) * Math.PI) / 180;
const theta = lonRad - longPeriRad;
const r = (ORBIT_SCALE * (1 - e * e)) / (1 + e * Math.cos(theta));
const ghostWrapperPos = new THREE.Vector3(
  r * Math.cos(lonRad),
  0,
  r * Math.sin(lonRad)
);

// In the frame loop, we do:
// aids.eclipticPlane.position.copy(threeOffset);
// solarTermGhostsRef.current.position.copy(threeOffset);
const earthOffset = OrbitEngine.getCalibrationOffset('earth', daysSinceJ2000);
const threeOffset = toThreePos(earthOffset, ORBIT_SCALE); // assuming earthOrbitScale = 1.0 for now
const finalGhostPos = ghostWrapperPos.clone().add(threeOffset);

console.log(`Solar Term: ${term.nameZh} / ${term.nameEn}`);
console.log(`Target Timestamp: ${targetTimestamp} (${new Date(targetTimestamp).toUTCString()})`);
console.log(`Days since J2000: ${daysSinceJ2000}`);
console.log(`Earth raw position:`, rawPos);
console.log(`Earth Three.js position (realPos):`, realPos);
console.log(`Ghost Wrapper position:`, ghostWrapperPos);
console.log(`Earth Calibration offset:`, earthOffset);
console.log(`threeOffset:`, threeOffset);
console.log(`Final Ghost position:`, finalGhostPos);
console.log(`Distance between Earth and Ghost:`, realPos.distanceTo(finalGhostPos));
