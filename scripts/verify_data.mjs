// 数据校验：把事件年份/日期/地点与人物生卒/出生地/逝世地，同 Wikidata 的对应属性逐条比对
// 用法：node scripts/verify_data.mjs   （需先运行 fetch_wiki.mjs 生成 media.json 以获得 QID）
import fs from 'node:fs';
import path from 'node:path';
import { geoDistance } from 'd3-geo';
import { EVENTS } from '../src/data/events/index.ts';
import { FIGURES } from '../src/data/figures/index.ts';

const UA = 'ShanheMoshi/1.0 (educational offline history atlas build script)';
const CACHE = 'data_raw/wikidata_cache';
const REPORT = 'docs/verify_report.md';
fs.mkdirSync(CACHE, { recursive: true });
fs.mkdirSync(path.dirname(REPORT), { recursive: true });
const media = JSON.parse(fs.readFileSync('src/data/generated/media.json', 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function entity(qid) {
  const file = path.join(CACHE, `${qid}.json`);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  for (let i = 0; i < 6; i++) {
    const res = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`, { headers: { 'User-Agent': UA } });
    if (res.status === 429 || res.status >= 500) {
      await sleep(2000 * 2 ** i);
      continue;
    }
    if (!res.ok) return null;
    const json = await res.json();
    const ent = Object.values(json.entities)[0];
    const slim = { id: qid, label: ent.labels?.zh?.value ?? ent.labels?.en?.value, claims: {} };
    for (const p of ['P585', 'P580', 'P582', 'P625', 'P276', 'P569', 'P570', 'P19', 'P20']) {
      slim.claims[p] = (ent.claims?.[p] ?? []).filter((c) => c.rank !== 'deprecated').map((c) => c.mainsnak?.datavalue?.value).filter(Boolean);
    }
    fs.writeFileSync(file, JSON.stringify(slim));
    await sleep(150);
    return slim;
  }
  return null;
}

// Wikidata 时间：'+1453-05-29T00:00:00Z'，公元前为负数且无公元 0 年，与本项目的约定一致
function parseTime(v) {
  const m = v?.time?.match(/^([+-])(\d+)-(\d\d)-(\d\d)/);
  if (!m) return null;
  const year = Number(m[2]) * (m[1] === '-' ? -1 : 1);
  return { year, month: Number(m[3]), day: Number(m[4]), precision: v.precision, calendar: v.calendarmodel?.endsWith('Q1985786') ? 'J' : 'G' };
}

const km = (a, b) => Math.round(geoDistance(a, b) * 6371);
const coordOf = (v) => (v && typeof v.longitude === 'number' ? [v.longitude, v.latitude] : null);

async function placeCoord(ent, prop) {
  const ref = ent?.claims?.[prop]?.[0];
  if (!ref?.id) return null;
  const place = await entity(ref.id);
  const c = coordOf(place?.claims?.P625?.[0]);
  return c ? { coord: c, label: place.label } : null;
}

const rows = [];
const flag = (kind, id, name, field, ours, theirs, note = '') => rows.push({ kind, id, name, field, ours, theirs, note });

for (const e of EVENTS) {
  const qid = media.events[e.id]?.wikidata;
  const ent = qid && (await entity(qid));
  if (!ent) {
    flag('事件', e.id, e.title.zh, '条目', qid ?? '无', '未取得', '');
    continue;
  }
  const times = ['P585', 'P580', 'P582'].flatMap((p) => ent.claims[p].map((v) => ({ p, t: parseTime(v) }))).filter((x) => x.t);
  if (times.length) {
    const best = times.reduce((a, b) => (Math.abs(b.t.year - e.year) < Math.abs(a.t.year - e.year) ? b : a));
    const tol = e.approx ? 60 : 1;
    if (Math.abs(best.t.year - e.year) > tol) flag('事件', e.id, e.title.zh, '年份', e.year, times.map((x) => `${x.p}:${x.t.year}`).join(' '), '');
    if (e.date && best.t.precision >= 11) {
      const [, mm, dd] = e.date.match(/-(\d\d)-(\d\d)$/) ?? [];
      if (mm && (Number(mm) !== best.t.month || Number(dd) !== best.t.day)) flag('事件', e.id, e.title.zh, '日期', e.date, `${best.t.year}-${best.t.month}-${best.t.day}(${best.t.calendar})`, '');
    }
    if (e.endYear) {
      const end = ent.claims.P582.map(parseTime).filter(Boolean)[0];
      if (end && Math.abs(end.year - e.endYear) > 1) flag('事件', e.id, e.title.zh, '终止年', e.endYear, end.year, '');
    }
  }
  const own = coordOf(ent.claims.P625[0]);
  const loc = own ? { coord: own, label: '条目坐标' } : await placeCoord(ent, 'P276');
  if (loc) {
    const d = km(e.coord, loc.coord);
    if (d > 150) flag('事件', e.id, e.title.zh, '地点', `${e.place.zh} ${e.coord.join(',')}`, `${loc.label} ${loc.coord.map((v) => v.toFixed(2)).join(',')}`, `${d} km`);
  }
}

for (const f of FIGURES) {
  const qid = media.figures[f.id]?.wikidata;
  const ent = qid && (await entity(qid));
  if (!ent) {
    flag('人物', f.id, f.name.zh, '条目', qid ?? '无', '未取得', '');
    continue;
  }
  const tol = f.approx ? 6 : 1;
  for (const [p, ours, label] of [['P569', f.birth, '生年'], ['P570', f.death, '卒年']]) {
    const years = ent.claims[p].map(parseTime).filter(Boolean).map((t) => t.year);
    if (years.length && !years.some((y) => Math.abs(y - ours) <= tol)) flag('人物', f.id, f.name.zh, label, ours, years.join(' / '), '');
  }
  const first = f.route[0];
  const last = f.route[f.route.length - 1];
  const birth = first.year === f.birth ? await placeCoord(ent, 'P19') : null;
  const death = last.year === f.death ? await placeCoord(ent, 'P20') : null;
  if (birth && km(first.coord, birth.coord) > 100) flag('人物', f.id, f.name.zh, '出生地', `${first.place.zh} ${first.coord.join(',')}`, `${birth.label} ${birth.coord.map((v) => v.toFixed(2)).join(',')}`, `${km(first.coord, birth.coord)} km`);
  if (death && km(last.coord, death.coord) > 100) flag('人物', f.id, f.name.zh, '逝世地', `${last.place.zh} ${last.coord.join(',')}`, `${death.label} ${death.coord.map((v) => v.toFixed(2)).join(',')}`, `${km(last.coord, death.coord)} km`);
}

const lines = [
  '# 数据校验报告',
  '',
  `生成时间：${new Date().toISOString()}；比对对象：Wikidata（时间 P585/P580/P582/P569/P570，坐标 P625，地点 P276/P19/P20）。`,
  '',
  '差异不等于错误：Wikidata 的事件条目常以战役开始日、条约生效日或城市坐标记录，需逐条人工判断。',
  '',
  '| 类别 | 条目 | 字段 | 本项目 | Wikidata | 差距 |',
  '| --- | --- | --- | --- | --- | --- |',
  ...rows.map((r) => `| ${r.kind} | ${r.name}（${r.id}） | ${r.field} | ${r.ours} | ${r.theirs} | ${r.note} |`),
];
fs.writeFileSync(REPORT, lines.join('\n'));
console.log(`校验 ${EVENTS.length} 则事件、${FIGURES.length} 位人物，差异 ${rows.length} 处 → ${REPORT}`);
