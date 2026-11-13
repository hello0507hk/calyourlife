import { createHash, randomBytes, randomInt } from 'node:crypto';
import { cookies } from 'next/headers';
import { redis } from '@/lib/redis';
import { emailConfigured, emailLayout, escapeHtml, sendEmail } from '@/lib/email';

export const USER_COOKIE = 'cyl_user';
export const USER_SESSION_SECONDS = 60 * 60 * 24 * 30;
const OTP_SECONDS = 60 * 10;
const OTP_RATE_SECONDS = 60 * 15;
const OTP_MAX_PER_EMAIL = 5;
const OTP_MAX_PER_IP = 12;

export type UserSession = { email: string; uid: string; createdAt: number };

export function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 120;
}

/** Stable folder id for an email address (not reversible). */
export function emailUid(email: string) {
  return createHash('sha256').update(normalizeEmail(email)).digest('hex').slice(0, 24);
}

function otpKey(uid: string) {
  return `auth:otp:${uid}`;
}
function sessionKey(token: string) {
  return `auth:session:${token}`;
}
function rateEmailKey(uid: string) {
  return `auth:otp-rate:email:${uid}`;
}
function rateIpKey(ip: string) {
  return `auth:otp-rate:ip:${ip || 'unknown'}`;
}

export async function requestOtp(emailRaw: string, ip: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!redis) return { ok: false, error: '尚未連接資料庫，暫時無法登入。' };
  if (!emailConfigured()) return { ok: false, error: '尚未設定寄信服務，暫時無法發送驗證碼。' };

  const email = normalizeEmail(emailRaw);
  if (!isValidEmail(email)) return { ok: false, error: '請輸入有效的電郵地址。' };

  const uid = emailUid(email);
  const emailCount = Number((await redis.incr(rateEmailKey(uid))) || 0);
  if (emailCount === 1) await redis.expire(rateEmailKey(uid), OTP_RATE_SECONDS);
  if (emailCount > OTP_MAX_PER_EMAIL) return { ok: false, error: '此電郵請求過於頻繁，請稍後再試。' };

  const ipCount = Number((await redis.incr(rateIpKey(ip))) || 0);
  if (ipCount === 1) await redis.expire(rateIpKey(ip), OTP_RATE_SECONDS);
  if (ipCount > OTP_MAX_PER_IP) return { ok: false, error: '請求過於頻繁，請稍後再試。' };

  const code = String(randomInt(100000, 999999));
  await redis.set(otpKey(uid), { code, email, attempts: 0 }, { ex: OTP_SECONDS });

  await sendEmail({
    to: email,
    subject: '算命網登入驗證碼',
    text: `您的驗證碼是 ${code}，${OTP_SECONDS / 60} 分鐘內有效。若非本人操作，請忽略此信。`,
    html: emailLayout(
      '登入驗證碼',
      `<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#1e293b">您正在登入算命網。驗證碼為：</p>
       <p style="margin:0 0 16px;font-size:28px;font-weight:700;letter-spacing:0.2em;color:#b45309">${escapeHtml(code)}</p>
       <p style="margin:0;font-size:13px;color:#64748b">${OTP_SECONDS / 60} 分鐘內有效。若非本人操作，請忽略此信。</p>`
    ),
  });

  return { ok: true };
}

export async function verifyOtp(
  emailRaw: string,
  codeRaw: string
): Promise<{ ok: true; session: UserSession; token: string } | { ok: false; error: string }> {
  if (!redis) return { ok: false, error: '尚未連接資料庫，暫時無法登入。' };

  const email = normalizeEmail(emailRaw);
  const code = codeRaw.trim();
  if (!isValidEmail(email)) return { ok: false, error: '請輸入有效的電郵地址。' };
  if (!/^\d{6}$/.test(code)) return { ok: false, error: '請輸入 6 位數字驗證碼。' };

  const uid = emailUid(email);
  const stored = (await redis.get(otpKey(uid))) as { code?: string; email?: string; attempts?: number } | null;
  if (!stored?.code) return { ok: false, error: '驗證碼已過期，請重新取得。' };

  const attempts = Number(stored.attempts || 0) + 1;
  if (attempts > 8) {
    await redis.del(otpKey(uid));
    return { ok: false, error: '嘗試驗證次數過多，請重新取得驗證碼。' };
  }
  if (stored.code !== code || normalizeEmail(stored.email || '') !== email) {
    await redis.set(otpKey(uid), { ...stored, attempts }, { ex: OTP_SECONDS });
    return { ok: false, error: '驗證碼不正確。' };
  }

  await redis.del(otpKey(uid));
  const token = randomBytes(32).toString('hex');
  const session: UserSession = { email, uid, createdAt: Date.now() };
  await redis.set(sessionKey(token), session, { ex: USER_SESSION_SECONDS });
  await redis.hset(`user:${uid}:meta`, { email, updatedAt: String(Date.now()) });
  return { ok: true, session, token };
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(USER_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: USER_SESSION_SECONDS,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(USER_COOKIE);
}

export async function getSession(): Promise<UserSession | null> {
  if (!redis) return null;
  const token = (await cookies()).get(USER_COOKIE)?.value;
  if (!token || token.length < 32) return null;
  const session = (await redis.get(sessionKey(token))) as UserSession | null;
  if (!session?.email || !session?.uid) return null;
  // Sliding expiry
  await redis.expire(sessionKey(token), USER_SESSION_SECONDS);
  return session;
}

export async function destroySession() {
  if (!redis) {
    await clearSessionCookie();
    return;
  }
  const token = (await cookies()).get(USER_COOKIE)?.value;
  if (token) await redis.del(sessionKey(token));
  await clearSessionCookie();
}

export function clientIp(headers: Headers) {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return headers.get('x-real-ip') || 'unknown';
}
