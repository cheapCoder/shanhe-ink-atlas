# Contributing · 参与贡献

Thanks for your interest in Shanhe Ink Atlas! The easiest and most valuable contributions are **content**: a missing event, a richer life journey, a correction to a date or a coordinate, a better translation. No map or graphics knowledge needed.

感谢关注山河墨史！最欢迎、也最容易上手的贡献是**内容**：补一则大事、把一位人物的行迹写得更细、订正一个年份或坐标、改进一句译文。中文的详细撰写约定见 [docs/content-guide.md](docs/content-guide.md)。

## Quick start

```bash
npm install
npm run dev          # http://127.0.0.1:5173
npm run data:lint    # check all events and figures (offline)
npm run build        # type-check + production build
```

Node.js 22.18 or later is required.

## Adding or fixing content

Everything a reader sees is bilingual. Each text field is `{ zh, en }`, and both languages are written in the same place, so one entry is one edit.

| What | Where |
| --- | --- |
| Events | `src/data/events/` (`antiquity.ts`, `medieval.ts`, `early_modern.ts`, `modern.ts`) |
| Figures and their journeys | `src/data/figures/` |
| Per-nation chronologies (the timeline row) | `src/data/chronology.ts` |
| Nations and civilizations | `src/data/lineages.ts` |
| Interface strings | `src/locale/zh.ts`, `src/locale/en.ts` |
| English names of polities, rivers and islands | `src/data/polityNames.ts`, `src/data/geoNames.ts` |

An event looks like this:

```ts
{
  id: 'battle-of-gaugamela',                       // lower-case, hyphenated, unique, never renamed
  title: { zh: '高加米拉战役', en: 'Battle of Gaugamela' },
  year: -331, date: '-331-10-01',                  // negative = BCE; there is no year 0
  place: { zh: '高加米拉（今伊拉克埃尔比勒附近）', en: 'Gaugamela (near Erbil, Iraq)' },
  coord: [43.25, 36.57],                           // [longitude, latitude]
  category: 'war', sprite: 'horse', importance: 3, // 3 = turning point, 2 = major, 1 = notable
  summary: { zh: '……', en: '…' },                  // zh 70–150 characters, en 40–90 words
  figures: ['alexander'],
  wiki: { zh: '高加米拉战役', en: 'Battle of Gaugamela' },
}
```

A stop on a figure's journey is `w(year, longitude, latitude, zhLines, enLines, extra)`, where each `Lines` is `[place, one-line headline, two or three sentences]`:

```ts
w(-331, 43.25, 36.57,
  ['高加米拉', '决战击溃波斯大军', '……'],
  ['Gaugamela', 'Routs the Persian army', '…'],
  { event: 'battle-of-gaugamela' }),
```

Ground rules:

- **Reliable facts only.** Follow Wikipedia and its sources for dates, places and figures; label legend as legend; when unsure, leave a detail out rather than guess.
- **Neutral tone.** State what happened and why it mattered.
- **English fields use ASCII punctuation and contain no Chinese characters; Chinese fields use full-width punctuation.**
- Run `npm run data:lint` before opening a pull request. Errors must be fixed; read the warnings.

Images and Wikipedia links are fetched from the `wiki` fields by `npm run data:wiki` (free-licence images from Wikimedia Commons only) and cross-checked against Wikidata by `npm run data:verify`. Both need network access, and a maintainer can run them for you.

## Adding a language

1. Add the language to `Lang` and `Text` in `src/types.ts`.
2. Copy `src/locale/en.ts` and translate it; register it in `src/locale/index.ts`.
3. Add the new key to the `{ zh, en }` content fields (missing translations fall back to Chinese).

## Code

- `npm run build` must pass (TypeScript strict mode).
- Comments are written in Chinese, in the present tense, describing what the code does and why.
- The map engine lives in `src/modules/map_view/engine/`; its header comment in `MapEngine.ts` explains the rendering model.

## Maps and borders

Historical borders come from [historical-basemaps](https://github.com/aourednik/historical-basemaps) (GPL-3.0) with corrections recorded in `scripts/borders_fixes.mjs`; every correction states its reason and a source, in both languages. Please read the “合规说明 / Notes on borders” section of the README before proposing changes to how borders are drawn.
