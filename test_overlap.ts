import { OrbitEngine } from './src/engine/OrbitEngine.ts';
import { getCurrentCycleNewMoon, getExactMoonPhaseTime } from './src/engine/AstrophenomenaEngine.ts';
import * as THREE from 'three';

const ORBIT_SCALE = 22.0;
const toThreePos = (p, scale = 1.0) => new THREE.Vector3(p.x * scale, p.z * scale, p.y * scale);

const now = Date.now();
const base1 = getCurrentCycleNewMoon(now);
const target = getExactMoonPhaseTime(base1, 4); // Full Moon
const daysSinceJ2000 = (target - 946728000000) / 86400000;

// Real Moon
const earthPosRaw = OrbitEngine.getHeliocentricPosition('earth', daysSinceJ2000);
const moonRelPosRaw = OrbitEngine.getLunarRelativePosition(daysSinceJ2000);
const earthPos = toThreePos(earthPosRaw, ORBIT_SCALE);
const moonRelPos = toThreePos(moonRelPosRaw, ORBIT_SCALE);

// Let's assume strictPhysics = true for simplicity
const realMoonPos = earthPos.clone().add(moonRelPos);

// Ghost Moon 4
const baseTime = getCurrentCycleNewMoon(target);
const phaseTime = getExactMoonPhaseTime(baseTime, 4);
const ghostDays = (phaseTime - 946728000000) / 86400000;
const ghostMoonRelPosRaw = OrbitEngine.getLunarRelativePosition(ghostDays);
const ghostMoonRelPos = toThreePos(ghostMoonRelPosRaw, 22.0);
const ghostMoonPos = earthPos.clone().add(ghostMoonRelPos);

console.log("Real Moon Pos:", realMoonPos);
console.log("Ghost Moon Pos:", ghostMoonPos);
console.log("Difference:", realMoonPos.distanceTo(ghostMoonPos));

// Ghost Moon 0 (New Moon)
const phaseTime0 = getExactMoonPhaseTime(baseTime, 0);
const ghostDays0 = (phaseTime0 - 946728000000) / 86400000;
const ghostMoonRelPosRaw0 = OrbitEngine.getLunarRelativePosition(ghostDays0);
const ghostMoonRelPos0 = toThreePos(ghostMoonRelPosRaw0, 22.0);
const ghostMoonPos0 = earthPos.clone().add(ghostMoonRelPos0);

console.log("\nEarth Pos:", earthPos);
console.log("Ghost Moon 0 (New Moon) Pos:", ghostMoonPos0);
const earthToSun = new THREE.Vector3().subVectors(new THREE.Vector3(0,0,0), earthPos).normalize();
const earthToGhost0 = new THREE.Vector3().subVectors(ghostMoonPos0, earthPos).normalize();
console.log("Angle between Earth->Sun and Earth->Ghost0 (should be 0):", earthToSun.angleTo(earthToGhost0) * 180 / Math.PI);
