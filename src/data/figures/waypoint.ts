import type { LonLat, Waypoint, WikiRef } from '../../types.ts';

// 一种语言下的站点文案：地点、一句话标题、两三句讲解（可省）
type Lines = [place: string, note: string, detail?: string];

interface Extra {
  sea?: boolean;
  via?: LonLat[];
  event?: string;
  wiki?: WikiRef;
}

// 行迹站点：年份、经度、纬度、中文文案、英文文案。
// 海路用 sea 标记，via 为避开陆地的中间航点（不标注）；event 关联一则大事，wiki 指向配图所依据的条目
export function w(year: number, lon: number, lat: number, zh: Lines, en: Lines, extra: Extra = {}): Waypoint {
  const detail = zh[2] && en[2] ? { detail: { zh: zh[2], en: en[2] } } : {};
  return { year, coord: [lon, lat], place: { zh: zh[0], en: en[0] }, note: { zh: zh[1], en: en[1] }, ...detail, ...extra };
}
