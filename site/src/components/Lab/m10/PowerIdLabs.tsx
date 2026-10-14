import React, {useEffect, useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import Multimeter from '../Multimeter';
import useStoredState from '../useStoredState';
import {ProbeBar, ProbePoint, useProbes} from '../Probes';
import {NoteBox, ResetKit, Section, Table, Verdict, shuffle, useKitSeed, useRng, type Note} from '../kit';
import {PartGrid} from '../m07/IdentifyLabs';
import {PartArt, type PartKind} from '../m07/art';
import {kitLabel, near} from '../m07/parts';
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

// ---------------------------------------------------------------------------
// 1.10.96 Identify power electronic components
// ---------------------------------------------------------------------------

interface Dev {
  id: string;
  mark: string;
  kind: PartKind;
  pin1: string;
  amps: number;
  volts: number;
}
const DEVS: Dev[] = [
  {id: 'scr', mark: 'TYN612 SCR', kind: 'to220', pin1: 'K', amps: 12, volts: 600},
  {id: 'triac', mark: 'BT136 TRIAC', kind: 'to220', pin1: 'MT1', amps: 4, volts: 600},
  {id: 'diac', mark: 'DB3', kind: 'signalDiode', pin1: 'MT', amps: 2, volts: 32},
  {id: 'ujt', mark: '2N2646', kind: 'to39', pin1: 'E', amps: 0.05, volts: 35},
  {id: 'jfet', mark: 'BFW10', kind: 'to39', pin1: 'S', amps: 0.02, volts: 30},
  {id: 'mosfet', mark: 'IRFZ44N MOSFET', kind: 'to220', pin1: 'G', amps: 49, volts: 55},
  {id: 'igbt', mark: 'FGA25N120 IGBT', kind: 'to220', pin1: 'G', amps: 25, volts: 1200},
  {id: 'pd', mark: '6A10', kind: 'diode', pin1: 'A', amps: 6, volts: 1000},
];
const DEV_NAME: Record<string, string> = {scr: 'SCR (thyristor)', triac: 'TRIAC', diac: 'DIAC', ujt: 'UJT', jfet: 'JFET', mosfet: 'Power MOSFET', igbt: 'IGBT', pd: 'Power diode'};
const DATA: string[][] = [
  ['TYN612', 'SCR', '12 A, 600 V', 'K – A – G'],
  ['BT136', 'TRIAC', '4 A, 600 V', 'MT1 – MT2 – G'],
  ['DB3', 'DIAC', 'breakover 32 V, 2 A pulse', 'MT – MT (no polarity)'],
  ['2N2646', 'UJT', '50 mA, 35 V (VB2B1)', 'E – B1 – B2'],
  ['BFW10', 'N-channel JFET', '20 mA, 30 V (IDSS 8–20 mA)', 'S – D – G'],
  ['IRFZ44N', 'N-channel power MOSFET', '49 A, 55 V', 'G – D – S'],
  ['FGA25N120', 'IGBT', '25 A, 1200 V', 'G – C – E'],
  ['6A10', 'Power rectifier diode', '6 A, 1000 V', 'A – K (band)'],
];

export function PowerDevicesLab(): React.JSX.Element {
  const KEY = '1.10.96';
  const [seed, newKit] = useKitSeed(KEY);
  const items = useRng(seed, (rnd) => shuffle(DEVS, rnd));
  const [ans, setAns] = useStoredState<Record<number, {dev?: string; pin1?: string; a?: string; v?: string}>>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const set = (k: number, p: object) => setAns((x) => ({...x, [k]: {...x[k], ...p}}));
  const ok = (k: number) => {
    const a = ans[k] ?? {};
    const d = items[k];
    return a.dev === d.id && a.pin1 === d.pin1 && near(num(a.a), d.amps, 0.001) && near(num(a.v), d.volts, 0.001);
  };
  const pins = [...new Set(DEVS.map((d) => d.pin1)), 'D', 'C', 'B1', 'MT2'].map((p) => [p, p] as [string, string]);

  return (
    <PracticalSheet
      number={KEY}
      title="Identify Power Electronic Components, Their Specifications and Terminals"
      aim="To identify SCR, TRIAC, DIAC, UJT, JFET, power MOSFET, IGBT and power diode by type number, and find their ratings and terminals from a data sheet."
      apparatus={['Eight power electronic components (below)', 'Data sheet extract']}
      procedure={['Read the type number on each part.', 'Look it up: device, rating and pin-out (pins 1-2-3 from the left, printed face towards you).', 'Fill in the table.']}
      precautions={['MOSFETs and IGBTs are damaged by static: hold them by the body and keep the leads shorted until fitted.', 'Pin-outs differ: always check the data sheet.']}
      viva={[
        {q: 'Difference between an SCR and a TRIAC?', a: 'An SCR conducts in one direction only; a TRIAC conducts in both, so it can control AC power.'},
        {q: 'What is a DIAC used for?', a: 'To trigger a TRIAC: it conducts in either direction once the voltage exceeds its breakover (about 32 V).'},
        {q: 'Why is an IGBT used in inverters and drives?', a: 'It combines the easy voltage gate drive of a MOSFET with the low on-state loss of a BJT at high voltage.'},
        {q: 'Terminals of a UJT?', a: 'Emitter (E), base 1 (B1) and base 2 (B2).'},
      ]}
      tasks={[
        {label: 'Identify all eight with ratings and pin 1.', done: items.every((_, k) => ok(k))},
        {label: 'Print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Component tray">
        <PartGrid parts={items.map((d) => ({kind: d.kind, o: {mark: d.mark}}))} label="Eight power electronic components" />
        <details style={{marginTop: '0.6rem'}}>
          <summary className={styles.muted} style={{cursor: 'pointer'}}>
            Data sheet extract
          </summary>
          <Table head={['Type', 'Device', 'Rating', 'Pins 1 – 2 – 3']} rows={DATA} />
        </details>
      </Section>
      <Section title="Observation table">
        <Table
          head={['No.', 'Marking', 'Device', 'Pin 1', 'Current (A)', 'Voltage (V)', 'Check']}
          rows={items.map((d, k) => [
            k + 1,
            <span className={styles.num}>{d.mark.split(' ')[0]}</span>,
            sel(
              `Part ${k + 1} device`,
              ans[k]?.dev,
              Object.entries(DEV_NAME),
              (v) => set(k, {dev: v}),
            ),
            sel(`Part ${k + 1} pin 1`, ans[k]?.pin1, pins, (v) => set(k, {pin1: v})),
            <input className={styles.input} style={{maxWidth: '4.5rem'}} inputMode="decimal" aria-label={`Part ${k + 1} current`} value={ans[k]?.a ?? ''} onChange={(e) => set(k, {a: e.target.value})} />,
            <input className={styles.input} style={{maxWidth: '4.5rem'}} inputMode="decimal" aria-label={`Part ${k + 1} voltage`} value={ans[k]?.v ?? ''} onChange={(e) => set(k, {v: e.target.value})} />,
            Object.keys(ans[k] ?? {}).length === 4 ? <Verdict ok={ok(k)} /> : '–',
          ])}
        />
        <p className={styles.muted}>Use the first rating given in the data sheet (e.g. DIAC: 2 A, 32 V; UJT: 0.05 A, 35 V).</p>
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
// Gate-charge test model shared by 1.10.101 (MOSFET) and 1.10.103 (IGBT)
// ---------------------------------------------------------------------------

type Fault = 'good' | 'dsShort' | 'gsShort' | 'open';
interface Sw {
  mark: string;
  kind: PartKind;
  igbt: boolean;
  pch: boolean;
  /** Leads 1-2-3 → terminal names (G/D/S or G/C/E). */
  pins: string[];
  /** Gate threshold (V). */
  vth: number;
  /** Has an internal (body or co-pack) diode. */
  diode: boolean;
  fault: Fault;
}

const DMM_V = 3; // diode-test open-circuit voltage

/** Reading between lead a (red) and lead b (black). */
function swReading(d: Sw, charged: boolean, a: number, b: number, fn: string): string {
  if (fn === 'off') return '';
  let ta = d.pins[a];
  let tb = d.pins[b];
  const [D, S] = d.igbt ? ['C', 'E'] : ['D', 'S'];
  // A gate–source short makes the gate act as the source for the drain.
  if (d.fault === 'gsShort') {
    if (ta === 'G' && tb === D) ta = S;
    else if (tb === 'G' && ta === D) tb = S;
  }
  const pair = new Set([ta, tb]);
  let v: number | null = null;
  if (d.fault === 'open') v = null;
  else if (pair.has(D) && pair.has(S)) {
    if (d.fault === 'dsShort') v = 0.004;
    else if (charged) {
      // Channel on: for a MOSFET a few ohms, for an IGBT a junction drop in one direction.
      const fwd = d.pch ? ta === S : ta === D;
      v = d.igbt ? (fwd ? 0.82 : d.diode ? 0.42 : null) : 0.03;
    } else {
      // Body / co-pack diode: anode at S (N-ch) or D (P-ch).
      const anodeRed = d.pch ? ta === D : ta === S;
      v = d.diode && anodeRed ? (d.igbt ? 0.42 : 0.51) : null;
    }
  } else if (pair.has('G')) {
    v = d.fault === 'gsShort' ? 0.006 : null;
  }
  if (v == null) return 'OL';
  if (fn === 'diode') return v.toFixed(3);
  // Ω 2k: 3 V source behind 1 kΩ.
  const r = v < 0.1 ? v * 40 : v / ((DMM_V - v) / 1000);
  return (r / 1000).toFixed(3);
}

interface Log {
  diode?: boolean;
  on?: boolean;
  off?: boolean;
}

function useGateBench(kit: Sw[], key: string) {
  const [charged, setCharged] = useState<Record<number, boolean>>({});
  const [log, setLog] = useStoredState<Record<number, Log>>(`lab:${key}:log`, {});
  const [fn, setFn] = useState('off');
  const [note, setNote] = useState<Note>(null);
  const probes = useProbes();
  const [ri, rt] = (probes.red ?? ':').split(':');
  const [bi, bt] = (probes.black ?? ':').split(':');
  const on = ri && ri === bi && rt !== bt ? Number(ri) : null;
  const d = on != null ? kit[on] : null;
  const ta = d ? d.pins[Number(rt)] : '';
  const tb = d ? d.pins[Number(bt)] : '';

  // Probes across gate and source/emitter charge or discharge the gate.
  const S = d?.igbt ? 'E' : 'S';
  const gateEvent = d && fn !== 'off' && d.fault === 'good' && ((ta === 'G' && tb === S) || (ta === S && tb === 'G')) ? (ta === 'G' ? (d.pch ? 'off' : 'on') : d.pch ? 'on' : 'off') : null;
  const meterTurnsOn = gateEvent === 'on' && d && DMM_V >= d.vth;
  useEffect(() => {
    if (on == null) return;
    if (gateEvent === 'on' && meterTurnsOn && !charged[on]) setCharged((c) => ({...c, [on]: true}));
    if (gateEvent === 'off' && charged[on]) setCharged((c) => ({...c, [on]: false}));
  }, [on, gateEvent, meterTurnsOn, charged]);

  const text = d ? swReading(d, !!charged[on!], Number(rt), Number(bt), fn) : fn === 'off' ? '' : 'OL';
  const unit = fn === 'diode' ? 'V' : fn === 'r2k' ? 'kΩ' : '';

  const noteIt = () => {
    if (on == null || !d) return setNote({kind: 'warn', text: 'Probes on two leads of one device.'});
    if (fn === 'off') return setNote({kind: 'warn', text: 'Select diode test or Ω.'});
    const ds = new Set([ta, tb]).size === 2 && ![ta, tb].includes('G');
    const l: Log = {...log[on]};
    if (ds && !charged[on] && text !== 'OL' && Number(text) > 0.2) l.diode = true;
    if (ds && charged[on] && text !== 'OL') l.on = true;
    if (ds && !charged[on] && text === 'OL' && log[on]?.on) l.off = true;
    setLog((x) => ({...x, [on]: l}));
    setNote({kind: 'good', text: `${d.mark.split(' ')[0]}: red ${ta}, black ${tb} → ${text}${text === 'OL' ? '' : ` ${unit}`}${charged[on] ? ' (gate charged)' : ''}`});
  };
  const battery = (k: number) => {
    const x = kit[k];
    if (x.fault !== 'good') return setNote({kind: 'info', text: '9 V applied G–E.'});
    setCharged((c) => ({...c, [k]: true}));
    setNote({kind: 'info', text: `9 V battery touched G(+) to ${x.igbt ? 'E' : 'S'}(−): gate charged.`});
  };
  const shortGate = (k: number) => {
    setCharged((c) => ({...c, [k]: false}));
    setNote({kind: 'info', text: 'Gate shorted to source/emitter: gate discharged.'});
  };
  return {charged, log, setLog, fn, setFn, note, setNote, probes, on, d, text, unit, noteIt, battery, shortGate, meterTurnsOn, gateEvent};
}

function SwBench({kit, b, withBattery}: {kit: Sw[]; b: ReturnType<typeof useGateBench>; withBattery: boolean}) {
  const W = 150;
  return (
    <div className={styles.controls} style={{marginTop: 0}}>
      <div>
        <div className={styles.kit}>
          <svg viewBox={`0 0 ${W * kit.length} 170`} role="img" aria-label="Devices under test with leads 1 to 3">
            {kit.map((d, k) => (
              <g key={k} transform={`translate(${k * W} 0)`}>
                <g transform="translate(-5 4)">
                  <PartArt kind={d.kind} o={{mark: d.mark.split(' ')[0]}} />
                </g>
                {[0, 1, 2].map((p) => {
                  const x = [59, 75, 91][p];
                  return (
                    <g key={p}>
                      <line x1={x} y1={108} x2={x} y2={130} stroke="#a9b1b6" strokeWidth={2} />
                      <text x={x} y={162} textAnchor="middle" style={{...kitLabel, fontSize: 10}}>
                        {p + 1}
                      </text>
                      <ProbePoint id={`${k}:${p}`} x={x} y={136} probes={b.probes} label={`${d.mark.split(' ')[0]} lead ${p + 1}`} r={4} />
                    </g>
                  );
                })}
                <text x={75} y={16} textAnchor="middle" style={{...kitLabel, fontSize: 9, fill: b.charged[k] ? '#ffcf3f' : '#9fb0ba'}}>
                  {b.charged[k] ? 'gate charged' : ' '}
                </text>
              </g>
            ))}
          </svg>
        </div>
        <ProbeBar probes={b.probes} />
      </div>
      <div style={{display: 'grid', gap: '0.6rem', alignContent: 'start'}}>
        <Multimeter
          name="Digital multimeter"
          fn={b.fn}
          functions={[
            {fn: 'off', label: 'OFF'},
            {fn: 'diode', label: '→| Diode'},
            {fn: 'r2k', label: 'Ω 2k'},
          ]}
          text={b.text}
          unit={b.text === 'OL' ? '' : b.unit}
          placement={b.d ? b.d.mark.split(' ')[0] : undefined}
          onFunction={(f) => (b.setNote(null), b.setFn(f))}
        />
        <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} onClick={b.noteIt}>
          Note reading
        </button>
        <div className={clsx(styles.card, styles.noPrint)}>
          <span className={styles.label} style={{marginTop: 0}}>
            Gate tools (device in probes)
          </span>
          <div className={styles.seg} role="group" aria-label="Gate tools">
            {withBattery && (
              <button type="button" onClick={() => (b.on != null ? b.battery(b.on) : b.setNote({kind: 'warn', text: 'Put the probes on a device first.'}))}>
                9 V battery G–E
              </button>
            )}
            <button type="button" onClick={() => (b.on != null ? b.shortGate(b.on) : b.setNote({kind: 'warn', text: 'Put the probes on a device first.'}))}>
              Short gate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1.10.101 Identify power MOSFETs and test with a multimeter
// ---------------------------------------------------------------------------

const MOS: Omit<Sw, 'fault'>[] = [
  {mark: 'IRFZ44N', kind: 'to220', igbt: false, pch: false, pins: ['G', 'D', 'S'], vth: 2.5, diode: true},
  {mark: 'IRF540N', kind: 'to220', igbt: false, pch: false, pins: ['G', 'D', 'S'], vth: 2.8, diode: true},
  {mark: 'IRF9540', kind: 'to220', igbt: false, pch: true, pins: ['G', 'D', 'S'], vth: 2.6, diode: true},
  {mark: 'IRF840', kind: 'to220', igbt: false, pch: false, pins: ['G', 'D', 'S'], vth: 2.9, diode: true},
  {mark: '2N7000', kind: 'to92', igbt: false, pch: false, pins: ['S', 'G', 'D'], vth: 1.8, diode: true},
];
const MOS_DATA = [
  ['IRFZ44N', 'N-channel, 49 A, 55 V', 'G D S'],
  ['IRF540N', 'N-channel, 33 A, 100 V', 'G D S'],
  ['IRF9540', 'P-channel, −23 A, −100 V', 'G D S'],
  ['IRF840', 'N-channel, 8 A, 500 V', 'G D S'],
  ['2N7000', 'N-channel small signal, 0.2 A, 60 V', 'S G D'],
];

function TestTable({kit, b, ans, setAns, pinLabel}: {kit: Sw[]; b: ReturnType<typeof useGateBench>; ans: Record<number, {ch?: string; cond?: string}>; setAns: (f: (x: Record<number, {ch?: string; cond?: string}>) => Record<number, {ch?: string; cond?: string}>) => void; pinLabel: string}) {
  const yes = (x?: boolean) => (x ? '✓' : '–');
  return (
    <Table
      head={['Device', `Pins 1-2-3`, 'Diode seen', 'Turned ON', 'Turned OFF', kit[0].igbt ? 'Type' : 'Channel', 'Condition', 'Check']}
      rows={kit.map((d, k) => {
        const l = b.log[k] ?? {};
        const a = ans[k] ?? {};
        const set = (p: object) => setAns((x) => ({...x, [k]: {...x[k], ...p}}));
        const ok = a.cond === (d.fault === 'good' ? 'good' : 'bad') && (d.igbt ? a.ch === (d.diode ? 'diode' : 'nodiode') : a.ch === (d.pch ? 'p' : 'n'));
        return [
          d.mark,
          <span className={styles.num}>{d.pins.join(' ')}</span>,
          yes(l.diode),
          yes(l.on),
          yes(l.off),
          sel(
            `${d.mark} ${pinLabel}`,
            a.ch,
            d.igbt
              ? [
                  ['diode', 'With co-pack diode'],
                  ['nodiode', 'No diode'],
                ]
              : [
                  ['n', 'N-channel'],
                  ['p', 'P-channel'],
                ],
            (v) => set({ch: v}),
          ),
          sel(
            `${d.mark} condition`,
            a.cond,
            [
              ['good', 'Good'],
              ['bad', 'Faulty'],
            ],
            (v) => set({cond: v}),
          ),
          a.ch && a.cond ? <Verdict ok={ok} /> : '–',
        ];
      })}
    />
  );
}

export function MosfetTestLab(): React.JSX.Element {
  const KEY = '1.10.101';
  const [seed, newKit] = useKitSeed(KEY);
  const kit = useRng(seed, (rnd) => {
    const four = shuffle(MOS, rnd).slice(0, 4);
    const bad = Math.floor(rnd() * 4);
    return four.map((m, k): Sw => ({...m, fault: k === bad ? (rnd() < 0.5 ? 'dsShort' : 'gsShort') : 'good'}));
  });
  const b = useGateBench(kit, KEY);
  const [ans, setAns] = useStoredState<Record<number, {ch?: string; cond?: string}>>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const tested = (k: number) => (kit[k].fault === 'good' ? !!(b.log[k]?.diode && b.log[k]?.on && b.log[k]?.off) : true);
  const rowOk = (k: number) => ans[k]?.cond === (kit[k].fault === 'good' ? 'good' : 'bad') && ans[k]?.ch === (kit[k].pch ? 'p' : 'n');

  return (
    <PracticalSheet
      number={KEY}
      title="Identify Power MOSFETs by Number and Test Them with a Multimeter"
      aim="To identify power MOSFETs from their type numbers, and test them with a multimeter: body diode, turn-on by gate charge and turn-off."
      apparatus={['Four MOSFETs (below)', 'Digital multimeter (diode test)', 'Data sheet extract', 'Anti-static wrist strap']}
      procedure={[
        'Find G, D and S from the data sheet.',
        'Short the gate first. Diode test: red on S, black on D (N-channel) → body diode about 0.5 V. Reverse: OL.',
        'Charge the gate: red on G, black on S. Now D–S reads almost 0 in both directions (switched ON).',
        'Short G to S (or red on S, black on G): D–S goes back to OL (OFF).',
        'For a P-channel device all polarities are reversed.',
        'A low reading D–S or G–S that does not change = faulty.',
      ]}
      precautions={['Wear an anti-static strap; MOSFET gates are easily damaged.', 'Discharge the gate before each test.', 'Do not touch the leads with your fingers during the test.']}
      viva={[
        {q: 'Why does a MOSFET stay ON after the probe is removed from the gate?', a: 'The gate is insulated: the charge stays on the gate capacitance until it is discharged.'},
        {q: 'What is the body diode?', a: 'A diode formed between source and drain by the MOSFET’s construction (anode at S for N-channel).'},
        {q: 'Why is a pull-down resistor fitted from gate to source in circuits?', a: 'To discharge the gate so the MOSFET switches off when the drive is removed.'},
      ]}
      tasks={[
        {label: 'Full test on every good device (diode, ON, OFF).', done: kit.every((_, k) => tested(k))},
        {label: 'Channel and condition of all four.', done: kit.every((_, k) => rowOk(k))},
        {label: 'Print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <SwBench kit={kit} b={b} withBattery={false} />
        <details style={{marginTop: '0.6rem'}}>
          <summary className={styles.muted} style={{cursor: 'pointer'}}>
            Data sheet extract
          </summary>
          <Table head={['Type', 'Description', 'Pins 1-2-3']} rows={MOS_DATA} />
        </details>
        <NoteBox note={b.note} />
      </Section>
      <Section title="Observation table">
        <TestTable kit={kit} b={b} ans={ans} setAns={setAns} pinLabel="channel" />
        <ResetKit
          onReset={() => {
            b.setLog({});
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
// 1.10.103 Identify IGBTs by number and test with a multimeter
// ---------------------------------------------------------------------------

const IGBTS: Omit<Sw, 'fault'>[] = [
  {mark: 'FGA25N120', kind: 'to220', igbt: true, pch: false, pins: ['G', 'C', 'E'], vth: 5.5, diode: true},
  {mark: 'IKW40N120', kind: 'to220', igbt: true, pch: false, pins: ['G', 'C', 'E'], vth: 5.8, diode: true},
  {mark: 'IRG4BC30U', kind: 'to220', igbt: true, pch: false, pins: ['G', 'C', 'E'], vth: 4.5, diode: false},
  {mark: 'GT60M303', kind: 'to220', igbt: true, pch: false, pins: ['G', 'C', 'E'], vth: 5, diode: true},
];
const IGBT_DATA = [
  ['FGA25N120', 'IGBT 25 A, 1200 V, with anti-parallel diode', 'G C E'],
  ['IKW40N120', 'IGBT 40 A, 1200 V, with anti-parallel diode', 'G C E'],
  ['IRG4BC30U', 'IGBT 23 A, 600 V, no diode', 'G C E'],
  ['GT60M303', 'IGBT 60 A, 900 V, with diode (induction cooker)', 'G C E'],
];

export function IgbtTestLab(): React.JSX.Element {
  const KEY = '1.10.103';
  const [seed, newKit] = useKitSeed(KEY);
  const kit = useRng(seed, (rnd) => {
    const bad = Math.floor(rnd() * 4);
    return shuffle(IGBTS, rnd).map((m, k): Sw => ({...m, fault: k === bad ? 'dsShort' : 'good'}));
  });
  const b = useGateBench(kit, KEY);
  const [ans, setAns] = useStoredState<Record<number, {ch?: string; cond?: string}>>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [triedMeter, setTriedMeter] = useStoredState(`lab:${KEY}:meter`, false);
  useEffect(() => {
    if (b.gateEvent === 'on' && !b.meterTurnsOn && !triedMeter) setTriedMeter(true);
  }, [b.gateEvent, b.meterTurnsOn, triedMeter, setTriedMeter]);
  const tested = (k: number) => (kit[k].fault === 'good' ? !!(b.log[k]?.on && b.log[k]?.off) : true);
  const rowOk = (k: number) => ans[k]?.cond === (kit[k].fault === 'good' ? 'good' : 'bad') && ans[k]?.ch === (kit[k].diode ? 'diode' : 'nodiode');

  return (
    <PracticalSheet
      number={KEY}
      title="Identify IGBTs by Number and Test Them with a Multimeter"
      aim="To identify IGBTs from their type numbers and test them: anti-parallel diode, turn-on with a 9 V gate charge, and turn-off."
      apparatus={['Four IGBTs (below)', 'Digital multimeter (diode test)', '9 V battery with leads', 'Data sheet extract']}
      procedure={[
        'Find G, C and E from the data sheet. Short the gate first.',
        'Diode test: red on E, black on C → about 0.4 V if the IGBT has a built-in diode. Reverse (red C, black E): OL.',
        'Try to switch it on with the meter (red G, black E): the meter’s 3 V is below the IGBT threshold (5–6 V), so nothing happens.',
        'Touch the 9 V battery + to G and − to E. Now red C, black E reads about 0.8 V: ON.',
        'Short G to E: C–E returns to OL.',
      ]}
      precautions={['Handle IGBTs as static-sensitive devices.', 'Touch the 9 V battery to the gate only briefly.', 'Always discharge the gate before and after the test.']}
      viva={[
        {q: 'Why can a multimeter not switch an IGBT on?', a: 'Its gate threshold is about 5–6 V, higher than a meter’s test voltage (about 3 V).'},
        {q: 'Why do many IGBTs have a built-in diode?', a: 'For freewheeling current in inductive loads such as motors and inverters.'},
        {q: 'IGBT terminals?', a: 'Gate, collector and emitter.'},
      ]}
      tasks={[
        {label: 'Try the meter alone on the gate (and see it fail).', done: triedMeter},
        {label: 'Full test on every good IGBT (ON with 9 V, OFF).', done: kit.every((_, k) => tested(k))},
        {label: 'Diode and condition of all four.', done: kit.every((_, k) => rowOk(k))},
        {label: 'Print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <SwBench kit={kit} b={b} withBattery />
        <details style={{marginTop: '0.6rem'}}>
          <summary className={styles.muted} style={{cursor: 'pointer'}}>
            Data sheet extract
          </summary>
          <Table head={['Type', 'Description', 'Pins 1-2-3']} rows={IGBT_DATA} />
        </details>
        <NoteBox note={b.note} />
      </Section>
      <Section title="Observation table">
        <TestTable kit={kit} b={b} ans={ans} setAns={setAns} pinLabel="diode" />
        <ResetKit
          onReset={() => {
            b.setLog({});
            setAns({});
            setTriedMeter(false);
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}
