import { NextResponse } from 'next/server';

// 延長 Vercel 超時限制至 60 秒
export const maxDuration = 60;

function buildBaziText(baziData: any) {
  const { eightChar, dayGan, dayGanWuxing, wuxingCounts, dayyun, solarDate, lunarDate } = baziData;

  // 1. 自動彙整四柱天干與藏干的所有十神
  const allTenGods: string[] = [
    eightChar.year.ganShishen,
    ...eightChar.year.zangGanShishen,
    eightChar.month.ganShishen,
    ...eightChar.month.zangGanShishen,
    '日主',
    ...eightChar.day.zangGanShishen,
    eightChar.hour.ganShishen,
    ...eightChar.hour.zangGanShishen,
  ].filter(Boolean);

  // 2. 統計各十神出現次數
  const godCounts: Record<string, number> = {};
  allTenGods.forEach((god) => {
    if (god !== '日主') {
      godCounts[god] = (godCounts[god] || 0) + 1;
    }
  });

  const godSummary = Object.entries(godCounts)
    .map(([god, count]) => `${god}:${count}個`)
    .join('、');

  return `
【陽曆日期】：${solarDate}
【農曆日期】：${lunarDate}
【日主（日干）】：${dayGan}（五行屬${dayGanWuxing}）

【四柱八字與十神藏干】：
- 年柱：${eightChar.year.gan}${eightChar.year.zhi}（天干十神：${eightChar.year.ganShishen}，藏干：${eightChar.year.zangGan.join('/')}）
- 月柱：${eightChar.month.gan}${eightChar.month.zhi}（天干十神：${eightChar.month.ganShishen}，藏干：${eightChar.month.zangGan.join('/')}）
- 日柱：${eightChar.day.gan}${eightChar.day.zhi}（日主，藏干：${eightChar.day.zangGan.join('/')}）
- 時柱：${eightChar.hour.gan}${eightChar.hour.zhi}（天干十神：${eightChar.hour.ganShishen}，藏干：${eightChar.hour.zangGan.join('/')}）

【八字五行數量統計】：
- 木：${wuxingCounts.木} 個
- 火：${wuxingCounts.火} 個
- 土：${wuxingCounts.土} 個
- 金：${wuxingCounts.金} 個
- 水：${wuxingCounts.水} 個

【大運走勢】：
${dayyun.map((d: any) => `- ${d.age}歲起大運：${d.ganZhi}`).join('\n')}
  `.trim();
}

export async function POST(req: Request) {
  try {
    const { baziData } = await req.json();

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: '未設定 DEEPSEEK_API_KEY 環境變數，請至 Vercel 控制台新增。' },
        { status: 500 }
      );
    }

    // 格式化使用者八字數據
    const formattedText = buildBaziText(baziData);

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        temperature: 0.3, // 低隨機度，保證邏輯嚴謹
        messages: [
          {
            role: 'system',
            content: `你是一位跟隨徐樂吾學習八字多年、深得徐樂吾真傳，精通子平八字、「滴天髓徵義」徐樂吾編註、「造化元鑰」徐樂吾評註、神峰通考、徐樂吾的有殺先論殺和「子平一得」蔡進源補註的資深命理專家。利用滴天髓中的扶抑、調候、通關定格局與用捉用神的技術，造化元鑰中的十天干在不同月令的喜忌，神峰通考中的病藥說和繼善編裡各種對命格的口訣，
            徐樂吾有殺先論殺如殺比日主弱，以財滋弱殺論，如殺比日主強，以殺印相生或食神制殺論、蔡進源補註「子平一得」中的解釋來判斷八字格局高低，嚴禁使用朱鵲橋一派的任何理論來批算八字。
請完全根據使用者提供的已知八字數據進行分析，嚴禁修改干支或自行重卜月算排盤。
內容請嚴格分成以下六部分，並以 Markdown 格式輸出：

### 一、 日主旺衰、論調候、天干合化、定格局、評論格局高低，捉用神，詳細指出原局八字中的「病」和「藥」
- 分析日主在月令的得令狀況與四柱整體氣勢。分析原局八字時，首要條件是先論日主屬陰屬陽，然後才論五行生尅制化。先看命主是陽日元還是陰日元，陽日元喜尅不喜泄，要有根，陰日元喜泄不喜尅，不怕弱
- 必定依據此次序批原局裡是否有調候，第二步是跟據造化元鑰裡面，命主日元在不同月令需要什麼五行來做用神，第三步是看天干是否有合化，可跟據蔡進源師傅對天干五合的理論，甲己化土，乙庚合金，丙辛化水，丁壬合木，戊癸化火，以「逢合必化，只分真假」來判斷化神是否用神，忌神或是調候用神，可知對命局有沒有幫助。第四步如果有殺，則需要有殺先論殺
，日主和殺相比，殺弱就以財滋殺，日主比殺弱，就必要用傷官或食神制殺，或用印化殺，最後是明確列出並解釋八字原局的「用神」、「病」和「藥神」。

### 二、 格局與十神性格分析
- 必須依據之前的八字分析，說明原命局的主要格局、破局，或者是無格局 (參考滴天髓中所提到的格局）。
- 分析天干主星與地支藏干對命主性格、做事風格的影響。（可參考滴天髓徵義中的性情篇和子平一得對性格和驛馬中的解釋對命主的影響）

### 三、 五行喜忌與生活建議
- 針對五行過旺或缺乏的項目，提供適合的行業方向、補運建議與心態調整。

### 四、 分析命主的出身，事業，感情和健康
- 分析命主的出身，家境和學業成績。（參考滴天髓徵義對格局的評論，子平一得中蔡進源師傅的評註，留意驛馬星或八字四柱有沒有天尅地沖，如有，要留意命主有沒有出國讀書的機會，分析原局八字和大運對命主出身，家境和學業成績的影響。）
- 分析命主的事業和工作情況。詳細解釋那一個大運對命主最為有利。（參考滴天髓徵義對格局的評論，子平一得中蔡進源師傅的評註，留意有沒有書中蔡進源師傅提到的驛馬，如有驛馬，要留意命主會否有到國外工作之類的機會，神峰通會的病藥說和繼善編，分析原局八字和大運對用神、病和藥的影響。）
- 分析命主的感情的狀況，詳細解釋那一個時候最易有桃花和真命天子出現。（參考滴天髓徵義女命篇、留意夫宮，妻宮，有格局者，如命主是男命，生用神為妻，如果命主是女命，用神為夫，觀察有沒有在大運或流年出現，或地支合，會局或沖夫妻宮，命主的桃花有沒有在大運流年出現，子平一得中蔡進源師傅的評註，四驛馬星和四桃花星對命主有沒有影響。）

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