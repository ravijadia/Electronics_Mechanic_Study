import React, {useMemo, useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import Multimeter from '../Multimeter';
import useStoredState from '../useStoredState';
import {Knob, useScope} from '../Scope';
import {si, stats, type Sig} from '../signals';
import {Empty, NoteBox, ResetKit, Section, Table, Verdict, useKitSeed, useRng, type Note} from '../kit';
import {kitLabel, near} from '../m07/parts';
import styles from '../styles.module.css';

const num = (s?: string) => (s && s.trim() !== '' && !Number.isNaN(Number(s)) ? Number(s) : null);
const inp = (label: string, value: string | undefined, onChange: (v: string) => void, w = '5rem') => (
  <input className={styles.input} style={{maxWidth: w}} inputMode="decimal" aria-label={label} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
);
const F = 50;
const W = 2 * Math.PI * F;
const flat: Sig = {fn: () => 0, period: null};
const deg = (r: number) => (r * 180) / Math.PI;

function Lamp({x, y, level, label}: {x: number; y: number; level: number; label: string}) {
  return (
    <g>
      {level > 0.02 && <circle cx={x} cy={y} r={34} fill="#ffd34d" opacity={0.35 * level} />}
      <circle cx={x} cy={y} r={20} fill={level > 0.02 ? `rgba(255, 211, 77, ${0.35 + 0.65 * level})` : '#4a5560'} stroke="#9aa3a8" strokeWidth={2} />
      <path d={`M${x - 11} ${y - 11} L${x + 11} ${y + 11} M${x + 11} ${y - 11} L${x - 11} ${y + 11}`} stroke="#5a4a10" strokeWidth={2} />
      <text x={x} y={y + 38} textAnchor="middle" style={{...kitLabel, fontSize: 10}}>
        {label}
      </text>
    </g>
  );
}

// ---------------------------------------------------------------------------
// 1.10.100 UJT relaxation oscillator
// ---------------------------------------------------------------------------

const VBB = 12;
const VV = 2;
const IV = 0.004;
const R_FIX = 2200;
const POT = 100e3;
const UC = [0.1e-6, 0.47e-6, 1e-6];

/** Emitter sawtooth and B1 pulses of a UJT oscillator. */
export function ujtSignals(r: number, c: number, eta: number): {ve: Sig; vb1: Sig; T: number; vp: number} | null {
  const vp = eta * VBB + 0.6;
  if ((VBB - VV) / r > IV) return null; // latched on: no oscillation
  const T = r * c * Math.log((VBB - VV) / (VBB - vp));
  const td = 100 * c * 3;
  return {
    T,
    vp,
    ve: {fn: (t) => {
      const tt = ((t % T) + T) % T;
      return VBB - (VBB - VV) * Math.exp(-tt / (r * c));
    }, period: T},
    vb1: {fn: (t) => {
      const tt = ((t % T) + T) % T;
      return 0.4 + (vp - VV) * 0.8 * Math.exp(-tt / td) * (tt < 6 * td ? 1 : 0);
    }, period: T},
  };
}

interface URow {
  pot: number;
  c: number;
  T: number;
  vp: number;
  tm?: string;
  fc?: string;
}

export function UjtOscLab(): React.JSX.Element {
  const KEY = '1.10.100';
  const [seed, newKit] = useKitSeed(KEY);
  const eta = useRng(seed, (rnd) => 0.56 + rnd() * 0.14);
  const [pot, setPot] = useState(50);
  const [ci, setCi] = useState(0);
  const [power, setPower] = useState(false);
  const [rows, setRows] = useStoredState<URow[]>(`lab:${KEY}:rows`, []);
  const [ans, setAns] = useStoredState<{vp?: string; eta?: string}>(`lab:${KEY}:ans`, {});
  const [latchSeen, setLatchSeen] = useStoredState(`lab:${KEY}:latch`, false);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);
  const r = R_FIX + (POT * pot) / 100;
  const s = useMemo(() => (power ? ujtSignals(r, UC[ci], eta) : null), [power, r, ci, eta]);
  const scope = useScope('cro', {ch1: s?.ve ?? (power ? {fn: () => VV, period: null} : flat), ch2: s?.vb1 ?? flat}, {ch1: {vdiv: 2, pos: 0, coupling: 'DC', on: true}, ch2: {vdiv: 2, pos: -3, coupling: 'DC', on: true}, display: 'DUAL', tdiv: 2e-3});

  const addRow = () => {
    if (!power) return setNote({kind: 'warn', text: 'Supply is off.'});
    if (!s) {
      setLatchSeen(true);
      return setNote({kind: 'warn', text: 'No oscillation: R is so small that the UJT stays ON (latched). Increase R.'});
    }
    setRows((x) => [...x.filter((y) => !(y.pot === pot && y.c === UC[ci])), {pot, c: UC[ci], T: s.T, vp: s.vp}]);
    setNote({kind: 'good', text: 'Row added. Read T on the CRO.'});
  };
  const rowOk = (x: URow) => {
    const e = num(ans.eta);
    const rr = R_FIX + (POT * x.pot) / 100;
    return near(num(x.tm) != null ? num(x.tm)! / 1000 : null, x.T, 0.06) && e != null && near(num(x.fc), 1 / (rr * x.c * Math.log(1 / (1 - e))), 0.04);
  };
  const vpTrue = eta * VBB + 0.6;
  const vpOk = near(num(ans.vp), vpTrue, 0.06);
  const etaOk = num(ans.vp) != null && near(num(ans.eta), (num(ans.vp)! - 0.6) / VBB, 0.03);

  return (
    <PracticalSheet
      number={KEY}
      title="UJT Relaxation (Free-Running) Oscillator"
      aim="To build a UJT relaxation oscillator, observe the emitter sawtooth and base-1 pulses, find the intrinsic stand-off ratio η and change the frequency with R and C."
      apparatus={['UJT 2N2646, VBB = 12 V', 'R: 2.2 kΩ + 100 kΩ pot; C: 0.1, 0.47, 1 µF', 'R1 = 100 Ω (B1), R2 = 470 Ω (B2)', 'Dual-trace CRO']}
      procedure={[
        'CH1 on the emitter (sawtooth), CH2 on B1 (pulses).',
        'Read the peak of the sawtooth: Vp. η = (Vp − 0.6) ÷ VBB.',
        'For several pot settings and capacitors, add a row and read the period T.',
        'Calculate f = 1 ÷ (R C ln(1 ÷ (1 − η))) with your η.',
        'Turn the pot to 0: watch what happens.',
      ]}
      precautions={['Do not reduce R below the value that keeps the UJT oscillating.', 'Use DC coupling on the CRO to read Vp.']}
      viva={[
        {q: 'What is η (intrinsic stand-off ratio)?', a: 'The fraction of VBB at which the emitter fires: Vp = η VBB + VD. Typically 0.56–0.75.'},
        {q: 'Why does the UJT stop oscillating when R is too small?', a: 'The current through R exceeds the valley current, so the UJT stays on and C never recharges.'},
        {q: 'Uses of the UJT oscillator?', a: 'Triggering SCRs and TRIACs, timing and sawtooth generators.'},
      ]}
      tasks={[
        {label: 'Peak voltage Vp and η.', done: vpOk && etaOk},
        {label: 'Three settings: T measured, f calculated.', done: rows.filter(rowOk).length >= 3},
        {label: 'See the UJT latch at minimum R.', done: latchSeen},
        {label: 'Print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div>{scope.view}</div>
          <div className={clsx(styles.card, styles.noPrint)} style={{alignSelf: 'start'}}>
            <label className={styles.knobLabel} style={{display: 'block'}}>
              POT: {pot} % (R = {si(R_FIX + (POT * pot) / 100, 'Ω')})
              <input className={styles.range} type="range" min={0} max={100} step={10} value={pot} onChange={(e) => setPot(Number(e.target.value))} />
            </label>
            <span className={styles.label}>Timing capacitor</span>
            <div className={styles.seg} role="group" aria-label="Timing capacitor">
              {UC.map((c, k) => (
                <button key={c} type="button" aria-pressed={ci === k} onClick={() => (power ? setNote({kind: 'warn', text: 'Switch off before changing C.'}) : setCi(k))}>
                  {si(c, 'F')}
                </button>
              ))}
            </div>
            <div className={styles.seg} role="group" aria-label="Actions" style={{marginTop: '0.6rem'}}>
              <button type="button" aria-pressed={power} onClick={() => (setPower((p) => !p), setNote(null))}>
                12 V {power ? 'ON' : 'OFF'}
              </button>
              <button type="button" onClick={addRow}>
                Add row
              </button>
            </div>
          </div>
        </div>
        <NoteBox note={note} status={power && !s ? {kind: 'warn', text: 'UJT latched: no oscillation.'} : null} />
      </Section>
      <Section title="Observation table">
        {rows.length === 0 ? (
          <Empty>No rows yet.</Empty>
        ) : (
          <Table
            head={['Pot', 'R', 'C', 'T measured (ms)', 'f calculated (Hz)', 'Check']}
            rows={rows.map((x, k) => {
              const set = (p: Partial<URow>) => setRows((y) => y.map((z, j) => (j === k ? {...z, ...p} : z)));
              return [`${x.pot} %`, si(R_FIX + (POT * x.pot) / 100, 'Ω'), si(x.c, 'F'), inp(`Row ${k + 1} period`, x.tm, (v) => set({tm: v})), inp(`Row ${k + 1} frequency`, x.fc, (v) => set({fc: v})), x.tm && x.fc ? <Verdict ok={rowOk(x)} /> : '–'];
            })}
          />
        )}
      </Section>
      <Section title="Result">
        <Table
          head={['', 'Your value', 'Check']}
          rows={[
            ['Peak voltage Vp (V)', inp('Peak voltage', ans.vp, (v) => setAns((a) => ({...a, vp: v}))), ans.vp ? <Verdict ok={vpOk} /> : '–'],
            ['η = (Vp − 0.6) ÷ 12', inp('Stand-off ratio', ans.eta, (v) => setAns((a) => ({...a, eta: v}))), ans.eta ? <Verdict ok={etaOk} /> : '–'],
          ]}
        />
        <ResetKit
          onReset={() => {
            setRows([]);
            setAns({});
            setLatchSeen(false);
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// 1.10.98 SCR controlled rectifier with UJT triggering
// ---------------------------------------------------------------------------

const V_AC = 24;
const R_LAMP = 115;
const C_TRIG = 0.1e-6;
const R_MIN = 10e3;

interface SRow {
  pot: number;
  alpha: number;
  vdc: number;
  am?: string;
  vcalc?: string;
}

export function ScrUjtLab(): React.JSX.Element {
  const KEY = '1.10.98';
  const [seed, newKit] = useKitSeed(KEY);
  const eta = useRng(seed, (rnd) => 0.58 + rnd() * 0.1);
  const [pot, setPot] = useState(30);
  const [gate, setGate] = useState(true);
  const [power, setPower] = useState(false);
  const [fn, setFn] = useState('off');
  const [rows, setRows] = useStoredState<SRow[]>(`lab:${KEY}:rows`, []);
  const [offSeen, setOffSeen] = useStoredState(`lab:${KEY}:off`, false);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);

  const vm = V_AC * Math.SQRT2;
  const r = R_MIN + (100e3 * pot) / 100;
  const tFire = r * C_TRIG * Math.log(1 / (1 - eta));
  const alpha = tFire * W; // rad after the start of the + half cycle
  const fires = power && gate && alpha < Math.PI - 0.05;
  const supply: Sig = {fn: (t) => (power ? vm * Math.sin(W * t) : 0), period: 1 / F};
  const load: Sig = useMemo(
    () => ({
      fn: (t) => {
        const ph = ((W * t) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
        return fires && ph >= alpha && ph < Math.PI ? vm * Math.sin(ph) - 1 : 0;
      },
      period: 1 / F,
    }),
    [fires, alpha, vm],
  );
  const scope = useScope('cro', {ch1: supply, ch2: load}, {ch1: {vdiv: 20, pos: 1, coupling: 'DC', on: true}, ch2: {vdiv: 20, pos: -2, coupling: 'DC', on: true}, display: 'DUAL', tdiv: 2e-3});
  const vdc = stats(load).mean;
  const lampLevel = fires ? Math.min(1, (stats(load).rms / (vm / 2)) ** 2) : 0;
  const text = fn === 'off' ? '' : fn === 'dcv' ? vdc.toFixed(2) : '';

  const noteIt = () => {
    if (!power) return setNote({kind: 'warn', text: 'Supply is off.'});
    if (fn !== 'dcv') return setNote({kind: 'warn', text: 'Meter on DC V across the lamp.'});
    if (!fires) {
      setOffSeen(true);
      return setNote({kind: 'info', text: gate ? 'Lamp off: the trigger comes too late (after 180°), so the SCR never fires.' : 'Lamp off: no gate pulse, so the SCR never turns on.'});
    }
    setRows((x) => [...x.filter((y) => y.pot !== pot), {pot, alpha: deg(alpha), vdc}].sort((a, b) => a.pot - b.pot));
    setNote({kind: 'good', text: `Pot ${pot} %: Vdc = ${vdc.toFixed(2)} V. Read α on the CRO.`});
  };
  const rowOk = (x: SRow) => {
    const a = num(x.am);
    return a != null && Math.abs(a - x.alpha) <= 8 && near(num(x.vcalc), (vm / (2 * Math.PI)) * (1 + Math.cos((a * Math.PI) / 180)), 0.03);
  };

  return (
    <PracticalSheet
      number={KEY}
      title="SCR Phase Control Using UJT Triggering"
      aim="To control the power to a lamp with an SCR half-wave controlled rectifier triggered by a UJT, measure the firing angle α and compare the DC output with Vdc = Vm (1 + cos α) ÷ 2π."
      apparatus={['Transformer 230 V / 24 V', 'SCR TYN612, UJT 2N2646, pulse transformer', 'Zener-synchronised UJT supply, R = 10 kΩ + 100 kΩ pot, C = 0.1 µF', '24 V 5 W lamp', 'CRO, digital multimeter']}
      procedure={[
        'CH1: supply. CH2: lamp voltage. Switch on.',
        'Set the pot. Read the firing angle α: (divisions from the start of the half cycle to the jump) ÷ (divisions for a full cycle) × 360°.',
        'Measure Vdc across the lamp. Note the row.',
        'Calculate Vdc = Vm (1 + cos α) ÷ 2π, Vm = 24 × √2.',
        'Turn the pot to maximum: the lamp goes off.',
      ]}
      precautions={['Keep the CRO ground on the circuit ground (transformer secondary), never on mains.', 'Check the SCR pins (K A G) before switching on.', 'The SCR body gets hot at full power.']}
      viva={[
        {q: 'What is the firing angle?', a: 'The angle in each half cycle at which the SCR is triggered.'},
        {q: 'How does the SCR turn off?', a: 'When the anode current falls to zero at the end of the positive half cycle (natural commutation).'},
        {q: 'Why is the UJT supply synchronised to the mains?', a: 'So the firing delay is measured from the start of every half cycle and stays the same each cycle.'},
        {q: 'Why does the lamp go off at maximum R?', a: 'The UJT fires after 180°, when the SCR is already reverse biased.'},
      ]}
      tasks={[
        {label: 'Four settings: α from CRO, Vdc measured and calculated.', done: rows.filter(rowOk).length >= 4},
        {label: 'See the lamp go off (no firing).', done: offSeen},
        {label: 'Print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div className={styles.kit}>
            <svg viewBox="0 0 320 200" role="img" aria-label="SCR circuit with lamp and UJT trigger">
              <path className={styles.wire} d="M30 40 H120 M160 40 H230 V70 M230 130 V170 H30 M30 40 V60 M30 150 V170" fill="none" />
              <circle cx={30} cy={105} r={24} fill="#31414c" stroke="#4d5f6b" />
              <text x={30} y={110} textAnchor="middle" style={kitLabel}>
                24 V~
              </text>
              <Lamp x={140} y={40} level={lampLevel} label="lamp" />
              <path d="M218 112 H242 L230 88 Z" fill="#e9eef0" />
              <path d="M218 88 H242 M236 92 L256 110" stroke="#e9eef0" strokeWidth={3} />
              <text x={250} y={86} style={{...kitLabel, fontSize: 10}}>
                SCR
              </text>
              <rect x={250} y={110} width={56} height={44} rx={6} fill="#2c3a44" stroke="#4d5f6b" />
              <text x={278} y={130} textAnchor="middle" style={{...kitLabel, fontSize: 10}}>
                UJT
              </text>
              <text x={278} y={145} textAnchor="middle" style={{...kitLabel, fontSize: 9, fill: '#9fb0ba'}}>
                trigger
              </text>
              {!gate && <path d="M246 100 L262 116" stroke="#ff8c1a" strokeWidth={3} />}
            </svg>
          </div>
          <div style={{display: 'grid', gap: '0.6rem', alignContent: 'start'}}>
            <Multimeter
              name="Digital multimeter (across lamp)"
              fn={fn}
              functions={[
                {fn: 'off', label: 'OFF'},
                {fn: 'dcv', label: 'DC V 200'},
              ]}
              text={text}
              unit={fn === 'off' ? '' : 'V DC'}
              onFunction={(f) => (setNote(null), setFn(f))}
            />
            <div className={clsx(styles.card, styles.noPrint)}>
              <label className={styles.knobLabel} style={{display: 'block'}}>
                FIRING POT: {pot} %
                <input className={styles.range} type="range" min={0} max={100} step={10} value={pot} onChange={(e) => setPot(Number(e.target.value))} />
              </label>
              <div className={styles.seg} role="group" aria-label="Actions" style={{marginTop: '0.4rem'}}>
                <button type="button" aria-pressed={power} onClick={() => (setPower((p) => !p), setNote(null))}>
                  Supply {power ? 'ON' : 'OFF'}
                </button>
                <button type="button" aria-pressed={!gate} onClick={() => setGate((g) => !g)}>
                  Gate lead {gate ? 'connected' : 'removed'}
                </button>
              </div>
            </div>
            <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} onClick={noteIt}>
              Note reading
            </button>
          </div>
        </div>
        <div style={{marginTop: '0.6rem'}}>{scope.view}</div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {rows.length === 0 ? (
          <Empty>No rows yet.</Empty>
        ) : (
          <Table
            head={['Pot', 'α from CRO (°)', 'Vdc measured (V)', 'Vdc = Vm (1 + cos α) ÷ 2π', 'Check']}
            rows={rows.map((x, k) => {
              const set = (p: Partial<SRow>) => setRows((y) => y.map((z, j) => (j === k ? {...z, ...p} : z)));
              return [`${x.pot} %`, inp(`Row ${k + 1} firing angle`, x.am, (v) => set({am: v})), x.vdc.toFixed(2), inp(`Row ${k + 1} calculated Vdc`, x.vcalc, (v) => set({vcalc: v})), x.am && x.vcalc ? <Verdict ok={rowOk(x)} /> : '–'];
            })}
          />
        )}
        <ResetKit
          onReset={() => {
            setRows([]);
            setOffSeen(false);
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// 1.10.99 TRIAC – DIAC lamp dimmer
// ---------------------------------------------------------------------------

const V_MAINS = 230;
const C_DIM = 0.1e-6;
const R_DIM_FIX = 10e3;
const POT_DIM = 470e3;
const V_BO = 32;

/** Firing angle (rad) of a DIAC–RC trigger, or null if it never fires. */
export function dimmerAlpha(r: number, vs: number): number | null {
  const x = W * r * C_DIM;
  const vcPk = (vs * Math.SQRT2) / Math.sqrt(1 + x * x);
  if (vcPk < V_BO) return null;
  const lag = Math.atan(x);
  // vc = Vcpk sin(θ − lag); fires when it reaches V_BO after the zero crossing.
  const a = lag + Math.asin(V_BO / vcPk);
  return a < Math.PI - 0.02 ? a : null;
}

interface DRow {
  pot: number;
  alpha: number | null;
  vl: number;
  am?: string;
  vc?: string;
}

export function DimmerLab(): React.JSX.Element {
  const KEY = '1.10.99';
  const [seed, newKit] = useKitSeed(KEY);
  const vs = useRng(seed, (rnd) => Math.round(225 + rnd() * 12));
  const [pot, setPot] = useState(30);
  const [power, setPower] = useState(false);
  const [probe, setProbe] = useState<'diff' | 'plain'>('diff');
  const [mcbTrip, setMcbTrip] = useState(false);
  const [fn, setFn] = useState('off');
  const [rows, setRows] = useStoredState<DRow[]>(`lab:${KEY}:rows`, []);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);

  const r = R_DIM_FIX + (POT_DIM * pot) / 100;
  const a = dimmerAlpha(r, vs);
  const live = power && !mcbTrip;
  const vm = vs * Math.SQRT2;
  const lampV: Sig = useMemo(
    () => ({
      fn: (t) => {
        if (!live || a == null) return 0;
        const ph = ((W * t) % Math.PI + Math.PI) % Math.PI;
        return ph >= a ? vm * Math.sin(W * t) : 0;
      },
      period: 1 / F,
    }),
    [live, a, vm],
  );
  const st = stats(lampV);
  const vrms = st.rms;
  const level = Math.min(1, (vrms / vs) ** 2);
  const probeDiv: Sig = {fn: (t) => lampV.fn(t) / 100, period: 1 / F};
  const scope = useScope('cro', {ch1: probe === 'diff' && live ? probeDiv : flat}, {ch1: {vdiv: 1, pos: 0, coupling: 'DC', on: true}, tdiv: 2e-3});
  const text = fn === 'off' ? '' : live ? vrms.toFixed(0) : '0';

  const power1 = () => {
    if (power) return (setPower(false), setNote(null));
    if (mcbTrip) setMcbTrip(false);
    if (probe === 'plain') {
      setMcbTrip(true);
      return setNote({kind: 'bad', text: <b>Bang! The CRO probe’s ground clip was on a live point. Mains shorted through the CRO earth: the MCB tripped. Use an isolated (differential) probe.</b>});
    }
    setPower(true);
    setNote(null);
  };
  const noteIt = () => {
    if (!live) return setNote({kind: 'warn', text: 'Supply is off.'});
    if (fn !== 'acv') return setNote({kind: 'warn', text: 'Meter on AC V 750 across the lamp.'});
    setRows((x) => [...x.filter((y) => y.pot !== pot), {pot, alpha: a == null ? null : deg(a), vl: vrms}].sort((p, q) => p.pot - q.pot));
    setNote({kind: 'good', text: a == null ? 'Lamp off: the DIAC never reaches 32 V.' : `Pot ${pot} %: lamp ${vrms.toFixed(0)} V.`});
  };
  const calc = (al: number) => vs * Math.sqrt(1 - al / Math.PI + Math.sin(2 * al) / (2 * Math.PI));
  const rowOk = (x: DRow) => {
    if (x.alpha == null) return true;
    const am = num(x.am);
    return am != null && Math.abs(am - x.alpha) <= 8 && near(num(x.vc), calc((am * Math.PI) / 180), 0.03);
  };
  const lit = rows.filter((x) => x.alpha != null && x.am && x.vc && rowOk(x));

  return (
    <PracticalSheet
      number={KEY}
      title="Simple Lamp Dimmer Using a TRIAC and DIAC"
      aim="To build a TRIAC–DIAC lamp dimmer, vary the firing angle with the pot, and compare the lamp voltage with Vrms = Vs √(1 − α/π + sin 2α ÷ 2π)."
      apparatus={['230 V supply with MCB', 'TRIAC BT136, DIAC DB3 (32 V)', 'Pot 470 kΩ + 10 kΩ, C = 0.1 µF / 400 V', '100 W lamp', 'CRO with isolated (differential ×100) probe', 'Digital multimeter (true RMS)']}
      procedure={[
        'Choose the probe: only an isolated / differential probe may be used on mains.',
        'Switch on. Turn the pot: the lamp dims.',
        'For each setting measure the lamp voltage (AC V) and read α on the CRO.',
        'Calculate Vrms from α.',
        'Find the setting where the lamp goes off (DIAC does not fire).',
      ]}
      precautions={['Mains circuit: never touch while live.', 'Never connect an ordinary CRO probe ground clip to a mains circuit.', 'Use a capacitor rated for 400 V AC.']}
      viva={[
        {q: 'Why is a DIAC used with the TRIAC?', a: 'It gives a sharp, symmetrical trigger pulse in both half cycles once the capacitor reaches about 32 V.'},
        {q: 'How does the pot change the brightness?', a: 'A larger R charges C more slowly and with more phase lag, so the DIAC fires later (larger α) and less of each half cycle reaches the lamp.'},
        {q: 'Why does a dimmer cause radio interference?', a: 'The sudden switching produces sharp current steps rich in harmonics; an LC filter reduces it.'},
      ]}
      tasks={[
        {label: 'Three lit settings: α and lamp V measured, Vrms calculated.', done: lit.length >= 3},
        {label: 'Find the lamp-off setting.', done: rows.some((x) => x.alpha == null)},
        {label: 'Print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div className={styles.kit}>
            <svg viewBox="0 0 320 200" role="img" aria-label="TRIAC dimmer with DIAC, pot, capacitor and lamp">
              <path className={styles.wire} d="M30 40 H110 M150 40 H240 V80 M240 130 V170 H30 M240 40 V50 M180 40 V70 M180 110 V120 M180 150 V170 M180 120 H200 M220 120 H226" fill="none" />
              <text x={20} y={110} style={kitLabel}>
                230 V~
              </text>
              <Lamp x={130} y={40} level={level} label="100 W" />
              <rect x={172} y={70} width={16} height={40} rx={3} fill="#9aa3a8" />
              <text x={160} y={94} textAnchor="end" style={{...kitLabel, fontSize: 9}}>
                R
              </text>
              <path d="M168 130 H192 M168 140 H192" stroke="var(--lab-wire)" strokeWidth={3.5} />
              <text x={160} y={140} textAnchor="end" style={{...kitLabel, fontSize: 9}}>
                C
              </text>
              <text x={210} y={112} textAnchor="middle" style={{...kitLabel, fontSize: 9}}>
                DIAC
              </text>
              <rect x={226} y={80} width={28} height={50} rx={4} fill="#1d1d1d" />
              <text x={262} y={108} style={{...kitLabel, fontSize: 10}}>
                TRIAC
              </text>
              <text x={290} y={180} textAnchor="end" style={{...kitLabel, fontSize: 10, fill: mcbTrip ? '#ff6b5a' : '#9fb0ba'}}>
                {mcbTrip ? 'MCB TRIPPED' : live ? 'live' : 'off'}
              </text>
            </svg>
          </div>
          <div style={{display: 'grid', gap: '0.6rem', alignContent: 'start'}}>
            <Multimeter
              name="True-RMS multimeter (across lamp)"
              fn={fn}
              functions={[
                {fn: 'off', label: 'OFF'},
                {fn: 'acv', label: 'AC V 750'},
              ]}
              text={text}
              unit={fn === 'off' ? '' : 'V AC'}
              onFunction={(f) => (setNote(null), setFn(f))}
            />
            <div className={clsx(styles.card, styles.noPrint)}>
              <label className={styles.knobLabel} style={{display: 'block'}}>
                DIMMER POT: {pot} %
                <input className={styles.range} type="range" min={0} max={100} step={10} value={pot} onChange={(e) => setPot(Number(e.target.value))} />
              </label>
              <span className={styles.label}>CRO probe on the lamp</span>
              <div className={styles.seg} role="group" aria-label="CRO probe">
                <button type="button" aria-pressed={probe === 'diff'} onClick={() => (power ? setNote({kind: 'warn', text: 'Switch off before changing the probe.'}) : setProbe('diff'))}>
                  Differential ×100
                </button>
                <button type="button" aria-pressed={probe === 'plain'} onClick={() => (power ? setNote({kind: 'warn', text: 'Switch off before changing the probe.'}) : setProbe('plain'))}>
                  Ordinary ×1 probe
                </button>
              </div>
              <button type="button" className={styles.btn} style={{marginTop: '0.4rem'}} onClick={power1}>
                Mains {power ? 'OFF' : 'ON'}
              </button>
            </div>
            <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} onClick={noteIt}>
              Note reading
            </button>
          </div>
        </div>
        <div style={{marginTop: '0.6rem'}}>{scope.view}</div>
        <p className={styles.muted}>The CRO shows lamp voltage ÷ 100 (1 div at 1 V/div = 100 V).</p>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {rows.length === 0 ? (
          <Empty>No rows yet.</Empty>
        ) : (
          <Table
            head={['Pot', 'Lamp V (measured)', 'α from CRO (°)', 'Vrms from α', 'Check']}
            rows={rows.map((x, k) => {
              const set = (p: Partial<DRow>) => setRows((y) => y.map((z, j) => (j === k ? {...z, ...p} : z)));
              return [`${x.pot} %`, `${x.vl.toFixed(0)} V`, x.alpha == null ? 'off' : inp(`Row ${k + 1} firing angle`, x.am, (v) => set({am: v})), x.alpha == null ? '–' : inp(`Row ${k + 1} calculated V`, x.vc, (v) => set({vc: v})), x.alpha == null ? 'lamp off' : x.am && x.vc ? <Verdict ok={rowOk(x)} /> : '–'];
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
