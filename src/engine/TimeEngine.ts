/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 历元 J2000.0 的 UTC 时间戳 (2000-01-01T12:00:00Z)
 */
export const J2000_TIMESTAMP = 946728000000;

export class TimeEngine {
  /**
   * 计算指定时间戳距离历元 J2000.0 的日子数 (d)
   */
  static getDaysSinceJ2000(timestamp: number): number {
    return (timestamp - J2000_TIMESTAMP) / 86400000;
  }

  /**
   * ΔT = TT - UTC (seconds).
   * Simplified formula from Meeus for 2000–2100.
   */
  static getDeltaT(timestamp: number): number {
    const year = new Date(timestamp).getUTCFullYear();
    // Meeus simplified: ΔT ≈ 64.3 + 0.5 * (year - 2000) seconds
    return 64.3 + 0.5 * (year - 2000);
  }

  /** Terrestrial Time (TT) from UTC timestamp (ms) */
  static getTT(timestamp: number): number {
    return timestamp + this.getDeltaT(timestamp) * 1000;
  }

  /** Barycentric Dynamical Time (TDB) ≈ TT for browser-level precision */
  static getTDB(timestamp: number): number {
    return this.getTT(timestamp);
  }

  /** UT1 ≈ UTC (ms). Without EOP data we use UTC as best approximation. */
  static getUT1(timestamp: number): number {
    return timestamp;
  }

  /** TDB days since J2000.0 */
  static getDaysSinceJ2000TDB(timestamp: number): number {
    return (this.getTDB(timestamp) - J2000_TIMESTAMP) / 86400000;
  }

  /** UT1 days since J2000.0 */
  static getDaysSinceJ2000UT1(timestamp: number): number {
    return (this.getUT1(timestamp) - J2000_TIMESTAMP) / 86400000;
  }

  /**
   * 将当前秒数/倍速转换，获取递增后的新时间戳
   * @param currentTimestamp 当前模拟的时间戳 (ms)
   * @param speedMultiplier 倍速因子 (1 代表真实流速，86400代表一秒过去一天)
   * @param deltaIsSeconds 真实时间流逝的秒数 (例如 requestAnimationFrame 的 delta 毫秒数 / 1000)
   */
  static tick(currentTimestamp: number, speedMultiplier: number, deltaTimeSeconds: number): number {
    return currentTimestamp + speedMultiplier * deltaTimeSeconds * 1000;
  }

  /**
   * 根据时间戳计算协调世界时中的恒星时 (Local Sidereal Time, 针对观测经度)
   * 进而计算在指定地理经度处的地面恒星投影相位
   * @param timestamp 当前UTC时间戳
   * @param longitude 观测者经度 (度)
   */
  static getLocalSiderealTime(timestamp: number, longitude: number): number {
    // GMST 基于 UT1 计算（地球自转使用 UT1 时标）
    const d = this.getDaysSinceJ2000UT1(timestamp);
    // 零子午线处的格林尼治平均恒星时 (GMST) 近似公式 (以小时为单位)
    // GMST = 18.697374558 + 24.06570982441908 * d
    let gmst = (18.697374558 + 24.06570982441908 * d) % 24;
    if (gmst < 0) gmst += 24;

    // 换算成本地恒星时 (LST)
    let lst = gmst + longitude / 15;
    lst = lst % 24;
    if (lst < 0) lst += 24;
    return lst; // 返回小时数 (0 ~ 24)
  }

  /**
   * 将一个UTC时间戳，转换为指定时区下同一天特定小时的UTC时间戳
   * @param dateTimestamp UTC时间戳 (毫秒)
   * @param localHour 指定的本地小时数 (如 20.5 代表晚上 20:30)
   * @param timezoneOffset 时区偏移小时数 (如 8 代表 UTC+8)
   */
  static getTimestampForLocalHour(dateTimestamp: number, localHour: number, timezoneOffset: number): number {
    const localMs = dateTimestamp + timezoneOffset * 3600 * 1000;
    const localDate = new Date(localMs);
    
    const year = localDate.getUTCFullYear();
    const month = localDate.getUTCMonth();
    const date = localDate.getUTCDate();
    
    const hour = Math.floor(localHour);
    const minutes = Math.round((localHour - hour) * 60);
    
    const targetLocalMs = Date.UTC(year, month, date, hour, minutes, 0, 0);
    return targetLocalMs - timezoneOffset * 3600 * 1000;
  }
}
