'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { calculateBazi } from '@/lib/bazi';
import { calculateQizheng, QizhengChart } from '@/lib/qizheng';
import { computeBaziStats } from '@/lib/baziStats';
import QizhengChartSVG from '@/components/QizhengChartSVG';
import { QizhengGods, QizhengHouseGrid, QizhengStarTable, QizhengSummary } from '@/components/QizhengDataPanel';
import { Logo, LogoMark } from '@/components/Logo';
import { BalanceBar, TenGodBars, WuxingDonut } from '@/components/charts';
import ReportView from '@/components/ReportView';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  ChevronDown,
  Clock,
  Eye,
  Grid,
  HelpCircle,
  Home,
  Info,
  LayoutGrid,
  Mars,
  Maximize2,
  Minimize2,
  MonitorSmartphone,
  Moon,
  PencilLine,
  PieChart,
  RotateCcw,
  Sparkles,
  Star,
  TrendingUp,
  User,
  Venus,
  WandSparkles,
  X,
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
  dayyun: Array<{ age: number; endAge: number; startYear: number; endYear: number; ganZhi: string }>;
  qiyunText?: string;
  genderText?: string;
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

const ELEMENT_STYLE: Record<Element, { text: string; bg: string; border: string }> = {
  wood: { text: 'text-emerald-400', bg: 'bg-emerald-950/40', border: 'border-emerald-800/60' },
  fire: { text: 'text-red-400', bg: 'bg-red-950/40', border: 'border-red-800/60' },
  earth: { text: 'text-amber-400', bg: 'bg-amber-950/40', border: 'border-amber-800/60' },
  metal: { text: 'text-slate-200', bg: 'bg-slate-800/50', border: 'border-slate-600/60' },
  water: { text: 'text-blue-400', bg: 'bg-blue-950/40', border: 'border-blue-800/60' },
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
  hiddenStems: { char: string; element: Element; god: string; qi: string }[];
}

// 與 lunar-javascript 藏干次序對齊；四庫第二位為上季餘氣、第三位為庫中氣
const HIDDEN_STEM_QI: Record<string, string[]> = {
  子: ['本氣'], 丑: ['本氣', '餘氣', '中氣'], 寅: ['本氣', '中氣', '餘氣'], 卯: ['本氣'],
  辰: ['本氣', '餘氣', '中氣'], 巳: ['本氣', '中氣', '餘氣'], 午: ['本氣', '中氣'], 未: ['本氣', '餘氣', '中氣'],
  申: ['本氣', '中氣', '餘氣'], 酉: ['本氣'], 戌: ['本氣', '餘氣', '中氣'], 亥: ['本氣', '中氣'],
};

interface LuckPeriod {
  ganZhi: string;
  age: number;
  endAge: number;
  startYear: number;
  endYear: number;
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
    return {
      key,
      label: labels[i],
      sublabel: sublabels[i],
      heavenlyStem: pData.gan,
      heavenlyElement: GAN_ELEMENT[pData.gan] || 'wood',
      heavenlyTenGod: pData.ganShishen,
      earthlyBranch: pData.zhi,
      earthlyElement: ZHI_ELEMENT[pData.zhi] || 'wood',
      hiddenStems: pData.zangGan.map((char, idx) => ({
        char,
        element: GAN_ELEMENT[char] || 'earth',
        god: pData.zangGanShishen[idx] || '',
        qi: HIDDEN_STEM_QI[pData.zhi]?.[idx] || '',
      })),
    };
  });
}

function mapBaziToLuck(dayyun: BaziResult['dayyun']): LuckPeriod[] {
  const thisYear = new Date().getFullYear();
  return dayyun.map((item) => {
    const stem = item.ganZhi[0] || '';
    const branch = item.ganZhi[1] || '';
    return {
      ganZhi: item.ganZhi,
      age: item.age,
      endAge: item.endAge,
      startYear: item.startYear,
      endYear: item.endYear,
      stem,
      branch,
      element: GAN_ELEMENT[stem] || 'earth',
      current: thisYear >= item.startYear && thisYear <= item.endYear,
    };
  });
}

/* ------------------------------------------------------------------ */
/* 共用版面元件                                                        */
/* ------------------------------------------------------------------ */

function SectionCard({
  id,
  icon: Icon,
  title,
  subtitle,
  action,
  accent = false,
  children,
}: {
  id?: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={`rounded-2xl border bg-slate-900/70 p-4 shadow-xl shadow-black/20 backdrop-blur sm:p-5 print:w-full print:rounded-xl print:p-[4mm] ${
        accent ? 'border-amber-500/30' : 'border-slate-800'
      }`}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-serif text-base font-bold text-slate-100 sm:text-lg">{title}</h2>
            {subtitle && <p className="truncate text-[11px] text-slate-400">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  busy,
}: {
  tabs: readonly { id: T; label: string; icon: React.ComponentType<{ className?: string }> }[];
  value: NoInfer<T>;
  onChange: (v: NoInfer<T>) => void;
  busy?: NoInfer<T> | null;
}) {
  return (
    <div className="grid gap-1 rounded-xl border border-slate-800 bg-slate-950 p-1 print:hidden" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`flex h-10 items-center justify-center gap-1.5 rounded-lg px-1 text-xs font-bold transition-all sm:text-[13px] ${
            value === id ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
          }`}
        >
          <Icon className="size-4 shrink-0" />
          <span className="truncate">{label}</span>
          {busy === id && <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-current" />}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 首頁 Landing Page                                                   */
/* ------------------------------------------------------------------ */

const FEATURES = [
  { icon: LayoutGrid, title: '子平八字', text: '真太陽時校正，四柱藏干餘氣十神，大運年份一目了然。' },
  { icon: Star, title: '七政四餘', text: '以 Moira 為藍本，十二宮、廿八宿、七政四餘與神煞俱全。' },
  { icon: Sparkles, title: 'AI 會診', text: '多模型聯合批算，深度解盤、流年批算與問事，配圖表解讀。' },
];

const ENTRY_NOTICES = [
  {
    icon: MonitorSmartphone,
    tone: 'text-amber-400',
    title: '請保持畫面開啟',
    text: 'AI 運算期間，請勿縮小或關閉視窗，並保持屏幕開啟，否則運算可能中斷。',
  },
  {
    icon: Clock,
    tone: 'text-amber-400',
    title: '需時約 5–10 分鐘',
    text: '整個運算過程繁複，由多個 AI 模型會診及總審，請耐心等候。',
  },
  {
    icon: AlertTriangle,
    tone: 'text-red-300',
    title: '結果未必 100% 準確',
    text: '如有需要，請尋求專業算命師的協助。',
  },
  {
    icon: Info,
    tone: 'text-sky-300',
    title: '只供參考',
    text: '算命並非精密科學，所有分析意見只供參考。',
  },
];

function EntryNotice({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="entry-notice-title"
        onClick={(e) => e.stopPropagation()}
        className="pb-safe relative w-full max-w-md rounded-2xl border border-amber-500/30 bg-slate-900 p-5 text-left shadow-2xl shadow-black/50 sm:p-6"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="關閉"
          className="absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        >
          <X className="size-4" />
        </button>

        <div className="mb-4 flex items-center gap-2.5">
          <LogoMark size={36} />
          <h2 id="entry-notice-title" className="font-serif text-lg font-bold text-amber-100">
            開始前請留意
          </h2>
        </div>

        <ul className="flex flex-col gap-3">
          {ENTRY_NOTICES.map(({ icon: Icon, tone, title, text }) => (
            <li key={title} className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <Icon className={`mt-0.5 size-5 shrink-0 ${tone}`} />
              <div>
                <div className="text-sm font-bold text-slate-100">{title}</div>
                <p className="mt-0.5 text-[13px] leading-relaxed text-slate-400">{text}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            className="h-12 flex-1 rounded-xl border border-slate-700 text-sm font-medium text-slate-300 hover:bg-slate-800"
          >
            返回
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className="inline-flex h-12 flex-[2] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 font-serif text-base font-bold text-slate-950 active:scale-[0.98]"
          >
            我明白，開始排盤
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function LandingPage({ onEnter }: { onEnter: () => void }) {
  const [showNotice, setShowNotice] = useState(false);
  const closeNotice = useCallback(() => setShowNotice(false), []);

  return (
    <div className="relative flex min-h-[100svh] w-full flex-col items-center justify-center overflow-hidden px-5 py-12 text-slate-100">
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[560px] -translate-x-1/2 rounded-full bg-amber-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 size-[480px] -translate-x-1/2 rounded-full bg-blue-600/10 blur-[120px]" />

      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center text-center">
        <div className="relative mb-8 flex items-center justify-center">
          <div className="absolute size-64 rounded-full border border-amber-500/10 sm:size-80" />
          <div className="absolute size-56 animate-[spin_90s_linear_infinite_reverse] rounded-full border border-dashed border-amber-400/20 sm:size-72" />
          <div className="relative rounded-full shadow-[0_0_80px_rgba(245,158,11,0.25)]">
            <LogoMark size={176} animated className="sm:hidden" />
            <LogoMark size={224} animated className="hidden sm:block" />
          </div>
        </div>

        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-[11px] font-medium tracking-widest text-amber-300 sm:text-xs">
          <Sparkles className="size-3.5" />
          星平合參 · 子平八字 × 七政四餘
        </div>

        <h1 className="font-serif text-5xl font-bold tracking-[0.2em] sm:text-7xl">
          <span className="bg-gradient-to-b from-amber-50 via-amber-300 to-amber-600 bg-clip-text text-transparent">算命網</span>
        </h1>
        <p className="mt-2 text-[11px] font-medium tracking-[0.5em] text-amber-500/70">CALYOURLIFE</p>

        <p className="mt-6 max-w-xl font-serif text-base leading-relaxed text-amber-100/80 sm:text-lg">
          天地玄黃，星平合參；四柱藏通變，七政定吉凶。
        </p>

        <button
          type="button"
          onClick={() => setShowNotice(true)}
          className="group mt-9 inline-flex h-14 w-full max-w-xs items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 font-serif text-lg font-bold text-slate-950 shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-transform active:scale-95 sm:hover:scale-105"
        >
          開始排盤
          <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
        </button>

        <div className="mt-12 grid w-full gap-3 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-left backdrop-blur sm:flex-col">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                <Icon className="size-4.5" />
              </span>
              <div>
                <div className="font-serif text-sm font-bold text-amber-100">{title}</div>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showNotice && <EntryNotice onConfirm={onEnter} onClose={closeNotice} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 表單                                                                */
/* ------------------------------------------------------------------ */

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}

const INPUT_CLASS =
  'h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 text-base text-slate-100 outline-none transition-colors focus:border-amber-500/80 sm:text-sm';

function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  return (
    <label className="flex w-full min-w-0 flex-col gap-1.5">
      <span className="text-xs font-medium text-slate-400">{label}</span>
      <div className="relative w-full">
        <select value={value} onChange={(e) => onChange(e.target.value)} className={`${INPUT_CLASS} appearance-none pr-8`}>
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

const LOCATION_LATITUDE: Record<string, number> = {
  '114.17': 22.32,
  '113.54': 22.2,
  '121.50': 25.03,
  '116.40': 39.9,
  '121.47': 31.23,
  '113.26': 23.13,
  '114.05': 22.54,
  '103.81': 1.35,
};

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
  hasResult,
}: {
  onSubmit: (formData: any) => void;
  loading: boolean;
  hasResult: boolean;
}) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [trueSolar, setTrueSolar] = useState('on');
  const [longitude, setLongitude] = useState('114.17');
  const [year, setYear] = useState('1983');
  const [month, setMonth] = useState('11');
  const [day, setDay] = useState('23');
  const [hour, setHour] = useState('5');
  const [minute, setMinute] = useState('0');
  const [occupation, setOccupation] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('單身未婚');
  const [expanded, setExpanded] = useState(false);

  const collapsed = hasResult && !expanded;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setExpanded(false);
    onSubmit({
      name, year, month, day, hour, minute, gender, trueSolar, longitude, occupation: occupation.trim(), maritalStatus,
    });
  };

  return (
    <form
      id="form"
      onSubmit={handleSubmit}
      className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-xl shadow-black/20 backdrop-blur sm:p-5 lg:sticky lg:top-20 print:hidden"
    >
      {collapsed && (
        <button type="button" onClick={() => setExpanded(true)} className="flex w-full items-center gap-3 text-left lg:hidden">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
            {gender === 'male' ? <Mars className="size-5" /> : <Venus className="size-5" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-serif text-[15px] font-bold text-slate-100">
              {name || (gender === 'male' ? '乾造' : '坤造')}
            </span>
            <span className="block truncate text-xs text-slate-400">
              {year}年{month}月{day}日 {hour.padStart(2, '0')}:{minute.padStart(2, '0')}
              {trueSolar === 'on' && ` · ${LOCATION_OPTIONS.find((l) => l.value === longitude)?.label.split(' ')[0]}`}
            </span>
          </span>
          <span className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-700 px-3 text-xs text-slate-300">
            <PencilLine className="size-3.5" /> 修改
          </span>
        </button>
      )}

      <div className={collapsed ? 'hidden lg:block' : ''}>
        <div className="mb-5 flex items-center gap-2.5">
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
            <User className="size-4" />
          </span>
          <div>
            <h2 className="font-serif text-lg font-bold text-slate-100">命主資料</h2>
            <p className="text-xs text-slate-400">填寫出生資訊以生成八字與七政星盤</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <label className="flex w-full flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-400">姓名（選填）</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="請輸入姓名" className={INPUT_CLASS} />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-400">性別</span>
            <div className="grid grid-cols-2 gap-2">
              {(['male', 'female'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-sm transition-all ${
                    gender === g ? 'border-amber-400 bg-amber-500 font-bold text-slate-950' : 'border-slate-800 bg-slate-950 text-slate-400'
                  }`}
                >
                  {g === 'male' ? <Mars className="size-4" /> : <Venus className="size-4" />}
                  {g === 'male' ? '乾造 · 男' : '坤造 · 女'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <SelectField label="出生年" value={year} onChange={setYear} options={range(1940, 2026, '年')} />
            <SelectField label="月" value={month} onChange={setMonth} options={range(1, 12, '月')} />
            <SelectField label="日" value={day} onChange={setDay} options={range(1, 31, '日')} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <SelectField
              label="出生時"
              value={hour}
              onChange={setHour}
              options={Array.from({ length: 24 }, (_, i) => ({ value: String(i), label: `${String(i).padStart(2, '0')} 時` }))}
            />
            <SelectField
              label="分"
              value={minute}
              onChange={setMinute}
              options={Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: `${String(i).padStart(2, '0')} 分` }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-2">
            <SelectField label="真太陽時校正" value={trueSolar} onChange={setTrueSolar} options={[{ value: 'on', label: '開啟真太陽時' }, { value: 'off', label: '關閉' }]} />
            {trueSolar === 'on' && <SelectField label="出生地" value={longitude} onChange={setLongitude} options={LOCATION_OPTIONS} />}
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <div className="text-xs font-medium text-slate-300">
              背景資料<span className="ml-1 text-slate-500">（選填，令 AI 批算更貼身）</span>
            </div>
            <label className="flex w-full flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-400">現時職業</span>
              <input value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="例如：IT、金融、創業..." className={INPUT_CLASS} />
            </label>
            <SelectField label="感情／婚姻狀態" value={maritalStatus} onChange={setMaritalStatus} options={MARITAL_OPTIONS} />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-[15px] font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition-transform active:scale-[0.98] disabled:opacity-70"
          >
            <Sparkles className="size-4" />
            {loading ? '星平合參排盤中…' : hasResult ? '重新排盤' : '星平合參排盤'}
          </button>
        </div>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* 四柱八字                                                            */
/* ------------------------------------------------------------------ */

function FourPillars({ pillars, bazi }: { pillars: Pillar[]; bazi: BaziResult }) {
  const ordered = [...pillars].reverse();

  return (
    <SectionCard
      id="bazi"
      icon={LayoutGrid}
      title="四柱八字"
      subtitle={`${bazi.genderText ?? ''} · ${bazi.lunarDate}`}
      action={<span className="text-[10px] text-slate-500">右起 年 → 時</span>}
    >
      {bazi.trueSolarText && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed text-amber-200/90 sm:text-xs">
          <Clock className="mt-0.5 size-3.5 shrink-0 text-amber-400" />
          <span>{bazi.trueSolarText}</span>
        </div>
      )}

      <div className="grid grid-cols-4 gap-1.5 sm:gap-3 print:mx-auto print:max-w-[80%] print:gap-2">
        {ordered.map((p) => {
          const isDay = p.key === 'day';
          const stem = ELEMENT_STYLE[p.heavenlyElement];
          const branch = ELEMENT_STYLE[p.earthlyElement];
          return (
            <article
              key={p.key}
              className={`flex min-w-0 flex-col rounded-xl border p-1.5 sm:rounded-2xl sm:p-3 print:rounded-lg print:p-1.5 ${
                isDay ? 'border-amber-500/70 bg-amber-500/[0.06] ring-1 ring-amber-500/20' : 'border-slate-800 bg-slate-950/50'
              }`}
            >
              <header className="mb-1.5 text-center">
                <h3 className={`font-serif text-[13px] font-bold sm:text-base ${isDay ? 'text-amber-300' : 'text-slate-200'}`}>{p.label}</h3>
                <p className="hidden text-[10px] text-slate-500 sm:block">{p.sublabel}</p>
              </header>

              <div className="mb-1 text-center">
                <span
                  className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium sm:text-[11px] ${
                    isDay ? 'bg-amber-500 text-slate-950' : 'border border-amber-500/30 text-amber-300'
                  }`}
                >
                  {p.heavenlyTenGod}
                </span>
              </div>

              <div className={`flex flex-col items-center rounded-lg border ${stem.border} ${stem.bg} py-1.5 sm:py-2.5 print:py-1`}>
                <span className={`font-serif text-[28px] font-bold leading-none sm:text-4xl print:text-2xl ${stem.text}`}>{p.heavenlyStem}</span>
                <span className={`mt-1 text-[9px] sm:text-[10px] print:mt-0.5 ${stem.text}`}>{ELEMENT_LABEL[p.heavenlyElement]}</span>
              </div>
              <div className={`mt-1 flex flex-col items-center rounded-lg border ${branch.border} ${branch.bg} py-1.5 sm:mt-1.5 sm:py-2.5 print:mt-1 print:py-1`}>
                <span className={`font-serif text-[28px] font-bold leading-none sm:text-4xl print:text-2xl ${branch.text}`}>{p.earthlyBranch}</span>
                <span className={`mt-1 text-[9px] sm:text-[10px] print:mt-0.5 ${branch.text}`}>{ELEMENT_LABEL[p.earthlyElement]}</span>
              </div>

              <ul className="mt-1.5 flex flex-col gap-0.5 border-t border-slate-800 pt-1.5 print:mt-1 print:pt-1">
                {p.hiddenStems.map((h) => (
                  <li key={h.char} className="flex items-center justify-between gap-0.5 rounded px-0.5 text-[10px] sm:px-1 sm:text-xs print:text-[10px]">
                    <span className="text-[9px] text-slate-500 sm:text-[10px]">{h.qi}</span>
                    <span className={`font-serif text-sm font-bold sm:text-base print:text-sm ${ELEMENT_STYLE[h.element].text}`}>{h.char}</span>
                    <span className="text-slate-300">{h.god}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/* 命盤圖解                                                            */
/* ------------------------------------------------------------------ */

function ChartOverview({ bazi }: { bazi: BaziResult }) {
  const stats = useMemo(() => computeBaziStats(bazi.eightChar, bazi.dayGan), [bazi]);
  const raw = bazi.wuxingCounts;

  return (
    <SectionCard id="charts" icon={PieChart} title="命盤圖解" subtitle="五行力量 · 十神分佈 · 同異黨比例">
      <div className="grid gap-3 md:grid-cols-2 print:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3.5">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-xs font-medium text-slate-300">五行力量（含藏干加權）</span>
            <span className="text-[10px] text-slate-500">
              原局字數 木{raw.木} 火{raw.火} 土{raw.土} 金{raw.金} 水{raw.水}
            </span>
          </div>
          <WuxingDonut values={stats.wuxing} dayElement={stats.dayElement} />
          <div className="mt-4">
            <BalanceBar ratio={stats.supportRatio} dayElement={stats.dayElement} />
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-slate-500">天干計 1；藏干本氣 1、中氣 0.5、餘氣 0.3；月令藏干再乘 1.5。僅供參考，旺衰仍以格局論定。</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3.5">
          <div className="mb-3 text-xs font-medium text-slate-300">十神分佈（含藏干加權）</div>
          <TenGodBars counts={stats.tenGods} />
        </div>
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/* 七政四餘                                                            */
/* ------------------------------------------------------------------ */

const QIZHENG_VIEWS = [
  { id: 'svg', label: '星盤', icon: Eye },
  { id: 'grid', label: '十二宮', icon: Grid },
  { id: 'table', label: '星曜資料', icon: Star },
] as const;

function QizhengSection({ data }: { data: QizhengChart }) {
  const [viewMode, setViewMode] = useState<(typeof QIZHENG_VIEWS)[number]['id']>('svg');
  const [zoomed, setZoomed] = useState(false);

  return (
    <SectionCard id="qizheng" icon={Star} title="七政四餘星盤" subtitle="果老星宗 · Moira 制" accent>
      <div className="flex flex-col gap-3">
        <SegmentedTabs tabs={QIZHENG_VIEWS} value={viewMode} onChange={setViewMode} />
        <QizhengSummary data={data} />

        {viewMode === 'svg' && (
          <>
            <div className="relative print:mx-auto print:w-[75%]">
              <div className={`no-scrollbar rounded-xl border border-amber-900/40 print:overflow-visible ${zoomed ? 'overflow-auto' : 'overflow-hidden'}`}>
                <div className={zoomed ? 'w-[760px] print:w-full' : 'w-full'}>
                  <QizhengChartSVG data={data} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setZoomed((z) => !z)}
                className="absolute right-2 top-2 inline-flex h-9 items-center gap-1 rounded-lg bg-slate-950/80 px-2.5 text-xs text-amber-200 shadow backdrop-blur sm:hidden"
              >
                {zoomed ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
                {zoomed ? '縮小' : '放大'}
              </button>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400 print:hidden">
              由內至外：地支・卦・宮主 → 黃道宮 → 十二宮（紅為命宮、藍為身宮）→ <span className="text-blue-400">流年星曜</span> → 二十八宿 →
              <span className="text-emerald-400"> 本命七政四餘</span>（紅圈為逆／留／伏／蝕）→ <span className="text-violet-400">流年神煞</span> →
              <span className="text-emerald-400"> 本命神煞</span> → 大限年份。
              <span className="sm:hidden">手機可按「放大」左右拖動查看細節。</span>
            </p>
          </>
        )}

        {viewMode === 'grid' && <QizhengHouseGrid data={data} />}

        {viewMode === 'table' && (
          <>
            <QizhengStarTable data={data} />
            <QizhengGods data={data} />
          </>
        )}
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/* 大運                                                                */
/* ------------------------------------------------------------------ */

function LuckSection({ luck, qiyunText }: { luck: LuckPeriod[]; qiyunText?: string }) {
  const scroller = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const el = scroller.current?.querySelector<HTMLElement>('[data-current="true"]');
    if (el && scroller.current) scroller.current.scrollLeft = el.offsetLeft - scroller.current.clientWidth / 2 + el.clientWidth / 2;
  }, [luck]);

  return (
    <SectionCard id="luck" icon={TrendingUp} title="大運" subtitle={qiyunText}>
      <ol ref={scroller} className="no-scrollbar -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 print:mx-0 print:gap-1.5 print:overflow-visible print:px-0">
        {luck.map((p) => (
          <li key={p.startYear} data-current={p.current} className="flex shrink-0 snap-center flex-col items-center gap-1 print:min-w-0 print:flex-1">
            <div
              className={`flex w-[4.5rem] flex-col items-center rounded-xl border px-1 py-2.5 sm:w-20 print:w-full print:py-1.5 ${
                p.current ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10' : 'border-slate-800 bg-slate-950/60'
              }`}
            >
              <div className="flex flex-col font-serif text-xl font-bold leading-tight">
                <span className={ELEMENT_STYLE[p.element].text}>{p.stem}</span>
                <span className={ELEMENT_STYLE[ZHI_ELEMENT[p.branch] || 'earth'].text}>{p.branch}</span>
              </div>
              <div className="mt-1.5 text-xs font-semibold tabular-nums text-slate-100">{p.startYear}</div>
              <div className="text-[9px] tabular-nums text-slate-500">至 {p.endYear}</div>
              <div className="mt-1 text-[10px] text-slate-400">{p.age}–{p.endAge}歲</div>
            </div>
            <span className={`text-[10px] font-medium ${p.current ? 'text-amber-400' : 'text-transparent'}`}>現行大運</span>
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/* AI 會診中心                                                         */
/* ------------------------------------------------------------------ */

const STEMS = '甲乙丙丁戊己庚辛壬癸';
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';

function yearGanZhi(year: number) {
  const n = year - 4;
  return `${STEMS[((n % 10) + 10) % 10]}${BRANCHES[((n % 12) + 12) % 12]}`;
}

type AnalysisType = 'deep' | 'yearly' | 'yearly_qa';

interface ReportState {
  text: string;
  year?: number;
  question?: string;
  resume?: unknown;
  error?: string;
  failed?: boolean;
}

const ANALYSIS_TABS = [
  { id: 'deep', label: '深度解盤', icon: WandSparkles },
  { id: 'yearly', label: '流年批算', icon: CalendarDays },
  { id: 'yearly_qa', label: '問事', icon: HelpCircle },
] as const;

const QUICK_QUESTIONS = [
  '事業有轉職或升遷機會嗎？',
  '財運吉凶？適合投資嗎？',
  '感情婚姻運勢如何？',
  '健康需要注意什麼？',
  '有小人是非或官非嗎？',
];

function AiLoading() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="flex items-center gap-2 text-xs text-amber-300">
        <LogoMark size={22} animated />
        多個 AI 模型正在會診，約需 5–10 分鐘，請勿關閉頁面或關閉屏幕…
      </div>
      {[90, 75, 82, 60].map((w, i) => (
        <div key={i} className="h-3 animate-pulse rounded bg-slate-800" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}

function AiAnalysis({ baziData, luck }: { baziData: BaziResult; luck: LuckPeriod[] }) {
  const thisYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 13 }, (_, i) => thisYear - 2 + i);

  const [activeTab, setActiveTab] = useState<AnalysisType>('deep');
  const [targetYear, setTargetYear] = useState(thisYear);
  const [question, setQuestion] = useState('');
  const [reports, setReports] = useState<Record<AnalysisType, ReportState>>({
    deep: { text: '' },
    yearly: { text: '' },
    yearly_qa: { text: '' },
  });
  const [loadingTab, setLoadingTab] = useState<AnalysisType | null>(null);
  const [continuing, setContinuing] = useState(false);

  const yearLuck = luck.find((p) => targetYear >= p.startYear && targetYear <= p.endYear);
  const yearLabel = `${targetYear} ${yearGanZhi(targetYear)}年`;

  const handleGenerate = async (type: AnalysisType, questionText?: string, year = targetYear) => {
    if (loadingTab) return;
    const q = (questionText ?? question).trim();
    if (type === 'yearly_qa' && !q) return;

    setLoadingTab(type);
    setReports((r) => ({ ...r, [type]: { text: '' } }));
    const failed = (error: string) =>
      setReports((r) => ({ ...r, [type]: { text: '', year, question: q, failed: true, error } }));
    try {
      const data = await requestReport(type, year, q);
      if (data.result) {
        setReports((r) => ({
          ...r,
          [type]: { text: data.result, year, question: q, resume: data.meta?.resume ?? undefined },
        }));
      } else {
        failed(data.error || '分析失敗，請重新批算。');
      }
    } catch {
      failed('連線中斷或伺服器逾時，分析失敗。請檢查網絡後重新批算。');
    } finally {
      setLoadingTab(null);
    }
  };

  const requestReport = async (type: AnalysisType, year: number, q: string, resume?: unknown) => {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        baziData,
        userNotes: '',
        ...(type !== 'deep' && { targetYear: year }),
        ...(type === 'yearly_qa' && { question: q }),
        ...(resume ? { resume } : {}),
      }),
    });
    return res.json();
  };

  const handleContinue = async (type: AnalysisType) => {
    const current = reports[type];
    if (loadingTab || !current.resume) return;
    setLoadingTab(type);
    setContinuing(true);
    try {
      const data = await requestReport(type, current.year ?? targetYear, current.question ?? '', current.resume);
      if (data.result) {
        setReports((r) => ({
          ...r,
          [type]: { ...current, text: data.result, resume: data.meta?.resume ?? undefined, error: undefined },
        }));
      } else {
        setReports((r) => ({ ...r, [type]: { ...current, error: data.error || '續寫失敗，請再試一次。' } }));
      }
    } catch {
      setReports((r) => ({ ...r, [type]: { ...current, error: '請求發送失敗，請檢查網絡連線。' } }));
    } finally {
      setLoadingTab(null);
      setContinuing(false);
    }
  };

  const loading = loadingTab === activeTab;
  const report = reports[activeTab];

  const yearPicker = (
    <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 p-2.5 print:hidden">
      <CalendarDays className="size-4 shrink-0 text-amber-400" />
      <div className="relative min-w-0 flex-1">
        <select
          value={targetYear}
          onChange={(e) => setTargetYear(Number(e.target.value))}
          className="h-10 w-full appearance-none rounded-lg border border-slate-800 bg-slate-900 px-3 pr-8 text-base font-bold text-amber-300 outline-none focus:border-amber-500 sm:text-sm"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y} className="bg-slate-900 text-slate-200">
              {y} {yearGanZhi(y)}年
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      </div>
      {yearLuck && (
        <span className="shrink-0 rounded-lg border border-slate-800 px-2 py-1.5 text-[11px] text-slate-400">
          行 <span className="font-serif font-bold text-amber-300">{yearLuck.ganZhi}</span> 運
        </span>
      )}
    </div>
  );

  return (
    <SectionCard id="ai" icon={Sparkles} title="AI 星平合參會診中心" subtitle="DeepSeek · Qwen · Grok 初批，Gemini 總審" accent>
      <div className="flex flex-col gap-3">
        <SegmentedTabs tabs={ANALYSIS_TABS} value={activeTab} onChange={setActiveTab} busy={loadingTab} />

        {activeTab === 'deep' && (
          <p className="text-xs leading-relaxed text-slate-400 print:hidden">
            結合四柱格局、日主旺衰、喜用神，與七政四餘星曜落宮雙重會診，推算一生事業、財運、婚姻與健康，並以圖表顯示各範疇評分及大運起伏。
          </p>
        )}

        {activeTab === 'yearly' && (
          <>
            {yearPicker}
            <p className="text-xs leading-relaxed text-slate-400 print:hidden">
              以流年干支對照日主、大運與原局生剋沖合，參照七政流年星曜，批算事業、財運、感情、健康，並附逐月吉凶走勢圖。
            </p>
          </>
        )}

        {activeTab === 'yearly_qa' && (
          <>
            {yearPicker}
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              placeholder="輸入想問的事情，例如：今年適合轉工嗎？"
              className="w-full resize-y rounded-xl print:hidden border border-slate-800 bg-slate-950 px-3 py-2.5 text-base text-slate-100 outline-none focus:border-amber-500/80 sm:text-sm"
            />
            <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 sm:flex-wrap print:hidden">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={!!loadingTab}
                  onClick={() => {
                    setQuestion(q);
                    handleGenerate('yearly_qa', q);
                  }}
                  className="h-9 shrink-0 rounded-full border border-slate-700 bg-slate-950 px-3 text-xs text-slate-300 transition-colors hover:border-amber-500/60 hover:text-amber-300 disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </>
        )}

        <button
          type="button"
          onClick={() => handleGenerate(activeTab)}
          disabled={!!loadingTab || (activeTab === 'yearly_qa' && !question.trim())}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-[15px] font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          <Sparkles className="size-4" />
          {activeTab === 'deep' && (loading ? 'AI 多模型會診中…' : report.text ? '重新生成深度解盤' : '生成深度解盤')}
          {activeTab === 'yearly' && (loading ? `批算【${yearLabel}】中…` : `批算【${yearLabel}】流年`)}
          {activeTab === 'yearly_qa' && (loading ? '推算問事中…' : `就【${yearLabel}】問事`)}
        </button>
        {loadingTab && loadingTab !== activeTab && (
          <p className="text-center text-[11px] text-slate-500">
            {ANALYSIS_TABS.find((t) => t.id === loadingTab)?.label}正在生成中，完成後才可提交新請求。
          </p>
        )}

        {loading && !continuing && <AiLoading />}
        {report.failed && !loading && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-red-500/40 bg-red-500/5 p-5 text-center print:hidden">
            <AlertTriangle className="size-6 text-red-400" />
            <div>
              <p className="text-sm font-bold text-red-300">分析失敗</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{report.error}</p>
            </div>
            <button
              type="button"
              onClick={() => handleGenerate(activeTab, report.question, report.year)}
              disabled={!!loadingTab}
              className="inline-flex h-11 w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-sm font-bold text-slate-950 disabled:opacity-60"
            >
              <RotateCcw className="size-4" />
              重新批算
            </button>
          </div>
        )}
        {report.text && (!loading || continuing) && (
          <ReportView
            type={activeTab}
            report={report.text}
            targetYear={report.year}
            luck={luck.map(({ ganZhi, startYear, endYear, current }) => ({ ganZhi, startYear, endYear, current }))}
          />
        )}
        {report.resume != null && report.text && (!loading || continuing) && (
          <div className="flex flex-col gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 print:hidden">
            <p className="text-xs leading-relaxed text-amber-200/90">
              {continuing
                ? 'Gemini 正在接續撰寫餘下章節，完成後會自動接在上方報告之後，請勿關閉頁面…'
                : '報告尚未全部寫完。可先閱讀以上章節，看完後按下方按鈕生成餘下部分。'}
            </p>
            {report.error && !continuing && <p className="text-xs text-red-300">{report.error}</p>}
            <button
              type="button"
              onClick={() => handleContinue(activeTab)}
              disabled={!!loadingTab}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-amber-500/60 bg-slate-950 text-sm font-bold text-amber-300 transition-colors hover:bg-amber-500/10 disabled:opacity-60"
            >
              {continuing ? <LogoMark size={18} animated /> : <ArrowRight className="size-4" />}
              {continuing ? '正在生成餘下報告…' : '繼續生成餘下報告'}
            </button>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/* 手機底部導覽                                                        */
/* ------------------------------------------------------------------ */

const NAV_ITEMS = [
  { id: 'form', label: '資料', icon: User },
  { id: 'bazi', label: '八字', icon: LayoutGrid },
  { id: 'luck', label: '大運', icon: TrendingUp },
  { id: 'qizheng', label: '星盤', icon: Star },
  { id: 'ai', label: '會診', icon: Sparkles },
];

function MobileNav() {
  const [active, setActive] = useState('bazi');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-30% 0px -55% 0px' }
    );
    NAV_ITEMS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/90 backdrop-blur-lg lg:hidden print:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              onClick={() => setActive(id)}
              className={`flex h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                active === id ? 'text-amber-400' : 'text-slate-500'
              }`}
            >
              <Icon className="size-5" />
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* 主頁面                                                              */
/* ------------------------------------------------------------------ */

export default function Page() {
  const [hasEntered, setHasEntered] = useState(false);
  const [baziData, setBaziData] = useState<BaziResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFormSubmit = (formData: any) => {
    setLoading(true);
    setTimeout(() => {
      const result = calculateBazi(
        Number(formData.year), Number(formData.month), Number(formData.day), Number(formData.hour),
        formData.gender, Number(formData.minute), formData.trueSolar === 'on', Number(formData.longitude)
      );

      const qizheng = calculateQizheng({
        year: Number(formData.year),
        month: Number(formData.month),
        day: Number(formData.day),
        hour: Number(formData.hour),
        minute: Number(formData.minute),
        longitude: Number(formData.longitude),
        latitude: LOCATION_LATITUDE[formData.longitude] ?? 22.32,
        timezone: 8,
        trueSolar: formData.trueSolar === 'on',
      });

      setBaziData({
        ...result,
        birthYear: Number(formData.year), birthMonth: Number(formData.month), birthDay: Number(formData.day), birthHour: Number(formData.hour),
        longitude: Number(formData.longitude), occupation: formData.occupation, maritalStatus: formData.maritalStatus, qizhengData: qizheng,
      });
      setLoading(false);
      if (window.matchMedia('(max-width: 1023px)').matches) {
        requestAnimationFrame(() => document.getElementById('bazi')?.scrollIntoView({ behavior: 'smooth' }));
      }
    }, 300);
  };

  if (!hasEntered) return <LandingPage onEnter={() => setHasEntered(true)} />;

  const pillars = baziData ? mapBaziToPillars(baziData) : [];
  const luck = baziData ? mapBaziToLuck(baziData.dayyun) : [];

  return (
    <main className={`min-h-screen w-full text-slate-100 ${baziData ? 'pb-20 lg:pb-10' : 'pb-10'}`}>
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-lg print:hidden">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="回到頂部">
            <Logo size={36} />
          </button>
          <button
            type="button"
            onClick={() => setHasEntered(false)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 text-xs text-slate-300"
          >
            <Home className="size-3.5" /> 首頁
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-3 pt-4 sm:px-6 sm:pt-8 print:max-w-none print:p-0">
        <div className="grid items-start gap-4 lg:grid-cols-[320px_1fr] lg:gap-6 print:block">
          <BaziForm onSubmit={handleFormSubmit} loading={loading} hasResult={!!baziData} />

          <div className="flex min-w-0 flex-col gap-4 sm:gap-5 print:w-full print:gap-[4mm]">
            {baziData ? (
              <>
                <FourPillars pillars={pillars} bazi={baziData} />
                <LuckSection luck={luck} qiyunText={baziData.qiyunText} />
                <ChartOverview bazi={baziData} />
                {baziData.qizhengData && <QizhengSection data={baziData.qizhengData} />}
                <AiAnalysis baziData={baziData} luck={luck} />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-800 px-6 py-16 text-center">
                <Moon className="size-6 text-slate-500" />
                <p className="text-sm font-medium text-slate-300">等待排盤</p>
                <p className="text-xs text-slate-500">填寫命主資料並按「星平合參排盤」，即可呈現八字與七政星盤。</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {baziData && <MobileNav />}
    </main>
  );
}
