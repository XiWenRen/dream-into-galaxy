/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { translations } from '../i18n';
import { OrbitEngine } from '../engine/OrbitEngine';
import { ThemeType } from '../types/astronomy';
import { SATELLITE_DATA } from './UniverseViewer';

interface CommandPanelProps {
  lang: 'zh' | 'en';
  onChangeLang: (lang: 'zh' | 'en') => void;
  landed: boolean;
  theme: ThemeType;
  onChangeTheme: (theme: ThemeType) => void;
  useVisualScale: boolean;
  onToggleVisualScale: (val: boolean) => void;
  showConstellLines: boolean;
  onToggleConstellLines: (show: boolean) => void;
  showStarNames: boolean;
  onToggleStarNames: (show: boolean) => void;
  magLimit: number;
  onChangeMagLimit: (limit: number) => void;
  telescopeActive: boolean;
  onToggleTelescope: (active: boolean) => void;
  selectedPlanetId: string;
  onSelectPlanet: (id: string) => void;
  onJumpDate: (timestamp: number) => void;
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
  useVisualScale,
  onToggleVisualScale,
  showConstellLines,
  onToggleConstellLines,
  showStarNames,
  onToggleStarNames,
  magLimit,
  onChangeMagLimit,
  telescopeActive,
  onToggleTelescope,
  selectedPlanetId,
  onSelectPlanet,
  onJumpDate,
}: CommandPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const isZh = lang === 'zh';
  const t = translations[lang];

  const resolved = resolveHierarchy(selectedPlanetId);

  const handleLevel1Change = (val: string) => {
    if (val === 'sun') onSelectPlanet('sun');
    else if (val === 'planet') onSelectPlanet('earth');
    else if (val === 'satellite') onSelectPlanet('moon');
  };

  const handleLevel2Change = (val: string) => {
    if (resolved.level1 === 'satellite') {
      const moons = getPlanetSatellites(val);
      if (moons.length > 0) onSelectPlanet(moons[0].nameEn);
      else onSelectPlanet(val);
    } else {
      onSelectPlanet(val);
    }
  };

  const handleLevel3Change = (val: string) => {
    onSelectPlanet(val);
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
        <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer hover:text-white transition-colors">
          <input
            type="checkbox"
            checked={useVisualScale}
            onChange={(e) => onToggleVisualScale(e.target.checked)}
            className="rounded accent-cyan-500 w-3.5 h-3.5 cursor-pointer"
          />
          <IconMaximize className="w-3.5 h-3.5 text-slate-500" />
          <span>{isZh ? '视觉比例优化' : 'Visual Scale'}</span>
        </label>
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
        </div>
      )}

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
