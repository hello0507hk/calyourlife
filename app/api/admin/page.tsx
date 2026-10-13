'use client';

import React, { useState } from 'react';
import { calculateBazi } from '@/lib/bazi';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock,
  Cpu,
  FlaskConical,
  Globe,
  Lock,
  RefreshCw,
  Send,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react';

export interface BaziResult {
  solarDate: string;
  lunarDate: string;
  trueSolarText?: string;
  dayGan: string;
  dayGanWuxing: string;
  eightChar: {
    year: { gan: string; zhi: string; ganShishen: string; zangGan: string[]; zangGanShishen: string[] };
    month: { gan: string; zhi: string; ganShishen: string; zangGan: string[]; zangGanShishen: string[] };
    day: { gan: string; zhi: string; ganShishen: string; zangGan: string[]; zangGanShishen: string[] };
    hour: { gan: string; zhi: string; ganShishen: string; zangGan: string[]; zangGanShishen: string[] };
  };
  wuxingCounts: { 木: number; 火: number; 土: number; 金: number; 水: number };
  dayyun: Array<{ age: number; ganZhi: string }>;
}

export default function AdminPage() {
  const [secretKey, setSecretKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'traffic' | 'ai' | 'sandbox'>('traffic');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // 測試沙盒狀態
  const [testYear, setTestYear] = useState('1995');
  const [testMonth, setTestMonth] = useState('8');
  const [testDay, setTestDay] = useState('15');
  const [testHour, setTestHour] = useState('14');
  const [testMinute, setTestMinute] = useState('0');
  const [testGender, setTestGender] = useState<'male' | 'female'>('male');
  const [testTrueSolar, setTestTrueSolar] = useState('on');
  const [testLongitude, setTestLongitude] = useState('114.17');
  const [testType, setTestType] = useState<'deep' | 'yearly' | 'yearly_qa'>('deep');
  const [targetYear, setTargetYear] = useState(2026);
  const [testQuestion, setTestQuestion] = useState('今年事業有轉職跳槽或升遷機會嗎？');

  const [calculatedBazi, setCalculatedBazi] = useState<BaziResult | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

  const fetchStats = async (key: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/stats?secret=${encodeURIComponent(key)}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setIsAuthenticated(true);
      } else {
        alert('管理員通行金鑰錯誤！');
      }
    } catch (err) {
      alert('無法連線至後台 API');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStats(secretKey);
  };

  const handleRunTest = async () => {
    setTestLoading(true);
    setTestResult(null);

    const baziData = calculateBazi(
      Number(testYear),
      Number(testMonth),
      Number(testDay),
      Number(testHour),
      testGender,
      Number(testMinute),
      testTrueSolar === 'on',
      Number(testLongitude)
    );

    setCalculatedBazi(baziData as BaziResult);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: testType,
          baziData,
          targetYear: targetYear,
          question: testQuestion,
        }),
      });

      const json = await res.json();
      setTestResult(json);
    } catch (err) {
      setTestResult({ error: '測試請求發送失敗，請檢查網路連線或金鑰。' });
    } finally {
      setTestLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-slate-100">
        <form onSubmit={handleLogin} className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
          <div className="mb-6 flex flex-col items-center text-center">
            <span className="mb-2 inline-flex size-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Lock className="size-6" />
            </span>
            <h1 className="font-serif text-2xl font-bold text-slate-100">算命網 · 管理員後台</h1>
            <p className="text-xs text-slate-400 mt-1">請輸入通行金鑰以存取控制台</p>
          </div>

          <div className="flex flex-col gap-4">
            <input
              type="password"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="請輸入 ADMIN_SECRET_KEY (預設: admin123)"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-amber-500"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-amber-500 px-4 py-3 font-bold text-slate-950 transition-all hover:bg-amber-400 active:scale-98"
            >
              {loading ? '驗證中…' : '登入後台系統'}
            </button>
          </div>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex items-center justify-between border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <ShieldCheck className="size-6" />
            </span>
            <div>
              <h1 className="font-serif text-2xl font-bold text-slate-100">算命網 · 控制台</h1>
              <p className="text-xs text-slate-400">實時流量監控 · AI 模組健康狀態 · 算命程式沙盒</p>
            </div>
          </div>

          <button
            onClick={() => fetchStats(secretKey)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className="size-3.5 text-amber-400" />
            重新整理數據
          </button>
        </header>

        <div className="mb-6 grid grid-cols-3 gap-2 rounded-xl bg-slate-900 p-1.5 border border-slate-800 max-w-md">
          <button
            onClick={() => setActiveTab('traffic')}
            className={`py-2 text-xs font-bold rounded-lg ${activeTab === 'traffic' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
          >
            流量與訪客區域
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`py-2 text-xs font-bold rounded-lg ${activeTab === 'ai' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
          >
            AI 運作狀態
          </button>
          <button
            onClick={() => setActiveTab('sandbox')}
            className={`py-2 text-xs font-bold rounded-lg ${activeTab === 'sandbox' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
          >
            算命測試沙盒
          </button>
        </div>

        {activeTab === 'traffic' && data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <span className="text-xs text-slate-400 block mb-1">今日批命數量</span>
              <p className="text-2xl font-bold text-amber-400">{data.trafficStats.callsToday}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <span className="text-xs text-slate-400 block mb-1">總批命紀錄次數</span>
              <p className="text-2xl font-bold text-slate-100">{data.trafficStats.totalPv}</p>
            </div>
          </div>
        )}

        {activeTab === 'ai' && data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(data.aiStatus).map(([key, model]: [string, any]) => (
              <div key={key} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <span className="text-xs font-bold text-slate-200 block mb-2">{model.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded font-bold ${model.keyConfigured ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                  {model.keyConfigured ? '金鑰已配置' : '未設定 API Key'}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'sandbox' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 flex flex-col gap-4 max-w-xl">
            <h3 className="font-bold text-slate-100">管理員會診沙盒測試</h3>
            <button
              onClick={handleRunTest}
              disabled={testLoading}
              className="bg-amber-500 text-slate-950 py-2.5 font-bold rounded-xl hover:bg-amber-400"
            >
              {testLoading ? '測試中…' : '執行正宗排盤與 API 測試'}
            </button>
            {testResult && (
              <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </main>
  );
}