// 各图层的绘制函数：所有路径都在基准平面坐标中，线宽等屏幕尺寸需除以 k
import { geoGraticule10 } from 'd3-geo';
import { BASE_H, BASE_W, applyView, spherePath, toPath2D, type View } from './projection';
import type { Basemap, ChinaSea } from './basemap';
import type { Polity, Snapshot } from './snapshots';
import { CINNABAR, INK, PIGMENTS, WATER_INK, deepen, rgba } from './palette';
import { WASH_SIZE, WASH_TILE_BASE, washTile } from './wash';
import { LABEL_FONT } from './labels';

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
  o.filter = 'blur(5px)';
  o.strokeStyle = 'rgba(78, 112, 128, 0.075)';
  o.lineWidth = 30 / k;
  o.stroke(base.rippleLand);
  o.filter = 'blur(1.5px)';
  o.strokeStyle = 'rgba(78, 112, 128, 0.08)';
  o.lineWidth = 9 / k;
  o.stroke(base.land);
  o.filter = 'none';
  [14.5, 9, 4.5].forEach((d, i) => {
    o.globalCompositeOperation = 'source-over';
    o.strokeStyle = `rgba(62, 84, 92, ${0.2 + i * 0.1})`;
    o.lineWidth = (2 * d + 1.4) / k;
    o.stroke(base.rippleLand);
    o.globalCompositeOperation = 'destination-out';
    o.strokeStyle = '#000';
    o.lineWidth = (2 * d - 0.2) / k;
    o.stroke(base.rippleLand);
  });
  o.globalCompositeOperation = 'destination-out';
  o.fillStyle = '#000';
  o.fill(base.land);
  o.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(off, 0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

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
  ctx.clip(base.land);
  ctx.globalCompositeOperation = 'multiply';
  const dim = style.highlight !== null;
  const minScreen = 1.5 / k;
  for (const p of snap.polities) {
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
    const big = snap.polities
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

  ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba(INK, dim ? 0.18 : 0.32);
  ctx.lineWidth = 2.2 / k;
  ctx.stroke(snap.borders);
  ctx.strokeStyle = rgba(INK, dim ? 0.3 : 0.55);
  ctx.lineWidth = 0.7 / k;
  ctx.stroke(snap.borders);

  if (style.highlight) {
    for (const [i, level] of style.highlight) {
      ctx.strokeStyle = rgba(deepen(style.highlightColor, 0.25), level === 1 ? 0.85 : 0.55);
      ctx.lineWidth = (level === 1 ? 1.6 : 1) / k;
      ctx.setLineDash(level === 1 ? [] : [4 / k, 3 / k]);
      ctx.stroke(snap.polities[i].path);
    }
    ctx.setLineDash([]);
  }
  ctx.restore();
  if (base.chinaSea && snap.meta.year >= CHINA_SEA_SINCE) drawChinaSea(ctx, view, base.chinaSea, dim ? 0.5 : 1);
}

// 南海断续线与南海诸岛：中华人民共和国成立后的切片显示；断续线同国界线墨色，岛礁以墨点示意，放大后标注地名
const CHINA_SEA_SINCE = 1949;

function drawChinaSea(ctx: CanvasRenderingContext2D, view: View, sea: ChinaSea, alpha: number) {
  const k = view.k;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(INK, 0.32 * alpha);
  ctx.lineWidth = 2.2 / k;
  ctx.stroke(sea.dashes);
  ctx.strokeStyle = rgba(INK, 0.7 * alpha);
  ctx.lineWidth = 0.9 / k;
  ctx.stroke(sea.dashes);
  const r = Math.min(1.4, 0.5 + k * 0.2) / k;
  ctx.fillStyle = rgba(INK, 0.6 * alpha);
  ctx.beginPath();
  for (const [x, y] of sea.islands) {
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.min(15, 9 + k).toFixed(1)}px ${LABEL_FONT}`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = `rgba(243, 236, 222, ${0.8 * alpha})`;
  ctx.fillStyle = rgba(INK, 0.72 * alpha);
  for (const l of sea.labels) {
    if (k < l.minK) continue;
    const x = l.at[0] * k + view.x;
    const y = l.at[1] * k + view.y;
    ctx.strokeText(l.name, x, y);
    ctx.fillText(l.name, x, y);
  }
  ctx.restore();
}

export function drawWater(ctx: CanvasRenderingContext2D, view: View, base: Basemap) {
  const k = view.k;
  clear(ctx);
  applyView(ctx, view);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.fillStyle = 'rgba(236, 232, 220, 0.92)';
  ctx.fill(base.lakes);
  ctx.fillStyle = 'rgba(96, 128, 140, 0.12)';
  ctx.fill(base.lakes);
  ctx.strokeStyle = rgba(WATER_INK, 0.55);
  ctx.lineWidth = 0.7 / k;
  ctx.stroke(base.lakes);

  // 河流：等级越高越粗；缩放越大显示越多支流

  const maxRank = k > 2.2 ? 6 : k > 1.2 ? 5 : 4;
  base.riversByRank.forEach((path, rank) => {
    if (rank > maxRank) return;
    const w = Math.max(0.35, 1.5 - rank * 0.2) * Math.min(1.6, Math.sqrt(k / 0.7));
    ctx.strokeStyle = rgba(WATER_INK, 0.6 - rank * 0.04);
    ctx.lineWidth = w / k;
    ctx.stroke(path);
  });
  ctx.strokeStyle = 'rgba(30, 26, 22, 0.6)';
  ctx.lineWidth = 0.9 / k;
  ctx.stroke(base.land);
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
