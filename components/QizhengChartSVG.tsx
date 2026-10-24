'use client';

import React from 'react';
import type { QizhengChart } from '@/lib/qizheng';
import { ZODIAC_BRANCHES, ZODIAC_EN, ZODIAC_RULERS, ZODIAC_TRIGRAMS } from '@/lib/qizheng';

const SIZE = 800;
const C = SIZE / 2;
const R = 380;

/** Moira full chart 環位（半徑比例） */
const RING = {
  center: 0.1 * R,
  palace: 0.22 * R,
  sign: 0.28 * R,
  house: 0.34 * R,
  now: 0.43 * R,
  tickA: 0.45 * R,
  mansion: 0.51 * R,
  tickB: 0.53 * R,
  birth: 0.62 * R,
  nowShensha: 0.77 * R,
  shensha: 0.92 * R,
  years: 0.95 * R,
  limit: R,
};

const COLOR = {
  bg: '#fffdf6',
  line: '#3b3b3b',
  faint: '#b9b2a2',
  text: '#1f1f1f',
  star: '#0b7a2c',
  retro: '#d11a1a',
  now: '#1d4fd8',
  shensha: '#0f6b2a',
  nowShensha: '#7b3fb3',
  ming: '#c81e1e',
  shen: '#1d4fd8',
  mansionLine: '#6b4a2b',
};

const CN_NUM = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十', '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十', '卅一', '卅二', '卅三'];

/** 黃經 → 螢幕角：子在下、午在上、卯在左、酉在右 */
const toTheta = (lon: number) => ((lon - 45) * Math.PI) / 180;
const polar = (r: number, lon: number): [number, number] => {
  const t = toTheta(lon);
  return [C + r * Math.cos(t), C - r * Math.sin(t)];
};

function radial(lon: number, r1: number, r2: number) {
  const [x1, y1] = polar(r1, lon);
  const [x2, y2] = polar(r2, lon);
  return { x1, y1, x2, y2 };
}

function spreadAngles(angles: number[], minSep: number): number[] {
  const n = angles.length;
  if (n < 2) return [...angles];
  const order = angles.map((a, i) => ({ a, i })).sort((p, q) => p.a - q.a);
  const pos = order.map((o) => o.a);
  for (let iter = 0; iter < 200; iter++) {
    let moved = false;
    for (let k = 0; k < n; k++) {
      const next = (k + 1) % n;
      let gap = pos[next] - pos[k];
      if (next === 0) gap += 360;
      if (gap < minSep) {
        const push = (minSep - gap) / 2;
        pos[k] -= push;
        pos[next] += push;
        moved = true;
      }
    }
    if (!moved) break;
  }
  const out = new Array<number>(n);
  order.forEach((o, k) => (out[o.i] = pos[k]));
  return out;
}

interface ColumnPlacement {
  x: number;
  y: number;
  text: string;
  fontSize: number;
}

/** 神煞直書：每項兩字成一直行，沿宮弧排列，必要時分多圈 */
function layoutColumns(items: string[], rInner: number, rOuter: number, lonStart: number, fontSize: number): ColumnPlacement[] {
  if (items.length === 0) return [];
  const theta = toTheta(lonStart + 15);
  const sin = Math.abs(Math.sin(theta));
  const cos = Math.abs(Math.cos(theta));
  for (let fs = fontSize; fs >= 6; fs -= 0.5) {
    const w = fs * 1.15;
    const h = fs * 2.15;
    const extT = w * sin + h * cos;
    const extR = w * cos + h * sin;
    const rows = Math.max(1, Math.floor((rOuter - rInner - 4) / extR));
    const layout: ColumnPlacement[] = [];
    let idx = 0;
    for (let j = 0; j < rows && idx < items.length; j++) {
      const r = rOuter - 2 - extR * (j + 0.5);
      const arc = (r * Math.PI * 28) / 180;
      const cap = Math.max(1, Math.floor(arc / extT));
      const take = Math.min(cap, items.length - idx);
      for (let k = 0; k < take; k++) {
        const lon = lonStart + 30 - 1 - (28 * (k + 0.5)) / take;
        const [x, y] = polar(r, lon);
        layout.push({ x, y, text: items[idx++], fontSize: fs });
      }
    }
    if (idx >= items.length) return layout;
  }
  return [];
}

function VerticalText({ x, y, text, fontSize, fill, weight }: { x: number; y: number; text: string; fontSize: number; fill: string; weight?: number }) {
  const chars = Array.from(text);
  const startY = y - ((chars.length - 1) * fontSize * 1.02) / 2;
  return (
    <g fill={fill} fontSize={fontSize} fontWeight={weight} textAnchor="middle" dominantBaseline="central">
      {chars.map((ch, i) => (
        <text key={i} x={x} y={startY + i * fontSize * 1.02}>
          {ch}
        </text>
      ))}
    </g>
  );
}

const degreeText = (deg: number) => `${CN_NUM[Math.floor(deg)] ?? Math.floor(deg)}度`;

export default function QizhengChartSVG({ data }: { data: QizhengChart }) {
  const mingStart = Math.floor(data.ming.longitude / 30) * 30;
  const shenStart = Math.floor(data.shen.longitude / 30) * 30;
  const birthYearFrac = data.birth.year + (data.birth.month - 1) / 12;

  const birthAngles = spreadAngles(data.stars.map((s) => s.longitude), 6.2);
  const nowAngles = spreadAngles(data.now.stars.map((s) => s.longitude), 7.5);
  const mansionCenters = data.mansions.map((m) => m.start + m.width / 2);
  const mansionAngles = spreadAngles(mansionCenters, 4.4);

  const currentLimit = data.houses.find((h) => data.now.age >= h.limitStartAge && data.now.age < h.limitEndAge);
  const limitLon = (house: (typeof data.houses)[number], age: number) =>
    house.zodiacIndex * 30 + 30 - (30 * (age - house.limitStartAge)) / (house.limitEndAge - house.limitStartAge);

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-auto w-full select-none" style={{ fontFamily: '"Songti TC","Noto Serif TC","PMingLiU",serif' }}>
      <rect x={0} y={0} width={SIZE} height={SIZE} fill={COLOR.bg} />

      {/* 命宮、身宮底色 */}
      {[{ start: mingStart, fill: '#fde2e2' }, { start: shenStart, fill: '#dde7fd' }].map(({ start, fill }, i) => {
        const [ax, ay] = polar(RING.house, start);
        const [bx, by] = polar(RING.house, start + 30);
        const [cx2, cy2] = polar(RING.sign, start + 30);
        const [dx, dy] = polar(RING.sign, start);
        return (
          <path
            key={i}
            d={`M${ax},${ay} A${RING.house},${RING.house} 0 0 0 ${bx},${by} L${cx2},${cy2} A${RING.sign},${RING.sign} 0 0 1 ${dx},${dy} Z`}
            fill={fill}
            opacity={i === 1 && shenStart === mingStart ? 0 : 1}
          />
        );
      })}

      {/* 同心圓 */}
      <g fill="none" stroke={COLOR.line}>
        {[RING.center, RING.palace, RING.sign, RING.house, RING.now, RING.mansion, RING.birth, RING.nowShensha, RING.shensha, RING.years, RING.limit].map((r) => (
          <circle key={r} cx={C} cy={C} r={r} strokeWidth={r === RING.limit || r === RING.house ? 1.4 : 0.9} />
        ))}
        {[RING.tickA, RING.tickB].map((r) => (
          <circle key={r} cx={C} cy={C} r={r} strokeWidth={0.6} stroke={COLOR.faint} />
        ))}
      </g>

      {/* 十二宮分界 */}
      <g stroke={COLOR.line} strokeWidth={0.9}>
        {Array.from({ length: 12 }, (_, i) => i * 30).map((lon) => (
          <g key={lon}>
            <line {...radial(lon, RING.center, RING.now)} />
            <line {...radial(lon, RING.birth, RING.limit)} />
            <line {...radial(lon, RING.tickA, RING.tickB)} strokeWidth={0.5} stroke={COLOR.faint} />
            <line {...radial(lon, RING.tickB, RING.birth)} strokeWidth={0.6} stroke={COLOR.faint} strokeDasharray="3 3" />
          </g>
        ))}
      </g>

      {/* 度數刻度 */}
      <g stroke={COLOR.faint}>
        {Array.from({ length: 360 }, (_, d) => (
          <g key={d}>
            <line {...radial(d, RING.tickA - (d % 5 === 0 ? 5 : 2.5), RING.tickA)} strokeWidth={d % 5 === 0 ? 0.8 : 0.5} />
            <line {...radial(d, RING.mansion, RING.mansion + (d % 5 === 0 ? 5 : 2.5))} strokeWidth={d % 5 === 0 ? 0.8 : 0.5} />
          </g>
        ))}
      </g>

      {/* 地支・卦・宮主 */}
      {ZODIAC_BRANCHES.map((branch, z) => {
        const lon = z * 30 + 15;
        const [x1, y1] = polar(RING.center + 11, lon);
        const [x2, y2] = polar((RING.center + RING.palace) / 2 + 1, lon);
        const [x3, y3] = polar(RING.palace - 10, lon);
        const [ex, ey] = polar((RING.palace + RING.sign) / 2, lon);
        return (
          <g key={branch} textAnchor="middle" dominantBaseline="central">
            <text x={x1} y={y1} fontSize={15} fontWeight={700} fill={COLOR.text}>{branch}</text>
            <text x={x2} y={y2} fontSize={12} fill="#555">{ZODIAC_TRIGRAMS[z]}</text>
            <text x={x3} y={y3} fontSize={13} fill={COLOR.star}>{ZODIAC_RULERS[z]}</text>
            <text x={ex} y={ey} fontSize={10} fill="#666" fontFamily="Georgia,serif">{ZODIAC_EN[z]}</text>
          </g>
        );
      })}

      {/* 十二宮名 */}
      {data.houses.map((h) => {
        const [x, y] = polar((RING.sign + RING.house) / 2, h.zodiacIndex * 30 + 15);
        const isMing = h.index === 0;
        return (
          <text
            key={h.name}
            x={x}
            y={y}
            fontSize={12}
            fontWeight={isMing ? 800 : 600}
            textAnchor="middle"
            dominantBaseline="central"
            fill={isMing ? COLOR.ming : h.isShen ? COLOR.shen : COLOR.text}
          >
            {h.name}
          </text>
        );
      })}

      {/* 流年星曜 */}
      {data.now.stars.map((s, i) => {
        const [gx, gy] = polar(RING.house + 17, nowAngles[i]);
        return (
          <g key={`now-${s.key}`}>
            <line {...radial(s.longitude, RING.tickA - 6, RING.tickA)} stroke={COLOR.now} strokeWidth={1.2} />
            <line x1={polar(RING.tickA - 6, s.longitude)[0]} y1={polar(RING.tickA - 6, s.longitude)[1]} x2={polar(RING.house + 27, nowAngles[i])[0]} y2={polar(RING.house + 27, nowAngles[i])[1]} stroke={COLOR.now} strokeWidth={0.5} opacity={0.6} />
            <text x={gx} y={gy} fontSize={12.5} textAnchor="middle" dominantBaseline="central" fill={s.isRetrograde ? COLOR.retro : COLOR.now}>
              <title>{`流年 ${s.key} ${s.longitude.toFixed(2)}°${s.isRetrograde ? ' 逆' : ''}`}</title>
              {s.key}
            </text>
          </g>
        );
      })}

      {/* 二十八宿 */}
      <g>
        {data.mansions.map((m, i) => {
          const [tx, ty] = polar((RING.tickA + RING.mansion) / 2, mansionAngles[i]);
          return (
            <g key={m.name}>
              <line {...radial(m.start, RING.now, RING.tickB)} stroke={COLOR.mansionLine} strokeWidth={0.9} />
              <text x={tx} y={ty} fontSize={12.5} fontWeight={600} textAnchor="middle" dominantBaseline="central" fill="#5a3412">
                <title>{`${m.name}${m.element}宿：起 ${m.start.toFixed(2)}°，寬 ${m.width.toFixed(2)}°`}</title>
                {m.name}
              </text>
            </g>
          );
        })}
      </g>

      {/* 本命七政四餘 */}
      {data.stars.map((s, i) => {
        const angle = birthAngles[i];
        const [gx, gy] = polar((RING.tickB + RING.birth) / 2 + 1, angle);
        const [lx, ly] = polar(RING.tickB + 4, angle);
        const [px, py] = polar(RING.tickB, s.longitude);
        const marked = s.state === '逆' || s.state === '留' || s.state === '伏' || s.state === '蝕';
        return (
          <g key={s.key}>
            <line {...radial(s.longitude, RING.mansion, RING.tickB)} stroke={COLOR.retro} strokeWidth={1.4} />
            <line x1={px} y1={py} x2={lx} y2={ly} stroke={COLOR.star} strokeWidth={0.6} />
            {marked && <circle cx={gx} cy={gy} r={10} fill="none" stroke={COLOR.retro} strokeWidth={1} />}
            <text x={gx} y={gy} fontSize={16} fontWeight={700} textAnchor="middle" dominantBaseline="central" fill={s.state === '逆' ? COLOR.retro : COLOR.star}>
              <title>
                {`${s.name}（${s.key}）\n${s.branch}宮 ${s.degreeInSign}　${s.mansion}宿 ${s.mansionDegree}\n${s.state || '—'} ${s.dignity.join('')}${s.huaYao.length ? `\n化曜：${s.huaYao.join('、')}` : ''}\n落${s.house}`}
              </title>
              {s.key}
            </text>
            {s.state && s.state !== '順' && (
              <text x={gx + 10} y={gy - 9} fontSize={8.5} textAnchor="middle" dominantBaseline="central" fill={COLOR.retro}>
                {s.state}
              </text>
            )}
          </g>
        );
      })}

      {/* 流年神煞、本命神煞 */}
      {data.houses.map((h) => {
        const start = h.zodiacIndex * 30;
        const nowCols = layoutColumns(h.nowShensha, RING.birth, RING.nowShensha, start, 10);
        const birthCols = layoutColumns(h.shensha, RING.nowShensha, RING.shensha, start, 11);
        return (
          <g key={`ss-${h.name}`}>
            {nowCols.map((c, i) => (
              <VerticalText key={`n${i}`} x={c.x} y={c.y} text={c.text} fontSize={c.fontSize} fill={COLOR.nowShensha} />
            ))}
            {birthCols.map((c, i) => (
              <VerticalText key={`b${i}`} x={c.x} y={c.y} text={c.text} fontSize={c.fontSize} fill={COLOR.shensha} />
            ))}
          </g>
        );
      })}

      {/* 大限：逐年刻度與起限年份 */}
      {data.houses.map((h) => {
        const ticks: number[] = [];
        for (let age = Math.ceil(h.limitStartAge); age < h.limitEndAge; age++) ticks.push(age);
        const boundary = h.zodiacIndex * 30 + 30;
        const [yx, yy] = polar((RING.years + RING.limit) / 2, boundary);
        return (
          <g key={`lim-${h.name}`}>
            {ticks.map((age) => (
              <line key={age} {...radial(limitLon(h, age), RING.shensha, RING.shensha + (age % 5 === 0 ? 7 : 4))} stroke={COLOR.line} strokeWidth={0.6} />
            ))}
            <rect x={yx - 15} y={yy - 7} width={30} height={14} fill={COLOR.bg} />
            <text x={yx} y={yy} fontSize={10} textAnchor="middle" dominantBaseline="central" fill={COLOR.text} fontFamily="Georgia,serif">
              <title>{`${h.name}限：${h.limitStartAge.toFixed(1)}–${h.limitEndAge.toFixed(1)} 歲`}</title>
              {Math.floor(birthYearFrac + h.limitStartAge)}
            </text>
          </g>
        );
      })}
      {currentLimit && (
        <g>
          <line {...radial(limitLon(currentLimit, data.now.age), RING.shensha - 4, RING.limit)} stroke={COLOR.retro} strokeWidth={2} />
          <circle cx={polar(RING.limit, limitLon(currentLimit, data.now.age))[0]} cy={polar(RING.limit, limitLon(currentLimit, data.now.age))[1]} r={3.5} fill={COLOR.retro} />
        </g>
      )}

      {/* 命度標記 */}
      <line {...radial(data.ming.longitude, RING.house, RING.limit)} stroke={COLOR.ming} strokeWidth={1.2} strokeDasharray="4 3" opacity={0.75} />

      {/* 中宮 */}
      <g textAnchor="middle" dominantBaseline="central">
        <text x={C} y={C - 21} fontSize={10} fill={COLOR.text}>
          立命
        </text>
        <text x={C} y={C - 7} fontSize={12.5} fontWeight={700} fill={COLOR.ming}>
          {`${data.ming.mansion}${degreeText(data.mingDuDegree)}`}
        </text>
        <text x={C} y={C + 8} fontSize={10.5} fill={COLOR.text}>
          {`${data.ming.degreeRuler}度命`}
        </text>
        <text x={C} y={C + 22} fontSize={9.5} fill={COLOR.shen}>
          {`身${data.shen.mansion}${degreeText(parseFloat(data.shen.mansionDegree))}`}
        </text>
      </g>
    </svg>
  );
}
