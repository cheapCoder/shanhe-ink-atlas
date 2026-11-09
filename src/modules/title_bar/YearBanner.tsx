import { t } from '@/locale';
import { useAtlas } from '@/store/useAtlas';
import { displayYear, formatYearShort } from '@/utils/year';
import { dynastyAt, eraAt } from '@/data/chronology';
import { useSnapshotMeta } from '@/modules/map_view/useMapState';
import './titleBar.css';

// 顶部纪年：大字年份，下附中国朝代、世界分期与当前疆域切片
export default function YearBanner() {
  const year = useAtlas((s) => Math.round(s.year));
  const snap = useSnapshotMeta();

  const y = displayYear(year);
  const dynasty = dynastyAt(year);
  const era = eraAt(year);
  return (
    <div className="year-banner" aria-live="polite">
      <div className="year-banner__main">
        <span className="year-banner__era">{y < 0 ? t('year_bc') : t('year_ad')}</span>
        <span className="year-banner__num latin">{Math.abs(y)}</span>
        <span className="year-banner__unit">{t('year_unit')}</span>
      </div>
      <div className="year-banner__meta">
        {dynasty && <span className="year-banner__dynasty">{t('year_china')} · {dynasty.name}</span>}
        {era && <span>{era.name}</span>}
        {snap && (
          <span className="year-banner__snap">
            {t('year_snapshot')} {formatYearShort(snap.year)} {t('year_unit')}{snap.synthetic ? `（${t('year_synthetic')}）` : ''}
          </span>
        )}
      </div>
    </div>
  );
}
