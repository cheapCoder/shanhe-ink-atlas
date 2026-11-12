import { useMemo, useState } from 'react';
import { t } from '@/locale';
import { useAtlas } from '@/store/useAtlas';
import { FIGURES } from '@/data/figures';
import { figureMedia, thumbUrl } from '@/data/media';
import { formatYearShort } from '@/utils/year';
import { getMapEngine } from '@/modules/map_view/mapBus';
import InkSprite from '@/modules/ink_sprites/InkSprite';
import './sidePanel.css';

const ALL = t('figure_all');

// 历史人物列表：按地区筛选，选中后镜头框住其一生行迹
export default function FigureList() {
  const figureId = useAtlas((s) => s.figureId);
  const { openFigure, setYear } = useAtlas.getState();
  const [region, setRegion] = useState(ALL);
  const regions = useMemo(() => [ALL, ...new Set(FIGURES.map((f) => f.region))], []);
  const list = region === ALL ? FIGURES : FIGURES.filter((f) => f.region === region);

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
      <div className="side-list__filters">
        {regions.map((r) => (
          <button key={r} className={r === region ? 'is-active' : ''} onClick={() => setRegion(r)}>
            {r}
          </button>
        ))}
      </div>
      <ul className="figure-list">
        {list.map((f) => {
          const img = thumbUrl(figureMedia(f.id));
          return (
            <li key={f.id}>
              <button className={`figure-list__item${f.id === figureId ? ' is-active' : ''}`} onClick={() => choose(f.id)}>
                <span className="figure-list__avatar">{img ? <img src={img} alt="" loading="lazy" /> : <InkSprite kind={f.sprite} size={40} />}</span>
                <span className="figure-list__name">{f.name}</span>
                <span className="figure-list__meta">
                  {f.approx ? t('year_approx') : ''}
                  {formatYearShort(f.birth)}—{formatYearShort(f.death)} · {f.title}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
