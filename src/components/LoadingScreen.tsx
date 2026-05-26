import React, { useEffect, useRef, useState, useMemo } from 'react';

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
  const [showStartBtn, setShowStartBtn] = useState(false);
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
        setShowStartBtn(true);
      }
    }, 16);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 空依赖：只运行一次，绝不因父组件重渲染而重启

  const handleStart = () => {
    setFadeOut(true);
    window.setTimeout(() => onCompleteRef.current?.(), 700);
  };

  // 使用 useMemo 缓存星星的随机属性，防止 React 每次渲染 (进度条更新时) 都重新生成随机数，导致星星闪烁鬼畜
  const stars = useMemo(() => {
    return Array.from({ length: 45 }).map(() => {
      const size = Math.random() * 4 + 2; // 星星放大
      const isYellow = Math.random() > 0.7; // 部分黄色
      const color = isYellow ? 'rgba(253, 224, 71, 0.9)' : 'rgba(255, 255, 255, 0.9)';
      const glow = isYellow ? 'rgba(253, 224, 71, 0.5)' : 'rgba(255, 255, 255, 0.5)';
      const animDuration = Math.random() * 4 + 4; // 4s - 8s 缓慢闪烁

      return {
        size,
        color,
        glow,
        animDuration,
        left: Math.random() * 100 + '%',
        top: Math.random() * 100 + '%',
        delay: Math.random() * 5 + 's',
      };
    });
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#020204] transition-opacity duration-700 ${fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      <style>{`
        @keyframes starTwinkle {
          0%, 100% { opacity: 0.1; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        .star-twinkle {
          animation-name: starTwinkle;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        .bg-milky-way {
          background-image: radial-gradient(circle at center, rgba(16, 30, 60, 0.4) 0%, transparent 60%),
                            linear-gradient(135deg, rgba(6, 182, 212, 0.05) 0%, rgba(139, 92, 246, 0.05) 50%, rgba(249, 115, 22, 0.02) 100%);
        }
      `}</style>
      
      {/* 梦幻银河背景底层 */}
      <div className="absolute inset-0 bg-milky-way opacity-80" />
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-[0.15] mix-blend-screen" />

      {/* 星空背景粒子 - 刺芒与缓慢淡入淡出 */}
      <div className="absolute inset-0 overflow-hidden">
        {stars.map((star, i) => (
          <div
            key={i}
            className="absolute flex items-center justify-center star-twinkle"
            style={{
              width: star.size + 'px',
              height: star.size + 'px',
              left: star.left,
              top: star.top,
              animationDelay: star.delay,
              animationDuration: star.animDuration + 's',
            }}
          >
            {/* 刺芒效果 - 水平 */}
            <div className="absolute w-[400%] h-[15%] rounded-[100%] opacity-90" style={{ backgroundColor: star.color, filter: 'blur(0.5px)' }} />
            {/* 刺芒效果 - 垂直 */}
            <div className="absolute h-[400%] w-[15%] rounded-[100%] opacity-90" style={{ backgroundColor: star.color, filter: 'blur(0.5px)' }} />
            {/* 刺芒效果 - 斜向1 */}
            <div className="absolute w-[250%] h-[10%] rounded-[100%] opacity-70 rotate-45" style={{ backgroundColor: star.color, filter: 'blur(0.5px)' }} />
            {/* 刺芒效果 - 斜向2 */}
            <div className="absolute w-[250%] h-[10%] rounded-[100%] opacity-70 -rotate-45" style={{ backgroundColor: star.color, filter: 'blur(0.5px)' }} />
          </div>
        ))}
      </div>

      {/* 中央星系动画 */}
      <div className="relative w-64 h-64 mb-10 flex items-center justify-center">
        {/* 中心黑洞/亮核 */}
        <div className="absolute w-8 h-8 rounded-full bg-cyan-100 shadow-[0_0_50px_rgba(255,255,255,1),0_0_100px_rgba(6,182,212,0.8)] animate-pulse" />
        {/* 银河系旋臂 1 */}
        <div className="absolute inset-0 border-[3px] border-transparent border-t-cyan-400/60 border-r-cyan-400/20 rounded-full animate-[spin_6s_linear_infinite]" style={{ filter: 'blur(2px)' }} />
        {/* 银河系旋臂 2 */}
        <div className="absolute inset-4 border-[4px] border-transparent border-b-blue-500/50 border-l-blue-500/10 rounded-full animate-[spin_8s_linear_infinite_reverse]" style={{ filter: 'blur(3px)' }} />
        {/* 银河系旋臂 3 */}
        <div className="absolute inset-8 border-[2px] border-transparent border-t-indigo-400/70 border-r-indigo-400/30 rounded-full animate-[spin_12s_linear_infinite]" style={{ filter: 'blur(1px)' }} />
        {/* 环绕星体 */}
        <div className="absolute top-0 left-1/2 w-3 h-3 -ml-1.5 rounded-full bg-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.8)] animate-[spin_3s_linear_infinite] origin-[0_128px]" />
        <div className="absolute top-1/2 right-4 w-2 h-2 -mt-1 rounded-full bg-blue-300 shadow-[0_0_12px_rgba(96,165,250,0.8)] animate-[spin_5s_linear_infinite] origin-[-100px_0]" />
      </div>

      {/* 标题 */}
      <h1 className="text-4xl font-black tracking-[0.4em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 mb-3 font-mono drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]">
        {lang === 'zh' ? '梦入银河' : 'DREAM INTO GALAXY'}
      </h1>
      <p className="text-sm text-cyan-200/60 tracking-widest mb-10 font-sans font-light">
        {lang === 'zh' ? '给小朋友们都能自由探索的太阳系-银河系3D模拟世界' : 'A 3D solar system & galaxy simulation world for kids to freely explore'}
      </p>

      {/* 进度条与按钮区域 */}
      <div className="h-16 flex flex-col items-center justify-center">
        {!showStartBtn ? (
          <>
            {/* 进度条 */}
            <div className="w-72 h-1.5 bg-slate-800/80 rounded-full overflow-hidden mb-3 border border-slate-700/50">
              <div
                className="h-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-blue-400 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                style={{ width: `${progress}%` }}
              />
            </div>
            {/* 进度百分比与提示 */}
            <div className="flex items-center justify-between w-72 px-1">
              <span className="text-xs font-mono text-cyan-400/90 font-bold">
                {Math.round(progress)}%
              </span>
              <span className="text-[10px] font-mono text-slate-400/80 transition-all duration-300">
                {tips[tipIndex]}
              </span>
            </div>
          </>
        ) : (
          <button
            onClick={handleStart}
            className="group relative px-10 py-4 bg-transparent border-0 overflow-hidden transition-all duration-700 hover:scale-110"
          >
            <div className="absolute inset-0 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm group-hover:bg-white/10 group-hover:border-white/40 transition-all duration-700" />
            <div className="absolute inset-0 rounded-full shadow-[0_0_30px_rgba(255,255,255,0.15)] group-hover:shadow-[0_0_50px_rgba(255,255,255,0.4)] transition-all duration-700" />
            <span className="relative text-white font-light tracking-[0.3em] text-lg animate-pulse drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] group-hover:animate-none group-hover:text-cyan-100 group-hover:drop-shadow-[0_0_15px_rgba(34,211,238,0.8)] transition-all duration-700">
              {lang === 'zh' ? '开始探索' : 'START EXPLORATION'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
