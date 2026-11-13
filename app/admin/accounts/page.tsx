'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, FolderOpen, Loader2, Save, Shield } from 'lucide-react';
import type { ChartSnapshot, ReportMeta, UserAccountSummary } from '@/lib/userStore';

const REPORT_LABEL: Record<string, string> = {
  deep: '深度解盤',
  yearly: '流年批算',
  yearly_qa: '流年問事',
};

type ReportFull = { meta: ReportMeta; text: string };

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<UserAccountSummary[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [charts, setCharts] = useState<ChartSnapshot[]>([]);
  const [reports, setReports] = useState<ReportMeta[]>([]);
  const [chart, setChart] = useState<ChartSnapshot | null>(null);
  const [report, setReport] = useState<ReportFull | null>(null);
  const [notice, setNotice] = useState('');

  const [useGod, setUseGod] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [occupation, setOccupation] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [name, setName] = useState('');
  const [reportText, setReportText] = useState('');
  const [reportSummary, setReportSummary] = useState('');

  const loadAccounts = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/accounts', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '載入失敗');
      setAccounts(data.accounts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const openUser = async (account: UserAccountSummary) => {
    setSelectedUid(account.uid);
    setSelectedEmail(account.email);
    setChart(null);
    setReport(null);
    setNotice('');
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/accounts?uid=${encodeURIComponent(account.uid)}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '載入失敗');
      setCharts(data.charts || []);
      setReports(data.reports || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setBusy(false);
    }
  };

  const openChart = (c: ChartSnapshot) => {
    setChart(c);
    setReport(null);
    setUseGod(c.useGod || '');
    setAdminNote(c.adminNote || '');
    setOccupation(c.occupation || '');
    setMaritalStatus(c.maritalStatus || '');
    setName(c.name || '');
    setNotice('');
  };

  const openReport = async (meta: ReportMeta) => {
    if (!selectedUid) return;
    setBusy(true);
    setNotice('');
    try {
      const res = await fetch(
        `/api/admin/accounts?uid=${encodeURIComponent(selectedUid)}&reportId=${encodeURIComponent(meta.id)}`,
        { cache: 'no-store' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '載入失敗');
      setReport(data);
      setReportText(data.text || '');
      setReportSummary(data.meta?.summary || '');
      setUseGod(data.meta?.useGod || useGod);
      if (chart?.id !== meta.chartId) {
        const found = charts.find((c) => c.id === meta.chartId);
        if (found) openChart(found);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setBusy(false);
    }
  };

  const saveChartEdits = async () => {
    if (!selectedUid || !chart) return;
    setBusy(true);
    setNotice('');
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: selectedUid,
          chart: {
            id: chart.id,
            useGod,
            adminNote,
            occupation,
            maritalStatus,
            name,
            useGodLocked: true,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '儲存失敗');
      setChart(data.chart);
      setCharts((list) => list.map((c) => (c.id === data.chart.id ? data.chart : c)));
      setNotice('命盤資料已更新。之後此帳號解盤會以鎖定用神及管理員備註為準。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存失敗');
    } finally {
      setBusy(false);
    }
  };

  const saveReportEdits = async () => {
    if (!selectedUid || !report) return;
    setBusy(true);
    setNotice('');
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: selectedUid,
          report: {
            id: report.meta.id,
            text: reportText,
            summary: reportSummary,
            useGod,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '儲存失敗');
      setReport(data.report);
      setReports((list) => list.map((r) => (r.id === data.report.meta.id ? data.report.meta : r)));
      if (data.report.meta.useGod) setUseGod(data.report.meta.useGod);
      setNotice('報告已更新。用戶再次開啟同一盤時會看到此版本，並以更改後的用神為準。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存失敗');
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
            帳號資料管理
          </h1>
          <p className="mt-1 text-xs text-slate-500">查看所有命主資料夾，並可手動更改用神、備註與報告內容。</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-800 px-3 text-sm text-slate-300">
            <ArrowLeft className="size-4" /> 統計後台
          </Link>
          <Link href="/" className="rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-300">
            返回網站
          </Link>
        </div>
      </header>

      {error && <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
      {notice && <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{notice}</p>}

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200">所有帳號</h2>
            <button type="button" onClick={loadAccounts} className="text-xs text-slate-400 hover:text-amber-200">
              重新整理
            </button>
          </div>
          {busy && !accounts.length ? (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="size-4 animate-spin" /> 載入中…
            </div>
          ) : accounts.length === 0 ? (
            <p className="text-sm text-slate-500">尚未有登入帳號。</p>
          ) : (
            <ul className="flex max-h-[70vh] flex-col gap-1 overflow-auto">
              {accounts.map((a) => (
                <li key={a.uid}>
                  <button
                    type="button"
                    onClick={() => openUser(a)}
                    className={`w-full rounded-lg px-2.5 py-2 text-left text-xs ${
                      selectedUid === a.uid ? 'bg-amber-500/15 text-amber-100' : 'text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <div className="truncate font-medium">{a.email}</div>
                    <div className="mt-0.5 text-[11px] text-slate-500">
                      命盤 {a.chartCount} · 報告 {a.reportCount}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex flex-col gap-4">
          {!selectedUid ? (
            <div className="rounded-2xl border border-dashed border-slate-800 px-6 py-16 text-center text-sm text-slate-500">
              請先選擇左側帳號。
            </div>
          ) : (
            <>
              <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                <h2 className="mb-3 flex items-center gap-2 font-serif text-lg font-bold text-amber-100">
                  <FolderOpen className="size-5 text-amber-400" />
                  {selectedEmail}
                </h2>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <h3 className="mb-2 text-xs font-bold text-slate-400">命盤</h3>
                    <ul className="flex flex-col gap-1">
                      {charts.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => openChart(c)}
                            className={`w-full rounded-lg border px-2.5 py-2 text-left text-xs ${
                              chart?.id === c.id ? 'border-amber-500/50 bg-amber-500/10' : 'border-slate-800 bg-slate-950/50'
                            }`}
                          >
                            <div className="text-slate-200">
                              {c.name || (c.gender === 'female' ? '坤造' : '乾造')} · {c.year}/{c.month}/{c.day}
                            </div>
                            <div className="mt-0.5 text-slate-500">
                              {c.pillarsText || c.dayGan || c.id}
                              {c.useGod ? ` · 用神 ${c.useGod}${c.useGodLocked ? '（已鎖定）' : ''}` : ''}
                            </div>
                          </button>
                        </li>
                      ))}
                      {!charts.length && <li className="text-xs text-slate-500">無命盤</li>}
                    </ul>
                  </div>
                  <div>
                    <h3 className="mb-2 text-xs font-bold text-slate-400">報告</h3>
                    <ul className="flex max-h-64 flex-col gap-1 overflow-auto">
                      {(chart ? reports.filter((r) => r.chartId === chart.id) : reports).map((r) => (
                        <li key={r.id}>
                          <button
                            type="button"
                            onClick={() => openReport(r)}
                            className={`w-full rounded-lg border px-2.5 py-2 text-left text-xs ${
                              report?.meta.id === r.id ? 'border-amber-500/50 bg-amber-500/10' : 'border-slate-800 bg-slate-950/50'
                            }`}
                          >
                            {REPORT_LABEL[r.type] || r.type}
                            {r.year ? ` · ${r.year}` : ''}
                            {r.adminEditedAt ? ' · 已手動改' : ''}
                          </button>
                        </li>
                      ))}
                      {!reports.length && <li className="text-xs text-slate-500">無報告</li>}
                    </ul>
                  </div>
                </div>
              </section>

              {chart && (
                <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                  <h3 className="mb-3 text-sm font-bold text-slate-200">編輯命盤／用神</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 text-xs text-slate-400">
                      姓名
                      <input value={name} onChange={(e) => setName(e.target.value)} className="h-10 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-slate-400">
                      用神（儲存後鎖定，之後解盤必須以此為準）
                      <input value={useGod} onChange={(e) => setUseGod(e.target.value)} className="h-10 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-amber-100" placeholder="例如：丙火" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-slate-400">
                      職業
                      <input value={occupation} onChange={(e) => setOccupation(e.target.value)} className="h-10 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-slate-400">
                      婚姻狀態
                      <input value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)} className="h-10 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-slate-400 sm:col-span-2">
                      管理員備註（會注入之後的 AI 解盤提示）
                      <textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={3} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
                    </label>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={saveChartEdits}
                    className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 px-4 text-sm font-bold text-slate-950 disabled:opacity-60"
                  >
                    <Save className="size-4" /> 儲存命盤更改
                  </button>
                </section>
              )}

              {report && (
                <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                  <h3 className="mb-3 text-sm font-bold text-slate-200">
                    編輯報告 · {REPORT_LABEL[report.meta.type] || report.meta.type}
                    {report.meta.year ? ` · ${report.meta.year}` : ''}
                  </h3>
                  <label className="mb-3 flex flex-col gap-1 text-xs text-slate-400">
                    摘要
                    <input value={reportSummary} onChange={(e) => setReportSummary(e.target.value)} className="h-10 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100" />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-slate-400">
                    完整報告正文（Markdown）
                    <textarea
                      value={reportText}
                      onChange={(e) => setReportText(e.target.value)}
                      rows={18}
                      className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-[13px] leading-relaxed text-slate-100"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={saveReportEdits}
                    className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 px-4 text-sm font-bold text-slate-950 disabled:opacity-60"
                  >
                    <Save className="size-4" /> 儲存報告更改
                  </button>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
