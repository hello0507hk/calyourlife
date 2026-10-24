import * as Astronomy from 'astronomy-engine';
import { Solar } from 'lunar-javascript';
import {
  BIRTH_SHENSHA_DISPLAY,
  BRANCH_SHENSHA,
  DI_WEI,
  GANZHI_SHENSHA,
  GUA_QI,
  HUA_YAO_NAMES,
  HUA_YAO_SEQ,
  KE_JIA_RULERS,
  LIMIT_YEARS,
  LONG_LIFE_ELEMENT_INDEX,
  LONG_LIFE_NAMES,
  LONG_LIFE_START,
  MONTH_SHENSHA,
  NAYIN,
  NOW_SHENSHA_DISPLAY,
  SHENSHA_ALIASES,
  STAR_DIGNITY,
  STEM_PALACE_GODS,
  STEM_SHENSHA,
  YEAR_GODS,
  YEAR_GOD_NAMES,
  ZHI_NAN,
} from './qizhengData';

/* ------------------------------------------------------------------ */
/* 基本表                                                              */
/* ------------------------------------------------------------------ */

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** 回歸黃道 30° 一宮，0° 起戌（白羊），逆時針 */
export const ZODIAC_BRANCHES = ['戌', '酉', '申', '未', '午', '巳', '辰', '卯', '寅', '丑', '子', '亥'];
export const ZODIAC_RULERS = ['火', '金', '水', '月', '日', '水', '金', '火', '木', '土', '土', '木'];
export const ZODIAC_TRIGRAMS = ['乾', '兌', '坤', '坤', '離', '巽', '巽', '震', '艮', '艮', '坎', '乾'];
export const ZODIAC_EN = ['Ari', 'Tau', 'Gem', 'Can', 'Leo', 'Vir', 'Lib', 'Sco', 'Sag', 'Cap', 'Aqu', 'Pis'];
export const ZODIAC_CN = ['白羊', '金牛', '雙子', '巨蟹', '獅子', '室女', '天秤', '天蠍', '人馬', '魔羯', '寶瓶', '雙魚'];

/** 由命宮起，依黃經遞減方向排列（亦即大限行限次序） */
export const HOUSE_NAMES = ['命宮', '相貌', '福德', '官祿', '遷移', '疾厄', '夫妻', '奴僕', '男女', '田宅', '兄弟', '財帛'];

/**
 * 二十八宿距星（Swiss Ephemeris fixstars.cat，J2000 ICRS）與 Moira 校正值。
 * ra: h,m,s；dec: d,m,s；pmRa: 0.01s/yr；pmDec: 0.01"/yr；adj: 度（宿度 = 距星黃經 − adj）
 */
const MANSION_STARS: Array<{ name: string; element: string; ra: [number, number, number]; dec: [number, number, number]; pmRa: number; pmDec: number; adj: number }> = [
  { name: '婁', element: '金', ra: [1, 54, 38.401], dec: [20, 48, 28.82], pmRa: 0.684, pmDec: -11.11, adj: -0.0207 },
  { name: '胃', element: '土', ra: [3, 46, 50.889], dec: [-23, 14, 58.97], pmRa: -1.148, pmDec: -52.91, adj: 0.3992 },
  { name: '昴', element: '日', ra: [3, 44, 48.18], dec: [24, 17, 21.44], pmRa: 0.06, pmDec: -5.1, adj: -0.0068 },
  { name: '畢', element: '月', ra: [4, 28, 36.997], dec: [19, 10, 49.46], pmRa: 0.756, pmDec: -3.77, adj: -0.043 },
  { name: '觜', element: '火', ra: [5, 35, 8.419], dec: [9, 56, 3.96], pmRa: 0.13, pmDec: -0.2, adj: -0.0008 },
  { name: '參', element: '水', ra: [5, 40, 45.52], dec: [-1, 56, 33.3], pmRa: 0.027, pmDec: -0.25, adj: -0.0274 },
  { name: '井', element: '木', ra: [6, 22, 57.621], dec: [22, 30, 48.79], pmRa: 0.391, pmDec: -11.1, adj: -0.0224 },
  { name: '鬼', element: '金', ra: [7, 49, 17.655], dec: [-24, 51, 35.31], pmRa: -0.022, pmDec: -0.18, adj: 0.2669 },
  { name: '柳', element: '土', ra: [11, 31, 24.248], dec: [69, 19, 51.87], pmRa: -0.733, pmDec: -1.71, adj: -0.4224 },
  { name: '星', element: '日', ra: [8, 43, 35.545], dec: [-33, 11, 11.02], pmRa: -0.086, pmDec: 1.08, adj: -0.2479 },
  { name: '張', element: '月', ra: [11, 46, 3.018], dec: [47, 46, 45.9], pmRa: -1.361, pmDec: 2.95, adj: -1.076 },
  { name: '翼', element: '火', ra: [12, 26, 56.271], dec: [28, 16, 6.34], pmRa: -0.626, pmDec: -8.02, adj: 0.0779 },
  { name: '軫', element: '水', ra: [12, 15, 48.366], dec: [-17, 32, 30.97], pmRa: -1.124, pmDec: 2.33, adj: -0.0231 },
  { name: '角', element: '木', ra: [13, 25, 11.587], dec: [-11, 9, 40.71], pmRa: -0.278, pmDec: -2.83, adj: 0.2878 },
  { name: '亢', element: '金', ra: [11, 35, 46.845], dec: [-63, 1, 11.32], pmRa: -0.606, pmDec: -0.49, adj: -0.0021 },
  { name: '氐', element: '土', ra: [14, 56, 46.118], dec: [-11, 24, 35.05], pmRa: 0.076, pmDec: 0.83, adj: -0.0184 },
  { name: '房', element: '日', ra: [15, 58, 51.12], dec: [-26, 6, 50.75], pmRa: -0.084, pmDec: -2.55, adj: -0.0406 },
  { name: '心', element: '月', ra: [16, 21, 11.317], dec: [-25, 35, 34.17], pmRa: -0.076, pmDec: -2.07, adj: -0.0308 },
  { name: '尾', element: '火', ra: [17, 14, 38.86], dec: [14, 23, 24.9], pmRa: -0.046, pmDec: 3.28, adj: 0.0662 },
  { name: '箕', element: '水', ra: [18, 5, 48.491], dec: [-30, 25, 26.69], pmRa: -0.412, pmDec: -18.52, adj: -0.0195 },
  { name: '斗', element: '木', ra: [18, 24, 13.779], dec: [39, 30, 26.24], pmRa: -0.2, pmDec: -0.19, adj: 0.0096 },
  { name: '牛', element: '金', ra: [20, 21, 0.673], dec: [-14, 46, 52.99], pmRa: 0.291, pmDec: 0.16, adj: -0.0853 },
  { name: '女', element: '土', ra: [20, 47, 40.559], dec: [-9, 29, 44.74], pmRa: 0.235, pmDec: -3.43, adj: -0.0769 },
  { name: '虛', element: '日', ra: [21, 10, 20.518], dec: [10, 7, 53.57], pmRa: 0.383, pmDec: -15.33, adj: -0.0408 },
  { name: '危', element: '月', ra: [22, 5, 47.038], dec: [0, -19, 11.47], pmRa: 0.131, pmDec: -0.96, adj: -0.0831 },
  { name: '室', element: '火', ra: [23, 4, 45.658], dec: [15, 12, 18.9], pmRa: 0.436, pmDec: -4.25, adj: -0.0189 },
  { name: '壁', element: '水', ra: [23, 57, 45.535], dec: [25, 8, 28.98], pmRa: -0.247, pmDec: -3.32, adj: -0.178 },
  { name: '奎', element: '木', ra: [0, 36, 52.858], dec: [33, 43, 9.63], pmRa: 0.124, pmDec: -0.4, adj: 0.2049 },
];

type StarKey = '日' | '月' | '金' | '木' | '水' | '火' | '土' | '計' | '羅' | '炁' | '孛';

const STAR_DEFS: Array<{ key: StarKey; name: string; type: '政' | '餘'; body?: Astronomy.Body }> = [
  { key: '日', name: '太陽', type: '政', body: Astronomy.Body.Sun },
  { key: '月', name: '太陰', type: '政', body: Astronomy.Body.Moon },
  { key: '金', name: '金星', type: '政', body: Astronomy.Body.Venus },
  { key: '木', name: '木星', type: '政', body: Astronomy.Body.Jupiter },
  { key: '水', name: '水星', type: '政', body: Astronomy.Body.Mercury },
  { key: '火', name: '火星', type: '政', body: Astronomy.Body.Mars },
  { key: '土', name: '土星', type: '政', body: Astronomy.Body.Saturn },
  { key: '計', name: '計都', type: '餘' },
  { key: '羅', name: '羅睺', type: '餘' },
  { key: '炁', name: '紫炁', type: '餘' },
  { key: '孛', name: '月孛', type: '餘' },
];

/** 金木水火土：留度閾值、遲/速閾值（度/日） */
const SPEED_LIMITS: Partial<Record<StarKey, { stationary: number; slow: number; fast: number }>> = {
  金: { stationary: 0.15, slow: 0.71, fast: 1.245 },
  木: { stationary: 0.07, slow: 0.05, fast: 0.23 },
  水: { stationary: 0.1, slow: 0.88, fast: 1.5 },
  火: { stationary: 0.2, slow: 0.4, fast: 0.7 },
  土: { stationary: 0.05, slow: 0.02, fast: 0.13 },
};

const PURPLE_PERIOD_DAYS = 10227.1792;
const PURPLE_BASE_UT = Astronomy.MakeTime(new Date(Date.UTC(1975, 2, 13, 16, 0))).ut;
const PURPLE_BASE_DEGREE = 230.5;

/* ------------------------------------------------------------------ */
/* 型別                                                                */
/* ------------------------------------------------------------------ */

export interface StarPosition {
  key: StarKey;
  name: string;
  type: '政' | '餘';
  longitude: number;
  speed: number;
  zodiacIndex: number;
  branch: string;
  degreeInSign: string;
  mansion: string;
  mansionDegree: string;
  /** 順/逆/留/伏/遲/速/蝕 */
  state: string;
  isRetrograde: boolean;
  /** 殿/垣/廟/旺/樂/喜/怒 */
  dignity: string[];
  huaYao: string[];
  house: string;
}

export interface MansionSpan {
  name: string;
  element: string;
  start: number;
  width: number;
}

export interface QizhengHouse {
  index: number;
  name: string;
  branch: string;
  zodiacIndex: number;
  zodiacSign: string;
  englishSign: string;
  trigram: string;
  ruler: string;
  wuxing: string;
  stars: string[];
  shensha: string[];
  nowShensha: string[];
  limitStartAge: number;
  limitEndAge: number;
  isShen: boolean;
}

export interface DegreeMark {
  longitude: number;
  branch: string;
  mansion: string;
  mansionDegree: string;
  /** 宮主 */
  palaceRuler: string;
  /** 度主（宿五行） */
  degreeRuler: string;
}

export interface NamedStar {
  name: string;
  star: string;
}

export interface QizhengChart {
  birth: { year: number; month: number; day: number; hour: number; minute: number; longitude: number; latitude: number; timezone: number };
  julianDay: number;
  trueSolarTime: string;
  sunrise: string;
  sunset: string;
  isDayBirth: boolean;
  pillars: { year: string; month: string; day: string; hour: string };
  nayin: string;
  mingGong: string;
  shenGong: string;
  ming: DegreeMark;
  shen: DegreeMark;
  mingGongZhu: string;
  mingDuZhu: string;
  mingDuMansion: string;
  mingDuDegree: number;
  stars: StarPosition[];
  mansions: MansionSpan[];
  houses: QizhengHouse[];
  huaYao: NamedStar[];
  yearGods: NamedStar[];
  now: {
    date: string;
    age: number;
    pillars: { year: string; month: string; hour: string };
    stars: Array<{ key: StarKey; longitude: number; isRetrograde: boolean }>;
  };
}

export interface QizhengInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  longitude?: number;
  latitude?: number;
  /** 出生地標準時區（小時） */
  timezone?: number;
  /** 以真太陽時定時辰（Moira 預設） */
  trueSolar?: boolean;
  now?: Date;
}

/* ------------------------------------------------------------------ */
/* 工具                                                                */
/* ------------------------------------------------------------------ */

const rev = (x: number) => ((x % 360) + 360) % 360;

function formatDM(deg: number): string {
  let d = Math.floor(deg);
  let m = Math.round((deg - d) * 60);
  if (m === 60) {
    d += 1;
    m = 0;
  }
  return `${d}°${String(m).padStart(2, '0')}′`;
}

const zodiacIndexOf = (lon: number) => Math.floor(rev(lon) / 30) % 12;

function findMansion(lon: number, mansions: MansionSpan[]): { mansion: MansionSpan; offset: number } {
  for (const m of mansions) {
    const offset = rev(lon - m.start);
    if (offset < m.width) return { mansion: m, offset };
  }
  return { mansion: mansions[0], offset: rev(lon - mansions[0].start) };
}

/** 以「本地時間欄位」存放的毫秒數（Date.UTC 欄位即本地鐘面） */
type LocalMs = number;

function fieldsOf(ms: LocalMs) {
  const d = new Date(ms);
  return { y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes() };
}

function formatLocal(ms: LocalMs): string {
  const f = fieldsOf(ms);
  return `${f.y}-${String(f.mo).padStart(2, '0')}-${String(f.d).padStart(2, '0')} ${String(f.h).padStart(2, '0')}:${String(f.mi).padStart(2, '0')}`;
}

/** 時辰起點：23:00, 01:00, 03:00 …（子時跨日） */
function snapToShichenStart(ms: LocalMs): LocalMs {
  const f = fieldsOf(ms);
  let h = Math.floor((f.h + 1) / 2) * 2 - 1;
  if (h < 0) h = 23;
  let snapped = Date.UTC(f.y, f.mo - 1, f.d, h, 0);
  if (f.h < 1) snapped -= 86400000;
  return snapped;
}

const shichenIndex = (hour: number) => Math.floor((hour + 1) / 2) % 12;

/* ------------------------------------------------------------------ */
/* 天文計算                                                            */
/* ------------------------------------------------------------------ */

function bodyLongitude(body: Astronomy.Body, time: Astronomy.AstroTime): number {
  return rev(Astronomy.Ecliptic(Astronomy.GeoVector(body, time, true)).elon);
}

/** Meeus ch.47 真交點（計都） */
function trueNode(time: Astronomy.AstroTime): number {
  const T = time.tt / 36525;
  const rad = Math.PI / 180;
  const D = rev(297.8501921 + 445267.1114034 * T - 0.0018819 * T * T) * rad;
  const M = rev(357.5291092 + 35999.0502909 * T - 0.0001536 * T * T) * rad;
  const Mp = rev(134.9633964 + 477198.8675055 * T + 0.0087414 * T * T) * rad;
  const F = rev(93.272095 + 483202.0175233 * T - 0.0036539 * T * T) * rad;
  const omega = 125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + (T * T * T) / 467441;
  return rev(
    omega -
      1.4979 * Math.sin(2 * (D - F)) -
      0.15 * Math.sin(M) +
      0.1226 * Math.sin(2 * D) +
      0.1176 * Math.sin(2 * F) -
      0.0801 * Math.sin(2 * (Mp - F)),
  );
}

/** 平月球遠地點（月孛） */
function meanApogee(time: Astronomy.AstroTime): number {
  const T = time.tt / 36525;
  const perigee = 83.3532465 + 4069.0137287 * T - 0.01032 * T * T - (T * T * T) / 80053;
  return rev(perigee + 180);
}

function purpleQi(time: Astronomy.AstroTime): number {
  return rev(PURPLE_BASE_DEGREE + (360 / PURPLE_PERIOD_DAYS) * (time.ut - PURPLE_BASE_UT));
}

function starLongitude(key: StarKey, time: Astronomy.AstroTime): number {
  const def = STAR_DEFS.find((s) => s.key === key)!;
  if (def.body) return bodyLongitude(def.body, time);
  switch (key) {
    case '計':
      return trueNode(time);
    case '羅':
      return rev(trueNode(time) + 180);
    case '炁':
      return purpleQi(time);
    default:
      return meanApogee(time);
  }
}

function starSpeed(key: StarKey, time: Astronomy.AstroTime): number {
  const a = starLongitude(key, time.AddDays(-0.5));
  const b = starLongitude(key, time.AddDays(0.5));
  let d = b - a;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

/** 前後 120 日內最近的留（速度變號）位置 */
function nearestStationGap(key: StarKey, time: Astronomy.AstroTime, lon: number): number {
  let best = Infinity;
  for (const dir of [-1, 1]) {
    let prev = starSpeed(key, time);
    for (let day = 1; day <= 120; day++) {
      const t = time.AddDays(dir * day);
      const s = starSpeed(key, t);
      if (Math.sign(s) !== Math.sign(prev)) {
        let lo = dir * (day - 1);
        let hi = dir * day;
        for (let i = 0; i < 20; i++) {
          const mid = (lo + hi) / 2;
          if (Math.sign(starSpeed(key, time.AddDays(mid))) === Math.sign(prev)) lo = mid;
          else hi = mid;
        }
        const stationLon = starLongitude(key, time.AddDays((lo + hi) / 2));
        let gap = Math.abs(stationLon - lon);
        if (gap > 180) gap = 360 - gap;
        best = Math.min(best, gap);
        break;
      }
      prev = s;
    }
  }
  return best;
}

function eclipseState(key: '日' | '月', time: Astronomy.AstroTime): boolean {
  try {
    if (key === '日') {
      const e = Astronomy.SearchGlobalSolarEclipse(time.AddDays(-1 / 24));
      return Math.abs(e.peak.ut - time.ut) <= 1 / 24;
    }
    const e = Astronomy.SearchLunarEclipse(time.AddDays(-0.5));
    return Math.abs(e.peak.ut - time.ut) <= 0.5;
  } catch {
    return false;
  }
}

function starState(key: StarKey, time: Astronomy.AstroTime, lon: number, speed: number, sunLon: number): string {
  if (key === '日' || key === '月') return eclipseState(key, time) ? '蝕' : '';
  const limits = SPEED_LIMITS[key];
  if (!limits) return '';
  if (nearestStationGap(key, time, lon) <= limits.stationary) return '留';
  let sunGap = Math.abs(lon - sunLon);
  if (sunGap > 180) sunGap = 360 - sunGap;
  if (sunGap <= 3) return '伏';
  if (speed < 0) return '逆';
  if (speed >= limits.fast) return '速';
  if (speed <= limits.slow) return '遲';
  return '順';
}

function computeMansions(time: Astronomy.AstroTime): MansionSpan[] {
  const years = time.tt / 365.25;
  const starts = MANSION_STARS.map((s) => {
    const sign = s.dec[0] < 0 || s.dec[1] < 0 ? -1 : 1;
    const raDeg = (s.ra[0] + s.ra[1] / 60 + s.ra[2] / 3600) * 15 + ((s.pmRa * 0.01 * 15) / 3600) * years;
    const decDeg = sign * (Math.abs(s.dec[0]) + Math.abs(s.dec[1]) / 60 + Math.abs(s.dec[2]) / 3600) + ((s.pmDec * 0.01) / 3600) * years;
    const ra = (raDeg * Math.PI) / 180;
    const dec = (decDeg * Math.PI) / 180;
    const vec = new Astronomy.Vector(Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec), time);
    return rev(Astronomy.Ecliptic(vec).elon - s.adj);
  });
  return MANSION_STARS.map((s, i) => ({
    name: s.name,
    element: s.element,
    start: starts[i],
    width: rev(starts[(i + 1) % starts.length] - starts[i]),
  }));
}

/** 本地鐘面時間（標準時或真太陽時） */
function toAdjustedLocal(time: Astronomy.AstroTime, observer: Astronomy.Observer, timezone: number, trueSolar: boolean): LocalMs {
  const utMs = time.date.getTime();
  if (!trueSolar) return utMs + timezone * 3600000;
  const lmtMs = utMs + (observer.longitude / 15) * 3600000;
  const latHours = (Astronomy.HourAngle(Astronomy.Body.Sun, time, observer) + 12) % 24;
  const lmtHours = ((lmtMs / 3600000) % 24 + 24) % 24;
  let diff = latHours - lmtHours;
  if (diff > 12) diff -= 24;
  if (diff < -12) diff += 24;
  return lmtMs + diff * 3600000;
}

/* ------------------------------------------------------------------ */
/* 神煞                                                                */
/* ------------------------------------------------------------------ */

function addShensha(target: Map<string, string[]>, branch: string, name: string) {
  const push = (n: string) => {
    const list = target.get(branch) ?? [];
    if (!list.includes(n)) list.push(n);
    target.set(branch, list);
  };
  push(name);
  for (const alias of SHENSHA_ALIASES[name] ?? []) push(alias.replace(/^\+/, ''));
}

function computeShensha(yearGZ: string, monthBranch: string, hourBranch: string, luminaryLon: number, display: string[]): Map<string, string[]> {
  const all = new Map<string, string[]>();
  const stem = yearGZ[0];
  const yearBranch = yearGZ[1];

  const element = YEAR_GODS[yearGZ][LONG_LIFE_ELEMENT_INDEX];
  const twelveSigns = ['酉', '申', '未', '午', '巳', '辰', '卯', '寅', '丑', '子', '亥', '戌'];
  const startIdx = LONG_LIFE_START[element];
  LONG_LIFE_NAMES.forEach((n, j) => addShensha(all, twelveSigns[(startIdx + j) % 12], n));

  for (const [b, n] of GANZHI_SHENSHA[yearGZ] ?? []) addShensha(all, b, n);
  for (const [b, n] of STEM_SHENSHA[stem] ?? []) addShensha(all, b, n);

  const [anchor] = GUA_QI[stem];
  const shift = (zodiacIndexOf(luminaryLon) - ZODIAC_BRANCHES.indexOf(anchor) + 12) % 12;
  const guaStem = STEMS[(STEMS.indexOf(stem) + shift) % 10];
  addShensha(all, GUA_QI[guaStem][1], '卦氣');

  for (const [b, n] of BRANCH_SHENSHA[yearBranch] ?? []) addShensha(all, b, n);
  for (const [b, n] of MONTH_SHENSHA[monthBranch] ?? []) addShensha(all, b, n);

  const doupiao = BRANCHES[(BRANCHES.indexOf(monthBranch) + BRANCHES.indexOf(hourBranch) + 2) % 12];
  addShensha(all, doupiao, '斗杓');

  const visible = new Set([...display, ...LONG_LIFE_NAMES]);
  const result = new Map<string, string[]>();
  for (const [b, list] of all) result.set(b, list.filter((n) => visible.has(n)));
  return result;
}

function pillarsAt(localMs: LocalMs) {
  const f = fieldsOf(localMs);
  const lunar = Solar.fromYmdHms(f.y, f.mo, f.d, f.h, f.mi, 0).getLunar();
  const ec = lunar.getEightChar();
  ec.setSect(1);
  return {
    year: lunar.getYearInGanZhiExact() as string,
    month: lunar.getMonthInGanZhiExact() as string,
    day: ec.getDay() as string,
    hour: ec.getTime() as string,
  };
}

/* ------------------------------------------------------------------ */
/* 主程式                                                              */
/* ------------------------------------------------------------------ */

export function calculateQizheng(input: QizhengInput): QizhengChart {
  const { year, month, day, hour, minute } = input;
  const longitude = input.longitude ?? 114.17;
  const latitude = input.latitude ?? 22.32;
  const timezone = input.timezone ?? 8;
  const trueSolar = input.trueSolar ?? true;

  const observer = new Astronomy.Observer(latitude, longitude, 0);
  const birthUtc = new Date(Date.UTC(year, month - 1, day, hour, minute) - timezone * 3600000);
  const time = Astronomy.MakeTime(birthUtc);
  const birthLocal = toAdjustedLocal(time, observer, timezone, trueSolar);

  const zoneMidnight = Astronomy.MakeTime(new Date(Date.UTC(year, month - 1, day) - timezone * 3600000));
  const riseTime = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, +1, zoneMidnight, 1);
  const setTime = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, zoneMidnight, 1);
  const riseLocal = riseTime ? toAdjustedLocal(riseTime, observer, timezone, trueSolar) : Date.UTC(year, month - 1, day, 6, 0);
  const setLocal = setTime ? toAdjustedLocal(setTime, observer, timezone, trueSolar) : Date.UTC(year, month - 1, day, 18, 0);

  const birthZone = shichenIndex(fieldsOf(birthLocal).h);
  const riseZone = shichenIndex(fieldsOf(riseLocal).h);
  const setZone = shichenIndex(fieldsOf(setLocal).h);
  const isDayBirth = birthZone >= riseZone && birthZone < setZone;

  const mansions = computeMansions(time);
  const sunLon = starLongitude('日', time);
  const moonLon = starLongitude('月', time);

  // 命宮：太陽起生時順數至日出；命度取太陽在本宮之度數
  const adjDays = (snapToShichenStart(riseLocal) - snapToShichenStart(birthLocal)) / 86400000;
  const lifePos = rev(sunLon - adjDays * 360);
  const lifeLon = (sunLon % 30) + Math.floor(lifePos / 30) * 30;
  const lifeZodiac = zodiacIndexOf(lifeLon);
  const selfLon = moonLon;
  const selfZodiac = zodiacIndexOf(selfLon);

  const pillars = pillarsAt(birthLocal);
  const yearGZ = pillars.year;
  const stemIdx = STEMS.indexOf(yearGZ[0]);
  const monthBranch = pillars.month[1];
  const hourBranch = BRANCHES[birthZone];

  const houseOfZodiac = (z: number) => HOUSE_NAMES[(lifeZodiac - z + 12) % 12];

  const huaYao: NamedStar[] = HUA_YAO_NAMES.map((name, k) => ({ name, star: HUA_YAO_SEQ[(stemIdx + k) % 10] }));
  huaYao.splice(6, 0, { name: '天嗣', star: huaYao[5].star });

  const stars: StarPosition[] = STAR_DEFS.map((def) => {
    const lon = starLongitude(def.key, time);
    const speed = starSpeed(def.key, time);
    const z = zodiacIndexOf(lon);
    const branch = ZODIAC_BRANCHES[z];
    const { mansion, offset } = findMansion(lon, mansions);
    const state = starState(def.key, time, lon, speed, sunLon);
    const dignity: string[] = [];
    if (def.type === '政' && mansion.element === def.key) dignity.push('殿');
    for (const [b, s] of STAR_DIGNITY[def.key] ?? []) if (b === branch && !dignity.includes(s)) dignity.push(s);
    return {
      key: def.key,
      name: def.name,
      type: def.type,
      longitude: lon,
      speed,
      zodiacIndex: z,
      branch,
      degreeInSign: formatDM(lon % 30),
      mansion: mansion.name,
      mansionDegree: formatDM(offset),
      state,
      isRetrograde: speed < 0 && def.type === '政',
      dignity,
      huaYao: huaYao.filter((h) => h.star === def.key).map((h) => h.name),
      house: houseOfZodiac(z),
    };
  });

  const degreeMark = (lon: number): DegreeMark => {
    const { mansion, offset } = findMansion(lon, mansions);
    const z = zodiacIndexOf(lon);
    return {
      longitude: lon,
      branch: ZODIAC_BRANCHES[z],
      mansion: mansion.name,
      mansionDegree: formatDM(offset),
      palaceRuler: ZODIAC_RULERS[z],
      degreeRuler: mansion.element,
    };
  };
  const ming = degreeMark(lifeLon);
  const shen = degreeMark(selfLon);

  const birthShensha = computeShensha(yearGZ, monthBranch, hourBranch, isDayBirth ? sunLon : moonLon, BIRTH_SHENSHA_DISPLAY);

  // 流年
  const nowDate = input.now ?? new Date();
  const nowTime = Astronomy.MakeTime(nowDate);
  const nowLocal = toAdjustedLocal(nowTime, observer, timezone, trueSolar);
  const nowPillars = pillarsAt(nowLocal);
  const nowStars = STAR_DEFS.map((def) => {
    const lon = starLongitude(def.key, nowTime);
    return { key: def.key, longitude: lon, isRetrograde: def.type === '政' && starSpeed(def.key, nowTime) < 0 };
  });
  const nowSun = nowStars[0].longitude;
  const nowMoon = nowStars[1].longitude;
  const nowRise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, +1, nowTime.AddDays(-0.5), 1);
  const nowSet = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, nowTime.AddDays(-0.5), 1);
  const nowIsDay = !!(nowRise && nowSet && nowRise.ut <= nowTime.ut && nowTime.ut < nowSet.ut);
  const nowShensha = computeShensha(nowPillars.year, nowPillars.month[1], nowPillars.hour[1], nowIsDay ? nowSun : nowMoon, NOW_SHENSHA_DISPLAY);

  // 大限：命宮 9 + 命度/3 年，其後依 LIMIT_YEARS
  const durations = [9 + (lifeLon % 30) / 3, ...LIMIT_YEARS.slice(1)];
  let acc = 0;
  const limitRanges = durations.map((d) => {
    const r = { start: acc, end: acc + d };
    acc += d;
    return r;
  });

  const houses: QizhengHouse[] = HOUSE_NAMES.map((name, k) => {
    const z = (lifeZodiac - k + 12) % 12;
    const branch = ZODIAC_BRANCHES[z];
    return {
      index: k,
      name,
      branch,
      zodiacIndex: z,
      zodiacSign: ZODIAC_CN[z],
      englishSign: ZODIAC_EN[z],
      trigram: ZODIAC_TRIGRAMS[z],
      ruler: ZODIAC_RULERS[z],
      wuxing: ZODIAC_RULERS[z],
      stars: stars.filter((s) => s.zodiacIndex === z).map((s) => s.key),
      shensha: birthShensha.get(branch) ?? [],
      nowShensha: nowShensha.get(branch) ?? [],
      limitStartAge: limitRanges[k].start,
      limitEndAge: limitRanges[k].end,
      isShen: z === selfZodiac,
    };
  });

  const lifeBranch = ZODIAC_BRANCHES[lifeZodiac];
  const yearGods: NamedStar[] = [
    { name: '科甲', star: KE_JIA_RULERS[(lifeZodiac - 6 + 12) % 12] },
    ...YEAR_GOD_NAMES.map((name, i) => ({ name, star: YEAR_GODS[yearGZ][i] })),
    { name: '值難', star: ZHI_NAN[monthBranch] },
    { name: '職元', star: STEM_PALACE_GODS['職元'][yearGZ[0]][lifeBranch] },
    { name: '局主', star: STEM_PALACE_GODS['局主'][yearGZ[0]][lifeBranch] },
    { name: '天經', star: STEM_PALACE_GODS['天經'][yearGZ[0]][lifeBranch] },
    { name: '地緯', star: DI_WEI[lifeBranch] },
    { name: '天元', star: STEM_PALACE_GODS['天元'][yearGZ[0]][lifeBranch] },
    { name: '地元', star: STEM_PALACE_GODS['地元'][yearGZ[0]][lifeBranch] },
    { name: '人元', star: STEM_PALACE_GODS['人元'][yearGZ[0]][lifeBranch] },
  ];

  const ageYears = (nowDate.getTime() - birthUtc.getTime()) / (365.25 * 86400000);

  return {
    birth: { year, month, day, hour, minute, longitude, latitude, timezone },
    julianDay: time.ut + 2451545,
    trueSolarTime: formatLocal(birthLocal),
    sunrise: formatLocal(riseLocal).slice(11),
    sunset: formatLocal(setLocal).slice(11),
    isDayBirth,
    pillars,
    nayin: NAYIN[yearGZ] ?? '',
    mingGong: lifeBranch,
    shenGong: ZODIAC_BRANCHES[selfZodiac],
    ming,
    shen,
    mingGongZhu: ming.palaceRuler,
    mingDuZhu: ming.degreeRuler,
    mingDuMansion: ming.mansion,
    mingDuDegree: findMansion(lifeLon, mansions).offset,
    stars,
    mansions,
    houses,
    huaYao,
    yearGods,
    now: {
      date: formatLocal(nowLocal),
      age: ageYears,
      pillars: { year: nowPillars.year, month: nowPillars.month, hour: nowPillars.hour },
      stars: nowStars,
    },
  };
}
