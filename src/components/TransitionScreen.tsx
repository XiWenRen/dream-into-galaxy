import React, { useEffect, useState, useMemo } from 'react';
import { translations, transitionFactList, transitionTipList } from '../i18n';

import { SATELLITE_CATALOG } from '../engine/SatelliteData';

interface TransitionScreenProps {
  direction: 'toStarry' | 'toUniverse';
  lang: 'zh' | 'en';
  theme: 'space-tech' | 'cosmic-dark' | 'neon-hologram' | 'solar-gold';
  planetId?: string;
}

function getObserverBodyName(observerId: string, lang: 'zh' | 'en'): string {
  const sat = SATELLITE_CATALOG.find(s => s.id === observerId);
  if (sat) {
    return lang === 'zh' ? sat.nameZh : sat.nameEn;
  }
  switch (observerId) {
    case 'sun': return lang === 'zh' ? '太阳' : 'Sun';
    case 'mercury': return lang === 'zh' ? '水星' : 'Mercury';
    case 'venus': return lang === 'zh' ? '金星' : 'Venus';
    case 'earth': return lang === 'zh' ? '地球' : 'Earth';
    case 'moon': return lang === 'zh' ? '月球' : 'Moon';
    case 'mars': return lang === 'zh' ? '火星' : 'Mars';
    case 'jupiter': return lang === 'zh' ? '木星' : 'Jupiter';
    case 'saturn': return lang === 'zh' ? '土星' : 'Saturn';
    case 'uranus': return lang === 'zh' ? '天王星' : 'Uranus';
    case 'neptune': return lang === 'zh' ? '海王星' : 'Neptune';
    default: return observerId;
  }
}

function getTelemetryStep(progress: number, direction: 'toStarry' | 'toUniverse', lang: 'zh' | 'en'): string {
  if (direction === 'toStarry') {
    if (progress < 15) {
      return lang === 'zh' ? '步骤 1/6：离轨制动，近拱点修正中' : 'STAGE 1/6: Deorbit Burn, Periapsis Correction...';
    } else if (progress < 35) {
      return lang === 'zh' ? '步骤 2/6：切入大气层，气动阻力与热防护' : 'STAGE 2/6: Atmospheric Entry, Heat Shield Active...';
    } else if (progress < 55) {
      return lang === 'zh' ? '步骤 3/6：气动减速，超音速降落伞部署' : 'STAGE 3/6: Parachute Deploy & Drag Deceleration...';
    } else if (progress < 75) {
      return lang === 'zh' ? '步骤 4/6：动力反推点火，实时高度校准' : 'STAGE 4/6: Powered Descent, Retro-Rocket Ignition...';
    } else if (progress < 90) {
      return lang === 'zh' ? '步骤 5/6：地表悬停避障，着陆架展开' : 'STAGE 5/6: Terminal Hover, Landing Gear Extended...';
    } else {
      return lang === 'zh' ? '步骤 6/6：触地成功，数据链同步与初始化' : 'STAGE 6/6: Touchdown! Syncing Observational Data...';
    }
  } else {
    if (progress < 15) {
      return lang === 'zh' ? '步骤 1/6：锁紧架释放，一级发动机起飞点火' : 'STAGE 1/6: Pad Release & Stage 1 Ignition...';
    } else if (progress < 35) {
      return lang === 'zh' ? '步骤 2/6：强力攀升，穿越最大动压区 (Max-Q)' : 'STAGE 2/6: Speed Transonic, Passing Max-Q...';
    } else if (progress < 55) {
      return lang === 'zh' ? '步骤 3/6：一级火箭分离，二级发动机点火启动' : 'STAGE 3/6: Stage 1 Separation, Vacuum Engine Start...';
    } else if (progress < 75) {
      return lang === 'zh' ? '步骤 4/6：抛离整流罩，航天器插入霍曼转移轨道' : 'STAGE 4/6: Fairing Jettison, Orbit Insertion...';
    } else if (progress < 90) {
      return lang === 'zh' ? '步骤 5/6：逃逸引擎加速，正在脱离星球引力阱' : 'STAGE 5/6: Escape Maneuver, Escaping Gravity Well...';
    } else {
      return lang === 'zh' ? '步骤 6/6：进入预定黄道轨道，太阳能帆板展开' : 'STAGE 6/6: Trajectory Stable, Deploying Solar Arrays...';
    }
  }
}

export default function TransitionScreen({
  direction,
  lang,
  theme,
  planetId = 'earth',
}: TransitionScreenProps) {
  const [progress, setProgress] = useState(0);
  const t = translations[lang];
  const planetName = getObserverBodyName(planetId, lang);
  const stepText = getTelemetryStep(progress, direction, lang);

  // Randomly select either a Tip or a Fact for this transition
  const chosenTip = useMemo(() => {
    const isFact = Math.random() > 0.5;
    const list = isFact ? transitionFactList[lang] : transitionTipList[lang];
    const title = isFact ? t.transitionFactTitle : t.transitionTipTitle;
    const text = list[Math.floor(Math.random() * list.length)];
    return { title, text };
  }, [lang, t]);

  // Simulate progress bar loading over 2.5 seconds
  useEffect(() => {
    const duration = 2500;
    const intervalTime = 20;
    const step = 100 / (duration / intervalTime);
    
    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + step;
        if (next >= 100) {
          clearInterval(timer);
          return 100;
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, []);

  // Theme-specific colors
  const themeConfig = useMemo(() => {
    switch (theme) {
      case 'cosmic-dark':
        return {
          glowColor: 'rgba(245, 158, 11, 0.4)',
          accentText: 'text-amber-400',
          accentBorder: 'border-amber-500/30',
          progressBg: 'from-amber-600 via-amber-400 to-yellow-300',
          rocketColor: '#fbbf24', // amber-400
        };
      case 'neon-hologram':
        return {
          glowColor: 'rgba(217, 70, 239, 0.4)',
          accentText: 'text-fuchsia-400',
          accentBorder: 'border-fuchsia-500/30',
          progressBg: 'from-fuchsia-600 via-fuchsia-400 to-pink-300',
          rocketColor: '#e879f9', // fuchsia-400
        };
      case 'solar-gold':
        return {
          glowColor: 'rgba(249, 115, 22, 0.4)',
          accentText: 'text-orange-400',
          accentBorder: 'border-orange-500/30',
          progressBg: 'from-orange-600 via-orange-400 to-amber-300',
          rocketColor: '#fb923c', // orange-400
        };
      case 'space-tech':
      default:
        return {
          glowColor: 'rgba(6, 182, 212, 0.4)',
          accentText: 'text-cyan-400',
          accentBorder: 'border-cyan-500/30',
          progressBg: 'from-cyan-600 via-cyan-400 to-blue-400',
          rocketColor: '#22d3ee', // cyan-400
        };
    }
  }, [theme]);

  // Render Title and Subtitle based on direction
  const titleText = useMemo(() => {
    if (direction === 'toStarry') {
      return t.transitionEnteringGround.replace('{planet}', planetName);
    } else {
      return t.transitionEnteringSpace;
    }
  }, [direction, planetName, t]);

  // Generate dynamic stars for space-warp background
  const warpStars = useMemo(() => {
    return Array.from({ length: 30 }).map(() => ({
      top: Math.random() * 100 + '%',
      left: Math.random() * 100 + '%',
      delay: Math.random() * 2 + 's',
      duration: Math.random() * 1.5 + 0.8 + 's',
      scale: Math.random() * 0.8 + 0.3,
    }));
  }, []);

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#030307] select-none overflow-hidden font-sans">
      <style>{`
        /* Star warp animation */
        @keyframes starWarp {
          0% {
            transform: scale(0.2) translate(0, 0);
            opacity: 0;
          }
          20% {
            opacity: 0.8;
          }
          100% {
            transform: scale(3) translate(var(--dx, 20px), var(--dy, 20px));
            opacity: 0;
          }
        }
        .warp-star {
          animation: starWarp linear infinite;
        }

        /* Rocket launch thrust fire pulse */
        @keyframes firePulse {
          0%, 100% { transform: scale(1) translateY(0); opacity: 0.9; }
          50% { transform: scale(1.3) translateY(2px); opacity: 1; }
        }
        .thrust-fire {
          animation: firePulse 0.15s ease-in-out infinite;
        }

        /* Rocket takeoff spiral out and fly away to top-right */
        @keyframes rocketTakeoff {
          0% {
            transform: rotate(0deg) translate(0px) rotate(0deg) scale(0.5);
            opacity: 0.3;
          }
          15% {
            opacity: 1;
          }
          30% {
            transform: rotate(90deg) translate(40px) rotate(-90deg) scale(0.7);
          }
          55% {
            transform: rotate(180deg) translate(65px) rotate(-180deg) scale(0.9);
          }
          75% {
            transform: rotate(270deg) translate(80px) rotate(-270deg) scale(1.1);
            opacity: 1;
          }
          100% {
            transform: translate(140px, -140px) rotate(-45deg) scale(0.2);
            opacity: 0;
          }
        }
        .rocket-takeoff {
          animation: rocketTakeoff 2.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }

        /* Rocket landing spiral */
        @keyframes rocketLanding {
          0% {
            transform: rotate(0deg) translate(80px) rotate(0deg) scale(1.1);
          }
          100% {
            transform: rotate(360deg) translate(0px) rotate(-360deg) scale(0.5);
          }
        }
        .rocket-landing {
          animation: rocketLanding 2.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }

        /* Ambient light drift */
        @keyframes nebulaDrift {
          0%, 100% { transform: translate(-10%, -10%) scale(1); }
          50% { transform: translate(10%, 10%) scale(1.2); }
        }
        .nebula-glow {
          animation: nebulaDrift 8s ease-in-out infinite;
        }
      `}</style>

      {/* Dynamic ambient nebulas */}
      <div 
        className="absolute w-[500px] h-[500px] rounded-full filter blur-[100px] opacity-20 nebula-glow pointer-events-none" 
        style={{
          background: `radial-gradient(circle, ${themeConfig.glowColor} 0%, transparent 70%)`,
          left: '10%',
          top: '10%',
        }}
      />
      <div 
        className="absolute w-[400px] h-[400px] rounded-full filter blur-[90px] opacity-15 nebula-glow pointer-events-none" 
        style={{
          background: `radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)`,
          right: '15%',
          bottom: '10%',
          animationDelay: '-4s',
        }}
      />

      {/* Warp star field */}
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        {warpStars.map((star, i) => {
          // Angle of motion radiating outwards
          const angle = (i * 360) / warpStars.length;
          const rad = (angle * Math.PI) / 180;
          const distance = 150; // max displacement px
          const dx = Math.cos(rad) * distance + 'px';
          const dy = Math.sin(rad) * distance + 'px';

          return (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full warp-star"
              style={{
                top: star.top,
                left: star.left,
                animationDelay: star.delay,
                animationDuration: star.duration,
                '--dx': dx,
                '--dy': dy,
              } as React.CSSProperties}
            />
          );
        })}
      </div>

      {/* Center Animation Scene */}
      <div className="relative w-48 h-48 mb-8 flex items-center justify-center">
        {direction === 'toStarry' ? (
          /* LANDING ANIMATION: Spiral orbits and land on a grid planet */
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Target planet sphere */}
            <div 
              className={`w-16 h-16 rounded-full bg-slate-950 border border-white/20 flex items-center justify-center relative shadow-[0_0_30px_rgba(255,255,255,0.05)]`}
              style={{ boxShadow: `0 0 35px ${themeConfig.glowColor}` }}
            >
              {/* Planetary grid lines */}
              <div className="absolute inset-0 rounded-full border border-white/5 border-dashed" />
              <div className="absolute inset-y-0 left-1/2 w-[1px] bg-white/10" />
              <div className="absolute inset-x-0 top-1/2 h-[1px] bg-white/10" />
              <span className={`text-[10px] uppercase font-mono font-bold tracking-widest ${themeConfig.accentText}`}>
                {planetName ? planetName.slice(-2) : 'OBS'}
              </span>
            </div>

            {/* Dash spiral orbit line */}
            <svg className="absolute w-40 h-40 opacity-20" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 3" />
              <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
            </svg>

            {/* Rocket spiraling in */}
            <div className="absolute rocket-landing flex flex-col items-center">
              <svg 
                className="w-8 h-8 -rotate-45" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke={themeConfig.rocketColor} 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                style={{ filter: `drop-shadow(0 0 8px ${themeConfig.rocketColor})` }}
              >
                <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
                <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
              </svg>
              {/* Flame tail */}
              {progress < 90 && (
                <div className="w-1.5 h-4 bg-gradient-to-t from-transparent via-orange-500 to-yellow-400 rounded-full thrust-fire mt-0.5" />
              )}
            </div>
          </div>
        ) : (
          /* TAKEOFF ANIMATION: Orbiting and flying away from a planet */
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Origin planet sphere */}
            <div 
              className={`w-16 h-16 rounded-full bg-slate-950 border border-white/20 flex items-center justify-center relative shadow-[0_0_30px_rgba(255,255,255,0.05)]`}
              style={{ boxShadow: `0 0 35px ${themeConfig.glowColor}` }}
            >
              {/* Planetary grid lines */}
              <div className="absolute inset-0 rounded-full border border-white/5 border-dashed" />
              <div className="absolute inset-y-0 left-1/2 w-[1px] bg-white/10" />
              <div className="absolute inset-x-0 top-1/2 h-[1px] bg-white/10" />
              <span className={`text-[10px] uppercase font-mono font-bold tracking-widest ${themeConfig.accentText}`}>
                {planetName ? planetName.slice(-2) : 'OBS'}
              </span>
            </div>

            {/* Dash spiral orbit line */}
            <svg className="absolute w-40 h-40 opacity-20" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 3" />
              <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
            </svg>

            {/* Rocket spiraling out */}
            <div className="absolute rocket-takeoff flex flex-col items-center">
              <svg 
                className="w-8 h-8 -rotate-45" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke={themeConfig.rocketColor} 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                style={{ filter: `drop-shadow(0 0 8px ${themeConfig.rocketColor})` }}
              >
                <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
                <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
              </svg>
              {/* Flame tail */}
              <div className="w-1.5 h-4 bg-gradient-to-t from-transparent via-orange-500 to-yellow-400 rounded-full thrust-fire mt-0.5" />
            </div>
          </div>
        )}
      </div>

      {/* Progress Card (Glassmorphism) */}
      <div className={`backdrop-blur-md bg-white/[0.02] border ${themeConfig.accentBorder} rounded-2xl p-6 max-w-lg w-[85%] shadow-[0_0_40px_rgba(0,0,0,0.6)] flex flex-col items-center text-center z-10 transition-all duration-300`}>
        {/* Title */}
        <h2 className="text-base font-bold font-mono tracking-widest text-white uppercase mb-2 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
          {titleText}
        </h2>

        {/* Telemetry Step Indicator */}
        <div className={`text-[10px] font-mono font-bold uppercase tracking-wider mb-4 ${themeConfig.accentText} min-h-[1.5em] px-4`}>
          {stepText}
        </div>

        {/* Simulated linear progress bar */}
        <div className="w-full h-1.5 bg-slate-900/90 rounded-full overflow-hidden mb-2.5 border border-white/5 relative">
          <div
            className={`h-full bg-gradient-to-r ${themeConfig.progressBg} rounded-full transition-all duration-100 ease-out shadow-[0_0_10px_rgba(34,211,238,0.3)]`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Progress percent */}
        <span className="text-[10px] font-mono text-slate-400 mb-6 uppercase tracking-widest">
          Telemetry Status: <span className={`font-bold ${themeConfig.accentText}`}>{Math.round(progress)}%</span>
        </span>

        {/* Divider */}
        <div className="w-12 h-[1px] bg-white/10 mb-4" />

        {/* Localized Tip / Fact Display */}
        <div className="flex flex-col items-center">
          <span className={`text-[10px] font-bold font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-white/5 border border-white/10 ${themeConfig.accentText} mb-2`}>
            {chosenTip.title}
          </span>
          <p className="text-xs text-slate-300 leading-relaxed font-sans max-w-sm">
            {chosenTip.text}
          </p>
        </div>
      </div>
    </div>
  );
}
