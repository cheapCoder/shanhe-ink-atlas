// 历史疆域校勘配置
// 底图数据 historical-basemaps 在东亚等地区存在年代标注滞后、政权缺失等问题，
// 这里以“可追溯”的方式逐条修正：每条修正写明理由与参考来源，构建时写入 corrections.json 供前端“校勘记”展示。
// 坐标一律为 [经度, 纬度]；拆分线均为示意性近似，前端会标注“示意”。

// 宋金界线（1142 年绍兴和议：东以淮水中流为界，西以大散关为界；唐、邓二州及商、秦二州大半割金）
// 自东向西：淮河口 → 楚州北 → 盱眙/泗州之间 → 寿州北 → 淮河上游 → 桐柏 → 襄阳北 → 均州北 → 商州南 → 秦岭 → 大散关 → 秦州南 → 岷州北
const SONG_JIN_LINE = [
  [121.2, 34.3], [119.9, 34.05], [119.15, 33.65], [118.5, 33.1], [117.4, 32.95], [116.5, 32.5],
  [115.6, 32.5], [114.6, 32.4], [113.7, 32.42], [113.3, 32.35], [112.3, 32.3], [111.6, 32.75],
  [110.3, 33.4], [109.0, 33.75], [107.6, 33.95], [106.95, 34.27], [105.7, 34.45], [104.5, 34.75],
  [103.0, 34.9], [96.0, 35.0],
];

// 大兴安岭一线（蒙古高原与东北的大致分界），自北向南
const KHINGAN_LINE = [[119.6, 63.0], [121.0, 53.3], [122.0, 50.5], [121.7, 47.5], [121.0, 45.0], [119.8, 43.0], [118.3, 41.0], [117.0, 37.0]];

// 阿尔泰山—哈密一线（漠北蒙古与西域/准噶尔的大致分界），自北向南
const ALTAI_LINE = [[90.0, 63.0], [90.0, 56.0], [90.5, 50.5], [93.0, 46.5], [95.5, 43.5], [97.5, 40.5], [98.5, 38.0], [99.0, 34.0]];

// 天山一线（北为准噶尔盆地与伊犁河谷，南为塔里木盆地与吐鲁番），自西向东
const TIANSHAN_LINE = [
  [70.0, 41.2], [73.0, 41.3], [76.0, 41.6], [78.5, 42.0], [80.5, 42.4], [83.0, 42.9], [85.5, 43.2],
  [87.5, 43.4], [89.0, 43.5], [91.0, 43.4], [93.0, 43.3], [95.0, 43.0], [97.0, 42.6], [100.0, 42.0],
];

// 西伯利亚森林带与哈萨克草原、蒙古高原、黑龙江流域的大致分界（萨彦岭—贝加尔湖南—额尔古纳河—黑龙江），自西向东
const SIBERIA_LINE = [
  [55.0, 56.5], [65.0, 56.0], [73.0, 55.0], [78.0, 54.2], [83.0, 53.0], [86.0, 51.5], [88.5, 50.2],
  [92.0, 50.5], [97.0, 50.4], [99.5, 51.6], [102.5, 51.5], [106.0, 50.4], [108.5, 49.6], [112.0, 49.6],
  [116.0, 49.9], [119.5, 52.2], [121.5, 53.3], [126.0, 53.2], [130.0, 52.0], [135.0, 51.0], [141.0, 52.0],
];

// 补绘岛屿的取地范围：台湾岛与澎湖（避开福建沿海岛屿），海南岛（避开雷州半岛）
const TAIWAN_AREA = [[119.25, 23.0], [119.9, 22.2], [120.6, 21.7], [121.2, 21.7], [122.3, 24.2], [122.3, 25.5], [121.4, 25.6], [120.6, 25.2], [119.9, 24.0], [119.25, 23.9], [119.25, 23.0]];
const HAINAN_AREA = [[108.4, 18.0], [111.2, 18.0], [111.2, 20.17], [108.4, 20.17], [108.4, 18.0]];

const zhwiki = (title) => `https://zh.wikipedia.org/wiki/${encodeURIComponent(title)}`;

// 年份内的单条修正。op 取值：
// rename：更名；merge：并入另一政权；splitByLine：按线拆分（side 为线的“北/东”侧取名 a，另一侧取名 b）；
// borrow：借用其他年代的同一地域几何（clip 到 within 指定的现有要素范围内）
export const fixes = [
  { year: 300, op: 'rename', from: 'Parthian Empire', to: 'Sasanian Empire', note: '萨珊王朝于 224 年推翻安息，公元 300 年波斯为萨珊王朝统治。', source: zhwiki('萨珊王朝') },
  { year: 400, op: 'rename', from: 'Persia', to: 'Sasanian Empire', note: '公元 400 年波斯为萨珊王朝统治。', source: zhwiki('萨珊王朝') },
  { year: 500, op: 'rename', from: 'Jin Empire', to: 'Southern Qi', note: '东晋已于 420 年灭亡，公元 500 年江南为南齐（479–502）。', source: zhwiki('南齐') },
  { year: 700, op: 'rename', from: 'Sui Empire', to: 'Tang Empire', note: '隋于 618 年灭亡，公元 700 年为唐（武周，690–705）。', source: zhwiki('武周') },
  { year: 1000, op: 'rename', from: 'Nan Chao', to: 'Dali Kingdom', note: '南诏于 902 年灭亡，937 年起云南为大理国。', source: zhwiki('大理国') },
  { year: 1100, op: 'rename', from: 'Nan Chao', to: 'Dali Kingdom', note: '同上，1100 年云南为大理国。', source: zhwiki('大理国') },
  { year: 1200, op: 'rename', from: 'Nan Chao', to: 'Dali Kingdom', note: '同上，1200 年云南为大理国。', source: zhwiki('大理国') },
  { year: 1200, op: 'rename', from: 'Mongol Empire', to: 'Mongol tribes', note: '大蒙古国于 1206 年建立，1200 年蒙古高原尚为诸部并立。', source: zhwiki('大蒙古国') },
  { year: 1200, op: 'rename', from: 'Liao', to: 'Jin (Jurchen)', note: '辽已于 1125 年为金所灭，1200 年东北与华北属金。', source: zhwiki('金朝') },
  {
    year: 1200, op: 'splitByLine', target: 'Song Empire', line: SONG_JIN_LINE, side: 'north',
    a: 'Jin (Jurchen)', b: 'Southern Song',
    note: '原数据 1200 年宋的范围仍及华北。按 1142 年绍兴和议“东以淮水中流为界，西以大散关为界”拆分：线北并入金，线南为南宋（界线示意）。',
    source: zhwiki('绍兴和议'),
  },
  ...[1279, 1300].map((year) => ({ year, op: 'merge', from: 'Tibet', into: 'Great Khanate', note: '元朝设宣政院管辖吐蕃地区，西藏属元朝版图。', source: zhwiki('宣政院') })),
  ...[1878, 1880].map((year) => ({ year, op: 'merge', from: 'Taiwan', into: 'Manchu Empire', note: '清于 1684 年设台湾府，1885 年建台湾省，原数据将台湾单列。', source: zhwiki('台湾府') })),
  { year: 1920, op: 'rename', from: 'USSR', to: 'Soviet Russia', note: '苏联于 1922 年 12 月成立，1920 年为苏维埃俄国。', source: zhwiki('俄罗斯苏维埃联邦社会主义共和国') },
  { year: 1930, op: 'rename', from: 'White Russia', to: 'USSR', note: '原数据把 1930 年的苏联主体误标为“白俄罗斯”。', source: zhwiki('苏联') },
  { year: 1930, op: 'merge', from: 'Far Eastern SSR', into: 'USSR', note: '远东共和国已于 1922 年并入苏俄。', source: zhwiki('远东共和国') },
  { year: 1200, op: 'rename', from: 'Fatimid Caliphate', to: 'Ayyubid Sultanate', note: '法蒂玛王朝已于 1171 年为萨拉丁所灭，1200 年埃及为阿尤布王朝。', source: zhwiki('阿尤布王朝') },
  { year: 1200, op: 'merge', from: 'Buwayhid Emirates', into: 'Khwarazmian dynasty', note: '布韦希王朝已于 1062 年灭亡；1194 年花剌子模击灭塞尔柱残余后据有伊朗大部（西部边界示意）。', source: zhwiki('花剌子模王朝') },
  { year: 1200, op: 'rename', from: 'Ghaznavid Emirate', to: 'Ghurid dynasty', note: '伽色尼王朝已于 1186 年为古尔王朝所灭。', source: zhwiki('古尔王朝') },
  { year: 1200, op: 'rename', from: 'Imperial Japan (Fujiwara)', to: 'Kamakura Shogunate', note: '1185 年起日本进入镰仓幕府时代。', source: zhwiki('镰仓幕府') },
  { year: 1400, op: 'rename', from: 'Shogun Japan (Kamakura)', to: 'Muromachi Shogunate', note: '镰仓幕府于 1333 年灭亡，1400 年为室町幕府。', source: zhwiki('室町幕府') },
  { year: 1400, op: 'rename', from: 'Chagatai Khanate', to: 'Moghulistan', note: '1400 年察合台汗国西部已归帖木儿，东部为东察合台汗国（蒙兀儿斯坦）。', source: zhwiki('东察合台汗国') },
  {
    year: 1400, op: 'borrow', from: 1492, source_name: 'Ming Empire', name: 'Ming Empire', within: 'Great Khanate',
    note: '原数据 1400 年仍为元朝（大汗国）全境。明朝已于 1368 年建立，此处借用 1492 年明朝范围（与原元朝范围求交）作为近似。',
    source: zhwiki('明朝'),
  },
  {
    year: 1400, op: 'borrow', from: 1492, source_name: 'Korea', name: 'Joseon', within: 'Great Khanate',
    note: '1392 年李成桂建立朝鲜王朝，此处借用 1492 年朝鲜范围。', source: zhwiki('朝鲜王朝'),
  },
  {
    year: 1400, op: 'splitByLine', target: 'Great Khanate', line: KHINGAN_LINE, side: 'east',
    a: 'Jurchen tribes', b: 'Great Khanate',
    note: '扣除明、朝鲜后的原元朝范围中，大兴安岭以东为女真诸部（界线示意）。', source: zhwiki('女真'),
  },
  {
    year: 1400, op: 'splitByLine', target: 'Great Khanate', line: ALTAI_LINE, side: 'west',
    a: 'Oirats', b: 'Northern Yuan',
    note: '其余漠南漠北为北元，阿尔泰山以西为瓦剌（界线示意）。', source: zhwiki('北元'),
  },
  {
    year: 1492, op: 'splitByLine', target: 'Chagatai Khanate', line: KHINGAN_LINE, side: 'east',
    a: 'Jurchen tribes', b: 'Chagatai Khanate',
    note: '原数据把蒙古高原与东北一并标为察合台汗国。大兴安岭以东为女真诸部（界线示意）。', source: zhwiki('女真'),
  },
  {
    year: 1492, op: 'splitByLine', target: 'Chagatai Khanate', line: ALTAI_LINE, side: 'east',
    a: 'Northern Yuan', b: 'Moghulistan',
    note: '阿尔泰山—哈密以东为北元（达延汗时期），以西为东察合台汗国（界线示意）。', source: zhwiki('北元'),
  },
  {
    year: 1500, op: 'splitByLine', target: 'Chagatai Khanate', line: KHINGAN_LINE, side: 'east',
    a: 'Jurchen tribes', b: 'Chagatai Khanate',
    note: '同 1492 年：大兴安岭以东为女真诸部（界线示意）。', source: zhwiki('女真'),
  },
  {
    year: 1500, op: 'splitByLine', target: 'Chagatai Khanate', line: ALTAI_LINE, side: 'east',
    a: 'Northern Yuan', b: 'Moghulistan',
    note: '同 1492 年：以东为北元，以西为东察合台汗国（界线示意）。', source: zhwiki('北元'),
  },
  { year: 1700, op: 'merge', from: 'Post-Ming Warlords', into: 'Manchu Empire', note: '三藩之乱于 1681 年平定，1683 年清收台湾，1700 年华南、西南均属清。', source: zhwiki('三藩之乱') },
  { year: 1914, op: 'rename', from: 'Manchu Empire', to: 'Republic of China', note: '清朝于 1912 年结束，1914 年为中华民国北洋政府时期。', source: zhwiki('中华民国_(1912年—1949年)') },
  ...[1920, 1930, 1938].map((year) => ({ year, op: 'rename', from: year === 1938 ? 'Chinese warlords' : 'Chinese Warlords', to: 'Republic of China', note: '北洋政府与国民政府时期虽有地方军阀割据，国家名义上为中华民国。', source: zhwiki('中华民国_(1912年—1949年)') })),
  ...[1914, 1920, 1930, 1938, 1945].map((year) => ({ year, op: 'merge', from: 'Xinjiang', into: year === 1945 ? 'China' : 'Republic of China', note: '新疆为中华民国一省，杨增新、金树仁、盛世才等相继主政。', source: zhwiki('新疆省_(中华民国)') })),
  ...[1920, 1930].map((year) => ({ year, op: 'merge', from: 'Manchuria', into: 'Republic of China', note: '东北为奉系主政，1928 年东北易帜归附国民政府。', source: zhwiki('东北易帜') })),
  { year: 1945, op: 'merge', from: 'Manchuria', into: 'China', note: '1945 年日本投降，伪满洲国覆灭，东北主权归还中华民国。', source: zhwiki('中华民国_(1912年—1949年)') },
  { year: 1945, op: 'merge', from: 'Taiwan', into: 'China', note: '1945 年 10 月中华民国政府接收台湾。', source: zhwiki('台湾光复') },
  { year: 1960, op: 'merge', from: 'Tibet', into: 'China', note: '1951 年西藏和平解放，原数据 1960 年仍将西藏单列。', source: zhwiki('西藏和平解放') },
  ...[1960, 1994, 2000, 2010].map((year) => ({ year, op: 'merge', from: 'Taiwan', into: 'China', note: '依一个中国原则，台湾作为中国领土的一部分合并显示。', source: zhwiki('一个中国原则') })),

  // 元以后西藏属历代中央政府版图；原数据在明、清初与民国时期将西藏单列，须在上面的明朝借用与民国更名之后合并
  ...[[1400, 'Ming Empire'], [1492, 'Ming Empire'], [1500, 'Ming Chinese Empire'], [1530, 'Ming Chinese Empire'], [1600, 'Ming Chinese Empire']].map(([year, into]) => ({
    year, op: 'merge', from: 'Tibet', into,
    note: '明朝设乌思藏、朵甘二都指挥使司（羁縻性质），册封法王等僧俗首领；依《中国历史地图集》惯例并入明朝显示（史学界对明廷实际管辖程度看法不一）。',
    source: zhwiki('乌思藏都指挥使司'),
  })),
  ...[1650, 1700, 1715].map((year) => ({
    year, op: 'merge', from: 'Tibet', into: 'Manchu Empire',
    note: '1642 年五世达赖喇嘛与固始汗遣使盛京通好，1653 年清廷册封五世达赖喇嘛，1727 年设驻藏大臣；依通行惯例并入清朝显示。',
    source: zhwiki('西藏历史'),
  })),
  ...[1914, 1920, 1930, 1938, 1945].map((year) => ({
    year, op: 'merge', from: 'Tibet', into: year === 1945 ? 'China' : 'Republic of China',
    note: '民国时期西藏地方与中央关系一度疏离，但中华民国设蒙藏委员会主管藏事，1940 年在拉萨设驻藏办事处，国际上亦无国家承认西藏独立；西藏属中国版图。',
    source: zhwiki('蒙藏委员会'),
  })),
  ...[1914, 1920, 1930, 1938].map((year) => ({
    year, op: 'merge', from: 'Mongolia', into: 'Republic of China',
    note: '外蒙古 1911 年底宣布独立，1915 年《中俄蒙协约》改为中国宗主权下的自治，1921 年后在苏俄支持下另立政府；中华民国至 1946 年 1 月方承认其独立，此处按当时的法理地位并入中华民国显示。',
    source: zhwiki('外蒙古独立'),
  })),

  // 元代高丽为藩属而非直辖
  ...[1279, 1300].map((year) => ({
    year, op: 'borrow', from: 1200, source_name: 'Goryeo', name: 'Goryeo', within: 'Great Khanate',
    note: '高丽为元朝藩属：元设征东行省而以高丽国王兼领，高丽仍保有王室与国号。原数据把朝鲜半岛并入元朝，此处借用 1200 年高丽范围单列。',
    source: zhwiki('征东行省'),
  })),

  // 1530：原数据蒙古高原、新疆东部、西伯利亚与朝鲜半岛南部空缺，以校勘后的 1500 年同一政权补足空白
  { year: 1530, op: 'rename', from: 'Bukara Khanate', to: 'Yarkent Khanate', note: '1514 年赛义德汗建立叶尔羌汗国，据有塔里木盆地；原数据把这一范围误标为布哈拉汗国。', source: zhwiki('叶尔羌汗国') },
  { year: 1530, op: 'rename', from: 'central Asian khanates', to: 'Siberians', note: '原数据把北冰洋沿岸的一块标为“中亚诸汗国”，实为西伯利亚诸部。', source: zhwiki('俄国征服西伯利亚') },
  { year: 1530, op: 'borrow', from: 1500, source_name: 'Northern Yuan', name: 'Northern Yuan', note: '原数据 1530 年蒙古高原空缺；此时为达延汗统一漠南漠北后的北元，借用 1500 年范围补足。', source: zhwiki('北元') },
  { year: 1530, op: 'borrow', from: 1500, source_name: 'Oirat Confederation', name: 'Oirat Confederation', note: '同上，阿尔泰山一带为瓦剌，借用 1500 年范围补足。', source: zhwiki('瓦剌') },
  { year: 1530, op: 'borrow', from: 1500, source_name: 'Moghulistan', name: 'Moghulistan', note: '原数据 1530 年吐鲁番、哈密一带空缺；此地为察合台后裔的吐鲁番汗国所据，借用 1500 年东察合台汗国范围补足。', source: zhwiki('叶尔羌汗国') },
  { year: 1530, op: 'borrow', from: 1500, source_name: 'Siberians', name: 'Siberians', note: '原数据 1530 年西伯利亚大部空缺，借用 1500 年西伯利亚诸部范围补足。', source: zhwiki('俄国征服西伯利亚') },
  { year: 1530, op: 'borrow', from: 1500, source_name: 'Korea', name: 'Korea', note: '原数据 1530 年朝鲜王朝缺汉城以南，借用 1500 年范围补足。', source: zhwiki('朝鲜王朝') },

  // 1600—1800：原数据把蒙古高原、新疆乃至西伯利亚合标为一块“中亚诸汗国”，按各时期的实际政权拆分
  {
    year: 1600, op: 'splitByLine', target: 'central Asian khanates', line: SIBERIA_LINE, side: 'north', a: 'Siberians', b: 'central Asian khanates',
    note: '原数据把蒙古高原、新疆与西伯利亚合标为一块“中亚诸汗国”。萨彦岭—贝加尔湖—黑龙江一线以北为西伯利亚诸部，俄国此时方越过乌拉尔山（界线示意）。',
    source: zhwiki('俄国征服西伯利亚'),
  },
  { year: 1600, op: 'splitByLine', target: 'central Asian khanates', line: ALTAI_LINE, side: 'east', a: 'Northern Yuan', b: 'central Asian khanates', note: '阿尔泰山以东的漠南漠北为北元（察哈尔、土默特、喀尔喀诸部，界线示意）。', source: zhwiki('北元') },
  { year: 1600, op: 'splitByLine', target: 'central Asian khanates', line: TIANSHAN_LINE, side: 'north', a: 'Oirats', b: 'Yarkent Khanate', note: '天山以北为瓦剌（卫拉特诸部），以南的塔里木盆地与吐鲁番为叶尔羌汗国（界线示意）。', source: zhwiki('叶尔羌汗国') },
  {
    year: 1650, op: 'splitByLine', target: 'central Asian khanates', line: SIBERIA_LINE, side: 'north', a: 'Siberians', b: 'central Asian khanates',
    note: '原数据把蒙古高原、新疆与贝加尔湖一带合标为“中亚诸汗国”。贝加尔湖与外贝加尔俄国尚未设堡（尼布楚 1658 年、伊尔库茨克 1661 年），为布里亚特等西伯利亚诸部（界线示意）。',
    source: zhwiki('俄国征服西伯利亚'),
  },
  { year: 1650, op: 'splitByLine', target: 'central Asian khanates', line: ALTAI_LINE, side: 'east', a: 'Khalkha', b: 'central Asian khanates', note: '1635 年漠南蒙古归附后金（清），漠北为喀尔喀三部（界线示意）。', source: zhwiki('喀尔喀蒙古') },
  { year: 1650, op: 'splitByLine', target: 'central Asian khanates', line: TIANSHAN_LINE, side: 'north', a: 'Dzungar Khanate', b: 'Yarkent Khanate', note: '天山以北为准噶尔汗国（17 世纪 30 年代立国），以南为叶尔羌汗国（界线示意）。', source: zhwiki('准噶尔汗国') },
  { year: 1700, op: 'splitByLine', target: 'central Asian khanates', line: SIBERIA_LINE, side: 'north', a: 'Tsardom of Muscovy', b: 'central Asian khanates', note: '1689 年《尼布楚条约》划定中俄东段边界，外贝加尔属俄国（界线示意）。', source: zhwiki('尼布楚条约') },
  { year: 1700, op: 'splitByLine', target: 'central Asian khanates', line: ALTAI_LINE, side: 'east', a: 'Manchu Empire', b: 'central Asian khanates', note: '1691 年喀尔喀蒙古在多伦会盟归附清朝，1696 年清军于昭莫多大败噶尔丹，漠北属清（界线示意）。', source: zhwiki('喀尔喀蒙古') },
  { year: 1700, op: 'rename', from: 'central Asian khanates', to: 'Dzungar Khanate', note: '其余新疆与阿尔泰山以西为准噶尔汗国，1680 年已吞并叶尔羌汗国。', source: zhwiki('准噶尔汗国') },
  { year: 1715, op: 'splitByLine', target: 'central Asian khanates', line: ALTAI_LINE, side: 'east', a: 'Manchu Empire', b: 'Dzungar Khanate', note: '1715 年清与准噶尔沿阿尔泰山对峙：以东喀尔喀属清，以西为准噶尔汗国（界线示意）。', source: zhwiki('准噶尔汗国') },
  ...[1783, 1800].map((year) => ({
    year, op: 'splitByLine', target: 'central Asian khanates', box: [73.4, 35.5, 80.5, 41.4], a: 'Qing Empire', b: 'central Asian khanates',
    note: '1759 年清朝平定大小和卓之乱，统一天山南路；原数据仍把喀什噶尔一带划在“中亚诸汗国”。', source: zhwiki('大小和卓之乱'),
  })),

  // 原数据缺失的岛屿：以 Natural Earth 陆地轮廓补给当时的所属政权（只填空白，不覆盖已有政权）
  ...[[1700, 'Manchu Empire'], [1715, 'Manchu Empire'], [1783, 'Qing Empire'], [1800, 'Qing Empire'], [1815, 'Manchu Empire']].map(([year, into]) => ({
    year, op: 'claimLand', land: '台湾岛', area: TAIWAN_AREA, into,
    note: '1683 年清军收复台湾，次年设台湾府隶福建省；原数据缺台湾岛。', source: zhwiki('台湾府'),
  })),
  { year: 1900, op: 'claimLand', land: '台湾岛', area: TAIWAN_AREA, into: 'Imperial Japan', note: '1895 年《马关条约》清廷割让台湾、澎湖，此后至 1945 年为日本占据；原数据缺台湾岛。', source: zhwiki('马关条约') },
  ...[[1492, 'Ming Empire'], [1500, 'Ming Chinese Empire'], [1530, 'Ming Chinese Empire'], [1600, 'Ming Chinese Empire'], [1783, 'Qing Empire']].map(([year, into]) => ({
    year, op: 'claimLand', land: '海南岛', area: HAINAN_AREA, into,
    note: '海南岛自西汉设珠崖、儋耳二郡，明清为琼州府；原数据缺海南岛。', source: zhwiki('琼州府'),
  })),
];

// 合成年代切片：在关键年份补一张“局部更新”的切片，世界其他地区沿用 base 年份
// steps 依次执行：remove 删除要素；transplant 从 donor 年份（已校勘）移植要素并从其他要素中扣除其范围；
// unionInto 把多个要素合并为一个新政权；rename 更名
export const synthetic = [
  {
    year: -221, base: -300,
    steps: [
      { op: 'transplant', donor: -200, names: ['Han Empire', 'Nan-Yue', 'Min-Yue'] },
      { op: 'unionInto', names: ['Han Empire', 'Nan-Yue', 'Min-Yue'], name: 'Qin Empire' },
      { op: 'remove', names: ['Qin', 'Zhou states', 'Yue'] },
    ],
    note: '公元前 221 年秦灭六国。秦朝疆域近似取西汉初年汉、南越、闽越范围之并（秦亡后南越、闽越方才自立），其余地区沿用公元前 300 年数据。',
    source: zhwiki('秦朝'),
  },
  {
    year: 1206, base: 1200,
    steps: [{ op: 'rename', from: 'Mongol tribes', to: 'Mongol Empire' }],
    note: '1206 年铁木真在斡难河源称成吉思汗，建立大蒙古国；疆域沿用 1200 年蒙古诸部范围。',
    source: zhwiki('大蒙古国'),
  },
  {
    year: 1142, base: 1100,
    steps: [
      { op: 'transplant', donor: 1200, names: ['Southern Song', 'Jin (Jurchen)', 'Kara Khitai Khaganate'] },
      { op: 'remove', names: ['Song Empire', 'Liao'] },
    ],
    note: '1127 年靖康之变后宋室南渡，1142 年绍兴和议确定宋金以淮河—大散关为界；西辽已于 1124—1132 年间立国。东亚范围沿用校勘后的 1200 年，其余地区沿用 1100 年。',
    source: zhwiki('绍兴和议'),
  },
  {
    year: 1234, base: 1206,
    steps: [{ op: 'unionInto', names: ['Mongol Empire', 'Jin (Jurchen)', 'Xixia', 'Kara Khitai Khaganate', 'Khwarazmian dynasty'], name: 'Mongol Empire' }],
    note: '大蒙古国先后灭西辽（1218）、花剌子模（1221）、西夏（1227），1234 年联宋灭金。范围取 1206 年各政权多边形之并。',
    source: zhwiki('蒙金战争'),
  },
  {
    year: 1368, base: 1300,
    steps: [
      { op: 'transplant', donor: 1400, names: ['Ming Empire', 'Northern Yuan', 'Jurchen tribes', 'Oirats', 'Joseon'] },
      { op: 'rename', from: 'Joseon', to: 'Goryeo' },
      { op: 'rename', from: 'Shogun Japan (Kamakura)', to: 'Muromachi Shogunate' },
      { op: 'remove', names: ['Great Khanate'] },
    ],
    note: '1368 年明军攻占大都，元廷北迁。明朝范围近似取 1400 年（明初至 1387 年方陆续统一四川、云南、辽东）；朝鲜半岛此时仍为高丽。',
    source: zhwiki('明朝'),
  },
  {
    year: 1644, base: 1600,
    steps: [
      { op: 'transplant', donor: 1650, names: ['Manchu Empire', 'Post-Ming Warlords', 'Tsardom of Muscovy'] },
      { op: 'remove', names: ['Ming Chinese Empire'] },
      { op: 'rename', from: 'Northern Yuan', to: 'Khalkha' },
      { op: 'rename', from: 'Oirats', to: 'Dzungar Khanate' },
    ],
    note: '1644 年李自成攻入北京、明崇祯帝自缢，清军随即入关；东亚范围沿用 1650 年（清与南明并立），其余地区沿用 1600 年。',
    source: zhwiki('甲申之变'),
  },
  {
    year: 1912, base: 1900,
    steps: [
      { op: 'transplant', donor: 1914, names: ['Republic of China', 'Empire of Japan'] },
      { op: 'remove', names: ['Manchu Empire', 'Imperial Japan', 'Korea'] },
    ],
    note: '1912 年 1 月 1 日中华民国成立，2 月 12 日清帝退位；日本已于 1910 年吞并朝鲜。东亚范围沿用 1914 年，其余地区沿用 1900 年。',
    source: zhwiki('中华民国_(1912年—1949年)'),
  },
  {
    year: 1949, base: 1945,
    steps: [
      { op: 'transplant', donor: 1960, names: ["People's Republic of China", "Korea, Democratic People's Republic of", 'Korea, Republic of'] },
      { op: 'remove', names: ['Republic of China', 'Korea (USSR)', 'Korea (USA)'] },
    ],
    note: '1949 年 10 月 1 日中华人民共和国成立；朝鲜半岛已于 1948 年分立两国。东亚范围沿用 1960 年，其余地区沿用 1945 年。',
    source: zhwiki('中华人民共和国开国大典'),
  },
];

// 同名但不同时代的政权，按年份改用更准确的规范名（仅影响名称，不改几何）
export const yearNames = [
  { years: [-1500], from: 'Zhoa', to: 'Shang' },
  { years: [-1000], from: 'Zhoa', to: 'Western Zhou' },
  { years: [-700], from: 'Zhoa', to: 'Eastern Zhou' },
  { years: [1945], from: 'China', to: 'Republic of China' },
  { years: [1960, 1994, 2000, 2010], from: 'China', to: "People's Republic of China" },
];
