import { useMemo } from 'react';
import { t } from '@/locale';
import type { Lineage } from '@/types';
import { useAtlas } from '@/store/useAtlas';
import { formatYear } from '@/utils/year';
import { useEngine, useSnapshotMeta } from '@/modules/map_view/useMapState';
import AreaChart from './AreaChart';
import { areaSeries } from './lineage';
import './territory.css';

const wan = (km2: number) => (km2 / 10000).toFixed(km2 >= 1e6 ? 0 : 1);

// 疆域详情：面积曲线、当前时期与逐期列表（列表同时充当图表的表格视图）
export default function CountryCard({ lineage }: { lineage: Lineage }) {
  const engine = useEngine();
  const snap = useSnapshotMeta();
  const playing = useAtlas((s) => s.playing);
  const { setYear, setPlaying, setPeriodStep } = useAtlas.getState();

  const points = useMemo(() => {
    const years = engine?.store.list.map((m) => m.year) ?? [];
    return engine ? areaSeries(lineage, engine.store.areas, years) : [];
  }, [engine, lineage, snap]);

  const currentIndex = points.findIndex((p) => p.year === snap?.year);
  const current = currentIndex >= 0 ? points[currentIndex] : null;

  const pick = (year: number) => {
    setPlaying(false);
    setPeriodStep(Math.max(0, points.findIndex((p) => p.year === year)));
    setYear(year);
  };

  const play = () => {
    if (playing) return setPlaying(false);
    const start = currentIndex >= 0 && currentIndex < points.length - 1 ? currentIndex : 0;
    setPeriodStep(start);
    setYear(points[start].year);
    setPlaying(true);
  };

  return (
    <article className="country-card">
      <h2 className="panel-title">{lineage.name}</h2>
      <p className="panel-subtitle">{lineage.nameEn}</p>
      {lineage.note && <p className="panel-text country-card__note">{lineage.note}</p>}

      <h3 className="panel-section">
        {t('country_area')}
        <span className="country-card__unit">{t('country_unit')}</span>
      </h3>
      {points.length > 0 ? <AreaChart points={points} current={snap?.year ?? null} onPick={pick} /> : <p className="panel-text">{t('country_none')}</p>}

      <div className="country-card__now">
        {current ? (
          <>
            <span className="seal country-card__now-seal">{t('country_period')}</span>
            <b>{current.label}</b>
            <span>{formatYear(current.year)}</span>
            <span>
              {wan(current.core)} {t('country_unit')}
            </span>
          </>
        ) : (
          <span>{t('country_none')}</span>
        )}
      </div>
      <button className="ink-button country-card__play" onClick={play} disabled={points.length < 2}>
        {playing ? t('timeline_pause') : t('country_play')}
      </button>

      <ol className="country-card__periods">
        {points.map((p, i) => (
          <li key={p.year} className={i === currentIndex ? 'is-current' : ''}>
            <button onClick={() => pick(p.year)}>
              <span className="latin">{formatYear(p.year, false)}</span>
              <span>{p.label}</span>
              <span className="country-card__area">{wan(p.core)}</span>
            </button>
          </li>
        ))}
      </ol>
    </article>
  );
}
