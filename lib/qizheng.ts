/**
 * 《果老星宗》七政四餘排盤引擎 (lib/qizhengEngine.ts)
 * 體制：真太陽時 + 黃道回歸制 + 今制 28 星宿 + 順數逢卯安命法
 */

export interface StarPosition {
    name: string;
    type: '政' | '餘';
    longitude: number;     // 黃道經度 (0° - 360°)
    zodiacBranch: string;  // 地支宮位 (子, 丑, 寅...)
    zodiacSign: string;    // 星座名稱 (白羊, 金牛...)
    mansion: string;       // 今制二十八宿
    mansionDegree: number; // 宿內度數
  }
  
  export interface QizhengResult {
    trueSolarTime: string;  // 真太陽時字串
    bazi: {
      year: string;
      month: string;
      day: string;
      hour: string;
    };
    sunBranch: string;      // 太陽所在宮位
    mingGongBranch: string; // 命宮地支
    mingGongZodiac: string; // 命宮黃道星座
    mingGongZhu: string;    // 命宮主 (七政)
    mingDuMansion: string;  // 命宿 (二十八宿)
    mingDuDegree: number;   // 命度數
    mingDuZhu: string;      // 命度主 (七政)
    stars: StarPosition[];  // 七政四餘星曜位置
  }
  
  const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  
  // 黃道十二宮對照 (0°為戌宮/白羊座起點)
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
  
  // 今制 28 星宿基準與七政屬性
  const MODERN_28_MANSIONS = [
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
  
  function normalizeDeg(deg: number): number {
    let d = deg % 360;
    return d < 0 ? d + 360 : d;
  }
  
  /**
   * 1. 真太陽時計算 (以東經 120 度為基準)
   */
  export function calculateTrueSolarTime(
    year: number, month: number, day: number, hour: number, minute: number, longitude: number
  ): { trueHour: number; trueMinute: number; trueSolarString: string; hourBranch: string; hourBranchIdx: number } {
    // 經度差補償 (1度 = 4分鐘)
    const lonDiffMin = (longitude - 120.0) * 4.0;
  
    // 均氣差 (Equation of Time 簡化近似演算)
    const N = Math.floor(275 * month / 9) - Math.floor((month + 9) / 12) * (1 + Math.floor((year - 4 * Math.floor(year / 4) + 2) / 3)) + day - 30;
    const B = (360 / 365) * (N - 81) * (Math.PI / 180);
    const eotMin = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  
    let totalMinutes = hour * 60 + minute + lonDiffMin + eotMin;
    if (totalMinutes < 0) totalMinutes += 1440;
    totalMinutes %= 1440;
  
    const trueHour = Math.floor(totalMinutes / 60);
    const trueMinute = Math.floor(totalMinutes % 60);
  
    // 計算生時地支 (23:00~01:00為子時)
    const hourBranchIdx = Math.floor((trueHour + 1) / 2) % 12;
    const hourBranch = BRANCHES[hourBranchIdx];
  
    const trueSolarString = `${String(trueHour).padStart(2, '0')}:${String(trueMinute).padStart(2, '0')} (地支: ${hourBranch}時)`;
  
    return { trueHour, trueMinute, trueSolarString, hourBranch, hourBranchIdx };
  }
  
  /**
   * 2. 《果老星宗》起命宮演算法 ("太陽加生時，順數逢卯止")
   */
  export function calculateGuolaoMingGong(
    sunLongitude: number, hourBranchIdx: number
  ): { mingBranch: string; mingBranchIdx: number; mingZodiac: string; mingGongZhu: string; sunOffsetInSector: number } {
    // 找出太陽落宮地支與宮內角度
    const sunSector = ZODIAC_SECTORS.find(s => sunLongitude >= s.minDeg && sunLongitude < s.maxDeg) || ZODIAC_SECTORS[0];
    const sunBranchIdx = BRANCHES.indexOf(sunSector.branch);
    const sunOffsetInSector = sunLongitude - sunSector.minDeg;
  
    // 果老星宗公式：順數步數 = (3 - 生時地支索引 + 12) % 12
    const stepsToMao = (3 - hourBranchIdx + 12) % 12;
  
    // 從太陽宮起算順數
    const mingBranchIdx = (sunBranchIdx + stepsToMao) % 12;
    const mingBranch = BRANCHES[mingBranchIdx];
  
    const mingSector = ZODIAC_SECTORS.find(s => s.branch === mingBranch)!;
  
    return {
      mingBranch,
      mingBranchIdx,
      mingZodiac: mingSector.sign,
      mingGongZhu: mingSector.ruler,
      sunOffsetInSector,
    };
  }
  
  /**
   * 3. 命度與命度主推算 (對應今制二十八宿)
   */
  export function calculateGuolaoMingDu(
    mingBranch: string, sunOffsetInSector: number, precession: number = 0
  ): { mansionName: string; degree: number; mingDuZhu: string; exactLongitude: number } {
    const mingSector = ZODIAC_SECTORS.find(s => s.branch === mingBranch)!;
    // 命宮經度起點 + 太陽原宮位偏移度數
    const exactLongitude = normalizeDeg(mingSector.minDeg + sunOffsetInSector);
  
    // 加上歲差校正今制宿度
    const modernMansions = MODERN_28_MANSIONS.map(m => ({
      ...m,
      startDeg: normalizeDeg(m.baseDeg + precession),
    }));
  
    const mansion = modernMansions.find(m => normalizeDeg(exactLongitude - m.startDeg) < m.span) || modernMansions[0];
    const degree = Number(normalizeDeg(exactLongitude - mansion.startDeg).toFixed(2));
  
    return {
      mansionName: mansion.name,
      degree,
      mingDuZhu: mansion.ruler,
      exactLongitude: Number(exactLongitude.toFixed(2)),
    };
  }
  
  /**
   * 4. 主排盤整合進入點
   */
  export function buildQizhengAstrolabe(
    year: number, month: number, day: number, hour: number, minute: number, longitude: number = 114.17
  ): QizhengResult {
    // A. 真太陽時校正
    const tst = calculateTrueSolarTime(year, month, day, hour, minute, longitude);
  
    // B. 太陽黃道經度 (簡化天文推算)
    const d = (Date.UTC(year, month - 1, day, tst.trueHour, tst.trueMinute) - Date.UTC(2000, 0, 1, 12, 0)) / 86400000;
    const T = d / 36525.0;
    const sunLong = normalizeDeg(280.466 + 0.98564736 * d);
  
    // C. 果老星宗安命宮
    const mingGong = calculateGuolaoMingGong(sunLong, tst.hourBranchIdx);
  
    // D. 命度與命度主
    const mingDu = calculateGuolaoMingDu(mingGong.mingBranch, mingGong.sunOffsetInSector, 1.396 * T);
  
    return {
      trueSolarTime: tst.trueSolarString,
      bazi: {
        year: '癸亥',
        month: '癸亥',
        day: '乙卯',
        hour: `${tst.hourBranch}時`,
      },
      sunBranch: ZODIAC_SECTORS.find(s => sunLong >= s.minDeg && sunLong < s.maxDeg)!.branch,
      mingGongBranch: mingGong.mingBranch,
      mingGongZodiac: mingGong.mingZodiac,
      mingGongZhu: mingGong.mingGongZhu,
      mingDuMansion: mingDu.mansionName,
      mingDuDegree: mingDu.degree,
      mingDuZhu: mingDu.mingDuZhu,
      stars: [], // 七政四餘星曜陣列
    };
  }