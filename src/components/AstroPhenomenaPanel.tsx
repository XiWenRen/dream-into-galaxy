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
    id: 'solar-terms',
    icon: '📅',
    color: 'from-cyan-900 to-slate-900',
    glowColor: 'shadow-cyan-500/20',
  },
];


export default function AstroPhenomenaPanel({
  lang,
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

  return (
    <div className="flex flex-col">
      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        <div className="grid grid-cols-1 gap-2">
          {PHENOMENA.map((p) => {
            const isActive = activePhenomenon === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onSelectPhenomenon(p.id)}
                className={`relative text-left group overflow-hidden rounded-xl border transition-all duration-300 cursor-pointer p-3 ${
                  isActive
                    ? `border-${p.glowColor.split('-')[1]}-500/50 bg-gradient-to-br ${p.color} ${p.glowColor}`
                    : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl drop-shadow-lg">{p.icon}</span>
                  <div className="flex-1 min-w-0">
                    <span className={`text-[12px] font-bold ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                      {phenomenonName(p.id)}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                      {phenomenonDesc(p.id)}
                    </p>
                  </div>
                  {isActive && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/80 shrink-0">
                      {isZh ? '演示中' : 'Active'}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2 text-[9px] text-slate-600 text-center border-t border-white/5 shrink-0">
        {isZh
          ? '每个现象都有"原理"和"观测"两种视角'
          : 'Each phenomenon has Principle & Observation views'}
      </div>
    </div>
  );
}
