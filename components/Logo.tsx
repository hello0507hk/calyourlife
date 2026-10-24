import React, { useId } from 'react';

const TICKS = Array.from({ length: 12 }, (_, i) => i * 30);

/** 星盤印記：外圈十二宮刻度、內圈太極、中央四芒星（七政） */
export function LogoMark({ size = 40, animated = false, className = '' }: { size?: number; animated?: boolean; className?: string }) {
  const id = useId().replace(/:/g, '');
  const gold = `url(#gold-${id})`;

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`gold-${id}`} x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fef3c7" />
          <stop offset="0.45" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
        <radialGradient id={`core-${id}`} cx="32" cy="32" r="20" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1e293b" />
          <stop offset="1" stopColor="#020617" />
        </radialGradient>
      </defs>

      <g className={animated ? 'origin-center animate-[spin_60s_linear_infinite]' : undefined} style={{ transformBox: 'fill-box' }}>
        <circle cx="32" cy="32" r="30" stroke={gold} strokeWidth="1.6" />
        {TICKS.map((deg) => {
          const major = deg % 90 === 0;
          return (
            <line
              key={deg}
              x1="32"
              y1={major ? 3.5 : 4.5}
              x2="32"
              y2={major ? 9 : 7.5}
              stroke={gold}
              strokeWidth={major ? 1.8 : 1.1}
              strokeLinecap="round"
              transform={`rotate(${deg} 32 32)`}
            />
          );
        })}
        <circle cx="32" cy="10.5" r="1.6" fill="#fde68a" transform="rotate(45 32 32)" />
      </g>

      <circle cx="32" cy="32" r="21" fill={`url(#core-${id})`} stroke={gold} strokeWidth="0.8" strokeOpacity="0.7" />

      <path d="M32 13 A19 19 0 0 1 32 51 A9.5 9.5 0 0 1 32 32 A9.5 9.5 0 0 0 32 13 Z" fill={gold} fillOpacity="0.22" />
      <circle cx="32" cy="22.5" r="1.9" fill={gold} fillOpacity="0.55" />
      <circle cx="32" cy="41.5" r="1.9" fill="#020617" stroke={gold} strokeOpacity="0.4" strokeWidth="0.6" />

      <path
        d="M32 21.5 L34.2 29.8 L42.5 32 L34.2 34.2 L32 42.5 L29.8 34.2 L21.5 32 L29.8 29.8 Z"
        fill={gold}
        stroke="#fef3c7"
        strokeWidth="0.4"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="32" r="1.6" fill="#020617" />
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
