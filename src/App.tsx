/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import UniverseViewer, { SATELLITE_DATA } from './components/UniverseViewer';
import StarrySkyViewer from './components/StarrySkyViewer';
import PlanetInfoPanel from './components/PlanetInfoPanel';
import CelestialControls from './components/CelestialControls';
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

  // 3级联动行星/天然卫星层次构造和变更函数
  const resolveHierarchy = (id: string) => {
    const lowercaseId = id.toLowerCase();
    if (lowercaseId === 'sun') {
      return { level1: 'sun', level2: '', level3: '' };
    }
    
    // 标准行星列表
    const planets = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
    if (planets.includes(lowercaseId)) {
      return { level1: 'planet', level2: lowercaseId, level3: '' };
    }

    // 地球月球映射
    if (lowercaseId === 'moon') {
      return { level1: 'satellite', level2: 'earth', level3: 'moon' };
    }

    // 其他卫星
    for (const parentId of Object.keys(SATELLITE_DATA)) {
      const moons = SATELLITE_DATA[parentId] || [];
      const found = moons.find(m => m.nameEn.toLowerCase() === lowercaseId);
      if (found) {
        return { level1: 'satellite', level2: parentId, level3: found.nameEn };
      }
    }
    
    return { level1: 'planet', level2: 'earth', level3: '' }; // 默认回退
  };

  const getPlanetSatellites = (parentPlanet: string): { nameZh: string, nameEn: string }[] => {
    if (parentPlanet === 'earth') {
      return [{ nameZh: '月球 Moon', nameEn: 'moon' }];
    }
    return SATELLITE_DATA[parentPlanet] || [];
  };

  const resolved = resolveHierarchy(selectedPlanetId);

  const handleLevel1Change = (val: string) => {
    if (val === 'sun') {
      handleSelectPlanet('sun');
    } else if (val === 'planet') {
      handleSelectPlanet('earth');
    } else if (val === 'satellite') {
      handleSelectPlanet('moon');
    }
  };

  const handleLevel2Change = (val: string) => {
    if (resolved.level1 === 'satellite') {
      const moons = getPlanetSatellites(val);
      if (moons.length > 0) {
        handleSelectPlanet(moons[0].nameEn);
      } else {
        handleSelectPlanet(val);
      }
    } else {
      handleSelectPlanet(val);
    }
  };

  const handleLevel3Change = (val: string) => {
    handleSelectPlanet(val);
  };

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

      {/* 顶部导航主信息: 电影感 NASA 高度计式的 64px 极致美感设计 */}
      <header className="relative w-full z-20 h-16 border-b border-white/10 bg-black/60 backdrop-blur-md px-6 flex items-center justify-between gap-4 shadow-2xl shrink-0 select-none">
        
        {/* 左侧 NASA 式旋转雷达和标题 */}
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full border border-cyan-500/30 flex items-center justify-center bg-cyan-950/15">
            <div className="w-4 h-4 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4] animate-pulse"></div>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-widest uppercase flex items-center gap-2">
              <span className="bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
                {translations[lang].title}
              </span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono border ${themeStyle.border} ${themeStyle.accent} uppercase shrink-0 font-normal`}>
                STELLAR v3.5
              </span>
            </h1>
            <p className="text-[9px] text-white/40 tracking-wider font-mono font-medium leading-none mt-0.5 uppercase">
              {translations[lang].subtitle}
            </p>
          </div>
        </div>

        {/* 顶部中央：天体菜单3级联动下拉选项栏 */}
        <div className="hidden lg:flex items-center gap-3 select-none bg-black/40 border border-white/5 px-3 py-1 bg-gradient-to-r from-black/50 via-slate-900/40 to-black/50 rounded-xl">
          {/* Level 1: Category */}
          <div className="flex items-center space-x-1.5 hover:text-white transition-colors">
            <span className="text-[9px] text-white/40 tracking-wider font-semibold uppercase">{lang === 'zh' ? '分类' : 'Type'}</span>
            <select
              value={resolved.level1}
              onChange={(e) => handleLevel1Change(e.target.value)}
              className="bg-[#0b0c10] border border-white/10 hover:border-cyan-500/50 text-white text-[10.5px] rounded-lg px-2.5 py-1 font-semibold focus:outline-none cursor-pointer outline-none transition-colors"
            >
              <option value="sun">{lang === 'zh' ? '☀️ 恒星' : '☀️ Star'}</option>
              <option value="planet">{lang === 'zh' ? '🪐 行星' : '🪐 Planets'}</option>
              <option value="satellite">{lang === 'zh' ? '🛰️ 卫星' : '🛰️ Moons'}</option>
            </select>
          </div>

          {/* Level 2: Parent */}
          {resolved.level1 !== 'sun' && (
            <div className="flex items-center space-x-1.5 animate-in fade-in zoom-in-95 duration-200">
              <span className="text-white/20 select-none">/</span>
              <span className="text-[9px] text-white/40 tracking-wider font-semibold uppercase">{lang === 'zh' ? '主星' : 'Body'}</span>
              <select
                value={resolved.level2}
                onChange={(e) => handleLevel2Change(e.target.value)}
                className="bg-[#0b0c10] border border-white/10 hover:border-cyan-500/50 text-white text-[10.5px] rounded-lg px-2.5 py-1 font-semibold focus:outline-none cursor-pointer outline-none transition-colors"
              >
                {['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']
                  .filter(p => resolved.level1 !== 'satellite' || ['earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'].includes(p))
                  .map((p) => (
                    <option key={p} value={p}>
                      {translations[lang][`${p}_name` as keyof typeof translations['zh']].split(' ')[0]}
                    </option>
                  ))
                }
              </select>
            </div>
          )}

          {/* Level 3: Satellite */}
          {resolved.level1 === 'satellite' && resolved.level2 && (
            <div className="flex items-center space-x-1.5 animate-in fade-in zoom-in-95 duration-200">
              <span className="text-white/20 select-none">/</span>
              <span className="text-[9px] text-white/40 tracking-wider font-semibold uppercase">{lang === 'zh' ? '观测卫' : 'Moon'}</span>
              <select
                value={resolved.level3}
                onChange={(e) => handleLevel3Change(e.target.value)}
                className="bg-[#0b0c10] border border-white/10 hover:border-cyan-500/50 text-white text-[10.5px] rounded-lg px-2.5 py-1 font-semibold focus:outline-none cursor-pointer outline-none transition-colors"
              >
                {getPlanetSatellites(resolved.level2).map((sat) => (
                  <option key={sat.nameEn} value={sat.nameEn}>
                    {lang === 'zh' ? sat.nameZh.split(' ')[0] : sat.nameEn}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 右上角：4种预设主题切换选择和尺度模式 */}
        <div className="flex items-center space-x-4 select-none text-[11px] font-mono">

          {/* 星空模式专属：望远镜切换按钮 */}
          {landed && (
            <button
              onClick={() => setTelescopeActive(v => !v)}
              title={lang === 'zh' ? '望远镜模式' : 'Telescope Mode'}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[9.5px] font-bold uppercase tracking-wider cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 ${
                telescopeActive
                  ? 'bg-cyan-500/20 border-cyan-500/70 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.35)]'
                  : 'bg-black/30 border-white/10 text-white/50 hover:border-cyan-500/40 hover:text-cyan-400'
              }`}
              id="btn-telescope-toggle"
            >
              <span className="text-base leading-none">🔭</span>
              <span className="hidden sm:inline">{lang === 'zh' ? '望远镜' : 'Telescope'}</span>
              {telescopeActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee] animate-pulse" />}
            </button>
          )}

          {/* 仅宇宙模式显示视觉比例优化 */}
          {!landed && (
            <label className="flex items-center space-x-1.5 text-white/50 hover:text-white cursor-pointer select-none">
              <input 
                type="checkbox"
                checked={useVisualScale}
                onChange={(e) => setUseVisualScale(e.target.checked)}
                className="rounded accent-cyan-500 cursor-pointer w-3.5 h-3.5"
              />
              <span className="text-[9.5px] uppercase tracking-wider">
                {lang === 'zh' ? '视觉比例优化' : 'Optimize Scale'}
              </span>
            </label>
          )}

          <span className="text-white/10">|</span>

          {/* 主题选择圈 */}
          <div className="flex items-center space-x-1.5 bg-black/20 px-2 py-1 border border-white/5 rounded-lg">
            <span className="text-[9px] text-white/30 uppercase font-bold tracking-widest">{translations[lang].themeSelect}:</span>
            <button 
              onClick={() => setTheme('space-tech')}
              className={`w-3.5 h-3.5 rounded-full bg-cyan-500 border cursor-pointer border-transparent transition-all hover:scale-110 ${theme === 'space-tech' ? 'ring-2 ring-white scale-110' : ''}`}
              title={translations[lang].themeTech}
            />
            <button 
              onClick={() => setTheme('cosmic-dark')}
              className={`w-3.5 h-3.5 rounded-full bg-amber-500 border cursor-pointer border-transparent transition-all hover:scale-110 ${theme === 'cosmic-dark' ? 'ring-2 ring-white scale-110' : ''}`}
              title={translations[lang].themeDark}
            />
            <button 
              onClick={() => setTheme('neon-hologram')}
              className={`w-3.5 h-3.5 rounded-full bg-fuchsia-500 border cursor-pointer border-transparent transition-all hover:scale-110 ${theme === 'neon-hologram' ? 'ring-2 ring-white scale-110' : ''}`}
              title={translations[lang].themeNeon}
            />
            <button 
              onClick={() => setTheme('solar-gold')}
              className={`w-3.5 h-3.5 rounded-full bg-orange-500 border cursor-pointer border-transparent transition-all hover:scale-110 ${theme === 'solar-gold' ? 'ring-2 ring-white scale-110' : ''}`}
              title={translations[lang].themeGold}
            />
          </div>
        </div>
      </header>

      {/* 针对非大屏，快速天体浮动菜单（3级联动下拉菜单模式） */}
      <div className="lg:hidden flex items-center justify-center gap-2 p-2 bg-black/50 border-b border-white/10 z-10 text-[11px]">
        <select
          value={resolved.level1}
          onChange={(e) => handleLevel1Change(e.target.value)}
          className="bg-stone-900 border border-stone-800 text-slate-200 text-[10.5px] rounded-lg px-2 py-1 font-bold focus:outline-none cursor-pointer outline-none"
        >
          <option value="sun">{lang === 'zh' ? '☀️ 恒星' : '☀️ Star'}</option>
          <option value="planet">{lang === 'zh' ? '🪐 行星' : '🪐 Planets'}</option>
          <option value="satellite">{lang === 'zh' ? '🛰️ 卫星' : '🛰️ Moons'}</option>
        </select>

        {resolved.level1 !== 'sun' && (
          <select
            value={resolved.level2}
            onChange={(e) => handleLevel2Change(e.target.value)}
            className="bg-stone-900 border border-stone-800 text-slate-200 text-[10.5px] rounded-lg px-2 py-1 font-bold focus:outline-none cursor-pointer outline-none"
          >
            {['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']
              .filter(p => resolved.level1 !== 'satellite' || ['earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'].includes(p))
              .map((p) => (
                <option key={p} value={p}>
                  {translations[lang][`${p}_name` as keyof typeof translations['zh']].split(' ')[0]}
                </option>
              ))
            }
          </select>
        )}

        {resolved.level1 === 'satellite' && resolved.level2 && (
          <select
            value={resolved.level3}
            onChange={(e) => handleLevel3Change(e.target.value)}
            className="bg-stone-900 border border-stone-800 text-slate-200 text-[10.5px] rounded-lg px-2 py-1 font-bold focus:outline-none cursor-pointer outline-none"
          >
            {getPlanetSatellites(resolved.level2).map((sat) => (
              <option key={sat.nameEn} value={sat.nameEn}>
                {lang === 'zh' ? sat.nameZh.split(' ')[0] : sat.nameEn}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* 主画布模拟视界 - 全屏拉伸 */}
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

        {/* 双系统登录/飞跃功能触发器 */}
        {LANDABLE_PLANETS.includes(selectedPlanetId) && (
          <div className="absolute top-6 left-6 z-20">
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
              <span>{landed ? '🛸' : '🛰️'}</span>
              <span>{landed ? translations[lang].leaveBtn : `${translations[lang].landBtn} (${translations[lang][`${selectedPlanetId}_name` as keyof typeof translations['zh']].split(' ')[0]})`}</span>
            </button>
          </div>
        )}

        {/* 右侧：悬浮天体结构剖析与物理常数面板 (仅在 3D 宇宙模式、且选择特定星球时悬浮在右侧) */}
        {!landed && selectedPlanetId && showPlanetInfo && (
          <div className="absolute top-6 right-6 w-80 max-h-[calc(100vh-180px)] overflow-y-auto bg-black/75 border border-white/10 rounded-2xl p-0 shadow-2xl z-20 backdrop-blur-md hidden md:block select-none animate-in fade-in-0 slide-in-from-right-5 duration-300">
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
            className="absolute top-6 right-6 z-20 w-10 h-10 flex items-center justify-center bg-black/80 hover:bg-black border border-white/10 hover:border-cyan-500/50 text-cyan-400 hover:text-white rounded-xl shadow-2xl backdrop-blur-md cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 text-sm animate-in zoom-in-90"
            id="btn-reopen-planet-info"
            title={lang === 'zh' ? '展开星体介绍' : 'Open Planet Info'}
          >
            📋
          </button>
        )}

        {/* 底部横盘：综合时间流速和地理坐标控制器 - 升级为优雅悬浮控制台 HUD */}
        <section className="absolute bottom-12 left-6 z-20 max-w-[95%] w-fit pointer-events-auto">
          <div className="flex flex-col md:flex-row gap-4 items-stretch justify-start">
            <CelestialControls 
              timeState={timeState}
              onChangeTimeState={(part) => setTimeState(prev => ({ ...prev, ...part }))}
              lang={lang}
              onChangeLang={setLang}
              landed={landed}
              latitude={latitude}
              longitude={longitude}
              onChangeLocation={(lat, lng) => {
                setLatitude(lat);
                setLongitude(lng);
              }}
              showConstellLines={showConstellLines}
              onToggleConstellLines={setShowConstellLines}
              showStarNames={showStarNames}
              onToggleStarNames={setShowStarNames}
              magLimit={magLimit}
              onChangeMagLimit={setMagLimit}
              onJumpDate={(ts) => setTimeState(prev => ({ ...prev, currentTimestamp: ts }))}
              currentSolarTermNameKey={solarTermData.current.nameKey}
              nextSolarTermNameKey={solarTermData.next.nameKey}
            />

            {/* 手机端/小屏下的行星信息折叠浮卡 */}
            {!landed && selectedPlanetId && showPlanetInfo && (
              <div className="block md:hidden max-w-sm pointer-events-auto">
                <PlanetInfoPanel 
                  planetId={selectedPlanetId}
                  crossSectionActive={crossSectionActive}
                  onToggleCrossSection={setCrossSectionActive}
                  lang={lang}
                  onClose={() => setShowPlanetInfo(false)}
                />
              </div>
            )}
            
            {/* 登录星空仪表说明词卡 */}
            {landed && (
              <div className="hidden md:flex flex-col justify-between w-80 bg-black/75 p-4 border border-white/10 rounded-2xl backdrop-blur-md shadow-2xl pointer-events-auto select-none">
                <div className="space-y-1.5 text-xs text-slate-300">
                  <h4 className="text-cyan-400 font-bold font-mono tracking-wider flex items-center space-x-1.5 uppercase">
                    <span>🛰️</span>
                    <span>{translations[lang].landingTitle}</span>
                  </h4>
                  <p className="leading-relaxed text-[10.5px] text-white/70">
                    {translations[lang].landingInstructions}
                  </p>
                </div>
                <div className="text-[9.5px] p-2 bg-[#050608]/80 font-mono border border-white/5 rounded-lg text-white/50 mt-2">
                  LAT/LONG {latitude > 0 ? `N${latitude}` : `S${Math.abs(latitude)}`} | {longitude > 0 ? `E${longitude}` : `W${Math.abs(longitude)}`}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* 底部系统状态栏: Telemetry and GPU Accelerations - 悬浮在最底层以不阻碍交互 */}
      <footer className="absolute bottom-0 left-0 right-0 h-8 bg-black/40 border-t border-white/5 flex items-center justify-between px-6 z-20 select-none text-[10px] uppercase font-mono tracking-widest text-white/40 pointer-events-none">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]"></div>
            <span className="text-[9.5px]">{lang === 'zh' ? '渲染引擎: Three.js WebGL/GPU 加速' : 'RENDERER: WebGL GPU ACCELERATED'}</span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-white/20">|</span>
            <span className="text-[9.5px]">{lang === 'zh' ? '视角锁定:' : 'VIEW LOCK:'} {selectedPlanetId}</span>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="text-white/20">|</span>
            <span className="text-[9.5px]">{lang === 'zh' ? '节气精度: 高分辨率解析' : 'ORBIT RESOLUTION: DEEP NASA CALIBRATED'}</span>
          </div>
        </div>

        {/* 物理笛卡尔实时三维坐标：由 J2000 克卜勒轨道解析引擎动态生成！ */}
        <div className="flex items-center gap-4 text-cyan-400 text-[9.5px] font-mono select-all pointer-events-auto">
          <span className="text-white/30 lowercase italic">{lang === 'zh' ? '日地轨道' : 'Heliocentric'} [j2000] COORDS:</span>
          <span>X: {helioPos.x.toFixed(4)} AU</span>
          <span>Y: {helioPos.y.toFixed(4)} AU</span>
          <span>Z: {helioPos.z.toFixed(4)} AU</span>
        </div>
      </footer>
    </div>
  );
}
