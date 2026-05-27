/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OrbitEngine } from './OrbitEngine';

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
}

export class AstrophenomenaEngine {
  /**
   * 搜索给定时间窗口内的日食和月食事件
   * @param centerTimestamp 中心时间点 (ms)
   * @param windowYears 搜索前后多少年 (默认 ±10年)
   */
  static searchEclipseEvents(centerTimestamp: number, windowYears = 10): EclipseEvent[] {
    const centerDays = (centerTimestamp / 86400000) - 10957.5; // ms -> days since J2000
    const startDays = centerDays - windowYears * 365.25;
    const endDays = centerDays + windowYears * 365.25;

    const events: EclipseEvent[] = [];
    const seen = new Set<string>();

    // Scan with 0.25-day steps to catch all eclipses
    for (let days = startDays; days < endDays; days += 0.25) {
      const result = this.detectEclipse(days);
      if (result.solarEclipse || result.lunarEclipse) {
        const ts = (days + 10957.5) * 86400000;
        const d = new Date(ts);
        const type = result.solarEclipse ? 'solar' : 'lunar';
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${type}`;
        if (!seen.has(key)) {
          seen.add(key);
          events.push({
            timestamp: ts,
            type,
            dateStr: d.toISOString().split('T')[0],
          });
        }
      }
    }

    return events.sort((a, b) => a.timestamp - b.timestamp);
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
