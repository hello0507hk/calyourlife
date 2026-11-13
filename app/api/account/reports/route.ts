import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { emailConfigured, sendReportEmail } from '@/lib/email';
import { redis } from '@/lib/redis';
import { getSession } from '@/lib/userAuth';
import {
  chartIdFromBirth,
  getReport,
  listReports,
  markReportEmailed,
  saveChart,
  saveReport,
  type ChartSnapshot,
} from '@/lib/userStore';
import { splitReport } from '@/lib/reportFormat';

const REPORT_LABELS = {
  deep: '深度解盤',
  yearly: '流年批算',
  yearly_qa: '流年問事',
} as const;

function dayEmailKey(uid: string) {
  const day = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
  return `auth:email-day:${uid}:${day}`;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '請先登入。' }, { status: 401 });

  const reportId = req.nextUrl.searchParams.get('id');
  if (reportId) {
    const report = await getReport(session.uid, reportId);
    if (!report) return NextResponse.json({ error: '找不到此報告。' }, { status: 404 });
    return NextResponse.json(report);
  }

  const chartId = req.nextUrl.searchParams.get('chartId') || undefined;
  const reports = await listReports(session.uid, chartId);
  return NextResponse.json({ reports });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '請先登入。' }, { status: 401 });
  if (!redis) return NextResponse.json({ error: '尚未連接資料庫。' }, { status: 503 });

  let body: {
    text?: string;
    type?: 'deep' | 'yearly' | 'yearly_qa';
    year?: number;
    question?: string;
    chart?: Partial<ChartSnapshot>;
    sendEmail?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '無效的請求。' }, { status: 400 });
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const type = body.type;
  if (!text || text.length < 40) return NextResponse.json({ error: '報告內容過短。' }, { status: 400 });
  if (text.length > 200_000) return NextResponse.json({ error: '報告過長。' }, { status: 400 });
  if (!type || !['deep', 'yearly', 'yearly_qa'].includes(type)) {
    return NextResponse.json({ error: '報告類型無效。' }, { status: 400 });
  }

  const chartInput = body.chart || {};
  const year = Number(chartInput.year);
  const month = Number(chartInput.month);
  const day = Number(chartInput.day);
  const hour = Number(chartInput.hour);
  const minute = Number(chartInput.minute ?? 0);
  const longitude = Number(chartInput.longitude);
  const gender = chartInput.gender === 'female' ? 'female' : 'male';
  if (![year, month, day, hour, longitude].every((n) => Number.isFinite(n))) {
    return NextResponse.json({ error: '命盤資料不完整，無法歸檔。' }, { status: 400 });
  }

  const chartId =
    chartInput.id || chartIdFromBirth({ year, month, day, hour, minute, gender, longitude });
  const { data } = splitReport(text);

  try {
    await saveChart(session.uid, {
      id: chartId,
      savedAt: Date.now(),
      name: typeof chartInput.name === 'string' ? chartInput.name.slice(0, 40) : undefined,
      gender,
      year,
      month,
      day,
      hour,
      minute,
      longitude,
      trueSolar: !!chartInput.trueSolar,
      occupation: typeof chartInput.occupation === 'string' ? chartInput.occupation.slice(0, 60) : undefined,
      maritalStatus: typeof chartInput.maritalStatus === 'string' ? chartInput.maritalStatus.slice(0, 40) : undefined,
      dayGan: typeof chartInput.dayGan === 'string' ? chartInput.dayGan : undefined,
      dayGanWuxing: typeof chartInput.dayGanWuxing === 'string' ? chartInput.dayGanWuxing : undefined,
      pillarsText: typeof chartInput.pillarsText === 'string' ? chartInput.pillarsText.slice(0, 80) : undefined,
      solarDate: typeof chartInput.solarDate === 'string' ? chartInput.solarDate : undefined,
      useGod: data?.useGod,
    });

    const reportId = `r_${Date.now().toString(36)}_${randomBytes(4).toString('hex')}`;
    let emailedAt: number | undefined;
    let emailError: string | undefined;

    if (body.sendEmail !== false) {
      if (!emailConfigured()) {
        emailError = '尚未設定寄信服務，報告已存檔但未能寄出。';
      } else {
        const count = Number((await redis.incr(dayEmailKey(session.uid))) || 0);
        if (count === 1) await redis.expire(dayEmailKey(session.uid), 60 * 60 * 36);
        if (count > 12) {
          emailError = '今日寄信次數已達上限，報告已存檔。';
        } else {
          const titleParts: string[] = [REPORT_LABELS[type]];
          if (type !== 'deep' && body.year) titleParts.push(String(body.year));
          if (typeof chartInput.solarDate === 'string') titleParts.push(chartInput.solarDate);
          try {
            await sendReportEmail({
              to: session.email,
              title: titleParts.join(' · '),
              markdown: splitReport(text).markdown || text,
            });
            emailedAt = Date.now();
          } catch (error) {
            console.error('[account] send report email failed', error);
            emailError = '寄信失敗，報告已存檔。請稍後在「我的命盤」重寄。';
          }
        }
      }
    }

    const meta = await saveReport(session.uid, {
      id: reportId,
      chartId,
      type,
      year: body.year,
      question: typeof body.question === 'string' ? body.question.slice(0, 200) : undefined,
      text,
      useGod: data?.useGod,
      summary: data?.summary || data?.verdict,
      emailedAt,
    });
    if (emailedAt) await markReportEmailed(session.uid, reportId);

    return NextResponse.json({ ok: true, report: meta, emailed: !!emailedAt, emailError });
  } catch (error) {
    console.error('[account] save report failed', error);
    return NextResponse.json({ error: '儲存報告失敗。' }, { status: 500 });
  }
}
