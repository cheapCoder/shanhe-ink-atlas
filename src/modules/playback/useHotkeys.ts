import { useEffect } from 'react';
import { useAtlas } from '@/store/useAtlas';
import { EVENTS } from '@/data/events';
import { FIGURE_BY_ID } from '@/data/figures';
import { LINEAGE_BY_ID } from '@/data/lineages';
import { getMapEngine } from '@/modules/map_view/mapBus';
import { lineagePeriods } from '@/modules/territory/lineage';
import { frameLeg, presentEvent } from './usePlayback';

const ORDERED = [...EVENTS].sort((a, b) => a.year - b.year);

// 按模式前后切换：大事、人物行迹站点或疆域时期
function step(dir: 1 | -1) {
  const s = useAtlas.getState();
  s.setPlaying(false);
  if (s.mode === 'figure' && s.figureId) {
    const f = FIGURE_BY_ID.get(s.figureId)!;
    const i = Math.min(f.route.length - 1, Math.max(0, Math.round(s.routeStep) + dir));
    s.setRouteStep(i);
    s.setYear(f.route[i].year);
    frameLeg(f.id, i);
    return;
  }
  if (s.mode === 'territory' && s.lineageId) {
    const periods = lineagePeriods(LINEAGE_BY_ID.get(s.lineageId)!, getMapEngine()?.store.list.map((m) => m.year) ?? []);
    const i = Math.min(periods.length - 1, Math.max(0, s.periodStep + dir));
    s.setPeriodStep(i);
    s.setYear(periods[i]);
    return;
  }
  const cur = s.eventId ? ORDERED.findIndex((e) => e.id === s.eventId) : -1;
  const next = cur >= 0 ? ORDERED[cur + dir] : dir > 0 ? ORDERED.find((e) => e.year > s.year) : [...ORDERED].reverse().find((e) => e.year < s.year);
  if (next) presentEvent(next, false);
}

// 键盘：空格播放/暂停，左右方向键切换，Esc 收起详情
export function useHotkeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select')) return;
      const s = useAtlas.getState();
      if (!s.started) return;
      if (e.code === 'Space') {
        e.preventDefault();
        s.togglePlay();
      } else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'Escape') {
        if (s.notesOpen) s.setNotesOpen(false);
        else s.openEvent(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
