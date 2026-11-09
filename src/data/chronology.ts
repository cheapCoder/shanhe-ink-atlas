// 年表：世界史分期与中国历代纪年（夏、商、西周起讫依夏商周断代工程推定，余依通行年表）
export interface Era {
  name: string;
  from: number;
  to: number;
  tint: string;
}

export const WORLD_ERAS: Era[] = [
  { name: '上古', from: -3200, to: -800, tint: 'rgba(168, 116, 63, 0.10)' },
  { name: '古典', from: -800, to: 500, tint: 'rgba(62, 92, 118, 0.08)' },
  { name: '中古', from: 500, to: 1450, tint: 'rgba(95, 138, 114, 0.09)' },
  { name: '近世', from: 1450, to: 1789, tint: 'rgba(168, 116, 63, 0.08)' },
  { name: '近代', from: 1789, to: 1945, tint: 'rgba(178, 58, 43, 0.07)' },
  { name: '现代', from: 1945, to: 2025, tint: 'rgba(62, 92, 118, 0.09)' },
];

export interface Dynasty {
  name: string;
  short: string;
  from: number;
  to: number;
}

export const CHINA_DYNASTIES: Dynasty[] = [
  { name: '夏', short: '夏', from: -2070, to: -1600 },
  { name: '商', short: '商', from: -1600, to: -1046 },
  { name: '西周', short: '西周', from: -1046, to: -771 },
  { name: '春秋', short: '春秋', from: -770, to: -476 },
  { name: '战国', short: '战国', from: -475, to: -221 },
  { name: '秦', short: '秦', from: -221, to: -207 },
  { name: '西汉', short: '西汉', from: -202, to: 8 },
  { name: '新', short: '新', from: 9, to: 23 },
  { name: '东汉', short: '东汉', from: 25, to: 220 },
  { name: '三国', short: '三国', from: 220, to: 280 },
  { name: '西晋', short: '西晋', from: 266, to: 316 },
  { name: '东晋·十六国', short: '东晋', from: 317, to: 420 },
  { name: '南北朝', short: '南北朝', from: 420, to: 589 },
  { name: '隋', short: '隋', from: 581, to: 618 },
  { name: '唐', short: '唐', from: 618, to: 907 },
  { name: '五代十国', short: '五代', from: 907, to: 979 },
  { name: '北宋', short: '北宋', from: 960, to: 1127 },
  { name: '南宋', short: '南宋', from: 1127, to: 1279 },
  { name: '元', short: '元', from: 1271, to: 1368 },
  { name: '明', short: '明', from: 1368, to: 1644 },
  { name: '清', short: '清', from: 1644, to: 1912 },
  { name: '中华民国', short: '民国', from: 1912, to: 1949 },
  { name: '中华人民共和国', short: '新中国', from: 1949, to: 2025 },
];

// 某一年所处的中国朝代；朝代交替的重叠年份取后起者
export function dynastyAt(year: number): Dynasty | null {
  let hit: Dynasty | null = null;
  for (const d of CHINA_DYNASTIES) if (year >= d.from && year < d.to + 1) hit = d;
  return hit;
}

export function eraAt(year: number): Era | null {
  return WORLD_ERAS.find((e) => year >= e.from && year < e.to) ?? WORLD_ERAS[WORLD_ERAS.length - 1];
}
