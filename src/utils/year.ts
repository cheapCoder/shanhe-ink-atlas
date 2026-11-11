import { getLang, t } from '@/locale';

// 连续年份取整用于展示；不存在公元 0 年，0 归入公元元年
export function displayYear(y: number): number {
  const r = Math.round(y);
  return r === 0 ? 1 : r;
}

// 公元前221年 / 1405年；221 BCE / 79 CE / 1405
export function formatYear(y: number, withUnit = true): string {
  const r = displayYear(y);
  if (getLang() === 'en') {
    if (r < 0) return `${-r} BCE`;
    return withUnit && r < 1000 ? `${r} CE` : `${r}`;
  }
  const unit = withUnit ? t('year_unit') : '';
  return r < 0 ? `${t('year_bc')}${-r}${unit}` : `${r}${unit}`;
}

// 时间轴刻度等紧凑场景：前221 / 1206；221 BC / 1206
export function formatYearShort(y: number): string {
  const r = displayYear(y);
  if (getLang() === 'en') return r < 0 ? `${-r} BC` : `${r}`;
  return r < 0 ? `前${-r}` : `${r}`;
}

// 公元前221—前207年 / 公元前27—公元14年 / 1405—1433年；221–207 BCE / 27 BCE – 14 CE / 1405–1433
export function formatRange(from: number, to?: number): string {
  if (to === undefined || displayYear(to) === displayYear(from)) return formatYear(from);
  const a = displayYear(from);
  const b = displayYear(to);
  if (getLang() === 'en') {
    if (a < 0 && b < 0) return `${-a}–${-b} BCE`;
    if (a < 0) return `${-a} BCE – ${b} CE`;
    return `${a}–${b}${b < 1000 ? ' CE' : ''}`;
  }
  if (a < 0 && b < 0) return `${t('year_bc')}${-a}—前${-b}${t('year_unit')}`;
  if (a < 0) return `${t('year_bc')}${-a}—${t('year_ad')}${b}${t('year_unit')}`;
  return `${a}—${b}${t('year_unit')}`;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// 带日期的纪年：'1453-05-29' → 1453年5月29日 / 29 May 1453；'-44-03-15' → 公元前44年3月15日 / 15 March 44 BCE
export function formatDated(year: number, date?: string): string {
  const m = date?.match(/^-?\d+-(\d{2})(?:-(\d{2}))?$/);
  if (!m) return formatYear(year);
  const month = Number(m[1]);
  if (getLang() === 'en') return `${m[2] ? `${Number(m[2])} ` : ''}${MONTHS[month - 1]} ${formatYear(year)}`;
  return `${formatYear(year)}${month}月${m[2] ? `${Number(m[2])}日` : ''}`;
}

// 面积：中文以“万平方公里”计，英文以 million km² 计
export function formatArea(km2: number): string {
  if (getLang() === 'en') {
    const m = km2 / 1e6;
    return m >= 10 ? m.toFixed(1) : m >= 0.1 ? m.toFixed(2) : m.toFixed(3);
  }
  const wan = km2 / 1e4;
  return wan >= 100 ? Math.round(wan).toLocaleString('zh-CN') : wan.toFixed(1);
}
