// 年表：世界史分期，以及各国家谱系的朝代 / 政体纪年（时间轴第二行随所看的国家切换）。
// 中国夏、商、西周起讫依夏商周断代工程推定，其余依通行年表；交替的重叠年份取后起者。
import type { Text } from '../types.ts';

export interface Era {
  name: Text;
  from: number;
  to: number;
  tint: string;
}

export const WORLD_ERAS: Era[] = [
  { name: { zh: '上古', en: 'Ancient' }, from: -3200, to: -800, tint: 'rgba(168, 116, 63, 0.10)' },
  { name: { zh: '古典', en: 'Classical' }, from: -800, to: 500, tint: 'rgba(62, 92, 118, 0.08)' },
  { name: { zh: '中古', en: 'Medieval' }, from: 500, to: 1450, tint: 'rgba(95, 138, 114, 0.09)' },
  { name: { zh: '近世', en: 'Early modern' }, from: 1450, to: 1789, tint: 'rgba(168, 116, 63, 0.08)' },
  { name: { zh: '近代', en: 'Modern' }, from: 1789, to: 1945, tint: 'rgba(178, 58, 43, 0.07)' },
  { name: { zh: '现代', en: 'Contemporary' }, from: 1945, to: 2025, tint: 'rgba(62, 92, 118, 0.09)' },
];

// short：格子较窄时显示的简称（省略则用全称）
export interface Period {
  name: Text;
  short?: Text;
  from: number;
  to: number;
}

const p = (from: number, to: number, zh: string, en: string, shortZh?: string, shortEn?: string): Period => ({
  from,
  to,
  name: { zh, en },
  ...(shortZh || shortEn ? { short: { zh: shortZh ?? zh, en: shortEn ?? en } } : {}),
});

export const NOW = 2025;

// 键为国家谱系 id（见 lineages.ts）
export const CHRONOLOGIES: Record<string, Period[]> = {
  china: [
    p(-2070, -1600, '夏', 'Xia'),
    p(-1600, -1046, '商', 'Shang'),
    p(-1046, -771, '西周', 'Western Zhou', '西周', 'W. Zhou'),
    p(-770, -476, '春秋', 'Spring and Autumn', '春秋', 'Spring & Autumn'),
    p(-475, -221, '战国', 'Warring States'),
    p(-221, -207, '秦', 'Qin'),
    p(-202, 8, '西汉', 'Western Han', '西汉', 'W. Han'),
    p(9, 23, '新', 'Xin'),
    p(25, 220, '东汉', 'Eastern Han', '东汉', 'E. Han'),
    p(220, 280, '三国', 'Three Kingdoms'),
    p(266, 316, '西晋', 'Western Jin', '西晋', 'W. Jin'),
    p(317, 420, '东晋·十六国', 'Eastern Jin and Sixteen Kingdoms', '东晋', 'E. Jin'),
    p(420, 589, '南北朝', 'Northern and Southern dynasties', '南北朝', 'N. & S.'),
    p(581, 618, '隋', 'Sui'),
    p(618, 907, '唐', 'Tang'),
    p(907, 979, '五代十国', 'Five Dynasties and Ten Kingdoms', '五代', 'Five Dyn.'),
    p(960, 1127, '北宋', 'Northern Song', '北宋', 'N. Song'),
    p(1127, 1279, '南宋', 'Southern Song', '南宋', 'S. Song'),
    p(1271, 1368, '元', 'Yuan'),
    p(1368, 1644, '明', 'Ming'),
    p(1644, 1912, '清', 'Qing'),
    p(1912, 1949, '中华民国', 'Republic of China', '民国', 'Republic'),
    p(1949, NOW, '中华人民共和国', "People's Republic of China", '新中国', 'PRC'),
  ],
  rome: [
    p(-753, -509, '王政时代', 'Roman Kingdom', '王政', 'Kingdom'),
    p(-509, -27, '罗马共和国', 'Roman Republic', '共和国', 'Republic'),
    p(-27, 284, '帝国前期（元首制）', 'Principate', '元首制', 'Principate'),
    p(284, 395, '帝国后期（多米那特制）', 'Dominate', '后期帝国', 'Dominate'),
    p(395, 476, '东西分治', 'Divided empire', '分治', 'Divided'),
    p(476, 717, '拜占庭帝国·早期', 'Early Byzantine Empire', '拜占庭早期', 'Early Byzantine'),
    p(717, 1204, '拜占庭帝国·中期', 'Middle Byzantine Empire', '拜占庭中期', 'Middle Byzantine'),
    p(1204, 1261, '拉丁帝国时期', 'Latin occupation', '拉丁', 'Latin'),
    p(1261, 1453, '拜占庭帝国·巴列奥略王朝', 'Palaiologan Byzantium', '巴列奥略', 'Palaiologan'),
  ],
  persia: [
    p(-2700, -550, '埃兰与米底', 'Elam and Media', '埃兰', 'Elam'),
    p(-550, -330, '阿契美尼德王朝', 'Achaemenid Empire', '阿契美尼德', 'Achaemenid'),
    p(-330, -247, '希腊化时期', 'Alexander and the Seleucids', '塞琉古', 'Seleucid'),
    p(-247, 224, '安息（帕提亚）', 'Parthian Empire', '安息', 'Parthian'),
    p(224, 651, '萨珊王朝', 'Sasanian Empire', '萨珊', 'Sasanian'),
    p(651, 821, '哈里发国治下', 'Under the caliphates', '哈里发', 'Caliphate'),
    p(821, 1037, '伊朗诸王朝', 'Iranian Intermezzo', '诸王朝', 'Intermezzo'),
    p(1037, 1194, '塞尔柱帝国', 'Seljuk Empire', '塞尔柱', 'Seljuk'),
    p(1194, 1220, '花剌子模', 'Khwarazmian Empire', '花剌子模', 'Khwarazm'),
    p(1220, 1335, '蒙古与伊儿汗国', 'Mongols and the Ilkhanate', '伊儿汗国', 'Ilkhanate'),
    p(1335, 1370, '诸侯割据', 'Successor states', '割据', 'Successors'),
    p(1370, 1501, '帖木儿帝国', 'Timurid Empire', '帖木儿', 'Timurid'),
    p(1501, 1736, '萨法维王朝', 'Safavid Empire', '萨法维', 'Safavid'),
    p(1736, 1789, '阿夫沙尔与赞德王朝', 'Afsharid and Zand dynasties', '赞德', 'Zand'),
    p(1789, 1925, '恺加王朝', 'Qajar dynasty', '恺加', 'Qajar'),
    p(1925, 1979, '巴列维王朝', 'Pahlavi dynasty', '巴列维', 'Pahlavi'),
    p(1979, NOW, '伊朗伊斯兰共和国', 'Islamic Republic of Iran', '伊朗', 'Iran'),
  ],
  mongol: [
    p(1100, 1206, '蒙古诸部', 'Mongol tribes', '诸部', 'Tribes'),
    p(1206, 1271, '大蒙古国', 'Mongol Empire', '大蒙古国', 'Mongol Empire'),
    p(1271, 1368, '元朝与诸汗国', 'Yuan dynasty and the khanates', '元', 'Yuan'),
    p(1368, 1635, '北元', 'Northern Yuan', '北元', 'N. Yuan'),
    p(1635, 1911, '清朝治下', 'Under Qing rule', '清治', 'Qing rule'),
    p(1911, 1924, '外蒙古自治时期', 'Outer Mongolia (autonomy period)', '自治', 'Autonomy'),
    p(1924, 1992, '蒙古人民共和国', "Mongolian People's Republic", '人民共和国', "People's Rep."),
    p(1992, NOW, '蒙古国', 'Mongolia'),
  ],
  russia: [
    p(882, 1240, '基辅罗斯', "Kievan Rus'", '基辅罗斯', "Kievan Rus'"),
    p(1240, 1480, '罗斯诸公国（金帐汗国宗主下）', "Rus' principalities under the Golden Horde", '诸公国', 'Principalities'),
    p(1480, 1547, '莫斯科大公国', 'Grand Duchy of Moscow', '莫斯科', 'Muscovy'),
    p(1547, 1721, '俄罗斯沙皇国', 'Tsardom of Russia', '沙皇国', 'Tsardom'),
    p(1721, 1917, '俄罗斯帝国', 'Russian Empire', '帝国', 'Empire'),
    p(1917, 1922, '苏俄', 'Soviet Russia'),
    p(1922, 1991, '苏联', 'Soviet Union', '苏联', 'USSR'),
    p(1991, NOW, '俄罗斯联邦', 'Russian Federation', '俄联邦', 'Russia'),
  ],
  ottoman: [
    p(1077, 1299, '罗姆苏丹国', 'Sultanate of Rum', '罗姆', 'Rum'),
    p(1299, 1453, '奥斯曼的兴起', 'Rise of the Ottomans', '兴起', 'Rise'),
    p(1453, 1566, '奥斯曼帝国·鼎盛', 'Ottoman classical age', '鼎盛', 'Classical age'),
    p(1566, 1703, '奥斯曼帝国·转型', 'Ottoman transformation', '转型', 'Transformation'),
    p(1703, 1789, '奥斯曼帝国·旧制度', 'Ottoman old regime', '旧制度', 'Old regime'),
    p(1789, 1908, '奥斯曼帝国·改革与衰落', 'Ottoman reform and decline', '改革', 'Reform'),
    p(1908, 1922, '奥斯曼帝国·解体', 'Dissolution of the empire', '解体', 'Dissolution'),
    p(1923, NOW, '土耳其共和国', 'Republic of Turkey', '土耳其', 'Turkey'),
  ],
  arab: [
    p(622, 632, '先知时代', 'Era of the Prophet', '先知', 'Prophet'),
    p(632, 661, '正统哈里发时期', 'Rashidun Caliphate', '正统', 'Rashidun'),
    p(661, 750, '倭马亚王朝', 'Umayyad Caliphate', '倭马亚', 'Umayyad'),
    p(750, 945, '阿拔斯王朝·鼎盛', 'Abbasid Caliphate', '阿拔斯', 'Abbasid'),
    p(945, 1258, '阿拔斯王朝·后期', 'Later Abbasids', '后期阿拔斯', 'Later Abbasids'),
    p(1261, 1517, '开罗的阿拔斯哈里发', 'Abbasid caliphs of Cairo', '开罗哈里发', 'Cairo caliphs'),
  ],
  britain: [
    p(43, 410, '罗马不列颠', 'Roman Britain', '罗马', 'Roman'),
    p(410, 1066, '盎格鲁-撒克逊时期', 'Anglo-Saxon England', '盎格鲁-撒克逊', 'Anglo-Saxon'),
    p(1066, 1154, '诺曼王朝', 'Norman dynasty', '诺曼', 'Norman'),
    p(1154, 1485, '金雀花王朝', 'Plantagenet dynasty', '金雀花', 'Plantagenet'),
    p(1485, 1603, '都铎王朝', 'Tudor dynasty', '都铎', 'Tudor'),
    p(1603, 1714, '斯图亚特王朝', 'Stuart dynasty', '斯图亚特', 'Stuart'),
    p(1714, 1837, '乔治时代', 'Georgian era', '乔治', 'Georgian'),
    p(1837, 1901, '维多利亚时代', 'Victorian era', '维多利亚', 'Victorian'),
    p(1901, NOW, '温莎王朝', 'House of Windsor', '温莎', 'Windsor'),
  ],
  france: [
    p(-50, 481, '罗马高卢', 'Roman Gaul', '高卢', 'Gaul'),
    p(481, 751, '墨洛温王朝', 'Merovingian dynasty', '墨洛温', 'Merovingian'),
    p(751, 987, '加洛林王朝', 'Carolingian dynasty', '加洛林', 'Carolingian'),
    p(987, 1328, '卡佩王朝', 'Capetian dynasty', '卡佩', 'Capetian'),
    p(1328, 1589, '瓦卢瓦王朝', 'Valois dynasty', '瓦卢瓦', 'Valois'),
    p(1589, 1792, '波旁王朝', 'Bourbon dynasty', '波旁', 'Bourbon'),
    p(1792, 1804, '第一共和国', 'First Republic', '一共', '1st Rep.'),
    p(1804, 1814, '第一帝国', 'First Empire', '一帝', '1st Emp.'),
    p(1814, 1830, '波旁复辟', 'Bourbon Restoration', '复辟', 'Restoration'),
    p(1830, 1848, '七月王朝', 'July Monarchy', '七月', 'July Mon.'),
    p(1848, 1852, '第二共和国', 'Second Republic', '二共', '2nd Rep.'),
    p(1852, 1870, '第二帝国', 'Second Empire', '二帝', '2nd Emp.'),
    p(1870, 1940, '第三共和国', 'Third Republic', '第三共和', '3rd Republic'),
    p(1940, 1946, '维希政权与临时政府', 'Vichy France and the Provisional Government', '维希', 'Vichy'),
    p(1946, 1958, '第四共和国', 'Fourth Republic', '四共', '4th Rep.'),
    p(1958, NOW, '第五共和国', 'Fifth Republic', '第五共和', '5th Republic'),
  ],
  spain: [
    p(-218, 409, '罗马西班牙', 'Roman Hispania', '罗马', 'Hispania'),
    p(409, 711, '西哥特王国', 'Visigothic Kingdom', '西哥特', 'Visigothic'),
    p(711, 1031, '安达卢斯（倭马亚）', 'Umayyad al-Andalus', '安达卢斯', 'Al-Andalus'),
    p(1031, 1479, '收复失地运动', 'Reconquista', '收复失地', 'Reconquista'),
    p(1479, 1516, '天主教双王', 'Catholic Monarchs', '双王', 'Catholic Mon.'),
    p(1516, 1700, '哈布斯堡王朝', 'Habsburg Spain', '哈布斯堡', 'Habsburg'),
    p(1700, 1808, '波旁王朝', 'Bourbon Spain', '波旁', 'Bourbon'),
    p(1808, 1874, '战争与动荡的年代', 'War and upheaval', '动荡', 'Upheaval'),
    p(1874, 1931, '波旁复辟', 'Bourbon Restoration', '复辟', 'Restoration'),
    p(1931, 1939, '第二共和国与内战', 'Second Republic and Civil War', '共和', 'Republic'),
    p(1939, 1975, '佛朗哥时期', 'Francoist Spain', '佛朗哥', 'Franco'),
    p(1975, NOW, '君主立宪', 'Constitutional monarchy', '立宪', 'Monarchy'),
  ],
  usa: [
    p(1607, 1776, '殖民地时期', 'Colonial era', '殖民地', 'Colonial'),
    p(1776, 1815, '建国初期', 'Revolution and early republic', '建国', 'Early republic'),
    p(1815, 1861, '西进与扩张', 'Expansion and reform', '扩张', 'Expansion'),
    p(1861, 1877, '南北战争与重建', 'Civil War and Reconstruction', '内战', 'Civil War'),
    p(1877, 1896, '镀金时代', 'Gilded Age', '镀金', 'Gilded Age'),
    p(1896, 1917, '进步时代', 'Progressive Era', '进步', 'Progressive'),
    p(1917, 1929, '一战与二十年代', 'World War I and the Twenties', '二十年代', 'Twenties'),
    p(1929, 1945, '大萧条与二战', 'Depression and World War II', '萧条·二战', 'Depression & WWII'),
    p(1945, 1991, '冷战时期', 'Cold War', '冷战', 'Cold War'),
    p(1991, NOW, '当代', 'Contemporary era', '当代', 'Today'),
  ],
  japan: [
    p(-3200, -300, '绳文时代', 'Jomon period', '绳文', 'Jomon'),
    p(-300, 250, '弥生时代', 'Yayoi period', '弥生', 'Yayoi'),
    p(250, 538, '古坟时代', 'Kofun period', '古坟', 'Kofun'),
    p(538, 710, '飞鸟时代', 'Asuka period', '飞鸟', 'Asuka'),
    p(710, 794, '奈良时代', 'Nara period', '奈良', 'Nara'),
    p(794, 1185, '平安时代', 'Heian period', '平安', 'Heian'),
    p(1185, 1333, '镰仓时代', 'Kamakura period', '镰仓', 'Kamakura'),
    p(1336, 1573, '室町时代', 'Muromachi period', '室町', 'Muromachi'),
    p(1573, 1603, '安土桃山时代', 'Azuchi-Momoyama period', '桃山', 'Momoyama'),
    p(1603, 1868, '江户时代', 'Edo period', '江户', 'Edo'),
    p(1868, 1912, '明治', 'Meiji era', '明治', 'Meiji'),
    p(1912, 1926, '大正', 'Taisho era', '大正', 'Taisho'),
    p(1926, 1989, '昭和', 'Showa era', '昭和', 'Showa'),
    p(1989, 2019, '平成', 'Heisei era', '平成', 'Heisei'),
    p(2019, NOW, '令和', 'Reiwa era', '令和', 'Reiwa'),
  ],
  india: [
    p(-3200, -1300, '印度河文明', 'Indus Valley Civilization', '印度河', 'Indus'),
    p(-1500, -600, '吠陀时代', 'Vedic period', '吠陀', 'Vedic'),
    p(-600, -322, '十六雄国', 'Mahajanapadas', '列国', 'Mahajanapadas'),
    p(-322, -185, '孔雀王朝', 'Maurya Empire', '孔雀', 'Maurya'),
    p(-185, 320, '巽伽、百乘与贵霜', 'Shunga, Satavahana and Kushan', '诸国', 'Kingdoms'),
    p(320, 550, '笈多王朝', 'Gupta Empire', '笈多', 'Gupta'),
    p(550, 1206, '诸王国并立', 'Regional kingdoms', '诸王国', 'Regional kingdoms'),
    p(1206, 1526, '德里苏丹国', 'Delhi Sultanate', '德里苏丹', 'Delhi Sultanate'),
    p(1526, 1757, '莫卧儿帝国', 'Mughal Empire', '莫卧儿', 'Mughal'),
    p(1757, 1858, '东印度公司统治', 'Company rule', '公司', 'Company'),
    p(1858, 1947, '英属印度', 'British Raj', '英属', 'Raj'),
    p(1947, NOW, '印度共和国', 'Republic of India', '共和国', 'Republic'),
  ],
  egypt: [
    p(-3100, -2686, '早王朝时期', 'Early Dynastic period', '早王朝', 'Early Dyn.'),
    p(-2686, -2181, '古王国', 'Old Kingdom', '古王国', 'Old Kingdom'),
    p(-2181, -2055, '第一中间期', 'First Intermediate period', '一中', '1st Int.'),
    p(-2055, -1650, '中王国', 'Middle Kingdom', '中王国', 'Middle K.'),
    p(-1650, -1550, '第二中间期', 'Second Intermediate period', '二中', '2nd Int.'),
    p(-1550, -1069, '新王国', 'New Kingdom', '新王国', 'New Kingdom'),
    p(-1069, -664, '第三中间期', 'Third Intermediate period', '三中', '3rd Int.'),
    p(-664, -332, '后王朝时期', 'Late period', '后期', 'Late'),
    p(-332, -30, '托勒密王朝', 'Ptolemaic Kingdom', '托勒密', 'Ptolemaic'),
    p(-30, 641, '罗马与拜占庭时期', 'Roman and Byzantine Egypt', '罗马', 'Roman'),
    p(641, 969, '哈里发国治下', 'Under the caliphates', '哈里发', 'Caliphate'),
    p(969, 1171, '法蒂玛王朝', 'Fatimid Caliphate', '法蒂玛', 'Fatimid'),
    p(1171, 1250, '阿尤布王朝', 'Ayyubid Sultanate', '阿尤布', 'Ayyubid'),
    p(1250, 1517, '马穆鲁克王朝', 'Mamluk Sultanate', '马穆鲁克', 'Mamluk'),
    p(1517, 1805, '奥斯曼埃及', 'Ottoman Egypt', '奥斯曼', 'Ottoman'),
    p(1805, 1953, '穆罕默德·阿里王朝', 'Muhammad Ali dynasty', '阿里王朝', 'Muhammad Ali'),
    p(1953, NOW, '埃及共和国', 'Republic of Egypt', '共和国', 'Republic'),
  ],
  germany: [
    p(481, 843, '法兰克王国', 'Frankish realm', '法兰克', 'Franks'),
    p(843, 962, '东法兰克', 'East Francia', '东法兰克', 'E. Francia'),
    p(962, 1438, '神圣罗马帝国·中世纪', 'Holy Roman Empire (medieval)', '神圣罗马帝国', 'Holy Roman Empire'),
    p(1438, 1806, '神圣罗马帝国·哈布斯堡', 'Holy Roman Empire (Habsburg)', '哈布斯堡', 'Habsburg HRE'),
    p(1806, 1815, '莱茵邦联', 'Confederation of the Rhine', '莱茵', 'Rhine'),
    p(1815, 1866, '德意志邦联', 'German Confederation', '邦联', 'Confed.'),
    p(1867, 1871, '北德意志邦联', 'North German Confederation', '北德', 'N. German'),
    p(1871, 1918, '德意志帝国', 'German Empire', '帝国', 'Empire'),
    p(1918, 1933, '魏玛共和国', 'Weimar Republic', '魏玛', 'Weimar'),
    p(1933, 1945, '纳粹德国', 'Nazi Germany', '纳粹', 'Nazi'),
    p(1945, 1949, '盟军占领', 'Allied occupation', '占领', 'Occup.'),
    p(1949, 1990, '两德分立', 'Divided Germany', '分立', 'Divided'),
    p(1990, NOW, '统一后的德国', 'Reunified Germany', '统一', 'Reunified'),
  ],
};

// 某国某年所处的时期；交替的重叠年份取后起者
export function periodAt(lineageId: string, year: number): Period | null {
  let hit: Period | null = null;
  for (const d of CHRONOLOGIES[lineageId] ?? []) if (year >= d.from && year < d.to + 1) hit = d;
  return hit;
}

export function eraAt(year: number): Era {
  return WORLD_ERAS.find((e) => year >= e.from && year < e.to) ?? WORLD_ERAS[WORLD_ERAS.length - 1];
}
