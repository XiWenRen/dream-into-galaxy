const fs = require('fs');

const raw = fs.readFileSync('tmp/hipparcos_6.5.js', 'utf-8');
let hipparcos_catalog;
eval(raw);

const stars = [];
for (const row of hipparcos_catalog) {
  const raDeg = row[4];
  const deDeg = row[5];
  const vmag = row[2];
  const bv = row[13];
  const plx = row[7]; // parallax in milliarcseconds
  
  if (typeof raDeg !== 'number' || typeof deDeg !== 'number' || typeof vmag !== 'number') {
    continue;
  }
  
  const ra = raDeg / 15.0;
  const dec = deDeg;
  const mag = vmag;
  const bvIndex = (typeof bv === 'number' && !isNaN(bv)) ? bv : null;
  
  // Calculate distance from parallax (mas) → parsecs → light-years
  let distLy = null;
  if (typeof plx === 'number' && plx > 0.1) {
    const distPc = 1000.0 / plx;
    distLy = distPc * 3.26156; // 1 parsec = 3.26156 ly
  }
  
  stars.push({ ra, dec, mag, bv: bvIndex, dist: distLy });
}

console.log(`Extracted ${stars.length} stars`);

// Sort by magnitude (brightest first)
stars.sort((a, b) => a.mag - b.mag);

// Count stats
const withDist = stars.filter(s => s.dist !== null).length;
const withoutDist = stars.filter(s => s.dist === null).length;
const dists = stars.filter(s => s.dist !== null).map(s => s.dist);
console.log(`With distance: ${withDist}, Without: ${withoutDist}`);
console.log(`Distance range: ${Math.min(...dists).toFixed(1)} - ${Math.max(...dists).toFixed(1)} ly`);
console.log(`Median distance: ${dists.sort((a,b)=>a-b)[Math.floor(dists.length/2)].toFixed(1)} ly`);

// Verify Sirius
const sirius = stars.find(s => Math.abs(s.ra - 6.75) < 0.1 && Math.abs(s.dec - (-16.7)) < 1);
if (sirius) {
  console.log(`Sirius: mag=${sirius.mag}, dist=${sirius.dist?.toFixed(1)} ly`);
}

// Compact format: [ra, dec, mag, bv, dist_ly]
// dist = null → omit (most stars will have it)
const compact = stars.map(s => {
  const row = [
    Math.round(s.ra * 10000) / 10000,
    Math.round(s.dec * 1000) / 1000,
    Math.round(s.mag * 100) / 100,
    s.bv !== null ? Math.round(s.bv * 1000) / 1000 : null,
  ];
  if (s.dist !== null) {
    row.push(Math.round(s.dist * 10) / 10);
  }
  return row;
});

const json = JSON.stringify(compact);
fs.writeFileSync('public/data/hipparcos_65.json', json);
console.log(`JSON size: ${json.length} bytes (${(json.length/1024).toFixed(1)} KB)`);
