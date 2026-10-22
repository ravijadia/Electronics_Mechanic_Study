import React, {useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import {GU_1_14_127, GU_1_14_128, GU_1_14_129, GU_1_14_130, GU_1_14_131, GU_1_14_132} from './gu';
import Multimeter from '../Multimeter';
import useStoredState from '../useStoredState';
import {Empty, NoteBox, ResetKit, Section, Table, useKitSeed, useRng, type Note} from '../kit';
import {useFunctionGenerator} from '../FunctionGenerator';
import {useScope} from '../Scope';
import {kitLabel} from '../m07/parts';
import {binaryWeightedDac, bitsToCode, differentiatorSignal, inAmpGain, instrumentationAmp, integratorSignal, invAmp, isSaturated, nonInvAmp, r2rDac, summingAmp, vsat, zeroCrossSignal} from './opamp';
import {C_VALUES, DC_VALUES, Dot, fmtFarad, fmtOhm, Gnd, HCap, HRes, OpAmpTri, R_VALUES, tolFactor, ValuePicker, VRes, Wires} from './AnalogBench';
import styles from '../styles.module.css';

const VCC = 15;
const VSAT = vsat(VCC);

const small = {fontSize: 10, fill: 'var(--lab-kit-muted)'} as const;

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
  const items = useRng(seed, (rnd) => AN_ICS.map((ic) => ({...ic, fault: rnd() < 0.35, flipped: rnd() < 0.3})));
  const [slot, setSlot] = useState(0);
  const [ran, setRan] = useStoredState<Record<number, boolean>>(`lab:${KEY}:ran`, {});
  const [ans, setAns] = useStoredState<Record<number, 'good' | 'bad'>>(`lab:${KEY}:ans`, {});
  const [turned, setTurned] = useStoredState<Record<number, boolean>>(`lab:${KEY}:turned`, {});
  const [dmg, setDmg] = useStoredState<Record<number, boolean>>(`lab:${KEY}:dmg`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);

  const it = items[slot];
  const isFault = (k: number) => items[k].fault || !!dmg[k];
  const reversed = it.flipped !== !!turned[slot];

  const runTest = () => {
    if (reversed) {
      setDmg((d) => ({...d, [slot]: true}));
      setNote({kind: 'bad', text: `Tester: IC is in the wrong way round. Supply cut. ${it.name} may be damaged. Turn it round and test again.`});
      return;
    }
    setRan((r) => ({...r, [slot]: true}));
    setNote(isFault(slot) ? {kind: 'bad', text: `Tester: FAIL. ${it.name} does not respond correctly.`} : {kind: 'good', text: `Tester: PASS. ${it.name} responds correctly.`});
  };
  const ok = (k: number) => !!ran[k] && ans[k] === (isFault(k) ? 'bad' : 'good');
  const notchX = reversed ? 202 : 118;
  const pin1 = reversed ? {x: 194, y: 86} : {x: 126, y: 54};

  return (
    <PracticalSheet
      number={KEY}
      title="Use an Analog IC Tester to Test Various Analog ICs"
      aim="To insert common analog ICs (op-amps and the 555 timer) into an IC tester, run its built-in test and record whether each IC is good or faulty."
      apparatus={['Analog IC tester', '741, LM358, CA3140, NE555, LM324, TL084 ICs']}
      procedure={['Place the IC in the tester socket (choose it below).', 'Check pin 1 sits at the socket notch. Turn the IC round if not.', 'Press Run test.', 'Read PASS or FAIL on the tester and record it.', 'Repeat for all six ICs.']}
      precautions={['Insert the IC the right way round, pin 1 to the notch.', 'Do not force a bent pin. Straighten it first.', 'Discharge static before handling an IC.']}
      viva={[
        {q: 'What does an IC tester actually do?', a: 'It applies a small standard test signal to the IC and compares the response against a known-good one.'},
        {q: 'Name two op-amp ICs and one timer IC.', a: '741 / LM358 (op-amps), NE555 (timer).'},
        {q: 'What should you do with a FAIL result?', a: 'Replace the IC. Do not fit it back in a circuit.'},
        {q: 'What can happen if an IC is inserted the wrong way round?', a: 'The supply is reversed across it and it can be destroyed.'},
      ]}
      steps={[
        {label: 'Check pin 1 sits at the socket notch.', hint: 'Use Turn IC round if it does not. A reversed IC is damaged.', done: items.some((_, k) => ran[k]) || !reversed},
        {label: `Select each IC and press Run test. Tested: ${items.filter((_, k) => ran[k]).length}/${items.length}`, hint: 'The ICs are in the row above the tester.', done: items.every((_, k) => ran[k])},
        {label: `Mark each IC Good or Faulty in the table. Right: ${items.filter((_, k) => ok(k)).length}/${items.length}`, hint: 'PASS = Good, FAIL = Faulty.', done: items.every((_, k) => ok(k))},
        {label: 'Enter your details and press Print / Save as PDF.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_14_127}
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
          <svg viewBox="0 0 320 140" role="img" aria-label={`IC tester with ${it.name} in its socket${reversed ? ', fitted the wrong way round' : ''}`}>
            <rect x={10} y={10} width={300} height={120} rx={8} fill="#1c2024" stroke="#565d63" />
            <rect x={110} y={40} width={100} height={60} rx={4} fill="#2c3a44" stroke="#9aa3a8" />
            <path d="M110 62 A8 8 0 0 1 110 78" fill="#1c2024" stroke="#9aa3a8" />
            <text x={104} y={36} textAnchor="end" style={{...kitLabel, fontSize: 9}}>
              notch / pin 1
            </text>
            <rect x={118} y={46} width={84} height={48} rx={3} fill="#15191c" stroke="#6b7a84" />
            <circle cx={notchX} cy={70} r={6} fill="#2c3a44" stroke="#6b7a84" />
            <circle cx={pin1.x} cy={pin1.y} r={2.5} fill="#e9eef0" />
            <text x={160} y={74} textAnchor="middle" style={{fill: '#e9eef0', fontSize: 11, fontWeight: 700}}>
              {it.id}
            </text>
            <rect x={230} y={35} width={70} height={30} rx={4} fill={ran[slot] ? (isFault(slot) ? '#5b2b2b' : '#2f7d4a') : '#2a2f38'} />
            <text x={265} y={55} textAnchor="middle" style={{fill: '#e9eef0', fontSize: 12, fontWeight: 800}}>
              {ran[slot] ? (isFault(slot) ? 'FAIL' : 'PASS') : '— —'}
            </text>
          </svg>
        </div>
        <div className={clsx(styles.controls, styles.noPrint)} style={{marginTop: '0.4rem'}}>
          <button type="button" className={styles.btn} onClick={() => (setTurned((t) => ({...t, [slot]: !t[slot]})), setNote(null))}>
            Turn IC round
          </button>
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
            ran[k] ? (isFault(k) ? 'FAIL' : 'PASS') : '–',
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
            setTurned({});
            setDmg({});
            setPrinted(false);
            setNote(null);
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
type AmpRow = {rin: number; rin2?: number; rf: number; vin: number; vin2?: number; vout: number; calc: number; scale: number};

function AmpSchematic({mode, rin, rin2, rf}: {mode: AmpMode; rin: number; rin2: number; rf: number}): React.JSX.Element {
  return (
    <svg viewBox="0 0 340 175" role="img" aria-label={`${mode === 'inv' ? 'Inverting' : mode === 'noninv' ? 'Non-inverting' : 'Summing'} amplifier circuit`}>
      <Wires d="M255 95 V25 H203 M157 25 H118 V76 M230 95 H305" />
      <HRes x={180} y={25} label={`Rf ${fmtOhm(rf)}`} />
      <OpAmpTri x={150} y={60} />
      <Dot x={255} y={95} />
      <Dot x={118} y={76} />
      <text x={308} y={99} style={small}>
        Vout
      </text>
      {mode === 'noninv' ? (
        <>
          <Wires d="M22 114 H150 M118 76 H150 M118 76 H103 M57 76 H30 V92" />
          <HRes x={80} y={76} label={`Rin ${fmtOhm(rin)}`} />
          <Gnd x={30} y={92} />
          <text x={4} y={118} style={small}>
            Vin
          </text>
        </>
      ) : (
        <>
          <Wires d="M22 76 H57 M103 76 H150 M150 114 H138 V128" />
          <HRes x={80} y={76} label={`Rin ${fmtOhm(rin)}`} />
          <Gnd x={138} y={128} />
          <text x={4} y={80} style={small}>
            {mode === 'sum' ? 'Vin1' : 'Vin'}
          </text>
          {mode === 'sum' && (
            <>
              <Wires d="M22 150 H57 M103 150 H118 V76" />
              <HRes x={80} y={150} label={`Rin2 ${fmtOhm(rin2)}`} />
              <text x={4} y={154} style={small}>
                Vin2
              </text>
            </>
          )}
        </>
      )}
    </svg>
  );
}

export function OpAmpAmplifierLab(): React.JSX.Element {
  const KEY = '1.14.128';
  const [seed, newKit] = useKitSeed(KEY);
  const tol = useRng(seed, (rnd) => ({rin: tolFactor(rnd, 0.05), rin2: tolFactor(rnd, 0.05), rf: tolFactor(rnd, 0.05)}));
  const [mode, setMode] = useState<AmpMode>('inv');
  const [rin, setRin] = useState(1000);
  const [rin2, setRin2] = useState(2200);
  const [rf, setRf] = useState(10000);
  const [vin, setVin] = useState(0.5);
  const [vin2, setVin2] = useState(1);
  const [rows, setRows] = useStoredState<Record<AmpMode, AmpRow[]>>(`lab:${KEY}:rows2`, {inv: [], noninv: [], sum: []});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);

  const calcOf = (rinV: number, rin2V: number, rfV: number) =>
    mode === 'inv' ? invAmp(vin, rinV, rfV, VCC) : mode === 'noninv' ? nonInvAmp(vin, rinV, rfV, VCC) : summingAmp([{v: vin, r: rinV}, {v: vin2, r: rin2V}], rfV, VCC);
  const vout = calcOf(rin * tol.rin, rin2 * tol.rin2, rf * tol.rf);
  const calc = calcOf(rin, rin2, rf);
  const scale = mode === 'sum' ? rf * (Math.abs(vin / rin) + Math.abs(vin2 / rin2)) : Math.abs(calc);
  const saturated = isSaturated(vout, VCC);

  const noteIt = () => {
    if (saturated) {
      setNote({kind: 'warn', text: `Output stuck at ${vout < 0 ? '−' : '+'}${VSAT} V (supply limit). Lower the gain or the input and read again.`});
      return;
    }
    if (rows[mode].some((x) => x.rin === rin && x.rf === rf && x.vin === vin && (mode !== 'sum' || (x.rin2 === rin2 && x.vin2 === vin2)))) {
      setNote({kind: 'warn', text: 'Already noted. Change Rin, Rf or Vin and read again.'});
      return;
    }
    const row: AmpRow = {rin, rin2: mode === 'sum' ? rin2 : undefined, rf, vin, vin2: mode === 'sum' ? vin2 : undefined, vout: Number(vout.toFixed(2)), calc: Number(calc.toFixed(2)), scale};
    setRows((r) => ({...r, [mode]: [...r[mode], row].slice(-6)}));
    setNote({kind: 'good', text: `Noted: Vout = ${vout.toFixed(2)} V (calculated ${calc.toFixed(2)} V).`});
  };

  const useful = (m: AmpMode) => rows[m].filter((r) => Math.abs(r.calc) > 0.05);
  const done = (m: AmpMode) => useful(m).length >= 2;
  const agrees = (m: AmpMode) => useful(m).every((r) => Math.abs(r.vout - r.calc) <= 0.11 * r.scale + 0.011);

  return (
    <PracticalSheet
      number={KEY}
      title="Construct and Test Op-Amp Circuits: Inverting, Non-Inverting, Summing Amplifiers"
      aim="To build the three basic resistive op-amp configurations with IC 741 and verify the gain formula of each by measurement."
      apparatus={['IC 741', '±15 V dual supply', 'Resistor set (±5 %)', 'DC voltage source', 'Digital multimeter']}
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
        {q: 'Minimum possible gain of a non-inverting amplifier?', a: '1 (unity, when Rf = 0, the voltage follower).'},
        {q: 'Why does the measured Vout differ a little from the calculated value?', a: 'Resistors have a tolerance (±5 %), so the real ratio Rf/Rin is not exactly the marked one.'},
      ]}
      steps={[
        {label: `Inverting: pick Rin, Rf and Vin, then press Note reading. Readings: ${Math.min(useful('inv').length, 2)}/2`, hint: 'Change Vin or Rf between readings. Gain = −Rf/Rin.', done: done('inv')},
        {label: `Non-inverting: select it and note 2 readings. Readings: ${Math.min(useful('noninv').length, 2)}/2`, hint: 'Gain = 1 + Rf/Rin. Output is in phase.', done: done('noninv')},
        {label: `Summing: select it and note 2 readings. Readings: ${Math.min(useful('sum').length, 2)}/2`, hint: 'Set Vin1 and Vin2. Vout = −Rf(Vin1/Rin + Vin2/Rin2).', done: done('sum')},
        {label: 'Enter your details and press Print / Save as PDF.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_14_128}
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
          <AmpSchematic mode={mode} rin={rin} rin2={rin2} rf={rf} />
        </div>
        <ValuePicker label="Rin" value={rin} options={R_VALUES} fmt={fmtOhm} onChange={setRin} />
        {mode === 'sum' && <ValuePicker label="Rin2" value={rin2} options={R_VALUES} fmt={fmtOhm} onChange={setRin2} />}
        <ValuePicker label="Rf" value={rf} options={R_VALUES} fmt={fmtOhm} onChange={setRf} />
        <ValuePicker label={mode === 'sum' ? 'Vin1' : 'Vin'} value={vin} options={DC_VALUES} fmt={(v) => `${v} V`} onChange={setVin} />
        {mode === 'sum' && <ValuePicker label="Vin2" value={vin2} options={DC_VALUES} fmt={(v) => `${v} V`} onChange={setVin2} />}
        <Multimeter name="DC voltmeter (Vout)" fn="dcv" functions={[{fn: 'dcv', label: 'DC V'}]} text={vout.toFixed(2)} unit="V DC" indicator={saturated ? 'SAT' : undefined} onFunction={() => {}} />
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
            head={mode === 'sum' ? ['Rin1', 'Rin2', 'Rf', 'Vin1', 'Vin2', 'Vout meas. (V)', 'Vout calc. (V)'] : ['Rin', 'Rf', 'Vin', 'Vout meas. (V)', 'Vout calc. (V)']}
            rows={rows[mode].map((r) => (mode === 'sum' ? [fmtOhm(r.rin), fmtOhm(r.rin2!), fmtOhm(r.rf), `${r.vin} V`, `${r.vin2} V`, r.vout, r.calc] : [fmtOhm(r.rin), fmtOhm(r.rf), `${r.vin} V`, r.vout, r.calc]))}
          />
        )}
      </Section>
      <Section title="Result">
        <Table
          head={['Circuit', 'Readings', 'Measured agrees with formula']}
          rows={[
            ['Inverting', useful('inv').length, done('inv') ? (agrees('inv') ? '✓' : '✗') : '–'],
            ['Non-inverting', useful('noninv').length, done('noninv') ? (agrees('noninv') ? '✓' : '✗') : '–'],
            ['Summing', useful('sum').length, done('sum') ? (agrees('sum') ? '✓' : '✗') : '–'],
          ]}
        />
        <ResetKit onReset={() => (setRows({inv: [], noninv: [], sum: []}), setPrinted(false), setNote(null), newKit())} />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// 1.14.129 Differentiator and integrator
// ---------------------------------------------------------------------------

const DUAL_CH2 = {vdiv: 1, pos: 0, coupling: 'DC' as const, on: true};

export function DifferentiatorIntegratorLab(): React.JSX.Element {
  const KEY = '1.14.129';
  const [seed, newKit] = useKitSeed(KEY);
  const tol = useRng(seed, (rnd) => ({r: tolFactor(rnd, 0.05), c: tolFactor(rnd, 0.1)}));
  const [mode, setMode] = useState<'diff' | 'int'>('diff');
  const [r, setR] = useState(10000);
  const [c, setC] = useState(0.1e-6);
  const [seen, setSeen] = useStoredState<Record<string, boolean>>(`lab:${KEY}:seen`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);
  const fg = useFunctionGenerator({wave: 'triangle', range: 100, dial: 1, amp: 4}, true);
  const out = mode === 'diff' ? differentiatorSignal(fg.signal, r * tol.r, c * tol.c, VCC) : integratorSignal(fg.signal, r * tol.r, c * tol.c, VCC);
  const scope = useScope('dso', {ch1: fg.signal, ch2: out}, {ch2: DUAL_CH2, display: 'DUAL'});

  const mark = () => {
    if (!fg.state.on) {
      setNote({kind: 'warn', text: 'The generator output is off. Switch it on first.'});
      return;
    }
    if (!(scope.state.ch1.on && scope.state.ch2.on && scope.state.display === 'DUAL')) {
      setNote({kind: 'warn', text: 'Switch CH1 and CH2 on and set the display to DUAL to compare input and output.'});
      return;
    }
    setNote(null);
    setSeen((s) => ({...s, [`${mode}:${fg.state.wave}`]: true}));
  };

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
      precautions={['Differentiators are noise-sensitive: keep leads short.', 'Do not drive the input above the supply rails.', 'Keep the generator DC offset at 0 V for the integrator, or its output ramps into the rail.']}
      viva={[
        {q: 'Differentiator output for a square-wave input?', a: 'Sharp spikes at each transition.'},
        {q: 'Integrator output for a square-wave input?', a: 'A triangular wave.'},
        {q: 'Differentiator output for a triangular input?', a: 'A square wave.'},
        {q: 'Why does a differentiator replace Rin with a capacitor?', a: 'So the input current (and hence Vout) depends on dVin/dt, not Vin itself.'},
        {q: 'Formula for the differentiator?', a: 'Vout = −RC(dVin/dt).'},
      ]}
      steps={[
        {label: 'Differentiator, triangular input: press Note this waveform.', hint: 'Generator ON, scope in DUAL. Compare CH1 (input) with CH2 (output). Expect a square wave.', done: !!seen['diff:triangle']},
        {label: 'Differentiator, square-wave input: set the generator and note it.', hint: 'Expect sharp spikes at each edge.', done: !!seen['diff:square']},
        {label: 'Select Integrator, square-wave input: note it.', hint: 'Expect a triangular wave.', done: !!seen['int:square']},
        {label: 'Integrator, sine input: note it.', hint: 'Expect a cosine, shifted 90°.', done: !!seen['int:sine']},
        {label: 'Enter your details and press Print / Save as PDF.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_14_129}
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
          <svg viewBox="0 0 320 130" role="img" aria-label={`${mode === 'diff' ? 'Differentiator' : 'Integrator'} circuit`}>
            <Wires d={`M22 56 H${mode === 'diff' ? 71 : 52} M${mode === 'diff' ? 79 : 98} 56 H140 M120 56 V15 H${mode === 'diff' ? 147 : 166} M${mode === 'diff' ? 193 : 174} 15 H240 V75 M220 75 H290 M140 94 H128 V108`} />
            {mode === 'diff' ? <HCap x={75} y={56} label={`C ${fmtFarad(c)}`} /> : <HRes x={75} y={56} label={`Rin ${fmtOhm(r)}`} />}
            {mode === 'diff' ? <HRes x={170} y={15} label={`Rf ${fmtOhm(r)}`} /> : <HCap x={170} y={15} label={`Cf ${fmtFarad(c)}`} />}
            <OpAmpTri x={140} y={40} />
            <Dot x={120} y={56} />
            <Dot x={240} y={75} />
            <Gnd x={128} y={108} />
            <text x={4} y={60} style={small}>
              Vin
            </text>
            <text x={293} y={79} style={small}>
              Vout
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
        <NoteBox note={note} />
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
        <ResetKit onReset={() => (setSeen({}), setPrinted(false), setNote(null), newKit())} />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// 1.14.130 Zero-crossing detector
// ---------------------------------------------------------------------------

export function ZeroCrossingLab(): React.JSX.Element {
  const KEY = '1.14.130';
  const fg = useFunctionGenerator({wave: 'sine', range: 100, dial: 1, amp: 6, on: false}, true);
  const out = zeroCrossSignal(fg.signal, VCC);
  const scope = useScope('dso', {ch1: fg.signal, ch2: out}, {ch1: {vdiv: 2, pos: 0, coupling: 'DC', on: true}, ch2: {...DUAL_CH2, vdiv: 5}, display: 'DUAL'});
  const [checked, setChecked] = useStoredState(`lab:${KEY}:checked`, false);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);

  const bothShown = scope.state.ch1.on && scope.state.ch2.on && (scope.state.display === 'DUAL');
  const confirmIt = () => {
    if (!bothShown) {
      setNote({kind: 'warn', text: 'Switch CH1 and CH2 on and set the display to DUAL to compare input and output.'});
      return;
    }
    if (!fg.state.on) {
      setNote({kind: 'warn', text: 'The generator output is off. Switch it on first.'});
      return;
    }
    setNote(null);
    setChecked(true);
  };

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
      precautions={['No feedback resistor is fitted. This is an open-loop comparator.', 'The output will swing fully to ±Vsat; do not expect a linear output.']}
      viva={[
        {q: 'What is Vref in a zero-crossing detector?', a: '0 V. The inverting input is grounded.'},
        {q: 'What does the output look like for a sine-wave input?', a: 'A square wave at the same frequency, switching exactly as the sine crosses zero.'},
        {q: 'Why is the output not exactly ±15 V?', a: 'A 741 output cannot reach the supply rails; it saturates about 1.5 V short of each.'},
        {q: 'Name one application.', a: 'Converting a sine wave to a square wave / timing reference / frequency counting.'},
      ]}
      steps={[
        {label: 'Switch the function generator output on (sine).', hint: 'The sine is set to 6 Vpp. Press the ON button.', done: fg.state.on},
        {label: 'Show CH1 and CH2 together on the scope.', hint: 'Turn both channels on and set the display to DUAL.', done: bothShown},
        {label: 'Check the output flips at every input zero crossing, then press Confirm.', hint: 'CH1 is the input sine, CH2 the square output.', done: checked},
        {label: 'Enter your details and press Print / Save as PDF.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_14_130}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.kit}>
          <svg viewBox="0 0 300 110" role="img" aria-label="Zero-crossing detector circuit">
            <Wires d="M22 74 H130 M130 36 H112 V50 M210 55 H262" />
            <OpAmpTri x={130} y={20} />
            <Gnd x={112} y={50} />
            <text x={98} y={58} textAnchor="end" style={small}>
              Vref = 0 V
            </text>
            <text x={4} y={78} style={small}>
              Vin
            </text>
            <text x={266} y={59} style={small}>
              Vout
            </text>
          </svg>
        </div>
        {fg.view}
        {scope.view}
        <div className={clsx(styles.controls, styles.noPrint)} style={{marginTop: '0.4rem'}}>
          <button type="button" className={clsx(styles.btn, styles.primary)} onClick={confirmIt}>
            Confirm: output switches at every zero crossing
          </button>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Result">
        <Table head={['Check', 'Result']} rows={[['Output switches at input zero crossings', checked ? '✓' : '–']]} />
        <ResetKit onReset={() => (setChecked(false), setPrinted(false), setNote(null))} />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// 1.14.131 Instrumentation amplifier
// ---------------------------------------------------------------------------

const IA_R = 10000;
const DV_VALUES = [0, 0.02, 0.05, 0.1, -0.05, -0.1];
type IaRow = {v1: number; v2: number; rGain: number; vout: number; calc: number};

function IaSchematic({rGain}: {rGain: number}): React.JSX.Element {
  return (
    <svg viewBox="0 0 380 215" role="img" aria-label="Three op-amp instrumentation amplifier circuit">
      <Wires d="M24 36 H70 M24 204 H70 M70 74 H50 V100 M50 140 V166 H70 M50 96 H97 M143 96 H170 V55 H150 M50 144 H97 M143 144 H170 V185 H150 M170 55 H205 V96 H212 M242 96 H250 M246 96 V68 H273 M319 68 H345 V115 H330 M345 115 H365 M170 185 H205 V134 H212 M242 134 H250 M246 134 V150 M246 180 V190" />
      <OpAmpTri x={70} y={20} name="A1" flip />
      <OpAmpTri x={70} y={150} name="A2" />
      <OpAmpTri x={250} y={80} name="A3" />
      <VRes x={50} y={120} label="" len={40} />
      <text x={44} y={112} textAnchor="end" style={small}>
        Rgain
      </text>
      <text x={44} y={126} textAnchor="end" style={small}>
        {fmtOhm(rGain)}
      </text>
      <HRes x={120} y={96} label="R" />
      <HRes x={120} y={144} label="R" />
      <HRes x={227} y={96} label="R" len={30} />
      <HRes x={227} y={134} label="R" len={30} />
      <HRes x={296} y={68} label="R" />
      <VRes x={246} y={165} label="R" len={30} />
      <Gnd x={246} y={190} />
      <Dot x={50} y={96} />
      <Dot x={50} y={144} />
      <Dot x={170} y={55} />
      <Dot x={170} y={185} />
      <Dot x={246} y={96} />
      <Dot x={246} y={134} />
      <Dot x={345} y={115} />
      <text x={4} y={40} style={small}>
        V1
      </text>
      <text x={4} y={208} style={small}>
        V2
      </text>
      <text x={350} y={108} style={small}>
        Vout
      </text>
    </svg>
  );
}

export function InstrumentationAmpLab(): React.JSX.Element {
  const KEY = '1.14.131';
  const [seed, newKit] = useKitSeed(KEY);
  const tol = useRng(seed, (rnd) => ({rg: tolFactor(rnd, 0.01), r: tolFactor(rnd, 0.01), leak: (rnd() * 2 - 1) * 0.004}));
  const [v1, setV1] = useState(1);
  const [dv, setDv] = useState(0.02);
  const [rGain, setRGain] = useState(10000);
  const [rows, setRows] = useStoredState<IaRow[]>(`lab:${KEY}:rows2`, []);
  const [cmTested, setCmTested] = useStoredState(`lab:${KEY}:cm`, false);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);

  const v2 = v1 + dv;
  const gain = inAmpGain(rGain, IA_R);
  const vout = instrumentationAmp(v1, v2, rGain * tol.rg, IA_R * tol.r, VCC, tol.leak);
  const calc = instrumentationAmp(v1, v2, rGain, IA_R, VCC);
  const saturated = isSaturated(vout, VCC);
  const diffRows = rows.filter((x) => x.v1 !== x.v2);

  const noteIt = () => {
    if (saturated) {
      setNote({kind: 'warn', text: `Output stuck at ${vout < 0 ? '−' : '+'}${VSAT} V (supply limit). Use a larger Rgain or a smaller V1 − V2.`});
      return;
    }
    if (rows.some((x) => x.v1 === v1 && x.v2 === v2 && x.rGain === rGain)) {
      setNote({kind: 'warn', text: 'Already noted. Change V1, V2 − V1 or Rgain and read again.'});
      return;
    }
    setRows((rr) => [...rr.filter((x) => dv !== 0 || x.v1 !== x.v2), {v1, v2, rGain, vout: Number(vout.toFixed(3)), calc: Number(calc.toFixed(3))}].slice(-6));
    if (dv === 0) {
      if (Math.abs(vout) < 0.05) setCmTested(true);
      setNote({kind: 'good', text: `Common-mode input ${v1.toFixed(1)} V on both leads: Vout = ${vout.toFixed(3)} V.`});
    } else {
      setNote({kind: 'good', text: `Noted. Gain = 1 + 2R/Rgain = ${gain.toFixed(2)}, Vout = ${vout.toFixed(3)} V.`});
    }
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
      precautions={['Match the resistor pairs carefully. Mismatch spoils CMRR.', 'Keep both input leads the same length to avoid picking up noise differently.']}
      viva={[
        {q: 'What sets the gain of a 3-op-amp instrumentation amplifier?', a: 'A single resistor, Rgain, between the two buffer stages: Gain = 1 + 2R/Rgain.'},
        {q: 'Why use buffers before the differential stage?', a: 'For very high input impedance, so the weak sensor signal is not loaded.'},
        {q: 'What should Vout be when V1 = V2?', a: 'Close to 0 V. A common-mode signal is rejected.'},
        {q: 'Why is Vout not exactly 0 V for a common-mode input?', a: 'The output-stage resistors are not perfectly matched, so a little common-mode signal leaks through (finite CMRR).'},
      ]}
      steps={[
        {label: `Pick Rgain and V2 − V1, then press Note reading. Readings: ${Math.min(diffRows.length, 2)}/2`, hint: 'Gain = 1 + 2R/Rgain. Keep the output off the rails.', done: diffRows.length >= 2},
        {label: 'Change Rgain and note a reading again.', hint: 'A smaller Rgain gives a larger gain.', done: new Set(diffRows.map((x) => x.rGain)).size >= 2},
        {label: 'Set V2 − V1 to 0 (V2 = V1) and note Vout.', hint: 'Common-mode input: Vout should be close to 0 V.', done: cmTested},
        {label: 'Enter your details and press Print / Save as PDF.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_14_131}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.kit}>
          <IaSchematic rGain={rGain} />
        </div>
        <ValuePicker label="Rgain" value={rGain} options={R_VALUES} fmt={fmtOhm} onChange={setRGain} />
        <ValuePicker label="V1" value={v1} options={DC_VALUES.map((v) => v + 1)} fmt={(v) => `${v.toFixed(1)} V`} onChange={setV1} />
        <ValuePicker label="V2 − V1" value={dv} options={DV_VALUES} fmt={(v) => `${v > 0 ? '+' : ''}${v === 0 ? '0 (V2 = V1)' : v.toFixed(2)}`} onChange={setDv} />
        <Multimeter name="DC voltmeter (Vout)" fn="dcv" functions={[{fn: 'dcv', label: 'DC V'}]} text={vout.toFixed(3)} unit="V DC" placement={`V1 ${v1.toFixed(2)} V · V2 ${v2.toFixed(2)} V`} indicator={saturated ? 'SAT' : undefined} onFunction={() => {}} />
        <div className={clsx(styles.controls, styles.noPrint)} style={{marginTop: '0.4rem'}}>
          <button type="button" className={clsx(styles.btn, styles.primary)} onClick={noteIt}>
            Note reading
          </button>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {rows.length === 0 ? <Empty>No readings yet.</Empty> : <Table head={['V1', 'V2', 'Rgain', 'Vout meas. (V)', 'Vout calc. (V)']} rows={rows.map((r2) => [`${r2.v1.toFixed(2)} V`, `${r2.v2.toFixed(2)} V`, fmtOhm(r2.rGain), r2.vout, r2.calc])} />}
      </Section>
      <Section title="Result">
        <Table head={['Check', 'Result']} rows={[['Gain formula verified', rows.some((r2) => Math.abs(r2.calc) > 0.05) && rows.filter((r2) => Math.abs(r2.calc) > 0.05).every((r2) => Math.abs(r2.vout - r2.calc) <= 0.05 * Math.abs(r2.calc) + 0.025) ? '✓' : '–'], ['Common-mode signal rejected', cmTested ? '✓' : '–']]} />
        <ResetKit onReset={() => (setRows([]), setCmTested(false), setPrinted(false), setNote(null), newKit())} />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// 1.14.132 Binary-weighted and R-2R ladder DACs
// ---------------------------------------------------------------------------

const VREF = 5;
type DacKind = 'bw' | 'r2r';

function BitBox({x, y, i, on}: {x: number; y: number; i: number; on: boolean}): React.JSX.Element {
  return (
    <g>
      <rect x={x} y={y - 10} width={40} height={20} rx={4} fill={on ? '#2f7d4a' : '#3a3f45'} />
      <text x={x + 20} y={y + 4} textAnchor="middle" style={{...kitLabel, fontSize: 10, fill: '#e9eef0'}}>
        b{i} = {on ? 1 : 0}
      </text>
    </g>
  );
}

function DacDiagram({kind, bits}: {kind: DacKind; bits: boolean[]}): React.JSX.Element {
  if (kind === 'bw') {
    const rows = [3, 2, 1, 0];
    const ys = [45, 78, 111, 144];
    const labels = ['R', '2R', '4R', '8R'];
    return (
      <svg viewBox="0 0 340 200" role="img" aria-label="Binary-weighted resistor DAC with summing amplifier">
        <Wires d={`M150 45 V144 M150 96 H190 M170 96 V16 H207 M253 16 H300 V115 M270 115 H325 M190 134 H178 V150 ${ys.map((y) => `M48 ${y} H72 M118 ${y} H150`).join(' ')}`} />
        {rows.map((b, k) => (
          <g key={b}>
            <BitBox x={8} y={ys[k]} i={b} on={bits[b]} />
            <HRes x={95} y={ys[k]} label={labels[k]} />
          </g>
        ))}
        <OpAmpTri x={190} y={80} />
        <HRes x={230} y={16} label="Rf = R/2" />
        <Gnd x={178} y={150} />
        <Dot x={150} y={96} />
        <Dot x={170} y={96} />
        <Dot x={300} y={115} />
        <text x={305} y={109} style={small}>
          Vout
        </text>
      </svg>
    );
  }
  const xs = [80, 140, 200, 260];
  return (
    <svg viewBox="0 0 430 175" role="img" aria-label="R-2R ladder DAC with output buffer">
      <Wires d={`M80 74 H260 M260 74 H285 M40 74 H80 M40 74 V90 M40 122 V132 M365 55 H382 V10 H272 V36 H285 M365 55 H415 ${xs.map((x) => `M${x} 74 V90 M${x} 122 V144`).join(' ')}`} />
      {[110, 170, 230].map((x) => (
        <HRes key={x} x={x} y={74} label="R" len={30} />
      ))}
      <VRes x={40} y={106} label="2R" len={32} />
      <Gnd x={40} y={132} />
      {xs.map((x, i) => (
        <g key={x}>
          <VRes x={x} y={106} label="2R" len={32} />
          <BitBox x={x - 20} y={154} i={i} on={bits[i]} />
          <Dot x={x} y={74} />
        </g>
      ))}
      <OpAmpTri x={285} y={20} />
      <text x={385} y={72} style={small}>
        Vout
      </text>
    </svg>
  );
}

export function DacLab(): React.JSX.Element {
  const KEY = '1.14.132';
  const [seed, newKit] = useKitSeed(KEY);
  const errs = useRng(seed, (rnd) => ({
    bw: Array.from({length: 4}, () => tolFactor(rnd, 0.01) - 1),
    r2r: Array.from({length: 4}, () => tolFactor(rnd, 0.01) - 1),
  }));
  const [kind, setKind] = useState<DacKind>('r2r');
  const [bits, setBits] = useStoredState<boolean[]>(`lab:${KEY}:bits`, [false, false, false, false]);
  const [rows, setRows] = useStoredState<Record<DacKind, {code: number; vout: number}[]>>(`lab:${KEY}:rows`, {bw: [], r2r: []});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);

  const code = bitsToCode(bits);
  const vout = kind === 'bw' ? binaryWeightedDac(bits, VREF, errs.bw) : r2rDac(bits, VREF, errs.r2r);

  const toggle = (i: number) => setBits((b) => b.map((x, k) => (k === i ? !x : x)));
  const noteIt = () => {
    setRows((r) => {
      const list = r[kind].filter((x) => x.code !== code);
      return {...r, [kind]: [...list, {code, vout: Number(vout.toFixed(2))}].sort((a, b) => a.code - b.code)};
    });
    setNote({kind: 'good', text: `Noted: digital input ${code} (binary ${bits.slice().reverse().map((b) => (b ? 1 : 0)).join('')}) gives Vout = ${vout.toFixed(2)} V.`});
  };

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
      precautions={['Keep the reference voltage steady. Any drift in Vref shows up directly in Vout.', 'Check resistor values before wiring: the weighting must be exact binary ratios.']}
      viva={[
        {q: 'Why does a binary-weighted DAC need very precise resistor ratios?', a: 'Because the output directly sums currents through R, 2R, 4R, 8R. Any mismatch gives a non-linear output.'},
        {q: 'What is the advantage of the R-2R ladder?', a: 'It needs only two resistor values (R and 2R) repeated, which is easier to manufacture precisely, and scales to more bits.'},
        {q: 'Output step size of a 4-bit DAC with Vref = 5 V?', a: '5 V / 16 = 0.3125 V per step.'},
        {q: 'Why is the binary-weighted DAC output negative?', a: 'It is an inverting summing amplifier. The R-2R ladder here feeds a non-inverting buffer.'},
      ]}
      steps={[
        {label: `Select Binary-weighted and note 4 codes. Codes: ${Math.min(rows.bw.length, 4)}/4`, hint: 'Tap b3…b0 to set a code, then Note reading. Output is negative.', done: rows.bw.length >= 4},
        {label: `Select R-2R ladder and note 4 codes. Codes: ${Math.min(rows.r2r.length, 4)}/4`, hint: 'Step size is Vref/16 for both DACs.', done: rows.r2r.length >= 4},
        {label: 'Enter your details and press Print / Save as PDF.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_14_132}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={clsx(styles.seg, styles.noPrint)} role="group" aria-label="DAC type" style={{marginBottom: '0.6rem'}}>
          <button type="button" aria-pressed={kind === 'bw'} onClick={() => (setKind('bw'), setNote(null))}>
            Binary-weighted
          </button>
          <button type="button" aria-pressed={kind === 'r2r'} onClick={() => (setKind('r2r'), setNote(null))}>
            R-2R ladder
          </button>
        </div>
        <div className={styles.kit}>
          <DacDiagram kind={kind} bits={bits} />
        </div>
        <div className={clsx(styles.seg, styles.noPrint)} role="group" aria-label="Input bits, b3 to b0" style={{margin: '0.6rem 0'}}>
          {[3, 2, 1, 0].map((i) => (
            <button key={i} type="button" aria-pressed={bits[i]} onClick={() => toggle(i)}>
              b{i} = {bits[i] ? 1 : 0}
            </button>
          ))}
        </div>
        <Multimeter name="DC voltmeter (Vout)" fn="dcv" functions={[{fn: 'dcv', label: 'DC V'}]} text={vout.toFixed(3)} unit="V DC" placement={`code ${code}`} onFunction={() => {}} />
        <div className={clsx(styles.controls, styles.noPrint)} style={{marginTop: '0.4rem'}}>
          <button type="button" className={clsx(styles.btn, styles.primary)} onClick={noteIt}>
            Note reading
          </button>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {rows[kind].length === 0 ? (
          <Empty>No readings yet for the {kind === 'bw' ? 'binary-weighted' : 'R-2R ladder'} DAC.</Empty>
        ) : (
          <Table head={['Code', 'Binary (b3b2b1b0)', 'Vout meas. (V)', 'Vout ideal (V)']} rows={rows[kind].map((r) => [r.code, r.code.toString(2).padStart(4, '0'), r.vout, ((kind === 'bw' ? -1 : 1) * (VREF * r.code) / 16).toFixed(2)])} />
        )}
      </Section>
      <Section title="Result">
        <Table head={['DAC', 'Codes tested']} rows={[['Binary-weighted', rows.bw.length], ['R-2R ladder', rows.r2r.length]]} />
        <ResetKit onReset={() => (setRows({bw: [], r2r: []}), setBits([false, false, false, false]), setPrinted(false), setNote(null), newKit())} />
      </Section>
    </PracticalSheet>
  );
}
