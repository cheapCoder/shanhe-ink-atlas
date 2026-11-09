// 导出需要中文译名的政权清单（名称 | 最大面积千平方公里 | 年代 | 切片数 | 标注点经纬度）
import fs from 'node:fs';
import path from 'node:path';
const dir = process.argv[2];
const out = process.argv[3];
const minKm2 = Number(process.argv[4] || 30000);
const index = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
const info = new Map();
for (const s of index.snapshots) {
  const t = JSON.parse(fs.readFileSync(path.join(dir, s.file), 'utf8'));
  for (const g of t.objects.polities.geometries) {
    const p = g.properties;
    const cur = info.get(p.n) ?? { max: 0, years: [], l: p.l };
    cur.years.push(s.year);
    if (p.a > cur.max) { cur.max = p.a; cur.l = p.l; }
    info.set(p.n, cur);
  }
}
const rows = [...info].filter(([, v]) => v.max >= minKm2).sort((a, b) => b[1].max - a[1].max);
fs.writeFileSync(out, rows.map(([n, v]) => `${n}|${Math.round(v.max / 1000)}k|${Math.min(...v.years)}..${Math.max(...v.years)}|${v.years.length}|${v.l ? v.l.map((x) => Math.round(x)).join(',') : ''}`).join('\n'));
console.log(rows.length);
