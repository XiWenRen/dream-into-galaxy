import { AstrophenomenaEngine, getExactMoonPhaseTime, getCurrentCycleNewMoon } from './src/engine/AstrophenomenaEngine.ts';

const testJump = () => {
  const now = Date.now();
  console.log("Initial Time:", new Date(now));
  
  const base1 = getCurrentCycleNewMoon(now);
  const target1 = getExactMoonPhaseTime(base1, 4); // Full Moon
  console.log("Jump to Full Moon:", new Date(target1));
  
  // Now simulate what happens next frame
  const base2 = getCurrentCycleNewMoon(target1);
  const target2 = getExactMoonPhaseTime(base2, 4);
  console.log("Recalculated Full Moon:", new Date(target2));
  
  const base3 = getCurrentCycleNewMoon(target1 + 1000); // 1 second later
  const target3 = getExactMoonPhaseTime(base3, 4);
  console.log("Recalculated after 1 sec:", new Date(target3));

  const base4 = getCurrentCycleNewMoon(getExactMoonPhaseTime(base1, 0)); // New Moon
  console.log("Recalculated base from New Moon:", new Date(base4));
}

testJump();
