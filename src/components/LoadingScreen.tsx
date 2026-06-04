import React, { useEffect, useRef, useState, useMemo } from 'react';
import { translations, transitionFactList, transitionTipList } from '../i18n';
import RocketFlame from './RocketFlame';

interface LoadingScreenProps {
  onLoadComplete?: () => void;
  onLaunch?: () => void;
  lang: 'zh' | 'en';
  theme: 'space-tech' | 'cosmic-dark' | 'neon-hologram' | 'solar-gold';
}

const BACKGROUND_IMAGES = [
  'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?q=80&w=2000', // Option C: Cold Void Nebula
  'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=2000', // Andromeda Deep Field
  'https://images.unsplash.com/photo-1543722530-d2c3201371e7?q=80&w=2000', // Deep Violet Cosmic Cloud
  'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?q=80&w=2000', // Dark Orion Dust
  'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=2000'  // Dark Cosmic Dust
];

export default function LoadingScreen({ onLoadComplete, onLaunch, lang, theme }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [showStartBtn, setShowStartBtn] = useState(false);
  
  // Knowledge carousel state
  const [chosenTip, setChosenTip] = useState({ title: '', text: '' });
  const [factOpacity, setFactOpacity] = useState(1);
  const [factChangeTrigger, setFactChangeTrigger] = useState(0);
  
  // Spacecraft launch state
  const [isLaunching, setIsLaunching] = useState(false);
  const launchStartTimeRef = useRef<number | null>(null);

  const onCompleteRef = useRef(onLoadComplete);
  onCompleteRef.current = onLoadComplete;

  const onLaunchRef = useRef(onLaunch);
  onLaunchRef.current = onLaunch;

  const t = translations[lang];

  // Generate 80 CSS stars for compositor-accelerated space warp
  const stars = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * 360;
      const delay = Math.random() * 2.5;
      const duration = 1.0 + Math.random() * 1.5;
      const travelDist = 40 + Math.random() * 40; // 40vmax to 80vmax
      const travelScale = 3 + Math.random() * 5;
      arr.push({
        id: i,
        style: {
          '--angle': `${angle}deg`,
          '--delay': `${-delay}s`,
          '--duration': `${duration}s`,
          '--travel-dist': `${travelDist}vmax`,
          '--travel-scale': travelScale,
        } as React.CSSProperties,
      });
    }
    return arr;
  }, []);

  // Theme configuration for accents
  const themeConfig = useMemo(() => {
    switch (theme) {
      case 'cosmic-dark':
        return {
          accentText: 'text-amber-400',
          accentBorder: 'border-amber-500/30',
          progressBg: 'from-amber-600 via-amber-400 to-yellow-300',
          glow: 'rgba(245, 158, 11, 0.4)',
          rocketColor: '#fbbf24',
        };
      case 'neon-hologram':
        return {
          accentText: 'text-fuchsia-400',
          accentBorder: 'border-fuchsia-500/30',
          progressBg: 'from-fuchsia-600 via-fuchsia-400 to-pink-300',
          glow: 'rgba(217, 70, 239, 0.4)',
          rocketColor: '#e879f9',
        };
      case 'solar-gold':
        return {
          accentText: 'text-orange-400',
          accentBorder: 'border-orange-500/30',
          progressBg: 'from-orange-600 via-orange-400 to-amber-300',
          glow: 'rgba(249, 115, 22, 0.4)',
          rocketColor: '#fb923c',
        };
      case 'space-tech':
      default:
        return {
          accentText: 'text-cyan-400',
          accentBorder: 'border-cyan-500/30',
          progressBg: 'from-cyan-600 via-cyan-400 to-blue-400',
          glow: 'rgba(6, 182, 212, 0.4)',
          rocketColor: '#22d3ee',
        };
    }
  }, [theme]);

  // Select a random background image once on component mount
  const backgroundImage = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * BACKGROUND_IMAGES.length);
    return BACKGROUND_IMAGES[randomIndex];
  }, []);

  // Telemetry list union
  const localizedFacts = useMemo(() => {
    return [...transitionFactList[lang], ...transitionTipList[lang]];
  }, [lang]);

  // Method to select a new fact
  const selectRandomFact = () => {
    const randomFact = localizedFacts[Math.floor(Math.random() * localizedFacts.length)];
    const isTipIndex = transitionTipList[lang].includes(randomFact);
    setChosenTip({
      title: isTipIndex ? t.transitionTipTitle : t.transitionFactTitle,
      text: randomFact
    });
  };

  // Immediate facts initialization and 5s rotation loop
  useEffect(() => {
    selectRandomFact();
    
    const interval = setInterval(() => {
      // Fade out
      setFactOpacity(0);
      
      setTimeout(() => {
        selectRandomFact();
        // Fade in
        setFactOpacity(1);
      }, 400); // Wait for fade-out to finish
    }, 5000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localizedFacts, factChangeTrigger]);

  // Simulate progress bar over 2.5s
  useEffect(() => {
    const duration = 2500;
    const intervalTime = 16;
    const step = 100 / (duration / intervalTime);

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + step;
        if (next >= 100) {
          clearInterval(timer);
          setShowStartBtn(true);
          return 100;
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, []);



  // Handle spacecraft button click
  const handleLaunch = () => {
    if (isLaunching) return;
    setIsLaunching(true);
    launchStartTimeRef.current = Date.now();

    // Start background camera entry animation immediately on click
    onLaunchRef.current?.();

    // Smooth forward tilt transition over 2500ms
    setTimeout(() => {
      onCompleteRef.current?.();
    }, 2500);
  };

  // Handle manual next fact selection (resets interval timer)
  const handleManualNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (factOpacity === 0) return;
    setFactOpacity(0);
    setTimeout(() => {
      setFactChangeTrigger(prev => prev + 1);
      setFactOpacity(1);
    }, 400);
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-between py-12 bg-[#020204] select-none overflow-hidden transition-all duration-[2500ms] ease-out`}
      style={{
        transform: isLaunching
          ? 'perspective(1200px) rotateX(15deg) translateZ(80px)'
          : 'perspective(1200px) rotateX(0deg) translateZ(0px)',
        opacity: isLaunching ? 0 : 1,
        pointerEvents: isLaunching ? 'none' : 'auto',
      }}
    >
      <style>{`
        /* Slow Zoom Ken Burns Effect for background */
        @keyframes kenBurns {
          0% { transform: scale(1); }
          100% { transform: scale(1.15); }
        }

        /* Launcher thrust fire ignition animation */
        @keyframes launchFlame {
          0%, 100% { transform: scale(1) translateY(0); opacity: 0.9; }
          50% { transform: scale(1.3, 1.7) translateY(4px); opacity: 1; }
        }
        .ignition-flame {
          animation: launchFlame 0.08s ease-in-out infinite;
        }

        /* Ambient neon nebula pulse */
        @keyframes nebulaPulse {
          0%, 100% { opacity: 0.25; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(1.08); }
        }
        .nebula-pulse {
          animation: nebulaPulse 6s ease-in-out infinite alternate;
        }

        /* Compositor accelerated Space Warp stars */
        @keyframes cssStarWarp {
          0% {
            transform: rotate(var(--angle)) translateY(0px) scaleY(0.1);
            opacity: 0;
          }
          15% {
            opacity: 0.8;
          }
          85% {
            opacity: 0.8;
          }
          100% {
            transform: rotate(var(--angle)) translateY(calc(-1 * var(--travel-dist))) scaleY(var(--travel-scale));
            opacity: 0;
          }
        }
        .css-warp-star {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 2px;
          height: 24px;
          background: linear-gradient(to bottom, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%);
          transform-origin: center center;
          animation: cssStarWarp var(--duration) linear infinite;
          animation-delay: var(--delay);
          pointer-events: none;
        }
      `}</style>

      {/* Dark molecular cloud background image layer with outer zoom wrapper */}
      <div 
        className="absolute inset-0 z-0 overflow-hidden pointer-events-none"
        style={{
          opacity: isLaunching ? 0 : 1,
          transform: isLaunching ? 'scale(3.0)' : 'scale(1)',
          transition: isLaunching ? 'transform 2.5s cubic-bezier(0.1, 0.8, 0.3, 1), opacity 2.5s ease-in-out' : 'transform 1s ease-out, opacity 1s ease-out',
        }}
      >
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-55"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            animation: 'kenBurns 45s ease-out infinite alternate',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020205]/80 via-transparent to-[#020205]/80" />
      </div>

      {/* Space Warp CSS Particles */}
      <div 
        className="absolute inset-0 z-0 overflow-hidden pointer-events-none"
        style={{
          transform: isLaunching ? 'scale(3) translateZ(200px)' : 'scale(1)',
          opacity: isLaunching ? 0 : 1,
          transition: isLaunching ? 'transform 2.5s cubic-bezier(0.1, 0.8, 0.3, 1), opacity 2.5s ease-in-out' : 'transform 1s ease-out, opacity 1s ease-out',
        }}
      >
        {stars.map((star) => (
          <div key={star.id} className="css-warp-star" style={star.style} />
        ))}
      </div>

      {/* Ambient background glow */}
      <div 
        className="absolute w-[600px] h-[600px] rounded-full filter blur-[120px] nebula-pulse pointer-events-none z-0" 
        style={{
          background: `radial-gradient(circle, ${themeConfig.glow} 0%, transparent 70%)`,
          left: '25%',
          top: '20%',
        }}
      />

      {/* Top Header Section */}
      <div 
        className="flex flex-col items-center text-center z-10 px-6 mt-4 transition-all duration-[2200ms] ease-in-out"
        style={{
          transform: isLaunching ? 'translateY(-100px) scale(1.3)' : 'translateY(0) scale(1)',
          opacity: isLaunching ? 0 : 1,
        }}
      >
        {/* Nice big title & tech details */}
        <div className="flex items-center space-x-3 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
          <span className="text-[10px] font-mono tracking-[0.3em] text-cyan-400/70 uppercase">
            {lang === 'zh' ? '星系探索规程已就绪' : 'GALACTIC OBSERVATION PROTOCOL READY'}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping [animation-delay:0.3s]" />
        </div>
        
        <div className="relative py-3 px-10 border-y border-white/10">
          {/* Corner decorative brackets */}
          <span className="absolute left-0 top-0 w-2.5 h-2.5 border-t-2 border-l-2 border-cyan-400/50" />
          <span className="absolute right-0 top-0 w-2.5 h-2.5 border-t-2 border-r-2 border-cyan-400/50" />
          <span className="absolute left-0 bottom-0 w-2.5 h-2.5 border-b-2 border-l-2 border-cyan-400/50" />
          <span className="absolute right-0 bottom-0 w-2.5 h-2.5 border-b-2 border-r-2 border-cyan-400/50" />
          
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-white drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]">
            {t.loadScreenDesc}
          </h1>
        </div>

        <div className="mt-3 text-[9px] font-mono text-slate-500 tracking-[0.4em] uppercase">
          Milky Way Scale // Simulation Epoch J2000
        </div>
      </div>

      {/* Middle Section (Facts Card) */}
      <div 
        className="flex-1 flex items-center justify-center z-10 w-full max-w-xl px-6 transition-all duration-[2200ms] ease-in-out"
        style={{
          transform: isLaunching ? 'scale(1.4)' : 'scale(1)',
          opacity: isLaunching ? 0 : factOpacity,
        }}
      >
        {/* Knowledge facts Card (Always visible, rotates from 0%, HUD fully transparent style) */}
        <div 
          className={`bg-transparent border ${themeConfig.accentBorder} rounded-2xl p-8 w-full flex flex-col items-center text-center z-10`}
        >
          <span className={`text-[10px] font-bold font-mono uppercase tracking-widest px-3 py-1 rounded bg-white/5 border border-white/10 ${themeConfig.accentText} mb-4`}>
            {chosenTip.title}
          </span>
          <p className="text-sm md:text-base text-slate-200 leading-relaxed font-sans max-w-lg font-medium">
            {chosenTip.text}
          </p>
          
          {/* Manual switch button */}
          <button
            onClick={handleManualNext}
            className="mt-6 flex items-center space-x-1.5 text-[9.5px] font-mono text-cyan-400/50 hover:text-cyan-300 hover:scale-105 transition-all duration-200 uppercase tracking-widest py-1 px-4 rounded-full border border-cyan-400/10 hover:border-cyan-400/30 cursor-pointer focus:outline-none"
          >
            <span>{lang === 'zh' ? '下一条' : 'NEXT FACT'}</span>
            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Lower Section (3D Flight HUD) */}
      <div 
        className="w-full max-w-xl flex items-center justify-center min-h-[220px] z-10 px-6 mb-8"
        style={{
          perspective: '1000px',
          transformStyle: 'preserve-3d',
        }}
      >
        <div 
          className="flex flex-col items-center justify-center transition-all duration-[2200ms] ease-in-out"
          style={{
            transform: 'rotateX(40deg)', // Tilts the entire HUD forward into the screen
            transformStyle: 'preserve-3d',
            opacity: isLaunching ? 0.9 : 1,
          }}
        >
          {/* Centered Circular HUD Container */}
          <div 
            className="relative w-56 h-56 flex items-center justify-center"
            style={{
              transformStyle: 'preserve-3d',
              transition: 'opacity 0.8s ease-out',
            }}
          >
            {/* 3/4 Circular SVG Progress Bar */}
            <svg 
              className={`absolute w-full h-full transition-opacity duration-700 ${isLaunching ? 'opacity-0' : 'opacity-100'}`}
              viewBox="0 0 224 224"
              style={{ transform: 'rotateX(0deg)', transformStyle: 'preserve-3d' }}
            >
              {/* Background Track (3/4 Circle) */}
              <circle
                cx="112"
                cy="112"
                r="82"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${0.75 * 2 * Math.PI * 82} ${2 * Math.PI * 82}`}
                transform="rotate(135, 112, 112)"
              />
              {/* Active Progress Arc */}
              <circle
                cx="112"
                cy="112"
                r="82"
                stroke={`url(#hud-progress-gradient-${theme})`}
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${(progress / 100) * 0.75 * 2 * Math.PI * 82} ${2 * Math.PI * 82}`}
                transform="rotate(135, 112, 112)"
                style={{
                  filter: `drop-shadow(0 0 8px ${themeConfig.rocketColor})`,
                  transition: 'stroke-dasharray 0.15s ease-out',
                }}
              />
              {/* Defs for theme gradients */}
              <defs>
                <linearGradient id={`hud-progress-gradient-${theme}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={theme === 'cosmic-dark' ? '#f59e0b' : theme === 'neon-hologram' ? '#d946ef' : theme === 'solar-gold' ? '#ea580c' : '#06b6d4'} />
                  <stop offset="100%" stopColor={theme === 'cosmic-dark' ? '#fde047' : theme === 'neon-hologram' ? '#f472b6' : theme === 'solar-gold' ? '#fde047' : '#60a5fa'} />
                </linearGradient>
              </defs>
            </svg>

            {/* Glowing Pointer Cursor (圆形光点) moving along the progress arc */}
            {!isLaunching && progress > 0 && progress < 100 && (() => {
              const angle = 135 + progress * 2.7;
              const angleRad = (angle * Math.PI) / 180;
              const pointerX = 112 + 82 * Math.cos(angleRad);
              const pointerY = 112 + 82 * Math.sin(angleRad);
              return (
                <div
                  className="absolute rounded-full transition-all duration-150 ease-out"
                  style={{
                    left: `${pointerX}px`,
                    top: `${pointerY}px`,
                    width: '10px',
                    height: '10px',
                    backgroundColor: themeConfig.rocketColor,
                    boxShadow: `0 0 14px ${themeConfig.rocketColor}, 0 0 4px ${themeConfig.rocketColor}`,
                    transform: 'translate(-50%, -50%)',
                    transformStyle: 'preserve-3d',
                  }}
                />
              );
            })()}

            {/* HUD Percentage and Telemetry Labels (positioned in the bottom 90° gap) */}
            <div 
              className={`absolute bottom-3 flex flex-col items-center justify-center font-mono text-center pointer-events-none transition-all duration-700 ${isLaunching ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <span className="text-sm font-bold text-slate-100 tracking-wider">
                {Math.round(progress)}%
              </span>
              <span className="text-[7px] text-slate-500 uppercase tracking-widest mt-0.5 whitespace-nowrap">
                {progress < 100 ? (lang === 'zh' ? '正在连接' : 'SYNCING') : (lang === 'zh' ? '连接成功' : 'CONNECTED')}
              </span>
            </div>

            {/* Centered Rocket Button */}
            <button
              onClick={handleLaunch}
              disabled={progress < 100 || isLaunching}
              className={`group flex flex-col items-center focus:outline-none select-none relative ${
                isLaunching
                  ? 'transition-all duration-[2500ms]'
                  : 'transition-all duration-300'
              }`}
              style={{
                transform: isLaunching 
                  ? 'translateY(-600px) scale(0.01) translateZ(100px)' 
                  : (progress >= 100 ? 'scale(1.08)' : 'scale(1)'),
                opacity: isLaunching ? 0 : 1,
                cursor: progress >= 100 ? 'pointer' : 'default',
                transition: isLaunching ? 'transform 2500ms cubic-bezier(0.6, 0, 0.8, 0.2), opacity 2200ms ease-in' : undefined,
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Launch halo effect */}
              {progress >= 100 && !isLaunching && (
                <div 
                  className="absolute inset-0 w-24 h-24 -m-2 rounded-full border border-cyan-400/20 animate-ping opacity-60 pointer-events-none"
                  style={{ animationDuration: '2s' }}
                />
              )}

              {/* Rocket SVG */}
              <svg
                className={`w-20 h-20 -rotate-45 transition-transform duration-300 ${
                  progress >= 100 && !isLaunching ? 'group-hover:scale-110' : ''
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke={themeConfig.rocketColor}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: `drop-shadow(0 0 15px ${themeConfig.rocketColor})` }}
              >
                <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
                <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
                <circle cx="13" cy="11" r="1.5" fill={themeConfig.rocketColor} fillOpacity="0.5" />
              </svg>

              {/* High-fidelity rocket flame particle effect - ALWAYS active! */}
              <div 
                className="absolute top-16 left-1/2 -translate-x-1/2 h-28 overflow-visible flex justify-center pointer-events-none"
                style={{ 
                  transform: 'rotateX(-40deg) translateZ(-10px)', // adjust flame angle in 3D
                  transformStyle: 'preserve-3d' 
                }}
              >
                <RocketFlame
                  active={true}
                  theme={theme}
                  width={isLaunching ? 70 : 45}
                  height={isLaunching ? 150 : 100}
                  particleScale={isLaunching ? 1.5 : 0.9}
                />
              </div>

              {/* Launcher Text labels underneath */}
              <div 
                className="mt-6 flex flex-col items-center justify-center font-mono whitespace-nowrap pointer-events-none animate-fade-in"
                style={{ transform: 'rotateX(-20deg)' }}
              >
                {progress < 100 ? (
                  <span className="text-[8px] tracking-[0.25em] text-slate-500 uppercase animate-pulse">
                    {lang === 'zh' ? '深空巡航准备中...' : 'PREPARING ENGINE...'}
                  </span>
                ) : !isLaunching ? (
                  <div className="flex flex-col items-center space-y-1">
                    <span className="text-[10px] tracking-[0.3em] uppercase text-white font-bold group-hover:text-cyan-300 transition-all duration-300">
                      {lang === 'zh' ? '点击发射探索' : 'LAUNCH EXPLORER'}
                    </span>
                    <span className="text-[7px] tracking-[0.2em] text-slate-400 uppercase">
                      {lang === 'zh' ? '就绪' : 'SYSTEM READY'}
                    </span>
                  </div>
                ) : (
                  <span className="text-[9px] tracking-[0.3em] uppercase text-cyan-400 font-bold animate-ping">
                    {lang === 'zh' ? '正在升空...' : 'ASCENDING...'}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Legal / Version Section */}
      <div 
        className="z-10 text-center px-6 transition-all duration-[2200ms] ease-in-out"
        style={{
          transform: isLaunching ? 'translateY(60px) scale(1.2)' : 'translateY(0) scale(1)',
          opacity: isLaunching ? 0 : 1,
        }}
      >
        <span className="text-[8px] font-mono tracking-widest text-slate-600 uppercase">
          COSMIC ODYSSEY CORE V3.0 // NASA OBSERVATORY PROTOCOL J2000
        </span>
      </div>
    </div>
  );
}
