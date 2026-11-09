// 多级简化 + 视口裁剪的大路径：画布对整条路径做细分（含屏幕外部分），开销与顶点数成正比，
// 因此按屏幕精度挑选简化级别，放大时只保留视口附近的几何；
// 细线另按小段拆开描边，避免整条路径按全屏面积生成遮罩
import { geoPath, type GeoPermissibleObjects } from 'd3-geo';
import { intersects, projection, viewBox, type Box, type View } from './projection';

// 各级简化容差（基准平面单位），0 为原始精度
const TOLERANCES = [0, 0.06, 0.12, 0.25, 0.5, 1, 2];

// 简化误差不超过半个设备像素时肉眼无差
const MAX_ERROR_PX = 0.5;

// 视口外保留的余量（屏幕像素），覆盖宽描边与模糊的外溢
const MARGIN_PX = 64;

const CHUNK = 64;
const MEMO_SIZE = 8;

export type PathMode = 'fill' | 'stroke';

interface Ring {
  // 扁平坐标 [x0, y0, x1, y1, …]，闭合环不重复首点
  pts: Float64Array;
  closed: boolean;
  box: Box;
  // 每 CHUNK 个点一段的包围盒，段与段共享端点
  chunks: Box[];
}

interface Level {
  rings: Ring[];
  box: Box;
  full: Path2D;
}

const contains = (a: Box, b: Box) => a[0] <= b[0] && a[1] <= b[1] && a[2] >= b[2] && a[3] >= b[3];

function boxOf(pts: ArrayLike<number>, from = 0, to = pts.length / 2 - 1): Box {
  const box: Box = [Infinity, Infinity, -Infinity, -Infinity];
  for (let i = from; i <= to; i++) {
    const x = pts[i * 2];
    const y = pts[i * 2 + 1];
    if (x < box[0]) box[0] = x;
    if (y < box[1]) box[1] = y;
    if (x > box[2]) box[2] = x;
    if (y > box[3]) box[3] = y;
  }
  return box;
}

// 投影到基准平面，按子路径收集坐标；闭合环在末尾补上首点，便于简化时保留首尾
function projectRings(object: GeoPermissibleObjects): { pts: number[]; closed: boolean }[] {
  const rings: { pts: number[]; closed: boolean }[] = [];
  let ring: { pts: number[]; closed: boolean } | null = null;
  const sink = {
    moveTo(x: number, y: number) {
      ring = { pts: [x, y], closed: false };
      rings.push(ring);
    },
    lineTo(x: number, y: number) {
      ring?.pts.push(x, y);
    },
    closePath() {
      if (!ring) return;
      ring.closed = true;
      ring.pts.push(ring.pts[0], ring.pts[1]);
    },
    arc() {},
  };
  geoPath(projection, sink as unknown as CanvasRenderingContext2D)(object);
  return rings;
}

// 点到线段的距离平方
function segDist2(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  let dx = bx - ax;
  let dy = by - ay;
  if (dx || dy) {
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
    ax += dx * t;
    ay += dy * t;
  }
  dx = px - ax;
  dy = py - ay;
  return dx * dx + dy * dy;
}

// Douglas–Peucker：保留偏离超过容差的顶点，用栈代替递归
function simplify(pts: number[], tol: number): number[] {
  const n = pts.length / 2;
  if (n <= 2 || tol <= 0) return pts;
  const keep = new Uint8Array(n);
  keep[0] = keep[n - 1] = 1;
  const tol2 = tol * tol;
  const stack = [0, n - 1];
  while (stack.length) {
    const last = stack.pop()!;
    const first = stack.pop()!;
    let max = 0;
    let index = 0;
    for (let i = first + 1; i < last; i++) {
      const d = segDist2(pts[i * 2], pts[i * 2 + 1], pts[first * 2], pts[first * 2 + 1], pts[last * 2], pts[last * 2 + 1]);
      if (d > max) {
        max = d;
        index = i;
      }
    }
    if (max > tol2) {
      keep[index] = 1;
      stack.push(first, index, index, last);
    }
  }
  const out: number[] = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(pts[i * 2], pts[i * 2 + 1]);
  return out;
}

function toRing(src: number[], closed: boolean): Ring {
  const pts = Float64Array.from(closed ? src.slice(0, -2) : src);
  const n = pts.length / 2;
  const chunks: Box[] = [];
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i += CHUNK) {
    const end = Math.min(last, i + CHUNK);
    const box = boxOf(pts, i, Math.min(n - 1, end));
    // 闭合环最后一段连回首点
    if (end === n) {
      box[0] = Math.min(box[0], pts[0]);
      box[1] = Math.min(box[1], pts[1]);
      box[2] = Math.max(box[2], pts[0]);
      box[3] = Math.max(box[3], pts[1]);
    }
    chunks.push(box);
  }
  return { pts, closed, box: boxOf(pts), chunks };
}

function addRing(path: Path2D, r: Ring) {
  const { pts } = r;
  path.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) path.lineTo(pts[i], pts[i + 1]);
  if (r.closed) path.closePath();
}

// 描边：只连起与视口相交的分段；闭合环从一段不可见处起笔，避免在可见处断开留下缺口
function addVisibleRuns(path: Path2D, r: Ring, rect: Box) {
  const { pts, chunks } = r;
  const n = pts.length / 2;
  const count = chunks.length;
  const hidden = chunks.findIndex((b) => !intersects(rect, b));
  if (hidden < 0) {
    addRing(path, r);
    return;
  }
  const start = r.closed ? hidden + 1 : 0;
  let open = false;
  for (let s = 0; s < count; s++) {
    const c = (start + s) % count;
    if (!intersects(rect, chunks[c])) {
      open = false;
      continue;
    }
    const from = c * CHUNK;
    const to = Math.min(r.closed ? n : n - 1, from + CHUNK);
    if (!open) path.moveTo(pts[from * 2], pts[from * 2 + 1]);
    for (let i = from + 1; i <= to; i++) {
      const j = i % n;
      path.lineTo(pts[j * 2], pts[j * 2 + 1]);
    }
    open = true;
  }
}

// 填充 / 裁剪：多边形按矩形逐边裁剪（Sutherland–Hodgman），环向不变，非零环绕规则下孔洞依然正确
function addClippedRing(path: Path2D, r: Ring, rect: Box) {
  let poly = Array.from(r.pts);
  const edges: [number, number, number][] = [
    [0, rect[0], 1],
    [0, rect[2], -1],
    [1, rect[1], 1],
    [1, rect[3], -1],
  ];
  for (const [axis, bound, sign] of edges) {
    const out: number[] = [];
    const n = poly.length / 2;
    for (let i = 0; i < n; i++) {
      const j = (i + n - 1) % n;
      const cur = (poly[i * 2 + axis] - bound) * sign >= 0;
      const prev = (poly[j * 2 + axis] - bound) * sign >= 0;
      if (cur !== prev) {
        const t = (bound - poly[j * 2 + axis]) / (poly[i * 2 + axis] - poly[j * 2 + axis]);
        out.push(poly[j * 2] + (poly[i * 2] - poly[j * 2]) * t, poly[j * 2 + 1] + (poly[i * 2 + 1] - poly[j * 2 + 1]) * t);
      }
      if (cur) out.push(poly[i * 2], poly[i * 2 + 1]);
    }
    poly = out;
    if (poly.length < 6) return;
  }
  path.moveTo(poly[0], poly[1]);
  for (let i = 2; i < poly.length; i += 2) path.lineTo(poly[i], poly[i + 1]);
  path.closePath();
}

export class LodPath {
  private levels: Level[];
  private memo = new Map<string, Path2D | Path2D[]>();

  constructor(object: GeoPermissibleObjects) {
    const src = projectRings(object);
    this.levels = TOLERANCES.map((tol) => {
      const rings: Ring[] = [];
      for (const s of src) {
        const pts = simplify(s.pts, tol);
        // 闭合环简化到不足三点说明整体已小于容差（亚像素），直接舍去
        if (s.closed && pts.length < 8) continue;
        if (pts.length >= 4) rings.push(toRing(pts, s.closed));
      }
      const full = new Path2D();
      rings.forEach((r) => addRing(full, r));
      const box: Box = rings.reduce<Box>((b, r) => [Math.min(b[0], r.box[0]), Math.min(b[1], r.box[1]), Math.max(b[2], r.box[2]), Math.max(b[3], r.box[3])], [Infinity, Infinity, -Infinity, -Infinity]);
      return { rings, box, full };
    });
  }

  // 按设备精度取整条路径（不裁剪），用于一次性的大纹理合成
  whole(scale: number): Path2D {
    return this.levels[this.levelFor(scale, MAX_ERROR_PX)].full;
  }

  // 当前视图下的绘制路径；scale 为离屏画布相对设备像素的缩放（如半分辨率为 0.5），
  // errorPx 为允许的简化误差（画布像素），宽描边与模糊本身会抹平细节，可放宽
  in(view: View, mode: PathMode, scale = 1, errorPx = MAX_ERROR_PX): Path2D {
    const { level, rect, key } = this.query(view, `${mode}|${scale}|${errorPx}`, scale, errorPx);
    if (contains(rect, level.box)) return level.full;
    return this.memoize(key, () => {
      const path = new Path2D();
      for (const r of level.rings) {
        if (!intersects(rect, r.box)) continue;
        if (contains(rect, r.box)) addRing(path, r);
        else if (mode === 'stroke') addVisibleRuns(path, r, rect);
        else if (r.closed) addClippedRing(path, r, rect);
        else addRing(path, r);
      }
      return path;
    });
  }

  // 细线描边用：视口内每段各成一条路径（段间只差一个连接角，细线上看不出）
  pieces(view: View): Path2D[] {
    const { level, rect, key } = this.query(view, 'pieces', 1, MAX_ERROR_PX);
    return this.memoize(key, () => {
      const out: Path2D[] = [];
      for (const r of level.rings) {
        if (!intersects(rect, r.box)) continue;
        if (r.chunks.length <= 1) {
          const path = new Path2D();
          addRing(path, r);
          out.push(path);
          continue;
        }
        const n = r.pts.length / 2;
        r.chunks.forEach((b, c) => {
          if (!intersects(rect, b)) return;
          const path = new Path2D();
          const from = c * CHUNK;
          const to = Math.min(r.closed ? n : n - 1, from + CHUNK);
          path.moveTo(r.pts[from * 2], r.pts[from * 2 + 1]);
          for (let i = from + 1; i <= to; i++) path.lineTo(r.pts[(i % n) * 2], r.pts[(i % n) * 2 + 1]);
          out.push(path);
        });
      }
      return out;
    });
  }

  private query(view: View, tag: string, scale: number, errorPx: number) {
    const index = this.levelFor(view.k * view.dpr * scale, errorPx);
    const rect = viewBox(view, MARGIN_PX);
    return { level: this.levels[index], rect, key: `${index}|${tag}|${rect.join(',')}` };
  }

  // 同一次重绘里多次取同一视图的路径时复用
  private memoize<T extends Path2D | Path2D[]>(key: string, build: () => T): T {
    const hit = this.memo.get(key);
    if (hit) return hit as T;
    const value = build();
    this.memo.set(key, value);
    if (this.memo.size > MEMO_SIZE) this.memo.delete(this.memo.keys().next().value as string);
    return value;
  }

  private levelFor(scale: number, errorPx: number): number {
    for (let i = TOLERANCES.length - 1; i > 0; i--) if (TOLERANCES[i] * scale <= errorPx) return i;
    return 0;
  }
}
