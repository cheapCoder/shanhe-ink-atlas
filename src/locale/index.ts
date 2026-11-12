import { zh, type LocaleKey } from './zh';

export type { LocaleKey };

export const t = (key: LocaleKey): string => zh[key];

// 带占位符的文案：t('app_stats', { s: 60 }) 中的 {s} 被替换
export const tf = (key: LocaleKey, vars: Record<string, string | number>): string =>
  zh[key].replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));
