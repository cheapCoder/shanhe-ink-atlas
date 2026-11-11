// 界面语言：中文与英文。语言来自地址栏 ?lang=、上次的选择或浏览器语言；
// 切换时界面整体重挂（见 App.tsx），因此 t() 直接读取当前语言即可，组件无需逐个订阅
import { create } from 'zustand';
import type { Lang, Text } from '@/types';
import { zh, type LocaleKey } from './zh';
import { en } from './en';

export type { LocaleKey };

const TABLES: Record<Lang, Record<LocaleKey, string>> = { zh, en };
const STORAGE_KEY = 'shanhe.lang';

const isLang = (v: unknown): v is Lang => v === 'zh' || v === 'en';

function detect(): Lang {
  const query = new URLSearchParams(location.search).get('lang');
  if (isLang(query)) return query;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLang(saved)) return saved;
  } catch {
    // 无痕模式等场景下本地存储不可用
  }
  return /^zh\b/i.test(navigator.language) ? 'zh' : 'en';
}

function applyToDocument(lang: Lang) {
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  document.title = TABLES[lang].app_doc_title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', TABLES[lang].app_doc_desc);
}

interface LocaleState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const useLocale = create<LocaleState>((set) => ({
  lang: detect(),
  setLang: (lang) => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // 同上
    }
    applyToDocument(lang);
    set({ lang });
  },
}));

applyToDocument(useLocale.getState().lang);

export const getLang = (): Lang => useLocale.getState().lang;

export const t = (key: LocaleKey): string => TABLES[getLang()][key];

// 带占位符的文案：tf('app_stats', { s: 60 }) 中的 {s} 被替换
export const tf = (key: LocaleKey, vars: Record<string, string | number>): string =>
  t(key).replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));

// 双语内容取当前语言；缺译时退回中文
export const tx = (text: Text | null | undefined): string => (text ? text[getLang()] || text.zh : '');
