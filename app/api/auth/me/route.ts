import { NextResponse } from 'next/server';
import { emailConfigured } from '@/lib/email';
import { redis } from '@/lib/redis';
import { getSession } from '@/lib/userAuth';

export async function GET() {
  const session = await getSession();
  return NextResponse.json({
    email: session?.email ?? null,
    redis: !!redis,
    emailConfigured: emailConfigured(),
  });
}
