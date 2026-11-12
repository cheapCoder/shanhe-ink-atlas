import { t } from '@/locale';
import { useAtlas } from '@/store/useAtlas';
import './detailPanel.css';

// 导览停驻时的朱砂进度线与“继续前行”，可提前结束停驻
export default function TourHold() {
  const holdUntil = useAtlas((s) => s.holdUntil);
  const playing = useAtlas((s) => s.playing);
  if (!playing || holdUntil === null) return null;
  const remain = Math.max(0, holdUntil - performance.now());
  return (
    <div className="tour-hold">
      <span key={holdUntil} className="tour-hold__bar" style={{ animationDuration: `${remain}ms` }} />
      <button className="ink-button ink-button--ghost" onClick={() => useAtlas.getState().setHold(performance.now())}>
        {t('panel_continue')} ›
      </button>
    </div>
  );
}
