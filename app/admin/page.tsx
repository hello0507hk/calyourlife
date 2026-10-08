'use client';

import React, { useState } from 'react';
import {
  Activity,
  BarChart3,
  CheckCircle2,
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

export default function AdminPage() {
  const [secretKey, setSecretKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'traffic' | 'ai' | 'sandbox'>('traffic');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [testYear, setTestYear] = useState('1995');
  const [testMonth, setTestMonth] = useState('8');
  const [testDay, setTestDay] = useState('15');
  const [testHour, setTestHour] = useState('14');
  const [testGender, setTestGender] = useState<'male' | 'female'>('male');
  const [testType, setTestType] = useState<'deep' | 'yearly' | 'yearly_qa'>('deep');
  const [testQuestion, setTestQuestion] = useState('今年事業與財運如何？');
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
        alert('管理員密碼錯誤！');
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

    const baziData = {
      solarDate: `${testYear}年${testMonth}月${testDay}日 ${testHour}:00`,
      lunarDate: '乙亥年七月二十日',
      gender: testGender,
      genderText: testGender === 'female' ? '坤造（女）' : '乾造（男）',
      dayGan: '乙',
      dayGanWuxing: '木',
      eightChar: {
        year: { gan: '乙', zhi: '亥', ganShishen: '比肩', zangGan: ['壬', '甲'], zangGanShishen: ['正印', '劫財'] },
        month: { gan: '甲', zhi: '申', ganShishen: '劫財', zangGan: ['庚', '壬', '戊'], zangGanShishen: ['正官', '正印', '正財'] },
        day: { gan: '乙', zhi: '卯', ganShishen: '日主', zangGan: ['乙'], zangGanShishen: ['比肩'] },
        hour: { gan: '癸', zhi: '未', ganShishen: '偏印', zangGan: ['己', '丁', '乙'], zangGanShishen: ['偏財', '食神', '比肩'] },
      },
      wuxingCounts: { 木: 4, 火: 1, 土: 1, 金: 1, 水: 2 },
      dayyun: [
        { age: 8, ganZhi: '癸未' },
        { age: 18, ganZhi: '壬午' },
        { age: 28, ganZhi: '辛巳' },
        { age: 38, ganZhi: '庚辰' },
      ],
    };

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: testType,
          baziData,
          targetYear: 2026,
          question: testQuestion,
        }),
      });

      const json = await res.json();
      setTestResult(json);
    } catch (err) {
      setTestResult({ error: '測試請求失敗' });
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
            <p className="text-xs text-slate-400 mt-1">請輸入管理員通行金鑰以存取監控系統</p>
          </div>

          <div className="flex flex-col gap-4">
            <input
              type="password"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="請輸入 ADMIN_SECRET_KEY"
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
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <ShieldCheck className="size-6" />
            </span>
            <div>
              <h1 className="font-serif text-2xl font-bold text-slate-100">算命網 · 控制台</h1>
              <p className="text-xs text-slate-400">實時流量監控 · AI 模組健康狀態 · 算命程式沙盒</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchStats(secretKey)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              <RefreshCw className="size-3.5 text-amber-400" />
              重新整理數據
            </button>
          </div>
        </header>

        <div className="mb-6 grid grid-cols-3 gap-2 rounded-xl bg-slate-900 p-1.5 border border-slate-800 max-w-md">
          <button
            onClick={() => setActiveTab('traffic')}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${
              activeTab === 'traffic' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="size-4" />
            <span>1. 流量與訪客區域</span>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${
              activeTab === 'ai' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="size-4" />
            <span>2. AI 運作狀態</span>
          </button>

          <button
            onClick={() => setActiveTab('sandbox')}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${
              activeTab === 'sandbox' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FlaskConical className="size-4" />
            <span>3. 算命測試沙盒</span>
          </button>
        </div>

        {activeTab === 'traffic' && data && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-xs">今日總瀏覽量 (PV)</span>
                  <Activity className="size-4 text-amber-400" />
                </div>
                <p className="text-2xl font-bold text-slate-100">{data.trafficStats.pvToday}</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-xs">今日獨立訪客 (UV)</span>
                  <Users className="size-4 text-emerald-400" />
                </div>
                <p className="text-2xl font-bold text-slate-100">{data.trafficStats.uvToday}</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-xs">累計批命次數</span>
                  <Zap className="size-4 text-blue-400" />
                </div>
                <p className="text-2xl font-bold text-slate-100">{data.trafficStats.totalPv}</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-xs">平均停留時間</span>
                  <Globe className="size-4 text-amber-400" />
                </div>
                <p className="text-2xl font-bold text-slate-100">{data.trafficStats.avgDuration}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
              <div className="mb-4 flex items-center gap-2">
                <Globe className="size-5 text-amber-400" />
                <h3 className="font-serif text-base font-bold text-slate-100">批命訪客地理位置分佈</h3>
              </div>

              <div className="flex flex-col gap-3">
                {data.trafficStats.geoDistribution.map((item: any) => (
                  <div key={item.region} className="flex items-center gap-3">
                    <span className="w-44 text-xs font-medium text-slate-300">{item.region}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-950">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all duration-500"
                        style={{ width: item.percentage }}
                      />
                    </div>
                    <span className="w-16 text-right text-xs font-bold text-amber-400">{item.count} 人</span>
                    <span className="w-14 text-right text-xs text-slate-400">{item.percentage}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ai' && data && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(data.aiStatus).map(([key, model]: [string, any]) => (
                <div key={key} className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">{model.name}</span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        model.status === 'online'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-red-500/10 text-red-400 border border-red-500/30'
                      }`}
                    >
                      <CheckCircle2 className="size-3" />
                      {model.status === 'online' ? '運作正常' : '連線異常'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-500 block">平均回應時間</span>
                      <span className="font-bold text-amber-300">{model.latency}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">成功率</span>
                      <span className="font-bold text-slate-200">{model.successRate}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
              <h3 className="mb-3 font-serif text-base font-bold text-slate-100">系統實時運作日誌</h3>
              <div className="flex flex-col gap-2 font-mono text-xs">
                {data.recentLogs.map((log: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-3 rounded-lg bg-slate-950 p-2.5 border border-slate-800/80">
                    <span className="text-slate-500">{log.time}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        log.level === 'ERROR'
                          ? 'bg-red-500/20 text-red-400'
                          : log.level === 'WARN'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}
                    >
                      {log.level}
                    </span>
                    <span className="text-slate-300 font-bold">[{log.model}]</span>
                    <span className="text-slate-400">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sandbox' && (
          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <FlaskConical className="size-5 text-amber-400" />
                <h3 className="font-serif text-base font-bold text-slate-100">管理員算命測試沙盒</h3>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs text-slate-400 block mb-1">測試年份</span>
                  <input
                    value={testYear}
                    onChange={(e) => setTestYear(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <span className="text-xs text-slate-400 block mb-1">測試月份</span>
                  <input
                    value={testMonth}
                    onChange={(e) => setTestMonth(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs text-slate-400 block mb-1">測試日期</span>
                  <input
                    value={testDay}
                    onChange={(e) => setTestDay(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <span className="text-xs text-slate-400 block mb-1">測試小時</span>
                  <input
                    value={testHour}
                    onChange={(e) => setTestHour(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100"
                  />
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-400 block mb-1">測試功能類型</span>
                <select
                  value={testType}
                  onChange={(e: any) => setTestType(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-amber-300 font-bold"
                >
                  <option value="deep">1. 深度解盤</option>
                  <option value="yearly">2. 流年解盤</option>
                  <option value="yearly_qa">3. 流年問事</option>
                </select>
              </div>

              {testType === 'yearly_qa' && (
                <div>
                  <span className="text-xs text-slate-400 block mb-1">測試提問內容</span>
                  <textarea
                    value={testQuestion}
                    onChange={(e) => setTestQuestion(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-slate-100"
                  />
                </div>
              )}

              <button
                onClick={handleRunTest}
                disabled={testLoading}
                className="w-full rounded-xl bg-amber-500 py-3 text-xs font-bold text-slate-950 transition-all hover:bg-amber-400 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <Send className="size-4" />
                {testLoading ? '四 AI 聯合會診測試中…' : '執行 API 會診測試'}
              </button>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 flex flex-col gap-3 overflow-hidden">
              <h3 className="font-serif text-base font-bold text-slate-100 border-b border-slate-800 pb-2">
                測試輸出報告與元數據 (Meta Output)
              </h3>

              {testResult ? (
                <div className="flex flex-col gap-3">
                  {testResult.meta && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="rounded-lg bg-slate-950 p-2 border border-slate-800">
                        <span className="text-slate-500 block">DeepSeek</span>
                        <span className="font-bold text-emerald-400">{testResult.meta.deepseekUsed ? '✓ 已參與' : '✕ 未響應'}</span>
                      </div>
                      <div className="rounded-lg bg-slate-950 p-2 border border-slate-800">
                        <span className="text-slate-500 block">Qwen</span>
                        <span className="font-bold text-emerald-400">{testResult.meta.qwenUsed ? '✓ 已參與' : '✕ 未響應'}</span>
                      </div>
                      <div className="rounded-lg bg-slate-950 p-2 border border-slate-800">
                        <span className="text-slate-500 block">Grok</span>
                        <span className="font-bold text-emerald-400">{testResult.meta.grokUsed ? '✓ 已參與' : '✕ 未響應'}</span>
                      </div>
                      <div className="rounded-lg bg-slate-950 p-2 border border-slate-800">
                        <span className="text-slate-500 block">Gemini 校訂</span>
                        <span className="font-bold text-emerald-400">{testResult.meta.geminiUsed ? '✓ 完成校訂' : '✕ 未校訂'}</span>
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 text-xs leading-relaxed text-slate-200 max-h-[500px] overflow-y-auto whitespace-pre-line font-mono">
                    {testResult.result || JSON.stringify(testResult, null, 2)}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                  點擊左側「執行 API 會診測試」按鈕，實時檢查多 AI 模型的回應輸出。
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
