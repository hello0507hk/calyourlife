import { redis } from '@/lib/redis';
import { splitReport } from '@/lib/reportFormat';

const MAX_CHARTS = 40;
const MAX_REPORTS = 80;
const RETENTION_SECONDS = 60 * 60 * 24 * 800;

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

export function chartIdFromBirth(input: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  gender: string;
  longitude: number;
}) {
  const lon = Number(input.longitude).toFixed(2);
  return `c_${input.year}${String(input.month).padStart(2, '0')}${String(input.day).padStart(2, '0')}_${String(input.hour).padStart(2, '0')}${String(input.minute).padStart(2, '0')}_${input.gender}_${lon}`;
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

function parseJson<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
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
  const next: ChartSnapshot = {
    ...existing,
    ...chart,
    useGod: chart.useGod || existing?.useGod,
    savedAt: Date.now(),
  };
  await redis.hset(key, { [chart.id]: JSON.stringify(next) });
  await redis.expire(key, RETENTION_SECONDS);
  await pruneHash(key, MAX_CHARTS, (item) => Number(item.savedAt) || 0);
  return next;
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

  if (useGod) {
    const chart = await getChart(uid, meta.chartId);
    if (chart) await saveChart(uid, { ...chart, useGod });
  }

  const dropped = await pruneHash(rKey, MAX_REPORTS, (item) => Number(item.createdAt) || 0);
  if (dropped?.length && redis) {
    for (const d of dropped) await redis.del(reportBodyKey(uid, d.id));
  }
  return record;
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
