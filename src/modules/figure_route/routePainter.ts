// 人物路线画笔：在特效画布上绘制一生行迹。全程先以淡墨细点勾出走向，
// 已走过的路程用一笔一笔的墨线（陆路浓墨、起笔重收笔轻，海路花青虚线）盖在上面，并标出站点与地名
import type { Figure } from '@/types';
import { useAtlas } from '@/store/useAtlas';
import { getLang, tx } from '@/locale';
import type { FxPainter } from '@/modules/map_view/engine/MapEngine';
import type { View } from '@/modules/map_view/engine/projection';
import { project } from '@/modules/map_view/engine/projection';
import { labelFont } from '@/modules/map_view/engine/labels';
import { pointAt, routeLegs, type Leg } from './geometry';

type Pt = [number, number];
type Box = [number, number, number, number];

const toScreen = (v: View, p: Pt): Pt => [p[0] * v.k + v.x, p[1] * v.k + v.y];

// 截取一段路程的前 frac 比例，返回屏幕坐标折线（可能因地图边缘分成多段）及各点在整段中的进度
function partialParts(leg: Leg, frac: number, v: View): { pts: Pt[]; u: number[] }[] {
  const limit = leg.length * frac;
  const out: { pts: Pt[]; u: number[] }[] = [];
  const total = Math.max(1e-9, leg.length);
  leg.parts.forEach((part, j) => {
    const cum = leg.cum[j];
    const pts: Pt[] = [];
    const u: number[] = [];
    for (let i = 0; i < part.length; i++) {
      if (cum[i] <= limit) {
        pts.push(toScreen(v, part[i]));
        u.push(cum[i] / total);
      } else {
        if (i > 0) {
          const t = (limit - cum[i - 1]) / Math.max(1e-9, cum[i] - cum[i - 1]);
          const a = part[i - 1];
          const b = part[i];
          pts.push(toScreen(v, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]));
          u.push(limit / total);
        }
        break;
      }
    }
    if (pts.length > 1) out.push({ pts, u });
  });
  return out;
}

function tracePath(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
}

// 平滑起伏的笔触粗细：两个不同频率的正弦叠加，seed 让每段各不相同
const wobble = (s: number, seed: number) => 0.5 + 0.28 * Math.sin(s * 0.11 + seed) + 0.22 * Math.sin(s * 0.047 + seed * 1.7);

// 一笔墨线：按进度由重到轻的带状多边形，笔尖收成尖锋
function brushStroke(ctx: CanvasRenderingContext2D, pts: Pt[], u: number[], seed: number, tip: boolean) {
  const n = pts.length;
  const left: Pt[] = [];
  const right: Pt[] = [];
  let run = 0;
  let total = 0;
  for (let i = 1; i < n; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / len;
    const ny = (b[0] - a[0]) / len;
    if (i > 0) run += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    let h = (1.75 - 0.75 * u[i]) * (0.78 + 0.44 * wobble(run, seed));
    h *= Math.min(1, 0.45 + run / 10);
    if (tip) h *= Math.min(1, (total - run) / 12 + 0.12);
    left.push([pts[i][0] + nx * h, pts[i][1] + ny * h]);
    right.push([pts[i][0] - nx * h, pts[i][1] - ny * h]);
  }
  ctx.beginPath();
  tracePath(ctx, left);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
  ctx.closePath();
  ctx.fill();
}

// 行进方向的小箭头，画在路段过半处
function arrow(ctx: CanvasRenderingContext2D, at: Pt, angle: number, size: number) {
  ctx.save();
  ctx.translate(at[0], at[1]);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size * 0.7, -size * 0.62);
  ctx.lineTo(-size * 0.25, 0);
  ctx.lineTo(-size * 0.7, size * 0.62);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

const overlaps = (a: Box, b: Box) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

const widths = new Map<string, number>();

function textWidth(ctx: CanvasRenderingContext2D, text: string, font: string): number {
  const key = `${font}|${text}`;
  let w = widths.get(key);
  if (w === undefined) {
    ctx.font = font;
    w = ctx.measureText(text).width;
    widths.set(key, w);
    if (widths.size > 800) widths.delete(widths.keys().next().value as string);
  }
  return w;
}

// 地名去掉括注：“帝丘（卫国都城）”只标“帝丘”
const shortPlace = (s: string) => s.replace(/\s*[（(].*?[）)]/g, '').trim();

export function makeRoutePainter(figure: Figure): FxPainter {
  const legs = routeLegs(figure);
  const stations = figure.route.map((w) => project(w.coord));
  return (ctx, view, now) => {
    const step = Math.min(useAtlas.getState().routeStep, figure.route.length - 1);
    const current = Math.floor(step + 1e-6);
    const family = labelFont(getLang());
    ctx.save();
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 全程走向：淡墨细点，尚未走到的路也一眼可见

    ctx.setLineDash([1.5, 5]);
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = 'rgba(40, 34, 28, 0.34)';
    ctx.beginPath();
    for (let i = current; i < legs.length; i++) for (const part of legs[i].parts) tracePath(ctx, part.map((p) => toScreen(view, p)));
    ctx.stroke();
    ctx.setLineDash([]);

    // 已走过的路程：先铺一道淡墨晕边，再压一笔浓墨；海路改用花青虚线

    legs.forEach((leg, i) => {
      if (i > current) return;
      const frac = i < current ? 1 : step - current;
      if (frac <= 0) return;
      const parts = partialParts(leg, frac, view);
      if (!parts.length) return;
      ctx.strokeStyle = leg.sea ? 'rgba(62, 92, 118, 0.14)' : 'rgba(20, 18, 15, 0.12)';
      ctx.lineWidth = 7;
      ctx.beginPath();
      parts.forEach((part) => tracePath(ctx, part.pts));
      ctx.stroke();
      if (leg.sea) {
        ctx.setLineDash([7, 6]);
        ctx.strokeStyle = 'rgba(52, 82, 108, 0.92)';
        ctx.lineWidth = 1.9;
        ctx.beginPath();
        parts.forEach((part) => tracePath(ctx, part.pts));
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.fillStyle = 'rgba(26, 22, 18, 0.9)';
        parts.forEach((part, j) => brushStroke(ctx, part.pts, part.u, i * 2.3 + j, frac < 1 && j === parts.length - 1));
      }
      if (frac >= 1) {
        const mid = pointAt(leg, 0.56);
        const a = toScreen(view, pointAt(leg, 0)!.p);
        const b = toScreen(view, pointAt(leg, 1)!.p);
        if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 46) {
          ctx.fillStyle = leg.sea ? 'rgba(52, 82, 108, 0.9)' : 'rgba(26, 22, 18, 0.82)';
          arrow(ctx, toScreen(view, mid.p), mid.angle, 5.2);
        }
      }
    });

    // 尚未到达的站点：淡墨空心小点

    for (let i = current + 1; i < stations.length; i++) {
      const [x, y] = toScreen(view, stations[i]);
      ctx.beginPath();
      ctx.arc(x, y, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(247, 241, 228, 0.9)';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(40, 34, 28, 0.45)';
      ctx.stroke();
    }

    // 已到过的站点与地名：同一地点只标注最近一次到达；地名在点的四周择位，放不下则略去

    const labeled = new Set<string>();
    const placed: Box[] = [];
    for (let i = current; i >= 0; i--) {
      const w = figure.route[i];
      const [x, y] = toScreen(view, stations[i]);
      const isCurrent = i === current;
      ctx.beginPath();
      ctx.arc(x, y, isCurrent ? 5.5 : 3.6, 0, Math.PI * 2);
      ctx.fillStyle = isCurrent ? '#b23a2b' : '#f7f1e4';
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = isCurrent ? '#8c2a1e' : 'rgba(26, 22, 18, 0.85)';
      ctx.stroke();
      if (isCurrent) {
        const r = 8 + ((now / 70) % 14);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(178, 58, 43, ${Math.max(0, 0.5 - (r - 8) / 28)})`;
        ctx.stroke();
      }
      const key = `${w.coord[0]},${w.coord[1]}`;
      if (labeled.has(key)) continue;
      labeled.add(key);
      if (x < -60 || y < -30 || x > view.width + 60 || y > view.height + 30) continue;
      const text = shortPlace(tx(w.place));
      const size = isCurrent ? 16 : 13;
      const font = `${size}px ${family}`;
      const tw = textWidth(ctx, text, font);
      const gap = isCurrent ? 10 : 8;
      const spots: [number, number][] = [
        [x + gap, y - 1],
        [x - gap - tw, y - 1],
        [x - tw / 2, y - size * 0.95],
        [x - tw / 2, y + size * 1.05],
      ];
      const spot = spots.find(([lx, ly]) => !placed.some((b) => overlaps(b, [lx - 2, ly - size * 0.6, lx + tw + 2, ly + size * 0.6]))) ?? (isCurrent ? spots[0] : null);
      if (!spot) continue;
      const [lx, ly] = spot;
      placed.push([lx - 2, ly - size * 0.6, lx + tw + 2, ly + size * 0.6]);
      ctx.font = font;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3.4;
      ctx.strokeStyle = 'rgba(247, 241, 228, 0.92)';
      ctx.strokeText(text, lx, ly);
      ctx.fillStyle = isCurrent ? '#7a1e14' : 'rgba(26, 22, 18, 0.86)';
      ctx.fillText(text, lx, ly);
    }
    ctx.restore();
    return true;
  };
}

// 路线当前所在位置（基准平面坐标）与前进方向，供浮层精灵跟随
export function routeHead(figure: Figure, step: number): { p: Pt; angle: number } {
  const legs = routeLegs(figure);
  const i = Math.floor(step + 1e-6);
  if (i >= legs.length) return { p: project(figure.route[figure.route.length - 1].coord), angle: 0 };
  return pointAt(legs[i], step - i);
}
