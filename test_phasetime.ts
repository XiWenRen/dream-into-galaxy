import { OrbitEngine } from './src/engine/OrbitEngine.ts';
import { TimeEngine } from './src/engine/TimeEngine.ts';
import * as THREE from 'three';

const SYNODIC_MONTH_MS = 29.53059 * 24 * 60 * 60 * 1000;
const knownNewMoon = Date.UTC(2000, 0, 16, 22, 59, 0);

function getCurrentCycleNewMoon(referenceTimestamp: number): number {
  const monthsSince = (referenceTimestamp - knownNewMoon) / SYNODIC_MONTH_MS;
  let baseTs = knownNewMoon + Math.floor(monthsSince) * SYNODIC_MONTH_MS;
  
  let step = 24 * 3600 * 1000;
  for (let iter = 0; iter < 4; iter++) {
    let bestTs = baseTs;
    let minAngle = Infinity;
    for (let offset = -5; offset <= 5; offset++) {
      const ts = baseTs + offset * step;
      const days = (ts - 946728000000) / 86400000;
      const earthPos = OrbitEngine.getHeliocentricPosition('earth', days);
      const moonRel = OrbitEngine.getLunarRelativePosition(days);
      const es = { x: -earthPos.x, y: -earthPos.y, z: -earthPos.z };
      const esLen = Math.sqrt(es.x * es.x + es.y * es.y + es.z * es.z);
      const emLen = Math.sqrt(moonRel.x * moonRel.x + moonRel.y * moonRel.y + moonRel.z * moonRel.z);
      const dot = es.x * moonRel.x + es.y * moonRel.y + es.z * moonRel.z;
      const cosAngle = dot / (esLen * emLen);
      const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
      if (angle < minAngle) {
        minAngle = angle;
        bestTs = ts;
      }
    }
    baseTs = bestTs;
    step /= 5;
  }
  return baseTs;
}

const now = Date.now();
const base1 = getCurrentCycleNewMoon(now);
const daysSinceJ2000 = (base1 - 946728000000) / 86400000;

// Earth and Moon relative pos at New Moon
const earthPosRaw = OrbitEngine.getHeliocentricPosition('earth', daysSinceJ2000);
const moonRelPosRaw = OrbitEngine.getLunarRelativePosition(daysSinceJ2000);

const earthPos = new THREE.Vector3(earthPosRaw.x * 22.0, earthPosRaw.z * 22.0, earthPosRaw.y * 22.0);
const moonRelPos = new THREE.Vector3(moonRelPosRaw.x * 22.0, moonRelPosRaw.z * 22.0, moonRelPosRaw.y * 22.0);

const earthToSun = new THREE.Vector3().subVectors(new THREE.Vector3(0,0,0), earthPos).normalize();
const earthToMoon = moonRelPos.clone().normalize();

console.log("At New Moon:");
console.log("Earth Pos:", earthPos);
console.log("Moon Rel Pos:", moonRelPos);
console.log("3D Angle between Earth->Sun and Earth->Moon:", earthToSun.angleTo(earthToMoon) * 180 / Math.PI);
