"use client"

import { useState } from "react"
import { Sparkles, WandSparkles, Quote } from "lucide-react"

const SAMPLE_REPORT = [
  "日主甲木生於申月，金旺秉令，官殺當權，屬「身弱殺旺」之局。喜見比劫幫身、印星化殺，忌再逢財官耗洩。整體格局清貴，宜以德服人、以柔克剛。",
  "性情方面，甲木為棟樑之材，正直而有擔當；坐子水正印，聰慧好學、心思細膩，惟略帶理想主義，決策時宜多聽取務實建議。",
  "當前行戊子大運，印星透出得力，利於進修、貴人與名望之事，適合深耕專業、穩紮穩打，不宜貿然轉換跑道或大額投機。",
]

export function AiAnalysis() {
  const [generated, setGenerated] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleGenerate = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setGenerated(true)
    }, 1400)
  }

  return (
    <section
      aria-labelledby="ai-heading"
      className="relative overflow-hidden rounded-2xl border border-gold/30 bg-card p-6 shadow-sm sm:p-8"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-gold/8 blur-3xl"
      />

      <div className="relative flex flex-col gap-1">
        <div className="flex items-center gap-2 text-gold">
          <Sparkles className="size-4" />
          <span className="text-xs font-medium tracking-widest uppercase">AI 命理分析</span>
        </div>
        <h2 id="ai-heading" className="font-serif text-xl font-medium text-foreground">
          AI 命盤總結報告
        </h2>
        <p className="text-sm text-muted-foreground">
          結合四柱、藏干、十神與大運走勢，生成個人化的深度解讀。
        </p>
      </div>

      <div className="relative mt-6">
        {generated ? (
          <div className="flex flex-col gap-4">
            <Quote className="size-5 text-gold/60" aria-hidden="true" />
            {SAMPLE_REPORT.map((para, i) => (
              <p key={i} className="text-[15px] leading-relaxed text-foreground/90">
                {para}
              </p>
            ))}
            <p className="mt-2 text-xs text-muted-foreground">
              以上內容由 AI 依命盤生成，僅供參考，命運仍掌握於自身抉擇。
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-secondary/40 px-6 py-10 text-center">
            <span className="inline-flex size-12 items-center justify-center rounded-full bg-gold/12 text-gold">
              <WandSparkles className="size-5" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-foreground">尚未生成分析報告</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                點擊下方按鈕，AI 將為此命盤撰寫格局、性情、事業與當前運勢的綜合解讀。
              </p>
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="relative mt-6 inline-flex items-center justify-center gap-2 rounded-lg border border-gold/40 bg-gold/10 px-5 py-3 text-sm font-medium text-foreground transition-all hover:bg-gold/16 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <WandSparkles className="size-4 text-gold" />
        {loading ? "AI 解盤中…" : generated ? "重新生成 AI 深度解盤" : "生成 AI 深度解盤"}
      </button>
    </section>
  )
}
