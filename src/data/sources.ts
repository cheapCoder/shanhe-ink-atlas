// 数据来源与许可（数据说明弹窗展示）
export interface SourceEntry {
  group: 'borders' | 'basemap' | 'content' | 'images';
  name: string;
  detail: string;
  license: string;
  url: string;
}

export const SOURCES: SourceEntry[] = [
  {
    group: 'borders',
    name: 'historical-basemaps（André Ourednik）',
    detail: '公元前123000年至2010年共54幅世界政区复原底图，含边界精度字段；本项目据此简化为5公里精度，并做了逐条注明依据的校勘，另补绘秦统一、绍兴和议、蒙古兴起、金亡、明初、明清易代、民国、新中国等关键年份。',
    license: 'GPL-3.0',
    url: 'https://github.com/aourednik/historical-basemaps',
  },
  {
    group: 'basemap',
    name: 'Natural Earth 1:50m 陆地、河流、湖泊',
    detail: '海岸线、主要河流与湖泊；咸海、乍得湖、罗布泊、特斯科科湖采用其1:10m历史水域图层，并剔除现代水库。',
    license: '公有领域',
    url: 'https://www.naturalearthdata.com/',
  },
  {
    group: 'basemap',
    name: 'Natural Earth 1:50m 晕渲地形（SR_50M）',
    detail: '重投影至自然地球投影，并按阴坡与起伏度映射为墨色，作为山体水墨层。',
    license: '公有领域',
    url: 'https://www.naturalearthdata.com/downloads/50m-raster-data/50m-shaded-relief/',
  },
  {
    group: 'content',
    name: '维基百科（中文、英文）与 Wikidata',
    detail: '每则大事、每位人物均列出所依据的条目；年代与地点由校验脚本与 Wikidata 的时间、坐标属性逐条比对。',
    license: 'CC BY-SA 4.0 / CC0',
    url: 'https://www.wikidata.org/',
  },
  {
    group: 'images',
    name: 'Wikimedia Commons',
    detail: '配图仅采用自由许可或公有领域文件，作者与许可协议在每张图下方注明。',
    license: '逐图标注',
    url: 'https://commons.wikimedia.org/',
  },
];
