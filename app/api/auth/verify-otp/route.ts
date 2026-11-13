import { NextRequest, NextResponse } from 'next/server';
import { setSessionCookie, verifyOtp } from '@/lib/userAuth';

export async function POST(req: NextRequest) {
  let body: { email?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '無效的請求。' }, { status: 400 });
  }

  try {
    const result = await verifyOtp(body.email || '', body.code || '');
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });
    await setSessionCookie(result.token);
    return NextResponse.json({ ok: true, email: result.session.email });
  } catch (error) {
    console.error('[auth] verify-otp failed', error);
    return NextResponse.json({ error: '登入失敗，請稍後再試。' }, { status: 500 });
  }
}
