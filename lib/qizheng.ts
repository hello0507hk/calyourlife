/**
 * Moira 七政四餘高精度天文排盤引擎 (lib/qizheng.ts)
 * 算法：Paul Schlyter 高精度行星軌道根數 + 真太陽時 (TST) + 果老星宗正宗安命法
 */

export interface StarPosition {
    name: string;
    type: '政' | '餘';
    longitude: number;      // 黃道經度 (0° - 360°)
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
  
  // Moira 黃道十二宮 (0°為戌宮/白羊座起點)
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
  
  // 今制 28 星宿基準分度 (J2000)
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
  
  const GUOLAO_HOUSES = ['命宮', '財帛宮', '兄弟宮', '田宅宮', '男女宮', '奴僕宮', '夫妻宮', '疾厄宮', '遷移宮', '官祿宮', '福德宮', '父母宮'];
  
  function rev(deg: number): number {
    let d = deg % 360;
    return d < 0 ? d + 360 : d;
  }
  function sinD(deg: number) { return Math.sin((deg * Math.PI) / 180); }
  function cosD(deg: number) { return Math.cos((deg * Math.PI) / 180); }
  function atan2D(y: number, x: number) { return rev((Math.atan2(y, x) * 180) / Math.PI); }
  
  // 開普勒方程式求解
  function solveKepler(M: number, e: number): number {
    let mRad = (rev(M) * Math.PI) / 180;
    let E = mRad;
    for (let i = 0; i < 10; i++) {
      E = E - (E - e * Math.sin(E) - mRad) / (1 - e * Math.cos(E));
    }
    return E;
  }
  
  // Paul Schlyter 天文行星幾何座標轉換
  function calcPlanetPos(
    d: number,
    N0: number, N1: number,
    i0: number, i1: number,
    w0: number, w1: number,
    a0: number,
    e0: number, e1: number,
    M0: number, M1: number,
    xe: number, ye: number
  ) {
    const N = N0 + N1 * d;
    const inc = i0 + i1 * d;
    const w = w0 + w1 * d;
    const a = a0;
    const e = e0 + e1 * d;
    const M = M0 + M1 * d;
  
    const E = solveKepler(M, e);
    const xv = a * (Math.cos(E) - e);
    const yv = a * Math.sqrt(1 - e * e) * Math.sin(E);
    const v = atan2D(yv, xv);
    const r = Math.sqrt(xv * xv + yv * yv);
  
    const u = v + w;
    const xh = r * (cosD(N) * cosD(u) - sinD(N) * sinD(u) * cosD(inc));
    const yh = r * (sinD(N) * cosD(u) + cosD(N) * sinD(u) * cosD(inc));
  
    // 轉換為地心座標 (Helio -> Geo)
    const xg = xh + xe;
    const yg = yh + ye;
  
    return atan2D(yg, xg);
  }
  
  function getJulianDay(year: number, month: number, day: number, hour: number, minute: number, longitude: number): number {
    const utcHour = hour + minute / 60.0 - longitude / 15.0;
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
    birthHour: number = 12,
    birthMinute: number = 0,
    longitude: number = 114.17
  ): QizhengChart {
    // 1. TST 真太陽時
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
  
    // 2. 儒略天數 (自 1999-12-31 0:00 UT 算起)
    const jd = getJulianDay(birthYear, birthMonth, birthDay, birthHour, birthMinute, longitude);
    const d = jd - 2451543.5;
    const T = (jd - 2451545.0) / 36525.0;
  
    // 3. 高精度太陽與地球向量
    const w_sun = 282.9404 + 4.70935e-5 * d;
    const e_sun = 0.016709 - 1.151e-9 * d;
    const M_sun = 356.0470 + 0.9856002585 * d;
    const E_sun = solveKepler(M_sun, e_sun);
  
    const xv_sun = Math.cos(E_sun) - e_sun;
    const yv_sun = Math.sqrt(1 - e_sun * e_sun) * Math.sin(E_sun);
    const v_sun = atan2D(yv_sun, xv_sun);
    const r_sun = Math.sqrt(xv_sun * xv_sun + yv_sun * yv_sun);
  
    const sunLong = rev(v_sun + w_sun); // 地心太陽黃經
    const xe = r_sun * cosD(sunLong);   // 地球相對於太陽之 X 向量
    const ye = r_sun * sinD(sunLong);   // 地球相對於太陽之 Y 向量
  
    // 4. 太陰 (月亮) 高精度黃經
    const L_moon = rev(218.316 + 13.176396 * d);
    const M_moon = rev(134.963 + 13.064993 * d);
    const F_moon = rev(93.272 + 13.229350 * d);
    const moonLong = rev(L_moon + 6.289 * sinD(M_moon) - 1.274 * sinD(M_moon - 2 * (L_moon - sunLong)) + 0.658 * sinD(2 * (L_moon - sunLong)));
  
    // 5. 五大行星高精度地心黃經 (Mercury, Venus, Mars, Jupiter, Saturn)
    const mercuryLong = calcPlanetPos(d, 48.3313, 3.24587e-5, 7.0047, 5e-8, 29.1241, 1.01444e-5, 0.387098, 0.205635, 5.59e-10, 168.6562, 4.0923344368, xe, ye);
    const venusLong = calcPlanetPos(d, 76.6799, 2.4659e-5, 3.3946, 2.75e-8, 54.8910, 1.38374e-5, 0.723330, 0.006773, -1.302e-9, 48.0052, 1.6021302244, xe, ye);
    const marsLong = calcPlanetPos(d, 49.5574, 2.11081e-5, 1.8497, -1.78e-8, 286.5016, 2.92961e-5, 1.523688, 0.093405, 2.516e-9, 18.6021, 0.5240207766, xe, ye);
    const jupiterLong = calcPlanetPos(d, 100.4542, 2.76854e-5, 1.3030, -1.557e-7, 273.8777, 1.64505e-5, 5.20256, 0.048498, 4.469e-9, 19.8950, 0.0830853001, xe, ye);
    const saturnLong = calcPlanetPos(d, 113.6655, 2.3898e-5, 2.4886, -1.081e-7, 339.3939, 2.97661e-5, 9.55475, 0.055546, -9.499e-9, 316.9670, 0.0334442282, xe, ye);
  
    // 6. 四餘 (羅睺、計都、月孛、紫氣)
    const rahuLong = rev(125.1228 - 0.0529538083 * d);
    const ketuLong = rev(rahuLong + 180);
    const yuebeiLong = rev(318.0634 + 0.1643573223 * d + 180);
    const ziqiLong = rev(169.60 + 0.034346 * d);
  
    // 7. 今制 28 星宿歲差校正
    const precession = 1.396 * T;
    const modernMansions = BASE_28_MANSIONS.map(m => ({
      name: m.name,
      startDeg: rev(m.baseDeg + precession),
      span: m.span,
      wuxing: m.wuxing,
      ruler: m.ruler,
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
      const m = modernMansions.find(m => rev(s.long - m.startDeg) < m.span) || modernMansions[0];
      const offset = rev(s.long - m.startDeg);
      return { name: s.name, type: s.type, longitude: Number(s.long.toFixed(2)), zodiac: `${sec.branch}宮 (${sec.sign})`, wuxing: s.wuxing, mansion: m.name, mansionDegree: Number(offset.toFixed(2)) };
    });
  
    // 8. Moira 果老星宗立命法："太陽加生時，順數逢卯止"
    const sunSector = ZODIAC_SECTORS.find(s => sunLong >= s.minDeg && sunLong < s.maxDeg) || ZODIAC_SECTORS[0];
    const sunBranchIdx = BRANCHES.indexOf(sunSector.branch);
    const sunOffsetInSector = sunLong - sunSector.minDeg;
  
    // 順數至卯(3)
    const stepsToMao = (3 - hourBranchIdx + 12) % 12;
    const mingBranchIdx = (sunBranchIdx + stepsToMao) % 12;
    const mingBranch = BRANCHES[mingBranchIdx];
    const mingSector = ZODIAC_SECTORS.find(s => s.branch === mingBranch)!;
  
    const exactMingLong = rev(mingSector.minDeg + sunOffsetInSector);
    const mingMansion = modernMansions.find(m => rev(exactMingLong - m.startDeg) < m.span) || modernMansions[0];
    const mingDuDegree = Number(rev(exactMingLong - mingMansion.startDeg).toFixed(1));
  
    // 9. 身宮 (太陰落宮)
    const moonSector = ZODIAC_SECTORS.find(s => moonLong >= s.minDeg && moonLong < s.maxDeg) || ZODIAC_SECTORS[0];
    const moonMansion = modernMansions.find(m => rev(moonLong - m.startDeg) < m.span) || modernMansions[0];
  
    // 10. 後天十二宮逆排
    const mingIdxInBranch = BRANCHES.indexOf(mingBranch);
    const houses: QizhengHouse[] = GUOLAO_HOUSES.map((hName, idx) => {
      const bIdx = (mingIdxInBranch - idx + 12) % 12;
      const branch = BRANCHES[bIdx];
      const sector = ZODIAC_SECTORS.find(s => s.branch === branch)!;
      const starsInHouse = stars.filter(s => s.zodiac.startsWith(branch)).map(s => s.name);
      return { name: hName, branch: `${branch}宮`, zodiacSign: sector.sign, wuxing: sector.wuxing, stars: starsInHouse, shensha: [] };
    });
  
    return {
      julianDay: Number(jd.toFixed(4)),
      mingGong: `${mingBranch}宮 (立命${mingMansion.name.slice(0, 2)}${mingDuDegree}度)`,
      shenGong: `${moonSector.branch}宮 (立身${moonMansion.name.slice(0, 2)}宿)`,
      stars,
      houses,
      mansions: modernMansions,
      trueSolarTime: `${String(tstHour).padStart(2, '0')}:${String(tstMinute).padStart(2, '0')}`,
      mingGongZhu: mingSector.ruler,
      mingDuZhu: mingMansion.ruler,
      mingDuMansion: mingMansion.name,
      mingDuDegree,
    };
  }