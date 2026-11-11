import { useState } from 'react';
import { t, tf } from '@/locale';
import { useAtlas } from '@/store/useAtlas';
import { EVENTS } from '@/data/events';
import { FIGURES } from '@/data/figures';
import { useEngine } from '@/modules/map_view/useMapState';
import { LangToggle, SoundToggle } from '@/modules/title_bar/ModeTabs';
import { hasDeepLink } from '@/modules/share/urlState';
import InkMountains from './InkMountains';
import './intro.css';

const STOPS = FIGURES.reduce((n, f) => n + f.route.length, 0);

// 开篇：竖排题名、朱印、水墨远山；地图就绪后可“展卷”，随即开始导览
export default function IntroScreen() {
  const ready = useAtlas((s) => s.ready);
  const started = useAtlas((s) => s.started);
  const engine = useEngine();
  const [leaving, setLeaving] = useState(false);
  if (started) return null;

  const enter = () => {
    setLeaving(true);
    window.setTimeout(() => {
      const s = useAtlas.getState();
      s.start();
      // 从分享链接进来时直接停在链接所指的画面，不自动开播
      if (!hasDeepLink()) s.setPlaying(true);
    }, 900);
  };

  const stats = tf('app_stats', { s: engine?.store.list.length ?? '—', e: EVENTS.length, f: FIGURES.length, w: STOPS });

  return (
    <div className={`intro${leaving ? ' is-leaving' : ''}`}>
      <InkMountains />
      <div className="intro__tools">
        <SoundToggle />
        <LangToggle />
      </div>
      <div className="intro__body">
        <h1 className="intro__title">{t('app_title')}</h1>
        <div className="intro__side">
          <span className="intro__seal seal">{t('app_seal')}</span>
          <p className="intro__lead">{t('app_intro')}</p>
        </div>
      </div>
      <div className="intro__foot">
        <button className="intro__enter seal" disabled={!ready} onClick={enter}>
          {ready ? t('app_enter') : `${t('app_loading')}…`}
        </button>
        <p className="intro__stats">{ready ? stats : ' '}</p>
        <p className="intro__hint">{t('app_hint')}</p>
      </div>
    </div>
  );
}
