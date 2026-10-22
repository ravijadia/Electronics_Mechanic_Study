import React, {useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import {GU_1_12_112, GU_1_12_113, GU_1_12_114} from './gu';
import {Empty, NoteBox, ResetKit, Section, Table, type Note} from '../kit';
import useStoredState from '../useStoredState';
import {useLogicBoard, type IcSpec} from './LogicBench';
import styles from '../styles.module.css';

// ---------------------------------------------------------------------------
// 1.12.112 Half adder using ICs (7486 XOR + 7408 AND)
// ---------------------------------------------------------------------------

interface Row {
  a: boolean;
  b: boolean;
  cin?: boolean;
  s: boolean;
  c: boolean;
}

const HA_ICS: IcSpec[] = [
  {id: 'U1', type: '7486', x: 180, y: 40},
  {id: 'U2', type: '7408', x: 180, y: 190},
];

export function HalfAdderLab(): React.JSX.Element {
  const KEY = '1.12.112';
  const [note, setNote] = useState<Note>(null);
  const [rows, setRows] = useStoredState<Row[]>(`lab:${KEY}:rows`, []);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const board = useLogicBoard({
    storeKey: KEY,
    ics: HA_ICS,
    switches: [{id: 'A', x: 50, y: 70, label: 'A'}, {id: 'B', x: 50, y: 220, label: 'B'}],
    leds: [{id: 'S', x: 420, y: 70, label: 'Sum'}, {id: 'C', x: 420, y: 220, label: 'Carry'}],
    gndY: 340,
  });

  const a = board.switchVal('A');
  const b = board.switchVal('B');
  const sBit = board.bit('LED.S');
  const cBit = board.bit('LED.C');
  const expS = a !== b;
  const expC = a && b;

  const noteIt = () => {
    if (sBit == null || cBit == null) return setNote({kind: 'warn', text: 'Sum and/or Carry are floating: finish the wiring.'});
    setRows((r) => [...r.filter((x) => !(x.a === a && x.b === b)), {a, b, s: sBit, c: cBit}].sort((x, y) => Number(x.a) - Number(y.a) || Number(x.b) - Number(y.b)));
    setNote(sBit === expS && cBit === expC ? {kind: 'good', text: 'Correct: matches the half adder truth table.'} : {kind: 'bad', text: `Expected Sum ${expS ? 1 : 0}, Carry ${expC ? 1 : 0}. Check the wiring.`});
  };

  const done = rows.length >= 4 && rows.every((r) => r.s === (r.a !== r.b) && r.c === (r.a && r.b));

  return (
    <PracticalSheet
      number={KEY}
      title="Half Adder Using ICs"
      aim="To build a half adder with a 7486 (XOR) and a 7408 (AND) IC, and verify its truth table: Sum = A XOR B, Carry = A AND B."
      apparatus={['7486 (quad XOR) IC', '7408 (quad AND) IC', '+5 V supply', 'Two toggle switches', 'Two LEDs']}
      procedure={[
        'Wire switches A and B to one input each of an XOR gate and of an AND gate.',
        'Wire the XOR output to the Sum LED, the AND output to the Carry LED.',
        'Set A and B to all four combinations and note the Sum and Carry each time.',
      ]}
      precautions={['Both A and B must feed both gates.', 'Do not leave any gate input unconnected.']}
      viva={[
        {q: 'Why can a half adder not add a carry from a previous stage?', a: 'It only has two inputs, A and B; there is no carry-in pin.'},
        {q: 'What logic gate gives the Sum output?', a: 'XOR.'},
        {q: 'What logic gate gives the Carry output?', a: 'AND.'},
      ]}
      steps={[
        {label: 'Wire the half adder: XOR to Sum, AND to Carry.', hint: 'A and B feed both gates. No pin left open.', done: sBit != null && cBit != null},
        {label: `Set A and B to each of the 4 combinations and press Note reading. Rows: ${rows.length}/4`, hint: 'Tap a switch to change it between 0 and 1.', done: rows.length >= 4},
        {label: 'Check every row matches A XOR B and A AND B.', hint: 'Wrong row? Fix the wiring and note it again.', done},
        {label: 'Enter your details and press Print / Save as PDF.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_12_112}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.kit}>{board.view(480, 360)}</div>
        {board.bar}
        <div className={clsx(styles.controls, styles.noPrint)} style={{marginTop: '0.4rem'}}>
          <button type="button" className={clsx(styles.btn, styles.primary)} onClick={noteIt}>
            Note reading
          </button>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {rows.length === 0 ? <Empty>No readings yet.</Empty> : <Table head={['A', 'B', 'Sum', 'Carry']} rows={rows.map((r) => [r.a ? 1 : 0, r.b ? 1 : 0, r.s ? 1 : 0, r.c ? 1 : 0])} />}
      </Section>
      <Section title="Result">
        <Table head={['', '']} rows={[['Truth table verified', done ? '✓' : '–']]} />
        <ResetKit onReset={() => (setRows([]), setPrinted(false))} />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// 1.12.113 Full adder with two half adders
// ---------------------------------------------------------------------------

const FA_ICS: IcSpec[] = [
  {id: 'U1', type: '7486', x: 170, y: 20},
  {id: 'U2', type: '7408', x: 170, y: 170},
  {id: 'U3', type: '7432', x: 170, y: 320},
];

export function FullAdderLab(): React.JSX.Element {
  const KEY = '1.12.113';
  const [note, setNote] = useState<Note>(null);
  const [rows, setRows] = useStoredState<Row[]>(`lab:${KEY}:rows`, []);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const board = useLogicBoard({
    storeKey: KEY,
    ics: FA_ICS,
    switches: [{id: 'A', x: 50, y: 50, label: 'A'}, {id: 'B', x: 50, y: 170, label: 'B'}, {id: 'Cin', x: 50, y: 290, label: 'Cin'}],
    leds: [{id: 'S', x: 420, y: 50, label: 'Sum'}, {id: 'C', x: 420, y: 290, label: 'Cout'}],
    gndY: 480,
  });

  const a = board.switchVal('A');
  const b = board.switchVal('B');
  const cin = board.switchVal('Cin');
  const sBit = board.bit('LED.S');
  const cBit = board.bit('LED.C');
  const expS = a !== b !== cin;
  const expC = (a && b) || (b && cin) || (a && cin);

  const noteIt = () => {
    if (sBit == null || cBit == null) return setNote({kind: 'warn', text: 'Sum and/or Cout are floating: finish the wiring.'});
    setRows((r) => [...r.filter((x) => !(x.a === a && x.b === b && x.cin === cin)), {a, b, cin, s: sBit, c: cBit}]);
    setNote(sBit === expS && cBit === expC ? {kind: 'good', text: 'Correct: matches the full adder truth table.'} : {kind: 'bad', text: `Expected Sum ${expS ? 1 : 0}, Cout ${expC ? 1 : 0}. Check the wiring.`});
  };

  const check = (r: Row) => r.s === (r.a !== r.b !== !!r.cin) && r.c === ((r.a && r.b) || (r.b && !!r.cin) || (r.a && !!r.cin));
  const done = rows.length >= 8 && rows.every(check);

  return (
    <PracticalSheet
      number={KEY}
      title="Full Adder From Two Half Adders"
      aim="To build a full adder from two XOR/AND half adder stages plus an OR gate for the carry, and verify its 8-row truth table (A, B, Cin → Sum, Cout)."
      apparatus={['7486 (quad XOR) IC', '7408 (quad AND) IC', '7432 (quad OR) IC', '+5 V supply', 'Three toggle switches', 'Two LEDs']}
      procedure={[
        'First half adder: XOR and AND of A and B, giving an intermediate sum S1 and carry C1.',
        'Second half adder: XOR S1 with Cin for the final Sum; AND S1 with Cin for a second carry term C2.',
        'OR the two carry terms (C1, C2) for Cout.',
        'Set A, B and Cin to all eight combinations and note Sum and Cout each time.',
      ]}
      precautions={['Plan the two half-adder stages before wiring the carry OR gate.', 'Do not leave any gate input unconnected.']}
      viva={[
        {q: 'How many half adders make a full adder?', a: 'Two, plus an OR gate for the final carry.'},
        {q: 'Why does a full adder need a carry-in?', a: 'So multiple full adders can be chained to add multi-bit numbers, each stage receiving the carry from the one before it.'},
        {q: 'When is Cout = 1?', a: 'When two or more of A, B and Cin are 1.'},
      ]}
      steps={[
        {label: 'Wire the full adder: two XOR/AND stages and an OR for Cout.', hint: 'Sum = (A XOR B) XOR Cin. Cout = C1 OR C2.', done: sBit != null && cBit != null},
        {label: `Set A, B and Cin to all 8 combinations and press Note reading. Rows: ${rows.length}/8`, hint: 'Tap a switch to change it between 0 and 1.', done: rows.length >= 8},
        {label: 'Check all 8 rows match the full adder table.', hint: 'Wrong row? Fix the wiring and note it again.', done},
        {label: 'Enter your details and press Print / Save as PDF.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_12_113}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.kit}>{board.view(480, 500)}</div>
        {board.bar}
        <div className={clsx(styles.controls, styles.noPrint)} style={{marginTop: '0.4rem'}}>
          <button type="button" className={clsx(styles.btn, styles.primary)} onClick={noteIt}>
            Note reading
          </button>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {rows.length === 0 ? <Empty>No readings yet.</Empty> : <Table head={['A', 'B', 'Cin', 'Sum', 'Cout']} rows={rows.map((r) => [r.a ? 1 : 0, r.b ? 1 : 0, r.cin ? 1 : 0, r.s ? 1 : 0, r.c ? 1 : 0])} />}
      </Section>
      <Section title="Result">
        <Table head={['', '']} rows={[['Truth table verified', done ? '✓' : '–']]} />
        <ResetKit onReset={() => (setRows([]), setPrinted(false))} />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// 1.12.114 Adder-cum-subtractor
// ---------------------------------------------------------------------------

const AS_ICS: IcSpec[] = [
  {id: 'U1', type: '7486', x: 170, y: 20},
  {id: 'U2', type: '7408', x: 170, y: 170},
  {id: 'U3', type: '7432', x: 170, y: 320},
  {id: 'U4', type: '7486', x: 170, y: 460},
];

interface AsRow extends Row {
  m: boolean;
}

export function AdderSubtractorLab(): React.JSX.Element {
  const KEY = '1.12.114';
  const [note, setNote] = useState<Note>(null);
  const [rows, setRows] = useStoredState<AsRow[]>(`lab:${KEY}:rows`, []);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const board = useLogicBoard({
    storeKey: KEY,
    ics: AS_ICS,
    switches: [
      {id: 'A', x: 50, y: 50, label: 'A'},
      {id: 'B', x: 50, y: 170, label: 'B'},
      {id: 'M', x: 50, y: 490, label: 'M'},
    ],
    leds: [{id: 'S', x: 420, y: 50, label: 'Sum/Diff'}, {id: 'C', x: 420, y: 290, label: 'Cout'}],
    gndY: 610,
  });

  const a = board.switchVal('A');
  const b = board.switchVal('B');
  const m = board.switchVal('M'); // 0 = add, 1 = subtract (B is XORed with M, M feeds Cin)
  const sBit = board.bit('LED.S');
  const cBit = board.bit('LED.C');
  const bEff = b !== m;
  const expS = a !== bEff !== m;
  const expC = (a && bEff) || (bEff && m) || (a && m);

  const noteIt = () => {
    if (sBit == null || cBit == null) return setNote({kind: 'warn', text: 'Outputs are floating: finish the wiring (remember M feeds both the B-XOR gate and Cin).'});
    setRows((r) => [...r.filter((x) => !(x.a === a && x.b === b && x.m === m)), {a, b, m, s: sBit, c: cBit}]);
    const op = m ? 'Difference' : 'Sum';
    setNote(
      sBit === expS && cBit === expC
        ? {kind: 'good', text: m ? `Correct difference. Cout = ${cBit ? 1 : 0} (${cBit ? 'no borrow, A ≥ B' : 'borrow, A < B'}).` : 'Correct sum and carry.'}
        : {kind: 'bad', text: `Expected ${op} ${expS ? 1 : 0}, Cout ${expC ? 1 : 0}.`},
    );
  };

  const check = (r: AsRow) => {
    const be = r.b !== r.m;
    return r.s === (r.a !== be !== r.m) && r.c === ((r.a && be) || (be && r.m) || (r.a && r.m));
  };
  const addDone = rows.filter((r) => !r.m).length >= 4 && rows.filter((r) => !r.m).every(check);
  const subDone = rows.filter((r) => r.m).length >= 4 && rows.filter((r) => r.m).every(check);

  return (
    <PracticalSheet
      number={KEY}
      title="Adder-cum-Subtractor Circuit"
      aim="To build a 1-bit adder/subtractor: a full adder whose B input is XORed with a mode line M (which also feeds Cin), so M = 0 adds A + B and M = 1 subtracts A − B using 2's complement."
      apparatus={['Two 7486 (quad XOR), one 7408 (quad AND), one 7432 (quad OR) IC', '+5 V supply', 'Three toggle switches (A, B, M)', 'Two LEDs']}
      procedure={[
        'Build a full adder for A, (B XOR M) and Cin = M, as in 1.12.113.',
        'With M = 0: B passes unchanged and Cin = 0 — the circuit adds A + B.',
        'With M = 1: B is complemented and Cin = 1, forming the 2’s complement of B — the circuit computes A − B.',
        'Verify both the addition table (M = 0) and the subtraction table (M = 1). In subtraction, Cout = 1 means no borrow (A ≥ B); Cout = 0 means a borrow.',
      ]}
      precautions={['M must be wired to both the extra XOR gate and the full adder’s Cin.', 'Do not leave any gate input unconnected.']}
      viva={[
        {q: 'How does XORing B with M give its 2’s complement when M = 1?', a: 'XOR with 1 inverts B (1’s complement); adding the Cin = 1 then completes the 2’s complement addition.'},
        {q: 'What does the output mean when M = 1 and there is no final carry?', a: 'The result is negative, itself held in 2’s complement form.'},
        {q: 'Why is one extra XOR gate enough to turn an adder into a subtractor?', a: 'It conditionally complements B; the existing Cin input absorbs the "+1" needed for 2’s complement.'},
      ]}
      steps={[
        {label: 'Wire the adder-subtractor: M feeds the B-XOR and Cin.', hint: 'Full adder for A, (B XOR M), Cin = M.', done: sBit != null && cBit != null},
        {label: `Set M = 0 (add). Note the 4 combinations of A and B. Rows: ${rows.filter((r) => !r.m).length}/4`, hint: 'M = 0: the circuit computes A + B.', done: rows.filter((r) => !r.m).length >= 4},
        {label: 'Check the addition rows are correct.', hint: 'Wrong row? Fix the wiring and note it again.', done: addDone},
        {label: `Set M = 1 (subtract). Note the 4 combinations of A and B. Rows: ${rows.filter((r) => r.m).length}/4`, hint: 'M = 1: A − B. Cout = 1 means no borrow.', done: rows.filter((r) => r.m).length >= 4},
        {label: 'Check the subtraction rows are correct.', hint: 'Wrong row? Fix the wiring and note it again.', done: subDone},
        {label: 'Enter your details and press Print / Save as PDF.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_12_114}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.kit}>{board.view(480, 630)}</div>
        {board.bar}
        <div className={clsx(styles.controls, styles.noPrint)} style={{marginTop: '0.4rem'}}>
          <button type="button" className={clsx(styles.btn, styles.primary)} onClick={noteIt}>
            Note reading
          </button>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {rows.length === 0 ? (
          <Empty>No readings yet.</Empty>
        ) : (
          <Table head={['M', 'A', 'B', 'Sum/Diff', 'Cout']} rows={rows.map((r) => [r.m ? 1 : 0, r.a ? 1 : 0, r.b ? 1 : 0, r.s ? 1 : 0, r.c ? 1 : 0])} />
        )}
      </Section>
      <Section title="Result">
        <Table head={['', '']} rows={[['Addition table verified', addDone ? '✓' : '–'], ['Subtraction table verified', subDone ? '✓' : '–']]} />
        <ResetKit onReset={() => (setRows([]), setPrinted(false))} />
      </Section>
    </PracticalSheet>
  );
}
