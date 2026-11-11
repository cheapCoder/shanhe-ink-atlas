import { t } from '@/locale';
import { useAtlas } from '@/store/useAtlas';
import './detailPanel.css';

// 导览停驻时的朱砂进度线与“继续前行”，可提前结束停驻；读者把鼠标移入卡片时进度停住
export default function TourHold() {
  const holdUntil = useAtlas((s) => s.holdUntil !== null);
  const span = useAtlas((s) => s.holdSpan);
  const paused = useAtlas((s) => s.holdPaused);
  const playing = useAtlas((s) => s.playing);
  if (!playing || !holdUntil) return null;
  return (
    <div className={`tour-hold${paused ? ' is-paused' : ''}`}>
      <span key={span} className="tour-hold__bar" style={{ animationDuration: `${Math.max(1, span)}ms` }} />
      {paused && <span className="tour-hold__note">{t('tour_paused')}</span>}
      <button className="ink-button ink-button--ghost" onClick={() => useAtlas.getState().setHold(performance.now())}>
        {t('panel_continue')} ›
      </button>
    </div>
  );
}
