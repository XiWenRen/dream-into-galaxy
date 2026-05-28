// test.js
const SYNODIC_MONTH_MS = 29.53059 * 24 * 60 * 60 * 1000;
const PLANET_ORBITAL_DATA = {
  earth: { period: 365.256, L: 100.46435, longPeri: 102.94719, e: 0.016709, a: 1.00000011, I: 0.0, node: 0.0 },
};
function getHeliocentricPosition(id, days) {
    if (id !== 'earth') return {x:0, y:0, z:0};
    const elem = PLANET_ORBITAL_DATA.earth;
    const n = 360.0 / elem.period;
    let M = (elem.L - elem.longPeri + n * days) % 360;
    if (M < 0) M += 360;
    const mRad = (M * Math.PI) / 180.0;
    let E = mRad;
    const e = elem.e;
    for (let count = 0; count < 5; count++) {
      const deltaE = (E - e * Math.sin(E) - mRad) / (1.0 - e * Math.cos(E));
      E -= deltaE;
    }
    const a = elem.a;
    const xOrbit = a * (Math.cos(E) - e);
    const yOrbit = a * Math.sqrt(1.0 - e * e) * Math.sin(E);
    const iRad = (elem.I * Math.PI) / 180.0;
    const nodeRad = (elem.node * Math.PI) / 180.0;
    const omegaRad = ((elem.longPeri - elem.node) * Math.PI) / 180.0;
    const cosNode = Math.cos(nodeRad);
    const sinNode = Math.sin(nodeRad);
    const cosOmega = Math.cos(omegaRad);
    const sinOmega = Math.sin(omegaRad);
    const cosI = Math.cos(iRad);
    const sinI = Math.sin(iRad);
    const xEcliptic = xOrbit * (cosOmega * cosNode - sinOmega * sinNode * cosI) - yOrbit * (sinOmega * cosNode + cosOmega * sinNode * cosI);
    const yEcliptic = xOrbit * (cosOmega * sinNode + sinOmega * cosNode * cosI) - yOrbit * (sinOmega * sinNode - cosOmega * cosNode * cosI);
    const zEcliptic = xOrbit * (sinOmega * sinI) + yOrbit * (cosOmega * sinI);
    return { x: xEcliptic, y: yEcliptic, z: zEcliptic };
}
function getLunarRelativePosition(days) {
    const moonA = 0.00257;
    const e = 0.0549;
    const n = 13.176396;
    const M = ((135 + n * days) % 360) * Math.PI / 180.0;
    let E = M;
    for (let i = 0; i < 5; i++) {
      const delta = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      E -= delta;
    }
    const trueAnomaly = 2 * Math.atan2(
      Math.sqrt(1 + e) * Math.sin(E / 2),
      Math.sqrt(1 - e) * Math.cos(E / 2)
    );
    const r = moonA * (1 - e * Math.cos(E));
    const xOrbit = r * Math.cos(trueAnomaly);
    const yOrbit = r * Math.sin(trueAnomaly);
    const iRad = (5.145 * Math.PI) / 180.0;
    const periDeg = (318.15 + 0.1114 * days) % 360;
    const nodeDeg = (125.08 - 0.05295 * days) % 360;
    const omega = ((periDeg - nodeDeg) * Math.PI) / 180.0;
    const node = (nodeDeg * Math.PI) / 180.0;
    const cosOmega = Math.cos(omega);
    const sinOmega = Math.sin(omega);
    const cosNode = Math.cos(node);
    const sinNode = Math.sin(node);
    const cosI = Math.cos(iRad);
    const sinI = Math.sin(iRad);
    const x1 = cosOmega * xOrbit - sinOmega * yOrbit;
    const y1 = sinOmega * xOrbit + cosOmega * yOrbit;
    const x = cosNode * x1 - sinNode * y1 * cosI;
    const y = sinNode * x1 + cosNode * y1 * cosI;
    const z = y1 * sinI;
    return { x, y, z };
}

function getCurrentCycleNewMoon(referenceTimestamp) {
  const knownNewMoon = Date.UTC(2000, 0, 6, 11, 0, 0);
  const monthsSince = (referenceTimestamp - knownNewMoon) / SYNODIC_MONTH_MS;
  let baseTs = knownNewMoon + Math.floor(monthsSince) * SYNODIC_MONTH_MS;
  
  let step = 24 * 3600 * 1000;
  for (let iter = 0; iter < 4; iter++) {
    let bestTs = baseTs;
    let minAngle = Infinity;
    for (let offset = -5; offset <= 5; offset++) {
      const ts = baseTs + offset * step;
      const days = (ts - 946728000000) / 86400000;
      const earthPos = getHeliocentricPosition('earth', days);
      const moonRel = getLunarRelativePosition(days);
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

function getExactMoonPhaseTime(baseNewMoon, phaseIndex) {
  if (phaseIndex === 0) return baseNewMoon;
  const targetAngle = (phaseIndex / 8) * Math.PI * 2;
  
  let baseTs = baseNewMoon + (phaseIndex / 8) * SYNODIC_MONTH_MS;
  let step = 24 * 3600 * 1000;
  for (let iter = 0; iter < 4; iter++) {
    let bestTs = baseTs;
    let minDiff = Infinity;
    for (let offset = -5; offset <= 5; offset++) {
      const ts = baseTs + offset * step;
      const days = (ts - 946728000000) / 86400000;
      const earthPos = getHeliocentricPosition('earth', days);
      const moonRel = getLunarRelativePosition(days);
      const es = { x: -earthPos.x, y: -earthPos.y, z: -earthPos.z };
      
      const angle = Math.atan2(
        es.x * moonRel.y - es.y * moonRel.x,
        es.x * moonRel.x + es.y * moonRel.y
      );
      let currentPhase = angle;
      if (currentPhase < 0) currentPhase += Math.PI * 2;
      
      let diff = Math.abs(currentPhase - targetAngle);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      
      if (diff < minDiff) {
        minDiff = diff;
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
const target = getExactMoonPhaseTime(base1, 4); // Full Moon
const base2 = getCurrentCycleNewMoon(target);
const phase4_2 = getExactMoonPhaseTime(base2, 4);

console.log("base1:", new Date(base1).toISOString());
console.log("target (Full Moon):", new Date(target).toISOString());
console.log("base2 (New Moon from target):", new Date(base2).toISOString());
console.log("Ghost Moon 4 time:", new Date(phase4_2).toISOString());
console.log("Diff (hours):", (phase4_2 - target)/3600000);
