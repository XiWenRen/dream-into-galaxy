import { AstrophenomenaEngine, getExactMoonPhaseTime, getCurrentCycleNewMoon } from './src/engine/AstrophenomenaEngine.ts';
import { OrbitEngine } from './src/engine/OrbitEngine.ts';
import { TimeEngine } from './src/engine/TimeEngine.ts';
import { ScaleEngine } from './src/engine/ScaleEngine.ts';
import * as THREE from 'three';

const testPositions = () => {
  const now = Date.now();
  const base = getCurrentCycleNewMoon(now);
  const target = getExactMoonPhaseTime(base, 4); // Full Moon
  
  const daysSinceJ2000 = TimeEngine.getDaysSinceJ2000(target);
  
  // Real Moon
  const earthPosRaw = OrbitEngine.getHeliocentricPosition('earth', daysSinceJ2000);
  const moonRelPosRaw = OrbitEngine.getLunarRelativePosition(daysSinceJ2000);
  
  const toThreePos = (p: { x: number, y: number, z: number }, scale = 1.0) => {
    return new THREE.Vector3(p.x * scale, p.z * scale, p.y * scale);
  };
  
  const earthPos = toThreePos(earthPosRaw, 22.0);
  const moonRelPos = toThreePos(moonRelPosRaw, 22.0);
  
  // Ghost Mesh
  const ghostMoonRelPosRaw = OrbitEngine.getLunarRelativePosition(daysSinceJ2000);
  const ghostMoonRelPos = toThreePos(ghostMoonRelPosRaw, 22.0);
  
  console.log("Real Moon Rel:", moonRelPos);
  console.log("Ghost Moon Rel:", ghostMoonRelPos);
  console.log("Difference:", moonRelPos.distanceTo(ghostMoonRelPos));
}

testPositions();
