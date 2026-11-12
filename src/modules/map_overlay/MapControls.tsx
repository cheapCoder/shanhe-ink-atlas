import { t } from '@/locale';
import { getMapEngine } from '@/modules/map_view/mapBus';
import './mapOverlay.css';

// 右下角缩放与复位
export default function MapControls() {
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
    </div>
  );
}
