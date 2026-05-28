import { getCurrentCycleNewMoon, getExactMoonPhaseTime } from './src/engine/AstrophenomenaEngine';
const now = Date.now();
const base1 = getCurrentCycleNewMoon(now);
console.log("base1:", new Date(base1).toISOString());
for (let i = 0; i < 8; i++) {
    const t = getExactMoonPhaseTime(base1, i);
    console.log(`Phase ${i} from base1:`, new Date(t).toISOString());
}
const target = getExactMoonPhaseTime(base1, 4);
const base2 = getCurrentCycleNewMoon(target);
console.log("\nbase2 (from target):", new Date(base2).toISOString());
for (let i = 0; i < 8; i++) {
    const t = getExactMoonPhaseTime(base2, i);
    console.log(`Phase ${i} from base2:`, new Date(t).toISOString());
}
