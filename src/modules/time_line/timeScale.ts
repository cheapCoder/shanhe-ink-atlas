// 时间轴比例尺：分段线性，远古压缩、近现代展开，使大事在卷面上分布均匀
import { YEAR_MAX, YEAR_MIN } from '@/store/useAtlas';

const STOPS: [number, number][] = [
  [YEAR_MIN, 0],
  [-1000, 0.11],
  [-500, 0.17],
  [1, 0.245],
  [500, 0.32],
  [1000, 0.4],
  [1300, 0.47],
  [1500, 0.55],
  [1700, 0.64],
  [1800, 0.71],
  [1900, 0.81],
  [1950, 0.89],
  [YEAR_MAX, 1],
];

export function yearToT(year: number): number {
  const y = Math.min(YEAR_MAX, Math.max(YEAR_MIN, year));
  for (let i = 1; i < STOPS.length; i++) {
    const [y1, t1] = STOPS[i];
    if (y <= y1) {
      const [y0, t0] = STOPS[i - 1];
      return t0 + ((y - y0) / (y1 - y0)) * (t1 - t0);
    }
  }
  return 1;
}

export function tToYear(t: number): number {
  const v = Math.min(1, Math.max(0, t));
  for (let i = 1; i < STOPS.length; i++) {
    const [y1, t1] = STOPS[i];
    if (v <= t1) {
      const [y0, t0] = STOPS[i - 1];
      return y0 + ((v - t0) / (t1 - t0)) * (y1 - y0);
    }
  }
  return YEAR_MAX;
}

// 刻度：按卷面位置选择合适的年份标注
export const TICKS: number[] = [-3000, -2000, -1000, -500, 1, 500, 1000, 1200, 1400, 1500, 1600, 1700, 1800, 1850, 1900, 1950, 2000];

// 正常速度下走完整卷所需秒数（不含导览停驻）
export const FULL_RUN_SECONDS = 360;
