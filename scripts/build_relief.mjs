// 山体水墨层：Natural Earth 1:50m 晕渲（公有领域）→ 自然地球投影平面 → 墨色透明度图
// 用法：node scripts/build_relief.mjs <SR_50M.tif> <out.webp> [输出宽度]
import sharp from 'sharp';
import { baseProjection, BASE_WIDTH } from './lib/geo_ops.mjs';

const [src, out, widthArg = '4096'] = process.argv.slice(2);
const OUT_W = Number(widthArg);
const FLAT = 206;

const { data, info } = await sharp(src).extractChannel(0).raw().toBuffer({ resolveWithObject: true });
const SW = info.width;
const SH = info.height;
console.log('source', SW, SH);

// 阴影强度（暗于平地的部分）与起伏程度（偏离平地的幅度）
const shadow = new Float32Array(SW * SH);
const rugged = new Float32Array(SW * SH);
for (let i = 0; i < data.length; i++) {
  const d = data[i] - FLAT;
  shadow[i] = d < 0 ? -d / FLAT : 0;
  rugged[i] = Math.abs(d) / 60;
}

function boxBlur(src, w, h, r) {
  const tmp = new Float32Array(src.length);
  const dst = new Float32Array(src.length);
  const n = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    let acc = 0;
    const row = y * w;
    for (let x = -r; x <= r; x++) acc += src[row + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = acc / n;
      acc += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      dst[y * w + x] = acc / n;
      acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return dst;
}

// 起伏度做两级模糊：小半径表现山脊，大半径表现山体整体的淡墨晕
const massNear = boxBlur(boxBlur(rugged, SW, SH, 3), SW, SH, 3);
const massFar = boxBlur(boxBlur(rugged, SW, SH, 10), SW, SH, 10);
const shadowSoft = boxBlur(shadow, SW, SH, 1);

function sample(arr, lon, lat) {
  const fx = ((lon + 180) / 360) * SW - 0.5;
  const fy = ((90 - lat) / 180) * SH - 0.5;
  const x0 = Math.max(0, Math.min(SW - 2, Math.floor(fx)));
  const y0 = Math.max(0, Math.min(SH - 2, Math.floor(fy)));
  const tx = Math.min(1, Math.max(0, fx - x0));
  const ty = Math.min(1, Math.max(0, fy - y0));
  const i = y0 * SW + x0;
  const a = arr[i] * (1 - tx) + arr[i + 1] * tx;
  const b = arr[i + SW] * (1 - tx) + arr[i + SW + 1] * tx;
  return a * (1 - ty) + b * ty;
}

const projection = baseProjection();
const baseHeight = projection([0, -90])[1] - projection([0, 90])[1];
const OUT_H = Math.round((OUT_W * baseHeight) / BASE_WIDTH);
const scale = BASE_WIDTH / OUT_W;
const top = projection([0, 90])[1];
const pixels = Buffer.alloc(OUT_W * OUT_H * 2);
const smooth = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

for (let y = 0; y < OUT_H; y++) {
  for (let x = 0; x < OUT_W; x++) {
    const px = (x + 0.5) * scale;
    const py = top + (y + 0.5) * scale;
    const ll = projection.invert([px, py]);
    const o = (y * OUT_W + x) * 2;
    if (!ll || Math.abs(ll[0]) > 180 || Math.abs(ll[1]) > 90) continue;
    const back = projection(ll);
    if (!back || Math.hypot(back[0] - px, back[1] - py) > scale) continue;
    const sh = sample(shadowSoft, ll[0], ll[1]);
    const mn = sample(massNear, ll[0], ll[1]);
    const mf = sample(massFar, ll[0], ll[1]);
    // 焦墨：阴坡；淡墨：山体；两者以“墨分五色”的方式叠加，再整体压低以免抢过疆域色
    const ink = 0.62 * smooth(0.02, 0.42, sh) + 0.28 * smooth(0.05, 0.55, mn) + 0.22 * smooth(0.04, 0.4, mf);
    const alpha = Math.min(1, ink) ** 1.1;
    pixels[o] = Math.round(38 + 30 * (1 - alpha));
    pixels[o + 1] = Math.round(alpha * 255);
  }
}

await sharp(pixels, { raw: { width: OUT_W, height: OUT_H, channels: 2 } })
  .webp({ quality: 82, alphaQuality: 80, effort: 6 })
  .toFile(out);
console.log('wrote', out, OUT_W, OUT_H);
