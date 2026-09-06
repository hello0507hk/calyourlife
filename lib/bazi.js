const { Solar } = require('lunar-javascript');

// 天干與地支的五行映射表
const GAN_WUXING = {
  甲: '木', 乙: '木',
  丙: '火', 丁: '火',
  戊: '土', 己: '土',
  庚: '金', 辛: '金',
  壬: '水', 癸: '水',
};

const ZHI_WUXING = {
  寅: '木', 卯: '木',
  巳: '火', 午: '火',
  辰: '土', 戌: '土', 丑: '土', 未: '土',
  申: '金', 酉: '金',
  亥: '水', 子: '水',
};

export function calculateBazi(year, month, day, hour, gender = 'male') {
  // 建立 Solar 陽曆物件
  const solar = Solar.fromYmdHms(year, month, day, hour, 0, 0);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();

  // 性別：男 1，女 0
  const genderCode = gender === 'male' ? 1 : 0;
  const yun = eightChar.getYun(genderCode);
  const daYunList = yun.getDaYun();

  // 取得四柱干支
  const yearGan = eightChar.getYearGan();
  const yearZhi = eightChar.getYearZhi();
  const monthGan = eightChar.getMonthGan();
  const monthZhi = eightChar.getMonthZhi();
  const dayGan = eightChar.getDayGan();
  const dayZhi = eightChar.getDayZhi();
  const hourGan = eightChar.getTimeGan();
  const hourZhi = eightChar.getTimeZhi();

  // 自動統計八字 8 個字的五行數量 (4 天干 + 4 地支)
  const allChars = [yearGan, yearZhi, monthGan, monthZhi, dayGan, dayZhi, hourGan, hourZhi];
  const wuxingCounts = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };

  allChars.forEach((char) => {
    const wx = GAN_WUXING[char] || ZHI_WUXING[char];
    if (wx && wx in wuxingCounts) {
      wuxingCounts[wx] += 1;
    }
  });

  // 整理結果
  const result = {
    solarDate: solar.toString(),
    lunarDate: `${lunar.getYearInGanZhi()}年 ${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
    dayGan: dayGan,
    dayGanWuxing: GAN_WUXING[dayGan] || '木',
    // 在 lib/bazi.js 回傳的 eightChar 物件中，加入 zhiShishen
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

  return result;
}