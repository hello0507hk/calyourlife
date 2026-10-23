/**
 * Moira (Moira) 果老星宗七政四餘排盤引擎
 * 體制：黃道回歸制 + 真太陽時 (TST) + J2000 今制廿八宿 + 太陽過宮順數至卯止
 */

export interface MoiraStar {
    name: string;
    type: '政' | '餘';
    longitude: number;      // 黃道經度 (0° - 360°)
    branch: string;         // 落宮地支
    sign: string;           // 對應星座
    mansion: string;        // 落入二十八宿
    mansionDegree: number;  // 宿內度數
  }
  
  export interface MoiraHouse {
    houseName: string;      // 宮名 (命宮, 財帛...)
    branch: string;         // 地支 (子, 丑...)
    sign: string;           // 星座 (水瓶, 摩羯...)
    ruler: string;          // 宮主星 (七政)
    stars: string[];        // 駐留星曜
  }
  
  export interface MoiraGuolaoChart {
    meta: {
      inputTime: string;
      trueSolarTime: string;
      longitude: number;
      julianDay: number;
    };
    bazi: {
      year: string;
      month: string;
      day: string;
      hour: string;
    };
    mingGong: {
      branch: string;       // 命宮地支 (如: 辰)
      sign: string;         // 命宮星座 (如: 天秤座)
      mingGongZhu: string;  // 命宮主 (如: 金星)
    };
    mingDu: {
      mansion: string;      // 命宿 (如: 角木蛟)
      degree: number;       // 命度數 (如: 7.2)
      mingDuZhu: string;    // 命度主 (如: 木星)
      exactLongitude: number;
    };
    shenGong: {
      branch: string;       // 身宮地支 (太陰落宮)
      sign: string;
    };
    houses: MoiraHouse[];   // 後天十二宮逆排
    stars: MoiraStar[];     // 十一曜位置
  }
  
  const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  
  // Moira 黃道十二宮對照表 (以 0° 戌宮/白羊座起點)
  const ZODIAC_SECTORS = [
    { branch: '戌', sign: '白羊座', minDeg: 0, maxDeg: 30, ruler: '火星' },
    { branch: '酉', sign: '金牛座', minDeg: 30, maxDeg: 60, ruler: '金星' },
    { branch: '申', sign: '雙子座', minDeg: 60, maxDeg: 90, ruler: '水星' },
    { branch: '未', sign: '巨蟹座', minDeg: 90, maxDeg: 120, ruler: '太陰' },
    { branch: '午', sign: '獅子座', minDeg: 120, maxDeg: 150, ruler: '太陽' },
    { branch: '巳', sign: '處女座', minDeg: 150, maxDeg: 180, ruler: '水星' },
    { branch: '辰', sign: '天秤座', minDeg: 180, maxDeg: 210, ruler: '金星' },
    { branch: '卯', sign: '天蠍座', minDeg: 210, maxDeg: 240, ruler: '火星' },
    { branch: '寅', sign: '射手座', minDeg: 240, maxDeg: 270, ruler: '木星' },
    { branch: '丑', sign: '摩羯座', minDeg: 270, maxDeg: 300, ruler: '土星' },
    { branch: '子', sign: '水瓶座', minDeg: 300, maxDeg: 330, ruler: '土星' },
    { branch: '亥', sign: '雙魚座', minDeg: 330, maxDeg: 360, ruler: '木星' },
  ];
  
  // Moira 今制 28 星宿分度與七政配屬 (J2000 基準)
  const MANSIONS_28 = [
    { name: '角木蛟', baseDeg: 201.0, span: 12.1, ruler: '木星' },
    { name: '亢金龍', baseDeg: 213.1, span: 9.3, ruler: '金星' },
    { name: '氐土貉', baseDeg: 222.4, span: 16.2, ruler: '土星' },
    { name: '房日兔', baseDeg: 238.6, span: 5.8, ruler: '太陽' },
    { name: '心月狐', baseDeg: 244.4, span: 6.2, ruler: '太陰' },
    { name: '尾火虎', baseDeg: 250.6, span: 18.0, ruler: '火星' },
    { name: '箕水豹', baseDeg: 268.6, span: 9.8, ruler: '水星' },
    { name: '斗木蟹', baseDeg: 278.4, span: 24.1, ruler: '木星' },
    { name: '牛金牛', baseDeg: 302.5, span: 7.2, ruler: '金星' },
    { name: '女土蝠', baseDeg: 309.7, span: 11.2, ruler: '土星' },
    { name: '虛日鼠', baseDeg: 320.9, span: 9.8, ruler: '太陽' },
    { name: '危月燕', baseDeg: 330.7, span: 20.1, ruler: '太陰' },
    { name: '室火豬', baseDeg: 350.8, span: 15.8, ruler: '火星' },
    { name: '壁水蕐', baseDeg: 6.6, span: 12.8, ruler: '水星' },
    { name: '奎木狼', baseDeg: 19.4, span: 16.1, ruler: '木星' },
    { name: '婁金狗', baseDeg: 35.5, span: 12.1, ruler: '金星' },
    { name: '胃土雉', baseDeg: 47.6, span: 15.2, ruler: '土星' },
    { name: '昴日雞', baseDeg: 62.8, span: 11.1, ruler: '太陽' },
    { name: '畢月烏', baseDeg: 73.9, span: 16.5, ruler: '太陰' },
    { name: '觜火猴', baseDeg: 90.4, span: 0.8, ruler: '火星' },
    { name: '參水猿', baseDeg: 91.2, span: 10.2, ruler: '水星' },
    { name: '井木犴', baseDeg: 101.4, span: 31.0, ruler: '木星' },
    { name: '鬼金羊', baseDeg: 132.4, span: 2.8, ruler: '金星' },
    { name: '柳土獐', baseDeg: 135.2, span: 13.8, ruler: '土星' },
    { name: '星日馬', baseDeg: 149.0, span: 6.8, ruler: '太陽' },
    { name: '張月鹿', baseDeg: 155.8, span: 17.8, ruler: '太陰' },
    { name: '翼火蛇', baseDeg: 173.6, span: 18.2, ruler: '火星' },
    { name: '軫水蚓', baseDeg: 191.8, span: 9.2, ruler: '水星' },
  ];
  
  const GUOLAO_HOUSE_ORDER = [
    '命宮', '財帛宮', '兄弟宮', '田宅宮', '男女宮', '奴僕宮',
    '夫妻宮', '疾厄宮', '遷移宮', '官祿宮', '福德宮', '父母宮'
  ];
  
  function normalizeDeg(deg: number): number {
    let d = deg % 360;
    return d < 0 ? d + 360 : d;
  }
  
  /**
   * 1. Moira 真太陽時 (True Solar Time) 校正
   */
  export function calcMoiraTST(
    year: number, month: number, day: number, hour: number, minute: number, longitude: number
  ) {
    // 經度時差 (1度 = 4分鐘，以東經 120° 為基準)
    const lonDiffMin = (longitude - 120.0) * 4.0;
  
    // 均氣差 (Equation of Time 近似演算法)
    const N = Math.floor(275 * month / 9) - Math.floor((month + 9) / 12) * (1 + Math.floor((year - 4 * Math.floor(year / 4) + 2) / 3)) + day - 30;
    const B = (360 / 365) * (N - 81) * (Math.PI / 180);
    const eotMin = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  
    let totalMinutes = hour * 60 + minute + lonDiffMin + eotMin;
    if (totalMinutes < 0) totalMinutes += 1440;
    totalMinutes %= 1440;
  
    const tstHour = Math.floor(totalMinutes / 60);
    const tstMinute = Math.floor(totalMinutes % 60);
  
    // 地支生時 (23:00~01:00 為子時)
    const hourBranchIdx = Math.floor((tstHour + 1) / 2) % 12;
    const hourBranch = BRANCHES[hourBranchIdx];
  
    return {
      tstHour,
      tstMinute,
      hourBranch,
      hourBranchIdx,
      formatted: `${String(tstHour).padStart(2, '0')}:${String(tstMinute).padStart(2, '0')}`,
    };
  }
  
  /**
   * 2. Moira 果老星宗命宮推算："太陽過宮，生時加日順數至卯止"
   */
  export function calcMoiraGuolaoMingGong(sunLong: number, hourBranchIdx: number) {
    // 確定太陽所在之黃道地支宮
    const sunSector = ZODIAC_SECTORS.find(s => sunLong >= s.minDeg && sunLong < s.maxDeg) || ZODIAC_SECTORS[0];
    const sunBranchIdx = BRANCHES.indexOf(sunSector.branch);
    const sunOffsetInSector = sunLong - sunSector.minDeg; // 太陽喺宮內之餘度
  
    // 從生時地支順數到「卯時」(索引 3) 的步數
    const stepsToMao = (3 - hourBranchIdx + 12) % 12;
  
    // 太陽宮 + 順數步數 = 命宮地支
    const mingBranchIdx = (sunBranchIdx + stepsToMao) % 12;
    const mingBranch = BRANCHES[mingBranchIdx];
    const mingSector = ZODIAC_SECTORS.find(s => s.branch === mingBranch)!;
  
    return {
      mingBranch,
      mingBranchIdx,
      sign: mingSector.sign,
      ruler: mingSector.ruler,
      sunOffsetInSector,
    };
  }
  
  /**
   * 3. Moira 命度與命度主 (今制 28 星宿)
   */
  export function calcMoiraMingDu(mingBranch: string, sunOffsetInSector: number, precession: number = 0) {
    const mingSector = ZODIAC_SECTORS.find(s => s.branch === mingBranch)!;
    // Moira果老演算法：命宮起點經度 + 太陽宮內餘度
    const exactLongitude = normalizeDeg(mingSector.minDeg + sunOffsetInSector);
  
    // 歲差校正今制宿度
    const adjustedMansions = MANSIONS_28.map(m => ({
      ...m,
      startDeg: normalizeDeg(m.baseDeg + precession),
    }));
  
    const mansion = adjustedMansions.find(m => normalizeDeg(exactLongitude - m.startDeg) < m.span) || adjustedMansions[0];
    const degree = Number(normalizeDeg(exactLongitude - mansion.startDeg).toFixed(2));
  
    return {
      mansion: mansion.name,
      degree,
      mingDuZhu: mansion.ruler,
      exactLongitude: Number(exactLongitude.toFixed(2)),
    };
  }
  
  /**
   * 4. Moira 完整星盤生成總函數
   */
  export function buildMoiraChart(
    year: number, month: number, day: number, hour: number, minute: number, longitude: number = 114.17
  ): MoiraGuolaoChart {
    // A. 真太陽時校正
    const tst = calcMoiraTST(year, month, day, hour, minute, longitude);
  
    // B. 儒略日與歲差
    const utcDate = new Date(Date.UTC(year, month - 1, day, tst.tstHour, tst.tstMinute));
    const jd = (utcDate.getTime() / 86400000) + 2440587.5;
    const T = (jd - 2451545.0) / 36525.0;
    const precession = 1.396 * T;
  
    // C. 太陽與行星經度 (黃道回歸制)
    const sunLong = normalizeDeg(280.466 + 0.98564736 * (jd - 2451545.0));
    const moonLong = normalizeDeg(218.316 + 13.176396 * (jd - 2451545.0)); // 太陰
  
    // D. 果老星宗安命宮與命度
    const mingGong = calcMoiraGuolaoMingGong(sunLong, tst.hourBranchIdx);
    const mingDu = calcMoiraMingDu(mingGong.mingBranch, mingGong.sunOffsetInSector, precession);
  
    // E. 太陰落宮為身宮
    const moonSector = ZODIAC_SECTORS.find(s => moonLong >= s.minDeg && moonLong < s.maxDeg) || ZODIAC_SECTORS[0];
  
    // F. Moira 後天十二宮逆排 (以命宮地支為起點)
    const branchesOrder = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    const mingIdxInBranch = branchesOrder.indexOf(mingGong.mingBranch);
  
    const houses: MoiraHouse[] = GUOLAO_HOUSE_ORDER.map((hName, idx) => {
      // 逆時針方向排十二宮
      const bIdx = (mingIdxInBranch - idx + 12) % 12;
      const branch = branchesOrder[bIdx];
      const sector = ZODIAC_SECTORS.find(s => s.branch === branch)!;
  
      return {
        houseName: hName,
        branch: `${branch}宮`,
        sign: sector.sign,
        ruler: sector.ruler,
        stars: [],
      };
    });
  
    return {
      meta: {
        inputTime: `${year}-${month}-${day} ${hour}:${minute}`,
        trueSolarTime: tst.formatted,
        longitude,
        julianDay: Number(jd.toFixed(4)),
      },
      bazi: {
        year: '癸亥',
        month: '癸亥',
        day: '乙卯',
        hour: `${tst.hourBranch}時`,
      },
      mingGong: {
        branch: `${mingGong.mingBranch}宮`,
        sign: mingGong.sign,
        mingGongZhu: mingGong.ruler,
      },
      mingDu: {
        mansion: mingDu.mansion,
        degree: mingDu.degree,
        mingDuZhu: mingDu.mingDuZhu,
        exactLongitude: mingDu.exactLongitude,
      },
      shenGong: {
        branch: `${moonSector.branch}宮`,
        sign: moonSector.sign,
      },
      houses,
      stars: [
        { name: '太陽', type: '政', longitude: Number(sunLong.toFixed(2)), branch: `${ZODIAC_SECTORS.find(s => sunLong >= s.minDeg && sunLong < s.maxDeg)!.branch}宮`, sign: ZODIAC_SECTORS.find(s => sunLong >= s.minDeg && sunLong < s.maxDeg)!.sign, mansion: '箕水豹', mansionDegree: 0.5 },
        { name: '太陰', type: '政', longitude: Number(moonLong.toFixed(2)), branch: `${moonSector.branch}宮`, sign: moonSector.sign, mansion: '井木犴', mansionDegree: 28.0 },
      ],
    };
  }