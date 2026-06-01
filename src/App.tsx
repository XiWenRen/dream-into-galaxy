/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion } from "motion/react";
import UniverseViewer from './components/UniverseViewer';
import StarrySkyViewer from './components/StarrySkyViewer';
import PlanetInfoPanel from './components/PlanetInfoPanel';
import CommandPanel from './components/CommandPanel';
import ArcTimeBar from './components/ArcTimeBar';
import LoadingScreen from './components/LoadingScreen';
import TransitionScreen from './components/TransitionScreen';
import AstroPhenomenaPanel from './components/AstroPhenomenaPanel';
import PhenomenaGuidePanel from './components/PhenomenaGuidePanel';
import PhenomenaDemoBar from './components/PhenomenaDemoBar';
import { TimeEngine } from './engine/TimeEngine';
import { OrbitEngine } from './engine/OrbitEngine';
import { AstrophenomenaEngine, SYNODIC_MONTH_MS, getCurrentCycleNewMoon, getExactMoonPhaseTime } from './engine/AstrophenomenaEngine';
import { SOLAR_ECLIPSE_EVENTS, LUNAR_ECLIPSE_EVENTS } from './data/eclipseEvents';
import { TimeState, ThemeType, PhenomenaDemoState } from './types/astronomy';
import { translations } from './i18n';
import { SOLAR_TERMS } from './data/solarTerms';

// 可登录天体白名单 (行星、月球及主要天然卫星均可作为观测点)
const LANDABLE_PLANETS = ['earth', 'mercury', 'venus', 'mars', 'moon', 'jupiter', 'saturn', 'uranus', 'neptune', 'phobos', 'deimos', 'io', 'europa', 'ganymede', 'callisto', 'titan', 'rhea', 'enceladus', 'titania', 'oberon', 'ariel', 'triton', 'proteus'];

// ── Demo playback helpers ───────────────────────────────────────

function findNearestSpringEquinox(referenceTimestamp: number): number {
  const year = new Date(referenceTimestamp).getUTCFullYear();
  const candidates = [Date.UTC(year - 1, 2, 20), Date.UTC(year, 2, 20), Date.UTC(year + 1, 2, 20)];
  let best = candidates[0];
  let bestDiff = Math.abs(best - referenceTimestamp);
  for (let i = 1; i < candidates.length; i++) {
    const diff = Math.abs(candidates[i] - referenceTimestamp);
    if (diff < bestDiff) { best = candidates[i]; bestDiff = diff; }
  }
  return best;
}

// Demo step durations per phenomenon (seconds per step at 1x speed)
const DEMO_STEP_DURATION: Record<string, number> = {
  'moon-phases': 8,   // 8 sec per phase
  'eclipses': 10,     // 10 sec per step
  'solar-terms': 6,   // 6 sec per term
};

// 每个月相对应的最佳夜间观测本地时间（小时数，如 20.5 代表 20:30）
const MOON_PHASE_BEST_VIEW_HOURS = [
  20.0, // 0: 新月 (朔) - 20:00 (虽然不可见，但展示暗夜星空)
  19.5, // 1: 峨眉月 - 19:30 (日落后西方低空)
  20.5, // 2: 上弦月 - 20:30 (前半夜南方高空)
  22.0, // 3: 盈凸月 - 22:00 (接近子夜南方高空)
  0.0,  // 4: 满月 (望) - 00:00 (子夜中天，高度角最高)
  2.0,  // 5: 亏凸月 - 02:00 (后半夜南方高空)
  4.0,  // 6: 下弦月 - 04:00 (黎明前南方高空)
  5.0,  // 7: 残月 - 05:00 (日出前东方低空)
];

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialEntry, setIsInitialEntry] = useState(true);
  const [mountViewer, setMountViewer] = useState(false);
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const [selectedPlanetId, setSelectedPlanetId] = useState<string>('sun');
  const [crossSectionActive, setCrossSectionActive] = useState<boolean>(false);
  const [cloudsVisible, setCloudsVisible] = useState<boolean>(true);
  const [showPlanetInfo, setShowPlanetInfo] = useState<boolean>(true);
  // 自定义主题
  const [theme, setTheme] = useState<ThemeType>('space-tech');

  useEffect(() => {
    // Delay mounting the heavy WebGL engine by 400ms so that LoadingScreen mounts and animates first without freeze
    const timer = setTimeout(() => {
      setMountViewer(true);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // 验证系统状态
  const [panelTab, setPanelTab] = useState<'packing' | 'audit'>('audit');
  const [packingActive, setPackingActive] = useState<boolean>(false);
  const [packingProgressDone, setPackingProgressDone] = useState<number>(0);
  const [packingMode, setPackingMode] = useState<'physical' | 'visual'>('physical');
  const [strictPhysics, setStrictPhysics] = useState<boolean>(true);
  const [validationPairKey, setValidationPairKey] = useState<string>('sun-earth');
  const [focusTrigger, setFocusTrigger] = useState<number>(0);

  // 穿梭模式等比加速
  const [useExponentialSpeed, setUseExponentialSpeed] = useState<boolean>(false);
  const [customSpeedPreset, setCustomSpeedPreset] = useState<string>('1x');

  // 地面登录观测站参数 (纬度和经度)
  const [landed, setLanded] = useState<boolean>(false);
  const [latitude, setLatitude] = useState<number>(31.23); // 默认上海/中国中纬度 (31° N)
  const [longitude, setLongitude] = useState<number>(121.47); // 默认 121° E

  // 本地时区偏移（从经度自动计算得到，以小时为单位，默认根据系统当前时区初始化）
  const [timezoneOffset, setTimezoneOffset] = useState<number>(() => -new Date().getTimezoneOffset() / 60);

  // 当观测点经度改变时，自动同步时区偏移量
  useEffect(() => {
    setTimezoneOffset(Math.round(longitude / 15));
  }, [longitude]);

  // 组件挂载时获取系统当前定位与时区，以匹配操作人本机的物理位置
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
        },
        (error) => {
          console.warn("Geolocation access denied or unavailable. Falling back to timezone detection.");
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          const browserOffset = -new Date().getTimezoneOffset() / 60;
          
          // 常见时区名称到经纬度的映射
          const tzCoords: Record<string, { lat: number; lon: number }> = {
            'Asia/Shanghai': { lat: 31.23, lon: 121.47 },
            'Asia/Chongqing': { lat: 29.56, lon: 106.55 },
            'Asia/Harbin': { lat: 45.75, lon: 126.63 },
            'Asia/Urumqi': { lat: 43.82, lon: 87.61 },
            'Asia/Hong_Kong': { lat: 22.39, lon: 114.10 },
            'Asia/Taipei': { lat: 25.03, lon: 121.56 },
            'Europe/London': { lat: 51.51, lon: -0.13 },
            'America/New_York': { lat: 40.71, lon: -74.01 },
            'America/Los_Angeles': { lat: 34.05, lon: -118.24 },
            'Asia/Tokyo': { lat: 35.68, lon: 139.69 },
            'Asia/Seoul': { lat: 37.56, lon: 126.97 },
            'Australia/Sydney': { lat: -33.87, lon: 151.21 },
          };
          
          // 常见时区偏移量到经纬度的映射（备选方案）
          const offsetCoords: Record<number, { lat: number; lon: number }> = {
            8: { lat: 31.23, lon: 121.47 }, // 北京/上海/香港等
            9: { lat: 35.68, lon: 139.69 }, // 东京/首尔等
            10: { lat: -33.87, lon: 151.21 }, // 悉尼
            0: { lat: 51.51, lon: -0.13 }, // 伦敦
            1: { lat: 48.86, lon: 2.35 }, // 巴黎/柏林/罗马等
            "-5": { lat: 40.71, lon: -74.01 }, // 纽约/波士顿等
            "-8": { lat: 34.05, lon: -118.24 }, // 洛杉矶/旧金山等
          };
          
          if (tz && tzCoords[tz]) {
            setLatitude(tzCoords[tz].lat);
            setLongitude(tzCoords[tz].lon);
          } else if (offsetCoords[browserOffset] !== undefined) {
            setLatitude(offsetCoords[browserOffset].lat);
            setLongitude(offsetCoords[browserOffset].lon);
          }
        }
      );
    }
  }, []);

  // 国定星空星座辅助标记开关
  const [showConstellLines, setShowConstellLines] = useState<boolean>(true);
  const [showStarNames, setShowStarNames] = useState<boolean>(true);
  const [showConstellNames, setShowConstellNames] = useState<boolean>(false);
  const [magLimit, setMagLimit] = useState<number>(5.5);

  // 行星/卫星名称标签开关
  const [showPlanetLabels, setShowPlanetLabels] = useState<boolean>(true);

  // 轨道线展示/隐藏开关
  const [showOrbits, setShowOrbits] = useState<boolean>(true);

  // 星体坐标轴展示/隐藏开关
  const [showAxes, setShowAxes] = useState<boolean>(false);

  // 经纬度网格展示/隐藏开关
  const [showLatLonGrid, setShowLatLonGrid] = useState<boolean>(false);

  // 望远镜模式（仅在星空模式下生效）
  const [telescopeActive, setTelescopeActive] = useState<boolean>(false);

  // 剖面模式下的当前悬停层级 (联动 3D 模型与详情卡片)
  const [activeLayer, setActiveLayer] = useState<'core' | 'mantle' | 'crust' | 'atmosphere' | 'ring' | null>(null);

  // 曝光亮度相关状态
  const [exposure, setExposure] = useState<number>(1.5);

  // 轨道计算时间基础状态 (默认 43200x 倍速 = 1秒过去12小时，方便直接看出星体位移)
  const [timeState, setTimeState] = useState<TimeState>({
    currentTimestamp: Date.now(),
    speedMultiplier: 1,
    isPaused: false
  });

  // 天文现象演示状态
  const [demoState, setDemoState] = useState<PhenomenaDemoState>({
    activePhenomenon: null,
    demoPhase: 0,
    viewMode: 'universe',
    cameraPreset: null,
    isPlaying: false,
    playbackSpeed: 1,
    showGuidePanel: true,
  });

  // 天文现象面板开关
  const [phenomenaPanelOpen, setPhenomenaPanelOpen] = useState<boolean>(false);

  // 设置面板开关
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

  // 当前选中的节气索引（四季与节气演示模式）
  const [selectedSolarTermIndex, setSelectedSolarTermIndex] = useState<number | null>(null);
  // 当前选中的月相索引（月相演示模式）
  const [selectedMoonPhaseIndex, setSelectedMoonPhaseIndex] = useState<number | null>(null);

  // 日食/月食演示：选中的事件时间戳和进度 (0-1)
  const [eclipseEventTs, setEclipseEventTs] = useState<number | null>(null);
  const [eclipseEventType, setEclipseEventType] = useState<'solar' | 'lunar' | null>(null);
  const [eclipseWindow, setEclipseWindow] = useState<{ start: number; end: number } | null>(null);

  const eclipseProgress = useMemo(() => {
    if (!eclipseWindow) return 0.0;
    const total = eclipseWindow.end - eclipseWindow.start;
    if (total <= 0) return 0.0;
    const pct = (timeState.currentTimestamp - eclipseWindow.start) / total;
    return Math.max(0, Math.min(1, pct));
  }, [timeState.currentTimestamp, eclipseWindow]);

  // 贴图便宜位置调试 (用于行星面板上交互式校准纹理偏移)
  // 月球默认偏移 u=0.42，经滑块校准后固定
  const [textureOffsets, setTextureOffsets] = useState<Record<string, { u: number; v: number }>>({
    moon: { u: 0.42, v: 0 }
  });

  // 处理无极缩放 (Seamless Zoom / Cloud entry effect overlay) 动态面纱
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [transitionDirection, setTransitionDirection] = useState<'toStarry' | 'toUniverse'>('toStarry');
  const [selectedCelestial, setSelectedCelestial] = useState<any | null>(null);

  // 1. 实时的多帧时间递增推进
  useEffect(() => {
    let animId = 0;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const deltaSec = (now - lastTime) / 1000;
      lastTime = now;

      setTimeState((prev) => {
        if (prev.isPaused) return prev;
        const nextTimestamp = TimeEngine.tick(prev.currentTimestamp, prev.speedMultiplier, deltaSec);
        return { ...prev, currentTimestamp: nextTimestamp };
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // 1b. 天文现象演示自动播放逻辑（步进模式：只切换步骤，不改变时间流速）
  useEffect(() => {
    if (!demoState.isPlaying || !demoState.activePhenomenon) return;
    const stepDurationSec = DEMO_STEP_DURATION[demoState.activePhenomenon] || 8;
    const intervalMs = (stepDurationSec * 1000) / demoState.playbackSpeed;

    const timer = setInterval(() => {
      setDemoState(prev => {
        if (!prev.isPlaying || !prev.activePhenomenon) return prev;
        const steps = getPhenomenonSteps(prev.activePhenomenon).length;
        const nextPhase = prev.demoPhase + 1;
        if (nextPhase >= steps) {
          // 如果需要循环，则在此处理，或者停止
          return { ...prev, demoPhase: steps - 1, isPlaying: false };
        }
        
        // 自动播放时也需要同步跳转时间
        if (prev.activePhenomenon === 'moon-phases') {
          setTimeState(timePrev => {
            const base = getCurrentCycleNewMoon(timePrev.currentTimestamp);
            const targetAstronomic = getExactMoonPhaseTime(base, nextPhase);
            const bestLocalHour = MOON_PHASE_BEST_VIEW_HOURS[nextPhase];
            const target = TimeEngine.getTimestampForLocalHour(targetAstronomic, bestLocalHour, timezoneOffset);
            return { ...timePrev, currentTimestamp: target };
          });
        } else if (prev.activePhenomenon === 'solar-terms') {
           // ... 暂时不处理节气时间跳转，或者保持原样
        }
        
        return { ...prev, demoPhase: nextPhase };
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [demoState.isPlaying, demoState.playbackSpeed, demoState.activePhenomenon, timezoneOffset]);

  // 2. 实时查询公转轨道的 二十四节气 属性
  const daysSinceJ2000 = TimeEngine.getDaysSinceJ2000(timeState.currentTimestamp);
  const solarTermData = AstrophenomenaEngine.getCurrentSolarTerm(daysSinceJ2000);

  // 3. 计算选定行星的实时日地直角坐标 (Heliocentric Coordinates at current J2000 days epoch)
  const helioPos = OrbitEngine.getHeliocentricPosition(selectedPlanetId, daysSinceJ2000);

  // 4. 执行无极缩放与登录事件
  const triggerViewTransition = useCallback((targetLanded: boolean, targetPlanetId?: string) => {
    if (isTransitioning) return;
    
    if (targetLanded) {
      setTransitionDirection('toStarry');
      if (targetPlanetId) {
        setSelectedPlanetId(targetPlanetId);
      }
    } else {
      setTransitionDirection('toUniverse');
    }
    
    setIsTransitioning(true);
    
    // 100ms 后 (遮罩已完全覆盖)，立刻开始在后台挂载并渲染目标视角组件
    setTimeout(() => {
      setLanded(targetLanded);
    }, 100);
    
    // 满 2.5 秒过场动画播放完毕后，淡出遮罩
    setTimeout(() => {
      setIsTransitioning(false);
    }, 2500);
  }, [isTransitioning]);

  const handleToggleLanding = () => {
    triggerViewTransition(!landed);
  };

  const handleSelectPlanet = (id: string) => {
    setSelectedPlanetId(id);
    // 强制复位部分状态，并将详情卡重开
    setCrossSectionActive(false);
    setShowPlanetInfo(true);
  };

  const handleFocusPlanet = () => {
    setFocusTrigger(prev => prev + 1);
  };

  // ═══════════════════════════════════════════════════════════════
  // 天文现象演示回调
  // ═══════════════════════════════════════════════════════════════

  const handleSelectPhenomenon = (id: string) => {
    const phenomenon = id as PhenomenaDemoState['activePhenomenon'];
    setDemoState({
      activePhenomenon: phenomenon,
      demoPhase: 0,
      viewMode: 'universe',
      cameraPreset: null,
      isPlaying: false,
      playbackSpeed: 1,
      showGuidePanel: true,
    });
    setSelectedPlanetId('earth');
    setSelectedSolarTermIndex(null);
    setPhenomenaPanelOpen(false);
    // Jump to canonical starting date for this phenomenon
    const now = Date.now();
    let targetTs = now;
    if (phenomenon === 'moon-phases') {
      targetTs = getCurrentCycleNewMoon(now);
    } else if (phenomenon === 'eclipses') {
      // 跳转到最近的未来日食日期，使用NASA真实数据
      const futureSolar = SOLAR_ECLIPSE_EVENTS.find(e => new Date(e.date).getTime() > now);
      const futureLunar = LUNAR_ECLIPSE_EVENTS.find(e => new Date(e.date).getTime() > now);
      if (futureSolar && futureLunar) {
        targetTs = Math.min(new Date(futureSolar.date).getTime(), new Date(futureLunar.date).getTime());
      } else if (futureSolar) {
        targetTs = new Date(futureSolar.date).getTime();
      } else if (futureLunar) {
        targetTs = new Date(futureLunar.date).getTime();
      } else {
        // 没有未来事件，使用最后一个
        targetTs = new Date(SOLAR_ECLIPSE_EVENTS[SOLAR_ECLIPSE_EVENTS.length - 1].date).getTime();
      }
    } else if (phenomenon === 'solar-terms') {
      targetTs = findNearestSpringEquinox(now);
    }
    setTimeState(prev => ({ ...prev, currentTimestamp: targetTs, speedMultiplier: 1 }));
  };

  const handleExitDemo = () => {
    setDemoState({
      activePhenomenon: null,
      demoPhase: 0,
      viewMode: 'universe',
      cameraPreset: null,
      isPlaying: false,
      playbackSpeed: 1,
      showGuidePanel: true,
    });
    setSelectedSolarTermIndex(null);
    setPhenomenaPanelOpen(false);
    setEclipseEventTs(null);
    setEclipseEventType(null);
    setEclipseWindow(null);
  };

  const handleNextStep = () => {
    const steps = getPhenomenonSteps(demoState.activePhenomenon);
    const nextPhase = Math.min(demoState.demoPhase + 1, steps.length - 1);
    handleSelectPhase(nextPhase);
  };

  const handlePrevStep = () => {
    const nextPhase = Math.max(demoState.demoPhase - 1, 0);
    handleSelectPhase(nextPhase);
  };

  const handleTogglePlay = () => {
    setDemoState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const handleChangeSpeed = (speed: number) => {
    setDemoState(prev => ({ ...prev, playbackSpeed: speed }));
  };

  const handleSwitchView = (mode: PhenomenaDemoState['viewMode']) => {
    setDemoState(prev => ({ ...prev, viewMode: mode }));
    // Dual Lens: switch between Universe (principle) and Starry Sky (observation) viewers with transition
    if (mode === 'starry') {
      triggerViewTransition(true, 'earth');
    } else if (mode === 'universe') {
      triggerViewTransition(false);
    }
    // 'split' mode: keep current viewer for now (split view is complex, defer to later)
  };

  const handleSelectPhase = (phase: number) => {
    setDemoState(prev => ({ ...prev, demoPhase: phase }));
    if (demoState.activePhenomenon === 'solar-terms') {
      setSelectedSolarTermIndex(phase);
    }
    if (demoState.activePhenomenon === 'moon-phases') {
      setSelectedMoonPhaseIndex(phase);
    }
    // Jump time to canonical date for the selected phase
    const phenomenon = demoState.activePhenomenon;
    if (phenomenon === 'moon-phases') {
      // Calculate exact time for the targeted moon phase based on current cycle
      const base = getCurrentCycleNewMoon(timeState.currentTimestamp);
      const targetAstronomic = getExactMoonPhaseTime(base, phase);
      const bestLocalHour = MOON_PHASE_BEST_VIEW_HOURS[phase];
      const target = TimeEngine.getTimestampForLocalHour(targetAstronomic, bestLocalHour, timezoneOffset);
      setTimeState(prev => ({ ...prev, currentTimestamp: target }));
    } else if (phenomenon === 'eclipses') {
      // 日食演示各相位使用真实的NASA日食/月食数据
      // phase 0: 太阳光束 (用最近的日食日期)
      // phase 1: 月球影子锥 (用最近的日全食/环食日期)
      // phase 2: 地球被笼罩 (用最近的日全食日期)
      // phase 3: 月食/血月 (用最近的月全食日期)
      const now = Date.now();
      let targetTs = now;
      if (phase === 0) {
        const nextSolar = SOLAR_ECLIPSE_EVENTS.find(e => new Date(e.date).getTime() > now);
        targetTs = nextSolar ? new Date(nextSolar.date).getTime() : new Date(SOLAR_ECLIPSE_EVENTS[0].date).getTime();
      } else if (phase === 1 || phase === 2) {
        // 找一个日全食或日环食（中心食）来展示阴影锥
        const centerEclipses = SOLAR_ECLIPSE_EVENTS.filter(e => e.type === 'total' || e.type === 'annular' || e.type === 'hybrid');
        const nextCenter = centerEclipses.find(e => new Date(e.date).getTime() > now);
        targetTs = nextCenter ? new Date(nextCenter.date).getTime() : new Date(centerEclipses[0].date).getTime();
      } else if (phase === 3) {
        // 找一个月全食
        const totalLunar = LUNAR_ECLIPSE_EVENTS.filter(e => e.type === 'total');
        const nextLunar = totalLunar.find(e => new Date(e.date).getTime() > now);
        targetTs = nextLunar ? new Date(nextLunar.date).getTime() : new Date(totalLunar[0].date).getTime();
      }
      setTimeState(prev => ({ ...prev, currentTimestamp: targetTs }));
    } else if (phenomenon === 'solar-terms') {
      // 使用精确天文算法计算当前年份对应节气的日期
      const currentYear = new Date(timeState.currentTimestamp).getFullYear();
      const term = SOLAR_TERMS[phase];
      if (term) {
        const ts = AstrophenomenaEngine.getSolarTermTimestamp(currentYear, term.eclipticLongitude);
        setTimeState(prev => ({ ...prev, currentTimestamp: ts }));
      }
    }
  };

  const handleSelectSolarTerm = (index: number) => {
    setSelectedSolarTermIndex(index);
    setDemoState(prev => ({ ...prev, demoPhase: index }));

    // 将时间切换到当前年份对应节气的精确天文日期
    const currentYear = new Date(timeState.currentTimestamp).getFullYear();
    const term = SOLAR_TERMS[index];
    if (term) {
      const ts = AstrophenomenaEngine.getSolarTermTimestamp(currentYear, term.eclipticLongitude);
      setTimeState(prev => ({ ...prev, currentTimestamp: ts }));
    }
  };

  const handleSelectMoonPhase = (index: number) => {
    setSelectedMoonPhaseIndex(index);
    setDemoState(prev => ({ ...prev, demoPhase: index }));
    // Jump time to the corresponding moon phase
    const base = getCurrentCycleNewMoon(timeState.currentTimestamp);
    const targetAstronomic = getExactMoonPhaseTime(base, index);
    const bestLocalHour = MOON_PHASE_BEST_VIEW_HOURS[index];
    const target = TimeEngine.getTimestampForLocalHour(targetAstronomic, bestLocalHour, timezoneOffset);
    setTimeState(prev => ({ ...prev, currentTimestamp: target, isPaused: true })); // 自动暂停，让用户看清楚
  };

  const getPhenomenonSteps = (phenomenon: PhenomenaDemoState['activePhenomenon']) => {
    switch (phenomenon) {
      case 'moon-phases': return Array.from({ length: 8 });
      case 'eclipses': return Array.from({ length: 4 });
      case 'solar-terms': return Array.from({ length: 24 });
      default: return Array.from({ length: 1 });
    }
  };

  const isDemoActive = demoState.activePhenomenon !== null;

  // 根据当前选中主题生成配色样式类
  const getThemeClasses = () => {
    switch (theme) {
      case 'space-tech':
        return {
          bg: 'bg-[#050608] text-slate-100',
          accent: 'text-cyan-400',
          border: 'border-white/10',
          glow: 'shadow-cyan-950/20',
          btnActive: 'bg-cyan-500/15 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] font-bold'
        };
      case 'cosmic-dark':
        return {
          bg: 'bg-[#050608] text-neutral-100',
          accent: 'text-amber-500',
          border: 'border-white/10',
          glow: 'shadow-amber-950/10',
          btnActive: 'bg-amber-500/15 border-amber-500 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)] font-bold'
        };
      case 'neon-hologram':
        return {
          bg: 'bg-[#050608] text-zinc-100',
          accent: 'text-fuchsia-400',
          border: 'border-white/10',
          glow: 'shadow-fuchsia-950/20',
          btnActive: 'bg-fuchsia-500/15 border-fuchsia-500 text-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.15)] font-bold'
        };
      case 'solar-gold':
        return {
          bg: 'bg-[#050608] text-stone-100',
          accent: 'text-orange-500',
          border: 'border-white/10',
          glow: 'shadow-orange-950/20',
          btnActive: 'bg-orange-500/15 border-orange-500 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.15)] font-bold'
        };
    }
  };

  const themeStyle = getThemeClasses();

  const rightDrawerOpen = isDemoActive
    ? demoState.showGuidePanel
    : (showPlanetInfo || !!selectedCelestial);

  const renderCelestialDetailCard = () => {
    if (!selectedCelestial) return null;
    const isZh = lang === 'zh';
    return (
      <div className="flex flex-col space-y-3.5 text-slate-200 select-none">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_#818cf8] animate-pulse" />
            <h3 className="text-sm font-black tracking-wide text-white">
              {isZh ? selectedCelestial.nameZh : selectedCelestial.nameEn}
            </h3>
          </div>
          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
            {isZh ? selectedCelestial.typeZh : selectedCelestial.typeEn}
          </span>
        </div>

        {/* Coords & Mag Quick Readout Grid */}
        <div className="grid grid-cols-3 gap-1 bg-indigo-950/20 border border-indigo-500/10 rounded-lg p-2 text-center text-[10px] font-mono">
          <div className="border-r border-indigo-500/10">
            <div className="text-slate-500 text-[8px] uppercase tracking-wider">{isZh ? '视星等' : 'Mag'}</div>
            <div className="text-amber-400 font-bold mt-0.5">{selectedCelestial.mag.toFixed(2)}</div>
          </div>
          <div className="border-r border-indigo-500/10">
            <div className="text-slate-500 text-[8px] uppercase tracking-wider">{isZh ? '赤经 RA' : 'R.A.'}</div>
            <div className="text-indigo-300 font-bold mt-0.5">{selectedCelestial.ra.toFixed(2)}h</div>
          </div>
          <div>
            <div className="text-slate-500 text-[8px] uppercase tracking-wider">{isZh ? '赤纬 DEC' : 'DEC.'}</div>
            <div className="text-indigo-300 font-bold mt-0.5">{selectedCelestial.dec.toFixed(2)}°</div>
          </div>
        </div>

        {/* Core Info Description */}
        <div className="text-xs text-slate-300 leading-relaxed font-sans bg-white/[0.01] border border-white/5 rounded-lg p-3">
          <p>{isZh ? selectedCelestial.infoZh : selectedCelestial.infoEn}</p>
        </div>

        {/* Extra Specifications */}
        {(selectedCelestial.extraDetailsZh || selectedCelestial.extraDetailsEn) && (
          <div className="bg-indigo-950/15 border-l-2 border-indigo-500/50 rounded-r-lg p-2.5 text-[11px] leading-relaxed text-indigo-200/90 italic font-sans">
            {isZh ? selectedCelestial.extraDetailsZh : selectedCelestial.extraDetailsEn}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`h-full w-full flex flex-col relative overflow-hidden transition-colors duration-500 cosmic-starfield select-none ${themeStyle.bg}`}
      id="astro-simulation-framework-root"
    >
      {/* 加载页面 */}
      {isLoading && (
        <LoadingScreen
          lang={lang}
          theme={theme}
          onLoadComplete={() => {
            setIsLoading(false);
            setIsInitialEntry(false);
          }}
        />
      )}

      {/* 梦幻背景网格与漫射亮光 */}
      <div className="absolute inset-0 bg-radial from-transparent to-[#050608]/95 pointer-events-none z-0" />

      {/* ═══════════════════════════════════════════════════════════════
           LEFT INTEGRATED DRAWER (Settings + Astro Phenomena)
         ═══════════════════════════════════════════════════════════════ */}
      <div
        className={`fixed top-0 left-0 z-50 w-80 h-screen transition-transform duration-300 transform bg-slate-950/85 backdrop-blur-xl border border-white/10 border-l-0 rounded-r-2xl shadow-2xl flex flex-col ${
          (settingsOpen || phenomenaPanelOpen) ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Floating integrated tab switcher buttons on the right edge of Left Drawer */}
        <div className={`absolute left-full top-4 flex flex-col gap-2 pointer-events-auto transition-all duration-300 ${!(settingsOpen || phenomenaPanelOpen) ? '-translate-x-[34px] opacity-70 hover:translate-x-0 hover:opacity-100' : 'translate-x-0 opacity-100'}`}>
          <button
            onClick={() => {
              const next = !settingsOpen;
              setSettingsOpen(next);
              if (next) setPhenomenaPanelOpen(false);
            }}
            className={`flex items-center w-16 h-10 rounded-r-xl border border-l-0 border-white/10 shadow-2xl backdrop-blur-xl transition-all duration-200 cursor-pointer ${
              settingsOpen || phenomenaPanelOpen ? 'justify-center' : 'justify-end pr-[11px]'
            } ${
              settingsOpen
                ? 'bg-cyan-500/20 text-cyan-300'
                : 'bg-black/60 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title={lang === 'zh' ? '系统设置' : 'System Settings'}
          >
            {settingsOpen ? (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => {
              const next = !phenomenaPanelOpen;
              setPhenomenaPanelOpen(next);
              if (next) setSettingsOpen(false);
            }}
            className={`flex items-center w-16 h-10 rounded-r-xl border border-l-0 border-white/10 shadow-2xl backdrop-blur-xl transition-all duration-200 cursor-pointer ${
              settingsOpen || phenomenaPanelOpen ? 'justify-center' : 'justify-end pr-[11px]'
            } ${
              phenomenaPanelOpen
                ? 'bg-cyan-500/20 text-cyan-300'
                : 'bg-black/60 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title={lang === 'zh' ? '天文现象' : 'Astro Phenomena'}
          >
            {phenomenaPanelOpen ? (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
              </svg>
            )}
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative flex flex-col h-full">
          {settingsOpen && (
            <div className="flex-1 h-full min-h-0">
              <CommandPanel
                lang={lang}
                onChangeLang={setLang}
                landed={landed}
                theme={theme}
                onChangeTheme={setTheme}
                showConstellLines={showConstellLines}
                onToggleConstellLines={(show) => {
                  setShowConstellLines(show);
                  if (!show) setShowConstellNames(false);
                }}
                showStarNames={showStarNames}
                onToggleStarNames={setShowStarNames}
                showConstellNames={showConstellNames}
                onToggleConstellNames={setShowConstellNames}
                magLimit={magLimit}
                onChangeMagLimit={setMagLimit}
                telescopeActive={telescopeActive}
                onToggleTelescope={setTelescopeActive}
                selectedPlanetId={selectedPlanetId}
                onSelectPlanet={handleSelectPlanet}
                onFocusPlanet={handleFocusPlanet}
                showPlanetLabels={showPlanetLabels}
                onTogglePlanetLabels={setShowPlanetLabels}
                onJumpDate={(ts) => setTimeState(prev => ({ ...prev, currentTimestamp: ts }))}
                helioX={helioPos.x}
                helioY={helioPos.y}
                helioZ={helioPos.z}
                latitude={latitude}
                longitude={longitude}
                onChangeLatitude={setLatitude}
                onChangeLongitude={setLongitude}
                validationPairKey={validationPairKey}
                onChangeValidationPairKey={setValidationPairKey}
                panelTab={panelTab}
                onChangePanelTab={setPanelTab}
                packingActive={packingActive}
                onTogglePackingActive={setPackingActive}
                packingProgressDone={packingProgressDone}
                packingMode={packingMode}
                onChangePackingMode={setPackingMode}
                strictPhysics={strictPhysics}
                onToggleStrictPhysics={setStrictPhysics}
                exposure={exposure}
                onChangeExposure={setExposure}
                showOrbits={showOrbits}
                onToggleOrbits={setShowOrbits}
                useExponentialSpeed={useExponentialSpeed}
                onToggleExponentialSpeed={setUseExponentialSpeed}
                customSpeedPreset={customSpeedPreset}
                onChangeCustomSpeedPreset={setCustomSpeedPreset}
                showAxes={showAxes}
                onToggleAxes={setShowAxes}
                showLatLonGrid={showLatLonGrid}
                onToggleLatLonGrid={setShowLatLonGrid}
                isOpen={settingsOpen}
              />
            </div>
          )}
          {phenomenaPanelOpen && (
            <div className="flex-1 h-full min-h-0 flex flex-col pt-4">
              <div className="flex items-center gap-2 border-b border-slate-800/60 pb-2.5 px-4 mb-2 shrink-0">
                <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
                </svg>
                <span className="text-[11px] font-bold font-mono text-cyan-400 uppercase tracking-widest">
                  {lang === 'zh' ? '天文现象演示' : 'ASTRONOMICAL PHENOMENA'}
                </span>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <AstroPhenomenaPanel
                  lang={lang}
                  theme={theme}
                  isOpen={phenomenaPanelOpen}
                  onToggle={() => setPhenomenaPanelOpen(prev => !prev)}
                  onSelectPhenomenon={handleSelectPhenomenon}
                  activePhenomenon={demoState.activePhenomenon}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
           RIGHT INTEGRATED DRAWER (Planet Info / Guide / Celestial Card)
         ═══════════════════════════════════════════════════════════════ */}
      <div
        className={`fixed top-0 right-0 z-50 w-80 h-screen transition-transform duration-300 transform bg-slate-950/85 backdrop-blur-xl border border-white/10 border-r-0 rounded-l-2xl shadow-2xl flex flex-col ${
          rightDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Floating integrated buttons on the left edge of Right Drawer */}
        <div className={`absolute right-full top-4 flex flex-col gap-2 pointer-events-auto transition-all duration-300 ${!rightDrawerOpen ? 'translate-x-[34px] opacity-70 hover:translate-x-0 hover:opacity-100' : 'translate-x-0 opacity-100'}`}>
          {isDemoActive ? (
            <button
              onClick={() => {
                setDemoState(prev => ({ ...prev, showGuidePanel: !prev.showGuidePanel }));
              }}
              className={`flex items-center w-16 h-10 rounded-l-xl border border-r-0 border-white/10 shadow-2xl backdrop-blur-xl transition-all duration-200 cursor-pointer ${
                rightDrawerOpen ? 'justify-center' : 'justify-start pl-[11px]'
              } ${
                demoState.showGuidePanel
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'bg-black/60 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
              title={lang === 'zh' ? '演示指南' : 'Demo Guide'}
            >
              {demoState.showGuidePanel ? (
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              ) : (
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
              )}
            </button>
          ) : (
            <button
              onClick={() => {
                if (rightDrawerOpen) {
                  // 如果是打开的，点击它应该完全收起（包括关闭星体详情和清除选中的星体）
                  setShowPlanetInfo(false);
                  setSelectedCelestial(null);
                } else {
                  setShowPlanetInfo(true);
                }
              }}
              className={`flex items-center w-16 h-10 rounded-l-xl border border-r-0 border-white/10 shadow-2xl backdrop-blur-xl transition-all duration-200 cursor-pointer ${
                rightDrawerOpen ? 'justify-center' : 'justify-start pl-[11px]'
              } ${
                rightDrawerOpen
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'bg-black/60 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
              title={lang === 'zh' ? '星体详情' : 'Planet Details'}
            >
              {rightDrawerOpen ? (
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              ) : (
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                  <path d="M2 12h20" />
                </svg>
              )}
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden p-4">
          {isDemoActive ? (
            <div className="flex-1 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
              <PhenomenaGuidePanel
                lang={lang}
                theme={theme}
                demoState={demoState}
                onNextStep={handleNextStep}
                onPrevStep={handlePrevStep}
                onSwitchView={handleSwitchView}
                onExitDemo={handleExitDemo}
                onHidePanel={() => setDemoState(prev => ({ ...prev, showGuidePanel: false }))}
                onTogglePlay={handleTogglePlay}
                onChangeSpeed={handleChangeSpeed}
                onSelectPhase={handleSelectPhase}
                selectedMoonPhaseIndex={selectedMoonPhaseIndex}
                onClearMoonPhaseSelection={() => setSelectedMoonPhaseIndex(null)}
                selectedPlanetId={selectedPlanetId}
                onSelectPlanet={setSelectedPlanetId}
                eclipseEventTs={eclipseEventTs}
                eclipseEventType={eclipseEventType}
                eclipseProgress={eclipseProgress}
                eclipseWindow={eclipseWindow}
                onSelectEclipseEvent={(ts, type) => {
                  setEclipseEventTs(ts);
                  setEclipseEventType(type);
                  if (type) {
                    const win = AstrophenomenaEngine.getEclipseWindow(ts, type);
                    setEclipseWindow(win);
                    setTimeState(prev => ({ ...prev, currentTimestamp: win.start }));
                  } else {
                    setEclipseWindow(null);
                    setTimeState(prev => ({ ...prev, currentTimestamp: ts - 3 * 3600000 }));
                  }
                }}
                onChangeEclipseProgress={(progress) => {
                  if (eclipseEventTs) {
                    if (eclipseWindow) {
                      const ts = eclipseWindow.start + progress * (eclipseWindow.end - eclipseWindow.start);
                      setTimeState(prev => ({ ...prev, currentTimestamp: ts }));
                    } else {
                      const offsetMs = (progress - 0.5) * 6 * 3600000;
                      setTimeState(prev => ({ ...prev, currentTimestamp: eclipseEventTs + offsetMs }));
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full min-h-0 divide-y divide-white/10 overflow-hidden">
              {showPlanetInfo && (
                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 pb-4">
                  <PlanetInfoPanel
                    planetId={selectedPlanetId}
                    crossSectionActive={crossSectionActive}
                    onToggleCrossSection={(active) => {
                      setCrossSectionActive(active);
                      if (active) setCloudsVisible(false);
                    }}
                    cloudsVisible={cloudsVisible}
                    onToggleClouds={() => setCloudsVisible(v => !v)}
                    lang={lang}
                    landed={landed}
                    onToggleLanding={handleToggleLanding}
                    isLandable={LANDABLE_PLANETS.includes(selectedPlanetId)}
                    textureOffset={textureOffsets[selectedPlanetId] ?? { u: 0, v: 0 }}
                    onChangeTextureOffset={(offset) => setTextureOffsets(prev => ({ ...prev, [selectedPlanetId]: offset }))}
                    activeLayer={activeLayer}
                    onLayerHover={setActiveLayer}
                  />
                </div>
              )}
              {selectedCelestial && (
                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 pt-4">
                  {renderCelestialDetailCard()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
           MAIN VIEWPORT
         ═══════════════════════════════════════════════════════════════ */}
      <main className="flex-1 w-full relative z-10 overflow-hidden">

        {/* 无极缩放 (Seamless Zoom / Cloud entry effect overlay) 动态面纱 */}
        {isTransitioning && (
          <TransitionScreen
            direction={transitionDirection}
            lang={lang}
            theme={theme}
            planetId={selectedPlanetId}
          />
        )}

        {/* 主要操盘画布：占满100%父容器空间 */}
        <div className="w-full h-full absolute inset-0 z-0" id="simulator-viewport-housing">
          {mountViewer && (
            landed ? (
              <StarrySkyViewer
                currentTimestamp={timeState.currentTimestamp}
                latitude={latitude}
                longitude={longitude}
                observerBodyId={selectedPlanetId}
                lang={lang}
                showConstellLines={showConstellLines}
                showStarNames={showStarNames}
                showConstellNames={showConstellNames}
                magLimit={magLimit}
                telescopeActive={telescopeActive}
                onTelescopeChange={setTelescopeActive}
                textureOffsets={textureOffsets}
                onChangeTextureOffset={(id, offset) => setTextureOffsets(prev => ({ ...prev, [id]: offset }))}
                exposure={exposure}
                demoState={demoState}
                onExitLanding={() => triggerViewTransition(false)}
                selectedCelestial={selectedCelestial}
                setSelectedCelestial={setSelectedCelestial}
                onChangeLatitude={setLatitude}
                onChangeLongitude={setLongitude}
              />
            ) : (
              <UniverseViewer
                startEntryAnimation={!isInitialEntry}
                currentTimestamp={timeState.currentTimestamp}
                selectedPlanetId={selectedPlanetId}
                onSelectPlanet={handleSelectPlanet}
                onFocusPlanet={handleFocusPlanet}
                crossSectionActive={crossSectionActive}
                cloudsVisible={cloudsVisible}
                lang={lang}
                showConstellLines={showConstellLines}
                showConstellNames={showConstellNames}
                showPlanetLabels={showPlanetLabels}
                magLimit={magLimit}
                strictPhysics={strictPhysics}
                setStrictPhysics={setStrictPhysics}
                textureOffsets={textureOffsets}
                activeLayer={activeLayer}
                onLayerHover={setActiveLayer}
                exposure={exposure}
                showOrbits={showOrbits}
                showAxes={showAxes}
                showLatLonGrid={showLatLonGrid}
                demoState={demoState}
                selectedSolarTermIndex={selectedSolarTermIndex}
                onSelectSolarTerm={handleSelectSolarTerm}
                selectedMoonPhaseIndex={selectedMoonPhaseIndex}
                onSelectMoonPhase={handleSelectMoonPhase}
                eclipseEventType={eclipseEventType}
                eclipseEventTs={eclipseEventTs}
                focusTrigger={focusTrigger}
              />
            )
          )}
        </div>

      </main>

      {/* ═══════════════════════════════════════════════════════════════
           BOTTOM: Time Bar always visible (even during demo)
         ═══════════════════════════════════════════════════════════════ */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[26] pointer-events-auto">
        <ArcTimeBar
            timeState={timeState}
            onChangeTimeState={(part) => setTimeState(prev => ({ ...prev, ...part }))}
            lang={lang}
            onJumpDate={(ts) => setTimeState(prev => ({ ...prev, currentTimestamp: ts }))}
            timezoneOffset={timezoneOffset}
            onChangeTimezoneOffset={setTimezoneOffset}
          />
        </div>

    </div>
  );
}
