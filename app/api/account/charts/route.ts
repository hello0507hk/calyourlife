import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/userAuth';
import { chartIdFromBirth, getChart, listCharts, saveChart, type ChartSnapshot } from '@/lib/userStore';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '請先登入。' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (id) {
    const chart = await getChart(session.uid, id);
    if (!chart) return NextResponse.json({ error: '找不到此命盤。' }, { status: 404 });
    return NextResponse.json({ chart });
  }

  const charts = await listCharts(session.uid);
  return NextResponse.json({ charts });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '請先登入。' }, { status: 401 });

  let body: Partial<ChartSnapshot>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '無效的請求。' }, { status: 400 });
  }

  const year = Number(body.year);
  const month = Number(body.month);
  const day = Number(body.day);
  const hour = Number(body.hour);
  const minute = Number(body.minute ?? 0);
  const longitude = Number(body.longitude);
  const gender = body.gender === 'female' ? 'female' : 'male';

  if (![year, month, day, hour, longitude].every((n) => Number.isFinite(n))) {
    return NextResponse.json({ error: '出生資料不完整。' }, { status: 400 });
  }

  const chart: ChartSnapshot = {
    id: body.id || chartIdFromBirth({ year, month, day, hour, minute, gender, longitude }),
    savedAt: Date.now(),
    name: typeof body.name === 'string' ? body.name.slice(0, 40) : undefined,
    gender,
    year,
    month,
    day,
    hour,
    minute,
    longitude,
    trueSolar: !!body.trueSolar,
    occupation: typeof body.occupation === 'string' ? body.occupation.slice(0, 60) : undefined,
    maritalStatus: typeof body.maritalStatus === 'string' ? body.maritalStatus.slice(0, 40) : undefined,
    dayGan: typeof body.dayGan === 'string' ? body.dayGan : undefined,
    dayGanWuxing: typeof body.dayGanWuxing === 'string' ? body.dayGanWuxing : undefined,
    pillarsText: typeof body.pillarsText === 'string' ? body.pillarsText.slice(0, 80) : undefined,
    solarDate: typeof body.solarDate === 'string' ? body.solarDate : undefined,
    useGod: typeof body.useGod === 'string' ? body.useGod.slice(0, 20) : undefined,
  };

  try {
    const saved = await saveChart(session.uid, chart);
    return NextResponse.json({ chart: saved });
  } catch (error) {
    console.error('[account] save chart failed', error);
    return NextResponse.json({ error: '儲存失敗。' }, { status: 500 });
  }
}
