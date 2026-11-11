// 全局数据类型。年份约定：负数为公元前（-221 即公元前 221 年），无公元 0 年
export type LonLat = [number, number];

// 界面语言与双语文案：内容数据把两种语言写在一处，新增条目时一并提供
export type Lang = 'zh' | 'en';

export interface Text {
  zh: string;
  en: string;
}

export type Mode = 'overview' | 'territory' | 'figure' | 'events';

export type EventCategory = 'war' | 'politics' | 'culture' | 'science' | 'religion' | 'exploration' | 'disaster' | 'economy';

// 事件/人物动画精灵：每种对应一套水墨 SVG 动画
export type SpriteKind =
  | 'battle' | 'ship' | 'horse' | 'seal' | 'scroll' | 'fire' | 'wall' | 'temple' | 'crown' | 'pyramid'
  | 'steam' | 'rocket' | 'plague' | 'volcano' | 'printing' | 'atom' | 'flag' | 'walker' | 'camel' | 'cannon'
  | 'mushroom' | 'wreath';

export interface WikiRef {
  zh: string;
  en: string;
}

// importance：3 为改变世界格局的转折（导览“精要”即停驻），2 为重要大事，1 为值得一记
export interface HistoryEvent {
  id: string;
  title: Text;
  year: number;
  endYear?: number;
  approx?: boolean;
  date?: string;
  place: Text;
  coord: LonLat;
  category: EventCategory;
  sprite: SpriteKind;
  importance: 1 | 2 | 3;
  summary: Text;
  figures?: string[];
  lineage?: string;
  zoom?: number;
  wiki: WikiRef;
}

// 行迹站点：note 为一句话标题，detail 为两三句讲解；
// event 关联一则大事（沿用其配图并可跳转），wiki 为配图与延伸阅读所依据的条目
export interface Waypoint {
  year: number;
  coord: LonLat;
  place: Text;
  note: Text;
  detail?: Text;
  via?: LonLat[];
  sea?: boolean;
  event?: string;
  wiki?: WikiRef;
}

export type Region = 'china' | 'east-asia' | 'south-asia' | 'central-asia' | 'west-asia' | 'europe' | 'africa' | 'americas';

// lineage：人物所属的国家谱系，人物模式下时间轴据此显示该国纪年
export interface Figure {
  id: string;
  name: Text;
  birth: number;
  death: number;
  approx?: boolean;
  title: Text;
  region: Region;
  lineage?: string;
  summary: Text;
  sprite: SpriteKind;
  route: Waypoint[];
  wiki: WikiRef;
}

export interface LineageMember {
  from: number;
  to: number;
  names: string[];
  related?: string[];
  dependents?: boolean;
  label: Text;
}

export interface Lineage {
  id: string;
  name: Text;
  color: string;
  members: LineageMember[];
  note?: Text;
}

// 由 scripts/fetch_wiki.mjs 生成：图片、维基条目链接与 Wikidata 校验信息
export interface MediaInfo {
  image?: string;
  thumb?: string;
  width?: number;
  height?: number;
  credit?: string;
  license?: string;
  filePage?: string;
  zhUrl?: string;
  enUrl?: string;
  wikidata?: string;
}

export interface SnapshotMeta {
  year: number;
  file: string;
  count: number;
  synthetic: boolean;
  base?: number;
  note?: string;
  noteEn?: string;
  source?: string;
}

// target：被处理的政权或地区；“借用”一类的校勘里是所借切片的年份
export interface Correction {
  year: number;
  op: string;
  target: string | number;
  result: string;
  note: string;
  noteEn?: string;
  source: string;
}
