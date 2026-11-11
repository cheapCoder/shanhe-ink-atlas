import { getLang, t, tx } from '@/locale';
import { useMemo, useRef, useState, type PointerEvent } from 'react';
import { CINNABAR } from '@/modules/map_view/engine/palette';
import { yearToT } from '@/modules/time_line/timeScale';
import { formatYear, formatYearShort } from '@/utils/year';
import type { AreaPoint } from './lineage';
import './territory.css';

const W = 336;
const H = 150;
const PAD = { left: 40, right: 12, top: 18, bottom: 22 };

// 纵轴单位：中文为万平方公里，英文为 million km²
const unitOf = () => (getLang() === 'zh' ? 1e4 : 1e6);
const wan = (km2: number) => km2 / unitOf();
const fmt = (v: number) => (v === 0 ? '0' : v >= 100 ? Math.round(v).toLocaleString() : v >= 10 ? v.toFixed(1) : getLang() === 'zh' ? v.toFixed(1) : v.toFixed(2));

function niceMax(v: number) {
  const p = 10 ** Math.floor(Math.log10(Math.max(v, 1e-6)));
  return Math.ceil(v / p) * p;
}

interface Props {
  points: AreaPoint[];
  current: number | null;
  onPick: (year: number) => void;
}

// 疆域面积随时代变化：单一序列面积图，横轴与长卷时间轴同一比例，悬停十字线读数
export default function AreaChart({ points, current, onPick }: Props) {
  const box = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const geo = useMemo(() => {
    const t0 = yearToT(points[0].year);
    const t1 = yearToT(points[points.length - 1].year);
    const max = niceMax(Math.max(...points.map((p) => wan(p.core))));
    const x = (year: number) => PAD.left + ((yearToT(year) - t0) / Math.max(1e-6, t1 - t0)) * (W - PAD.left - PAD.right);
    const y = (v: number) => PAD.top + (1 - v / max) * (H - PAD.top - PAD.bottom);
    const pts = points.map((p) => [x(p.year), y(wan(p.core))] as const);
    const line = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join('');
    const area = `${line}L${pts[pts.length - 1][0].toFixed(1)},${y(0)}L${pts[0][0].toFixed(1)},${y(0)}Z`;
    const peak = points.reduce((a, b, i) => (b.core > points[a].core ? i : a), 0);
    return { x, y, max, pts, line, area, peak };
  }, [points]);

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const r = box.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    geo.pts.forEach(([x], i) => {
      if (Math.abs(x - px) < Math.abs(geo.pts[best][0] - px)) best = i;
    });
    setHover(best);
  };

  const h = hover !== null ? points[hover] : null;
  const ticks = [0, geo.max / 2, geo.max];
  const peak = points[geo.peak];
  const [peakX, peakY] = geo.pts[geo.peak];
  return (
    <div className="area-chart">
      <svg
        ref={box}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={t('country_chart')}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        onClick={() => hover !== null && onPick(points[hover].year)}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={geo.y(v)} y2={geo.y(v)} className="area-chart__grid" />
            <text x={PAD.left - 6} y={geo.y(v) + 3.5} className="area-chart__tick" textAnchor="end">
              {fmt(v)}
            </text>
          </g>
        ))}
        <text x={PAD.left} y={H - 6} className="area-chart__tick">
          {formatYearShort(points[0].year)}
        </text>
        <text x={W - PAD.right} y={H - 6} className="area-chart__tick" textAnchor="end">
          {formatYearShort(points[points.length - 1].year)}
        </text>
        <path d={geo.area} fill={CINNABAR} fillOpacity={0.1} />
        <path d={geo.line} fill="none" stroke={CINNABAR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {geo.pts.map(([px, py], i) => (
          <circle key={i} cx={px} cy={py} r={points[i].year === current ? 5.5 : 4} fill={CINNABAR} stroke="#f7f1e4" strokeWidth={2} />
        ))}
        <text x={Math.min(W - 60, peakX + 7)} y={Math.max(12, peakY - 7)} className="area-chart__peak">
          {t('country_peak')} {fmt(wan(peak.core))}
        </text>
        {h && hover !== null && <line x1={geo.pts[hover][0]} x2={geo.pts[hover][0]} y1={PAD.top} y2={H - PAD.bottom} className="area-chart__cross" />}
      </svg>
      {h && hover !== null && (
        <div className="area-chart__tip" style={{ left: `${(geo.pts[hover][0] / W) * 100}%` }}>
          <b>{fmt(wan(h.core))} {t('country_unit')}</b>
          <span>
            {tx(h.label)} · {formatYear(h.year)}
          </span>
        </div>
      )}
    </div>
  );
}
