// 数据来源与许可（数据说明弹窗展示）
import type { Text } from '../types.ts';

export interface SourceEntry {
  group: 'borders' | 'basemap' | 'content' | 'images';
  name: Text;
  detail: Text;
  license: Text;
  url: string;
}

export const SOURCES: SourceEntry[] = [
  {
    group: 'borders',
    name: { zh: 'historical-basemaps（André Ourednik）', en: 'historical-basemaps (André Ourednik)' },
    detail: {
      zh: '公元前123000年至2010年共54幅世界政区复原底图，含边界精度字段；本项目据此简化为5公里精度，并做了逐条注明依据的校勘，另补绘秦统一、绍兴和议、蒙古兴起、金亡、明初、明清易代、民国、新中国等关键年份。',
      en: 'Fifty-four reconstructed world political maps from 123,000 BCE to 2010, with a border-precision field. This project simplifies them to 5 km precision, applies corrections that each cite their source, and redraws key years the dataset lacks: the Qin unification, the Treaty of Shaoxing, the rise of the Mongols, the fall of the Jin, the early Ming, the Ming-Qing transition, the Republic and the People\'s Republic.',
    },
    license: { zh: 'GPL-3.0', en: 'GPL-3.0' },
    url: 'https://github.com/aourednik/historical-basemaps',
  },
  {
    group: 'basemap',
    name: { zh: 'Natural Earth 1:50m 陆地、河流、湖泊', en: 'Natural Earth 1:50m land, rivers and lakes' },
    detail: {
      zh: '海岸线、主要河流与湖泊；咸海、乍得湖、罗布泊、特斯科科湖采用其1:10m历史水域图层，并剔除现代水库。',
      en: 'Coastlines, major rivers and lakes. The Aral Sea, Lake Chad, Lop Nur and Lake Texcoco use the 1:10m historic-lakes layer, and modern reservoirs are removed.',
    },
    license: { zh: '公有领域', en: 'Public domain' },
    url: 'https://www.naturalearthdata.com/',
  },
  {
    group: 'basemap',
    name: { zh: 'Natural Earth 1:50m 晕渲地形（SR_50M）', en: 'Natural Earth 1:50m shaded relief (SR_50M)' },
    detail: {
      zh: '重投影至自然地球投影，并按阴坡与起伏度映射为墨色，作为山体水墨层。',
      en: 'Reprojected to the Natural Earth projection and mapped to ink tones by shade and ruggedness to form the ink-wash mountain layer.',
    },
    license: { zh: '公有领域', en: 'Public domain' },
    url: 'https://www.naturalearthdata.com/downloads/50m-raster-data/50m-shaded-relief/',
  },
  {
    group: 'content',
    name: { zh: '维基百科（中文、英文）与 Wikidata', en: 'Wikipedia (Chinese and English) and Wikidata' },
    detail: {
      zh: '每则大事、每位人物均列出所依据的条目；年代与地点由校验脚本与 Wikidata 的时间、坐标属性逐条比对。',
      en: 'Every event and figure lists the articles it draws on; dates and places are cross-checked against Wikidata time and coordinate properties by a verification script.',
    },
    license: { zh: 'CC BY-SA 4.0 / CC0', en: 'CC BY-SA 4.0 / CC0' },
    url: 'https://www.wikidata.org/',
  },
  {
    group: 'images',
    name: { zh: 'Wikimedia Commons', en: 'Wikimedia Commons' },
    detail: {
      zh: '配图仅采用自由许可或公有领域文件，作者与许可协议在每张图下方注明。',
      en: 'Only freely licensed or public-domain files are used; the author and licence are given under each image.',
    },
    license: { zh: '逐图标注', en: 'Credited per image' },
    url: 'https://commons.wikimedia.org/',
  },
];
