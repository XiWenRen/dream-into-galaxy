/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CELESTIAL_PHYSICS } from './OrbitEngine';

/**
 * 统一渲染比例尺系统
 *
 * 核心原则：
 * 1. OrbitEngine 始终输出真实物理坐标 (AU)
 * 2. 所有天体通过 ScaleEngine 统一转换为场景单位
 * 3. 距离和大小使用同一套比例尺，确保几何一致性
 *
 * 基础比例尺：1 AU = 22 场景单位
 * 验证：太阳半径 696,340 km，日地距离 149,597,870 km
 * 严格物理太阳半径 = (696340 / 149597870) * 22 ≈ 0.1025 units
 * 日地距离 = 1 * 22 = 22 units
 * 能排下 22 / (0.1025 * 2) ≈ 107.3 ≈ 108 个太阳
 */

export const BASE_AU_SCALE = 22.0;
export const KM_PER_AU = 149597870.7;

export class ScaleEngine {
  /**
   * 将天文单位 (AU) 转换为场景单位
   */
  static fromAU(au: number): number {
    return au * BASE_AU_SCALE;
  }

  /**
   * 将千米 (km) 转换为场景单位
   * 基于 1 AU = 149,597,870.7 km 的物理关系
   */
  static fromKM(km: number): number {
    return (km / KM_PER_AU) * BASE_AU_SCALE;
  }

  /**
   * 获取天体的严格物理半径（场景单位）
   * @param id 天体ID
   */
  static getStrictRadius(id: string): number {
    const phys = CELESTIAL_PHYSICS[id as keyof typeof CELESTIAL_PHYSICS];
    if (!phys) return 0;
    return ScaleEngine.fromKM(phys.radius);
  }

  /**
   * 获取天体的可观测模式半径（场景单位）
   * 在严格物理基础上适当放大，保证可见性和可交互性
   */
  static getObservableRadius(id: string): number {
    const strictRadius = ScaleEngine.getStrictRadius(id);
    if (strictRadius <= 0) return 0.03;

    // 放大策略：基于严格物理半径按比例放大，但设置最小可见阈值
    // 太阳保持相对较小（本身已足够大），小行星放大更多
    const MIN_VISIBLE_RADIUS = 0.03;

    switch (id) {
      case 'sun':
        return Math.max(strictRadius * 2.26, 0.03);
      case 'jupiter':
        return Math.max(strictRadius * 25, 0.54);
      case 'saturn':
        return Math.max(strictRadius * 25, 0.46);
      case 'uranus':
        return Math.max(strictRadius * 40, 0.28);
      case 'neptune':
        return Math.max(strictRadius * 40, 0.26);
      case 'earth':
        return Math.max(strictRadius * 60, 0.11);
      case 'venus':
        return Math.max(strictRadius * 60, 0.10);
      case 'mars':
        return Math.max(strictRadius * 60, 0.07);
      case 'mercury':
        return Math.max(strictRadius * 60, 0.06);
      case 'moon':
        return Math.max(strictRadius * 60, 0.03);
      default:
        return Math.max(strictRadius * 60, MIN_VISIBLE_RADIUS);
    }
  }

  /**
   * 获取天体半径（根据模式选择严格物理或可观测）
   */
  static getRadius(id: string, strictPhysics: boolean): number {
    return strictPhysics ? ScaleEngine.getStrictRadius(id) : ScaleEngine.getObservableRadius(id);
  }

  /**
   * 计算两个天体之间能排下多少个某基准天体
   * 用于宇宙尺度验证
   */
  static getPackingCount(
    distanceAU: number,
    bodyRadiusKm: number,
    strictPhysics: boolean
  ): number {
    const distScene = ScaleEngine.fromAU(distanceAU);
    const bodyRadiusScene = strictPhysics
      ? ScaleEngine.fromKM(bodyRadiusKm)
      : ScaleEngine.getObservableRadiusByRadiusKm(bodyRadiusKm);
    return bodyRadiusScene > 0 ? distScene / (bodyRadiusScene * 2) : 0;
  }

  /**
   * 辅助：通过 km 半径计算可观测模式半径
   */
  private static getObservableRadiusByRadiusKm(radiusKm: number): number {
    const strictRadius = ScaleEngine.fromKM(radiusKm);
    return Math.max(strictRadius * 60, 0.03);
  }
}
