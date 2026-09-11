import { NextResponse } from 'next/server';

// 延長 Vercel 超時限制至 60 秒
export const maxDuration = 60;

// 1. 自動計算天干五合（獨立函式）
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

// 2. 構建傳給 DeepSeek 的八字 Prompt 文字（含個人背景/補充文檔）
function buildBaziText(baziData: any, userNotes?: string) {
  const { eightChar, dayGan, dayGanWuxing, wuxingCounts, dayyun, solarDate, lunarDate } = baziData;

  // 自動彙整四柱天干與藏干的所有十神
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

  // 統計各十神出現次數
  const godCounts: Record<string, number> = {};
  allTenGods.forEach((god) => {
    if (god !== '日主') {
      godCounts[god] = (godCounts[god] || 0) + 1;
    }
  });

  const godSummary = Object.entries(godCounts)
    .map(([god, count]) => `${god}:${count}個`)
    .join('、');

  // 計算天干五合
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

// 3. API Route 主入口
export async function POST(req: Request) {
  try {
    const { baziData, userNotes } = await req.json();

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: '未設定 DEEPSEEK_API_KEY 環境變數，請至 Vercel 控制台新增。' },
        { status: 500 }
      );
    }

    const formattedText = buildBaziText(baziData, userNotes);

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: `你是一位跟隨徐樂吾學習八字多年、深得徐樂吾真傳，精通子平八字、「滴天髓徵義」徐樂吾編註、「造化元鑰」徐樂吾評註、神峰通考、徐樂吾的有殺先論殺和「子平一得」蔡進源補註的資深命理專家。利用滴天髓中的扶抑、調候、通關定格局與用捉用神的技術，造化元鑰中的十天干在不同月令的喜忌，神峰通考中的病藥說和繼善編裡各種對命格的口訣，徐樂吾有殺先論殺如殺比日主弱，以財滋弱殺論，如殺比日主強，以殺印相生或食神制殺論、蔡進源補註「子平一得」中的解釋來判斷八字格局高低，嚴禁使用朱鵲橋一派的任何理論來批算八字。
請完全根據使用者提供的已知八字數據與參考文檔進行分析，嚴禁修改干支或自行重新計算排盤。

【參考文獻與指定批命規範】：
以下為命理師指定的內部參考法則，請在推論時優先參照：
--------------------------------------------------
1. 《子平一得》蔡進源補註重點：
   - 凡見四驛馬（寅申巳亥），需特別評估出國、遠行或異地發展之象。
2. 命主自訂批斷口訣
   - 用之官星不可傷，不用官星儘可傷
   - 用之財星不可劫，不用財星儘可劫
   - 用之印綬不可壞，不用印綬儘可壞
   - 用之食神不可奪，不用食神儘可奪
   - 用之七殺不可制，制殺太過反為凶
   - 食神制殺若逢梟，不貧亦夭（食神是用神才有效）
   - 用神不可損傷，日主最宜健旺(陽日元)
   - 驛馬帶財，富自天來
3. 十神代表物象簡論
   - 正印代表名譽、面子、八卦、好奇、給予、懶惰、幻想、學問
   - 偏印代表精明幹練、領悟力高、幻想力強、挑剔、疑慮、冷漠
   - 正官代表權力、紀律、守法、固執、官僚、責任、約束
   - 七殺代表權威、實力、豪邁、勇氣、叛逆、無形壓力、焦慮、緊張、破壞力
   - 食神代表聰明、有藝術氣質、溫和靜態、緩慢、有耐性、猶豫不決
   - 傷官代表反應快、有急才、樂觀、樂辯、喜認叻、想到就做、無耐性、不喜被約束
   - 正財代表刻苦耐勞、安份守著、保守、謹慎、勤力、儉樸、踏實
   - 偏財代表要面子、急燥、爽快、精力充沛、喜歡玩樂、慷慨、不喜理財、人際關係好
   - 比肩代表樂觀進取、自尊心強、意志堅定、不能自我反省
   - 劫財代表有膽量、果斷、衝動、雖固執但能自我反省
4. 桃花星
   - 甲乙木的桃花星是子
   - 丙丁戊己的桃花星是卯
   - 庚辛的桃花星是午
   - 壬癸的桃花星是酉
5. 十神含意
   - 正印含意母親、助我之長輩、貴人、公司、房屋、美味的食物、保守的衣服、學業、靠山後台、正統宗教
   - 偏印含意繼母、奶媽、與我關係不密切的長輩、治病的藥物、不美味的食物、藝術、服務業、非正統宗教、前衛衣服
   - 比肩含意同性別之同事、朋友、男命代表兄弟、女命代表姊妹
   - 劫財含意異性同事、朋友、男命代表姊妹、女命代表兄弟
   - 傷官含意是運動、口才、反應、遊埠、著作、男命為下屬、女命為女兒
   - 食神含意是長壽、名譽、食祿、口福、歌舞、演講、著作、愛心、自由、男命為下屬、女命為女兒
   - 正官含意是丈夫緣、約束力、自制力、責任感、良心、理性認識法規、司法部門、司法人員、壓力、權力、上司、職位、考試、選舉、名譽、男命代表兒女
   - 七殺含意是軍警、暴徒、邪惡勢力、仇敵、疾病、不良嗜好、壓力、氣魄、勞逸、男命代表兒女、上司
   - 正財含意是妻緣、財運、財產、薪俸、及其他我支配使用的物品、不動產
   - 偏財含意是女人緣、父緣、橫財、投機
6. 驛馬真解
   - 寅是木日元之本命馬、火日元之印馬、土日元之殺馬。運逢申沖必動、與金水日元無關
   - 巳是火日元之本命馬、土日頭條元之本命馬及印馬、金日元之印馬及殺馬、運逢亥沖必動、與水木日元無關
   - 申是金日元之本命馬、水日元之印馬、土日元之食傷馬、運逢寅沖必動、與木火日元無關
   - 亥是水日元之本命馬、木日元之印馬、運逢巳沖必動、與火土日元無關
   - 地支刑沖多、日元無根、水多木漂、丑戌未三刑、傷官過多也可看成驛馬（多屬勞碌奔波之格）。
7. 從十神探六親消息
   - 財為妻財、比劫為兄弟姐妹、食傷為子媳、官殺為功名與子女、印綬為父母靠山。
8. 論「相刑」
   - 午酉刑（花酒應酬）、子卯刑（婦科/腎病）、午卯刑（心臟/眼疾）、丑戌未三刑（驛馬移民/轉行）、寅午戌（車船之險）、午午自刑（性急/頭面傷疤）、酉酉自刑（是非/潔癖）、辰辰自刑（漏水）、亥亥自刑（難受孕）。
9. 太歲：歲傷日主為禍不大，日犯歲君災殃必至。
10. 墓與庫之分別：庫者天透地藏生生不息，墓者不透不現緣份極薄。
11. 天干地支之刑沖合害疾病：戊癸合耳水不平衡、丙辛合鼻敏感、巳酉合牙骹、甲庚沖頭痛、乙辛沖頸膽問題、巳亥沖大腸/視網膜/痔瘡、卯酉沖淋巴/卵巢、申亥害盲腸炎、辰酉合腸胃氣、巳申合關節炎、丙壬沖大腦/眼疾、丁癸沖心疾、子午沖心疾、丑未沖血管窄。
12. 繼善篇精要口訣參照
13. 論命捷訣精要口訣參照
--------------------------------------------------

請結合上述參考規範、使用者輸入的個人文檔與八字數據，進行專業推斷。
內容請嚴格分成以下六部分，並以 Markdown 格式輸出：

### 一、 日主旺衰、論調候、天干合化、定格局、評論格局高低，捉用神，詳細指出原局八字中的「病」和「藥」
- 分析日主在月令的得令狀況與四柱整體氣勢。分析原局八字時，首要條件是先論日主屬陰屬陽，然後才論五行生尅制化。先看命主是陽日元還是陰日元，陽日元喜尅不喜泄，要有根，陰日元喜泄不喜尅，不怕弱
- 必定依據此次序批原局裡是否有調候，第二步是跟據造化元鑰裡面，命主日元在不同月令需要什麼五行來做用神，第三步是看天干是否有合化，可跟據蔡進源師傅對天干五合的理論，甲己合化土，乙庚合化金，丙辛合化水，丁壬合化木，戊癸合化火，以「逢合必化，只分真假」來判斷化神是否用神，忌神或是調候用神，可知對命局有沒有幫助。第四步如果有殺，則需要有殺先論殺，日主和殺相比，殺弱就以財滋殺，日主比殺弱，就必要用傷官或食神制殺，或用印化殺，最後是明確列出並解釋八字原局的「用神」、「病」和「藥神」。

### 二、 格局與十神性格分析
- 必須依據之前的八字分析，說明原命局的主要格局、破局，或者是無格局 (參考滴天髓中所提到的格局）。
- 分析天干主星與地支藏干對命主性格、做事風格的影響。（可參考滴天髓徵義中的性情篇和子平一得對性格和驛馬中的解釋對命主的影響）

### 三、 五行喜忌與生活建議
- 針對五行過旺或缺乏的項目，提供適合的行業方向、補運建議與心態調整。

### 四、 分析命主的出身，事業，感情和健康
- 分析命主的出身，家境和學業成績。（參考滴天髓徵義對格局的評論，子平一得中蔡進源師傅的評註，留意驛馬星或八字四柱有沒有天尅地沖，如有，要留意命主有沒有出國讀書的機會，分析原局八字和大運對命主出身，家境和學業成績的影響。）
- 分析命主的事業和工作情況。詳細解釋那一個大運對命主最為有利。（參考滴天髓徵義對格局的評論，子平一得中蔡進源師傅的評註，留意有沒有書中蔡進源師傅提到的驛馬，如有驛馬，要留意命主會否有到國外工作之類的機會，神峰通會的病藥說和繼善編，分析原局八字和大運對用神、病和藥的影響。）
- 分析命主的感情的狀況，詳細解釋那一個時候最易有桃花和真命天子出現。首先參考命主輸入的性別是男還是女，然後參考滴天髓徵義女命篇、留意夫宮，妻宮，有格局者，如命主是男命，生用神為妻，如果命主是女命，用神為夫，觀察有沒有在大運或流年出現，或地支合，會局或沖夫妻宮，命主的桃花有沒有在大運流年出現，子平一得中蔡進源師傅的評註，四驛馬星和四桃花星對命主有沒有影響。）

### 五、 選前 4~5 個主要大運，詳細評估大運干支對原局喜用神的影響。
- 參考提到所有精通的八字書藉，分析每個大運對命主的影響，利用十神推論產生的象，詳細解釋有機會發生什麼事。

### 六、 流年運勢評語
- 利用日主所輸入的生日期，得出未來的十年，針對該十年流年干支，結合八字命盤，詳細評估對命主每年運勢的影響，包括吉凶、變化與可能的發展方向。

語氣請保持客觀、理性且富有建設性，避免過度武斷或誇大災禍。`,
          },
          {
            role: 'user',
            content: `請幫我分析以下八字命盤數據：\n\n${formattedText}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `DeepSeek API 呼叫失敗: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const resultText = data.choices[0]?.message?.content || '未取得分析結果';

    return NextResponse.json({ result: resultText });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '伺服器內部錯誤' },
      { status: 500 }
    );
  }
}