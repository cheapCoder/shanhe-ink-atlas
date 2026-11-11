<div align="center">

# 山河墨史 · Shanhe Ink Atlas

**以水墨之笔，绘五千年山河更迭、大事兴替与人物行迹**

*An ink-wash atlas of world history — 5,000 years of empires, events and journeys, unrolled like a Chinese scroll painting.*

[**在线体验**](https://shanhe-ink-atlas.vercel.app) · 简体中文 · [English](README.en.md)

[![CI](https://github.com/cheapCoder/shanhe-ink-atlas/actions/workflows/ci.yml/badge.svg)](https://github.com/cheapCoder/shanhe-ink-atlas/actions/workflows/ci.yml)
[![License: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0-b03a2e)](LICENSE)
[![中文 / English](https://img.shields.io/badge/i18n-中文%20%2F%20English-3e5c76)](src/locale)
[![React 19](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)](https://vite.dev)
[![D3](https://img.shields.io/badge/d3--geo-Canvas-f9a03c?logo=d3dotjs&logoColor=white)](https://d3js.org)

<img src="docs/screenshots/overview.webp" alt="山河墨史：1279 年的世界" width="100%">

</div>

水墨风格的世界历史疆域与大事件交互地图。从公元前 3200 年到当代，沿一条历史长卷自动播放各国疆域的消长，在大事发生地停驻讲解，并以水墨小动画点出事件的典型人物或器物；可单独查看一个国家或文明的历代疆域，也可追寻历史人物一生的行迹。界面与全部内容提供**中文、英文**两种语言。

## 亮点

- 🖌️ **一幅会动的长卷**：宣纸纹理、淡彩晕染、墨色山体与近岸水纹全部由 Canvas 绘制，太平洋居中的世界地图像国画一样徐徐展开。
- 🌏 **中英双语**：界面、大事讲解、人物行迹、地图上的政权名与河流名都有两种语言，右上角一键切换；新增语言只需补一份文案。
- 🗺️ **五千年疆域**：62 幅年代切片（54 幅来自 historical-basemaps，8 幅为秦统一、绍兴和议、明清易代等关键年份补绘），切片之间淡入淡出。
- 📜 **219 则大事**：飞往发生地停驻讲解，配图、出处齐全。导览分「精、详、全」三档，停留时间随讲解篇幅伸缩，鼠标移到卡片上就停下来等你读完。
- 🧭 **64 位人物、1057 个行迹站点**：从张骞、玄奘、郑和到马可·波罗、麦哲伦、库克船长，路线以一笔一笔的弧线墨迹画出，每一站都有两三句讲解。
- 🏯 **15 个国家与文明**：中国、罗马、波斯、蒙古、奥斯曼……朱色突出本部，附疆域面积曲线；时间轴上的朝代纪年随所看的国家切换。
- 🎵 **随地域变化的配乐**：不含音频文件，由浏览器实时生成的拨弦散板；镜头到了东亚、南亚、西亚、欧洲，调式与音色随之而变。
- 🔗 **可分享的画面**：地址栏记录当前年份、模式与选中项，复制链接即可把同一画面发给别人。
- 🔍 **处处可追溯**：每一处校勘都写明理由与维基出处，大事与人物逐条和 Wikidata 比对。
- ⚡ **纯静态、零后端**：全部数据预处理为静态文件；镜头飞行时改用后台线程预先画好的整幅世界位图，不逐帧重绘矢量，换国家、飞往大事都保持流畅。

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/intro.webp" alt="开场"><p align="center">开场 · 展卷</p></td>
    <td width="50%"><img src="docs/screenshots/territory.webp" alt="疆域模式"><p align="center">疆域 · 罗马的疆域与年表</p></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/screenshots/figure.webp" alt="人物模式"><p align="center">人物 · 亚历山大东征</p></td>
    <td width="50%"><img src="docs/screenshots/english.webp" alt="英文界面"><p align="center">English · 郑和七下西洋</p></td>
  </tr>
</table>

> 在线体验部署在 Vercel，`*.vercel.app` 在中国大陆访问可能不稳定，可本地运行或自行部署到其他静态托管。

## 运行

需要 Node.js 22.18 或更高版本（数据脚本直接导入 `.ts` 数据文件，依赖 Node 内置的类型擦除）。

```bash
npm install
npm run dev        # 开发服务器 http://127.0.0.1:5173
npm run build      # 类型检查 + 生产构建到 dist/
npm run preview    # 预览生产构建
```

`dist/` 是纯静态站点，可直接部署到任意静态托管。疆域、底图与配图都是预处理好的静态文件（`public/data`、`public/images`），运行时不请求第三方服务。

## 使用

| 模式 | 说明 |
| --- | --- |
| 纵览 | 沿时间轴自动播放疆域变迁。打开「导览」后，播放到大事会飞往发生地、停驻讲解，再继续前行 |
| 疆域 | 选一个国家或文明：地图上以朱色突出其本部、以虚线标出附属，侧栏给出疆域面积曲线和分期，时间轴换成该国的年表 |
| 人物 | 选一位人物：时间轴标出生卒区间，地图上逐段画出行迹，行进中的精灵随路线移动，右侧逐站讲解 |
| 纪事 | 全部大事按年代排列，可按关键字（中英文皆可）检索、按类别筛选，点选即飞往发生地 |

**时间轴**：上方是世界史分期和所看国家的朝代纪年（顶部纪年处可点开自选一国），下方是年代切片刻度（虚点为补绘切片）与大事印记，点选或拖动可以跳到任意年份。播放速度分缓、中、疾三档。

**导览**：「精」只在改变格局的大事停驻，「详」在重要大事都停驻，「全」每则都停；把鼠标悬在档位上可以看到大约要多少分钟。停留时间按讲解篇幅估算，鼠标移入详情卡时暂停计时，点「继续前行」可提前离开；相邻的大事会直接接续飞过去。

**快捷键**：`空格` 播放或暂停；`←` `→` 切换上一个或下一个大事（人物模式切换行迹站点，疆域模式切换时期）；`Esc` 收起详情或数据说明。

**语言与配乐**：右上角三枚小印依次是配乐开关、语言切换与数据说明。也可以用 `?lang=zh` 或 `?lang=en` 指定语言。

开发模式下访问 `/?sprites` 可查看全部水墨动画精灵。

## 参与贡献

最欢迎的贡献是内容：补一则大事、把一位人物的行迹写得更细、订正一个年份或坐标、改进一句译文。每个条目的中英文写在同一处，改一处即可：

```bash
npm run data:lint   # 离线检查全部大事与人物：字段、双语、年代、坐标、相互引用
```

撰写约定见 [docs/content-guide.md](docs/content-guide.md)，整体说明见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 数据来源

| 内容 | 来源 | 许可 |
| --- | --- | --- |
| 历史疆域 | [historical-basemaps](https://github.com/aourednik/historical-basemaps)（André Ourednik） | GPL-3.0 |
| 海岸、河流、湖泊 | [Natural Earth](https://www.naturalearthdata.com/) 1:50m（另用 1:10m 历史水域） | 公有领域 |
| 山体晕渲 | Natural Earth SR_50M 晕渲地形 | 公有领域 |
| 争议地区、南海断续线 | Natural Earth 1:10m 争议地区、国界与海上界线指示（中国视角） | 公有领域 |
| 大事与人物 | 中文、英文维基百科，Wikidata | CC BY-SA 4.0 / CC0 |
| 配图 | Wikimedia Commons，仅取自由许可或公有领域文件 | 逐图注明作者与许可 |

每则大事、每位人物都在详情卡底部列出所依据的维基条目；应用内「注」按钮打开的数据说明列出全部来源、校勘记录和合规说明。

`public/data/borders` 由 historical-basemaps 加工而来，按 GPL-3.0 再分发时须同样以 GPL-3.0 提供这些数据及其加工脚本。

## 许可

- 代码、数据流水线与 `public/data/borders`：[GPL-3.0](LICENSE)
- 大事与人物的文字：依据维基百科撰写，CC BY-SA 4.0
- 配图：沿用各文件在 Wikimedia Commons 上的原许可，作者与许可见详情卡和应用内数据说明
- 海岸、河流、湖泊与山体晕渲：Natural Earth，公有领域

## 数据流水线

原始数据放在 `data_raw/`（不入库），依次执行即可从零重建全部静态数据：

```bash
npm run data:raw       # 下载 historical-basemaps、Natural Earth 矢量与 SR_50M 晕渲
npm run data:borders   # 疆域：清理、校勘、补绘、简化为 TopoJSON，输出切片索引、面积表、校勘记录
npm run data:base      # 底图：陆地、湖泊（剔除现代水库）、河流及中文河名，南海断续线与南海诸岛
npm run data:relief    # 晕渲地形重投影为 4096×2130 的墨色山体纹理
npm run data:wiki      # 拉取维基条目链接与 Commons 配图（校验许可后转 WebP）：大事、人物与行迹站点
npm run data:verify    # 与 Wikidata 的时间、坐标、生卒地逐条比对，生成 docs/verify_report.md
npm run data:check     # 检查输出切片的环方向与异常面积
npm run data:lint      # 离线检查大事与人物的内容数据
```

维基与 Wikidata 的响应缓存在 `data_raw/wiki_cache`、`data_raw/wikidata_cache`，重跑不会重复请求。新增的大事与行迹站点在跑过 `data:wiki` 之前没有配图，详情卡照常显示文字与条目链接。

地图采用自然地球投影，中央经线为东经 150°（太平洋居中，左右边缘落在大西洋）。山体纹理和政权标注锚点都按这一投影预先算好，修改投影（`src/modules/map_view/engine/projection.ts` 与 `scripts/lib/geo_ops.mjs` 须同步）后要重跑 `data:borders` 和 `data:relief`。

### 校勘与补绘

historical-basemaps 的部分切片与通行史实不符（如 700 年没有唐朝、1200 年的金与南宋边界错位、民国时期仍标为清朝等）。`scripts/borders_fixes.mjs` 记录了全部修正，每条都以中英文写明原因和依据的条目：

- `rename`：改正年代错置的政权名称，例如原数据 700 年仍标为隋（改为唐）、500 年仍标为东晋（改为南齐）、1914 年仍标为清（改为中华民国）；
- `merge` / `splitByLine`：把被单列的地区并入所属政权（如元以后的西藏、民国时期的新疆与东北），或沿历史分界线切分（如按绍兴和议的淮河—大散关一线分出南宋与金）；
- `borrow`：原数据 1400 年仍是元朝全境，借用 1492 年的明朝、朝鲜轮廓作为近似；
- `transfer`：原数据把藏南地区及中印边界西段、中段的争议地区划给阿萨姆、英属印度或印度，按 Natural Earth 中国视角的争议地区与国界数据划归中国；
- `synthetic`：在原数据缺失的关键年份补绘切片——秦统一（前 221）、绍兴和议（1142）、蒙古兴起（1206）、金亡（1234）、明初（1368）、明清易代（1644）、民国（1912）、新中国（1949）。

地图上的政权名称由 `src/data/polityNames.ts` 统一给出中英文写法，并按当前年份修正同一切片内的朝代称谓（例如 630 年显示「唐」，1150 年显示南宋、金、西夏、西辽）。

### 数据校验

`docs/verify_report.md` 列出本项目与 Wikidata 不一致的字段。差异不等于错误：Wikidata 的事件条目常记录战役开始日、条约生效日、儒略历日期或所在国家的中心坐标，报告中现存的差异均已逐条复核，属于上述口径不同。

## 实现要点

- **地图引擎**（`src/modules/map_view/engine`）：静止时显示按当前视图精绘的清晰图层（宣纸、底图、政权设色、水系、高亮、标注各自缓存）；镜头一动，就换上后台线程预先画好的「整幅世界代理纹理」，每帧只是把这张位图贴到当前视图，停稳后再重绘清晰图层并淡入。因此飞行的流畅度与政权数量、海岸线复杂度无关。
- **人物路线**（`src/modules/figure_route`）：每段路程在平面上画成弧线，往返同一路线时去程与回程自然分开；有中间点的海路以样条顺滑穿过各点。
- **配乐**（`src/modules/sound`）：Karplus–Strong 拨弦、箫与持续音由 Web Audio 实时合成，无需任何音频文件。
- **多语言**（`src/locale`）：文案表按语言分文件；内容数据把两种语言写在同一处，由 `tx()` 取当前语言。

## 目录

```
scripts/                 数据流水线（下载、疆域加工、底图、晕渲、维基、校验）
public/data/borders      年代切片 TopoJSON、索引、面积表、校勘记录
public/data/base         陆地、湖泊、河流、晕渲纹理
public/images            事件、人物与行迹站点配图（WebP）
src/data                 大事、人物行迹、国家谱系、各国年表、政权与地名译名、数据来源
src/locale               界面文案（中文、英文）
src/store                全局状态（zustand）
src/modules/map_view     Canvas 水墨地图引擎：投影、宣纸、底图、着色、标注、图层缓存、代理纹理
src/modules/…            时间轴、播放与导览、详情卡、侧栏、疆域、人物路线、配乐、分享链接、动画精灵、开场、数据说明
docs/content-guide.md    内容撰写指南
```

## 合规说明

- 历史疆域是学术复原，边界多为近似，且切片之间的变化按年代跳变而非逐年连续。
- 西藏自元代起、台湾自清代起均按历代中央政府版图表示（1945 年以后的台湾依一个中国原则并入中国）；民国时期的外蒙古按 1946 年中华民国承认其独立之前的法理地位并入中华民国。每条处理都记在校勘记录里，并注明史学界的不同看法。
- 藏南地区及中印边界西段、中段的争议地区，自 1815 年切片起按中国政府立场并入中国，范围取 Natural Earth 中国视角的争议地区与国界数据；1949 年以后的切片绘出南海断续线（Natural Earth 中国视角海上界线）、南海诸岛与钓鱼岛。
- 疆域线取自开放数据，与我国标准地图仍可能存在差异，**本图为示意图，不能视为标准地图**。
- 本项目为个人非商业的示意性作品，未经地图审核。在中国境内正式出版或商业展示含国界线的地图，须依法送审并标注审图号，或改用自然资源部标准地图服务提供的底图。
