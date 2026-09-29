'use client';

import React, { useState } from 'react';
import { calculateBazi } from '@/lib/bazi';
import {
  ChevronDown,
  Compass,
  Layers,
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
} from 'lucide-react';

// 補足命盤型別定義
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
}

/* ------------------------------------------------------------------ */
/* 五行深色主題樣式設定                                                 */
/* ------------------------------------------------------------------ */

type Element = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

const ELEMENT_LABEL: Record<Element, string> = {
  wood: '木',
  fire: '火',
  earth: '土',
  metal: '金',
  water: '水',
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
  甲: 'wood', 乙: 'wood',
  丙: 'fire', 丁: 'fire',
  戊: 'earth', 己: 'earth',
  庚: 'metal', 辛: 'metal',
  壬: 'water', 癸: 'water',
};

const ZHI_ELEMENT: Record<string, Element> = {
  寅: 'wood', 卯: 'wood',
  巳: 'fire', 午: 'fire',
  辰: 'earth', 戌: 'earth', 丑: 'earth', 未: 'earth',
  申: 'metal', 酉: 'metal',
  亥: 'water', 子: 'water',
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
/* 首頁 Landing Page 組件                                              */
/* ------------------------------------------------------------------ */

function LandingPage({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-slate-950 text-slate-100 selection:bg-amber-500/30 selection:text-amber-200">
      {/* 背景深邃光暈裝飾 */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-slate-950/80 to-slate-950" />
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 size-[650px] rounded-full bg-amber-500/10 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 -translate-x-1/2 size-[550px] rounded-full bg-blue-600/10 blur-[130px]" />

      {/* 主內容區塊 */}
      <div className="relative z-10 flex max-w-4xl flex-col items-center px-6 py-12 text-center">
        
        {/* 玄學意境圖形 (八卦羅盤太極徽標) */}
        <div className="relative mb-10 flex items-center justify-center">
          <div className="absolute size-80 animate-[spin_80s_linear_infinite] rounded-full border border-amber-500/15 sm:size-[380px]" />
          <div className="absolute size-72 animate-[spin_50s_linear_infinite_reverse] rounded-full border border-dashed border-amber-400/25 sm:size-80" />
          <div className="absolute size-60 animate-[ping_4s_cubic-bezier(0,0,0.2,1)_infinite] rounded-full border border-amber-500/10" />

          {/* 羅盤核心徽標 */}
          <div className="relative flex size-52 sm:size-64 items-center justify-center rounded-full bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 p-3 shadow-[0_0_50px_rgba(245,158,11,0.25)] border border-amber-500/50 backdrop-blur-xl">
            <svg className="size-full text-amber-400" viewBox="0 0 200 200" fill="none">
              <defs>
                <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fef3c7" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#b45309" />
                </linearGradient>
                
                <radialGradient id="glowPool" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </radialGradient>

                <g id="yang">
                  <rect x="-14" y="-2" width="28" height="3.5" rx="1" fill="url(#goldGrad)" />
                </g>
                <g id="yin">
                  <rect x="-14" y="-2" width="12" height="3.5" rx="1" fill="url(#goldGrad)" />
                  <rect x="2" y="-2" width="12" height="3.5" rx="1" fill="url(#goldGrad)" />
                </g>
              </defs>

              <circle cx="100" cy="100" r="95" fill="url(#glowPool)" />
              <circle cx="100" cy="100" r="92" stroke="url(#goldGrad)" strokeWidth="1" strokeOpacity="0.4" strokeDasharray="1.5, 4.5" />
              <circle cx="100" cy="100" r="86" stroke="url(#goldGrad)" strokeWidth="1.5" strokeOpacity="0.7" />

              <text x="100" y="21" textAnchor="middle" fill="url(#goldGrad)" fontSize="8.5" fontFamily="serif" fontWeight="bold" letterSpacing="1">天 · 乾</text>
              <text x="100" y="186" textAnchor="middle" fill="url(#goldGrad)" fontSize="8.5" fontFamily="serif" fontWeight="bold" letterSpacing="1">地 · 坤</text>
              <text x="17" y="103" textAnchor="middle" fill="url(#goldGrad)" fontSize="8.5" fontFamily="serif" fontWeight="bold">離</text>
              <text x="183" y="103" textAnchor="middle" fill="url(#goldGrad)" fontSize="8.5" fontFamily="serif" fontWeight="bold">坎</text>

              {/* 八卦爻象 */}
              <g transform="translate(100, 31)"><use href="#yang" y="-6" /><use href="#yang" y="0" /><use href="#yang" y="6" /></g>
              <g transform="translate(100, 100) rotate(45) translate(0, -69)"><use href="#yin" y="-6" /><use href="#yang" y="0" /><use href="#yang" y="6" /></g>
              <g transform="translate(100, 100) rotate(90) translate(0, -69)"><use href="#yang" y="-6" /><use href="#yin" y="0" /><use href="#yang" y="6" /></g>
              <g transform="translate(100, 100) rotate(135) translate(0, -69)"><use href="#yin" y="-6" /><use href="#yin" y="0" /><use href="#yang" y="6" /></g>
              <g transform="translate(100, 100) rotate(180) translate(0, -69)"><use href="#yin" y="-6" /><use href="#yin" y="0" /><use href="#yin" y="6" /></g>
              <g transform="translate(100, 100) rotate(225) translate(0, -69)"><use href="#yang" y="-6" /><use href="#yang" y="0" /><use href="#yin" y="6" /></g>
              <g transform="translate(100, 100) rotate(270) translate(0, -69)"><use href="#yin" y="-6" /><use href="#yang" y="0" /><use href="#yin" y="6" /></g>
              <g transform="translate(100, 100) rotate(315) translate(0, -69)"><use href="#yang" y="-6" /><use href="#yin" y="0" /><use href="#yin" y="6" /></g>

              <circle cx="100" cy="100" r="54" stroke="url(#goldGrad)" strokeWidth="1" opacity="0.6" />
              <circle cx="100" cy="100" r="50" stroke="url(#goldGrad)" strokeWidth="1.5" />

              <g>
                <circle cx="100" cy="100" r="48" fill="#020617" />
                <path d="M 100 52 A 48 48 0 0 1 100 148 A 24 24 0 0 1 100 100 A 24 24 0 0 0 100 52 Z" fill="url(#goldGrad)" />
                <circle cx="100" cy="76" r="5.5" fill="#020617" />
                <circle cx="100" cy="124" r="5.5" fill="url(#goldGrad)" />
              </g>
            </svg>
          </div>
        </div>

        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-medium tracking-widest text-amber-300 backdrop-blur">
          <Sparkles className="size-3.5 text-amber-400" />
          正宗子平八字 · 天文真太陽時 · 多模型 AI 聯合會診
        </div>

        <h1 className="mb-4 font-serif text-5xl font-medium tracking-tight text-slate-100 sm:text-7xl">
          <span className="bg-gradient-to-r from-amber-100 via-amber-300 to-amber-500 bg-clip-text text-transparent">
            算命網
          </span>
        </h1>

        <p className="max-w-2xl font-serif text-lg leading-relaxed text-amber-200/90 sm:text-xl">
          「天地玄黃，陰陽相生；四柱八字，藏一生通變之理。」
        </p>

        <p className="mt-4 max-w-xl font-serif text-xs leading-relaxed text-slate-400 sm:text-sm">
          洞察天干地支之生克，推演五行旺衰與大運走勢。
          深得《滴天髓》、《造化元鑰》、《神峰通考》與《子平一得》之真傳，
          知命順勢，趨吉避凶。
        </p>

        <div className="mt-10">
          <button
            type="button"
            onClick={onEnter}
            className="group relative inline-flex items-center gap-3 overflow-hidden rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 px-9 py-4 font-serif text-lg font-semibold text-slate-950 shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_45px_rgba(245,158,11,0.5)] active:scale-95"
          >
            <span>進入命盤排盤</span>
            <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><Compass className="size-3.5 text-amber-500/70" /> 子平正宗排盤</span>
          <span>•</span>
          <span className="flex items-center gap-1.5"><Clock className="size-3.5 text-amber-500/70" /> 經度與天文均時差校正</span>
          <span>•</span>
          <span className="flex items-center gap-1.5"><WandSparkles className="size-3.5 text-amber-500/70" /> Gemini / DeepSeek / Qwen / Grok 四 AI 會診</span>
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
          className="w-full appearance-none rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 pr-8 text-sm text-slate-100 outline-none transition-colors focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/40"
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

function BaziForm({
  onSubmit,
  loading,
}: {
  onSubmit: (formData: {
    name: string;
    year: string;
    month: string;
    day: string;
    hour: string;
    minute: string;
    gender: 'male' | 'female';
    calendar: 'solar' | 'lunar';
    trueSolar: string;
    longitude: string;
    userNotes: string;
  }) => void;
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
  const [userNotes, setUserNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      year,
      month,
      day,
      hour,
      minute,
      gender,
      calendar,
      trueSolar,
      longitude,
      userNotes: userNotes.trim(),
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
          <p className="text-xs text-slate-400">填寫出生資訊以生成命盤</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* 姓名 */}
        <label className="flex flex-col gap-1.5 w-full">
          <span className="text-xs font-medium text-slate-400">姓名</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="請輸入姓名"
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/40"
          />
        </label>

        {/* 性別切換 */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-400">性別</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setGender('male')}
              style={{
                backgroundColor: gender === 'male' ? '#f59e0b' : '#020617',
                color: gender === 'male' ? '#000000' : '#94a3b8',
                borderColor: gender === 'male' ? '#fcd34d' : '#1e293b',
                fontWeight: gender === 'male' ? '700' : '400',
              }}
              className="flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-all"
            >
              <Mars className="size-4" />
              <span>乾造 · 男</span>
              {gender === 'male' && <span className="text-black font-extrabold ml-0.5">✓</span>}
            </button>

            <button
              type="button"
              onClick={() => setGender('female')}
              style={{
                backgroundColor: gender === 'female' ? '#f59e0b' : '#020617',
                color: gender === 'female' ? '#000000' : '#94a3b8',
                borderColor: gender === 'female' ? '#fcd34d' : '#1e293b',
                fontWeight: gender === 'female' ? '700' : '400',
              }}
              className="flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-all"
            >
              <Venus className="size-4" />
              <span>坤造 · 女</span>
              {gender === 'female' && <span className="text-black font-extrabold ml-0.5">✓</span>}
            </button>
          </div>
        </div>

        {/* 曆法切換 */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-400">曆法</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setCalendar('solar')}
              className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-colors ${
                calendar === 'solar'
                  ? 'border-amber-500/80 bg-amber-500/10 text-amber-300 font-medium'
                  : 'border-slate-800 bg-slate-950 text-slate-400'
              }`}
            >
              <CalendarIcon className="size-3.5" />
              公曆 (陽曆)
            </button>
            <button
              type="button"
              onClick={() => setCalendar('lunar')}
              className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-colors ${
                calendar === 'lunar'
                  ? 'border-amber-500/80 bg-amber-500/10 text-amber-300 font-medium'
                  : 'border-slate-800 bg-slate-950 text-slate-400'
              }`}
            >
              <Moon className="size-3.5" />
              農曆 (陰曆)
            </button>
          </div>
        </div>

        {/* 出生日期：年/月/日 */}
        <div className="grid grid-cols-3 gap-2">
          <SelectField label="出生年" value={year} onChange={setYear} options={range(1940, 2026, '年')} />
          <SelectField label="出生月" value={month} onChange={setMonth} options={range(1, 12, '月')} />
          <SelectField label="出生日" value={day} onChange={setDay} options={range(1, 31, '日')} />
        </div>

        {/* 出生真實時間：小時與分鐘 */}
        <div className="grid grid-cols-2 gap-2">
          <SelectField
            label="出生小時 (真實鐘表時)"
            value={hour}
            onChange={setHour}
            options={Array.from({ length: 24 }, (_, i) => ({
              value: String(i),
              label: `${String(i).padStart(2, '0')} 時`,
            }))}
          />
          <SelectField
            label="出生分鐘"
            value={minute}
            onChange={setMinute}
            options={Array.from({ length: 60 }, (_, i) => ({
              value: String(i),
              label: `${String(i).padStart(2, '0')} 分`,
            }))}
          />
        </div>

        {/* 真太陽時校正與經度選單 */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <SelectField
            label="真太陽時校正"
            value={trueSolar}
            onChange={setTrueSolar}
            options={[
              { value: 'on', label: '開啟真太陽時' },
              { value: 'off', label: '關閉 (平太陽時)' },
            ]}
          />
          {trueSolar === 'on' && (
            <SelectField
              label="出生地區 (經度時差)"
              value={longitude}
              onChange={setLongitude}
              options={LOCATION_OPTIONS}
            />
          )}
        </div>

        <label className="flex flex-col gap-1.5 w-full">
          <span className="text-xs font-medium text-slate-400">個人背景 / 特質提問（選填）</span>
          <textarea
            value={userNotes}
            onChange={(e) => setUserNotes(e.target.value)}
            rows={4}
            placeholder="可補充個人經歷或特定想詢問的問題..."
            className="w-full resize-y rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/40"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 text-sm font-medium text-slate-950 shadow-lg shadow-amber-500/10 transition-all hover:bg-amber-400 active:bg-amber-600 disabled:opacity-70"
        >
          <Sparkles className="size-4" />
          {loading ? '排盤中…' : '書籍比對與聯合排盤'}
        </button>
      </div>
    </form>
  );
}

function GlyphBlock({ char, element, caption }: { char: string; element: Element; caption: string }) {
  const s = ELEMENT_STYLE[element];
  return (
    <div className={`flex flex-col items-center gap-0.5 rounded-xl border ${s.border} ${s.bg} px-2 py-2.5`}>
      <span className={`font-serif text-2xl font-bold leading-none sm:text-3xl ${s.text}`}>{char}</span>
      <span className={`text-[10px] font-medium ${s.text}`}>
        {caption}{ELEMENT_LABEL[element]}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 四柱八字 ＋ 藏干十神 (合拼＋右至左 RTL 排版)                          */
/* ------------------------------------------------------------------ */

function FourPillars({ pillars, trueSolarText }: { pillars: Pillar[]; trueSolarText?: string }) {
  return (
    <section className="flex flex-col gap-3">
      {trueSolarText && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-medium text-amber-300">
          <Clock className="size-4 shrink-0 text-amber-400" />
          <span>{trueSolarText}</span>
        </div>
      )}

      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-xl font-medium text-slate-100">四柱八字 · 藏干十神</h2>
        <span className="text-xs text-slate-400">（右起：年柱 → 月柱 → 日柱 → 時柱）</span>
      </div>

      {/* dir="rtl" 使四柱由右至左排列 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3" dir="rtl">
        {pillars.map((p) => {
          const isDay = p.key === 'day';
          return (
            <article
              key={p.key}
              dir="ltr"
              className={`flex flex-col justify-between rounded-2xl border bg-slate-900/90 p-3 sm:p-4 shadow-xl transition-all ${
                isDay ? 'border-amber-500/80 ring-1 ring-amber-500/30' : 'border-slate-800'
              }`}
            >
              {/* 卡片標題：柱名與宮位 */}
              <header className="mb-2 flex items-center justify-between border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-serif text-base font-bold text-slate-100">{p.label}</h3>
                  {isDay && (
                    <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300">
                      日主
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400">{p.sublabel}</span>
              </header>

              {/* 天干與地支 */}
              <div className="flex flex-col gap-2">
                {/* 天干 */}
                <div className="relative">
                  <GlyphBlock char={p.heavenlyStem} element={p.heavenlyElement} caption="天干 · " />
                  <span className="absolute top-1.5 right-1.5 rounded bg-slate-950/80 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/30 shadow-sm">
                    {p.heavenlyTenGod}
                  </span>
                </div>

                {/* 地支 */}
                <div className="relative">
                  <GlyphBlock char={p.earthlyBranch} element={p.earthlyElement} caption="地支 · " />
                  <span className="absolute top-1.5 right-1.5 rounded bg-slate-950/80 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300 border border-slate-700/50 shadow-sm">
                    {p.earthlyTenGod}
                  </span>
                </div>
              </div>

              {/* 藏干與十神列表 */}
              <div className="mt-3 border-t border-slate-800/80 pt-2.5">
                <div className="mb-1.5 text-[10px] font-medium text-slate-400 text-center">
                  藏干 · 十神
                </div>
                <div className="flex flex-col gap-1">
                  {p.hiddenStems.map((h, i) => {
                    const s = ELEMENT_STYLE[h.element];
                    return (
                      <div
                        key={i}
                        className={`flex items-center justify-between rounded-lg border ${s.border} ${s.bg} px-2 py-1 transition-colors`}
                      >
                        <div className="flex items-center gap-1">
                          <span className={`font-serif text-xs font-bold ${s.text}`}>{h.char}</span>
                          <span className={`text-[9px] opacity-75 ${s.text}`}>({ELEMENT_LABEL[h.element]})</span>
                        </div>
                        <span className="text-[10px] font-medium text-slate-300">{h.god}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex size-6 items-center justify-center rounded-md bg-slate-800 text-slate-300">{icon}</span>
        <h3 className="font-serif text-base font-medium text-slate-100">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function PillarDetails({
  distribution,
  luck,
}: {
  pillars: Pillar[];
  distribution: { element: Element; value: number }[];
  luck: LuckPeriod[];
}) {
  const total = distribution.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* 五行分佈 */}
      <SectionCard title="五行分佈" icon={<PieChart className="size-4" />}>
        <div className="flex flex-col gap-2.5">
          {distribution.map((d) => {
            const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
            const s = ELEMENT_STYLE[d.element];
            return (
              <div key={d.element} className="flex items-center gap-2.5">
                <span className={`inline-flex size-6 shrink-0 items-center justify-center rounded border ${s.border} ${s.bg} font-serif text-xs font-medium ${s.text}`}>
                  {ELEMENT_LABEL[d.element]}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-950">
                  <div className={`h-full rounded-full ${s.bar} transition-all duration-700`} style={{ width: `${pct}%` }} />
                </div>
                <span className="w-8 shrink-0 text-right text-xs tabular-nums text-slate-400">{pct}%</span>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* 大運走勢 */}
      <SectionCard title="大運走勢" icon={<TrendingUp className="size-4" />}>
        <div className="-mx-1 overflow-x-auto pb-1">
          <ol className="flex min-w-max items-stretch gap-2 px-1">
            {luck.map((p) => {
              const s = ELEMENT_STYLE[p.element];
              return (
                <li key={p.age} className="flex flex-col items-center gap-1.5">
                  <div className={`flex w-16 flex-col items-center gap-0.5 rounded-xl border px-1.5 py-2.5 ${p.current ? 'border-amber-500 bg-amber-500/10' : 'border-slate-800 bg-slate-950'}`}>
                    <div className="flex items-baseline gap-0.5">
                      <span className={`font-serif text-base font-medium ${s.text}`}>{p.stem}</span>
                      <span className={`font-serif text-base font-medium ${s.text}`}>{p.branch}</span>
                    </div>
                    <span className="text-[10px] font-medium text-slate-200">{p.age} 歲</span>
                    <span className="text-[9px] text-slate-500">{p.year}</span>
                  </div>
                  <span className={`size-1.5 rounded-full ${p.current ? 'bg-amber-400' : s.dot}`} />
                </li>
              );
            })}
          </ol>
        </div>
      </SectionCard>
    </div>
  );
}

function AiAnalysis({ baziData, userNotes }: { baziData: BaziResult | null; userNotes: string }) {
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
        body: JSON.stringify({ baziData, userNotes }),
      });

      const data = await res.json();
      if (data.result) {
        setReport(data.result);
      } else {
        setReport('AI 分析生成失敗，請確定後端 API 已正確建立。');
      }
    } catch (err) {
      console.error(err);
      setReport('發送請求失敗，請檢查網路連線或 API key。');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-slate-900/90 p-5 shadow-xl sm:p-6">
      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-amber-400">
            <Sparkles className="size-4" />
            <span className="text-xs font-medium tracking-widest uppercase">AI 命理分析</span>
          </div>
          <h2 className="font-serif text-lg font-medium text-slate-100">AI 命盤總結報告</h2>
          <p className="text-xs text-slate-400 print:hidden">結合四柱、藏干、十神與大運走勢，由為你生成個人化詳細命書。</p>
        </div>

        {report && (
          <div className="flex items-center gap-2 print:hidden shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700 active:scale-95"
            >
              <Printer className="size-3.5 text-slate-300" />
              列印命書
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-slate-950 transition-colors hover:bg-amber-400 active:scale-95 shadow-md"
            >
              <FileDown className="size-3.5 text-slate-950" />
              儲存為 PDF
            </button>
          </div>
        )}
      </div>

      <div className="relative mt-4">
        {report ? (
          <div className="flex flex-col gap-3">
            <Quote className="size-4 text-amber-500/60 print:hidden" />
            <div className="prose prose-invert max-w-none text-sm leading-relaxed text-slate-200 whitespace-pre-line print:text-black print:prose-neutral">
              {report}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-800 bg-slate-950/60 px-4 py-8 text-center print:hidden">
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
              <WandSparkles className="size-4" />
            </span>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium text-slate-200">尚未生成分析報告</p>
              <p className="max-w-xs text-xs text-slate-400">點擊下方按鈕，AI 將為此命盤撰寫格局與運勢解讀。</p>
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="relative mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-300 transition-all hover:bg-amber-500/20 disabled:opacity-70 print:hidden"
      >
        <WandSparkles className="size-4 text-amber-400" />
        {loading ? 'AI 大師推演中…' : report ? '重新生成 AI 深度解盤' : '生成 AI 深度解盤'}
      </button>
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

  const handleFormSubmit = (formData: {
    year: string;
    month: string;
    day: string;
    hour: string;
    minute: string;
    gender: 'male' | 'female';
    trueSolar: string;
    longitude: string;
    userNotes: string;
  }) => {
    setLoading(true);
    setTimeout(() => {
      const result = calculateBazi(
        Number(formData.year),
        Number(formData.month),
        Number(formData.day),
        Number(formData.hour),
        formData.gender,
        Number(formData.minute),
        formData.trueSolar === 'on',
        Number(formData.longitude)
      );
      setBaziData(result);
      setUserNotes(formData.userNotes);
      setLoading(false);
    }, 300);
  };

  if (!hasEntered) {
    return <LandingPage onEnter={() => setHasEntered(true)} />;
  }

  const pillars = baziData ? mapBaziToPillars(baziData) : [];
  const distribution = baziData ? mapBaziToDistribution(baziData.wuxingCounts) : [];
  const luck = baziData ? mapBaziToLuck(baziData.dayyun) : [];

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-950 text-slate-100 selection:bg-amber-500/30 selection:text-amber-200 print:bg-white print:text-black">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        
        {/* 頂部導覽列 */}
        <header className="mb-6 flex items-center justify-between border-b border-slate-800/80 pb-4 print:hidden">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Compass className="size-5" />
            </span>
            <div>
              <h1 className="font-serif text-xl font-medium tracking-tight text-slate-100 sm:text-2xl">算命網</h1>
              <p className="text-[10px] text-slate-400">四柱八字 · 典籍比對 · AI 會診</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setHasEntered(false)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-amber-500/40 hover:text-amber-300"
          >
            <Home className="size-3.5 text-slate-400" />
            回首頁
          </button>
        </header>

        <div className="grid w-full min-w-0 gap-6 lg:grid-cols-[340px_1fr]">
          <div className="w-full min-w-0 lg:sticky lg:top-6 lg:self-start print:hidden">
            <BaziForm onSubmit={handleFormSubmit} loading={loading} />
          </div>

          <div className="w-full min-w-0">
            {baziData ? (
              <div className="flex w-full min-w-0 flex-col gap-5">
                <FourPillars pillars={pillars} trueSolarText={baziData.trueSolarText} />
                <PillarDetails pillars={pillars} distribution={distribution} luck={luck} />
                <AiAnalysis baziData={baziData} userNotes={userNotes} />
              </div>
            ) : (
              <div className="flex h-full min-h-[380px] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 px-6 py-12 text-center print:hidden">
                <span className="inline-flex size-12 items-center justify-center rounded-full bg-slate-800 text-slate-500">
                  <Moon className="size-5" />
                </span>
                <div className="flex flex-col gap-0.5">
                  <p className="font-serif text-base font-medium text-slate-200">等待排盤</p>
                  <p className="max-w-xs text-xs text-slate-400">填寫左側命主資料並點擊「書籍比對與聯合排盤」，命盤結果將顯示於此。</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}