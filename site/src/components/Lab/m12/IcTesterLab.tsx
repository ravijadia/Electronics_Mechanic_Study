import React, {useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import {Empty, NoteBox, ResetKit, Section, Table, Verdict, useKitSeed, useRng, type Note} from '../kit';
import {Knob} from '../Scope';
import useStoredState from '../useStoredState';
import {gateTruth, GATE_ICS, GATE_IC_IDS} from './logic';
import {useLogicBoard} from './LogicBench';
import styles from '../styles.module.css';

// ---------------------------------------------------------------------------
// 1.12.111 Use a digital IC tester to test digital ICs (TTL and CMOS)
// ---------------------------------------------------------------------------

type Row = {a: boolean; b?: boolean; y: boolean};

export function IcTesterLab(): React.JSX.Element {
  const KEY = '1.12.111';
  const [seed, newKit] = useKitSeed(KEY);
  const kit = useRng(seed, (rnd) => ({
    type: GATE_IC_IDS[Math.floor(rnd() * GATE_IC_IDS.length)],
    family: rnd() < 0.5 ? ('TTL' as const) : ('CMOS' as const),
  }));
  const vMin = kit.family === 'TTL' ? 4.75 : 3;
  const vMax = kit.family === 'TTL' ? 5.25 : 15;

  const [note, setNote] = useState<Note>(null);
  const [volts, setVolts] = useState(5);
  const [rows, setRows] = useStoredState<Row[]>(`lab:${KEY}:rows`, []);
  const [fnGuess, setFnGuess] = useStoredState<string>(`lab:${KEY}:fnguess`, '');
  const [famGuess, setFamGuess] = useStoredState<string>(`lab:${KEY}:famguess`, '');
  const [seenOut, setSeenOut] = useStoredState(`lab:${KEY}:seenout`, false);
  const [seenIn, setSeenIn] = useStoredState(`lab:${KEY}:seenin`, false);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);

  const t = GATE_ICS[kit.type];
  const twoIn = t.gates[0].ins.length === 2;
  const inRange = volts >= vMin && volts <= vMax;
  const nominal = volts >= 4.75 && volts <= 5.25;
  const board = useLogicBoard({
    storeKey: KEY,
    ics: [{id: 'U1', type: kit.type, x: 190, y: 60, name: 'IC X'}],
    switches: twoIn ? [{id: 'A', x: 50, y: 100, label: 'A'}, {id: 'B', x: 50, y: 190, label: 'B'}] : [{id: 'A', x: 50, y: 140, label: 'A'}],
    leds: [{id: 'Y', x: 410, y: 140, label: 'Y'}],
    dead: !inRange,
  });

  const a = board.switchVal('A');
  const b = board.switchVal('B');
  const yBit = board.bit('LED.Y'); // out-of-range supply: output stuck LOW

  const noteIt = () => {
    if (!inRange) {
      setSeenOut(true);
      return setNote({kind: 'bad', text: `Outside its rated supply the output is stuck LOW regardless of the inputs: ${volts} V is not safe to read from.`});
    }
    if (yBit == null) return setNote({kind: 'warn', text: 'Y is floating: finish wiring the switch(es) and the output.'});
    if (!nominal) {
      setSeenOut(true);
      return setNote({kind: 'info', text: `At ${volts.toFixed(1)} V the IC still works: Y = ${yBit ? 1 : 0}. Take the table readings at 5 V.`});
    }
    setSeenIn(true);
    const row: Row = twoIn ? {a, b, y: yBit} : {a, y: yBit};
    setRows((r) => [...r.filter((x) => !(x.a === a && !!x.b === (twoIn ? b : false))), row]);
    setNote({kind: 'info', text: `Noted: A${twoIn ? 'B' : ''} = ${a ? 1 : 0}${twoIn ? (b ? 1 : 0) : ''} → Y = ${yBit ? 1 : 0}.`});
  };

  const need = twoIn ? 4 : 2;
  const rowsOk = rows.length >= need && rows.every((r) => r.y === gateTruth(t.fn, r.a, twoIn ? !!r.b : false));
  const fnOk = fnGuess === t.fn && rowsOk;
  const famOk = famGuess === kit.family && seenIn && seenOut;

  return (
    <PracticalSheet
      number={KEY}
      title="Digital IC Tester: Identify an Unknown Gate IC"
      aim="To find the logic function of an unknown, unlabelled gate IC by wiring switches and an LED to it and testing every input combination, then identify whether it is a TTL or a CMOS part by its tolerance to supply voltage."
      apparatus={['One unlabelled gate IC (NAND, NOR, AND, OR, XOR or NOT)', 'Variable DC supply 3–15 V', 'Two toggle switches', 'LED indicator']}
      procedure={[
        'At 5 V, wire switches to the IC’s inputs and the LED to its output.',
        'Try every input combination and build its truth table.',
        'Compare the table with the known gate functions and identify it.',
        'Vary the supply from 3 V to 15 V and watch the output. A part that only works right around 5 V is TTL; one that keeps working over a wide range is CMOS.',
      ]}
      precautions={['Do not force a conclusion from an incomplete truth table.', 'Return the supply to 5 V before taking the logic readings.']}
      viva={[
        {q: 'Why does a TTL IC stop working properly below about 4.75 V?', a: 'Its internal bipolar transistor thresholds are fixed relative to a regulated 5 V rail.'},
        {q: 'Why can CMOS run from 3 V to 15 V?', a: 'Its MOSFET switching threshold scales with the supply, so it works correctly over a wide voltage range.'},
        {q: 'How do you tell a NAND IC from an AND IC on the bench?', a: 'Their outputs are the complement of each other for every input combination — compare the truth tables.'},
      ]}
      steps={[
        {label: 'Wire the switches to the IC inputs and its output to LED Y.', hint: 'Tap a switch, then an input pin. Then the output pin, then the LED.', done: yBit != null},
        {label: `Set the supply to 5 V. Note every input combination. Rows: ${Math.min(rows.length, need)}/${need}`, hint: 'Rows are only noted with the supply between 4.75 and 5.25 V.', done: rowsOk},
        {label: 'Choose the gate function in the Result table.', hint: 'Compare your truth table with the known gates.', done: fnOk},
        {label: 'Change the supply to 3 V or 12 V and press Note reading.', hint: 'Watch the LED. Then return to 5 V.', done: seenIn && seenOut},
        {label: 'Choose TTL or CMOS in the Result table.', hint: 'TTL only works near 5 V. CMOS works from 3 to 15 V.', done: famOk},
        {label: 'Enter your details and press Print / Save as PDF.', hint: 'Practical record, below the result.', done: printed},
      ]}
      onPrinted={(t2) => t2.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.kit}>{board.view(480, 300)}</div>
        {board.bar}
        <div className={clsx(styles.controls, styles.noPrint)} style={{marginTop: '0.4rem'}}>
          <div className={styles.card}>
            <Knob label="SUPPLY" value={`${volts.toFixed(1)} V`} onDec={() => setVolts((x) => Math.max(3, Math.round((x - 0.25) * 100) / 100))} onInc={() => setVolts((x) => Math.min(15, Math.round((x + 0.25) * 100) / 100))} />
          </div>
          <button type="button" className={clsx(styles.btn, styles.primary)} onClick={noteIt}>
            Note reading
          </button>
        </div>
        <NoteBox note={note} status={!inRange ? {kind: 'warn', text: `Supply ${volts.toFixed(1)} V is outside the IC’s rated range.`} : null} />
      </Section>
      <Section title="Observation table">
        {rows.length === 0 ? <Empty>No readings yet.</Empty> : <Table head={twoIn ? ['A', 'B', 'Y'] : ['A', 'Y']} rows={rows.map((r) => (twoIn ? [r.a ? 1 : 0, r.b ? 1 : 0, r.y ? 1 : 0] : [r.a ? 1 : 0, r.y ? 1 : 0]))} />}
      </Section>
      <Section title="Result">
        <Table
          head={['', 'Your answer', 'Check']}
          rows={[
            [
              'Gate function',
              <select className={styles.select} aria-label="Gate function" value={fnGuess} onChange={(e) => setFnGuess(e.target.value)}>
                <option value="">Choose…</option>
                {['NAND', 'NOR', 'AND', 'OR', 'XOR', 'NOT'].map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>,
              fnGuess ? (rowsOk ? <Verdict ok={fnOk} /> : 'complete the truth table first') : '–',
            ],
            [
              'IC family',
              <select className={styles.select} aria-label="IC family" value={famGuess} onChange={(e) => setFamGuess(e.target.value)}>
                <option value="">Choose…</option>
                <option value="TTL">TTL</option>
                <option value="CMOS">CMOS</option>
              </select>,
              famGuess ? (seenIn && seenOut ? <Verdict ok={famOk} /> : 'try both an in-range and an out-of-range supply first') : '–',
            ],
          ]}
        />
        <ResetKit
          onReset={() => {
            setRows([]);
            setFnGuess('');
            setFamGuess('');
            setSeenIn(false);
            setSeenOut(false);
            setPrinted(false);
            board.clearWires();
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}
