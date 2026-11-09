// 地图引擎的全局句柄：供时间轴、面板等模块发起镜头与绘制指令
import type { MapEngine } from './engine/MapEngine';

let engine: MapEngine | null = null;
const listeners = new Set<(e: MapEngine | null) => void>();

export function setMapEngine(e: MapEngine | null) {
  engine = e;
  listeners.forEach((l) => l(e));
}

export function getMapEngine(): MapEngine | null {
  return engine;
}

export function onMapEngine(cb: (e: MapEngine | null) => void) {
  listeners.add(cb);
  cb(engine);
  return () => {
    listeners.delete(cb);
  };
}
