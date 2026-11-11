// 地图引擎：宣纸层 + 合成地图层 + 特效层。
//
// 静止时显示按当前视图精绘的“清晰图层”。镜头一动到清晰图层盖不住视口（飞行、拖拽、缩放），
// 就换上后台线程预先画好的“整幅世界代理纹理”：每帧只是把这张位图贴到当前视图，不再重绘矢量，
// 因此飞行的流畅度与政权数量、海岸线复杂度无关；停稳后为新视图重绘清晰图层，再淡入。
// 浏览器不支持所需能力时退回旧办法：缓存图层的位图变换 + 偏离过多时快速重绘
import { zoom, zoomIdentity, type ZoomBehavior, type D3ZoomEvent } from 'd3-zoom';
import { select } from 'd3-selection';
import { interpolateZoom } from 'd3-interpolate';
import { easeCubicInOut } from 'd3-ease';
import type { Lang, LonLat, SnapshotMeta } from '@/types';
import { BASE_H, BASE_W, fitView, project, toBase, unproject, type View } from './projection';
import { dataRoot, loadBasemap, type Basemap } from './basemap';
import { SnapshotStore, type Polity, type Snapshot } from './snapshots';
import { ProxySource, type ProxyHighlight } from './proxies';
import { paintPaper } from './paper';
import { CINNABAR, PIGMENTS } from './palette';
import { warmWashTiles } from './wash';
import { CHINA_SEA_SINCE, drawBase, drawHighlight, drawHover, drawPolities, drawWater, type Quality } from './render';
import { drawLabels, drawRiverLabels, drawSeaLabels, labelFont, layoutLabels, resetLabelMetrics } from './labels';
import { Layer, composeLayer, near } from './layer';

export interface EnginePolicy {
  lang: Lang;
  nameOf: (name: string, snapshotYear: number, year: number) => string | null;
  // 河流、岛礁等底图地名（数据中为中文）在当前语言下的写法
  placeName: (zh: string) => string | null;
  labelEpoch: (snapshotYear: number, year: number) => string;
  highlight: ((name: string, subj: string | undefined, year: number) => 0 | 1 | 2) | null;
  // 高亮方案的标识（如国家谱系 id）：同一切片在不同高亮方案下各有一张代理纹理
  highlightKey: string | null;
  highlightColor: string;
}

export interface EngineEvents {
  onView?: (view: View) => void;
  onHover?: (p: Polity | null, snap: SnapshotMeta | null, screen: [number, number]) => void;
  onClick?: (p: Polity | null, lonlat: LonLat | null) => void;
  onSnapshot?: (meta: SnapshotMeta) => void;
  onReady?: () => void;
}

export type FxPainter = (ctx: CanvasRenderingContext2D, view: View, now: number) => boolean;

export interface Padding {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const FADE_MS = 900;
const HOME_CENTER: LonLat = [85, 8];
const HOME_MAX_ZOOM = 3.2;

// 选中某国时其余政权退淡到的不透明度，及其过渡时长
const DIM = 0.42;
const DIM_MS = 260;

// 清晰图层让位给代理纹理、以及停稳后重新淡入的时长
const CROSS_OUT_MS = 170;
const CROSS_IN_MS = 240;
const LABEL_FADE_MS = 220;


// 起飞前等当前切片的代理纹理、飞行中换切片前等新切片的代理纹理，最多各等这么久
const FLIGHT_WAIT_MS = 360;
const SWAP_WAIT_MS = 480;

const approach = (value: number, target: number, step: number) => (value < target ? Math.min(target, value + step) : Math.max(target, value - step));

// 一张年代切片的全部图层：政权设色、高亮与标注（清晰图层），以及它的整幅世界代理纹理
class Slot {
  snap: Snapshot | null = null;
  readonly pol = new Layer();
  readonly hl = new Layer();
  readonly lab = new Layer();
  world: ImageBitmap | null = null;
  worldKey: string | null = null;
  levels: Map<number, 1 | 2> | null = null;
  levelsEpoch = -1;

  assign(snap: Snapshot) {
    this.snap = snap;
    this.pol.reset();
    this.hl.reset();
    this.lab.reset();
    this.levelsEpoch = -1;
  }

  show(bitmap: ImageBitmap, key: string) {
    this.world?.close();
    this.world = bitmap;
    this.worldKey = key;
  }
}

interface Scheme {
  key: string;
  level: NonNullable<EnginePolicy['highlight']>;
}

interface Flight {
  start: number;
  duration: number;
  interp: (t: number) => [number, number, number];
  dest: View;
}

export class MapEngine {
  readonly store = new SnapshotStore();
  readonly proxies = new ProxySource();
  view: View = { k: 1, x: 0, y: 0, width: 1, height: 1, dpr: 1 };
  padding: Padding = { left: 0, right: 0, top: 70, bottom: 150 };
  private paper = document.createElement('canvas');
  private canvas = document.createElement('canvas');
  private fx = document.createElement('canvas');
  private base: Basemap | null = null;
  private baseLayer = new Layer();
  private waterLayer = new Layer(false);
  // [淡出中的前一张, 当前]
  private slots: [Slot, Slot] = [new Slot(), new Slot()];
  private fadeStart = 0;
  private year = 0;
  private hover: Polity | null = null;
  private zoomer: ZoomBehavior<HTMLCanvasElement, unknown>;
  private raf = 0;
  private lastFrame = 0;
  private interacting = false;
  private idleTimer = 0;
  private flight: Flight | null = null;
  private queued: { cx: number; cy: number; zoomLevel: number; duration: number; deadline: number } | null = null;
  private painters = new Set<FxPainter>();
  private viewListeners = new Set<(v: View) => void>();
  private snapshotListeners = new Set<(meta: SnapshotMeta) => void>();
  private loadToken = 0;
  private labelEpoch = '';
  private policyEpoch = 0;
  // 图层每重绘一次加一；与视图、淡入进度等一起构成“画面是否有变”的判据
  private renderEpoch = 0;
  private composed = '';
  private dim = 1;
  private crispAlpha = 1;
  private labelAlpha = 1;
  private resizeObserver: ResizeObserver;
  private unsubscribeProxies: () => void;
  private destroyed = false;

  constructor(private container: HTMLElement, private policy: EnginePolicy, private events: EngineEvents = {}) {
    for (const [c, cls] of [[this.paper, 'paper'], [this.canvas, 'map'], [this.fx, 'fx']] as const) {
      c.className = `map-canvas map-canvas--${cls}`;
      container.appendChild(c);
    }
    this.zoomer = zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.2, 40])
      .on('start', (e: D3ZoomEvent<HTMLCanvasElement, unknown>) => {
        if (e.sourceEvent) {
          this.flight = null;
          this.queued = null;
        }
        this.interacting = true;
      })
      .on('zoom', (e: D3ZoomEvent<HTMLCanvasElement, unknown>) => {
        this.view = { ...this.view, k: e.transform.k, x: e.transform.x, y: e.transform.y };
        this.events.onView?.(this.view);
        this.viewListeners.forEach((l) => l(this.view));
        this.kick();
      })
      .on('end', () => {
        window.clearTimeout(this.idleTimer);
        this.idleTimer = window.setTimeout(() => {
          this.interacting = this.flight !== null;
          this.kick();
        }, 140);
      });
    select(this.fx).call(this.zoomer).on('dblclick.zoom', null);
    this.fx.addEventListener('pointermove', this.handleMove);
    this.fx.addEventListener('pointerleave', () => this.setHover(null, [0, 0]));
    this.fx.addEventListener('click', this.handleClick);
    this.unsubscribeProxies = this.proxies.subscribe(this.kick);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize(true);
  }

  async init() {
    this.proxies.start(this.view.width, this.view.dpr);
    const [base] = await Promise.all([loadBasemap(dataRoot(), window.innerWidth > 1000 ? 4096 : 2048), this.store.init()]);
    this.base = base;
    warmWashTiles(PIGMENTS, [0.3, 0.13]);
    warmWashTiles([CINNABAR], [0.42, 0.2]);
    await this.loadFonts('黄河长江');
    await this.setYear(this.year, true);
    this.events.onReady?.();
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    window.clearTimeout(this.idleTimer);
    this.resizeObserver.disconnect();
    this.unsubscribeProxies();
    this.proxies.destroy();
    this.store.destroy();
    this.container.replaceChildren();
  }

  // 换国家高亮只影响高亮层、标注层与合成时的退淡，政权设色层不必重绘
  setPolicy(policy: Partial<EnginePolicy>) {
    const langChanged = policy.lang !== undefined && policy.lang !== this.policy.lang;
    this.policy = { ...this.policy, ...policy };
    this.policyEpoch++;
    for (const slot of this.slots) {
      slot.hl.invalidate();
      slot.lab.invalidate();
    }
    if (langChanged) {
      resetLabelMetrics();
      void this.loadFonts('Abc').then(() => {
        resetLabelMetrics();
        this.slots.forEach((s) => s.lab.invalidate());
        this.kick();
      });
    }
    this.kick();
  }

  setPadding(p: Partial<Padding>) {
    this.padding = { ...this.padding, ...p };
  }

  subscribeView(cb: (v: View) => void) {
    this.viewListeners.add(cb);
    cb(this.view);
    return () => {
      this.viewListeners.delete(cb);
    };
  }

  // 当前切片中高亮政权（一级）的范围，基准平面坐标
  highlightBounds(): [number, number, number, number] | null {
    const snap = this.current;
    const h = this.policy.highlight;
    if (!snap || !h) return null;
    let box: [number, number, number, number] | null = null;
    for (const p of snap.polities) {
      if (h(p.name, p.subj, snap.meta.year) !== 1) continue;
      box = box ? [Math.min(box[0], p.bbox[0]), Math.min(box[1], p.bbox[1]), Math.max(box[2], p.bbox[2]), Math.max(box[3], p.bbox[3])] : [...p.bbox];
    }
    return box;
  }

  flyToBox(box: [number, number, number, number], maxZoom = 6, duration = 1600) {
    const { width, height } = this.focusSize();
    const k = Math.min((width * 0.8) / Math.max(1, box[2] - box[0]), (height * 0.78) / Math.max(1, box[3] - box[1]));
    this.flyToBase((box[0] + box[2]) / 2, (box[1] + box[3]) / 2, Math.min(maxZoom, Math.max(1, k / this.fitK())), duration);
  }

  get zoomLevel(): number {
    return this.view.k / this.fitK();
  }

  addPainter(p: FxPainter) {
    this.painters.add(p);
    this.kick();
    return () => {
      this.painters.delete(p);
      this.kick();
    };
  }

  // 提前备好某一年生效的切片及其代理纹理（如鼠标移到某国条目上时），可指定届时要用的高亮方案
  prefetchYear(year: number, scheme?: { key: string; level: NonNullable<EnginePolicy['highlight']> }) {
    if (this.store.index) this.prefetch(this.store.metaFor(year), scheme ?? this.scheme());
  }

  // 切换年份：若生效的切片变化则加载并淡入
  async setYear(year: number, immediate = false) {
    this.year = year;
    if (!this.store.index || this.destroyed) return;
    const meta = this.store.metaFor(year);
    this.prefetch(this.store.nextMeta(meta));
    const cur = this.slots[1];
    if (cur.snap?.meta.year === meta.year) {
      const epoch = this.policy.labelEpoch(meta.year, year);
      if (epoch !== this.labelEpoch) {
        this.labelEpoch = epoch;
        cur.lab.invalidate();
        this.kick();
      }
      return;
    }
    const token = ++this.loadToken;
    const snap = await this.store.load(meta);
    if (token !== this.loadToken || this.destroyed) return;
    const key = this.requestProxy(snap, true, this.scheme());
    await this.loadFonts(this.labelText(snap));
    if (token !== this.loadToken) return;
    // 正在飞行时等新切片的代理纹理到了再换，免得半途退回逐帧重绘
    if ((this.flight || this.queued) && this.proxies.active) {
      await this.proxies.wait(key, SWAP_WAIT_MS);
      if (token !== this.loadToken || this.destroyed) return;
    }
    this.slots.reverse();
    this.slots[1].assign(snap);
    if (immediate) this.slots[0].snap = null;
    this.labelEpoch = this.policy.labelEpoch(meta.year, this.year);
    this.fadeStart = performance.now();
    this.events.onSnapshot?.(meta);
    this.snapshotListeners.forEach((l) => l(meta));
    this.kick();
  }

  subscribeSnapshot(cb: (meta: SnapshotMeta) => void) {
    this.snapshotListeners.add(cb);
    if (this.current) cb(this.current.meta);
    return () => {
      this.snapshotListeners.delete(cb);
    };
  }

  get snapshot(): Snapshot | null {
    return this.current;
  }

  // 飞行到经纬度：zoom 为相对“全图适配”的倍数
  flyTo(center: LonLat, zoomLevel: number, duration = 1600) {
    const [cx, cy] = project(center);
    this.flyToBase(cx, cy, zoomLevel, duration);
  }

  flyToBounds(lonlats: LonLat[], maxZoom = 6, duration = 1600) {
    const pts = lonlats.map(project);
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const { width, height } = this.focusSize();
    const fit = this.fitK();
    const k = Math.min((width * 0.78) / Math.max(1, x1 - x0), (height * 0.74) / Math.max(1, y1 - y0));
    this.flyToBase((x0 + x1) / 2, (y0 + y1) / 2, Math.min(maxZoom, k / fit), duration);
  }

  resetView(duration = 1400) {
    this.flyToBase(...this.home(this.view.width, this.view.height), duration);
  }

  zoomBy(factor: number) {
    const { width, height } = this.view;
    this.flyToBase(...toBase(this.view, [width / 2, height / 2]), (this.view.k * factor) / this.fitK(), 450);
  }

  lonlatAt(screen: [number, number]): LonLat | null {
    return unproject(toBase(this.view, screen));
  }

  private get current(): Snapshot | null {
    return this.slots[1].snap;
  }

  // 当前的高亮方案
  private scheme(): Scheme | null {
    const { highlight, highlightKey } = this.policy;
    return highlight && highlightKey ? { key: highlightKey, level: highlight } : null;
  }

  private proxyKey(snap: Snapshot, scheme: Scheme | null = this.scheme()) {
    return `${snap.year}|${scheme?.key ?? ''}`;
  }

  // 向后台线程索取某张切片在某高亮方案下的整幅世界位图，返回其标识
  private requestProxy(snap: Snapshot, urgent: boolean, scheme: Scheme | null): string {
    const key = this.proxyKey(snap, scheme);
    if (!this.proxies.active) return key;
    let highlight: ProxyHighlight | null = null;
    if (scheme) {
      const levels: [number, 1 | 2][] = [];
      for (const p of snap.polities) {
        const level = scheme.level(p.name, p.subj, snap.meta.year);
        if (level) levels.push([p.index, level]);
      }
      highlight = { levels, color: this.policy.highlightColor, dim: DIM };
    }
    this.proxies.request(key, snap.meta, urgent, highlight);
    return key;
  }

  private prefetch(meta: SnapshotMeta | null, scheme: Scheme | null = this.scheme()) {
    if (!meta) return;
    const go = () => void this.store.load(meta).then((snap) => this.requestProxy(snap, false, scheme));
    if (this.store.has(meta)) go();
    else (window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200)))(go);
  }

  private loadFonts(text: string) {
    const lang = this.policy.lang;
    return document.fonts.load(`${lang === 'zh' ? '' : '500 '}20px ${labelFont(lang)}`, text).catch(() => undefined);
  }

  // 起始视图：竖屏时全图按宽度适配会过小，改为放大到填满可用高度，横向以欧亚大陆为中心
  private home(width: number, height: number): [number, number, number] {
    const { top, bottom } = this.padding;
    const fill = (height - top - bottom) / BASE_H / fitView(width, height, top, bottom).k;
    if (fill < 1.3) return [BASE_W / 2, BASE_H / 2, 1];
    const [cx, cy] = project(HOME_CENTER);
    return [cx, cy, Math.min(HOME_MAX_ZOOM, fill * 0.97)];
  }

  private fitK() {
    return fitView(this.view.width, this.view.height, this.padding.top, this.padding.bottom).k;
  }

  private focusSize() {
    const { left, right, top, bottom } = this.padding;
    return { width: this.view.width - left - right, height: this.view.height - top - bottom };
  }

  // 当前切片的代理纹理还没到时，先等一小会儿再起飞：整段飞行就都能交给合成器
  private flyToBase(cx: number, cy: number, zoomLevel: number, duration: number) {
    if (this.proxies.active && this.current && !this.proxyReady()) {
      this.queued = { cx, cy, zoomLevel, duration, deadline: performance.now() + FLIGHT_WAIT_MS };
      this.kick();
      return;
    }
    this.queued = null;
    this.beginFlight(cx, cy, zoomLevel, duration);
  }

  private beginFlight(cx: number, cy: number, zoomLevel: number, duration: number) {
    const { left, top } = this.padding;
    const { width, height } = this.focusSize();
    const k1 = this.fitK() * zoomLevel;
    const cur = this.view;
    const cx0 = (left + width / 2 - cur.x) / cur.k;
    const cy0 = (top + height / 2 - cur.y) / cur.k;
    const interp = interpolateZoom([cx0, cy0, width / cur.k], [cx, cy, width / k1]);
    const d = Math.max(300, Math.min(duration * 1.4, Math.max(duration, interp.duration * 0.9)));
    const toView = (t: number): [number, number, number] => {
      const [x, y, w] = interp(t);
      const k = width / w;
      return [k, left + width / 2 - x * k, top + height / 2 - y * k];
    };
    const [k, x, y] = toView(1);
    this.flight = { start: performance.now(), duration: d, interp: toView, dest: { ...cur, k, x, y } };
    this.interacting = true;
    this.kick();
  }

  // 窗口变化时保持相对“全图适配”的缩放倍数与焦点中心
  private resize(first = false) {
    const rect = this.container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    for (const c of [this.canvas, this.fx]) {
      c.width = Math.round(width * dpr);
      c.height = Math.round(height * dpr);
    }
    paintPaper(this.paper, width, height, dpr);
    // 画布尺寸一改内容即被清空，须重新合成
    this.composed = '';
    const prev = this.view;
    const { top, bottom } = this.padding;
    const fit = fitView(width, height, top, bottom);
    let next = { k: fit.k, x: fit.x, y: fit.y };
    if (first) {
      const [cx, cy, zoomLevel] = this.home(width, height);
      const k = fit.k * zoomLevel;
      next = { k, x: width / 2 - cx * k, y: (top + height - bottom) / 2 - cy * k };
    } else if (prev.width > 1) {
      const prevFit = fitView(prev.width, prev.height, top, bottom);
      const center = toBase(prev, [prev.width / 2, (top + prev.height - bottom) / 2]);
      const k = fit.k * (prev.k / prevFit.k);
      next = { k, x: width / 2 - center[0] * k, y: (top + height - bottom) / 2 - center[1] * k };
    }
    this.flight = null;
    this.queued = null;
    this.view = { ...prev, width, height, dpr, ...next };
    // 显式给出视口范围：默认的 extent 每次变换都读 clientWidth，飞行中逐帧触发强制同步布局
    this.zoomer
      .extent([[0, 0], [width, height]])
      .scaleExtent([fit.k * 0.8, fit.k * 30])
      .translateExtent([[-BASE_W * 0.3, -BASE_H * 0.4], [BASE_W * 1.3, BASE_H * 1.4]]);
    select(this.fx).call(this.zoomer.transform, zoomIdentity.translate(next.x, next.y).scale(next.k));
    this.invalidate();
  }

  private invalidate() {
    for (const l of [this.baseLayer, this.waterLayer, ...this.slots.flatMap((s) => [s.pol, s.hl, s.lab])]) l.invalidate();
    this.kick();
  }

  private levelsOf(slot: Slot): Map<number, 1 | 2> | null {
    const h = this.policy.highlight;
    const snap = slot.snap;
    if (!h || !snap) return null;
    if (slot.levelsEpoch !== this.policyEpoch) {
      const map = new Map<number, 1 | 2>();
      for (const p of snap.polities) {
        const level = h(p.name, p.subj, snap.meta.year);
        if (level) map.set(p.index, level);
      }
      slot.levels = map;
      slot.levelsEpoch = this.policyEpoch;
    }
    return slot.levels;
  }

  private labelText(snap: Snapshot) {
    if (this.policy.lang !== 'zh') return 'Abc';
    return snap.polities.map((p) => this.policy.nameOf(p.name, snap.meta.year, snap.meta.year) ?? '').join('') + '楚汉三国魏蜀吴新东西晋南朝宋齐梁陈北周隋唐五代十国辽金蒙古夏藩俄德';
  }

  kick = () => {
    if (!this.raf && !this.destroyed) this.raf = requestAnimationFrame(this.frame);
  };

  private proxied(slot: Slot): boolean {
    return !!slot.snap && slot.world !== null && slot.worldKey === this.proxyKey(slot.snap);
  }

  // 代理纹理是否足以承担当前画面：当前切片在当前高亮方案下的位图已就位，且退淡的过渡已完成
  private proxyReady(): boolean {
    return this.proxies.active && this.proxied(this.slots[1]) && this.dim === (this.policy.highlight ? DIM : 1);
  }

  // 把后台线程送达的位图移交给显示画布；缺的再去要
  private adoptProxies() {
    if (!this.proxies.active) return;
    this.slots.forEach((slot, i) => {
      if (!slot.snap || this.proxied(slot)) return;
      const key = this.proxyKey(slot.snap);
      const bitmap = this.proxies.take(key);
      if (bitmap) slot.show(bitmap, key);
      else if (i === 1) this.requestProxy(slot.snap, true, this.scheme());
    });
  }

  private frame = (now: number) => {
    this.raf = 0;
    const base = this.base;
    if (!base) return;
    const dt = Math.min(80, now - (this.lastFrame || now));
    this.lastFrame = now;
    let busy = false;

    if (this.queued) {
      if (this.proxyReady() || now >= this.queued.deadline) {
        const q = this.queued;
        this.queued = null;
        this.beginFlight(q.cx, q.cy, q.zoomLevel, q.duration);
      } else busy = true;
    }

    if (this.flight) {
      const t = Math.min(1, (now - this.flight.start) / this.flight.duration);
      const [k, x, y] = this.flight.interp(easeCubicInOut(t));
      select(this.fx).call(this.zoomer.transform, zoomIdentity.translate(x, y).scale(k));
      if (t >= 1) {
        this.flight = null;
        this.interacting = false;
      }
      busy = true;
    }

    const v = this.view;
    const [prev, cur] = this.slots;
    let fade = 1;
    if (prev.snap) {
      fade = Math.min(1, (now - this.fadeStart) / FADE_MS);
      if (fade >= 1) prev.snap = null;
      else busy = true;
    }
    const dimTarget = this.policy.highlight ? DIM : 1;
    if (this.dim !== dimTarget) {
      this.dim = approach(this.dim, dimTarget, (dt / DIM_MS) * (1 - DIM));
      busy = true;
    }

    this.adoptProxies();
    const proxy = this.proxyReady();
    const moving = this.interacting;

    // 有代理纹理时，清晰图层等镜头停稳后再重绘：重绘再慢也只发生在画面静止的时候
    if (this.upkeep(base, v, moving, proxy, fade)) busy = true;

    // 清晰图层的去留：各层都已画好且盖得住当前视口就显示，否则让位给代理纹理

    const lit = this.policy.highlight !== null;
    const covers = [this.baseLayer, this.waterLayer, cur.pol, ...(lit ? [cur.hl] : [])].every((l) => near(l.view, v, 0.72, 1.45, 0.006));
    if (!proxy) this.crispAlpha = 1;
    else {
      const want = covers ? 1 : 0;
      this.crispAlpha = approach(this.crispAlpha, want, dt / (want ? CROSS_IN_MS : CROSS_OUT_MS));
      if (this.crispAlpha !== want) busy = true;
    }
    // 标注随视图排布：偏离不多时跟着位图平移缩放，偏离多了就淡出，停稳重排后再淡入
    const labelWant = !proxy || near(cur.lab.view, v, 0.8, 1.25, 0.2) ? 1 : 0;
    this.labelAlpha = approach(this.labelAlpha, labelWant, dt / LABEL_FADE_MS);
    if (this.labelAlpha !== labelWant) busy = true;

    // 地图画面没有变化时不必重新合成（例如只有特效层上的路线在动）
    const state = `${v.k}|${v.x}|${v.y}|${v.width}|${v.height}|${fade}|${this.dim}|${this.crispAlpha}|${this.labelAlpha}|${proxy}|${this.renderEpoch}|${this.policyEpoch}|${cur.worldKey}|${prev.worldKey}|${cur.snap?.year}|${prev.snap?.year}`;
    if (state !== this.composed) {
      this.composed = state;
      this.compose(v, fade, proxy);
    }
    if (this.drawFx(now)) busy = true;
    if (busy || this.interacting) this.kick();
  };

  // 维护各图层：每帧至多重绘一层，把开销摊到多帧。返回是否还有待办
  private upkeep(base: Basemap, v: View, moving: boolean, proxy: boolean, fade: number): boolean {
    if (moving && proxy) return false;
    const [prev, cur] = this.slots;
    // 没有代理纹理而镜头在动：沿用缓存位图，偏离过多时以快速画质应急重绘
    const quality: Quality = moving ? 'fast' : 'full';
    const jobs: { layer: Layer; draw: (ctx: CanvasRenderingContext2D) => void }[] = [];
    const add = (layer: Layer, draw: (ctx: CanvasRenderingContext2D) => void) => jobs.push({ layer, draw });
    const snap = cur.snap;
    const levels = this.levelsOf(cur);

    // 高亮是疆域模式的主角，排在最前；标注排在底图之前：底图的近岸水纹最费时，先让地名出来

    if (snap && levels) add(cur.hl, (ctx) => drawHighlight(ctx, v, base, snap, levels, this.policy.highlightColor, quality));
    if (snap) add(cur.pol, (ctx) => drawPolities(ctx, v, base, snap, quality));
    add(this.waterLayer, (ctx) => drawWater(ctx, v, base));
    if (snap) add(cur.lab, (ctx) => this.drawLabelLayer(ctx, cur, snap, base, v, quality));
    add(this.baseLayer, (ctx) => drawBase(ctx, v, base, quality));
    if (prev.snap && fade < 1 && !moving) {
      const old = prev.snap;
      add(prev.pol, (ctx) => drawPolities(ctx, v, base, old, quality));
    }

    const due = jobs.filter((j) => j.layer.needsRender(v, moving, quality));
    if (due.length) {
      due[0].layer.render(v, quality, due[0].draw);
      this.renderEpoch++;
    }
    return due.length > 1;
  }

  private drawLabelLayer(ctx: CanvasRenderingContext2D, slot: Slot, snap: Snapshot, base: Basemap, at: View, quality: Quality) {
    const { lang, placeName } = this.policy;
    const specs = layoutLabels(snap, at, lang, (n) => this.policy.nameOf(n, snap.meta.year, this.year), this.levelsOf(slot));
    drawRiverLabels(ctx, base.riverLabels, at, lang, placeName);
    if (base.chinaSea && snap.year >= CHINA_SEA_SINCE) drawSeaLabels(ctx, base.chinaSea, at, lang, placeName);
    drawLabels(ctx, specs, at.dpr, quality === 'full');
  }

  // 合成一帧。清晰图层与代理纹理按权重相加（权重之和恒为 1），交叉淡入淡出时画面不会忽明忽暗
  private compose(v: View, fade: number, proxy: boolean) {
    const ctx = this.canvas.getContext('2d')!;
    const [prev, cur] = this.slots;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const fading = prev.snap !== null && fade < 1;
    const a = proxy ? this.crispAlpha : 1;

    if (a > 0) {
      composeLayer(ctx, this.baseLayer, v, 1);
      if (fading) composeLayer(ctx, prev.pol, v, (1 - fade) * this.dim);
      composeLayer(ctx, cur.pol, v, (fading ? fade : 1) * this.dim);
      composeLayer(ctx, this.waterLayer, v, 1);
      // 高亮像一层朱砂淡彩罩在画上：以正片叠底合成，河流与海岸线仍透出来
      if (this.policy.highlight) {
        ctx.globalCompositeOperation = 'multiply';
        if (fading) composeLayer(ctx, prev.hl, v, 1 - fade);
        composeLayer(ctx, cur.hl, v, fading ? fade : 1);
      }
      if (a < 1) {
        // 把已画的清晰图层整体乘以 a
        ctx.globalCompositeOperation = 'destination-in';
        ctx.fillStyle = `rgba(0, 0, 0, ${a})`;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }

    // 代理纹理已含退淡与高亮；清晰图层不显示时不必相加，直接铺上去更省

    if (proxy && a < 1) {
      const weight = 1 - a;
      const prevShare = fading && this.proxied(prev) ? 1 - fade : 0;
      ctx.globalCompositeOperation = a > 0 || prevShare > 0 ? 'lighter' : 'source-over';
      ctx.setTransform(v.k * v.dpr, 0, 0, v.k * v.dpr, v.x * v.dpr, v.y * v.dpr);
      const paint = (bitmap: ImageBitmap | null, alpha: number) => {
        if (!bitmap || alpha <= 0.002) return;
        ctx.globalAlpha = alpha;
        ctx.drawImage(bitmap, 0, 0, BASE_W, BASE_H);
      };
      paint(prev.world, weight * prevShare);
      paint(cur.world, weight * (1 - prevShare));
      ctx.globalAlpha = 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    ctx.globalCompositeOperation = 'source-over';
    if (fading) composeLayer(ctx, prev.lab, v, this.labelAlpha * (1 - fade));
    composeLayer(ctx, cur.lab, v, this.labelAlpha * (fading ? fade : 1));
  }

  private drawFx(now: number): boolean {
    const ctx = this.fx.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.fx.width, this.fx.height);
    drawHover(ctx, this.view, this.hover?.path ?? null);
    let more = false;
    for (const p of this.painters) if (p(ctx, this.view, now)) more = true;
    return more;
  }

  private pick(screen: [number, number]): Polity | null {
    const snap = this.current;
    if (!snap) return null;
    const [bx, by] = toBase(this.view, screen);
    const ctx = this.fx.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    let best: Polity | null = null;
    for (const p of snap.polities) {
      if (bx < p.bbox[0] || bx > p.bbox[2] || by < p.bbox[1] || by > p.bbox[3]) continue;
      if (ctx.isPointInPath(p.path, bx, by) && (!best || p.area < best.area)) best = p;
    }
    return best;
  }

  private setHover(p: Polity | null, screen: [number, number]) {
    if (p === this.hover) {
      if (p) this.events.onHover?.(p, this.current?.meta ?? null, screen);
      return;
    }
    this.hover = p;
    this.events.onHover?.(p, this.current?.meta ?? null, screen);
    this.kick();
  }

  private handleMove = (e: PointerEvent) => {
    if (e.buttons) return;
    const r = this.fx.getBoundingClientRect();
    const screen: [number, number] = [e.clientX - r.left, e.clientY - r.top];
    this.setHover(this.pick(screen), screen);
  };

  private handleClick = (e: MouseEvent) => {
    const r = this.fx.getBoundingClientRect();
    const screen: [number, number] = [e.clientX - r.left, e.clientY - r.top];
    this.events.onClick?.(this.pick(screen), this.lonlatAt(screen));
  };
}
