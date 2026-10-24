'use client';

import React from 'react';
import type { QizhengChart } from '@/lib/qizheng';

const STATE_STYLE: Record<string, string> = {
  逆: 'text-red-400',
  留: 'text-orange-300',
  伏: 'text-slate-400',
  蝕: 'text-fuchsia-300',
  遲: 'text-sky-300',
  速: 'text-emerald-300',
};

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-slate-800 bg-slate-950/70 px-1.5 py-0.5 text-[11px]">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-amber-300">{value}</span>
    </span>
  );
}

export function QizhengSummary({ data }: { data: QizhengChart }) {
  const shenHouse = data.houses.find((h) => h.isShen);
  return (
    <div className="grid gap-2 text-xs sm:grid-cols-2">
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
        <div className="mb-1.5 text-slate-400">八字 · 納音</div>
        <div className="font-serif text-base text-slate-100">
          {data.pillars.year} {data.pillars.month} {data.pillars.day} {data.pillars.hour}
          <span className="ml-2 text-xs text-amber-300">{data.nayin}</span>
        </div>
        <div className="mt-1.5 text-[11px] text-slate-400">
          真太陽時 {data.trueSolarTime} · 日出 {data.sunrise} · 日落 {data.sunset} · {data.isDayBirth ? '晝生' : '夜生'}
        </div>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
        <div className="mb-1.5 text-slate-400">命度 · 身度</div>
        <div className="flex flex-wrap gap-1.5">
          <Chip label="命宮" value={`${data.mingGong}宮`} />
          <Chip label="命度" value={`${data.ming.mansion} ${data.ming.mansionDegree}`} />
          <Chip label="命主" value={data.ming.palaceRuler} />
          <Chip label="度主" value={data.ming.degreeRuler} />
          <Chip label="身宮" value={`${data.shenGong}宮${shenHouse ? `（${shenHouse.name}）` : ''}`} />
          <Chip label="身度" value={`${data.shen.mansion} ${data.shen.mansionDegree}`} />
          <Chip label="身主" value={data.shen.palaceRuler} />
        </div>
      </div>
    </div>
  );
}

export function QizhengStarTable({ data }: { data: QizhengChart }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full min-w-[560px] text-left text-xs">
        <thead className="bg-slate-950 text-slate-400">
          <tr>
            <th className="px-2.5 py-2 font-medium">星曜</th>
            <th className="px-2.5 py-2 font-medium">宮度</th>
            <th className="px-2.5 py-2 font-medium">宿度</th>
            <th className="px-2.5 py-2 font-medium">行度</th>
            <th className="px-2.5 py-2 font-medium">廟旺</th>
            <th className="px-2.5 py-2 font-medium">化曜</th>
            <th className="px-2.5 py-2 font-medium">落宮</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/70 bg-slate-950/40">
          {data.stars.map((s) => (
            <tr key={s.key}>
              <td className="px-2.5 py-1.5">
                <span className={`font-serif text-sm font-bold ${s.type === '政' ? 'text-emerald-300' : 'text-amber-300'}`}>{s.key}</span>
                <span className="ml-1 text-slate-500">{s.name}</span>
              </td>
              <td className="px-2.5 py-1.5 text-slate-200">
                {s.branch} {s.degreeInSign}
              </td>
              <td className="px-2.5 py-1.5 text-slate-200">
                {s.mansion} {s.mansionDegree}
              </td>
              <td className={`px-2.5 py-1.5 ${STATE_STYLE[s.state] ?? 'text-slate-300'}`}>{s.state || '—'}</td>
              <td className="px-2.5 py-1.5 text-slate-300">{s.dignity.join(' ') || '—'}</td>
              <td className="px-2.5 py-1.5 text-amber-200">{s.huaYao.join(' ') || '—'}</td>
              <td className="px-2.5 py-1.5 text-slate-300">{s.house}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function QizhengHouseGrid({ data }: { data: QizhengChart }) {
  return (
    <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
      {data.houses.map((h) => (
        <div
          key={h.name}
          className={`flex flex-col gap-1.5 rounded-xl border p-2.5 ${
            h.index === 0 ? 'border-red-500/50 bg-red-950/20' : h.isShen ? 'border-sky-500/50 bg-sky-950/20' : 'border-slate-800 bg-slate-950/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`font-serif text-sm font-bold ${h.index === 0 ? 'text-red-300' : 'text-slate-100'}`}>
              {h.name}
              {h.isShen && <span className="ml-1 text-[10px] text-sky-300">身</span>}
            </span>
            <span className="text-[10px] text-slate-400">
              {h.branch}宮 · {h.zodiacSign} · 主{h.ruler}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {h.stars.length ? (
              h.stars.map((s) => (
                <span key={s} className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-serif text-[11px] text-emerald-300">
                  {s}
                </span>
              ))
            ) : (
              <span className="text-[10px] text-slate-600">空宮</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400">
            大限 {h.limitStartAge.toFixed(1)}–{h.limitEndAge.toFixed(1)} 歲（{Math.floor(data.birth.year + (data.birth.month - 1) / 12 + h.limitStartAge)} 年起）
          </div>
          {h.shensha.length > 0 && <div className="text-[11px] leading-relaxed text-emerald-200/80">{h.shensha.join(' ')}</div>}
          {h.nowShensha.length > 0 && <div className="text-[11px] leading-relaxed text-violet-300/80">流年：{h.nowShensha.join(' ')}</div>}
        </div>
      ))}
    </div>
  );
}

export function QizhengGods({ data }: { data: QizhengChart }) {
  return (
    <div className="grid gap-2 text-xs sm:grid-cols-2">
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
        <div className="mb-1.5 text-slate-400">十干化曜（{data.pillars.year[0]}年）</div>
        <div className="flex flex-wrap gap-1.5">
          {data.huaYao.map((h) => (
            <Chip key={h.name} label={h.name} value={h.star} />
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
        <div className="mb-1.5 text-slate-400">年神（{data.pillars.year}年）</div>
        <div className="flex flex-wrap gap-1.5">
          {data.yearGods.map((g) => (
            <Chip key={g.name} label={g.name} value={g.star} />
          ))}
        </div>
      </div>
    </div>
  );
}
