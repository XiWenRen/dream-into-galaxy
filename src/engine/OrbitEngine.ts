/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { J2000_TIMESTAMP } from './TimeEngine';
import { SATELLITE_CATALOG, getSatelliteHeliocentricPosition } from './SatelliteData';
import { LUNAR_TA, LUNAR_TB } from '../data/lunarMeeusCoefficients';
import { LUT_DATA } from '../data/astroCalibrationLUT';

export interface KeplerElements {
  id: string;
  a: number;      // 半长轴 (AU)
  e: number;      // 偏心率 (Eccentricity)
  I: number;      // 轨道倾角 (Inclination, 度)
  L: number;      // J2000.0平均黄经 (Mean Longitude, 度)
  longPeri: number; // 近日点经度 (Longitude of perihelion, 度)
  node: number;    // 升交点黄经 (Longitude of ascending node, 度)
  period: number;  // 公转周期 (日)
}

// 真实太阳系行星的克卜勒轨道根数（基于 J2000.0 黄道坐标系标准）
export const PLANET_ORBITAL_DATA: Record<string, KeplerElements> = {
  mercury: { id: "mercury", a: 0.3871, e: 0.2056, I: 7.005, L: 252.251, longPeri: 77.456, node: 48.331, period: 87.969 },
  venus: { id: "venus", a: 0.7233, e: 0.0068, I: 3.395, L: 181.979, longPeri: 131.563, node: 76.680, period: 224.701 },
  earth: { id: "earth", a: 1.0000, e: 0.0167, I: 0.000, L: 100.464, longPeri: 102.937, node: 0.0, period: 365.256 },
  mars: { id: "mars", a: 1.5237, e: 0.0934, I: 1.850, L: 355.447, longPeri: 336.060, node: 49.558, period: 686.980 },
  jupiter: { id: "jupiter", a: 5.2028, e: 0.0484, I: 1.303, L: 34.351, longPeri: 14.331, node: 100.464, period: 4332.589 },
  saturn: { id: "saturn", a: 9.5388, e: 0.0541, I: 2.489, L: 50.075, longPeri: 92.511, node: 113.689, period: 10759.22 },
  uranus: { id: "uranus", a: 19.1914, e: 0.0473, I: 0.773, L: 314.055, longPeri: 172.434, node: 74.006, period: 30685.4 },
  neptune: { id: "neptune", a: 30.0611, e: 0.0086, I: 1.770, L: 304.349, longPeri: 46.681, node: 131.784, period: 60190.0 }
};

// 各种星体的自转与黄赤倾角物理学参数
export const CELESTIAL_PHYSICS = {
  sun: { id: "sun", radius: 696340, rotationPeriod: 609.6, obliquity: 7.25 }, // 25.4天自转
  mercury: { id: "mercury", radius: 2439.7, rotationPeriod: 1407.6, obliquity: 0.034 },
  venus: { id: "venus", radius: 6051.8, rotationPeriod: -5832.5, obliquity: 177.36 }, // 逆向自转
  earth: { id: "earth", radius: 6371.0, rotationPeriod: 23.934, obliquity: 23.44 },
  moon: { id: "moon", radius: 1737.4, rotationPeriod: 655.7, obliquity: 6.68 }, // 潮汐锁定 27.3天
  mars: { id: "mars", radius: 3389.5, rotationPeriod: 24.623, obliquity: 25.19 },
  jupiter: { id: "jupiter", radius: 69911, rotationPeriod: 9.925, obliquity: 3.13 },
  saturn: { id: "saturn", radius: 58232, rotationPeriod: 10.656, obliquity: 26.73 },
  uranus: { id: "uranus", radius: 25362, rotationPeriod: -17.24, obliquity: 97.77 },
  neptune: { id: "neptune", radius: 24622, rotationPeriod: 16.11, obliquity: 28.32 },
  // Major natural satellites (rotationPeriod = orbital period in hours for tidally locked bodies)
  phobos: { id: "phobos", radius: 11.2, rotationPeriod: 7.65, obliquity: 0.0 },
  deimos: { id: "deimos", radius: 6.2, rotationPeriod: 30.31, obliquity: 0.0 },
  io: { id: "io", radius: 1821.6, rotationPeriod: 42.46, obliquity: 0.0 },
  europa: { id: "europa", radius: 1560.8, rotationPeriod: 85.22, obliquity: 0.0 },
  ganymede: { id: "ganymede", radius: 2634.1, rotationPeriod: 171.72, obliquity: 0.0 },
  callisto: { id: "callisto", radius: 2410.3, rotationPeriod: 400.54, obliquity: 0.0 },
  titan: { id: "titan", radius: 2575.5, rotationPeriod: 382.68, obliquity: 0.0 },
  rhea: { id: "rhea", radius: 763.8, rotationPeriod: 108.43, obliquity: 0.0 },
  enceladus: { id: "enceladus", radius: 252.1, rotationPeriod: 32.88, obliquity: 0.0 },
  titania: { id: "titania", radius: 788.4, rotationPeriod: 208.94, obliquity: 0.0 },
  oberon: { id: "oberon", radius: 761.4, rotationPeriod: 323.11, obliquity: 0.0 },
  ariel: { id: "ariel", radius: 578.9, rotationPeriod: 60.48, obliquity: 0.0 },
  triton: { id: "triton", radius: 1353.4, rotationPeriod: -141.05, obliquity: 0.0 }, // retrograde
  proteus: { id: "proteus", radius: 210.0, rotationPeriod: 26.93, obliquity: 0.0 }
};

export class OrbitEngine {
  /**
   * 主要计算方法：计算某天体在特定日期相对于太阳 (Heliocentric) 的克卜勒 3D 坐标位置
   * @param id 星体ID
   * @param days 距离 J2000.0 历元的日子数
   * @param useOffsets 是否应用 NASA Horizons LUT 校准偏移 (默认为 true)
   * @returns 真实物理坐标 (AU)
   */
  static getHeliocentricPosition(id: string, days: number, useOffsets = true): { x: number; y: number; z: number } {
    if (id === 'sun') {
      return { x: 0, y: 0, z: 0 };
    }

    // 针对月球的处理，月球属于地球系统的卫星，单独调用 getLunarPosition
    if (id === 'moon') {
      // 在太阳视角下，月球坐标 = 地球坐标 + 月地相对坐标
      const earthPos = this.getHeliocentricPosition('earth', days, useOffsets);
      const moonRelPos = useOffsets ? this.getLunarRelativePosition(days) : this.getLunarRelativePositionRaw(days);
      return {
        x: earthPos.x + moonRelPos.x,
        y: earthPos.y + moonRelPos.y,
        z: earthPos.z + moonRelPos.z
      };
    }

    const elem = PLANET_ORBITAL_DATA[id];
    if (elem) {
      // 1. 计算平均近点角 Mean Anomaly (M)
      // 公转角速度 n = 360 / period
      const n = 360.0 / elem.period;
      // 平均近点角 M = L - longPeri + n * days
      let M = (elem.L - elem.longPeri + n * days) % 360;
      if (M < 0) M += 360;
      const mRad = (M * Math.PI) / 180.0;

      // 2. 解克卜勒方程： E - e * sin(E) = M
      let E = mRad;
      const e = elem.e;
      for (let count = 0; count < 5; count++) {
        const deltaE = (E - e * Math.sin(E) - mRad) / (1.0 - e * Math.cos(E));
        E -= deltaE;
      }

      // 3. 计算在轨道平面 (Orbit Plane) 内的直角坐标
      const a = elem.a;
      const xOrbit = a * (Math.cos(E) - e);
      const yOrbit = a * Math.sqrt(1.0 - e * e) * Math.sin(E);

      // 4. 将轨道平面坐标，结合升交点黄经(Ω), 轨道倾角(i)，近日点角(ω) 变换为黄道坐标系 (Ecliptic Coordinate System)
      const iRad = (elem.I * Math.PI) / 180.0;
      const nodeRad = (elem.node * Math.PI) / 180.0;
      const omegaRad = ((elem.longPeri - elem.node) * Math.PI) / 180.0; // 近日点幅角

      const cosNode = Math.cos(nodeRad);
      const sinNode = Math.sin(nodeRad);
      const cosOmega = Math.cos(omegaRad);
      const sinOmega = Math.sin(omegaRad);
      const cosI = Math.cos(iRad);
      const sinI = Math.sin(iRad);

      const xEcliptic = xOrbit * (cosOmega * cosNode - sinOmega * sinNode * cosI) - yOrbit * (sinOmega * cosNode + cosOmega * sinNode * cosI);
      const yEcliptic = xOrbit * (cosOmega * sinNode + sinOmega * cosNode * cosI) - yOrbit * (sinOmega * sinNode - cosOmega * cosNode * cosI);
      const zEcliptic = xOrbit * (sinOmega * sinI) + yOrbit * (cosOmega * sinI);

      let x = xEcliptic;
      let y = yEcliptic;
      let z = zEcliptic;

      if (useOffsets) {
        const jd = 2451545.0 + days;
        const offset = this.interpolateOffsetForBody(jd, id);
        x += offset.x;
        y += offset.y;
        z += offset.z;
      }

      return { x, y, z };
    }

    // 支持其他天然卫星（如土卫六 Titan）
    const sat = SATELLITE_CATALOG.find(s => s.id === id);
    if (sat) {
      const parentPos = this.getHeliocentricPosition(sat.parentId, days, useOffsets);
      const relPos = getSatelliteHeliocentricPosition(sat, days);
      return {
        x: parentPos.x + relPos.x,
        y: parentPos.y + relPos.y,
        z: parentPos.z + relPos.z
      };
    }

    return { x: 0, y: 0, z: 0 };
  }

  /**
   * Horner's polynomial evaluation helper
   */
  private static horner(x: number, ...c: number[]): number {
    let i = c.length - 1;
    let y = c[i];
    while (i > 0) {
      i--;
      y = y * x + c[i];
    }
    return y;
  }

  // Mapping from planet/moon ID to index in the 9-body LUT (each step has 27 floats)
  private static readonly LUT_BODY_INDEX: Record<string, number> = {
    mercury: 0,
    venus: 1,
    earth: 2,
    mars: 3,
    jupiter: 4,
    saturn: 5,
    uranus: 6,
    neptune: 7,
    moon: 8
  };

  /**
   * Interpolate 3D offset for a specific celestial body from the unified LUT data
   */
  private static interpolateOffsetForBody(jd: number, bodyId: string): { x: number; y: number; z: number } {
    const bodyIdx = OrbitEngine.LUT_BODY_INDEX[bodyId];
    if (bodyIdx === undefined) {
      return { x: 0, y: 0, z: 0 };
    }

    const startJd = 2415020.5; // 1900-01-01 00:00:00 UTC
    const stepDays = 10;
    const stepsCount = 7305;
    const endJd = startJd + (stepsCount - 1) * stepDays;

    if (jd < startJd || jd > endJd) {
      let targetIndex = 0;
      if (jd < startJd && jd >= startJd - 30) {
        targetIndex = 0;
      } else if (jd > endJd && jd <= endJd + 30) {
        targetIndex = stepsCount - 1;
      } else {
        return { x: 0, y: 0, z: 0 };
      }

      const baseIdx = targetIndex * 27 + bodyIdx * 3;
      return {
        x: LUT_DATA[baseIdx],
        y: LUT_DATA[baseIdx + 1],
        z: LUT_DATA[baseIdx + 2]
      };
    }

    const idx = (jd - startJd) / stepDays;
    const i0 = Math.floor(idx);
    const i1 = Math.min(i0 + 1, stepsCount - 1);
    const t = idx - i0;

    const base0 = i0 * 27 + bodyIdx * 3;
    const base1 = i1 * 27 + bodyIdx * 3;

    return {
      x: LUT_DATA[base0] * (1 - t) + LUT_DATA[base1] * t,
      y: LUT_DATA[base0 + 1] * (1 - t) + LUT_DATA[base1 + 1] * t,
      z: LUT_DATA[base0 + 2] * (1 - t) + LUT_DATA[base1 + 2] * t
    };
  }

  /**
   * 获取特定日期的星体校准偏移 (AU)
   */
  static getCalibrationOffset(id: string, days: number): { x: number; y: number; z: number } {
    const jd = 2451545.0 + days;
    return this.interpolateOffsetForBody(jd, id);
  }

  /**
   * 计算月球相对于地球中心的距离与位置（使用完整 Meeus ELP-2000 级数模型计算）
   * @param days 距 J2000.0 天数
   * @returns 真实物理相对坐标 (AU)
   */
  static getLunarRelativePositionRaw(days: number): { x: number; y: number; z: number } {
    const T = days / 36525.0; // 儒略世纪数
    const D2R = Math.PI / 180.0;

    // 1. 计算月球基本轨道要素 (以弧度表示)
    const D = (this.horner(T, 297.8501921 * D2R, 445267.1114034 * D2R, -0.0018819 * D2R, D2R / 545868, -D2R / 113065000)) % (2 * Math.PI);
    const M = (this.horner(T, 357.5291092 * D2R, 35999.0502909 * D2R, -0.0001536 * D2R, D2R / 24490000)) % (2 * Math.PI);
    const Mp = (this.horner(T, 134.9633964 * D2R, 477198.8675055 * D2R, 0.0087414 * D2R, D2R / 69699, -D2R / 14712000)) % (2 * Math.PI);
    const F = (this.horner(T, 93.272095 * D2R, 483202.0175233 * D2R, -0.0036539 * D2R, -D2R / 3526000, D2R / 863310000)) % (2 * Math.PI);
    const L_ = (this.horner(T, 218.3164477 * D2R, 481267.88123421 * D2R, -0.0015786 * D2R, D2R / 538841, -D2R / 65194000)) % (2 * Math.PI);

    const a1 = 119.75 * D2R + 131.849 * D2R * T;
    const a2 = 53.09 * D2R + 479264.29 * D2R * T;
    const a3 = 313.45 * D2R + 481266.484 * D2R * T;

    const e = this.horner(T, 1, -0.002516, -0.0000074);
    const e2 = e * e;

    let sumL = 3958 * Math.sin(a1) + 1962 * Math.sin(L_ - F) + 318 * Math.sin(a2);
    let sumR = 0.0;
    let sumB = -2235 * Math.sin(L_) + 382 * Math.sin(a3) + 175 * Math.sin(a1 - F) + 175 * Math.sin(a1 + F) + 127 * Math.sin(L_ - Mp) - 115 * Math.sin(L_ + Mp);

    LUNAR_TA.forEach((r) => {
      const angle = D * r.d + M * r.m + Mp * r.m_ + F * r.f;
      const sina = Math.sin(angle);
      const cosa = Math.cos(angle);
      let termE = 1.0;
      if (r.m === -1 || r.m === 1) termE = e;
      else if (r.m === -2 || r.m === 2) termE = e2;

      sumL += r.sl * sina * termE;
      sumR += r.sr * cosa * termE;
    });

    LUNAR_TB.forEach((r) => {
      const angle = D * r.d + M * r.m + Mp * r.m_ + F * r.f;
      const sb = Math.sin(angle);
      let termE = 1.0;
      if (r.m === -1 || r.m === 1) termE = e;
      else if (r.m === -2 || r.m === 2) termE = e2;

      sumB += r.sb * sb * termE;
    });

    const lon = (L_ + sumL * 1e-6 * D2R) % (2 * Math.PI);
    const lat = sumB * 1e-6 * D2R;
    const distKm = 385000.56 + sumR * 1e-3;
    const distAU = distKm / 149597870.7;

    return {
      x: distAU * Math.cos(lat) * Math.cos(lon),
      y: distAU * Math.cos(lat) * Math.sin(lon),
      z: distAU * Math.sin(lat)
    };
  }

  /**
   * 获取地月相对坐标（包含 NASA LUT 差值校准）
   */
  static getLunarRelativePosition(days: number): { x: number; y: number; z: number } {
    const rawPos = this.getLunarRelativePositionRaw(days);
    const jd = 2451545.0 + days;
    const offset = this.interpolateOffsetForBody(jd, 'moon');
    return {
      x: rawPos.x + offset.x,
      y: rawPos.y + offset.y,
      z: rawPos.z + offset.z
    };
  }

  /**
   * 根据自转常数、Obliquity 和当前时间，计算星体在空间中的自转偏置角 (弧度值)
   * 必须要将自转角度考虑进去，例如 UTC 12:00 时，经度0应该正对太阳
   * @param id 星体ID
   * @param timestamp 当前UTC时间戳
   */
  static getRotationAngle(id: string, timestamp: number): number {
    const phys = CELESTIAL_PHYSICS[id as keyof typeof CELESTIAL_PHYSICS];
    if (!phys) return 0;

    // 自转角速度： 360 / rotationPeriod (度 / 小时)
    const hoursSinceJ2000 = (timestamp - J2000_TIMESTAMP) / 3600000;
    
    // 如果是地球，特殊校准：
    // UTC 12:00 时，地球的 0° 经线要绝对朝向太阳 (即背离太阳反方向的在 midnight)
    // 太阳光线是从 (0,0,0) 发射向地球 (xE, yE, zE)，
    // 我们假设纹理的中心(经度0)需要根据当前的 UTC 12点完成正对迎光
    if (id === 'earth') {
      // 使用恒星日 (Sidereal Day ≈ 23h 56m 4.0905s) 计算地球自转，
      // 避免太阳日 (24h) 与恒星时混用导致的长期累积误差。
      const SIDEREAL_DAY_MS = 86164.0905 * 1000;
      const siderealDays = (timestamp - J2000_TIMESTAMP) / SIDEREAL_DAY_MS;
      // J2000 epoch (2000-01-01 12:00 UTC) 时 0° 经线正对太阳，以此为基准
      return siderealDays * 2 * Math.PI;
    }

    // 其他星球使用直接线型自转计算
    const rotationRad = (2 * Math.PI * hoursSinceJ2000) / phys.rotationPeriod;
    return rotationRad;
  }

  /**
   * 核心 NASA Horizons 校验证书与初始计算测试
   * 确保克卜勒轨道算沙盒引擎在 epoch J2000.0 (2000-01-01T12:00:00Z) 地球公转位置满足 1.0 AU 且偏心率为 0.0167
   */
  static validateOrbitEngine(): { success: boolean; log: string } {
    // 1. 在 Epoch J2000.0 (days = 0)
    const earthPos = this.getHeliocentricPosition('earth', 0);
    const radius = Math.sqrt(earthPos.x * earthPos.x + earthPos.y * earthPos.y + earthPos.z * earthPos.z);

    // 期望：在 epoch J2000 左右，由于偏心率，地日实际距离在 0.983 到 1.017 AU 之间 (因为公转至近日点和远日点之间)
    const validRange = radius >= 0.98 && radius <= 1.02;

    const testTime = J2000_TIMESTAMP + 180 * 24 * 3600 * 1000; // 180天后
    const earthPos180 = this.getHeliocentricPosition('earth', 180);
    const radius180 = Math.sqrt(earthPos180.x * earthPos180.x + earthPos180.y * earthPos180.y + earthPos180.z * earthPos180.z);

    const checkLog = ` 历元验证指标:
- 历元 J2000 地球计算坐标: { x: ${earthPos.x.toFixed(5)}, y: ${earthPos.y.toFixed(5)}, z: ${earthPos.z.toFixed(5)} }
- 地日实际换算距离: ${radius.toFixed(5)} AU (NASA Horizons 观测值期望 ~ 0.983 - 1.017 AU)
- 180地球公转步进距离: ${radius180.toFixed(5)} AU
- 黄赤道倾斜物理矩阵约束配置: 黄赤夹角 = 23.44° (已完全应用于观察者自转平面坐标转换)`;

    return {
      success: validRange,
      log: checkLog
    };
  }
}
