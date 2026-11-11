// 年代切片仓库：索引查询、按需加载（拉取与解码在后台线程）、LRU 缓存与预取
import type { Correction, SnapshotMeta } from '@/types';
import type { Box } from './projection';
import { politicalColors } from './colors';

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
  // 首次用到时才由路径串构造：换切片的那一帧不必为上千个政权逐一解析路径
  readonly path: Path2D;
  bbox: [number, number, number, number];
  color: number;
}

// 国界按网格分块：细线整条描边时按全屏面积生成遮罩，分块后只描视口内的小块
export interface BorderPiece {
  readonly path: Path2D;
  box: Box;
}

export interface Snapshot {
  meta: SnapshotMeta;
  year: number;
  polities: Polity[];
  byName: Map<string, Polity>;
  borders: BorderPiece[];
  neighbors: number[][];
}

// 后台线程的解码结果：路径以 SVG 路径串传回（Path2D 无法跨线程传递）
export type DecodedPolity = Omit<Polity, 'index' | 'path' | 'color'> & { d: string };

export interface DecodedSnapshot {
  polities: DecodedPolity[];
  borders: { d: string; box: Box }[];
  neighbors: number[][];
}

export interface DecodeRequest {
  id: number;
  url: string;
}

export type DecodeResponse = { id: number; data: DecodedSnapshot } | { id: number; error: string };

export interface BordersIndex {
  source: { name: string; author: string; url: string; license: string };
  simplify: string;
  snapshots: SnapshotMeta[];
}

const url = (p: string) => `${import.meta.env.BASE_URL}data/borders/${p}`;
const CACHE_SIZE = 10;

export const snapshotUrl = (meta: SnapshotMeta) => new URL(url(meta.file), location.href).href;

export class SnapshotStore {
  index: BordersIndex | null = null;
  areas: Record<string, [number, number][]> = {};
  corrections: Correction[] = [];
  private cache = new Map<number, Promise<Snapshot>>();
  private worker: Worker | null = null;
  private jobs = new Map<number, { resolve: (d: DecodedSnapshot) => void; reject: (e: Error) => void }>();
  private seq = 0;

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

  has(meta: SnapshotMeta): boolean {
    return this.cache.has(meta.year);
  }

  load(meta: SnapshotMeta): Promise<Snapshot> {
    const hit = this.cache.get(meta.year);
    if (hit) {
      this.cache.delete(meta.year);
      this.cache.set(meta.year, hit);
      return hit;
    }
    const job = this.decode(snapshotUrl(meta)).then((data) => build(meta, data));
    this.cache.set(meta.year, job);
    while (this.cache.size > CACHE_SIZE) this.cache.delete(this.cache.keys().next().value as number);
    return job;
  }

  destroy() {
    this.worker?.terminate();
    this.worker = null;
    this.jobs.clear();
  }

  // 主线程同步解码一张切片要几十毫秒，放在飞行途中会卡掉数帧，因此交给后台线程
  private decode(href: string): Promise<DecodedSnapshot> {
    this.worker ??= this.spawn();
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      this.jobs.set(id, { resolve, reject });
      this.worker!.postMessage({ id, url: href } satisfies DecodeRequest);
    });
  }

  private spawn(): Worker {
    const worker = new Worker(new URL('./snapshotWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }: MessageEvent<DecodeResponse>) => {
      const job = this.jobs.get(data.id);
      this.jobs.delete(data.id);
      if (!job) return;
      if ('error' in data) job.reject(new Error(data.error));
      else job.resolve(data.data);
    };
    return worker;
  }
}

// 给对象挂上惰性构造的 path
function lazyPath<T extends object>(target: T, d: string): T & { readonly path: Path2D } {
  let path: Path2D | null = null;
  return Object.defineProperty(target, 'path', { enumerable: true, get: () => (path ??= new Path2D(d)) }) as T & { readonly path: Path2D };
}

function build(meta: SnapshotMeta, data: DecodedSnapshot): Snapshot {
  const colors = politicalColors(data.polities, data.neighbors, meta.year);
  const polities: Polity[] = data.polities.map(({ d, ...p }, index) => lazyPath({ ...p, index, color: colors[index] }, d));
  return {
    meta,
    year: meta.year,
    polities,
    byName: new Map(polities.map((p) => [p.name, p])),
    borders: data.borders.map(({ d, box }) => lazyPath({ box }, d)),
    neighbors: data.neighbors,
  };
}
