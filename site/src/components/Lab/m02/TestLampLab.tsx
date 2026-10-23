import React, {useEffect, useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import {GU_1_2_14} from './gu';
import useStoredState from '../useStoredState';
import {GlowText, useMainsBench} from '../MainsBench';
import {Empty, NoteBox, ResetKit, Section, Table, Verdict, shuffle, useKitSeed, useRng, type Note} from '../kit';
import {L2} from '../solution';
import {FAULT_LABEL, PAIRS, makeBoard, type BoardFault, type Glow} from '../mains';
import styles from '../styles.module.css';

const KEY = '1.2.14';

const PARTS: {id: string; label: string; ok: boolean; why: string}[] = [
  {id: 'lamp', label: '230 V, 100 W filament lamp', ok: true, why: ''},
  {id: 'lamp12', label: '12 V, 21 W auto bulb', ok: false, why: 'A 12 V bulb would burst on 230 V mains.'},
  {id: 'holder', label: 'Batten lamp holder', ok: true, why: ''},
  {id: 'cable', label: '2-core flexible PVC cable, 1 m', ok: true, why: ''},
  {id: 'bare', label: 'Bare copper wire', ok: false, why: 'Bare wire is a shock hazard. Use insulated flexible cable.'},
  {id: 'prods', label: 'Insulated test prods', ok: true, why: ''},
  {id: 'croc', label: 'Crocodile clips with bare jaws', ok: false, why: 'Bare clips on mains can slip and short, or be touched.'},
];

const FAULTS: BoardFault[] = ['healthy', 'noSupply', 'openEarth', 'poorEarth', 'reversed', 'lowVoltage'];

interface Obs {
  glow: Partial<Record<string, Glow>>;
  answer?: BoardFault | '';
}

/** 1.2.14 Construct a test lamp and use it to check mains healthiness. */
export default function TestLampLab(): React.JSX.Element {
  const [seed, newKit] = useKitSeed(KEY);
  const boards = useRng(seed, (rnd) => shuffle(FAULTS, rnd).map((f, k) => makeBoard(k + 1, f, rnd)));
  const [picked, setPicked] = useStoredState<string[]>(`lab:${KEY}:parts`, []);
  const [built, setBuilt] = useStoredState(`lab:${KEY}:built`, false);
  const [obs, setObs] = useStoredState<Record<number, Obs>>(`lab:${KEY}:obs`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [buildNote, setBuildNote] = useState<Note>(null);
  const bench = useMainsBench(boards, ['lamp']);
  const {reading} = bench;
  const b = reading.board;

  const patch = (id: number, f: (o: Obs) => Obs) => setObs((all) => ({...all, [id]: f(all[id] ?? {glow: {}})}));

  // Each pair's glow is noted as soon as the lamp is across it.
  useEffect(() => {
    if (!built || !reading.pair || !reading.glow || !reading.mcbOn) return;
    const pid = reading.pair.id;
    const g = reading.glow;
    if (obs[b.id]?.glow[pid] !== g) patch(b.id, (o) => ({...o, glow: {...o.glow, [pid]: g}}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [built, reading.pair?.id, reading.glow, reading.mcbOn, b.id]);

  const build = () => {
    const wrong = PARTS.filter((p) => !p.ok && picked.includes(p.id));
    const missing = PARTS.filter((p) => p.ok && !picked.includes(p.id));
    if (wrong.length) {
      setBuildNote({kind: 'bad', text: <>Not safe: {wrong.map((w) => w.why).join(' ')}</>});
      return;
    }
    if (missing.length) {
      setBuildNote({kind: 'warn', text: `Missing: ${missing.map((m) => m.label).join(', ')}`});
      return;
    }
    setBuilt(true);
    setBuildNote({kind: 'good', text: 'Test lamp ready.'});
  };

  const rows = boards.map((bd) => ({bd, o: obs[bd.id] ?? {glow: {}}}));
  const tested = rows.filter((r) => PAIRS.every((p) => r.o.glow[p.id]));
  const answered = rows.filter((r) => r.o.answer);
  const correct = answered.filter((r) => r.o.answer === r.bd.fault);

  return (
    <PracticalSheet
      number={KEY}
      title="Construct a Test Lamp and Check Mains Healthiness"
      aim="To construct a series test lamp and use it to check whether a mains socket is healthy, and to find common supply faults."
      apparatus={['230 V, 100 W lamp with batten holder', '2-core flexible cable and insulated test prods', 'Switch boards with 3-pin sockets (6 nos.)']}
      procedure={[
        'Select the correct, safe parts and build the test lamp.',
        'Keep the MCB ON. Put the prods in the left–right holes and note the glow.',
        'Repeat for right–earth and left–earth.',
        'Do this on all six boards. Each glow is noted automatically.',
        'From the three glows, decide what condition each board is in.',
      ]}
      precautions={[
        'Use only insulated prods, and hold them behind the finger guard.',
        'Never use a low-voltage bulb on mains.',
        'Do not leave the lamp across the supply for long. Test, note, remove.',
        'Switch off the MCB before opening any board.',
      ]}
      viva={[
        {q: 'What is a test lamp used for?', a: 'To check quickly whether supply is present, whether phase and earth are healthy, and whether a fuse is blown.'},
        {q: 'Why does the lamp glow dim between phase and a poor earth?', a: 'The earth path has high resistance. It is in series with the lamp, so part of the voltage is lost across it.'},
        {q: 'Why can a test lamp find a bad earth that a multimeter misses?', a: 'The lamp draws real current (about 0.4 A), so a high-resistance earth shows up. A 10 MΩ multimeter draws almost no current, so it still reads near full voltage.'},
        {q: 'The lamp glows between right–left and left–earth, but not between right–earth. What is wrong?', a: 'Phase is on the left hole, so phase and neutral are reversed.'},
        {q: 'Which is safer for testing live circuits: a test lamp or a neon tester? Why?', a: 'Both need care. A test lamp needs two insulated prods and a properly rated lamp. A neon tester uses your body as the return path through a very high resistance, so it only shows phase.'},
      ]}
      steps={[
        {label: 'Choose the correct parts and build the test lamp.', hint: 'Pick only the parts a safe test lamp needs.', done: built},
        {label: 'Test all three hole pairs on each board.', hint: 'Use the test lamp on every board.', done: tested.length === boards.length},
        {label: 'Diagnose each board.', hint: 'Judge from the lamp glow.', done: correct.length === boards.length},
        {label: 'Enter your details and print or save the record.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_2_14}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Step 1: Build the test lamp" noPrint={built}>
        <div className={styles.fields} role="group" aria-label="Parts tray">
          {PARTS.map((p) => (
            <label key={p.id} className={styles.card} style={{display: 'flex', gap: '0.5rem', alignItems: 'center', fontWeight: 600}}>
              <input
                type="checkbox"
                disabled={built}
                checked={picked.includes(p.id)}
                onChange={(e) =>
                  setPicked((s) => (e.target.checked ? [...s, p.id] : s.filter((x) => x !== p.id)))
                }
              />
              {p.label}
            </label>
          ))}
        </div>
        {!built && (
          <button type="button" className={clsx(styles.btn, styles.primary)} onClick={build}>
            Build test lamp
          </button>
        )}
        <NoteBox note={buildNote} />
      </Section>

      <Section title="Step 2: Test the switch boards">
        {built ? bench.view : <Empty>Build the test lamp first.</Empty>}
      </Section>

      <Section title="Observation table and result">
        {tested.length === 0 && answered.length === 0 ? (
          <Empty>Your observations appear here as you test.</Empty>
        ) : (
          <>
            <Table
              head={['Board', ...PAIRS.map((p) => p.label), 'Condition (your diagnosis)', 'Check']}
              rows={rows.map(({bd, o}) => [
                bd.id,
                ...PAIRS.map((p) => <GlowText glow={o.glow[p.id]} />),
                <select
                  className={styles.select}
                  aria-label={`Board ${bd.id}: condition`}
                  value={o.answer ?? ''}
                  onChange={(e) => patch(bd.id, (x) => ({...x, answer: e.target.value as BoardFault}))}>
                  <option value="">Choose…</option>
                  {FAULTS.map((f) => (
                    <option key={f} value={f}>
                      {FAULT_LABEL[f]}
                    </option>
                  ))}
                </select>,
                o.answer ? <Verdict
                    ok={o.answer === bd.fault}
                    fix={{
                      hint: L2(
                        'Healthy: Left–Right and Right–Earth glow fully, Left–Earth is dark. Phase on the left = reversed. Nothing glows = no supply. Earth pairs dark = earth open. Dim glow = poor/loose earth or low voltage.',
                        'સારું: Left–Right અને Right–Earth પૂરા ચમકે, Left–Earth ડાર્ક. ફેઝ ડાબે = ઊલટું. કશું ન ચમકે = નો સપ્લાય. અર્થ સાથેની જોડી ડાર્ક = અર્થ ઓપન. ઝાંખો ગ્લો = નબળો/ઢીલો અર્થ કે ઓછો વોલ્ટેજ.',
                      ),
                      answer: FAULT_LABEL[bd.fault],
                    }}
                  /> : '–',
              ])}
            />
            <p className={styles.muted}>Score: {correct.length}/{boards.length}</p>
          </>
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
