// 人物路线画笔：在特效画布上绘制已走过的路程（陆路浓墨、海路花青虚线）、站点与地名
import type { Figure } from '@/types';
import { useAtlas } from '@/store/useAtlas';
import type { FxPainter } from '@/modules/map_view/engine/MapEngine';
import type { View } from '@/modules/map_view/engine/projection';
import { project } from '@/modules/map_view/engine/projection';
import { LABEL_FONT } from '@/modules/map_view/engine/labels';
import { pointAt, routeLegs, type Leg } from './geometry';

type Pt = [number, number];
const toScreen = (v: View, p: Pt): Pt => [p[0] * v.k + v.x, p[1] * v.k + v.y];

// 截取一段路程的前 frac 比例，返回屏幕坐标折线（可能因日界线分成多段）
function partialParts(leg: Leg, frac: number, v: View): Pt[][] {
  const limit = leg.length * frac;
  const out: Pt[][] = [];
  leg.parts.forEach((part, j) => {
    const cum = leg.cum[j];
    const seg: Pt[] = [];
    for (let i = 0; i < part.length; i++) {
      if (cum[i] <= limit) seg.push(toScreen(v, part[i]));
      else {
        if (i > 0) {
          const t = (limit - cum[i - 1]) / Math.max(1e-9, cum[i] - cum[i - 1]);
          const a = part[i - 1];
          const b = part[i];
          seg.push(toScreen(v, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]));
        }
        break;
      }
    }
    if (seg.length > 1) out.push(seg);
  });
  return out;
}

function strokeParts(ctx: CanvasRenderingContext2D, parts: Pt[][]) {
  ctx.beginPath();
  for (const part of parts) {
    ctx.moveTo(part[0][0], part[0][1]);
    for (let i = 1; i < part.length; i++) ctx.lineTo(part[i][0], part[i][1]);
  }
  ctx.stroke();
}

export function makeRoutePainter(figure: Figure): FxPainter {
  const legs = routeLegs(figure);
  return (ctx, view, now) => {
    const step = Math.min(useAtlas.getState().routeStep, figure.route.length - 1);
    const current = Math.floor(step + 1e-6);
    ctx.save();
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 路程：先铺一道淡墨晕边，再压一笔浓墨；海路改用花青虚线

    legs.forEach((leg, i) => {
      if (i > current) return;
      const frac = i < current ? 1 : step - current;
      if (frac <= 0) return;
      const parts = partialParts(leg, frac, view);
      ctx.setLineDash([]);
      ctx.strokeStyle = leg.sea ? 'rgba(62, 92, 118, 0.14)' : 'rgba(20, 18, 15, 0.14)';
      ctx.lineWidth = 7;
      strokeParts(ctx, parts);
      ctx.setLineDash(leg.sea ? [7, 6] : []);
      ctx.strokeStyle = leg.sea ? 'rgba(52, 82, 108, 0.9)' : 'rgba(26, 22, 18, 0.88)';
      ctx.lineWidth = leg.sea ? 1.8 : 2.4;
      strokeParts(ctx, parts);
    });
    ctx.setLineDash([]);

    // 站点与地名：同一地点只标注最近一次到达

    const labeled = new Set<string>();
    for (let i = current; i >= 0; i--) {
      const w = figure.route[i];
      const [x, y] = toScreen(view, project(w.coord));
      const key = `${w.coord[0]},${w.coord[1]}`;
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
      if (labeled.has(key)) continue;
      labeled.add(key);
      ctx.font = `${isCurrent ? 16 : 13}px ${LABEL_FONT}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const text = w.place.replace(/（.*?）/g, '');
      ctx.lineWidth = 3.4;
      ctx.strokeStyle = 'rgba(247, 241, 228, 0.9)';
      ctx.strokeText(text, x + 9, y - 1);
      ctx.fillStyle = isCurrent ? '#7a1e14' : 'rgba(26, 22, 18, 0.86)';
      ctx.fillText(text, x + 9, y - 1);
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
