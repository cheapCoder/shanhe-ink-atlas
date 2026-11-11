// 维基素材（由 scripts/fetch_wiki.mjs 生成）：配图、署名、许可与条目链接
import raw from './generated/media.json';
import type { HistoryEvent, MediaInfo, Waypoint, WikiRef } from '@/types';
import { EVENT_BY_ID } from './events';

// topics：行迹站点的配图，以英文维基条目名为键，多位人物到过同一处时共用
const data = raw as unknown as { events: Record<string, MediaInfo>; figures: Record<string, MediaInfo>; topics?: Record<string, MediaInfo> };

export const eventMedia = (id: string): MediaInfo | undefined => data.events[id];

export const figureMedia = (id: string): MediaInfo | undefined => data.figures[id];

export const topicMedia = (wiki?: WikiRef): MediaInfo | undefined => (wiki ? data.topics?.[wiki.en] : undefined);

export const imageUrl = (m?: MediaInfo): string | null => (m?.image ? `${import.meta.env.BASE_URL}${m.image}` : null);

export const thumbUrl = (m?: MediaInfo): string | null => (m?.thumb ? `${import.meta.env.BASE_URL}${m.thumb}` : imageUrl(m));

const article = (lang: 'zh' | 'en', title: string) =>
  lang === 'zh' ? `https://zh.wikipedia.org/zh-cn/${encodeURIComponent(title.replace(/ /g, '_'))}` : `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;

// 条目链接：优先用抓取脚本核验过的地址；新增条目尚未抓取时，按条目名直接拼出地址
export function wikiLinks(wiki: WikiRef | undefined, media?: MediaInfo): { zh: string | null; en: string | null; wikidata: string | null } {
  return {
    zh: media?.zhUrl ?? (wiki?.zh ? article('zh', wiki.zh) : null),
    en: media?.enUrl ?? (wiki?.en ? article('en', wiki.en) : null),
    wikidata: media?.wikidata ?? null,
  };
}

// 行迹站点的配图：关联大事时沿用大事的配图，否则取站点条目的配图
export function waypointMedia(w: Waypoint): { media?: MediaInfo; event?: HistoryEvent } {
  const event = w.event ? EVENT_BY_ID.get(w.event) : undefined;
  const own = topicMedia(w.wiki);
  if (own?.image) return { media: own, event };
  return { media: event ? eventMedia(event.id) : undefined, event };
}
