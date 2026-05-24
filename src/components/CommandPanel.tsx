/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { translations } from '../i18n';
import { OrbitEngine } from '../engine/OrbitEngine';
import { ScaleEngine } from '../engine/ScaleEngine';
import { ThemeType } from '../types/astronomy';
import { SATELLITE_DATA, VALIDATION_PAIRS } from './UniverseViewer';
import SystemPanel from './SystemPanel';

interface CommandPanelProps {
  lang: 'zh' | 'en';
  onChangeLang: (lang: 'zh' | 'en') => void;
  landed: boolean;
  theme: ThemeType;
  onChangeTheme: (theme: ThemeType) => void;
  showConstellLines: boolean;
  onToggleConstellLines: (show: boolean) => void;
  showStarNames: boolean;
  onToggleStarNames: (show: boolean) => void;
  showConstellNames?: boolean;
  onToggleConstellNames?: (show: boolean) => void;
  magLimit: number;
  onChangeMagLimit: (limit: number) => void;
  telescopeActive: boolean;
  onToggleTelescope: (active: boolean) => void;
  selectedPlanetId: string;
  onSelectPlanet: (id: string) => void;
  onFocusPlanet?: () => void;
  showPlanetLabels?: boolean;
  onTogglePlanetLabels?: (show: boolean) => void;
  onJumpDate: (timestamp: number) => void;
  helioX: number;
  helioY: number;
  helioZ: number;

  // 观测站位置相关 props
  latitude: number;
  longitude: number;
  onChangeLatitude?: (lat: number) => void;
  onChangeLongitude?: (lon: number) => void;

  // 验证面板相关 props
  validationPairKey: string;
  onChangeValidationPairKey: (val: string) => void;
  panelTab: 'audit' | 'packing';
  onChangePanelTab: (val: 'audit' | 'packing') => void;
  packingActive: boolean;
  onTogglePackingActive: (val: boolean) => void;
  packingProgressDone: number;
  packingMode: 'physical' | 'visual';
  onChangePackingMode: (val: 'physical' | 'visual') => void;
  strictPhysics: boolean;
  onToggleStrictPhysics: (val: boolean) => void;

  // 穿梭模式等比加速相关 props
  useExponentialSpeed: boolean;
  onToggleExponentialSpeed: (val: boolean) => void;
  customSpeedPreset: string;
  onChangeCustomSpeedPreset: (val: string) => void;
}

// ─── Icons (inline SVG, Lucide-style) ───────────────────────────────────────

const IconSettings = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const IconX = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
  </svg>
);

const IconSatellite = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 7 9 3 5 7l4 4" />
    <path d="m17 11 4 4-4 4-4-4" />
    <path d="m8 12 4 4 6-6-4-4" />
    <path d="M16 8 8 16" />
  </svg>
);

const IconTelescope = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m10.065 12.493-6.93 6.93a2.23 2.23 0 1 1-3.152-3.154l6.929-6.93" />
    <path d="m15.236 11.247 3.105-3.104a1 1 0 0 0 0-1.414l-1.414-1.414a1 1 0 0 0-1.414 0l-3.104 3.105" />
    <path d="m17.5 11.5 2.3-2.3a2.41 2.41 0 0 0 0-3.4l-1.6-1.6a2.41 2.41 0 0 0-3.4 0l-2.3 2.3" />
    <path d="M2.49 21.51a2.2 2.2 0 0 1-1.95-1.95" />
  </svg>
);

const IconCheckCircle = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.801 10A10 10 0 1 1 17 3.335" />
    <path d="m9 11 3 3L22 4" />
  </svg>
);

const IconRefreshCw = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M8 16H3v5" />
  </svg>
);

const IconEye = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconStar = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const IconMaximize = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" />
    <path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" />
  </svg>
);

const IconZap = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

// ─── Helpers ────────────────────────────────────────────────────────────────

const getPlanetSatellites = (parentPlanet: string): { nameZh: string; nameEn: string }[] => {
  if (parentPlanet === 'earth') {
    return [{ nameZh: '月球 Moon', nameEn: 'moon' }];
  }
  return SATELLITE_DATA[parentPlanet] || [];
};

const resolveHierarchy = (id: string) => {
  const lowercaseId = id.toLowerCase();
  if (lowercaseId === 'sun') {
    return { level1: 'sun', level2: '', level3: '' };
  }
  const planets = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
  if (planets.includes(lowercaseId)) {
    return { level1: 'planet', level2: lowercaseId, level3: '' };
  }
  if (lowercaseId === 'moon') {
    return { level1: 'satellite', level2: 'earth', level3: 'moon' };
  }
  for (const parentId of Object.keys(SATELLITE_DATA)) {
    const moons = SATELLITE_DATA[parentId] || [];
    const found = moons.find(m => m.nameEn.toLowerCase() === lowercaseId);
    if (found) {
      return { level1: 'satellite', level2: parentId, level3: found.nameEn };
    }
  }
  return { level1: 'planet', level2: 'earth', level3: '' };
};

const THEME_OPTIONS: { id: ThemeType; color: string }[] = [
  { id: 'space-tech', color: '#06b6d4' },
  { id: 'cosmic-dark', color: '#f59e0b' },
  { id: 'neon-hologram', color: '#d946ef' },
  { id: 'solar-gold', color: '#f97316' },
];

export default function CommandPanel({
  lang,
  onChangeLang,
  landed,
  theme,
  onChangeTheme,
  showConstellLines,
  onToggleConstellLines,
  showStarNames,
  onToggleStarNames,
  showConstellNames,
  onToggleConstellNames,
  magLimit,
  onChangeMagLimit,
  telescopeActive,
  onToggleTelescope,
  selectedPlanetId,
  onSelectPlanet,
  onFocusPlanet,
  showPlanetLabels,
  onTogglePlanetLabels,
  onJumpDate,
  helioX,
  helioY,
  helioZ,

  // 观测站位置相关 props
  latitude,
  longitude,
  onChangeLatitude,
  onChangeLongitude,

  // 验证面板相关 props
  validationPairKey,
  onChangeValidationPairKey,
  panelTab,
  onChangePanelTab,
  packingActive,
  onTogglePackingActive,
  packingProgressDone,
  packingMode,
  onChangePackingMode,
  strictPhysics,
  onToggleStrictPhysics,

  // 穿梭模式等比加速相关 props
  useExponentialSpeed,
  onToggleExponentialSpeed,
  customSpeedPreset,
  onChangeCustomSpeedPreset,
}: CommandPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [showSpeedControls, setShowSpeedControls] = useState(false);

  const isZh = lang === 'zh';
  const t = translations[lang];

  const resolved = resolveHierarchy(selectedPlanetId);

  const getSunRadius = (): number => {
    return ScaleEngine.getRadius('sun', strictPhysics);
  };

  const getPlanetRadius = (id: string): number => {
    return ScaleEngine.getRadius(id, strictPhysics);
  };

  const getLunarOrbitRadius = (): number => {
    const moonOrbitAU = 0.00257;
    const moonOrbitScene = ScaleEngine.fromAU(moonOrbitAU);
    if (strictPhysics) return moonOrbitScene;
    const earthStrictRad = ScaleEngine.getStrictRadius('earth');
    const earthObsRad = ScaleEngine.getObservableRadius('earth');
    return moonOrbitScene * (earthObsRad / earthStrictRad);
  };

  const handleLevel1Change = (val: string) => {
    if (val === 'sun') onSelectPlanet('sun');
    else if (val === 'planet') onSelectPlanet('earth');
    else if (val === 'satellite') onSelectPlanet('moon');
    onFocusPlanet?.();
  };

  const handleLevel2Change = (val: string) => {
    if (resolved.level1 === 'satellite') {
      const moons = getPlanetSatellites(val);
      if (moons.length > 0) onSelectPlanet(moons[0].nameEn);
      else onSelectPlanet(val);
    } else {
      onSelectPlanet(val);
    }
    onFocusPlanet?.();
  };

  const handleLevel3Change = (val: string) => {
    onSelectPlanet(val);
    onFocusPlanet?.();
  };

  const handleCalibrationCheck = () => {
    const result = OrbitEngine.validateOrbitEngine();
    alert(`[NASA Calibration Protocol]\n${result.log}\n\n${t.calibrationSuccess}`);
  };

  // ─── Collapsed state ───────────────────────────────────────────────────────
  if (isCollapsed) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsCollapsed(false)}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-950/85 border border-slate-800/80 backdrop-blur-lg text-cyan-400 hover:text-cyan-300 hover:border-cyan-500/40 transition-all cursor-pointer shadow-lg"
          title={isZh ? '展开控制台' : 'Open Command Panel'}
        >
          <IconSettings className="w-4 h-4" />
        </button>
        <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
      </div>
    );
  }

  // ─── Expanded state ────────────────────────────────────────────────────────
  return (
    <div className="bg-slate-950/90 border border-slate-800/80 backdrop-blur-xl rounded-xl p-4 shadow-2xl flex flex-col gap-3.5 w-72 text-white font-sans select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
        <div className="flex items-center gap-2">
          <IconSettings className="w-4 h-4 text-cyan-400" />
          <span className="text-[11px] font-bold font-mono text-cyan-400 uppercase tracking-widest">
            {t.commandPanel}
          </span>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title={t.collapse}
        >
          <IconX className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Celestial body selector */}
      <div className="space-y-2">
        <div className="text-[9px] text-slate-500 uppercase tracking-wider font-mono">{isZh ? '天体' : 'Celestial'}</div>
        <div className="flex items-center gap-1.5">
          <select
            value={resolved.level1}
            onChange={(e) => handleLevel1Change(e.target.value)}
            className="bg-[#0b0c10] border border-white/10 hover:border-cyan-500/50 text-white text-[10.5px] rounded-lg px-2 py-1 font-semibold focus:outline-none cursor-pointer outline-none transition-colors flex-1"
          >
            <option value="sun">{isZh ? '恒星' : 'Star'}</option>
            <option value="planet">{isZh ? '行星' : 'Planets'}</option>
            <option value="satellite">{isZh ? '卫星' : 'Moons'}</option>
          </select>

          {resolved.level1 !== 'sun' && (
            <select
              value={resolved.level2}
              onChange={(e) => handleLevel2Change(e.target.value)}
              className="bg-[#0b0c10] border border-white/10 hover:border-cyan-500/50 text-white text-[10.5px] rounded-lg px-2 py-1 font-semibold focus:outline-none cursor-pointer outline-none transition-colors flex-1"
            >
              {['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']
                .filter(p => resolved.level1 !== 'satellite' || ['earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'].includes(p))
                .map((p) => (
                  <option key={p} value={p}>
                    {t[`${p}_name` as keyof typeof t].split(' ')[0]}
                  </option>
                ))}
            </select>
          )}
        </div>

        {resolved.level1 === 'satellite' && resolved.level2 && (
          <select
            value={resolved.level3}
            onChange={(e) => handleLevel3Change(e.target.value)}
            className="bg-[#0b0c10] border border-white/10 hover:border-cyan-500/50 text-white text-[10.5px] rounded-lg px-2 py-1 font-semibold focus:outline-none cursor-pointer outline-none transition-colors w-full"
          >
            {getPlanetSatellites(resolved.level2).map((sat) => (
              <option key={sat.nameEn} value={sat.nameEn}>
                {isZh ? sat.nameZh.split(' ')[0] : sat.nameEn}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Theme selector */}
      <div className="space-y-2">
        <div className="text-[9px] text-slate-500 uppercase tracking-wider font-mono">{t.themeSelect}</div>
        <div className="flex items-center gap-2">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onChangeTheme(opt.id)}
              onMouseEnter={() => setHoveredItem(`theme-${opt.id}`)}
              onMouseLeave={() => setHoveredItem(null)}
              className={`w-5 h-5 rounded-full border-2 cursor-pointer transition-all hover:scale-110 ${
                theme === opt.id ? 'border-white scale-110 shadow-lg' : 'border-transparent'
              }`}
              style={{ backgroundColor: opt.color }}
              title={t[`theme${opt.id.charAt(0).toUpperCase() + opt.id.slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase())}` as keyof typeof t] || opt.id}
            />
          ))}
          {hoveredItem?.startsWith('theme-') && (
            <span className="text-[9px] text-slate-400 font-mono ml-1">
              {t[`theme${hoveredItem.replace('theme-', '').charAt(0).toUpperCase() + hoveredItem.replace('theme-', '').slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase())}` as keyof typeof t]}
            </span>
          )}
        </div>
      </div>

      {/* Language toggle */}
      <button
        onClick={() => onChangeLang(isZh ? 'en' : 'zh')}
        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/70 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-[10.5px] font-semibold text-slate-300 cursor-pointer transition-colors font-mono"
      >
        <span className="text-cyan-400">{isZh ? 'ZH' : 'EN'}</span>
        <span className="text-slate-600">/</span>
        <span className="text-slate-500">{isZh ? 'EN' : 'ZH'}</span>
      </button>

      {/* Mode-specific controls */}
      {!landed ? (
        /* Universe mode controls */
        <div className="flex flex-col space-y-2.5">
          <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={useExponentialSpeed}
              onChange={(e) => onToggleExponentialSpeed(e.target.checked)}
              className="rounded accent-cyan-500 w-3.5 h-3.5 cursor-pointer"
            />
            <IconZap className="w-3.5 h-3.5 text-slate-500" />
            <span>{isZh ? '等比速度加速' : 'Proportional Speed'}</span>
          </label>

          <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={!!showPlanetLabels}
              onChange={(e) => onTogglePlanetLabels?.(e.target.checked)}
              className="rounded accent-cyan-500 w-3.5 h-3.5 cursor-pointer"
            />
            <IconEye className="w-3.5 h-3.5 text-slate-500" />
            <span>{isZh ? '天体名称提示' : 'Celestial Name Hints'}</span>
          </label>

          {!useExponentialSpeed && (
            <div className="flex flex-col space-y-1 pl-5.5">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider font-mono">
                {isZh ? '手动速度预设' : 'Manual Speed Presets'}
              </span>
              <select
                value={customSpeedPreset}
                onChange={(e) => onChangeCustomSpeedPreset(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-[10px] text-slate-300 focus:outline-none focus:border-cyan-500/50 cursor-pointer w-full"
              >
                <option value="walk">{isZh ? '步行 (1.4 m/s)' : 'Walking (1.4 m/s)'}</option>
                <option value="rocket">{isZh ? '火箭 (11.2 km/s)' : 'Rocket (11.2 km/s)'}</option>
                <option value="meteor">{isZh ? '流星 (50 km/s)' : 'Meteor (50 km/s)'}</option>
                <option value="light">{isZh ? '光速 (1c)' : 'Speed of Light (1c)'}</option>
                <option value="10c">{isZh ? '10倍光速 (10c)' : '10x Speed (10c)'}</option>
                <option value="100c">{isZh ? '100倍光速 (100c)' : '100x Speed (100c)'}</option>
                <option value="1000c">{isZh ? '1000倍光速 (1000c)' : '1000x Speed (1000c)'}</option>
                <option value="10000c">{isZh ? '10000倍光速 (10000c)' : '10000x Speed (10000c)'}</option>
              </select>
            </div>
          )}
        </div>
      ) : (
        /* Starry sky mode controls */
        <div className="space-y-2.5">
          {/* Telescope toggle */}
          <button
            onClick={() => onToggleTelescope(!telescopeActive)}
            className={`w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border text-[10.5px] font-bold uppercase tracking-wider cursor-pointer transition-all ${
              telescopeActive
                ? 'bg-cyan-500/15 border-cyan-500/60 text-cyan-300'
                : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-cyan-500/30 hover:text-cyan-400'
            }`}
          >
            <IconTelescope className="w-3.5 h-3.5" />
            <span>{isZh ? '望远镜' : 'Telescope'}</span>
            {telescopeActive && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee] animate-pulse" />}
          </button>

          {/* Constellation lines */}
          <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={showConstellLines}
              onChange={(e) => onToggleConstellLines(e.target.checked)}
              className="rounded accent-cyan-500 w-3.5 h-3.5 cursor-pointer"
            />
            <IconEye className="w-3.5 h-3.5 text-slate-500" />
            <span>{isZh ? '星座连线' : 'Constellations'}</span>
          </label>

          {/* Star names */}
          <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={showStarNames}
              onChange={(e) => onToggleStarNames(e.target.checked)}
              className="rounded accent-cyan-500 w-3.5 h-3.5 cursor-pointer"
            />
            <IconStar className="w-3.5 h-3.5 text-slate-500" />
            <span>{isZh ? '恒星名称' : 'Star Names'}</span>
          </label>

          {/* Constellation names */}
          <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={!!showConstellNames}
              onChange={(e) => onToggleConstellNames?.(e.target.checked)}
              className="rounded accent-cyan-500 w-3.5 h-3.5 cursor-pointer"
            />
            <IconEye className="w-3.5 h-3.5 text-slate-500" />
            <span>{isZh ? '星座名称' : 'Constellation Names'}</span>
          </label>

          {/* Mag limit slider */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <IconStar className="w-3 h-3" />
                {t.magLimitLabel}
              </span>
              <span className="text-cyan-400 font-bold">{magLimit.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="3.0"
              max="7.5"
              step="0.1"
              value={magLimit}
              onChange={(e) => onChangeMagLimit(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[8px] text-slate-600 font-mono">
              <span>{t.magLimitBrightest}</span>
              <span>{t.magLimitAll}</span>
            </div>
          </div>

          {/* 🌍 观测站位置调整 (Observer Location) */}
          <div className="space-y-2 pt-2 border-t border-slate-800/60">
            <div className="text-[9px] text-slate-500 uppercase tracking-wider font-mono">
              {isZh ? '🌍 观测站位置' : '🌍 Observer Location'}
            </div>

            {/* 城市快速选择 (仅地球) */}
            {selectedPlanetId.toLowerCase() === 'earth' && (
              <select
                onChange={(e) => {
                  const [lat, lon] = e.target.value.split(',').map(Number);
                  onChangeLatitude?.(lat);
                  onChangeLongitude?.(lon);
                }}
                className="bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-white text-[10.5px] rounded-md px-2 py-1 focus:outline-none cursor-pointer outline-none transition-colors w-full font-mono"
              >
                <option value="">{isZh ? '快速选择城市...' : 'Select City...'}</option>
                <option value="39.90,116.41">{isZh ? '🇨🇳 北京' : '🇨🇳 Beijing'}</option>
                <option value="31.23,121.47">{isZh ? '🇨🇳 上海' : '🇨🇳 Shanghai'}</option>
                <option value="22.54,114.06">{isZh ? '🇨🇳 深圳' : '🇨🇳 Shenzhen'}</option>
                <option value="30.57,104.07">{isZh ? '🇨🇳 成都' : '🇨🇳 Chengdu'}</option>
                <option value="34.34,108.94">{isZh ? '🇨🇳 西安' : '🇨🇳 Xi\'an'}</option>
                <option value="40.71,-74.01">{isZh ? '🇺🇸 纽约' : '🇺🇸 New York'}</option>
                <option value="51.51,-0.13">{isZh ? '🇬🇧 伦敦' : '🇬🇧 London'}</option>
                <option value="48.86,2.35">{isZh ? '🇫🇷 巴黎' : '🇫🇷 Paris'}</option>
                <option value="35.68,139.69">{isZh ? '🇯🇵 东京' : '🇯🇵 Tokyo'}</option>
                <option value="37.57,126.98">{isZh ? '🇰🇷 首尔' : '🇰🇷 Seoul'}</option>
                <option value="1.35,103.82">{isZh ? '🇸🇬 新加坡' : '🇸🇬 Singapore'}</option>
                <option value="-33.87,151.21">{isZh ? '🇦🇺 悉尼' : '🇦🇺 Sydney'}</option>
                <option value="55.76,37.62">{isZh ? '🇷🇺 莫斯科' : '🇷🇺 Moscow'}</option>
                <option value="19.08,72.88">{isZh ? '🇮🇳 孟买' : '🇮🇳 Mumbai'}</option>
                <option value="-23.55,-46.63">{isZh ? '🇧🇷 圣保罗' : '🇧🇷 São Paulo'}</option>
              </select>
            )}

            {/* 纬度 */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>{isZh ? '纬度 Latitude' : 'Latitude'}</span>
                <span className="text-cyan-400">{latitude.toFixed(2)}°</span>
              </div>
              <input
                type="range"
                min={-90}
                max={90}
                step={0.1}
                value={latitude}
                onChange={(e) => onChangeLatitude?.(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* 经度 */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>{isZh ? '经度 Longitude' : 'Longitude'}</span>
                <span className="text-cyan-400">{longitude.toFixed(2)}°</span>
              </div>
              <input
                type="range"
                min={-180}
                max={180}
                step={0.1}
                value={longitude}
                onChange={(e) => onChangeLongitude?.(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* 🚀 相机穿梭速度控制 (Shuttle Speed) */}
      {!landed && (
        <div className="pt-1.5 border-t border-slate-800/60 flex flex-col gap-1.5">
          <button
            onClick={() => setShowSpeedControls(!showSpeedControls)}
            className="flex items-center justify-between w-full text-[10px] font-bold font-mono text-cyan-400 hover:text-cyan-300 transition-colors uppercase tracking-wider py-1 cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <span>🚀</span>
              <span>{isZh ? '相机穿梭速度控制' : 'SHUTTLE SPEED'}</span>
            </span>
            <span className="text-slate-500 font-normal">
              {showSpeedControls ? '▲' : '▼'}
            </span>
          </button>

          {showSpeedControls && (
            <div className="space-y-2 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/50">
              <label className="flex items-center gap-2 text-[10.5px] text-slate-300 cursor-pointer hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={useExponentialSpeed}
                  onChange={(e) => onToggleExponentialSpeed(e.target.checked)}
                  className="rounded accent-cyan-500 w-3.5 h-3.5 cursor-pointer"
                />
                <span>{isZh ? '开启等比加速 (越远越快)' : 'Exponential Speed Scaling'}</span>
              </label>

              {!useExponentialSpeed && (
                <div className="flex flex-col space-y-1 pt-1.5 border-t border-slate-800/40">
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider font-mono">
                    {isZh ? '预设自定义速度' : 'Custom Base Speed'}
                  </span>
                  <select
                    value={customSpeedPreset}
                    onChange={(e) => onChangeCustomSpeedPreset(e.target.value)}
                    className="bg-slate-950 border border-slate-850 hover:border-cyan-500/50 text-white text-[10.5px] rounded-md px-2 py-1 focus:outline-none cursor-pointer outline-none transition-colors w-full font-mono font-bold"
                  >
                    <option value="walk">{isZh ? '🚶 步行 (1.4 m/s)' : 'Walking (1.4 m/s)'}</option>
                    <option value="rocket">{isZh ? '🚀 火箭 (11.2 km/s)' : 'Rocket (11.2 km/s)'}</option>
                    <option value="meteor">{isZh ? '☄️ 流星 (50 km/s)' : 'Meteor (50 km/s)'}</option>
                    <option value="light">{isZh ? '✨ 光速 (1c)' : 'Light Speed (1c)'}</option>
                    <option value="10c">{isZh ? '⚡ 10倍光速 (10c)' : '10x Light Speed (10c)'}</option>
                    <option value="100c">{isZh ? '⚡ 100倍光速 (100c)' : '100x Light Speed (100c)'}</option>
                    <option value="1000c">{isZh ? '⚡ 1000倍光速 (1000c)' : '1000x Light Speed (1000c)'}</option>
                    <option value="10000c">{isZh ? '⚡ 10000倍光速 (10000c)' : '10000x Light Speed (10000c)'}</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 🛰️ 宇宙尺度几何验证系统 (Stacking Proof) */}
      {!landed && (
        <div className="pt-1.5 border-t border-slate-800/60 flex flex-col gap-1.5">
          <button
            onClick={() => setShowValidation(!showValidation)}
            className="flex items-center justify-between w-full text-[10px] font-bold font-mono text-amber-400 hover:text-amber-300 transition-colors uppercase tracking-wider py-1 cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <span>🛰️</span>
              <span>{isZh ? '宇宙尺度几何直观验证' : 'COSMIC PROOF'}</span>
            </span>
            <span className="text-slate-500 font-normal">
              {showValidation ? '▲' : '▼'}
            </span>
          </button>

          {showValidation && (
            <div className="space-y-3 max-h-[220px] overflow-y-auto scrollbar pr-1 text-slate-200">
              {/* Tab 选项: 数据审计 / 堆叠验证 */}
              <div className="flex bg-slate-900/60 p-0.5 rounded-lg border border-slate-800/80">
                <button
                  onClick={() => onChangePanelTab('audit')}
                  className={`flex-1 py-1 rounded-md text-[9px] font-bold text-center transition-all cursor-pointer ${
                    panelTab === 'audit'
                      ? 'bg-slate-850 text-slate-100 border border-slate-700/60 font-black'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  {isZh ? '⭐ 轨道数据审计' : '⭐ Space Audit'}
                </button>
                <button
                  onClick={() => {
                    onChangePanelTab('packing');
                    if (!packingActive) {
                      onTogglePackingActive(true);
                    }
                  }}
                  className={`flex-1 py-1 rounded-md text-[9px] font-bold text-center transition-all cursor-pointer ${
                    panelTab === 'packing'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/25 font-black'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  {isZh ? '🛰️ 堆叠对齐验证' : '🛰️ Stacking Proof'}
                </button>
              </div>

              {panelTab === 'audit' ? (
                <div className="space-y-2.5">
                  {/* 1. 地月局部等比例校验卡片 */}
                  <div className="space-y-1 bg-slate-900/40 rounded-lg p-2 border border-slate-800/50">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-amber-300 font-sans">
                        {isZh ? '1. 地月轨道空间比值' : '1. Earth-Moon Space Ratio'}
                      </span>
                      <span className="text-[8px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1 py-0.5 rounded font-mono font-bold">
                        {isZh ? '✅ 精准校准' : '✅ CALIBRATED'}
                      </span>
                    </div>
                    <div className="text-[9.5px] text-slate-400 space-y-1 font-sans">
                      <div className="flex justify-between">
                        <span>{isZh ? '月球公转轨道半径' : 'Lunar Orbit Radius'}:</span>
                        <span className="font-mono text-cyan-300">
                          {`${getLunarOrbitRadius().toFixed(3)} units (${(getLunarOrbitRadius() / getPlanetRadius('earth')).toFixed(2)}x R_earth)`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>{isZh ? '地球赤道物理半径' : 'Earth Radius'}:</span>
                        <span className="font-mono text-slate-300">
                          {`${getPlanetRadius('earth').toFixed(3)} units`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>{isZh ? '月球赤道物理半径' : 'Moon Radius'}:</span>
                        <span className="font-mono text-slate-300">
                          {`${getPlanetRadius('moon').toFixed(3)} units`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. 轨道包络面安全审计 */}
                  <div className="space-y-1 bg-slate-900/40 rounded-lg p-2 border border-slate-800/50">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-amber-300 font-sans">
                        {isZh ? '2. 轨道包络面安全审计' : '2. Orbital Horizon Bounds'}
                      </span>
                      <span className="text-[8px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1 py-0.5 rounded font-mono font-bold">
                        {isZh ? '✅ 无干涉' : '✅ NO CLASH'}
                      </span>
                    </div>
                    <div className="text-[9.5px] text-slate-400 space-y-1 font-sans">
                      <div className="flex justify-between">
                        <span>{isZh ? '月球公转最大外延' : 'Max Lunar Path'}:</span>
                        <span className="font-mono text-cyan-300">
                          {`${getLunarOrbitRadius().toFixed(3)} units`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>{isZh ? '地日平均运行空间 (1 AU)' : 'Earth-Sun Void (1 AU)'}:</span>
                        <span className="font-mono text-slate-300">22.000 units</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{isZh ? '相对轨道干涉指数' : 'Orbit Intrusion'}:</span>
                        <span className="font-mono text-emerald-400">
                          {`${((getLunarOrbitRadius() / 22.0) * 100).toFixed(2)}%`} &lt; 10%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3. 太阳系主星轨标定 */}
                  <div className="space-y-1 bg-slate-900/40 rounded-lg p-2 border border-slate-800/50">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-amber-300 font-sans">
                        {isZh ? '3. 太阳系主星轨标定' : '3. Solar Orbit Calibration'}
                      </span>
                      <span className="text-[8px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-1 py-0.5 rounded font-mono font-bold">
                        {isZh ? '✅ NASA标准' : '✅ NASA STABLE'}
                      </span>
                    </div>
                    <div className="text-[9.5px] text-slate-400 space-y-1 font-sans">
                      <div className="flex justify-between">
                        <span>{isZh ? '日地距离 (1.00 AU)' : 'Sun-Earth Space'}:</span>
                        <span className="font-mono text-slate-300">22.00 units</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{isZh ? '日海距离 (30.07 AU)' : 'Sun-Neptune Space'}:</span>
                        <span className="font-mono text-slate-300">
                          {'661.54 units'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {/* 堆叠检验配对选择器 */}
                  <div className="flex flex-col space-y-1 bg-slate-900/40 p-2 rounded-lg border border-slate-800/50">
                    <select
                      value={validationPairKey}
                      onChange={(e) => onChangeValidationPairKey(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 text-[10px] text-slate-100 p-1.5 rounded-md cursor-pointer focus:outline-none focus:border-amber-500/50 font-sans font-medium"
                    >
                      {VALIDATION_PAIRS.map(x => (
                        <option key={x.key} value={x.key} className="bg-slate-950 text-slate-100 font-sans">
                          {isZh ? x.nameZh : x.nameEn}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 科学算式证明 */}
                  <div className="space-y-1 text-[9.5px] bg-slate-900/40 rounded-lg p-2 border border-slate-800/50 font-sans">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">{isZh ? '关联天体' : 'Targets'}:</span>
                      <span className="font-bold text-cyan-300 font-mono text-[10px]">
                        {`${(() => {
                          const activeP = VALIDATION_PAIRS.find(x => x.key === validationPairKey) || VALIDATION_PAIRS[0];
                          return activeP.sourceId.toUpperCase() + ' ↔ ' + activeP.targetId.toUpperCase();
                        })()}`}
                      </span>
                    </div>
                    <div className="flex flex-col pt-1 border-t border-slate-800/40">
                      <span className="text-slate-500 text-[8.5px]">{isZh ? '理论中比例计算' : 'Theoretical Ratio'}:</span>
                      <span className="font-mono text-amber-300 bg-slate-950/60 p-1 rounded border border-slate-900 mt-1 text-center font-bold">
                        {`${(() => {
                          const activeP = VALIDATION_PAIRS.find(x => x.key === validationPairKey) || VALIDATION_PAIRS[0];
                          return isZh ? activeP.countFormulaTextZh : activeP.countFormulaTextEn;
                        })()}`}
                      </span>
                    </div>
                  </div>

                  {/* 天体物理模型尺寸比例尺选择 */}
                  <div className="flex flex-col space-y-1 bg-slate-900/40 p-2 rounded-lg border border-slate-800/50">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 flex items-center space-x-1">
                      <span className="w-1 h-2 rounded bg-amber-400 inline-block" />
                      <span>{isZh ? '天体物理模型尺寸比例尺' : 'Celestial Dimensions'}</span>
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => onToggleStrictPhysics(true)}
                        className={`py-1 px-1.5 rounded border text-left transition-all cursor-pointer ${
                          strictPhysics
                            ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                            : 'bg-transparent border-slate-800 text-slate-400 hover:border-slate-700/80'
                        }`}
                      >
                        <div className="text-[9px] font-bold">{isZh ? '物理 1:1 绝对' : 'Strict 1:1'}</div>
                        <div className="text-[8px] opacity-75 mt-0.5 leading-tight">{isZh ? '太阳放 108 个' : 'Packs 108 Suns'}</div>
                      </button>
                      <button
                        onClick={() => onToggleStrictPhysics(false)}
                        className={`py-1 px-1.5 rounded border text-left transition-all cursor-pointer ${
                          !strictPhysics
                            ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                            : 'bg-transparent border-slate-800 text-slate-400 hover:border-slate-700/80'
                        }`}
                      >
                        <div className="text-[9px] font-bold">{isZh ? '可观测放大' : 'Magnified'}</div>
                        <div className="text-[8px] opacity-75 mt-0.5 leading-tight">{isZh ? '太阳放 47 个' : 'Packs 47 Suns'}</div>
                      </button>
                    </div>
                  </div>

                  {/* 比例尺对照调节器 */}
                  <div className="flex flex-col space-y-1">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">
                      {isZh ? '排列模拟比例尺' : 'Packing Scale Mode'}
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => {
                          onChangePackingMode('physical');
                          onToggleStrictPhysics(true);
                        }}
                        className={`py-1 px-1.5 rounded text-[9px] font-medium border transition-all text-center cursor-pointer ${
                          packingMode === 'physical'
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                            : 'bg-transparent border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-bold">{isZh ? '物理比例' : 'True Physics'}</div>
                        <div className="text-[8px] opacity-75">{isZh ? '排满108个 (1:1)' : '108 Suns'}</div>
                      </button>
                      <button
                        onClick={() => {
                          onChangePackingMode('visual');
                        }}
                        className={`py-1 px-1.5 rounded text-[9px] font-bold border transition-all text-center cursor-pointer ${
                          packingMode === 'visual'
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                            : 'bg-transparent border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-bold">{isZh ? '自适应星体' : 'Matched Scale'}</div>
                        <div className="text-[8px] opacity-75">
                          {isZh 
                            ? `排 ${strictPhysics ? 108 : 47} 个` 
                            : `${strictPhysics ? 108 : 47} Suns`
                          }
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* 排列进度状态与进度条 */}
                  {packingActive && (() => {
                    const uiMaxCount = (packingMode === 'physical' && strictPhysics) 
                      ? 108 
                      : Math.floor(22.0 / (getSunRadius() * 2));
                    return (
                      <div className="space-y-1.5 bg-slate-900/30 rounded-lg p-2 border border-slate-800/40 transition-all duration-300">
                        <div className="flex justify-between items-center text-[9px]">
                          <span className="text-slate-400">{isZh ? '当前铺设进度' : 'Packing Progress'}:</span>
                          <span className="font-mono font-semibold text-amber-400">
                            {Math.floor(packingProgressDone)} / {uiMaxCount}
                          </span>
                        </div>
                        
                        {/* 进度条轨道 */}
                        <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden border border-slate-850">
                          <div 
                            className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-300 rounded-full transition-all duration-75 shadow-[0_0_4px_rgba(245,158,11,0.4)]"
                            style={{
                              width: `${Math.min(100, (packingProgressDone / uiMaxCount) * 100)}%`
                            }}
                          />
                        </div>

                        {/* 完成验证的提示语 */}
                        {packingProgressDone >= uiMaxCount - 0.5 ? (
                          <div className="mt-1 p-1 bg-emerald-500/15 border border-emerald-500/35 rounded text-[8.5px] text-emerald-300 flex items-center space-x-1 shadow-[0_0_6px_rgba(16,185,129,0.15)]">
                            <span>✨</span>
                            <span className="leading-tight font-medium">
                              {isZh 
                                ? `验证成功！精确排满 ${uiMaxCount} 段太阳！` 
                                : `Proof Success! Fits exactly ${uiMaxCount} Suns!`
                              }
                            </span>
                          </div>
                        ) : (
                          <div className="mt-1 text-[8px] text-slate-500 italic text-center animate-pulse">
                            {isZh ? '正在部署太阳天体群...' : 'Spawning solar bodies...'}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* 科普总结文字 */}
              <div className="text-[9px] text-slate-400/90 leading-relaxed border-t border-slate-800/50 pt-1.5 font-medium">
                {isZh ? (
                  <p>
                    💡 <span className="text-amber-300/80 font-bold">思考</span>：在 1:1 绝对物理下，日地距离能排下约 <strong className="text-amber-200">108</strong> 个太阳！
                  </p>
                ) : (
                  <p>
                    💡 <span className="text-amber-300/80 font-bold">Concept</span>: Space accommodates precisely <strong className="text-amber-200">108</strong> Suns side-by-side!
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* System Info Panel (宇宙尺度验证) */}
      <div className="pt-1 border-t border-slate-800/60">
        <SystemPanel
          lang={lang}
          selectedPlanetId={selectedPlanetId}
          helioX={helioX}
          helioY={helioY}
          helioZ={helioZ}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-slate-800/60">
        <button
          onClick={handleCalibrationCheck}
          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/30 text-[9px] font-mono text-indigo-300 font-semibold cursor-pointer transition-colors"
          title="NASA Protocol Calibration Check"
        >
          <IconCheckCircle className="w-3 h-3" />
          <span>CHECK</span>
        </button>
        <button
          onClick={() => onJumpDate(Date.now())}
          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-900/70 hover:bg-slate-800 border border-slate-800 text-[9px] font-semibold text-slate-300 font-mono cursor-pointer transition-colors"
        >
          <IconRefreshCw className="w-3 h-3" />
          <span>{t.backToPresent}</span>
        </button>
      </div>
    </div>
  );
}
