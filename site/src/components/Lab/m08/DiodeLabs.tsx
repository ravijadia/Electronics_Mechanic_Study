import React, {useEffect, useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import {GU_1_8_67, GU_1_8_68, GU_1_8_69, GU_1_8_74} from './gu';
import Multimeter from '../Multimeter';
import XYGraph from '../XYGraph';
import useStoredState from '../useStoredState';
import {ProbeBar, ProbePoint, useProbes} from '../Probes';
import {Knob} from '../Scope';
import {Empty, NoteBox, ResetKit, Section, Table, Verdict, shuffle, useKitSeed, useRng, type Note} from '../kit';
import {PartGrid} from '../m07/IdentifyLabs';
import type {PartKind} from '../m07/art';
import {kitLabel, near} from '../m07/parts';
import {GE, SI, SIGNAL, solveSeries, vForward, zener, type DiodeSpec} from './diode';
import styles from '../styles.module.css';

const num = (s?: string) => (s && s.trim() !== '' && !Number.isNaN(Number(s)) ? Number(s) : null);
const sel = (label: string, value: string | undefined, options: [string, string][], onChange: (v: string) => void) => (
  <select className={styles.select} aria-label={label} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
    <option value="">Choose…</option>
    {options.map(([v, t]) => (
      <option key={v} value={v}>
        {t}
      </option>
    ))}
  </select>
);
const inp = (label: string, value: string | undefined, onChange: (v: string) => void, w = '5.5rem') => (
  <input className={styles.input} style={{maxWidth: w}} inputMode="decimal" aria-label={label} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
);

/** Axial diode drawn horizontally at (cx, cy); the band marks the cathode. */
export function DiodeBody({cx, cy, cathodeRight, glass, mark, burnt}: {cx: number; cy: number; cathodeRight: boolean; glass?: boolean; mark?: string; burnt?: boolean}) {
  const w = glass ? 36 : 48;
  const h = glass ? 14 : 20;
  const bx = cathodeRight ? cx + w / 2 - 9 : cx - w / 2 + 4;
  return (
    <g>
      <line x1={cx - 70} y1={cy} x2={cx + 70} y2={cy} stroke="#a9b1b6" strokeWidth={2} />
      <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={glass ? 6 : 3} fill={burnt ? '#3a2416' : glass ? '#e98f3c' : '#1e1e1e'} opacity={glass ? 0.85 : 1} />
      <rect x={bx} y={cy - h / 2} width={5} height={h} fill={glass ? '#222' : '#cfd4d7'} />
      {mark && (
        <text x={cx} y={cy + h / 2 + 14} textAnchor="middle" style={{...kitLabel, fontSize: 10}}>
          {mark}
        </text>
      )}
    </g>
  );
}

// ---------------------------------------------------------------------------
// 1.8.67 Identify diodes, diode modules and their specifications
// ---------------------------------------------------------------------------

interface DItem {
  id: string;
  type: string;
  kind: PartKind;
  mark: string;
  amps: number;
  volts: number;
}
const DITEMS: DItem[] = [
  {id: '1N4007', type: 'rect', kind: 'diode', mark: '1N4007', amps: 1, volts: 1000},
  {id: '1N4148', type: 'signal', kind: 'signalDiode', mark: '1N4148', amps: 0.2, volts: 100},
  {id: '1N5819', type: 'schottky', kind: 'diode', mark: '1N5819', amps: 1, volts: 40},
  {id: 'BZX55C5V1', type: 'zener', kind: 'zener', mark: '5V1', amps: 0.09, volts: 5.1},
  {id: 'LED5R', type: 'led', kind: 'led', mark: '', amps: 0.02, volts: 5},
  {id: 'W10M', type: 'bridge', kind: 'bridgeRound', mark: 'W10M', amps: 1.5, volts: 1000},
  {id: 'KBPC3510', type: 'bridge', kind: 'bridgeSquare', mark: 'KBPC3510', amps: 35, volts: 1000},
  {id: '70HF100', type: 'stud', kind: 'stud', mark: '70HF100', amps: 70, volts: 1000},
];
const DATABOOK: [string, string, string, string][] = [
  ['1N4001', 'Rectifier diode', '1', '50'],
  ['1N4007', 'Rectifier diode', '1', '1000'],
  ['1N5408', 'Rectifier diode', '3', '1000'],
  ['1N4148', 'Switching (signal) diode', '0.2', '100'],
  ['1N5819', 'Schottky diode', '1', '40'],
  ['BZX55C5V1 (marked 5V1)', 'Zener diode, 0.5 W', '0.09 (IZM)', '5.1 (VZ)'],
  ['BZX55C12 (marked 12)', 'Zener diode, 0.5 W', '0.04 (IZM)', '12 (VZ)'],
  ['5 mm red LED', 'LED', '0.02', '5 (VR)'],
  ['W10M', 'Bridge rectifier, round', '1.5', '1000'],
  ['KBPC3510', 'Bridge rectifier module', '35', '1000'],
  ['70HF100', 'Stud-mounted power diode', '70', '1000'],
];
const TYPES: [string, string][] = [
  ['rect', 'Rectifier diode'],
  ['signal', 'Switching (signal) diode'],
  ['schottky', 'Schottky diode'],
  ['zener', 'Zener diode'],
  ['led', 'LED'],
  ['bridge', 'Bridge rectifier module'],
  ['stud', 'Stud-mounted power diode'],
];

export function DiodeTypesLab(): React.JSX.Element {
  const KEY = '1.8.67';
  const [seed, newKit] = useKitSeed(KEY);
  const items = useRng(seed, (rnd) => shuffle(DITEMS, rnd));
  const [ans, setAns] = useStoredState<Record<number, {type?: string; a?: string; v?: string}>>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const set = (k: number, p: object) => setAns((x) => ({...x, [k]: {...x[k], ...p}}));
  const ok = (k: number) => ans[k]?.type === items[k].type && near(num(ans[k]?.a), items[k].amps, 0.001) && near(num(ans[k]?.v), items[k].volts, 0.001);

  return (
    <PracticalSheet
      number={KEY}
      title="Identify Types of Diodes, Diode Modules and Their Specifications"
      aim="To identify different diodes and diode modules by their appearance and type number, and find their current and voltage ratings from a data book."
      apparatus={['Eight diodes and diode modules (below)', 'Diode data book']}
      procedure={['Read the type number printed on each part.', 'Name its type from its shape and marking.', 'Look it up in the data book: write the maximum current and the maximum (reverse) voltage.']}
      precautions={['Never use a diode above its rated current or reverse voltage (PIV).', 'Mount stud diodes and bridge modules on a heat sink.']}
      viva={[
        {q: 'What is PIV?', a: 'Peak inverse voltage: the highest reverse voltage a diode can withstand without breaking down.'},
        {q: 'Why use a Schottky diode?', a: 'Low forward drop (about 0.3 V) and very fast switching, e.g. in SMPS outputs.'},
        {q: 'How do you find + on a bridge module?', a: 'It is marked + (often with a longer lead or a chamfered corner). The two ~ terminals take the AC.'},
        {q: 'What is the difference between 1N4001 and 1N4007?', a: 'Both are 1 A rectifiers; the PIV is 50 V for 1N4001 and 1000 V for 1N4007.'},
      ]}
      steps={[
        {
          label: `Pick the type of each part in the table. Correct: ${items.filter((it, k) => ans[k]?.type === it.type).length}/8`,
          hint: 'Use the shape and the printed marking.',
          done: items.every((it, k) => ans[k]?.type === it.type),
        },
        {
          label: `Write the maximum current and voltage of each part. Correct: ${items.filter((_, k) => ok(k)).length}/8`,
          hint: 'Open the data book under the tray and look up the type number.',
          done: items.every((_, k) => ok(k)),
        },
        {label: 'Enter your details and press Print / Save as PDF.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_8_67}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Component tray">
        <PartGrid parts={items.map((it) => ({kind: it.kind, o: {mark: it.mark || undefined}}))} label="Eight diodes and diode modules, numbered" />
        <details style={{marginTop: '0.6rem'}}>
          <summary className={styles.muted} style={{cursor: 'pointer'}}>
            Data book (extract)
          </summary>
          <Table head={['Type no.', 'Description', 'Max current (A)', 'Max voltage (V)']} rows={DATABOOK} />
        </details>
      </Section>
      <Section title="Observation table">
        <Table
          head={['No.', 'Marking', 'Type', 'Max current (A)', 'Max voltage (V)', 'Check']}
          rows={items.map((it, k) => [
            k + 1,
            <span className={styles.num}>{it.mark || '(none)'}</span>,
            sel(`Part ${k + 1} type`, ans[k]?.type, TYPES, (v) => set(k, {type: v})),
            inp(`Part ${k + 1} maximum current`, ans[k]?.a, (v) => set(k, {a: v})),
            inp(`Part ${k + 1} maximum voltage`, ans[k]?.v, (v) => set(k, {v: v})),
            ans[k]?.type && ans[k]?.a && ans[k]?.v ? <Verdict ok={ok(k)} /> : '–',
          ])}
        />
        <ResetKit
          onReset={() => {
            setAns({});
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// 1.8.68 Test diodes with a multimeter; forward / reverse resistance ratio
// ---------------------------------------------------------------------------

type Cond = 'good' | 'short' | 'open';
interface TDiode {
  spec: DiodeSpec;
  mat: 'si' | 'ge';
  cond: Cond;
  cathodeRight: boolean;
  mark: string;
}
const TEST_FNS = [
  {fn: 'off', label: 'OFF'},
  {fn: 'diode', label: '→| Diode'},
  {fn: 'r2k', label: 'Ω 2k'},
  {fn: 'r200k', label: 'Ω 200k'},
  {fn: 'r2M', label: 'Ω 2M'},
];
const OHM_FS: Record<string, number> = {r2k: 2e3, r200k: 2e5, r2M: 2e6};

/** What a DMM shows for a diode. `fwd`: red probe on the anode. */
function testReading(d: TDiode, fn: string, fwd: boolean): {text: string; ohms: number | null} {
  if (fn === 'off') return {text: '', ohms: null};
  if (d.cond === 'open') return {text: 'OL', ohms: null};
  if (d.cond === 'short') return fn === 'diode' ? {text: '0.003', ohms: 0} : {text: fn === 'r2k' ? '0.001' : fn === 'r200k' ? '00.0' : '0.000', ohms: 0.6};
  if (fn === 'diode') return fwd ? {text: vForward(d.spec, 1e-3).toFixed(3), ohms: null} : {text: 'OL', ohms: null};
  // Ohmmeter: 3 V source behind half the full-scale resistance.
  const fs = OHM_FS[fn];
  const r = fwd ? (() => {
    const s = solveSeries(d.spec, 3, fs / 2);
    return s.vd / s.i;
  })() : d.spec.rrev;
  if (r >= fs) return {text: 'OL', ohms: null};
  const text = fn === 'r2k' ? (r / 1e3).toFixed(3) : fn === 'r200k' ? (r / 1e3).toFixed(1) : (r / 1e6).toFixed(3);
  return {text, ohms: r};
}

interface TAns {
  vf?: string;
  rf?: string;
  rr?: string;
  ratio?: string;
  mat?: string;
  cond?: string;
}

export function DiodeTestLab(): React.JSX.Element {
  const KEY = '1.8.68';
  const [seed, newKit] = useKitSeed(KEY);
  const kit = useRng(seed, (rnd) =>
    shuffle<Omit<TDiode, 'cathodeRight'>>(
      [
        {spec: SI, mat: 'si', cond: 'good', mark: '1N4007'},
        {spec: GE, mat: 'ge', cond: 'good', mark: 'OA79'},
        {spec: SI, mat: 'si', cond: rnd() < 0.5 ? 'short' : 'open', mark: '1N4007'},
        {spec: SIGNAL, mat: 'si', cond: 'good', mark: '1N4148'},
      ],
      rnd,
    ).map((d) => ({...d, cathodeRight: rnd() < 0.5})),
  );
  const [ans, setAns] = useStoredState<Record<number, TAns>>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [fn, setFn] = useState('off');
  const [note, setNote] = useState<Note>(null);
  const probes = useProbes();
  const set = (k: number, p: TAns) => setAns((x) => ({...x, [k]: {...x[k], ...p}}));

  const [ri, rt] = (probes.red ?? ':').split(':');
  const [bi, bt] = (probes.black ?? ':').split(':');
  const on = ri && ri === bi && rt !== bt ? Number(ri) : null;
  const d = on != null ? kit[on] : null;
  // Is the red probe on the anode (the end without the band)?
  const fwdOnRed = d ? (d.cathodeRight ? rt === 'L' : rt === 'R') : false;
  const r = d ? testReading(d, fn, fwdOnRed) : {text: fn === 'off' ? '' : 'OL', ohms: null};
  const unit = fn === 'diode' ? 'V' : fn === 'r2k' || fn === 'r200k' ? 'kΩ' : fn === 'r2M' ? 'MΩ' : '';

  const noteIt = () => {
    if (on == null || !d) return setNote({kind: 'warn', text: 'Probes on both leads of one diode.'});
    if (fn === 'off') return setNote({kind: 'warn', text: 'Select a function.'});
    const val = r.text === 'OL' ? 'OL' : `${r.text} ${unit}`;
    if (fn === 'diode') {
      if (fwdOnRed) set(on, {vf: val});
      return setNote({kind: 'good', text: `D${on + 1} ${fwdOnRed ? 'forward' : 'reverse'}: ${val}`});
    }
    set(on, fwdOnRed ? {rf: val} : {rr: val});
    setNote({kind: 'good', text: `D${on + 1} ${fwdOnRed ? 'Rf' : 'Rr'} = ${val}`});
  };

  const parseR = (s?: string) => {
    if (!s) return null;
    if (s === 'OL') return Infinity;
    const [v, u] = s.split(' ');
    return Number(v) * (u === 'MΩ' ? 1e6 : u === 'kΩ' ? 1e3 : 1);
  };
  const ratioOk = (k: number) => {
    const a = ans[k] ?? {};
    const rf = parseR(a.rf);
    const rr = parseR(a.rr);
    if (rf == null || rr == null || !a.ratio) return null;
    if (!isFinite(rf)) return /^(-|–|na|n\/a)$/i.test(a.ratio.trim());
    if (!isFinite(rr)) return /^(∞|inf|infinite|ol|very high)$/i.test(a.ratio.trim());
    if (rf === 0 || rf < 1) return /^(1|-|–)$/i.test(a.ratio.trim());
    return near(num(a.ratio), rr / rf, 0.03);
  };
  const rowOk = (k: number) => ans[k]?.mat === kit[k].mat && ans[k]?.cond === kit[k].cond && !!ratioOk(k);

  return (
    <PracticalSheet
      number={KEY}
      title="Test Diodes with a Multimeter: Forward to Reverse Resistance Ratio"
      aim="To test diodes with a multimeter, find the forward and reverse resistance and their ratio, and decide whether each diode is good, shorted or open."
      apparatus={['Four diodes (silicon and germanium)', 'Digital multimeter with diode test and Ω ranges']}
      procedure={[
        'Diode test: red probe on the anode (plain end), black on the cathode (band). A good diode shows 0.5–0.7 V (Si) or 0.2–0.3 V (Ge).',
        'Reverse the probes: a good diode shows OL.',
        'On an Ω range note the forward resistance Rf and the reverse resistance Rr.',
        'Ratio = Rr ÷ Rf. Write “∞” if Rr is OL.',
        'Low both ways = shorted. OL both ways = open.',
      ]}
      precautions={['Test diodes out of circuit.', 'Use the same Ω range for Rf and Rr when you take a ratio.', 'A diode’s “resistance” changes with the meter range: it is not a resistor.']}
      viva={[
        {q: 'Why does a diode read different Rf on different ranges?', a: 'Each range passes a different test current, and a diode’s V/I ratio changes with current.'},
        {q: 'What ratio does a good diode have?', a: 'Very high: Rr is many thousands of times Rf (often OL).'},
        {q: 'How do you tell Si from Ge with the meter?', a: 'Forward drop: about 0.6 V for silicon, 0.25 V for germanium.'},
        {q: 'What does the band on a diode mark?', a: 'The cathode (K).'},
      ]}
      steps={[
        {
          label: `Select Diode test and note the forward Vf of each diode. Done: ${kit.filter((_, k) => !!ans[k]?.vf).length}/4`,
          hint: 'Red probe on the plain end, black on the band. Press Note reading.',
          done: kit.every((_, k) => !!ans[k]?.vf),
        },
        {
          label: `Select an Ω range and note Rf and Rr of each diode. Done: ${kit.filter((_, k) => !!ans[k]?.rf && !!ans[k]?.rr).length}/4`,
          hint: 'Same range for both. Swap the probes for Rr.',
          done: kit.every((_, k) => !!ans[k]?.rf && !!ans[k]?.rr),
        },
        {
          label: `Fill in Rr ÷ Rf, material and condition of each diode. Correct: ${kit.filter((_, k) => rowOk(k)).length}/4`,
          hint: 'Write ∞ if Rr is OL, – if Rf is OL. Low both ways = shorted.',
          done: kit.every((_, k) => rowOk(k)),
        },
        {label: 'Enter your details and press Print / Save as PDF.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_8_68}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div>
            <div className={styles.kit}>
              <svg viewBox="0 0 560 240" role="img" aria-label="Four diodes with test points on both leads">
                {kit.map((dd, k) => {
                  const cx = (k % 2) * 280 + 140;
                  const cy = Math.floor(k / 2) * 120 + 60;
                  return (
                    <g key={k}>
                      <text x={cx - 120} y={cy - 26} style={kitLabel}>
                        D{k + 1}
                      </text>
                      <DiodeBody cx={cx} cy={cy} cathodeRight={dd.cathodeRight} glass={dd.mark === '1N4148' || dd.mark === 'OA79'} mark={dd.mark} />
                      <ProbePoint id={`${k}:L`} x={cx - 70} y={cy} probes={probes} label={`D${k + 1} left lead`} r={5} />
                      <ProbePoint id={`${k}:R`} x={cx + 70} y={cy} probes={probes} label={`D${k + 1} right lead`} r={5} />
                    </g>
                  );
                })}
              </svg>
            </div>
            <ProbeBar probes={probes} />
          </div>
          <div style={{display: 'grid', gap: '0.6rem', alignContent: 'start'}}>
            <Multimeter name="Digital multimeter" fn={fn} functions={TEST_FNS} text={r.text} unit={r.text === 'OL' ? '' : unit} placement={on != null ? `D${on + 1}` : undefined} onFunction={(f) => (setNote(null), setFn(f))} />
            <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} onClick={noteIt}>
              Note reading
            </button>
          </div>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        <Table
          head={['Diode', 'Vf (diode test)', 'Rf', 'Rr', 'Rr ÷ Rf', 'Material', 'Condition', 'Check']}
          rows={kit.map((dd, k) => {
            const a = ans[k] ?? {};
            return [
              `D${k + 1}`,
              <span className={styles.num}>{a.vf ?? '–'}</span>,
              <span className={styles.num}>{a.rf ?? '–'}</span>,
              <span className={styles.num}>{a.rr ?? '–'}</span>,
              <input className={styles.input} style={{maxWidth: '5rem'}} aria-label={`D${k + 1} ratio`} value={a.ratio ?? ''} onChange={(e) => set(k, {ratio: e.target.value})} />,
              sel(
                `D${k + 1} material`,
                a.mat,
                [
                  ['si', 'Silicon'],
                  ['ge', 'Germanium'],
                ],
                (v) => set(k, {mat: v}),
              ),
              sel(
                `D${k + 1} condition`,
                a.cond,
                [
                  ['good', 'Good'],
                  ['short', 'Shorted'],
                  ['open', 'Open'],
                ],
                (v) => set(k, {cond: v}),
              ),
              a.mat && a.cond && a.ratio ? <Verdict ok={rowOk(k)} /> : '–',
            ];
          })}
        />
        <p className={styles.muted}>Ratio: a number, “∞” if Rr is OL, “–” if Rf is OL.</p>
        <ResetKit
          onReset={() => {
            setAns({});
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// Shared series bench: supply → R → device, V across device, I in series.
// ---------------------------------------------------------------------------

interface BenchOpts {
  spec: DiodeSpec;
  /** Series resistor (Ω); 0 = link (no resistor). */
  r: number;
  /** Device turned so the supply reverse-biases it. */
  reverse: boolean;
  vmax: number;
  label: string;
}

const V_FNS = [
  {fn: 'off', label: 'OFF'},
  {fn: 'V2', label: 'DC V 2'},
  {fn: 'V20', label: 'DC V 20'},
];
const I_FNS = [
  {fn: 'off', label: 'OFF'},
  {fn: 'uA200', label: 'DC µA 200'},
  {fn: 'mA20', label: 'DC mA 20'},
  {fn: 'mA200', label: 'DC mA 200'},
];

function vText(fn: string, v: number) {
  if (fn === 'off') return '';
  const fs = fn === 'V2' ? 2 : 20;
  return Math.abs(v) >= fs ? 'OL' : v.toFixed(fn === 'V2' ? 3 : 2);
}
function iText(fn: string, i: number) {
  if (fn === 'off') return '';
  const [scale, fs, dp] = fn === 'uA200' ? [1e6, 200, 1] : fn === 'mA20' ? [1e3, 20, 2] : [1e3, 200, 1];
  return Math.abs(i * scale) >= fs ? 'OL' : (i * scale).toFixed(dp);
}

function useDiodeBench(o: BenchOpts, onBurn: () => void) {
  const [vs, setVs] = useState(0);
  const [power, setPower] = useState(false);
  const [vfn, setVfn] = useState('off');
  const [ifn, setIfn] = useState('off');
  const s = power ? solveSeries(o.spec, o.reverse ? -vs : vs, Math.max(o.r, 0.05) + 0.2) : {i: 0, vd: 0};
  // Meters read + on the supply side; s.vd and s.i are referred to the anode.
  const vd = s.vd;
  const i = s.i;
  const burn = Math.abs(i) > o.spec.imax;
  useEffect(() => {
    if (burn) {
      setPower(false);
      onBurn();
    }
  }, [burn]); // eslint-disable-line react-hooks/exhaustive-deps
  const vt = vText(vfn, o.reverse ? -vd : vd);
  const it = iText(ifn, o.reverse ? -i : i);
  const view = (burnt: boolean) => (
    <div className={styles.controls} style={{marginTop: 0}}>
      <div className={styles.kit}>
        <svg viewBox="0 0 520 230" role="img" aria-label={`DC supply, series ${o.r ? `${o.r} Ω resistor` : 'link'}, ammeter, ${o.label} ${o.reverse ? 'reverse' : 'forward'} biased, voltmeter across it`}>
          <rect x={14} y={60} width={110} height={120} rx={8} fill="#31414c" stroke="#4d5f6b" />
          <text x={69} y={86} textAnchor="middle" style={kitLabel}>
            DC 0–{o.vmax} V
          </text>
          <rect x={28} y={96} width={82} height={30} rx={4} fill="#c8d7b4" />
          <text x={104} y={117} textAnchor="end" style={{fontFamily: 'var(--ifm-font-family-monospace)', fontSize: 16, fontWeight: 600, fill: '#1d2618'}}>
            {power ? vs.toFixed(1) : ''}
          </text>
          <text x={69} y={160} textAnchor="middle" style={{...kitLabel, fill: power ? '#4cd964' : '#c8352a'}}>
            {power ? 'ON' : 'OFF'}
          </text>
          <path className={styles.wire} d="M124 90 H170 M230 90 H290 M330 90 H400 V100 M400 160 V200 H70 V180" fill="none" />
          {o.r ? <rect x={170} y={80} width={60} height={20} rx={4} fill="#e8d7b0" /> : <path d="M170 90 Q200 70 230 90" stroke="#2b5fd1" strokeWidth={4} fill="none" />}
          <text x={200} y={72} textAnchor="middle" style={kitLabel}>
            {o.r ? `R ${o.r >= 1000 ? `${o.r / 1000}k` : o.r} Ω` : 'link'}
          </text>
          <circle cx={310} cy={90} r={18} fill="#f2c230" stroke="#c99a10" strokeWidth={2} />
          <text x={310} y={96} textAnchor="middle" style={{fill: '#222', fontWeight: 800, fontSize: 14}}>
            A
          </text>
          <g transform="rotate(90 400 130)">
            <DiodeBody cx={400} cy={130} cathodeRight={!o.reverse} glass={o.spec !== SI} burnt={burnt} />
          </g>
          <text x={424} y={134} style={kitLabel}>
            {o.label}
          </text>
          <circle cx={470} cy={170} r={18} fill="#f2c230" stroke="#c99a10" strokeWidth={2} />
          <text x={470} y={176} textAnchor="middle" style={{fill: '#222', fontWeight: 800, fontSize: 14}}>
            V
          </text>
          <path d="M470 152 V96 H400 M470 188 V200 H400" stroke="#e9eef0" strokeWidth={1.4} strokeDasharray="3 2" fill="none" />
        </svg>
      </div>
      <div style={{display: 'grid', gap: '0.6rem', alignContent: 'start'}}>
        <div className={clsx(styles.card, styles.noPrint)}>
          <Knob label="SUPPLY" value={`${vs.toFixed(1)} V`} onDec={() => setVs((x) => Math.max(0, Math.round((x - (x <= 2 ? 0.1 : 0.5)) * 10) / 10))} onInc={() => setVs((x) => Math.min(o.vmax, Math.round((x + (x < 2 ? 0.1 : 0.5)) * 10) / 10))} />
          <button type="button" className={styles.btn} style={{marginTop: '0.4rem'}} onClick={() => setPower((p) => !p)}>
            Supply {power ? 'OFF' : 'ON'}
          </button>
        </div>
        <Multimeter name="Voltmeter (across device)" fn={vfn} functions={V_FNS} text={vt} unit={vfn === 'off' ? '' : 'V'} onFunction={setVfn} />
        <Multimeter name="Ammeter (in series)" fn={ifn} functions={I_FNS} text={it} unit={ifn === 'off' ? '' : ifn === 'uA200' ? 'µA' : 'mA'} onFunction={setIfn} />
      </div>
    </div>
  );
  return {vs, power, setPower, vt, it, vfn, ifn, vd: o.reverse ? -vd : vd, i: o.reverse ? -i : i, view};
}

// ---------------------------------------------------------------------------
// 1.8.69 Forward characteristics of a diode
// ---------------------------------------------------------------------------

interface VIPt {
  dev: 'si' | 'ge';
  rev: boolean;
  v: number;
  ima: number;
}

export function ForwardCharLab(): React.JSX.Element {
  const KEY = '1.8.69';
  const [, newKit] = useKitSeed(KEY);
  const [dev, setDev] = useState<'si' | 'ge'>('si');
  const [rev, setRev] = useState(false);
  const [r, setR] = useState(1000);
  const [burnt, setBurnt] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const [pts, setPts] = useStoredState<VIPt[]>(`lab:${KEY}:pts`, []);
  const [knee, setKnee] = useStoredState<{si?: string; ge?: string}>(`lab:${KEY}:knee`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const spec = burnt ? {...(dev === 'si' ? SI : GE), is: 0, rrev: Infinity} : dev === 'si' ? SI : GE;
  const b = useDiodeBench({spec, r, reverse: rev, vmax: 15, label: dev === 'si' ? '1N4007 (Si)' : 'OA79 (Ge)'}, () => {
    setBurnt(true);
    setNote({kind: 'bad', text: <b>Smoke! Too much current: the diode burnt open. Always use a series resistor.</b>});
  });

  const change = (f: () => void) => {
    if (b.power) return setNote({kind: 'warn', text: 'Switch the supply off before changing the circuit.'});
    setNote(null);
    f();
  };

  const noteIt = () => {
    if (!b.power) return setNote({kind: 'warn', text: 'Supply is off.'});
    if (b.vfn === 'off' || b.ifn === 'off') return setNote({kind: 'warn', text: 'Switch both meters on.'});
    if (b.vt === 'OL' || b.it === 'OL') return setNote({kind: 'warn', text: 'OL: change range.'});
    const v = Number(b.vt);
    const ima = b.ifn === 'uA200' ? Number(b.it) / 1000 : Number(b.it);
    setPts((p) => [...p.filter((x) => !(x.dev === dev && x.rev === rev && Math.abs(x.v - v) < 0.002)), {dev, rev, v, ima}]);
    setNote({kind: 'good', text: `${dev === 'si' ? 'Si' : 'Ge'} ${rev ? 'reverse' : 'forward'}: ${b.vt} V, ${b.it} ${b.ifn === 'uA200' ? 'µA' : 'mA'}`});
  };

  const fw = (d: 'si' | 'ge') => pts.filter((p) => p.dev === d && !p.rev).sort((a, c) => a.v - c.v);
  const rv = pts.filter((p) => p.rev).sort((a, c) => a.v - c.v);
  const kneeOk = (d: 'si' | 'ge') => {
    const s = d === 'si' ? SI : GE;
    const k = num(knee[d]);
    return k != null && k >= vForward(s, 0.5e-3) - 0.05 && k <= vForward(s, 10e-3) + 0.03;
  };
  const enough = (p: VIPt[]) => p.length >= 8 && p.some((x) => x.ima >= 10) && p.some((x) => x.ima < 0.5);

  return (
    <PracticalSheet
      number={KEY}
      title="Forward Characteristics of a Diode"
      aim="To measure the current through a diode for different forward voltages, plot its V–I characteristic and find the knee (cut-in) voltage, for silicon and germanium."
      apparatus={['DC supply 0–15 V', 'Diodes 1N4007 (Si), OA79 (Ge)', 'Resistor 1 kΩ, 100 Ω', 'Two digital multimeters']}
      procedure={[
        'Supply off. Connect supply → R → ammeter → diode (anode to +). Voltmeter across the diode.',
        'Raise the supply in small steps. Note the diode voltage V and current I each time.',
        'Take close steps between 0.1 V and 0.8 V of diode voltage.',
        'Turn the diode round (reverse bias) and note a few readings on the µA range.',
        'Plot I against V. The knee voltage is where the current starts rising sharply.',
      ]}
      precautions={['Always keep a series resistor to limit the current.', 'Do not exceed the rated forward current.', 'Switch off before turning the diode round.']}
      viva={[
        {q: 'What is the knee (cut-in) voltage?', a: 'The forward voltage above which current rises rapidly: about 0.6–0.7 V for Si, 0.2–0.3 V for Ge.'},
        {q: 'Why is a series resistor used?', a: 'Above the knee the diode current rises very fast. The resistor limits it so the diode does not burn.'},
        {q: 'Why is reverse current measured in µA?', a: 'It is only the tiny leakage of minority carriers.'},
        {q: 'Which has more reverse leakage, Si or Ge?', a: 'Germanium.'},
      ]}
      steps={[
        {
          label: `Silicon, forward bias: raise the supply in steps and press Note reading. Readings: ${fw('si').length}/8`,
          hint: 'Supply OFF to set up. Go up to 10 mA or more; small steps from 0.4 V to 0.8 V.',
          done: enough(fw('si')),
        },
        {
          label: `Switch OFF, select Ge OA79 and repeat. Readings: ${fw('ge').length}/8`,
          hint: 'Also go up to 10 mA or more, and take a few readings below 0.5 mA.',
          done: enough(fw('ge')),
        },
        {
          label: `Switch OFF, select Reverse bias and note 3 readings. Readings: ${Math.min(rv.length, 3)}/3`,
          hint: 'Use the DC µA 200 range on the ammeter.',
          done: rv.length >= 3,
        },
        {
          label: 'Read the knee voltage of Si and Ge from the graph and enter both in the Result table.',
          hint: 'Where the current starts to rise sharply.',
          done: kneeOk('si') && kneeOk('ge'),
        },
        {label: 'Enter your details and press Print / Save as PDF.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_8_69}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={clsx(styles.controls, styles.noPrint)} style={{marginTop: 0, marginBottom: '0.6rem'}}>
          <div className={styles.seg} role="group" aria-label="Circuit options">
            <button type="button" aria-pressed={dev === 'si'} onClick={() => change(() => setDev('si'))}>
              Si 1N4007
            </button>
            <button type="button" aria-pressed={dev === 'ge'} onClick={() => change(() => setDev('ge'))}>
              Ge OA79
            </button>
            <button type="button" aria-pressed={rev} onClick={() => change(() => setRev((x) => !x))}>
              {rev ? 'Reverse bias' : 'Forward bias'} ⇄
            </button>
          </div>
          <div className={styles.seg} role="group" aria-label="Series resistor">
            {[1000, 100, 0].map((x) => (
              <button key={x} type="button" aria-pressed={r === x} onClick={() => change(() => setR(x))}>
                {x ? `R ${x} Ω` : 'Link (no R)'}
              </button>
            ))}
            {burnt && (
              <button type="button" onClick={() => change(() => (setBurnt(false), setNote({kind: 'info', text: 'New diode fitted.'})))}>
                Replace diode
              </button>
            )}
          </div>
        </div>
        {b.view(burnt)}
        <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} style={{marginTop: '0.6rem'}} onClick={noteIt}>
          Note reading
        </button>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {pts.length === 0 ? (
          <Empty>No readings yet.</Empty>
        ) : (
          <div className={styles.twoCol}>
            <Table head={['Si forward V (V)', 'I (mA)']} rows={fw('si').map((p) => [p.v.toFixed(3), p.ima.toFixed(2)])} />
            <Table head={['Ge forward V (V)', 'I (mA)']} rows={fw('ge').map((p) => [p.v.toFixed(3), p.ima.toFixed(2)])} />
            {rv.length > 0 && <Table head={['Reverse V (V)', 'I (µA)', 'Diode']} rows={rv.map((p) => [p.v.toFixed(2), (p.ima * 1000).toFixed(1), p.dev === 'si' ? 'Si' : 'Ge'])} />}
          </div>
        )}
        {pts.some((p) => !p.rev) && (
          <XYGraph
            series={[
              {id: 'si', label: 'Si', color: 'var(--s1)', marker: 'circle', points: fw('si').map((p) => ({x: p.v, y: p.ima}))},
              {id: 'ge', label: 'Ge', color: 'var(--s2)', marker: 'square', points: fw('ge').map((p) => ({x: p.v, y: p.ima}))},
            ]}
            xLabel="Forward voltage (V)"
            yLabel="Forward current (mA)"
            xUnit="V"
            yUnit="mA"
          />
        )}
      </Section>
      <Section title="Result">
        <Table
          head={['', 'Knee voltage (V)', 'Check']}
          rows={(['si', 'ge'] as const).map((d) => [d === 'si' ? 'Silicon' : 'Germanium', inp(`${d} knee voltage`, knee[d], (v) => setKnee((k) => ({...k, [d]: v}))), knee[d] ? <Verdict ok={kneeOk(d)} /> : '–'])}
        />
        <ResetKit
          onReset={() => {
            setPts([]);
            setKnee({});
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// 1.8.74 Identify and test zener diodes
// ---------------------------------------------------------------------------

interface ZItem {
  mark: string;
  spec: DiodeSpec;
  vz: number | null;
}

export function ZenerTestLab(): React.JSX.Element {
  const KEY = '1.8.74';
  const [seed, newKit] = useKitSeed(KEY);
  const items = useRng(seed, (rnd) => {
    const z = (m: string, v: number): ZItem => {
      const vz = v * (1 + (rnd() * 2 - 1) * 0.04);
      return {mark: m, spec: zener(vz), vz};
    };
    return shuffle<ZItem>([z('5V1', 5.1), z('9V1', 9.1), z('12', 12), {mark: '1N4148', spec: SIGNAL, vz: null}], rnd);
  });
  const [pick, setPick] = useState(0);
  const [ans, setAns] = useStoredState<Record<number, {vz?: string; zen?: string}>>(`lab:${KEY}:ans`, {});
  const [tested, setTested] = useStoredState<Record<number, number>>(`lab:${KEY}:tested`, {});
  const [curve, setCurve] = useStoredState<{k: number; v: number; ima: number}[]>(`lab:${KEY}:curve`, []);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [burnt, setBurnt] = useState<number[]>([]);
  const [note, setNote] = useState<Note>(null);
  const it = items[pick];
  const spec = burnt.includes(pick) ? {...it.spec, is: 0, rrev: Infinity, vz: undefined} : it.spec;
  const b = useDiodeBench({spec, r: 1000, reverse: true, vmax: 20, label: it.mark}, () => {
    setBurnt((x) => [...x, pick]);
    setNote({kind: 'bad', text: <b>Smoke! Zener current above its rating.</b>});
  });

  const choose = (k: number) => {
    if (b.power) return setNote({kind: 'warn', text: 'Switch the supply off before changing the device.'});
    setNote(null);
    setPick(k);
  };

  const noteIt = () => {
    if (!b.power) return setNote({kind: 'warn', text: 'Supply is off.'});
    if (b.vfn === 'off' || b.ifn === 'off') return setNote({kind: 'warn', text: 'Switch both meters on.'});
    if (b.vt === 'OL' || b.it === 'OL') return setNote({kind: 'warn', text: 'OL: change range.'});
    const v = Math.abs(Number(b.vt));
    const ima = Math.abs(b.ifn === 'uA200' ? Number(b.it) / 1000 : Number(b.it));
    setTested((t) => ({...t, [pick]: Math.max(t[pick] ?? 0, b.vs)}));
    setCurve((c) => [...c.filter((x) => !(x.k === pick && Math.abs(x.v - v) < 0.005)), {k: pick, v, ima}]);
    setNote({kind: 'good', text: `Z${pick + 1}: ${v.toFixed(2)} V, ${ima.toFixed(2)} mA`});
  };

  const vzOk = (k: number) => {
    const a = ans[k] ?? {};
    const isZ = items[k].vz != null;
    if (a.zen !== (isZ ? 'yes' : 'no')) return false;
    return isZ ? near(num(a.vz), items[k].vz!, 0.03) : true;
  };
  const best = Object.entries(curve.reduce<Record<number, number>>((m, p) => ({...m, [p.k]: (m[p.k] ?? 0) + 1}), {})).find(([k, n]) => n >= 6 && items[Number(k)].vz != null);
  const curvePts = best ? curve.filter((p) => p.k === Number(best[0])).sort((a, c) => a.v - c.v) : [];

  return (
    <PracticalSheet
      number={KEY}
      title="Identify and Test Zener Diodes"
      aim="To tell zener diodes from ordinary diodes, measure their breakdown (zener) voltage in reverse bias and plot a reverse characteristic."
      apparatus={['Four glass diodes (three zeners, one switching diode)', 'DC supply 0–20 V, 1 kΩ resistor', 'Two digital multimeters']}
      procedure={[
        'A zener and a 1N4148 look alike and both test as normal diodes forward. Use reverse bias to tell them apart.',
        'Supply off. Fit the device reversed (band to +) in series with 1 kΩ.',
        'Raise the supply slowly. A zener’s voltage stops rising at Vz while the current increases.',
        'Note Vz of each. A 1N4148 keeps following the supply (no breakdown below 20 V).',
        'For one zener, note 6+ readings (V, I) and plot the reverse characteristic.',
      ]}
      precautions={['Always use a series resistor.', 'Keep the zener current below its rating (P ÷ Vz).', 'Switch off before changing the device.']}
      viva={[
        {q: 'What is zener breakdown?', a: 'In reverse bias, at the zener voltage the diode conducts heavily while its voltage stays nearly constant.'},
        {q: 'What does the marking 9V1 mean?', a: 'Zener voltage 9.1 V.'},
        {q: 'Max current of a 0.5 W, 5.1 V zener?', a: 'I = P ÷ V = 0.5 ÷ 5.1 ≈ 98 mA.'},
        {q: 'Why is a zener used in reverse bias?', a: 'Its reverse breakdown voltage is constant, so it can hold a voltage steady.'},
      ]}
      steps={[
        {
          label: `Test each device in reverse bias: raise the supply slowly to 14 V or more and press Note reading. Tested: ${items.filter((_, k) => (tested[k] ?? 0) >= 14).length}/4`,
          hint: 'Choose Z1–Z4, supply ON, both meters on. Switch OFF before changing device.',
          done: items.every((_, k) => (tested[k] ?? 0) >= 14),
        },
        {
          label: `Say zener or not, and enter Vz, for each device. Correct: ${items.filter((_, k) => vzOk(k)).length}/4`,
          hint: 'A zener’s voltage stops rising while current climbs. No Vz for a 1N4148.',
          done: items.every((_, k) => vzOk(k)),
        },
        {
          label: `On one zener, note 6 readings for the reverse characteristic. Readings: ${Math.min(6, Math.max(0, ...items.map((x, k) => (x.vz != null ? curve.filter((p) => p.k === k).length : 0))))}/6`,
          hint: 'Small supply steps, including readings around Vz.',
          done: !!best,
        },
        {label: 'Enter your details and press Print / Save as PDF.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_8_74}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={clsx(styles.seg, styles.noPrint)} role="group" aria-label="Device under test" style={{marginBottom: '0.6rem'}}>
          {items.map((x, k) => (
            <button key={k} type="button" aria-pressed={pick === k} onClick={() => choose(k)}>
              Z{k + 1} ({x.mark})
            </button>
          ))}
        </div>
        {b.view(burnt.includes(pick))}
        <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} style={{marginTop: '0.6rem'}} onClick={noteIt}>
          Note reading
        </button>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        <Table
          head={['Device', 'Marking', 'Tested up to', 'Zener?', 'Vz measured (V)', 'Check']}
          rows={items.map((x, k) => [
            `Z${k + 1}`,
            <span className={styles.num}>{x.mark}</span>,
            tested[k] != null ? `${tested[k].toFixed(1)} V` : '–',
            sel(
              `Z${k + 1} is a zener`,
              ans[k]?.zen,
              [
                ['yes', 'Yes'],
                ['no', 'No'],
              ],
              (v) => setAns((a) => ({...a, [k]: {...a[k], zen: v}})),
            ),
            inp(`Z${k + 1} zener voltage`, ans[k]?.vz, (v) => setAns((a) => ({...a, [k]: {...a[k], vz: v}}))),
            ans[k]?.zen ? <Verdict ok={vzOk(k)} /> : '–',
          ])}
        />
        <p className={styles.muted}>Leave Vz empty for a device that is not a zener.</p>
        {curvePts.length > 1 && <XYGraph series={[{id: 'z', label: `Z${Number(best![0]) + 1} reverse`, color: 'var(--s3)', marker: 'circle', points: curvePts.map((p) => ({x: p.v, y: p.ima}))}]} xLabel="Reverse voltage (V)" yLabel="Reverse current (mA)" xUnit="V" yUnit="mA" />}
        <ResetKit
          onReset={() => {
            setAns({});
            setTested({});
            setCurve([]);
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}
