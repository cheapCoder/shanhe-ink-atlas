// 多边形运算与度量工具（平面经纬度运算，适用于本项目的区域级修正）
import pc from 'polygon-clipping';
import polylabel from 'polylabel';
import { geoArea, geoNaturalEarth1 } from 'd3-geo';

export const EARTH_RADIUS_KM = 6371.0088;

// 前端与构建脚本共用的基准投影：自然地球投影，球面适配到 2000 宽
export const BASE_WIDTH = 2000;
export const baseProjection = () => geoNaturalEarth1().fitWidth(BASE_WIDTH, { type: 'Sphere' });

export function toMulti(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  return [];
}

export function isEmpty(multi) {
  return !multi || multi.length === 0;
}

// polygon-clipping 对近重合点敏感，失败时按更粗的精度取整后重试
const roundMulti = (multi, digits) => {
  const f = 10 ** digits;
  return multi.map((poly) => poly.map((ring) => ring.map(([x, y]) => [Math.round(x * f) / f, Math.round(y * f) / f])));
};

function robust(fn, inputs) {
  try {
    return fn(...inputs);
  } catch {
    for (const digits of [6, 5, 4, 3]) {
      try {
        return fn(...inputs.map((m) => roundMulti(m, digits)));
      } catch {
        // 继续降低精度
      }
    }
    throw new Error('多边形运算在各精度下均失败');
  }
}

export function union(...multis) {
  const parts = multis.filter((m) => !isEmpty(m));
  if (parts.length === 0) return [];
  if (parts.length === 1) return parts[0];
  return robust(pc.union, parts);
}

export function difference(subject, ...clips) {
  const cs = clips.filter((m) => !isEmpty(m));
  if (isEmpty(subject)) return [];
  if (cs.length === 0) return subject;
  return robust(pc.difference, [subject, ...cs]);
}

export function intersection(a, b) {
  if (isEmpty(a) || isEmpty(b)) return [];
  return robust(pc.intersection, [a, b]);
}

// 用一条折线和方向构造半平面掩膜（线的两端沿方向延伸到极远处后闭合）
export function maskFromLine(line, side) {
  const first = line[0];
  const last = line[line.length - 1];
  let ring;
  if (side === 'north' || side === 'south') {
    const lat = side === 'north' ? 89.9 : -89.9;
    const eastFirst = first[0] > last[0];
    const lonA = eastFirst ? 179.99 : -179.99;
    const lonB = -lonA;
    ring = [[lonA, first[1]], ...line, [lonB, last[1]], [lonB, lat], [lonA, lat]];
  } else {
    const lon = side === 'east' ? 179.99 : -179.99;
    const northFirst = first[1] > last[1];
    const latA = northFirst ? 89.9 : -89.9;
    const latB = -latA;
    ring = [[first[0], latA], ...line, [last[0], latB], [lon, latB], [lon, latA]];
  }
  ring.push(ring[0]);
  return [[ring]];
}

// 经纬度矩形 [西, 南, 东, 北] 作为裁剪掩膜
export function boxMask([w, s, e, n]) {
  return [[[[w, s], [e, s], [e, n], [w, n], [w, s]]]];
}

// 多边形的经纬度外包矩形 [西, 南, 东, 北]
export function bbox(multi) {
  let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const poly of multi) for (const [x, y] of poly[0]) {
    if (x < w) w = x;
    if (x > e) e = x;
    if (y < s) s = y;
    if (y > n) n = y;
  }
  return [w, s, e, n];
}

export const boxesOverlap = (a, b) => a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];

export function areaKm2(multi) {
  if (isEmpty(multi)) return 0;
  let a = geoArea({ type: 'MultiPolygon', coordinates: multi });
  if (a > 2 * Math.PI) a = 4 * Math.PI - a;
  return a * EARTH_RADIUS_KM * EARTH_RADIUS_KM;
}

function planarArea(ring) {
  let s = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) s += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  return Math.abs(s / 2);
}

// 在基准投影平面上求最大多边形的“最远内点”，作为标注锚点；r 为内切圆半径（基准平面单位）
export function labelAnchor(multi, projection) {
  let best = null;
  for (const polygon of multi) {
    const projected = polygon.map((ring) => ring.map((p) => projection(p)).filter(Boolean));
    if (projected[0].length < 4) continue;
    const a = planarArea(projected[0]);
    if (!best || a > best.area) best = { area: a, projected };
  }
  if (!best) return null;
  const p = polylabel(best.projected, 0.5);
  const lonlat = projection.invert(p);
  return { lonlat: [+lonlat[0].toFixed(3), +lonlat[1].toFixed(3)], r: +p.distance.toFixed(2), area: +best.area.toFixed(1) };
}
