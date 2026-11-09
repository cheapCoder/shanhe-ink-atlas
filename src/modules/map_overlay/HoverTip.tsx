import { t } from '@/locale';
import { useHover } from '@/store/useHover';
import { useAtlas } from '@/store/useAtlas';
import { polityZh } from '@/data/polityNames';
import { formatYear } from '@/utils/year';
import './mapOverlay.css';

const PRECISION = { 1: 'map_precision_1', 2: 'map_precision_2', 3: 'map_precision_3' } as const;

// 悬停政权时的提示：中文名、原名、面积、边界精度与校勘标记
export default function HoverTip() {
  const hover = useHover((s) => s.hover);
  const year = useAtlas((s) => Math.round(s.year));
  if (!hover) return null;
  const zh = polityZh(hover.name, hover.snapshot, year);
  const left = Math.min(hover.x + 18, window.innerWidth - 270);
  const top = Math.min(hover.y + 18, window.innerHeight - 160);
  const precision = PRECISION[(hover.prec as 1 | 2 | 3) ?? 1] ?? PRECISION[1];
  return (
    <div className="hover-tip" style={{ left, top }}>
      <span className="hover-tip__name">{zh ?? hover.name}</span>
      {zh && <span className="hover-tip__en">{hover.name}</span>}
      <span className="hover-tip__meta">
        {!zh && <>{t('map_unnamed')}<br /></>}
        {(hover.area / 10000).toFixed(hover.area > 1e6 ? 0 : 1)} {t('map_unit')} · {t('map_precision')}：{t(precision)}
        <br />
        {t('year_snapshot')} {formatYear(hover.snapshot)}
        {hover.fixed && <span className="hover-tip__fixed"> · {t('map_fixed')}</span>}
        {hover.synthetic && <span className="hover-tip__fixed"> · {t('year_synthetic')}</span>}
      </span>
    </div>
  );
}
