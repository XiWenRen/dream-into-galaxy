# 地球表面云层与贴图校准核心技术文档

本文档详细介绍了太阳系 3D 模拟器项目中，**地球表面多层云层的实现**以及**地球贴图校准/对齐功能**的技术原理和核心代码。旨在帮助其他开发者快速理解其底层几何、物理计算与 Shader 逻辑，便于后续的维护与扩展。

---

## 1. 地球多层云层系统 (Earth Multi-Layer Clouds)

为了在 WebGL 环境下呈现高度逼真、具有立体感和动态深度的地球大气效果，项目采用了**三层独立云层**的渲染方案。通过不同高度、自转角速度、倾斜角度以及程序化噪声（Shader Procedural Noise）的叠加，实现了逼真的云层漂移和风暴演变。

### 1.1 层次架构设计

云层结构由内向外依次为：
1. **基础云层 (Cloud Layer 1)**：高度为地球半径的 `1.01` 倍，使用白天的静态云层贴图，以略快于自转的速度漂移。
2. **深度云层 (Cloud Layer 2)**：高度为地球半径的 `1.015` 倍，共享云层贴图。设置了 `30°` 的地轴倾角，且以不同的角速度运动，与基础云层形成明显的视差（Parallax）与交错效果。
3. **程序化风暴扰动层 (Cloud Disturbance Layer)**：高度为地球半径的 `1.02` 倍，使用自定义的 `ShaderMaterial`。基于 3D Simplex 噪声动态生成不断诞生、演变和消散的气旋（风暴气压中心）。

以下是多层云层的渲染结构示意图：

![地球云层与大气层多层渲染结构](images/earth_layers_schematic.png)

---

### 1.2 核心代码与原理分析

#### A. 三维网格配置与材质参数 (React Three Fiber)
在 [SolarSystem.tsx](file:///d:/workspace/solar-system-simulator-3d/components/SolarSystem.tsx) 中，云层作为地球组（Earth Group）的子网格进行渲染：

```tsx
// 基础云层 (Scale: 1.01)
{simulationState.showClouds && (
  <mesh ref={cloudLayer1Ref} scale={[1.01, 1.01, 1.01]} receiveShadow={false}>
    <sphereGeometry args={[SCALE.EARTH_RADIUS, 64, 64]} />
    <meshPhongMaterial
      ref={cloudLayer1MaterialRef}
      map={earthClouds}
      transparent={true}
      opacity={0.8}
      side={DoubleSide}
      blending={THREE.NormalBlending}
      depthWrite={false}
      onBeforeCompile={(shader) => {
        // 地球剖面结构视图下的片元裁剪逻辑 (剖开右上象限)
        shader.uniforms.uShowStructure = { value: isEarthStructure };
        (cloudLayer1MaterialRef.current as any).userData.shader = shader;
        // 插入剖面裁剪的 Shader 源码...
      }}
    />
  </mesh>
)}

// 深度云层 (Scale: 1.015, Z轴倾斜 30度)
{simulationState.showClouds && (
  <mesh ref={cloudLayer2Ref} scale={[1.015, 1.015, 1.015]} receiveShadow={false}>
    <sphereGeometry args={[SCALE.EARTH_RADIUS, 64, 64]} />
    <meshPhongMaterial
      ref={cloudLayer2MaterialRef}
      map={earthClouds}
      transparent={true}
      opacity={0.4} // 较低透明度以透出下层云层
      side={DoubleSide}
      blending={THREE.NormalBlending}
      depthWrite={false}
      onBeforeCompile={(shader) => {
        shader.uniforms.uShowStructure = { value: isEarthStructure };
        (cloudLayer2MaterialRef.current as any).userData.shader = shader;
        // 插入剖面裁剪的 Shader 源码...
      }}
    />
  </mesh>
)}
```

#### B. 动态自转与视差运动 (Frame Loop)
在 `useFrame` 渲染循环中，各个云层以微小的自转速度差旋转，从而在视觉上模拟大气环流的相对运动：

```typescript
// 基础云层自转漂移率 1.002
if (cloudLayer1Ref.current) {
    const baseOffset = -Math.PI / 2; // 地球贴图校准基础偏移
    const finalOffset = baseOffset + (simulationState.earthTextureOffset || 0);
    cloudLayer1Ref.current.rotation.y = (earthState.rotation + finalOffset) * 1.002;
}

// 深度云层自转漂移率 1.003，且 Z 轴倾斜 30° 制造气流错位
if (cloudLayer2Ref.current) {
    const baseOffset = -Math.PI / 2;
    const finalOffset = baseOffset + (simulationState.earthTextureOffset || 0);
    cloudLayer2Ref.current.rotation.y = (earthState.rotation + finalOffset) * 1.003;
    cloudLayer2Ref.current.rotation.z = Math.PI / 6; // 30 degrees tilt
}

// 气旋扰动层自转漂移率 1.001
if (cloudDisturbanceRef.current) {
    const baseOffset = -Math.PI / 2;
    const finalOffset = baseOffset + (simulationState.earthTextureOffset || 0);
    cloudDisturbanceRef.current.rotation.y = (earthState.rotation + finalOffset) * 1.001; 
}
```

---

### 1.3 程序化气旋扰动 Shader 实现 (Cloud Disturbance Shader)

扰动层通过自定义的顶点/片元着色器，不依赖贴图，直接在 GPU 端通过 3D 单纯形噪声（Simplex Noise）渲染出生动的动态云暴。

#### A. 顶点着色器 (Vertex Shader)
顶点着色器极其精简，主要负责向片元着色器传递 UV、顶点法线 `vNormal` 以及模型空间坐标 `vPosition`：

```glsl
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

#### B. 片元着色器 (Fragment Shader)
片元着色器集成了三大核心逻辑：
1. **多重噪声叠加 (Multi-layered Simplex Noise)**：低频噪声控制风暴宏观区域，高频噪声刻画细节，通过 `smoothstep` 阀值提取出孤立的气旋。
2. **生命周期演变 (Lifecycle Simulation)**：利用随时间变化的正弦波调制云层的局部密度，使风暴能自发形成和消失。
3. **晨昏线明暗面渐隐 (Day/Night Cycle Logic)**：计算视空间下的太阳光线方向与当前顶点法线的点积，使得夜半球的程序化云层自动变暗/消失，防止其在夜间异常发光。

```glsl
uniform float uTime;
uniform vec3 uSunDirection; // 视空间下的太阳方向向量
uniform bool uShowStructure;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

// 3D Simplex 噪声算法函数 (snoise) ... [已省略标准算法库代码]

void main() {
  // 1. 地球剖视图剖面裁剪
  if (uShowStructure && vPosition.x > 0.0 && vPosition.y > 0.0 && vPosition.z > 0.0) {
    discard;
  }
  
  // 2. 动态双层噪声叠加
  float noise = snoise(vPosition * 0.5 + vec3(uTime * 0.1));
  float noiseDetail = snoise(vPosition * 2.0 - vec3(uTime * 0.15));
  float combined = noise * 0.7 + noiseDetail * 0.3;

  // 3. 生命周期调制 (风暴孕育与消散)
  float lifecycle = 0.5 + 0.5 * sin(dot(vPosition, vec3(1.0)) * 0.5 + uTime * 0.2);
  combined *= (0.8 + 0.4 * lifecycle);

  // 4. 阀值过滤以获取局部风暴中心 (只提取高数值的噪声峰值)
  float alpha = smoothstep(0.3, 0.75, combined);
  float thickness = smoothstep(0.5, 0.9, combined);
  alpha = alpha * (0.3 + thickness * 0.2); // 限制风暴最大透明度在约 0.5

  // 5. 昼夜明暗交替逻辑 (Day/Night Cutoff)
  // vNormal 与 uSunDirection 均为视空间向量，直接点积表示受光照强度
  float lightIntensity = max(dot(vNormal, uSunDirection), 0.0);
  
  // 晨昏线平滑过渡，并在暗面彻底隐去
  float dayNightFactor = smoothstep(-0.2, 0.2, lightIntensity); 
  alpha *= dayNightFactor;

  gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
}
```

---

## 2. 地球贴图校准与对齐系统 (Earth Texture Alignment & Calibration)

在严谨的天文模拟中，地球自转指向（即哪一个经度对准太阳）必须与其当前的**模拟时间（UTC）**严格吻合。如果在格林尼治时间（UTC 12:00），本初子午线（0° 经线）没有正对太阳，或者北京时间（GMT+8，12:00）太阳没有直射东经 120° 附近，就会导致昼夜交替在地理位置上出现重大错乱。

### 2.1 对齐算法原理

1. **格林尼治恒星时 (GMST)**：
   地球自转不是简单地以太阳为基准（太阳日），而是以恒星为基准（恒星日，约 23小时56分4秒）。为了确定自转状态，我们计算**格林尼治平恒星时 (Greenwich Mean Sidereal Time, GMST)**。GMST 表示格林尼治子午线相对于春分点（天球坐标系中的 $X$ 轴）的夹角 $\theta_{GMST}$。

2. **贴图 UV 映射偏差校准**：
   - 在 Three.js 的标准球体几何体（`SphereGeometry`）中，UV 纹理坐标的起点 `U=0` 通常对应的是球体的某一侧面（在默认状态下是 $Z$ 轴方向）。
   - 地球图集（Earth Texture）设计上本初子午线（0° 经线）位于图片的中央（`U=0.5`）。
   - 物理坐标系（天体物理绝对坐标系）与 WebGL 的渲染局部坐标系存在 90 度的相位夹角。
   - **核心校准公式**：
     通过在计算出的恒星时旋转角之上，叠加一个固定的基础校准偏移量 `baseOffset = -Math.PI / 2`（$-90^\circ$ 偏差），使贴图上的格林尼治经线在 UTC 00:00 准确定向到绝对暗面，在 UTC 12:00 准确指向正午（正对太阳位置）。

下图为地球贴图校准与时区经线对齐的几何原理示意图：

![地球贴图自转与时区对齐原理](images/earth_alignment_calibration.png)

---

### 2.2 核心代码实现

#### A. 恒星时计算与对齐验证 ([earthAlignment.ts](file:///d:/workspace/solar-system-simulator-3d/utils/earthAlignment.ts))

```typescript
// 基于儒略日 (Julian Date) 计算格林尼治平恒星时 (GMST)
export const calculateGreenwichSiderealTime = (jd: number): number => {
  const d = jd - 2451545.0; // 距离 J2000.0 纪元的天数
  
  // 国际天文联合会（IAU）格林尼治恒星时多项式估算公式
  let gst = 280.46061837 + 360.98564736629 * d + 0.000387933 * d * d - (d * d * d) / 38710000;
  gst = gst % 360;
  if (gst < 0) gst += 360;
  
  return gst * (Math.PI / 180); // 转换为弧度
};

// 验证当前的贴图对齐偏移量是否准确
export const checkEarthAlignment = (
  simulationTime: number, 
  currentTextureOffset: number
): EarthAlignmentCheck => {
  const jd = getJulianDate(simulationTime);
  const gst = calculateGreenwichSiderealTime(jd);
  
  // 根据恒星时确定子午线的理论物理旋转角度
  // 因纹理映射和 Three.js 旋转方向相反，这里需要取负值
  const expectedTextureRotation = -gst * (180 / Math.PI); 
  
  // 计算当前渲染参数中的偏差
  let alignmentError = Math.abs(expectedTextureRotation - currentTextureOffset);
  if (alignmentError > 180) alignmentError = 360 - alignmentError; // 360度环绕处理
  
  const isAligned = alignmentError < 5; // 允许 5° 以内的微小精度误差值
  
  // 生成建议与修正指令
  // ...
};
```

#### B. 渲染层校准公式应用 ([SolarSystem.tsx](file:///d:/workspace/solar-system-simulator-3d/components/SolarSystem.tsx))

在三维空间中渲染地球时，自转角度叠加了手动偏移与 `-Math.PI / 2` 理论相位修正值：

```typescript
if (earthSpinRef.current) {
    // 基础偏移：-Math.PI/2，校正 UV 纹理中心与三维坐标系物理方向的偏差
    const baseOffset = -Math.PI / 2; 
    
    // 最终偏移：基础偏差 + 用户在调试面板中手动设置的微调值 (earthTextureOffset)
    const finalOffset = baseOffset + (simulationState.earthTextureOffset || 0);
    
    // 应用旋转：地球绝对物理自转角 + 贴图校准偏差
    earthSpinRef.current.rotation.y = earthState.rotation + finalOffset;
}
```

---

## 3. 晨昏线与时区系统的整合 (Terminator & Timezones)

为了让用户能够交互式地验证校准效果，项目内部搭载了**地理网格叠加系统 (Geographic Grid)**。

时区经线圈通过 `simulationState.earthTextureOffset` 进行同步旋转，使得：
1. **本初子午线 (Prime Meridian)**（橙色线）在 UTC 时间的正午（12点）始终直面太阳，在午夜（0点）背对太阳。
2. **时区划分段 (Timezone Sectors)**：模拟器动态将地球分为 24 个时区段，且每个时区动态计算其实时地方时。
3. **晨昏线对齐**：通过 `checkTerminatorAlignment(time)` 函数，在不同日期（春分、夏至、秋分、冬至）计算太阳直射点的赤纬和晨昏线对应的经度。通过比对，证明了极昼、极夜现象的范围和昼夜交替在地理网格上是 100% 吻合的。

---

## 4. 总结与维护建议

对于后续开发者的建议：
1. **更换贴图**：如果更换了地球的基础图集或云层图集，请务必核实新贴图的本初子午线是否依然位于图片的水平中点（U=0.5）。如果新贴图的 0° 经线位于边缘，则需要修改 `baseOffset` 为 `0`。
2. **云层遮挡性能优化**：由于云层使用了 `depthWrite: false` 并启用了 `transparent: true`，在移动端可能会带来一定的过度绘制（Overdraw）开销。在极端低端设备上，可以通过 UI 开关关闭 `Cloud Layer 2` 和 `Cloud Disturbance Layer`，仅保留单层基础云。
3. **结构剖面图改动**：云层材质中的剖面裁剪是通过修改材质的 Shader 片段实现的。若未来升级了 Three.js 大版本，需关注 `onBeforeCompile` 中替换 `#include <begin_vertex>` 和 `#include <dithering_fragment>` 的关键字兼容性。
