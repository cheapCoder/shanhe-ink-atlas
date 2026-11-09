// 订阅地图引擎的 React hooks：引擎实例、当前疆域切片、视图变化（逐帧节流）
import { useEffect, useState } from 'react';
import type { SnapshotMeta } from '@/types';
import type { MapEngine } from './engine/MapEngine';
import type { View } from './engine/projection';
import { onMapEngine } from './mapBus';

export function useEngine(): MapEngine | null {
  const [engine, setEngine] = useState<MapEngine | null>(null);
  useEffect(() => onMapEngine(setEngine), []);
  return engine;
}

export function useSnapshotMeta(): SnapshotMeta | null {
  const engine = useEngine();
  const [meta, setMeta] = useState<SnapshotMeta | null>(null);
  useEffect(() => engine?.subscribeSnapshot(setMeta), [engine]);
  return meta;
}

export function useMapView(): View | null {
  const engine = useEngine();
  const [view, setView] = useState<View | null>(null);
  useEffect(() => {
    if (!engine) return;
    let raf = 0;
    let latest: View | null = null;
    const unsub = engine.subscribeView((v) => {
      latest = v;
      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0;
          setView(latest);
        });
      }
    });
    return () => {
      unsub();
      cancelAnimationFrame(raf);
    };
  }, [engine]);
  return view;
}
