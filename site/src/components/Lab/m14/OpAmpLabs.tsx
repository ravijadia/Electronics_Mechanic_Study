import React, {useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import Multimeter from '../Multimeter';
import useStoredState from '../useStoredState';
import {Empty, NoteBox, ResetKit, Section, Table, useKitSeed, useRng, type Note} from '../kit';
import {useFunctionGenerator} from '../FunctionGenerator';
import {useScope} from '../Scope';
import {binaryWeightedDac, bitsToCode, differentiatorSignal, inAmpGain, instrumentationAmp, integratorSignal, invAmp, nonInvAmp, r2rDac, summingAmp, zeroCrossSignal} from './opamp';
import {C_VALUES, DC_VALUES, fmtFarad, fmtOhm, HRes, OpAmpTri, R_VALUES, ValuePicker, VCap, VRes} from './AnalogBench';
import styles from '../styles.module.css';

const VCC = 15;

// ---------------------------------------------------------------------------
// 1.14.127 Use an analog IC tester to test various analog ICs
// ---------------------------------------------------------------------------

const AN_ICS = [
  {id: '741', name: 'IC 741 (op-amp)'},
  {id: 'LM358', name: 'LM358 (dual op-amp)'},
  {id: 'CA3140', name: 'CA3140 (op-amp)'},
  {id: 'NE555', name: 'NE555 (timer)'},
  {id: 'LM324', name: 'LM324 (quad op-amp)'},
  {id: 'TL084', name: 'TL084 (quad JFET op-amp)'},
];

export function AnalogIcTesterLab(): React.JSX.Element {
  const KEY = '1.14.127';
  const [seed, newKit] = useKitSeed(KEY);
  const items = useRng(seed, (rnd) => AN_ICS.map((ic) => ({...ic, fault: rnd() < 0.35})));
  const [slot, setSlot] = useState(0);
  const [ran, setRan] = useStoredState<Record<number, boolean>>(`lab:${KEY}:ran`, {});
  const [ans, setAns] = useStoredState<Record<number, 'good' | 'bad'>>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);

  const it = items[slot];
  const runTest = () => {
    setRan((r) => ({...r, [slot]: true}));
    setNote(it.fault ? {kind: 'bad', text: `Tester: FAIL — ${it.name} does not respond correctly.`} : {kind: 'good', text: `Tester: PASS — ${it.name} responds correctly.`});
  };
  const ok = (k: number) => ans[k] === (items[k].fault ? 'bad' : 'good');

  return (
    <PracticalSheet
      number={KEY}
      title="Use an Analog IC Tester to Test Various Analog ICs"
      aim="To insert common analog ICs (op-amps and the 555 timer) into an IC tester, run its built-in test and record whether each IC is good or faulty."
      apparatus={['Analog IC tester', '741, LM358, CA3140, NE555, LM324, TL084 ICs']}
      procedure={['Place the IC in the tester socket (choose it below).', 'Press Run test.', 'Read PASS or FAIL on the tester and record it.', 'Repeat for all six ICs.']}
      precautions={['Insert the IC the right way round, pin 1 to the notch.', 'Do not force a bent pin — straighten it first.', 'Discharge static before handling an IC.']}
      viva={[
        {q: 'What does an IC tester actually do?', a: 'It applies a small standard test signal to the IC and compares the response against a known-good one.'},
        {q: 'Name two op-amp ICs and one timer IC.', a: '741 / LM358 (op-amps), NE555 (timer).'},
        {q: 'What should you do with a FAIL result?', a: 'Replace the IC — do not fit it back in a circuit.'},
      ]}
      tasks={[
        {label: 'Run the test on all six ICs.', done: items.every((_, k) => ran[k])},
        {label: 'Record good / faulty for all six.', done: items.every((_, k) => ok(k))},
        {label: 'Print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={clsx(styles.seg, styles.noPrint)} role="group" aria-label="IC in socket" style={{marginBottom: '0.6rem'}}>
          {items.map((ic, k) => (
            <button key={ic.id} type="button" aria-pressed={slot === k} onClick={() => (setSlot(k), setNote(null))}>
              {ic.name}
            </button>
          ))}
        </div>
        <div className={styles.kit}>
          <svg viewBox="0 0 320 140" role="img" aria-label="IC tester with the selected IC in its socket">
            <rect x={10} y={10} width={300} height={120} rx={8} fill="#1c2024" stroke="#565d63" />
            <rect x={110} y={40} width={100} height={60} rx={4} fill="#2c3a44" stroke="#9aa3a8" />
            <text x={160} y={75} textAnchor="middle" style={{fill: '#e9eef0', fontSize: 11, fontWeight: 700}}>
              {it.name.split(' ')[0]}
            </text>
            <rect x={230} y={35} width={70} height={30} rx={4} fill={ran[slot] ? (it.fault ? '#5b2b2b' : '#2f7d4a') : '#2a2f38'} />
            <text x={265} y={55} textAnchor="middle" style={{fill: '#e9eef0', fontSize: 12, fontWeight: 800}}>
              {ran[slot] ? (it.fault ? 'FAIL' : 'PASS') : '— —'}
            </text>
          </svg>
        </div>
        <div className={clsx(styles.controls, styles.noPrint)} style={{marginTop: '0.4rem'}}>
          <button type="button" className={clsx(styles.btn, styles.primary)} onClick={runTest}>
            Run test
          </button>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        <Table
          head={['IC', 'Tester result', 'Condition']}
          rows={items.map((ic, k) => [
            ic.name,
            ran[k] ? (items[k].fault ? 'FAIL' : 'PASS') : '–',
            <div className={clsx(styles.seg, styles.noPrint)} key="sel" role="group" aria-label={`${ic.name} condition`}>
              <button type="button" aria-pressed={ans[k] === 'good'} onClick={() => setAns((a) => ({...a, [k]: 'good'}))}>
                Good
              </button>
              <button type="button" aria-pressed={ans[k] === 'bad'} onClick={() => setAns((a) => ({...a, [k]: 'bad'}))}>
                Faulty
              </button>
            </div>,
          ])}
        />
        <ResetKit
          onReset={() => {
            setRan({});
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
// 1.14.128 Inverting, non-inverting and summing amplifiers
// ---------------------------------------------------------------------------

type AmpMode = 'inv' | 'noninv' | 'sum';

export function OpAmpAmplifierLab(): React.JSX.Element {
  const KEY = '1.14.128';
  const [mode, setMode] = useState<AmpMode>('inv');
  const [rin, setRin] = useState(1000);
  const [rin2, setRin2] = useState(2200);
  const [rf, setRf] = useState(10000);
  const [vin, setVin] = useState(0.5);
  const [vin2, setVin2] = useState(1);
  const [rows, setRows] = useStoredState<Record<AmpMode, {rin: number; rin2?: number; rf: number; vin: number; vin2?: number; vout: number}[]>>(`lab:${KEY}:rows`, {inv: [], noninv: [], sum: []});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);

  const vout = mode === 'inv' ? invAmp(vin, rin, rf, VCC) : mode === 'noninv' ? nonInvAmp(vin, rin, rf, VCC) : summingAmp([{v: vin, r: rin}, {v: vin2, r: rin2}], rf, VCC);

  const noteIt = () => {
    const row = {rin, rin2: mode === 'sum' ? rin2 : undefined, rf, vin, vin2: mode === 'sum' ? vin2 : undefined, vout: Number(vout.toFixed(2))};
    setRows((r) => ({...r, [mode]: [...r[mode], row].slice(-6)}));
    setNote({kind: 'good', text: `Noted: Vout = ${vout.toFixed(2)} V for ${mode === 'sum' ? 'this summing' : mode === 'inv' ? 'this inverting' : 'this non-inverting'} setup.`});
  };

  const done = (m: AmpMode) => rows[m].length >= 2;

  return (
    <PracticalSheet
      number={KEY}
      title="Construct and Test Op-Amp Circuits: Inverting, Non-Inverting, Summing Amplifiers"
      aim="To build the three basic resistive op-amp configurations with IC 741 and verify the gain formula of each by measurement."
      apparatus={['IC 741', '±15 V dual supply', 'Resistor set', 'DC voltage source', 'Digital multimeter']}
      procedure={[
        'Choose the configuration: inverting, non-inverting or summing.',
        'Pick Rin (and Rin2 for summing) and Rf.',
        'Set the DC input voltage(s).',
        'Read Vout on the multimeter and note it.',
        'Compare with the calculated gain formula.',
      ]}
      precautions={['Connect the ±15 V supply with correct polarity before power-on.', 'Do not exceed the supply rails at the input.', 'The unused input of a single op-amp must always be grounded or biased, never left floating.']}
      viva={[
        {q: 'Formula for an inverting amplifier?', a: 'Vout = −(Rf/Rin) × Vin.'},
        {q: 'Formula for a non-inverting amplifier?', a: 'Vout = (1 + Rf/Rin) × Vin.'},
        {q: 'Why is a summing amplifier always inverting?', a: 'Each input resistor feeds the inverting node, so every term in the sum is inverted.'},
        {q: 'Minimum possible gain of a non-inverting amplifier?', a: '1 (unity, when Rf = 0 — the voltage follower).'},
      ]}
      tasks={[
        {label: 'Verify the inverting amplifier (2+ readings).', done: done('inv')},
        {label: 'Verify the non-inverting amplifier (2+ readings).', done: done('noninv')},
        {label: 'Verify the summing amplifier (2+ readings).', done: done('sum')},
        {label: 'Print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={clsx(styles.seg, styles.noPrint)} role="group" aria-label="Configuration" style={{marginBottom: '0.6rem'}}>
          <button type="button" aria-pressed={mode === 'inv'} onClick={() => (setMode('inv'), setNote(null))}>
            Inverting
          </button>
          <button type="button" aria-pressed={mode === 'noninv'} onClick={() => (setMode('noninv'), setNote(null))}>
            Non-inverting
          </button>
          <button type="button" aria-pressed={mode === 'sum'} onClick={() => (setMode('sum'), setNote(null))}>
            Summing
          </button>
        </div>
        <div className={styles.kit}>
          <svg viewBox="0 0 320 180" role="img" aria-label={`${mode} amplifier circuit`}>
            <OpAmpTri x={140} y={55} />
            {mode === 'noninv' ? (
              <>
                <path d="M30 90 H140 M70 125 V150 H220 M220 90 V125 M220 20 H70 V90" fill="none" stroke="var(--lab-wire)" strokeWidth={1.5} />
                <HRes x={145} y={150} label={`Rf ${fmtOhm(rf)}`} />
                <VRes x={70} y={108} label={`Rin ${fmtOhm(rin)}`} len={36} />
              </>
            ) : (
              <>
                <path d="M30 90 H70 M70 90 H110 M110 20 H220 M220 20 V90 M110 90 H140" fill="none" stroke="var(--lab-wire)" strokeWidth={1.5} />
                <HRes x={85} y={90} label={`Rin ${fmtOhm(rin)}`} />
                <HRes x={165} y={20} label={`Rf ${fmtOhm(rf)}`} />
                <path d="M140 90 V125 H320" fill="none" stroke="var(--lab-wire)" strokeWidth={1.5} strokeDasharray="2 2" />
                <text x={170} y={120} style={{fontSize: 10, fill: 'var(--lab-kit-muted)'}}>
                  + grounded
                </text>
                {mode === 'sum' && (
                  <>
                    <path d="M30 150 H110 M110 150 V90" fill="none" stroke="var(--lab-wire)" strokeWidth={1.5} />
                    <HRes x={85} y={150} label={`Rin2 ${fmtOhm(rin2)}`} />
                  </>
                )}
              </>
            )}
            <path d={`M${mode === 'noninv' ? 220 : 220} 20 H260 V35`} fill="none" stroke="var(--lab-wire)" strokeWidth={1.5} />
            <text x={10} y={95} style={{fontSize: 10, fill: 'var(--lab-kit-muted)'}}>
              Vin
            </text>
            {mode === 'sum' && (
              <text x={10} y={155} style={{fontSize: 10, fill: 'var(--lab-kit-muted)'}}>
                Vin2
              </text>
            )}
          </svg>
        </div>
        <ValuePicker label="Rin" value={rin} options={R_VALUES} fmt={fmtOhm} onChange={setRin} />
        {mode === 'sum' && <ValuePicker label="Rin2" value={rin2} options={R_VALUES} fmt={fmtOhm} onChange={setRin2} />}
        <ValuePicker label="Rf" value={rf} options={R_VALUES} fmt={fmtOhm} onChange={setRf} />
        <ValuePicker label="Vin" value={vin} options={DC_VALUES} fmt={(v) => `${v} V`} onChange={setVin} />
        {mode === 'sum' && <ValuePicker label="Vin2" value={vin2} options={DC_VALUES} fmt={(v) => `${v} V`} onChange={setVin2} />}
        <Multimeter name="DC voltmeter (Vout)" fn="dcv" functions={[{fn: 'dcv', label: 'DC V'}]} text={vout.toFixed(2)} unit="V DC" onFunction={() => {}} />
        <div className={clsx(styles.controls, styles.noPrint)} style={{marginTop: '0.4rem'}}>
          <button type="button" className={clsx(styles.btn, styles.primary)} onClick={noteIt}>
            Note reading
          </button>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {rows[mode].length === 0 ? (
          <Empty>No readings yet.</Empty>
        ) : (
          <Table
            head={mode === 'sum' ? ['Rin', 'Rin2', 'Rf', 'Vin', 'Vin2', 'Vout (V)'] : ['Rin', 'Rf', 'Vin', 'Vout (V)']}
            rows={rows[mode].map((r) => (mode === 'sum' ? [fmtOhm(r.rin), fmtOhm(r.rin2!), fmtOhm(r.rf), `${r.vin} V`, `${r.vin2} V`, r.vout] : [fmtOhm(r.rin), fmtOhm(r.rf), `${r.vin} V`, r.vout]))}
          />
        )}
      </Section>
      <Section title="Result">
        <ResetKit onReset={() => (setRows({inv: [], noninv: [], sum: []}), setPrinted(false))} />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// 1.14.129 Differentiator and integrator
// ---------------------------------------------------------------------------

export function DifferentiatorIntegratorLab(): React.JSX.Element {
  const KEY = '1.14.129';
  const [mode, setMode] = useState<'diff' | 'int'>('diff');
  const [r, setR] = useState(10000);
  const [c, setC] = useState(0.1e-6);
  const [seen, setSeen] = useStoredState<Record<string, boolean>>(`lab:${KEY}:seen`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const fg = useFunctionGenerator({wave: 'triangle', range: 100, dial: 1, amp: 4}, true);
  const out = mode === 'diff' ? differentiatorSignal(fg.signal, r, c, VCC) : integratorSignal(fg.signal, r, c, VCC);
  const scope = useScope('dso', {ch1: fg.signal, ch2: out});

  const mark = () => setSeen((s) => ({...s, [`${mode}:${fg.state.wave}`]: true}));

  return (
    <PracticalSheet
      number={KEY}
      title="Construct and Test Differentiator and Integrator"
      aim="To build an op-amp differentiator and integrator with IC 741 and observe the output shape for different input waveforms."
      apparatus={['IC 741', '±15 V supply', 'Function generator', 'Dual-trace oscilloscope', 'Resistor and capacitor set']}
      procedure={[
        'Choose differentiator or integrator.',
        'Pick R and C.',
        'Drive the input with the function generator; try sine, square and triangular waves.',
        'Compare CH1 (input) and CH2 (output) on the scope.',
      ]}
      precautions={['Differentiators are noise-sensitive: keep leads short.', 'Do not drive the input above the supply rails.']}
      viva={[
        {q: 'Differentiator output for a square-wave input?', a: 'Sharp spikes at each transition.'},
        {q: 'Integrator output for a square-wave input?', a: 'A triangular wave.'},
        {q: 'Why does a differentiator replace Rin with a capacitor?', a: 'So the input current (and hence Vout) depends on dVin/dt, not Vin itself.'},
        {q: 'Formula for the differentiator?', a: 'Vout = −RC(dVin/dt).'},
      ]}
      tasks={[
        {label: 'Observe the differentiator with a triangular input.', done: !!seen['diff:triangle']},
        {label: 'Observe the differentiator with a square-wave input.', done: !!seen['diff:square']},
        {label: 'Observe the integrator with a square-wave input.', done: !!seen['int:square']},
        {label: 'Observe the integrator with a sine input.', done: !!seen['int:sine']},
        {label: 'Print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={clsx(styles.seg, styles.noPrint)} role="group" aria-label="Circuit" style={{marginBottom: '0.6rem'}}>
          <button type="button" aria-pressed={mode === 'diff'} onClick={() => setMode('diff')}>
            Differentiator
          </button>
          <button type="button" aria-pressed={mode === 'int'} onClick={() => setMode('int')}>
            Integrator
          </button>
        </div>
        <div className={styles.kit}>
          <svg viewBox="0 0 300 150" role="img" aria-label={`${mode === 'diff' ? 'Differentiator' : 'Integrator'} circuit`}>
            <OpAmpTri x={130} y={40} />
            <path d="M20 75 H60 M100 75 H130 M160 20 H220 M220 20 V75" fill="none" stroke="var(--lab-wire)" strokeWidth={1.5} />
            {mode === 'diff' ? <VCap x={80} y={75} label={`C ${fmtFarad(c)}`} /> : <HRes x={80} y={75} label={`Rin ${fmtOhm(r)}`} />}
            {mode === 'diff' ? <HRes x={190} y={20} label={`Rf ${fmtOhm(r)}`} /> : <VCap x={190} y={20} label={`Cf ${fmtFarad(c)}`} />}
            <path d="M60 130 H130 V75" fill="none" stroke="var(--lab-wire)" strokeWidth={1.5} strokeDasharray="2 2" />
            <text x={12} y={80} style={{fontSize: 10, fill: 'var(--lab-kit-muted)'}}>
              Vin
            </text>
          </svg>
        </div>
        <ValuePicker label="R" value={r} options={R_VALUES} fmt={fmtOhm} onChange={setR} />
        <ValuePicker label="C" value={c} options={C_VALUES} fmt={fmtFarad} onChange={setC} />
        {fg.view}
        {scope.view}
        <div className={clsx(styles.controls, styles.noPrint)} style={{marginTop: '0.4rem'}}>
          <button type="button" className={clsx(styles.btn, styles.primary)} onClick={mark}>
            Note this waveform
          </button>
        </div>
      </Section>
      <Section title="Observation table">
        <Table
          head={['Circuit', 'Input wave', 'Seen']}
          rows={[
            ['Differentiator', 'Triangular', seen['diff:triangle'] ? '✓' : '–'],
            ['Differentiator', 'Square', seen['diff:square'] ? '✓' : '–'],
            ['Integrator', 'Square', seen['int:square'] ? '✓' : '–'],
            ['Integrator', 'Sine', seen['int:sine'] ? '✓' : '–'],
          ]}
        />
      </Section>
      <Section title="Result">
        <ResetKit onReset={() => (setSeen({}), setPrinted(false))} />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// 1.14.130 Zero-crossing detector
// ---------------------------------------------------------------------------

export function ZeroCrossingLab(): React.JSX.Element {
  const KEY = '1.14.130';
  const fg = useFunctionGenerator({wave: 'sine', range: 100, dial: 1, amp: 6}, true);
  const out = zeroCrossSignal(fg.signal, VCC);
  const scope = useScope('dso', {ch1: fg.signal, ch2: out});
  const [checked, setChecked] = useStoredState(`lab:${KEY}:checked`, false);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);

  return (
    <PracticalSheet
      number={KEY}
      title="Construct and Test a Zero-Crossing Detector"
      aim="To build an op-amp comparator with the reference input grounded (0 V) and verify that the output switches exactly at every zero crossing of the input."
      apparatus={['IC 741', '±15 V supply', 'Function generator (sine)', 'Dual-trace oscilloscope']}
      procedure={[
        'Wire the 741 open-loop: input to the + terminal, − terminal grounded (Vref = 0).',
        'Drive the + input with a sine wave from the function generator.',
        'Observe CH1 (input) and CH2 (output) together on the scope.',
        'Confirm the output transition lines up with every input zero crossing.',
      ]}
      precautions={['No feedback resistor is fitted — this is an open-loop comparator.', 'The output will swing fully to ±Vsat; do not expect a linear output.']}
      viva={[
        {q: 'What is Vref in a zero-crossing detector?', a: '0 V — the inverting input is grounded.'},
        {q: 'What does the output look like for a sine-wave input?', a: 'A square wave at the same frequency, switching exactly as the sine crosses zero.'},
        {q: 'Name one application.', a: 'Converting a sine wave to a square wave / timing reference / frequency counting.'},
      ]}
      tasks={[
        {label: 'Set up the comparator and view both traces together.', done: checked},
        {label: 'Print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.kit}>
          <svg viewBox="0 0 280 120" role="img" aria-label="Zero-crossing detector circuit">
            <OpAmpTri x={130} y={20} />
            <path d="M20 55 H130 M20 90 H60 V55" fill="none" stroke="var(--lab-wire)" strokeWidth={1.5} />
            <path d="M60 90 H60" />
            <text x={65} y={94} style={{fontSize: 10, fill: 'var(--lab-kit-muted)'}}>
              − grounded (Vref = 0)
            </text>
            <path d="M210 55 H260" fill="none" stroke="var(--lab-wire)" strokeWidth={1.5} />
            <text x={10} y={40} style={{fontSize: 10, fill: 'var(--lab-kit-muted)'}}>
              Vin
            </text>
          </svg>
        </div>
        {fg.view}
        {scope.view}
        <div className={clsx(styles.controls, styles.noPrint)} style={{marginTop: '0.4rem'}}>
          <button type="button" className={clsx(styles.btn, styles.primary)} onClick={() => setChecked(true)}>
            Confirm: output switches at every zero crossing
          </button>
        </div>
      </Section>
      <Section title="Result">
        <Table head={['Check', 'Result']} rows={[['Output switches at input zero crossings', checked ? '✓' : '–']]} />
        <ResetKit onReset={() => (setChecked(false), setPrinted(false))} />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// 1.14.131 Instrumentation amplifier
// ---------------------------------------------------------------------------

export function InstrumentationAmpLab(): React.JSX.Element {
  const KEY = '1.14.131';
  const [v1, setV1] = useState(1);
  const [v2, setV2] = useState(1.02);
  const [rGain, setRGain] = useState(10000);
  const r = 10000;
  const [rows, setRows] = useStoredState<{v1: number; v2: number; rGain: number; vout: number}[]>(`lab:${KEY}:rows`, []);
  const [cmTested, setCmTested] = useStoredState(`lab:${KEY}:cm`, false);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);

  const gain = inAmpGain(rGain, r);
  const vout = instrumentationAmp(v1, v2, rGain, r, VCC);
  const isCommonMode = Math.abs(v1 - v2) < 0.01;

  const noteIt = () => {
    setRows((rr) => [...rr, {v1, v2, rGain, vout: Number(vout.toFixed(3))}].slice(-6));
    if (isCommonMode) setCmTested(true);
    setNote({kind: 'good', text: `Noted. Gain = 1 + 2R/Rgain = ${gain.toFixed(2)}, Vout = ${vout.toFixed(3)} V.`});
  };

  return (
    <PracticalSheet
      number={KEY}
      title="Construct and Test an Instrumentation Amplifier"
      aim="To build a 3-op-amp instrumentation amplifier, verify its gain formula, and show that a common-mode signal at both inputs is rejected."
      apparatus={['Three 741 op-amps (or an instrumentation-amp IC)', '±15 V supply', 'Two DC sources', 'Digital multimeter']}
      procedure={[
        'Apply V1 and V2 to the two buffer inputs.',
        'Pick Rgain and note Vout.',
        'Repeat with V1 = V2 (common-mode) and confirm Vout ≈ 0.',
      ]}
      precautions={['Match the resistor pairs carefully — mismatch spoils CMRR.', 'Keep both input leads the same length to avoid picking up noise differently.']}
      viva={[
        {q: 'What sets the gain of a 3-op-amp instrumentation amplifier?', a: 'A single resistor, Rgain, between the two buffer stages: Gain = 1 + 2R/Rgain.'},
        {q: 'Why use buffers before the differential stage?', a: 'For very high input impedance, so the weak sensor signal is not loaded.'},
        {q: 'What should Vout be when V1 = V2?', a: 'Close to 0 V — a common-mode signal is rejected.'},
      ]}
      tasks={[
        {label: 'Measure Vout for 2+ different (V1, V2) pairs.', done: rows.length >= 2},
        {label: 'Apply a common-mode signal (V1 = V2) and confirm Vout ≈ 0.', done: cmTested},
        {label: 'Print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.kit}>
          <svg viewBox="0 0 300 160" role="img" aria-label="Instrumentation amplifier block diagram">
            <rect x={10} y={10} width={80} height={50} rx={6} fill="#20262b" stroke="#9aa3a8" />
            <text x={50} y={40} textAnchor="middle" style={{fill: '#e9eef0', fontSize: 10}}>
              Buffer A1
            </text>
            <rect x={10} y={100} width={80} height={50} rx={6} fill="#20262b" stroke="#9aa3a8" />
            <text x={50} y={130} textAnchor="middle" style={{fill: '#e9eef0', fontSize: 10}}>
              Buffer A2
            </text>
            <VRes x={130} y={80} label={`Rgain ${fmtOhm(rGain)}`} len={60} />
            <rect x={190} y={45} width={90} height={70} rx={6} fill="#20262b" stroke="#9aa3a8" />
            <text x={235} y={78} textAnchor="middle" style={{fill: '#e9eef0', fontSize: 10}}>
              Diff. amp A3
            </text>
            <path d="M90 35 H130 M90 125 H130 M90 35 V20 M90 125 V140" fill="none" stroke="var(--lab-wire)" strokeWidth={1.5} />
            <path d="M130 55 H190 M130 105 H190" fill="none" stroke="var(--lab-wire)" strokeWidth={1.5} />
            <text x={2} y={38} style={{fontSize: 10, fill: 'var(--lab-kit-muted)'}}>
              V1
            </text>
            <text x={2} y={128} style={{fontSize: 10, fill: 'var(--lab-kit-muted)'}}>
              V2
            </text>
          </svg>
        </div>
        <ValuePicker label="Rgain" value={rGain} options={R_VALUES} fmt={fmtOhm} onChange={setRGain} />
        <ValuePicker label="V1" value={v1} options={DC_VALUES.map((v) => v + 1)} fmt={(v) => `${v.toFixed(1)} V`} onChange={setV1} />
        <ValuePicker label="V2" value={v2} options={[v1, v1 + 0.02, v1 + 0.05, v1 + 0.1, v1 - 0.05, v1 - 0.1]} fmt={(v) => `${v.toFixed(2)} V`} onChange={setV2} />
        <Multimeter name="DC voltmeter (Vout)" fn="dcv" functions={[{fn: 'dcv', label: 'DC V'}]} text={vout.toFixed(3)} unit="V DC" onFunction={() => {}} />
        <div className={clsx(styles.controls, styles.noPrint)} style={{marginTop: '0.4rem'}}>
          <button type="button" className={clsx(styles.btn, styles.primary)} onClick={noteIt}>
            Note reading
          </button>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {rows.length === 0 ? <Empty>No readings yet.</Empty> : <Table head={['V1', 'V2', 'Rgain', 'Vout (V)']} rows={rows.map((r2) => [`${r2.v1.toFixed(2)} V`, `${r2.v2.toFixed(2)} V`, fmtOhm(r2.rGain), r2.vout])} />}
      </Section>
      <Section title="Result">
        <Table head={['Check', 'Result']} rows={[['Gain formula verified', rows.length >= 2 ? '✓' : '–'], ['Common-mode signal rejected', cmTested ? '✓' : '–']]} />
        <ResetKit onReset={() => (setRows([]), setCmTested(false), setPrinted(false))} />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// 1.14.132 Binary-weighted and R-2R ladder DACs
// ---------------------------------------------------------------------------

const VREF = 5;

export function DacLab(): React.JSX.Element {
  const KEY = '1.14.132';
  const [kind, setKind] = useState<'bw' | 'r2r'>('r2r');
  const [bits, setBits] = useStoredState<boolean[]>(`lab:${KEY}:bits`, [false, false, false, false]);
  const [rows, setRows] = useStoredState<Record<'bw' | 'r2r', {code: number; vout: number}[]>>(`lab:${KEY}:rows`, {bw: [], r2r: []});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);

  const code = bitsToCode(bits);
  const vout = kind === 'bw' ? binaryWeightedDac(bits, VREF) : r2rDac(bits, VREF);

  const toggle = (i: number) => setBits((b) => b.map((x, k) => (k === i ? !x : x)));
  const noteIt = () => {
    setRows((r) => {
      const list = r[kind].filter((x) => x.code !== code);
      return {...r, [kind]: [...list, {code, vout: Number(vout.toFixed(2))}].sort((a, b) => a.code - b.code)};
    });
    setNote({kind: 'good', text: `Noted: digital input ${code} (binary ${bits.slice().reverse().map((b) => (b ? 1 : 0)).join('')}) → Vout = ${vout.toFixed(2)} V.`});
  };
  const codesDone = rows[kind].length;

  return (
    <PracticalSheet
      number={KEY}
      title="Construct and Test Binary-Weighted and R-2R Ladder Digital-to-Analog Converters"
      aim="To build a 4-bit binary-weighted DAC and a 4-bit R-2R ladder DAC, and verify the analog output for several digital input codes."
      apparatus={['IC 741', 'Binary-weighted resistor set (R, 2R, 4R, 8R)', 'R-2R resistor ladder', '4 logic switches', 'Digital multimeter', '+5 V reference']}
      procedure={[
        'Choose the DAC type.',
        'Set the 4 input bits (b3…b0) with the switches.',
        'Read the analog output on the multimeter.',
        'Repeat for several digital codes and tabulate.',
      ]}
      precautions={['Keep the reference voltage steady — any drift in Vref shows up directly in Vout.', 'Check resistor values before wiring: the weighting must be exact binary ratios.']}
      viva={[
        {q: 'Why does a binary-weighted DAC need very precise resistor ratios?', a: 'Because the output directly sums currents through R, 2R, 4R, 8R — any mismatch gives a non-linear output.'},
        {q: 'What is the advantage of the R-2R ladder?', a: 'It needs only two resistor values (R and 2R) repeated, which is easier to manufacture precisely, and scales to more bits.'},
        {q: 'Output step size of a 4-bit R-2R DAC with Vref = 5 V?', a: '5 V / 16 = 0.3125 V per step.'},
      ]}
      tasks={[
        {label: 'Test 4 or more codes on the binary-weighted DAC.', done: rows.bw.length >= 4},
        {label: 'Test 4 or more codes on the R-2R ladder DAC.', done: rows.r2r.length >= 4},
        {label: 'Print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={clsx(styles.seg, styles.noPrint)} role="group" aria-label="DAC type" style={{marginBottom: '0.6rem'}}>
          <button type="button" aria-pressed={kind === 'bw'} onClick={() => setKind('bw')}>
            Binary-weighted
          </button>
          <button type="button" aria-pressed={kind === 'r2r'} onClick={() => setKind('r2r')}>
            R-2R ladder
          </button>
        </div>
        <div className={clsx(styles.seg, styles.noPrint)} role="group" aria-label="Input bits, b3 to b0" style={{marginBottom: '0.6rem'}}>
          {[3, 2, 1, 0].map((i) => (
            <button key={i} type="button" aria-pressed={bits[i]} onClick={() => toggle(i)}>
              b{i} = {bits[i] ? 1 : 0}
            </button>
          ))}
        </div>
        <Multimeter name="DC voltmeter (Vout)" fn="dcv" functions={[{fn: 'dcv', label: 'DC V'}]} text={vout.toFixed(2)} unit="V DC" placement={`code ${code}`} onFunction={() => {}} />
        <div className={clsx(styles.controls, styles.noPrint)} style={{marginTop: '0.4rem'}}>
          <button type="button" className={clsx(styles.btn, styles.primary)} onClick={noteIt}>
            Note reading
          </button>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {rows[kind].length === 0 ? <Empty>No readings yet for the {kind === 'bw' ? 'binary-weighted' : 'R-2R ladder'} DAC.</Empty> : <Table head={['Code', 'Binary (b3b2b1b0)', 'Vout (V)']} rows={rows[kind].map((r) => [r.code, r.code.toString(2).padStart(4, '0'), r.vout])} />}
      </Section>
      <Section title="Result">
        <Table head={['DAC', 'Codes tested']} rows={[['Binary-weighted', rows.bw.length], ['R-2R ladder', rows.r2r.length]]} />
        <ResetKit onReset={() => (setRows({bw: [], r2r: []}), setBits([false, false, false, false]), setPrinted(false))} />
      </Section>
    </PracticalSheet>
  );
}
