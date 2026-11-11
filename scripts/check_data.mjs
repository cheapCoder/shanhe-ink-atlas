// 内容数据的离线检查：结构、双语齐备、年代与坐标的合理性、相互引用。不联网。
// 用法：node scripts/check_data.mjs            检查全部大事与人物（引用关系从严）
//       node scripts/check_data.mjs <文件…>    只检查指定数据文件（引用不到的条目只给警告）
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { geoDistance } from 'd3-geo';

const SPRITES = new Set(['battle', 'ship', 'horse', 'seal', 'scroll', 'fire', 'wall', 'temple', 'crown', 'pyramid', 'steam', 'rocket', 'plague', 'volcano', 'printing', 'atom', 'flag', 'walker', 'camel', 'cannon', 'mushroom', 'wreath']);
const CATEGORIES = new Set(['war', 'politics', 'culture', 'science', 'religion', 'exploration', 'disaster', 'economy']);
const REGIONS = new Set(['china', 'east-asia', 'south-asia', 'central-asia', 'west-asia', 'europe', 'africa', 'americas']);
const LINEAGES = new Set(['china', 'rome', 'persia', 'mongol', 'russia', 'ottoman', 'arab', 'britain', 'france', 'spain', 'usa', 'japan', 'india', 'egypt', 'germany']);
const YEAR_MIN = -3200;
const YEAR_MAX = 2025;

const files = process.argv.slice(2);
const partial = files.length > 0;
const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

const CJK = /[㐀-鿿]/;
const zhLen = (s) => [...s].length;
const words = (s) => s.trim().split(/\s+/).length;
const km = (a, b) => geoDistance(a, b) * 6371;

function text(where, field, v, { zh, en, required = true } = {}) {
  if (v === undefined || v === null) {
    if (required) err(where, `缺少 ${field}`);
    return;
  }
  if (typeof v !== 'object' || typeof v.zh !== 'string' || typeof v.en !== 'string') return err(where, `${field} 应为 { zh, en }`);
  if (!v.zh.trim()) err(where, `${field}.zh 为空`);
  if (!v.en.trim()) err(where, `${field}.en 为空`);
  if (v.zh.trim() && !CJK.test(v.zh) && !/^[\d\s.—–-]+$/.test(v.zh)) warn(where, `${field}.zh 不含中文：${v.zh.slice(0, 30)}`);
  if (CJK.test(v.en)) err(where, `${field}.en 含中文：${v.en.slice(0, 30)}`);
  if (/[，。；：！？（）“”‘’《》、]/.test(v.en)) err(where, `${field}.en 含全角标点：${v.en.slice(0, 40)}`);
  if (zh && (zhLen(v.zh) < zh[0] || zhLen(v.zh) > zh[1])) warn(where, `${field}.zh 长度 ${zhLen(v.zh)} 字，建议 ${zh[0]}—${zh[1]}`);
  if (en && (words(v.en) < en[0] || words(v.en) > en[1])) warn(where, `${field}.en 长度 ${words(v.en)} 词，建议 ${en[0]}—${en[1]}`);
}

function coord(where, field, c) {
  if (!Array.isArray(c) || c.length !== 2 || !c.every((n) => typeof n === 'number' && Number.isFinite(n))) return err(where, `${field} 应为 [经度, 纬度]`);
  if (c[0] < -180 || c[0] > 180) err(where, `${field} 经度越界 ${c[0]}`);
  if (c[1] < -85 || c[1] > 85) err(where, `${field} 纬度越界 ${c[1]}（是否把经纬度写反了）`);
}

function wiki(where, v, required) {
  if (!v) {
    if (required) err(where, '缺少 wiki');
    return;
  }
  if (typeof v.zh !== 'string' || typeof v.en !== 'string' || !v.zh.trim() || !v.en.trim()) err(where, 'wiki 应为 { zh, en } 两个条目名');
  else if (CJK.test(v.en)) err(where, `wiki.en 含中文：${v.en}`);
}

const kebab = (id) => typeof id === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(id);

function checkEvent(e, known) {
  const where = `大事 ${e.id ?? '?'}`;
  if (!kebab(e.id)) err(where, 'id 应为小写连字符形式');
  text(where, 'title', e.title);
  text(where, 'place', e.place);
  text(where, 'summary', e.summary, { zh: [55, 175], en: [35, 100] });
  if (!Number.isInteger(e.year) || e.year < YEAR_MIN || e.year > YEAR_MAX || e.year === 0) err(where, `year 无效：${e.year}`);
  if (e.endYear !== undefined && (!Number.isInteger(e.endYear) || e.endYear < e.year)) err(where, `endYear 无效：${e.endYear}`);
  if (e.date !== undefined) {
    const m = String(e.date).match(/^(-?\d+)-(\d{2})(?:-(\d{2}))?$/);
    if (!m) err(where, `date 格式应为 YYYY-MM 或 YYYY-MM-DD：${e.date}`);
    else if (Number(m[1]) !== e.year) err(where, `date 的年份与 year 不一致：${e.date} / ${e.year}`);
    else if (Number(m[2]) < 1 || Number(m[2]) > 12 || (m[3] && (Number(m[3]) < 1 || Number(m[3]) > 31))) err(where, `date 月日无效：${e.date}`);
  }
  coord(where, 'coord', e.coord);
  if (!CATEGORIES.has(e.category)) err(where, `category 无效：${e.category}`);
  if (!SPRITES.has(e.sprite)) err(where, `sprite 无效：${e.sprite}`);
  if (![1, 2, 3].includes(e.importance)) err(where, `importance 应为 1/2/3`);
  if (e.lineage !== undefined && !LINEAGES.has(e.lineage)) err(where, `lineage 无效：${e.lineage}`);
  if (e.zoom !== undefined && (typeof e.zoom !== 'number' || e.zoom < 1 || e.zoom > 8)) err(where, `zoom 应在 1—8 之间`);
  for (const f of e.figures ?? []) if (!known.figures.has(f)) (partial ? warn : err)(where, `figures 引用了不存在的人物 ${f}`);
  wiki(where, e.wiki, true);
}

function checkFigure(f, known) {
  const where = `人物 ${f.id ?? '?'}`;
  if (!kebab(f.id)) err(where, 'id 应为小写连字符形式');
  text(where, 'name', f.name);
  text(where, 'title', f.title);
  text(where, 'summary', f.summary, { zh: [70, 230], en: [45, 135] });
  if (!Number.isInteger(f.birth) || !Number.isInteger(f.death) || f.birth >= f.death) err(where, `生卒年无效：${f.birth}—${f.death}`);
  if (!REGIONS.has(f.region)) err(where, `region 无效：${f.region}`);
  if (f.lineage !== undefined && !LINEAGES.has(f.lineage)) err(where, `lineage 无效：${f.lineage}`);
  if (!SPRITES.has(f.sprite)) err(where, `sprite 无效：${f.sprite}`);
  wiki(where, f.wiki, true);
  if (!Array.isArray(f.route) || f.route.length < 5) return err(where, `route 至少 5 个站点（现有 ${f.route?.length ?? 0}）`);
  if (f.route[0].year < f.birth - 1 || f.route[0].year > f.birth + 1) warn(where, `首个站点（${f.route[0].year}）通常应是出生（${f.birth}）`);
  f.route.forEach((p, i) => {
    const at = `${where} 站点#${i + 1}(${p.year})`;
    if (!Number.isInteger(p.year) || p.year === 0) err(at, `year 无效：${p.year}`);
    if (i > 0 && p.year < f.route[i - 1].year) err(at, `年份早于上一站点（${f.route[i - 1].year}）`);
    if (p.year < f.birth - 1) err(at, `年份早于出生（${f.birth}）`);
    if (p.year > f.death + 1) warn(at, `年份晚于去世（${f.death}），若为身后事请确认`);
    coord(at, 'coord', p.coord);
    text(at, 'place', p.place);
    text(at, 'note', p.note);
    if (p.note && zhLen(p.note.zh ?? '') > 26) warn(at, `note.zh 宜为一句话标题（现 ${zhLen(p.note.zh)} 字）`);
    if (p.note && (p.note.en ?? '').length > 90) warn(at, `note.en 宜为一句话标题（现 ${p.note.en.length} 字符）`);
    if (!p.detail) warn(at, '缺少 detail 讲解');
    else text(at, 'detail', p.detail, { zh: [28, 150], en: [14, 85] });
    for (const v of p.via ?? []) coord(at, 'via', v);
    if (p.sea !== undefined && typeof p.sea !== 'boolean') err(at, 'sea 应为布尔值');
    if (p.event !== undefined && !known.events.has(p.event)) (partial ? warn : err)(at, `event 引用了不存在的大事 ${p.event}`);
    wiki(at, p.wiki, false);
    if (i > 0 && Array.isArray(p.coord) && Array.isArray(f.route[i - 1].coord)) {
      const d = km(f.route[i - 1].coord, p.coord);
      const years = p.year - f.route[i - 1].year;
      if (p.year < 1850 && years === 0 && d > 4500) warn(at, `与上一站点同年却相距 ${Math.round(d)} 公里，请核对年份或坐标`);
      if (d < 1 && p.note.zh === f.route[i - 1].note.zh) warn(at, '与上一站点重复');
    }
  });
}

const isEvent = (x) => x && typeof x === 'object' && 'category' in x && 'importance' in x;
const isFigure = (x) => x && typeof x === 'object' && 'route' in x && 'birth' in x;

async function load(file) {
  const mod = await import(pathToFileURL(path.resolve(file)).href);
  const events = [];
  const figures = [];
  for (const v of Object.values(mod)) {
    if (!Array.isArray(v)) continue;
    for (const item of v) {
      if (isEvent(item)) events.push(item);
      else if (isFigure(item)) figures.push(item);
    }
  }
  return { events, figures };
}

const targets = partial ? files : ['src/data/events/index.ts', 'src/data/figures/index.ts'];
const events = [];
const figures = [];
for (const file of targets) {
  const got = await load(file);
  events.push(...got.events);
  figures.push(...got.figures);
}

// 引用检查的已知集合：全量检查时即数据本身；局部检查时再并入已有的全量数据（读不到则略过）
const known = { events: new Set(events.map((e) => e.id)), figures: new Set(figures.map((f) => f.id)) };
if (partial) {
  for (const file of ['src/data/events/index.ts', 'src/data/figures/index.ts']) {
    try {
      const got = await load(file);
      got.events.forEach((e) => known.events.add(e.id));
      got.figures.forEach((f) => known.figures.add(f.id));
    } catch {
      // 全量索引尚不可用时，引用只能给出警告
    }
  }
}

const dup = (items, kind) => {
  const seen = new Set();
  for (const it of items) {
    if (seen.has(it.id)) err(`${kind} ${it.id}`, 'id 重复');
    seen.add(it.id);
  }
};
dup(events, '大事');
dup(figures, '人物');
events.forEach((e) => checkEvent(e, known));
figures.forEach((f) => checkFigure(f, known));

const stations = figures.reduce((n, f) => n + (f.route?.length ?? 0), 0);
console.log(`检查 ${events.length} 则大事、${figures.length} 位人物、${stations} 个站点`);
if (events.length) {
  const by = (k) => Object.entries(events.reduce((m, e) => ((m[e[k]] = (m[e[k]] ?? 0) + 1), m), {})).map(([a, b]) => `${a}:${b}`).join(' ');
  console.log(`  重要度 ${by('importance')}；类别 ${by('category')}`);
}
for (const w of warnings) console.log(`  ⚠ ${w}`);
for (const e of errors) console.log(`  ✗ ${e}`);
console.log(errors.length ? `共 ${errors.length} 处错误、${warnings.length} 处警告` : `通过（${warnings.length} 处警告）`);
process.exit(errors.length ? 1 : 0);
