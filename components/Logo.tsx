import React, { useId } from 'react';

const STEMS = '甲乙丙丁戊己庚辛壬癸'.split('');

// 先天八卦，自正上（南）順時針；每卦由內（初爻）至外（上爻），1 為陽爻、0 為陰爻
const TRIGRAMS: [number, number, number][] = [
  [1, 1, 1], // 乾
  [0, 1, 1], // 巽
  [0, 1, 0], // 坎
  [0, 0, 1], // 艮
  [0, 0, 0], // 坤
  [1, 0, 0], // 震
  [1, 0, 1], // 離
  [1, 1, 0], // 兌
];

const SERIF = "var(--font-noto-serif-tc), 'Songti TC', 'Noto Serif TC', 'STSong', 'PMingLiU', serif";

function octagon(r: number) {
  return Array.from({ length: 8 }, (_, i) => {
    const a = ((i * 45 + 22.5) * Math.PI) / 180;
    return `${(50 + r * Math.sin(a)).toFixed(2)},${(50 - r * Math.cos(a)).toFixed(2)}`;
  }).join(' ');
}

const OUTER_OCTAGON = octagon(37);
const INNER_OCTAGON = octagon(34);

/** 八字印：外圈十天干、八角框配先天八卦、中央朱紅「八字」方印 */
export function LogoMark({ size = 40, animated = false, className = '' }: { size?: number; animated?: boolean; className?: string }) {
  const id = useId().replace(/:/g, '');
  const gold = `url(#gold-${id})`;
  const detailed = size >= 64;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`gold-${id}`} x1="10" y1="5" x2="90" y2="95" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fef3c7" />
          <stop offset="0.45" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id={`seal-${id}`} x1="34" y1="32" x2="66" y2="68" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#dc2626" />
          <stop offset="1" stopColor="#7f1d1d" />
        </linearGradient>
        <radialGradient id={`core-${id}`} cx="50" cy="50" r="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1e293b" />
          <stop offset="1" stopColor="#020617" />
        </radialGradient>
      </defs>

      <circle cx="50" cy="50" r="48.5" fill="#020617" />

      <g className={animated ? 'origin-center animate-[spin_90s_linear_infinite]' : undefined} style={{ transformBox: 'fill-box' }}>
        <circle cx="50" cy="50" r="47.5" stroke={gold} strokeWidth={detailed ? 1.2 : 2.4} />
        <circle cx="50" cy="50" r={detailed ? 40.5 : 41} stroke={gold} strokeWidth={detailed ? 0.6 : 1.4} strokeOpacity="0.8" />
        {detailed &&
          STEMS.map((stem, i) => (
            <g key={stem} transform={`rotate(${i * 36} 50 50)`}>
              <text
                x="50"
                y="6"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="6.2"
                fontWeight="700"
                fill={gold}
                style={{ fontFamily: SERIF }}
              >
                {stem}
              </text>
              <path d="M50 4.6 l1 1.4 -1 1.4 -1 -1.4 Z" fill={gold} fillOpacity="0.7" transform="rotate(18 50 50)" />
            </g>
          ))}
      </g>

      <polygon points={OUTER_OCTAGON} fill={`url(#core-${id})`} stroke={gold} strokeWidth={detailed ? 1.3 : 2.2} strokeLinejoin="round" />
      {detailed && <polygon points={INNER_OCTAGON} stroke={gold} strokeWidth="0.5" strokeOpacity="0.6" strokeLinejoin="round" />}

      {detailed &&
        TRIGRAMS.map((lines, i) => (
          <g key={i} transform={`rotate(${i * 45} 50 50)`} fill={gold}>
            {lines.map((yang, j) => {
              const y = 50 - (24.6 + j * 2.5);
              return yang ? (
                <rect key={j} x="45.6" y={y - 0.65} width="8.8" height="1.3" rx="0.3" />
              ) : (
                <g key={j}>
                  <rect x="45.6" y={y - 0.65} width="3.7" height="1.3" rx="0.3" />
                  <rect x="50.7" y={y - 0.65} width="3.7" height="1.3" rx="0.3" />
                </g>
              );
            })}
          </g>
        ))}

      <g>
        <rect x={detailed ? 35 : 31} y={detailed ? 35 : 31} width={detailed ? 30 : 38} height={detailed ? 30 : 38} rx="2.2" fill={`url(#seal-${id})`} />
        <rect
          x={detailed ? 37 : 33.5}
          y={detailed ? 37 : 33.5}
          width={detailed ? 26 : 33}
          height={detailed ? 26 : 33}
          rx="1.2"
          stroke="#fde68a"
          strokeOpacity="0.85"
          strokeWidth={detailed ? 0.7 : 1.1}
        />
        <text
          x="50"
          textAnchor="middle"
          fill="#fef3c7"
          fontWeight="900"
          fontSize={detailed ? 11.5 : 13.5}
          style={{ fontFamily: SERIF }}
        >
          <tspan x="50" y={detailed ? 49 : 48.6}>八</tspan>
          <tspan x="50" y={detailed ? 61 : 63}>字</tspan>
        </text>
      </g>
    </svg>
  );
}

export function Logo({ size = 40, subtitle = true }: { size?: number; subtitle?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="flex flex-col leading-none">
        <span className="font-serif text-lg font-bold tracking-[0.15em] text-amber-100">算命網</span>
        {subtitle && <span className="mt-1 text-[9px] font-medium tracking-[0.3em] text-amber-500/80">CALYOURLIFE</span>}
      </span>
    </span>
  );
}
