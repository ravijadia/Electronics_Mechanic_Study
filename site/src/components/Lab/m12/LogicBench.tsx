import React from 'react';
import clsx from 'clsx';
import useStoredState from '../useStoredState';
import {netsOf, useWiring, type Terminal} from '../m07/Wiring';
import {kitLabel} from '../m07/parts';
import {evalBoard, GATE_ICS, pinId, type Bit, type PlacedIc} from './logic';
import styles from '../styles.module.css';

const PITCH = 18;
const STUB = 16;

/** Pin tip coordinate for a DIP package drawn with its top-left at (x, y). */
export function pinXY(type: string, x: number, y: number, pin: number): {x: number; y: number} {
  const n = GATE_ICS[type].pins;
  const half = n / 2;
  const left = pin <= half;
  const i = left ? pin - 1 : n - pin;
  const py = y + 10 + i * PITCH;
  return {x: left ? x - STUB : x + 80 + STUB, y: py};
}

/** Static body of a gate IC: outline, notch, pin stubs and numbers. Power pins are tied to the rails with fixed lines, not wired by the trainee. */
export function DipBody({id, type, x, y, vccY, gndY, name}: {id: string; type: string; x: number; y: number; vccY: number; gndY: number; name?: string}): React.JSX.Element {
  const t = GATE_ICS[type];
  const n = t.pins;
  const half = n / 2;
  const h = (half - 1) * PITCH + 20;
  return (
    <g>
      <rect x={x} y={y} width={80} height={h} rx={4} fill="#1c2024" stroke="#565d63" strokeWidth={1.5} />
      <path d={`M${x + 30} ${y} A10 10 0 0 0 ${x + 50} ${y}`} fill="#1c2024" stroke="#565d63" strokeWidth={1.5} />
      <text x={x + 40} y={y + h / 2 + 4} textAnchor="middle" style={{...kitLabel, fill: '#e9eef0'}}>
        {name ?? t.name}
      </text>
      {Array.from({length: n}, (_, k) => k + 1).map((p) => {
        const {x: px, y: py} = pinXY(type, x, y, p);
        const left = p <= half;
        const isPower = p === t.vcc || p === t.gnd;
        return (
          <g key={p}>
            <line x1={left ? x : x + 80} y1={py} x2={px} y2={py} stroke="#9aa3a8" strokeWidth={2} />
            <text x={px + (left ? -4 : 4)} y={py - 5} textAnchor={left ? 'end' : 'start'} style={{...kitLabel, fontSize: 8}}>
              {p}
            </text>
            {isPower && <circle cx={px} cy={py} r={3} fill={p === t.vcc ? '#f2c230' : '#6b7a84'} />}
            {isPower && <line x1={px} y1={py} x2={px} y2={p === t.vcc ? vccY : gndY} stroke={p === t.vcc ? '#f2c230' : '#6b7a84'} strokeWidth={1.5} strokeDasharray="2 2" />}
          </g>
        );
      })}
      <text x={x + 40} y={y - 6} textAnchor="middle" style={{...kitLabel, fontSize: 9, fill: '#8fb4ff'}}>
        {id}
      </text>
    </g>
  );
}

/** Terminal entries for an IC's signal (non-power) pins, for the wiring board. */
export function dipTerminals(id: string, type: string, x: number, y: number): Terminal[] {
  const t = GATE_ICS[type];
  const out: Terminal[] = [];
  for (let p = 1; p <= t.pins; p++) {
    if (p === t.vcc || p === t.gnd) continue;
    const {x: px, y: py} = pinXY(type, x, y, p);
    out.push({id: pinId(id, p), x: px, y: py, label: `${id} pin ${p}`, tagSide: p <= t.pins / 2 ? 'l' : 'r'});
  }
  return out;
}

export interface SwitchSpec {
  id: string;
  x: number;
  y: number;
  label: string;
}
export interface LedSpec {
  id: string;
  x: number;
  y: number;
  label: string;
}

/** A tap toggle switch: HIGH (+5V rail) or LOW (0V rail). */
function SwitchBody({sw, on, onToggle}: {sw: SwitchSpec; on: boolean; onToggle: () => void}): React.JSX.Element {
  return (
    <g>
      <text x={sw.x} y={sw.y - 24} textAnchor="middle" style={kitLabel}>
        {sw.label}
      </text>
      <g
        className={clsx(styles.clickable, styles.noPrint)}
        role="button"
        tabIndex={0}
        aria-label={`${sw.label}: ${on ? 'HIGH. Switch to LOW' : 'LOW. Switch to HIGH'}`}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}>
        <rect x={sw.x - 16} y={sw.y - 14} width={32} height={28} rx={5} fill={on ? '#2f7d4a' : '#5b2b2b'} />
        <text x={sw.x} y={sw.y + 4} textAnchor="middle" style={{...kitLabel, fontSize: 12}}>
          {on ? '1' : '0'}
        </text>
      </g>
      <line x1={sw.x} y1={sw.y + 14} x2={sw.x} y2={sw.y + 26} stroke="#9aa3a8" strokeWidth={2} />
    </g>
  );
}

function LedBody({led, on, bit}: {led: LedSpec; on: boolean; bit: Bit}): React.JSX.Element {
  return (
    <g>
      <text x={led.x} y={led.y - 22} textAnchor="middle" style={kitLabel}>
        {led.label}
      </text>
      {on && <circle cx={led.x} cy={led.y} r={18} fill="#ff5a4a" opacity={0.35} />}
      <circle cx={led.x} cy={led.y} r={9} fill={on ? '#ff5a4a' : bit == null ? '#3a3f45' : '#4a5560'} stroke="#9aa3a8" strokeWidth={1.5} />
      <line x1={led.x} y1={led.y + 9} x2={led.x} y2={led.y + 20} stroke="#9aa3a8" strokeWidth={2} />
    </g>
  );
}

export interface IcSpec {
  id: string;
  type: string;
  x: number;
  y: number;
  /** Override the printed chip name, e.g. to hide its identity for an IC-tester practical. */
  name?: string;
}

export interface LogicBoard {
  switchVal: (id: string) => boolean;
  toggleSwitch: (id: string) => void;
  bit: (id: string) => Bit;
  wires: ReturnType<typeof useWiring>['wires'];
  clearWires: () => void;
  layer: React.JSX.Element;
  bar: React.JSX.Element;
}

/**
 * Wiring board for one or more gate ICs: switches drive HIGH/LOW, the
 * trainee wires them (and IC outputs) to IC inputs and to LEDs.
 */
export function useLogicBoard({
  storeKey,
  ics,
  switches,
  leds,
  vccY = 40,
  gndY = 260,
  locked,
  dead,
}: {
  storeKey: string;
  ics: IcSpec[];
  switches: SwitchSpec[];
  leds: LedSpec[];
  vccY?: number;
  gndY?: number;
  locked?: boolean;
  /** Supply out of range: every driven output reads LOW. */
  dead?: boolean;
}): LogicBoard & {view: (w: number, h: number) => React.JSX.Element} {
  const [sw, setSw] = useStoredState<Record<string, boolean>>(`lab:${storeKey}:sw`, {});
  const terminals: Terminal[] = [
    ...switches.map((s): Terminal => ({id: `SW.${s.id}`, x: s.x, y: s.y + 26, label: s.label})),
    ...leds.map((l): Terminal => ({id: `LED.${l.id}`, x: l.x, y: l.y + 20, label: l.label})),
    ...ics.flatMap((ic) => dipTerminals(ic.id, ic.type, ic.x, ic.y)),
  ];
  const w = useWiring(storeKey, terminals, !!locked, () => {});
  const net = netsOf(w.wires);
  const placed: PlacedIc[] = ics.map((ic) => ({id: ic.id, type: ic.type}));
  const seed: Record<string, Bit> = {};
  for (const s of switches) seed[net(`SW.${s.id}`)] = sw[s.id] ?? false;
  const known = evalBoard(placed, net, seed);
  const bit = (id: string): Bit => {
    const v = known[net(id)] ?? null;
    return dead && v != null ? false : v;
  };

  const view = (w2: number, h2: number) => (
    <svg viewBox={`0 0 ${w2} ${h2}`} role="img" aria-label="Logic gate wiring board with switches, ICs and LEDs">
      <line x1={20} y1={vccY} x2={w2 - 20} y2={vccY} stroke="#f2c230" strokeWidth={2} />
      <text x={24} y={vccY - 8} style={kitLabel}>
        +5 V
      </text>
      <line x1={20} y1={gndY} x2={w2 - 20} y2={gndY} stroke="#6b7a84" strokeWidth={2} />
      <text x={24} y={gndY + 16} style={kitLabel}>
        0 V
      </text>
      {ics.map((ic) => (
        <DipBody key={ic.id} id={ic.id} type={ic.type} x={ic.x} y={ic.y} vccY={vccY} gndY={gndY} name={ic.name} />
      ))}
      {switches.map((s) => (
        <SwitchBody key={s.id} sw={s} on={sw[s.id] ?? false} onToggle={() => setSw((x) => ({...x, [s.id]: !(x[s.id] ?? false)}))} />
      ))}
      {leds.map((l) => (
        <LedBody key={l.id} led={l} on={bit(`LED.${l.id}`) === true} bit={bit(`LED.${l.id}`)} />
      ))}
      {w.layer}
    </svg>
  );

  return {
    switchVal: (id) => sw[id] ?? false,
    toggleSwitch: (id) => setSw((x) => ({...x, [id]: !(x[id] ?? false)})),
    bit,
    wires: w.wires,
    clearWires: () => w.setWires([]),
    layer: w.layer,
    bar: w.bar,
    view,
  };
}
