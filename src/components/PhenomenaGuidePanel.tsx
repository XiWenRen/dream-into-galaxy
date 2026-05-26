/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { translations } from '../i18n';
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
}

interface StepContent {
  titleKey: string;
  bodyKey: string;
}

const PHENOMENA_STEPS: Record<PhenomenonId, StepContent[]> = {
  'moon-phases': [
    { titleKey: 'moonPhaseStep1Title', bodyKey: 'moonPhaseStep1Body' },
    { titleKey: 'moonPhaseStep2Title', bodyKey: 'moonPhaseStep2Body' },
    { titleKey: 'moonPhaseStep3Title', bodyKey: 'moonPhaseStep3Body' },
  ],
  'eclipses': [
    { titleKey: 'eclipseStep1Title', bodyKey: 'eclipseStep1Body' },
    { titleKey: 'eclipseStep2Title', bodyKey: 'eclipseStep2Body' },
    { titleKey: 'eclipseStep3Title', bodyKey: 'eclipseStep3Body' },
    { titleKey: 'eclipseStep4Title', bodyKey: 'eclipseStep4Body' },
  ],
  'seasons': [
    { titleKey: 'moonPhaseStep1Title', bodyKey: 'moonPhaseStep1Body' }, // placeholder
  ],
  'retrograde': [
    { titleKey: 'moonPhaseStep1Title', bodyKey: 'moonPhaseStep1Body' }, // placeholder
  ],
  'solar-terms': [
    { titleKey: 'moonPhaseStep1Title', bodyKey: 'moonPhaseStep1Body' }, // placeholder
  ],
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

export default function PhenomenaGuidePanel({
  lang,
  theme,
  demoState,
  onNextStep,
  onPrevStep,
  onSwitchView,
  onExitDemo,
  onTogglePlay,
}: PhenomenaGuidePanelProps) {
  const t = translations[lang];
  const isZh = lang === 'zh';
  const { activePhenomenon, demoPhase, viewMode, isPlaying } = demoState;

  if (!activePhenomenon) return null;

  const steps = PHENOMENA_STEPS[activePhenomenon];
  const currentStep = steps[Math.min(demoPhase, steps.length - 1)];
  const hasPrev = demoPhase > 0;
  const hasNext = demoPhase < steps.length - 1;

  const phenomenonIcon = (id: PhenomenonId) => {
    switch (id) {
      case 'moon-phases': return '🌙';
      case 'eclipses': return '🌑';
      case 'seasons': return '🌍';
      case 'retrograde': return '➰';
      case 'solar-terms': return '📅';
    }
  };

  const phenomenonName = (id: PhenomenonId) => {
    switch (id) {
      case 'moon-phases': return t.phenomenaMoonPhases;
      case 'eclipses': return t.phenomenaEclipses;
      case 'seasons': return t.phenomenaSeasons;
      case 'retrograde': return t.phenomenaRetrograde;
      case 'solar-terms': return t.phenomenaSolarTerms;
    }
  };

  // @ts-ignore — dynamic key access
  const stepTitle = t[currentStep?.titleKey] || '';
  // @ts-ignore
  const stepBody = t[currentStep?.bodyKey] || '';

  return (
    <div className="w-[22rem] max-h-[calc(100vh-180px)] bg-black/75 border border-white/10 rounded-2xl shadow-2xl z-20 backdrop-blur-md flex flex-col animate-in fade-in-0 slide-in-from-right-5 duration-300"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/5">
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

        {/* Step dots */}
        <div className="flex items-center gap-1.5 mt-3">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === demoPhase
                  ? 'w-6 bg-cyan-400'
                  : i < demoPhase
                  ? 'w-3 bg-cyan-400/40'
                  : 'w-3 bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <h4 className="text-sm font-bold text-slate-100 mb-2">{stepTitle}</h4>
        <p className="text-xs text-slate-300 leading-relaxed">{stepBody}</p>

        {/* View Mode Switcher */}
        <div className="mt-5 p-3 rounded-xl bg-white/[0.03] border border-white/5">
          <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-2">
            {isZh ? '视角切换' : 'View Mode'}
          </p>
          <div className="flex gap-1.5">
            {(['universe', 'starry', 'split'] as DemoViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => onSwitchView(mode)}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-medium border transition-all cursor-pointer ${
                  viewMode === mode
                    ? getThemeBtn(theme)
                    : 'bg-transparent border-white/5 text-slate-400 hover:border-white/15 hover:text-slate-200'
                }`}
              >
                {mode === 'universe' && t.viewPrinciple}
                {mode === 'starry' && t.viewObservation}
                {mode === 'split' && t.viewCompare}
              </button>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={onTogglePlay}
            className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
              isPlaying
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : getThemeBtnSolid(theme)
            }`}
          >
            {isPlaying ? t.demoPause : t.demoPlay}
          </button>
        </div>
      </div>

      {/* Footer: Prev/Next */}
      <div className="px-4 py-3 border-t border-white/5 flex items-center gap-2">
        <button
          onClick={onPrevStep}
          disabled={!hasPrev}
          className={`px-3 py-2 rounded-lg text-[11px] font-medium border transition-all cursor-pointer ${
            hasPrev
              ? 'border-white/10 text-slate-300 hover:border-white/25 hover:bg-white/5'
              : 'border-white/5 text-slate-600 cursor-not-allowed'
          }`}
        >
          {t.prevStep}
        </button>
        <button
          onClick={onNextStep}
          disabled={!hasNext}
          className={`flex-1 py-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
            hasNext
              ? getThemeBtnSolid(theme)
              : 'bg-white/5 border-white/5 text-slate-600 cursor-not-allowed'
          }`}
        >
          {hasNext ? t.nextStep : isZh ? '已完成' : 'Complete'}
        </button>
      </div>
    </div>
  );
}
