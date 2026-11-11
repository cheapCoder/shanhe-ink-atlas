import { useMemo, useState } from 'react';
import { t, tf, tx, type LocaleKey } from '@/locale';
import type { Region } from '@/types';
import { useAtlas } from '@/store/useAtlas';
import { FIGURES } from '@/data/figures';
import { figureMedia, thumbUrl } from '@/data/media';
import { formatYearShort } from '@/utils/year';
import { getMapEngine } from '@/modules/map_view/mapBus';
import InkSprite from '@/modules/ink_sprites/InkSprite';
import './sidePanel.css';

const REGIONS: { id: Region; key: LocaleKey }[] = [
  { id: 'china', key: 'region_china' },
  { id: 'east-asia', key: 'region_east_asia' },
  { id: 'south-asia', key: 'region_south_asia' },
  { id: 'central-asia', key: 'region_central_asia' },
  { id: 'west-asia', key: 'region_west_asia' },
  { id: 'europe', key: 'region_europe' },
  { id: 'africa', key: 'region_africa' },
  { id: 'americas', key: 'region_americas' },
];

// 历史人物列表：按地区筛选或按名字检索，选中后镜头框住其一生行迹
export default function FigureList() {
  const figureId = useAtlas((s) => s.figureId);
  const { openFigure, setYear } = useAtlas.getState();
  const [region, setRegion] = useState<Region | null>(null);
  const [query, setQuery] = useState('');
  const regions = useMemo(() => REGIONS.filter((r) => FIGURES.some((f) => f.region === r.id)), []);
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FIGURES.filter((f) => (!region || f.region === region) && (!q || f.name.zh.toLowerCase().includes(q) || f.name.en.toLowerCase().includes(q) || f.title.zh.includes(q) || f.title.en.toLowerCase().includes(q)));
  }, [region, query]);

  const choose = (id: string) => {
    const f = FIGURES.find((x) => x.id === id)!;
    openFigure(id);
    setYear(f.route[0].year);
    getMapEngine()?.flyToBounds(
      f.route.map((w) => w.coord),
      4.5,
      1600,
    );
  };

  return (
    <section className="side-list">
      <h2 className="panel-section side-list__title">
        {t('figure_list')}
        <span className="side-list__count">{list.length}</span>
      </h2>
      <input className="side-list__search" type="search" placeholder={t('figure_search')} value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="side-list__filters">
        <button className={region === null ? 'is-active' : ''} onClick={() => setRegion(null)}>
          {t('figure_all')}
        </button>
        {regions.map((r) => (
          <button key={r.id} className={r.id === region ? 'is-active' : ''} onClick={() => setRegion(r.id)}>
            {t(r.key)}
          </button>
        ))}
      </div>
      {list.length === 0 && <p className="side-list__empty">{t('events_empty')}</p>}
      <ul className="figure-list">
        {list.map((f) => {
          const img = thumbUrl(figureMedia(f.id));
          return (
            <li key={f.id}>
              <button className={`figure-list__item${f.id === figureId ? ' is-active' : ''}`} onClick={() => choose(f.id)}>
                <span className="figure-list__avatar">{img ? <img src={img} alt="" loading="lazy" /> : <InkSprite kind={f.sprite} size={40} />}</span>
                <span className="figure-list__name">{tx(f.name)}</span>
                <span className="figure-list__meta">
                  {f.approx ? t('year_approx') : ''}
                  {formatYearShort(f.birth)}—{formatYearShort(f.death)} · {tx(f.title)} · {tf('figure_stops', { n: f.route.length })}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
