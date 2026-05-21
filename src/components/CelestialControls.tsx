/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { translations } from '../i18n';
import { TimeState } from '../types/astronomy';
import { OrbitEngine } from '../engine/OrbitEngine';

interface CelestialControlsProps {
  timeState: TimeState;
  onChangeTimeState: (state: Partial<TimeState>) => void;
  lang: 'zh' | 'en';
  onChangeLang: (lang: 'zh' | 'en') => void;
  landed: boolean;
  latitude: number;
  longitude: number;
  onChangeLocation: (lat: number, lng: number) => void;
  showConstellLines: boolean;
  onToggleConstellLines: (show: boolean) => void;
  showStarNames: boolean;
  onToggleStarNames: (show: boolean) => void;
  onJumpDate: (timestamp: number) => void;
  currentSolarTermNameKey?: string;
  nextSolarTermNameKey?: string;
  magLimit: number;
  onChangeMagLimit: (limit: number) => void;
}

// 仿真速度乘数档位
const WARP_SPEEDS = [
  { value: 0, label: '0x' },
  { value: 1, label: '1x' },
  { value: 60, label: '1m/s' },
  { value: 3600, label: '1h/s' },
  { value: 86400, label: '1d/s' },
  { value: 2592000, label: '30d/s' },
  { value: 31536000, label: '1y/s' }
];

// 特殊天文天象预设
const CELESTIAL_PRESETS = [
  { labelZh: '2026 夏至', labelEn: 'Solstice 2026', timestamp: new Date('2026-06-21T02:41:00Z').getTime() },
  { labelZh: '2017 世纪日全食', labelEn: 'Solar Eclipse 2017', timestamp: new Date('2017-08-21T18:25:00Z').getTime() },
  { labelZh: '2021 完美月全食', labelEn: 'Lunar Eclipse 2021', timestamp: new Date('2021-05-26T11:18:00Z').getTime() },
  { labelZh: 'J2000 标定起点', labelEn: 'J2000 Epoch Base', timestamp: 946728000000 }
];

export default function CelestialControls({
  timeState,
  onChangeTimeState,
  lang,
  onChangeLang,
  landed,
  latitude,
  longitude,
  onChangeLocation,
  showConstellLines,
  onToggleConstellLines,
  showStarNames,
  onToggleStarNames,
  onJumpDate,
  currentSolarTermNameKey,
  nextSolarTermNameKey,
  magLimit,
  onChangeMagLimit
}: CelestialControlsProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isZh = lang === 'zh';
  const rawDate = new Date(timeState.currentTimestamp);
  
  // 校准检验日志弹出
  const handleCalibrationCheck = () => {
    const result = OrbitEngine.validateOrbitEngine();
    alert(`[NASA Calibration Protocol]\n${result.log}\n\n${translations[lang].calibrationSuccess}`);
  };

  // == 极简折叠浮动状态 ==
  if (isCollapsed) {
    return (
      <div 
        onClick={() => setIsCollapsed(false)}
        className="bg-slate-950/95 border border-slate-800/80 backdrop-blur-lg rounded-xl px-4 py-2.5 shadow-2xl flex items-center space-x-3.5 cursor-pointer select-none text-white hover:bg-slate-900/90 transition-all duration-300 w-fit max-w-sm"
        id="celestial-simulation-controls-collapsed"
      >
        <div className="flex items-center space-x-1.5 shrink-0">
          <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
          <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest">
            {isZh ? '控制台' : 'CONSOLE'}
          </span>
        </div>
        <span className="text-xs font-mono font-semibold text-slate-200">
          {rawDate.toISOString().replace('T', ' ').substring(0, 16)}
        </span>
        <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-400 font-mono">
          {timeState.isPaused ? (isZh ? '暂停' : 'PAUSED') : `${timeState.speedMultiplier.toLocaleString()}x`}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsCollapsed(false);
          }}
          className="text-xs text-cyan-400 font-extrabold hover:text-cyan-300 transition-colors cursor-pointer flex items-center space-x-0.5"
        >
          <span>{isZh ? '展开 ➔' : 'OPEN ➔'}</span>
        </button>
      </div>
    );
  }

  return (
    <div 
      className="bg-slate-950/85 border border-slate-800/80 backdrop-blur-lg rounded-xl p-4 shadow-2xl flex flex-col space-y-3.5 select-none w-full max-w-md text-white font-sans"
      id="celestial-simulation-controls"
    >
      {/* 头部：日期时间显示与中英文切换 */}
      <div className="flex justify-between items-start border-b border-slate-900 pb-2.5">
        <div>
          <div className="text-[9px] text-cyan-400 font-mono tracking-widest uppercase mb-0.5">
            🛰️ CELESTIAL TIMESTAMP (UTC)
          </div>
          <div className="text-lg font-bold font-mono tracking-tight text-white flex items-center space-x-2">
            <span>{rawDate.toISOString().replace('T', ' ').substring(0, 19)}</span>
            <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-400 font-mono">
              UTC
            </span>
          </div>
        </div>

        {/* 语言、校准 & 收起按钮（精简化按钮组） */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            onClick={handleCalibrationCheck}
            className="px-2 py-1 rounded bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-800/40 text-[9px] font-mono text-indigo-300 font-semibold cursor-pointer"
            id="btn-nasa-calibrate-check"
            title="NASA Protocol Calibration Check"
          >
            🛰️ CHECK
          </button>
          
          <button
            onClick={() => onChangeLang(isZh ? 'en' : 'zh')}
            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[9px] font-semibold text-slate-300 cursor-pointer font-mono"
            id="btn-i18n-toggle"
          >
            {isZh ? 'EN' : '中文'}
          </button>

          <button
            onClick={() => setIsCollapsed(true)}
            className="px-2 py-1 rounded bg-slate-900/90 hover:bg-slate-800 border border-slate-700/60 text-[9px] font-extrabold text-cyan-400 hover:text-cyan-300 flex items-center space-x-0.5 cursor-pointer font-mono"
            id="btn-collapse-controls"
            title={isZh ? "折叠面板" : "Collapse Control Center"}
          >
            <span>{isZh ? '收起 ➔' : 'HIDE ➔'}</span>
          </button>
        </div>
      </div>

      {/* 节气天文信息板块 (非 landed 状态下核心，采用 hover-tooltip 悬浮条简化长字串) */}
      {!landed && currentSolarTermNameKey && (
        <div 
          className="bg-slate-900/60 border border-slate-900 p-2.5 rounded-xl flex items-center justify-between text-xs cursor-help transition-colors hover:bg-slate-900/80"
          title={translations[lang].term_desc}
        >
          <div className="space-y-0.5">
            <span className="text-slate-500 text-[9px] uppercase font-mono tracking-wider">
              🌾 {translations[lang].solarTerm}
            </span>
            <div className="flex items-center space-x-1.5">
              <span className="font-semibold text-amber-400">
                {translations[lang][currentSolarTermNameKey as keyof typeof translations['zh']]}
              </span>
              <span className="text-slate-600">→</span>
              <span className="text-slate-400 text-[10.5px]">
                {translations[lang][nextSolarTermNameKey as keyof typeof translations['zh']]}
              </span>
            </div>
          </div>
          <div className="text-[9.5px] bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono tracking-wider">
            ℹ️ {isZh ? '悬浮看机理' : 'Hover Info'}
          </div>
        </div>
      )}

      {/* 2. 模拟播放流速操控 */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-[11px] text-slate-400 uppercase tracking-widest font-mono flex items-center space-x-1.5">
            <span>⏱️</span>
            <span>{translations[lang].timeSpeed}</span>
          </span>
          <span className="text-[11px] font-mono font-semibold text-cyan-400 flex items-center space-x-1">
            <span>{timeState.isPaused ? translations[lang].paused : translations[lang].running}</span>
            <span>({timeState.speedMultiplier.toLocaleString()}x)</span>
          </span>
        </div>

        {/* 流速倍率挡位排布 */}
        <div className="grid grid-cols-7 gap-1.5">
          {WARP_SPEEDS.map((warp) => {
            const isSelected = !timeState.isPaused && timeState.speedMultiplier === warp.value;
            return (
              <button
                key={warp.value}
                onClick={() => {
                  if (warp.value === 0) {
                    onChangeTimeState({ isPaused: true });
                  } else {
                    onChangeTimeState({ isPaused: false, speedMultiplier: warp.value });
                  }
                }}
                className={`py-1.5 px-1 rounded-lg text-[10.5px] font-mono border font-semibold cursor-pointer text-center truncate transition-all ${
                  isSelected
                    ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg shadow-cyan-900/40 font-bold'
                    : (warp.value === 0 && timeState.isPaused)
                    ? 'bg-amber-600 border-amber-400 text-white font-bold'
                    : 'bg-slate-900/70 border-slate-800 hover:bg-slate-800 text-slate-300'
                }`}
              >
                {warp.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. 登录地面后的坐标仪 (Latitude / Longitude sliders、星座连线) */}
      {landed ? (
        <div className="bg-slate-900/50 border border-slate-900 rounded-xl p-3.5 space-y-3 pt-4">
          <div className="text-[10px] text-cyan-400 tracking-wider uppercase font-mono pb-1 border-b border-slate-900">
            📊 HORIZONTAL DOME SITE CONFIGURATION
          </div>

          <div className="space-y-2.5">
            {/* 纬度 */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>📍 {translations[lang].latitude}:</span>
                <span className="text-emerald-400 font-bold">{latitude > 0 ? `N ${latitude}°` : `S ${Math.abs(latitude)}°`}</span>
              </div>
              <input 
                type="range"
                min="-90"
                max="90"
                value={latitude}
                onChange={(e) => onChangeLocation(parseFloat(e.target.value), longitude)}
                className="w-full accent-cyan-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* 经度 */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>📍 {translations[lang].longitude}:</span>
                <span className="text-emerald-400 font-bold">{longitude > 0 ? `E ${longitude}°` : `W ${Math.abs(longitude)}°`}</span>
              </div>
              <input 
                type="range"
                min="-180"
                max="180"
                value={longitude}
                onChange={(e) => onChangeLocation(latitude, parseFloat(e.target.value))}
                className="w-full accent-cyan-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* 星地开关 */}
          <div className="flex items-center space-x-4 pt-1 text-[11px] font-mono text-slate-300">
            <label className="flex items-center space-x-1.5 cursor-pointer">
              <input 
                type="checkbox"
                checked={showConstellLines}
                onChange={(e) => onToggleConstellLines(e.target.checked)}
                className="rounded accent-cyan-500"
              />
              <span>🌌 {translations[lang].constellationLines}</span>
            </label>

            <label className="flex items-center space-x-1.5 cursor-pointer">
              <input 
                type="checkbox"
                checked={showStarNames}
                onChange={(e) => onToggleStarNames(e.target.checked)}
                className="rounded accent-cyan-500"
              />
              <span>⭐ {translations[lang].starNames}</span>
            </label>
          </div>
        </div>
      ) : (
        /* 4. 天体特色天象跳转预设 (非 Landed 状态) */
        <div className="space-y-2 pt-1">
          <span className="text-xs text-slate-400 uppercase tracking-widest font-mono flex items-center space-x-1.5">
            <span>📅</span>
            <span>{translations[lang].presetDates}</span>
          </span>

          <div className="grid grid-cols-2 gap-2">
            {CELESTIAL_PRESETS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => onJumpDate(p.timestamp)}
                className="py-1.5 px-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 rounded-lg text-left text-[11px] font-mono text-slate-200 transition-colors flex items-center space-x-1.5 cursor-pointer truncate"
              >
                <span>✨</span>
                <span className="truncate">{isZh ? p.labelZh : p.labelEn}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 星空视星等极限滑块 */}
      <div className="space-y-1.5 p-2 bg-slate-900/40 border border-slate-900/50 rounded-xl">
        <div className="flex justify-between items-center text-[11px] font-mono text-slate-400">
          <span className="flex items-center space-x-1.5">
            <span>✨</span>
            <span>{translations[lang].magLimitLabel}:</span>
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
          id="input-mag-limit-slider"
        />
        <div className="flex justify-between text-[9px] text-slate-500 font-mono">
          <span>{translations[lang].magLimitBrightest}</span>
          <span>{translations[lang].magLimitAll}</span>
        </div>
      </div>

      {/* 回正当前日期 */}
      <button
        onClick={() => onJumpDate(Date.now())}
        className="w-full py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 font-mono flex items-center justify-center space-x-2 transition-colors cursor-pointer"
        id="btn-back-to-today"
      >
        <span>🔄</span>
        <span>{translations[lang].today}</span>
      </button>
    </div>
  );
}
