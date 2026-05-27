/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { translations } from '../i18n';
import { SOLAR_TERMS } from '../data/solarTerms';
import type { ThemeType } from '../types/astronomy';

interface SolarTermInfoPanelProps {
  lang: 'zh' | 'en';
  theme: ThemeType;
  selectedSolarTermIndex: number;
  onClose: () => void;
}

const getThemeAccent = (theme: ThemeType) => {
  switch (theme) {
    case 'space-tech': return 'text-cyan-400';
    case 'cosmic-dark': return 'text-amber-400';
    case 'neon-hologram': return 'text-fuchsia-400';
    case 'solar-gold': return 'text-orange-400';
  }
};

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

export default function SolarTermInfoPanel({
  lang,
  theme,
  selectedSolarTermIndex,
  onClose,
}: SolarTermInfoPanelProps) {
  const t = translations[lang];
  const term = SOLAR_TERMS[selectedSolarTermIndex];
  if (!term) return null;

  const isZh = lang === 'zh';

  return (
    <div className="w-[22rem] max-h-[calc(100vh-180px)] bg-black/75 border border-white/10 rounded-2xl shadow-2xl z-20 backdrop-blur-md flex flex-col animate-in fade-in-0 slide-in-from-right-5 duration-300">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📅</span>
            <div>
              <h3 className={`text-sm font-bold ${getThemeAccent(theme)}`}>
                {isZh ? term.nameZh : term.nameEn}
              </h3>
              <p className="text-[10px] text-slate-500">
                {isZh ? `第${term.index + 1}个节气` : `Term ${term.index + 1} of 24`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
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
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Basic Info */}
        <div className={`p-3 rounded-xl border ${getThemeBorder(theme)} ${getThemeBg(theme)}`}>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-500 block">{t.solarTermDateRange}</span>
              <span className="text-slate-200">{isZh ? term.dateRange : term.dateRangeEn}</span>
            </div>
            <div>
              <span className="text-slate-500 block">{t.solarTermEclipticLon}</span>
              <span className="text-slate-200">{term.eclipticLongitude}°</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500 block">{t.solarTermDirectLat}</span>
              <span className="text-slate-200">{isZh ? term.directLatDesc : term.directLatDescEn}</span>
            </div>
          </div>
        </div>

        {/* Phenology */}
        <div>
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            {t.solarTermPhenology}
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            {isZh ? term.phenology : term.phenologyEn}
          </p>
        </div>

        {/* Poetry */}
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span>🖋️</span> {t.solarTermPoetry}
          </h4>
          <div className="space-y-1">
            <p className={`text-xs font-bold ${getThemeAccent(theme)}`}>
              {isZh ? `《${term.poetry.title}》` : `"${term.poetry.titleEn}"`}
            </p>
            <p className="text-[10px] text-slate-500">
              {isZh
                ? `[${term.poetry.dynasty}] ${term.poetry.author}`
                : `${term.poetry.authorEn} (${term.poetry.dynastyEn})`
              }
            </p>
            <div className="mt-2 space-y-0.5">
              {(isZh ? term.poetry.lines : term.poetry.linesEn).map((line, i) => (
                <p key={i} className="text-xs text-slate-300 italic leading-relaxed">
                  {line}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* Customs */}
        <div>
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span>🎊</span> {t.solarTermCustoms}
          </h4>
          <ul className="space-y-1.5">
            {(isZh ? term.customs : term.customsEn).map((custom, i) => (
              <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                <span className="text-slate-500 mt-0.5">•</span>
                <span className="leading-relaxed">{custom}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Weather */}
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span>🌤️</span> {t.solarTermWeather}
          </h4>
          <div className="flex items-center gap-3 mb-1.5">
            <span className={`text-lg font-bold ${getThemeAccent(theme)}`}>
              {isZh ? term.weather.tempRange : term.weather.tempRangeEn}
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {isZh ? term.weather.desc : term.weather.descEn}
          </p>
        </div>
      </div>
    </div>
  );
}
