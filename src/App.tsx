/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import UniverseViewer from './components/UniverseViewer';
import StarrySkyViewer from './components/StarrySkyViewer';
import PlanetInfoPanel from './components/PlanetInfoPanel';
import CommandPanel from './components/CommandPanel';
import ArcTimeBar from './components/ArcTimeBar';
import LoadingScreen from './components/LoadingScreen';
import AstroPhenomenaPanel from './components/AstroPhenomenaPanel';
import PhenomenaGuidePanel from './components/PhenomenaGuidePanel';
import SolarTermInfoPanel from './components/SolarTermInfoPanel';
import PhenomenaDemoBar from './components/PhenomenaDemoBar';
import { TimeEngine } from './engine/TimeEngine';
import { OrbitEngine } from './engine/OrbitEngine';
import { AstrophenomenaEngine } from './engine/AstrophenomenaEngine';
import { TimeState, ThemeType, PhenomenaDemoState } from './types/astronomy';
import { translations } from './i18n';

// 可登录天体白名单 (行星、月球及主要天然卫星均可作为观测点)
const LANDABLE_PLANETS = ['earth', 'mercury', 'venus', 'mars', 'moon', 'jupiter', 'saturn', 'uranus', 'neptune', 'phobos', 'deimos', 'io', 'europa', 'ganymede', 'callisto', 'titan', 'rhea', 'enceladus', 'titania', 'oberon', 'ariel', 'triton', 'proteus'];

// ── Demo playback helpers ───────────────────────────────────────
const SYNODIC_MONTH_MS = 29.53059 * 24 * 60 * 60 * 1000;

function findNearestNewMoon(referenceTimestamp: number): number {
  const knownNewMoon = Date.UTC(2000, 0, 6, 11, 0, 0);
  const monthsSince = (referenceTimestamp - knownNewMoon) / SYNODIC_MONTH_MS;
  return knownNewMoon + Math.round(monthsSince) * SYNODIC_MONTH_MS;
}

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

const DEMO_SPEED_MAP: Record<string, number> = {
  'moon-phases': 86400 * 3,   // 3 days/sec
  'seasons': 86400 * 15,      // 15 days/sec
  'eclipses': 86400,          // 1 day/sec
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

  // 相机穿梭倍速及自定义速度状态
  const [useExponentialSpeed, setUseExponentialSpeed] = useState<boolean>(true);
  const [customSpeedPreset, setCustomSpeedPreset] = useState<string>('light');

  // 地面登录观测站参数 (纬度和经度)
  const [landed, setLanded] = useState<boolean>(false);
  const [latitude, setLatitude] = useState<number>(31.23); // 默认上海/中国中纬度 (31° N)
  const [longitude, setLongitude] = useState<number>(121.47); // 默认 121° E

  // 国定星空星座辅助标记开关
  const [showConstellLines, setShowConstellLines] = useState<boolean>(true);
  const [showStarNames, setShowStarNames] = useState<boolean>(true);
  const [showConstellNames, setShowConstellNames] = useState<boolean>(true);
  const [magLimit, setMagLimit] = useState<number>(5.5);

  // 行星/卫星名称标签开关
  const [showPlanetLabels, setShowPlanetLabels] = useState<boolean>(true);

  // 轨道线展示/隐藏开关
  const [showOrbits, setShowOrbits] = useState<boolean>(true);

  // 星体坐标轴展示/隐藏开关
  const [showAxes, setShowAxes] = useState<boolean>(false);

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

  // 当前选中的节气索引（四季与节气演示模式）
  const [selectedSolarTermIndex, setSelectedSolarTermIndex] = useState<number | null>(null);

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

  // 1b. 天文现象演示自动播放逻辑
  useEffect(() => {
    if (!demoState.isPlaying || !demoState.activePhenomenon) return;
    const totalSteps = getPhenomenonSteps(demoState.activePhenomenon).length;
    const stepDuration = 3500; // ms per step at 1x
    const intervalMs = stepDuration / demoState.playbackSpeed;

    const timer = setInterval(() => {
      setDemoState(prev => {
        if (!prev.isPlaying || !prev.activePhenomenon) return prev;
        const steps = getPhenomenonSteps(prev.activePhenomenon).length;
        const nextPhase = prev.demoPhase + 1;
        if (nextPhase >= steps) {
          return { ...prev, demoPhase: steps - 1, isPlaying: false };
        }
        return { ...prev, demoPhase: nextPhase };
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [demoState.isPlaying, demoState.playbackSpeed, demoState.activePhenomenon]);

  // 1c. 演示模式下自动调整时间流速，退出时恢复
  useEffect(() => {
    const phenomenon = demoState.activePhenomenon;
    if (demoState.isPlaying && phenomenon) {
      const speed = DEMO_SPEED_MAP[phenomenon] || 1;
      setTimeState(prev => ({ ...prev, speedMultiplier: speed }));
    } else if (!phenomenon) {
      setTimeState(prev => ({ ...prev, speedMultiplier: 1 }));
    }
  }, [demoState.isPlaying, demoState.activePhenomenon]);

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
    setSelectedSolarTermIndex(null);
    setPhenomenaPanelOpen(false);
    // Jump to canonical starting date for this phenomenon
    const now = Date.now();
    let targetTs = now;
    if (phenomenon === 'moon-phases') {
      targetTs = findNearestNewMoon(now);
    } else if (phenomenon === 'seasons') {
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
  };

  const handleNextStep = () => {
    setDemoState(prev => {
      const steps = getPhenomenonSteps(prev.activePhenomenon);
      const nextPhase = Math.min(prev.demoPhase + 1, steps.length - 1);
      return { ...prev, demoPhase: nextPhase };
    });
  };

  const handlePrevStep = () => {
    setDemoState(prev => ({
      ...prev,
      demoPhase: Math.max(prev.demoPhase - 1, 0),
    }));
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
    // Jump time to canonical date for the selected phase
    const phenomenon = demoState.activePhenomenon;
    if (phenomenon === 'moon-phases') {
      const base = findNearestNewMoon(Date.now());
      const target = base + (phase / 8) * SYNODIC_MONTH_MS;
      setTimeState(prev => ({ ...prev, currentTimestamp: target }));
    } else if (phenomenon === 'seasons') {
      const base = findNearestSpringEquinox(Date.now());
      const seasonOffsetMs = [0, 0.25, 0.5, 0.75][phase] * 365.2422 * 86400000;
      setTimeState(prev => ({ ...prev, currentTimestamp: base + seasonOffsetMs }));
    }
  };

  const handleSelectSolarTerm = (index: number) => {
    setSelectedSolarTermIndex(index);
  };

  const getPhenomenonSteps = (phenomenon: PhenomenaDemoState['activePhenomenon']) => {
    switch (phenomenon) {
      case 'moon-phases': return Array.from({ length: 3 });
      case 'eclipses': return Array.from({ length: 4 });
      case 'seasons': return Array.from({ length: 4 });
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
           TOP-LEFT: Command Panel (collapsible)
         ═══════════════════════════════════════════════════════════════ */}
      <div className="absolute top-5 left-5 z-30 pointer-events-auto">
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
          useExponentialSpeed={useExponentialSpeed}
          onToggleExponentialSpeed={setUseExponentialSpeed}
          customSpeedPreset={customSpeedPreset}
          onChangeCustomSpeedPreset={setCustomSpeedPreset}
          exposure={exposure}
          onChangeExposure={setExposure}
          showOrbits={showOrbits}
          onToggleOrbits={setShowOrbits}
          showAxes={showAxes}
          onToggleAxes={setShowAxes}
        />
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
              crossSectionActive={crossSectionActive}
              cloudsVisible={cloudsVisible}
              lang={lang}
              showConstellLines={showConstellLines}
              magLimit={magLimit}
              strictPhysics={strictPhysics}
              setStrictPhysics={setStrictPhysics}
              textureOffsets={textureOffsets}
              activeLayer={activeLayer}
              onLayerHover={setActiveLayer}
              exposure={exposure}
              showOrbits={showOrbits}
              showAxes={showAxes}
              demoState={demoState}
              selectedSolarTermIndex={selectedSolarTermIndex}
              onSelectSolarTerm={handleSelectSolarTerm}
            />
          )}
        </div>

        {/* 右侧：悬浮天体结构剖析与物理常数面板 (仅在 3D 宇宙模式、且选择特定星球时悬浮在右侧) */}
        {!landed && selectedPlanetId && showPlanetInfo && !isDemoActive && (
          <div className="absolute top-20 right-5 w-[22rem] max-h-[calc(100vh-180px)] bg-black/75 border border-white/10 rounded-2xl p-0 shadow-2xl z-20 backdrop-blur-md hidden md:block select-none animate-in fade-in-0 slide-in-from-right-5 duration-300">
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
          </div>
        )}

        {/* 当面板关闭时，在右侧悬浮一个小巧精致的展开按钮泡泡 */}
        {!landed && selectedPlanetId && !showPlanetInfo && !isDemoActive && (
          <button
            onClick={() => setShowPlanetInfo(true)}
            className="absolute top-20 right-5 z-20 w-10 h-10 flex items-center justify-center bg-black/80 hover:bg-black border border-white/10 hover:border-cyan-500/50 text-cyan-400 hover:text-white rounded-xl shadow-2xl backdrop-blur-md cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 animate-in zoom-in-90"
            id="btn-reopen-planet-info"
            title={lang === 'zh' ? '展开星体介绍' : 'Open Planet Info'}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </button>
        )}

        {/* ═══════════════════════════════════════════════════════════════
             LEFT: Astro Phenomena Panel (floating drawer)
           ═══════════════════════════════════════════════════════════════ */}
        {!landed && (
          <AstroPhenomenaPanel
            lang={lang}
            theme={theme}
            isOpen={phenomenaPanelOpen}
            onToggle={() => setPhenomenaPanelOpen(prev => !prev)}
            onSelectPhenomenon={handleSelectPhenomenon}
            activePhenomenon={demoState.activePhenomenon}
          />
        )}

        {/* ═══════════════════════════════════════════════════════════════
             RIGHT: Phenomena Guide Panel (during demo, replaces PlanetInfoPanel)
           ═══════════════════════════════════════════════════════════════ */}
        {!landed && isDemoActive && demoState.showGuidePanel && demoState.activePhenomenon !== 'seasons' && (
          <div className="absolute top-20 right-5 z-20">
            <PhenomenaGuidePanel
              lang={lang}
              theme={theme}
              demoState={demoState}
              onNextStep={handleNextStep}
              onPrevStep={handlePrevStep}
              onSwitchView={handleSwitchView}
              onExitDemo={handleExitDemo}
              onTogglePlay={handleTogglePlay}
            />
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
             RIGHT: Solar Term Info Panel (during seasons demo)
           ═══════════════════════════════════════════════════════════════ */}
        {!landed && isDemoActive && demoState.activePhenomenon === 'seasons' && selectedSolarTermIndex !== null && (
          <div className="absolute top-20 right-5 z-20">
            <SolarTermInfoPanel
              lang={lang}
              theme={theme}
              selectedSolarTermIndex={selectedSolarTermIndex}
              onClose={() => setSelectedSolarTermIndex(null)}
            />
          </div>
        )}
      </main>

      {/* ═══════════════════════════════════════════════════════════════
           BOTTOM: Phenomena Demo Bar (during demo)
         ═══════════════════════════════════════════════════════════════ */}
      {isDemoActive && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[26] pointer-events-auto">
          <PhenomenaDemoBar
            lang={lang}
            theme={theme}
            activePhenomenon={demoState.activePhenomenon!}
            demoPhase={demoState.demoPhase}
            totalSteps={getPhenomenonSteps(demoState.activePhenomenon).length}
            viewMode={demoState.viewMode}
            isPlaying={demoState.isPlaying}
            playbackSpeed={demoState.playbackSpeed}
            onNextStep={handleNextStep}
            onPrevStep={handlePrevStep}
            onTogglePlay={handleTogglePlay}
            onChangeSpeed={handleChangeSpeed}
            onSwitchView={handleSwitchView}
            onExitDemo={handleExitDemo}
            onSelectPhase={handleSelectPhase}
          />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
           BOTTOM: Arc Time Bar
         ═══════════════════════════════════════════════════════════════ */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[25] pointer-events-auto">
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
