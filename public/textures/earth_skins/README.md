# 地球贴图资源库 (Earth Texture Skins)

本目录收集了多种风格的地球表面贴图，可用于 GalaxySim3D 项目中替换默认地球外观。

---

## 目录结构

```
earth_skins/
├── README.md                          # 本文件
├── earth_2k.jpg                       # 标准白天贴图 (Solar System Scope)
├── earth_8k_land_ocean.jpg            # 陆地海洋贴图 (Three.js)
├── earth_black_marble_2016.jpg        # 夜景城市灯光 (NASA)
├── earth_blue_marble_july_8k.jpg      # 夏季植被贴图 (NASA)
├── earth_bump.jpg                     # 凹凸法线贴图 (Three.js)
├── earth_clouds_nasa.jpg              # 云层覆盖贴图 (NASA)
├── political/                         # 政治边界/国界风格
│   ├── earth_blank_map.svg            # 空白世界地图边界线 (Wikimedia)
│   ├── earth_no_clouds_4k.jpg         # 无云层高清地球 (webgl-earth)
│   └── earth_political_wikimedia.png  # 政治地图 (Wikimedia, 1280x644)
└── illustrated/                       # 手绘/插画风格
    ├── earth_animals_openclipart.svg  # OpenClipArt 矢量地图
    └── earth_coloring_map.png         # 填色地图 (664x800)
```

---

## 已下载贴图清单

### 标准科学风格

| 文件名 | 分辨率 | 来源 | 描述 |
|--------|--------|------|------|
| `earth_blue_marble_july_8k.jpg` | 5400x2700 | NASA Blue Marble NG | 2004年7月地球表面，植被最茂盛 |
| `earth_black_marble_2016.jpg` | 3600x1800 | NASA Black Marble | 2016年地球夜景，VIIRS城市灯光 |
| `earth_clouds_nasa.jpg` | 2048x1024 | NASA Earth Observatory | 全球云层覆盖图 |
| `earth_8k_land_ocean.jpg` | 2048x1024 | Three.js 示例库 | 陆地/海洋对比贴图 |
| `earth_2k.jpg` | 2048x1024 | Solar System Scope | 高质量标准白天贴图 |
| `earth_bump.jpg` | 2048x1024 | Three.js 示例库 | 凹凸/法线贴图 |

### 政治边界风格 (political/)

| 文件名 | 分辨率 | 来源 | 描述 |
|--------|--------|------|------|
| `earth_no_clouds_4k.jpg` | 4096x2048 | webgl-earth | 高清无云层地球纹理 |
| `earth_political_wikimedia.png` | 1280x644 | Wikimedia Commons | 政治地图（低分辨率） |
| `earth_blank_map.svg` | 矢量 | Wikimedia Commons | 空白世界地图SVG（可无限缩放） |

### 手绘插画风格 (illustrated/)

| 文件名 | 分辨率 | 来源 | 描述 |
|--------|--------|------|------|
| `earth_animals_openclipart.svg` | 1326x1600 | OpenClipArt | 矢量世界地图（非等距矩形投影） |
| `earth_coloring_map.png` | 664x800 | OpenClipArt | 填色地图（非等距矩形投影） |

---

## 重要说明

### 关于"带国界的地球纹理"

**等距矩形投影(Equirectangular)** + **国家边界线** 的纹理组合**非常稀少**，原因是：

1. 大多数政治地图使用**墨卡托投影**或**罗宾逊投影**，不能直接贴在球体上
2. 等距矩形投影的政治地图通常分辨率较低
3. 高质量的带边界纹理大多需要**付费购买**或**自行合成**

**推荐获取方式：**

| 方法 | 难度 | 质量 | 说明 |
|------|------|------|------|
| **程序叠加** | 中等 | 高 | 用 GeoJSON 边界数据 + Canvas 在地球纹理上绘制边界线 |
| **Natural Earth 数据** | 中等 | 高 | 下载矢量边界数据，用 QGIS/GIMP 合成到纹理上 |
| **购买素材** | 简单 | 高 | Shutterstock/Adobe Stock 搜索 "world map equirectangular political" |
| **SuperMap.World** | 简单 | 中 | https://supermap.world/ 提供多种配色的等距矩形投影地图 |

### 关于"手绘动物版地球纹理"

**等距矩形投影的手绘动物地球纹理**在免费资源中**几乎不存在**，原因是：

1. 这种风格属于**艺术创作**，不是科学数据
2. 需要插画师按等距矩形投影的扭曲规则逐区域手绘
3. 现有的动物世界地图大多是**平面挂图**，不是球体贴图

**推荐获取方式：**

| 方法 | 难度 | 质量 | 说明 |
|------|------|------|------|
| **AI 生成** | 简单 | 中高 | 用 Midjourney/DALL-E/Stable Diffusion 生成提示词见下方 |
| **购买素材** | 简单 | 高 | Shutterstock/Adobe Stock 搜索 "animal world map illustration" |
| **定制插画** | 困难 | 最高 | 找插画师按等距矩形投影定制 |
| **程序合成** | 困难 | 中 | 在标准地球纹理上叠加各区域的代表性动物图标 |

**AI 生成提示词参考：**
```
"Equirectangular projection world map texture, hand-drawn illustration style,
cute animals representing each continent on their respective landmasses,
african elephant on Africa, kangaroo on Australia, panda on Asia,
bison on North America, llama on South America, polar bear on Arctic,
whimsical children's book style, warm colors, seamless 2:1 aspect ratio,
high resolution, suitable for 3D sphere mapping"
```

---

## 在项目中使用

修改以下两个文件中的纹理路径即可切换：

**`src/engine/PlanetMaterials.ts`**
```typescript
export const TEXTURE_PATHS: Record<string, string> = {
  earth: '/textures/earth_skins/earth_blue_marble_july_8k.jpg',
  // ...
};
```

**`src/components/UniverseViewer.tsx`**
```typescript
const REAL_TEXTURE_URLS: Record<string, string> = {
  earth: '/textures/earth_skins/earth_blue_marble_july_8k.jpg',
  // ...
};
```

---

## 更多资源下载指南

### 1. NASA Blue Marble Next Generation - 12个月季节变化
- 网址: https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/
- 分辨率: 500米/像素 (21600x21600 瓦片)
- 建议下载: 1月(冬季) 和 7月(夏季) 对比使用
- 格式: JPEG 瓦片 (A1-D2 共8片)，可用图像软件拼接

### 2. NASA Blue Marble + 地形 + 海底
- 网址: https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography-bathymetry/
- 特点: 能看到海底山脉和大陆架！非常震撼
- 分辨率: 500米/像素

### 3. NASA Black Marble 2016 高清版
- 网址: https://visibleearth.nasa.gov/images/144898/earth-at-night-black-marble-2016-color-maps/
- 分辨率: 86400x43200 (500m/像素，瓦片)
- 彩色版: `144898` | 灰度版: `144897`
- 每个瓦片约 7-60MB (JPEG)

### 4. 43K 超高清 Blue Marble (单文件)
- 网址: https://www.h-schmidt.net/map/
- 文件: 50MB JPG (43200x21600)
- 提示: 需要浏览器手动点击下载

### 5. Solar System Scope 全套 PBR 贴图
- 网址: https://www.solarsystemscope.com/textures/
- 提供: Diffuse / Bump / Specular / Clouds / Night 全套
- 授权: CC-BY 4.0 (免费商用，需署名)

### 6. Planet Pixel Emporium (8K+)
- 网址: https://planetpixelemporium.com/earth8081.html
- 提供: 8K+ 分辨率地球贴图
- 含: 白天/夜晚/云层/法线/高光贴图

### 7. 政治地图素材 (付费推荐)
- Shutterstock: https://www.shutterstock.com/search/world-map-equirectangular-political
- Adobe Stock: 搜索 "political world map equirectangular projection"

### 8. 手绘动物地图素材 (付费推荐)
- Shutterstock: https://www.shutterstock.com/search/animal-world-map-illustration
- Creative Market: 搜索 "animal world map kids"

---

## 有趣的玩法建议

| 模式 | 贴图组合 | 效果 |
|------|----------|------|
| **季节模式** | 1月 + 7月 切换 | 积雪和植被的季节变化 |
| **夜景模式** | Black Marble + 云层 | 璀璨的城市灯光 |
| **地形模式** | Topography + Bathymetry | 能看到海底山脉 |
| **复古模式** | Vintage map + Sepia tone | 羊皮纸航海地图风格 |
| **科学模式** | NDVI植被 / 海温 / 云层 | 数据可视化风格 |
| **政治模式** | Blue Marble + 边界线叠加 | 带国界的地球 |
| **教育模式** | 动物插画 + 大陆标签 | 儿童科普风格 |

---

## 授权说明

- NASA 资源: 公共领域 (Public Domain)，需注明 "NASA Earth Observatory"
- Solar System Scope: CC-BY 4.0
- Three.js 示例: MIT License
- Wikimedia Commons: 各文件授权不同，见文件页面
- OpenClipArt: 公共领域 (Public Domain)

---

*Last updated: 2026-06-03*
