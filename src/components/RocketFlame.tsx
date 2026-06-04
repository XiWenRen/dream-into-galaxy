import React, { useEffect, useRef } from 'react';

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
  colorType: 'center' | 'inner' | 'outer' | 'smoke';
}

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
  activeRef.current = active;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const particles = particlesRef.current;

    // Classic fiery rocket flame colors (White core -> Yellow-Orange inner -> Fiery Red-Orange outer -> Gray smoke)
    const getParticleColor = (
      type: 'center' | 'inner' | 'outer' | 'smoke',
      opacity: number
    ): string => {
      if (type === 'smoke') {
        return `rgba(100, 116, 139, ${opacity * 0.12})`; // slate-gray smoke
      }

      if (type === 'center') {
        return `rgba(255, 255, 255, ${opacity})`; // white core
      }

      return type === 'inner'
        ? `rgba(253, 224, 71, ${opacity})` // bright yellow (yellow-300)
        : `rgba(249, 115, 22, ${opacity})`; // hot orange (orange-500)
    };

    const updateAndDraw = () => {
      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Emit new particles if active
      if (activeRef.current) {
        // Emit 3-5 particles per frame
        const count = Math.floor(Math.random() * 3) + 3;
        for (let i = 0; i < count; i++) {
          const rand = Math.random();
          let colorType: 'center' | 'inner' | 'outer' | 'smoke' = 'outer';
          if (rand < 0.2) colorType = 'center';
          else if (rand < 0.6) colorType = 'inner';
          else if (rand < 0.88) colorType = 'outer';
          else colorType = 'smoke';

          // Center particles are smaller, smoke is larger
          let baseSize = 3 + Math.random() * 4;
          if (colorType === 'center') baseSize = 2 + Math.random() * 2;
          if (colorType === 'smoke') baseSize = 4 + Math.random() * 5;

          // For outer fire, let's randomise colors slightly towards red
          baseSize *= particleScale;

          particles.push({
            x: width / 2 + (Math.random() - 0.5) * 6,
            y: 2,
            vx: (Math.random() - 0.5) * 1.5,
            vy: 2 + Math.random() * 3.5, // downward velocity
            life: 0,
            maxLife: 15 + Math.random() * 20,
            size: baseSize,
            colorType,
          });
        }
      }

      // Update and draw existing particles
      // 1. Draw smoke (source-over blending)
      ctx.globalCompositeOperation = 'source-over';
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (p.colorType === 'smoke') {
          p.life++;
          if (p.life >= p.maxLife) {
            particles.splice(i, 1);
            continue;
          }

          // Physics
          p.x += p.vx;
          p.y += p.vy;
          p.vx += (Math.random() - 0.5) * 0.15;
          p.vx *= 0.95;
          p.vy *= 0.96;

          const lifeRatio = p.life / p.maxLife;
          const currentSize = p.size * (1 + lifeRatio * 1.5);
          const opacity = (1 - lifeRatio) * 0.4;

          ctx.beginPath();
          ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
          ctx.fillStyle = getParticleColor('smoke', opacity);
          ctx.fill();
        }
      }

      // 2. Draw fire core/inner/outer (lighter blending for glowing effect)
      ctx.globalCompositeOperation = 'lighter';
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (p.colorType !== 'smoke') {
          p.life++;
          if (p.life >= p.maxLife) {
            particles.splice(i, 1);
            continue;
          }

          // Physics
          p.x += p.vx;
          p.y += p.vy;
          // Add small high-frequency turbulence
          p.vx += (Math.random() - 0.5) * 0.25;
          p.vx *= 0.94;
          p.vy *= 0.95;

          const lifeRatio = p.life / p.maxLife;
          const currentSize = Math.max(0.1, p.size * (1 - lifeRatio));
          const opacity = 1 - lifeRatio;

          ctx.beginPath();
          ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
          
          // Draw inner yellow/orange or shift to red as it ages
          let color = getParticleColor(p.colorType, opacity);
          if (p.colorType === 'outer' && lifeRatio > 0.4) {
            // Fades to pure fiery red as it cools/ages
            color = `rgba(239, 68, 68, ${opacity})`;
          }

          ctx.fillStyle = color;
          ctx.fill();
        }
      }

      // Keep animation looping
      if (activeRef.current || particles.length > 0) {
        animationFrameId = requestAnimationFrame(updateAndDraw);
      }
    };

    updateAndDraw();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme, width, height, particleScale]);

  // Determine glow class and shadow color for themes
  const glowStyle = React.useMemo(() => {
    return {
      filter: 'drop-shadow(0 0 10px rgba(249, 115, 22, 0.6))', // Hot orange glow
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="pointer-events-none"
      style={glowStyle}
    />
  );
}
