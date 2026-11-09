// 地图引擎：宣纸层 + 合成地图层 + 特效层。离屏分层缓存，交互中位图变换、静止后高质量重绘
import { zoom, zoomIdentity, type ZoomBehavior, type D3ZoomEvent } from 'd3-zoom';
import { select } from 'd3-selection';
import { interpolateZoom } from 'd3-interpolate';
import { easeCubicInOut } from 'd3-ease';
import type { LonLat, SnapshotMeta } from '@/types';
import { BASE_H, BASE_W, fitView, project, toBase, unproject, type View } from './projection';
import { loadBasemap, type Basemap } from './basemap';
import { SnapshotStore, type Polity, type Snapshot } from './snapshots';
import { paintPaper } from './paper';
import { assignColors, CINNABAR, PIGMENTS } from './palette';
import { warmWashTiles } from './wash';
import { drawBase, drawHover, drawPolities, drawWater, type Quality } from './render';
import { drawLabels, drawRiverLabels, layoutLabels, LABEL_FONT } from './labels';
import { Layer, composeLayer } from './layer';

export interface EnginePolicy {
  nameOf: (name: string, snapshotYear: number, year: number) => string | null;
  labelEpoch: (snapshotYear: number, year: number) => string;
  preferredColor: (name: string, year: number) => number | null;
  highlight: ((name: string, subj: string | undefined, year: number) => 0 | 1 | 2) | null;
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

export class MapEngine {
  readonly store = new SnapshotStore();
  view: View = { k: 1, x: 0, y: 0, width: 1, height: 1, dpr: 1 };
  padding: Padding = { left: 0, right: 0, top: 70, bottom: 150 };
  private paper = document.createElement('canvas');
  private canvas = document.createElement('canvas');
  private fx = document.createElement('canvas');
  private base: Basemap | null = null;
  private baseLayer = new Layer();
  private waterLayer = new Layer();
  private polLayers: [Layer, Layer] = [new Layer(), new Layer()];
  private labLayers: [Layer, Layer] = [new Layer(), new Layer()];
  private current: Snapshot | null = null;
  private previous: Snapshot | null = null;
  private fadeStart = 0;
  private year = 0;
  private hover: Polity | null = null;
  private zoomer: ZoomBehavior<HTMLCanvasElement, unknown>;
  private raf = 0;
  private interacting = false;
  private idleTimer = 0;
  private flight: { start: number; duration: number; interp: (t: number) => [number, number, number] } | null = null;
  private painters = new Set<FxPainter>();
  private viewListeners = new Set<(v: View) => void>();
  private snapshotListeners = new Set<(meta: SnapshotMeta) => void>();
  private loadToken = 0;
  private labelEpoch = '';
  private resizeObserver: ResizeObserver;
  private destroyed = false;

  constructor(private container: HTMLElement, private policy: EnginePolicy, private events: EngineEvents = {}) {
    for (const [c, cls] of [[this.paper, 'paper'], [this.canvas, 'map'], [this.fx, 'fx']] as const) {
      c.className = `map-canvas map-canvas--${cls}`;
      container.appendChild(c);
    }
    this.zoomer = zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.2, 40])
      .on('start', (e: D3ZoomEvent<HTMLCanvasElement, unknown>) => {
        if (e.sourceEvent) this.flight = null;
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
          this.interacting = false;
          this.kick();
        }, 140);
      });
    select(this.fx).call(this.zoomer).on('dblclick.zoom', null);
    this.fx.addEventListener('pointermove', this.handleMove);
    this.fx.addEventListener('pointerleave', () => this.setHover(null, [0, 0]));
    this.fx.addEventListener('click', this.handleClick);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize(true);
  }

  async init() {
    const [base] = await Promise.all([loadBasemap(), this.store.init()]);
    this.base = base;
    warmWashTiles(PIGMENTS, [0.3, 0.13]);
    warmWashTiles([CINNABAR], [0.4, 0.2]);
    await document.fonts.load(`20px ${LABEL_FONT}`, '黄河长江').catch(() => undefined);
    await this.setYear(this.year, true);
    this.events.onReady?.();
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.container.replaceChildren();
  }

  setPolicy(policy: Partial<EnginePolicy>) {
    this.policy = { ...this.policy, ...policy };
    if (this.current) this.recolor(this.current);
    if (this.previous) this.recolor(this.previous);
    this.invalidate();
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

  // 切换年份：若生效的切片变化则加载并淡入
  async setYear(year: number, immediate = false) {
    this.year = year;
    if (!this.store.index) return;
    const meta = this.store.metaFor(year);
    this.store.prefetch(this.store.nextMeta(meta));
    if (this.current?.meta.year === meta.year) {
      const epoch = this.policy.labelEpoch(meta.year, year);
      if (epoch !== this.labelEpoch) {
        this.labelEpoch = epoch;
        this.labLayers[1].invalidate();
        this.kick();
      }
      return;
    }
    const token = ++this.loadToken;
    const snap = await this.store.load(meta);
    if (token !== this.loadToken || this.destroyed) return;
    this.recolor(snap);
    await document.fonts.load(`20px ${LABEL_FONT}`, this.labelText(snap)).catch(() => undefined);
    if (token !== this.loadToken) return;
    this.previous = immediate ? null : this.current;
    this.current = snap;
    this.labelEpoch = this.policy.labelEpoch(meta.year, this.year);
    this.fadeStart = performance.now();
    this.polLayers.reverse();
    this.labLayers.reverse();
    this.polLayers[1].invalidate();
    this.labLayers[1].invalidate();
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

  private flyToBase(cx: number, cy: number, zoomLevel: number, duration: number) {
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
    this.flight = { start: performance.now(), duration: d, interp: toView };
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
    this.view = { ...prev, width, height, dpr, ...next };
    this.zoomer
      .scaleExtent([fit.k * 0.8, fit.k * 30])
      .translateExtent([[-BASE_W * 0.3, -BASE_H * 0.4], [BASE_W * 1.3, BASE_H * 1.4]]);
    select(this.fx).call(this.zoomer.transform, zoomIdentity.translate(next.x, next.y).scale(next.k));
    this.invalidate();
  }

  private invalidate() {
    for (const l of [this.baseLayer, this.waterLayer, ...this.polLayers, ...this.labLayers]) l.invalidate();
    this.kick();
  }

  private recolor(snap: Snapshot) {
    const y = snap.meta.year;
    const colors = assignColors(
      snap.polities.map((p) => p.name),
      snap.polities.map((p) => p.area),
      snap.neighbors,
      (name) => this.policy.preferredColor(name, y),
    );
    snap.polities.forEach((p, i) => (p.color = colors[i]));
  }

  private highlightSet(snap: Snapshot): Map<number, 1 | 2> | null {
    const h = this.policy.highlight;
    if (!h) return null;
    const map = new Map<number, 1 | 2>();
    for (const p of snap.polities) {
      const level = h(p.name, p.subj, snap.meta.year);
      if (level) map.set(p.index, level);
    }
    return map;
  }

  private labelText(snap: Snapshot) {
    return snap.polities.map((p) => this.policy.nameOf(p.name, snap.meta.year, snap.meta.year) ?? '').join('') + '楚汉三国魏蜀吴新东西晋南朝宋齐梁陈北周隋唐五代十国辽金蒙古夏藩俄德';
  }

  kick = () => {
    if (!this.raf && !this.destroyed) this.raf = requestAnimationFrame(this.frame);
  };

  private frame = (now: number) => {
    this.raf = 0;
    if (!this.base) return;
    let animating = false;
    if (this.flight) {
      const t = Math.min(1, (now - this.flight.start) / this.flight.duration);
      const [k, x, y] = this.flight.interp(easeCubicInOut(t));
      select(this.fx).call(this.zoomer.transform, zoomIdentity.translate(x, y).scale(k));
      if (t >= 1) {
        this.flight = null;
        this.interacting = false;
      }
      animating = true;
    }
    const quality: Quality = this.interacting ? 'fast' : 'full';
    this.renderLayers(quality);
    const fade = this.previous ? Math.min(1, (now - this.fadeStart) / FADE_MS) : 1;
    if (fade >= 1) this.previous = null;
    else animating = true;
    this.compose(fade);
    if (this.drawFx(now)) animating = true;
    if (animating || this.interacting) this.kick();
  };

  // 缓存失效或缩放差异过大时重绘图层；交互中只在缩放比偏离 1.6 倍以上时快速重绘
  private renderLayers(quality: Quality) {
    const base = this.base!;
    const v = this.view;
    let fullBudget = 1;
    const needs = (l: Layer) => {
      if (!l.needsRender(v, this.interacting, quality)) return false;
      if (quality === 'fast' || !l.view) return true;
      const sameView = l.view.k === v.k && l.view.x === v.x && l.view.y === v.y && l.view.width === v.width;
      if (!sameView) return true;
      if (fullBudget <= 0) {
        this.kick();
        return false;
      }
      fullBudget--;
      return true;
    };
    if (needs(this.baseLayer)) this.baseLayer.render(v, quality, (ctx) => drawBase(ctx, v, base, quality));
    if (needs(this.waterLayer)) this.waterLayer.render(v, quality, (ctx) => drawWater(ctx, v, base));
    const pairs: [Snapshot | null, Layer, Layer][] = [
      [this.current, this.polLayers[1], this.labLayers[1]],
      [this.previous, this.polLayers[0], this.labLayers[0]],
    ];
    for (const [snap, pl, ll] of pairs) {
      if (!snap) continue;
      const highlight = this.highlightSet(snap);
      const style = { colors: snap.polities.map((p) => p.color), highlight, highlightColor: this.policy.highlightColor };
      if (needs(pl)) pl.render(v, quality, (ctx) => drawPolities(ctx, v, base, snap, style, quality));
      if (needs(ll)) {
        ll.render(v, quality, (ctx) => {
          const specs = layoutLabels(snap, v, (n) => this.policy.nameOf(n, snap.meta.year, this.year), highlight);
          drawRiverLabels(ctx, base.riverLabels, v);
          drawLabels(ctx, specs, v.dpr);
        });
      }
    }
  }

  private compose(fade: number) {
    const ctx = this.canvas.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const v = this.view;
    composeLayer(ctx, this.baseLayer, v, 1);
    if (this.previous) composeLayer(ctx, this.polLayers[0], v, 1 - fade);
    composeLayer(ctx, this.polLayers[1], v, fade);
    composeLayer(ctx, this.waterLayer, v, 1);
    if (this.previous) composeLayer(ctx, this.labLayers[0], v, 1 - fade);
    composeLayer(ctx, this.labLayers[1], v, fade);
  }

  private drawFx(now: number): boolean {
    const ctx = this.fx.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.fx.width, this.fx.height);
    drawHover(ctx, this.view, this.hover);
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
