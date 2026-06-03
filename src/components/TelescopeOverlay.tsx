import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TelescopeOverlayProps {
  active: boolean;
  currentFov: number;
  onFovChange: (fov: number) => void;
  onClose?: () => void;
  lang: 'zh' | 'en';
}

interface TelescopePreset {
  id: string;
  labelZh: string;
  labelEn: string;
  magnification: number;
  fov: number;
  descZh: string;
  descEn: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TELESCOPE_PRESETS: TelescopePreset[] = [
  {
    id: 'naked',
    labelZh: '裸眼',
    labelEn: 'Naked Eye',
    magnification: 1,
    fov: 65,
    descZh: '人眼自然视野',
    descEn: 'Natural human eye',
  },
  {
    id: 'binocular',
    labelZh: '双筒望远镜',
    labelEn: 'Binoculars 10×',
    magnification: 10,
    fov: 6.5,
    descZh: '10×50 双筒',
    descEn: '10×50 Binoculars',
  },
  {
    id: 'refractor',
    labelZh: '入门折射镜',
    labelEn: 'Refractor 50×',
    magnification: 50,
    fov: 1.3,
    descZh: '80mm 折射镜',
    descEn: '80mm Refractor',
  },
  {
    id: 'advanced',
    labelZh: '天文台级',
    labelEn: 'Observatory 200×',
    magnification: 200,
    fov: 0.33,
    descZh: '专业赤道仪',
    descEn: 'Pro Equatorial',
  },
];

const FOV_MIN = 0.3;
const FOV_MAX = 65;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Map a linear slider value [0,1] to FOV using log scale. */
function sliderToFov(t: number): number {
  return FOV_MAX * Math.pow(FOV_MIN / FOV_MAX, t);
}

/** Map a FOV value to the linear slider position [0,1]. */
function fovToSlider(fov: number): number {
  const clamped = Math.max(FOV_MIN, Math.min(FOV_MAX, fov));
  return Math.log(clamped / FOV_MAX) / Math.log(FOV_MIN / FOV_MAX);
}

/** Find the active preset index given current FOV (±0.2° tolerance). */
function findActivePresetIndex(fov: number): number {
  return TELESCOPE_PRESETS.findIndex(
    (p) => Math.abs(p.fov - fov) <= 0.2
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface CrosshairProps {
  size: number; // diameter of the eyepiece circle in px
}

function Crosshair({ size }: CrosshairProps) {
  const armLen = size * 0.18;
  const gap = size * 0.04;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <svg
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        overflow: 'visible',
      }}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
    >
      {/* Center dot */}
      <circle cx={cx} cy={cy} r={2.5} fill="rgba(6,182,212,0.55)" />

      {/* Horizontal arms */}
      <line
        x1={cx - gap - armLen}
        y1={cy}
        x2={cx - gap}
        y2={cy}
        stroke="rgba(255,255,255,0.30)"
        strokeWidth={1}
      />
      <line
        x1={cx + gap}
        y1={cy}
        x2={cx + gap + armLen}
        y2={cy}
        stroke="rgba(255,255,255,0.30)"
        strokeWidth={1}
      />

      {/* Vertical arms */}
      <line
        x1={cx}
        y1={cy - gap - armLen}
        x2={cx}
        y2={cy - gap}
        stroke="rgba(255,255,255,0.30)"
        strokeWidth={1}
      />
      <line
        x1={cx}
        y1={cy + gap}
        x2={cx}
        y2={cy + gap + armLen}
        stroke="rgba(255,255,255,0.30)"
        strokeWidth={1}
      />

      {/* Tick marks at 45° diagonals */}
      {[45, 135, 225, 315].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const r1 = size * 0.30;
        const r2 = size * 0.34;
        return (
          <line
            key={angle}
            x1={cx + r1 * Math.cos(rad)}
            y1={cy + r1 * Math.sin(rad)}
            x2={cx + r2 * Math.cos(rad)}
            y2={cy + r2 * Math.sin(rad)}
            stroke="rgba(6,182,212,0.25)"
            strokeWidth={1}
          />
        );
      })}

      {/* Range rings */}
      <circle
        cx={cx}
        cy={cy}
        r={size * 0.20}
        fill="none"
        stroke="rgba(6,182,212,0.12)"
        strokeWidth={0.8}
        strokeDasharray="4 6"
      />
      <circle
        cx={cx}
        cy={cy}
        r={size * 0.38}
        fill="none"
        stroke="rgba(6,182,212,0.08)"
        strokeWidth={0.8}
        strokeDasharray="2 8"
      />
    </svg>
  );
}

// ─── Zoom Dial (circular magnification ring) ─────────────────────────────────

interface ZoomDialProps {
  cx: number;
  cy: number;
  radius: number;
  currentFov: number;
  onFovChange: (fov: number) => void;
  lang: 'zh' | 'en';
}

const DIAL_CONFIG = {
  arcStart: 210,
  arcSpan: 240,
  innerRadiusRatio: 0.92,
  tickCount: 48,
  majorTickStep: 3,
};

function ZoomDial({ cx, cy, radius: dialOuterR, currentFov, onFovChange, lang }: ZoomDialProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredPreset, setHoveredPreset] = useState<string | null>(null);
  const dialRef = useRef<SVGGElement>(null);
  const isDraggingRef = useRef(false);
  const dragStateRef = useRef({ startT: 0, lastAngle: 0, totalDelta: 0 });

  const { arcStart, arcSpan, innerRadiusRatio } = DIAL_CONFIG;
  const dialR = dialOuterR * innerRadiusRatio;
  const currentT = fovToSlider(currentFov);
  const indicatorAngleDeg = arcStart - currentT * arcSpan;

  const degToRad = (deg: number) => (deg * Math.PI) / 180;
  const pt = (r: number, deg: number) => ({
    x: cx + r * Math.cos(degToRad(deg)),
    y: cy + r * Math.sin(degToRad(deg)),
  });

  const getAngleFromScreen = (clientX: number, clientY: number): number => {
    const rect = dialRef.current?.ownerSVGElement?.getBoundingClientRect();
    if (!rect) return 0;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let deg = (Math.atan2(clientY - centerY, clientX - centerX) * 180) / Math.PI;
    return ((deg % 360) + 360) % 360;
  };

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const angle = getAngleFromScreen(e.clientX, e.clientY);
      let delta = angle - dragStateRef.current.lastAngle;
      while (delta > 180) delta -= 360;
      while (delta < -180) delta += 360;
      dragStateRef.current.totalDelta += delta;
      dragStateRef.current.lastAngle = angle;

      const deltaT = -dragStateRef.current.totalDelta / arcSpan;
      const newT = Math.max(0, Math.min(1, dragStateRef.current.startT + deltaT));
      onFovChange(parseFloat(sliderToFov(newT).toFixed(3)));
    };

    const handleUp = () => {
      setIsDragging(false);
      isDraggingRef.current = false;
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [onFovChange, arcSpan]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const angle = getAngleFromScreen(e.clientX, e.clientY);
    dragStateRef.current = { startT: currentT, lastAngle: angle, totalDelta: 0 };
    setIsDragging(true);
    isDraggingRef.current = true;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const mag = 65 / currentFov;
    const zoomFactor = e.deltaY > 0 ? 1 / 1.15 : 1.15;
    const newMag = Math.max(1, Math.min(216.7, mag * zoomFactor));
    const newFov = 65 / newMag;
    onFovChange(parseFloat(newFov.toFixed(3)));
  };

  const handlePresetClick = (preset: TelescopePreset) => {
    onFovChange(preset.fov);
  };

  const startPt = pt(dialR, arcStart);
  const endPt = pt(dialR, arcStart - arcSpan);
  const arcPath = `M ${startPt.x.toFixed(1)} ${startPt.y.toFixed(1)} A ${dialR.toFixed(1)} ${dialR.toFixed(1)} 0 1 0 ${endPt.x.toFixed(1)} ${endPt.y.toFixed(1)}`;

  const activePresetIdx = findActivePresetIndex(currentFov);
  const activePreset = activePresetIdx >= 0 ? TELESCOPE_PRESETS[activePresetIdx] : null;

  return (
    <g
      ref={dialRef}
      onPointerDown={handlePointerDown}
      onWheel={handleWheel}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      <circle cx={cx} cy={cy} r={dialR} fill="none" stroke="transparent" strokeWidth={30} />
      <path d={arcPath} fill="none" stroke="rgba(6,182,212,0.12)" strokeWidth={1.5} />

      {Array.from({ length: DIAL_CONFIG.tickCount + 1 }, (_, i) => {
        const t = i / DIAL_CONFIG.tickCount;
        const angle = arcStart - t * arcSpan;
        const isMajor = i % DIAL_CONFIG.majorTickStep === 0;
        const len = isMajor ? 8 : 5;
        const p1 = pt(dialR, angle);
        const p2 = pt(dialR - len, angle);
        return (
          <line
            key={i}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={isMajor ? 'rgba(6,182,212,0.35)' : 'rgba(6,182,212,0.15)'}
            strokeWidth={isMajor ? 1.2 : 0.8}
          />
        );
      })}

      {TELESCOPE_PRESETS.map((preset) => {
        const t = fovToSlider(preset.fov);
        const angle = arcStart - t * arcSpan;
        const isActive = activePreset?.id === preset.id;
        const isHovered = hoveredPreset === preset.id;
        const pMark = pt(dialR, angle);
        const pLabel = pt(dialR - 22, angle);
        const pSub = pt(dialR - 32, angle);
        const pTickEnd = pt(dialR - 12, angle);

        return (
          <g
            key={preset.id}
            onClick={() => handlePresetClick(preset)}
            onMouseEnter={() => setHoveredPreset(preset.id)}
            onMouseLeave={() => setHoveredPreset(null)}
            style={{ cursor: 'pointer' }}
          >
            {(isActive || isHovered) && (
              <circle
                cx={pMark.x}
                cy={pMark.y}
                r={5}
                fill="none"
                stroke={isActive ? 'rgba(6,182,212,0.6)' : 'rgba(6,182,212,0.3)'}
                strokeWidth={1.5}
              />
            )}
            <line
              x1={pMark.x}
              y1={pMark.y}
              x2={pTickEnd.x}
              y2={pTickEnd.y}
              stroke={isActive ? 'rgba(6,182,212,0.9)' : 'rgba(6,182,212,0.5)'}
              strokeWidth={isActive ? 2 : 1.2}
            />
            <text
              x={pLabel.x}
              y={pLabel.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill={isActive ? 'rgba(6,182,212,1)' : isHovered ? 'rgba(6,182,212,0.75)' : 'rgba(6,182,212,0.45)'}
              fontSize={isActive ? 12 : 10}
              fontFamily="JetBrains Mono, monospace"
              fontWeight={isActive ? 700 : 500}
              style={{ transition: 'all 0.2s ease', pointerEvents: 'none' }}
            >
              {preset.magnification}×
            </text>
            <text
              x={pSub.x}
              y={pSub.y + 10}
              textAnchor="middle"
              dominantBaseline="central"
              fill={isActive ? 'rgba(6,182,212,0.55)' : 'rgba(6,182,212,0.25)'}
              fontSize={7}
              fontFamily="JetBrains Mono, monospace"
              style={{ pointerEvents: 'none' }}
            >
              {preset.fov >= 1 ? `${preset.fov}°` : `${(preset.fov * 60).toFixed(0)}′`}
            </text>
          </g>
        );
      })}

      {(() => {
        const s = pt(dialR, arcStart);
        const e = pt(dialR, indicatorAngleDeg);
        const diff = ((indicatorAngleDeg - arcStart) % 360 + 360) % 360;
        const largeArc = diff > 180 ? 1 : 0;
        return (
          <path
            d={`M ${s.x.toFixed(1)} ${s.y.toFixed(1)} A ${dialR.toFixed(1)} ${dialR.toFixed(1)} 0 ${largeArc} 1 ${e.x.toFixed(1)} ${e.y.toFixed(1)}`}
            fill="none"
            stroke="rgba(6,182,212,0.2)"
            strokeWidth={2.5}
            strokeLinecap="round"
            style={{ filter: 'drop-shadow(0 0 6px rgba(6,182,212,0.35))' }}
          />
        );
      })()}

      {(() => {
        const p = pt(dialR, indicatorAngleDeg);
        const rad = degToRad(indicatorAngleDeg);
        const size = isDragging ? 9 : 6;
        const p1 = { x: p.x + size * Math.cos(rad), y: p.y + size * Math.sin(rad) };
        const p2 = { x: p.x + size * 0.4 * Math.cos(rad + Math.PI / 2), y: p.y + size * 0.4 * Math.sin(rad + Math.PI / 2) };
        const p3 = { x: p.x + size * 0.4 * Math.cos(rad - Math.PI / 2), y: p.y + size * 0.4 * Math.sin(rad - Math.PI / 2) };
        return (
          <polygon
            points={`${p1.x.toFixed(1)},${p1.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)} ${p3.x.toFixed(1)},${p3.y.toFixed(1)}`}
            fill="rgba(6,182,212,0.95)"
            style={{ filter: 'drop-shadow(0 0 5px rgba(6,182,212,0.9))', transition: 'all 0.15s ease' }}
          />
        );
      })()}

      <text
        x={cx}
        y={cy + dialOuterR * 0.68}
        textAnchor="middle"
        fill="rgba(6,182,212,0.2)"
        fontSize={9}
        fontFamily="JetBrains Mono, monospace"
        style={{ pointerEvents: 'none' }}
      >
        {lang === 'zh' ? '拖拽或滚轮缩放' : 'Drag or scroll to zoom'}
      </text>
    </g>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TelescopeOverlay({
  active,
  currentFov,
  onFovChange,
  onClose,
  lang,
}: TelescopeOverlayProps) {
  const [vpSize, setVpSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep viewport size up to date
  useEffect(() => {
    const update = () =>
      setVpSize({ w: window.innerWidth, h: window.innerHeight });

    const ro = new ResizeObserver(update);
    ro.observe(document.documentElement);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  const handlePresetClick = useCallback(
    (preset: TelescopePreset) => {
      onFovChange(preset.fov);
    },
    [onFovChange]
  );

  if (!active) return null;

  const { w, h } = vpSize;
  const radius = Math.min(w, h) * 0.38;
  const diameter = radius * 2;

  const activePresetIdx = findActivePresetIndex(currentFov);
  const activePreset = activePresetIdx >= 0 ? TELESCOPE_PRESETS[activePresetIdx] : null;

  // 寻星镜安全排布在主镜左侧 140px 处，彻底消除交叠与遮挡，垂直偏置 0.4*radius
  const fx = w / 2 - radius - 140;
  const fy = h / 2 - radius * 0.4;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 30,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* ── Layer 1: Dark outer mask with two circular holes (SVG mask to prevent blocking WebGL under the finder scope) ── */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        <defs>
          <mask id="telescope-bg-mask">
            {/* Opaque white covers the whole screen */}
            <rect width="100%" height="100%" fill="#ffffff" />
            {/* Black circle cuts out the main eyepiece center */}
            <circle cx={w / 2} cy={h / 2} r={radius} fill="#000000" />
            {/* Black circle cuts out the finder scope */}
            <circle cx={fx} cy={fy} r={90} fill="#000000" />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(2, 6, 23, 0.97)"
          mask="url(#telescope-bg-mask)"
        />
      </svg>

      {/* ── Eyepiece Vignette and Effects Container (only size of eyepiece, preventing leakage to other screen areas) ── */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: diameter,
          height: diameter,
          borderRadius: '50%',
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      >
        {/* Layer 2: Radial gradient for soft aperture edge */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle, transparent 88%, rgba(2, 6, 23, 0.97) 100%)`,
          }}
        />

        {/* Layer 3: Inner vignette (darkening toward circle edge) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle, transparent 85%, rgba(0,0,0,0.85) 100%)`,
          }}
        />

        {/* Layer 5: Scan-line effect (only inside eyepiece area) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 4px)',
            backgroundSize: '100% 100%',
          }}
        />
      </div>

      {/* ── Layer 4: Subtle cyan glow ring around eyepiece border ── */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: diameter,
          height: diameter,
          borderRadius: '50%',
          boxShadow:
            '0 0 0 2px rgba(6,182,212,0.18), 0 0 30px rgba(6,182,212,0.40), inset 0 0 18px rgba(6,182,212,0.10)',
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />

      {/* ── Crosshair reticle ── */}
      <Crosshair size={diameter} />

      {/* ── Zoom Dial ── */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          overflow: 'visible',
          zIndex: 31,
        }}
      >
        <ZoomDial
          cx={w / 2}
          cy={h / 2}
          radius={radius}
          currentFov={currentFov}
          onFovChange={onFovChange}
          lang={lang}
        />
      </svg>

      {/* ── Close button — top-right of eyepiece ── */}
      {onClose && (
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: `calc(50% - ${radius * 0.95}px)`,
            right: `calc(50% - ${radius * 0.75}px)`,
            zIndex: 32,
            pointerEvents: 'auto',
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'rgba(2,6,23,0.85)',
            border: '1px solid rgba(6,182,212,0.35)',
            color: 'rgba(6,182,212,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontSize: 16,
            fontWeight: 700,
            lineHeight: 1,
            padding: 0,
            backdropFilter: 'blur(8px)',
          }}
          onMouseEnter={(e) => {
            const btn = e.currentTarget;
            btn.style.borderColor = 'rgba(6,182,212,0.7)';
            btn.style.color = 'rgba(6,182,212,1)';
            btn.style.boxShadow = '0 0 12px rgba(6,182,212,0.4)';
          }}
          onMouseLeave={(e) => {
            const btn = e.currentTarget;
            btn.style.borderColor = 'rgba(6,182,212,0.35)';
            btn.style.color = 'rgba(6,182,212,0.85)';
            btn.style.boxShadow = 'none';
          }}
          title={lang === 'zh' ? '退出望远镜' : 'Exit Telescope'}
        >
          ✕
        </button>
      )}

      {/* ── FOV label inside eyepiece (top) ── */}
      <div
        style={{
          position: 'absolute',
          top: `calc(50% - ${radius * 0.78}px)`,
          left: '50%',
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
          textAlign: 'center',
          lineHeight: 1.3,
        }}
      >
        <span
          style={{
            fontSize: 11,
            letterSpacing: '0.18em',
            color: 'rgba(6,182,212,0.55)',
            fontFamily: 'monospace',
            textTransform: 'uppercase',
          }}
        >
          {lang === 'zh' ? '视场角' : 'FOV'}
        </span>
        <br />
        <span
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: 'rgba(6,182,212,0.80)',
            fontFamily: 'monospace',
          }}
        >
          {currentFov >= 1
            ? `${currentFov.toFixed(1)}°`
            : `${(currentFov * 60).toFixed(0)}′`}
        </span>
      </div>

      {/* ── Magnification label inside eyepiece (bottom) ── */}
      <div
        style={{
          position: 'absolute',
          bottom: `calc(50% - ${radius * 0.78}px)`,
          left: '50%',
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
          textAlign: 'center',
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'rgba(6,182,212,0.65)',
            fontFamily: 'monospace',
            letterSpacing: '0.1em',
          }}
        >
          {activePreset
            ? `${activePreset.magnification}×`
            : `${(65 / currentFov).toFixed(0)}×`}
        </span>
      </div>

      {/* ── Finder Scope Mounting Bracket (寻星镜与主镜筒连接固定支架) ── */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 34,
        }}
      >
        <defs>
          <linearGradient id="bracket-metallic" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="40%" stopColor="#64748b" />
            <stop offset="70%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <filter id="bracket-drop-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="-3" dy="5" stdDeviation="5" floodColor="#000000" floodOpacity="0.75" />
          </filter>
        </defs>

        {/* 支架底座 - 主目镜外沿连接盘 */}
        <path
          d={`M ${w/2 - radius * 0.76} ${h/2 - radius * 0.65} 
             A ${radius} ${radius} 0 0 0 ${w/2 - radius * 0.65} ${h/2 - radius * 0.76}`}
          fill="none"
          stroke="url(#bracket-metallic)"
          strokeWidth="10"
          strokeLinecap="round"
          filter="url(#bracket-drop-shadow)"
        />

        {/* 支架双支撑连杆 */}
        <path
          d={`M ${fx + 20} ${fy + 40} L ${w/2 - radius * 0.74} ${h/2 - radius * 0.69}
             M ${fx + 40} ${fy + 20} L ${w/2 - radius * 0.69} ${h/2 - radius * 0.74}`}
          fill="none"
          stroke="url(#bracket-metallic)"
          strokeWidth="10"
          strokeLinecap="round"
          filter="url(#bracket-drop-shadow)"
        />

        {/* 支撑连杆的内凹镂空加强筋 */}
        <path
          d={`M ${fx + 22} ${fy + 38} L ${w/2 - radius * 0.73} ${h/2 - radius * 0.68}
             M ${fx + 38} ${fy + 22} L ${w/2 - radius * 0.68} ${h/2 - radius * 0.73}`}
          fill="none"
          stroke="#0f172a"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* 支架顶端 - 环抱寻星镜的固定箍套 */}
        <circle
          cx={fx}
          cy={fy}
          r="95"
          fill="none"
          stroke="url(#bracket-metallic)"
          strokeWidth="8"
          filter="url(#bracket-drop-shadow)"
        />
        
        {/* 固定箍套调节定位防滑螺丝 */}
        <circle cx={fx + 66} cy={fy - 66} r="6" fill="#94a3b8" stroke="#1e293b" strokeWidth="2" />
        <circle cx={fx + 66} cy={fy - 66} r="2" fill="#475569" />
        
        <circle cx={fx - 66} cy={fy + 66} r="6" fill="#94a3b8" stroke="#1e293b" strokeWidth="2" />
        <circle cx={fx - 66} cy={fy + 66} r="2" fill="#475569" />
      </svg>

      {/* ── Finder Scope (寻星镜) 3D 实体壳体与镜片效果 ── */}
      <div
        style={{
          position: 'absolute',
          left: `${fx - 98}px`,
          top: `${fy - 98}px`,
          width: '196px',
          height: '196px',
          borderRadius: '50%',
          // 亚光不锈钢镜壳，使用中空径向渐变以露出底部 WebGL 画面，边缘保留拉丝金属体感
          background: 'radial-gradient(circle, transparent 93px, #1e293b 93px, #475569 95px, #334155 97px, #0f172a 98px)',
          boxShadow: `
            0 16px 36px rgba(0, 0, 0, 0.75),
            inset 0 3px 5px rgba(255, 255, 255, 0.25),
            inset 0 -5px 10px rgba(0, 0, 0, 0.85)
          `,
          border: '1px solid #1e293b',
          zIndex: 35,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* 内层黄铜镜圈 (Brass Bezel Ring)，营造机械仪器复古精致感 */}
        <div
          style={{
            width: '186px',
            height: '186px',
            borderRadius: '50%',
            // 中空黄铜镜圈以露出底部 WebGL 画面，边缘保留黄铜色泽
            background: 'radial-gradient(circle, transparent 90px, #78350f 90px, #b45309 91px, #d97706 92px, #b45309 93px)',
            boxShadow: `
              0 2px 4px rgba(0,0,0,0.5),
              inset 0 2px 3px rgba(255, 255, 255, 0.35),
              inset 0 -2px 3px rgba(0, 0, 0, 0.6)
            `,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* 消光镜腔与出瞳挡圈 (Aperture / Dark Vignette)，融合边缘并遮蔽 WebGL 的直角 */}
          <div
            style={{
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, transparent 84px, #020617 88px)',
              boxShadow: 'inset 0 0 16px rgba(0, 0, 0, 0.98)',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* 寻星镜发光红色准星刻度盘 (Illuminated Red Reticle) */}
            <svg
              width="180"
              height="180"
              viewBox="0 0 180 180"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 3,
              }}
            >
              <defs>
                {/* 模拟夜视准星在极暗环境下的红色发光辉光滤镜 */}
                <filter id="reticle-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="1.0" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* 垂直与水平准星细丝 */}
              <line x1="90" y1="0" x2="90" y2="180" stroke="rgba(248, 113, 113, 0.75)" strokeWidth="1" filter="url(#reticle-glow)" />
              <line x1="0" y1="90" x2="180" y2="90" stroke="rgba(248, 113, 113, 0.75)" strokeWidth="1" filter="url(#reticle-glow)" />
              
              {/* 环心刻度圈 */}
              <circle cx="90" cy="90" r="12" fill="none" stroke="rgba(248, 113, 113, 0.7)" strokeWidth="0.8" filter="url(#reticle-glow)" />
              <circle cx="90" cy="90" r="32" fill="none" stroke="rgba(248, 113, 113, 0.45)" strokeWidth="0.8" strokeDasharray="3 4" filter="url(#reticle-glow)" />
              <circle cx="90" cy="90" r="56" fill="none" stroke="rgba(248, 113, 113, 0.3)" strokeWidth="0.8" strokeDasharray="2 6" filter="url(#reticle-glow)" />
            </svg>

            {/* 镜片高透明玻璃冷反光 (Glass Highlight Layer) */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.04) 40%, transparent 60%)',
                zIndex: 4,
                pointerEvents: 'none',
              }}
            />

            {/* 光学镜片氟化镁(MgF2)防反射蓝紫色镀膜反光 (Coating Reflection) */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at 35% 35%, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.06) 45%, transparent 80%)',
                zIndex: 4,
                pointerEvents: 'none',
              }}
            />

            {/* 战术信息风格标签 */}
            <div
              style={{
                position: 'absolute',
                bottom: '12px',
                width: '100%',
                textAlign: 'center',
                fontSize: '8px',
                fontWeight: 600,
                color: 'rgba(248, 113, 113, 0.85)',
                fontFamily: 'monospace',
                letterSpacing: '0.08em',
                textShadow: '0 1px 3px rgba(0,0,0,0.95)',
                zIndex: 5,
              }}
            >
              {lang === 'zh' ? '寻星镜 (15° 视场)' : 'FINDER (15° FOV)'}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

