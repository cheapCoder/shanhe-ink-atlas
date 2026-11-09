import { useEffect, useRef } from 'react';
import { MapEngine, type EnginePolicy } from './engine/MapEngine';
import { CINNABAR } from './engine/palette';
import { setMapEngine } from './mapBus';
import { useAtlas } from '@/store/useAtlas';
import { liveLabelEpoch, polityZh } from '@/data/polityNames';
import { LINEAGE_BY_ID } from '@/data/lineages';
import { familyColor, levelOf } from '@/modules/territory/lineage';
import { LINEAGES } from '@/data/lineages';
import { useHover } from '@/store/useHover';
import './mapView.css';

function highlightFor(lineageId: string | null, mode: string): EnginePolicy['highlight'] {
  const lineage = lineageId && mode === 'territory' ? LINEAGE_BY_ID.get(lineageId) : null;
  if (!lineage) return null;
  return (name, subj, year) => levelOf(lineage, name, subj, year);
}

export default function MapView() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { lineageId, mode } = useAtlas.getState();
    const engine = new MapEngine(
      ref.current!,
      { nameOf: polityZh, labelEpoch: liveLabelEpoch, preferredColor: familyColor, highlight: highlightFor(lineageId, mode), highlightColor: CINNABAR },
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
      if (s.lineageId !== prev.lineageId || s.mode !== prev.mode) engine.setPolicy({ highlight: highlightFor(s.lineageId, s.mode) });
    });
    return () => {
      unsub();
      setMapEngine(null);
      engine.destroy();
    };
  }, []);

  return <div className="map-view" ref={ref} />;
}
