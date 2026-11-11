// 地址栏状态：把当前所看的年份、模式与选中项写进地址的 # 片段，复制地址即可分享同一画面
import { useEffect } from 'react';
import { useAtlas, YEAR_MAX, YEAR_MIN } from '@/store/useAtlas';
import { EVENT_BY_ID } from '@/data/events';
import { FIGURE_BY_ID } from '@/data/figures';
import { LINEAGE_BY_ID } from '@/data/lineages';
import type { Mode } from '@/types';
import { getMapEngine } from '@/modules/map_view/mapBus';

const MODES: Mode[] = ['overview', 'territory', 'figure', 'events'];

interface Link {
  mode?: Mode;
  year?: number;
  event?: string;
  figure?: string;
  step?: number;
  lineage?: string;
}

function parse(hash: string): Link {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  const link: Link = {};
  const mode = p.get('m') as Mode | null;
  if (mode && MODES.includes(mode)) link.mode = mode;
  const year = Number(p.get('y'));
  if (p.has('y') && Number.isFinite(year) && year >= YEAR_MIN && year <= YEAR_MAX) link.year = year;
  const event = p.get('e');
  if (event && EVENT_BY_ID.has(event)) link.event = event;
  const figure = p.get('f');
  if (figure && FIGURE_BY_ID.has(figure)) link.figure = figure;
  const step = Number(p.get('s'));
  if (p.has('s') && Number.isInteger(step) && step >= 0) link.step = step;
  const lineage = p.get('l');
  if (lineage && LINEAGE_BY_ID.has(lineage)) link.lineage = lineage;
  return link;
}

const initial = parse(location.hash);

export const hasDeepLink = () => Object.keys(initial).length > 0;

function apply(link: Link) {
  const s = useAtlas.getState();
  const engine = getMapEngine();
  const mode = link.mode ?? (link.figure ? 'figure' : link.lineage ? 'territory' : 'overview');
  s.setMode(mode);
  if (mode === 'figure' && link.figure) {
    const f = FIGURE_BY_ID.get(link.figure)!;
    const step = Math.min(f.route.length - 1, link.step ?? 0);
    s.openFigure(f.id);
    s.setRouteStep(step);
    s.setYear(f.route[step].year);
    engine?.flyToBounds(f.route.map((w) => w.coord), 4.5, 1600);
  } else if (mode === 'territory' && link.lineage) {
    s.openLineage(link.lineage);
    if (link.year !== undefined) s.setYear(link.year);
  } else if (link.event) {
    const e = EVENT_BY_ID.get(link.event)!;
    s.openEvent(e.id);
    s.setYear(e.year);
    engine?.flyTo(e.coord, e.zoom ?? 3.2, 2000);
  } else if (link.year !== undefined) s.setYear(link.year);
}

function serialize(): string {
  const s = useAtlas.getState();
  const p = new URLSearchParams();
  if (s.mode !== 'overview') p.set('m', s.mode);
  if (s.mode === 'figure' && s.figureId) {
    p.set('f', s.figureId);
    const step = Math.round(s.routeStep);
    if (step > 0) p.set('s', String(step));
  } else if (s.mode === 'territory' && s.lineageId) {
    p.set('l', s.lineageId);
    p.set('y', String(Math.round(s.year)));
  } else if (s.eventId) p.set('e', s.eventId);
  else p.set('y', String(Math.round(s.year)));
  return p.toString();
}

// 展卷后套用链接里的画面；此后状态变化时（稍作节流）回写地址栏
export function useUrlState() {
  const started = useAtlas((s) => s.started);
  useEffect(() => {
    if (!started) return;
    if (hasDeepLink()) apply(initial);
    let timer = 0;
    const write = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const hash = serialize();
        if (`#${hash}` !== location.hash) history.replaceState(null, '', `${location.pathname}${location.search}#${hash}`);
      }, 400);
    };
    const unsub = useAtlas.subscribe((s, prev) => {
      if (s.playing && s.holdUntil === null) return;
      if (s.mode !== prev.mode || s.eventId !== prev.eventId || s.figureId !== prev.figureId || s.lineageId !== prev.lineageId || Math.round(s.year) !== Math.round(prev.year) || Math.round(s.routeStep) !== Math.round(prev.routeStep) || s.playing !== prev.playing) write();
    });
    const onHash = () => apply(parse(location.hash));
    window.addEventListener('hashchange', onHash);
    return () => {
      unsub();
      window.clearTimeout(timer);
      window.removeEventListener('hashchange', onHash);
    };
  }, [started]);
}
