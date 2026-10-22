import React, {useEffect, useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import {GU_1_12_120, GU_1_12_121, GU_1_12_122} from './gu';
import useStoredState from '../useStoredState';
import {Empty, NoteBox, ResetKit, Section, Table, type Note} from '../kit';
import {PanelMeter} from '../m08/ZenerRegLabs';
import {kitLabel} from '../m07/parts';
import {dLatch, ffNext, type FfKind} from './logic';
import styles from '../styles.module.css';

const Sw = ({label, on, onToggle}: {label: string; on: boolean; onToggle: () => void}) => (
  <button type="button" className={clsx(styles.btn, styles.noPrint)} aria-pressed={on} onClick={onToggle}>
    {label}: {on ? 1 : 0}
  </button>
);

// ---------------------------------------------------------------------------
// 1.12.120 Four-bit latch using IC 7475
// ---------------------------------------------------------------------------

interface LatchRow {
  d: boolean[];
  c: [boolean, boolean];
  q: boolean[];
}

export function FourBitLatchLab(): React.JSX.Element {
  const KEY = '1.12.120';
  const [d, setD] = useStoredState<boolean[]>(`lab:${KEY}:d`, [false, false, false, false]);
  const [c12, setC12] = useStoredState(`lab:${KEY}:c12`, false);
  const [c34, setC34] = useStoredState(`lab:${KEY}:c34`, false);
  const [q, setQ] = useStoredState<boolean[]>(`lab:${KEY}:q`, [false, false, false, false]);
  const [rows, setRows] = useStoredState<LatchRow[]>(`lab:${KEY}:rows`, []);
  const [note, setNote] = useState<Note>(null);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);

  useEffect(() => {
    setQ((old) => old.map((oq, i) => (i < 2 ? (c12 ? d[i] : oq) : c34 ? d[i] : oq)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d[0], d[1], d[2], d[3], c12, c34]);

  const noteIt = () => {
    setRows((r) => [...r, {d: [...d], c: [c12, c34] as [boolean, boolean], q: [...q]}].slice(-24));
    setNote({kind: 'info', text: `D = ${d.map((x) => (x ? 1 : 0)).join('')}, C1C2 = ${c12 ? 1 : 0}${c34 ? 1 : 0} → Q = ${q.map((x) => (x ? 1 : 0)).join('')}`});
  };

  const seenFollow = rows.some((r) => (r.c[0] && (r.d[0] || r.d[1]) && r.q[0] === r.d[0] && r.q[1] === r.d[1]) || (r.c[1] && (r.d[2] || r.d[3]) && r.q[2] === r.d[2] && r.q[3] === r.d[3]));
  const seenHold = rows.some((r) => (!r.c[0] && (r.q[0] !== r.d[0] || r.q[1] !== r.d[1])) || (!r.c[1] && (r.q[2] !== r.d[2] || r.q[3] !== r.d[3])));

  return (
    <PracticalSheet
      number={KEY}
      title="Four-Bit Latch Using IC 7475"
      aim="To use a 7475 quad bistable latch to store four data bits, with C1 enabling bits 1–2 and C2 enabling bits 3–4, and to show the transparent (enabled) and hold (disabled) behaviour."
      apparatus={['7475 quad D-latch IC', '+5 V supply', 'Four data switches, two enable switches', 'Four LEDs']}
      procedure={[
        'With an enable line HIGH, change its data switches: the matching Q outputs follow immediately.',
        'Set the enable line LOW: the Q outputs freeze at their last value, whatever the data switches now do.',
        'Repeat for the other nibble’s enable line.',
      ]}
      precautions={['Change data only while you intend the outputs to follow it.', 'Note the enable state together with every reading.']}
      viva={[
        {q: 'Why is 7475 called a latch, not a flip-flop?', a: 'It is level-triggered: Q follows D for as long as the enable is HIGH, not just at a clock edge.'},
        {q: 'What happens to Q1, Q2 when C1 goes LOW?', a: 'They hold (freeze at) whatever value they last had.'},
        {q: 'Why are the four bits split into two enable groups?', a: 'So two independent nibbles (or a byte split across two 7475s) can be latched at different times.'},
      ]}
      steps={[
        {label: 'Set C1 or C2 HIGH, set a data bit to 1: Q follows. Press Note reading.', hint: 'Enabled latch: Q copies D at once.', done: seenFollow},
        {label: 'Set the enable LOW and change D so it differs from Q. Note reading.', hint: 'Disabled latch: Q stays frozen.', done: seenHold},
        {label: `Note at least 4 rows. Rows: ${Math.min(rows.length, 4)}/4`, hint: 'Note the enable state with every reading.', done: rows.length >= 4},
        {label: 'Enter your details and press Print / Save as PDF.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_12_120}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div className={styles.kit}>
            <svg viewBox="0 0 420 200" role="img" aria-label="7475 quad latch: four data inputs, two enable lines, four Q outputs">
              <rect x={150} y={20} width={120} height={160} rx={6} fill="#1c2024" stroke="#565d63" />
              <text x={210} y={14} textAnchor="middle" style={{...kitLabel, fill: '#8fb4ff'}}>
                7475
              </text>
              {[0, 1, 2, 3].map((i) => (
                <g key={i}>
                  <line x1={60} y1={44 + i * 36} x2={150} y2={44 + i * 36} stroke="#9aa3a8" strokeWidth={2} />
                  <text x={64} y={38 + i * 36} style={{...kitLabel, fontSize: 9}}>
                    D{i + 1}
                  </text>
                  <line x1={270} y1={44 + i * 36} x2={360} y2={44 + i * 36} stroke="#9aa3a8" strokeWidth={2} />
                  <circle cx={360} cy={44 + i * 36} r={8} fill={q[i] ? '#ff5a4a' : '#4a5560'} />
                  <text x={372} y={48 + i * 36} style={{...kitLabel, fontSize: 9}}>
                    Q{i + 1}
                  </text>
                </g>
              ))}
              <line x1={150} y1={68} x2={130} y2={68} stroke={c12 ? '#f2c230' : '#6b7a84'} strokeWidth={2} />
              <text x={100} y={64} textAnchor="middle" style={{...kitLabel, fontSize: 9}}>
                C1
              </text>
              <line x1={150} y1={140} x2={130} y2={140} stroke={c34 ? '#f2c230' : '#6b7a84'} strokeWidth={2} />
              <text x={100} y={136} textAnchor="middle" style={{...kitLabel, fontSize: 9}}>
                C2
              </text>
            </svg>
          </div>
          <div style={{display: 'grid', gap: '0.4rem', alignContent: 'start'}}>
            {[0, 1, 2, 3].map((i) => (
              <Sw key={i} label={`D${i + 1}`} on={d[i]} onToggle={() => setD((x) => x.map((v, j) => (j === i ? !v : v)))} />
            ))}
            <Sw label="C1 (enable 1–2)" on={c12} onToggle={() => setC12((x) => !x)} />
            <Sw label="C2 (enable 3–4)" on={c34} onToggle={() => setC34((x) => !x)} />
            <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} onClick={noteIt}>
              Note reading
            </button>
          </div>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {rows.length === 0 ? <Empty>No readings yet.</Empty> : <Table head={['D1', 'D2', 'D3', 'D4', 'C1', 'C2', 'Q1', 'Q2', 'Q3', 'Q4']} rows={rows.map((r) => [...r.d.map((v) => (v ? 1 : 0)), r.c[0] ? 1 : 0, r.c[1] ? 1 : 0, ...r.q.map((v) => (v ? 1 : 0))])} />}
      </Section>
      <Section title="Result">
        <ResetKit
          onReset={() => {
            setD([false, false, false, false]);
            setC12(false);
            setC34(false);
            setQ([false, false, false, false]);
            setRows([]);
            setPrinted(false);
          }}
        />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// 1.12.121 R-S flip-flop using IC 7400, with and without a clock pulse
// ---------------------------------------------------------------------------

interface RsRow {
  s: boolean;
  r: boolean;
  clocked: boolean;
  q: boolean;
  invalid: boolean;
}

export function RsFlipFlopLab(): React.JSX.Element {
  const KEY = '1.12.121';
  const [s, setS] = useStoredState(`lab:${KEY}:s`, true);
  const [r, setR] = useStoredState(`lab:${KEY}:r`, true);
  const [clocked, setClocked] = useStoredState(`lab:${KEY}:clocked`, false);
  const [q, setQ] = useStoredState(`lab:${KEY}:q`, false);
  const [invalid, setInvalid] = useState(false);
  const [rows, setRows] = useStoredState<RsRow[]>(`lab:${KEY}:rows`, []);
  const [note, setNote] = useState<Note>(null);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);

  // Direct mode is the bare two-NAND latch: its S-bar and R-bar inputs are active-LOW.
  useEffect(() => {
    if (clocked) {
      setInvalid(false);
      return;
    }
    const n = ffNext('rs', !s, !r, q);
    setQ(n.q);
    setInvalid(n.invalid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, r, clocked]);

  const pulse = () => {
    const n = ffNext('rs', s, r, q);
    setQ(n.q);
    setInvalid(n.invalid);
    setNote({kind: n.invalid ? 'warn' : 'info', text: n.invalid ? 'S = R = 1: both NAND outputs try to go HIGH together — invalid state.' : `Clock pulsed: Q = ${n.q ? 1 : 0}.`});
  };

  const noteIt = () => {
    setRows((r2) => [...r2, {s, r, clocked, q, invalid}].slice(-24));
    setNote({kind: 'info', text: `${clocked ? 'S' : 'S̄'} ${s ? 1 : 0}, ${clocked ? 'R' : 'R̄'} ${r ? 1 : 0} ${clocked ? '(clocked)' : '(direct)'} → Q = ${q ? 1 : 0}${invalid ? ' (invalid)' : ''}`});
  };

  const eff = (x: RsRow) => (x.clocked ? {set: x.s, reset: x.r} : {set: !x.s, reset: !x.r});
  const seenSet = rows.some((x) => !x.clocked && !x.invalid && eff(x).set && !eff(x).reset && x.q);
  const seenReset = rows.some((x) => !x.clocked && !x.invalid && !eff(x).set && eff(x).reset && !x.q);
  const seenHold = rows.some((x) => !x.clocked && x.s && x.r && x.q);
  const seenInvalid = rows.some((x) => x.invalid);
  const pending = (x: RsRow) => x.clocked && ((x.s && !x.r && !x.q) || (!x.s && x.r && x.q));
  const seenClockHold = rows.some((x, i) => i > 0 && pending(rows[i - 1]) && x.clocked && x.s === rows[i - 1].s && x.r === rows[i - 1].r && x.q === x.s);

  return (
    <PracticalSheet
      number={KEY}
      title="R-S Flip-Flop Using IC 7400, With and Without a Clock"
      aim="To build an R-S flip-flop from cross-coupled NAND gates of a 7400, operate it directly (asynchronous) and through two clock-gating NAND gates, and observe Set, Reset, Hold and the invalid S = R = 1 state."
      apparatus={['7400 (quad NAND) IC', '+5 V supply', 'S and R switches', 'Clock pulse push-button', 'Q and Q̄ LEDs']}
      procedure={[
        'Direct mode (two NAND gates): S̄ and R̄ are active-LOW. S̄ = 0 sets Q, R̄ = 0 resets it, S̄ = R̄ = 1 holds it.',
        'S̄ = R̄ = 0: note that both outputs go HIGH and Q is not a valid state.',
        'Switch to clocked mode (two steering NAND gates added): S and R are now active-HIGH and do nothing until the clock button is pressed.',
        'Set S, R and note Q, press the clock button, then note Q again: it updates to match S, R.',
      ]}
      precautions={['Avoid S̄ = R̄ = 0 in direct mode and S = R = 1 in clocked mode.', 'In clocked mode, set S and R before pressing the clock button.']}
      viva={[
        {q: 'Why is S̄ = R̄ = 0 invalid for a NAND S-R latch?', a: 'Both NAND outputs are forced HIGH, and the final state is unpredictable when both inputs are released together.'},
        {q: 'What does adding two clock-gating NAND gates achieve?', a: 'It lets S and R change freely, but the latch only acts on them when the clock input is active — a gated (clocked) S-R flip-flop.'},
        {q: 'What is the hold condition?', a: 'S̄ = R̄ = 1 (direct) or no clock pulse (clocked): Q keeps its last value.'},
      ]}
      steps={[
        {label: 'Direct mode: set S̄ = 0, R̄ = 1. Q goes to 1. Note reading.', hint: 'S̄ and R̄ are active-LOW.', done: seenSet},
        {label: 'Set S̄ = R̄ = 1: Q stays 1 (hold). Note reading.', hint: 'Q must be 1 before you try hold.', done: seenHold},
        {label: 'Set S̄ = 1, R̄ = 0. Q goes to 0. Note reading.', hint: 'R̄ = 0 resets the latch.', done: seenReset},
        {label: 'Set S̄ = R̄ = 0: the invalid state. Note reading.', hint: 'Both outputs go HIGH. Avoid this in real use.', done: seenInvalid},
        {label: 'Clocked mode: set S, R and note Q, press the clock, note Q again.', hint: 'Q changes only after the clock pulse.', done: seenClockHold},
        {label: 'Enter your details and press Print / Save as PDF.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_12_121}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div className={styles.kit}>
            <svg viewBox="0 0 420 220" role="img" aria-label={`S-R flip-flop from NAND gates, ${clocked ? 'clocked' : 'direct'} mode, Q ${q ? 'HIGH' : 'LOW'}`}>
              <text x={60} y={40} style={kitLabel}>
                {clocked ? 'S' : 'S̄'}
              </text>
              <text x={60} y={180} style={kitLabel}>
                {clocked ? 'R' : 'R̄'}
              </text>
              {clocked && (
                <>
                  <path d="M40 60 H90 M40 60 L70 46 L70 74 Z" fill="none" stroke="#9aa3a8" strokeWidth={2} />
                  <circle cx={74} cy={60} r={3} fill="none" stroke="#9aa3a8" />
                  <path d="M40 160 H90 M40 160 L70 146 L70 174 Z" fill="none" stroke="#9aa3a8" strokeWidth={2} />
                  <circle cx={74} cy={160} r={3} fill="none" stroke="#9aa3a8" />
                  <line x1={60} y1={110} x2={60} y2={60} stroke="#9aa3a8" strokeWidth={2} />
                  <line x1={60} y1={110} x2={60} y2={160} stroke="#9aa3a8" strokeWidth={2} />
                  <text x={44} y={114} style={{...kitLabel, fontSize: 9}}>
                    CLK
                  </text>
                </>
              )}
              <path d="M150 50 H200 M150 50 L180 36 L180 64 Z" fill="none" stroke="#9aa3a8" strokeWidth={2} />
              <circle cx={184} cy={50} r={3} fill="none" stroke="#9aa3a8" />
              <text x={165} y={30} textAnchor="middle" style={{...kitLabel, fontSize: 9}}>
                NAND1
              </text>
              <path d="M150 170 H200 M150 170 L180 156 L180 184 Z" fill="none" stroke="#9aa3a8" strokeWidth={2} />
              <circle cx={184} cy={170} r={3} fill="none" stroke="#9aa3a8" />
              <text x={165} y={200} textAnchor="middle" style={{...kitLabel, fontSize: 9}}>
                NAND2
              </text>
              <path d="M187 50 H260 V150 H200" fill="none" stroke="#9aa3a8" strokeWidth={1.5} strokeDasharray="3 3" />
              <path d="M187 170 H260 V70 H200" fill="none" stroke="#9aa3a8" strokeWidth={1.5} strokeDasharray="3 3" />
              <line x1={187} y1={50} x2={320} y2={50} stroke="#9aa3a8" strokeWidth={2} />
              <circle cx={340} cy={50} r={9} fill={q || invalid ? '#ff5a4a' : '#4a5560'} />
              <text x={352} y={54} style={kitLabel}>
                Q
              </text>
              <line x1={187} y1={170} x2={320} y2={170} stroke="#9aa3a8" strokeWidth={2} />
              <circle cx={340} cy={170} r={9} fill={!q || invalid ? '#ff5a4a' : '#4a5560'} />
              <text x={352} y={174} style={kitLabel}>
                Q̄
              </text>
              {invalid && (
                <text x={210} y={110} textAnchor="middle" style={{...kitLabel, fill: '#ff6b5a', fontSize: 11}}>
                  invalid
                </text>
              )}
            </svg>
          </div>
          <div style={{display: 'grid', gap: '0.4rem', alignContent: 'start'}}>
            <Sw label={clocked ? 'S' : 'S̄'} on={s} onToggle={() => setS((x) => !x)} />
            <Sw label={clocked ? 'R' : 'R̄'} on={r} onToggle={() => setR((x) => !x)} />
            <Sw
              label="Clocked mode"
              on={clocked}
              onToggle={() => {
                setClocked(!clocked);
                setS(clocked);
                setR(clocked);
              }}
            />
            {clocked && (
              <button type="button" className={clsx(styles.btn, styles.noPrint)} onClick={pulse}>
                Clock pulse
              </button>
            )}
            <PanelMeter label="Q" value={invalid ? 'X' : q ? '1' : '0'} unit="" />
            <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} onClick={noteIt}>
              Note reading
            </button>
          </div>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {rows.length === 0 ? <Empty>No readings yet.</Empty> : <Table head={['S / S̄', 'R / R̄', 'Mode', 'Q']} rows={rows.map((x) => [x.s ? 1 : 0, x.r ? 1 : 0, x.clocked ? 'Clocked' : 'Direct', x.invalid ? 'invalid' : x.q ? 1 : 0])} />}
      </Section>
      <Section title="Result">
        <ResetKit
          onReset={() => {
            setS(true);
            setR(true);
            setClocked(false);
            setQ(false);
            setRows([]);
            setPrinted(false);
          }}
        />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// 1.12.122 Verify the truth tables of flip-flop ICs (RS, D, T, JK, MSJK)
// ---------------------------------------------------------------------------

const FF_TYPES: {id: FfKind; name: string; aLabel: string; bLabel?: string}[] = [
  {id: 'rs', name: 'R-S', aLabel: 'S', bLabel: 'R'},
  {id: 'd', name: 'D', aLabel: 'D'},
  {id: 't', name: 'T', aLabel: 'T'},
  {id: 'jk', name: 'JK', aLabel: 'J', bLabel: 'K'},
  {id: 'msjk', name: 'Master-Slave JK', aLabel: 'J', bLabel: 'K'},
];

interface FfRow {
  type: FfKind;
  a: boolean;
  b: boolean;
  qPrev: boolean;
  q: boolean;
  invalid: boolean;
}

export function FlipFlopTruthLab(): React.JSX.Element {
  const KEY = '1.12.122';
  const [type, setType] = useState<FfKind>('rs');
  const [a, setA] = useState(false);
  const [b, setB] = useState(false);
  const [q, setQ] = useStoredState<Record<FfKind, boolean>>(`lab:${KEY}:q`, {rs: false, d: false, t: false, jk: false, msjk: false});
  const [rows, setRows] = useStoredState<FfRow[]>(`lab:${KEY}:rows`, []);
  const [note, setNote] = useState<Note>(null);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);

  const spec = FF_TYPES.find((f) => f.id === type)!;
  const qNow = q[type];

  const pulse = () => {
    const n = ffNext(type, a, spec.bLabel ? b : false, qNow);
    setQ((x) => ({...x, [type]: n.q}));
    const bb = spec.bLabel ? b : false;
    setRows((r) => [...r.filter((x) => !(x.type === type && x.a === a && x.b === bb && x.qPrev === qNow)), {type, a, b: bb, qPrev: qNow, q: n.q, invalid: n.invalid}]);
    setNote({kind: n.invalid ? 'warn' : 'info', text: n.invalid ? 'Invalid input combination for this flip-flop.' : `Q(t) = ${qNow ? 1 : 0} → Q(t+1) = ${n.q ? 1 : 0}`});
  };

  const rowsFor = rows.filter((r) => r.type === type);
  const combos = (k: FfKind) => new Set(rows.filter((r) => r.type === k).map((r) => `${r.a}${r.b}`)).size;

  return (
    <PracticalSheet
      number={KEY}
      title="Verify the Truth Tables of Flip-Flop ICs"
      aim="To apply inputs and a clock pulse to an R-S, D, T, JK and master-slave JK flip-flop in turn, and build up each one's next-state truth table: Q(t) and the inputs give Q(t+1)."
      apparatus={['7474 (D), 7476 (JK), CD4027 (JK) or similar flip-flop ICs', '+5 V supply', 'Two input switches', 'Clock pulse push-button', 'Q LED']}
      procedure={[
        'Choose a flip-flop type. Set its inputs, then press the clock pulse button.',
        'Note Q before the pulse (Q(t)) and after it (Q(t+1)).',
        'Try every input combination for that type, then move to the next type.',
      ]}
      precautions={['Set the inputs before pressing the clock button, not while holding it.', 'An R-S flip-flop’s S = R = 1 is invalid — note it as such, not as a 0 or 1.']}
      viva={[
        {q: 'What is special about a T flip-flop?', a: 'T = 1 toggles Q every clock pulse; T = 0 holds it — it has no Set/Reset/Hold distinction, just toggle or hold.'},
        {q: 'What makes JK better than R-S?', a: 'J = K = 1 gives a defined toggle action instead of the R-S latch’s invalid state.'},
        {q: 'How can a JK flip-flop be made to work as a D or a T flip-flop?', a: 'Tie K = J̄ for D-type action; tie J = K = T for T-type action.'},
      ]}
      steps={[
        {label: 'R-S: try all 4 input combinations, including S = R = 1.', hint: `Select R-S, set S and R, press the clock. Combinations: ${combos('rs')}/4`, done: combos('rs') >= 4 && rows.some((r) => r.type === 'rs' && r.invalid)},
        {label: 'D: try both values of D.', hint: `Select D. Q follows D after the clock. Combinations: ${combos('d')}/2`, done: combos('d') >= 2},
        {label: 'T: try T = 0 and T = 1.', hint: `Select T. T = 1 toggles Q. Combinations: ${combos('t')}/2`, done: combos('t') >= 2},
        {label: 'JK: try all 4 combinations.', hint: `Select JK. J = K = 1 toggles Q. Combinations: ${combos('jk')}/4`, done: combos('jk') >= 4},
        {label: 'Master-slave JK: try all 4 combinations.', hint: `Select Master-Slave JK. Combinations: ${combos('msjk')}/4`, done: combos('msjk') >= 4},
        {label: 'Enter your details and press Print / Save as PDF.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_12_122}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={clsx(styles.seg, styles.noPrint)} role="group" aria-label="Flip-flop type" style={{marginBottom: '0.6rem'}}>
          {FF_TYPES.map((f) => (
            <button key={f.id} type="button" aria-pressed={type === f.id} onClick={() => (setType(f.id), setNote(null))}>
              {f.name}
            </button>
          ))}
        </div>
        <div className={styles.controls} style={{marginTop: 0}}>
          <Sw label={spec.aLabel} on={a} onToggle={() => setA((x) => !x)} />
          {spec.bLabel && <Sw label={spec.bLabel} on={b} onToggle={() => setB((x) => !x)} />}
          <PanelMeter label="Q" value={qNow ? '1' : '0'} unit="" />
          <button type="button" className={clsx(styles.btn, styles.noPrint)} onClick={pulse}>
            Clock pulse
          </button>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {rowsFor.length === 0 ? (
          <Empty>No readings yet for {spec.name}.</Empty>
        ) : (
          <Table
            head={spec.bLabel ? [spec.aLabel, spec.bLabel, 'Q(t)', 'Q(t+1)'] : [spec.aLabel, 'Q(t)', 'Q(t+1)']}
            rows={rowsFor.map((r) => (spec.bLabel ? [r.a ? 1 : 0, r.b ? 1 : 0, r.qPrev ? 1 : 0, r.invalid ? 'invalid' : r.q ? 1 : 0] : [r.a ? 1 : 0, r.qPrev ? 1 : 0, r.invalid ? 'invalid' : r.q ? 1 : 0]))}
          />
        )}
      </Section>
      <Section title="Result">
        <ResetKit
          onReset={() => {
            setRows([]);
            setQ({rs: false, d: false, t: false, jk: false, msjk: false});
            setPrinted(false);
          }}
        />
      </Section>
    </PracticalSheet>
  );
}
