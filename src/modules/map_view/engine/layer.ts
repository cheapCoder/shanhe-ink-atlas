// 离屏图层缓存：记录渲染时的视图，合成时按相对变换贴图
import type { View } from './projection';
import type { Quality } from './render';

export class Layer {
  readonly canvas = document.createElement('canvas');
  view: View | null = null;
  quality: Quality | null = null;
  private valid = false;

  // qualityAware：绘制结果是否随质量档变化；不变的图层在交互结束后无需为提升质量而重绘
  constructor(private qualityAware = true) {}

  invalidate() {
    this.valid = false;
  }

  // 丢弃缓存内容：换切片后旧位图属于别的年代，重绘前不能拿来顶替
  reset() {
    this.valid = false;
    this.view = null;
  }

  // 是否已有可用的内容（可能属于稍早的视图）
  get drawn(): boolean {
    return this.view !== null;
  }

  // 是否已按该视图与画质画好
  fresh(v: View, quality: Quality): boolean {
    return !this.needsRender(v, false, quality) && this.quality === quality;
  }

  needsRender(v: View, interacting: boolean, quality: Quality): boolean {
    const c = this.view;
    if (!this.valid || !c) return true;
    if (c.width !== v.width || c.height !== v.height || c.dpr !== v.dpr) return true;
    if (interacting) {
      const r = v.k / c.k;
      if (r > 1.6 || r < 0.62) return true;
      return uncovered(c, v) > 0.18;
    }
    return c.k !== v.k || c.x !== v.x || c.y !== v.y || (this.qualityAware && this.quality !== quality);
  }

  // 缓存偏离当前视图的程度，用于排定重绘先后：失效者最急，其次看缩放偏差与未覆盖面积
  staleness(v: View): number {
    const c = this.view;
    if (!this.valid || !c || c.width !== v.width || c.height !== v.height || c.dpr !== v.dpr) return Infinity;
    return Math.abs(Math.log(v.k / c.k)) + uncovered(c, v);
  }

  render(v: View, quality: Quality, draw: (ctx: CanvasRenderingContext2D) => void) {
    const w = Math.round(v.width * v.dpr);
    const h = Math.round(v.height * v.dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    const ctx = this.canvas.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    draw(ctx);
    ctx.restore();
    this.view = { ...v };
    this.quality = quality;
    this.valid = true;
  }
}

// 缓存图层经相对变换后未覆盖视口的比例
export function uncovered(c: View, v: View): number {
  const r = v.k / c.k;
  const left = v.x - c.x * r;
  const top = v.y - c.y * r;
  const right = left + c.width * r;
  const bottom = top + c.height * r;
  const ow = Math.max(0, Math.min(v.width, right) - Math.max(0, left));
  const oh = Math.max(0, Math.min(v.height, bottom) - Math.max(0, top));
  return 1 - (ow * oh) / (v.width * v.height);
}

export function composeLayer(ctx: CanvasRenderingContext2D, layer: Layer, v: View, alpha: number) {
  const c = layer.view;
  if (!c || alpha <= 0.001) return;
  const r = v.k / c.k;
  ctx.globalAlpha = alpha;
  ctx.setTransform(r, 0, 0, r, (v.x - c.x * r) * v.dpr, (v.y - c.y * r) * v.dpr);
  ctx.drawImage(layer.canvas, 0, 0);
  ctx.globalAlpha = 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

// 缓存视图与当前视图是否足够接近：缩放比在 [lo, hi] 之内，且露出的空白不超过 gap
export function near(c: View | null, v: View, lo: number, hi: number, gap: number): boolean {
  if (!c || c.width !== v.width || c.height !== v.height) return false;
  const r = v.k / c.k;
  return r >= lo && r <= hi && uncovered(c, v) <= gap;
}
