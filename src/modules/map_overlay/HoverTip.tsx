import { getLang, t } from '@/locale';
import { useHover } from '@/store/useHover';
import { useAtlas } from '@/store/useAtlas';
import { polityLabel, polityZh } from '@/data/polityNames';
import { formatArea, formatYear } from '@/utils/year';
import './mapOverlay.css';

const PRECISION = { 1: 'map_precision_1', 2: 'map_precision_2', 3: 'map_precision_3' } as const;

// 悬停政权时的提示：当前语言的名称、另一种语言的名称、面积、边界精度与校勘标记
export default function HoverTip() {
  const hover = useHover((s) => s.hover);
  const year = useAtlas((s) => Math.round(s.year));
  if (!hover) return null;
  const lang = getLang();
  const name = polityLabel(lang, hover.name, hover.snapshot, year);
  const other = lang === 'zh' ? (name ? hover.name : null) : polityZh(hover.name, hover.snapshot, year);
  const left = Math.min(hover.x + 18, window.innerWidth - 270);
  const top = Math.min(hover.y + 18, window.innerHeight - 160);
  const precision = PRECISION[(hover.prec as 1 | 2 | 3) ?? 1] ?? PRECISION[1];
  return (
    <div className="hover-tip" style={{ left, top }}>
      <span className="hover-tip__name">{name ?? hover.name}</span>
      {other && <span className="hover-tip__en">{other}</span>}
      <span className="hover-tip__meta">
        {!name && t('map_unnamed') && (
          <>
            {t('map_unnamed')}
            <br />
          </>
        )}
        {formatArea(hover.area)} {t('map_unit')} · {t('map_precision')}: {t(precision)}
        <br />
        {t('year_snapshot')} {formatYear(hover.snapshot)}
        {hover.fixed && <span className="hover-tip__fixed"> · {t('map_fixed')}</span>}
        {hover.synthetic && <span className="hover-tip__fixed"> · {t('year_synthetic')}</span>}
      </span>
    </div>
  );
}
