'use client';

import React, { useState } from 'react';
import { calculateBazi } from '@/lib/bazi';
import { calculateQizheng, QizhengChart, StarPosition } from '@/lib/qizheng';
import QizhengChartSVG from '@/components/QizhengChartSVG';
import {
  ChevronDown,
  Compass,
  Mars,
  Moon,
  PieChart,
  Quote,
  Sparkles,
  TrendingUp,
  User,
  Venus,
  WandSparkles,
  Calendar as CalendarIcon,
  Printer,
  FileDown,
  Clock,
  ArrowRight,
  Home,
  HelpCircle,
  MessageSquare,
  Send,
  CalendarDays,
  Briefcase,
  Heart,
  Star,
  Eye,
  Grid,
} from 'lucide-react';

// 命盤型別定義
export interface BaziResult {
  solarDate: string;
  lunarDate: string;
  trueSolarText?: string;
  dayGan: string;
  dayGanWuxing: string;
  eightChar: {
    year: { gan: string; zhi: string; ganShishen: string; zangGan: string[]; zangGanShishen: string[] };
    month: { gan: string; zhi: string; ganShishen: string; zangGan: string[]; zangGanShishen: string[] };
    day: { gan: string; zhi: string; ganShishen: string; zangGan: string[]; zangGanShishen: string[] };
    hour: { gan: string; zhi: string; ganShishen: string; zangGan: string[]; zangGanShishen: string[] };
  };
  wuxingCounts: { 木: number; 火: number; 土: number; 金: number; 水: number };
  dayyun: Array<{ age: number; ganZhi: string }>;
  occupation?: string;
  maritalStatus?: string;
  birthYear?: number;
  birthMonth?: number;
  birthDay?: number;
  birthHour?: number;
  longitude?: number;
  qizhengData?: QizhengChart;
}

type Element = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

const ELEMENT_LABEL: Record<Element, string> = {
  wood: '木', fire: '火', earth: '土', metal: '金', water: '水',
};

const ELEMENT_STYLE: Record<
  Element,
  { text: string; bg: string; bar: string; dot: string; border: string }
> = {
  wood: { text: 'text-emerald-400', bg: 'bg-emerald-950/40', bar: 'bg-emerald-500', dot: 'bg-emerald-500', border: 'border-emerald-800/60' },
  fire: { text: 'text-red-400', bg: 'bg-red-950/40', bar: 'bg-red-500', dot: 'bg-red-500', border: 'border-red-800/60' },
  earth: { text: 'text-amber-400', bg: 'bg-amber-950/40', bar: 'bg-amber-500', dot: 'bg-amber-500', border: 'border-amber-800/60' },
  metal: { text: 'text-slate-300', bg: 'bg-slate-800/50', bar: 'bg-slate-400', dot: 'bg-slate-400', border: 'border-slate-700/60' },
  water: { text: 'text-blue-400', bg: 'bg-blue-950/40', bar: 'bg-blue-500', dot: 'bg-blue-500', border: 'border-blue-800/60' },
};

const GAN_ELEMENT: Record<string, Element> = {
  甲: 'wood', 乙: 'wood', 丙: 'fire', 丁: 'fire', 戊: 'earth', 己: 'earth',
  庚: 'metal', 辛: 'metal', 壬: 'water', 癸: 'water',
};

const ZHI_ELEMENT: Record<string, Element> = {
  寅: 'wood', 卯: 'wood', 巳: 'fire', 午: 'fire', 辰: 'earth', 戌: 'earth',
  丑: 'earth', 未: 'earth', 申: 'metal', 酉: 'metal', 亥: 'water', 子: 'water',
};

type PillarKey = 'year' | 'month' | 'day' | 'hour';

interface Pillar {
  key: PillarKey;
  label: string;
  sublabel: string;
  heavenlyStem: string;
  heavenlyElement: Element;
  heavenlyTenGod: string;
  earthlyBranch: string;
  earthlyElement: Element;
  earthlyTenGod: string;
  hiddenStems: { char: string; element: Element; god: string }[];
}

interface LuckPeriod {
  age: string;
  year: string;
  stem: string;
  branch: string;
  element: Element;
  current?: boolean;
}

function getYearGanZhi(year: number): string {
  const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const offset = year - 4;
  return `${year} ${stems[(offset % 10 + 10) % 10]}${branches[(offset % 12 + 12) % 12]}年`;
}

function mapBaziToPillars(bazi: BaziResult): Pillar[] {
  const keys: PillarKey[] = ['year', 'month', 'day', 'hour'];
  const labels = ['年柱', '月柱', '日柱', '時柱'];
  const sublabels = ['祖業 · 少年', '父母 · 事業', '自身 · 配偶', '子女 · 晚年'];

  return keys.map((key, i) => {
    const pData = bazi.eightChar[key];
    const hGan = pData.gan;
    const eZhi = pData.zhi;

    const hiddenStems = pData.zangGan.map((char, idx) => ({
      char,
      element: GAN_ELEMENT[char] || 'earth',
      god: pData.zangGanShishen[idx] || '',
    }));

    return {
      key,
      label: labels[i],
      sublabel: sublabels[i],
      heavenlyStem: hGan,
      heavenlyElement: GAN_ELEMENT[hGan] || 'wood',
      heavenlyTenGod: pData.ganShishen,
      earthlyBranch: eZhi,
      earthlyElement: ZHI_ELEMENT[eZhi] || 'wood',
      earthlyTenGod: (pData as any).zhiShishen || hiddenStems[0]?.god || '',
      hiddenStems,
    };
  });
}

function mapBaziToDistribution(wuxingCounts: BaziResult['wuxingCounts']) {
  return [
    { element: 'wood' as Element, value: wuxingCounts.木 || 0 },
    { element: 'fire' as Element, value: wuxingCounts.火 || 0 },
    { element: 'earth' as Element, value: wuxingCounts.土 || 0 },
    { element: 'metal' as Element, value: wuxingCounts.金 || 0 },
    { element: 'water' as Element, value: wuxingCounts.水 || 0 },
  ];
}

function mapBaziToLuck(dayyun: BaziResult['dayyun']): LuckPeriod[] {
  return dayyun.map((item, idx) => {
    const stem = item.ganZhi[0] || '';
    const branch = item.ganZhi[1] || '';
    return {
      age: String(item.age),
      year: `+${item.age}歲`,
      stem,
      branch,
      element: GAN_ELEMENT[stem] || 'earth',
      current: idx === 0,
    };
  });
}

/* ------------------------------------------------------------------ */
/* 視覺震撼：七政四餘圓形天象儀 SVG 組件 (QizhengChartSVG)             */
/* ------------------------------------------------------------------ */

function QizhengChartSVG({ data }: { data: QizhengChart }) {
  const size = 520;
  const center = size / 2;
  const outerR = 230;
  const zodiacR = 185;
  const starBaseR = 135;
  const innerR = 75;

  // 十二黃道宮分區與名稱
  const ZODIAC_SECTORS = [
    { label: '戌 (白羊)', branch: '戌' },
    { label: '酉 (金牛)', branch: '酉' },
    { label: '申 (雙子)', branch: '申' },
    { label: '未 (巨蟹)', branch: '未' },
    { label: '午 (獅子)', branch: '午' },
    { label: '巳 (處女)', branch: '巳' },
    { label: '辰 (天秤)', branch: '辰' },
    { label: '卯 (天蠍)', branch: '卯' },
    { label: '寅 (射手)', branch: '寅' },
    { label: '丑 (摩羯)', branch: '丑' },
    { label: '子 (水瓶)', branch: '子' },
    { label: '亥 (雙魚)', branch: '亥' },
  ];

  // 星曜顏色映射表
  const STAR_COLORS: Record<string, { fill: string; stroke: string; halo: string }> = {
    太陽: { fill: '#fbbf24', stroke: '#f59e0b', halo: 'rgba(251, 191, 36, 0.4)' },
    太陰: { fill: '#e0f2fe', stroke: '#38bdf8', halo: 'rgba(56, 189, 248, 0.4)' },
    木星: { fill: '#34d399', stroke: '#10b981', halo: 'rgba(52, 211, 153, 0.4)' },
    火星: { fill: '#f87171', stroke: '#ef4444', halo: 'rgba(248, 113, 113, 0.4)' },
    土星: { fill: '#fbbf24', stroke: '#d97706', halo: 'rgba(217, 119, 6, 0.4)' },
    金星: { fill: '#f1f5f9', stroke: '#cbd5e1', halo: 'rgba(241, 245, 249, 0.4)' },
    水星: { fill: '#60a5fa', stroke: '#3b82f6', halo: 'rgba(96, 165, 250, 0.4)' },
    羅睺: { fill: '#c084fc', stroke: '#a855f7', halo: 'rgba(192, 132, 252, 0.4)' },
    計都: { fill: '#f472b6', stroke: '#ec4899', halo: 'rgba(244, 114, 182, 0.4)' },
    月孛: { fill: '#38bdf8', stroke: '#0284c7', halo: 'rgba(56, 189, 248, 0.4)' },
    紫氣: { fill: '#a7f3d0', stroke: '#059669', halo: 'rgba(167, 243, 208, 0.4)' },
  };

  // 極座標計算函式 (經度deg 轉 SVG x, y)
  const getCoords = (deg: number, radius: number) => {
    // 0deg 位於正右方，逆時針排列
    const rad = ((deg - 90) * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad),
    };
  };

  // 計算星曜半徑（碰撞退讓演算法）
  const processedStars = data.stars.map((star, idx, arr) => {
    let currentR = starBaseR;
    // 檢查是否有同角度相近的星曜，若有則內縮 radius
    for (let i = 0; i < idx; i++) {
      const diff = Math.abs(star.longitude - arr[i].longitude);
      if (diff < 8 || diff > 352) {
        currentR -= 22;
      }
    }
    const coords = getCoords(star.longitude, currentR);
    return { ...star, x: coords.x, y: coords.y, r: currentR };
  });

  const mingBranch = data.mingGong.slice(0, 1);

  return (
    <div className="relative flex flex-col items-center justify-center rounded-2xl border border-amber-500/30 bg-slate-950 p-4 shadow-2xl overflow-hidden">
      {/* 背景古金星空暈線 */}
      <div className="pointer-events-none absolute size-[480px] rounded-full bg-amber-500/5 blur-[90px]" />

      <div className="relative w-full max-w-[500px] aspect-square flex items-center justify-center">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full select-none">
          <defs>
            {/* 炫彩外環漸層 */}
            <linearGradient id="ringGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>
            
            {/* 核心光芒 Filter */}
            <filter id="starGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 1. 外圍與內圍裝飾同心圓 */}
          <circle cx={center} cy={center} r={outerR + 12} stroke="url(#ringGold)" strokeWidth="1" strokeDasharray="3, 5" opacity="0.4" fill="none" />
          <circle cx={center} cy={center} r={outerR} stroke="url(#ringGold)" strokeWidth="2" fill="none" opacity="0.8" />
          <circle cx={center} cy={center} r={zodiacR} stroke="url(#ringGold)" strokeWidth="1" strokeDasharray="2, 4" fill="none" opacity="0.5" />
          <circle cx={center} cy={center} r={innerR} stroke="url(#ringGold)" strokeWidth="1.5" fill="#020617" opacity="0.9" />

          {/* 2. 十二黃道宮位分割線與標籤 */}
          {ZODIAC_SECTORS.map((sector, i) => {
            const startDeg = i * 30;
            const midDeg = startDeg + 15;
            const linePos = getCoords(startDeg, outerR);
            const labelPos = getCoords(midDeg, (outerR + zodiacR) / 2);
            const isMingGongSector = sector.branch === mingBranch;

            // 命宮高亮扇形 (如果該宮位為立命宮)
            const p1 = getCoords(startDeg, innerR);
            const p2 = getCoords(startDeg, outerR);
            const p3 = getCoords(startDeg + 30, outerR);
            const p4 = getCoords(startDeg + 30, innerR);
            const pathD = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} A ${outerR} ${outerR} 0 0 1 ${p3.x} ${p3.y} L ${p4.x} ${p4.y} A ${innerR} ${innerR} 0 0 0 ${p1.x} ${p1.y} Z`;

            return (
              <g key={i}>
                {/* 命宮高亮金色區域 */}
                {isMingGongSector && (
                  <path d={pathD} fill="#f59e0b" opacity="0.15" />
                )}

                {/* 輻射分割線 */}
                <line x1={center} y1={center} x2={linePos.x} y2={linePos.y} stroke="#78350f" strokeWidth="1" opacity="0.3" />

                {/* 十二宮文字 */}
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={isMingGongSector ? '#fef3c7' : '#94a3b8'}
                  fontSize={isMingGongSector ? '11' : '10'}
                  fontWeight={isMingGongSector ? 'bold' : 'normal'}
                  fontFamily="serif"
                >
                  {sector.branch}
                </text>
              </g>
            );
          })}

          {/* 3. 繪製七政四餘星曜點位與線條 */}
          {processedStars.map((star) => {
            const style = STAR_COLORS[star.name] || { fill: '#e2e8f0', stroke: '#94a3b8', halo: 'rgba(226, 232, 240, 0.3)' };
            const lineToCenter = getCoords(star.longitude, innerR);

            return (
              <g key={star.name} className="group cursor-pointer">
                {/* 星曜至圓心虛線 */}
                <line
                  x1={lineToCenter.x}
                  y1={lineToCenter.y}
                  x2={star.x}
                  y2={star.y}
                  stroke={style.stroke}
                  strokeWidth="1"
                  strokeDasharray="2, 3"
                  opacity="0.4"
                />

                {/* 星曜外圍擴散光暈 */}
                <circle cx={star.x} cy={star.y} r="10" fill={style.halo} filter="url(#starGlow)" />

                {/* 星曜實體圓點 */}
                <circle
                  cx={star.x}
                  cy={star.y}
                  r="4"
                  fill={style.fill}
                  stroke={style.stroke}
                  strokeWidth="1.5"
                  className="transition-transform duration-300 group-hover:scale-150"
                />

                {/* 星曜名稱標籤 */}
                <text
                  x={star.x}
                  y={star.y - 10}
                  textAnchor="middle"
                  fill="#f8fafc"
                  fontSize="10"
                  fontWeight="bold"
                  fontFamily="serif"
                  className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                >
                  {star.name}
                  {star.isRetrograde ? '⟲' : ''}
                </text>
              </g>
            );
          })}

          {/* 4. 圓心標示與命宮資訊 */}
          <g transform={`translate(${center}, ${center})`}>
            <circle cx="0" cy="0" r="32" fill="#020617" stroke="url(#ringGold)" strokeWidth="1" />
            <text x="0" y="-6" textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="bold" fontFamily="serif">
              {data.mingGong.split(' ')[0]}
            </text>
            <text x="0" y="10" textAnchor="middle" fill="#38bdf8" fontSize="9" fontFamily="serif">
              {data.shenGong.split(' ')[0]}
            </text>
          </g>
        </svg>
      </div>

      {/* 底部分類圖例 */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-400">
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-amber-400" /> 太陽/土星</span>
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-sky-300" /> 太陰/月孛</span>
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-400" /> 木星/紫氣</span>
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-red-400" /> 火星</span>
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-purple-400" /> 羅睺/計都</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 首頁 Landing Page 組件                                              */
/* ------------------------------------------------------------------ */

function LandingPage({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-slate-950 text-slate-100 selection:bg-amber-500/30 selection:text-amber-200">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-slate-950/80 to-slate-950" />
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 size-[650px] rounded-full bg-amber-500/10 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 -translate-x-1/2 size-[550px] rounded-full bg-blue-600/10 blur-[130px]" />

      <div className="relative z-10 flex max-w-4xl flex-col items-center px-6 py-12 text-center">
        <div className="relative mb-10 flex items-center justify-center">
          <div className="absolute size-80 animate-[spin_80s_linear_infinite] rounded-full border border-amber-500/15 sm:size-[380px]" />
          <div className="absolute size-72 animate-[spin_50s_linear_infinite_reverse] rounded-full border border-dashed border-amber-400/25 sm:size-80" />

          <div className="relative flex size-52 sm:size-64 items-center justify-center rounded-full bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 p-3 shadow-[0_0_50px_rgba(245,158,11,0.25)] border border-amber-500/50 backdrop-blur-xl">
            <svg className="size-full text-amber-400" viewBox="0 0 200 200" fill="none">
              <defs>
                <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fef3c7" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#b45309" />
                </linearGradient>
              </defs>
              <circle cx="100" cy="100" r="92" stroke="url(#goldGrad)" strokeWidth="1" strokeDasharray="1.5, 4.5" />
              <circle cx="100" cy="100" r="86" stroke="url(#goldGrad)" strokeWidth="1.5" strokeOpacity="0.7" />
              <circle cx="100" cy="100" r="48" fill="#020617" />
              <path d="M 100 52 A 48 48 0 0 1 100 148 A 24 24 0 0 1 100 100 A 24 24 0 0 0 100 52 Z" fill="url(#goldGrad)" />
              <circle cx="100" cy="76" r="5.5" fill="#020617" />
              <circle cx="100" cy="124" r="5.5" fill="url(#goldGrad)" />
            </svg>
          </div>
        </div>

        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-medium tracking-widest text-amber-300 backdrop-blur">
          <Sparkles className="size-3.5 text-amber-400" />
          星平合參 (子平八字 + 七政四餘) · 多模型 AI 聯合會診
        </div>

        <h1 className="mb-4 font-serif text-5xl font-medium tracking-tight text-slate-100 sm:text-7xl">
          <span className="bg-gradient-to-r from-amber-100 via-amber-300 to-amber-500 bg-clip-text text-transparent">
            算命網
          </span>
        </h1>

        <p className="max-w-2xl font-serif text-lg leading-relaxed text-amber-200/90 sm:text-xl">
          「天地玄黃，星平合參；四柱藏通變，七政定吉凶。」
        </p>

        <div className="mt-10">
          <button
            type="button"
            onClick={onEnter}
            className="group relative inline-flex items-center gap-3 overflow-hidden rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 px-9 py-4 font-serif text-lg font-semibold text-slate-950 shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <span>進入星平命盤排盤</span>
            <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 表單組件                                                            */
/* ------------------------------------------------------------------ */

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}

function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  return (
    <label className="flex flex-col gap-1.5 w-full">
      <span className="text-xs font-medium text-slate-400">{label}</span>
      <div className="relative w-full">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 pr-8 text-sm text-slate-100 outline-none focus:border-amber-500/80"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-slate-900 text-slate-200">
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
      </div>
    </label>
  );
}

const range = (start: number, end: number, suffix: string) =>
  Array.from({ length: end - start + 1 }, (_, i) => {
    const n = start + i;
    return { value: String(n), label: `${n}${suffix}` };
  });

const LOCATION_OPTIONS = [
  { value: '114.17', label: '香港 (東經 114.17°)' },
  { value: '113.54', label: '澳門 (東經 113.54°)' },
  { value: '121.50', label: '台北 (東經 121.50°)' },
  { value: '116.40', label: '北京 (東經 116.40°)' },
  { value: '121.47', label: '上海 (東經 121.47°)' },
  { value: '113.26', label: '廣州 (東經 113.26°)' },
  { value: '114.05', label: '深圳 (東經 114.05°)' },
  { value: '103.81', label: '新加坡 (東經 103.81°)' },
];

const MARITAL_OPTIONS = [
  { value: '單身未婚', label: '單身未婚' },
  { value: '有穩定伴侶（未婚）', label: '有穩定伴侶（未婚）' },
  { value: '已婚', label: '已婚' },
  { value: '離異', label: '離異' },
  { value: '喪偶', label: '喪偶' },
];

function BaziForm({
  onSubmit,
  loading,
}: {
  onSubmit: (formData: any) => void;
  loading: boolean;
}) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [calendar, setCalendar] = useState<'solar' | 'lunar'>('solar');
  const [trueSolar, setTrueSolar] = useState('on');
  const [longitude, setLongitude] = useState('114.17');
  const [year, setYear] = useState('1995');
  const [month, setMonth] = useState('8');
  const [day, setDay] = useState('15');
  const [hour, setHour] = useState('14');
  const [minute, setMinute] = useState('0');
  const [occupation, setOccupation] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('單身未婚');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name, year, month, day, hour, minute, gender, calendar, trueSolar, longitude, occupation: occupation.trim(), maritalStatus,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-full rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl sm:p-6 backdrop-blur print:hidden">
      <div className="mb-5 flex items-center gap-2">
        <span className="inline-flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
          <User className="size-4" />
        </span>
        <div>
          <h2 className="font-serif text-lg font-medium text-slate-100">命主資料</h2>
          <p className="text-xs text-slate-400">填寫出生資訊與背景以生成八字與七政星盤</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 w-full">
          <span className="text-xs font-medium text-slate-400">姓名</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="請輸入姓名"
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500/80"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-400">性別</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setGender('male')}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-all ${
                gender === 'male' ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold' : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}
            >
              <Mars className="size-4" /> 乾造 · 男
            </button>

            <button
              type="button"
              onClick={() => setGender('female')}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-all ${
                gender === 'female' ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold' : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}
            >
              <Venus className="size-4" /> 坤造 · 女
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <SelectField label="出生年" value={year} onChange={setYear} options={range(1940, 2026, '年')} />
          <SelectField label="出生月" value={month} onChange={setMonth} options={range(1, 12, '月')} />
          <SelectField label="出生日" value={day} onChange={setDay} options={range(1, 31, '日')} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <SelectField
            label="出生小時"
            value={hour}
            onChange={setHour}
            options={Array.from({ length: 24 }, (_, i) => ({ value: String(i), label: `${String(i).padStart(2, '0')} 時` }))}
          />
          <SelectField
            label="出生分鐘"
            value={minute}
            onChange={setMinute}
            options={Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: `${String(i).padStart(2, '0')} 分` }))}
          />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 w-full">
            <span className="text-xs font-medium text-slate-400">現時職業（選填）</span>
            <input
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="例如：IT、金融、創業..."
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500/80"
            />
          </label>

          <SelectField label="感情/婚姻狀態" value={maritalStatus} onChange={setMaritalStatus} options={MARITAL_OPTIONS} />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <SelectField label="真太陽時校正" value={trueSolar} onChange={setTrueSolar} options={[{ value: 'on', label: '開啟真太陽時' }, { value: 'off', label: '關閉' }]} />
          {trueSolar === 'on' && <SelectField label="出生經度" value={longitude} onChange={setLongitude} options={LOCATION_OPTIONS} />}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 text-sm font-medium text-slate-950 shadow-lg transition-all hover:bg-amber-400 disabled:opacity-70"
        >
          <Sparkles className="size-4" />
          {loading ? '星平合參排盤中…' : '星平合參排盤與 AI 會診'}
        </button>
      </div>
    </form>
  );
}

function GlyphBlock({ char, element, caption }: { char: string; element: Element; caption: string }) {
  const s = ELEMENT_STYLE[element];
  return (
    <div className={`flex flex-col items-center justify-center gap-0.5 rounded-xl border ${s.border} ${s.bg} px-1 py-1.5 sm:px-2 sm:py-2.5 shrink-0`}>
      <span className={`font-serif text-xl sm:text-3xl font-bold leading-none ${s.text}`}>{char}</span>
      <span className={`text-[9px] sm:text-[10px] font-medium ${s.text}`}>{caption}{ELEMENT_LABEL[element]}</span>
    </div>
  );
}

function FourPillars({ pillars, trueSolarText }: { pillars: Pillar[]; trueSolarText?: string }) {
  return (
    <section className="flex flex-col gap-3 w-full overflow-hidden">
      {trueSolarText && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-300">
          <Clock className="size-4 shrink-0 text-amber-400" />
          <span>{trueSolarText}</span>
        </div>
      )}

      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-lg sm:text-xl font-medium text-slate-100">四柱八字 · 藏干十神</h2>
        <span className="text-[11px] sm:text-xs text-slate-400">（右起：年柱 ➔ 月柱 ➔ 日柱 ➔ 時柱）</span>
      </div>

      <div className="w-full overflow-x-auto pb-2 -mx-1 px-1">
        <div className="flex min-w-[560px] sm:min-w-0 flex-row-reverse gap-2 sm:gap-3 items-stretch">
          {pillars.map((p) => {
            const isDay = p.key === 'day';
            const slots = [...p.hiddenStems];
            while (slots.length < 3) slots.push({ char: '', element: 'earth', god: '' });

            return (
              <article
                key={p.key}
                className={`flex flex-1 flex-col items-stretch rounded-2xl border bg-slate-900/90 p-2 sm:p-3.5 shadow-xl ${
                  isDay ? 'border-amber-500/80 ring-1 ring-amber-500/30' : 'border-slate-800'
                }`}
              >
                <header className="mb-2 flex h-6 sm:h-7 items-center justify-between border-b border-slate-800/80 pb-1.5 shrink-0">
                  <h3 className="font-serif text-sm sm:text-base font-bold text-slate-100">{p.label}</h3>
                  <span className="text-[9px] sm:text-[10px] text-slate-400">{p.sublabel}</span>
                </header>

                <div className="flex flex-col gap-1.5 sm:gap-2 shrink-0">
                  <div className="relative shrink-0">
                    <GlyphBlock char={p.heavenlyStem} element={p.heavenlyElement} caption="天干 · " />
                    <span className="absolute top-1 right-1 rounded bg-slate-950/80 px-1 py-0.5 text-[9px] text-amber-400 border border-amber-500/30">
                      {p.heavenlyTenGod}
                    </span>
                  </div>

                  <div className="relative shrink-0">
                    <GlyphBlock char={p.earthlyBranch} element={p.earthlyElement} caption="地支 · " />
                    <span className="absolute top-1 right-1 rounded bg-slate-950/80 px-1 py-0.5 text-[9px] text-slate-300 border border-slate-700/50">
                      {p.earthlyTenGod}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 七政四餘視覺化容器 (支援 SVG 渾天星盤與 12宮位切換)                */
/* ------------------------------------------------------------------ */

function QizhengSection({ data }: { data: QizhengChart }) {
  const [viewMode, setViewMode] = useState<'svg' | 'grid'>('svg');

  return (
    <section className="rounded-2xl border border-amber-500/30 bg-slate-900/90 p-5 shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-6 items-center justify-center rounded-md bg-amber-500/20 text-amber-400">
            <Star className="size-4" />
          </span>
          <h3 className="font-serif text-base font-medium text-slate-100">七政四餘天象星盤 (星平合參)</h3>
        </div>

        {/* 視角切換按鈕 */}
        <div className="flex items-center gap-1 rounded-lg bg-slate-950 p-1 border border-slate-800">
          <button
            type="button"
            onClick={() => setViewMode('svg')}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              viewMode === 'svg' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="size-3.5" /> 渾天星盤
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              viewMode === 'grid' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid className="size-3.5" /> 十二宮格
          </button>
        </div>
      </div>

      {viewMode === 'svg' ? (
        <QizhengChartSVG data={data} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {data.houses.map((house, idx) => (
            <div key={idx} className="border border-slate-800 bg-slate-950/60 p-2.5 rounded-xl flex flex-col justify-between min-h-[85px]">
              <div className="flex justify-between items-center font-bold">
                <span className={house.name === '命宮' ? 'text-amber-300 font-extrabold' : 'text-slate-200'}>{house.name}</span>
                <span className="text-slate-500 text-[10px]">{house.zodiac}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {house.stars.length > 0 ? (
                  house.stars.map((star) => (
                    <span key={star} className="bg-amber-500/10 text-amber-300 border border-amber-500/20 px-1.5 py-0.5 rounded text-[10px]">
                      {star}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-600 text-[10px]">無主星</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function PillarDetails({ distribution, luck }: { distribution: any[]; luck: LuckPeriod[] }) {
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
        <h3 className="mb-3 font-serif text-base font-medium text-slate-100 flex items-center gap-2">
          <PieChart className="size-4 text-slate-400" /> 五行分佈
        </h3>
        <div className="flex flex-col gap-2.5">
          {distribution.map((d) => {
            const s = ELEMENT_STYLE[d.element as Element];
            return (
              <div key={d.element} className="flex items-center gap-2.5">
                <span className={`inline-flex size-6 items-center justify-center rounded border ${s.border} ${s.bg} text-xs ${s.text}`}>
                  {ELEMENT_LABEL[d.element as Element]}
                </span>
                <div className="h-2 flex-1 rounded-full bg-slate-950 overflow-hidden">
                  <div className={`h-full ${s.bar}`} style={{ width: `${d.value * 20}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
        <h3 className="mb-3 font-serif text-base font-medium text-slate-100 flex items-center gap-2">
          <TrendingUp className="size-4 text-slate-400" /> 大運走勢
        </h3>
        <div className="overflow-x-auto pb-1">
          <ol className="flex gap-2">
            {luck.map((p) => (
              <li key={p.age} className="flex flex-col items-center gap-1">
                <div className={`w-16 rounded-xl border p-2 text-center ${p.current ? 'border-amber-500 bg-amber-500/10' : 'border-slate-800 bg-slate-950'}`}>
                  <div className="font-serif text-base font-medium text-amber-300">{p.stem}{p.branch}</div>
                  <span className="text-[10px] text-slate-400">{p.age} 歲</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}

function AiAnalysis({ baziData, userNotes }: { baziData: BaziResult | null; userNotes: string }) {
  const [activeTab, setActiveTab] = useState<'deep' | 'yearly' | 'yearly_qa'>('deep');
  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!baziData) return;
    setLoading(true);
    setReport('');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeTab, baziData, userNotes }),
      });
      const data = await res.json();
      setReport(data.result || '無法生成報告。');
    } catch {
      setReport('請求發送失敗。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-amber-500/30 bg-slate-900/90 p-5 shadow-xl">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-amber-400">
        <Sparkles className="size-4" />
        <h2 className="font-serif text-lg font-bold text-slate-100">AI 星平合參會診中心</h2>
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="mt-4 w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-60"
      >
        {loading ? 'AI 多模型會診中…' : '生成 AI 星平合參解盤報告'}
      </button>

      {report && (
        <div className="mt-4 rounded-xl bg-slate-950/70 border border-slate-800 p-4 text-sm text-slate-200 whitespace-pre-line leading-relaxed">
          {report}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 主頁面                                                              */
/* ------------------------------------------------------------------ */

export default function Page() {
  const [hasEntered, setHasEntered] = useState(false);
  const [baziData, setBaziData] = useState<BaziResult | null>(null);
  const [userNotes, setUserNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFormSubmit = (formData: any) => {
    setLoading(true);
    setTimeout(() => {
      const result = calculateBazi(
        Number(formData.year), Number(formData.month), Number(formData.day), Number(formData.hour),
        formData.gender, Number(formData.minute), formData.trueSolar === 'on', Number(formData.longitude)
      );

      const qizheng = calculateQizheng(
        Number(formData.year), Number(formData.month), Number(formData.day), Number(formData.hour), Number(formData.longitude)
      );

      setBaziData({
        ...result,
        birthYear: Number(formData.year), birthMonth: Number(formData.month), birthDay: Number(formData.day), birthHour: Number(formData.hour),
        longitude: Number(formData.longitude), occupation: formData.occupation, maritalStatus: formData.maritalStatus, qizhengData: qizheng,
      });
      setLoading(false);
    }, 300);
  };

  if (!hasEntered) return <LandingPage onEnter={() => setHasEntered(true)} />;

  const pillars = baziData ? mapBaziToPillars(baziData) : [];
  const distribution = baziData ? mapBaziToDistribution(baziData.wuxingCounts) : [];
  const luck = baziData ? mapBaziToLuck(baziData.dayyun) : [];

  return (
    <main className="min-h-screen w-full bg-slate-950 text-slate-100 selection:bg-amber-500/30">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-6 flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Compass className="size-5" />
            </span>
            <div>
              <h1 className="font-serif text-xl font-medium text-slate-100">算命網</h1>
              <p className="text-[10px] text-slate-400">星平合參 (子平八字 + 七政四餘) · AI 會診</p>
            </div>
          </div>
          <button type="button" onClick={() => setHasEntered(false)} className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300">
            回首頁
          </button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <BaziForm onSubmit={handleFormSubmit} loading={loading} />

          <div className="flex flex-col gap-5">
            {baziData ? (
              <>
                <FourPillars pillars={pillars} trueSolarText={baziData.trueSolarText} />
                {baziData.qizhengData && <QizhengSection data={baziData.qizhengData} />}
                <PillarDetails distribution={distribution} luck={luck} />
                <AiAnalysis baziData={baziData} userNotes={userNotes} />
              </>
            ) : (
              <div className="flex h-[380px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-800 text-center">
                <Moon className="size-6 text-slate-500" />
                <p className="text-sm font-medium text-slate-300">等待排盤</p>
                <p className="text-xs text-slate-500">填寫左側資料並點擊排盤以呈現星平命盤。</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}