import React, { useEffect, useRef, useMemo } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RocketFlameProps {
  active: boolean;
  theme: 'space-tech' | 'cosmic-dark' | 'neon-hologram' | 'solar-gold';
  width?: number;
  height?: number;
  particleScale?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  /** 0 = yellow-white, 1 = orange */
  hue: number;
}

// ---------------------------------------------------------------------------
// Theme glow colours – only the outer drop-shadow changes per theme.
// The flame body itself is always warm (white → yellow → orange → red).
// ---------------------------------------------------------------------------

const THEME_GLOW: Record<RocketFlameProps['theme'], string> = {
  'space-tech':    'rgba(255, 180,  50, 0.7)',
  'cosmic-dark':   'rgba(255, 100,  20, 0.7)',
  'neon-hologram': 'rgba(255, 120,  80, 0.7)',
  'solar-gold':    'rgba(255, 200,  50, 0.7)',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Draw one smooth teardrop/cone flame layer using cubic bezier curves. */
function drawFlameLayer(
  ctx: CanvasRenderingContext2D,
  cx: number,
  topY: number,
  nozzleHalfW: number,
  flameH: number,
  tipOffsetX: number,
  gradient: CanvasGradient,
) {
  const tipX = cx + tipOffsetX;
  const tipY = topY + flameH;

  // Control-point vertical positions (fractions of flame height)
  const cp1Y = topY + flameH * 0.15;  // upper shoulder
  const cp2Y = topY + flameH * 0.55;  // mid-belly
  const cp3Y = topY + flameH * 0.80;  // lower taper

  // Horizontal spread at each control level
  const cp1W = nozzleHalfW * 1.10;  // slight outward bulge near nozzle
  const cp2W = nozzleHalfW * 0.65;  // narrowing through body
  const cp3W = nozzleHalfW * 0.18;  // tight near tip

  ctx.beginPath();

  // Start at top-left of the nozzle opening
  ctx.moveTo(cx - nozzleHalfW, topY);

  // Left contour – two cubic bezier segments
  ctx.bezierCurveTo(
    cx - cp1W, cp1Y,       // CP1: push outward at shoulder
    cx - cp2W, cp2Y,       // CP2: converge at belly
    cx - cp3W, cp3Y,       // end of first segment
  );
  // Taper to the pointed tip
  ctx.bezierCurveTo(
    cx - cp3W * 0.4, cp3Y + (tipY - cp3Y) * 0.5,
    tipX - 1, tipY - 2,
    tipX, tipY,
  );

  // Right contour – mirror
  ctx.bezierCurveTo(
    tipX + 1, tipY - 2,
    cx + cp3W * 0.4, cp3Y + (tipY - cp3Y) * 0.5,
    cx + cp3W, cp3Y,
  );
  ctx.bezierCurveTo(
    cx + cp2W, cp2Y,
    cx + cp1W, cp1Y,
    cx + nozzleHalfW, topY,
  );

  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RocketFlame({
  active,
  theme,
  width = 40,
  height = 80,
  particleScale = 1,
}: RocketFlameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const activeRef = useRef(active);
  const flameScaleRef = useRef(active ? 1.0 : 0.0);

  activeRef.current = active;

  // ---- animation loop ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;
    const particles = particlesRef.current;
    let t = 0; // global time counter

    const loop = () => {
      t += 0.06; // ~60 fps × 0.06 ≈ 3.6 rad/s — gentle pace
      ctx.clearRect(0, 0, width, height);

      // ---- smooth scale transition ----
      const target = activeRef.current ? 1.0 : 0.0;
      flameScaleRef.current += (target - flameScaleRef.current) * 0.18;
      const s = flameScaleRef.current;

      if (s > 0.01) {
        const cx = width / 2;
        const topY = 2; // small margin from top

        // Flickering modulation
        const hFlicker  = 0.92 + 0.08 * Math.sin(t * 2.3);
        const wFlicker  = 0.94 + 0.06 * Math.cos(t * 3.1);
        const tipDriftX = Math.sin(t * 1.7) * width * 0.03 * s;

        // Base dimensions (scaled)
        const baseH = height * 0.88 * s * hFlicker;
        const baseNozzleHW = width * 0.38 * s * wFlicker;

        // ---- Layer definitions (outer → inner) ----
        const layers: {
          widthRatio: number;
          heightRatio: number;
          phase: number;
          topColor: string;
          botColor: string;
          composite: GlobalCompositeOperation;
        }[] = [
          {
            // Outer: red → transparent
            widthRatio: 1.0,
            heightRatio: 1.0,
            phase: 0,
            topColor: 'rgba(220,  50,  20, 0.85)',
            botColor: 'rgba(220,  50,  20, 0.0)',
            composite: 'source-over',
          },
          {
            // Middle: orange → transparent
            widthRatio: 0.72,
            heightRatio: 0.92,
            phase: 0.9,
            topColor: 'rgba(255, 160,  30, 0.95)',
            botColor: 'rgba(255, 120,  10, 0.0)',
            composite: 'screen',
          },
          {
            // Inner: golden yellow → transparent
            widthRatio: 0.48,
            heightRatio: 0.82,
            phase: 1.8,
            topColor: 'rgba(255, 230,  80, 1.0)',
            botColor: 'rgba(255, 200,  40, 0.0)',
            composite: 'screen',
          },
          {
            // Core: white-hot → pale yellow
            widthRatio: 0.24,
            heightRatio: 0.65,
            phase: 2.5,
            topColor: 'rgba(255, 255, 250, 1.0)',
            botColor: 'rgba(255, 240, 180, 0.0)',
            composite: 'screen',
          },
        ];

        for (const layer of layers) {
          // Per-layer oscillation (phase-shifted)
          const lhFlick = 0.95 + 0.05 * Math.sin(t * 2.8 + layer.phase);
          const lwFlick = 0.96 + 0.04 * Math.cos(t * 3.4 + layer.phase);
          const ltipX  = tipDriftX * layer.heightRatio;

          const lH  = baseH * layer.heightRatio * lhFlick;
          const lHW = baseNozzleHW * layer.widthRatio * lwFlick;

          // Build gradient along the flame length
          const grad = ctx.createLinearGradient(cx, topY, cx, topY + lH);
          grad.addColorStop(0, layer.topColor);
          grad.addColorStop(0.6, layer.topColor.replace(/[\d.]+\)$/, '0.5)'));
          grad.addColorStop(1, layer.botColor);

          ctx.globalCompositeOperation = layer.composite;
          drawFlameLayer(ctx, cx, topY, lHW, lH, ltipX, grad);
        }

        // Reset composite
        ctx.globalCompositeOperation = 'source-over';

        // ---- Particle emission ----
        if (activeRef.current) {
          // Emit 2-3 particles per frame
          const count = 2 + (Math.random() < 0.5 ? 1 : 0);
          for (let i = 0; i < count; i++) {
            const tipY = topY + baseH * (0.85 + Math.random() * 0.15);
            particles.push({
              x: cx + tipDriftX + (Math.random() - 0.5) * width * 0.12,
              y: tipY,
              vx: (Math.random() - 0.5) * 1.2 * particleScale,
              vy: (1.5 + Math.random() * 2.5) * particleScale,
              life: 0,
              maxLife: 14 + Math.random() * 10,
              size: (1.2 + Math.random() * 2.0) * particleScale,
              hue: Math.random(), // 0 → yellow-white, 1 → orange
            });
          }
        }
      }

      // ---- Update & draw particles ----
      if (particles.length > 0) {
        ctx.globalCompositeOperation = 'screen';
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.life++;
          if (p.life >= p.maxLife) {
            particles.splice(i, 1);
            continue;
          }
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.97;
          p.vy *= 0.98;

          const ratio = p.life / p.maxLife;
          const alpha = Math.max(0, 1 - ratio * 1.1);
          const r = Math.min(0.5, p.size * (1 - ratio * 0.7));

          // Interpolate yellow-white → orange based on hue + age
          const rr = Math.round(255);
          const gg = Math.round(220 - p.hue * 80 - ratio * 80);
          const bb = Math.round(120 - p.hue * 80 - ratio * 100);

          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${rr}, ${Math.max(0, gg)}, ${Math.max(0, bb)}, ${alpha.toFixed(2)})`;
          ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
      }

      // Keep looping while visible or particles remain
      if (activeRef.current || flameScaleRef.current > 0.01 || particles.length > 0) {
        rafId = requestAnimationFrame(loop);
      }
    };

    loop();
    return () => cancelAnimationFrame(rafId);
  }, [theme, width, height, particleScale]);

  // ---- canvas style with theme-specific glow ----
  const style = useMemo<React.CSSProperties>(() => {
    const glow = THEME_GLOW[theme] ?? THEME_GLOW['space-tech'];
    return {
      pointerEvents: 'none' as const,
      filter: `drop-shadow(0 0 8px ${glow}) drop-shadow(0 0 20px ${glow})`,
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={style}
    />
  );
}
