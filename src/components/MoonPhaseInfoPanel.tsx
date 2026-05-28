/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { translations } from '../i18n';
import { MOON_PHASES } from '../data/moonPhases';
import type { ThemeType } from '../types/astronomy';

type MoonPhaseTab = 'knowledge' | 'poetry';

interface MoonPhaseInfoPanelProps {
  lang: 'zh' | 'en';
  theme: ThemeType;
  selectedPhaseIndex: number;
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

const getThemeTabActive = (theme: ThemeType) => {
  switch (theme) {
    case 'space-tech': return 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300';
    case 'cosmic-dark': return 'bg-amber-500/15 border-amber-500/40 text-amber-300';
    case 'neon-hologram': return 'bg-fuchsia-500/15 border-fuchsia-500/40 text-fuchsia-300';
    case 'solar-gold': return 'bg-orange-500/15 border-orange-500/40 text-orange-300';
  }
};

export default function MoonPhaseInfoPanel({
  lang,
  theme,
  selectedPhaseIndex,
  onClose,
}: MoonPhaseInfoPanelProps) {
  const t = translations[lang];
  const isZh = lang === 'zh';
  const phase = MOON_PHASES[selectedPhaseIndex];
  const [activeTab, setActiveTab] = useState<MoonPhaseTab>('knowledge');

  if (!phase) return null;

  const tabs: { key: MoonPhaseTab; label: string }[] = [
    { key: 'knowledge', label: t.moonPhaseKnowledge },
    { key: 'poetry', label: t.moonPhasePoetry },
  ];

  return (
    <div className="w-[22rem] bg-black/75 border border-white/10 rounded-2xl shadow-2xl z-20 backdrop-blur-md flex flex-col animate-in fade-in-0 slide-in-from-right-5 duration-300">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{phase.icon}</span>
            <div>
              <h3 className={`text-sm font-bold ${getThemeAccent(theme)}`}>
                {(t as any)[phase.nameKey] || phase.nameKey}
              </h3>
              <p className="text-[10px] text-slate-500">
                {isZh ? `第${phase.index + 1}个月相 · 共8个` : `Phase ${phase.index + 1} of 8`}
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

      {/* Tabs */}
      <div className="px-4 pt-3 pb-2">
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
      </div>

      {/* Tab Content */}
      <div className="px-4 pb-4 min-h-[16rem]">
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
    </div>
  );
}
