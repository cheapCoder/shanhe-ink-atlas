// 维基素材（由 scripts/fetch_wiki.mjs 生成）：配图、署名、许可与条目链接
import raw from './generated/media.json';
import type { MediaInfo } from '@/types';

const data = raw as unknown as { events: Record<string, MediaInfo>; figures: Record<string, MediaInfo> };

export const eventMedia = (id: string): MediaInfo | undefined => data.events[id];

export const figureMedia = (id: string): MediaInfo | undefined => data.figures[id];

export const imageUrl = (m?: MediaInfo): string | null => (m?.image ? `${import.meta.env.BASE_URL}${m.image}` : null);

export const thumbUrl = (m?: MediaInfo): string | null => (m?.thumb ? `${import.meta.env.BASE_URL}${m.thumb}` : imageUrl(m));
