/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { translations } from '../i18n';

interface SystemPanelProps {
  lang: 'zh' | 'en';
  selectedPlanetId: string;
  helioX: number;
  helioY: number;
  helioZ: number;
}

// ─── Icons ──────────────────────────────────────────────────────────────────

const IconChevronUp = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m18 15-6-6-6 6" />
  </svg>
);

const IconChevronDown = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const IconCpu = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <rect x="9" y="9" width="6" height="6" />
    <path d="M15 2v2" /><path d="M15 20v2" /><path d="M9 2v2" /><path d="M9 20v2" />
    <path d="M2 15h2" /><path d="M2 9h2" /><path d="M20 15h2" /><path d="M20 9h2" />
  </svg>
);

const IconTarget = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
  </svg>
);

const IconOrbit = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" opacity="0.3" />
    <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
    <path d="M2 12h2" /><path d="M20 12h2" />
  </svg>
);

const IconGlobe = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

// ─── Component ──────────────────────────────────────────────────────────────

export default function SystemPanel({
  lang,
  selectedPlanetId,
  helioX,
  helioY,
  helioZ,
}: SystemPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isZh = lang === 'zh';
  const t = translations[lang];

  return (
    <div className="flex flex-col items-center">
      {/* Expand/collapse trigger */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 px-3 py-1 rounded-t-lg bg-slate-950/70 border border-slate-800/60 border-b-0 backdrop-blur-md text-[9px] font-mono text-slate-500 hover:text-cyan-400 transition-colors cursor-pointer"
        title={isExpanded ? t.collapse : t.expand}
      >
        {isExpanded ? <IconChevronDown className="w-3 h-3" /> : <IconChevronUp className="w-3 h-3" />}
        <span>{isExpanded ? t.systemInfo : t.systemInfo}</span>
        {!isExpanded && <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />}
      </button>

      {/* Expanded panel */}
      {isExpanded && (
        <div className="bg-slate-950/85 border border-slate-800/60 backdrop-blur-md rounded-t-xl px-5 py-2.5 shadow-2xl"
          style={{ minWidth: 'min(90vw, 800px)' }}
        >
          <div className="flex items-center justify-between gap-6 text-[10px] uppercase font-mono tracking-widest text-white/40">
            {/* Left: System status */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <IconCpu className="w-3 h-3 text-green-500/70" />
                <span>{isZh ? 'WebGL GPU 加速' : 'WebGL GPU ACCELERATED'}</span>
              </div>
              <span className="text-white/10">|</span>
              <div className="flex items-center gap-1.5">
                <IconTarget className="w-3 h-3 text-cyan-500/50" />
                <span>{isZh ? '视角' : 'VIEW'}: {selectedPlanetId}</span>
              </div>
              <span className="text-white/10">|</span>
              <div className="flex items-center gap-1.5">
                <IconOrbit className="w-3 h-3 text-indigo-400/50" />
                <span>{isZh ? 'J2000 高精度轨道' : 'J2000 DEEP ORBIT'}</span>
              </div>
            </div>

            {/* Right: Heliocentric coordinates */}
            <div className="flex items-center gap-3 text-cyan-400/70">
              <IconGlobe className="w-3 h-3" />
              <span className="text-white/20 lowercase italic">{isZh ? '日地轨道' : 'Heliocentric'} [j2000]:</span>
              <span>X {helioX.toFixed(4)}</span>
              <span>Y {helioY.toFixed(4)}</span>
              <span>Z {helioZ.toFixed(4)} AU</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
