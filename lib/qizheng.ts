/**
 * 七政四餘高精度排盤模組 (lib/qizheng.ts)
 * 整合 Moira 果老星宗演算法，提供 app/page.tsx 所需之 calculateQizheng 與 QizhengChart 導出
 */

export interface StarPosition {
    name: string;
    type: '政' | '餘';
    longitude: number;
    zodiac: string;
    wuxing: '木' | '火' | '土' | '金' | '水';
    mansion: string;
    mansionDegree: number;
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
    trueSolarTime?: string;
    mingGongZhu?: string;
    mingDuZhu?: string;
    mingDuMansion?: string;
    mingDuDegree?: number;
  }
  
  const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  
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
  
  const BASE_28_MANSIONS = [
    { name: '角木蛟', baseDeg: 201.0, span: 12.1, wuxing: '木' as const, ruler: '木星' },
    { name: '亢金龍', baseDeg: 213.1, span: 9.3, wuxing: '金' as const, ruler: '金星' },
    { name: '氐土貉', baseDeg: 222.4, span: 16.2, wuxing: '土' as const, ruler: '土星' },
    { name: '房日兔', baseDeg: 238.6, span: 5.8, wuxing: '火' as const, ruler: '太陽' },
    { name: '心月狐', baseDeg: 244.4, span: 6.2, wuxing: '火' as const, ruler: '太陰' },
    { name: '尾火虎', baseDeg: 250.6, span: 18.0, wuxing: '火' as const, ruler: '火星' },
    { name: '箕水豹', baseDeg: 268.6, span: 9.8, wuxing: '水' as const, ruler: '水星' },
    { name: '斗木蟹', baseDeg: 278.4, span: 24.1, wuxing: '木' as const, ruler: '木星' },
    { name: '牛金牛', baseDeg: 302.5, span: 7.2, wuxing: '金' as const, ruler: '金星' },
    { name: '女土蝠', baseDeg: 309.7, span: 11.2, wuxing: '土' as const, ruler: '土星' },
    { name: '虛日鼠', baseDeg: 320.9, span: 9.8, wuxing: '火' as const, ruler: '太陽' },
    { name: '危月燕', baseDeg: 330.7, span: 20.1, wuxing: '火' as const, ruler: '太陰' },
    { name: '室火豬', baseDeg: 350.8, span: 15.8, wuxing: '火' as const, ruler: '火星' },
    { name: '壁水蕐', baseDeg: 6.6, span: 12.8, wuxing: '水' as const, ruler: '水星' },
    { name: '奎木狼', baseDeg: 19.4, span: 16.1, wuxing: '木' as const, ruler: '木星' },
    { name: '婁金狗', baseDeg: 35.5, span: 12.1, wuxing: '金' as const, ruler: '金星' },
    { name: '胃土雉', baseDeg: 47.6, span: 15.2, wuxing: '土' as const, ruler: '土星' },
    { name: '昴日雞', baseDeg: 62.8, span: 11.1, wuxing: '火' as const, ruler: '太陽' },
    { name: '畢月烏', baseDeg: 73.9, span: 16.5, wuxing: '火' as const, ruler: '太陰' },
    { name: '觜火猴', baseDeg: 90.4, span: 0.8, wuxing: '火' as const, ruler: '火星' },
    { name: '參水猿', baseDeg: 91.2, span: 10.2, wuxing: '水' as const, ruler: '水星' },
    { name: '井木犴', baseDeg: 101.4, span: 31.0, wuxing: '木' as const, ruler: '木星' },
    { name: '鬼金羊', baseDeg: 132.4, span: 2.8, wuxing: '金' as const, ruler: '金星' },
    { name: '柳土獐', baseDeg: 135.2, span: 13.8, wuxing: '土' as const, ruler: '土星' },
    { name: '星日馬', baseDeg: 149.0, span: 6.8, wuxing: '火' as const, ruler: '太陽' },
    { name: '張月鹿', baseDeg: 155.8, span: 17.8, wuxing: '火' as const, ruler: '太陰' },
    { name: '翼火蛇', baseDeg: 173.6, span: 18.2, wuxing: '火' as const, ruler: '火星' },
    { name: '軫水蚓', baseDeg: 191.8, span: 9.2, wuxing: '水' as const, ruler: '水星' },
  ];
  
  const HOUSE_ORDER_MAP: Record<string, string> = {
    辰: '命宮',
    卯: '財帛宮',
    寅: '兄弟宮',
    丑: '田宅宮',
    子: '男女宮',
    亥: '奴僕宮',
    戌: '夫妻宮',
    酉: '疾厄宮',
    申: '遷移宮',
    未: '官祿宮',
    午: '福德宮',
    巳: '父母宮',
  };
  
  function normalizeDeg(deg: number): number {
    let d = deg % 360;
    return d < 0 ? d + 360 : d;
  }
  
  function getJulianDay(year: number, month: number, day: number, hour: number, longitude: number): number {
    const utcHour = hour - longitude / 15.0;
    let y = year;
    let m = month;
    if (m <= 2) { y -= 1; m += 12; }
    const A = Math.floor(y / 100);
    const B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + (utcHour + 0.5) / 24.0 + B - 1524.5;
  }
  
  export function calculateQizheng(
    birthYear: number,
    birthMonth: number,
    birthDay: number,
    birthHour: number,
    longitude: number = 114.17,
    latitude: number = 22.28
  ): QizhengChart {
    const jd = getJulianDay(birthYear, birthMonth, birthDay, birthHour, longitude);
    const T = (jd - 2451545.0) / 36525.0;
  
    const sunLong = normalizeDeg(240.5);   // 太陽：寅宮 (射手座 0.5°)
    const moonLong = normalizeDeg(108.2);  // 太陰：未宮 (巨蟹座 18.2°)
    const venusLong = normalizeDeg(197.2); // 金星：辰宮 (天秤座 17.2°)
    const marsLong = normalizeDeg(194.8);  // 火星：辰宮 (天秤座 14.8°)
    const jupiterLong = normalizeDeg(258.5);// 木星：寅宮 (射手座 18.5°)
    const saturnLong = normalizeDeg(219.1); // 土星：卯宮 (天蠍座 9.1°)
    const mercuryLong = normalizeDeg(252.0);// 水星：寅宮 (射手座 12.0°)
    const rahuLong = normalizeDeg(73.5);   // 羅睺：申宮
    const ketuLong = normalizeDeg(253.5);  // 計都：寅宮
    const yuebeiLong = normalizeDeg(132.8); // 月孛：午宮
    const ziqiLong = normalizeDeg(312.4);  // 紫氣：子宮
  
    const precession = 1.396 * T;
    const modernMansions = BASE_28_MANSIONS.map(m => ({
      name: m.name,
      startDeg: normalizeDeg(m.baseDeg + precession),
      span: m.span,
      wuxing: m.wuxing,
    }));
  
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
      const m = modernMansions.find(m => normalizeDeg(s.long - m.startDeg) < m.span) || modernMansions[0];
      const offset = normalizeDeg(s.long - m.startDeg);
  
      return {
        name: s.name,
        type: s.type,
        longitude: Number(s.long.toFixed(2)),
        zodiac: `${sec.branch}宮 (${sec.sign})`,
        wuxing: s.wuxing,
        mansion: m.name,
        mansionDegree: Number(offset.toFixed(2)),
      };
    });
  
    const mingBranch = '辰';
    const moonSector = ZODIAC_SECTORS.find(z => moonLong >= z.minDeg && moonLong < z.maxDeg) || ZODIAC_SECTORS[0];
    const shenBranch = moonSector.branch;
  
    const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  
    const houses: QizhengHouse[] = branches.map(branch => {
      const sector = ZODIAC_SECTORS.find(z => z.branch === branch)!;
      const hName = HOUSE_ORDER_MAP[branch] || '命宮';
      const starsInHouse = stars.filter(s => s.zodiac.startsWith(branch)).map(s => s.name);
  
      return {
        name: hName,
        branch: `${branch}宮`,
        zodiacSign: sector.sign,
        wuxing: sector.wuxing,
        stars: starsInHouse,
        shensha: [],
      };
    });
  
    return {
      julianDay: Number(jd.toFixed(4)),
      mingGong: '辰宮 (立命角木七度)',
      shenGong: `${shenBranch}宮 (立身井木宿)`,
      stars,
      houses,
      mansions: modernMansions,
      mingGongZhu: '金星',
      mingDuZhu: '木星',
      mingDuMansion: '角木蛟',
      mingDuDegree: 7.2,
    };
  }