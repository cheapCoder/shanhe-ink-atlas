import { getLang, t, tx } from '@/locale';
import { useAtlas } from '@/store/useAtlas';
import { displayYear, formatYear } from '@/utils/year';
import { eraAt } from '@/data/chronology';
import { useSnapshotMeta } from '@/modules/map_view/useMapState';
import ChronoPicker from './ChronoPicker';
import './titleBar.css';

// 顶部纪年：大字年份，下附所看国家的朝代、世界分期与当前疆域切片
export default function YearBanner() {
  const year = useAtlas((s) => Math.round(s.year));
  const snap = useSnapshotMeta();
  const y = displayYear(year);
  const zh = getLang() === 'zh';
  const era = <span className="year-banner__era">{y < 0 ? t('year_bc') : t('year_ad')}</span>;
  return (
    <div className="year-banner" aria-live="polite">
      <div className="year-banner__main">
        {zh && era}
        <span className="year-banner__num latin">{Math.abs(y)}</span>
        {zh ? <span className="year-banner__unit">{t('year_unit')}</span> : era}
      </div>
      <div className="year-banner__meta">
        <ChronoPicker year={year} />
        <span>{tx(eraAt(year).name)}</span>
        {snap && (
          <span className="year-banner__snap">
            {t('year_snapshot')} {formatYear(snap.year)}
            {snap.synthetic ? (zh ? `（${t('year_synthetic')}）` : ` (${t('year_synthetic')})`) : ''}
          </span>
        )}
      </div>
    </div>
  );
}
