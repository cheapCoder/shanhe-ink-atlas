// 下载数据流水线所需的原始数据到 data_raw/（已存在的文件跳过）
// 用法：node scripts/fetch_raw.mjs [data_raw]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.argv[2] ?? 'data_raw';
const BASEMAPS_API = 'https://api.github.com/repos/aourednik/historical-basemaps/contents/geojson';
const BASEMAPS_RAW = 'https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/';
const NE_RAW = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/';
const NE_FILES = [
  'ne_50m_land',
  'ne_110m_land',
  'ne_50m_lakes',
  'ne_50m_lakes_historic',
  'ne_10m_lakes_historic',
  'ne_50m_rivers_lake_centerlines',
  'ne_10m_rivers_lake_centerlines',
  'ne_50m_geography_regions_polys',
  'ne_10m_admin_0_disputed_areas',
  'ne_10m_admin_0_countries_chn',
  'ne_10m_admin_0_boundary_lines_maritime_indicator_chn',
];
const RELIEF_ZIP = 'https://naciscdn.org/naturalearth/50m/raster/SR_50M.zip';

async function download(url, file) {
  if (fs.existsSync(file)) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const res = await fetch(url, { headers: { 'User-Agent': 'shanhe-moshi-data-pipeline' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  return true;
}

async function fetchAll(jobs, label) {
  let fresh = 0;
  for (const [url, file] of jobs) if (await download(url, file)) fresh++;
  console.log(`${label}: ${jobs.length} 个文件，新下载 ${fresh} 个`);
}

// historical-basemaps：按仓库目录列出全部 world_*.geojson

const listing = await fetch(BASEMAPS_API, { headers: { 'User-Agent': 'shanhe-moshi-data-pipeline' } }).then((r) => r.json());
const basemaps = listing.map((f) => f.name).filter((n) => /^world_(bc)?\d+\.geojson$/.test(n));
await fetchAll(basemaps.map((n) => [BASEMAPS_RAW + n, path.join(root, 'basemaps', n)]), 'historical-basemaps');

await fetchAll(NE_FILES.map((n) => [`${NE_RAW}${n}.geojson`, path.join(root, 'naturalearth', `${n}.geojson`)]), 'Natural Earth');

// 晕渲地形：压缩包解出 SR_50M.tif（Windows/macOS 的 tar 可解 zip，其余系统用 unzip）

const zip = path.join(root, 'relief', 'SR_50M.zip');
await download(RELIEF_ZIP, zip);
if (!fs.existsSync(path.join(root, 'relief', 'SR_50M.tif'))) {
  try {
    execFileSync('tar', ['-xf', zip, '-C', path.dirname(zip)]);
  } catch {
    execFileSync('unzip', ['-o', zip, '-d', path.dirname(zip)]);
  }
}
console.log('SR_50M 晕渲地形：就绪');
