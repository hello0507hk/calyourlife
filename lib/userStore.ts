import { chartIdFromBirth } from '@/lib/chartIdentity';
import { redis } from '@/lib/redis';
import { splitReport } from '@/lib/reportFormat';

export { chartIdFromBirth };

const MAX_CHARTS = 40;
/** Keep a long history of every reading for admin review; do not aggressively prune. */
const MAX_REPORTS = 2000;
const RETENTION_SECONDS = 60 * 60 * 24 * 3650; // ~10 years
const ADMIN_REPORT_INDEX = 'admin:report-index';

export type AdminReportIndexEntry = {
  uid: string;
  email: string;
  reportId: string;
  chartId: string;
  type: ReportMeta['type'];
  year?: number;
  question?: string;
  createdAt: number;
  useGod?: string;
  summary?: string;
  pillarsText?: string;
  birthLabel?: string;
};

export type ChartSnapshot = {
  id: string;
  savedAt: number;
  name?: string;
  gender: 'male' | 'female';
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  longitude: number;
  trueSolar: boolean;
  occupation?: string;
  maritalStatus?: string;
  dayGan?: string;
  dayGanWuxing?: string;
  pillarsText?: string;
  solarDate?: string;
  useGod?: string;
  /** When true, AI analysis must keep this useGod; user/AI saves cannot overwrite it. */
  useGodLocked?: boolean;
  /** Free-text admin guidance injected into later AI prompts. */
  adminNote?: string;
  adminEditedAt?: number;
};

export type ReportMeta = {
  id: string;
  chartId: string;
  type: 'deep' | 'yearly' | 'yearly_qa';
  year?: number;
  question?: string;
  createdAt: number;
  useGod?: string;
  summary?: string;
  emailedAt?: number;
  adminEditedAt?: number;
};

export type UserAccountSummary = {
  uid: string;
  email: string;
  updatedAt: number;
  chartCount: number;
  reportCount: number;
};

function chartsKey(uid: string) {
  return `user:${uid}:charts`;
}
function reportsKey(uid: string) {
  return `user:${uid}:reports`;
}
function reportBodyKey(uid: string, reportId: string) {
  return `user:${uid}:report:${reportId}`;
}

function asRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v == null) continue;
    out[k] = typeof v === 'string' ? v : JSON.stringify(v);
  }
  return out;
}

/** Upstash may auto-deserialize JSON hash values into objects. */
function parseJson<T>(raw: unknown): T | null {
  if (raw == null) return null;
  if (typeof raw === 'object') return raw as T;
  if (typeof raw !== 'string' || !raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function pruneHash(key: string, keep: number, getTime: (item: Record<string, unknown>) => number) {
  if (!redis) return;
  const all = asRecord(await redis.hgetall(key));
  const entries = Object.entries(all)
    .map(([id, raw]) => ({ id, data: parseJson<Record<string, unknown>>(raw) }))
    .filter((e): e is { id: string; data: Record<string, unknown> } => !!e.data)
    .sort((a, b) => getTime(b.data) - getTime(a.data));
  if (entries.length <= keep) return;
  const drop = entries.slice(keep);
  if (drop.length) await redis.hdel(key, ...drop.map((d) => d.id));
  return drop;
}

export async function saveChart(uid: string, chart: ChartSnapshot) {
  if (!redis) throw new Error('Redis not configured');
  const key = chartsKey(uid);
  const existing = parseJson<ChartSnapshot>(await redis.hget(key, chart.id));
  const locked = !!(existing?.useGodLocked || chart.useGodLocked);
  const next: ChartSnapshot = {
    ...existing,
    ...chart,
    useGod: locked ? existing?.useGod || chart.useGod : chart.useGod || existing?.useGod,
    useGodLocked: locked,
    adminNote: chart.adminNote !== undefined ? chart.adminNote : existing?.adminNote,
    adminEditedAt: chart.adminEditedAt ?? existing?.adminEditedAt,
    savedAt: Date.now(),
  };
  await redis.hset(key, { [chart.id]: JSON.stringify(next) });
  await redis.expire(key, RETENTION_SECONDS);
  await pruneHash(key, MAX_CHARTS, (item) => Number(item.savedAt) || 0);
  return next;
}

/** Admin overwrite — may change locked useGod and notes. */
export async function adminSaveChart(uid: string, chart: ChartSnapshot) {
  if (!redis) throw new Error('Redis not configured');
  const key = chartsKey(uid);
  const existing = parseJson<ChartSnapshot>(await redis.hget(key, chart.id));
  const next: ChartSnapshot = {
    ...existing,
    ...chart,
    useGodLocked: chart.useGodLocked ?? true,
    adminEditedAt: Date.now(),
    savedAt: Date.now(),
  };
  await redis.hset(key, { [chart.id]: JSON.stringify(next) });
  await redis.expire(key, RETENTION_SECONDS);
  return next;
}

export async function adminSaveReport(
  uid: string,
  reportId: string,
  patch: { text?: string; summary?: string; useGod?: string; question?: string }
) {
  if (!redis) throw new Error('Redis not configured');
  const existing = await getReport(uid, reportId);
  if (!existing) throw new Error('Report not found');

  const text = patch.text !== undefined ? patch.text : existing.text;
  const { markdown, data } = splitReport(text);
  const meta: ReportMeta = {
    ...existing.meta,
    summary: patch.summary !== undefined ? patch.summary : existing.meta.summary || data?.summary || data?.verdict,
    useGod: patch.useGod !== undefined ? patch.useGod : existing.meta.useGod || data?.useGod,
    question: patch.question !== undefined ? patch.question : existing.meta.question,
    adminEditedAt: Date.now(),
  };

  await redis.hset(reportsKey(uid), { [reportId]: JSON.stringify(meta) });
  await redis.set(reportBodyKey(uid, reportId), markdown || text, { ex: RETENTION_SECONDS });
  await redis.expire(reportsKey(uid), RETENTION_SECONDS);

  let chart = await getChart(uid, meta.chartId);
  if (meta.useGod) {
    if (chart) {
      chart = await adminSaveChart(uid, {
        ...chart,
        useGod: meta.useGod,
        useGodLocked: true,
      });
    }
  }
  await indexReportForAdmin(uid, meta, chart);
  return { meta, text: markdown || text };
}

export async function listUserAccounts(): Promise<UserAccountSummary[]> {
  if (!redis) return [];
  const keys = (await redis.keys('user:*:meta')) as string[];
  const accounts: UserAccountSummary[] = [];
  for (const key of keys) {
    const match = /^user:([^:]+):meta$/.exec(key);
    if (!match) continue;
    const uid = match[1];
    const meta = asRecord(await redis.hgetall(key));
    const charts = asRecord(await redis.hgetall(chartsKey(uid)));
    const reports = asRecord(await redis.hgetall(reportsKey(uid)));
    accounts.push({
      uid,
      email: meta.email || uid,
      updatedAt: Number(meta.updatedAt) || 0,
      chartCount: Object.keys(charts).length,
      reportCount: Object.keys(reports).length,
    });
  }
  return accounts.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function listCharts(uid: string): Promise<ChartSnapshot[]> {
  if (!redis) return [];
  const all = asRecord(await redis.hgetall(chartsKey(uid)));
  return Object.values(all)
    .map((raw) => parseJson<ChartSnapshot>(raw))
    .filter((c): c is ChartSnapshot => !!c?.id)
    .sort((a, b) => b.savedAt - a.savedAt);
}

export async function getChart(uid: string, chartId: string): Promise<ChartSnapshot | null> {
  if (!redis) return null;
  return parseJson<ChartSnapshot>(await redis.hget(chartsKey(uid), chartId));
}

/** Match a saved chart even if minute in the id differs slightly. */
export async function findChartForBirth(
  uid: string,
  birth: {
    year: number;
    month: number;
    day: number;
    hour: number;
    gender: string;
    longitude: number;
    chartId?: string;
  }
): Promise<ChartSnapshot | null> {
  if (birth.chartId) {
    const exact = await getChart(uid, birth.chartId);
    if (exact) return exact;
  }
  const charts = await listCharts(uid);
  const lon = Number(birth.longitude).toFixed(2);
  return (
    charts.find(
      (c) =>
        c.year === birth.year &&
        c.month === birth.month &&
        c.day === birth.day &&
        c.hour === birth.hour &&
        c.gender === birth.gender &&
        Number(c.longitude).toFixed(2) === lon
    ) || null
  );
}

export async function saveReport(
  uid: string,
  meta: Omit<ReportMeta, 'createdAt' | 'useGod' | 'summary'> & { text: string; useGod?: string; summary?: string }
) {
  if (!redis) throw new Error('Redis not configured');
  const { markdown, data } = splitReport(meta.text);
  const useGod = meta.useGod || data?.useGod;
  const summary = meta.summary || data?.summary || data?.verdict;
  const record: ReportMeta = {
    id: meta.id,
    chartId: meta.chartId,
    type: meta.type,
    year: meta.year,
    question: meta.question,
    createdAt: Date.now(),
    useGod,
    summary,
    emailedAt: meta.emailedAt,
  };

  const rKey = reportsKey(uid);
  const bodyKey = reportBodyKey(uid, meta.id);
  await redis.hset(rKey, { [meta.id]: JSON.stringify(record) });
  await redis.set(bodyKey, markdown || meta.text, { ex: RETENTION_SECONDS });
  await redis.expire(rKey, RETENTION_SECONDS);

  const chart = await getChart(uid, meta.chartId);
  if (useGod && chart && !chart.useGodLocked) await saveChart(uid, { ...chart, useGod });

  await indexReportForAdmin(uid, record, chart);

  const dropped = await pruneHash(rKey, MAX_REPORTS, (item) => Number(item.createdAt) || 0);
  if (dropped?.length && redis) {
    for (const d of dropped) {
      await redis.del(reportBodyKey(uid, d.id));
      await redis.zrem(ADMIN_REPORT_INDEX, `${uid}:${d.id}`);
    }
  }
  return record;
}

async function indexReportForAdmin(uid: string, record: ReportMeta, chart: ChartSnapshot | null) {
  if (!redis) return;
  const meta = asRecord(await redis.hgetall(`user:${uid}:meta`));
  const entry: AdminReportIndexEntry = {
    uid,
    email: meta.email || uid,
    reportId: record.id,
    chartId: record.chartId,
    type: record.type,
    year: record.year,
    question: record.question,
    createdAt: record.createdAt,
    useGod: record.useGod || chart?.useGod,
    summary: record.summary,
    pillarsText: chart?.pillarsText,
    birthLabel: chart
      ? `${chart.year}/${chart.month}/${chart.day} ${String(chart.hour).padStart(2, '0')}:${String(chart.minute ?? 0).padStart(2, '0')}`
      : undefined,
  };
  const member = `${uid}:${record.id}`;
  await redis.zadd(ADMIN_REPORT_INDEX, { score: record.createdAt, member });
  await redis.set(`admin:report-entry:${member}`, JSON.stringify(entry), { ex: RETENTION_SECONDS });
}

export async function listAdminReports(limit = 100): Promise<AdminReportIndexEntry[]> {
  if (!redis) return [];
  const members = (await redis.zrange(ADMIN_REPORT_INDEX, 0, Math.max(0, limit - 1), {
    rev: true,
  })) as string[];
  if (!members?.length) {
    // Backfill index from existing user folders (one-time style scan for older data).
    return backfillAdminReportIndex(limit);
  }
  const out: AdminReportIndexEntry[] = [];
  for (const member of members) {
    const raw = (await redis.get(`admin:report-entry:${member}`)) as string | null;
    const parsed = typeof raw === 'string' ? parseJson<AdminReportIndexEntry>(raw) : (raw as AdminReportIndexEntry | null);
    if (parsed?.reportId) out.push(parsed);
    else {
      const sep = member.indexOf(':');
      const uid = sep > 0 ? member.slice(0, sep) : '';
      const reportId = sep > 0 ? member.slice(sep + 1) : '';
      if (!uid || !reportId) continue;
      const full = await getReport(uid, reportId);
      if (!full) continue;
      const chart = await getChart(uid, full.meta.chartId);
      await indexReportForAdmin(uid, full.meta, chart);
      const meta = asRecord(await redis.hgetall(`user:${uid}:meta`));
      out.push({
        uid,
        email: meta.email || uid,
        reportId: full.meta.id,
        chartId: full.meta.chartId,
        type: full.meta.type,
        year: full.meta.year,
        question: full.meta.question,
        createdAt: full.meta.createdAt,
        useGod: full.meta.useGod || chart?.useGod,
        summary: full.meta.summary,
        pillarsText: chart?.pillarsText,
        birthLabel: chart
          ? `${chart.year}/${chart.month}/${chart.day}`
          : undefined,
      });
    }
  }
  return out;
}

async function backfillAdminReportIndex(limit: number): Promise<AdminReportIndexEntry[]> {
  if (!redis) return [];
  const accounts = await listUserAccounts();
  const collected: AdminReportIndexEntry[] = [];
  for (const account of accounts) {
    const reports = await listReports(account.uid);
    for (const report of reports) {
      const chart = await getChart(account.uid, report.chartId);
      await indexReportForAdmin(account.uid, report, chart);
      collected.push({
        uid: account.uid,
        email: account.email,
        reportId: report.id,
        chartId: report.chartId,
        type: report.type,
        year: report.year,
        question: report.question,
        createdAt: report.createdAt,
        useGod: report.useGod || chart?.useGod,
        summary: report.summary,
        pillarsText: chart?.pillarsText,
        birthLabel: chart ? `${chart.year}/${chart.month}/${chart.day}` : undefined,
      });
    }
  }
  return collected.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
}

export async function listReports(uid: string, chartId?: string): Promise<ReportMeta[]> {
  if (!redis) return [];
  const all = asRecord(await redis.hgetall(reportsKey(uid)));
  return Object.values(all)
    .map((raw) => parseJson<ReportMeta>(raw))
    .filter((r): r is ReportMeta => !!r?.id && (!chartId || r.chartId === chartId))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getReport(uid: string, reportId: string): Promise<{ meta: ReportMeta; text: string } | null> {
  if (!redis) return null;
  const meta = parseJson<ReportMeta>(await redis.hget(reportsKey(uid), reportId));
  if (!meta) return null;
  const text = (await redis.get(reportBodyKey(uid, reportId))) as string | null;
  return { meta, text: text || '' };
}

export async function markReportEmailed(uid: string, reportId: string) {
  if (!redis) return;
  const meta = parseJson<ReportMeta>(await redis.hget(reportsKey(uid), reportId));
  if (!meta) return;
  meta.emailedAt = Date.now();
  await redis.hset(reportsKey(uid), { [reportId]: JSON.stringify(meta) });
}
