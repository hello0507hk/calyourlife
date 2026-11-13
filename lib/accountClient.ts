import type { ChartSnapshot } from '@/lib/userStore';

export type AuthMe = { email: string | null; redis: boolean; emailConfigured: boolean };

export async function fetchMe(): Promise<AuthMe> {
  const res = await fetch('/api/auth/me', { cache: 'no-store' });
  return res.json();
}

export async function requestOtp(email: string) {
  const res = await fetch('/api/auth/request-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '發送失敗');
  return data;
}

export async function verifyOtp(email: string, code: string) {
  const res = await fetch('/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '登入失敗');
  return data as { ok: true; email: string };
}

export async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
}

export function pillarsTextFromBazi(eightChar: {
  year: { gan: string; zhi: string };
  month: { gan: string; zhi: string };
  day: { gan: string; zhi: string };
  hour: { gan: string; zhi: string };
}) {
  return [eightChar.year, eightChar.month, eightChar.day, eightChar.hour]
    .map((p) => `${p.gan}${p.zhi}`)
    .join(' ');
}

export function chartPayloadFromBazi(
  bazi: {
    birthYear?: number;
    birthMonth?: number;
    birthDay?: number;
    birthHour?: number;
    longitude?: number;
    occupation?: string;
    maritalStatus?: string;
    dayGan?: string;
    dayGanWuxing?: string;
    solarDate?: string;
    genderText?: string;
    eightChar?: {
      year: { gan: string; zhi: string };
      month: { gan: string; zhi: string };
      day: { gan: string; zhi: string };
      hour: { gan: string; zhi: string };
    };
  },
  form?: {
    name?: string;
    gender?: 'male' | 'female';
    minute?: number;
    trueSolar?: boolean;
  }
): ChartSnapshot | null {
  const year = bazi.birthYear;
  const month = bazi.birthMonth;
  const day = bazi.birthDay;
  const hour = bazi.birthHour;
  const longitude = bazi.longitude;
  if ([year, month, day, hour, longitude].some((n) => n == null || !Number.isFinite(Number(n)))) return null;

  const gender =
    form?.gender ||
    (bazi.genderText?.includes('坤') || bazi.genderText?.includes('女') ? 'female' : 'male');

  return {
    id: '',
    savedAt: Date.now(),
    name: form?.name,
    gender,
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(form?.minute ?? 0),
    longitude: Number(longitude),
    trueSolar: form?.trueSolar ?? true,
    occupation: bazi.occupation,
    maritalStatus: bazi.maritalStatus,
    dayGan: bazi.dayGan,
    dayGanWuxing: bazi.dayGanWuxing,
    pillarsText: bazi.eightChar ? pillarsTextFromBazi(bazi.eightChar) : undefined,
    solarDate: bazi.solarDate,
  };
}

export async function saveChartToAccount(chart: ChartSnapshot) {
  const res = await fetch('/api/account/charts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(chart),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '儲存失敗');
  return data.chart as ChartSnapshot;
}

export async function saveReportToAccount(input: {
  text: string;
  type: 'deep' | 'yearly' | 'yearly_qa';
  year?: number;
  question?: string;
  chart: ChartSnapshot;
  sendEmail?: boolean;
}) {
  const res = await fetch('/api/account/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '儲存失敗');
  return data as { ok: true; emailed: boolean; emailError?: string; report: { id: string } };
}

export const RESTORE_KEY = 'cyl-restore-chart';

export function stashChartForRestore(chart: ChartSnapshot) {
  localStorage.setItem(RESTORE_KEY, JSON.stringify(chart));
}

export function takeRestoredChart(): ChartSnapshot | null {
  try {
    const raw = localStorage.getItem(RESTORE_KEY);
    if (!raw) return null;
    localStorage.removeItem(RESTORE_KEY);
    return JSON.parse(raw) as ChartSnapshot;
  } catch {
    return null;
  }
}
