// 数据核对用：把某个年代切片的政权多边形渲染成带标注的 PNG
// 用法：node scripts/preview.mjs <geojson> <out.png> [minLon,minLat,maxLon,maxLat] [minKm2]
import fs from 'node:fs';
import sharp from 'sharp';
import { geoPath, geoEquirectangular, geoArea, geoCentroid } from 'd3-geo';
import { feature } from 'topojson-client';

const [src, out, bboxArg = '70,10,150,58', minArg = '20000'] = process.argv.slice(2);
const [x0, y0, x1, y1] = bboxArg.split(',').map(Number);
const minKm2 = Number(minArg);
const R = 6371.0088;
const W = Number(process.env.PREVIEW_W || 1600);
const H = Math.round(W * (y1 - y0) / (x1 - x0) / Math.cos(((y0 + y1) / 2) * Math.PI / 180) * 0.9);
const raw = JSON.parse(fs.readFileSync(src, 'utf8'));
const gj = raw.type === 'Topology' ? feature(raw, raw.objects[Object.keys(raw.objects)[0]]) : raw;
for (const f of gj.features) if (f.properties.n && !f.properties.NAME) f.properties.NAME = f.properties.n;
const bboxFeature = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[x0, y0], [x0, y1], [x1, y1], [x1, y0], [x0, y0]]] } };
const projection = geoEquirectangular().fitSize([W, H], bboxFeature);
const path = geoPath(projection);
const palette = ['#e6b8a2', '#b8cfe0', '#c9dcb3', '#e8d79a', '#d6b8d9', '#a9d4cf', '#f0c4c4', '#cfc3a6', '#b5bfe8', '#dcc6a0'];
const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

let shapes = '';
let labels = '';
let i = 0;
for (const f of gj.features) {
  if (!f.geometry) continue;
  let a = geoArea(f);
  if (a > 2 * Math.PI) a = 4 * Math.PI - a;
  const km2 = a * R * R;
  const named = !!f.properties.NAME;
  const d = path(f);
  if (!d) continue;
  const fill = named ? palette[i++ % palette.length] : '#eeeeee';
  shapes += `<path d="${d}" fill="${fill}" stroke="#555" stroke-width="0.6"/>`;
  if (named && km2 >= minKm2) {
    const [cx, cy] = projection(geoCentroid(f));
    if (cx < 0 || cy < 0 || cx > W || cy > H) continue;
    const txt = escape(`${f.properties.NAME} ${Math.round(km2 / 1000)}k`);
    labels += `<text x="${cx}" y="${cy}" font-size="13" font-family="Arial" text-anchor="middle" stroke="#fff" stroke-width="3" paint-order="stroke">${txt}</text>`;
  }
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#cfe3ee"/>${shapes}${labels}<text x="10" y="24" font-size="20" font-family="Arial">${escape(src.split(/[\\/]/).pop())}</text></svg>`;
await sharp(Buffer.from(svg)).png().toFile(out);
console.log('wrote', out, W, H);
