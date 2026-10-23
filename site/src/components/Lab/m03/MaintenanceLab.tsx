import React from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import {GU_1_3_32} from './gu';
import useStoredState from '../useStoredState';
import {ResetKit, Section, Table, Verdict, shuffle, useKitSeed, useRng} from '../kit';
import {L2} from '../solution';
import styles from '../styles.module.css';

const KEY = '1.3.32';

const STEPS = [
  'Wear goggles, rubber gloves and apron',
  'Switch off and disconnect the charger and load',
  'Clean the battery top with a damp cloth',
  'Remove terminal corrosion with baking-soda solution and a wire brush',
  'Check the electrolyte level in each cell',
  'Top up with distilled water to the level mark',
  'Tighten the terminals and apply petroleum jelly',
  'Measure and record voltage and specific gravity',
];

const FIXES = {
  clean: 'Clean with baking-soda solution, then apply petroleum jelly',
  topup: 'Top up with distilled water',
  equalise: 'Give an equalising charge, then re-check',
  replace: 'Replace the battery',
  vents: 'Clean the vent holes',
  store: 'Charge fully, then recharge every few weeks',
  acid: 'Top up with acid',
  tap: 'Top up with tap water',
};
type Fix = keyof typeof FIXES;

const CASES: {text: string; fix: Fix}[] = [
  {text: 'White-green powder on the terminals', fix: 'clean'},
  {text: 'Electrolyte level below the top of the plates', fix: 'topup'},
  {text: 'One cell’s specific gravity is much lower than the others', fix: 'equalise'},
  {text: 'Battery case is bulging and cracked', fix: 'replace'},
  {text: 'Vent plugs are blocked with dirt', fix: 'vents'},
  {text: 'Battery will not be used for two months', fix: 'store'},
];

function orderOk(order: number[]): boolean {
  // The first two steps may be done in either order.
  const firstTwo = new Set(order.slice(0, 2));
  return firstTwo.has(0) && firstTwo.has(1) && order.slice(2).every((v, k) => v === k + 2);
}

/** 1.3.32 Maintain the secondary cells. */
export default function MaintenanceLab(): React.JSX.Element {
  const [seed, newKit] = useKitSeed(KEY);
  const start = useRng(seed, (rnd) => shuffle(STEPS.map((_, k) => k), rnd));
  const fixOrder = useRng(seed, (rnd) => shuffle(Object.keys(FIXES) as Fix[], rnd));
  const [order, setOrder] = useStoredState<number[] | null>(`lab:${KEY}:order`, null);
  const [checked, setChecked] = useStoredState(`lab:${KEY}:checked`, false);
  const [ans, setAns] = useStoredState<Record<number, Fix | ''>>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const seq = order ?? start;

  const move = (k: number, d: -1 | 1) => {
    const j = k + d;
    if (j < 0 || j >= seq.length) return;
    const next = [...seq];
    [next[k], next[j]] = [next[j], next[k]];
    setOrder(next);
    setChecked(false);
  };

  const ok = orderOk(seq);
  const casesOk = CASES.every((c, k) => ans[k] === c.fix);

  return (
    <PracticalSheet
      number={KEY}
      title="Maintain the Secondary Cells"
      aim="To carry out routine maintenance of a lead-acid battery in the correct order, and to choose the right action for common battery problems."
      apparatus={['Lead-acid battery', 'Distilled water, baking soda, wire brush, petroleum jelly', 'Goggles, rubber gloves, apron', 'Hydrometer and voltmeter']}
      procedure={['Put the maintenance steps in the correct order.', 'For each problem, choose the right action.']}
      precautions={['Electrolyte is acid: protect your eyes and skin.', 'Never use a naked flame near a battery: hydrogen gas is explosive.', 'Add only distilled water, never acid or tap water.']}
      viva={[
        {q: 'Why is only distilled water used for topping up?', a: 'Only water is lost through gassing. Tap water has impurities that damage the plates.'},
        {q: 'What causes the white powder on terminals?', a: 'Corrosion (sulphate) from acid fumes reacting with the terminals.'},
        {q: 'Why apply petroleum jelly to terminals?', a: 'It keeps out air and moisture and prevents further corrosion.'},
        {q: 'What is an equalising charge?', a: 'A long, low-rate charge that brings all cells to the same, full state.'},
      ]}
      steps={[
        {
          label: 'Arrange the maintenance steps in the correct order.',
          hint: 'Use ▲ ▼. Safety first, then clean, check, top up, measure.',
          done: ok,
        },
        {label: 'Press Check order.', hint: 'A ✓ means the order is right.', done: checked && ok},
        {
          label: `Choose the right action for each problem. Correct: ${CASES.filter((c, k) => ans[k] === c.fix).length}/6`,
          hint: 'Part B. Pick from the list for each row.',
          done: casesOk,
        },
        {label: 'Enter your details and print or save the record.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_3_32}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Part A: Maintenance steps in order">
        <ol className={styles.orderList}>
          {seq.map((s, k) => (
            <li key={s}>
              <span>{STEPS[s]}</span>
              <span className={styles.noPrint}>
                <button type="button" className={styles.iconBtn} aria-label={`Move “${STEPS[s]}” up`} onClick={() => move(k, -1)} disabled={k === 0}>
                  ▲
                </button>
                <button type="button" className={styles.iconBtn} aria-label={`Move “${STEPS[s]}” down`} onClick={() => move(k, 1)} disabled={k === seq.length - 1}>
                  ▼
                </button>
              </span>
            </li>
          ))}
        </ol>
        <div className={clsx(styles.row, styles.noPrint)}>
          <button type="button" className={clsx(styles.btn, styles.primary)} onClick={() => setChecked(true)}>
            Check order
          </button>
          {checked && <Verdict
              ok={ok}
              no="✗ not yet. Think: safety first, then clean, then check, then top up"
              fix={{
                hint: L2('Safety and cleaning come first, then check the level, top up, tighten the terminals, and measure last.', 'પહેલાં સલામતી અને સફાઈ, પછી લેવલ તપાસો, ટોપ-અપ, ટર્મિનલ ટાઇટ અને છેલ્લે માપન.'),
                answer: STEPS.map((s, i) => `${i + 1}. ${s}`).join('  '),
              }}
            />}
        </div>
      </Section>
      <Section title="Part B: Problems and actions">
        <Table
          head={['Problem', 'Action', 'Check']}
          rows={CASES.map((c, k) => [
            c.text,
            <select className={styles.select} aria-label={`Action for: ${c.text}`} value={ans[k] ?? ''} onChange={(e) => setAns((a) => ({...a, [k]: e.target.value as Fix}))}>
              <option value="">Choose…</option>
              {fixOrder.map((f) => (
                <option key={f} value={f}>
                  {FIXES[f]}
                </option>
              ))}
            </select>,
            ans[k] ? <Verdict
              ok={ans[k] === c.fix}
              fix={{
                hint: L2('Think about the cause of the problem, then choose the action that removes that cause safely.', 'સમસ્યાનું કારણ વિચારો, પછી તે કારણ સલામત રીતે દૂર કરે તેવી ક્રિયા પસંદ કરો.'),
                answer: FIXES[c.fix],
              }}
            /> : '–',
          ])}
        />
        <ResetKit
          onReset={() => {
            setOrder(null);
            setChecked(false);
            setAns({});
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}
