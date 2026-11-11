// 政权名称标注：面积大者优先，字号由“最远内点”的内切圆决定，碰撞者舍去。
// 中文用毛笔字逐字排开；英文用衬线体，名称较长时折成两行
import type { Lang } from '@/types';
import type { View } from './projection';
import type { Snapshot } from './snapshots';
import type { ChinaSea, RiverLabel } from './basemap';
import { isCulture } from './render';

export interface LabelSpec {
  lines: string[];
  x: number;
  y: number;
  size: number;
  spacing: number;
  // 整块标注的宽高（CSS 像素）
  width: number;
  height: number;
  alpha: number;
  culture: boolean;
  lit: boolean;
  font: string;
}

export const LABEL_FONT = '"Ma Shan Zheng", "STKaiti", "KaiTi", serif';
export const LABEL_FONT_EN = '"Cormorant Garamond", "Noto Serif SC", Georgia, serif';

export const labelFont = (lang: Lang) => (lang === 'zh' ? LABEL_FONT : LABEL_FONT_EN);

const MAX_SIZE = 34;
const MAX_SIZE_EN = 27;

// 字号吸附到 1/8 倍频程的阶梯上：笔画繁复的毛笔字每换一个字号都要重新生成整套字形，
// 吸附后缩放重排时多数字号都能命中字形缓存
const SIZE_STEPS = 8;
const snapSize = (size: number) => 2 ** (Math.round(Math.log2(size) * SIZE_STEPS) / SIZE_STEPS);

type Box = [number, number, number, number];
const overlaps = (a: Box, b: Box) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

// 英文每个字符的宽度（以字号为单位）：先按 100 像素字号实测，随后按比例换算
let ruler: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null = null;
const ems = new Map<string, number>();

function emWidth(text: string, font: string): number {
  const key = `${font}|${text}`;
  let w = ems.get(key);
  if (w === undefined) {
    ruler ??= (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(4, 4) : document.createElement('canvas')).getContext('2d') as typeof ruler;
    ruler!.font = `100px ${font}`;
    w = ruler!.measureText(text).width / 100;
    ems.set(key, w);
    if (ems.size > 4000) ems.delete(ems.keys().next().value as string);
  }
  return w;
}

// 西文字体换成网页字体后，此前按后备字体量得的宽度作废
export const resetLabelMetrics = () => ems.clear();

// 较长的英文名称在最接近中点的空格处折成两行
function wrapLatin(text: string): string[] {
  if (text.length <= 11 || !text.includes(' ')) return [text];
  const mid = text.length / 2;
  let best = -1;
  for (let i = 0; i < text.length; i++) if (text[i] === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  return best < 0 ? [text] : [text.slice(0, best), text.slice(best + 1)];
}

export function layoutLabels(
  snap: Snapshot,
  view: View,
  lang: Lang,
  nameOf: (name: string) => string | null,
  highlight: Map<number, 1 | 2> | null,
): LabelSpec[] {
  const placed: Box[] = [];
  const specs: LabelSpec[] = [];
  const latin = lang !== 'zh';
  const font = labelFont(lang);
  const order = [...snap.polities].sort((a, b) => {
    const la = highlight?.has(a.index) ? 3 - highlight.get(a.index)! : 0;
    const lb = highlight?.has(b.index) ? 3 - highlight.get(b.index)! : 0;
    return lb - la || b.area - a.area;
  });
  for (const p of order) {
    if (!p.anchor) continue;
    const text = nameOf(p.name);
    if (!text) continue;
    const culture = isCulture(p.name);
    const lit = highlight?.get(p.index) === 1;
    const x = p.anchor[0] * view.k + view.x;
    const y = p.anchor[1] * view.k + view.y;
    if (x < -50 || y < -50 || x > view.width + 50 || y > view.height + 50) continue;
    const radius = p.r * view.k;
    let lines: string[];
    let size: number;
    let spacing: number;
    let width: number;
    if (latin) {
      lines = wrapLatin(text);
      const em = Math.max(...lines.map((l) => emWidth(l, font))) * 1.06;
      size = Math.min(MAX_SIZE_EN, (radius * 2.7) / em, (radius * 1.9) / (lines.length * 1.05));
      if (lit) size = Math.max(size, 15);
      if (size < (culture ? 12.5 : 11)) continue;
      size = Math.min(MAX_SIZE_EN, snapSize(size));
      spacing = size > 17 ? size * 0.06 : 0;
      width = em * size + spacing * Math.max(...lines.map((l) => l.length));
    } else {
      lines = [text];
      const n = [...text].length;
      size = Math.min(MAX_SIZE, (radius * 2.6) / (n * 1.12));
      if (lit) size = Math.max(size, 15);
      if (size < (culture ? 13 : 10.5)) continue;
      size = Math.min(MAX_SIZE, snapSize(size));
      spacing = size > 18 ? size * 0.28 : size * 0.1;
      width = n * size + (n - 1) * spacing;
    }
    const height = lines.length * size * (latin ? 1.08 : 1.24);
    const box: Box = [x - width / 2 - 3, y - height / 2, x + width / 2 + 3, y + height / 2];
    if (placed.some((b) => overlaps(b, box))) continue;
    placed.push(box);
    const alpha = culture ? 0.42 : highlight && !lit ? 0.38 : 0.86;
    specs.push({ lines, x, y, size, spacing, width, height, alpha, culture, lit, font });
  }
  return specs;
}

interface Sprite {
  image: ImageBitmap;
  // 锚点（标注中心）在位图中的设备像素位置
  ox: number;
  oy: number;
}

// 标注位图缓存：同一（文字、字号、透明度、高亮、衬底）只光栅化一次，重排时直接贴图。
// 毛笔字字形繁复，逐字光栅化是标注重绘的主要开销，大量字号还会挤占字形缓存
const SPRITE_LIMIT = 600;
const sprites = new Map<string, Sprite>();

// halo：纸色衬底描边
function paintLabel(ctx: OffscreenCanvasRenderingContext2D, s: LabelSpec, x: number, y: number, halo: boolean) {
  const latin = s.font !== LABEL_FONT;
  ctx.font = `${latin && s.culture ? 'italic ' : ''}${latin ? '500 ' : ''}${s.size.toFixed(1)}px ${s.font}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${s.spacing.toFixed(1)}px`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const step = s.height / s.lines.length;
  s.lines.forEach((line, i) => {
    const ly = y + (i - (s.lines.length - 1) / 2) * step;
    if (halo) {
      ctx.lineJoin = 'round';
      ctx.strokeStyle = `rgba(243, 236, 222, ${s.alpha * 0.8})`;
      ctx.lineWidth = Math.max(2.5, s.size * 0.2);
      ctx.strokeText(line, x + s.spacing / 2, ly);
    }
    ctx.fillStyle = s.lit ? `rgba(122, 30, 20, ${s.alpha})` : `rgba(24, 21, 18, ${s.alpha})`;
    ctx.fillText(line, x + s.spacing / 2, ly);
  });
}

function labelSprite(s: LabelSpec, dpr: number, halo: boolean): Sprite {
  const key = `${s.lines.join('\n')}|${s.size}|${s.alpha}|${s.lit}|${halo}|${dpr}|${s.font.length}`;
  const hit = sprites.get(key);
  if (hit) {
    sprites.delete(key);
    sprites.set(key, hit);
    return hit;
  }
  const pad = Math.max(2.5, s.size * 0.2) + 4;
  const w = s.width + s.size * 0.5 + pad * 2;
  const h = s.height + s.size * 0.5 + pad * 2;
  const canvas = new OffscreenCanvas(Math.ceil(w * dpr), Math.ceil(h * dpr));
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  paintLabel(ctx, s, w / 2, h / 2, halo);
  const sprite = { image: canvas.transferToImageBitmap(), ox: (w / 2) * dpr, oy: (h / 2) * dpr };
  sprites.set(key, sprite);
  if (sprites.size > SPRITE_LIMIT) {
    const [oldest, old] = sprites.entries().next().value!;
    old.image.close();
    sprites.delete(oldest);
  }
  return sprite;
}

// halo：衬底描边比填充贵得多，交互中省去，静止后补上
export function drawLabels(ctx: CanvasRenderingContext2D, specs: LabelSpec[], dpr: number, halo = true) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (const s of specs) {
    const { image, ox, oy } = labelSprite(s, dpr, halo);
    ctx.drawImage(image, Math.round(s.x * dpr - ox), Math.round(s.y * dpr - oy));
  }
}

// 河流名：缩放到一定程度后沿河道方向书写，等级高者先出现
export function drawRiverLabels(ctx: CanvasRenderingContext2D, labels: RiverLabel[], view: View, lang: Lang, nameOf: (zh: string) => string | null) {
  if (view.k < 0.9) return;
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const maxRank = view.k > 3 ? 6 : view.k > 1.8 ? 4 : 2;
  const latin = lang !== 'zh';
  for (const l of labels) {
    if (l.rank > maxRank) continue;
    const name = nameOf(l.name);
    if (!name) continue;
    const x = l.at[0] * view.k + view.x;
    const y = l.at[1] * view.k + view.y;
    if (x < 0 || y < 0 || x > view.width || y > view.height) continue;
    const size = snapSize(Math.min(17, 10 + view.k * 1.4));
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(l.angle);
    ctx.font = `${latin ? 'italic 500 ' : ''}${size.toFixed(1)}px ${labelFont(lang)}`;
    ctx.fillStyle = 'rgba(52, 76, 86, 0.78)';
    ctx.fillText(name, 0, -size * 0.75);
    ctx.restore();
  }
}

// 南海诸岛地名：放大后标注
export function drawSeaLabels(ctx: CanvasRenderingContext2D, sea: ChinaSea, view: View, lang: Lang, nameOf: (zh: string) => string | null) {
  const k = view.k;
  ctx.save();
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${lang === 'zh' ? '' : 'italic 500 '}${Math.min(15, 9 + k).toFixed(1)}px ${labelFont(lang)}`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(243, 236, 222, 0.8)';
  ctx.fillStyle = 'rgba(31, 29, 26, 0.72)';
  for (const l of sea.labels) {
    if (k < l.minK) continue;
    const name = nameOf(l.name);
    if (!name) continue;
    const x = l.at[0] * k + view.x;
    const y = l.at[1] * k + view.y;
    if (x < -40 || y < -20 || x > view.width + 40 || y > view.height + 20) continue;
    ctx.strokeText(name, x, y);
    ctx.fillText(name, x, y);
  }
  ctx.restore();
}
