'use client';

import React, { useState } from 'react';
import { QizhengChart } from '@/lib/qizheng';
import { GitCommit, SlidersHorizontal, Sparkles } from 'lucide-react';

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

  // SVG 畫布整體尺寸與圓心
  const size = 680;
  const center = size / 2;

  // 果老星宗多重同心圓半徑定點 (由內至外)
  const rInner = 42;       // 圓心 (立命/度數)
  const rZodiac = 100;     // 環1：地支 (子丑寅卯) + 星座代碼 (Aqu, Cap...) + 五行
  const rHouse = 150;      // 環2：後天十二宮 (命宮, 財帛...)
  const rStars = 198;      // 環3：七政四餘星曜駐留環
  const rMansion = 242;    // 環4：二十八宿 (角亢氐房...)
  const rShensha = 288;    // 環5：叢辰神煞細字環
  const rOuterYears = 325; // 環6：大運流年年限環 (2026, 2036...)

  // 十二黃道地支與西方星座縮寫對照
  const ZODIAC_SECTORS = [
    { branch: '子', code: 'Aqu', sign: '水瓶', wuxing: '土', minDeg: 300, maxDeg: 330 },
    { branch: '丑', code: 'Cap', sign: '摩羯', wuxing: '土', minDeg: 270, maxDeg: 300 },
    { branch: '寅', code: 'Sag', sign: '射手', wuxing: '木', minDeg: 240, maxDeg: 270 },
    { branch: '卯', code: 'Sco', sign: '天蠍', wuxing: '火', minDeg: 210, maxDeg: 240 },
    { branch: '辰', code: 'Lib', sign: '天秤', wuxing: '金', minDeg: 180, maxDeg: 210 },
    { branch: '巳', code: 'Vir', sign: '處女', wuxing: '水', minDeg: 150, maxDeg: 180 },
    { branch: '午', code: 'Leo', sign: '獅子', wuxing: '日', minDeg: 120, maxDeg: 150 },
    { branch: '未', code: 'Can', sign: '巨蟹', wuxing: '月', minDeg: 90, maxDeg: 120 },
    { branch: '申', code: 'Gem', sign: '雙子', wuxing: '水', minDeg: 60, maxDeg: 90 },
    { branch: '酉', code: 'Tau', sign: '金牛', wuxing: '金', minDeg: 30, maxDeg: 60 },
    { branch: '戌', code: 'Ari', sign: '白羊', wuxing: '火', minDeg: 0, maxDeg: 30 },
    { branch: '亥', code: 'Pis', sign: '雙魚', wuxing: '木', minDeg: 330, maxDeg: 360 },
  ];

  // 星曜經典色彩
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

  // 靜態神煞庫 (按十二地支環狀排列)
  const SHENSHA_CIRCLES: Record<string, string[]> = {
    子: ['天德', '月德', '歲駕', '華蓋', '將星'],
    丑: ['天乙', '福星', '國印', '飛廉', '寡宿'],
    寅: ['驛馬', '祿勳', '劫煞', '天廚', '孤辰'],
    卯: ['桃花', '羊刃', '飛刃', '咸池', '勾神'],
    辰: ['華蓋', '天羅', '喪門', '吊客', '破碎'],
    巳: ['天德', '文昌', '天喜', '病符', '亡神'],
    午: ['將星', '帝旺', '金輿', '白虎', '大耗'],
    未: ['紅鸞', '天醫', '寡宿', '小耗', '勾絞'],
    申: ['驛馬', '詞館', '地殺', '咸池', '劫殺'],
    酉: ['桃花', '將星', '太歲', '伏屍', '劍鋒'],
    戌: ['地網', '華蓋', '月空', '死符', '小耗'],
    亥: ['天乙', '貴人', '亡神', '貫索', '暴敗'],
  };

  // 極座標轉換
  const getCoords = (deg: number, radius: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad),
    };
  };

  // 星曜重疊避讓計算
  const processedStars = data.stars.map((star, idx, arr) => {
    let currentR = rStars;
    for (let i = 0; i < idx; i++) {
      const diff = Math.abs(star.longitude - arr[i].longitude);
      if (diff < 8 || diff > 352) {
        currentR -= 18;
      }
    }
    const coords = getCoords(star.longitude, currentR);
    return { ...star, x: coords.x, y: coords.y, r: currentR };
  });

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
    <div className="relative flex flex-col items-center justify-center rounded-2xl border border-amber-500/30 bg-slate-950 p-4 shadow-2xl overflow-hidden selection:bg-amber-500/30">
      {/* 頂部工具列 */}
      <div className="mb-3 flex w-full items-center justify-between px-2 text-xs">
        <div className="flex items-center gap-2 text-amber-300 font-bold">
          <Sparkles className="size-4 text-amber-400" />
          <span>果老星宗 · 七政四餘多層渾天星盤</span>
        </div>

        <button
          type="button"
          onClick={() => setShowAspects(!showAspects)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1 font-bold transition-all ${
            showAspects
              ? 'border-amber-500/80 bg-amber-500/20 text-amber-300'
              : 'border-slate-800 bg-slate-900 text-slate-500'
          }`}
        >
          <SlidersHorizontal className="size-3.5" />
          {showAspects ? '相位連線：開啟' : '相位連線：關閉'}
        </button>
      </div>

      <div className="relative w-full max-w-[640px] aspect-square flex items-center justify-center">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="w-full h-full select-none font-serif"
          onMouseLeave={() => setTooltip(null)}
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

          {/* 1. 多重同心圓基底 (Concentric Rings) */}
          <circle cx={center} cy={center} r={rOuterYears} stroke="url(#ringGold)" strokeWidth="1.5" fill="none" opacity="0.7" />
          <circle cx={center} cy={center} r={rShensha} stroke="#3b82f6" strokeWidth="1" strokeDasharray="2, 3" fill="none" opacity="0.4" />
          <circle cx={center} cy={center} r={rMansion} stroke="url(#ringGold)" strokeWidth="1" fill="none" opacity="0.6" />
          <circle cx={center} cy={center} r={rStars} stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="1, 4" fill="none" opacity="0.3" />
          <circle cx={center} cy={center} r={rHouse} stroke="url(#ringGold)" strokeWidth="1.5" fill="none" opacity="0.8" />
          <circle cx={center} cy={center} r={rZodiac} stroke="url(#ringGold)" strokeWidth="1" fill="none" opacity="0.5" />
          <circle cx={center} cy={center} r={rInner} stroke="url(#ringGold)" strokeWidth="1.5" fill="#020617" opacity="0.9" />

          {/* 2. 第一環：地支、西方星座縮寫 (Aqu, Cap...) 與五行 */}
          {ZODIAC_SECTORS.map((sector, idx) => {
            const startDeg = idx * 30;
            const midDeg = startDeg + 15;
            const p1 = getCoords(startDeg, rInner);
            const p2 = getCoords(startDeg, rOuterYears);
            const pos = getCoords(midDeg, (rInner + rZodiac) / 2);
            const isMing = sector.branch === mingBranch;

            return (
              <g key={idx}>
                {/* 輻射貫穿分割線 */}
                <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#78350f" strokeWidth="1" opacity="0.3" />

                {/* 地支 + 星座代碼 */}
                <text
                  x={pos.x}
                  y={pos.y - 6}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={isMing ? '#fef3c7' : '#f59e0b'}
                  fontSize="11"
                  fontWeight="bold"
                >
                  {sector.branch}
                </text>
                <text
                  x={pos.x}
                  y={pos.y + 7}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#38bdf8"
                  fontSize="8.5"
                >
                  {sector.code} ({sector.sign})
                </text>
              </g>
            );
          })}

          {/* 3. 第二環：後天十二宮名稱 (命宮, 財帛, 兄弟...) */}
          {data.houses.map((house, idx) => {
            const midDeg = idx * 30 + 15;
            const pos = getCoords(midDeg, (rZodiac + rHouse) / 2);
            const isMing = house.branch.startsWith(mingBranch);

            return (
              <g key={idx}>
                {isMing && (
                  <circle cx={pos.x} cy={pos.y} r="16" fill="#f59e0b" opacity="0.25" />
                )}
                <text
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={isMing ? '#fef3c7' : '#e2e8f0'}
                  fontSize="11"
                  fontWeight={isMing ? 'bold' : 'medium'}
                >
                  {house.name}
                </text>
              </g>
            );
          })}

          {/* 4. 第三環：今制二十八宿度數與宿名 (角, 亢, 氐, 房...) */}
          {data.mansions.map((m, idx) => {
            const pos = getCoords(m.startDeg + m.span / 2, (rHouse + rMansion) / 2);
            const line1 = getCoords(m.startDeg, rHouse);
            const line2 = getCoords(m.startDeg, rMansion);

            return (
              <g key={idx}>
                <line x1={line1.x} y1={line1.y} x2={line2.x} y2={line2.y} stroke="#f59e0b" strokeWidth="0.5" opacity="0.4" />
                <text
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#34d399"
                  fontSize="9"
                  fontWeight="bold"
                >
                  {m.name.slice(0, 1)}
                </text>
              </g>
            );
          })}

          {/* 5. 第四環：密集叢辰神煞細字環 */}
          {ZODIAC_SECTORS.map((sector, idx) => {
            const shenshas = SHENSHA_CIRCLES[sector.branch] || [];
            return shenshas.map((sName, sIdx) => {
              const deg = idx * 30 + (sIdx + 1) * (30 / (shenshas.length + 1));
              const pos = getCoords(deg, (rMansion + rShensha) / 2);
              return (
                <text
                  key={`${sector.branch}-${sIdx}`}
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#f472b6"
                  fontSize="7.5"
                  opacity="0.85"
                >
                  {sName}
                </text>
              );
            });
          })}

          {/* 6. 第五最外環：大運流年歲數限度環 (2026, 2036, 2046...) */}
          {ZODIAC_SECTORS.map((sector, idx) => {
            const midDeg = idx * 30 + 15;
            const pos = getCoords(midDeg, (rShensha + rOuterYears) / 2);
            const baseYear = 2026 + idx * 7;

            return (
              <text
                key={idx}
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#38bdf8"
                fontSize="8.5"
                fontWeight="bold"
              >
                {baseYear}
              </text>
            );
          })}

          {/* 7. 核心七政四餘星曜點位與放射虛線 */}
          {processedStars.map((star) => {
            const style = STAR_COLORS[star.name] || { fill: '#e2e8f0', stroke: '#94a3b8', halo: 'rgba(226, 232, 240, 0.3)' };
            const lineToCenter = getCoords(star.longitude, rInner);

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
                  opacity="0.5"
                />

                <circle cx={star.x} cy={star.y} r="10" fill={style.halo} filter="url(#starGlow)" className="transition-all duration-300 group-hover:r-15" />

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
                  y={star.y - 10}
                  textAnchor="middle"
                  fill="#f8fafc"
                  fontSize="9.5"
                  fontWeight="bold"
                  className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                >
                  {star.name}
                  {star.isRetrograde ? '⟲' : ''}
                </text>
              </g>
            );
          })}

          {/* 圓心：立命與立身 */}
          <g transform={`translate(${center}, ${center})`}>
            <circle cx="0" cy="0" r="28" fill="#020617" stroke="url(#ringGold)" strokeWidth="1" />
            <text x="0" y="-5" textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="bold">
              {data.mingGong.split(' ')[0]}
            </text>
            <text x="0" y="9" textAnchor="middle" fill="#38bdf8" fontSize="8.5">
              {data.shenGong.split(' ')[0]}
            </text>
          </g>
        </svg>

        {/* 左下角小限與歲數動態資訊框 (對應圖片左下角視窗) */}
        <div className="absolute bottom-3 left-3 rounded-xl border border-amber-500/40 bg-slate-900/90 p-2.5 text-[11px] font-mono text-amber-200 backdrop-blur shadow-lg">
          <div className="font-bold text-amber-400">43歲 2026年 丙午(木)</div>
          <div className="text-slate-300 mt-0.5">小限:巳 宮 · 飛限:亥 宮</div>
        </div>

        {/* Hover Tooltip 浮動提示框 */}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-50 flex flex-col gap-1.5 rounded-xl border border-amber-500/40 bg-slate-900/95 p-3 text-xs text-slate-100 shadow-2xl backdrop-blur-md transition-all duration-75"
            style={{
              left: `${Math.min(tooltip.x + 12, 380)}px`,
              top: `${Math.min(tooltip.y + 12, 440)}px`,
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

      {/* 底部圖例 */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-amber-400" /> 太陽/土星</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-sky-300" /> 太陰/月孛</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-400" /> 木星/紫氣</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-red-400" /> 火星</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-purple-400" /> 羅睺/計都</span>
      </div>
    </div>
  );
}