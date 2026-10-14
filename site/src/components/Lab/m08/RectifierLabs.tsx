import React, {useMemo, useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import Multimeter from '../Multimeter';
import useStoredState from '../useStoredState';
import {ProbeBar, ProbePoint, useProbes} from '../Probes';
import {useScope} from '../Scope';
import {si, type Sig} from '../signals';
import {Empty, NoteBox, ResetKit, Section, Table, Verdict, useKitSeed, useRng, type Note} from '../kit';
import {fmtOhms, kitLabel, near} from '../m07/parts';
import {VD, dcAc, rectify, type RectType} from './rectifier';
import styles from '../styles.module.css';

const num = (s?: string) => (s && s.trim() !== '' && !Number.isNaN(Number(s)) ? Number(s) : null);
const TYPE_NAME: Record<RectType, string> = {hw: 'Half-wave', fw: 'Full-wave (centre-tap)', bridge: 'Bridge'};
const N_DIODES: Record<RectType, number> = {hw: 1, fw: 2, bridge: 4};

/** A diode symbol between two points; correct orientation = anode at (x1, y1). */
function DiodeSym({x1, y1, x2, y2, fit, label, onTap}: {x1: number; y1: number; x2: number; y2: number; fit: number; label: string; onTap: () => void}) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI + (fit === -1 ? 180 : 0);
  return (
    <g
      className={styles.clickable}
      role="button"
      tabIndex={0}
      aria-label={`${label}: ${fit === 0 ? 'socket empty. Fit a diode' : 'tap to turn round'}`}
      onClick={onTap}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTap();
        }
      }}>
      <circle cx={mx} cy={my} r={20} fill="transparent" />
      <path d={`M${x1} ${y1} L${mx - (x2 - x1) * 0.18} ${my - (y2 - y1) * 0.18} M${mx + (x2 - x1) * 0.18} ${my + (y2 - y1) * 0.18} L${x2} ${y2}`} stroke="var(--lab-wire)" strokeWidth={2.5} />
      {fit === 0 ? (
        <rect x={mx - 12} y={my - 12} width={24} height={24} rx={4} fill="none" stroke="#9fb0ba" strokeDasharray="3 3" />
      ) : (
        <g transform={`rotate(${ang} ${mx} ${my})`}>
          <path d={`M${mx - 10} ${my - 11} L${mx - 10} ${my + 11} L${mx + 9} ${my} Z`} fill="#e9eef0" />
          <path d={`M${mx + 10} ${my - 11} V${my + 11}`} stroke="#e9eef0" strokeWidth={3} />
        </g>
      )}
      <text x={mx + 14} y={my - 12} style={{...kitLabel, fontSize: 10}}>
        {label}
      </text>
    </g>
  );
}

/** Node voltages (signals) for the measuring points of each circuit. */
function nodeSignals(type: RectType, input: Sig, output: Sig, live: boolean): Record<string, Sig> {
  const zero: Sig = {fn: () => 0, period: input.period};
  if (!live) return {S1: zero, S2: zero, CT: zero, P: zero, M: zero};
  if (type === 'hw') return {S1: input, S2: zero, P: output, M: zero};
  if (type === 'fw') return {S1: input, CT: zero, S2: {fn: (t) => -input.fn(t), period: input.period}, P: output, M: zero};
  // Bridge: the output floats; M follows the lower AC end, one diode drop below.
  const m: Sig = {fn: (t) => Math.min(input.fn(t), 0) - VD, period: input.period};
  return {S1: input, S2: zero, M: m, P: {fn: (t) => m.fn(t) + output.fn(t), period: input.period}};
}

const DMM_FNS = [
  {fn: 'off', label: 'OFF'},
  {fn: 'dcv20', label: 'DC V 20'},
  {fn: 'dcv200', label: 'DC V 200'},
  {fn: 'acv2', label: 'AC V 2'},
  {fn: 'acv20', label: 'AC V 20'},
  {fn: 'acv200', label: 'AC V 200'},
];
function dmm(fn: string, s: Sig | null): {text: string; unit: string} {
  if (fn === 'off') return {text: '', unit: ''};
  const ac = fn.startsWith('ac');
  const fs = Number(fn.replace(/\D/g, ''));
  const unit = ac ? 'V AC' : 'V DC';
  if (!s) return {text: (0).toFixed(fs <= 2 ? 3 : fs <= 20 ? 2 : 1), unit};
  const {dc, ac: rms} = dcAc(s);
  const v = ac ? rms : dc;
  if (Math.abs(v) >= fs) return {text: 'OL', unit};
  return {text: v.toFixed(fs <= 2 ? 3 : fs <= 20 ? 2 : 1), unit};
}

/** Circuit drawing, diode sockets and probe points for one rectifier. */
function RectBench({type, fit, onTap, probes, c, rl, live}: {type: RectType; fit: number[]; onTap: (k: number) => void; probes: ReturnType<typeof useProbes>; c: number; rl: number; live: boolean}) {
  const pt = (id: string, x: number, y: number, label: string) => <ProbePoint id={`${id}@${x}`} x={x} y={y} probes={probes} label={label} r={5} />;
  const xfmr = (taps: number[]) => (
    <g>
      <path d="M40 60 q14 10 0 20 q14 10 0 20 q14 10 0 20 q14 10 0 20 q14 10 0 20 q14 10 0 20" stroke="#d08a3c" strokeWidth={3} fill="none" />
      <path d="M80 50 V210 M86 50 V210" stroke="#9aa3a8" strokeWidth={2} />
      <path d={`M126 ${taps[0]} q-14 10 0 20 q-14 10 0 20 q-14 10 0 20 q-14 10 0 20 q-14 10 0 20 q-14 10 0 20 q-14 10 0 20 q-14 10 0 20`} stroke="#d08a3c" strokeWidth={3} fill="none" />
      <text x={20} y={40} style={kitLabel}>
        230 V
      </text>
      <text x={34} y={240} style={{...kitLabel, fill: live ? '#ffcf3f' : '#9fb0ba'}}>
        {live ? 'ON' : 'OFF'}
      </text>
    </g>
  );
  const load = (x: number, y1: number, y2: number) => (
    <g>
      <rect x={x - 9} y={(y1 + y2) / 2 - 28} width={18} height={56} rx={3} fill="#e8d7b0" />
      <text x={x + 14} y={(y1 + y2) / 2 + 4} style={kitLabel}>
        RL {fmtOhms(rl)}
      </text>
      {c > 0 && (
        <g>
          <path d={`M${x + 70} ${y1} V${(y1 + y2) / 2 - 6} M${x + 70} ${(y1 + y2) / 2 + 6} V${y2} M${x} ${y1} H${x + 70} M${x} ${y2} H${x + 70}`} stroke="var(--lab-wire)" strokeWidth={2.5} fill="none" />
          <path d={`M${x + 56} ${(y1 + y2) / 2 - 6} H${x + 84} M${x + 56} ${(y1 + y2) / 2 + 6} H${x + 84}`} stroke="var(--lab-wire)" strokeWidth={4} />
          <text x={x + 90} y={(y1 + y2) / 2 + 4} style={kitLabel}>
            {si(c, 'F')}
          </text>
        </g>
      )}
    </g>
  );
  return (
    <div className={styles.kit}>
      <svg viewBox="0 0 600 270" role="img" aria-label={`${TYPE_NAME[type]} rectifier with ${N_DIODES[type]} diode socket(s), load resistor and test points`}>
        {type === 'hw' && (
          <g>
            {xfmr([60])}
            <path className={styles.wire} d="M126 60 H180 M260 60 H400 V100 M400 160 V220 H126 V220" fill="none" />
            <DiodeSym x1={180} y1={60} x2={260} y2={60} fit={fit[0]} label="D1" onTap={() => onTap(0)} />
            {load(400, 100, 160)}
            {pt('S1', 140, 60, 'Secondary top')}
            {pt('S2', 140, 220, 'Secondary bottom')}
            {pt('P', 400, 80, 'Output +')}
            {pt('M', 400, 200, 'Output −')}
          </g>
        )}
        {type === 'fw' && (
          <g>
            {xfmr([40])}
            <path className={styles.wire} d="M126 40 H180 M260 40 H320 V200 M126 200 H180 M260 200 H320 M320 40 H420 V100 M420 160 V250 H160 V120 H126" fill="none" />
            <DiodeSym x1={180} y1={40} x2={260} y2={40} fit={fit[0]} label="D1" onTap={() => onTap(0)} />
            <DiodeSym x1={180} y1={200} x2={260} y2={200} fit={fit[1]} label="D2" onTap={() => onTap(1)} />
            {load(420, 100, 160)}
            {pt('S1', 140, 40, 'Secondary top end')}
            {pt('CT', 140, 120, 'Centre tap')}
            {pt('S2', 140, 200, 'Secondary bottom end')}
            {pt('P', 420, 80, 'Output +')}
            {pt('M', 420, 230, 'Output −')}
          </g>
        )}
        {type === 'bridge' && (
          <g>
            {xfmr([60])}
            <path className={styles.wire} d="M126 60 H170 V30 H300 V50 M126 220 H170 V250 H300 V210 M380 130 H430 V100 H470 V105 M220 130 H200 V240 H470 V155" fill="none" />
            <DiodeSym x1={300} y1={50} x2={380} y2={130} fit={fit[0]} label="D1" onTap={() => onTap(0)} />
            <DiodeSym x1={300} y1={210} x2={380} y2={130} fit={fit[1]} label="D2" onTap={() => onTap(1)} />
            <DiodeSym x1={220} y1={130} x2={300} y2={50} fit={fit[2]} label="D3" onTap={() => onTap(2)} />
            <DiodeSym x1={220} y1={130} x2={300} y2={210} fit={fit[3]} label="D4" onTap={() => onTap(3)} />
            {load(470, 105, 155)}
            {pt('S1', 140, 60, 'Secondary top')}
            {pt('S2', 140, 220, 'Secondary bottom')}
            {pt('P', 470, 90, 'Output +')}
            {pt('M', 470, 225, 'Output −')}
          </g>
        )}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1.8.72 Half-wave, full-wave and bridge rectifiers
// ---------------------------------------------------------------------------

interface RRow {
  vac?: string;
  vdc?: string;
  vm?: string;
  f?: string;
  theory?: string;
  built?: boolean;
}

export function RectifierLab(): React.JSX.Element {
  const KEY = '1.8.72';
  const [seed, newKit] = useKitSeed(KEY);
  const kit = useRng(seed, (rnd) => ({first: Array.from({length: 4}, () => (rnd() < 0.5 ? 1 : -1)), vrms: 12 * (1 + (rnd() * 2 - 1) * 0.03)}));
  const [type, setType] = useState<RectType>('hw');
  const [fits, setFits] = useState<Record<RectType, number[]>>({hw: [0], fw: [0, 0], bridge: [0, 0, 0, 0]});
  const [power, setPower] = useState(false);
  const [fuse, setFuse] = useState(true);
  const [fn, setFn] = useState('off');
  const [rows, setRows] = useStoredState<Record<RectType, RRow>>(`lab:${KEY}:rows`, {hw: {}, fw: {}, bridge: {}});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);
  const probes = useProbes();
  const fit = fits[type];
  const rl = 1000;

  const res = useMemo(() => rectify(type, fit, kit.vrms, 0, rl), [type, fit.join(','), kit.vrms]); // eslint-disable-line react-hooks/exhaustive-deps
  const live = power && fuse && !res.short;
  const nodes = nodeSignals(type, res.input, res.output, live);
  const zero: Sig = {fn: () => 0, period: 0.02};
  const scope = useScope('cro', {ch1: live ? res.input : zero, ch2: live ? res.output : zero}, {ch1: {vdiv: 10, pos: 2, coupling: 'DC', on: true}, ch2: {vdiv: 10, pos: -2, coupling: 'DC', on: true}, display: 'DUAL', tdiv: 5e-3});

  const correct = fit.every((x) => x === 1);

  const tap = (k: number) => {
    if (power) return setNote({kind: 'warn', text: 'Switch off before changing a diode.'});
    setNote(null);
    setFits((f) => ({...f, [type]: f[type].map((x, j) => (j !== k ? x : x === 0 ? kit.first[k] : -x))}));
  };
  const toggle = () => {
    if (power) return (setPower(false), setNote(null));
    if (!fuse) return setNote({kind: 'warn', text: 'Fuse blown. Replace it first.'});
    if (res.short) {
      setFuse(false);
      return setNote({kind: 'bad', text: <b>Bang! A diode the wrong way round shorts the transformer. The fuse blew. Check every diode.</b>});
    }
    setPower(true);
    if (correct) setRows((r) => ({...r, [type]: {...r[type], built: true}}));
    setNote(fit.some((x) => x === 0) ? {kind: 'warn', text: 'A diode socket is empty.'} : null);
  };
  const choose = (t: RectType) => {
    if (power) return setNote({kind: 'warn', text: 'Switch off before changing circuits.'});
    probes.clear();
    setNote(null);
    setType(t);
  };

  const node = (id: string | null) => (id ? nodes[id.split('@')[0]] ?? null : null);
  const rs = node(probes.red);
  const bs = node(probes.black);
  const diff: Sig | null = rs && bs && probes.red !== probes.black ? {fn: (t) => rs.fn(t) - bs.fn(t), period: 0.02} : null;
  const {text, unit} = dmm(fn, diff);

  const pair = [probes.red?.split('@')[0], probes.black?.split('@')[0]].sort().join('-');
  const isIn = type === 'fw' ? pair === 'CT-S1' : pair === 'S1-S2';
  const isOut = pair === 'M-P';

  const noteIt = () => {
    if (!live) return setNote({kind: 'warn', text: 'Circuit is not powered.'});
    if (!correct) return setNote({kind: 'warn', text: 'Fit all diodes correctly first.'});
    if (fn === 'off') return setNote({kind: 'warn', text: 'Select a function.'});
    if (text === 'OL') return setNote({kind: 'warn', text: 'OL: higher range.'});
    if (isIn) {
      if (!fn.startsWith('ac')) return setNote({kind: 'warn', text: 'Secondary is AC: use an AC V range.'});
      setRows((r) => ({...r, [type]: {...r[type], vac: text}}));
      return setNote({kind: 'good', text: `${TYPE_NAME[type]}: Vac = ${text} V`});
    }
    if (isOut) {
      if (!fn.startsWith('dc')) return setNote({kind: 'warn', text: 'For the output DC value use a DC V range.'});
      if (Number(text) < 0) return setNote({kind: 'warn', text: 'Minus sign: red probe on output +.'});
      setRows((r) => ({...r, [type]: {...r[type], vdc: text}}));
      return setNote({kind: 'good', text: `${TYPE_NAME[type]}: Vdc = ${text} V`});
    }
    setNote({kind: 'warn', text: type === 'fw' ? 'Probes across one half of the secondary (S1–CT), or across the output.' : 'Probes across the secondary or across the output.'});
  };

  const truth = (t: RectType) => {
    const r = rectify(t, Array(N_DIODES[t]).fill(1), kit.vrms, 0, rl);
    const s = dcAc(r.output);
    return {vm: s.pp, dc: s.dc, vac: kit.vrms, f: t === 'hw' ? 50 : 100, k: t === 'hw' ? 0.318 : 0.636};
  };
  const rowOk = (t: RectType) => {
    const r = rows[t] ?? {};
    const tr = truth(t);
    return {
      vac: r.vac ? near(num(r.vac), tr.vac, 0.02) : null,
      vdc: r.vdc ? near(num(r.vdc), tr.dc, 0.02) : null,
      vm: r.vm ? near(num(r.vm), tr.vm, 0.05) : null,
      f: r.f ? num(r.f) === tr.f : null,
      theory: r.theory && num(r.vm) != null ? near(num(r.theory), tr.k * num(r.vm)!, 0.03) : null,
    };
  };
  const allOk = (t: RectType) => !!rows[t]?.built && Object.values(rowOk(t)).every((x) => x === true);
  const setRow = (t: RectType, p: RRow) => setRows((r) => ({...r, [t]: {...r[t], ...p}}));
  const field = (t: RectType, f: keyof RRow, label: string) => <input className={styles.input} style={{maxWidth: '5rem'}} inputMode="decimal" aria-label={label} value={(rows[t]?.[f] as string) ?? ''} onChange={(e) => setRow(t, {[f]: e.target.value})} />;

  return (
    <PracticalSheet
      number={KEY}
      title="Construct and Test Half-Wave, Full-Wave and Bridge Rectifiers"
      aim="To build half-wave, centre-tapped full-wave and bridge rectifiers, view their input and output on a CRO and compare the DC output with theory."
      apparatus={['Transformer 230 V / 12-0-12 V', 'Diodes 1N4007 × 4', 'Load resistor 1 kΩ', 'Dual-trace CRO, digital multimeter']}
      procedure={[
        'Supply off. Fit each diode: tap a socket to fit it, tap again to turn it round. The band (bar) is the cathode.',
        'Switch on. CH1 shows the secondary, CH2 the output.',
        'Measure the secondary AC voltage and the output DC voltage with the meter.',
        'From the CRO read the output peak Vm and the output frequency.',
        'Theory: Vdc = 0.318 Vm (half-wave), 0.636 Vm (full-wave and bridge).',
      ]}
      precautions={['Switch off before fitting or turning a diode.', 'Check diode polarity before switching on: a reversed diode in a bridge shorts the transformer.', 'Use the DC range for the output and the AC range for the secondary.']}
      viva={[
        {q: 'Output frequency of a half-wave and a full-wave rectifier on 50 Hz mains?', a: '50 Hz for half-wave, 100 Hz for full-wave and bridge.'},
        {q: 'Advantage of a bridge over a centre-tapped full-wave rectifier?', a: 'No centre-tapped transformer is needed, and each diode’s PIV is only Vm.'},
        {q: 'Why is the bridge output peak lower than the secondary peak?', a: 'Two diodes conduct in series in each half cycle: about 1.4 V is lost.'},
        {q: 'What is the PIV across each diode in a centre-tapped full-wave rectifier?', a: '2 Vm.'},
      ]}
      steps={[
        ...(['hw', 'fw', 'bridge'] as RectType[]).flatMap((t) => [
          {
            label: `${TYPE_NAME[t]}: fit the diodes, switch Mains ON, then note Vac (secondary) and Vdc (output).`,
            hint: 'Tap a socket to fit a diode, tap again to turn it. The bar is the cathode. Vac on AC V, Vdc on DC V.',
            done: !!rows[t]?.built && !!rows[t]?.vac && !!rows[t]?.vdc,
          },
          {
            label: `${TYPE_NAME[t]}: read Vm and frequency on the CRO, then fill Vm, f and theory Vdc.`,
            hint: `Theory Vdc = ${t === 'hw' ? '0.318' : '0.636'} × Vm. Frequency is of the output.`,
            done: allOk(t),
          },
        ]),
        {label: 'Enter your details and press Print / Save as PDF.', hint: 'Practical record, below the result.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={clsx(styles.seg, styles.noPrint)} role="group" aria-label="Circuit" style={{marginBottom: '0.6rem'}}>
          {(['hw', 'fw', 'bridge'] as RectType[]).map((t) => (
            <button key={t} type="button" aria-pressed={type === t} onClick={() => choose(t)}>
              {TYPE_NAME[t]}
            </button>
          ))}
        </div>
        <div className={styles.controls} style={{marginTop: 0}}>
          <div>
            <RectBench type={type} fit={fit} onTap={tap} probes={probes} c={0} rl={rl} live={live} />
            <ProbeBar probes={probes} hint="Tap a diode socket to fit or turn a diode." />
          </div>
          <div style={{display: 'grid', gap: '0.6rem', alignContent: 'start'}}>
            <div className={clsx(styles.seg, styles.noPrint)} role="group" aria-label="Mains">
              <button type="button" aria-pressed={power} onClick={toggle}>
                Mains {power ? 'ON' : 'OFF'}
              </button>
              {!fuse && (
                <button type="button" onClick={() => (setFuse(true), setNote({kind: 'info', text: 'Fuse replaced.'}))}>
                  Replace fuse
                </button>
              )}
            </div>
            <Multimeter name="Digital multimeter" fn={fn} functions={DMM_FNS} text={text} unit={unit} placement={isIn ? 'secondary' : isOut ? 'output' : undefined} onFunction={(f) => (setNote(null), setFn(f))} />
            <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} onClick={noteIt}>
              Note reading
            </button>
          </div>
        </div>
        <NoteBox note={note} status={!fuse ? {kind: 'bad', text: 'Fuse blown.'} : null} />
        <div style={{marginTop: '0.6rem'}}>{scope.view}</div>
      </Section>
      <Section title="Observation table">
        <Table
          head={['Rectifier', 'Vac secondary (V)', 'Vm from CRO (V)', 'Output f (Hz)', 'Vdc measured (V)', 'Vdc theory (V)', 'Check']}
          rows={(['hw', 'fw', 'bridge'] as RectType[]).map((t) => {
            const r = rows[t] ?? {};
            const ok = rowOk(t);
            const filled = Object.values(ok).every((x) => x != null);
            return [
              TYPE_NAME[t],
              <span className={styles.num}>{r.vac ?? '–'}</span>,
              field(t, 'vm', `${TYPE_NAME[t]} peak output`),
              field(t, 'f', `${TYPE_NAME[t]} output frequency`),
              <span className={styles.num}>{r.vdc ?? '–'}</span>,
              field(t, 'theory', `${TYPE_NAME[t]} theoretical Vdc`),
              filled ? <Verdict ok={allOk(t)} no={r.built ? '✗ check again' : '✗ not built correctly yet'} /> : '–',
            ];
          })}
        />
        <p className={styles.muted}>Theory uses your Vm: 0.318 × Vm or 0.636 × Vm.</p>
        <ResetKit
          onReset={() => {
            setRows({hw: {}, fw: {}, bridge: {}});
            setFits({hw: [0], fw: [0, 0], bridge: [0, 0, 0, 0]});
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// 1.8.73 Ripple voltage, frequency and factor for different loads and filters
// ---------------------------------------------------------------------------

const CAPS = [0, 100e-6, 470e-6, 1000e-6];
const LOADS = [1000, 470, 220, 100];

interface Rip {
  type: RectType;
  c: number;
  rl: number;
  vdc: string;
  vac: string;
  vpp: string;
  f: string;
  rf: string;
}

export function RippleLab(): React.JSX.Element {
  const KEY = '1.8.73';
  const [seed, newKit] = useKitSeed(KEY);
  const vrms = useRng(seed, (rnd) => 12 * (1 + (rnd() * 2 - 1) * 0.03));
  const [type, setType] = useState<RectType>('bridge');
  const [c, setC] = useState(0);
  const [rl, setRl] = useState(1000);
  const [fn, setFn] = useState('dcv20');
  const [draft, setDraft] = useState<Partial<Rip>>({});
  const [rows, setRows] = useStoredState<Rip[]>(`lab:${KEY}:rows`, []);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);
  const probes = useProbes();

  const res = useMemo(() => rectify(type, Array(N_DIODES[type]).fill(1), vrms, c, rl), [type, vrms, c, rl]);
  const scope = useScope('cro', {ch1: res.output}, {ch1: {vdiv: 5, pos: -2, coupling: 'DC', on: true}, tdiv: 5e-3});
  const {text, unit} = dmm(fn, res.output);

  const setCfg = (f: () => void) => {
    setDraft({});
    setNote(null);
    f();
  };
  const noteDmm = () => {
    if (text === 'OL') return setNote({kind: 'warn', text: 'OL: higher range.'});
    if (fn.startsWith('dc')) setDraft((d) => ({...d, vdc: text}));
    else if (fn.startsWith('ac')) setDraft((d) => ({...d, vac: text}));
    setNote({kind: 'good', text: `${fn.startsWith('dc') ? 'Vdc' : 'Vac (ripple rms)'} = ${text} V`});
  };
  const add = () => {
    const d = draft;
    if (!d.vdc || !d.vac) return setNote({kind: 'warn', text: 'Note both Vdc (DC V) and the ripple Vac (AC V) first.'});
    if (!d.vpp || !d.f || !d.rf) return setNote({kind: 'warn', text: 'Enter ripple p-p and frequency from the CRO, and the ripple factor.'});
    setRows((r) => [...r, {type, c, rl, vdc: d.vdc!, vac: d.vac!, vpp: d.vpp!, f: d.f!, rf: d.rf!}]);
    setDraft({});
    setNote({kind: 'good', text: 'Row added.'});
  };

  const truthOf = (r: Rip) => {
    const o = dcAc(rectify(r.type, Array(N_DIODES[r.type]).fill(1), vrms, r.c, r.rl).output);
    return {dc: o.dc, ac: o.ac, pp: o.pp, f: r.type === 'hw' ? 50 : 100};
  };
  const okRow = (r: Rip) => {
    const t = truthOf(r);
    return near(num(r.vdc), t.dc, 0.02) && near(num(r.vac), t.ac, 0.03) && near(num(r.vpp), t.pp, 0.12) && num(r.f) === t.f && near(num(r.rf), num(r.vac)! / num(r.vdc)!, 0.03);
  };
  const good = rows.filter(okRow);
  const caps = new Set(good.map((r) => r.c));
  const loads = new Set(good.map((r) => r.rl));

  return (
    <PracticalSheet
      number={KEY}
      title="Ripple Voltage, Frequency and Ripple Factor of Rectifiers"
      aim="To measure the ripple voltage, ripple frequency and ripple factor of half-wave and bridge rectifiers for different filter capacitors and loads."
      apparatus={['Transformer 230 V / 12 V, half-wave and bridge rectifier boards', 'Filter capacitors 100, 470, 1000 µF', 'Load resistors 1 kΩ, 470 Ω, 220 Ω, 100 Ω', 'CRO, digital multimeter']}
      procedure={[
        'Choose the rectifier, filter capacitor and load.',
        'Meter on DC V: note Vdc. Meter on AC V: note the ripple voltage Vac (rms).',
        'CRO on AC coupling with a small V/div: read the ripple p-p and its frequency.',
        'Ripple factor γ = Vac ÷ Vdc. Add the row.',
        'Repeat for other capacitors and loads.',
      ]}
      precautions={['Fit electrolytic capacitors with the correct polarity.', 'Use AC coupling on the CRO to see the small ripple.', 'Discharge the capacitor before changing it.']}
      viva={[
        {q: 'Ripple factor without a filter?', a: '1.21 for half-wave, 0.48 for full-wave.'},
        {q: 'What happens to ripple when the capacitor is larger?', a: 'Ripple falls: the capacitor discharges less between peaks.'},
        {q: 'What happens to ripple when the load current increases?', a: 'Ripple rises: the capacitor discharges faster.'},
        {q: 'Why is full-wave ripple easier to filter?', a: 'Its ripple frequency is 100 Hz, twice that of half-wave, so the capacitor has half the time to discharge.'},
      ]}
      steps={[
        {
          label: 'Pick a rectifier, capacitor and load. Note Vdc (DC V) and the ripple Vac (AC V).',
          hint: 'Change the meter function, then press Note meter reading each time.',
          done: good.length > 0 || (!!draft.vdc && !!draft.vac),
        },
        {
          label: 'Read ripple p-p and frequency on the CRO, work out γ and press Add row.',
          hint: 'γ = Vac ÷ Vdc. Use AC coupling and a small V/div.',
          done: good.length > 0,
        },
        {label: `Repeat for six correct rows. Correct rows: ${Math.min(good.length, 6)}/6`, hint: 'A wrong row stays in the table; add it again correctly.', done: good.length >= 6},
        {label: `Use at least three capacitor values, including None. Values: ${Math.min(caps.size, 3)}/3`, hint: 'Change the filter capacitor, then measure again.', done: caps.size >= 3},
        {label: `Use at least two loads. Loads: ${Math.min(loads.size, 2)}/2`, hint: 'Lower load resistance means more load current.', done: loads.size >= 2},
        {label: 'Take rows for both half-wave and bridge.', hint: 'Switch the Rectifier button.', done: good.some((r) => r.type === 'hw') && good.some((r) => r.type === 'bridge')},
        {label: 'Enter your details and press Print / Save as PDF.', hint: 'Practical record, below the result.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={clsx(styles.controls, styles.noPrint)} style={{marginTop: 0}}>
          <div className={styles.card}>
            <span className={styles.label} style={{marginTop: 0}}>
              Rectifier
            </span>
            <div className={styles.seg} role="group" aria-label="Rectifier">
              {(['hw', 'bridge'] as RectType[]).map((t) => (
                <button key={t} type="button" aria-pressed={type === t} onClick={() => setCfg(() => setType(t))}>
                  {TYPE_NAME[t]}
                </button>
              ))}
            </div>
            <span className={styles.label}>Filter capacitor</span>
            <div className={styles.seg} role="group" aria-label="Filter capacitor">
              {CAPS.map((x) => (
                <button key={x} type="button" aria-pressed={c === x} onClick={() => setCfg(() => setC(x))}>
                  {x ? si(x, 'F') : 'None'}
                </button>
              ))}
            </div>
            <span className={styles.label}>Load</span>
            <div className={styles.seg} role="group" aria-label="Load resistor">
              {LOADS.map((x) => (
                <button key={x} type="button" aria-pressed={rl === x} onClick={() => setCfg(() => setRl(x))}>
                  {fmtOhms(x)}
                </button>
              ))}
            </div>
          </div>
          <div style={{display: 'grid', gap: '0.6rem', alignContent: 'start'}}>
            <Multimeter name="Digital multimeter (across load)" fn={fn} functions={DMM_FNS} text={text} unit={unit} onFunction={(f) => (setNote(null), setFn(f))} />
            <button type="button" className={clsx(styles.btn, styles.primary)} onClick={noteDmm}>
              Note meter reading
            </button>
          </div>
        </div>
        <RectBench type={type} fit={Array(N_DIODES[type]).fill(1)} onTap={() => setNote({kind: 'info', text: 'This board is pre-built.'})} probes={probes} c={c} rl={rl} live />
        <div style={{marginTop: '0.6rem'}}>{scope.view}</div>
        <div className={clsx(styles.card, styles.noPrint)} style={{marginTop: '0.6rem'}}>
          <div className={styles.fields}>
            <span className={styles.muted}>
              Vdc: <b className={styles.num}>{draft.vdc ?? '–'}</b> · Vac: <b className={styles.num}>{draft.vac ?? '–'}</b>
            </span>
            <label className={styles.field}>
              Ripple p-p (V, CRO)
              <input className={styles.input} inputMode="decimal" value={draft.vpp ?? ''} onChange={(e) => setDraft((d) => ({...d, vpp: e.target.value}))} />
            </label>
            <label className={styles.field}>
              Ripple f (Hz)
              <input className={styles.input} inputMode="decimal" value={draft.f ?? ''} onChange={(e) => setDraft((d) => ({...d, f: e.target.value}))} />
            </label>
            <label className={styles.field}>
              γ = Vac ÷ Vdc
              <input className={styles.input} inputMode="decimal" value={draft.rf ?? ''} onChange={(e) => setDraft((d) => ({...d, rf: e.target.value}))} />
            </label>
          </div>
          <button type="button" className={clsx(styles.btn, styles.primary)} style={{marginTop: '0.5rem'}} onClick={add}>
            Add row
          </button>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {rows.length === 0 ? (
          <Empty>No rows yet.</Empty>
        ) : (
          <Table
            head={['Rectifier', 'C', 'RL', 'Vdc (V)', 'Vac (V)', 'Ripple p-p (V)', 'f (Hz)', 'γ', 'Check']}
            rows={rows.map((r) => [TYPE_NAME[r.type], r.c ? si(r.c, 'F') : 'None', fmtOhms(r.rl), r.vdc, r.vac, r.vpp, r.f, r.rf, <Verdict ok={okRow(r)} />])}
          />
        )}
        <ResetKit
          onReset={() => {
            setRows([]);
            setDraft({});
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}
