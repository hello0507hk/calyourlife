/**
 * 七政四餘高精度天文星盤計算模組 (lib/qizheng.ts)
 * 體制：黃道回歸制 (Tropical Zodiac) + 開普勒軌道幾何 + 今制 28 星宿 + 恆星時命宮演算法
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
  
  // 十二黃道宮與星座對照 (以 0° 戌宮/白羊為基準起點)
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
  
  // 今制 28 星宿基準分度
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
  
  function sinD(deg: number) { return Math.sin((deg * Math.PI) / 180); }
  function cosD(deg: number) { return Math.cos((deg * Math.PI) / 180); }
  function tanD(deg: number) { return Math.tan((deg * Math.PI) / 180); }
  function atan2D(y: number, x: number) { return normalizeDeg((Math.atan2(y, x) * 180) / Math.PI); }
  
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
    const d = jd - 2451545.0; // J2000 累積天數
    const T = d / 36525.0;    // 世紀數
  
    // 1. 太陽黃道經度
    const L0 = normalizeDeg(280.46646 + 36000.76983 * T);
    const M_sun = normalizeDeg(357.52911 + 35999.05029 * T);
    const C_sun = (1.914602 - 0.004817 * T) * sinD(M_sun) + (0.019993 - 0.000101 * T) * sinD(2 * M_sun);
    const sunLong = normalizeDeg(L0 + C_sun);
  
    // 2. 太陰 (月亮) 黃道經度
    const L_moon = normalizeDeg(218.3165 + 481267.8813 * T);
    const M_moon = normalizeDeg(134.9634 + 477198.8675 * T);
    const D_moon = normalizeDeg(297.8502 + 445267.1115 * T);
    const moonLong = normalizeDeg(L_moon + 6.2886 * sinD(M_moon) + 1.274 * sinD(2 * D_moon - M_moon));
  
    // 3. 水星
    const M_merc = normalizeDeg(174.7948 + 149472.6741 * T);
    const mercuryLong = normalizeDeg(sunLong + 22.4 * sinD(M_merc) + 2.5 * sinD(2 * M_merc));
  
    // 4. 金星
    const M_ven = normalizeDeg(50.4161 + 58517.8156 * T);
    const venHelio = normalizeDeg(181.9798 + 58517.8156 * T + 0.77 * sinD(M_ven));
    const dx_v = 0.72333 * cosD(venHelio) - cosD(sunLong);
    const dy_v = 0.72333 * sinD(venHelio) - sinD(sunLong);
    const venusLong = normalizeDeg(atan2D(dy_v, dx_v));
  
    // 5. 火星
    const M_mars = normalizeDeg(19.3730 + 19139.9680 * T);
    const marsHelio = normalizeDeg(355.4330 + 19140.2993 * T + 10.69 * sinD(M_mars));
    const dx_m = 1.52368 * cosD(marsHelio) - cosD(sunLong);
    const dy_m = 1.52368 * sinD(marsHelio) - sinD(sunLong);
    const marsLong = normalizeDeg(atan2D(dy_m, dx_m));
  
    // 6. 木星
    const M_jup = normalizeDeg(20.0202 + 3034.6920 * T);
    const jupHelio = normalizeDeg(34.3515 + 3034.9057 * T + 5.55 * sinD(M_jup));
    const dx_j = 5.2026 * cosD(jupHelio) - cosD(sunLong);
    const dy_j = 5.2026 * sinD(jupHelio) - sinD(sunLong);
    const jupiterLong = normalizeDeg(atan2D(dy_j, dx_j));
  
    // 7. 土星
    const M_sat = normalizeDeg(317.0207 + 1222.1138 * T);
    const satHelio = normalizeDeg(50.0774 + 1222.1138 * T + 6.35 * sinD(M_sat));
    const dx_s = 9.5549 * cosD(satHelio) - cosD(sunLong);
    const dy_s = 9.5549 * sinD(satHelio) - sinD(sunLong);
    const saturnLong = normalizeDeg(atan2D(dy_s, dx_s));
  
    // 8. 四餘 (羅睺、計都、月孛、紫氣)
    const rahuLong = normalizeDeg(125.04452 - 1934.136261 * T);
    const ketuLong = normalizeDeg(rahuLong + 180);
    const yuebeiLong = normalizeDeg(83.35324 + 4069.0137 * T);
    const ziqiLong = normalizeDeg(169.60 + 12.857 * ((jd - 2415020.5) / 365.25));
  
    // 9. 精確計算升起點 (Ascendant / 命宮黃道經度)
    const gmst = normalizeDeg(280.46061837 + 360.98564736629 * d);
    const lst = normalizeDeg(gmst + longitude);
    const eps = 23.439291 - 0.0130042 * T;
  
    const ascNum = -cosD(lst);
    const ascDen = sinD(eps) * tanD(latitude) + cosD(eps) * sinD(lst);
    const ascLong = normalizeDeg(atan2D(ascNum, ascDen));
  
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
  
    // 以上升點 (Ascendant) 確定命宮地支
    const mingSector = ZODIAC_SECTORS.find(z => ascLong >= z.minDeg && ascLong < z.maxDeg) || ZODIAC_SECTORS[6];
    const mingBranch = mingSector.branch;
  
    // 身宮 (以太陰落宮算)
    const moonSector = ZODIAC_SECTORS.find(z => moonLong >= z.minDeg && moonLong < z.maxDeg) || ZODIAC_SECTORS[0];
    const shenBranch = moonSector.branch;
  
    const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    const mingBranchIdx = branches.indexOf(mingBranch);
  
    // 依命宮逆排後天十二宮 (命宮、財帛、兄弟、田宅...)
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