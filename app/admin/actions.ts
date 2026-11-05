'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, ADMIN_SESSION_SECONDS, adminConfigured, passwordMatches, sessionToken } from '@/lib/adminAuth';
import { loginBlocked, recordLoginFailure } from '@/lib/stats';

export interface LoginState {
  error?: string;
}

async function clientIp() {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!adminConfigured()) return { error: '尚未在 Vercel 設定 ADMIN_PASSWORD 環境變數。' };

  const ip = await clientIp();
  if (await loginBlocked(ip)) return { error: '嘗試次數過多，請 15 分鐘後再試。' };

  const input = String(formData.get('password') ?? '');
  if (!passwordMatches(input)) {
    await recordLoginFailure(ip);
    await new Promise((r) => setTimeout(r, 600));
    return { error: '密碼不正確。' };
  }

  (await cookies()).set(ADMIN_COOKIE, sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: ADMIN_SESSION_SECONDS,
  });
  redirect('/admin');
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect('/admin');
}
