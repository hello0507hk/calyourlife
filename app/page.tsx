'use client';

import React, { useState } from 'react';
import { calculateBazi } from '@/lib/bazi';
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

// 輔助函式：根據公曆年份計算干支
function getYearGanZhi(year: number): string {
  const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const offset = year - 4;
  const stem = stems[(offset % 10 + 10) % 10];
  const branch = branches[(offset % 12 + 12) % 12];
  return `${year} ${stem}${branch}年`;
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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-slate-950/80 to-slate-950" />
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 size-[650px] rounded-full bg-amber-500/10 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 -translate-x-1/2 size-[550px] rounded-full bg-blue-600/10 blur-[130px]" />

      <div className="relative z-10 flex max-w-4xl flex-col items-center px-6 py-12 text-center">
        <div className="relative mb-10 flex items-center justify-center">
          <div className="absolute size-80 animate-[spin_80s_linear_infinite] rounded-full border border-amber-500/15 sm:size-[380px]" />
          <div className="absolute size-72 animate-[spin_50s_linear_infinite_reverse] rounded-full border border-dashed border-amber-400/25 sm:size-80" />
          <div className="absolute size-60 animate-[ping_4s_cubic-bezier(0,0,0.2,1)_infinite] rounded-full border border-amber-500/10" />

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
                <g id="yang"><rect x="-14" y="-2" width="28" height="3.5" rx="1" fill="url(#goldGrad)" /></g>
                <g id="yin"><rect x="-14" y="-2" width="12" height="3.5" rx="1" fill="url(#goldGrad)" /><rect x="2" y="-2" width="12" height="3.5" rx="1" fill="url(#goldGrad)" /></g>
              </defs>

              <circle cx="100" cy="100" r="95" fill="url(#glowPool)" />
              <circle cx="100" cy="100" r="92" stroke="url(#goldGrad)" strokeWidth="1" strokeOpacity="0.4" strokeDasharray="1.5, 4.5" />
              <circle cx="100" cy="100" r="86" stroke="url(#goldGrad)" strokeWidth="1.5" strokeOpacity="0.7" />

              <text x="100" y="21" textAnchor="middle" fill="url(#goldGrad)" fontSize="8.5" fontFamily="serif" fontWeight="bold">天 · 乾</text>
              <text x="100" y="186" textAnchor="middle" fill="url(#goldGrad)" fontSize="8.5" fontFamily="serif" fontWeight="bold">地 · 坤</text>
              <text x="17" y="103" textAnchor="middle" fill="url(#goldGrad)" fontSize="8.5" fontFamily="serif" fontWeight="bold">離</text>
              <text x="183" y="103" textAnchor="middle" fill="url(#goldGrad)" fontSize="8.5" fontFamily="serif" fontWeight="bold">坎</text>

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
            rows={3}
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
    <div className={`flex flex-col items-center justify-center gap-0.5 rounded-xl border ${s.border} ${s.bg} px-2 py-2.5 shrink-0`}>
      <span className={`font-serif text-2xl font-bold leading-none sm:text-3xl ${s.text}`}>{char}</span>
      <span className={`text-[10px] font-medium ${s.text}`}>
        {caption}{ELEMENT_LABEL[element]}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 四柱八字 ＋ 藏干十神                                                */
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
        <span className="text-xs text-slate-400">（右起：年柱 ➔ 月柱 ➔ 日柱 ➔ 時柱）</span>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row-reverse sm:gap-3 items-stretch">
        {pillars.map((p) => {
          const isDay = p.key === 'day';
          const slots = [...p.hiddenStems];
          while (slots.length < 3) {
            slots.push({ char: '', element: 'earth', god: '' });
          }

          return (
            <article
              key={p.key}
              className={`flex flex-1 flex-col items-stretch rounded-2xl border bg-slate-900/90 p-3.5 shadow-xl transition-all ${
                isDay ? 'border-amber-500/80 ring-1 ring-amber-500/30' : 'border-slate-800'
              }`}
            >
              <header className="mb-2.5 flex h-7 items-center justify-between border-b border-slate-800/80 pb-2 shrink-0">
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

              <div className="flex flex-col gap-2 shrink-0">
                <div className="relative shrink-0">
                  <GlyphBlock char={p.heavenlyStem} element={p.heavenlyElement} caption="天干 · " />
                  <span className="absolute top-1.5 right-1.5 rounded bg-slate-950/80 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/30 shadow-sm">
                    {p.heavenlyTenGod}
                  </span>
                </div>

                <div className="relative shrink-0">
                  <GlyphBlock char={p.earthlyBranch} element={p.earthlyElement} caption="地支 · " />
                  <span className="absolute top-1.5 right-1.5 rounded bg-slate-950/80 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300 border border-slate-700/50 shadow-sm">
                    {p.earthlyTenGod}
                  </span>
                </div>
              </div>

              <div className="mt-3 border-t border-slate-800/80 pt-2 shrink-0">
                <div className="mb-1.5 text-[10px] font-medium text-slate-400 text-center">
                  藏干 · 十神
                </div>
                <div className="flex flex-col gap-1">
                  {slots.map((h, i) => {
                    if (!h.char) {
                      return (
                        <div
                          key={i}
                          className="flex h-7 shrink-0 items-center justify-between rounded-lg border border-transparent bg-transparent px-2 py-1"
                        />
                      );
                    }
                    const s = ELEMENT_STYLE[h.element];
                    return (
                      <div
                        key={i}
                        className={`flex h-7 shrink-0 items-center justify-between rounded-lg border ${s.border} ${s.bg} px-2 py-1 transition-colors`}
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

/* ------------------------------------------------------------------ */
/* 三大 AI 分析功能：1. 深度解盤  2. 流年解盤  3. 流年問事              */
/* ------------------------------------------------------------------ */

function AiAnalysis({ baziData, userNotes }: { baziData: BaziResult | null; userNotes: string }) {
  const [activeTab, setActiveTab] = useState<'deep' | 'yearly' | 'yearly_qa'>('deep');

  // 1. 深度解盤狀態
  const [deepReport, setDeepReport] = useState<string>('');
  const [deepLoading, setDeepLoading] = useState(false);

  // 2. 流年解盤狀態
  const [targetYear, setTargetYear] = useState<number>(2026);
  const [yearlyReport, setYearlyReport] = useState<string>('');
  const [yearlyLoading, setYearlyLoading] = useState(false);

  // 3. 流年問事狀態
  const [qaYear, setQaYear] = useState<number>(2026);
  const [qaQuestion, setQaQuestion] = useState<string>('');
  const [qaReport, setQaReport] = useState<string>('');
  const [qaLoading, setQaLoading] = useState(false);

  // 快捷提問選項
  const QUICK_QUESTIONS = [
    '今年事業有轉職跳槽或升遷機會嗎？',
    '今年財運吉凶？適合投資理財嗎？',
    '今年感情婚姻運勢如何？有桃花或感情變化嗎？',
    '今年健康與身體狀況需要注意什麼？',
    '今年有小人是非或口舌官非風險嗎？',
  ];

  // 通用請求 API 函式
  const callAnalyzeApi = async (payload: any) => {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return data.result;
  };

  // 1. 生成深度解盤
  const handleGenerateDeep = async () => {
    if (!baziData) return;
    setDeepLoading(true);
    setDeepReport('');
    try {
      const result = await callAnalyzeApi({
        type: 'deep',
        baziData,
        userNotes,
      });
      setDeepReport(result || '深度解盤生成失敗，請再試一次。');
    } catch (err) {
      console.error(err);
      setDeepReport('發送請求失敗，請檢查網路連線或 API key。');
    } finally {
      setDeepLoading(false);
    }
  };

  // 2. 生成流年解盤
  const handleGenerateYearly = async () => {
    if (!baziData) return;
    setYearlyLoading(true);
    setYearlyReport('');
    try {
      const result = await callAnalyzeApi({
        type: 'yearly',
        baziData,
        targetYear,
        userNotes,
      });
      setYearlyReport(result || '流年解盤生成失敗，請再試一次。');
    } catch (err) {
      console.error(err);
      setYearlyReport('發送請求失敗，請檢查網路連線或 API key。');
    } finally {
      setYearlyLoading(false);
    }
  };

  // 3. 生成流年問事
  const handleGenerateQa = async (questionText?: string) => {
    if (!baziData) return;
    const finalQuestion = questionText || qaQuestion;
    if (!finalQuestion.trim()) return;

    setQaLoading(true);
    setQaReport('');
    try {
      const result = await callAnalyzeApi({
        type: 'yearly_qa',
        baziData,
        targetYear: qaYear,
        question: finalQuestion,
        userNotes,
      });
      setQaReport(result || '流年問事解答生成失敗，請再試一次。');
    } catch (err) {
      console.error(err);
      setQaReport('發送請求失敗，請檢查網路連線或 API key。');
    } finally {
      setQaLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // 可選年份選單 (2024 至 2035)
  const YEAR_OPTIONS = Array.from({ length: 12 }, (_, i) => 2024 + i);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-slate-900/90 p-5 shadow-xl sm:p-6">
      {/* 頂部標題 */}
      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-amber-400">
            <Sparkles className="size-4" />
            <span className="text-xs font-medium tracking-widest uppercase">AI 命理推演中心</span>
          </div>
          <h2 className="font-serif text-xl font-bold text-slate-100">三大 AI 命理會診功能</h2>
        </div>

        {/* 列印／PDF 按鈕 */}
        {((activeTab === 'deep' && deepReport) ||
          (activeTab === 'yearly' && yearlyReport) ||
          (activeTab === 'yearly_qa' && qaReport)) && (
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

      {/* 功能分頁按鈕 (Tabs) */}
      <div className="mt-4 grid grid-cols-3 gap-1.5 rounded-xl bg-slate-950 p-1.5 border border-slate-800/80 print:hidden">
        <button
          type="button"
          onClick={() => setActiveTab('deep')}
          className={`flex items-center justify-center gap-2 rounded-lg py-2.5 px-2 text-xs font-bold transition-all ${
            activeTab === 'deep'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <WandSparkles className="size-4" />
          <span>1. 深度解盤</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('yearly')}
          className={`flex items-center justify-center gap-2 rounded-lg py-2.5 px-2 text-xs font-bold transition-all ${
            activeTab === 'yearly'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <CalendarDays className="size-4" />
          <span>2. 流年解盤</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('yearly_qa')}
          className={`flex items-center justify-center gap-2 rounded-lg py-2.5 px-2 text-xs font-bold transition-all ${
            activeTab === 'yearly_qa'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <HelpCircle className="size-4" />
          <span>3. 流年問事</span>
        </button>
      </div>

      {/* ==================== 功能 1：深度解盤 ==================== */}
      {activeTab === 'deep' && (
        <div className="mt-5 flex flex-col gap-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            結合四柱八字格局、日主旺衰、喜用神定位，精準推算一生事業、財運、婚姻與健康總論。
          </p>

          <button
            type="button"
            onClick={handleGenerateDeep}
            disabled={deepLoading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-slate-950 transition-all hover:bg-amber-400 disabled:opacity-70 print:hidden shadow-lg shadow-amber-500/10"
          >
            <WandSparkles className="size-4 text-slate-950" />
            {deepLoading ? 'AI 四大典籍會診推演中…' : deepReport ? '重新生成 AI 深度解盤' : '生成 AI 原局深度解盤'}
          </button>

          {/* 報告展示 */}
          {deepReport ? (
            <div className="mt-2 flex flex-col gap-3 rounded-xl bg-slate-950/60 border border-slate-800 p-4 sm:p-5">
              <Quote className="size-4 text-amber-500/60 print:hidden" />
              <div className="prose prose-invert max-w-none text-sm leading-relaxed text-slate-200 whitespace-pre-line print:text-black">
                {deepReport}
              </div>
            </div>
          ) : (
            !deepLoading && (
              <div className="flex flex-col items-center gap-2.5 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 px-4 py-8 text-center print:hidden">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
                  <WandSparkles className="size-5" />
                </span>
                <p className="text-xs text-slate-400">點擊上方按鈕，AI 將為你推算八字原局與格局總論。</p>
              </div>
            )
          )}
        </div>
      )}

      {/* ==================== 功能 2：流年解盤 ==================== */}
      {activeTab === 'yearly' && (
        <div className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-slate-950 p-3.5 border border-slate-800">
            <div className="flex items-center gap-2">
              <CalendarIcon className="size-4 text-amber-400 shrink-0" />
              <span className="text-xs font-bold text-slate-200">選擇推算流年份：</span>
            </div>

            <div className="relative flex-1 sm:max-w-xs">
              <select
                value={targetYear}
                onChange={(e) => setTargetYear(Number(e.target.value))}
                className="w-full appearance-none rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 pr-8 text-xs font-bold text-amber-300 outline-none focus:border-amber-500"
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y} className="bg-slate-900 text-slate-200">
                    {getYearGanZhi(y)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerateYearly}
            disabled={yearlyLoading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-slate-950 transition-all hover:bg-amber-400 disabled:opacity-70 print:hidden shadow-lg shadow-amber-500/10"
          >
            <CalendarDays className="size-4 text-slate-950" />
            {yearlyLoading
              ? `推算【${getYearGanZhi(targetYear)}】運勢中…`
              : yearlyReport
              ? `重新推算【${getYearGanZhi(targetYear)}】流年運勢`
              : `推算【${getYearGanZhi(targetYear)}】流年運勢`}
          </button>

          {/* 報告展示 */}
          {yearlyReport ? (
            <div className="mt-2 flex flex-col gap-3 rounded-xl bg-slate-950/60 border border-slate-800 p-4 sm:p-5">
              <Quote className="size-4 text-amber-500/60 print:hidden" />
              <div className="prose prose-invert max-w-none text-sm leading-relaxed text-slate-200 whitespace-pre-line print:text-black">
                {yearlyReport}
              </div>
            </div>
          ) : (
            !yearlyLoading && (
              <div className="flex flex-col items-center gap-2.5 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 px-4 py-8 text-center print:hidden">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
                  <CalendarDays className="size-5" />
                </span>
                <p className="text-xs text-slate-400">選擇年份並點擊按鈕，推算該流年之吉凶細節與月份提示。</p>
              </div>
            )
          )}
        </div>
      )}

      {/* ==================== 功能 3：流年問事 ==================== */}
      {activeTab === 'yearly_qa' && (
        <div className="mt-5 flex flex-col gap-4">
          {/* 流年年份選擇 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-slate-950 p-3.5 border border-slate-800">
            <div className="flex items-center gap-2">
              <HelpCircle className="size-4 text-amber-400 shrink-0" />
              <span className="text-xs font-bold text-slate-200">選擇問事流年份：</span>
            </div>

            <div className="relative flex-1 sm:max-w-xs">
              <select
                value={qaYear}
                onChange={(e) => setQaYear(Number(e.target.value))}
                className="w-full appearance-none rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 pr-8 text-xs font-bold text-amber-300 outline-none focus:border-amber-500"
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y} className="bg-slate-900 text-slate-200">
                    {getYearGanZhi(y)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* 快捷提問選項 */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-400">快捷熱門提問：</span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setQaQuestion(q);
                    handleGenerateQa(q);
                  }}
                  className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-300"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* 自訂問題輸入框 */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-400">自訂問題提問：</span>
            <div className="relative w-full">
              <textarea
                value={qaQuestion}
                onChange={(e) => setQaQuestion(e.target.value)}
                rows={3}
                placeholder="例如：今年適合創業換工作嗎？感情上會遇到正緣嗎？"
                className="w-full resize-y rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/40"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleGenerateQa()}
            disabled={qaLoading || !qaQuestion.trim()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-slate-950 transition-all hover:bg-amber-400 disabled:opacity-60 print:hidden shadow-lg shadow-amber-500/10"
          >
            <Send className="size-4 text-slate-950" />
            {qaLoading ? `AI 推算【${getYearGanZhi(qaYear)}】解答中…` : `提問【${getYearGanZhi(qaYear)}】特定流年吉凶`}
          </button>

          {/* 報告展示 */}
          {qaReport ? (
            <div className="mt-2 flex flex-col gap-3 rounded-xl bg-slate-950/60 border border-slate-800 p-4 sm:p-5">
              <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2.5">
                <MessageSquare className="size-4 text-amber-400" />
                <span className="text-xs font-bold text-amber-300">
                  【{getYearGanZhi(qaYear)}】問題解答：{qaQuestion}
                </span>
              </div>
              <div className="prose prose-invert max-w-none text-sm leading-relaxed text-slate-200 whitespace-pre-line print:text-black">
                {qaReport}
              </div>
            </div>
          ) : (
            !qaLoading && (
              <div className="flex flex-col items-center gap-2.5 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 px-4 py-8 text-center print:hidden">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
                  <HelpCircle className="size-5" />
                </span>
                <p className="text-xs text-slate-400">點擊快捷提問或輸入你想了解的特定問題，AI 將針對該流年解答。</p>
              </div>
            )
          )}
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