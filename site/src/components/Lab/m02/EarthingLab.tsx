import React, {useEffect, useMemo} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import useStoredState from '../useStoredState';
import {GlowText, useMainsBench} from '../MainsBench';
import {Empty, ResetKit, Section, Table, shuffle, useKitSeed, useRng} from '../kit';
import {makeBoard, repaired, type BoardFault, type Glow} from '../mains';
import styles from '../styles.module.css';

const KEY = '1.2.15';

type Stage = 'before' | 'after';
interface Reading {
  pe?: number;
  ne?: number;
  lamp?: Glow;
}
interface Obs {
  before: Reading;
  after: Reading;
}

const ACTIONS: {id: string; label: string; needsOff: boolean; fixes?: BoardFault}[] = [
  {id: 'inspect', label: 'Open the socket and inspect the earth terminal', needsOff: true},
  {id: 'water', label: 'Pour water (with salt and charcoal) into the earth pit', needsOff: false, fixes: 'poorEarth'},
  {id: 'tighten', label: 'Tighten the earth terminal screw at the socket', needsOff: true, fixes: 'looseEarth'},
  {id: 'rewire', label: 'Replace the broken earth wire', needsOff: true, fixes: 'openEarth'},
  {id: 'fuse', label: 'Replace the fuse', needsOff: true},
  {id: 'swap', label: 'Swap phase and neutral wires', needsOff: true},
];

const EMPTY: Obs = {before: {}, after: {}};

/** 1.2.15 Measure the voltage between phase and ground and rectify earthing. */
export default function EarthingLab(): React.JSX.Element {
  const [seed, newKit] = useKitSeed(KEY);
  const base = useRng(seed, (rnd) =>
    shuffle<BoardFault>(['poorEarth', 'looseEarth', 'openEarth', 'healthy'], rnd).map((f, k) => makeBoard(k + 1, f, rnd)),
  );
  const [fixed, setFixed] = useStoredState<Record<number, boolean>>(`lab:${KEY}:fixed`, {});
  const [obs, setObs] = useStoredState<Record<number, Obs>>(`lab:${KEY}:obs`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const boards = useMemo(() => base.map((b) => (fixed[b.id] ? repaired(b) : b)), [base, fixed]);
  const bench = useMainsBench(boards, ['dmm', 'lamp']);
  const {reading, setNote} = bench;
  const b = reading.board;
  const orig = base.find((x) => x.id === b.id)!;
  const stage: Stage = fixed[b.id] ? 'after' : 'before';

  const patch = (id: number, st: Stage, r: Partial<Reading>) =>
    setObs((all) => {
      const o = all[id] ?? EMPTY;
      return {...all, [id]: {...o, [st]: {...o[st], ...r}}};
    });

  useEffect(() => {
    if (reading.tool === 'lamp' && reading.pair?.id === 'RE' && reading.glow && reading.mcbOn) {
      if (obs[b.id]?.[stage].lamp !== reading.glow) patch(b.id, stage, {lamp: reading.glow});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reading.tool, reading.pair?.id, reading.glow, reading.mcbOn, b.id, stage]);

  const note = () => {
    if (reading.tool !== 'dmm') return setNote({kind: 'warn', text: 'Select the multimeter first.'});
    if (!reading.mcbOn) return setNote({kind: 'warn', text: 'Switch the MCB ON.'});
    if (!reading.pair || reading.pair.id === 'LR')
      return setNote({kind: 'warn', text: 'Probes on right–earth (P–E) or left–earth (N–E).'});
    if (reading.dmmVolts == null) return setNote({kind: 'warn', text: 'Use AC V 750.'});
    const v = reading.dmmVolts;
    patch(b.id, stage, reading.pair.id === 'RE' ? {pe: v} : {ne: v});
    setNote({kind: 'good', text: `Noted: ${reading.pair.id === 'RE' ? 'P–E' : 'N–E'} = ${v} V`});
  };

  const act = (a: (typeof ACTIONS)[number]) => {
    if (fixed[b.id]) return setNote({kind: 'info', text: 'Already repaired. Re-test it.'});
    if (a.needsOff && bench.mcbOn)
      return setNote({kind: 'bad', text: <b>Switch OFF the MCB first.</b>});
    if (a.id === 'inspect')
      return setNote({
        kind: 'info',
        text:
          orig.fault === 'looseEarth'
            ? 'Earth terminal screw is loose.'
            : orig.fault === 'openEarth'
              ? 'Terminal tight, but the earth wire is broken.'
              : 'Terminal tight, wire sound.',
      });
    if (orig.fault === 'healthy')
      return setNote({kind: 'info', text: 'This earth is already good.'});
    if (a.fixes === orig.fault) {
      setFixed((f) => ({...f, [b.id]: true}));
      setNote({kind: 'good', text: 'Repaired. Switch ON and re-test.'});
    } else {
      setNote({kind: 'warn', text: 'That does not fix this fault.'});
    }
  };

  const rows = base.map((bd) => ({bd, o: obs[bd.id] ?? EMPTY}));
  const faulty = base.filter((x) => x.fault !== 'healthy');
  const steps = [
    {label: 'Measure P–E and N–E on each board with the multimeter.', hint: 'Note both voltages for every board.', done: rows.every((r) => r.o.before.pe != null && r.o.before.ne != null)},
    {label: 'Check phase–earth with the test lamp on each board.', hint: 'Full glow means a good earth.', done: rows.every((r) => r.o.before.lamp)},
    {label: 'Find and rectify the earthing fault on each faulty board.', hint: 'A healthy board needs no repair.', done: faulty.every((x) => fixed[x.id])},
    {label: 'Confirm each repair: the test lamp glows fully, phase to earth.', hint: 'Test again after every repair.', done: faulty.every((x) => obs[x.id]?.after.lamp === 'full')},
    {label: 'Enter your details and print or save the record.', hint: 'Practical record, below the result.', done: printed},
  ];

  const val = (v?: number) => (v == null ? '–' : <span className={styles.num}>{v} V</span>);

  return (
    <PracticalSheet
      number={KEY}
      title="Measure Phase–Earth Voltage and Rectify Earthing"
      aim="To measure the voltage between phase and earth and between neutral and earth, to find faulty earthing, and to rectify it."
      apparatus={['Switch boards with 3-pin sockets (4 nos.)', 'Digital multimeter', 'Test lamp (100 W)', 'Screwdriver, earth wire, water and salt for the earth pit']}
      procedure={[
        'On each board, measure phase (right) to earth and neutral (left) to earth on AC V 750, and note them.',
        'Check phase to earth with the test lamp: full glow means a good earth.',
        'Compare: P–E should be about equal to P–N, N–E should be below about 2 V, and the lamp should glow fully.',
        'If the earth is faulty, switch the MCB OFF and inspect the socket’s earth terminal. Then decide the fault and rectify it.',
        'Switch ON and test again to confirm the repair.',
      ]}
      precautions={[
        'Switch off the MCB before tightening or replacing any wire.',
        'Do not trust a multimeter reading alone on an earth: confirm with a test lamp.',
        'Keep the meter on an AC V range when probing mains.',
        'Water the earth pit only from outside, with the supply undisturbed and without touching the earth electrode.',
      ]}
      viva={[
        {q: 'What should the neutral–earth voltage be in a healthy installation?', a: 'Very small, usually below about 2 V. A higher value points to a poor earth or a loose neutral.'},
        {q: 'A multimeter shows about 50 V between phase and earth, but the test lamp does not glow. Why?', a: 'The earth is open (floating). The 10 MΩ meter reads a “ghost” voltage picked up through stray capacitance. The lamp needs real current, so it does not glow.'},
        {q: 'Why is the earth pit watered in dry weather?', a: 'Moist soil has lower resistance. Water with salt and charcoal keeps the earth resistance low.'},
        {q: 'What is the purpose of earthing?', a: 'To give fault current a low-resistance path, so the fuse or MCB operates quickly and the metal body never stays at a dangerous voltage.'},
        {q: 'What is the maximum earth resistance usually allowed for domestic installations?', a: 'As low as possible. Use the limit given in your trade theory book (based on IS 3043), and check it with an earth tester.'},
      ]}
      steps={steps}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        {bench.view}
        <div className={clsx(styles.row, styles.noPrint)} style={{marginTop: '0.8rem'}}>
          <button type="button" className={clsx(styles.btn, styles.primary)} onClick={note}>
            Note reading
          </button>
          <span className={styles.muted}>Board {b.id}: {stage === 'before' ? 'before repair' : 'after repair'}</span>
        </div>
      </Section>

      <Section title="Rectify earthing" noPrint>
        <div className={styles.seg} role="group" aria-label="Repair actions">
          {ACTIONS.map((a) => (
            <button key={a.id} type="button" onClick={() => act(a)}>
              {a.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Observation table">
        {rows.every((r) => Object.keys(r.o.before).length === 0) ? (
          <Empty>No readings yet.</Empty>
        ) : (
          <Table
            head={['Board', 'P–E before', 'N–E before', 'Lamp P–E before', 'Repair done', 'P–E after', 'N–E after', 'Lamp P–E after']}
            rows={rows.map(({bd, o}) => [
              bd.id,
              val(o.before.pe),
              val(o.before.ne),
              <GlowText glow={o.before.lamp} />,
              fixed[bd.id] ? ACTIONS.find((a) => a.fixes === bd.fault)?.label ?? 'Yes' : bd.fault === 'healthy' && o.before.lamp === 'full' ? 'None needed' : '–',
              val(o.after.pe),
              val(o.after.ne),
              <GlowText glow={o.after.lamp} />,
            ])}
          />
        )}
        <ResetKit
          onReset={() => {
            setObs({});
            setFixed({});
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}
