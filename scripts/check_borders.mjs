// 校验输出切片：环方向（d3 约定外环顺时针）、异常面积
import fs from 'node:fs';
import path from 'node:path';
import { feature } from 'topojson-client';
import { geoArea } from 'd3-geo';

const dir = process.argv[2];
let bad = 0;
for (const f of fs.readdirSync(dir).filter((x) => /^-?\d+\.json$/.test(x))) {
  const t = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const fc = feature(t, t.objects.polities);
  for (const ft of fc.features) {
    const polys = ft.geometry.type === 'MultiPolygon' ? ft.geometry.coordinates : [ft.geometry.coordinates];
    polys.forEach((poly, i) => {
      const a = geoArea({ type: 'Polygon', coordinates: poly });
      if (a > 2 * Math.PI) {
        bad++;
        if (bad < 30) console.log(f, ft.properties.n, 'part', i, 'inverted, rings', poly.length);
      }
    });
  }
}
console.log('inverted parts:', bad);
