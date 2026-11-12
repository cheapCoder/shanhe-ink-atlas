import { t } from '@/locale';
import type { HistoryEvent } from '@/types';
import { useAtlas } from '@/store/useAtlas';
import { EVENTS } from '@/data/events';
import { FIGURE_BY_ID } from '@/data/figures';
import { eventMedia, figureMedia, imageUrl, thumbUrl } from '@/data/media';
import { formatDate, formatRange, formatYear } from '@/utils/year';
import { CATEGORY_BY_ID } from '@/modules/common/categories';
import { presentEvent } from '@/modules/playback/usePlayback';
import InkSprite from '@/modules/ink_sprites/InkSprite';
import SourceLinks from './SourceLinks';
import TourHold from './TourHold';
import './detailPanel.css';

const ORDERED = [...EVENTS].sort((a, b) => a.year - b.year);

function dateLine(e: HistoryEvent) {
  const when = e.endYear ? formatRange(e.year, e.endYear) : formatYear(e.year);
  const day = e.date && !e.endYear ? formatDate(e.date) : '';
  return `${e.approx ? t('year_approx') : ''}${when}${day}`;
}

// 大事详情：动画题图、纪年地点、配图、讲解、相关人物与参考资料
export default function EventCard({ event }: { event: HistoryEvent }) {
  const openFigure = useAtlas((s) => s.openFigure);
  const setMode = useAtlas((s) => s.setMode);
  const media = eventMedia(event.id);
  const img = imageUrl(media);
  const cat = CATEGORY_BY_ID.get(event.category);
  const i = ORDERED.findIndex((e) => e.id === event.id);
  const prev = ORDERED[i - 1];
  const next = ORDERED[i + 1];

  return (
    <article className="event-card">
      <div className="event-card__hero">
        <InkSprite kind={event.sprite} size={150} />
      </div>
      <header className="event-card__head">
        {cat && <span className="event-card__cat seal">{t(cat.glyph)}</span>}
        <div>
          <h2 className="panel-title">{event.title}</h2>
          <p className="panel-subtitle">{event.titleEn}</p>
        </div>
      </header>
      <p className="panel-meta">
        <span>
          {t('panel_time')} <b>{dateLine(event)}</b>
        </span>
        <span>
          {t('panel_place')} <b>{event.place}</b>
        </span>
        {cat && <span>{t(cat.key)}</span>}
      </p>
      {img && (
        <figure className="panel-figure">
          <img src={img} alt={event.title} loading="lazy" width={media?.width} height={media?.height} />
          <figcaption>
            {t('panel_image')}：{media?.credit || t('panel_anonymous')} · {media?.license}
            {media?.filePage && (
              <>
                {' · '}
                <a href={media.filePage} target="_blank" rel="noreferrer">
                  Wikimedia Commons
                </a>
              </>
            )}
          </figcaption>
        </figure>
      )}
      <p className="panel-text">{event.summary}</p>
      <TourHold />

      {event.figures && event.figures.length > 0 && (
        <>
          <h3 className="panel-section">{t('panel_figures')}</h3>
          <div className="event-card__figures">
            {event.figures.map((id) => {
              const f = FIGURE_BY_ID.get(id);
              if (!f) return null;
              const thumb = thumbUrl(figureMedia(id));
              return (
                <button
                  key={id}
                  className="chip"
                  onClick={() => {
                    setMode('figure');
                    openFigure(id);
                  }}
                >
                  {thumb ? <img src={thumb} alt="" /> : <i />}
                  {f.name}
                </button>
              );
            })}
          </div>
        </>
      )}

      <h3 className="panel-section">{t('panel_sources')}</h3>
      <SourceLinks media={media} />

      <nav className="event-card__nav">
        <button className="ink-button ink-button--ghost" disabled={!prev} onClick={() => prev && presentEvent(prev, false)}>
          ‹ {prev ? prev.title : ''}
        </button>
        <button className="ink-button ink-button--ghost" disabled={!next} onClick={() => next && presentEvent(next, false)}>
          {next ? next.title : ''} ›
        </button>
      </nav>
    </article>
  );
}
