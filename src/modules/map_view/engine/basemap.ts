// 底图：陆地（裁剪与海岸线）、湖泊、河流，均预投影到基准平面并按缩放分级简化
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, FeatureCollection, GeoJsonProperties, Geometry, LineString, MultiLineString, MultiPolygon, Polygon } from 'geojson';
import { geoArea } from 'd3-geo';
import { BASE_H, BASE_W, project, toPath2D } from './projection';
import { LodPath } from './lod';
import { ctxOf, makeCanvas, type AnyCanvas } from './surface';

export interface RiverLabel {
  name: string;
  at: [number, number];
  angle: number;
  rank: number;
}

// 南海断续线、岛礁墨点与地名，坐标均已投影到基准平面
export interface ChinaSea {
  dashes: Path2D;
  islands: [number, number][];
  labels: { name: string; at: [number, number]; minK: number }[];
}

interface ChinaSeaData {
  dashes: [number, number][][];
  islands: [number, number][];
  labels: { n: string; at: [number, number]; k: number }[];
}

export interface Basemap {
  land: LodPath;
  rippleLand: LodPath;
  lakes: LodPath;
  riversByRank: LodPath[];
  riverLabels: RiverLabel[];
  landTexture: AnyCanvas | null;
  chinaSea: ChinaSea | null;
}

// 数据目录的绝对地址：后台线程里没有页面的相对路径基准，由调用方传入
export const dataRoot = (): string => new URL(`${import.meta.env.BASE_URL}data/`, self.location.href).href;

async function loadTopo<P extends GeoJsonProperties>(root: string, file: string): Promise<FeatureCollection<Geometry, P>> {
  const topo = (await (await fetch(root + file)).json()) as Topology;
  const key = Object.keys(topo.objects)[0];
  return feature(topo, topo.objects[key] as GeometryCollection<P>) as unknown as FeatureCollection<Geometry, P>;
}

// 主线程与后台线程通用的图片解码
async function loadImage(src: string): Promise<ImageBitmap | null> {
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    return await createImageBitmap(await res.blob());
  } catch {
    return null;
  }
}

// 河流标注放在最长线段的中点，沿河道方向旋转（倒置时翻转）
function riverLabel(f: Feature<Geometry, { n?: string; r: number }>): RiverLabel | null {
  if (!f.properties.n) return null;
  const g = f.geometry as LineString | MultiLineString;
  const lines = g.type === 'LineString' ? [g.coordinates] : g.coordinates;
  const longest = lines.reduce((a, b) => (b.length > a.length ? b : a), lines[0]);
  if (!longest || longest.length < 4) return null;
  const i = Math.floor(longest.length / 2);
  const a = project(longest[Math.max(0, i - 2)] as [number, number]);
  const b = project(longest[Math.min(longest.length - 1, i + 2)] as [number, number]);
  const at = project(longest[i] as [number, number]);
  let angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
  if (angle > Math.PI / 2) angle -= Math.PI;
  if (angle < -Math.PI / 2) angle += Math.PI;
  return { name: f.properties.n, at, angle, rank: f.properties.r };
}

// 水纹只描面积较大的陆块，避免小岛周围的同心圈过于繁密
function largeLand(land: FeatureCollection<Geometry, GeoJsonProperties>): LodPath {
  const minSteradian = 2500 / (6371 * 6371);
  const polygons: Polygon['coordinates'][] = [];
  for (const f of land.features) {
    const g = f.geometry as Polygon | MultiPolygon;
    const parts = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    for (const p of parts) if (geoArea({ type: 'Polygon', coordinates: p }) > minSteradian) polygons.push(p);
  }
  return new LodPath({ type: 'MultiPolygon', coordinates: polygons });
}

// 陆地淡彩与山体墨色只在加载时合成一次，之后每帧只需一次贴图
function composeLand(lod: LodPath, relief: ImageBitmap | null, width: number): AnyCanvas {
  const c = makeCanvas(width, Math.round((width * BASE_H) / BASE_W));
  const ctx = ctxOf(c);
  const s = width / BASE_W;
  const land = lod.whole(s);
  ctx.setTransform(s, 0, 0, s, 0, 0);
  ctx.fillStyle = 'rgba(222, 204, 168, 0.34)';
  ctx.fill(land);
  if (relief) {
    ctx.save();
    ctx.clip(land);
    ctx.globalAlpha = 0.62;
    ctx.drawImage(relief, 0, 0, BASE_W, BASE_H);
    ctx.restore();
  }
  return c;
}

async function loadChinaSea(root: string): Promise<ChinaSea | null> {
  try {
    const data = (await (await fetch(root + 'base/china_sea.json')).json()) as ChinaSeaData;
    return {
      dashes: toPath2D({ type: 'MultiLineString', coordinates: data.dashes }),
      islands: data.islands.map(project),
      labels: data.labels.map((l) => ({ name: l.n, at: project(l.at), minK: l.k })),
    };
  } catch {
    return null;
  }
}

// textureWidth：陆地淡彩与山体合成纹理的宽度
export async function loadBasemap(root: string, textureWidth: number): Promise<Basemap> {
  const [land, lakes, rivers, relief, chinaSea] = await Promise.all([
    loadTopo<GeoJsonProperties>(root, 'base/land.json'),
    loadTopo<{ n: string }>(root, 'base/lakes.json'),
    loadTopo<{ n?: string; r: number }>(root, 'base/rivers.json'),
    loadImage(root + 'base/relief.webp'),
    loadChinaSea(root),
  ]);
  const byRank = Array.from({ length: 7 }, () => [] as Feature<Geometry, { n?: string; r: number }>[]);
  const labels = new Map<string, RiverLabel>();
  for (const f of rivers.features) {
    byRank[Math.min(6, Math.max(0, Math.round(f.properties.r)))].push(f);
    const label = riverLabel(f);
    const prev = label && labels.get(label.name);
    if (label && (!prev || prev.rank > label.rank)) labels.set(label.name, label);
  }
  const landPath = new LodPath(land);
  return {
    land: landPath,
    rippleLand: largeLand(land),
    lakes: new LodPath(lakes),
    riversByRank: byRank.map((features) => new LodPath({ type: 'FeatureCollection', features })),
    riverLabels: [...labels.values()],
    landTexture: composeLand(landPath, relief, textureWidth),
    chinaSea,
  };
}
