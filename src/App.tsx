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
import SystemPanel from './components/SystemPanel';
import { TimeEngine } from './engine/TimeEngine';
import { OrbitEngine } from './engine/OrbitEngine';
import { AstrophenomenaEngine } from './engine/AstrophenomenaEngine';
import { TimeState, ThemeType } from './types/astronomy';
import { translations } from './i18n';

// 可登录行星白名单 (除了气态巨行星以外，具有地表陆壳的岩质行星是最佳观测点)
const LANDABLE_PLANETS = ['earth', 'mercury', 'venus', 'mars', 'moon'];

export default function App() {
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const [selectedPlanetId, setSelectedPlanetId] = useState<string>('earth');
  const [crossSectionActive, setCrossSectionActive] = useState<boolean>(false);
  const [showPlanetInfo, setShowPlanetInfo] = useState<boolean>(true);
  const [useVisualScale, setUseVisualScale] = useState<boolean>(true);

  // 自定义主题
  const [theme, setTheme] = useState<ThemeType>('space-tech');

  // 地面登录观测站参数 (纬度和经度)
  const [landed, setLanded] = useState<boolean>(false);
  const [latitude, setLatitude] = useState<number>(31.23); // 默认上海/中国中纬度 (31° N)
  const [longitude, setLongitude] = useState<number>(121.47); // 默认 121° E

  // 国定星空星座辅助标记开关
  const [showConstellLines, setShowConstellLines] = useState<boolean>(true);
  const [showStarNames, setShowStarNames] = useState<boolean>(true);
  const [magLimit, setMagLimit] = useState<number>(5.5);

  // 望远镜模式（仅在星空模式下生效）
  const [telescopeActive, setTelescopeActive] = useState<boolean>(false);

  // 轨道计算时间基础状态 (默认 43200x 倍速 = 1秒过去12小时，方便直接看出星体位移)
  const [timeState, setTimeState] = useState<TimeState>({
    currentTimestamp: Date.now(),
    speedMultiplier: 43200,
    isPaused: false
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

  // 2. 实时查询公转轨道的 二十四节气 属性
  const daysSinceJ2000 = TimeEngine.getDaysSinceJ2000(timeState.currentTimestamp);
  const solarTermData = AstrophenomenaEngine.getCurrentSolarTerm(daysSinceJ2000);

  // 3. 计算选定行星的实时日地直角坐标 (Heliocentric Coordinates at current J2000 days epoch)
  const helioPos = OrbitEngine.getHeliocentricPosition(selectedPlanetId, daysSinceJ2000, false);

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
          useVisualScale={useVisualScale}
          onToggleVisualScale={setUseVisualScale}
          showConstellLines={showConstellLines}
          onToggleConstellLines={setShowConstellLines}
          showStarNames={showStarNames}
          onToggleStarNames={setShowStarNames}
          magLimit={magLimit}
          onChangeMagLimit={setMagLimit}
          telescopeActive={telescopeActive}
          onToggleTelescope={setTelescopeActive}
          selectedPlanetId={selectedPlanetId}
          onSelectPlanet={handleSelectPlanet}
          onJumpDate={(ts) => setTimeState(prev => ({ ...prev, currentTimestamp: ts }))}
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
            <StarrySkyViewer
              currentTimestamp={timeState.currentTimestamp}
              latitude={latitude}
              longitude={longitude}
              lang={lang}
              showConstellLines={showConstellLines}
              showStarNames={showStarNames}
              magLimit={magLimit}
              telescopeActive={telescopeActive}
              onTelescopeChange={setTelescopeActive}
            />
          ) : (
            <UniverseViewer
              currentTimestamp={timeState.currentTimestamp}
              useVisualScale={useVisualScale}
              setUseVisualScale={setUseVisualScale}
              selectedPlanetId={selectedPlanetId}
              onSelectPlanet={handleSelectPlanet}
              crossSectionActive={crossSectionActive}
              lang={lang}
              showConstellLines={showConstellLines}
              magLimit={magLimit}
            />
          )}
        </div>

        {/* 双系统登录/飞跃功能触发器 — 移至右上角 */}
        {LANDABLE_PLANETS.includes(selectedPlanetId) && (
          <div className="absolute top-5 right-5 z-20">
            <button
              onClick={handleToggleLanding}
              className={`px-4 py-2 text-[11.5px] font-extrabold cursor-pointer border tracking-widest uppercase flex items-center space-x-2 shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 text-white bg-black/80 backdrop-blur-md rounded-lg ${
                landed
                  ? 'border-red-500/40 hover:bg-red-950/45 text-red-400 direct-shadow'
                  : 'border-cyan-500/40 hover:bg-cyan-950/45 text-cyan-400 direct-shadow'
              }`}
              id="btn-login-land-planet"
            >
              <div className={`w-2 h-2 rounded-full absolute -top-1 -right-1 ${landed ? 'bg-red-400 shadow-[0_0_8px_#f87171]' : 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'} animate-pulse`} />
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {landed ? (
                  <>
                    <path d="M12 19V5" /><path d="m5 12 7-7 7 7" /><path d="M19 12H5" />
                  </>
                ) : (
                  <>
                    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
                  </>
                )}
              </svg>
              <span>{landed ? translations[lang].leaveBtn : `${translations[lang].landBtn} (${translations[lang][`${selectedPlanetId}_name` as keyof typeof translations['zh']].split(' ')[0]})`}</span>
            </button>
          </div>
        )}

        {/* 右侧：悬浮天体结构剖析与物理常数面板 (仅在 3D 宇宙模式、且选择特定星球时悬浮在右侧) */}
        {!landed && selectedPlanetId && showPlanetInfo && (
          <div className="absolute top-20 right-5 w-80 max-h-[calc(100vh-180px)] overflow-y-auto bg-black/75 border border-white/10 rounded-2xl p-0 shadow-2xl z-20 backdrop-blur-md hidden md:block select-none animate-in fade-in-0 slide-in-from-right-5 duration-300">
            <PlanetInfoPanel
              planetId={selectedPlanetId}
              crossSectionActive={crossSectionActive}
              onToggleCrossSection={setCrossSectionActive}
              lang={lang}
              onClose={() => setShowPlanetInfo(false)}
            />
          </div>
        )}

        {/* 当面板关闭时，在右侧悬浮一个小巧精致的展开按钮泡泡 */}
        {!landed && selectedPlanetId && !showPlanetInfo && (
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
      </main>

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

      {/* ═══════════════════════════════════════════════════════════════
           BOTTOM: System Panel (collapsible footer replacement)
         ═══════════════════════════════════════════════════════════════ */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
        <SystemPanel
          lang={lang}
          selectedPlanetId={selectedPlanetId}
          helioX={helioPos.x}
          helioY={helioPos.y}
          helioZ={helioPos.z}
        />
      </div>
    </div>
  );
}
