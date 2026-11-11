// 素材抓取：维基百科摘要（规范链接、Wikidata 编号、主图）→ Commons 许可信息 → 本地 WebP
// 只采用 Wikimedia Commons 上的自由许可图片；结果写入 src/data/generated/media.json
// 覆盖三类条目：大事、人物，以及行迹站点的 wiki 条目（topics，以英文条目名为键，多位人物到过同一处时共用一张图）
// 用法：node scripts/fetch_wiki.mjs [--force]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { EVENTS } from '../src/data/events/index.ts';
import { FIGURES } from '../src/data/figures/index.ts';
import { IMAGE_OVERRIDES } from './media_overrides.mjs';

const FORCE = process.argv.includes('--force');
const UA = 'ShanheMoshi/1.0 (educational offline history atlas build script)';
const OUT_JSON = 'src/data/generated/media.json';
const IMG_DIR = 'public/images';
const MAX_W = 760;
// 站点配图显示得小，存小一些
const TOPIC_W = 560;
const FREE = /(public domain|^pd|cc0|cc[- ]by|cc[- ]by-sa|gfdl|attribution|no restrictions|free art)/i;

fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
const previous = fs.existsSync(OUT_JSON) ? JSON.parse(fs.readFileSync(OUT_JSON, 'utf8')) : { events: {}, figures: {}, topics: {} };

// 站点条目：按英文条目名去重；文件名取条目名的小写连字符形式
const slug = (title) => title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64);
const topicByTitle = new Map();
for (const f of FIGURES) for (const p of f.route) if (p.wiki?.en && !topicByTitle.has(p.wiki.en)) topicByTitle.set(p.wiki.en, { id: p.wiki.en, file: slug(p.wiki.en), wiki: p.wiki });
const TOPICS = [...topicByTitle.values()];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 接口响应缓存在 data_raw/wiki_cache，重复运行时不再请求
const CACHE_DIR = 'data_raw/wiki_cache';
fs.mkdirSync(CACHE_DIR, { recursive: true });
const cacheFile = (url) => path.join(CACHE_DIR, `${Buffer.from(url).toString('base64url').slice(-120)}.json`);

async function getJson(url, headers = {}) {
  const cf = cacheFile(url);
  if (!FORCE && fs.existsSync(cf)) return JSON.parse(fs.readFileSync(cf, 'utf8'));
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA, ...headers } });
    if (res.status === 404) {
      fs.writeFileSync(cf, 'null');
      return null;
    }
    if (res.status === 429 || res.status >= 500) {
      const wait = Number(res.headers.get('retry-after')) * 1000 || 2500 * 2 ** attempt;
      await sleep(Math.min(wait, 30000));
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    const data = await res.json();
    fs.writeFileSync(cf, JSON.stringify(data));
    return data;
  }
  return undefined;
}

async function getBuffer(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.status === 429 || res.status >= 500) {
      await sleep(2000 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error(`下载失败 ${url}`);
}

// REST 摘要服务偶有 500，此时改用 Action API 解析条目的规范地址与 Wikidata 编号
async function summary(lang, title) {
  const rest = await getJson(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`, lang === 'zh' ? { 'Accept-Language': 'zh-cn' } : {});
  if (rest !== undefined) return rest;
  const api = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageprops|info&inprop=url&titles=${encodeURIComponent(title)}`;
  const page = Object.values((await getJson(api))?.query?.pages ?? {})[0];
  if (!page || page.missing !== undefined) return null;
  return { title: page.title, wikibase_item: page.pageprops?.wikibase_item, content_urls: { desktop: { page: page.fullurl } } };
}

const zhCn = (url) => url?.replace('zh.wikipedia.org/wiki/', 'zh.wikipedia.org/zh-cn/') ?? null;

// 从 upload.wikimedia.org 的地址中取出文件名，并判断是否为 Commons 文件
function fileFromUrl(raw) {
  const url = raw?.split('?')[0];
  const m = url?.match(/(?:upload|thumb)\.wikimedia\.org\/wikipedia\/([^/]+)\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/]+)/);
  if (!m) return null;
  return { repo: m[1], name: decodeURIComponent(m[2]) };
}

const stripHtml = (s = '') => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

async function commonsInfo(fileName, width = MAX_W) {
  const api = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=${width}&titles=${encodeURIComponent(`File:${fileName}`)}`;
  const data = await getJson(api);
  const page = Object.values(data?.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  if (!info) return null;
  const meta = info.extmetadata ?? {};
  const license = stripHtml(meta.LicenseShortName?.value || meta.UsageTerms?.value || '');
  return {
    thumb: info.thumburl || info.url,
    filePage: info.descriptionurl,
    license,
    credit: stripHtml(meta.Artist?.value || meta.Credit?.value || '').slice(0, 160),
    free: FREE.test(license) || meta.Copyrighted?.value === 'False',
  };
}

// 中文条目名不对时，经英文条目的跨语言链接找到对应中文条目
async function zhViaLanglinks(enTitle) {
  const api = `https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=langlinks&lllang=zh&titles=${encodeURIComponent(enTitle)}`;
  const data = await getJson(api);
  const page = Object.values(data?.query?.pages ?? {})[0];
  return page?.langlinks?.[0]?.['*'] ?? null;
}

// kind：events / figures / topics；topics 存到 images/places，只留一张较小的图
async function processEntry(kind, item) {
  const topic = kind === 'topics';
  const width = topic ? TOPIC_W : MAX_W;
  const prev = previous[kind]?.[item.id];
  let [zh, en] = await Promise.all([summary('zh', item.wiki.zh), summary('en', item.wiki.en)]);
  if (!zh && en) {
    const alt = await zhViaLanglinks(en.title);
    if (alt) {
      zh = await summary('zh', alt);
      if (zh) console.log(`
  ↪ ${item.id}: 中文条目改用「${alt}」`);
    }
  }
  const media = {
    zhUrl: zhCn(zh?.content_urls?.desktop?.page),
    enUrl: en?.content_urls?.desktop?.page ?? null,
    wikidata: en?.wikibase_item ?? zh?.wikibase_item ?? null,
    zhTitle: zh?.title ?? null,
    enTitle: en?.title ?? null,
  };
  const override = IMAGE_OVERRIDES[item.id];
  const candidates = [override, en?.originalimage?.source, zh?.originalimage?.source, en?.thumbnail?.source, zh?.thumbnail?.source]
    .filter(Boolean)
    .map((u) => (u.startsWith('File:') ? { repo: 'commons', name: u.slice(5) } : fileFromUrl(u)))
    .filter(Boolean);
  for (const file of candidates) {
    if (file.repo !== 'commons') continue;
    const info = await commonsInfo(file.name, width);
    if (!info || !info.free) continue;
    const rel = topic ? `images/places/${item.file}.webp` : `images/${kind}/${item.id}.webp`;
    const abs = path.join('public', rel);
    if (FORCE || !fs.existsSync(abs) || prev?.sourceFile !== file.name) {
      const buf = await getBuffer(info.thumb);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      await sharp(buf, { density: 144 }).flatten({ background: '#f4ecdb' }).resize({ width, withoutEnlargement: true }).webp({ quality: topic ? 74 : 80 }).toFile(abs);
    }
    const meta = await sharp(abs).metadata();
    Object.assign(media, { image: rel, width: meta.width, height: meta.height, credit: info.credit, license: info.license, filePage: info.filePage, sourceFile: file.name });
    if (!topic) {
      const thumbRel = rel.replace('.webp', '.thumb.webp');
      const thumbAbs = path.join('public', thumbRel);
      if (FORCE || !fs.existsSync(thumbAbs) || prev?.sourceFile !== file.name) {
        await sharp(abs).resize({ width: 128, height: 128, fit: 'cover', position: 'attention' }).webp({ quality: 72 }).toFile(thumbAbs);
      }
      media.thumb = thumbRel;
    }
    break;
  }
  return media;
}

async function runAll(kind, items, concurrency = 2) {
  const out = {};
  let i = 0;
  const problems = [];
  async function worker() {
    while (i < items.length) {
      const item = items[i++];
      try {
        out[item.id] = await processEntry(kind, item);
        const m = out[item.id];
        if (!m.zhUrl || !m.enUrl) problems.push(`${item.id}: 维基条目缺失 zh=${!!m.zhUrl} en=${!!m.enUrl}`);
        if (!m.image) problems.push(`${item.id}: 无可用自由许可图片`);
        process.stdout.write('.');
      } catch (e) {
        problems.push(`${item.id}: ${e.message}`);
      }
      await sleep(350);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return { out, problems };
}

const ev = await runAll('events', EVENTS);
const fg = await runAll('figures', FIGURES);
const tp = await runAll('topics', TOPICS);
fs.writeFileSync(OUT_JSON, JSON.stringify({ generatedAt: new Date().toISOString(), events: ev.out, figures: fg.out, topics: tp.out }, null, 1));
console.log(`\n写入 ${OUT_JSON}：大事 ${EVENTS.length}、人物 ${FIGURES.length}、站点条目 ${TOPICS.length}`);
for (const p of [...ev.problems, ...fg.problems, ...tp.problems]) console.log('  ⚠', p);
