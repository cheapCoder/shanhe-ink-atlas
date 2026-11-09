// 各图层的绘制函数：所有路径都在基准平面坐标中，线宽等屏幕尺寸需除以 k
import { geoGraticule10 } from 'd3-geo';
import { BASE_H, BASE_W, applyView, intersects, spherePath, toPath2D, viewBox, type View } from './projection';
import type { Basemap } from './basemap';
import type { Polity, Snapshot } from './snapshots';
import { CINNABAR, INK, PIGMENTS, WATER_INK, deepen, rgba } from './palette';
import { WASH_SIZE, WASH_TILE_BASE, washTile } from './wash';

export type Quality = 'full' | 'fast';

let sphere: Path2D | null = null;
let graticule: Path2D | null = null;

const getSphere = () => (sphere ??= spherePath());
const getGraticule = () => (graticule ??= toPath2D(geoGraticule10()));

export function clear(ctx: CanvasRenderingContext2D) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

// 文化圈、部落等非国家实体：设色更淡、默认不标注
const CULTURE_RE = /(hunter|gatherer|tribes|peoples|nomad|culture|farmers|pastoral|forag|chiefdom|cultures|neolithic|aboriginal|amerindian|homo |neanderthal|bantu|khoisan|semites|dravidians|austronesians|papuans|inuit|sámi|saami|samis)/i;
export const isCulture = (name: string) => CULTURE_RE.test(name);

export function drawBase(ctx: CanvasRenderingContext2D, view: View, base: Basemap, quality: Quality) {
  const k = view.k;
  clear(ctx);
  applyView(ctx, view);

  // 海面留白，只在近岸以花青淡淡晕开，再勾几道水纹（半分辨率绘制后放大，降低描边与模糊的开销）

  if (quality === 'full') drawSea(ctx, view, base);

  if (base.landTexture) ctx.drawImage(base.landTexture, 0, 0, BASE_W, BASE_H);

  ctx.save();
  ctx.strokeStyle = 'rgba(60, 52, 44, 0.13)';
  ctx.lineWidth = 0.6 / k;
  ctx.setLineDash([2 / k, 4 / k]);
  ctx.stroke(getGraticule());
  ctx.restore();

  // 图廓：一道淡墨晕边加一根细线，像装裱时画心与绫边的交界

  ctx.save();
  ctx.strokeStyle = 'rgba(70, 58, 44, 0.1)';
  ctx.lineWidth = 10 / k;
  if (quality === 'full') ctx.filter = 'blur(5px)';
  ctx.stroke(getSphere());
  ctx.filter = 'none';
  ctx.strokeStyle = 'rgba(52, 44, 36, 0.38)';
  ctx.lineWidth = 0.8 / k;
  ctx.stroke(getSphere());
  ctx.restore();
}

// 近岸晕染与水纹：由外向内逐圈“宽描边再挖空”，得到距海岸等距的细线，最后去掉陆地内侧
let seaCanvas: HTMLCanvasElement | null = null;
const SEA_SCALE = 0.5;

// 宽描边与模糊会抹平海岸细节，中心线可容许 1 个海面画布像素的简化误差
const SEA_ERROR_PX = 1;

function drawSea(ctx: CanvasRenderingContext2D, view: View, base: Basemap) {
  seaCanvas ??= document.createElement('canvas');
  const off = seaCanvas;
  const w = Math.ceil(ctx.canvas.width * SEA_SCALE);
  const h = Math.ceil(ctx.canvas.height * SEA_SCALE);
  if (off.width !== w || off.height !== h) {
    off.width = w;
    off.height = h;
  }
  const o = off.getContext('2d')!;
  o.setTransform(1, 0, 0, 1, 0, 0);
  o.clearRect(0, 0, w, h);
  const s = view.dpr * SEA_SCALE;
  o.setTransform(view.k * s, 0, 0, view.k * s, view.x * s, view.y * s);
  o.lineJoin = 'round';
  const k = view.k;
  const ripple = base.rippleLand.in(view, 'stroke', SEA_SCALE, SEA_ERROR_PX);
  o.filter = 'blur(5px)';
  o.strokeStyle = 'rgba(78, 112, 128, 0.075)';
  o.lineWidth = 30 / k;
  o.stroke(ripple);
  o.filter = 'blur(1.5px)';
  o.strokeStyle = 'rgba(78, 112, 128, 0.08)';
  o.lineWidth = 9 / k;
  o.stroke(base.land.in(view, 'stroke', SEA_SCALE, SEA_ERROR_PX));
  o.filter = 'none';
  [14.5, 9, 4.5].forEach((d, i) => {
    o.globalCompositeOperation = 'source-over';
    o.strokeStyle = `rgba(62, 84, 92, ${0.2 + i * 0.1})`;
    o.lineWidth = (2 * d + 1.4) / k;
    o.stroke(ripple);
    o.globalCompositeOperation = 'destination-out';
    o.strokeStyle = '#000';
    o.lineWidth = (2 * d - 0.2) / k;
    o.stroke(ripple);
  });
  o.globalCompositeOperation = 'destination-out';
  o.fillStyle = '#000';
  o.fill(base.land.in(view, 'fill', SEA_SCALE));
  o.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(off, 0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

const strokeEach = (ctx: CanvasRenderingContext2D, paths: Path2D[]) => paths.forEach((p) => ctx.stroke(p));

const patterns = new Map<string, CanvasPattern>();

// 设色用的淡彩纹理图案，纹理坐标落在基准平面上，随地图一同缩放平移
function washPattern(ctx: CanvasRenderingContext2D, hex: string, alpha: number): CanvasPattern | string {
  const a = Math.round(alpha * 50) / 50;
  const key = `${hex}|${a}`;
  let p = patterns.get(key);
  if (!p) {
    p = ctx.createPattern(washTile(hex, a), 'repeat') ?? undefined;
    if (!p) return rgba(hex, alpha);
    p.setTransform(new DOMMatrix().scale(WASH_TILE_BASE / WASH_SIZE));
    patterns.set(key, p);
  }
  return p;
}

export interface PolityStyle {
  colors: number[];
  highlight: Map<number, 1 | 2> | null;
  highlightColor: string;
}

export function drawPolities(ctx: CanvasRenderingContext2D, view: View, base: Basemap, snap: Snapshot, style: PolityStyle, quality: Quality) {
  const k = view.k;
  clear(ctx);
  applyView(ctx, view);
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const dim = style.highlight !== null;
  const minScreen = 1.5 / k;
  const box = viewBox(view, 16);
  const visible = snap.polities.filter((p) => intersects(box, p.bbox));
  for (const p of visible) {
    if (p.bbox[2] - p.bbox[0] < minScreen && p.bbox[3] - p.bbox[1] < minScreen) continue;
    const level = style.highlight?.get(p.index) ?? 0;
    const hex = level ? style.highlightColor : PIGMENTS[style.colors[p.index] ?? 0];
    const culture = isCulture(p.name);
    let alpha = culture ? 0.13 : 0.3;
    if (dim) alpha = level === 1 ? 0.4 : level === 2 ? 0.2 : alpha * 0.32;
    ctx.fillStyle = quality === 'full' ? washPattern(ctx, hex, alpha) : rgba(hex, alpha);
    ctx.fill(p.path);
  }
  ctx.globalCompositeOperation = 'source-over';

  // 晕边：在多边形内侧叠几道由宽到窄的描边，模拟颜料在纸上向边缘聚集

  if (quality === 'full') {
    const big = visible
      .filter((p) => (p.bbox[2] - p.bbox[0]) * k >= 14 && !isCulture(p.name))
      .sort((a, b) => b.area - a.area)
      .slice(0, 140);
    for (const p of big) {
      const level = style.highlight?.get(p.index) ?? 0;
      if (dim && !level) continue;
      const hex = deepen(level ? style.highlightColor : PIGMENTS[style.colors[p.index] ?? 0], 0.3);
      ctx.save();
      ctx.clip(p.path);
      ctx.strokeStyle = rgba(hex, 0.07);
      ctx.lineWidth = 9 / k;
      ctx.stroke(p.path);
      ctx.strokeStyle = rgba(hex, 0.1);
      ctx.lineWidth = 3.5 / k;
      ctx.stroke(p.path);
      ctx.restore();
    }
  }

  const borders = snap.borders.filter((b) => intersects(box, b.box)).map((b) => b.path);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba(INK, dim ? 0.18 : 0.32);
  ctx.lineWidth = 2.2 / k;
  strokeEach(ctx, borders);
  ctx.strokeStyle = rgba(INK, dim ? 0.3 : 0.55);
  ctx.lineWidth = 0.7 / k;
  strokeEach(ctx, borders);

  if (style.highlight) {
    for (const [i, level] of style.highlight) {
      ctx.strokeStyle = rgba(deepen(style.highlightColor, 0.25), level === 1 ? 0.85 : 0.55);
      ctx.lineWidth = (level === 1 ? 1.6 : 1) / k;
      ctx.setLineDash(level === 1 ? [] : [4 / k, 3 / k]);
      ctx.stroke(snap.polities[i].path);
    }
    ctx.setLineDash([]);
  }

  // 只保留陆地部分：画完后按陆地遮罩一次性抠掉海面。若先 clip 再画，上千次填充与描边每次都要与复杂裁剪区求交，GPU 开销高出数倍

  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = '#000';
  ctx.fill(base.land.in(view, 'fill'));
  ctx.restore();
}

export function drawWater(ctx: CanvasRenderingContext2D, view: View, base: Basemap) {
  const k = view.k;
  clear(ctx);
  applyView(ctx, view);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const lakes = base.lakes.in(view, 'fill');
  ctx.fillStyle = 'rgba(236, 232, 220, 0.92)';
  ctx.fill(lakes);
  ctx.fillStyle = 'rgba(96, 128, 140, 0.12)';
  ctx.fill(lakes);
  ctx.strokeStyle = rgba(WATER_INK, 0.55);
  ctx.lineWidth = 0.7 / k;
  strokeEach(ctx, base.lakes.pieces(view));

  // 河流：等级越高越粗；缩放越大显示越多支流

  const maxRank = k > 2.2 ? 6 : k > 1.2 ? 5 : 4;
  base.riversByRank.forEach((path, rank) => {
    if (rank > maxRank) return;
    const w = Math.max(0.35, 1.5 - rank * 0.2) * Math.min(1.6, Math.sqrt(k / 0.7));
    ctx.strokeStyle = rgba(WATER_INK, 0.6 - rank * 0.04);
    ctx.lineWidth = w / k;
    strokeEach(ctx, path.pieces(view));
  });
  ctx.strokeStyle = 'rgba(30, 26, 22, 0.6)';
  ctx.lineWidth = 0.9 / k;
  strokeEach(ctx, base.land.pieces(view));
}

export function drawHover(ctx: CanvasRenderingContext2D, view: View, p: Polity | null, color = INK) {
  if (!p) return;
  applyView(ctx, view);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba(color === INK ? '#000000' : color, 0.16);
  ctx.lineWidth = 6 / view.k;
  ctx.stroke(p.path);
  ctx.strokeStyle = rgba(color, 0.85);
  ctx.lineWidth = 1.4 / view.k;
  ctx.stroke(p.path);
  ctx.restore();
}

export { CINNABAR };
