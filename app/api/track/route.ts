import { NextRequest, userAgent } from 'next/server';
import { recordService, recordVisit } from '@/lib/stats';

const CLIENT_EVENTS = new Set(['chart']);

export async function POST(req: NextRequest) {
  const { isBot, device } = userAgent(req);
  if (isBot) return new Response(null, { status: 204 });

  let body: { event?: string; visitorId?: string; referrer?: string };
  try {
    body = JSON.parse(await req.text());
  } catch {
    return new Response(null, { status: 400 });
  }

  try {
    if (body.event === 'visit') {
      const visitorId = typeof body.visitorId === 'string' ? body.visitorId.slice(0, 64) : '';
      if (!visitorId) return new Response(null, { status: 400 });
      const referrer = typeof body.referrer === 'string' ? body.referrer.slice(0, 100).toLowerCase() : undefined;
      await recordVisit({
        visitorId,
        country: req.headers.get('x-vercel-ip-country') || 'XX',
        device: device.type || 'desktop',
        referrer: referrer || undefined,
      });
    } else if (body.event && CLIENT_EVENTS.has(body.event)) {
      await recordService(body.event);
    } else {
      return new Response(null, { status: 400 });
    }
  } catch (error) {
    console.error('[track] failed to record', error);
  }
  return new Response(null, { status: 204 });
}
