import { useEffect, useRef } from 'react';
import { getLang, t, tf, tx } from '@/locale';
import type { Figure, Waypoint } from '@/types';
import { useAtlas } from '@/store/useAtlas';
import { figureMedia, imageUrl, waypointMedia, wikiLinks } from '@/data/media';
import { formatRange, formatYearShort } from '@/utils/year';
import { frameLeg, presentEvent } from '@/modules/playback/usePlayback';
import InkSprite from '@/modules/ink_sprites/InkSprite';
import ImageCredit from './ImageCredit';
import SourceLinks from './SourceLinks';
import TourHold from './TourHold';
import './detailPanel.css';

// 当前站点的讲解：两三句经过、配图（站点条目或所关联大事的配图）、相关大事与延伸阅读
function StationDetail({ point }: { point: Waypoint }) {
  const { media, event } = waypointMedia(point);
  const img = imageUrl(media);
  const links = wikiLinks(point.wiki);
  const more = getLang() === 'zh' ? links.zh : links.en;
  const setMode = useAtlas((s) => s.setMode);
  if (!point.detail && !img && !event && !more) return null;
  return (
    <div className="station">
      {point.detail && <p className="station__text">{tx(point.detail)}</p>}
      {img && (
        <figure className="panel-figure station__figure">
          <img src={img} alt={tx(point.place)} loading="lazy" width={media?.width} height={media?.height} />
          <ImageCredit media={media} />
        </figure>
      )}
      {(event || more) && (
        <p className="station__links">
          {event && (
            <button
              className="chip station__event"
              onClick={() => {
                setMode('events');
                presentEvent(event, false);
              }}
            >
              <i className="seal station__seal">事</i>
              {t('figure_event')}: {tx(event.title)}
            </button>
          )}
          {more && (
            <a href={more} target="_blank" rel="noreferrer">
              {t('figure_more')} ↗
            </a>
          )}
        </p>
      )}
      <TourHold />
    </div>
  );
}

// 人物详情：画像、生卒身份、生平讲解与可逐站点播的行迹列表
export default function FigureCard({ figure }: { figure: Figure }) {
  const routeStep = useAtlas((s) => s.routeStep);
  const playing = useAtlas((s) => s.playing);
  const { setRouteStep, setYear, setPlaying } = useAtlas.getState();
  const list = useRef<HTMLOListElement>(null);
  const media = figureMedia(figure.id);
  const img = imageUrl(media);
  const last = figure.route.length - 1;
  const current = Math.min(last, Math.floor(routeStep + 1e-6));
  const other = getLang() === 'zh' ? figure.name.en : figure.name.zh;

  useEffect(() => {
    // 当前站点连同它的讲解滚到面板上方，前一站还露出一点
    list.current?.querySelector('.is-current')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [current]);

  const jump = (i: number) => {
    const at = Math.min(last, Math.max(0, i));
    setPlaying(false);
    setRouteStep(at);
    setYear(figure.route[at].year);
    frameLeg(figure.id, at);
  };

  const play = () => {
    if (playing) return setPlaying(false);
    if (current >= last) jump(0);
    frameLeg(figure.id, Math.floor(useAtlas.getState().routeStep));
    setPlaying(true);
  };

  return (
    <article className="figure-card">
      <header className="figure-card__head">
        <div className="figure-card__portrait">{img ? <img src={img} alt={tx(figure.name)} /> : <InkSprite kind={figure.sprite} size={84} />}</div>
        <div>
          <h2 className="panel-title">{tx(figure.name)}</h2>
          <p className="panel-subtitle">{other}</p>
        </div>
      </header>
      <p className="panel-meta">
        <span>
          {t('figure_life')} <b>{`${figure.approx ? t('year_approx') : ''}${formatRange(figure.birth, figure.death)}`}</b>
        </span>
        <span>
          {t('figure_identity')} <b>{tx(figure.title)}</b>
        </span>
      </p>
      <p className="panel-text">{tx(figure.summary)}</p>
      {media?.credit && (
        <p className="figure-card__credit">
          {t('panel_image')}: {media.credit} · {media.license}
        </p>
      )}

      <h3 className="panel-section figure-card__bar">
        {t('figure_route')}
        <span className="figure-card__count latin">{tf('figure_step', { i: current + 1, n: figure.route.length })}</span>
      </h3>
      <div className="figure-card__controls">
        <button className="ink-button ink-button--ghost" onClick={() => jump(current - 1)} disabled={current <= 0} title={t('figure_prev')} aria-label={t('figure_prev')}>
          ‹
        </button>
        <button className="ink-button figure-card__play" onClick={play}>
          {playing ? t('timeline_pause') : t('figure_play')}
        </button>
        <button className="ink-button ink-button--ghost" onClick={() => jump(current + 1)} disabled={current >= last} title={t('figure_next')} aria-label={t('figure_next')}>
          ›
        </button>
      </div>
      <ol className="figure-card__route" ref={list}>
        {figure.route.map((w, i) => (
          <li key={i} className={`${i === current ? 'is-current' : ''}${i < current ? ' is-past' : ''}`}>
            <button onClick={() => jump(i)} aria-current={i === current ? 'step' : undefined}>
              <span className="figure-card__year latin">{formatYearShort(w.year)}</span>
              <span className="figure-card__place">{tx(w.place)}</span>
              <span className="figure-card__note">{tx(w.note)}</span>
            </button>
            {i === current && <StationDetail point={w} />}
          </li>
        ))}
      </ol>

      <h3 className="panel-section">{t('panel_sources')}</h3>
      <SourceLinks wiki={figure.wiki} media={media} />
    </article>
  );
}
