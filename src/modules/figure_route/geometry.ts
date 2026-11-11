// 路线几何：每段路程在基准平面上画成一道弧线而非直线。
// 无中间点的路段向行进方向的左侧鼓出（往返同一路线时去程与回程自然分开）；
// 有中间点（via）的路段以样条顺滑地穿过各点；越过地图左右边缘的路段仍按大圆线分段绘制。
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

// 相邻两点在平面上相距超过四成图宽，说明路线越过了地图的左右边缘
const wraps = (a: Pt, b: Pt) => Math.abs(a[0] - b[0]) > BASE_W * 0.4;

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

// 大圆线分段：越过地图边缘处断开
function geodesicParts(lonlats: LonLat[]): Pt[][] {
  const parts: Pt[][] = [[]];
  for (const ll of densify(lonlats)) {
    const p = project(ll);
    const cur = parts[parts.length - 1];
    const prev = cur[cur.length - 1];
    if (prev && wraps(p, prev)) parts.push([p]);
    else cur.push(p);
  }
  return parts.filter((part) => part.length > 1);
}

// 弧线鼓出的幅度（相对弦长）：短途弧度大些，长途收敛，免得绕得太远
const bowOf = (chord: number) => (chord < 12 ? 0.2 : chord < 120 ? 0.16 : chord < 400 ? 0.12 : 0.08);

// 向心 Catmull–Rom 样条：穿过全部控制点，不出现尖角与回环
function spline(ctrl: Pt[]): Pt[] {
  const pts = [ctrl[0], ...ctrl, ctrl[ctrl.length - 1]];
  const out: Pt[] = [ctrl[0]];
  const knot = (a: Pt, b: Pt) => Math.max(1e-6, Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])));
  for (let i = 1; i < pts.length - 2; i++) {
    const [p0, p1, p2, p3] = [pts[i - 1], pts[i], pts[i + 1], pts[i + 2]];
    const t1 = knot(p0, p1);
    const t2 = t1 + knot(p1, p2);
    const t3 = t2 + knot(p2, p3);
    const steps = Math.min(64, Math.max(8, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 2.5)));
    for (let s = 1; s <= steps; s++) {
      const t = t1 + ((t2 - t1) * s) / steps;
      const mix = (a: Pt, b: Pt, ta: number, tb: number): Pt => {
        const u = (t - ta) / Math.max(1e-6, tb - ta);
        return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
      };
      const a1 = mix(p0, p1, 0, t1);
      const a2 = mix(p1, p2, t1, t2);
      const a3 = mix(p2, p3, t2, t3);
      const b1 = mix(a1, a2, 0, t2);
      const b2 = mix(a2, a3, t1, t3);
      out.push(mix(b1, b2, t1, t2));
    }
  }
  return out;
}

function curvedParts(a: Waypoint, b: Waypoint): Pt[][] {
  const lonlats = legLonLats(a, b);
  const ctrl = lonlats.map(project);
  if (ctrl.some((p, i) => i > 0 && wraps(p, ctrl[i - 1]))) return geodesicParts(lonlats);
  if (ctrl.length > 2) return [spline(ctrl)];
  const [p, q] = ctrl;
  const chord = Math.hypot(q[0] - p[0], q[1] - p[1]);
  if (chord < 0.05) return [[p, q]];
  const bow = bowOf(chord) * chord;
  // 屏幕坐标系 y 轴向下，行进方向的左侧法线为 (dy, -dx)
  const mid: Pt = [(p[0] + q[0]) / 2 + ((q[1] - p[1]) / chord) * bow, (p[1] + q[1]) / 2 - ((q[0] - p[0]) / chord) * bow];
  return [spline([p, mid, q])];
}

function buildLeg(a: Waypoint, b: Waypoint): Leg {
  const parts = curvedParts(a, b);
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
