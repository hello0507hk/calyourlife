'use client';

import React from 'react';
import { TEN_GOD_GROUPS, WUXING_ORDER, type WuxingName } from '@/lib/baziStats';

export const WUXING_COLOR: Record<WuxingName, string> = {
  木: '#34d399',
  火: '#f87171',
  土: '#fbbf24',
  金: '#cbd5e1',
  水: '#60a5fa',
};

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
};

export function scoreColor(score: number) {
  if (score >= 75) return '#34d399';
  if (score >= 60) return '#fbbf24';
  if (score >= 45) return '#fb923c';
  return '#f87171';
}

export function scoreLabel(score: number) {
  if (score >= 85) return '大吉';
  if (score >= 70) return '吉';
  if (score >= 55) return '平';
  if (score >= 40) return '小凶';
  return '凶';
}

/* ------------------------------------------------------------------ */

export function WuxingDonut({ values, dayElement }: { values: Record<WuxingName, number>; dayElement?: WuxingName }) {
  const total = WUXING_ORDER.reduce((s, el) => s + values[el], 0) || 1;
  const R = 52;
  const C = 2 * Math.PI * R;
  const lengths = WUXING_ORDER.map((el) => (values[el] / total) * C);
  const offsets = lengths.map((_, i) => lengths.slice(0, i).reduce((s, l) => s + l, 0));

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 140 140" className="size-32 shrink-0 sm:size-36">
        <circle cx="70" cy="70" r={R} fill="none" stroke="#1e293b" strokeWidth="16" />
        {WUXING_ORDER.map((el, i) => (
          <circle
            key={el}
            cx="70"
            cy="70"
            r={R}
            fill="none"
            stroke={WUXING_COLOR[el]}
            strokeWidth={el === dayElement ? 20 : 16}
            strokeDasharray={`${Math.max(lengths[i] - 1.5, 0)} ${C}`}
            strokeDashoffset={-offsets[i]}
            transform="rotate(-90 70 70)"
          />
        ))}
        {dayElement && (
          <>
            <text x="70" y="66" textAnchor="middle" className="fill-slate-400 text-[10px]">日主</text>
            <text x="70" y="86" textAnchor="middle" className="font-serif text-[22px] font-bold" fill={WUXING_COLOR[dayElement]}>
              {dayElement}
            </text>
          </>
        )}
      </svg>
      <ul className="flex flex-1 flex-col gap-1.5">
        {WUXING_ORDER.map((el) => {
          const pct = Math.round((values[el] / total) * 100);
          return (
            <li key={el} className="flex items-center gap-2 text-xs">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: WUXING_COLOR[el] }} />
              <span className="w-4 font-serif text-sm text-slate-200">{el}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: WUXING_COLOR[el] }} />
              </div>
              <span className="w-9 text-right tabular-nums text-slate-400">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function TenGodBars({ counts }: { counts: Record<string, number> }) {
  const max = Math.max(1, ...Object.values(counts));
  return (
    <div className="flex flex-col gap-2.5">
      {TEN_GOD_GROUPS.map((g) => (
        <div key={g.name} className="grid grid-cols-[2.5rem_1fr] items-center gap-2">
          <span className="text-xs font-medium text-amber-200/90">{g.name}</span>
          <div className="flex flex-col gap-1">
            {g.gods.map((god) => {
              const v = counts[god] || 0;
              return (
                <div key={god} className="flex items-center gap-2 text-[11px]">
                  <span className="w-7 shrink-0 text-slate-400">{god}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800/80">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-300"
                      style={{ width: `${(v / max) * 100}%`, opacity: v ? 1 : 0 }}
                    />
                  </div>
                  <span className="w-6 text-right tabular-nums text-slate-500">{v || ''}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function BalanceBar({ ratio, dayElement }: { ratio: number; dayElement: WuxingName }) {
  const pct = Math.round(ratio * 100);
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-[11px]">
        <span className="text-emerald-300">同黨（比劫＋印）{pct}%</span>
        <span className="text-slate-400">異黨（食傷財官）{100 - pct}%</span>
      </div>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-700">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: WUXING_COLOR[dayElement] }} />
        <div className="absolute inset-y-0 left-1/2 w-px bg-slate-950/80" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function RadarChart({ items }: { items: { label: string; value: number }[] }) {
  const n = items.length;
  if (n < 3) return null;
  const cx = 110;
  const cy = 105;
  const R = 72;
  const step = 360 / n;
  const pts = items.map((it, i) => polar(cx, cy, (Math.max(0, Math.min(100, it.value)) / 100) * R, i * step));

  return (
    <svg viewBox="0 0 220 210" className="mx-auto w-full max-w-[280px]">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon
          key={f}
          points={items.map((_, i) => polar(cx, cy, R * f, i * step).join(',')).join(' ')}
          fill="none"
          stroke="#334155"
          strokeWidth={f === 1 ? 1 : 0.6}
        />
      ))}
      {items.map((_, i) => {
        const [x, y] = polar(cx, cy, R, i * step);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#334155" strokeWidth="0.6" />;
      })}
      <polygon points={pts.map((p) => p.join(',')).join(' ')} fill="rgba(251,191,36,0.22)" stroke="#fbbf24" strokeWidth="1.6" strokeLinejoin="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.6" fill={scoreColor(items[i].value)} />
      ))}
      {items.map((it, i) => {
        const [x, y] = polar(cx, cy, R + 18, i * step);
        return (
          <g key={it.label}>
            <text x={x} y={y - 2} textAnchor="middle" className="fill-slate-200 text-[11px]">{it.label}</text>
            <text x={x} y={y + 11} textAnchor="middle" className="text-[10px] font-bold tabular-nums" fill={scoreColor(it.value)}>
              {Math.round(it.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ */

export function TrendChart({
  points,
  highlightIndex,
}: {
  points: { label: string; sub?: string; value: number }[];
  highlightIndex?: number;
}) {
  if (points.length < 2) return null;
  const W = Math.max(320, points.length * 52);
  const H = 170;
  const padX = 24;
  const top = 18;
  const bottom = 128;
  const x = (i: number) => padX + (i * (W - padX * 2)) / (points.length - 1);
  const y = (v: number) => bottom - (Math.max(0, Math.min(100, v)) / 100) * (bottom - top);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join(' ');
  const area = `${line} L${x(points.length - 1)},${bottom} L${x(0)},${bottom} Z`;

  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
      <svg viewBox={`0 0 ${W} ${H}`} style={{ minWidth: W }} className="w-full">
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fbbf24" stopOpacity="0.35" />
            <stop offset="1" stopColor="#fbbf24" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[25, 50, 75].map((v) => (
          <g key={v}>
            <line x1={padX - 8} x2={W - padX + 8} y1={y(v)} y2={y(v)} stroke="#1e293b" strokeDasharray="3 4" />
            <text x={4} y={y(v) + 3} className="fill-slate-600 text-[8px]">{v}</text>
          </g>
        ))}
        {highlightIndex !== undefined && highlightIndex >= 0 && (
          <rect x={x(highlightIndex) - 22} y={top - 12} width={44} height={bottom - top + 50} rx={8} fill="rgba(251,191,36,0.08)" stroke="rgba(251,191,36,0.4)" />
        )}
        <path d={area} fill="url(#trend-fill)" />
        <path d={line} fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.value)} r="4" fill="#020617" stroke={scoreColor(p.value)} strokeWidth="2" />
            <text x={x(i)} y={y(p.value) - 9} textAnchor="middle" className="text-[10px] font-bold tabular-nums" fill={scoreColor(p.value)}>
              {Math.round(p.value)}
            </text>
            <text x={x(i)} y={bottom + 18} textAnchor="middle" className="fill-slate-200 font-serif text-[12px]">{p.label}</text>
            {p.sub && (
              <text x={x(i)} y={bottom + 32} textAnchor="middle" className="fill-slate-500 text-[9px]">{p.sub}</text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function MonthBars({ months }: { months: { month: string; score: number; note?: string }[] }) {
  return (
    <div className="grid grid-cols-6 gap-x-1.5 gap-y-3 sm:grid-cols-12">
      {months.map((m) => (
        <div key={m.month} className="flex flex-col items-center gap-1" title={m.note}>
          <span className="text-[10px] font-bold tabular-nums" style={{ color: scoreColor(m.score) }}>{Math.round(m.score)}</span>
          <div className="flex h-20 w-full max-w-7 items-end overflow-hidden rounded-md bg-slate-800/70">
            <div className="w-full rounded-md" style={{ height: `${Math.max(4, m.score)}%`, background: scoreColor(m.score) }} />
          </div>
          <span className="text-[10px] text-slate-300">{m.month}</span>
          {m.note && <span className="line-clamp-2 text-center text-[9px] leading-tight text-slate-500">{m.note}</span>}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function ScoreGauge({ score, label, caption }: { score: number; label?: string; caption?: string }) {
  const s = Math.max(0, Math.min(100, score));
  const R = 54;
  const half = Math.PI * R;
  const color = scoreColor(s);
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 140 84" className="w-40">
        <path d="M16 74 A54 54 0 0 1 124 74" fill="none" stroke="#1e293b" strokeWidth="12" strokeLinecap="round" />
        <path
          d="M16 74 A54 54 0 0 1 124 74"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${(s / 100) * half} ${half}`}
        />
        <text x="70" y="62" textAnchor="middle" className="text-[26px] font-bold tabular-nums" fill={color}>{Math.round(s)}</text>
        <text x="70" y="78" textAnchor="middle" className="fill-slate-400 text-[10px]">{label ?? scoreLabel(s)}</text>
      </svg>
      {caption && <span className="mt-1 text-xs text-slate-400">{caption}</span>}
    </div>
  );
}
