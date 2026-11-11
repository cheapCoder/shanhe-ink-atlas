import { t, tx } from '@/locale';
import { useAtlas } from '@/store/useAtlas';
import { LINEAGES } from '@/data/lineages';
import { formatYearShort } from '@/utils/year';
import { useEngine } from '@/modules/map_view/useMapState';
import { areaSeries, levelOf, lineageSpan } from './lineage';
import './territory.css';

// 国家与文明列表：选中后跳到该国疆域极盛的时期
export default function CountryList() {
  const lineageId = useAtlas((s) => s.lineageId);
  const { openLineage, setYear } = useAtlas.getState();
  const engine = useEngine();

  const peakYear = (id: string): number | null => {
    const l = LINEAGES.find((x) => x.id === id)!;
    const pts = engine ? areaSeries(l, engine.store.areas, engine.store.list.map((m) => m.year)) : [];
    const peak = pts.reduce<(typeof pts)[number] | null>((a, b) => (!a || b.core > a.core ? b : a), null);
    return peak ? peak.year : null;
  };

  const choose = (id: string) => {
    openLineage(id);
    const year = peakYear(id);
    if (year !== null) setYear(year);
  };

  // 鼠标移到条目上就先备好那一年的切片，点下去时镜头可以立刻起飞
  const warm = (id: string) => {
    const year = peakYear(id);
    const l = LINEAGES.find((x) => x.id === id)!;
    if (year !== null) engine?.prefetchYear(year, { key: id, level: (name, subj, y) => levelOf(l, name, subj, y) });
  };

  return (
    <section className="country-list">
      <h2 className="panel-section country-list__title">{t('country_list')}</h2>
      <ul>
        {LINEAGES.map((l) => {
          const [from, to] = lineageSpan(l);
          return (
            <li key={l.id}>
              <button className={`country-list__item${l.id === lineageId ? ' is-active' : ''}`} onClick={() => choose(l.id)} onPointerEnter={() => warm(l.id)} onFocus={() => warm(l.id)}>
                <i style={{ background: l.color }} />
                <span className="country-list__name">{tx(l.name)}</span>
                <span className="country-list__span latin">
                  {formatYearShort(from)} — {to >= 2000 ? t('country_now') : formatYearShort(to)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
