import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { BarChart3, Bot, Globe2, LogOut, MonitorSmartphone, Sparkles, Users, Eye, Link2 } from 'lucide-react';
import { adminConfigured, isAdmin } from '@/lib/adminAuth';
import { AI_SERVICES, SERVICE_LABELS, getStats, redis, type StatsSummary } from '@/lib/stats';
import LoginForm from './LoginForm';
import { logout } from './actions';

export const metadata: Metadata = {
  title: '後台統計 | 算命網',
  robots: { index: false, follow: false },
};

const RANGES = [7, 30, 90] as const;

const DEVICE_LABELS: Record<string, string> = {
  desktop: '電腦',
  mobile: '手機',
  tablet: '平板',
};

const regionNames = new Intl.DisplayNames(['zh-Hant'], { type: 'region' });
const SHORT_REGION_NAMES: Record<string, string> = { HK: '香港', MO: '澳門' };

function countryLabel(code: string) {
  if (!/^[A-Z]{2}$/.test(code) || code === 'XX') return '未知';
  const flag = String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
  let name = code;
  try {
    name = SHORT_REGION_NAMES[code] ?? regionNames.of(code) ?? code;
  } catch {
    // 未知代碼沿用原字串
  }
  return `${flag} ${name}`;
}

const fmt = (n: number) => n.toLocaleString('en-US');
const sum = (counts: Record<string, number>, keys: string[]) => keys.reduce((s, key) => s + (counts[key] ?? 0), 0);
const sorted = (counts: Record<string, number>) => Object.entries(counts).sort((a, b) => b[1] - a[1]);

function Card({ title, icon: Icon, children }: { title: string; icon: typeof Eye; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-200">
        <Icon className="size-4 text-amber-400" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function StatTile({ label, value, sub, icon: Icon }: { label: string; value: number; sub: string; icon: typeof Eye }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        <Icon className="size-3.5 text-amber-400" />
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-bold tabular-nums text-amber-100 sm:text-3xl">{fmt(value)}</div>
      <div className="mt-1 text-xs text-slate-500">{sub}</div>
    </div>
  );
}

function BarList({ items, empty = '暫時未有資料' }: { items: { label: string; value: number }[]; empty?: string }) {
  const total = items.reduce((s, i) => s + i.value, 0);
  if (!total) return <p className="text-sm text-slate-500">{empty}</p>;
  const max = Math.max(...items.map((i) => i.value));
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.label} className="text-sm">
          <div className="mb-1 flex justify-between gap-3">
            <span className="truncate text-slate-200">{item.label}</span>
            <span className="shrink-0 tabular-nums text-slate-400">
              {fmt(item.value)} <span className="text-slate-600">· {Math.round((item.value / total) * 100)}%</span>
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-300" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function DailyChart({ days }: { days: StatsSummary['days'] }) {
  const max = Math.max(1, ...days.map((d) => d.views));
  const labelEvery = days.length > 31 ? 15 : days.length > 7 ? 5 : 1;
  return (
    <div>
      <div className="flex h-44 items-end gap-px sm:gap-0.5">
        {days.map((d) => (
          <div
            key={d.day}
            title={`${d.day}：瀏覽 ${d.views}，訪客 ${d.visitors}`}
            className="relative flex-1 rounded-t bg-amber-500/25"
            style={{ height: `${Math.max(d.views ? 3 : 0, (d.views / max) * 100)}%` }}
          >
            <div className="absolute inset-x-0 bottom-0 rounded-t bg-amber-400" style={{ height: `${d.views ? (d.visitors / d.views) * 100 : 0}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-px text-[10px] text-slate-500 sm:gap-0.5">
        {days.map((d, i) => (
          <span key={d.day} className="flex-1 whitespace-nowrap text-center">
            {(i % labelEvery === 0 && days.length - 1 - i >= labelEvery / 2) || i === days.length - 1
              ? d.day.slice(5)
              : ''}
          </span>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-amber-500/25" />瀏覽次數</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-amber-400" />獨立訪客</span>
      </div>
    </div>
  );
}

function SetupNotice() {
  return (
    <section className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm leading-relaxed text-amber-100">
      <h2 className="mb-2 font-bold">尚未連接統計資料庫</h2>
      <ol className="list-decimal space-y-1 pl-5 text-amber-100/90">
        <li>在 Vercel 專案 calyourlife 進入 Storage，選擇 Upstash for Redis 並建立資料庫。</li>
        <li>把資料庫連接到 calyourlife 專案（Production 及 Preview），Vercel 會自動加入連線環境變數。</li>
        <li>重新部署網站，之後的訪客及服務使用就會開始記錄。</li>
      </ol>
    </section>
  );
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await connection();
  if (!(await isAdmin())) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
        {adminConfigured() ? (
          <LoginForm />
        ) : (
          <p className="max-w-sm text-center text-sm leading-relaxed text-slate-300">
            後台未啟用。請先在 Vercel 專案的 Environment Variables 加入 <code className="text-amber-300">ADMIN_PASSWORD</code>，然後重新部署。
          </p>
        )}
      </main>
    );
  }

  const requested = Number((await searchParams).days);
  const range = RANGES.includes(requested as (typeof RANGES)[number]) ? requested : 30;
  const stats = redis ? await getStats(range) : null;
  const today = stats?.days[stats.days.length - 1];

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 bg-slate-950 p-4 sm:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-serif text-xl font-bold text-amber-100 sm:text-2xl">
            <BarChart3 className="size-6 text-amber-400" />
            網站統計後台
          </h1>
          <p className="mt-1 text-xs text-slate-500">以香港時間計算 · 最近 {range} 日</p>
        </div>
        <div className="flex items-center gap-2">
          <nav className="flex rounded-lg border border-slate-800 bg-slate-900 p-0.5 text-sm">
            {RANGES.map((r) => (
              <Link
                key={r}
                href={`/admin?days=${r}`}
                className={`rounded-md px-3 py-1.5 ${r === range ? 'bg-amber-500 font-bold text-slate-950' : 'text-slate-300 hover:text-amber-200'}`}
              >
                {r} 日
              </Link>
            ))}
          </nav>
          <Link href="/" className="rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-300 hover:text-amber-200">
            返回網站
          </Link>
          <form action={logout}>
            <button type="submit" className="flex items-center gap-1.5 rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-300 hover:text-red-300">
              <LogOut className="size-4" />
              登出
            </button>
          </form>
        </div>
      </header>

      {!stats ? (
        <SetupNotice />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile icon={Eye} label="瀏覽次數" value={stats.days.reduce((s, d) => s + d.views, 0)} sub={`今日 ${fmt(today?.views ?? 0)}`} />
            <StatTile icon={Users} label="獨立訪客" value={stats.uniqueVisitors} sub={`今日 ${fmt(today?.visitors ?? 0)}`} />
            <StatTile icon={Sparkles} label="排盤次數" value={stats.services.chart ?? 0} sub={`今日 ${fmt(today?.services.chart ?? 0)}`} />
            <StatTile
              icon={Bot}
              label="AI 報告"
              value={sum(stats.services, AI_SERVICES)}
              sub={`今日 ${fmt(today ? sum(today.services, AI_SERVICES) : 0)} · 失敗 ${fmt(stats.services.failed ?? 0)}`}
            />
          </div>

          <Card title="每日瀏覽及訪客" icon={BarChart3}>
            <DailyChart days={stats.days} />
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card title="訪客國籍／地區" icon={Globe2}>
              <BarList items={sorted(stats.countries).slice(0, 15).map(([code, value]) => ({ label: countryLabel(code), value }))} />
            </Card>
            <Card title="服務使用" icon={Sparkles}>
              <BarList
                items={Object.keys(SERVICE_LABELS)
                  .filter((key) => stats.services[key])
                  .map((key) => ({ label: SERVICE_LABELS[key], value: stats.services[key] }))}
              />
            </Card>
            <Card title="使用裝置" icon={MonitorSmartphone}>
              <BarList items={sorted(stats.devices).map(([key, value]) => ({ label: DEVICE_LABELS[key] ?? key, value }))} />
            </Card>
            <Card title="來源網站" icon={Link2}>
              <BarList items={sorted(stats.referrers).slice(0, 10).map(([label, value]) => ({ label, value }))} empty="暫時未有從其他網站進入的訪客" />
            </Card>
          </div>
        </>
      )}
    </main>
  );
}
