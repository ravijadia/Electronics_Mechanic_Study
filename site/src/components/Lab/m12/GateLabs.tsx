import React, {useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import {GU_1_12_109, GU_1_12_110} from './gu';
import {Empty, NoteBox, ResetKit, Section, Table, type Note} from '../kit';
import useStoredState from '../useStoredState';
import {gateTruth, GATE_ICS, GATE_IC_IDS} from './logic';
import {useLogicBoard} from './LogicBench';
import styles from '../styles.module.css';

// ---------------------------------------------------------------------------
// 1.12.109 Verify the truth tables of all logic gate ICs
// ---------------------------------------------------------------------------

type Row = {a: boolean; b?: boolean; y: boolean};

/** A single-input row has no `b`; treat it as b = false so repeats replace each other. */
const sameInputs = (x: Row, a: boolean, b: boolean) => x.a === a && !!x.b === b;

export function GateTruthTableLab(): React.JSX.Element {
  const KEY = '1.12.109';
  const [type, setType] = useState('7400');
  const [note, setNote] = useState<Note>(null);
  const [rows, setRows] = useStoredState<Record<string, Row[]>>(`lab:${KEY}:rows`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);

  const t = GATE_ICS[type];
  const twoIn = t.gates[0].ins.length === 2;
  const board = useLogicBoard({
    storeKey: `${KEY}:${type}`,
    ics: [{id: 'U1', type, x: 190, y: 60}],
    switches: twoIn ? [{id: 'A', x: 50, y: 100, label: 'A'}, {id: 'B', x: 50, y: 190, label: 'B'}] : [{id: 'A', x: 50, y: 140, label: 'A'}],
    leds: [{id: 'Y', x: 410, y: 140, label: 'Y'}],
  });

  const a = board.switchVal('A');
  const b = board.switchVal('B');
  const yBit = board.bit('LED.Y');
  const expect = twoIn ? gateTruth(t.fn, a, b) : gateTruth(t.fn, a, false);

  const noteIt = () => {
    if (yBit == null) return setNote({kind: 'warn', text: 'Y is floating: wire the switch(es) to an input pin, and that gate’s output to the LED.'});
    const row: Row = twoIn ? {a, b, y: yBit} : {a, y: yBit};
    setRows((r) => {
      const list = (r[type] ?? []).filter((x) => !sameInputs(x, a, twoIn ? b : false));
      return {...r, [type]: [...list, row].sort((x, y) => (x.a === y.a ? Number(!!x.b) - Number(!!y.b) : Number(x.a) - Number(y.a)))};
    });
    setNote(yBit === expect ? {kind: 'good', text: `Y = ${yBit ? 1 : 0}, correct for ${t.fn}.`} : {kind: 'bad', text: `Y = ${yBit ? 1 : 0}, but ${t.fn} of these inputs is ${expect ? 1 : 0}. Check the wiring.`});
  };

  const doneType = (id: string) => {
    const tt = GATE_ICS[id];
    const want = tt.gates[0].ins.length === 2 ? 4 : 2;
    const rs = rows[id] ?? [];
    if (rs.length < want) return false;
    return rs.every((r) => r.y === gateTruth(tt.fn, r.a, tt.gates[0].ins.length === 2 ? !!r.b : false));
  };

  return (
    <PracticalSheet
      number={KEY}
      title="Verify the Truth Table of Logic Gate ICs"
      aim="To wire switches and an LED to each basic logic gate IC and verify its truth table: NAND (7400), NOR (7402), AND (7408), OR (7432), XOR (7486) and NOT (7404)."
      apparatus={['7400, 7402, 7408, 7432, 7486, 7404 ICs', '+5 V supply', 'Two toggle switches (logic 1 / 0)', 'LED indicator']}
      procedure={[
        'Choose a gate IC. Tap a switch, then tap an input pin of one gate on the IC to wire it; tap the gate’s output pin, then the LED, to wire the output.',
        'Set the switches to each combination of 0/1 and note whether the LED (Y) is ON (1) or OFF (0).',
        'Compare your readings with the gate’s truth table.',
        'Repeat for all six gate ICs.',
      ]}
      precautions={['Do not leave an input pin unconnected: an unwired input gives an unreliable output.', 'Check the pin numbers against the IC before wiring.']}
      viva={[
        {q: 'What does a NAND gate output when both inputs are 1?', a: '0 — it is the complement of AND.'},
        {q: 'Why must every gate input be connected?', a: 'A floating TTL/CMOS input can read either level and makes the output unreliable.'},
        {q: 'How many 2-input gates are in one 7400 IC?', a: 'Four.'},
      ]}
      steps={[
        ...GATE_IC_IDS.map((id) => {
          const want = GATE_ICS[id].gates[0].ins.length === 2 ? 4 : 2;
          return {
            label: `Verify ${GATE_ICS[id].name} (${GATE_ICS[id].fn}): note all ${want} input combinations.`,
            hint: `Select ${GATE_ICS[id].name}. Wire a switch to an input pin, the gate output to LED Y. Rows: ${Math.min((rows[id] ?? []).length, want)}/${want}`,
            done: doneType(id),
          };
        }),
        {label: 'Enter your details and press Print / Save as PDF.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_12_109(GATE_IC_IDS.map((id) => ({name: GATE_ICS[id].name, fn: GATE_ICS[id].fn, want: GATE_ICS[id].gates[0].ins.length === 2 ? 4 : 2})))}
      onPrinted={(t2) => t2.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={clsx(styles.seg, styles.noPrint)} role="group" aria-label="Gate IC" style={{marginBottom: '0.6rem'}}>
          {GATE_IC_IDS.map((id) => (
            <button key={id} type="button" aria-pressed={type === id} onClick={() => (setType(id), setNote(null))}>
              {GATE_ICS[id].name} ({GATE_ICS[id].fn})
            </button>
          ))}
        </div>
        <div className={styles.kit}>{board.view(480, 300)}</div>
        {board.bar}
        <div className={clsx(styles.controls, styles.noPrint)} style={{marginTop: '0.4rem'}}>
          <button type="button" className={clsx(styles.btn, styles.primary)} onClick={noteIt}>
            Note reading
          </button>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {!rows[type] || rows[type].length === 0 ? (
          <Empty>No readings yet for {t.name}.</Empty>
        ) : (
          <Table head={twoIn ? ['A', 'B', 'Y'] : ['A', 'Y']} rows={rows[type].map((r) => (twoIn ? [r.a ? 1 : 0, r.b ? 1 : 0, r.y ? 1 : 0] : [r.a ? 1 : 0, r.y ? 1 : 0]))} />
        )}
      </Section>
      <Section title="Result">
        <Table head={['IC', 'Function', 'Verified']} rows={GATE_IC_IDS.map((id) => [GATE_ICS[id].name, GATE_ICS[id].fn, doneType(id) ? '✓' : '–'])} />
        <ResetKit onReset={() => (setRows({}), setPrinted(false))} />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// 1.12.110 Construct AND, OR, NOT (and XOR) using only NAND or only NOR gates
// ---------------------------------------------------------------------------

type Target = 'NOT' | 'AND' | 'OR' | 'XOR';
const TARGETS: Target[] = ['NOT', 'AND', 'OR', 'XOR'];

export function UniversalGateLab(): React.JSX.Element {
  const KEY = '1.12.110';
  const [family, setFamily] = useState<'7400' | '7402'>('7400');
  const [target, setTarget] = useState<Target>('NOT');
  const [note, setNote] = useState<Note>(null);
  const [rows, setRows] = useStoredState<Record<string, Row[]>>(`lab:${KEY}:rows`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);

  const options = family === '7402' ? (['NOT', 'AND', 'OR'] as Target[]) : TARGETS;
  const board = useLogicBoard({
    storeKey: `${KEY}:${family}`,
    ics: [{id: 'U1', type: family, x: 190, y: 50}],
    switches: [{id: 'A', x: 50, y: 90, label: 'A'}, {id: 'B', x: 50, y: 230, label: 'B'}],
    leds: [{id: 'Y', x: 410, y: 160, label: 'Y'}],
    gndY: 285,
  });

  const a = board.switchVal('A');
  const b = board.switchVal('B');
  const yBit = board.bit('LED.Y');
  const needTwo = target !== 'NOT';
  const expect = gateTruth(target, a, needTwo ? b : false);
  const rowKey = `${family}:${target}`;

  const noteIt = () => {
    if (yBit == null) return setNote({kind: 'warn', text: 'Y is floating: finish wiring your gate network to the LED.'});
    const row: Row = needTwo ? {a, b, y: yBit} : {a, y: yBit};
    setRows((r) => {
      const list = (r[rowKey] ?? []).filter((x) => !sameInputs(x, a, needTwo ? b : false));
      return {...r, [rowKey]: [...list, row]};
    });
    setNote(yBit === expect ? {kind: 'good', text: `Correct: Y = ${target} output for these inputs.`} : {kind: 'bad', text: `Y = ${yBit ? 1 : 0}, but ${target} of these inputs should be ${expect ? 1 : 0}.`});
  };

  const doneTarget = (fam: '7400' | '7402', tg: Target) => {
    const need = tg === 'NOT' ? 2 : 4;
    const rs = rows[`${fam}:${tg}`] ?? [];
    if (rs.length < need) return false;
    return rs.every((r) => r.y === gateTruth(tg, r.a, tg === 'NOT' ? false : !!r.b));
  };

  return (
    <PracticalSheet
      number={KEY}
      title="Construct Gates Using Only NAND or Only NOR Gates"
      aim="To build the AND, OR, NOT and XOR functions using nothing but NAND gates, and the AND, OR and NOT functions using nothing but NOR gates — the two 'universal' gate families — and verify each truth table."
      apparatus={['7400 (quad NAND) and 7402 (quad NOR) ICs', '+5 V supply', 'Two toggle switches', 'LED indicator']}
      procedure={[
        'Choose NAND-only or NOR-only, and the function to build.',
        'NOT from NAND/NOR: tie both inputs of one gate to the same switch.',
        'AND from NAND: NAND the inputs, then invert the result with a second NAND wired as NOT.',
        'OR from NOR: NOR the inputs, then invert the result with a second NOR wired as NOT.',
        'AND from NOR / OR from NAND: invert each input first, then NOR (for AND) or NAND (for OR) the two inverted signals.',
        'Verify the truth table for each function you build.',
      ]}
      precautions={['Plan which of the IC’s four gates you are using for each stage before wiring.', 'Do not leave any gate input unconnected.']}
      viva={[
        {q: 'Why are NAND and NOR called universal gates?', a: 'Any logic function — AND, OR, NOT, and combinations of these — can be built from NAND gates alone, or from NOR gates alone.'},
        {q: 'How do you make a NOT gate from a NAND gate?', a: 'Connect both inputs together to the same signal.'},
        {q: 'How many NAND gates does a 2-input XOR need?', a: 'Four.'},
      ]}
      steps={[
        {label: 'Build NOT from NAND or NOR and verify it.', hint: 'Select NOT. Tie both inputs of one gate to switch A.', done: doneTarget('7400', 'NOT') || doneTarget('7402', 'NOT')},
        {label: 'Build AND from NAND or NOR and verify it.', hint: 'NAND: NAND the inputs, then invert with a second NAND.', done: doneTarget('7400', 'AND') || doneTarget('7402', 'AND')},
        {label: 'Build OR from NAND or NOR and verify it.', hint: 'NOR: NOR the inputs, then invert with a second NOR.', done: doneTarget('7400', 'OR') || doneTarget('7402', 'OR')},
        {label: 'Build XOR from NAND gates only and verify it.', hint: 'Select NAND-only, then XOR. It takes four gates.', done: doneTarget('7400', 'XOR')},
        {label: 'Enter your details and press Print / Save as PDF.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_12_110}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={clsx(styles.controls, styles.noPrint)} style={{marginTop: 0, marginBottom: '0.6rem'}}>
          <div className={styles.seg} role="group" aria-label="Gate family">
            <button type="button" aria-pressed={family === '7400'} onClick={() => (setFamily('7400'), setNote(null))}>
              NAND-only (7400)
            </button>
            <button type="button" aria-pressed={family === '7402'} onClick={() => (setFamily('7402'), setTarget((t2) => (t2 === 'XOR' ? 'NOT' : t2)), setNote(null))}>
              NOR-only (7402)
            </button>
          </div>
          <div className={styles.seg} role="group" aria-label="Function to build">
            {options.map((tg) => (
              <button key={tg} type="button" aria-pressed={target === tg} onClick={() => (setTarget(tg), setNote(null))}>
                {tg}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.kit}>{board.view(480, 310)}</div>
        {board.bar}
        <div className={clsx(styles.controls, styles.noPrint)} style={{marginTop: '0.4rem'}}>
          <button type="button" className={clsx(styles.btn, styles.primary)} onClick={noteIt}>
            Note reading
          </button>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {!rows[rowKey] || rows[rowKey].length === 0 ? (
          <Empty>No readings yet for {target} from {family === '7400' ? 'NAND' : 'NOR'}.</Empty>
        ) : (
          <Table head={needTwo ? ['A', 'B', 'Y'] : ['A', 'Y']} rows={rows[rowKey].map((r) => (needTwo ? [r.a ? 1 : 0, r.b ? 1 : 0, r.y ? 1 : 0] : [r.a ? 1 : 0, r.y ? 1 : 0]))} />
        )}
      </Section>
      <Section title="Result">
        <Table
          head={['Function', 'From NAND', 'From NOR']}
          rows={[
            ['NOT', doneTarget('7400', 'NOT') ? '✓' : '–', doneTarget('7402', 'NOT') ? '✓' : '–'],
            ['AND', doneTarget('7400', 'AND') ? '✓' : '–', doneTarget('7402', 'AND') ? '✓' : '–'],
            ['OR', doneTarget('7400', 'OR') ? '✓' : '–', doneTarget('7402', 'OR') ? '✓' : '–'],
            ['XOR', doneTarget('7400', 'XOR') ? '✓' : '–', '—'],
          ]}
        />
        <ResetKit onReset={() => (setRows({}), setPrinted(false))} />
      </Section>
    </PracticalSheet>
  );
}
