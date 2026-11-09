// 政权名称标注：面积大者优先，字号由“最远内点”的内切圆决定，碰撞者舍去
import type { View } from './projection';
import type { Snapshot } from './snapshots';
import type { RiverLabel } from './basemap';
import { isCulture } from './render';

export interface LabelSpec {
  text: string;
  x: number;
  y: number;
  size: number;
  spacing: number;
  alpha: number;
  culture: boolean;
  lit: boolean;
}

export const LABEL_FONT = '"Ma Shan Zheng", "STKaiti", "KaiTi", serif';
const MAX_SIZE = 34;

type Box = [number, number, number, number];
const overlaps = (a: Box, b: Box) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

export function layoutLabels(
  snap: Snapshot,
  view: View,
  nameOf: (name: string) => string | null,
  highlight: Map<number, 1 | 2> | null,
): LabelSpec[] {
  const placed: Box[] = [];
  const specs: LabelSpec[] = [];
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
    const n = [...text].length;
    let size = Math.min(MAX_SIZE, (radius * 2.6) / (n * 1.12));
    if (lit) size = Math.max(size, 15);
    const min = culture ? 13 : 10.5;
    if (size < min) continue;
    const spacing = size > 18 ? size * 0.28 : size * 0.1;
    const w = n * size + (n - 1) * spacing;
    const box: Box = [x - w / 2 - 3, y - size * 0.62, x + w / 2 + 3, y + size * 0.62];
    if (placed.some((b) => overlaps(b, box))) continue;
    placed.push(box);
    const alpha = culture ? 0.42 : highlight && !lit ? 0.38 : 0.86;
    specs.push({ text, x, y, size, spacing, alpha, culture, lit });
  }
  return specs;
}

export function drawLabels(ctx: CanvasRenderingContext2D, specs: LabelSpec[], dpr: number) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const s of specs) {
    ctx.font = `${s.size.toFixed(1)}px ${LABEL_FONT}`;
    if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${s.spacing.toFixed(1)}px`;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = `rgba(243, 236, 222, ${s.alpha * 0.8})`;
    ctx.lineWidth = Math.max(2.5, s.size * 0.2);
    ctx.strokeText(s.text, s.x + s.spacing / 2, s.y);
    ctx.fillStyle = s.lit ? `rgba(122, 30, 20, ${s.alpha})` : `rgba(24, 21, 18, ${s.alpha})`;
    ctx.fillText(s.text, s.x + s.spacing / 2, s.y);
  }
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';
}

// 河流名：缩放到一定程度后沿河道方向书写，等级高者先出现
export function drawRiverLabels(ctx: CanvasRenderingContext2D, labels: RiverLabel[], view: View) {
  if (view.k < 0.9) return;
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const maxRank = view.k > 3 ? 6 : view.k > 1.8 ? 4 : 2;
  for (const l of labels) {
    if (l.rank > maxRank) continue;
    const x = l.at[0] * view.k + view.x;
    const y = l.at[1] * view.k + view.y;
    if (x < 0 || y < 0 || x > view.width || y > view.height) continue;
    const size = Math.min(17, 10 + view.k * 1.4);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(l.angle);
    ctx.font = `${size.toFixed(1)}px ${LABEL_FONT}`;
    ctx.fillStyle = 'rgba(52, 76, 86, 0.78)';
    ctx.fillText(l.name, 0, -size * 0.75);
    ctx.restore();
  }
}
