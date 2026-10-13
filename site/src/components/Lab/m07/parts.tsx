// Shared drawings and helpers for the Module 7 component practicals.
import React from 'react';
import {BAND_HEX} from '../circuit';

export const DIGIT_COLOURS = ['black', 'brown', 'red', 'orange', 'yellow', 'green', 'blue', 'violet', 'grey', 'white'];
/** Multiplier band: power of ten → colour (gold = ×0.1, silver = ×0.01). */
export const MULT_COLOUR: Record<number, string> = {[-2]: 'silver', [-1]: 'gold', 0: 'black', 1: 'brown', 2: 'red', 3: 'orange', 4: 'yellow', 5: 'green', 6: 'blue'};
export const TOL_COLOUR: Record<number, string> = {1: 'brown', 2: 'red', 5: 'gold', 10: 'silver'};

export const E12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82];
export const E24 = [10, 11, 12, 13, 15, 16, 18, 20, 22, 24, 27, 30, 33, 36, 39, 43, 47, 51, 56, 62, 68, 75, 82, 91];

/** Colour bands for a value (Ω). 4-band uses 2 digits, 5-band uses 3. */
export function bandsFor(ohms: number, tol: number, five: boolean): string[] {
  const digits = five ? 3 : 2;
  let exp = Math.floor(Math.log10(ohms)) - (digits - 1);
  let sig = Math.round(ohms / 10 ** exp);
  if (sig >= 10 ** digits) {
    sig /= 10;
    exp += 1;
  }
  const ds = String(sig).padStart(digits, '0').split('').map((d) => DIGIT_COLOURS[Number(d)]);
  return [...ds, MULT_COLOUR[exp], TOL_COLOUR[tol]];
}

export function fmtOhms(r: number): string {
  if (!isFinite(r)) return 'open';
  if (r >= 1e6) return `${Number((r / 1e6).toPrecision(3))} MΩ`;
  if (r >= 1e3) return `${Number((r / 1e3).toPrecision(3))} kΩ`;
  return `${Number(r.toPrecision(3))} Ω`;
}

/** Parses "4.7k", "4k7", "470", "1M", "2.2 kΩ" → ohms. */
export function parseOhms(s: string): number | null {
  const t = s.trim().toLowerCase().replace(/ohms?|Ω|ω|\s/g, '');
  if (!t) return null;
  const m = /^(\d*\.?\d*)([rkm]?)(\d*)$/.exec(t);
  if (!m || (!m[1] && !m[3])) return null;
  const mult = m[2] === 'k' ? 1e3 : m[2] === 'm' ? 1e6 : 1;
  const num = m[3] ? Number(`${m[1] || '0'}.${m[3]}`) : Number(m[1]);
  return Number.isFinite(num) ? num * mult : null;
}

export const near = (a: number | null, b: number, rel = 0.02) => a != null && Math.abs(a - b) <= Math.abs(b) * rel + 1e-12;

/** Axial carbon / metal film resistor drawn horizontally, centred on (cx, cy). */
export function AxialResistor({
  cx,
  cy,
  len = 70,
  dia = 18,
  bands,
  body = '#e8d7b0',
  lead = 46,
  burnt,
  cracked,
  brokenLead,
}: {
  cx: number;
  cy: number;
  len?: number;
  dia?: number;
  bands: string[];
  body?: string;
  lead?: number;
  burnt?: boolean;
  cracked?: boolean;
  brokenLead?: boolean;
}): React.JSX.Element {
  const x0 = cx - len / 2;
  const n = bands.length;
  const gap = len * 0.11;
  const bw = Math.max(2.5, len * 0.07);
  return (
    <g>
      <line x1={x0 - lead} y1={cy} x2={x0 + 2} y2={cy} stroke="#a9b1b6" strokeWidth={2} />
      <line x1={cx + len / 2 - 2} y1={cy} x2={cx + len / 2 + (brokenLead ? lead * 0.35 : lead)} y2={cy} stroke="#a9b1b6" strokeWidth={2} />
      <rect x={x0} y={cy - dia / 2} width={len} height={dia} rx={dia / 2.4} fill={body} />
      {bands.map((b, k) => {
        const last = k === n - 1;
        const x = last ? x0 + len - gap - bw : x0 + gap + k * (bw + len * 0.06);
        return <rect key={k} x={x} y={cy - dia / 2} width={bw} height={dia} fill={BAND_HEX[b]} opacity={burnt ? 0.35 : 1} />;
      })}
      {burnt && <ellipse cx={cx + len * 0.05} cy={cy} rx={len * 0.3} ry={dia * 0.55} fill="#2b1a10" opacity={0.85} />}
      {cracked && <path d={`M${cx - 4} ${cy - dia / 2} l6 ${dia * 0.35} l-5 ${dia * 0.25} l6 ${dia * 0.4}`} stroke="#222" strokeWidth={1.6} fill="none" />}
      <rect x={x0} y={cy - dia / 2} width={len} height={dia * 0.3} rx={dia / 3} fill="#fff" opacity={0.18} />
    </g>
  );
}

export const kitLabel = {fill: 'var(--lab-kit-ink)', fontSize: 11, fontWeight: 700, fontFamily: 'var(--ifm-font-family-base)'} as const;
export const kitSmall = {fill: 'var(--lab-kit-muted)', fontSize: 10, fontFamily: 'var(--ifm-font-family-base)'} as const;
