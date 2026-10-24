import { NextResponse } from 'next/server';
import { ADMIN_REFERENCE_DOCS } from '@/lib/adminKnowledge';

// 1. 強制動態獲取環境變數，禁止靜態快取
export const dynamic = 'force-dynamic';

// 2. 超時限制（Vercel Pro 設為 300 秒，Hobby 免費版請設為 60）
export const maxDuration = 300;

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
          .map((h: any) => `  * ${h.name}（${h.branch}宮・${h.zodiacSign}・宮主${h.ruler}）：${h.stars?.length ? h.stars.join('、') : '空宮'}${h.shensha?.length ? `；神煞：${h.shensha.join(' ')}` : ''}`)
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

// API Route 主入口
export async function POST(req: Request) {
  const executionErrors: Record<string, string> = {};

  try {
    const { type = 'deep', baziData, userNotes, targetYear = 2026, question } = await req.json();

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
    const formattedText = `${buildBaziText(baziData, userNotes)}${
      type !== 'deep' && targetLuck ? `\n\n【${targetYear} 年所行大運】：${targetLuck.ganZhi}（${targetLuck.startYear}–${targetLuck.endYear}年）` : ''
    }`;
    const targetGanZhiStr = getYearGanZhi(targetYear);

    // 基於三大功能（deep / yearly / yearly_qa）動態選用系統提示詞與輸出格式規範
    let initialSystemPrompt = '';
    let userPromptText = '';

    const baseExpertPersona = `你是一位跟隨徐樂吾學習八字和七政四餘多年、深得徐樂吾真傳，精通子平八字與「星平合參」（子平八字 + 七政四餘星學）的資深命理大師。
你熟讀《滴天髓徵義》徐樂吾編註、《造化元鑰》徐樂吾評註、《神峰通考》、徐樂吾「有殺先論殺」、《子平一得》蔡進源補註、鄭希誠《鄭氏星案》、《果老星宗》與萬民英《星學大成》。
利用子平八字扶抑、調候、通關定格局與捉用神，同時對照七政四餘黃道十二宮（官祿宮、財帛宮、夫妻宮、疾厄宮等）、日月五星與四餘（羅睺、計都、紫氣、月孛）落宮狀態，互相印證。
嚴禁使用朱鵲橋一派的任何理論，嚴禁修改干支或自行重新計算排盤。`;

    if (type === 'yearly') {
      initialSystemPrompt = `${baseExpertPersona}

【分析任務】：請針對命主八字與七政四餘星盤進行【${targetGanZhiStr} 流年整體運勢解盤】。
請務必結合命主的【現時職業】與【現時婚姻/感情狀態】進行深度的流年演繹與星平對照。

請嚴格分成以下六部分，並以 Markdown 格式輸出：
### 一、 流年整體運勢總評（流年 ${targetGanZhiStr} 干支對日主、大運及原局八字生剋，對照七政流年限路星曜）
### 二、 事業與工作運勢推演（結合現時職業、八字官殺與七政【官祿宮】星曜分析轉職與升遷風險）
### 三、 財運走勢與投資理財風險分析（對照八字財星與七政【財帛宮】受餘星侵擾或吉星加臨）
### 四、 感情婚姻與人際關係吉凶（結合現時婚姻狀態、八字夫妻宮與七政【夫妻宮】主星推算）
### 五、 健康狀況與安全注意事項（結合八字五行傾斜與七政【疾厄宮】星曜）
### 六、 全年吉凶月份提醒與趨吉避凶錦囊`;

      userPromptText = `請幫我分析以下八字與七政四餘命盤在【${targetGanZhiStr}】的流年整體運勢：\n\n${formattedText}`;
    } else if (type === 'yearly_qa') {
      initialSystemPrompt = `${baseExpertPersona}

【分析任務】：請針對命主於【${targetGanZhiStr}】提出之特定問題【${question || '流年吉凶問事'}】進行【流年問事精準解答】。
請結合命主的【現時職業】與【現時婚姻/感情狀態】，運用星平合參提供切合現實狀況的解答。

請嚴格分成以下二部分，並以 Markdown 格式輸出：
### 一、 針對問題之流年吉凶明確斷語（結合八字流年與七政宮位星曜直指好壞變動）
### 二、 具體應對方針與趨吉避凶行動建議`;

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

### 三、 五行喜忌與生活建議
- 針對五行過旺或缺乏的項目，提供適合的行業方向、補運建議與心態調整。

### 四、 分析命主的出身，事業，感情和健康
- 結合命主的八字和七政四餘星盤作出詳盡分析
- 利用原局八字，分析命主的出身，家境和學業成績。（參考內部參考法則、滴天髓徵義對格局的評論，子平一得蔡進源師傅的命例，留意驛馬星或八字四柱有沒有天尅地沖，如有，要留意命主有沒有出國讀書的機會，分析原局八字和大運對命主出身，家境和學業成績的影響。）
- 分析命主的事業和工作情況。結合命主的【現時職業】，用原局八字配合大運，配合十神含意和生尅制化，詳細推斷和解釋那一個大運對命主最為有利和特別需要注意的地方，批算時一定要先參考內部法則，滴天髓徵義對格局的評論，子平一得蔡進源師傅評註中的命例，留意有沒有驛馬，如有驛馬，要留意命主會否有到國外工作之類的機會，推論大運有什麼事發生
- 先確認【命主性別】是乾造（男）還是坤造（女），並結合【現時婚姻/感情狀態】。分析感情狀況時，直接以男命財星/女命官殺星確切論述，嚴禁寫「假設」。配合內部參考法則與滴天髓徵義女命篇，詳細解釋那一個時候最易有桃花和真姻緣出現，觀察妻星或夫星有沒有在大運或流年出現，或地支六合、會局或沖合夫妻宮。

### 五、 選前 1個，後4個主要大運，詳細評估大運干支對原局用神的影響，跟據十神含意，批斷該大運否能會發生的吉事和凶事，並且提供解決方法
- 參考提到所有精通的八字書藉和內部參考法則，詳細分析原局八字加大運配合流年對命主事業、感情、健康的影響，利用十神含意推論產生的象，詳細，專業和嚴謹地推斷和解釋有機會發生什麼事，是吉是凶，提供趨吉避凶的方法，以 point form 形式列出

### 六、 當下流年運勢評語
- 利用日主所輸入的出生日期，結合八字命盤和七政四餘，配合大運及流年，利用十神含意，生尅制化，各星宿的生尅，詳細推斷對命主該年流年運勢的影響，包括吉凶、變化與可能的發展方向，並提供趨吉避凶的方法，只需要2027的流年，不需要其他年份

語氣請保持客觀、理性且富有建設性，避免過度武斷或誇大災禍。`;

      userPromptText = `請幫我分析以下八字與七政四餘命盤數據，進行【原局深度解盤】：\n\n${formattedText}`;
    }

    const scoreSpec = scoreBlockSpec(type, baziData?.dayyun);
    initialSystemPrompt += scoreSpec;

    // ==================================================================
    // 第一階段：DeepSeek + Qwen + Grok 三 AI 平行同步初批 (Promise.all)
    // ==================================================================

    // 1.1 DeepSeek 初批 (使用 deepseek-chat 旗艦通用模型)
    const deepseekPromise = fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      signal: AbortSignal.timeout(280000),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deepseekKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        temperature: 0.0,
        top_p: 0.1,
        messages: [
          { role: 'system', content: initialSystemPrompt },
          { role: 'user', content: userPromptText },
        ],
      }),
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.text();
        executionErrors['DeepSeek'] = `HTTP ${res.status}: ${err}`;
        return null;
      }
      return res.json();
    }).catch((err) => {
      executionErrors['DeepSeek'] = `網路異常: ${err.message}`;
      return null;
    });

    // 1.2 Qwen 初批 (優先調用 qwen-max)
    let qwenPromise: Promise<any> = Promise.resolve(null);
    if (dashscopeKey) {
      qwenPromise = fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
        method: 'POST',
        signal: AbortSignal.timeout(280000),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${dashscopeKey}`,
        },
        body: JSON.stringify({
          model: 'qwen-max',
          temperature: 0.0,
          messages: [
            { role: 'system', content: initialSystemPrompt },
            { role: 'user', content: userPromptText },
          ],
        }),
      }).then(async (res) => {
        if (!res.ok) {
          const err = await res.text();
          executionErrors['Qwen(DashScope)'] = `HTTP ${res.status}: ${err}`;
          return null;
        }
        return res.json();
      }).catch((err) => {
        executionErrors['Qwen(DashScope)'] = `網路異常: ${err.message}`;
        return null;
      });
    } else if (openrouterKey) {
      qwenPromise = fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: AbortSignal.timeout(280000),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openrouterKey}`,
        },
        body: JSON.stringify({
          model: 'qwen/qwen-2.5-72b-instruct',
          temperature: 0.0,
          messages: [
            { role: 'system', content: initialSystemPrompt },
            { role: 'user', content: userPromptText },
          ],
        }),
      }).then(async (res) => {
        if (!res.ok) {
          const err = await res.text();
          executionErrors['Qwen(OpenRouter)'] = `HTTP ${res.status}: ${err}`;
          return null;
        }
        return res.json();
      }).catch((err) => {
        executionErrors['Qwen(OpenRouter)'] = `網路異常: ${err.message}`;
        return null;
      });
    } else {
      executionErrors['Qwen'] = '未設定 QWEN_API_KEY 或 OPENROUTER_API_KEY';
    }

    // 1.3 Grok 初批 (調用 grok-2 / grok-2-latest)
    let grokPromise: Promise<any> = Promise.resolve(null);
    const preferredXaiModels = ['grok-2-latest', 'grok-2'];
    const preferredOpenRouterModels = ['x-ai/grok-2'];

    if (xaiKey) {
      grokPromise = (async () => {
        for (const modelName of preferredXaiModels) {
          try {
            const res = await fetch('https://api.x.ai/v1/chat/completions', {
              method: 'POST',
              signal: AbortSignal.timeout(280000),
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${xaiKey}`,
              },
              body: JSON.stringify({
                model: modelName,
                temperature: 0.0,
                messages: [
                  { role: 'system', content: initialSystemPrompt },
                  { role: 'user', content: userPromptText },
                ],
              }),
            });

            if (res.ok) {
              return await res.json();
            } else {
              const errText = await res.text();
              executionErrors[`Grok(${modelName})`] = `HTTP ${res.status}: ${errText}`;
            }
          } catch (err: any) {
            executionErrors[`Grok(${modelName})`] = `網路異常: ${err.message}`;
          }
        }

        if (openrouterKey) {
          for (const orModel of preferredOpenRouterModels) {
            try {
              const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                signal: AbortSignal.timeout(280000),
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${openrouterKey}`,
                },
                body: JSON.stringify({
                  model: orModel,
                  temperature: 0.0,
                  messages: [
                    { role: 'system', content: initialSystemPrompt },
                    { role: 'user', content: userPromptText },
                  ],
                }),
              });

              if (res.ok) {
                return await res.json();
              } else {
                const errText = await res.text();
                executionErrors[`Grok(OpenRouter:${orModel})`] = `HTTP ${res.status}: ${errText}`;
              }
            } catch (err: any) {
              executionErrors[`Grok(OpenRouter:${orModel})`] = `網路異常: ${err.message}`;
            }
          }
        }

        return null;
      })();
    } else if (openrouterKey) {
      grokPromise = (async () => {
        for (const orModel of preferredOpenRouterModels) {
          try {
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              signal: AbortSignal.timeout(280000),
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${openrouterKey}`,
              },
              body: JSON.stringify({
                model: orModel,
                temperature: 0.0,
                messages: [
                  { role: 'system', content: initialSystemPrompt },
                  { role: 'user', content: userPromptText },
                ],
              }),
            });

            if (res.ok) {
              return await res.json();
            } else {
              const errText = await res.text();
              executionErrors[`Grok(OpenRouter:${orModel})`] = `HTTP ${res.status}: ${errText}`;
            }
          } catch (err: any) {
            executionErrors[`Grok(OpenRouter:${orModel})`] = `網路異常: ${err.message}`;
          }
        }
        return null;
      })();
    } else {
      executionErrors['Grok'] = '未設定 XAI_API_KEY / GROK_API_KEY 或 OPENROUTER_API_KEY';
    }

    // 三模型平行同時執行
    const [deepseekData, qwenData, grokData] = await Promise.all([
      deepseekPromise,
      qwenPromise,
      grokPromise,
    ]);

    const draftDeepseek = deepseekData?.choices?.[0]?.message?.content || '';
    const draftQwen = qwenData?.choices?.[0]?.message?.content || '';
    const draftGrok = grokData?.choices?.[0]?.message?.content || '';

    // ==================================================================
    // 第二階段：Google Gemini 大師終極校訂與總審閱
    // ==================================================================
    let finalReport = '';
    let geminiUsed = false;

    if (geminiKey) {
      const geminiPrompt = `
你是一位權威八字命理與七政四餘的總審閱官，精通子平八字、《滴天髓徵義》、《造化元鑰》、《子平一得》、神峰通考、《鄭氏星案》、《果老星宗》與《星學大成》之「星平合參」工藝。
以下是由三位命理 AI（DeepSeek、Qwen 通義千問與 xAI Grok）對同一八字與七政星盤進行的初批草稿。

【審閱與嚴格修正要求】：
1. 對比 DeepSeek、Qwen 與 Grok 的初批草稿，消除內部矛盾，確保用神與喜忌一貫，100% 遵照古典子平與內部法則。
2. 確保內容完全符合命主實際性別（男命論妻、女命論夫），完全刪除任何「假設命主為男/女」等字眼。
3. 務必結合命主輸入的【現時職業】與【現時婚姻/感情狀態】進行具體針對性的事業與婚姻分析。
4. 嚴格維持與當前功能類型（${type === 'yearly' ? '【流年整體運勢】' : type === 'yearly_qa' ? '【流年問事解答】' : '【原局深度解盤】'}）相匹配的 Markdown 章節結構輸出。
5. 只顯示命主的最終精緻批命報告，絕對不要顯示初批修正過程、審閱說明或對比過程。
6. 嚴格對照【原八字排盤數據】與【內部參考規範】，對比 DeepSeek、Qwen 與 Grok 對於「用神、格局、病藥、喜忌」的判定。若有分歧，必須依據《造化元鑰》十干月令喜忌與《子平一得》為唯一標準進行裁決，確定唯一的格局與用神，嚴禁出現前後矛盾，用神不等於調候用神。
7. 檢查初批報告有無「十神生剋錯誤」、「天干合化誤判」或「前後喜用神不一致」等邏輯矛盾，在批斷大運和流年吉凶等事情，是否有所遺漏錯誤，如有，應作出補註或修改。
8. 檢查「格局」與「用神」是否唯一，嚴禁同時出現兩種矛盾格局判定。
9. 出身、事業、感情和健康須要更專業、更詳盡解釋每個可能性給命主知道，如初級報告沒有提及或有遺漏，需要修改和補註。
10. 排盤後，原局八字的天干和地支本氣有殺星，必須嚴格遵從有殺先論殺的所有規定，有殺先論殺凌駕所有法則，傷官當令除外。
11. 批斷時必定要遵從所有內部參考規則。
12. 地支除本氣和月令藏元外，其他一律不可以做用神。
13. 原局內有殺星，必須遵從有殺先論殺的所有規定，只比較日元和殺的強弱，原論身強弱，殺弱就是以財滋殺，殺為用神，殺強就制殺或以印化殺，不能殺弱但以印化殺或制殺，用神和藥神要分清楚。
14. 必須清楚判斷用神，忌神，和藥神，不容任何錯誤，用神是原局中有用之神，忌神是尅用神之神，藥神是醫病之神。
15. 食神制殺格和傷官架殺格不能見印星，食神制殺若逢梟，非貧即夭，殺印相生格不能見財星，因為儲財破印。
16. 用字盡量淺易，令一般人容易明白，減少使用專業用語，避免使用過於深奧的詞彙，但仍需要保持專業，嚴謹和詳細的態度。
17. 每個新段落要用分隔線隔開，使人容易閱讀和理解。
18. 嚴禁使用朱雀橋派系裡面的任何理論。
19. 綜合三份初稿末尾的 JSON 評分，按你審定後的結論校正數值，並依下列要求在最終報告末尾輸出唯一一個 JSON 區塊：${scoreSpec}

--------------------------------------------------
【原命盤數據與內部規範】：
${formattedText}

【初批草稿一 (DeepSeek)】：
${draftDeepseek || '（DeepSeek 未回應）'}

【初批草稿二 (Qwen 通義千問)】：
${draftQwen || '（Qwen 未回應）'}

【初批草稿三 (xAI Grok)】：
${draftGrok || '（xAI Grok 未回應）'}
--------------------------------------------------
`.trim();

      // 調用 Gemini 官方最新標準模型代號
      const geminiModels = ['gemini-1.5-pro', 'gemini-1.5-flash'];

      for (const model of geminiModels) {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
        try {
          const geminiResponse = await fetch(geminiUrl, {
            method: 'POST',
            signal: AbortSignal.timeout(280000),
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: geminiPrompt }] }],
              safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
              ],
              generationConfig: { temperature: 0.0 },
            }),
          });

          if (geminiResponse.ok) {
            const geminiData = await geminiResponse.json();
            const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text && text.trim() !== '') {
              finalReport = text;
              geminiUsed = true;
              console.log(`✅ Gemini (${model}) 終極審閱成功！`);
              break;
            }
          } else {
            const err = await geminiResponse.text();
            executionErrors[`Gemini(${model})`] = `HTTP ${geminiResponse.status}: ${err}`;
          }
        } catch (err: any) {
          executionErrors[`Gemini(${model})`] = `網路異常: ${err.message}`;
        }
      }
    } else {
      executionErrors['Gemini'] = '未設定 GEMINI_API_KEY';
    }

    if (!finalReport) {
      finalReport = draftDeepseek || draftQwen || draftGrok || '未取得分析結果，請檢視 API 金鑰與網絡連線。';
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