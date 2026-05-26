# GalaxySim3D 星空模式 开发视角问题根因分析报告

**分析日期**: 2026-05-26
**分析范围**: StarrySkyViewer + ObserverEngine + AstrophenomenaEngine + SatelliteData
**测试用例总数**: 63 | 通过 3 (4.8%) | 部分通过 13 (20.6%) | 失败/未支持 47 (74.6%)

---

## 一、问题归类总览

| 分类 | 影响用例 | 根因文件 | 根因代码位置 | 优先级 |
|------|---------|---------|-------------|--------|
| A. 天空颜色/大气渲染错误 | 22 | `StarrySkyViewer.tsx` | L1700-L1734, L639-L650 | P1 |
| B. 母行星角直径缩放错误 | 14 | `StarrySkyViewer.tsx` + `ObserverEngine.ts` | L1687, L126-L128 | P1 |
| C. 特殊天象/动态事件缺失 | 12 | `AstrophenomenaEngine.ts` | 整个文件 | P2 |
| D. 气态巨行星高度层未实现 | 10 | `App.tsx` + `StarrySkyViewer.tsx` | L20, L965-L973 | P2 |
| E. 母行星细节特征缺失 | 8 | `StarrySkyViewer.tsx` | L1182-L1196 | P2 |
| F. 卫星互视功能缺失 | 5 | `ObserverEngine.ts` | L176 | P3 |
| G. 轨道周期对天空运动影响 | 4 | `ObserverEngine.ts` | L81-L98 | P3 |

---

## 二、逐类根因深度分析

### A. 行星/卫星特有大气颜色未实现 (22用例, P1)

**现状**: 所有天体（包括无大气的水星、有浓密大气的金星/Titan、粉红天空的火星）共用同一套基于太阳高度角的地球大气散射模型。

**根因代码** (`StarrySkyViewer.tsx:1700-1734`):
```typescript
// 三段式曙暮光及黄昏渐变色彩算法 —— 硬编码地球模型
let skyBrightness = 0;
const sunAlt = sunCoords.alt;
if (sunAlt >= 15) { skyBrightness = 1.0; }
// ...
let r = 0.05 * (1.0 - skyBrightness) + 0.4 * skyBrightness;
let g = 0.08 * (1.0 - skyBrightness) + 0.6 * skyBrightness;
let b = 0.18 * (1.0 - skyBrightness) + 1.0 * skyBrightness;
```

**根因**:
1. **无天体大气配置表**: 没有 `ATMOSPHERE_CONFIG` 映射各行星的瑞利散射系数、米氏散射系数、大气光学深度、主导颜色等参数
2. **无大气厚度/透明度模拟**: 金星表面 τ>100 应完全遮蔽天体，Titan τ≈1.3 应有显著暗化，当前全无体现
3. **groundColorMap 过于简化** (`L643-L646`): 仅12种静态地面颜色，没有大气散射叠层

**涉及用例**: MERCURY-DAY-01 (无大气纯黑背景), VENUS-ATM-01 (橙黄天空), MARS-DAY-01 (粉红天空), JUPITER-DAY-01 (黄白天空), SATURN-DAY-01 (黄白天空), URANUS-DAY-01 (青蓝天空), NEPTUNE-DAY-01 (深蓝天空), TITAN-DOM/BACK/ATM (橙黄天空)

---

### B. 母行星角直径未按实际距离缩放 (14用例, P1)

**现状**: 从卫星看母行星时，角直径计算物理正确，但渲染缩放严重错误。

**根因代码** (`StarrySkyViewer.tsx:1687`):
```typescript
const scale = Math.max(0.5, parentInfo.angularDiameter / 0.5);
moonSkyRef.current.scale.setScalar(scale);
```

**根因**:
1. **单位混淆**: `ObserverEngine.getPlanetRADec` (`L126-L128`) 返回的 `angularDiameter` 单位是**角分(arcmin)**，但代码中除以的 `0.5` 是**度(°)**。正确除数应为 `30`（30角分 = 0.5°）。
   - 例: 从Io看木星 angularDiameter ≈ 1170 角分，scale = 1170 / 0.5 = 2340（错误）
   - 正确应为: scale = 1170 / 30 = 39
2. **缩放逻辑本身错误**: 即使修正单位，`scale = angularDiameter / lunarAngularDiameter` 这种线性比例不能直接套用到 Three.js 球体半径上。球体在距离270处的视觉角直径是 `2*atan(r/270)`，不是线性关系。
   - 例: 要呈现19.6°角直径，在距离270处需要半径 ≈ 45，scale ≈ 45/7.2 ≈ 6.25
   - 但按代码逻辑 `1170/30 = 39`，半径 = 7.2*39 = 281，会导致球体超出天穹
3. **近距离卫星渲染溢出**: Phobos看火星42.8°、Proteus看海王星21.7°，即使正确缩放，球体也会接近或超出天球穹顶半径(278)，需要调整天球穹顶半径或渲染策略

**涉及用例**: IO-DOM-01 (应为19.6°), EUROPA-DOM-01 (12.2°), GANYMEDE-DOM-01 (7.7°), CALLISTO-DOM-01 (4.4°), TITAN-DOM-01 (5.7°), RHEA-DOM-01 (8.5°), ENCELADUS-DOM-01 (18.8°), TITANIA-DOM-01 (8.5°), OBERON-DOM-01 (6.4°), ARIEL-DOM-01 (19.0°), TRITON-DOM-01 (7.2°), PROTEUS-DOM-01 (21.7°), PHOBOS-DOM-01 (42.8°), DEIMOS-DOM-01 (16.5°)

---

### C. 特殊天象/动态事件未模拟 (12用例, P2)

**现状**: `AstrophenomenaEngine` 仅实现了月相和日食/月食检测。

**根因**:
1. **无天气系统**: 火星沙尘暴没有粒子系统/大气透明度动态调整模块
2. **无地质活动系统**: Io火山、Enceladus冰喷射、Triton氮气喷射没有粒子发射器
3. **无极光系统**: 木星/土星/天王星/海王星极光没有shader/粒子层
4. **无地照模拟**: 月球夜间的地球反照光没有环境光贡献计算

**涉及用例**: MARS-DUST-01 (沙尘暴), IO-VOLCANO-01 (火山), ENCELADUS-PLUME-01 (冰喷射), TRITON-GEYSER-01 (氮气喷射), JUPITER-NIGHT-01 (极光), MOON-NIGHT-01 (地照), MOON-ECLIPSE-01 (月食地球红环), EARTH-ECLIPSE-01 (日全食天空变化)

---

### D. 气态巨行星云层顶部高度层未实现 (10用例, P2)

**现状**: `LANDABLE_PLANETS` 白名单 (`App.tsx:20`) 将气态巨行星也列为可登录天体，但系统假设所有天体都有固体表面。

**根因**:
1. **无高度层概念**: StarrySkyViewer 没有 `altitude` 参数或高度层切换UI
2. **无气压层渲染差异**: 不同高度的大气密度、颜色、透明度没有分层模型
3. **气态巨行星不应有"地表"**: 木星/土星/天王星/海王星没有固体表面，"云层顶部"才是唯一可定义的高度层

**涉及用例**: VENUS-HIGH-01, VENUS-ATM-01, JUPITER-DAY-01/NIGHT-01/ATM-01, SATURN-DAY-01/NIGHT-01, URANUS-DAY-01/NIGHT-01, NEPTUNE-DAY-01/NIGHT-01

---

### E. 母行星细节特征未实现 (8用例, P2)

**现状**: `moonSkyRef` 是统一的 `SphereGeometry(7.2, 32, 32)` + 纹理贴图，没有额外细节层。

**根因**:
1. **无环系统天空渲染**: 土星环在 `UniverseViewer` 中有3D RingGeometry，但 `StarrySkyViewer` 完全没有环的渲染
2. **无木星云带/大红斑**: 仅依赖2D纹理贴图，没有赤道带/区带(belt/zone)的shader增强
3. **无火星地形**: 奥林帕斯山、水手号峡谷等地形特征没有位移贴图或凹凸效果
4. **无地球相位/光晕**: 从月球看地球只有静态贴图，没有大气光晕shader

**涉及用例**: MOON-DOM-01 (地球相位/光晕), IO-DOM-01 (木星条纹/大红斑), SATURN-RING-01 (土星环), TITAN-DOM-01 (土星环), RHEA-DOM-01 (土星环), ENCELADUS-DOM-01 (土星环/卡西尼缝), PHOBOS-DOM-01 (火星地形)

---

### F. 卫星互视功能缺失 (5用例, P3)

**现状**: 从卫星观测其他卫星（如Io看Europa）完全不支持。

**根因代码** (`ObserverEngine.ts:176`):
```typescript
if (SATELLITE_PARENT_MAP[ctx.bodyId]) {
  return []; // 卫星观测者 → 直接返回空数组
}
```

**根因**:
1. **主动排除**: 第176行明确对卫星观测者返回空数组
2. **无同系统卫星间相对位置计算**: 需要添加 `getSiblingSatellites` 方法，计算同一母行星下其他卫星相对于观测者的视位置
3. **需要视星等/角直径计算**: 伽利略卫星互视时角直径可达0.5-1°，需要圆盘面渲染而非点光源

**涉及用例**: IO-SAT-01 (Io看其他伽利略卫星), RHEA-SAT-01 (Rhea看其他土星卫星)

---

### G. 轨道周期对天空运动影响未实现 (4用例, P3)

**现状**: 从Phobos看太阳西升东落、Deimos看太阳缓慢东升西落均未实现。

**根因代码** (`ObserverEngine.ts:81-98`):
```typescript
static getLocalSiderealTime(ctx: ObserverContext, timestamp: number): number {
  // ...
  const gmst = ((hoursSinceJ2000 / Math.abs(phys.rotationPeriod)) * 24) % 24;
  const sign = phys.rotationPeriod >= 0 ? 1 : -1;
  let lst = (gmst * sign + ctx.longitude / 15) % 24;
```

**根因**:
1. **公式只考虑自转，未考虑公转**: 对潮汐锁定卫星，恒星背景实际几乎静止（因为始终以同一面朝向母行星），太阳运动由公转轨道决定
2. **Phobos特例**: 公转周期7.66h < 火星自转24.6h → 太阳**西升东落**。当前LST仍按24h周期计算，完全错误
3. **Deimos特例**: 公转周期30.35h > 火星自转24.6h → 太阳东升西落但比火星表面慢。当前也未体现
4. **Triton逆行**: Triton公转逆行，对天空运动的影响未考虑

**涉及用例**: PHOBOS-ORBIT-01, DEIMOS-ORBIT-01, TRITON-RETROGRADE-01

---

## 三、修复依赖关系图

```
A(天空颜色) ──→ D(高度层) ──→ C(动态事件)
     ↓
B(角直径缩放) ←── E(细节特征) ←── F(卫星互视)
     ↓
G(轨道周期)
```

- **A 和 B 无依赖，可并行修复**（P1最高优先级）
- **E 依赖 B**: 必须先正确缩放母行星大小，再叠加细节特征
- **F 依赖 B**: 卫星互视需要先支持卫星作为观测点
- **G 依赖 ObserverEngine 架构**: 需要修改LST计算模型
- **D 和 C 为独立高级功能**，不影响基础正确性

---

## 四、修复工作量估算

| 分类 | 预计改动文件数 | 复杂度 | 预估工时 |
|------|--------------|--------|---------|
| A. 天空颜色 | 3 (StarrySkyViewer + 新增 AtmosphereConfig) | 中 | 2-3天 |
| B. 角直径缩放 | 2 (StarrySkyViewer + ObserverEngine) | 高 | 2-3天 |
| C. 特殊天象 | 3+ (新增粒子系统) | 高 | 4-5天 |
| D. 高度层 | 2 (App + StarrySkyViewer) | 中 | 1-2天 |
| E. 细节特征 | 2 (StarrySkyViewer + 新增RingDome) | 中 | 2-3天 |
| F. 卫星互视 | 1 (ObserverEngine) | 低 | 0.5-1天 |
| G. 轨道周期 | 2 (ObserverEngine + StarrySkyViewer) | 高 | 2-3天 |

**总计**: 约 14-20 人天（2.5-3周）
