// 配乐：不用音频文件，由 Web Audio 实时生成的一段没有尽头的“散板”——
// 拨弦（物理建模的弦振动）在五声或七声音阶上即兴，偶尔一声箫，底下铺一层若有若无的持续音，整体带一点混响。
// 调式与音色随镜头所在的地域变化：东亚用羽调与古琴般的低沉拨弦，日本用都节音阶，南亚用拉格式的七声并加重持续音，
// 西亚北非用希贾兹调式，欧洲用多利亚调式，草原用宫调五声，其余地方用小调五声与短促明亮的拨弦。
// 所有声音都按“从 t 时刻起往后排若干秒”的方式调度，因此既能实时播放，也能离线渲染成一段音频做检查
export type Region = 'east' | 'japan' | 'south' | 'west' | 'europe' | 'steppe' | 'far';

interface Mode {
  // 主音（MIDI 音高）与音阶（相对主音的半音数）
  root: number;
  scale: number[];
  // 拨弦音色：明亮度（0—1）与余音长度（秒）
  bright: number;
  sustain: number;
  // 持续音音量、每句之后吹一声箫的概率、乐句之间的停顿（秒）
  drone: number;
  flute: number;
  rest: [number, number];
}

const MODES: Record<Region, Mode> = {
  east: { root: 50, scale: [0, 3, 5, 7, 10], bright: 0.22, sustain: 4.2, drone: 0.5, flute: 0.3, rest: [2.6, 5.5] },
  japan: { root: 50, scale: [0, 1, 5, 7, 10], bright: 0.42, sustain: 2.8, drone: 0.3, flute: 0.25, rest: [3, 6] },
  south: { root: 49, scale: [0, 1, 4, 5, 7, 8, 11], bright: 0.55, sustain: 3.2, drone: 1, flute: 0.12, rest: [2, 4.5] },
  west: { root: 50, scale: [0, 1, 4, 5, 7, 8, 10], bright: 0.3, sustain: 1.9, drone: 0.6, flute: 0.3, rest: [2.2, 4.8] },
  europe: { root: 50, scale: [0, 2, 3, 5, 7, 9, 10], bright: 0.4, sustain: 2.6, drone: 0.4, flute: 0.22, rest: [2.4, 5] },
  steppe: { root: 43, scale: [0, 2, 4, 7, 9], bright: 0.3, sustain: 3.4, drone: 0.9, flute: 0.35, rest: [3, 6] },
  far: { root: 45, scale: [0, 3, 5, 7, 10], bright: 0.62, sustain: 1.5, drone: 0.35, flute: 0.15, rest: [2.4, 5] },
};

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

// 可复现的随机数：离线检查时同一种子得到同一段音乐
function mulberry(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let r = Math.imul(s ^ (s >>> 15), 1 | s);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export class Ambience {
  private master: GainNode;
  private dry: GainNode;
  private wet: GainNode;
  private droneGain: GainNode;
  private drones: OscillatorNode[] = [];
  private plucks = new Map<string, AudioBuffer>();
  private rand: () => number;
  private region: Region = 'east';
  private mode = MODES.east;
  // 旋律当前所在的音级（跨两个八度）与上一句的音型
  private degree = 4;
  private motif: number[] = [];
  private nextPhrase = 0;
  private level = 0;

  constructor(readonly ctx: BaseAudioContext, seed = Date.now()) {
    this.rand = mulberry(seed);
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -14;
    limiter.knee.value = 12;
    limiter.ratio.value = 6;
    limiter.attack.value = 0.004;
    limiter.release.value = 0.3;
    this.master.connect(limiter).connect(ctx.destination);

    this.dry = ctx.createGain();
    this.dry.gain.value = 0.78;
    this.dry.connect(this.master);
    const reverb = ctx.createConvolver();
    reverb.buffer = this.impulse(3.4);
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.34;
    this.wet.connect(reverb).connect(this.master);

    // 持续音：主音与其上方五度，各带极缓慢的音量起伏
    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 420;
    this.droneGain.connect(tone);
    tone.connect(this.dry);
    tone.connect(this.wet);
    [0, 7, 12].forEach((interval, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 2 ? 'triangle' : 'sine';
      osc.frequency.value = hz(this.mode.root - 12 + interval);
      const gain = ctx.createGain();
      gain.gain.value = [0.5, 0.3, 0.12][i];
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + i * 0.023;
      const depth = ctx.createGain();
      depth.gain.value = gain.gain.value * 0.45;
      lfo.connect(depth).connect(gain.gain);
      osc.connect(gain).connect(this.droneGain);
      osc.start();
      lfo.start();
      this.drones.push(osc);
    });
    this.nextPhrase = ctx.currentTime + 0.6;
  }

  // 总音量渐变（0 为静音）
  fade(level: number, seconds = 1.2) {
    this.level = level;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(level, now, seconds / 3);
  }

  get audible(): boolean {
    return this.level > 0;
  }

  // 换地域：下一句起改用新的调式与音色，持续音缓缓滑到新的主音
  setRegion(region: Region) {
    if (region === this.region) return;
    this.region = region;
    this.mode = MODES[region];
    this.degree = Math.min(this.degree, this.mode.scale.length * 2 - 1);
    this.motif = [];
    const now = this.ctx.currentTime;
    [0, 7, 12].forEach((interval, i) => this.drones[i].frequency.setTargetAtTime(hz(this.mode.root - 12 + interval), now, 1.6));
  }

  // 把直到 until 时刻为止该开始的乐句排进时间线；实时播放时每隔一小会儿调用一次
  schedule(until: number) {
    const now = this.ctx.currentTime;
    this.droneGain.gain.setTargetAtTime(0.13 * this.mode.drone, now, 2.5);
    while (this.nextPhrase < until) this.nextPhrase = this.phrase(Math.max(this.nextPhrase, now + 0.05));
  }

  // 大事停驻时的一声磬：三个不成整数比的泛音，各自衰减，音高取当前调式的主音或五度
  chime() {
    const { ctx } = this;
    const t = ctx.currentTime + 0.02;
    const base = hz(this.mode.root + 12 + (this.rand() < 0.5 ? 0 : 7));
    [
      [1, 0.2, 2.6],
      [2.76, 0.09, 1.5],
      [5.4, 0.04, 0.8],
    ].forEach(([ratio, gain, decay]) => {
      const osc = ctx.createOscillator();
      osc.frequency.value = base * ratio;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(gain, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      osc.connect(g);
      g.connect(this.dry);
      g.connect(this.wet);
      osc.start(t);
      osc.stop(t + decay + 0.05);
    });
  }

  private freq(degree: number): number {
    const { scale, root } = this.mode;
    const n = scale.length;
    return hz(root + scale[((degree % n) + n) % n] + 12 * Math.floor(degree / n));
  }

  // 一个乐句：三到七个音的级进为主的线条，时而重复上一句的音型，最后落在主音或五度上；返回下一句的起始时刻
  private phrase(t0: number): number {
    const { mode, rand } = this;
    const n = mode.scale.length;
    const top = n * 2;
    let t = t0;
    if (rand() < 0.35) {
      this.pluck(mode.root - 12, t, 0.5, false);
      t += 0.7 + rand() * 0.6;
    }
    const steps = this.motif.length && rand() < 0.4 ? this.motif : Array.from({ length: 3 + Math.floor(rand() * 5) }, () => [-2, -1, -1, 0, 1, 1, 2, 3][Math.floor(rand() * 8)]);
    this.motif = steps;
    steps.forEach((step, i) => {
      this.degree = Math.max(0, Math.min(top, this.degree + step));
      const long = rand() < 0.3;
      const dur = long ? 1.5 + rand() * 0.9 : 0.55 + rand() * 0.6;
      const vel = 0.42 + rand() * 0.3 + (i === 0 ? 0.12 : 0);
      this.pluckDegree(this.degree, t, vel, long || rand() < 0.25);
      // 偶尔叠一个高八度的泛音
      if (rand() < 0.14) this.pluckDegree(this.degree + n, t + 0.03, vel * 0.35, false);
      t += dur;
    });
    // 收束：就近落到主音或五度
    const fifth = mode.scale.indexOf(7);
    const anchors = [0, n, top, ...(fifth > 0 ? [fifth, fifth + n] : [])];
    this.degree = anchors.reduce((a, b) => (Math.abs(b - this.degree) < Math.abs(a - this.degree) ? b : a));
    this.pluckDegree(this.degree, t, 0.5, true);
    t += 1.4;
    if (rand() < mode.flute) this.flute(t - 0.4);
    return t + mode.rest[0] + rand() * (mode.rest[1] - mode.rest[0]);
  }

  private pluckDegree(degree: number, t: number, velocity: number, bend: boolean) {
    this.pluckHz(this.freq(degree), t, velocity, bend);
  }

  private pluck(midi: number, t: number, velocity: number, bend: boolean) {
    this.pluckHz(hz(midi), t, velocity, bend);
  }

  // 拨一下弦。bend：像古琴的吟猱，起音略低，滑到本音后带一点渐弱的颤动
  private pluckHz(freq: number, t: number, velocity: number, bend: boolean) {
    const { ctx, mode } = this;
    const { buffer, rate } = this.string(freq);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    if (bend) {
      const curve = new Float32Array(48);
      for (let i = 0; i < curve.length; i++) {
        const u = i / (curve.length - 1);
        const slide = -0.028 * Math.exp(-u * 9);
        const vibrato = 0.006 * Math.sin(u * Math.PI * 9) * (1 - u) * Math.min(1, u * 5);
        curve[i] = rate * (1 + slide + vibrato);
      }
      src.playbackRate.setValueCurveAtTime(curve, t, 1.4);
    } else src.playbackRate.value = rate;
    const gain = ctx.createGain();
    gain.gain.value = velocity * 1.15;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 900 + mode.bright * 5200;
    tone.Q.value = 0.4;
    // 左右略微错开，每个音的位置不尽相同
    const pan = ctx.createStereoPanner();
    pan.pan.value = (this.rand() - 0.5) * 0.7;
    src.connect(tone).connect(gain).connect(pan);
    pan.connect(this.dry);
    pan.connect(this.wet);
    src.start(t);
  }

  // 弦的一次振动（Karplus–Strong）：一小段噪声在延迟线里往复、逐圈被平均滤波磨圆，听来就是拨弦。
  // 缓冲按整数周期生成，再用播放速率校准到准确音高
  private string(freq: number): { buffer: AudioBuffer; rate: number } {
    const { ctx, mode } = this;
    const sr = ctx.sampleRate;
    const period = Math.max(8, Math.round(sr / freq));
    const key = `${period}|${mode.bright}|${mode.sustain}`;
    // 延迟线每圈做一次相邻两点的平均，等效周期是 period - 0.5 个采样
    const rate = (freq * (period - 0.5)) / sr;
    const hit = this.plucks.get(key);
    if (hit) return { buffer: hit, rate };
    // 音越高余音越短
    const seconds = Math.min(5, mode.sustain * Math.min(1.2, Math.sqrt(160 / Math.max(80, freq))) + 0.4);
    const length = Math.floor(sr * seconds);
    const buffer = ctx.createBuffer(1, length, sr);
    const out = buffer.getChannelData(0);
    const ring = new Float32Array(period);
    // 激励：低通滤过的噪声（越暗的音色滤得越重），去掉直流
    let lp = 0;
    let mean = 0;
    const a = 0.08 + mode.bright * 0.8;
    for (let i = 0; i < period; i++) {
      lp += a * (this.rand() * 2 - 1 - lp);
      ring[i] = lp;
      mean += lp / period;
    }
    let peak = 1e-6;
    for (let i = 0; i < period; i++) {
      ring[i] -= mean;
      peak = Math.max(peak, Math.abs(ring[i]));
    }
    for (let i = 0; i < period; i++) ring[i] /= peak;
    // 每圈的衰减量，使余音在 seconds 秒内降到千分之一
    const decay = Math.exp((-6.9 * period) / (sr * seconds * 0.9));
    let idx = 0;
    for (let i = 0; i < length; i++) {
      const cur = ring[idx];
      const next = ring[(idx + 1) % period];
      out[i] = cur;
      ring[idx] = decay * 0.5 * (cur + next);
      idx = (idx + 1) % period;
    }
    // 起止各留极短的淡入淡出，免得出现爆音
    const edge = Math.min(length, Math.floor(sr * 0.004));
    for (let i = 0; i < edge; i++) out[i] *= i / edge;
    const tail = Math.floor(sr * 0.12);
    for (let i = 0; i < tail; i++) out[length - 1 - i] *= i / tail;
    this.plucks.set(key, buffer);
    if (this.plucks.size > 40) this.plucks.delete(this.plucks.keys().next().value as string);
    return { buffer, rate };
  }

  // 一声箫：正弦加一点二次泛音与气声，缓起缓收，稍后带上颤音
  private flute(t: number) {
    const { ctx, mode, rand } = this;
    const n = mode.scale.length;
    const notes = 1 + Math.floor(rand() * 3);
    let degree = n + Math.floor(rand() * n);
    let at = t;
    for (let i = 0; i < notes; i++) {
      const dur = 1.6 + rand() * 1.8;
      const freq = this.freq(degree);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, at);
      env.gain.linearRampToValueAtTime(0.15, at + 0.4);
      env.gain.setValueAtTime(0.15, at + dur - 0.5);
      env.gain.linearRampToValueAtTime(0, at + dur);
      const vibrato = ctx.createOscillator();
      vibrato.frequency.value = 4.6 + rand() * 0.6;
      const depth = ctx.createGain();
      depth.gain.setValueAtTime(0, at);
      depth.gain.linearRampToValueAtTime(freq * 0.006, at + dur * 0.7);
      vibrato.connect(depth);
      [
        [1, 1],
        [2, 0.16],
      ].forEach(([ratio, level]) => {
        const osc = ctx.createOscillator();
        osc.frequency.value = freq * ratio;
        depth.connect(osc.frequency);
        const g = ctx.createGain();
        g.gain.value = level;
        osc.connect(g).connect(env);
        osc.start(at);
        osc.stop(at + dur + 0.05);
      });
      const breath = ctx.createBufferSource();
      breath.buffer = this.noise();
      breath.loop = true;
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = freq * 2;
      band.Q.value = 1.4;
      const air = ctx.createGain();
      air.gain.value = 0.22;
      breath.connect(band).connect(air).connect(env);
      breath.start(at);
      breath.stop(at + dur + 0.05);
      vibrato.start(at);
      vibrato.stop(at + dur + 0.05);
      env.connect(this.dry);
      env.connect(this.wet);
      at += dur * 0.9;
      degree = Math.max(n - 1, Math.min(n * 2, degree + [-2, -1, 1, 2][Math.floor(rand() * 4)]));
    }
  }

  private noiseBuffer: AudioBuffer | null = null;

  private noise(): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer;
    const sr = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, sr, sr);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = this.rand() * 2 - 1;
    this.noiseBuffer = buffer;
    return buffer;
  }

  // 混响的冲激响应：指数衰减的噪声，越往后越暗
  private impulse(seconds: number): AudioBuffer {
    const sr = this.ctx.sampleRate;
    const length = Math.floor(sr * seconds);
    const buffer = this.ctx.createBuffer(2, length, sr);
    for (let c = 0; c < 2; c++) {
      const data = buffer.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < length; i++) {
        const u = i / length;
        const a = 0.5 - 0.42 * u;
        lp += a * (this.rand() * 2 - 1 - lp);
        data[i] = lp * Math.exp(-5.2 * u) * Math.min(1, i / (sr * 0.012));
      }
    }
    return buffer;
  }
}

// 镜头中心所在的地域（经纬度）；镜头拉得很远时回到“东亚”这一默认的底色
export function regionAt(lon: number, lat: number, zoomLevel: number): Region {
  if (zoomLevel < 1.5) return 'east';
  if (lon >= 128 && lon <= 147 && lat >= 29 && lat <= 46) return 'japan';
  if (lon >= 66 && lon <= 97 && lat >= 4 && lat <= 35) return 'south';
  if (lon >= 97 && lon <= 136 && lat >= 16 && lat <= 43) return 'east';
  if (lon >= 44 && lon <= 136 && lat > 38 && lat <= 58) return 'steppe';
  if ((lon >= 25 && lon <= 66 && lat >= 10 && lat <= 43) || (lon >= -18 && lon < 25 && lat >= 14 && lat <= 36)) return 'west';
  if (lon >= -12 && lon <= 50 && lat > 36 && lat <= 72) return 'europe';
  return 'far';
}
