// 地图悬停的政权信息（由地图引擎写入，提示框读取）
import { create } from 'zustand';

export interface HoverInfo {
  name: string;
  subj?: string;
  area: number;
  prec: number;
  fixed: boolean;
  snapshot: number;
  synthetic: boolean;
  x: number;
  y: number;
}

export const useHover = create<{ hover: HoverInfo | null; setHover: (h: HoverInfo | null) => void }>((set) => ({
  hover: null,
  setHover: (hover) => set({ hover }),
}));
