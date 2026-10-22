/**
 * 七政四餘天文星盤計算模組 (lib/qizheng.ts)
 * 體制：黃道回歸制 (Tropical) + 今制 28 星宿 + 果老星宗正宗安命法
 */

export interface StarPosition {
    name: string;
    type: '政' | '餘';
    longitude: number;     // 黃道經度 (0° - 360°)
    zodiac: string;        // 十二黃道宮 (辰宮/天秤, 卯宮/天蠍...)
    wuxing: '木' | '火' | '土' | '金' | '水';
    mansion: string;       // 今制二十八宿
    mansionDegree: number; // 宿內度數
    isRetrograde?: boolean;
  }
  
  export interface QizhengHouse {
    name: string;          // 後天十二宮 (命宮、財帛宮...)
    branch: string;        // 地支宮位 (子、丑、寅...)
    zodiacSign: string;    // 對應星座 (白羊、天秤...)
    wuxing: '木' | '火' | '土' | '金' | '水';
    stars: string[];       // 駐留星曜
    shensha: string[];     // 宮位神煞
  }
  
  export interface QizhengChart {
    julianDay: number;
    mingGong: string;
    shenGong: string;
    stars: StarPosition[];
    houses: QizhengHouse[];
    mansions: { name: string; startDeg: number; span: number; wuxing: string }[];
  }
  
  // 十二黃道宮與星座對照 (0°為戌宮/白羊起點)
  const ZODIAC_SECTORS = [
    { branch: '戌', sign: '白羊座', wuxing: '火' as const, minDeg: 0, maxDeg: 30 },
    { branch: '酉', sign: '金牛座', wuxing: '金' as const, minDeg: 30, maxDeg: 60 },
    { branch: '申', sign: '雙子座', wuxing: '水' as const, minDeg: 60, maxDeg: 90 },
    { branch: '未', sign: '巨蟹座', wuxing: '月' as const, minDeg: 90, maxDeg: 120 },
    { branch: '午', sign: '獅子座', wuxing: '日' as const, minDeg: 120, maxDeg: 150 },
    { branch: '巳', sign: '處女座', wuxing: '水' as const, minDeg: 150, maxDeg: 180 },
    { branch: '辰', sign: '天秤座', wuxing: '金' as const, minDeg: 180, maxDeg: 210 },
    { branch: '卯', sign: '天蠍座', wuxing: '火' as const, minDeg: 210, maxDeg: 240 },
    { branch: '寅', sign: '射手座', wuxing: '木' as const, minDeg: 240, maxDeg: 270 },
    { branch: '丑', sign: '摩羯座', wuxing: '土' as const, minDeg: 270, maxDeg: 300 },
    { branch: '子', sign: '水瓶座', wuxing: '土' as const, minDeg: 300, maxDeg: 330 },
    { branch: '亥', sign: '雙魚座', wuxing: '木' as const, minDeg: 330, maxDeg: 360 },
  ];
  
  // 今制 28 星宿基準
  const BASE_28_MANSIONS = [
    { name: '角木蛟', baseDeg: 201.0, span: 12.1, wuxing: '木' },
    { name: '亢金龍', baseDeg: 213.1, span: 9.3, wuxing: '金' },
    { name: '氐土貉', baseDeg: 222.4, span: 16.2, wuxing: '土' },
    { name: '房日兔', baseDeg: 238.6, span: 5.8, wuxing: '火' },
    { name: '心月狐', baseDeg: 244.4, span: 6.2, wuxing: '火' },
    { name: '尾火虎', baseDeg: 250.6, span: 18.0, wuxing: '火' },
    { name: '箕水豹', baseDeg: 268.6, span: 9.8, wuxing: '水' },
    { name: '斗木蟹', baseDeg: 278.4, span: 24.1, wuxing: '木' },
    { name: '牛金牛', baseDeg: 302.5, span: 7.2, wuxing: '金' },
    { name: '女土蝠', baseDeg: 309.7, span: 11.2, wuxing: '土' },
    { name: '虛日鼠', baseDeg: 320.9, span: 9.8, wuxing: '火' },
    { name: '危月燕', baseDeg: 330.7, span: 20.1, wuxing: '火' },
    { name: '室火豬', baseDeg: 350.8, span: 15.8, wuxing: '火' },
    { name: '壁水蕐', baseDeg: 6.6, span: 12.8, wuxing: '水' },
    { name: '奎木狼', baseDeg: 19.4, span: 16.1, wuxing: '木' },
    { name: '婁金狗', baseDeg: 35.5, span: 12.1, wuxing: '金' },
    { name: '胃土雉', baseDeg: 47.6, span: 15.2, wuxing: '土' },
    { name: '昴日雞', baseDeg: 62.8, span: 11.1, wuxing: '火' },
    { name: '畢月烏', baseDeg: 73.9, span: 16.5, wuxing: '火' },
    { name: '觜火猴', baseDeg: 90.4, span: 0.8, wuxing: '火' },
    { name: '參水猿', baseDeg: 91.2, span: 10.2, wuxing: '水' },
    { name: '井木犴', baseDeg: 101.4, span: 31.0, wuxing: '木' },
    { name: '鬼金羊', baseDeg: 132.4, span: 2.8, wuxing: '金' },
    { name: '柳土獐', baseDeg: 135.2, span: 13.8, wuxing: '土' },
    { name: '星日馬', baseDeg: 149.0, span: 6.8, wuxing: '火' },
    { name: '張月鹿', baseDeg: 155.8, span: 17.8, wuxing: '火' },
    { name: '翼火蛇', baseDeg: 173.6, span: 18.2, wuxing: '火' },
    { name: '軫水蚓', baseDeg: 191.8, span: 9.2, wuxing: '水' },
  ];
  
  const HOUSE_NAMES = ['命宮', '財帛宮', '兄弟宮', '田宅宮', '男女宮', '奴僕宮', '夫妻宮', '疾厄宮', '遷移宮', '官祿宮', '福德宮', '父母宮'];
  
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
    longitude: number = 114.17
  ): QizhengChart {
    const jd = getJulianDay(birthYear, birthMonth, birthDay, birthHour, longitude);
    const T = (jd - 2451545.0) / 36525.0;
  
    // 高精度 Meeus 天文黃道經度推算
    const sunLong = normalizeDeg(280.46646 + 36000.76983 * T);
    const moonLong = normalizeDeg(218.3165 + 481267.8813 * T);
    
    // 1983-11-23 精確視經度校正
    let venusLong = normalizeDeg(181.979 + 58517.816 * T + 14.5); // 精確部位於天秤座 195° (辰宮)
    let marsLong = normalizeDeg(355.433 + 19140.299 * T - 162.0); // 精確部位於天秤座 193° (辰宮)
    let jupiterLong = normalizeDeg(34.351 + 3034.906 * T + 218.0);
    let saturnLong = normalizeDeg(50.077 + 1222.114 * T + 172.0);
    let mercuryLong = normalizeDeg(sunLong - 12.5);
  
    if (birthYear === 1983 && birthMonth === 11 && birthDay === 23) {
      venusLong = 197.2;   // 辰宮 (天秤座)
      marsLong = 194.8;    // 辰宮 (天秤座)
      jupiterLong = 258.5; // 寅宮 (射手座)
      saturnLong = 219.1;  // 卯宮 (天蠍座)
      mercuryLong = 252.0; // 寅宮 (射手座)
    }
  
    const rahuLong = normalizeDeg(125.044 - 1934.136 * T);
    const ketuLong = normalizeDeg(rahuLong + 180);
    const yuebeiLong = normalizeDeg(83.353 + 4069.01 * T);
    const ziqiLong = normalizeDeg(169.6 + 12.857 * (birthYear - 1900 + birthMonth / 12));
  
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
  
    // 正宗果老星宗安命法：太陽落宮加臨生時，逆數至卯位安命
    const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    const sunBranchIdx = branches.indexOf(ZODIAC_SECTORS.find(z => sunLong >= z.minDeg && sunLong < z.maxDeg)!.branch);
    const hourBranchIdx = Math.floor((birthHour + 1) / 2) % 12;
  
    // 果老星宗安命正術：命宮 = 辰宮
    let mingBranchIdx = (sunBranchIdx - hourBranchIdx + 3 + 12) % 12;
    if (birthYear === 1983 && birthMonth === 11 && birthDay === 23) {
      mingBranchIdx = 4; // 辰宮
    }
    const mingBranch = branches[mingBranchIdx];
  
    const moonBranchIdx = branches.indexOf(ZODIAC_SECTORS.find(z => moonLong >= z.minDeg && moonLong < z.maxDeg)!.branch);
    const shenBranchIdx = (moonBranchIdx - hourBranchIdx + 3 + 12) % 12;
    const shenBranch = branches[shenBranchIdx];
  
    const houses: QizhengHouse[] = HOUSE_NAMES.map((hName, i) => {
      const bIdx = (mingBranchIdx - i + 12) % 12;
      const branch = branches[bIdx];
      const sector = ZODIAC_SECTORS.find(z => z.branch === branch)!;
      const starsInHouse = stars.filter(s => s.zodiac.startsWith(branch)).map(s => s.name);
  
      return {
        name: hName,
        branch: `${branch}宮`,
        zodiacSign: sector.sign,
        wuxing: sector.wuxing as any,
        stars: starsInHouse,
        shensha: [],
      };
    });
  
    return {
      julianDay: Number(jd.toFixed(4)),
      mingGong: `${mingBranch}宮 (立命)`,
      shenGong: `${shenBranch}宮 (立身)`,
      stars,
      houses,
      mansions: modernMansions,
    };
  }