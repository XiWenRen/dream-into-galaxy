/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PlanetLayer {
  nameKey: string; // e.g. "core", "mantle", "crust", "atmosphere", "corona"
  color: string;
  thickness: number; // relative ratio or description
  temp: string;
  compositionKey: string;
}

export interface PlanetData {
  id: string;
  nameKey: string;
  color: string;
  radius: number; // in relative units for visualization
  realRadius: number; // in km
  distanceToSun: number; // inside visualization scale
  realDistance: number; // in AU
  orbitalPeriod: number; // in Earth days
  rotationPeriod: number; // hours around axis
  obliquity: number; // axial tilt in degrees
  layers: PlanetLayer[];
  infoKey: string;
}

export interface TimeState {
  currentTimestamp: number; // Milliseconds since epoch
  speedMultiplier: number;  // 0 is paused, otherwise multiplier
  isPaused: boolean;
}

export interface LandedLocation {
  latitude: number;
  longitude: number;
  planetId: string;
}

export type ThemeType = 'space-tech' | 'cosmic-dark' | 'neon-hologram' | 'solar-gold';

export interface Constellation {
  id: string;
  nameKey: string;
  stars: number[][]; // Line pairs connecting star indices
}

export interface Star {
  id: number;
  ra: number; // Right ascension (hours)
  dec: number; // Declination (degrees)
  magnitude: number;
  color: string;
  nameKey?: string;
}

// Multi-reference-frame observation types
export interface ObserverContext {
  bodyId: string;
  latitude: number;
  longitude: number;
}

export interface PlanetSkyInfo {
  id: string;
  ra: number;
  dec: number;
  distAU: number;
  angularDiameter: number;
  magnitude: number;
  color: number;
}

export interface SatelliteSkyInfo {
  id: string;
  nameZh: string;
  nameEn: string;
  ra: number;
  dec: number;
  angularDiameter: number;
  magnitude: number;
  color: number;
}

export interface RingData {
  innerRadiusRatio: number;
  outerRadiusRatio: number;
  texturePath?: string;
  color?: number;
  opacity: number;
}

// ═══════════════════════════════════════════════════════════════
// 天文现象演示模块类型定义 (Astro Phenomena Demo Module)
// ═══════════════════════════════════════════════════════════════

export type PhenomenonId = 'moon-phases' | 'eclipses' | 'retrograde' | 'solar-terms';

export type DemoViewMode = 'universe' | 'starry' | 'split';

export interface DemoStep {
  stepIndex: number;
  titleKey: string;
  bodyKey: string;
  targetTime?: number;      // 该步骤推荐的时间戳（用于自动跳转）
  cameraPreset?: string;    // 相机预设位置
  highlightBody?: string;   // 高亮的天体ID
}

export interface PhenomenonConfig {
  id: PhenomenonId;
  icon: string;
  nameKey: string;
  descKey: string;
  ageRange: string;
  steps: DemoStep[];
  keyframes: { labelKey: string; timeOffset: number }[];
}

export interface PhenomenaDemoState {
  activePhenomenon: PhenomenonId | null;
  demoPhase: number;           // 当前步骤索引
  viewMode: DemoViewMode;
  cameraPreset: string | null;
  isPlaying: boolean;
  playbackSpeed: number;       // 演示播放倍速
  showGuidePanel: boolean;
}

// 演示渲染辅助类型
export interface ShadowConeParams {
  apexPos: { x: number; y: number; z: number };
  axisDir: { x: number; y: number; z: number };
  umbraAngle: number;          // 本影锥半顶角（弧度）
  penumbraAngle: number;       // 半影锥半顶角（弧度）
  coneLength: number;
  colorUmbra: number;
  colorPenumbra: number;
}

export interface SunlightBeamParams {
  direction: { x: number; y: number; z: number };
  origin: { x: number; y: number; z: number };
  length: number;
  color: number;
}

export interface DemoCameraPreset {
  name: string;
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  description: string;
}
