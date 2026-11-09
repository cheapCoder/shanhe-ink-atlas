// 年代切片仓库：索引查询、按需加载、解码为 Path2D、LRU 缓存与预取
import { feature, mesh, neighbors as topoNeighbors } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import { geoPath } from 'd3-geo';
import type { Correction, SnapshotMeta } from '@/types';
import { project, projection, toPath2D } from './projection';

export interface PolityProps {
  n: string;
  s?: string;
  p: number;
  x?: number;
  a: number;
  l?: [number, number];
  r?: number;
}

export interface Polity {
  index: number;
  name: string;
  subj?: string;
  prec: number;
  fixed: boolean;
  area: number;
  anchor: [number, number] | null;
  r: number;
  path: Path2D;
  bbox: [number, number, number, number];
  color: number;
}

export interface Snapshot {
  meta: SnapshotMeta;
  polities: Polity[];
  byName: Map<string, Polity>;
  borders: Path2D;
  neighbors: number[][];
}

export interface BordersIndex {
  source: { name: string; author: string; url: string; license: string };
  simplify: string;
  snapshots: SnapshotMeta[];
}

const url = (p: string) => `${import.meta.env.BASE_URL}data/borders/${p}`;
const CACHE_SIZE = 10;
const bounds = geoPath(projection);

export class SnapshotStore {
  index: BordersIndex | null = null;
  areas: Record<string, [number, number][]> = {};
  corrections: Correction[] = [];
  private cache = new Map<number, Promise<Snapshot>>();

  async init() {
    const [index, areas, corrections] = await Promise.all([
      fetch(url('index.json')).then((r) => r.json() as Promise<BordersIndex>),
      fetch(url('areas.json')).then((r) => r.json() as Promise<Record<string, [number, number][]>>),
      fetch(url('corrections.json')).then((r) => r.json() as Promise<Correction[]>),
    ]);
    this.index = index;
    this.areas = areas;
    this.corrections = corrections;
  }

  get list(): SnapshotMeta[] {
    return this.index?.snapshots ?? [];
  }

  // 当前年份生效的切片：年份不晚于当前的最后一张
  metaFor(year: number): SnapshotMeta {
    const list = this.list;
    let pick = list[0];
    for (const s of list) {
      if (s.year <= year) pick = s;
      else break;
    }
    return pick;
  }

  nextMeta(meta: SnapshotMeta, step = 1): SnapshotMeta | null {
    const i = this.list.indexOf(meta);
    return this.list[i + step] ?? null;
  }

  load(meta: SnapshotMeta): Promise<Snapshot> {
    const hit = this.cache.get(meta.year);
    if (hit) {
      this.cache.delete(meta.year);
      this.cache.set(meta.year, hit);
      return hit;
    }
    const job = fetch(url(meta.file))
      .then((r) => r.json() as Promise<Topology>)
      .then((topo) => decode(meta, topo));
    this.cache.set(meta.year, job);
    while (this.cache.size > CACHE_SIZE) this.cache.delete(this.cache.keys().next().value as number);
    return job;
  }

  prefetch(meta: SnapshotMeta | null) {
    if (!meta || this.cache.has(meta.year)) return;
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
    idle(() => void this.load(meta));
  }
}

function decode(meta: SnapshotMeta, topo: Topology): Snapshot {
  const object = topo.objects.polities as GeometryCollection<PolityProps>;
  const fc = feature(topo, object);
  const polities = fc.features.map((f, index) => toPolity(f as Feature<Polygon | MultiPolygon, PolityProps>, index));
  const borders = toPath2D(mesh(topo, object, (a, b) => a !== b));
  return {
    meta,
    polities,
    byName: new Map(polities.map((p) => [p.name, p])),
    borders,
    neighbors: topoNeighbors(object.geometries),
  };
}

function toPolity(f: Feature<Polygon | MultiPolygon, PolityProps>, index: number): Polity {
  const p = f.properties;
  const [[x0, y0], [x1, y1]] = bounds.bounds(f);
  return {
    index,
    name: p.n,
    subj: p.s,
    prec: p.p ?? 1,
    fixed: p.x === 1,
    area: p.a,
    anchor: p.l ? project(p.l) : null,
    r: p.r ?? 0,
    path: toPath2D(f),
    bbox: [x0, y0, x1, y1],
    color: 0,
  };
}
