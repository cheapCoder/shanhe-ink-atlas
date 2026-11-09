// 底图矢量：陆地、湖泊（含历史水域）、河流 → 各一个 TopoJSON；南海断续线与南海诸岛 → china_sea.json
// 用法：node scripts/build_base.mjs <naturalearth 目录> <输出目录>
import fs from 'node:fs';
import path from 'node:path';
import mapshaper from 'mapshaper';
import { geoCentroid } from 'd3-geo';
import { areaKm2, toMulti } from './lib/geo_ops.mjs';

const [srcDir, outDir] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const read = (name) => JSON.parse(fs.readFileSync(path.join(srcDir, `${name}.geojson`), 'utf8'));

// 历史上重要河流的中文名（Natural Earth 50m 河流数据无中文名）
const RIVER_ZH = {
  Huang: '黄河', 'Chang Jiang': '长江', Yangtze: '长江', Jinsha: '金沙江', Nile: '尼罗河', 'El Bahr el Abyad': '白尼罗河',
  'El Bahr el Azraq': '青尼罗河', Euphrates: '幼发拉底河', 'Al Furat': '幼发拉底河', Firat: '幼发拉底河', Tigris: '底格里斯河',
  Dicle: '底格里斯河', Indus: '印度河', Ganges: '恒河', Danube: '多瑙河', Donau: '多瑙河', Rhine: '莱茵河', Rhein: '莱茵河',
  Volga: '伏尔加河', Mississippi: '密西西比河', Missouri: '密苏里河', Amazonas: '亚马孙河', Congo: '刚果河', Mekong: '湄公河',
  Lancang: '澜沧江', Amur: '黑龙江', 'Heilong Jiang': '黑龙江', Ob: '鄂毕河', Yenisey: '叶尼塞河', Lena: '勒拿河', Niger: '尼日尔河',
  Zambezi: '赞比西河', Brahmaputra: '布拉马普特拉河', Yarlung: '雅鲁藏布江', Ayeyarwady: '伊洛瓦底江', Dnipro: '第聂伯河',
  Dnepre: '第聂伯河', Seine: '塞纳河', Oder: '奥得河', 'St. Lawrence': '圣劳伦斯河', Paraná: '巴拉那河', Orinoco: '奥里诺科河',
  Irtysh: '额尔齐斯河', Ertis: '额尔齐斯河', Ertix: '额尔齐斯河', Ural: '乌拉尔河', 'Syr Darya': '锡尔河', 'Amu Darya': '阿姆河',
  Xi: '西江', Murray: '墨累河', 'Rio Grande': '格兰德河', Yukon: '育空河', Mackenzie: '马更些河', Salween: '萨尔温江', Nu: '怒江',
  Angara: '安加拉河', Ohio: '俄亥俄河', Columbia: '哥伦比亚河', 'Shatt al Arab': '阿拉伯河', Selenge: '色楞格河',
  'Selenge (Selenga)': '色楞格河', Kolyma: '科雷马河', Pechora: '伯朝拉河', 'Severnaya Dvina': '北德维纳河', Orange: '奥兰治河',
};

async function shape(name, fc, cmd) {
  const out = await mapshaper.applyCommands(`-i in.json ${cmd} -rename-layers ${name} -o out.json format=topojson`, { 'in.json': JSON.stringify(fc) });
  return JSON.parse(out['out.json'].toString());
}

const land = read('ne_50m_land');
const lakesModern = read('ne_50m_lakes');
const lakesHistoric = read('ne_10m_lakes_historic');
const rivers = read('ne_50m_rivers_lake_centerlines');

// 湖泊：去掉现代水库与已萎缩的现代咸海、乍得湖，换用历史水域
const replacedByHistoric = new Set(lakesHistoric.features.map((f) => f.properties.name));
const lakes = {
  type: 'FeatureCollection',
  features: [
    ...lakesModern.features.filter((f) => f.properties.featurecla !== 'Reservoir' && !replacedByHistoric.has(f.properties.name) && areaKm2(toMulti(f.geometry)) > 1500),
    ...lakesHistoric.features,
  ].map((f) => ({ type: 'Feature', properties: { n: f.properties.name_zh || f.properties.name || '' }, geometry: f.geometry })),
};

const riverFc = {
  type: 'FeatureCollection',
  features: rivers.features.filter((f) => f.properties.featurecla === 'River').map((f) => ({
    type: 'Feature',
    properties: { r: f.properties.scalerank, ...(RIVER_ZH[f.properties.name] ? { n: RIVER_ZH[f.properties.name] } : {}) },
    geometry: f.geometry,
  })),
};

const landTopo = await shape('land', land, '-simplify interval=3000 keep-shapes -filter-islands min-area=40km2 -dissolve');
const lakeTopo = await shape('lakes', lakes, '-simplify interval=2000 keep-shapes');
const riverTopo = await shape('rivers', riverFc, '-simplify interval=4000');

// 合并为一个 TopoJSON 文件需重新共享坐标变换，这里分别输出三个小文件更简单可靠
for (const [file, topo] of [['land.json', landTopo], ['lakes.json', lakeTopo], ['rivers.json', riverTopo]]) {
  fs.writeFileSync(path.join(outDir, file), JSON.stringify(topo));
  console.log(file, (fs.statSync(path.join(outDir, file)).size / 1024).toFixed(0), 'KB');
}
console.log('lakes', lakes.features.length, 'rivers', riverFc.features.length, 'named rivers', riverFc.features.filter((f) => f.properties.n).length);

// 南海断续线与南海诸岛、钓鱼岛（Natural Earth 中国视角数据）：断续线取海上界线指示，岛礁取争议地区中各岛的中心点；
// 岛礁面积过小，底图陆地中没有，前端以墨点示意，放大到 k 倍以上时标注地名
const SEA_ISLANDS = new Set(['Paracel Is.', 'Spratly Is.', 'Scarborough Reef', 'Nansei-shoto']);
const PRATAS = [116.72, 20.7];
const SEA_LABELS = [
  { n: '南海诸岛', at: [114.5, 13.4], k: 1.2 },
  { n: '东沙群岛', at: [116.72, 21.15], k: 3 },
  { n: '西沙群岛', at: [112.0, 17.15], k: 3 },
  { n: '中沙群岛', at: [114.4, 15.75], k: 3 },
  { n: '南沙群岛', at: [114.0, 9.6], k: 3 },
  { n: '黄岩岛', at: [117.75, 14.75], k: 5 },
  { n: '钓鱼岛', at: [123.5, 25.35], k: 5 },
];
const round = ([x, y]) => [+x.toFixed(3), +y.toFixed(3)];
const chinaSea = {
  dashes: read('ne_10m_admin_0_boundary_lines_maritime_indicator_chn').features
    .flatMap((f) => (f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates))
    .map((line) => line.map(round)),
  islands: [
    PRATAS,
    ...read('ne_10m_admin_0_disputed_areas').features
      .filter((f) => SEA_ISLANDS.has(f.properties.NAME))
      .flatMap((f) => toMulti(f.geometry).map((poly) => round(geoCentroid({ type: 'Polygon', coordinates: poly })))),
  ],
  labels: SEA_LABELS,
};
fs.writeFileSync(path.join(outDir, 'china_sea.json'), JSON.stringify(chinaSea));
console.log('china_sea.json', chinaSea.dashes.length, 'dashes', chinaSea.islands.length, 'islands');
