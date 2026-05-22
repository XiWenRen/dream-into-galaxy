/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OrbitEngine, CELESTIAL_PHYSICS, PLANET_ORBITAL_DATA } from '../engine/OrbitEngine';
import { TimeEngine } from '../engine/TimeEngine';
import { translations } from '../i18n';

interface UniverseViewerProps {
  currentTimestamp: number;
  useVisualScale: boolean;
  setUseVisualScale?: (val: boolean) => void;
  selectedPlanetId: string;
  onSelectPlanet: (id: string) => void;
  crossSectionActive: boolean;
  lang: 'zh' | 'en';
  showConstellLines?: boolean;

  validationPairKey: string;
  setValidationPairKey: (val: string) => void;
  panelTab: 'packing' | 'audit';
  setPanelTab: (val: 'packing' | 'audit') => void;
  packingActive: boolean;
  setPackingActive: (val: boolean) => void;
  packingProgressDone: number;
  setPackingProgressDone: (val: number) => void;
  packingMode: 'physical' | 'visual';
  setPackingMode: (val: 'physical' | 'visual') => void;
  strictPhysics: boolean;
  setStrictPhysics: (val: boolean) => void;
  focusTrigger: number;
  useExponentialSpeed: boolean;
  customSpeedPreset: string;
}

export interface SatelliteDef {
  nameZh: string;
  nameEn: string;
  distance: number; // orbital distance factor (relative to planet radius)
  radiusRatio: number; // size factor (relative to planet radius)
  color: number; // hex color code
  speed: number; // angular speed factor
  isProbe?: boolean; // is artificial space probe
  realDistance?: number;  // REAL orbital distance factor (relative to planet radius)
  realRadiusRatio?: number; // REAL size factor (relative to planet radius)
}

export const SATELLITE_DATA: Record<string, SatelliteDef[]> = {
  mercury: [],
  venus: [],
  earth: [],
  mars: [
    { nameZh: "火卫一 Phobos", nameEn: "Phobos", distance: 1.5, radiusRatio: 0.15, color: 0x90a4ae, speed: 1.9, realDistance: 2.766, realRadiusRatio: 0.0033 },
    { nameZh: "火卫二 Deimos", nameEn: "Deimos", distance: 2.4, radiusRatio: 0.11, color: 0xb0bec5, speed: 1.1, realDistance: 6.921, realRadiusRatio: 0.0018 }
  ],
  jupiter: [
    { nameZh: "木卫一 Io", nameEn: "Io", distance: 1.4, radiusRatio: 0.14, color: 0xffeb3b, speed: 2.3, realDistance: 6.031, realRadiusRatio: 0.026 },
    { nameZh: "木卫二 Europa", nameEn: "Europa", distance: 1.9, radiusRatio: 0.12, color: 0x80deea, speed: 1.6, realDistance: 9.596, realRadiusRatio: 0.0223 },
    { nameZh: "木卫三 Ganymede", nameEn: "Ganymede", distance: 2.5, radiusRatio: 0.15, color: 0xcfd8dc, speed: 1.1, realDistance: 15.311, realRadiusRatio: 0.0377 },
    { nameZh: "木卫四 Callisto", nameEn: "Callisto", distance: 3.2, radiusRatio: 0.13, color: 0x78909c, speed: 0.7, realDistance: 26.93, realRadiusRatio: 0.0345 }
  ],
  saturn: [
    { nameZh: "土卫六 Titan", nameEn: "Titan", distance: 3.2, radiusRatio: 0.17, color: 0xffb74d, speed: 1.0, realDistance: 20.982, realRadiusRatio: 0.0442 },
    { nameZh: "土卫五 Rhea", nameEn: "Rhea", distance: 2.6, radiusRatio: 0.11, color: 0xb0bebe, speed: 1.4, realDistance: 9.052, realRadiusRatio: 0.0131 },
    { nameZh: "土卫二 Enceladus", nameEn: "Enceladus", distance: 1.3, radiusRatio: 0.08, color: 0xe0f2f1, speed: 2.2, realDistance: 4.086, realRadiusRatio: 0.0043 }
  ],
  uranus: [
    { nameZh: "天卫三 Titania", nameEn: "Titania", distance: 2.3, radiusRatio: 0.14, color: 0xe1bee7, speed: 1.2, realDistance: 17.187, realRadiusRatio: 0.0311 },
    { nameZh: "天卫四 Oberon", nameEn: "Oberon", distance: 3.0, radiusRatio: 0.13, color: 0xd1c4e9, speed: 0.8, realDistance: 23.007, realRadiusRatio: 0.030 },
    { nameZh: "天卫一 Ariel", nameEn: "Ariel", distance: 1.7, radiusRatio: 0.10, color: 0xe0f2f1, speed: 1.8, realDistance: 7.532, realRadiusRatio: 0.0228 }
  ],
  neptune: [
    { nameZh: "海卫一 Triton", nameEn: "Triton", distance: 2.1, radiusRatio: 0.15, color: 0xb2dfdb, speed: -1.3, realDistance: 14.408, realRadiusRatio: 0.055 },
    { nameZh: "海卫八 Proteus", nameEn: "Proteus", distance: 1.5, radiusRatio: 0.09, color: 0xb0bec5, speed: 1.9, realDistance: 4.778, realRadiusRatio: 0.0085 }
  ]
};

export interface ValidationConfig {
  key: string;
  sourceId: string;
  targetId: string;
  nameZh: string;
  nameEn: string;
  countFormulaTextZh: string;
  countFormulaTextEn: string;
  baseBodyNameZh: string;
  baseBodyNameEn: string;
}

export const VALIDATION_PAIRS: ValidationConfig[] = [
  {
    key: 'sun-earth',
    sourceId: 'sun',
    targetId: 'earth',
    nameZh: '日地检验 (108个太阳)',
    nameEn: 'Sun-Earth (108 Suns)',
    countFormulaTextZh: '149,597,870 km / 1,392,680 km = 107.41 个',
    countFormulaTextEn: '149,597,870 km / 1,392,680 km = 107.41 Suns',
    baseBodyNameZh: '太阳',
    baseBodyNameEn: 'Suns'
  },
  {
    key: 'earth-moon',
    sourceId: 'earth',
    targetId: 'moon',
    nameZh: '地月检验 (30个地球)',
    nameEn: 'Earth-Moon (30 Earths)',
    countFormulaTextZh: '384,400 km / 12,742 km = 30.17 个',
    countFormulaTextEn: '384,400 km / 12,742 km = 30.17 Earths',
    baseBodyNameZh: '地球',
    baseBodyNameEn: 'Earths'
  },
  {
    key: 'mars-phobos',
    sourceId: 'mars',
    targetId: 'phobos',
    nameZh: '火星-火卫一检验 (1.38个火星)',
    nameEn: 'Mars-Phobos (1.38 Mars)',
    countFormulaTextZh: '9,377 km / 6,779 km = 1.38 个',
    countFormulaTextEn: '9,377 km / 6,779 km = 1.38 Mars',
    baseBodyNameZh: '火星',
    baseBodyNameEn: 'Mars'
  },
  {
    key: 'jupiter-io',
    sourceId: 'jupiter',
    targetId: 'io',
    nameZh: '木星-木卫一检验 (3.01个木星)',
    nameEn: 'Jupiter-Io (3.01 Jupiters)',
    countFormulaTextZh: '421,700 km / 139,822 km = 3.01 个',
    countFormulaTextEn: '421,700 km / 139,822 km = 3.01 Jupiters',
    baseBodyNameZh: '木星',
    baseBodyNameEn: 'Jupiters'
  },
  {
    key: 'jupiter-europa',
    sourceId: 'jupiter',
    targetId: 'europa',
    nameZh: '木星-木卫二检验 (4.80个木星)',
    nameEn: 'Jupiter-Europa (4.80 Jupiters)',
    countFormulaTextZh: '670,900 km / 139,822 km = 4.80 个',
    countFormulaTextEn: '670,900 km / 139,822 km = 4.80 Jupiters',
    baseBodyNameZh: '木星',
    baseBodyNameEn: 'Jupiters'
  },
  {
    key: 'jupiter-ganymede',
    sourceId: 'jupiter',
    targetId: 'ganymede',
    nameZh: '木星-木卫三检验 (7.66个木星)',
    nameEn: 'Jupiter-Ganymede (7.66 Jupiters)',
    countFormulaTextZh: '1,070,400 km / 139,822 km = 7.66 个',
    countFormulaTextEn: '1,070,400 km / 139,822 km = 7.66 Jupiters',
    baseBodyNameZh: '木星',
    baseBodyNameEn: 'Jupiters'
  },
  {
    key: 'saturn-titan',
    sourceId: 'saturn',
    targetId: 'titan',
    nameZh: '土星-土卫六检验 (10.49个土星)',
    nameEn: 'Saturn-Titan (10.49 Saturns)',
    countFormulaTextZh: '1,221,870 km / 116,464 km = 10.49 个',
    countFormulaTextEn: '1,221,870 km / 116,464 km = 10.49 Saturns',
    baseBodyNameZh: '土星',
    baseBodyNameEn: 'Saturns'
  },
  {
    key: 'saturn-rhea',
    sourceId: 'saturn',
    targetId: 'rhea',
    nameZh: '土星-土卫五检验 (4.53个土星)',
    nameEn: 'Saturn-Rhea (4.53 Saturns)',
    countFormulaTextZh: '527,108 km / 116,464 km = 4.53 个',
    countFormulaTextEn: '527,108 km / 116,464 km = 4.53 Saturns',
    baseBodyNameZh: '土星',
    baseBodyNameEn: 'Saturns'
  },
  {
    key: 'uranus-titania',
    sourceId: 'uranus',
    targetId: 'titania',
    nameZh: '天王星-天卫三检验 (8.59个天王星)',
    nameEn: 'Uranus-Titania (8.59 Uranus)',
    countFormulaTextZh: '435,910 km / 50,724 km = 8.59 个',
    countFormulaTextEn: '435,910 km / 50,724 km = 8.59 Uranus',
    baseBodyNameZh: '天王星',
    baseBodyNameEn: 'Uranus'
  },
  {
    key: 'neptune-triton',
    sourceId: 'neptune',
    targetId: 'triton',
    nameZh: '海王星-海卫一检验 (7.20个海王星)',
    nameEn: 'Neptune-Triton (7.20 Neptunes)',
    countFormulaTextZh: '354,760 km / 49,244 km = 7.20 个',
    countFormulaTextEn: '354,760 km / 49,244 km = 7.20 Neptunes',
    baseBodyNameZh: '海王星',
    baseBodyNameEn: 'Neptunes'
  }
];

export const getExpectedCount = (key: string, visual: boolean, strict: boolean): { count: number; name: string } => {
  if (key === 'sun-earth') {
    if (visual) return { count: 10, name: 'Suns' };
    if (strict) return { count: 108, name: 'Suns' };
    return { count: 47, name: 'Suns' };
  }
  if (key === 'earth-moon') {
    if (visual) return { count: 1.3, name: 'Earths' };
    if (strict) return { count: 30, name: 'Earths' };
    return { count: 1.3, name: 'Earths' };
  }
  if (key === 'mars-phobos') {
    if (visual) return { count: 0.75, name: 'Mars' };
    if (strict) return { count: 1.38, name: 'Mars' };
    return { count: 1.38, name: 'Mars' };
  }
  if (key === 'jupiter-io') {
    if (visual) return { count: 0.82, name: 'Jupiters' };
    if (strict) return { count: 3.01, name: 'Jupiters' };
    return { count: 3.01, name: 'Jupiters' };
  }
  if (key === 'jupiter-europa') {
    if (visual) return { count: 1.12, name: 'Jupiters' };
    if (strict) return { count: 4.80, name: 'Jupiters' };
    return { count: 4.80, name: 'Jupiters' };
  }
  if (key === 'jupiter-ganymede') {
    if (visual) return { count: 1.47, name: 'Jupiters' };
    if (strict) return { count: 7.66, name: 'Jupiters' };
    return { count: 7.66, name: 'Jupiters' };
  }
  if (key === 'saturn-titan') {
    if (visual) return { count: 2.28, name: 'Saturns' };
    if (strict) return { count: 10.49, name: 'Saturns' };
    return { count: 10.49, name: 'Saturns' };
  }
  if (key === 'saturn-rhea') {
    if (visual) return { count: 1.85, name: 'Saturns' };
    if (strict) return { count: 4.53, name: 'Saturns' };
    return { count: 4.53, name: 'Saturns' };
  }
  if (key === 'uranus-titania') {
    if (visual) return { count: 1.76, name: 'Uranus' };
    if (strict) return { count: 8.59, name: 'Uranus' };
    return { count: 8.59, name: 'Uranus' };
  }
  if (key === 'neptune-triton') {
    if (visual) return { count: 1.62, name: 'Neptunes' };
    if (strict) return { count: 7.20, name: 'Neptunes' };
    return { count: 7.20, name: 'Neptunes' };
  }
  
  return { count: 108, name: 'Bodies' };
};

const getParentPlanetId = (id: string): string | null => {
  if (!id) return null;
  const lower = id.toLowerCase();
  if (['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'moon'].includes(lower)) {
    return lower === 'moon' ? 'earth' : lower;
  }
  for (const parentId of Object.keys(SATELLITE_DATA)) {
    if (SATELLITE_DATA[parentId].some(m => m.nameEn.toLowerCase() === lower)) {
      return parentId;
    }
  }
  return null;
};

// ============================================================================
// 地球动态云层 3D 着色器材料定义 (Earth Dynamic Cloud Layers Shader)
// ============================================================================
const CLOUD_VERTEX_SHADER = `
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const CLOUD_FRAGMENT_SHADER = `
  uniform sampler2D uCloudMap;
  uniform float uTime;
  uniform vec3 uLightDirection;
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    // 缓速自转流移，模拟云层漂移运动
    vec2 uv = vec2(vUv.x + uTime * 0.0035, vUv.y);
    
    // 采样真实的 NASA 拍摄地球大气气旋云图
    vec4 texColor = texture2D(uCloudMap, uv);
    float cloudDensity = texColor.r; // 红阶灰度代表云厚
    
    // 计算实时太阳入射角度漫射光照，使其完美契合地球 3D 的昼夜交替过渡
    float diffuse = clamp(dot(vNormal, uLightDirection) * 1.1 + 0.1, 0.0, 1.0);
    
    // 边缘发光效应 (大气 Rayleigh 散射，让高空云彩拥有一层惊艳的薄光)
    float fresnel = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 3.0);
    
    vec3 cloudColor = vec3(1.0, 1.0, 1.0);
    
    // 在夜半球让云层平滑变暗，在日照区和地壳边缘交界耀闪呈现真彩
    float alpha = cloudDensity * (diffuse * 0.88 + fresnel * 0.38);
    
    gl_FragColor = vec4(cloudColor, alpha);
  }
`;

const createCloudMaterial = (cloudTex: THREE.Texture) => {
  return new THREE.ShaderMaterial({
    vertexShader: CLOUD_VERTEX_SHADER,
    fragmentShader: CLOUD_FRAGMENT_SHADER,
    uniforms: {
      uTime: { value: 0 },
      uLightDirection: { value: new THREE.Vector3(1, 0, 0) },
      uCloudMap: { value: cloudTex }
    },
    transparent: true,
    depthWrite: false, // 防止云层盒体干扰地球阴影面及陆地法线
    blending: THREE.NormalBlending
  });
};

export default function UniverseViewer({
  currentTimestamp,
  useVisualScale,
  setUseVisualScale,
  selectedPlanetId,
  onSelectPlanet,
  crossSectionActive,
  lang,
  showConstellLines = false,
  validationPairKey,
  setValidationPairKey,
  panelTab,
  setPanelTab,
  packingActive,
  setPackingActive,
  packingProgressDone,
  setPackingProgressDone,
  packingMode,
  setPackingMode,
  strictPhysics,
  setStrictPhysics,
  focusTrigger,
  useExponentialSpeed,
  customSpeedPreset
}: UniverseViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const planetMeshesRef = useRef<Record<string, THREE.Group>>({});
  const orbitLinesRef = useRef<Record<string, THREE.Line>>({});
  const sunMeshRef = useRef<THREE.Group | null>(null);
  const constellLinesRef = useRef<THREE.LineSegments | null>(null);

  const getSunRadius = (): number => {
    if (useVisualScale) {
      return 1.05;
    } else if (strictPhysics) {
      return 22.0 / (2 * 108.0); // 0.10185 (Exactly 108 Suns fill the 22.0 units Sun-Earth AU distance)
    } else {
      return 0.232; // Normal high-visibility physical mode
    }
  };

  const getPlanetRadius = (id: string): number => {
    if (useVisualScale) {
      // 视觉比例优化下的行星大小配置（高可见度）
      switch(id) {
        case 'mercury': return 0.20;
        case 'venus': return 0.32;
        case 'earth': return 0.38;
        case 'moon': return 0.09;
        case 'mars': return 0.24;
        case 'jupiter': return 0.85;
        case 'saturn': return 0.70;
        case 'uranus': return 0.48;
        case 'neptune': return 0.45;
        default: return 0.3;
      }
    } else if (strictPhysics) {
      // 严格 1:1 绝对物理比例 (空间轨道尺度 22.0 与星体尺寸完美对齐！)
      const baseSunRad = 22.0 / (2 * 108.0); // 0.10185
      switch(id) {
        case 'mercury': return baseSunRad * (2439.7 / 696340.0);
        case 'venus': return baseSunRad * (6051.8 / 696340.0);
        case 'earth': return baseSunRad * (6371.0 / 696340.0);
        case 'moon': return baseSunRad * (1737.4 / 696340.0);
        case 'mars': return baseSunRad * (3389.5 / 696340.0);
        case 'jupiter': return baseSunRad * (69911.0 / 696340.0);
        case 'saturn': return baseSunRad * (58232.0 / 696340.0);
        case 'uranus': return baseSunRad * (25362.0 / 696340.0);
        case 'neptune': return baseSunRad * (24622.0 / 696340.0);
        default: return baseSunRad * 0.01;
      }
    } else {
      // 物理模式下的行星可观测放大（防行星缩至分子级别不可见）
      switch(id) {
        case 'mercury': return 0.058;
        case 'venus': return 0.106;
        case 'earth': return 0.11;
        case 'moon': return 0.03;
        case 'mars': return 0.072;
        case 'jupiter': return 0.54;
        case 'saturn': return 0.46;
        case 'uranus': return 0.27;
        case 'neptune': return 0.26;
        default: return 0.1;
      }
    }
  };

  const currentTimestampRef = useRef(currentTimestamp);
  const selectedPlanetIdRef = useRef(selectedPlanetId);
  const crossSectionActiveRef = useRef(crossSectionActive);
  const useExponentialSpeedRef = useRef(useExponentialSpeed);
  const customSpeedPresetRef = useRef(customSpeedPreset);

  const lastSelectedPlanetIdRef = useRef<string>('');
  const lastTargetPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    currentTimestampRef.current = currentTimestamp;
  }, [currentTimestamp]);

  useEffect(() => {
    selectedPlanetIdRef.current = selectedPlanetId;
  }, [selectedPlanetId]);

  useEffect(() => {
    crossSectionActiveRef.current = crossSectionActive;
  }, [crossSectionActive]);

  useEffect(() => {
    useExponentialSpeedRef.current = useExponentialSpeed;
  }, [useExponentialSpeed]);

  useEffect(() => {
    customSpeedPresetRef.current = customSpeedPreset;
  }, [customSpeedPreset]);

  useEffect(() => {
    if (constellLinesRef.current) {
      constellLinesRef.current.visible = !!showConstellLines;
    }
  }, [showConstellLines]);
  
  const flareOpacityRef = useRef(1.0);  // 镜头光晕平滑淡入淡出插值机点

  // 用于计算镜头光晕 (Lens Flare) 的屏幕投影坐标
  const [sunScreenPos, setSunScreenPos] = useState<{ x: number; y: number; visible: boolean; scale: number; opacity: number } | null>(null);
  const [zoomLevelText, setZoomLevelText] = useState<string>('0%');

  // == 日地距离几何排列验证系统 (Sun-Earth Distance Validation Simulation System) ==
  const packingActiveRef = useRef<boolean>(false);
  const packingProgressDoneRef = useRef<number>(0);
  const packingModeRef = useRef<'physical' | 'visual'>('physical');
  const strictPhysicsRef = useRef<boolean>(false);
  const packingGroupRef = useRef<THREE.Group | null>(null);

  const validationPairKeyRef = useRef<string>('sun-earth');

  useEffect(() => {
    validationPairKeyRef.current = validationPairKey;
    packingProgressDoneRef.current = 0;
    setPackingProgressDone(0);
  }, [validationPairKey, setPackingProgressDone]);

  useEffect(() => {
    packingActiveRef.current = packingActive;
    if (!packingActive) {
      packingProgressDoneRef.current = 0;
      setPackingProgressDone(0);
    }
  }, [packingActive, setPackingProgressDone]);

  useEffect(() => {
    packingModeRef.current = packingMode;
    packingProgressDoneRef.current = 0;
    setPackingProgressDone(0);
  }, [packingMode, setPackingProgressDone]);

  useEffect(() => {
    strictPhysicsRef.current = strictPhysics;
    packingProgressDoneRef.current = 0;
    setPackingProgressDone(0);
  }, [strictPhysics, setPackingProgressDone]);

  // 鼠标 Hover 互动和浮空卡片属性
  const [hoveredPlanetId, setHoveredPlanetId] = useState<string | null>(null);
  const [hoveredSatelliteName, setHoveredSatelliteName] = useState<{ zh: string; en: string } | null>(null);
  const [hoveredPlanetPos, setHoveredPlanetPos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredLayer, setHoveredLayer] = useState<'core' | 'mantle' | 'crust' | 'atmosphere' | null>(null);

  const hoveredPlanetIdRef = useRef<string | null>(null);
  const hoveredSatelliteNameRef = useRef<{ zh: string; en: string } | null>(null);
  const hoveredLayerRef = useRef<'core' | 'mantle' | 'crust' | 'atmosphere' | null>(null);

  useEffect(() => {
    hoveredPlanetIdRef.current = hoveredPlanetId;
  }, [hoveredPlanetId]);

  useEffect(() => {
    hoveredSatelliteNameRef.current = hoveredSatelliteName;
  }, [hoveredSatelliteName]);

  useEffect(() => {
    hoveredLayerRef.current = hoveredLayer;
  }, [hoveredLayer]);

  useEffect(() => {
    if (constellLinesRef.current) {
      constellLinesRef.current.visible = !!showConstellLines;
    }
  }, [showConstellLines]);

  // 真实的 8K/高清晰度(CORS Allowed)太空贴图资源库 (采用 jsdelivr 节点无阻碍高阶 CDN 加速)
  const REAL_TEXTURE_URLS: Record<string, string> = {
    sun: 'https://cdn.jsdelivr.net/gh/johan-m-o/Solar-System-3D@master/assets/images/sun.jpg',
    mercury: 'https://cdn.jsdelivr.net/gh/johan-m-o/Solar-System-3D@master/assets/images/mercury.jpg',
    venus: 'https://cdn.jsdelivr.net/gh/johan-m-o/Solar-System-3D@master/assets/images/venus.jpg',
    earth: 'https://cdn.jsdelivr.net/gh/johan-m-o/Solar-System-3D@master/assets/images/earth.jpg',
    moon: 'https://cdn.jsdelivr.net/gh/johan-m-o/Solar-System-3D@master/assets/images/moon.jpg',
    mars: 'https://cdn.jsdelivr.net/gh/johan-m-o/Solar-System-3D@master/assets/images/mars.jpg',
    jupiter: 'https://cdn.jsdelivr.net/gh/johan-m-o/Solar-System-3D@master/assets/images/jupiter.jpg',
    saturn: 'https://cdn.jsdelivr.net/gh/johan-m-o/Solar-System-3D@master/assets/images/saturn.jpg',
    uranus: 'https://cdn.jsdelivr.net/gh/johan-m-o/Solar-System-3D@master/assets/images/uranus.jpg',
    neptune: 'https://cdn.jsdelivr.net/gh/johan-m-o/Solar-System-3D@master/assets/images/neptune.jpg',
    earth_clouds: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/textures/planets/earth_clouds_1024.png',
    earth_specular: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/textures/planets/earth_specular_2048.jpg',
  };

  const textureCacheRef = useRef<Record<string, THREE.Texture>>({});

  // 统一异步网路纹理加速器 (带高阶 Canvas 程序化备份，绝对不黑屏不报错)
  const getPlanetTexture = (id: string, onUpdate?: () => void): THREE.Texture => {
    if (textureCacheRef.current[id]) {
      return textureCacheRef.current[id];
    }

    const fallbackTex = createProceduralTexture(id);
    textureCacheRef.current[id] = fallbackTex;

    const realUrl = REAL_TEXTURE_URLS[id];
    if (realUrl) {
      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin('anonymous');
      loader.load(
        realUrl,
        (loadedTex) => {
          loadedTex.colorSpace = THREE.SRGBColorSpace;
          
          if (id === 'earth_clouds') {
            loadedTex.wrapS = THREE.RepeatWrapping;
            loadedTex.wrapT = THREE.ClampToEdgeWrapping;
          } else {
            loadedTex.wrapS = THREE.ClampToEdgeWrapping;
            loadedTex.wrapT = THREE.ClampToEdgeWrapping;
          }

          // 核心高稳定性渐进绘制：将网络下载的真彩位图精确绘制在已有 Canvas 上，安全跨越 WebGL 内部切换局限
          const img = loadedTex.image;
          const canvas = fallbackTex.image as HTMLCanvasElement;
          if (canvas && canvas.getContext) {
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              fallbackTex.wrapS = loadedTex.wrapS;
              fallbackTex.wrapT = loadedTex.wrapT;
              fallbackTex.colorSpace = loadedTex.colorSpace;
              fallbackTex.needsUpdate = true;
            }
          }
          
          if (onUpdate) {
            onUpdate();
          }
        },
        undefined,
        (err) => {
          console.warn(`NASA texture loading failed for ${id}, using beautiful high-definition procedural engine fallback.`, err);
        }
      );
    }

    return fallbackTex;
  };

  // 生成程序化丰富高精度(HD)贴图，防止加载外部文件跨域或不存在的问题 (升级为 HD 超清 2048x1024 纹理画板)
  const createProceduralTexture = (id: string): THREE.Texture => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(2, 2); // 自动对齐坐标实现高分辨率平滑渲染 (4K超清级清晰度)

    if (id === 'sun') {
      // 太阳：暗红色背景配超高亮度金黄色热流
      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0, '#ff1a00');
      grad.addColorStop(0.3, '#ffaa00');
      grad.addColorStop(0.7, '#ffcc00');
      grad.addColorStop(1, '#e11d48');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 512);

      // 叠加活跃热浪泡 (granulation noise layer)
      for (let i = 0; i < 400; i++) {
        const x = Math.random() * 1024;
        const y = Math.random() * 512;
        const r = Math.random() * 25 + 5;
        const gradBubble = ctx.createRadialGradient(x, y, 0, x, y, r);
        gradBubble.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
        gradBubble.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = gradBubble;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 绘制日冕耀斑磁线 (Coronal Loop Threads)
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 12;
      for (let i = 0; i < 6; i++) {
        ctx.strokeStyle = 'rgba(255, 255, 230, 0.7)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        const startX = 120 + i * 160 + Math.random() * 40;
        const startY = 160 + Math.random() * 200;
        ctx.moveTo(startX, startY);
        ctx.bezierCurveTo(startX + 40, startY - 50, startX + 80, startY - 50, startX + 120, startY);
        ctx.stroke();

        // 磁力焦点上的深色太阳黑子 (Spots)
        ctx.fillStyle = 'rgba(40, 5, 0, 0.9)';
        ctx.beginPath();
        ctx.arc(startX + 60, startY - 10, 6 + Math.random() * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0; // 重置
    } else if (id === 'mercury') {
      // 水星：粗糙撞击坑地貌，配合白色的极地溅射条纹
      ctx.fillStyle = '#4b5563';
      ctx.fillRect(0, 0, 1024, 512);

      // 暗黑色玄武岩低地月海
      for (let i = 0; i < 8; i++) {
        const x = Math.random() * 1024;
        const y = Math.random() * 512;
        const r = Math.random() * 110 + 30;
        const gradBasalt = ctx.createRadialGradient(x, y, 0, x, y, r);
        gradBasalt.addColorStop(0, '#1f2937');
        gradBasalt.addColorStop(1, 'rgba(75, 85, 99, 0)');
        ctx.fillStyle = gradBasalt;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 喷发坑与大断流
      for (let i = 0; i < 280; i++) {
        const x = Math.random() * 1024;
        const y = Math.random() * 512;
        const r = Math.random() * 10 + 2;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(209, 213, 219, 0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();

        // 为大月坑绘制辐射发射线
        if (r > 7 && Math.random() > 0.6) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
          ctx.lineWidth = 0.8;
          for (let k = 0; k < 6; k++) {
            const angle = (k / 6) * Math.PI * 2;
            const length = Math.random() * 90 + 20;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
            ctx.stroke();
          }
        }
      }
    } else if (id === 'venus') {
      // 金星：浓绸的铜黄色硫酸巨暴风带
      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0, '#78350f');
      grad.addColorStop(0.3, '#eab308');
      grad.addColorStop(0.6, '#fef08a');
      grad.addColorStop(0.85, '#ca8a04');
      grad.addColorStop(1, '#451a03');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 512);

      // 极地大型漩涡与大气横流
      ctx.lineWidth = 14;
      for (let i = 0; i < 12; i++) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${Math.random() * 0.16})`;
        ctx.beginPath();
        const baseH = 50 + i * 40;
        ctx.moveTo(0, baseH);
        ctx.bezierCurveTo(256, baseH + 45, 768, baseH - 45, 1024, baseH);
        ctx.stroke();
      }
    } else if (id === 'earth') {
      // 地球：蔚蓝色大洋、精细大陆地形和飞旋白色云层
      ctx.fillStyle = '#1d4ed8'; // 浅蓝色大陆海岸架
      ctx.fillRect(0, 0, 1024, 512);

      // 深色洋底
      ctx.fillStyle = '#1e3a8a';
      for (let i = 0; i < 12; i++) {
        ctx.beginPath();
        ctx.arc(160 + i * 80, 260 + Math.random() * 80, 120, 0, Math.PI * 2);
        ctx.fill();
      }

      // 绘制几块巨大的森林绿大陆轮廓
      ctx.fillStyle = '#15803d'; // 肥沃森山绿
      
      // 1. 亚欧非板块
      ctx.beginPath();
      ctx.moveTo(200, 80);
      ctx.bezierCurveTo(260, 90, 340, 40, 480, 50); // 西伯利亚
      ctx.bezierCurveTo(550, 75, 500, 160, 490, 200); // 东南亚
      ctx.lineTo(430, 180);
      ctx.lineTo(410, 240); // 印度与阿拉伯
      ctx.bezierCurveTo(390, 250, 360, 200, 320, 210);
      ctx.bezierCurveTo(300, 230, 290, 350, 240, 380); // 非洲
      ctx.bezierCurveTo(180, 330, 170, 210, 220, 180);
      ctx.lineTo(180, 150);
      ctx.closePath();
      ctx.fill();

      // 加上金黄色的撒哈拉大沙漠和西亚大平原
      ctx.fillStyle = '#b45309'; // 荒漠沙黄
      ctx.beginPath();
      ctx.moveTo(210, 150);
      ctx.lineTo(340, 145);
      ctx.lineTo(330, 210);
      ctx.lineTo(200, 190);
      ctx.closePath();
      ctx.fill();

      // 2. 美洲大陆
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.moveTo(680, 60);
      ctx.bezierCurveTo(760, 80, 900, 60, 880, 130); // 北美
      ctx.lineTo(800, 140);
      ctx.lineTo(760, 220); // 墨西哥湾
      ctx.bezierCurveTo(770, 230, 840, 250, 870, 290); // 巴西
      ctx.lineTo(820, 410); // 阿根廷
      ctx.lineTo(780, 310);
      ctx.lineTo(740, 240);
      ctx.bezierCurveTo(680, 210, 620, 130, 680, 60);
      ctx.closePath();
      ctx.fill();

      // 3. 澳大利亚
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.ellipse(560, 330, 60, 40, Math.PI / 8, 0, Math.PI * 2);
      ctx.fill();

      // 4. 南极大陆
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 480, 1024, 32);

      // 叠加白色羽状云气
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      for (let i = 0; i < 35; i++) {
        const cx = Math.random() * 1024;
        const cy = 60 + Math.random() * 380;
        const cr = Math.random() * 32 + 10;
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.arc(cx + cr * 0.7, cy + cr * 0.1, cr * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (id === 'moon') {
      // 月球：银灰、黑白相间的玄武岩和高地
      ctx.fillStyle = '#9ca3af';
      ctx.fillRect(0, 0, 1024, 512);

      ctx.fillStyle = '#4b5563'; // 黑色月海月面
      const craters = [
        { x: 300, y: 160, rx: 110, ry: 70 },
        { x: 480, y: 220, rx: 100, ry: 80 },
        { x: 740, y: 140, rx: 130, ry: 60 },
        { x: 200, y: 310, rx: 70, ry: 50 },
        { x: 620, y: 320, rx: 80, ry: 50 }
      ];
      craters.forEach(c => {
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, c.rx, c.ry, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // 月表丰富密集的微陨击坑 (crater system)
      for (let i = 0; i < 200; i++) {
        const x = Math.random() * 1024;
        const y = Math.random() * 512;
        const r = Math.random() * 8 + 1.5;

        ctx.fillStyle = 'rgba(31, 41, 55, 0.4)';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(243, 244, 246, 0.45)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();

        if (r > 6 && Math.random() > 0.7) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.lineWidth = 0.8;
          for (let j = 0; j < 8; j++) {
            const angle = (j / 8) * Math.PI * 2;
            const len = Math.random() * 100 + 30;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
            ctx.stroke();
          }
        }
      }
    } else if (id === 'mars') {
      // 火星：氧化铁荒漠沙尘大地、干冰雪白极冠、及深沙黑海
      ctx.fillStyle = '#b45309'; // 浓厚氧化铁红
      ctx.fillRect(0, 0, 1024, 512);

      // 深褐色低海
      ctx.fillStyle = '#451a03';
      for (let i = 0; i < 6; i++) {
        const x = 150 + i * 160 + Math.random() * 40;
        const y = 200 + Math.random() * 100;
        ctx.beginPath();
        ctx.ellipse(x, y, 100 + Math.random() * 40, 60 + Math.random() * 15, Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // 著名的水手号大峡谷裂痕 (Valles Marineris)
      ctx.strokeStyle = '#1e0b00';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(340, 260);
      ctx.bezierCurveTo(440, 240, 540, 280, 640, 250);
      ctx.stroke();

      // 南北两极晶莹剔透的水冰极冠 (Mars Cap)
      ctx.fillStyle = '#f9fafb';
      // 北极
      ctx.beginPath();
      ctx.ellipse(512, 0, 150, 35, 0, 0, Math.PI * 2);
      ctx.fill();
      // 南极
      ctx.beginPath();
      ctx.ellipse(512, 512, 120, 28, 0, 0, Math.PI * 2);
      ctx.fill();

      // 稀薄黑蚀洞
      for (let i = 0; i < 90; i++) {
        ctx.fillStyle = 'rgba(69, 26, 3, 0.3)';
        ctx.beginPath();
        ctx.arc(Math.random() * 1024, Math.random() * 512, Math.random() * 8 + 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (id === 'jupiter') {
      // 木星：气态巨行星霸道的金黄茶褐和纯白条纹层，大红斑，以及大量气流花结
      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0, '#451a03');
      grad.addColorStop(0.16, '#ca8a04');
      grad.addColorStop(0.3, '#fef08a');
      grad.addColorStop(0.48, '#b45309');
      grad.addColorStop(0.52, '#fde047');
      grad.addColorStop(0.68, '#78350f');
      grad.addColorStop(0.85, '#fef9c3');
      grad.addColorStop(1, '#6b21a8');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 512);

      // 一系列横向紊动巨暴风纹
      ctx.lineWidth = 15;
      for (let i = 0; i < 16; i++) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${Math.random() * 0.22})`;
        ctx.beginPath();
        const baseH = 30 + i * 29;
        ctx.moveTo(0, baseH);
        ctx.bezierCurveTo(256, baseH + 30, 768, baseH - 30, 1024, baseH);
        ctx.stroke();
      }

      // 经典木星大红斑 (Great Red Spot)
      const gx = 650;
      const gy = 350;

      // 巨幅热力带
      const rGrad = ctx.createRadialGradient(gx, gy, 5, gx, gy, 45);
      rGrad.addColorStop(0, '#991b1b'); // 赤红核心
      rGrad.addColorStop(0.5, '#dc2626'); // 橘红
      rGrad.addColorStop(1, '#450a0a'); // 边缘
      ctx.fillStyle = rGrad;
      ctx.beginPath();
      ctx.ellipse(gx, gy, 55, 30, 0, 0, Math.PI * 2);
      ctx.fill();

      // 大红斑环线气旋
      ctx.strokeStyle = '#fef3c7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(gx, gy, 68, 40, 0, 0, Math.PI * 2);
      ctx.stroke();

      // 巨行星上的次级白色暴风漩涡点 (White Storms)
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.ellipse(100 + i * 120, 180 + (i % 2) * 80, 15, 9, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (id === 'saturn') {
      // 土星：平滑温柔的米金色淡彩条带
      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0, '#854d0e');
      grad.addColorStop(0.24, '#fde047');
      grad.addColorStop(0.5, '#fef08a');
      grad.addColorStop(0.76, '#ca8a04');
      grad.addColorStop(1, '#713f12');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 512);

      // 大气横线
      ctx.lineWidth = 8;
      for (let i = 0; i < 14; i++) {
        ctx.strokeStyle = `rgba(255, 255, 240, ${0.1 + Math.random() * 0.1})`;
        ctx.beginPath();
        const baseH = 40 + i * 32;
        ctx.moveTo(0, baseH);
        ctx.bezierCurveTo(256, baseH + 15, 768, baseH - 15, 1024, baseH);
        ctx.stroke();
      }
    } else if (id === 'uranus') {
      // 天王星：冰冷剔透的宁静青蓝色
      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0, '#0369a1');
      grad.addColorStop(0.45, '#06b6d4');
      grad.addColorStop(0.55, '#22d3ee');
      grad.addColorStop(1, '#0e7490');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 512);

      // 微弱水平气体纹
      ctx.lineWidth = 12;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.moveTo(0, 140);
      ctx.bezierCurveTo(256, 155, 768, 125, 1024, 140);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 310);
      ctx.bezierCurveTo(256, 295, 768, 325, 1024, 310);
      ctx.stroke();
    } else if (id === 'neptune') {
      // 海王星：神秘深海宝蓝色、高空 cirrus 斜纹和独特的深色核心气旋
      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0, '#1e3a8a');
      grad.addColorStop(0.35, '#1d4ed8');
      grad.addColorStop(0.65, '#2563eb');
      grad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 512);

      // 横条
      ctx.lineWidth = 6;
      for (let i = 0; i < 10; i++) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 + Math.random() * 0.08})`;
        ctx.beginPath();
        const baseH = 50 + i * 42;
        ctx.moveTo(0, baseH);
        ctx.bezierCurveTo(256, baseH + 18, 768, baseH - 18, 1024, baseH);
        ctx.stroke();
      }

      // 海王星大暗斑 (Great Dark Spot)
      const dx = 710;
      const dy = 280;

      const dGrad = ctx.createRadialGradient(dx, dy, 3, dx, dy, 35);
      dGrad.addColorStop(0, '#030712'); // 极暗黑蓝
      dGrad.addColorStop(0.5, '#172554');
      dGrad.addColorStop(1, '#1d4ed8');
      ctx.fillStyle = dGrad;
      ctx.beginPath();
      ctx.ellipse(dx, dy, 36, 22, Math.PI / 10, 0, Math.PI * 2);
      ctx.fill();

      // “疾行者”白云纹
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(dx - 50, dy + 50);
      ctx.bezierCurveTo(dx, dy + 60, dx + 30, dy + 30, dx + 60, dy + 45);
      ctx.stroke();
    } else if (id === 'earth_clouds') {
      // 简易云气层：随机渲染白色晕光云团作为备选云层
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 1024, 512);

      // 绘制松散的白云气旋
      for (let i = 0; i < 45; i++) {
        const x = Math.random() * 1024;
        const y = Math.random() * 512;
        const r = Math.random() * 110 + 35;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.72)');
        grad.addColorStop(0.35, 'rgba(240, 248, 255, 0.38)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (id === 'earth_specular') {
      // 地球高反光细节：海洋反光强(高亮灰度)，陆地反光弱(暗黑色)
      ctx.fillStyle = '#1e1e1e'; // 陆地不反光
      ctx.fillRect(0, 0, 1024, 512);
      ctx.fillStyle = '#eaeaea'; // 大洋强反光
      // 渲染基本的拼合海洋块板，供离线反射兜底
      ctx.beginPath();
      ctx.arc(160, 240, 170, 0, Math.PI * 2);
      ctx.arc(480, 200, 140, 0, Math.PI * 2);
      ctx.arc(820, 310, 160, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  };

  // 生成 Concentric 米色和卡西尼土星环 HD 1D 线性纹理
  const createRingTexture = (): THREE.Texture => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0, 'rgba(120, 100, 70, 0.1)');
    grad.addColorStop(0.12, 'rgba(220, 201, 171, 0.5)');
    grad.addColorStop(0.35, 'rgba(189, 171, 140, 0.7)');
    grad.addColorStop(0.48, 'rgba(30, 25, 20, 0.03)'); // Cassini Division 卡西尼缝
    grad.addColorStop(0.52, 'rgba(191, 170, 131, 0.72)');
    grad.addColorStop(0.72, 'rgba(230, 211, 180, 0.6)');
    grad.addColorStop(0.85, 'rgba(141, 120, 96, 0.3)');
    grad.addColorStop(0.95, 'rgba(60, 50, 42, 0.01)'); // Encke Division 恩克缝
    grad.addColorStop(1, 'rgba(40, 35, 30, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  };

  // 生成月球朦胧雾态光晕 (Misty Moonlight Glow Sprite) 径向渐变贴图
  const createMoonGlowTexture = (): THREE.Texture => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    // 从极透亮淡蓝白色，过度到柔和的冰蓝色，随后呈对数曲线完全弥散，创造清幽、有厚度感的「朦胧白月光」效果
    grad.addColorStop(0, 'rgba(240, 246, 255, 0.7)');
    grad.addColorStop(0.18, 'rgba(224, 242, 254, 0.45)');
    grad.addColorStop(0.42, 'rgba(186, 230, 253, 0.16)');
    grad.addColorStop(0.75, 'rgba(147, 197, 253, 0.04)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(64, 64, 64, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  };

  // 生成太阳耀眼日晕极炽深热发光 (Hyper-Radiant Solar Glare Sprite) 径向渐变贴图
  const createSunGlowTexture = (): THREE.Texture => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    // 超高温核心金色、过渡到火焰明橙色，边缘以高灵敏度散逸至深红，塑造极具层次的热物理日冕质感
    grad.addColorStop(0, 'rgba(255, 253, 230, 0.85)');
    grad.addColorStop(0.12, 'rgba(254, 215, 170, 0.55)');
    grad.addColorStop(0.35, 'rgba(251, 146, 60, 0.22)');
    grad.addColorStop(0.65, 'rgba(239, 68, 68, 0.05)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(128, 128, 128, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  };

  // 生成三维宇宙背景星芒 (4-Point Diffraction Spikes) 径向渐变贴图
  const createUniverseStarTexture = (): THREE.Texture => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.createImageData(32, 32);
    const data = imgData.data;
    
    const decay_radius = 2.2;
    const thickness_decay = 0.55;
    const length_decay = 9.0;
    
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const dx = x - 15.5;
        const dy = y - 15.5;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const glow = Math.exp(-dist / decay_radius);
        const spikeH = Math.exp(-Math.abs(dy) / thickness_decay) * Math.exp(-Math.abs(dx) / length_decay);
        const spikeV = Math.exp(-Math.abs(dx) / thickness_decay) * Math.exp(-Math.abs(dy) / length_decay);
        
        let intensity = glow + 0.65 * (spikeH + spikeV);
        intensity = Math.max(0.0, Math.min(1.0, intensity));
        
        const idx = (y * 32 + x) * 4;
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
        data[idx + 3] = Math.floor(intensity * 255);
      }
    }
    ctx.putImageData(imgData, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  };

  // 初始化 Three 场景
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 星体轨道物理缩放常数（重要：使各星体公转处于太阳半径 2.0 之外）
    const ORBIT_SCALE = 22.0;

    // Astronomer-level coordinate mapping function
    // OrbitEngine: X, Y are in orbital plane, Z is vertical out-of-plane.
    // Three.js: X, Z are horizontal, Y is vertical out-of-plane (up vector).
    // Maps OrbitEngine (X, Y, Z) directly to Three.js (X, Z, Y) standard horizontal plane.
    const toThreePos = (p: { x: number, y: number, z: number }, scale = 1.0) => {
      return new THREE.Vector3(p.x * scale, p.z * scale, p.y * scale);
    };

    // 1. 创建 Scene, Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const packingGroup = new THREE.Group();
    packingGroup.name = 'sun-packing-group';
    scene.add(packingGroup);
    packingGroupRef.current = packingGroup;

    const width = container.clientWidth || window.innerWidth || 800;
    const height = container.clientHeight || window.innerHeight || 600;
    // 增加远剪裁面为 2500，防止真实尺度轨道下的海王星(660单位)或拉远视图被裁剪
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.05, 2500);
    camera.position.set(0, 25, 35);
    cameraRef.current = camera;

    // 2. 创建 WebGLRenderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    
    // Style the canvas physically to fill container and display as block (prevent baseline gap / squeeze)
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 3. 创建 OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 1800;
    controls.minDistance = 0.5;
    controlsRef.current = controls;

    // 4. 环境光 + 核心太阳光源点光源 (直面展示星体暗面与照亮面)
    const ambientLight = new THREE.AmbientLight(0x0e0e16);
    scene.add(ambientLight);

    // 增大光照直照范围至 2500
    const sunPointLight = new THREE.PointLight(0xffffff, 2.5, 2500, 0.1);
    sunPointLight.position.set(0, 0, 0);
    sunPointLight.castShadow = true;
    scene.add(sunPointLight);

    // 5. 真实恒星由 StellarField3D 在真实 3D 坐标中渲染，不再使用虚构球壳背景

    // 6. 渲染太阳 (Sun) 独具日冕层与独立光晕
    const sunGroup = new THREE.Group();
    scene.add(sunGroup);
    sunMeshRef.current = sunGroup;

    // 宇宙学家视觉尺度修正：根据是否开启“视觉比例优化”或“严格1:1真物理比例”调节太阳几何半径
    const sunRadius = getSunRadius();
    const coronaRadius = sunRadius * 1.15;

    // 太阳内球体
    const sunTex = getPlanetTexture('sun');
    const sunGeo = new THREE.SphereGeometry(sunRadius, 32, 16);
    const sunMat = new THREE.MeshBasicMaterial({ map: sunTex });
    const sunInnerMesh = new THREE.Mesh(sunGeo, sunMat);
    sunInnerMesh.name = 'sun-inner-mesh';
    sunGroup.add(sunInnerMesh);

    // 增加太阳的 X-Y-Z 坐标轴展示
    const sunAxes = new THREE.AxesHelper(sunRadius * 2.2);
    sunAxes.name = 'axes-helper';
    sunInnerMesh.add(sunAxes);

    // 太阳日冕发光环外层 (Corona Core)
    // A. 太阳日冕发光环内层 (Corona Core - Bright Gold)
    const coronaGeo = new THREE.SphereGeometry(sunRadius * 1.08, 32, 16);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: 0xffe066,
      transparent: true,
      opacity: 0.45,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    });
    const coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
    sunGroup.add(coronaMesh);

    // B. 太阳热流散射包络外层 (Corona Outer - Intense Red/Orange)
    const coronaOuterGeo = new THREE.SphereGeometry(sunRadius * 1.25, 32, 16);
    const coronaOuterMat = new THREE.MeshBasicMaterial({
      color: 0xff4d00,
      transparent: true,
      opacity: 0.22,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    });
    const coronaOuterMesh = new THREE.Mesh(coronaOuterGeo, coronaOuterMat);
    sunGroup.add(coronaOuterMesh);

    // C. 3D 太阳全向辐射偏振光晕精灵 (3D Camera-Facing Radiant Solar Glare)
    const solarGlowSpriteMat = new THREE.SpriteMaterial({
      map: createSunGlowTexture(),
      color: 0xffffff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const solarGlowSprite = new THREE.Sprite(solarGlowSpriteMat);
    solarGlowSprite.name = 'sun-glow-sprite';
    solarGlowSprite.scale.set(sunRadius * 3.8, sunRadius * 3.8, 1);
    sunGroup.add(solarGlowSprite);

    // 8. 创建 8 大行星以及月球
    // 宇宙学家尺度优化：在优化模式下开辟更大星空负空间；在真实尺寸模式下按照真实物理半径幂律压缩
    const planetsConfig = [
      { id: 'mercury', radius: getPlanetRadius('mercury'), color: 0x8e8e93 },
      { id: 'venus', radius: getPlanetRadius('venus'), color: 0xe5c158 },
      { id: 'earth', radius: getPlanetRadius('earth'), color: 0x3a82f6 },
      { id: 'moon', radius: getPlanetRadius('moon'), color: 0xb0b0b0 },
      { id: 'mars', radius: getPlanetRadius('mars'), color: 0xef4444 },
      { id: 'jupiter', radius: getPlanetRadius('jupiter'), color: 0xf59e0b },
      { id: 'saturn', radius: getPlanetRadius('saturn'), color: 0xebc071 },
      { id: 'uranus', radius: getPlanetRadius('uranus'), color: 0x06b6d4 },
      { id: 'neptune', radius: getPlanetRadius('neptune'), color: 0x3b82f6 }
    ];

    planetMeshesRef.current = {};
    orbitLinesRef.current = {};

    planetsConfig.forEach(config => {
      // 每一颗行星配置独立 Group
      const planetGroup = new THREE.Group();
      scene.add(planetGroup);
      planetMeshesRef.current[config.id] = planetGroup;

      const isMoon = config.id === 'moon';

      // 每一颗星体配置独立自转倾斜 Group (Tilt Group)
      const tiltGroup = new THREE.Group();
      tiltGroup.name = 'planet-tilt-root';
      const obliquityRad = ((CELESTIAL_PHYSICS[config.id as keyof typeof CELESTIAL_PHYSICS]?.obliquity || 0) * Math.PI) / 180;
      tiltGroup.rotation.z = obliquityRad;
      planetGroup.add(tiltGroup);

      // 绘制公转运行轨道 (除了月球，月球轨道单独绘制在地球Group内)
      if (!isMoon) {
        // 创建静止完整环形轨道虚线/细线 - 配合 ORBIT_SCALE 因子排布位置
        const orbitPoints: THREE.Vector3[] = [];
        const samples = 2500;
        for (let j = 0; j <= samples; j++) {
          const daysEquivalent = (j / samples) * (PLANET_ORBITAL_DATA[config.id]?.period || 365);
          const pos = OrbitEngine.getHeliocentricPosition(config.id, daysEquivalent, useVisualScale);
          orbitPoints.push(toThreePos(pos, ORBIT_SCALE));
        }
        const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
        const orbitMat = new THREE.LineBasicMaterial({
          color: config.color,
          transparent: true,
          opacity: 0.22
        });
        const orbitLine = new THREE.Line(orbitGeo, orbitMat);
        scene.add(orbitLine);
        orbitLinesRef.current[config.id] = orbitLine;
      } else {
        // == 绘制月球围绕地球的公转轨道 (Natural Moon Orbit around Earth) ==
        const orbitPoints: THREE.Vector3[] = [];
        const samples = 1000;
        const iRad = (5.145 * Math.PI) / 180.0; // 5.145 度黄白交角
        const moonA = 0.00257;
        const finalA = moonA * 18 * ORBIT_SCALE; // ~1.018 个单位，完美适配 OrbitEngine
        for (let j = 0; j <= samples; j++) {
          const theta = (j / samples) * Math.PI * 2;
          const x = finalA * Math.cos(theta);
          const y = finalA * Math.sin(theta) * Math.cos(iRad);
          const z = finalA * Math.sin(theta) * Math.sin(iRad);
          orbitPoints.push(new THREE.Vector3(x, z, y)); // Map horizontally: X = x, Y = z, Z = y
        }
        const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
        const orbitMat = new THREE.LineBasicMaterial({
          color: config.color,
          transparent: true,
          opacity: 0.28
        });
        const orbitLine = new THREE.Line(orbitGeo, orbitMat);
        orbitLine.name = 'moon-orbit-line';
        
        // 挂载到其母星地球的 main Group 中，使月球公转轨道盘完美同步地球公转位移
        // 且不受地球高频24小时自转角速度与赤道倾斜影响，促成月相在正确的黄道轨线中流畅演示！
        const earthGroup = planetMeshesRef.current['earth'];
        if (earthGroup) {
          earthGroup.add(orbitLine);
        } else {
          scene.add(orbitLine);
        }
        orbitLinesRef.current['moon'] = orbitLine;
      }

      // 如果是土星，绘制标志性的 Concentric 3D 真彩星环 (Rings)
      if (config.id === 'saturn') {
        const ringGeo = new THREE.RingGeometry(config.radius * 1.4, config.radius * 2.5, 64);
        ringGeo.rotateX(Math.PI / 2);

        const ringTex = createRingTexture();
        const ringMat = new THREE.MeshStandardMaterial({
          map: ringTex,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
          roughness: 0.6
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.name = 'saturn-ring-mesh';
        tiltGroup.add(ringMesh); // Added to tiltGroup!
      }

      // 如果是天王星，因 98° 自转倾角垂直放置一条微弱天王星环 (Vertical Rings)
      if (config.id === 'uranus') {
        const ringGeo = new THREE.RingGeometry(config.radius * 1.5, config.radius * 1.8, 64);
        ringGeo.rotateX(Math.PI / 2); // Standard equatorial plane of Uranus
        const ringMat = new THREE.MeshStandardMaterial({
          color: 0xa5f3fc,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.25,
          roughness: 0.9
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.name = 'uranus-ring-mesh';
        tiltGroup.add(ringMesh); // Added to tiltGroup!
      }

      // 绘制公转可见卫星 / 探测器 (Sub-moons and Space Probes)
      const moons = SATELLITE_DATA[config.id] || [];
      moons.forEach(m => {
        const distRatio = m.realDistance !== undefined ? m.realDistance : m.distance;
        const orbitRadius = config.radius * distRatio;

        // 1. 卫星轨迹轨道细圈线 (Orbit Rings) - Added to tiltGroup
        const ringPoints: THREE.Vector3[] = [];
        const segments = 500;
        for (let j = 0; j <= segments; j++) {
          const theta = (j / segments) * Math.PI * 2;
          ringPoints.push(new THREE.Vector3(Math.cos(theta) * orbitRadius, 0, Math.sin(theta) * orbitRadius));
        }
        const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPoints);
        const ringMat = new THREE.LineBasicMaterial({
          color: m.color,
          transparent: true,
          opacity: 0.16
        });
        const orbitLine = new THREE.Line(ringGeo, ringMat);
        orbitLine.name = 'satellite-orbit-line';
        tiltGroup.add(orbitLine); // Added to tiltGroup!

        // 2. 卫星/空间站实体 (Entities)
        let moonMesh: THREE.Mesh;
        const sizeRatio = (strictPhysics && m.realRadiusRatio !== undefined) ? m.realRadiusRatio : m.radiusRatio;
        if (m.isProbe) {
          // 探针/空间站：立方体核心主体
          const bodyGeo = new THREE.BoxGeometry(config.radius * sizeRatio, config.radius * sizeRatio, config.radius * sizeRatio * 1.5);
          const bodyMat = new THREE.MeshStandardMaterial({
            color: m.color,
            metalness: 0.9,
            roughness: 0.2
          });
          moonMesh = new THREE.Mesh(bodyGeo, bodyMat);

          // 太阳能反射阵翼板
          const wingGeo = new THREE.BoxGeometry(config.radius * sizeRatio * 4, config.radius * sizeRatio * 0.1, config.radius * sizeRatio * 0.7);
          const wingMat = new THREE.MeshBasicMaterial({ color: 0x00bcd4 });
          const wing = new THREE.Mesh(wingGeo, wingMat);
          wing.name = 'solar-wing';
          moonMesh.add(wing);
        } else {
          // 天然卫星：高精度球体质感
          const sphereGeo = new THREE.SphereGeometry(config.radius * sizeRatio, 16, 12);
          const sphereMat = new THREE.MeshStandardMaterial({
            color: m.color,
            roughness: 0.85,
            metalness: 0.1
          });
          moonMesh = new THREE.Mesh(sphereGeo, sphereMat);
        }

        moonMesh.name = `satellite-mesh-${m.nameEn}`;
        moonMesh.userData = {
          orbitRadius,
          speed: m.speed,
          angle: Math.random() * Math.PI * 2,
          isProbe: m.isProbe,
          nameZh: m.nameZh,
          nameEn: m.nameEn,
          planetId: config.id,
          isSatellite: true
        };
        tiltGroup.add(moonMesh); // Added to tiltGroup!
      });
    });

    // 处理窗口/容器尺寸调整 (使用 ResizeObserver 确保响应性)
    const resizeObserver = new ResizeObserver((entries) => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        const actualWidth = w || container.clientWidth || window.innerWidth || 800;
        const actualHeight = h || container.clientHeight || window.innerHeight || 600;
        cameraRef.current.aspect = actualWidth / actualHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(actualWidth, actualHeight, true); // pass true to ensure pixel-perfect synchronization between drawing buffer and CSS inline styles!
      }
    });
    resizeObserver.observe(container);

    // 鼠标移入/Hover 专属高频 raycast 碰撞及图层定位测算
    const onPointerMove = (e: PointerEvent) => {
      if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;
      const rect = rendererRef.current.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // 快速暂存鼠标所停留画布内绝对 CSS 偏移坐标
      setHoveredPlanetPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

      const targets: THREE.Object3D[] = [];

      // A. 日心/太阳碰撞源导入
      if (sunMeshRef.current) {
        sunMeshRef.current.traverse(node => {
          if (node instanceof THREE.Mesh) {
            node.userData = { planetId: 'sun' };
            targets.push(node);
          }
        });
      }

      // B. 太阳系各星体本身、内部结构片及所搭载的所有子卫星/空间站碰撞源搜集 (High-fidelity collision detection via traverse recursively)
      Object.keys(planetMeshesRef.current).forEach(id => {
        const g = planetMeshesRef.current[id];
        if (g && g.visible) {
          g.traverse(node => {
            if (node instanceof THREE.Mesh) {
              if (node.userData?.isSatellite) {
                node.userData.planetId = id;
              } else {
                node.userData = { ...node.userData, planetId: id };
              }
              targets.push(node);
            }
          });
        }
      });

      const intersects = raycaster.intersectObjects(targets);
      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const pid = hit.userData?.planetId || null;
        
        if (hit.userData?.isSatellite) {
          setHoveredPlanetId(pid);
          setHoveredSatelliteName({ zh: hit.userData.nameZh, en: hit.userData.nameEn });
          setHoveredLayer(null);
        } else {
          setHoveredPlanetId(pid);
          setHoveredSatelliteName(null);

          // 如果在剖切观察口，精确断别地表、地壳、地幔或核心
          if (hit.name && hit.name.includes('inner-body')) {
            if (hit.name.includes('core')) {
              setHoveredLayer('core');
            } else if (hit.name.includes('mantle')) {
              setHoveredLayer('mantle');
            } else if (hit.name.includes('crust')) {
              setHoveredLayer('crust');
            } else if (hit.name.includes('atmosphere')) {
              setHoveredLayer('atmosphere');
            } else {
              setHoveredLayer(null);
            }
          } else {
            setHoveredLayer(null);
          }
        }
      } else {
        setHoveredPlanetId(null);
        setHoveredSatelliteName(null);
        setHoveredLayer(null);
      }
    };

    container.addEventListener('pointermove', onPointerMove);

    let pointerDownX = 0;
    let pointerDownY = 0;

    const onPointerDown = (e: PointerEvent) => {
      pointerDownX = e.clientX;
      pointerDownY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      const deltaX = Math.abs(e.clientX - pointerDownX);
      const deltaY = Math.abs(e.clientY - pointerDownY);
      if (deltaX < 5 && deltaY < 5) {
        if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

        const rect = rendererRef.current.domElement.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

        const targets: THREE.Object3D[] = [];
        
        // A. 太阳
        if (sunMeshRef.current) {
          sunMeshRef.current.traverse(node => {
            if (node instanceof THREE.Mesh) {
              node.userData = { planetId: 'sun' };
              targets.push(node);
            }
          });
        }

        // B. 各大行星及卫星
        Object.keys(planetMeshesRef.current).forEach(id => {
          const g = planetMeshesRef.current[id];
          if (g && g.visible) {
            g.traverse(node => {
              if (node instanceof THREE.Mesh) {
                if (node.userData?.isSatellite) {
                  node.userData.planetId = id;
                } else {
                  node.userData = { ...node.userData, planetId: id };
                }
                targets.push(node);
              }
            });
          }
        });

        const intersects = raycaster.intersectObjects(targets);
        if (intersects.length > 0) {
          const hit = intersects[0].object;
          if (hit.userData?.isSatellite) {
            onSelectPlanet(hit.userData.nameEn);
          } else {
            const pid = hit.userData?.planetId;
            if (pid) {
              onSelectPlanet(pid);
            }
          }
        }
      }
    };

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointerup', onPointerUp);

    // 优化滚动缩放比例，拦截并自定义物理一致的滚轮事件 (Custom uniform scroll zoom handler - Shuttle Mode)
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();

      const camera = cameraRef.current;
      const controls = controlsRef.current;
      if (!camera || !controls) return;

      // 如果当前有选中的行星，当拨动滚轮时说明要离开它进行自由太空穿梭
      if (selectedPlanetIdRef.current) {
        selectedPlanetIdRef.current = ''; // 同步清除 ref，防止在当帧 animate 中被 target.copy(targetPos) 覆盖
        lastSelectedPlanetIdRef.current = ''; // 避免 animate 里的取消选中逻辑重置 target
        onSelectPlanet(''); // 异步通知父组件更新 React state
      }

      const direction = Math.sign(event.deltaY);
      if (direction === 0) return;

      // 1. 计算穿梭移动速度
      let speed = 1.0;
      if (useExponentialSpeedRef.current) {
        // 开启等比加速：随着距离太阳系中心越远，宇宙尺度越快
        const distToCenter = camera.position.length();
        speed = Math.max(0.5, distToCenter * 0.08);
      } else {
        // 自定义速度 presets
        const preset = customSpeedPresetRef.current;
        switch (preset) {
          case 'walk':
            speed = 0.05;
            break;
          case 'rocket':
            speed = 0.8;
            break;
          case 'meteor':
            speed = 5.0;
            break;
          case 'light':
            speed = 40.0;
            break;
          case '10c':
            speed = 400.0;
            break;
          case '100c':
            speed = 4000.0;
            break;
          case '1000c':
            speed = 40000.0;
            break;
          case '10000c':
            speed = 400000.0;
            break;
          default:
            speed = 40.0;
        }
      }

      // 2. 获取相机的世界方向向量
      const viewDir = new THREE.Vector3();
      camera.getWorldDirection(viewDir);

      // 3. 计算位移向量 (deltaY > 0 即向后退，位移为正；deltaY < 0 向前进，位移为负)
      const moveDelta = direction * speed * 0.8;
      const moveVec = viewDir.multiplyScalar(moveDelta);

      // 4. 将 camera position 和 controls target 同时进行平移
      camera.position.add(moveVec);
      controls.target.add(moveVec);

      // 5. 限制最大距离，避免溢出
      const maxDistance = 220000;
      if (camera.position.length() > maxDistance) {
        camera.position.setLength(maxDistance);
      }

      controls.update();
    };

    renderer.domElement.addEventListener('wheel', handleWheel, { capture: true, passive: false });

    // 9. 核心帧渲染循环
    let reqId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      reqId = requestAnimationFrame(animate);

      if (!sceneRef.current || !rendererRef.current || !cameraRef.current || !controlsRef.current) return;

      const delta = clock.getDelta();

      const daysSinceJ2000 = TimeEngine.getDaysSinceJ2000(currentTimestampRef.current);

      // 太阳自转更新：带 7.25° 黄赤倾角自旋转
      if (sunMeshRef.current) {
        const sunRotateY = OrbitEngine.getRotationAngle('sun', currentTimestampRef.current);
        const sunInner = sunMeshRef.current.getObjectByName('sun-inner-mesh');
        if (sunInner) {
          sunInner.rotation.y = sunRotateY;
        }
        const sunObliquityRad = (7.25 * Math.PI) / 180;
        sunMeshRef.current.rotation.z = sunObliquityRad;
      }

      // 行星公转与自转更新
      planetsConfig.forEach(config => {
        const group = planetMeshesRef.current[config.id];
        if (!group) return;

        // 获取3D轨道物理世界坐标，配合 ORBIT_SCALE 因子进行整体公转位置摆布
        let finalPos: THREE.Vector3;
        if (config.id === 'moon') {
          const earthPosRaw = OrbitEngine.getHeliocentricPosition('earth', daysSinceJ2000, useVisualScale);
          const moonRelPosRaw = OrbitEngine.getLunarRelativePosition(daysSinceJ2000, false); // ALWAYS use physical relative position in AU
          
          let targetRelDist = 0.05654;
          if (useVisualScale) {
            // Earth radius: 0.38. We place Moon at exactly 2.6 Earth radii for beautiful, compact, non-overlapping close-ups without expanding the orbit to intersect other bodies
            targetRelDist = 0.38 * 2.6;
          } else if (!strictPhysics) {
            // Normal Physical Mode: Earth radius is 0.11. To maintain identical localized space, we use 2.6 Earth radii
            targetRelDist = 0.11 * 2.6;
          } else {
            // Strict physical 1:1 mode: keeps Moon at its real physical distance ratio of 60.3 Earth radii
            const baseSunRad = 22.0 / (2 * 108.0);
            const earthStrictRad = baseSunRad * (6371.0 / 696340.0);
            targetRelDist = earthStrictRad * 60.31;
          }
          
          // Normalize physical position vector and scale it to targetRelDist
          const moonRelPos = toThreePos(moonRelPosRaw, 1.0);
          moonRelPos.normalize().multiplyScalar(targetRelDist);
          
          const earthPos = toThreePos(earthPosRaw, ORBIT_SCALE);
          finalPos = earthPos.clone().add(moonRelPos);
        } else {
          const rawPos = OrbitEngine.getHeliocentricPosition(config.id, daysSinceJ2000, useVisualScale);
          finalPos = toThreePos(rawPos, ORBIT_SCALE);
        }
        group.position.copy(finalPos);

        // == 视觉焦点净化：选中某个星体特写时，隐藏其他无关星体及各自公转轨道，避免穿帮与透射重合错误 ==
        let isVisible = true;
        const selPlanetId = selectedPlanetIdRef.current;
        if (selPlanetId !== '' && selPlanetId !== 'sun') {
          const parentIdOfSelected = getParentPlanetId(selPlanetId);
          if (config.id === selPlanetId) {
            isVisible = true;
          } else if (config.id === parentIdOfSelected) {
            isVisible = true;
          } else if (parentIdOfSelected === 'earth' && config.id === 'moon') {
            isVisible = true;
          } else {
            isVisible = false;
          }
        }
        
        group.visible = isVisible;
        const orbitLine = orbitLinesRef.current[config.id];
        if (orbitLine) {
          orbitLine.visible = isVisible;
          // 动态缩放月球轨道细圈，保证与被缩放后的月球位置100%完美契合
          if (config.id === 'moon') {
            let targetRelDist = 0.05654;
            if (useVisualScale) {
              targetRelDist = 0.38 * 2.6;
            } else if (!strictPhysics) {
              targetRelDist = 0.11 * 2.6;
            } else {
              const baseSunRad = 22.0 / (2 * 108.0);
              const earthStrictRad = baseSunRad * (6371.0 / 696340.0);
              targetRelDist = earthStrictRad * 60.31;
            }
            // Because original geometry radius is 0.00257 * 18 * 22 = 1.01772 units
            const baseCircleRadius = 0.00257 * 18 * 22;
            orbitLine.scale.setScalar(targetRelDist / baseCircleRadius);
          }
        }

        const tiltGroup = group.getObjectByName('planet-tilt-root') as THREE.Group;
        if (!tiltGroup) return;

        // 清理老一轮的球体展示，每次更新根据 剖面模式 (crossSectionActive) & 选中星体进行个性多层渲染，保证数据同步
        const needsRebuild = tiltGroup.children.filter(ch => ch.name === 'planet-body-root' || ch.name === 'cross-section-root').length === 0;
        
        const isSelected = selectedPlanetIdRef.current === config.id;
        const isCrossSection = isSelected && crossSectionActiveRef.current;

        if (needsRebuild) {
          // 清除历史子星体
          const olds = tiltGroup.children.filter(ch => ch.name === 'planet-body-root' || ch.name === 'cross-section-root');
          olds.forEach(o => tiltGroup.remove(o));

          const r = config.radius;
          const tex = getPlanetTexture(config.id);
          const cloudTex = config.id === 'earth' ? getPlanetTexture('earth_clouds') : null;

          if (isCrossSection) {
            // == 剖面模式开启：多层双复合级联渲染层，展现地心、地幔、地壳以至大气结构 ==
            // 巧思设计：只切开北半球 1/4 (270度扇面)，而整个南半球保持密封完整，彻底预防穿帮并满足科学美感！
            const crossGroup = new THREE.Group();
            crossGroup.name = 'cross-section-root';

            // 1. 最核心日地核层 (Inner Core)
            const coreGroupObj = new THREE.Group();
            coreGroupObj.name = 'inner-body-core';
            
            const coreGeoS = new THREE.SphereGeometry(r * 0.4, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
            const coreGeoN = new THREE.SphereGeometry(r * 0.4, 32, 16, 0, Math.PI * 1.5, 0, Math.PI / 2);
            
            const coreMat = new THREE.MeshBasicMaterial({
              color: config.id === 'sun' ? 0xffffff : 0xff3e00,
              side: THREE.DoubleSide
            });
            const coreMeshS = new THREE.Mesh(coreGeoS, coreMat);
            const coreMeshN = new THREE.Mesh(coreGeoN, coreMat);
            coreMeshS.name = 'inner-body-core-south';
            coreMeshN.name = 'inner-body-core-north';
            coreGroupObj.add(coreMeshS, coreMeshN);
            crossGroup.add(coreGroupObj);

            // 2. 内部对流幔层 (Mantle)
            const mantleGroupObj = new THREE.Group();
            mantleGroupObj.name = 'inner-body-mantle';
            
            const mantleGeoS = new THREE.SphereGeometry(r * 0.74, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
            const mantleGeoN = new THREE.SphereGeometry(r * 0.74, 32, 16, 0, Math.PI * 1.5, 0, Math.PI / 2);
            
            const mantleMat = new THREE.MeshStandardMaterial({
              color: config.id === 'sun' ? 0xff7e00 : 0xe06600,
              roughness: 0.9,
              side: THREE.DoubleSide
            });
            const mantleMeshS = new THREE.Mesh(mantleGeoS, mantleMat);
            const mantleMeshN = new THREE.Mesh(mantleGeoN, mantleMat);
            mantleMeshS.name = 'inner-body-mantle-south';
            mantleMeshN.name = 'inner-body-mantle-north';
            mantleGroupObj.add(mantleMeshS, mantleMeshN);
            crossGroup.add(mantleGroupObj);

            // 3. 真实地貌硬地表壳 (Crust)
            const crustGroupObj = new THREE.Group();
            crustGroupObj.name = 'inner-body-crust';
            
            const crustGeoS = new THREE.SphereGeometry(r, 64, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
            const crustGeoN = new THREE.SphereGeometry(r, 64, 32, 0, Math.PI * 1.5, 0, Math.PI / 2);
            
            const crustMat = new THREE.MeshStandardMaterial({
              map: tex,
              bumpMap: tex,
              bumpScale: 0.04,
              roughness: 0.7,
              side: THREE.DoubleSide
            });
            const crustMeshS = new THREE.Mesh(crustGeoS, crustMat);
            const crustMeshN = new THREE.Mesh(crustGeoN, crustMat);
            crustMeshS.name = 'inner-body-crust-south';
            crustMeshN.name = 'inner-body-crust-north';
            crustGroupObj.add(crustMeshS, crustMeshN);
            crossGroup.add(crustGroupObj);

            // 4. 包围式大气结构 (Atmosphere Envelope)
            const hasAtmosphere = ['earth', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'].includes(config.id);
            if (hasAtmosphere) {
              const atmGroupObj = new THREE.Group();
              atmGroupObj.name = 'inner-body-atmosphere';

              const atmColor = config.id === 'earth' ? 0x8ab6ff : (config.id === 'venus' ? 0xffcc44 : 0x2288ff);
              const atmGeoS = new THREE.SphereGeometry(r * 1.08, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
              const atmGeoN = new THREE.SphereGeometry(r * 1.08, 32, 16, 0, Math.PI * 1.5, 0, Math.PI / 2);
              
              const atmMat = new THREE.MeshBasicMaterial({
                color: atmColor,
                transparent: true,
                opacity: 0.18,
                side: THREE.DoubleSide
              });
              const atmMeshS = new THREE.Mesh(atmGeoS, atmMat);
              const atmMeshN = new THREE.Mesh(atmGeoN, atmMat);
              atmMeshS.name = 'inner-body-atmosphere-south';
              atmMeshN.name = 'inner-body-atmosphere-north';
              atmGroupObj.add(atmMeshS, atmMeshN);
              crossGroup.add(atmGroupObj);
            }

            // 5. 地球专属动态着色器切割云层套件
            if (config.id === 'earth' && cloudTex) {
              const cloudGroupObj = new THREE.Group();
              cloudGroupObj.name = 'planet-earth-clouds';

              const cloudGeoS = new THREE.SphereGeometry(r * 1.035, 64, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
              const cloudGeoN = new THREE.SphereGeometry(r * 1.035, 64, 32, 0, Math.PI * 1.5, 0, Math.PI / 2);
              
              const cloudMat = createCloudMaterial(cloudTex);
              const cloudMeshS = new THREE.Mesh(cloudGeoS, cloudMat);
              const cloudMeshN = new THREE.Mesh(cloudGeoN, cloudMat);
              cloudMeshS.name = 'planet-earth-clouds-south';
              cloudMeshN.name = 'planet-earth-clouds-north';
              cloudGroupObj.add(cloudMeshS, cloudMeshN);
              crossGroup.add(cloudGroupObj);
            }

            // 增加行星内部剖切结构的 X-Y-Z 坐标轴模型，比星体表面长 2.2 倍以便穿出并直观展示
            const axes = new THREE.AxesHelper(r * 2.2);
            axes.name = 'axes-helper';
            crossGroup.add(axes);

            tiltGroup.add(crossGroup);
          } else {
            // == 完整模式：真彩纹理 + 物理高度高动态凹凸纹理 (BumpMap) 多轨融合 ==
            const bodyGroup = new THREE.Group();
            bodyGroup.name = 'planet-body-root';

            const geom = new THREE.SphereGeometry(r, 48, 24);
            const earthSpecularTex = config.id === 'earth' ? getPlanetTexture('earth_specular') : null;

            const mat = new THREE.MeshStandardMaterial({
              map: tex,
              bumpMap: tex, // 将真画幅真彩层作为物理高度，晨昏分界处产生完美山川深谷立体投影
              bumpScale: config.id === 'earth' ? 0.025 : (['mercury', 'moon', 'mars'].includes(config.id) ? 0.04 : 0.012),
              roughness: config.id === 'earth' ? 0.45 : 0.85,
              metalness: config.id === 'earth' ? 0.15 : 0.05,
              ...(config.id === 'earth' && earthSpecularTex ? { roughnessMap: earthSpecularTex } : {})
            });
            const mesh = new THREE.Mesh(geom, mat);
            mesh.name = 'planet-body-mesh';
            bodyGroup.add(mesh);

            // 地球具有额外的高空漫射蓝色大气发光包络层 & 专属动态云层着色器
            if (config.id === 'earth') {
              // 1) 动态高空云层
              if (cloudTex) {
                const cloudGeo = new THREE.SphereGeometry(r * 1.035, 64, 32);
                const cloudMat = createCloudMaterial(cloudTex);
                const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
                cloudMesh.name = 'planet-earth-clouds';
                bodyGroup.add(cloudMesh);
              }

              // 2) 边缘散射大气发光罩
              const glowGeo = new THREE.SphereGeometry(r * 1.06, 32, 16);
              const glowMat = new THREE.MeshBasicMaterial({
                color: 0x88ccff,
                transparent: true,
                opacity: 0.18,
                blending: THREE.AdditiveBlending,
                side: THREE.BackSide
              });
              const glowMesh = new THREE.Mesh(glowGeo, glowMat);
              glowMesh.name = 'planet-earth-glow';
              bodyGroup.add(glowMesh);
            }

            // 月亮特写增加极为清柔朦胧的白月光发光包络层 (Backlight glow for Moon to create a hazy, romantic aura)与3D漫散白月光晕精灵
            if (config.id === 'moon') {
              // 1) 边缘散射月光发光罩
              const glowGeo = new THREE.SphereGeometry(r * 1.15, 32, 16);
              const glowMat = new THREE.MeshBasicMaterial({
                color: 0xdae6ff, // Serene pale blue silver moonlight
                transparent: true,
                opacity: 0.35,
                blending: THREE.AdditiveBlending,
                side: THREE.BackSide
              });
              const glowMesh = new THREE.Mesh(glowGeo, glowMat);
              glowMesh.name = 'planet-moon-glow';
              bodyGroup.add(glowMesh);

              // 2) 创造更朦胧、广阔的月晕外圈层 (Corona outer halo)
              const glowOuterGeo = new THREE.SphereGeometry(r * 1.45, 32, 16);
              const glowOuterMat = new THREE.MeshBasicMaterial({
                color: 0x93c5fd, // Misty blue light wrapping
                transparent: true,
                opacity: 0.15,
                blending: THREE.AdditiveBlending,
                side: THREE.BackSide
              });
              const glowOuterMesh = new THREE.Mesh(glowOuterGeo, glowOuterMat);
              glowOuterMesh.name = 'planet-moon-outer-glow';
              bodyGroup.add(glowOuterMesh);

              // 3) 3D 偏振月晕漫散光辉精灵 (3D Camera-Facing Hazy Moonlight Glare Sprite)
              const glowSpriteMat = new THREE.SpriteMaterial({
                map: createMoonGlowTexture(),
                color: 0xffffff,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false
              });
              const glowSprite = new THREE.Sprite(glowSpriteMat);
              glowSprite.name = 'planet-moon-glow-sprite';
              glowSprite.scale.set(r * 4.2, r * 4.2, 1);
              bodyGroup.add(glowSprite);
            }

            // 增加行星纯真外观的 X-Y-Z 坐标轴模型，比星体表面长 2.2 倍以便穿出并直观展示
            const axes = new THREE.AxesHelper(r * 2.2);
            axes.name = 'axes-helper';
            bodyGroup.add(axes);

            tiltGroup.add(bodyGroup);
          }
        }

        // 核心考虑自转角度：自转速度和方向由 OrbitEngine 基于历元完美约束
        const rotateY = OrbitEngine.getRotationAngle(config.id, currentTimestampRef.current);
        
        // 旋转行星外层整体或者切片图层
        const bodyRoot = tiltGroup.getObjectByName('planet-body-root') || tiltGroup.getObjectByName('cross-section-root');
        if (bodyRoot) {
          bodyRoot.rotation.y = rotateY;
          // 自转倾斜已经应用在 parent tiltGroup 上，无需再次重叠设置，实现了最简洁优美的解耦！
        }

        // 行星搭载的所有子卫星/空间站公转自旋高精度更新
        tiltGroup.children.forEach(c => {
          if (c.name && c.name.startsWith('satellite-mesh-')) {
            const ud = c.userData;
            if (ud && ud.isSatellite) {
              const orbitSpeed = ud.speed * 0.15; // 轨道角位移因子
              // 卫星在该时刻对应的公转角
              const angle = ud.angle + (daysSinceJ2000 * orbitSpeed);
              
              // 卫星在其倾斜自转赤道面 (tiltGroup 的本地 X-Z 轴) 中完美公转
              c.position.set(Math.cos(angle) * ud.orbitRadius, 0, Math.sin(angle) * ud.orbitRadius);
              
              // 卫星自身再做微弱自旋转
              c.rotation.y += 0.025;
            }
          }
        });

        // 地球专属动态云层着色器参数高频同步更新
        if (config.id === 'earth') {
          const cloudObj = tiltGroup.getObjectByName('planet-earth-clouds');
          if (cloudObj) {
            cloudObj.traverse(ch => {
              if (ch instanceof THREE.Mesh && ch.material instanceof THREE.ShaderMaterial) {
                ch.material.uniforms.uTime.value = currentTimestampRef.current * 0.0015;
                // 计算得出日光背阳投射方向向量，从原点太阳 (0,0,0) 指向当前地球 3D 位置
                const lightDir = new THREE.Vector3().copy(group.position).normalize();
                ch.material.uniforms.uLightDirection.value.copy(lightDir);
              }
            });
          }
        }


        // 剖切视口中对被 Hover 的层段给予炫蓝光发光强调
        if (crossSectionActiveRef.current) {
          const isHoveredPlanet = hoveredPlanetIdRef.current === config.id;
          ['core', 'mantle', 'crust', 'atmosphere'].forEach(layer => {
            const layerGroup = group.getObjectByName(`inner-body-${layer}`);
            if (layerGroup) {
              const isLayerHovered = isHoveredPlanet && hoveredLayerRef.current === layer;
              layerGroup.children.forEach(ch => {
                const m = (ch as THREE.Mesh).material as any;
                if (m) {
                  if (layer === 'core') {
                    m.color.setHex(isLayerHovered ? 0xffffff : (config.id === 'sun' ? 0xffffff : 0xff3e00));
                  } else if (m.emissive) {
                    m.emissive.setHex(isLayerHovered ? 0xffffff : (config.id === 'sun' ? 0xffffff : 0xff3e00));
                  } else if (m.emissive) {
                    m.emissive.setHex(isLayerHovered ? 0x222233 : 0x000000);
                  }
                }
              });
            }
          });
        }
      });

      // == 三维天体多层对齐与多星堆叠验证系统 (Dynamic 3D Celestial Scale Stacking Verification Update) ==
      if (packingActiveRef.current) {
        const currentKey = validationPairKeyRef.current;
        const config = VALIDATION_PAIRS.find(x => x.key === currentKey) || VALIDATION_PAIRS[0];

        const sourcePos = new THREE.Vector3(0, 0, 0);
        const targetPos = new THREE.Vector3(0, 0, 0);

        // 1. 获取 Source 物理质心世界坐标
        if (config.sourceId !== 'sun') {
          const sourceGroup = planetMeshesRef.current[config.sourceId];
          if (sourceGroup) {
            sourceGroup.getWorldPosition(sourcePos);
          }
        }

        // 2. 获取 Target 物理质心世界坐标
        if (config.targetId === 'moon') {
          const targetGroup = planetMeshesRef.current['moon'];
          if (targetGroup) {
            targetGroup.getWorldPosition(targetPos);
          }
        } else if (['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'].includes(config.targetId)) {
          const targetGroup = planetMeshesRef.current[config.targetId];
          if (targetGroup) {
            targetGroup.getWorldPosition(targetPos);
          }
        } else {
          // 如果是配置内的内部公转卫星，深层递归扫描倾角节点世界坐标
          let foundSat = false;
          for (const parentId of Object.keys(planetMeshesRef.current)) {
            const parentGroup = planetMeshesRef.current[parentId];
            if (parentGroup) {
              const satMesh = parentGroup.getObjectByName(`satellite-mesh-${config.targetId}`);
              if (satMesh) {
                satMesh.getWorldPosition(targetPos);
                foundSat = true;
                break;
              }
            }
          }
        }

        const dist = sourcePos.distanceTo(targetPos);

        // 3. 计算用于缩放对齐的基准天体 3D 起誓半径
        let sourceRadius = 0.1;
        if (config.sourceId === 'sun') {
          sourceRadius = getSunRadius();
        } else {
          sourceRadius = getPlanetRadius(config.sourceId);
        }

        const sourceDiameter = sourceRadius * 2;
        const targetCount = (sourceDiameter > 0) ? (dist / sourceDiameter) : 100;

        // 步进控制：控制整个铺满动画在 3.5 秒内生动流动组装完成
        const increment = (targetCount / 3.5) * delta;
        const nextProgress = Math.min(targetCount, packingProgressDoneRef.current + increment);
        packingProgressDoneRef.current = nextProgress;
        setPackingProgressDone(nextProgress);

        if (packingGroupRef.current) {
          // 清空前项堆叠网格残留
          while (packingGroupRef.current.children.length > 0) {
            const child = packingGroupRef.current.children[0];
            if (child instanceof THREE.Group) {
              child.children.forEach(c => {
                if (c instanceof THREE.Mesh) {
                  c.geometry.dispose();
                  if (Array.isArray(c.material)) {
                    c.material.forEach(m => m.dispose());
                  } else {
                    c.material.dispose();
                  }
                }
              });
            }
            packingGroupRef.current.remove(child);
          }

          const packRad = (targetCount > 0) ? (dist / (2 * targetCount)) : 0.1;

          // 缓存高拟真质感配色图表
          const colorMap: Record<string, number> = {
            sun: 0xf59e0b,       // Gold
            mercury: 0x8e8e93,   // Silver Slate
            venus: 0xe5c158,     // Golden Sand
            earth: 0x3a82f6,     // Tech Blue
            mars: 0xef4444,      // Rust Red
            jupiter: 0xd97706,   // Jupiter Orange
            saturn: 0xebc071,    // Saturn Beige
            uranus: 0x06b6d4,    // Cyan Ice
            neptune: 0x3b82f6    // Neptune Navy
          };
          const baseColor = colorMap[config.sourceId] || 0xf59e0b;

          const packGeom = new THREE.SphereGeometry(packRad, 18, 14);
          const packWireMat = new THREE.MeshBasicMaterial({
            color: baseColor,
            transparent: true,
            opacity: 0.38,
            wireframe: true,
            blending: THREE.AdditiveBlending
          });
          const packSolidMat = new THREE.MeshBasicMaterial({
            color: baseColor,
            transparent: true,
            opacity: 0.12,
            blending: THREE.AdditiveBlending
          });

          const countToDraw = Math.floor(nextProgress);
          for (let k = 0; k < countToDraw; k++) {
            const t = (targetCount > 0) ? ((k + 0.5) / targetCount) : 0.5;
            // 三维直线插值插值点：从 source 质心均匀铺到 target 质心
            const pos = sourcePos.clone().lerp(targetPos, t);

            const itemGroup = new THREE.Group();
            itemGroup.position.copy(pos);

            const meshW = new THREE.Mesh(packGeom, packWireMat);
            const meshS = new THREE.Mesh(packGeom, packSolidMat);
            itemGroup.add(meshW, meshS);

            packingGroupRef.current.add(itemGroup);
          }

          // 渐入渲染下一个蓄势发射的待定球体
          if (nextProgress < targetCount) {
            const fraction = nextProgress - countToDraw;
            const tNext = (targetCount > 0) ? ((countToDraw + 0.5) / targetCount) : 0.5;
            const posNext = sourcePos.clone().lerp(targetPos, tNext);

            const nextGroup = new THREE.Group();
            nextGroup.position.copy(posNext);

            const nextWireMat = new THREE.MeshBasicMaterial({
              color: baseColor,
              transparent: true,
              opacity: fraction * 0.28,
              wireframe: true,
              blending: THREE.AdditiveBlending
            });
            nextGroup.add(new THREE.Mesh(packGeom, nextWireMat));
            packingGroupRef.current.add(nextGroup);
          }
        }
      } else {
        // 如果未开启排满验证，且排满组内还有残留物，清除之
        if (packingGroupRef.current && packingGroupRef.current.children.length > 0) {
          while (packingGroupRef.current.children.length > 0) {
            const child = packingGroupRef.current.children[0];
            if (child instanceof THREE.Group) {
              child.children.forEach(c => {
                if (c instanceof THREE.Mesh) {
                  c.geometry.dispose();
                  if (Array.isArray(c.material)) {
                    c.material.forEach(m => m.dispose());
                  } else {
                    c.material.dispose();
                  }
                }
              });
            }
            packingGroupRef.current.remove(child);
          }
          packingProgressDoneRef.current = 0;
          setPackingProgressDone(0);
        }
      }

      // 计算太阳在物理世界中的球心坐标，由于太阳可能在原点也可能有动态位移，通过3D原生 API 精准捕获三维向量
      const sunWorldPos = new THREE.Vector3();
      if (sunMeshRef.current) {
        sunMeshRef.current.getWorldPosition(sunWorldPos);
      }

      const sunProj = sunWorldPos.clone();
      sunProj.project(cameraRef.current);

      // 获取当前画布容器绝对高保真宽高，绝不使用 Stale 尺寸导致的偏置错误
      const curWidth = container.clientWidth || 800;
      const curHeight = container.clientHeight || 600;

      // 双向对撞验证：计算太阳是否在相机正前方以彻底消除穿帮镜头
      const tempVector = sunWorldPos.clone().sub(cameraRef.current.position);
      const camDirection = new THREE.Vector3();
      cameraRef.current.getWorldDirection(camDirection);
      const isBehind = tempVector.dot(camDirection) <= 0 || sunProj.z > 1;

      const screenX = (sunProj.x * 0.5 + 0.5) * curWidth;
      const screenY = (-(sunProj.y * 0.5) + 0.5) * curHeight;

      const distToSun = cameraRef.current.position.distanceTo(sunWorldPos);

      // 用 Raycaster 进行物理遮挡碰撞检测，任何大型固体星体 (或卫星) 挡在太阳前，光晕就会完美熄灭
      let obscured = false;
      if (!isBehind) {
        const occluders: THREE.Object3D[] = [];
        Object.keys(planetMeshesRef.current).forEach(id => {
          const group = planetMeshesRef.current[id];
          if (group && group.visible) {
            group.traverse(node => {
              // 收集实际参与 3D 公转遮挡的星体球身、切片以及搭载的卫星，排除无实体的轨道线 and 光环
              if (node instanceof THREE.Mesh && node.name !== 'moon-orbit-line' && !node.name.includes('ring')) {
                occluders.push(node);
              }
            });
          }
        });

        const lensRaycaster = new THREE.Raycaster();
        const rayDirection = tempVector.clone().normalize();
        lensRaycaster.set(cameraRef.current.position, rayDirection);

        const occludeIntersects = lensRaycaster.intersectObjects(occluders, false);
        if (occludeIntersects.length > 0) {
          // 检测到遮挡物距离小于到太阳的物理距离
          if (occludeIntersects[0].distance < distToSun - 0.5) {
            obscured = true;
          }
        }
      }

      // 如果相机拉得极度近 (例: 直穿太阳体表面)，让光量子流消散
      let targetOpacity = 1.0;
      if (distToSun < 6.0) {
        targetOpacity = Math.max(0, (distToSun - 3.0) / 3.0);
      }

      // 镜头光晕平滑过渡，告别硬生生的闪现 (lerp平滑插值/Cinematic transition)
      const targetFlareOpacity = (obscured || isBehind) ? 0.0 : targetOpacity;
      flareOpacityRef.current = THREE.MathUtils.lerp(flareOpacityRef.current, targetFlareOpacity, 0.12);

      // 计算贴切真实宇宙规律的大气衍射微变与宏观缩放关系 (远小近大)
      const targetScale = Math.max(0.12, Math.min(0.65, 1.2 * Math.pow(15 / distToSun, 0.45)));

      setSunScreenPos({
        x: screenX,
        y: screenY,
        visible: flareOpacityRef.current > 0.01,
        scale: targetScale,
        opacity: flareOpacityRef.current
      });

      // 计算当前相机距离中心太阳的距离百分比，对应展示在底部的缩放水平
      const zoomPct = Math.min(100, Math.max(1, (1 / (distToSun / 30)) * 100));
      setZoomLevelText(`${zoomPct.toFixed(0)}%`);

      // 10. 丝滑聚焦/跟随选中星体 & 动态近剪切面比例尺缩放
      if (selectedPlanetIdRef.current) {
        let targetGroup: THREE.Object3D | null = null;
        
        // 查找卫星：在所有的行星组中寻找具有对应 nameEn 的卫星
        for (const parentId of Object.keys(planetMeshesRef.current)) {
          const parentGroup = planetMeshesRef.current[parentId];
          if (parentGroup) {
            const sat = parentGroup.getObjectByName(`satellite-mesh-${selectedPlanetIdRef.current}`);
            if (sat) {
              targetGroup = sat;
              break;
            }
          }
        }
        
        if (!targetGroup) {
          targetGroup = planetMeshesRef.current[selectedPlanetIdRef.current] || sunMeshRef.current;
        }

        if (targetGroup) {
          const targetPos = new THREE.Vector3();
          targetGroup.getWorldPosition(targetPos);

          // 动态调节 Near 和 MinDistance，防止观察 1:1 精确模式下的微小行星（如 Earth 的 0.00093 半径）时因 Near Plane 穿透而看不到
          let radOfTarget = 0.5;
          if (selectedPlanetIdRef.current === 'sun') {
            radOfTarget = getSunRadius();
          } else {
            radOfTarget = getPlanetRadius(selectedPlanetIdRef.current);
          }
          const idealNear = Math.max(0.000001, radOfTarget * 0.02);
          if (cameraRef.current.near !== idealNear) {
            cameraRef.current.near = idealNear;
            cameraRef.current.updateProjectionMatrix();
          }
          // 让控制器最小缩放距离也自适应
          controlsRef.current.minDistance = radOfTarget * 1.05;

          // 选中星体改变时，重设 controls target 与相机视角位置以实现聚焦跟随
          if (selectedPlanetIdRef.current !== lastSelectedPlanetIdRef.current) {
            controlsRef.current.target.copy(targetPos);
            const isSat = !!getParentPlanetId(selectedPlanetIdRef.current) && !['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune','sun','moon'].includes(selectedPlanetIdRef.current.toLowerCase());
            const offset = selectedPlanetIdRef.current === 'sun' 
              ? radOfTarget * 3.5 
              : (isSat ? radOfTarget * 3.0 : radOfTarget * 4.2);

            cameraRef.current.position.set(targetPos.x, targetPos.y + offset * 0.4, targetPos.z + offset);
            lastSelectedPlanetIdRef.current = selectedPlanetIdRef.current;
            lastTargetPosRef.current.copy(targetPos);
          } else {
            // 在公转过程中平滑自适应追踪：利用增量(deltaMove)整体移动相机，防范星体高速公转时由于相机静止而直接飞出特写视口
            const deltaMove = new THREE.Vector3().subVectors(targetPos, lastTargetPosRef.current);
            cameraRef.current.position.add(deltaMove);
            controlsRef.current.target.copy(targetPos);
            lastTargetPosRef.current.copy(targetPos);
          }
        }
      } else {
        // 无选中时，只有当原本有选中（即刚取消选中）时才重置 target 聚焦到太阳，防止在自由穿梭模式下被每帧重置
        if (lastSelectedPlanetIdRef.current !== '') {
          controlsRef.current.target.set(0, 0, 0);
          lastSelectedPlanetIdRef.current = '';
          lastTargetPosRef.current.set(0, 0, 0);
          if (cameraRef.current.near !== 0.05) {
            cameraRef.current.near = 0.05;
            cameraRef.current.updateProjectionMatrix();
          }
          controlsRef.current.minDistance = 0.5;
        }
      }

      // 11. 更新控制器与渲染新帧
      controlsRef.current.update();
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };

    animate();

    // 卸载生命周期
    return () => {
      cancelAnimationFrame(reqId);
      resizeObserver.disconnect();
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointermove', onPointerMove);
      if (renderer.domElement) {
        renderer.domElement.removeEventListener('wheel', handleWheel, { capture: true });
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      }
      constellLinesRef.current = null;
    };
  }, [useVisualScale, strictPhysics]);

  // 当选择状态改变时，通知重建立体材质（切换剖切/标准模式）
  useEffect(() => {
    Object.keys(planetMeshesRef.current).forEach(id => {
      const group = planetMeshesRef.current[id];
      if (!group) return;
      const tiltGroup = group.getObjectByName('planet-tilt-root') as THREE.Group;
      if (!tiltGroup) return;
      
      // 只清理真实的星体表面或其剖面部分，保障自旋倾角骨架结构、各天然/人工卫星完整
      const olds = tiltGroup.children.filter(ch => ch.name === 'planet-body-root' || ch.name === 'cross-section-root');
      olds.forEach(o => tiltGroup.remove(o));
    });
  }, [selectedPlanetId, crossSectionActive]);

  // 当点击行星轨道或者空白部分进行双击快速聚焦
  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

    const rect = rendererRef.current.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    // 寻找被选行星或卫星
    const targets: THREE.Object3D[] = [];
    Object.keys(planetMeshesRef.current).forEach(id => {
      const g = planetMeshesRef.current[id];
      if (!g || !g.visible) return;
      g.traverse(node => {
        if (node instanceof THREE.Mesh) {
          // 只给没有 planetId 的节点记录，保留已经设置的 satellite 信息
          if (!node.userData.planetId) {
            node.userData.planetId = id;
          }
          targets.push(node);
        }
      });
    });

    // 太阳碰撞源导入
    if (sunMeshRef.current) {
      sunMeshRef.current.traverse(node => {
        if (node instanceof THREE.Mesh) {
          if (!node.userData.planetId) {
            node.userData.planetId = 'sun';
          }
          targets.push(node);
        }
      });
    }

    const intersects = raycaster.intersectObjects(targets);
    if (intersects.length > 0) {
      const hit = intersects[0].object;
      if (hit.userData?.isSatellite) {
        onSelectPlanet(hit.userData.nameEn);
      } else {
        const pid = hit.userData?.planetId;
        if (pid) {
          onSelectPlanet(pid);
        }
      }
    }
  };

  return (
    <div 
      className="relative w-full h-full cursor-grab active:cursor-grabbing overflow-hidden select-none"
      id="3d-universe-viewer-container"
    >
      <div 
        ref={mountRef} 
        className="w-full h-full"
        onDoubleClick={handleDoubleClick}
      />

      {/* 鼠标 Hover 天体悬浮标签Tooltip */}
      {hoveredPlanetId && hoveredPlanetPos && (
        <div 
          className="absolute pointer-events-none z-30 bg-slate-950/90 border border-cyan-500/30 backdrop-blur-md rounded-lg p-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.6)] text-xs text-slate-100 font-sans animate-in fade-in duration-200"
          style={{
            left: `${hoveredPlanetPos.x + 15}px`,
            top: `${hoveredPlanetPos.y + 15}px`,
            transform: 'translate(0, 0)',
          }}
        >
          <div className="flex items-center space-x-1.5 border-b border-white/10 pb-1 mb-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
            <span className="font-bold tracking-wide">
              {hoveredPlanetId === 'sun' 
                ? (lang === 'zh' ? '太阳' : 'Sun') 
                : (hoveredSatelliteName 
                    ? (lang === 'zh' ? hoveredSatelliteName.zh : hoveredSatelliteName.en)
                    : (lang === 'zh' 
                        ? (translations[lang][`${hoveredPlanetId}_name` as keyof typeof translations['zh']] || hoveredPlanetId).split(' ')[0] 
                        : hoveredPlanetId.charAt(0).toUpperCase() + hoveredPlanetId.slice(1))
                  )
              }
            </span>
          </div>
          <div className="text-[10px] text-slate-400 space-y-0.5 font-mono">
            <div>
              {lang === 'zh' ? '类型: ' : 'Type: '}
              <span className="text-cyan-300">
                {hoveredPlanetId === 'sun' 
                  ? (lang === 'zh' ? '恒星' : 'Star') 
                  : (hoveredSatelliteName 
                      ? (lang === 'zh' ? '天然卫星' : 'Satellite') 
                      : (lang === 'zh' ? '太阳系行星' : 'Planet')
                    )
                }
              </span>
            </div>
            {hoveredLayer && (
              <div className="mt-1 pt-1 border-t border-white/5">
                {lang === 'zh' ? '选中剖面物层: ' : 'Inner Layer: '}
                <span className="text-amber-400 font-bold uppercase">{lang === 'zh' ? translations[lang][hoveredLayer as keyof typeof translations['zh']] || hoveredLayer : hoveredLayer}</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* 2. 核心高度仿真：直视光源时所产生的镜头光晕 (Lens Flare Overlays) */}
      {/* 镜头光晕现与缩放视野高度挂钩，支持在太阳特写尺度等不同情境展现，结合 3D 物理 Raycaster 呈现真实遮蔽防穿模效果 */}
      {sunScreenPos && sunScreenPos.visible && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
          {/* A. 强光中心炫目日光球 */}
          <div 
            className="absolute"
            style={{
              left: `${sunScreenPos.x}px`,
              top: `${sunScreenPos.y}px`,
              // 结合动态相对距离进行比例缩小，较此前显著调小，更加柔和逼真 (Request 3)
              transform: `translate(-50%, -50%) scale(${sunScreenPos.scale * 0.45})`,
              opacity: sunScreenPos.opacity,
            }}
          >
            {/* 暖金色渐变多层光晕星爆 (Diffraction Starburst) */}
            <div className="absolute top-1/2 left-1/2 w-[340px] h-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.3)_0%,rgba(244,63,94,0.1)_30%,rgba(249,115,22,0.04)_55%,rgba(0,0,0,0)_75%)] mix-blend-screen blur-[6px]" />
            <div className="absolute top-1/2 left-1/2 w-52 h-52 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.4)_0%,rgba(251,191,36,0.15)_35%,rgba(0,0,0,0)_65%)] mix-blend-screen blur-[3px]" />
            <div className="absolute top-1/2 left-1/2 w-24 h-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.65)_0%,rgba(217,119,6,0.25)_40%,rgba(0,0,0,0)_100%)] mix-blend-screen" />

            {/* 柔亮多重同心光圈 (Multi-layer concentric halo rings - Cinematic Diffraction Rings) */}
            <div className="absolute top-1/2 left-1/2 w-[380px] h-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-500/12 bg-[radial-gradient(circle,rgba(249,115,22,0.15)_0%,rgba(244,63,94,0.05)_45%,rgba(0,0,0,0)_80%)] mix-blend-screen" />
          </div>
        </div>
      )}



      {/* 底部缩放尺读数 */}
      <div 
        className="absolute bottom-5 left-6 pointer-events-none bg-slate-950/80 border border-slate-800/80 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center space-x-2 text-[10px] font-mono select-none"
        id="universe-zoom-metric"
      >
        <span className="text-slate-400 font-sans">{translations[lang].zoomLevel}:</span>
        <span className="text-cyan-400 font-semibold">{zoomLevelText}</span>
        <span className="text-slate-600">|</span>
        <span className="text-slate-400 font-sans">
          {selectedPlanetId ? translations[lang][`${selectedPlanetId}_name` as keyof typeof translations['zh']] : translations[lang].allPlanets}
        </span>
      </div>
    </div>
  );
}
