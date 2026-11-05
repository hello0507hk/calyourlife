import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const ADMIN_COOKIE = 'cyl_admin';
export const ADMIN_SESSION_SECONDS = 60 * 60 * 24 * 7;

const password = () => process.env.ADMIN_PASSWORD?.trim() || '';

export const adminConfigured = () => password().length > 0;

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Changing ADMIN_PASSWORD invalidates every existing session. */
export function sessionToken() {
  return createHmac('sha256', password()).update('calyourlife-admin-session').digest('hex');
}

export function passwordMatches(input: string) {
  return adminConfigured() && safeEqual(input, password());
}

export async function isAdmin() {
  if (!adminConfigured()) return false;
  const value = (await cookies()).get(ADMIN_COOKIE)?.value;
  return !!value && safeEqual(value, sessionToken());
}
