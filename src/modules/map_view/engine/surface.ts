// 画布的统一抽象：绘制函数既在主线程（HTMLCanvasElement）也在后台线程（OffscreenCanvas）运行
export type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;
export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export function makeCanvas(width: number, height: number): AnyCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  return c;
}

export const ctxOf = (canvas: AnyCanvas): Ctx2D => canvas.getContext('2d') as Ctx2D;
