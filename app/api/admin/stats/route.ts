import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// 記憶體內即時統計計數器 (伺服器運作期間紀錄)
if (!(global as any).__site_stats) {
  (global as any).__site_stats = {
    totalCalls: 0,
    callsToday: 0,
    logs: [],
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');

  const adminSecret = process.env.ADMIN_SECRET_KEY || 'admin123';
  if (secret !== adminSecret) {
    return NextResponse.json({ error: '未授權存取' }, { status: 401 });
  }

  // 1. 動態檢查 API 金鑰設置狀態
  const hasDeepseek = !!process.env.DEEPSEEK_API_KEY?.trim();
  const hasQwen = !!(process.env.QWEN_API_KEY?.trim() || process.env.OPENROUTER_API_KEY?.trim());
  const hasGrok = !!(
    process.env.XAI_API_KEY?.trim() ||
    process.env.GROK_API_KEY?.trim() ||
    process.env.OPENROUTER_API_KEY?.trim()
  );
  const hasGemini = !!process.env.GEMINI_API_KEY?.trim();

  const stats = (global as any).__site_stats;

  const aiStatus = {
    deepseek: {
      name: 'DeepSeek-V3',
      status: hasDeepseek ? 'online' : 'offline',
      keyConfigured: hasDeepseek,
    },
    qwen: {
      name: 'Qwen-2.5 / Qwen-Max',
      status: hasQwen ? 'online' : 'offline',
      keyConfigured: hasQwen,
    },
    grok: {
      name: 'xAI Grok-3 / Grok-2',
      status: hasGrok ? 'online' : 'offline',
      keyConfigured: hasGrok,
    },
    gemini: {
      name: 'Google Gemini 1.5 Flash (總審閱)',
      status: hasGemini ? 'online' : 'offline',
      keyConfigured: hasGemini,
    },
  };

  // 2. 實時批命與流量數據
  const trafficStats = {
    totalPv: stats.totalCalls,
    callsToday: stats.callsToday,
    logsCount: stats.logs.length,
  };

  return NextResponse.json({
    aiStatus,
    trafficStats,
    recentLogs: stats.logs.slice(-10).reverse(),
  });
}