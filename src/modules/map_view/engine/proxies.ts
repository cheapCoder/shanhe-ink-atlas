// 代理纹理的主线程一侧：向后台线程索取“整幅世界位图”，送达后暂存，由地图引擎取走显示
import type { SnapshotMeta } from '@/types';
import { dataRoot } from './basemap';
import { snapshotUrl } from './snapshots';
import type { ProxyHighlight, ProxyRequest, ProxyResponse } from './proxyWorker';

export type { ProxyHighlight };

// 位图宽度：屏幕越大越精细；内存较小的设备与小屏用较小的位图
function pickWidth(viewportWidth: number, dpr: number): number {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const px = viewportWidth * dpr;
  if (memory <= 4 || px < 1300) return 2048;
  return px >= 2300 ? 3072 : 2560;
}

function supported(): boolean {
  if (new URLSearchParams(location.search).get('proxy') === '0') return false;
  return typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap === 'function';
}

// 暂存区只留最近送达的几张：当前画面、淡出中的前一张与预取的下一张
const READY_LIMIT = 3;

export class ProxySource {
  readonly enabled = supported();
  private worker: Worker | null = null;
  private ready = new Map<string, ImageBitmap>();
  // 已发出、尚未送达的请求（值为是否加急）
  private requested = new Map<string, boolean>();
  private waiters = new Map<string, (() => void)[]>();
  private listeners = new Set<() => void>();

  start(viewportWidth: number, dpr: number) {
    if (!this.enabled || this.worker) return;
    try {
      this.worker = new Worker(new URL('./proxyWorker.ts', import.meta.url), { type: 'module' });
    } catch {
      return;
    }
    this.worker.onmessage = ({ data }: MessageEvent<ProxyResponse>) => {
      if (data.type === 'proxy') {
        this.requested.delete(data.key);
        this.ready.get(data.key)?.close();
        this.ready.delete(data.key);
        this.ready.set(data.key, data.bitmap);
        while (this.ready.size > READY_LIMIT) {
          const oldest = this.ready.keys().next().value as string;
          this.ready.get(oldest)?.close();
          this.ready.delete(oldest);
        }
        this.settle(data.key);
      } else if (data.type === 'failed') {
        if (data.key === null) this.stop();
        else {
          this.requested.delete(data.key);
          this.settle(data.key);
        }
      }
      this.listeners.forEach((l) => l());
    };
    this.worker.onerror = () => this.stop();
    this.post({ type: 'init', root: dataRoot(), width: pickWidth(viewportWidth, dpr) });
  }

  get active(): boolean {
    return this.worker !== null;
  }

  // 有新位图送达（或线程失效）时通知
  subscribe(cb: () => void) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  // urgent：马上要显示的画面，排在预取之前
  request(key: string, meta: SnapshotMeta, urgent: boolean, highlight: ProxyHighlight | null) {
    if (!this.worker || this.ready.has(key)) return;
    const pending = this.requested.get(key);
    if (pending !== undefined && (pending || !urgent)) return;
    this.requested.set(key, urgent);
    this.post({ type: 'render', key, year: meta.year, url: snapshotUrl(meta), urgent, highlight });
  }

  // 取走位图（所有权转给调用方）
  take(key: string): ImageBitmap | null {
    const bitmap = this.ready.get(key) ?? null;
    if (bitmap) this.ready.delete(key);
    return bitmap;
  }

  // 等某张位图送达，最多等 timeout 毫秒；没有在途请求时不必等
  wait(key: string, timeout: number): Promise<void> {
    if (!this.worker || this.ready.has(key) || !this.requested.has(key)) return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => {
        window.clearTimeout(timer);
        resolve();
      };
      const timer = window.setTimeout(done, timeout);
      const list = this.waiters.get(key) ?? [];
      list.push(done);
      this.waiters.set(key, list);
    });
  }

  destroy() {
    this.stop();
    this.listeners.clear();
  }

  private settle(key: string) {
    this.waiters.get(key)?.forEach((done) => done());
    this.waiters.delete(key);
  }

  private stop() {
    this.worker?.terminate();
    this.worker = null;
    this.requested.clear();
    [...this.waiters.keys()].forEach((k) => this.settle(k));
  }

  private post(msg: ProxyRequest) {
    this.worker?.postMessage(msg);
  }
}
