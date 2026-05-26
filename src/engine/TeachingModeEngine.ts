import * as THREE from 'three';

export class TeachingModeEngine {
  // 教学模式下的星体固定展示大小 (场景单位)
  static SIZES: Record<string, number> = {
    sun: 3.5,
    mercury: 0.3,
    venus: 0.4,
    earth: 0.45,
    moon: 0.15,
    mars: 0.35,
    jupiter: 1.2,
    saturn: 1.0,
    uranus: 0.7,
    neptune: 0.7,
  };

  // 教学模式下的轨道平均半径 (场景单位)
  static DISTANCES: Record<string, number> = {
    mercury: 8,
    venus: 14,
    earth: 20,
    mars: 26,
    jupiter: 36,
    saturn: 48,
    uranus: 60,
    neptune: 72,
  };

  // 真实轨道的半长轴 (AU)
  static REAL_SEMI_MAJOR_AXIS: Record<string, number> = {
    mercury: 0.387,
    venus: 0.723,
    earth: 1.0,
    mars: 1.524,
    jupiter: 5.203,
    saturn: 9.537,
    uranus: 19.191,
    neptune: 30.069,
  };

  static MOON_DISTANCE = 1.5;

  /**
   * 获取教学模式下的星体半径
   */
  static getRadius(id: string): number {
    return this.SIZES[id.toLowerCase()] || 0.2;
  }

  /**
   * 获取教学模式下该星体的轨道缩放比例 (Teaching / Real)
   */
  static getOrbitScaleFactor(id: string): number {
    if (id.toLowerCase() === 'sun' || id.toLowerCase() === 'moon') return 1.0;
    const teachingDist = this.DISTANCES[id.toLowerCase()] || 20;
    const realDistAU = this.REAL_SEMI_MAJOR_AXIS[id.toLowerCase()] || 1.0;
    const realDistScene = realDistAU * 22.0; // BASE_AU_SCALE
    return teachingDist / realDistScene;
  }

  /**
   * 获取教学模式下的日心坐标 (等比例缩放真实的椭圆轨道)
   */
  static getHeliocentricPosition(id: string, realPos: THREE.Vector3): THREE.Vector3 {
    if (id.toLowerCase() === 'sun') {
      return new THREE.Vector3(0, 0, 0);
    }
    const scale = this.getOrbitScaleFactor(id);
    return realPos.clone().multiplyScalar(scale);
  }

  /**
   * 获取教学模式下的月球/卫星相对坐标 (基于真实的公转方向进行距离压缩)
   */
  static getRelativePosition(id: string, realRelPos: THREE.Vector3, parentId: string): THREE.Vector3 {
    let dist = 1.0;
    if (parentId === 'earth' && id === 'moon') {
      dist = this.MOON_DISTANCE;
    } else {
      // 其他卫星的默认教学距离，设为母星半径的 1.5 到 2.5 倍
      dist = (this.SIZES[parentId] || 0.5) * 2.0;
    }
    
    const direction = realRelPos.clone().normalize();
    return direction.multiplyScalar(dist);
  }
}
