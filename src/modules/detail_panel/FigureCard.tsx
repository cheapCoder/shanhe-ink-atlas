import { useEffect, useRef } from 'react';
import { t } from '@/locale';
import type { Figure } from '@/types';
import { useAtlas } from '@/store/useAtlas';
import { figureMedia, imageUrl } from '@/data/media';
import { formatRange, formatYearShort } from '@/utils/year';
import { frameLeg } from '@/modules/playback/usePlayback';
import InkSprite from '@/modules/ink_sprites/InkSprite';
import SourceLinks from './SourceLinks';
import './detailPanel.css';

// 人物详情：画像、生卒身份、生平讲解与可逐站点播的行迹列表
export default function FigureCard({ figure }: { figure: Figure }) {
  const routeStep = useAtlas((s) => s.routeStep);
  const playing = useAtlas((s) => s.playing);
  const { setRouteStep, setYear, setPlaying } = useAtlas.getState();
  const list = useRef<HTMLOListElement>(null);
  const media = figureMedia(figure.id);
  const img = imageUrl(media);
  const current = Math.min(figure.route.length - 1, Math.floor(routeStep + 1e-6));

  useEffect(() => {
    list.current?.querySelector('.is-current')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [current]);

  const jump = (i: number) => {
    setPlaying(false);
    setRouteStep(i);
    setYear(figure.route[i].year);
    frameLeg(figure.id, i);
  };

  const play = () => {
    if (playing) return setPlaying(false);
    if (current >= figure.route.length - 1) jump(0);
    frameLeg(figure.id, Math.floor(useAtlas.getState().routeStep));
    setPlaying(true);
  };

  return (
    <article className="figure-card">
      <header className="figure-card__head">
        <div className="figure-card__portrait">
          {img ? <img src={img} alt={figure.name} /> : <InkSprite kind={figure.sprite} size={84} />}
        </div>
        <div>
          <h2 className="panel-title">{figure.name}</h2>
          <p className="panel-subtitle">{figure.nameEn}</p>
        </div>
      </header>
      <p className="panel-meta">
        <span>
          {t('figure_life')} <b>{`${figure.approx ? t('year_approx') : ''}${formatRange(figure.birth, figure.death)}`}</b>
        </span>
        <span>
          {t('figure_identity')} <b>{figure.title}</b>
        </span>
        <span>{figure.region}</span>
      </p>
      <p className="panel-text">{figure.summary}</p>
      {media?.credit && (
        <p className="figure-card__credit">
          {t('panel_image')}：{media.credit} · {media.license}
        </p>
      )}

      <h3 className="panel-section">
        {t('figure_route')}
        <button className="ink-button figure-card__play" onClick={play}>
          {playing ? t('timeline_pause') : t('figure_play')}
        </button>
      </h3>
      <ol className="figure-card__route" ref={list}>
        {figure.route.map((w, i) => (
          <li key={i} className={`${i === current ? 'is-current' : ''}${i < current ? ' is-past' : ''}`}>
            <button onClick={() => jump(i)}>
              <span className="figure-card__year latin">{formatYearShort(w.year)}</span>
              <span className="figure-card__place">{w.place}</span>
              <span className="figure-card__note">{w.note}</span>
            </button>
          </li>
        ))}
      </ol>

      <h3 className="panel-section">{t('panel_sources')}</h3>
      <SourceLinks media={media} />
    </article>
  );
}
