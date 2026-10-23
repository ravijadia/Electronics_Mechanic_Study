import React from 'react';
import PracticalSheet from '../PracticalSheet';
import {GU_1_12_119} from './gu';
import useStoredState from '../useStoredState';
import {ResetKit, Section, Table, Verdict, shuffle, useKitSeed, useRng} from '../kit';
import {L2} from '../solution';
import {PartGrid} from '../m07/IdentifyLabs';
import styles from '../styles.module.css';

// ---------------------------------------------------------------------------
// 1.12.119 Identify flip-flop ICs by the number printed on them
// ---------------------------------------------------------------------------

type FfType = 'RS' | 'D' | 'JK' | 'Latch';

interface Item {
  mark: string;
  type: FfType;
  note: string;
}

const ITEMS: Item[] = [
  {mark: '7474', type: 'D', note: 'Dual D flip-flop, positive edge-triggered, with preset and clear.'},
  {mark: '7475', type: 'Latch', note: 'Quad bistable D latch (transparent while enabled) — used in 1.12.120.'},
  {mark: '7476', type: 'JK', note: 'Dual JK flip-flop (master-slave), with preset and clear.'},
  {mark: '74109', type: 'JK', note: 'Dual JK flip-flop, positive edge-triggered.'},
  {mark: 'CD4013', type: 'D', note: 'CMOS dual D flip-flop.'},
  {mark: 'CD4027', type: 'JK', note: 'CMOS dual JK flip-flop.'},
  {mark: '74279', type: 'RS', note: 'Quad S-R latch.'},
  {mark: '7470', type: 'JK', note: 'AND-gated JK flip-flop (positive edge-triggered, with preset and clear).'},
];

const TYPES: [string, string][] = [
  ['RS', 'R-S flip-flop / latch'],
  ['D', 'D flip-flop'],
  ['JK', 'JK flip-flop'],
  ['Latch', 'Multi-bit D latch'],
];

const sel = (label: string, value: string | undefined, onChange: (v: string) => void) => (
  <select className={styles.select} aria-label={label} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
    <option value="">Choose…</option>
    {TYPES.map(([v, t]) => (
      <option key={v} value={v}>
        {t}
      </option>
    ))}
  </select>
);

export function IdentifyFlipFlopLab(): React.JSX.Element {
  const KEY = '1.12.119';
  const [seed, newKit] = useKitSeed(KEY);
  const items = useRng(seed, (rnd) => shuffle(ITEMS, rnd));
  const [ans, setAns] = useStoredState<Record<number, string>>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);

  const done = items.every((it, k) => ans[k] === it.type);

  return (
    <PracticalSheet
      number={KEY}
      title="Identify Flip-Flop ICs by Their Printed Number"
      aim="To identify eight flip-flop/latch ICs by the number printed on them and classify each as an R-S, D or JK flip-flop, or a multi-bit D latch, from a data book."
      apparatus={['Eight DIP ICs (below)', 'Digital IC data book / pinout reference']}
      procedure={['Read the number printed on each IC.', 'Look it up in the data book.', 'Classify it as R-S, D, JK or a multi-bit latch.']}
      precautions={['Handle CMOS ICs (4000 series) with anti-static care.', 'Check the pinout before wiring any of these ICs into a circuit.']}
      viva={[
        {q: 'What is the key difference between a JK and a D flip-flop?', a: 'A D flip-flop’s output simply follows D at the clock edge; a JK flip-flop toggles when J = K = 1, which a D flip-flop cannot do directly.'},
        {q: 'What does "master-slave" mean for a flip-flop?', a: 'Two internal latch stages: the master captures the input while the clock is high, the slave only updates on the falling edge, avoiding mid-pulse glitches.'},
        {q: 'Why is 7475 called a latch and not a flip-flop?', a: 'It is level-triggered (transparent while its enable is active), not edge-triggered.'},
      ]}
      steps={[
        {label: `Choose a type for every IC in the Observation table. Chosen: ${items.filter((_, k) => !!ans[k]).length}/${items.length}`, hint: 'Read the marking on each IC. Look it up in the data book.', done: items.every((_, k) => !!ans[k])},
        {label: 'Correct every ✗ until all eight are right.', hint: 'Check the type column in the data book.', done},
        {label: 'Enter your details and press Print / Save as PDF.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_12_119}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Component tray">
        <PartGrid parts={items.map((it) => ({kind: 'dip14' as const, o: {mark: it.mark}}))} label="Eight flip-flop and latch ICs, numbered" />
      </Section>
      <Section title="Observation table">
        <Table
          head={['No.', 'Marking', 'Type', 'Check']}
          rows={items.map((it, k) => [k + 1, <span className={styles.num}>{it.mark}</span>, sel(`Part ${k + 1} type`, ans[k], (v) => setAns((x) => ({...x, [k]: v}))), ans[k] ? (
              <Verdict
                ok={ans[k] === it.type}
                fix={{
                  hint: L2('Look the type number up in the data book. Pins J and K = JK; a single D input = D; S and R inputs only = R-S; four D inputs sharing an enable = latch.', 'ડેટા બુકમાં ટાઇપ નંબર શોધો. J અને K પિન = JK; એક D ઇનપુટ = D; ફક્ત S અને R ઇનપુટ = R-S; એક એનેબલવાળા ચાર D ઇનપુટ = લેચ.'),
                  answer: TYPES.find(([v]) => v === it.type)?.[1],
                }}
              />
            ) : (
              '–'
            ),
          ])}
        />
        <details style={{marginTop: '0.6rem'}}>
          <summary className={styles.muted} style={{cursor: 'pointer'}}>
            Data book (extract)
          </summary>
          <Table head={['Type no.', 'Description']} rows={items.map((it) => [it.mark, it.note])} />
        </details>
        <ResetKit
          onReset={() => {
            setAns({});
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}
