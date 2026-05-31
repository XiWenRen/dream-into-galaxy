const J2000_TIMESTAMP = 946728000000;
const PLANET_ORBITAL_DATA = {
  earth: { id: "earth", a: 1.0000, e: 0.0167, I: 0.000, L: 100.464, longPeri: 102.937, node: 0.0, period: 365.256 },
};

function getHeliocentricPosition(days) {
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

const targetLongitude = 330; // 雨水
const year = 2026;

function longitudeDiff(a, b) {
  let diff = (a - b) % 360;
  if (diff < -180) diff += 360;
  if (diff > 180) diff -= 360;
  return diff;
}

function getSolarLongitude(days) {
  const earthPos = getHeliocentricPosition(days);
  const sunX = -earthPos.x;
  const sunY = -earthPos.y;
  let lambdaRad = Math.atan2(sunY, sunX);
  let lambdaDeg = (lambdaRad * 180.0) / Math.PI;
  lambdaDeg = lambdaDeg % 360;
  if (lambdaDeg < 0) lambdaDeg += 360;
  return lambdaDeg;
}

let left = (new Date(Date.UTC(year, 0, 1)).getTime() - J2000_TIMESTAMP) / 86400000;
let right = (new Date(Date.UTC(year, 11, 31, 23, 59, 59)).getTime() - J2000_TIMESTAMP) / 86400000;

for (let i = 0; i < 50; i++) {
  const mid = (left + right) / 2;
  const lon = getSolarLongitude(mid);
  const diff = longitudeDiff(lon, targetLongitude);
  if (diff > 0) {
    right = mid;
  } else {
    left = mid;
  }
  if (Math.abs(diff) < 1e-6 || right - left < 1e-7) break;
}
const days = (left + right) / 2;
const date = new Date(J2000_TIMESTAMP + days * 86400000);

const earthPos = getHeliocentricPosition(days);
const ORBIT_SCALE = 22.0;
const toThreePos = (p) => {
  return { x: p.x * ORBIT_SCALE, y: p.z * ORBIT_SCALE, z: p.y * ORBIT_SCALE };
};
const threeEarth = toThreePos(earthPos);

const EARTH_ORBIT_RADIUS = 22.0;
const e = 0.0167;
const longPeriRad = (102.937 * Math.PI) / 180;
const lonRad = ((targetLongitude + 180) * Math.PI) / 180;
const theta = lonRad - longPeriRad;
const r = (EARTH_ORBIT_RADIUS * (1 - e * e)) / (1 + e * Math.cos(theta));
const ghostPos = {
  x: r * Math.cos(lonRad),
  y: 0,
  z: r * Math.sin(lonRad)
};

console.log(`Date: ${date.toUTCString()}`);
console.log(`Days since J2000: ${days}`);
console.log(`Solar Longitude: ${getSolarLongitude(days)}`);
console.log(`Earth Heliocentric Position:`, earthPos);
console.log(`Earth Three.js Position:`, threeEarth);
console.log(`Ghost Three.js Position:`, ghostPos);
