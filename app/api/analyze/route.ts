import { NextResponse } from 'next/server';
import { ADMIN_REFERENCE_DOCS } from '@/lib/adminKnowledge';
import { QIZHENG_REFERENCE_DOCS } from '@/lib/qizhengKnowledge';
import { calculateQizheng, ZODIAC_BRANCHES } from '@/lib/qizheng';

// 1. 強制動態獲取環境變數，禁止靜態快取
export const dynamic = 'force-dynamic';

// 2. 超時限制（Vercel Pro 上限 800 秒；Hobby 上限 300 秒）
export const maxDuration = 800;

// 初始化全域統計變數 (供後台 /admin 讀取實時數據)
if (!(global as any).__site_stats) {
  (global as any).__site_stats = {
    totalCalls: 0,
    callsToday: 0,
    logs: [],
  };
}

// 自動計算干支年份
function getYearGanZhi(year: number): string {
  const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const offset = year - 4;
  const stem = stems[(offset % 10 + 10) % 10];
  const branch = branches[(offset % 12 + 12) % 12];
  return `${year} ${stem}${branch}年`;
}

// 自動計算天干五合
function checkGanHe(gans: string[]) {
  const combinations = [
    { pair: ['甲', '己'], name: '甲己合化土' },
    { pair: ['乙', '庚'], name: '乙庚合化金' },
    { pair: ['丙', '辛'], name: '丙辛合化水' },
    { pair: ['丁', '壬'], name: '丁壬合化木' },
    { pair: ['戊', '癸'], name: '戊癸合化火' },
  ];

  const found: string[] = [];
  for (let i = 0; i < gans.length; i++) {
    for (let j = i + 1; j < gans.length; j++) {
      const g1 = gans[i];
      const g2 = gans[j];
      for (const c of combinations) {
        if ((g1 === c.pair[0] && g2 === c.pair[1]) || (g1 === c.pair[1] && g2 === c.pair[0])) {
          found.push(`${g1}${g2}合（${c.name}）`);
        }
      }
    }
  }

  const uniqueFound = Array.from(new Set(found));
  return uniqueFound.length > 0 ? uniqueFound.join('、') : '原局天干無五合組合';
}

// 構建傳給 AI 的「星平合參」（八字 + 七政四餘）Prompt 文字
function buildBaziText(baziData: any, userNotes?: string) {
  const {
    eightChar,
    dayGan,
    dayGanWuxing,
    wuxingCounts,
    dayyun,
    solarDate,
    lunarDate,
    gender,
    genderText,
    occupation,
    maritalStatus,
    qizhengData, // 新增：七政四餘星盤數據
  } = baziData;

  const genderDisplay = genderText || (gender === 'female' ? '坤造（女）' : '乾造（男）');
  const occupationDisplay = occupation && occupation.trim() !== '' ? occupation.trim() : '未提供（請根據八字與官祿宮格局推斷）';
  const maritalDisplay = maritalStatus && maritalStatus.trim() !== '' ? maritalStatus.trim() : '未提供';

  const allTenGods: string[] = [
    eightChar.year.ganShishen,
    ...(eightChar.year.zangGanShishen || []),
    eightChar.month.ganShishen,
    ...(eightChar.month.zangGanShishen || []),
    '日主',
    ...(eightChar.day.zangGanShishen || []),
    eightChar.hour.ganShishen,
    ...(eightChar.hour.zangGanShishen || []),
  ].filter(Boolean);

  const godCounts: Record<string, number> = {};
  allTenGods.forEach((god) => {
    if (god !== '日主') {
      godCounts[god] = (godCounts[god] || 0) + 1;
    }
  });

  const godSummary = Object.entries(godCounts)
    .map(([god, count]) => `${god}:${count}個`)
    .join('、');

  const fourGans = [
    eightChar.year.gan,
    eightChar.month.gan,
    eightChar.day.gan,
    eightChar.hour.gan,
  ];
  const ganHeResult = checkGanHe(fourGans);

  const formattedNotes = userNotes && userNotes.trim() !== '' 
    ? userNotes.trim() 
    : '無額外補充資料，請直接進行星平合參常規推算。';

  // 解析七政四餘星盤資料
  let qizhengText = '【七政四餘星盤數據】：未提供額外星盤資料，請以經典子平八字進行推算。';
  if (qizhengData) {
    const starsText = qizhengData.stars
      ? qizhengData.stars
          .map((s: any) => {
            const extra = [s.state, ...(s.dignity || []), ...(s.huaYao || [])].filter(Boolean).join('、');
            return `  * ${s.key}（${s.name}）：${s.branch}宮 ${s.degreeInSign}，${s.mansion}宿 ${s.mansionDegree}，落${s.house}${extra ? `（${extra}）` : ''}`;
          })
          .join('\n')
      : '無星曜數據';

    const housesText = qizhengData.houses
      ? qizhengData.houses
          .map((h: any) => {
            const limit = typeof h.limitStartAge === 'number' ? `；大限 ${h.limitStartAge.toFixed(1)}–${h.limitEndAge.toFixed(1)}歲` : '';
            return `  * ${h.name}（${h.branch}宮・${h.zodiacSign}・宮主${h.ruler}）：${h.stars?.length ? h.stars.join('、') : '空宮'}${h.shensha?.length ? `；神煞：${h.shensha.join(' ')}` : ''}${limit}`;
          })
          .join('\n')
      : '無宮位數據';

    qizhengText = `
【七政四餘星盤數據（星平合參對照）】：
- 命宮：${qizhengData.mingGong || '未定'}宮（命度 ${qizhengData.ming?.mansion ?? ''} ${qizhengData.ming?.mansionDegree ?? ''}，命主 ${qizhengData.ming?.palaceRuler ?? ''}，度主 ${qizhengData.ming?.degreeRuler ?? ''}） | 身宮：${qizhengData.shenGong || '未定'}宮
- 七政四餘星曜落宮：
${starsText}
- 十二宮位星曜佈局（官祿、財帛、夫妻、疾厄等）：
${housesText}
    `.trim();
  }

  return `
【陽曆日期】：${solarDate}
【農曆日期】：${lunarDate}
【命主性別】：${genderDisplay}
【現時職業】：${occupationDisplay}
【現時婚姻/感情狀態】：${maritalDisplay}
【日主（日干）】：${dayGan}（五行屬${dayGanWuxing}）

【子平四柱八字與十神藏干】：
- 年柱：
${eightChar.year.gan}${eightChar.year.zhi}（天干十神：${eightChar.year.ganShishen}，藏干：${eightChar.year.zangGan.join('/')}，藏干十神：${(eightChar.year.zangGanShishen || []).join('/')}）
- 月柱：
${eightChar.month.gan}${eightChar.month.zhi}（天干十神：${eightChar.month.ganShishen}，藏干：${eightChar.month.zangGan.join('/')}，藏干十神：${(eightChar.month.zangGanShishen || []).join('/')}）
- 日柱：
${eightChar.day.gan}${eightChar.day.zhi}（日主，藏干：${eightChar.day.zangGan.join('/')}，藏干十神：${(eightChar.day.zangGanShishen || []).join('/')}）
- 時柱：
${eightChar.hour.gan}${eightChar.hour.zhi}（天干十神：${eightChar.hour.ganShishen}，藏干：${eightChar.hour.zangGan.join('/')}，藏干十神：${(eightChar.hour.zangGanShishen || []).join('/')}）

【天干五合檢驗結果】：${ganHeResult}

【八字十神整體統計】：${godSummary || '無'}

【八字五行數量統計】：
- 木：${wuxingCounts.木} 個 | 火：${wuxingCounts.火} 個 | 土：${wuxingCounts.土} 個 | 金：${wuxingCounts.金} 個 | 水：${wuxingCounts.水} 個

${qizhengText}

【命主自述個人背景 / 參考文檔 / 特定提問】：
${formattedNotes}

【大運走勢】：
${dayyun
  .map((d: any) => `- ${d.ganZhi} 大運：${d.age}${d.endAge ? `–${d.endAge}` : ''}歲${d.startYear ? `（${d.startYear}–${d.endYear}年）` : ''}`)
  .join('\n')}
  `.trim();
}

// 原局深度解盤「當下流年運勢評語」所批之年份
const DEEP_REPORT_YEAR = 2027;

const TRANSIT_STARS = ['木', '土', '火', '羅', '計', '炁', '孛'];

// 流年星曜過宮：取立春、年中、年底三個時點，列出行星落宮與逆行
function yearlyTransitText(qz: any, year: number): string {
  if (!qz?.birth || !qz?.houses) return '';
  const houseOf = (lon: number) => {
    const l = ((lon % 360) + 360) % 360;
    const branch = ZODIAC_BRANCHES[Math.floor(l / 30)];
    const house = qz.houses.find((h: any) => h.branch === branch);
    const deg = l % 30;
    return `${branch}宮${house ? `（${house.name}）` : ''}${Math.floor(deg)}°${String(Math.round((deg % 1) * 60)).padStart(2, '0')}′`;
  };
  try {
    const points = [
      { label: '立春', date: new Date(Date.UTC(year, 1, 4, 4)) },
      { label: '年中', date: new Date(Date.UTC(year, 6, 1, 4)) },
      { label: '年底', date: new Date(Date.UTC(year, 11, 31, 4)) },
    ].map((p) => ({ ...p, stars: calculateQizheng({ ...qz.birth, now: p.date }).now.stars }));

    const lines = TRANSIT_STARS.map((key) => {
      const path = points
        .map((p) => {
          const s = p.stars.find((x: any) => x.key === key);
          return s ? `${p.label} ${houseOf(s.longitude)}${s.isRetrograde ? '（逆）' : ''}` : '';
        })
        .filter(Boolean)
        .join(' → ');
      return `  * ${key}：${path}`;
    });
    return `- ${year} 年流年星曜過宮（立春 → 年中 → 年底）：\n${lines.join('\n')}`;
  } catch {
    return '';
  }
}

// 指定年份所行之大限宮
function limitHouseText(qz: any, year: number): string {
  if (!qz?.birth || !qz?.houses) return '';
  const birthYear = qz.birth.year + (qz.birth.month - 1) / 12;
  const h = qz.houses.find((x: any) => year + 0.5 >= birthYear + x.limitStartAge && year + 0.5 < birthYear + x.limitEndAge);
  if (!h) return '';
  return `- ${year} 年所行大限：${h.name}（${h.branch}宮，${h.limitStartAge.toFixed(1)}–${h.limitEndAge.toFixed(1)}歲），宮內星曜：${h.stars?.length ? h.stars.join('、') : '空宮'}，宮主${h.ruler}`;
}

const MONTH_LABELS = ['寅月', '卯月', '辰月', '巳月', '午月', '未月', '申月', '酉月', '戌月', '亥月', '子月', '丑月'];

// 前端據此 JSON 繪製評分圖表；分數 0–100，50 為平
function scoreBlockSpec(type: string, dayyun: any[] = []) {
  let shape: string;
  if (type === 'yearly') {
    shape = JSON.stringify({
      overall: 0,
      summary: '一句話總評（30字內）',
      scores: { 事業: 0, 財運: 0, 感情: 0, 健康: 0, 人際: 0, 學業: 0 },
      months: MONTH_LABELS.map((month) => ({ month, score: 0, note: '8字內重點' })),
    });
  } else if (type === 'yearly_qa') {
    shape = JSON.stringify({ score: 0, verdict: '吉／小吉／平／小凶／凶 擇一', summary: '一句話直接回答（30字內）' });
  } else {
    shape = JSON.stringify({
      summary: '一句話總評（30字內）',
      useGod: '用神（如：丙火）',
      favorable: ['喜用五行，單字如 火'],
      unfavorable: ['忌神五行，單字如 水'],
      scores: { 事業: 0, 財運: 0, 感情: 0, 健康: 0, 學業: 0, 人際: 0 },
      luck: dayyun.map((d: any) => ({ ganZhi: d.ganZhi, score: 0 })),
    });
  }
  return `

【圖表評分輸出要求（必須遵守）】：
報告正文完成後，在最末尾另起一行，輸出一個以 \`\`\`json 開頭、\`\`\` 結尾的程式碼區塊，內容為以下結構的 JSON（只替換數值與文字，鍵名不可更改，分數為 0–100 整數，50 為平、越高越吉），區塊前後不要加任何解說：
${shape}`;
}

// 須小於 maxDuration（800 秒）：初批須於 180 秒內收結，餘下時間留給總審閱
const DRAFT_BUDGET_MS = 180_000;
const TOTAL_BUDGET_MS = 780_000;
const DRAFT_MAX_TOKENS = 4096;
const CHAPTER_MAX_TOKENS = 8192;
const CONTINUE_MAX_TOKENS = 4096;

interface StreamResult {
  text: string;
  finish: string;
}

const EMPTY_RESULT: StreamResult = { text: '', finish: 'error' };

// 報告未寫完時回傳給前端，按「繼續生成」時原樣送回，跳過初批直接續寫
interface ResumeState {
  chapter: number;
  partial: string;
  done: string[];
  drafts: { deepseek: string; qwen: string; grok: string };
}

const isTruncated = (r: StreamResult) =>
  ['length', 'MAX_TOKENS', 'CONTINUATION', 'timeout'].includes(r.finish);

// Gemini 4 會忽略 temperature，且思考 token 計入 maxOutputTokens，須預留更大上限
function geminiGenerationConfig(model: string, maxTokens: number) {
  if (model.startsWith('gemini-4')) return { maxOutputTokens: Math.max(maxTokens * 4, 32_768) };
  if (model.startsWith('gemini-2.5')) return { temperature: 0.0, maxOutputTokens: maxTokens };
  return { maxOutputTokens: maxTokens };
}

type SSEExtract = (json: any) => { text?: string; finish?: string };

const openAIExtract: SSEExtract = (j) => ({
  text: j.choices?.[0]?.delta?.content ?? undefined,
  finish: j.choices?.[0]?.finish_reason ?? undefined,
});

const geminiExtract: SSEExtract = (j) => {
  const c = j.candidates?.[0];
  return {
    text: (c?.content?.parts ?? []).filter((p: any) => !p.thought).map((p: any) => p.text ?? '').join(''),
    finish: c?.finishReason ?? undefined,
  };
};

// 以串流方式讀取回應：到達時限便中止，但保留已生成的文字
async function streamSSE(
  url: string,
  init: RequestInit,
  deadline: number,
  extract: SSEExtract,
  label: string,
  errors: Record<string, string>
): Promise<StreamResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), Math.max(1000, deadline - Date.now()));
  let text = '';
  let finish = '';
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok || !res.body) {
      errors[label] = `HTTP ${res.status}: ${(await res.text()).slice(0, 500)}`;
      return EMPTY_RESULT;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const r = extract(JSON.parse(payload));
          if (r.text) text += r.text;
          if (r.finish) finish = r.finish;
        } catch {
          // 非 JSON 的心跳行
        }
      }
    }
  } catch (err: any) {
    if (ctrl.signal.aborted) {
      finish = 'timeout';
      if (!text) errors[label] = '超出時限';
    } else {
      errors[label] = `網路異常: ${err.message}`;
      if (!text) finish = 'error';
    }
  } finally {
    clearTimeout(timer);
  }
  return { text, finish };
}

function reportChapters(type: string, targetGanZhiStr: string, deepYear: number) {
  if (type === 'yearly') {
    return [
      {
        title: '上半（一至三）',
        outline: `只寫以下三節，寫完即停，不要預告後半：
### 一、 流年整體運勢總評
### 二、 事業與工作運勢（吉事／凶事／應期／應對方法 四組條列，吉凶各至少 3 條，寫清具體事情與做法）
### 三、 財運與投資理財
每節必須含 **子平八字**、**七政四餘**、**星平合參結論**。事業節必須比其他節更詳盡。`,
      },
      {
        title: '下半（四至六）',
        outline: `只寫以下三節，不要重寫上半已完成的內容：
### 四、 感情婚姻與人際關係（吉事／凶事／應期／應對方法 四組條列，吉凶各至少 3 條，按現時婚姻狀態給做法）
### 五、 健康與安全
### 六、 逐月吉凶與趨吉避凶錦囊（寅月至丑月）
每節必須含 **子平八字**、**七政四餘**、**星平合參結論**。第六節逐月標示【吉】【凶】與宜忌。`,
      },
    ];
  }
  if (type === 'yearly_qa') {
    return [
      {
        title: '問事全文',
        outline: `依序寫完以下五節：
### 一、 問事吉凶總斷
### 二、 子平八字論斷
### 三、 七政四餘星盤論斷
### 四、 星平合參綜合結論與應期
### 五、 具體應對方針與趨吉避凶行動建議
針對【${targetGanZhiStr}】所問之事，吉凶必須直言。`,
      },
    ];
  }
  return [
    {
      title: '上半（一至三）',
      outline: `只寫以下三節，寫完即停，不要預告後半：
### 一、 日主旺衰、調候、天干合化、定格局、捉用神、病與藥
### 二、 格局與十神性格分析
### 三、 五行喜忌與生活建議
第一節以子平為主並定出唯一用神；第二、三節必須含 **子平八字**、**七政四餘**、**星平合參結論**。`,
    },
    {
      title: '下半（四至六）',
      outline: `只寫以下三節，不要重寫上半已完成的內容，用神必須沿用上半已裁定者：
### 四、 出身、事業、感情和健康（四項各自具備子平／七政／合參結論；事業與感情必須寫齊吉事／凶事／應期／應對方法，吉凶各至少 3 條）
### 五、 前 1 個、後 4 個主要大運之吉凶（對照大限宮位）
### 六、 ${deepYear} 年流年運勢評語
每節必須含 **子平八字**、**七政四餘**、**星平合參結論**，並標示【吉】【凶】程度、應期與化解。`,
    },
  ];
}

function clipDraft(text: string, limit = 2800) {
  const t = text.trim();
  if (t.length <= limit) return t;
  return `${t.slice(0, limit)}\n…（初稿已節錄，完整細節由總審依命盤與法則補寫）`;
}

async function streamGeminiChapter(
  geminiKey: string,
  prompt: string,
  deadline: number,
  models: string[],
  label: string,
  errors: Record<string, string>,
  maxTokens: number
): Promise<StreamResult> {
  for (const model of models) {
    if (Date.now() > deadline - 8000) break;
    const r = await streamSSE(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ],
          generationConfig: geminiGenerationConfig(model, maxTokens),
        }),
      },
      deadline,
      geminiExtract,
      `${label}(${model})`,
      errors
    );
    if (r.text.trim()) return r;
  }
  return EMPTY_RESULT;
}

async function completeGeminiText(
  geminiKey: string,
  first: StreamResult,
  context: string,
  deadline: number,
  models: string[],
  label: string,
  errors: Record<string, string>
): Promise<StreamResult> {
  let text = first.text;
  let finish = first.finish;
  let round = 0;
  while (isTruncated({ text, finish }) && Date.now() < deadline - 12_000 && round < 3) {
    round += 1;
    const tail = text.slice(-800);
    const cont = await streamGeminiChapter(
      geminiKey,
      `${context}

【接續要求】：上一段因篇幅中斷。請從中斷處無縫接續，不要重寫已完成的段落，不要加開場白。
已寫到此處（最後約 800 字，供對齊）：
${tail}`,
      deadline,
      models,
      `${label}-續${round}`,
      errors,
      CONTINUE_MAX_TOKENS
    );
    if (!cont.text.trim()) break;
    text += (text.endsWith('\n') ? '' : '\n') + cont.text;
    finish = cont.finish;
  }
  return { text, finish };
}

async function streamChat(
  label: string,
  url: string,
  key: string,
  models: string[],
  system: string,
  user: string,
  deadline: number,
  errors: Record<string, string>
): Promise<StreamResult> {
  for (const model of models) {
    if (Date.now() > deadline - 5000) break;
    const r = await streamSSE(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          temperature: 0.0,
          max_tokens: DRAFT_MAX_TOKENS,
          stream: true,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
      },
      deadline,
      openAIExtract,
      `${label}(${model})`,
      errors
    );
    if (r.text.trim()) return r;
  }
  return EMPTY_RESULT;
}

// API Route 主入口
export async function POST(req: Request) {
  const executionErrors: Record<string, string> = {};
  const startedAt = Date.now();

  try {
    const { type = 'deep', baziData, userNotes, targetYear = 2026, question, resume } = await req.json();
    const resumeState: ResumeState | null =
      resume && Array.isArray(resume.done) && resume.drafts ? resume : null;

    // 紀錄實時呼叫至後台計數器
    if ((global as any).__site_stats) {
      (global as any).__site_stats.totalCalls += 1;
      (global as any).__site_stats.callsToday += 1;
      (global as any).__site_stats.logs.push({
        time: new Date().toLocaleTimeString('zh-TW', { timeZone: 'Asia/Hong_Kong' }),
        level: 'INFO',
        model: 'Multi-AI (星平合參)',
        message: `收到八字與七政會診請求 (類型: ${type || 'deep'})`,
      });
    }

    const deepseekKey = process.env.DEEPSEEK_API_KEY?.trim();
    const dashscopeKey = process.env.QWEN_API_KEY?.trim();
    const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();

    const xaiKey = (
      process.env.XAI_API_KEY ||
      process.env.GROK_API_KEY ||
      process.env.XAI_KEY
    )?.trim();

    const geminiKey = process.env.GEMINI_API_KEY?.trim();

    if (!deepseekKey) {
      return NextResponse.json(
        { error: '未設定 DEEPSEEK_API_KEY 環境變數，請至 Vercel 控制台新增。' },
        { status: 500 }
      );
    }

    const targetLuck = (baziData?.dayyun || []).find(
      (d: any) => d.startYear && targetYear >= d.startYear && targetYear <= d.endYear
    );
    const analysisYear = type === 'deep' ? DEEP_REPORT_YEAR : targetYear;
    const qizhengYearText = [limitHouseText(baziData?.qizhengData, analysisYear), yearlyTransitText(baziData?.qizhengData, analysisYear)]
      .filter(Boolean)
      .join('\n');
    const formattedText = `${buildBaziText(baziData, userNotes)}${
      type !== 'deep' && targetLuck ? `\n\n【${targetYear} 年所行大運】：${targetLuck.ganZhi}（${targetLuck.startYear}–${targetLuck.endYear}年）` : ''
    }${qizhengYearText ? `\n\n【${analysisYear} 年七政四餘流年數據】：\n${qizhengYearText}` : ''}`;
    const targetGanZhiStr = getYearGanZhi(targetYear);

    // 基於三大功能（deep / yearly / yearly_qa）動態選用系統提示詞與輸出格式規範
    let initialSystemPrompt = '';
    let userPromptText = '';

    const baseExpertPersona = `你是一位跟隨徐樂吾學習八字和七政四餘多年、深得徐樂吾真傳，精通子平八字與「星平合參」（子平八字 + 七政四餘星學）的資深命理大師。
你熟讀《滴天髓徵義》徐樂吾編註、《造化元鑰》徐樂吾評註、《神峰通考》、徐樂吾「有殺先論殺」、《子平一得》蔡進源補註、鄭希誠《鄭氏星案》、《果老星宗》與萬民英《星學大成》。
利用子平八字扶抑、調候、通關定格局與捉用神，同時對照七政四餘黃道十二宮（官祿宮、財帛宮、夫妻宮、疾厄宮等）、日月五星與四餘（羅睺、計都、紫氣、月孛）落宮狀態，互相印證。
嚴禁使用朱鵲橋一派的任何理論，嚴禁修改干支或自行重新計算排盤。`;

    const starPingDualRules = `【星平合參雙軌批算要求（每一部分都必須遵守）】：
1. 每一個分析部分都必須分三層，並以粗體小標題分開：
   - **子平八字**：3–6 條重點，每條一行。寫清引用的干支、十神、藏干、用神喜忌。
   - **七政四餘**：3–6 條重點，每條一行。寫清宮位、宮主、星曜廟旺化曜或流年過宮。
   - **星平合參結論（核心批斷）**：只用條列，最多 5 條，每條一行，格式固定為：
     - 【吉／中吉／平／小凶／凶】＋一句人話講結果 ＋ 括號內一句依據
     例：- 【中吉】事業有貴人提攜（官祿宮木星得地，流年印星生身）
     例：- 【小凶】下半年慎防破財，宜守不宜攻（財帛宮見羅睺，大運比劫爭財）
2. 核心批斷必須讓一般人一眼看懂：先講結果，再講原因；不要長段論文，不要重複同一論點。
3. 嚴禁只論八字或只論星盤；兩者相異時，用一條結論說明取捨。
4. 吉凶必須直言，不可含糊，亦不可誇大；每一條都要有依據。凶象後面加半句可行化解。
5. 提到五行時，必須寫出「木」「火」「土」「金」「水」單字（例如「用神是火，忌水」），不要只寫「火星」「水旺」而不出現五行字。

【事業與感情專章（必須比其他章節更詳盡）】：
這兩項不可只寫「事業平穩」「感情尚可」等空話。必須推斷「會發生什麼具體事情」，並給出「可以怎麼做」。仍用條列，但條數要夠，讓命主能照著做。
事業必須分四組條列：
- **吉事**：至少 3 條。每條寫清會發生什麼（升遷、跳槽、創業、貴人提攜、出國公幹、轉行）、哪個大運或哪一年、依據（八字官殺印食傷，或官祿宮／遷移宮星曜）。
- **凶事**：至少 3 條。每條寫清風險（失業、降職、小人是非、官司、合約糾紛、工作停滯）、應期與依據。
- **應期**：用大運干支＋年份（或流年月份）標出「宜動」與「宜守」的時段。
- **應對方法**：每一條凶事都要對應一條可執行的做法（例如何時轉職、何時簽約、如何避開小人、是否適合自己創業）；吉事也要寫如何把握。
感情必須分四組條列，並嚴格配合【命主性別】與【現時婚姻/感情狀態】：
- **吉事**：至少 3 條。寫清桃花、正緣、結婚、生育、複合等具體事情、應期與依據（男命財星／女命官殺、日支夫妻宮、七政夫妻宮／男女宮）。
- **凶事**：至少 3 條。寫清分手、離婚、第三者、冷戰、情感冷淡等具體風險、應期與依據。
- **應期**：標出最易遇正緣或桃花的大運或年份，以及需防破裂的時段。
- **應對方法**：按現狀給建議（單身如何結識、有伴侶如何推進或守成、已婚如何經營、離異如何復原），每一條凶事都要有做法。`;

    if (type === 'yearly') {
      initialSystemPrompt = `${baseExpertPersona}

【分析任務】：請針對命主八字與七政四餘星盤進行【${targetGanZhiStr} 流年批算】。
請務必結合命主的【現時職業】與【現時婚姻/感情狀態】進行深度的流年演繹與星平對照。

${starPingDualRules}

【必須參考文獻與指定批命規範】：
--------------------------------------------------
${ADMIN_REFERENCE_DOCS}
--------------------------------------------------

請嚴格分成以下六部分，並以 Markdown 格式輸出，每部分均須具備「子平八字／七政四餘／星平合參結論」三層：
### 一、 流年整體運勢總評
- 子平八字：流年 ${targetGanZhiStr} 干支對日主、用神、所行大運及原局四柱之生剋刑沖合會。
- 七政四餘：該年所行大限宮位及宮主，流年星曜（木、土、火、羅、計、炁、孛）過命宮、身宮、大限宮及沖照命度之情況。
### 二、 事業與工作運勢
- 結合現時職業，八字官殺、印星、食傷之流年引動，對照七政【官祿宮】【遷移宮】宮主及流年星曜。
- 必須按【事業與感情專章】寫齊「吉事／凶事／應期／應對方法」四組條列，推斷今年會發生的具體事情，不可空泛。
### 三、 財運與投資理財
- 八字財星與比劫之流年變化，對照七政【財帛宮】【田宅宮】宮主、星曜及流年星曜，分析進財、破財、投資之吉凶與應期。
### 四、 感情婚姻與人際關係
- 結合現時婚姻狀態，八字夫妻宮、妻星／夫星之流年引動，對照七政【夫妻宮】【奴僕宮】【男女宮】星曜。
- 必須按【事業與感情專章】寫齊「吉事／凶事／應期／應對方法」四組條列，推斷今年感情會發生的具體事情與做法。
### 五、 健康與安全
- 八字五行偏枯與流年沖剋，對照七政【疾厄宮】及受羅計孛火土侵擾之宮位，指出需注意之身體部位、意外與化解方法。
### 六、 逐月吉凶與趨吉避凶錦囊
- 以節氣月（寅月至丑月）逐月列出：八字流月干支之引動、七政流年星曜之變化（如有逆留轉向須註明），並標示每月【吉】【凶】與宜忌。`;

      userPromptText = `請幫我批算以下八字與七政四餘命盤在【${targetGanZhiStr}】的流年運勢：\n\n${formattedText}`;
    } else if (type === 'yearly_qa') {
      initialSystemPrompt = `${baseExpertPersona}

【分析任務】：請針對命主於【${targetGanZhiStr}】提出之特定問題【${question || '流年吉凶問事'}】進行【流年問事精準解答】。
請結合命主的【現時職業】與【現時婚姻/感情狀態】，運用星平合參提供切合現實狀況的解答。

${starPingDualRules}

【必須參考文獻與指定批命規範】：
--------------------------------------------------
${ADMIN_REFERENCE_DOCS}
--------------------------------------------------

請嚴格分成以下五部分，並以 Markdown 格式輸出：
### 一、 問事吉凶總斷
- 先以一兩句直接回答所問之事是【吉】、【凶】、【吉中藏凶】或【凶中藏吉】，以及成敗機率。
### 二、 子平八字論斷
- 找出所問之事對應的十神與宮位（例如問事業看官殺印、問財看財星、問感情看妻星／夫星與日支），分析原局、所行大運及流年 ${targetGanZhiStr} 如何引動，逐點講明吉在何處、凶在何處。
### 三、 七政四餘星盤論斷
- 找出所問之事對應的宮位（例如官祿、財帛、夫妻、疾厄、遷移），分析宮主、宮內星曜之廟旺化曜、該年所行大限及流年星曜過宮，逐點講明吉在何處、凶在何處。
### 四、 星平合參綜合結論與應期
- 綜合八字與星盤，說明兩者一致或相異之處，給出最終吉凶判斷、程度，以及最有利與最需提防的月份。
### 五、 具體應對方針與趨吉避凶行動建議`;

      userPromptText = `命主針對【${targetGanZhiStr}】提出了具體提問：【${question || '流年吉凶問事'}】\n\n請結合以下命盤數據解答：\n\n${formattedText}`;
    } else {
      // 預設為原局深度解盤
      initialSystemPrompt = `${baseExpertPersona}

【性別與感情婚姻批斷嚴格約束】：
- 必須嚴格根據資料中的【命主性別】進行批斷，絕不可寫出「假設命主為男/女」等字眼。
- 若性別為「乾造（男）」，第四點感情婚姻必須直接以正財/偏財為妻星、日支為妻宮，並對照七政【夫妻宮】星曜進行論述。
- 若性別為「坤造（女）」，第四點感情婚姻必須直接參照女命官殺星與七政【夫妻宮】星曜確切論述。
- **感情婚姻現狀考量**：必須結合命主輸入的【現時婚姻/感情狀態】（如：已婚、單身、有穩定伴侶、離異）提供針對性建議。

【職業與事業批斷約束】：
- 必須結合命主提供的【現時職業】，對照八字喜用神、十神格局與七政【官祿宮】主星狀態，分析當前行業利弊並給出轉型升遷建議。

【命理分析穩定性與一致性約束】：
1. 【確定性推導原則】：相同命盤必須導出唯一的日主用神與格局判定，嚴禁前後矛盾。
2. 【用神一貫性】：一旦判定用神，後續所有大運、感情、事業分析必須 100% 圍繞該用神進行演繹。
3. 捉用神必須先參照《造化元鑰》十天干月令喜忌與《子平一得》命例，必須在原局八字中找出有用之神。
4. 有殺先論殺：原局有殺星，必須優先論殺（殺弱以財滋殺，殺強以印化殺或食神制殺）。

${starPingDualRules}
（第一部分「日主旺衰、格局、用神、病藥」以子平八字為主；第二至第六部分必須完全符合上述雙軌要求。）

【必須參考文獻與指定批命規範】：
--------------------------------------------------
${ADMIN_REFERENCE_DOCS}
--------------------------------------------------

內容請嚴格分成以下六部分，並以 Markdown 格式輸出：
### 一、 日主旺衰、論調候、天干合化、定格局、評論格局高低，捉用神，詳細指出原局八字中的「病」和「藥」
- 分析日主在月令的得令狀況與四柱整體氣勢。分析原局八字時，首要條件是先論日主屬陰屬陽，然後才論五行生尅制化。先看命主是陽日元還是陰日元，陽日元喜尅不喜泄，要有根，陰日元喜泄不喜尅，不怕弱
- 必定依據此次序批原局裡是否有調候，第二步是必須跟據造化元鑰裡面的十干性情，命主日元生在不同月令時，需要什麼五行來做用神，第三步是看天干是否有合化，可跟據蔡進源師傅對天干五合的理論，甲己合化土，乙庚合化金，丙辛合化水，丁壬合化木，戊癸合化火，以「逢合必化，只分真假」來判斷化神是否用神，忌神或是調候用神，可知對命局有沒有幫助。第四步如果有殺，則需要有殺先論殺，日主和殺相比，殺弱就以財滋殺，日主比殺弱，就必要用傷官或食神制殺，或用印化殺，但格局只有一種，判定為財滋弱殺就原能用食神，傷官制殺和用印化殺，如殺比日元旺，用食神傷官制殺，就不能用印化殺，用印化殺就不能用食神或傷官制殺
- 必須按照【命理分析穩定性與一致性約束】中的規定，明確列出並解釋八字原局的唯一「用神」、「病」和「藥神」，除非該五行被傷盡，否則應在原局八字中找出用神，如非必要，日元必須當令，才可以在月令藏元中捉用神
- 捉用神必須以格局用神為準，不能以身弱用印比劫，身強用洩為用神，格局用神才是真用神，生旺用神是喜神，尅用神是忌神，尅忌神是藥神。用神用時可以是調候，可以是藥神。日元亦可以是用神。留意如果用神是火忌水，用神是水忌土，用神是金忌火，用神是土忌木，用神是木忌金

### 二、 格局與十神性格分析
- 必須依據之前的八字分析，說明原命局的主要格局、破局，或者是無格局 (參考內部參考法則，滴天髓徵義和子平一得中所提到的命例格局）。
- 分析天干主星與地支藏干對命主性格、做事風格的影響。（可參考內部參考法則、滴天髓徵義中的性情篇和子平一得對性格和驛馬中的解釋對命主的影響）
- 七政四餘：以命宮、命度、命主、度主、身宮所坐星曜及其廟旺、行度、化曜，論命主外貌氣質、性情與處事作風，並參看【相貌宮】【福德宮】。
- 星平合參結論：列出性格上的優點（吉）與缺點（凶），並說明這些性格特質在人生中帶來的助力與阻力。

### 三、 五行喜忌與生活建議
- 子平八字：針對五行過旺或缺乏的項目，按用神喜忌提供適合的行業方向、方位、顏色、補運建議與心態調整。
- 七政四餘：按恩星（生命主、度主者）與仇星（剋命主、度主者）、星盤五行偏枯，以及失地或受剋之宮位，提出宜親近及宜避開之人、事、行業與環境。
- 星平合參結論：分別列出有利（吉）與不利（凶）之生活選擇，並說明理由。

### 四、 分析命主的出身，事業，感情和健康
- 結合命主的八字和七政四餘星盤作出詳盡分析，出身家境與學業、事業、感情、健康四項，每項均須具備「子平八字／七政四餘／星平合參結論」三層，並明確標示吉凶
- 七政四餘看法：出身家境看【田宅宮】【福德宮】及命主得失，學業看【官祿宮】【遷移宮】及水星、木星；事業看【官祿宮】【財帛宮】【遷移宮】；感情看【夫妻宮】【男女宮】及日月、金星；健康看【疾厄宮】及受羅計孛火土侵擾之宮位
- 利用原局八字，分析命主的出身，家境和學業成績。（參考內部參考法則、滴天髓徵義對格局的評論，子平一得蔡進源師傅的命例，留意驛馬星或八字四柱有沒有天尅地沖，如有，要留意命主有沒有出國讀書的機會，分析原局八字和大運對命主出身，家境和學業成績的影響。）
- 分析命主的事業和工作情況。結合命主的【現時職業】，用原局八字配合大運，配合十神含意和生尅制化，詳細推斷和解釋那一個大運對命主最為有利和特別需要注意的地方，批算時一定要先參考內部法則，滴天髓徵義對格局的評論，子平一得蔡進源師傅評註中的命例，留意有沒有驛馬，如有驛馬，要留意命主會否有到國外工作之類的機會，推論大運有什麼事發生
- 事業項必須按【事業與感情專章】寫齊「吉事／凶事／應期／應對方法」四組條列：吉事與凶事各至少 3 條，寫清具體事情、哪個大運、依據與應對方法。
- 先確認【命主性別】是乾造（男）還是坤造（女），並結合【現時婚姻/感情狀態】。分析感情狀況時，直接以男命財星/女命官殺星確切論述，嚴禁寫「假設」。配合內部參考法則與滴天髓徵義女命篇，詳細解釋那一個時候最易有桃花和真姻緣出現，觀察妻星或夫星有沒有在大運或流年出現，或地支六合、會局或沖合夫妻宮。
- 感情項必須按【事業與感情專章】寫齊「吉事／凶事／應期／應對方法」四組條列：吉事與凶事各至少 3 條，寫清具體事情、應期、依據與應對方法。
- 分析命主的健康狀況：以八字五行偏枯、受沖剋之干支，對照七政【疾厄宮】宮主及星曜，指出需注意之身體部位、易發病的時段與保健方法。

### 五、 選前 1個，後4個主要大運，詳細評估大運干支對原局用神的影響，跟據十神含意，批斷該大運否能會發生的吉事和凶事，並且提供解決方法
- 參考提到所有精通的八字書藉和內部參考法則，詳細分析原局八字加大運配合流年對命主事業、感情、健康的影響，利用十神含意推論產生的象，詳細，專業和嚴謹地推斷和解釋有機會發生什麼事，是吉是凶，提供趨吉避凶的方法，以 point form 形式列出
- 七政四餘：每個大運均須對照同一歲數範圍所行之大限宮位（見十二宮位的大限歲數），以該宮宮主、宮內星曜之廟旺化曜論吉凶，並與大運結論互相印證，標示該段運程【吉】【凶】。

### 六、 當下流年運勢評語
- 利用日主所輸入的出生日期，結合八字命盤和七政四餘，配合大運及流年，利用十神含意，生尅制化，各星宿的生尅，詳細推斷對命主該年流年運勢的影響，包括吉凶、變化與可能的發展方向，並提供趨吉避凶的方法，只需要${DEEP_REPORT_YEAR}的流年，不需要其他年份
- 七政四餘部分必須引用資料中【${DEEP_REPORT_YEAR} 年七政四餘流年數據】的所行大限及流年星曜過宮，分事業、財運、感情、健康逐項講明吉凶。

語氣請保持客觀、專業、詳盡；吉凶必須直言並說明依據，不可只報喜不報憂，亦不可誇大恐嚇，並為每一項凶象提供化解方法。`;

      userPromptText = `請幫我分析以下八字與七政四餘命盤數據，進行【原局深度解盤】：\n\n${formattedText}`;
    }

    if (baziData?.qizhengData) {
      initialSystemPrompt += `

【七政四餘星盤批算必須參考文獻】（凡涉及星盤、宮位、星曜、大限、流年星曜之論斷，必須依據以下法則）：
${QIZHENG_REFERENCE_DOCS}`;
    }

    const scoreSpec = scoreBlockSpec(type, baziData?.dayyun);
    initialSystemPrompt += `${scoreSpec}

【初稿篇幅】：你是三份初稿之一。請寫齊所有章節；三層都用條列重點，每條一行，不要長篇。結論最多 5 條。`;

    // ==================================================================
    // 第一階段：DeepSeek + Qwen + Grok 三 AI 平行同步初批
    // ==================================================================
    const draftDeadline = startedAt + DRAFT_BUDGET_MS;
    const finalDeadline = startedAt + TOTAL_BUDGET_MS;
    const callDraft = (label: string, url: string, key: string, models: string[]) =>
      streamChat(label, url, key, models, initialSystemPrompt, userPromptText, draftDeadline, executionErrors);

    let draftDeepseek = resumeState?.drafts.deepseek ?? '';
    let draftQwen = resumeState?.drafts.qwen ?? '';
    let draftGrok = resumeState?.drafts.grok ?? '';
    if (!resumeState) {
      const deepseekPromise = callDraft('DeepSeek', 'https://api.deepseek.com/chat/completions', deepseekKey, ['deepseek-chat']);

      let qwenPromise: Promise<StreamResult> = Promise.resolve(EMPTY_RESULT);
      if (dashscopeKey) {
        qwenPromise = callDraft('Qwen(DashScope)', 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', dashscopeKey, ['qwen-max']);
      } else if (openrouterKey) {
        qwenPromise = callDraft('Qwen(OpenRouter)', 'https://openrouter.ai/api/v1/chat/completions', openrouterKey, ['qwen/qwen-2.5-72b-instruct']);
      } else {
        executionErrors['Qwen'] = '未設定 QWEN_API_KEY 或 OPENROUTER_API_KEY';
      }

      let grokPromise: Promise<StreamResult> = Promise.resolve(EMPTY_RESULT);
      if (xaiKey || openrouterKey) {
        grokPromise = (async () => {
          if (xaiKey) {
            const r = await callDraft('Grok', 'https://api.x.ai/v1/chat/completions', xaiKey, ['grok-2-latest', 'grok-2']);
            if (r.text.trim()) return r;
          }
          if (openrouterKey) return callDraft('Grok(OpenRouter)', 'https://openrouter.ai/api/v1/chat/completions', openrouterKey, ['x-ai/grok-2']);
          return EMPTY_RESULT;
        })();
      } else {
        executionErrors['Grok'] = '未設定 XAI_API_KEY / GROK_API_KEY 或 OPENROUTER_API_KEY';
      }

      const [deepseekResult, qwenResult, grokResult] = await Promise.all([deepseekPromise, qwenPromise, grokPromise]);

      const draftText = (r: StreamResult) => (r.text.trim() && isTruncated(r) ? `${r.text}\n\n（此初稿因長度或時限中斷，未完部分請審閱時補全）` : r.text);
      draftDeepseek = draftText(deepseekResult);
      draftQwen = draftText(qwenResult);
      draftGrok = draftText(grokResult);
    }

    // ==================================================================
    // 第二階段：Google Gemini 大師終極校訂與總審閱
    // ==================================================================
    let finalReport = '';
    let finalTruncated = false;
    let geminiUsed = false;
    let resumeOut: ResumeState | null = null;

    if (geminiKey) {
      const remaining = finalDeadline - Date.now();
      const proFirst = remaining > 140_000;
      const geminiModels = proFirst
        ? ['gemini-4-argon', 'gemini-2.5-pro', 'gemini-3.8-flash', 'gemini-2.5-flash']
        : ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-4-argon'];

      const chapters = reportChapters(type, targetGanZhiStr, DEEP_REPORT_YEAR);
      const reviewShared = `你是一位權威八字命理與七政四餘的總審閱官，精通子平八字、《滴天髓徵義》、《造化元鑰》、《子平一得》、神峰通考、《鄭氏星案》、《果老星宗》與《星學大成》。
請根據命盤與初稿，寫出給命主閱讀的最終報告，不要顯示審閱過程。
用神、格局必須唯一；男命論妻、女命論夫；有殺先論殺；地支除本氣與月令藏元外不可捉用神。
每一分析節必須含 **子平八字**、**七政四餘**、**星平合參結論**。前兩層各 3–6 條重點；核心批斷每條一行：【吉／中吉／平／小凶／凶】＋一句人話＋括號內一句依據。
事業與感情兩項必須額外寫齊 **吉事／凶事／應期／應對方法** 四組條列（吉凶各至少 3 條），推斷具體會發生的事情與可執行的做法，不可空泛。用字淺易，先講結果再講原因，段落之間用分隔線。提到五行必須寫出木火土金水單字。嚴禁朱雀橋理論，嚴禁改動排盤數據。

【命盤數據】：
${formattedText}

${baziData?.qizhengData ? `【七政四餘批算法則】：\n${QIZHENG_REFERENCE_DOCS}\n` : ''}
【子平內部法則（摘要，必須遵守）】：
${ADMIN_REFERENCE_DOCS}

【初稿節錄（DeepSeek）】：
${clipDraft(draftDeepseek) || '（未回應）'}

【初稿節錄（Qwen）】：
${clipDraft(draftQwen) || '（未回應）'}

【初稿節錄（Grok）】：
${clipDraft(draftGrok) || '（未回應）'}`;

      const parts: string[] = resumeState ? resumeState.done.filter((p) => typeof p === 'string' && p.trim()) : [];
      const startChapter = Math.min(Math.max(Number(resumeState?.chapter) || 0, 0), chapters.length);
      let pendingPartial = resumeState?.partial?.trim() ?? '';
      let nextChapter = -1;

      for (let i = startChapter; i < chapters.length; i++) {
        if (Date.now() > finalDeadline - 15_000) {
          nextChapter = i;
          break;
        }
        const chapter = chapters[i];
        const context = `${reviewShared}\n【本段任務：${chapter.title}】\n${chapter.outline}`;

        let first: StreamResult;
        if (pendingPartial) {
          first = { text: pendingPartial, finish: 'MAX_TOKENS' };
          pendingPartial = '';
        } else {
          const prev = parts.join('\n\n').slice(-1200);
          const prompt = `${reviewShared}

【本段任務：${chapter.title}】
${chapter.outline}
${i === 0 ? '本段結束時不要輸出 JSON 評分。' : `上一段已完成，結尾如下（供銜接，勿重寫）：\n${prev || '（無）'}\n本段寫完後，另起一行輸出唯一 JSON 評分區塊：${scoreSpec}`}
只輸出命主報告正文。`;
          first = await streamGeminiChapter(
            geminiKey,
            prompt,
            finalDeadline,
            geminiModels,
            `Gemini-${chapter.title}`,
            executionErrors,
            CHAPTER_MAX_TOKENS
          );
        }

        const done = await completeGeminiText(
          geminiKey,
          first,
          context,
          finalDeadline,
          geminiModels,
          `Gemini-${chapter.title}`,
          executionErrors
        );
        if (!done.text.trim()) {
          nextChapter = i;
          break;
        }
        if (isTruncated(done)) {
          nextChapter = i;
          pendingPartial = done.text.trim();
          break;
        }
        parts.push(done.text.trim());
      }

      const written = pendingPartial ? [...parts, pendingPartial] : parts;
      if (written.length) {
        finalReport = written.join('\n\n---\n\n');
        geminiUsed = true;
      }
      if (geminiUsed && nextChapter >= 0) {
        finalTruncated = true;
        resumeOut = {
          chapter: nextChapter,
          partial: pendingPartial,
          done: parts,
          drafts: { deepseek: clipDraft(draftDeepseek), qwen: clipDraft(draftQwen), grok: clipDraft(draftGrok) },
        };
      }
    } else {
      executionErrors['Gemini'] = '未設定 GEMINI_API_KEY';
    }

    if (!finalReport) {
      return NextResponse.json(
        {
          error: 'Gemini 總審閱未能完成，分析失敗。請按「重新批算」再試一次。',
          failed: true,
          details: executionErrors,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      result: finalReport,
      meta: {
        type,
        targetYear,
        deepseekUsed: !!draftDeepseek,
        qwenUsed: !!draftQwen,
        grokUsed: !!draftGrok,
        geminiUsed: geminiUsed,
        truncated: finalTruncated,
        resume: resumeOut,
        errors: executionErrors,
      },
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '伺服器內部錯誤', details: executionErrors },
      { status: 500 }
    );
  }
}