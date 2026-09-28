const { Solar } = require('lunar-javascript');

// 天干與地支五行映射
const GAN_WUXING = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
const ZHI_WUXING = { 寅: '木', 卯: '木', 巳: '火', 午: '火', 辰: '土', 戌: '土', 丑: '土', 未: '土', 申: '金', 酉: '金', 亥: '水', 子: '水' };

/**
 * 計算天文均時差 (Equation of Time, EoT)
 */
function getEquationOfTime(year, month, day) {
  const date = new Date(year, month - 1, day);
  const start = new Date(year, 0, 0);
  const diff = date - start;
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  const B = (2 * Math.PI * (dayOfYear - 81)) / 364;
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  return eot; // 回傳分鐘數
}

/**
 * 真太陽時精確校正
 */
function getTrueSolarTime(year, month, day, hour, minute, longitude = 114.17, standardMeridian = 120) {
  // 1. 經度時差：每相差 1 度相差 4 分鐘
  const longitudeOffset = (longitude - standardMeridian) * 4;

  // 2. 天文均時差 (EoT)
  const eot = getEquationOfTime(year, month, day);

  // 3. 總校正分鐘數
  const totalOffsetMinutes = Math.round(longitudeOffset + eot);

  // 計算實際校正後的日期與時間
  const targetDate = new Date(year, month - 1, day, hour, minute);
  targetDate.setMinutes(targetDate.getMinutes() + totalOffsetMinutes);

  return {
    year: targetDate.getFullYear(),
    month: targetDate.getMonth() + 1,
    day: targetDate.getDate(),
    hour: targetDate.getHours(),
    minute: targetDate.getMinutes(),
    offsetMinutes: totalOffsetMinutes,
  };
}

export function calculateBazi(
  year,
  month,
  day,
  hour,
  gender = 'male',
  minute = 0,
  useTrueSolar = true,
  longitude = 114.17 // 預設香港 114.17°E
) {
  let calcYear = Number(year);
  let calcMonth = Number(month);
  let calcDay = Number(day);
  let calcHour = Number(hour);
  let calcMinute = Number(minute);
  let trueSolarText = '';

  // 若開啟真太陽時校正，計算真太陽時
  if (useTrueSolar) {
    const trueTime = getTrueSolarTime(calcYear, calcMonth, calcDay, calcHour, calcMinute, Number(longitude));
    calcYear = trueTime.year;
    calcMonth = trueTime.month;
    calcDay = trueTime.day;
    calcHour = trueTime.hour;
    calcMinute = trueTime.minute;

    const sign = trueTime.offsetMinutes >= 0 ? '+' : '';
    trueSolarText = `真太陽時校正：${calcYear}年${calcMonth}月${calcDay}日 ${String(calcHour).padStart(2, '0')}:${String(calcMinute).padStart(2, '0')} (時差 ${sign}${trueTime.offsetMinutes}分鐘)`;
  }

  // 建立 Solar 陽曆物件
  const solar = Solar.fromYmdHms(calcYear, calcMonth, calcDay, calcHour, calcMinute, 0);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();

  // 取消早夜子時，23:00 滿即算次日 (Sect 2)
  eightChar.setSect(2);

  const genderCode = gender === 'male' ? 1 : 0;
  const genderText = gender === 'male' ? '乾造（男）' : '坤造（女）';
  const yun = eightChar.getYun(genderCode);
  const daYunList = yun.getDaYun();

  const yearGan = eightChar.getYearGan();
  const yearZhi = eightChar.getYearZhi();
  const monthGan = eightChar.getMonthGan();
  const monthZhi = eightChar.getMonthZhi();
  const dayGan = eightChar.getDayGan();
  const dayZhi = eightChar.getDayZhi();
  const hourGan = eightChar.getTimeGan();
  const hourZhi = eightChar.getTimeZhi();

  const allChars = [yearGan, yearZhi, monthGan, monthZhi, dayGan, dayZhi, hourGan, hourZhi];
  const wuxingCounts = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };

  allChars.forEach((char) => {
    const wx = GAN_WUXING[char] || ZHI_WUXING[char];
    if (wx && wx in wuxingCounts) {
      wuxingCounts[wx] += 1;
    }
  });

  return {
    solarDate: solar.toString(),
    lunarDate: `${lunar.getYearInGanZhi()}年 ${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
    trueSolarText,
    gender,
    genderText,
    dayGan: dayGan,
    dayGanWuxing: GAN_WUXING[dayGan] || '木',
    eightChar: {
      year: {
        gan: eightChar.getYearGan(),
        zhi: eightChar.getYearZhi(),
        ganShishen: eightChar.getYearShiShenGan(),
        zhiShishen: eightChar.getYearShiShenZhi()[0] || '',
        zangGan: eightChar.getYearHideGan(),
        zangGanShishen: eightChar.getYearShiShenZhi(),
      },
      month: {
        gan: eightChar.getMonthGan(),
        zhi: eightChar.getMonthZhi(),
        ganShishen: eightChar.getMonthShiShenGan(),
        zhiShishen: eightChar.getMonthShiShenZhi()[0] || '',
        zangGan: eightChar.getMonthHideGan(),
        zangGanShishen: eightChar.getMonthShiShenZhi(),
      },
      day: {
        gan: eightChar.getDayGan(),
        zhi: eightChar.getDayZhi(),
        ganShishen: '日主',
        zhiShishen: eightChar.getDayShiShenZhi()[0] || '',
        zangGan: eightChar.getDayHideGan(),
        zangGanShishen: eightChar.getDayShiShenZhi(),
      },
      hour: {
        gan: eightChar.getTimeGan(),
        zhi: eightChar.getTimeZhi(),
        ganShishen: eightChar.getTimeShiShenGan(),
        zhiShishen: eightChar.getTimeShiShenZhi()[0] || '',
        zangGan: eightChar.getTimeHideGan(),
        zangGanShishen: eightChar.getTimeShiShenZhi(),
      },
    },
    wuxingCounts,
    dayyun: daYunList.slice(1, 9).map((dy) => ({
      age: dy.getStartAge(),
      ganZhi: dy.getGanZhi(),
    })),
  };
}