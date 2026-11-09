// 全局状态：当前年份、播放、模式、选中项与各模式的播放进度
import { create } from 'zustand';
import type { Mode } from '@/types';

export const YEAR_MIN = -3200;
export const YEAR_MAX = 2025;

export type Speed = 0.5 | 1 | 2;

interface AtlasState {
  year: number;
  playing: boolean;
  speed: Speed;
  tour: boolean;
  mode: Mode;
  eventId: string | null;
  figureId: string | null;
  lineageId: string | null;
  holdUntil: number | null;
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
  setMode: (mode: Mode) => void;
  openEvent: (id: string | null) => void;
  openFigure: (id: string | null) => void;
  openLineage: (id: string | null) => void;
  setHold: (until: number | null) => void;
  setRouteStep: (step: number) => void;
  setPeriodStep: (step: number) => void;
  start: () => void;
  setReady: (ready: boolean) => void;
  setNotesOpen: (open: boolean) => void;
  setPanelOpen: (open: boolean) => void;
}

const clampYear = (y: number) => Math.min(YEAR_MAX, Math.max(YEAR_MIN, y));

export const useAtlas = create<AtlasState>((set) => ({
  year: -3100,
  playing: false,
  speed: 1,
  tour: true,
  mode: 'overview',
  eventId: null,
  figureId: null,
  lineageId: null,
  holdUntil: null,
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
  setMode: (mode) => set((s) => ({ mode, playing: false, holdUntil: null, eventId: mode === 'overview' || mode === 'events' ? s.eventId : null })),
  openEvent: (eventId) => set({ eventId, figureId: null }),
  openFigure: (figureId) => set({ figureId, routeStep: 0, eventId: null, playing: false, holdUntil: null }),
  openLineage: (lineageId) => set({ lineageId, periodStep: 0, playing: false, holdUntil: null }),
  setHold: (holdUntil) => set({ holdUntil }),
  setRouteStep: (routeStep) => set({ routeStep }),
  setPeriodStep: (periodStep) => set({ periodStep }),
  start: () => set({ started: true }),
  setReady: (ready) => set({ ready }),
  setNotesOpen: (notesOpen) => set({ notesOpen }),
  setPanelOpen: (panelOpen) => set({ panelOpen }),
}));
