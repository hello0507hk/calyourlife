'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileText, Loader2, Search, Shield } from 'lucide-react';
import type { AdminReportIndexEntry, ChartSnapshot, ReportMeta } from '@/lib/userStore';

const REPORT_LABEL: Record<string, string> = {
  deep: '深度解盤',
  yearly: '流年批算',
  yearly_qa: '流年問事',
};

function formatWhen(ts: number) {
  if (!ts) return '';
  return new Date(ts).toLocaleString('zh-HK', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminReportsPage() {
  const [items, setItems] = useState<AdminReportIndexEntry[]>([]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<{
    meta: ReportMeta;
    text: string;
    chart?: ChartSnapshot | null;
    email: string;
  } | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/accounts?allReports=1&limit=200', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '載入失敗');
      setItems(data.reports || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((r) => {
      const hay = [
        r.email,
        r.type,
        REPORT_LABEL[r.type],
        r.year,
        r.question,
        r.summary,
        r.useGod,
        r.pillarsText,
        r.birthLabel,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  const openReport = async (entry: AdminReportIndexEntry) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(
        `/api/admin/accounts?uid=${encodeURIComponent(entry.uid)}&reportId=${encodeURIComponent(entry.reportId)}`,
        { cache: 'no-store' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '無法打開報告');
      setOpen({ meta: data.meta, text: data.text || '', chart: data.chart, email: entry.email });
    } catch (err) {
      setError(err instanceof Error ? err.message : '無法打開報告');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 bg-slate-950 p-4 text-slate-100 sm:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-serif text-xl font-bold text-amber-100 sm:text-2xl">
            <Shield className="size-6 text-amber-400" />
            全部批斷報告
          </h1>
          <p className="mt-1 text-xs text-slate-500">保存用戶曾經生成的所有報告，管理員可隨時打開查閱。</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/accounts" className="rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-300">
            帳號資料
          </Link>
          <Link href="/admin" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-800 px-3 text-sm text-slate-300">
            <ArrowLeft className="size-4" /> 統計後台
          </Link>
        </div>
      </header>

      <label className="relative block max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜尋電郵、用神、出生日期、問事…"
          className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pr-3 pl-10 text-sm text-slate-100 outline-none focus:border-amber-500"
        />
      </label>

      {error && <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-200">
            <FileText className="size-4 text-amber-400" />
            報告列表
            <span className="font-normal text-slate-500">（{filtered.length}）</span>
          </h2>
          <button type="button" onClick={load} className="text-xs text-slate-400 hover:text-amber-200">
            重新整理
          </button>
        </div>

        {busy && !items.length ? (
          <div className="flex items-center gap-2 py-10 text-sm text-slate-400">
            <Loader2 className="size-4 animate-spin" /> 載入中…
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">尚未有已存報告，或沒有符合搜尋的結果。</p>
        ) : (
          <ul className="flex max-h-[70vh] flex-col gap-2 overflow-auto">
            {filtered.map((r) => (
              <li key={`${r.uid}:${r.reportId}`}>
                <button
                  type="button"
                  onClick={() => openReport(r)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-3 text-left transition-colors hover:border-amber-500/40"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium text-amber-100">
                        {REPORT_LABEL[r.type] || r.type}
                        {r.year ? ` · ${r.year}` : ''}
                        {r.useGod ? ` · 用神 ${r.useGod}` : ''}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">{r.email}</div>
                      {(r.birthLabel || r.pillarsText) && (
                        <div className="mt-0.5 text-xs text-slate-500">
                          {r.birthLabel}
                          {r.pillarsText ? ` · ${r.pillarsText}` : ''}
                        </div>
                      )}
                      {r.question && <div className="mt-1 text-xs text-slate-300">問：{r.question}</div>}
                      {r.summary && <div className="mt-1 line-clamp-2 text-xs text-slate-500">{r.summary}</div>}
                    </div>
                    <div className="shrink-0 text-[11px] text-slate-500">{formatWhen(r.createdAt)}</div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {open && (
        <section className="rounded-2xl border border-amber-500/30 bg-slate-900/70 p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-serif text-lg font-bold text-amber-100">
                {REPORT_LABEL[open.meta.type] || open.meta.type}
                {open.meta.year ? ` · ${open.meta.year}` : ''}
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                {open.email}
                {open.chart ? ` · ${open.chart.year}/${open.chart.month}/${open.chart.day}` : ''}
                {open.meta.useGod ? ` · 用神 ${open.meta.useGod}` : ''}
              </p>
              {open.meta.question && <p className="mt-1 text-xs text-slate-300">問：{open.meta.question}</p>}
            </div>
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300"
            >
              關閉
            </button>
          </div>
          {open.meta.summary && <p className="mb-3 text-sm text-amber-100/90">{open.meta.summary}</p>}
          <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-[13px] leading-relaxed text-slate-200">
            {open.text || '（此報告沒有正文）'}
          </pre>
          <Link
            href="/admin/accounts"
            className="mt-3 inline-block text-xs text-amber-300 underline underline-offset-2"
          >
            到帳號資料管理可修改此報告
          </Link>
        </section>
      )}
    </main>
  );
}
