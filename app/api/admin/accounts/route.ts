import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { redis } from '@/lib/redis';
import {
  adminSaveChart,
  adminSaveReport,
  getChart,
  getReport,
  listCharts,
  listReports,
  listUserAccounts,
  type ChartSnapshot,
} from '@/lib/userStore';

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: '未授權' }, { status: 401 });
  if (!redis) return NextResponse.json({ error: '尚未連接 Redis' }, { status: 503 });

  const uid = req.nextUrl.searchParams.get('uid');
  const chartId = req.nextUrl.searchParams.get('chartId');
  const reportId = req.nextUrl.searchParams.get('reportId');

  if (reportId && uid) {
    const report = await getReport(uid, reportId);
    if (!report) return NextResponse.json({ error: '找不到報告' }, { status: 404 });
    return NextResponse.json(report);
  }

  if (chartId && uid) {
    const chart = await getChart(uid, chartId);
    if (!chart) return NextResponse.json({ error: '找不到命盤' }, { status: 404 });
    const reports = await listReports(uid, chartId);
    return NextResponse.json({ chart, reports });
  }

  if (uid) {
    const charts = await listCharts(uid);
    const reports = await listReports(uid);
    return NextResponse.json({ charts, reports });
  }

  const accounts = await listUserAccounts();
  return NextResponse.json({ accounts });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: '未授權' }, { status: 401 });
  if (!redis) return NextResponse.json({ error: '尚未連接 Redis' }, { status: 503 });

  let body: {
    uid?: string;
    chart?: Partial<ChartSnapshot> & { id: string };
    report?: { id: string; text?: string; summary?: string; useGod?: string; question?: string };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '無效的請求' }, { status: 400 });
  }

  const uid = body.uid?.trim();
  if (!uid) return NextResponse.json({ error: '缺少 uid' }, { status: 400 });

  try {
    if (body.chart?.id) {
      const existing = await getChart(uid, body.chart.id);
      if (!existing) return NextResponse.json({ error: '找不到命盤' }, { status: 404 });
      const saved = await adminSaveChart(uid, {
        ...existing,
        ...body.chart,
        id: existing.id,
        useGod:
          body.chart.useGod !== undefined ? String(body.chart.useGod).slice(0, 40) : existing.useGod,
        adminNote:
          body.chart.adminNote !== undefined
            ? String(body.chart.adminNote).slice(0, 2000)
            : existing.adminNote,
        useGodLocked: body.chart.useGodLocked ?? true,
        occupation:
          body.chart.occupation !== undefined
            ? String(body.chart.occupation).slice(0, 60)
            : existing.occupation,
        maritalStatus:
          body.chart.maritalStatus !== undefined
            ? String(body.chart.maritalStatus).slice(0, 40)
            : existing.maritalStatus,
        name: body.chart.name !== undefined ? String(body.chart.name).slice(0, 40) : existing.name,
      });
      return NextResponse.json({ ok: true, chart: saved });
    }

    if (body.report?.id) {
      const saved = await adminSaveReport(uid, body.report.id, {
        text: body.report.text,
        summary: body.report.summary,
        useGod: body.report.useGod,
        question: body.report.question,
      });
      return NextResponse.json({ ok: true, report: saved });
    }

    return NextResponse.json({ error: '請提供 chart 或 report' }, { status: 400 });
  } catch (error) {
    console.error('[admin] accounts patch failed', error);
    return NextResponse.json({ error: '儲存失敗' }, { status: 500 });
  }
}
