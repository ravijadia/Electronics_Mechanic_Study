import React, {useEffect, useMemo, useRef, useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import {GU_1_7_64, GU_1_7_65} from './gu';
import Multimeter from '../Multimeter';
import XYGraph from '../XYGraph';
import useStoredState from '../useStoredState';
import {useScope} from '../Scope';
import {fgFreq, useFunctionGenerator} from '../FunctionGenerator';
import {si, stats, type Sig} from '../signals';
import {Empty, NoteBox, ResetKit, Section, Table, Verdict, useKitSeed, useRng, type Note} from '../kit';
import {fmtOhms, kitLabel, near} from './parts';
import styles from '../styles.module.css';

const num = (s?: string) => (s && s.trim() !== '' && !Number.isNaN(Number(s)) ? Number(s) : null);
const fmtF = (c: number) => si(c, 'F');

// ---------------------------------------------------------------------------
// 1.7.64 RC time constant
// ---------------------------------------------------------------------------

const RS = [47e3, 68e3, 100e3];
const CS = [100e-6, 220e-6];
const DMM_R = 10e6;
type Pos = 'charge' | 'off' | 'discharge';

interface Pt {
  phase: 'charge' | 'discharge';
  t: number;
  v: number;
}

export function RcTimeConstantLab(): React.JSX.Element {
  const KEY = '1.7.64';
  const [seed, newKit] = useKitSeed(KEY);
  const tol = useRng(seed, (rnd) => ({r: 1 + (rnd() * 2 - 1) * 0.05, c: 0.95 + rnd() * 0.15}));
  const [ri, setRi] = useStoredState(`lab:${KEY}:r`, 2);
  const [ci, setCi] = useStoredState(`lab:${KEY}:c`, 0);
  const [pts, setPts] = useStoredState<Pt[]>(`lab:${KEY}:pts`, []);
  const [ans, setAns] = useStoredState<{calc?: string; graph?: string}>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [vs] = useState(10);
  const [pos, setPos] = useState<Pos>('off');
  const [reversed, setReversed] = useState(false);
  const [damaged, setDamaged] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [fn, setFn] = useState('V20');
  const [note, setNote] = useState<Note>(null);
  const sim = useRef({vc: 0, t: 0, stress: 0});
  const [, tick] = useState(0);

  const R = RS[ri] * tol.r;
  const C = CS[ci] * tol.c;
  const tau = R * C;
  const tauSeen = ((R * DMM_R) / (R + DMM_R)) * C; // the meter loads the capacitor slightly
  const vFinal = (vs * DMM_R) / (R + DMM_R);

  useEffect(() => {
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = ((now - last) / 1000) * speed;
      last = now;
      const s = sim.current;
      if (damaged) return;
      const [target, k] = pos === 'charge' ? [vFinal, tauSeen] : pos === 'discharge' ? [0, tauSeen] : [0, DMM_R * C];
      s.vc = target + (s.vc - target) * Math.exp(-dt / k);
      s.t += dt;
      if (reversed && pos === 'charge') {
        s.stress += dt;
        if (s.stress > 6) {
          setDamaged(true);
          setNote({kind: 'bad', text: <b>Hiss! The electrolytic capacitor is fitted the wrong way round and has bulged. Replace it and fit + to the resistor side.</b>});
        }
      }
      tick((x) => x + 1);
    }, 100);
    return () => window.clearInterval(id);
  }, [pos, speed, damaged, reversed, vFinal, tauSeen, C]);

  const throwSwitch = (p: Pos) => {
    setNote(null);
    setPos(p);
    sim.current.t = 0;
  };
  const change = (f: () => void) => {
    if (pos !== 'off') return setNote({kind: 'warn', text: 'Put the switch to OFF before changing parts.'});
    if (Math.abs(sim.current.vc) > 0.5) return setNote({kind: 'warn', text: 'The capacitor is still charged. Discharge it first.'});
    setNote(null);
    f();
  };

  const vc = damaged ? 0 : sim.current.vc * (reversed ? -1 : 1);
  const text = fn === 'off' ? '' : vc.toFixed(2);
  const t = sim.current.t;

  const noteIt = () => {
    if (fn === 'off') return setNote({kind: 'warn', text: 'Switch the meter on (DC V 20).'});
    if (pos === 'off') return setNote({kind: 'warn', text: 'Switch to CHARGE or DISCHARGE first.'});
    if (damaged) return setNote({kind: 'warn', text: 'Replace the capacitor.'});
    const phase = pos as 'charge' | 'discharge';
    setPts((p) => [...p.filter((x) => !(x.phase === phase && Math.abs(x.t - t) < 0.5)), {phase, t: Math.round(t * 10) / 10, v: Number(text)}]);
    setNote({kind: 'good', text: `${phase === 'charge' ? 'Charging' : 'Discharging'}: t = ${t.toFixed(1)} s, Vc = ${text} V`});
  };

  const charge = pts.filter((p) => p.phase === 'charge').sort((a, b) => a.t - b.t);
  const dis = pts.filter((p) => p.phase === 'discharge').sort((a, b) => a.t - b.t);
  const nominalTau = RS[ri] * CS[ci];
  const calcOk = near(num(ans.calc), nominalTau, 0.01);
  const graphOk = near(num(ans.graph), tauSeen, 0.1);
  const spanOk = (p: Pt[]) => p.length >= 6 && p[p.length - 1].t >= 3 * tau;

  return (
    <PracticalSheet
      number={KEY}
      title="Construct and Test an RC Time Constant Circuit"
      aim="To plot the charging and discharging curves of a capacitor through a resistor and find the time constant τ = R × C."
      apparatus={['DC supply 10 V', 'Resistors 47 kΩ, 68 kΩ, 100 kΩ', 'Electrolytic capacitors 100 µF, 220 µF', 'SPDT switch (charge / off / discharge)', 'Digital multimeter, stopwatch']}
      procedure={[
        'Switch OFF. Choose R and C. Fit the capacitor with + towards the resistor.',
        'Meter on DC V across C. Throw the switch to CHARGE: the stopwatch restarts.',
        'Note Vc every few seconds until it stops rising (about 5 τ).',
        'Throw the switch to DISCHARGE and note Vc again as it falls.',
        'From the charging graph, read the time when Vc = 63.2 % of the supply: that is τ.',
      ]}
      precautions={['Observe capacitor polarity.', 'Discharge the capacitor before changing parts.', 'Start the stopwatch exactly when you throw the switch.']}
      viva={[
        {q: 'Define the time constant.', a: 'τ = R × C seconds. In one τ a capacitor charges to 63.2 % of the supply (or discharges to 36.8 %).'},
        {q: 'How long to charge fully?', a: 'About 5 τ (99.3 %).'},
        {q: 'R = 100 kΩ, C = 100 µF. τ?', a: '100 × 10³ × 100 × 10⁻⁶ = 10 s.'},
        {q: 'What happens if an electrolytic capacitor is reversed?', a: 'Leakage current flows, it heats up, bulges and can burst.'},
      ]}
      steps={[
        {
          label: 'Meter on DC V 20, switch to CHARGE.',
          hint: 'Capacitor + towards R. The stopwatch restarts.',
          done: charge.length > 0 || (fn !== 'off' && pos === 'charge'),
        },
        {
          label: 'Note Vc every few seconds while charging.',
          hint: `Press Note reading. Need 6+ readings over 3 τ. Readings: ${charge.length}.`,
          done: spanOk(charge),
        },
        {
          label: 'Switch to DISCHARGE and note Vc as it falls.',
          hint: `Same again: 6+ readings over 3 τ. Readings: ${dis.length}.`,
          done: spanOk(dis),
        },
        {label: 'Calculate τ = R × C and enter it.', hint: 'R in ohms, C in farads.', done: calcOk},
        {label: 'Read τ from the graph and enter it.', hint: 'Time when Vc = 63.2 % of the supply.', done: graphOk},
        {label: 'Enter your details and print or save the record.', done: printed},
      ]}
      gu={GU_1_7_64}
      onPrinted={(tt) => tt.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div className={styles.kit}>
            <svg viewBox="0 0 520 260" role="img" aria-label="RC circuit: 10 V supply, switch, resistor, capacitor, meter across the capacitor">
              <rect x={14} y={70} width={90} height={120} rx={8} fill="#31414c" stroke="#4d5f6b" />
              <text x={59} y={100} textAnchor="middle" style={kitLabel}>
                DC {vs} V
              </text>
              <path className={styles.wire} d="M104 100 H150 M104 170 H130 V230 H420 V190 M420 130 V60 H330 M256 60 H210" fill="none" />
              {/* SPDT switch: charge (to +) / discharge (to 0 V) */}
              <circle cx={150} cy={100} r={4} fill="var(--lab-wire)" />
              <circle cx={150} cy={170} r={4} fill="var(--lab-wire)" />
              <path className={styles.wire} d="M150 170 V150 H160" fill="none" />
              <circle cx={200} cy={60} r={4} fill="var(--lab-wire)" />
              <line x1={200} y1={60} x2={pos === 'charge' ? 154 : pos === 'discharge' ? 162 : 176} y2={pos === 'charge' ? 100 : pos === 'discharge' ? 150 : 120} stroke="var(--lab-wire)" strokeWidth={3} />
              <path className={styles.wire} d="M200 60 H210" fill="none" />
              <text x={180} y={40} textAnchor="middle" style={kitLabel}>
                S: {pos.toUpperCase()}
              </text>
              {/* R */}
              <rect x={256} y={50} width={74} height={20} rx={4} fill="#e8d7b0" />
              <text x={293} y={44} textAnchor="middle" style={kitLabel}>
                R {fmtOhms(RS[ri])}
              </text>
              {/* C */}
              <rect x={398} y={130} width={44} height={60} rx={6} fill={damaged ? '#5a3a2a' : '#1f3f8f'} />
              {damaged && <path d="M398 132 Q420 118 442 132" fill="#5a3a2a" />}
              <rect x={reversed ? 398 : 432} y={130} width={10} height={60} fill="#c9d6ea" />
              <text x={reversed ? 403 : 437} y={164} textAnchor="middle" style={{fill: '#1f3f8f', fontSize: 12, fontWeight: 800}}>
                −
              </text>
              <text x={460} y={150} style={kitLabel}>
                C {fmtF(CS[ci])}
              </text>
              <text x={460} y={168} style={{...kitLabel, fontSize: 10, fill: '#9fb0ba'}}>
                {reversed ? '+ to 0 V ✗' : '+ to R'}
              </text>
              <circle cx={480} cy={210} r={16} fill="#f2c230" stroke="#c99a10" strokeWidth={2} />
              <text x={480} y={215} textAnchor="middle" style={{fill: '#222', fontWeight: 800, fontSize: 14}}>
                V
              </text>
              <path d="M464 210 H420 M480 194 V120 H420" stroke="#e0352b" strokeWidth={1.5} fill="none" strokeDasharray="3 2" />
            </svg>
          </div>
          <div style={{display: 'grid', gap: '0.6rem', alignContent: 'start'}}>
            <Multimeter
              name="Digital multimeter (across C)"
              fn={fn}
              functions={[
                {fn: 'off', label: 'OFF'},
                {fn: 'V20', label: 'DC V 20'},
              ]}
              text={text}
              unit={fn === 'off' ? '' : 'V'}
              onFunction={setFn}
            />
            <div className={styles.card} role="timer" aria-label="Stopwatch">
              <span className={styles.label} style={{marginTop: 0}}>
                Stopwatch (from last switch)
              </span>
              <b className={styles.num} style={{fontSize: '1.5rem'}}>
                {t.toFixed(1)} s
              </b>
            </div>
            <div className={clsx(styles.seg, styles.noPrint)} role="group" aria-label="Switch position">
              {(['charge', 'off', 'discharge'] as Pos[]).map((p) => (
                <button key={p} type="button" aria-pressed={pos === p} onClick={() => throwSwitch(p)}>
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
            <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} onClick={noteIt}>
              Note reading
            </button>
          </div>
        </div>
        <div className={clsx(styles.controls, styles.noPrint)}>
          <div className={styles.card}>
            <span className={styles.label} style={{marginTop: 0}}>
              Resistor
            </span>
            <div className={styles.seg} role="group" aria-label="Resistor">
              {RS.map((r, k) => (
                <button key={r} type="button" aria-pressed={ri === k} onClick={() => change(() => (setRi(k), setPts([])))}>
                  {fmtOhms(r)}
                </button>
              ))}
            </div>
            <span className={styles.label}>Capacitor</span>
            <div className={styles.seg} role="group" aria-label="Capacitor">
              {CS.map((c, k) => (
                <button key={c} type="button" aria-pressed={ci === k} onClick={() => change(() => (setCi(k), setPts([])))}>
                  {fmtF(c)}
                </button>
              ))}
              <button type="button" onClick={() => change(() => setReversed((x) => !x))}>
                Turn C round
              </button>
              {damaged && (
                <button type="button" onClick={() => (setDamaged(false), setReversed(false), (sim.current = {vc: 0, t: 0, stress: 0}), setNote({kind: 'info', text: 'New capacitor fitted.'}))}>
                  Replace C
                </button>
              )}
            </div>
          </div>
          <div className={styles.card}>
            <span className={styles.label} style={{marginTop: 0}}>
              Clock speed
            </span>
            <div className={styles.seg} role="group" aria-label="Clock speed">
              {[1, 2, 5].map((x) => (
                <button key={x} type="button" aria-pressed={speed === x} onClick={() => setSpeed(x)}>
                  ×{x}
                </button>
              ))}
            </div>
            <p className={styles.muted} style={{margin: '0.4rem 0 0'}}>
              Changing R or C clears the readings.
            </p>
          </div>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {pts.length === 0 ? (
          <Empty>No readings yet.</Empty>
        ) : (
          <div className={styles.twoCol}>
            <Table head={['Charging t (s)', 'Vc (V)']} rows={charge.map((p) => [p.t.toFixed(1), p.v.toFixed(2)])} />
            <Table head={['Discharging t (s)', 'Vc (V)']} rows={dis.map((p) => [p.t.toFixed(1), p.v.toFixed(2)])} />
          </div>
        )}
        {pts.length > 1 && (
          <XYGraph
            series={[
              {id: 'c', label: 'Charging', color: 'var(--s1)', marker: 'circle', points: charge.map((p) => ({x: p.t, y: p.v}))},
              {id: 'd', label: 'Discharging', color: 'var(--s2)', marker: 'square', points: dis.map((p) => ({x: p.t, y: p.v}))},
            ]}
            xLabel="Time (s)"
            yLabel="Vc (V)"
            xUnit="s"
            yUnit="V"
            yRange={[0, 10]}
          />
        )}
      </Section>
      <Section title="Result">
        <Table
          head={['', 'Value (s)', 'Check']}
          rows={[
            [
              `τ = R × C = ${fmtOhms(RS[ri])} × ${fmtF(CS[ci])}`,
              <input className={styles.input} style={{maxWidth: '6rem'}} inputMode="decimal" aria-label="Calculated time constant in seconds" value={ans.calc ?? ''} onChange={(e) => setAns((a) => ({...a, calc: e.target.value}))} />,
              ans.calc ? <Verdict ok={calcOk} /> : '–',
            ],
            [
              'τ from graph (Vc = 6.32 V)',
              <input className={styles.input} style={{maxWidth: '6rem'}} inputMode="decimal" aria-label="Time constant from graph in seconds" value={ans.graph ?? ''} onChange={(e) => setAns((a) => ({...a, graph: e.target.value}))} />,
              ans.graph ? <Verdict ok={graphOk} no="✗ read the graph again" /> : '–',
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
// 1.7.65 RC differentiator: triangle in, square out
// ---------------------------------------------------------------------------

/** Steady-state output of a first-order high-pass (RC differentiator). */
export function highPass(input: Sig, rc: number): Sig {
  const T = input.period;
  if (!T) return {fn: () => 0, period: null};
  const n = 2000;
  const dt = T / n;
  const a = rc / (rc + dt);
  const periods = Math.min(300, Math.ceil((6 * rc) / T) + 2);
  let y = 0;
  let xPrev = input.fn(0);
  const out = new Float64Array(n);
  for (let p = 0; p < periods; p++) {
    for (let k = 0; k < n; k++) {
      const x = input.fn(k * dt);
      y = a * (y + x - xPrev);
      xPrev = x;
      out[k] = y;
    }
  }
  return {
    fn: (t) => {
      const ph = (((t / T) % 1) + 1) % 1;
      return out[Math.min(n - 1, Math.floor(ph * n))];
    },
    period: T,
  };
}

const DR = [1e3, 10e3, 100e3];
const DC = [10e-9, 100e-9, 1e-6];

interface DRow {
  r: number;
  c: number;
  f: number;
  wave: string;
  vin: string;
  vout: string;
  vinTrue: number;
  voutTrue: number;
  shape: string;
}

function shapeOf(wave: string, rcf: number): string {
  if (wave === 'triangle') return rcf <= 0.05 ? 'square' : rcf < 0.5 ? 'rounded square' : 'nearly triangle';
  if (wave === 'square') return rcf <= 0.05 ? 'spikes' : rcf < 0.5 ? 'tilted pulses' : 'nearly square';
  return 'sine (shifted)';
}

export function DifferentiatorLab(): React.JSX.Element {
  const KEY = '1.7.65';
  const [seed, newKit] = useKitSeed(KEY);
  const tol = useRng(seed, (rnd) => ({r: 1 + (rnd() * 2 - 1) * 0.05, c: 1 + (rnd() * 2 - 1) * 0.1}));
  const [ri, setRi] = useState(1);
  const [ci, setCi] = useState(2);
  const [rows, setRows] = useStoredState<DRow[]>(`lab:${KEY}:rows`, []);
  const [ans, setAns] = useStoredState<{vin?: string; vout?: string; calc?: string}>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);
  const fg = useFunctionGenerator({wave: 'sine', range: 100, dial: 1, amp: 4});
  const rc = DR[ri] * tol.r * DC[ci] * tol.c;
  // The generator hands out a new signal object each render, so key on its settings.
  const out = useMemo(() => highPass(fg.signal, rc), [JSON.stringify(fg.state), rc]); // eslint-disable-line react-hooks/exhaustive-deps
  const scope = useScope('cro', {ch1: fg.signal, ch2: out}, {ch1: {vdiv: 1, pos: 2, coupling: 'DC', on: true}, ch2: {vdiv: 1, pos: -2, coupling: 'DC', on: true}, display: 'DUAL', tdiv: 2e-3});

  const f = fgFreq(fg.state);
  const rcf = rc * f;
  const sIn = stats(fg.signal);
  const sOut = stats(out);

  const noteRow = () => {
    if (!fg.state.on) return setNote({kind: 'warn', text: 'Function generator output is OFF.'});
    const vin = num(ans.vin);
    const vout = num(ans.vout);
    if (vin == null || vout == null) return setNote({kind: 'warn', text: 'Read Vin p-p and Vout p-p from the CRO first.'});
    const row: DRow = {r: DR[ri], c: DC[ci], f, wave: fg.state.wave, vin: ans.vin!, vout: ans.vout!, vinTrue: sIn.pp, voutTrue: sOut.pp, shape: shapeOf(fg.state.wave, rcf)};
    setRows((r) => [...r, row]);
    const ok = near(vin, sIn.pp, 0.1) && near(vout, sOut.pp, 0.1);
    setNote(ok ? {kind: 'good', text: `Noted: output is ${row.shape}.`} : {kind: 'warn', text: 'Noted, but a Vpp reading is off by more than 10 %. Count the divisions again.'});
  };

  const readOk = (r: DRow) => near(num(r.vin), r.vinTrue, 0.1) && near(num(r.vout), r.voutTrue, 0.1);
  const squares = rows.filter((r) => r.wave === 'triangle' && r.shape === 'square' && readOk(r));
  const last = squares[squares.length - 1];
  const calc = last ? 4 * last.r * last.c * last.f * last.vinTrue : null;
  const calcOk = calc != null && near(num(ans.calc), 4 * last.r * last.c * last.f * num(last.vin)!, 0.03);

  return (
    <PracticalSheet
      number={KEY}
      title="RC Differentiator: Convert a Triangular Wave into a Square Wave"
      aim="To build an RC differentiator, feed it a triangular wave and observe a square-wave output on the CRO, and see how RC and frequency change the output."
      apparatus={['Function generator', 'Dual-trace CRO', 'Resistors 1 kΩ, 10 kΩ, 100 kΩ', 'Capacitors 10 nF, 100 nF, 1 µF']}
      procedure={[
        'Connect C in series from the generator, R from the output to ground.',
        'CH1 on the input, CH2 across R (output).',
        'Set a triangular wave. Choose R and C so that RC is much smaller than the period (RC ≤ T/20).',
        'Read Vin p-p and Vout p-p on the CRO and note them.',
        'Try a large RC and a square-wave input, and note the output shape.',
        'Calculate Vout p-p = 4 × R × C × f × Vin p-p and compare.',
      ]}
      precautions={['Common ground for the generator and both CRO channels.', 'Keep the generator amplitude low.', 'Use DC coupling to see the true output.']}
      viva={[
        {q: 'Why does a triangle become a square?', a: 'The differentiator output is proportional to the slope of the input. A triangle has a constant up-slope and a constant down-slope, so the output has two constant levels.'},
        {q: 'Condition for a good differentiator?', a: 'RC must be much smaller than the period of the input (about T/10 or less).'},
        {q: 'What does a differentiator give for a square-wave input?', a: 'Sharp positive and negative spikes at each edge.'},
        {q: 'Where are differentiators used?', a: 'To produce trigger pulses from square waves, e.g. in timing and pulse circuits.'},
      ]}
      steps={[
        {
          label: 'Set the generator to a triangular wave, output ON.',
          hint: 'CH1 shows the input, CH2 the output.',
          done: rows.length > 0 || (fg.state.on && fg.state.wave === 'triangle'),
        },
        {
          label: 'Choose R and C so that RC is much smaller than T.',
          hint: 'RC ≤ T/20 gives a square output.',
          done: squares.length > 0 || (fg.state.on && fg.state.wave === 'triangle' && rcf <= 0.05),
        },
        {label: 'Read Vin and Vout p-p on the CRO and note them.', hint: 'Enter both readings, then Note reading.', done: squares.length > 0},
        {
          label: 'Choose a large RC and note the output.',
          hint: 'Output becomes nearly triangle.',
          done: rows.some((r) => r.wave === 'triangle' && r.shape === 'nearly triangle'),
        },
        {
          label: 'Switch to a square wave with a small RC and note it.',
          hint: 'Output shows sharp spikes.',
          done: rows.some((r) => r.wave === 'square' && r.shape === 'spikes'),
        },
        {label: 'Calculate Vout p-p and enter it.', hint: 'Vout p-p = 4 × R × C × f × Vin p-p.', done: calcOk},
        {label: 'Enter your details and print or save the record.', done: printed},
      ]}
      gu={GU_1_7_65}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.kit} style={{marginBottom: '0.6rem'}}>
          <svg viewBox="0 0 520 150" role="img" aria-label={`Differentiator: generator, C ${fmtF(DC[ci])} in series, R ${fmtOhms(DR[ri])} to ground, CH1 on input, CH2 on output`}>
            <circle cx={50} cy={75} r={26} fill="#31414c" stroke="#4d5f6b" />
            <text x={50} y={80} textAnchor="middle" style={kitLabel}>
              FG
            </text>
            <path className={styles.wire} d="M76 75 H180 M206 75 H330 V90 M330 130 V140 H50 V101" fill="none" />
            <path d="M180 55 V95 M206 55 V95" stroke="var(--lab-wire)" strokeWidth={4} />
            <text x={193} y={45} textAnchor="middle" style={kitLabel}>
              C {fmtF(DC[ci])}
            </text>
            <rect x={320} y={90} width={20} height={40} rx={3} fill="#e8d7b0" />
            <text x={350} y={115} style={kitLabel}>
              R {fmtOhms(DR[ri])}
            </text>
            <circle cx={120} cy={75} r={5} fill="#7dff9e" />
            <text x={120} y={60} textAnchor="middle" style={{...kitLabel, fill: '#7dff9e'}}>
              CH1
            </text>
            <circle cx={280} cy={75} r={5} fill="#7dff9e" />
            <text x={280} y={60} textAnchor="middle" style={{...kitLabel, fill: '#7dff9e'}}>
              CH2
            </text>
            <text x={430} y={60} style={{...kitLabel, fontSize: 12}}>
              RC = {si(DR[ri] * DC[ci], 's')}
            </text>
            <text x={430} y={80} style={{...kitLabel, fontSize: 12, fill: '#9fb0ba'}}>
              T = {si(1 / f, 's')}
            </text>
          </svg>
        </div>
        <div className={clsx(styles.controls, styles.noPrint)} style={{marginTop: 0}}>
          <div className={styles.card}>
            <span className={styles.label} style={{marginTop: 0}}>
              R
            </span>
            <div className={styles.seg} role="group" aria-label="Resistor">
              {DR.map((r, k) => (
                <button key={r} type="button" aria-pressed={ri === k} onClick={() => setRi(k)}>
                  {fmtOhms(r)}
                </button>
              ))}
            </div>
            <span className={styles.label}>C</span>
            <div className={styles.seg} role="group" aria-label="Capacitor">
              {DC.map((c, k) => (
                <button key={c} type="button" aria-pressed={ci === k} onClick={() => setCi(k)}>
                  {fmtF(c)}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.card}>
            <span className={styles.label} style={{marginTop: 0}}>
              Read from the CRO (p-p)
            </span>
            <div className={styles.fields}>
              <label className={styles.field}>
                Vin (V)
                <input className={styles.input} inputMode="decimal" value={ans.vin ?? ''} onChange={(e) => setAns((a) => ({...a, vin: e.target.value}))} />
              </label>
              <label className={styles.field}>
                Vout (V)
                <input className={styles.input} inputMode="decimal" value={ans.vout ?? ''} onChange={(e) => setAns((a) => ({...a, vout: e.target.value}))} />
              </label>
            </div>
            <button type="button" className={clsx(styles.btn, styles.primary)} style={{marginTop: '0.5rem'}} onClick={noteRow}>
              Note reading
            </button>
          </div>
        </div>
        <div className={styles.controls}>
          <div>{scope.view}</div>
          <div>{fg.view}</div>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {rows.length === 0 ? (
          <Empty>No readings yet.</Empty>
        ) : (
          <Table
            head={['R', 'C', 'f', 'Input', 'Vin p-p', 'Vout p-p', 'Output shape', 'Check']}
            rows={rows.map((r) => [fmtOhms(r.r), fmtF(r.c), si(r.f, 'Hz'), r.wave, `${r.vin} V`, `${r.vout} V`, r.shape, <Verdict ok={readOk(r)} />])}
          />
        )}
      </Section>
      <Section title="Result">
        {last ? (
          <Table
            head={['Vout p-p = 4 × R × C × f × Vin p-p', 'Your value (V)', 'Measured', 'Check']}
            rows={[
              [
                `4 × ${fmtOhms(last.r)} × ${fmtF(last.c)} × ${si(last.f, 'Hz')} × ${last.vin} V`,
                <input className={styles.input} style={{maxWidth: '6rem'}} inputMode="decimal" aria-label="Calculated output peak to peak in volts" value={ans.calc ?? ''} onChange={(e) => setAns((a) => ({...a, calc: e.target.value}))} />,
                `${last.vout} V`,
                ans.calc ? <Verdict ok={calcOk} /> : '–',
              ],
            ]}
          />
        ) : (
          <Empty>Note a triangle-in, square-out reading first.</Empty>
        )}
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

