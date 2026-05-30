/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Jean Meeus - Astronomical Algorithms (2nd Edition) - Chapter 47
 * Periodic terms for Moon's Longitude, Distance (Table 47.A) and Latitude (Table 47.B).
 * Truncated version of ELP-2000/82 theory.
 */

export interface LunarTermA {
  d: number;
  m: number;
  m_: number;
  f: number;
  sl: number; // Coefficient for Longitude (millionths of a degree)
  sr: number; // Coefficient for Distance (meters)
}

export interface LunarTermB {
  d: number;
  m: number;
  m_: number;
  f: number;
  sb: number; // Coefficient for Latitude (millionths of a degree)
}

// Table 47.A: Longitude and Distance periodic terms (60 terms)
export const LUNAR_TA: LunarTermA[] = [
  { d: 0, m: 0, m_: 1, f: 0, sl: 6288774, sr: -20905355 },
  { d: 2, m: 0, m_: -1, f: 0, sl: 1274027, sr: -3699111 },
  { d: 2, m: 0, m_: 0, f: 0, sl: 658314, sr: -2955968 },
  { d: 0, m: 0, m_: 2, f: 0, sl: 213618, sr: -569925 },
  { d: 0, m: 1, m_: 0, f: 0, sl: -185116, sr: 48888 },
  { d: 0, m: 0, m_: 0, f: 2, sl: -114332, sr: -3149 },
  { d: 2, m: 0, m_: -2, f: 0, sl: 58793, sr: 246158 },
  { d: 2, m: -1, m_: -1, f: 0, sl: 57066, sr: -152138 },
  { d: 2, m: 0, m_: 1, f: 0, sl: 53322, sr: -170733 },
  { d: 2, m: -1, m_: 0, f: 0, sl: 45758, sr: -204586 },
  { d: 0, m: 1, m_: -1, f: 0, sl: -40923, sr: -129620 },
  { d: 1, m: 0, m_: 0, f: 0, sl: -34720, sr: 108743 },
  { d: 0, m: 1, m_: 1, f: 0, sl: -30383, sr: 104755 },
  { d: 2, m: 0, m_: 0, f: -2, sl: 15327, sr: 10321 },
  { d: 0, m: 0, m_: 1, f: 2, sl: -12528, sr: 0 },
  { d: 0, m: 0, m_: 1, f: -2, sl: 10980, sr: 79661 },
  { d: 4, m: 0, m_: -1, f: 0, sl: 10675, sr: -34782 },
  { d: 0, m: 0, m_: 3, f: 0, sl: 10034, sr: -23210 },
  { d: 4, m: 0, m_: -2, f: 0, sl: 8548, sr: -21636 },
  { d: 2, m: 1, m_: -1, f: 0, sl: -7888, sr: 24208 },
  { d: 2, m: 1, m_: 0, f: 0, sl: -6766, sr: 30824 },
  { d: 1, m: 0, m_: -1, f: 0, sl: -5163, sr: -8379 },
  { d: 1, m: 1, m_: 0, f: 0, sl: 4987, sr: -16675 },
  { d: 2, m: -1, m_: 1, f: 0, sl: 4036, sr: -12831 },
  { d: 2, m: 0, m_: 2, f: 0, sl: 3994, sr: -10445 },
  { d: 4, m: 0, m_: 0, f: 0, sl: 3861, sr: -11650 },
  { d: 2, m: 0, m_: -3, f: 0, sl: 3665, sr: 14403 },
  { d: 0, m: 1, m_: -2, f: 0, sl: -2689, sr: -7003 },
  { d: 2, m: 0, m_: -1, f: 2, sl: -2602, sr: 0 },
  { d: 2, m: -1, m_: -2, f: 0, sl: 2390, sr: 10056 },
  { d: 1, m: 0, m_: 1, f: 0, sl: -2348, sr: 6322 },
  { d: 2, m: -2, m_: 0, f: 0, sl: 2236, sr: -9884 },
  { d: 0, m: 1, m_: 2, f: 0, sl: -2120, sr: 5751 },
  { d: 0, m: 2, m_: 0, f: 0, sl: -2069, sr: 0 },
  { d: 2, m: -2, m_: -1, f: 0, sl: 2048, sr: -4950 },
  { d: 2, m: 0, m_: 1, f: -2, sl: -1773, sr: 4130 },
  { d: 2, m: 0, m_: 0, f: 2, sl: -1595, sr: 0 },
  { d: 4, m: -1, m_: -1, f: 0, sl: 1215, sr: -3958 },
  { d: 0, m: 0, m_: 2, f: 2, sl: -1110, sr: 0 },
  { d: 3, m: 0, m_: -1, f: 0, sl: -892, sr: 3258 },
  { d: 2, m: 1, m_: 1, f: 0, sl: -810, sr: 2616 },
  { d: 4, m: -1, m_: -2, f: 0, sl: 759, sr: -1897 },
  { d: 0, m: 2, m_: -1, f: 0, sl: -713, sr: -2117 },
  { d: 2, m: 2, m_: -1, f: 0, sl: -700, sr: 2354 },
  { d: 2, m: 1, m_: -2, f: 0, sl: 691, sr: 0 },
  { d: 2, m: -1, m_: 0, f: -2, sl: 596, sr: 0 },
  { d: 4, m: 0, m_: 1, f: 0, sl: 549, sr: -1423 },
  { d: 0, m: 0, m_: 4, f: 0, sl: 537, sr: -1117 },
  { d: 4, m: -1, m_: 0, f: 0, sl: 520, sr: -1571 },
  { d: 1, m: 0, m_: -2, f: 0, sl: -487, sr: -1739 },
  { d: 2, m: 1, m_: 0, f: -2, sl: -399, sr: 0 },
  { d: 0, m: 0, m_: 2, f: -2, sl: -381, sr: -4421 },
  { d: 1, m: 1, m_: 1, f: 0, sl: 351, sr: 0 },
  { d: 3, m: 0, m_: -2, f: 0, sl: -340, sr: 0 },
  { d: 4, m: 0, m_: -3, f: 0, sl: 330, sr: 0 },
  { d: 2, m: -1, m_: 2, f: 0, sl: 327, sr: 0 },
  { d: 0, m: 2, m_: 1, f: 0, sl: -323, sr: 1165 },
  { d: 1, m: 1, m_: -1, f: 0, sl: 299, sr: 0 },
  { d: 2, m: 0, m_: 3, f: 0, sl: 294, sr: 0 },
  { d: 2, m: 0, m_: -1, f: -2, sl: 0, sr: 8752 }
];

// Table 47.B: Latitude periodic terms (60 terms)
export const LUNAR_TB: LunarTermB[] = [
  { d: 0, m: 0, m_: 0, f: 1, sb: 5128122 },
  { d: 0, m: 0, m_: 1, f: 1, sb: 280602 },
  { d: 0, m: 0, m_: 1, f: -1, sb: 277693 },
  { d: 2, m: 0, m_: 0, f: -1, sb: 173237 },
  { d: 2, m: 0, m_: -1, f: 1, sb: 55413 },
  { d: 2, m: 0, m_: -1, f: -1, sb: 46271 },
  { d: 2, m: 0, m_: 0, f: 1, sb: 32573 },
  { d: 0, m: 0, m_: 2, f: 1, sb: 17198 },
  { d: 2, m: 0, m_: 1, f: -1, sb: 9266 },
  { d: 0, m: 0, m_: 2, f: -1, sb: 8822 },
  { d: 2, m: -1, m_: 0, f: -1, sb: 8216 },
  { d: 2, m: 0, m_: -2, f: -1, sb: 4324 },
  { d: 2, m: 0, m_: 1, f: 1, sb: 4200 },
  { d: 2, m: 1, m_: 0, f: -1, sb: -3359 },
  { d: 2, m: -1, m_: -1, f: 1, sb: 2463 },
  { d: 2, m: -1, m_: 0, f: 1, sb: 2211 },
  { d: 2, m: -1, m_: -1, f: -1, sb: 2065 },
  { d: 0, m: 1, m_: -1, f: -1, sb: -1870 },
  { d: 4, m: 0, m_: -1, f: -1, sb: 1828 },
  { d: 0, m: 1, m_: 0, f: 1, sb: -1794 },
  { d: 0, m: 0, m_: 0, f: 3, sb: -1749 },
  { d: 0, m: 1, m_: -1, f: 1, sb: -1565 },
  { d: 1, m: 0, m_: 0, f: 1, sb: -1491 },
  { d: 0, m: 1, m_: 1, f: 1, sb: -1475 },
  { d: 0, m: 1, m_: 1, f: -1, sb: -1410 },
  { d: 0, m: 1, m_: 0, f: -1, sb: -1344 },
  { d: 1, m: 0, m_: 0, f: -1, sb: -1335 },
  { d: 0, m: 0, m_: 3, f: 1, sb: 1107 },
  { d: 4, m: 0, m_: 0, f: -1, sb: 1021 },
  { d: 4, m: 0, m_: -1, f: 1, sb: 833 },
  { d: 0, m: 0, m_: 1, f: -3, sb: 777 },
  { d: 4, m: 0, m_: -2, f: 1, sb: 671 },
  { d: 2, m: 0, m_: 0, f: -3, sb: 607 },
  { d: 2, m: 0, m_: 2, f: -1, sb: 596 },
  { d: 2, m: -1, m_: 1, f: -1, sb: 491 },
  { d: 2, m: 0, m_: -2, f: 1, sb: -451 },
  { d: 0, m: 0, m_: 3, f: -1, sb: 439 },
  { d: 2, m: 0, m_: 2, f: 1, sb: 422 },
  { d: 2, m: 0, m_: -3, f: -1, sb: 421 },
  { d: 2, m: 1, m_: -1, f: 1, sb: -366 },
  { d: 2, m: 1, m_: 0, f: 1, sb: -351 },
  { d: 4, m: 0, m_: 0, f: 1, sb: 331 },
  { d: 2, m: -1, m_: 1, f: 1, sb: 315 },
  { d: 2, m: -2, m_: 0, f: -1, sb: 302 },
  { d: 0, m: 0, m_: 1, f: 3, sb: -283 },
  { d: 2, m: 1, m_: 1, f: -1, sb: -229 },
  { d: 1, m: 1, m_: 0, f: -1, sb: 223 },
  { d: 1, m: 1, m_: 0, f: 1, sb: 223 },
  { d: 0, m: 1, m_: -2, f: -1, sb: -220 },
  { d: 2, m: 1, m_: -1, f: -1, sb: -220 },
  { d: 1, m: 0, m_: 1, f: 1, sb: -185 },
  { d: 2, m: -1, m_: -2, f: -1, sb: 181 },
  { d: 0, m: 1, m_: 2, f: 1, sb: -177 },
  { d: 4, m: 0, m_: -2, f: -1, sb: 176 },
  { d: 4, m: -1, m_: -1, f: -1, sb: 166 },
  { d: 1, m: 0, m_: 1, f: -1, sb: -164 },
  { d: 4, m: 0, m_: 1, f: -1, sb: 132 },
  { d: 1, m: 0, m_: -1, f: -1, sb: -119 },
  { d: 4, m: -1, m_: 0, f: -1, sb: 115 },
  { d: 2, m: -2, m_: 0, f: 1, sb: 107 }
];
