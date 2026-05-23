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
import { STAR_LIST, CONSTELLATIONS, BRIGHT_STAR_COUNT, DetailedStar } from '../engine/StarDatabase';
import { loadHipparcosCatalog, bvToRgb } from '../engine/HipparcosLoader';
import TelescopeOverlay from './TelescopeOverlay';

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
const getHorizontalCoordinates = (ra: number, dec: number, lst: number, lat: number) => {
  const decRad = (dec * Math.PI) / 180.0;
  const latRad = (lat * Math.PI) / 180.0;

  // HA = LST - RA (LST in hours, RA in hours. 1 hour = 15 degrees)
  let haDeg = (lst - ra) * 15.0;
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

// J2000 Geocentric Planetary Coordinate Solver
const getGeocentricPlanetCoords = (planetId: string, days: number) => {
  const pPlanet = OrbitEngine.getHeliocentricPosition(planetId, days);
  const pEarth = OrbitEngine.getHeliocentricPosition('earth', days);
  
  const dx = pPlanet.x - pEarth.x;
  const dy = pPlanet.y - pEarth.y;
  const dz = pPlanet.z - pEarth.z;
  
  const distAU = Math.sqrt(dx * dx + dy * dy + dz * dz);
  
  const cosObliq = Math.cos(23.439 * Math.PI / 180.0);
  const sinObliq = Math.sin(23.439 * Math.PI / 180.0);
  
  const dEqX = dx;
  const dEqY = dy * cosObliq - dz * sinObliq;
  const dEqZ = dy * sinObliq + dz * cosObliq;
  
  let ra = Math.atan2(dEqY, dEqX) * 12.0 / Math.PI;
  if (ra < 0) ra += 24;
  const dec = Math.atan2(dEqZ, Math.sqrt(dEqX * dEqX + dEqY * dEqY)) * 180.0 / Math.PI;
  
  return { ra, dec, distAU };
};

// Procedural textures generator
const createProceduralMoonTexture = (): THREE.Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#b5bac4';
  ctx.fillRect(0, 0, 512, 256);

  const maria = [
    { x: 120, y: 130, r: 42 },
    { x: 180, y: 150, r: 36 },
    { x: 230, y: 160, r: 32 },
    { x: 280, y: 180, r: 27 },
    { x: 90, y: 180, r: 48 },
    { x: 380, y: 100, r: 32 },
  ];
  maria.forEach(m => {
    const grad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r);
    grad.addColorStop(0, '#666d78');
    grad.addColorStop(0.7, '#78808d');
    grad.addColorStop(1, '#b5bac4');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    ctx.fill();
  });

  const craters = [
    { x: 150, y: 80, r: 8 },
    { x: 180, y: 220, r: 12 },
    { x: 110, y: 160, r: 9 },
    { x: 290, y: 110, r: 7 },
    { x: 320, y: 200, r: 10 },
    { x: 420, y: 140, r: 6 },
    { x: 450, y: 180, r: 5 },
    { x: 50, y: 100, r: 8 }
  ];
  craters.forEach(c => {
    ctx.strokeStyle = '#eef0f3';
    ctx.lineWidth = 1.8;
    ctx.fillStyle = '#9aa1ad';
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.stroke();

    if (c.r >= 11) {
      ctx.strokeStyle = 'rgba(238, 240, 243, 0.45)';
      ctx.lineWidth = 0.8;
      for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI) / 6;
        ctx.beginPath();
        ctx.moveTo(c.x + Math.cos(angle) * c.r, c.y + Math.sin(angle) * c.r);
        ctx.lineTo(c.x + Math.cos(angle) * (c.r + 45), c.y + Math.sin(angle) * (c.r + 45));
        ctx.stroke();
      }
    }
  });

  for (let i = 0; i < 120; i++) {
    const rx = Math.random() * 512;
    const ry = Math.random() * 256;
    const rr = Math.random() * 2.0 + 0.5;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(245, 245, 250, 0.5)' : 'rgba(80, 85, 95, 0.3)';
    ctx.beginPath();
    ctx.arc(rx, ry, rr, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
};

const createSolarCoronaTexture = (): THREE.Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255, 255, 245, 1.0)');
  grad.addColorStop(0.12, 'rgba(254, 215, 120, 0.9)');
  grad.addColorStop(0.35, 'rgba(251, 146, 50, 0.55)');
  grad.addColorStop(0.65, 'rgba(239, 68, 68, 0.22)');
  grad.addColorStop(1.0, 'rgba(127, 29, 29, 0.0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(64, 64, 64, 0, Math.PI * 2);
  ctx.fill();
  return new THREE.CanvasTexture(canvas);
};

const createLunarHazeTexture = (): THREE.Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(240, 246, 255, 0.95)');
  grad.addColorStop(0.18, 'rgba(219, 234, 254, 0.7)');
  grad.addColorStop(0.45, 'rgba(147, 197, 253, 0.3)');
  grad.addColorStop(0.75, 'rgba(59, 130, 246, 0.1)');
  grad.addColorStop(1.0, 'rgba(30, 58, 138, 0.0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(64, 64, 64, 0, Math.PI * 2);
  ctx.fill();
  return new THREE.CanvasTexture(canvas);
};

const createBrightStarGlowTexture = (): THREE.Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(64, 64);
  const data = imgData.data;
  
  const decay_radius = 4.5;
  const thickness_decay = 0.7;
  const length_decay = 18.0;
  
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const dx = x - 31.5;
      const dy = y - 31.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      const glow = Math.exp(-dist / decay_radius);
      const spikeH = Math.exp(-Math.abs(dy) / thickness_decay) * Math.exp(-Math.abs(dx) / length_decay);
      const spikeV = Math.exp(-Math.abs(dx) / thickness_decay) * Math.exp(-Math.abs(dy) / length_decay);
      
      let intensity = glow + 0.65 * (spikeH + spikeV);
      intensity = Math.max(0.0, Math.min(1.0, intensity));
      
      const idx = (y * 64 + x) * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = Math.floor(intensity * 255);
    }
  }
  ctx.putImageData(imgData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const createCircleTexture = (): THREE.Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(16, 16);
  const data = imgData.data;

  const decay_radius = 1.2;
  const thickness_decay = 0.4;
  const length_decay = 5.0;

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const dx = x - 7.5;
      const dy = y - 7.5;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const glow = Math.exp(-dist / decay_radius);
      const spikeH = Math.exp(-Math.abs(dy) / thickness_decay) * Math.exp(-Math.abs(dx) / length_decay);
      const spikeV = Math.exp(-Math.abs(dx) / thickness_decay) * Math.exp(-Math.abs(dy) / length_decay);

      let intensity = glow + 0.65 * (spikeH + spikeV);
      intensity = Math.max(0.0, Math.min(1.0, intensity));

      const idx = (y * 16 + x) * 4;
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

// 创建星座标签纹理
const createConstellationLabelTexture = (text: string): { texture: THREE.CanvasTexture; width: number; height: number } => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const fontSize = 22;
  ctx.font = `bold ${fontSize}px sans-serif`;
  const metrics = ctx.measureText(text);
  const width = Math.ceil(metrics.width) + 20;
  const height = fontSize + 14;
  canvas.width = width;
  canvas.height = height;

  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillStyle = 'rgba(180, 210, 255, 0.9)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);

  // subtle glow
  ctx.shadowColor = 'rgba(100, 160, 255, 0.5)';
  ctx.shadowBlur = 8;
  ctx.fillText(text, width / 2, height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return { texture, width, height };
};

// 创建星座名称文字Sprite
const createConstellationLabelSprite = (text: string): THREE.Sprite => {
  const { texture, width, height } = createConstellationLabelTexture(text);
  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(width * 0.06, height * 0.06, 1);
  return sprite;
};

function getDominantBodyInfo(observerId: string): { id: string; nameZh: string; nameEn: string; icon: string; textureUrl: string } | null {
  switch (observerId) {
    case 'earth':
      return { id: 'moon', nameZh: '月球 (The Moon)', nameEn: 'The Moon', icon: '\u{1F319}', textureUrl: '/textures/8k_moon.jpg' };
    case 'moon':
      return { id: 'earth', nameZh: '地球 (Earth)', nameEn: 'Earth', icon: '\u{1F30D}', textureUrl: '/textures/8k_earth_daymap.jpg' };
    default:
      return null;
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
  onTelescopeChange
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
  const lightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const constellLinesRef = useRef<THREE.LineSegments | null>(null);
  const constellLabelGroupRef = useRef<THREE.Group | null>(null);
  const constellLabelSpritesRef = useRef<THREE.Sprite[]>([]);

  // 10,000星和行星渲染引用
  const starSpritesRef = useRef<THREE.Sprite[]>([]);
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
  const textureCacheRef = useRef<Record<string, THREE.Texture>>({});
  const observerBodyIdRef = useRef(observerBodyId);
  const satelliteSpritesRef = useRef<Record<string, THREE.Sprite>>({});

  // 磁吸snap目标跟踪
  const snapTargetRef = useRef<THREE.Sprite | THREE.Mesh | null>(null);

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
    observerBodyIdRef.current = observerBodyId;

    // Update ground color when observer body changes
    const scene = sceneRef.current;
    if (scene) {
      const ground = scene.getObjectByName('ground-mesh') as THREE.Mesh | undefined;
      if (ground) {
        const groundColorMap: Record<string, number> = {
          earth: 0x05130b, moon: 0x2a2a2e, mars: 0x3d1a0f,
          mercury: 0x4a4a4a, venus: 0x8b7355, jupiter: 0x5a3d1a,
          saturn: 0x3d3429, uranus: 0x2a3d3d, neptune: 0x1a2a3d,
        };
        const mat = ground.material as THREE.MeshBasicMaterial;
        mat.color.setHex(groundColorMap[observerBodyId] ?? 0x05130b);
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
              (moonSkyRef.current.material as THREE.MeshStandardMaterial).map = tex;
              (moonSkyRef.current.material as THREE.MeshStandardMaterial).needsUpdate = true;
            }
          });
        } else if (observerBodyId === 'moon') {
          moonSky.scale.setScalar(4.0);
          moonMat.color.setHex(0xffffff);
          moonMat.emissive.setHex(0x1a5a8a);
          moonMat.emissiveIntensity = 0.6;
          loadRealTexture(dominant.textureUrl, textureCacheRef, (tex) => {
            if (observerBodyIdRef.current === 'moon' && moonSkyRef.current) {
              (moonSkyRef.current.material as THREE.MeshStandardMaterial).map = tex;
              (moonSkyRef.current.material as THREE.MeshStandardMaterial).needsUpdate = true;
            }
          });
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
  }, [lang]);

  useEffect(() => {
    magLimitRef.current = magLimit;
  }, [magLimit]);

  // Telescope mode: save FOV on enter, restore on exit
  useEffect(() => {
    if (telescopeActive) {
      preTelescopeFovRef.current = fovRef.current;
    } else {
      if ((window as any).__starrySkySetFov) {
        (window as any).__starrySkySetFov(preTelescopeFovRef.current);
      }
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
  } | null>(null);

  const isZh = lang === 'zh';

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
      const newFov = Math.max(3.0, Math.min(65.0, cam.fov + e.deltaY * 0.04));
      cam.fov = newFov;
      cam.updateProjectionMatrix();
      fovRef.current = newFov;
    };
    renderer.domElement.addEventListener('wheel', handleWheel, { passive: false });

    // 外部FOV控制（望远镜模块回调）——择需要合并到此处
    (window as any).__starrySkySetFov = (fov: number) => {
      if (!cameraRef.current) return;
      cameraRef.current.fov = Math.max(0.3, Math.min(65.0, fov));
      cameraRef.current.updateProjectionMatrix();
      fovRef.current = cameraRef.current.fov;
    };
    Object.defineProperty(window, '__starrySkyCurrentFov', {
      get: () => fovRef.current,
      configurable: true,
    });

    // 4. 环境及平行天体光照
    const ambientLight = new THREE.AmbientLight(0x020617);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const light = new THREE.DirectionalLight(0xffffff, 1.2);
    scene.add(light);
    lightRef.current = light;

    // 5. 绘制地平线地面：半透明草地网格
    const groundGeo = new THREE.CylinderGeometry(150, 150, 2, 64);
    const groundMat = new THREE.MeshBasicMaterial({
      color: 0x05130b,
      transparent: true,
      opacity: 0.77
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -1.2;
    scene.add(ground);

    // 地平线坐标刻度圈
    const horizonRingGeo = new THREE.RingGeometry(148, 149, 64);
    horizonRingGeo.rotateX(Math.PI / 2);
    const horizonRingMat = new THREE.MeshBasicMaterial({ color: 0x1e3a24, side: THREE.DoubleSide });
    const horizonRing = new THREE.Mesh(horizonRingGeo, horizonRingMat);
    horizonRing.position.y = -0.1;
    scene.add(horizonRing);

    // 6. 独立天幕球形恒星与连线渲染组
    const starsGroup = new THREE.Group();
    scene.add(starsGroup);
    starsGroupRef.current = starsGroup;

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

    const lunarHazeTex = createLunarHazeTexture();
    const lunarHazeMat = new THREE.SpriteMaterial({
      map: lunarHazeTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.7
    });
    const moonHazeSprite = new THREE.Sprite(lunarHazeMat);
    moonHazeSprite.scale.set(42.0, 42.0, 1.0);
    moonSky.add(moonHazeSprite);
    moonHazeSpriteRef.current = moonHazeSprite;

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
              extraZh: '仰角: ' + (moonSkyRef.current ? getHorizontalCoordinates(moonRaRef.current, moonDecRef.current, TimeEngine.getLocalSiderealTime(currentTimestampRef.current, longitudeRef.current), latitudeRef.current).alt.toFixed(1) : '0') + '°',
              extraEn: 'Altitude: ' + (moonSkyRef.current ? getHorizontalCoordinates(moonRaRef.current, moonDecRef.current, TimeEngine.getLocalSiderealTime(currentTimestampRef.current, longitudeRef.current), latitudeRef.current).alt.toFixed(1) : '0') + '°'
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
        } else if (hit.userData.type === 'star') {
          const starData = hit.userData.starData;
          const { info } = getStarInfo(starData, langRef.current);
          setHoveredCelestial({
            id: 'star-' + starData.id,
            nameZh: starData.nameZh,
            nameEn: starData.nameEn,
            typeZh: '亮恒星精选 / ' + starData.constellZh,
            typeEn: 'Bright Star / ' + starData.constellEn,
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
      const lst = TimeEngine.getLocalSiderealTime(currentTimestampRef.current, longitudeRef.current);
      const days = TimeEngine.getDaysSinceJ2000(currentTimestampRef.current);
      const lambdaSun = AstrophenomenaEngine.getSolarLongitude(days);
      const sunLongRad = (lambdaSun * Math.PI) / 180.0;
      const oblRad = (23.439 * Math.PI) / 180.0;
      const sunDecRad = Math.asin(Math.sin(oblRad) * Math.sin(sunLongRad));
      const sunDec = (sunDecRad * 180.0) / Math.PI;
      let sunRaRad = Math.atan2(Math.cos(oblRad) * Math.sin(sunLongRad), Math.cos(sunLongRad));
      let sunRa = (sunRaRad * 12.0) / Math.PI;
      if (sunRa < 0) sunRa += 24;
      const sunCoords = getHorizontalCoordinates(sunRa, sunDec, lst, latitudeRef.current);
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
        } else if (hit.userData.type === 'star') {
          const starData = hit.userData.starData;
          const { info, expanded } = getStarInfo(starData, langRef.current);
          setSelectedCelestial({
            id: 'star-' + starData.id,
            nameZh: starData.nameZh,
            nameEn: starData.nameEn + ' (' + starData.nameEn + ')',
            typeZh: '夜空亮星精选 / ' + starData.constellZh,
            typeEn: 'Bright Star / ' + starData.constellEn,
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
      delete (window as any).__starrySkySetFov;
      delete (window as any).__starrySkyCurrentFov;
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
    const sunCoords = getHorizontalCoordinates(sunRa, sunDec, lst, latitude);
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
      const { ra, dec } = ObserverEngine.getSatellitesInSky(ctx, days)[0] ?? { ra: 0, dec: 0 };
      moonRa = ra; moonDec = dec;
      moonCoords = getHorizontalCoordinates(moonRa, moonDec, lst, latitude);
      const moonPos = get3DPositionOnDome(moonCoords.az, moonCoords.alt, 270);
      if (moonSkyRef.current) {
        moonSkyRef.current.position.copy(moonPos);
        moonSkyRef.current.visible = moonCoords.alt > -2;
        moonSkyRef.current.lookAt(0, 0, 0);
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
      const earthInfo = ObserverEngine.getSatellitesInSky(ctx, days)[0] ?? { ra: 0, dec: 0 };
      moonRa = earthInfo.ra; moonDec = earthInfo.dec;
      moonCoords = getHorizontalCoordinates(moonRa, moonDec, lst, latitude);
      const earthPos = get3DPositionOnDome(moonCoords.az, moonCoords.alt, 270);
      if (moonSkyRef.current) {
        moonSkyRef.current.position.copy(earthPos);
        moonSkyRef.current.visible = moonCoords.alt > -2;
        moonSkyRef.current.lookAt(0, 0, 0);
        if (moonHazeSpriteRef.current) {
          moonHazeSpriteRef.current.position.copy(earthPos);
          moonHazeSpriteRef.current.visible = moonCoords.alt > -2;
        }
      }
    } else {
      if (moonSkyRef.current) moonSkyRef.current.visible = false;
      if (moonHazeSpriteRef.current) moonHazeSpriteRef.current.visible = false;
    }

    const eclipseState = AstrophenomenaEngine.detectEclipse(days);

    // 三段式曙暮光及黄昏渐变色彩算法
    let skyBrightness = 0;
    const sunAlt = sunCoords.alt;
    if (sunAlt >= 15) {
      skyBrightness = 1.0;
    } else if (sunAlt > 0 && sunAlt < 15) {
      skyBrightness = 0.1 + 0.9 * (sunAlt / 15.0);
    } else if (sunAlt >= -18 && sunAlt <= 0) {
      skyBrightness = 0.1 * ((sunAlt + 18.0) / 18.0);
    } else {
      skyBrightness = 0.0;
    }

    skyBrightnessRef.current = skyBrightness;
    sunAltRef.current = sunAlt;

    let r = 0.05 * (1.0 - skyBrightness) + 0.4 * skyBrightness;
    let g = 0.08 * (1.0 - skyBrightness) + 0.6 * skyBrightness;
    let b = 0.18 * (1.0 - skyBrightness) + 1.0 * skyBrightness;

    const sunsetFactor = Math.max(0.0, 1.0 - Math.abs(sunAlt - (-2.0)) / 4.0);
    r += sunsetFactor * 0.12;
    g += sunsetFactor * 0.05;
    b -= sunsetFactor * 0.02;

    r = Math.max(0.0, Math.min(1.0, r));
    g = Math.max(0.0, Math.min(1.0, g));
    b = Math.max(0.0, Math.min(1.0, b));

    if (rendererRef.current) {
      if (eclipseState.solarEclipse && sunCoords.alt > 0) {
        rendererRef.current.setClearColor(new THREE.Color(0x02030d), 1.0);
      } else {
        rendererRef.current.setClearColor(new THREE.Color(r, g, b), 1.0);
      }
    }

    // 环境光颜色与强度动态渐变
    if (ambientLightRef.current) {
      const dayColor = new THREE.Color(0x7dd3fc);
      const nightColor = new THREE.Color(0x020617);
      const finalAmbientColor = new THREE.Color().lerpColors(nightColor, dayColor, skyBrightness);
      ambientLightRef.current.color.copy(finalAmbientColor);
      ambientLightRef.current.intensity = 0.35 * skyBrightness + 0.02;
    }

    // D. 42颗明亮恒星地平线截断及低空大气消光计算
    starSpritesRef.current.forEach(sprite => {
      const ra = sprite.userData.ra;
      const dec = sprite.userData.dec;
      const starCoords = getHorizontalCoordinates(ra, dec, lst, latitude);
      
      let baseOpacity = 0;
      let visible = false;
      
      if (starCoords.alt > 0) {
        visible = true;
        let extinction = 1.0;
        if (starCoords.alt < 12) {
          extinction = Math.sin(starCoords.alt * Math.PI / 180.0) / Math.sin(12.0 * Math.PI / 180.0);
        }
        baseOpacity = (1.0 - skyBrightness) * extinction;
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
        const planetCoords = getHorizontalCoordinates(info.ra, info.dec, lst, latitude);
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
        const satCoords = getHorizontalCoordinates(sat.ra, sat.dec, lst, latitude);
        const pos = get3DPositionOnDome(satCoords.az, satCoords.alt, 275);
        sprite.position.copy(pos);
        sprite.visible = satCoords.alt > -2;
        sprite.userData.az = satCoords.az;
        sprite.userData.alt = satCoords.alt;
      }
    });

    // F. 星座连线三维天穹投影更新
    if (constellLinesRef.current) {
      const linePoints: THREE.Vector3[] = [];
      if (showConstellLines) {
        CONSTELLATIONS.forEach(constell => {
          for (let j = 0; j < constell.seq.length; j++) {
            const pair = constell.seq[j];
            const starA = STAR_LIST[pair[0]];
            const starB = STAR_LIST[pair[1]];
            if (starA && starB) {
              if (starA.mag <= magLimit && starB.mag <= magLimit) {
                const hA = getHorizontalCoordinates(starA.ra, starA.dec, lst, latitude);
                const hB = getHorizontalCoordinates(starB.ra, starB.dec, lst, latitude);
                
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

      constellLinesRef.current.geometry.dispose();
      constellLinesRef.current.geometry = new THREE.BufferGeometry().setFromPoints(linePoints);

      const lineMat = constellLinesRef.current.material as THREE.LineBasicMaterial;
      lineMat.opacity = 0.35 * Math.max(0, 1 - skyBrightness);
      constellLinesRef.current.visible = showConstellLines && linePoints.length > 0;
    }

    // G. 星座名称标签位置更新
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
          const h = getHorizontalCoordinates(star.ra, star.dec, lst, latitude);
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

    setSkyData({
      lst,
      sunAlt: sunCoords.alt,
      moonAlt: moonCoords.alt,
      moonPhasePercent: moonPhaseInfo.percent,
      moonPhaseName: moonPhaseInfo.nameKey,
      solarEclipse: eclipseState.solarEclipse,
      lunarEclipse: eclipseState.lunarEclipse
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

        // 2. 亮恒星位置与透明度更新（无闪烁/抖动）
        starSpritesRef.current.forEach((sprite) => {
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
          const lst = TimeEngine.getLocalSiderealTime(currentTimestampRef.current, longitudeRef.current);
          const lat = latitudeRef.current;
          const skyBr = skyBrightnessRef.current;

          for (let i = 0; i < bgStarsData.length; i++) {
            const star = bgStarsData[i];
            const coords = getHorizontalCoordinates(star.ra, star.dec, lst, lat);
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

      {/* 方位角指示器 */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-slate-950/85 px-4 py-2 border border-slate-800/80 rounded-full flex items-center space-x-6 text-[11px] font-mono pointer-events-none select-none z-10 shadow-lg">
        <span className="text-emerald-400 font-bold">N 正北 (0°)</span>
        <span className="text-slate-500">|</span>
        <span className="text-slate-300">E 正东 (90°)</span>
        <span className="text-slate-500">|</span>
        <span className="text-slate-300">S 正南 (180°)</span>
        <span className="text-slate-500">|</span>
        <span className="text-slate-300">W 正西 (270°)</span>
      </div>

      {/* 右上角：望远镜快速切换按钮 */}
      <button
        onClick={() => onTelescopeChange?.(!telescopeActive)}
        className={`absolute top-4 right-5 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full border backdrop-blur-md transition-all duration-200 cursor-pointer select-none ${
          telescopeActive
            ? 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.35)]'
            : 'bg-slate-950/70 border-slate-700/60 text-slate-300 hover:border-slate-500 hover:text-slate-200'
        }`}
        title={isZh ? '切换望远镜模式' : 'Toggle Telescope Mode'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 7l4-2 10 5-4 2L3 7z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M13 10l3 6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M10 11.5l3 6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.5"
          />
          <circle cx="20" cy="6" r="1.5" fill="currentColor" opacity="0.6" />
        </svg>
        <span className="text-[11px] font-medium tracking-wide">
          {telescopeActive ? (isZh ? '退出' : 'Exit') : (isZh ? '望远镜' : 'Scope')}
        </span>
        {telescopeActive && (
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee] animate-pulse" />
        )}
      </button>

      {/* 右上角：实时本地星空物理学坐标信息 */}
      {skyData && (
        <div
          className="absolute top-14 right-5 bg-slate-950/85 p-4 border border-slate-800/80 rounded-xl space-y-2.5 max-w-xs text-xs pointer-events-none select-none z-10 shadow-2xl font-mono"
          id="landed-astro-telemetry"
        >
          <div className="text-indigo-400 font-semibold border-b border-slate-800 pb-1.5 flex items-center justify-between">
            <span>🔭 {(() => {
              const bodyNames: Record<string, { zh: string; en: string }> = {
                earth: { zh: '地球 (Earth)', en: 'Earth' },
                moon: { zh: '月球 (Moon)', en: 'The Moon' },
                mars: { zh: '火星 (Mars)', en: 'Mars' },
                mercury: { zh: '水星 (Mercury)', en: 'Mercury' },
                venus: { zh: '金星 (Venus)', en: 'Venus' },
                jupiter: { zh: '木星 (Jupiter)', en: 'Jupiter' },
                saturn: { zh: '土星 (Saturn)', en: 'Saturn' },
                uranus: { zh: '天王星 (Uranus)', en: 'Uranus' },
                neptune: { zh: '海王星 (Neptune)', en: 'Neptune' },
              };
              const name = bodyNames[observerBodyId] ?? { zh: observerBodyId, en: observerBodyId };
              return `${translations[lang].observingFrom} — ${isZh ? name.zh : name.en}`;
            })()}</span>
            <span className="text-[10px] bg-indigo-950 px-1.5 py-0.5 rounded text-indigo-300 uppercase font-mono">
              LST {skyData.lst.toFixed(2)}h
            </span>
          </div>

          <div className="space-y-1.5 text-[11px] text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">🌞 {translations[lang].sun_name} {translations[lang].zoomLevel}:</span>
              <span className={skyData.sunAlt > 0 ? "text-amber-400" : "text-slate-500"}>
                {skyData.sunAlt > 0 ? `${skyData.sunAlt.toFixed(1)}° (${isZh ? "昼" : "Day"})` : `${skyData.sunAlt.toFixed(1)}° (${isZh ? "夜" : "Night"})`}
              </span>
            </div>
            {(() => {
              const dom = getDominantBodyInfo(observerBodyId);
              if (!dom) return null;
              return (
                <div className="flex justify-between">
                  <span className="text-slate-400">{dom.icon} {dom.nameZh} {translations[lang].zoomLevel}:</span>
                  <span className={skyData.moonAlt > 0 ? "text-cyan-400" : "text-slate-500"}>
                    {skyData.moonAlt.toFixed(1)}°
                  </span>
                </div>
              );
            })()}
            <div className="flex justify-between border-t border-slate-900 pt-1.5">
              <span className="text-slate-400">🌒 {translations[lang].moonPhase}:</span>
              <span className="text-cyan-300 font-semibold">
                {translations[lang][skyData.moonPhaseName as keyof typeof translations['zh']]}
              </span>
            </div>
          </div>

          {(skyData.solarEclipse || skyData.lunarEclipse) && (
            <div className="mt-2 bg-rose-950/60 border border-rose-800 p-2.5 rounded-lg text-[10px] text-rose-200 animate-pulse flex flex-col space-y-1">
              <span className="font-bold">⚠️ {translations[lang].eclipseWarning}</span>
              <span>
                {skyData.solarEclipse ? translations[lang].solarEclipseOccurring : translations[lang].lunarEclipseOccurring}
              </span>
            </div>
          )}
        </div>
      )}

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
          className="absolute top-16 left-5 w-80 max-h-[80vh] overflow-y-auto bg-slate-950/95 border border-indigo-500/30 backdrop-blur-md rounded-xl p-4 text-slate-200 z-20 flex flex-col space-y-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.85)] font-sans animate-in slide-in-from-left-6 duration-300"
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
        onFovChange={(fov) => {
          if ((window as any).__starrySkySetFov) {
            (window as any).__starrySkySetFov(fov);
          }
        }}
        lang={lang}
      />
    </div>
  );
}
