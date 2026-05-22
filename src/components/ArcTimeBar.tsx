/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { translations } from '../i18n';
import { TimeState } from '../types/astronomy';

interface ArcTimeBarProps {
  timeState: TimeState;
  onChangeTimeState: (state: Partial<TimeState>) => void;
  lang: 'zh' | 'en';
  onJumpDate: (timestamp: number) => void;
}

// ─── Time presets ───────────────────────────────────────────────────────────

interface TimePreset {
  value: number;     // speedMultiplier (negative = reverse)
  label: string;
  labelShort: string;
  t: number;         // position along arc [0,1]
  side: 'left' | 'center' | 'right';
}

const TIME_PRESETS: TimePreset[] = [
  { value: -3600, label: '-1h/s', labelShort: '-1h', t: 0.08, side: 'left' },
  { value: -60, label: '-1m/s', labelShort: '-1m', t: 0.18, side: 'left' },
  { value: -5, label: '-5s/s', labelShort: '-5x', t: 0.28, side: 'left' },
  { value: 0, label: '1:1', labelShort: '1:1', t: 0.5, side: 'center' },
  { value: 5, label: '5s/s', labelShort: '5x', t: 0.72, side: 'right' },
  { value: 60, label: '1m/s', labelShort: '1m', t: 0.80, side: 'right' },
  { value: 3600, label: '1h/s', labelShort: '1h', t: 0.87, side: 'right' },
  { value: 86400, label: '1d/s', labelShort: '1d', t: 0.93, side: 'right' },
  { value: 94608000, label: '3y/s', labelShort: '3y', t: 0.98, side: 'right' },
];

// ─── Arc math ───────────────────────────────────────────────────────────────
// Quadratic bezier: P0=(20,20), P1=(300,80), P2=(580,20)
// Bx(t) = 20 + 560t
// By(t) = 20 + 120t(1-t)   (upward arc, reduced curvature)

function getArcPoint(t: number): { x: number; y: number } {
  const x = 20 + 560 * t;
  const y = 20 + 80 * t * (1 - t);
  return { x, y };
}

// ─── Icons ──────────────────────────────────────────────────────────────────

const IconPause = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
);

const IconPlay = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M5 3l14 9-14 9V3z" />
  </svg>
);

const IconReverse = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" />
  </svg>
);

const IconFastForward = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m13 19 5-5-5-5" />
    <path d="M6 19l5-5-5-5" />
  </svg>
);

const IconCalendar = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconClock = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

// ─── Component ──────────────────────────────────────────────────────────────

export default function ArcTimeBar({
  timeState,
  onChangeTimeState,
  lang,
  onJumpDate,
}: ArcTimeBarProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [useUTC, setUseUTC] = useState(true);
  const [hoveredPreset, setHoveredPreset] = useState<TimePreset | null>(null);
  const isZh = lang === 'zh';
  const t = translations[lang];

  const rawDate = new Date(timeState.currentTimestamp);

  // Determine active preset
  const activePreset = useMemo(() => {
    if (timeState.isPaused) return TIME_PRESETS.find(p => p.value === 0) || null;
    // Find closest preset by value
    let closest = TIME_PRESETS[0];
    let minDiff = Infinity;
    for (const p of TIME_PRESETS) {
      if (p.value === 0) continue;
      const diff = Math.abs(Math.abs(p.value) - Math.abs(timeState.speedMultiplier));
      if (diff < minDiff) {
        minDiff = diff;
        closest = p;
      }
    }
    // Only highlight if actually close (within 10%)
    if (minDiff / Math.abs(timeState.speedMultiplier) < 0.1 || timeState.speedMultiplier === closest.value) {
      return closest;
    }
    return null;
  }, [timeState.speedMultiplier, timeState.isPaused]);

  // Format timestamp for display
  const formatTime = (ts: number, utc: boolean): string => {
    const d = new Date(ts);
    if (utc) {
      return d.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    }
    return d.toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }) + ' LOCAL';
  };

  // Format for datetime-local input (always in local timezone of the browser)
  const toDateTimeLocal = (ts: number): string => {
    const d = new Date(ts);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handlePresetClick = (preset: TimePreset) => {
    if (preset.value === 0) {
      // Center: toggle pause, or set to 1x if already paused
      if (timeState.isPaused) {
        onChangeTimeState({ isPaused: false, speedMultiplier: 1 });
      } else if (timeState.speedMultiplier === 1) {
        onChangeTimeState({ isPaused: true });
      } else {
        onChangeTimeState({ isPaused: false, speedMultiplier: 1 });
      }
    } else {
      onChangeTimeState({ isPaused: false, speedMultiplier: preset.value });
    }
  };

  const handlePauseToggle = () => {
    onChangeTimeState({ isPaused: !timeState.isPaused });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) return;
    const ts = new Date(val).getTime();
    if (!isNaN(ts)) {
      onJumpDate(ts);
      setShowDatePicker(false);
    }
  };

  // Arc SVG path (upward arc with reduced curvature)
  const arcPath = 'M 20 20 Q 300 60 580 20';

  return (
    <div className="relative flex flex-col items-center select-none"
      style={{ width: 600, maxWidth: '95vw' }}
    >
      {/* SVG Arc Track */}
      <svg
        viewBox="0 0 600 80"
        className="w-full"
        style={{ height: 'auto', overflow: 'visible' }}
      >
        {/* Glow filter */}
        <defs>
          <filter id="arcGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="dotGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Main arc line */}
        <path
          d={arcPath}
          fill="none"
          stroke="rgba(6,182,212,0.2)"
          strokeWidth="2"
        />
        {/* Active arc segment */}
        {activePreset && activePreset.value !== 0 && (
          <path
            d={arcPath}
            fill="none"
            stroke="rgba(6,182,212,0.5)"
            strokeWidth="2.5"
            filter="url(#arcGlow)"
            strokeDasharray={`${activePreset.t * 580} 580`}
          />
        )}

        {/* Preset dots */}
        {TIME_PRESETS.map((preset) => {
          const pos = getArcPoint(preset.t);
          const isActive = activePreset?.value === preset.value;
          const isCenter = preset.value === 0;
          const r = isCenter ? 6 : 4;

          return (
            <g
              key={preset.value}
              className="cursor-pointer"
              onClick={() => handlePresetClick(preset)}
              onMouseEnter={() => setHoveredPreset(preset)}
              onMouseLeave={() => setHoveredPreset(null)}
            >
              {/* Outer glow ring for active */}
              {isActive && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r + 5}
                  fill="none"
                  stroke="rgba(6,182,212,0.3)"
                  strokeWidth="1"
                  filter="url(#dotGlow)"
                />
              )}
              {/* Dot */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={r}
                fill={isActive ? '#22d3ee' : isCenter ? 'rgba(6,182,212,0.4)' : 'rgba(100,116,139,0.5)'}
                stroke={isActive ? '#22d3ee' : 'rgba(100,116,139,0.3)'}
                strokeWidth="1"
                style={{ transition: 'all 0.2s ease' }}
              />
              {/* Label above dot */}
              <text
                x={pos.x}
                y={pos.y - (isCenter ? 14 : 10)}
                textAnchor="middle"
                fill={isActive ? '#22d3ee' : 'rgba(148,163,184,0.6)'}
                fontSize={isCenter ? 10 : 8}
                fontFamily="JetBrains Mono, monospace"
                fontWeight={isCenter ? 700 : 500}
                style={{ transition: 'all 0.2s ease', pointerEvents: 'none' }}
              >
                {preset.labelShort}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Center HUD: Date/Time + Pause button */}
      <div
        className="absolute flex flex-col items-center gap-2"
        style={{
          top: '-36px',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        {/* Date/Time display - transparent floating, no border */}
        <div className="flex items-center gap-2 bg-slate-950/50 backdrop-blur-md rounded-lg px-3 py-1.5 shadow-lg">
          <IconClock className="w-3 h-3 text-cyan-400/70" />
          <span className="text-[11px] font-mono font-semibold text-cyan-300 tracking-wide whitespace-nowrap">
            {formatTime(timeState.currentTimestamp, useUTC)}
          </span>
          {/* Pause/Play button */}
          <button
            onClick={handlePauseToggle}
            className={`ml-1 p-1 rounded-md transition-all cursor-pointer ${
              timeState.isPaused
                ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                : 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'
            }`}
            title={timeState.isPaused ? (isZh ? '继续' : 'Resume') : (isZh ? '暂停' : 'Pause')}
          >
            {timeState.isPaused ? <IconPlay className="w-3.5 h-3.5" /> : <IconPause className="w-3.5 h-3.5" />}
          </button>
          {/* Date picker toggle */}
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="p-1 rounded-md bg-slate-900/50 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-all cursor-pointer"
            title={t.selectDate}
          >
            <IconCalendar className="w-3.5 h-3.5" />
          </button>
          {/* UTC/Local toggle */}
          <button
            onClick={() => setUseUTC(!useUTC)}
            className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border transition-all cursor-pointer"
            style={{
              color: useUTC ? '#22d3ee' : '#94a3b8',
              borderColor: useUTC ? 'rgba(6,182,212,0.4)' : 'rgba(100,116,139,0.3)',
              background: useUTC ? 'rgba(6,182,212,0.1)' : 'transparent',
            }}
            title={useUTC ? 'UTC' : 'Local Time'}
          >
            {useUTC ? 'UTC' : 'LOC'}
          </button>
        </div>

        {/* Speed indicator */}
        <div className="text-[9px] font-mono text-slate-500 tracking-wider">
          {timeState.isPaused ? (
            <span className="text-amber-400/80">{isZh ? '已暂停' : 'PAUSED'}</span>
          ) : (
            <span className="text-cyan-400/60">
              {timeState.speedMultiplier < 0
                ? `${isZh ? '倒流' : 'REV'} ${Math.abs(timeState.speedMultiplier).toLocaleString()}x`
                : `${timeState.speedMultiplier.toLocaleString()}x`
              }
            </span>
          )}
        </div>

        {/* Hover tooltip for preset */}
        {hoveredPreset && hoveredPreset.value !== 0 && (
          <div className="absolute bottom-full mb-1 px-2 py-1 bg-slate-950/95 border border-slate-800 rounded text-[9px] font-mono text-cyan-300 whitespace-nowrap pointer-events-none">
            {hoveredPreset.side === 'left' ? (
              <span className="flex items-center gap-1">
                <IconReverse className="w-3 h-3" />
                {hoveredPreset.label}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                {hoveredPreset.label}
                <IconFastForward className="w-3 h-3" />
              </span>
            )}
          </div>
        )}
      </div>

      {/* Date picker popover */}
      {showDatePicker && (
        <div
          className="absolute z-50 bg-slate-950/95 border border-slate-800/80 backdrop-blur-xl rounded-xl p-3 shadow-2xl flex flex-col gap-2"
          style={{ top: '70px', left: '50%', transform: 'translateX(-50%)' }}
        >
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">{t.selectDate}</div>
          <input
            type="datetime-local"
            value={toDateTimeLocal(timeState.currentTimestamp)}
            onChange={handleDateChange}
            className="bg-[#0b0c10] border border-white/10 text-white text-xs rounded-lg px-2 py-1.5 font-mono focus:outline-none focus:border-cyan-500/50"
          />
          <button
            onClick={() => setShowDatePicker(false)}
            className="self-end text-[9px] text-slate-400 hover:text-white cursor-pointer font-mono"
          >
            {t.collapse}
          </button>
        </div>
      )}
    </div>
  );
}
