// 大事纪年，按时代分文件存放。年份负数为公元前；approx 表示年代为约数；date 为可考的日期（公元前及 1582 年以前为儒略历）。
// 讲解文字依据所列维基百科条目及其引用的史料撰写；撰写约定见 docs/content-guide.md
import type { HistoryEvent } from '../../types.ts';
import { EVENTS_ANTIQUITY } from './antiquity.ts';
import { EVENTS_MEDIEVAL } from './medieval.ts';
import { EVENTS_EARLY_MODERN } from './early_modern.ts';
import { EVENTS_MODERN } from './modern.ts';

export const EVENTS: HistoryEvent[] = [...EVENTS_ANTIQUITY, ...EVENTS_MEDIEVAL, ...EVENTS_EARLY_MODERN, ...EVENTS_MODERN].sort((a, b) => a.year - b.year);

export const EVENT_BY_ID = new Map(EVENTS.map((e) => [e.id, e]));
