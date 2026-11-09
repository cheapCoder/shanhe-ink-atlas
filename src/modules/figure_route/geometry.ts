// 路线几何：按大圆插值加密、投影到基准平面，跨越日界线时断开；支持按路程比例取点
import { geoDistance, geoInterpolate } from 'd3-geo';
import type { Figure, LonLat, Waypoint } from '@/types';
import { BASE_W, project } from '@/modules/map_view/engine/projection';

type Pt = [number, number];

export interface Leg {
  sea: boolean;
  parts: Pt[][];
  cum: number[][];
  length: number;
}

export const haversineKm = (a: LonLat, b: LonLat) => geoDistance(a, b) * 6371.0088;

export const legLonLats = (a: Waypoint, b: Waypoint): LonLat[] => [a.coord, ...(b.via ?? []), b.coord];

function densify(points: LonLat[], stepRad = 0.02): LonLat[] {
  const out: LonLat[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const d = geoDistance(points[i - 1], points[i]);
    const n = Math.max(1, Math.ceil(d / stepRad));
    const interp = geoInterpolate(points[i - 1], points[i]);
    for (let k = 1; k <= n; k++) out.push(interp(k / n) as LonLat);
  }
  return out;
}

function buildLeg(a: Waypoint, b: Waypoint): Leg {
  const parts: Pt[][] = [[]];
  for (const ll of densify(legLonLats(a, b))) {
    const p = project(ll);
    const cur = parts[parts.length - 1];
    const prev = cur[cur.length - 1];
    if (prev && Math.abs(p[0] - prev[0]) > BASE_W * 0.4) parts.push([p]);
    else cur.push(p);
  }
  let length = 0;
  const cum = parts.map((part) =>
    part.map((p, i) => {
      if (i > 0) length += Math.hypot(p[0] - part[i - 1][0], p[1] - part[i - 1][1]);
      return length;
    }),
  );
  return { sea: !!b.sea, parts, cum, length };
}

const cache = new Map<string, Leg[]>();

export function routeLegs(f: Figure): Leg[] {
  const hit = cache.get(f.id);
  if (hit) return hit;
  const legs = f.route.slice(1).map((b, i) => buildLeg(f.route[i], b));
  cache.set(f.id, legs);
  return legs;
}

// 取一段路程上比例 frac 处的点与前进方向
export function pointAt(leg: Leg, frac: number): { p: Pt; angle: number } {
  const target = leg.length * Math.min(1, Math.max(0, frac));
  for (let j = 0; j < leg.parts.length; j++) {
    const part = leg.parts[j];
    const cum = leg.cum[j];
    if (target > cum[cum.length - 1] && j < leg.parts.length - 1) continue;
    for (let i = 1; i < part.length; i++) {
      if (cum[i] >= target) {
        const t = (target - cum[i - 1]) / Math.max(1e-9, cum[i] - cum[i - 1]);
        const a = part[i - 1];
        const b = part[i];
        return { p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], angle: Math.atan2(b[1] - a[1], b[0] - a[0]) };
      }
    }
    return { p: part[part.length - 1], angle: 0 };
  }
  const last = leg.parts[leg.parts.length - 1];
  return { p: last[last.length - 1], angle: 0 };
}
