// 淡彩笔触纹理：可平铺的多八度值噪声叠加横向笔痕，按颜料预生成透明度起伏的平铺图案
import { seededRandom } from './paper';
import { hexToRgb } from './palette';
import { makeCanvas, type AnyCanvas, type Ctx2D } from './surface';

export const WASH_SIZE = 256;
const SIZE = WASH_SIZE;
let field: Float32Array | null = null;

function lattice(n: number, rand: () => number) {
  return Array.from({ length: n * n }, () => rand());
}

// 周期为 SIZE 的平滑值噪声，保证纹理首尾相接
function noiseField(): Float32Array {
  if (field) return field;
  const rand = seededRandom(1729);
  const out = new Float32Array(SIZE * SIZE);
  const octaves = [
    { cells: 4, amp: 0.5 },
    { cells: 8, amp: 0.26 },
    { cells: 16, amp: 0.14 },
    { cells: 48, amp: 0.1 },
  ];
  for (const { cells, amp } of octaves) {
    const g = lattice(cells, rand);
    const at = (x: number, y: number) => g[((y % cells) + cells) % cells * cells + (((x % cells) + cells) % cells)];
    for (let y = 0; y < SIZE; y++) {
      const fy = (y / SIZE) * cells;
      const y0 = Math.floor(fy);
      const ty = fy - y0;
      const sy = ty * ty * (3 - 2 * ty);
      for (let x = 0; x < SIZE; x++) {
        const fx = (x / SIZE) * cells;
        const x0 = Math.floor(fx);
        const tx = fx - x0;
        const sx = tx * tx * (3 - 2 * tx);
        const a = at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx;
        const b = at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx;
        out[y * SIZE + x] += (a * (1 - sy) + b * sy) * amp;
      }
    }
  }

  // 横向笔痕：沿 x 方向拉长的细条纹，模拟排笔刷色的走向

  const strokes = lattice(SIZE, rand);
  for (let y = 0; y < SIZE; y++) {
    const s = (strokes[y] - 0.5) * 0.12 + (strokes[(y + 1) % SIZE] - 0.5) * 0.06;
    for (let x = 0; x < SIZE; x++) out[y * SIZE + x] += s * (0.6 + 0.4 * Math.sin((x / SIZE) * Math.PI * 6 + y));
  }
  field = out;
  return out;
}

const tiles = new Map<string, AnyCanvas>();

// 某颜料的平铺纹理：透明度在 base 附近起伏，颜料聚集处略深
export function washTile(hex: string, base: number): AnyCanvas {
  const key = `${hex}|${base}`;
  const hit = tiles.get(key);
  if (hit) return hit;
  const f = noiseField();
  const c = makeCanvas(SIZE, SIZE);
  const ctx = c.getContext('2d') as Ctx2D;
  const img = ctx.createImageData(SIZE, SIZE);
  const [r, g, b] = hexToRgb(hex);
  for (let i = 0; i < SIZE * SIZE; i++) {
    const v = f[i];
    const alpha = Math.max(0, Math.min(1, base * (0.55 + v * 0.95)));
    const deep = Math.max(0, v - 0.55) * 0.5;
    img.data[i * 4] = r * (1 - deep);
    img.data[i * 4 + 1] = g * (1 - deep);
    img.data[i * 4 + 2] = b * (1 - deep);
    img.data[i * 4 + 3] = alpha * 255;
  }
  ctx.putImageData(img, 0, 0);
  tiles.set(key, c);
  return c;
}

// 纹理在基准平面上的尺度：一张贴片覆盖 160 个基准单位（约为全图宽度的 8%）
export const WASH_TILE_BASE = 160;

// 预生成常用的颜料贴片，避免首次高质量绘制时集中计算造成卡顿
export function warmWashTiles(colors: readonly string[], alphas: number[]) {
  for (const c of colors) for (const a of alphas) washTile(c, Math.round(a * 50) / 50);
}
