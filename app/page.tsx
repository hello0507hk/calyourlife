'use client';

import React, { useState } from 'react';
import { calculateBazi, BaziResult } from '@/lib/bazi';
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
  Sun,
  Calendar as CalendarIcon,
} from 'lucide-react';

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
  earthlyBranch: string;
  earthlyElement: Element;
  hiddenStems: { char: string; element: Element; god: string }[];
  tenGod: string;
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
      earthlyBranch: eZhi,
      earthlyElement: ZHI_ELEMENT[eZhi] || 'wood',
      tenGod: pData.ganShishen,
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

const SHICHEN = [
  { value: '0', label: '子時 (23:00-01:00)' },
  { value: '2', label: '丑時 (01:00-03:00)' },
  { value: '4', label: '寅時 (03:00-05:00)' },
  { value: '6', label: '卯時 (05:00-07:00)' },
  { value: '8', label: '辰時 (07:00-09:00)' },
  { value: '10', label: '巳時 (09:00-11:00)' },
  { value: '12', label: '午時 (11:00-13:00)' },
  { value: '14', label: '未時 (13:00-15:00)' },
  { value: '16', label: '申時 (15:00-17:00)' },
  { value: '18', label: '酉時 (17:00-19:00)' },
  { value: '20', label: '戌時 (19:00-21:00)' },
  { value: '22', label: '亥時 (21:00-23:00)' },
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
    gender: 'male' | 'female';
    calendar: 'solar' | 'lunar';
    trueSolar: string;
  }) => void;
  loading: boolean;
}) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [calendar, setCalendar] = useState<'solar' | 'lunar'>('solar');
  const [trueSolar, setTrueSolar] = useState('on');
  const [year, setYear] = useState('1995');
  const [month, setMonth] = useState('8');
  const [day, setDay] = useState('15');
  const [hour, setHour] = useState('14');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, year, month, day, hour, gender, calendar, trueSolar });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-full rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl sm:p-6 backdrop-blur">
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

        {/* 年/月/日/時辰 四欄網格 */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
          <SelectField label="出生年" value={year} onChange={setYear} options={range(1940, 2026, '年')} />
          <SelectField label="出生月" value={month} onChange={setMonth} options={range(1, 12, '月')} />
          <SelectField label="出生日" value={day} onChange={setDay} options={range(1, 31, '日')} />
          <SelectField label="時辰" value={hour} onChange={setHour} options={SHICHEN} />
        </div>

        {/* 真太陽時校正 */}
        <SelectField
          label="真太陽時校正"
          value={trueSolar}
          onChange={setTrueSolar}
          options={[
            { value: 'on', label: '開啟（依出生地經度校正時差）' },
            { value: 'off', label: '關閉（使用平太陽標準時）' },
          ]}
        />

        <button
          type="submit"
          disabled={loading}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 text-sm font-medium text-slate-950 shadow-lg shadow-amber-500/10 transition-all hover:bg-amber-400 active:bg-amber-600 disabled:opacity-70"
        >
          <Sparkles className="size-4" />
          {loading ? '排盤中…' : '立即排盤'}
        </button>
      </div>
    </form>
  );
}

function GlyphBlock({ char, element, caption }: { char: string; element: Element; caption: string }) {
  const s = ELEMENT_STYLE[element];
  return (
    <div className={`flex flex-col items-center gap-1 rounded-xl border ${s.border} ${s.bg} px-2 py-3`}>
      <span className={`font-serif text-3xl font-medium leading-none ${s.text}`}>{char}</span>
      <span className={`text-[10px] font-medium ${s.text}`}>
        {caption}
        {ELEMENT_LABEL[element]}
      </span>
    </div>
  );
}

function FourPillars({ pillars }: { pillars: Pillar[] }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-serif text-xl font-medium text-slate-100">四柱八字</h2>
        <span className="text-xs text-slate-400">天干 · 地支 · 五行</span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {pillars.map((p) => {
          const isDay = p.key === 'day';
          return (
            <article
              key={p.key}
              className={`rounded-2xl border bg-slate-900/90 p-3.5 shadow-xl ${
                isDay ? 'border-amber-500/80 ring-1 ring-amber-500/30' : 'border-slate-800'
              }`}
            >
              <header className="mb-2.5 flex items-center justify-between">
                <h3 className="font-serif text-sm font-medium text-slate-200">{p.label}</h3>
                {isDay && <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 text-[9px] font-medium text-amber-300">日主</span>}
              </header>

              <div className="mb-2.5 flex flex-col gap-1.5">
                <GlyphBlock char={p.heavenlyStem} element={p.heavenlyElement} caption="天干 · " />
                <GlyphBlock char={p.earthlyBranch} element={p.earthlyElement} caption="地支 · " />
              </div>

              <dl className="flex flex-col gap-1 border-t border-slate-800/80 pt-2 text-[11px]">
                <div className="flex items-center justify-between">
                  <dt className="text-slate-400">主星</dt>
                  <dd className="font-medium text-slate-200">{p.tenGod}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-400">宮位</dt>
                  <dd className="text-slate-300">{p.sublabel}</dd>
                </div>
              </dl>
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
  pillars,
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
      <SectionCard title="藏干 · 十神" icon={<Layers className="size-4" />}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {pillars.map((p) => (
            <div key={p.key} className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-400">{p.label}</span>
              <div className="flex flex-col gap-1">
                {p.hiddenStems.map((h, i) => {
                  const s = ELEMENT_STYLE[h.element];
                  return (
                    <div key={i} className={`flex items-center justify-between rounded-lg border ${s.border} ${s.bg} px-2 py-1`}>
                      <span className={`font-serif text-xs font-medium ${s.text}`}>{h.char}</span>
                      <span className="text-[10px] text-slate-400">{h.god}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

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

function AiAnalysis({ baziData }: { baziData: BaziResult | null }) {
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
        body: JSON.stringify({ baziData }),
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

  return (
    <section className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-slate-900/90 p-5 shadow-xl sm:p-6">
      <div className="relative flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-amber-400">
          <Sparkles className="size-4" />
          <span className="text-xs font-medium tracking-widest uppercase">AI 命理分析</span>
        </div>
        <h2 className="font-serif text-lg font-medium text-slate-100">AI 命盤總結報告</h2>
        <p className="text-xs text-slate-400">結合四柱、藏干、十神與大運走勢，由 DeepSeek 生成個人化深度解讀。</p>
      </div>

      <div className="relative mt-4">
        {report ? (
          <div className="flex flex-col gap-3">
            <Quote className="size-4 text-amber-500/60" />
            <div className="prose prose-invert max-w-none text-sm leading-relaxed text-slate-200 whitespace-pre-line">
              {report}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-800 bg-slate-950/60 px-4 py-8 text-center">
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
        className="relative mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-300 transition-all hover:bg-amber-500/20 disabled:opacity-70"
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
  const [baziData, setBaziData] = useState<BaziResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFormSubmit = (formData: {
    year: string;
    month: string;
    day: string;
    hour: string;
    gender: 'male' | 'female';
  }) => {
    setLoading(true);
    setTimeout(() => {
      const result = calculateBazi(
        Number(formData.year),
        Number(formData.month),
        Number(formData.day),
        Number(formData.hour),
        formData.gender
      );
      setBaziData(result);
      setLoading(false);
    }, 300);
  };

  const pillars = baziData ? mapBaziToPillars(baziData) : [];
  const distribution = baziData ? mapBaziToDistribution(baziData.wuxingCounts) : [];
  const luck = baziData ? mapBaziToLuck(baziData.dayyun) : [];

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-950 text-slate-100 selection:bg-amber-500/30 selection:text-amber-200">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="inline-flex size-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Compass className="size-5" />
          </span>
          <h1 className="font-serif text-2xl font-medium tracking-tight text-slate-100 sm:text-3xl">八字排盤網站</h1>
          <p className="max-w-md text-xs leading-relaxed text-slate-400">
            輸入出生資訊，推演四柱八字、五行藏干與大運走勢，並由 AI 生成專屬命理報告。
          </p>
        </header>

        <div className="grid w-full min-w-0 gap-6 lg:grid-cols-[340px_1fr]">
          <div className="w-full min-w-0 lg:sticky lg:top-6 lg:self-start">
            <BaziForm onSubmit={handleFormSubmit} loading={loading} />
          </div>

          <div className="w-full min-w-0">
            {baziData ? (
              <div className="flex w-full min-w-0 flex-col gap-5">
                <FourPillars pillars={pillars} />
                <PillarDetails pillars={pillars} distribution={distribution} luck={luck} />
                <AiAnalysis baziData={baziData} />
              </div>
            ) : (
              <div className="flex h-full min-h-[380px] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 px-6 py-12 text-center">
                <span className="inline-flex size-12 items-center justify-center rounded-full bg-slate-800 text-slate-500">
                  <Moon className="size-5" />
                </span>
                <div className="flex flex-col gap-0.5">
                  <p className="font-serif text-base font-medium text-slate-200">等待排盤</p>
                  <p className="max-w-xs text-xs text-slate-400">填寫左側命主資料並點擊「立即排盤」，命盤結果將顯示於此。</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}