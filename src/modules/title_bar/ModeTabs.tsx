import { t, type LocaleKey } from '@/locale';
import { useAtlas } from '@/store/useAtlas';
import type { Mode } from '@/types';
import './titleBar.css';

const MODES: { mode: Mode; key: LocaleKey; hint: LocaleKey }[] = [
  { mode: 'overview', key: 'mode_overview', hint: 'mode_hint_overview' },
  { mode: 'territory', key: 'mode_territory', hint: 'mode_hint_territory' },
  { mode: 'figure', key: 'mode_figure', hint: 'mode_hint_figure' },
  { mode: 'events', key: 'mode_events', hint: 'mode_hint_events' },
];

// 右上角模式切换：书法字签，选中者下方以一笔浓墨示意
export default function ModeTabs() {
  const mode = useAtlas((s) => s.mode);
  const setMode = useAtlas((s) => s.setMode);
  const setPanelOpen = useAtlas((s) => s.setPanelOpen);
  const setNotesOpen = useAtlas((s) => s.setNotesOpen);

  return (
    <nav className="mode-tabs" aria-label={t('mode_label')}>
      {MODES.map((m) => (
        <button
          key={m.mode}
          className={`mode-tabs__tab${mode === m.mode ? ' is-active' : ''}`}
          title={t(m.hint)}
          onClick={() => {
            setMode(m.mode);
            setPanelOpen(true);
          }}
        >
          {t(m.key)}
        </button>
      ))}
      <button className="mode-tabs__notes seal" title={t('data_title')} onClick={() => setNotesOpen(true)}>
        注
      </button>
    </nav>
  );
}
