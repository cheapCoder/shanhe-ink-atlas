// 程序化生成宣纸纹理：底色 → 陈旧斑痕 → 纸纤维 → 细颗粒 → 暗角
export function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let r = Math.imul(s ^ (s >>> 15), 1 | s);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

let grainTile: HTMLCanvasElement | null = null;

// 256×256 的灰度噪声贴片，供宣纸与墨色叠加纹理复用
export function getGrainTile(): HTMLCanvasElement {
  if (grainTile) return grainTile;
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const rand = seededRandom(7);
  for (let i = 0; i < size * size; i++) {
    const v = 90 + rand() * 80;
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v * 0.93;
    img.data[i * 4 + 2] = v * 0.82;
    img.data[i * 4 + 3] = rand() < 0.5 ? rand() * 26 : 0;
  }
  ctx.putImageData(img, 0, 0);
  grainTile = c;
  return c;
}

export function paintPaper(canvas: HTMLCanvasElement, width: number, height: number, dpr: number) {
  const w = Math.max(1, Math.round(width * dpr));
  const h = Math.max(1, Math.round(height * dpr));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const rand = seededRandom(20251022);

  ctx.fillStyle = '#f4ecdb';
  ctx.fillRect(0, 0, w, h);

  // 陈旧斑痕：大尺度、低透明度的暖色与亮色晕斑

  for (let i = 0; i < 28; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = (0.12 + rand() * 0.4) * Math.max(w, h);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const dark = rand() < 0.62;
    g.addColorStop(0, dark ? `rgba(160, 120, 62, ${0.02 + rand() * 0.035})` : `rgba(255, 253, 245, ${0.07 + rand() * 0.07})`);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  // 纸纤维：大量短而弯曲的细线

  const fibers = Math.round((w * h) / 1400);
  ctx.lineCap = 'round';
  for (let i = 0; i < fibers; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const len = (5 + rand() * 24) * dpr;
    const a = rand() * Math.PI * 2;
    const bend = (rand() - 0.5) * len * 0.8;
    ctx.strokeStyle = rand() < 0.7 ? `rgba(120, 96, 60, ${0.025 + rand() * 0.05})` : `rgba(255, 253, 246, ${0.08 + rand() * 0.1})`;
    ctx.lineWidth = (0.35 + rand() * 0.7) * dpr;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.5 - Math.sin(a) * bend, y + Math.sin(a) * len * 0.5 + Math.cos(a) * bend, x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }

  const pattern = ctx.createPattern(getGrainTile(), 'repeat');
  if (pattern) {
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }

  // 四周暗角，模拟装裱后纸边的陈旧感

  const vg = ctx.createRadialGradient(w / 2, h * 0.46, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.62);
  vg.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vg.addColorStop(1, 'rgba(120, 88, 46, 0.2)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
}
