import { t, useLocale, type LocaleKey } from '@/locale';
import { useAtlas } from '@/store/useAtlas';
import type { Mode } from '@/types';
import './titleBar.css';

const MODES: { mode: Mode; key: LocaleKey; hint: LocaleKey }[] = [
  { mode: 'overview', key: 'mode_overview', hint: 'mode_hint_overview' },
  { mode: 'territory', key: 'mode_territory', hint: 'mode_hint_territory' },
  { mode: 'figure', key: 'mode_figure', hint: 'mode_hint_figure' },
  { mode: 'events', key: 'mode_events', hint: 'mode_hint_events' },
];

// 语言切换：印文是另一种语言的简称
export function LangToggle({ className = '' }: { className?: string }) {
  const lang = useLocale((s) => s.lang);
  const setLang = useLocale((s) => s.setLang);
  return (
    <button className={`tool-seal seal ${className}`} title={t('lang_switch')} aria-label={t('lang_switch')} onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}>
      {t('lang_glyph')}
    </button>
  );
}

// 配乐开关：关闭时印章褪成淡墨并划去
export function SoundToggle({ className = '' }: { className?: string }) {
  const sound = useAtlas((s) => s.sound);
  const setSound = useAtlas((s) => s.setSound);
  const label = sound ? t('sound_on') : t('sound_off');
  return (
    <button className={`tool-seal seal ${sound ? '' : 'is-off'} ${className}`} title={label} aria-label={t('sound_title')} aria-pressed={sound} onClick={() => setSound(!sound)}>
      {t('sound_glyph')}
    </button>
  );
}

// 右上角模式切换：书法字签，选中者下方以一笔浓墨示意；其右是配乐、语言与数据说明三枚小印
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
          aria-current={mode === m.mode ? 'page' : undefined}
          onClick={() => {
            setMode(m.mode);
            setPanelOpen(true);
          }}
        >
          {t(m.key)}
        </button>
      ))}
      <span className="mode-tabs__tools">
        <SoundToggle />
        <LangToggle />
        <button className="tool-seal seal" title={t('data_title')} aria-label={t('data_title')} onClick={() => setNotesOpen(true)}>
          {t('data_glyph')}
        </button>
      </span>
    </nav>
  );
}
