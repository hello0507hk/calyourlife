'use client';

import React, { useMemo, useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy, Printer } from 'lucide-react';
import { MonthBars, RadarChart, ScoreGauge, TrendChart, WUXING_COLOR, scoreLabel } from '@/components/charts';
import type { WuxingName } from '@/lib/baziStats';

export type ReportType = 'deep' | 'yearly' | 'yearly_qa';

interface ReportScores {
  overall?: number;
  score?: number;
  verdict?: string;
  summary?: string;
  scores?: Record<string, number>;
  luck?: { ganZhi: string; score: number; note?: string }[];
  months?: { month: string; score: number; note?: string }[];
  useGod?: string;
  favorable?: string[];
  unfavorable?: string[];
}

export interface LuckRef {
  ganZhi: string;
  startYear: number;
  endYear: number;
  current?: boolean;
}

const JSON_BLOCK = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/g;

function splitReport(raw: string): { markdown: string; data: ReportScores | null } {
  const blocks = [...raw.matchAll(JSON_BLOCK)];
  for (let i = blocks.length - 1; i >= 0; i--) {
    try {
      const data = JSON.parse(blocks[i][1]) as ReportScores;
      if (data && typeof data === 'object' && (data.scores || data.months || data.luck || data.score !== undefined)) {
        const markdown = (raw.slice(0, blocks[i].index) + raw.slice(blocks[i].index! + blocks[i][0].length)).trim();
        return { markdown, data };
      }
    } catch {
      // 非評分 JSON，略過
    }
  }
  return { markdown: raw.trim(), data: null };
}

const num = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : Number(v) || 0);

const MD: Components = {
  h1: ({ children }) => <h2 className="mt-6 mb-3 font-serif text-xl font-bold text-amber-200 first:mt-0">{children}</h2>,
  h2: ({ children }) => <h3 className="mt-6 mb-3 font-serif text-lg font-bold text-amber-200 first:mt-0">{children}</h3>,
  h3: ({ children }) => (
    <h3 className="mt-7 mb-3 flex items-start gap-2 rounded-lg border-l-4 border-amber-500 bg-amber-500/10 px-3 py-2 font-serif text-base font-bold leading-snug text-amber-100 first:mt-0 sm:text-[17px]">
      {children}
    </h3>
  ),
  h4: ({ children }) => <h4 className="mt-4 mb-2 text-[15px] font-bold text-slate-100">{children}</h4>,
  p: ({ children }) => <p className="my-2.5 text-[15px] leading-[1.85] text-slate-200 sm:text-sm sm:leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="my-2.5 flex flex-col gap-1.5 pl-1">{children}</ul>,
  ol: ({ children }) => <ol className="my-2.5 flex list-decimal flex-col gap-1.5 pl-5 marker:text-amber-400">{children}</ol>,
  li: ({ children }) => (
    <li className="relative pl-4 text-[15px] leading-[1.8] text-slate-200 before:absolute before:top-[0.75em] before:left-0 before:size-1.5 before:rounded-full before:bg-amber-500/70 sm:text-sm sm:leading-relaxed [ol>&]:pl-1 [ol>&]:before:hidden">
      {children}
    </li>
  ),
  strong: ({ children }) => <strong className="font-semibold text-amber-200">{children}</strong>,
  hr: () => <hr className="my-6 h-px border-0 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />,
  blockquote: ({ children }) => (
    <blockquote className="my-3 rounded-r-lg border-l-2 border-sky-400/60 bg-sky-500/5 px-3 py-1 text-slate-300">{children}</blockquote>
  ),
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-slate-800">
      <table className="w-full min-w-[420px] text-left text-[13px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-slate-800/60 text-amber-200">{children}</thead>,
  th: ({ children }) => <th className="px-3 py-2 font-semibold">{children}</th>,
  td: ({ children }) => <td className="border-t border-slate-800 px-3 py-2 text-slate-300">{children}</td>,
};

function ChartCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 ${className}`}>
      <div className="mb-2 text-xs font-medium text-slate-400">{title}</div>
      {children}
    </div>
  );
}

function ElementChips({ label, items, tone }: { label: string; items?: string[]; tone: 'good' | 'bad' }) {
  if (!items?.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={`text-xs ${tone === 'good' ? 'text-emerald-300' : 'text-red-300'}`}>{label}</span>
      {items.map((el) => (
        <span
          key={el}
          className="inline-flex size-7 items-center justify-center rounded-lg border font-serif text-sm font-bold"
          style={{ color: WUXING_COLOR[el as WuxingName] ?? '#e2e8f0', borderColor: `${WUXING_COLOR[el as WuxingName] ?? '#475569'}66` }}
        >
          {el}
        </span>
      ))}
    </div>
  );
}

function ReportCharts({ type, data, luck, targetYear }: { type: ReportType; data: ReportScores; luck: LuckRef[]; targetYear?: number }) {
  const radarItems = Object.entries(data.scores ?? {}).map(([label, v]) => ({ label, value: num(v) }));

  if (type === 'yearly_qa') {
    const score = num(data.score ?? data.overall);
    return (
      <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
        <ChartCard title="問事吉凶指數" className="flex flex-col items-center">
          <ScoreGauge score={score} label={data.verdict || scoreLabel(score)} />
        </ChartCard>
        {data.summary && (
          <ChartCard title="一句斷語">
            <p className="font-serif text-base leading-relaxed text-amber-100">{data.summary}</p>
          </ChartCard>
        )}
      </div>
    );
  }

  if (type === 'yearly') {
    const overall = num(data.overall ?? (radarItems.reduce((s, i) => s + i.value, 0) / (radarItems.length || 1)));
    return (
      <div className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
          <ChartCard title={`${targetYear ?? ''} 流年總運勢`} className="flex flex-col items-center justify-center">
            <ScoreGauge score={overall} />
            {data.summary && <p className="mt-2 max-w-[16rem] text-center text-xs leading-relaxed text-slate-300">{data.summary}</p>}
          </ChartCard>
          {radarItems.length >= 3 && (
            <ChartCard title="各範疇運勢評分">
              <RadarChart items={radarItems} />
            </ChartCard>
          )}
        </div>
        {data.months && data.months.length > 0 && (
          <ChartCard title="逐月吉凶走勢（以節氣月計）">
            <MonthBars months={data.months.map((m) => ({ ...m, score: num(m.score) }))} />
          </ChartCard>
        )}
      </div>
    );
  }

  const luckPoints = (data.luck ?? []).map((l) => {
    const period = luck.find((p) => p.ganZhi === l.ganZhi);
    return { label: l.ganZhi, sub: period ? `${period.startYear}` : undefined, value: num(l.score), current: period?.current };
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {radarItems.length >= 3 && (
          <ChartCard title="命局各範疇評分">
            <RadarChart items={radarItems} />
          </ChartCard>
        )}
        {(data.useGod || data.favorable?.length || data.summary) && (
          <ChartCard title="用神喜忌速覽" className="flex flex-col gap-3">
            {data.useGod && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">用神</span>
                <span className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-2.5 py-1 font-serif text-base font-bold text-amber-200">{data.useGod}</span>
              </div>
            )}
            <ElementChips label="喜" items={data.favorable} tone="good" />
            <ElementChips label="忌" items={data.unfavorable} tone="bad" />
            {data.summary && <p className="border-t border-slate-800 pt-2.5 text-[13px] leading-relaxed text-slate-300">{data.summary}</p>}
          </ChartCard>
        )}
      </div>
      {luckPoints.length >= 2 && (
        <ChartCard title="大運起伏走勢">
          <TrendChart points={luckPoints} highlightIndex={luckPoints.findIndex((p) => p.current)} />
        </ChartCard>
      )}
    </div>
  );
}

export default function ReportView({
  type,
  report,
  luck,
  targetYear,
}: {
  type: ReportType;
  report: string;
  luck: LuckRef[];
  targetYear?: number;
}) {
  const { markdown, data } = useMemo(() => splitReport(report), [report]);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 剪貼簿不可用時靜默略過
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {data && <ReportCharts type={type} data={data} luck={luck} targetYear={targetYear} />}

      <article className="prose-report rounded-xl border border-slate-800 bg-slate-950/50 p-4 sm:p-5">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD}>
          {markdown}
        </ReactMarkdown>
      </article>

      <div className="flex gap-2 print:hidden">
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-medium text-slate-200 active:scale-[0.98]"
        >
          {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
          {copied ? '已複製' : '複製報告'}
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-medium text-slate-200 active:scale-[0.98]"
        >
          <Printer className="size-4" /> 列印／存 PDF
        </button>
      </div>
    </div>
  );
}
