import React, {useEffect, useState} from 'react';
import clsx from 'clsx';
import Multimeter from '../Multimeter';
import useStoredState from '../useStoredState';
import {ProbeBar, ProbePoint, useProbes} from '../Probes';
import {Knob} from '../Scope';
import {NoteBox, type Note} from '../kit';
import {AxialResistor, bandsFor, fmtOhms, kitLabel} from './parts';
import {solveNodes, resistanceBetween, type Branch} from './network';
import styles from '../styles.module.css';

// A breadboard-style bench: DC supply on the left (terminals P and N), resistors,
// and removable links. To measure a current, switch off, pull a link and put
// the meter probes in the two link sockets.

export interface NetPart {
  id: string;
  kind: 'R' | 'link';
  a: string;
  b: string;
  x: number;
  y: number;
  vertical?: boolean;
}

export interface NetDef {
  w: number;
  h: number;
  /** SVG path data for all fixed wiring. */
  wires: string;
  parts: NetPart[];
  /** Extra probe points on resistor ends, by node. */
  pads: {node: string; x: number; y: number; label: string}[];
}

export type Quantity =
  | {id: string; label: string; kind: 'V'; pairs: [string, string][]}
  | {id: string; label: string; kind: 'I'; link: string}
  | {id: string; label: string; kind: 'R'; pairs: [string, string][]; isolate?: string[]};

export interface Recorded {
  text: string;
  value: number;
  unit: string;
  /** Supply setting when the reading was taken. */
  setV: number;
}

const R_LINK = 0.02;
const R_INT = 0.5;
const FUSE_A = 0.2;
export const NET_FNS = [
  {fn: 'off', label: 'OFF'},
  {fn: 'V20', label: 'DC V 20'},
  {fn: 'mA200', label: 'DC mA 200'},
  {fn: 'mA20', label: 'DC mA 20'},
  {fn: 'R2k', label: 'Ω 2k'},
  {fn: 'R20k', label: 'Ω 20k'},
];

/** Where the drawn supply puts its terminals. */
export const SUPPLY_P = {x: 150, y: 70};
export const SUPPLY_N = {x: 150, y: 230};

/** Resistor actual values: nominal ±3 %. */
export function makeValues(nominals: Record<string, number>, rnd: () => number): Record<string, number> {
  return Object.fromEntries(Object.entries(nominals).map(([k, v]) => [k, v * (1 + (rnd() * 2 - 1) * 0.03)]));
}

export function useNetworkBench({
  key,
  def,
  nominal,
  actual,
  quantities,
}: {
  key: string;
  def: NetDef;
  nominal: Record<string, number>;
  actual: Record<string, number>;
  quantities: Quantity[];
}) {
  const [records, setRecords] = useStoredState<Record<string, Recorded>>(`lab:${key}:rec`, {});
  const [volts, setVolts] = useState(6);
  const [power, setPower] = useState(false);
  const [removed, setRemoved] = useState<string[]>([]);
  const [fn, setFn] = useState('off');
  const [fuse, setFuse] = useState(true);
  const [note, setNote] = useState<Note>(null);
  const probes = useProbes();

  const linkIn = (id: string) => !removed.includes(id);
  const circuit: Branch[] = def.parts.map((p) => ({a: p.a, b: p.b, ohms: p.kind === 'R' ? actual[p.id] : linkIn(p.id) ? R_LINK : Infinity}));
  const supply: Branch[] = power ? [{a: 'P', b: 'N', ohms: R_INT}] : [];
  const src = power ? [{from: 'N', to: 'P', amps: volts / R_INT}] : [];

  const padNode = (id: string | null) => (id ? id.split('@')[0] : null);
  const red = padNode(probes.red);
  const black = padNode(probes.black);
  const both = red && black && red !== black;

  const isV = fn === 'V20';
  const isA = fn === 'mA200' || fn === 'mA20';
  const isR = fn === 'R2k' || fn === 'R20k';
  const meter: Branch[] = both && (isV || (isA && fuse)) ? [{a: red!, b: black!, ohms: isV ? 10e6 : 1}] : [];
  const v = solveNodes([...circuit, ...supply, ...meter], src);
  const vm = both ? v[red!] - v[black!] : 0;
  const iMeter = isA && fuse && both ? vm / 1 : 0;

  let text = '';
  let unit = '';
  if (fn !== 'off') {
    if (isV) {
      unit = 'V';
      text = Math.abs(vm) >= 20 ? 'OL' : vm.toFixed(2);
    } else if (isA) {
      unit = 'mA';
      const ma = iMeter * 1000;
      const fs = fn === 'mA200' ? 200 : 20;
      text = Math.abs(ma) >= fs ? 'OL' : ma.toFixed(fn === 'mA200' ? 1 : 2);
    } else {
      const fs = fn === 'R2k' ? 2000 : 20000;
      unit = 'kΩ';
      let r = Infinity;
      if (both) {
        if (power) {
          // External voltage upsets the ohmmeter: a meaningless reading.
          const vv = solveNodes([...circuit, ...supply], [...src, {from: black!, to: red!, amps: 1e-3}]);
          r = (vv[red!] - vv[black!]) / 1e-3;
        } else r = resistanceBetween(circuit, red!, black!);
      }
      text = !isFinite(r) || Math.abs(r) >= fs ? 'OL' : (r / 1000).toFixed(fn === 'R2k' ? 3 : 2);
    }
    if (!fuse && isA) text = fn === 'mA200' ? '0.0' : '0.00';
  }

  const blow = isA && fuse && Math.abs(iMeter) > FUSE_A;
  useEffect(() => {
    if (!blow) return;
    setFuse(false);
    setNote({kind: 'bad', text: <b>Pop! Meter fuse blown. On mA the meter is a near short: never put it across a voltage.</b>});
  }, [blow]);

  const toggleLink = (id: string) => {
    if (power) return setNote({kind: 'warn', text: 'Switch off the supply before changing links.'});
    setNote(null);
    setRemoved((r) => (r.includes(id) ? r.filter((x) => x !== id) : [...r, id]));
  };

  const pairMatch = (pairs: [string, string][]) => pairs.find(([a, b]) => (a === red && b === black) || (a === black && b === red));

  /** Which table quantity the meter is on right now, if any. */
  const current = (): Quantity | null => {
    if (!both) return null;
    for (const q of quantities) {
      if (q.kind === 'V' && isV && pairMatch(q.pairs)) return q;
      if (q.kind === 'R' && isR && pairMatch(q.pairs)) return q;
      if (q.kind === 'I' && isA) {
        const p = def.parts.find((x) => x.id === q.link)!;
        if (!linkIn(q.link) && ((red === p.a && black === p.b) || (red === p.b && black === p.a))) return q;
      }
    }
    return null;
  };

  const noteIt = () => {
    if (fn === 'off') return setNote({kind: 'warn', text: 'Select a function.'});
    if (!both) return setNote({kind: 'warn', text: 'Place both probes.'});
    if (isA && !fuse) return setNote({kind: 'warn', text: 'Replace the fuse first.'});
    if (isR && power) return setNote({kind: 'bad', text: 'Switch off the supply before measuring resistance.'});
    if (!isR && !power) return setNote({kind: 'warn', text: 'Supply is off.'});
    const q = current();
    if (!q) {
      if (isA) return setNote({kind: 'warn', text: 'For current: pull a link and put the probes in its two sockets.'});
      return setNote({kind: 'warn', text: 'Not a quantity in the table. Probes across one part.'});
    }
    if (text === 'OL') return setNote({kind: 'warn', text: 'OL: change range.'});
    const value = Number(text);
    if (value < 0) return setNote({kind: 'warn', text: 'Minus sign: swap the probes (red to the + side).'});
    if (q.kind === 'R' && q.isolate && q.isolate.every(linkIn)) {
      setNote({kind: 'warn', text: `Noted, but ${q.label} is in circuit with a parallel path. Pull a link to isolate it.`});
    } else setNote({kind: 'good', text: `${q.label} = ${text} ${unit}`});
    setRecords((r) => ({...r, [q.id]: {text, value: unit === 'kΩ' ? value * 1000 : value, unit, setV: volts}}));
  };

  // True value of a quantity (for checking), without meter loading.
  const truth = (q: Quantity, setV = volts): number => {
    const base: Branch[] = def.parts.map((p) => ({a: p.a, b: p.b, ohms: p.kind === 'R' ? actual[p.id] : R_LINK}));
    if (q.kind === 'R') {
      const iso = q.isolate ? base.map((b, k) => (def.parts[k].id === q.isolate![0] ? {...b, ohms: Infinity} : b)) : base;
      return resistanceBetween(iso, q.pairs[0][0], q.pairs[0][1]);
    }
    const vv = solveNodes([...base, {a: 'P', b: 'N', ohms: R_INT}], [{from: 'N', to: 'P', amps: setV / R_INT}]);
    if (q.kind === 'V') return Math.abs(vv[q.pairs[0][0]] - vv[q.pairs[0][1]]);
    const p = def.parts.find((x) => x.id === q.link)!;
    return (Math.abs(vv[p.a] - vv[p.b]) / R_LINK) * 1000;
  };

  const flowing = power && (volts - (v.P ?? 0)) / R_INT > 1e-5;

  const view = (
    <>
      <div className={styles.controls} style={{marginTop: 0}}>
        <div>
          <div className={styles.kit}>
            <svg viewBox={`0 0 ${def.w} ${def.h}`} role="img" aria-label="Breadboard circuit with DC supply, resistors and removable links">
              {/* Supply */}
              <rect x={10} y={50} width={130} height={200} rx={10} fill="#31414c" stroke="#4d5f6b" />
              <text x={75} y={72} textAnchor="middle" style={kitLabel}>
                DC SUPPLY
              </text>
              <rect x={26} y={84} width={98} height={34} rx={5} fill="#c8d7b4" />
              <text x={116} y={108} textAnchor="end" style={{fontFamily: 'var(--ifm-font-family-monospace)', fontSize: 18, fontWeight: 600, fill: '#1d2618'}}>
                {power ? `${volts.toFixed(1)} V` : ''}
              </text>
              <g
                className={styles.clickable}
                role="button"
                tabIndex={0}
                aria-label={power ? 'Supply on. Switch off' : 'Supply off. Switch on'}
                onClick={() => (setPower((p) => !p), setNote(null))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setPower((p) => !p);
                  }
                }}>
                <rect x={30} y={140} width={90} height={40} rx={6} fill={power ? '#2f7d4a' : '#5b2b2b'} />
                <text x={75} y={165} textAnchor="middle" style={kitLabel}>
                  {power ? 'ON' : 'OFF'}
                </text>
              </g>
              <path className={styles.wire} d={def.wires} fill="none" />
              {flowing && <path className={styles.flow} d={def.wires} fill="none" style={{animationDuration: '2s'}} />}
              {def.parts.map((p) => {
                if (p.kind === 'R') {
                  return (
                    <g key={p.id}>
                      <g transform={p.vertical ? `rotate(90 ${p.x} ${p.y})` : undefined}>
                        <AxialResistor cx={p.x} cy={p.y} len={44} dia={14} lead={14} bands={bandsFor(nominal[p.id], 5, false)} />
                      </g>
                      <text x={p.vertical ? p.x + 14 : p.x} y={p.vertical ? p.y + 4 : p.y - 14} textAnchor={p.vertical ? 'start' : 'middle'} style={kitLabel}>
                        {p.id}
                      </text>
                    </g>
                  );
                }
                const fitted = linkIn(p.id);
                const sa = p.vertical ? {x: p.x, y: p.y - 14} : {x: p.x - 14, y: p.y};
                const sb = p.vertical ? {x: p.x, y: p.y + 14} : {x: p.x + 14, y: p.y};
                return (
                  <g key={p.id}>
                    <g
                      className={styles.clickable}
                      role="button"
                      tabIndex={0}
                      aria-label={`Link ${p.id}: ${fitted ? 'fitted. Remove' : 'removed. Fit'}`}
                      onClick={() => toggleLink(p.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleLink(p.id);
                        }
                      }}>
                      <rect x={p.x - 24} y={p.y - 24} width={48} height={48} fill="transparent" />
                      {fitted && <path d={`M${sa.x} ${sa.y} ${p.vertical ? `Q${p.x + 16} ${p.y}` : `Q${p.x} ${p.y - 16}`} ${sb.x} ${sb.y}`} stroke="#2b5fd1" strokeWidth={4} fill="none" strokeLinecap="round" />}
                    </g>
                    <text x={p.vertical ? p.x + 16 : p.x} y={p.vertical ? p.y + 4 : p.y + 22} textAnchor={p.vertical ? 'start' : 'middle'} style={{...kitLabel, fill: '#8fb4ff'}}>
                      {p.id}
                    </text>
                    <ProbePoint id={`${p.a}@${p.id}`} x={sa.x} y={sa.y} probes={probes} label={`Link ${p.id} socket 1`} r={4} />
                    <ProbePoint id={`${p.b}@${p.id}`} x={sb.x} y={sb.y} probes={probes} label={`Link ${p.id} socket 2`} r={4} />
                  </g>
                );
              })}
              <text x={SUPPLY_P.x - 12} y={SUPPLY_P.y + 4} textAnchor="end" style={kitLabel}>
                +
              </text>
              <text x={SUPPLY_N.x - 12} y={SUPPLY_N.y + 4} textAnchor="end" style={kitLabel}>
                −
              </text>
              <ProbePoint id="P@sup" x={SUPPLY_P.x} y={SUPPLY_P.y} probes={probes} label="Supply + terminal" r={5} />
              <ProbePoint id="N@sup" x={SUPPLY_N.x} y={SUPPLY_N.y} probes={probes} label="Supply − terminal" r={5} />
              {def.pads.map((p, k) => (
                <ProbePoint key={k} id={`${p.node}@pad${k}`} x={p.x} y={p.y} probes={probes} label={p.label} r={4} />
              ))}
            </svg>
          </div>
          <ProbeBar probes={probes} hint="Tap a blue link to pull or fit it." />
        </div>
        <div style={{display: 'grid', gap: '0.6rem', alignContent: 'start'}}>
          <div className={clsx(styles.card, styles.noPrint)}>
            <Knob label="SUPPLY VOLTS" value={`${volts.toFixed(1)} V`} onDec={() => setVolts((x) => Math.max(1, x - 0.5))} onInc={() => setVolts((x) => Math.min(12, x + 0.5))} />
          </div>
          <Multimeter
            name="Digital multimeter"
            fn={fn}
            functions={NET_FNS}
            text={text}
            unit={unit}
            placement={current()?.label}
            onFunction={(f) => (setNote(null), setFn(f))}
            fault={fuse ? null : 'Fuse blown'}
            repairLabel="Replace fuse"
            onRepair={() => (setFuse(true), setNote(null))}
          />
          <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} onClick={noteIt}>
            Note reading
          </button>
        </div>
      </div>
      <NoteBox note={note} />
    </>
  );

  return {view, records, setRecords, truth, volts, power};
}

export function valueList(nominal: Record<string, number>): string {
  return Object.entries(nominal)
    .map(([k, v]) => `${k} = ${fmtOhms(v)}`)
    .join(', ');
}
