import { getLang, t, tx } from '@/locale';
import type { HistoryEvent } from '@/types';
import { useAtlas } from '@/store/useAtlas';
import { EVENTS } from '@/data/events';
import { FIGURE_BY_ID } from '@/data/figures';
import { eventMedia, figureMedia, imageUrl, thumbUrl } from '@/data/media';
import { formatDated, formatRange } from '@/utils/year';
import { CATEGORY_BY_ID } from '@/modules/common/categories';
import { presentEvent } from '@/modules/playback/usePlayback';
import InkSprite from '@/modules/ink_sprites/InkSprite';
import ImageCredit from './ImageCredit';
import SourceLinks from './SourceLinks';
import TourHold from './TourHold';
import './detailPanel.css';

function dateLine(e: HistoryEvent) {
  const when = e.endYear ? formatRange(e.year, e.endYear) : formatDated(e.year, e.date);
  return `${e.approx ? t('year_approx') : ''}${when}`;
}

// 大事详情：动画题图、纪年地点、配图、讲解、相关人物与参考资料
export default function EventCard({ event }: { event: HistoryEvent }) {
  const openFigure = useAtlas((s) => s.openFigure);
  const setMode = useAtlas((s) => s.setMode);
  const media = eventMedia(event.id);
  const img = imageUrl(media);
  const cat = CATEGORY_BY_ID.get(event.category);
  const i = EVENTS.indexOf(event);
  const prev = EVENTS[i - 1];
  const next = EVENTS[i + 1];
  const other = getLang() === 'zh' ? event.title.en : event.title.zh;

  return (
    <article className="event-card">
      <div className="event-card__hero">
        <InkSprite kind={event.sprite} size={150} />
      </div>
      <header className="event-card__head">
        {cat && (
          <span className="event-card__cat seal" title={t(cat.key)}>
            {t(cat.glyph)}
          </span>
        )}
        <div>
          <h2 className="panel-title">{tx(event.title)}</h2>
          <p className="panel-subtitle">{other}</p>
        </div>
      </header>
      <p className="panel-meta">
        <span>
          {t('panel_time')} <b>{dateLine(event)}</b>
        </span>
        <span>
          {t('panel_place')} <b>{tx(event.place)}</b>
        </span>
        {cat && <span>{t(cat.key)}</span>}
      </p>
      {img && (
        <figure className="panel-figure">
          <img src={img} alt={tx(event.title)} loading="lazy" width={media?.width} height={media?.height} />
          <ImageCredit media={media} />
        </figure>
      )}
      <p className="panel-text">{tx(event.summary)}</p>
      <TourHold />

      {event.figures && event.figures.some((id) => FIGURE_BY_ID.has(id)) && (
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
                  {tx(f.name)}
                </button>
              );
            })}
          </div>
        </>
      )}

      <h3 className="panel-section">{t('panel_sources')}</h3>
      <SourceLinks wiki={event.wiki} media={media} />

      <nav className="event-card__nav">
        <button className="ink-button ink-button--ghost" disabled={!prev} onClick={() => prev && presentEvent(prev, false)}>
          ‹ {prev ? tx(prev.title) : ''}
        </button>
        <button className="ink-button ink-button--ghost" disabled={!next} onClick={() => next && presentEvent(next, false)}>
          {next ? tx(next.title) : ''} ›
        </button>
      </nav>
    </article>
  );
}
