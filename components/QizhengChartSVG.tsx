'use client';

import React, { useState } from 'react';
import { QizhengChart, StarPosition } from '@/lib/qizheng';
import { Eye, Grid, GitCommit, SlidersHorizontal } from 'lucide-react';

interface TooltipInfo {
  x: number;
  y: number;
  title: string;
  badge?: string;
  badgeColor?: string;
  lines: { label: string; value: string }[];
}

interface ProcessedStar extends StarPosition {
  x: number;
  y: number;
  r: number;
}

interface Aspect {
  star1: ProcessedStar;
  star2: ProcessedStar;
  type: 'opposition' | 'trine' | 'square' | 'sextile';
  name: string;
  symbol: string;
  color: string;
  dashArray?: string;
  diff: number;
  nature: '大吉' | '凶煞' | '衝壓' | '小吉';
}

export default function QizhengChartSVG({ data }: { data: QizhengChart }) {
  const [showAspects, setShowAspects] = useState<boolean>(true);
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const [hoveredAspect, setHoveredAspect] = useState<Aspect | null>(null);

  const size = 520;
  const center = size / 2;
  const outerR = 230;
  const zodiacR = 185;
  const starBaseR = 135;
  const innerR = 75;

  const ZODIAC_SECTORS = [
    { label: '戌 (白羊)', branch: '戌', minDeg: 0, maxDeg: 30 },
    { label: '酉 (金牛)', branch: '酉', minDeg: 30, maxDeg: 60 },
    { label: '申 (雙子)', branch: '申', minDeg: 60, maxDeg: 90 },
    { label: '未 (巨蟹)', branch: '未', minDeg: 90, maxDeg: 120 },
    { label: '午 (獅子)', branch: '午', minDeg: 120, maxDeg: 150 },
    { label: '巳 (處女)', branch: '巳', minDeg: 150, maxDeg: 180 },
    { label: '辰 (天秤)', branch: '辰', minDeg: 180, maxDeg: 210 },
    { label: '卯 (天蠍)', branch: '卯', minDeg: 210, maxDeg: 240 },
    { label: '寅 (射手)', branch: '寅', minDeg: 240, maxDeg: 270 },
    { label: '丑 (摩羯)', branch: '丑', minDeg: 270, maxDeg: 300 },
    { label: '子 (水瓶)', branch: '子', minDeg: 300, maxDeg: 330 },
    { label: '亥 (雙魚)', branch: '亥', minDeg: 330, maxDeg: 360 },
  ];

  const STAR_COLORS: Record<string, { fill: string; stroke: string; halo: string }> = {
    太陽: { fill: '#fbbf24', stroke: '#f59e0b', halo: 'rgba(251, 191, 36, 0.4)' },
    太陰: { fill: '#e0f2fe', stroke: '#38bdf8', halo: 'rgba(56, 189, 248, 0.4)' },
    木星: { fill: '#34d399', stroke: '#10b981', halo: 'rgba(52, 211, 153, 0.4)' },
    火星: { fill: '#f87171', stroke: '#ef4444', halo: 'rgba(248, 113, 113, 0.4)' },
    土星: { fill: '#fbbf24', stroke: '#d97706', halo: 'rgba(217, 119, 6, 0.4)' },
    金星: { fill: '#f1f5f9', stroke: '#cbd5e1', halo: 'rgba(241, 245, 249, 0.4)' },
    水星: { fill: '#60a5fa', stroke: '#3b82f6', halo: 'rgba(96, 165, 250, 0.4)' },
    羅睺: { fill: '#c084fc', stroke: '#a855f7', halo: 'rgba(192, 132, 252, 0.4)' },
    計都: { fill: '#f472b6', stroke: '#ec4899', halo: 'rgba(244, 114, 182, 0.4)' },
    月孛: { fill: '#38bdf8', stroke: '#0284c7', halo: 'rgba(56, 189, 248, 0.4)' },
    紫氣: { fill: '#a7f3d0', stroke: '#059669', halo: 'rgba(167, 243, 208, 0.4)' },
  };

  const getCoords = (deg: number, radius: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad),
    };
  };

  // 計算重疊防撞點位
  const processedStars: ProcessedStar[] = data.stars.map((star, idx, arr) => {
    let currentR = starBaseR;
    for (let i = 0; i < idx; i++) {
      const diff = Math.abs(star.longitude - arr[i].longitude);
      if (diff < 8 || diff > 352) {
        currentR -= 22;
      }
    }
    const coords = getCoords(star.longitude, currentR);
    return { ...star, x: coords.x, y: coords.y, r: currentR };
  });

  // 演算法：計算七政星曜間的吉凶相位
  const aspects: Aspect[] = [];
  const orb = 6.0; // 相位容許度 ±6度

  for (let i = 0; i < processedStars.length; i++) {
    for (let j = i + 1; j < processedStars.length; j++) {
      const s1 = processedStars[i];
      const s2 = processedStars[j];

      let angleDiff = Math.abs(s1.longitude - s2.longitude);
      if (angleDiff > 180) angleDiff = 360 - angleDiff;

      // 1. 對沖 (180°)
      if (Math.abs(angleDiff - 180) <= orb) {
        aspects.push({
          star1: s1, star2: s2,
          type: 'opposition', name: '對沖 (180°)', symbol: '☍',
          color: '#ef4444', dashArray: '4, 4', diff: Number(Math.abs(angleDiff - 180).toFixed(1)),
          nature: '凶煞',
        });
      }
      // 2. 三合 (120°)
      else if (Math.abs(angleDiff - 120) <= orb) {
        aspects.push({
          star1: s1, star2: s2,
          type: 'trine', name: '三合 (120°)', symbol: '△',
          color: '#10b981', diff: Number(Math.abs(angleDiff - 120).toFixed(1)),
          nature: '大吉',
        });
      }
      // 3. 四衝/刑 (90°)
      else if (Math.abs(angleDiff - 90) <= orb) {
        aspects.push({
          star1: s1, star2: s2,
          type: 'square', name: '四衝 (90°)', symbol: '□',
          color: '#f97316', dashArray: '3, 3', diff: Number(Math.abs(angleDiff - 90).toFixed(1)),
          nature: '衝壓',
        });
      }
      // 4. 六合 (60°)
      else if (Math.abs(angleDiff - 60) <= orb - 2) {
        aspects.push({
          star1: s1, star2: s2,
          type: 'sextile', name: '六合 (60°)', symbol: '⚹',
          color: '#3b82f6', diff: Number(Math.abs(angleDiff - 60).toFixed(1)),
          nature: '小吉',
        });
      }
    }
  }

  const mingBranch = data.mingGong.slice(0, 1);

  const handleMouseMove = (e: React.MouseEvent<SVGElement>, info: Omit<TooltipInfo, 'x' | 'y'>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      ...info,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div className="relative flex flex-col items-center justify-center rounded-2xl border border-amber-500/30 bg-slate-950 p-4 shadow-2xl overflow-hidden">
      {/* 頂部工具列：切換相位開關 */}
      <div className="mb-3 flex w-full items-center justify-between px-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-300 font-medium">
          <GitCommit className="size-4 text-amber-400" />
          <span>星曜相位連線</span>
          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-amber-300">
            {aspects.length} 組交會
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowAspects(!showAspects)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1 font-bold transition-all ${
            showAspects
              ? 'border-amber-500/80 bg-amber-500/20 text-amber-300 shadow-sm'
              : 'border-slate-800 bg-slate-900 text-slate-500 hover:text-slate-300'
          }`}
        >
          <SlidersHorizontal className="size-3.5" />
          {showAspects ? '相位連線：開啟' : '相位連線：關閉'}
        </button>
      </div>

      <div className="relative w-full max-w-[500px] aspect-square flex items-center justify-center">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="w-full h-full select-none"
          onMouseLeave={() => {
            setTooltip(null);
            setHoveredAspect(null);
          }}
        >
          <defs>
            <linearGradient id="ringGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>

            <filter id="starGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 同心圓盤底圖 */}
          <circle cx={center} cy={center} r={outerR + 12} stroke="url(#ringGold)" strokeWidth="1" strokeDasharray="3, 5" opacity="0.4" fill="none" />
          <circle cx={center} cy={center} r={outerR} stroke="url(#ringGold)" strokeWidth="2" fill="none" opacity="0.8" />
          <circle cx={center} cy={center} r={zodiacR} stroke="url(#ringGold)" strokeWidth="1" strokeDasharray="2, 4" fill="none" opacity="0.5" />
          <circle cx={center} cy={center} r={innerR} stroke="url(#ringGold)" strokeWidth="1.5" fill="#020617" opacity="0.9" />

          {/* 十二黃道宮區域 */}
          {ZODIAC_SECTORS.map((sector, i) => {
            const startDeg = i * 30;
            const midDeg = startDeg + 15;
            const linePos = getCoords(startDeg, outerR);
            const labelPos = getCoords(midDeg, (outerR + zodiacR) / 2);
            const isMingGongSector = sector.branch === mingBranch;

            const p1 = getCoords(startDeg, innerR);
            const p2 = getCoords(startDeg, outerR);
            const p3 = getCoords(startDeg + 30, outerR);
            const p4 = getCoords(startDeg + 30, innerR);
            const pathD = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} A ${outerR} ${outerR} 0 0 1 ${p3.x} ${p3.y} L ${p4.x} ${p4.y} A ${innerR} ${innerR} 0 0 0 ${p1.x} ${p1.y} Z`;

            const houseInfo = data.houses.find(h => h.zodiac.startsWith(sector.branch));

            return (
              <g
                key={i}
                className="cursor-pointer group"
                onMouseMove={(e) =>
                  handleMouseMove(e, {
                    title: `${houseInfo?.name || '黃道宮'} (${sector.branch}宮)`,
                    badge: isMingGongSector ? '立命宮' : undefined,
                    badgeColor: '#f59e0b',
                    lines: [
                      { label: '地支宮位', value: `${sector.label}` },
                      { label: '黃道經度', value: `${sector.minDeg}° - ${sector.maxDeg}°` },
                      { label: '駐留星曜', value: houseInfo?.stars.length ? houseInfo.stars.join('、') : '無主星' },
                    ],
                  })
                }
                onMouseLeave={() => setTooltip(null)}
              >
                <path
                  d={pathD}
                  fill={isMingGongSector ? '#f59e0b' : '#334155'}
                  opacity={isMingGongSector ? 0.18 : 0.01}
                  className="transition-opacity duration-200 group-hover:opacity-30"
                />

                <line x1={center} y1={center} x2={linePos.x} y2={linePos.y} stroke="#78350f" strokeWidth="1" opacity="0.3" />

                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={isMingGongSector ? '#fef3c7' : '#94a3b8'}
                  fontSize={isMingGongSector ? '11' : '10'}
                  fontWeight={isMingGongSector ? 'bold' : 'normal'}
                  fontFamily="serif"
                >
                  {sector.branch}
                </text>
              </g>
            );
          })}

          {/* 吉凶相位連線繪製 */}
          {showAspects &&
            aspects.map((asp, idx) => {
              const isHovered = hoveredAspect === asp;
              return (
                <g key={idx}>
                  {/* 可點擊/懸停之隱形加寬線 */}
                  <line
                    x1={asp.star1.x}
                    y1={asp.star1.y}
                    x2={asp.star2.x}
                    y2={asp.star2.y}
                    stroke="transparent"
                    strokeWidth="12"
                    className="cursor-pointer"
                    onMouseMove={(e) => {
                      e.stopPropagation();
                      setHoveredAspect(asp);
                      handleMouseMove(e, {
                        title: `${asp.star1.name} ${asp.symbol} ${asp.star2.name}`,
                        badge: asp.nature,
                        badgeColor: asp.nature.includes('吉') ? '#10b981' : '#ef4444',
                        lines: [
                          { label: '相位類型', value: asp.name },
                          { label: '相位誤差', value: `±${asp.diff}°` },
                          { label: '兩星經度', value: `${asp.star1.longitude}° / ${asp.star2.longitude}°` },
                        ],
                      });
                    }}
                    onMouseLeave={() => {
                      setHoveredAspect(null);
                      setTooltip(null);
                    }}
                  />

                  {/* 實體相位連線 */}
                  <line
                    x1={asp.star1.x}
                    y1={asp.star1.y}
                    x2={asp.star2.x}
                    y2={asp.star2.y}
                    stroke={asp.color}
                    strokeWidth={isHovered ? '2.5' : '1'}
                    strokeDasharray={asp.dashArray}
                    opacity={isHovered ? 1.0 : 0.45}
                    className="transition-all duration-200 pointer-events-none"
                  />
                </g>
              );
            })}

          {/* 七政四餘星曜 */}
          {processedStars.map((star) => {
            const style = STAR_COLORS[star.name] || { fill: '#e2e8f0', stroke: '#94a3b8', halo: 'rgba(226, 232, 240, 0.3)' };
            const lineToCenter = getCoords(star.longitude, innerR);

            return (
              <g
                key={star.name}
                className="cursor-pointer group"
                onMouseMove={(e) => {
                  e.stopPropagation();
                  handleMouseMove(e, {
                    title: `${star.name} (${star.type === '政' ? '七政' : '四餘'})`,
                    badge: star.isRetrograde ? '逆行 ⟲' : '順行',
                    badgeColor: star.isRetrograde ? '#ef4444' : '#10b981',
                    lines: [
                      { label: '黃道經度', value: `${star.longitude}°` },
                      { label: '落宮', value: star.zodiac },
                      { label: '二十八宿', value: `${star.mansion} (${star.mansionDegree}°)` },
                    ],
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              >
                <line
                  x1={lineToCenter.x}
                  y1={lineToCenter.y}
                  x2={star.x}
                  y2={star.y}
                  stroke={style.stroke}
                  strokeWidth="1"
                  strokeDasharray="2, 3"
                  opacity="0.4"
                />

                <circle cx={star.x} cy={star.y} r="11" fill={style.halo} filter="url(#starGlow)" className="transition-all duration-300 group-hover:r-16" />

                <circle
                  cx={star.x}
                  cy={star.y}
                  r="4.5"
                  fill={style.fill}
                  stroke={style.stroke}
                  strokeWidth="1.5"
                  className="transition-transform duration-300 group-hover:scale-150"
                />

                <text
                  x={star.x}
                  y={star.y - 11}
                  textAnchor="middle"
                  fill="#f8fafc"
                  fontSize="10"
                  fontWeight="bold"
                  fontFamily="serif"
                  className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                >
                  {star.name}
                  {star.isRetrograde ? '⟲' : ''}
                </text>
              </g>
            );
          })}

          {/* 圓心命宮與身宮標記 */}
          <g transform={`translate(${center}, ${center})`}>
            <circle cx="0" cy="0" r="32" fill="#020617" stroke="url(#ringGold)" strokeWidth="1" />
            <text x="0" y="-6" textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="bold" fontFamily="serif">
              {data.mingGong.split(' ')[0]}
            </text>
            <text x="0" y="10" textAnchor="middle" fill="#38bdf8" fontSize="9" fontFamily="serif">
              {data.shenGong.split(' ')[0]}
            </text>
          </g>
        </svg>

        {/* Hover Tooltip */}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-50 flex flex-col gap-1.5 rounded-xl border border-amber-500/40 bg-slate-900/95 p-3 text-xs text-slate-100 shadow-2xl backdrop-blur-md transition-all duration-75"
            style={{
              left: `${Math.min(tooltip.x + 12, 320)}px`,
              top: `${Math.min(tooltip.y + 12, 380)}px`,
            }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1.5">
              <span className="font-serif font-bold text-amber-300 text-sm">{tooltip.title}</span>
              {tooltip.badge && (
                <span
                  className="rounded px-1.5 py-0.5 text-[9px] font-bold text-slate-950"
                  style={{ backgroundColor: tooltip.badgeColor || '#f59e0b' }}
                >
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

      {/* 相位色彩圖例 */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 bg-emerald-500" /> 三合 (120° 吉)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 border-t border-dashed border-red-500" /> 對沖 (180° 凶)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 border-t border-dashed border-orange-500" /> 四衝 (90° 壓)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 bg-blue-500" /> 六合 (60° 吉)
        </span>
      </div>
    </div>
  );
}