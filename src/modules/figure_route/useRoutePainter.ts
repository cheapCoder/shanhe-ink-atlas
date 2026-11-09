import { useEffect } from 'react';
import { useAtlas } from '@/store/useAtlas';
import { FIGURE_BY_ID } from '@/data/figures';
import { useEngine } from '@/modules/map_view/useMapState';
import { makeRoutePainter } from './routePainter';

// 人物模式下把路线画笔挂到地图特效层
export function useRoutePainter() {
  const engine = useEngine();
  const mode = useAtlas((s) => s.mode);
  const figureId = useAtlas((s) => s.figureId);
  useEffect(() => {
    const figure = mode === 'figure' && figureId ? FIGURE_BY_ID.get(figureId) : null;
    if (!engine || !figure) return;
    return engine.addPainter(makeRoutePainter(figure));
  }, [engine, mode, figureId]);
}
