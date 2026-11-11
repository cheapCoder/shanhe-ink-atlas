// 全局状态：当前年份、播放、模式、选中项与各模式的播放进度
import { create } from 'zustand';
import type { Mode } from '@/types';

export const YEAR_MIN = -3200;
export const YEAR_MAX = 2025;

export type Speed = 0.5 | 1 | 2;

// 导览详略：1 精要（只停重要度 3）、2 详览（重要度 2 及以上）、3 全览
export type TourDepth = 1 | 2 | 3;

interface Prefs {
  speed: Speed;
  tour: boolean;
  tourDepth: TourDepth;
  chronoId: string;
  sound: boolean;
}

const PREFS_KEY = 'shanhe.prefs';
const DEFAULT_PREFS: Prefs = { speed: 1, tour: true, tourDepth: 1, chronoId: 'china', sound: true };

function loadPrefs(): Prefs {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as Partial<Prefs>;
    return {
      speed: saved.speed === 0.5 || saved.speed === 2 ? saved.speed : 1,
      tour: typeof saved.tour === 'boolean' ? saved.tour : DEFAULT_PREFS.tour,
      tourDepth: saved.tourDepth === 2 || saved.tourDepth === 3 ? saved.tourDepth : 1,
      chronoId: typeof saved.chronoId === 'string' ? saved.chronoId : DEFAULT_PREFS.chronoId,
      sound: typeof saved.sound === 'boolean' ? saved.sound : DEFAULT_PREFS.sound,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

interface AtlasState extends Prefs {
  year: number;
  playing: boolean;
  mode: Mode;
  eventId: string | null;
  figureId: string | null;
  lineageId: string | null;
  // 停驻：截止时刻、总时长（供进度线使用）与是否因读者正在阅读而暂停
  holdUntil: number | null;
  holdSpan: number;
  holdPaused: boolean;
  routeStep: number;
  periodStep: number;
  started: boolean;
  ready: boolean;
  notesOpen: boolean;
  panelOpen: boolean;
  setYear: (year: number) => void;
  setPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  setSpeed: (speed: Speed) => void;
  setTour: (tour: boolean) => void;
  setTourDepth: (depth: TourDepth) => void;
  setChronoId: (id: string) => void;
  setSound: (sound: boolean) => void;
  setMode: (mode: Mode) => void;
  openEvent: (id: string | null) => void;
  openFigure: (id: string | null) => void;
  openLineage: (id: string | null) => void;
  setHold: (until: number | null) => void;
  shiftHold: (ms: number) => void;
  setHoldPaused: (paused: boolean) => void;
  setRouteStep: (step: number) => void;
  setPeriodStep: (step: number) => void;
  start: () => void;
  setReady: (ready: boolean) => void;
  setNotesOpen: (open: boolean) => void;
  setPanelOpen: (open: boolean) => void;
}

const clampYear = (y: number) => Math.min(YEAR_MAX, Math.max(YEAR_MIN, y));

export const useAtlas = create<AtlasState>((set) => ({
  ...loadPrefs(),
  year: YEAR_MIN,
  playing: false,
  mode: 'overview',
  eventId: null,
  figureId: null,
  lineageId: null,
  holdUntil: null,
  holdSpan: 0,
  holdPaused: false,
  routeStep: 0,
  periodStep: 0,
  started: false,
  ready: false,
  notesOpen: false,
  panelOpen: true,
  setYear: (year) => set({ year: clampYear(year) }),
  setPlaying: (playing) => set({ playing, holdUntil: null }),
  togglePlay: () => set((s) => ({ playing: !s.playing, holdUntil: null })),
  setSpeed: (speed) => set({ speed }),
  setTour: (tour) => set({ tour }),
  setTourDepth: (tourDepth) => set({ tourDepth, tour: true }),
  setChronoId: (chronoId) => set({ chronoId }),
  setSound: (sound) => set({ sound }),
  setMode: (mode) => set((s) => ({ mode, playing: false, holdUntil: null, eventId: mode === 'overview' || mode === 'events' ? s.eventId : null })),
  openEvent: (eventId) => set({ eventId, figureId: null }),
  openFigure: (figureId) => set({ figureId, routeStep: 0, eventId: null, playing: false, holdUntil: null }),
  openLineage: (lineageId) => set({ lineageId, periodStep: 0, playing: false, holdUntil: null }),
  setHold: (holdUntil) => set({ holdUntil, holdSpan: holdUntil === null ? 0 : Math.max(0, holdUntil - performance.now()) }),
  shiftHold: (ms) => set((s) => (s.holdUntil === null ? s : { holdUntil: s.holdUntil + ms })),
  setHoldPaused: (holdPaused) => set({ holdPaused }),
  setRouteStep: (routeStep) => set({ routeStep }),
  setPeriodStep: (periodStep) => set({ periodStep }),
  start: () => set({ started: true }),
  setReady: (ready) => set({ ready }),
  setNotesOpen: (notesOpen) => set({ notesOpen }),
  setPanelOpen: (panelOpen) => set({ panelOpen }),
}));

// 偏好设置变化时写入本地存储
useAtlas.subscribe((s, prev) => {
  if (s.speed === prev.speed && s.tour === prev.tour && s.tourDepth === prev.tourDepth && s.chronoId === prev.chronoId && s.sound === prev.sound) return;
  try {
    const prefs: Prefs = { speed: s.speed, tour: s.tour, tourDepth: s.tourDepth, chronoId: s.chronoId, sound: s.sound };
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // 本地存储不可用时只在本次会话内生效
  }
});
