import React, {useMemo, useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import {GU_1_9_84, GU_1_9_85, GU_1_9_86, GU_1_9_87} from './gu';
import Multimeter from '../Multimeter';
import XYGraph from '../XYGraph';
import useStoredState from '../useStoredState';
import {ProbeBar, ProbePoint, useProbes, type Probes} from '../Probes';
import {useScope} from '../Scope';
import {fgFreq, useFunctionGenerator} from '../FunctionGenerator';
import {si, type Sig} from '../signals';
import {Empty, NoteBox, ResetKit, Section, Table, Verdict, useKitSeed, useRng, type Note} from '../kit';
import {kitLabel, near} from '../m07/parts';
import {VT, biasOf, ceSwing, hp, lp, par, type BiasKind, type BiasValues, type Q} from './bjt';
import {DC, METER_FNS, Res, Stage, acRms, meterRead, stageSignal} from './amp';
import styles from '../styles.module.css';

const num = (s?: string) => (s && s.trim() !== '' && !Number.isNaN(Number(s)) ? Number(s) : null);
const VCC = 12;
const inp = (label: string, value: string | undefined, onChange: (v: string) => void, w = '5rem') => (
  <input className={styles.input} style={{maxWidth: w}} inputMode="decimal" aria-label={label} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
);

/** Meter across two probe nodes from a node → signal map. */
function useNodeMeter(nodes: Record<string, Sig>, probes: Probes) {
  const [fn, setFn] = useState('off');
  const node = (id: string | null) => (id ? nodes[id.split('@')[0]] ?? null : null);
  const a = node(probes.red);
  const b = node(probes.black);
  const r = meterRead(fn, a && b && probes.red !== probes.black ? a : null, a && b && probes.red !== probes.black ? b : null);
  const pair = [probes.red?.split('@')[0], probes.black?.split('@')[0]];
  return {fn, setFn, ...r, red: pair[0], black: pair[1]};
}

function GroundAndPads({probes, pads}: {probes: Probes; pads: {id: string; x: number; y: number; label: string; text?: string}[]}) {
  return (
    <>
      {pads.map((p) => (
        <g key={p.id + p.x}>
          {p.text && (
            <text x={p.x} y={p.y - 10} textAnchor="middle" style={{...kitLabel, fontSize: 10}}>
              {p.text}
            </text>
          )}
          <ProbePoint id={`${p.id}@${p.x}`} x={p.x} y={p.y} probes={probes} label={p.label} r={4} />
        </g>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// 1.9.84 Fixed, emitter and voltage-divider bias
// ---------------------------------------------------------------------------

const BIAS: Record<BiasKind, {name: string; v: BiasValues; labels: {r1: string; r2?: string; rc: string; re?: string}}> = {
  fixed: {name: 'Fixed bias', v: {vcc: VCC, rb: 1e6, rc: 2200, re: 0}, labels: {r1: 'Rb 1M', rc: 'Rc 2.2k'}},
  emitter: {name: 'Emitter bias', v: {vcc: VCC, rb: 1e6, rc: 2200, re: 1000}, labels: {r1: 'Rb 1M', rc: 'Rc 2.2k', re: 'Re 1k'}},
  divider: {name: 'Voltage-divider bias', v: {vcc: VCC, r1: 47e3, r2: 10e3, rc: 2200, re: 1000}, labels: {r1: 'R1 47k', r2: 'R2 10k', rc: 'Rc 2.2k', re: 'Re 1k'}},
};
const KINDS: BiasKind[] = ['fixed', 'emitter', 'divider'];

interface BRow {
  vb?: string;
  ve?: string;
  vc?: string;
  ic?: string;
  vce?: string;
}

export function BiasLab(): React.JSX.Element {
  const KEY = '1.9.84';
  const [seed, newKit] = useKitSeed(KEY);
  const betas = useRng(seed, (rnd) => ({A: Math.round(140 + rnd() * 30), B: Math.round(280 + rnd() * 50)}));
  const [kind, setKind] = useState<BiasKind>('fixed');
  const [tr, setTr] = useState<'A' | 'B'>('A');
  const [power, setPower] = useState(false);
  const [rows, setRows] = useStoredState<Record<string, BRow>>(`lab:${KEY}:rows`, {});
  const [pct, setPct] = useStoredState<Record<string, string>>(`lab:${KEY}:pct`, {});
  const [best, setBest] = useStoredState(`lab:${KEY}:best`, '');
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);
  const probes = useProbes();

  const qOf = (k: BiasKind, t: 'A' | 'B') => biasOf(k, BIAS[k].v, betas[t]);
  const q = qOf(kind, tr);
  const nodes: Record<string, Sig> = power ? {B: DC(q.vb), E: DC(q.ve), C: DC(q.vc), G: DC(0), V: DC(VCC)} : {B: DC(0), E: DC(0), C: DC(0), G: DC(0), V: DC(0)};
  const m = useNodeMeter(nodes, probes);
  const key = `${kind}-${tr}`;

  const change = (f: () => void) => {
    if (power) return setNote({kind: 'warn', text: 'Switch off before changing the circuit or transistor.'});
    setNote(null);
    probes.clear();
    f();
  };
  const noteIt = () => {
    if (!power) return setNote({kind: 'warn', text: 'Supply is off.'});
    if (m.fn !== 'dcv20') return setNote({kind: 'warn', text: 'Use DC V 20.'});
    if (m.black !== 'G') return setNote({kind: 'warn', text: 'Black probe on ground; red on B, E or C.'});
    const f = m.red === 'B' ? 'vb' : m.red === 'E' ? 've' : m.red === 'C' ? 'vc' : null;
    if (!f) return setNote({kind: 'warn', text: 'Red probe on B, E or C.'});
    setRows((r) => ({...r, [key]: {...r[key], [f]: m.text}}));
    setNote({kind: 'good', text: `${BIAS[kind].name}, transistor ${tr}: V${m.red} = ${m.text} V`});
  };

  const rowOk = (k: BiasKind, t: 'A' | 'B') => {
    const r = rows[`${k}-${t}`] ?? {};
    const tq = qOf(k, t);
    const vc = num(r.vc);
    const ve = num(r.ve);
    return (
      r.vb != null && r.ve != null && vc != null && ve != null &&
      near(vc, tq.vc, 0.02) &&
      near(num(r.ic), ((VCC - vc) / BIAS[k].v.rc) * 1000, 0.03) &&
      Math.abs((num(r.vce) ?? 99) - (vc - ve)) < 0.05
    );
  };
  const pctTrue = (k: BiasKind) => {
    const a = num(rows[`${k}-A`]?.ic);
    const b = num(rows[`${k}-B`]?.ic);
    return a && b ? ((b - a) / a) * 100 : null;
  };
  const pctOk = (k: BiasKind) => {
    const t = pctTrue(k);
    return t != null && Math.abs((num(pct[k]) ?? 1e9) - t) <= Math.max(1, Math.abs(t) * 0.03);
  };

  return (
    <PracticalSheet
      number={KEY}
      title="Fixed Bias, Emitter Bias and Voltage-Divider Bias"
      aim="To build fixed, emitter and voltage-divider bias circuits, measure their operating point with two transistors of different β, and compare their stability."
      apparatus={['12 V DC supply', 'Two BC547 transistors, A and B (different β)', 'Resistors as shown', 'Digital multimeter']}
      procedure={[
        'Build the circuit with transistor A. Measure VB, VE and VC to ground.',
        'Ic = (Vcc − Vc) ÷ Rc. Vce = Vc − Ve.',
        'Switch off, replace with transistor B, and measure again.',
        'Repeat for all three bias circuits.',
        '% change in Ic = (Ic(B) − Ic(A)) ÷ Ic(A) × 100. The smallest change = most stable.',
      ]}
      precautions={['Switch off before changing the transistor.', 'Black probe on ground for every reading.', 'Check the transistor pins (C B E) before fitting.']}
      viva={[
        {q: 'Why is fixed bias unstable?', a: 'Ic = β × Ib and Ib is fixed, so any change in β (new transistor or heat) changes Ic directly.'},
        {q: 'How does an emitter resistor stabilise the Q point?', a: 'If Ic rises, VE rises, so VBE and Ib fall: negative feedback.'},
        {q: 'Why is voltage-divider bias the most stable?', a: 'The divider fixes the base voltage almost independently of β, and Re sets the emitter current.'},
        {q: 'What is thermal runaway?', a: 'Heat raises Ic, which heats the transistor more, until it is destroyed. Good bias prevents it.'},
      ]}
      steps={[
        ...KINDS.map((k) => ({label: `${BIAS[k].name}: measure and work out both transistors.`, hint: 'Do transistor A, then B. Fill the table.', done: rowOk(k, 'A') && rowOk(k, 'B')})),
        {label: 'Work out the % change in Ic for each circuit.', hint: 'Compare transistor A with B.', done: KINDS.every(pctOk)},
        {label: 'Pick the most stable bias circuit.', hint: 'The smallest % change.', done: best === 'divider'},
        {label: 'Enter your details and print or save the record.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_9_84}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={clsx(styles.seg, styles.noPrint)} role="group" aria-label="Bias circuit" style={{marginBottom: '0.5rem'}}>
          {KINDS.map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => change(() => setKind(k))}>
              {BIAS[k].name}
            </button>
          ))}
          <button type="button" aria-pressed={tr === 'A'} onClick={() => change(() => setTr('A'))}>
            Transistor A
          </button>
          <button type="button" aria-pressed={tr === 'B'} onClick={() => change(() => setTr('B'))}>
            Transistor B
          </button>
        </div>
        <div className={styles.controls} style={{marginTop: 0}}>
          <div>
            <div className={styles.kit}>
              <svg viewBox="0 0 300 280" role="img" aria-label={`${BIAS[kind].name} circuit with transistor ${tr}`}>
                <Stage x={30} kind="ce" divider={kind === 'divider'} labels={BIAS[kind].labels} ids={{b: 'B', c: 'C', e: 'E'}} probes={probes} name={`Transistor ${tr}`} />
                <text x={150} y={14} textAnchor="middle" style={{...kitLabel, fill: power ? '#ffcf3f' : '#9fb0ba'}}>
                  +12 V {power ? 'ON' : 'OFF'}
                </text>
                <GroundAndPads probes={probes} pads={[{id: 'G', x: 20, y: 240, label: 'Ground', text: 'GND'}]} />
              </svg>
            </div>
            <ProbeBar probes={probes} />
          </div>
          <div style={{display: 'grid', gap: '0.6rem', alignContent: 'start'}}>
            <button type="button" className={clsx(styles.btn, styles.noPrint)} onClick={() => (setPower((p) => !p), setNote(null))}>
              Supply {power ? 'OFF' : 'ON'}
            </button>
            <Multimeter name="Digital multimeter" fn={m.fn} functions={METER_FNS.slice(0, 2)} text={m.text} unit={m.unit} onFunction={(f) => (setNote(null), m.setFn(f))} />
            <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} onClick={noteIt}>
              Note reading
            </button>
          </div>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        <Table
          head={['Circuit', 'Tr.', 'VB', 'VE', 'VC', 'Ic (mA)', 'Vce (V)', 'Check']}
          rows={KINDS.flatMap((k) =>
            (['A', 'B'] as const).map((t) => {
              const r = rows[`${k}-${t}`] ?? {};
              const set = (p: BRow) => setRows((x) => ({...x, [`${k}-${t}`]: {...x[`${k}-${t}`], ...p}}));
              return [
                BIAS[k].name,
                t,
                r.vb ?? '–',
                r.ve ?? '–',
                r.vc ?? '–',
                inp(`${BIAS[k].name} ${t} collector current`, r.ic, (v) => set({ic: v})),
                inp(`${BIAS[k].name} ${t} Vce`, r.vce, (v) => set({vce: v})),
                r.ic && r.vce ? <Verdict ok={rowOk(k, t)} /> : '–',
              ];
            }),
          )}
        />
      </Section>
      <Section title="Result">
        <Table
          head={['Circuit', '% change in Ic (A → B)', 'Check']}
          rows={KINDS.map((k) => [BIAS[k].name, inp(`${BIAS[k].name} percent change`, pct[k], (v) => setPct((p) => ({...p, [k]: v}))), pct[k] ? pctTrue(k) == null ? 'fill Ic first' : <Verdict ok={pctOk(k)} /> : '–'])}
        />
        <p>
          Most stable:{' '}
          <select className={styles.select} aria-label="Most stable bias circuit" value={best} onChange={(e) => setBest(e.target.value)}>
            <option value="">Choose…</option>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {BIAS[k].name}
              </option>
            ))}
          </select>{' '}
          {best ? <Verdict ok={best === 'divider'} /> : null}
        </p>
        <ResetKit
          onReset={() => {
            setRows({});
            setPct({});
            setBest('');
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// Shared CE / CC stage values (voltage-divider bias)
// ---------------------------------------------------------------------------

const CE_V: BiasValues = {vcc: VCC, r1: 47e3, r2: 10e3, rc: 4700, re: 1000};
const RL = 10e3;

/** Small-signal results of the CE stage at frequency f. */
function ceStage(q: Q, f: number, bypass: boolean, beta: number, reUnby = 0) {
  const re = q.ic > 0 ? VT / q.ic : Infinity;
  const rth = par(CE_V.r1!, CE_V.r2!);
  const reAc = bypass ? reUnby : CE_V.re;
  const a0 = q.sat || q.ic <= 0 ? 0 : par(CE_V.rc, RL) / (re + reAc);
  const zin = par(rth, beta * (re + reAc));
  const hIn = hp(f, 1 / (2 * Math.PI * zin * 10e-6));
  const hE = bypass ? hp(f, 1 / (2 * Math.PI * (re + rth / beta) * 100e-6)) : {mag: 1, ph: 0};
  // With the bypass capacitor the gain only falls to the unbypassed value.
  const eMag = bypass ? Math.max(hE.mag, (re + reUnby) / (re + CE_V.re)) : 1;
  const hHi = lp(f, 250e3);
  const hOut = hp(f, 1 / (2 * Math.PI * (CE_V.rc + RL) * 10e-6));
  const sw = ceSwing(q, CE_V.rc, RL);
  return {a0, mag: a0 * hIn.mag * eMag * hHi.mag * hOut.mag, ph: Math.PI + hIn.ph + (bypass ? hE.ph * 0.8 : 0) + hHi.ph + hOut.ph, zin, sw};
}

interface AmpRow {
  label: string;
  f: number;
  vin: string;
  vout: string;
  vinTrue: number;
  voutTrue: number;
  clipped: boolean;
  gain?: string;
}
const rowGainOk = (r: AmpRow) => near(num(r.gain), Number(r.vout) / Number(r.vin), 0.03) && near(Number(r.vin), r.vinTrue, 0.05) && near(Number(r.vout), r.voutTrue, 0.05);

/** Board input pad (÷10) switch. */
function Pad({pad, setPad}: {pad: boolean; setPad: (b: boolean) => void}) {
  return (
    <div className={styles.seg} role="group" aria-label="Input attenuator on the board">
      <button type="button" aria-pressed={!pad} onClick={() => setPad(false)}>
        Input direct
      </button>
      <button type="button" aria-pressed={pad} onClick={() => setPad(true)}>
        Input ÷10 pad
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1.9.85 CE amplifier with and without emitter bypass capacitor
// ---------------------------------------------------------------------------

export function CeAmpLab(): React.JSX.Element {
  const KEY = '1.9.85';
  const [seed, newKit] = useKitSeed(KEY);
  const beta = useRng(seed, (rnd) => Math.round(160 + rnd() * 120));
  const [bypass, setBypass] = useState(true);
  const [pad, setPad] = useState(true);
  const [note, setNote] = useState<Note>(null);
  const [rows, setRows] = useStoredState<AmpRow[]>(`lab:${KEY}:rows`, []);
  const [phase, setPhase] = useStoredState(`lab:${KEY}:phase`, '');
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [draft, setDraft] = useState<{vin?: string; vout?: string}>({});
  const probes = useProbes();
  const fg = useFunctionGenerator({wave: 'sine', range: 1000, dial: 1, amp: 0.5, atten: true});
  const f = fgFreq(fg.state);
  const q = biasOf('divider', CE_V, beta);
  const st = ceStage(q, f, bypass, beta);
  const gen = fg.signal;
  const vin: Sig = useMemo(() => ({fn: (t) => gen.fn(t) / (pad ? 10 : 1), period: gen.period}), [JSON.stringify(fg.state), pad]); // eslint-disable-line react-hooks/exhaustive-deps
  const vout = useMemo(() => stageSignal(vin, f, 0, st.mag, st.ph, st.sw.up, st.sw.down), [vin, f, st.mag, st.ph, st.sw.up, st.sw.down]);
  const nodes: Record<string, Sig> = {IN: vin, OUT: vout, G: DC(0), B: DC(q.vb), E: DC(q.ve), C: {fn: (t) => q.vc + vout.fn(t), period: vout.period}};
  const m = useNodeMeter(nodes, probes);
  const scope = useScope('cro', {ch1: vin, ch2: vout}, {ch1: {vdiv: 0.01, pos: 2, coupling: 'AC', on: true}, ch2: {vdiv: 1, pos: -2, coupling: 'AC', on: true}, display: 'DUAL', tdiv: 2e-4});
  const peak = st.mag * (fg.state.on ? (fg.state.atten ? fg.state.amp / 10 : fg.state.amp) / (pad ? 10 : 1) / 2 : 0);
  const clipped = peak > Math.min(st.sw.up, st.sw.down);

  const noteMeter = () => {
    if (!m.fn.startsWith('ac')) return setNote({kind: 'warn', text: 'Use an AC range for signal voltages.'});
    if (m.text === 'OL' || m.volts == null) return setNote({kind: 'warn', text: 'OL: higher range.'});
    if (m.black !== 'G') return setNote({kind: 'warn', text: 'Black probe on ground.'});
    if (m.red === 'IN') setDraft((d) => ({...d, vin: String(m.volts)}));
    else if (m.red === 'OUT') setDraft((d) => ({...d, vout: String(m.volts)}));
    else return setNote({kind: 'warn', text: 'Red probe on IN or OUT.'});
    setNote({kind: 'good', text: `V${m.red === 'IN' ? 'in' : 'out'} = ${m.text} ${m.unit}`});
  };
  const addRow = () => {
    if (!draft.vin || !draft.vout) return setNote({kind: 'warn', text: 'Note Vin and Vout first.'});
    // True rms values from the signals, for checking the trainee's readings.
    const r: AmpRow = {label: bypass ? 'With Ce' : 'Without Ce', f, vin: draft.vin, vout: draft.vout, vinTrue: acRms(vin), voutTrue: acRms(vout), clipped};
    setRows((x) => [...x, r]);
    setDraft({});
    setNote(clipped ? {kind: 'warn', text: 'Row added. The output is clipped: this is not a valid gain reading.'} : {kind: 'good', text: 'Row added.'});
  };

  const okRows = rows.filter((r) => !r.clipped && rowGainOk(r));

  return (
    <PracticalSheet
      number={KEY}
      title="CE Amplifier With and Without Emitter Bypass Capacitor"
      aim="To measure the voltage gain of a common-emitter amplifier with and without the emitter bypass capacitor, and observe phase inversion and clipping."
      apparatus={['CE amplifier board: R1 47k, R2 10k, Rc 4.7k, Re 1k, Ce 100 µF, RL 10k, BC547', 'Function generator, dual-trace CRO', 'AC millivoltmeter / DMM']}
      procedure={[
        'Set the generator to 1 kHz sine, a few mV at the amplifier input.',
        'With Ce fitted: measure Vin and Vout (AC). Gain Av = Vout ÷ Vin.',
        'Remove Ce (tap it) and measure again.',
        'Compare input and output on the CRO: note the phase.',
        'Increase the input until the output clips.',
      ]}
      precautions={['Keep the input small so the output is not clipped.', 'Use the same ground for the generator, CRO and meter.', 'Fit Ce with + towards the emitter.']}
      viva={[
        {q: 'Why does removing Ce reduce the gain?', a: 'Re is then in the AC path: negative feedback, Av ≈ Rc∥RL ÷ (re + Re).'},
        {q: 'Phase shift of a CE amplifier?', a: '180°: the output is inverted.'},
        {q: 'Why is a lower gain sometimes preferred?', a: 'Without Ce the gain is stable, less distorted, with a wider bandwidth and higher input impedance.'},
        {q: 'What causes clipping?', a: 'The output swing reaches cut-off or saturation.'},
      ]}
      steps={[
        {label: 'Measure the gain with Ce fitted.', hint: 'Keep the output unclipped.', done: okRows.some((r) => r.label === 'With Ce')},
        {label: 'Remove Ce and measure the gain again.', hint: 'Use the Ce switch on the board.', done: okRows.some((r) => r.label === 'Without Ce')},
        {label: 'Find the phase between input and output.', hint: 'Compare both traces on the CRO.', done: phase === '180'},
        {label: 'Raise the input until the output clips, and note it.', hint: 'Watch the output on the CRO.', done: rows.some((r) => r.clipped)},
        {label: 'Enter your details and print or save the record.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_9_85}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div>
            <div className={styles.kit}>
              <svg viewBox="0 0 330 280" role="img" aria-label="CE amplifier board with input, output and test points">
                <Stage x={50} kind="ce" divider labels={{r1: 'R1 47k', r2: 'R2 10k', rc: 'Rc 4.7k', re: 'Re 1k', ce: 'Ce'}} bypass={bypass} onBypass={() => (setBypass((b) => !b), setNote(null))} coupling ids={{b: 'B', c: 'C', e: 'E'}} probes={probes} name="BC547" />
                <Res x={300} y={165} label="RL" len={40} />
                <path className={styles.wire} d="M280 90 H300 V145 M300 185 V240 H280" fill="none" />
                <text x={20} y={120} style={{...kitLabel, fontSize: 10}}>
                  IN
                </text>
                <GroundAndPads
                  probes={probes}
                  pads={[
                    {id: 'IN', x: 30, y: 130, label: 'Amplifier input'},
                    {id: 'OUT', x: 300, y: 110, label: 'Amplifier output', text: 'OUT'},
                    {id: 'G', x: 30, y: 240, label: 'Ground', text: 'GND'},
                  ]}
                />
              </svg>
            </div>
            <ProbeBar probes={probes} hint="Tap Ce to fit or remove it." />
          </div>
          <div style={{display: 'grid', gap: '0.6rem', alignContent: 'start'}}>
            <Multimeter name="Millivoltmeter / DMM" fn={m.fn} functions={METER_FNS} text={m.text} unit={m.unit} onFunction={(x) => (setNote(null), m.setFn(x))} />
            <button type="button" className={clsx(styles.btn, styles.noPrint)} onClick={noteMeter}>
              Note meter reading
            </button>
            <p className={styles.muted} style={{margin: 0}}>
              Vin {draft.vin ? `${Number(draft.vin) * 1000} mV` : '–'} · Vout {draft.vout ? `${draft.vout} V` : '–'}
            </p>
            <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} onClick={addRow}>
              Add row
            </button>
          </div>
        </div>
        <NoteBox note={note} status={clipped ? {kind: 'warn', text: 'Output clipped.'} : null} />
        <div className={styles.controls}>
          <div>{scope.view}</div>
          <div style={{display: 'grid', gap: '0.5rem', alignContent: 'start'}}>
            <Pad pad={pad} setPad={setPad} />
            {fg.view}
          </div>
        </div>
      </Section>
      <Section title="Observation table">
        {rows.length === 0 ? (
          <Empty>No rows yet.</Empty>
        ) : (
          <Table
            head={['Ce', 'f', 'Vin (rms)', 'Vout (rms)', 'Output', 'Av = Vout ÷ Vin', 'Check']}
            rows={rows.map((r, k) => [
              r.label,
              si(r.f, 'Hz'),
              si(Number(r.vin), 'V'),
              si(Number(r.vout), 'V'),
              r.clipped ? 'clipped' : 'clean',
              inp(`Row ${k + 1} gain`, r.gain, (v) => setRows((x) => x.map((y, j) => (j === k ? {...y, gain: v} : y)))),
              r.clipped ? '–' : r.gain ? <Verdict ok={rowGainOk(r)} /> : '–',
            ])}
          />
        )}
      </Section>
      <Section title="Result">
        <p>
          Phase between input and output:{' '}
          <select className={styles.select} aria-label="Phase" value={phase} onChange={(e) => setPhase(e.target.value)}>
            <option value="">Choose…</option>
            <option value="0">0° (in phase)</option>
            <option value="90">90°</option>
            <option value="180">180° (inverted)</option>
          </select>{' '}
          {phase ? <Verdict ok={phase === '180'} /> : null}
        </p>
        <ResetKit
          onReset={() => {
            setRows([]);
            setPhase('');
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// 1.9.86 Common-collector (emitter follower)
// ---------------------------------------------------------------------------

const CC_V: BiasValues = {vcc: VCC, r1: 22e3, r2: 22e3, rc: 0, re: 2200};
const CC_RL = 1000;
const RS_TEST = 10e3;

export function EmitterFollowerLab(): React.JSX.Element {
  const KEY = '1.9.86';
  const [seed, newKit] = useKitSeed(KEY);
  const beta = useRng(seed, (rnd) => Math.round(160 + rnd() * 120));
  const [rs, setRs] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const [rec, setRec] = useStoredState<Record<string, string>>(`lab:${KEY}:rec`, {});
  const [ans, setAns] = useStoredState<{gain?: string; phase?: string; zin?: string}>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const probes = useProbes();
  const fg = useFunctionGenerator({wave: 'sine', range: 1000, dial: 1, amp: 2});
  const f = fgFreq(fg.state);
  const q = biasOf('divider', CC_V, beta);
  const re = VT / q.ic;
  const rle = par(CC_V.re, CC_RL);
  const a = rle / (re + rle);
  const zin = par(par(CC_V.r1!, CC_V.r2!), beta * (re + rle));
  const k = rs ? zin / (zin + RS_TEST) : 1;
  const gen = fg.signal;
  const vb: Sig = useMemo(() => ({fn: (t) => gen.fn(t) * k, period: gen.period}), [JSON.stringify(fg.state), k]); // eslint-disable-line react-hooks/exhaustive-deps
  const down = q.ic * rle;
  const vout = useMemo(() => stageSignal(vb, f, 0, a, 0, VCC - q.ve - 0.3, down), [vb, f, a, q.ve, down]);
  const nodes: Record<string, Sig> = {GEN: gen, IN: vb, OUT: vout, G: DC(0), B: DC(q.vb), E: {fn: (t) => q.ve + vout.fn(t), period: vout.period}, C: DC(VCC)};
  const m = useNodeMeter(nodes, probes);
  const scope = useScope('cro', {ch1: vb, ch2: vout}, {ch1: {vdiv: 0.5, pos: 2, coupling: 'AC', on: true}, ch2: {vdiv: 0.5, pos: -2, coupling: 'AC', on: true}, display: 'DUAL', tdiv: 2e-4});

  const noteIt = () => {
    if (m.text === 'OL' || m.volts == null) return setNote({kind: 'warn', text: 'Select a suitable range.'});
    if (m.black !== 'G') return setNote({kind: 'warn', text: 'Black probe on ground.'});
    const ac = m.fn.startsWith('ac');
    const name = `${ac ? 'AC' : 'DC'} ${m.red}${ac && (m.red === 'IN' || m.red === 'GEN') ? (rs ? ' (with 10k)' : ' (direct)') : ''}`;
    setRec((r) => ({...r, [name]: String(m.volts)}));
    setNote({kind: 'good', text: `${name}: ${m.text} ${m.unit}`});
  };

  const vinD = num(rec['AC IN (direct)']);
  const voutAc = num(rec['AC OUT']);
  const gTrue = vinD && voutAc ? voutAc / vinD : null;
  const vg = num(rec['AC GEN (with 10k)']);
  const vbr = num(rec['AC IN (with 10k)']);
  const zinTrue = vg && vbr && vg > vbr ? (RS_TEST * vbr) / (vg - vbr) : null;
  const dcOk = ['DC B', 'DC E'].every((x) => rec[x]);

  return (
    <PracticalSheet
      number={KEY}
      title="Common-Collector (Emitter Follower) Amplifier"
      aim="To measure the voltage gain, phase and input impedance of an emitter follower, and its DC levels."
      apparatus={['Emitter follower board: R1 22k, R2 22k, Re 2.2k, RL 1k, BC547', 'Test resistor 10 kΩ (switchable in series with the input)', 'Function generator, CRO, AC millivoltmeter / DMM']}
      procedure={[
        'DC: measure VB and VE. VBE ≈ 0.65 V: the emitter follows the base.',
        'Apply 1 kHz sine. Measure Vin and Vout (AC). Av = Vout ÷ Vin (just under 1).',
        'Compare the phase on the CRO.',
        'Switch in the 10 kΩ series resistor. Measure Vg (generator side) and Vb (base side).',
        'Zin = 10 kΩ × Vb ÷ (Vg − Vb).',
      ]}
      precautions={['Keep the input small enough that the output does not clip.', 'Common ground for all instruments.']}
      viva={[
        {q: 'Why is it called an emitter follower?', a: 'The emitter voltage follows the base voltage, about 0.65 V below it, with the same AC signal.'},
        {q: 'Main use of an emitter follower?', a: 'A buffer: high input impedance, low output impedance, gain ≈ 1.'},
        {q: 'Phase shift?', a: '0°: output in phase with input.'},
      ]}
      steps={[
        {label: 'Measure VB and VE (DC).', hint: 'Probe the base and the emitter.', done: dcOk},
        {label: 'Measure the voltage gain (AC).', hint: 'Output ÷ input.', done: gTrue != null && near(num(ans.gain), gTrue, 0.02)},
        {label: 'Find the phase.', hint: 'Compare both traces on the CRO.', done: ans.phase === '0'},
        {label: 'Find the input impedance with the 10 kΩ method.', hint: 'Switch in the 10 kΩ series resistor.', done: zinTrue != null && near(num(ans.zin), zinTrue, 0.04) && near(zinTrue, zin, 0.1)},
        {label: 'Enter your details and print or save the record.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_9_86}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div>
            <div className={styles.kit}>
              <svg viewBox="0 0 340 280" role="img" aria-label="Emitter follower board">
                <Stage x={60} kind="cc" divider labels={{r1: 'R1 22k', r2: 'R2 22k', re: 'Re 2.2k'}} coupling ids={{b: 'B', c: 'C', e: 'E'}} probes={probes} name="BC547" />
                <Res x={310} y={205} label="RL" len={36} />
                <path className={styles.wire} d="M290 170 H310 V187 M310 223 V240 H290" fill="none" />
                {rs ? <Res x={30} y={130} vertical={false} len={36} label="10k" /> : <path d="M12 130 H48" stroke="#2b5fd1" strokeWidth={4} />}
                <path className={styles.wire} d="M48 130 H60" fill="none" />
                <GroundAndPads
                  probes={probes}
                  pads={[
                    {id: 'GEN', x: 10, y: 130, label: 'Generator side', text: 'GEN'},
                    {id: 'IN', x: 54, y: 150, label: 'Board input (after 10k)', text: ''},
                    {id: 'OUT', x: 310, y: 160, label: 'Output', text: 'OUT'},
                    {id: 'G', x: 40, y: 240, label: 'Ground', text: 'GND'},
                  ]}
                />
                <text x={54} y={172} textAnchor="middle" style={{...kitLabel, fontSize: 10}}>
                  IN
                </text>
              </svg>
            </div>
            <ProbeBar probes={probes} />
          </div>
          <div style={{display: 'grid', gap: '0.6rem', alignContent: 'start'}}>
            <Multimeter name="Millivoltmeter / DMM" fn={m.fn} functions={METER_FNS} text={m.text} unit={m.unit} onFunction={(x) => (setNote(null), m.setFn(x))} />
            <div className={clsx(styles.seg, styles.noPrint)} role="group" aria-label="Series test resistor">
              <button type="button" aria-pressed={!rs} onClick={() => setRs(false)}>
                Input direct
              </button>
              <button type="button" aria-pressed={rs} onClick={() => setRs(true)}>
                10 kΩ in series
              </button>
            </div>
            <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} onClick={noteIt}>
              Note reading
            </button>
          </div>
        </div>
        <NoteBox note={note} />
        <div className={styles.controls}>
          <div>{scope.view}</div>
          <div>{fg.view}</div>
        </div>
      </Section>
      <Section title="Observation table">
        {Object.keys(rec).length === 0 ? <Empty>No readings yet.</Empty> : <Table head={['Measurement', 'Value (V)']} rows={Object.entries(rec).map(([k2, v]) => [k2, Number(v).toFixed(4)])} />}
      </Section>
      <Section title="Result">
        <Table
          head={['', 'Your value', 'Check']}
          rows={[
            ['Av = Vout ÷ Vin', inp('Voltage gain', ans.gain, (v) => setAns((x) => ({...x, gain: v}))), ans.gain ? gTrue == null ? 'measure first' : <Verdict ok={near(num(ans.gain), gTrue, 0.02)} /> : '–'],
            [
              'Phase',
              <select className={styles.select} aria-label="Phase" value={ans.phase ?? ''} onChange={(e) => setAns((x) => ({...x, phase: e.target.value}))}>
                <option value="">Choose…</option>
                <option value="0">0° (in phase)</option>
                <option value="180">180° (inverted)</option>
              </select>,
              ans.phase ? <Verdict ok={ans.phase === '0'} /> : '–',
            ],
            ['Zin = 10k × Vb ÷ (Vg − Vb) (Ω)', inp('Input impedance', ans.zin, (v) => setAns((x) => ({...x, zin: v})), '6rem'), ans.zin ? zinTrue == null ? 'measure Vg and Vb with 10k first' : <Verdict ok={near(num(ans.zin), zinTrue, 0.04) && near(zinTrue, zin, 0.1)} /> : '–'],
          ]}
        />
        <ResetKit
          onReset={() => {
            setRec({});
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
// 1.9.87 Two-stage RC-coupled amplifier
// ---------------------------------------------------------------------------

interface TwoRow {
  f: number;
  vin: number;
  vo1: number;
  vo2: number;
}

export function TwoStageLab(): React.JSX.Element {
  const KEY = '1.9.87';
  const [seed, newKit] = useKitSeed(KEY);
  const betas = useRng(seed, (rnd) => [Math.round(160 + rnd() * 120), Math.round(160 + rnd() * 120)]);
  const [pad, setPad] = useState(true);
  const [note, setNote] = useState<Note>(null);
  const [rows, setRows] = useStoredState<TwoRow[]>(`lab:${KEY}:rows`, []);
  const [draft, setDraft] = useState<{vin?: number; vo1?: number; vo2?: number}>({});
  const [ans, setAns] = useStoredState<{a1?: string; a2?: string; a?: string; db?: string; f1?: string; f2?: string; phase?: string}>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const probes = useProbes();
  const fg = useFunctionGenerator({wave: 'sine', range: 1000, dial: 1, amp: 0.5, atten: true});
  const f = fgFreq(fg.state);
  const RE_UNBY = 100;

  const model = (ff: number) => {
    const q1 = biasOf('divider', CE_V, betas[0]);
    const q2 = biasOf('divider', CE_V, betas[1]);
    const re1 = VT / q1.ic;
    const re2 = VT / q2.ic;
    const zin2 = par(par(CE_V.r1!, CE_V.r2!), betas[1] * (re2 + RE_UNBY));
    const zin1 = par(par(CE_V.r1!, CE_V.r2!), betas[0] * (re1 + RE_UNBY));
    const a1 = par(CE_V.rc, zin2) / (re1 + RE_UNBY);
    const a2 = par(CE_V.rc, RL) / (re2 + RE_UNBY);
    const s1 = [hp(ff, 1 / (2 * Math.PI * zin1 * 1e-6)), hp(ff, 1 / (2 * Math.PI * (re1 + RE_UNBY + 40) * 100e-6 * 8)), lp(ff, 160e3)];
    const s2 = [hp(ff, 1 / (2 * Math.PI * (CE_V.rc + zin2) * 1e-6)), hp(ff, 1 / (2 * Math.PI * (re2 + RE_UNBY + 40) * 100e-6 * 8)), lp(ff, 160e3)];
    const m1 = s1.reduce((x, y) => x * y.mag, a1);
    const p1 = s1.reduce((x, y) => x + y.ph, Math.PI);
    const m2 = s2.reduce((x, y) => x * y.mag, a2);
    const p2 = s2.reduce((x, y) => x + y.ph, Math.PI);
    return {q1, q2, a1, a2, m1, p1, m2, p2, sw1: ceSwing(q1, CE_V.rc, zin2), sw2: ceSwing(q2, CE_V.rc, RL)};
  };
  const md = model(f);
  const gen = fg.signal;
  const vin: Sig = useMemo(() => ({fn: (t) => gen.fn(t) / (pad ? 10 : 1), period: gen.period}), [JSON.stringify(fg.state), pad]); // eslint-disable-line react-hooks/exhaustive-deps
  const vo1 = useMemo(() => stageSignal(vin, f, 0, md.m1, md.p1, md.sw1.up, md.sw1.down), [vin, f, md.m1, md.p1, md.sw1.up, md.sw1.down]);
  const vo2 = useMemo(() => stageSignal(vo1, f, 0, md.m2, md.p2, md.sw2.up, md.sw2.down), [vo1, f, md.m2, md.p2, md.sw2.up, md.sw2.down]);
  const nodes: Record<string, Sig> = {IN: vin, O1: vo1, OUT: vo2, G: DC(0)};
  const m = useNodeMeter(nodes, probes);
  const scope = useScope('cro', {ch1: vin, ch2: vo2}, {ch1: {vdiv: 0.005, pos: 2, coupling: 'AC', on: true}, ch2: {vdiv: 1, pos: -2, coupling: 'AC', on: true}, display: 'DUAL', tdiv: 2e-4});
  const clipped = acRms(vo2) < 0.95 * md.m1 * md.m2 * acRms(vin);

  const noteMeter = () => {
    if (!m.fn.startsWith('ac') || m.volts == null) return setNote({kind: 'warn', text: 'Use an AC range that does not show OL.'});
    if (m.black !== 'G') return setNote({kind: 'warn', text: 'Black probe on ground.'});
    const key = m.red === 'IN' ? 'vin' : m.red === 'O1' ? 'vo1' : m.red === 'OUT' ? 'vo2' : null;
    if (!key) return setNote({kind: 'warn', text: 'Red probe on IN, stage-1 output or OUT.'});
    setDraft((d) => ({...d, [key]: m.volts}));
    setNote({kind: 'good', text: `${m.red}: ${m.text} ${m.unit}`});
  };
  const addRow = () => {
    if (draft.vin == null || draft.vo2 == null) return setNote({kind: 'warn', text: 'Note at least Vin and Vout.'});
    if (clipped) return setNote({kind: 'warn', text: 'Output is clipped: reduce the input.'});
    setRows((r) => [...r.filter((x) => Math.abs(x.f - f) > 0.5), {f, vin: draft.vin!, vo1: draft.vo1 ?? 0, vo2: draft.vo2!}].sort((a, b) => a.f - b.f));
    setDraft({});
    setNote({kind: 'good', text: `Row at ${si(f, 'Hz')} added.`});
  };

  const mid = rows.find((r) => Math.abs(r.f - 1000) < 1 && r.vo1 > 0);
  const okMid = (s: string | undefined, v: number | null) => v != null && near(num(s), v, 0.03);
  const aTot = mid ? mid.vo2 / mid.vin : null;
  // −3 dB points from the model, for checking the trainee's reading of the graph.
  const peakG = md.a1 * md.a2;
  const find = (lo: number, hi: number, rising: boolean) => {
    for (let k = 0; k < 60; k++) {
      const c = Math.sqrt(lo * hi);
      const mm = model(c);
      const g = mm.m1 * mm.m2;
      if ((g > peakG / Math.SQRT2) === rising) hi = c;
      else lo = c;
    }
    return Math.sqrt(lo * hi);
  };
  const f1 = find(1, 1000, true);
  const f2 = find(1000, 1e7, false);
  const sweep = rows.length >= 8 && rows.some((r) => r.f <= f1 * 1.5) && rows.some((r) => r.f >= f2 / 1.5);

  return (
    <PracticalSheet
      number={KEY}
      title="Two-Stage RC-Coupled Amplifier"
      aim="To measure the gain of each stage and the overall gain of a two-stage RC-coupled amplifier, and plot its frequency response to find the bandwidth."
      apparatus={['Two-stage RC-coupled amplifier board (two CE stages, 1 µF coupling)', 'Function generator, CRO, AC millivoltmeter']}
      procedure={[
        'Apply a 1 kHz sine of a few mV (use the ÷10 pad). Check the output is not clipped.',
        'Measure Vin, Vo1 (stage 1 output) and Vout. A1 = Vo1 ÷ Vin, A2 = Vout ÷ Vo1, A = A1 × A2.',
        'Gain in dB = 20 log A.',
        'Keep Vin constant and change the frequency from about 10 Hz to 200 kHz. Note Vout each time.',
        'Plot gain against frequency. f1 and f2 are where the gain falls to 0.707 of the mid-band gain. Bandwidth = f2 − f1.',
      ]}
      precautions={['Keep the input constant during the frequency sweep.', 'Check the output on the CRO for clipping before every reading.', 'Use a logarithmic spread of frequencies.']}
      viva={[
        {q: 'Why is the overall gain less than A1 × A2 measured separately?', a: 'The second stage’s input impedance loads the first stage, lowering A1.'},
        {q: 'Why does gain fall at low frequency?', a: 'Coupling and bypass capacitors have high reactance.'},
        {q: 'Why does gain fall at high frequency?', a: 'Transistor junction and stray capacitances shunt the signal.'},
        {q: 'Phase of the output relative to input?', a: 'In phase (360°): each stage inverts.'},
      ]}
      steps={[
        {label: 'Measure Vin, Vo1 and Vout at 1 kHz.', hint: 'Mid-band. Keep the input constant.', done: !!mid},
        {label: 'Work out A1, A2, A and the gain in dB.', done: !!mid && okMid(ans.a1, mid.vo1 / mid.vin) && okMid(ans.a2, mid.vo2 / mid.vo1) && okMid(ans.a, aTot) && aTot != null && Math.abs((num(ans.db) ?? 0) - 20 * Math.log10(aTot)) < 0.3},
        {label: 'Sweep the frequency: 8+ points beyond both −3 dB points.', hint: 'Spread the points on a log scale.', done: sweep},
        {label: 'Read f1 and f2 from the graph, and note the phase.', done: near(num(ans.f1), f1, 0.25) && near(num(ans.f2) != null ? num(ans.f2)! * 1000 : null, f2, 0.25) && ans.phase === '0'},
        {label: 'Enter your details and print or save the record.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_9_87}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div>
            <div className={styles.kit}>
              <svg viewBox="0 0 520 280" role="img" aria-label="Two-stage RC-coupled amplifier board">
                <Stage x={20} kind="ce" divider labels={{r1: 'R1', r2: 'R2', rc: 'Rc', re: 'Re', ce: 'Ce'}} bypass coupling ids={{b: 'B1', c: 'C1', e: 'E1'}} probes={probes} name="Stage 1" />
                <Stage x={250} kind="ce" divider labels={{r1: 'R1', r2: 'R2', rc: 'Rc', re: 'Re', ce: 'Ce'}} bypass ids={{b: 'B2', c: 'C2', e: 'E2'}} probes={probes} name="Stage 2" />
                <path className={styles.wire} d="M250 90 V130" fill="none" />
                <GroundAndPads
                  probes={probes}
                  pads={[
                    {id: 'IN', x: 20, y: 150, label: 'Input', text: ''},
                    {id: 'O1', x: 245, y: 70, label: 'Stage 1 output', text: 'Vo1'},
                    {id: 'OUT', x: 490, y: 70, label: 'Output', text: 'OUT'},
                    {id: 'G', x: 20, y: 240, label: 'Ground', text: 'GND'},
                  ]}
                />
                <text x={20} y={170} textAnchor="middle" style={{...kitLabel, fontSize: 10}}>
                  IN
                </text>
              </svg>
            </div>
            <ProbeBar probes={probes} />
          </div>
          <div style={{display: 'grid', gap: '0.6rem', alignContent: 'start'}}>
            <Multimeter name="AC millivoltmeter" fn={m.fn} functions={METER_FNS.filter((x) => x.fn !== 'dcv20')} text={m.text} unit={m.unit} onFunction={(x) => (setNote(null), m.setFn(x))} />
            <button type="button" className={clsx(styles.btn, styles.noPrint)} onClick={noteMeter}>
              Note meter reading
            </button>
            <p className={styles.muted} style={{margin: 0}}>
              Vin {draft.vin != null ? si(draft.vin, 'V') : '–'} · Vo1 {draft.vo1 != null ? si(draft.vo1, 'V') : '–'} · Vout {draft.vo2 != null ? si(draft.vo2, 'V') : '–'}
            </p>
            <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} onClick={addRow}>
              Add row ({si(f, 'Hz')})
            </button>
          </div>
        </div>
        <NoteBox note={note} status={clipped ? {kind: 'warn', text: 'Output clipped: reduce the input.'} : null} />
        <div className={styles.controls}>
          <div>{scope.view}</div>
          <div style={{display: 'grid', gap: '0.5rem', alignContent: 'start'}}>
            <Pad pad={pad} setPad={setPad} />
            {fg.view}
          </div>
        </div>
      </Section>
      <Section title="Observation table">
        {rows.length === 0 ? (
          <Empty>No rows yet.</Empty>
        ) : (
          <Table head={['f', 'Vin', 'Vo1', 'Vout', 'Gain A', 'Gain (dB)']} rows={rows.map((r) => [si(r.f, 'Hz'), si(r.vin, 'V'), r.vo1 ? si(r.vo1, 'V') : '–', si(r.vo2, 'V'), (r.vo2 / r.vin).toFixed(0), (20 * Math.log10(r.vo2 / r.vin)).toFixed(1)])} />
        )}
        {rows.length > 1 && <XYGraph series={[{id: 'g', label: 'Gain (dB)', color: 'var(--s1)', marker: 'circle', points: rows.map((r) => ({x: Math.log10(r.f), y: 20 * Math.log10(r.vo2 / r.vin)}))}]} xLabel="log₁₀ f (1 = 10 Hz, 3 = 1 kHz, 5 = 100 kHz)" yLabel="Gain (dB)" yUnit="dB" />}
      </Section>
      <Section title="Result">
        <Table
          head={['', 'Your value', 'Check']}
          rows={[
            ['A1 = Vo1 ÷ Vin (1 kHz)', inp('A1', ans.a1, (v) => setAns((x) => ({...x, a1: v}))), ans.a1 && mid ? <Verdict ok={okMid(ans.a1, mid.vo1 / mid.vin)} /> : '–'],
            ['A2 = Vout ÷ Vo1', inp('A2', ans.a2, (v) => setAns((x) => ({...x, a2: v}))), ans.a2 && mid ? <Verdict ok={okMid(ans.a2, mid.vo2 / mid.vo1)} /> : '–'],
            ['A = A1 × A2', inp('Overall gain', ans.a, (v) => setAns((x) => ({...x, a: v}))), ans.a && aTot ? <Verdict ok={okMid(ans.a, aTot)} /> : '–'],
            ['Gain (dB) = 20 log A', inp('Gain in dB', ans.db, (v) => setAns((x) => ({...x, db: v}))), ans.db && aTot ? <Verdict ok={Math.abs((num(ans.db) ?? 0) - 20 * Math.log10(aTot)) < 0.3} /> : '–'],
            ['Lower cut-off f1 (Hz)', inp('f1', ans.f1, (v) => setAns((x) => ({...x, f1: v}))), ans.f1 ? <Verdict ok={near(num(ans.f1), f1, 0.25)} no="✗ read the graph again" /> : '–'],
            ['Upper cut-off f2 (kHz)', inp('f2', ans.f2, (v) => setAns((x) => ({...x, f2: v}))), ans.f2 ? <Verdict ok={near(num(ans.f2) != null ? num(ans.f2)! * 1000 : null, f2, 0.25)} no="✗ read the graph again" /> : '–'],
            [
              'Output phase vs input',
              <select className={styles.select} aria-label="Phase" value={ans.phase ?? ''} onChange={(e) => setAns((x) => ({...x, phase: e.target.value}))}>
                <option value="">Choose…</option>
                <option value="0">In phase (0° / 360°)</option>
                <option value="180">Inverted (180°)</option>
              </select>,
              ans.phase ? <Verdict ok={ans.phase === '0'} /> : '–',
            ],
          ]}
        />
        <ResetKit
          onReset={() => {
            setRows([]);
            setAns({});
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}
