// 全局数据类型。年份约定：负数为公元前（-221 即公元前 221 年），无公元 0 年
export type LonLat = [number, number];

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

export interface HistoryEvent {
  id: string;
  title: string;
  titleEn: string;
  year: number;
  endYear?: number;
  approx?: boolean;
  date?: string;
  place: string;
  coord: LonLat;
  category: EventCategory;
  sprite: SpriteKind;
  importance: 1 | 2 | 3;
  summary: string;
  figures?: string[];
  lineage?: string;
  zoom?: number;
  wiki: WikiRef;
}

export interface Waypoint {
  year: number;
  place: string;
  coord: LonLat;
  note: string;
  via?: LonLat[];
  sea?: boolean;
}

export interface Figure {
  id: string;
  name: string;
  nameEn: string;
  birth: number;
  death: number;
  approx?: boolean;
  title: string;
  region: string;
  summary: string;
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
  label: string;
}

export interface Lineage {
  id: string;
  name: string;
  nameEn: string;
  color: string;
  members: LineageMember[];
  note?: string;
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
  source?: string;
}

export interface Correction {
  year: number;
  op: string;
  target: string;
  result: string;
  note: string;
  source: string;
}
