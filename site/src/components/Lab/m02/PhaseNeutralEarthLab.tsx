import React, {useEffect} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import useStoredState from '../useStoredState';
import {useMainsBench} from '../MainsBench';
import {Empty, ResetKit, Section, Table, Verdict, shuffle, useKitSeed, useRng} from '../kit';
import {PAIRS, makeBoard, type BoardFault, type Hole} from '../mains';
import styles from '../styles.module.css';

interface Obs {
  neon: Partial<Record<Hole, boolean>>;
  v: Partial<Record<string, number>>;
  phase?: '' | 'L' | 'R';
  wiring?: '' | 'correct' | 'reversed';
}

const KEY = '1.2.13';

/** 1.2.13 Identify the phase, neutral and earth on a power socket. */
export default function PhaseNeutralEarthLab(): React.JSX.Element {
  const [seed, newKit] = useKitSeed(KEY);
  const boards = useRng(seed, (rnd) =>
    shuffle<BoardFault>(['healthy', 'healthy', 'reversed', 'reversed'], rnd).map((f, k) => makeBoard(k + 1, f, rnd)),
  );
  const [obs, setObs] = useStoredState<Record<number, Obs>>(`lab:${KEY}:obs`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const bench = useMainsBench(boards, ['neon', 'dmm']);
  const {reading, setNote} = bench;
  const b = reading.board;

  const patch = (id: number, f: (o: Obs) => Obs) =>
    setObs((all) => ({...all, [id]: f(all[id] ?? {neon: {}, v: {}})}));

  // The neon result is an observation in itself: note it automatically.
  useEffect(() => {
    if (reading.tool === 'neon' && reading.neonAt && reading.neon != null && reading.mcbOn) {
      const h = reading.neonAt;
      const g = reading.neon;
      if (obs[b.id]?.neon[h] !== g) patch(b.id, (o) => ({...o, neon: {...o.neon, [h]: g}}));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reading.tool, reading.neonAt, reading.neon, reading.mcbOn, b.id]);

  const note = () => {
    if (reading.tool !== 'dmm') return setNote({kind: 'warn', text: 'Select the multimeter first.'});
    if (!reading.pair) return setNote({kind: 'warn', text: 'Place both probes first.'});
    if (!reading.mcbOn) return setNote({kind: 'warn', text: 'Switch the MCB ON.'});
    if (reading.dmmVolts == null)
      return setNote({kind: 'warn', text: 'Use AC V 750.'});
    const pid = reading.pair.id;
    const v = reading.dmmVolts;
    patch(b.id, (o) => ({...o, v: {...o.v, [pid]: v}}));
    setNote({kind: 'good', text: `Noted: ${reading.pair.label} = ${v} V`});
  };

  const rows = boards.map((bd) => ({bd, o: obs[bd.id] ?? {neon: {}, v: {}}}));
  const neonDone = rows.every((r) => (['L', 'R', 'E'] as Hole[]).every((h) => r.o.neon[h] != null));
  const voltsDone = rows.every((r) => PAIRS.every((p) => r.o.v[p.id] != null));
  const answerOK = (r: (typeof rows)[number]) => {
    const phase = r.bd.fault === 'reversed' ? 'L' : 'R';
    return {
      phase: r.o.phase ? r.o.phase === phase : null,
      wiring: r.o.wiring ? r.o.wiring === (r.bd.fault === 'reversed' ? 'reversed' : 'correct') : null,
    };
  };
  const allRight = rows.every((r) => {
    const a = answerOK(r);
    return a.phase && a.wiring;
  });

  const yesNo = (g: boolean | undefined) => (g == null ? '–' : g ? 'Glows' : 'No glow');

  return (
    <PracticalSheet
      number={KEY}
      title="Identify Phase, Neutral and Earth on a Power Socket"
      aim="To identify the phase, neutral and earth terminals of a 3-pin power socket using a neon tester and a multimeter, and to check that the socket is wired correctly."
      apparatus={[
        '3-pin 6 A switch boards with MCB (4 nos.)',
        'Neon tester (screwdriver type)',
        'Digital multimeter with AC voltage range',
      ]}
      procedure={[
        'Keep the MCB ON. Hold the neon tester with your finger on the metal cap, and touch it into each hole one by one.',
        'Note in which hole the neon glows. That hole is the phase.',
        'Select AC V 750 on the multimeter before the probes touch the socket.',
        'Measure the voltage between left–right, right–earth and left–earth holes and press “Note reading” each time.',
        'Repeat for all four boards.',
        'From the readings, decide which hole is phase, and whether the socket is wired correctly (phase on the right hole, seen from the front).',
      ]}
      precautions={[
        'Do not touch the metal blade of the neon tester or the probe tips.',
        'Check the meter is on an AC voltage range before touching mains.',
        'Insert only one probe at a time, and hold probes by their insulated grips.',
        'Never use the resistance range on a live socket.',
      ]}
      viva={[
        {q: 'Why does the neon tester glow only on the phase?', a: 'Phase is at about 230 V to earth. A tiny current flows through the neon, the high-value resistor and your body to earth. Neutral and earth are near 0 V, so no current flows.'},
        {q: 'What voltages do you expect on a healthy socket?', a: 'Phase–neutral ≈ 230 V, phase–earth ≈ 230 V, neutral–earth below about 2 V.'},
        {q: 'Seen from the front, which hole of a 3-pin socket should be phase?', a: 'The right-hand hole. Neutral is on the left, and earth is the large top hole.'},
        {q: 'Why is the earth pin of a plug longer and thicker?', a: 'So that earth connects first and disconnects last, and so the plug cannot be inserted the wrong way round.'},
        {q: 'What is the danger of a socket with phase and neutral reversed?', a: 'The switch then breaks the neutral, so the appliance stays live even when switched off. Anyone touching it can get a shock.'},
      ]}
      steps={[
        {label: 'Use the neon tester on all three holes of each board.', hint: 'The neon glows on the phase hole only.', done: neonDone},
        {label: 'Measure left–right, right–earth and left–earth on each board.', hint: 'Note all three voltages.', done: voltsDone},
        {label: 'Identify the phase hole and the wiring of each board.', hint: 'Use the tester and voltmeter results.', done: allRight},
        {label: 'Enter your details and print or save the record.', hint: 'Practical record, below the result.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        {bench.view}
        <div className={clsx(styles.row, styles.noPrint)} style={{marginTop: '0.8rem'}}>
          <button type="button" className={clsx(styles.btn, styles.primary)} onClick={note}>
            Note reading
          </button>
        </div>
      </Section>

      <Section title="Observation table">
        <Table
          head={['Board', 'Neon: left', 'Neon: right', 'Neon: earth', 'V left–right', 'V right–earth', 'V left–earth']}
          rows={rows.map(({bd, o}) => [
            bd.id,
            yesNo(o.neon.L),
            yesNo(o.neon.R),
            yesNo(o.neon.E),
            ...PAIRS.map((p) => (o.v[p.id] != null ? <span className={styles.num}>{o.v[p.id]} V</span> : '–')),
          ])}
        />
      </Section>

      <Section title="Result">
        {rows.every((r) => Object.keys(r.o.neon).length === 0 && Object.keys(r.o.v).length === 0) ? (
          <Empty>Take your readings first, then decide each board here.</Empty>
        ) : (
          <Table
            head={['Board', 'Phase is in the…', 'Wiring', 'Check']}
            rows={rows.map((r) => {
              const a = answerOK(r);
              return [
                r.bd.id,
                <select
                  className={styles.select}
                  aria-label={`Board ${r.bd.id}: phase hole`}
                  value={r.o.phase ?? ''}
                  onChange={(e) => patch(r.bd.id, (o) => ({...o, phase: e.target.value as Obs['phase']}))}>
                  <option value="">Choose…</option>
                  <option value="L">Left hole</option>
                  <option value="R">Right hole</option>
                </select>,
                <select
                  className={styles.select}
                  aria-label={`Board ${r.bd.id}: wiring`}
                  value={r.o.wiring ?? ''}
                  onChange={(e) => patch(r.bd.id, (o) => ({...o, wiring: e.target.value as Obs['wiring']}))}>
                  <option value="">Choose…</option>
                  <option value="correct">Correct</option>
                  <option value="reversed">Phase–neutral reversed</option>
                </select>,
                a.phase == null || a.wiring == null ? '–' : <Verdict ok={!!(a.phase && a.wiring)} />,
              ];
            })}
          />
        )}
        <ResetKit
          onReset={() => {
            setObs({});
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}
