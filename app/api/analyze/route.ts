import { NextResponse } from 'next/server';
import { ADMIN_REFERENCE_DOCS } from '@/lib/adminKnowledge';

// 1. 強制動態獲取環境變數，禁止靜態快取
export const dynamic = 'force-dynamic';

// 2. 延長 Vercel 超時限制至 300 秒（Vercel Pro 帳號生效）
export const maxDuration = 300;

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

// 構建傳給 AI 的八字 Prompt 文字
function buildBaziText(baziData: any, userNotes?: string) {
  const { eightChar, dayGan, dayGanWuxing, wuxingCounts, dayyun, solarDate, lunarDate, gender, genderText } = baziData;

  const genderDisplay = genderText || (gender === 'female' ? '坤造（女）' : '乾造（男）');

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
    : '無額外補充資料，請直接進行常規八字全盤推算。';

  return `
【陽曆日期】：${solarDate}
【農曆日期】：${lunarDate}
【命主性別】：${genderDisplay}
【日主（日干）】：${dayGan}（五行屬${dayGanWuxing}）

【四柱八字與十神藏干】：
- 年柱：${eightChar.year.gan}${eightChar.year.zhi}（天干十神：${eightChar.year.ganShishen}，藏干：${eightChar.year.zangGan.join('/')}，藏干十神：${(eightChar.year.zangGanShishen || []).join('/')}）
- 月柱：${eightChar.month.gan}${eightChar.month.zhi}（天干十神：${eightChar.month.ganShishen}，藏干：${eightChar.month.zangGan.join('/')}，藏干十神：${(eightChar.month.zangGanShishen || []).join('/')}）
- 日柱：${eightChar.day.gan}${eightChar.day.zhi}（日主，藏干：${eightChar.day.zangGan.join('/')}，藏干十神：${(eightChar.day.zangGanShishen || []).join('/')}）
- 時柱：${eightChar.hour.gan}${eightChar.hour.zhi}（天干十神：${eightChar.hour.ganShishen}，藏干：${eightChar.hour.zangGan.join('/')}，藏干十神：${(eightChar.hour.zangGanShishen || []).join('/')}）

【天干五合檢驗結果】：${ganHeResult}

【八字十神整體統計】：${godSummary || '無'}

【八字五行數量統計】：
- 木：${wuxingCounts.木} 個
- 火：${wuxingCounts.火} 個
- 土：${wuxingCounts.土} 個
- 金：${wuxingCounts.金} 個
- 水：${wuxingCounts.水} 個

【命主自述個人背景 / 參考文檔 / 特定提問】：
${formattedNotes}

【大運走勢】：
${dayyun.map((d: any) => `- ${d.age}歲起大運：${d.ganZhi}`).join('\n')}
  `.trim();
}

// API Route 主入口
export async function POST(req: Request) {
  const executionErrors: Record<string, string> = {};

  try {
    const { baziData, userNotes } = await req.json();

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

    const formattedText = buildBaziText(baziData, userNotes);

    const initialSystemPrompt = `你是一位跟隨徐樂吾學習八字多年、深得徐樂吾真傳，精通子平八字、「滴天髓徵義」徐樂吾編註、「造化元鑰」徐樂吾評註、神峰通考、徐樂吾的有殺先論殺和「子平一得」蔡進源補註的資深命理專家。利用滴天髓中的扶抑、調候、通關定格局與用捉用神的技術，造化元鑰中的十天干在不同月令的十天干喜忌，神峰通考中的病藥說和繼善編裡各種對命格的口訣，徐樂吾有殺先論殺如殺比日主弱，以財滋弱殺論，如殺比日主強，以殺印相生或食神制殺論、蔡進源補註「子平一得」中的命例來判斷八字格局高低，嚴禁使用朱鵲橋一派的任何理論來批算八字。
請必定要完全根據使用者提供的已知八字數據，參考文檔，滴天髓徵義，造化元鑰，神峰通考，子平一得等書藉進行分析，嚴禁修改干支或自行重新計算排盤。

【性別與感情婚姻批斷嚴格約束】：
- 必須嚴格根據資料中的【命主性別】進行批斷，絕不可寫出「假設命主為男/女」或「假設」等字眼。
- 若性別為「乾造（男）」，第四點感情婚姻必須直接以正財/偏財為妻星、日支為妻宮和參照內部參考法則和滴天髓徵命進行確切論述。
- 若性別為「坤造（女）」，第四點感情婚姻必須直接參照內部參考法則和滴天髓徵義女命篇進行確切論述。

【命理分析穩定性與一致性約束】：
1. 【確定性推導原則】：相同八字原局必須導出唯一的日主用神判定，嚴禁在不同批算中出現矛盾結論。
2. 【用神一貫性】：一旦在第一部分判定日主的用神，後續所有關於大運吉凶、感情婚姻、事業建議的分析，必須 100% 圍繞該用神進行演繹，不得出現用神前後不一致的情況。
3. 捉用神必須先參照造化元鑰中十天干在不同月令的喜忌，滴天髓補註中的命例，子平一得的命例，必須在原局八字中找出有用之神，不可用地支藏元做用神，五行雖弱，但仍可作用神，如果八字天干地支入面找不到有用之神，除非該五行在原局中被傷盡，否則都應在原局中捉用神，日元必須當令的情況下，才可在月令藏元中捉用神，否則需要判斷是否無用神。
4. 喜忌之定義是生旺用神是喜神，八字之中有用之神為用神，忌神為尅用神之神，病為原局八字問題之處，藥神為醫治病的藥。

流年運勢評語
1. 必須跟據真實時間之年份來批算流年。

批命報告格式
1. 每次批命報告必須要以最專業的態度，詳盡分析命主的事業，感情和健康的好處與壞處，命書格式和內容每次分析都必須相同，以免出現同一用戶重覆批算相同命格，或不同命主批命時，會出現不同結果和格式。

五行生尅
- 木生火，火生土，土生金，金生水，水生木
- 必須嚴格遵守用木忌金，用金忌火，用火忌水，用水忌土，用土忌木

【參考文獻與指定批命規範】：
--------------------------------------------------
${ADMIN_REFERENCE_DOCS}
--------------------------------------------------

請結合上述參考規範、使用者輸入的個人文檔與八字數據，進行專業推斷。
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
- 利用原局八字，分析命主的出身，家境和學業成績。（參考內部參考法則、滴天髓徵義對格局的評論，子平一得蔡進源師傅的命例，留意驛馬星或八字四柱有沒有天尅地沖，如有，要留意命主有沒有出國讀書的機會，分析原局八字和大運對命主出身，家境和學業成績的影響。）
- 分析命主的事業和工作情況。用原局八字配合大運，配合十神含意和生尅制化，詳細解釋那一個大運對命主最為有利和特別需要注意的地方，批算時一定要先參考內部法則，滴天髓徵義對格局的評論，子平一得蔡進源師傅評註中的命例，留意有沒有驛馬，如有驛馬，要留意命主會否有到國外工作之類的機會，推論大運有什麼事發生
- 先確認【命主性別】是乾造（男）還是坤造（女）。分析感情狀況時，直接以男命財星/女命官殺星確切論述，嚴禁寫「假設」。配合內部參考法則與滴天髓徵義女命篇，詳細解釋那一個時候最易有桃花和真姻緣出現，觀察妻星或夫星有沒有在大運或流年出現，或地支六合、會局或沖合夫妻宮。

### 五、 選前 4~5 個主要大運，詳細評估大運干支對原局用神的影響，跟據十神含意，批斷該大運否能會發生的吉事和凶事，並且提供解決方法
- 參考提到所有精通的八字書藉和內部參考法則，詳細分析原局八字加大運配合流年對命主的影響，利用十神含意推論產生的象，詳細解釋有機會發生什麼事，是吉是凶，提供趨吉避凶的方法

### 六、 當下流年運勢評語
- 利用日主所輸入的出生日期，結合八字命盤，配合大運及流年，利用十神含意，生尅制化，詳細評估對命主該年流年運勢的影響，包括吉凶、變化與可能的發展方向，並提供趨吉避凶的方法

語氣請保持客觀、理性且富有建設性，避免過度武斷或誇大災禍。`;

    // ==================================================================
    // 第一階段：DeepSeek + Qwen + Grok 三 AI 平行同步初批 (Promise.all)
    // ==================================================================

    // 1.1 DeepSeek 初批
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
          { role: 'user', content: `請幫我分析以下八字命盤數據：\n\n${formattedText}` },
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

    // 1.2 Qwen 初批
    let qwenPromise: Promise<any> = Promise.resolve(null);
    if (openrouterKey) {
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
            { role: 'user', content: `請幫我分析以下八字命盤數據：\n\n${formattedText}` },
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
    } else if (dashscopeKey) {
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
            { role: 'user', content: `請幫我分析以下八字命盤數據：\n\n${formattedText}` },
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
    } else {
      executionErrors['Qwen'] = '未設定 QWEN_API_KEY 或 OPENROUTER_API_KEY';
    }

    // 1.3 Grok 初批 (順序優先調用最新模型)
    let grokPromise: Promise<any> = Promise.resolve(null);
    
    const preferredXaiModels = ['grok-3', 'grok-2-latest', 'grok-2', 'grok-2-vision-1212'];
    const preferredOpenRouterModels = ['x-ai/grok-3', 'x-ai/grok-2', 'x-ai/grok-2-vision'];

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
                  { role: 'user', content: `請幫我分析以下八字命盤數據：\n\n${formattedText}` },
                ],
              }),
            });

            if (res.ok) {
              console.log(`✅ Grok 直連成功，使用模型: (${modelName})`);
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
          console.log('🔄 xAI 直連失敗，自動切換至 OpenRouter 嘗試最新 Grok 模型...');
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
                    { role: 'user', content: `請幫我分析以下八字命盤數據：\n\n${formattedText}` },
                  ],
                }),
              });

              if (res.ok) {
                console.log(`✅ OpenRouter 備援成功，使用 Grok 模型: (${orModel})`);
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
                  { role: 'user', content: `請幫我分析以下八字命盤數據：\n\n${formattedText}` },
                ],
              }),
            });

            if (res.ok) {
              console.log(`✅ OpenRouter 成功，使用 Grok 模型: (${orModel})`);
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
    // 第二階段：Google Gemini 3.8 Flash 大師終極校訂與總審閱
    // ==================================================================
    let finalReport = '';
    let geminiUsed = false;

    if (geminiKey) {
      const geminiPrompt = `
你是一位權威八字命理總審閱官，精通子平八字、《滴天髓徵義》、《造化元鑰》、《子平一得》、神峰通考和命理師指定的內部參考法則。
以下是由三位命理 AI（DeepSeek、Qwen 通義千問與 xAI Grok）對同一八字進行的初批草稿。

【審閱與嚴格修正要求】：
1. 嚴格對照【原八字排盤數據】與【內部參考規範】，對比 DeepSeek、Qwen 與 Grok 對於「用神、格局、病藥、喜忌」的判定。若有分歧，必須依據《造化元鑰》十干月令喜忌與《子平一得》為唯一標準進行裁決，確定唯一的格局與用神，嚴禁出現前後矛盾，用神不等於調候用神。
2. 檢查初批報告有無「十神生剋錯誤」、「天干合化誤判」或「前後喜用神不一致」等邏輯矛盾，在批斷大運和流年吉凶等事情，是否有所遺漏錯誤，如有，應作出補註或修改。
3. 確保第四部分感情婚姻分析 100% 符合命主的實際性別（男命論妻、女命論夫），完全刪除任何「假設命主為男/女」等不確定字眼。
4. 檢查「格局」與「用神」是否唯一，嚴禁同時出現兩種矛盾格局判定。
5. 出身、事業、感情和健康須要更專業、更詳盡解釋每個可能性給命主知道，如初級報告沒有提及或有遺漏，需要修改和補註。
6. 請完全保留「六大章節 (### 一、至 ### 六、)」Markdown 格式輸出。
7. 排盤後，原局八字的天干和地支本氣有殺星，必須嚴格遵從有殺先論殺的所有規定，有殺先論殺凌駕所有法則，傷官當令除外。
8. 批斷時必定要遵從所有內部參考規則。
9. 地支除本氣和月令藏元外，其他一律不可以做用神。
10. 原局內有殺星，必須遵從有殺先論殺的所有規定，只比較日元和殺的強弱，原論身強弱，殺弱就是以財滋殺，殺為用神，殺強就制殺或以印化殺，不能殺弱但以印化殺或制殺
10. 收列初批草稿後，必須先嚴格審查所有批斷是否嚴格遵從所有列出的規則，如沒有就是修改及補註。
11. 必須清楚判斷用神，忌神，和藥神，不容任何錯誤，用神是原局中有用之神，忌神是尅用神之神，藥神是醫病之神。
12. 食神制殺格和傷官架殺格不能見印星，食神制殺若逢梟，非貧即夭，殺印相生格不能見財星，因為儲財破印。
13. 有殺先論殺第一步必須先比較日元和殺的強弱，比較方法可直接對比八字裡的數量，是殺多還是日元比劫多，是否當令，有沒有長生和庫等因素，殺星有沒有根，有沒有透出，有沒有被制化，有沒有被合化，有沒有被沖合等。

--------------------------------------------------
【原八字排盤數據與內部規範】：
${formattedText}

【初批草稿一 (DeepSeek)】：
${draftDeepseek || '（DeepSeek 未回應）'}

【初批草稿二 (Qwen 通義千問)】：
${draftQwen || '（Qwen 未回應）'}

【初批草稿三 (xAI Grok)】：
${draftGrok || '（xAI Grok 未回應）'}
--------------------------------------------------
`.trim();

      // 指定使用 gemini-3.8-flash 模型端點
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${geminiKey}`;

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
            console.log('✅ Gemini 3.8 Flash 大師終極校訂成功！');
          }
        } else {
          const err = await geminiResponse.text();
          executionErrors['Gemini(gemini-3.8-flash)'] = `HTTP ${geminiResponse.status}: ${err}`;
        }
      } catch (err: any) {
        executionErrors['Gemini(gemini-3.8-flash)'] = `網路異常: ${err.message}`;
      }
    } else {
      executionErrors['Gemini'] = '未設定 GEMINI_API_KEY';
    }

    if (!finalReport) {
      finalReport = draftDeepseek || draftQwen || draftGrok || '未取得分析結果，請檢視 API 金鑰與點數設定。';
    }

    return NextResponse.json({
      result: finalReport,
      meta: {
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