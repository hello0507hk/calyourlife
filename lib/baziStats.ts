export type WuxingName = '木' | '火' | '土' | '金' | '水';

export const WUXING_ORDER: WuxingName[] = ['木', '火', '土', '金', '水'];

const GAN_WUXING: Record<string, WuxingName> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

const GENERATES: Record<WuxingName, WuxingName> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };

// 藏干依序加權：本氣 1、次位 0.5、末位 0.3；月令地支再乘 1.5
const HIDDEN_WEIGHTS = [1, 0.5, 0.3];
const MONTH_BRANCH_FACTOR = 1.5;

export const TEN_GOD_GROUPS = [
  { name: '比劫', gods: ['比肩', '劫財'] },
  { name: '食傷', gods: ['食神', '傷官'] },
  { name: '財星', gods: ['正財', '偏財'] },
  { name: '官殺', gods: ['正官', '七殺'] },
  { name: '印星', gods: ['正印', '偏印'] },
] as const;

interface PillarData {
  gan: string;
  ganShishen: string;
  zangGan: string[];
  zangGanShishen: string[];
}

export interface BaziStats {
  wuxing: Record<WuxingName, number>;
  tenGods: Record<string, number>;
  dayElement: WuxingName;
  /** 比劫 + 印星（生扶日主）佔全局加權比例，0–1 */
  supportRatio: number;
}

const round = (n: number) => Math.round(n * 10) / 10;

export function computeBaziStats(eightChar: Record<'year' | 'month' | 'day' | 'hour', PillarData>, dayGan: string): BaziStats {
  const wuxing: Record<WuxingName, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  const tenGods: Record<string, number> = {};
  const add = (gan: string, god: string | undefined, w: number) => {
    const el = GAN_WUXING[gan];
    if (el) wuxing[el] += w;
    if (god && god !== '日主') tenGods[god] = (tenGods[god] || 0) + w;
  };

  (['year', 'month', 'day', 'hour'] as const).forEach((key) => {
    const p = eightChar[key];
    add(p.gan, key === 'day' ? undefined : p.ganShishen, 1);
    const factor = key === 'month' ? MONTH_BRANCH_FACTOR : 1;
    p.zangGan.forEach((g, i) => add(g, p.zangGanShishen[i], (HIDDEN_WEIGHTS[i] ?? 0.3) * factor));
  });

  const dayElement = GAN_WUXING[dayGan] || '木';
  const resource = WUXING_ORDER.find((el) => GENERATES[el] === dayElement)!;
  const total = WUXING_ORDER.reduce((s, el) => s + wuxing[el], 0) || 1;

  WUXING_ORDER.forEach((el) => (wuxing[el] = round(wuxing[el])));
  Object.keys(tenGods).forEach((k) => (tenGods[k] = round(tenGods[k])));

  return {
    wuxing,
    tenGods,
    dayElement,
    supportRatio: (wuxing[dayElement] + wuxing[resource]) / total,
  };
}
