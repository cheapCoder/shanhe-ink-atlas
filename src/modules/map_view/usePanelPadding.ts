import { useEffect } from 'react';
import { useAtlas } from '@/store/useAtlas';
import { useEngine } from './useMapState';

// 两侧挂轴展开时，镜头取景避开被遮挡的区域
export function usePanelPadding() {
  const engine = useEngine();
  const mode = useAtlas((s) => s.mode);
  const panelOpen = useAtlas((s) => s.panelOpen);
  const eventId = useAtlas((s) => s.eventId);
  useEffect(() => {
    if (!engine) return;
    const wide = window.innerWidth > 760;
    const left = wide && mode !== 'overview' && panelOpen ? 430 : 0;
    const right = wide && (mode === 'figure' || mode === 'territory' || eventId) ? 430 : 0;
    engine.setPadding({ left, right });
  }, [engine, mode, panelOpen, eventId]);
}
