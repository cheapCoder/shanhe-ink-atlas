import { useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { getLang, t, tf, tx, type LocaleKey } from '@/locale';
import { useAtlas, type Speed, type TourDepth } from '@/store/useAtlas';
import { EVENTS } from '@/data/events';
import { CHRONOLOGIES, WORLD_ERAS, type Period } from '@/data/chronology';
import { FIGURE_BY_ID } from '@/data/figures';
import { LINEAGE_BY_ID } from '@/data/lineages';
import { formatRange, formatYear, formatYearShort } from '@/utils/year';
import { useSnapshotMeta, useEngine } from '@/modules/map_view/useMapState';
import { lineageSpan } from '@/modules/territory/lineage';
import { presentEvent, tourStats } from '@/modules/playback/usePlayback';
import { TICKS, tToYear, yearToT } from './timeScale';
import { useChrono } from './useChrono';
import TimelineCursor from './TimelineCursor';
import './timeline.css';

const SPEEDS: { v: Speed; key: LocaleKey }[] = [
  { v: 0.5, key: 'timeline_slow' },
  { v: 1, key: 'timeline_normal' },
  { v: 2, key: 'timeline_fast' },
];

const DEPTHS: { v: TourDepth; key: LocaleKey; hint: LocaleKey }[] = [
  { v: 1, key: 'tour_depth_1', hint: 'tour_hint_1' },
  { v: 2, key: 'tour_depth_2', hint: 'tour_hint_2' },
  { v: 3, key: 'tour_depth_3', hint: 'tour_hint_3' },
];

const pct = (year: number) => `${(yearToT(year) * 100).toFixed(3)}%`;

// 大事印记按重要度由低到高绘制，要事压在上面
const MARKS = [...EVENTS].sort((a, b) => a.importance - b.importance || a.year - b.year);

// 年表格子里写不写字：全称放得下写全称，否则写简称，再放不下就留白（悬停仍有全称提示）
function cellLabel(d: Period, width: number): string {
  const zh = getLang() === 'zh';
  const fits = (s: string) => width >= (zh ? [...s].length * 11 + 4 : s.length * 5.7 + 8);
  const full = tx(d.name);
  if (fits(full)) return full;
  const short = d.short ? tx(d.short) : '';
  return short && fits(short) ? short : '';
}

export default function Timeline() {
  const track = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ x: number; year: number } | null>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const { playing, speed, tour, tourDepth, mode, figureId, lineageId } = useAtlas(
    useShallow((s) => ({ playing: s.playing, speed: s.speed, tour: s.tour, tourDepth: s.tourDepth, mode: s.mode, figureId: s.figureId, lineageId: s.lineageId })),
  );
  const { togglePlay, setSpeed, setTour, setTourDepth, setYear, setPlaying } = useAtlas.getState();
  const engine = useEngine();
  const snap = useSnapshotMeta();
  const snapshots = useMemo(() => engine?.store.list ?? [], [engine, snap]);
  const chrono = useChrono();
  const periods = CHRONOLOGIES[chrono.id] ?? [];

  // 相邻刻度文字的最小间距，窄屏时据此跳过放不下的年份
  const tickGap = getLang() === 'zh' ? 44 : 60;
  const tickLabels = useMemo(() => {
    let last = -Infinity;
    return new Set(
      TICKS.filter((y) => {
        const x = yearToT(y) * trackWidth;
        if (x - last < tickGap) return false;
        last = x;
        return true;
      }),
    );
  }, [trackWidth, tickGap]);

  const depthHints = useMemo(
    () =>
      DEPTHS.map((d) => {
        const { count, minutes } = tourStats(d.v, speed);
        return tf(d.hint, { n: count, m: minutes });
      }),
    [speed],
  );

  useLayoutEffect(() => {
    const el = track.current!;
    const observer = new ResizeObserver(() => setTrackWidth(el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 人物模式显示生卒区间，疆域模式显示谱系存续区间

  const band = useMemo(() => {
    const f = mode === 'figure' && figureId ? FIGURE_BY_ID.get(figureId) : null;
    if (f) return { from: f.birth, to: f.death, label: tx(f.name) };
    const l = mode === 'territory' && lineageId ? LINEAGE_BY_ID.get(lineageId) : null;
    if (l) {
      const [a, b] = lineageSpan(l);
      return { from: a, to: Math.max(b, a + 1), label: tx(l.name) };
    }
    return null;
  }, [mode, figureId, lineageId]);

  const yearAt = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    return { x: clientX - r.left, year: tToYear((clientX - r.left) / r.width) };
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.timeline__event')) return;
    track.current!.setPointerCapture(e.pointerId);
    setPlaying(false);
    setYear(yearAt(e.clientX).year);
  };

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const h = yearAt(e.clientX);
    setHover(h);
    if (e.buttons === 1 && track.current!.hasPointerCapture(e.pointerId)) setYear(h.year);
  };

  return (
    <footer className="timeline">
      <div className="timeline__controls">
        <button className={`timeline__play seal${playing ? ' is-playing' : ''}`} onClick={togglePlay} title={playing ? t('timeline_pause') : t('timeline_play')} aria-label={playing ? t('timeline_pause') : t('timeline_play')}>
          <svg viewBox="0 0 40 40" aria-hidden="true">
            {playing ? (
              <path d="M13 10.5c.6 6.6.4 12.8-.2 19M26.4 10.2c.4 6.8.3 13-.3 19.4" stroke="currentColor" strokeWidth="4.2" strokeLinecap="round" fill="none" />
            ) : (
              <path d="M14 9.6c7.2 3.4 12.4 6.8 16 10.4-4 3.6-9.4 7-16.2 10.6.5-7 .6-14-.2-21z" fill="currentColor" />
            )}
          </svg>
        </button>
        <div className="timeline__speeds" role="radiogroup" aria-label={t('timeline_speed')}>
          {SPEEDS.map((s) => (
            <button key={s.v} role="radio" aria-checked={speed === s.v} className={speed === s.v ? 'is-active' : ''} onClick={() => setSpeed(s.v)}>
              {t(s.key)}
            </button>
          ))}
        </div>
        <div className={`timeline__tourbox${tour ? '' : ' is-off'}`}>
          <label className="timeline__tour" title={t('timeline_tour_hint')}>
            <input type="checkbox" checked={tour} onChange={(e) => setTour(e.target.checked)} />
            <span>{t('timeline_tour')}</span>
          </label>
          <div className="timeline__speeds timeline__depths" role="radiogroup" aria-label={t('tour_depth')}>
            {DEPTHS.map((d, i) => (
              <button key={d.v} role="radio" aria-checked={tour && tourDepth === d.v} className={tour && tourDepth === d.v ? 'is-active' : ''} title={depthHints[i]} onClick={() => setTourDepth(d.v)}>
                {t(d.key)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="timeline__track" ref={track} onPointerDown={onDown} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        {WORLD_ERAS.map((era) => (
          <div key={era.from} className="timeline__era" style={{ left: pct(era.from), width: `calc(${pct(era.to)} - ${pct(era.from)})`, background: era.tint }}>
            <span>{tx(era.name)}</span>
          </div>
        ))}
        <div className="timeline__dynasties" key={chrono.id}>
          {periods.map((d) => (
            <span key={d.from} className="timeline__dynasty" style={{ left: pct(d.from), width: `calc(${pct(d.to)} - ${pct(d.from)})` }} title={`${tx(d.name)} · ${formatRange(d.from, d.to)}`}>
              {cellLabel(d, (yearToT(d.to) - yearToT(d.from)) * trackWidth)}
            </span>
          ))}
        </div>
        {band && <div className="timeline__band" style={{ left: pct(band.from), width: `calc(${pct(band.to)} - ${pct(band.from)})` }} title={band.label} />}
        {TICKS.map((y) => (
          <span key={y} className="timeline__tick" style={{ left: pct(y) }}>
            <i />
            {tickLabels.has(y) && formatYearShort(y)}
          </span>
        ))}
        {snapshots.map((s) => (
          <span key={s.year} className={`timeline__snap${s.synthetic ? ' is-synthetic' : ''}`} style={{ left: pct(s.year) }} />
        ))}
        {MARKS.map((e) => (
          <button
            key={e.id}
            className={`timeline__event is-${e.importance}`}
            style={{ left: pct(e.year) }}
            title={`${formatYear(e.year)} · ${tx(e.title)}`}
            aria-label={`${formatYear(e.year)} ${tx(e.title)}`}
            onClick={() => {
              setPlaying(false);
              presentEvent(e, false);
            }}
          />
        ))}
        <TimelineCursor />
        {hover && (
          <span className="timeline__hover" style={{ left: hover.x }}>
            {formatYear(hover.year)}
          </span>
        )}
      </div>
    </footer>
  );
}
