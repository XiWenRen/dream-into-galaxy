import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TelescopeOverlayProps {
  active: boolean;
  currentFov: number;
  onFovChange: (fov: number) => void;
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TelescopeOverlay({
  active,
  currentFov,
  onFovChange,
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

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const t = parseFloat(e.target.value);
      onFovChange(parseFloat(sliderToFov(t).toFixed(2)));
    },
    [onFovChange]
  );

  if (!active) return null;

  const { w, h } = vpSize;
  const radius = Math.min(w, h) * 0.42;
  const diameter = radius * 2;

  const activePresetIdx = findActivePresetIndex(currentFov);
  const activePreset = activePresetIdx >= 0 ? TELESCOPE_PRESETS[activePresetIdx] : null;

  const sliderVal = fovToSlider(currentFov);

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
      {/* ── Layer 1: Dark outer mask with circular hole ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.97)',
          maskImage: `radial-gradient(circle ${radius}px at center, transparent 0%, black 100%)`,
          WebkitMaskImage: `radial-gradient(circle ${radius}px at center, transparent 0%, black 100%)`,
          pointerEvents: 'none',
        }}
      />

      {/* ── Layer 2: Radial gradient for soft aperture edge ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle ${radius}px at center, transparent 88%, rgba(0,0,0,0.97) 100%)`,
          pointerEvents: 'none',
        }}
      />

      {/* ── Layer 3: Inner vignette (darkening toward circle edge) ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle ${radius * 0.98}px at center, transparent 60%, rgba(0,0,0,0.70) 100%)`,
          pointerEvents: 'none',
        }}
      />

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
        }}
      />

      {/* ── Layer 5: Scan-line effect (only inside eyepiece area via mask) ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 4px)',
          maskImage: `radial-gradient(circle ${radius}px at center, black 0%, transparent 100%)`,
          WebkitMaskImage: `radial-gradient(circle ${radius}px at center, black 0%, transparent 100%)`,
          pointerEvents: 'none',
        }}
      />

      {/* ── Crosshair reticle ── */}
      <Crosshair size={diameter} />

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

      {/* ══════════════════════════════════════════════════════
           CONTROL PANEL — pointer-events-auto
         ══════════════════════════════════════════════════════ */}
      <div
        style={{
          position: 'absolute',
          bottom: 28,
          left: '50%',
          transform: 'translateX(-50%)',
          pointerEvents: 'auto',
          minWidth: 420,
          maxWidth: '95vw',
        }}
      >
        <div
          style={{
            background: 'rgba(2,6,23,0.92)',
            border: '1px solid rgba(6,182,212,0.22)',
            borderRadius: 16,
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            padding: '16px 20px 14px',
            boxShadow:
              '0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(6,182,212,0.08), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          {/* Header row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Telescope icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 7l4-2 10 5-4 2L3 7z"
                  stroke="rgba(6,182,212,0.8)"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M13 10l3 6"
                  stroke="rgba(6,182,212,0.8)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M10 11.5l3 6"
                  stroke="rgba(6,182,212,0.5)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <circle cx="20" cy="6" r="1.5" fill="rgba(6,182,212,0.6)" />
              </svg>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'rgba(6,182,212,0.90)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  fontFamily: 'monospace',
                }}
              >
                {lang === 'zh' ? '望远镜模式' : 'Telescope Mode'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span
                style={{
                  fontSize: 11,
                  color: 'rgba(148,163,184,0.6)',
                  fontFamily: 'monospace',
                }}
              >
                {activePreset
                  ? lang === 'zh'
                    ? activePreset.descZh
                    : activePreset.descEn
                  : lang === 'zh'
                  ? '自定义'
                  : 'Custom'}
              </span>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: 'rgba(6,182,212,1)',
                  fontFamily: 'monospace',
                  lineHeight: 1.1,
                }}
              >
                {activePreset
                  ? lang === 'zh'
                    ? activePreset.labelZh
                    : activePreset.labelEn
                  : `${(65 / currentFov).toFixed(0)}×`}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div
            style={{
              height: 1,
              background:
                'linear-gradient(90deg, transparent, rgba(6,182,212,0.25) 30%, rgba(6,182,212,0.25) 70%, transparent)',
              marginBottom: 12,
            }}
          />

          {/* Preset buttons */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 8,
              marginBottom: 14,
            }}
          >
            {TELESCOPE_PRESETS.map((preset) => {
              const isActive = Math.abs(preset.fov - currentFov) <= 0.2;
              return (
                <button
                  key={preset.id}
                  onClick={() => handlePresetClick(preset)}
                  style={{
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(6,182,212,0.22) 0%, rgba(6,182,212,0.10) 100%)'
                      : 'rgba(15,23,42,0.80)',
                    border: isActive
                      ? '1px solid rgba(6,182,212,0.65)'
                      : '1px solid rgba(71,85,105,0.40)',
                    borderRadius: 10,
                    padding: '9px 6px',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    boxShadow: isActive
                      ? '0 0 16px rgba(6,182,212,0.35), 0 0 6px rgba(6,182,212,0.20), inset 0 1px 0 rgba(6,182,212,0.15)'
                      : '0 2px 8px rgba(0,0,0,0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3,
                    outline: 'none',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        'rgba(6,182,212,0.35)';
                      (e.currentTarget as HTMLButtonElement).style.boxShadow =
                        '0 0 10px rgba(6,182,212,0.15)';
                      (e.currentTarget as HTMLButtonElement).style.background =
                        'rgba(6,182,212,0.08)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        'rgba(71,85,105,0.40)';
                      (e.currentTarget as HTMLButtonElement).style.boxShadow =
                        '0 2px 8px rgba(0,0,0,0.3)';
                      (e.currentTarget as HTMLButtonElement).style.background =
                        'rgba(15,23,42,0.80)';
                    }
                  }}
                >
                  {/* Active shimmer bar */}
                  {isActive && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 2,
                        background:
                          'linear-gradient(90deg, transparent, rgba(6,182,212,0.8), transparent)',
                        borderRadius: '10px 10px 0 0',
                      }}
                    />
                  )}

                  {/* Magnification badge */}
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      fontFamily: 'monospace',
                      color: isActive
                        ? 'rgba(6,182,212,1)'
                        : 'rgba(148,163,184,0.80)',
                      letterSpacing: '-0.02em',
                      lineHeight: 1,
                    }}
                  >
                    {preset.magnification}×
                  </span>

                  {/* Label */}
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      color: isActive
                        ? 'rgba(6,182,212,0.80)'
                        : 'rgba(100,116,139,0.90)',
                      letterSpacing: '0.03em',
                      textAlign: 'center',
                      lineHeight: 1.2,
                    }}
                  >
                    {lang === 'zh' ? preset.labelZh : preset.labelEn}
                  </span>

                  {/* FOV sub-label */}
                  <span
                    style={{
                      fontSize: 9,
                      color: isActive
                        ? 'rgba(6,182,212,0.55)'
                        : 'rgba(71,85,105,0.80)',
                      fontFamily: 'monospace',
                    }}
                  >
                    {preset.fov >= 1
                      ? `${preset.fov}°`
                      : `${(preset.fov * 60).toFixed(0)}′`}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Custom slider row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: 'rgba(100,116,139,0.70)',
                fontFamily: 'monospace',
                whiteSpace: 'nowrap',
                letterSpacing: '0.05em',
              }}
            >
              {lang === 'zh' ? '自定义 FOV' : 'Custom FOV'}
            </span>

            <div style={{ flex: 1, position: 'relative', height: 20 }}>
              {/* Custom track background */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  right: 0,
                  height: 4,
                  transform: 'translateY(-50%)',
                  borderRadius: 4,
                  background:
                    'linear-gradient(90deg, rgba(6,182,212,0.70), rgba(6,182,212,0.15) 80%, rgba(71,85,105,0.30))',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  width: `${sliderVal * 100}%`,
                  height: 4,
                  transform: 'translateY(-50%)',
                  borderRadius: 4,
                  background: 'rgba(6,182,212,0.90)',
                  pointerEvents: 'none',
                  boxShadow: '0 0 8px rgba(6,182,212,0.6)',
                }}
              />
              <input
                type="range"
                min={0}
                max={1}
                step={0.001}
                value={sliderVal}
                onChange={handleSliderChange}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer',
                  margin: 0,
                  padding: 0,
                }}
              />
            </div>

            {/* Current FOV readout */}
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'rgba(6,182,212,0.85)',
                fontFamily: 'monospace',
                minWidth: 44,
                textAlign: 'right',
              }}
            >
              {currentFov >= 1
                ? `${currentFov.toFixed(1)}°`
                : `${(currentFov * 60).toFixed(0)}′`}
            </span>
          </div>

          {/* Zoom direction hints */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 4,
              paddingLeft: 70,
              paddingRight: 52,
            }}
          >
            <span
              style={{
                fontSize: 9,
                color: 'rgba(71,85,105,0.60)',
                fontFamily: 'monospace',
              }}
            >
              {lang === 'zh' ? '← 广角' : '← Wide'}
            </span>
            <span
              style={{
                fontSize: 9,
                color: 'rgba(71,85,105,0.60)',
                fontFamily: 'monospace',
              }}
            >
              {lang === 'zh' ? '窄角 →' : 'Narrow →'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
