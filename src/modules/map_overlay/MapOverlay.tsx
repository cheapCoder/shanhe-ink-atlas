import { useShallow } from 'zustand/react/shallow';
import type { HistoryEvent } from '@/types';
import { t } from '@/locale';
import { useAtlas } from '@/store/useAtlas';
import { EVENTS } from '@/data/events';
import { FIGURE_BY_ID } from '@/data/figures';
import { useMapView } from '@/modules/map_view/useMapState';
import { project, type View } from '@/modules/map_view/engine/projection';
import { yearToT } from '@/modules/time_line/timeScale';
import { CATEGORY_BY_ID } from '@/modules/common/categories';
import { presentEvent } from '@/modules/playback/usePlayback';
import { routeHead } from '@/modules/figure_route/routePainter';
import InkSprite from '@/modules/ink_sprites/InkSprite';
import './mapOverlay.css';

// 时间轴上相距多远的大事会出现在地图上（卷面比例）
const WINDOW = 0.013;

const toScreen = (v: View, p: [number, number]) => [p[0] * v.k + v.x, p[1] * v.k + v.y];
const onScreen = (v: View, x: number, y: number) => x > -80 && y > -80 && x < v.width + 80 && y < v.height + 80;

function Marker({ e, view, active, fade }: { e: HistoryEvent; view: View; active: boolean; fade: number }) {
  const [x, y] = toScreen(view, project(e.coord));
  if (!onScreen(view, x, y)) return null;
  const cat = CATEGORY_BY_ID.get(e.category);
  return (
    <div className={`event-marker is-${e.importance}${active ? ' is-active' : ''}`} style={{ transform: `translate(${x}px, ${y}px)`, opacity: active ? 1 : fade }}>
      {active && <span className="event-marker__ripple" />}
      {active && (
        <span className="event-marker__sprite">
          <InkSprite kind={e.sprite} size={118} />
        </span>
      )}
      <button className="event-marker__seal seal" onClick={() => presentEvent(e, false)} aria-label={e.title}>
        {cat && t(cat.glyph)}
      </button>
      <span className="event-marker__label">{e.title}</span>
    </div>
  );
}

// 地图浮层：随时间浮现的大事印记、当前事件的动画精灵、人物路线上的行进精灵
export default function MapOverlay() {
  const view = useMapView();
  const { year, mode, eventId, figureId, routeStep } = useAtlas(
    useShallow((s) => ({ year: s.year, mode: s.mode, eventId: s.eventId, figureId: s.figureId, routeStep: s.routeStep })),
  );
  if (!view) return null;
  const now = yearToT(year);
  const browsing = mode === 'overview' || mode === 'events';
  const figure = mode === 'figure' && figureId ? FIGURE_BY_ID.get(figureId) : null;

  const markers = EVENTS.flatMap((e) => {
    const d = Math.abs(yearToT(e.year) - now);
    const active = e.id === eventId && browsing;
    if (!active && (!browsing || d > WINDOW)) return [];
    return [{ e, active, fade: Math.max(0.15, 1 - d / WINDOW) }];
  });

  const head = figure ? routeHead(figure, routeStep) : null;
  const [hx, hy] = head ? toScreen(view, head.p) : [0, 0];
  const flip = head ? Math.abs(head.angle) > Math.PI / 2 : false;

  return (
    <div className="map-overlay">
      {markers.map((m) => (
        <Marker key={m.e.id} e={m.e} view={view} active={m.active} fade={m.fade} />
      ))}
      {figure && head && (
        <div className="route-head" style={{ transform: `translate(${hx}px, ${hy}px)` }}>
          <span style={{ transform: flip ? 'scaleX(-1)' : undefined }}>
            <InkSprite kind={figure.sprite} size={74} />
          </span>
        </div>
      )}
    </div>
  );
}
