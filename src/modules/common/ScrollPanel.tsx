import type { ReactNode } from 'react';
import { t } from '@/locale';
import '@/styles/panels.css';

interface Props {
  side: 'left' | 'right';
  label: string;
  onClose?: () => void;
  children: ReactNode;
}

// 挂轴面板外壳：上下轴杆 + 绫边 + 画心；内容更换时由调用方以 key 触发重新展卷
export default function ScrollPanel({ side, label, onClose, children }: Props) {
  return (
    <aside className={`scroll-panel scroll-panel--${side}`} aria-label={label}>
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
