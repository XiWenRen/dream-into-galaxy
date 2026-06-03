# GalaxySim3D 性能优化实施计划（三阶段迭代）

> 基于代码静态分析、WebGL 渲染原理与高时间流速兼容性综合评估
> 评估日期：2026-06-03

---

## 核心前提（经用户指正后修正）

1. **系统时间流速可调**：`speedMultiplier` 从 1x 到数百万倍，每帧 `currentTimestamp` 可能大幅跳变
2. **"低频缓存/烘焙"策略在高流速下完全失效**：当 speedMultiplier ≥ 3600（1h/s）时，每帧时间都不同，任何基于"时间不变则跳过计算"的缓存命中率趋近于零
3. **CubeMap/烘焙类方案不可行**：大气散射颜色由太阳高度角驱动，1h/s 下每帧变化 0.25°，烘焙结果在几帧内即严重过时，视觉跳变
4. **唯一能在高流速下生效的方向**：将计算从 CPU 串行 for 循环迁移到 GPU 并行 Shader，或降低单次计算的绝对开销

---

## Phase 1：零风险安全优化（预计 1-2 天）

**目标**：在不改动架构、不影响任何视觉效果的前提下，消除已知的热点开销与 GC 抖动。

| # | 优化项 | 目标文件 | 具体改动 | 性能收益 | 效果影响 | 高流速兼容性 |
|---|--------|----------|----------|----------|----------|-------------|
| 1.1 | **TextureFactory 全局缓存** | `TextureFactory.ts` | 添加 `Map<string, Texture>` 全局缓存；首次生成后复用 CanvasTexture | 消除重复 2048×1024 Canvas 绘制；启动提速 30-50% | 零 | 完全兼容 |
| 1.2 | **月球轨道线 geometry 复用** | `UniverseViewer.tsx:3355, 3461` | 移除 `geometry.dispose() + new BufferGeometry()`；改用 `geo.setFromPoints() + needsUpdate=true` | 消除每 30 帧的 GC 抖动 | 零 | 完全兼容 |
| 1.3 | **星座连线 position attribute 更新** | `StarrySkyViewer.tsx:2209+` | 不再每帧 `new THREE.Vector3() + setFromPoints()`；初始化一次 BufferGeometry，每帧直接写 `position.array` Float32Array | 消除每帧 geometry 重建开销；GC 压力大幅降低 | 零 | 完全兼容 |
| 1.4 | **太阳阴影分辨率下调** | `UniverseViewer.tsx:1823` | `shadow.mapSize.set(2048, 2048)` → `512, 512` | 显存从 96MB → 6MB；阴影绘制开销降 75% | 极轻微（太阳系尺度阴影本就模糊） | 完全兼容 |
| 1.5 | **太阳 FBM octave 参数化** | `SunEffects.ts` | 将 `fbm()` 的 octave 数改为 uniform 控制：close LOD 默认 3 oct（可开关回 5） | GPU 片段着色时间降 40-60% | 极轻微（湍流视觉由低频主导） | 完全兼容（`uTime` 用物理时间，与模拟流速无关） |
| 1.6 | **星座连线查找 Map 化** | `UniverseViewer.tsx:1940` | 预构建 `Map<number, Star>` 替代 `ALL_STARS.find()` | 初始化从 O(N×M) → O(M) | 零 | 完全兼容 |
| 1.7 | **统一时间轮：setInterval → rAF** | `App.tsx:264` | 移除 `setInterval` 演示计时器；统一到单一 `requestAnimationFrame` accumulator 模式 | 消除时序竞争与额外定时器开销 | 零 | 完全兼容 |
| 1.8 | **热路径 Vector3 对象池** | `UniverseViewer.tsx:3375, 3500+` | 模块级声明 `_vec3 = new Vector3()`；替换 `getWorldPosition(new Vector3())` 等 | 减少每帧 ~20 次 Vector3 分配；降低 GC 微卡顿 | 零 | 完全兼容 |
| 1.9 | **月食检测频率限制** | `StarrySkyViewer.tsx:2007` | 月食检测改为每 30 帧执行一次（或按模拟时间量化：每 0.01 天一次），结果缓存 | 99.9% 的无月食帧跳过检测 | 零 | 完全兼容 |
| 1.10 | **节气虚影量化缓存** | `UniverseViewer.tsx:3327` | `updateSolarTermGhostPositions` 添加缓存键：`floor(currentYear)`，同年不重复计算 | 消除高流速下的年度重复计算 | 零 | 完全兼容 |

**Phase 1 验收标准**：
- 运行 `npm run dev` 无报错
- 1x 流速帧率提升 ≥ 15%
- 3600x 流速帧率提升 ≥ 10%（GC 抖动减少）
- 所有视觉效果与优化前像素级一致

---

## Phase 2：渲染管线重构（预计 3-5 天）

**目标**：解决架构级瓶颈，降低 draw call 与 GPU 内存，为 Phase 3 的 Shader 化铺平道路。

| # | 优化项 | 目标文件 | 具体改动 | 性能收益 | 效果影响 | 高流速兼容性 |
|---|--------|----------|----------|----------|----------|-------------|
| 2.1 | **合并双 WebGL 上下文** | `App.tsx` + 两个 Viewer | 在 App 层级创建唯一 `WebGLRenderer`，通过 React Context 注入；两个 Viewer 只维护各自的 `Scene` + `Camera`；App 主循环按 mode 决定 render 哪个 scene | GPU 显存降低 40-50%；Shader 编译量减少一半；移动端兼容性大幅提升 | 零 | 完全兼容 |
| 2.2 | **亮星 Sprite 合并为统一 Points** | `StarrySkyViewer.tsx:1145, 1175` | 42 颗亮星 + 额外星座星从独立 `THREE.Sprite` 改为同一 `THREE.Points` 系统的子集（通过 `attribute` 区分大小/亮度）。保留 raycast 交互通过 `instanceId` 或 `Points.raycast` | draw call 从 ~60 降至 1-2；CPU 每帧遍历 Sprite 的开销消除 | 极轻微（若使用同一 glow 纹理，亮星光晕个体差异消失；可保留前 10 颗最亮星为 Sprite 做混合） | 完全兼容。高流速下 draw call 降低收益更明显 |
| 2.3 | **行星 Sprite 同样合并** | `StarrySkyViewer.tsx:1203` | 5 颗行星 Sprite 合并入同一 Points 系统或改用 `InstancedMesh` | 同上 | 同上 | 完全兼容 |
| 2.4 | **Hipparcos 星表分片异步加载** | `UniverseViewer.tsx:1964` | 不再 `loadHipparcosCatalog().then()` 中同步构建全部 8785 颗星；改为分 20 批，每批 ~440 颗，使用 `requestIdleCallback` 或 `setTimeout(0)` 插入事件循环间隙 | 消除加载完成后的主线程顿卡；首屏可交互时间提前 | 零 | 完全兼容 |
| 2.5 | **轨道计算量化时间缓存** | `UniverseViewer.tsx:3427` | 缓存键从精确 `daysSinceJ2000` 改为 `Math.floor(daysSinceJ2000 * 100) / 100`（粒度 0.01 天 ≈ 14.4 分钟）。地球/行星公转在此粒度内差异不可见；月球单独使用更细粒度 `* 1000`（1.4 分钟） | 1x 流速下缓存命中率极高；3600x 下每 14 分钟模拟时间才重算一次行星位置 | 零（量化误差 < 0.01 天，肉眼不可见） | **关键修正**：高流速下从"完全失效"变为"部分命中" |
| 2.6 | **月球轨道缓存独立化** | `UniverseViewer.tsx:3393` | 月球位置使用 `* 1000` 粒度缓存（1.4 分钟）；地球位置使用 `* 100` 粒度缓存 | 月球快速运动仍保持精度，地球缓动享受缓存 | 零 | 同上 |

**Phase 2 验收标准**：
- 单 WebGL 上下文运行，GPU 内存占用降低 ≥ 30%
- 1x 流速帧率提升 ≥ 30%
- 3600x 流速下无加载卡顿，GC 曲线平滑
- 所有交互（hover、click、raycast）正常工作

---

## Phase 3：GPU Shader 化与架构解耦（预计 1-2 周）

**目标**：将高流速下无法避免的每帧重型计算，从 CPU 串行迁移到 GPU 并行。这是**唯一能从根本上解决 3600x+ 流速卡顿的方案**。

| # | 优化项 | 目标文件 | 具体改动 | 性能收益 | 效果影响 | 高流速兼容性 |
|---|--------|----------|----------|----------|----------|-------------|
| 3.1 | **背景暗星岁差+水平坐标 Shader 化（核心攻坚）** | `StarrySkyViewer.tsx:2617-2671` + `ObserverEngine.ts` | 1. 将 Hipparcos 星表一次性上传为 `BufferGeometry`（`position: [ra, dec, mag]`, `color: [r,g,b]`, `pm: [pmRa, pmDec]`）<br>2. 编写 `starfield.vert`，在顶点着色器中执行：岁差矩阵（uniform `uYearsSinceJ2000`）→ 赤道转水平（uniform `uLST`, `uLat`）→ 大气消光（uniform `uSkyBrightness`, `uObserverBody`）→ 投影到穹顶球面<br>3. `animate()` 中移除 `for (let i = 0; i < bgStarsData.length; i++)` 循环，只更新 uniform | 从 ~8785 × 40 次三角函数/帧（CPU）→ GPU 并行（约 0.1ms）；**任何流速下都只需要更新 4-6 个 uniform** | 零。数学公式与 CPU 完全一致 | **这是高流速下的唯一可行方案**。岁差矩阵（100年变化一次）和 LST（每帧变）分离为独立 uniform |
| 3.2 | **亮星/星座星同样 Shader 化** | `StarrySkyViewer.tsx:2099-2159` | 将 42 颗亮星 + 额外星座星的数据同样合并到上述 `BufferGeometry` 中，通过 attribute 标记为"大星"（`aStarType`），在 VS 中赋予更大 `gl_PointSize` 和光晕。Raycast 通过 GPU picking（渲染到 texture）或维护一份同步的轻量 CPU 坐标表实现 | 消除 useEffect 中每帧对亮星的 for 循环；CPU 主线程彻底解放 | 零 | 完全兼容 |
| 3.3 | **穹顶散射 Shader 简化（无烘焙）** | `StarrySkyViewer.tsx:1345-1456` | 将 4-octave `fbm()` 降为 2-octave value noise；移除多层嵌套 noise；保留太阳高度角驱动的大气颜色渐变核心逻辑 | GPU 片段时间降 30-50% | 极轻微（大气散射是低频渐变，noise 细节肉眼难辨） | **无烘焙，每帧实时计算**，任何流速下颜色都正确 |
| 3.4 | **组件拆分：巨石组件解耦** | 新建文件 | 将 `StarrySkyViewer.tsx`（~3000 行）拆分为：<br>- `SkyDomeRenderer`（穹顶几何+散射）<br>- `StarFieldRenderer`（亮星+暗星 Points）<br>- `AtmosphereRenderer`（消光、天空亮度）<br>- `ConstellationRenderer`（连线+名称）<br>同样拆分 `UniverseViewer.tsx` | 代码可维护性大幅提升；为按需加载、独立测试、Worker 化创造条件 | 零 | 完全兼容 |
| 3.5 | **轨道计算 Web Worker 化** | 新建 `orbit.worker.ts` | 将 `OrbitEngine.getHeliocentricPosition()` 和 `getLunarRelativePosition()` 封装为 Worker 接口。主线程只发 `{planetIds, daysSinceJ2000}`，Worker 返回坐标数组。主线程用 `requestAnimationFrame` 做插值渲染 | 主线程彻底解放；即使高流速下每帧都重算，也不在渲染线程阻塞 | 零（计算延迟 1 帧，天文尺度不可见） | 完全兼容。Worker 计算频率可与渲染频率解耦 |
| 3.6 | **距离 LOD + 视锥剔除** | `UniverseViewer.tsx:1831` | 相机距太阳 < 50 AU 时：Hipparcos 远距恒星 `gl_PointSize = 0`（VS 中丢弃）；> 1000 AU 时：只渲染亮星（mag < 4），暗星隐藏 | GPU 顶点处理量降 60-80% | 零（远距离暗星在太阳系视角下本来就是不可分辨的光点） | 完全兼容 |

**Phase 3 验收标准**：
- 1x 流速稳定 60fps（中端设备）
- 3600x 流速帧率 ≥ 45fps（中端设备）
- CPU 主线程空闲时间 ≥ 50%（DevTools Performance 面板）
- 视觉效果通过 side-by-side 对比，差异不可辨识

---

## 三阶段路线图总结

```
Week 1
├── Day 1-2: Phase 1 全部项（安全优化，快速见效）
└── 验收：帧率提升 15-20%，GC 曲线平滑

Week 2
├── Day 3-7: Phase 2 渲染管线重构
└── 验收：单 WebGL 上下文，显存降 30%，帧率提升 30%+

Week 3-4
├── Day 8-14: Phase 3 GPU Shader 化与架构解耦
└── 验收：稳定 60fps，高流速可用，架构可维护
```

---

## 关键决策矩阵

| 场景 | 推荐到达阶段 | 说明 |
|------|-------------|------|
| 仅需缓解启动卡顿 | Phase 1 | 纹理缓存 + 异步加载即可 |
| 需要流畅运行 1x-60x 流速 | Phase 1 + 2 | 缓存 + 管线重构足够 |
| 需要流畅运行 3600x+ 高流速 | **必须完成 Phase 3** | 只有 Shader 化能消除 CPU 串行瓶颈 |
| 需要支持移动端/低显存设备 | Phase 2 必做（合并上下文）| 双 Renderer 在移动端直接崩溃 |

---

## 被明确删除的原建议

以下建议经用户指正后，因高流速下失效或造成视觉跳变，**已从计划中移除**：

1. ❌ ~~穹顶散射 CubeMap 烘焙（每 1-5 秒）~~ → 1h/s 下太阳高度角每帧变 0.25°，烘焙结果瞬间过时
2. ❌ ~~轨道计算"帧级缓存"（timestamp 不变则跳过）~~ → 高流速下 timestamp 每帧都变，命中率=0
3. ❌ ~~背景暗星计算移至 Web Worker~~ → Worker 每帧回传 8785×3 Float32Array 的带宽开销 > CPU 计算收益；且高流速下仍需每帧计算。不如直接 Shader 化

---

*计划完成。如需展开任一 Phase 的具体代码实现，请指定编号。*
