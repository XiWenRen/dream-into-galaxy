/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { translations } from '../i18n';
import { SOLAR_TERMS } from '../data/solarTerms';
import { AstrophenomenaEngine } from '../engine/AstrophenomenaEngine';
import type { PhenomenonId, PhenomenaDemoState, DemoViewMode, ThemeType } from '../types/astronomy';

interface PhenomenaGuidePanelProps {
  lang: 'zh' | 'en';
  theme: ThemeType;
  demoState: PhenomenaDemoState;
  onNextStep: () => void;
  onPrevStep: () => void;
  onSwitchView: (mode: DemoViewMode) => void;
  onExitDemo: () => void;
  onTogglePlay: () => void;
  onChangeSpeed: (speed: number) => void;
  onSelectPhase: (phase: number) => void;
  // Eclipse-specific props
  eclipseEventTs?: number | null;
  eclipseEventType?: 'solar' | 'lunar' | null;
  eclipseProgress?: number;
  eclipseWindow?: { start: number; end: number } | null;
  onSelectEclipseEvent?: (ts: number, type: 'solar' | 'lunar') => void;
  onChangeEclipseProgress?: (progress: number) => void;
}

interface StepContent {
  titleKey: string;
  bodyKey: string;
}

const PHENOMENA_STEPS: Record<PhenomenonId, StepContent[]> = {
  'moon-phases': [
    { titleKey: 'moonPhaseStep1Title', bodyKey: 'moonPhaseStep1Body' },
    { titleKey: 'moonPhaseStep2Title', bodyKey: 'moonPhaseStep2Body' },
    { titleKey: 'moonPhaseStep2Title', bodyKey: 'moonPhaseStep2Body' },
    { titleKey: 'moonPhaseStep3Title', bodyKey: 'moonPhaseStep3Body' },
    { titleKey: 'moonPhaseStep3Title', bodyKey: 'moonPhaseStep3Body' },
    { titleKey: 'moonPhaseStep3Title', bodyKey: 'moonPhaseStep3Body' },
    { titleKey: 'moonPhaseStep3Title', bodyKey: 'moonPhaseStep3Body' },
    { titleKey: 'moonPhaseStep3Title', bodyKey: 'moonPhaseStep3Body' },
  ],
  'eclipses': [
    { titleKey: 'eclipseStep1Title', bodyKey: 'eclipseStep1Body' },
    { titleKey: 'eclipseStep2Title', bodyKey: 'eclipseStep2Body' },
    { titleKey: 'eclipseStep3Title', bodyKey: 'eclipseStep3Body' },
    { titleKey: 'eclipseStep4Title', bodyKey: 'eclipseStep4Body' },
  ],
  'retrograde': [
    { titleKey: 'moonPhaseStep1Title', bodyKey: 'moonPhaseStep1Body' },
    { titleKey: 'moonPhaseStep2Title', bodyKey: 'moonPhaseStep2Body' },
    { titleKey: 'moonPhaseStep3Title', bodyKey: 'moonPhaseStep3Body' },
  ],
  'solar-terms': [],
};

const SPEED_OPTIONS = [
  { value: 0.5, labelZh: '慢', labelEn: '慢' },
  { value: 1, labelZh: '中', labelEn: '中' },
  { value: 2, labelZh: '快', labelEn: '快' },
];

const KEYFRAME_LABELS: Record<PhenomenonId, string[]> = {
  'moon-phases': ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'],
  'eclipses': ['☀️', '🌑', '🌍', '🌕'],
  'retrograde': ['1', '2', '3'],
  'solar-terms': ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24'],
};

const getThemeAccent = (theme: ThemeType) => {
  switch (theme) {
    case 'space-tech': return 'text-cyan-400';
    case 'cosmic-dark': return 'text-amber-400';
    case 'neon-hologram': return 'text-fuchsia-400';
    case 'solar-gold': return 'text-orange-400';
  }
};

const getThemeBtn = (theme: ThemeType) => {
  switch (theme) {
    case 'space-tech': return 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25';
    case 'cosmic-dark': return 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25';
    case 'neon-hologram': return 'bg-fuchsia-500/15 border-fuchsia-500/40 text-fuchsia-300 hover:bg-fuchsia-500/25';
    case 'solar-gold': return 'bg-orange-500/15 border-orange-500/40 text-orange-300 hover:bg-orange-500/25';
  }
};

const getThemeBtnSolid = (theme: ThemeType) => {
  switch (theme) {
    case 'space-tech': return 'bg-cyan-500/80 text-black hover:bg-cyan-400';
    case 'cosmic-dark': return 'bg-amber-500/80 text-black hover:bg-amber-400';
    case 'neon-hologram': return 'bg-fuchsia-500/80 text-black hover:bg-fuchsia-400';
    case 'solar-gold': return 'bg-orange-500/80 text-black hover:bg-orange-400';
  }
};

const getThemeTrack = (theme: ThemeType) => {
  switch (theme) {
    case 'space-tech': return 'accent-cyan-400';
    case 'cosmic-dark': return 'accent-amber-400';
    case 'neon-hologram': return 'accent-fuchsia-400';
    case 'solar-gold': return 'accent-orange-400';
  }
};

export default function PhenomenaGuidePanel({
  lang,
  theme,
  demoState,
  onNextStep,
  onPrevStep,
  onSwitchView,
  onExitDemo,
  onTogglePlay,
  onChangeSpeed,
  onSelectPhase,
  eclipseEventTs,
  eclipseEventType,
  eclipseProgress = 0.5,
  eclipseWindow,
  onSelectEclipseEvent,
  onChangeEclipseProgress,
}: PhenomenaGuidePanelProps) {
  const t = translations[lang];
  const isZh = lang === 'zh';
  const { activePhenomenon, demoPhase, viewMode, isPlaying, playbackSpeed } = demoState;

  if (!activePhenomenon) return null;

  const steps = activePhenomenon === 'solar-terms'
    ? SOLAR_TERMS.map(() => ({ titleKey: '', bodyKey: '' }))
    : PHENOMENA_STEPS[activePhenomenon];
  const currentStep = steps[Math.min(demoPhase, steps.length - 1)];
  const hasPrev = demoPhase > 0;
  const hasNext = demoPhase < steps.length - 1;
  const keyframes = KEYFRAME_LABELS[activePhenomenon] || [];

  // Search eclipse events
  const { solarEvents, lunarEvents } = useMemo(() => {
    if (activePhenomenon !== 'eclipses') return { solarEvents: [], lunarEvents: [] };
    const all = AstrophenomenaEngine.searchEclipseEvents(Date.now(), 12);
    return {
      solarEvents: all.filter(e => e.type === 'solar'),
      lunarEvents: all.filter(e => e.type === 'lunar'),
    };
  }, [activePhenomenon]);

  const phenomenonIcon = (id: PhenomenonId) => {
    switch (id) {
      case 'moon-phases': return '🌙';
      case 'eclipses': return '🌑';
      case 'retrograde': return '➰';
      case 'solar-terms': return '📅';
    }
  };

  const phenomenonName = (id: PhenomenonId) => {
    switch (id) {
      case 'moon-phases': return t.phenomenaMoonPhases;
      case 'eclipses': return t.phenomenaEclipses;
      case 'retrograde': return t.phenomenaRetrograde;
      case 'solar-terms': return t.phenomenaSolarTerms;
    }
  };

  let stepTitle = '';
  let stepBody = '';
  if (activePhenomenon === 'solar-terms') {
    const term = SOLAR_TERMS[demoPhase];
    if (term) {
      stepTitle = isZh
        ? `${term.nameZh} · ${term.dateRange}`
        : `${term.nameEn} · ${term.dateRangeEn}`;
      stepBody = isZh
        ? `${term.directLatDesc}\n\n物候：${term.phenology}\n\n天气：${term.weather.desc}`
        : `${term.directLatDescEn}\n\nPhenology: ${term.phenologyEn}\n\nWeather: ${term.weather.descEn}`;
    }
  } else {
    // @ts-ignore
    stepTitle = t[currentStep?.titleKey] || '';
    // @ts-ignore
    stepBody = t[currentStep?.bodyKey] || '';
  }

  // Format progress label using real eclipse window if available
  const progressLabel = (() => {
    if (activePhenomenon !== 'eclipses' || !eclipseEventTs) return '';
    if (eclipseWindow) {
      const total = eclipseWindow.end - eclipseWindow.start;
      const current = eclipseWindow.start + eclipseProgress * total;
      const d = new Date(current);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    const hours = (eclipseProgress - 0.5) * 6;
    if (Math.abs(hours) < 0.1) return isZh ? '食甚' : 'Maximum';
    if (hours < 0) return isZh ? `初亏 ${Math.abs(hours).toFixed(1)}h` : `Start ${Math.abs(hours).toFixed(1)}h`;
    return isZh ? `复圆 +${hours.toFixed(1)}h` : `End +${hours.toFixed(1)}h`;
  })();

  const formatTimeShort = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="w-[22rem] max-h-[calc(100vh-120px)] bg-black/75 border border-white/10 rounded-2xl shadow-2xl z-20 backdrop-blur-md flex flex-col animate-in fade-in-0 slide-in-from-right-5 duration-300"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-2 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{phenomenonIcon(activePhenomenon)}</span>
            <div>
              <h3 className={`text-xs font-bold ${getThemeAccent(theme)}`}>
                {phenomenonName(activePhenomenon)}
              </h3>
              <p className="text-[9px] text-slate-500">
                {t.stepIndicator.replace('{{current}}', String(demoPhase + 1)).replace('{{total}}', String(steps.length))}
              </p>
            </div>
          </div>
          <button
            onClick={onExitDemo}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
            title={t.demoExit}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <h4 className="text-sm font-bold text-slate-100 mb-1.5">{stepTitle}</h4>
        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{stepBody}</p>

        {/* Eclipse event selectors: split into solar / lunar */}
        {activePhenomenon === 'eclipses' && (solarEvents.length > 0 || lunarEvents.length > 0) && (
          <div className="mt-3 space-y-2">
            {/* Solar eclipse selector */}
            <div>
              <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">
                {isZh ? '🌑 日食' : '☀️ Solar'}
              </p>
              <select
                value={eclipseEventType === 'solar' ? (eclipseEventTs ?? '') : ''}
                onChange={(e) => {
                  const ts = Number(e.target.value);
                  if (onSelectEclipseEvent) onSelectEclipseEvent(ts, 'solar');
                }}
                className={`w-full px-2 py-1.5 rounded-lg text-[11px] bg-white/[0.05] border border-white/10 text-slate-200 outline-none cursor-pointer ${getThemeTrack(theme)}`}
              >
                <option value="">{isZh ? '—— 选择日食 ——' : '—— Select solar ——'}</option>
                {solarEvents.map((evt) => (
                  <option key={evt.timestamp} value={evt.timestamp}>
                    {evt.dateStr}
                  </option>
                ))}
              </select>
            </div>

            {/* Lunar eclipse selector */}
            <div>
              <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">
                {isZh ? '🌕 月食' : '🌕 Lunar'}
              </p>
              <select
                value={eclipseEventType === 'lunar' ? (eclipseEventTs ?? '') : ''}
                onChange={(e) => {
                  const ts = Number(e.target.value);
                  if (onSelectEclipseEvent) onSelectEclipseEvent(ts, 'lunar');
                }}
                className={`w-full px-2 py-1.5 rounded-lg text-[11px] bg-white/[0.05] border border-white/10 text-slate-200 outline-none cursor-pointer ${getThemeTrack(theme)}`}
              >
                <option value="">{isZh ? '—— 选择月食 ——' : '—— Select lunar ——'}</option>
                {lunarEvents.map((evt) => (
                  <option key={evt.timestamp} value={evt.timestamp}>
                    {evt.dateStr}
                  </option>
                ))}
              </select>
            </div>

            {/* Eclipse progress slider with real start/end times */}
            {eclipseEventTs && onChangeEclipseProgress && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] text-slate-500">{isZh ? '进程' : 'Progress'}</span>
                  <span className={`text-[10px] font-bold ${getThemeAccent(theme)}`}>{progressLabel}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(eclipseProgress * 100)}
                  onChange={(e) => onChangeEclipseProgress(Number(e.target.value) / 100)}
                  className={`w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer ${getThemeTrack(theme)}`}
                />
                <div className="flex justify-between text-[9px] text-slate-500 mt-0.5">
                  <span>{eclipseWindow ? formatTimeShort(eclipseWindow.start) : (isZh ? '开始' : 'Start')}</span>
                  <span>{eclipseWindow ? formatTimeShort(eclipseWindow.end) : (isZh ? '结束' : 'End')}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Compact control row: prev/play/next + speed */}
        <div className="mt-3 flex items-center gap-1.5">
          <button
            onClick={onPrevStep}
            disabled={!hasPrev}
            className="p-1.5 rounded-lg text-slate-300 hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            title={t.prevStep}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>

          <button
            onClick={onTogglePlay}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
              isPlaying
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : getThemeBtnSolid(theme)
            }`}
          >
            {isPlaying ? (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            onClick={onNextStep}
            disabled={!hasNext}
            className="p-1.5 rounded-lg text-slate-300 hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            title={t.nextStep}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>

          <div className="w-px h-4 bg-white/10 mx-0.5" />

          {SPEED_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChangeSpeed(opt.value)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-all cursor-pointer ${
                playbackSpeed === opt.value
                  ? getThemeBtn(theme)
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {isZh ? opt.labelZh : opt.labelEn}
            </button>
          ))}
        </div>

        {/* View Mode Switcher */}
        <div className="mt-2 flex items-center gap-1">
          {(['universe', 'starry'] as DemoViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => onSwitchView(mode)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-medium border transition-all cursor-pointer ${
                viewMode === mode
                  ? getThemeBtn(theme)
                  : 'bg-transparent border-white/5 text-slate-500 hover:border-white/15 hover:text-slate-300'
              }`}
            >
              {mode === 'universe' && t.viewPrinciple}
              {mode === 'starry' && t.viewObservation}
            </button>
          ))}
        </div>

        {/* Keyframe dots - compact grid */}
        <div className="mt-3">
          <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1.5">
            {isZh ? '步骤' : 'Steps'}
          </p>
          {activePhenomenon === 'solar-terms' ? (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {[
                { season: isZh ? '春' : 'Spring', range: [0, 6] as const, color: 'text-green-400', border: 'border-green-400/30' },
                { season: isZh ? '夏' : 'Summer', range: [6, 12] as const, color: 'text-red-400', border: 'border-red-400/30' },
                { season: isZh ? '秋' : 'Autumn', range: [12, 18] as const, color: 'text-amber-400', border: 'border-amber-400/30' },
                { season: isZh ? '冬' : 'Winter', range: [18, 24] as const, color: 'text-cyan-400', border: 'border-cyan-400/30' },
              ].map(({ season, range, color, border }) => (
                <div key={season}>
                  <p className={`text-[10px] font-bold ${color} mb-1`}>{season}</p>
                  <div className="flex flex-wrap gap-1">
                    {SOLAR_TERMS.slice(range[0], range[1]).map((term, idx) => {
                      const i = range[0] + idx;
                      const isActive = i === demoPhase;
                      return (
                        <button
                          key={i}
                          onClick={() => onSelectPhase(i)}
                          title={isZh ? term.nameZh : term.nameEn}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium border transition-all cursor-pointer leading-tight ${
                            isActive
                              ? getThemeBtn(theme)
                              : i < demoPhase
                              ? 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                              : 'bg-transparent border-white/5 text-slate-500 hover:border-white/15 hover:text-slate-300'
                          }`}
                        >
                          {isZh ? term.nameZh : term.nameEn}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: steps.length }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => onSelectPhase(i)}
                  className={`w-6 h-6 rounded-md text-[9px] font-bold border transition-all cursor-pointer flex items-center justify-center ${
                    i === demoPhase
                      ? getThemeBtn(theme)
                      : i < demoPhase
                      ? 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                      : 'bg-transparent border-white/5 text-slate-600 hover:border-white/15 hover:text-slate-400'
                  }`}
                >
                  {keyframes[i] || String(i + 1)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
