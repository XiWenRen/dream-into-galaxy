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

// ─── Constants ──────────────────────────────────────────────────────────────

const CENTER_T = 0.5;

// ─── Time presets ───────────────────────────────────────────────────────────

interface TimePreset {
  value: number;
  label: string;
  labelShort: string;
  side: 'left' | 'center' | 'right';
}

// 手动校准的 [speed, t] 映射表：低速区密集但可点击，高速区渐疏，完全对称
const SPEED_T_MAP: [number, number][] = [
  [-94608000, 0.00],
  [-2592000,  0.10],
  [-604800,   0.16],
  [-86400,    0.23],
  [-3600,     0.31],
  [-60,       0.39],
  [-5,        0.45],
  [0,         0.50],
  [5,         0.55],
  [60,        0.61],
  [3600,      0.69],
  [86400,     0.77],
  [604800,    0.84],
  [2592000,   0.90],
  [94608000,  1.00],
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// speed -> t：在映射表中线性插值
function speedToT(speed: number): number {
  if (speed === 0) return CENTER_T;
  const absSpeed = Math.abs(speed);
  // 找 absSpeed 在正半轴映射表中的位置
  const positiveMap = SPEED_T_MAP.filter(([s]) => s >= 0);
  for (let i = 0; i < positiveMap.length - 1; i++) {
    const [sLow, tLow] = positiveMap[i];
    const [sHigh, tHigh] = positiveMap[i + 1];
    if (absSpeed >= sLow && absSpeed <= sHigh) {
      const ratio = (absSpeed - sLow) / (sHigh - sLow);
      const t = lerp(tLow, tHigh, ratio);
      return speed < 0 ? 1 - t : t;
    }
  }
  // 超出范围时钳制
  return speed < 0 ? 0 : 1;
}

// t -> speed：在映射表中线性插值（仅在正半轴工作，再镜像）
function tToSpeed(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  const isLeft = clamped < CENTER_T;
  const absT = isLeft ? 1 - clamped : clamped;

  const positiveMap = SPEED_T_MAP.filter(([s]) => s >= 0);
  for (let i = 0; i < positiveMap.length - 1; i++) {
    const [_, tLow] = positiveMap[i];
    const [__, tHigh] = positiveMap[i + 1];
    if (absT >= tLow && absT <= tHigh) {
      const ratio = (absT - tLow) / (tHigh - tLow);
      const [sLow] = positiveMap[i];
      const [sHigh] = positiveMap[i + 1];
      const speed = Math.round(lerp(sLow, sHigh, ratio));
      return isLeft ? -speed : speed;
    }
  }
  return isLeft ? -1 : 1;
}

const TIME_PRESETS: (TimePreset & { t: number })[] = SPEED_T_MAP.map(([value, t]) => ({
  value,
  label: value === 0 ? '1:1' : `${value >= 0 ? '' : '-'}${formatSpeedLabel(Math.abs(value))}/s`,
  labelShort: value === 0 ? '1:1' : (value > 0 ? '' : '-') + formatSpeedLabel(Math.abs(value)),
  side: value === 0 ? 'center' : (value < 0 ? 'left' : 'right'),
  t,
}));

function formatSpeedLabel(v: number): string {
  if (v >= 94608000) return '3y';
  if (v >= 2592000) return '1M';
  if (v >= 604800) return '1w';
  if (v >= 86400) return '1d';
  if (v >= 3600) return '1h';
  if (v >= 60) return '1m';
  return v + 'x';
}

// 点击时判定是否"靠近"某个 preset 的阈值（弧线归一化距离）
const PRESET_SNAP_THRESHOLD = 0.03;

// ─── Arc math ───────────────────────────────────────────────────────────────

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
  const [timezoneOffset, setTimezoneOffset] = useState(0); // 小时偏移，默认 UTC
  const [showTzPicker, setShowTzPicker] = useState(false);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [hoveredPreset, setHoveredPreset] = useState<TimePreset | null>(null);
  const isZh = lang === 'zh';
  const t = translations[lang];

  // 常用时区偏移列表（UTC-12 到 UTC+12）
  const TZ_OPTIONS = useMemo(() => {
    const opts: number[] = [];
    for (let i = -12; i <= 12; i++) opts.push(i);
    return opts;
  }, []);

  // 当前速度在弧线上的精确位置（由对数映射计算）
  const speedT = useMemo(() => {
    if (timeState.isPaused) return CENTER_T;
    return speedToT(timeState.speedMultiplier);
  }, [timeState.speedMultiplier, timeState.isPaused]);

  // 判定当前激活的 preset（用于高亮刻度）
  const activePreset = useMemo(() => {
    if (timeState.isPaused) return TIME_PRESETS.find(p => p.value === 0)!;
    const currentT = speedToT(timeState.speedMultiplier);
    // 找到 t 最接近当前速度的 preset
    let closest = TIME_PRESETS[0];
    let minDiff = Infinity;
    for (const p of TIME_PRESETS) {
      const diff = Math.abs(p.t - currentT);
      if (diff < minDiff) {
        minDiff = diff;
        closest = p;
      }
    }
    // 只有在非常接近（阈值内）时才认为是"激活"该 preset
    return minDiff < PRESET_SNAP_THRESHOLD ? closest : null;
  }, [timeState.speedMultiplier, timeState.isPaused]);

  // 根据时区偏移格式化时间
  const formatTime = (ts: number, offsetHours: number): string => {
    const offsetMs = offsetHours * 3600 * 1000;
    const d = new Date(ts + offsetMs);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const sign = offsetHours >= 0 ? '+' : '';
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC${sign}${offsetHours}`;
  };

  const toDateTimeLocal = (ts: number): string => {
    const offsetMs = timezoneOffset * 3600 * 1000;
    const d = new Date(ts + offsetMs);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  };

  const handlePresetClick = (preset: TimePreset) => {
    if (preset.value === 0) {
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

  const arcPath = 'M 20 20 Q 300 60 580 20';

  const handleArcPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    updateSpeedFromEvent(e);
  };

  const handleArcPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.buttons > 0) {
      updateSpeedFromEvent(e);
    }
  };

  const updateSpeedFromEvent = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const viewBoxWidth = 600;
    // 将点击 x 坐标转换为 viewBox 中的 t 值
    let tClick = ((e.clientX - rect.left) / rect.width * viewBoxWidth - 20) / 560;
    tClick = Math.max(0, Math.min(1, tClick));

    // 中心小范围： 1x
    if (Math.abs(tClick - CENTER_T) < 0.02) {
      if (timeState.speedMultiplier !== 1 || timeState.isPaused) {
        onChangeTimeState({ isPaused: false, speedMultiplier: 1 });
      }
      return;
    }

    const speed = tToSpeed(tClick);
    onChangeTimeState({ isPaused: false, speedMultiplier: speed });
  };

  return (
    <div className="relative flex flex-col items-center select-none"
      style={{ width: 600, maxWidth: '95vw' }}
    >
      {/* SVG Arc Track */}
      <svg
          viewBox="0 0 600 80"
          className="w-full cursor-pointer touch-none"
          style={{ height: 'auto', overflow: 'visible' }}
          onPointerDown={handleArcPointerDown}
          onPointerMove={handleArcPointerMove}
        >
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

        {/* Active arc segment: 从中心到当前速度位置的连线 */}
        {!timeState.isPaused && timeState.speedMultiplier !== 0 && (
          <path
            d={arcPath}
            fill="none"
            stroke="rgba(6,182,212,0.5)"
            strokeWidth="2.5"
            filter="url(#arcGlow)"
            strokeDasharray={`${speedT * 580} 580`}
          />
        )}

        {/* Speed indicator: 当前速度在弧线上的精确位置 */}
        {(() => {
          const pos = getArcPoint(speedT);
          return (
            <g>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={5}
                fill="#22d3ee"
                filter="url(#dotGlow)"
                style={{ transition: 'all 0.3s ease' }}
              />
              <circle
                cx={pos.x}
                cy={pos.y}
                r={2}
                fill="white"
                style={{ transition: 'all 0.3s ease', pointerEvents: 'none' }}
              />
            </g>
          );
        })()}

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
              onPointerDown={(e) => {
                e.stopPropagation();
                handlePresetClick(preset);
              }}
              onMouseEnter={() => setHoveredPreset(preset)}
              onMouseLeave={() => setHoveredPreset(null)}
            >
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
              <circle
                cx={pos.x}
                cy={pos.y}
                r={r}
                fill={isActive ? '#22d3ee' : isCenter ? 'rgba(6,182,212,0.4)' : 'rgba(100,116,139,0.5)'}
                stroke={isActive ? '#22d3ee' : 'rgba(100,116,139,0.3)'}
                strokeWidth="1"
                style={{ transition: 'all 0.2s ease' }}
              />
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

      {/* Center HUD */}
      <div
        className="absolute flex flex-col items-center gap-2"
        style={{ top: '-36px', left: '50%', transform: 'translateX(-50%)' }}
      >
        <div className="flex items-center gap-2 bg-slate-950/30 backdrop-blur-md rounded-xl px-3 py-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.4)] border-0">
          <IconClock className="w-3 h-3 text-cyan-400/70" />
          {isEditingTime ? (
            <input
              type="datetime-local"
              defaultValue={toDateTimeLocal(timeState.currentTimestamp)}
              autoFocus
              className="bg-[#0b0c10] border border-cyan-500/40 text-cyan-300 text-[11px] rounded px-1.5 py-0.5 font-mono focus:outline-none focus:border-cyan-500 w-40"
              onBlur={(e) => {
                const val = e.target.value;
                if (val) {
                  const ts = new Date(val).getTime();
                  if (!isNaN(ts)) onJumpDate(ts);
                }
                setIsEditingTime(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = (e.target as HTMLInputElement).value;
                  if (val) {
                    const ts = new Date(val).getTime();
                    if (!isNaN(ts)) onJumpDate(ts);
                  }
                  setIsEditingTime(false);
                } else if (e.key === 'Escape') {
                  setIsEditingTime(false);
                }
              }}
            />
          ) : (
            <span
              className="text-[11px] font-mono font-semibold text-cyan-300 tracking-wide whitespace-nowrap cursor-pointer select-none"
              onDoubleClick={() => setIsEditingTime(true)}
              title={isZh ? '双击修改时间' : 'Double-click to edit time'}
            >
              {formatTime(timeState.currentTimestamp, timezoneOffset)}
            </span>
          )}
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
          <button
            onClick={() => setShowTzPicker(!showTzPicker)}
            className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border transition-all cursor-pointer relative"
            style={{
              color: '#22d3ee',
              borderColor: 'rgba(6,182,212,0.4)',
              background: 'rgba(6,182,212,0.1)',
            }}
            title={isZh ? '选择时区' : 'Select timezone'}
          >
            {`UTC${timezoneOffset >= 0 ? '+' : ''}${timezoneOffset}`}
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

        {/* Timezone picker popover */}
        {showTzPicker && (
          <div
            className="absolute z-50 bg-slate-950/95 backdrop-blur-xl rounded-xl p-2 shadow-2xl border border-slate-800 flex flex-col gap-1"
            style={{ bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px', maxHeight: '220px', overflowY: 'auto', minWidth: '260px' }}
          >
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono px-1">{isZh ? '选择时区' : 'Timezone'}</div>
            <div className="grid grid-cols-5 gap-1">
              {TZ_OPTIONS.map((offset) => (
                <button
                  key={offset}
                  onClick={() => {
                    setTimezoneOffset(offset);
                    setShowTzPicker(false);
                  }}
                  className={`text-[9px] font-mono px-1 py-1 rounded transition-all cursor-pointer whitespace-nowrap ${
                    offset === timezoneOffset
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                      : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800 hover:text-cyan-300'
                  }`}
                >
                  UTC{offset >= 0 ? '+' : ''}{offset}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Hover tooltip */}
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

    </div>
  );
}
