// 播放驱动：纵览按卷面匀速推进并在大事处停驻；人物沿路线逐段行进；疆域逐代切换
import { useEffect } from 'react';
import { useAtlas, type Speed, type TourDepth } from '@/store/useAtlas';
import { getLang, tx } from '@/locale';
import { EVENTS } from '@/data/events';
import { FIGURE_BY_ID } from '@/data/figures';
import { LINEAGE_BY_ID } from '@/data/lineages';
import type { HistoryEvent, Text, Waypoint } from '@/types';
import { getMapEngine } from '@/modules/map_view/mapBus';
import { FULL_RUN_SECONDS, tToYear, yearToT } from '@/modules/time_line/timeScale';
import { lineagePeriods } from '@/modules/territory/lineage';
import { haversineKm, legLonLats } from '@/modules/figure_route/geometry';
import { playChime } from '@/modules/sound/useAmbience';

type State = ReturnType<typeof useAtlas.getState>;

// EVENTS 已按年份与日期排好
const TOUR_EVENTS = EVENTS.map((e) => ({ e, t: yearToT(e.year) }));
const presented = new Set<string>();

// 导览详略对应的最低重要度
export const minImportance = (depth: TourDepth) => 4 - depth;

// 读完一段文字大约要多少秒：中文按每秒 7.5 字，英文按每秒 3.6 词
function readSeconds(text: Text | undefined): number {
  const s = tx(text);
  if (!s) return 0;
  return getLang() === 'zh' ? [...s].length / 7.5 : s.trim().split(/\s+/).length / 3.6;
}

const paceOf = (speed: Speed) => (speed === 0.5 ? 1.35 : speed === 2 ? 0.7 : 1);

// 大事的停驻时长：镜头飞抵约两秒，加上读完讲解所需的时间，篇幅越长停得越久
export function dwellMs(e: HistoryEvent, speed: Speed): number {
  return Math.min(26, Math.max(7, (4.5 + readSeconds(e.summary)) * paceOf(speed))) * 1000;
}

// 行迹站点的停留时长：同样随讲解篇幅伸缩
function stationMs(w: Waypoint, speed: Speed): number {
  return Math.min(14, Math.max(2.2, (1.6 + readSeconds(w.detail)) * paceOf(speed))) * 1000;
}

// 某一档导览会停驻多少则大事、走完全卷大约多少分钟
export function tourStats(depth: TourDepth, speed: Speed): { count: number; minutes: number } {
  const list = EVENTS.filter((e) => e.importance >= minImportance(depth));
  const hold = list.reduce((sum, e) => sum + dwellMs(e, speed) / 1000, 0);
  return { count: list.length, minutes: Math.round((FULL_RUN_SECONDS / speed + hold) / 60) };
}

export function presentEvent(e: HistoryEvent, hold: boolean) {
  const s = useAtlas.getState();
  s.openEvent(e.id);
  s.setYear(e.year);
  presented.add(e.id);
  getMapEngine()?.flyTo(e.coord, e.zoom ?? 3.2, 2000);
  if (hold) {
    s.setHold(performance.now() + dwellMs(e, s.speed));
    playChime();
  }
}

const nextStop = (s: State, from: number, to: number) =>
  TOUR_EVENTS.find(({ e, t }) => t >= from && t <= to && e.importance >= minImportance(s.tourDepth) && !presented.has(e.id));

function stepOverview(s: State, dt: number) {
  const t0 = yearToT(s.year);
  const t1 = Math.min(1, t0 + (dt * s.speed) / FULL_RUN_SECONDS);
  if (s.tour) {
    const hit = nextStop(s, t0, t1);
    if (hit) {
      presentEvent(hit.e, true);
      return;
    }
  }
  s.setYear(tToYear(t1));
  if (t1 >= 1) s.setPlaying(false);
}

// 停驻结束：下一则大事若近在眼前（两秒多的卷面路程以内），不必先退回全图，届时直接从此处飞过去
const CHAIN_SECONDS = 2.4;

function leaveEvent(s: State) {
  const t0 = yearToT(s.year);
  const ahead = (CHAIN_SECONDS * s.speed) / FULL_RUN_SECONDS;
  if (s.tour && nextStop(s, t0, t0 + ahead)) return;
  getMapEngine()?.resetView(2600);
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
    s.setHold(now + stationMs(b, s.speed));
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
      const elapsed = now - last;
      const dt = Math.min(0.1, elapsed / 1000);
      last = now;
      const s = useAtlas.getState();

      // 用户向前拖动时间轴后，允许已讲解过的大事再次停驻

      if (s.year < lastYear - 1) presented.clear();
      lastYear = s.year;
      if (!s.playing) return;
      if (s.holdUntil !== null) {
        // 读者正在看详情卡：停驻顺延，不催着往前走

        if (s.holdPaused) return s.shiftHold(elapsed);
        if (now < s.holdUntil) return;
        s.setHold(null);
        if (s.mode === 'overview') leaveEvent(s);
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
