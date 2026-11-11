import { useEffect, useRef } from 'react';
import type { Lang } from '@/types';
import { MapEngine, type EnginePolicy } from './engine/MapEngine';
import { CINNABAR } from './engine/palette';
import { setMapEngine } from './mapBus';
import { useAtlas } from '@/store/useAtlas';
import { useLocale } from '@/locale';
import { liveLabelEpoch, polityLabel } from '@/data/polityNames';
import { RIVER_EN, SEA_LABEL_EN } from '@/data/geoNames';
import { LINEAGES, LINEAGE_BY_ID } from '@/data/lineages';
import { levelOf } from '@/modules/territory/lineage';
import { useHover } from '@/store/useHover';
import './mapView.css';

function highlightFor(lineageId: string | null, mode: string): Pick<EnginePolicy, 'highlight' | 'highlightKey'> {
  const lineage = lineageId && mode === 'territory' ? LINEAGE_BY_ID.get(lineageId) : null;
  if (!lineage) return { highlight: null, highlightKey: null };
  return { highlight: (name, subj, year) => levelOf(lineage, name, subj, year), highlightKey: lineage.id };
}

// 标注随界面语言：政权名、河流与岛礁地名
const namingFor = (lang: Lang): Pick<EnginePolicy, 'lang' | 'nameOf' | 'placeName'> => ({
  lang,
  nameOf: (name, snapshotYear, year) => polityLabel(lang, name, snapshotYear, year),
  placeName: (zh) => (lang === 'zh' ? zh : (RIVER_EN[zh] ?? SEA_LABEL_EN[zh] ?? null)),
});

export default function MapView() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { lineageId, mode } = useAtlas.getState();
    const engine = new MapEngine(
      ref.current!,
      { ...namingFor(useLocale.getState().lang), labelEpoch: liveLabelEpoch, ...highlightFor(lineageId, mode), highlightColor: CINNABAR },
      {
        onHover: (p, meta, [x, y]) =>
          useHover.getState().setHover(
            p && meta ? { name: p.name, subj: p.subj, area: p.area, prec: p.prec, fixed: p.fixed, snapshot: meta.year, synthetic: meta.synthetic, x, y } : null,
          ),
        onClick: (p) => {
          const s = useAtlas.getState();
          const year = engine.snapshot?.meta.year;
          if (!p || year === undefined || s.mode !== 'territory') return;
          const hit = LINEAGES.find((l) => levelOf(l, p.name, p.subj, year) === 1);
          if (hit) s.openLineage(hit.id);
        },
      },
    );
    setMapEngine(engine);
    if (import.meta.env.DEV) Object.assign(window, { __atlas: { engine, store: useAtlas } });
    void engine.init().then(async () => {
      await engine.setYear(useAtlas.getState().year, true);
      useAtlas.getState().setReady(true);
    });
    const unsub = useAtlas.subscribe((s, prev) => {
      if (s.year !== prev.year) void engine.setYear(s.year);
      if (s.lineageId !== prev.lineageId || s.mode !== prev.mode) engine.setPolicy(highlightFor(s.lineageId, s.mode));
    });
    const unsubLang = useLocale.subscribe((s, prev) => {
      if (s.lang !== prev.lang) engine.setPolicy(namingFor(s.lang));
    });
    return () => {
      unsub();
      unsubLang();
      setMapEngine(null);
      engine.destroy();
    };
  }, []);

  return <div className="map-view" ref={ref} />;
}
