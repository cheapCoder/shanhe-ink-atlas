<div align="center">

# Shanhe Ink Atlas · 山河墨史

**5,000 years of empires, events and journeys — painted in ink and wash**

*以水墨之笔，绘五千年山河更迭、大事兴替与人物行迹*

[**Live demo**](https://shanhe-ink-atlas.vercel.app) · English · [简体中文](README.md)

[![License: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0-b03a2e)](LICENSE)
[![React 19](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)](https://vite.dev)
[![D3](https://img.shields.io/badge/d3--geo-Canvas-f9a03c?logo=d3dotjs&logoColor=white)](https://d3js.org)

<img src="docs/screenshots/overview.webp" alt="Shanhe Ink Atlas: the world in 1279" width="100%">

</div>

An interactive atlas of world history in the style of Chinese ink-wash painting. From 3000 BC to the present day, the map plays back the rise and fall of states like a hand scroll being unrolled, pauses at the scene of major events to tell their story, and marks each one with a small animated ink sprite. You can also follow a single country or civilisation through the ages, or trace the lifelong journey of a historical figure.

> The interface is in Simplified Chinese; place and polity names are translated into Chinese throughout.

## Highlights

- 🖌️ **A living scroll painting** — rice-paper texture, watercolour washes, ink-shaded mountains and coastal ripples are all drawn on Canvas, on a Pacific-centred world map.
- 🗺️ **Five millennia of borders** — 62 time slices (54 from historical-basemaps, 8 newly drawn for key years such as the Qin unification, the Treaty of Shaoxing and the Ming–Qing transition), cross-faded as time flows.
- 📜 **78 major events** — the camera flies to each site and pauses for a short narration with images and sources, plus an ink sprite of a typical figure or artefact.
- 🧭 **56 historical figures, 556 waypoints** — from Zhang Qian, Xuanzang and Zheng He to Marco Polo and Magellan, each life drawn leg by leg along great-circle routes.
- 🏯 **15 states and civilisations** — China, Rome, Persia, the Mongols, the Ottomans and more, highlighted in cinnabar with a territory-area chart and period list.
- 🔍 **Traceable by design** — every border correction records its reason and a Wikipedia source; events and figures are cross-checked against Wikidata.
- ⚡ **Fully static, no backend** — all data is preprocessed into static files; level-of-detail paths and a Web Worker decoder keep zooming and fly-to animations smooth.

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/intro.webp" alt="Opening scroll"><p align="center">Opening · unroll the scroll</p></td>
    <td width="50%"><img src="docs/screenshots/territory.webp" alt="Territory mode"><p align="center">Territory · China through the dynasties</p></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/screenshots/figure.webp" alt="Figure mode"><p align="center">Figures · Zheng He's seven voyages</p></td>
    <td width="50%"><img src="docs/screenshots/overview.webp" alt="Overview mode"><p align="center">Overview · 1279, the Yuan conquers the Southern Song</p></td>
  </tr>
</table>

## Getting started

Requires Node.js 22.18 or later (the data scripts import `.ts` files directly using Node's built-in type stripping).

```bash
npm install
npm run dev        # dev server at http://127.0.0.1:5173
npm run build      # type-check + production build into dist/
npm run preview    # preview the production build
```

`dist/` is a plain static site that can be hosted anywhere. Borders, base maps and images are all preprocessed static files (`public/data`, `public/images`); nothing is fetched from third-party services at runtime.

## How to use

| Mode | What it does |
| --- | --- |
| Overview 纵览 | Plays back changing borders along the timeline. With *Tour* on, playback flies to major events, pauses to narrate, then moves on |
| Territory 疆域 | Pick a state or civilisation: its core is highlighted in cinnabar, dependencies dashed, with an area chart and periods in the side panel |
| Figures 人物 | Pick a person: the timeline marks their lifespan and the map draws their route year by year, with a sprite travelling along it |
| Events 纪事 | All events in chronological order, searchable and filterable by category; click one to fly there |

Timeline: world-history eras and Chinese dynasties on top; time-slice ticks (hollow dots are newly drawn slices) and event seals below. Click or drag to jump to any year. Three playback speeds; the full run takes about six minutes at medium speed.

Keyboard: `Space` play/pause; `←` `→` previous/next event (route waypoint in Figures mode, period in Territory mode); `Esc` close details or notes.

In dev mode, open `/?sprites` to browse every ink sprite.

## Data sources

| Content | Source | License |
| --- | --- | --- |
| Historical borders | [historical-basemaps](https://github.com/aourednik/historical-basemaps) (André Ourednik) | GPL-3.0 |
| Coastlines, rivers, lakes | [Natural Earth](https://www.naturalearthdata.com/) 1:50m (plus 1:10m historic water bodies) | Public domain |
| Shaded relief | Natural Earth SR_50M | Public domain |
| Disputed areas, South China Sea line | Natural Earth 1:10m disputed areas, boundaries and maritime indicators (China point of view) | Public domain |
| Events and figures | Chinese and English Wikipedia, Wikidata | CC BY-SA 4.0 / CC0 |
| Images | Wikimedia Commons, free-licence or public-domain files only | Credited per image |

Every event and figure lists the Wikipedia articles it draws on at the bottom of its card. The in-app notes panel (注) lists all sources, the full correction log and the compliance notes.

## License

- Code, data pipeline and `public/data/borders`: [GPL-3.0](LICENSE)
- Event and figure text summaries: derived from Wikipedia, CC BY-SA 4.0
- Images: each keeps its original Wikimedia Commons licence, credited in the app
- Coastlines, rivers, lakes and relief: Natural Earth, public domain

## Data pipeline

Raw data lives in `data_raw/` (not committed). Run these in order to rebuild every static file from scratch:

```bash
npm run data:raw       # download historical-basemaps, Natural Earth vectors and SR_50M relief
npm run data:borders   # borders: clean, correct, synthesise, simplify to TopoJSON; write index, areas and correction log
npm run data:base      # base map: land, lakes (modern reservoirs removed), rivers with Chinese names, South China Sea line and islands
npm run data:relief    # reproject shaded relief into a 4096×2130 ink mountain texture
npm run data:wiki      # fetch Wikipedia summaries, links and Commons images (licence-checked, converted to WebP)
npm run data:verify    # cross-check dates, coordinates and birthplaces against Wikidata → docs/verify_report.md
npm run data:check     # check ring orientation and abnormal areas in the output slices
```

The map uses the Natural Earth projection centred on 150°E (Pacific in the middle, edges in the Atlantic). The relief texture and label anchors are precomputed for this projection, so after changing it (keep `src/modules/map_view/engine/projection.ts` and `scripts/lib/geo_ops.mjs` in sync) re-run `data:borders` and `data:relief`.

### Corrections

Some historical-basemaps slices disagree with the accepted record (no Tang dynasty in 700, a misplaced Jin–Southern Song border in 1200, the Qing still shown during the Republic, and so on). `scripts/borders_fixes.mjs` records every fix with its reason and source:

- `rename` — fix anachronistic polity names (Sui → Tang in 700, Eastern Jin → Southern Qi in 500, Qing → Republic of China in 1914);
- `merge` / `splitByLine` — merge regions shown separately into their polity, or split along historical boundaries (the Huai River–Dasan Pass line between Southern Song and Jin);
- `borrow` — the source still shows the whole Yuan in 1400, so the 1492 Ming and Joseon outlines are borrowed as an approximation;
- `transfer` — move South Tibet and the disputed areas on the western and middle sectors of the China–India border into China, using Natural Earth's China point-of-view data;
- `synthetic` — new slices for key years missing from the source: Qin unification (221 BC), Treaty of Shaoxing (1142), rise of the Mongols (1206), fall of the Jin (1234), early Ming (1368), Ming–Qing transition (1644), Republic of China (1912), People's Republic of China (1949).

## Project structure

```
scripts/                 data pipeline (download, borders, base map, relief, Wikipedia, verification)
public/data/borders      time-slice TopoJSON, index, area table, correction log
public/data/base         land, lakes, rivers, relief texture, South China Sea layer
public/images            event and figure images (WebP originals and thumbnails)
src/data                 events, figure routes, lineages, chronology, polity names, sources
src/locale               UI strings
src/store                global state (zustand)
src/modules/map_view     Canvas ink-wash map engine: projection, paper, base map, colouring, labels, layer cache, LOD
src/modules/…            timeline, playback and tour, detail cards, panels, territory, figure routes, sprites, intro, notes
```

## Notes on the maps

- Historical borders are scholarly reconstructions; most boundaries are approximate, and changes jump between time slices rather than varying year by year.
- Tibet from the Yuan dynasty on and Taiwan from the Qing dynasty on are shown within the territory of the central government of the time; Outer Mongolia during the Republic of China is shown according to its legal status before 1946. South Tibet and the disputed areas on the western and middle sectors of the China–India border are shown as part of China; slices from 1949 on include the South China Sea dashed line and islands. Every such decision is recorded in the correction log.
- This is an illustrative map, not a standard map, and must not be used as a basis for delimiting boundaries.
