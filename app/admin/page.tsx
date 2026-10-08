'use client';

import React, { useState } from 'react';
import { calculateBazi } from '@/lib/bazi';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Clock,
  Cpu,
  FileDown,
  FlaskConical,
  Globe,
  Lock,
  Mars,
  Moon,
  PieChart,
  Printer,
  Quote,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  User,
  Users,
  Venus,
  WandSparkles,
  Zap,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* 命盤型別與五行樣式                                                  */
/* ------------------------------------------------------------------ */

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

type Element = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

const ELEMENT_LABEL: Record<Element, string> = {
  wood: '木', fire: '火', earth: '土', metal: '金', water: '水',
};

const ELEMENT_STYLE: Record<Element, { text: string; bg: string; bar: string; dot: string; border: string }> = {
  wood: { text: 'text-emerald-400', bg: 'bg-emerald-950/40', bar: 'bg-emerald-500', dot: 'bg-emerald-500', border: 'border-emerald-800/60' },
  fire: { text: 'text-red-400', bg: 'bg-red-950/40', bar: 'bg-red-500', dot: 'bg-red-500', border: 'border-red-800/60' },
  earth: { text: 'text-amber-400', bg: 'bg-amber-950/40', bar: 'bg-amber-500', dot: 'bg-amber-500', border: 'border-amber-800/60' },
  metal: { text: 'text-slate-300', bg: 'bg-slate-800/50', bar: 'bg-slate-400', dot: 'bg-slate-400', border: 'border-slate-700/60' },
  water: { text: 'text-blue-400', bg: 'bg-blue-950/40', bar: 'bg-blue-500', dot: 'bg-blue-500', border: 'border-blue-800/60' },
};

const GAN_ELEMENT: Record<string, Element> = {
  甲: 'wood', 乙: 'wood', 丙: 'fire', 丁: 'fire', 戊: 'earth', 己: 'earth', 庚: 'metal', 辛: 'metal', 壬: 'water', 癸: 'water',
};

const ZHI_ELEMENT: Record<string, Element> = {
  寅: 'wood', 卯: 'wood', 巳: 'fire', 午: 'fire', 辰: 'earth', 戌: 'earth', 丑: 'earth', 未: 'earth', 申: 'metal', 酉: 'metal', 亥: 'water', 子: 'water',
};

type PillarKey = 'year' | 'month' | 'day' | 'hour';

interface Pillar {
  key: PillarKey;
  label: string;
  sublabel: string;
  heavenlyStem: string;
  heavenlyElement: Element;
  heavenlyTenGod: string;
  earthlyBranch: string;
  earthlyElement: Element;
  earthlyTenGod: string;
  hiddenStems: { char: string; element: Element; god: string }[];
}

function getYearGanZhi(year: number): string {
  const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const offset = year - 4;
  return `${year} ${stems[(offset % 10 + 10) % 10]}${branches[(offset % 12 + 12) % 12]}年`;
}

function mapBaziToPillars(bazi: BaziResult): Pillar[] {
  const keys: PillarKey[] = ['year', 'month', 'day', 'hour'];
  const labels = ['年柱', '月柱', '日柱', '時柱'];
  const sublabels = ['祖業 · 少年', '父母 · 事業', '自身 · 配偶', '子女 · 晚年'];

  return keys.map((key, i) => {
    const pData = bazi.eightChar[key];
    const hGan = pData.gan;
    const eZhi = pData.zhi;

    const hiddenStems = pData.zangGan.map((char, idx) => ({
      char,
      element: GAN_ELEMENT[char] || 'earth',
      god: pData.zangGanShishen[idx] || '',
    }));

    return {
      key,
      label: labels[i],
      sublabel: sublabels[i],
      heavenlyStem: hGan,
      heavenlyElement: GAN_ELEMENT[hGan] || 'wood',
      heavenlyTenGod: pData.ganShishen,
      earthlyBranch: eZhi,
      earthlyElement: ZHI_ELEMENT[eZhi] || 'wood',
      earthlyTenGod: (pData as any).zhiShishen || hiddenStems[0]?.god || '',
      hiddenStems,
    };
  });
}

function mapBaziToDistribution(wuxingCounts: BaziResult['wuxingCounts']) {
  return [
    { element: 'wood' as Element, value: wuxingCounts.木 || 0 },
    { element: 'fire' as Element, value: wuxingCounts.火 || 0 },
    { element: 'earth' as Element, value: wuxingCounts.土 || 0 },
    { element: 'metal' as Element, value: wuxingCounts.金 || 0 },
    { element: 'water' as Element, value: wuxingCounts.水 || 0 },
  ];
}

function GlyphBlock({ char, element, caption }: { char: string; element: Element; caption: string }) {
  const s = ELEMENT_STYLE[element];
  return (
    <div className={`flex flex-col items-center justify-center gap-0.5 rounded-xl border ${s.border} ${s.bg} px-1.5 py-2 sm:px-2 sm:py-2.5 shrink-0`}>
      <span className={`font-serif text-xl sm:text-3xl font-bold leading-none ${s.text}`}>{char}</span>
      <span className={`text-[9px] sm:text-[10px] font-medium ${s.text}`}>
        {caption}{ELEMENT_LABEL[element]}
      </span>
    </div>
  );
}

function FourPillarsView({ pillars, trueSolarText }: { pillars: Pillar[]; trueSolarText?: string }) {
  return (
    <div className="flex flex-col gap-3 w-full overflow-hidden">
      {trueSolarText && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-300">
          <Clock className="size-4 shrink-0 text-amber-400" />
          <span>{trueSolarText}</span>
        </div>
      )}

      <div className="w-full overflow-x-auto pb-2 -mx-1 px-1">
        <div className="flex min-w-[520px] sm:min-w-0 flex-row-reverse gap-2 sm:gap-3 items-stretch">
          {pillars.map((p) => {
            const isDay = p.key === 'day';
            const slots = [...p.hiddenStems];
            while (slots.length < 3) {
              slots.push({ char: '', element: 'earth', god: '' });
            }

            return (
              <article
                key={p.key}
                className={`flex flex-1 flex-col items-stretch rounded-2xl border bg-slate-950 p-2 sm:p-3 shadow-xl transition-all ${
                  isDay ? 'border-amber-500/80 ring-1 ring-amber-500/30' : 'border-slate-800'
                }`}
              >
                <header className="mb-2 flex h-6 items-center justify-between border-b border-slate-800/80 pb-1.5 shrink-0">
                  <div className="flex items-center gap-1">
                    <h3 className="font-serif text-xs sm:text-sm font-bold text-slate-100">{p.label}</h3>
                    {isDay && (
                      <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-1 py-0.5 text-[8px] font-semibold text-amber-300">
                        日主
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-400">{p.sublabel}</span>
                </header>

                <div className="flex flex-col gap-1.5 shrink-0">
                  <div className="relative shrink-0">
                    <GlyphBlock char={p.heavenlyStem} element={p.heavenlyElement} caption="天干 · " />
                    <span className="absolute top-1 right-1 rounded bg-slate-950/80 px-1 py-0.5 text-[8px] sm:text-[9px] font-semibold text-amber-400 border border-amber-500/30 shadow-sm">
                      {p.heavenlyTenGod}
                    </span>
                  </div>

                  <div className="relative shrink-0">
                    <GlyphBlock char={p.earthlyBranch} element={p.earthlyElement} caption="地支 · " />
                    <span className="absolute top-1 right-1 rounded bg-slate-950/80 px-1 py-0.5 text-[8px] sm:text-[9px] font-semibold text-slate-300 border border-slate-700/50 shadow-sm">
                      {p.earthlyTenGod}
                    </span>
                  </div>
                </div>

                <div className="mt-2 border-t border-slate-800/80 pt-1.5 shrink-0">
                  <div className="mb-1 text-[8px] sm:text-[9px] font-medium text-slate-400 text-center">
                    藏干 · 十神
                  </div>
                  <div className="flex flex-col gap-1">
                    {slots.map((h, i) => {
                      if (!h.char) return <div key={i} className="h-5 shrink-0" />;
                      const s = ELEMENT_STYLE[h.element];
                      return (
                        <div
                          key={i}
                          className={`flex h-5 shrink-0 items-center justify-between rounded border ${s.border} ${s.bg} px-1.5 text-[9px]`}
                        >
                          <span className={`font-serif font-bold ${s.text}`}>{h.char}</span>
                          <span className="text-slate-300">{h.god}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 後台主頁面                                                          */
/* ------------------------------------------------------------------ */

export default function AdminPage() {
  const [secretKey, setSecretKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'traffic' | 'ai' | 'sandbox'>('traffic');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // 沙盒測試完整表單狀態 (與前端 page.tsx 100% 一致)
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

  // 真排盤與 AI 會診結果
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

  // 執行真排盤 ＋ 多 AI 會診測試
  const handleRunTest = async () => {
    setTestLoading(true);
    setTestResult(null);

    // 1. 使用正宗排盤引擎計算八字 (精準排除誤差)
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

    // 2. 呼叫多 AI 會診 API
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
            <p className="text-xs text-slate-400 mt-1">請輸入管理員通行金鑰以存取控制台</p>
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

  const LOCATION_OPTIONS = [
    { value: '114.17', label: '香港 (東經 114.17°)' },
    { value: '113.54', label: '澳門 (東經 113.54°)' },
    { value: '121.50', label: '台北 (東經 121.50°)' },
    { value: '116.40', label: '北京 (東經 116.40°)' },
    { value: '121.47', label: '上海 (東經 121.47°)' },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* 頁首 Header */}
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

        {/* 頁籤選單 */}
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

        {/* ==================== 1. 流量與訪客區域統計 ==================== */}
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

        {/* ==================== 2. AI 運作狀態監控 ==================== */}
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

        {/* ==================== 3. 正宗算命測試沙盒 ==================== */}
        {activeTab === 'sandbox' && (
          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
            {/* 左側排盤設定面板 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <FlaskConical className="size-5 text-amber-400" />
                <h3 className="font-serif text-base font-bold text-slate-100">測試排盤設定 (與前台一致)</h3>
              </div>

              {/* 性別切換 */}
              <div>
                <span className="text-xs font-medium text-slate-400 block mb-1.5">性別</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTestGender('male')}
                    className={`py-2 text-xs font-bold rounded-lg border ${
                      testGender === 'male' ? 'border-amber-500 bg-amber-500/10 text-amber-300' : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    乾造 · 男
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestGender('female')}
                    className={`py-2 text-xs font-bold rounded-lg border ${
                      testGender === 'female' ? 'border-amber-500 bg-amber-500/10 text-amber-300' : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    坤造 · 女
                  </button>
                </div>
              </div>

              {/* 年/月/日 */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-xs text-slate-400 block mb-1">出生年</span>
                  <input
                    value={testYear}
                    onChange={(e) => setTestYear(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <span className="text-xs text-slate-400 block mb-1">出生月</span>
                  <input
                    value={testMonth}
                    onChange={(e) => setTestMonth(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <span className="text-xs text-slate-400 block mb-1">出生日</span>
                  <input
                    value={testDay}
                    onChange={(e) => setTestDay(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-slate-100"
                  />
                </div>
              </div>

              {/* 時/分 */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs text-slate-400 block mb-1">出生小時</span>
                  <input
                    value={testHour}
                    onChange={(e) => setTestHour(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <span className="text-xs text-slate-400 block mb-1">出生分鐘</span>
                  <input
                    value={testMinute}
                    onChange={(e) => setTestMinute(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-slate-100"
                  />
                </div>
              </div>

              {/* 真太陽時校正 */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs text-slate-400 block mb-1">真太陽時</span>
                  <select
                    value={testTrueSolar}
                    onChange={(e) => setTestTrueSolar(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-slate-100"
                  >
                    <option value="on">開啟真太陽時</option>
                    <option value="off">關閉</option>
                  </select>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block mb-1">地區經度</span>
                  <select
                    value={testLongitude}
                    onChange={(e) => setTestLongitude(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-slate-100"
                  >
                    {LOCATION_OPTIONS.map((l) => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* AI 測試功能類型 */}
              <div>
                <span className="text-xs font-medium text-slate-400 block mb-1">測試 AI 功能類型</span>
                <select
                  value={testType}
                  onChange={(e: any) => setTestType(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-amber-300 font-bold"
                >
                  <option value="deep">1. 原局深度解盤</option>
                  <option value="yearly">2. 流年整體解盤</option>
                  <option value="yearly_qa">3. 特定流年問事</option>
                </select>
              </div>

              {testType !== 'deep' && (
                <div>
                  <span className="text-xs text-slate-400 block mb-1">選擇推算流年份</span>
                  <input
                    type="number"
                    value={targetYear}
                    onChange={(e) => setTargetYear(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-slate-100"
                  />
                </div>
              )}

              {testType === 'yearly_qa' && (
                <div>
                  <span className="text-xs text-slate-400 block mb-1">提問內容</span>
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
                className="w-full rounded-xl bg-amber-500 py-3 text-xs font-bold text-slate-950 transition-all hover:bg-amber-400 disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10"
              >
                <Send className="size-4" />
                {testLoading ? '計算命盤並由四 AI 會診中…' : '執行正宗排盤與 AI 會診測試'}
              </button>
            </div>

            {/* 右側：精準排盤卡片 ＋ AI 報告與除錯資訊 */}
            <div className="flex flex-col gap-5 overflow-hidden">
              {calculatedBazi ? (
                <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="font-serif text-base font-bold text-slate-100">
                      即時計算命盤（與前台 100% 同步無誤差）
                    </span>
                    <span className="text-xs text-amber-400">{calculatedBazi.solarDate}</span>
                  </div>

                  {/* 展示八字四柱 */}
                  <FourPillarsView
                    pillars={mapBaziToPillars(calculatedBazi)}
                    trueSolarText={calculatedBazi.trueSolarText}
                  />

                  {/* AI 診斷狀態 */}
                  {testResult && testResult.meta && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-2 border-t border-slate-800">
                      <div className="rounded-lg bg-slate-950 p-2 border border-slate-800">
                        <span className="text-slate-500 block">DeepSeek</span>
                        <span className="font-bold text-emerald-400">{testResult.meta.deepseekUsed ? '✓ 已回應' : '✕ 無回應'}</span>
                      </div>
                      <div className="rounded-lg bg-slate-950 p-2 border border-slate-800">
                        <span className="text-slate-500 block">Qwen</span>
                        <span className="font-bold text-emerald-400">{testResult.meta.qwenUsed ? '✓ 已回應' : '✕ 無回應'}</span>
                      </div>
                      <div className="rounded-lg bg-slate-950 p-2 border border-slate-800">
                        <span className="text-slate-500 block">Grok</span>
                        <span className="font-bold text-emerald-400">{testResult.meta.grokUsed ? '✓ 已回應' : '✕ 無回應'}</span>
                      </div>
                      <div className="rounded-lg bg-slate-950 p-2 border border-slate-800">
                        <span className="text-slate-500 block">Gemini 審閱</span>
                        <span className="font-bold text-emerald-400">{testResult.meta.geminiUsed ? '✓ 成功終極校訂' : '✕ 未校訂'}</span>
                      </div>
                    </div>
                  )}

                  {/* AI 分析報告 */}
                  {testResult && (
                    <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 text-xs leading-relaxed text-slate-200 max-h-[500px] overflow-y-auto whitespace-pre-line font-mono">
                      {testResult.result || JSON.stringify(testResult, null, 2)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl bg-slate-900/40">
                  <FlaskConical className="size-8 text-slate-600 mb-2" />
                  點擊左側「執行正宗排盤與 AI 會診測試」按鈕，實時檢視精準八字與 AI 會診報告。
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}