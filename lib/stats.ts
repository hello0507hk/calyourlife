import { Redis } from '@upstash/redis';

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

export const redis = url && token ? new Redis({ url, token }) : null;

export const SERVICE_LABELS: Record<string, string> = {
  chart: '星平合參排盤',
  deep: '深度解盤',
  yearly: '流年批算',
  yearly_qa: '問事',
  continue: '續寫餘下報告',
  failed: 'AI 批算失敗',
  other: '其他',
};

export const AI_SERVICES = ['deep', 'yearly', 'yearly_qa'];

const RETENTION_SECONDS = 60 * 60 * 24 * 400;
const HK_OFFSET_MS = 8 * 60 * 60 * 1000;

/** 以香港時間計算的日期鍵，例如 2026-11-06 */
export function dayKey(date = new Date()) {
  return new Date(date.getTime() + HK_OFFSET_MS).toISOString().slice(0, 10);
}

function lastDays(days: number) {
  const now = Date.now();
  return Array.from({ length: days }, (_, i) => dayKey(new Date(now - (days - 1 - i) * 86_400_000)));
}

const k = (day: string, field: string) => `stats:${day}:${field}`;

export async function recordVisit(visit: { visitorId: string; country: string; device: string; referrer?: string }) {
  if (!redis) return;
  const day = dayKey();
  const keys = [k(day, 'views'), k(day, 'visitors'), k(day, 'country'), k(day, 'device')];
  const p = redis.pipeline();
  p.incr(keys[0]);
  p.pfadd(keys[1], visit.visitorId);
  p.hincrby(keys[2], visit.country, 1);
  p.hincrby(keys[3], visit.device, 1);
  if (visit.referrer) {
    keys.push(k(day, 'referrer'));
    p.hincrby(k(day, 'referrer'), visit.referrer, 1);
  }
  for (const key of keys) p.expire(key, RETENTION_SECONDS);
  await p.exec();
}

export async function recordService(service: string) {
  if (!redis) return;
  const key = k(dayKey(), 'service');
  const p = redis.pipeline();
  p.hincrby(key, service, 1);
  p.expire(key, RETENTION_SECONDS);
  await p.exec();
}

type Counts = Record<string, number>;

export interface DailyStats {
  day: string;
  views: number;
  visitors: number;
  services: Counts;
}

export interface StatsSummary {
  days: DailyStats[];
  uniqueVisitors: number;
  countries: Counts;
  devices: Counts;
  referrers: Counts;
  services: Counts;
}

function addCounts(target: Counts, source: Record<string, unknown> | null) {
  if (!source) return;
  for (const [key, value] of Object.entries(source)) target[key] = (target[key] ?? 0) + (Number(value) || 0);
}

export async function getStats(range: number): Promise<StatsSummary | null> {
  if (!redis) return null;
  const days = lastDays(range);

  const p = redis.pipeline();
  for (const day of days) {
    p.get(k(day, 'views'));
    p.pfcount(k(day, 'visitors'));
    p.hgetall(k(day, 'service'));
    p.hgetall(k(day, 'country'));
    p.hgetall(k(day, 'device'));
    p.hgetall(k(day, 'referrer'));
  }
  p.pfcount(...(days.map((day) => k(day, 'visitors')) as [string, ...string[]]));
  const results = await p.exec<unknown[]>();

  const summary: StatsSummary = {
    days: [],
    uniqueVisitors: Number(results[results.length - 1]) || 0,
    countries: {},
    devices: {},
    referrers: {},
    services: {},
  };

  days.forEach((day, i) => {
    const [views, visitors, services, countries, devices, referrers] = results.slice(i * 6, i * 6 + 6) as [
      unknown,
      unknown,
      Counts | null,
      Counts | null,
      Counts | null,
      Counts | null,
    ];
    const dayServices: Counts = {};
    addCounts(dayServices, services);
    summary.days.push({ day, views: Number(views) || 0, visitors: Number(visitors) || 0, services: dayServices });
    addCounts(summary.services, services);
    addCounts(summary.countries, countries);
    addCounts(summary.devices, devices);
    addCounts(summary.referrers, referrers);
  });

  return summary;
}

const LOGIN_LIMIT = 8;
const LOGIN_WINDOW_SECONDS = 15 * 60;

/** 登入失敗次數上限，防止暴力破解；Redis 未設定時不限制 */
export async function loginBlocked(ip: string) {
  if (!redis) return false;
  return (Number(await redis.get(`admin-login-fail:${ip}`)) || 0) >= LOGIN_LIMIT;
}

export async function recordLoginFailure(ip: string) {
  if (!redis) return;
  const key = `admin-login-fail:${ip}`;
  const p = redis.pipeline();
  p.incr(key);
  p.expire(key, LOGIN_WINDOW_SECONDS);
  await p.exec();
}
