import React, {useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import {GU_1_14_133, GU_1_14_134, GU_1_14_135, GU_1_14_136} from './gu';
import useStoredState from '../useStoredState';
import {Empty, NoteBox, ResetKit, Section, Table, useKitSeed, useRng, type Note} from '../kit';
import {useScope} from '../Scope';
import {si} from '../signals';
import {
  astableDuty,
  astableFreq,
  astableSignal,
  monostablePulseWidth,
  monostableSignal,
  monostableTrigger,
  PWM_CLOCK_HZ,
  pwmClockSignal,
  pwmDuty,
  pwmSignal,
  pwmStuck,
  pwmWidth,
  vcoFreq,
  vcoSignal,
} from './timer555';
import {C_VALUES, Dot, fmtFarad, fmtOhm, Gnd, HRes, R_VALUES, tolFactor, VCap, ValuePicker, VRes, Wires} from './AnalogBench';
import {near} from '../m07/parts';
import styles from '../styles.module.css';

const VCC = 12;
const small = {fontSize: 10, fill: 'var(--lab-kit-muted)'} as const;
const pinName = {fontSize: 8, fill: '#9fb0ba'} as const;
const pinNo = {fontSize: 8, fill: '#8fb4ff'} as const;

/** Component tolerances used on the bench: resistors ±5 %, capacitors ±10 %. */
const useTol = (seed: number) =>
  useRng(seed, (rnd) => ({r1: tolFactor(rnd, 0.05), r2: tolFactor(rnd, 0.05), c: tolFactor(rnd, 0.1)}));

/** First-view scope set-up: CH1 output with 0 V one division down, trigger at mid-level. */
const OUT1 = {vdiv: 5, pos: -1, coupling: 'DC' as const, on: true};
const OUT_TOP = {vdiv: 5, pos: 0.5, coupling: 'DC' as const, on: true};
const OUT_LOW = {vdiv: 5, pos: -3, coupling: 'DC' as const, on: true};

type Pin5 = {kind: 'bypass'} | {kind: 'vc'; v: number};

/** 8-pin 555 with its timing network. Astable: R1, R2, C. Monostable: R and C on pins 6/7. */
function Timer555Symbol({mode, r1, r2, c, pin5, rLabel = 'R1'}: {mode: 'astable' | 'mono'; r1: number; r2?: number; c: number; pin5: Pin5; rLabel?: string}): React.JSX.Element {
  const astable = mode === 'astable';
  return (
    <svg viewBox="0 0 300 225" role="img" aria-label={astable ? '555 astable circuit' : '555 monostable circuit'}>
      <Wires d={`M110 12 H262 M125 45 V12 M175 45 V12 M165 140 V150 M190 70 H225 M255 12 V43 M255 89 V120 M190 120 H255 ${
        astable ? 'M100 70 H75 M100 95 H75 M75 70 V161 M75 169 V180 M255 120 V208 H173 M127 208 H45 V95 H75' : 'M100 70 H60 M190 95 H255 M255 120 V161 M255 169 V185'
      } ${pin5.kind === 'bypass' ? 'M125 140 V156 M125 164 V172' : 'M125 140 V168'}`} />
      <text x={266} y={16} style={small}>
        +{VCC} V
      </text>
      <rect x={100} y={45} width={90} height={95} rx={4} fill="#1c2024" stroke="#565d63" strokeWidth={1.5} />
      <text x={145} y={108} textAnchor="middle" style={{fontSize: 10, fontWeight: 700, fill: '#8fb4ff'}}>
        NE555
      </text>
      <text x={125} y={57} textAnchor="middle" style={pinName}>
        RST
      </text>
      <text x={175} y={57} textAnchor="middle" style={pinName}>
        VCC
      </text>
      <text x={125} y={133} textAnchor="middle" style={pinName}>
        CTRL
      </text>
      <text x={165} y={133} textAnchor="middle" style={pinName}>
        GND
      </text>
      <text x={104} y={73} style={pinName}>
        TRIG
      </text>
      {astable && (
        <text x={104} y={98} style={pinName}>
          THR
        </text>
      )}
      <text x={186} y={73} textAnchor="end" style={pinName}>
        OUT
      </text>
      {!astable && (
        <text x={186} y={98} textAnchor="end" style={pinName}>
          THR
        </text>
      )}
      <text x={186} y={123} textAnchor="end" style={pinName}>
        DIS
      </text>
      <text x={129} y={42} style={pinNo}>
        4
      </text>
      <text x={179} y={42} style={pinNo}>
        8
      </text>
      <text x={96} y={67} textAnchor="end" style={pinNo}>
        2
      </text>
      {astable && (
        <text x={96} y={92} textAnchor="end" style={pinNo}>
          6
        </text>
      )}
      <text x={194} y={67} style={pinNo}>
        3
      </text>
      {!astable && (
        <text x={194} y={92} style={pinNo}>
          6
        </text>
      )}
      <text x={194} y={117} style={pinNo}>
        7
      </text>
      <text x={129} y={149} style={pinNo}>
        5
      </text>
      <text x={169} y={147} style={pinNo}>
        1
      </text>
      <Gnd x={165} y={150} />
      <text x={228} y={73} style={small}>
        OUT
      </text>
      <VRes x={255} y={66} label={`${rLabel} ${fmtOhm(r1)}`} />
      <Dot x={255} y={120} />
      {astable ? (
        <>
          <HRes x={150} y={208} label={`R2 ${fmtOhm(r2 ?? 0)}`} />
          <VCap x={75} y={165} label={`C ${fmtFarad(c)}`} />
          <Gnd x={75} y={180} />
          <Dot x={75} y={95} />
        </>
      ) : (
        <>
          <Dot x={255} y={95} />
          <VCap x={255} y={165} label={`C ${fmtFarad(c)}`} />
          <Gnd x={255} y={185} />
          <text x={8} y={74} style={small}>
            Trig
          </text>
        </>
      )}
      {pin5.kind === 'bypass' ? (
        <>
          <VCap x={125} y={160} label="10n" />
          <Gnd x={125} y={172} />
        </>
      ) : (
        <>
          <Dot x={125} y={168} />
          <text x={125} y={182} textAnchor="middle" style={{fontSize: 10, fontWeight: 700, fill: '#f2c230'}}>
            Vc = {pin5.v} V
          </text>
        </>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 1.14.133 Astable multivibrator
// ---------------------------------------------------------------------------

type AstableRow = {r1: number; r2: number; c: number; f: number; fc: number; duty: number; dutyc: number};

export function AstableLab(): React.JSX.Element {
  const KEY = '1.14.133';
  const [seed, newKit] = useKitSeed(KEY);
  const tol = useTol(seed);
  const [r1, setR1] = useState(1000);
  const [r2, setR2] = useState(10000);
  const [c, setC] = useState(0.1e-6);
  const [rows, setRows] = useStoredState<AstableRow[]>(`lab:${KEY}:rows2`, []);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);
  const [r1a, r2a, ca] = [r1 * tol.r1, r2 * tol.r2, c * tol.c];
  const sig = astableSignal(r1a, r2a, ca, VCC);
  const scope = useScope('dso', {ch1: sig}, {ch1: OUT1, tdiv: 1e-3, trigLevel: VCC / 2});
  const f = astableFreq(r1a, r2a, ca);
  const duty = astableDuty(r1a, r2a);

  const noteIt = () => {
    if (rows.some((x) => x.r1 === r1 && x.r2 === r2 && x.c === c)) {
      setNote({kind: 'warn', text: 'Already noted. Change R1, R2 or C and read again.'});
      return;
    }
    const row = {r1, r2, c, f, fc: astableFreq(r1, r2, c), duty: duty * 100, dutyc: astableDuty(r1, r2) * 100};
    setRows((rr) => [...rr, row].slice(-6));
    setNote({kind: 'good', text: `Noted: f = ${si(f, 'Hz')}, duty = ${(duty * 100).toFixed(0)} %.`});
  };

  return (
    <PracticalSheet
      number={KEY}
      title="Construct and Test an Astable Multivibrator Circuit Using IC 555"
      aim="To wire the 555 timer in astable (free-running) mode and verify its output frequency and duty cycle against the formula."
      apparatus={['IC NE555', '+12 V supply', 'Resistor (±5 %) and capacitor (±10 %) set', 'Dual-trace oscilloscope']}
      procedure={['Pick R1, R2 and C.', 'Power the circuit and view the output on the scope.', 'Read the frequency and duty cycle (MEASURE on the scope).', 'Compare with f = 1.44 / ((R1 + 2R2)C).']}
      precautions={['Pin 5 (control voltage) is normally bypassed to ground through 0.01 µF. Leave it so for this test.', 'Keep R1 + 2R2 well above a few hundred ohms to limit discharge current.']}
      viva={[
        {q: 'Astable frequency formula?', a: 'f = 1.44 / ((R1 + 2R2)C).'},
        {q: 'Why is the duty cycle always above 50 % in a basic astable 555?', a: 'The capacitor charges through R1 + R2 but discharges only through R2, so the high time is always longer than the low time.'},
        {q: 'Why does the measured frequency differ a little from the formula?', a: 'The resistors and capacitor have a tolerance, so the real RC product is not exactly the marked one.'},
        {q: 'Name two uses of an astable 555.', a: 'LED flasher, clock pulse generator, tone generator, PWM source.'},
      ]}
      steps={[
        {label: 'Pick R1, R2 and C, then press Note reading.', hint: 'Read f and duty on the scope (MEASURE).', done: rows.length >= 1},
        {label: 'Change R2 or C and note a second reading.', hint: 'Calculated f = 1.44 / ((R1 + 2R2)C).', done: rows.length >= 2},
        {label: 'Check a measured f is within 20 % of the formula.', hint: 'The table shows both. R is ±5 %, C is ±10 %.', done: rows.some((r) => near(r.f, r.fc, 0.2))},
        {label: 'Enter your details and press Print / Save as PDF.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_14_133}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.kit}>
          <Timer555Symbol mode="astable" r1={r1} r2={r2} c={c} pin5={{kind: 'bypass'}} />
        </div>
        <ValuePicker label="R1" value={r1} options={R_VALUES} fmt={fmtOhm} onChange={setR1} />
        <ValuePicker label="R2" value={r2} options={R_VALUES} fmt={fmtOhm} onChange={setR2} />
        <ValuePicker label="C" value={c} options={C_VALUES} fmt={fmtFarad} onChange={setC} />
        {scope.view}
        <div className={clsx(styles.controls, styles.noPrint)} style={{marginTop: '0.4rem'}}>
          <button type="button" className={clsx(styles.btn, styles.primary)} onClick={noteIt}>
            Note reading
          </button>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {rows.length === 0 ? (
          <Empty>No readings yet.</Empty>
        ) : (
          <Table head={['R1', 'R2', 'C', 'f meas.', 'f calc.', 'Duty meas.', 'Duty calc.']} rows={rows.map((r) => [fmtOhm(r.r1), fmtOhm(r.r2), fmtFarad(r.c), si(r.f, 'Hz'), si(r.fc, 'Hz'), `${r.duty.toFixed(0)} %`, `${r.dutyc.toFixed(0)} %`])} />
        )}
      </Section>
      <Section title="Result">
        <ResetKit onReset={() => (setRows([]), setPrinted(false), setNote(null), newKit())} />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// 1.14.134 Monostable multivibrator
// ---------------------------------------------------------------------------

type MonoRow = {r: number; c: number; tw: number; twc: number};

export function MonostableLab(): React.JSX.Element {
  const KEY = '1.14.134';
  const [seed, newKit] = useKitSeed(KEY);
  const tol = useTol(seed);
  const [r, setR] = useState(100000);
  const [c, setC] = useState(0.1e-6);
  const [rows, setRows] = useStoredState<MonoRow[]>(`lab:${KEY}:rows2`, []);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);
  const [ra, ca] = [r * tol.r1, c * tol.c];
  const scope = useScope('dso', {ch1: monostableSignal(ra, ca, VCC), ch2: monostableTrigger(ra, ca, VCC)}, {ch1: OUT_TOP, ch2: OUT_LOW, display: 'DUAL', tdiv: 5e-3, trigLevel: VCC / 2});
  const tw = monostablePulseWidth(ra, ca);

  const noteIt = () => {
    if (rows.some((x) => x.r === r && x.c === c)) {
      setNote({kind: 'warn', text: 'Already noted. Change R or C and read again.'});
      return;
    }
    setRows((rr) => [...rr, {r, c, tw, twc: monostablePulseWidth(r, c)}].slice(-6));
    setNote({kind: 'good', text: `Noted: pulse width = ${si(tw, 's')}.`});
  };

  return (
    <PracticalSheet
      number={KEY}
      title="Construct and Test a Monostable Multivibrator Circuit Using IC 555"
      aim="To wire the 555 timer as a one-shot pulse generator and verify its output pulse width against the formula t = 1.1RC."
      apparatus={['IC NE555', '+12 V supply', 'Resistor (±5 %) and capacitor (±10 %) set', 'Push-button trigger', 'Oscilloscope']}
      procedure={['Pick R and C.', 'Trigger pin 2 with a falling edge (CH2 shows the trigger).', 'Measure the HIGH pulse width on CH1.', 'Compare with t = 1.1RC.']}
      precautions={['The trigger pulse must be shorter than the output pulse, or the timer re-triggers continuously.', 'Pin 4 (reset) must be held high for normal operation.']}
      viva={[
        {q: 'Monostable pulse-width formula?', a: 't = 1.1 × R × C.'},
        {q: 'What starts the timing cycle?', a: 'A trigger pulse on pin 2 falling below 1/3 Vcc.'},
        {q: 'Name two uses.', a: 'Pulse-width generation, switch debouncing, touch/proximity switches, frequency dividers.'},
      ]}
      steps={[
        {label: 'Pick R and C, then press Note reading.', hint: 'Read the pulse width on CH1. CH2 shows the trigger.', done: rows.length >= 1},
        {label: 'Change R or C and note a second reading.', hint: 'Calculated pulse width = 1.1RC.', done: rows.length >= 2},
        {label: 'Check a measured pulse width is within 20 % of 1.1RC.', hint: 'The table shows both. R is ±5 %, C is ±10 %.', done: rows.some((r2) => near(r2.tw, r2.twc, 0.2))},
        {label: 'Enter your details and press Print / Save as PDF.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_14_134}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.kit}>
          <Timer555Symbol mode="mono" r1={r} c={c} pin5={{kind: 'bypass'}} rLabel="R" />
        </div>
        <ValuePicker label="R" value={r} options={R_VALUES} fmt={fmtOhm} onChange={setR} />
        <ValuePicker label="C" value={c} options={C_VALUES} fmt={fmtFarad} onChange={setC} />
        {scope.view}
        <div className={clsx(styles.controls, styles.noPrint)} style={{marginTop: '0.4rem'}}>
          <button type="button" className={clsx(styles.btn, styles.primary)} onClick={noteIt}>
            Note reading
          </button>
        </div>
        <NoteBox note={note} />
        <p className={styles.muted}>Triggered every 5 pulse widths so the pulse is easy to find. Use AUTO SET if the trace is off screen.</p>
      </Section>
      <Section title="Observation table">
        {rows.length === 0 ? (
          <Empty>No readings yet.</Empty>
        ) : (
          <Table head={['R', 'C', 'Pulse width meas.', 'Pulse width calc.']} rows={rows.map((r2) => [fmtOhm(r2.r), fmtFarad(r2.c), si(r2.tw, 's'), si(r2.twc, 's')])} />
        )}
      </Section>
      <Section title="Result">
        <ResetKit onReset={() => (setRows([]), setPrinted(false), setNote(null), newKit())} />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// 1.14.135 Voltage-controlled oscillator (V to F converter)
// ---------------------------------------------------------------------------

const VCTRL_VALUES = [2, 4, 6, 8, 10];

export function VcoLab(): React.JSX.Element {
  const KEY = '1.14.135';
  const [seed, newKit] = useKitSeed(KEY);
  const tol = useTol(seed);
  const r1 = 1000;
  const [r2, setR2] = useState(10000);
  const [c, setC] = useState(0.1e-6);
  const [vc, setVc] = useState(8);
  const [rows, setRows] = useStoredState<{vc: number; f: number}[]>(`lab:${KEY}:rows2`, []);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);
  const [r1a, r2a, ca] = [r1 * tol.r1, r2 * tol.r2, c * tol.c];
  const sig = vcoSignal(r1a, r2a, ca, VCC, vc);
  const scope = useScope('dso', {ch1: sig}, {ch1: OUT1, tdiv: 1e-3, trigLevel: VCC / 2});
  const f = vcoFreq(r1a, r2a, ca, VCC, vc);

  const newCircuit = (fn: () => void) => {
    fn();
    setRows([]);
    setNote(null);
  };
  const noteIt = () => {
    setRows((rr) => [...rr.filter((x) => x.vc !== vc), {vc, f}].sort((a, b) => a.vc - b.vc));
    setNote({kind: 'good', text: `Noted: Vc = ${vc} V gives f = ${si(f, 'Hz')}.`});
  };

  return (
    <PracticalSheet
      number={KEY}
      title="Construct and Test a Voltage-Controlled Oscillator (V to F Converter) Using IC 555"
      aim="To drive the 555 timer's control-voltage pin (5) from a variable DC source and show that the output frequency changes with the applied control voltage."
      apparatus={['IC NE555', '+12 V supply', 'Variable DC source (potentiometer)', 'Resistor (±5 %) and capacitor (±10 %) set', 'Oscilloscope / frequency counter']}
      procedure={['Pick R2 and C for a convenient free-running frequency.', 'Apply different control voltages to pin 5.', 'Note the output frequency for each.', 'Plot or tabulate frequency against control voltage.']}
      precautions={['Keep the control voltage below Vcc.', 'A decoupling capacitor on pin 5 avoids noise upsetting the frequency.', 'Changing R2 or C starts a new table.']}
      viva={[
        {q: 'What is normally connected to pin 5?', a: 'Nothing but a bypass capacitor to ground. It sits at the internal 2/3 Vcc reference.'},
        {q: 'What happens to frequency as control voltage rises?', a: 'It falls. The capacitor must charge to a higher level each cycle, so the cycle takes longer.'},
        {q: 'Name one use of a 555 VCO.', a: 'Voltage-to-frequency conversion for sensor read-out, tone generation, FM-style modulation.'},
      ]}
      steps={[
        {label: 'Pick a control voltage on pin 5 and press Note reading.', hint: 'Changing R2 or C starts a new table.', done: rows.length >= 1},
        {label: 'Change the control voltage and note again.', hint: 'Read f on the scope (MEASURE).', done: rows.length >= 2},
        {label: `Note a third control voltage. Readings: ${Math.min(rows.length, 3)}/3`, hint: 'For example 2 V, 6 V and 10 V.', done: rows.length >= 3},
        {label: 'Check f falls as the control voltage rises.', hint: 'Compare the first and last rows of the table.', done: rows.length >= 2 && rows[0].f > rows[rows.length - 1].f},
        {label: 'Enter your details and press Print / Save as PDF.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_14_135}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.kit}>
          <Timer555Symbol mode="astable" r1={r1} r2={r2} c={c} pin5={{kind: 'vc', v: vc}} />
        </div>
        <ValuePicker label="R2" value={r2} options={R_VALUES} fmt={fmtOhm} onChange={(v) => v !== r2 && newCircuit(() => setR2(v))} />
        <ValuePicker label="C" value={c} options={C_VALUES} fmt={fmtFarad} onChange={(v) => v !== c && newCircuit(() => setC(v))} />
        <ValuePicker label="Control voltage (pin 5)" value={vc} options={VCTRL_VALUES} fmt={(v) => `${v} V`} onChange={setVc} />
        {scope.view}
        <div className={clsx(styles.controls, styles.noPrint)} style={{marginTop: '0.4rem'}}>
          <button type="button" className={clsx(styles.btn, styles.primary)} onClick={noteIt}>
            Note reading
          </button>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {rows.length === 0 ? <Empty>No readings yet.</Empty> : <Table caption={`R1 1k, R2 ${fmtOhm(r2)}, C ${fmtFarad(c)}`} head={['Control voltage', 'Frequency']} rows={rows.map((r2x) => [`${r2x.vc} V`, si(r2x.f, 'Hz')])} />}
      </Section>
      <Section title="Result">
        <ResetKit onReset={() => (setRows([]), setPrinted(false), setNote(null), newKit())} />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// 1.14.136 555 timer as a pulse-width modulator
// ---------------------------------------------------------------------------

export function PwmLab(): React.JSX.Element {
  const KEY = '1.14.136';
  const [seed, newKit] = useKitSeed(KEY);
  const tol = useTol(seed);
  const [r, setR] = useState(47000);
  const [c, setC] = useState(0.01e-6);
  const [vc, setVc] = useState(6);
  const [rows, setRows] = useStoredState<{vc: number; width: number; duty: number}[]>(`lab:${KEY}:rows2`, []);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);
  const [ra, ca] = [r * tol.r1, c * tol.c];
  const width = pwmWidth(ra, ca, VCC, vc);
  const stuck = pwmStuck(width);
  const scope = useScope('dso', {ch1: pwmSignal(width, VCC), ch2: pwmClockSignal(VCC)}, {ch1: OUT_TOP, ch2: OUT_LOW, display: 'DUAL', tdiv: 2e-4, trigLevel: VCC / 2});

  const newCircuit = (fn: () => void) => {
    fn();
    setRows([]);
    setNote(null);
  };
  const noteIt = () => {
    if (stuck) {
      setNote({kind: 'warn', text: 'Pulse is longer than the clock period: the output stays HIGH. Lower R or C, or the control voltage.'});
      return;
    }
    const duty = pwmDuty(width) * 100;
    setRows((rr) => [...rr.filter((x) => x.vc !== vc), {vc, width, duty}].sort((a, b) => a.vc - b.vc));
    setNote({kind: 'good', text: `Noted: Vc = ${vc} V gives pulse width ${si(width, 's')}, duty ${duty.toFixed(0)} %.`});
  };

  return (
    <PracticalSheet
      number={KEY}
      title="Construct and Test a 555 Timer as a Pulse-Width Modulator"
      aim={`To use the 555 as a monostable triggered by a fixed ${PWM_CLOCK_HZ / 1000} kHz clock, drive its control-voltage pin (5) from a DC source, and show that the output pulse width (duty cycle) follows the control voltage while the frequency stays fixed.`}
      apparatus={['IC NE555', '+12 V supply', `Clock source (${PWM_CLOCK_HZ / 1000} kHz) for the trigger pin`, 'Variable DC source (potentiometer)', 'Resistor (±5 %) and capacitor (±10 %) set', 'Oscilloscope']}
      procedure={['Pick R and C.', 'Apply different control voltages to pin 5.', 'Read the output pulse width on CH1 and the clock on CH2.', 'Work out the duty cycle = pulse width / clock period.']}
      precautions={['Keep the control voltage below Vcc.', 'Keep the pulse shorter than the clock period, or the output sticks HIGH.', 'Changing R or C starts a new table.']}
      viva={[
        {q: 'What is being modulated here?', a: 'The pulse width (duty cycle) of the 555 output, by the control voltage on pin 5.'},
        {q: 'Why does a higher control voltage give a wider pulse?', a: 'Pin 5 sets the level the capacitor must reach: t = RC ln(Vcc / (Vcc − Vc)). A higher Vc takes longer.'},
        {q: 'How does PWM differ from the VCO circuit?', a: 'Here the trigger clock fixes the frequency and only the pulse width follows Vc. In the VCO the frequency itself changes.'},
        {q: 'Name one use of 555 PWM.', a: 'Motor speed control, LED dimming, switch-mode power regulation.'},
      ]}
      steps={[
        {label: 'Pick a control voltage on pin 5 and press Note reading.', hint: 'Duty = pulse width / clock period. Changing R or C starts a new table.', done: rows.length >= 1},
        {label: 'Change the control voltage and note again.', hint: 'If the output sticks HIGH, lower R or C.', done: rows.length >= 2},
        {label: `Note a third control voltage. Readings: ${Math.min(rows.length, 3)}/3`, hint: 'For example 2 V, 6 V and 8 V.', done: rows.length >= 3},
        {label: 'Check duty cycle rises with the control voltage.', hint: 'Compare the first and last rows of the table.', done: rows.length >= 2 && rows[0].duty < rows[rows.length - 1].duty},
        {label: 'Enter your details and press Print / Save as PDF.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_14_136(PWM_CLOCK_HZ / 1000)}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.kit}>
          <Timer555Symbol mode="mono" r1={r} c={c} pin5={{kind: 'vc', v: vc}} rLabel="R" />
        </div>
        <ValuePicker label="R" value={r} options={R_VALUES} fmt={fmtOhm} onChange={(v) => v !== r && newCircuit(() => setR(v))} />
        <ValuePicker label="C" value={c} options={C_VALUES} fmt={fmtFarad} onChange={(v) => v !== c && newCircuit(() => setC(v))} />
        <ValuePicker label="Control voltage (pin 5)" value={vc} options={VCTRL_VALUES} fmt={(v) => `${v} V`} onChange={setVc} />
        {scope.view}
        <div className={clsx(styles.controls, styles.noPrint)} style={{marginTop: '0.4rem'}}>
          <button type="button" className={clsx(styles.btn, styles.primary)} onClick={noteIt}>
            Note reading
          </button>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {rows.length === 0 ? <Empty>No readings yet.</Empty> : <Table caption={`R ${fmtOhm(r)}, C ${fmtFarad(c)}, clock ${PWM_CLOCK_HZ / 1000} kHz`} head={['Control voltage', 'Pulse width', 'Duty cycle']} rows={rows.map((r2) => [`${r2.vc} V`, si(r2.width, 's'), `${r2.duty.toFixed(0)} %`])} />}
      </Section>
      <Section title="Result">
        <ResetKit onReset={() => (setRows([]), setPrinted(false), setNote(null), newKit())} />
      </Section>
    </PracticalSheet>
  );
}
