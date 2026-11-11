import { useEffect, useRef, type PointerEvent, type ReactNode } from 'react';
import { t } from '@/locale';
import { useAtlas } from '@/store/useAtlas';
import '@/styles/panels.css';

interface Props {
  side: 'left' | 'right';
  label: string;
  onClose?: () => void;
  // 读者把鼠标移入或触摸面板时，导览的停驻顺延（读完再走）
  holdWhileReading?: boolean;
  children: ReactNode;
}

const TOUCH_GRACE_MS = 3500;

// 挂轴面板外壳：上下轴杆 + 绫边 + 画心；内容更换时由调用方以 key 触发重新展卷
export default function ScrollPanel({ side, label, onClose, holdWhileReading, children }: Props) {
  const timer = useRef(0);
  const setPaused = (paused: boolean) => {
    window.clearTimeout(timer.current);
    if (holdWhileReading) useAtlas.getState().setHoldPaused(paused);
  };

  useEffect(() => () => {
    window.clearTimeout(timer.current);
    if (holdWhileReading) useAtlas.getState().setHoldPaused(false);
  }, [holdWhileReading]);

  const onDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    setPaused(true);
    timer.current = window.setTimeout(() => setPaused(false), TOUCH_GRACE_MS);
  };

  return (
    <aside
      className={`scroll-panel scroll-panel--${side}`}
      aria-label={label}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setPaused(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setPaused(false)}
      onPointerDown={onDown}
    >
      <div className="scroll-panel__rod" />
      <div className="scroll-panel__body">
        {onClose && (
          <button className="scroll-panel__close" onClick={onClose} aria-label={t('panel_close')} title={t('panel_close')}>
            ×
          </button>
        )}
        <div className="scroll-panel__paper">{children}</div>
      </div>
      <div className="scroll-panel__rod" />
    </aside>
  );
}
