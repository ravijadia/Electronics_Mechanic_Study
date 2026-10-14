import React, {useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import useStoredState from '../useStoredState';
import {NoteBox, ResetKit, Section, Table, type Note} from '../kit';
import {useScope} from '../Scope';
import {si} from '../signals';
import {astableDuty, astableFreq, astableSignal, monostablePulseWidth, monostableSignal, pwmDuty, pwmSignal, vcoFreq, vcoSignal} from './timer555';
import {C_VALUES, fmtFarad, fmtOhm, HRes, R_VALUES, VCap, ValuePicker} from './AnalogBench';
import {kitLabel, near} from '../m07/parts';
import styles from '../styles.module.css';

const VCC = 12;

/** Static 8-pin 555 body with its timing network drawn around it. */
function Timer555({x, y, r1, r2, c, label}: {x: number; y: number; r1: number; r2?: number; c: number; label?: string}): React.JSX.Element {
  return (
    <g>
      <rect x={x} y={y} width={80} height={90} rx={4} fill="#1c2024" stroke="#565d63" strokeWidth={1.5} />
      <text x={x + 40} y={y + 50} textAnchor="middle" style={{...kitLabel, fontSize: 10, fill: '#8fb4ff'}}>
        {label ?? 'NE555'}
      </text>
      <HRes x={x + 140} y={y - 10} label={`R1 ${fmtOhm(r1)}`} />
      {r2 != null && <HRes x={x + 140} y={y + 30} label={`R2 ${fmtOhm(r2)}`} />}
      <VCap x={x + 40} y={y + 120} label={`C ${fmtFarad(c)}`} />
      <path
        d={`M${x + 80} ${y - 10} H${x + 165} M${x + 165} ${y - 10} V${y + (r2 != null ? 30 : -10)} ${r2 != null ? `H${x + 80}` : ''} M${x + 40} ${y + 90} V${y + 110}`}
        fill="none"
        stroke="var(--lab-wire)"
        strokeWidth={1.5}
      />
    </g>
  );
}

// ---------------------------------------------------------------------------
// 1.14.133 Astable multivibrator
// ---------------------------------------------------------------------------

export function AstableLab(): React.JSX.Element {
  const KEY = '1.14.133';
  const [r1, setR1] = useState(1000);
  const [r2, setR2] = useState(10000);
  const [c, setC] = useState(0.1e-6);
  const [rows, setRows] = useStoredState<{r1: number; r2: number; c: number; f: number; duty: number}[]>(`lab:${KEY}:rows`, []);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);
  const sig = astableSignal(r1, r2, c, VCC);
  const scope = useScope('dso', {ch1: sig});
  const f = astableFreq(r1, r2, c);
  const duty = astableDuty(r1, r2);

  const noteIt = () => {
    setRows((rr) => [...rr, {r1, r2, c, f: Number(f.toFixed(1)), duty: Number((duty * 100).toFixed(1))}].slice(-6));
    setNote({kind: 'good', text: `Calculated f = ${si(f, 'Hz')}, duty = ${(duty * 100).toFixed(0)} %. Confirm this against the scope trace.`});
  };

  return (
    <PracticalSheet
      number={KEY}
      title="Construct and Test an Astable Multivibrator Circuit Using IC 555"
      aim="To wire the 555 timer in astable (free-running) mode and verify its output frequency and duty cycle against the formula."
      apparatus={['IC NE555', '+12 V supply', 'Resistor and capacitor set', 'Dual-trace oscilloscope']}
      procedure={['Pick R1, R2 and C.', 'Power the circuit and view the output on the scope.', 'Measure the period and duty cycle on-screen.', 'Compare with f = 1.44 / ((R1 + 2R2)C).']}
      precautions={['Pin 5 (control voltage) is normally bypassed to ground through 0.01 µF — leave it so for this test.', 'Keep R1 + 2R2 well above a few hundred ohms to limit discharge current.']}
      viva={[
        {q: 'Astable frequency formula?', a: 'f = 1.44 / ((R1 + 2R2)C).'},
        {q: 'Why is the duty cycle always above 50 % in a basic astable 555?', a: 'The capacitor charges through R1 + R2 but discharges only through R2, so the high time is always longer than the low time.'},
        {q: 'Name two uses of an astable 555.', a: 'LED flasher, clock pulse generator, tone generator, PWM source.'},
      ]}
      tasks={[
        {label: 'Measure 2 or more (R1, R2, C) combinations.', done: rows.length >= 2},
        {label: 'Confirm the measured frequency matches the formula.', done: rows.some((r) => near(r.f, astableFreq(r.r1, r.r2, r.c), 0.05))},
        {label: 'Print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.kit}>
          <svg viewBox="0 0 260 150" role="img" aria-label="555 astable circuit">
            <Timer555 x={20} y={20} r1={r1} r2={r2} c={c} />
          </svg>
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
        <Table head={['R1', 'R2', 'C', 'f (calc.)', 'Duty (calc.)']} rows={rows.map((r) => [fmtOhm(r.r1), fmtOhm(r.r2), fmtFarad(r.c), si(r.f, 'Hz'), `${r.duty} %`])} />
      </Section>
      <Section title="Result">
        <ResetKit onReset={() => (setRows([]), setPrinted(false))} />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// 1.14.134 Monostable multivibrator
// ---------------------------------------------------------------------------

export function MonostableLab(): React.JSX.Element {
  const KEY = '1.14.134';
  const [r, setR] = useState(100000);
  const [c, setC] = useState(10e-6);
  const [rows, setRows] = useStoredState<{r: number; c: number; tw: number}[]>(`lab:${KEY}:rows`, []);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);
  const sig = monostableSignal(r, c, VCC);
  const scope = useScope('dso', {ch1: sig});
  const tw = monostablePulseWidth(r, c);

  const noteIt = () => {
    setRows((rr) => [...rr, {r, c, tw: Number((tw * 1000).toFixed(2))}].slice(-6));
    setNote({kind: 'good', text: `Calculated pulse width t = 1.1RC = ${si(tw, 's')}. Confirm on the scope.`});
  };

  return (
    <PracticalSheet
      number={KEY}
      title="Construct and Test a Monostable Multivibrator Circuit Using IC 555"
      aim="To wire the 555 timer as a one-shot pulse generator and verify its output pulse width against the formula t = 1.1RC."
      apparatus={['IC NE555', '+12 V supply', 'Resistor and capacitor set', 'Push-button trigger', 'Oscilloscope']}
      procedure={['Pick R and C.', 'Trigger pin 2 with a falling edge.', 'Measure the HIGH pulse width on the scope.', 'Compare with t = 1.1RC.']}
      precautions={['The trigger pulse must be shorter than the output pulse, or the timer re-triggers continuously.', 'Pin 4 (reset) must be held high for normal operation.']}
      viva={[
        {q: 'Monostable pulse-width formula?', a: 't = 1.1 × R × C.'},
        {q: 'What starts the timing cycle?', a: 'A trigger pulse on pin 2 falling below 1/3 Vcc.'},
        {q: 'Name two uses.', a: 'Pulse-width generation, switch debouncing, touch/proximity switches, frequency dividers.'},
      ]}
      tasks={[
        {label: 'Measure 2 or more (R, C) combinations.', done: rows.length >= 2},
        {label: 'Confirm the measured pulse width matches 1.1RC.', done: rows.some((r2) => near(r2.tw / 1000, monostablePulseWidth(r2.r, r2.c), 0.05))},
        {label: 'Print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.kit}>
          <svg viewBox="0 0 260 150" role="img" aria-label="555 monostable circuit">
            <Timer555 x={20} y={20} r1={r} c={c} />
          </svg>
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
        <p className={styles.muted}>Shown free-running (one trigger every 5 pulse widths) so the pulse is easy to find on the scope.</p>
      </Section>
      <Section title="Observation table">
        <Table head={['R', 'C', 'Pulse width (calc.)']} rows={rows.map((r2) => [fmtOhm(r2.r), fmtFarad(r2.c), `${r2.tw} ms`])} />
      </Section>
      <Section title="Result">
        <ResetKit onReset={() => (setRows([]), setPrinted(false))} />
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
  const r1 = 1000;
  const [r2, setR2] = useState(10000);
  const [c, setC] = useState(0.1e-6);
  const [vc, setVc] = useState(8);
  const [rows, setRows] = useStoredState<{vc: number; f: number}[]>(`lab:${KEY}:rows`, []);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);
  const sig = vcoSignal(r1, r2, c, VCC, vc);
  const scope = useScope('dso', {ch1: sig});
  const f = vcoFreq(r1, r2, c, VCC, vc);

  const noteIt = () => {
    setRows((rr) => [...rr.filter((x) => x.vc !== vc), {vc, f: Number(f.toFixed(1))}].sort((a, b) => a.vc - b.vc).slice(-6));
    setNote({kind: 'good', text: `Control voltage ${vc} V → f ≈ ${si(f, 'Hz')}.`});
  };

  return (
    <PracticalSheet
      number={KEY}
      title="Construct and Test a Voltage-Controlled Oscillator (V to F Converter) Using IC 555"
      aim="To drive the 555 timer's control-voltage pin (5) from a variable DC source and show that the output frequency changes with the applied control voltage."
      apparatus={['IC NE555', '+12 V supply', 'Variable DC source (potentiometer)', 'Resistor and capacitor set', 'Oscilloscope / frequency counter']}
      procedure={['Pick R2 and C for a convenient free-running frequency.', 'Apply different control voltages to pin 5.', 'Note the output frequency for each.', 'Plot or tabulate frequency against control voltage.']}
      precautions={['Keep the control voltage below Vcc.', 'A decoupling capacitor on pin 5 avoids noise upsetting the frequency.']}
      viva={[
        {q: 'What is normally connected to pin 5?', a: 'Nothing but a bypass capacitor to ground — it sits at the internal 2/3 Vcc reference.'},
        {q: 'What happens to frequency as control voltage rises?', a: 'It falls — a higher threshold means a longer charge time each cycle.'},
        {q: 'Name one use of a 555 VCO.', a: 'Voltage-to-frequency conversion for sensor read-out, tone generation, FM-style modulation.'},
      ]}
      tasks={[
        {label: 'Measure frequency at 3 or more control voltages.', done: rows.length >= 3},
        {label: 'Confirm frequency falls as control voltage rises.', done: rows.length >= 2 && rows[0].f > rows[rows.length - 1].f},
        {label: 'Print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.kit}>
          <svg viewBox="0 0 260 150" role="img" aria-label="555 VCO circuit">
            <Timer555 x={20} y={20} r1={r1} r2={r2} c={c} label="NE555 (pin 5 driven)" />
          </svg>
        </div>
        <ValuePicker label="R2" value={r2} options={R_VALUES} fmt={fmtOhm} onChange={setR2} />
        <ValuePicker label="C" value={c} options={C_VALUES} fmt={fmtFarad} onChange={setC} />
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
        <Table head={['Control voltage', 'Frequency']} rows={rows.map((r2) => [`${r2.vc} V`, si(r2.f, 'Hz')])} />
      </Section>
      <Section title="Result">
        <ResetKit onReset={() => (setRows([]), setPrinted(false))} />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// 1.14.136 555 timer as a pulse-width modulator
// ---------------------------------------------------------------------------

export function PwmLab(): React.JSX.Element {
  const KEY = '1.14.136';
  const r1 = 1000;
  const [r2, setR2] = useState(10000);
  const [c, setC] = useState(0.1e-6);
  const [vc, setVc] = useState(6);
  const [rows, setRows] = useStoredState<{vc: number; duty: number}[]>(`lab:${KEY}:rows`, []);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);
  const sig = pwmSignal(r1, r2, c, VCC, vc);
  const scope = useScope('dso', {ch1: sig});
  const duty = pwmDuty(VCC, vc);

  const noteIt = () => {
    setRows((rr) => [...rr.filter((x) => x.vc !== vc), {vc, duty: Number((duty * 100).toFixed(1))}].sort((a, b) => a.vc - b.vc).slice(-6));
    setNote({kind: 'good', text: `Control voltage ${vc} V → duty cycle ≈ ${(duty * 100).toFixed(0)} %.`});
  };

  return (
    <PracticalSheet
      number={KEY}
      title="Construct and Test a 555 Timer as a Pulse-Width Modulator"
      aim="To drive the 555 timer's control-voltage pin (5) from a variable DC source and show that the output duty cycle changes while the frequency stays roughly fixed."
      apparatus={['IC NE555', '+12 V supply', 'Variable DC source (potentiometer)', 'Resistor and capacitor set', 'Oscilloscope']}
      procedure={['Pick R2 and C for a convenient fixed frequency.', 'Apply different control voltages to pin 5.', 'Note the output duty cycle for each.', 'Tabulate duty cycle against control voltage.']}
      precautions={['Keep the control voltage below Vcc.', 'Check the frequency stays roughly constant — only the duty cycle should move.']}
      viva={[
        {q: 'What is being modulated here?', a: 'The pulse width (duty cycle) of the 555 output, by the control voltage on pin 5.'},
        {q: 'How does PWM differ from the VCO circuit?', a: 'Both drive pin 5, but a PWM circuit is designed so frequency stays nearly fixed while duty cycle changes; the VCO circuit lets frequency itself change.'},
        {q: 'Name one use of 555 PWM.', a: 'Motor speed control, LED dimming, switch-mode power regulation.'},
      ]}
      tasks={[
        {label: 'Measure duty cycle at 3 or more control voltages.', done: rows.length >= 3},
        {label: 'Confirm duty cycle rises with control voltage.', done: rows.length >= 2 && rows[0].duty < rows[rows.length - 1].duty},
        {label: 'Print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.kit}>
          <svg viewBox="0 0 260 150" role="img" aria-label="555 PWM circuit">
            <Timer555 x={20} y={20} r1={r1} r2={r2} c={c} label="NE555 (pin 5 driven)" />
          </svg>
        </div>
        <ValuePicker label="R2" value={r2} options={R_VALUES} fmt={fmtOhm} onChange={setR2} />
        <ValuePicker label="C" value={c} options={C_VALUES} fmt={fmtFarad} onChange={setC} />
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
        <Table head={['Control voltage', 'Duty cycle']} rows={rows.map((r2) => [`${r2.vc} V`, `${r2.duty} %`])} />
      </Section>
      <Section title="Result">
        <ResetKit onReset={() => (setRows([]), setPrinted(false))} />
      </Section>
    </PracticalSheet>
  );
}
