import React, { useEffect, useRef, useState, useMemo } from 'react';
import { translations, transitionFactList, transitionTipList } from '../i18n';

interface LoadingScreenProps {
  onLoadComplete?: () => void;
  lang: 'zh' | 'en';
  theme: 'space-tech' | 'cosmic-dark' | 'neon-hologram' | 'solar-gold';
}

interface WarpStar {
  x: number;
  y: number;
  z: number;
  px: number;
  py: number;
}

const BACKGROUND_IMAGES = [
  'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?q=80&w=2000', // Option C: Cold Void Nebula
  'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=2000', // Andromeda Deep Field
  'https://images.unsplash.com/photo-1543722530-d2c3201371e7?q=80&w=2000', // Deep Violet Cosmic Cloud
  'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?q=80&w=2000', // Dark Orion Dust
  'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=2000'  // Dark Cosmic Dust
];

export default function LoadingScreen({ onLoadComplete, lang, theme }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [showStartBtn, setShowStartBtn] = useState(false);
  
  // Knowledge carousel state
  const [chosenTip, setChosenTip] = useState({ title: '', text: '' });
  const [factOpacity, setFactOpacity] = useState(1);
  const [factChangeTrigger, setFactChangeTrigger] = useState(0);
  
  // Spacecraft launch state
  const [isLaunching, setIsLaunching] = useState(false);
  const launchStartTimeRef = useRef<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onCompleteRef = useRef(onLoadComplete);
  onCompleteRef.current = onLoadComplete;

  const t = translations[lang];

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

  // Canvas starfield space warp loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const numStars = 150;
    const stars: WarpStar[] = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize stars
    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * 2000 - 1000,
        y: Math.random() * 2000 - 1000,
        z: Math.random() * 2000,
        px: 0,
        py: 0
      });
    }

    const drawWarp = () => {
      // Clear completely to let the background nebula remain fully visible
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Slower speed factor initially. Accelerates exponentially during launch
      let speedFactor = 1.2;
      let trailLength = 100;

      if (isLaunching && launchStartTimeRef.current !== null) {
        const elapsed = (Date.now() - launchStartTimeRef.current) / 1000;
        const t = Math.min(2.5, elapsed);
        speedFactor = 1.2 + Math.pow(t / 2.5, 3) * 35; // Accelerate up to 36
        trailLength = 100 + Math.pow(t / 2.5, 2) * 400; // Extend trails up to 500
      }

      stars.forEach((star) => {
        // Move star closer
        star.z -= speedFactor;

        // Recycle star if off screen or reached observer
        if (star.z <= 0) {
          star.z = 2000;
          star.x = Math.random() * 2000 - 1000;
          star.y = Math.random() * 2000 - 1000;
        }

        // Projected current position
        const px = (star.x / star.z) * cx + cx;
        const py = (star.y / star.z) * cy + cy;

        // Projected trail start position
        const zPrev = star.z + trailLength;
        const prevX = (star.x / zPrev) * cx + cx;
        const prevY = (star.y / zPrev) * cy + cy;

        // Recycle early if projected coordinates go off-screen
        if (px < -100 || px > canvas.width + 100 || py < -100 || py > canvas.height + 100) {
          star.z = 2000;
          star.x = Math.random() * 2000 - 1000;
          star.y = Math.random() * 2000 - 1000;
          return;
        }

        // Draw star trail line
        const alpha = Math.min(1, 1 - star.z / 2000) * 0.7; // max opacity 0.7
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = Math.min(1.5, (1 - star.z / 2000) * 1.5);
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(px, py);
        ctx.stroke();
      });

      animId = requestAnimationFrame(drawWarp);
    };

    animId = requestAnimationFrame(drawWarp);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [isLaunching]);

  // Handle spacecraft button click
  const handleLaunch = () => {
    if (isLaunching) return;
    setIsLaunching(true);
    launchStartTimeRef.current = Date.now();

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

      {/* Space Warp HTML5 Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

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

      {/* Lower Section (Progress Bar or Spacecraft Button) */}
      <div className="w-full max-w-md flex flex-col items-center justify-center min-h-[160px] z-10 px-6 mb-8">
        {!showStartBtn ? (
          /* Telemetry Progress Bar Section */
          <div className="w-80 flex flex-col items-center transition-opacity duration-300">
            {/* Linear progress bar */}
            <div className="w-full h-1 bg-slate-950/80 rounded-full overflow-hidden border border-white/5 mb-3 relative">
              <div
                className={`h-full bg-gradient-to-r ${themeConfig.progressBg} rounded-full transition-all duration-150 ease-out`}
                style={{ width: `${progress}%` }}
              />
            </div>
            {/* Telemetry metadata */}
            <div className="flex justify-between w-full px-1 text-[9px] font-mono text-slate-500">
              <span className={`font-bold ${themeConfig.accentText}`}>{Math.round(progress)}%</span>
              <span className="uppercase tracking-widest">{lang === 'zh' ? '系统数据初始化中' : 'INITIALIZING LAUNCH PAD'}</span>
            </div>
          </div>
        ) : (
          /* Spacecraft Launcher Button */
          <button
            onClick={handleLaunch}
            disabled={isLaunching}
            className={`group flex flex-col items-center focus:outline-none select-none relative cursor-pointer ${
              isLaunching
                ? 'transition-all duration-[2500ms] ease-in-out'
                : 'hover:scale-105 transition-all duration-300'
            }`}
            style={{
              transform: isLaunching ? 'translateY(-60px) translateZ(-300px) scale(0.15)' : 'none',
              opacity: isLaunching ? 0 : 1,
            }}
          >
            {/* Spacecraft outline SVG */}
            <svg
              className="w-20 h-20 -rotate-45"
              viewBox="0 0 24 24"
              fill="none"
              stroke={themeConfig.rocketColor}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: `drop-shadow(0 0 15px ${themeConfig.rocketColor})` }}
            >
              {/* Custom spaceshuttle/probe geometry */}
              <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
              <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
              <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
              <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
              <circle cx="13" cy="11" r="1.5" fill={themeConfig.rocketColor} fillOpacity="0.5" />
            </svg>

            {/* Pulsing thruster fire (Only shows during launching) */}
            {isLaunching && (
              <div className="w-3 h-8 bg-gradient-to-b from-yellow-300 via-orange-500 to-red-600 rounded-b-full ignition-flame mt-1 shadow-[0_0_15px_#f97316]" />
            )}

            {/* Text label underneath (Only shows if NOT launching) */}
            {!isLaunching && (
              <span className="text-[10px] tracking-[0.3em] uppercase text-white font-mono opacity-60 group-hover:opacity-100 group-hover:text-cyan-200 mt-4 transition-all duration-300 animate-pulse">
                {lang === 'zh' ? '点击发射以探索' : 'LAUNCH PROBE TO EXPLORE'}
              </span>
            )}
          </button>
        )}
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
