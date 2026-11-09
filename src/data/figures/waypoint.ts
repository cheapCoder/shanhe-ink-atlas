import type { LonLat, Waypoint } from '../../types.ts';

// 路线点：年份、地点、经度、纬度、事迹；海路用 sea 标记，via 为避开陆地的中间航点（不标注）
export function w(year: number, place: string, lon: number, lat: number, note: string, extra: { sea?: boolean; via?: LonLat[] } = {}): Waypoint {
  return { year, place, coord: [lon, lat], note, ...extra };
}
