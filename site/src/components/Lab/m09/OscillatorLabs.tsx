import React, {useEffect, useMemo, useRef, useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import useStoredState from '../useStoredState';
import {Knob, useScope} from '../Scope';
import {si, type Sig} from '../signals';
import {Empty, NoteBox, ResetKit, Section, Table, Verdict, useKitSeed, useRng, type Note} from '../kit';
import {near} from '../m07/parts';
import {PanelMeter} from '../m08/ZenerRegLabs';
import styles from '../styles.module.css';

const num = (s?: string) => (s && s.trim() !== '' && !Number.isNaN(Number(s)) ? Number(s) : null);
const inp = (label: string, value: string | undefined, onChange: (v: string) => void, w = '5.5rem') => (
  <input className={styles.input} style={{maxWidth: w}} inputMode="decimal" aria-label={label} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
);
const flat: Sig = {fn: () => 0, period: null};
/** Slightly distorted sine of peak-to-peak vpp. */
const oscSine = (f: number, vpp: number): Sig => ({fn: (t) => (vpp / 2) * (Math.sin(2 * Math.PI * f * t) + 0.04 * Math.sin(4 * Math.PI * f * t)), period: 1 / f});

/** One choice button group. */
function Pick<T extends string | number>({label, value, options, onPick, fmt}: {label: string; value: T; options: T[]; onPick: (v: T) => void; fmt: (v: T) => string}) {
  return (
    <>
      <span className={styles.label}>{label}</span>
      <div className={styles.seg} role="group" aria-label={label}>
        {options.map((o) => (
          <button key={String(o)} type="button" aria-pressed={value === o} onClick={() => onPick(o)}>
            {fmt(o)}
          </button>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// 1.9.88 Colpitts and Hartley oscillators
// ---------------------------------------------------------------------------

const CAPS = [1e-9, 2.2e-9, 4.7e-9, 10e-9];
const L_COL = 1e-3;
const L_HART = [0.5e-3, 0.5e-3];

interface LcRow {
  osc: 'colpitts' | 'hartley';
  desc: string;
  fTrue: number;
  fNom: number;
  meas?: string;
  calc?: string;
}

export function LcOscLab(): React.JSX.Element {
  const KEY = '1.9.88';
  const [seed, newKit] = useKitSeed(KEY);
  const tol = useRng(seed, (rnd) => ({l: 1 + (rnd() * 2 - 1) * 0.05, c: CAPS.map(() => 1 + (rnd() * 2 - 1) * 0.05)}));
  const [osc, setOsc] = useState<'colpitts' | 'hartley'>('colpitts');
  const [c1, setC1] = useState(2);
  const [c2, setC2] = useState(2);
  const [ch, setCh] = useState(1);
  const [power, setPower] = useState(false);
  const [rows, setRows] = useStoredState<LcRow[]>(`lab:${KEY}:rows`, []);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);

  const ceq = (a: number, b: number) => (a * b) / (a + b);
  const nominal = osc === 'colpitts' ? 1 / (2 * Math.PI * Math.sqrt(L_COL * ceq(CAPS[c1], CAPS[c2]))) : 1 / (2 * Math.PI * Math.sqrt((L_HART[0] + L_HART[1]) * CAPS[ch]));
  const actual = osc === 'colpitts' ? 1 / (2 * Math.PI * Math.sqrt(L_COL * tol.l * ceq(CAPS[c1] * tol.c[c1], CAPS[c2] * tol.c[c2]))) : 1 / (2 * Math.PI * Math.sqrt((L_HART[0] + L_HART[1]) * tol.l * CAPS[ch] * tol.c[ch]));
  const ratio = osc === 'colpitts' ? Math.max(CAPS[c1] / CAPS[c2], CAPS[c2] / CAPS[c1]) : 1;
  const runs = power && ratio < 8;
  const sig = useMemo(() => (runs ? oscSine(actual, 6) : flat), [runs, actual]);
  const scope = useScope('cro', {ch1: sig}, {ch1: {vdiv: 2, pos: 0, coupling: 'AC', on: true}, tdiv: 2e-6});
  const desc = osc === 'colpitts' ? `L 1 mH, C1 ${si(CAPS[c1], 'F')}, C2 ${si(CAPS[c2], 'F')}` : `L1 + L2 = 1 mH, C ${si(CAPS[ch], 'F')}`;

  const change = (f: () => void) => {
    if (power) return setNote({kind: 'warn', text: 'Switch off before changing components.'});
    setNote(null);
    f();
  };
  const addRow = () => {
    if (!runs) return setNote({kind: 'warn', text: power ? 'Not oscillating: C1 and C2 are too different (feedback too small).' : 'Supply is off.'});
    if (rows.some((r) => r.desc === desc && r.osc === osc)) return setNote({kind: 'info', text: 'This setting is already in the table.'});
    setRows((r) => [...r, {osc, desc, fTrue: actual, fNom: nominal}]);
    setNote({kind: 'good', text: 'Row added. Read the period on the CRO and fill in f.'});
  };
  const rowOk = (r: LcRow) => near(num(r.meas) != null ? num(r.meas)! * 1000 : null, r.fTrue, 0.05) && near(num(r.calc) != null ? num(r.calc)! * 1000 : null, r.fNom, 0.02);
  const good = (o: 'colpitts' | 'hartley') => rows.filter((r) => r.osc === o && rowOk(r)).length;

  return (
    <PracticalSheet
      number={KEY}
      title="Colpitts and Hartley Oscillators: Frequency by CRO"
      aim="To run Colpitts and Hartley oscillators with different tank components, measure the output frequency on the CRO and compare it with the formula."
      apparatus={['Colpitts / Hartley oscillator trainer (BC547, tank on plug-in board)', 'Capacitors 1, 2.2, 4.7, 10 nF', 'Coil 1 mH (tapped 0.5 + 0.5 mH)', 'CRO']}
      procedure={[
        'Fit the tank components with the supply off.',
        'Switch on. Set the CRO to show 1–3 cycles. Period T = divisions × TIME/DIV; f = 1 ÷ T.',
        'Colpitts: f = 1 ÷ (2π√(L·C)), C = C1·C2 ÷ (C1 + C2).',
        'Hartley: f = 1 ÷ (2π√((L1 + L2)·C)).',
        'Add a row for each setting and fill in measured and calculated f.',
      ]}
      precautions={['Switch off before changing the tank.', 'Use a ×10 probe so the CRO does not load the tank.', 'Keep C1 and C2 of similar value in a Colpitts oscillator.']}
      viva={[
        {q: 'Difference between Colpitts and Hartley?', a: 'Colpitts takes feedback from a capacitive divider (C1, C2); Hartley from a tapped inductor (L1, L2).'},
        {q: 'What is the Barkhausen criterion?', a: 'Loop gain Aβ = 1 and total phase shift 0° (or 360°) round the loop.'},
        {q: 'What happens to f if C is doubled?', a: 'f falls by √2 (to about 0.707 of its value).'},
      ]}
      steps={[
        {label: 'Colpitts: set two values; note f measured and calculated.', hint: 'Read the period on the CRO.', done: good('colpitts') >= 2},
        {label: 'Hartley: set two values; note f measured and calculated.', hint: 'Switch the Oscillator to Hartley.', done: good('hartley') >= 2},
        {label: 'Enter your details and print or save the record.', hint: 'Practical record, below the result.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div>{scope.view}</div>
          <div className={clsx(styles.card, styles.noPrint)} style={{alignSelf: 'start'}}>
            <Pick label="Oscillator" value={osc} options={['colpitts', 'hartley'] as ('colpitts' | 'hartley')[]} onPick={(v) => change(() => setOsc(v))} fmt={(v) => (v === 'colpitts' ? 'Colpitts' : 'Hartley')} />
            {osc === 'colpitts' ? (
              <>
                <Pick label="C1" value={c1} options={[0, 1, 2, 3]} onPick={(v) => change(() => setC1(v))} fmt={(v) => si(CAPS[v], 'F')} />
                <Pick label="C2" value={c2} options={[0, 1, 2, 3]} onPick={(v) => change(() => setC2(v))} fmt={(v) => si(CAPS[v], 'F')} />
              </>
            ) : (
              <Pick label="Tank C" value={ch} options={[0, 1, 2, 3]} onPick={(v) => change(() => setCh(v))} fmt={(v) => si(CAPS[v], 'F')} />
            )}
            <div className={styles.seg} role="group" aria-label="Actions" style={{marginTop: '0.6rem'}}>
              <button type="button" aria-pressed={power} onClick={() => (setPower((p) => !p), setNote(null))}>
                Supply {power ? 'ON' : 'OFF'}
              </button>
              <button type="button" onClick={addRow}>
                Add row
              </button>
            </div>
            <p className={styles.muted} style={{margin: '0.4rem 0 0'}}>
              {desc}
            </p>
          </div>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {rows.length === 0 ? (
          <Empty>No rows yet.</Empty>
        ) : (
          <Table
            head={['Oscillator', 'Tank', 'f measured (kHz)', 'f calculated (kHz)', 'Check']}
            rows={rows.map((r, k) => {
              const set = (p: Partial<LcRow>) => setRows((x) => x.map((y, j) => (j === k ? {...y, ...p} : y)));
              return [r.osc === 'colpitts' ? 'Colpitts' : 'Hartley', r.desc, inp(`Row ${k + 1} measured`, r.meas, (v) => set({meas: v})), inp(`Row ${k + 1} calculated`, r.calc, (v) => set({calc: v})), r.meas && r.calc ? <Verdict ok={rowOk(r)} /> : '–'];
            })}
          />
        )}
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

// ---------------------------------------------------------------------------
// 1.9.89 RC phase-shift oscillator
// ---------------------------------------------------------------------------

const PR = [4700, 10000];
const PC = [10e-9, 22e-9];

interface PsRow {
  desc: string;
  fTrue: number;
  fNom: number;
  meas?: string;
  calc?: string;
}

export function PhaseShiftLab(): React.JSX.Element {
  const KEY = '1.9.89';
  const [seed, newKit] = useKitSeed(KEY);
  const kit = useRng(seed, (rnd) => ({thr: 28 + rnd() * 3, tol: 1 + (rnd() * 2 - 1) * 0.04}));
  const [ri, setRi] = useState(1);
  const [ci, setCi] = useState(0);
  const [gain, setGain] = useState(20);
  const [tap, setTap] = useState(3);
  const [power, setPower] = useState(false);
  const [rows, setRows] = useStoredState<PsRow[]>(`lab:${KEY}:rows`, []);
  const [ans, setAns] = useStoredState<{onset?: string; phase?: string}>(`lab:${KEY}:ans`, {});
  const [onsetSeen, setOnsetSeen] = useStoredState(`lab:${KEY}:onset`, false);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);

  const fNom = 1 / (2 * Math.PI * PR[ri] * PC[ci] * Math.sqrt(6));
  const f = fNom * kit.tol;
  const runs = power && gain >= kit.thr;
  const drive = 1 + (gain - kit.thr) / 4;
  const out: Sig = useMemo(() => (runs ? {fn: (t) => 4 * Math.max(-1, Math.min(1, drive * Math.sin(2 * Math.PI * f * t))), period: 1 / f} : flat), [runs, drive, f]);
  // Feedback network taps: each RC section adds about 60° and attenuates.
  const tapSig: Sig = useMemo(() => (runs ? {fn: (t) => out.fn(t - tap / (6 * f)) * [1, 0.45, 0.16, 1 / 29][tap], period: 1 / f} : flat), [runs, out, tap, f]);
  const scope = useScope('cro', {ch1: out, ch2: tapSig}, {ch1: {vdiv: 2, pos: 2, coupling: 'AC', on: true}, ch2: {vdiv: 0.1, pos: -2, coupling: 'AC', on: true}, display: 'DUAL', tdiv: 2e-4});

  useEffect(() => {
    if (runs && gain - kit.thr < 1.5 && !onsetSeen) setOnsetSeen(true);
  }, [runs, gain]); // eslint-disable-line react-hooks/exhaustive-deps

  const change = (fx: () => void) => {
    if (power) return setNote({kind: 'warn', text: 'Switch off before changing R or C.'});
    setNote(null);
    fx();
  };
  const desc = `R ${PR[ri] / 1000}k, C ${si(PC[ci], 'F')}`;
  const addRow = () => {
    if (!runs) return setNote({kind: 'warn', text: power ? 'Not oscillating: raise the amplifier gain.' : 'Supply is off.'});
    if (rows.some((r) => r.desc === desc)) return setNote({kind: 'info', text: 'Already in the table.'});
    setRows((r) => [...r, {desc, fTrue: f, fNom}]);
    setNote({kind: 'good', text: 'Row added.'});
  };
  const rowOk = (r: PsRow) => near(num(r.meas), r.fTrue, 0.05) && near(num(r.calc), r.fNom, 0.02);

  return (
    <PracticalSheet
      number={KEY}
      title="RC Phase-Shift Oscillator"
      aim="To find the minimum amplifier gain for oscillation in an RC phase-shift oscillator, observe the phase shift of the RC network and compare the frequency with f = 1 ÷ (2πRC√6)."
      apparatus={['RC phase-shift oscillator trainer with gain control', 'R 4.7 kΩ / 10 kΩ, C 10 nF / 22 nF (three sections)', 'Dual-trace CRO']}
      procedure={[
        'Start with low gain. Switch on: no output.',
        'Raise the gain slowly until the oscillation just starts. Note this gain.',
        'Higher gain clips the sine wave: keep it just above the onset.',
        'CH2 on the output of section 1, 2, 3: each adds about 60°; section 3 gives 180°.',
        'Measure f on the CRO for two R/C settings and compare with the formula.',
      ]}
      precautions={['Change R and C only with the supply off.', 'Use just enough gain for a clean sine wave.']}
      viva={[
        {q: 'Why are three RC sections used?', a: 'Each gives less than 90°; three give the 180° needed (the amplifier gives the other 180°).'},
        {q: 'Minimum gain for oscillation?', a: '29: the three-section network attenuates the signal to 1/29.'},
        {q: 'Why does a high gain distort the output?', a: 'The amplitude grows until the transistor clips.'},
      ]}
      steps={[
        {label: 'Raise the amplifier gain until oscillation starts.', hint: 'Look for a steady sine on the CRO.', done: onsetSeen},
        {label: 'Enter the onset gain.', hint: 'The gain where oscillation just starts.', done: onsetSeen && near(num(ans.onset), kit.thr, 0.06)},
        {label: 'Find the phase shift of the three R-C sections.', hint: 'Move the CH2 probe along the sections.', done: ans.phase === '180'},
        {label: 'Set two R/C values; note f measured and calculated.', done: rows.filter(rowOk).length >= 2},
        {label: 'Enter your details and print or save the record.', hint: 'Practical record, below the result.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div>{scope.view}</div>
          <div className={clsx(styles.card, styles.noPrint)} style={{alignSelf: 'start'}}>
            <Knob label="AMPLIFIER GAIN" value={gain.toFixed(0)} onDec={() => setGain((g) => Math.max(5, g - 1))} onInc={() => setGain((g) => Math.min(60, g + 1))} />
            <Pick label="R" value={ri} options={[0, 1]} onPick={(v) => change(() => setRi(v))} fmt={(v) => `${PR[v] / 1000} kΩ`} />
            <Pick label="C" value={ci} options={[0, 1]} onPick={(v) => change(() => setCi(v))} fmt={(v) => si(PC[v], 'F')} />
            <Pick label="CH2 probe on" value={tap} options={[1, 2, 3]} onPick={setTap} fmt={(v) => `Section ${v}`} />
            <div className={styles.seg} role="group" aria-label="Actions" style={{marginTop: '0.6rem'}}>
              <button type="button" aria-pressed={power} onClick={() => (setPower((p) => !p), setNote(null))}>
                Supply {power ? 'ON' : 'OFF'}
              </button>
              <button type="button" onClick={addRow}>
                Add row
              </button>
            </div>
          </div>
        </div>
        <NoteBox note={note} status={power && !runs ? {kind: 'info', text: 'No oscillation.'} : runs && drive > 2 ? {kind: 'warn', text: 'Output clipped: gain too high.'} : null} />
      </Section>
      <Section title="Observation table">
        {rows.length === 0 ? (
          <Empty>No rows yet.</Empty>
        ) : (
          <Table
            head={['R, C', 'f measured (Hz)', 'f calculated (Hz)', 'Check']}
            rows={rows.map((r, k) => {
              const set = (p: Partial<PsRow>) => setRows((x) => x.map((y, j) => (j === k ? {...y, ...p} : y)));
              return [r.desc, inp(`Row ${k + 1} measured`, r.meas, (v) => set({meas: v})), inp(`Row ${k + 1} calculated`, r.calc, (v) => set({calc: v})), r.meas && r.calc ? <Verdict ok={rowOk(r)} /> : '–'];
            })}
          />
        )}
      </Section>
      <Section title="Result">
        <Table
          head={['', 'Your answer', 'Check']}
          rows={[
            ['Gain at which oscillation starts', inp('Onset gain', ans.onset, (v) => setAns((a) => ({...a, onset: v}))), ans.onset ? <Verdict ok={onsetSeen && near(num(ans.onset), kit.thr, 0.06)} no={onsetSeen ? '✗ check again' : '✗ find the onset on the bench'} /> : '–'],
            [
              'Phase shift after section 3',
              <select className={styles.select} aria-label="Phase shift after three sections" value={ans.phase ?? ''} onChange={(e) => setAns((a) => ({...a, phase: e.target.value}))}>
                <option value="">Choose…</option>
                <option value="60">60°</option>
                <option value="90">90°</option>
                <option value="180">180°</option>
                <option value="360">360°</option>
              </select>,
              ans.phase ? <Verdict ok={ans.phase === '180'} /> : '–',
            ],
          ]}
        />
        <ResetKit
          onReset={() => {
            setRows([]);
            setAns({});
            setOnsetSeen(false);
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// 1.9.90 Crystal oscillator
// ---------------------------------------------------------------------------

const XTALS = [3.579545e6, 4e6, 8e6, 10e6];

interface XRow {
  src: string;
  vcc: number;
  text: string;
  hz: number;
}

export function CrystalLab(): React.JSX.Element {
  const KEY = '1.9.90';
  const [seed, newKit] = useKitSeed(KEY);
  const kit = useRng(seed, (rnd) => ({ppm: XTALS.map(() => (rnd() * 2 - 1) * 30), lc: 3.9e6 + rnd() * 2e5}));
  const [src, setSrc] = useState<number>(0); // 0–3 crystals, 4 = LC
  const [vcc, setVcc] = useState(12);
  const [gate, setGate] = useState(1);
  const [power, setPower] = useState(false);
  const [rows, setRows] = useStoredState<XRow[]>(`lab:${KEY}:rows`, []);
  const [ans, setAns] = useStoredState<{ppm?: string; xs?: string; lc?: string}>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);

  const isLc = src === 4;
  const nominal = isLc ? kit.lc : XTALS[src];
  // Crystals pull by about 1 ppm per volt; the LC oscillator by about 0.1 % per volt.
  const hz = power ? (isLc ? kit.lc * (1 + 0.001 * (vcc - 12)) : XTALS[src] * (1 + (kit.ppm[src] + 1 * (vcc - 12)) * 1e-6)) : 0;
  const res = gate === 0.1 ? 10 : gate === 1 ? 1 : 0.1;
  const shown = Math.round(hz / res) * res;
  const text = power ? (shown / 1e6).toFixed(gate === 0.1 ? 5 : gate === 1 ? 6 : 7) : '';
  const name = isLc ? 'LC (Colpitts)' : `Crystal ${si(XTALS[src], 'Hz', 7)}`;
  const sig = useMemo(() => (power ? oscSine(hz, 4) : flat), [power, hz]);
  const scope = useScope('cro', {ch1: sig}, {ch1: {vdiv: 1, pos: 0, coupling: 'AC', on: true}, tdiv: 1e-6});

  const noteIt = () => {
    if (!power) return setNote({kind: 'warn', text: 'Supply is off.'});
    setRows((r) => [...r.filter((x) => !(x.src === name && x.vcc === vcc)), {src: name, vcc, text, hz: shown}]);
    setNote({kind: 'good', text: `${name} at ${vcc} V: ${text} MHz`});
  };
  const get = (s: string, v: number) => rows.find((r) => r.src === s && r.vcc === v);
  const xName = `Crystal ${si(XTALS[0], 'Hz', 7)}`;
  const allX = XTALS.every((x) => get(`Crystal ${si(x, 'Hz', 7)}`, 12));
  const ppmTrue = (() => {
    const r = get(xName, 12);
    return r ? ((r.hz - XTALS[0]) / XTALS[0]) * 1e6 : null;
  })();
  const pctChange = (s: string) => {
    const a = get(s, 9);
    const b = get(s, 12);
    return a && b ? ((b.hz - a.hz) / a.hz) * 100 : null;
  };
  const xsTrue = pctChange(xName);
  const lcTrue = pctChange('LC (Colpitts)');
  const close = (s: string | undefined, t: number | null, abs: number) => t != null && num(s) != null && Math.abs(num(s)! - t) <= Math.max(abs, Math.abs(t) * 0.05);

  return (
    <PracticalSheet
      number={KEY}
      title="Crystal Oscillator"
      aim="To run a crystal oscillator with different crystals, measure the frequency with a counter, and compare its stability with an LC oscillator."
      apparatus={['Crystal oscillator trainer (Pierce), crystal socket', 'Crystals 3.579545, 4, 8, 10 MHz', 'LC (Colpitts) oscillator, ~4 MHz', 'Frequency counter, CRO, DC supply 9 / 12 V']}
      procedure={[
        'Fit a crystal with the supply off. Switch on at 12 V.',
        'Read the frequency on the counter (1 s gate gives 1 Hz resolution). Note it.',
        'Repeat for all crystals.',
        'Error in ppm = (f measured − f marked) ÷ f marked × 10⁶.',
        'For the 3.58 MHz crystal and the LC oscillator, measure at 9 V and 12 V. % change = (f12 − f9) ÷ f9 × 100.',
      ]}
      precautions={['Handle crystals gently: they crack if dropped.', 'Change the crystal only with the supply off.', 'Use the longest gate time for the best resolution.']}
      viva={[
        {q: 'Why is a crystal oscillator so stable?', a: 'The quartz crystal has a very high Q and its resonant frequency hardly changes with supply or temperature.'},
        {q: 'What is the piezo-electric effect?', a: 'A crystal produces a voltage when stressed, and vibrates when a voltage is applied.'},
        {q: 'Where are crystal oscillators used?', a: 'Clocks, watches, microcontrollers, radio transmitters.'},
      ]}
      steps={[
        {label: 'Measure all four crystals at 12 V.', hint: 'Switch off before changing the crystal.', done: allX},
        {label: 'Work out the error (ppm) of the 3.58 MHz crystal.', done: close(ans.ppm, ppmTrue, 0.5)},
        {label: 'Change the supply 9 V → 12 V; find the % change for crystal and LC.', done: close(ans.xs, xsTrue, 0.0002) && close(ans.lc, lcTrue, 0.02)},
        {label: 'Enter your details and print or save the record.', hint: 'Practical record, below the result.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div className={clsx(styles.card, styles.noPrint)}>
            <Pick label="Oscillator" value={src} options={[0, 1, 2, 3, 4]} onPick={(v) => (power ? setNote({kind: 'warn', text: 'Switch off before changing the crystal.'}) : (setSrc(v), setNote(null)))} fmt={(v) => (v === 4 ? 'LC' : si(XTALS[v], 'Hz', 7))} />
            <Pick label="Supply" value={vcc} options={[9, 12]} onPick={setVcc} fmt={(v) => `${v} V`} />
            <Pick label="Counter gate time" value={gate} options={[0.1, 1, 10]} onPick={setGate} fmt={(v) => `${v} s`} />
            <div className={styles.seg} role="group" aria-label="Actions" style={{marginTop: '0.6rem'}}>
              <button type="button" aria-pressed={power} onClick={() => (setPower((p) => !p), setNote(null))}>
                Supply {power ? 'ON' : 'OFF'}
              </button>
              <button type="button" onClick={noteIt}>
                Note reading
              </button>
            </div>
          </div>
          <div style={{display: 'grid', gap: '0.5rem', alignContent: 'start'}}>
            <PanelMeter label={`Frequency counter (gate ${gate} s)`} value={text} unit="MHz" off={!power} />
            <p className={styles.muted} style={{margin: 0}}>
              Fitted: {isLc ? 'LC tank' : `crystal marked ${si(nominal, 'Hz', 7)}`}
            </p>
          </div>
        </div>
        <div style={{marginTop: '0.6rem'}}>{scope.view}</div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {rows.length === 0 ? <Empty>No readings yet.</Empty> : <Table head={['Oscillator', 'Supply', 'Counter (MHz)']} rows={rows.map((r) => [r.src, `${r.vcc} V`, r.text])} />}
      </Section>
      <Section title="Result">
        <Table
          head={['', 'Your value', 'Check']}
          rows={[
            ['Error of 3.579545 MHz crystal (ppm)', inp('Crystal error in ppm', ans.ppm, (v) => setAns((a) => ({...a, ppm: v}))), ans.ppm ? ppmTrue == null ? 'measure first' : <Verdict ok={close(ans.ppm, ppmTrue, 0.5)} /> : '–'],
            ['% change 9 → 12 V, crystal', inp('Crystal percent change', ans.xs, (v) => setAns((a) => ({...a, xs: v}))), ans.xs ? xsTrue == null ? 'measure at 9 V and 12 V' : <Verdict ok={close(ans.xs, xsTrue, 0.0002)} /> : '–'],
            ['% change 9 → 12 V, LC', inp('LC percent change', ans.lc, (v) => setAns((a) => ({...a, lc: v}))), ans.lc ? lcTrue == null ? 'measure at 9 V and 12 V' : <Verdict ok={close(ans.lc, lcTrue, 0.02)} /> : '–'],
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

// ---------------------------------------------------------------------------
// 1.9.91 Astable, monostable and bistable multivibrators
// ---------------------------------------------------------------------------

const MR = [10e3, 47e3];
const MC = [0.1e-6, 10e-6, 100e-6];
const RC_COLL = 1000;

function astableSig(t1: number, t2: number, c: number): [Sig, Sig] {
  const T = t1 + t2;
  const tau = RC_COLL * c;
  // Collector of Q1: low while Q1 is on (t1), then rises through Rc charging C.
  const v = (on: number, tt: number) => (tt < on ? 0.2 : 0.2 + 11.6 * (1 - Math.exp(-(tt - on) / tau)));
  const q1: Sig = {fn: (t) => v(t1, ((t % T) + T) % T), period: T};
  const q2: Sig = {fn: (t) => v(t2, ((((t - t1) % T) + T) % T)), period: T};
  return [q1, q2];
}

interface AsRow {
  r1: number;
  r2: number;
  c: number;
  t?: string;
  calc?: string;
}

export function MultivibratorLab(): React.JSX.Element {
  const KEY = '1.9.91';
  const [seed, newKit] = useKitSeed(KEY);
  const tol = useRng(seed, (rnd) => 1 + (rnd() * 2 - 1) * 0.06);
  const [mode, setMode] = useState<'astable' | 'mono' | 'bi'>('astable');
  const [r1, setR1] = useState(1);
  const [r2, setR2] = useState(1);
  const [ci, setCi] = useState(0);
  const [power, setPower] = useState(false);
  const [blink, setBlink] = useState(false);
  const [pulse, setPulse] = useState<{start: number; width: number} | null>(null);
  const [now, setNow] = useState(0);
  const [bi, setBi] = useState<0 | 1>(0);
  const [astRows, setAstRows] = useStoredState<AsRow[]>(`lab:${KEY}:ast`, []);
  const [monoRows, setMonoRows] = useStoredState<{c: number; meas: number; calc?: string}[]>(`lab:${KEY}:mono`, []);
  const [biLog, setBiLog] = useStoredState<string[]>(`lab:${KEY}:bi`, []);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);
  const tick = useRef<number | null>(null);

  const c = MC[ci];
  const t1 = 0.69 * MR[r2] * c * tol; // Q1 on-time set by R2·C2
  const t2 = 0.69 * MR[r1] * c * tol;
  const [q1, q2] = useMemo(() => (power && mode === 'astable' ? astableSig(t1, t2, c) : [flat, flat]), [power, mode, t1, t2, c]);
  const scope = useScope('cro', {ch1: q1, ch2: q2}, {ch1: {vdiv: 5, pos: 1, coupling: 'DC', on: true}, ch2: {vdiv: 5, pos: -3, coupling: 'DC', on: true}, display: 'DUAL', tdiv: 5e-4});

  // Slow astable: blink the LEDs in real time.
  useEffect(() => {
    if (!power || mode !== 'astable' || t1 + t2 < 0.2) return;
    let on = false;
    let id = 0;
    const step = () => {
      on = !on;
      setBlink(on);
      id = window.setTimeout(step, (on ? t1 : t2) * 1000);
    };
    step();
    return () => window.clearTimeout(id);
  }, [power, mode, t1, t2]);
  // Monostable timer.
  useEffect(() => {
    if (!pulse) return;
    tick.current = window.setInterval(() => setNow(performance.now()), 30);
    return () => window.clearInterval(tick.current!);
  }, [pulse]);
  const monoOn = !!pulse && (now - pulse.start) / 1000 < pulse.width;
  useEffect(() => {
    if (pulse && !monoOn && now > pulse.start) {
      setMonoRows((r) => [...r.filter((x) => x.c !== c), {c, meas: Math.round(pulse.width * 100) / 100}]);
      setNote({kind: 'good', text: `Pulse ended after ${pulse.width.toFixed(2)} s.`});
      setPulse(null);
    }
  }, [monoOn]); // eslint-disable-line react-hooks/exhaustive-deps

  const change = (f: () => void) => {
    if (power) return setNote({kind: 'warn', text: 'Switch off before changing components or mode.'});
    setNote(null);
    f();
  };
  const addAst = () => {
    if (!power || mode !== 'astable') return setNote({kind: 'warn', text: 'Run the astable first.'});
    const key = (x: AsRow) => `${x.r1}-${x.r2}-${x.c}`;
    const row: AsRow = {r1: MR[r1], r2: MR[r2], c};
    if (astRows.some((x) => key(x) === key(row))) return setNote({kind: 'info', text: 'Already in the table.'});
    setAstRows((r) => [...r, row]);
    setNote({kind: 'good', text: 'Row added: measure T and fill it in.'});
  };
  const trigger = () => {
    if (!power || mode !== 'mono') return setNote({kind: 'warn', text: 'Switch on in monostable mode.'});
    if (pulse) return setNote({kind: 'info', text: 'Already triggered: a monostable ignores triggers during the pulse.'});
    const width = 0.69 * MR[1] * c * tol;
    if (width < 0.05) return setNote({kind: 'warn', text: 'Pulse too short to see: use 10 µF or 100 µF.'});
    setPulse({start: performance.now(), width});
    setNow(performance.now());
  };
  const biPress = (s: 'SET' | 'RESET') => {
    if (!power || mode !== 'bi') return setNote({kind: 'warn', text: 'Switch on in bistable mode.'});
    const next = s === 'SET' ? 1 : 0;
    setBiLog((l) => [...l, `${s} → ${next ? 'LED 1 ON, LED 2 OFF' : 'LED 1 OFF, LED 2 ON'}${next === bi ? ' (no change)' : ''}`].slice(-8));
    setBi(next);
  };

  const astTrue = (x: AsRow) => 0.69 * (x.r1 + x.r2) * x.c * tol;
  const astOk = (x: AsRow) => near(num(x.t) != null ? num(x.t)! / 1000 : null, astTrue(x), 0.06) && near(num(x.calc) != null ? num(x.calc)! / 1000 : null, 0.69 * (x.r1 + x.r2) * x.c, 0.02);
  const monoOk = (x: {c: number; calc?: string}) => near(num(x.calc), 0.69 * MR[1] * x.c, 0.02);
  const led1 = power && (mode === 'astable' ? (t1 + t2 < 0.2 ? true : blink) : mode === 'mono' ? monoOn : bi === 1);
  const led2 = power && (mode === 'astable' ? (t1 + t2 < 0.2 ? true : !blink) : mode === 'mono' ? !monoOn : bi === 0);

  return (
    <PracticalSheet
      number={KEY}
      title="Astable, Monostable and Bistable Multivibrators Using Transistors"
      aim="To demonstrate astable, monostable and bistable multivibrators, measure the period and pulse width, and compare with T = 0.69 RC."
      apparatus={['Two-transistor multivibrator trainer (BC547 × 2, Rc 1 kΩ, LEDs on each collector)', 'Timing resistors 10k, 47k; capacitors 0.1, 10, 100 µF', 'CRO, stopwatch']}
      procedure={[
        'Astable: choose R1, R2 and C. Fast settings (0.1 µF): read T on the CRO. Slow (100 µF): watch the LEDs.',
        'T = 0.69 (R1·C1 + R2·C2). Add a row and fill in measured and calculated T.',
        'Monostable (R = 47k): press TRIGGER. LED 1 stays on for 0.69 R C, then goes off.',
        'Bistable: press SET and RESET in turn; note which LED is on each time.',
      ]}
      precautions={['Switch off before changing mode or parts.', 'Fit electrolytic timing capacitors with correct polarity.']}
      viva={[
        {q: 'How many stable states does each type have?', a: 'Astable none, monostable one, bistable two.'},
        {q: 'Uses?', a: 'Astable: clock / flasher. Monostable: timer, pulse stretcher. Bistable: flip-flop, memory, counter.'},
        {q: 'How do you get an unequal mark–space ratio in an astable?', a: 'Use different R (or C) on the two sides.'},
      ]}
      steps={[
        {label: 'Astable: set two values; note T measured and calculated.', hint: 'Pick Astable at the top of the bench.', done: astRows.filter(astOk).length >= 2},
        {label: 'Monostable: use two capacitor values; check the pulse width.', hint: 'Pick Monostable.', done: monoRows.filter(monoOk).length >= 2},
        {label: 'Bistable: press SET and RESET, and repeat a press.', hint: 'A repeated press changes nothing.', done: biLog.some((l) => l.startsWith('SET')) && biLog.some((l) => l.startsWith('RESET')) && biLog.some((l) => l.includes('no change'))},
        {label: 'Enter your details and print or save the record.', hint: 'Practical record, below the result.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={clsx(styles.seg, styles.noPrint)} role="group" aria-label="Mode" style={{marginBottom: '0.5rem'}}>
          {(['astable', 'mono', 'bi'] as const).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => change(() => setMode(m))}>
              {m === 'astable' ? 'Astable' : m === 'mono' ? 'Monostable' : 'Bistable'}
            </button>
          ))}
        </div>
        <div className={styles.controls} style={{marginTop: 0}}>
          <div>{mode === 'astable' ? scope.view : <Empty>{mode === 'mono' ? 'Press TRIGGER and watch LED 1.' : 'Press SET or RESET.'}</Empty>}</div>
          <div className={clsx(styles.card, styles.noPrint)} style={{alignSelf: 'start'}}>
            <div style={{display: 'flex', gap: '1.5rem', justifyContent: 'center', marginBottom: '0.5rem'}} aria-live="polite">
              {[led1, led2].map((on, k) => (
                <span key={k} style={{display: 'grid', justifyItems: 'center', gap: 4}}>
                  <span aria-label={`LED ${k + 1} ${on ? 'on' : 'off'}`} style={{width: 26, height: 26, borderRadius: '50%', background: on ? (k ? '#4cd964' : '#ff5a4a') : '#4a5560', boxShadow: on ? `0 0 12px ${k ? '#4cd964' : '#ff5a4a'}` : 'none'}} />
                  <small>LED {k + 1}</small>
                </span>
              ))}
            </div>
            {mode === 'astable' && (
              <>
                <Pick label="R1" value={r1} options={[0, 1]} onPick={(v) => change(() => setR1(v))} fmt={(v) => `${MR[v] / 1000}k`} />
                <Pick label="R2" value={r2} options={[0, 1]} onPick={(v) => change(() => setR2(v))} fmt={(v) => `${MR[v] / 1000}k`} />
              </>
            )}
            {mode !== 'bi' && <Pick label="C (both sides)" value={ci} options={[0, 1, 2]} onPick={(v) => change(() => setCi(v))} fmt={(v) => si(MC[v], 'F')} />}
            <div className={styles.seg} role="group" aria-label="Actions" style={{marginTop: '0.6rem'}}>
              <button type="button" aria-pressed={power} onClick={() => (setPower((p) => !p), setPulse(null), setNote(null))}>
                Supply {power ? 'ON' : 'OFF'}
              </button>
              {mode === 'astable' && (
                <button type="button" onClick={addAst}>
                  Add row
                </button>
              )}
              {mode === 'mono' && (
                <button type="button" onClick={trigger}>
                  TRIGGER
                </button>
              )}
              {mode === 'bi' && (
                <>
                  <button type="button" onClick={() => biPress('SET')}>
                    SET
                  </button>
                  <button type="button" onClick={() => biPress('RESET')}>
                    RESET
                  </button>
                </>
              )}
            </div>
            {mode === 'mono' && pulse && <p className={styles.num}>Stopwatch: {((now - pulse.start) / 1000).toFixed(2)} s</p>}
          </div>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        <Table
          caption="Astable"
          head={['R1', 'R2', 'C', 'T measured (ms)', 'T = 0.69 (R1 + R2) C (ms)', 'Check']}
          rows={astRows.map((x, k) => {
            const set = (p: Partial<AsRow>) => setAstRows((r) => r.map((y, j) => (j === k ? {...y, ...p} : y)));
            return [`${x.r1 / 1000}k`, `${x.r2 / 1000}k`, si(x.c, 'F'), inp(`Astable row ${k + 1} measured`, x.t, (v) => set({t: v})), inp(`Astable row ${k + 1} calculated`, x.calc, (v) => set({calc: v})), x.t && x.calc ? <Verdict ok={astOk(x)} /> : '–'];
          })}
        />
        <Table
          caption="Monostable (R = 47 kΩ)"
          head={['C', 'Pulse measured (s)', 'Pulse = 0.69 R C (s)', 'Check']}
          rows={monoRows.map((x, k) => [si(x.c, 'F'), x.meas.toFixed(2), inp(`Monostable row ${k + 1} calculated`, x.calc, (v) => setMonoRows((r) => r.map((y, j) => (j === k ? {...y, calc: v} : y)))), x.calc ? <Verdict ok={monoOk(x)} /> : '–'])}
        />
        <Table caption="Bistable" head={['Event']} rows={biLog.map((l) => [l])} />
        <ResetKit
          onReset={() => {
            setAstRows([]);
            setMonoRows([]);
            setBiLog([]);
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}
