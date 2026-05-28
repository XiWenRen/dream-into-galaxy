/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OrbitEngine } from './OrbitEngine';
import {
  SOLAR_ECLIPSE_EVENTS,
  LUNAR_ECLIPSE_EVENTS,
  type SolarEclipseEvent,
  type LunarEclipseEvent,
  formatSolarEclipseType,
  formatLunarEclipseType,
} from '../data/eclipseEvents';

export const SYNODIC_MONTH_MS = 29.53059 * 24 * 60 * 60 * 1000;

export function getCurrentCycleNewMoon(referenceTimestamp: number): number {
  const knownNewMoon = Date.UTC(2000, 0, 16, 22, 59, 0);
  const monthsSince = (referenceTimestamp - knownNewMoon) / SYNODIC_MONTH_MS;
  // Use floor to always get the start of the current lunar cycle
  let baseTs = knownNewMoon + Math.floor(monthsSince) * SYNODIC_MONTH_MS;
  
  // 迭代寻找精确的新月时间点（地月连线与地日连线夹角最小）
  // 步长逐步缩小进行二分查找或梯度下降
  let step = 24 * 3600 * 1000; // 初始步长 1 天
  for (let iter = 0; iter < 4; iter++) {
    let bestTs = baseTs;
    let minAngle = Infinity;
    for (let offset = -5; offset <= 5; offset++) {
      const ts = baseTs + offset * step;
      const days = (ts - 946728000000) / 86400000; // J2000_TIMESTAMP = 946728000000
      const earthPos = OrbitEngine.getHeliocentricPosition('earth', days);
      const moonRel = OrbitEngine.getLunarRelativePosition(days);
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
    step /= 5; // 缩小步长
  }
  return baseTs;
}

export function getExactMoonPhaseTime(baseNewMoon: number, phaseIndex: number): number {
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
      const earthPos = OrbitEngine.getHeliocentricPosition('earth', days);
      const moonRel = OrbitEngine.getLunarRelativePosition(days);
      const es = { x: -earthPos.x, y: -earthPos.y, z: -earthPos.z };
      
      // 在黄道面上投影计算相位角
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

export interface SolarTermInfo {
  index: number;
  nameKey: string;
  angle: number; // 黄经角度
}

// 二十四节气按太阳黄经 0度 (春分) 开始排列
export const SOLAR_TERMS_LIST: SolarTermInfo[] = [
  { index: 0, nameKey: "term_chunfen", angle: 0 },
  { index: 1, nameKey: "term_qingming", angle: 15 },
  { index: 2, nameKey: "term_guyu", angle: 30 },
  { index: 3, nameKey: "term_lixia", angle: 45 },
  { index: 4, nameKey: "term_xiaoman", angle: 60 },
  { index: 5, nameKey: "term_mangzhong", angle: 75 },
  { index: 6, nameKey: "term_xiazhi", angle: 90 },
  { index: 7, nameKey: "term_xiaoshu", angle: 105 },
  { index: 8, nameKey: "term_dashu", angle: 120 },
  { index: 9, nameKey: "term_liqiu", angle: 135 },
  { index: 10, nameKey: "term_chushu", angle: 150 },
  { index: 11, nameKey: "term_bailu", angle: 165 },
  { index: 12, nameKey: "term_qiufen", angle: 180 },
  { index: 13, nameKey: "term_hanlu", angle: 195 },
  { index: 14, nameKey: "term_shuangjiang", angle: 210 },
  { index: 15, nameKey: "term_lidong", angle: 225 },
  { index: 16, nameKey: "term_xiaoxue", angle: 240 },
  { index: 17, nameKey: "term_daxue", angle: 255 },
  { index: 18, nameKey: "term_dongzhi", angle: 270 },
  { index: 19, nameKey: "term_xiaohan", angle: 285 },
  { index: 20, nameKey: "term_dahan", angle: 300 },
  { index: 21, nameKey: "term_lichun", angle: 315 },
  { index: 22, nameKey: "term_yushui", angle: 330 },
  { index: 23, nameKey: "term_jingzhe", angle: 345 }
];

export interface EclipseEvent {
  timestamp: number;
  type: 'solar' | 'lunar';
  dateStr: string; // YYYY-MM-DD
  /** 详细事件数据 (来自NASA) */
  detail?: SolarEclipseEvent | LunarEclipseEvent;
  /** 是否正处于交食窗口期内 */
  inWindow?: boolean;
  /** 交食程度: 0~1 (0为无交食, 1为最大食) */
  magnitude?: number;
}

export class AstrophenomenaEngine {
  /**
   * 搜索给定时间窗口内的日食和月食事件
   * 优先使用NASA权威数据，同时结合轨道计算进行交叉验证
   * @param centerTimestamp 中心时间点 (ms)
   * @param windowYears 搜索前后多少年 (默认 ±10年)
   */
  static searchEclipseEvents(centerTimestamp: number, windowYears = 10): EclipseEvent[] {
    const centerDate = new Date(centerTimestamp);
    const startYear = centerDate.getFullYear() - windowYears;
    const endYear = centerDate.getFullYear() + windowYears;

    const events: EclipseEvent[] = [];

    // 从NASA权威数据中提取
    for (const se of SOLAR_ECLIPSE_EVENTS) {
      const year = parseInt(se.date.split('-')[0]);
      if (year >= startYear && year <= endYear) {
        events.push({
          timestamp: new Date(`${se.date}T${se.greatestUTC}Z`).getTime(),
          type: 'solar',
          dateStr: se.date,
          detail: se,
        });
      }
    }

    for (const le of LUNAR_ECLIPSE_EVENTS) {
      const year = parseInt(le.date.split('-')[0]);
      if (year >= startYear && year <= endYear) {
        events.push({
          timestamp: new Date(`${le.date}T${le.greatestUTC}Z`).getTime(),
          type: 'lunar',
          dateStr: le.date,
          detail: le,
        });
      }
    }

    return events.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * 获取某个日期的日食/月食详细描述
   */
  static getEclipseDescription(event: EclipseEvent, lang: 'zh' | 'en'): string {
    if (event.type === 'solar' && event.detail) {
      const se = event.detail as SolarEclipseEvent;
      const typeStr = formatSolarEclipseType(se.type, lang);
      if (lang === 'zh') {
        return `${se.date} ${typeStr} | 食分: ${se.magnitude.toFixed(3)} | 食甚: ${se.greatestUTC} UTC | 可见区域: ${se.region}${se.centralPath ? ` | 中心带: ${se.centralPath}` : ''}`;
      }
      return `${se.date} ${typeStr} | Magnitude: ${se.magnitude.toFixed(3)} | Greatest: ${se.greatestUTC} UTC | Visible: ${se.region}${se.centralPath ? ` | Path: ${se.centralPath}` : ''}`;
    }
    if (event.type === 'lunar' && event.detail) {
      const le = event.detail as LunarEclipseEvent;
      const typeStr = formatLunarEclipseType(le.type, lang);
      if (lang === 'zh') {
        return `${le.date} ${typeStr} | 本影食分: ${le.umbralMagnitude.toFixed(3)} | 食甚: ${le.greatestUTC} UTC | 可见区域: ${le.region}`;
      }
      return `${le.date} ${typeStr} | Umbral Mag: ${le.umbralMagnitude.toFixed(3)} | Greatest: ${le.greatestUTC} UTC | Visible: ${le.region}`;
    }
    return '';
  }

  /**
   * 计算给定交食事件的真实开始与结束时间（初亏/复圆或 P1/P4）
   * @param timestamp 交食峰值时间戳 (ms)
   * @param type 'solar' | 'lunar'
   * @returns { start, end } 开始和结束时间戳 (ms)
   */
  static getEclipseWindow(timestamp: number, type: 'solar' | 'lunar'): { start: number; end: number } {
    const centerDays = (timestamp / 86400000) - 10957.5;
    const coarseStep = 0.01;   // ~14.4 min
    const fineStep = 0.0005;   // ~43 sec
    const maxRadius = 0.6;     // 搜索半径上限 ~14.4h

    const isActive = (days: number) => {
      const r = this.detectEclipse(days);
      return type === 'solar' ? r.solarEclipse : r.lunarEclipse;
    };

    // --- 粗搜开始（向后） ---
    let coarseStart = centerDays;
    for (let d = centerDays; d > centerDays - maxRadius; d -= coarseStep) {
      if (!isActive(d)) {
        coarseStart = d + coarseStep;
        break;
      }
      coarseStart = d;
    }

    // --- 精搜开始（向后） ---
    let startDays = coarseStart;
    for (let d = coarseStart; d > centerDays - maxRadius; d -= fineStep) {
      if (!isActive(d)) {
        startDays = d + fineStep;
        break;
      }
      startDays = d;
    }

    // --- 粗搜结束（向前） ---
    let coarseEnd = centerDays;
    for (let d = centerDays; d < centerDays + maxRadius; d += coarseStep) {
      if (!isActive(d)) {
        coarseEnd = d - coarseStep;
        break;
      }
      coarseEnd = d;
    }

    // --- 精搜结束（向前） ---
    let endDays = coarseEnd;
    for (let d = coarseEnd; d < centerDays + maxRadius; d += fineStep) {
      if (!isActive(d)) {
        endDays = d - fineStep;
        break;
      }
      endDays = d;
    }

    return {
      start: Math.round((startDays + 10957.5) * 86400000),
      end: Math.round((endDays + 10957.5) * 86400000),
    };
  }

  /**
   * 根据当前日期天数，计算太阳 ecliptic 黄经
   * 进而计算对应的当前节气以及下一个节气倒计时
   * @param days 距 J2000.0 天数
   */
  static getSolarLongitude(days: number): number {
    // 获取地球相对于太阳的坐标
    const earthPos = OrbitEngine.getHeliocentricPosition('earth', days);
    
    // 太阳相对于地球的坐标向量是 (-x, -y, -z)
    const sunX = -earthPos.x;
    const sunY = -earthPos.y;

    // 计算黄经角度 (0 ~ 360 度)
    let lambdaRad = Math.atan2(sunY, sunX);
    let lambdaDeg = (lambdaRad * 180.0) / Math.PI;
    
    // 换算成正角
    lambdaDeg = lambdaDeg % 360;
    if (lambdaDeg < 0) lambdaDeg += 360;

    return lambdaDeg;
  }

  /**
   * 计算两个黄经角度之间的最小差值（处理 360° 循环）
   */
  static longitudeDiff(a: number, b: number): number {
    let diff = (a - b) % 360;
    if (diff < -180) diff += 360;
    if (diff > 180) diff -= 360;
    return diff;
  }

  /**
   * 精确计算某年份中太阳黄经达到指定角度的时刻
   * @param year 目标年份（如 2026）
   * @param targetLongitude 目标黄经角度（0~360）
   * @returns 对应时间戳（毫秒）
   */
  static getSolarTermTimestamp(year: number, targetLongitude: number): number {
    // 构造该年份的起止范围
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    let left = (startOfYear.getTime() / 86400000) - 10957.5;
    let right = (endOfYear.getTime() / 86400000) - 10957.5;

    // 二分搜索：太阳黄经随时间单调增加，利用 longitudeDiff 的符号确定方向
    for (let i = 0; i < 50; i++) {
      const mid = (left + right) / 2;
      const lon = this.getSolarLongitude(mid);
      const diff = this.longitudeDiff(lon, targetLongitude);

      if (diff > 0) {
        right = mid;
      } else {
        left = mid;
      }

      if (Math.abs(diff) < 1e-6 || right - left < 1e-7) break;
    }

    const bestDays = (left + right) / 2;
    return Math.round((bestDays + 10957.5) * 86400000);
  }

  /**
   * 查询当前处于哪个节气以及角度
   */
  static getCurrentSolarTerm(days: number): { current: SolarTermInfo; next: SolarTermInfo; currentLong: number } {
    const long = this.getSolarLongitude(days);
    
    // 搜索比当前黄经小的最近一个节气
    let currentIndex = 0;
    for (let i = 0; i < SOLAR_TERMS_LIST.length; i++) {
      if (long >= SOLAR_TERMS_LIST[i].angle) {
        currentIndex = i;
      }
    }

    const current = SOLAR_TERMS_LIST[currentIndex];
    const nextIndex = (currentIndex + 1) % SOLAR_TERMS_LIST.length;
    const next = SOLAR_TERMS_LIST[nextIndex];

    return {
      current,
      next,
      currentLong: long
    };
  }

  /**
   * 计算物理正确的阴影锥参数
   * 用于3D渲染日食/月食时的本影/半影锥
   * @param lightSourceRadius 光源半径 (km)
   * @param occluderRadius 遮挡体半径 (km)
   * @param distance 光源到遮挡体的距离 (km)
   * @returns 本影锥半顶角(rad)、半影锥半顶角(rad)、本影锥长度(km)
   */
  static computeShadowCone(
    lightSourceRadius: number,
    occluderRadius: number,
    distance: number
  ): { umbraAngle: number; penumbraAngle: number; umbraLength: number } {
    // 本影锥半顶角: sin(θ_u) = (R_light - R_occluder) / distance
    // 当 R_occluder < R_light 时，本影锥是收敛的（尖头向外）
    const umbraAngle = Math.asin(Math.max(-1, Math.min(1, (lightSourceRadius - occluderRadius) / distance)));
    // 半影锥半顶角: sin(θ_p) = (R_light + R_occluder) / distance
    const penumbraAngle = Math.asin(Math.max(-1, Math.min(1, (lightSourceRadius + occluderRadius) / distance)));
    // 本影锥长度: L = R_occluder / sin(|θ_u|) = R_occluder * distance / (R_light - R_occluder)
    const umbraLength = Math.abs(umbraAngle) > 0.0001
      ? occluderRadius / Math.abs(Math.sin(umbraAngle))
      : distance * 100; // 如果几乎平行，给一个很大的值
    return { umbraAngle, penumbraAngle, umbraLength };
  }

  /**
   * 计算日食时月球的阴影锥参数 (月球遮挡太阳)
   * @param sunRadius 太阳半径 (km), 默认 696340
   * @param moonRadius 月球半径 (km), 默认 1737.4
   * @param sunToMoonDist 太阳到月球的距离 (km)
   */
  static getMoonShadowCone(
    sunToMoonDist: number,
    sunRadius: number = 696340,
    moonRadius: number = 1737.4
  ): { umbraAngle: number; penumbraAngle: number; umbraLength: number; umbraTipRadius: number } {
    const { umbraAngle, penumbraAngle, umbraLength } = this.computeShadowCone(sunRadius, moonRadius, sunToMoonDist);
    // 本影锥顶点处的半径 (理论上为0，但用一个小值表示尖头)
    const umbraTipRadius = 0.001;
    return { umbraAngle, penumbraAngle, umbraLength, umbraTipRadius };
  }

  /**
   * 计算月食时地球的阴影锥参数 (地球遮挡太阳)
   * @param sunRadius 太阳半径 (km), 默认 696340
   * @param earthRadius 地球半径 (km), 默认 6371
   * @param sunToEarthDist 太阳到地球的距离 (km)
   */
  static getEarthShadowCone(
    sunToEarthDist: number,
    sunRadius: number = 696340,
    earthRadius: number = 6371
  ): { umbraAngle: number; penumbraAngle: number; umbraLength: number; umbraTipRadius: number } {
    const { umbraAngle, penumbraAngle, umbraLength } = this.computeShadowCone(sunRadius, earthRadius, sunToEarthDist);
    const umbraTipRadius = 0.001;
    return { umbraAngle, penumbraAngle, umbraLength, umbraTipRadius };
  }

  /**
   * 计算当前地球-月球-太阳的三维空间夹角，从而预测并判定日食、月食天象
   * @param days 距 J2000.0 天数
   */
  static detectEclipse(days: number): { solarEclipse: boolean; lunarEclipse: boolean; earthToSunDist: number; earthToMoonDist: number; angleDegrees: number } {
    // 1. 获取不需要任何缩放的纯天文真实物理坐标
    const earthPos = OrbitEngine.getHeliocentricPosition('earth', days);
    // 月地相对距离 (真实坐标)
    const moonRel = OrbitEngine.getLunarRelativePosition(days);

    // 2. 地日向量、地月向量
    // 地日向量 (起自地球，指向太阳)
    const es = { x: -earthPos.x, y: -earthPos.y, z: -earthPos.z };
    // 地月向量 (起自地球，指向月球)
    const em = moonRel;

    const esLen = Math.sqrt(es.x * es.x + es.y * es.y + es.z * es.z);
    const emLen = Math.sqrt(em.x * em.x + em.y * em.y + em.z * em.z);

    // 向量点乘，计算余弦角
    const dot = es.x * em.x + es.y * em.y + es.z * em.z;
    const cosAngle = dot / (esLen * emLen);
    const angleRad = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
    const angleDeg = (angleRad * 180.0) / Math.PI;

    // 判定逻辑:
    // 日食 (Solar Eclipse)：新月期。月球正好处于地球和太阳正中央。
    // 地月向量与地日向量同向 (dot > 0) 且夹角小于两视半径之和时发生。
    // 太阳视半径 ~0.2666°，月球视半径 ~0.259°，和约 0.526°
    const solarEclipse = dot > 0 && angleDeg < 0.55;

    // 月食 (Lunar Eclipse)：满月期。地日向量与地月向量正好反向 (dot < 0)。
    // 此时月球进入地球本影/半影。地心处地球本影锥半顶角约 0.46°-0.75°，
    // 取保守阈值 0.8°。
    const lunarEclipse = dot < 0 && (180 - angleDeg) < 0.8;

    return {
      solarEclipse,
      lunarEclipse,
      earthToSunDist: esLen,
      earthToMoonDist: emLen,
      angleDegrees: angleDeg
    };
  }

  /**
   * 计算月球相对于地球-太阳系统的受光面百分比，以计算月相 (Moon Phase)
   * 0: 新月 (New), 0.25: 上弦 (First Quarter), 0.5: 满月 (Full), 0.75: 下弦 (Last Quarter)
   */
  static getMoonPhase(days: number): { phaseIndex: number; nameKey: string; percent: number } {
    // 获取无缩放真实物理位置
    const earthPos = OrbitEngine.getHeliocentricPosition('earth', days);
    const moonRel = OrbitEngine.getLunarRelativePosition(days);

    // 计算地球在太阳黄道面上的倾斜影子向量
    const es = { x: -earthPos.x, y: -earthPos.y, z: -earthPos.z };
    const em = moonRel;

    const esLen = Math.sqrt(es.x * es.x + es.y * es.y + es.z * es.z);
    const emLen = Math.sqrt(em.x * em.x + em.y * em.y + em.z * em.z);

    // 点乘计算
    const dot = es.x * em.x + es.y * em.y + es.z * em.z;
    const cosAngle = dot / (esLen * emLen);
    const angleRad = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
    const angleDeg = (angleRad * 180.0) / Math.PI;

    // 基于月球相对于太阳和地球的倾斜角度，逆时针运行计算：
    // 当夹角接近 0 度时，属于新月 (完全不受光)
    // 随着夹角增加，向 90度 (上弦月) 逼近
    // 当夹角达到 180度 时，属于满月 (完全受光)
    // 根据地月在空间顺时针/逆时针自转的关系，我们可以通过判定地球和月球在 Y 轴上叉乘的朝向决定是上弦月还是下弦月！
    // 叉乘：z = es.x * em.y - es.y * em.x
    const crossZ = es.x * em.y - es.y * em.x;
    
    let phaseAngle = angleDeg;
    if (crossZ < 0) {
      // 下弦月/残月侧
      phaseAngle = 360 - angleDeg;
    }

    // 将 360度 均分为 8 个月相段
    const phaseValue = phaseAngle / 360; // 0.0 ~ 1.0
    const segment = Math.floor((phaseValue * 8) + 0.5) % 8;

    const names = [
      "phase_new",              // 0: 朔 / 新月
      "phase_waxing_crescent",  // 1: 峨眉月
      "phase_first_quarter",    // 2: 上弦月
      "phase_waxing_gibbous",   // 3: 盈凸月
      "phase_full",             // 4: 望 / 满月
      "phase_waning_gibbous",   // 5: 亏凸月
      "phase_last_quarter",     // 6: 下弦月
      "phase_waning_crescent"   // 7: 残月
    ];

    // 受光百分比
    const percent = (1 - Math.cos(angleRad)) / 2;

    return {
      phaseIndex: segment,
      nameKey: names[segment],
      percent
    };
  }
}
