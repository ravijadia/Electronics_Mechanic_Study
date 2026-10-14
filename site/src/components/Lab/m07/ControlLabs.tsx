import React, {useEffect, useRef, useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import useStoredState from '../useStoredState';
import {Empty, NoteBox, ResetKit, Section, Table, Verdict, useKitSeed, useRng, type Note} from '../kit';
import {Knob} from '../Scope';
import {LOCKED_NOTE, Lamp, Mcb, across, netsOf, useWiring, type Terminal, type Wire} from './Wiring';
import {kitLabel} from './parts';
import styles from '../styles.module.css';

/** MCB + short-circuit handling shared by both benches. */
function useMcb(setNote: (n: Note) => void) {
  const [on, setOn] = useState(false);
  const [tripped, setTripped] = useState(false);
  const toggle = () => {
    setNote(null);
    setTripped(false);
    setOn((x) => !x);
  };
  const trip = (why: string) => {
    setOn(false);
    setTripped(true);
    setNote({kind: 'bad', text: <b>Bang! {why} The MCB tripped.</b>});
  };
  return {on, tripped, toggle, trip};
}

function PushButton({x, y, colour, label, pressed, onPress}: {x: number; y: number; colour: string; label: string; pressed: boolean; onPress: (p: boolean) => void}) {
  return (
    <g
      className={styles.clickable}
      role="button"
      tabIndex={0}
      aria-pressed={pressed}
      aria-label={`${label} push button: press and hold`}
      onPointerDown={() => onPress(true)}
      onPointerUp={() => onPress(false)}
      onPointerLeave={() => onPress(false)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPress(true);
        }
      }}
      onKeyUp={() => onPress(false)}>
      <rect x={x - 34} y={y - 30} width={68} height={60} rx={6} fill="#3a3f45" />
      <circle cx={x} cy={y + (pressed ? 3 : 0)} r={pressed ? 18 : 20} fill={colour} stroke="#111" strokeWidth={2} />
      <text x={x} y={y - 36} textAnchor="middle" style={kitLabel}>
        {label}
      </text>
    </g>
  );
}

// ---------------------------------------------------------------------------
// 1.7.62 Timer relay (on-delay)
// ---------------------------------------------------------------------------

const TR_TERMS: Terminal[] = [
  {id: 'L', x: 66, y: 160, label: 'Supply L (after MCB)', tag: 'L', tagSide: 'l'},
  {id: 'N', x: 66, y: 320, label: 'Supply N', tag: 'N', tagSide: 'l'},
  {id: 'S1a', x: 200, y: 110, label: 'Switch S1 terminal 1', tag: '1', tagSide: 'r'},
  {id: 'S1b', x: 200, y: 210, label: 'Switch S1 terminal 2', tag: '2', tagSide: 'r'},
  {id: 'A1', x: 330, y: 92, label: 'Timer A1', tag: 'A1', tagSide: 't'},
  {id: 'A2', x: 430, y: 92, label: 'Timer A2', tag: 'A2', tagSide: 't'},
  {id: 'T15', x: 330, y: 300, label: 'Timer 15 (common)', tag: '15', tagSide: 'b'},
  {id: 'T16', x: 380, y: 300, label: 'Timer 16 (NC)', tag: '16', tagSide: 'b'},
  {id: 'T18', x: 430, y: 300, label: 'Timer 18 (NO)', tag: '18', tagSide: 'b'},
  {id: 'X1', x: 560, y: 150, label: 'Lamp 1 terminal 1', tag: 'X1', tagSide: 'b'},
  {id: 'X2', x: 610, y: 150, label: 'Lamp 1 terminal 2', tag: 'X2', tagSide: 'b'},
  {id: 'Y1', x: 560, y: 300, label: 'Lamp 2 terminal 1', tag: 'Y1', tagSide: 'b'},
  {id: 'Y2', x: 610, y: 300, label: 'Lamp 2 terminal 2', tag: 'Y2', tagSide: 'b'},
];

interface Run {
  set: number;
  measured: number;
  good: boolean;
}

export function TimerRelayLab(): React.JSX.Element {
  const KEY = '1.7.62';
  const [seed, newKit] = useKitSeed(KEY);
  const err = useRng(seed, (rnd) => (rnd() < 0.5 ? -1 : 1) * (0.02 + rnd() * 0.05));
  const [note, setNote] = useState<Note>(null);
  const mcb = useMcb(setNote);
  const wiring = useWiring(KEY, TR_TERMS, mcb.on, () => setNote(LOCKED_NOTE));
  const [runs, setRuns] = useStoredState<Run[]>(`lab:${KEY}:runs`, []);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [s1, setS1] = useState(false);
  const [setT, setSetT] = useState(5);
  const [start, setStart] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [timed, setTimed] = useState(false);
  const before = useRef<{l1: boolean; l2: boolean} | null>(null);

  const edges = (t: boolean): Wire[] => [...wiring.wires, ...(s1 ? [['S1a', 'S1b'] as Wire] : []), t ? ['T15', 'T18'] : ['T15', 'T16']];
  const net = netsOf(edges(timed));
  const live = mcb.on;
  const short = live && net('L') === net('N');
  const coil = !short && across(net, 'A1', 'A2', live);
  const l1 = !short && across(net, 'X1', 'X2', live);
  const l2 = !short && across(net, 'Y1', 'Y2', live);
  const delay = setT * (1 + err);
  const elapsed = start != null ? (now - start) / 1000 : 0;

  useEffect(() => {
    if (short) mcb.trip('Phase and neutral are shorted.');
  }, [short]); // eslint-disable-line react-hooks/exhaustive-deps

  // Coil on: start the clock. Coil off: reset the timer.
  useEffect(() => {
    if (coil && start == null) {
      const t = performance.now();
      setStart(t);
      setNow(t);
      before.current = null;
    }
    if (!coil && start != null) {
      setStart(null);
      setTimed(false);
    }
  }, [coil, start]);

  useEffect(() => {
    if (start == null || timed) return;
    const id = window.setInterval(() => setNow(performance.now()), 50);
    return () => window.clearInterval(id);
  }, [start, timed]);

  // Lamp states while timing, captured just before the contacts change.
  if (coil && !timed && start != null) before.current = {l1, l2};

  useEffect(() => {
    if (start == null || timed || elapsed < delay) return;
    setTimed(true);
    const after = netsOf(edges(true));
    const a1 = across(after, 'X1', 'X2', live);
    const a2 = across(after, 'Y1', 'Y2', live);
    const b = before.current ?? {l1: false, l2: false};
    const good = !b.l1 && b.l2 && a1 && !a2;
    setRuns((r) => [...r, {set: setT, measured: Math.round(delay * 10) / 10, good}]);
    setNote(good ? {kind: 'good', text: `Click! After ${delay.toFixed(1)} s: lamp 1 ON, lamp 2 OFF.`} : {kind: 'warn', text: `Click after ${delay.toFixed(1)} s, but the lamps did not change over correctly. Check the wiring.`});
  }, [elapsed]); // eslint-disable-line react-hooks/exhaustive-deps

  const goodSets = new Set(runs.filter((r) => r.good).map((r) => r.set));
  const tb = netsOf([...wiring.wires, ['S1a', 'S1b'] as Wire]);
  const coilWired = (tb('A1') === tb('L') && tb('A2') === tb('N')) || (tb('A2') === tb('L') && tb('A1') === tb('N'));
  const contactsWired = tb('T15') === tb('L') && [tb('T16'), tb('T18')].every((n) => ['X1', 'X2', 'Y1', 'Y2'].some((p) => tb(p) === n));

  return (
    <PracticalSheet
      number={KEY}
      title="Connect a Timer Relay in a Circuit and Test Its Working"
      aim="To connect an on-delay timer relay with two lamps, and test that its contacts change over after the set time."
      apparatus={['On-delay timer relay 230 V AC, 1–10 s (A1, A2, 15, 16, 18)', 'Switch S1, MCB C6', 'Two 230 V lamps', 'Connecting wires']}
      procedure={[
        'MCB OFF. Wire L → S1 → A1, and A2 → N.',
        'Common 15 to L (after S1). 18 (NO) → lamp 1 → N. 16 (NC) → lamp 2 → N.',
        'Set the time dial. MCB ON, then switch S1 ON.',
        'Lamp 2 should be ON at once; after the set time lamp 1 comes ON and lamp 2 goes OFF.',
        'Repeat at three time settings and note the measured delay.',
      ]}
      precautions={['Switch off the MCB before any wiring change.', 'Check the coil voltage of the timer before connecting.', 'Never connect a lamp or contact directly between L and N without a load.']}
      viva={[
        {q: 'What is an on-delay timer?', a: 'Its contacts change over a set time after the coil is energised, and reset at once when it is de-energised.'},
        {q: 'What are terminals 15, 16 and 18?', a: '15 = common, 16 = normally closed, 18 = normally open contact.'},
        {q: 'Where are timer relays used?', a: 'Star–delta starters, staircase lights, delayed start of motors and pumps.'},
        {q: 'What is an off-delay timer?', a: 'Contacts change at once when energised and return a set time after the supply is removed.'},
      ]}
      steps={[
        {label: 'MCB OFF. Wire the coil: L → S1 → A1, A2 → N.', hint: 'Tap two terminals to join them.', done: coilWired || goodSets.size >= 1},
        {
          label: 'Wire the contacts: 15 to L, 18 → lamp 1, 16 → lamp 2.',
          hint: 'Other end of each lamp goes to N.',
          done: contactsWired || goodSets.size >= 1,
        },
        {label: 'Set the time dial, MCB ON, then S1 ON.', hint: 'The timer starts when the coil is energised.', done: start != null || runs.length > 0},
        {
          label: 'Watch the lamps: 2 ON, then after the delay 1 ON and 2 OFF.',
          hint: 'If not, switch off and check the wiring.',
          done: goodSets.size >= 1,
        },
        {
          label: 'Repeat at three different time settings.',
          hint: `Switch S1 OFF, change the dial, switch ON. Settings: ${Math.min(goodSets.size, 3)}/3.`,
          done: goodSets.size >= 3,
        },
        {label: 'Enter your details and print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.kit}>
          <svg viewBox="0 0 680 360" role="img" aria-label="Wiring board: MCB, switch S1, timer relay, lamp 1 and lamp 2">
            <Mcb x={38} y={20} on={mcb.on} tripped={mcb.tripped} onToggle={mcb.toggle} />
            <path d="M66 112 V154" className={styles.wire} />
            <rect x={30} y={326} width={72} height={10} rx={2} fill="#2b5fd1" opacity={0.7} />
            <text x={66} y={352} textAnchor="middle" style={{...kitLabel, fontSize: 10}}>
              neutral link
            </text>
            {/* Switch S1 */}
            <g
              className={styles.clickable}
              role="button"
              tabIndex={0}
              aria-label={`Switch S1 ${s1 ? 'ON. Switch off' : 'OFF. Switch on'}`}
              onClick={() => setS1((x) => !x)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setS1((x) => !x);
                }
              }}>
              <rect x={170} y={130} width={60} height={60} rx={6} fill="#f2f0e8" />
              <rect x={190} y={s1 ? 140 : 158} width={20} height={24} rx={4} fill="#c9c4b4" stroke="#888" />
              <text x={200} y={124} textAnchor="middle" style={kitLabel}>
                S1 {s1 ? 'ON' : 'OFF'}
              </text>
            </g>
            {/* Timer relay */}
            <rect x={310} y={80} width={140} height={210} rx={8} fill="#e9eaec" stroke="#9aa3a8" />
            <text x={380} y={124} textAnchor="middle" style={{fill: '#222', fontSize: 12, fontWeight: 800}}>
              ON-DELAY TIMER
            </text>
            <circle cx={380} cy={185} r={36} fill="#fff" stroke="#9aa3a8" />
            <line x1={380} y1={185} x2={380 + 30 * Math.cos(Math.PI * (0.75 + (setT / 10) * 1.5))} y2={185 + 30 * Math.sin(Math.PI * (0.75 + (setT / 10) * 1.5))} stroke="#d4302a" strokeWidth={3} />
            <text x={380} y={238} textAnchor="middle" style={{fill: '#222', fontSize: 11, fontWeight: 700}}>
              {setT.toFixed(1)} s
            </text>
            <circle cx={330} cy={140} r={5} fill={coil ? '#4cd964' : '#2c3a44'} />
            <circle cx={430} cy={140} r={5} fill={timed ? '#ffb020' : '#2c3a44'} />
            <text x={330} y={160} textAnchor="middle" style={{fill: '#444', fontSize: 9}}>
              PWR
            </text>
            <text x={430} y={160} textAnchor="middle" style={{fill: '#444', fontSize: 9}}>
              OUT
            </text>
            <text x={380} y={270} textAnchor="middle" style={{fill: '#444', fontSize: 9}}>
              15 → 16 (NC) · 15 → 18 (NO)
            </text>
            <Lamp x={585} y={100} lit={l1} label="Lamp 1" colour="#ffd34d" />
            <Lamp x={585} y={250} lit={l2} label="Lamp 2" colour="#ff7a6b" />
            {wiring.layer}
          </svg>
        </div>
        {wiring.bar}
        <div className={styles.controls}>
          <div className={clsx(styles.card, styles.noPrint)}>
            <Knob label="TIME SETTING" value={`${setT.toFixed(1)} s`} onDec={() => setSetT((t) => Math.max(1, t - 0.5))} onInc={() => setSetT((t) => Math.min(10, t + 0.5))} />
          </div>
          <div className={styles.card} role="timer" aria-label="Stopwatch">
            <span className={styles.label} style={{marginTop: 0}}>
              Stopwatch (from S1 ON)
            </span>
            <b className={styles.num} style={{fontSize: '1.6rem'}}>
              {start == null ? '0.0' : (timed ? delay : elapsed).toFixed(1)} s
            </b>
          </div>
        </div>
        <NoteBox note={note} status={mcb.on ? null : {kind: 'info', text: 'MCB OFF: you can wire now.'}} />
      </Section>
      <Section title="Observation table">
        {runs.length === 0 ? (
          <Empty>No tests yet. Switch S1 on to start one.</Empty>
        ) : (
          <Table head={['Test', 'Set time (s)', 'Measured delay (s)', 'Error (%)', 'Lamps changed over']} rows={runs.map((r, k) => [k + 1, r.set.toFixed(1), r.measured.toFixed(1), (((r.measured - r.set) / r.set) * 100).toFixed(1), <Verdict ok={r.good} yes="✓ yes" no="✗ no" />])} />
        )}
        <ResetKit
          onReset={() => {
            setRuns([]);
            wiring.setWires([]);
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// 1.7.63 Contactor with start / stop (hold-on) circuit
// ---------------------------------------------------------------------------

const CX = [330, 365, 400, 435, 470, 505];
const C_TERMS: Terminal[] = [
  {id: 'L', x: 66, y: 160, label: 'Supply L (after MCB)', tag: 'L', tagSide: 'l'},
  {id: 'N', x: 66, y: 330, label: 'Supply N', tag: 'N', tagSide: 'l'},
  {id: 'ST1', x: 165, y: 120, label: 'Stop button terminal 1', tag: '1', tagSide: 'b'},
  {id: 'ST2', x: 215, y: 120, label: 'Stop button terminal 2', tag: '2', tagSide: 'b'},
  {id: 'SR3', x: 165, y: 280, label: 'Start button terminal 3', tag: '3', tagSide: 'b'},
  {id: 'SR4', x: 215, y: 280, label: 'Start button terminal 4', tag: '4', tagSide: 'b'},
  ...(['A1', 'L1', 'L2', 'L3', '13', '21'] as const).map((t, k): Terminal => ({id: `K${t}`, x: CX[k], y: 64, label: `Contactor ${t}`, tag: t === 'L1' ? '1/L1' : t === 'L2' ? '3/L2' : t === 'L3' ? '5/L3' : t, tagSide: 't'})),
  ...(['A2', 'T1', 'T2', 'T3', '14', '22'] as const).map((t, k): Terminal => ({id: `K${t}`, x: CX[k], y: 320, label: `Contactor ${t}`, tag: t === 'T1' ? '2/T1' : t === 'T2' ? '4/T2' : t === 'T3' ? '6/T3' : t, tagSide: 'b'})),
  {id: 'X1', x: 590, y: 150, label: 'Load lamp terminal 1', tag: 'X1', tagSide: 'b'},
  {id: 'X2', x: 640, y: 150, label: 'Load lamp terminal 2', tag: 'X2', tagSide: 'b'},
  {id: 'Y1', x: 590, y: 300, label: 'OFF indicator terminal 1', tag: 'Y1', tagSide: 'b'},
  {id: 'Y2', x: 640, y: 300, label: 'OFF indicator terminal 2', tag: 'Y2', tagSide: 'b'},
];

export function ContactorLab(): React.JSX.Element {
  const KEY = '1.7.63';
  const [, newKit] = useKitSeed(KEY);
  const [note, setNote] = useState<Note>(null);
  const mcb = useMcb(setNote);
  const wiring = useWiring(KEY, C_TERMS, mcb.on, () => setNote(LOCKED_NOTE));
  const [seen, setSeen] = useStoredState<Record<string, boolean>>(`lab:${KEY}:seen`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [start, setStart] = useState(false);
  const [stop, setStop] = useState(false);
  const [coilOn, setCoilOn] = useState(false);
  const flips = useRef<number[]>([]);

  const edges = (k: boolean): Wire[] => [
    ...wiring.wires,
    ...(!stop ? [['ST1', 'ST2'] as Wire] : []),
    ...(start ? [['SR3', 'SR4'] as Wire] : []),
    ...(k
      ? ([
          ['KL1', 'KT1'],
          ['KL2', 'KT2'],
          ['KL3', 'KT3'],
          ['K13', 'K14'],
        ] as Wire[])
      : ([['K21', 'K22']] as Wire[])),
  ];
  const net = netsOf(edges(coilOn));
  const live = mcb.on;
  const short = live && net('L') === net('N');
  const coil = !short && across(net, 'KA1', 'KA2', live);
  const load = !short && across(net, 'X1', 'X2', live);
  const offLamp = !short && across(net, 'Y1', 'Y2', live);

  useEffect(() => {
    if (short) mcb.trip('Phase and neutral are shorted.');
  }, [short]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (coil === coilOn) return;
    const t = performance.now();
    flips.current = [...flips.current.filter((x) => t - x < 500), t];
    if (flips.current.length > 8) {
      flips.current = [];
      setCoilOn(false);
      return mcb.trip('The contactor is chattering: the coil is fed through its own NC contact.');
    }
    setCoilOn(coil);
    if (coil && start) setSeen((s) => ({...s, started: true}));
    if (!coil && stop && seen.held) setSeen((s) => ({...s, stopped: true}));
  }, [coil, coilOn]); // eslint-disable-line react-hooks/exhaustive-deps

  // Held: still on after the start button is released.
  useEffect(() => {
    if (coilOn && !start && seen.started && !seen.held) {
      setSeen((s) => ({...s, held: true}));
      setNote({kind: 'good', text: 'Start released: the contactor holds in ✓'});
    }
    if (live && coilOn && load) setSeen((s) => (s.loadOn ? s : {...s, loadOn: true}));
    if (live && !coilOn && !load && seen.loadOn) setSeen((s) => (s.loadOff ? s : {...s, loadOff: true}));
    if (live && !coilOn && offLamp) setSeen((s) => (s.indOn ? s : {...s, indOn: true}));
    if (live && coilOn && !offLamp && seen.indOn) setSeen((s) => (s.indOff ? s : {...s, indOff: true}));
  }, [coilOn, start, load, offLamp, live]); // eslint-disable-line react-hooks/exhaustive-deps

  const nb = netsOf(wiring.wires);
  const cb = netsOf([...wiring.wires, ['ST1', 'ST2'] as Wire, ['SR3', 'SR4'] as Wire]);
  const controlWired = (cb('L') === cb('KA1') && cb('KA2') === cb('N')) || (cb('L') === cb('KA2') && cb('KA1') === cb('N'));
  const holdWired = (nb('K13') === nb('SR3') && nb('K14') === nb('SR4')) || (nb('K13') === nb('SR4') && nb('K14') === nb('SR3'));
  const loadWired = nb('KL1') === nb('L') && ['X1', 'X2'].some((x) => nb(x) === nb('KT1')) && ['X1', 'X2'].some((x) => nb(x) === nb('N'));
  const indWired = nb('K21') === nb('L') && ['Y1', 'Y2'].some((y) => nb(y) === nb('K22')) && ['Y1', 'Y2'].some((y) => nb(y) === nb('N'));

  return (
    <PracticalSheet
      number={KEY}
      title="Connect a Contactor in a Circuit and Test Its Working"
      aim="To wire a contactor with start and stop push buttons and a hold-on (self-latching) contact, and switch a load through its main contacts."
      apparatus={['Contactor, 230 V AC coil, 3 main + 1 NO + 1 NC auxiliary contacts', 'Start (NO, green) and stop (NC, red) push buttons', 'MCB C6, load lamp, red OFF indicator', 'Connecting wires']}
      procedure={[
        'MCB OFF. Control circuit: L → stop (1–2) → start (3–4) → A1. A2 → N.',
        'Hold-on: connect aux NO 13–14 in parallel with the start button.',
        'Power circuit: L → 1/L1, 2/T1 → load → N.',
        'OFF indicator: L → 21–22 (aux NC) → red lamp → N.',
        'MCB ON. Press start: the load comes on and stays on. Press stop: it goes off.',
      ]}
      precautions={['Switch off the MCB before any wiring change.', 'Check the coil voltage on the contactor before connecting.', 'The stop button must be NC and in series; the start button NO.']}
      viva={[
        {q: 'What is a hold-on (latching) contact?', a: 'An auxiliary NO contact in parallel with the start button. It keeps the coil energised after start is released.'},
        {q: 'Why is the stop button NC and in series?', a: 'Pressing it breaks the coil circuit from any state. If its wire breaks, the contactor also stops (fail-safe).'},
        {q: 'What is the difference between a relay and a contactor?', a: 'A contactor has heavy main contacts for switching loads like motors, plus auxiliary contacts. A relay is for lighter loads and control.'},
        {q: 'What does no-volt protection mean?', a: 'If the supply fails, the contactor drops out and does not restart by itself when power returns.'},
      ]}
      steps={[
        {
          label: 'MCB OFF. Wire the control circuit: L → stop → start → A1, A2 → N.',
          hint: 'Stop is 1–2, start is 3–4. Tap two terminals to join them.',
          done: controlWired || !!seen.started,
        },
        {label: 'Wire the hold-on: contact 13–14 across the start button.', hint: 'Terminals 13 and 14 to 3 and 4.', done: holdWired || !!seen.held},
        {label: 'Wire the load: L → 1/L1, 2/T1 → load → N.', hint: 'Main contacts carry the load current.', done: loadWired || !!seen.loadOn},
        {label: 'Wire the OFF indicator: L → 21–22 → red lamp → N.', hint: 'Aux NC contact 21–22.', done: indWired || !!seen.indOn},
        {label: 'MCB ON. Press and hold START: the contactor picks up.', hint: 'Press and hold the green button.', done: !!seen.started},
        {label: 'Release START: it holds in.', hint: 'The coil stays on through contact 13–14.', done: !!seen.held},
        {label: 'Press STOP: it drops out.', hint: 'Red button breaks the coil circuit.', done: !!seen.stopped},
        {
          label: 'Check the load and the OFF indicator.',
          hint: 'Load lit only while on; red lamp lit only while stopped.',
          done: !!seen.loadOn && !!seen.loadOff && !!seen.indOn && !!seen.indOff,
        },
        {label: 'Enter your details and print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.kit}>
          <svg viewBox="0 0 700 370" role="img" aria-label="Wiring board: MCB, stop and start buttons, contactor, load lamp and OFF indicator">
            <Mcb x={38} y={20} on={mcb.on} tripped={mcb.tripped} onToggle={mcb.toggle} />
            <path d="M66 112 V154" className={styles.wire} />
            <rect x={30} y={336} width={72} height={10} rx={2} fill="#2b5fd1" opacity={0.7} />
            <PushButton x={190} y={80} colour="#d4302a" label="STOP (NC)" pressed={stop} onPress={setStop} />
            <PushButton x={190} y={240} colour="#2f9a3c" label="START (NO)" pressed={start} onPress={setStart} />
            {/* Contactor body */}
            <rect x={312} y={74} width={212} height={236} rx={8} fill="#e9eaec" stroke="#9aa3a8" />
            <rect x={330} y={190} width={50} height={70} rx={4} fill={coilOn ? '#c87533' : '#9a6a3c'} />
            <text x={355} y={230} textAnchor="middle" style={{fill: '#fff', fontSize: 10, fontWeight: 800}}>
              COIL
            </text>
            {[1, 2, 3, 4].map((k) => (
              <g key={k}>
                <path d={`M${CX[k]} 80 V120 M${CX[k]} 140 V310`} stroke="#555" strokeWidth={2} />
                <path d={`M${CX[k]} 120 L${CX[k] + (coilOn ? 0 : 10)} 140`} stroke="#555" strokeWidth={2.5} />
              </g>
            ))}
            <path d={`M${CX[5]} 80 V120 M${CX[5]} 140 V310`} stroke="#555" strokeWidth={2} />
            <path d={`M${CX[5]} 120 L${CX[5] + (coilOn ? 10 : 0)} 140`} stroke="#555" strokeWidth={2.5} />
            <path d={`M${CX[1] - 6} 130 H${CX[5] + 6}`} stroke="#888" strokeDasharray="4 3" />
            <text x={418} y={180} textAnchor="middle" style={{fill: '#222', fontSize: 12, fontWeight: 800}}>
              {coilOn ? 'CLOSED' : 'OPEN'}
            </text>
            <Lamp x={615} y={100} lit={load} label="LOAD" />
            <Lamp x={615} y={250} lit={offLamp} label="OFF" colour="#ff5a4a" />
            {wiring.layer}
          </svg>
        </div>
        {wiring.bar}
        <NoteBox note={note} status={mcb.on ? null : {kind: 'info', text: 'MCB OFF: you can wire now.'}} />
      </Section>
      <Section title="Observation table">
        <Table
          head={['Test', 'Expected', 'Seen']}
          rows={[
            ['Press START', 'Contactor closes, load ON', seen.started ? <Verdict ok yes="✓ yes" /> : '–'],
            ['Release START', 'Contactor stays closed (hold-on)', seen.held ? <Verdict ok yes="✓ yes" /> : '–'],
            ['Press STOP', 'Contactor opens, load OFF', seen.stopped ? <Verdict ok yes="✓ yes" /> : '–'],
            ['Load lamp', 'ON only when closed', seen.loadOn && seen.loadOff ? <Verdict ok yes="✓ yes" /> : '–'],
            ['OFF indicator (aux NC)', 'ON only when open', seen.indOn && seen.indOff ? <Verdict ok yes="✓ yes" /> : '–'],
          ]}
        />
        <ResetKit
          onReset={() => {
            setSeen({});
            wiring.setWires([]);
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}
