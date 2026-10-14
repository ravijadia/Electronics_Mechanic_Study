// Shared drawing + value-picker pieces for the Module 14 op-amp benches.
import React from 'react';
import clsx from 'clsx';
import {kitLabel} from '../m07/parts';
import styles from '../styles.module.css';

/**
 * Op-amp triangle symbol, apex (output) at (x + 80, y + 35). Inputs at (x, y+16) and (x, y+54):
 * "−" on top and "+" below, or the other way round when `flip` is set.
 */
export function OpAmpTri({x, y, name = '741', flip}: {x: number; y: number; name?: string; flip?: boolean}): React.JSX.Element {
  return (
    <g>
      <path d={`M${x} ${y} L${x} ${y + 70} L${x + 80} ${y + 35} Z`} fill="#20262b" stroke="#9aa3a8" strokeWidth={1.5} />
      <text x={x + 10} y={y + 22} style={{...kitLabel, fontSize: 13}}>
        {flip ? '+' : '−'}
      </text>
      <text x={x + 10} y={y + 60} style={{...kitLabel, fontSize: 13}}>
        {flip ? '−' : '+'}
      </text>
      <text x={x + 36} y={y + 39} textAnchor="middle" style={{...kitLabel, fontSize: 9, fill: '#8fb4ff'}}>
        {name}
      </text>
    </g>
  );
}

/** Ground symbol: the wire ends at (x, y), the three bars hang below it. */
export function Gnd({x, y}: {x: number; y: number}): React.JSX.Element {
  return <path d={`M${x - 8} ${y} H${x + 8} M${x - 5} ${y + 4} H${x + 5} M${x - 2} ${y + 8} H${x + 2}`} fill="none" stroke="var(--lab-wire)" strokeWidth={1.5} />;
}

/** Wire junction dot. */
export function Dot({x, y}: {x: number; y: number}): React.JSX.Element {
  return <circle cx={x} cy={y} r={2.5} fill="var(--lab-wire)" />;
}

/** Wires, drawn as one thin path. */
export function Wires({d}: {d: string}): React.JSX.Element {
  return <path d={d} fill="none" stroke="var(--lab-wire)" strokeWidth={1.5} />;
}

/** A labelled capacitor in a horizontal wire: leads end at x - 4 and start at x + 4. */
export function HCap({x, y, label}: {x: number; y: number; label: string}): React.JSX.Element {
  return (
    <g>
      <path d={`M${x - 4} ${y - 12} V${y + 12} M${x + 4} ${y - 12} V${y + 12}`} stroke="var(--lab-wire)" strokeWidth={3} />
      <text x={x} y={y - 17} textAnchor="middle" style={{...kitLabel, fontSize: 10}}>
        {label}
      </text>
    </g>
  );
}

/** A labelled resistor, drawn horizontally. */
export function HRes({x, y, label, len = 46}: {x: number; y: number; label: string; len?: number}): React.JSX.Element {
  return (
    <g>
      <rect x={x - len / 2} y={y - 8} width={len} height={16} rx={3} fill="#e8d7b0" />
      <text x={x} y={y - 12} textAnchor="middle" style={{...kitLabel, fontSize: 10}}>
        {label}
      </text>
    </g>
  );
}

/** A labelled resistor, drawn vertically. */
export function VRes({x, y, label, len = 46}: {x: number; y: number; label: string; len?: number}): React.JSX.Element {
  return (
    <g>
      <rect x={x - 8} y={y - len / 2} width={16} height={len} rx={3} fill="#e8d7b0" />
      <text x={x + 12} y={y + 4} style={{...kitLabel, fontSize: 10}}>
        {label}
      </text>
    </g>
  );
}

export function VCap({x, y, label}: {x: number; y: number; label: string}): React.JSX.Element {
  return (
    <g>
      <path d={`M${x - 12} ${y - 4} H${x + 12} M${x - 12} ${y + 4} H${x + 12}`} stroke="var(--lab-wire)" strokeWidth={3.5} />
      <text x={x + 16} y={y + 4} style={{...kitLabel, fontSize: 10}}>
        {label}
      </text>
    </g>
  );
}

/** A row of buttons picking one value from a preset list, e.g. resistor or capacitor values. */
export function ValuePicker<T extends number>({label, value, options, fmt, onChange}: {label: string; value: T; options: T[]; fmt: (v: T) => string; onChange: (v: T) => void}): React.JSX.Element {
  return (
    <div className={clsx(styles.seg, styles.noPrint)} role="group" aria-label={label} style={{marginBottom: '0.4rem'}}>
      <span className={styles.muted} style={{alignSelf: 'center', marginRight: '0.3rem'}}>
        {label}
      </span>
      {options.map((o) => (
        <button key={o} type="button" aria-pressed={value === o} onClick={() => onChange(o)}>
          {fmt(o)}
        </button>
      ))}
    </div>
  );
}

/** A random component-tolerance factor in 1 ± pct, e.g. tolFactor(rnd, 0.05) for a 5 % resistor. */
export const tolFactor = (rnd: () => number, pct: number): number => 1 + (rnd() * 2 - 1) * pct;

export const R_VALUES =[1000, 2200, 4700, 10000, 22000, 47000, 100000];
export const RF_VALUES = R_VALUES;
export const C_VALUES = [0.01e-6, 0.047e-6, 0.1e-6, 0.47e-6, 1e-6, 10e-6];
export const DC_VALUES = [-3, -2, -1, -0.5, 0, 0.5, 1, 2, 3];

export function fmtOhm(v: number): string {
  return v >= 1000 ? `${v / 1000}k` : `${v}`;
}
export function fmtFarad(v: number): string {
  return v >= 1e-6 ? `${(v * 1e6).toFixed(v >= 1e-6 && v < 10e-6 ? 2 : 0).replace(/\.00$/, '')}µF` : `${(v * 1e9).toFixed(0)}nF`;
}
