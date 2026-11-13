export interface ReportScores {
  overall?: number;
  score?: number;
  verdict?: string;
  summary?: string;
  scores?: Record<string, number>;
  luck?: { ganZhi: string; score: number; note?: string }[];
  months?: { month: string; score: number; note?: string }[];
  useGod?: string;
  favorable?: string[];
  unfavorable?: string[];
}

const JSON_BLOCK = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/g;

const WRAPPING_FENCE = /^\s*```(?:markdown|md)?\s*\n([\s\S]*?)\n```\s*$/;

export function splitReport(input: string): { markdown: string; data: ReportScores | null } {
  const raw = input.replace(WRAPPING_FENCE, '$1');
  const blocks = [...raw.matchAll(JSON_BLOCK)];
  for (let i = blocks.length - 1; i >= 0; i--) {
    try {
      const data = JSON.parse(blocks[i][1]) as ReportScores;
      if (data && typeof data === 'object' && (data.scores || data.months || data.luck || data.score !== undefined)) {
        const markdown = (raw.slice(0, blocks[i].index) + raw.slice(blocks[i].index! + blocks[i][0].length)).trim();
        return { markdown, data };
      }
    } catch {
      // 非評分 JSON，略過
    }
  }
  return { markdown: raw.trim(), data: null };
}
