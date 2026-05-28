import { getCurrentCycleNewMoon, getExactMoonPhaseTime } from './src/engine/AstrophenomenaEngine.ts';

const now = Date.now();
const base1 = getCurrentCycleNewMoon(now);
const target = getExactMoonPhaseTime(base1, 4); // Full Moon
const base2 = getCurrentCycleNewMoon(target);

console.log("base1:", new Date(base1).toISOString());
console.log("target (Full Moon):", new Date(target).toISOString());
console.log("base2 (New Moon from target):", new Date(base2).toISOString());
console.log("diff base2 - base1 (hours):", (base2 - base1) / 3600000);

const targetQuarter = getExactMoonPhaseTime(base1, 2);
const base3 = getCurrentCycleNewMoon(targetQuarter);
console.log("base3 (New Moon from Quarter):", new Date(base3).toISOString());
console.log("diff base3 - base1 (hours):", (base3 - base1) / 3600000);
