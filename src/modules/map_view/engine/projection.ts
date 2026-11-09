// 基准投影：自然地球投影，球面适配到 2000×1040 的基准平面；缩放平移只作用于平面上的仿射变换
import { geoNaturalEarth1, geoPath, type GeoPermissibleObjects } from 'd3-geo';
import type { LonLat } from '@/types';

export const BASE_W = 2000;

// 中央经线取东经 150°（国内世界地图通行的太平洋居中画法），左右边缘落在大西洋，不切开欧亚与美洲大陆
// 须与 scripts/lib/geo_ops.mjs 一致，改动后要重跑 data:borders 与 data:relief
const CENTER_LON = 150;

export const projection = geoNaturalEarth1().rotate([-CENTER_LON, 0]).fitWidth(BASE_W, { type: 'Sphere' }).precision(0.25);

export const BASE_H = geoPath(projection).bounds({ type: 'Sphere' })[1][1];

export const project = (ll: LonLat): [number, number] => projection(ll) ?? [NaN, NaN];

export const unproject = (p: [number, number]): LonLat | null => {
  const ll = projection.invert?.(p);
  return ll ? [ll[0], ll[1]] : null;
};

// 把 GeoJSON 投影为基准平面上的 Path2D
export function toPath2D(object: GeoPermissibleObjects): Path2D {
  const path = new Path2D();
  geoPath(projection, path as unknown as CanvasRenderingContext2D)(object);
  return path;
}

export const spherePath = (): Path2D => toPath2D({ type: 'Sphere' });

// 视图：屏幕坐标 = 基准平面坐标 × k + (x, y)
export interface View {
  k: number;
  x: number;
  y: number;
  width: number;
  height: number;
  dpr: number;
}

export const toScreen = (view: View, p: [number, number]): [number, number] => [p[0] * view.k + view.x, p[1] * view.k + view.y];

export const toBase = (view: View, s: [number, number]): [number, number] => [(s[0] - view.x) / view.k, (s[1] - view.y) / view.k];

export type Box = [number, number, number, number];

// 视口（外扩 marginPx 屏幕像素）在基准平面上的范围
export function viewBox(view: View, marginPx: number): Box {
  const m = marginPx / view.k;
  return [-view.x / view.k - m, -view.y / view.k - m, (view.width - view.x) / view.k + m, (view.height - view.y) / view.k + m];
}

export const intersects = (a: Box, b: Box) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];

// 适配视口的初始缩放：让整个基准平面完整落在视口内（留出时间轴等界面的空间）
export function fitView(width: number, height: number, padTop = 70, padBottom = 150): { k: number; x: number; y: number } {
  const availH = Math.max(200, height - padTop - padBottom);
  const k = Math.min(width / BASE_W, availH / BASE_H) * 0.98;
  return { k, x: (width - BASE_W * k) / 2, y: padTop + (availH - BASE_H * k) / 2 };
}

export function applyView(ctx: CanvasRenderingContext2D, view: View) {
  ctx.setTransform(view.k * view.dpr, 0, 0, view.k * view.dpr, view.x * view.dpr, view.y * view.dpr);
}
