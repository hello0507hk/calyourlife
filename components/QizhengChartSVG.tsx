'use client';

import React, { useState } from 'react';
import { QizhengChart, StarPosition } from '@/lib/qizheng';
import { Eye, GitCommit, SlidersHorizontal, Sparkles } from 'lucide-react';

interface TooltipInfo {
  x: number;
  y: number;
  title: string;
  badge?: string;
  badgeColor?: string;
  lines: { label: string; value: string }[];
}

export default function QizhengChartSVG({ data }: { data: QizhengChart }) {
  const [showAspects, setShowAspects] = useState<boolean>(true);
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);

  const size = 600;
  const center = size / 2;
  const rMansion = 270; // 28星宿最外環
  const rZodiac = 225;  // 十二黃道宮與星座環
  const rShensha = 180; // 神煞環
  const rHouse = 140;   // 後天十二宮環
  const rStarBase = 100;// 七政四餘星曜分佈半徑
  const rInner = 50;    // 圓心

  const WUXING_COLORS: Record<string, string> = {
    木: '#10b981', 火: '#ef4444', 土: '#f59e0b', 金: '#cbd5e1', 水: '#06b6d4',
  };

  const getCoords = (deg: number, radius: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: center + radius * Math.cos(rad), y: center + radius * Math.sin(rad) };
  };

  const mingBranch = data.mingGong.slice(0, 1);

  const handleMouseMove = (e: React.MouseEvent<SVGElement>, info: Omit<TooltipInfo, 'x' | 'y'>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ ...info, x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div className="relative flex flex-col items-center justify-center rounded-2xl border border-amber-500/30 bg-slate-950 p-4 shadow-2xl overflow-hidden">
      {/* 頂部控制列 */}
      <div className="mb-3 flex w-full items-center justify-between px-2 text-xs">
        <div className="flex items-center gap-2 text-amber-300 font-bold">
          <Sparkles className="size-4 text-amber-400" />
          <span>黃道回歸制 · 今制 28 星宿圓形天象盤</span>
        </div>

        <button
          type="button"
          onClick={() => setShowAspects(!showAspects)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1 font-bold transition-all ${
            showAspects ? 'border-amber-500/80 bg-amber-500/20 text-amber-300' : 'border-slate-800 bg-slate-900 text-slate-500'
          }`}
        >
          <SlidersHorizontal className="size-3.5" />
          {showAspects ? '吉凶相位：顯示' : '吉凶相位：隱藏'}
        </button>
      </div>

      <div className="relative w-full max-w-[580px] aspect-square flex items-center justify-center">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full select-none" onMouseLeave={() => setTooltip(null)}>
          <defs>
            <linearGradient id="ringGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>
          </defs>

          {/* 1. 環形同心圓基底 */}
          <circle cx={center} cy={center} r={rMansion} stroke="url(#ringGold)" strokeWidth="1.5" fill="none" opacity="0.6" />
          <circle cx={center} cy={center} r={rZodiac} stroke="url(#ringGold)" strokeWidth="1" fill="none" opacity="0.4" />
          <circle cx={center} cy={center} r={rShensha} stroke="url(#ringGold)" strokeWidth="1" strokeDasharray="2, 3" fill="none" opacity="0.3" />
          <circle cx={center} cy={center} r={rHouse} stroke="url(#ringGold)" strokeWidth="1.5" fill="none" opacity="0.5" />
          <circle cx={center} cy={center} r={rInner} stroke="url(#ringGold)" strokeWidth="1" fill="#020617" />

          {/* 2. 最外環：今制 28 星宿分度 (Modern Mansions) */}
          {data.mansions.map((m, idx) => {
            const pos = getCoords(m.startDeg + m.span / 2, (rMansion + rZodiac) / 2);
            const linePos = getCoords(m.startDeg, rMansion);
            const innerLinePos = getCoords(m.startDeg, rZodiac);

            return (
              <g key={idx}>
                <line x1={linePos.x} y1={linePos.y} x2={innerLinePos.x} y2={innerLinePos.y} stroke="#78350f" strokeWidth="0.8" opacity="0.4" />
                <text
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={WUXING_COLORS[m.wuxing] || '#cbd5e1'}
                  fontSize="8.5"
                  fontWeight="bold"
                >
                  {m.name.slice(0, 2)}
                </text>
              </g>
            );
          })}

          {/* 3. 中環：十二黃道宮、星座與五行 */}
          {data.houses.map((house, idx) => {
            const startDeg = idx * 30;
            const midDeg = startDeg + 15;
            const p1 = getCoords(startDeg, rHouse);
            const p2 = getCoords(startDeg, rZodiac);
            const labelPos = getCoords(midDeg, (rZodiac + rShensha) / 2);
            const shenshaPos = getCoords(midDeg, (rShensha + rHouse) / 2);
            const isMing = house.branch.startsWith(mingBranch);

            return (
              <g
                key={idx}
                className="cursor-pointer group"
                onMouseMove={(e) =>
                  handleMouseMove(e, {
                    title: `${house.name} (${house.branch})`,
                    badge: isMing ? '立命宮' : undefined,
                    lines: [
                      { label: '黃道星座', value: house.zodiacSign },
                      { label: '宮位五行', value: house.wuxing },
                      { label: '宮內神煞', value: house.shensha.length ? house.shensha.join('、') : '無' },
                      { label: '駐留星曜', value: house.stars.length ? house.stars.join('、') : '無主星' },
                    ],
                  })
                }
              >
                {/* 分割線 */}
                <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#f59e0b" strokeWidth="1" opacity="0.3" />

                {/* 星座與宮位標籤 */}
                <text x={labelPos.x} y={labelPos.y} textAnchor="middle" dominantBaseline="central" fill={isMing ? '#fef3c7' : '#94a3b8'} fontSize="10" fontWeight="bold">
                  {house.branch.slice(0, 1)}·{house.zodiacSign.slice(0, 2)}
                </text>

                {/* 神煞環標籤 */}
                <text x={shenshaPos.x} y={shenshaPos.y} textAnchor="middle" dominantBaseline="central" fill="#f472b6" fontSize="8" opacity="0.85">
                  {house.shensha[0] || ''}
                </text>
              </g>
            );
          })}

          {/* 4. 內環：後天十二宮名稱 */}
          {data.houses.map((house, idx) => {
            const midDeg = idx * 30 + 15;
            const pos = getCoords(midDeg, (rHouse + rInner) / 2);
            const isMing = house.name === '命宮';

            return (
              <text key={idx} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="central" fill={isMing ? '#f59e0b' : '#e2e8f0'} fontSize="9.5" fontWeight={isMing ? 'bold' : 'normal'}>
                {house.name}
              </text>
            );
          })}

          {/* 5. 核心：七政四餘星曜點位與五行色彩 */}
          {data.stars.map((star, idx) => {
            const pos = getCoords(star.longitude, rStarBase - (idx % 2) * 18);
            const color = WUXING_COLORS[star.wuxing] || '#f59e0b';

            return (
              <g
                key={star.name}
                className="cursor-pointer group"
                onMouseMove={(e) => {
                  e.stopPropagation();
                  handleMouseMove(e, {
                    title: `${star.name} (${star.type === '政' ? '七政' : '四餘'})`,
                    badge: `五行屬${star.wuxing}`,
                    badgeColor: color,
                    lines: [
                      { label: '黃道經度', value: `${star.longitude}°` },
                      { label: '落宮', value: star.zodiac },
                      { label: '今制宿度', value: `${star.mansion} (${star.mansionDegree}°)` },
                    ],
                  });
                }}
              >
                <circle cx={pos.x} cy={pos.y} r="4" fill={color} stroke="#020617" strokeWidth="1.5" />
                <text x={pos.x} y={pos.y - 8} textAnchor="middle" fill="#f8fafc" fontSize="9" fontWeight="bold">
                  {star.name}
                </text>
              </g>
            );
          })}

          {/* 圓心：命宮與身宮 */}
          <g transform={`translate(${center}, ${center})`}>
            <text x="0" y="-5" textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="bold">
              {data.mingGong.split(' ')[0]}
            </text>
            <text x="0" y="9" textAnchor="middle" fill="#06b6d4" fontSize="9">
              {data.shenGong.split(' ')[0]}
            </text>
          </g>
        </svg>

        {/* 互動式 Hover Tooltip 浮動提示框 */}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-50 flex flex-col gap-1.5 rounded-xl border border-amber-500/40 bg-slate-900/95 p-3 text-xs text-slate-100 shadow-2xl backdrop-blur-md"
            style={{ left: `${Math.min(tooltip.x + 12, 360)}px`, top: `${Math.min(tooltip.y + 12, 420)}px` }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1.5">
              <span className="font-serif font-bold text-amber-300 text-sm">{tooltip.title}</span>
              {tooltip.badge && (
                <span className="rounded px-1.5 py-0.5 text-[9px] font-bold text-slate-950" style={{ backgroundColor: tooltip.badgeColor || '#f59e0b' }}>
                  {tooltip.badge}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              {tooltip.lines.map((line, idx) => (
                <div key={idx} className="flex justify-between gap-4 text-[11px]">
                  <span className="text-slate-400">{line.label}：</span>
                  <span className="font-medium text-slate-200">{line.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}