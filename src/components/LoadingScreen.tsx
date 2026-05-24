import React, { useEffect, useRef, useState } from 'react';

interface LoadingScreenProps {
  onLoadComplete?: () => void;
  lang: 'zh' | 'en';
}

const LOADING_TIPS_ZH = [
  '正在校准黄道坐标系...',
  '加载 Hipparcos 星表（8785 颗恒星）...',
  '计算行星轨道六根数...',
  '生成太阳系引力场...',
  '解析银河系银道面倾角...',
  '构建奥尔特云粒子系统...',
  '同步历元时间至 J2000...',
  '渲染恒星色指数 B-V...',
  '初始化相机轨道控制器...',
];

const LOADING_TIPS_EN = [
  'Calibrating ecliptic coordinate system...',
  'Loading Hipparcos catalog (8,785 stars)...',
  'Computing planetary orbital elements...',
  'Generating solar system gravitational field...',
  'Parsing galactic plane inclination...',
  'Building Oort cloud particle system...',
  'Synchronizing epoch to J2000...',
  'Rendering stellar color index B-V...',
  'Initializing camera orbit controls...',
];

export default function LoadingScreen({ onLoadComplete, lang }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const tips = lang === 'zh' ? LOADING_TIPS_ZH : LOADING_TIPS_EN;
  const onCompleteRef = useRef(onLoadComplete);
  onCompleteRef.current = onLoadComplete;

  useEffect(() => {
    const DURATION = 2000; // 固定 2 秒，不受任何外部状态影响
    const startTime = Date.now();
    let timer = 0;

    timer = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.max(0, (elapsed / DURATION) * 100));
      setProgress(pct);
      setTipIndex(Math.floor((pct / 100) * tips.length) % tips.length);

      if (elapsed >= DURATION) {
        clearInterval(timer);
        setFadeOut(true);
        window.setTimeout(() => onCompleteRef.current?.(), 500);
      }
    }, 16);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 空依赖：只运行一次，绝不因父组件重渲染而重启

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#020204] transition-opacity duration-700 ${fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      {/* 星空背景粒子 */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 60 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              width: Math.random() * 2 + 1 + 'px',
              height: Math.random() * 2 + 1 + 'px',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              opacity: Math.random() * 0.6 + 0.2,
              animationDelay: Math.random() * 3 + 's',
              animationDuration: Math.random() * 2 + 1 + 's',
            }}
          />
        ))}
      </div>

      {/* 中央太阳系动画 */}
      <div className="relative w-48 h-48 mb-8">
        {/* 太阳 */}
        <div className="absolute top-1/2 left-1/2 w-6 h-6 -mt-3 -ml-3 rounded-full bg-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.6)] animate-pulse" />
        {/* 轨道环 */}
        <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-[spin_8s_linear_infinite]" />
        <div className="absolute inset-4 rounded-full border border-cyan-500/15 animate-[spin_12s_linear_infinite_reverse]" />
        <div className="absolute inset-8 rounded-full border border-cyan-500/10 animate-[spin_16s_linear_infinite]" />
        {/* 行星 */}
        <div className="absolute top-0 left-1/2 w-2 h-2 -ml-1 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)] animate-[spin_4s_linear_infinite] origin-[0_96px]" />
        <div className="absolute top-1/2 right-0 w-1.5 h-1.5 -mt-0.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)] animate-[spin_6s_linear_infinite] origin-[-88px_0]" />
      </div>

      {/* 标题 */}
      <h1 className="text-2xl font-bold tracking-[0.3em] text-cyan-400 mb-2 font-mono">
        {lang === 'zh' ? '银河模拟器' : 'GALAXY SIM'}
      </h1>
      <p className="text-xs text-slate-500 tracking-widest mb-8 font-mono">
        v3.0 · UNIVERSE ENGINE
      </p>

      {/* 进度条 */}
      <div className="w-64 h-1 bg-slate-800 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-cyan-600 to-cyan-300 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 进度百分比 */}
      <div className="text-sm font-mono text-cyan-400/80 mb-3">
        {Math.round(progress)}%
      </div>

      {/* 加载提示 */}
      <div className="text-xs font-mono text-slate-400/70 h-5 transition-all duration-300">
        {tips[tipIndex]}
      </div>
    </div>
  );
}
