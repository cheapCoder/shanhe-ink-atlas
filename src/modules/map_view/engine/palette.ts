// 设色：浅绛山水的淡彩体系。地图大面积为墨与赭石、花青，其他颜料降饱和后用于区分相邻政权
export const PIGMENTS = [
  '#bb7a4c', // 赭石
  '#4f7ba2', // 花青
  '#5f9f82', // 石绿
  '#d6a640', // 藤黄
  '#b8545c', // 胭脂
  '#5b6aa8', // 黛蓝
  '#98694c', // 檀褐
  '#7f9c56', // 苍绿
  '#8c5b88', // 绛紫
  '#5c9197', // 青灰
] as const;

export const CINNABAR = '#b23a2b';
export const INK = '#1f1d1a';
export const WATER_INK = '#53636b';

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// 加深：把颜色向墨色混合，用于晕边
export function deepen(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const [ir, ig, ib] = hexToRgb(INK);
  const m = (a: number, c: number) => Math.round(a + (c - a) * amount);
  return `#${[m(r, ir), m(g, ig), m(b, ib)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// 相邻政权尽量不同色：优先沿用“家族色”（同一谱系历代同色），冲突时为较小者换色
export function assignColors(
  names: string[],
  areas: number[],
  neighbors: number[][],
  preferred: (name: string) => number | null,
): number[] {
  const n = names.length;
  const colors = new Array<number>(n).fill(-1);
  const order = [...names.keys()].sort((a, b) => areas[b] - areas[a]);
  for (const i of order) {
    const used = new Set(neighbors[i].map((j) => colors[j]).filter((c) => c >= 0));
    const want = preferred(names[i]) ?? hashString(names[i]) % PIGMENTS.length;
    if (!used.has(want)) {
      colors[i] = want;
      continue;
    }
    let pick = want;
    for (let step = 1; step < PIGMENTS.length; step++) {
      const c = (want + step * 3) % PIGMENTS.length;
      if (!used.has(c)) {
        pick = c;
        break;
      }
    }
    colors[i] = pick;
  }
  return colors;
}
