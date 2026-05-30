/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { translations } from '../i18n';
import { SOLAR_TERMS } from '../data/solarTerms';
import { MOON_PHASES } from '../data/moonPhases';
import { AstrophenomenaEngine } from '../engine/AstrophenomenaEngine';
import { getThemeAccent, getThemeBtn, getThemeTrack } from '../utils/themeStyles';
import type { PhenomenonId, PhenomenaDemoState, ThemeType } from '../types/astronomy';

type SolarTermTab = 'phenology' | 'poetry' | 'daylight';
type MoonPhaseTab = 'knowledge' | 'poetry';

interface PhenomenaGuidePanelProps {
  lang: 'zh' | 'en';
  theme: ThemeType;
  demoState: PhenomenaDemoState;
  onNextStep: () => void;
  onPrevStep: () => void;
  onSwitchView: (mode: 'universe' | 'starry') => void;
  onExitDemo: () => void;
  onTogglePlay: () => void;
  onChangeSpeed: (speed: number) => void;
  onSelectPhase: (phase: number) => void;
  // Moon phase specific
  selectedMoonPhaseIndex?: number | null;
  onClearMoonPhaseSelection?: () => void;
  // Eclipse-specific props
  eclipseEventTs?: number | null;
  eclipseEventType?: 'solar' | 'lunar' | null;
  eclipseProgress?: number;
  eclipseWindow?: { start: number; end: number } | null;
  onSelectEclipseEvent?: (ts: number, type: 'solar' | 'lunar') => void;
  onChangeEclipseProgress?: (progress: number) => void;
  selectedPlanetId?: string;
  onSelectPlanet?: (id: string) => void;
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

const KEYFRAME_LABELS: Record<PhenomenonId, string[]> = {
  'moon-phases': ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'],
  'eclipses': ['☀️', '🌑', '🌍', '🌕'],
  'retrograde': ['1', '2', '3'],
  'solar-terms': ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24'],
};

const REF_LATITUDE = 40;
const rad = (deg: number) => deg * Math.PI / 180;
const deg = (r: number) => r * 180 / Math.PI;

function calculateDaylightData(eclipticLongitude: number) {
  const obliquity = rad(23.439);
  const lambda = rad(eclipticLongitude);
  const decl = Math.asin(Math.sin(obliquity) * Math.sin(lambda));
  const declDeg = deg(decl);

  const latRad = rad(REF_LATITUDE);
  let cosHa = -Math.tan(latRad) * Math.tan(decl);
  cosHa = Math.max(-1, Math.min(1, cosHa));
  const haRad = Math.acos(cosHa);
  const haDeg = deg(haRad);

  const dayHours = 2 * haDeg / 15;
  const sunrise = 12 - dayHours / 2;
  const sunset = 12 + dayHours / 2;
  const nightHours = 24 - dayHours;
  const noonAltitude = 90 - Math.abs(REF_LATITUDE - declDeg);

  return { declination: declDeg, dayHours, sunrise, sunset, nightHours, noonAltitude };
}

function formatTimeDecimal(hourDecimal: number): string {
  const h = Math.floor(hourDecimal);
  const m = Math.round((hourDecimal - h) * 60);
  if (m >= 60) return `${h + 1}:00`;
  return `${h}:${String(m).padStart(2, '0')}`;
}

const getThemeBorder = (theme: ThemeType) => {
  switch (theme) {
    case 'space-tech': return 'border-cyan-500/30';
    case 'cosmic-dark': return 'border-amber-500/30';
    case 'neon-hologram': return 'border-fuchsia-500/30';
    case 'solar-gold': return 'border-orange-500/30';
  }
};

const getThemeBg = (theme: ThemeType) => {
  switch (theme) {
    case 'space-tech': return 'bg-cyan-500/10';
    case 'cosmic-dark': return 'bg-amber-500/10';
    case 'neon-hologram': return 'bg-fuchsia-500/10';
    case 'solar-gold': return 'bg-orange-500/10';
  }
};

const getThemeTabActive = (theme: ThemeType) => {
  switch (theme) {
    case 'space-tech': return 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300';
    case 'cosmic-dark': return 'bg-amber-500/15 border-amber-500/40 text-amber-300';
    case 'neon-hologram': return 'bg-fuchsia-500/15 border-fuchsia-500/40 text-fuchsia-300';
    case 'solar-gold': return 'bg-orange-500/15 border-orange-500/40 text-orange-300';
  }
};

export default function PhenomenaGuidePanel({
  lang,
  theme,
  demoState,
  onNextStep: _onNextStep,
  onPrevStep: _onPrevStep,
  onSwitchView: _onSwitchView,
  onExitDemo,
  onTogglePlay: _onTogglePlay,
  onChangeSpeed: _onChangeSpeed,
  onSelectPhase,
  selectedMoonPhaseIndex,
  onClearMoonPhaseSelection,
  eclipseEventTs,
  eclipseEventType,
  eclipseProgress = 0.5,
  eclipseWindow,
  onSelectEclipseEvent,
  onChangeEclipseProgress,
  selectedPlanetId,
  onSelectPlanet,
}: PhenomenaGuidePanelProps) {
  const t = translations[lang];
  const isZh = lang === 'zh';
  const { activePhenomenon, demoPhase } = demoState;

  const [eclipseCategory, setEclipseCategory] = useState<'solar' | 'lunar' | null>(eclipseEventType ?? null);
  const [activeTab, setActiveTab] = useState<SolarTermTab>('phenology');
  const [moonPhaseTab, setMoonPhaseTab] = useState<MoonPhaseTab>('knowledge');

  if (!activePhenomenon) return null;

  const steps = activePhenomenon === 'solar-terms'
    ? SOLAR_TERMS.map(() => ({ titleKey: '', bodyKey: '' }))
    : PHENOMENA_STEPS[activePhenomenon];
  const currentStep = steps[Math.min(demoPhase, steps.length - 1)];
  const keyframes = KEYFRAME_LABELS[activePhenomenon] || [];

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
        ? `${term.directLatDesc}`
        : `${term.directLatDescEn}`;
    }
  } else {
    // @ts-ignore
    stepTitle = t[currentStep?.titleKey] || '';
    // @ts-ignore
    stepBody = t[currentStep?.bodyKey] || '';
  }

  const formatTimeShort = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  };

  const progressLabel = (() => {
    if (activePhenomenon !== 'eclipses' || !eclipseEventTs) return '';
    if (eclipseWindow) {
      const total = eclipseWindow.end - eclipseWindow.start;
      const current = eclipseWindow.start + eclipseProgress * total;
      const d = new Date(current);
      const hh = String(d.getUTCHours()).padStart(2, '0');
      const mm = String(d.getUTCMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    const hours = (eclipseProgress - 0.5) * 6;
    if (Math.abs(hours) < 0.1) return isZh ? '食甚' : 'Maximum';
    if (hours < 0) return isZh ? `初亏 ${Math.abs(hours).toFixed(1)}h` : `Start ${Math.abs(hours).toFixed(1)}h`;
    return isZh ? `复圆 +${hours.toFixed(1)}h` : `End +${hours.toFixed(1)}h`;
  })();

  const currentEclipseEvents = eclipseCategory === 'solar' ? solarEvents : lunarEvents;

  // Solar term data for the current phase
  const solarTerm = activePhenomenon === 'solar-terms' ? SOLAR_TERMS[demoPhase] : null;
  const daylight = useMemo(() => {
    if (!solarTerm) return null;
    return calculateDaylightData(solarTerm.eclipticLongitude);
  }, [solarTerm?.eclipticLongitude]);

  const tabs: { key: SolarTermTab; label: string }[] = [
    { key: 'phenology', label: isZh ? '物候 · 习俗' : 'Phenology & Customs' },
    { key: 'poetry', label: isZh ? '古诗' : 'Poetry' },
    { key: 'daylight', label: t.daylightObservatory },
  ];

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
        {/* Moon-phases: selected phase detail view */}
        {activePhenomenon === 'moon-phases' && selectedMoonPhaseIndex !== null && (
          <MoonPhaseDetailContent
            lang={lang}
            theme={theme}
            phaseIndex={selectedMoonPhaseIndex}
            activeTab={moonPhaseTab}
            onTabChange={setMoonPhaseTab}
            onBack={onClearMoonPhaseSelection}
          />
        )}

        {/* Non-solar-terms: simple step info (when no moon phase selected) */}
        {activePhenomenon !== 'solar-terms' && !(activePhenomenon === 'moon-phases' && selectedMoonPhaseIndex !== null) && (
          <>
            <h4 className="text-sm font-bold text-slate-100 mb-1.5">{stepTitle}</h4>
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{stepBody}</p>
          </>
        )}

        {/* Viewpoint toggle button for moon-phases demo */}
        {activePhenomenon === 'moon-phases' && (
          <div className="mt-3 mb-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {isZh ? '视角聚焦' : 'Camera Focus'}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => onSelectPlanet?.('earth')}
                className={`flex-1 py-1 rounded text-xs font-semibold border transition-all cursor-pointer ${
                  selectedPlanetId === 'earth'
                    ? getThemeBtn(theme)
                    : 'bg-white/5 border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                {isZh ? '🌍 地球' : '🌍 Earth'}
              </button>
              <button
                onClick={() => onSelectPlanet?.('moon')}
                className={`flex-1 py-1 rounded text-xs font-semibold border transition-all cursor-pointer ${
                  selectedPlanetId === 'moon'
                    ? getThemeBtn(theme)
                    : 'bg-white/5 border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                {isZh ? '🌑 月球' : '🌑 Moon'}
              </button>
            </div>
          </div>
        )}

        {/* Solar-terms: integrated info panel */}
        {activePhenomenon === 'solar-terms' && solarTerm && (
          <div className="space-y-3">
            {/* Combined info + weather card */}
            <div className={`p-3 rounded-xl border ${getThemeBorder(theme)} ${getThemeBg(theme)} space-y-2`}>
              {/* Row 1: Solar term name + date range */}
              <div className="flex items-center justify-between">
                <h4 className={`text-base font-extrabold ${getThemeAccent(theme)} tracking-wide`}>
                  {isZh ? solarTerm.nameZh : solarTerm.nameEn}
                </h4>
                <span className="text-[11px] font-semibold text-slate-300">
                  {isZh ? solarTerm.dateRange : solarTerm.dateRangeEn}
                </span>
              </div>
              {/* Row 2: Direct latitude description */}
              <p className="text-[11px] text-slate-400 leading-snug">
                {isZh ? solarTerm.directLatDesc : solarTerm.directLatDescEn}
              </p>
              {/* Divider */}
              <div className="border-t border-white/10" />
              {/* Row 3: Weather */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-slate-500 block mb-0.5">{t.solarTermWeather}</span>
                  <span className={`text-sm font-bold ${getThemeAccent(theme)}`}>
                    {isZh ? solarTerm.weather.tempRange : solarTerm.weather.tempRangeEn}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 text-right max-w-[55%] leading-snug">
                  {isZh ? solarTerm.weather.desc : solarTerm.weather.descEn}
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-medium border transition-all cursor-pointer text-center leading-tight ${
                    activeTab === tab.key
                      ? getThemeTabActive(theme)
                      : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/15 hover:text-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'phenology' && (
              <div className="space-y-3">
                <div className={`p-3 rounded-xl border ${getThemeBorder(theme)} ${getThemeBg(theme)}`}>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    {t.solarTermPhenology}
                  </h4>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {isZh ? solarTerm.phenology : solarTerm.phenologyEn}
                  </p>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    {t.solarTermCustoms}
                  </h4>
                  <ul className="space-y-1">
                    {(isZh ? solarTerm.customs : solarTerm.customsEn).slice(0, 4).map((custom, i) => (
                      <li key={i} className="text-[11px] text-slate-300 flex items-start gap-1.5">
                        <span className="text-slate-500 mt-0.5">•</span>
                        <span className="leading-relaxed">{custom}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'poetry' && (
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span>🖋️</span> {t.solarTermPoetry}
                </h4>
                <div className="space-y-1">
                  <p className={`text-xs font-bold ${getThemeAccent(theme)}`}>
                    {isZh ? `《${solarTerm.poetry.title}》` : `"${solarTerm.poetry.titleEn}"`}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {isZh
                      ? `[${solarTerm.poetry.dynasty}] ${solarTerm.poetry.author}`
                      : `${solarTerm.poetry.authorEn} (${solarTerm.poetry.dynastyEn})`
                    }
                  </p>
                  <div className="mt-2 space-y-0.5">
                    {(isZh ? solarTerm.poetry.lines : solarTerm.poetry.linesEn).map((line, i) => (
                      <p key={i} className="text-xs text-slate-300 italic leading-relaxed">
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'daylight' && daylight && (
              <div className="space-y-3">
                {/* Circular Clock Dial */}
                <div className="flex flex-col items-center">
                  <div className="relative w-28 h-28 flex items-center justify-center rounded-full border border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.6)] overflow-hidden"
                    style={{
                      background: `conic-gradient(
                        #1e3a8a 0%,
                        #1e3a8a ${(daylight.sunrise / 24) * 100}%,
                        #eab308 ${(daylight.sunrise / 24) * 100}%,
                        #eab308 ${(daylight.sunset / 24) * 100}%,
                        #1e3a8a ${(daylight.sunset / 24) * 100}%,
                        #1e3a8a 100%
                      )`
                    }}
                  >
                    {/* Inner disc overlay */}
                    <div className="absolute w-[82%] h-[82%] rounded-full bg-slate-950/75 backdrop-blur-[2px] border border-white/5 flex items-center justify-center z-10">
                      {/* Hour scale markers */}
                      <span className="absolute top-1.5 text-[8px] font-bold font-mono text-blue-300/80">00</span>
                      <span className="absolute right-1.5 text-[8px] font-bold font-mono text-amber-400/80">06</span>
                      <span className="absolute bottom-1.5 text-[8px] font-bold font-mono text-amber-500/80">12</span>
                      <span className="absolute left-1.5 text-[8px] font-bold font-mono text-blue-400/80">18</span>

                      {/* Digital readout */}
                      <div className="flex flex-col items-center mt-2.5">
                        <span className="text-sm font-bold font-mono text-white tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                          {formatTimeDecimal(daylight.sunrise)}
                        </span>
                        <span className="text-[7px] text-slate-500 uppercase tracking-widest">
                          {isZh ? '日出' : 'Sunrise'}
                        </span>
                      </div>
                    </div>

                    {/* Clock needle hand pointing to noon */}
                    <div
                      className="absolute inset-0 z-20 pointer-events-none"
                      style={{ transform: `rotate(${180}deg)` }}
                    >
                      <div className="absolute top-2.5 bottom-1/2 left-1/2 -translate-x-1/2 w-[2px] bg-gradient-to-t from-amber-500 via-amber-400 to-white rounded-full shadow-[0_0_6px_#f59e0b]" />
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_#fff]" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-slate-900 border-2 border-amber-400 shadow-[0_0_4px_rgba(245,158,11,0.5)]" />
                    </div>
                  </div>
                </div>

                {/* Stats panel */}
                <div className="bg-slate-900/60 rounded-xl p-3 border border-white/5 space-y-2 text-[10px] font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">{t.solarDeclination}:</span>
                    <span className="text-slate-200 font-bold">
                      {daylight.declination > 0 ? '+' : ''}{daylight.declination.toFixed(1)}°
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">{isZh ? '理论昼长' : 'Daylight'}:</span>
                    <span className="text-amber-400 font-bold font-sans">
                      {isZh
                        ? `${Math.floor(daylight.dayHours)}小时${Math.floor((daylight.dayHours % 1) * 60)}分`
                        : `${Math.floor(daylight.dayHours)}h ${Math.floor((daylight.dayHours % 1) * 60)}m`
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">{isZh ? '理论夜长' : 'Night'}:</span>
                    <span className="text-blue-400 font-bold font-sans">
                      {isZh
                        ? `${Math.floor(daylight.nightHours)}小时${Math.floor((daylight.nightHours % 1) * 60)}分`
                        : `${Math.floor(daylight.nightHours)}h ${Math.floor((daylight.nightHours % 1) * 60)}m`
                      }
                    </span>
                  </div>
                  <div className="border-t border-white/5 pt-1.5 text-center">
                    <span className="text-yellow-400 font-bold tracking-wide">
                      {isZh ? '观测点状态: 白昼 ☀️' : 'Observer: Daylight ☀️'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Two-level eclipse selector */}
        {activePhenomenon === 'eclipses' && (solarEvents.length > 0 || lunarEvents.length > 0) && (
          <div className="mt-4 space-y-3">
            {/* Level 1: Category */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                {isZh ? '选择类型' : 'Select Type'}
              </p>
              <div className="flex gap-2">
                {[
                  { key: 'solar' as const, label: isZh ? '🌑 日食' : '☀️ Solar', count: solarEvents.length },
                  { key: 'lunar' as const, label: isZh ? '🌕 月食' : '🌕 Lunar', count: lunarEvents.length },
                ].map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => {
                      setEclipseCategory(cat.key);
                      const events = cat.key === 'solar' ? solarEvents : lunarEvents;
                      if (events.length > 0 && onSelectEclipseEvent) {
                        onSelectEclipseEvent(events[0].timestamp, cat.key);
                      }
                    }}
                    disabled={cat.count === 0}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                      eclipseCategory === cat.key
                        ? getThemeBtn(theme)
                        : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/25 hover:text-slate-200'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className="ml-1 text-[9px] text-slate-500">({cat.count})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Level 2: Specific event */}
            {eclipseCategory && currentEclipseEvents.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {isZh ? '选择事件' : 'Select Event'}
                </p>
                <select
                  value={eclipseEventTs ?? ''}
                  onChange={(e) => {
                    const ts = Number(e.target.value);
                    if (onSelectEclipseEvent && eclipseCategory) onSelectEclipseEvent(ts, eclipseCategory);
                  }}
                  className={`w-full px-3 py-2 rounded-lg text-[12px] bg-white/10 border border-white/20 text-slate-100 outline-none cursor-pointer focus:border-white/40 transition-colors ${getThemeTrack(theme)}`}
                >
                  {currentEclipseEvents.map((evt) => (
                    <option key={evt.timestamp} value={evt.timestamp} className="bg-slate-900 text-slate-100">
                      {evt.dateStr} {formatTimeShort(evt.timestamp)}
                    </option>
                  ))}
                </select>
                {eclipseEventTs && (
                  <p className="mt-1.5 text-[10px] text-slate-400">
                    {isZh ? '食甚时间' : 'Greatest Time'}: <span className={`font-bold ${getThemeAccent(theme)}`}>{formatTimeShort(eclipseEventTs)}</span>
                  </p>
                )}
              </div>
            )}

            {/* Timeline Slider & Controls */}
            {eclipseEventTs && (
              <div className="mt-3 bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>{isZh ? '交食时间轴' : 'Eclipse Timeline'}</span>
                  <span className={`font-mono text-xs ${getThemeAccent(theme)}`}>{progressLabel}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.001"
                  value={eclipseProgress}
                  onChange={(e) => onChangeEclipseProgress?.(parseFloat(e.target.value))}
                  onPointerDown={(e) => e.stopPropagation()}
                  className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer outline-none bg-slate-800 ${getThemeTrack(theme)}`}
                  style={{
                    background: `linear-gradient(to right, var(--tw-accent-color, #ef4444) ${eclipseProgress * 100}%, #1e293b ${eclipseProgress * 100}%)`
                  }}
                />
                <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                  <span>{eclipseWindow ? `${isZh ? '初亏' : 'Start'} ${formatTimeShort(eclipseWindow.start)}` : '-3h'}</span>
                  <span>{isZh ? '食甚' : 'Maximum'}</span>
                  <span>{eclipseWindow ? `${isZh ? '复圆' : 'End'} ${formatTimeShort(eclipseWindow.end)}` : '+3h'}</span>
                </div>
              </div>
            )}

            {/* Geometry stats & gauge integrated */}
            {eclipseEventTs && (
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_#ef4444]" />
                    <span className="font-bold text-[10px] tracking-wider text-red-400 uppercase">
                      {isZh ? '交食几何观测指标' : 'Eclipse Geometry'}
                    </span>
                  </div>
                  <span className="text-[9px] bg-slate-800/80 px-1.5 py-0.5 rounded text-slate-400 font-semibold uppercase tracking-wider">
                    {eclipseCategory === 'solar' 
                      ? (isZh ? '日食' : 'Solar') 
                      : (isZh ? '月食' : 'Lunar')}
                  </span>
                </div>

                {/* Dial Gauge */}
                <div className="relative w-28 h-16 mx-auto flex items-end justify-center overflow-hidden border-b border-white/10">
                  <div className="absolute top-1 w-24 h-24 rounded-full border border-dashed border-white/10 flex items-center justify-center">
                    <span className="absolute left-1.5 text-[8px] font-mono text-slate-500">-6°</span>
                    <span className="absolute top-1 text-[8px] font-mono text-slate-500">0°</span>
                    <span className="absolute right-1.5 text-[8px] font-mono text-slate-500">+6°</span>
                  </div>
                  <div className="absolute bottom-0 w-3 h-3 rounded-full bg-slate-950 border border-white/20 flex items-center justify-center z-20">
                    <div className="w-1 h-1 rounded-full bg-red-500 shadow-[0_0_4px_#ef4444]" />
                  </div>
                  <div 
                    id="eclipse-pointer"
                    className="absolute bottom-0 w-0.5 h-10 origin-bottom bg-gradient-to-t from-red-500 via-red-400 to-white z-10 transition-transform duration-75"
                    style={{ transform: 'rotate(0deg)' }}
                  />
                </div>

                {/* Digital readout values */}
                <div className="bg-black/45 rounded-lg p-2.5 border border-white/5 space-y-1.5 text-[10px] font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{isZh ? '白道黄道倾斜黄纬' : 'Latitude Elevation'}:</span>
                    <span id="eclipse-elevation-val" className="text-slate-200 font-bold">-</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{isZh ? '地月日对齐偏差角' : 'Alignment Deviation'}:</span>
                    <span id="eclipse-deviation-val" className="text-amber-400 font-bold font-sans">-</span>
                  </div>
                  <div className="border-t border-white/5 pt-1.5 text-center">
                    <span id="eclipse-status-val" className="font-bold text-xs tracking-wide text-slate-400">-</span>
                  </div>
                </div>

                {/* Educational Note */}
                <div className="bg-slate-900/30 rounded-lg p-2 border border-white/5 text-[9px] text-slate-400 leading-normal">
                  {isZh ? (
                    <p>
                      💡 <span className="text-slate-300">交食几何原理</span>：由于白道与黄道存在 <span className="text-amber-400">5.14°</span> 夹角，只有月球运转到黄白交点附近且三点共线时，才会发生交食。使用左下方系统尺度切换按钮可观察演示放大与真实对比。
                    </p>
                  ) : (
                    <p>
                      💡 <span className="text-slate-300">Geometry Principle</span>: Due to the <span className="text-amber-400">5.14°</span> inclination of the Moon's orbit relative to the Ecliptic, eclipses occur only when the Moon is near the nodes under alignment. Use the system scale button to switch between Demo & Real views.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Keyframe dots / quick-switch buttons */}
        <div className="mt-4">
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

// ═══════════════════════════════════════════════════════════════════════════════
// Moon Phase Detail Content — merged into PhenomenaGuidePanel
// ═══════════════════════════════════════════════════════════════════════════════
interface MoonPhaseDetailProps {
  lang: 'zh' | 'en';
  theme: ThemeType;
  phaseIndex: number;
  activeTab: MoonPhaseTab;
  onTabChange: (tab: MoonPhaseTab) => void;
  onBack?: () => void;
}

function MoonPhaseDetailContent({
  lang,
  theme,
  phaseIndex,
  activeTab,
  onTabChange,
  onBack,
}: MoonPhaseDetailProps) {
  const t = translations[lang];
  const isZh = lang === 'zh';
  const phase = MOON_PHASES[phaseIndex];
  if (!phase) return null;

  const tabs: { key: MoonPhaseTab; label: string }[] = [
    { key: 'knowledge', label: t.moonPhaseKnowledge },
    { key: 'poetry', label: t.moonPhasePoetry },
  ];

  return (
    <div className="space-y-3">
      {/* Phase header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{phase.icon}</span>
          <div>
            <h4 className={`text-sm font-bold ${getThemeAccent(theme)}`}>
              {(t as any)[phase.nameKey] || phase.nameKey}
            </h4>
            <p className="text-[10px] text-slate-500">
              {isZh ? `第${phase.index + 1}个月相 · 共8个` : `Phase ${phase.index + 1} of 8`}
            </p>
          </div>
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="px-2 py-1 rounded-lg text-[10px] text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
          >
            {isZh ? '← 返回' : '← Back'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-medium border transition-all cursor-pointer text-center leading-tight ${
              activeTab === tab.key
                ? getThemeTabActive(theme)
                : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/15 hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'knowledge' && (
        <div className={`p-3 rounded-xl border ${getThemeBorder(theme)} ${getThemeBg(theme)}`}>
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            {t.moonPhaseKnowledge}
          </h4>
          <p className="text-xs text-slate-200 leading-relaxed">
            {isZh ? phase.knowledgeZh : phase.knowledgeEn}
          </p>
        </div>
      )}

      {activeTab === 'poetry' && (
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span>🖋️</span> {t.moonPhasePoetry}
          </h4>
          <div className="space-y-1">
            <p className={`text-xs font-bold ${getThemeAccent(theme)}`}>
              {isZh ? `《${phase.poetry.title}》` : `"${phase.poetry.titleEn}"`}
            </p>
            <p className="text-[10px] text-slate-500">
              {isZh
                ? `[${phase.poetry.dynasty}] ${phase.poetry.author}`
                : `${phase.poetry.authorEn} (${phase.poetry.dynastyEn})`
              }
            </p>
            <div className="mt-2 space-y-0.5">
              {(isZh ? phase.poetry.lines : phase.poetry.linesEn).map((line, i) => (
                <p key={i} className="text-xs text-slate-300 italic leading-relaxed">
                  {line}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
