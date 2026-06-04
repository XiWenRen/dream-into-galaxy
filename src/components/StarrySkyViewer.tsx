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
  createNoiseTexture,
  createSolarCoronaTexture,
  createBrightStarGlowTexture,
  createConstellationLabelTexture,
  createConstellationLabelSprite,
  createLensFlareBlobTexture,
  createLensFlareRingTexture,
  createLensFlareHexTexture,
  createLensFlareSparkleTexture,
  createHorizonGlowTexture,
  createProceduralTexture,
  createMoonGlowTexture,
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

const CITIES = [
  { nameZh: '🇨🇳 北京', nameEn: 'Beijing', lat: 39.90, lon: 116.41 },
  { nameZh: '🇨🇳 上海', nameEn: 'Shanghai', lat: 31.23, lon: 121.47 },
  { nameZh: '🇨🇳 深圳', nameEn: 'Shenzhen', lat: 22.54, lon: 114.06 },
  { nameZh: '🇨🇳 成都', nameEn: 'Chengdu', lat: 30.57, lon: 104.07 },
  { nameZh: '🇨🇳 西安', nameEn: 'Xi\'an', lat: 34.34, lon: 108.94 },
  { nameZh: '🇺🇸 纽约', nameEn: 'New York', lat: 40.71, lon: -74.01 },
  { nameZh: '🇬🇧 伦敦', nameEn: 'London', lat: 51.51, lon: -0.13 },
  { nameZh: '🇫🇷 巴黎', nameEn: 'Paris', lat: 48.86, lon: 2.35 },
  { nameZh: '🇯🇵 东京', nameEn: 'Tokyo', lat: 35.68, lon: 139.69 },
  { nameZh: '🇰🇷 首尔', nameEn: 'Seoul', lat: 37.56, lon: 126.97 },
  { nameZh: '🇸🇬 新加坡', nameEn: 'Singapore', lat: 1.35, lon: 103.82 },
  { nameZh: '🇦🇺 悉尼', nameEn: 'Sydney', lat: -33.87, lon: 151.21 },
  { nameZh: '🇷🇺 莫斯科', nameEn: 'Moscow', lat: 55.76, lon: 37.62 },
  { nameZh: '🇮🇳 孟买', nameEn: 'Mumbai', lat: 19.08, lon: 72.88 },
  { nameZh: '🇧🇷 圣保罗', nameEn: 'São Paulo', lat: -23.55, lon: -46.63 },
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
  let altRad = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  let altDeg = (altRad * 180.0) / Math.PI;

  // Atmospheric refraction (Earth only): simplified Saemundsson formula
  // R in arcminutes, h in degrees. Only applied for low altitudes.
  if ((!bodyId || bodyId === 'earth') && altDeg < 15.0 && altDeg > -5.0) {
    const h = Math.max(altDeg, 0.0); // clamp to 0 for numerical stability near horizon
    const R = 1.02 / Math.tan((h + 10.3 / (h + 5.11)) * Math.PI / 180.0);
    altDeg = altDeg + R / 60.0;
    altRad = (altDeg * Math.PI) / 180.0;
  }

  // Azimuth
  const y = -Math.sin(haRad) * Math.cos(decRad);
  const x = Math.cos(latRad) * Math.sin(decRad) - Math.sin(latRad) * Math.cos(decRad) * Math.cos(haRad);
  let azRad = Math.atan2(y, x);
  let azDeg = (azRad * 180.0) / Math.PI;
  azDeg = (azDeg + 360) % 360; // 0 is North, 90 East, 180 South, 270 West

  return { az: azDeg, alt: altDeg };
};

// Project alt/az coordinates to 3D dome position
const get3DPositionOnDome = (az: number, alt: number, radius: number, out?: THREE.Vector3): THREE.Vector3 => {
  const azRad = (az * Math.PI) / 180.0;
  const altRad = (alt * Math.PI) / 180.0;

  // Z points North, X points East, Y points Zenith
  const x = radius * Math.cos(altRad) * Math.sin(azRad);
  const y = radius * Math.sin(altRad);
  const z = -radius * Math.cos(altRad) * Math.cos(azRad);

  if (out) {
    return out.set(x, y, z);
  }
  return new THREE.Vector3(x, y, z);
};

// Reusable static vector/matrix pools to eliminate garbage collection (GC) pressure in frame rendering
const _sunWorldPos = new THREE.Vector3();
const _sunDir = new THREE.Vector3();
const _sunScreen = new THREE.Vector3();
const _ndcPos = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _flareWorldPos = new THREE.Vector3();
const _celestialNorth = new THREE.Vector3();
const _camDir = new THREE.Vector3();
const _topColor = new THREE.Color();
const _horizonColor = new THREE.Color();
const _tempV3 = new THREE.Vector3();

// Reusable variables for setTidallyLockedOrientation
const _toObserver = new THREE.Vector3();
const _up = new THREE.Vector3();
const _right = new THREE.Vector3();
const _negRight = new THREE.Vector3();
const _trueUp = new THREE.Vector3();
const _matrix = new THREE.Matrix4();
const _negToObserver = new THREE.Vector3();
const _defaultNorth = new THREE.Vector3(0, 1, 0);


/**
 * Compute atmospheric extinction factor for a star at given altitude.
 * Uses Kasten-Young airmass formula with a typical extinction coefficient k=0.2.
 * Returns a flux multiplier (1.0 = no extinction, 0.0 = fully extinguished).
 * Only applied for Earth observers.
 */
const getAtmosphericExtinction = (altDeg: number, observerBodyId?: string): number => {
  if (observerBodyId && observerBodyId !== 'earth') return 1.0;
  if (altDeg >= 90) return Math.pow(10, -0.4 * 0.2); // airmass=1 at zenith
  const altRad = (Math.max(altDeg, 0) * Math.PI) / 180.0;
  const sinAlt = Math.sin(altRad);
  // Kasten-Young airmass formula
  const airmass = 1.0 / (sinAlt + 0.025 * Math.exp(-11.0 * sinAlt));
  const k = 0.2; // typical visual extinction coefficient for clear sky
  const deltaMag = k * airmass;
  return Math.pow(10, -0.4 * deltaMag);
};

/**
 * Build the IAU 2006 precession matrix P = Rz(-z) * Ry(theta) * Rz(-zeta)
 * as a flat 3x3 array for WebGL uniform consumption.
 */
const buildPrecessionMatrix = (yearsSinceJ2000: number): Float32Array => {
  const D2R = Math.PI / 180.0;
  const T = yearsSinceJ2000 / 100.0;
  const zetaArcsec = 2306.083227 * T + 0.2988500 * T * T + 0.01802827 * T * T * T;
  const zArcsec    = 2306.077181 * T + 1.0927348 * T * T + 0.01826837 * T * T * T;
  const thetaArcsec = 2004.191903 * T - 0.4294934 * T * T - 0.04182264 * T * T * T;
  const zeta = zetaArcsec * D2R / 3600.0;
  const z    = zArcsec    * D2R / 3600.0;
  const theta = thetaArcsec * D2R / 3600.0;

  const cz = Math.cos(zeta);
  const sz = Math.sin(zeta);
  const cZ = Math.cos(z);
  const sZ = Math.sin(z);
  const ct = Math.cos(theta);
  const st = Math.sin(theta);

  // P = Rz(-z) * Ry(theta) * Rz(-zeta)
  const m = new Float32Array(9);
  m[0] = cZ * ct * cz - sZ * sz;
  m[1] = -cZ * ct * sz - sZ * cz;
  m[2] = cZ * st;
  m[3] = sZ * ct * cz + cZ * sz;
  m[4] = -sZ * ct * sz + cZ * cz;
  m[5] = sZ * st;
  m[6] = -st * cz;
  m[7] = st * sz;
  m[8] = ct;
  return m;
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
    twilightColor: [0.9, 0.38, 0.12],
    nightColor: [0.02, 0.03, 0.06],
    twilightWidth: 24,
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
 * 根据太阳赤纬和观测者纬度动态调整晨昏带宽度（节气影响日出日落时长）
 */
const getAtmosphereColors = (
  bodyId: string,
  sunAlt: number,
  sunDec: number = 0,
  latitude: number = 0
): {
  r: number; g: number; b: number;
  brightness: number;
  ambientIntensity: number;
  starDayVisible: boolean;
  opaqueAtmosphere: boolean;
  dayColor: [number, number, number];
  nightColor: [number, number, number];
  horizonGlowR: number; horizonGlowG: number; horizonGlowB: number;
  sunOpacity: number;
} => {
  const cfg = ATMOSPHERE_CONFIG[bodyId] ?? ATMOSPHERE_CONFIG['earth'];

  const safeSunAlt = isNaN(sunAlt) ? -90.0 : sunAlt;
  const safeSunDec = isNaN(sunDec) ? 0.0 : sunDec;
  const safeLatitude = isNaN(latitude) ? 0.0 : latitude;

  // 根据节气（太阳赤纬）和纬度动态调整晨昏带宽度
  let twilight = cfg.twilightWidth;
  if (bodyId === 'earth' && twilight > 0) {
    const latRad = (safeLatitude * Math.PI) / 180;
    const decRad = (safeSunDec * Math.PI) / 180;
    // 夏季（同半球且高纬度）晨昏带更长，冬季更短
    const seasonFactor = Math.sin(latRad) * Math.sin(decRad);
    const seasonalMultiplier = 1.0 + seasonFactor * 0.6;
    twilight = Math.max(18, Math.min(36, cfg.twilightWidth * seasonalMultiplier));
  }

  // Calculate sky brightness factor (0 = night, 1 = full day)
  let brightness = 0.0;
  if (twilight <= 0) {
    brightness = 0.0;
  } else if (safeSunAlt >= twilight) {
    brightness = 1.0;
  } else if (safeSunAlt > 0) {
    brightness = 0.1 + 0.9 * (safeSunAlt / twilight);
  } else if (safeSunAlt >= -twilight) {
    brightness = 0.1 * ((safeSunAlt + twilight) / twilight);
  } else {
    brightness = 0.0;
  }

  if (isNaN(brightness)) brightness = 0.0;

  // Interpolate between night and day colors
  const r = cfg.nightColor[0] * (1.0 - brightness) + cfg.dayColor[0] * brightness;
  const g = cfg.nightColor[1] * (1.0 - brightness) + cfg.dayColor[1] * brightness;
  const b = cfg.nightColor[2] * (1.0 - brightness) + cfg.dayColor[2] * brightness;

  // Add sunset/twilight tint when sun is near horizon (enhanced for vivid sunrise/sunset)
  let sunsetR = r;
  let sunsetG = g;
  let sunsetB = b;

  let sunsetFactor = 0.0;
  let deepTwilightFactor = 0.0;

  if (twilight > 0) {
    sunsetFactor = Math.max(0.0, 1.0 - Math.abs(safeSunAlt - (-3.0)) / (twilight * 0.4));
    if (isNaN(sunsetFactor)) sunsetFactor = 0.0;
    deepTwilightFactor = Math.max(0.0, 1.0 - Math.abs(safeSunAlt - (-8.0)) / (twilight * 0.5));
    if (isNaN(deepTwilightFactor)) deepTwilightFactor = 0.0;

    sunsetR = r * (1.0 - sunsetFactor) + cfg.twilightColor[0] * sunsetFactor;
    sunsetG = g * (1.0 - sunsetFactor) + cfg.twilightColor[1] * sunsetFactor;
    sunsetB = b * (1.0 - sunsetFactor) + cfg.twilightColor[2] * sunsetFactor;

    // Deep twilight: inject purple/magenta tones for dramatic post-sunset
    if (deepTwilightFactor > 0 && bodyId === 'earth') {
      sunsetR = sunsetR * (1.0 - deepTwilightFactor * 0.3) + 0.35 * deepTwilightFactor;
      sunsetG = sunsetG * (1.0 - deepTwilightFactor * 0.2) + 0.15 * deepTwilightFactor;
      sunsetB = sunsetB * (1.0 - deepTwilightFactor * 0.1) + 0.45 * deepTwilightFactor;
    }
  }

  // 地平线辉光颜色：日出日落时更宏大、层次更丰富
  let horizonGlowR = sunsetR;
  let horizonGlowG = sunsetG;
  let horizonGlowB = sunsetB;
  if (bodyId === 'earth' && twilight > 0 && safeSunAlt > -twilight && safeSunAlt < twilight) {
    const glowIntensity = Math.max(0.0, 1.0 - Math.abs(safeSunAlt) / (twilight * 0.5));
    if (!isNaN(glowIntensity)) {
      // 朝霞/晚霞：偏暖的橙红色调
      const dawnR = Math.min(1.0, cfg.twilightColor[0] * 1.15 + 0.1);
      const dawnG = Math.min(1.0, cfg.twilightColor[1] * 0.9 + 0.05);
      const dawnB = Math.min(1.0, cfg.twilightColor[2] * 0.7 + 0.05);
      horizonGlowR = sunsetR * (1.0 - glowIntensity * 0.7) + dawnR * glowIntensity * 0.7;
      horizonGlowG = sunsetG * (1.0 - glowIntensity * 0.7) + dawnG * glowIntensity * 0.7;
      horizonGlowB = sunsetB * (1.0 - glowIntensity * 0.7) + dawnB * glowIntensity * 0.7;
    }
  }

  // 太阳被云层遮挡程度：日出日落时（太阳低角度）太阳轮廓模糊
  let sunOpacity = 1.0;
  if (bodyId === 'earth') {
    if (safeSunAlt > 0 && safeSunAlt < 8.0) {
      // 日出日落时太阳被低空大气/云层遮挡
      sunOpacity = 0.3 + (safeSunAlt / 8.0) * 0.7;
    } else if (safeSunAlt <= 0 && safeSunAlt > -twilight * 0.5) {
      // 晨昏带内太阳逐渐隐没
      sunOpacity = 0.3 * (1.0 - safeSunAlt / (-twilight * 0.5));
    } else if (safeSunAlt <= -twilight * 0.5) {
      sunOpacity = 0.0;
    }
  }
  if (isNaN(sunOpacity)) sunOpacity = 1.0;

  return {
    r: Math.max(0.0, Math.min(1.0, isNaN(sunsetR) ? 0.0 : sunsetR)),
    g: Math.max(0.0, Math.min(1.0, isNaN(sunsetG) ? 0.0 : sunsetG)),
    b: Math.max(0.0, Math.min(1.0, isNaN(sunsetB) ? 0.0 : sunsetB)),
    brightness,
    ambientIntensity: 0.35 * brightness + 0.02,
    starDayVisible: cfg.starDayVisible,
    opaqueAtmosphere: cfg.opaqueAtmosphere,
    dayColor: cfg.dayColor as [number, number, number],
    nightColor: cfg.nightColor as [number, number, number],
    horizonGlowR: Math.max(0.0, Math.min(1.0, isNaN(horizonGlowR) ? 0.0 : horizonGlowR)),
    horizonGlowG: Math.max(0.0, Math.min(1.0, isNaN(horizonGlowG) ? 0.0 : horizonGlowG)),
    horizonGlowB: Math.max(0.0, Math.min(1.0, isNaN(horizonGlowB) ? 0.0 : horizonGlowB)),
    sunOpacity,
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
  celestialNorth: THREE.Vector3 = _defaultNorth
): void {
  _toObserver.subVectors(observerPos, body.position).normalize();

  // 处理天顶附近的 gimbal lock：当目标方向与北天极几乎平行时，换用备用 up
  _up.copy(celestialNorth);
  if (Math.abs(_toObserver.dot(_up)) > 0.999) {
    _up.set(0, 0, 1);
  }

  _right.crossVectors(_up, _toObserver).normalize();
  _trueUp.crossVectors(_toObserver, _right).normalize();

  // 对齐天体视角的左右与正反面（X轴面向观察者，Y轴指向北天极，Z轴指向左侧，构成无镜像右手系）
  _negRight.copy(_right).negate();
  _matrix.makeBasis(_toObserver, _trueUp, _negRight);
  body.quaternion.setFromRotationMatrix(_matrix);
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
  renderer?: THREE.WebGLRenderer;
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
  onExitLanding?: () => void;
  selectedCelestial?: {
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
  } | null;
  setSelectedCelestial?: (celestial: any) => void;
  onChangeLatitude?: (latitude: number) => void;
  onChangeLongitude?: (longitude: number) => void;
}

export default function StarrySkyViewer({
  renderer: externalRenderer,
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
  demoState,
  onExitLanding,
  selectedCelestial,
  setSelectedCelestial,
  onChangeLatitude,
  onChangeLongitude,
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
  const eclipseUniformsRef = useRef<any>(null);
  const sunCoronaSpriteRef = useRef<THREE.Sprite | null>(null);
  const horizonGlowSpriteRef = useRef<THREE.Mesh | null>(null);
  const moonHazeSpriteRef = useRef<THREE.Sprite | null>(null);
  const planetRingRef = useRef<THREE.Mesh | null>(null);
  const lightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const constellLinesRef = useRef<THREE.LineSegments | null>(null);
  const constellLabelGroupRef = useRef<THREE.Group | null>(null);
  const constellLabelSpritesRef = useRef<THREE.Sprite[]>([]);
  const extraConstellLabelGroupRef = useRef<THREE.Group | null>(null);
  const extraConstellLabelSpritesRef = useRef<THREE.Sprite[]>([]);

  // 镜头光晕 (Lens Flare) 系统引用
  const lensFlareGroupRef = useRef<THREE.Group | null>(null);
  const lensFlareSpritesRef = useRef<{
    sprite: THREE.Sprite;
    offsetScale: number;
    baseScale: number;
    color: THREE.Color;
    texType: 'blob' | 'ring' | 'hex' | 'sparkle';
  }[]>([]);

  // 10,000星和行星渲染引用
  const starSpritesRef = useRef<THREE.Sprite[]>([]);
  const extraStarSpritesRef = useRef<THREE.Sprite[]>([]);
  const planetSpritesRef = useRef<Record<string, THREE.Sprite>>({});
  const backgroundPointsRef = useRef<THREE.Points | null>(null);

  // Hipparcos 真实星表数据（用于背景星渲染）
  const hipparcosRef = useRef<{ ra: number; dec: number; mag: number; color: number }[]>([]);

  // 岁差矩阵缓存与频率节流控制
  const lastPrecYearsRef = useRef<number>(-999999);
  const cachedPrecessionMatrixRef = useRef<Float32Array | null>(null);

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
  const [currentFov, setCurrentFov] = useState(65);
  const detailedPlanetsRef = useRef<Record<string, THREE.Mesh>>({});
  const finderCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const telescopeActiveRef = useRef(telescopeActive);

  useEffect(() => {
    telescopeActiveRef.current = telescopeActive;
  }, [telescopeActive]);

  // 本地 FOV 设置函数（替代全局 window 污染）
  const setFov = (fov: number) => {
    if (!cameraRef.current) return;
    cameraRef.current.fov = fov;
    cameraRef.current.updateProjectionMatrix();
    fovRef.current = fov;
    setCurrentFov(fov);
  };

  const textureCacheRef = useRef<Record<string, THREE.Texture>>({});
  const observerBodyIdRef = useRef(observerBodyId);
  const bodyMatrixCacheRef = useRef<THREE.Matrix3 | null>(null);
  const lastObserverBodyIdRef = useRef<string>(observerBodyId);

  // 辅助函数：基于当前观测者参考系计算本地恒星时（支持任意天体）
  const getObserverLST = () => {
    const ctx = { bodyId: observerBodyIdRef.current, latitude: latitudeRef.current, longitude: longitudeRef.current };
    return ObserverEngine.getLocalSiderealTime(ctx, currentTimestampRef.current);
  };

  // 辅助函数：根据当前经纬度匹配并显示最接近的城市名
  const getCurrentCityName = () => {
    let minDistance = Infinity;
    let closestCity = CITIES[0];
    for (const city of CITIES) {
      const dLat = city.lat - latitude;
      const dLon = city.lon - longitude;
      const dist = dLat * dLat + dLon * dLon;
      if (dist < minDistance) {
        minDistance = dist;
        closestCity = city;
      }
    }
    if (minDistance < 25.0) {
      const name = lang === 'zh' ? closestCity.nameZh : closestCity.nameEn;
      // 去除国旗 emoji，只保留纯文本城市名
      return name.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '').trim();
    }
    return lang === 'zh' ? '自定义位置' : 'Custom Location';
  };

  const textureOffsetsRef = useRef(textureOffsets);
  const satelliteSpritesRef = useRef<Record<string, THREE.Sprite>>({});

  // 磁吸snap目标跟踪
  const snapTargetRef = useRef<THREE.Sprite | THREE.Mesh | null>(null);

  // Demo mode refs
  const demoStateRef = useRef(demoState);
  const sunPathArcRef = useRef<THREE.Line | null>(null);

  // 选中天体的屏幕坐标及DOM Ref（用于SVG圈圈跟随，避免高频React重渲染）
  const selectionReticleRef = useRef<HTMLDivElement>(null);
  const selectedObjectRef = useRef<THREE.Object3D | null>(null);

  // 选中圆圈动画闪烁key（每次点击就重置动画）
  const [selectionRingKey, setSelectionRingKey] = useState(0);

  // 城市快速切换菜单显示状态及Ref
  const [showCityMenu, setShowCityMenu] = useState(false);
  const cityMenuRef = useRef<HTMLDivElement>(null);

  // 点击外部时收起城市快速切换菜单
  useEffect(() => {
    if (!showCityMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (cityMenuRef.current && !cityMenuRef.current.contains(e.target as Node)) {
        setShowCityMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCityMenu]);

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
          moonMat.color.setHex(0xa0a0a0);
          moonMat.emissive.setHex(0x000000);
          moonMat.emissiveIntensity = 0;
          loadRealTexture(dominant.textureUrl, textureCacheRef, (tex) => {
            if (observerBodyIdRef.current === 'earth' && moonSkyRef.current) {
              const off = textureOffsetsRef.current['moon'] ?? { u: 0, v: 0 };
              tex.wrapS = THREE.RepeatWrapping;
              tex.wrapT = THREE.ClampToEdgeWrapping;
              tex.minFilter = THREE.LinearFilter;
              tex.offset.x = off.u;
              tex.offset.y = off.v;
              const moonMat = moonSkyRef.current.material as THREE.MeshStandardMaterial;
              moonMat.map = tex;
              if (moonMat.bumpMap) {
                moonMat.bumpMap.offset.x = off.u;
                moonMat.bumpMap.offset.y = off.v;
              }
              moonMat.needsUpdate = true;
            }
          });
          // 重置光晕为月球白色
          if (moonHazeSpriteRef.current) {
            moonHazeSpriteRef.current.position.set(-8.5, 0, 0);
            moonHazeSpriteRef.current.material.color.setHex(0xffffff);
          }
        } else if (observerBodyId === 'moon') {
          moonSky.scale.setScalar(4.0);
          moonMat.color.setHex(0xa0a0a0);
          moonMat.emissive.setHex(0x1a5a8a);
          moonMat.emissiveIntensity = 0.6;
          loadRealTexture(dominant.textureUrl, textureCacheRef, (tex) => {
            if (observerBodyIdRef.current === 'moon' && moonSkyRef.current) {
              const off = textureOffsetsRef.current['earth'] ?? { u: 0, v: 0 };
              tex.wrapS = THREE.RepeatWrapping;
              tex.wrapT = THREE.ClampToEdgeWrapping;
              tex.minFilter = THREE.LinearFilter;
              tex.offset.x = off.u;
              tex.offset.y = off.v;
              const moonMat = moonSkyRef.current.material as THREE.MeshStandardMaterial;
              moonMat.map = tex;
              if (moonMat.bumpMap) {
                moonMat.bumpMap.offset.x = off.u;
                moonMat.bumpMap.offset.y = off.v;
              }
              moonMat.needsUpdate = true;
            }
          });
          // 地球蓝晕光（从月球看地球）
          if (moonHazeSpriteRef.current) {
            moonHazeSpriteRef.current.position.set(-8.5, 0, 0);
            moonHazeSpriteRef.current.material.color.setHex(0x88bbff);
            moonHazeSpriteRef.current.material.opacity = 0.6;
          }
        } else {
          // General satellite observer: parent planet as dominant body
          moonSky.scale.setScalar(1.0);
          moonMat.color.setHex(0xa0a0a0);
          moonMat.emissive.setHex(0x000000);
          moonMat.emissiveIntensity = 0;
          loadRealTexture(dominant.textureUrl, textureCacheRef, (tex) => {
            if (observerBodyIdRef.current === observerBodyId && moonSkyRef.current) {
              const off = textureOffsetsRef.current[dominant.id] ?? { u: 0, v: 0 };
              tex.wrapS = THREE.RepeatWrapping;
              tex.wrapT = THREE.ClampToEdgeWrapping;
              tex.minFilter = THREE.LinearFilter;
              tex.offset.x = off.u;
              tex.offset.y = off.v;
              const moonMat = moonSkyRef.current.material as THREE.MeshStandardMaterial;
              moonMat.map = tex;
              if (moonMat.bumpMap) {
                moonMat.bumpMap.offset.x = off.u;
                moonMat.bumpMap.offset.y = off.v;
              }
              moonMat.needsUpdate = true;
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
        TimeEngine.getDaysSinceJ2000TDB(currentTimestampRef.current)
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


  const daysSinceJ2000Ref = useRef<number>(0);
  const moonPhaseInfoRef = useRef<any>(null);
  const sunRaRef = useRef<number>(0);
  const sunDecRef = useRef<number>(0);
  const moonRaRef = useRef<number>(0);
  const moonDecRef = useRef<number>(0);
  // 月食检测频率限制相关 ref
  const eclipseCheckCounterRef = useRef<number>(0);
  const lastEclipseCheckDaysRef = useRef<number>(0);
  const lastEclipsesRef = useRef<{ solarEclipse: boolean; lunarEclipse: boolean }>({ solarEclipse: false, lunarEclipse: false });

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

  const compassDegRef = useRef<HTMLSpanElement>(null);
  const compassDirRef = useRef<HTMLSpanElement>(null);

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
    const isExternalRenderer = !!externalRenderer;
    const renderer = isExternalRenderer ? externalRenderer : new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = exposure;

    if (!isExternalRenderer) {
      renderer.domElement.style.position = 'absolute';
      renderer.domElement.style.top = '0';
      renderer.domElement.style.left = '0';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
    }

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
      // 望远镜激活时放开倍率限制到 216.7x，否则限制在 13x
      const maxMag = telescopeActiveRef.current ? 216.7 : 13;
      const newMag = Math.max(1, Math.min(maxMag, mag * zoomFactor));
      const newFov = 65 / newMag;
      setFov(newFov);
    };
    renderer.domElement.addEventListener('wheel', handleWheel, { passive: false });

    // 4. 环境及平行天体光照
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const light = new THREE.DirectionalLight(0xfff8f0, 4.0);
    scene.add(light);
    lightRef.current = light;

    const hemiLight = new THREE.HemisphereLight(0x88bbff, 0x111122, 0.35);
    scene.add(hemiLight);
    (ambientLightRef as any).hemiLight = hemiLight; // 暂存，方便下面统一调整

    // 5. 绘制地平线地面：纯色草地网格（不透明，避免与天空产生半透明蒙版）
    const groundGeo = new THREE.CylinderGeometry(150, 150, 2, 64);
    const groundMat = new THREE.MeshBasicMaterial({
      color: 0x05130b
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
          color: new THREE.Color(rgb.r, rgb.g, rgb.b).getHex(),
          pmRa: s.pmRa,
          pmDec: s.pmDec,
        };
      });

      const bgCount = hipparcosRef.current.length;
      const bgPositions = new Float32Array(bgCount * 3);
      const bgColors = new Float32Array(bgCount * 3);
      const bgStarData = new Float32Array(bgCount * 3); // x=ra(h), y=dec(deg), z=mag
      const bgPm = new Float32Array(bgCount * 2);      // x=pmRa, y=pmDec

      for (let i = 0; i < bgCount; i++) {
        const s = hipparcosRef.current[i];
        bgPositions[i * 3] = 0;
        bgPositions[i * 3 + 1] = -9999;
        bgPositions[i * 3 + 2] = 0;

        const color = new THREE.Color(s.color);
        bgColors[i * 3] = color.r;
        bgColors[i * 3 + 1] = color.g;
        bgColors[i * 3 + 2] = color.b;

        bgStarData[i * 3] = s.ra;
        bgStarData[i * 3 + 1] = s.dec;
        bgStarData[i * 3 + 2] = s.mag;
        bgPm[i * 2] = s.pmRa ?? 0;
        bgPm[i * 2 + 1] = s.pmDec ?? 0;
      }

      const bgGeometry = new THREE.BufferGeometry();
      bgGeometry.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3));
      bgGeometry.setAttribute('color', new THREE.BufferAttribute(bgColors, 3));
      bgGeometry.setAttribute('aStarData', new THREE.BufferAttribute(bgStarData, 3));
      bgGeometry.setAttribute('aPm', new THREE.BufferAttribute(bgPm, 2));

      const bgMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uPrecessionMatrix: { value: new THREE.Matrix3() },
          uBodyMatrix: { value: new THREE.Matrix3() },
          uYears: { value: 0.0 },
          uLST: { value: 0.0 },
          uLat: { value: 0.0 },
          uIsEarth: { value: 1.0 },
          uSkyBrightness: { value: 0.0 },
          uMagLimit: { value: 6.5 },
          uDomeRadius: { value: 150.0 },
          uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
          uViewportHeight: { value: 1080.0 },
        },
        vertexShader: /* glsl */ `
          attribute vec3 aStarData; // x=ra(h), y=dec(deg), z=mag
          attribute vec2 aPm;      // x=pmRa, y=pmDec (mas/yr)
          attribute vec3 color;
          uniform mat3 uPrecessionMatrix;
          uniform mat3 uBodyMatrix;
          uniform float uYears;
          uniform float uLST;
          uniform float uLat;
          uniform float uIsEarth;
          uniform float uSkyBrightness;
          uniform float uMagLimit;
          uniform float uDomeRadius;
          uniform float uPixelRatio;
          uniform float uViewportHeight;
          varying vec3 vColor;
          varying float vAlpha;

          void main() {
            float ra = aStarData.x;
            float dec = aStarData.y;
            float mag = aStarData.z;

            // Proper motion (mas/yr → degrees)
            float pmFactor = uYears / (3600.0 * 1000.0);
            float decRad0 = dec * 3.14159265359 / 180.0;
            float cosDec = cos(decRad0);
            ra += aPm.x * pmFactor / max(abs(cosDec), 0.01);
            dec += aPm.y * pmFactor;

            float raRad = ra * 3.14159265359 / 12.0;
            float decRad = dec * 3.14159265359 / 180.0;
            vec3 v = vec3(cos(decRad) * cos(raRad), cos(decRad) * sin(raRad), sin(decRad));

            // Precession
            v = uPrecessionMatrix * v;
            // Body equatorial rotation (identity for Earth)
            v = uBodyMatrix * v;

            // Local Sidereal Time → Hour Angle
            float lstRad = uLST * 3.14159265359 / 12.0;
            float latRad = uLat * 3.14159265359 / 180.0;
            float cL = cos(lstRad);
            float sL = sin(lstRad);
            float cLat = cos(latRad);
            float sLat = sin(latRad);

            float rotX = cL * v.x + sL * v.y;
            float rotY = -sL * v.x + cL * v.y;

            float zh = sLat * v.z + cLat * rotX; // sin(alt)
            float xh = cLat * v.z - sLat * rotX; // cos(alt)*cos(az)
            float yh = rotY;                     // cos(alt)*sin(az)

            float altRad = asin(clamp(zh, -1.0, 1.0));
            float altDeg = altRad * 180.0 / 3.14159265359;

            // Hide below horizon or above mag limit
            if (altDeg <= 0.0 || mag > uMagLimit) {
              gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
              gl_PointSize = 0.0;
              vColor = vec3(0.0);
              vAlpha = 0.0;
              return;
            }

            // Dome position: x=East, y=Up, z=-North
            vec3 domePos = vec3(uDomeRadius * yh, uDomeRadius * zh, -uDomeRadius * xh);
            vec4 mvPosition = modelViewMatrix * vec4(domePos, 1.0);
            gl_Position = projectionMatrix * mvPosition;

            // Magnitude brightness factor with FOV adaptation and size attenuation
            float fovScale = projectionMatrix[1][1];
            float safeFovScale = max(0.0001, fovScale);
            float zoomFactor = sqrt(safeFovScale / 1.57); // 平滑开方变焦衰减，防止高倍下星星过大
            float scale = uViewportHeight * 0.5 * zoomFactor / max(1.0, -mvPosition.z);
            
            float magFactor = max(0.4, pow(2.512, -(mag - 1.0)) * 2.5); // 提高暗星保底系数至 0.4
            gl_PointSize = clamp(2.2 * magFactor * scale, 1.2, 12.0); // 确保保底大小在 1.2px 以上，亮星最大 12px


            // Atmospheric extinction (Earth only)
            float extinction = 1.0;
            if (uIsEarth > 0.5) {
              float sinAlt = max(sin(altRad), 0.0);
              float airmass = 1.0 / (sinAlt + 0.025 * exp(-11.0 * sinAlt));
              float deltaMag = 0.2 * airmass;
              extinction = pow(10.0, -0.4 * deltaMag);
            }

            // Sky brightness visibility
            float sinAlt = max(sin(altRad), 0.0);
            float zenithFactor = pow(sinAlt, 0.8);
            float visibility = max(0.0, 1.0 - uSkyBrightness * (1.8 - 0.8 * zenithFactor));

            float factor = extinction * visibility;
            vColor = color * factor;
            vAlpha = 1.0;
          }
        `,
        fragmentShader: /* glsl */ `
          varying vec3 vColor;
          varying float vAlpha;
          void main() {
            float d = distance(gl_PointCoord, vec2(0.5));
            if (d > 0.5) discard;
            float strength = 1.0 - d * 2.0;
            strength = pow(strength, 2.0);
            gl_FragColor = vec4(vColor, strength * vAlpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexColors: false, // we use our own color attribute
      });

      const bgPoints = new THREE.Points(bgGeometry, bgMaterial);
      bgPoints.frustumCulled = false; // positions computed entirely in vertex shader
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
    // 增强太阳本体：更大、更亮、带轻微自发光
    const sunGeom = new THREE.SphereGeometry(10.5, 128, 128);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfffef5 });
    const sunSky = new THREE.Mesh(sunGeom, sunMat);
    scene.add(sunSky);
    sunSkyRef.current = sunSky;

    // 增强日冕：更大、更亮的多层日冕
    const sunCoronaTex = createSolarCoronaTexture();
    const sunCoronaMat = new THREE.SpriteMaterial({
      map: sunCoronaTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 1.0,
      color: new THREE.Color(0xfff8e7)
    });
    const sunCoronaSprite = new THREE.Sprite(sunCoronaMat);
    sunCoronaSprite.scale.set(68.0, 68.0, 1.0);
    sunSky.add(sunCoronaSprite);
    sunCoronaSpriteRef.current = sunCoronaSprite;

    // 天空霞光穹顶（着色器实现，消除硬边，丰富颜色层次）
    const skyDomeGeometry = new THREE.SphereGeometry(500, 64, 32);
    const skyDomeMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 sunDir;
        uniform float sunAlt;
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        uniform vec3 nightColor;
        uniform float uTime;

        varying vec3 vWorldPos;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 4; i++) {
            v += a * noise(p);
            p *= 2.1;
            a *= 0.5;
          }
          return v;
        }

        void main() {
          vec3 dir = normalize(vWorldPos);
          float y = dir.y;

          float sunDot = max(0.0, dot(dir, sunDir));

          // 基础天空：白天因子
          float dayFactor = smoothstep(-12.0, 6.0, sunAlt);

          // 基础天空色：根据高度混合
          vec3 sky = mix(nightColor, topColor, dayFactor * smoothstep(-0.2, 0.8, y));

          // 地平线暖色（朝向太阳方向更暖）—— 仅在日出日落时显著，正午消退
          float sunsetWarmth = smoothstep(15.0, 0.0, sunAlt);
          vec3 horizonWarm = mix(horizonColor, vec3(1.0, 0.35, 0.15), pow(sunDot, 2.0) * 0.6 * sunsetWarmth);
          sky = mix(sky, horizonWarm, (1.0 - smoothstep(-0.1, 0.3, y)) * dayFactor);

          // 霞光仅在日出日落时显著，天文昏影结束后完全消失
          float glowFactor = smoothstep(-18.0, -6.0, sunAlt) * smoothstep(8.0, 0.0, sunAlt);

          // 第1层：深红（地平线附近，太阳方向集中）
          float layer1 = pow(sunDot, 3.0) * exp(-max(0.0, y) * 4.0) * glowFactor;
          vec3 color1 = vec3(1.0, 0.18, 0.05);

          // 第2层：橙黄（稍高，更宽）
          float layer2 = pow(sunDot, 1.5) * exp(-max(0.0, y) * 2.5) * glowFactor;
          vec3 color2 = vec3(1.0, 0.5, 0.12);

          // 第3层：金黄（更高，最宽）
          float layer3 = pow(sunDot, 0.8) * exp(-max(0.0, y) * 1.5) * glowFactor;
          vec3 color3 = vec3(1.0, 0.72, 0.35);

          // 云层噪声交织
          float cloudNoise = fbm(dir.xz * 3.0 + sunDir.xz * 2.0 + uTime * 0.02);

          // 混合各层，加入噪声交织
          vec3 glow = mix(color1, color2, smoothstep(0.0, 0.4, y + cloudNoise * 0.25));
          glow = mix(glow, color3, smoothstep(0.1, 0.5, y + cloudNoise * 0.15));

          // 整体霞光强度
          float glowStrength = max(layer1, max(layer2 * 0.65, layer3 * 0.35));
          glowStrength *= 0.5 + cloudNoise * 0.5;

          sky = mix(sky, glow, glowStrength);

          // 太阳热点
          float hotspot = pow(sunDot, 32.0);
          sky += vec3(1.0, 0.92, 0.75) * hotspot * 0.6 * dayFactor;

          // 地平线以下变暗
          if (y < -0.05) {
            sky *= max(0.0, 1.0 + y * 8.0);
          }

          gl_FragColor = vec4(sky, 1.0);
        }
      `,
      uniforms: {
        sunDir: { value: new THREE.Vector3(0, 1, 0) },
        sunAlt: { value: 45.0 },
        topColor: { value: new THREE.Color(0.35, 0.55, 0.9) },
        horizonColor: { value: new THREE.Color(0.85, 0.5, 0.25) },
        nightColor: { value: new THREE.Color(0.02, 0.03, 0.06) },
        uTime: { value: 0.0 }
      },
      side: THREE.BackSide,
      depthWrite: false
    });
    const skyDome = new THREE.Mesh(skyDomeGeometry, skyDomeMaterial);
    scene.add(skyDome);
    horizonGlowSpriteRef.current = skyDome;

    // 镜头光晕 (Lens Flare) 系统初始化
    const lensFlareGroup = new THREE.Group();
    lensFlareGroup.name = 'lens-flare-group';
    scene.add(lensFlareGroup);
    lensFlareGroupRef.current = lensFlareGroup;

    const blobTex = createLensFlareBlobTexture();
    const flareRingTex = createLensFlareRingTexture();
    const hexTex = createLensFlareHexTexture();
    const sparkleTex = createLensFlareSparkleTexture();

    const flareDefs: { tex: THREE.Texture; type: 'blob' | 'ring' | 'hex' | 'sparkle'; offsetScale: number; baseScale: number; color: number }[] = [
      // 主光晕（紧贴太阳）
      { tex: blobTex, type: 'blob', offsetScale: 0.0, baseScale: 28.0, color: 0xfff8e7 },
      { tex: blobTex, type: 'blob', offsetScale: 0.05, baseScale: 18.0, color: 0xffddaa },
      // 内圈鬼影（朝向屏幕中心）
      { tex: hexTex, type: 'hex', offsetScale: 0.22, baseScale: 4.5, color: 0xffcc88 },
      { tex: flareRingTex, type: 'ring', offsetScale: 0.38, baseScale: 7.0, color: 0xffaa66 },
      { tex: blobTex, type: 'blob', offsetScale: 0.52, baseScale: 3.2, color: 0xffdd99 },
      { tex: hexTex, type: 'hex', offsetScale: 0.68, baseScale: 2.8, color: 0xffbb77 },
      { tex: sparkleTex, type: 'sparkle', offsetScale: 0.78, baseScale: 2.0, color: 0xffffff },
      // 外圈鬼影（越过太阳，在反方向）
      { tex: flareRingTex, type: 'ring', offsetScale: -0.35, baseScale: 5.5, color: 0xff8866 },
      { tex: blobTex, type: 'blob', offsetScale: -0.55, baseScale: 2.5, color: 0xffccaa },
      { tex: hexTex, type: 'hex', offsetScale: -0.72, baseScale: 1.8, color: 0xffaa88 },
      { tex: sparkleTex, type: 'sparkle', offsetScale: -0.88, baseScale: 1.5, color: 0xffeecc },
    ];

    const flareSprites: typeof lensFlareSpritesRef.current = [];
    flareDefs.forEach(def => {
      const mat = new THREE.SpriteMaterial({
        map: def.tex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.0,
        color: new THREE.Color(def.color),
      });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(def.baseScale, def.baseScale, 1.0);
      sprite.visible = false;
      lensFlareGroup.add(sprite);
      flareSprites.push({
        sprite,
        offsetScale: def.offsetScale,
        baseScale: def.baseScale,
        color: new THREE.Color(def.color),
        texType: def.type,
      });
    });
    lensFlareSpritesRef.current = flareSprites;

    // 寻星镜相机初始化
    const finderCamera = new THREE.PerspectiveCamera(15, 1, 0.1, 1000);
    finderCamera.position.set(0, 0, 0.1);
    finderCameraRef.current = finderCamera;

    // 预创精细行星球体 Mesh (金星, 火星, 木星, 土星)
    const detailedPlanets: Record<string, THREE.Mesh> = {};
    const detailNoiseTex = createNoiseTexture();
    detailNoiseTex.repeat.set(128, 64);

    const targetPlanetIds = ['sun', 'venus', 'mars', 'jupiter', 'saturn'];
    targetPlanetIds.forEach(pid => {
      const geom = new THREE.SphereGeometry(7.2, 128, 128);
      let mat: THREE.Material;
      if (pid === 'sun') {
        mat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 1.0
        });
      } else {
        mat = new THREE.MeshStandardMaterial({
          roughness: 0.85,
          metalness: 0.05,
          bumpMap: detailNoiseTex,
          bumpScale: 0.04,
        });
      }
      const mesh = new THREE.Mesh(geom, mat);
      mesh.visible = false;
      mesh.userData = {
        id: pid,
        type: 'planet-detailed',
      };
      scene.add(mesh);
      detailedPlanets[pid] = mesh;

      if (pid === 'sun') {
        const fallbackTex = createProceduralTexture('sun_telescope');
        fallbackTex.wrapS = THREE.RepeatWrapping;
        fallbackTex.wrapT = THREE.ClampToEdgeWrapping;
        (mat as THREE.MeshBasicMaterial).map = fallbackTex;
        mat.needsUpdate = true;

        const url = DOMINANT_BODY_TEXTURES['sun'];
        if (url) {
          loadRealTexture(url, textureCacheRef, (tex) => {
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.ClampToEdgeWrapping;
            (mat as THREE.MeshBasicMaterial).map = tex;
            mat.needsUpdate = true;
          });
        }
      } else {
        const url = DOMINANT_BODY_TEXTURES[pid];
        if (url) {
          loadRealTexture(url, textureCacheRef, (tex) => {
            (mat as THREE.MeshStandardMaterial).map = tex;
            mat.needsUpdate = true;
          });
        }
      }

      // 土星光环加到子物体并带上约23度的倾斜角
      if (pid === 'saturn') {
        const ringGeom = new THREE.RingGeometry(8.8, 16.5, 64);
        const ringTex = createSaturnRingTexture();
        const ringMat = new THREE.MeshBasicMaterial({
          map: ringTex,
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const ringMesh = new THREE.Mesh(ringGeom, ringMat);
        ringMesh.rotation.x = Math.PI / 2 - 0.4;
        mesh.add(ringMesh);
      }
    });
    detailedPlanetsRef.current = detailedPlanets;

    const moonGeom = new THREE.SphereGeometry(7.2, 128, 128);
    const moonTexture = createProceduralMoonTexture();
    const moonNoiseTex = createNoiseTexture();
    moonNoiseTex.repeat.set(128, 64);
    const moonMat = new THREE.MeshStandardMaterial({ 
      map: moonTexture,
      roughness: 1.0,
      metalness: 0.0,
      bumpMap: moonNoiseTex,
      bumpScale: 0.02,
      color: 0xa0a0a0,
    });

    const eclipseUniforms = {
      uEclipseActive: { value: 0.0 },
      uShadowDirection: { value: new THREE.Vector3(0, 0, -1) },
      uUmbraRadius: { value: 4.58 * Math.PI / 180 },
      uPenumbraRadius: { value: 7.63 * Math.PI / 180 },
    };
    eclipseUniformsRef.current = eclipseUniforms;

    moonMat.onBeforeCompile = (shader) => {
      shader.uniforms.uEclipseActive = eclipseUniforms.uEclipseActive;
      shader.uniforms.uShadowDirection = eclipseUniforms.uShadowDirection;
      shader.uniforms.uUmbraRadius = eclipseUniforms.uUmbraRadius;
      shader.uniforms.uPenumbraRadius = eclipseUniforms.uPenumbraRadius;

      shader.vertexShader = `
        varying vec3 vEclipseWorldPos;
        ${shader.vertexShader}
      `;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
        vEclipseWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;`
      );

      shader.fragmentShader = `
        varying vec3 vEclipseWorldPos;
        uniform float uEclipseActive;
        uniform vec3 uShadowDirection;
        uniform float uUmbraRadius;
        uniform float uPenumbraRadius;
        ${shader.fragmentShader}
      `;
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <colorspace_fragment>',
        `#include <colorspace_fragment>
        if (uEclipseActive > 0.5) {
          vec3 fragDir = normalize(vEclipseWorldPos);
          float cosDiff = dot(fragDir, uShadowDirection);
          float angle = acos(clamp(cosDiff, -1.0, 1.0));
          if (angle < uPenumbraRadius) {
            float shadowFactor = smoothstep(uUmbraRadius, uPenumbraRadius, angle);
            vec3 bloodMoonColor = gl_FragColor.rgb * vec3(0.85, 0.22, 0.08) * 0.18;
            gl_FragColor.rgb = mix(bloodMoonColor, gl_FragColor.rgb, shadowFactor);
          }
        }`
      );
    };

    const moonSky = new THREE.Mesh(moonGeom, moonMat);
    moonSky.renderOrder = 10;
    scene.add(moonSky);
    moonSkyRef.current = moonSky;

    // 月球使用 Sprite 模拟动态月晕
    const moonGlowTex = createMoonGlowTexture();
    const moonHazeMat = new THREE.SpriteMaterial({
      map: moonGlowTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.8,
      color: new THREE.Color(0xdbeafe),
      depthWrite: false,
    });
    const moonHazeSprite = new THREE.Sprite(moonHazeMat);
    moonHazeSprite.scale.set(55.0, 55.0, 1.0);
    moonHazeSprite.position.set(-8.5, 0, 0); // 后移至月球本体后方，借助深度测试实现月面无白圈截断
    moonHazeSprite.renderOrder = 9; // 优先绘制，借助深度测试实现月亮本身对其中心的天然遮挡
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
        ...(Object.values(detailedPlanetsRef.current) as THREE.Mesh[]).filter(m => m.visible),
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

      // 如果最邻近目标是3D详细行星模型，重定向回2D精灵，确保状态和坐标能一致处理
      if (closestTarget && closestTarget.userData.type === 'planet-detailed') {
        const sp = planetSpritesRef.current[closestTarget.userData.id];
        if (sp) closestTarget = sp;
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
      (Object.values(detailedPlanetsRef.current) as THREE.Mesh[]).forEach(mesh => {
        if (mesh && mesh.visible) targets.push(mesh);
      });
      if (sunSkyRef.current && sunSkyRef.current.visible) targets.push(sunSkyRef.current);
      if (moonSkyRef.current && moonSkyRef.current.visible) targets.push(moonSkyRef.current);

      const intersects = raycaster.intersectObjects(targets);
      if (intersects.length > 0) {
        let hit = intersects[0].object;
        if (hit === moonHazeSpriteRef.current || (hit.parent && hit.parent === moonSkyRef.current)) {
          hit = moonSkyRef.current;
        }
        if (hit.parent && hit.parent === sunSkyRef.current) {
          hit = sunSkyRef.current;
        }
        if (hit.parent && hit.parent.userData.type === 'planet-detailed') {
          hit = hit.parent;
        }
        if (hit.userData.type === 'planet-detailed') {
          const sp = planetSpritesRef.current[hit.userData.id];
          if (sp) hit = sp;
        }
        container.style.cursor = closestTarget ? 'crosshair' : 'pointer';

        if (hit === sunSkyRef.current || hit === detailedPlanetsRef.current['sun']) {
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
      const days = TimeEngine.getDaysSinceJ2000TDB(currentTimestampRef.current);
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
      (Object.values(detailedPlanetsRef.current) as THREE.Mesh[]).forEach(mesh => {
        if (mesh && mesh.visible) targets.push(mesh);
      });
      if (sunSkyRef.current && sunSkyRef.current.visible) targets.push(sunSkyRef.current);
      if (moonSkyRef.current && moonSkyRef.current.visible) targets.push(moonSkyRef.current);

      const intersects = raycaster.intersectObjects(targets);
      if (intersects.length > 0) {
        let hit = intersects[0].object;
        if (hit === moonHazeSpriteRef.current || (hit.parent && hit.parent === moonSkyRef.current)) {
          hit = moonSkyRef.current;
        }
        if (hit.parent && hit.parent === sunSkyRef.current) {
          hit = sunSkyRef.current;
        }
        if (hit.parent && hit.parent.userData.type === 'planet-detailed') {
          hit = hit.parent;
        }
        if (hit.userData.type === 'planet-detailed') {
          const sp = planetSpritesRef.current[hit.userData.id];
          if (sp) hit = sp;
        }

        // 记录选中天体
        selectedObjectRef.current = hit;
        setSelectionRingKey(k => k + 1);

        if (hit === sunSkyRef.current || hit === detailedPlanetsRef.current['sun']) {
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
      } else {
        selectedObjectRef.current = null;
        setSelectedCelestial?.(null);
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
      // 只有内部创建的 renderer 才 dispose，外部共享的 renderer 由 App 生命周期管理
      if (!isExternalRenderer) {
        renderer.dispose();
      } else {
        // 恢复共享渲染器状态，防止背景色污染或裁剪框残留影响宇宙模式
        renderer.setClearColor(new THREE.Color(0x000000), 0.0);
        renderer.setScissorTest(false);
      }
    };
  }, []);

  // 依赖时间/纬度/经度，循环计算恒星和日月方位角高程并更新天体
  useEffect(() => {
    const scene = sceneRef.current;
    const starsGroup = starsGroupRef.current;
    if (!scene || !starsGroup) return;

    const ctx = { bodyId: observerBodyId, latitude, longitude };
    const lst = ObserverEngine.getLocalSiderealTime(ctx, currentTimestamp);
    const days = TimeEngine.getDaysSinceJ2000TDB(currentTimestamp);
    const yearsSinceJ2000 = days / 365.25;

    // A. 太阳投影位置（多参考系）
    const { ra: sunRa, dec: sunDec } = ObserverEngine.getSolarRADec(ctx, days);
    const sunCoords = getHorizontalCoordinates(sunRa, sunDec, lst, latitude, observerBodyId);
    const sunPos = get3DPositionOnDome(sunCoords.az, sunCoords.alt, 278);

    // 提前计算大气颜色，获取 sunOpacity 等参数
    const atmoEarly = getAtmosphereColors(observerBodyId, sunCoords.alt, sunDec, latitude);
    const sunOpacity = atmoEarly.sunOpacity;

    if (sunSkyRef.current) {
      sunSkyRef.current.position.copy(sunPos);
      sunSkyRef.current.visible = sunCoords.alt > -2;

      const eclipses = AstrophenomenaEngine.detectEclipse(days);
      const sunMat = sunSkyRef.current.material as THREE.MeshBasicMaterial;
      if (eclipses.solarEclipse) {
        sunMat.color.setHex(0x0c0c0c);
        if (sunCoronaSpriteRef.current) {
          sunCoronaSpriteRef.current.material.opacity = 1.0;
          sunCoronaSpriteRef.current.scale.set(85.0, 85.0, 1.0);
          sunCoronaSpriteRef.current.material.color.setHex(0xfffaea);
        }
      } else {
        sunMat.color.setHex(0xfffef5);
        // 日出日落时太阳被低空大气/云层遮挡，轮廓模糊
        sunMat.opacity = sunOpacity;
        sunMat.transparent = sunOpacity < 1.0;
        if (sunCoronaSpriteRef.current) {
          // 望远镜放大时关闭日冕以防过曝遮挡太阳圆盘表面
          const coronaOpacity = telescopeActiveRef.current ? 0.0 : (Math.max(0.45, Math.min(1.0, (sunCoords.alt + 5) / 40.0)) * sunOpacity);
          sunCoronaSpriteRef.current.material.opacity = coronaOpacity;
          sunCoronaSpriteRef.current.visible = !telescopeActiveRef.current;
          sunCoronaSpriteRef.current.scale.set(68.0, 68.0, 1.0);
          // 日出日落时日冕偏暖
          const twilightFactor = Math.max(0.0, 1.0 - Math.abs(sunCoords.alt - 5.0) / 15.0);
          const coronaColor = new THREE.Color(0xfff8e7);
          coronaColor.lerp(new THREE.Color(0xffcc88), twilightFactor);
          sunCoronaSpriteRef.current.material.color.copy(coronaColor);
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
        // 月食检测频率限制：每 30 帧或模拟时间每推进 0.01 天才执行一次
        const eclipseCheckFrameInterval = 30;
        const eclipseCheckDayThreshold = 0.01;
        const shouldCheckEclipse =
          (eclipseCheckCounterRef.current % eclipseCheckFrameInterval === 0) ||
          (Math.abs(days - lastEclipseCheckDaysRef.current) > eclipseCheckDayThreshold);
        const eclipses = shouldCheckEclipse ? AstrophenomenaEngine.detectEclipse(days) : lastEclipsesRef.current;
        if (shouldCheckEclipse) {
          lastEclipseCheckDaysRef.current = days;
          lastEclipsesRef.current = eclipses;
        }
        eclipseCheckCounterRef.current++;
        const moonMat = moonSkyRef.current.material as THREE.MeshStandardMaterial;
        
        // Use a wider window (1.6 degrees separation) to calculate visual overlap transitions
        // This ensures the shader is active before the visual shadow touches the Moon, eliminating entry/exit jumps.
        const isLunarEclipseActive = eclipses.angleDegrees > 90.0 && (180.0 - eclipses.angleDegrees) < 1.6;

        if (eclipses.solarEclipse) {
          moonMat.color.setHex(0x111111);
          if (moonHazeSpriteRef.current) {
            moonHazeSpriteRef.current.visible = false;
            moonHazeSpriteRef.current.material.opacity = 0.0;
          }
          if (eclipseUniformsRef.current) {
            eclipseUniformsRef.current.uEclipseActive.value = 0.0;
          }
        } else if (isLunarEclipseActive) {
          // Base color of the Moon remains 0xa0a0a0 to allow shader to calculate shaded and unshaded regions without blowing out
          moonMat.color.setHex(0xa0a0a0);
          
          if (moonHazeSpriteRef.current) {
            moonHazeSpriteRef.current.visible = moonSkyRef.current.visible;
          }
          
          if (eclipseUniformsRef.current) {
            eclipseUniformsRef.current.uEclipseActive.value = 1.0;
            
            // Get direction vectors
            const dirSun = sunPos.clone().normalize();
            const dirShadow = dirSun.clone().negate(); // Shadow center is opposite to the Sun
            const dirMoon = moonPos.clone().normalize();
            
            // Calculate actual angular separation
            const alpha = dirMoon.angleTo(dirShadow);
            
            // Exaggerate separation by 6.1x to match the visual size exaggeration of the Moon
            const exaggeration = 6.1;
            const visualAlpha = Math.min(Math.PI, alpha * exaggeration);
            
            if (alpha > 0.0001) {
              const axis = new THREE.Vector3().crossVectors(dirMoon, dirShadow).normalize();
              const dirShadowVisual = dirMoon.clone().applyAxisAngle(axis, visualAlpha);
              eclipseUniformsRef.current.uShadowDirection.value.copy(dirShadowVisual);
            } else {
              eclipseUniformsRef.current.uShadowDirection.value.copy(dirShadow);
            }
            
            // Update Haze Sprite color and opacity based on shadow overlap progress
            if (moonHazeSpriteRef.current) {
              const rUmbra = 4.58 * Math.PI / 180;
              const rPenumbra = 7.63 * Math.PI / 180;
              const rMoon = 1.53 * Math.PI / 180;
              
              const totalityEnd = rUmbra - rMoon;   // ~3.05 degrees
              const eclipseEnd = rPenumbra + rMoon;   // ~9.16 degrees
              
              if (visualAlpha < totalityEnd) {
                // Totality: deep red glow
                moonHazeSpriteRef.current.material.color.setHex(0xff3311);
                moonHazeSpriteRef.current.material.opacity = 0.75;
              } else if (visualAlpha > eclipseEnd) {
                // Out of eclipse: normal Full Moon glow
                moonHazeSpriteRef.current.material.color.setHex(0xdbeafe);
                const glowFactor = Math.max(0.12, moonPhaseInfo.percent);
                moonHazeSpriteRef.current.material.opacity = 0.8 * glowFactor;
              } else {
                // Partial eclipse transitions
                const t = (visualAlpha - totalityEnd) / (eclipseEnd - totalityEnd);
                const colorRed = new THREE.Color(0xff3311);
                const colorNormal = new THREE.Color(0xdbeafe);
                const finalColor = new THREE.Color().lerpColors(colorRed, colorNormal, t);
                moonHazeSpriteRef.current.material.color.copy(finalColor);
                
                const opacityNormal = 0.8 * Math.max(0.12, moonPhaseInfo.percent);
                moonHazeSpriteRef.current.material.opacity = THREE.MathUtils.lerp(0.75, opacityNormal, t);
              }
            }
          }
        } else {
          moonMat.color.setHex(0xa0a0a0);
          if (eclipseUniformsRef.current) {
            eclipseUniformsRef.current.uEclipseActive.value = 0.0;
          }
          if (moonHazeSpriteRef.current) {
            moonHazeSpriteRef.current.visible = moonSkyRef.current.visible;
            moonHazeSpriteRef.current.material.color.setHex(0xdbeafe);
            const glowFactor = Math.max(0.12, moonPhaseInfo.percent);
            moonHazeSpriteRef.current.material.opacity = 0.8 * glowFactor;
          }
        }

        // Calculate offset for Moon glow based on Sun direction and phase
        if (moonHazeSpriteRef.current) {
          const dirSun = sunPos.clone().normalize();
          const localSunY = dirSun.dot(_trueUp);
          const localSunZ = dirSun.dot(_negRight);
          const projLen = Math.sqrt(localSunZ * localSunZ + localSunY * localSunY);
          let shiftY = 0;
          let shiftZ = 0;
          if (projLen > 0.01) {
            // Offset shifts more as the phase grows thinner (less illuminated)
            const shiftAmount = 2.4 * (1.0 - moonPhaseInfo.percent);
            shiftY = (localSunY / projLen) * shiftAmount;
            shiftZ = (localSunZ / projLen) * shiftAmount;
          }
          moonHazeSpriteRef.current.position.set(-8.5, shiftY, shiftZ);
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
          moonHazeSpriteRef.current.position.set(-8.5, 0, 0); // reset position
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

    const sunAlt = sunCoords.alt;
    const atmo = atmoEarly;
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
      const starData = sprite.userData.starData as DetailedStar | undefined;
      const prec = ObserverEngine.applyPrecession(ra, dec, yearsSinceJ2000, starData?.pmRa, starData?.pmDec);
      const starCoords = getHorizontalCoordinates(prec.ra, prec.dec, lst, latitude, observerBodyId);

      let baseOpacity = 0;
      let visible = false;

      if (starCoords.alt > 0) {
        visible = true;
        const altRad = starCoords.alt * Math.PI / 180.0;
        const sinAlt = Math.sin(altRad);
        const extinction = getAtmosphericExtinction(starCoords.alt, observerBodyId);
        // 天空亮度梯度：地平线附近比天顶亮，低高度角星星被更强遮挡
        const zenithFactor = Math.pow(sinAlt, 0.8);
        const visibility = Math.max(0.0, 1.0 - skyBrightness * (1.8 - 0.8 * zenithFactor));
        baseOpacity = atmo.opaqueAtmosphere ? 0 : (atmo.starDayVisible ? extinction : (visibility * extinction));
      }

      sprite.userData.az = starCoords.az;
      sprite.userData.alt = starCoords.alt;
      sprite.userData.baseOpacity = baseOpacity;

      const mag = sprite.userData.mag;
      const isVisibleMag = mag <= magLimit;
      const isVisible = visible && baseOpacity > 0.02 && isVisibleMag;
      sprite.visible = isVisible;

      if (isVisible) {
        const radius = sprite.userData.radius || 285;
        get3DPositionOnDome(starCoords.az, starCoords.alt, radius, sprite.position);
        const magFactor = Math.max(0.06, Math.min(1.0, Math.pow(2.512, -(mag - 1.0)) * 2.5));
        sprite.material.opacity = baseOpacity * magFactor;
      }
    });

    // D2. 额外星座恒星地平线截断及低空大气消光计算
    extraStarSpritesRef.current.forEach(sprite => {
      const ra = sprite.userData.ra;
      const dec = sprite.userData.dec;
      const starData = sprite.userData.starData as DetailedStar | undefined;
      const prec = ObserverEngine.applyPrecession(ra, dec, yearsSinceJ2000, starData?.pmRa, starData?.pmDec);
      const starCoords = getHorizontalCoordinates(prec.ra, prec.dec, lst, latitude, observerBodyId);

      let baseOpacity = 0;
      let visible = false;

      if (starCoords.alt > 0) {
        visible = true;
        const altRad = starCoords.alt * Math.PI / 180.0;
        const sinAlt = Math.sin(altRad);
        const extinction = getAtmosphericExtinction(starCoords.alt, observerBodyId);
        // 天空亮度梯度：地平线附近比天顶亮，低高度角星星被更强遮挡
        const zenithFactor = Math.pow(sinAlt, 0.8);
        const visibility = Math.max(0.0, 1.0 - skyBrightness * (1.8 - 0.8 * zenithFactor));
        baseOpacity = atmo.opaqueAtmosphere ? 0 : (atmo.starDayVisible ? extinction : (visibility * extinction));
      }

      sprite.userData.az = starCoords.az;
      sprite.userData.alt = starCoords.alt;
      sprite.userData.baseOpacity = baseOpacity;

      const mag = sprite.userData.mag;
      const isVisibleMag = mag <= magLimit;
      const isVisible = visible && baseOpacity > 0.02 && isVisibleMag;
      sprite.visible = isVisible;

      if (isVisible) {
        const radius = sprite.userData.radius || 285;
        get3DPositionOnDome(starCoords.az, starCoords.alt, radius, sprite.position);
        const magFactor = Math.max(0.06, Math.min(1.0, Math.pow(2.512, -(mag - 1.0)) * 2.5));
        sprite.material.opacity = baseOpacity * magFactor;
      }
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
          const altRad = planetCoords.alt * Math.PI / 180.0;
          const sinAlt = Math.sin(altRad);
          let extinction = 1.0;
          if (planetCoords.alt < 12) {
            extinction = sinAlt / Math.sin(12.0 * Math.PI / 180.0);
          }
          // 天空亮度梯度：地平线附近比天顶亮
          const zenithFactor = Math.pow(sinAlt, 0.8);
          const visibility = Math.max(0.0, 1.0 - skyBrightness * (1.8 - 0.8 * zenithFactor));
          baseOpacity = visibility * extinction;
        }
        sprite.userData.az = planetCoords.az;
        sprite.userData.alt = planetCoords.alt;
        sprite.userData.ra = info.ra;
        sprite.userData.dec = info.dec;
        sprite.userData.distAU = info.distAU;
        sprite.userData.angularDiameter = info.angularDiameter;
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
                const pA = ObserverEngine.applyPrecession(starA.ra, starA.dec, yearsSinceJ2000, starA.pmRa, starA.pmDec);
                const pB = ObserverEngine.applyPrecession(starB.ra, starB.dec, yearsSinceJ2000, starB.pmRa, starB.pmDec);
                const hA = getHorizontalCoordinates(pA.ra, pA.dec, lst, latitude, observerBodyId);
                const hB = getHorizontalCoordinates(pB.ra, pB.dec, lst, latitude, observerBodyId);

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
                const pA = ObserverEngine.applyPrecession(starA.ra, starA.dec, yearsSinceJ2000, starA.pmRa, starA.pmDec);
                const pB = ObserverEngine.applyPrecession(starB.ra, starB.dec, yearsSinceJ2000, starB.pmRa, starB.pmDec);
                const hA = getHorizontalCoordinates(pA.ra, pA.dec, lst, latitude, observerBodyId);
                const hB = getHorizontalCoordinates(pB.ra, pB.dec, lst, latitude, observerBodyId);

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
      // 星座连线只在太阳完全落山后才出现（天文昏影结束后，skyBrightness < 0.03）
      const constellVisible = showConstellLines && linePoints.length > 0 && skyBrightness < 0.03;
      lineMat.opacity = constellVisible ? 0.35 * Math.max(0, 1 - skyBrightness) : 0;
      constellLinesRef.current.visible = constellVisible;
    }

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

    daysSinceJ2000Ref.current = days;
    moonPhaseInfoRef.current = moonPhaseInfo;
    sunRaRef.current = sunRa;
    sunDecRef.current = sunDec;
    moonRaRef.current = moonRa;
    moonDecRef.current = moonDec;

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

        // 交互方向反转与 FOV 联动灵敏度
        if (controlsRef.current) {
          const baseSpeed = telescopeActiveRef.current ? 0.4 : -0.4;
          controlsRef.current.rotateSpeed = baseSpeed * (fovRef.current / 65.0);
        }

        // 大气视宁度微抖动（高倍目镜下 Seeing Jitter 仿真）
        if (telescopeActiveRef.current && fovRef.current <= 5.0 && cameraRef.current) {
          const time = performance.now() * 0.012;
          const noiseX = Math.sin(time * 1.7) * Math.cos(time * 0.9) + Math.sin(time * 3.1) * 0.2;
          const noiseY = Math.cos(time * 1.5) * Math.sin(time * 1.1) + Math.cos(time * 2.7) * 0.2;
          const jitterMag = (3.5 / 3600.0) * (Math.PI / 180.0);
          cameraRef.current.rotateX(noiseY * jitterMag);
          cameraRef.current.rotateY(noiseX * jitterMag);
        }

        // 实时计算方位角航向 (Azimuth heading) - ZERO ALLOCATION
        cameraRef.current.getWorldDirection(_dir);
        // 坐标系: Z指向北, X指向东
        const heading = (Math.atan2(_dir.x, -_dir.z) * 180 / Math.PI + 360) % 360;
        if (compassDegRef.current) {
          compassDegRef.current.textContent = `${heading.toFixed(0)}°`;
        }
        if (compassDirRef.current) {
          const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
          const idx = Math.round(heading / 22.5) % 16;
          compassDirRef.current.textContent = dirs[idx];
        }

        // 1. 太阳光照强度动态更新（日出日落时更温暖强烈）
        if (lightRef.current) {
          const sunAlt = sunAltRef.current;
          if (sunAlt >= 0) {
            // 白天：根据太阳高度调整强度，正午最强
            const noonFactor = Math.max(0.0, Math.min(1.0, sunAlt / 45.0));
            lightRef.current.intensity = 2.5 + noonFactor * 2.5;
            // 日出日落时色温偏暖
            lightRef.current.color.setRGB(1.0, 0.92 + 0.08 * noonFactor, 0.78 + 0.22 * noonFactor);
          } else {
            lightRef.current.intensity = 1.5;
            lightRef.current.color.setHex(0xfff8f0);
          }
        }

        // 1a. 天空霞光穹顶着色器 uniforms 实时更新 - ZERO ALLOCATION
        if (horizonGlowSpriteRef.current && sunSkyRef.current) {
          const sunAlt = sunAltRef.current;
          sunSkyRef.current.getWorldPosition(_sunWorldPos);

          const mat = horizonGlowSpriteRef.current.material as THREE.ShaderMaterial;
          // 太阳方向归一化
          _sunDir.copy(_sunWorldPos).normalize();

          // 望远镜模式下观测太阳，模拟加装巴德膜（太阳滤镜），将天空背景及霞光完全消光变黑
          let solarFilterStrength = 0.0;
          if (telescopeActiveRef.current && cameraRef.current) {
            _camDir.set(0, 0, -1).applyQuaternion(cameraRef.current.quaternion).normalize();
            const angleToSun = _camDir.angleTo(_sunDir) * (180 / Math.PI);
            if (angleToSun < 12.0) {
              solarFilterStrength = Math.max(0, 1 - angleToSun / 12.0);
            }
          }

          // 根据太阳滤镜强度平滑调整太阳的虚拟高度，对准时使其收拢在深昏影阶段，保留一圈深蓝色散射微光与日面软光晕
          const sunAltVal = sunAlt - solarFilterStrength * (sunAlt + 6.0);

          mat.uniforms.sunDir.value.copy(_sunDir);
          mat.uniforms.sunAlt.value = sunAltVal;
          mat.uniforms.uTime.value = performance.now() * 0.001;

          // 根据太阳高度动态调整颜色参数
          _topColor.setRGB(0, 0, 0);
          _horizonColor.setRGB(0, 0, 0);

          if (sunAltVal > 10.0) {
            // 正午：天顶偏蓝，地平线偏白
            _topColor.setRGB(0.35, 0.55, 0.95);
            _horizonColor.setRGB(0.7, 0.8, 0.95);
          } else if (sunAltVal > -5.0) {
            // 日出日落过渡：天顶蓝紫，地平线暖橙
            const t = (sunAltVal + 5.0) / 15.0;
            _topColor.setRGB(0.25 + t * 0.1, 0.35 + t * 0.2, 0.7 + t * 0.25);
            _horizonColor.setRGB(0.9, 0.45 + t * 0.35, 0.2 + t * 0.5);
          } else if (sunAltVal > -18.0) {
            // 深昏影：余光逐渐消退
            const t = Math.max(0.0, (sunAltVal + 18.0) / 13.0);
            _topColor.setRGB(0.02 * t, 0.025 * t, 0.05 * t);
            _horizonColor.setRGB(0.03 * t, 0.025 * t, 0.04 * t);
          } else {
            // 完全夜晚/望远镜模式：纯黑背景，以便清晰观测日面轮廓
            _topColor.setRGB(0.0, 0.0, 0.0);
            _horizonColor.setRGB(0.0, 0.0, 0.0);
          }

          if (solarFilterStrength > 0) {
            const factor = 1.0 - solarFilterStrength * 0.98; // 留 2% 的极暗底色
            _topColor.multiplyScalar(factor);
            _horizonColor.multiplyScalar(factor);
          }

          mat.uniforms.topColor.value.copy(_topColor);
          mat.uniforms.horizonColor.value.copy(_horizonColor);
        }

        // 1b. 镜头光晕 (Lens Flare) 实时更新 - ZERO ALLOCATION
        if (lensFlareGroupRef.current && sunSkyRef.current && cameraRef.current) {
          sunSkyRef.current.getWorldPosition(_sunWorldPos);

          const cam = cameraRef.current;
          _sunScreen.copy(_sunWorldPos).project(cam);
          const sunVisible = _sunScreen.z < 1 && _sunScreen.x > -1.2 && _sunScreen.x < 1.2 && _sunScreen.y > -1.2 && _sunScreen.y < 1.2;

          // 太阳亮度因子：白天高、日出日落略低但散射更强
          const sunAlt = sunAltRef.current;
          // 日出日落时（太阳高度 < 6°）太阳被云层遮挡，不出现光圈鬼影
          const isSunLow = sunAlt < 6.0;
          const sunBrightness = sunAlt > 0
            ? Math.min(1.0, sunAlt / 10.0 + 0.3)
            : Math.max(0.0, (sunAlt + 6.0) / 6.0);

          // 计算从屏幕中心 to 太阳的向量（用于光斑排列）
          const centerToSunX = _sunScreen.x;
          const centerToSunY = _sunScreen.y;

          lensFlareSpritesRef.current.forEach((flare) => {
            const sprite = flare.sprite;
            // 太阳不可见、亮度太低、日出日落时、或望远镜模式激活时不显示光晕
            if (!sunVisible || sunBrightness <= 0.02 || isSunLow || telescopeActiveRef.current) {
              sprite.visible = false;
              return;
            }

            // 光斑位置 = 屏幕中心 + offsetScale * (太阳 - 屏幕中心)
            // offsetScale > 0: 太阳和中心之间
            // offsetScale < 0: 越过太阳的反方向
            const fx = centerToSunX * flare.offsetScale;
            const fy = centerToSunY * flare.offsetScale;

            // 将 NDC 转回世界空间（固定深度）
            _ndcPos.set(fx, fy, 0.95).unproject(cam);
            _dir.copy(_ndcPos).sub(cam.position).normalize();
            _flareWorldPos.copy(cam.position).addScaledVector(_dir, 280);
            sprite.position.copy(_flareWorldPos);

            // 距离衰减：越靠近屏幕边缘越淡
            const distFromCenter = Math.sqrt(fx * fx + fy * fy);
            const edgeFade = Math.max(0.0, 1.0 - distFromCenter * 0.35);

            // 主光晕（offsetScale ~ 0）始终面对相机，其他光斑也始终 facing camera
            // 大小随太阳亮度变化
            const brightnessScale = 0.5 + sunBrightness * 0.5;
            const scale = flare.baseScale * brightnessScale;
            sprite.scale.set(scale, scale, 1.0);

            // 透明度计算
            let targetOpacity = sunBrightness * edgeFade * 0.75;
            if (flare.offsetScale === 0.0) {
              // 主光晕最强
              targetOpacity = sunBrightness * 0.95;
            } else if (Math.abs(flare.offsetScale) < 0.15) {
              targetOpacity = sunBrightness * edgeFade * 0.85;
            }

            (sprite.material as THREE.SpriteMaterial).color.copy(flare.color);
            sprite.material.opacity = targetOpacity;
            sprite.visible = targetOpacity > 0.02;
          });
        }

        // 2. 恒星位置与透明度仅在天体计算 Throttled 块中更新，无需每帧在 CPU 侧遍历与投影，极大降低 CPU 负载与 GC 压力

        // 3. 行星位置与透明度更新（与高倍望远镜 3D 渲染切换）- ZERO ALLOCATION
        const latRad = (latitudeRef.current * Math.PI) / 180.0;
        _celestialNorth.set(0, Math.sin(latRad), Math.cos(latRad));
        const shouldShowDetailed = telescopeActiveRef.current && fovRef.current <= 6.5;

        (Object.values(planetSpritesRef.current) as THREE.Sprite[]).forEach((sprite) => {
          const pid = sprite.userData.id;
          const detailedMesh = detailedPlanetsRef.current[pid];
          
          if (sprite.visible || (detailedMesh && detailedMesh.visible)) {
            const az = sprite.userData.az;
            const alt = sprite.userData.alt;
            const radius = sprite.userData.radius;
            const baseOpacity = sprite.userData.baseOpacity ?? 1.0;
            
            if (shouldShowDetailed && detailedMesh && alt > 0) {
              detailedMesh.visible = true;
              get3DPositionOnDome(az, alt, 270, detailedMesh.position); // 在距离 270（与月球一样）位置渲染 3D Mesh
              sprite.position.copy(detailedMesh.position); // 同步更新 2D sprite 的坐标，以便选中圈位置能正确对齐
              
              // 按照真实角大小 getAngularScale 进行三维缩放
              const angScale = getAngularScale(sprite.userData.angularDiameter ?? 0.5);
              detailedMesh.scale.setScalar(angScale);
              
              // 对齐北极，防止自转轴倾角错位
              setTidallyLockedOrientation(detailedMesh, cameraRef.current?.position ?? _defaultNorth, _celestialNorth);
              
              // 隐藏原本的2D亮点 Sprite
              sprite.visible = false;
            } else {
              if (detailedMesh) detailedMesh.visible = false;
              get3DPositionOnDome(az, alt, radius, sprite.position);
              sprite.material.opacity = baseOpacity;
              // 恢复 Sprite 的显示状态
              sprite.visible = baseOpacity > 0.02 && alt > 0;
            }
          } else {
            if (detailedMesh) detailedMesh.visible = false;
          }
        });

        // 3a. 太阳高倍率 3D 特写切换与更新 - ZERO ALLOCATION
        const shouldShowDetailedSun = telescopeActiveRef.current && fovRef.current <= 6.5;
        const detailedSun = detailedPlanetsRef.current['sun'];
        if (sunSkyRef.current && detailedSun) {
          if (shouldShowDetailedSun) {
            // 隐藏天幕太阳球体材质本身，保留天幕物体以供日冕/子项在日食等极端情况下渲染
            sunSkyRef.current.material.visible = false;

            // 显示并更新高倍 3D 详细太阳 Mesh
            detailedSun.visible = sunSkyRef.current.visible;
            detailedSun.position.copy(sunSkyRef.current.position);
            detailedSun.scale.setScalar(getAngularScale(32, 278, 7.2));

            // 对齐北极
            setTidallyLockedOrientation(detailedSun, cameraRef.current?.position ?? _defaultNorth, _celestialNorth);

            // 同步材质状态（透明度及日食暗化）
            const sunMat = sunSkyRef.current.material as THREE.MeshBasicMaterial;
            const detailedSunMat = detailedSun.material as THREE.MeshBasicMaterial;
            detailedSunMat.color.copy(sunMat.color);
            detailedSunMat.opacity = sunMat.opacity;
            detailedSunMat.transparent = sunMat.transparent;
          } else {
            // 隐藏 3D 详细太阳，恢复普通天幕太阳
            detailedSun.visible = false;
            sunSkyRef.current.material.visible = true;
          }
        }

        // 4. 背景暗星 GPU Shader 驱动（每帧仅更新 uniforms，零 CPU 遍历）- CACHED PRECESSION MATRIX
        if (backgroundPointsRef.current) {
          const mat = backgroundPointsRef.current.material as THREE.ShaderMaterial;
          const bgYears = TimeEngine.getDaysSinceJ2000TDB(currentTimestampRef.current) / 365.25;

          // Precession matrix (IAU 2006) — computed once per frame in JS, cached unless delta > 0.05 years
          if (!cachedPrecessionMatrixRef.current || Math.abs(bgYears - lastPrecYearsRef.current) > 0.05) {
            cachedPrecessionMatrixRef.current = buildPrecessionMatrix(bgYears);
            lastPrecYearsRef.current = bgYears;
          }
          const precM = cachedPrecessionMatrixRef.current;
          mat.uniforms.uPrecessionMatrix.value.set(
            precM[0], precM[3], precM[6],
            precM[1], precM[4], precM[7],
            precM[2], precM[5], precM[8]
          );

          // Body equatorial matrix — cached until observerBodyId changes
          if (observerBodyIdRef.current !== lastObserverBodyIdRef.current || !bodyMatrixCacheRef.current) {
            lastObserverBodyIdRef.current = observerBodyIdRef.current;
            const bm = ObserverEngine.getBodyEquatorialMatrix(observerBodyIdRef.current);
            if (bm) {
              bodyMatrixCacheRef.current = new THREE.Matrix3(
                bm.m00, bm.m01, bm.m02,
                bm.m10, bm.m11, bm.m12,
                bm.m20, bm.m21, bm.m22
              );
            } else {
              bodyMatrixCacheRef.current = new THREE.Matrix3().identity();
            }
          }
          mat.uniforms.uBodyMatrix.value.copy(bodyMatrixCacheRef.current);

          mat.uniforms.uYears.value = bgYears;
          mat.uniforms.uLST.value = getObserverLST();
          mat.uniforms.uLat.value = latitudeRef.current;
          mat.uniforms.uIsEarth.value = observerBodyIdRef.current === 'earth' ? 1.0 : 0.0;
          mat.uniforms.uSkyBrightness.value = skyBrightnessRef.current;
          mat.uniforms.uMagLimit.value = magLimitRef.current;
          if (rendererRef.current) {
            mat.uniforms.uViewportHeight.value = rendererRef.current.domElement.height;
          }
        }

        // 5. 潮汐锁定：月球/地球主导天体始终面向观察者，roll 稳定指向北天极
        if (moonSkyRef.current && moonSkyRef.current.visible && cameraRef.current) {
          const latRad = (latitudeRef.current * Math.PI) / 180.0;
          _celestialNorth.set(0, Math.sin(latRad), Math.cos(latRad));
          setTidallyLockedOrientation(moonSkyRef.current, cameraRef.current.position, _celestialNorth);
        }

        // 5b. 实时纹理偏移更新（UV 校准）
        if (moonSkyRef.current) {
          const mat = moonSkyRef.current.material as THREE.MeshStandardMaterial;
          if (mat.map) {
            const dominant = getDominantBodyInfo(observerBodyIdRef.current);
            if (dominant) {
              const off = textureOffsetsRef.current[dominant.id] ?? { u: 0, v: 0 };
              mat.map.offset.x = off.u;
              mat.map.offset.y = off.v;
              if (mat.bumpMap) {
                mat.bumpMap.offset.x = off.u;
                mat.bumpMap.offset.y = off.v;
              }
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

        const width = rendererRef.current.domElement.clientWidth || 800;
        const height = rendererRef.current.domElement.clientHeight || 600;

        // 1. 先进行全屏主视野渲染（主目镜）
        rendererRef.current.setScissorTest(false);
        rendererRef.current.setViewport(0, 0, width, height);
        rendererRef.current.render(sceneRef.current, cameraRef.current);

        // 2. 如果开启了望远镜模式，且寻星镜相机存在，在左上角进行双通道画中画渲染
        if (telescopeActiveRef.current && finderCameraRef.current) {
          const finderSize = 180;
          const radius = Math.min(width, height) * 0.38;
          const fx = width / 2 - radius - 140;
          const fy = height / 2 - radius * 0.4;

          // WebGL Viewport 坐标系中，(0,0) 为左下角
          const vx = fx - 90;
          const vy = height - (fy + 90);

          rendererRef.current.setViewport(vx, vy, finderSize, finderSize);
          rendererRef.current.setScissor(vx, vy, finderSize, finderSize);
          rendererRef.current.setScissorTest(true);

          // 同步主相机的朝向与位置，但使用固定的 15度 广角视场角
          finderCameraRef.current.position.copy(cameraRef.current.position);
          finderCameraRef.current.quaternion.copy(cameraRef.current.quaternion);
          finderCameraRef.current.fov = 15;
          finderCameraRef.current.aspect = 1;
          finderCameraRef.current.updateProjectionMatrix();

          // 在广角寻星镜中，微小行星应呈现为普通星点（Sprite）而非高倍3D Mesh
          const activeMeshList: THREE.Mesh[] = [];
          const activeSpriteList: THREE.Sprite[] = [];
          const shouldShowDetailed = telescopeActiveRef.current && fovRef.current <= 6.5;

          if (shouldShowDetailed) {
            Object.keys(detailedPlanetsRef.current).forEach(pid => {
              const m = detailedPlanetsRef.current[pid];
              const sp = planetSpritesRef.current[pid];
              if (m && m.visible) {
                activeMeshList.push(m);
                m.visible = false;
                if (sp && !sp.visible) {
                  activeSpriteList.push(sp);
                  sp.visible = true;
                }
              }
            });
          }

          const detailedSun = detailedPlanetsRef.current['sun'];
          const sunWasDetailed = shouldShowDetailed && detailedSun && detailedSun.visible;
          if (sunWasDetailed && sunSkyRef.current) {
            sunSkyRef.current.material.visible = true;
          }

          rendererRef.current.render(sceneRef.current, finderCameraRef.current);

          // 恢复主目镜渲染状态
          activeMeshList.forEach(m => m.visible = true);
          activeSpriteList.forEach(sp => sp.visible = false);

          if (sunWasDetailed && sunSkyRef.current) {
            sunSkyRef.current.material.visible = false;
          }
        }

        // 实时更新选中天体的屏幕坐标，确保圈圈跟随天球旋转 - ZERO ALLOCATION
        if (selectedObjectRef.current && cameraRef.current && rendererRef.current) {
          _tempV3.setFromMatrixPosition(selectedObjectRef.current.matrixWorld);
          _tempV3.project(cameraRef.current);
          const rect = rendererRef.current.domElement.getBoundingClientRect();
          const sx = (_tempV3.x + 1) / 2 * rect.width;
          const sy = (1 - _tempV3.y) / 2 * rect.height;
          // 只有在视野内才显示
          if (_tempV3.z < 1 && sx > 0 && sx < rect.width && sy > 0 && sy < rect.height) {
            if (selectionReticleRef.current) {
              selectionReticleRef.current.style.display = 'block';
              selectionReticleRef.current.style.left = `${sx}px`;
              selectionReticleRef.current.style.top = `${sy}px`;
            }
          } else {
            if (selectionReticleRef.current) {
              selectionReticleRef.current.style.display = 'none';
            }
          }
        } else {
          if (selectionReticleRef.current) {
            selectionReticleRef.current.style.display = 'none';
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
      {/* 选中天体圆圈 SVG 覆盖层 */}
      <div
        ref={selectionReticleRef}
        className="absolute pointer-events-none z-20 w-20 h-20 -ml-10 -mt-10"
        style={{ display: 'none' }}
      >
        <svg
          className="w-full h-full"
          viewBox="0 0 80 80"
          aria-hidden="true"
        >
          {/* 扩散圆圈动画 */}
          <circle
            key={`ring-expand-${selectionRingKey}`}
            cx={40}
            cy={40}
            r={16}
            fill="none"
            stroke="rgba(6,182,212,0.90)"
            strokeWidth={1.5}
            style={{
              animation: 'starSelectExpand 1.0s ease-out forwards',
              transformOrigin: '40px 40px'
            }}
          />
          {/* 静态持续圆圈 */}
          <circle
            cx={40}
            cy={40}
            r={10}
            fill="none"
            stroke="rgba(255,255,255,0.55)"
            strokeWidth={1}
            strokeDasharray="3 2.5"
            style={{ animation: 'starSelectPulse 2.5s ease-in-out infinite' }}
          />
          {/* 中心圆点 */}
          <circle
            cx={40}
            cy={40}
            r={2}
            fill="rgba(6,182,212,0.95)"
          />
          {/* 十字小纹理 */}
          <line x1={35} y1={40} x2={27} y2={40} stroke="rgba(6,182,212,0.45)" strokeWidth={0.8} />
          <line x1={45} y1={40} x2={53} y2={40} stroke="rgba(6,182,212,0.45)" strokeWidth={0.8} />
          <line x1={40} y1={35} x2={40} y2={27} stroke="rgba(6,182,212,0.45)" strokeWidth={0.8} />
          <line x1={40} y1={45} x2={40} y2={53} stroke="rgba(6,182,212,0.45)" strokeWidth={0.8} />
        </svg>
      </div>

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
            <path d="M8 22a4 4 0 0 1-4-4V6a2 2 0 0 1 4 0v12a2 2 0 0 0 4 0V6a2 2 0 0 1 4 0v12a4 4 0 0 1-4 4" />
            <path d="M12 8h-4" />
            <path d="M12 12h-4" />
          </svg>
          {telescopeActive && (
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee] animate-pulse" />
          )}
        </button>

        <span className="text-slate-600">|</span>

        {/* 罗盘内容（方位精简，仅保留数值与方向说明） */}
        <span ref={compassDegRef} className="text-slate-300 font-normal text-sm min-w-[3ch] text-center">0°</span>
        <span ref={compassDirRef} className="text-cyan-400 font-bold text-[10px] ml-1.5">N</span>

        <span className="text-slate-600">|</span>

        {/* 精简观星信息 */}
        {skyData && (
          <div className="flex items-center space-x-1 text-[10px] whitespace-nowrap">
            <span className="text-slate-400 flex items-center space-x-1">
              <span>{getObserverBodyName(observerBodyId, lang)}</span>
              {observerBodyId === 'earth' && (
                <div className="relative inline-flex items-center space-x-1" ref={cityMenuRef}>
                  <button
                    onClick={() => setShowCityMenu(!showCityMenu)}
                    className="p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-cyan-400 transition-colors pointer-events-auto flex items-center justify-center cursor-pointer"
                    title={isZh ? '快速切换城市' : 'Quick City Switch'}
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                  </button>
                  <span 
                    onClick={() => setShowCityMenu(!showCityMenu)}
                    className="text-[10px] text-slate-400 hover:text-cyan-400 cursor-pointer select-none"
                    title={isZh ? '快速切换城市' : 'Quick City Switch'}
                  >
                    ({getCurrentCityName()})
                  </span>
                  {showCityMenu && (
                    <div className="absolute top-full left-0 mt-1.5 z-[100] bg-slate-950/95 backdrop-blur-xl border border-slate-800 rounded-xl p-2.5 shadow-2xl min-w-[240px] pointer-events-auto grid grid-cols-2 gap-1.5 max-h-[300px] overflow-y-auto scrollbar-thin">
                      <div className="col-span-2 text-[9px] text-slate-500 font-bold uppercase tracking-wider px-1 pb-1 border-b border-slate-800 mb-1">
                        {isZh ? '选择城市' : 'Select City'}
                      </div>
                      {CITIES.map((c) => (
                        <button
                          key={c.nameEn}
                          onClick={() => {
                            onChangeLatitude?.(c.lat);
                            onChangeLongitude?.(c.lon);
                            setShowCityMenu(false);
                          }}
                          className={`text-[10px] font-sans px-1.5 py-1 rounded transition-all text-left truncate flex items-center justify-between cursor-pointer ${
                            Math.abs(latitude - c.lat) < 0.1 && Math.abs(longitude - c.lon) < 0.1
                              ? 'bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/30'
                              : 'bg-slate-900/40 text-slate-300 hover:bg-slate-800 hover:text-cyan-300 border border-transparent'
                          }`}
                        >
                          <span>{isZh ? c.nameZh : c.nameEn}</span>
                          <span className="text-[8px] opacity-50 font-mono">
                            {c.lat > 0 ? `${c.lat.toFixed(0)}N` : `${Math.abs(c.lat).toFixed(0)}S`}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
            {observerBodyId === 'earth' && (
              <>
                <span className="text-slate-600">|</span>
                <span className="text-indigo-300">🌒{translations[lang][skyData.moonPhaseName as keyof typeof translations['zh']]}</span>
              </>
            )}
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

        {/* 退出观测按钮 — 放置在最右侧并使用火箭向上飞图标 */}
        {onExitLanding && (
          <>
            <span className="text-slate-600">|</span>
            <button
              onClick={onExitLanding}
              className="pointer-events-auto flex items-center justify-center w-7 h-7 rounded-full border border-red-500/40 bg-red-950/30 text-red-400 hover:bg-red-950/45 hover:border-red-500/60 active:scale-95 transition-all duration-200 cursor-pointer"
              title={isZh ? '退出观测模式' : 'Exit Observer Mode'}
            >
              <svg 
                className="w-4 h-4 -rotate-90" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
                <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
              </svg>
            </button>
          </>
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

      {/* 选定星体详细卡片已移至 App.tsx 右侧抽屉内垂直堆叠展示 */}



      {/* 望远镜覆盖层 — 独立模块 */}
      <TelescopeOverlay
        active={telescopeActive}
        currentFov={currentFov}
        onFovChange={setFov}
        onClose={() => onTelescopeChange?.(false)}
        lang={lang}
      />
    </div>
  );
}
