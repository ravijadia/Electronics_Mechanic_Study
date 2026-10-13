import React, {useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import Multimeter from '../Multimeter';
import useStoredState from '../useStoredState';
import {ProbeBar, ProbePoint, useProbes} from '../Probes';
import {NoteBox, ResetKit, Section, Table, Verdict, shuffle, useKitSeed, useRng, type Note} from '../kit';
import {kitLabel, near} from '../m07/parts';
import styles from '../styles.module.css';

const num = (s?: string) => (s && s.trim() !== '' && !Number.isNaN(Number(s)) ? Number(s) : null);
const sel = (label: string, value: string | undefined, options: [string, string][], onChange: (v: string) => void) => (
  <select className={styles.select} aria-label={label} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
    <option value="">Choose…</option>
    {options.map(([v, t]) => (
      <option key={v} value={v}>
        {t}
      </option>
    ))}
  </select>
);

const OHM_FNS = [
  {fn: 'off', label: 'OFF'},
  {fn: 'r200', label: 'Ω 200'},
  {fn: 'r2k', label: 'Ω 2k'},
  {fn: 'r2M', label: 'Ω 2M'},
];
function ohms(fn: string, r: number): {text: string; unit: string} {
  if (fn === 'off') return {text: '', unit: ''};
  const [fs, div, dp, unit] = fn === 'r200' ? [200, 1, 1, 'Ω'] : fn === 'r2k' ? [2000, 1000, 3, 'kΩ'] : [2e6, 1e6, 3, 'MΩ'];
  const shown = fn === 'r200' ? r + 0.3 : r;
  if (!isFinite(shown) || shown >= (fs as number)) return {text: 'OL', unit: unit as string};
  return {text: (shown / (div as number)).toFixed(dp as number), unit: unit as string};
}

// ---------------------------------------------------------------------------
// 1.8.70 Identify and test transformers
// ---------------------------------------------------------------------------

type TType = 'step' | 'ct' | 'auto' | 'audio' | 'smps' | 'toroid' | 'current' | 'iso';
const TNAME: Record<TType, string> = {
  step: 'Step-down power transformer',
  ct: 'Centre-tapped transformer',
  auto: 'Auto-transformer (variac)',
  audio: 'Audio output transformer',
  smps: 'SMPS (ferrite) transformer',
  toroid: 'Toroidal transformer',
  current: 'Current transformer (CT)',
  iso: 'Isolation transformer (1:1)',
};
const MARK: Record<TType, string> = {step: '230V / 12V 1A', ct: '230V / 12-0-12V', auto: '0–270V 2A', audio: 'OPT 1k : 8Ω', smps: 'EE25', toroid: '230V / 24V 50VA', current: '100/5 A', iso: '230V / 230V 100VA'};
/** Primary and secondary winding resistances (Ω). */
const RW: Record<TType, [number, number]> = {step: [55, 0.9], ct: [48, 1.6], auto: [3.2, 1.4], audio: [80, 0.6], smps: [0.6, 0.05], toroid: [18, 0.5], current: [0.001, 0.4], iso: [8, 9]};

type TFault = 'good' | 'openP' | 'openS' | 'leak';
const FAULT_NAME: Record<TFault, string> = {good: 'Good', openP: 'Primary open', openS: 'Secondary open', leak: 'Winding shorted to core / other winding'};

interface Tx {
  type: TType;
  fault: TFault;
  rp: number;
  rs: number;
}

const CW = 200;
const CH = 170;
const TP: Record<string, [number, number]> = {P1: [30, 140], P2: [70, 140], S1: [130, 140], S2: [170, 140], C: [178, 40]};

function TxArt({type}: {type: TType}) {
  const core = '#6d7378';
  const wind = '#c87533';
  switch (type) {
    case 'toroid':
    case 'current':
      return (
        <g>
          <circle cx={100} cy={72} r={44} fill={type === 'toroid' ? '#2b2b2b' : '#e9eaec'} />
          <circle cx={100} cy={72} r={18} fill="#2c3a44" />
          {type === 'current' && <rect x={94} y={20} width={12} height={104} fill="#c9a227" />}
        </g>
      );
    case 'auto':
      return (
        <g>
          <circle cx={100} cy={72} r={46} fill="#9aa3a8" />
          <circle cx={100} cy={72} r={30} fill="#e9eaec" />
          <line x1={100} y1={72} x2={124} y2={52} stroke="#222" strokeWidth={5} strokeLinecap="round" />
        </g>
      );
    case 'smps':
      return (
        <g>
          <rect x={70} y={44} width={60} height={56} fill="#3a3a3a" />
          <rect x={80} y={52} width={40} height={40} fill="#e6d9a8" />
          <rect x={64} y={96} width={72} height={10} fill="#222" />
        </g>
      );
    default:
      return (
        <g>
          <rect x={46} y={24} width={108} height={94} fill={core} />
          {[34, 46, 58, 70, 82, 94, 106].map((y) => (
            <path key={y} d={`M46 ${y} h108`} stroke="#555b60" />
          ))}
          <rect x={70} y={32} width={60} height={78} rx={4} fill={type === 'audio' ? '#d9c58c' : wind} />
        </g>
      );
  }
}

export function TransformerTypesLab(): React.JSX.Element {
  const KEY = '1.8.70';
  const [seed, newKit] = useKitSeed(KEY);
  const kit = useRng(seed, (rnd) => {
    const types = shuffle(Object.keys(TNAME) as TType[], rnd).slice(0, 6);
    const faults: TFault[] = shuffle(['openP', rnd() < 0.5 ? 'openS' : 'leak', 'good', 'good', 'good', 'good'], rnd);
    return types.map((t, k): Tx => ({type: t, fault: t === 'auto' && faults[k] === 'leak' ? 'openP' : faults[k], rp: RW[t][0] * (0.9 + rnd() * 0.2), rs: RW[t][1] * (0.9 + rnd() * 0.2)}));
  });
  const [ans, setAns] = useStoredState<Record<number, {type?: string; rp?: string; rs?: string; ps?: string; cp?: string; cs?: string; cond?: string}>>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [fn, setFn] = useState('off');
  const [note, setNote] = useState<Note>(null);
  const probes = useProbes();
  const set = (k: number, p: object) => setAns((a) => ({...a, [k]: {...a[k], ...p}}));

  const [ri, rt] = (probes.red ?? ':').split(':');
  const [bi, bt] = (probes.black ?? ':').split(':');
  const on = ri && ri === bi && rt !== bt ? Number(ri) : null;
  const pair = on != null ? [rt, bt].sort().join('-') : '';

  /** Resistance between two terminals of a transformer. */
  const between = (x: Tx, pr: string): number => {
    const rp = x.fault === 'openP' ? Infinity : x.rp;
    const rs = x.fault === 'openS' ? Infinity : x.rs;
    if (pr === 'P1-P2') return rp;
    if (pr === 'S1-S2') return rs;
    if (x.type === 'auto') {
      // One winding: S2 is the common end (= P2), S1 is the wiper.
      if (pr === 'P2-S2') return 0.02;
      if (pr === 'P2-S1') return rs;
      if (pr === 'P1-S2') return rp;
      if (pr === 'P1-S1') return Math.max(0, rp - rs);
      return Infinity;
    }
    if (x.fault === 'leak' && (pr === 'C-S1' || pr === 'C-S2')) return 35 + x.rs;
    return Infinity;
  };
  const r = on != null ? between(kit[on], pair) : Infinity;
  const {text, unit} = ohms(fn, r);

  const noteIt = () => {
    if (on == null) return setNote({kind: 'warn', text: 'Probes on two terminals of one transformer.'});
    if (fn === 'off') return setNote({kind: 'warn', text: 'Select an Ω range.'});
    const val = text === 'OL' ? 'OL' : `${text} ${unit}`;
    const field = pair === 'P1-P2' ? 'rp' : pair === 'S1-S2' ? 'rs' : pair.startsWith('C-') ? (pair.includes('P') ? 'cp' : 'cs') : 'ps';
    set(on, {[field]: val});
    setNote({kind: 'good', text: `T${on + 1} ${pair}: ${val}`});
  };

  const typeOk = (k: number) => ans[k]?.type === kit[k].type;
  const condOk = (k: number) => ans[k]?.cond === kit[k].fault;
  const measured = (k: number) => ['rp', 'rs', 'ps', 'cp', 'cs'].every((f) => !!ans[k]?.[f as 'rp']);

  return (
    <PracticalSheet
      number={KEY}
      title="Identify Different Types of Transformers and Test Them"
      aim="To identify types of transformers and test their windings for continuity and insulation with a multimeter."
      apparatus={['Six transformers (below)', 'Digital multimeter (insulation tester if available)']}
      procedure={[
        'Name each transformer from its construction and nameplate.',
        'Measure the primary (P1–P2) and secondary (S1–S2) resistance. OL means an open winding.',
        'Measure between a primary and a secondary terminal, and between a winding and the core (C). A good double-wound transformer reads OL.',
        'Decide the condition.',
      ]}
      precautions={['Test only with the transformer disconnected from mains.', 'An auto-transformer has no isolation: do not use it where isolation is needed.', 'Use an insulation tester (megger) for a proper insulation test.']}
      viva={[
        {q: 'Why does the primary of a step-down transformer have higher resistance?', a: 'It has many more turns of thinner wire.'},
        {q: 'Why does an auto-transformer show continuity between input and output?', a: 'It has only one winding shared by input and output.'},
        {q: 'Why is a CT secondary never left open?', a: 'With current in the primary, an open secondary develops a dangerously high voltage.'},
        {q: 'Why is a ferrite core used in SMPS transformers?', a: 'Ferrite has low losses at high frequency (tens of kHz).'},
      ]}
      tasks={[
        {label: 'Name all six.', done: kit.every((_, k) => typeOk(k))},
        {label: 'Measure Rp, Rs, P–S and winding–core on all six.', done: kit.every((_, k) => measured(k))},
        {label: 'Find the condition of all six.', done: kit.every((_, k) => condOk(k))},
        {label: 'Print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div>
            <div className={styles.kit}>
              <svg viewBox={`0 0 ${CW * 3} ${CH * 2}`} role="img" aria-label="Six transformers with terminals P1, P2, S1, S2 and core C">
                {kit.map((x, k) => {
                  const ox = (k % 3) * CW;
                  const oy = Math.floor(k / 3) * CH;
                  return (
                    <g key={k} transform={`translate(${ox} ${oy})`}>
                      <rect x={4} y={4} width={CW - 8} height={CH - 8} rx={8} fill="#2c3a44" stroke="#3d4d58" />
                      <text x={14} y={22} style={kitLabel}>
                        T{k + 1}
                      </text>
                      <TxArt type={x.type} />
                      <text x={100} y={126} textAnchor="middle" style={{...kitLabel, fontSize: 9, fill: '#9fb0ba'}}>
                        {MARK[x.type]}
                      </text>
                      {Object.entries(TP).map(([t, [px, py]]) => (
                        <g key={t}>
                          <text x={px} y={t === 'C' ? py - 10 : py + 20} textAnchor="middle" style={{...kitLabel, fontSize: 9}}>
                            {t}
                          </text>
                          <ProbePoint id={`${k}:${t}`} x={px} y={py} probes={probes} label={`T${k + 1} terminal ${t}`} r={4} />
                        </g>
                      ))}
                    </g>
                  );
                })}
              </svg>
            </div>
            <ProbeBar probes={probes} />
          </div>
          <div style={{display: 'grid', gap: '0.6rem', alignContent: 'start'}}>
            <Multimeter name="Digital multimeter" fn={fn} functions={OHM_FNS} text={text} unit={text === 'OL' ? '' : unit} placement={on != null ? `T${on + 1} ${pair}` : undefined} onFunction={(f) => (setNote(null), setFn(f))} />
            <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} onClick={noteIt}>
              Note reading
            </button>
          </div>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        <Table
          head={['No.', 'Type', 'Rp', 'Rs', 'P–S', 'P–core', 'S–core', 'Condition', 'Check']}
          rows={kit.map((x, k) => [
            `T${k + 1}`,
            sel(
              `T${k + 1} type`,
              ans[k]?.type,
              (Object.keys(TNAME) as TType[]).map((t) => [t, TNAME[t]]),
              (v) => set(k, {type: v}),
            ),
            <span className={styles.num}>{ans[k]?.rp ?? '–'}</span>,
            <span className={styles.num}>{ans[k]?.rs ?? '–'}</span>,
            <span className={styles.num}>{ans[k]?.ps ?? '–'}</span>,
            <span className={styles.num}>{ans[k]?.cp ?? '–'}</span>,
            <span className={styles.num}>{ans[k]?.cs ?? '–'}</span>,
            sel(`T${k + 1} condition`, ans[k]?.cond, Object.entries(FAULT_NAME), (v) => set(k, {cond: v})),
            ans[k]?.type && ans[k]?.cond ? <Verdict ok={typeOk(k) && condOk(k)} /> : '–',
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
// 1.8.71 Identify primary and secondary windings and test polarity
// ---------------------------------------------------------------------------

interface PKit {
  /** Terminal index (0–3) of: primary a, primary b, secondary a, secondary b. */
  map: [number, number, number, number];
  /** Secondary terminal that is in phase with primary a. */
  dotSec: 0 | 1;
  rp: number;
  rs: number;
  vs: number;
  mains: number;
}

const AC_FNS = [
  {fn: 'off', label: 'OFF'},
  {fn: 'r200', label: 'Ω 200'},
  {fn: 'acv20', label: 'AC V 20'},
  {fn: 'acv750', label: 'AC V 750'},
];

export function PolarityLab(): React.JSX.Element {
  const KEY = '1.8.71';
  const [seed, newKit] = useKitSeed(KEY);
  const kit = useRng(seed, (rnd): PKit => {
    const m = shuffle([0, 1, 2, 3], rnd) as PKit['map'];
    return {map: m, dotSec: rnd() < 0.5 ? 0 : 1, rp: 50 + rnd() * 15, rs: 0.8 + rnd() * 0.4, vs: 12 * (1 + (rnd() * 2 - 1) * 0.04), mains: Math.round(226 + rnd() * 10)};
  });
  const [ans, setAns] = useStoredState<{prim?: string; mode?: string; dot?: string; ratio?: string}>(`lab:${KEY}:ans`, {});
  const [rec, setRec] = useStoredState<Record<string, string>>(`lab:${KEY}:rec`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [sup, setSup] = useState<[string, string]>(['', '']);
  const [link, setLink] = useState<[string, string]>(['', '']);
  const [power, setPower] = useState(false);
  const [burnt, setBurnt] = useState(false);
  const [fn, setFn] = useState('off');
  const [note, setNote] = useState<Note>(null);
  const probes = useProbes();

  // role of a terminal index: 0 = Pa, 1 = Pb, 2 = Sa, 3 = Sb
  const role = (t: number) => kit.map.indexOf(t);
  const winding = (t: number) => (role(t) < 2 ? 'P' : 'S');

  // Node voltages as signed scalars (all in phase or anti-phase with the supply).
  const volts = (): (number | null)[] | null => {
    if (!power || burnt) return null;
    const [a, b] = sup.map(Number);
    if (winding(a) !== 'P' || winding(b) !== 'P') return null;
    const v: (number | null)[] = [null, null, null, null];
    v[a] = kit.mains;
    v[b] = 0;
    // EMF of primary a relative to primary b.
    const pa = kit.map[0];
    const sign = a === pa ? 1 : -1;
    const sDot = kit.map[2 + kit.dotSec];
    const sOther = kit.map[2 + (1 - kit.dotSec)];
    const vsec = kit.vs * (kit.mains / 230) * sign; // V(sDot) − V(sOther)
    const [l1, l2] = link.map((x) => (x === '' ? -1 : Number(x)));
    const li = [l1, l2].find((x) => x >= 0 && winding(x) === 'P');
    const ls = [l1, l2].find((x) => x >= 0 && winding(x) === 'S');
    if (li != null && ls != null) {
      v[ls] = v[li];
      const other = ls === sDot ? sOther : sDot;
      v[other] = ls === sDot ? v[li]! - vsec : v[li]! + vsec;
    }
    // Without a link the secondary floats: only Vs across it can be measured.
    return v;
  };
  const v = volts();

  const ti = (id: string | null) => (id?.startsWith('t') ? Number(id.slice(1)) : null);
  const a = ti(probes.red);
  const b = ti(probes.black);
  let text = '';
  let unit = '';
  if (fn !== 'off' && a != null && b != null && a !== b) {
    if (fn === 'r200') {
      unit = 'Ω';
      if (power) text = 'Err';
      else {
        const same = winding(a) === winding(b);
        const rr = same ? (winding(a) === 'P' ? kit.rp : kit.rs) : Infinity;
        text = rr + 0.3 >= 200 ? 'OL' : (rr + 0.3).toFixed(1);
      }
    } else {
      unit = 'V';
      let vv = 0;
      if (v) {
        const sameSec = winding(a) === 'S' && winding(b) === 'S';
        if (v[a] != null && v[b] != null) vv = Math.abs(v[a]! - v[b]!);
        else if (sameSec) vv = kit.vs * (kit.mains / 230);
      }
      const fs = fn === 'acv20' ? 20 : 750;
      text = vv >= fs ? 'OL' : fn === 'acv20' ? vv.toFixed(2) : vv.toFixed(0);
    }
  } else if (fn !== 'off') {
    unit = fn === 'r200' ? 'Ω' : 'V';
    text = fn === 'r200' ? 'OL' : fn === 'acv20' ? '0.00' : '0';
  }

  const switchOn = () => {
    if (power) return (setPower(false), setNote(null));
    if (burnt) return setNote({kind: 'warn', text: 'Transformer burnt. Replace it.'});
    const [x, y] = sup;
    if (x === '' || y === '' || x === y) return setNote({kind: 'warn', text: 'Choose two terminals for the 230 V supply.'});
    const wx = winding(Number(x));
    const wy = winding(Number(y));
    if (wx === 'S' && wy === 'S') {
      setBurnt(true);
      return setNote({kind: 'bad', text: <b>Bang! 230 V on the low-voltage winding. The fuse blew and the transformer is burnt. Find the primary first with the ohmmeter.</b>});
    }
    if (wx !== wy) return setNote({kind: 'warn', text: 'No current flows: those two terminals are on different windings.'});
    setPower(true);
    setNote({kind: 'info', text: 'Supply ON.'});
  };

  const noteIt = () => {
    if (a == null || b == null || a === b) return setNote({kind: 'warn', text: 'Place both probes.'});
    if (fn === 'off') return setNote({kind: 'warn', text: 'Select a function.'});
    if (text === 'OL' || text === 'Err') return setNote({kind: 'warn', text: text === 'Err' ? 'Switch off before measuring resistance.' : 'OL.'});
    const key = `${fn === 'r200' ? 'R' : 'V'} T${Math.min(a, b) + 1}–T${Math.max(a, b) + 1}${fn !== 'r200' && link[0] !== '' && link[1] !== '' ? ' (linked)' : ''}`;
    setRec((r) => ({...r, [key]: `${text} ${unit}`}));
    setNote({kind: 'good', text: `${key} = ${text} ${unit}`});
  };

  const linked = link[0] !== '' && link[1] !== '' && winding(Number(link[0])) !== winding(Number(link[1]));
  const priPair = [kit.map[0], kit.map[1]].sort().map((x) => `T${x + 1}`).join('+');
  const pa = kit.map[0];
  // Additive if the linked terminals are of opposite polarity.
  const linkedPolarity = (() => {
    if (!linked) return null;
    const [x, y] = link.map(Number);
    const p = winding(x) === 'P' ? x : y;
    const s = winding(x) === 'P' ? y : x;
    const pIsA = p === pa;
    const sIsDot = s === kit.map[2 + kit.dotSec];
    return pIsA === sIsDot ? 'sub' : 'add';
  })();
  const vxRecorded = Object.keys(rec).some((k) => k.endsWith('(linked)'));
  const lowestPri = Math.min(kit.map[0], kit.map[1]);
  const inPhaseWithLowest = lowestPri === pa ? kit.map[2 + kit.dotSec] : kit.map[2 + (1 - kit.dotSec)];
  const ratio = kit.mains / (kit.vs * (kit.mains / 230));

  return (
    <PracticalSheet
      number={KEY}
      title="Identify Primary and Secondary Windings and Test the Polarity of a Transformer"
      aim="To find the primary and secondary windings of an unmarked step-down transformer, and find the relative polarity of its windings by the voltmeter (additive / subtractive) method."
      apparatus={['Unmarked 230 V / 12 V transformer, terminals T1–T4', '230 V AC supply with fuse', 'Digital multimeter', 'Link wire']}
      procedure={[
        'Supply off. Measure resistance between terminal pairs. Two pairs show continuity: they are the windings.',
        'Higher resistance = primary (230 V) of a step-down transformer.',
        'Link one primary terminal to one secondary terminal.',
        'Apply 230 V to the primary. Measure Vp, Vs and Vx (across the two free terminals).',
        'Vx ≈ Vp + Vs: additive. Vx ≈ Vp − Vs: subtractive, so the linked terminals have the same polarity.',
      ]}
      precautions={['Never apply mains to a winding until you are sure it is the primary.', 'Switch off before changing the link or the supply leads.', 'Use the AC V 750 range for mains readings.']}
      viva={[
        {q: 'Why does the primary of a step-down transformer have more resistance?', a: 'It has more turns of thinner wire.'},
        {q: 'What does subtractive polarity tell you?', a: 'The two linked terminals have the same instantaneous polarity (both dotted or both undotted).'},
        {q: 'Why is polarity important?', a: 'For connecting windings in series or parallel, and for paralleling transformers. Wrong polarity can cancel the voltage or cause a short circuit.'},
        {q: 'What would happen if 230 V were applied to the 12 V winding?', a: 'Heavy current flows (the winding is overloaded), and the other winding would give about 4400 V. The fuse blows or the transformer burns.'},
      ]}
      tasks={[
        {label: 'Measure resistance of both windings.', done: Object.keys(rec).filter((k) => k.startsWith('R')).length >= 2},
        {label: 'Name the primary terminals.', done: ans.prim === priPair},
        {label: 'Do the polarity test (Vx with a link).', done: vxRecorded},
        {label: 'Additive / subtractive and the in-phase terminal.', done: ans.mode != null && ans.mode === linkedPolarity && ans.dot === `T${inPhaseWithLowest + 1}`},
        {label: 'Turns ratio from Vp ÷ Vs.', done: near(num(ans.ratio), ratio, 0.04)},
        {label: 'Print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div>
            <div className={styles.kit}>
              <svg viewBox="0 0 440 230" role="img" aria-label="Unmarked transformer with terminals T1 to T4">
                <rect x={110} y={20} width={220} height={150} fill="#6d7378" />
                {[36, 52, 68, 84, 100, 116, 132, 148].map((y) => (
                  <path key={y} d={`M110 ${y} h220`} stroke="#555b60" />
                ))}
                <rect x={160} y={32} width={120} height={126} rx={6} fill={burnt ? '#3a2416' : '#c87533'} />
                <text x={220} y={100} textAnchor="middle" style={{...kitLabel, fill: '#3a1d0a'}}>
                  {burnt ? 'BURNT' : '?'}
                </text>
                {[0, 1, 2, 3].map((t) => {
                  const x = 140 + t * 54;
                  return (
                    <g key={t}>
                      <rect x={x - 10} y={170} width={20} height={14} fill="#c9a227" />
                      <text x={x} y={218} textAnchor="middle" style={kitLabel}>
                        T{t + 1}
                      </text>
                      <ProbePoint id={`t${t}`} x={x} y={196} probes={probes} label={`Terminal T${t + 1}`} r={5} />
                    </g>
                  );
                })}
                {linked && (
                  <path d={`M${140 + Number(link[0]) * 54} 184 Q${140 + ((Number(link[0]) + Number(link[1])) / 2) * 54} 214 ${140 + Number(link[1]) * 54} 184`} stroke="#2b5fd1" strokeWidth={4} fill="none" />
                )}
                <text x={40} y={60} textAnchor="middle" style={{...kitLabel, fill: power ? '#ffcf3f' : '#9fb0ba'}}>
                  {power ? `230 V ON` : 'supply off'}
                </text>
                {power && <text x={40} y={78} textAnchor="middle" style={{...kitLabel, fontSize: 10}}>{`T${Number(sup[0]) + 1} & T${Number(sup[1]) + 1}`}</text>}
              </svg>
            </div>
            <ProbeBar probes={probes} />
          </div>
          <div style={{display: 'grid', gap: '0.6rem', alignContent: 'start'}}>
            <Multimeter name="Digital multimeter" fn={fn} functions={AC_FNS} text={text} unit={text === 'OL' ? '' : unit} onFunction={(f) => (setNote(null), setFn(f))} />
            <div className={clsx(styles.card, styles.noPrint)}>
              <span className={styles.label} style={{marginTop: 0}}>
                230 V supply to
              </span>
              <div style={{display: 'flex', gap: '0.4rem'}}>
                {[0, 1].map((j) => (
                  <select key={j} className={styles.select} aria-label={`Supply lead ${j + 1}`} value={sup[j]} disabled={power} onChange={(e) => setSup((s) => (j ? [s[0], e.target.value] : [e.target.value, s[1]]))}>
                    <option value="">{j ? 'N' : 'L'}</option>
                    {[0, 1, 2, 3].map((t) => (
                      <option key={t} value={t}>
                        T{t + 1}
                      </option>
                    ))}
                  </select>
                ))}
              </div>
              <span className={styles.label}>Link wire between</span>
              <div style={{display: 'flex', gap: '0.4rem'}}>
                {[0, 1].map((j) => (
                  <select key={j} className={styles.select} aria-label={`Link end ${j + 1}`} value={link[j]} disabled={power} onChange={(e) => setLink((s) => (j ? [s[0], e.target.value] : [e.target.value, s[1]]))}>
                    <option value="">–</option>
                    {[0, 1, 2, 3].map((t) => (
                      <option key={t} value={t}>
                        T{t + 1}
                      </option>
                    ))}
                  </select>
                ))}
              </div>
              <div className={styles.seg} role="group" aria-label="Supply" style={{marginTop: '0.5rem'}}>
                <button type="button" onClick={switchOn}>
                  Supply {power ? 'OFF' : 'ON'}
                </button>
                {burnt && (
                  <button type="button" onClick={() => (setBurnt(false), setNote({kind: 'info', text: 'New transformer fitted (same wiring).'}))}>
                    Replace transformer
                  </button>
                )}
              </div>
            </div>
            <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} onClick={noteIt}>
              Note reading
            </button>
          </div>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {Object.keys(rec).length === 0 ? (
          <p className={styles.muted}>No readings yet.</p>
        ) : (
          <Table head={['Measurement', 'Reading']} rows={Object.entries(rec).map(([k, x]) => [k, <span className={styles.num}>{x}</span>])} />
        )}
      </Section>
      <Section title="Result">
        <Table
          head={['', 'Your answer', 'Check']}
          rows={[
            [
              'Primary terminals',
              sel(
                'Primary terminals',
                ans.prim,
                [
                  ['T1+T2', 'T1 and T2'],
                  ['T1+T3', 'T1 and T3'],
                  ['T1+T4', 'T1 and T4'],
                  ['T2+T3', 'T2 and T3'],
                  ['T2+T4', 'T2 and T4'],
                  ['T3+T4', 'T3 and T4'],
                ],
                (x) => setAns((s) => ({...s, prim: x})),
              ),
              ans.prim ? <Verdict ok={ans.prim === priPair} /> : '–',
            ],
            [
              'Polarity test result',
              sel(
                'Additive or subtractive',
                ans.mode,
                [
                  ['add', 'Additive (Vx = Vp + Vs)'],
                  ['sub', 'Subtractive (Vx = Vp − Vs)'],
                ],
                (x) => setAns((s) => ({...s, mode: x})),
              ),
              ans.mode ? linkedPolarity ? <Verdict ok={ans.mode === linkedPolarity} /> : 'fit the link' : '–',
            ],
            [
              `Secondary terminal in phase with T${lowestPri + 1}`,
              sel(
                'In-phase secondary terminal',
                ans.dot,
                [0, 1, 2, 3].filter((t) => winding(t) === 'S').map((t) => [`T${t + 1}`, `T${t + 1}`]),
                (x) => setAns((s) => ({...s, dot: x})),
              ),
              ans.dot ? <Verdict ok={ans.dot === `T${inPhaseWithLowest + 1}`} /> : '–',
            ],
            [
              'Turns ratio Vp ÷ Vs',
              <input className={styles.input} style={{maxWidth: '5rem'}} inputMode="decimal" aria-label="Turns ratio" value={ans.ratio ?? ''} onChange={(e) => setAns((s) => ({...s, ratio: e.target.value}))} />,
              ans.ratio ? <Verdict ok={near(num(ans.ratio), ratio, 0.04)} /> : '–',
            ],
          ]}
        />
        <ResetKit
          onReset={() => {
            setAns({});
            setRec({});
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}
