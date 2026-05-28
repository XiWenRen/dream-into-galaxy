/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OrbitEngine, CELESTIAL_PHYSICS, PLANET_ORBITAL_DATA } from '../engine/OrbitEngine';
import { SATELLITE_CATALOG } from '../engine/SatelliteData';
import { createAdvancedRingMaterial } from '../engine/PlanetMaterials';
import { buildSunGroup, updateSunEffects, SunGroup } from '../engine/SunEffects';
import { ScaleEngine } from '../engine/ScaleEngine';
import { TimeEngine } from '../engine/TimeEngine';
import { TeachingModeEngine } from '../engine/TeachingModeEngine';
import { translations } from '../i18n';
import { SOLAR_TERMS } from '../data/solarTerms';
import { MOON_PHASES } from '../data/moonPhases';
import { AstrophenomenaEngine, getCurrentCycleNewMoon, getExactMoonPhaseTime } from '../engine/AstrophenomenaEngine';
import { STAR_LIST, CONSTELLATIONS } from '../engine/StarDatabase';
import { EXTRA_STARS, EXTRA_CONSTELLATIONS } from '../engine/ExtraStarsDatabase';
import { loadHipparcosCatalog, HipparcosStar, bvToRgb } from '../engine/HipparcosLoader';
import type { PhenomenaDemoState } from '../types/astronomy';
import {
  createProceduralTexture,
  createProceduralRingTexture,
  createMoonGlowTexture,
  createUniverseStarTexture,
} from '../engine/TextureFactory';

/** 全局共享 TextureLoader 实例，避免重复创建与 window 污染 */
const sharedTextureLoader = new THREE.TextureLoader();

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
  startEntryAnimation?: boolean;
  currentTimestamp: number;
  strictPhysics: boolean;
  setStrictPhysics?: (val: boolean) => void;
  selectedPlanetId: string;
  onSelectPlanet: (id: string) => void;
  crossSectionActive: boolean;
  lang: 'zh' | 'en';
  showConstellLines?: boolean;
  showPlanetLabels?: boolean;
  magLimit?: number;
  textureOffsets?: Record<string, { u: number; v: number }>;
  cloudsVisible?: boolean;
  activeLayer?: 'core' | 'mantle' | 'crust' | 'atmosphere' | 'ring' | null;
  onLayerHover?: (layer: 'core' | 'mantle' | 'crust' | 'atmosphere' | 'ring' | null) => void;
  exposure?: number;
  showOrbits?: boolean;
  showAxes?: boolean;
  showLatLonGrid?: boolean;
  demoState?: PhenomenaDemoState;
  selectedSolarTermIndex?: number | null;
  onSelectSolarTerm?: (index: number) => void;
  selectedMoonPhaseIndex?: number | null;
  onSelectMoonPhase?: (index: number) => void;
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

const injectPlanetShader = (mat: THREE.Material, planetId?: string, radius?: number) => {
  mat.userData.uniforms = {
    uShowStructure: { value: false },
    uLocalSunDirection: { value: new THREE.Vector3(1.0, 0.0, 0.0) },
    uRadius: { value: radius ?? 1.0 }
  };
  
  let hasRing = false;
  let innerR = 0;
  let outerR = 0;
  
  if (planetId && radius) {
    if (planetId === 'saturn') { hasRing = true; innerR = radius * 1.28; outerR = radius * 2.35; }
    else if (planetId === 'uranus') { hasRing = true; innerR = radius * 1.5; outerR = radius * 2.01; }
    else if (planetId === 'jupiter') { hasRing = true; innerR = radius * 1.31; outerR = radius * 1.84; }
    else if (planetId === 'neptune') { hasRing = true; innerR = radius * 1.7; outerR = radius * 2.55; }
  }

  mat.userData.uniforms.uHasRing = { value: hasRing };
  mat.userData.uniforms.uRingInnerRadius = { value: innerR };
  mat.userData.uniforms.uRingOuterRadius = { value: outerR };

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uShowStructure = mat.userData.uniforms.uShowStructure;
    shader.uniforms.uLocalSunDirection = mat.userData.uniforms.uLocalSunDirection;
    shader.uniforms.uRadius = mat.userData.uniforms.uRadius;
    shader.uniforms.uHasRing = mat.userData.uniforms.uHasRing;
    shader.uniforms.uRingInnerRadius = mat.userData.uniforms.uRingInnerRadius;
    shader.uniforms.uRingOuterRadius = mat.userData.uniforms.uRingOuterRadius;

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
      `#include <common>\n uniform bool uShowStructure;\n varying vec3 vLocalPosition;\n uniform float uRadius;\n uniform vec3 uLocalSunDirection;\n uniform bool uHasRing;\n uniform float uRingInnerRadius;\n uniform float uRingOuterRadius;\n\n float getRingShadow(vec3 localPos, vec3 lightDirLocal) {\n if (!uHasRing) return 1.0;\n float d = lightDirLocal.y;\n if (abs(d) < 0.001) return 1.0;\n float t = -localPos.y / d;\n if (t < 0.0) return 1.0;\n vec3 p = localPos + t * lightDirLocal;\n float dist = length(p);\n if (dist >= uRingInnerRadius && dist <= uRingOuterRadius) { return 0.25; }\n return 1.0;\n }`
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      'void main() {',
      `void main() {\n float nx = vLocalPosition.x / uRadius;\n float ny = vLocalPosition.y / uRadius;\n float nz = vLocalPosition.z / uRadius;\n if (uShowStructure && nx > -0.01 && ny > -0.01 && nz > -0.01) { discard; }`
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `#include <dithering_fragment>\n if (uHasRing) { gl_FragColor.rgb *= getRingShadow(vLocalPosition, normalize(uLocalSunDirection)); }`
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

function createFatArrow(color: number, length: number, thickness: number): THREE.Group {
  const group = new THREE.Group();
  const headLength = length * 0.12;
  const shaftLength = length - headLength;
  
  // 杆子
  const shaftGeo = new THREE.CylinderGeometry(thickness, thickness, shaftLength, 32);
  shaftGeo.rotateZ(-Math.PI / 2);
  shaftGeo.translate(shaftLength / 2, 0, 0);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
  const shaft = new THREE.Mesh(shaftGeo, mat);
  group.add(shaft);
  
  // 头部
  const headGeo = new THREE.ConeGeometry(thickness * 2.5, headLength, 32);
  headGeo.rotateZ(-Math.PI / 2);
  headGeo.translate(shaftLength + headLength / 2, 0, 0);
  const head = new THREE.Mesh(headGeo, mat);
  group.add(head);
  
  return group;
}

function createLatLonGrid(
  radius: number,
  lonSegments: number,
  latSegments: number,
  planetId: string,
  lang: 'zh' | 'en'
): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 });

  const isEarth = planetId === 'earth';
  const labelInterval = isEarth ? 2 : 2;

  // 经线 (Meridians)
  for (let i = 0; i < lonSegments; i++) {
    const lon = (i / lonSegments) * Math.PI * 2;
    const points: THREE.Vector3[] = [];
    for (let j = 0; j <= latSegments * 2; j++) {
      const lat = (j / (latSegments * 2)) * Math.PI - Math.PI / 2;
      const x = radius * Math.cos(lat) * Math.cos(lon);
      const y = radius * Math.sin(lat);
      const z = -radius * Math.cos(lat) * Math.sin(lon);
      points.push(new THREE.Vector3(x, y, z));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geo, mat);
    group.add(line);

    // 经度标签（赤道外缘）
    if (planetId !== 'sun' && i % labelInterval === 0) {
      const lonDeg = Math.round((i / lonSegments) * 360);
      let labelText = '';

      if (isEarth) {
        const normalizedDeg = lonDeg > 180 ? lonDeg - 360 : lonDeg;
        const absDeg = Math.abs(normalizedDeg);
        const timeZone = Math.round(normalizedDeg / 15);
        const tzStr = timeZone >= 0 ? `+${timeZone}` : `${timeZone}`;
        if (lang === 'zh') {
          const dir = normalizedDeg >= 0 ? '东' : '西';
          labelText = `${dir}经${absDeg}° UTC${tzStr}`;
        } else {
          const dir = normalizedDeg >= 0 ? 'E' : 'W';
          labelText = `${absDeg}°${dir} UTC${tzStr}`;
        }
      } else {
        labelText = `${lonDeg}°`;
      }

      const labelRadius = radius * 1.06;
      const lx = labelRadius * Math.cos(lon);
      const ly = 0;
      const lz = -labelRadius * Math.sin(lon);

      const labelSprite = createTextSprite(labelText, '#e2e8f0', isEarth ? 20 : 18);
      labelSprite.position.set(lx, ly, lz);
      const aspect = labelSprite.material.map
        ? (labelSprite.material.map.image as any).width / (labelSprite.material.map.image as any).height
        : 1.0;
      const labelScale = radius * (isEarth ? 0.14 : 0.12);
      labelSprite.scale.set(labelScale * aspect, labelScale, 1);
      group.add(labelSprite);
    }
  }

  // 纬线 (Parallels)
  for (let i = 1; i < latSegments; i++) {
    const lat = (i / latSegments) * Math.PI - Math.PI / 2;
    const rLat = radius * Math.cos(lat);
    const y = radius * Math.sin(lat);
    const points: THREE.Vector3[] = [];
    for (let j = 0; j <= lonSegments; j++) {
      const lon = (j / lonSegments) * Math.PI * 2;
      const x = rLat * Math.cos(lon);
      const z = -rLat * Math.sin(lon);
      points.push(new THREE.Vector3(x, y, z));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geo, mat);
    group.add(line);
  }

  return group;
}

function createTextSprite(text: string, colorStr: string, fontSize = 28): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  ctx.font = `bold ${fontSize}px sans-serif`;
  
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  
  canvas.width = THREE.MathUtils.ceilPowerOfTwo(textWidth + 24);
  canvas.height = THREE.MathUtils.ceilPowerOfTwo(fontSize + 24);
  
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // 描边
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.95)';
  ctx.lineWidth = 5;
  ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
  
  // 填充
  ctx.fillStyle = colorStr;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: true
  });
  
  const sprite = new THREE.Sprite(mat);
  const aspect = canvas.width / canvas.height;
  sprite.scale.set(0.08 * aspect, 0.08, 1);
  return sprite;
}

function updateSpriteTextTexture(sprite: THREE.Sprite, text: string, colorStr: string, fontSize = 28) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  ctx.font = `bold ${fontSize}px sans-serif`;
  
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  
  canvas.width = THREE.MathUtils.ceilPowerOfTwo(textWidth + 24);
  canvas.height = THREE.MathUtils.ceilPowerOfTwo(fontSize + 24);
  
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // 描边
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.95)';
  ctx.lineWidth = 5;
  ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
  
  // 填充
  ctx.fillStyle = colorStr;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  
  const newTexture = new THREE.CanvasTexture(canvas);
  newTexture.minFilter = THREE.LinearFilter;
  
  const oldMat = sprite.material;
  if (oldMat.map) {
    oldMat.map.dispose();
  }
  oldMat.map = newTexture;
  oldMat.needsUpdate = true;
  
  const aspect = canvas.width / canvas.height;
  sprite.scale.set(0.08 * aspect, 0.08, 1);
}

/**
 * 根据轨道上的点序列，生成一个闭合且具有一定宽度的椭圆带状 RibbonGeometry
 */
function createEllipticalRibbonGeometry(points: THREE.Vector3[], width: number): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const indices: number[] = [];

  const len = points.length;
  for (let i = 0; i < len; i++) {
    const p = points[i];
    const nextP = points[(i + 1) % len];
    const dir = new THREE.Vector3().subVectors(nextP, p).normalize();
    // 轨道在水平面上运行，法线向量计算
    const normal = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

    const inner = p.clone().sub(normal.clone().multiplyScalar(width / 2));
    const outer = p.clone().add(normal.clone().multiplyScalar(width / 2));

    vertices.push(inner.x, inner.y, inner.z); // 顶点索引 2*i
    vertices.push(outer.x, outer.y, outer.z); // 顶点索引 2*i + 1

    const i0 = 2 * i;
    const i1 = 2 * i + 1;
    const i2 = 2 * ((i + 1) % len);
    const i3 = 2 * ((i + 1) % len) + 1;

    // 三角形面 1: i0, i2, i1
    indices.push(i0, i2, i1);
    // 三角形面 2: i1, i2, i3
    indices.push(i1, i2, i3);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * 带有 Jerk (加加速度) 控制的非线性物理运动学曲线 (S-Curve Kinematic Profile)
 * 采用 Smoothstep (Hermite插值) 对加速度进行平滑积分。
 * 这意味着速度的增长和衰减不是突变的，而是呈现 S 型，起步和停止时加速度都为 0，彻底消除机械顿挫感。
 * @param t 当前流逝的时间
 * @param D 总距离
 */
function calculateKinematicProgress(t: number, D: number): { progress: number, isFinished: boolean, velocity: number, totalTime: number } {
  if (D <= 0.0001) return { progress: 1.0, isFinished: true, velocity: 0, totalTime: 0 };

  // 1. 动态计算最大巡航速度 (极速限制翻倍：由 4.0 提升至 8.0)
  const vMax = 8.0 * Math.pow(D, 0.5);
  
  // 2. 设定极端的非线性加减速时间
  // 非线性加速时间：1.2 秒（加速度从0缓慢升到最大再缓慢降回0，最终达到 vMax）
  let tAccel = 1.2;
  // 非线性减速时间：3.0 秒
  let tDecel = 3.0;

  // 使用 Smoothstep 速度曲线积分：v(t) = vMax * (3x^2 - 2x^3)，其中 x = t / T
  // 积分得到的位移公式为：s(t) = vMax * T * (x^3 - 0.5x^4)
  // 因此，完整加速阶段（或减速阶段）走过的总距离正好是：0.5 * vMax * T
  const dAccel = 0.5 * vMax * tAccel;
  const dDecel = 0.5 * vMax * tDecel;

  let tCruise = 0;
  let vPeak = vMax;

  // 3. 距离校验：如果是短距离跳转（例如地月之间），则没有足够的距离达到 vMax
  if (dAccel + dDecel > D) {
    // 降级为非线性三角形曲线：等比例压缩加减速时间，使得积分面积刚好等于 D
    const ratio = Math.sqrt(D / (dAccel + dDecel));
    tAccel *= ratio;
    tDecel *= ratio;
    vPeak *= ratio;
  } else {
    // 梯形 S-Curve：计算匀速巡航阶段需要的时间
    const dCruise = D - dAccel - dDecel;
    tCruise = dCruise / vMax;
  }

  const totalTime = tAccel + tCruise + tDecel;

  if (t >= totalTime) {
    return { progress: 1.0, isFinished: true, velocity: 0, totalTime };
  }

  // 4. 根据当前时间 t 分段积分计算位移与实时速度
  let currentDist = 0;
  let currentV = 0;

  if (t <= tAccel) {
    // 阶段 1: 非线性 S 型加速 (Smoothstep)
    const x = t / tAccel;
    currentDist = vPeak * tAccel * (x * x * x - 0.5 * x * x * x * x);
    currentV = vPeak * (3 * x * x - 2 * x * x * x);
  } else if (t <= tAccel + tCruise) {
    // 阶段 2: 匀速巡航
    const tC = t - tAccel;
    const distAccel = 0.5 * vPeak * tAccel;
    currentDist = distAccel + vPeak * tC;
    currentV = vPeak;
  } else {
    // 阶段 3: 非线性 S 型减速 (Smoothstep 倒放)
    const tD = t - tAccel - tCruise;
    const x = tD / tDecel;
    const distBeforeDecel = (0.5 * vPeak * tAccel) + (vPeak * tCruise);
    
    // 减速阶段的速度公式：v(t) = vPeak * (1 - (3x^2 - 2x^3))
    currentV = vPeak * (1 - (3 * x * x - 2 * x * x * x));
    // 积分得到位移增量：s(t) = vPeak * tDecel * (x - (x^3 - 0.5x^4))
    const decelDist = vPeak * tDecel * (x - (x * x * x - 0.5 * x * x * x * x));
    
    currentDist = distBeforeDecel + decelDist;
  }

  return { progress: currentDist / D, isFinished: false, velocity: currentV, totalTime };
}

export default function UniverseViewer({
  startEntryAnimation = false,
  currentTimestamp,
  strictPhysics,
  setStrictPhysics,
  selectedPlanetId,
  onSelectPlanet,
  crossSectionActive,
  lang,
  showConstellLines = false,
  showPlanetLabels = true,
  magLimit = 5.5,
  textureOffsets = {},
  cloudsVisible = true,
  activeLayer,
  onLayerHover,
  exposure = 1.5,
  showOrbits = true,
  showAxes = false,
  showLatLonGrid = false,
  demoState,
  selectedSolarTermIndex,
  onSelectSolarTerm,
  selectedMoonPhaseIndex,
  onSelectMoonPhase,
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
  const transitionInfoRef = useRef<{
    active: boolean;
    phase: 'flight' | 'glide' | 'none';
    targetPlanetId: string;
    startPos: THREE.Vector3;
    startTarget: THREE.Vector3;
    midPos: THREE.Vector3;
    farPos: THREE.Vector3;
    finalPos: THREE.Vector3;
    elapsedTime: number;
    glideTime: number;
    totalDistance: number;
  }>({
    active: false,
    phase: 'none',
    targetPlanetId: '',
    startPos: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    midPos: new THREE.Vector3(),
    farPos: new THREE.Vector3(),
    finalPos: new THREE.Vector3(),
    elapsedTime: 0,
    glideTime: 0,
    totalDistance: 0
  });

  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);

  // Solar term ghost Earth meshes
  const solarTermGhostsRef = useRef<THREE.Group | null>(null);
  const solarTermGhostMeshesRef = useRef<THREE.Group[]>([]);
  const selectedSolarTermRef = useRef<number | null>(null);
  const moonPhaseGhostsRef = useRef<THREE.Group | null>(null);
  const moonPhaseGhostMeshesRef = useRef<THREE.Group[]>([]);
  const selectedMoonPhaseRef = useRef<number | null>(null);
  const lastAngleTextRef = useRef<string>('');
  const [isRotationSimActive, setIsRotationSimActive] = useState<boolean>(false);
  const isRotationSimActiveRef = useRef<boolean>(false);
  const solarTermsSelfRotationOffsetRef = useRef<number>(0);

  const solarTimeTextRef = useRef<HTMLSpanElement | null>(null);
  const solarStateTextRef = useRef<HTMLSpanElement | null>(null);
  const solarClockNeedleRef = useRef<HTMLDivElement | null>(null);
  const solarClockFaceRef = useRef<HTMLDivElement | null>(null);
  const solarDaylightHoursTextRef = useRef<HTMLSpanElement | null>(null);
  const solarNightHoursTextRef = useRef<HTMLSpanElement | null>(null);
  const solarDeclinationTextRef = useRef<HTMLSpanElement | null>(null);

  const currentTerm = (selectedSolarTermIndex !== null && selectedSolarTermIndex !== undefined)
    ? SOLAR_TERMS[selectedSolarTermIndex]
    : null;

  // ═══════════════════════════════════════════════════════════════
  // 天文现象演示辅助视觉效果 (Shadow cones, light beams, ecliptic plane)
  // ═══════════════════════════════════════════════════════════════
  const visualAidsRef = useRef<{
    sunBeam: THREE.Mesh | null;
    sunLightBeam: THREE.Mesh | null;         // 太阳光束 (从太阳发出)
    earthShadowCone: THREE.Mesh | null;
    moonShadowCone: THREE.Mesh | null;
    moonUmbraCone: THREE.Mesh | null;        // 月球本影锥 (日食)
    moonPenumbraCone: THREE.Mesh | null;     // 月球半影锥 (日食)
    earthUmbraCone: THREE.Mesh | null;       // 地球本影锥 (月食)
    earthPenumbraCone: THREE.Mesh | null;    // 地球半影锥 (月食)
    eclipticPlane: THREE.LineLoop | THREE.Mesh | null;
    earthAxis: THREE.Line | null;
    earthEquator: THREE.Mesh | null;
    obliquityArc: THREE.Line | null;
    eclipticProjLine: THREE.Object3D | null;
    equatorProjLine: THREE.Object3D | null;
    latitudeLines: { lat: number; name: string; dayLine: THREE.Line; nightLine: THREE.Line }[];
    beijingMarker: THREE.Mesh | null;
    beijingLabel: THREE.Sprite | null;
    eclipticLabel: THREE.Sprite | null;
    eclipticLabelRight: THREE.Sprite | null;
    equatorLabel: THREE.Sprite | null;
    obliquityLabel: THREE.Sprite | null;
    sunToMoonBeam: THREE.Mesh | null;
    moonToEarthBeam: THREE.Mesh | null;
    moonPhaseProjection: THREE.Mesh | null;
  }>({
    sunBeam: null,
    sunLightBeam: null,
    earthShadowCone: null,
    moonShadowCone: null,
    moonUmbraCone: null,
    moonPenumbraCone: null,
    earthUmbraCone: null,
    earthPenumbraCone: null,
    eclipticPlane: null,
    earthAxis: null,
    earthEquator: null,
    obliquityArc: null,
    eclipticProjLine: null,
    equatorProjLine: null,
    latitudeLines: [],
    beijingMarker: null,
    beijingLabel: null,
    eclipticLabel: null,
    eclipticLabelRight: null,
    equatorLabel: null,
    obliquityLabel: null,
    sunToMoonBeam: null,
    moonToEarthBeam: null,
    moonPhaseProjection: null,
  });

  const getSunRadius = (): number => {
    return ScaleEngine.getRadius('sun', strictPhysics);
  };

  const getPlanetRadius = (id: string): number => {
    return ScaleEngine.getRadius(id, strictPhysics);
  };

  const getCurrentPlanetRadius = (id: string): number => {
    const rawProgress = teachingModeProgressRef.current;
    const smoothTeachingProgress = THREE.MathUtils.smoothstep(rawProgress, 0, 1);
    const realRad = id === 'sun' ? getSunRadius() : getPlanetRadius(id);
    const teachingRad = TeachingModeEngine.getRadius(id);
    return THREE.MathUtils.lerp(realRad, teachingRad, smoothTeachingProgress);
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
  const showAxesRef = useRef(showAxes);
  const showLatLonGridRef = useRef(showLatLonGrid);

  const lastSelectedPlanetIdRef = useRef<string>(selectedPlanetId);
  const lastTargetPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const lastRadOfTargetRef = useRef<number>(1.0);

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
    showAxesRef.current = showAxes;
  }, [showAxes]);

  useEffect(() => {
    showLatLonGridRef.current = showLatLonGrid;
  }, [showLatLonGrid]);

  // 经纬度网格可见性控制
  useEffect(() => {
    Object.values(planetMeshesRef.current).forEach((group: THREE.Group | undefined) => {
      if (!group) return;
      group.traverse((node: THREE.Object3D) => {
        if (node.name === 'lat-lon-grid') {
          node.visible = showLatLonGrid;
        }
      });
    });
    if (sunMeshRef.current) {
      sunMeshRef.current.traverse((node: THREE.Object3D) => {
        if (node.name === 'lat-lon-grid') {
          node.visible = showLatLonGrid;
        }
      });
    }
  }, [showLatLonGrid]);

  useEffect(() => {
    if (constellLinesRef.current) {
      constellLinesRef.current.visible = !!showConstellLines;
    }
  }, [showConstellLines]);

  // 轨道线可见性控制
  useEffect(() => {
    Object.values(orbitLinesRef.current).forEach((line: THREE.Line | undefined) => {
      if (line) line.visible = showOrbits;
    });
  }, [showOrbits]);

  // 坐标轴可见性控制
  useEffect(() => {
    Object.values(planetMeshesRef.current).forEach((group: THREE.Group | undefined) => {
      if (!group) return;
      group.traverse((node: THREE.Object3D) => {
        if (node.name === 'axes-helper') {
          node.visible = showAxes;
        }
      });
    });
    if (sunMeshRef.current) {
      sunMeshRef.current.traverse((node: THREE.Object3D) => {
        if (node.name === 'axes-helper') {
          node.visible = showAxes;
        }
      });
    }
  }, [showAxes]);

  // 教学模式状态与进度控制
  const [teachingMode, setTeachingMode] = useState<boolean>(true);
  const teachingModeRef = useRef<boolean>(true);
  const teachingModeProgressRef = useRef<number>(1);

  // 初始入场动画控制
  const isEnteringRef = useRef<boolean>(false);
  const entryProgressRef = useRef<number>(0);
  const startEntryRef = useRef<boolean>(false);

  // 天文现象演示相机控制
  const demoCameraRef = useRef<{
    active: boolean;
    phenomenon: string | null;
    phase: number;
    targetPos: THREE.Vector3;
    targetLookAt: THREE.Vector3;
    transitionProgress: number;
    transitionSpeed: number;
    lastPhase: number;
  }>({
    active: false,
    phenomenon: null,
    phase: 0,
    targetPos: new THREE.Vector3(),
    targetLookAt: new THREE.Vector3(),
    transitionProgress: 1,
    transitionSpeed: 1.5, // seconds to complete transition
    lastPhase: -1,
  });

  useEffect(() => {
    teachingModeRef.current = teachingMode;
  }, [teachingMode]);

  // 用于区分首次加载（startEntryAnimation 从 false 变为 true）与组件重新挂载（已经是 true）
  const startEntryAnimationEverFalseRef = useRef(!startEntryAnimation);

  useEffect(() => {
    if (!startEntryAnimation) {
      startEntryAnimationEverFalseRef.current = true;
    }
    if (startEntryAnimation && startEntryAnimationEverFalseRef.current && !startEntryRef.current) {
      startEntryRef.current = true;
      isEnteringRef.current = true;
      entryProgressRef.current = 0;
    }
  }, [startEntryAnimation]);


  const [planetLabels, setPlanetLabels] = useState<Record<string, { x: number; y: number; visible: boolean; opacity: number; nameZh: string; nameEn: string }>>({});
  const [solarTermLabels, setSolarTermLabels] = useState<Record<number, { x: number; y: number; visible: boolean; opacity: number; nameZh: string; nameEn: string }>>({});
  const [moonPhaseLabels, setMoonPhaseLabels] = useState<Record<number, { x: number; y: number; visible: boolean; opacity: number; name: string; icon: string }>>({});
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
  // 黄道带状几何动态宽度控制
  const eclipticPointsRef = useRef<THREE.Vector3[]>([]);
  const eclipticLastWidthRef = useRef<number>(0.025);

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

  // Demo state tracking
  const demoStateRef = useRef(demoState);
  useEffect(() => {
    demoStateRef.current = demoState;
    if (demoState?.activePhenomenon) {
      demoCameraRef.current.active = true;
      demoCameraRef.current.phenomenon = demoState.activePhenomenon;
      if (demoState.demoPhase !== demoCameraRef.current.lastPhase) {
        demoCameraRef.current.phase = demoState.demoPhase;
        demoCameraRef.current.transitionProgress = 0;
        demoCameraRef.current.lastPhase = demoState.demoPhase;
      }
    } else {
      demoCameraRef.current.active = false;
      demoCameraRef.current.phenomenon = null;
      demoCameraRef.current.transitionProgress = 1;
    }
  }, [demoState]);

  // Sync textureOffsets prop changes into the ref (rAF loop reads the ref)
  useEffect(() => {
    textureOffsetsRef.current = textureOffsets;
  }, [textureOffsets]);

  // Solar term ghost visibility & selection update
  useEffect(() => {
    const ghostGroup = solarTermGhostsRef.current;
    if (!ghostGroup) return;

    const isSolarTermsDemo = demoState?.activePhenomenon === 'solar-terms';
    ghostGroup.visible = isSolarTermsDemo;

    if (isSolarTermsDemo) {
      const selectedIndex = selectedSolarTermIndex ?? -1;
      solarTermGhostMeshesRef.current.forEach((group, idx) => {
        const isSelected = idx === selectedIndex;
        group.traverse((node) => {
          if (node instanceof THREE.Mesh) {
            const mat = node.material as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;
            if (node.name.startsWith('solar-term-ghost-mesh')) {
              mat.opacity = isSelected ? 0.9 : 0.35;
              node.scale.setScalar(isSelected ? 1.4 : 1.0);
            } else if (node.name.startsWith('solar-term-glow')) {
              mat.opacity = isSelected ? 0.2 : 0.08;
              node.scale.setScalar(isSelected ? 1.4 : 1.0);
            } else if (node.name.startsWith('solar-term-ring')) {
              mat.opacity = isSelected ? 0.5 : 0.25;
            }
          }
        });
      });
    }
  }, [demoState, selectedSolarTermIndex]);

  // Moon phase ghost visibility & selection update
  useEffect(() => {
    const ghostGroup = moonPhaseGhostsRef.current;
    if (!ghostGroup) return;

    const isMoonPhaseDemo = demoState?.activePhenomenon === 'moon-phases';
    ghostGroup.visible = isMoonPhaseDemo;

    if (isMoonPhaseDemo) {
      const selectedIndex = selectedMoonPhaseIndex ?? -1;
      moonPhaseGhostMeshesRef.current.forEach((group, idx) => {
        const isSelected = idx === selectedIndex;
        group.traverse((node) => {
          if (node instanceof THREE.Mesh) {
            const mat = node.material as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;
            if (node.name.startsWith('moon-phase-ghost-mesh')) {
              mat.opacity = isSelected ? 0.9 : 0.3;
              node.scale.setScalar(1.0);
            } else if (node.name.startsWith('moon-phase-glow')) {
              mat.opacity = isSelected ? 0.15 : 0.05;
              node.scale.setScalar(1.0);
            } else if (node.name.startsWith('moon-phase-ring')) {
              mat.opacity = isSelected ? 0.5 : 0.2;
            }
          }
        });
      });
    }
  }, [demoState, selectedMoonPhaseIndex]);

  // Demo camera preset computation
  const computeDemoCameraTargets = (
    phenomenon: string,
    phase: number,
    earthPos: THREE.Vector3,
    moonPos: THREE.Vector3
  ): { position: THREE.Vector3; lookAt: THREE.Vector3 } => {
    const pos = new THREE.Vector3();
    const look = new THREE.Vector3();

    switch (phenomenon) {
      case 'moon-phases': {
        // Look at Earth from above the orbital plane, offset by phase to see moon orbit
        const angle = (phase / 8) * Math.PI * 2 + Math.PI / 6;
        const camDist = 5;
        const camHeight = 4;
        pos.set(
          earthPos.x + Math.cos(angle) * camDist,
          earthPos.y + camHeight,
          earthPos.z + Math.sin(angle) * camDist
        );
        look.copy(earthPos);
        break;
      }
      case 'eclipses': {
        // 侧视展示日-地-月排列和阴影锥
        const sunPos = new THREE.Vector3(0, 0, 0);
        const earthToSun = earthPos.clone().sub(sunPos).normalize();
        const sideDir = new THREE.Vector3(-earthToSun.z, 0, earthToSun.x).normalize();
        if (sideDir.lengthSq() < 0.001) sideDir.set(1, 0, 0);
        // 根据相位调整相机：0=太阳光束, 1=阴影锥, 2=地球被笼罩, 3=月球/血月
        const phaseOffsets = [
          { dist: 12, height: 5, lookOffset: 0 },   // 相位0: 远距看整体排列
          { dist: 8, height: 3, lookOffset: 0 },     // 相位1: 侧视阴影锥
          { dist: 5, height: 2, lookOffset: 0.3 },   // 相位2: 近距看地球被笼罩
          { dist: 6, height: 2, lookOffset: 0.5 },   // 相位3: 看月球/血月
        ];
        const cfg = phaseOffsets[Math.min(phase, phaseOffsets.length - 1)];
        const midPoint = earthPos.clone().add(moonPos).multiplyScalar(0.5);
        pos.copy(midPoint).add(sideDir.multiplyScalar(cfg.dist)).add(new THREE.Vector3(0, cfg.height, 0));
        look.copy(midPoint).add(earthToSun.multiplyScalar(cfg.lookOffset));
        break;
      }
      case 'solar-terms': {
        // 相机位置基于轨道半径（始终22场景单位），这样不论真实尺度还是演示尺度都能看到整条黄道
        // lookAt 始终聚焦地球，controls.target 跟随地球，缩放以地球为中心
        const earthOrbitRadius = 22.0; // BASE_AU_SCALE，轨道半径不随尺度变化
        const teachingOrbitScale = TeachingModeEngine.getOrbitScaleFactor('earth');
        const smoothTP = THREE.MathUtils.smoothstep(teachingModeProgressRef.current, 0, 1);
        const effectiveOrbitRadius = earthOrbitRadius * THREE.MathUtils.lerp(1.0, teachingOrbitScale, smoothTP);
        // 相机置于地球的轨道斜上方，给出全局俯瞰角度
        pos.copy(earthPos).add(new THREE.Vector3(0, effectiveOrbitRadius * 1.5, effectiveOrbitRadius * 1.8));
        look.copy(earthPos); // 聚焦地球，而非太阳
        break;
      }
      default: {
        pos.set(earthPos.x + 15, 10, earthPos.z + 15);
        look.copy(earthPos);
      }
    }
    return { position: pos, lookAt: look };
  };

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
    saturn_ring: '/textures/8k_saturn_ring_alpha.png',
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
      // 复用模块级 TextureLoader 避免重复实例化开销
      sharedTextureLoader.load(
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



  // 初始化 Three 场景
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.toneMappingExposure = exposure;
    }
    // 动态调整暗部补光：曝光值越高，环境光与半球光也按比例增强，确保背光面细节清晰
    if (ambientLightRef.current) {
      ambientLightRef.current.intensity = 0.15 * exposure;
    }
    if (hemiLightRef.current) {
      hemiLightRef.current.intensity = 0.35 * exposure;
    }
  }, [exposure]);

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
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = exposure;
    
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

    // 4. 环境光 + 核心太阳光源点光源 (直面展示星体暗面与照亮面)
    // 提升基础环境光亮度，使得背光面能看到细节
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    // 半球光提供更柔和的背光面填充（顶部偏蓝，底部偏深色）
    const hemiLight = new THREE.HemisphereLight(0x88bbff, 0x111122, 0.35);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    // 增大光照直照范围至 2500，主光源强度
    // 注意：必须添加到 scene 而不是 sunGroup，因为 sunGroup 会动态缩放，导致点光源的 distance 衰减范围成比例缩小，无法照亮远处的行星
    const sunPointLight = new THREE.PointLight(0xffffff, 3.5, 2500, 0.1);
    sunPointLight.position.set(0, 0, 0);
    sunPointLight.castShadow = true;
    sunPointLight.shadow.mapSize.width = 2048;
    sunPointLight.shadow.mapSize.height = 2048;
    sunPointLight.shadow.camera.near = 0.5;
    sunPointLight.shadow.camera.far = 2500;
    sunPointLight.shadow.bias = -0.0005;
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

    // 7. 渲染太阳 (Sun) — 使用多层 LOD 太阳组
    const sunRadius = getSunRadius();
    const sunTex = getPlanetTexture('sun');
    const sunGroup = buildSunGroup(sunRadius, sunTex);
    scene.add(sunGroup);
    sunMeshRef.current = sunGroup;

    // 8.5 创建二十四节气地球虚影 (Solar Term Ghost Earths)
    const ghostGroup = new THREE.Group();
    ghostGroup.name = 'solar-term-ghosts';
    ghostGroup.visible = false;
    scene.add(ghostGroup);
    solarTermGhostsRef.current = ghostGroup;
    solarTermGhostMeshesRef.current = [];

    const EARTH_ORBIT_RADIUS = 22.0; // Scene units at 1 AU
    const GHOST_RADIUS = 0.28;
    const earthTex = getPlanetTexture('earth');
    const earthObliquityRad = ((CELESTIAL_PHYSICS['earth']?.obliquity || 23.44) * Math.PI) / 180;

    const SEASON_COLORS = [
      // Spring (0-5)
      0x4ade80, 0x4ade80, 0x4ade80, 0x4ade80, 0x4ade80, 0x4ade80,
      // Summer (6-11)
      0xf87171, 0xf87171, 0xf87171, 0xf87171, 0xf87171, 0xf87171,
      // Autumn (12-17)
      0xfbbf24, 0xfbbf24, 0xfbbf24, 0xfbbf24, 0xfbbf24, 0xfbbf24,
      // Winter (18-23)
      0x22d3ee, 0x22d3ee, 0x22d3ee, 0x22d3ee, 0x22d3ee, 0x22d3ee,
    ];

    const e = 0.0167;
    const longPeriRad = (102.937 * Math.PI) / 180;

    SOLAR_TERMS.forEach((term, index) => {
      // eclipticLongitude 是太阳黄经（从地球看太阳的方向），地球实际在相反位置
      const lonRad = ((term.eclipticLongitude + 180) * Math.PI) / 180;
      // 极坐标椭圆方程计算极径 r
      const theta = lonRad - longPeriRad;
      const r = (EARTH_ORBIT_RADIUS * (1 - e * e)) / (1 + e * Math.cos(theta));
      
      const x = r * Math.cos(lonRad);
      const z = r * Math.sin(lonRad);
      const y = 0;

      const ghostColor = new THREE.Color(SEASON_COLORS[index]);
      const ghostColorHex = SEASON_COLORS[index];

      // 每个节气虚影使用独立 Group，包含倾斜（和真实地球一致）
      const ghostWrapper = new THREE.Group();
      ghostWrapper.position.set(x, y, z);
      ghostWrapper.userData = { solarTermIndex: index, isSolarTermGhost: true };
      ghostGroup.add(ghostWrapper);
      solarTermGhostMeshesRef.current.push(ghostWrapper);

      // 倾斜组（与真实地球相同的黄轴倾角）
      const tiltGroup = new THREE.Group();
      tiltGroup.rotation.x = earthObliquityRad;
      ghostWrapper.add(tiltGroup);

      // 主虚影球体：使用地球真实纹理，但透明虚化 + 季节色自发光
      const ghostGeo = new THREE.SphereGeometry(GHOST_RADIUS, 32, 16);
      const ghostMat = new THREE.MeshStandardMaterial({
        map: earthTex,
        bumpMap: earthTex,
        bumpScale: 0.015,
        roughness: 0.55,
        metalness: 0.1,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        emissive: ghostColor,
        emissiveIntensity: 0.35,
        side: THREE.FrontSide,
      });
      const ghostMesh = new THREE.Mesh(ghostGeo, ghostMat);
      ghostMesh.name = `solar-term-ghost-mesh-${index}`;
      tiltGroup.add(ghostMesh);

      // 地球赤道环（红色，与真实地球一致）
      const eqGeo = new THREE.RingGeometry(GHOST_RADIUS * 1.02, GHOST_RADIUS * 1.06, 64);
      eqGeo.rotateX(Math.PI / 2);
      const eqMat = new THREE.MeshBasicMaterial({
        color: 0xff3333,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const eqMesh = new THREE.Mesh(eqGeo, eqMat);
      eqMesh.name = `solar-term-equator-${index}`;
      tiltGroup.add(eqMesh);

      // 外发光光晕（季节色）
      const glowGeo = new THREE.SphereGeometry(GHOST_RADIUS * 1.6, 24, 12);
      const glowMat = new THREE.MeshBasicMaterial({
        color: ghostColorHex,
        transparent: true,
        opacity: 0.08,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
      });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      glowMesh.name = `solar-term-glow-${index}`;
      tiltGroup.add(glowMesh);
    });

    // 8.6 创建月相轨道虚影 (Moon Phase Ghost Moons)
    const moonPhaseGhostGroup = new THREE.Group();
    moonPhaseGhostGroup.name = 'moon-phase-ghosts';
    moonPhaseGhostGroup.visible = false;
    scene.add(moonPhaseGhostGroup);
    moonPhaseGhostsRef.current = moonPhaseGhostGroup;
    moonPhaseGhostMeshesRef.current = [];

    const MOON_PHASE_ORBIT_RADIUS = 2.5; // 月球轨道半径（相对于地球的演示距离）
    const MOON_GHOST_RADIUS = 0.12;
    const moonTex = getPlanetTexture('moon');

    MOON_PHASES.forEach((phase, index) => {
      const angleRad = (phase.angleDeg * Math.PI) / 180;
      const mx = Math.cos(angleRad) * MOON_PHASE_ORBIT_RADIUS;
      const mz = Math.sin(angleRad) * MOON_PHASE_ORBIT_RADIUS;
      const my = 0;

      const ghostWrapper = new THREE.Group();
      ghostWrapper.position.set(mx, my, mz);
      ghostWrapper.userData = { moonPhaseIndex: index, isMoonPhaseGhost: true };
      moonPhaseGhostGroup.add(ghostWrapper);
      moonPhaseGhostMeshesRef.current.push(ghostWrapper);

      // 主虚影球体：月球纹理，透明虚化 + 淡黄色自发光
      const ghostGeo = new THREE.SphereGeometry(MOON_GHOST_RADIUS, 32, 16);
      const ghostMat = new THREE.MeshStandardMaterial({
        map: moonTex,
        bumpMap: moonTex,
        bumpScale: 0.01,
        roughness: 0.6,
        metalness: 0.05,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        emissive: 0xfff8e7,
        emissiveIntensity: 0.25,
        side: THREE.FrontSide,
      });
      const ghostMesh = new THREE.Mesh(ghostGeo, ghostMat);
      ghostMesh.name = `moon-phase-ghost-mesh-${index}`;
      ghostWrapper.add(ghostMesh);

      /* 去掉外圈渲染，不添加 Ring 和 Glow
      // 白色细轨道环
      const ringGeo = new THREE.RingGeometry(MOON_GHOST_RADIUS * 1.05, MOON_GHOST_RADIUS * 1.12, 64);
      ringGeo.rotateX(Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.name = `moon-phase-ring-${index}`;
      ghostWrapper.add(ringMesh);

      // 外发光光晕（淡黄色）
      const glowGeo = new THREE.SphereGeometry(MOON_GHOST_RADIUS * 1.5, 24, 12);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0xfff8e7,
        transparent: true,
        opacity: 0.06,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
      });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      glowMesh.name = `moon-phase-glow-${index}`;
      ghostWrapper.add(glowMesh);
      */
    });

    // 增加太阳的 X-Y-Z 坐标轴展示
    const sunAxes = new THREE.AxesHelper(sunRadius * 2.2);
    sunAxes.name = 'axes-helper';
    sunAxes.visible = showAxesRef.current;
    const sunInnerMesh = sunGroup.userData.sunInnerMesh;
    if (sunInnerMesh) {
      sunInnerMesh.add(sunAxes);
    }

    // 太阳经纬度网格
    const sunLatLonGroup = createLatLonGrid(sunRadius, 12, 6, 'sun', lang);
    sunLatLonGroup.name = 'lat-lon-grid';
    sunLatLonGroup.visible = showLatLonGridRef.current;
    if (sunInnerMesh) {
      sunInnerMesh.add(sunLatLonGroup);
    }

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
      tiltGroup.rotation.x = obliquityRad;
      planetGroup.add(tiltGroup);

      if (config.id === 'earth') {
        const equatorGeo = new THREE.RingGeometry(config.radius * 1.03, config.radius * 1.07, 64);
        equatorGeo.rotateX(Math.PI / 2);
        const equatorMat = new THREE.MeshBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false });
        const earthEquator = new THREE.Mesh(equatorGeo, equatorMat);
        earthEquator.name = 'visual-aid-earth-equator';
        earthEquator.visible = false;
        tiltGroup.add(earthEquator);
        visualAidsRef.current.earthEquator = earthEquator;

        // 1. 黄道方向网格大粗箭头 (沿水平 +X 轴指向右侧)
        const eclArrow = createFatArrow(0xffcc00, config.radius * 3.0, config.radius * 0.012);
        eclArrow.name = 'visual-aid-ecliptic-proj-line';
        eclArrow.visible = false;
        planetGroup.add(eclArrow); // 挂载到公转组（水平不倾斜，指向 +X）
        visualAidsRef.current.eclipticProjLine = eclArrow;

        // 2. 赤道方向网格大粗箭头 (在自转 tiltGroup 中沿本地 +X 轴指向右侧，随赤道面倾斜)
        const equArrow = createFatArrow(0xff3333, config.radius * 3.0, config.radius * 0.012);
        equArrow.name = 'visual-aid-equator-proj-line';
        equArrow.visible = false;
        tiltGroup.add(equArrow); // 挂载到自转倾斜组（绕 Z 轴倾斜，自动成角）
        visualAidsRef.current.equatorProjLine = equArrow;

        // 3. 黄赤交角夹角圆弧线 (在公转组中，从水平 +X 扫向倾斜的 +X 方向)
        const arcPoints: THREE.Vector3[] = [];
        const arcSegments = 32;
        const arcRadius = config.radius * 1.8;
        for (let j = 0; j <= arcSegments; j++) {
          const t = (j / arcSegments) * obliquityRad;
          arcPoints.push(new THREE.Vector3(Math.cos(t) * arcRadius, Math.sin(t) * arcRadius, 0));
        }
        const arcGeo = new THREE.BufferGeometry().setFromPoints(arcPoints);
        const arcMat = new THREE.LineBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0.85 });
        const obliquityArc = new THREE.Line(arcGeo, arcMat);
        obliquityArc.name = 'visual-aid-obliquity-arc';
        obliquityArc.visible = false;
        planetGroup.add(obliquityArc); // 挂载到公转组，不随地球自转自旋
        visualAidsRef.current.obliquityArc = obliquityArc;

        // 4. 初始化六大分色地理纬线（北极圈、北回归线、北京自转线、赤道、南回归线、南极圈）
        const latitudesSetup = [
          { lat: 66.56, colorDay: 0xffdd44, colorNight: 0x555588, name: 'arctic' },
          { lat: 40.0, colorDay: 0xff8833, colorNight: 0x666699, name: 'beijing_track' }, // 橙色代表北京自转圆圈
          { lat: 23.44, colorDay: 0xffdd44, colorNight: 0x555588, name: 'cancer' },
          { lat: 0.0, colorDay: 0xffdd44, colorNight: 0x555588, name: 'equator' },
          { lat: -23.44, colorDay: 0xffdd44, colorNight: 0x555588, name: 'capricorn' },
          { lat: -66.56, colorDay: 0xffdd44, colorNight: 0x555588, name: 'antarctic' }
        ];

        visualAidsRef.current.latitudeLines = [];

        latitudesSetup.forEach(setup => {
          const dayGeo = new THREE.BufferGeometry();
          const dayMat = new THREE.LineBasicMaterial({
            color: setup.colorDay,
            transparent: true,
            opacity: 0.85
          });
          const dayLine = new THREE.Line(dayGeo, dayMat);
          dayLine.name = `visual-aid-latitude-day-${setup.name}`;
          dayLine.visible = false;
          tiltGroup.add(dayLine);

          const nightGeo = new THREE.BufferGeometry();
          const nightMat = new THREE.LineDashedMaterial({
            color: setup.colorNight,
            dashSize: config.radius * 0.05,
            gapSize: config.radius * 0.05,
            transparent: true,
            opacity: 0.5
          });
          const nightLine = new THREE.Line(nightGeo, nightMat);
          nightLine.name = `visual-aid-latitude-night-${setup.name}`;
          nightLine.visible = false;
          tiltGroup.add(nightLine);

          visualAidsRef.current.latitudeLines.push({
            lat: setup.lat,
            name: setup.name,
            dayLine,
            nightLine
          });
        });

        // 6. 黄道 3D 精灵文字标签 (地球两侧，挂在 planetGroup)
        const eclLabelText = lang === 'zh' ? '黄道' : 'Ecliptic';
        const eclLabel = createTextSprite(eclLabelText, '#ffcc00', 32);
        eclLabel.name = 'visual-aid-ecliptic-label';
        eclLabel.visible = false;
        eclLabel.position.set(config.radius * 1.08, 0, 0);
        const aspectEcl = eclLabel.material.map ? (eclLabel.material.map.image as any).width / (eclLabel.material.map.image as any).height : 1.0;
        eclLabel.scale.set(config.radius * 0.25 * aspectEcl, config.radius * 0.25, 1);
        planetGroup.add(eclLabel);
        visualAidsRef.current.eclipticLabel = eclLabel;

        const eclLabelRight = createTextSprite(eclLabelText, '#ffcc00', 32);
        eclLabelRight.name = 'visual-aid-ecliptic-label-right';
        eclLabelRight.visible = false;
        eclLabelRight.position.set(-config.radius * 1.08, 0, 0);
        eclLabelRight.scale.set(config.radius * 0.25 * aspectEcl, config.radius * 0.25, 1);
        planetGroup.add(eclLabelRight);
        visualAidsRef.current.eclipticLabelRight = eclLabelRight;

        // 7. 赤道 3D 精灵文字标签 (挂在 tiltGroup，贴在地球赤道线上)
        const equLabelText = lang === 'zh' ? '赤道' : 'Equator';
        const equLabel = createTextSprite(equLabelText, '#ff5555', 32);
        equLabel.name = 'visual-aid-equator-label';
        equLabel.visible = false;
        equLabel.position.set(config.radius * 1.08, 0, 0);
        const aspectEqu = equLabel.material.map ? (equLabel.material.map.image as any).width / (equLabel.material.map.image as any).height : 1.0;
        equLabel.scale.set(config.radius * 0.25 * aspectEqu, config.radius * 0.25, 1);
        tiltGroup.add(equLabel);
        visualAidsRef.current.equatorLabel = equLabel;

        // 8. 直射纬度 3D 精灵文字标签 (挂在 planetGroup)
        const obqLabel = createTextSprite(lang === 'zh' ? '直射纬度: 0.0°' : 'Solar Declination: 0.0°', '#ffffff', 32);
        obqLabel.name = 'visual-aid-obliquity-label';
        obqLabel.visible = false;
        const aspectObq = obqLabel.material.map ? (obqLabel.material.map.image as any).width / (obqLabel.material.map.image as any).height : 1.0;
        obqLabel.scale.set(config.radius * 0.25 * aspectObq, config.radius * 0.25, 1);
        planetGroup.add(obqLabel);
        visualAidsRef.current.obliquityLabel = obqLabel;
      }

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
        // 使用固定轨道平面采样闭合椭圆，避免升交点进动导致轨道线开口
        const orbitPoints: THREE.Vector3[] = [];
        const samples = 1000;
        const baseDays = TimeEngine.getDaysSinceJ2000(currentTimestamp);
        const moonA = 0.00257;
        const e = 0.0549;
        const iRad = (5.145 * Math.PI) / 180.0;
        const fixedPeriDeg = (318.15 + 0.1114 * baseDays) % 360;
        const fixedNodeDeg = (125.08 - 0.05295 * baseDays) % 360;
        const omega = ((fixedPeriDeg - fixedNodeDeg) * Math.PI) / 180.0;
        const node = (fixedNodeDeg * Math.PI) / 180.0;
        const cosOmega = Math.cos(omega), sinOmega = Math.sin(omega);
        const cosNode = Math.cos(node), sinNode = Math.sin(node);
        const cosI = Math.cos(iRad), sinI = Math.sin(iRad);
        for (let j = 0; j <= samples; j++) {
          const M = (j / samples) * Math.PI * 2;
          let E = M;
          for (let i = 0; i < 5; i++) {
            const delta = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
            E -= delta;
          }
          const trueAnomaly = 2 * Math.atan2(
            Math.sqrt(1 + e) * Math.sin(E / 2),
            Math.sqrt(1 - e) * Math.cos(E / 2)
          );
          const r = moonA * (1 - e * Math.cos(E));
          const xOrbit = r * Math.cos(trueAnomaly);
          const yOrbit = r * Math.sin(trueAnomaly);
          const x1 = cosOmega * xOrbit - sinOmega * yOrbit;
          const y1 = sinOmega * xOrbit + cosOmega * yOrbit;
          const x = cosNode * x1 - sinNode * y1 * cosI;
          const y = sinNode * x1 + cosNode * y1 * cosI;
          const z = y1 * sinI;
          const pos = toThreePos({ x, y, z }, ORBIT_SCALE);
          if (!strictPhysics) {
            const earthStrictRad = ScaleEngine.getStrictRadius('earth');
            const earthObsRad = ScaleEngine.getObservableRadius('earth');
            pos.multiplyScalar(earthObsRad / earthStrictRad);
          }
          orbitPoints.push(pos);
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
        const innerRatio = 1.28;
        const outerRatio = 2.35;
        const ringGeo = new THREE.RingGeometry(config.radius * innerRatio, config.radius * outerRatio, 128);
        ringGeo.rotateX(Math.PI / 2);

        const ringTex = getPlanetTexture('saturn_ring');
        const ringMat = createAdvancedRingMaterial(
          ringTex,
          config.radius * innerRatio,
          config.radius * outerRatio,
          config.radius * 1.035, // Use equatorial radius for accurate shadow length
          new THREE.Color(0xffffff),
          0.85
        );
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.name = 'saturn-ring-mesh';
        // Add userData so that raycaster knows this is part of Saturn's ring system
        ringMesh.userData = { planetId: 'saturn', isRing: true };
        tiltGroup.add(ringMesh); // Added to tiltGroup!
      }

      // 如果是天王星，因 98° 自转倾角垂直放置一条微弱天王星环 (Vertical Rings)
      if (config.id === 'uranus') {
        const innerRatio = 1.5;
        const outerRatio = 2.01;
        const ringGeo = new THREE.RingGeometry(config.radius * innerRatio, config.radius * outerRatio, 128);
        ringGeo.rotateX(Math.PI / 2); // Standard equatorial plane of Uranus
        
        const ringTex = createProceduralRingTexture('uranus');
        const ringMat = createAdvancedRingMaterial(
          ringTex,
          config.radius * innerRatio,
          config.radius * outerRatio,
          config.radius,
          new THREE.Color(0xa5f3fc),
          0.85
        );
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.name = 'uranus-ring-mesh';
        ringMesh.userData = { planetId: 'uranus', isRing: true };
        tiltGroup.add(ringMesh); // Added to tiltGroup!
      }

      // 补充木星光环 (Jupiter Rings)
      if (config.id === 'jupiter') {
        const innerRatio = 1.31;
        const outerRatio = 1.84;
        const ringGeo = new THREE.RingGeometry(config.radius * innerRatio, config.radius * outerRatio, 128);
        ringGeo.rotateX(Math.PI / 2);
        
        const ringTex = createProceduralRingTexture('jupiter');
        const ringMat = createAdvancedRingMaterial(
          ringTex,
          config.radius * innerRatio,
          config.radius * outerRatio,
          config.radius,
          new THREE.Color(0xffdca8),
          0.6
        );
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.name = 'jupiter-ring-mesh';
        ringMesh.userData = { planetId: 'jupiter', isRing: true };
        tiltGroup.add(ringMesh);
      }

      // 补充海王星光环 (Neptune Rings)
      if (config.id === 'neptune') {
        const innerRatio = 1.7;
        const outerRatio = 2.55;
        const ringGeo = new THREE.RingGeometry(config.radius * innerRatio, config.radius * outerRatio, 128);
        ringGeo.rotateX(Math.PI / 2);
        
        const ringTex = createProceduralRingTexture('neptune');
        const ringMat = createAdvancedRingMaterial(
          ringTex,
          config.radius * innerRatio,
          config.radius * outerRatio,
          config.radius,
          new THREE.Color(0x99bbff),
          0.75
        );
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.name = 'neptune-ring-mesh';
        ringMesh.userData = { planetId: 'neptune', isRing: true };
        tiltGroup.add(ringMesh);
      }

      // 绘制公转可见卫星 / 探测器 (Sub-moons and Space Probes)
      const moons = SATELLITE_DATA[config.id] || [];
      moons.forEach(m => {
        const distRatio = (strictPhysics && m.realDistance !== undefined) ? m.realDistance : m.distance;
        const orbitRadius = config.radius * distRatio;

        // 查找真实轨道参数（来自 SATELLITE_CATALOG）
        const realSat = SATELLITE_CATALOG.find(
          s => s.parentId === config.id && s.nameEn.toLowerCase() === m.nameEn.toLowerCase()
        );
        const periodDays = realSat?.periodDays;
        const initialPhaseRad = realSat?.initialPhaseRad ?? (Math.random() * Math.PI * 2);

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
          const sphereGeo = new THREE.SphereGeometry(config.radius * sizeRatio, 64, 32);
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
          periodDays,
          initialPhaseRad,
          angle: initialPhaseRad,
          isProbe: m.isProbe,
          nameZh: m.nameZh,
          nameEn: m.nameEn,
          planetId: config.id,
          isSatellite: true
        };
        tiltGroup.add(moonMesh); // Added to tiltGroup!
      });
    });

    // ═══════════════════════════════════════════════════════════════
    // 天文现象演示辅助视觉效果初始化 (日食/月食 - 物理正确阴影锥)
    // ═══════════════════════════════════════════════════════════════
    // 辅助函数：创建渐变锥体材质
    const createConeGradientMaterial = (innerColor: number, outerColor: number, opacity: number) => {
      return new THREE.ShaderMaterial({
        uniforms: {
          uInnerColor: { value: new THREE.Color(innerColor) },
          uOuterColor: { value: new THREE.Color(outerColor) },
          uOpacity: { value: opacity },
        },
        vertexShader: /* glsl */ `
          varying float vY;
          void main() {
            vY = position.y;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uInnerColor;
          uniform vec3 uOuterColor;
          uniform float uOpacity;
          varying float vY;
          void main() {
            float t = clamp(vY * 0.5 + 0.5, 0.0, 1.0);
            vec3 color = mix(uInnerColor, uOuterColor, t);
            float alpha = uOpacity * (0.5 + 0.5 * (1.0 - t));
            gl_FragColor = vec4(color, alpha);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
    };

    // 1. 旧太阳光束 (保留兼容)
    const beamGeo = new THREE.CylinderGeometry(1, 1, 1, 32, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffbb00,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const sunBeam = new THREE.Mesh(beamGeo, beamMat);
    sunBeam.name = 'visual-aid-sun-beam';
    sunBeam.visible = false;
    scene.add(sunBeam);
    visualAidsRef.current.sunBeam = sunBeam;

    // 1b. 太阳光束 (Sun → Occluder) — 金色发光光束
    const lightBeamGeo = new THREE.CylinderGeometry(1, 1, 1, 32, 1, true);
    const lightBeamMat = new THREE.MeshBasicMaterial({
      color: 0xffdd44,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const sunLightBeam = new THREE.Mesh(lightBeamGeo, lightBeamMat);
    sunLightBeam.name = 'visual-aid-sun-light-beam';
    sunLightBeam.visible = false;
    scene.add(sunLightBeam);
    visualAidsRef.current.sunLightBeam = sunLightBeam;

    // 2. 地球本影锥 (旧版，保留兼容)
    const coneGeo = new THREE.ConeGeometry(1, 1, 32, 1, true);
    const coneMat = new THREE.MeshBasicMaterial({ color: 0x4444cc, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    const earthShadowCone = new THREE.Mesh(coneGeo, coneMat);
    earthShadowCone.name = 'visual-aid-earth-shadow';
    earthShadowCone.visible = false;
    scene.add(earthShadowCone);
    visualAidsRef.current.earthShadowCone = earthShadowCone;

    // 2b. 地球本影锥 (月食) — 深色收敛锥，从地球向外变细
    const earthUmbraGeo = new THREE.ConeGeometry(1, 1, 48, 1, true);
    const earthUmbraMat = createConeGradientMaterial(0x3333cc, 0x6666ff, 0.45);
    const earthUmbraCone = new THREE.Mesh(earthUmbraGeo, earthUmbraMat);
    earthUmbraCone.name = 'visual-aid-earth-umbra';
    earthUmbraCone.visible = false;
    scene.add(earthUmbraCone);
    visualAidsRef.current.earthUmbraCone = earthUmbraCone;

    // 2c. 地球半影锥 (月食) — 浅色发散锥，从地球向外变宽
    const earthPenumbraGeo = new THREE.ConeGeometry(1, 1, 48, 1, true);
    const earthPenumbraMat = createConeGradientMaterial(0x444488, 0x8888ff, 0.3);
    const earthPenumbraCone = new THREE.Mesh(earthPenumbraGeo, earthPenumbraMat);
    earthPenumbraCone.name = 'visual-aid-earth-penumbra';
    earthPenumbraCone.visible = false;
    scene.add(earthPenumbraCone);
    visualAidsRef.current.earthPenumbraCone = earthPenumbraCone;

    // 3. 月球本影锥 (旧版，保留兼容)
    const moonConeGeo = new THREE.ConeGeometry(1, 1, 32, 1, true);
    const moonConeMat = new THREE.MeshBasicMaterial({ color: 0xcc4444, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    const moonShadowCone = new THREE.Mesh(moonConeGeo, moonConeMat);
    moonShadowCone.name = 'visual-aid-moon-shadow';
    moonShadowCone.visible = false;
    scene.add(moonShadowCone);
    visualAidsRef.current.moonShadowCone = moonShadowCone;

    // 3b. 月球本影锥 (日食) — 深色收敛锥，从月球向地球变细
    const moonUmbraGeo = new THREE.ConeGeometry(1, 1, 48, 1, true);
    const moonUmbraMat = createConeGradientMaterial(0xcc3333, 0xff6666, 0.5);
    const moonUmbraCone = new THREE.Mesh(moonUmbraGeo, moonUmbraMat);
    moonUmbraCone.name = 'visual-aid-moon-umbra';
    moonUmbraCone.visible = false;
    scene.add(moonUmbraCone);
    visualAidsRef.current.moonUmbraCone = moonUmbraCone;

    // 3c. 月球半影锥 (日食) — 浅色发散锥，从月球向地球变宽
    const moonPenumbraGeo = new THREE.ConeGeometry(1, 1, 48, 1, true);
    const moonPenumbraMat = createConeGradientMaterial(0x884444, 0xff8888, 0.35);
    const moonPenumbraCone = new THREE.Mesh(moonPenumbraGeo, moonPenumbraMat);
    moonPenumbraCone.name = 'visual-aid-moon-penumbra';
    moonPenumbraCone.visible = false;
    scene.add(moonPenumbraCone);
    visualAidsRef.current.moonPenumbraCone = moonPenumbraCone;

    // 4. 黄道面（使用地球真实椭圆轨道点生成带状几何体，使其粗细与赤道一致）
    const eclipticPoints: THREE.Vector3[] = [];
    const eclipticSamples = 1000;
    for (let j = 0; j <= eclipticSamples; j++) {
      const daysEquivalent = (j / eclipticSamples) * (PLANET_ORBITAL_DATA['earth']?.period || 365.256);
      const pos = OrbitEngine.getHeliocentricPosition('earth', daysEquivalent);
      eclipticPoints.push(toThreePos(pos, 22.0)); // 22.0 为轨道公转比例常数 (ORBIT_SCALE)
    }
    const eclipticGeo = createEllipticalRibbonGeometry(eclipticPoints, 0.025); // 0.025 场景单位宽度，与地球赤道线条粗细一致
    const eclipticMat = new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false });
    const eclipticPlane = new THREE.Mesh(eclipticGeo, eclipticMat);
    eclipticPlane.name = 'visual-aid-ecliptic';
    eclipticPlane.visible = false;
    scene.add(eclipticPlane);
    visualAidsRef.current.eclipticPlane = eclipticPlane;
    // 保存轨道点供动态宽度重建使用
    eclipticPointsRef.current = eclipticPoints;
    eclipticLastWidthRef.current = 0.025;

    // 5. 地球自转轴指示线
    const axisGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0)]);
    const axisMat = new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.6 });
    const earthAxis = new THREE.Line(axisGeo, axisMat);
    earthAxis.name = 'visual-aid-earth-axis';
    earthAxis.visible = false;
    scene.add(earthAxis);
    visualAidsRef.current.earthAxis = earthAxis;

    // 6. 月相演示专用视觉效果：太阳→月球光束、月球→地球光束、地球暗面月相投影
    // 6a. 太阳→月球黄色光束
    const sunToMoonBeamGeo = new THREE.CylinderGeometry(1, 1, 1, 32, 1, true);
    const sunToMoonBeamMat = new THREE.MeshBasicMaterial({
      color: 0xffdd44,
      transparent: true,
      opacity: 0.06,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const sunToMoonBeam = new THREE.Mesh(sunToMoonBeamGeo, sunToMoonBeamMat);
    sunToMoonBeam.name = 'visual-aid-sun-to-moon-beam';
    sunToMoonBeam.visible = false;
    scene.add(sunToMoonBeam);
    visualAidsRef.current.sunToMoonBeam = sunToMoonBeam;

    // 6b. 月球→地球乳白色反射光束 (使用 Shader 裁剪成月相形状)
    const moonToEarthBeamGeo = new THREE.CylinderGeometry(1, 1, 1, 64, 1, true);
    const moonToEarthBeamMat = new THREE.ShaderMaterial({
      uniforms: {
        uPhaseIndex: { value: 0 },
        uColor: { value: new THREE.Color(0xfff8e7) },
        uOpacity: { value: 0.15 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uPhaseIndex;
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec2 vUv;

        void main() {
          // 圆柱的 vUv.x 是环绕角度 (0.0 - 1.0)
          float theta = vUv.x * 3.14159265 * 2.0;
          
          // 我们这里让 x 对应 sin (水平，左右)，y 对应 cos (垂直，上下)
          float x = sin(theta);
          float y = cos(theta);

          float lit = 0.0;
          int phase = int(uPhaseIndex + 0.5);

          if (phase == 0) {
            // 新月：几乎全暗，微弱轮廓
            lit = 0.05;
          } else if (phase == 1) {
            // 峨眉月：右侧小弯月
            float edge = sqrt(1.0 - y * y) * 0.35;
            lit = smoothstep(-edge - 0.1, -edge + 0.1, x) * 0.9 + 0.05;
          } else if (phase == 2) {
            // 上弦月：右半圆亮
            lit = smoothstep(-0.1, 0.1, x) * 0.9 + 0.05;
          } else if (phase == 3) {
            // 盈凸月：右侧大半圆亮
            float edge = sqrt(1.0 - y * y) * 0.65;
            lit = smoothstep(-edge - 0.1, -edge + 0.1, x) * 0.9 + 0.05;
          } else if (phase == 4) {
            // 满月：全圆亮
            lit = 0.95;
          } else if (phase == 5) {
            // 亏凸月：左侧大半圆亮
            float edge = sqrt(1.0 - y * y) * 0.65;
            lit = smoothstep(edge + 0.1, edge - 0.1, x) * 0.9 + 0.05;
          } else if (phase == 6) {
            // 下弦月：左半圆亮
            lit = smoothstep(0.1, -0.1, x) * 0.9 + 0.05;
          } else if (phase == 7) {
            // 残月：左侧小弯月
            float edge = sqrt(1.0 - y * y) * 0.35;
            lit = smoothstep(edge + 0.1, edge - 0.1, x) * 0.9 + 0.05;
          }

          // 如果不亮，直接丢弃该片段，形成月相形状的空心光束
          if (lit < 0.1) discard;

          // 边缘柔和与两端渐隐
          float edgeAlpha = sin(vUv.y * 3.14159265);
          float alpha = lit * edgeAlpha * uOpacity;
          gl_FragColor = vec4(uColor * lit, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const moonToEarthBeam = new THREE.Mesh(moonToEarthBeamGeo, moonToEarthBeamMat);
    moonToEarthBeam.name = 'visual-aid-moon-to-earth-beam';
    moonToEarthBeam.visible = false;
    scene.add(moonToEarthBeam);
    visualAidsRef.current.moonToEarthBeam = moonToEarthBeam;

    // 6c. 地球暗面上的月相投影（使用 ShaderMaterial 根据 uPhaseIndex 绘制月相形状）
    const moonPhaseProjGeo = new THREE.CircleGeometry(1, 64);
    const moonPhaseProjMat = new THREE.ShaderMaterial({
      uniforms: {
        uPhaseIndex: { value: 0 },
        uColor: { value: new THREE.Color(0xfff8e7) },
        uOpacity: { value: 0.35 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uPhaseIndex;
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec2 vUv;

        void main() {
          vec2 center = vec2(0.5, 0.5);
          vec2 p = vUv - center;
          float dist = length(p);
          if (dist > 0.5) discard;

          // Normalize to -1..1
          float x = p.x * 2.0; // right = positive
          float y = p.y * 2.0;

          float lit = 0.0;
          int phase = int(uPhaseIndex + 0.5);

          if (phase == 0) {
            // 新月：几乎全暗，微弱轮廓
            lit = 0.05;
          } else if (phase == 1) {
            // 峨眉月：右侧小弯月
            float edge = sqrt(1.0 - y * y) * 0.35;
            lit = smoothstep(-edge, edge, x) * 0.9 + 0.05;
          } else if (phase == 2) {
            // 上弦月：右半圆亮
            lit = smoothstep(-0.02, 0.02, x) * 0.9 + 0.05;
          } else if (phase == 3) {
            // 盈凸月：右侧大半圆亮
            float edge = sqrt(1.0 - y * y) * 0.65;
            lit = smoothstep(-edge, edge, x) * 0.9 + 0.05;
          } else if (phase == 4) {
            // 满月：全圆亮
            lit = 0.95;
          } else if (phase == 5) {
            // 亏凸月：左侧大半圆亮
            float edge = sqrt(1.0 - y * y) * 0.65;
            lit = smoothstep(edge, -edge, x) * 0.9 + 0.05;
          } else if (phase == 6) {
            // 下弦月：左半圆亮
            lit = smoothstep(0.02, -0.02, x) * 0.9 + 0.05;
          } else if (phase == 7) {
            // 残月：左侧小弯月
            float edge = sqrt(1.0 - y * y) * 0.35;
            lit = smoothstep(edge, -edge, x) * 0.9 + 0.05;
          }

          // Edge softness
          float edgeAlpha = 1.0 - smoothstep(0.45, 0.5, dist);
          float alpha = lit * edgeAlpha * uOpacity;
          gl_FragColor = vec4(uColor * lit, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const moonPhaseProjection = new THREE.Mesh(moonPhaseProjGeo, moonPhaseProjMat);
    moonPhaseProjection.name = 'visual-aid-moon-phase-projection';
    moonPhaseProjection.visible = false;
    scene.add(moonPhaseProjection);
    visualAidsRef.current.moonPhaseProjection = moonPhaseProjection;

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

      // --- 初始入场连续动画 (包含极速跃迁与平滑升格俯瞰，共 6.5 秒) ---
      if (startEntryRef.current && isEnteringRef.current) {
        entryProgressRef.current += delta / 6.5; // 动画总长调整为 6.5 秒，节奏更紧凑
        if (entryProgressRef.current >= 1.0) {
          entryProgressRef.current = 1.0;
          isEnteringRef.current = false;
        }
        
        const p = entryProgressRef.current;
        
        // Z 轴 (距离太阳的平面距离)：全局连续，一气呵成。5次方缓出，前段光速，后段滑行
        const tZ = 1.0 - Math.pow(1.0 - p, 5);
        const startZ = 1939000; // 1.44 ly
        
        // 4.44 AU = 97.68 场景单位
        // 为了获得高空俯视角度 (约65度仰角) 同时保持绝对距离为 4.44 AU:
        // y = 97.68 * sin(65°) ≈ 88.5
        // z = 97.68 * cos(65°) ≈ 41.2
        // sqrt(88.5^2 + 41.2^2) ≈ 97.62 ≈ 4.44 AU
        const endZ = 41.2; 
        const currentZ = THREE.MathUtils.lerp(startZ, endZ, tZ);

        // Y 轴 (高度)：分离控制，下坠与升格无缝衔接
        let currentY;
        const startY = 500000;
        const midY = -15; // 潜入黄道面下方一点点，产生仰视压迫感
        const endY = 88.5; // 升格最终俯视高度
        const splitP = 0.55; // 提前到 55% 进度时到达最低点，提早开始升格动作

        if (p < splitP) {
          const pY = p / splitP;
          // Cosine 缓动：平滑起步，平滑到达谷底，垂直速度在谷底变为0
          // 但此时 Z 轴还在高速前进，形成完美的圆弧形“拉平”动作！
          const ease = (1.0 - Math.cos(pY * Math.PI)) / 2.0; 
          currentY = THREE.MathUtils.lerp(startY, midY, ease);
        } else {
          const pY = (p - splitP) / (1.0 - splitP);
          const ease = (1.0 - Math.cos(pY * Math.PI)) / 2.0;
          currentY = THREE.MathUtils.lerp(midY, endY, ease);
        }

        cameraRef.current.position.set(0, currentY, currentZ);
        controlsRef.current.target.set(0, 0, 0);
        
        // 在入场期间更新控制器并跳过正常的跟随逻辑，防止冲突
        controlsRef.current.update();
        
        // 同步更新 tracking target，防止入场结束后触发防穿模逻辑导致镜头突然倒退
        lastTargetPosRef.current.set(0, 0, 0);
        lastRadOfTargetRef.current = getCurrentPlanetRadius(selectedPlanetIdRef.current || 'sun');
      } else if (!startEntryRef.current && !startEntryAnimation) {
        // 仅当尚未开始入场动画时，停在起点 (1.44 ly) 等待
        cameraRef.current.position.set(0, 500000, 1939000);
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
      }

      // 更新教学模式进度 (平滑过渡)
      const targetTeachingModeProgress = teachingModeRef.current ? 1.0 : 0.0;
      const progressDiff = targetTeachingModeProgress - teachingModeProgressRef.current;
      if (progressDiff !== 0) {
        const transitionSpeed = 1.0; // 1秒完成切换
        teachingModeProgressRef.current += Math.sign(progressDiff) * transitionSpeed * delta;
        if (progressDiff > 0 && teachingModeProgressRef.current > 1) teachingModeProgressRef.current = 1;
        if (progressDiff < 0 && teachingModeProgressRef.current < 0) teachingModeProgressRef.current = 0;
      }
      const rawProgress = teachingModeProgressRef.current;
      const smoothTeachingProgress = THREE.MathUtils.smoothstep(rawProgress, 0, 1);

      const daysSinceJ2000 = TimeEngine.getDaysSinceJ2000(currentTimestampRef.current);

      // 太阳自转更新：带 7.25° 黄赤倾角自旋转
      if (sunMeshRef.current) {
        const sunRotateY = OrbitEngine.getRotationAngle('sun', currentTimestampRef.current);
        const sunInner = sunMeshRef.current.getObjectByName('sun-inner-mesh');
        if (sunInner) {
          sunInner.rotation.y = sunRotateY;
        }
        const sunObliquityRad = (7.25 * Math.PI) / 180;
        sunMeshRef.current.rotation.x = sunObliquityRad;

        // 太阳教学模式缩放
        const realSunRadius = getSunRadius();
        const teachingSunRadius = TeachingModeEngine.getRadius('sun');
        const currentSunRadius = THREE.MathUtils.lerp(realSunRadius, teachingSunRadius, smoothTeachingProgress);
        const sunScale = currentSunRadius / realSunRadius;
        sunMeshRef.current.scale.set(sunScale, sunScale, sunScale);

        // 太阳多层 LOD 效果更新（距离驱动）
        const sunWorldPos = new THREE.Vector3();
        sunMeshRef.current.getWorldPosition(sunWorldPos);
        const distToSun = cameraRef.current.position.distanceTo(sunWorldPos);
        updateSunEffects(sunMeshRef.current as SunGroup, delta, distToSun);
      }

      // 行星公转与自转更新
      planetsConfig.forEach(config => {
        const group = planetMeshesRef.current[config.id];
        if (!group) return;

        // 获取3D轨道物理世界坐标，统一通过 ORBIT_SCALE 转换为场景单位
        let finalPos: THREE.Vector3;
        let originalMoonOrbitRadius = 1;
        let currentMoonOrbitRadius = 1;

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
          
          originalMoonOrbitRadius = moonRelPos.length();
          
          // 教学模式混合：先求出地球混合后的位置
          const earthTeachingPos = TeachingModeEngine.getHeliocentricPosition('earth', earthPos);
          const currentEarthPos = new THREE.Vector3().lerpVectors(earthPos, earthTeachingPos, smoothTeachingProgress);
          
          // 求出月球相对地球的混合位置
          const moonTeachingRelPos = TeachingModeEngine.getRelativePosition('moon', moonRelPos, 'earth');
          const currentMoonRelPos = new THREE.Vector3().lerpVectors(moonRelPos, moonTeachingRelPos, smoothTeachingProgress);
          currentMoonOrbitRadius = currentMoonRelPos.length();

          finalPos = currentEarthPos.add(currentMoonRelPos);
        } else {
          const rawPos = OrbitEngine.getHeliocentricPosition(config.id, daysSinceJ2000);
          const realPos = toThreePos(rawPos, ORBIT_SCALE);
          const teachingPos = TeachingModeEngine.getHeliocentricPosition(config.id, realPos);
          finalPos = new THREE.Vector3().lerpVectors(realPos, teachingPos, smoothTeachingProgress);
        }
        group.position.copy(finalPos);

        // 星体自身组缩放 (含子星和星环)
        const realRadius = config.radius;
        const teachingRadius = TeachingModeEngine.getRadius(config.id);
        const currentRadius = THREE.MathUtils.lerp(realRadius, teachingRadius, smoothTeachingProgress);
        const scale = currentRadius / realRadius;
        group.scale.set(scale, scale, scale);

        // 如果该星体有主轨线，也要一起缩放以匹配教学模式下的圆形距离
        const orbitLine = orbitLinesRef.current[config.id];
        if (orbitLine) {
          if (config.id === 'moon') {
            // 月球轨线在 earthGroup 内部，所以受到 earthScale 的影响
            // 真实世界的缩放比:
            const earthRealRadius = getPlanetRadius('earth');
            const earthTeachingRadius = TeachingModeEngine.getRadius('earth');
            const earthScale = THREE.MathUtils.lerp(earthRealRadius, earthTeachingRadius, smoothTeachingProgress) / earthRealRadius;

            const targetWorldScale = currentMoonOrbitRadius / originalMoonOrbitRadius;
            const localScale = targetWorldScale / earthScale;
            orbitLine.scale.set(localScale, localScale, localScale);
            // 注意：月球轨道线由 getLunarRelativePosition 采样生成，已包含正确的升交点方向，无需额外旋转
          } else {
            const orbitScale = THREE.MathUtils.lerp(1.0, TeachingModeEngine.getOrbitScaleFactor(config.id), smoothTeachingProgress);
            orbitLine.scale.set(orbitScale, orbitScale, orbitScale);
          }
        }

        // 获取太阳的世界坐标
        const sunWorldPos = new THREE.Vector3();
        if (sunMeshRef.current) {
          sunMeshRef.current.getWorldPosition(sunWorldPos);
        }
        const lightDir = new THREE.Vector3().subVectors(sunWorldPos, finalPos).normalize();
        
        const tiltGroup = group.getObjectByName('planet-tilt-root') as THREE.Group;
        if (!tiltGroup) return;

        const localLightDir = lightDir.clone();
        if (tiltGroup.matrixWorld) {
           const invMat = new THREE.Matrix4().copy(tiltGroup.matrixWorld).invert();
           localLightDir.transformDirection(invMat).normalize();
        }

        // 核心考虑自转角度：自转速度和方向由 OrbitEngine 基于历元完美约束
        let rotateY = OrbitEngine.getRotationAngle(config.id, currentTimestampRef.current);

        // 地球使用几何法计算0°经线方向：根据地日连线 + UTC时间
        if (config.id === 'earth') {
          const thetaNoon = Math.atan2(localLightDir.z, localLightDir.x);
          const d = new Date(currentTimestampRef.current);
          const utcHours = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600 + d.getUTCMilliseconds() / 3600000;
          const greenwichHourAngle = (utcHours - 12) * (Math.PI / 12);
          rotateY = thetaNoon + greenwichHourAngle;
        }

        // 更新星环 Shader 的动态 Uniforms 和行星的 localSunDirection
        tiltGroup.children.forEach(ch => {
          if (ch.name.endsWith('-ring-mesh') && ch instanceof THREE.Mesh) {
            if (ch.material instanceof THREE.ShaderMaterial && ch.material.uniforms.uSunDirection) {
              ch.material.uniforms.uSunDirection.value.copy(lightDir);
              ch.material.uniforms.uPlanetCenter.value.copy(finalPos);
              if (ch.material.uniforms.uRotateY) {
                ch.material.uniforms.uRotateY.value = rotateY;
              }
            }
          }
          if (ch.name.startsWith('planet-earth-clouds') && ch instanceof THREE.Mesh) {
            if (ch.material && ch.material.userData?.uniforms?.uLocalSunDirection) {
              const cloudLocalLightDir = lightDir.clone();
              if (ch.matrixWorld) {
                const invMat = new THREE.Matrix4().copy(ch.matrixWorld).invert();
                cloudLocalLightDir.transformDirection(invMat).normalize();
              }
              ch.material.userData.uniforms.uLocalSunDirection.value.copy(cloudLocalLightDir);
            }
          }
          if (ch.name === 'planet-body-root' && ch instanceof THREE.Group) {
             ch.children.forEach(bodyMesh => {
               if (bodyMesh instanceof THREE.Mesh && bodyMesh.material) {
                 if (bodyMesh.material.userData?.uniforms?.uLocalSunDirection) {
                   const bodyLocalLightDir = lightDir.clone();
                   if (bodyMesh.matrixWorld) {
                     const invMat = new THREE.Matrix4().copy(bodyMesh.matrixWorld).invert();
                     bodyLocalLightDir.transformDirection(invMat).normalize();
                   }
                   bodyMesh.material.userData.uniforms.uLocalSunDirection.value.copy(bodyLocalLightDir);
                 }
               }
            });
          }
        });

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
          
          injectPlanetShader(mat, config.id, r);

          const mesh = new THREE.Mesh(geom, mat);
          mesh.name = 'planet-body-mesh';
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          bodyGroup.add(mesh);

          if (config.id === 'earth') {
            if (nightTex) {
              const nightGeo = new THREE.SphereGeometry(r * 1.005, 64, 32);
              const nightMat = createNightLightsMaterial(nightTex);
              const nightMesh = new THREE.Mesh(nightGeo, nightMat);
              nightMesh.name = 'planet-earth-night-lights';
              bodyGroup.add(nightMesh);
            }
            // 地球赤道环（红色，用于黄赤交角可视化）
            const eqGeo = new THREE.RingGeometry(r * 1.03, r * 1.07, 64);
            eqGeo.rotateX(Math.PI / 2);
            const eqMat = new THREE.MeshBasicMaterial({
              color: 0xff3333,
              transparent: true,
              opacity: 0.7,
              side: THREE.DoubleSide,
              depthWrite: false,
            });
            const eqMesh = new THREE.Mesh(eqGeo, eqMat);
            eqMesh.name = 'planet-earth-equator-ring';
            bodyGroup.add(eqMesh);

            // 北京观测点 marker (小球) 与 3D 空间标签
            const beijingLat = (40.0 * Math.PI) / 180;
            const beijingLon = (116.4 * Math.PI) / 180; // 116.4 degrees East
            
            const bX = r * Math.cos(beijingLat) * Math.sin(beijingLon);
            const bY = r * Math.sin(beijingLat);
            const bZ = r * Math.cos(beijingLat) * Math.cos(beijingLon);

            const markerGeo = new THREE.SphereGeometry(r * 0.04, 16, 16);
            const markerMat = new THREE.MeshBasicMaterial({ color: 0xff3333, depthTest: true });
            const beijingMarker = new THREE.Mesh(markerGeo, markerMat);
            beijingMarker.name = 'beijing-observer-marker';
            beijingMarker.position.set(bX, bY, bZ);
            beijingMarker.visible = false;
            bodyGroup.add(beijingMarker);
            visualAidsRef.current.beijingMarker = beijingMarker;

            const bLabelText = lang === 'zh' ? '北京 (40°N)' : 'Beijing (40°N)';
            const beijingLabel = createTextSprite(bLabelText, '#ff3333', 24);
            beijingLabel.name = 'beijing-observer-label';
            beijingLabel.position.set(bX * 1.08, bY * 1.08, bZ * 1.08);
            beijingLabel.visible = false;
            
            const aspectB = beijingLabel.material.map ? (beijingLabel.material.map.image as any).width / (beijingLabel.material.map.image as any).height : 1.0;
            beijingLabel.scale.set(r * 0.18 * aspectB, r * 0.18, 1);
            bodyGroup.add(beijingLabel);
            visualAidsRef.current.beijingLabel = beijingLabel;
          }

          const axes = new THREE.AxesHelper(r * 2.2);
          axes.name = 'axes-helper';
          axes.visible = showAxesRef.current;
          bodyGroup.add(axes);

          // 经纬度网格
          const latLonGroup = createLatLonGrid(r, config.id === 'earth' ? 24 : 12, config.id === 'earth' ? 12 : 6, config.id, lang);
          latLonGroup.name = 'lat-lon-grid';
          latLonGroup.visible = showLatLonGridRef.current;
          bodyGroup.add(latLonGroup);

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
            injectPlanetShader(cloudMat1, config.id, r * 1.01);
            const cloudMesh1 = new THREE.Mesh(cloudGeo1, cloudMat1);
            cloudMesh1.name = 'planet-earth-clouds-1';
            cloudMesh1.castShadow = true;
            cloudMesh1.receiveShadow = true;
            tiltGroup.add(cloudMesh1);

            const cloudGeo2 = new THREE.SphereGeometry(r * 1.015, 64, 32);
            const cloudMat2 = createEarthCloudMaterial(cloudTex, 0.25);
            injectPlanetShader(cloudMat2, config.id, r * 1.015);
            const cloudMesh2 = new THREE.Mesh(cloudGeo2, cloudMat2);
            cloudMesh2.name = 'planet-earth-clouds-2';
            cloudMesh2.castShadow = true;
            cloudMesh2.receiveShadow = true;
            tiltGroup.add(cloudMesh2);
          }
        }

        const bodyRoot = tiltGroup.getObjectByName('planet-body-root');
        if (bodyRoot) {
          let currentRotateY = rotateY;
          if (config.id === 'earth' && demoCameraRef.current.active && demoCameraRef.current.phenomenon === 'solar-terms') {
            if (isRotationSimActiveRef.current) {
              // 快速自转：一圈大约耗时 12 秒 (每秒自转 30 度)
              const rotationSpeed = Math.PI / 6;
              solarTermsSelfRotationOffsetRef.current += delta * rotationSpeed;
            }
            currentRotateY += solarTermsSelfRotationOffsetRef.current;
          }
          bodyRoot.rotation.y = currentRotateY;

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
                if (ch.material instanceof THREE.ShaderMaterial && ch.material.uniforms.uHovered) {
                  ch.material.uniforms.uHovered.value = isHoveredRing ? 1.0 : 0.0;
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
              let angle: number;
              if (ud.periodDays) {
                // 使用真实轨道周期计算公转角速度
                const omega = (2 * Math.PI) / ud.periodDays;
                angle = ud.initialPhaseRad + (daysSinceJ2000 * omega);
              } else {
                // 回退到旧的视觉速度（仅当找不到真实参数时）
                const orbitSpeed = ud.speed * 0.15;
                angle = ud.angle + (daysSinceJ2000 * orbitSpeed);
              }

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

          const packGeom = new THREE.SphereGeometry(packRad, 64, 32);
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



      // -------------------------------------------------------------
      // 计算八大行星的名称标签屏幕投影位置
      // -------------------------------------------------------------
      const newPlanetLabels: Record<string, { x: number; y: number; visible: boolean; opacity: number; nameZh: string; nameEn: string }> = {};
      const majorPlanets = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
      
      if (showPlanetLabels) {
        majorPlanets.forEach(id => {
          const group = planetMeshesRef.current[id];
          if (group) {
            const worldPos = new THREE.Vector3();
            group.getWorldPosition(worldPos);
            
            const radius = ScaleEngine.getRadius(id, strictPhysicsRef.current);
            const distToPlanet = cameraRef.current!.position.distanceTo(worldPos);
            
            // 物理世界球体正上方的边缘点坐标（用于遮挡检测的起点）
            const topWorldPos = worldPos.clone();
            topWorldPos.y += radius;
            
            const tempVec = new THREE.Vector3().subVectors(topWorldPos, cameraRef.current!.position);
            const isBehindCam = tempVec.dot(camDirection) <= 0;
            
            // 执行真实的 3D 物理射线检测，判断标签是否被其他星体（例如前面的大星体或当前星球自身倾斜阻挡）遮挡
            let isOccluded = false;
            if (!isBehindCam) {
              const raycaster = new THREE.Raycaster();
              raycaster.set(cameraRef.current!.position, tempVec.clone().normalize());
              
              // 收集所有参与遮挡的实体（排除目标行星自身，避免自遮挡导致标签被错误隐藏）
              const occluders: THREE.Object3D[] = [];
              Object.values(planetMeshesRef.current).forEach((g: any) => {
                if (g && g.visible && g !== group) {
                  g.traverse(node => {
                    if (node instanceof THREE.Mesh && !node.name.includes('orbit') && !node.name.includes('ring')) {
                      occluders.push(node);
                    }
                  });
                }
              });
              if (sunMeshRef.current) {
                sunMeshRef.current.traverse(node => {
                  if (node instanceof THREE.Mesh) occluders.push(node);
                });
              }
              
              const intersects = raycaster.intersectObjects(occluders, false);
              if (intersects.length > 0) {
                // 允许一定的穿模误差，若交点距离显著小于标签位置，则认为被遮挡
                if (intersects[0].distance < tempVec.length() - radius * 0.5) {
                  isOccluded = true;
                }
              }
            }
            
            // 在 3D 空间中稍微偏上一点 (物理世界 y 轴)
            worldPos.y += radius * 1.1;
            
            // 投影到屏幕
            const proj = worldPos.clone().project(cameraRef.current!);
            
            // 估算在屏幕上的半径偏移，保证文字始终不会被星球本体遮挡
            // 利用相机的 fov 计算物理尺寸对应的屏幕像素大小
            const fovRad = (cameraRef.current!.fov * Math.PI) / 180;
            const screenRadius = (radius / (distToPlanet * Math.tan(fovRad / 2))) * (curHeight / 2);
            
            const px = (proj.x * 0.5 + 0.5) * curWidth;
            const py = (-(proj.y * 0.5) + 0.5) * curHeight - screenRadius * 0.2; // 调整向上的偏移，离星体更近
            
            // 距离非常近时隐藏（例如相机距离小于 4.0 倍半径开始变淡，小于 2.0 倍完全消失）
            let labelOpacity = 1.0;
            if (distToPlanet < radius * 4.0) {
              labelOpacity *= Math.max(0, (distToPlanet - radius * 2.0) / (radius * 2.0));
            }
            
            // 视野拉出太阳系时隐藏行星名称 (相机到太阳距离大于 40 AU 开始变淡，> 50 AU 完全消失)
            const distAU = distToSun / 22.0;
            if (distAU > 40.0) {
              labelOpacity *= Math.max(0, 1.0 - (distAU - 40.0) / 10.0);
            }
            
            if (!isBehindCam && !isOccluded && proj.z <= 1 && labelOpacity > 0.01) {
              newPlanetLabels[id] = {
                x: px,
                y: py,
                visible: true,
                opacity: labelOpacity,
                nameZh: (translations['zh'] as any)[`${id}_name`] || id,
                nameEn: (translations['en'] as any)[`${id}_name`] || id
              };
            }
          }
        });
      }
      setPlanetLabels(newPlanetLabels);

      // ═══════════════════════════════════════════════════════════════
      // 计算二十四节气虚影名称标签屏幕投影位置
      // ═══════════════════════════════════════════════════════════════
      const newSolarTermLabels: Record<number, { x: number; y: number; visible: boolean; opacity: number; nameZh: string; nameEn: string }> = {};
      const isSolarTermsDemo = demoStateRef.current?.activePhenomenon === 'solar-terms';
      if (isSolarTermsDemo && solarTermGhostsRef.current?.visible) {
        solarTermGhostMeshesRef.current.forEach((group, idx) => {
          if (!group.visible) return;
          const worldPos = new THREE.Vector3();
          group.getWorldPosition(worldPos);

          const tempVec = new THREE.Vector3().subVectors(worldPos, cameraRef.current!.position);
          const isBehindCam = tempVec.dot(camDirection) <= 0;

          // 射线遮挡检测
          let isOccluded = false;
          if (!isBehindCam) {
            const raycaster = new THREE.Raycaster();
            raycaster.set(cameraRef.current!.position, tempVec.clone().normalize());
            const occluders: THREE.Object3D[] = [];
            Object.values(planetMeshesRef.current).forEach((g: any) => {
              if (g && g.visible) {
                g.traverse((node: any) => {
                  if (node instanceof THREE.Mesh && !node.name.includes('orbit') && !node.name.includes('ring')) {
                    occluders.push(node);
                  }
                });
              }
            });
            if (sunMeshRef.current) {
              sunMeshRef.current.traverse(node => {
                if (node instanceof THREE.Mesh) occluders.push(node);
              });
            }
            const intersects = raycaster.intersectObjects(occluders, false);
            if (intersects.length > 0) {
              if (intersects[0].distance < tempVec.length() - 0.1) {
                isOccluded = true;
              }
            }
          }

          // 标签位置：虚影正上方（偏移量随虚影缩放动态调整）
          const ghostLabelEarthInitRadius = TeachingModeEngine.getRadius('earth');
          const ghostLabelEarthCurrentRadius = getCurrentPlanetRadius('earth');
          const ghostLabelBodyScale = ghostLabelEarthCurrentRadius / ghostLabelEarthInitRadius;
          worldPos.y += 0.45 * ghostLabelBodyScale;
          const proj = worldPos.clone().project(cameraRef.current!);
          const px = (proj.x * 0.5 + 0.5) * curWidth;
          const py = (-(proj.y * 0.5) + 0.5) * curHeight;

          const distToGhost = cameraRef.current!.position.distanceTo(worldPos);
          let labelOpacity = 1.0;
          if (distToGhost < 2.0) {
            labelOpacity = Math.max(0, (distToGhost - 0.5) / 1.5);
          }

          if (!isBehindCam && !isOccluded && proj.z <= 1 && labelOpacity > 0.01) {
            const term = SOLAR_TERMS[idx];
            newSolarTermLabels[idx] = {
              x: px,
              y: py,
              visible: true,
              opacity: labelOpacity,
              nameZh: term?.nameZh || '',
              nameEn: term?.nameEn || '',
            };
          }
        });
      }
      setSolarTermLabels(newSolarTermLabels);

      // ═══════════════════════════════════════════════════════════════
      // 计算月相虚影名称标签屏幕投影位置
      // ═══════════════════════════════════════════════════════════════
      const newMoonPhaseLabels: Record<number, { x: number; y: number; visible: boolean; opacity: number; name: string; icon: string }> = {};
      const isMoonPhaseDemo = demoStateRef.current?.activePhenomenon === 'moon-phases';
      if (isMoonPhaseDemo && moonPhaseGhostsRef.current?.visible) {
        moonPhaseGhostMeshesRef.current.forEach((group, idx) => {
          if (!group.visible) return;
          const worldPos = new THREE.Vector3();
          group.getWorldPosition(worldPos);

          const tempVec = new THREE.Vector3().subVectors(worldPos, cameraRef.current!.position);
          const isBehindCam = tempVec.dot(camDirection) <= 0;

          // 射线遮挡检测
          let isOccluded = false;
          if (!isBehindCam) {
            const raycaster = new THREE.Raycaster();
            raycaster.set(cameraRef.current!.position, tempVec.clone().normalize());
            const occluders: THREE.Object3D[] = [];
            Object.values(planetMeshesRef.current).forEach((g: any) => {
              if (g && g.visible) {
                g.traverse((node: any) => {
                  if (node instanceof THREE.Mesh && !node.name.includes('orbit') && !node.name.includes('ring')) {
                    occluders.push(node);
                  }
                });
              }
            });
            if (sunMeshRef.current) {
              sunMeshRef.current.traverse(node => {
                if (node instanceof THREE.Mesh) occluders.push(node);
              });
            }
            const intersects = raycaster.intersectObjects(occluders, false);
            if (intersects.length > 0) {
              if (intersects[0].distance < tempVec.length() - 0.1) {
                isOccluded = true;
              }
            }
          }

          // 标签位置：虚影正上方
          worldPos.y += 0.35;
          const proj = worldPos.clone().project(cameraRef.current!);
          const px = (proj.x * 0.5 + 0.5) * curWidth;
          const py = (-(proj.y * 0.5) + 0.5) * curHeight;

          const distToGhost = cameraRef.current!.position.distanceTo(worldPos);
          let labelOpacity = 1.0;
          if (distToGhost < 2.0) {
            labelOpacity = Math.max(0, (distToGhost - 0.5) / 1.5);
          }

          if (!isBehindCam && !isOccluded && proj.z <= 1 && labelOpacity > 0.01) {
            const phase = MOON_PHASES[idx];
            newMoonPhaseLabels[idx] = {
              x: px,
              y: py,
              visible: true,
              opacity: labelOpacity,
              name: lang === 'zh' ? (translations[lang][phase.nameKey as keyof typeof translations['zh']] as string || phase.nameKey) : phase.nameKey,
              icon: phase.icon,
            };
          }
        });
      }
      setMoonPhaseLabels(newMoonPhaseLabels);

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

      // 10. 天文现象演示相机控制（覆盖默认的星体跟随逻辑）
      const demoCam = demoCameraRef.current;
      if (!isEnteringRef.current && startEntryRef.current && demoCam.active && demoCam.phenomenon) {
        // 获取 Earth 和 Moon 的当前世界位置
        const earthGroup = planetMeshesRef.current['earth'];
        const moonGroup = planetMeshesRef.current['moon'];
        const earthPos = new THREE.Vector3();
        const moonPos = new THREE.Vector3();
        if (earthGroup) earthGroup.getWorldPosition(earthPos);
        if (moonGroup) moonGroup.getWorldPosition(moonPos);

        const targets = computeDemoCameraTargets(demoCam.phenomenon, demoCam.phase, earthPos, moonPos);

        // 更新过渡进度
        if (demoCam.transitionProgress < 1) {
          demoCam.transitionProgress += delta / demoCam.transitionSpeed;
          if (demoCam.transitionProgress > 1) demoCam.transitionProgress = 1;
        }
        const t = THREE.MathUtils.smoothstep(demoCam.transitionProgress, 0, 1);

        // 插值相机位置（仅在过渡期间覆盖）
        if (demoCam.transitionProgress < 1) {
          cameraRef.current.position.lerp(targets.position, t * 0.15);
        }
        // 始终平滑更新 controls.target，确保缩放中心跟随演示目标
        controlsRef.current.target.lerp(targets.lookAt, 0.08);
        controlsRef.current.update();

        // 演示模式下取消缩放限制，允许完全自由观察
        controlsRef.current.minDistance = 0.0001;
        controlsRef.current.maxDistance = 2000000;

        // 动态调节近剪切面：基于相机到目标点的距离自适应，防止真实尺度下近距离观察时被 NearPlane 裁剪
        const camDistToTarget = cameraRef.current.position.distanceTo(controlsRef.current.target);
        const dynamicNear = Math.max(0.000001, camDistToTarget * 0.001);
        if (Math.abs(cameraRef.current.near - dynamicNear) / dynamicNear > 0.1) {
          cameraRef.current.near = dynamicNear;
          cameraRef.current.updateProjectionMatrix();
        }
        // ═══════════════════════════════════════════════════════════════
        // 天文现象演示辅助视觉效果更新
        // ═══════════════════════════════════════════════════════════════
        const aids = visualAidsRef.current;
        const isEclipseDemo = demoCam.phenomenon === 'eclipses';
        const isMoonPhaseDemo = demoCam.phenomenon === 'moon-phases';
        const isSolarTermsDemo = demoCam.phenomenon === 'solar-terms';
        const showAids = isEclipseDemo || isMoonPhaseDemo || isSolarTermsDemo;

        if (aids.sunBeam) {
          // 太阳→地球光束仅在日食和节气演示显示，不在月相演示显示
          aids.sunBeam.visible = isEclipseDemo || isSolarTermsDemo;
          if ((isEclipseDemo || isSolarTermsDemo) && earthGroup) {
            const earthRad = getCurrentPlanetRadius('earth');
            aids.sunBeam.position.copy(earthPos).multiplyScalar(0.5);
            aids.sunBeam.lookAt(earthPos);
            aids.sunBeam.rotateX(Math.PI / 2);
            aids.sunBeam.scale.set(earthRad, earthPos.length(), earthRad);
          }
        }

        // 同步月相虚影位置：使用真实的物理计算引擎确保虚影与月球轨道完全重合
        if (isMoonPhaseDemo && moonPhaseGhostsRef.current && earthPos && moonPos) {
          const baseTime = getCurrentCycleNewMoon(currentTimestampRef.current);
          const smoothTeachingProgress = THREE.MathUtils.smoothstep(teachingModeProgressRef.current, 0, 1);
          
          moonPhaseGhostMeshesRef.current.forEach((group, idx) => {
            const phaseTime = getExactMoonPhaseTime(baseTime, idx);
            const daysSinceJ2000 = TimeEngine.getDaysSinceJ2000(phaseTime);
            
            // 使用与渲染月球完全相同的计算管线，确保在空间中100%重合
            const moonRelPosRaw = OrbitEngine.getLunarRelativePosition(daysSinceJ2000);
            const moonRelPos = toThreePos(moonRelPosRaw, 22.0); // 统一坐标管道：真实 AU → 场景单位

            if (!strictPhysicsRef.current) {
              const earthStrictRad = ScaleEngine.getStrictRadius('earth');
              const earthObsRad = ScaleEngine.getObservableRadius('earth');
              const scaleFactor = earthObsRad / earthStrictRad;
              moonRelPos.multiplyScalar(scaleFactor);
            }
            
            const moonTeachingRelPos = TeachingModeEngine.getRelativePosition('moon', moonRelPos, 'earth');
            const currentMoonRelPos = new THREE.Vector3().lerpVectors(moonRelPos, moonTeachingRelPos, smoothTeachingProgress);

            group.position.set(
              earthPos.x + currentMoonRelPos.x,
              earthPos.y + currentMoonRelPos.y,
              earthPos.z + currentMoonRelPos.z
            );
          });
        }

        // 月相演示专用视觉效果：太阳→月球光束、月球→地球光束、地球暗面月相投影
        if (aids.sunToMoonBeam) {
          aids.sunToMoonBeam.visible = isMoonPhaseDemo;
          if (isMoonPhaseDemo && moonPos) {
            const sunPos = new THREE.Vector3(0, 0, 0);
            const moonRad = getCurrentPlanetRadius('moon');
            const beamDir = new THREE.Vector3().subVectors(moonPos, sunPos).normalize();
            const totalDist = sunPos.distanceTo(moonPos);
            // 光束从太阳表面到月球表面，不穿过天体
            const beamLen = totalDist - moonRad;
            const beamCenter = sunPos.clone().add(beamDir.clone().multiplyScalar(moonRad + beamLen * 0.5));
            const beamRadius = moonRad * 0.5;
            aids.sunToMoonBeam.position.copy(beamCenter);
            aids.sunToMoonBeam.lookAt(moonPos);
            aids.sunToMoonBeam.rotateX(Math.PI / 2);
            aids.sunToMoonBeam.scale.set(beamRadius, beamLen, beamRadius);
          }
        }

        if (aids.moonToEarthBeam) {
          aids.moonToEarthBeam.visible = isMoonPhaseDemo;
          if (isMoonPhaseDemo && moonPos && earthPos) {
            const sunPos = new THREE.Vector3(0, 0, 0);
            const moonRad = getCurrentPlanetRadius('moon');
            const earthRad = getCurrentPlanetRadius('earth');
            
            // Vector from Moon to Earth
            const V_me = new THREE.Vector3().subVectors(earthPos, moonPos);
            const dist = V_me.length();
            const dir_me = V_me.clone().normalize();
            
            // Vector from Moon to Sun
            const V_ms = new THREE.Vector3().subVectors(sunPos, moonPos).normalize();
            
            // Position the beam between Moon surface and Earth surface
            const beamLen = dist - moonRad - earthRad;
            const beamCenter = moonPos.clone().add(dir_me.clone().multiplyScalar(moonRad + beamLen * 0.5));
            const beamRadius = moonRad * 0.6; // slightly larger than Moon radius to look like emission
            
            aids.moonToEarthBeam.position.copy(beamCenter);
            aids.moonToEarthBeam.scale.set(beamRadius, beamLen, beamRadius);
            
            // Align local Y-axis with dir_me, and local X-axis with the projection of V_ms
            const yAxis = dir_me;
            // project V_ms onto plane perpendicular to yAxis
            const xAxis = V_ms.clone().sub(yAxis.clone().multiplyScalar(V_ms.dot(yAxis))).normalize();
            if (xAxis.lengthSq() < 0.001) {
              // fallback if collinear
              xAxis.set(1, 0, 0).cross(yAxis).normalize();
            }
            const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize();
            
            const basisMatrix = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
            aids.moonToEarthBeam.rotation.setFromRotationMatrix(basisMatrix);
            
            // Update phase index in material
            if (aids.moonToEarthBeam.material instanceof THREE.ShaderMaterial) {
              const currentPhase = demoCam.phase % 8;
              aids.moonToEarthBeam.material.uniforms.uPhaseIndex.value = currentPhase;
            }
          }
        }

        if (aids.moonPhaseProjection) {
          aids.moonPhaseProjection.visible = isMoonPhaseDemo;
          if (isMoonPhaseDemo && earthPos) {
            const sunPos = new THREE.Vector3(0, 0, 0);
            const earthRad = getCurrentPlanetRadius('earth');
            // 放置在地球背向太阳的一侧表面
            const toSunDir = new THREE.Vector3().subVectors(sunPos, earthPos).normalize();
            const projPos = earthPos.clone().add(toSunDir.negate().multiplyScalar(earthRad * 1.02));
            aids.moonPhaseProjection.position.copy(projPos);
            // 投影面法线指向地球外侧（背向太阳），与地面相切
            const outwardDir = toSunDir.clone().negate();
            aids.moonPhaseProjection.lookAt(earthPos.clone().add(outwardDir));
            // 缩放为地球表面投影大小
            const projScale = earthRad * 0.35;
            aids.moonPhaseProjection.scale.set(projScale, projScale, projScale);
            // 更新 shader uniform
            const currentPhase = demoCam.phase % 8;
            if (aids.moonPhaseProjection.material instanceof THREE.ShaderMaterial) {
              aids.moonPhaseProjection.material.uniforms.uPhaseIndex.value = currentPhase;
            }
          }
        }

        if (aids.eclipticPlane) {
          aids.eclipticPlane.visible = isSolarTermsDemo;
          if (isSolarTermsDemo) {
            const earthOrbitScale = THREE.MathUtils.lerp(1.0, TeachingModeEngine.getOrbitScaleFactor('earth'), smoothTeachingProgress);
            aids.eclipticPlane.scale.set(earthOrbitScale, earthOrbitScale, earthOrbitScale);

            // 动态重建黄道带宽几何：使宽度与地球当前半径等比缩放
            // 教学模式下地球半径 ≈ 0.45（TeachingModeEngine），黄道宽度基准 0.025
            // 真实尺度下地球半径缩小 ~480x，黄道宽度也应同比缩小
            const earthInitRadius = TeachingModeEngine.getRadius('earth');
            const earthCurrentRadius = getCurrentPlanetRadius('earth');
            const ghostBodyScale = earthCurrentRadius / earthInitRadius;
            const targetEclipticWidth = 0.025 * ghostBodyScale;

            // 仅当宽度变化超过 5% 时才重建几何（避免每帧重建）
            if (
              eclipticPointsRef.current.length > 0 &&
              Math.abs(targetEclipticWidth - eclipticLastWidthRef.current) / eclipticLastWidthRef.current > 0.05
            ) {
              const newGeo = createEllipticalRibbonGeometry(eclipticPointsRef.current, targetEclipticWidth);
              aids.eclipticPlane.geometry.dispose();
              aids.eclipticPlane.geometry = newGeo;
              eclipticLastWidthRef.current = targetEclipticWidth;
            }

            // 同步缩放二十四节气虚影组，使其在轨道放大或缩小模式下也能完美落轨
            if (solarTermGhostsRef.current) {
              solarTermGhostsRef.current.scale.set(earthOrbitScale, earthOrbitScale, earthOrbitScale);

              // 同步缩放每个虚影球体的尺寸，使其与真实地球的当前半径保持一致
              // 真实地球的缩放比 = currentRadius / initRadius，虚影球体初始半径与教学模式地球一致
              solarTermGhostMeshesRef.current.forEach((wrapper) => {
                wrapper.scale.set(ghostBodyScale, ghostBodyScale, ghostBodyScale);
              });
            }
          }
        }

        if (aids.earthAxis) {
          aids.earthAxis.visible = isSolarTermsDemo;
          if (isSolarTermsDemo && earthGroup) {
            const earthTilt = ((CELESTIAL_PHYSICS['earth']?.obliquity || 23.44) * Math.PI) / 180;
            const r = Math.max(getCurrentPlanetRadius('earth') * 4, 1.5);
            const axisDir = new THREE.Vector3(0, Math.cos(earthTilt), Math.sin(earthTilt)).normalize();
            const positions = (aids.earthAxis.geometry as THREE.BufferGeometry).attributes.position.array as Float32Array;
            positions[0] = earthPos.x - axisDir.x * r;
            positions[1] = earthPos.y - axisDir.y * r;
            positions[2] = earthPos.z - axisDir.z * r;
            positions[3] = earthPos.x + axisDir.x * r;
            positions[4] = earthPos.y + axisDir.y * r;
            positions[5] = earthPos.z + axisDir.z * r;
            (aids.earthAxis.geometry as THREE.BufferGeometry).attributes.position.needsUpdate = true;
          }
        }

        // 真实地球赤道环：在 solar-terms 演示时高亮显示
        const earthBodyGroup = earthGroup ? earthGroup.getObjectByName('planet-body-root') : null;
        if (earthBodyGroup) {
          const eqRing = earthBodyGroup.getObjectByName('planet-earth-equator-ring') as THREE.Mesh;
          if (eqRing) {
            eqRing.visible = isSolarTermsDemo;
            if (eqRing.material instanceof THREE.MeshBasicMaterial) {
              eqRing.material.opacity = THREE.MathUtils.lerp(eqRing.material.opacity, isSolarTermsDemo ? 0.75 : 0, 0.1);
            }
          }
        }

        // 动态赤道环（跟随地球的独立 Mesh，已挂载至地球 tiltGroup，自动对齐与缩放，无需手动更新位置与旋转）
        if (aids.earthEquator) {
          aids.earthEquator.visible = isSolarTermsDemo;
        }

        // 黄赤交角标注辅助线及弧线更新（展示指向太阳方向的黄道线、赤道投影线及交角弧线）
        const showObliquityAids = isSolarTermsDemo;
        if (aids.eclipticProjLine) aids.eclipticProjLine.visible = showObliquityAids;
        if (aids.equatorProjLine) aids.equatorProjLine.visible = showObliquityAids;
        if (aids.obliquityArc) aids.obliquityArc.visible = showObliquityAids;

        let displayObliquityAngle = 0;

        if (showObliquityAids && earthGroup) {
          const earthRad = getCurrentPlanetRadius('earth');
          const earthTilt = ((CELESTIAL_PHYSICS['earth']?.obliquity || 23.44) * Math.PI) / 180;
          
          // 指向太阳的方向向量 (世界坐标系)
          const toSunWorld = earthPos.clone().normalize().negate();
          if (toSunWorld.lengthSq() < 0.0001) toSunWorld.set(1, 0, 0);

          // 1. 更新黄道方向大粗箭头 (在地球公转组的本地空间中，黄道面为水平 X-Z 面)
          const eclDirLocal = new THREE.Vector3(toSunWorld.x, 0, toSunWorld.z).normalize();
          if (aids.eclipticProjLine) {
            const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), eclDirLocal);
            aids.eclipticProjLine.quaternion.copy(q);
          }

          // 2. 更新赤道方向大粗箭头 (在 tiltGroup 空间中，赤道面为本地 X-Z 面)
          const tiltGroup = earthGroup.getObjectByName('planet-tilt-root') as THREE.Group;
          if (tiltGroup) {
            const toSunTiltLocal = toSunWorld.clone().applyQuaternion(tiltGroup.quaternion.clone().invert());
            const equDirTiltLocal = new THREE.Vector3(toSunTiltLocal.x, 0, toSunTiltLocal.z).normalize();
            
            if (aids.equatorProjLine) {
              const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), equDirTiltLocal);
              aids.equatorProjLine.quaternion.copy(q);
            }

            // 3. 更新交角弧线 (在 planetGroup 本地空间中，从 eclDirLocal 扫向赤道方向)
            const equDirWorld = equDirTiltLocal.clone().applyQuaternion(tiltGroup.quaternion);

            // 计算直射夹角
            const angleRad = eclDirLocal.angleTo(equDirWorld);
            const angleDeg = (angleRad * 180) / Math.PI;

            // 用 dot 点积确定直射南北半球
            const axisDir = new THREE.Vector3(0, Math.cos(earthTilt), Math.sin(earthTilt)).normalize();
            const isNorth = toSunWorld.dot(axisDir) >= 0;
            displayObliquityAngle = isNorth ? angleDeg : -angleDeg;

            if (aids.obliquityArc) {
              aids.obliquityArc.visible = showObliquityAids && (angleDeg > 0.1);
              if (angleDeg > 0.1) {
                const arcPoints: THREE.Vector3[] = [];
                const R_arc = earthRad * 1.8;
                for (let i = 0; i <= 32; i++) {
                  const t = i / 32;
                  const dir = new THREE.Vector3().lerpVectors(eclDirLocal, equDirWorld, t).normalize();
                  arcPoints.push(dir.multiplyScalar(R_arc));
                }
                aids.obliquityArc.geometry.setFromPoints(arcPoints);
              }
              aids.obliquityArc.position.set(0, 0, 0);
              aids.obliquityArc.rotation.set(0, 0, 0);
            }
          }
        }

        // 本影锥：日食时显示月球影锥，月食时显示地球影锥
        if (aids.earthShadowCone) {
          const showEarthCone = isEclipseDemo && moonPos.distanceTo(earthPos) > 0.01;
          aids.earthShadowCone.visible = showEarthCone;
          if (showEarthCone) {
            const sunToEarth = earthPos.clone().sub(new THREE.Vector3(0,0,0)).normalize();
            const coneLen = moonPos.distanceTo(earthPos) * 3;
            const earthRad = getCurrentPlanetRadius('earth');
            const coneApex = earthPos.clone().add(sunToEarth.clone().multiplyScalar(-coneLen));
            aids.earthShadowCone.position.copy(coneApex);
            aids.earthShadowCone.lookAt(earthPos);
            aids.earthShadowCone.rotateX(Math.PI / 2);
            const topR = earthRad * 0.8;
            const bottomR = earthRad * 2.5;
            aids.earthShadowCone.scale.set(topR + bottomR, coneLen, topR + bottomR);
          }
        }

        if (aids.moonShadowCone) {
          const showMoonCone = isEclipseDemo && moonPos.distanceTo(earthPos) > 0.01;
          aids.moonShadowCone.visible = showMoonCone;
          if (showMoonCone) {
            const sunToMoon = moonPos.clone().sub(new THREE.Vector3(0,0,0)).normalize();
            const coneLen = moonPos.distanceTo(earthPos) * 2.5;
            const moonRad = getCurrentPlanetRadius('moon');
            const coneApex = moonPos.clone().add(sunToMoon.clone().multiplyScalar(-coneLen * 0.2));
            aids.moonShadowCone.position.copy(coneApex);
            aids.moonShadowCone.lookAt(moonPos.clone().add(sunToMoon.clone().multiplyScalar(coneLen)));
            aids.moonShadowCone.rotateX(Math.PI / 2);
            const topR = moonRad * 0.6;
            const bottomR = moonRad * 2.0;
            aids.moonShadowCone.scale.set(topR + bottomR, coneLen, topR + bottomR);
          }
        }

        // ═══════════════════════════════════════════════════════════════
        // 增强日食/月食3D视觉效果 (物理正确阴影锥)
        // ═══════════════════════════════════════════════════════════════
        // 辅助函数：将锥体的 +Y 轴对齐到指定方向
        const alignConeToDir = (cone: THREE.Mesh, dir: THREE.Vector3, position: THREE.Vector3) => {
          const up = new THREE.Vector3(0, 1, 0);
          const q = new THREE.Quaternion().setFromUnitVectors(up, dir.normalize());
          cone.quaternion.copy(q);
          cone.position.copy(position);
        };

        // 获取当前天体在场景中的实际半径和位置
        const sunRadiusScene = getCurrentPlanetRadius('sun');
        const earthRadiusScene = getCurrentPlanetRadius('earth');
        const moonRadiusScene = getCurrentPlanetRadius('moon');
        const sunPos = new THREE.Vector3(0, 0, 0);
        const earthToSunDir = new THREE.Vector3().subVectors(sunPos, earthPos).normalize();
        const moonToSunDir = new THREE.Vector3().subVectors(sunPos, moonPos).normalize();
        const moonToEarthDir = new THREE.Vector3().subVectors(earthPos, moonPos).normalize();
        const earthToMoonDist = earthPos.distanceTo(moonPos);

        // 1. 太阳光束 (Sun → Earth/Moon)
        if (aids.sunLightBeam) {
          aids.sunLightBeam.visible = isEclipseDemo;
          if (isEclipseDemo) {
            // 检测当前是日食还是月食：看月球在太阳和地球之间还是地球在太阳和月球之间
            const earthToMoon = new THREE.Vector3().subVectors(moonPos, earthPos);
            const dot = earthToSunDir.dot(earthToMoon);
            const isSolarEclipse = dot > 0; // 月球在太阳方向（日食）

            const targetPos = isSolarEclipse ? moonPos : earthPos;
            const targetRad = isSolarEclipse ? moonRadiusScene : earthRadiusScene;
            const beamDir = new THREE.Vector3().subVectors(targetPos, sunPos).normalize();
            const beamLen = sunPos.distanceTo(targetPos);
            const beamCenter = sunPos.clone().add(beamDir.clone().multiplyScalar(beamLen * 0.5));

            // 光束半径：从太阳半径渐变到遮挡体半径
            const startRadius = sunRadiusScene * 0.15;
            const endRadius = targetRad * 1.5;

            aids.sunLightBeam.position.copy(beamCenter);
            const up = new THREE.Vector3(0, 1, 0);
            const q = new THREE.Quaternion().setFromUnitVectors(up, beamDir);
            aids.sunLightBeam.quaternion.copy(q);
            aids.sunLightBeam.scale.set(startRadius + endRadius, beamLen, startRadius + endRadius);
          }
        }

        // 2. 月球阴影锥 (日食演示)
        // 日食：月球在太阳和地球之间，月球的影子投射到地球
        if (aids.moonUmbraCone && aids.moonPenumbraCone) {
          const earthToMoon = new THREE.Vector3().subVectors(moonPos, earthPos);
          const dot = earthToSunDir.dot(earthToMoon);
          const isSolarEclipseAlignment = dot > 0;
          const showMoonCones = isEclipseDemo && isSolarEclipseAlignment && earthToMoonDist > 0.01;

          aids.moonUmbraCone.visible = showMoonCones;
          aids.moonPenumbraCone.visible = showMoonCones;

          if (showMoonCones) {
            // 月球本影锥：从月球向地球方向收敛（底部在月球，尖头指向地球方向）
            // ConeGeometry 底部在 -Y，尖头在 +Y
            // 底部 = 月球处（大），尖头 = 地球方向（小）
            const umbraLen = earthToMoonDist * 1.5; // 延伸超过地球
            const umbraCenter = moonPos.clone().add(moonToEarthDir.clone().multiplyScalar(umbraLen * 0.5));

            // 计算物理近似：本影锥在月球处的半径 ≈ 月球半径
            // 在地球处的半径 = 月球半径 - umbraLen * tan(本影半顶角)
            // 简化：用月球半径作为底部，在地球处收敛到很小
            const umbraBottomR = moonRadiusScene * 1.2;
            const umbraTopR = moonRadiusScene * 0.05; // 尖头很小

            alignConeToDir(aids.moonUmbraCone, moonToEarthDir, umbraCenter);
            aids.moonUmbraCone.scale.set(umbraBottomR, umbraLen, umbraBottomR);

            // 月球半影锥：从月球向地球方向发散（尖头在月球，底部在地球方向）
            // ConeGeometry 尖头在 +Y，底部在 -Y
            // 尖头 = 月球处（小），底部 = 远处（大）
            const penumbraLen = earthToMoonDist * 2.0;
            // 半影锥中心点：尖头在月球，底部在远处
            // position 应设在中心，即 月球 + dir * (penumbraLen/2)
            const penumbraCenter = moonPos.clone().add(moonToEarthDir.clone().multiplyScalar(penumbraLen * 0.5));

            const penumbraTipR = moonRadiusScene * 0.8; // 月球处
            const penumbraBottomR = earthRadiusScene * 2.5; // 远处，大到覆盖地球

            // 半影锥：+Y 要指向远离地球的方向（尖头在月球）
            alignConeToDir(aids.moonPenumbraCone, moonToEarthDir.clone().negate(), penumbraCenter);
            // 反转后，+Y 指向月球反方向（即远离地球），但我们要尖头在月球...
            // 重新算：半影锥是发散的，从月球开始变大
            // 使用默认 ConeGeometry：底部(-Y)大，尖头(+Y)小
            // 我要底部在远处（大），尖头在月球（小）
            // 所以 +Y 应该指向月球... 不，+Y 应该指向远处
            // 等等：alignConeToDir 把 +Y 对齐到传入的 dir
            // 如果传入 moonToEarthDir（月球→地球），+Y 指向地球
            // 那尖头(+Y)在地球方向，底部(-Y)在月球方向
            // 这正是我们想要的：底部在月球（大），尖头在地球方向（小）？
            // 不！半影锥是发散的，应该月球处小，远处大
            // 所以尖头在月球（小），底部在远处（大）
            // 传入 dir = moonToEarthDir，+Y 指向地球，尖头在地球方向
            // 但我们要尖头在月球... 所以传入 -moonToEarthDir
            // 然后 position = 月球 + moonToEarthDir * (len/2)
            // 这样 +Y 指向月球反方向，尖头在月球反方向... 不对

            // 让我重新想：
            // ConeGeometry: 尖头(+Y)，底部(-Y，radius参数)
            // 半影锥：月球处小，远处大
            // 所以 尖头(+Y) 应该在 月球处，底部(-Y) 在远处
            // 即 +Y 指向 月球，-Y 指向 远处
            // alignConeToDir(cone, dir, pos): +Y 对齐到 dir
            // 所以 dir 应该指向 月球
            // 从中心到月球的方向 = -(moonToEarthDir)
            // 中心 = 月球 + moonToEarthDir * (len/2)
            // 从中心到月球 = -moonToEarthDir * (len/2)
            // 所以 alignConeToDir(aids.moonPenumbraCone, moonToEarthDir.clone().negate(), penumbraCenter)
            // 这是对的！+Y 指向月球（尖头），-Y 指向地球（底部，大）

            alignConeToDir(aids.moonPenumbraCone, moonToEarthDir.clone().negate(), penumbraCenter);
            aids.moonPenumbraCone.scale.set(penumbraBottomR, penumbraLen, penumbraBottomR);
          }
        }

        // 3. 地球阴影锥 (月食演示)
        // 月食：地球在太阳和月球之间，地球的影子投射到月球
        if (aids.earthUmbraCone && aids.earthPenumbraCone) {
          const earthToMoon = new THREE.Vector3().subVectors(moonPos, earthPos);
          const dot = earthToSunDir.dot(earthToMoon);
          const isLunarEclipseAlignment = dot < 0;
          const showEarthCones = isEclipseDemo && isLunarEclipseAlignment && earthToMoonDist > 0.01;

          aids.earthUmbraCone.visible = showEarthCones;
          aids.earthPenumbraCone.visible = showEarthCones;

          if (showEarthCones) {
            // 地球本影锥：从地球向远离太阳方向收敛
            // 底部在地球（大），尖头在远离太阳方向（小）
            const umbraLen = earthToMoonDist * 1.8; // 延伸到月球之外
            const umbraCenter = earthPos.clone().add(earthToSunDir.clone().multiplyScalar(umbraLen * 0.5));

            const umbraBottomR = earthRadiusScene * 1.1;
            const umbraTopR = earthRadiusScene * 0.05;

            alignConeToDir(aids.earthUmbraCone, earthToSunDir, umbraCenter);
            aids.earthUmbraCone.scale.set(umbraBottomR, umbraLen, umbraBottomR);

            // 地球半影锥：从地球向远离太阳方向发散
            // 尖头在地球（小），底部在远处（大）
            const penumbraLen = earthToMoonDist * 2.5;
            const penumbraCenter = earthPos.clone().add(earthToSunDir.clone().multiplyScalar(penumbraLen * 0.5));

            const penumbraTipR = earthRadiusScene * 0.9;
            const penumbraBottomR = earthRadiusScene * 3.0;

            // 半影锥：+Y 指向地球（尖头），-Y 指向远离太阳方向（底部，大）
            alignConeToDir(aids.earthPenumbraCone, earthToSunDir.clone().negate(), penumbraCenter);
            aids.earthPenumbraCone.scale.set(penumbraBottomR, penumbraLen, penumbraBottomR);
          }
        }

        // 天文现象辅助视觉文字标注与分色纬圈更新
        if (isSolarTermsDemo && earthGroup) {
          const realRad = getPlanetRadius('earth');
          const earthTilt = ((CELESTIAL_PHYSICS['earth']?.obliquity || 23.44) * Math.PI) / 180;

          // 指向太阳的方向向量 (世界坐标系)
          const toSunWorld = earthPos.clone().normalize().negate();
          if (toSunWorld.lengthSq() < 0.0001) toSunWorld.set(1, 0, 0);

          const eclDirWorld = new THREE.Vector3(toSunWorld.x, 0, toSunWorld.z).normalize();
          
          const tiltGroup = earthGroup.getObjectByName('planet-tilt-root') as THREE.Group;
          if (tiltGroup) {
            const toSunTiltLocal = toSunWorld.clone().applyQuaternion(tiltGroup.quaternion.clone().invert());
            const equDirTiltLocal = new THREE.Vector3(toSunTiltLocal.x, 0, toSunTiltLocal.z).normalize();
            const equDirWorld = equDirTiltLocal.clone().applyQuaternion(tiltGroup.quaternion);

            // 1. 黄道 3D Sprite 标签：在地球的两侧，垂直于日地轴线，正好在黄道线上，贴在地球上
            const eclSideDir = new THREE.Vector3(-eclDirWorld.z, 0, eclDirWorld.x).normalize();
            if (aids.eclipticLabel) {
              aids.eclipticLabel.visible = true;
              aids.eclipticLabel.position.copy(eclSideDir).multiplyScalar(realRad * 1.08);
            }
            if (aids.eclipticLabelRight) {
              aids.eclipticLabelRight.visible = true;
              aids.eclipticLabelRight.position.copy(eclSideDir).multiplyScalar(-realRad * 1.08);
            }

            // 2. 赤道 3D Sprite 标签：挂在 tiltGroup 下，贴在地球的赤道线上
            if (aids.equatorLabel) {
              aids.equatorLabel.visible = true;
              aids.equatorLabel.position.copy(equDirTiltLocal).multiplyScalar(realRad * 1.08);
            }

            // 3. 动态分割白昼/黑夜纬线圈（方案一）
            aids.latitudeLines.forEach(item => {
              const latRad = (item.lat * Math.PI) / 180;
              const h = realRad * Math.sin(latRad);
              const r = realRad * Math.cos(latRad);
              
              const dayPoints: THREE.Vector3[] = [];
              const nightPoints: THREE.Vector3[] = [];
              
              const samples = 128;
              for (let i = 0; i <= samples; i++) {
                const theta = (i / samples) * Math.PI * 2;
                const p = new THREE.Vector3(Math.cos(theta) * r, h, Math.sin(theta) * r);
                
                // 检查在该点上的照度
                const dot = p.clone().normalize().dot(toSunTiltLocal);
                if (dot >= -0.015) { // 允许轻微重叠以防连线接缝出现断线
                  dayPoints.push(p);
                } else {
                  nightPoints.push(p);
                }
              }
              
              if (dayPoints.length > 1) {
                item.dayLine.geometry.setFromPoints(dayPoints);
                item.dayLine.visible = true;
              } else {
                item.dayLine.visible = false;
              }
              
              if (nightPoints.length > 1) {
                item.nightLine.geometry.setFromPoints(nightPoints);
                item.nightLine.visible = true;
                item.nightLine.computeLineDistances(); // 虚线计算距离以渲染虚线间隔
              } else {
                item.nightLine.visible = false;
              }
            });

            // 4. 显示北京观测点与标签
            if (aids.beijingMarker) aids.beijingMarker.visible = true;
            if (aids.beijingLabel) aids.beijingLabel.visible = true;

            // 5. 直射纬度 3D Sprite 标签：挂在 planetGroup 下，方向是夹角弧线中段，距地心 2.1 * realRad
            const angleVal = displayObliquityAngle;
            const hasObq = Math.abs(angleVal) >= 0.1;
            if (aids.obliquityLabel) {
              aids.obliquityLabel.visible = hasObq;
              if (hasObq) {
                const midDir = new THREE.Vector3().lerpVectors(eclDirWorld, equDirWorld, 0.5).normalize();
                aids.obliquityLabel.position.copy(midDir).multiplyScalar(realRad * 2.1);

                // 动态更新直射纬度文本纹理
                const angleText = lang === 'zh'
                  ? `直射纬度: ${angleVal.toFixed(1)}°`
                  : `Solar Declination: ${angleVal.toFixed(1)}°`;

                if (lastAngleTextRef.current !== angleText) {
                  lastAngleTextRef.current = angleText;
                  updateSpriteTextTexture(aids.obliquityLabel, angleText, '#ffffff', 32);
                  const aspect = aids.obliquityLabel.material.map ? (aids.obliquityLabel.material.map.image as any).width / (aids.obliquityLabel.material.map.image as any).height : 1.0;
                  aids.obliquityLabel.scale.set(realRad * 0.25 * aspect, realRad * 0.25, 1);
                }
              }
            }

            // 6. 计算北京观测点当前的地方太阳时与昼夜状态（方案二）
            let localSolarTime = 12;
            let isDaylight = true;
            const earthBodyGroup = earthGroup.getObjectByName('planet-body-root') as THREE.Group;
            if (aids.beijingMarker && earthBodyGroup) {
              const beijingWorldPos = new THREE.Vector3();
              aids.beijingMarker.getWorldPosition(beijingWorldPos);
              
              const toBeijingWorld = new THREE.Vector3().subVectors(beijingWorldPos, earthPos).normalize();
              isDaylight = toBeijingWorld.dot(toSunWorld) >= 0;
              
              // 地方太阳时：利用北京点位在 bodyRoot 旋转后在本地 X-Z 面与直射太阳方向投影的夹角计算
              const currentRotY = earthBodyGroup.rotation.y;
              const beijingPosTilt = aids.beijingMarker.position.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), currentRotY);
              const projBeijing = new THREE.Vector3(beijingPosTilt.x, 0, beijingPosTilt.z).normalize();
              const projSun = new THREE.Vector3(equDirTiltLocal.x, 0, equDirTiltLocal.z).normalize();
              
              let angle = Math.atan2(projBeijing.z, projBeijing.x) - Math.atan2(projSun.z, projSun.x);
              if (angle < -Math.PI) angle += Math.PI * 2;
              if (angle > Math.PI) angle -= Math.PI * 2;
              
              localSolarTime = 12 + (angle / Math.PI) * 12;
              if (localSolarTime < 0) localSolarTime += 24;
              if (localSolarTime >= 24) localSolarTime -= 24;
            }

            // 计算该节气纬度下的理论昼长/夜长
            const latRad = (40.0 * Math.PI) / 180;
            const declRad = (displayObliquityAngle * Math.PI) / 180;
            const cosHourAngle = -Math.tan(latRad) * Math.tan(declRad);
            let dayHours = 12;
            if (cosHourAngle <= -1) {
              dayHours = 24; // 极昼
            } else if (cosHourAngle >= 1) {
              dayHours = 0;  // 极夜
            } else {
              const hourAngle = Math.acos(cosHourAngle);
              dayHours = (2 * hourAngle * 180) / (Math.PI * 15);
            }
            const nightHours = 24 - dayHours;

            // 7. 直接操作 DOM 更新时钟仪表盘（极佳的 60fps 性能，避免 React state 渲染延迟）
            if (solarTimeTextRef.current) {
              const hrs = Math.floor(localSolarTime);
              const mins = Math.floor((localSolarTime % 1) * 60);
              solarTimeTextRef.current.innerText = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
            }
            if (solarStateTextRef.current) {
              solarStateTextRef.current.innerText = isDaylight 
                ? (lang === 'zh' ? '观测点当前状态: 白昼 ☀️' : 'Observer Status: Daylight ☀️')
                : (lang === 'zh' ? '观测点当前状态: 黑夜 🌙' : 'Observer Status: Nighttime 🌙');
              solarStateTextRef.current.className = isDaylight
                ? "text-yellow-400 font-bold tracking-wide transition-colors"
                : "text-blue-400 font-bold tracking-wide transition-colors";
            }
            if (solarClockNeedleRef.current) {
              const deg = localSolarTime * 15; // 24小时，1小时 = 15度
              solarClockNeedleRef.current.style.transform = `rotate(${deg}deg)`;
            }
            if (solarClockFaceRef.current) {
              const sunriseHr = 12 - dayHours / 2;
              const sunsetHr = 12 + dayHours / 2;
              const sunrisePct = (sunriseHr / 24) * 100;
              const sunsetPct = (sunsetHr / 24) * 100;
              
              solarClockFaceRef.current.style.background = `conic-gradient(
                #1e3a8a 0%,
                #1e3a8a ${sunrisePct}%,
                #eab308 ${sunrisePct}%,
                #eab308 ${sunsetPct}%,
                #1e3a8a ${sunsetPct}%,
                #1e3a8a 100%
              )`;
            }
            if (solarDaylightHoursTextRef.current) {
              const dh = Math.floor(dayHours);
              const dm = Math.floor((dayHours % 1) * 60);
              solarDaylightHoursTextRef.current.innerText = lang === 'zh'
                ? `理论昼长: ${dh}小时${dm}分`
                : `Daylight Duration: ${dh}h ${dm}m`;
            }
            if (solarNightHoursTextRef.current) {
              const nh = Math.floor(nightHours);
              const nm = Math.floor((nightHours % 1) * 60);
              solarNightHoursTextRef.current.innerText = lang === 'zh'
                ? `理论夜长: ${nh}小时${nm}分`
                : `Nighttime Duration: ${nh}h ${nm}m`;
            }
            if (solarDeclinationTextRef.current) {
              solarDeclinationTextRef.current.innerText = lang === 'zh'
                ? `太阳直射点纬度: ${displayObliquityAngle.toFixed(1)}°`
                : `Solar Declination: ${displayObliquityAngle.toFixed(1)}°`;
            }
          }
        } else {
          // 非节气演示模式下，隐藏所有的 3D 文字标签与纬线圈
          if (aids.eclipticLabel) aids.eclipticLabel.visible = false;
          if (aids.eclipticLabelRight) aids.eclipticLabelRight.visible = false;
          if (aids.equatorLabel) aids.equatorLabel.visible = false;
          if (aids.obliquityLabel) aids.obliquityLabel.visible = false;
          aids.latitudeLines.forEach(item => {
            item.dayLine.visible = false;
            item.nightLine.visible = false;
          });
          if (aids.beijingMarker) aids.beijingMarker.visible = false;
          if (aids.beijingLabel) aids.beijingLabel.visible = false;

          // 重置自转模拟状态
          solarTermsSelfRotationOffsetRef.current = 0;
          if (isRotationSimActiveRef.current) {
            isRotationSimActiveRef.current = false;
            setIsRotationSimActive(false);
          }
        }
      } else {
        // 非演示模式：隐藏所有辅助视觉效果
        const aids = visualAidsRef.current;
        if (aids.sunBeam) aids.sunBeam.visible = false;
        if (aids.sunLightBeam) aids.sunLightBeam.visible = false;
        if (aids.earthShadowCone) aids.earthShadowCone.visible = false;
        if (aids.earthUmbraCone) aids.earthUmbraCone.visible = false;
        if (aids.earthPenumbraCone) aids.earthPenumbraCone.visible = false;
        if (aids.moonShadowCone) aids.moonShadowCone.visible = false;
        if (aids.moonUmbraCone) aids.moonUmbraCone.visible = false;
        if (aids.moonPenumbraCone) aids.moonPenumbraCone.visible = false;
        if (aids.eclipticPlane) aids.eclipticPlane.visible = false;
        if (aids.earthAxis) aids.earthAxis.visible = false;
        if (aids.earthEquator) aids.earthEquator.visible = false;
        if (aids.obliquityArc) aids.obliquityArc.visible = false;
        if (aids.eclipticProjLine) aids.eclipticProjLine.visible = false;
        if (aids.equatorProjLine) aids.equatorProjLine.visible = false;
        if (aids.eclipticLabel) aids.eclipticLabel.visible = false;
        if (aids.eclipticLabelRight) aids.eclipticLabelRight.visible = false;
        if (aids.equatorLabel) aids.equatorLabel.visible = false;
        if (aids.obliquityLabel) aids.obliquityLabel.visible = false;
        aids.latitudeLines.forEach(item => {
          item.dayLine.visible = false;
          item.nightLine.visible = false;
        });
        if (aids.beijingMarker) aids.beijingMarker.visible = false;
        if (aids.beijingLabel) aids.beijingLabel.visible = false;
        if (aids.sunToMoonBeam) aids.sunToMoonBeam.visible = false;
        if (aids.moonToEarthBeam) aids.moonToEarthBeam.visible = false;
        if (aids.moonPhaseProjection) aids.moonPhaseProjection.visible = false;

        // 同时隐藏真实地球赤道环
        const earthGroup = planetMeshesRef.current['earth'];
        const earthBodyGroup = earthGroup ? earthGroup.getObjectByName('planet-body-root') : null;
        if (earthBodyGroup) {
          const eqRing = earthBodyGroup.getObjectByName('planet-earth-equator-ring') as THREE.Mesh;
          if (eqRing) eqRing.visible = false;
        }

        // 释放演示模式下的缩放限制 (Reset zoom lock when exiting demo)
        if (controlsRef.current && controlsRef.current.maxDistance !== 2000000) {
          controlsRef.current.maxDistance = 2000000;
        }

        // 重置自转模拟状态
        solarTermsSelfRotationOffsetRef.current = 0;
        if (isRotationSimActiveRef.current) {
          isRotationSimActiveRef.current = false;
          setIsRotationSimActive(false);
        }
      }

      // 11. 丝滑聚焦/跟随选中星体 & 动态近剪切面比例尺缩放
      if (!isEnteringRef.current && startEntryRef.current && selectedPlanetIdRef.current && !demoCam.active) {
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
          let radOfTarget = getCurrentPlanetRadius(selectedPlanetIdRef.current);

          const idealNear = Math.max(0.000001, radOfTarget * 0.02);
          if (cameraRef.current.near !== idealNear) {
            cameraRef.current.near = idealNear;
            cameraRef.current.updateProjectionMatrix();
          }
          // 让控制器最小缩放距离也自适应
          controlsRef.current.minDistance = radOfTarget * 1.05;

          // 选中星体改变时，重设 controls target 与相机视角位置以实现聚焦跟随
          if (selectedPlanetIdRef.current !== lastSelectedPlanetIdRef.current) {
            const isSat = !!getParentPlanetId(selectedPlanetIdRef.current) && !['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune','sun','moon'].includes(selectedPlanetIdRef.current.toLowerCase());
            let offset: number;
            if (strictPhysicsRef.current) {
              // 物理1:1模式：不追求看全轨道，而是近距离观察星体，只保留一定的视野缓冲
              offset = radOfTarget * 3.5;
              if (selectedPlanetIdRef.current === 'sun') {
                offset = radOfTarget * 4.0;
              }
            } else {
              // 可观测模式：星体恰好撑满屏幕（FOV=50°, d = r / tan(25°) ≈ 2.15r）
              const fillFactor = 2.15;
              offset = radOfTarget * fillFactor;
            }

            // 平滑动画过渡效果 (Lerp) 替代硬切
            // 先不直接设置相机位置，而是存储目标位置到 lastSelectedPlanetIdRef 中供追踪插值使用
            
            // 为了让相机总是“正对”星球（而不是背对或侧面飞过去），我们以太阳为中心，
            // 确保相机的目标点在星球和太阳连线的延长线上（背向太阳），这样飞过去的时候总是能看到被太阳照亮的正面。
            // 除非选中的是太阳本身，那就随便保持一个相对位置即可
            let idealCameraPos: THREE.Vector3;
            if (selectedPlanetIdRef.current === 'sun') {
              idealCameraPos = new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z + offset);
            } else {
              // 从太阳指向星球的方向向量
              const sunToPlanetDir = targetPos.clone().normalize();
              // 如果是在原点，或者发生奇异现象，给一个默认向外的向量
              if (sunToPlanetDir.lengthSq() < 0.0001) {
                sunToPlanetDir.set(0, 0, 1);
              }
              // 相机的位置应该是：星球位置 - (方向向量 * 偏移距离)
              // 这样相机停在星球和太阳之间，看向星球时看到的就是被太阳完全照亮的亮面
              idealCameraPos = targetPos.clone().sub(sunToPlanetDir.multiplyScalar(offset));
            }
            
            // 为了防止初始状态相机突变，如果之前没有选中过任何东西，可以直接切过去
            if (lastSelectedPlanetIdRef.current === '') {
              cameraRef.current.position.copy(idealCameraPos);
              controlsRef.current.target.copy(targetPos);
              lastSelectedPlanetIdRef.current = selectedPlanetIdRef.current;
              transitionInfoRef.current.active = false;
              transitionInfoRef.current.phase = 'none';
            } else {
              // ==========================================
              // 镜头运动曲线优化：二阶段式电影级运镜
              // 阶段 1 (Flight): 高速跃迁到远端泊车点 (动态计算，避免倒车现象)
              // 阶段 2 (Glide): 极其平缓的最后靠泊滑行 (向前推进4次滚轮距离)
              // ==========================================
              const trans = transitionInfoRef.current;
              
              // 只有当刚开始切换新的星球时，重新计算起点和控制点
              if (!trans.active || trans.targetPlanetId !== selectedPlanetIdRef.current) {
                trans.active = true;
                trans.phase = 'flight';
                trans.targetPlanetId = selectedPlanetIdRef.current;
                trans.elapsedTime = 0;
                trans.glideTime = 0;
                trans.startPos.copy(cameraRef.current.position);
                trans.startTarget.copy(controlsRef.current.target);
                
                // 动态计算远端泊车点 farPos
                // 1. 根据你的要求，将停止位置距离终点再近一半（原来是4倍offset，现在改为2倍）
                // 2. 为了保证不会发生“倒车”，滑行距离绝对不能超过总路程的 40%
                const totalJourney = trans.startPos.distanceTo(idealCameraPos);
                const maxGlide = totalJourney * 0.4;
                const glideDist = Math.min(offset * 2.0, maxGlide);
                
                // 3. farPos 就放在从 idealCameraPos 指向 startPos 的直线上，这样保证是顺着来路停下，永远不会倒车
                const backDir = new THREE.Vector3().subVectors(trans.startPos, idealCameraPos).normalize();
                if (backDir.lengthSq() < 0.0001) backDir.set(0, 0, 1);
                
                trans.farPos.copy(idealCameraPos).add(backDir.multiplyScalar(glideDist));
                trans.finalPos.copy(idealCameraPos);
                trans.totalDistance = trans.startPos.distanceTo(trans.farPos);
                
                // 计算相机中间控制点 (midPos)
                // 获取当前相机朝向
                const camDir = new THREE.Vector3().subVectors(trans.startTarget, trans.startPos).normalize();
                if (camDir.lengthSq() < 0.001) camDir.set(0, 0, -1);
                
                // 获取相机右侧向量
                const up = new THREE.Vector3(0, 1, 0);
                const right = new THREE.Vector3().crossVectors(camDir, up).normalize();
                if (right.lengthSq() < 0.001) right.set(1, 0, 0);
                
                // 判断目标星体在当前视野的左侧还是右侧
                const toTarget = new THREE.Vector3().subVectors(targetPos, trans.startPos);
                const dotRight = toTarget.dot(right);
                const sideDir = dotRight > 0 ? right : right.negate();
                
                // 控制点偏移量：基于距离的一个系数
                const distToFar = trans.startPos.distanceTo(trans.farPos);
                
                // 中间点：向相机当前朝向的前方移动，并向目标所在的侧面大幅度平移
                // 这样相机在前半程就会像直升机摇臂一样滑向侧面，从而让目标自然地落入画面中心
                trans.midPos.copy(trans.startPos)
                  .add(camDir.multiplyScalar(distToFar * 0.15))
                  .add(sideDir.multiplyScalar(distToFar * 0.4));
              }
              
              // 使用真实的 delta 时间推进，防止帧率波动影响总时长
              // 限制最大 delta 防止切后台导致时间暴走
              const safeDelta = Math.min(delta, 0.1);
              
              if (trans.phase === 'flight') {
                trans.elapsedTime += safeDelta;
                const { progress, isFinished, totalTime } = calculateKinematicProgress(trans.elapsedTime, trans.totalDistance);
                
                // 需求：第一段运动，末端不要变成0再切换，而是提前 0.2 秒切换到第二段运动
                // 这样两段运动的衔接会有速度的平滑继承，避免完全静止带来的顿挫感。
                if (isFinished || (totalTime > 0 && trans.elapsedTime >= totalTime - 0.2)) {
                  trans.phase = 'glide';
                  // 提前切换时，不强制将相机位置设为远端点，而是保留当前的物理位置，无缝转入 glide 阶段的插值
                  // cameraRef.current.position.copy(trans.farPos); 
                  controlsRef.current.target.copy(targetPos);
                } else {
                  const easeT = progress;
                  
                  // 1. 视口目标 (Target) 过渡
                  // 让视点在前半段锁定目标星体（出现在画面正中间）
                  const targetEaseT = Math.min(1.0, easeT * 1.8);
                  const currentTarget = new THREE.Vector3();
                  currentTarget.lerpVectors(trans.startTarget, targetPos, targetEaseT);
                  controlsRef.current.target.copy(currentTarget);
                  
                  // 2. 相机物理位置 (Position) 沿贝塞尔曲线过渡到 farPos
                  const u = 1 - easeT;
                  const currentPos = new THREE.Vector3();
                  currentPos.addScaledVector(trans.startPos, u * u);
                  currentPos.addScaledVector(trans.midPos, 2 * u * easeT);
                  currentPos.addScaledVector(trans.farPos, easeT * easeT);
                  
                  cameraRef.current.position.copy(currentPos);
                }
              } else if (trans.phase === 'glide') {
                // 阶段 2：极其平缓的最后靠泊滑行
                trans.glideTime += safeDelta;
                const GLIDE_DURATION = 2.0; // 距离进一步缩短到 2x offset，滑行时间缩减到 2.0 秒
                
                if (trans.glideTime >= GLIDE_DURATION) {
                  trans.active = false;
                  trans.phase = 'none';
                  lastSelectedPlanetIdRef.current = selectedPlanetIdRef.current;
                  cameraRef.current.position.copy(trans.finalPos);
                  controlsRef.current.target.copy(targetPos);
                } else {
                  const t = trans.glideTime / GLIDE_DURATION;
                  // 由于我们是在第一阶段末端提前 0.2s 带着微小速度切入的，
                  // 这里改为使用 easeOutQuad 缓出曲线，不再需要缓慢起步，直接开始平滑减速即可。
                  const easeT = 1 - (1 - t) * (1 - t);
                  
                  const currentPos = new THREE.Vector3();
                  // 注意：现在的起点是相机在提前 0.2s 切入时的真实位置，而不是死板的 farPos
                  // 这保证了位置和速度在两个阶段交界处的绝对连续性！
                  currentPos.lerpVectors(cameraRef.current.position, trans.finalPos, easeT * 0.08); // 使用低权重增量插值
                  cameraRef.current.position.copy(currentPos);
                  
                  // 确保视口在这漫长的 2.5 秒内死死锁定在星体中心
                  controlsRef.current.target.copy(targetPos);
                }
              }
            }
            
            // 更新 tracking 目标点，供后续公转过程中的相对位移计算使用
            lastTargetPosRef.current.copy(targetPos);
            lastRadOfTargetRef.current = radOfTarget;
          } else {
            // 在公转过程中平滑自适应追踪：利用增量(deltaMove)整体移动相机，防范星体高速公转时由于相机静止而直接飞出特写视口
            const deltaMove = new THREE.Vector3().subVectors(targetPos, lastTargetPosRef.current);
            cameraRef.current.position.add(deltaMove);
            
            // 响应教学模式带来的星体体积变化：自适应推拉相机距离以防穿模
            if (lastRadOfTargetRef.current > 0 && Math.abs(radOfTarget - lastRadOfTargetRef.current) > 0.000001) {
              const relPos = new THREE.Vector3().subVectors(cameraRef.current.position, targetPos);
              const scaleRatio = radOfTarget / lastRadOfTargetRef.current;
              relPos.multiplyScalar(scaleRatio);
              cameraRef.current.position.copy(targetPos).add(relPos);
            }

            controlsRef.current.target.copy(targetPos);
            lastTargetPosRef.current.copy(targetPos);
            lastRadOfTargetRef.current = radOfTarget;
          }
        }
      } else if (!isEnteringRef.current && startEntryRef.current && !demoCam.active) {
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

      // 12. 更新控制器
      controlsRef.current.update();

      // 在 controls.update() 之后重新投影太阳到屏幕坐标，确保光晕和 3D 渲染使用同一帧相机矩阵
      if (sunMeshRef.current && cameraRef.current && container) {
        const sunWorldPos = new THREE.Vector3();
        sunMeshRef.current.getWorldPosition(sunWorldPos);
        const sunProj = sunWorldPos.clone().project(cameraRef.current);

        const curWidth = container.clientWidth || 800;
        const curHeight = container.clientHeight || 600;

        // 重新判定太阳是否在相机前方
        const toSun = sunWorldPos.clone().sub(cameraRef.current.position);
        const camDir = new THREE.Vector3();
        cameraRef.current.getWorldDirection(camDir);
        const isBehind = toSun.dot(camDir) <= 0 || sunProj.z > 1;

      }

      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };

    // 初始化相机位置到选中星体面前（从观测模式返回时直接定位，避免从远处飞入）
    const initializeCameraToSelectedPlanet = () => {
      if (!selectedPlanetId || !cameraRef.current || !controlsRef.current) return;

      const initDaysSinceJ2000 = TimeEngine.getDaysSinceJ2000(currentTimestampRef.current);

      let targetPos = new THREE.Vector3();

      if (selectedPlanetId === 'sun') {
        targetPos.set(0, 0, 0);
      } else if (selectedPlanetId === 'moon') {
        const earthPosRaw = OrbitEngine.getHeliocentricPosition('earth', initDaysSinceJ2000);
        const moonRelPosRaw = OrbitEngine.getLunarRelativePosition(initDaysSinceJ2000);
        const earthPos = toThreePos(earthPosRaw, ORBIT_SCALE);
        const moonRelPos = toThreePos(moonRelPosRaw, ORBIT_SCALE);
        if (!strictPhysics) {
          const earthStrictRad = ScaleEngine.getStrictRadius('earth');
          const earthObsRad = ScaleEngine.getObservableRadius('earth');
          const scaleFactor = earthObsRad / earthStrictRad;
          moonRelPos.multiplyScalar(scaleFactor);
        }
        targetPos.copy(earthPos).add(moonRelPos);
      } else {
        const posRaw = OrbitEngine.getHeliocentricPosition(selectedPlanetId, initDaysSinceJ2000);
        targetPos = toThreePos(posRaw, ORBIT_SCALE);
      }

      const radOfTarget = getCurrentPlanetRadius(selectedPlanetId);
      let offset: number;
      if (strictPhysics) {
        offset = radOfTarget * 3.5;
        if (selectedPlanetId === 'sun') {
          offset = radOfTarget * 4.0;
        }
      } else {
        offset = radOfTarget * 2.15;
      }

      let idealCameraPos: THREE.Vector3;
      if (selectedPlanetId === 'sun') {
        idealCameraPos = new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z + offset);
      } else {
        const sunToPlanetDir = targetPos.clone().normalize();
        if (sunToPlanetDir.lengthSq() < 0.0001) {
          sunToPlanetDir.set(0, 0, 1);
        }
        idealCameraPos = targetPos.clone().sub(sunToPlanetDir.multiplyScalar(offset));
      }

      cameraRef.current.position.copy(idealCameraPos);
      controlsRef.current.target.copy(targetPos);
      lastTargetPosRef.current.copy(targetPos);
      lastSelectedPlanetIdRef.current = selectedPlanetId;
      lastRadOfTargetRef.current = radOfTarget;

      // 如果从观测模式返回（startEntryAnimation 已为 true 但 startEntryRef 为 false），
      // 标记为已完成入场，使正常跟随逻辑生效，避免每帧被重置到 1.44 ly 起点
      if (startEntryAnimation && !startEntryRef.current) {
        startEntryRef.current = true;
      }
    };

    initializeCameraToSelectedPlanet();

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
      // 清理天文现象辅助视觉效果
      const aids = visualAidsRef.current;
      const disposeObject = (obj: THREE.Object3D | null) => {
        if (!obj) return;
        obj.parent?.remove(obj);
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh || child instanceof THREE.Sprite || child instanceof THREE.Line) {
            child.geometry?.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(m => m.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });
      };

      if (aids.sunBeam) { scene.remove(aids.sunBeam); aids.sunBeam.geometry.dispose(); (aids.sunBeam.material as THREE.Material).dispose(); }
      if (aids.sunLightBeam) { scene.remove(aids.sunLightBeam); aids.sunLightBeam.geometry.dispose(); (aids.sunLightBeam.material as THREE.Material).dispose(); }
      if (aids.earthShadowCone) { scene.remove(aids.earthShadowCone); aids.earthShadowCone.geometry.dispose(); (aids.earthShadowCone.material as THREE.Material).dispose(); }
      if (aids.earthUmbraCone) { scene.remove(aids.earthUmbraCone); aids.earthUmbraCone.geometry.dispose(); (aids.earthUmbraCone.material as THREE.Material).dispose(); }
      if (aids.earthPenumbraCone) { scene.remove(aids.earthPenumbraCone); aids.earthPenumbraCone.geometry.dispose(); (aids.earthPenumbraCone.material as THREE.Material).dispose(); }
      if (aids.moonShadowCone) { scene.remove(aids.moonShadowCone); aids.moonShadowCone.geometry.dispose(); (aids.moonShadowCone.material as THREE.Material).dispose(); }
      if (aids.moonUmbraCone) { scene.remove(aids.moonUmbraCone); aids.moonUmbraCone.geometry.dispose(); (aids.moonUmbraCone.material as THREE.Material).dispose(); }
      if (aids.moonPenumbraCone) { scene.remove(aids.moonPenumbraCone); aids.moonPenumbraCone.geometry.dispose(); (aids.moonPenumbraCone.material as THREE.Material).dispose(); }
      if (aids.eclipticPlane) { scene.remove(aids.eclipticPlane); aids.eclipticPlane.geometry.dispose(); (aids.eclipticPlane.material as THREE.Material).dispose(); }
      if (aids.earthAxis) { scene.remove(aids.earthAxis); aids.earthAxis.geometry.dispose(); (aids.earthAxis.material as THREE.Material).dispose(); }
      disposeObject(aids.earthEquator);
      disposeObject(aids.obliquityArc);
      disposeObject(aids.eclipticProjLine);
      disposeObject(aids.equatorProjLine);
      aids.latitudeLines.forEach(item => {
        disposeObject(item.dayLine);
        disposeObject(item.nightLine);
      });
      aids.latitudeLines = [];
      disposeObject(aids.beijingMarker);
      disposeObject(aids.beijingLabel);
      disposeObject(aids.eclipticLabel);
      disposeObject(aids.eclipticLabelRight);
      disposeObject(aids.equatorLabel);
      disposeObject(aids.obliquityLabel);
      disposeObject(aids.sunToMoonBeam);
      disposeObject(aids.moonToEarthBeam);
      disposeObject(aids.moonPhaseProjection);
      // 清理节气虚影地球
      solarTermGhostMeshesRef.current.forEach(group => {
        group.traverse((node) => {
          if (node instanceof THREE.Mesh) {
            node.geometry.dispose();
            if (Array.isArray(node.material)) {
              node.material.forEach(m => m.dispose());
            } else {
              node.material.dispose();
            }
          }
        });
        scene.remove(group);
      });
      solarTermGhostMeshesRef.current = [];
      // 清理月相虚影月球
      moonPhaseGhostMeshesRef.current.forEach(group => {
        group.traverse((node) => {
          if (node instanceof THREE.Mesh) {
            node.geometry.dispose();
            if (Array.isArray(node.material)) {
              node.material.forEach(m => m.dispose());
            } else {
              node.material.dispose();
            }
          }
        });
        scene.remove(group);
      });
      moonPhaseGhostMeshesRef.current = [];
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

    // Solar term ghost selection (only during solar-terms demo)
    if (demoState?.activePhenomenon === 'solar-terms') {
      const ghostIntersects = raycaster.intersectObjects(solarTermGhostMeshesRef.current, true);
      if (ghostIntersects.length > 0) {
        let hitObj: THREE.Object3D | null = ghostIntersects[0].object;
        while (hitObj && hitObj.userData?.solarTermIndex === undefined) {
          hitObj = hitObj.parent;
        }
        const termIndex = hitObj?.userData?.solarTermIndex;
        if (termIndex !== undefined && onSelectSolarTerm) {
          onSelectSolarTerm(termIndex);
          return;
        }
      }
    }

    // Moon phase ghost selection (only during moon-phases demo)
    if (demoState?.activePhenomenon === 'moon-phases') {
      const ghostIntersects = raycaster.intersectObjects(moonPhaseGhostMeshesRef.current, true);
      if (ghostIntersects.length > 0) {
        let hitObj: THREE.Object3D | null = ghostIntersects[0].object;
        while (hitObj && hitObj.userData?.moonPhaseIndex === undefined) {
          hitObj = hitObj.parent;
        }
        const phaseIndex = hitObj?.userData?.moonPhaseIndex;
        if (phaseIndex !== undefined && onSelectMoonPhase) {
          onSelectMoonPhase(phaseIndex);
          return;
        }
      }
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

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (mountRef.current && rendererRef.current && cameraRef.current) {
        const width = mountRef.current.clientWidth || window.innerWidth;
        const height = mountRef.current.clientHeight || window.innerHeight;
        
        rendererRef.current.setSize(width, height);
        
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      
      {/* 2. 镜头光晕已移至 WebGL 渲染（SunEffects.ts 中的 sun-lens-flare sprite），
           彻底消除 DOM/WebGL 不同步问题 */}

      {/* 3. 八大行星名称标签 (Planet Name Labels) */}
      <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
        {Object.entries(planetLabels).map(([id, label]: [string, any]) => {
          if (!label.visible) return null;
          return (
            <div
              key={id}
              className="absolute pointer-events-auto cursor-pointer"
              style={{
                left: `${label.x}px`,
                top: `${label.y}px`,
                transform: 'translate(-50%, -100%)',
                opacity: label.opacity,
                transition: 'opacity 0.1s ease-out'
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectPlanet(id);
              }}
            >
              <div className="flex flex-col items-center group">
                <span className="text-[10px] font-medium text-cyan-400/60 tracking-widest drop-shadow-[0_0_2px_rgba(0,0,0,0.8)] group-hover:text-cyan-300/90 transition-colors">
                  {lang === 'zh' ? label.nameZh : label.nameEn}
                </span>
                <span className="text-[8px] font-mono text-cyan-500/50 drop-shadow-[0_0_2px_rgba(0,0,0,0.8)] opacity-0 group-hover:opacity-100 transition-opacity">
                  {lang === 'zh' ? label.nameEn : label.nameZh}
                </span>
              </div>
            </div>
          );
        })}
      </div>



      {/* 4. 二十四节气虚影名称标签 (Solar Term Ghost Labels) */}
      <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
        {Object.entries(solarTermLabels).map(([idx, label]: [string, any]) => {
          if (!label.visible) return null;
          const index = Number(idx);
          const seasonColor = index < 6 ? 'text-emerald-400' : index < 12 ? 'text-rose-400' : index < 18 ? 'text-amber-400' : 'text-cyan-400';
          return (
            <div
              key={`st-${idx}`}
              className="absolute pointer-events-auto cursor-pointer"
              style={{
                left: `${label.x}px`,
                top: `${label.y}px`,
                transform: 'translate(-50%, -100%)',
                opacity: label.opacity,
                transition: 'opacity 0.1s ease-out'
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectSolarTerm(index);
              }}
            >
              <div className="flex flex-col items-center group">
                <span className={`text-[10px] font-bold ${seasonColor} tracking-widest drop-shadow-[0_0_4px_rgba(0,0,0,0.9)] group-hover:scale-110 transition-transform`}>
                  {lang === 'zh' ? label.nameZh : label.nameEn}
                </span>
                <span className="text-[8px] font-mono text-slate-400/60 drop-shadow-[0_0_2px_rgba(0,0,0,0.8)] opacity-0 group-hover:opacity-100 transition-opacity">
                  {lang === 'zh' ? label.nameEn : label.nameZh}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4b. 月相虚影名称标签 (Moon Phase Ghost Labels) */}
      <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
        {Object.entries(moonPhaseLabels).map(([idx, label]: [string, any]) => {
          if (!label.visible) return null;
          const index = Number(idx);
          return (
            <div
              key={`mp-${idx}`}
              className="absolute pointer-events-auto cursor-pointer"
              style={{
                left: `${label.x}px`,
                top: `${label.y}px`,
                transform: 'translate(-50%, -100%)',
                opacity: label.opacity,
                transition: 'opacity 0.1s ease-out'
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectMoonPhase) onSelectMoonPhase(index);
              }}
            >
              <div className="flex flex-col items-center group">
                <span className="text-sm drop-shadow-[0_0_4px_rgba(0,0,0,0.9)] group-hover:scale-110 transition-transform">
                  {label.icon}
                </span>
                <span className="text-[10px] font-bold text-amber-200 tracking-widest drop-shadow-[0_0_4px_rgba(0,0,0,0.9)] group-hover:scale-110 transition-transform">
                  {label.name}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部缩放尺与教学模式开关 */}
      <div className="absolute bottom-5 left-6 flex items-center space-x-3 z-30">
        {/* 教学模式开关 */}
        <div
          className="pointer-events-auto bg-slate-950/80 border border-slate-800/80 backdrop-blur-md px-2 py-1.5 rounded-lg flex items-center space-x-2 text-[10px] font-mono select-none cursor-pointer hover:border-cyan-500/50 transition-colors"
          onClick={() => setTeachingMode(!teachingMode)}
          title={lang === 'zh' ? '切换教学观测模式' : 'Toggle Teaching Mode'}
        >
          <span className={`transition-colors ${teachingMode ? 'text-cyan-400 font-bold' : 'text-slate-500'}`}>
            {lang === 'zh' ? '教学' : 'TEACH'}
          </span>

          <div className={`relative w-8 h-4 rounded-full transition-colors ${teachingMode ? 'bg-cyan-500/40' : 'bg-slate-700/50'}`}>
            <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform duration-300 ${teachingMode ? 'translate-x-0 bg-cyan-400 shadow-[0_0_5px_#22d3ee]' : 'translate-x-4 bg-slate-400'}`} />
          </div>

          <span className={`transition-colors ${!teachingMode ? 'text-cyan-400 font-bold' : 'text-slate-500'}`}>
            {lang === 'zh' ? '真实' : 'REAL'}
          </span>
        </div>

        {/* 底部缩放尺读数 */}
        <div
          className="pointer-events-none bg-slate-950/80 border border-slate-800/80 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center space-x-2 text-[10px] font-mono select-none"
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

      {/* 24节气日照时钟仪表盘 */}
      {demoState?.activePhenomenon === 'solar-terms' && (
        <div 
          className="absolute bottom-5 right-6 z-30 pointer-events-auto bg-slate-950/85 border border-slate-800/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-4 text-slate-100 flex flex-col space-y-3.5 w-[280px] select-none animate-in fade-in duration-300"
          id="solar-terms-daylight-observatory"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#f59e0b]" />
              <span className="font-bold text-xs tracking-wider text-amber-400">
                {lang === 'zh' ? '日照观测台' : 'Daylight Observatory'}
              </span>
            </div>
            <span className="text-[10px] bg-slate-850 px-2 py-0.5 rounded text-slate-400 font-mono">
              {lang === 'zh' ? '北京 40°N' : 'Beijing 40°N'}
            </span>
          </div>

          {/* Active solar term indicator */}
          <div className="bg-slate-900/40 rounded-lg py-1.5 px-3 border border-white/5 flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>{lang === 'zh' ? '当前选中节气:' : 'Selected Term:'}</span>
            <span className="text-amber-400 font-bold">
              {currentTerm ? (lang === 'zh' ? currentTerm.nameZh : currentTerm.nameEn) : (lang === 'zh' ? '春分' : 'Spring Equinox')}
            </span>
          </div>

          {/* Circular Clock Dial */}
          <div className="relative w-28 h-28 mx-auto flex items-center justify-center rounded-full border border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.6)] overflow-hidden">
            {/* Dynamic conic-gradient background */}
            <div 
              ref={solarClockFaceRef}
              className="absolute inset-0 w-full h-full rounded-full transition-all duration-300"
            />
            {/* Center glass cap / disc overlay */}
            <div className="absolute w-[82%] h-[82%] rounded-full bg-slate-950/75 backdrop-blur-[2px] border border-white/5 flex items-center justify-center z-10">
              {/* Hour scale markers */}
              <span className="absolute top-1.5 text-[8px] font-bold font-mono text-blue-300/80">00</span>
              <span className="absolute right-1.5 text-[8px] font-bold font-mono text-amber-400/80">06</span>
              <span className="absolute bottom-1.5 text-[8px] font-bold font-mono text-amber-500/80">12</span>
              <span className="absolute left-1.5 text-[8px] font-bold font-mono text-blue-400/80">18</span>
              
              {/* Digital local solar time readout */}
              <div className="flex flex-col items-center mt-2.5">
                <span 
                  ref={solarTimeTextRef}
                  className="text-sm font-bold font-mono text-white tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                >
                  12:00
                </span>
                <span className="text-[7px] text-slate-500 uppercase tracking-widest">
                  {lang === 'zh' ? '地方太阳时' : 'Solar Time'}
                </span>
              </div>
            </div>
            {/* Clock needle hand */}
            <div 
              ref={solarClockNeedleRef}
              className="absolute inset-0 z-20 pointer-events-none transition-transform duration-75"
              style={{ transform: 'rotate(180deg)' }}
            >
              {/* Needle hand line */}
              <div className="absolute top-2.5 bottom-1/2 left-1/2 -translate-x-1/2 w-[2px] bg-gradient-to-t from-amber-500 via-amber-400 to-white rounded-full shadow-[0_0_6px_#f59e0b]" />
              {/* Pointer tip dot */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_#fff]" />
              {/* Center cap pivot */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-slate-900 border-2 border-amber-400 shadow-[0_0_4px_rgba(245,158,11,0.5)]" />
            </div>
          </div>

          {/* Stats details panel */}
          <div className="bg-slate-900/60 rounded-xl p-3 border border-white/5 space-y-2 text-[10px] font-mono">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">{lang === 'zh' ? '直射点纬度' : 'Declination'}:</span>
              <span ref={solarDeclinationTextRef} className="text-slate-200 font-bold">-</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">{lang === 'zh' ? '白昼时长' : 'Daylight Hours'}:</span>
              <span ref={solarDaylightHoursTextRef} className="text-amber-400 font-bold font-sans">-</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">{lang === 'zh' ? '黑夜时长' : 'Night Hours'}:</span>
              <span ref={solarNightHoursTextRef} className="text-blue-400 font-bold font-sans">-</span>
            </div>
            <div className="border-t border-white/5 pt-1.5 text-center">
              <span ref={solarStateTextRef} className="font-bold">-</span>
            </div>
          </div>

          {/* Control play/pause simulation button */}
          <button
            onClick={() => {
              const nextState = !isRotationSimActive;
              setIsRotationSimActive(nextState);
              isRotationSimActiveRef.current = nextState;
            }}
            className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all duration-300 border ${
              isRotationSimActive
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)] hover:bg-amber-500/30'
                : 'bg-slate-900 border-slate-800 hover:border-amber-500/50 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {isRotationSimActive ? (
              <>
                <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                </svg>
                <span>{lang === 'zh' ? '暂停自转模拟' : 'Pause Rotation Sim'}</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 text-slate-300" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <span>{lang === 'zh' ? '开始自转模拟' : 'Start Rotation Sim'}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
