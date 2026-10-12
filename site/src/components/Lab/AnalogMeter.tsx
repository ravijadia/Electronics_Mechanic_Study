import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

export type Movement = 'MC' | 'MI';
export type CurrentKind = 'DC' | 'AC' | 'ACDC';
export type Position = 'V' | 'H';

export interface DialSpec {
  /** Full-scale value. */
  fsd: number;
  unit: string;
  /** Number of smallest divisions across the scale. */
  divisions: number;
  /** Smallest divisions between numbered marks. */
  perMajor: number;
  movement: Movement;
  current: CurrentKind;
  position: Position;
  accuracy: string;
  testKV: number;
}

const PIVOT = {x: 160, y: 182};
const R = 132;
const SWEEP = 50; // degrees each side of vertical

function polar(r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return {x: PIVOT.x + r * Math.sin(a), y: PIVOT.y - r * Math.cos(a)};
}

function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}

/** IEC 60051-style dial symbols, drawn so they render without special fonts. */
export function DialSymbols({spec, x, y, ink = '#222'}: {spec: DialSpec; x: number; y: number; ink?: string}): React.JSX.Element {
  const s = {stroke: ink, strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round' as const};
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden="true">
      {/* movement */}
      {spec.movement === 'MC' ? (
        <g>
          <path d="M2 2 V14 a8 8 0 0 0 16 0 V2" {...s} strokeWidth={3.2} />
          <rect x="6.5" y="4" width="7" height="8" {...s} strokeWidth={1.4} />
        </g>
      ) : (
        <g>
          <rect x="1" y="2" width="18" height="16" rx="2" {...s} />
          <line x1="4" y1="16" x2="16" y2="4" {...s} strokeWidth={2.6} />
        </g>
      )}
      {/* current kind */}
      <g transform="translate(30 0)">
        {spec.current !== 'AC' && <line x1="0" y1="6" x2="18" y2="6" {...s} />}
        {spec.current === 'DC' && <line x1="0" y1="12" x2="18" y2="12" {...s} strokeDasharray="4 3" />}
        {spec.current !== 'DC' && <path d={`M0 ${spec.current === 'ACDC' ? 14 : 10} q4.5 -7 9 0 t9 0`} {...s} />}
      </g>
      {/* position */}
      <g transform="translate(58 0)">
        {spec.position === 'V' ? (
          <>
            <line x1="9" y1="2" x2="9" y2="16" {...s} />
            <line x1="1" y1="16" x2="17" y2="16" {...s} />
          </>
        ) : (
          <path d="M1 16 V4 H17 V16" {...s} />
        )}
      </g>
      {/* accuracy class */}
      <text x="88" y="15" style={{fill: ink, fontSize: 13, fontWeight: 700, fontFamily: 'var(--ifm-font-family-base)'}}>
        {spec.accuracy}
      </text>
      {/* test voltage star */}
      <g transform="translate(124 9)">
        <path
          d="M0 -9 L2.6 -3.6 L8.6 -2.8 L4.2 1.4 L5.3 7.3 L0 4.5 L-5.3 7.3 L-4.2 1.4 L-8.6 -2.8 L-2.6 -3.6 Z"
          {...s}
          strokeWidth={1.3}
        />
        <text x="0" y="3.5" textAnchor="middle" style={{fill: ink, fontSize: 8, fontWeight: 800, fontFamily: 'var(--ifm-font-family-base)'}}>
          {spec.testKV}
        </text>
      </g>
    </g>
  );
}

/**
 * Analog panel meter: scale, mirror strip, needle, dial symbols and a
 * mechanical-zero screw.
 */
export default function AnalogMeter({
  spec,
  value,
  zeroOffsetDiv = 0,
  vibrate,
  title,
}: {
  spec: DialSpec;
  /** True value applied to the movement (in scale units). */
  value: number;
  /** Mechanical zero error, in smallest divisions. */
  zeroOffsetDiv?: number;
  /** Needle chatters around zero (MC meter fed with AC). */
  vibrate?: boolean;
  title?: string;
}): React.JSX.Element {
  const perDiv = spec.fsd / spec.divisions;
  const pos = value + zeroOffsetDiv * perDiv;
  const frac = Math.max(-0.06, Math.min(1.06, pos / spec.fsd));
  const angle = -SWEEP + 2 * SWEEP * frac;
  const tip = polar(R + 4, angle);
  const ticks = Array.from({length: spec.divisions + 1}, (_, k) => k);
  const ink = '#1f1f1f';

  return (
    <svg viewBox="0 0 320 250" className={styles.analog} role="img" aria-label={title ?? `Analog meter 0 to ${spec.fsd} ${spec.unit}`}>
      <rect x="4" y="4" width="312" height="242" rx="14" fill="#2a2d30" />
      <rect x="14" y="14" width="292" height="222" rx="8" fill="#f6f3e8" />
      {/* mirror strip */}
      <path
        d={`M ${polar(R - 22, -SWEEP).x} ${polar(R - 22, -SWEEP).y} A ${R - 22} ${R - 22} 0 0 1 ${polar(R - 22, SWEEP).x} ${polar(R - 22, SWEEP).y}`}
        stroke="#b9c3c9"
        strokeWidth="7"
        fill="none"
      />
      {ticks.map((k) => {
        const a = -SWEEP + (2 * SWEEP * k) / spec.divisions;
        const major = k % spec.perMajor === 0;
        const half = !major && spec.perMajor % 2 === 0 && k % (spec.perMajor / 2) === 0;
        const p1 = polar(R, a);
        const p2 = polar(R - (major ? 14 : half ? 10 : 6), a);
        return (
          <g key={k}>
            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={ink} strokeWidth={major ? 1.6 : 0.9} />
            {major && (
              <text
                x={polar(R + 13, a).x}
                y={polar(R + 13, a).y + 4}
                textAnchor="middle"
                style={{fill: ink, fontSize: 12, fontWeight: 600, fontFamily: 'var(--ifm-font-family-base)'}}>
                {fmt(k * perDiv)}
              </text>
            )}
          </g>
        );
      })}
      <text x="160" y="140" textAnchor="middle" style={{fill: ink, fontSize: 30, fontWeight: 700, fontFamily: 'var(--ifm-font-family-base)'}}>
        {spec.unit}
      </text>
      <DialSymbols spec={spec} x={22} y={200} ink={ink} />
      {/* needle */}
      <g className={clsx(vibrate && styles.chatter)} style={{transformOrigin: `${PIVOT.x}px ${PIVOT.y}px`}}>
        <line x1={PIVOT.x} y1={PIVOT.y} x2={tip.x} y2={tip.y} stroke="#c21f1f" strokeWidth="2" strokeLinecap="round" />
      </g>
      <circle cx={PIVOT.x} cy={PIVOT.y} r="9" fill="#2a2d30" />
      {/* zero screw */}
      <g aria-hidden="true">
        <circle cx="270" cy="210" r="11" fill="#c9c9c9" stroke="#777" />
        <line x1="263" y1="214" x2="277" y2="206" stroke="#555" strokeWidth="2.5" />
      </g>
    </svg>
  );
}
