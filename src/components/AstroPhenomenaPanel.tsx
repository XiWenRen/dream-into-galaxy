/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { translations } from '../i18n';
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
    id: 'retrograde',
    icon: '➰',
    color: 'from-amber-900 to-slate-900',
    glowColor: 'shadow-amber-500/20',
  },
  {
    id: 'solar-terms',
    icon: '📅',
    color: 'from-cyan-900 to-slate-900',
    glowColor: 'shadow-cyan-500/20',
  },
];

const getThemeAccent = (theme: ThemeType) => {
  switch (theme) {
    case 'space-tech': return 'text-cyan-400 border-cyan-500/30 hover:border-cyan-400/60';
    case 'cosmic-dark': return 'text-amber-400 border-amber-500/30 hover:border-amber-400/60';
    case 'neon-hologram': return 'text-fuchsia-400 border-fuchsia-500/30 hover:border-fuchsia-400/60';
    case 'solar-gold': return 'text-orange-400 border-orange-500/30 hover:border-orange-400/60';
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
      {/* Toggle Button — floating pill on left edge */}
      <button
        onClick={onToggle}
        className={`absolute left-0 top-1/2 -translate-y-1/2 z-40 flex items-center gap-1.5 px-2 py-3 rounded-r-xl border border-l-0 backdrop-blur-md cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 ${
          isOpen ? getThemeBtn(theme) : 'bg-black/60 border-white/10 text-slate-300 hover:bg-black/80'
        }`}
        style={{ writingMode: 'vertical-rl' as any }}
        title={t.phenomenaTitle}
      >
        <span className="text-sm">{isOpen ? '◀' : '▶'}</span>
        <span className="text-[10px] font-bold tracking-widest uppercase">
          {t.phenomenaTitle}
        </span>
      </button>

      {/* Drawer Panel */}
      <div
        className={`absolute left-0 top-0 h-full z-30 transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full w-72 bg-[#050608]/95 backdrop-blur-xl border-r border-white/10 flex flex-col">
          {/* Header */}
          <div className="px-4 pt-5 pb-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔭</span>
              <h2 className={`text-sm font-bold tracking-wide ${getThemeAccent(theme).split(' ')[0]}`}>
                {t.phenomenaTitle}
              </h2>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              {isZh ? '选择天文现象，探索宇宙奥秘' : 'Pick a phenomenon to explore'}
            </p>
          </div>

          {/* Cards */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
            {PHENOMENA.map((p) => {
              const isActive = activePhenomenon === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => onSelectPhenomenon(p.id)}
                  className={`w-full text-left rounded-xl border transition-all duration-200 cursor-pointer group overflow-hidden ${
                    isActive
                      ? `${getThemeBtn(theme)} shadow-[0_0_20px_rgba(6,182,212,0.15)]`
                      : 'bg-white/[0.03] border-white/5 hover:border-white/15 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className={`h-1.5 w-full bg-gradient-to-r ${p.color}`} />
                  <div className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl group-hover:scale-110 transition-transform duration-200">
                          {p.icon}
                        </span>
                        <div>
                          <h3 className={`text-xs font-bold ${isActive ? getThemeAccent(theme).split(' ')[0] : 'text-slate-200'}`}>
                            {phenomenonName(p.id)}
                          </h3>
                          <span className="text-[9px] text-slate-500">
                            {ageRange(p.id)}
                          </span>
                        </div>
                      </div>
                      {isActive && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/80">
                          {isZh ? '演示中' : 'Active'}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                      {phenomenonDesc(p.id)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer hint */}
          <div className="px-4 py-3 border-t border-white/5 text-[9px] text-slate-600 text-center">
            {isZh
              ? '每个现象都有"原理"和"观测"两种视角'
              : 'Each phenomenon has Principle & Observation views'}
          </div>
        </div>
      </div>
    </>
  );
}
