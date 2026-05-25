/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OrbitEngine, CELESTIAL_PHYSICS, PLANET_ORBITAL_DATA } from '../engine/OrbitEngine';
import { ScaleEngine } from '../engine/ScaleEngine';
import { TimeEngine } from '../engine/TimeEngine';
import { translations } from '../i18n';
import { STAR_LIST, CONSTELLATIONS } from '../engine/StarDatabase';
import { EXTRA_STARS, EXTRA_CONSTELLATIONS } from '../engine/ExtraStarsDatabase';
import { loadHipparcosCatalog, HipparcosStar, bvToRgb } from '../engine/HipparcosLoader';

/** 合并基础亮星与额外星座星表 */
const ALL_STARS = [...STAR_LIST, ...EXTRA_STARS];
/** 合并基础星座与88个现代星座连线 */
const ALL_CONSTELLATIONS = [...CONSTELLATIONS, ...EXTRA_CONSTELLATIONS];
/** 线性映射常数：1光年 = 1000场景单位 */
const LY_TO_SCENE = 1000;

// ---------------------------------------------------------------------------
// Hipparcos 3D 真实星场构建器（黄道坐标系，与 domeStars 对齐）
// ---------------------------------------------------------------------------

function buildHipparcosEclipticField(stars: HipparcosStar[], magLimitVal: number) {
  const validStars = stars.filter(s => s.dist !== null && s.dist > 0 && s.mag <= magLimitVal);
  const count = validStars.length;

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  const eps = 23.439 * Math.PI / 180;
  const cosEps = Math.cos(eps);
  const sinEps = Math.sin(eps);

  for (let i = 0; i < count; i++) {
    const star = validStars[i];
    const distLy = star.dist!;
    const dScene = distLy * LY_TO_SCENE;

    const decRad = star.dec * Math.PI / 180;
    const raRad = star.ra * Math.PI / 12;
    const cosDec = Math.cos(decRad);
    const sinDec = Math.sin(decRad);
    const cosRa = Math.cos(raRad);
    const sinRa = Math.sin(raRad);

    const vEqX = cosDec * cosRa;
    const vEqY = cosDec * sinRa;
    const vEqZ = sinDec;

    const vEcX = vEqX;
    const vEcY = vEqY * cosEps + vEqZ * sinEps;
    const vEcZ = -vEqY * sinEps + vEqZ * cosEps;

    // 与 domeStars 一致的线性坐标映射 (X, Z, Y)
    positions[i * 3] = vEcX * dScene;
    positions[i * 3 + 1] = vEcZ * dScene;
    positions[i * 3 + 2] = vEcY * dScene;

    const col = bvToRgb(star.bv);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;

    // size 编码视星等：亮星更大，确保在远距离仍可见
    const magT = Math.max(-1.5, Math.min(star.mag, 6.5));
    const magSize = 6.0 - (magT + 1.5) * (3.5 / 8.0);
    sizes[i] = magSize;
  }

  return { positions, colors, sizes, count };
}

function createHipparcosPoints(data: ReturnType<typeof buildHipparcosEclipticField>): THREE.Points {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(data.colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(data.sizes, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uOpacity: { value: 1.0 },
    },
    vertexShader: /* glsl */ `
      attribute float size;
      varying vec3 vColor;
      uniform float uPixelRatio;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        // size 已编码视星等亮度；远距离时不应再随距离过度衰减（视星等已含距离信息）
        float proximityBoost = max(1.0, 2000.0 / -mvPosition.z);
        gl_PointSize = size * uPixelRatio * proximityBoost;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      uniform float uOpacity;
      void main() {
        float d = distance(gl_PointCoord, vec2(0.5));
        if (d > 0.5) discard;
        float strength = 1.0 - d * 2.0;
        strength = pow(strength, 2.5);
        gl_FragColor = vec4(vColor, strength * uOpacity);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexColors: true,
  });

  const points = new THREE.Points(geometry, material);
  points.name = 'hipparcos-stellar-field';
  return points;
}

interface UniverseViewerProps {
  currentTimestamp: number;
  strictPhysics: boolean;
  setStrictPhysics?: (val: boolean) => void;
  selectedPlanetId: string;
  onSelectPlanet: (id: string) => void;
  crossSectionActive: boolean;
  lang: 'zh' | 'en';
  showConstellLines?: boolean;
  magLimit?: number;
  textureOffsets?: Record<string, { u: number; v: number }>;
  cloudsVisible?: boolean;
  activeLayer?: 'core' | 'mantle' | 'crust' | 'atmosphere' | 'ring' | null;
  onLayerHover?: (layer: 'core' | 'mantle' | 'crust' | 'atmosphere' | 'ring' | null) => void;
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
const createEarthCloudMaterial = (cloudTex: THREE.Texture, opacity: number) => {
  return new THREE.MeshPhongMaterial({
    map: cloudTex,
    alphaMap: cloudTex,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
};

// ============================================================================
// 地球夜晚城市灯光着色器 (Earth Night Lights Shader)
// ============================================================================
const NIGHT_LIGHTS_VERTEX_SHADER = `
  varying vec2 vUv;
  varying vec3 vNormalWorld;
  varying vec3 vLocalPosition;
  void main() {
    vUv = uv;
    vNormalWorld = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    vLocalPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const NIGHT_LIGHTS_FRAGMENT_SHADER = `
  uniform sampler2D uNightMap;
  uniform vec3 uLightDirection;
  uniform bool uShowStructure;
  varying vec2 vUv;
  varying vec3 vNormalWorld;
  varying vec3 vLocalPosition;

  void main() {
    if (uShowStructure && vLocalPosition.x > 0.0 && vLocalPosition.y > 0.0 && vLocalPosition.z > 0.0) {
      discard;
    }
    vec4 nightTex = texture2D(uNightMap, vUv);
    float lightIntensity = nightTex.r;

    float sunDot = dot(vNormalWorld, uLightDirection);
    // 只在暗面显示：sunDot < -0.1 时全亮，sunDot > 0.15 时完全隐藏
    float nightFactor = 1.0 - smoothstep(-0.1, 0.15, sunDot);

    // 城市灯光偏暖黄色
    vec3 lightColor = vec3(1.0, 0.85, 0.6) * lightIntensity * nightFactor * 4.0;

    float alpha = lightIntensity * nightFactor * 1.5;

    gl_FragColor = vec4(lightColor, alpha);
  }
`;

const createNightLightsMaterial = (nightTex: THREE.Texture) => {
  return new THREE.ShaderMaterial({
    vertexShader: NIGHT_LIGHTS_VERTEX_SHADER,
    fragmentShader: NIGHT_LIGHTS_FRAGMENT_SHADER,
    uniforms: {
      uLightDirection: { value: new THREE.Vector3(1, 0, 0) },
      uNightMap: { value: nightTex },
      uShowStructure: { value: false }
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide
  });
};

const CROSS_PALETTE: Record<string, { core: number; mantle: number; crust: number; atm: number; rCore: number; rMantle: number }> = {
  sun:     { core: 0xffffff, mantle: 0xffaa00, crust: 0xdd8800, atm: 0xff8800, rCore: 0.25, rMantle: 0.70 },
  mercury: { core: 0x999999, mantle: 0x776655, crust: 0x887766, atm: 0xaaaaaa, rCore: 0.828, rMantle: 0.94 },
  venus:   { core: 0xddddcc, mantle: 0xbb9955, crust: 0xaa8844, atm: 0xffcc44, rCore: 0.528, rMantle: 0.94 },
  earth:   { core: 0xffd700, mantle: 0xc2381a, crust: 0x5c3a21, atm: 0x8ab6ff, rCore: 0.546, rMantle: 0.94 },
  moon:    { core: 0x777777, mantle: 0x554433, crust: 0x665544, atm: 0x999999, rCore: 0.19, rMantle: 0.92 },
  mars:    { core: 0x882211, mantle: 0xcc5522, crust: 0xaa5522, atm: 0xffaa88, rCore: 0.54, rMantle: 0.94 },
  jupiter: { core: 0xddddcc, mantle: 0xc4956a, crust: 0xb08050, atm: 0xd4a574, rCore: 0.20, rMantle: 0.84 },
  saturn:  { core: 0xddddcc, mantle: 0xc4a574, crust: 0xb09060, atm: 0xe0c090, rCore: 0.25, rMantle: 0.68 },
  uranus:  { core: 0xccddcc, mantle: 0x88bbcc, crust: 0x77aabb, atm: 0x66aacc, rCore: 0.20, rMantle: 0.78 },
  neptune: { core: 0xccccdd, mantle: 0x4466bb, crust: 0x335599, atm: 0x3366aa, rCore: 0.28, rMantle: 0.77 },
};

const injectClippingShader = (mat: THREE.Material) => {
  mat.userData.uniforms = {
    uShowStructure: { value: false }
  };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uShowStructure = mat.userData.uniforms.uShowStructure;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>\n varying vec3 vLocalPosition;`
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>\n vLocalPosition = position;`
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>\n uniform bool uShowStructure;\n varying vec3 vLocalPosition;`
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      'void main() {',
      `void main() {\n if (uShowStructure && vLocalPosition.x > 0.0 && vLocalPosition.y > 0.0 && vLocalPosition.z > 0.0) { discard; }`
    );
  };
};

const createSectorPlane = (radius: number, pc: any) => {
  const geo = new THREE.CircleGeometry(radius, 64, 0, Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uRadius: { value: radius },
      uHoveredLayer: { value: 0 },
      uColorCore: { value: new THREE.Color(pc.core) },
      uColorMantle: { value: new THREE.Color(pc.mantle) },
      uColorCrust: { value: new THREE.Color(pc.crust) },
      uColorAtm: { value: new THREE.Color(pc.atm || pc.crust) },
      uRCore: { value: pc.rCore },
      uRMantle: { value: pc.rMantle }
    },
    vertexShader: `
      varying vec3 vPosition;
      void main() {
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uRadius;
      uniform int uHoveredLayer;
      uniform vec3 uColorCore;
      uniform vec3 uColorMantle;
      uniform vec3 uColorCrust;
      uniform vec3 uColorAtm;
      uniform float uRCore;
      uniform float uRMantle;
      
      varying vec3 vPosition;

      void main() {
        float dist = length(vPosition);
        float normDist = dist / uRadius;
        vec3 color = vec3(0.0);
        int layer = 0;
        
        float innerR = 0.0;
        float outerR = 1.0;
        
        if (normDist <= uRCore) {
          color = uColorCore;
          layer = 1;
          outerR = uRCore;
        } else if (normDist <= uRMantle) {
          color = uColorMantle;
          layer = 2;
          innerR = uRCore;
          outerR = uRMantle;
        } else if (normDist <= 1.0) {
          color = uColorCrust;
          layer = 3;
          innerR = uRMantle;
          outerR = 1.0;
        } else {
          color = uColorAtm;
          layer = 4;
          innerR = 1.0;
          outerR = 1.06;
        }
        
        vec3 baseColor = color;
        
        if (uHoveredLayer > 0) {
          if (layer == uHoveredLayer) {
            // 1. 彻底去除发白蒙版，保持该层原本纯粹的色彩，仅极轻微提亮饱和度
            color = baseColor * 1.05;
            
            // 2. 内部立体倒角 (Bevel) 效果，产生物理凸起感
            float distToInner = normDist - innerR;
            float distToOuter = outerR - normDist;
            float bevelWidth = 0.02;
            
            if (distToInner < bevelWidth && innerR > 0.0) {
              // 靠近内圈边缘，加亮 (模拟光源高光)
              float highlight = smoothstep(bevelWidth, 0.0, distToInner);
              color = mix(color, vec3(1.0), highlight * 0.4);
            }
            if (distToOuter < bevelWidth) {
              // 靠近外圈边缘，加暗 (模拟背光阴影)
              float shadow = smoothstep(bevelWidth, 0.0, distToOuter);
              color = mix(color, vec3(0.0), shadow * 0.5);
            }
            
            // 3. 极细的深色外描边，收敛边缘
            float borderThickness = 0.004;
            if ((distToInner < borderThickness && innerR > 0.0) || distToOuter < borderThickness) {
              color = mix(baseColor, vec3(0.0), 0.8);
            }
            
          } else {
            // 4. 未被 Hover 的层整体大幅压暗，通过对比度拉开层级高度差
            color = baseColor * 0.45;
            
            // 5. 模拟 Hover 层对相邻层的物理投影 (Drop Shadow)，强化悬浮错觉
            float shadowWidth = 0.04;
            if (layer == uHoveredLayer - 1 && outerR > 0.0) {
              // 当前层在 Hover 层内侧，受到 Hover 层内边缘的投影
              float distToHover = outerR - normDist;
              if (distToHover < shadowWidth) {
                float shadow = smoothstep(shadowWidth, 0.0, distToHover);
                color = mix(color, vec3(0.0), shadow * 0.85);
              }
            } else if (layer == uHoveredLayer + 1) {
              // 当前层在 Hover 层外侧，受到 Hover 层外边缘的投影
              float distToHover = normDist - innerR;
              if (distToHover < shadowWidth) {
                float shadow = smoothstep(shadowWidth, 0.0, distToHover);
                color = mix(color, vec3(0.0), shadow * 0.85);
              }
            }
          }
        }
        
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -4
  });
  return new THREE.Mesh(geo, mat);
};

export default function UniverseViewer({
  currentTimestamp,
  strictPhysics,
  setStrictPhysics,
  selectedPlanetId,
  onSelectPlanet,
  crossSectionActive,
  lang,
  showConstellLines = false,
  magLimit = 5.5,
  textureOffsets = {},
  cloudsVisible = true,
  activeLayer,
  onLayerHover,
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
  const domeStarsRef = useRef<THREE.Points | null>(null);
  const galaxySpriteRef = useRef<THREE.Mesh | null>(null);
  const hipparcosRef = useRef<THREE.Points | null>(null);
  const hipparcosCatalogRef = useRef<HipparcosStar[] | null>(null);
  const magLimitRef = useRef(magLimit);
  const textureOffsetsRef = useRef<Record<string, { u: number; v: number }>>(textureOffsets);

  const getSunRadius = (): number => {
    return ScaleEngine.getRadius('sun', strictPhysics);
  };

  const getPlanetRadius = (id: string): number => {
    return ScaleEngine.getRadius(id, strictPhysics);
  };

  // 地月轨道显示数值动态计算（统一比例管道，确保UI显示与3D渲染完全一致）
  const getLunarDisplayValues = () => {
    const moonOrbitAU = 0.00257;
    const moonOrbitScene = ScaleEngine.fromAU(moonOrbitAU);
    const earthStrictRad = ScaleEngine.getStrictRadius('earth');
    const earthObsRad = ScaleEngine.getObservableRadius('earth');
    const moonStrictRad = ScaleEngine.getStrictRadius('moon');
    const moonObsRad = ScaleEngine.getObservableRadius('moon');
    const orbitRadius = strictPhysics ? moonOrbitScene : moonOrbitScene * (earthObsRad / earthStrictRad);
    const earthRad = strictPhysics ? earthStrictRad : earthObsRad;
    const moonRad = strictPhysics ? moonStrictRad : moonObsRad;
    return {
      orbitRadius,
      earthRad,
      moonRad,
      ratio: orbitRadius / earthRad,
      intrusion: (orbitRadius / 22.0) * 100
    };
  };

  const currentTimestampRef = useRef(currentTimestamp);
  const selectedPlanetIdRef = useRef(selectedPlanetId);
  const crossSectionActiveRef = useRef(crossSectionActive);
  const cloudsVisibleRef = useRef(cloudsVisible);

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
    cloudsVisibleRef.current = cloudsVisible;
  }, [cloudsVisible]);

  useEffect(() => {
    if (constellLinesRef.current) {
      constellLinesRef.current.visible = !!showConstellLines;
    }
  }, [showConstellLines]);
  
  const flareOpacityRef = useRef(1.0);  // 镜头光晕平滑淡入淡出插值机点

  // 用于计算镜头光晕 (Lens Flare) 的屏幕投影坐标
  const [sunScreenPos, setSunScreenPos] = useState<{ x: number; y: number; visible: boolean; scale: number; opacity: number } | null>(null);
  const [zoomLevelText, setZoomLevelText] = useState<string>('1.00 AU');

  // == 日地距离几何排列验证系统 (Sun-Earth Distance Validation Simulation System) ==
  const [panelTab, setPanelTab] = useState<'packing' | 'audit'>('audit');
  const [packingActive, setPackingActive] = useState<boolean>(false);
  const [packingProgressDone, setPackingProgressDone] = useState<number>(0);
  const [packingMode, setPackingMode] = useState<'physical' | 'visual'>('physical');

  const packingActiveRef = useRef<boolean>(false);
  const packingProgressDoneRef = useRef<number>(0);
  const packingModeRef = useRef<'physical' | 'visual'>('physical');
  const strictPhysicsRef = useRef<boolean>(false);
  const packingGroupRef = useRef<THREE.Group | null>(null);

  const [validationPairKey, setValidationPairKey] = useState<string>('sun-earth');
  const validationPairKeyRef = useRef<string>('sun-earth');

  useEffect(() => {
    validationPairKeyRef.current = validationPairKey;
    packingProgressDoneRef.current = 0;
    setPackingProgressDone(0);
  }, [validationPairKey]);

  useEffect(() => {
    packingActiveRef.current = packingActive;
    if (!packingActive) {
      packingProgressDoneRef.current = 0;
      setPackingProgressDone(0);
    }
  }, [packingActive]);

  useEffect(() => {
    packingModeRef.current = packingMode;
    packingProgressDoneRef.current = 0;
    setPackingProgressDone(0);
  }, [packingMode]);

  useEffect(() => {
    strictPhysicsRef.current = strictPhysics;
    packingProgressDoneRef.current = 0;
    setPackingProgressDone(0);
  }, [strictPhysics]);

  // 鼠标 Hover 互动和浮空卡片属性
  const [hoveredPlanetId, setHoveredPlanetId] = useState<string | null>(null);
  const [hoveredSatelliteName, setHoveredSatelliteName] = useState<{ zh: string; en: string } | null>(null);
  const [hoveredPlanetPos, setHoveredPlanetPos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredLayer, setHoveredLayer] = useState<'core' | 'mantle' | 'crust' | 'atmosphere' | 'ring' | null>(null);

  const hoveredPlanetIdRef = useRef<string | null>(null);
  const hoveredSatelliteNameRef = useRef<{ zh: string; en: string } | null>(null);
  const hoveredLayerRef = useRef<'core' | 'mantle' | 'crust' | 'atmosphere' | 'ring' | null>(null);

  const effectiveHoveredLayer = activeLayer !== undefined ? activeLayer : hoveredLayer;

  const handleSetHoveredLayer = (layer: 'core' | 'mantle' | 'crust' | 'atmosphere' | 'ring' | null) => {
    setHoveredLayer(layer);
    if (onLayerHover) {
      onLayerHover(layer);
    }
  };

  useEffect(() => {
    hoveredPlanetIdRef.current = hoveredPlanetId;
  }, [hoveredPlanetId]);

  useEffect(() => {
    hoveredSatelliteNameRef.current = hoveredSatelliteName;
  }, [hoveredSatelliteName]);

  useEffect(() => {
    hoveredLayerRef.current = effectiveHoveredLayer;
  }, [effectiveHoveredLayer]);

  useEffect(() => {
    if (constellLinesRef.current) {
      constellLinesRef.current.visible = !!showConstellLines;
    }
  }, [showConstellLines]);

  // 本地纹理资源库 (public/textures/ 目录，通过根路径引用)
  const REAL_TEXTURE_URLS: Record<string, string> = {
    sun: '/textures/8k_sun.jpg',
    mercury: '/textures/8k_mercury.jpg',
    venus: '/textures/8k_venus_surface.jpg',
    earth: '/textures/8k_earth_daymap.jpg',
    moon: '/textures/8k_moon.jpg',
    mars: '/textures/8k_mars.jpg',
    jupiter: '/textures/8k_jupiter.jpg',
    saturn: '/textures/8k_saturn.jpg',
    uranus: '/textures/2k_uranus.jpg',
    neptune: '/textures/2k_neptune.jpg',
    earth_clouds: '/textures/8k_earth_clouds.jpg',
    earth_specular: '/textures/2k_earth_specular_map.jpg',
    earth_nightmap: '/textures/8k_earth_nightmap.jpg',
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
      // 复用全局 TextureLoader 避免重复实例化开销
      const loader = (window as any).__galaxyTextureLoader || new THREE.TextureLoader();
      (window as any).__galaxyTextureLoader = loader;
      loader.load(
        realUrl,
        (loadedTex) => {
          loadedTex.colorSpace = THREE.SRGBColorSpace;
          
          loadedTex.wrapS = THREE.RepeatWrapping;
          loadedTex.wrapT = THREE.RepeatWrapping;

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
    texture.wrapT = THREE.RepeatWrapping;
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

    // 黄赤交角常量（后续 domeStars 和银心方向共用）
    const eps = 23.439 * Math.PI / 180;
    const cosEps = Math.cos(eps);
    const sinEps = Math.sin(eps);

    // 银河系全景背景：3D 空间中的 face-on 薄盘图片
    // 太阳在盘面上，距离银心象征性偏移；盘法线指向银北极
    const galaxyTex = new THREE.TextureLoader().load('/textures/milky_way_galaxy.png');
    galaxyTex.colorSpace = THREE.SRGBColorSpace;
    const galaxyGeo = new THREE.CircleGeometry(500000, 64);
    const galaxyMat = new THREE.MeshBasicMaterial({
      map: galaxyTex,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const galaxyMesh = new THREE.Mesh(galaxyGeo, galaxyMat);

    // 银心方向（赤道坐标 → 黄道坐标 → Three.js 坐标）
    const raGC = (17 + 45.6 / 60) * Math.PI / 12;
    const decGC = -29.0 * Math.PI / 180;
    const cosDecGC = Math.cos(decGC);
    const sinDecGC = Math.sin(decGC);
    const cosRaGC = Math.cos(raGC);
    const sinRaGC = Math.sin(raGC);
    const vEqX_gc = cosDecGC * cosRaGC;
    const vEqY_gc = cosDecGC * sinRaGC;
    const vEqZ_gc = sinDecGC;
    const vEcX_gc = vEqX_gc;
    const vEcY_gc = vEqY_gc * cosEps + vEqZ_gc * sinEps;
    const vEcZ_gc = -vEqY_gc * sinEps + vEqZ_gc * cosEps;
    // Three.js 坐标映射 (X, Z, Y)
    const gcDir = new THREE.Vector3(vEcX_gc, vEcZ_gc, vEcY_gc).normalize();

    // 银北极方向（银道面法线）
    const galacticPole = new THREE.Vector3(
      Math.cos(29.81 * Math.PI / 180) * Math.cos(96.38 * Math.PI / 180),
      Math.sin(29.81 * Math.PI / 180),
      Math.cos(29.81 * Math.PI / 180) * Math.sin(96.38 * Math.PI / 180)
    ).normalize();

    // 盘中心偏移到银心方向；太阳→银心向量垂直于银北极，故太阳在盘面上
    const GALACTIC_OFFSET = 100000;
    galaxyMesh.position.copy(gcDir).multiplyScalar(GALACTIC_OFFSET);

    // 盘面法线指向银北极（CircleGeometry 默认法线朝 +Z，lookAt 后 +Z 指向目标）
    galaxyMesh.lookAt(galaxyMesh.position.clone().add(galacticPole));

    scene.add(galaxyMesh);
    galaxySpriteRef.current = galaxyMesh;

    const width = container.clientWidth || window.innerWidth || 800;
    const height = container.clientHeight || window.innerHeight || 600;
    // 远剪裁面增大到 500,000,000（约 359 ly），匹配新的 maxDistance
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.05, 500000000);
    camera.position.set(0, 25, 35);
    cameraRef.current = camera;

    // 2. 创建 WebGLRenderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.localClippingEnabled = true;
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
    // maxDistance ≈ 90.9k AU / 1.44 ly (2M / 22)，足够看到银河系全貌
    controls.maxDistance = 2000000;
    controls.minDistance = 0.5;
    controlsRef.current = controls;

    // DEBUG: expose for automated verification
    (window as any).__camera = camera;
    (window as any).__controls = controls;
    (window as any).__scene = scene;

    // 4. 环境光 + 核心太阳光源点光源 (直面展示星体暗面与照亮面)
    const ambientLight = new THREE.AmbientLight(0x1a1a2e);
    scene.add(ambientLight);
    // 微弱的半球光填充背阳面，避免全黑
    const hemiLight = new THREE.HemisphereLight(0x1a1a2e, 0x080810, 0.4);
    scene.add(hemiLight);

    // 增大光照直照范围至 2500
    const sunPointLight = new THREE.PointLight(0xffffff, 2.5, 2500, 0.1);
    sunPointLight.position.set(0, 0, 0);
    sunPointLight.castShadow = true;
    scene.add(sunPointLight);

    // 5. 星空天顶画板星光背景 (使用星表真实恒星数据在3D空间中以标准尺度渲染)
    // Map all stars from ALL_STARS (基础亮星 + 88星座额外恒星) to 3D ecliptic coordinates
    const domeStarCount = ALL_STARS.length;
    const domeStarPositions = new Float32Array(domeStarCount * 3);
    const domeStarColors = new Float32Array(domeStarCount * 3);
    const domeStarPositionsMap = new Map<number, THREE.Vector3>();

    for (let i = 0; i < domeStarCount; i++) {
      const star = ALL_STARS[i];
      const dScene = star.dist * LY_TO_SCENE;

      const decRad = star.dec * Math.PI / 180;
      const raRad = star.ra * Math.PI / 12;
      const cosDec = Math.cos(decRad);
      const sinDec = Math.sin(decRad);
      const cosRa = Math.cos(raRad);
      const sinRa = Math.sin(raRad);

      const vEqX = cosDec * cosRa;
      const vEqY = cosDec * sinRa;
      const vEqZ = sinDec;

      const vEcX = vEqX;
      const vEcY = vEqY * cosEps + vEqZ * sinEps;
      const vEcZ = -vEqY * sinEps + vEqZ * cosEps;

      // Map to Three.js coordinates (X, Z, Y) because the codebase maps OrbitEngine standard Y to Three.js Z and Z to Three.js Y
      const xThree = vEcX * dScene;
      const yThree = vEcZ * dScene;
      const zThree = vEcY * dScene;

      if (star.mag > magLimitRef.current) {
        domeStarPositions[i * 3] = 0;
        domeStarPositions[i * 3 + 1] = -999999;
        domeStarPositions[i * 3 + 2] = 0;
        domeStarColors[i * 3] = 0;
        domeStarColors[i * 3 + 1] = 0;
        domeStarColors[i * 3 + 2] = 0;
      } else {
        domeStarPositions[i * 3] = xThree;
        domeStarPositions[i * 3 + 1] = yThree;
        domeStarPositions[i * 3 + 2] = zThree;

        const r = ((star.color >> 16) & 255) / 255;
        const g = ((star.color >> 8) & 255) / 255;
        const b = (star.color & 255) / 255;
        domeStarColors[i * 3] = r;
        domeStarColors[i * 3 + 1] = g;
        domeStarColors[i * 3 + 2] = b;
      }

      domeStarPositionsMap.set(star.id, new THREE.Vector3(xThree, yThree, zThree));
    }

    const domeGeo = new THREE.BufferGeometry();
    domeGeo.setAttribute('position', new THREE.BufferAttribute(domeStarPositions, 3));
    domeGeo.setAttribute('color', new THREE.BufferAttribute(domeStarColors, 3));

    const domeMat = new THREE.PointsMaterial({
      size: 6.0,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      sizeAttenuation: true,
      map: createUniverseStarTexture(),
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const domeStars = new THREE.Points(domeGeo, domeMat);
    scene.add(domeStars);
    domeStarsRef.current = domeStars;

    // Draw 3D constellation guide lines with stereo-parallax using THREE.LineSegments
    const constellationPoints: THREE.Vector3[] = [];
    for (const constell of ALL_CONSTELLATIONS) {
      for (const edge of constell.seq) {
        const starAObj = ALL_STARS.find(s => s.id === edge[0]);
        const starBObj = ALL_STARS.find(s => s.id === edge[1]);
        if (starAObj && starBObj && starAObj.mag <= magLimitRef.current && starBObj.mag <= magLimitRef.current) {
          const starA = domeStarPositionsMap.get(edge[0]);
          const starB = domeStarPositionsMap.get(edge[1]);
          if (starA && starB) {
            constellationPoints.push(starA);
            constellationPoints.push(starB);
          }
        }
      }
    }

    const constellGeo = new THREE.BufferGeometry().setFromPoints(constellationPoints);
    const constellMat = new THREE.LineBasicMaterial({
      color: 0x4dabf7, // A nice soft light blue/cyan for constellation guides
      transparent: true,
      opacity: 0.35,
      depthWrite: false
    });
    const constellationLines = new THREE.LineSegments(constellGeo, constellMat);
    constellationLines.visible = !!showConstellLines;
    scene.add(constellationLines);
    constellLinesRef.current = constellationLines;

    // 异步加载 Hipparcos 真实 3D 星场（8785颗恒星，B-V色指数着色）
    loadHipparcosCatalog().then(catalog => {
      if (!sceneRef.current) return;
      hipparcosCatalogRef.current = catalog;
      const data = buildHipparcosEclipticField(catalog, magLimitRef.current);
      const hipparcosPoints = createHipparcosPoints(data);
      sceneRef.current.add(hipparcosPoints);
      hipparcosRef.current = hipparcosPoints;
      console.log(`[Hipparcos] Loaded ${data.count} real stars into scene`);
    }).catch(err => {
      console.warn('[UniverseViewer] Failed to load Hipparcos catalog:', err);
    });

    // 7. 渲染太阳 (Sun) 独具日冕层与独立光晕
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
          const pos = OrbitEngine.getHeliocentricPosition(config.id, daysEquivalent);
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
        const moonOrbitAU = 0.00257;
        let moonOrbitScene = ScaleEngine.fromAU(moonOrbitAU);
        if (!strictPhysics) {
          // 可观测模式下，保持月球轨道与地球大小的视觉比例
          const earthStrictRad = ScaleEngine.getStrictRadius('earth');
          const earthObsRad = ScaleEngine.getObservableRadius('earth');
          moonOrbitScene *= (earthObsRad / earthStrictRad);
        }
        for (let j = 0; j <= samples; j++) {
          const theta = (j / samples) * Math.PI * 2;
          const x = moonOrbitScene * Math.cos(theta);
          const y = moonOrbitScene * Math.sin(theta) * Math.cos(iRad);
          const z = moonOrbitScene * Math.sin(theta) * Math.sin(iRad);
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
          roughness: 0.6,
          emissive: new THREE.Color(0x000000)
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.name = 'saturn-ring-mesh';
        // Add userData so that raycaster knows this is part of Saturn's ring system
        ringMesh.userData = { planetId: 'saturn', isRing: true };
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
          roughness: 0.9,
          emissive: new THREE.Color(0x000000)
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.name = 'uranus-ring-mesh';
        ringMesh.userData = { planetId: 'uranus', isRing: true };
        tiltGroup.add(ringMesh); // Added to tiltGroup!
      }

      // 绘制公转可见卫星 / 探测器 (Sub-moons and Space Probes)
      const moons = SATELLITE_DATA[config.id] || [];
      moons.forEach(m => {
        const distRatio = (strictPhysics && m.realDistance !== undefined) ? m.realDistance : m.distance;
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
      
      let validHit = null;
      for (let i = 0; i < intersects.length; i++) {
        const hit = intersects[i];
        const pid = hit.object.userData?.planetId || null;
        const isCrossSection = selectedPlanetIdRef.current === pid && crossSectionActiveRef.current;
        
        if (!isCrossSection && hit.object.name.includes('cross-section-plane')) {
          continue; // 忽略非选中星体的隐藏剖面，防止拦截射线
        }

        if (isCrossSection && !hit.object.userData?.isSatellite) {
          // 在剖面模式下，检查是否命中了被 Shader 裁剪掉的第一卦限区域
          if (
            hit.object.name === 'planet-body-mesh' || 
            hit.object.name.startsWith('planet-earth-clouds') ||
            hit.object.name === 'planet-earth-night-lights'
          ) {
            const localPoint = hit.object.worldToLocal(hit.point.clone());
            // 使用极小的负数容差，防止因为浮点数精度导致切口边缘被判定为未剔除
            if (localPoint.x > -0.01 && localPoint.y > -0.01 && localPoint.z > -0.01) {
              continue; // 忽略被裁剪掉的像素区域
            }
          }
        }
        
        validHit = hit;
        break;
      }

      if (validHit) {
        const hit = validHit;
        const hitObj = hit.object;
        const pid = hitObj.userData?.planetId || null;
        
        if (hitObj.userData?.isSatellite) {
          setHoveredPlanetId(pid);
          setHoveredSatelliteName({ zh: hitObj.userData.nameZh, en: hitObj.userData.nameEn });
          handleSetHoveredLayer(null);
        } else if (hitObj.userData?.isRing) {
          setHoveredPlanetId(pid);
          setHoveredSatelliteName(null);
          // 当悬停在星环上时，向外抛出一种特殊的 layer 'ring'
          handleSetHoveredLayer('ring');
        } else {
          setHoveredPlanetId(pid);
          setHoveredSatelliteName(null);

          // 如果在剖切观察口，精确断别地表、地壳、地幔或核心
          if (hitObj.name && hitObj.name.includes('cross-section-plane')) {
            const localPoint = hitObj.worldToLocal(hit.point.clone());
            const dist = localPoint.length();
            const r = getPlanetRadius(pid || 'earth');
            const normDist = dist / r;
            const pc = CROSS_PALETTE[pid || 'earth'] || CROSS_PALETTE.earth;
            
            if (normDist <= pc.rCore) {
              handleSetHoveredLayer('core');
            } else if (normDist <= pc.rMantle) {
              handleSetHoveredLayer('mantle');
            } else if (normDist <= 1.0) {
              handleSetHoveredLayer('crust');
            } else {
              handleSetHoveredLayer('atmosphere');
            }
          } else {
            handleSetHoveredLayer(null);
          }
        }
      } else {
        setHoveredPlanetId(null);
        setHoveredSatelliteName(null);
        handleSetHoveredLayer(null);
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
        
        let validHit = null;
        for (let i = 0; i < intersects.length; i++) {
          const hit = intersects[i];
          const pid = hit.object.userData?.planetId || null;
          const isCrossSection = selectedPlanetIdRef.current === pid && crossSectionActiveRef.current;
          
          if (!isCrossSection && hit.object.name.includes('cross-section-plane')) {
            continue; // 忽略非选中星体的隐藏剖面，防止拦截射线
          }

          if (isCrossSection && !hit.object.userData?.isSatellite) {
            // 在剖面模式下，检查是否命中了被 Shader 裁剪掉的第一卦限区域
            if (
              hit.object.name === 'planet-body-mesh' || 
              hit.object.name.startsWith('planet-earth-clouds') ||
              hit.object.name === 'planet-earth-night-lights'
            ) {
              // hit.point 是世界坐标，转换到球体局部坐标
              const localPoint = hit.object.worldToLocal(hit.point.clone());
              
              // 使用极小的负数容差，防止因为浮点数精度导致切口边缘被判定为未剔除
              if (localPoint.x > -0.01 && localPoint.y > -0.01 && localPoint.z > -0.01) {
                continue;
              }
            }
          }
          
          validHit = hit;
          break;
        }

        if (validHit) {
          const hit = validHit.object;
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

    // 优化滚动缩放比例，拦截并自定义物理一致的滚轮事件 (Custom uniform scroll zoom handler)
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();

      const camera = cameraRef.current;
      const controls = controlsRef.current;
      if (!camera || !controls) return;

      const target = controls.target;
      const position = camera.position;

      // 1. 计算目标点(target)到相机的几何向量
      const toCamera = new THREE.Vector3().subVectors(position, target);
      const dist = toCamera.length();

      // 2. 统一滚轮方向：使每次滚轮滚动的缩放尺度具有 100% 轨物理几何上的完全一致性
      const direction = Math.sign(event.deltaY);
      if (direction === 0) return;

      // 3. 构建 100% 绝对一致的缩放乘数系数 (1.08x拉远/0.9259x拉近)
      const baseFactor = 1.08;
      const zoomFactor = direction > 0 ? baseFactor : (1 / baseFactor);

      // 4. 进行安全层面的 minDistance 与 maxDistance 加密防护
      const nextDist = dist * zoomFactor;
      if (nextDist < controls.minDistance || nextDist > controls.maxDistance) {
        const clampedDist = Math.max(controls.minDistance, Math.min(controls.maxDistance, nextDist));
        if (Math.abs(clampedDist - dist) < 0.00001) return;
        toCamera.setLength(clampedDist);
      } else {
        toCamera.multiplyScalar(zoomFactor);
      }

      // 5. 将新计算的相机公轴位置直接赋回渲染并更新控制器
      camera.position.copy(target).add(toCamera);
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

        // 获取3D轨道物理世界坐标，统一通过 ORBIT_SCALE 转换为场景单位
        let finalPos: THREE.Vector3;
        if (config.id === 'moon') {
          const earthPosRaw = OrbitEngine.getHeliocentricPosition('earth', daysSinceJ2000);
          const moonRelPosRaw = OrbitEngine.getLunarRelativePosition(daysSinceJ2000);

          // 统一坐标管道：真实 AU → 场景单位
          const earthPos = toThreePos(earthPosRaw, ORBIT_SCALE);
          const moonRelPos = toThreePos(moonRelPosRaw, ORBIT_SCALE);

          // 可观测模式下，放大局部轨道以保持与星体大小的视觉比例
          if (!strictPhysicsRef.current) {
            const earthStrictRad = ScaleEngine.getStrictRadius('earth');
            const earthObsRad = ScaleEngine.getObservableRadius('earth');
            const scaleFactor = earthObsRad / earthStrictRad;
            moonRelPos.multiplyScalar(scaleFactor);
          }

          finalPos = earthPos.clone().add(moonRelPos);
        } else {
          const rawPos = OrbitEngine.getHeliocentricPosition(config.id, daysSinceJ2000);
          finalPos = toThreePos(rawPos, ORBIT_SCALE);
        }
        group.position.copy(finalPos);

        // 所有星体常驻显示，不随选中而隐藏

        const tiltGroup = group.getObjectByName('planet-tilt-root') as THREE.Group;
        if (!tiltGroup) return;

        // 清理老一轮的球体展示，每次更新根据 剖面模式 (crossSectionActive) & 选中星体进行个性多层渲染，保证数据同步
        const isSelected = selectedPlanetIdRef.current === config.id;
        const isCrossSection = isSelected && crossSectionActiveRef.current;

        const hasBody = tiltGroup.children.some(ch => ch.name === 'planet-body-root');
        const needsRebuild = !hasBody;

        if (needsRebuild) {
          // 清除历史子星体
          const olds = tiltGroup.children.filter(ch =>
            ch.name === 'planet-body-root' ||
            ch.name === 'cross-section-root' ||
            ch.name === 'planet-earth-clouds-1' ||
            ch.name === 'planet-earth-clouds-2'
          );
          olds.forEach(o => tiltGroup.remove(o));

          const r = config.radius;
          const tex = getPlanetTexture(config.id);
          const cloudTex = config.id === 'earth' ? getPlanetTexture('earth_clouds') : null;
          const nightTex = config.id === 'earth' ? getPlanetTexture('earth_nightmap') : null;

          const bodyGroup = new THREE.Group();
          bodyGroup.name = 'planet-body-root';

          const geom = new THREE.SphereGeometry(r, 48, 24);
          const earthSpecularTex = config.id === 'earth' ? getPlanetTexture('earth_specular') : null;

          const mat = new THREE.MeshStandardMaterial({
            map: tex,
            bumpMap: tex,
            bumpScale: config.id === 'earth' ? 0.025 : (['mercury', 'moon', 'mars'].includes(config.id) ? 0.04 : 0.012),
            roughness: config.id === 'earth' ? 0.45 : 0.85,
            metalness: config.id === 'earth' ? 0.15 : 0.05,
            ...(config.id === 'earth' && earthSpecularTex ? { roughnessMap: earthSpecularTex } : {})
          });
          
          injectClippingShader(mat);

          const mesh = new THREE.Mesh(geom, mat);
          mesh.name = 'planet-body-mesh';
          bodyGroup.add(mesh);

          if (config.id === 'earth') {
            if (nightTex) {
              const nightGeo = new THREE.SphereGeometry(r * 1.005, 64, 32);
              const nightMat = createNightLightsMaterial(nightTex);
              const nightMesh = new THREE.Mesh(nightGeo, nightMat);
              nightMesh.name = 'planet-earth-night-lights';
              bodyGroup.add(nightMesh);
            }
          }

          if (config.id === 'moon') {
            const glowGeo = new THREE.SphereGeometry(r * 1.15, 32, 16);
            const glowMat = new THREE.MeshBasicMaterial({
              color: 0xdae6ff,
              transparent: true,
              opacity: 0.35,
              blending: THREE.AdditiveBlending,
              side: THREE.BackSide
            });
            const glowMesh = new THREE.Mesh(glowGeo, glowMat);
            glowMesh.name = 'planet-moon-glow';
            bodyGroup.add(glowMesh);

            const glowOuterGeo = new THREE.SphereGeometry(r * 1.45, 32, 16);
            const glowOuterMat = new THREE.MeshBasicMaterial({
              color: 0x93c5fd,
              transparent: true,
              opacity: 0.15,
              blending: THREE.AdditiveBlending,
              side: THREE.BackSide
            });
            const glowOuterMesh = new THREE.Mesh(glowOuterGeo, glowOuterMat);
            glowOuterMesh.name = 'planet-moon-outer-glow';
            bodyGroup.add(glowOuterMesh);

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

          const axes = new THREE.AxesHelper(r * 2.2);
          axes.name = 'axes-helper';
          bodyGroup.add(axes);

          const pc = CROSS_PALETTE[config.id] || CROSS_PALETTE.earth;

          const crossGroup = new THREE.Group();
          crossGroup.name = 'cross-section-root';
          crossGroup.visible = false;
          
          const planeXY = createSectorPlane(r, pc);
          planeXY.name = 'cross-section-plane-xy';
          
          const planeYZ = createSectorPlane(r, pc);
          planeYZ.rotation.y = -Math.PI / 2;
          planeYZ.name = 'cross-section-plane-yz';
          
          const planeXZ = createSectorPlane(r, pc);
          planeXZ.rotation.x = Math.PI / 2;
          planeXZ.name = 'cross-section-plane-xz';
          
          crossGroup.add(planeXY, planeYZ, planeXZ);
          bodyGroup.add(crossGroup);

          tiltGroup.add(bodyGroup);

          if (config.id === 'earth' && cloudTex) {
            const cloudGeo1 = new THREE.SphereGeometry(r * 1.01, 64, 32);
            const cloudMat1 = createEarthCloudMaterial(cloudTex, 0.5);
            injectClippingShader(cloudMat1);
            const cloudMesh1 = new THREE.Mesh(cloudGeo1, cloudMat1);
            cloudMesh1.name = 'planet-earth-clouds-1';
            tiltGroup.add(cloudMesh1);

            const cloudGeo2 = new THREE.SphereGeometry(r * 1.015, 64, 32);
            const cloudMat2 = createEarthCloudMaterial(cloudTex, 0.25);
            injectClippingShader(cloudMat2);
            const cloudMesh2 = new THREE.Mesh(cloudGeo2, cloudMat2);
            cloudMesh2.name = 'planet-earth-clouds-2';
            tiltGroup.add(cloudMesh2);
          }
        }

        // 核心考虑自转角度：自转速度和方向由 OrbitEngine 基于历元完美约束
        const rotateY = OrbitEngine.getRotationAngle(config.id, currentTimestampRef.current);
        
        const bodyRoot = tiltGroup.getObjectByName('planet-body-root');
        if (bodyRoot) {
          bodyRoot.rotation.y = rotateY;

          const isSelected = selectedPlanetIdRef.current === config.id;
          const isCrossSection = isSelected && crossSectionActiveRef.current;

          const crossRoot = bodyRoot.getObjectByName('cross-section-root');
          if (crossRoot) {
            crossRoot.visible = isCrossSection;
            
            // 更新 Hover 状态
            const isHoveredPlanet = hoveredPlanetIdRef.current === config.id;
            let hoveredLayerIndex = 0;
            if (isHoveredPlanet || (isSelected && hoveredLayerRef.current)) {
              if (hoveredLayerRef.current === 'core') hoveredLayerIndex = 1;
              else if (hoveredLayerRef.current === 'mantle') hoveredLayerIndex = 2;
              else if (hoveredLayerRef.current === 'crust') hoveredLayerIndex = 3;
              else if (hoveredLayerRef.current === 'atmosphere') hoveredLayerIndex = 4;
            }
            
            // 处理星环的特殊 Hover
            const isHoveredRing = isHoveredPlanet && hoveredLayerRef.current === 'ring';
            tiltGroup.children.forEach(ch => {
              if (ch.name.endsWith('-ring-mesh') && ch instanceof THREE.Mesh) {
                // 对于星环，如果没有提供自定义 shader，我们就直接修改 material.emissive 或者 opacity
                if (ch.material instanceof THREE.MeshStandardMaterial) {
                  if (isHoveredRing) {
                    ch.material.emissive = new THREE.Color(0x222222); // 微微发亮
                    ch.material.opacity = Math.min(1.0, ch.material.opacity + 0.2);
                  } else {
                    ch.material.emissive = new THREE.Color(0x000000);
                    // 恢复原始透明度
                    ch.material.opacity = config.id === 'saturn' ? 0.85 : 0.25;
                  }
                  ch.material.needsUpdate = true;
                }
              }
            });
            
            crossRoot.children.forEach(ch => {
              if (ch instanceof THREE.Mesh && ch.material instanceof THREE.ShaderMaterial) {
                ch.material.uniforms.uHoveredLayer.value = hoveredLayerIndex;
              }
            });
          }

          bodyRoot.traverse(ch => {
            if (ch instanceof THREE.Mesh && ch.material) {
              if (ch.material.userData && ch.material.userData.uniforms && ch.material.userData.uniforms.uShowStructure) {
                ch.material.userData.uniforms.uShowStructure.value = isCrossSection;
              } else if (ch.material instanceof THREE.ShaderMaterial && ch.material.uniforms && ch.material.uniforms.uShowStructure) {
                ch.material.uniforms.uShowStructure.value = isCrossSection;
              }
            }
          });
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

        // 地球云层自转 & 夜晚灯光参数同步更新
        if (config.id === 'earth') {
          // 光照方向：从地球表面指向太阳（与 outward 法向量同向）
          const lightDir = new THREE.Vector3().copy(group.position).normalize().negate();

          // 双层云层独立旋转（模拟大气环流相对地表运动）
          // 使用 traverse 确保控制所有同名 mesh（包括模式切换后残留的）
          let cloudCount = 0;
          tiltGroup.traverse(ch => {
            if (ch.name === 'planet-earth-clouds-1') {
              ch.rotation.y = rotateY * 1.02;
              ch.visible = cloudsVisibleRef.current;
              if (ch instanceof THREE.Mesh && ch.material && ch.material.userData && ch.material.userData.uniforms && ch.material.userData.uniforms.uShowStructure) {
                const isCrossSection = selectedPlanetIdRef.current === config.id && crossSectionActiveRef.current;
                ch.material.userData.uniforms.uShowStructure.value = isCrossSection;
              }
              cloudCount++;
            } else if (ch.name === 'planet-earth-clouds-2') {
              ch.rotation.y = rotateY * 1.04;
              ch.visible = cloudsVisibleRef.current;
              if (ch instanceof THREE.Mesh && ch.material && ch.material.userData && ch.material.userData.uniforms && ch.material.userData.uniforms.uShowStructure) {
                const isCrossSection = selectedPlanetIdRef.current === config.id && crossSectionActiveRef.current;
                ch.material.userData.uniforms.uShowStructure.value = isCrossSection;
              }
              cloudCount++;
            }
          });

          // 夜晚灯光 shader 光照方向同步
          const nightObj = tiltGroup.getObjectByName('planet-earth-night-lights');
          if (nightObj) {
            nightObj.traverse(ch => {
              if (ch instanceof THREE.Mesh && ch.material instanceof THREE.ShaderMaterial) {
                ch.material.uniforms.uLightDirection.value.copy(lightDir);
              }
            });
          }
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

          // 计算完美对齐（Gap-free）的微小切片球体几何体半径
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

      // 星座连线在宇宙尺度下的动态淡出：星座是地球夜空的2D投影，在真实3D空间中呈放射状。
      // 飞出奥尔特云内缘（>1000 AU）即开始淡出，到 1200 AU 完全不可见。
      if (constellLinesRef.current) {
        const distAU = distToSun / 22.0;
        let targetLineOpacity = 0.35;
        if (distAU <= 1000) {
          targetLineOpacity = 0.35;
        } else if (distAU >= 1200) {
          targetLineOpacity = 0.0;
        } else {
          targetLineOpacity = 0.35 * (1.0 - (distAU - 1000) / 200);
        }
        const mat = constellLinesRef.current.material as THREE.LineBasicMaterial;
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetLineOpacity, 0.12);
      }

      // 计算当前相机距离中心太阳的实际距离，展示在底部
      const distAU = distToSun / 22.0;
      let distText: string;
      if (distAU < 10) {
        distText = `${distAU.toFixed(2)} AU`;
      } else if (distAU < 63241) {
        distText = `${distAU.toFixed(1)} AU`;
      } else {
        const distLY = distAU / 63241;
        distText = `${distLY.toFixed(2)} ly`;
      }
      setZoomLevelText(distText);

      // 银河系全景背景：根据相机到太阳的距离动态显示/隐藏
      if (galaxySpriteRef.current) {
        const distLY = distAU / 63241;
        let galaxyOpacity = 0;
        if (distLY < 0.05) {
          galaxyOpacity = 0;
        } else if (distLY < 0.5) {
          galaxyOpacity = (distLY - 0.05) / 0.45 * 0.85;
        } else {
          galaxyOpacity = 0.85;
        }
        // 平滑过渡
        (galaxySpriteRef.current.material as THREE.MeshBasicMaterial).opacity = THREE.MathUtils.lerp(
          (galaxySpriteRef.current.material as THREE.MeshBasicMaterial).opacity,
          galaxyOpacity,
          0.05
        );
        // 银河系是包围相机的全景球面，不随距离缩放
      }

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
            let offset: number;
            if (strictPhysicsRef.current) {
              // 物理1:1模式：相机距离基于轨道尺度，确保能看到太阳和轨道全貌
              const orbitDistances: Record<string, number> = {
                'mercury': 0.39, 'venus': 0.72, 'earth': 1.0, 'mars': 1.52,
                'jupiter': 5.2, 'saturn': 9.58, 'uranus': 19.22, 'neptune': 30.05,
                'moon': 0.00257
              };
              if (selectedPlanetIdRef.current === 'sun') {
                offset = 8; // 从太阳看，能看到地球轨道内侧
              } else {
                const orbitAU = orbitDistances[selectedPlanetIdRef.current] || 1.0;
                const orbitScene = ScaleEngine.fromAU(orbitAU);
                // 相机距离为轨道距离的25%~40%，确保能看到太阳和轨道
                const orbitFactor = isSat ? 0.15 : (selectedPlanetIdRef.current === 'jupiter' || selectedPlanetIdRef.current === 'saturn' ? 0.2 : 0.35);
                offset = Math.max(orbitScene * orbitFactor, radOfTarget * 4.2);
              }
            } else {
              // 可观测模式：星体恰好撑满屏幕（FOV=50°, d = r / tan(25°) ≈ 2.15r）
              const fillFactor = 2.15;
              offset = radOfTarget * fillFactor;
            }

            cameraRef.current.position.set(targetPos.x, targetPos.y, targetPos.z + offset);
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
        // 无选中时，相机聚焦到原点太阳
        controlsRef.current.target.set(0, 0, 0);
        lastSelectedPlanetIdRef.current = '';
        lastTargetPosRef.current.set(0, 0, 0);
        if (cameraRef.current.near !== 0.05) {
          cameraRef.current.near = 0.05;
          cameraRef.current.updateProjectionMatrix();
        }
        controlsRef.current.minDistance = 0.5;
      }

      // 11. 实时应用贴图便宜位置调试参数
      Object.entries(textureOffsetsRef.current).forEach(([id, offset]: [string, { u: number; v: number }]) => {
        const group = planetMeshesRef.current[id];
        if (!group) return;
        // 月球与星空模式统一基础偏移 0.25（SphereGeometry +z 面对应 u=0.25）
        const baseU = id === 'moon' ? 0.25 : 0;
        group.traverse((node) => {
          if (node instanceof THREE.Mesh && node.name === 'planet-body-mesh') {
            const mat = node.material as THREE.MeshStandardMaterial;
            if (mat.map) {
              mat.map.offset.x = baseU + offset.u;
              mat.map.offset.y = offset.v;
            }
            if (mat.bumpMap) {
              mat.bumpMap.offset.x = baseU + offset.u;
              mat.bumpMap.offset.y = offset.v;
            }
            if (mat.roughnessMap) {
              mat.roughnessMap.offset.x = baseU + offset.u;
              mat.roughnessMap.offset.y = offset.v;
            }
          }
          // 云层纹理也需要同步偏移（地球）
          if (node instanceof THREE.Mesh && node.name === 'planet-earth-clouds') {
            const cMat = node.material as THREE.MeshStandardMaterial;
            if (cMat.map) {
              cMat.map.offset.x = baseU + offset.u;
              cMat.map.offset.y = offset.v;
            }
          }
        });
      });

      // 12. 更新控制器与渲染新帧
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
      if (hipparcosRef.current) {
        hipparcosRef.current.geometry.dispose();
        const mat = hipparcosRef.current.material;
        if (mat instanceof THREE.ShaderMaterial) {
          mat.dispose();
        }
        hipparcosRef.current = null;
      }
      hipparcosCatalogRef.current = null;
    };
  }, [strictPhysics]);

  // 监听星等限制滑块变化，实现无感平滑局部重绘，防止重构整个 3D 场景 (In-place magLimit Filter Effect)
  useEffect(() => {
    magLimitRef.current = magLimit;
    const domeStars = domeStarsRef.current;
    if (!domeStars) return;

    const positions = domeStars.geometry.attributes.position.array as Float32Array;
    const colors = domeStars.geometry.attributes.color.array as Float32Array;
    const count = ALL_STARS.length;

    const eps = 23.439 * Math.PI / 180;
    const cosEps = Math.cos(eps);
    const sinEps = Math.sin(eps);

    const domeStarPositionsMap = new Map<number, THREE.Vector3>();

    for (let i = 0; i < count; i++) {
      const star = ALL_STARS[i];
      const dScene = star.dist * LY_TO_SCENE;

      const decRad = star.dec * Math.PI / 180;
      const raRad = star.ra * Math.PI / 12;
      const cosDec = Math.cos(decRad);
      const sinDec = Math.sin(decRad);
      const cosRa = Math.cos(raRad);
      const sinRa = Math.sin(raRad);

      const vEqX = cosDec * cosRa;
      const vEqY = cosDec * sinRa;
      const vEqZ = sinDec;

      const vEcX = vEqX;
      const vEcY = vEqY * cosEps + vEqZ * sinEps;
      const vEcZ = -vEqY * sinEps + vEqZ * cosEps;

      const xThree = vEcX * dScene;
      const yThree = vEcZ * dScene;
      const zThree = vEcY * dScene;

      const starPos = new THREE.Vector3(xThree, yThree, zThree);
      domeStarPositionsMap.set(star.id, starPos);

      if (star.mag > magLimit) {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = -999999;
        positions[i * 3 + 2] = 0;

        colors[i * 3] = 0;
        colors[i * 3 + 1] = 0;
        colors[i * 3 + 2] = 0;
      } else {
        positions[i * 3] = xThree;
        positions[i * 3 + 1] = yThree;
        positions[i * 3 + 2] = zThree;

        const r = ((star.color >> 16) & 255) / 255;
        const g = ((star.color >> 8) & 255) / 255;
        const b = (star.color & 255) / 255;
        colors[i * 3] = r;
        colors[i * 3 + 1] = g;
        colors[i * 3 + 2] = b;
      }
    }

    domeStars.geometry.attributes.position.needsUpdate = true;
    domeStars.geometry.attributes.color.needsUpdate = true;
    domeStars.geometry.computeBoundingBox();
    domeStars.geometry.computeBoundingSphere();

    // 动态同步星座连线（含88个现代星座），实现与星等阈值的极速联动
    if (constellLinesRef.current) {
      const constellationPoints: THREE.Vector3[] = [];
      for (const constell of ALL_CONSTELLATIONS) {
        for (const edge of constell.seq) {
          const starA = ALL_STARS.find(s => s.id === edge[0]);
          const starB = ALL_STARS.find(s => s.id === edge[1]);
          if (starA && starB && starA.mag <= magLimit && starB.mag <= magLimit) {
            const posA = domeStarPositionsMap.get(edge[0]);
            const posB = domeStarPositionsMap.get(edge[1]);
            if (posA && posB) {
              constellationPoints.push(posA);
              constellationPoints.push(posB);
            }
          }
        }
      }
      constellLinesRef.current.geometry.dispose();
      constellLinesRef.current.geometry = new THREE.BufferGeometry().setFromPoints(constellationPoints);
    }

    // 同步 Hipparcos 3D 真实星场的星等过滤
    if (hipparcosRef.current && hipparcosCatalogRef.current) {
      const newData = buildHipparcosEclipticField(hipparcosCatalogRef.current, magLimit);
      hipparcosRef.current.geometry.dispose();
      const newGeom = new THREE.BufferGeometry();
      newGeom.setAttribute('position', new THREE.BufferAttribute(newData.positions, 3));
      newGeom.setAttribute('color', new THREE.BufferAttribute(newData.colors, 3));
      newGeom.setAttribute('size', new THREE.BufferAttribute(newData.sizes, 1));
      hipparcosRef.current.geometry = newGeom;
    }
  }, [magLimit]);

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
              {effectiveHoveredLayer && (
                <span className="text-cyan-300 ml-1.5 font-normal">
                  - {
                    effectiveHoveredLayer === 'core' ? (lang === 'zh' ? '地核' : 'Core') :
                    effectiveHoveredLayer === 'mantle' ? (lang === 'zh' ? '地幔' : 'Mantle') :
                    effectiveHoveredLayer === 'crust' ? (lang === 'zh' ? '地壳' : 'Crust') :
                    effectiveHoveredLayer === 'ring' ? (lang === 'zh' ? '星环' : 'Rings') :
                    (lang === 'zh' ? '大气层' : 'Atmosphere')
                  }
                </span>
              )}
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
            {effectiveHoveredLayer && (
              <div className="mt-1 pt-1 border-t border-white/5">
                {lang === 'zh' ? '选中剖面物层: ' : 'Inner Layer: '}
                <span className="text-amber-400 font-bold uppercase">{lang === 'zh' ? translations[lang][effectiveHoveredLayer as keyof typeof translations['zh']] || effectiveHoveredLayer : effectiveHoveredLayer}</span>
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
