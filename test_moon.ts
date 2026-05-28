import { AstrophenomenaEngine, getExactMoonPhaseTime, getCurrentCycleNewMoon } from './src/engine/AstrophenomenaEngine.ts';
import { OrbitEngine } from './src/engine/OrbitEngine.ts';
import { TimeEngine } from './src/engine/TimeEngine.ts';

const now = Date.now();
const base = getCurrentCycleNewMoon(now);
const fullMoon = getExactMoonPhaseTime(base, 4);
const lastQuarter = getExactMoonPhaseTime(base, 6);

console.log('Base:', new Date(base));
console.log('Full Moon:', new Date(fullMoon));
console.log('Last Quarter:', new Date(lastQuarter));

const daysFM = TimeEngine.getDaysSinceJ2000(fullMoon);
const moonRelFM = OrbitEngine.getLunarRelativePosition(daysFM);
const earthPosFM = OrbitEngine.getHeliocentricPosition('earth', daysFM);

const esFM = { x: -earthPosFM.x, y: -earthPosFM.y, z: -earthPosFM.z };
const angleFM = Math.atan2(
  esFM.x * moonRelFM.y - esFM.y * moonRelFM.x,
  esFM.x * moonRelFM.x + esFM.y * moonRelFM.y
);
console.log('FM Angle:', angleFM, 'Target:', Math.PI);

const daysLQ = TimeEngine.getDaysSinceJ2000(lastQuarter);
const moonRelLQ = OrbitEngine.getLunarRelativePosition(daysLQ);
const earthPosLQ = OrbitEngine.getHeliocentricPosition('earth', daysLQ);

const esLQ = { x: -earthPosLQ.x, y: -earthPosLQ.y, z: -earthPosLQ.z };
let angleLQ = Math.atan2(
  esLQ.x * moonRelLQ.y - esLQ.y * moonRelLQ.x,
  esLQ.x * moonRelLQ.x + esLQ.y * moonRelLQ.y
);
if (angleLQ < 0) angleLQ += Math.PI * 2;
console.log('LQ Angle:', angleLQ, 'Target:', 3 * Math.PI / 2);
