/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

// ============================================================================
// Global texture cache to avoid regenerating procedural textures
// ============================================================================

const globalTextureCache = new Map<string, THREE.Texture>();

function getCachedTexture(key: string, generator: () => THREE.Texture): THREE.Texture {
  if (globalTextureCache.has(key)) {
    return globalTextureCache.get(key)!;
  }
  const tex = generator();
  globalTextureCache.set(key, tex);
  return tex;
}

// ============================================================================
// StarrySkyViewer procedural textures
// ============================================================================

export function createProceduralMoonTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#b5bac4';
  ctx.fillRect(0, 0, 512, 256);

  const maria = [
    { x: 120, y: 130, r: 42 },
    { x: 180, y: 150, r: 36 },
    { x: 230, y: 160, r: 32 },
    { x: 280, y: 180, r: 27 },
    { x: 90, y: 180, r: 48 },
    { x: 380, y: 100, r: 32 },
  ];
  maria.forEach(m => {
    const grad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r);
    grad.addColorStop(0, '#666d78');
    grad.addColorStop(0.7, '#78808d');
    grad.addColorStop(1, '#b5bac4');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    ctx.fill();
  });

  const craters = [
    { x: 150, y: 80, r: 8 },
    { x: 180, y: 220, r: 12 },
    { x: 110, y: 160, r: 9 },
    { x: 290, y: 110, r: 7 },
    { x: 320, y: 200, r: 10 },
    { x: 420, y: 140, r: 6 },
    { x: 450, y: 180, r: 5 },
    { x: 50, y: 100, r: 8 }
  ];
  craters.forEach(c => {
    ctx.strokeStyle = '#eef0f3';
    ctx.lineWidth = 1.8;
    ctx.fillStyle = '#9aa1ad';
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.stroke();

    if (c.r >= 11) {
      ctx.strokeStyle = 'rgba(238, 240, 243, 0.45)';
      ctx.lineWidth = 0.8;
      for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI) / 6;
        ctx.beginPath();
        ctx.moveTo(c.x + Math.cos(angle) * c.r, c.y + Math.sin(angle) * c.r);
        ctx.lineTo(c.x + Math.cos(angle) * (c.r + 45), c.y + Math.sin(angle) * (c.r + 45));
        ctx.stroke();
      }
    }
  });

  for (let i = 0; i < 120; i++) {
    const rx = Math.random() * 512;
    const ry = Math.random() * 256;
    const rr = Math.random() * 2.0 + 0.5;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(245, 245, 250, 0.5)' : 'rgba(80, 85, 95, 0.3)';
    ctx.beginPath();
    ctx.arc(rx, ry, rr, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  // 校准：SphereGeometry +z 面对应 u=0.25，将纹理向右平移 0.25 使正面(u=0.5)对准 +z
  texture.offset.x = 0.25;
  return texture;
}

/** Create a procedural Saturn ring texture with banded structure.
 *  RingGeometry UVs: u=angle, v=radius(0=inner,1=outer). We vary along Y. */
export function createSaturnRingTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Bands defined by v coordinate (0 = inner radius, 1 = outer radius)
  const bands = [
    { v0: 0.00, v1: 0.22, color: 'rgba(200, 190, 170, 0.75)' },   // C ring
    { v0: 0.22, v1: 0.48, color: 'rgba(230, 220, 195, 0.90)' },   // B ring (bright)
    { v0: 0.48, v1: 0.52, color: 'rgba(60, 50, 45, 0.30)' },      // Cassini division
    { v0: 0.52, v1: 0.82, color: 'rgba(220, 210, 185, 0.85)' },   // A ring
    { v0: 0.82, v1: 1.00, color: 'rgba(180, 170, 150, 0.40)' },   // F ring (faint)
  ];

  bands.forEach(band => {
    const y0 = (1 - band.v1) * 512;
    const y1 = (1 - band.v0) * 512;
    ctx.fillStyle = band.color;
    ctx.fillRect(0, y0, 1, y1 - y0);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

export function createSolarCoronaTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255, 255, 245, 1.0)');
  grad.addColorStop(0.12, 'rgba(254, 215, 120, 0.9)');
  grad.addColorStop(0.35, 'rgba(251, 146, 50, 0.55)');
  grad.addColorStop(0.65, 'rgba(239, 68, 68, 0.22)');
  grad.addColorStop(1.0, 'rgba(127, 29, 29, 0.0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(64, 64, 64, 0, Math.PI * 2);
  ctx.fill();
  return new THREE.CanvasTexture(canvas);
}

export function createBrightStarGlowTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(64, 64);
  const data = imgData.data;

  const decay_radius = 4.5;
  const thickness_decay = 0.7;
  const length_decay = 18.0;

  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const dx = x - 31.5;
      const dy = y - 31.5;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const glow = Math.exp(-dist / decay_radius);
      const spikeH = Math.exp(-Math.abs(dy) / thickness_decay) * Math.exp(-Math.abs(dx) / length_decay);
      const spikeV = Math.exp(-Math.abs(dx) / thickness_decay) * Math.exp(-Math.abs(dy) / length_decay);

      let intensity = glow + 0.65 * (spikeH + spikeV);
      intensity = Math.max(0.0, Math.min(1.0, intensity));

      const idx = (y * 64 + x) * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = Math.floor(intensity * 255);
    }
  }
  ctx.putImageData(imgData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createCircleTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(16, 16);
  const data = imgData.data;

  const decay_radius = 1.2;
  const thickness_decay = 0.4;
  const length_decay = 5.0;

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const dx = x - 7.5;
      const dy = y - 7.5;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const glow = Math.exp(-dist / decay_radius);
      const spikeH = Math.exp(-Math.abs(dy) / thickness_decay) * Math.exp(-Math.abs(dx) / length_decay);
      const spikeV = Math.exp(-Math.abs(dx) / thickness_decay) * Math.exp(-Math.abs(dy) / length_decay);

      let intensity = glow + 0.65 * (spikeH + spikeV);
      intensity = Math.max(0.0, Math.min(1.0, intensity));

      const idx = (y * 16 + x) * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = Math.floor(intensity * 255);
    }
  }
  ctx.putImageData(imgData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export function createConstellationLabelTexture(text: string): { texture: THREE.CanvasTexture; width: number; height: number } {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const fontSize = 22;
  ctx.font = `bold ${fontSize}px sans-serif`;
  const metrics = ctx.measureText(text);
  const width = Math.ceil(metrics.width) + 20;
  const height = fontSize + 14;
  canvas.width = width;
  canvas.height = height;

  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillStyle = 'rgba(180, 210, 255, 0.9)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);

  // subtle glow
  ctx.shadowColor = 'rgba(100, 160, 255, 0.5)';
  ctx.shadowBlur = 8;
  ctx.fillText(text, width / 2, height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return { texture, width, height };
}

export function createConstellationLabelSprite(text: string): THREE.Sprite {
  const { texture, width, height } = createConstellationLabelTexture(text);
  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(width * 0.06, height * 0.06, 1);
  return sprite;
}

/**
 * 创建地平线霞光纹理（朝霞/晚霞）
 * 从底部向上渐变的柔和半透明纹理，用于模拟日出日落时地平线附近的宏大霞光
 */
export function createHorizonGlowTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // 从下到上的渐变：底部不透明，顶部完全透明
  const grad = ctx.createLinearGradient(0, 256, 0, 0);
  grad.addColorStop(0.0, 'rgba(255, 200, 150, 0.55)');
  grad.addColorStop(0.15, 'rgba(255, 160, 100, 0.40)');
  grad.addColorStop(0.35, 'rgba(255, 120, 80, 0.22)');
  grad.addColorStop(0.6, 'rgba(255, 100, 60, 0.08)');
  grad.addColorStop(1.0, 'rgba(255, 80, 40, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // 添加一些柔和的横向云层纹理变化
  for (let i = 0; i < 6; i++) {
    const y = 30 + i * 35;
    const bandGrad = ctx.createLinearGradient(0, y - 10, 0, y + 10);
    bandGrad.addColorStop(0, 'rgba(255, 180, 120, 0.0)');
    bandGrad.addColorStop(0.5, 'rgba(255, 160, 100, 0.12)');
    bandGrad.addColorStop(1, 'rgba(255, 180, 120, 0.0)');
    ctx.fillStyle = bandGrad;
    ctx.fillRect(0, y - 10, 256, 20);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// ============================================================================
// UniverseViewer procedural textures
// ============================================================================

/** 生成程序化丰富高精度(HD)贴图，防止加载外部文件跨域或不存在的问题 (升级为 HD 超清 2048x1024 纹理画板) */
export function createProceduralTexture(id: string): THREE.Texture {
  return getCachedTexture(`procedural_${id}`, () => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(2, 2); // 自动对齐坐标实现高分辨率平滑渲染 (4K超清级清晰度)

    if (id === 'sun') {
    // 太阳：暗红色背景配超高亮度金黄色热流
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#ff1a00');
    grad.addColorStop(0.3, '#ffaa00');
    grad.addColorStop(0.7, '#ffcc00');
    grad.addColorStop(1, '#e11d48');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // 叠加活跃热浪泡 (granulation noise layer)
    for (let i = 0; i < 400; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const r = Math.random() * 25 + 5;
      const gradBubble = ctx.createRadialGradient(x, y, 0, x, y, r);
      gradBubble.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
      gradBubble.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = gradBubble;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 绘制日冕耀斑磁线 (Coronal Loop Threads)
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 12;
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = 'rgba(255, 255, 230, 0.7)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      const startX = 120 + i * 160 + Math.random() * 40;
      const startY = 160 + Math.random() * 200;
      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(startX + 40, startY - 50, startX + 80, startY - 50, startX + 120, startY);
      ctx.stroke();

      // 磁力焦点上的深色太阳黑子 (Spots)
      ctx.fillStyle = 'rgba(40, 5, 0, 0.9)';
      ctx.beginPath();
      ctx.arc(startX + 60, startY - 10, 6 + Math.random() * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0; // 重置
  } else if (id === 'mercury') {
    // 水星：粗糙撞击坑地貌，配合白色的极地溅射条纹
    ctx.fillStyle = '#4b5563';
    ctx.fillRect(0, 0, 1024, 512);

    // 暗黑色玄武岩低地月海
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const r = Math.random() * 110 + 30;
      const gradBasalt = ctx.createRadialGradient(x, y, 0, x, y, r);
      gradBasalt.addColorStop(0, '#1f2937');
      gradBasalt.addColorStop(1, 'rgba(75, 85, 99, 0)');
      ctx.fillStyle = gradBasalt;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 喷发坑与大断流
    for (let i = 0; i < 280; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const r = Math.random() * 10 + 2;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(209, 213, 219, 0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();

      // 为大月坑绘制辐射发射线
      if (r > 7 && Math.random() > 0.6) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
        ctx.lineWidth = 0.8;
        for (let k = 0; k < 6; k++) {
          const angle = (k / 6) * Math.PI * 2;
          const length = Math.random() * 90 + 20;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
          ctx.stroke();
        }
      }
    }
  } else if (id === 'venus') {
    // 金星：浓绸的铜黄色硫酸巨暴风带
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#78350f');
    grad.addColorStop(0.3, '#eab308');
    grad.addColorStop(0.6, '#fef08a');
    grad.addColorStop(0.85, '#ca8a04');
    grad.addColorStop(1, '#451a03');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // 极地大型漩涡与大气横流
    ctx.lineWidth = 14;
    for (let i = 0; i < 12; i++) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${Math.random() * 0.16})`;
      ctx.beginPath();
      const baseH = 50 + i * 40;
      ctx.moveTo(0, baseH);
      ctx.bezierCurveTo(256, baseH + 45, 768, baseH - 45, 1024, baseH);
      ctx.stroke();
    }
  } else if (id === 'earth') {
    // 地球：蔚蓝色大洋、精细大陆地形和飞旋白色云层
    ctx.fillStyle = '#1d4ed8'; // 浅蓝色大陆海岸架
    ctx.fillRect(0, 0, 1024, 512);

    // 深色洋底
    ctx.fillStyle = '#1e3a8a';
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.arc(160 + i * 80, 260 + Math.random() * 80, 120, 0, Math.PI * 2);
      ctx.fill();
    }

    // 绘制几块巨大的森林绿大陆轮廓
    ctx.fillStyle = '#15803d'; // 肥沃森山绿

    // 1. 亚欧非板块
    ctx.beginPath();
    ctx.moveTo(200, 80);
    ctx.bezierCurveTo(260, 90, 340, 40, 480, 50); // 西伯利亚
    ctx.bezierCurveTo(550, 75, 500, 160, 490, 200); // 东南亚
    ctx.lineTo(430, 180);
    ctx.lineTo(410, 240); // 印度与阿拉伯
    ctx.bezierCurveTo(390, 250, 360, 200, 320, 210);
    ctx.bezierCurveTo(300, 230, 290, 350, 240, 380); // 非洲
    ctx.bezierCurveTo(180, 330, 170, 210, 220, 180);
    ctx.lineTo(180, 150);
    ctx.closePath();
    ctx.fill();

    // 加上金黄色的撒哈拉大沙漠和西亚大平原
    ctx.fillStyle = '#b45309'; // 荒漠沙黄
    ctx.beginPath();
    ctx.moveTo(210, 150);
    ctx.lineTo(340, 145);
    ctx.lineTo(330, 210);
    ctx.lineTo(200, 190);
    ctx.closePath();
    ctx.fill();

    // 2. 美洲大陆
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.moveTo(680, 60);
    ctx.bezierCurveTo(760, 80, 900, 60, 880, 130); // 北美
    ctx.lineTo(800, 140);
    ctx.lineTo(760, 220); // 墨西哥湾
    ctx.bezierCurveTo(770, 230, 840, 250, 870, 290); // 巴西
    ctx.lineTo(820, 410); // 阿根廷
    ctx.lineTo(780, 310);
    ctx.lineTo(740, 240);
    ctx.bezierCurveTo(680, 210, 620, 130, 680, 60);
    ctx.closePath();
    ctx.fill();

    // 3. 澳大利亚
    ctx.fillStyle = '#ca8a04';
    ctx.beginPath();
    ctx.ellipse(560, 330, 60, 40, Math.PI / 8, 0, Math.PI * 2);
    ctx.fill();

    // 4. 南极大陆
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 480, 1024, 32);

    // 叠加白色羽状云气
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    for (let i = 0; i < 35; i++) {
      const cx = Math.random() * 1024;
      const cy = 60 + Math.random() * 380;
      const cr = Math.random() * 32 + 10;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.arc(cx + cr * 0.7, cy + cr * 0.1, cr * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'moon') {
    // 月球：银灰、黑白相间的玄武岩和高地
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(0, 0, 1024, 512);

    ctx.fillStyle = '#4b5563'; // 黑色月海月面
    const craters = [
      { x: 300, y: 160, rx: 110, ry: 70 },
      { x: 480, y: 220, rx: 100, ry: 80 },
      { x: 740, y: 140, rx: 130, ry: 60 },
      { x: 200, y: 310, rx: 70, ry: 50 },
      { x: 620, y: 320, rx: 80, ry: 50 }
    ];
    craters.forEach(c => {
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.rx, c.ry, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // 月表丰富密集的微陨击坑 (crater system)
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const r = Math.random() * 8 + 1.5;

      ctx.fillStyle = 'rgba(31, 41, 55, 0.4)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(243, 244, 246, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();

      if (r > 6 && Math.random() > 0.7) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 0.8;
        for (let j = 0; j < 8; j++) {
          const angle = (j / 8) * Math.PI * 2;
          const len = Math.random() * 100 + 30;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
          ctx.stroke();
        }
      }
    }
  } else if (id === 'mars') {
    // 火星：氧化铁荒漠沙尘大地、干冰雪白极冠、及深沙黑海
    ctx.fillStyle = '#b45309'; // 浓厚氧化铁红
    ctx.fillRect(0, 0, 1024, 512);

    // 深褐色低海
    ctx.fillStyle = '#451a03';
    for (let i = 0; i < 6; i++) {
      const x = 150 + i * 160 + Math.random() * 40;
      const y = 200 + Math.random() * 100;
      ctx.beginPath();
      ctx.ellipse(x, y, 100 + Math.random() * 40, 60 + Math.random() * 15, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // 著名的水手号大峡谷裂痕 (Valles Marineris)
    ctx.strokeStyle = '#1e0b00';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(340, 260);
    ctx.bezierCurveTo(440, 240, 540, 280, 640, 250);
    ctx.stroke();

    // 南北两极晶莹剔透的水冰极冠 (Mars Cap)
    ctx.fillStyle = '#f9fafb';
    // 北极
    ctx.beginPath();
    ctx.ellipse(512, 0, 150, 35, 0, 0, Math.PI * 2);
    ctx.fill();
    // 南极
    ctx.beginPath();
    ctx.ellipse(512, 512, 120, 28, 0, 0, Math.PI * 2);
    ctx.fill();

    // 稀薄黑蚀洞
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = 'rgba(69, 26, 3, 0.3)';
      ctx.beginPath();
      ctx.arc(Math.random() * 1024, Math.random() * 512, Math.random() * 8 + 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'jupiter') {
    // 木星：气态巨行星霸道的金黄茶褐和纯白条纹层，大红斑，以及大量气流花结
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#451a03');
    grad.addColorStop(0.16, '#ca8a04');
    grad.addColorStop(0.3, '#fef08a');
    grad.addColorStop(0.48, '#b45309');
    grad.addColorStop(0.52, '#fde047');
    grad.addColorStop(0.68, '#78350f');
    grad.addColorStop(0.85, '#fef9c3');
    grad.addColorStop(1, '#6b21a8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // 一系列横向紊动巨暴风纹
    ctx.lineWidth = 15;
    for (let i = 0; i < 16; i++) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${Math.random() * 0.22})`;
      ctx.beginPath();
      const baseH = 30 + i * 29;
      ctx.moveTo(0, baseH);
      ctx.bezierCurveTo(256, baseH + 30, 768, baseH - 30, 1024, baseH);
      ctx.stroke();
    }

    // 经典木星大红斑 (Great Red Spot)
    const gx = 650;
    const gy = 350;

    // 巨幅热力带
    const rGrad = ctx.createRadialGradient(gx, gy, 5, gx, gy, 45);
    rGrad.addColorStop(0, '#991b1b'); // 赤红核心
    rGrad.addColorStop(0.5, '#dc2626'); // 橘红
    rGrad.addColorStop(1, '#450a0a'); // 边缘
    ctx.fillStyle = rGrad;
    ctx.beginPath();
    ctx.ellipse(gx, gy, 55, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    // 大红斑环线气旋
    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(gx, gy, 68, 40, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 巨行星上的次级白色暴风漩涡点 (White Storms)
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.ellipse(100 + i * 120, 180 + (i % 2) * 80, 15, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'saturn') {
    // 土星：平滑温柔的米金色淡彩条带
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#854d0e');
    grad.addColorStop(0.24, '#fde047');
    grad.addColorStop(0.5, '#fef08a');
    grad.addColorStop(0.76, '#ca8a04');
    grad.addColorStop(1, '#713f12');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // 大气横线
    ctx.lineWidth = 8;
    for (let i = 0; i < 14; i++) {
      ctx.strokeStyle = `rgba(255, 255, 240, ${0.1 + Math.random() * 0.1})`;
      ctx.beginPath();
      const baseH = 40 + i * 32;
      ctx.moveTo(0, baseH);
      ctx.bezierCurveTo(256, baseH + 15, 768, baseH - 15, 1024, baseH);
      ctx.stroke();
    }
  } else if (id === 'uranus') {
    // 天王星：冰冷剔透的宁静青蓝色
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#0369a1');
    grad.addColorStop(0.45, '#06b6d4');
    grad.addColorStop(0.55, '#22d3ee');
    grad.addColorStop(1, '#0e7490');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // 微弱水平气体纹
    ctx.lineWidth = 12;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(0, 140);
    ctx.bezierCurveTo(256, 155, 768, 125, 1024, 140);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 310);
    ctx.bezierCurveTo(256, 295, 768, 325, 1024, 310);
    ctx.stroke();
  } else if (id === 'neptune') {
    // 海王星：神秘深海宝蓝色、高空 cirrus 斜纹和独特的深色核心气旋
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#1e3a8a');
    grad.addColorStop(0.35, '#1d4ed8');
    grad.addColorStop(0.65, '#2563eb');
    grad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // 横条
    ctx.lineWidth = 6;
    for (let i = 0; i < 10; i++) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 + Math.random() * 0.08})`;
      ctx.beginPath();
      const baseH = 50 + i * 42;
      ctx.moveTo(0, baseH);
      ctx.bezierCurveTo(256, baseH + 18, 768, baseH - 18, 1024, baseH);
      ctx.stroke();
    }

    // 海王星大暗斑 (Great Dark Spot)
    const dx = 710;
    const dy = 280;

    const dGrad = ctx.createRadialGradient(dx, dy, 3, dx, dy, 35);
    dGrad.addColorStop(0, '#030712'); // 极暗黑蓝
    dGrad.addColorStop(0.5, '#172554');
    dGrad.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = dGrad;
    ctx.beginPath();
    ctx.ellipse(dx, dy, 36, 22, Math.PI / 10, 0, Math.PI * 2);
    ctx.fill();

    // "疾行者"白云纹
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(dx - 50, dy + 50);
    ctx.bezierCurveTo(dx, dy + 60, dx + 30, dy + 30, dx + 60, dy + 45);
    ctx.stroke();
  } else if (id === 'earth_clouds') {
    // 简易云气层：随机渲染白色晕光云团作为备选云层
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 1024, 512);

    // 绘制松散的白云气旋
    for (let i = 0; i < 45; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const r = Math.random() * 110 + 35;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.72)');
      grad.addColorStop(0.35, 'rgba(240, 248, 255, 0.38)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'earth_specular') {
    // 地球高反光细节：海洋反光强(高亮灰度)，陆地反光弱(暗黑色)
    ctx.fillStyle = '#1e1e1e'; // 陆地不反光
    ctx.fillRect(0, 0, 1024, 512);
    ctx.fillStyle = '#eaeaea'; // 大洋强反光
    // 渲染基本的拼合海洋块板，供离线反射兜底
    ctx.beginPath();
    ctx.arc(160, 240, 170, 0, Math.PI * 2);
    ctx.arc(480, 200, 140, 0, Math.PI * 2);
    ctx.arc(820, 310, 160, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'io') {
    // 木卫一 Io：硫磺火山地表，黄色基调带深色火山口与橙色熔岩流
    ctx.fillStyle = '#d4a72c';
    ctx.fillRect(0, 0, 1024, 512);
    // 火山口与熔岩区域
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const r = Math.random() * 35 + 8;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, '#5a1a05');
      grad.addColorStop(0.5, '#8b4513');
      grad.addColorStop(1, 'rgba(212, 167, 44, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // 硫磺沉积物亮斑
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const r = Math.random() * 12 + 2;
      ctx.fillStyle = Math.random() > 0.5 ? '#fde047' : '#fbbf24';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'europa') {
    // 木卫二 Europa：冰白色表面，深蓝色冰裂纹
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, 1024, 512);
    // 冰裂纹系统
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 18; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      ctx.beginPath();
      ctx.moveTo(x, y);
      let cx = x, cy = y;
      for (let s = 0; s < 8; s++) {
        cx += (Math.random() - 0.5) * 200;
        cy += (Math.random() - 0.5) * 100;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
    // 次级淡蓝裂纹
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    for (let i = 0; i < 35; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      ctx.beginPath();
      ctx.moveTo(x, y);
      let cx = x, cy = y;
      for (let s = 0; s < 6; s++) {
        cx += (Math.random() - 0.5) * 150;
        cy += (Math.random() - 0.5) * 80;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
    // 冰面微纹理
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const r = Math.random() * 3 + 0.5;
      ctx.fillStyle = 'rgba(100, 130, 170, 0.2)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'ganymede') {
    // 木卫三 Ganymede：灰色冰岩混合，暗色沟槽区与亮色斑块
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, 0, 1024, 512);
    // 暗色沟槽区域
    for (let i = 0; i < 12; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const r = Math.random() * 80 + 30;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, '#475569');
      grad.addColorStop(1, 'rgba(148, 163, 184, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // 亮色斑块
    for (let i = 0; i < 25; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const r = Math.random() * 25 + 5;
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // 撞击坑
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const r = Math.random() * 6 + 1.5;
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (id === 'callisto') {
    // 木卫四 Callisto：深灰色古老撞击坑密布
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(0, 0, 1024, 512);
    // 大型多环撞击坑
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const r = Math.random() * 55 + 20;
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      // 内环
      ctx.strokeStyle = '#4b5563';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.65, 0, Math.PI * 2);
      ctx.stroke();
    }
    // 密集小撞击坑
    for (let i = 0; i < 250; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const r = Math.random() * 7 + 1;
      ctx.fillStyle = '#4b5563';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    // 亮斑区域
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const r = Math.random() * 40 + 15;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, 'rgba(209, 213, 219, 0.35)');
      grad.addColorStop(1, 'rgba(107, 114, 128, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'titan') {
    // 土卫六 Titan：橙黄色雾霾大气，朦胧地表
    ctx.fillStyle = '#d97706';
    ctx.fillRect(0, 0, 1024, 512);
    // 暗色沙丘/湖泊区域
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const rx = Math.random() * 100 + 40;
      const ry = Math.random() * 50 + 20;
      ctx.fillStyle = 'rgba(120, 53, 15, 0.4)';
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    // 沙丘条纹
    ctx.strokeStyle = 'rgba(180, 83, 9, 0.35)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      ctx.beginPath();
      ctx.moveTo(x - 60, y);
      ctx.lineTo(x + 60, y + (Math.random() - 0.5) * 20);
      ctx.stroke();
    }
    // 大气朦胧覆盖
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const r = Math.random() * 50 + 20;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, 'rgba(251, 191, 36, 0.15)');
      grad.addColorStop(1, 'rgba(217, 119, 6, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'phobos' || id === 'deimos') {
    // 火卫一/二：暗灰色不规则小行星状
    ctx.fillStyle = '#57534e';
    ctx.fillRect(0, 0, 1024, 512);
    // 撞击坑
    for (let i = 0; i < 180; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const r = Math.random() * 10 + 2;
      ctx.fillStyle = 'rgba(60, 50, 45, 0.5)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    //  grooves (条纹)
    ctx.strokeStyle = 'rgba(40, 30, 25, 0.25)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const y = 50 + i * 40;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x < 1024; x += 80) {
        ctx.lineTo(x, y + Math.sin(x * 0.02) * 10);
      }
      ctx.stroke();
    }
  } else if (id === 'rhea' || id === 'enceladus' || id === 'tethys') {
    // 冰卫星：亮白色冰面
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, 1024, 512);
    // 冰裂缝
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      ctx.beginPath();
      ctx.moveTo(x, y);
      let cx = x, cy = y;
      for (let s = 0; s < 6; s++) {
        cx += (Math.random() - 0.5) * 150;
        cy += (Math.random() - 0.5) * 80;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
    // 亮斑
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const r = Math.random() * 8 + 1;
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // 暗色撞击坑
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const r = Math.random() * 5 + 1;
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'titania' || id === 'oberon' || id === 'ariel') {
    // 天卫：浅灰色冰面，裂缝与沟槽
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 0, 1024, 512);
    // 沟槽系统
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const r = Math.random() * 70 + 20;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, '#64748b');
      grad.addColorStop(1, 'rgba(203, 213, 225, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // 裂缝
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      ctx.beginPath();
      ctx.moveTo(x, y);
      let cx = x, cy = y;
      for (let s = 0; s < 7; s++) {
        cx += (Math.random() - 0.5) * 180;
        cy += (Math.random() - 0.5) * 90;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
    // 撞击坑
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const r = Math.random() * 6 + 1;
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (id === 'triton') {
    // 海卫一 Triton：粉白色冰火山活动地表
    ctx.fillStyle = '#e2d5d8';
    ctx.fillRect(0, 0, 1024, 512);
    // 冰火山喷发痕迹 (暗色羽流沉积)
    for (let i = 0; i < 12; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const rx = Math.random() * 80 + 30;
      const ry = Math.random() * 40 + 15;
      ctx.fillStyle = 'rgba(100, 80, 85, 0.3)';
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    // 亮白色冰斑
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const r = Math.random() * 15 + 3;
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // 裂纹
    ctx.strokeStyle = '#a1a1aa';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      ctx.beginPath();
      ctx.moveTo(x, y);
      let cx = x, cy = y;
      for (let s = 0; s < 5; s++) {
        cx += (Math.random() - 0.5) * 120;
        cy += (Math.random() - 0.5) * 60;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
  } else if (id === 'proteus') {
    // 海卫八 Proteus：暗灰色不规则
    ctx.fillStyle = '#52525b';
    ctx.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const r = Math.random() * 8 + 2;
      ctx.fillStyle = 'rgba(30, 30, 35, 0.45)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // 亮斑
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const r = Math.random() * 5 + 1;
      ctx.fillStyle = '#71717a';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
  });
}

/** 生成 1D 线性纹理用于各行星的解析式星环 */
export function createProceduralRingTexture(planetId: string): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 2; // 1D texture
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 512, 0);

  if (planetId === 'uranus') {
    // 天王星环（暗淡、多窄环，主要由暗色物质组成）
    grad.addColorStop(0.0, 'rgba(180, 220, 230, 0.0)');
    grad.addColorStop(0.2, 'rgba(180, 220, 230, 0.25)'); // Zeta
    grad.addColorStop(0.3, 'rgba(180, 220, 230, 0.0)');
    grad.addColorStop(0.5, 'rgba(180, 220, 230, 0.45)'); // Alpha, Beta
    grad.addColorStop(0.6, 'rgba(180, 220, 230, 0.15)');
    grad.addColorStop(0.8, 'rgba(180, 220, 230, 0.55)'); // Eta, Gamma, Delta
    grad.addColorStop(0.9, 'rgba(180, 220, 230, 0.15)');
    grad.addColorStop(0.95, 'rgba(180, 220, 230, 0.95)'); // Epsilon ring (最亮最外)
    grad.addColorStop(1.0, 'rgba(180, 220, 230, 0.0)');
  } else if (planetId === 'jupiter') {
    // 木星光环（极度暗淡的尘埃环）
    grad.addColorStop(0.0, 'rgba(255, 200, 150, 0.0)');
    grad.addColorStop(0.3, 'rgba(255, 200, 150, 0.35)'); // Halo ring
    grad.addColorStop(0.7, 'rgba(255, 200, 150, 0.1)');
    grad.addColorStop(0.9, 'rgba(255, 200, 150, 0.55)'); // Main ring
    grad.addColorStop(1.0, 'rgba(255, 200, 150, 0.0)');
  } else if (planetId === 'neptune') {
    // 海王星环（含有亮弧段的暗环）
    grad.addColorStop(0.0, 'rgba(150, 180, 255, 0.0)');
    grad.addColorStop(0.2, 'rgba(150, 180, 255, 0.25)'); // Galle
    grad.addColorStop(0.4, 'rgba(150, 180, 255, 0.05)');
    grad.addColorStop(0.6, 'rgba(150, 180, 255, 0.45)'); // Le Verrier
    grad.addColorStop(0.8, 'rgba(150, 180, 255, 0.05)');
    grad.addColorStop(0.95, 'rgba(150, 180, 255, 0.75)'); // Adams (含弧段)
    grad.addColorStop(1.0, 'rgba(150, 180, 255, 0.0)');
  } else {
    // Fallback
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
  }

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/** 生成月球朦胧雾态光晕 (Misty Moonlight Glow Sprite) 径向渐变贴图 */
export function createMoonGlowTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  // 从极透亮淡蓝白色，过度到柔和的冰蓝色，随后呈对数曲线完全弥散，创造清幽、有厚度感的「朦胧白月光」效果
  grad.addColorStop(0, 'rgba(240, 246, 255, 0.7)');
  grad.addColorStop(0.18, 'rgba(224, 242, 254, 0.45)');
  grad.addColorStop(0.42, 'rgba(186, 230, 253, 0.16)');
  grad.addColorStop(0.75, 'rgba(147, 197, 253, 0.04)');
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(64, 64, 64, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/** 生成三维宇宙背景星芒 (4-Point Diffraction Spikes) 径向渐变贴图 */
export function createUniverseStarTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(32, 32);
  const data = imgData.data;

  const decay_radius = 2.2;
  const thickness_decay = 0.55;
  const length_decay = 9.0;

  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const dx = x - 15.5;
      const dy = y - 15.5;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const glow = Math.exp(-dist / decay_radius);
      const spikeH = Math.exp(-Math.abs(dy) / thickness_decay) * Math.exp(-Math.abs(dx) / length_decay);
      const spikeV = Math.exp(-Math.abs(dx) / thickness_decay) * Math.exp(-Math.abs(dy) / length_decay);

      let intensity = glow + 0.65 * (spikeH + spikeV);
      intensity = Math.max(0.0, Math.min(1.0, intensity));

      const idx = (y * 32 + x) * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = Math.floor(intensity * 255);
    }
  }
  ctx.putImageData(imgData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// ============================================================================
// Lens Flare Textures for StarrySkyViewer
// ============================================================================

/** Soft circular bokeh blob — the classic lens flare artifact */
export function createLensFlareBlobTexture(size = 128): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx);
  grad.addColorStop(0.0, 'rgba(255, 250, 230, 0.95)');
  grad.addColorStop(0.25, 'rgba(255, 220, 160, 0.55)');
  grad.addColorStop(0.55, 'rgba(255, 160, 80, 0.18)');
  grad.addColorStop(1.0, 'rgba(255, 100, 30, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Thin ring ghost — simulates internal lens reflection */
export function createLensFlareRingTexture(size = 128): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;

  ctx.clearRect(0, 0, size, size);

  // Outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.lineWidth = size * 0.035;
  ctx.strokeStyle = 'rgba(255, 220, 160, 0.35)';
  ctx.stroke();

  // Inner faint ring
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
  ctx.lineWidth = size * 0.02;
  ctx.strokeStyle = 'rgba(255, 180, 100, 0.18)';
  ctx.stroke();

  // Soft glow behind
  const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.3);
  glowGrad.addColorStop(0, 'rgba(255, 200, 120, 0.12)');
  glowGrad.addColorStop(1, 'rgba(255, 100, 30, 0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Hexagonal aperture-shaped flare artifact */
export function createLensFlareHexTexture(size = 128): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.4;

  ctx.clearRect(0, 0, size, size);

  // Hexagon path
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3 - Math.PI / 6;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  // Fill with soft radial gradient
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0, 'rgba(255, 245, 210, 0.7)');
  grad.addColorStop(0.6, 'rgba(255, 200, 100, 0.25)');
  grad.addColorStop(1, 'rgba(255, 140, 50, 0.0)');
  ctx.fillStyle = grad;
  ctx.fill();

  // Thin bright edge
  ctx.lineWidth = size * 0.015;
  ctx.strokeStyle = 'rgba(255, 240, 200, 0.45)';
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Small star-burst sparkle for lens flare artifacts */
export function createLensFlareSparkleTexture(size = 64): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;

  ctx.clearRect(0, 0, size, size);

  // Cross spike 1
  const spikeGrad1 = ctx.createLinearGradient(cx, 0, cx, size);
  spikeGrad1.addColorStop(0, 'rgba(255, 250, 230, 0)');
  spikeGrad1.addColorStop(0.45, 'rgba(255, 250, 230, 0.0)');
  spikeGrad1.addColorStop(0.5, 'rgba(255, 250, 230, 0.9)');
  spikeGrad1.addColorStop(0.55, 'rgba(255, 250, 230, 0.0)');
  spikeGrad1.addColorStop(1, 'rgba(255, 250, 230, 0)');
  ctx.fillStyle = spikeGrad1;
  ctx.fillRect(cx - 1, 0, 2, size);

  // Cross spike 2
  const spikeGrad2 = ctx.createLinearGradient(0, cy, size, cy);
  spikeGrad2.addColorStop(0, 'rgba(255, 250, 230, 0)');
  spikeGrad2.addColorStop(0.45, 'rgba(255, 250, 230, 0.0)');
  spikeGrad2.addColorStop(0.5, 'rgba(255, 250, 230, 0.9)');
  spikeGrad2.addColorStop(0.55, 'rgba(255, 250, 230, 0.0)');
  spikeGrad2.addColorStop(1, 'rgba(255, 250, 230, 0)');
  ctx.fillStyle = spikeGrad2;
  ctx.fillRect(0, cy - 1, size, 2);

  // Diagonal spikes (dimmer)
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = 'rgba(255, 230, 180, 0.4)';
  ctx.fillRect(-0.5, -size / 2, 1, size);
  ctx.fillRect(-size / 2, -0.5, size, 1);
  ctx.restore();

  // Center hot spot
  const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.12);
  centerGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  centerGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = centerGrad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** High-frequency seamless noise texture for detail bump map */
export function createNoiseTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(256, 256);
  const data = imgData.data;

  // Generate simple high-frequency random noise
  for (let i = 0; i < 256 * 256; i++) {
    const val = Math.floor(Math.random() * 255);
    const idx = i * 4;
    data[idx] = val;     // R
    data[idx + 1] = val; // G
    data[idx + 2] = val; // B
    data[idx + 3] = 255; // A
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}
