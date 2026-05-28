/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 日食与月食权威数据 (NASA/GSFC Fred Espenak)
 * Source: https://eclipse.gsfc.nasa.gov/
 */

export interface SolarEclipseEvent {
  date: string;
  type: 'total' | 'annular' | 'hybrid' | 'partial';
  /** 食甚时间 UTC */
  greatestUTC: string;
  /** 食分: >=1.0为全食, <1.0为环食/偏食 */
  magnitude: number;
  /** 中心食持续时间 (全食/环食), null表示偏食 */
  centralDuration: string | null;
  /** 可见区域描述 */
  region: string;
  /** 中心食带路径描述, null表示偏食 */
  centralPath: string | null;
  /** 沙罗周期序列号 */
  sarosSeries: number;
  /** 最大食发生地经纬度 (大致) */
  maxLat: number;
  maxLon: number;
}

export interface LunarEclipseEvent {
  date: string;
  type: 'total' | 'partial' | 'penumbral';
  /** 食甚时间 UTC */
  greatestUTC: string;
  /** 本影食分: >=1.0为全食, 0~1为偏食, <0为半影 */
  umbralMagnitude: number;
  /** 偏食阶段持续时间, null表示半影月食 */
  partialDuration: string | null;
  /** 全食阶段持续时间, null表示非全食 */
  totalDuration: string | null;
  /** 可见区域描述 */
  region: string;
  /** 沙罗周期序列号 */
  sarosSeries: number;
}

/** 日食事件 (2020-2030) — 共22次 */
export const SOLAR_ECLIPSE_EVENTS: SolarEclipseEvent[] = [
  {
    date: '2020-06-21', type: 'annular', greatestUTC: '06:41:15',
    magnitude: 0.994, centralDuration: '00m38s',
    region: '非洲、南欧、亚洲',
    centralPath: '中非、南亚、中国、太平洋',
    sarosSeries: 137, maxLat: 30.5, maxLon: 79.7
  },
  {
    date: '2020-12-14', type: 'total', greatestUTC: '16:14:39',
    magnitude: 1.025, centralDuration: '02m10s',
    region: '太平洋、南美南部、南极洲',
    centralPath: '南太平洋、智利、阿根廷、南大西洋',
    sarosSeries: 142, maxLat: -40.3, maxLon: -67.0
  },
  {
    date: '2021-06-10', type: 'annular', greatestUTC: '10:43:06',
    magnitude: 0.943, centralDuration: '03m51s',
    region: '北美北部、欧洲、亚洲',
    centralPath: '加拿大北部、格陵兰、俄罗斯',
    sarosSeries: 147, maxLat: 80.8, maxLon: -66.8
  },
  {
    date: '2021-12-04', type: 'total', greatestUTC: '07:34:38',
    magnitude: 1.037, centralDuration: '01m54s',
    region: '南极洲、南非、南大西洋',
    centralPath: '南极洲',
    sarosSeries: 152, maxLat: -76.8, maxLon: -46.2
  },
  {
    date: '2022-04-30', type: 'partial', greatestUTC: '20:42:36',
    magnitude: 0.640, centralDuration: null,
    region: '东南太平洋、南美南部',
    centralPath: null,
    sarosSeries: 119, maxLat: -62.1, maxLon: -71.5
  },
  {
    date: '2022-10-25', type: 'partial', greatestUTC: '11:01:19',
    magnitude: 0.862, centralDuration: null,
    region: '欧洲、东北非、中东、西亚',
    centralPath: null,
    sarosSeries: 124, maxLat: 61.6, maxLon: 77.4
  },
  {
    date: '2023-04-20', type: 'hybrid', greatestUTC: '04:17:55',
    magnitude: 1.013, centralDuration: '01m16s',
    region: '东南亚、东印度群岛、澳大利亚、菲律宾、新西兰',
    centralPath: '印度尼西亚、澳大利亚、巴布亚新几内亚',
    sarosSeries: 129, maxLat: -9.5, maxLon: 125.8
  },
  {
    date: '2023-10-14', type: 'annular', greatestUTC: '18:00:40',
    magnitude: 0.952, centralDuration: '05m17s',
    region: '北美洲、中美洲、南美洲',
    centralPath: '美国西部、中美洲、哥伦比亚、巴西',
    sarosSeries: 134, maxLat: 11.4, maxLon: -83.1
  },
  {
    date: '2024-04-08', type: 'total', greatestUTC: '18:18:29',
    magnitude: 1.057, centralDuration: '04m28s',
    region: '北美洲、中美洲',
    centralPath: '墨西哥、美国中部、加拿大东部',
    sarosSeries: 139, maxLat: 25.3, maxLon: -104.1
  },
  {
    date: '2024-10-02', type: 'annular', greatestUTC: '18:46:13',
    magnitude: 0.933, centralDuration: '07m25s',
    region: '太平洋、南美南部',
    centralPath: '智利南部、阿根廷南部',
    sarosSeries: 144, maxLat: -22.0, maxLon: -114.3
  },
  {
    date: '2025-03-29', type: 'partial', greatestUTC: '10:48:36',
    magnitude: 0.938, centralDuration: null,
    region: '西北非、欧洲、俄罗斯北部',
    centralPath: null,
    sarosSeries: 149, maxLat: 71.0, maxLon: 29.1
  },
  {
    date: '2025-09-21', type: 'partial', greatestUTC: '19:43:04',
    magnitude: 0.855, centralDuration: null,
    region: '南太平洋、新西兰、南极洲',
    centralPath: null,
    sarosSeries: 154, maxLat: -60.9, maxLon: -121.4
  },
  {
    date: '2026-02-17', type: 'annular', greatestUTC: '12:13:05',
    magnitude: 0.963, centralDuration: '02m20s',
    region: '阿根廷南部与智利南部、南非、南极洲',
    centralPath: '南极洲',
    sarosSeries: 121, maxLat: -64.7, maxLon: -56.5
  },
  {
    date: '2026-08-12', type: 'total', greatestUTC: '17:47:05',
    magnitude: 1.039, centralDuration: '02m18s',
    region: '北美北部、西非、欧洲',
    centralPath: '北极、格陵兰、冰岛、西班牙',
    sarosSeries: 126, maxLat: 65.2, maxLon: -36.9
  },
  {
    date: '2027-02-06', type: 'annular', greatestUTC: '16:00:47',
    magnitude: 0.928, centralDuration: '07m51s',
    region: '南美洲、南极洲、西非与南非',
    centralPath: '智利、阿根廷、大西洋',
    sarosSeries: 131, maxLat: -31.3, maxLon: -14.3
  },
  {
    date: '2027-08-02', type: 'total', greatestUTC: '10:07:49',
    magnitude: 1.079, centralDuration: '06m23s',
    region: '非洲、欧洲、中东、西亚与南亚',
    centralPath: '摩洛哥、西班牙、阿尔及利亚、利比亚、埃及、沙特阿拉伯、也门、索马里',
    sarosSeries: 136, maxLat: 25.5, maxLon: 33.2
  },
  {
    date: '2028-01-26', type: 'annular', greatestUTC: '15:08:58',
    magnitude: 0.921, centralDuration: '10m27s',
    region: '北美东部、中南美洲、西欧、西北非',
    centralPath: '厄瓜多尔、秘鲁、巴西、苏里南、西班牙、葡萄牙',
    sarosSeries: 141, maxLat: 0.2, maxLon: -39.1
  },
  {
    date: '2028-07-22', type: 'total', greatestUTC: '02:56:39',
    magnitude: 1.056, centralDuration: '05m10s',
    region: '东南亚、东印度群岛、澳大利亚、新西兰',
    centralPath: '澳大利亚、新西兰',
    sarosSeries: 146, maxLat: -15.6, maxLon: 119.0
  },
  {
    date: '2029-01-14', type: 'partial', greatestUTC: '17:13:47',
    magnitude: 0.871, centralDuration: null,
    region: '北美洲、中美洲',
    centralPath: null,
    sarosSeries: 151, maxLat: 51.5, maxLon: -80.0
  },
  {
    date: '2029-06-12', type: 'partial', greatestUTC: '04:06:13',
    magnitude: 0.458, centralDuration: null,
    region: '北极、斯堪的纳维亚、阿拉斯加、北亚、加拿大北部',
    centralPath: null,
    sarosSeries: 118, maxLat: 66.7, maxLon: -154.8
  },
  {
    date: '2029-07-11', type: 'partial', greatestUTC: '15:37:18',
    magnitude: 0.230, centralDuration: null,
    region: '智利南部、阿根廷南部',
    centralPath: null,
    sarosSeries: 156, maxLat: -56.8, maxLon: -71.8
  },
  {
    date: '2029-12-05', type: 'partial', greatestUTC: '15:03:57',
    magnitude: 0.891, centralDuration: null,
    region: '阿根廷南部、智利南部、南极洲',
    centralPath: null,
    sarosSeries: 123, maxLat: -52.6, maxLon: -46.8
  },
  {
    date: '2030-06-01', type: 'annular', greatestUTC: '06:29:13',
    magnitude: 0.944, centralDuration: '05m21s',
    region: '欧洲、北非、中东、亚洲、北极、阿拉斯加',
    centralPath: '阿尔及利亚、突尼斯、希腊、土耳其、俄罗斯、中国北部、日本',
    sarosSeries: 128, maxLat: 33.4, maxLon: 15.4
  },
  {
    date: '2030-11-25', type: 'total', greatestUTC: '06:51:37',
    magnitude: 1.047, centralDuration: '03m44s',
    region: '南非、印度洋南部、东印度群岛、澳大利亚、南极洲',
    centralPath: '博茨瓦纳、南非、澳大利亚',
    sarosSeries: 133, maxLat: -31.3, maxLon: 56.3
  },
];

/** 月食事件 (2020-2030) — 共25次 */
export const LUNAR_ECLIPSE_EVENTS: LunarEclipseEvent[] = [
  {
    date: '2020-01-10', type: 'penumbral', greatestUTC: '19:11:11',
    umbralMagnitude: -0.116, partialDuration: null, totalDuration: null,
    region: '欧洲、非洲、亚洲、澳大利亚', sarosSeries: 144
  },
  {
    date: '2020-06-05', type: 'penumbral', greatestUTC: '19:26:14',
    umbralMagnitude: -0.405, partialDuration: null, totalDuration: null,
    region: '欧洲、非洲、亚洲、澳大利亚', sarosSeries: 111
  },
  {
    date: '2020-07-05', type: 'penumbral', greatestUTC: '04:31:12',
    umbralMagnitude: -0.644, partialDuration: null, totalDuration: null,
    region: '美洲、西南欧、非洲', sarosSeries: 149
  },
  {
    date: '2020-11-30', type: 'penumbral', greatestUTC: '09:44:01',
    umbralMagnitude: -0.262, partialDuration: null, totalDuration: null,
    region: '亚洲、澳大利亚、太平洋、美洲', sarosSeries: 116
  },
  {
    date: '2021-05-26', type: 'total', greatestUTC: '11:19:53',
    umbralMagnitude: 1.009, partialDuration: '03h07m', totalDuration: '00h15m',
    region: '东亚、澳大利亚、太平洋、美洲', sarosSeries: 121
  },
  {
    date: '2021-11-19', type: 'partial', greatestUTC: '09:04:06',
    umbralMagnitude: 0.974, partialDuration: '03h28m', totalDuration: null,
    region: '美洲、北欧、东亚、澳大利亚、太平洋', sarosSeries: 126
  },
  {
    date: '2022-05-16', type: 'total', greatestUTC: '04:12:42',
    umbralMagnitude: 1.414, partialDuration: '03h27m', totalDuration: '01h25m',
    region: '美洲、欧洲、非洲', sarosSeries: 131
  },
  {
    date: '2022-11-08', type: 'total', greatestUTC: '11:00:22',
    umbralMagnitude: 1.359, partialDuration: '03h40m', totalDuration: '01h25m',
    region: '亚洲、澳大利亚、太平洋、美洲', sarosSeries: 136
  },
  {
    date: '2023-05-05', type: 'penumbral', greatestUTC: '17:24:05',
    umbralMagnitude: -0.046, partialDuration: null, totalDuration: null,
    region: '非洲、亚洲、澳大利亚', sarosSeries: 141
  },
  {
    date: '2023-10-28', type: 'partial', greatestUTC: '20:15:18',
    umbralMagnitude: 0.122, partialDuration: '01h17m', totalDuration: null,
    region: '东美洲、欧洲、非洲、亚洲、澳大利亚', sarosSeries: 146
  },
  {
    date: '2024-03-25', type: 'penumbral', greatestUTC: '07:13:59',
    umbralMagnitude: -0.132, partialDuration: null, totalDuration: null,
    region: '美洲', sarosSeries: 113
  },
  {
    date: '2024-09-18', type: 'partial', greatestUTC: '02:45:25',
    umbralMagnitude: 0.085, partialDuration: '01h03m', totalDuration: null,
    region: '美洲、欧洲、非洲', sarosSeries: 118
  },
  {
    date: '2025-03-14', type: 'total', greatestUTC: '06:59:56',
    umbralMagnitude: 1.178, partialDuration: '03h38m', totalDuration: '01h05m',
    region: '太平洋、美洲、西欧、西非', sarosSeries: 123
  },
  {
    date: '2025-09-07', type: 'total', greatestUTC: '18:12:58',
    umbralMagnitude: 1.362, partialDuration: '03h29m', totalDuration: '01h22m',
    region: '欧洲、非洲、亚洲、澳大利亚', sarosSeries: 128
  },
  {
    date: '2026-03-03', type: 'total', greatestUTC: '11:34:52',
    umbralMagnitude: 1.151, partialDuration: '03h27m', totalDuration: '00h58m',
    region: '东亚、澳大利亚、太平洋、美洲', sarosSeries: 133
  },
  {
    date: '2026-08-28', type: 'partial', greatestUTC: '04:14:04',
    umbralMagnitude: 0.930, partialDuration: '03h18m', totalDuration: null,
    region: '东太平洋、美洲、欧洲、非洲', sarosSeries: 138
  },
  {
    date: '2027-02-20', type: 'penumbral', greatestUTC: '23:14:06',
    umbralMagnitude: -0.057, partialDuration: null, totalDuration: null,
    region: '美洲、欧洲、非洲、亚洲', sarosSeries: 143
  },
  {
    date: '2027-07-18', type: 'penumbral', greatestUTC: '16:04:09',
    umbralMagnitude: -1.068, partialDuration: null, totalDuration: null,
    region: '东非、亚洲、澳大利亚、太平洋', sarosSeries: 110
  },
  {
    date: '2027-08-17', type: 'penumbral', greatestUTC: '07:14:59',
    umbralMagnitude: -0.525, partialDuration: null, totalDuration: null,
    region: '太平洋、美洲', sarosSeries: 148
  },
  {
    date: '2028-01-12', type: 'partial', greatestUTC: '04:14:13',
    umbralMagnitude: 0.066, partialDuration: '00h56m', totalDuration: null,
    region: '美洲、欧洲、非洲', sarosSeries: 115
  },
  {
    date: '2028-07-06', type: 'partial', greatestUTC: '18:20:57',
    umbralMagnitude: 0.389, partialDuration: '02h21m', totalDuration: null,
    region: '欧洲、非洲、亚洲、澳大利亚', sarosSeries: 120
  },
  {
    date: '2028-12-31', type: 'total', greatestUTC: '16:53:15',
    umbralMagnitude: 1.246, partialDuration: '03h29m', totalDuration: '01h11m',
    region: '欧洲、非洲、亚洲、澳大利亚、太平洋', sarosSeries: 125
  },
  {
    date: '2029-06-26', type: 'total', greatestUTC: '03:23:22',
    umbralMagnitude: 1.844, partialDuration: '03h40m', totalDuration: '01h42m',
    region: '美洲、欧洲、非洲、中东', sarosSeries: 130
  },
  {
    date: '2029-12-20', type: 'total', greatestUTC: '22:43:12',
    umbralMagnitude: 1.117, partialDuration: '03h33m', totalDuration: '00h54m',
    region: '美洲、欧洲、非洲、亚洲', sarosSeries: 135
  },
  {
    date: '2030-06-15', type: 'partial', greatestUTC: '18:34:34',
    umbralMagnitude: 0.502, partialDuration: '02h24m', totalDuration: null,
    region: '欧洲、非洲、亚洲、澳大利亚', sarosSeries: 140
  },
  {
    date: '2030-12-09', type: 'penumbral', greatestUTC: '22:28:51',
    umbralMagnitude: -0.163, partialDuration: null, totalDuration: null,
    region: '美洲、欧洲、非洲、亚洲', sarosSeries: 145
  },
];

/** 根据日期获取最近的日食事件 */
export function getNearestSolarEclipse(date: Date): SolarEclipseEvent | null {
  const t = date.getTime();
  let nearest: SolarEclipseEvent | null = null;
  let minDiff = Infinity;
  for (const e of SOLAR_ECLIPSE_EVENTS) {
    const diff = Math.abs(new Date(e.date).getTime() - t);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = e;
    }
  }
  return nearest;
}

/** 根据日期获取最近的月食事件 */
export function getNearestLunarEclipse(date: Date): LunarEclipseEvent | null {
  const t = date.getTime();
  let nearest: LunarEclipseEvent | null = null;
  let minDiff = Infinity;
  for (const e of LUNAR_ECLIPSE_EVENTS) {
    const diff = Math.abs(new Date(e.date).getTime() - t);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = e;
    }
  }
  return nearest;
}

/** 获取指定时间窗口内的所有日食/月食 */
export function getEclipsesInRange(startDate: Date, endDate: Date): {
  solar: SolarEclipseEvent[];
  lunar: LunarEclipseEvent[];
} {
  const start = startDate.getTime();
  const end = endDate.getTime();
  return {
    solar: SOLAR_ECLIPSE_EVENTS.filter(e => {
      const t = new Date(e.date).getTime();
      return t >= start && t <= end;
    }),
    lunar: LUNAR_ECLIPSE_EVENTS.filter(e => {
      const t = new Date(e.date).getTime();
      return t >= start && t <= end;
    }),
  };
}

/** 格式化日食类型为中文 */
export function formatSolarEclipseType(type: SolarEclipseEvent['type'], lang: 'zh' | 'en'): string {
  const map: Record<SolarEclipseEvent['type'], Record<'zh' | 'en', string>> = {
    total: { zh: '日全食', en: 'Total Solar Eclipse' },
    annular: { zh: '日环食', en: 'Annular Solar Eclipse' },
    hybrid: { zh: '全环食', en: 'Hybrid Solar Eclipse' },
    partial: { zh: '日偏食', en: 'Partial Solar Eclipse' },
  };
  return map[type][lang];
}

/** 格式化月食类型为中文 */
export function formatLunarEclipseType(type: LunarEclipseEvent['type'], lang: 'zh' | 'en'): string {
  const map: Record<LunarEclipseEvent['type'], Record<'zh' | 'en', string>> = {
    total: { zh: '月全食', en: 'Total Lunar Eclipse' },
    partial: { zh: '月偏食', en: 'Partial Lunar Eclipse' },
    penumbral: { zh: '半影月食', en: 'Penumbral Lunar Eclipse' },
  };
  return map[type][lang];
}
