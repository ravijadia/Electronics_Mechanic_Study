import React, {useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import {Empty, NoteBox, ResetKit, Section, Table, type Note} from '../kit';
import useStoredState from '../useStoredState';
import {useLogicBoard, type IcSpec, type LedSpec, type SwitchSpec} from './LogicBench';
import styles from '../styles.module.css';

const bits4 = (n: number) => [!!(n & 2), !!(n & 1)];

// ---------------------------------------------------------------------------
// 1.12.115 2-to-4 line decoder (7404 NOT + 7408 AND)
// ---------------------------------------------------------------------------

const DEC_ICS: IcSpec[] = [
  {id: 'U1', type: '7404', x: 150, y: 20},
  {id: 'U2', type: '7408', x: 150, y: 190},
];
const DEC_LEDS: LedSpec[] = [0, 1, 2, 3].map((i) => ({id: `Y${i}`, x: 420, y: 40 + i * 70, label: `Y${i}`}));

export function DecoderLab(): React.JSX.Element {
  const KEY = '1.12.115';
  const [note, setNote] = useState<Note>(null);
  const [rows, setRows] = useStoredState<Record<number, number[]>>(`lab:${KEY}:rows`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const board = useLogicBoard({
    storeKey: KEY,
    ics: DEC_ICS,
    switches: [{id: 'A1', x: 50, y: 60, label: 'A1'}, {id: 'A0', x: 50, y: 230, label: 'A0'}],
    leds: DEC_LEDS,
    gndY: 330,
  });

  const a1 = board.switchVal('A1');
  const a0 = board.switchVal('A0');
  const code = (a1 ? 2 : 0) + (a0 ? 1 : 0);
  const outs = [0, 1, 2, 3].map((i) => board.bit(`LED.Y${i}`));

  const noteIt = () => {
    if (outs.some((o) => o == null)) return setNote({kind: 'warn', text: 'One or more outputs float: finish wiring all four Y lines.'});
    const seen = outs.map((o) => (o ? 1 : 0));
    setRows((r) => ({...r, [code]: seen}));
    const ok = seen.every((v, i) => v === (i === code ? 1 : 0));
    setNote(ok ? {kind: 'good', text: `Correct: only Y${code} is HIGH.`} : {kind: 'bad', text: `Expected only Y${code} HIGH. Check the NOT and AND wiring.`});
  };

  const done = [0, 1, 2, 3].every((c) => rows[c] && rows[c].every((v, i) => v === (i === c ? 1 : 0)));

  return (
    <PracticalSheet
      number={KEY}
      title="2-to-4 Line Decoder"
      aim="To build a 2-to-4 line decoder from NOT and AND gates: each output Yi is HIGH only for the input code i, built as Y0=A1'A0', Y1=A1'A0, Y2=A1A0', Y3=A1A0."
      apparatus={['7404 (hex NOT) IC', '7408 (quad AND) IC', '+5 V supply', 'Two toggle switches', 'Four LEDs']}
      procedure={[
        'Invert A1 and A0 using two NOT gates to get A1’ and A0’.',
        'Wire four AND gates: Y0 = A1’·A0’, Y1 = A1’·A0, Y2 = A1·A0’, Y3 = A1·A0.',
        'Set A1A0 to each of 00, 01, 10, 11 and note which single LED lights.',
      ]}
      precautions={['Only one output should ever be HIGH at a time.', 'Do not leave any gate input unconnected.']}
      viva={[
        {q: 'How many outputs does a decoder with n inputs have?', a: '2^n — a 2-input decoder has four outputs.'},
        {q: 'Why is a decoder used to drive seven-segment displays or select memory addresses?', a: 'It turns a compact binary code into exactly one active output line, used to pick one of several destinations.'},
      ]}
      tasks={[
        {label: 'All four input codes tried.', done: Object.keys(rows).length >= 4},
        {label: 'Exactly one output HIGH for every code.', done},
        {label: 'Print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.kit}>{board.view(480, 350)}</div>
        {board.bar}
        <div className={clsx(styles.controls, styles.noPrint)} style={{marginTop: '0.4rem'}}>
          <button type="button" className={clsx(styles.btn, styles.primary)} onClick={noteIt}>
            Note reading
          </button>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {Object.keys(rows).length === 0 ? (
          <Empty>No readings yet.</Empty>
        ) : (
          <Table head={['A1', 'A0', 'Y0', 'Y1', 'Y2', 'Y3']} rows={Object.entries(rows).map(([c, v]) => [bits4(Number(c))[0] ? 1 : 0, bits4(Number(c))[1] ? 1 : 0, ...v])} />
        )}
      </Section>
      <Section title="Result">
        <Table head={['', '']} rows={[['Truth table verified', done ? '✓' : '–']]} />
        <ResetKit onReset={() => (setRows({}), setPrinted(false))} />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// 1.12.116 4-to-2 line encoder (7432 OR)
// ---------------------------------------------------------------------------

const ENC_ICS: IcSpec[] = [{id: 'U1', type: '7432', x: 190, y: 60}];
const ENC_SW: SwitchSpec[] = [0, 1, 2, 3].map((i) => ({id: `I${i}`, x: 50, y: 40 + i * 60, label: `I${i}`}));

export function EncoderLab(): React.JSX.Element {
  const KEY = '1.12.116';
  const [note, setNote] = useState<Note>(null);
  const [rows, setRows] = useStoredState<Record<number, [number, number]>>(`lab:${KEY}:rows`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const board = useLogicBoard({
    storeKey: KEY,
    ics: ENC_ICS,
    switches: ENC_SW,
    leds: [{id: 'Y1', x: 420, y: 100, label: 'Y1'}, {id: 'Y0', x: 420, y: 200, label: 'Y0'}],
    gndY: 290,
  });

  const active = [0, 1, 2, 3].filter((i) => board.switchVal(`I${i}`));
  const y1 = board.bit('LED.Y1');
  const y0 = board.bit('LED.Y0');
  const expY1 = board.switchVal('I2') || board.switchVal('I3');
  const expY0 = board.switchVal('I1') || board.switchVal('I3');

  const noteIt = () => {
    if (active.length !== 1) return setNote({kind: 'warn', text: 'Switch exactly one input ON — a basic encoder only works for a single active input.'});
    if (y1 == null || y0 == null) return setNote({kind: 'warn', text: 'Y1 and/or Y0 float: finish the OR-gate wiring.'});
    setRows((r) => ({...r, [active[0]]: [y1 ? 1 : 0, y0 ? 1 : 0]}));
    setNote(y1 === expY1 && y0 === expY0 ? {kind: 'good', text: `Correct: Y1Y0 = ${y1 ? 1 : 0}${y0 ? 1 : 0} for I${active[0]} active.`} : {kind: 'bad', text: 'Output code does not match the active input. Check the OR-gate wiring.'});
  };

  const done = [0, 1, 2, 3].every((i) => rows[i] && rows[i][0] === (i >= 2 ? 1 : 0) && rows[i][1] === (i === 1 || i === 3 ? 1 : 0));

  return (
    <PracticalSheet
      number={KEY}
      title="4-to-2 Line Encoder"
      aim="To build a 4-to-2 line encoder from OR gates: with only one input active at a time, Y1 = I2 OR I3 and Y0 = I1 OR I3 give the binary code of the active input."
      apparatus={['7432 (quad OR) IC', '+5 V supply', 'Four toggle switches', 'Two LEDs']}
      procedure={[
        'Wire Y1 = I2 OR I3 and Y0 = I1 OR I3 using two of the four OR gates.',
        'Switch on I0 alone, then I1 alone, then I2 alone, then I3 alone, noting Y1Y0 each time.',
        'Leave the other inputs off while testing each one.',
      ]}
      precautions={['Only one input switch should be ON at a time.', 'Do not leave any gate input unconnected.']}
      viva={[
        {q: 'What happens if two encoder inputs are active together?', a: 'A basic encoder gives a wrong or ambiguous code; a priority encoder is needed to resolve it.'},
        {q: 'How many inputs does an encoder with a 2-bit output have?', a: 'Four (2^2).'},
      ]}
      tasks={[
        {label: 'All four single-active-input cases tried.', done: Object.keys(rows).length >= 4},
        {label: 'Output code correct for every case.', done},
        {label: 'Print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.kit}>{board.view(480, 320)}</div>
        {board.bar}
        <div className={clsx(styles.controls, styles.noPrint)} style={{marginTop: '0.4rem'}}>
          <button type="button" className={clsx(styles.btn, styles.primary)} onClick={noteIt}>
            Note reading
          </button>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {Object.keys(rows).length === 0 ? (
          <Empty>No readings yet.</Empty>
        ) : (
          <Table head={['Active input', 'Y1', 'Y0']} rows={Object.entries(rows).map(([i, v]) => [`I${i}`, v[0], v[1]])} />
        )}
      </Section>
      <Section title="Result">
        <Table head={['', '']} rows={[['Truth table verified', done ? '✓' : '–']]} />
        <ResetKit onReset={() => (setRows({}), setPrinted(false))} />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// 1.12.117 4-to-1 multiplexer / 1.12.118 1-to-4 demultiplexer
// Both share a decode stage: NOT (7404) + AND (7408) gives the one-hot
// select lines, exactly like the 2-to-4 decoder above.
// ---------------------------------------------------------------------------

const MUX_ICS: IcSpec[] = [
  {id: 'U1', type: '7404', x: 140, y: 20},
  {id: 'U2', type: '7408', x: 140, y: 190}, // decode AND gates
  {id: 'U3', type: '7408', x: 140, y: 360}, // data gating AND gates
  {id: 'U4', type: '7432', x: 140, y: 530}, // combine OR tree
];

export function MuxLab(): React.JSX.Element {
  const KEY = '1.12.117';
  const [note, setNote] = useState<Note>(null);
  const [rows, setRows] = useStoredState<Record<number, number>>(`lab:${KEY}:rows`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const board = useLogicBoard({
    storeKey: KEY,
    ics: MUX_ICS,
    switches: [
      {id: 'S1', x: 50, y: 60, label: 'S1'},
      {id: 'S0', x: 50, y: 230, label: 'S0'},
      {id: 'I0', x: 420, y: 400, label: 'I0'},
      {id: 'I1', x: 420, y: 440, label: 'I1'},
      {id: 'I2', x: 420, y: 480, label: 'I2'},
      {id: 'I3', x: 420, y: 520, label: 'I3'},
    ],
    leds: [{id: 'Y', x: 420, y: 600, label: 'Y'}],
    gndY: 680,
  });

  const s1 = board.switchVal('S1');
  const s0 = board.switchVal('S0');
  const sel = (s1 ? 2 : 0) + (s0 ? 1 : 0);
  const data = [0, 1, 2, 3].map((i) => board.switchVal(`I${i}`));
  const y = board.bit('LED.Y');
  const expect = data[sel];

  const noteIt = () => {
    if (y == null) return setNote({kind: 'warn', text: 'Y floats: complete the decode → data-gate → OR-tree wiring.'});
    setRows((r) => ({...r, [sel]: y ? 1 : 0}));
    setNote(y === expect ? {kind: 'good', text: `Correct: Y follows I${sel}.`} : {kind: 'bad', text: `Y should equal I${sel} (${expect ? 1 : 0}) for this select code.`});
  };

  const done = [0, 1, 2, 3].every((s) => rows[s] != null && rows[s] === (data[s] ? 1 : 0));

  return (
    <PracticalSheet
      number={KEY}
      title="4-to-1 Multiplexer"
      aim="To build a 4:1 multiplexer: a 2-line decoder selects which one of four data lines (I0–I3) is gated through to the single output Y."
      apparatus={['7404 (hex NOT), two 7408 (quad AND), 7432 (quad OR) ICs', '+5 V supply', 'Six toggle switches (2 select, 4 data)', 'LED']}
      procedure={[
        'Decode S1, S0 into four one-hot select lines (as in the 2-to-4 decoder).',
        'AND each select line with its matching data input (select0·I0, select1·I1, select2·I2, select3·I3).',
        'OR the four results together to get Y.',
        'Set a data pattern on I0–I3, then step S1S0 through 00, 01, 10, 11 and check Y follows the selected input.',
      ]}
      precautions={['Match each AND gate to the correct select line and data input.', 'Do not leave any gate input unconnected.']}
      viva={[
        {q: 'How many select lines does a 4:1 MUX need?', a: 'Two (log₂ 4).'},
        {q: 'What does a multiplexer do?', a: 'Connects one of several input lines to a single output, chosen by the select lines.'},
      ]}
      tasks={[
        {label: 'All four select codes tried.', done: Object.keys(rows).length >= 4},
        {label: 'Y follows the selected data input every time.', done},
        {label: 'Print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.kit}>{board.view(480, 700)}</div>
        {board.bar}
        <div className={clsx(styles.controls, styles.noPrint)} style={{marginTop: '0.4rem'}}>
          <button type="button" className={clsx(styles.btn, styles.primary)} onClick={noteIt}>
            Note reading
          </button>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {Object.keys(rows).length === 0 ? (
          <Empty>No readings yet.</Empty>
        ) : (
          <Table head={['S1', 'S0', 'I0', 'I1', 'I2', 'I3', 'Y']} rows={Object.entries(rows).map(([s, v]) => [bits4(Number(s))[0] ? 1 : 0, bits4(Number(s))[1] ? 1 : 0, ...data.map((d) => (d ? 1 : 0)), v])} />
        )}
      </Section>
      <Section title="Result">
        <Table head={['', '']} rows={[['Truth table verified', done ? '✓' : '–']]} />
        <ResetKit onReset={() => (setRows({}), setPrinted(false))} />
      </Section>
    </PracticalSheet>
  );
}

const DEMUX_ICS: IcSpec[] = [
  {id: 'U1', type: '7404', x: 140, y: 20},
  {id: 'U2', type: '7408', x: 140, y: 190}, // decode AND gates
  {id: 'U3', type: '7408', x: 140, y: 360}, // data gating AND gates
];

export function DemuxLab(): React.JSX.Element {
  const KEY = '1.12.118';
  const [note, setNote] = useState<Note>(null);
  const [rows, setRows] = useStoredState<Record<number, number[]>>(`lab:${KEY}:rows`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const board = useLogicBoard({
    storeKey: KEY,
    ics: DEMUX_ICS,
    switches: [{id: 'S1', x: 50, y: 60, label: 'S1'}, {id: 'S0', x: 50, y: 230, label: 'S0'}, {id: 'D', x: 50, y: 400, label: 'D'}],
    leds: [0, 1, 2, 3].map((i) => ({id: `Y${i}`, x: 420, y: 70 + i * 70, label: `Y${i}`})),
    gndY: 500,
  });

  const s1 = board.switchVal('S1');
  const s0 = board.switchVal('S0');
  const d = board.switchVal('D');
  const sel = (s1 ? 2 : 0) + (s0 ? 1 : 0);
  const outs = [0, 1, 2, 3].map((i) => board.bit(`LED.Y${i}`));

  const noteIt = () => {
    if (outs.some((o) => o == null)) return setNote({kind: 'warn', text: 'One or more outputs float: finish wiring all four data-gate ANDs.'});
    const seen = outs.map((o) => (o ? 1 : 0));
    setRows((r) => ({...r, [sel]: seen}));
    const ok = seen.every((v, i) => v === (i === sel ? (d ? 1 : 0) : 0));
    setNote(ok ? {kind: 'good', text: `Correct: Y${sel} follows D, the rest stay 0.`} : {kind: 'bad', text: `Only Y${sel} should follow D; the others should stay 0.`});
  };

  const done = [0, 1, 2, 3].every((s) => rows[s] && rows[s].every((v, i) => v === (i === s ? 1 : 0)));

  return (
    <PracticalSheet
      number={KEY}
      title="1-to-4 Demultiplexer"
      aim="To build a 1:4 demultiplexer: a 2-line decoder picks one output line, which is then ANDed with the single data input D so only that line follows D."
      apparatus={['7404 (hex NOT), two 7408 (quad AND) ICs', '+5 V supply', 'Three toggle switches', 'Four LEDs']}
      procedure={[
        'Decode S1, S0 into four one-hot select lines.',
        'AND each select line with D to get Y0–Y3.',
        'With D = 1, step S1S0 through 00, 01, 10, 11 and check only the selected Y follows D while the rest stay 0.',
        'With D = 0, check all four outputs stay 0 regardless of the select lines.',
      ]}
      precautions={['Match each AND gate to the correct select line.', 'Do not leave any gate input unconnected.']}
      viva={[
        {q: 'What does a demultiplexer do?', a: 'Routes a single input line to one of several outputs, chosen by the select lines — the reverse of a multiplexer.'},
        {q: 'What should the non-selected outputs read?', a: 'Logic 0, regardless of D.'},
      ]}
      tasks={[
        {label: 'All four select codes tried with D = 1.', done: Object.keys(rows).length >= 4},
        {label: 'Only the selected output follows D each time.', done},
        {label: 'Print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.kit}>{board.view(480, 530)}</div>
        {board.bar}
        <div className={clsx(styles.controls, styles.noPrint)} style={{marginTop: '0.4rem'}}>
          <button type="button" className={clsx(styles.btn, styles.primary)} onClick={noteIt}>
            Note reading
          </button>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {Object.keys(rows).length === 0 ? (
          <Empty>No readings yet.</Empty>
        ) : (
          <Table head={['S1', 'S0', 'D', 'Y0', 'Y1', 'Y2', 'Y3']} rows={Object.entries(rows).map(([s, v]) => [bits4(Number(s))[0] ? 1 : 0, bits4(Number(s))[1] ? 1 : 0, d ? 1 : 0, ...v])} />
        )}
      </Section>
      <Section title="Result">
        <Table head={['', '']} rows={[['Truth table verified', done ? '✓' : '–']]} />
        <ResetKit onReset={() => (setRows({}), setPrinted(false))} />
      </Section>
    </PracticalSheet>
  );
}
