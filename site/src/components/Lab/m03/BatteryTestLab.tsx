import React, {useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import AnalogMeter, {type DialSpec} from '../AnalogMeter';
import useStoredState from '../useStoredState';
import {NoteBox, ResetKit, Section, Table, Verdict, shuffle, useKitSeed, useRng, type Note} from '../kit';
import styles from '../styles.module.css';

const KEY = '1.3.34';
const LOAD_LIMIT = 9.6;

type State = 'good' | 'flat' | 'deadCell' | 'sulphated';
const VERDICT: Record<string, string> = {
  ready: 'Ready for use',
  recharge: 'Needs recharging',
  replace: 'Faulty: replace',
};
const TRUTH: Record<State, keyof typeof VERDICT> = {good: 'ready', flat: 'recharge', deadCell: 'replace', sulphated: 'replace'};

interface Bat {
  id: number;
  state: State;
  ocv: number;
  load: number;
  sg: number[];
}

function makeBat(id: number, state: State, rnd: () => number): Bat {
  const r = (a: number, b: number, dp = 2) => Number((a + rnd() * (b - a)).toFixed(dp));
  const sgs = (base: number, spread = 0.006) => Array.from({length: 6}, () => Math.round((base + (rnd() - 0.5) * spread) * 200) / 200);
  if (state === 'good') return {id, state, ocv: r(12.6, 12.75), load: r(10.4, 11), sg: sgs(1.265)};
  if (state === 'flat') return {id, state, ocv: r(11.9, 12.1), load: r(8.6, 9.3), sg: sgs(1.165)};
  if (state === 'deadCell') {
    const sg = sgs(1.255);
    sg[Math.floor(rnd() * 6)] = 1.08;
    return {id, state, ocv: r(10.5, 10.7), load: r(5.8, 7), sg};
  }
  return {id, state, ocv: r(12.45, 12.6), load: r(7.4, 8.4), sg: sgs(1.25)};
}

const TESTER: DialSpec = {fsd: 16, unit: 'V', divisions: 32, perMajor: 8, movement: 'MC', current: 'DC', position: 'V', accuracy: '2.5', testKV: 2};

interface Obs {
  ocv?: number;
  load?: number;
  sg?: boolean;
  verdict?: string;
}

/** 1.3.34 Test a battery and decide whether it is ready for use or needs recharging. */
export default function BatteryTestLab(): React.JSX.Element {
  const [seed, newKit] = useKitSeed(KEY);
  const bats = useRng(seed, (rnd) => shuffle<State>(['good', 'flat', 'deadCell', 'sulphated'], rnd).map((s, k) => makeBat(k + 1, s, rnd)));
  const [obs, setObs] = useStoredState<Record<number, Obs>>(`lab:${KEY}:obs`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [sel, setSel] = useState(0);
  const [needle, setNeedle] = useState(0);
  const [note, setNote] = useState<Note>(null);
  const b = bats[sel];
  const patch = (id: number, o: Partial<Obs>) => setObs((all) => ({...all, [id]: {...all[id], ...o}}));

  const doOcv = () => {
    setNeedle(b.ocv);
    patch(b.id, {ocv: b.ocv});
    setNote({kind: 'info', text: `Open-circuit voltage: ${b.ocv.toFixed(2)} V`});
  };
  const doLoad = () => {
    setNeedle(b.load);
    patch(b.id, {load: b.load});
    setNote({kind: b.load >= LOAD_LIMIT ? 'good' : 'warn', text: `Under load (15 s): ${b.load.toFixed(1)} V ${b.load >= LOAD_LIMIT ? '≥' : '<'} ${LOAD_LIMIT} V`});
  };
  const doSg = () => {
    patch(b.id, {sg: true});
    setNote(null);
  };

  const tested = bats.filter((x) => obs[x.id]?.ocv != null && obs[x.id]?.load != null && obs[x.id]?.sg).length;
  const right = bats.filter((x) => obs[x.id]?.verdict === TRUTH[x.state]).length;

  return (
    <PracticalSheet
      number={KEY}
      title="Test a Battery: Ready for Use or Needs Recharging?"
      aim="To test 12 V batteries by open-circuit voltage, specific gravity and a load test, and decide whether each is ready for use, needs recharging, or is faulty."
      apparatus={['Four 12 V lead-acid batteries', 'Voltmeter, hydrometer', 'Battery load tester (high-rate discharge tester)']}
      procedure={[
        'Measure the open-circuit voltage (no load).',
        'Read the SG of all six cells.',
        `Load test for 15 s: a healthy battery stays above ${LOAD_LIMIT} V.`,
        'Decide: ready, needs recharging, or faulty.',
      ]}
      precautions={['Load test for no more than 15 seconds: the tester gets very hot.', 'Connect the tester red to +, black to −, before switching on.', 'Wear goggles when using a hydrometer.']}
      viva={[
        {q: 'What OCV does a fully charged 12 V battery show?', a: 'About 12.6–12.7 V.'},
        {q: 'How do you tell a flat battery from a faulty one?', a: 'A flat battery has low OCV and low SG in all cells evenly, and recovers after charging. A faulty one has one dead cell (one SG much lower, OCV near 10.5 V), or good OCV that collapses under load.'},
        {q: 'Why is a load test needed if the OCV is fine?', a: 'A sulphated battery can show good OCV but cannot deliver current. Only a load test reveals that.'},
      ]}
      tasks={[
        {label: 'Do all three tests on all four batteries.', done: tested === bats.length},
        {label: 'Give the correct verdict for every battery.', done: right === bats.length},
        {label: 'Print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div>
            <span className={styles.label} style={{marginTop: 0}}>
              Battery
            </span>
            <div className={clsx(styles.seg, styles.noPrint)} role="group" aria-label="Battery">
              {bats.map((x, k) => (
                <button
                  key={x.id}
                  type="button"
                  aria-pressed={sel === k}
                  onClick={() => {
                    setSel(k);
                    setNeedle(0);
                    setNote(null);
                  }}>
                  Battery {x.id}
                </button>
              ))}
            </div>
            <span className={styles.label}>Test</span>
            <div className={clsx(styles.seg, styles.noPrint)} role="group" aria-label="Test">
              <button type="button" onClick={doOcv}>
                Open-circuit voltage
              </button>
              <button type="button" onClick={doSg}>
                Hydrometer (6 cells)
              </button>
              <button type="button" onClick={doLoad}>
                Load test 15 s
              </button>
            </div>
            {obs[b.id]?.sg && (
              <Table caption={`Battery ${b.id}: SG per cell`} head={b.sg.map((_, k) => `Cell ${k + 1}`)} rows={[b.sg.map((x) => <span className={styles.num}>{x.toFixed(3)}</span>)]} />
            )}
            <NoteBox note={note} />
          </div>
          <AnalogMeter spec={TESTER} value={needle} title="Battery tester voltmeter" />
        </div>
      </Section>
      <Section title="Observation table and verdict">
        <Table
          head={['Battery', 'OCV (V)', 'SG (min – max)', 'Load test (V)', 'Verdict', 'Check']}
          rows={bats.map((x) => {
            const o = obs[x.id] ?? {};
            return [
              x.id,
              <span className={styles.num}>{o.ocv?.toFixed(2) ?? '–'}</span>,
              <span className={styles.num}>{o.sg ? `${Math.min(...x.sg).toFixed(3)} – ${Math.max(...x.sg).toFixed(3)}` : '–'}</span>,
              <span className={styles.num}>{o.load?.toFixed(1) ?? '–'}</span>,
              <select className={styles.select} aria-label={`Battery ${x.id} verdict`} value={o.verdict ?? ''} onChange={(e) => patch(x.id, {verdict: e.target.value})}>
                <option value="">Choose…</option>
                {Object.entries(VERDICT).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>,
              o.verdict ? <Verdict ok={o.verdict === TRUTH[x.state]} /> : '–',
            ];
          })}
        />
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
