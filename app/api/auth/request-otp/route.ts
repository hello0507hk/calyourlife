import { NextRequest, NextResponse } from 'next/server';
import { clientIp, requestOtp } from '@/lib/userAuth';

export async function POST(req: NextRequest) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '無效的請求。' }, { status: 400 });
  }

  try {
    const result = await requestOtp(body.email || '', clientIp(req.headers));
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[auth] request-otp failed', error);
    return NextResponse.json({ error: '驗證碼發送失敗，請稍後再試。' }, { status: 500 });
  }
}
