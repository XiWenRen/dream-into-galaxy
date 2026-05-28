/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { translations } from '../i18n';
import { getThemeBtn, getThemeAccent } from '../utils/themeStyles';
import type { PhenomenonId, ThemeType } from '../types/astronomy';

interface AstroPhenomenaPanelProps {
  lang: 'zh' | 'en';
  theme: ThemeType;
  isOpen: boolean;
  onToggle: () => void;
  onSelectPhenomenon: (id: PhenomenonId) => void;
  activePhenomenon: PhenomenonId | null;
}

interface PhenomenonCard {
  id: PhenomenonId;
  icon: string;
  color: string;
  glowColor: string;
}

const PHENOMENA: PhenomenonCard[] = [
  {
    id: 'moon-phases',
    icon: '🌙',
    color: 'from-slate-700 to-slate-900',
    glowColor: 'shadow-slate-500/20',
  },
  {
    id: 'eclipses',
    icon: '🌑',
    color: 'from-red-900 to-slate-900',
    glowColor: 'shadow-red-500/20',
  },
  {
    id: 'solar-terms',
    icon: '📅',
    color: 'from-cyan-900 to-slate-900',
    glowColor: 'shadow-cyan-500/20',
  },
];


export default function AstroPhenomenaPanel({
  lang,
  theme,
  isOpen,
  onToggle,
  onSelectPhenomenon,
  activePhenomenon,
}: AstroPhenomenaPanelProps) {
  const t = translations[lang];
  const isZh = lang === 'zh';

  const phenomenonName = (id: PhenomenonId) => {
    switch (id) {
      case 'moon-phases': return t.phenomenaMoonPhases;
      case 'eclipses': return t.phenomenaEclipses;
      case 'retrograde': return t.phenomenaRetrograde;
      case 'solar-terms': return t.phenomenaSolarTerms;
    }
  };

  const phenomenonDesc = (id: PhenomenonId) => {
    switch (id) {
      case 'moon-phases': return t.phenomenaDescMoonPhases;
      case 'eclipses': return t.phenomenaDescEclipses;
      case 'retrograde': return t.phenomenaDescRetrograde;
      case 'solar-terms': return t.phenomenaDescSolarTerms;
    }
  };

  const ageRange = (id: PhenomenonId) => {
    switch (id) {
      case 'moon-phases': return isZh ? '6-10岁' : 'Ages 6-10';
      case 'eclipses': return isZh ? '8-12岁' : 'Ages 8-12';
      case 'retrograde': return isZh ? '10-14岁' : 'Ages 10-14';
      case 'solar-terms': return isZh ? '全年龄' : 'All Ages';
    }
  };

  return (
    <>
      {/* Toggle Button — floating pill on top edge */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-40 h-10 overflow-hidden pt-1 flex items-start group">
        <button
          onClick={onToggle}
          className={`flex items-center gap-2 px-6 py-1.5 rounded-b-2xl border border-t-0 backdrop-blur-md cursor-pointer transition-all duration-300 transform origin-top shadow-xl
            ${isOpen ? getThemeBtn(theme) : 'bg-black/60 border-white/20 text-slate-300 hover:bg-black/80 -translate-y-3 opacity-60 group-hover:translate-y-0 group-hover:opacity-100'}
          `}
          title={t.phenomenaTitle}
        >
          <span className="text-[11px] font-bold tracking-widest uppercase">
            {t.phenomenaTitle}
          </span>
          <span className="text-[10px]">{isOpen ? '▲' : '▼'}</span>
        </button>
      </div>

      {/* Drawer Panel */}
      <div
        className={`absolute top-0 left-1/2 -translate-x-1/2 w-[600px] max-w-[95vw] z-30 transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="w-full bg-[#050608]/95 backdrop-blur-xl border border-t-0 border-white/10 rounded-b-3xl flex flex-col pt-10 pb-5 px-6 shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
            <span className="text-xl">🔭</span>
            <h2 className={`text-sm font-bold tracking-wide ${getThemeAccent(theme)}`}>
              {t.phenomenaTitle}
            </h2>
            <p className="text-[10px] text-slate-500 ml-2">
              {isZh ? '选择天文现象，探索宇宙奥秘' : 'Pick a phenomenon to explore'}
            </p>
          </div>

          {/* Cards */}
          <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {PHENOMENA.map((p) => {
              const isActive = activePhenomenon === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => onSelectPhenomenon(p.id)}
                  className={`relative flex-shrink-0 w-44 text-left group overflow-hidden rounded-xl border transition-all duration-300 cursor-pointer ${
                    isActive
                      ? `border-${p.glowColor.split('-')[1]}-500/50 bg-gradient-to-br ${p.color} ${p.glowColor} scale-[1.02]`
                      : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20'
                  }`}
                >
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl drop-shadow-lg">{p.icon}</span>
                        <span className={`text-[12px] font-bold ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                          {phenomenonName(p.id)}
                        </span>
                      </div>
                      {isActive && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-white/10 text-white/80">
                          {isZh ? '演示中' : 'Active'}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 leading-relaxed line-clamp-2">
                      {phenomenonDesc(p.id)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer hint */}
          <div className="mt-2 text-[9px] text-slate-600 text-center">
            {isZh
              ? '每个现象都有"原理"和"观测"两种视角'
              : 'Each phenomenon has Principle & Observation views'}
          </div>
        </div>
      </div>
    </>
  );
}
