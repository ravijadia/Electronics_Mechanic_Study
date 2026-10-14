import React, {useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import useStoredState from '../useStoredState';
import {useScope} from '../Scope';
import {fgFreq, fgVpp, useFunctionGenerator, type Wave} from '../FunctionGenerator';
import {NoteBox, ResetKit, Section, Table, Verdict, shuffle, useKitSeed, useRng, type Note} from '../kit';
import {dc, si, sine, square, type Sig} from '../signals';
import styles from '../styles.module.css';

const num = (x?: string) => (x && x.trim() !== '' && !Number.isNaN(Number(x)) ? Number(x) : null);
const within = (a: number | null, b: number, tol: number) => a != null && Math.abs(a - b) <= Math.abs(b) * tol;

// ---------------------------------------------------------------------------
// 1.4.37 Identify the controls on the CRO/DSO front panel
// ---------------------------------------------------------------------------

const CONTROL_QUIZ: {does: string; control: string}[] = [
  {does: 'Changes the brightness of the trace', control: 'INTENSITY'},
  {does: 'Makes the trace thin and sharp', control: 'FOCUS'},
  {does: 'Sets how many volts each vertical division represents', control: 'VOLTS/DIV'},
  {does: 'Sets how much time each horizontal division represents', control: 'TIME/DIV'},
  {does: 'Moves the trace up or down', control: 'Vertical POSITION'},
  {does: 'Makes a repeating waveform stand still', control: 'TRIGGER LEVEL'},
  {does: 'Connects the input to 0 V to show the zero line', control: 'GND coupling'},
  {does: 'Blocks the DC part of the signal', control: 'AC coupling'},
];

export function CroControlsLab(): React.JSX.Element {
  const KEY = '1.4.37';
  const [seed, newKit] = useKitSeed(KEY);
  const quiz = useRng(seed, (rnd) => shuffle(CONTROL_QUIZ, rnd));
  const options = useRng(seed, (rnd) => shuffle(CONTROL_QUIZ.map((q) => q.control), rnd));
  const [ans, setAns] = useStoredState<Record<string, string>>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const scope = useScope(
    'cro',
    {ch1: sine(1000, 4)},
    {intensity: 1, focus: 9, tdiv: 0.05, trigLevel: 5, ch1: {vdiv: 0.05, pos: 5, coupling: 'GND', on: true}},
  );
  const s = scope.state;
  const fits = s.ch1.coupling !== 'GND' && 4 / s.ch1.vdiv >= 2 && 4 / s.ch1.vdiv <= 8;
  const cycles = (10 * s.tdiv) / 1e-3;
  const checks = [
    {label: 'Trace visible: turn up INTENSITY.', done: s.intensity >= 4},
    {label: 'Trace sharp: adjust FOCUS.', done: Math.abs(s.focus - 5) <= 1},
    {label: 'Signal connected (not GND) and centred with POSITION.', done: s.ch1.coupling !== 'GND' && Math.abs(s.ch1.pos) <= 0.6},
    {label: 'Height 2–8 divisions: set VOLTS/DIV.', done: fits},
    {label: '2–5 cycles on screen: set TIME/DIV.', done: cycles >= 2 && cycles <= 5},
    {label: 'Waveform stands still: set TRIGGER LEVEL.', done: scope.triggered},
  ];
  const quizOk = quiz.every((q) => ans[q.does] === q.control);

  return (
    <PracticalSheet
      number={KEY}
      title="Identify the Controls on the CRO Front Panel"
      aim="To identify the front-panel controls of a CRO and use them to get a bright, sharp, stable, well-sized trace."
      apparatus={['Dual-trace CRO', '1 kHz sine signal connected to CH1']}
      procedure={['The CRO has been left badly adjusted. Use each control in turn until all six checks are green.', 'Then match each control to what it does.']}
      precautions={['Do not leave a bright spot still on the screen: it burns the phosphor.', 'Keep intensity only as high as needed.']}
      viva={[
        {q: 'Why is the trace unstable when the trigger level is outside the signal?', a: 'The sweep never gets a trigger at the same point, so each sweep starts at a different phase.'},
        {q: 'Why use GND coupling?', a: 'It disconnects the signal and shows the 0 V line, so you can set the reference before measuring.'},
        {q: 'What is the difference between AC and DC coupling?', a: 'DC coupling shows the whole signal. AC coupling blocks the DC level and shows only the varying part.'},
      ]}
      steps={[
        {label: 'Turn up INTENSITY until the trace shows.', hint: 'Keep it only as bright as needed.', done: checks[0].done},
        {label: 'Adjust FOCUS for a sharp trace.', hint: 'Turn until the line is thinnest.', done: checks[1].done},
        {label: 'Set coupling to DC (not GND) and centre the trace with POSITION.', hint: 'GND shows the 0 V line; DC shows the signal.', done: checks[2].done},
        {label: 'Set VOLTS/DIV so the height is 2–8 divisions.', hint: 'The signal is 4 V peak to peak.', done: checks[3].done},
        {label: 'Set TIME/DIV for 2–5 cycles on screen.', hint: 'The signal is 1 kHz, so one cycle is 1 ms.', done: checks[4].done},
        {label: 'Turn TRIGGER LEVEL until the waveform stands still.', hint: 'The level must lie inside the signal.', done: checks[5].done},
        {
          label: `Match all eight controls to their functions. Correct: ${quiz.filter((q) => ans[q.does] === q.control).length}/${quiz.length}`,
          hint: 'Use the drop-downs in the table.',
          done: quizOk,
        },
        {label: 'Enter your details and print or save the record.', hint: 'Practical record, below the result.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">{scope.view}</Section>
      <Section title="Observation table">
        <Table
          head={['What the control does', 'Control', 'Check']}
          rows={quiz.map((q) => [
            q.does,
            <select className={styles.select} aria-label={q.does} value={ans[q.does] ?? ''} onChange={(e) => setAns((a) => ({...a, [q.does]: e.target.value}))}>
              <option value="">Choose…</option>
              {options.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>,
            ans[q.does] ? <Verdict ok={ans[q.does] === q.control} /> : '–',
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
// 1.4.38 Measure VDC, VAC and time period using the CRO
// ---------------------------------------------------------------------------

interface MeasAns {
  vdc?: string;
  vpp?: string;
  vrms?: string;
  t?: string;
  f?: string;
  sqT?: string;
  sqF?: string;
}

export function CroMeasureLab(): React.JSX.Element {
  const KEY = '1.4.38';
  const [seed, newKit] = useKitSeed(KEY);
  const kit = useRng(seed, (rnd) => {
    const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
    return {
      vdc: pick([1.6, 2.4, 3.2, 4.4, 5.6, 6.8]),
      sineF: pick([50, 200, 500, 1000, 2000, 5000]),
      sineVpp: pick([2, 4, 6, 8, 12]),
      sqF: pick([100, 250, 400, 2500]),
      sqVpp: pick([3, 5, 10]),
    };
  });
  const [src, setSrc] = useState<'dc' | 'sine' | 'square'>('dc');
  const [ans, setAns] = useStoredState<MeasAns>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const sig: Sig = src === 'dc' ? dc(kit.vdc) : src === 'sine' ? sine(kit.sineF, kit.sineVpp) : square(kit.sqF, kit.sqVpp);
  const scope = useScope('cro', {ch1: sig}, {ch1: {vdiv: 5, pos: 0, coupling: 'DC', on: true}, tdiv: 1e-3});

  const r = {
    vdc: ans.vdc ? within(num(ans.vdc), kit.vdc, 0.06) : null,
    vpp: ans.vpp ? within(num(ans.vpp), kit.sineVpp, 0.06) : null,
    vrms: ans.vrms ? within(num(ans.vrms), kit.sineVpp / (2 * Math.SQRT2), 0.07) : null,
    t: ans.t ? within(num(ans.t), 1000 / kit.sineF, 0.06) : null,
    f: ans.f ? within(num(ans.f), kit.sineF, 0.07) : null,
    sqT: ans.sqT ? within(num(ans.sqT), 1000 / kit.sqF, 0.06) : null,
    sqF: ans.sqF ? within(num(ans.sqF), kit.sqF, 0.07) : null,
  };
  const inp = (k: keyof MeasAns, label: string) => (
    <input className={styles.input} inputMode="decimal" aria-label={label} value={ans[k] ?? ''} onChange={(e) => setAns((a) => ({...a, [k]: e.target.value}))} />
  );

  return (
    <PracticalSheet
      number={KEY}
      title="Measure DC Voltage, AC Voltage and Time Period with a CRO"
      aim="To measure a DC voltage, the peak-to-peak and RMS value of a sine wave, and the time period and frequency of AC signals using a CRO."
      apparatus={['Dual-trace CRO', 'DC supply', 'Sine and square wave sources']}
      procedure={[
        'Select GND and set the zero line on the centre line. Then select DC coupling.',
        'DC: V = divisions moved × VOLTS/DIV.',
        'AC: Vpp = vertical divisions (peak to peak) × VOLTS/DIV. For a sine wave, Vrms = Vpp ÷ 2√2.',
        'T = horizontal divisions for one cycle × TIME/DIV. f = 1 ÷ T.',
        'Each small mark on the centre lines is 0.2 division.',
      ]}
      precautions={['Set the zero line with GND before measuring DC.', 'Choose VOLTS/DIV and TIME/DIV so the waveform is as large as possible on screen.', 'Make sure the variable (CAL) knobs are in the calibrated position.']}
      viva={[
        {q: 'A sine wave covers 5.2 divisions peak to peak at 2 V/div. Find Vpp and Vrms.', a: 'Vpp = 10.4 V, Vrms = 10.4 ÷ 2.83 ≈ 3.68 V.'},
        {q: 'One cycle covers 4 divisions at 0.5 ms/div. Find f.', a: 'T = 2 ms, so f = 500 Hz.'},
        {q: 'Why does a DC voltage disappear in AC coupling?', a: 'The coupling capacitor blocks DC.'},
      ]}
      steps={[
        {
          label: 'Set the CH1 input to DC supply and read its voltage.',
          hint: 'GND first to set the zero line, then DC. V = divisions × VOLTS/DIV.',
          done: !!r.vdc,
        },
        {label: 'Switch to Sine source and measure Vpp.', hint: 'Make the waveform as large as possible. Vpp = divisions × VOLTS/DIV.', done: !!r.vpp},
        {label: 'Calculate the sine Vrms.', hint: 'Vrms = Vpp ÷ 2√2.', done: !!r.vrms},
        {label: 'Measure the sine period T (ms) and frequency f.', hint: 'T = divisions per cycle × TIME/DIV. f = 1 ÷ T.', done: !!(r.t && r.f)},
        {label: 'Switch to Square source and measure T and f.', hint: 'Adjust TIME/DIV to show 2–5 cycles.', done: !!(r.sqT && r.sqF)},
        {label: 'Enter your details and print or save the record.', hint: 'Practical record, below the result.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={clsx(styles.row, styles.noPrint)} style={{marginBottom: '0.7rem'}}>
          <span className={styles.label} style={{margin: 0}}>
            CH1 input:
          </span>
          <div className={styles.seg} role="group" aria-label="Input">
            <button type="button" aria-pressed={src === 'dc'} onClick={() => setSrc('dc')}>
              DC supply
            </button>
            <button type="button" aria-pressed={src === 'sine'} onClick={() => setSrc('sine')}>
              Sine source
            </button>
            <button type="button" aria-pressed={src === 'square'} onClick={() => setSrc('square')}>
              Square source
            </button>
          </div>
        </div>
        {scope.view}
      </Section>
      <Section title="Observation table">
        <Table
          head={['Quantity', 'Your value', 'Check']}
          rows={[
            ['DC voltage (V)', inp('vdc', 'DC voltage'), <Verdict ok={r.vdc} />],
            ['Sine Vpp (V)', inp('vpp', 'Sine Vpp'), <Verdict ok={r.vpp} />],
            ['Sine Vrms (V)', inp('vrms', 'Sine Vrms'), <Verdict ok={r.vrms} />],
            ['Sine period T (ms)', inp('t', 'Sine period'), <Verdict ok={r.t} />],
            ['Sine frequency f (Hz)', inp('f', 'Sine frequency'), <Verdict ok={r.f} />],
            ['Square period T (ms)', inp('sqT', 'Square period'), <Verdict ok={r.sqT} />],
            ['Square frequency f (Hz)', inp('sqF', 'Square frequency'), <Verdict ok={r.sqF} />],
          ]}
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
// 1.4.39 Identify the controls on the function generator front panel
// ---------------------------------------------------------------------------

interface Target {
  wave: Wave;
  f: number;
  vpp: number;
  offset: number;
}
const TARGETS: Target[] = [
  {wave: 'sine', f: 1000, vpp: 4, offset: 0},
  {wave: 'square', f: 50, vpp: 10, offset: 0},
  {wave: 'triangle', f: 10000, vpp: 2, offset: 0},
  {wave: 'sine', f: 100, vpp: 6, offset: 2},
  {wave: 'square', f: 5000, vpp: 0.5, offset: 0},
  {wave: 'triangle', f: 250, vpp: 8, offset: 0},
];
const describe = (t: Target) => `${t.wave} · ${si(t.f, 'Hz')} · ${t.vpp} Vpp${t.offset ? ` · +${t.offset} V offset` : ''}`;

export function FgControlsLab(): React.JSX.Element {
  const KEY = '1.4.39';
  const [seed, newKit] = useKitSeed(KEY);
  const targets = useRng(seed, (rnd) => shuffle(TARGETS, rnd).slice(0, 4));
  const [done, setDone] = useStoredState<number[]>(`lab:${KEY}:done`, []);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);
  const fg = useFunctionGenerator({amp: 2, dial: 0.5, range: 100});
  const scope = useScope('dso', {ch1: fg.signal}, {measure: true, ch1: {vdiv: 1, pos: 0, coupling: 'DC', on: true}});

  const check = (k: number) => {
    const t = targets[k];
    const s = fg.state;
    const off = s.atten ? s.offset / 10 : s.offset;
    const miss: string[] = [];
    if (!s.on) miss.push('output is OFF');
    if (s.wave !== t.wave) miss.push('waveform');
    if (!within(fgFreq(s), t.f, 0.03)) miss.push('frequency');
    if (!within(fgVpp(s), t.vpp, 0.05)) miss.push('amplitude');
    if (Math.abs(off - t.offset) > 0.2) miss.push('DC offset');
    if (miss.length) return setNote({kind: 'warn', text: `Not yet: ${miss.join(', ')}.`});
    if (!done.includes(k)) setDone((d) => [...d, k]);
    setNote({kind: 'good', text: `Signal ${k + 1} correct ✓`});
  };

  return (
    <PracticalSheet
      number={KEY}
      title="Identify the Controls on the Function Generator"
      aim="To identify the controls of a function generator and set it to produce required signals, checked on an oscilloscope."
      apparatus={['Function generator', 'Digital storage oscilloscope']}
      procedure={['Choose the waveform.', 'Frequency = RANGE × DIAL.', 'Set AMPLITUDE (use ATT −20 dB for small signals) and DC OFFSET.', 'Check on the scope, then press “Check”.']}
      precautions={['Start with low amplitude when connecting to a circuit.', 'Never connect the output to a voltage source.']}
      viva={[
        {q: 'Range ×1k with the dial at 0.25: what is the frequency?', a: '250 Hz.'},
        {q: 'What does the −20 dB attenuator do?', a: 'It divides the output voltage by 10.'},
        {q: 'What does DC offset do?', a: 'It shifts the whole waveform up or down by a DC level.'},
      ]}
      steps={[
        {label: 'Switch the generator output ON.', hint: 'Watch the trace on the scope.', done: fg.state.on || done.length > 0},
        ...targets.map((t, k) => ({
          label: `Set signal ${k + 1}: ${describe(t)}, then press Check.`,
          hint: t.vpp <= 1 ? 'Use ATT −20 dB for small signals. Frequency = RANGE × DIAL.' : 'Frequency = RANGE × DIAL. Check on the scope.',
          done: done.includes(k),
        })),
        {label: 'Enter your details and print or save the record.', hint: 'Practical record, below the result.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div>{scope.screen}</div>
          <div>{fg.view}</div>
        </div>
        <details className={styles.noPrint} style={{marginTop: '0.6rem'}}>
          <summary className={styles.muted} style={{cursor: 'pointer'}}>
            Scope controls
          </summary>
          {scope.controls}
        </details>
      </Section>
      <Section title="Observation table">
        <Table
          head={['Signal', 'Required', 'Check']}
          rows={targets.map((t, k) => [
            k + 1,
            describe(t),
            done.includes(k) ? (
              <Verdict ok />
            ) : (
              <button type="button" className={clsx(styles.btn, styles.noPrint)} onClick={() => check(k)}>
                Check
              </button>
            ),
          ])}
        />
        <NoteBox note={note} />
        <ResetKit
          onReset={() => {
            setDone([]);
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}
