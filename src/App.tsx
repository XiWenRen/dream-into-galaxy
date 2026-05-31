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

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialEntry, setIsInitialEntry] = useState(true);
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const [selectedPlanetId, setSelectedPlanetId] = useState<string>('sun');
  const [crossSectionActive, setCrossSectionActive] = useState<boolean>(false);
  const [cloudsVisible, setCloudsVisible] = useState<boolean>(true);
  const [showPlanetInfo, setShowPlanetInfo] = useState<boolean>(true);
  // 自定义主题
  const [theme, setTheme] = useState<ThemeType>('space-tech');

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

  // 处理无极缩放 (Stepless Transition Animation Effect)
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

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
            const target = getExactMoonPhaseTime(base, nextPhase);
            return { ...timePrev, currentTimestamp: target };
          });
        } else if (prev.activePhenomenon === 'solar-terms') {
           // ... 暂时不处理节气时间跳转，或者保持原样
        }
        
        return { ...prev, demoPhase: nextPhase };
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [demoState.isPlaying, demoState.playbackSpeed, demoState.activePhenomenon]);

  // 2. 实时查询公转轨道的 二十四节气 属性
  const daysSinceJ2000 = TimeEngine.getDaysSinceJ2000(timeState.currentTimestamp);
  const solarTermData = AstrophenomenaEngine.getCurrentSolarTerm(daysSinceJ2000);

  // 3. 计算选定行星的实时日地直角坐标 (Heliocentric Coordinates at current J2000 days epoch)
  const helioPos = OrbitEngine.getHeliocentricPosition(selectedPlanetId, daysSinceJ2000);

  // 4. 执行无极缩放与登录事件
  const handleToggleLanding = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setLanded(!landed);
      setIsTransitioning(false);
    }, 600); // 配合动画时间
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
    // Dual Lens: switch between Universe (principle) and Starry Sky (observation) viewers
    if (mode === 'starry') {
      setSelectedPlanetId('earth');
      setLanded(true);
    } else if (mode === 'universe') {
      setLanded(false);
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
      const target = getExactMoonPhaseTime(base, phase);
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
    const target = getExactMoonPhaseTime(base, index);
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

  return (
    <div
      className={`h-full w-full flex flex-col relative overflow-hidden transition-colors duration-500 cosmic-starfield select-none ${themeStyle.bg}`}
      id="astro-simulation-framework-root"
    >
      {/* 加载页面 */}
      {isLoading && (
        <LoadingScreen
          lang={lang}
          onLoadComplete={() => {
            setIsLoading(false);
            setIsInitialEntry(false);
          }}
        />
      )}

      {/* 梦幻背景网格与漫射亮光 */}
      <div className="absolute inset-0 bg-radial from-transparent to-[#050608]/95 pointer-events-none z-0" />

      {/* ═══════════════════════════════════════════════════════════════
           TOP-LEFT: Settings Button + Left Drawer
         ═══════════════════════════════════════════════════════════════ */}
      <div
        className={`fixed top-3 left-0 z-[45] transition-all duration-300 overflow-hidden ${
          settingsOpen ? 'max-w-[120px]' : 'max-w-9'
        } hover:max-w-[120px]`}
      >
        <button
          onClick={() => {
            const next = !settingsOpen;
            setSettingsOpen(next);
            if (next) setPhenomenaPanelOpen(false);
          }}
          className={`flex items-center gap-1.5 h-8 rounded-r-xl px-2 transition-all duration-200 bg-black/60 backdrop-blur-xl border border-white/10 border-l-0 shadow-2xl ${
            settingsOpen
              ? 'bg-cyan-500/20 text-cyan-300'
              : 'text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span className={`overflow-hidden transition-all duration-200 text-[11px] font-medium whitespace-nowrap ${settingsOpen ? 'max-w-20' : 'max-w-0'}`}>
            {lang === 'zh' ? '设置' : 'Settings'}
          </span>
        </button>
      </div>
      <div className={`fixed top-14 left-3 z-50 w-72 max-h-[calc(100vh-80px)] transition-all duration-300 ${settingsOpen ? 'translate-x-0 opacity-100 pointer-events-auto' : '-translate-x-full opacity-0 pointer-events-none'}`}>
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
          onClose={() => setSettingsOpen(false)}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════
           TOP-LEFT (below settings): Astro Phenomena Button + Fused Panel
         ═══════════════════════════════════════════════════════════════ */}
      <div
        className={`fixed top-14 left-0 z-[45] w-72 transition-all duration-300 bg-black/60 backdrop-blur-xl border border-white/10 rounded-r-xl overflow-hidden ${
          phenomenaPanelOpen ? 'max-h-[calc(100vh-80px)] opacity-100' : 'max-w-9 opacity-100 hover:max-w-[120px]'
        }`}
      >
        <button
          onClick={() => {
            const next = !phenomenaPanelOpen;
            setPhenomenaPanelOpen(next);
            if (next) setSettingsOpen(false);
          }}
          className={`flex items-center gap-1.5 h-8 px-2 transition-all duration-200 w-full ${
            phenomenaPanelOpen
              ? 'bg-cyan-500/20 text-cyan-300 border-b border-white/10'
              : 'text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
          </svg>
          <span className={`overflow-hidden transition-all duration-200 text-[11px] font-medium whitespace-nowrap ${phenomenaPanelOpen ? 'max-w-20' : 'max-w-0'}`}>
            {lang === 'zh' ? '天文' : 'Astro'}
          </span>
        </button>
        <div className={`transition-all duration-300 ${phenomenaPanelOpen ? 'opacity-100 max-h-[calc(100vh-120px)]' : 'opacity-0 max-h-0 overflow-hidden'}`}>
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

      {/* ═══════════════════════════════════════════════════════════════
           TOP-RIGHT: Planet Info / Guide Button + Right Drawer
         ═══════════════════════════════════════════════════════════════ */}
      <div
        className={`fixed top-3 right-0 z-[45] transition-all duration-300 overflow-hidden flex justify-end ${
          (isDemoActive ? demoState.showGuidePanel : showPlanetInfo) ? 'max-w-[120px]' : 'max-w-9'
        } hover:max-w-[120px]`}
      >
        <button
          onClick={() => {
            if (isDemoActive) {
              setDemoState(prev => ({ ...prev, showGuidePanel: !prev.showGuidePanel }));
            } else {
              setShowPlanetInfo(v => !v);
            }
          }}
          className={`flex items-center gap-1.5 h-8 rounded-l-xl px-2 transition-all duration-200 bg-black/60 backdrop-blur-xl border border-white/10 border-r-0 shadow-2xl ${
            (isDemoActive ? demoState.showGuidePanel : showPlanetInfo)
              ? 'bg-cyan-500/20 text-cyan-300'
              : 'text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          {isDemoActive ? (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
              <path d="M2 12h20" />
            </svg>
          )}
          <span className={`overflow-hidden transition-all duration-200 text-[11px] font-medium whitespace-nowrap ${(isDemoActive ? demoState.showGuidePanel : showPlanetInfo) ? 'max-w-20' : 'max-w-0'}`}>
            {isDemoActive ? (lang === 'zh' ? '指南' : 'Guide') : (lang === 'zh' ? '星体' : 'Planet')}
          </span>
        </button>
      </div>
      <div className={`fixed top-14 right-3 z-50 w-72 max-h-[calc(100vh-80px)] transition-all duration-300 ${(isDemoActive ? demoState.showGuidePanel : showPlanetInfo) ? 'translate-x-0 opacity-100 pointer-events-auto' : 'translate-x-full opacity-0 pointer-events-none'}`}>
        {isDemoActive ? (
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
        ) : (
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
            onClose={() => setShowPlanetInfo(false)}
            landed={landed}
            onToggleLanding={handleToggleLanding}
            isLandable={LANDABLE_PLANETS.includes(selectedPlanetId)}
            textureOffset={textureOffsets[selectedPlanetId] ?? { u: 0, v: 0 }}
            onChangeTextureOffset={(offset) => setTextureOffsets(prev => ({ ...prev, [selectedPlanetId]: offset }))}
            activeLayer={activeLayer}
            onLayerHover={setActiveLayer}
          />
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
           MAIN VIEWPORT
         ═══════════════════════════════════════════════════════════════ */}
      <main className="flex-1 w-full relative z-10 overflow-hidden">

        {/* 无极缩放 (Seamless Zoom / Cloud entry effect overlay) 动态面纱 */}
        {isTransitioning && (
          <div className="absolute inset-0 bg-[#050608] flex flex-col items-center justify-center z-50 animate-pulse duration-500 p-6 text-center select-none">
            <div className="w-16 h-16 border-t-2 border-r-2 border-cyan-500 rounded-full animate-spin mb-4" />
            <span className="text-lg font-bold font-mono tracking-widest text-cyan-400">
              {landed ? 'LAUNCHING INTO DEEP SPACE...' : 'ENTERING PLANETARY ATMOSPHERE...'}
            </span>
            <p className="text-xs text-slate-500 mt-2 font-mono">
              Calibrating coordinates to horizontal dome space frame
            </p>
          </div>
        )}

        {/* 主要操盘画布：占满100%父容器空间 */}
        <div className="w-full h-full absolute inset-0 z-0" id="simulator-viewport-housing">
          {landed ? (
            <>
              {/* 右上角退出星空模式按钮 */}
              <button
                onClick={() => setLanded(false)}
                className="absolute top-5 right-5 z-30 flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[10px] font-extrabold cursor-pointer border border-red-500/40 bg-red-950/30 text-red-400 hover:bg-red-950/45 tracking-wider uppercase transition-all duration-300 hover:scale-105 active:scale-95"
                id="btn-exit-starry-sky"
                title={lang === 'zh' ? '退出星空模式' : 'Exit Starry Sky'}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
                <span>{lang === 'zh' ? '退出观测' : 'EXIT OBSERVER'}</span>
              </button>
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
              />
            </>
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
          />
        </div>

    </div>
  );
}
