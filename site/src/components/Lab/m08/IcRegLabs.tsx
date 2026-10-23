import React, {useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import {GU_1_8_77, GU_1_8_78, GU_1_8_79, GU_1_8_80} from './gu';
import Multimeter from '../Multimeter';
import XYGraph from '../XYGraph';
import useStoredState from '../useStoredState';
import {ProbeBar, ProbePoint, useProbes} from '../Probes';
import {Knob} from '../Scope';
import {Empty, NoteBox, ResetKit, Section, Table, Verdict, shuffle, useKitSeed, useRng, type Note} from '../kit';
import {L2, fmt} from '../solution';
import {PartGrid} from '../m07/IdentifyLabs';
import type {PartKind} from '../m07/art';
import {kitLabel, near} from '../m07/parts';
import {PanelMeter} from './ZenerRegLabs';
import styles from '../styles.module.css';

const num = (s?: string) => (s && s.trim() !== '' && !Number.isNaN(Number(s)) ? Number(s) : null);
const sel = (label: string, value: string | undefined, options: [string, string][], onChange: (v: string) => void, disabled = false) => (
  <select className={styles.select} aria-label={label} value={value ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
    <option value="">Choose…</option>
    {options.map(([v, t]) => (
      <option key={v} value={v}>
        {t}
      </option>
    ))}
  </select>
);
const DCV_FNS = [
  {fn: 'off', label: 'OFF'},
  {fn: 'dcv20', label: 'DC V 20'},
  {fn: 'dcv200', label: 'DC V 200'},
];
function dcv(fn: string, v: number) {
  if (fn === 'off') return '';
  const fs = fn === 'dcv20' ? 20 : 200;
  return Math.abs(v) >= fs ? 'OL' : v.toFixed(fn === 'dcv20' ? 2 : 1);
}

// ---------------------------------------------------------------------------
// 1.8.77 +12 V regulator using a 3-terminal IC (7812)
// ---------------------------------------------------------------------------

type Pin = 'IN' | 'GND' | 'OUT';
const LOADS = [0, 0.1, 0.5, 1];
const C1 = 2200e-6;

interface RegState {
  vinAvg: number;
  vout: number;
  tj: number;
  shutdown: boolean;
  note: string | null;
}

function reg7812(tap: number, pins: (Pin | '')[], iload: number, heatsink: boolean, offset: number): RegState {
  const ok = pins[0] === 'IN' && pins[1] === 'GND' && pins[2] === 'OUT';
  const swapped = pins[0] === 'OUT' && pins[1] === 'GND' && pins[2] === 'IN';
  const i = iload + 0.005;
  const peak = tap * Math.SQRT2 - 1.4 - i * 0.6;
  const pp = i / (100 * C1);
  const vinAvg = peak - pp / 2;
  const vinMin = peak - pp;
  if (swapped) return {vinAvg, vout: vinAvg - 0.7, tj: 60, shutdown: false, note: 'IN and OUT swapped: no regulation, the output follows the input.'};
  if (!ok) return {vinAvg, vout: 0.05, tj: 40, shutdown: false, note: 'Wrong pin connections: no output.'};
  const reg = vinMin >= 14;
  const vout = reg ? 12 + offset - 0.02 * iload : Math.max(0, vinAvg - 2);
  const pd = Math.max(0, (vinAvg - vout) * i);
  const tj = 30 + pd * (heatsink ? 8 : 50);
  if (tj > 150) return {vinAvg, vout: 2.8 + Math.random() * 0.6, tj, shutdown: true, note: 'IC too hot: thermal shutdown. Fit a heat sink.'};
  return {vinAvg, vout, tj, shutdown: false, note: reg ? null : 'Input too low: the regulator has dropped out.'};
}

interface R77 {
  tap: number;
  load: number;
  hs: boolean;
  vin?: string;
  vout?: string;
}

export function Ic7812Lab(): React.JSX.Element {
  const KEY = '1.8.77';
  const [seed, newKit] = useKitSeed(KEY);
  const offset = useRng(seed, (rnd) => (rnd() * 2 - 1) * 0.12);
  const [tap, setTap] = useState(15);
  const [pins, setPins] = useState<(Pin | '')[]>(['', '', '']);
  const [load, setLoad] = useState(0);
  const [hs, setHs] = useState(false);
  const [power, setPower] = useState(false);
  const [fn, setFn] = useState('off');
  const [rows, setRows] = useStoredState<R77[]>(`lab:${KEY}:rows`, []);
  const [pct, setPct] = useStoredState(`lab:${KEY}:pct`, '');
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);
  const probes = useProbes();

  const s = power ? reg7812(tap, pins, load, hs, offset) : null;
  const nodeV = (id: string | null) => (!id || !s ? 0 : id.startsWith('IN') ? s.vinAvg : id.startsWith('OUT') ? s.vout : 0);
  const v = probes.red && probes.black && probes.red !== probes.black ? nodeV(probes.red) - nodeV(probes.black) : 0;
  const text = dcv(fn, v);
  const pair = [probes.red?.split('@')[0], probes.black?.split('@')[0]].sort().join('-');

  const change = (f: () => void) => {
    if (power) return setNote({kind: 'warn', text: 'Switch off before changing the circuit.'});
    setNote(null);
    f();
  };
  const toggle = () => {
    if (power) return (setPower(false), setNote(null));
    if (pins.some((p) => !p) || new Set(pins).size < 3) return setNote({kind: 'warn', text: 'Connect each IC pin to a different point: IN, GND, OUT.'});
    setPower(true);
    const st = reg7812(tap, pins, load, hs, offset);
    setNote(st.note ? {kind: st.shutdown ? 'bad' : 'warn', text: st.note} : {kind: 'good', text: 'Power on.'});
  };
  const noteIt = () => {
    if (!s) return setNote({kind: 'warn', text: 'Switch on first.'});
    if (fn === 'off') return setNote({kind: 'warn', text: 'Select DC V.'});
    if (text === 'OL') return setNote({kind: 'warn', text: 'OL: higher range.'});
    if (Number(text) < 0) return setNote({kind: 'warn', text: 'Minus sign: red probe on the + point.'});
    const field = pair === 'G-IN' ? 'vin' : pair === 'G-OUT' ? 'vout' : null;
    if (!field) return setNote({kind: 'warn', text: 'Measure from GND to IN or to OUT.'});
    setRows((r) => {
      const k = r.findIndex((x) => x.tap === tap && x.load === load && x.hs === hs);
      const row = {...(k >= 0 ? r[k] : {tap, load, hs}), [field]: text};
      return k >= 0 ? r.map((x, j) => (j === k ? row : x)) : [...r, row];
    });
    setNote({kind: 'good', text: `${field === 'vin' ? 'Vin' : 'Vout'} = ${text} V`});
  };

  const good = rows.filter((r) => r.tap === 15 && r.vout && Math.abs(Number(r.vout) - 12) < 0.4);
  const nl = good.find((r) => r.load === 0);
  const fl = good.find((r) => r.load === 1);
  const pctTrue = nl && fl ? ((Number(nl.vout) - Number(fl.vout)) / Number(fl.vout)) * 100 : null;
  const pinsOk = pins[0] === 'IN' && pins[1] === 'GND' && pins[2] === 'OUT';

  return (
    <PracticalSheet
      number={KEY}
      title="Construct and Test a +12 V Fixed Regulator Using a 3-Terminal IC"
      aim="To build a +12 V regulated supply with a 7812 IC, and test its output against load, input voltage and heating."
      apparatus={['Transformer 230 V / 9 V and 15 V taps, 2 A', 'Bridge rectifier, 2200 µF filter, 0.1 µF capacitors', 'IC LM7812 (TO-220) with heat sink', 'Load: 120 Ω, 24 Ω, 12 Ω', 'Digital multimeter']}
      procedure={[
        'Connect the IC: pin 1 to the filter capacitor (+), pin 2 to ground, pin 3 to the output. (Check the data sheet.)',
        'Use the 15 V tap. Measure Vin (pin 1 to GND) and Vout (pin 3 to GND) at no load.',
        'Load 0.1 A, 0.5 A, 1 A: note Vin and Vout. Fit the heat sink for high loads.',
        'Change to the 9 V tap and note Vout: the regulator drops out.',
        '% load regulation = (Vout no-load − Vout full-load) ÷ Vout full-load × 100.',
      ]}
      precautions={['Check the pin-out before switching on.', 'Use a heat sink when (Vin − Vout) × I is more than about 1 W.', 'Input must be at least 2–3 V above the output.']}
      viva={[
        {q: 'What is dropout voltage?', a: 'The minimum difference between input and output (about 2 V for 78xx) for the regulator to keep working.'},
        {q: 'Why the 0.1 µF capacitors at the IC pins?', a: 'To stop the regulator oscillating and to improve transient response.'},
        {q: 'Power dissipated in a 7812 with 19 V in and 1 A out?', a: '(19 − 12) × 1 = 7 W: it needs a heat sink.'},
        {q: 'What is thermal shutdown?', a: 'Built-in protection that cuts the output when the chip gets too hot.'},
      ]}
      steps={[
        {
          label: 'Connect the IC pins: pin 1 to Input, pin 2 to Ground, pin 3 to Output.',
          hint: 'Switch OFF to change pins. Check the data sheet first.',
          done: pinsOk,
        },
        {
          label: `Use the 15 V tap, switch Mains ON and note Vin and Vout at 0, 0.1, 0.5 and 1 A. Loads done: ${LOADS.filter((l) => good.some((r) => r.load === l && r.vin)).length}/${LOADS.length}`,
          hint: 'Black probe on GND, red on IN, then on OUT. Fit the heat sink for high loads.',
          done: good.length > 0 && LOADS.every((l) => good.some((r) => r.load === l && r.vin)),
        },
        {
          label: 'Calculate the % load regulation and enter it in the Result table.',
          hint: '(Vout no load − Vout full load) ÷ Vout full load × 100.',
          done: pctTrue != null && Math.abs((num(pct) ?? 99) - pctTrue) < 0.02,
        },
        {
          label: 'Switch OFF, select the 9 V tap, switch ON and note Vout.',
          hint: 'Input is too low: the regulator drops out.',
          done: rows.some((r) => r.tap === 9 && r.vout && Number(r.vout) < 11.5),
        },
        {label: 'Enter your details and press Print / Save as PDF.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_8_77}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div>
            <div className={styles.kit}>
              <svg viewBox="0 0 560 240" role="img" aria-label="Transformer, bridge, filter capacitor, 7812 regulator with heat sink option, output capacitor and load">
                <rect x={14} y={60} width={90} height={110} rx={8} fill="#31414c" stroke="#4d5f6b" />
                <text x={59} y={92} textAnchor="middle" style={kitLabel}>
                  230/{tap} V
                </text>
                <text x={59} y={150} textAnchor="middle" style={{...kitLabel, fill: power ? '#ffcf3f' : '#9fb0ba'}}>
                  {power ? 'ON' : 'OFF'}
                </text>
                <rect x={124} y={84} width={50} height={50} rx={4} fill="#1d1d1d" />
                <text x={149} y={113} textAnchor="middle" style={{...kitLabel, fontSize: 10}}>
                  BRIDGE
                </text>
                <path className={styles.wire} d="M104 100 H124 M104 120 H124 M174 90 H200 H300 M174 130 H200 V200 H500 M200 90 V120 M200 160 V200 M380 90 H440 H500 V120 M440 90 V120 M440 160 V200 M500 170 V200 M340 120 V200" fill="none" />
                <path d="M186 120 H214 M186 132 H214" stroke="var(--lab-wire)" strokeWidth={4} />
                <text x={222} y={134} style={{...kitLabel, fontSize: 10}}>
                  2200µ
                </text>
                {/* 7812 */}
                {hs && <rect x={294} y={34} width={92} height={30} rx={3} fill="#8d969b" />}
                <rect x={304} y={56} width={72} height={58} rx={3} fill="#1d1d1d" />
                <text x={340} y={84} textAnchor="middle" style={{...kitLabel, fontSize: 11}}>
                  LM7812
                </text>
                {[0, 1, 2].map((k) => (
                  <g key={k}>
                    <rect x={316 + k * 22} y={114} width={5} height={10} fill="#c9ced1" />
                    <text x={318 + k * 22} y={140} textAnchor="middle" style={{...kitLabel, fontSize: 10}}>
                      {k + 1}
                    </text>
                  </g>
                ))}
                <path d="M300 90 L304 90 M376 90 L380 90" stroke="var(--lab-wire)" strokeWidth={2.5} />
                <path d="M426 120 H454 M426 132 H454" stroke="var(--lab-wire)" strokeWidth={4} />
                {load > 0 ? <rect x={490} y={120} width={20} height={50} rx={3} fill="#e8d7b0" /> : <path d="M500 120 V135 M500 155 V170" stroke="var(--lab-wire)" strokeWidth={2.5} />}
                <text x={516} y={150} style={{...kitLabel, fontSize: 10}}>
                  {load ? `${load} A` : 'open'}
                </text>
                {s && <text x={340} y={24} textAnchor="middle" style={{...kitLabel, fill: s.tj > 100 ? '#ff6b5a' : '#9fb0ba'}}>{`IC ${Math.round(Math.min(s.tj, 160))} °C`}</text>}
                <ProbePoint id="IN@1" x={270} y={90} probes={probes} label="IC input (filter +)" r={5} />
                <ProbePoint id="OUT@1" x={410} y={90} probes={probes} label="IC output" r={5} />
                <ProbePoint id="G@1" x={340} y={200} probes={probes} label="Ground" r={5} />
                <text x={270} y={80} textAnchor="middle" style={{...kitLabel, fontSize: 10}}>
                  IN
                </text>
                <text x={410} y={80} textAnchor="middle" style={{...kitLabel, fontSize: 10}}>
                  OUT
                </text>
                <text x={340} y={224} textAnchor="middle" style={{...kitLabel, fontSize: 10}}>
                  GND
                </text>
              </svg>
            </div>
            <ProbeBar probes={probes} />
          </div>
          <div style={{display: 'grid', gap: '0.6rem', alignContent: 'start'}}>
            <Multimeter name="Digital multimeter" fn={fn} functions={DCV_FNS} text={text} unit={fn === 'off' ? '' : 'V DC'} onFunction={(f) => (setNote(null), setFn(f))} />
            <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} onClick={noteIt}>
              Note reading
            </button>
          </div>
        </div>
        <div className={clsx(styles.controls, styles.noPrint)}>
          <div className={styles.card}>
            <span className={styles.label} style={{marginTop: 0}}>
              IC pin connections
            </span>
            <div style={{display: 'flex', gap: '0.4rem', flexWrap: 'wrap'}}>
              {[0, 1, 2].map((k) => (
                <label key={k} className={styles.field}>
                  Pin {k + 1}
                  {sel(
                    `IC pin ${k + 1} goes to`,
                    pins[k],
                    [
                      ['IN', 'Input (filter +)'],
                      ['GND', 'Ground'],
                      ['OUT', 'Output'],
                    ],
                    (x) => change(() => setPins((p) => p.map((y, j) => (j === k ? (x as Pin) : y)))),
                    power,
                  )}
                </label>
              ))}
            </div>
            <div className={styles.seg} role="group" aria-label="Options" style={{marginTop: '0.5rem'}}>
              <button type="button" aria-pressed={tap === 15} onClick={() => change(() => setTap(15))}>
                15 V tap
              </button>
              <button type="button" aria-pressed={tap === 9} onClick={() => change(() => setTap(9))}>
                9 V tap
              </button>
              <button type="button" aria-pressed={hs} onClick={() => change(() => setHs((x) => !x))}>
                Heat sink {hs ? 'fitted' : 'off'}
              </button>
            </div>
          </div>
          <div className={styles.card}>
            <span className={styles.label} style={{marginTop: 0}}>
              Load
            </span>
            <div className={styles.seg} role="group" aria-label="Load">
              {LOADS.map((l) => (
                <button key={l} type="button" aria-pressed={load === l} onClick={() => setLoad(l)}>
                  {l ? `${l} A` : 'No load'}
                </button>
              ))}
            </div>
            <button type="button" className={styles.btn} style={{marginTop: '0.5rem'}} onClick={toggle}>
              Mains {power ? 'OFF' : 'ON'}
            </button>
          </div>
        </div>
        <NoteBox note={note} status={s?.note ? {kind: s.shutdown ? 'bad' : 'warn', text: s.note} : null} />
      </Section>
      <Section title="Observation table">
        {rows.length === 0 ? (
          <Empty>No readings yet.</Empty>
        ) : (
          <Table head={['Tap', 'Load', 'Heat sink', 'Vin (V)', 'Vout (V)']} rows={rows.map((r) => [`${r.tap} V`, r.load ? `${r.load} A` : 'No load', r.hs ? 'Yes' : 'No', r.vin ?? '–', r.vout ?? '–'])} />
        )}
      </Section>
      <Section title="Result">
        <Table
          head={['% load regulation (15 V tap)', 'Your value (%)', 'Check']}
          rows={[
            [
              nl && fl ? `(${nl.vout} − ${fl.vout}) ÷ ${fl.vout} × 100` : 'Note Vout at no load and 1 A first',
              <input className={styles.input} style={{maxWidth: '5rem'}} inputMode="decimal" aria-label="Percentage load regulation" value={pct} onChange={(e) => setPct(e.target.value)} />,
              pct && pctTrue != null ? (
                <Verdict
                  ok={Math.abs((num(pct) ?? 99) - pctTrue) < 0.02}
                  fix={{
                    hint: L2('% regulation = (Vno-load − Vfull-load) ÷ Vfull-load × 100. Use the Vout you noted at no load and at 1 A.', '% રેગ્યુલેશન = (Vનો-લોડ − Vફુલ-લોડ) ÷ Vફુલ-લોડ × 100. નો લોડ અને 1 A પર નોંધેલા Vout વાપરો.'),
                    work: L2(`(${nl!.vout} − ${fl!.vout}) ÷ ${fl!.vout} × 100 = ${fmt(pctTrue)} %.`, `(${nl!.vout} − ${fl!.vout}) ÷ ${fl!.vout} × 100 = ${fmt(pctTrue)} %.`),
                    answer: `${fmt(pctTrue)} %`,
                    entered: num(pct),
                    expected: pctTrue,
                  }}
                />
              ) : (
                '–'
              ),
            ],
          ]}
        />
        <ResetKit
          onReset={() => {
            setRows([]);
            setPct('');
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// 1.8.78 Identify fixed +ve / −ve regulator ICs and their current ratings
// ---------------------------------------------------------------------------

interface RegIc {
  mark: string;
  kind: PartKind;
  type: 'pos' | 'neg' | 'adjp' | 'adjn';
  vout: string;
  amps: number;
  pin1: 'IN' | 'GND' | 'OUT' | 'ADJ';
}
const ICS: RegIc[] = [
  {mark: 'LM7805 +5V', kind: 'to220', type: 'pos', vout: '5', amps: 1.5, pin1: 'IN'},
  {mark: 'LM7812 +12V', kind: 'to220', type: 'pos', vout: '12', amps: 1.5, pin1: 'IN'},
  {mark: 'LM7905 −5V', kind: 'to220', type: 'neg', vout: '-5', amps: 1.5, pin1: 'GND'},
  {mark: 'LM7912 −12V', kind: 'to220', type: 'neg', vout: '-12', amps: 1.5, pin1: 'GND'},
  {mark: '78L05', kind: 'to92', type: 'pos', vout: '5', amps: 0.1, pin1: 'OUT'},
  {mark: '78M12 +12V', kind: 'to220', type: 'pos', vout: '12', amps: 0.5, pin1: 'IN'},
  {mark: 'L78S05 2A', kind: 'to220', type: 'pos', vout: '5', amps: 2, pin1: 'IN'},
  {mark: 'LM317T ADJ', kind: 'to220', type: 'adjp', vout: 'adjp', amps: 1.5, pin1: 'ADJ'},
  {mark: 'LM337T ADJ', kind: 'to220', type: 'adjn', vout: 'adjn', amps: 1.5, pin1: 'ADJ'},
  {mark: 'LM338K', kind: 'to3', type: 'adjp', vout: 'adjp', amps: 5, pin1: 'ADJ'},
];
const IC_DATA: string[][] = [
  ['78xx (TO-220)', '+ fixed', '1.5 A', '1 IN, 2 GND, 3 OUT'],
  ['78Mxx', '+ fixed', '0.5 A', '1 IN, 2 GND, 3 OUT'],
  ['78Lxx (TO-92)', '+ fixed', '0.1 A', '1 OUT, 2 GND, 3 IN'],
  ['78Sxx', '+ fixed', '2 A', '1 IN, 2 GND, 3 OUT'],
  ['79xx (TO-220)', '− fixed', '1.5 A', '1 GND, 2 IN, 3 OUT'],
  ['LM317T', '+ adjustable 1.25–37 V', '1.5 A', '1 ADJ, 2 OUT, 3 IN'],
  ['LM337T', '− adjustable −1.25 to −37 V', '1.5 A', '1 ADJ, 2 IN, 3 OUT'],
  ['LM338K (TO-3)', '+ adjustable 1.2–32 V', '5 A', 'case OUT, pins ADJ and IN'],
];

export function RegulatorIcsLab(): React.JSX.Element {
  const KEY = '1.8.78';
  const [seed, newKit] = useKitSeed(KEY);
  const items = useRng(seed, (rnd) => shuffle(ICS, rnd).slice(0, 8));
  const [ans, setAns] = useStoredState<Record<number, {type?: string; vout?: string; amps?: string; pin1?: string}>>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const set = (k: number, p: object) => setAns((a) => ({...a, [k]: {...a[k], ...p}}));
  const ok = (k: number) => {
    const a = ans[k] ?? {};
    const it = items[k];
    return a.type === it.type && a.vout === it.vout && near(num(a.amps), it.amps, 0.001) && a.pin1 === it.pin1;
  };

  return (
    <PracticalSheet
      number={KEY}
      title="Identify Fixed +ve and −ve Regulator ICs and Their Current Ratings"
      aim="To identify positive, negative and adjustable voltage regulator ICs from their type numbers, and find their output voltage, current rating and pin-out."
      apparatus={['Eight regulator ICs (below)', 'Regulator data sheet extract']}
      procedure={['Read the type number.', '78 = positive, 79 = negative, 317 / 337 = adjustable. The last two digits give the voltage.', 'The letter after 78 gives the current: L = 0.1 A, M = 0.5 A, none = 1.5 A, S = 2 A.', 'Find pin 1 from the data sheet.']}
      precautions={['Pin-outs differ between 78xx, 79xx and 317 — always check the data sheet.', 'The metal tab is connected to a pin: insulate it from the heat sink if needed.']}
      viva={[
        {q: 'What does 7905 mean?', a: '79 = negative regulator, 05 = −5 V output.'},
        {q: 'Current rating of 78L12?', a: '100 mA (L series).'},
        {q: 'Which pin of a 7812 is connected to the tab?', a: 'Pin 2, ground. (For a 7912 the tab is the input.)'},
      ]}
      steps={[
        {
          label: `Read the marking on each IC and fill in its type, output, maximum current and pin 1. Correct: ${items.filter((_, k) => ok(k)).length}/8`,
          hint: '78 = positive, 79 = negative, 317/337 = adjustable. Open the data sheet extract for pins.',
          done: items.every((_, k) => ok(k)),
        },
        {label: 'Enter your details and press Print / Save as PDF.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_8_78}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Component tray">
        <PartGrid parts={items.map((it) => ({kind: it.kind, o: {mark: it.mark}}))} label="Eight voltage regulator ICs" />
        <details style={{marginTop: '0.6rem'}}>
          <summary className={styles.muted} style={{cursor: 'pointer'}}>
            Data sheet extract
          </summary>
          <Table head={['Series', 'Type', 'Current', 'Pins (front view, left to right)']} rows={IC_DATA} />
        </details>
      </Section>
      <Section title="Observation table">
        <Table
          head={['No.', 'Marking', 'Type', 'Output', 'Max current (A)', 'Pin 1', 'Check']}
          rows={items.map((it, k) => [
            k + 1,
            <span className={styles.num}>{it.mark}</span>,
            sel(
              `IC ${k + 1} type`,
              ans[k]?.type,
              [
                ['pos', 'Fixed positive'],
                ['neg', 'Fixed negative'],
                ['adjp', 'Adjustable positive'],
                ['adjn', 'Adjustable negative'],
              ],
              (v) => set(k, {type: v}),
            ),
            sel(
              `IC ${k + 1} output`,
              ans[k]?.vout,
              [
                ['5', '+5 V'],
                ['12', '+12 V'],
                ['-5', '−5 V'],
                ['-12', '−12 V'],
                ['adjp', '+1.25 V upwards (adj.)'],
                ['adjn', '−1.25 V downwards (adj.)'],
              ],
              (v) => set(k, {vout: v}),
            ),
            <input className={styles.input} style={{maxWidth: '4.5rem'}} inputMode="decimal" aria-label={`IC ${k + 1} maximum current`} value={ans[k]?.amps ?? ''} onChange={(e) => set(k, {amps: e.target.value})} />,
            sel(
              `IC ${k + 1} pin 1`,
              ans[k]?.pin1,
              [
                ['IN', 'IN'],
                ['GND', 'GND'],
                ['OUT', 'OUT'],
                ['ADJ', 'ADJ'],
              ],
              (v) => set(k, {pin1: v}),
            ),
            ans[k]?.type && ans[k]?.vout && ans[k]?.amps && ans[k]?.pin1 ? (
              <Verdict
                ok={ok(k)}
                fix={{
                  hint: L2(
                    '78 = positive, 79 = negative, 317 / 337 = adjustable. The last two digits are the voltage. Letter after 78: L = 0.1 A, M = 0.5 A, none = 1.5 A, S = 2 A. Pin 1 is IN for 78xx (TO-220), OUT for 78Lxx (TO-92), GND for 79xx, ADJ for 317; check the data sheet.',
                    '78 = પોઝિટિવ, 79 = નેગેટિવ, 317 / 337 = એડજસ્ટેબલ. છેલ્લા બે અંક વોલ્ટેજ. 78 પછીનો અક્ષર: L = 0.1 A, M = 0.5 A, કંઈ નહીં = 1.5 A, S = 2 A. પિન 1: 78xx (TO-220) માં IN, 78Lxx (TO-92) માં OUT, 79xx માં GND, 317 માં ADJ; ડેટા શીટ તપાસો.',
                  ),
                  answer: `${items[k].mark}: ${items[k].vout} V, ${items[k].amps} A, pin 1 = ${items[k].pin1}`,
                }}
              />
            ) : (
              '–'
            ),
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
// 1.8.79 IC 723 and IC 78S40: output voltage against input voltage
// ---------------------------------------------------------------------------

const IOUT = 0.05; // 5 V across 100 Ω

function ic723(vin: number, set: number): {vout: number; iin: number} {
  const vout = vin >= 9.5 ? set + 0.0004 * (vin - 12) : Math.max(0, set * ((vin - 4) / 5.5));
  return {vout, iin: vout / 100 + (vin > 3 ? 0.0025 : 0)};
}
function ic78s40(vin: number, set: number): {vout: number; iin: number} {
  if (vin < 3) return {vout: 0, iin: 0};
  if (vin < set + 2) {
    const vout = vin - 2;
    return {vout, iin: vout / 100 + 0.002};
  }
  const vout = set + 0.002 * (vin - 12) * 0.1;
  return {vout, iin: (vout * (vout / 100)) / (0.8 * vin) + 0.002};
}

interface P79 {
  ic: '723' | '78S40';
  vin: number;
  vout: number;
  iin: number;
}

export function Ic723Lab(): React.JSX.Element {
  const KEY = '1.8.79';
  const [seed, newKit] = useKitSeed(KEY);
  const set = useRng(seed, (rnd) => 5 + (rnd() * 2 - 1) * 0.05);
  const [ic, setIc] = useState<'723' | '78S40'>('723');
  const [vin, setVin] = useState(12);
  const [pts, setPts] = useStoredState<P79[]>(`lab:${KEY}:pts`, []);
  const [ans, setAns] = useStoredState<{min723?: string; min78?: string; eff723?: string; eff78?: string}>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);
  const o = ic === '723' ? ic723(vin, set) : ic78s40(vin, set);
  const tooHigh = vin > 40;

  const noteIt = () => {
    const p: P79 = {ic, vin, vout: Number(o.vout.toFixed(2)), iin: Number((o.iin * 1000).toFixed(1))};
    setPts((x) => [...x.filter((y) => !(y.ic === ic && y.vin === vin)), p]);
    setNote({kind: 'good', text: `${ic}: Vin ${vin} V → Vout ${p.vout} V, Iin ${p.iin} mA`});
  };
  const of = (c: '723' | '78S40') => pts.filter((p) => p.ic === c).sort((a, b) => a.vin - b.vin);
  const effAt20 = (c: '723' | '78S40') => {
    const p = of(c).find((x) => x.vin === 20);
    return p ? ((p.vout * (p.vout / 100)) / (20 * (p.iin / 1000))) * 100 : null;
  };
  const effOk = (c: '723' | '78S40', s?: string) => {
    const e = effAt20(c);
    return e != null && near(num(s), e, 0.04);
  };
  const minOk = (c: '723' | '78S40', s?: string) => {
    const n = num(s);
    const t = c === '723' ? 9.5 : set + 2;
    return n != null && Math.abs(n - t) <= 1;
  };
  const spread = (c: '723' | '78S40') => of(c).length >= 8 && of(c).some((p) => p.vin <= 6) && of(c).some((p) => p.vin >= 20);

  return (
    <PracticalSheet
      number={KEY}
      title="Output Voltage of IC 723 and IC 78S40 Regulators Against Input Voltage"
      aim="To vary the input voltage of an IC 723 (linear) and an IC 78S40 (switching) regulator with a fixed load, and observe the output voltage, the minimum input voltage and the efficiency."
      apparatus={['IC 723 regulator board, set to 5 V', 'IC 78S40 switching regulator board (step-down), set to 5 V', 'DC supply 0–30 V', 'Fixed load 100 Ω', 'Panel meters: Vin, Iin, Vout']}
      procedure={[
        'Connect the board to the variable supply and the 100 Ω load.',
        'Increase Vin from 0 V to 25 V in steps. Note Vin, Iin and Vout.',
        'Find the lowest Vin at which Vout stays at 5 V.',
        'Efficiency at Vin = 20 V: η = (Vout × Iout) ÷ (Vin × Iin) × 100, with Iout = Vout ÷ 100 Ω.',
        'Repeat for the other board and compare.',
      ]}
      precautions={['Do not exceed the IC’s maximum input voltage (40 V for 723).', 'Keep the load fixed during the test.', 'Switching regulators need short, thick ground wiring.']}
      viva={[
        {q: 'Why does the 723 need about 9.5 V at its input?', a: 'Its internal reference (about 7.15 V) and amplifier need head-room.'},
        {q: 'Why is the 78S40’s input current lower at high Vin?', a: 'A switching regulator transfers power, not current: as Vin rises, Iin falls (Pin ≈ Pout ÷ η).'},
        {q: 'Why is a linear regulator inefficient at high Vin?', a: 'All the extra voltage is dropped across the pass transistor as heat; Iin stays equal to Iout.'},
      ]}
      steps={[
        {
          label: `IC 723: raise Vin in steps from 6 V or less to 20 V or more and press Note reading. Readings: ${Math.min(of('723').length, 8)}/8`,
          hint: 'Choose IC 723 (linear). Include 20 V. Stay below 40 V.',
          done: spread('723'),
        },
        {
          label: `IC 78S40: repeat the same Vin steps. Readings: ${Math.min(of('78S40').length, 8)}/8`,
          hint: 'Choose IC 78S40 (switching). Include 20 V.',
          done: spread('78S40'),
        },
        {
          label: 'Find the lowest Vin at which Vout stays at 5 V for both ICs and enter it in the Result table.',
          hint: 'Look in the observation table or the graph.',
          done: minOk('723', ans.min723) && minOk('78S40', ans.min78),
        },
        {
          label: 'Calculate the efficiency at Vin = 20 V for both ICs and enter it.',
          hint: 'η = (Vout × Vout ÷ 100) ÷ (Vin × Iin) × 100.',
          done: effOk('723', ans.eff723) && effOk('78S40', ans.eff78),
        },
        {label: 'Enter your details and press Print / Save as PDF.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_8_79}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div className={styles.card}>
            <div className={styles.seg} role="group" aria-label="Regulator board">
              <button type="button" aria-pressed={ic === '723'} onClick={() => (setIc('723'), setNote(null))}>
                IC 723 (linear)
              </button>
              <button type="button" aria-pressed={ic === '78S40'} onClick={() => (setIc('78S40'), setNote(null))}>
                IC 78S40 (switching)
              </button>
            </div>
            <Knob label="INPUT VOLTS" value={`${vin} V`} onDec={() => setVin((x) => Math.max(0, x - 1))} onInc={() => setVin((x) => Math.min(30, x + 1))} />
            <p className={styles.muted} style={{margin: '0.4rem 0 0'}}>
              Load: 100 Ω fixed.
            </p>
          </div>
          <div style={{display: 'grid', gap: '0.5rem', gridTemplateColumns: '1fr 1fr 1fr', alignContent: 'start'}}>
            <PanelMeter label="Vin" value={vin.toFixed(1)} unit="V" />
            <PanelMeter label="Iin" value={(o.iin * 1000).toFixed(1)} unit="mA" />
            <PanelMeter label="Vout" value={o.vout.toFixed(2)} unit="V" />
            <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} style={{gridColumn: '1 / -1'}} onClick={noteIt}>
              Note reading
            </button>
          </div>
        </div>
        <NoteBox note={note} status={tooHigh ? {kind: 'bad', text: 'Above the maximum input voltage.'} : null} />
      </Section>
      <Section title="Observation table">
        {pts.length === 0 ? (
          <Empty>No readings yet.</Empty>
        ) : (
          <div className={styles.twoCol}>
            <Table caption="IC 723" head={['Vin (V)', 'Iin (mA)', 'Vout (V)']} rows={of('723').map((p) => [p.vin, p.iin, p.vout.toFixed(2)])} />
            <Table caption="IC 78S40" head={['Vin (V)', 'Iin (mA)', 'Vout (V)']} rows={of('78S40').map((p) => [p.vin, p.iin, p.vout.toFixed(2)])} />
          </div>
        )}
        {pts.length > 1 && (
          <XYGraph
            series={[
              {id: 'a', label: 'IC 723', color: 'var(--s1)', marker: 'circle', points: of('723').map((p) => ({x: p.vin, y: p.vout}))},
              {id: 'b', label: 'IC 78S40', color: 'var(--s2)', marker: 'square', points: of('78S40').map((p) => ({x: p.vin, y: p.vout}))},
            ]}
            xLabel="Input voltage (V)"
            yLabel="Output voltage (V)"
            xUnit="V"
            yUnit="V"
          />
        )}
      </Section>
      <Section title="Result">
        <Table
          head={['', 'IC 723', 'IC 78S40']}
          rows={[
            [
              'Minimum Vin for regulation (V)',
              <span>
                <input className={styles.input} style={{maxWidth: '4.5rem'}} inputMode="decimal" aria-label="IC 723 minimum input" value={ans.min723 ?? ''} onChange={(e) => setAns((a) => ({...a, min723: e.target.value}))} /> {ans.min723 ? (
                  <Verdict
                    ok={minOk('723', ans.min723)}
                    fix={{
                      hint: L2('Lower Vin step by step. The minimum is where Vout just starts to fall below the set value.', 'Vin ધીમે ધીમે ઘટાડો. Vout સેટ કિંમતથી નીચે ઉતરવા લાગે ત્યાં લઘુત્તમ છે.'),
                      answer: '9.5 V (±1 V)',
                      entered: num(ans.min723),
                      expected: 9.5,
                    }}
                  />
                ) : null}
              </span>,
              <span>
                <input className={styles.input} style={{maxWidth: '4.5rem'}} inputMode="decimal" aria-label="IC 78S40 minimum input" value={ans.min78 ?? ''} onChange={(e) => setAns((a) => ({...a, min78: e.target.value}))} /> {ans.min78 ? (
                  <Verdict
                    ok={minOk('78S40', ans.min78)}
                    fix={{
                      hint: L2('Lower Vin step by step. The minimum is about 2 V above the set output voltage.', 'Vin ધીમે ધીમે ઘટાડો. લઘુત્તમ Vin સેટ આઉટપુટ વોલ્ટેજ કરતાં લગભગ 2 V વધારે હોય છે.'),
                      answer: `${fmt(set + 2)} V (±1 V)`,
                      entered: num(ans.min78),
                      expected: set + 2,
                    }}
                  />
                ) : null}
              </span>,
            ],
            [
              'Efficiency at Vin = 20 V (%)',
              <span>
                <input className={styles.input} style={{maxWidth: '4.5rem'}} inputMode="decimal" aria-label="IC 723 efficiency" value={ans.eff723 ?? ''} onChange={(e) => setAns((a) => ({...a, eff723: e.target.value}))} /> {ans.eff723 ? effAt20('723') == null ? 'note 20 V first' : <Verdict
                    ok={effOk('723', ans.eff723)}
                    fix={{
                      hint: L2('Efficiency = (Vout × Iout) ÷ (Vin × Iin) × 100 at Vin = 20 V.', 'કાર્યક્ષમતા = (Vout × Iout) ÷ (Vin × Iin) × 100, Vin = 20 V પર.'),
                      answer: `${fmt(effAt20('723'))} %`,
                      entered: num(ans.eff723),
                      expected: effAt20('723'),
                    }}
                  /> : null}
              </span>,
              <span>
                <input className={styles.input} style={{maxWidth: '4.5rem'}} inputMode="decimal" aria-label="IC 78S40 efficiency" value={ans.eff78 ?? ''} onChange={(e) => setAns((a) => ({...a, eff78: e.target.value}))} /> {ans.eff78 ? effAt20('78S40') == null ? 'note 20 V first' : <Verdict
                    ok={effOk('78S40', ans.eff78)}
                    fix={{
                      hint: L2('Efficiency = (Vout × Iout) ÷ (Vin × Iin) × 100 at Vin = 20 V.', 'કાર્યક્ષમતા = (Vout × Iout) ÷ (Vin × Iin) × 100, Vin = 20 V પર.'),
                      answer: `${fmt(effAt20('78S40'))} %`,
                      entered: num(ans.eff78),
                      expected: effAt20('78S40'),
                    }}
                  /> : null}
              </span>,
            ],
          ]}
        />
        <ResetKit
          onReset={() => {
            setPts([]);
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
// 1.8.80 Variable 1.2 V – 30 V regulated supply with LM317T
// ---------------------------------------------------------------------------

const R1 = 220;
const R2MAX = 5000;
const VIN317 = 32.5;

interface P80 {
  pos: number;
  r2?: string;
  vout?: string;
  calc?: string;
}

export function Lm317Lab(): React.JSX.Element {
  const KEY = '1.8.80';
  const [seed, newKit] = useKitSeed(KEY);
  const kit = useRng(seed, (rnd) => ({r1: R1 * (1 + (rnd() * 2 - 1) * 0.01), r2max: R2MAX * (1 + (rnd() * 2 - 1) * 0.08), vref: 1.25 + (rnd() * 2 - 1) * 0.02}));
  const [pos, setPos] = useState(50);
  const [power, setPower] = useState(false);
  const [fn, setFn] = useState('off');
  const [rows, setRows] = useStoredState<P80[]>(`lab:${KEY}:rows`, []);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);
  const probes = useProbes();

  const r2 = (kit.r2max * pos) / 100;
  const vout = Math.min(VIN317 - 2.5, kit.vref * (1 + r2 / kit.r1) + 50e-6 * r2);
  const node = (id: string | null): number => (!id || !power ? 0 : id.startsWith('OUT') ? vout : id.startsWith('ADJ') ? vout - kit.vref : id.startsWith('IN') ? VIN317 : 0);
  const red = probes.red?.split('@')[0];
  const black = probes.black?.split('@')[0];
  const pair = [red, black].sort().join('-');
  let text = '';
  let unit = '';
  if (fn.startsWith('dcv')) {
    unit = 'V DC';
    text = dcv(fn, probes.red && probes.black && probes.red !== probes.black ? node(probes.red) - node(probes.black) : 0);
  } else if (fn === 'r20k') {
    unit = 'kΩ';
    if (pair === 'ADJ-G') text = power ? 'Err' : (r2 / 1000).toFixed(2);
    else if (pair === 'ADJ-OUT') text = power ? 'Err' : (kit.r1 / 1000).toFixed(3);
    else text = 'OL';
  }

  const noteIt = () => {
    if (fn === 'off') return setNote({kind: 'warn', text: 'Select a function.'});
    if (text === 'Err') return setNote({kind: 'bad', text: 'Switch off before measuring resistance.'});
    if (text === 'OL') return setNote({kind: 'warn', text: 'OL.'});
    const upd = (p: Partial<P80>) => setRows((r) => (r.some((x) => x.pos === pos) ? r.map((x) => (x.pos === pos ? {...x, ...p} : x)) : [...r, {pos, ...p}]));
    if (fn === 'r20k' && pair === 'ADJ-G') {
      upd({r2: text});
      return setNote({kind: 'good', text: `Pot at ${pos} %: R2 = ${text} kΩ`});
    }
    if (fn.startsWith('dcv') && pair === 'G-OUT') {
      if (Number(text) < 0) return setNote({kind: 'warn', text: 'Minus sign: red probe on OUT.'});
      upd({vout: text});
      return setNote({kind: 'good', text: `Pot at ${pos} %: Vout = ${text} V`});
    }
    setNote({kind: 'warn', text: 'R2: Ω across ADJ–GND (power off). Vout: DC V across OUT–GND.'});
  };

  const calcOk = (p: P80) => p.r2 != null && near(num(p.calc), 1.25 * (1 + (Number(p.r2) * 1000) / R1), 0.02);
  const measOk = (p: P80) => {
    const tr2 = (kit.r2max * p.pos) / 100;
    const tv = Math.min(VIN317 - 2.5, kit.vref * (1 + tr2 / kit.r1) + 50e-6 * tr2);
    return p.vout != null && near(num(p.vout), tv, 0.02) && p.r2 != null && near(Number(p.r2) * 1000, tr2, 0.02);
  };
  const full = rows.filter((p) => measOk(p) && calcOk(p));
  const sorted = [...rows].sort((a, b) => a.pos - b.pos);

  return (
    <PracticalSheet
      number={KEY}
      title="Construct and Test a 1.2 V to 30 V Variable Regulated Supply Using LM317T"
      aim="To build a variable regulated supply with an LM317T, measure the output for different settings of the adjust resistor and verify Vout = 1.25 (1 + R2 ÷ R1)."
      apparatus={['DC input 32.5 V (24 V transformer, bridge, filter)', 'IC LM317T with heat sink', 'R1 = 220 Ω, R2 = 5 kΩ potentiometer', 'Load 1 kΩ', 'Digital multimeter']}
      procedure={[
        'R1 from OUT to ADJ, R2 (pot) from ADJ to ground.',
        'Set the pot. Supply OFF: measure R2 across ADJ–GND on Ω.',
        'Supply ON: measure Vout across OUT–GND.',
        'Calculate Vout = 1.25 × (1 + R2 ÷ R1) and compare.',
        'Repeat for at least five pot positions, including both ends.',
      ]}
      precautions={['Never measure resistance with the supply on.', 'Keep Vin at least 3 V above the highest Vout.', 'Fit a heat sink: at low Vout the IC drops most of the input voltage.']}
      viva={[
        {q: 'What is the voltage between OUT and ADJ of an LM317?', a: 'About 1.25 V (the reference voltage).'},
        {q: 'Why is R1 usually 220 or 240 Ω?', a: 'To draw at least the minimum load current (about 5 mA) the IC needs to regulate.'},
        {q: 'Minimum output of an LM317?', a: '1.25 V, when R2 = 0.'},
        {q: 'What sets the maximum output here?', a: 'R2 at its maximum, or the input voltage minus the dropout (about 2.5 V), whichever is lower.'},
      ]}
      steps={[
        {
          label: 'Set the pot, switch the supply OFF, select Ω 20k and note R2 across ADJ–GND.',
          hint: 'Never measure resistance with the supply on.',
          done: rows.some((p) => p.r2 != null),
        },
        {
          label: 'Switch ON, select DC V and note Vout across OUT–GND.',
          hint: 'Red probe on OUT, black on GND.',
          done: rows.some((p) => p.r2 != null && p.vout != null),
        },
        {
          label: 'Calculate Vout = 1.25 × (1 + R2 ÷ R1) and enter it in the table.',
          hint: 'R1 = 220 Ω. Use your measured R2.',
          done: full.length >= 1,
        },
        {label: `Repeat for five pot positions. Complete rows: ${Math.min(full.length, 5)}/5`, hint: 'Switch OFF before measuring R2 at each new position.', done: full.length >= 5},
        {label: 'Include the minimum output: pot at 0 %.', hint: 'Vout should be about 1.25 V.', done: full.some((p) => p.pos === 0)},
        {label: 'Include the maximum output: pot at 100 %.', hint: 'Vout is limited by R2 or by the input voltage.', done: full.some((p) => p.pos === 100)},
        {label: 'Enter your details and press Print / Save as PDF.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_8_80}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div>
            <div className={styles.kit}>
              <svg viewBox="0 0 520 240" role="img" aria-label="LM317 circuit: input, IC, R1 from OUT to ADJ, R2 pot from ADJ to ground, load">
                <rect x={14} y={60} width={96} height={100} rx={8} fill="#31414c" stroke="#4d5f6b" />
                <text x={62} y={96} textAnchor="middle" style={kitLabel}>
                  {power ? `${VIN317} V` : 'OFF'}
                </text>
                <text x={62} y={116} textAnchor="middle" style={{...kitLabel, fontSize: 10, fill: '#9fb0ba'}}>
                  DC input
                </text>
                <path className={styles.wire} d="M110 80 H190 M290 80 H440 V110 M360 80 V110 M360 150 V160 M240 110 V180 H360 M360 210 V215 M110 140 H130 V215 H440 V160" fill="none" />
                <rect x={190} y={60} width={100} height={50} rx={4} fill="#1d1d1d" />
                <text x={240} y={90} textAnchor="middle" style={kitLabel}>
                  LM317T
                </text>
                <text x={196} y={76} style={{...kitLabel, fontSize: 9}}>
                  IN
                </text>
                <text x={284} y={76} textAnchor="end" style={{...kitLabel, fontSize: 9}}>
                  OUT
                </text>
                <text x={240} y={106} textAnchor="middle" style={{...kitLabel, fontSize: 9}}>
                  ADJ
                </text>
                <rect x={350} y={110} width={20} height={40} rx={3} fill="#e8d7b0" />
                <text x={376} y={134} style={{...kitLabel, fontSize: 10}}>
                  R1 220 Ω
                </text>
                <rect x={350} y={160} width={20} height={50} rx={3} fill="#9aa3a8" />
                <path d={`M340 ${210 - pos * 0.5} L352 ${210 - pos * 0.5}`} stroke="#ffcf3f" strokeWidth={3} />
                <text x={376} y={190} style={{...kitLabel, fontSize: 10}}>
                  R2 pot {pos} %
                </text>
                <rect x={430} y={110} width={20} height={50} rx={3} fill="#e8d7b0" />
                <text x={456} y={140} style={{...kitLabel, fontSize: 10}}>
                  1 kΩ
                </text>
                <ProbePoint id="IN@1" x={150} y={80} probes={probes} label="Input" r={5} />
                <ProbePoint id="OUT@1" x={320} y={80} probes={probes} label="Output" r={5} />
                <ProbePoint id="ADJ@1" x={300} y={180} probes={probes} label="ADJ (R1–R2 junction)" r={5} />
                <ProbePoint id="G@1" x={250} y={215} probes={probes} label="Ground" r={5} />
              </svg>
            </div>
            <ProbeBar probes={probes} />
          </div>
          <div style={{display: 'grid', gap: '0.6rem', alignContent: 'start'}}>
            <Multimeter
              name="Digital multimeter"
              fn={fn}
              functions={[...DCV_FNS, {fn: 'r20k', label: 'Ω 20k'}]}
              text={text}
              unit={text === 'OL' || text === 'Err' ? '' : unit}
              onFunction={(f) => (setNote(null), setFn(f))}
            />
            <div className={clsx(styles.card, styles.noPrint)}>
              <label className={styles.knobLabel} style={{display: 'block'}}>
                R2 POT: {pos} %
                <input className={styles.range} type="range" min={0} max={100} step={5} value={pos} onChange={(e) => setPos(Number(e.target.value))} />
              </label>
              <button type="button" className={styles.btn} style={{marginTop: '0.4rem'}} onClick={() => (setPower((p) => !p), setNote(null))}>
                Supply {power ? 'OFF' : 'ON'}
              </button>
            </div>
            <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} onClick={noteIt}>
              Note reading
            </button>
          </div>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {rows.length === 0 ? (
          <Empty>No readings yet.</Empty>
        ) : (
          <Table
            head={['Pot', 'R2 (kΩ)', 'Vout measured (V)', 'Vout = 1.25 (1 + R2 ÷ 220)', 'Check']}
            rows={sorted.map((p) => [
              `${p.pos} %`,
              p.r2 ?? '–',
              p.vout ?? '–',
              <input className={styles.input} style={{maxWidth: '5rem'}} inputMode="decimal" aria-label={`Calculated Vout at ${p.pos} percent`} value={p.calc ?? ''} disabled={!p.r2} onChange={(e) => setRows((r) => r.map((x) => (x.pos === p.pos ? {...x, calc: e.target.value} : x)))} />,
              p.calc && p.vout ? (
                <Verdict
                  ok={measOk(p) && calcOk(p)}
                  fix={{
                    hint: L2('Vout = 1.25 × (1 + R2 ÷ R1), with R1 = 220 Ω and R2 in ohms (the kΩ value × 1000). Measure R2 with the supply off.', 'Vout = 1.25 × (1 + R2 ÷ R1), R1 = 220 Ω અને R2 ઓહ્મમાં (kΩ કિંમત × 1000). R2 સપ્લાય બંધ રાખીને માપો.'),
                    work: p.r2 != null ? L2(`1.25 × (1 + ${fmt(Number(p.r2) * 1000)} ÷ ${R1}) = ${fmt(1.25 * (1 + (Number(p.r2) * 1000) / R1))} V.`, `1.25 × (1 + ${fmt(Number(p.r2) * 1000)} ÷ ${R1}) = ${fmt(1.25 * (1 + (Number(p.r2) * 1000) / R1))} V.`) : undefined,
                    answer: p.r2 != null ? `${fmt(1.25 * (1 + (Number(p.r2) * 1000) / R1))} V` : undefined,
                    entered: num(p.calc),
                    expected: p.r2 != null ? 1.25 * (1 + (Number(p.r2) * 1000) / R1) : null,
                  }}
                />
              ) : (
                '–'
              ),
            ])}
          />
        )}
        {full.length > 1 && <XYGraph series={[{id: 'v', label: 'Vout', color: 'var(--s1)', marker: 'circle', points: full.map((p) => ({x: Number(p.r2), y: Number(p.vout)}))}]} xLabel="R2 (kΩ)" yLabel="Vout (V)" xUnit="kΩ" yUnit="V" />}
        <ResetKit
          onReset={() => {
            setRows([]);
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}

