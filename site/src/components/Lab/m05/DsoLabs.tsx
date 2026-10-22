import React, {useEffect, useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import {GU_1_5_40, GU_1_5_41, GU_1_5_42, GU_1_5_43} from './gu';
import useStoredState from '../useStoredState';
import {useScope} from '../Scope';
import {fgFreq, fgVpp, useFunctionGenerator} from '../FunctionGenerator';
import {Empty, NoteBox, ResetKit, Section, Table, Verdict, shuffle, useKitSeed, useRng, type Note} from '../kit';
import {halfWave, pulse, si, sine, square, stats, triangle, type Sig} from '../signals';
import styles from '../styles.module.css';

const num = (x?: string) => (x && x.trim() !== '' && !Number.isNaN(Number(x)) ? Number(x) : null);
const within = (a: number | null, b: number, tol: number) => a != null && Math.abs(a - b) <= Math.abs(b) * tol;

// ---------------------------------------------------------------------------
// 1.5.40 Identify the controls on the DSO front panel
// ---------------------------------------------------------------------------

const DSO_QUIZ: {does: string; control: string}[] = [
  {does: 'Sets volts/div, time/div and trigger automatically', control: 'AUTO SET'},
  {does: 'Freezes the display or restarts acquisition', control: 'RUN/STOP'},
  {does: 'Captures one sweep, then stops', control: 'SINGLE'},
  {does: 'Shows Vpp, frequency, period and RMS on screen', control: 'MEASURE'},
  {does: 'Moves markers to read the time or voltage between two points', control: 'CURSORS'},
  {does: 'Stores a waveform or settings to memory / USB', control: 'SAVE/RECALL'},
  {does: 'Chooses which channel the trigger watches', control: 'TRIGGER SOURCE'},
  {does: 'Moves the waveform left or right', control: 'HORIZONTAL POSITION'},
];

export function DsoControlsLab(): React.JSX.Element {
  const KEY = '1.5.40';
  const [seed, newKit] = useKitSeed(KEY);
  const quiz = useRng(seed, (rnd) => shuffle(DSO_QUIZ, rnd));
  const opts = useRng(seed, (rnd) => shuffle(DSO_QUIZ.map((q) => q.control), rnd));
  const [ans, setAns] = useStoredState<Record<string, string>>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [stopped, setStopped] = useStoredState(`lab:${KEY}:stopped`, false);
  const ch1 = square(2000, 3, 1.5);
  const ch2 = sine(500, 6);
  const scope = useScope('dso', {ch1, ch2}, {tdiv: 0.02, ch1: {vdiv: 0.1, pos: 0, coupling: 'DC', on: true}, ch2: {vdiv: 0.1, pos: 0, coupling: 'DC', on: false}, trigLevel: 8});
  const s = scope.state;
  useEffect(() => {
    if (!s.run && !stopped) setStopped(true);
  }, [s.run, stopped, setStopped]);
  const fit = (pp: number, vdiv: number) => pp / vdiv >= 2 && pp / vdiv <= 8;
  const quizOk = quiz.every((q) => ans[q.does] === q.control);

  return (
    <PracticalSheet
      number={KEY}
      title="Identify the Controls on the DSO Front Panel"
      aim="To identify the front-panel controls of a digital storage oscilloscope and use them to display, freeze and measure two signals."
      apparatus={['Digital storage oscilloscope', 'Square wave on CH1, sine wave on CH2']}
      procedure={['Try AUTO SET first, then adjust by hand.', 'Show both channels, trigger on CH2, freeze with RUN/STOP, and turn on MEASURE.', 'Then match each control to its function.']}
      precautions={['Do not exceed the input voltage rating of the scope.', 'Connect the probe ground clip to circuit ground only.']}
      viva={[
        {q: 'What is the advantage of a DSO over a CRO?', a: 'It stores waveforms, freezes single events, measures automatically, and can save or print the screen.'},
        {q: 'When is SINGLE trigger used?', a: 'To capture a one-time event, such as a switch-on surge.'},
        {q: 'What does AUTO SET not guarantee?', a: 'The best view for your purpose. You often still need to adjust the settings by hand.'},
      ]}
      steps={[
        {label: 'Show both channels (DUAL).', hint: 'Turn CH2 on and choose DUAL display.', done: s.display === 'DUAL' && s.ch1.on && s.ch2.on},
        {label: 'Set VOLTS/DIV so both traces are 2–8 divisions high.', hint: 'CH1 is 3 V and CH2 is 6 V peak to peak.', done: fit(3, s.ch1.vdiv) && fit(6, s.ch2.vdiv)},
        {label: 'Trigger on CH2 for a stable display.', hint: 'Set TRIGGER SOURCE to CH2, then adjust the level.', done: s.trigSrc === 2 && scope.triggered},
        {label: 'Turn on MEASURE.', hint: 'It shows Vpp, frequency and period on screen.', done: s.measure},
        {label: 'Freeze the display with RUN/STOP.', hint: 'Press RUN/STOP once.', done: stopped},
        {
          label: `Match all eight controls to their functions. Correct: ${quiz.filter((q) => ans[q.does] === q.control).length}/${quiz.length}`,
          hint: 'Use the drop-downs in the table.',
          done: quizOk,
        },
        {label: 'Enter your details and print or save the record.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_5_40}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">{scope.view}</Section>
      <Section title="Observation table">
        <Table
          head={['What it does', 'Control', 'Check']}
          rows={quiz.map((q) => [
            q.does,
            <select className={styles.select} aria-label={q.does} value={ans[q.does] ?? ''} onChange={(e) => setAns((a) => ({...a, [q.does]: e.target.value}))}>
              <option value="">Choose…</option>
              {opts.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>,
            ans[q.does] ? <Verdict ok={ans[q.does] === q.control} /> : '–',
          ])}
        />
        <ResetKit
          onReset={() => {
            setAns({});
            setStopped(false);
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// 1.5.41 Measure amplitude, frequency and time period of typical signals
// ---------------------------------------------------------------------------

interface Signal41 {
  id: string;
  name: string;
  sig: Sig;
}

export function DsoMeasureLab(): React.JSX.Element {
  const KEY = '1.5.41';
  const [seed, newKit] = useKitSeed(KEY);
  const signals = useRng<Signal41[]>(seed, (rnd) => {
    const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
    return [
      {id: 'sine', name: 'Audio sine wave', sig: sine(pick([440, 800, 1200, 3000]), pick([1.2, 2, 3.4]))},
      {id: 'clock', name: 'Digital clock (square)', sig: pulse(pick([10000, 32768, 50000]), 5, 0.5)},
      {id: 'tri', name: 'Triangle wave', sig: triangle(pick([150, 600, 2500]), pick([4, 8]))},
      {id: 'hw', name: 'Half-wave rectifier output', sig: halfWave(50, pick([12, 16.9, 24]))},
      {id: 'pwm', name: 'PWM signal', sig: pulse(pick([500, 1000, 2000]), pick([5, 12]), pick([0.25, 0.4, 0.75]))},
    ];
  });
  const [sel, setSel] = useState(0);
  const [ans, setAns] = useStoredState<Record<string, {vpp?: string; f?: string; t?: string}>>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const cur = signals[sel];
  const scope = useScope('dso', {ch1: cur.sig}, {ch1: {vdiv: 1, pos: 0, coupling: 'DC', on: true}, tdiv: 1e-3});

  const res = signals.map((s) => {
    const m = stats(s.sig);
    const a = ans[s.id] ?? {};
    return {
      m,
      vpp: a.vpp ? within(num(a.vpp), m.pp, 0.04) : null,
      f: a.f ? within(num(a.f), m.freq!, 0.04) : null,
      t: a.t ? within(num(a.t), m.period! * 1000, 0.04) : null,
    };
  });
  const inp = (id: string, f: 'vpp' | 'f' | 't', label: string) => (
    <input className={styles.input} inputMode="decimal" aria-label={label} value={ans[id]?.[f] ?? ''} onChange={(e) => setAns((x) => ({...x, [id]: {...x[id], [f]: e.target.value}}))} />
  );

  return (
    <PracticalSheet
      number={KEY}
      title="Measure Amplitude, Frequency and Time Period with a DSO"
      aim="To measure the peak-to-peak amplitude, frequency and time period of typical electronic signals using a digital storage oscilloscope."
      apparatus={['Digital storage oscilloscope', 'Five signal sources (sine, clock, triangle, rectifier output, PWM)']}
      procedure={['Select a signal. Press AUTO SET, then adjust for a clear view.', 'Read Vpp, frequency and period, from the MEASURE readouts or by counting divisions.', 'Enter the values. Period in ms.']}
      precautions={['Use DC coupling to see the true levels of pulses and rectified waves.', 'Display at least one full cycle when measuring the period.']}
      viva={[
        {q: 'What is the relation between f and T?', a: 'f = 1 / T.'},
        {q: 'A PWM signal has a 1 ms period and is high for 0.25 ms. What is the duty cycle?', a: '25 %.'},
        {q: 'Why does the half-wave rectifier output have the same frequency as the mains?', a: 'There is one output pulse for each input cycle.'},
      ]}
      steps={[
        ...signals.map((s, k) => ({
          label: `Measure the ${s.name.toLowerCase()}: Vpp, frequency and period.`,
          hint: 'Click its button above the scope. Read MEASURE or count divisions. Period in ms.',
          done: !!(res[k].vpp && res[k].f && res[k].t),
        })),
        {label: 'Enter your details and print or save the record.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_5_41(signals.map((s) => s.name.toLowerCase()))}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={clsx(styles.seg, styles.noPrint)} role="group" aria-label="Signal" style={{marginBottom: '0.7rem'}}>
          {signals.map((s, k) => (
            <button key={s.id} type="button" aria-pressed={sel === k} onClick={() => setSel(k)}>
              {s.name}
            </button>
          ))}
        </div>
        {scope.view}
      </Section>
      <Section title="Observation table">
        <Table
          head={['Signal', 'Vpp (V)', 'Frequency (Hz)', 'Period (ms)', 'Check']}
          rows={signals.map((s, k) => [
            s.name,
            inp(s.id, 'vpp', `${s.name} Vpp`),
            inp(s.id, 'f', `${s.name} frequency`),
            inp(s.id, 't', `${s.name} period`),
            [res[k].vpp, res[k].f, res[k].t].some((x) => x == null) ? '–' : <Verdict ok={!!(res[k].vpp && res[k].f && res[k].t)} />,
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
// 1.5.42 Take a print of a signal from the DSO and tally with the applied signal
// ---------------------------------------------------------------------------

interface Shot {
  svg: string;
  fgF: number;
  fgVpp: number;
  wave: string;
}

export function DsoPrintLab(): React.JSX.Element {
  const KEY = '1.5.42';
  const [shot, setShot] = useStoredState<Shot | null>(`lab:${KEY}:shot`, null);
  const [ans, setAns] = useStoredState<{f?: string; vpp?: string}>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);
  const fg = useFunctionGenerator({wave: 'sine', range: 1000, dial: 1.5, amp: 6}, false);
  const scope = useScope('dso', {ch1: fg.signal}, {ch1: {vdiv: 2, pos: 0, coupling: 'DC', on: true}, tdiv: 2e-4});

  const capture = () => {
    const el = scope.svgRef.current;
    if (!el) return;
    setShot({svg: new XMLSerializer().serializeToString(el), fgF: fgFreq(fg.state), fgVpp: fgVpp(fg.state), wave: fg.state.wave});
    setNote({kind: 'good', text: 'Screen captured. Read it in the printout below.'});
  };

  const download = () => {
    if (!shot) return;
    const img = new Image();
    const url = URL.createObjectURL(new Blob([shot.svg], {type: 'image/svg+xml'}));
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = 1040;
      c.height = 912;
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => {
        if (!b) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = 'dso-screen.png';
        a.click();
      });
    };
    img.src = url;
  };

  const fOk = shot && ans.f ? within(num(ans.f), shot.fgF, 0.05) : null;
  const vOk = shot && ans.vpp ? within(num(ans.vpp), shot.fgVpp, 0.06) : null;

  return (
    <PracticalSheet
      number={KEY}
      title="Take a Print of a DSO Signal and Tally with the Applied Signal"
      aim="To save or print the DSO screen, read the signal from the printout, and tally it with the generator setting."
      apparatus={['Function generator (dial only, no frequency display)', 'Digital storage oscilloscope with save / print']}
      procedure={['Set any signal on the generator and display it clearly on the DSO.', 'Press SAVE / PRINT SCREEN.', 'From the printout only, read the frequency and Vpp.', 'Tally them with the generator setting (range × dial, amplitude).']}
      precautions={['Freeze (STOP) before saving if the signal is changing.', 'Note the scope settings shown on the printout: they are needed to read it.']}
      viva={[
        {q: 'Why must the printout show V/div and time/div?', a: 'Without the scale settings the divisions cannot be turned into volts and seconds.'},
        {q: 'Why may the generator dial and the measured frequency differ slightly?', a: 'The dial is not precise. The scope’s measurement is more accurate.'},
      ]}
      steps={[
        {label: 'Set any signal on the generator and show it clearly.', hint: 'Output ON, 2–5 cycles on the scope.', done: fg.state.on || !!shot},
        {label: 'Press SAVE / PRINT SCREEN.', hint: 'Freeze first if the signal is changing.', done: !!shot},
        {label: 'Read the frequency from the printout and type it.', hint: 'Use the time/div shown on the printout. f = 1 ÷ T.', done: !!fOk},
        {label: 'Read Vpp from the printout and type it.', hint: 'Vpp = divisions × volts/div shown on the printout.', done: !!vOk},
        {label: 'Enter your details and print or save the record.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_5_42}
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
        <div className={clsx(styles.row, styles.noPrint)} style={{marginTop: '0.7rem'}}>
          <button type="button" className={clsx(styles.btn, styles.primary)} onClick={capture}>
            SAVE / PRINT SCREEN
          </button>
          {shot && (
            <button type="button" className={styles.btn} onClick={download}>
              Download PNG
            </button>
          )}
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Printout and tally">
        {!shot ? (
          <Empty>No printout yet.</Empty>
        ) : (
          <>
            <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(shot.svg)}`} alt="Saved DSO screen" style={{width: '100%', maxWidth: 560, display: 'block', borderRadius: 8}} />
            <Table
              head={['', 'Read from printout', 'Generator setting', 'Tally']}
              rows={[
                [
                  'Frequency (Hz)',
                  <input className={styles.input} inputMode="decimal" aria-label="Frequency from printout" value={ans.f ?? ''} onChange={(e) => setAns((a) => ({...a, f: e.target.value}))} />,
                  fOk != null ? si(shot.fgF, 'Hz', 4) : '(hidden until you answer)',
                  <Verdict ok={fOk} />,
                ],
                [
                  'Vpp (V)',
                  <input className={styles.input} inputMode="decimal" aria-label="Vpp from printout" value={ans.vpp ?? ''} onChange={(e) => setAns((a) => ({...a, vpp: e.target.value}))} />,
                  vOk != null ? `${shot.fgVpp} V` : '(hidden until you answer)',
                  <Verdict ok={vOk} />,
                ],
              ]}
            />
          </>
        )}
        <ResetKit
          onReset={() => {
            setShot(null);
            setAns({});
            setPrinted(false);
          }}
        />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// 1.5.43 Construct and test a function generator using IC 8038
// ---------------------------------------------------------------------------

const RS = [3300, 10000, 33000];
const CS = [1e-9, 10e-9, 100e-9];
const VCC = 12;
type Out = 'square' | 'triangle' | 'sine';

interface Row43 {
  r: number;
  c: number;
  calc: string;
  meas: string;
  trueF: number;
}

export function Icl8038Lab(): React.JSX.Element {
  const KEY = '1.5.43';
  const [seed, newKit] = useKitSeed(KEY);
  const tol = useRng(seed, (rnd) => 0.95 + rnd() * 0.1);
  const [r, setR] = useState(10000);
  const [c, setC] = useState(10e-9);
  const [out, setOut] = useState<Out>('square');
  const [seen, setSeen] = useStoredState<Out[]>(`lab:${KEY}:seen`, []);
  const [rows, setRows] = useStoredState<Row43[]>(`lab:${KEY}:rows`, []);
  const [calc, setCalc] = useState('');
  const [meas, setMeas] = useState('');
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);

  const f = (0.33 / (r * c)) * tol;
  const sig: Sig =
    out === 'square' ? pulse(f, VCC, 0.5) : out === 'triangle' ? triangle(f, VCC * 0.33, VCC / 2) : sine(f, VCC * 0.22, VCC / 2);
  const scope = useScope('dso', {ch1: sig}, {measure: true, ch1: {vdiv: 5, pos: -2, coupling: 'DC', on: true}, tdiv: 2e-4, trigLevel: 6});

  useEffect(() => {
    if (!seen.includes(out)) setSeen((s) => [...s, out]);
  }, [out, seen, setSeen]);
  const view = (o: Out) => setOut(o);

  const record = () => {
    const cv = num(calc);
    const mv = num(meas);
    if (cv == null || mv == null) return setNote({kind: 'warn', text: 'Enter the calculated and measured frequency.'});
    if (rows.some((x) => x.r === r && x.c === c)) return setNote({kind: 'warn', text: 'Already noted. Try another R or C.'});
    setRows((x) => [...x, {r, c, calc, meas, trueF: f}]);
    setCalc('');
    setMeas('');
    setNote(null);
  };

  const rowOk = (x: Row43) => within(num(x.calc), 0.33 / (x.r * x.c), 0.03) && within(num(x.meas), x.trueF, 0.04);
  const near1k = rows.some((x) => rowOk(x) && Math.abs(x.trueF - 1000) < 150);

  return (
    <PracticalSheet
      number={KEY}
      title="Construct and Test a Function Generator Using IC 8038"
      aim="To build a function generator with IC 8038, observe its square, triangle and sine outputs, and verify its frequency f ≈ 0.33 ÷ (R × C)."
      apparatus={['IC 8038 (ICL8038) waveform generator', 'Resistors RA = RB = R, capacitor C', '12 V DC supply, 10 kΩ pull-up resistor', 'Digital storage oscilloscope']}
      procedure={['Build the circuit with RA = RB = R and timing capacitor C.', 'Observe the square (pin 9), triangle (pin 3) and sine (pin 2) outputs.', 'Calculate f = 0.33 ÷ (R × C) and measure f on the DSO.', 'Repeat for at least three R–C combinations.']}
      precautions={['Check the IC pin numbers before switching on.', 'Pin 9 is open collector: it needs a pull-up resistor to V+.', 'Use the DSO probe ground on circuit ground.']}
      viva={[
        {q: 'Which outputs does IC 8038 give?', a: 'Square (pin 9), triangle (pin 3) and sine (pin 2), all at the same frequency.'},
        {q: 'How does the frequency change if C is made 10 times larger?', a: 'It becomes 10 times lower.'},
        {q: 'Why is the measured frequency a little different from the calculation?', a: 'Component tolerances, and the formula is an approximation.'},
      ]}
      steps={[
        {
          label: `View all three outputs on the DSO. Outputs: ${seen.length}/3`,
          hint: 'Move the DSO probe to pin 9, pin 3 and pin 2.',
          done: seen.length === 3,
        },
        {
          label: 'Calculate f, measure it on the DSO, type both and press Note reading.',
          hint: 'f = 0.33 ÷ (R × C). Read the measured f from MEASURE.',
          done: rows.length > 0,
        },
        {
          label: `Record three R–C combinations correctly. Correct: ${Math.min(3, rows.filter(rowOk).length)}/3`,
          hint: 'Change R or C each time.',
          done: rows.filter(rowOk).length >= 3,
        },
        {label: 'Choose R and C to get about 1 kHz and record it.', hint: 'Use f = 0.33 ÷ (R × C) to pick the values.', done: near1k},
        {label: 'Enter your details and print or save the record.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_5_43}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div>
            <div className={styles.kit}>
              <svg viewBox="0 0 520 250" role="img" aria-label="IC 8038 function generator circuit">
                <rect x="190" y="40" width="140" height="170" rx="6" fill="#1b1b1b" stroke="#888" />
                <text x="260" y="128" textAnchor="middle" className={clsx(styles.kitText, styles.bold)}>
                  IC 8038
                </text>
                {[
                  ['4', 190, 70],
                  ['5', 190, 100],
                  ['10', 190, 160],
                  ['11', 190, 195],
                  ['6', 330, 55],
                  ['9', 330, 95],
                  ['3', 330, 135],
                  ['2', 330, 175],
                ].map(([p, x, y]) => (
                  <g key={p as string}>
                    <line x1={Number(x) + (Number(x) === 190 ? -20 : 0)} y1={Number(y)} x2={Number(x) + (Number(x) === 190 ? 0 : 20)} y2={Number(y)} className={styles.wire} />
                    <text x={Number(x) + (Number(x) === 190 ? 6 : -6)} y={Number(y) + 4} textAnchor={Number(x) === 190 ? 'start' : 'end'} className={clsx(styles.kitText, styles.small)}>
                      {p}
                    </text>
                  </g>
                ))}
                <text x="40" y="74" className={styles.kitText}>RA = {si(r, 'Ω')}</text>
                <text x="40" y="104" className={styles.kitText}>RB = {si(r, 'Ω')}</text>
                <text x="40" y="164" className={styles.kitText}>C = {si(c, 'F')}</text>
                <text x="40" y="199" className={styles.kitText}>GND</text>
                <text x="356" y="59" className={styles.kitText}>+12 V</text>
                {(
                  [
                    ['square', 99, 'Square (pin 9)'],
                    ['triangle', 139, 'Triangle (pin 3)'],
                    ['sine', 179, 'Sine (pin 2)'],
                  ] as const
                ).map(([o, y, l]) => (
                  <text key={o} x="356" y={y} className={styles.kitText} style={{fontWeight: out === o ? 800 : 400, fill: out === o ? '#ffd400' : undefined}}>
                    {l}
                  </text>
                ))}
              </svg>
            </div>
            <div className={clsx(styles.noPrint)} style={{display: 'grid', gap: '0.4rem', marginTop: '0.6rem'}}>
              <div className={styles.row}>
                <span className={styles.label} style={{margin: 0, minWidth: 80}}>
                  R (RA = RB)
                </span>
                <div className={styles.seg} role="group" aria-label="Timing resistor">
                  {RS.map((x) => (
                    <button key={x} type="button" aria-pressed={r === x} onClick={() => setR(x)}>
                      {si(x, 'Ω')}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.row}>
                <span className={styles.label} style={{margin: 0, minWidth: 80}}>
                  C
                </span>
                <div className={styles.seg} role="group" aria-label="Timing capacitor">
                  {CS.map((x) => (
                    <button key={x} type="button" aria-pressed={c === x} onClick={() => setC(x)}>
                      {si(x, 'F')}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.row}>
                <span className={styles.label} style={{margin: 0, minWidth: 80}}>
                  DSO probe on
                </span>
                <div className={styles.seg} role="group" aria-label="Output observed">
                  {(['square', 'triangle', 'sine'] as Out[]).map((o) => (
                    <button key={o} type="button" aria-pressed={out === o} onClick={() => view(o)}>
                      {o === 'square' ? 'Pin 9' : o === 'triangle' ? 'Pin 3' : 'Pin 2'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div>{scope.screen}</div>
        </div>
        <details className={styles.noPrint} style={{marginTop: '0.6rem'}}>
          <summary className={styles.muted} style={{cursor: 'pointer'}}>
            Scope controls
          </summary>
          {scope.controls}
        </details>
        <div className={clsx(styles.row, styles.noPrint)} style={{marginTop: '0.7rem'}}>
          <label className={styles.field}>
            Calculated f (Hz)
            <input className={styles.input} inputMode="decimal" value={calc} onChange={(e) => setCalc(e.target.value)} />
          </label>
          <label className={styles.field}>
            Measured f (Hz)
            <input className={styles.input} inputMode="decimal" value={meas} onChange={(e) => setMeas(e.target.value)} />
          </label>
          <button type="button" className={clsx(styles.btn, styles.primary)} onClick={record} style={{alignSelf: 'end'}}>
            Note reading
          </button>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {rows.length === 0 ? (
          <Empty>No readings yet.</Empty>
        ) : (
          <Table
            head={['R', 'C', 'Calculated f (Hz)', 'Measured f (Hz)', 'Check']}
            rows={rows.map((x) => [si(x.r, 'Ω'), si(x.c, 'F'), <span className={styles.num}>{x.calc}</span>, <span className={styles.num}>{x.meas}</span>, <Verdict ok={rowOk(x)} />])}
          />
        )}
        <ResetKit
          onReset={() => {
            setRows([]);
            setSeen([]);
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}
