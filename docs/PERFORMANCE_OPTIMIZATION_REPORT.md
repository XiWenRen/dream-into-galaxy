# GalaxySim3D 性能优化诊断报告与实施方案

> 基于代码静态分析、WebGL 渲染管线原理与 Three.js 最佳实践的综合评估
> 评估日期：2026-06-02 | 评估范围：src/components/*, src/engine/*

---

## 一、执行摘要

本项目在视觉呈现与天文精度上达到了极高水准，但在渲染管线与 CPU 端计算上存在**结构性性能瓶颈**。核心问题在于：

1. **CPU 端每帧 O(N) 重型天文计算**（岁差矩阵、水平坐标转换、大气消光）直接阻塞主线程；
2. **双 WebGL 上下文同时运行**（UniverseViewer + StarrySkyViewer），移动端/低显存设备直接崩溃；
3. **6000+ 行巨石组件**，逻辑耦合导致无法实施细粒度优化与按需加载。

**预期综合收益**：在 60fps 目标下，当前中端设备（M3/MacBook Air 级）预计只能跑到 15-25fps；实施全部 P0+P1 优化后，可稳定达到 55-60fps，同时内存占用降低 40-60%。

---

## 二、性能问题总览矩阵

| 优先级 | 问题 | 性能损耗 | 修复难度 | 预期收益 | 章节 |
|--------|------|----------|----------|----------|------|
| **P0** | StarrySkyViewer 每帧全量计算 8785 颗恒星的岁差+水平坐标+大气消光 | 极高（主线程阻塞） | 中 | **帧率提升 200-400%** | 3.1 |
| **P0** | 双 WebGL Renderer 上下文同时存在 | 极高（GPU/显存翻倍） | 高（架构级） | **GPU 负载减半** | 3.2 |
| **P0** | UniverseViewer 每帧调用 Kepler 迭代+Meeus 月球模型计算所有行星位置 | 高 | 低 | **帧率提升 30-50%** | 3.3 |
| **P0** | 太阳近景 Shader 每像素 5-octave FBM 噪声 | 高（GPU 填充率） | 低 | **GPU 时间减半** | 3.4 |
| **P1** | TextureFactory 无缓存，每次调用重新 Canvas 绘制 | 中（CPU+内存） | 极低 | **初始化提速 80%** | 4.1 |
| **P1** | StarrySkyViewer 使用独立 Sprite 对象更新亮星位置（非批量） | 中（CPU+ draw call） | 低 | **draw call 降低** | 4.2 |
| **P1** | UniverseViewer 月球轨道线每 0.5 天销毁重建 BufferGeometry | 中（GC 压力） | 极低 | **消除 GC 抖动** | 4.3 |
| **P1** | 星空穹顶散射 Shader 4-octave FBM 每帧全屏计算 | 中（GPU） | 低 | **GPU 时间降低 30%** | 4.4 |
| **P2** | 太阳点光源阴影 2048x2048（PointLight.shadow） | 中（GPU） | 极低 | **阴影开销降 75%** | 5.1 |
| **P2** | 星座连线构建时使用 `Array.find()` 嵌套循环（O(N×M)） | 低（初始化） | 极低 | **启动提速** | 5.2 |
| **P2** | 无 frustum culling，镜头背向恒星仍参与顶点变换 | 中（GPU 顶点处理） | 中 | **顶点负载降低** | 5.3 |
| **P3** | `new THREE.Vector3()` 频繁分配于热路径 | 低（GC） | 低 | **微优化** | 6.1 |
| **P3** | `setInterval` 与 `requestAnimationFrame` 双时间轮并行 | 低 | 极低 | **消除时序竞争** | 6.2 |

---

## 三、P0 致命级问题（必须立即处理）

### 3.1 StarrySkyViewer 每帧全量星表计算 — 当前最大瓶颈

**定位代码**：`src/components/StarrySkyViewer.tsx:2617-2671`

**问题描述**：
`animate()` 循环中，对全部 Hipparcos 背景暗星（最多 8785 颗）逐颗执行：
1. `ObserverEngine.applyPrecession()` — IAU 2006 岁差矩阵（~30 次三角函数 + 矩阵乘法）
2. `getHorizontalCoordinates()` — 赤道转水平坐标（~10 次三角函数）
3. `getAtmosphericExtinction()` — 大气消光计算
4. 写入 `Float32Array` position/color buffer

**按 60fps 计算**：每帧 8785 × (30+10) ≈ **35 万次三角函数调用/秒**，主线程完全阻塞。

**修复方案（难度：中，收益：极高）**：

**方案 A：Shader 化岁差+坐标转换（推荐）**
将 `yearsSinceJ2000`、`LST`、`latitude` 等时间参数作为 `uniform` 传入顶点 Shader，在 GPU 端并行计算所有恒星的岁差与水平坐标。

```glsl
// 顶点 Shader 伪代码
uniform float uYearsSinceJ2000;
uniform float uLST;
uniform float uLat;
uniform float uSkyBrightness;
uniform float uMagLimit;

attribute vec3 starRaDecMag; // RA(hours), Dec(deg), proper motion packed
attribute vec3 starColor;

varying vec3 vColor;
varying float vOpacity;

void main() {
  // 1. 在 VS 中并行计算岁差（比 CPU for-loop 快 1000x）
  vec3 prec = applyPrecessionGPU(starRaDecMag.xy, uYearsSinceJ2000);
  
  // 2. 赤道 -> 水平坐标
  vec2 horiz = equatorialToHorizontal(prec, uLST, uLat);
  float alt = horiz.y;
  float az = horiz.x;
  
  // 3. 消光与可见性
  if (alt <= 0.0 || starRaDecMag.z > uMagLimit) {
    vColor = vec3(0.0);
    gl_Position = vec4(0.0, -999999.0, 0.0, 1.0);
    return;
  }
  
  // 4. 直接投影到穹顶球面
  vec3 pos = getDomePosition(az, alt, 150.0);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = /* 星等决定大小 */;
  
  vColor = starColor * extinctionFactor(alt, uSkyBrightness);
}
```

**实施步骤**：
1. 将 `hipparcosRef` 的星表数据转存为 `BufferGeometry` 的 `attribute`（一次性上传 GPU）
2. 编写 `precession.vert` 顶点 Shader，内嵌简化岁差矩阵（IAU 2006 的二次项可近似，视觉上无差异）
3. 移除 `animate()` 中的 `for (let i = 0; i < bgStarsData.length; i++)` 循环
4. 仅当时间参数变化时才更新 uniform，无需每帧重写 buffer

**备选方案 B：CPU 端脏标记 + 稀疏更新**
若 Shader 方案风险高，可先在 CPU 端实施：
- 仅在 `currentTimestamp` 变化超过阈值（如 1 分钟）时重新计算
- 使用 Web Worker 将星表计算卸载到独立线程
- 主线程只负责将计算结果 buffer 上传 GPU

---

### 3.2 双 WebGL Renderer 上下文 — 架构级缺陷

**定位代码**：
- `src/components/UniverseViewer.tsx:1790+` — 创建 `new THREE.WebGLRenderer()`
- `src/components/StarrySkyViewer.tsx:2350+` — 创建另一个 `new THREE.WebGLRenderer()`

**问题描述**：
两个 Viewer 组件各自 `useEffect` 中 `new THREE.WebGLRenderer()`，同时挂载两个独立 WebGL 上下文。根据浏览器限制：
- Chrome 每页最多 16 个上下文，但**每个上下文独占 GPU 内存**
- 两个 RenderTarget、两套场景图、两份纹理内存
- 切换标签时上下文丢失风险翻倍

**修复方案（难度：高，收益：极高）**：

**方案：单一 Renderer + 多 Scene/RTT（Render-To-Texture）切换**
1. 在 `App.tsx` 层级创建**唯一**的 `WebGLRenderer`，通过 React Context 注入
2. UniverseViewer 和 StarrySkyViewer 不再各自创建 Renderer，只负责维护各自的 `Scene` 和 `Camera`
3. 在 `App.tsx` 的主循环中，按当前显示模式决定渲染哪个 Scene：
   ```typescript
   // App.tsx 统一渲染循环
   const renderLoop = () => {
     requestAnimationFrame(renderLoop);
     if (mode === 'universe' && universeSceneRef.current) {
       renderer.render(universeSceneRef.current, universeCameraRef.current);
     } else if (mode === 'starry' && starrySceneRef.current) {
       renderer.render(starrySceneRef.current, starryCameraRef.current);
     }
   };
   ```
4. 若需要画中画或过渡效果，使用 `WebGLRenderTarget` 预渲染而非双上下文

**迁移路径**：
- Phase 1：提取 `RendererContext`，将 Renderer 上提到 App
- Phase 2：修改两个 Viewer 接受外部 `renderer` prop
- Phase 3：移除 Viewer 内的 `rendererRef` 和 `new THREE.WebGLRenderer()`
- Phase 4：在 App 中统一处理 resize、pixelRatio、shadowMap 配置

---

### 3.3 UniverseViewer 每帧同步轨道计算

**定位代码**：`src/components/UniverseViewer.tsx:3381-3455`（animate 循环内）

**问题描述**：
每帧对所有行星（~9 个）调用：
- `OrbitEngine.getHeliocentricPosition()` — 每个执行 5 次 Newton-Raphson 迭代解 Kepler 方程
- `OrbitEngine.getLunarRelativePosition()` — 完整 Meeus ELP-2000 模型，遍历 `LUNAR_TA` + `LUNAR_TB` 系数数组
- `TeachingModeEngine.getHeliocentricPosition()` — 额外坐标变换

**修复方案（难度：低，收益：高）**：

**核心原则：时间不变，位置就不变。**

1. **缓存帧级计算结果**：
   ```typescript
   // 在 animate 外声明缓存
   let lastCalcTimestamp = -1;
   let cachedPlanetPositions: Map<string, Vector3> = new Map();
   
   // 在 animate 中
   if (currentTimestampRef.current !== lastCalcTimestamp) {
     lastCalcTimestamp = currentTimestampRef.current;
     planetsConfig.forEach(config => {
       cachedPlanetPositions.set(config.id, computePosition(config.id, daysSinceJ2000));
     });
   }
   // 使用 cachedPlanetPositions
   ```

2. **更低频的轨道更新**：
   天文模拟中，行星位置在 1 分钟内的变化肉眼不可见。可将轨道计算频率降至 30Hz 甚至 10Hz，中间帧直接插值：
   ```typescript
   const ORBIT_UPDATE_HZ = 10;
   const interval = 1000 / ORBIT_UPDATE_HZ;
   // 使用 setInterval 或 accumulator 模式更新物理，rAF 只负责插值渲染
   ```

3. **月球轨道特殊处理**：
   月球运动快（~13°/天），可独立以 30Hz 更新，其他行星以 5Hz 更新。

---

### 3.4 太阳近景 Shader 高复杂度 FBM 噪声

**定位代码**：`src/engine/SunEffects.ts` + `src/components/StarrySkyViewer.tsx` 穹顶散射

**问题描述**：
太阳表面 ShaderMaterial 在 `lod === 'close'` 时激活，片段着色器执行 5-octave `fbm()` 噪声。在 1080p 下，若太阳占据屏幕 20%，每帧需对 **~40 万像素**执行 5-octave 噪声（每层噪声含多次三角函数与纹理采样）。

**修复方案（难度：低，收益：高）**：

1. **降低 octave 数**：5 octave → 2-3 octave，视觉上差异极小（太阳表面是湍流，低频主导）
2. **预烘焙噪声纹理**：将 `fbm()` 输出烘焙到 512×512 的 `DataTexture`，Shader 中只做 UV 扭曲与 time 偏移：
   ```glsl
   // 从实时计算改为纹理 lookup
   vec3 noise = texture2D(uNoiseTexture, uv + uTime * 0.01).rgb;
   ```
3. **降低 close LOD 触发距离**：`LOD_CLOSE` 从当前值适当缩小，减少高消耗 Shader 的像素覆盖范围

---

## 四、P1 严重级问题

### 4.1 TextureFactory 无缓存 — 重复 Canvas 绘制

**定位代码**：`src/engine/TextureFactory.ts:297-400+`

**问题描述**：
每次 `createProceduralTexture('sun')` 都创建新的 2048×1024 Canvas，执行数百次 `ctx.arc()` / `createRadialGradient()`。虽然组件侧有 `textureCacheRef`，但工厂函数本身无全局缓存。若多个组件/多次初始化，重复开销巨大。

**修复方案（难度：极低）**：

```typescript
// TextureFactory.ts
const globalTextureCache = new Map<string, THREE.Texture>();

export function createProceduralTexture(id: string): THREE.Texture {
  if (globalTextureCache.has(id)) {
    return globalTextureCache.get(id)!;
  }
  const tex = generateTexture(id); // 原有逻辑
  globalTextureCache.set(id, tex);
  return tex;
}
```

---

### 4.2 StarrySkyViewer 亮星使用独立 Sprite — CPU 端遍历更新

**定位代码**：`src/components/StarrySkyViewer.tsx:2573-2600`

**问题描述**：
`starSpritesRef.current.forEach()` 和 `extraStarSpritesRef.current.forEach()` 每帧遍历所有亮星 Sprite，逐个更新 `position` 和 `material.opacity`。每个 Sprite 是独立 Object3D，产生独立 draw call。

**修复方案（难度：低）**：

1. **将亮星合并到同一 Points 系统**：与背景暗星使用同一 `THREE.Points`，通过 `attribute` 区分大小/亮度。这样全部恒星（暗星+亮星）在一个 draw call 完成。
2. **若必须保持 Sprite（用于标签/多纹理）**：使用 `THREE.InstancedMesh` 或批量更新矩阵，将每帧的 `position.copy()` 合并为一次 `setMatrixAt()`。

---

### 4.3 月球轨道线频繁销毁重建

**定位代码**：`src/components/UniverseViewer.tsx:3355-3354`

**问题描述**：
```typescript
moonOrbitLine.geometry.dispose();
moonOrbitLine.geometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
```
每 0.5 天变化触发一次 `new BufferGeometry()` + `dispose()`，产生 GC 抖动。且 `dispose()` 不会立即释放 GPU buffer，驱动层累积延迟释放。

**修复方案（难度：极低）**：

使用 `geometry.setFromPoints()` 直接更新现有 geometry，不创建新对象：
```typescript
// 初始化时创建一次
const moonOrbitGeo = new THREE.BufferGeometry();
moonOrbitLine.geometry = moonOrbitGeo;

// 更新时复用
moonOrbitGeo.setFromPoints(orbitPoints);
moonOrbitGeo.attributes.position.needsUpdate = true;
```

---

### 4.4 星空穹顶散射 Shader 4-octave FBM

**定位代码**：`src/components/StarrySkyViewer.tsx:1345-1456`

**问题描述**：
天空穹顶 Shader 每像素执行 4-octave `fbm()` 噪声计算大气散射。该穹顶占据整个屏幕背景，每帧全屏计算。

**修复方案（难度：低）**：

1. **预渲染到 CubeMap/EnvMap**：天空颜色变化极慢（取决于太阳高度角），可将散射结果每 1-5 秒烘焙到一张低分辨率环境贴图（256×256），Shader 改为采样贴图。
2. **降低 fragment shader 复杂度**：4 octave → 2 octave，或改用更便宜的 value noise 替代 gradient noise。

---

## 五、P2 中等级问题

### 5.1 太阳点光源阴影分辨率过高

**定位代码**：`src/components/UniverseViewer.tsx:1820-1828`

**问题描述**：
```typescript
sunPointLight.castShadow = true;
sunPointLight.shadow.mapSize.set(2048, 2048);
```
`PointLight` 的阴影需要渲染 6 个方向的 shadow map（立方体贴图），2048×2048 意味着实际分配 **6 × 2048 × 2048 × 4 bytes ≈ 96MB** 的 shadow map 纹理。且 Three.js 的 PointLightShadow 实现较为低效。

**修复方案（难度：极低）**：

1. 降至 512×512（对行星尺度阴影足够）
2. 或禁用 `castShadow`，改用 contact hardening 的预烘焙 AO 贴图
3. 若必须动态阴影，改用 `DirectionalLight`（单张 shadow map，方向与太阳->地球对齐）

---

### 5.2 星座连线 O(N×M) 查找

**定位代码**：`src/components/UniverseViewer.tsx:1940-1944`

**问题描述**：
```typescript
const starAObj = ALL_STARS.find(s => s.id === edge[0]);
const starBObj = ALL_STARS.find(s => s.id === edge[1]);
```
`ALL_STARS.find()` 在循环内执行，初始化时间复杂度 O(星座边数 × 恒星数)。

**修复方案（难度：极低）**：

预构建 `Map<number, Star>`：
```typescript
const starById = new Map(ALL_STARS.map(s => [s.id, s]));
// 后续使用 starById.get(edge[0])
```

---

### 5.3 无 Frustum Culling

**定位代码**：`src/components/UniverseViewer.tsx:1831-1900`（穹顶恒星初始化）

**问题描述**：
全部恒星（~150+ ALL_STARS + 8785 Hipparcos）的 `Points` 对象 `frustumCulled` 默认为 true，但穹顶恒星位于极大半径球面上，相机 frustum 几乎总是包含整个对象，因此 culling 无效。真正的问题是：**当相机聚焦太阳系内部时，极远恒星应该使用 LOD 或降低密度**。

**修复方案（难度：中）**：

1. **距离 LOD**：相机距离太阳 < 100 AU 时，不渲染远距 Hipparcos 恒星（或其点大小设为 0）
2. ** octree/空间分割**：将恒星按天区划分，只渲染朝向相机的天区
3. 在 Shader 中通过 `gl_Position = vec4(0)` 丢弃背向恒星（零成本，已在 3.1 方案中覆盖）

---

## 六、P3 轻微级问题

### 6.1 热路径频繁 new Vector3()

**例子**：`src/components/UniverseViewer.tsx:3375`
```typescript
const sunWorldPos = new THREE.Vector3();
sunMeshRef.current.getWorldPosition(sunWorldPos);
```
每帧 `new Vector3()`，虽然现代引擎优化后影响较小，但在移动端 GC 仍会产生微卡顿。

**修复**：在模块级声明可复用的 `const _vec3 = new THREE.Vector3()`，或使用 `sunMeshRef.current.getWorldPosition(_vec3)`。

### 6.2 setInterval 与 rAF 双时间轮

**定位代码**：`src/App.tsx:242-280`

**问题描述**：
```typescript
// 两个独立计时器
useEffect(() => { requestAnimationFrame(loop); }, []); // rAF 推进时间
useEffect(() => { setInterval(() => {...}, 16); }, []); // setInterval 自动演示
```

**修复**：
统一使用单一 `requestAnimationFrame` 循环，用 accumulator 模式管理不同频率的逻辑更新。

---

## 七、分阶段实施路线图

### Phase 1：立即可做的低 hanging fruit（1-2 天）
1. **TextureFactory 全局缓存**（4.1）— 5 分钟
2. **月球轨道线复用 geometry**（4.3）— 10 分钟
3. **UniverseViewer 帧级行星位置缓存**（3.3）— 1 小时
4. **星座连线 Map 优化**（5.2）— 10 分钟
5. **太阳阴影分辨率降至 512**（5.1）— 5 分钟
6. **热路径 Vector3 池化**（6.1）— 30 分钟

**预期收益**：帧率提升 20-30%，消除 GC 抖动。

### Phase 2：Shader 化与渲染管线重构（3-5 天）
1. **StarrySkyViewer 恒星计算 Shader 化**（3.1）— 核心攻坚
2. **太阳 FBM 预烘焙**（3.4）— 配合 TextureFactory 缓存
3. **穹顶散射 CubeMap 烘焙**（4.4）— 降全屏 shader 开销
4. **统一 Renderer**（3.2）— 架构级修改，需充分测试

**预期收益**：帧率从 25fps → 稳定 60fps，GPU 内存减半。

### Phase 3：架构解耦与高级优化（1-2 周）
1. **组件拆分**：将 StarrySkyViewer 拆分为 `SkyDomeRenderer`, `AtmosphereRenderer`, `StarFieldRenderer`, `ConstellationRenderer`
2. **Worker 线程**：将轨道计算、星表预计算移至 Web Worker
3. **InstancedMesh**：若保留行星/卫星渲染，使用 instancing 替代 Group
4. **按需加载**：Hipparcos  catalog 按视星等分段加载，非一次性全载

---

## 八、预期收益量化

| 指标 | 当前预估 | Phase 1 后 | Phase 2 后 | Phase 3 后 |
|------|----------|------------|------------|------------|
| 中端设备帧率 | 15-25 fps | 25-35 fps | 55-60 fps | 60 fps (有余量) |
| 启动时间 | ~4-6s | ~2-3s | ~2s | ~1.5s |
| GPU 显存占用 | ~400-600MB | ~350MB | ~200MB | ~150MB |
| 主线程阻塞 | 严重（每帧 8-16ms 计算） | 中等 | 轻微 | 几乎无 |
| 代码可维护性 | 低（巨石组件） | 低 | 中 | 高 |

---

## 九、关键文件修改清单

| 文件 | 修改内容 | 优先级 |
|------|----------|--------|
| `src/engine/TextureFactory.ts` | 添加 `globalTextureCache` | P1 |
| `src/components/UniverseViewer.tsx` | 帧级行星位置缓存；geometry 复用；阴影分辨率 | P0/P1 |
| `src/components/StarrySkyViewer.tsx` | 恒星计算移至 VS Shader；Sprite 合并至 Points | P0 |
| `src/engine/ObserverEngine.ts` | 提供 GPU 岁差矩阵 uniform 辅助函数 | P0 |
| `src/App.tsx` | 统一 Renderer Context；移除双时间轮 | P0/P3 |
| `src/engine/SunEffects.ts` | FBM 预烘焙；LOD 距离调整 | P0 |

---

## 十、总结

本项目的性能问题并非算法层面的天文计算过于复杂，而是**计算位置错误**——将完全可以在 GPU 并行化或低频缓存的工作，放在了 CPU 端的每帧同步循环中。

最高优先级的三件事：
1. **StarrySkyViewer 的星表计算 Shader 化**（消除最大瓶颈）
2. **合并双 WebGL 上下文**（架构级修复）
3. **UniverseViewer 轨道计算帧缓存**（消除不必要的每帧迭代）

完成这三项，项目即可从"演示级卡顿"跃升为"产品级流畅"。其余优化可在后续迭代中逐步实施。

---

*报告完成。如需对某一具体优化项展开详细代码实现，请告知优先级编号。*
