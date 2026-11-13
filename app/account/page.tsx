'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { FolderOpen, Loader2, LogOut, Mail, RefreshCw, Sparkles } from 'lucide-react';
import { Logo } from '@/components/Logo';
import {
  fetchMe,
  logout,
  requestOtp,
  stashChartForRestore,
  verifyOtp,
  type AuthMe,
} from '@/lib/accountClient';
import type { ChartSnapshot, ReportMeta } from '@/lib/userStore';

const REPORT_LABEL: Record<string, string> = {
  deep: '深度解盤',
  yearly: '流年批算',
  yearly_qa: '流年問事',
};

function formatBirth(c: ChartSnapshot) {
  return `${c.year}年${c.month}月${c.day}日 ${String(c.hour).padStart(2, '0')}:${String(c.minute).padStart(2, '0')}`;
}

export default function AccountPage() {
  const [me, setMe] = useState<AuthMe | null>(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [charts, setCharts] = useState<ChartSnapshot[]>([]);
  const [reports, setReports] = useState<ReportMeta[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [reportText, setReportText] = useState('');

  const refresh = useCallback(async () => {
    const auth = await fetchMe();
    setMe(auth);
    if (!auth.email) {
      setCharts([]);
      setReports([]);
      return;
    }
    const [cRes, rRes] = await Promise.all([
      fetch('/api/account/charts', { cache: 'no-store' }),
      fetch('/api/account/reports', { cache: 'no-store' }),
    ]);
    if (cRes.ok) {
      const data = await cRes.json();
      setCharts(data.charts || []);
    }
    if (rRes.ok) {
      const data = await rRes.json();
      setReports(data.reports || []);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => setMe({ email: null, redis: false, emailConfigured: false }));
  }, [refresh]);

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await requestOtp(email);
      setStep('code');
      setNotice(`驗證碼已寄到 ${email.trim()}，請查收電郵（含垃圾郵件匣）。`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '發送失敗');
    } finally {
      setBusy(false);
    }
  };

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await verifyOtp(email, code);
      setCode('');
      setStep('email');
      setNotice('');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '登入失敗');
    } finally {
      setBusy(false);
    }
  };

  const doLogout = async () => {
    await logout();
    setSelected(null);
    setReportText('');
    await refresh();
  };

  const openReport = async (id: string) => {
    setSelected(id);
    setReportText('');
    const res = await fetch(`/api/account/reports?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
    if (!res.ok) {
      setError('無法載入報告');
      return;
    }
    const data = await res.json();
    setReportText(data.text || '');
  };

  const restoreChart = (chart: ChartSnapshot) => {
    stashChartForRestore(chart);
    window.location.href = '/';
  };

  const openMeta = selected ? reports.find((r) => r.id === selected) : undefined;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <Link href="/" aria-label="返回網站">
            <Logo size={36} />
          </Link>
          <div className="flex items-center gap-2">
            {me?.email && (
              <button
                type="button"
                onClick={doLogout}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 text-xs text-slate-300"
              >
                <LogOut className="size-3.5" /> 登出
              </button>
            )}
            <Link
              href="/"
              className="inline-flex h-9 items-center rounded-lg border border-slate-800 bg-slate-900 px-3 text-xs text-slate-300"
            >
              返回排盤
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-8 sm:px-6">
        <div>
          <h1 className="flex items-center gap-2 font-serif text-2xl font-bold text-amber-100">
            <FolderOpen className="size-6 text-amber-400" />
            我的命盤
          </h1>
          <p className="mt-1 text-sm text-slate-400">以電郵登入後，可查閱曾排過的出生資料、用神與完整報告。</p>
        </div>

        {me && !me.redis && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-100">
            尚未連接 Redis，無法儲存命盤資料。請在 Vercel Storage 連接 Upstash Redis 後重新部署。
          </div>
        )}
        {me && me.redis && !me.emailConfigured && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-100">
            尚未設定 <code className="text-amber-300">RESEND_API_KEY</code>，無法發送登入驗證碼與報告電郵。
          </div>
        )}

        {!me ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="size-4 animate-spin" /> 載入中…
          </div>
        ) : me.email ? (
          <>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
              已登入：<span className="font-medium text-amber-200">{me.email}</span>
            </div>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="font-serif text-lg font-bold text-slate-100">曾排過的命盤</h2>
                <button
                  type="button"
                  onClick={() => refresh()}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-800 px-2.5 text-xs text-slate-400"
                >
                  <RefreshCw className="size-3.5" /> 重新整理
                </button>
              </div>
              {charts.length === 0 ? (
                <p className="text-sm text-slate-500">尚未儲存命盤。登入後在首頁排盤或生成報告，會自動歸入此電郵資料夾。</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {charts.map((c) => (
                    <li key={c.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="font-serif text-sm font-bold text-amber-100">
                            {c.name || (c.gender === 'female' ? '坤造' : '乾造')}
                            {c.dayGan && (
                              <span className="ml-2 font-sans text-xs font-medium text-slate-400">
                                日主 {c.dayGan}
                                {c.dayGanWuxing ? `（${c.dayGanWuxing}）` : ''}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-slate-400">{formatBirth(c)}</p>
                          {c.pillarsText && <p className="mt-0.5 font-serif text-xs text-slate-300">{c.pillarsText}</p>}
                          {c.useGod && (
                            <p className="mt-1 text-xs text-emerald-300">
                              用神：<span className="font-serif font-bold">{c.useGod}</span>
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => restoreChart(c)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 px-3 text-xs font-bold text-slate-950"
                        >
                          <Sparkles className="size-3.5" /> 載入排盤
                        </button>
                      </div>
                      {reports.some((r) => r.chartId === c.id) && (
                        <ul className="mt-3 flex flex-col gap-1.5 border-t border-slate-800 pt-2">
                          {reports
                            .filter((r) => r.chartId === c.id)
                            .map((r) => (
                              <li key={r.id}>
                                <button
                                  type="button"
                                  onClick={() => openReport(r.id)}
                                  className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-slate-300 hover:bg-slate-900"
                                >
                                  <span>
                                    {REPORT_LABEL[r.type] || r.type}
                                    {r.year ? ` · ${r.year}` : ''}
                                    {r.useGod ? ` · 用神 ${r.useGod}` : ''}
                                  </span>
                                  <span className="text-slate-500">{new Date(r.createdAt).toLocaleDateString('zh-HK')}</span>
                                </button>
                              </li>
                            ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {selected && (
              <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-serif text-lg font-bold text-slate-100">報告內容</h2>
                  <button type="button" onClick={() => { setSelected(null); setReportText(''); }} className="text-xs text-slate-400">
                    關閉
                  </button>
                </div>
                {openMeta?.summary && (
                  <p className="mb-3 text-sm text-amber-100/90">{openMeta.summary}</p>
                )}
                {!reportText ? (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Loader2 className="size-4 animate-spin" /> 載入報告…
                  </div>
                ) : (
                  <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-[13px] leading-relaxed text-slate-200">
                    {reportText}
                  </pre>
                )}
              </section>
            )}
          </>
        ) : (
          <form
            onSubmit={step === 'email' ? sendCode : login}
            className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6"
          >
            <div className="flex items-center gap-2">
              <Mail className="size-5 text-amber-400" />
              <h2 className="font-serif text-lg font-bold text-amber-100">電郵登入</h2>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">
              輸入電郵收取 6 位數驗證碼，無需密碼。每個電郵對應一個資料夾，保存你曾算過的命盤與報告。
            </p>
            <label className="flex flex-col gap-1.5 text-sm text-slate-300">
              電郵
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-base text-slate-100 outline-none focus:border-amber-500"
              />
            </label>
            {step === 'code' && (
              <label className="flex flex-col gap-1.5 text-sm text-slate-300">
                驗證碼
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  autoComplete="one-time-code"
                  placeholder="6 位數字"
                  className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-base tracking-[0.3em] text-slate-100 outline-none focus:border-amber-500"
                />
              </label>
            )}
            {notice && <p className="text-sm text-emerald-300">{notice}</p>}
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={busy || !me.redis || !me.emailConfigured}
              className="h-11 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 font-bold text-slate-950 disabled:opacity-60"
            >
              {busy ? '處理中…' : step === 'email' ? '發送驗證碼' : '登入'}
            </button>
            {step === 'code' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setStep('email');
                  setCode('');
                  setError('');
                  setNotice('');
                }}
                className="text-xs text-slate-400 underline-offset-2 hover:underline"
              >
                改用其他電郵
              </button>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
