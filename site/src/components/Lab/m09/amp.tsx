// Shared amplifier bench pieces for 1.9.84 – 1.9.87: a transistor stage
// drawing, node signals, and an AC millivoltmeter / DC voltmeter.
import React from 'react';
import {stats, type Sig} from '../signals';
import {ProbePoint, type Probes} from '../Probes';
import {kitLabel} from '../m07/parts';
import styles from '../styles.module.css';

export const DC = (v: number): Sig => ({fn: () => v, period: null});

/**
 * Output of a stage: DC level `vq` plus the input's AC part scaled by `mag`,
 * shifted by `ph` (rad) at frequency f, and clipped to +up / −down.
 */
export function stageSignal(input: Sig, f: number, vq: number, mag: number, ph: number, up: number, down: number): Sig {
  const mean = input.period ? stats(input).mean : 0;
  const shift = f > 0 ? ph / (2 * Math.PI * f) : 0;
  return {
    fn: (t) => {
      const a = mag * (input.fn(t + shift) - mean);
      return vq + Math.max(-down, Math.min(up, a));
    },
    period: input.period,
  };
}

/** True rms of the AC part of a signal. */
export function acRms(s: Sig): number {
  if (!s.period) return 0;
  const st = stats(s);
  return Math.sqrt(Math.max(0, st.rms * st.rms - st.mean * st.mean));
}

export const METER_FNS = [
  {fn: 'off', label: 'OFF'},
  {fn: 'dcv20', label: 'DC V 20'},
  {fn: 'acm30', label: 'AC 30 mV'},
  {fn: 'acm300', label: 'AC 300 mV'},
  {fn: 'acv3', label: 'AC 3 V'},
  {fn: 'acv30', label: 'AC 30 V'},
];

/** Reading of the meter across two node signals. Returns text, unit and volts. */
export function meterRead(fn: string, a: Sig | null, b: Sig | null): {text: string; unit: string; volts: number | null} {
  if (fn === 'off') return {text: '', unit: '', volts: null};
  const s: Sig | null = a && b ? {fn: (t) => a.fn(t) - b.fn(t), period: a.period ?? b.period} : null;
  if (fn === 'dcv20') {
    const v = s ? (s.period ? stats(s).mean : s.fn(0)) : 0;
    return Math.abs(v) >= 20 ? {text: 'OL', unit: 'V DC', volts: null} : {text: v.toFixed(2), unit: 'V DC', volts: Number(v.toFixed(2))};
  }
  let rms = 0;
  if (s && s.period) {
    const st = stats(s);
    rms = Math.sqrt(Math.max(0, st.rms * st.rms - st.mean * st.mean));
  }
  const fs = fn === 'acm30' ? 0.03 : fn === 'acm300' ? 0.3 : fn === 'acv3' ? 3 : 30;
  const mv = fs < 1;
  if (rms >= fs) return {text: 'OL', unit: mv ? 'mV AC' : 'V AC', volts: null};
  const text = mv ? (rms * 1000).toFixed(fs < 0.1 ? 2 : 1) : rms.toFixed(fs < 10 ? 3 : 2);
  return {text, unit: mv ? 'mV AC' : 'V AC', volts: mv ? Number(text) / 1000 : Number(text)};
}

/** Small parts used by the stage drawing. */
export const Res = ({x, y, vertical = true, label, len = 44}: {x: number; y: number; vertical?: boolean; label?: string; len?: number}) => (
  <g>
    {vertical ? <rect x={x - 8} y={y - len / 2} width={16} height={len} rx={3} fill="#e8d7b0" /> : <rect x={x - len / 2} y={y - 8} width={len} height={16} rx={3} fill="#e8d7b0" />}
    {label && (
      <text x={vertical ? x + 12 : x} y={vertical ? y + 4 : y - 12} textAnchor={vertical ? 'start' : 'middle'} style={{...kitLabel, fontSize: 10}}>
        {label}
      </text>
    )}
  </g>
);
export const Cap = ({x, y, vertical = false, label}: {x: number; y: number; vertical?: boolean; label?: string}) => (
  <g>
    {vertical ? <path d={`M${x - 12} ${y - 4} H${x + 12} M${x - 12} ${y + 4} H${x + 12}`} stroke="var(--lab-wire)" strokeWidth={3.5} /> : <path d={`M${x - 4} ${y - 12} V${y + 12} M${x + 4} ${y - 12} V${y + 12}`} stroke="var(--lab-wire)" strokeWidth={3.5} />}
    {label && (
      <text x={vertical ? x + 16 : x} y={vertical ? y + 4 : y - 16} textAnchor={vertical ? 'start' : 'middle'} style={{...kitLabel, fontSize: 10}}>
        {label}
      </text>
    )}
  </g>
);

export interface StageDraw {
  /** Offset of the stage in the parent SVG. */
  x: number;
  kind: 'ce' | 'cc';
  /** Base bias: divider (R1 + R2) or a single Rb from Vcc. */
  divider: boolean;
  labels: {r1: string; r2?: string; rc?: string; re?: string; ce?: string};
  /** Emitter bypass capacitor fitted. */
  bypass?: boolean;
  onBypass?: () => void;
  coupling?: boolean;
  /** Node ids for probe points. */
  ids: {b: string; c: string; e: string};
  probes: Probes;
  name?: string;
}

/**
 * One transistor stage, 230 × 260. Vcc rail at y = 20, ground at y = 240,
 * input at the left (x, 130), output at the right (x + 230, 90 for CE, 170 for CC).
 */
export function Stage(p: StageDraw): React.JSX.Element {
  const X = (v: number) => p.x + v;
  const outY = p.kind === 'ce' ? 90 : 170;
  return (
    <g>
      <path className={styles.wire} fill="none" d={`M${X(0)} 20 H${X(230)} M${X(0)} 240 H${X(230)} M${X(70)} 20 V56 M${X(70)} 104 V${p.divider ? 186 : 130} ${p.divider ? `M${X(70)} 234 V240` : ''} M${X(70)} 130 H${X(118)} ${p.coupling ? `M${X(0)} 130 H${X(26)} M${X(34)} 130 H${X(70)}` : `M${X(0)} 130 H${X(70)}`} M${X(150)} 20 V${p.kind === 'ce' ? 46 : 112} M${X(150)} ${p.kind === 'ce' ? 94 : 112} V112 M${X(150)} 148 V${p.labels.re ? 176 : 240} ${p.labels.re ? `M${X(150)} 224 V240` : ''} ${p.kind === 'ce' ? `M${X(150)} 90 H${X(196)} M${X(204)} 90 H${X(230)}` : `M${X(150)} 170 H${X(196)} M${X(204)} 170 H${X(230)}`}`} />
      <Res x={X(70)} y={80} label={p.labels.r1} />
      {p.divider && <Res x={X(70)} y={210} label={p.labels.r2} />}
      {p.kind === 'ce' && <Res x={X(150)} y={70} label={p.labels.rc} />}
      {p.labels.re && <Res x={X(150)} y={200} label={p.labels.re} />}
      {p.coupling && <Cap x={X(30)} y={130} />}
      <Cap x={X(200)} y={outY} />
      {/* transistor */}
      <circle cx={X(135)} cy={130} r={26} fill="none" stroke="var(--lab-wire)" strokeWidth={1.5} />
      <path d={`M${X(118)} 112 V148 M${X(118)} 122 L${X(150)} 112 M${X(118)} 138 L${X(150)} 148 M${X(150)} 148 L${X(141)} 140 M${X(150)} 148 L${X(138)} 147`} stroke="var(--lab-wire)" strokeWidth={2.5} fill="none" />
      {p.bypass != null && (
        <g
          className={styles.clickable}
          role="button"
          tabIndex={0}
          aria-label={`Emitter bypass capacitor ${p.bypass ? 'fitted. Remove' : 'removed. Fit'}`}
          onClick={p.onBypass}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              p.onBypass?.();
            }
          }}>
          <rect x={X(170)} y={160} width={56} height={80} fill="transparent" />
          <path d={`M${X(150)} 170 H${X(196)} V194 M${X(196)} 206 V240`} stroke="var(--lab-wire)" strokeWidth={2} fill="none" strokeDasharray={p.bypass ? undefined : '4 4'} opacity={p.bypass ? 1 : 0.5} />
          {p.bypass ? <Cap x={X(196)} y={200} vertical /> : <rect x={X(184)} y={190} width={24} height={20} rx={3} fill="none" stroke="#9fb0ba" strokeDasharray="3 3" />}
          <text x={X(212)} y={226} style={{...kitLabel, fontSize: 10, fill: '#8fb4ff'}}>
            {p.labels.ce ?? 'Ce'}
          </text>
        </g>
      )}
      {p.name && (
        <text x={X(115)} y={262} textAnchor="middle" style={{...kitLabel, fontSize: 10, fill: '#9fb0ba'}}>
          {p.name}
        </text>
      )}
      <ProbePoint id={`${p.ids.b}@${p.x}`} x={X(96)} y={130} probes={p.probes} label={`${p.name ?? ''} base`} r={4} />
      <ProbePoint id={`${p.ids.c}@${p.x}`} x={X(166)} y={p.kind === 'ce' ? 90 : 26} probes={p.probes} label={`${p.name ?? ''} collector`} r={4} />
      <ProbePoint id={`${p.ids.e}@${p.x}`} x={X(166)} y={170} probes={p.probes} label={`${p.name ?? ''} emitter`} r={4} />
    </g>
  );
}
