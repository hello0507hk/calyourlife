import { NextResponse } from 'next/server';

// 將 Vercel 執行時間延長至 60 秒，避免 AI 產生回應超時
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { baziData } = await req.json();

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: '尚未配置 DEEPSEEK_API_KEY 環境變數' },
        { status: 500 }
      );
    }

    // 呼叫 DeepSeek API
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content:
              '你是一位精通子平八字命理的大師。請根據使用者提供的八字排盤資料，進行專業且條理分明的命理分析（包含日主旺衰、五行喜忌、十神格局與大運建議）。',
          },
          {
            role: 'user',
            content: `請幫我分析以下八字資料：\n${JSON.stringify(baziData, null, 2)}`,
          },
        ],
        temperature: 0.7,
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