/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TimeEngine } from '../engine/TimeEngine';
import { OrbitEngine } from '../engine/OrbitEngine';
import { AstrophenomenaEngine } from '../engine/AstrophenomenaEngine';
import { ObserverEngine } from '../engine/ObserverEngine';
import { translations } from '../i18n';
import type { PhenomenaDemoState } from '../types/astronomy';
import { SATELLITE_CATALOG } from '../engine/SatelliteData';
import { STAR_LIST, CONSTELLATIONS, BRIGHT_STAR_COUNT, DetailedStar } from '../engine/StarDatabase';
import { EXTRA_STARS, EXTRA_CONSTELLATIONS } from '../engine/ExtraStarsDatabase';
import {
  createProceduralMoonTexture,
  createSaturnRingTexture,
  createSolarCoronaTexture,
  createBrightStarGlowTexture,
  createCircleTexture,
  createConstellationLabelTexture,
  createConstellationLabelSprite,
} from '../engine/TextureFactory';

import { loadHipparcosCatalog, bvToRgb } from '../engine/HipparcosLoader';
import TelescopeOverlay from './TelescopeOverlay';

// 建立 star id 到 star 数据的统一映射（用于 EXTRA_CONSTELLATIONS 连线查找）
const ALL_STARS_MAP = new Map<number, DetailedStar>();
STAR_LIST.forEach(s => ALL_STARS_MAP.set(s.id, s));
EXTRA_STARS.forEach(s => ALL_STARS_MAP.set(s.id, s));

// Planet Definition for Interactive Sprites
interface PlanetInfo {
  id: string;
  nameZh: string;
  nameEn: string;
  color: number;
  mag: number;
  typeZh: string;
  typeEn: string;
  infoZh: string;
  infoEn: string;
}

const PLANETS: PlanetInfo[] = [
  { 
    id: 'venus', 
    nameZh: '金星', 
    nameEn: 'Venus', 
    color: 0xffeed0, 
    mag: -4.4, 
    typeZh: '行星 / 启明星', 
    typeEn: 'Planet / Morning Star', 
    infoZh: '金星是离地球最近的行星，其浓厚的大气层产生剧烈的温室效应，表面温度极高。在地面观测中，它是除月亮外最亮的夜空天体。', 
    infoEn: 'Venus is the closest planet to Earth. Its thick atmosphere creates a runaway greenhouse effect. It is the brightest natural object in the night sky besides the Moon.' 
  },
  { 
    id: 'mars', 
    nameZh: '火星', 
    nameEn: 'Mars', 
    color: 0xff5533, 
    mag: -2.0, 
    typeZh: '行星 / 荧惑', 
    typeEn: 'Planet / Red Planet', 
    infoZh: '火星是太阳系由内往外数第四颗行星，地表覆盖着大量的氧化铁沙尘，呈现标志性的火红色。', 
    infoEn: 'Mars is the fourth planet from the Sun. Its surface is rich in iron oxide, giving it a characteristic reddish appearance.' 
  },
  { 
    id: 'jupiter', 
    nameZh: '木星', 
    nameEn: 'Jupiter', 
    color: 0xffd54f, 
    mag: -2.7, 
    typeZh: '行星 / 岁星', 
    typeEn: 'Planet / Gas Giant', 
    infoZh: '木星是太阳系中体积和质量最大的行星，一颗拥有数十颗卫星的气态巨行星。其著名的大红斑是一个持续了数百年的超级风暴。', 
    infoEn: 'Jupiter is the largest planet in the Solar System, a massive gas giant with dozens of moons. Its Great Red Spot is a persistent anticyclonic storm.' 
  },
  { 
    id: 'saturn', 
    nameZh: '土星', 
    nameEn: 'Saturn', 
    color: 0xffe57f, 
    mag: 0.6, 
    typeZh: '行星 / 镇星', 
    typeEn: 'Planet / Ringed Planet', 
    infoZh: '土星是太阳系第二大行星，以其壮丽的行星环系统闻名于世，是一颗低密度的气态巨行星。', 
    infoEn: 'Saturn is the second-largest planet in the Solar System, famous for its extensive and beautiful ring system.' 
  }
];

// Helper to extract star info with fallbacks for those without explicit descriptions
const getStarInfo = (star: DetailedStar, lang: 'zh' | 'en') => {
  const isZh = lang === 'zh';
  const name = isZh ? star.nameZh : star.nameEn;
  const constell = isZh ? star.constellZh : star.constellEn;
  const info = isZh 
    ? (star.infoZh || `${name}是位于${constell}的一颗恒星。它的视星等为${star.mag}，距离我们约${star.dist}光年。`)
    : (star.infoEn || `${name} is a star in the constellation ${constell}. It has an apparent magnitude of ${star.mag} and is located approximately ${star.dist} light-years away.`);
  const expanded = isZh
    ? (star.expandedZh || `在地面观测中，可以通过它的赤经(${star.ra.toFixed(2)}h) and 赤纬(${star.dec.toFixed(2)}°)坐标在星空中定位它。`)
    : (star.expandedEn || `It can be located in the night sky using its Right Ascension (${star.ra.toFixed(2)}h) and Declination (${star.dec.toFixed(2)}°) coordinates.`);
  return { info, expanded };
};

// Coordinate transformations: Equatorial (RA, Dec) -> Horizontal (Az, Alt)
// For non-Earth observers, RA/Dec are first rotated from J2000 Earth equatorial
// into the observer body's local equatorial frame so that the planet's rotation
// axis defines the local north pole (critical for Uranus, Saturn, etc.).
const getHorizontalCoordinates = (ra: number, dec: number, lst: number, lat: number, bodyId?: string) => {
  let effectiveRa = ra;
  let effectiveDec = dec;

  if (bodyId && bodyId !== 'earth') {
    const conv = ObserverEngine.toBodyEquatorial(bodyId, ra, dec);
    effectiveRa = conv.ra;
    effectiveDec = conv.dec;
  }

  const decRad = (effectiveDec * Math.PI) / 180.0;
  const latRad = (lat * Math.PI) / 180.0;

  // HA = LST - RA (LST in hours, RA in hours. 1 hour = 15 degrees)
  let haDeg = (lst - effectiveRa) * 15.0;
  haDeg = haDeg % 360;
  if (haDeg < 0) haDeg += 360;
  const haRad = (haDeg * Math.PI) / 180.0;

  // Altitude
  const sinAlt = Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  const altRad = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const altDeg = (altRad * 180.0) / Math.PI;

  // Azimuth
  const y = -Math.sin(haRad) * Math.cos(decRad);
  const x = Math.cos(latRad) * Math.sin(decRad) - Math.sin(latRad) * Math.cos(decRad) * Math.cos(haRad);
  let azRad = Math.atan2(y, x);
  let azDeg = (azRad * 180.0) / Math.PI;
  azDeg = (azDeg + 360) % 360; // 0 is North, 90 East, 180 South, 270 West

  return { az: azDeg, alt: altDeg };
};

// Project alt/az coordinates to 3D dome position
const get3DPositionOnDome = (az: number, alt: number, radius: number): THREE.Vector3 => {
  const azRad = (az * Math.PI) / 180.0;
  const altRad = (alt * Math.PI) / 180.0;

  // Z points North, X points East, Y points Zenith
  const x = radius * Math.cos(altRad) * Math.sin(azRad);
  const y = radius * Math.sin(altRad);
  const z = -radius * Math.cos(altRad) * Math.cos(azRad);

  return new THREE.Vector3(x, y, z);
};

/**
 * Calculate Three.js sphere scale so that a body subtends its correct angular diameter.
 *
 * The base SphereGeometry(7.2) at distance 270 gives ~3.05° visual — this is used
 * as the reference for the Moon from Earth (actual 0.5°, exaggerated 6.1x for UX).
 * For small bodies (< 3° actual) we keep the same exaggeration factor so sizes remain
 * proportional to the Moon. For large bodies (>= 3° actual) we render at actual size
 * because they are already visually impressive.
 */
const getAngularScale = (angularDiameterArcmin: number, distance: number = 270, baseRadius: number = 7.2): number => {
  const actualDeg = angularDiameterArcmin / 60.0;
  const MOON_ACTUAL_DEG = 0.5;
  const BASE_VISUAL_DEG = 2 * Math.atan(baseRadius / distance) * (180 / Math.PI); // ~3.05°

  let visualDeg: number;
  if (actualDeg < 3.0) {
    // Exaggerate small bodies proportionally to the Moon reference
    const exaggeration = BASE_VISUAL_DEG / MOON_ACTUAL_DEG;
    visualDeg = actualDeg * exaggeration;
  } else {
    // Large bodies: render at actual angular size
    visualDeg = actualDeg;
  }

  return (distance / baseRadius) * Math.tan((visualDeg * Math.PI / 180.0) / 2);
};

// ═══════════════════════════════════════════════════════════════
//  Atmospheric configuration per celestial body
// ═══════════════════════════════════════════════════════════════

interface AtmosphereConfig {
  dayColor: [number, number, number];
  twilightColor: [number, number, number];
  nightColor: [number, number, number];
  twilightWidth: number;     // degrees: how wide the dawn/dusk transition is
  starDayVisible: boolean;   // can stars be seen while sun is above horizon?
  opaqueAtmosphere: boolean; // if true, stars are never visible (thick clouds)
  groundColor: number;       // hex color for the ground plane
}

const ATMOSPHERE_CONFIG: Record<string, AtmosphereConfig> = {
  earth: {
    dayColor: [0.4, 0.6, 1.0],
    twilightColor: [0.6, 0.35, 0.15],
    nightColor: [0.02, 0.03, 0.06],
    twilightWidth: 18,
    starDayVisible: false,
    opaqueAtmosphere: false,
    groundColor: 0x05130b,
  },
  mercury: {
    dayColor: [0.0, 0.0, 0.0],
    twilightColor: [0.0, 0.0, 0.0],
    nightColor: [0.0, 0.0, 0.0],
    twilightWidth: 0,
    starDayVisible: true,
    opaqueAtmosphere: false,
    groundColor: 0x4a4a4a,
  },
  venus: {
    dayColor: [0.85, 0.65, 0.25],
    twilightColor: [0.9, 0.5, 0.1],
    nightColor: [0.05, 0.03, 0.01],
    twilightWidth: 25,
    starDayVisible: false,
    opaqueAtmosphere: true,
    groundColor: 0x8b7355,
  },
  mars: {
    dayColor: [0.75, 0.55, 0.45],
    twilightColor: [0.35, 0.45, 0.65], // Blue sunsets on Mars (Rayleigh scattering at low angles)
    nightColor: [0.06, 0.03, 0.02],
    twilightWidth: 15,
    starDayVisible: false,
    opaqueAtmosphere: false,
    groundColor: 0x3d1a0f,
  },
  jupiter: {
    dayColor: [0.85, 0.8, 0.65],
    twilightColor: [0.9, 0.75, 0.4],
    nightColor: [0.04, 0.03, 0.02],
    twilightWidth: 12,
    starDayVisible: false,
    opaqueAtmosphere: true,
    groundColor: 0x5a3d1a,
  },
  saturn: {
    dayColor: [0.8, 0.75, 0.6],
    twilightColor: [0.85, 0.7, 0.35],
    nightColor: [0.04, 0.03, 0.02],
    twilightWidth: 12,
    starDayVisible: false,
    opaqueAtmosphere: true,
    groundColor: 0x3d3429,
  },
  uranus: {
    dayColor: [0.35, 0.65, 0.7],
    twilightColor: [0.4, 0.7, 0.75],
    nightColor: [0.01, 0.03, 0.04],
    twilightWidth: 15,
    starDayVisible: false,
    opaqueAtmosphere: false,
    groundColor: 0x2a3d3d,
  },
  neptune: {
    dayColor: [0.2, 0.4, 0.75],
    twilightColor: [0.25, 0.45, 0.8],
    nightColor: [0.01, 0.02, 0.05],
    twilightWidth: 15,
    starDayVisible: false,
    opaqueAtmosphere: false,
    groundColor: 0x1a2a3d,
  },
  moon: {
    dayColor: [0.0, 0.0, 0.0],
    twilightColor: [0.0, 0.0, 0.0],
    nightColor: [0.0, 0.0, 0.0],
    twilightWidth: 0,
    starDayVisible: true,
    opaqueAtmosphere: false,
    groundColor: 0x2a2a2e,
  },
  // Major moons — default to vacuum (no atmosphere)
  phobos:   { dayColor: [0,0,0], twilightColor: [0,0,0], nightColor: [0,0,0], twilightWidth: 0, starDayVisible: true, opaqueAtmosphere: false, groundColor: 0x4a4a4a },
  deimos:   { dayColor: [0,0,0], twilightColor: [0,0,0], nightColor: [0,0,0], twilightWidth: 0, starDayVisible: true, opaqueAtmosphere: false, groundColor: 0x4a4a4a },
  io:       { dayColor: [0,0,0], twilightColor: [0,0,0], nightColor: [0,0,0], twilightWidth: 0, starDayVisible: true, opaqueAtmosphere: false, groundColor: 0x3d2a0f },
  europa:   { dayColor: [0,0,0], twilightColor: [0,0,0], nightColor: [0,0,0], twilightWidth: 0, starDayVisible: true, opaqueAtmosphere: false, groundColor: 0x2a2a3d },
  ganymede: { dayColor: [0,0,0], twilightColor: [0,0,0], nightColor: [0,0,0], twilightWidth: 0, starDayVisible: true, opaqueAtmosphere: false, groundColor: 0x2a2a2e },
  callisto: { dayColor: [0,0,0], twilightColor: [0,0,0], nightColor: [0,0,0], twilightWidth: 0, starDayVisible: true, opaqueAtmosphere: false, groundColor: 0x2a2a2e },
  titan:    { dayColor: [0.7, 0.5, 0.2], twilightColor: [0.8, 0.45, 0.15], nightColor: [0.04, 0.02, 0.01], twilightWidth: 20, starDayVisible: false, opaqueAtmosphere: true, groundColor: 0x3d2a0f },
  rhea:     { dayColor: [0,0,0], twilightColor: [0,0,0], nightColor: [0,0,0], twilightWidth: 0, starDayVisible: true, opaqueAtmosphere: false, groundColor: 0x2a2a2e },
  enceladus:{ dayColor: [0,0,0], twilightColor: [0,0,0], nightColor: [0,0,0], twilightWidth: 0, starDayVisible: true, opaqueAtmosphere: false, groundColor: 0x2a3a3d },
  titania:  { dayColor: [0,0,0], twilightColor: [0,0,0], nightColor: [0,0,0], twilightWidth: 0, starDayVisible: true, opaqueAtmosphere: false, groundColor: 0x2a2a2e },
  oberon:   { dayColor: [0,0,0], twilightColor: [0,0,0], nightColor: [0,0,0], twilightWidth: 0, starDayVisible: true, opaqueAtmosphere: false, groundColor: 0x2a2a2e },
  ariel:    { dayColor: [0,0,0], twilightColor: [0,0,0], nightColor: [0,0,0], twilightWidth: 0, starDayVisible: true, opaqueAtmosphere: false, groundColor: 0x2a2a2e },
  triton:   { dayColor: [0,0,0], twilightColor: [0,0,0], nightColor: [0,0,0], twilightWidth: 0, starDayVisible: true, opaqueAtmosphere: false, groundColor: 0x2a2a3d },
  proteus:  { dayColor: [0,0,0], twilightColor: [0,0,0], nightColor: [0,0,0], twilightWidth: 0, starDayVisible: true, opaqueAtmosphere: false, groundColor: 0x2a2a3d },
};

/**
 * Compute sky RGB and brightness for the observer's body based on sun altitude.
 */
const getAtmosphereColors = (bodyId: string, sunAlt: number): { r: number; g: number; b: number; brightness: number; ambientIntensity: number; starDayVisible: boolean; opaqueAtmosphere: boolean; dayColor: [number, number, number]; nightColor: [number, number, number] } => {
  const cfg = ATMOSPHERE_CONFIG[bodyId] ?? ATMOSPHERE_CONFIG['earth'];

  // Calculate sky brightness factor (0 = night, 1 = full day)
  let brightness = 0;
  const twilight = cfg.twilightWidth;
  if (twilight <= 0) {
    brightness = sunAlt > 0 ? 0 : 0;
  } else if (sunAlt >= twilight) {
    brightness = 1.0;
  } else if (sunAlt > 0) {
    brightness = 0.1 + 0.9 * (sunAlt / twilight);
  } else if (sunAlt >= -twilight) {
    brightness = 0.1 * ((sunAlt + twilight) / twilight);
  } else {
    brightness = 0.0;
  }

  // Interpolate between night and day colors
  const r = cfg.nightColor[0] * (1.0 - brightness) + cfg.dayColor[0] * brightness;
  const g = cfg.nightColor[1] * (1.0 - brightness) + cfg.dayColor[1] * brightness;
  const b = cfg.nightColor[2] * (1.0 - brightness) + cfg.dayColor[2] * brightness;

  // Add sunset/twilight tint when sun is near horizon
  const sunsetFactor = Math.max(0.0, 1.0 - Math.abs(sunAlt - (-2.0)) / 4.0);
  const sunsetR = r * (1.0 - sunsetFactor) + cfg.twilightColor[0] * sunsetFactor;
  const sunsetG = g * (1.0 - sunsetFactor) + cfg.twilightColor[1] * sunsetFactor;
  const sunsetB = b * (1.0 - sunsetFactor) + cfg.twilightColor[2] * sunsetFactor;

  return {
    r: Math.max(0.0, Math.min(1.0, sunsetR)),
    g: Math.max(0.0, Math.min(1.0, sunsetG)),
    b: Math.max(0.0, Math.min(1.0, sunsetB)),
    brightness,
    ambientIntensity: 0.35 * brightness + 0.02,
    starDayVisible: cfg.starDayVisible,
    opaqueAtmosphere: cfg.opaqueAtmosphere,
    dayColor: cfg.dayColor as [number, number, number],
    nightColor: cfg.nightColor as [number, number, number],
  };
};

/**
 * 设置潮汐锁定天体的稳定朝向：
 * 设置潮汐锁定天体的稳定朝向：
 * - +z 轴始终精确指向观察者（正面朝向地球）
 * - +y 轴始终指向天球北天极（世界 Y 轴），避免 gimbal lock
 *
 * 与默认 lookAt 不同，此方法使用显式四元数计算，
 * 即使天体接近天顶（目标方向与北天极平行）也能保持 roll 稳定。
 */
function setTidallyLockedOrientation(
  body: THREE.Object3D,
  observerPos: THREE.Vector3,
  celestialNorth: THREE.Vector3 = new THREE.Vector3(0, 1, 0)
): void {
  const toObserver = new THREE.Vector3().subVectors(observerPos, body.position).normalize();

  // 处理天顶附近的 gimbal lock：当目标方向与北天极几乎平行时，换用备用 up
  let up = celestialNorth.clone();
  if (Math.abs(toObserver.dot(up)) > 0.999) {
    up.set(0, 0, 1);
  }

  const right = new THREE.Vector3().crossVectors(up, toObserver).normalize();
  const trueUp = new THREE.Vector3().crossVectors(toObserver, right).normalize();

  // SphereGeometry 的正面是 +z 方向，因此需要 -toObserver 作为 z 基向量
  const matrix = new THREE.Matrix4().makeBasis(right, trueUp, toObserver.clone().negate());
  body.quaternion.setFromRotationMatrix(matrix);
}

/** Texture URLs for dominant body rendering */
const DOMINANT_BODY_TEXTURES: Record<string, string> = {
  mercury: '/textures/8k_mercury.jpg',
  venus: '/textures/8k_venus_surface.jpg',
  earth: '/textures/8k_earth_daymap.jpg',
  moon: '/textures/8k_moon.jpg',
  mars: '/textures/8k_mars.jpg',
  jupiter: '/textures/8k_jupiter.jpg',
  saturn: '/textures/8k_saturn.jpg',
  uranus: '/textures/8k_uranus.jpg',
  neptune: '/textures/8k_neptune.jpg',
  sun: '/textures/8k_sun.jpg',
};

/** Icons for celestial bodies */
const BODY_ICONS: Record<string, string> = {
  sun: '\u{2609}',
  mercury: '\u{263F}',
  venus: '\u{2640}',
  earth: '\u{1F30D}',
  moon: '\u{1F319}',
  mars: '\u{2642}',
  jupiter: '\u{2643}',
  saturn: '\u{2644}',
  uranus: '\u{26A2}',
  neptune: '\u{2646}',
};

function getDominantBodyInfo(observerId: string): { id: string; nameZh: string; nameEn: string; icon: string; textureUrl: string } | null {
  switch (observerId) {
    case 'earth':
      return { id: 'moon', nameZh: '月球', nameEn: 'The Moon', icon: BODY_ICONS.moon, textureUrl: DOMINANT_BODY_TEXTURES.moon };
    case 'moon':
      return { id: 'earth', nameZh: '地球', nameEn: 'Earth', icon: BODY_ICONS.earth, textureUrl: DOMINANT_BODY_TEXTURES.earth };
    default: {
      // Check if observer is a natural satellite → parent planet is dominant
      const sat = SATELLITE_CATALOG.find(s => s.id === observerId);
      if (sat) {
        const parentId = sat.parentId;
        const parentNameZh = (() => {
          switch (parentId) {
            case 'mercury': return '水星';
            case 'venus': return '金星';
            case 'earth': return '地球';
            case 'mars': return '火星';
            case 'jupiter': return '木星';
            case 'saturn': return '土星';
            case 'uranus': return '天王星';
            case 'neptune': return '海王星';
            default: return parentId;
          }
        })();
        const parentNameEn = parentId.charAt(0).toUpperCase() + parentId.slice(1);
        return {
          id: parentId,
          nameZh: parentNameZh,
          nameEn: parentNameEn,
          icon: BODY_ICONS[parentId] || '\u{1F30D}',
          textureUrl: DOMINANT_BODY_TEXTURES[parentId] || '',
        };
      }
      return null;
    }
  }
}

/** Get display name for any observer body (planet or satellite) */
function getObserverBodyName(observerId: string, lang: 'zh' | 'en'): string {
  const sat = SATELLITE_CATALOG.find(s => s.id === observerId);
  if (sat) {
    return lang === 'zh' ? sat.nameZh : sat.nameEn;
  }
  // Planets use hardcoded names with symbols
  switch (observerId) {
    case 'sun': return lang === 'zh' ? '\u{2609} 太阳' : '\u{2609} Sun';
    case 'mercury': return lang === 'zh' ? '\u{263F} 水星' : '\u{263F} Mercury';
    case 'venus': return lang === 'zh' ? '\u{2640} 金星' : '\u{2640} Venus';
    case 'earth': return lang === 'zh' ? '\u{1F30D} 地球' : '\u{1F30D} Earth';
    case 'moon': return lang === 'zh' ? '\u{1F319} 月球' : '\u{1F319} Moon';
    case 'mars': return lang === 'zh' ? '\u{2642} 火星' : '\u{2642} Mars';
    case 'jupiter': return lang === 'zh' ? '\u{2643} 木星' : '\u{2643} Jupiter';
    case 'saturn': return lang === 'zh' ? '\u{2644} 土星' : '\u{2644} Saturn';
    case 'uranus': return lang === 'zh' ? '\u{26A2} 天王星' : '\u{26A2} Uranus';
    case 'neptune': return lang === 'zh' ? '\u{2646} 海王星' : '\u{2646} Neptune';
    default: return observerId;
  }
}

function loadRealTexture(
  url: string,
  cacheRef: React.MutableRefObject<Record<string, THREE.Texture>>,
  onLoad: (tex: THREE.Texture) => void
): void {
  if (cacheRef.current[url]) {
    onLoad(cacheRef.current[url]);
    return;
  }
  const loader = new THREE.TextureLoader();
  loader.load(url, (tex) => {
    cacheRef.current[url] = tex;
    onLoad(tex);
  });
}

interface StarrySkyViewerProps {
  currentTimestamp: number;
  latitude: number;
  longitude: number;
  observerBodyId: string;
  lang: 'zh' | 'en';
  showConstellLines: boolean;
  showStarNames: boolean;
  showConstellNames?: boolean;
  magLimit?: number;
  telescopeActive?: boolean;
  onTelescopeChange?: (active: boolean) => void;
  textureOffsets?: Record<string, { u: number; v: number }>;
  onChangeTextureOffset?: (planetId: string, offset: { u: number; v: number }) => void;
  exposure?: number;
  demoState?: PhenomenaDemoState;
}

export default function StarrySkyViewer({
  currentTimestamp,
  latitude,
  longitude,
  observerBodyId,
  lang,
  showConstellLines,
  showStarNames,
  showConstellNames = false,
  magLimit = 5.5,
  telescopeActive = false,
  onTelescopeChange,
  textureOffsets = {},
  onChangeTextureOffset,
  exposure = 1.5,
  demoState
}: StarrySkyViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  //天球星体渲染组及元素引用
  const starsGroupRef = useRef<THREE.Group | null>(null);
  const sunSkyRef = useRef<THREE.Mesh | null>(null);
  const moonSkyRef = useRef<THREE.Mesh | null>(null);
  const sunCoronaSpriteRef = useRef<THREE.Sprite | null>(null);
  const moonHazeSpriteRef = useRef<THREE.Sprite | null>(null);
  const planetRingRef = useRef<THREE.Mesh | null>(null);
  const lightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const constellLinesRef = useRef<THREE.LineSegments | null>(null);
  const constellLabelGroupRef = useRef<THREE.Group | null>(null);
  const constellLabelSpritesRef = useRef<THREE.Sprite[]>([]);
  const extraConstellLabelGroupRef = useRef<THREE.Group | null>(null);
  const extraConstellLabelSpritesRef = useRef<THREE.Sprite[]>([]);

  // 10,000星和行星渲染引用
  const starSpritesRef = useRef<THREE.Sprite[]>([]);
  const extraStarSpritesRef = useRef<THREE.Sprite[]>([]);
  const planetSpritesRef = useRef<Record<string, THREE.Sprite>>({});
  const backgroundPointsRef = useRef<THREE.Points | null>(null);

  // Hipparcos 真实星表数据（用于背景星渲染）
  const hipparcosRef = useRef<{ ra: number; dec: number; mag: number; color: number }[]>([]);

  // 属性的动态Ref封装，规避渲染动画闭包过时问题
  const latitudeRef = useRef(latitude);
  const longitudeRef = useRef(longitude);
  const currentTimestampRef = useRef(currentTimestamp);
  const skyBrightnessRef = useRef(0);
  const sunAltRef = useRef(0);
  const langRef = useRef(lang);
  const magLimitRef = useRef(magLimit);

  // 三维FOV缩放控制 (3° ~ 65°)
  const fovRef = useRef(65);
  const preTelescopeFovRef = useRef(65);

  // 本地 FOV 设置函数（替代全局 window 污染）
  const setFov = (fov: number) => {
    if (!cameraRef.current) return;
    cameraRef.current.fov = fov;
    cameraRef.current.updateProjectionMatrix();
    fovRef.current = fov;
  };

  const textureCacheRef = useRef<Record<string, THREE.Texture>>({});
  const observerBodyIdRef = useRef(observerBodyId);

  // 辅助函数：基于当前观测者参考系计算本地恒星时（支持任意天体）
  const getObserverLST = () => {
    const ctx = { bodyId: observerBodyIdRef.current, latitude: latitudeRef.current, longitude: longitudeRef.current };
    return ObserverEngine.getLocalSiderealTime(ctx, currentTimestampRef.current);
  };

  const textureOffsetsRef = useRef(textureOffsets);
  const satelliteSpritesRef = useRef<Record<string, THREE.Sprite>>({});

  // 磁吸snap目标跟踪
  const snapTargetRef = useRef<THREE.Sprite | THREE.Mesh | null>(null);

  // Demo mode refs
  const demoStateRef = useRef(demoState);
  const sunPathArcRef = useRef<THREE.Line | null>(null);

  // 选中天体的屏幕坐标（用于SVG圈圈跟随）
  const [selectedScreenPos, setSelectedScreenPos] = useState<{ x: number; y: number } | null>(null);
  const selectedObjectRef = useRef<THREE.Object3D | null>(null);

  // 选中圆圈动画闪烁key（每次点击就重置动画）
  const [selectionRingKey, setSelectionRingKey] = useState(0);

  useEffect(() => {
    latitudeRef.current = latitude;
  }, [latitude]);

  useEffect(() => {
    longitudeRef.current = longitude;
  }, [longitude]);

  useEffect(() => {
    currentTimestampRef.current = currentTimestamp;
  }, [currentTimestamp]);

  useEffect(() => {
    textureOffsetsRef.current = textureOffsets;
  }, [textureOffsets]);

  useEffect(() => {
    demoStateRef.current = demoState;
  }, [demoState]);

  useEffect(() => {
    observerBodyIdRef.current = observerBodyId;

    // Update ground color and visibility when observer body changes
    const scene = sceneRef.current;
    const isGasGiant = ['jupiter', 'saturn', 'uranus', 'neptune'].includes(observerBodyId);
    if (scene) {
      const ground = scene.getObjectByName('ground-mesh') as THREE.Mesh | undefined;
      if (ground) {
        const cfg = ATMOSPHERE_CONFIG[observerBodyId];
        const mat = ground.material as THREE.MeshBasicMaterial;
        mat.color.setHex(cfg?.groundColor ?? 0x05130b);
        ground.visible = !isGasGiant;
      }
      const horizonRing = scene.getObjectByName('horizon-ring') as THREE.Mesh | undefined;
      if (horizonRing) {
        horizonRing.visible = !isGasGiant;
      }
    }

    // Update dominant body (moonSkyRef) texture and appearance
    const moonSky = moonSkyRef.current;
    if (moonSky) {
      const moonMat = moonSky.material as THREE.MeshStandardMaterial;
      const dominant = getDominantBodyInfo(observerBodyId);
      if (dominant) {
        moonSky.visible = true;
        if (observerBodyId === 'earth') {
          moonSky.scale.setScalar(1.0);
          moonMat.color.setHex(0xffffff);
          moonMat.emissive.setHex(0x000000);
          moonMat.emissiveIntensity = 0;
          loadRealTexture(dominant.textureUrl, textureCacheRef, (tex) => {
            if (observerBodyIdRef.current === 'earth' && moonSkyRef.current) {
              const off = textureOffsetsRef.current['moon'] ?? { u: 0, v: 0 };
              tex.wrapS = THREE.RepeatWrapping;
              tex.wrapT = THREE.ClampToEdgeWrapping;
              tex.minFilter = THREE.LinearFilter;
              tex.offset.x = 0.25 + off.u;
              tex.offset.y = off.v;
              (moonSkyRef.current.material as THREE.MeshStandardMaterial).map = tex;
              (moonSkyRef.current.material as THREE.MeshStandardMaterial).needsUpdate = true;
            }
          });
          // 重置光晕为月球白色
          if (moonHazeSpriteRef.current) {
            moonHazeSpriteRef.current.position.set(0, 0, 0);
            moonHazeSpriteRef.current.material.color.setHex(0xffffff);
          }
        } else if (observerBodyId === 'moon') {
          moonSky.scale.setScalar(4.0);
          moonMat.color.setHex(0xffffff);
          moonMat.emissive.setHex(0x1a5a8a);
          moonMat.emissiveIntensity = 0.6;
          loadRealTexture(dominant.textureUrl, textureCacheRef, (tex) => {
            if (observerBodyIdRef.current === 'moon' && moonSkyRef.current) {
              const off = textureOffsetsRef.current['earth'] ?? { u: 0, v: 0 };
              tex.wrapS = THREE.RepeatWrapping;
              tex.wrapT = THREE.ClampToEdgeWrapping;
              tex.minFilter = THREE.LinearFilter;
              tex.offset.x = 0.25 + off.u;
              tex.offset.y = off.v;
              (moonSkyRef.current.material as THREE.MeshStandardMaterial).map = tex;
              (moonSkyRef.current.material as THREE.MeshStandardMaterial).needsUpdate = true;
            }
          });
          // 地球蓝晕光（从月球看地球）
          if (moonHazeSpriteRef.current) {
            moonHazeSpriteRef.current.position.set(0, 0, 0);
            moonHazeSpriteRef.current.material.color.setHex(0x88bbff);
            moonHazeSpriteRef.current.material.opacity = 0.6;
          }
        } else {
          // General satellite observer: parent planet as dominant body
          moonSky.scale.setScalar(1.0);
          moonMat.color.setHex(0xffffff);
          moonMat.emissive.setHex(0x000000);
          moonMat.emissiveIntensity = 0;
          loadRealTexture(dominant.textureUrl, textureCacheRef, (tex) => {
            if (observerBodyIdRef.current === observerBodyId && moonSkyRef.current) {
              const off = textureOffsetsRef.current[dominant.id] ?? { u: 0, v: 0 };
              tex.wrapS = THREE.RepeatWrapping;
              tex.wrapT = THREE.ClampToEdgeWrapping;
              tex.minFilter = THREE.LinearFilter;
              tex.offset.x = 0.25 + off.u;
              tex.offset.y = off.v;
              (moonSkyRef.current.material as THREE.MeshStandardMaterial).map = tex;
              (moonSkyRef.current.material as THREE.MeshStandardMaterial).needsUpdate = true;
            }
          });
          if (moonHazeSpriteRef.current) {
            moonHazeSpriteRef.current.visible = false;
          }
        }
      } else {
        moonSky.visible = false;
      }
    }

    // Rebuild satellite sprites for the new observer body
    const starsGroup = starsGroupRef.current;
    if (starsGroup) {
      (Object.values(satelliteSpritesRef.current) as THREE.Sprite[]).forEach(sprite => {
        starsGroup.remove(sprite);
        sprite.material.dispose();
      });
      satelliteSpritesRef.current = {};

      const sats = ObserverEngine.getSatellitesInSky(
        { bodyId: observerBodyId, latitude, longitude },
        TimeEngine.getDaysSinceJ2000(currentTimestampRef.current)
      );
      const brightStarTex = createBrightStarGlowTexture();
      const satSprites: Record<string, THREE.Sprite> = {};
      sats.forEach(sat => {
        const baseScale = Math.max(2.0, (5.0 - sat.magnitude) * 1.2);
        const mat = new THREE.SpriteMaterial({
          map: brightStarTex,
          color: new THREE.Color(sat.color),
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(baseScale, baseScale, 1.0);
        sprite.userData = {
          id: sat.id,
          name: sat.nameEn,
          nameZh: sat.nameZh,
          mag: sat.magnitude,
          radius: 275,
          type: 'satellite',
          satelliteData: sat
        };
        starsGroup.add(sprite);
        satSprites[sat.id] = sprite;
      });
      satelliteSpritesRef.current = satSprites;
    }
  }, [observerBodyId]);

  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  // 语言切换时更新星座标签文字
  useEffect(() => {
    if (constellLabelSpritesRef.current.length === 0) return;
    constellLabelSpritesRef.current.forEach((sprite, idx) => {
      const c = CONSTELLATIONS[idx];
      if (!c) return;
      const labelName = lang === 'zh' ? c.nameZh : c.nameEn;
      const { texture, width, height } = createConstellationLabelTexture(labelName);
      const mat = sprite.material as THREE.SpriteMaterial;
      if (mat.map) mat.map.dispose();
      mat.map = texture;
      mat.needsUpdate = true;
      sprite.scale.set(width * 0.06, height * 0.06, 1);
    });
    extraConstellLabelSpritesRef.current.forEach((sprite, idx) => {
      const c = EXTRA_CONSTELLATIONS[idx];
      if (!c) return;
      const labelName = lang === 'zh' ? c.nameZh : c.nameEn;
      const { texture, width, height } = createConstellationLabelTexture(labelName);
      const mat = sprite.material as THREE.SpriteMaterial;
      if (mat.map) mat.map.dispose();
      mat.map = texture;
      mat.needsUpdate = true;
      sprite.scale.set(width * 0.06, height * 0.06, 1);
    });
  }, [lang]);

  useEffect(() => {
    magLimitRef.current = magLimit;
  }, [magLimit]);

  // Telescope mode: save FOV on enter, restore on exit
  useEffect(() => {
    if (telescopeActive) {
      preTelescopeFovRef.current = fovRef.current;
    } else {
      setFov(preTelescopeFovRef.current);
    }
  }, [telescopeActive]);

  const [hoveredCelestial, setHoveredCelestial] = useState<{
    id: string;
    nameZh: string;
    nameEn: string;
    typeZh: string;
    typeEn: string;
    infoZh: string;
    infoEn: string;
    extraZh?: string;
    extraEn?: string;
  } | null>(null);

  const [hoveredPos, setHoveredPos] = useState<{ x: number; y: number } | null>(null);

  const [selectedCelestial, setSelectedCelestial] = useState<{
    id: string;
    nameZh: string;
    nameEn: string;
    typeZh: string;
    typeEn: string;
    mag: number;
    ra: number;
    dec: number;
    infoZh: string;
    infoEn: string;
    extraDetailsZh: string;
    extraDetailsEn: string;
  } | null>(null);

  const daysSinceJ2000Ref = useRef<number>(0);
  const moonPhaseInfoRef = useRef<any>(null);
  const sunRaRef = useRef<number>(0);
  const sunDecRef = useRef<number>(0);
  const moonRaRef = useRef<number>(0);
  const moonDecRef = useRef<number>(0);

  const [skyData, setSkyData] = useState<{
    lst: number;
    sunAlt: number;
    moonAlt: number;
    moonPhasePercent: number;
    moonPhaseName: string;
    solarEclipse: boolean;
    lunarEclipse: boolean;
    dayLength: number; // hours of daylight
    sunDeclination: number; // degrees
  } | null>(null);

  const [compassHeading, setCompassHeading] = useState<number>(0); // 0=北, 顺时针

  const isZh = lang === 'zh';

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.toneMappingExposure = exposure;
    }
    // 同步增强环境暗部细节
    if (ambientLightRef.current) {
      ambientLightRef.current.intensity = 0.15 * exposure;
      if ((ambientLightRef as any).hemiLight) {
        (ambientLightRef as any).hemiLight.intensity = 0.35 * exposure;
      }
    }
  }, [exposure]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. 初始化 Scene, Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const width = container.clientWidth || window.innerWidth || 800;
    const height = container.clientHeight || window.innerHeight || 600;
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000);
    camera.position.set(0, 0, 0.1); // 置于球心
    cameraRef.current = camera;

    // 2. 初始化 WebGL 渲染
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = exposure;
    
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 3. 旋转控制器 (由于镜头在球中心，限定拖动范围让体验变成 VR 直观全景观天)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false; 
    controls.enablePan = false;  
    controls.rotateSpeed = -0.4;  
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // 滚轮缩放：通过调节FOV实现缩放（而非移动镜头）
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!cameraRef.current) return;
      const cam = cameraRef.current;
      const mag = 65 / cam.fov;
      const zoomFactor = e.deltaY > 0 ? 1 / 1.1 : 1.1;
      // Limit zoom range: FOV between 5° (zoomed in) and 65° (zoomed out / normal)
      const newMag = Math.max(1, Math.min(13, mag * zoomFactor));
      const newFov = 65 / newMag;
      cam.fov = newFov;
      cam.updateProjectionMatrix();
      fovRef.current = newFov;
    };
    renderer.domElement.addEventListener('wheel', handleWheel, { passive: false });

    // 4. 环境及平行天体光照
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const light = new THREE.DirectionalLight(0xffffff, 2.5);
    scene.add(light);
    lightRef.current = light;

    const hemiLight = new THREE.HemisphereLight(0x88bbff, 0x111122, 0.35);
    scene.add(hemiLight);
    (ambientLightRef as any).hemiLight = hemiLight; // 暂存，方便下面统一调整

    // 5. 绘制地平线地面：半透明草地网格
    const groundGeo = new THREE.CylinderGeometry(150, 150, 2, 64);
    const groundMat = new THREE.MeshBasicMaterial({
      color: 0x05130b,
      transparent: true,
      opacity: 0.77
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.name = 'ground-mesh';
    ground.position.y = -1.2;
    scene.add(ground);

    // 地平线坐标刻度圈
    const horizonRingGeo = new THREE.RingGeometry(148, 149, 64);
    horizonRingGeo.rotateX(Math.PI / 2);
    const horizonRingMat = new THREE.MeshBasicMaterial({ color: 0x1e3a24, side: THREE.DoubleSide });
    const horizonRing = new THREE.Mesh(horizonRingGeo, horizonRingMat);
    horizonRing.name = 'horizon-ring';
    horizonRing.position.y = -0.1;
    scene.add(horizonRing);

    // 6. 独立天幕球形恒星与连线渲染组
    const starsGroup = new THREE.Group();
    scene.add(starsGroup);
    starsGroupRef.current = starsGroup;

    // 6b. 太阳轨迹弧线（用于四季演示）
    const sunPathArcGeo = new THREE.BufferGeometry();
    const sunPathArcMat = new THREE.LineBasicMaterial({
      color: 0xffaa33,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sunPathArcLine = new THREE.Line(sunPathArcGeo, sunPathArcMat);
    sunPathArcLine.name = 'sun-path-arc';
    scene.add(sunPathArcLine);
    sunPathArcRef.current = sunPathArcLine;

    // A. 明亮恒星 Sprite 创建
    const brightStarTex = createBrightStarGlowTexture();
    const starSprites: THREE.Sprite[] = [];
    const brightStarsData = STAR_LIST.slice(0, BRIGHT_STAR_COUNT);
    
    brightStarsData.forEach(star => {
      const baseScale = Math.max(1.0, (5.0 - star.mag) * 1.2);
      const mat = new THREE.SpriteMaterial({
        map: brightStarTex,
        color: new THREE.Color(star.color),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(baseScale, baseScale, 1.0);
      sprite.userData = { 
        id: star.id, 
        name: star.nameKey, 
        ra: star.ra, 
        dec: star.dec, 
        mag: star.mag,
        radius: 285,
        type: 'star',
        starData: star
      };
      starsGroup.add(sprite);
      starSprites.push(sprite);
    });
    starSpritesRef.current = starSprites;

    // A2. 额外星座恒星 Sprite 创建 (ExtraStarsDatabase)
    const extraStarSprites: THREE.Sprite[] = [];
    EXTRA_STARS.forEach(star => {
      const baseScale = Math.max(0.6, (5.0 - star.mag) * 0.9);
      const mat = new THREE.SpriteMaterial({
        map: brightStarTex,
        color: new THREE.Color(star.color),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(baseScale, baseScale, 1.0);
      sprite.userData = {
        id: star.id,
        name: star.nameKey,
        ra: star.ra,
        dec: star.dec,
        mag: star.mag,
        radius: 285,
        type: 'extraStar',
        starData: star
      };
      starsGroup.add(sprite);
      extraStarSprites.push(sprite);
    });
    extraStarSpritesRef.current = extraStarSprites;

    // B. 4大行星 Sprite 创建
    const planetSprites: Record<string, THREE.Sprite> = {};
    PLANETS.forEach(planet => {
      const baseScale = Math.max(1.5, (5.0 - planet.mag) * 1.2);
      const mat = new THREE.SpriteMaterial({
        map: brightStarTex,
        color: new THREE.Color(planet.color),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(baseScale, baseScale, 1.0);
      sprite.userData = {
        id: planet.id,
        name: planet.nameEn,
        mag: planet.mag,
        radius: 280, 
        type: 'planet',
        planetData: planet
      };
      starsGroup.add(sprite);
      planetSprites[planet.id] = sprite;
    });
    planetSpritesRef.current = planetSprites;

    // C. 背景星星 Point System 创建（异步加载真实 Hipparcos 星表）
    loadHipparcosCatalog().then(stars => {
      const filtered = stars.filter(s => s.mag <= 6.5);
      hipparcosRef.current = filtered.map(s => {
        const rgb = bvToRgb(s.bv);
        return {
          ra: s.ra,
          dec: s.dec,
          mag: s.mag,
          color: new THREE.Color(rgb.r, rgb.g, rgb.b).getHex()
        };
      });

      const bgCount = hipparcosRef.current.length;
      const bgPositions = new Float32Array(bgCount * 3);
      const bgColors = new Float32Array(bgCount * 3);

      // 初始化在地面以下隐藏
      for (let i = 0; i < bgCount; i++) {
        bgPositions[i * 3] = 0;
        bgPositions[i * 3 + 1] = -9999;
        bgPositions[i * 3 + 2] = 0;

        const color = new THREE.Color(hipparcosRef.current[i].color);
        bgColors[i * 3] = color.r;
        bgColors[i * 3 + 1] = color.g;
        bgColors[i * 3 + 2] = color.b;
      }

      const bgGeometry = new THREE.BufferGeometry();
      bgGeometry.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3));
      bgGeometry.setAttribute('color', new THREE.BufferAttribute(bgColors, 3));

      const bgPointsTex = createCircleTexture();
      const bgMaterial = new THREE.PointsMaterial({
        size: 1.5,
        map: bgPointsTex,
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const bgPoints = new THREE.Points(bgGeometry, bgMaterial);
      starsGroup.add(bgPoints);
      backgroundPointsRef.current = bgPoints;
    });

    // D. 星座连线段几何体创建
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x475569,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const linesObj = new THREE.LineSegments(new THREE.BufferGeometry(), lineMat);
    starsGroup.add(linesObj);
    constellLinesRef.current = linesObj;

    // E. 星座名称标签组
    const labelGroup = new THREE.Group();
    starsGroup.add(labelGroup);
    constellLabelGroupRef.current = labelGroup;
    const labelSprites: THREE.Sprite[] = [];
    CONSTELLATIONS.forEach((c) => {
      const labelName = langRef.current === 'zh' ? c.nameZh : c.nameEn;
      const sprite = createConstellationLabelSprite(labelName);
      sprite.visible = false;
      sprite.userData = { constellId: c.id, nameZh: c.nameZh, nameEn: c.nameEn };
      labelGroup.add(sprite);
      labelSprites.push(sprite);
    });
    constellLabelSpritesRef.current = labelSprites;

    // EXTRA_CONSTELLATIONS 名称标签
    const extraLabelGroup = new THREE.Group();
    starsGroup.add(extraLabelGroup);
    extraConstellLabelGroupRef.current = extraLabelGroup;
    const extraLabelSprites: THREE.Sprite[] = [];
    EXTRA_CONSTELLATIONS.forEach((c) => {
      const labelName = langRef.current === 'zh' ? c.nameZh : c.nameEn;
      const sprite = createConstellationLabelSprite(labelName);
      sprite.visible = false;
      sprite.userData = { constellId: c.id, nameZh: c.nameZh, nameEn: c.nameEn };
      extraLabelGroup.add(sprite);
      extraLabelSprites.push(sprite);
    });
    extraConstellLabelSpritesRef.current = extraLabelSprites;

    // 7. 太阳系两大顶流 (Sun 及 Moon) 在天幕投影
    const sunGeom = new THREE.SphereGeometry(9.5, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfffefa });
    const sunSky = new THREE.Mesh(sunGeom, sunMat);
    scene.add(sunSky);
    sunSkyRef.current = sunSky;

    const sunCoronaTex = createSolarCoronaTexture();
    const sunCoronaMat = new THREE.SpriteMaterial({
      map: sunCoronaTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.9
    });
    const sunCoronaSprite = new THREE.Sprite(sunCoronaMat);
    sunCoronaSprite.scale.set(55.0, 55.0, 1.0);
    sunSky.add(sunCoronaSprite);
    sunCoronaSpriteRef.current = sunCoronaSprite;

    const moonGeom = new THREE.SphereGeometry(7.2, 32, 32);
    const moonTexture = createProceduralMoonTexture();
    const moonMat = new THREE.MeshStandardMaterial({ 
      map: moonTexture,
      roughness: 0.9,
      metalness: 0.05
    });
    const moonSky = new THREE.Mesh(moonGeom, moonMat);
    scene.add(moonSky);
    moonSkyRef.current = moonSky;

    // 月球无大气层，使用 Sprite 模拟动态月晕（初始隐藏，根据观测状态动态控制可见性）
    const moonHazeSprite = new THREE.Sprite(new THREE.SpriteMaterial({ visible: false }));
    moonSky.add(moonHazeSprite);
    moonHazeSpriteRef.current = moonHazeSprite;

    // 行星环系统（土星环）—— 添加为 moonSky 子对象以便随主导天体一起缩放
    const ringGeom = new THREE.RingGeometry(8.8, 16.5, 64);
    const ringTex = createSaturnRingTexture();
    const ringMat = new THREE.MeshBasicMaterial({
      map: ringTex,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const planetRing = new THREE.Mesh(ringGeom, ringMat);
    planetRing.rotation.x = Math.PI / 2;
    planetRing.visible = false;
    moonSky.add(planetRing);
    planetRingRef.current = planetRing;

    // 8. 鼠标交互逻辑
    let pointerDownTime = 0;
    let pointerMoved = false;

    const onPointerDown = (e: PointerEvent) => {
      pointerDownTime = Date.now();
      pointerMoved = false;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!pointerMoved && Date.now() - pointerDownTime < 300) {
        onCanvasClick(e as unknown as MouseEvent);
      }
    };

    const SNAP_RADIUS_PX = 42; // 磁吸半径（屏幕像素）

    const onPointerMove = (e: PointerEvent) => {
      if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;
      const rect = rendererRef.current.domElement.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;

      // 磁吸snap逻辑：映射所有可见星体到屏幕坐标并寻找最近的
      let snapX = rawX;
      let snapY = rawY;
      snapTargetRef.current = null;

      const allTargets: Array<THREE.Sprite | THREE.Mesh> = [
        ...starSpritesRef.current.filter(s => s.visible),
        ...extraStarSpritesRef.current.filter(s => s.visible),
        ...(Object.values(planetSpritesRef.current) as THREE.Sprite[]).filter(s => s.visible),
        ...(sunSkyRef.current?.visible ? [sunSkyRef.current] : []),
        ...(moonSkyRef.current?.visible ? [moonSkyRef.current] : []),
      ] as Array<THREE.Sprite | THREE.Mesh>;

      let closestDist = SNAP_RADIUS_PX;
      let closestTarget: THREE.Sprite | THREE.Mesh | null = null;

      // 将每个天体的3D坐标投影到屏幕NDC
      const tempV = new THREE.Vector3();
      for (const target of allTargets) {
        tempV.setFromMatrixPosition(target.matrixWorld);
        tempV.project(cameraRef.current);
        const sx = (tempV.x + 1) / 2 * rect.width;
        const sy = (1 - tempV.y) / 2 * rect.height;
        const dist = Math.sqrt((rawX - sx) ** 2 + (rawY - sy) ** 2);
        if (dist < closestDist) {
          closestDist = dist;
          closestTarget = target;
          // 根据距离二次衰减引力强度
          const strength = Math.pow(1 - dist / SNAP_RADIUS_PX, 2);
          snapX = rawX + (sx - rawX) * strength;
          snapY = rawY + (sy - rawY) * strength;
        }
      }
      snapTargetRef.current = closestTarget;

      // 更新Hover位置（使用snap后的坐标显示Tooltip）
      setHoveredPos({ x: snapX, y: snapY });

      // 将snap坐标转回 NDC 给 Raycaster
      const ndcX = (snapX / rect.width) * 2 - 1;
      const ndcY = -(snapY / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.params.Points.threshold = 4.5;
      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), cameraRef.current);

      const targets: THREE.Object3D[] = [];
      starSpritesRef.current.forEach(sprite => {
        if (sprite.visible) targets.push(sprite);
      });
      extraStarSpritesRef.current.forEach(sprite => {
        if (sprite.visible) targets.push(sprite);
      });
      (Object.values(planetSpritesRef.current) as THREE.Sprite[]).forEach(sprite => {
        if (sprite.visible) targets.push(sprite);
      });
      if (sunSkyRef.current && sunSkyRef.current.visible) targets.push(sunSkyRef.current);
      if (moonSkyRef.current && moonSkyRef.current.visible) targets.push(moonSkyRef.current);

      const intersects = raycaster.intersectObjects(targets);
      if (intersects.length > 0) {
        const hit = intersects[0].object;
        container.style.cursor = closestTarget ? 'crosshair' : 'pointer';

        if (hit === sunSkyRef.current) {
          setHoveredCelestial({
            id: 'sun',
            nameZh: '太阳 (The Sun)',
            nameEn: 'The Sun',
            typeZh: '恒星 / 太阳系核心星体',
            typeEn: 'Host Star / Solar Hub',
            infoZh: '太阳系唯一的中央恒星，提供了地球生命赖以生存的所有光热能量来源。',
            infoEn: 'The sole central star of the Solar System, nourishing life on Earth.',
            extraZh: '黄经: ' + AstrophenomenaEngine.getSolarLongitude(daysSinceJ2000Ref.current).toFixed(1) + '° | 仰角: ' + sunCoordsRefCurrentAlt() + '°',
            extraEn: 'Solar Longitude: ' + AstrophenomenaEngine.getSolarLongitude(daysSinceJ2000Ref.current).toFixed(1) + '°'
          });
        } else if (hit === moonSkyRef.current) {
          const dom = getDominantBodyInfo(observerBodyIdRef.current);
          if (dom && dom.id === 'moon') {
            setHoveredCelestial({
              id: 'moon',
              nameZh: '月球 (The Moon)',
              nameEn: 'The Moon',
              typeZh: '天然卫星 / 潮汐锁定守护者',
              typeEn: 'Natural Satellite / Tidally Locked',
              infoZh: '地球唯一的天然卫星。我们已为它特写模式注入了浪漫宁静的漫射朦胧白月光晕（Misty Moonlight Glow）！',
              infoEn: "Earth's only natural satellite. Calibrated in standard 3D depth with hazy lunar glow.",
              extraZh: '当前月相度: ' + (moonPhaseInfoRef.current ? (moonPhaseInfoRef.current.percent * 100).toFixed(0) : '0') + '%',
              extraEn: 'Moon Phase Percent: ' + (moonPhaseInfoRef.current ? (moonPhaseInfoRef.current.percent * 100).toFixed(0) : '0') + '%'
            });
          } else if (dom && dom.id === 'earth') {
            setHoveredCelestial({
              id: 'earth',
              nameZh: '地球 (Earth)',
              nameEn: 'Earth',
              typeZh: '行星 / 生命摇篮',
              typeEn: 'Planet / Cradle of Life',
              infoZh: '从月球上看，地球是一颗美丽的蓝色弹珠，悬挂在黑色的天空之中。由于潮汐锁定，地球在月空中几乎静止不动。',
              infoEn: 'From the Moon, Earth appears as a beautiful blue marble suspended in the black sky. Due to tidal locking, it remains nearly stationary.',
              extraZh: '仰角: ' + (moonSkyRef.current ? getHorizontalCoordinates(moonRaRef.current, moonDecRef.current, getObserverLST(), latitudeRef.current, observerBodyIdRef.current).alt.toFixed(1) : '0') + '°',
              extraEn: 'Altitude: ' + (moonSkyRef.current ? getHorizontalCoordinates(moonRaRef.current, moonDecRef.current, getObserverLST(), latitudeRef.current, observerBodyIdRef.current).alt.toFixed(1) : '0') + '°'
            });
          } else if (dom) {
            // Generic satellite observer → parent planet
            const obsNameZh = getObserverBodyName(observerBodyIdRef.current, 'zh');
            const obsNameEn = getObserverBodyName(observerBodyIdRef.current, 'en');
            setHoveredCelestial({
              id: dom.id,
              nameZh: dom.nameZh,
              nameEn: dom.nameEn,
              typeZh: '行星',
              typeEn: 'Planet',
              infoZh: `从${obsNameZh}表面观测，${dom.nameZh}是天空中最为壮观的主导天体。由于潮汐锁定，它在天空中几乎静止不动。`,
              infoEn: `As seen from ${obsNameEn}, ${dom.nameEn} dominates the sky. Due to tidal locking, it remains nearly stationary.`,
              extraZh: '仰角: ' + (moonSkyRef.current ? getHorizontalCoordinates(moonRaRef.current, moonDecRef.current, getObserverLST(), latitudeRef.current, observerBodyIdRef.current).alt.toFixed(1) : '0') + '°',
              extraEn: 'Altitude: ' + (moonSkyRef.current ? getHorizontalCoordinates(moonRaRef.current, moonDecRef.current, getObserverLST(), latitudeRef.current, observerBodyIdRef.current).alt.toFixed(1) : '0') + '°'
            });
          }
        } else if (hit.userData.type === 'planet') {
          const planetData = hit.userData.planetData;
          const distAU = hit.userData.distAU || 0.0;
          const alt = hit.userData.alt || 0.0;
          setHoveredCelestial({
            id: planetData.id,
            nameZh: planetData.nameZh,
            nameEn: planetData.nameEn,
            typeZh: planetData.typeZh,
            typeEn: planetData.typeEn,
            infoZh: planetData.infoZh,
            infoEn: planetData.infoEn,
            extraZh: '地心距离: ' + distAU.toFixed(3) + ' AU | 仰角: ' + alt.toFixed(1) + '°',
            extraEn: 'Geocentric Dist: ' + distAU.toFixed(3) + ' AU | Alt: ' + alt.toFixed(1) + '°'
          });
        } else if (hit.userData.type === 'star' || hit.userData.type === 'extraStar') {
          const starData = hit.userData.starData;
          const { info } = getStarInfo(starData, langRef.current);
          const isExtra = hit.userData.type === 'extraStar';
          setHoveredCelestial({
            id: 'star-' + starData.id,
            nameZh: starData.nameZh,
            nameEn: starData.nameEn,
            typeZh: (isExtra ? '恒星 / ' : '亮恒星精选 / ') + starData.constellZh,
            typeEn: (isExtra ? 'Star / ' : 'Bright Star / ') + starData.constellEn,
            infoZh: info,
            infoEn: info,
            extraZh: '视星等: ' + starData.mag + ' | 赤经: ' + starData.ra.toFixed(1) + 'h | 赤纬: ' + starData.dec + '°',
            extraEn: 'Apparent Mag: ' + starData.mag + ' | RA: ' + starData.ra.toFixed(1) + 'h | Dec: ' + starData.dec + '°'
          });
        }
      } else {
        container.style.cursor = closestTarget ? 'crosshair' : 'grab';
        setHoveredCelestial(null);
      }
    };

    const sunCoordsRefCurrentAlt = () => {
      if (!sunSkyRef.current) return '0.0';
      const lst = getObserverLST();
      const days = TimeEngine.getDaysSinceJ2000(currentTimestampRef.current);
      const lambdaSun = AstrophenomenaEngine.getSolarLongitude(days);
      const sunLongRad = (lambdaSun * Math.PI) / 180.0;
      const oblRad = (23.439 * Math.PI) / 180.0;
      const sunDecRad = Math.asin(Math.sin(oblRad) * Math.sin(sunLongRad));
      const sunDec = (sunDecRad * 180.0) / Math.PI;
      let sunRaRad = Math.atan2(Math.cos(oblRad) * Math.sin(sunLongRad), Math.cos(sunLongRad));
      let sunRa = (sunRaRad * 12.0) / Math.PI;
      if (sunRa < 0) sunRa += 24;
      const sunCoords = getHorizontalCoordinates(sunRa, sunDec, lst, latitudeRef.current, observerBodyIdRef.current);
      return sunCoords.alt.toFixed(1);
    };

    const onCanvasClick = (e: MouseEvent) => {
      if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;
      const rect = rendererRef.current.domElement.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;

      // 使用snap后的坐标进行Raycaster
      const tempV = new THREE.Vector3();
      let snapX = rawX;
      let snapY = rawY;
      if (snapTargetRef.current) {
        tempV.setFromMatrixPosition(snapTargetRef.current.matrixWorld);
        tempV.project(cameraRef.current);
        snapX = (tempV.x + 1) / 2 * rect.width;
        snapY = (1 - tempV.y) / 2 * rect.height;
      }

      const ndcX = (snapX / rect.width) * 2 - 1;
      const ndcY = -(snapY / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.params.Points.threshold = 4.5;
      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), cameraRef.current);

      const targets: THREE.Object3D[] = [];
      starSpritesRef.current.forEach(sprite => {
        if (sprite.visible) targets.push(sprite);
      });
      extraStarSpritesRef.current.forEach(sprite => {
        if (sprite.visible) targets.push(sprite);
      });
      (Object.values(planetSpritesRef.current) as THREE.Sprite[]).forEach(sprite => {
        if (sprite.visible) targets.push(sprite);
      });
      if (sunSkyRef.current && sunSkyRef.current.visible) targets.push(sunSkyRef.current);
      if (moonSkyRef.current && moonSkyRef.current.visible) targets.push(moonSkyRef.current);

      const intersects = raycaster.intersectObjects(targets);
      if (intersects.length > 0) {
        const hit = intersects[0].object;

        // 记录选中天体并设置屏幕坐标
        selectedObjectRef.current = hit;
        setSelectedScreenPos({ x: snapX, y: snapY });
        setSelectionRingKey(k => k + 1);

        if (hit === sunSkyRef.current) {
          setSelectedCelestial({
            id: 'sun',
            nameZh: '太阳 (The Sun)',
            nameEn: 'The Sun',
            typeZh: '恒星 / 太阳系中心星体',
            typeEn: 'Star / Solar Center',
            mag: -26.74,
            ra: sunRaRef.current || 0,
            dec: sunDecRef.current || 0,
            infoZh: '太阳是太阳系的中心星体，几乎占领全太阳系99.86%的全部质量。作为一颗主序黄矮星，其核心每秒通过热核反应将6亿吨氢聚变为氦，发出的光芒撑起了地球一切生命的生长过程。为了模拟逼真，系统对其采用了高级程序化耀斑日冕和强光偏振校正技术。',
            infoEn: 'The absolute ruler and center of the Solar System. The Sun accounts for 99.86% of the system mass. It fuses 600 million tons of hydrogen into helium every single second, giving energy to nourish Earth life. To preserve visual realism, our simulator adds real procedural lens flare glare and additive chromatic solar halos over the viewport.',
            extraDetailsZh: '轨道与物理状态：自转轴偏角 7.25°，中心热核区高达 15,000,000 °C。在星空模式中，其方位完全由经典太阳公转算法代数解算，实时体现白天日照高度对天空散射颜色的投影强弱。',
            extraDetailsEn: 'Physical Specifications: Axial Obliquity 7.25°, central thermonuclear zone reaches 15M °C. Under horizontal dome stargazing, its altitude coordinates drive real-time atmospheric blue-to-black scatter shifts.'
          });
        } else if (hit === moonSkyRef.current) {
          const dom = getDominantBodyInfo(observerBodyIdRef.current);
          if (dom && dom.id === 'moon') {
            setSelectedCelestial({
              id: 'moon',
              nameZh: '月球 (The Moon)',
              nameEn: 'The Moon',
              typeZh: '天然卫星 / 地月引力互锁',
              typeEn: 'Natural Satellite / Earth Companion',
              mag: -12.74,
              ra: moonRaRef.current || 0,
              dec: moonDecRef.current || 0,
              infoZh: '月球是地球唯一的天然卫星，处于完美的自转公转潮汐锁定状态。它对地球上海水的潮汐引力、自转轴稳定和夜空宁静观测起到了绝对核心的物理支撑。在特写阶段，它的周围环绕着高精度程序化渲染的”漫射朦胧白月晕（Misty Moonlight Glow）”以及3D偏振相机对齐精灵，体现空灵幽美的月夜奇观！',
              infoEn: 'Earth\'s only natural satellite, fully tidally locked to Earth. It exerts a core physical drag creating ocean tides, stabilizing Earth axial obliquity, and providing moonlight. Our simulator just added realistic camera-facing lunar halo glow and multi-level silver wraps around its body!',
              extraDetailsZh: '地月完美距离：平均轨道半径 384,400 公里。在系统的 “1:1 堆叠验证” 中也可以严格检验出其空间恰好容纳 30.17 个原色原始尺寸地球，是一场浩瀚惊人的轨道奇景。',
              extraDetailsEn: 'Distance calibration: Mean orbital gap of 384,400 km. In our physical 1:1 stacking validation tool tab, the space exactly fits 30.17 original-size Earth spheres aligned end to end.'
            });
          } else if (dom && dom.id === 'earth') {
            setSelectedCelestial({
              id: 'earth',
              nameZh: '地球 (Earth)',
              nameEn: 'Earth',
              typeZh: '行星 / 生命摇篮',
              typeEn: 'Planet / Cradle of Life',
              mag: -17.0,
              ra: moonRaRef.current || 0,
              dec: moonDecRef.current || 0,
              infoZh: '从月球表面看去，地球是一颗悬挂在漆黑天空中的蓝色弹珠。由于潮汐锁定，地球在月空中几乎静止不动，是月球上最壮观的景观。地球直径约为月球的4倍，角直径约2°，亮度和大小都远超其他天体。',
              infoEn: 'From the lunar surface, Earth appears as a blue marble suspended in the pitch-black sky. Due to tidal locking, it remains nearly stationary in the lunar sky, making it the most spectacular sight on the Moon.',
              extraDetailsZh: '地球平均直径 12,742 公里 | 从月球看角直径约 2° | 潮汐锁定使其在月空中几乎固定',
              extraDetailsEn: 'Earth mean diameter 12,742 km | Angular diameter ~2° from Moon | Tidal locking keeps it nearly fixed in lunar sky'
            });
          } else if (dom) {
            const obsNameZh = getObserverBodyName(observerBodyIdRef.current, 'zh');
            const obsNameEn = getObserverBodyName(observerBodyIdRef.current, 'en');
            setSelectedCelestial({
              id: dom.id,
              nameZh: dom.nameZh,
              nameEn: dom.nameEn,
              typeZh: '行星 / 主导天体',
              typeEn: 'Planet / Dominant Body',
              mag: 0,
              ra: moonRaRef.current || 0,
              dec: moonDecRef.current || 0,
              infoZh: `从${obsNameZh}表面看去，${dom.nameZh}是夜空中最壮观的主导天体。由于潮汐锁定，它在天空中几乎静止不动。`,
              infoEn: `From the surface of ${obsNameEn}, ${dom.nameEn} dominates the sky. Due to tidal locking, it remains nearly stationary.`,
              extraDetailsZh: `${dom.nameZh}是${obsNameZh}的母行星，在天空中极为壮观。`,
              extraDetailsEn: `${dom.nameEn} is the parent planet of ${obsNameEn}, spectacular in the sky.`
            });
          }
        } else if (hit.userData.type === 'planet') {
          const planetData = hit.userData.planetData;
          const distAU = hit.userData.distAU || 0.0;
          const az = hit.userData.az || 0.0;
          const alt = hit.userData.alt || 0.0;
          setSelectedCelestial({
            id: planetData.id,
            nameZh: planetData.nameZh,
            nameEn: planetData.nameEn,
            typeZh: planetData.typeZh,
            typeEn: planetData.typeEn,
            mag: planetData.mag,
            ra: hit.userData.ra || 0,
            dec: hit.userData.dec || 0,
            infoZh: planetData.infoZh,
            infoEn: planetData.infoEn,
            extraDetailsZh: '地心距离: ' + distAU.toFixed(3) + ' AU | 仰角: ' + alt.toFixed(1) + '° | 方位: ' + az.toFixed(1) + '°',
            extraDetailsEn: 'Geocentric Dist: ' + distAU.toFixed(3) + ' AU | Alt: ' + alt.toFixed(1) + '° | Az: ' + az.toFixed(1) + '°'
          });
        } else if (hit.userData.type === 'star' || hit.userData.type === 'extraStar') {
          const starData = hit.userData.starData;
          const { info, expanded } = getStarInfo(starData, langRef.current);
          const isExtra = hit.userData.type === 'extraStar';
          setSelectedCelestial({
            id: 'star-' + starData.id,
            nameZh: starData.nameZh,
            nameEn: starData.nameEn + (isExtra ? '' : ' (' + starData.nameEn + ')'),
            typeZh: (isExtra ? '恒星 / ' : '夜空亮星精选 / ') + starData.constellZh,
            typeEn: (isExtra ? 'Star / ' : 'Bright Star / ') + starData.constellEn,
            mag: starData.mag,
            ra: starData.ra,
            dec: starData.dec,
            infoZh: info + ' ' + expanded,
            infoEn: info + ' ' + expanded,
            extraDetailsZh: '本星表视星等已由经典J2000历元严密校准。观测者可以通过改变模拟器的时间倍速率，在夜天穹极轴指南针（N、S、E、W）的精确标测下，直接俯瞰各大亮星有秩序的自转环绕弧线轨迹。',
            extraDetailsEn: 'Its apparent magnitude represents the actual absolute brightness as observed from standard sea level. By altering time speed, observe its diurnal rotation relative to our Cardinal Horizon ring.'
          });
        }
      }
    };

    // 注册交互事件监听器
    container.addEventListener('pointerdown', onPointerDown as EventListener);
    container.addEventListener('pointerup', onPointerUp as EventListener);
    container.addEventListener('pointermove', onPointerMove as EventListener);

    // 窗口/容器尺寸监听
    const resizeObserver = new ResizeObserver((entries) => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        const actualWidth = w || container.clientWidth || window.innerWidth || 800;
        const actualHeight = h || container.clientHeight || window.innerHeight || 600;
        cameraRef.current.aspect = actualWidth / actualHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(actualWidth, actualHeight, true);
      }
    });
    resizeObserver.observe(container);

    // 清理函数
    return () => {
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('wheel', handleWheel);
      if (container) {
        container.removeEventListener('pointerdown', onPointerDown as EventListener);
        container.removeEventListener('pointerup', onPointerUp as EventListener);
        container.removeEventListener('pointermove', onPointerMove as EventListener);
        if (renderer.domElement && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      }
      renderer.dispose();
    };
  }, []);

  // 依赖时间/纬度/经度，循环计算恒星和日月方位角高程并更新天体
  useEffect(() => {
    const scene = sceneRef.current;
    const starsGroup = starsGroupRef.current;
    if (!scene || !starsGroup) return;

    const ctx = { bodyId: observerBodyId, latitude, longitude };
    const lst = ObserverEngine.getLocalSiderealTime(ctx, currentTimestamp);
    const days = TimeEngine.getDaysSinceJ2000(currentTimestamp);

    // A. 太阳投影位置（多参考系）
    const { ra: sunRa, dec: sunDec } = ObserverEngine.getSolarRADec(ctx, days);
    const sunCoords = getHorizontalCoordinates(sunRa, sunDec, lst, latitude, observerBodyId);
    const sunPos = get3DPositionOnDome(sunCoords.az, sunCoords.alt, 278);

    if (sunSkyRef.current) {
      sunSkyRef.current.position.copy(sunPos);
      sunSkyRef.current.visible = sunCoords.alt > -2;

      const eclipses = AstrophenomenaEngine.detectEclipse(days);
      const sunMat = sunSkyRef.current.material as THREE.MeshBasicMaterial;
      if (eclipses.solarEclipse) {
        sunMat.color.setHex(0x0c0c0c);
        if (sunCoronaSpriteRef.current) {
          sunCoronaSpriteRef.current.material.opacity = 1.0;
          sunCoronaSpriteRef.current.scale.set(70.0, 70.0, 1.0);
          sunCoronaSpriteRef.current.material.color.setHex(0xfffaea);
        }
      } else {
        sunMat.color.setHex(0xfffefa);
        if (sunCoronaSpriteRef.current) {
          const hRatio = Math.max(0.4, Math.min(1.0, (sunCoords.alt + 5) / 45.0));
          sunCoronaSpriteRef.current.material.opacity = 0.9 * hRatio;
          sunCoronaSpriteRef.current.scale.set(55.0, 55.0, 1.0);
          sunCoronaSpriteRef.current.material.color.setHex(0xffffff);
        }
      }
    }

    // 平行光方向更新
    if (lightRef.current) {
      lightRef.current.position.copy(sunPos).normalize();
    }

    // B. 主导天体投影（地球→月球 / 月球→地球 / 其他→隐藏）
    const moonPhaseInfo = AstrophenomenaEngine.getMoonPhase(days);
    let moonCoords: { az: number; alt: number } = { az: 0, alt: -10 };
    let moonRa = 0;
    let moonDec = 0;

    if (observerBodyId === 'earth') {
      const satInfo = ObserverEngine.getSatellitesInSky(ctx, days)[0] ?? { ra: 0, dec: 0, angularDiameter: 30 };
      moonRa = satInfo.ra; moonDec = satInfo.dec;
      moonCoords = getHorizontalCoordinates(moonRa, moonDec, lst, latitude, observerBodyId);
      const moonPos = get3DPositionOnDome(moonCoords.az, moonCoords.alt, 270);
      if (moonSkyRef.current) {
        moonSkyRef.current.position.copy(moonPos);
        moonSkyRef.current.visible = moonCoords.alt > -2;
        moonSkyRef.current.scale.setScalar(getAngularScale(satInfo.angularDiameter ?? 30));
        const latRad = (latitude * Math.PI) / 180.0;
        const celestialNorth = new THREE.Vector3(0, Math.sin(latRad), Math.cos(latRad));
        setTidallyLockedOrientation(moonSkyRef.current, cameraRef.current?.position ?? new THREE.Vector3(0, 0, 0.1), celestialNorth);
        if (planetRingRef.current) planetRingRef.current.visible = false;
        const eclipses = AstrophenomenaEngine.detectEclipse(days);
        const moonMat = moonSkyRef.current.material as THREE.MeshStandardMaterial;
        if (eclipses.solarEclipse) {
          moonMat.color.setHex(0x111111);
          if (moonHazeSpriteRef.current) moonHazeSpriteRef.current.material.opacity = 0.0;
        } else if (eclipses.lunarEclipse) {
          moonMat.color.setHex(0xb23315);
          if (moonHazeSpriteRef.current) {
            moonHazeSpriteRef.current.material.color.setHex(0xff3311);
            moonHazeSpriteRef.current.material.opacity = 0.85;
          }
        } else {
          moonMat.color.setHex(0xffffff);
          if (moonHazeSpriteRef.current) {
            moonHazeSpriteRef.current.material.color.setHex(0xdbeafe);
            const glowFactor = Math.max(0.12, moonPhaseInfo.percent);
            moonHazeSpriteRef.current.material.opacity = 0.8 * glowFactor;
          }
        }
      }
    } else if (observerBodyId === 'moon') {
      const earthInfo = ObserverEngine.getSatellitesInSky(ctx, days)[0] ?? { ra: 0, dec: 0, angularDiameter: 114 };
      moonRa = earthInfo.ra; moonDec = earthInfo.dec;
      moonCoords = getHorizontalCoordinates(moonRa, moonDec, lst, latitude, observerBodyId);
      const earthPos = get3DPositionOnDome(moonCoords.az, moonCoords.alt, 270);
      if (moonSkyRef.current) {
        moonSkyRef.current.position.copy(earthPos);
        moonSkyRef.current.visible = moonCoords.alt > -2;
        moonSkyRef.current.scale.setScalar(getAngularScale(earthInfo.angularDiameter ?? 114));
        const latRad = (latitude * Math.PI) / 180.0;
        const celestialNorth = new THREE.Vector3(0, Math.sin(latRad), Math.cos(latRad));
        setTidallyLockedOrientation(moonSkyRef.current, cameraRef.current?.position ?? new THREE.Vector3(0, 0, 0.1), celestialNorth);
        // Earth atmospheric glow as seen from the Moon
        if (moonHazeSpriteRef.current) {
          moonHazeSpriteRef.current.visible = moonCoords.alt > -2;
          moonHazeSpriteRef.current.material.color.setHex(0x4a90d9);
          moonHazeSpriteRef.current.material.opacity = 0.45;
          moonHazeSpriteRef.current.scale.setScalar(1.35);
        }
        if (planetRingRef.current) planetRingRef.current.visible = false;
      }
    } else {
      const dominant = getDominantBodyInfo(observerBodyId);
      if (dominant && moonSkyRef.current) {
        const parentInfo = ObserverEngine.getPlanetRADec(ctx, dominant.id, days);
        moonRa = parentInfo.ra; moonDec = parentInfo.dec;
        moonCoords = getHorizontalCoordinates(moonRa, moonDec, lst, latitude, observerBodyId);
        const parentPos = get3DPositionOnDome(moonCoords.az, moonCoords.alt, 270);
        moonSkyRef.current.position.copy(parentPos);
        moonSkyRef.current.visible = moonCoords.alt > -2;
        // Correct angular-diameter-to-scale mapping using spherical projection formula
        moonSkyRef.current.scale.setScalar(getAngularScale(parentInfo.angularDiameter));
        const latRad = (latitude * Math.PI) / 180.0;
        const celestialNorth = new THREE.Vector3(0, Math.sin(latRad), Math.cos(latRad));
        setTidallyLockedOrientation(moonSkyRef.current, cameraRef.current?.position ?? new THREE.Vector3(0, 0, 0.1), celestialNorth);
        // Show Saturn ring when viewed from its moons
        if (planetRingRef.current) {
          planetRingRef.current.visible = dominant.id === 'saturn' && moonCoords.alt > -2;
        }
      } else {
        if (moonSkyRef.current) moonSkyRef.current.visible = false;
        if (planetRingRef.current) planetRingRef.current.visible = false;
      }
      if (moonHazeSpriteRef.current) moonHazeSpriteRef.current.visible = false;
    }

    const eclipseState = AstrophenomenaEngine.detectEclipse(days);

    // Per-body atmospheric sky colors
    const sunAlt = sunCoords.alt;
    const atmo = getAtmosphereColors(observerBodyId, sunAlt);
    let { r, g, b, brightness: skyBrightness, ambientIntensity } = atmo;

    skyBrightnessRef.current = skyBrightness;
    sunAltRef.current = sunAlt;

    if (rendererRef.current) {
      if (eclipseState.solarEclipse && sunCoords.alt > 0) {
        rendererRef.current.setClearColor(new THREE.Color(0x02030d), 1.0);
      } else {
        rendererRef.current.setClearColor(new THREE.Color(r, g, b), 1.0);
      }
    }

    // Ambient light follows atmospheric brightness
    if (ambientLightRef.current) {
      const dayColor = new THREE.Color(atmo.dayColor[0], atmo.dayColor[1], atmo.dayColor[2]);
      const nightColor = new THREE.Color(atmo.nightColor[0], atmo.nightColor[1], atmo.nightColor[2]);
      const finalAmbientColor = new THREE.Color().lerpColors(nightColor, dayColor, skyBrightness);
      ambientLightRef.current.color.copy(finalAmbientColor);
      ambientLightRef.current.intensity = ambientIntensity;
    }

    // D. 42颗明亮恒星地平线截断及低空大气消光计算
    starSpritesRef.current.forEach(sprite => {
      const ra = sprite.userData.ra;
      const dec = sprite.userData.dec;
      const starCoords = getHorizontalCoordinates(ra, dec, lst, latitude, observerBodyId);
      
      let baseOpacity = 0;
      let visible = false;
      
      if (starCoords.alt > 0) {
        visible = true;
        let extinction = 1.0;
        if (starCoords.alt < 12) {
          extinction = Math.sin(starCoords.alt * Math.PI / 180.0) / Math.sin(12.0 * Math.PI / 180.0);
        }
        baseOpacity = atmo.opaqueAtmosphere ? 0 : (atmo.starDayVisible ? extinction : ((1.0 - skyBrightness) * extinction));
      }

      sprite.userData.az = starCoords.az;
      sprite.userData.alt = starCoords.alt;
      sprite.userData.baseOpacity = baseOpacity;

      const mag = sprite.userData.mag;
      const isVisibleMag = mag <= magLimit;
      sprite.visible = visible && baseOpacity > 0.02 && isVisibleMag;
    });

    // D2. 额外星座恒星地平线截断及低空大气消光计算
    extraStarSpritesRef.current.forEach(sprite => {
      const ra = sprite.userData.ra;
      const dec = sprite.userData.dec;
      const starCoords = getHorizontalCoordinates(ra, dec, lst, latitude, observerBodyId);

      let baseOpacity = 0;
      let visible = false;

      if (starCoords.alt > 0) {
        visible = true;
        let extinction = 1.0;
        if (starCoords.alt < 12) {
          extinction = Math.sin(starCoords.alt * Math.PI / 180.0) / Math.sin(12.0 * Math.PI / 180.0);
        }
        baseOpacity = atmo.opaqueAtmosphere ? 0 : (atmo.starDayVisible ? extinction : ((1.0 - skyBrightness) * extinction));
      }

      sprite.userData.az = starCoords.az;
      sprite.userData.alt = starCoords.alt;
      sprite.userData.baseOpacity = baseOpacity;

      const mag = sprite.userData.mag;
      const isVisibleMag = mag <= magLimit;
      sprite.visible = visible && baseOpacity > 0.02 && isVisibleMag;
    });

    // E. 行星视位置（多参考系）
    const planetInfos = ObserverEngine.getPlanetsInSky(ctx, days);
    const planetInfoMap = new Map(planetInfos.map(p => [p.id, p]));
    PLANETS.forEach(planet => {
      const sprite = planetSpritesRef.current[planet.id];
      if (sprite) {
        const info = planetInfoMap.get(planet.id);
        if (!info) { sprite.visible = false; return; }
        const planetCoords = getHorizontalCoordinates(info.ra, info.dec, lst, latitude, observerBodyId);
        let baseOpacity = 0;
        let visible = false;
        if (planetCoords.alt > 0) {
          visible = true;
          let extinction = 1.0;
          if (planetCoords.alt < 12) {
            extinction = Math.sin(planetCoords.alt * Math.PI / 180.0) / Math.sin(12.0 * Math.PI / 180.0);
          }
          baseOpacity = (1.0 - skyBrightness) * extinction;
        }
        sprite.userData.az = planetCoords.az;
        sprite.userData.alt = planetCoords.alt;
        sprite.userData.ra = info.ra;
        sprite.userData.dec = info.dec;
        sprite.userData.distAU = info.distAU;
        sprite.userData.baseOpacity = baseOpacity;
        sprite.visible = visible && baseOpacity > 0.02;
      }
    });

    // H. 卫星精灵位置更新
    const satInfos = ObserverEngine.getSatellitesInSky(ctx, days);
    satInfos.forEach(sat => {
      const sprite = satelliteSpritesRef.current[sat.id];
      if (sprite) {
        const satCoords = getHorizontalCoordinates(sat.ra, sat.dec, lst, latitude, observerBodyId);
        const pos = get3DPositionOnDome(satCoords.az, satCoords.alt, 275);
        sprite.position.copy(pos);
        sprite.visible = satCoords.alt > -2;
        sprite.userData.az = satCoords.az;
        sprite.userData.alt = satCoords.alt;
      }
    });

    // F. 星座连线三维天穹投影更新（含 EXTRA_CONSTELLATIONS）
    if (constellLinesRef.current) {
      const linePoints: THREE.Vector3[] = [];
      if (showConstellLines) {
        // 原始亮星星座连线
        CONSTELLATIONS.forEach(constell => {
          for (let j = 0; j < constell.seq.length; j++) {
            const pair = constell.seq[j];
            const starA = STAR_LIST[pair[0]];
            const starB = STAR_LIST[pair[1]];
            if (starA && starB) {
              if (starA.mag <= magLimit && starB.mag <= magLimit) {
                const hA = getHorizontalCoordinates(starA.ra, starA.dec, lst, latitude, observerBodyId);
                const hB = getHorizontalCoordinates(starB.ra, starB.dec, lst, latitude, observerBodyId);

                if (hA.alt > 0 && hB.alt > 0) {
                  const posA = get3DPositionOnDome(hA.az, hA.alt, 283);
                  const posB = get3DPositionOnDome(hB.az, hB.alt, 283);
                  linePoints.push(posA, posB);
                }
              }
            }
          }
        });
        // 额外88星座连线（使用 star id 查找）
        EXTRA_CONSTELLATIONS.forEach(constell => {
          for (let j = 0; j < constell.seq.length; j++) {
            const pair = constell.seq[j];
            const starA = ALL_STARS_MAP.get(pair[0]);
            const starB = ALL_STARS_MAP.get(pair[1]);
            if (starA && starB) {
              if (starA.mag <= magLimit && starB.mag <= magLimit) {
                const hA = getHorizontalCoordinates(starA.ra, starA.dec, lst, latitude, observerBodyId);
                const hB = getHorizontalCoordinates(starB.ra, starB.dec, lst, latitude, observerBodyId);

                if (hA.alt > 0 && hB.alt > 0) {
                  const posA = get3DPositionOnDome(hA.az, hA.alt, 283);
                  const posB = get3DPositionOnDome(hB.az, hB.alt, 283);
                  linePoints.push(posA, posB);
                }
              }
            }
          }
        });
      }

      const geometry = constellLinesRef.current.geometry;
      const currentCount = geometry.attributes.position ? geometry.attributes.position.count : 0;

      if (linePoints.length !== currentCount) {
        // 可见连线数量变化时才重建 geometry
        geometry.dispose();
        constellLinesRef.current.geometry = new THREE.BufferGeometry().setFromPoints(linePoints);
      } else if (linePoints.length > 0) {
        // 数量不变时直接更新顶点数据，避免每帧创建新对象
        const positions = geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < linePoints.length; i++) {
          positions[i * 3] = linePoints[i].x;
          positions[i * 3 + 1] = linePoints[i].y;
          positions[i * 3 + 2] = linePoints[i].z;
        }
        geometry.attributes.position.needsUpdate = true;
        geometry.computeBoundingSphere();
      }

      const lineMat = constellLinesRef.current.material as THREE.LineBasicMaterial;
      lineMat.opacity = 0.35 * Math.max(0, 1 - skyBrightness);
      constellLinesRef.current.visible = showConstellLines && linePoints.length > 0;
    }

    // G. 星座名称标签位置更新 (原始星座)
    if (constellLabelSpritesRef.current.length > 0) {
      constellLabelSpritesRef.current.forEach((sprite, idx) => {
        const constell = CONSTELLATIONS[idx];
        if (!constell) return;
        const uniqueStarIndices = new Set<number>();
        constell.seq.forEach(pair => {
          uniqueStarIndices.add(pair[0]);
          uniqueStarIndices.add(pair[1]);
        });
        let sumAz = 0, sumAlt = 0, visibleCount = 0;
        uniqueStarIndices.forEach(starIdx => {
          const star = STAR_LIST[starIdx];
          if (!star || star.mag > magLimit) return;
          const h = getHorizontalCoordinates(star.ra, star.dec, lst, latitude, observerBodyId);
          if (h.alt > 0) {
            sumAz += h.az;
            sumAlt += h.alt;
            visibleCount++;
          }
        });
        if (visibleCount >= 2) {
          const avgAz = sumAz / visibleCount;
          const avgAlt = sumAlt / visibleCount;
          const pos = get3DPositionOnDome(avgAz, avgAlt, 288);
          sprite.position.copy(pos);
          sprite.visible = showConstellNames;
          sprite.material.opacity = 0.7 * Math.max(0, 1 - skyBrightness);
        } else {
          sprite.visible = false;
        }
      });
    }

    // G2. EXTRA_CONSTELLATIONS 名称标签位置更新
    if (extraConstellLabelSpritesRef.current.length > 0) {
      extraConstellLabelSpritesRef.current.forEach((sprite, idx) => {
        const constell = EXTRA_CONSTELLATIONS[idx];
        if (!constell) return;
        const uniqueStarIds = new Set<number>();
        constell.seq.forEach(pair => {
          uniqueStarIds.add(pair[0]);
          uniqueStarIds.add(pair[1]);
        });
        let sumAz = 0, sumAlt = 0, visibleCount = 0;
        uniqueStarIds.forEach(starId => {
          const star = ALL_STARS_MAP.get(starId);
          if (!star || star.mag > magLimit) return;
          const h = getHorizontalCoordinates(star.ra, star.dec, lst, latitude, observerBodyId);
          if (h.alt > 0) {
            sumAz += h.az;
            sumAlt += h.alt;
            visibleCount++;
          }
        });
        if (visibleCount >= 2) {
          const avgAz = sumAz / visibleCount;
          const avgAlt = sumAlt / visibleCount;
          const pos = get3DPositionOnDome(avgAz, avgAlt, 288);
          sprite.position.copy(pos);
          sprite.visible = showConstellNames;
          sprite.material.opacity = 0.7 * Math.max(0, 1 - skyBrightness);
        } else {
          sprite.visible = false;
        }
      });
    }

    daysSinceJ2000Ref.current = days;
    moonPhaseInfoRef.current = moonPhaseInfo;
    sunRaRef.current = sunRa;
    sunDecRef.current = sunDec;
    moonRaRef.current = moonRa;
    moonDecRef.current = moonDec;

    // Calculate day length based on sun declination and observer latitude
    const phi = (latitude * Math.PI) / 180;
    const delta = (sunDec * Math.PI) / 180;
    const tanPhiTanDelta = Math.tan(phi) * Math.tan(delta);
    let dayLength: number;
    if (tanPhiTanDelta <= -1) {
      dayLength = 24; // Polar day
    } else if (tanPhiTanDelta >= 1) {
      dayLength = 0; // Polar night
    } else {
      const H0 = Math.acos(Math.max(-1, Math.min(1, -tanPhiTanDelta)));
      dayLength = (2 * H0 * 180 / Math.PI) / 15; // hours
    }

    // Update sun path arc geometry for solar-terms demo
    if (sunPathArcRef.current) {
      const isSolarTermsDemo = demoStateRef.current?.activePhenomenon === 'solar-terms';
      if (isSolarTermsDemo && observerBodyId === 'earth') {
        const arcPoints: THREE.Vector3[] = [];
        if (tanPhiTanDelta <= -1) {
          // Polar day: sun never sets, draw full circle
          for (let i = 0; i <= 48; i++) {
            const h = (-Math.PI + (2 * Math.PI * i) / 48);
            const sinAlt = Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.cos(h);
            const altRad = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
            const altDeg = (altRad * 180) / Math.PI;
            const y = -Math.sin(h) * Math.cos(delta);
            const x = Math.cos(phi) * Math.sin(delta) - Math.sin(phi) * Math.cos(delta) * Math.cos(h);
            let azDeg = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
            arcPoints.push(get3DPositionOnDome(azDeg, altDeg, 260));
          }
        } else if (tanPhiTanDelta >= 1) {
          // Polar night: sun never rises, empty arc
        } else {
          // Normal day: sun rises and sets
          const H0 = Math.acos(Math.max(-1, Math.min(1, -tanPhiTanDelta)));
          const steps = 48;
          for (let i = 0; i <= steps; i++) {
            const h = -H0 + (2 * H0 * i) / steps;
            const sinAlt = Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.cos(h);
            const altRad = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
            const altDeg = (altRad * 180) / Math.PI;
            const y = -Math.sin(h) * Math.cos(delta);
            const x = Math.cos(phi) * Math.sin(delta) - Math.sin(phi) * Math.cos(delta) * Math.cos(h);
            let azDeg = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
            if (altDeg > -6) {
              arcPoints.push(get3DPositionOnDome(azDeg, altDeg, 260));
            }
          }
        }
        sunPathArcRef.current.geometry.setFromPoints(arcPoints);
      }
    }

    setSkyData({
      lst,
      sunAlt: sunCoords.alt,
      moonAlt: moonCoords.alt,
      moonPhasePercent: moonPhaseInfo.percent,
      moonPhaseName: moonPhaseInfo.nameKey,
      solarEclipse: eclipseState.solarEclipse,
      lunarEclipse: eclipseState.lunarEclipse,
      dayLength,
      sunDeclination: sunDec
    });
  }, [currentTimestamp, latitude, longitude, observerBodyId, showConstellLines, showStarNames, showConstellNames, magLimit]);

  // 渲染帧与高频大气闪烁/抖动渲染循环
  useEffect(() => {
    let reqId = 0;
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      if (rendererRef.current && sceneRef.current && cameraRef.current && controlsRef.current) {
        controlsRef.current.update();

        // FOV 联动灵敏度：视野越窄，拖拽灵敏度越低
        if (controlsRef.current) {
          controlsRef.current.rotateSpeed = -0.4 * (fovRef.current / 65.0);
        }

        // 实时计算方位角航向 (Azimuth heading)
        const dir = new THREE.Vector3();
        cameraRef.current.getWorldDirection(dir);
        // 坐标系: Z指向北, X指向东
        const heading = (Math.atan2(dir.x, -dir.z) * 180 / Math.PI + 360) % 360;
        setCompassHeading(heading);

        // 1. 夜间月光平行光强度强力锁定
        if (lightRef.current) {
          const sunAlt = sunAltRef.current;
          const skyBrightness = skyBrightnessRef.current;
          if (sunAlt >= 0) {
            lightRef.current.intensity = 1.2 * (1.0 - skyBrightness) + 0.1;
          } else {
            lightRef.current.intensity = 1.5;
          }
        }

        // 2. 亮恒星位置与透明度更新（无闪烁/抖动），视星等亮度加权
        starSpritesRef.current.forEach((sprite) => {
          if (sprite.visible) {
            const az = sprite.userData.az;
            const alt = sprite.userData.alt;
            const radius = sprite.userData.radius;
            const baseOpacity = sprite.userData.baseOpacity ?? 1.0;
            const mag = sprite.userData.mag ?? 5.0;
            // 视星等亮度因子: 1等星最亮，每增1等亮度约1/2.512
            const magFactor = Math.max(0.06, Math.min(1.0, Math.pow(2.512, -(mag - 1.0)) * 2.5));
            const pos = get3DPositionOnDome(az, alt, radius);
            sprite.position.copy(pos);
            sprite.material.opacity = baseOpacity * magFactor;
          }
        });

        // 2b. 额外星座恒星位置与透明度更新
        extraStarSpritesRef.current.forEach((sprite) => {
          if (sprite.visible) {
            const az = sprite.userData.az;
            const alt = sprite.userData.alt;
            const radius = sprite.userData.radius;
            const baseOpacity = sprite.userData.baseOpacity ?? 1.0;
            const mag = sprite.userData.mag ?? 5.0;
            const magFactor = Math.max(0.06, Math.min(1.0, Math.pow(2.512, -(mag - 1.0)) * 2.5));
            const pos = get3DPositionOnDome(az, alt, radius);
            sprite.position.copy(pos);
            sprite.material.opacity = baseOpacity * magFactor;
          }
        });

        // 3. 行星位置与透明度更新（无闪烁/抖动）
        (Object.values(planetSpritesRef.current) as THREE.Sprite[]).forEach((sprite) => {
          if (sprite.visible) {
            const az = sprite.userData.az;
            const alt = sprite.userData.alt;
            const radius = sprite.userData.radius;
            const baseOpacity = sprite.userData.baseOpacity ?? 1.0;
            const pos = get3DPositionOnDome(az, alt, radius);
            sprite.position.copy(pos);
            sprite.material.opacity = baseOpacity;
          }
        });

        // 4. 背景暗星批量粒子渲染循环（无闪烁/抖动）
        if (backgroundPointsRef.current) {
          const bgPoints = backgroundPointsRef.current;
          const positions = bgPoints.geometry.attributes.position.array as Float32Array;
          const colors = bgPoints.geometry.attributes.color.array as Float32Array;

          const bgStarsData = hipparcosRef.current;
          const lst = getObserverLST();
          const lat = latitudeRef.current;
          const skyBr = skyBrightnessRef.current;

          for (let i = 0; i < bgStarsData.length; i++) {
            const star = bgStarsData[i];
            const coords = getHorizontalCoordinates(star.ra, star.dec, lst, lat, observerBodyIdRef.current);
            const alt = coords.alt;
            const az = coords.az;
            const idx = i * 3;

            if (alt <= 0 || star.mag > magLimitRef.current) {
              positions[idx] = 0;
              positions[idx + 1] = -999999;
              positions[idx + 2] = 0;

              colors[idx] = 0;
              colors[idx + 1] = 0;
              colors[idx + 2] = 0;
            } else {
              const pos = get3DPositionOnDome(az, alt, 150);
              positions[idx] = pos.x;
              positions[idx + 1] = pos.y;
              positions[idx + 2] = pos.z;

              let extinction = 1.0;
              if (alt < 12) {
                extinction = Math.sin(alt * Math.PI / 180.0) / Math.sin(12.0 * Math.PI / 180.0);
              }

              const baseColor = new THREE.Color(star.color);
              const factor = extinction * (1.0 - skyBr);

              colors[idx] = baseColor.r * factor;
              colors[idx + 1] = baseColor.g * factor;
              colors[idx + 2] = baseColor.b * factor;
            }
          }
          bgPoints.geometry.attributes.position.needsUpdate = true;
          if (bgStarsData.length > 0) {
            bgPoints.geometry.attributes.color.needsUpdate = true;
          }
        }

        // 5. 潮汐锁定：月球/地球主导天体始终面向观察者，roll 稳定指向北天极
        if (moonSkyRef.current && moonSkyRef.current.visible && cameraRef.current) {
          const latRad = (latitudeRef.current * Math.PI) / 180.0;
          const celestialNorth = new THREE.Vector3(0, Math.sin(latRad), Math.cos(latRad));
          setTidallyLockedOrientation(moonSkyRef.current, cameraRef.current.position, celestialNorth);
        }

        // 5b. 实时纹理偏移更新（UV 校准）
        if (moonSkyRef.current) {
          const mat = moonSkyRef.current.material as THREE.MeshStandardMaterial;
          if (mat.map) {
            const dominant = getDominantBodyInfo(observerBodyIdRef.current);
            if (dominant) {
              const off = textureOffsetsRef.current[dominant.id] ?? { u: 0, v: 0 };
              mat.map.offset.x = 0.25 + off.u;
              mat.map.offset.y = off.v;
            }
          }
        }

        // 6. 太阳轨迹弧线透明度平滑过渡（二十四节气演示）
        if (sunPathArcRef.current) {
          const isSolarTermsDemo = demoStateRef.current?.activePhenomenon === 'solar-terms';
          const targetOpacity = isSolarTermsDemo && observerBodyIdRef.current === 'earth' ? 0.75 : 0;
          const mat = sunPathArcRef.current.material as THREE.LineBasicMaterial;
          mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, 0.06);
          sunPathArcRef.current.visible = mat.opacity > 0.005;
        }

        rendererRef.current.render(sceneRef.current, cameraRef.current);

        // 实时更新选中天体的屏幕坐标，确保圈圈跟随天球旋转
        if (selectedObjectRef.current && cameraRef.current && rendererRef.current) {
          const tempV2 = new THREE.Vector3();
          tempV2.setFromMatrixPosition(selectedObjectRef.current.matrixWorld);
          tempV2.project(cameraRef.current);
          const rect = rendererRef.current.domElement.getBoundingClientRect();
          const sx = (tempV2.x + 1) / 2 * rect.width;
          const sy = (1 - tempV2.y) / 2 * rect.height;
          // 只有在视野内才显示
          if (tempV2.z < 1 && sx > 0 && sx < rect.width && sy > 0 && sy < rect.height) {
            setSelectedScreenPos({ x: sx, y: sy });
          }
        }
      }
    };
    animate();
    return () => cancelAnimationFrame(reqId);
  }, []);

  return (
    <div className="relative w-full h-full text-white overflow-hidden" id="landed-observer-main">
      {/* CSS 动画关键帧 */}
      <style>{`
        @keyframes starSelectExpand {
          0%   { transform: scale(0.3); opacity: 1; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        @keyframes starSelectPulse {
          0%, 100% { opacity: 0.7; }
          50%       { opacity: 0.3; }
        }
      `}</style>

      <div ref={mountRef} className="w-full h-full cursor-all-scroll" />

      {/* 选中天体圆圈 SVG 覆盖层 */}
      {selectedScreenPos && (
        <svg
          className="absolute inset-0 pointer-events-none z-20"
          style={{ width: '100%', height: '100%' }}
          aria-hidden="true"
        >
          {/* 扩散圆圈动画 */}
          <circle
            key={`ring-expand-${selectionRingKey}`}
            cx={selectedScreenPos.x}
            cy={selectedScreenPos.y}
            r={16}
            fill="none"
            stroke="rgba(6,182,212,0.90)"
            strokeWidth={1.5}
            style={{
              animation: 'starSelectExpand 1.0s ease-out forwards',
              transformOrigin: `${selectedScreenPos.x}px ${selectedScreenPos.y}px`
            }}
          />
          {/* 静态持续圆圈 */}
          <circle
            cx={selectedScreenPos.x}
            cy={selectedScreenPos.y}
            r={10}
            fill="none"
            stroke="rgba(255,255,255,0.55)"
            strokeWidth={1}
            strokeDasharray="3 2.5"
            style={{ animation: 'starSelectPulse 2.5s ease-in-out infinite' }}
          />
          {/* 中心圆点 */}
          <circle
            cx={selectedScreenPos.x}
            cy={selectedScreenPos.y}
            r={2}
            fill="rgba(6,182,212,0.95)"
          />
          {/* 十字小纹理 */}
          <line x1={selectedScreenPos.x - 5} y1={selectedScreenPos.y} x2={selectedScreenPos.x - 13} y2={selectedScreenPos.y} stroke="rgba(6,182,212,0.45)" strokeWidth={0.8} />
          <line x1={selectedScreenPos.x + 5} y1={selectedScreenPos.y} x2={selectedScreenPos.x + 13} y2={selectedScreenPos.y} stroke="rgba(6,182,212,0.45)" strokeWidth={0.8} />
          <line x1={selectedScreenPos.x} y1={selectedScreenPos.y - 5} x2={selectedScreenPos.x} y2={selectedScreenPos.y - 13} stroke="rgba(6,182,212,0.45)" strokeWidth={0.8} />
          <line x1={selectedScreenPos.x} y1={selectedScreenPos.y + 5} x2={selectedScreenPos.x} y2={selectedScreenPos.y + 13} stroke="rgba(6,182,212,0.45)" strokeWidth={0.8} />
        </svg>
      )}

      {/* 方位角指示器 — 实时航向 + 集成望远镜 / 观星信息图标 */}
      <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 bg-slate-950/85 px-3 py-2 border border-slate-800/80 rounded-full flex items-center space-x-3 text-[11px] font-mono select-none shadow-lg ${telescopeActive ? 'z-[35]' : 'z-10'}`}>
        {/* 望远镜图标 */}
        <button
          onClick={() => onTelescopeChange?.(!telescopeActive)}
          className={`pointer-events-auto flex items-center justify-center w-7 h-7 rounded-full border transition-all duration-200 cursor-pointer relative ${
            telescopeActive
              ? 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.35)]'
              : 'bg-slate-900/70 border-slate-700/60 text-slate-400 hover:border-slate-500 hover:text-slate-200'
          }`}
          title={isZh ? '切换望远镜模式' : 'Toggle Telescope Mode'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m10.065 12.493-6.93 6.93a2.23 2.23 0 1 1-3.152-3.154l6.929-6.93" />
            <path d="m15.236 11.247 3.105-3.104a1 1 0 0 0 0-1.414l-1.414-1.414a1 1 0 0 0-1.414 0l-3.104 3.105" />
            <path d="m17.5 11.5 2.3-2.3a2.41 2.41 0 0 0 0-3.4l-1.6-1.6a2.41 2.41 0 0 0-3.4 0l-2.3 2.3" />
            <path d="M2.49 21.51a2.2 2.2 0 0 1-1.95-1.95" />
          </svg>
          {telescopeActive && (
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee] animate-pulse" />
          )}
        </button>

        <span className="text-slate-600">|</span>

        {/* 罗盘内容（保持不变） */}
        <span className={`font-bold transition-colors ${Math.abs(compassHeading) < 15 || Math.abs(compassHeading - 360) < 15 ? 'text-emerald-400' : 'text-slate-400'}`}>N</span>
        <span className="text-slate-500">|</span>
        <span className="text-cyan-300 font-bold text-sm min-w-[3ch] text-center">{compassHeading.toFixed(0)}°</span>
        <span className="text-slate-500 text-[10px]">{
          (() => {
            const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
            const idx = Math.round(compassHeading / 22.5) % 16;
            return dirs[idx];
          })()
        }</span>
        <span className="text-slate-500">|</span>
        <span className={`font-bold transition-colors ${Math.abs(compassHeading - 90) < 15 ? 'text-emerald-400' : 'text-slate-400'}`}>E</span>
        <span className="text-slate-500">|</span>
        <span className={`font-bold transition-colors ${Math.abs(compassHeading - 180) < 15 ? 'text-emerald-400' : 'text-slate-400'}`}>S</span>
        <span className="text-slate-500">|</span>
        <span className={`font-bold transition-colors ${Math.abs(compassHeading - 270) < 15 ? 'text-emerald-400' : 'text-slate-400'}`}>W</span>

        <span className="text-slate-600">|</span>

        {/* 精简观星信息 */}
        {skyData && (
          <div className="flex items-center space-x-1 text-[10px] whitespace-nowrap">
            <span className="text-slate-400">
              {getObserverBodyName(observerBodyId, lang)}
            </span>
            <span className="text-slate-600">|</span>
            <span className={skyData.sunAlt > 0 ? "text-amber-400" : "text-slate-500"}>☀️{skyData.sunAlt.toFixed(0)}°</span>
            {getDominantBodyInfo(observerBodyId) && (
              <>
                <span className="text-slate-600">|</span>
                <span className={skyData.moonAlt > 0 ? "text-cyan-400" : "text-slate-500"}>
                  {getDominantBodyInfo(observerBodyId)?.icon}{skyData.moonAlt.toFixed(0)}°
                </span>
              </>
            )}
            <span className="text-slate-600">|</span>
            <span className="text-indigo-300">🌒{translations[lang][skyData.moonPhaseName as keyof typeof translations['zh']]}</span>
            <span className="text-slate-600">|</span>
            <span className="text-indigo-300/80">LST{skyData.lst.toFixed(1)}h</span>
            {demoState?.activePhenomenon === 'solar-terms' && observerBodyId === 'earth' && (
              <>
                <span className="text-slate-600">|</span>
                <span className="text-amber-300">
                  {isZh ? `白天 ${skyData.dayLength.toFixed(1)}h` : `Day ${skyData.dayLength.toFixed(1)}h`}
                </span>
              </>
            )}
            {(skyData.solarEclipse || skyData.lunarEclipse) && (
              <>
                <span className="text-slate-600">|</span>
                <span className="text-rose-400 animate-pulse">⚠️{isZh ? '食' : 'Eclipse'}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* 鼠标 Hover 恒星悬浮标签Tooltip */}
      {hoveredCelestial && hoveredPos && (
        <div 
          className="absolute pointer-events-none z-30 bg-slate-950/95 border border-indigo-500/35 backdrop-blur-md rounded-lg p-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.65)] text-xs text-slate-100 font-sans"
          style={{
            left: `${hoveredPos.x + 15}px`,
            top: `${hoveredPos.y + 15}px`,
            transform: 'translate(0, 0)',
            maxWidth: '190px'
          }}
        >
          <div className="flex items-center space-x-1.5 border-b border-indigo-500/20 pb-1 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_#818cf8] animate-pulse" />
            <span className="font-bold tracking-wide text-slate-100">
              {isZh ? hoveredCelestial.nameZh : hoveredCelestial.nameEn}
            </span>
          </div>
          <div className="text-[10px] space-y-1 font-mono text-slate-400 leading-tight">
            <div>
              <span className="text-slate-500">{isZh ? '分类: ' : 'Type: '}</span>
              <span className="text-indigo-300 font-sans">{isZh ? hoveredCelestial.typeZh : hoveredCelestial.typeEn}</span>
            </div>
            {hoveredCelestial.extraZh && (
              <div className="text-[9.5px] text-amber-400 leading-snug">
                {isZh ? hoveredCelestial.extraZh : hoveredCelestial.extraEn}
              </div>
            )}
            <p className="text-[9px] text-slate-400 font-sans leading-relaxed pt-1 border-t border-slate-900 border-dashed">
              {isZh ? hoveredCelestial.infoZh : hoveredCelestial.infoEn}
            </p>
          </div>
          <div className="text-[8px] text-amber-500/80 mt-1 font-sans font-medium text-right animate-pulse">
            {isZh ? '🖱️ 点击查看史诗天体详情' : '🖱️ Click for epic details'}
          </div>
        </div>
      )}

      {/* 选定星体详细物理与神话传说卡片 */}
      {selectedCelestial && (
        <div
          className="absolute top-16 right-5 w-80 max-h-[80vh] overflow-y-auto bg-slate-950/95 border border-indigo-500/30 backdrop-blur-md rounded-xl p-4 text-slate-200 z-[35] flex flex-col space-y-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.85)] font-sans animate-in slide-in-from-right-6 duration-300"
          id="starry-sky-celestial-detail-card"
        >
          {/* 顶栏 */}
          <div className="flex justify-between items-start border-b border-indigo-500/20 pb-2.5">
            <div>
              <span className="text-[9.5px] uppercase tracking-wider text-indigo-400 font-mono font-bold">
                {isZh ? selectedCelestial.typeZh : selectedCelestial.typeEn}
              </span>
              <h2 className="text-sm font-black text-slate-100 tracking-tight mt-0.5">
                {isZh ? selectedCelestial.nameZh : selectedCelestial.nameEn}
              </h2>
            </div>
            <button 
              onClick={() => setSelectedCelestial(null)}
              className="p-1 cursor-pointer rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 text-slate-400 hover:text-slate-200 transition-all text-[11px] font-bold leading-none select-none"
              title={isZh ? '关闭' : 'Close'}
            >
              ✕
            </button>
          </div>

          {/* 物理特性参数网格 */}
          <div className="grid grid-cols-3 gap-2 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800">
            <div className="text-center">
              <span className="text-[8.5px] text-slate-500 uppercase font-mono font-medium block">
                {isZh ? '视星等' : 'Magnitude'}
              </span>
              <span className="text-xs font-mono font-bold text-amber-300 mt-0.5 block">
                {selectedCelestial.mag.toFixed(2)}
              </span>
            </div>
            <div className="text-center border-x border-slate-800">
              <span className="text-[8.5px] text-slate-500 uppercase font-mono font-medium block">
                {isZh ? '赤经 RA' : 'R. Ascension'}
              </span>
              <span className="text-xs font-mono font-bold text-cyan-300 mt-0.5 block">
                {selectedCelestial.ra.toFixed(2)}h
              </span>
            </div>
            <div className="text-center">
              <span className="text-[8.5px] text-slate-500 uppercase font-mono font-medium block">
                {isZh ? '赤纬 Dec' : 'Declination'}
              </span>
              <span className="text-xs font-mono font-bold text-purple-300 mt-0.5 block">
                {selectedCelestial.dec >= 0 ? '+' : ''}{selectedCelestial.dec.toFixed(2)}°
              </span>
            </div>
          </div>

          {/* 主体描述 */}
          <div className="space-y-3">
            <div>
              <h3 className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase flex items-center gap-1 font-mono">
                <span>✦</span>
                <span>{isZh ? '天体传记与宇宙物理特性' : 'Celestial Biography & Physics'}</span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-sans mt-1.5 bg-indigo-950/25 p-3 rounded-lg border border-indigo-950/30 text-justify">
                {isZh ? selectedCelestial.infoZh : selectedCelestial.infoEn}
              </p>
            </div>

            <div className="pt-1">
              <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1 font-mono">
                <span>👁️</span>
                <span>{isZh ? '观星探秘与仿真机制' : 'Observations & Sim Details'}</span>
              </h3>
              <p className="text-[11px] text-slate-400 leading-normal font-sans mt-1.5 text-justify">
                {isZh ? selectedCelestial.extraDetailsZh : selectedCelestial.extraDetailsEn}
              </p>
            </div>
          </div>

          {/* 贴图 UV 偏移校准（仅对月球/地球主导天体显示） */}
          {(selectedCelestial.id === 'moon' || selectedCelestial.id === 'earth') && onChangeTextureOffset && (
            <div className="border-t border-slate-800 pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest font-mono">
                  🎨 {isZh ? '贴图偏移校准' : 'Texture Offset'}
                </h3>
                <span className="text-[9px] text-cyan-500/60 font-mono">UV OFFSET</span>
              </div>

              <div className="space-y-2.5">
                {/* U offset slider — 仅校准经度方向 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-white/50">U (longitude)</span>
                    <span className="text-cyan-400">{(textureOffsets[selectedCelestial.id]?.u ?? 0).toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={-0.5}
                    max={0.5}
                    step={0.01}
                    value={textureOffsets[selectedCelestial.id]?.u ?? 0}
                    onChange={(e) => {
                      onChangeTextureOffset(selectedCelestial.id, { u: parseFloat(e.target.value), v: 0 });
                    }}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400"
                  />
                </div>
              </div>

              <button
                onClick={async () => {
                  const off = textureOffsets[selectedCelestial.id] ?? { u: 0, v: 0 };
                  const payload = JSON.stringify({ planetId: selectedCelestial.id, u: off.u });
                  try {
                    await navigator.clipboard.writeText(payload);
                    alert(isZh ? `已复制: ${payload}` : `Copied: ${payload}`);
                  } catch {
                    alert(isZh ? '复制失败，请手动复制' : 'Copy failed, please copy manually');
                  }
                }}
                className="w-full flex items-center justify-center space-x-1.5 py-2 rounded-lg text-[11px] font-semibold cursor-pointer border border-cyan-500/30 bg-cyan-950/20 text-cyan-400 hover:bg-cyan-950/40 hover:border-cyan-500/50 active:scale-95 transition-all"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>{isZh ? '复制结果' : 'Copy Result'}</span>
              </button>
            </div>
          )}

          {/* 装饰底框 */}
          <div className="border-t border-slate-900 pt-2.5 flex items-center justify-between text-[8px] text-slate-500 font-mono select-none">
            <span>EPOCH J2000 REFERENCE</span>
            <span className="text-indigo-400 font-semibold uppercase">STELLAR FRAMEWORK v3.5</span>
          </div>
        </div>
      )}

      {/* 底部贴士 */}
      <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 pointer-events-none bg-slate-950/70 border border-slate-800/60 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] text-slate-400 text-center select-none z-10 shadow-md">
        {isZh
          ? '💡 拖拽360度环顾天空；滚轮缩放视角；右上角🔭切换望远镜模式；悬停磁吸关注星体并单击选择'
          : '💡 Drag to pan 360° sky. Scroll to zoom FOV. 🔭 Telescope toggle top-right. Hover to snap, click to select stars.'}
      </div>

      {/* 望远镜覆盖层 — 独立模块 */}
      <TelescopeOverlay
        active={telescopeActive}
        currentFov={fovRef.current}
        onFovChange={setFov}
        onClose={() => onTelescopeChange?.(false)}
        lang={lang}
      />
    </div>
  );
}
