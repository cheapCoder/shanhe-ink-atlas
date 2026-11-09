// 历史疆域构建：清洗 → 校勘 → 合成关键年份 → 简化 → TopoJSON
// 用法：node scripts/build_borders.mjs <historical-basemaps/geojson 目录> <输出目录>
import fs from 'node:fs';
import path from 'node:path';
import mapshaper from 'mapshaper';
import { feature as topoFeature } from 'topojson-client';
import { fixes, synthetic, yearNames } from './borders_fixes.mjs';
import { toMulti, isEmpty, union, difference, intersection, maskFromLine, boxMask, bbox, boxesOverlap, areaKm2, labelAnchor, baseProjection } from './lib/geo_ops.mjs';

const [srcDir, outDir] = process.argv.slice(2);
if (!srcDir || !outDir) {
  console.error('用法：node scripts/build_borders.mjs <src> <out>');
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });

// 补绘缺失岛屿用的陆地轮廓（Natural Earth 1:50m，与底图同源）
const LAND_FILE = path.join(srcDir, '..', 'naturalearth', 'ne_50m_land.geojson');
const SIMPLIFY_INTERVAL_M = 5000;
const MIN_PART_KM2 = 30;
const projection = baseProjection();

const yearOfFile = (f) => {
  const n = f.slice(6, -8);
  return n.startsWith('bc') ? -Number(n.slice(2)) : Number(n);
};
const files = fs.readdirSync(srcDir).filter((f) => /^world_.*\.geojson$/.test(f));
const fileByYear = new Map(files.map((f) => [yearOfFile(f), f]));
const years = [...fileByYear.keys()].sort((a, b) => a - b);

async function runMapshaper(cmd, input) {
  const out = await mapshaper.applyCommands(cmd, input);
  const key = Object.keys(out)[0];
  return JSON.parse(out[key].toString());
}

// 读取原始切片：只保留有名称的政权，修复自交与重叠（重叠区域归面积较小者，避免嵌套政权被吞并），按名称合并
const cleanedCache = new Map();
async function loadCleaned(year) {
  if (cleanedCache.has(year)) return cleanedCache.get(year);
  const raw = fs.readFileSync(path.join(srcDir, fileByYear.get(year)), 'utf8');
  const cmd = [
    '-i in.json',
    `-filter "NAME != null && String(NAME).trim().length > 0"`,
    `-each "NAME = String(NAME).trim().replace(/\\s+/g, ' ')"`,
    '-clean overlap-rule=min-area',
    '-dissolve NAME copy-fields=SUBJECTO,BORDERPRECISION',
    '-o out.json format=geojson',
  ].join(' ');
  const gj = await runMapshaper(cmd, { 'in.json': raw });
  const feats = new Map();
  for (const f of gj.features) {
    const p = f.properties;
    const geom = toMulti(f.geometry);
    if (isEmpty(geom)) continue;
    const subj = p.SUBJECTO && String(p.SUBJECTO).trim() !== p.NAME ? String(p.SUBJECTO).trim() : null;
    feats.set(p.NAME, { name: p.NAME, subj, prec: p.BORDERPRECISION ?? 1, geom, fixed: false });
  }
  cleanedCache.set(year, feats);
  return feats;
}

const cloneFeats = (feats) => new Map([...feats].map(([k, v]) => [k, { ...v }]));

function put(feats, name, geom, template = {}) {
  if (isEmpty(geom)) return;
  const existing = feats.get(name);
  if (existing) {
    existing.geom = union(existing.geom, geom);
    existing.fixed = true;
    return;
  }
  feats.set(name, { subj: null, prec: 1, ...template, name, geom, fixed: true });
}

function rename(feats, from, to) {
  const f = feats.get(from);
  if (!f) return false;
  feats.delete(from);
  put(feats, to, f.geom, { subj: f.subj, prec: f.prec });
  return true;
}

let landParts = null;
function landIn(ring) {
  landParts ??= JSON.parse(fs.readFileSync(LAND_FILE, 'utf8')).features.flatMap((f) => toMulti(f.geometry).map((poly) => ({ poly, box: bbox([poly]) })));
  const mask = [[ring]];
  const box = bbox(mask);
  const parts = landParts.filter((p) => boxesOverlap(p.box, box)).map((p) => p.poly);
  return parts.length ? intersection(parts, mask) : [];
}

// 从 geom 中扣除与之相邻的其他政权，只留下无人认领的空白
function blankPart(feats, geom, except) {
  const box = bbox(geom);
  const others = [...feats.values()].filter((f) => f.name !== except && boxesOverlap(bbox(f.geom), box)).map((f) => f.geom);
  return others.length ? difference(geom, ...others) : geom;
}

const applied = [];
const warn = (msg) => console.warn('  ⚠', msg);

// 校勘：对单一年份执行修正
async function applyFixes(year, feats) {
  for (const fix of fixes.filter((x) => x.year === year)) {
    let ok = true;
    if (fix.op === 'rename') ok = rename(feats, fix.from, fix.to);
    if (fix.op === 'merge') {
      const from = feats.get(fix.from);
      if (!from) ok = false;
      else {
        feats.delete(fix.from);
        put(feats, fix.into, from.geom);
      }
    }
    if (fix.op === 'splitByLine') {
      const target = feats.get(fix.target);
      if (!target) ok = false;
      else {
        const mask = fix.box ? boxMask(fix.box) : maskFromLine(fix.line, fix.side);
        const partA = intersection(target.geom, mask);
        const partB = difference(target.geom, mask);
        feats.delete(fix.target);
        put(feats, fix.a, partA, { prec: 1 });
        put(feats, fix.b, partB, { prec: 1 });
      }
    }
    if (fix.op === 'borrow') {
      const donor = (await (fix.within ? loadCleaned : loadCorrected)(fix.from)).get(fix.source_name);
      const within = fix.within && feats.get(fix.within);
      if (!donor || (fix.within && !within)) ok = false;
      else if (within) {
        const piece = intersection(donor.geom, within.geom);
        within.geom = difference(within.geom, piece);
        within.fixed = true;
        put(feats, fix.name, piece, { prec: 1 });
      } else put(feats, fix.name, blankPart(feats, donor.geom, fix.name), { prec: 1 });
    }
    if (fix.op === 'claimLand') {
      const piece = blankPart(feats, landIn(fix.area), fix.into);
      if (isEmpty(piece)) ok = false;
      else put(feats, fix.into, piece, { prec: 1 });
    }
    const target = fix.from || fix.target || fix.source_name || fix.land;
    if (!ok) warn(`${year} ${fix.op} 未命中：${target}`);
    else applied.push({ year, op: fix.op, target, result: fix.to || fix.into || [fix.a, fix.b].filter(Boolean).join(' / ') || fix.name, note: fix.note, source: fix.source });
  }
  for (const yn of yearNames.filter((x) => x.years.includes(year))) rename(feats, yn.from, yn.to);
  return feats;
}

const correctedCache = new Map();
async function loadCorrected(year) {
  if (!correctedCache.has(year)) correctedCache.set(year, await applyFixes(year, cloneFeats(await loadCleaned(year))));
  return correctedCache.get(year);
}

// 合成切片：在 base 年份基础上执行移植、合并、删除、更名
async function buildSynthetic(def) {
  const feats = cloneFeats(await loadCorrected(def.base));
  for (const step of def.steps) {
    if (step.op === 'transplant') {
      const donor = await loadCorrected(step.donor);
      const keep = (step.keep || []).map((n) => feats.get(n)?.geom).filter(Boolean);
      const pieces = step.names.map((n) => {
        const f = donor.get(n);
        if (!f) warn(`合成 ${def.year} 移植未命中：${n}@${step.donor}`);
        return f ? { ...f, geom: difference(f.geom, ...keep) } : null;
      }).filter(Boolean);
      const transplanted = union(...pieces.map((p) => p.geom));
      for (const [name, f] of feats) {
        if ((step.keep || []).includes(name)) continue;
        f.geom = difference(f.geom, transplanted);
        if (isEmpty(f.geom)) feats.delete(name);
      }
      for (const p of pieces) feats.set(p.name, { ...p, fixed: true });
    }
    if (step.op === 'unionInto') {
      const geoms = step.names.map((n) => feats.get(n)?.geom).filter(Boolean);
      step.names.forEach((n) => feats.delete(n));
      put(feats, step.name, union(...geoms));
    }
    if (step.op === 'remove') step.names.forEach((n) => feats.delete(n));
    if (step.op === 'rename') rename(feats, step.from, step.to);
  }
  return feats;
}

// 输出：简化为 TopoJSON，计算面积与标注锚点
async function writeSnapshot(year, feats, meta) {
  const fc = { type: 'FeatureCollection', features: [] };
  for (const f of feats.values()) {
    const geom = f.geom.filter((poly) => areaKm2([poly]) >= MIN_PART_KM2 || f.geom.length === 1);
    if (isEmpty(geom)) continue;
    fc.features.push({ type: 'Feature', properties: { n: f.name, s: f.subj, p: f.prec, x: f.fixed ? 1 : 0 }, geometry: { type: 'MultiPolygon', coordinates: geom } });
  }
  const cmd = `-i in.json -simplify interval=${SIMPLIFY_INTERVAL_M} keep-shapes -rename-layers polities -o out.json format=topojson quantization=100000`;
  const topo = await runMapshaper(cmd, { 'in.json': JSON.stringify(fc) });
  const geoms = topo.objects.polities.geometries;
  const decoded = topoFeature(topo, topo.objects.polities).features;
  const stats = [];
  geoms.forEach((g, i) => {
    const multi = toMulti(decoded[i].geometry);
    const a = Math.round(areaKm2(multi));
    const anchor = labelAnchor(multi, projection);
    g.properties = { ...g.properties, a, ...(anchor ? { l: anchor.lonlat, r: anchor.r } : {}) };
    if (!g.properties.s) delete g.properties.s;
    if (!g.properties.x) delete g.properties.x;
    stats.push([g.properties.n, a]);
  });
  const file = `${year}.json`;
  fs.writeFileSync(path.join(outDir, file), JSON.stringify(topo));
  const size = fs.statSync(path.join(outDir, file)).size;
  console.log(`  ${String(year).padStart(7)}  ${geoms.length} 个政权  ${(size / 1024).toFixed(0)} KB${meta.synthetic ? '  [合成]' : ''}`);
  return { year, file, count: geoms.length, ...meta, stats };
}

const index = [];
console.log('构建年代切片…');
for (const year of years) index.push(await writeSnapshot(year, await loadCorrected(year), { synthetic: false }));
for (const def of synthetic) {
  const feats = await buildSynthetic(def);
  correctedCache.set(def.year, feats);
  index.push(await writeSnapshot(def.year, feats, { synthetic: true, base: def.base, note: def.note, source: def.source }));
}
index.sort((a, b) => a.year - b.year);

// 每个政权在各切片中的面积，用于疆域面积曲线
const areaSeries = {};
for (const s of index) for (const [name, a] of s.stats) (areaSeries[name] ??= []).push([s.year, a]);

fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify({
  source: { name: 'historical-basemaps', author: 'André Ourednik', url: 'https://github.com/aourednik/historical-basemaps', license: 'GPL-3.0' },
  simplify: `${SIMPLIFY_INTERVAL_M} m`,
  snapshots: index.map(({ stats, ...rest }) => rest),
}, null, 1));
fs.writeFileSync(path.join(outDir, 'areas.json'), JSON.stringify(areaSeries));
fs.writeFileSync(path.join(outDir, 'corrections.json'), JSON.stringify([
  ...applied,
  ...synthetic.map((d) => ({ year: d.year, op: 'synthetic', target: `基于 ${d.base} 年`, result: '合成切片', note: d.note, source: d.source })),
], null, 1));
const total = fs.readdirSync(outDir).reduce((s, f) => s + fs.statSync(path.join(outDir, f)).size, 0);
console.log(`完成：${index.length} 个切片，校勘 ${applied.length} 条，合计 ${(total / 1024 / 1024).toFixed(1)} MB`);
