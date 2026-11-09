// 离屏图层缓存：记录渲染时的视图，合成时按相对变换贴图
import type { View } from './projection';
import type { Quality } from './render';

export class Layer {
  readonly canvas = document.createElement('canvas');
  view: View | null = null;
  quality: Quality | null = null;
  private valid = false;

  invalidate() {
    this.valid = false;
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
    return c.k !== v.k || c.x !== v.x || c.y !== v.y || this.quality !== quality;
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
function uncovered(c: View, v: View): number {
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
