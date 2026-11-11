# 内容撰写指南 · Content Guide

大事（`src/data/events/`）与人物行迹（`src/data/figures/`）是本项目最欢迎贡献的部分。所有内容**中英双语写在同一处**，新增或修改条目时两种语言一并提供。

English summary: events live in `src/data/events/*.ts`, figures and their journeys in `src/data/figures/*.ts`. Every text field is `{ zh, en }`; add both languages together, then run `npm run data:lint`.

## 通用约定

- **年份**：整数，公元前为负数（公元前 221 年写 `-221`），没有公元 0 年。范围 `-3200`—`2025`。
- **坐标**：`[经度, 纬度]`，东经、北纬为正，保留 2—4 位小数；古地名取遗址或今城市位置。
- **双语文案** `{ zh, en }`：
  - `zh`：简体中文，全角标点，平实的百科语气，数字用阿拉伯数字。
  - `en`：平实的英文百科语气，**只用半角标点，不出现汉字**；中国人名地名用通行拼法（Chang'an、Sima Qian），其他专名用英语通行写法。
  - 两种语言内容对应，但不必逐字直译，以各自读来自然为准。
- **只写可靠的史实**：年代、地点、人物、数字以维基百科等通行资料为准；传说要点明是传说（“相传”/“according to tradition”）；拿不准的细节宁可不写，不要编造精确的日期和数字。
- **语气中立**：陈述事实与影响，不作褒贬评论。
- 数据文件只用可擦除的 TypeScript 语法，`import` 带 `.ts` 后缀（数据脚本由 Node 直接加载）。

## 大事 `HistoryEvent`

```ts
{
  id: 'battle-of-gaugamela',                    // 小写连字符，全局唯一，定下后不再改
  title: { zh: '高加米拉战役', en: 'Battle of Gaugamela' },
  year: -331, date: '-331-10-01',               // date 可省；只在日期确凿时写（1582 年以前为儒略历）
  // endYear: 1433,                             // 持续多年的事件可写终止年
  // approx: true,                              // 年代为约数
  place: { zh: '高加米拉（今伊拉克埃尔比勒附近）', en: 'Gaugamela (near Erbil, Iraq)' },
  coord: [43.25, 36.57],
  category: 'war',                              // war politics culture science religion exploration disaster economy
  sprite: 'horse',                              // 见下
  importance: 3,                                // 见下
  summary: {
    zh: '马其顿国王亚历山大在高加米拉击败大流士三世统率的波斯大军，波斯阿契美尼德王朝随之崩溃。此后亚历山大一路东进至印度河流域，建立起横跨欧、亚、非三洲的帝国。',
    en: 'Alexander of Macedon defeated the Persian army of Darius III at Gaugamela, and the Achaemenid Empire collapsed in its wake. Alexander pressed on as far as the Indus valley, creating an empire that spanned Europe, Asia and Africa.',
  },
  figures: ['alexander'],                       // 可省：直接相关的人物 id（须是本项目收录的人物）
  // lineage: 'china',                          // 可省：所属国家谱系，见下
  // zoom: 4,                                   // 可省：停驻时的镜头倍数（3—5，默认 3.2；地点密集处取大些）
  wiki: { zh: '高加米拉战役', en: 'Battle of Gaugamela' },   // 中、英文维基百科条目名（配图与出处由此抓取）
}
```

- `summary`：zh 70—150 字，en 40—90 词。写清“发生了什么、为什么重要”，尽量带一两个具体的数字或细节。
- `importance`：
  - `3` 改变世界或一个大文明格局的转折点（导览“精要”档会停驻，全库约占两成）；
  - `2` 重要的大事（约四成）；
  - `1` 值得一记的事件（约四成）。
- `sprite`（水墨小动画，选最贴切的一个）：`battle` 交战 · `horse` 骑兵远征 · `cannon` 火炮与近代战争 · `fire` 焚毁、起义、动乱 · `mushroom` 核爆 · `ship` 航海 · `camel` 商旅、沙漠 · `walker` 行脚、长征 · `rocket` 航天 · `seal` 开国、立制 · `crown` 加冕、帝国 · `flag` 独立、革命、建政 · `scroll` 典籍、条约、思想 · `printing` 印刷、出版 · `temple` 宗教与纪念性建筑 · `pyramid` 金字塔与巨石建筑 · `wall` 城墙、长城、柏林墙 · `wreath` 竞技、庆典、和平 · `steam` 工业、经济、技术 · `atom` 现代科学 · `plague` 瘟疫 · `volcano` 天灾
- `lineage`（事件属于某国历史时填写）：`china` `rome` `persia` `mongol` `russia` `ottoman` `arab` `britain` `france` `spain` `usa` `japan` `india` `egypt` `germany`

## 人物 `Figure`

```ts
{
  id: 'confucius',
  name: { zh: '孔子', en: 'Confucius' },
  birth: -551, death: -479,                      // approx: true 表示生卒年为约数
  title: { zh: '思想家、教育家', en: 'Philosopher and teacher' },
  region: 'china',                               // china east-asia south-asia central-asia west-asia europe africa americas
  lineage: 'china',                              // 可省：所属国家谱系（同上表），时间轴据此显示该国纪年
  sprite: 'walker',                              // 沿路线行进的小动画：walker horse camel ship 等
  summary: { zh: '……', en: '……' },               // zh 90—200 字，en 55—120 词
  route: [ /* 见下 */ ],
  wiki: { zh: '孔子', en: 'Confucius' },
}
```

### 行迹站点

每个站点用 `w(年份, 经度, 纬度, 中文文案, 英文文案, 附加项)` 写成，文案依次是 **地点、一句话标题、两三句讲解**：

```ts
w(-497, 115.03, 35.76,
  ['帝丘（卫国都城，今河南濮阳）', '离鲁适卫，开始周游列国', '鲁国君臣沉迷齐国所赠的女乐，孔子失望之下带着弟子离开鲁国，先到卫国。此后十四年间，他辗转卫、宋、陈、蔡等国游说诸侯，始终未获重用。'],
  ['Diqiu (capital of Wey, now Puyang, Henan)', 'Leaves Lu and begins his wanderings', 'Disillusioned with a court distracted by gifts from Qi, Confucius left Lu with his disciples and went first to Wey. For the next fourteen years he travelled among the states seeking a ruler who would put his teachings into practice.'],
  { wiki: { zh: '濮阳市', en: 'Puyang' } }),
```

- **地点**：zh 写“古地名（今地名）”，en 写 `Ancient name (now Modern place)`；今地名明确时可只写一个。
- **一句话标题**：zh 不超过 18 字，en 不超过 10 个词，说清这一站发生了什么。
- **讲解**：zh 45—110 字，en 25—60 词。写这一站的经过和意义，可以带一个生动的细节；不要重复标题。
- 站点按时间先后排列，年份不递减；第一站是出生，最后一站通常是去世。
- **数量**：依人物生平而定，一般 10—20 站。优先写“人到了哪里、在那里做了什么”的关键节点，宁缺毋滥；长期停留在一地的人物不必硬凑，同一地点的不同阶段可以写成多站。
- **附加项**（都可省）：
  - `sea: true`：这一站是走海路到达的（从上一站到这一站的路线画成花青虚线）。
  - `via: [[经度, 纬度], …]`：途经的中间点，用来让路线绕开陆地或沿实际路径行进，不标注地名。
  - `event: '<大事 id>'`：这一站就是某则大事（如亚历山大的“高加米拉”站对应 `battle-of-gaugamela`）。详情卡会沿用该大事的配图并提供跳转。
  - `wiki: { zh, en }`：这一站配图所依据的维基百科条目（遗址、建筑、战役、名画等最能代表这一站的条目）。每位人物挑 3—6 个最有画面感的站点填写即可，条目名须是确实存在的条目。

## 校验

```bash
npm run data:lint                                   # 检查全部内容
node scripts/check_data.mjs src/data/events/xxx.ts  # 只检查某个文件
```

脚本检查：字段齐全、两种语言都有且没有写反、年份与坐标在合理范围、站点年份不倒序、引用的人物 / 大事 / 谱系存在，并对过长或过短的文案给出警告。错误必须改掉，警告请逐条看一眼。

配图与维基链接由 `npm run data:wiki` 根据 `wiki` 字段抓取（只采用 Wikimedia Commons 上的自由许可图片），与 Wikidata 的交叉校验由 `npm run data:verify` 完成；这两步需要联网，可以由维护者代跑。
