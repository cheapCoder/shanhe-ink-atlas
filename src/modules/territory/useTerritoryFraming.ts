import { useEffect } from 'react';
import { useAtlas } from '@/store/useAtlas';
import { useEngine } from '@/modules/map_view/useMapState';

// 疆域模式下每换一张切片，自动把镜头框到该国当期的疆域范围
export function useTerritoryFraming() {
  const engine = useEngine();
  const mode = useAtlas((s) => s.mode);
  const lineageId = useAtlas((s) => s.lineageId);

  useEffect(() => {
    if (!engine || mode !== 'territory' || !lineageId) return;
    let timer = 0;
    const frame = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const box = engine.highlightBounds();
        if (box) engine.flyToBox(box, 4.5, 1500);
      }, 40);
    };
    const unsub = engine.subscribeSnapshot(frame);
    return () => {
      unsub();
      window.clearTimeout(timer);
    };
  }, [engine, mode, lineageId]);
}
