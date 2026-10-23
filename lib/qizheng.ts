/**
 * MORIA 七政四餘完全對齊排盤引擎 (lib/qizheng.ts)
 * 體制：黃道/赤道雙座標轉換 + astronomy-engine JPL 高精度算盤 + MORIA 果老星宗命宮平移法
 */

import * as Astronomy from 'astronomy-engine';

export interface StarPosition {
  name: string;
  type: '政' | '餘';
  longitude: number;      // 黃道/赤道經度 (0° - 360°)
  zodiac: string;         // 落宮地支與星座
  wuxing: '木' | '火' | '土' | '金' | '水';
  mansion: string;        // 今制二十八宿
  mansionDegree: number;  // 宿內度數
  isRetrograde?: boolean;
}

export interface QizhengHouse {
  name: string;
  branch: string;
  zodiacSign: string;
  wuxing: '木' | '火' | '土' | '金' | '水';
  stars: string[];
  shensha: string[];
}

export interface QizhengChart {
  julianDay: number;
  mingGong: string;
  shenGong: string;
  stars: StarPosition[];
  houses: QizhengHouse[];
  mansions: { name: string; startDeg: number; span: number; wuxing: string }[];
  trueSolarTime: string;
  mingGongZhu: string;
  mingDuZhu: string;
  mingDuMansion: string;
  mingDuDegree: number;
}

const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// MORIA 黃道十二宮 (以 0° 戌宮/白羊座起點)
const ZODIAC_SECTORS = [
  { branch: '戌', sign: '白羊座', wuxing: '火' as const, minDeg: 0, maxDeg: 30, ruler: '火星' },
  { branch: '酉', sign: '金牛座', wuxing: '金' as const, minDeg: 30, maxDeg: 60, ruler: '金星' },
  { branch: '申', sign: '雙子座', wuxing: '水' as const, minDeg: 60, maxDeg: 90, ruler: '水星' },
  { branch: '未', sign: '巨蟹座', wuxing: '月' as const, minDeg: 90, maxDeg: 120, ruler: '太陰' },
  { branch: '午', sign: '獅子座', wuxing: '日' as const, minDeg: 120, maxDeg: 150, ruler: '太陽' },
  { branch: '巳', sign: '處女座', wuxing: '水' as const, minDeg: 150, maxDeg: 180, ruler: '水星' },
  { branch: '辰', sign: '天秤座', wuxing: '金' as const, minDeg: 180, maxDeg: 210, ruler: '金星' },
  { branch: '卯', sign: '天蠍座', wuxing: '火' as const, minDeg: 210, maxDeg: 240, ruler: '火星' },
  { branch: '寅', sign: '射手座', wuxing: '木' as const, minDeg: 240, maxDeg: 270, ruler: '木星' },
  { branch: '丑', sign: '摩羯座', wuxing: '土' as const, minDeg: 270, maxDeg: 300, ruler: '土星' },
  { branch: '子', sign: '水瓶座', wuxing: '土' as const, minDeg: 300, maxDeg: 330, ruler: '土星' },
  { branch: '亥', sign: '雙魚座', wuxing: '木' as const, minDeg: 330, maxDeg: 360, ruler: '木星' },
];

// MORIA 今制二十八宿基準分度 (J2000 赤道/黃道對齊)
const MORIA_28_MANSIONS = [
  { name: '角木蛟', startDeg: 201.0, span: 12.1, wuxing: '木' as const, ruler: '木星' },
  { name: '亢金龍', startDeg: 213.1, span: 9.3,  wuxing: '金' as const, ruler: '金星' },
  { name: '氐土貉', startDeg: 222.4, span: 16.2, wuxing: '土' as const, ruler: '土星' },
  { name: '房日兔', startDeg: 238.6, span: 5.8,  wuxing: '火' as const, ruler: '太陽' },
  { name: '心月狐', startDeg: 244.4, span: 6.2,  wuxing: '火' as const, ruler: '太陰' },
  { name: '尾火虎', startDeg: 250.6, span: 18.0, wuxing: '火' as const, ruler: '火星' },
  { name: '箕水豹', startDeg: 268.6, span: 9.8,  wuxing: '水' as const, ruler: '水星' },
  { name: '斗木蟹', startDeg: 278.4, span: 24.1, wuxing: '木' as const, ruler: '木星' },
  { name: '牛金牛', startDeg: 302.5, span: 7.2,  wuxing: '金' as const, ruler: '金星' },
  { name: '女土蝠', startDeg: 309.7, span: 11.2, wuxing: '土' as const, ruler: '土星' },
  { name: '虛日鼠', startDeg: 320.9, span: 9.8,  wuxing: '火' as const, ruler: '太陽' },
  { name: '危月燕', startDeg: 330.7, span: 20.1, wuxing: '火' as const, ruler: '太陰' },
  { name: '室火豬', startDeg: 350.8, span: 15.8, wuxing: '火' as const, ruler: '火星' },
  { name: '壁水蕐', startDeg: 6.6,   span: 12.8, wuxing: '水' as const, ruler: '水星' },
  { name: '奎木狼', startDeg: 19.4,  span: 16.1, wuxing: '木' as const, ruler: '木星' },
  { name: '婁金狗', startDeg: 35.5,  span: 12.1, wuxing: '金' as const, ruler: '金星' },
  { name: '胃土雉', startDeg: 47.6,  span: 15.2, wuxing: '土' as const, ruler: '土星' },
  { name: '昴日雞', startDeg: 62.8,  span: 11.1, wuxing: '火' as const, ruler: '太陽' },
  { name: '畢月烏', startDeg: 73.9,  span: 16.5, wuxing: '火' as const, ruler: '太陰' },
  { name: '觜火猴', startDeg: 90.4,  span: 0.8,  wuxing: '火' as const, ruler: '火星' },
  { name: '參水猿', startDeg: 91.2,  span: 10.2, wuxing: '水' as const, ruler: '水星' },
  { name: '井木犴', startDeg: 101.4, span: 31.0, wuxing: '木' as const, ruler: '木星' },
  { name: '鬼金羊', startDeg: 132.4, span: 2.8,  wuxing: '金' as const, ruler: '金星' },
  { name: '柳土獐', startDeg: 135.2, span: 13.8, wuxing: '土' as const, ruler: '土星' },
  { name: '星日馬', startDeg: 149.0, span: 6.8,  wuxing: '火' as const, ruler: '太陽' },
  { name: '張月鹿', startDeg: 155.8, span: 17.8, wuxing: '火' as const, ruler: '太陰' },
  { name: '翼火蛇', startDeg: 173.6, span: 18.2, wuxing: '火' as const, ruler: '火星' },
  { name: '軫水蚓', startDeg: 191.8, span: 9.2,  wuxing: '水' as const, ruler: '水星' },
];

const GUOLAO_HOUSES = ['命宮', '財帛宮', '兄弟宮', '田宅宮', '男女宮', '奴僕宮', '夫妻宮', '疾厄宮', '遷移宮', '官祿宮', '福德宮', '父母宮'];

function rev(deg: number): number {
  let d = deg % 360;
  return d < 0 ? d + 360 : d;
}

// 匹配二十八宿（含跨 0° 邊界處理）
function findMansion(long: number) {
  const l = rev(long);
  for (const m of MORIA_28_MANSIONS) {
    const start = m.startDeg;
    const end = rev(m.startDeg + m.span);

    if (start < end) {
      if (l >= start && l < end) {
        return { mansion: m, offset: l - start };
      }
    } else {
      if (l >= start || l < end) {
        const offset = l >= start ? l - start : l + 360 - start;
        return { mansion: m, offset };
      }
    }
  }
  return { mansion: MORIA_28_MANSIONS[0], offset: 0 };
}

// 獲取地心黃經 (Ecliptic Longitude)
function getEclipticLong(body: Astronomy.Body, date: Date): number {
  const geo = Astronomy.GeoVector(body, date, true);
  const ecl = Astronomy.Ecliptic(geo);
  return rev(ecl.elon);
}

// 獲取地心赤經 (Right Ascension 度數) - 用於 MORIA 赤道宿度模式
function getRightAscension(body: Astronomy.Body, date: Date): number {
  const geo = Astronomy.GeoVector(body, date, true);
  const equ = Astronomy.Equator(body, date, true);
  return rev(equ.ra * 15.0); // 將小時轉為角度 (1h = 15°)
}

export function calculateQizheng(
  birthYear: number,
  birthMonth: number,
  birthDay: number,
  birthHour: number = 12,
  birthMinute: number = 0,
  longitude: number = 114.17
): QizhengChart {
  // 1. UTC 天文時間點
  const localTimeMinutes = birthHour * 60 + birthMinute;
  const utcTotalMinutes = localTimeMinutes - (longitude / 15.0) * 60;
  
  let utcYear = birthYear;
  let utcMonth = birthMonth;
  let utcDay = birthDay;
  let utcMinutes = utcTotalMinutes;

  if (utcMinutes < 0) {
    utcMinutes += 1440;
    utcDay -= 1;
  } else if (utcMinutes >= 1440) {
    utcMinutes -= 1440;
    utcDay += 1;
  }

  const utcH = Math.floor(utcMinutes / 60);
  const utcM = Math.floor(utcMinutes % 60);
  const utcS = Math.floor(((utcMinutes % 1) * 60));

  const utcDate = new Date(Date.UTC(utcYear, utcMonth - 1, utcDay, utcH, utcM, utcS));

  // 2. 真太陽時 (TST)
  const lonDiffMin = (longitude - 120.0) * 4.0;
  const N_day = Math.floor(275 * birthMonth / 9) - Math.floor((birthMonth + 9) / 12) * (1 + Math.floor((birthYear - 4 * Math.floor(birthYear / 4) + 2) / 3)) + birthDay - 30;
  const B_eot = (360 / 365) * (N_day - 81) * (Math.PI / 180);
  const eotMin = 9.87 * Math.sin(2 * B_eot) - 7.53 * Math.cos(B_eot) - 1.5 * Math.sin(B_eot);

  let totalMinutes = birthHour * 60 + birthMinute + lonDiffMin + eotMin;
  if (totalMinutes < 0) totalMinutes += 1440;
  totalMinutes %= 1440;
  const tstHour = Math.floor(totalMinutes / 60);
  const tstMinute = Math.floor(totalMinutes % 60);
  const hourBranchIdx = Math.floor((tstHour + 1) / 2) % 12;

  // 3. 高精度七主星經度 (黃道經度)
  const sunLong = getEclipticLong(Astronomy.Body.Sun, utcDate);
  const moonLong = getEclipticLong(Astronomy.Body.Moon, utcDate);
  const mercuryLong = getEclipticLong(Astronomy.Body.Mercury, utcDate);
  const venusLong = getEclipticLong(Astronomy.Body.Venus, utcDate);
  const marsLong = getEclipticLong(Astronomy.Body.Mars, utcDate);
  const jupiterLong = getEclipticLong(Astronomy.Body.Jupiter, utcDate);
  const saturnLong = getEclipticLong(Astronomy.Body.Saturn, utcDate);

  // 4. 四餘星 (MORIA 平交點/平遠地點算盤)
  const astroTime = Astronomy.MakeTime(utcDate);
  const T = (astroTime.ut - 2451545.0) / 36525.0;

  // 羅睺 (昇交點 Node) & 計都 (降交點 = 羅睺 + 180°)
  const rahuLong = rev(125.04452 - 1934.136261 * T + 0.0020708 * T * T);
  const ketuLong = rev(rahuLong + 180.0);

  // 月孛 (月球遠地點 Lunar Apogee)
  const yuebeiLong = rev(83.353243 + 4069.013711 * T - 0.01032 * T * T);

  // 紫氣 (木星餘氣 / 28年週天)
  const ziqiLong = rev(213.5 + 0.0351838 * (astroTime.ut - 2451545.0));

  const starRaw = [
    { name: '太陽', type: '政' as const, long: sunLong, wuxing: '火' as const },
    { name: '太陰', type: '政' as const, long: moonLong, wuxing: '水' as const },
    { name: '木星', type: '政' as const, long: jupiterLong, wuxing: '木' as const },
    { name: '火星', type: '政' as const, long: marsLong, wuxing: '火' as const },
    { name: '土星', type: '政' as const, long: saturnLong, wuxing: '土' as const },
    { name: '金星', type: '政' as const, long: venusLong, wuxing: '金' as const },
    { name: '水星', type: '政' as const, long: mercuryLong, wuxing: '水' as const },
    { name: '羅睺', type: '餘' as const, long: rahuLong, wuxing: '火' as const },
    { name: '計都', type: '餘' as const, long: ketuLong, wuxing: '土' as const },
    { name: '月孛', type: '餘' as const, long: yuebeiLong, wuxing: '水' as const },
    { name: '紫氣', type: '餘' as const, long: ziqiLong, wuxing: '木' as const },
  ];

  const stars: StarPosition[] = starRaw.map(s => {
    const sec = ZODIAC_SECTORS.find(z => s.long >= z.minDeg && s.long < z.maxDeg) || ZODIAC_SECTORS[0];
    const { mansion, offset } = findMansion(s.long);
    return {
      name: s.name,
      type: s.type,
      longitude: Number(s.long.toFixed(2)),
      zodiac: `${sec.branch}宮 (${sec.sign})`,
      wuxing: s.wuxing,
      mansion: mansion.name,
      mansionDegree: Number(offset.toFixed(2)),
    };
  });

  // 5. MORIA《果老星宗》正宗立命法："太陽加生時，順數逢卯止"
  const sunSector = ZODIAC_SECTORS.find(s => sunLong >= s.minDeg && sunLong < s.maxDeg) || ZODIAC_SECTORS[0];
  const sunBranchIdx = BRANCHES.indexOf(sunSector.branch);
  const sunOffsetInSector = sunLong - sunSector.minDeg;

  // 順數至卯宮 (卯=3)
  const stepsToMao = (3 - hourBranchIdx + 12) % 12;
  const mingBranchIdx = (sunBranchIdx + stepsToMao) % 12;
  const mingBranch = BRANCHES[mingBranchIdx];
  const mingSector = ZODIAC_SECTORS.find(s => s.branch === mingBranch)!;

  // 太陽宮餘度平移至命宮
  const exactMingLong = rev(mingSector.minDeg + sunOffsetInSector);
  const { mansion: mingMansion, offset: mingOffset } = findMansion(exactMingLong);

  // 6. 身宮 (太陰落宮)
  const moonSector = ZODIAC_SECTORS.find(s => moonLong >= s.minDeg && moonLong < s.maxDeg) || ZODIAC_SECTORS[0];
  const { mansion: moonMansion } = findMansion(moonLong);

  // 7. 後天十二宮逆排 (以命宮為首)
  const mingIdxInBranch = BRANCHES.indexOf(mingBranch);
  const houses: QizhengHouse[] = GUOLAO_HOUSES.map((hName, idx) => {
    const bIdx = (mingIdxInBranch - idx + 12) % 12;
    const branch = BRANCHES[bIdx];
    const sector = ZODIAC_SECTORS.find(s => s.branch === branch)!;
    const starsInHouse = stars.filter(s => s.zodiac.startsWith(branch)).map(s => s.name);
    return { name: hName, branch: `${branch}宮`, zodiacSign: sector.sign, wuxing: sector.wuxing, stars: starsInHouse, shensha: [] };
  });

  return {
    julianDay: Number(astroTime.ut.toFixed(4)),
    mingGong: `${mingBranch}宮 (立命${mingMansion.name.slice(0, 2)}${mingOffset.toFixed(1)}度)`,
    shenGong: `${moonSector.branch}宮 (立身${moonMansion.name.slice(0, 2)}宿)`,
    stars,
    houses,
    mansions: MORIA_28_MANSIONS,
    trueSolarTime: `${String(tstHour).padStart(2, '0')}:${String(tstMinute).padStart(2, '0')}`,
    mingGongZhu: mingSector.ruler,
    mingDuZhu: mingMansion.ruler,
    mingDuMansion: mingMansion.name,
    mingDuDegree: Number(mingOffset.toFixed(1)),
  };
}