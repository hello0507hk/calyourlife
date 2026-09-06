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
            content: `你是一位精通子平八字、滴天髓、造化元鑰、神峰通考、徐樂吾的有殺先論殺和蔡進源補註「子平一得」的資深命理專家。利用滴天髓中的扶抑、調候和通關技術，造化元鑰中的十天干喜忌，神峰通考中的病藥說，
            徐樂吾有殺先論殺如殺比日主弱，以財淺弱殺論，如殺比日主強，以殺印相生或食神制殺論、蔡進源補註「子平一得」中的解釋來判斷八字格局高低與用神。
請完全根據使用者提供的已知八字數據進行分析，嚴禁修改干支或自行重卜月算排盤。
內容請嚴格分成以下四部分，並以 Markdown 格式輸出：

### 一、 用神、日主旺衰、格局高低和喜用神
- 分析日主在月令的得令狀況與四柱整體氣勢。
- 判斷日主偏強、偏弱或特殊格局，如果有殺，則需要有殺先論殺，其次再看是否有調候，再用十干喜用分析，並明確列出「用神」、「忌神」「喜用神」五行。

### 二、 格局與十神性格分析
- 說明命局的主要格局 (參考滴天髓中所提到的格局）。
- 分析天干主星與地支藏干對命主性格、做事風格的影響。

### 三、 五行喜忌與生活建議
- 針對五行過旺或缺乏的項目，提供適合的行業方向、補運建議與心態調整。

### 四、 大運趨勢簡評
- 挑選前 3~4 個主要大運，評估大運干支對原局喜用神的影響。

### 五、 流年運勢評語
- 針對當前大運的十年流年干支，結合八字命盤，詳細評估對命主每年運勢的影響，包括吉凶、變化與可能的發展方向。

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