/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SatelliteDef {
  nameZh: string;
  nameEn: string;
  distance: number;
  radiusRatio: number;
  color: number;
  speed: number;
  realDistance?: number;
  realRadiusRatio?: number;
}

export const SATELLITE_DATA: Record<string, SatelliteDef[]> = {
  mercury: [],
  venus: [],
  earth: [],
  mars: [
    { nameZh: "火卫一 Phobos", nameEn: "Phobos", distance: 1.5, radiusRatio: 0.15, color: 0x90a4ae, speed: 1.9, realDistance: 2.766, realRadiusRatio: 0.0033 },
    { nameZh: "火卫二 Deimos", nameEn: "Deimos", distance: 2.4, radiusRatio: 0.11, color: 0xb0bec5, speed: 1.1, realDistance: 6.921, realRadiusRatio: 0.0018 }
  ],
  jupiter: [
    { nameZh: "木卫一 Io", nameEn: "Io", distance: 1.4, radiusRatio: 0.14, color: 0xffeb3b, speed: 2.3, realDistance: 6.031, realRadiusRatio: 0.026 },
    { nameZh: "木卫二 Europa", nameEn: "Europa", distance: 1.9, radiusRatio: 0.12, color: 0x80deea, speed: 1.6, realDistance: 9.596, realRadiusRatio: 0.0223 },
    { nameZh: "木卫三 Ganymede", nameEn: "Ganymede", distance: 2.5, radiusRatio: 0.15, color: 0xcfd8dc, speed: 1.1, realDistance: 15.311, realRadiusRatio: 0.0377 },
    { nameZh: "木卫四 Callisto", nameEn: "Callisto", distance: 3.2, radiusRatio: 0.13, color: 0x78909c, speed: 0.7, realDistance: 26.93, realRadiusRatio: 0.0345 }
  ],
  saturn: [
    { nameZh: "土卫六 Titan", nameEn: "Titan", distance: 3.2, radiusRatio: 0.17, color: 0xffb74d, speed: 1.0, realDistance: 20.982, realRadiusRatio: 0.0442 },
    { nameZh: "土卫五 Rhea", nameEn: "Rhea", distance: 2.6, radiusRatio: 0.11, color: 0xb0bebe, speed: 1.4, realDistance: 9.052, realRadiusRatio: 0.0131 },
    { nameZh: "土卫二 Enceladus", nameEn: "Enceladus", distance: 1.3, radiusRatio: 0.08, color: 0xe0f2f1, speed: 2.2, realDistance: 4.086, realRadiusRatio: 0.0043 }
  ],
  uranus: [
    { nameZh: "天卫三 Titania", nameEn: "Titania", distance: 2.3, radiusRatio: 0.14, color: 0xe1bee7, speed: 1.2, realDistance: 17.187, realRadiusRatio: 0.0311 },
    { nameZh: "天卫四 Oberon", nameEn: "Oberon", distance: 3.0, radiusRatio: 0.13, color: 0xd1c4e9, speed: 0.8, realDistance: 23.007, realRadiusRatio: 0.030 },
    { nameZh: "天卫一 Ariel", nameEn: "Ariel", distance: 1.7, radiusRatio: 0.10, color: 0xe0f2f1, speed: 1.8, realDistance: 7.532, realRadiusRatio: 0.0228 }
  ],
  neptune: [
    { nameZh: "海卫一 Triton", nameEn: "Triton", distance: 2.1, radiusRatio: 0.15, color: 0xb2dfdb, speed: -1.3, realDistance: 14.408, realRadiusRatio: 0.055 },
    { nameZh: "海卫八 Proteus", nameEn: "Proteus", distance: 1.5, radiusRatio: 0.09, color: 0xb0bec5, speed: 1.9, realDistance: 4.778, realRadiusRatio: 0.0085 }
  ]
};

export interface ValidationConfig {
  key: string;
  sourceId: string;
  targetId: string;
  nameZh: string;
  nameEn: string;
  countFormulaTextZh: string;
  countFormulaTextEn: string;
  baseBodyNameZh: string;
  baseBodyNameEn: string;
}

export const VALIDATION_PAIRS: ValidationConfig[] = [
  {
    key: 'sun-earth',
    sourceId: 'sun',
    targetId: 'earth',
    nameZh: '日地检验 (108个太阳)',
    nameEn: 'Sun-Earth (108 Suns)',
    countFormulaTextZh: '149,597,870 km / 1,392,680 km = 107.41 个',
    countFormulaTextEn: '149,597,870 km / 1,392,680 km = 107.41 Suns',
    baseBodyNameZh: '太阳',
    baseBodyNameEn: 'Suns'
  },
  {
    key: 'earth-moon',
    sourceId: 'earth',
    targetId: 'moon',
    nameZh: '地月检验 (30个地球)',
    nameEn: 'Earth-Moon (30 Earths)',
    countFormulaTextZh: '384,400 km / 12,742 km = 30.17 个',
    countFormulaTextEn: '384,400 km / 12,742 km = 30.17 Earths',
    baseBodyNameZh: '地球',
    baseBodyNameEn: 'Earths'
  },
  {
    key: 'mars-phobos',
    sourceId: 'mars',
    targetId: 'phobos',
    nameZh: '火星-火卫一检验 (1.38个火星)',
    nameEn: 'Mars-Phobos (1.38 Mars)',
    countFormulaTextZh: '9,377 km / 6,779 km = 1.38 个',
    countFormulaTextEn: '9,377 km / 6,779 km = 1.38 Mars',
    baseBodyNameZh: '火星',
    baseBodyNameEn: 'Mars'
  },
  {
    key: 'jupiter-io',
    sourceId: 'jupiter',
    targetId: 'io',
    nameZh: '木星-木卫一检验 (3.01个木星)',
    nameEn: 'Jupiter-Io (3.01 Jupiters)',
    countFormulaTextZh: '421,700 km / 139,822 km = 3.01 个',
    countFormulaTextEn: '421,700 km / 139,822 km = 3.01 Jupiters',
    baseBodyNameZh: '木星',
    baseBodyNameEn: 'Jupiters'
  },
  {
    key: 'jupiter-europa',
    sourceId: 'jupiter',
    targetId: 'europa',
    nameZh: '木星-木卫二检验 (4.80个木星)',
    nameEn: 'Jupiter-Europa (4.80 Jupiters)',
    countFormulaTextZh: '670,900 km / 139,822 km = 4.80 个',
    countFormulaTextEn: '670,900 km / 139,822 km = 4.80 Jupiters',
    baseBodyNameZh: '木星',
    baseBodyNameEn: 'Jupiters'
  },
  {
    key: 'jupiter-ganymede',
    sourceId: 'jupiter',
    targetId: 'ganymede',
    nameZh: '木星-木卫三检验 (7.66个木星)',
    nameEn: 'Jupiter-Ganymede (7.66 Jupiters)',
    countFormulaTextZh: '1,070,400 km / 139,822 km = 7.66 个',
    countFormulaTextEn: '1,070,400 km / 139,822 km = 7.66 Jupiters',
    baseBodyNameZh: '木星',
    baseBodyNameEn: 'Jupiters'
  },
  {
    key: 'saturn-titan',
    sourceId: 'saturn',
    targetId: 'titan',
    nameZh: '土星-土卫六检验 (10.49个土星)',
    nameEn: 'Saturn-Titan (10.49 Saturns)',
    countFormulaTextZh: '1,221,870 km / 116,464 km = 10.49 个',
    countFormulaTextEn: '1,221,870 km / 116,464 km = 10.49 Saturns',
    baseBodyNameZh: '土星',
    baseBodyNameEn: 'Saturns'
  },
  {
    key: 'saturn-rhea',
    sourceId: 'saturn',
    targetId: 'rhea',
    nameZh: '土星-土卫五检验 (4.53个土星)',
    nameEn: 'Saturn-Rhea (4.53 Saturns)',
    countFormulaTextZh: '527,108 km / 116,464 km = 4.53 个',
    countFormulaTextEn: '527,108 km / 116,464 km = 4.53 Saturns',
    baseBodyNameZh: '土星',
    baseBodyNameEn: 'Saturns'
  },
  {
    key: 'uranus-titania',
    sourceId: 'uranus',
    targetId: 'titania',
    nameZh: '天王星-天卫三检验 (8.59个天王星)',
    nameEn: 'Uranus-Titania (8.59 Uranus)',
    countFormulaTextZh: '435,910 km / 50,724 km = 8.59 个',
    countFormulaTextEn: '435,910 km / 50,724 km = 8.59 Uranus',
    baseBodyNameZh: '天王星',
    baseBodyNameEn: 'Uranus'
  },
  {
    key: 'neptune-triton',
    sourceId: 'neptune',
    targetId: 'triton',
    nameZh: '海王星-海卫一检验 (7.20个海王星)',
    nameEn: 'Neptune-Triton (7.20 Neptunes)',
    countFormulaTextZh: '354,760 km / 49,244 km = 7.20 个',
    countFormulaTextEn: '354,760 km / 49,244 km = 7.20 Neptunes',
    baseBodyNameZh: '海王星',
    baseBodyNameEn: 'Neptunes'
  }
];

export const CROSS_PALETTE: Record<string, { core: number; mantle: number; crust: number; atm: number; rCore: number; rMantle: number }> = {
  sun:     { core: 0xffffff, mantle: 0xffaa00, crust: 0xdd8800, atm: 0xff8800, rCore: 0.25, rMantle: 0.70 },
  mercury: { core: 0x999999, mantle: 0x776655, crust: 0x887766, atm: 0xaaaaaa, rCore: 0.828, rMantle: 0.94 },
  venus:   { core: 0xddddcc, mantle: 0xbb9955, crust: 0xaa8844, atm: 0xffcc44, rCore: 0.528, rMantle: 0.94 },
  earth:   { core: 0xffd700, mantle: 0xc2381a, crust: 0x5c3a21, atm: 0x8ab6ff, rCore: 0.546, rMantle: 0.94 },
  moon:    { core: 0x777777, mantle: 0x554433, crust: 0x665544, atm: 0x999999, rCore: 0.19, rMantle: 0.92 },
  mars:    { core: 0x882211, mantle: 0xcc5522, crust: 0xaa5522, atm: 0xffaa88, rCore: 0.54, rMantle: 0.94 },
  jupiter: { core: 0xddddcc, mantle: 0xc4956a, crust: 0xb08050, atm: 0xd4a574, rCore: 0.20, rMantle: 0.84 },
  saturn:  { core: 0xddddcc, mantle: 0xc4a574, crust: 0xb09060, atm: 0xe0c090, rCore: 0.25, rMantle: 0.68 },
  uranus:  { core: 0xccddcc, mantle: 0x88bbcc, crust: 0x77aabb, atm: 0x66aacc, rCore: 0.20, rMantle: 0.78 },
  neptune: { core: 0xccccdd, mantle: 0x4466bb, crust: 0x335599, atm: 0x3366aa, rCore: 0.28, rMantle: 0.77 },
};
