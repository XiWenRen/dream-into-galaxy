/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { translations } from '../i18n';
import { getThemeBtn, getThemeAccent, getThemeBtnSolid } from '../utils/themeStyles';
import type { PhenomenonId, DemoViewMode, ThemeType } from '../types/astronomy';

interface PhenomenaDemoBarProps {
  lang: 'zh' | 'en';
  theme: ThemeType;
  activePhenomenon: PhenomenonId;
  demoPhase: number;
  totalSteps: number;
  viewMode: DemoViewMode;
  isPlaying: boolean;
  playbackSpeed: number;
  onNextStep: () => void;
  onPrevStep: () => void;
  onTogglePlay: () => void;
  onChangeSpeed: (speed: number) => void;
  onSwitchView: (mode: DemoViewMode) => void;
  onExitDemo: () => void;
  onSelectPhase?: (phase: number) => void;
}


const SPEED_OPTIONS = [
  { value: 0.5, labelZh: '慢速', labelEn: 'Slow' },
  { value: 1, labelZh: '正常', labelEn: 'Normal' },
  { value: 2, labelZh: '快速', labelEn: 'Fast' },
];

// Keyframe labels per phenomenon
const KEYFRAME_LABELS: Record<PhenomenonId, string[]> = {
  'moon-phases': ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'],
  'eclipses': ['☀️', '🌑', '🌍', '🌕'],
  'retrograde': ['1', '2', '3'],
  'solar-terms': ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24'],
};

export default function PhenomenaDemoBar({
  lang,
  theme,
  activePhenomenon,
  demoPhase,
  totalSteps,
  viewMode,
  isPlaying,
  playbackSpeed,
  onNextStep,
  onPrevStep,
  onTogglePlay,
  onChangeSpeed,
  onSwitchView,
  onExitDemo,
  onSelectPhase,
}: PhenomenaDemoBarProps) {
  const t = translations[lang];
  const isZh = lang === 'zh';

  const keyframes = KEYFRAME_LABELS[activePhenomenon] || [];

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-black/70 border border-white/10 rounded-xl backdrop-blur-md shadow-2xl pointer-events-auto">
      {/* Exit button */}
      <button
        onClick={onExitDemo}
        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
        title={t.demoExit}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M18 6 6 18" /><path d="m6 6 12 12" />
        </svg>
      </button>

      <div className="w-px h-5 bg-white/10" />

      {/* Prev/Next step */}
      <button
        onClick={onPrevStep}
        disabled={demoPhase <= 0}
        className="p-1.5 rounded-lg text-slate-300 hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
        title={t.prevStep}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      {/* Keyframe dots */}
      <div className="flex items-center gap-1">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <button
            key={i}
            onClick={() => onSelectPhase?.(i)}
            className={`w-7 h-7 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center justify-center ${
              i === demoPhase
                ? getThemeBtn(theme)
                : i < demoPhase
                ? 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                : 'bg-transparent border-white/5 text-slate-500 hover:border-white/15 hover:text-slate-300'
            }`}
            title={`${t.stepIndicator.replace('{{current}}', String(i + 1)).replace('{{total}}', String(totalSteps))}`}
          >
            {keyframes[i] || String(i + 1)}
          </button>
        ))}
      </div>

      <button
        onClick={onNextStep}
        disabled={demoPhase >= totalSteps - 1}
        className="p-1.5 rounded-lg text-slate-300 hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
        title={t.nextStep}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>

      <div className="w-px h-5 bg-white/10" />

      {/* Play/Pause */}
      <button
        onClick={onTogglePlay}
        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
          isPlaying
            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
            : getThemeBtnSolid(theme)
        }`}
      >
        {isPlaying ? (
          <>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
            {t.demoPause}
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
            {t.demoPlay}
          </>
        )}
      </button>

      {/* Speed selector */}
      <div className="flex items-center gap-0.5">
        {SPEED_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChangeSpeed(opt.value)}
            className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all cursor-pointer ${
              playbackSpeed === opt.value
                ? getThemeBtn(theme)
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            {isZh ? opt.labelZh : opt.labelEn}
          </button>
        ))}
      </div>

      <div className="w-px h-5 bg-white/10" />

      {/* View mode switcher (split mode hidden until implemented) */}
      <div className="flex items-center gap-0.5">
        {(['universe', 'starry'] as DemoViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => onSwitchView(mode)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all cursor-pointer ${
              viewMode === mode
                ? getThemeBtn(theme)
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            {mode === 'universe' && t.viewPrinciple}
            {mode === 'starry' && t.viewObservation}
          </button>
        ))}
      </div>
    </div>
  );
}
