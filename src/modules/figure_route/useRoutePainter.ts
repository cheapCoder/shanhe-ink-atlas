import { useEffect } from 'react';
import { useAtlas } from '@/store/useAtlas';
import { useLocale } from '@/locale';
import { FIGURE_BY_ID } from '@/data/figures';
import { useEngine } from '@/modules/map_view/useMapState';
import { makeRoutePainter } from './routePainter';

// 人物模式下把路线画笔挂到地图特效层
export function useRoutePainter() {
  const engine = useEngine();
  const mode = useAtlas((s) => s.mode);
  const figureId = useAtlas((s) => s.figureId);
  // 地名随语言：切换语言后画笔自然读到新的文案，这里订阅只为触发一次重绘
  const lang = useLocale((s) => s.lang);
  useEffect(() => {
    const figure = mode === 'figure' && figureId ? FIGURE_BY_ID.get(figureId) : null;
    if (!engine || !figure) return;
    return engine.addPainter(makeRoutePainter(figure));
  }, [engine, mode, figureId, lang]);
}
