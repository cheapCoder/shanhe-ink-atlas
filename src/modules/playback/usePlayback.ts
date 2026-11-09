// 播放驱动：纵览按卷面匀速推进并在大事处停驻；人物沿路线逐段行进；疆域逐代切换
import { useEffect } from 'react';
import { useAtlas, type Speed } from '@/store/useAtlas';
import { EVENTS } from '@/data/events';
import { FIGURE_BY_ID } from '@/data/figures';
import { LINEAGE_BY_ID } from '@/data/lineages';
import type { HistoryEvent, Waypoint } from '@/types';
import { getMapEngine } from '@/modules/map_view/mapBus';
import { FULL_RUN_SECONDS, tToYear, yearToT } from '@/modules/time_line/timeScale';
import { lineagePeriods } from '@/modules/territory/lineage';
import { haversineKm, legLonLats } from '@/modules/figure_route/geometry';

type State = ReturnType<typeof useAtlas.getState>;

const TOUR_EVENTS = EVENTS.map((e) => ({ e, t: yearToT(e.year) })).sort((a, b) => a.t - b.t);
const presented = new Set<string>();

const dwellMs = (speed: Speed) => (speed === 0.5 ? 16000 : speed === 1 ? 11000 : 7000);

export function presentEvent(e: HistoryEvent, hold: boolean) {
  const s = useAtlas.getState();
  s.openEvent(e.id);
  s.setYear(e.year);
  presented.add(e.id);
  getMapEngine()?.flyTo(e.coord, e.zoom ?? 3.2, 2000);
  if (hold) s.setHold(performance.now() + dwellMs(s.speed));
}

function stepOverview(s: State, dt: number) {
  const t0 = yearToT(s.year);
  const t1 = Math.min(1, t0 + (dt * s.speed) / FULL_RUN_SECONDS);
  if (s.tour) {
    const min = s.speed === 0.5 ? 2 : 3;
    const hit = TOUR_EVENTS.find(({ e, t }) => t >= t0 && t <= t1 && e.importance >= min && !presented.has(e.id));
    if (hit) {
      presentEvent(hit.e, true);
      return;
    }
  }
  s.setYear(tToYear(t1));
  if (t1 >= 1) s.setPlaying(false);
}

// 每段路程的时长：与距离相关，限制在 1.6—5 秒之间
const legSeconds = (a: Waypoint, b: Waypoint) => Math.min(5, Math.max(1.6, 1.3 + haversineKm(a.coord, b.coord) / 2200));

export function frameLeg(figureId: string, index: number) {
  const f = FIGURE_BY_ID.get(figureId);
  const a = f?.route[index];
  const b = f?.route[index + 1];
  if (!a) return;
  const pts = b ? legLonLats(a, b) : [a.coord];
  getMapEngine()?.flyToBounds(pts, b ? 5 : 4.5, 1500);
}

function stepRoute(s: State, dt: number, now: number) {
  const f = s.figureId ? FIGURE_BY_ID.get(s.figureId) : null;
  if (!f) return s.setPlaying(false);
  const i = Math.floor(s.routeStep);
  if (i >= f.route.length - 1) return s.setPlaying(false);
  const a = f.route[i];
  const b = f.route[i + 1];
  const next = Math.min(i + 1, s.routeStep + (dt * s.speed) / legSeconds(a, b));
  s.setRouteStep(next);
  s.setYear(a.year + (b.year - a.year) * (next - i));
  if (next >= i + 1) {
    s.setHold(now + 1900 / s.speed);
    frameLeg(f.id, i + 1);
  }
}

function stepPeriod(s: State, now: number) {
  const lineage = s.lineageId ? LINEAGE_BY_ID.get(s.lineageId) : null;
  const years = getMapEngine()?.store.list.map((m) => m.year) ?? [];
  if (!lineage) return s.setPlaying(false);
  const periods = lineagePeriods(lineage, years);
  const i = s.periodStep + 1;
  if (i >= periods.length) return s.setPlaying(false);
  s.setPeriodStep(i);
  s.setYear(periods[i]);
  s.setHold(now + 3000 / s.speed);
}

export function usePlayback() {
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastYear = useAtlas.getState().year;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const s = useAtlas.getState();

      // 用户向前拖动时间轴后，允许已讲解过的大事再次停驻

      if (s.year < lastYear - 1) presented.clear();
      lastYear = s.year;
      if (!s.playing) return;
      if (s.holdUntil !== null) {
        if (now < s.holdUntil) return;
        s.setHold(null);
        if (s.mode === 'overview') getMapEngine()?.resetView(2600);
        return;
      }
      if (s.mode === 'figure') stepRoute(s, dt, now);
      else if (s.mode === 'territory') stepPeriod(s, now);
      else stepOverview(s, dt);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
}
