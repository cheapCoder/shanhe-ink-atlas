// 代理纹理线程：把“底图 + 某一年代切片的政权设色 + 水系（+ 所选国家的高亮）”预先画成一整幅世界位图。
// 镜头飞行时主线程只需把这张位图贴到当前视图，不必逐帧重绘矢量，因此飞行不受几何复杂度影响
import type { Topology } from 'topojson-specification';
import { BASE_H, BASE_W, type View } from './projection';
import { loadBasemap, type Basemap } from './basemap';
import { decodeTopology } from './decode';
import { politicalColors } from './colors';
import { drawBase, drawHighlight, drawPolities, drawWater, type SnapshotShape } from './render';

// 高亮方案：各政权的高亮级别、高亮色，以及其余政权退淡到的不透明度
export interface ProxyHighlight {
  levels: [number, 1 | 2][];
  color: string;
  dim: number;
}

// key 唯一标识一张位图：年代切片 + 高亮方案
export type ProxyRequest =
  | { type: 'init'; root: string; width: number }
  | { type: 'render'; key: string; year: number; url: string; urgent: boolean; highlight: ProxyHighlight | null };

export type ProxyResponse = { type: 'ready' } | { type: 'proxy'; key: string; bitmap: ImageBitmap } | { type: 'failed'; key: string | null; error: string };

type Job = Extract<ProxyRequest, { type: 'render' }>;

// 线宽按略小于实际的缩放比例计算：位图放大显示时线条不至于过粗，缩小时也不至于消失
const LINE_SCALE = 1.25;

// 留存最近几张切片的政权设色层：换一个国家高亮、或回到刚看过的年代时不必重画
const CACHE_SIZE = 3;

const post = (msg: ProxyResponse, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(msg, transfer);

let base: Basemap | null = null;
let view: View;
let width = 0;
let height = 0;
let baseCanvas: OffscreenCanvas;
let waterCanvas: OffscreenCanvas;
let hlCanvas: OffscreenCanvas;
const cache = new Map<number, { snap: SnapshotShape; pol: OffscreenCanvas }>();
const queue: Job[] = [];
let busy = false;

const canvas = () => new OffscreenCanvas(width, height);
const ctx2d = (c: OffscreenCanvas) => c.getContext('2d')!;

async function init(root: string, w: number) {
  width = w;
  height = Math.round((w * BASE_H) / BASE_W);
  const k = w / BASE_W / LINE_SCALE;
  view = { k, x: 0, y: 0, width: w / LINE_SCALE, height: height / LINE_SCALE, dpr: LINE_SCALE };
  base = await loadBasemap(root, w);
  baseCanvas = canvas();
  drawBase(ctx2d(baseCanvas), view, base, 'proxy');
  // 陆地纹理已画进底图层，此后不再需要，释放这一整幅位图
  base.landTexture = null;
  waterCanvas = canvas();
  drawWater(ctx2d(waterCanvas), view, base);
  hlCanvas = canvas();
  post({ type: 'ready' });
}

async function polities(year: number, url: string) {
  const hit = cache.get(year);
  if (hit) {
    cache.delete(year);
    cache.set(year, hit);
    return hit;
  }
  const topo = (await (await fetch(url)).json()) as Topology;
  const data = decodeTopology(topo);
  const colors = politicalColors(data.polities, data.neighbors, year);
  const snap: SnapshotShape = {
    year,
    polities: data.polities.map((p, index) => ({ index, name: p.name, area: p.area, bbox: p.bbox, color: colors[index], path: new Path2D(p.d) })),
    borders: data.borders.map((b) => ({ path: new Path2D(b.d), box: b.box })),
  };
  const pol = canvas();
  drawPolities(ctx2d(pol), view, base!, snap, 'proxy');
  const entry = { snap, pol };
  cache.set(year, entry);
  while (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value as number);
  return entry;
}

async function build(job: Job): Promise<ImageBitmap> {
  const { snap, pol } = await polities(job.year, job.url);
  const flat = canvas();
  const f = ctx2d(flat);
  f.drawImage(baseCanvas, 0, 0);
  f.globalAlpha = job.highlight ? job.highlight.dim : 1;
  f.drawImage(pol, 0, 0);
  f.globalAlpha = 1;
  f.drawImage(waterCanvas, 0, 0);
  if (job.highlight) {
    // 高亮像一层朱砂淡彩罩在画上：正片叠底，河流与海岸线仍透出来（与主线程的合成方式一致）
    drawHighlight(ctx2d(hlCanvas), view, base!, snap, new Map(job.highlight.levels), job.highlight.color, 'proxy');
    f.globalCompositeOperation = 'multiply';
    f.drawImage(hlCanvas, 0, 0);
  }
  return flat.transferToImageBitmap();
}

// 逐个处理请求：当前要看的画面（urgent）插队，预取的排在后面
async function pump() {
  if (busy || !base) return;
  busy = true;
  while (queue.length) {
    const at = queue.findLastIndex((j) => j.urgent);
    const [job] = queue.splice(at >= 0 ? at : 0, 1);
    try {
      const bitmap = await build(job);
      post({ type: 'proxy', key: job.key, bitmap }, [bitmap]);
    } catch (e) {
      post({ type: 'failed', key: job.key, error: String(e) });
    }
  }
  busy = false;
}

self.onmessage = ({ data }: MessageEvent<ProxyRequest>) => {
  if (data.type === 'init') {
    init(data.root, data.width)
      .then(pump)
      .catch((e) => post({ type: 'failed', key: null, error: String(e) }));
    return;
  }
  const dup = queue.find((j) => j.key === data.key);
  if (dup) dup.urgent ||= data.urgent;
  else queue.push(data);
  void pump();
};
