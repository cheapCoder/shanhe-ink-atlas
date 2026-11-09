import { t } from '@/locale';

// 连续年份取整用于展示；不存在公元 0 年，0 归入公元元年
export function displayYear(y: number): number {
  const r = Math.round(y);
  return r === 0 ? 1 : r;
}

export function formatYear(y: number, withUnit = true): string {
  const r = displayYear(y);
  const unit = withUnit ? t('year_unit') : '';
  return r < 0 ? `${t('year_bc')}${-r}${unit}` : `${r}${unit}`;
}

// 时间轴刻度等紧凑场景：前221 / 1206
export function formatYearShort(y: number): string {
  const r = displayYear(y);
  return r < 0 ? `前${-r}` : `${r}`;
}

// 公元前221—前207年 / 公元前27—公元14年 / 1405—1433年
export function formatRange(from: number, to?: number): string {
  if (to === undefined || displayYear(to) === displayYear(from)) return formatYear(from);
  const a = displayYear(from);
  const b = displayYear(to);
  if (a < 0 && b < 0) return `${t('year_bc')}${-a}—前${-b}${t('year_unit')}`;
  if (a < 0) return `${t('year_bc')}${-a}—${t('year_ad')}${b}${t('year_unit')}`;
  return `${a}—${b}${t('year_unit')}`;
}

// '1453-05-29' → 5月29日；'-44-03-15' → 3月15日
export function formatDate(date?: string): string {
  const m = date?.match(/^-?\d+-(\d{2})(?:-(\d{2}))?$/);
  if (!m) return '';
  const month = Number(m[1]);
  return m[2] ? `${month}月${Number(m[2])}日` : `${month}月`;
}
