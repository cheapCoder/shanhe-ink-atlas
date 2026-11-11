import { useEffect } from 'react';
import { useAtlas } from '@/store/useAtlas';
import { getMapEngine } from '@/modules/map_view/mapBus';
import { Ambience, regionAt } from './ambience';

let ambience: Ambience | null = null;
let context: AudioContext | null = null;

// 浏览器只允许在用户操作之后发声：首次点击或按键时创建音频上下文
function ensure(): Ambience | null {
  if (ambience) return ambience;
  const Ctor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    context = new Ctor();
    ambience = new Ambience(context);
  } catch {
    ambience = null;
  }
  return ambience;
}

// 大事停驻时敲一声磬（配乐开着时）
export function playChime() {
  if (ambience?.audible && context?.state === 'running') ambience.chime();
}

const VOLUME = 0.7;
const TICK_MS = 400;
const AHEAD_SECONDS = 1.6;

// 配乐的开关与调度：开着且页面可见时每隔一小会儿往后排一段乐句，并让调式跟随镜头所在的地域
export function useAmbience() {
  const sound = useAtlas((s) => s.sound);
  const started = useAtlas((s) => s.started);

  useEffect(() => {
    if (!sound) {
      ambience?.fade(0, 0.6);
      return;
    }
    let timer = 0;
    const tick = () => {
      const a = ambience;
      if (!a || !context || context.state !== 'running' || document.hidden) return;
      const engine = getMapEngine();
      const view = engine?.view;
      const center = view ? engine.lonlatAt([view.width / 2, view.height / 2]) : null;
      if (engine && center) a.setRegion(regionAt(center[0], center[1], engine.zoomLevel));
      a.schedule(context.currentTime + AHEAD_SECONDS);
    };
    const wake = () => {
      const a = ensure();
      if (!a || !context) return;
      void context.resume().then(() => {
        a.fade(VOLUME);
        tick();
      });
    };
    const onVisibility = () => {
      if (document.hidden) ambience?.fade(0, 0.4);
      else if (context?.state === 'running') ambience?.fade(VOLUME);
    };
    // 展卷的那次点击已经算一次用户操作；从分享链接直接进来等情况则等到下一次点击或按键
    if (started) wake();
    window.addEventListener('pointerdown', wake);
    window.addEventListener('keydown', wake);
    document.addEventListener('visibilitychange', onVisibility);
    timer = window.setInterval(tick, TICK_MS);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('keydown', wake);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [sound, started]);
}
