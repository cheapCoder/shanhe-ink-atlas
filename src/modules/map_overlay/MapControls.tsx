import { useState } from 'react';
import { t } from '@/locale';
import { getMapEngine } from '@/modules/map_view/mapBus';
import './mapOverlay.css';

// 右下角：缩放、复位与复制当前画面的链接
export default function MapControls() {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // 剪贴板不可用时，地址栏里的链接同样可以直接复制
    }
  };

  return (
    <div className="map-controls">
      <button title={t('map_zoom_in')} aria-label={t('map_zoom_in')} onClick={() => getMapEngine()?.zoomBy(1.8)}>
        ＋
      </button>
      <button title={t('map_zoom_out')} aria-label={t('map_zoom_out')} onClick={() => getMapEngine()?.zoomBy(1 / 1.8)}>
        －
      </button>
      <button title={t('map_reset')} aria-label={t('map_reset')} onClick={() => getMapEngine()?.resetView()}>
        ◎
      </button>
      <button className={copied ? 'is-done' : ''} title={copied ? t('share_copied') : t('share_copy')} aria-label={t('share_copy')} onClick={share}>
        {copied ? '✓' : t('share_glyph')}
      </button>
      {copied && (
        <span className="map-controls__toast" role="status">
          {t('share_copied')}
        </span>
      )}
    </div>
  );
}
