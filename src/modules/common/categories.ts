import type { EventCategory } from '@/types';
import type { LocaleKey } from '@/locale';

// 事件类别：印章用字与名称的文案 key
export const CATEGORIES: { id: EventCategory; glyph: LocaleKey; key: LocaleKey }[] = [
  { id: 'war', glyph: 'category_glyph_war', key: 'category_war' },
  { id: 'politics', glyph: 'category_glyph_politics', key: 'category_politics' },
  { id: 'culture', glyph: 'category_glyph_culture', key: 'category_culture' },
  { id: 'science', glyph: 'category_glyph_science', key: 'category_science' },
  { id: 'religion', glyph: 'category_glyph_religion', key: 'category_religion' },
  { id: 'exploration', glyph: 'category_glyph_exploration', key: 'category_exploration' },
  { id: 'disaster', glyph: 'category_glyph_disaster', key: 'category_disaster' },
  { id: 'economy', glyph: 'category_glyph_economy', key: 'category_economy' },
];

export const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));
