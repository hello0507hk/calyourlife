/**
 * 七政四餘天文星盤計算模組 (lib/qizheng.ts)
 * 包含：天文儒略日 (Julian Day)、地心黃道經度推算、二十八宿落度、十二宮位與立命/立身宮
 */

export interface StarPosition {
    name: string;          // 星曜名稱 (如：太陽、太陰、木星、羅睺...)
    type: '政' | '餘';      // 七政 或 四餘
    longitude: number;     // 黃道經度 (0° - 360°)
    zodiac: string;        // 十二黃道宮 (如：戌宮/白羊、酉宮/金牛)
    mansion: string;       // 二十八宿 (如：角木蛟、亢金龍)
    mansionDegree: number; // 宿內度數
    isRetrograde?: boolean;// 是否逆行 (火/木/土/金/水)
  }
  
  export interface QizhengHouse {
    name: string;          // 十二宮名 (命宮、財帛宮、官祿宮、夫妻宮等)
    zodiac: string;        // 對應地支宮位 (子、丑、寅、卯...戌、亥)
    zodiacDegree: string;  // 黃道度數區間
    stars: string[];       // 駐留星曜列表
  }
  
  export interface QizhengChart {
    julianDay: number;     // 天文儒略日
    mingGong: string;      // 立命宮位與地支
    shenGong: string;      // 立身宮位與地支
    stars: StarPosition[]; // 七政四餘星曜位置
    houses: QizhengHouse[];// 十二宮佈局
  }
  
  // ------------------------------------------------------------------
  // 1. 常數與天文參考資料
  // ------------------------------------------------------------------
  
  // 十二宮對照 (依黃道經度 0° 起算：戌宮/白羊座起點為 0°)
  const ZODIAC_BRANCHES = [
    { name: '戌宮 (白羊)', minDeg: 0, maxDeg: 30, branch: '戌' },
    { name: '酉宮 (金牛)', minDeg: 30, maxDeg: 60, branch: '酉' },
    { name: '申宮 (雙子)', minDeg: 60, maxDeg: 90, branch: '申' },
    { name: '未宮 (巨蟹)', minDeg: 90, maxDeg: 120, branch: '未' },
    { name: '午宮 (獅子)', minDeg: 120, maxDeg: 150, branch: '午' },
    { name: '巳宮 (處女)', minDeg: 150, maxDeg: 180, branch: '巳' },
    { name: '辰宮 (天秤)', minDeg: 180, maxDeg: 210, branch: '辰' },
    { name: '卯宮 (天蠍)', minDeg: 210, maxDeg: 240, branch: '卯' },
    { name: '寅宮 (射手)', minDeg: 240, maxDeg: 270, branch: '寅' },
    { name: '丑宮 (摩羯)', minDeg: 270, maxDeg: 300, branch: '丑' },
    { name: '子宮 (水瓶)', minDeg: 300, maxDeg: 330, branch: '子' },
    { name: '亥宮 (雙魚)', minDeg: 330, maxDeg: 360, branch: '亥' },
  ];
  
  // 二十八宿黃道分界點 (以黃道經度為標準劃分)
  const TWENTY_EIGHT_MANSIONS = [
    { name: '角木蛟', startDeg: 173.0 },
    { name: '亢金龍', startDeg: 185.5 },
    { name: '氐土貉', startDeg: 195.0 },
    { name: '房日兔', startDeg: 211.0 },
    { name: '心月狐', startDeg: 217.0 },
    { name: '尾火虎', startDeg: 223.5 },
    { name: '箕水豹', startDeg: 241.0 },
    { name: '斗木蟹', startDeg: 250.5 },
    { name: '牛金牛', startDeg: 276.0 },
    { name: '女土蝠', startDeg: 283.5 },
    { name: '虛日鼠', startDeg: 295.0 },
    { name: '危月燕', startDeg: 305.0 },
    { name: '室火豬', startDeg: 325.5 },
    { name: '壁水蕐', startDeg: 341.0 },
    { name: '奎木狼', startDeg: 354.0 },
    { name: '婁金狗', startDeg: 10.5 },
    { name: '胃土雉', startDeg: 23.0 },
    { name: '昴日雞', startDeg: 38.5 },
    { name: '畢月烏', startDeg: 49.0 },
    { name: '觜火猴', startDeg: 64.5 },
    { name: '參水猿', startDeg: 65.5 },
    { name: '井木犴', startDeg: 75.5 },
    { name: '鬼金羊', startDeg: 108.5 },
    { name: '柳土獐', startDeg: 112.5 },
    { name: '星日馬', startDeg: 126.0 },
    { name: '張月鹿', startDeg: 133.5 },
    { name: '翼火蛇', startDeg: 151.5 },
    { name: '軫水蚓', startDeg: 170.0 },
  ];
  
  // 十二宮名稱順序（從命宮起逆數）
  const HOUSE_NAMES = [
    '命宮', '財帛宮', '兄弟宮', '田宅宮', 
    '男女宮', '奴僕宮', '夫妻宮', '疾厄宮', 
    '遷移宮', '官祿宮', '福德宮', '父母宮'
  ];
  
  // ------------------------------------------------------------------
  // 2. 天文計算核心演算法 (Astronomical Algorithms)
  // ------------------------------------------------------------------
  
  /** 角度標準化至 0° - 360° */
  function normalizeDeg(deg: number): number {
    let d = deg % 360;
    if (d < 0) d += 360;
    return d;
  }
  
  /** 角度轉弧度 */
  function toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }
  
  /** 弧度轉角度 */
  function toDeg(rad: number): number {
    return (rad * 180) / Math.PI;
  }
  
  /** 計算儒略日 (Julian Day) */
  function getJulianDay(year: number, month: number, day: number, hour: number, longitude: number = 114.17): number {
    // 經度時差校正 (東經為正)
    const utcHour = hour - longitude / 15.0;
    
    let y = year;
    let m = month;
    if (m <= 2) {
      y -= 1;
      m += 12;
    }
    const A = Math.floor(y / 100);
    const B = 2 - A + Math.floor(A / 4);
    const dayFraction = (utcHour + 0.5) / 24.0;
    
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + dayFraction + B - 1524.5;
  }
  
  /** 計算太陽地心黃道經度 */
  function getSunLongitude(T: number): number {
    const L0 = normalizeDeg(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
    const M = normalizeDeg(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
    const Mrad = toRad(M);
    
    // 中心差 (Equation of Center)
    const C = (1.914602 - 0.004817 * T) * Math.sin(Mrad) +
              (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad) +
              0.000289 * Math.sin(3 * Mrad);
              
    return normalizeDeg(L0 + C);
  }
  
  /** 計算太陰 (月亮) 地心黃道經度 */
  function getMoonLongitude(T: number): number {
    const L = normalizeDeg(218.316 + 481267.8813 * T);
    const M = normalizeDeg(134.963 + 477198.8676 * T);
    const D = normalizeDeg(297.850 + 445267.1114 * T);
    const F = normalizeDeg(93.272 + 483202.0175 * T);
  
    const Mrad = toRad(M);
    const Drad = toRad(D);
    const Frad = toRad(F);
  
    // 主要攝動項
    const perturbation = 6.289 * Math.sin(Mrad) +
                          1.274 * Math.sin(2 * Drad - Mrad) +
                          0.658 * Math.sin(2 * Drad) +
                          0.214 * Math.sin(2 * Mrad) -
                          0.186 * Math.sin(toRad(357.529 + 35999.05 * T)) -
                          0.114 * Math.sin(2 * Frad);
  
    return normalizeDeg(L + perturbation);
  }
  
  /** 計算行星 (木、火、土、金、水) 簡化地心黃道經度 */
  function getPlanetLongitude(planet: 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn', T: number, sunLong: number): { long: number; isRetrograde: boolean } {
    // Keplerian 軌道根數 (J2000.0)
    const elements: Record<string, { L: number; dL: number; a: number; e: number; i: number; N: number; w: number }> = {
      mercury: { L: 252.251, dL: 149472.674, a: 0.3871, e: 0.2056, i: 7.00, N: 48.33, w: 29.12 },
      venus:   { L: 181.979, dL: 58517.816,  a: 0.7233, e: 0.0068, i: 3.39, N: 76.68, w: 54.88 },
      mars:    { L: 355.433, dL: 19140.299,  a: 1.5237, e: 0.0934, i: 1.85, N: 49.56, w: 286.50 },
      jupiter: { L: 34.351,  dL: 3034.906,   a: 5.2026, e: 0.0485, i: 1.30, N: 100.46,w: 273.87 },
      saturn:  { L: 50.077,  dL: 1222.114,   a: 9.5549, e: 0.0555, i: 2.49, N: 113.67,w: 339.39 },
    };
  
    const p = elements[planet];
    const meanLong = normalizeDeg(p.L + p.dL * T);
    const M = toRad(normalizeDeg(meanLong - p.w));
    
    // 近點角修正 (Equation of Center)
    const helioLong = normalizeDeg(meanLong + toDeg(2 * p.e * Math.sin(M)));
    const helioRad = toRad(helioLong);
    const sunRad = toRad(sunLong);
  
    // 日心轉地心坐標 (Heliocentric to Geocentric conversion)
    const x = p.a * Math.cos(helioRad) + Math.cos(sunRad);
    const y = p.a * Math.sin(helioRad) + Math.sin(sunRad);
    
    const geocentricLong = normalizeDeg(toDeg(Math.atan2(y, x)));
    
    // 逆行判定 (與太陽相角過大且角速度趨緩)
    const phaseAngle = Math.abs(normalizeDeg(geocentricLong - sunLong));
    const isRetrograde = (planet === 'mars' || planet === 'jupiter' || planet === 'saturn') 
      ? (phaseAngle > 130 && phaseAngle < 230)
      : (planet === 'mercury' || planet === 'venus') && (phaseAngle < 15 || phaseAngle > 345);
  
    return { long: geocentricLong, isRetrograde };
  }
  
  // ------------------------------------------------------------------
  // 3. 七政四餘定位與宮宿映射
  // ------------------------------------------------------------------
  
  /** 依黃道經度取得十二黃道宮位 */
  function getZodiacByDegree(deg: number) {
    const normalized = normalizeDeg(deg);
    const found = ZODIAC_BRANCHES.find(z => normalized >= z.minDeg && normalized < z.maxDeg);
    return found || ZODIAC_BRANCHES[0];
  }
  
  /** 依黃道經度取得二十八宿與宿內度數 */
  function getMansionByDegree(deg: number) {
    const normalized = normalizeDeg(deg);
    let matchedMansion = TWENTY_EIGHT_MANSIONS[0];
    let minDiff = 999;
  
    for (let i = 0; i < TWENTY_EIGHT_MANSIONS.length; i++) {
      const cur = TWENTY_EIGHT_MANSIONS[i];
      const next = TWENTY_EIGHT_MANSIONS[(i + 1) % TWENTY_EIGHT_MANSIONS.length];
      
      let span = next.startDeg - cur.startDeg;
      if (span < 0) span += 360;
  
      let offset = normalized - cur.startDeg;
      if (offset < 0) offset += 360;
  
      if (offset < span) {
        return {
          mansion: cur.name,
          mansionDegree: Number(offset.toFixed(2)),
        };
      }
    }
  
    return { mansion: '角木蛟', mansionDegree: 0 };
  }
  
  // ------------------------------------------------------------------
  // 4. 主演算法入口 (calculateQizheng)
  // ------------------------------------------------------------------
  
  export function calculateQizheng(
    birthYear: number,
    birthMonth: number,
    birthDay: number,
    birthHour: number,
    longitude: number = 114.17
  ): QizhengChart {
    const jd = getJulianDay(birthYear, birthMonth, birthDay, birthHour, longitude);
    const T = (jd - 2451545.0) / 36525.0; // J2000.0 世紀數
  
    // 1. 推算七政黃道經度
    const sunLong = getSunLongitude(T);
    const moonLong = getMoonLongitude(T);
    const mercury = getPlanetLongitude('mercury', T, sunLong);
    const venus = getPlanetLongitude('venus', T, sunLong);
    const mars = getPlanetLongitude('mars', T, sunLong);
    const jupiter = getPlanetLongitude('jupiter', T, sunLong);
    const saturn = getPlanetLongitude('saturn', T, sunLong);
  
    // 2. 推算四餘黃道經度
    // 羅睺 (Rahu): 白道升交點
    const rahuLong = normalizeDeg(125.04452 - 1934.136261 * T + 0.0020708 * T * T);
    // 計都 (Ketu): 羅睺對沖 180°
    const ketuLong = normalizeDeg(rahuLong + 180);
    // 月孛 (Yuebei): 月球遠地點 (Lunar Apogee)
    const yuebeiLong = normalizeDeg(83.35324 + 4069.013711 * T);
    // 紫氣 (Ziqi): 傳統古算慢速吉星 (28年一週天，約每年12.857度)
    const ziqiLong = normalizeDeg(169.6 + 12.85714285 * (birthYear - 1900 + birthMonth / 12));
  
    // 3. 彙整七政四餘數據
    const rawStars = [
      { name: '太陽', type: '政' as const, long: sunLong },
      { name: '太陰', type: '政' as const, long: moonLong },
      { name: '木星', type: '政' as const, long: jupiter.long, isRetrograde: jupiter.isRetrograde },
      { name: '火星', type: '政' as const, long: mars.long, isRetrograde: mars.isRetrograde },
      { name: '土星', type: '政' as const, long: saturn.long, isRetrograde: saturn.isRetrograde },
      { name: '金星', type: '政' as const, long: venus.long, isRetrograde: venus.isRetrograde },
      { name: '水星', type: '政' as const, long: mercury.long, isRetrograde: mercury.isRetrograde },
      { name: '羅睺', type: '餘' as const, long: rahuLong },
      { name: '計都', type: '餘' as const, long: ketuLong },
      { name: '月孛', type: '餘' as const, long: yuebeiLong },
      { name: '紫氣', type: '餘' as const, long: ziqiLong },
    ];
  
    const stars: StarPosition[] = rawStars.map((s) => {
      const z = getZodiacByDegree(s.long);
      const m = getMansionByDegree(s.long);
      return {
        name: s.name,
        type: s.type,
        longitude: Number(s.long.toFixed(2)),
        zodiac: `${z.branch}宮 (${z.name.split(' ')[1] || ''})`,
        mansion: m.mansion,
        mansionDegree: m.mansionDegree,
        isRetrograde: s.isRetrograde,
      };
    });
  
    // 4. 推算「立命宮」與「立身宮」
    // 傳統星學口訣：「太陽落宮加臨出生時辰，順數至卯宮立命」
    const sunZodiac = getZodiacByDegree(sunLong);
    const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    const sunBranchIdx = branches.indexOf(sunZodiac.branch);
    
    // 出生時辰 (0:子, 1:丑 ... 11:亥)
    const hourBranchIdx = Math.floor((birthHour + 1) / 2) % 12;
    
    // 命宮地支索引：(太陽宮位 + (3[卯] - 時辰)) % 12
    const mingBranchIdx = (sunBranchIdx + (3 - hourBranchIdx + 12)) % 12;
    const mingBranch = branches[mingBranchIdx];
    const mingGongText = `${mingBranch}宮 (立命)`;
  
    // 身宮：依太陰落宮與時辰推算
    const moonZodiac = getZodiacByDegree(moonLong);
    const moonBranchIdx = branches.indexOf(moonZodiac.branch);
    const shenBranchIdx = (moonBranchIdx + (3 - hourBranchIdx + 12)) % 12;
    const shenBranch = branches[shenBranchIdx];
    const shenGongText = `${shenBranch}宮 (立身)`;
  
    // 5. 構建十二宮佈局
    const houses: QizhengHouse[] = HOUSE_NAMES.map((houseName, i) => {
      // 命宮起順/逆逆排十二宮地支
      const houseBranchIdx = (mingBranchIdx - i + 12) % 12;
      const houseBranch = branches[houseBranchIdx];
  
      // 找出在該宮位的星曜
      const starsInHouse = stars
        .filter((s) => s.zodiac.startsWith(houseBranch))
        .map((s) => s.name);
  
      return {
        name: houseName,
        zodiac: `${houseBranch}宮`,
        zodiacDegree: `黃道 ${(houseBranchIdx * 30)}° - ${(houseBranchIdx * 30 + 30)}°`,
        stars: starsInHouse,
      };
    });
  
    return {
      julianDay: Number(jd.toFixed(4)),
      mingGong: mingGongText,
      shenGong: shenGongText,
      stars,
      houses,
    };
  }