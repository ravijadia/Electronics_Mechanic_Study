import React, {useState} from 'react';
import PracticalSheet from '../PracticalSheet';
import useStoredState from '../useStoredState';
import {Empty, ResetKit, Section, Table, Verdict, useKitSeed, useRng} from '../kit';
import {useNetworkBench, makeValues, valueList, type NetDef, type Quantity, type Recorded} from './NetworkBench';
import {fmtOhms, near} from './parts';
import styles from '../styles.module.css';

const pick = (rnd: () => number, list: number[]) => list[Math.floor(rnd() * list.length)];
const num = (s?: string) => (s && s.trim() !== '' && !Number.isNaN(Number(s)) ? Number(s) : null);

/** Observation table: one row per quantity with the noted reading and a check. */
function Readings({quantities, records, truth}: {quantities: Quantity[]; records: Record<string, Recorded>; truth: (q: Quantity, v?: number) => number}) {
  if (!Object.keys(records).length) return <Empty>No readings yet.</Empty>;
  return (
    <Table
      head={['Quantity', 'Supply set', 'Reading', 'Check']}
      rows={quantities.map((q) => {
        const r = records[q.id];
        const unit = q.kind === 'V' ? 'V' : q.kind === 'I' ? 'mA' : 'Ω';
        return [
          q.label,
          r && q.kind !== 'R' ? `${r.setV.toFixed(1)} V` : '–',
          r ? <span className={styles.num}>{q.kind === 'R' ? fmtOhms(r.value) : `${r.text} ${unit}`}</span> : '–',
          r ? <Verdict ok={near(r.value, truth(q, r.setV), q.kind === 'R' ? 0.02 : 0.03)} /> : '–',
        ];
      })}
    />
  );
}

/** A law check: the trainee adds readings and compares with another reading. */
interface Law {
  id: string;
  sum: string[];
  equals: string;
  label: string;
  unit: string;
}

function LawTable({laws, records, ans, setAns}: {laws: Law[]; records: Record<string, Recorded>; ans: Record<string, string>; setAns: (f: (a: Record<string, string>) => Record<string, string>) => void}) {
  return (
    <Table
      head={['Law', 'Your sum', 'Compare with', 'Result']}
      rows={laws.map((l) => {
        const have = [...l.sum, l.equals].every((k) => records[k]);
        const sum = l.sum.reduce((a, k) => a + (records[k]?.value ?? 0), 0);
        const entered = num(ans[l.id]);
        const sumOk = entered != null && Math.abs(entered - sum) <= Math.max(0.02, sum * 0.005);
        const lawOk = have && near(sum, records[l.equals].value, 0.03);
        return [
          l.label,
          <input className={styles.input} style={{maxWidth: '6rem'}} inputMode="decimal" aria-label={`${l.label}, your sum in ${l.unit}`} value={ans[l.id] ?? ''} disabled={!have} onChange={(e) => setAns((a) => ({...a, [l.id]: e.target.value}))} />,
          have ? `${l.equals} = ${records[l.equals].text} ${l.unit}` : 'take readings first',
          !have || entered == null ? '–' : !sumOk ? <Verdict ok={false} no="✗ add again" /> : <Verdict ok={lawOk} yes="✓ verified" no="✗ differs: check readings" />,
        ];
      })}
    />
  );
}

const lawDone = (laws: Law[], records: Record<string, Recorded>, ans: Record<string, string>) =>
  laws.every((l) => {
    const sum = l.sum.reduce((a, k) => a + (records[k]?.value ?? NaN), 0);
    const e = num(ans[l.id]);
    return e != null && Math.abs(e - sum) <= Math.max(0.02, sum * 0.005) && near(sum, records[l.equals]?.value ?? NaN, 0.03);
  });

const oneSetting = (records: Record<string, Recorded>, ids: string[]) => new Set(ids.filter((k) => records[k]).map((k) => records[k].setV)).size <= 1;
const SAME_V = 'Take all V and I readings at one supply setting.';

// ---------------------------------------------------------------------------
// 1.7.55 Kirchhoff’s laws
// ---------------------------------------------------------------------------

const KIRCHHOFF: NetDef = {
  w: 640,
  h: 300,
  wires: 'M150 70 H216 M244 70 H284 M356 70 H560 V96 M440 70 V96 M440 124 V144 M560 124 V144 M440 216 V260 M560 216 V260 H200 V230 H150',
  parts: [
    {id: 'L1', kind: 'link', a: 'P', b: 'P1', x: 230, y: 70},
    {id: 'R1', kind: 'R', a: 'P1', b: 'A', x: 320, y: 70},
    {id: 'L2', kind: 'link', a: 'A', b: 'B2', x: 440, y: 110, vertical: true},
    {id: 'R2', kind: 'R', a: 'B2', b: 'N', x: 440, y: 180, vertical: true},
    {id: 'L3', kind: 'link', a: 'A', b: 'B3', x: 560, y: 110, vertical: true},
    {id: 'R3', kind: 'R', a: 'B3', b: 'N', x: 560, y: 180, vertical: true},
  ],
  pads: [
    {node: 'P1', x: 284, y: 70, label: 'R1 left end'},
    {node: 'A', x: 356, y: 70, label: 'R1 right end'},
    {node: 'B2', x: 440, y: 144, label: 'R2 top end'},
    {node: 'N', x: 440, y: 216, label: 'R2 bottom end'},
    {node: 'B3', x: 560, y: 144, label: 'R3 top end'},
    {node: 'N', x: 560, y: 216, label: 'R3 bottom end'},
  ],
};

const KQ: Quantity[] = [
  {id: 'Vs', label: 'Vs (supply)', kind: 'V', pairs: [['P', 'N']]},
  {id: 'V1', label: 'V1 (across R1)', kind: 'V', pairs: [['P1', 'A']]},
  {id: 'V2', label: 'V2 (across R2)', kind: 'V', pairs: [['B2', 'N']]},
  {id: 'V3', label: 'V3 (across R3)', kind: 'V', pairs: [['B3', 'N']]},
  {id: 'I1', label: 'I1 (link L1)', kind: 'I', link: 'L1'},
  {id: 'I2', label: 'I2 (link L2)', kind: 'I', link: 'L2'},
  {id: 'I3', label: 'I3 (link L3)', kind: 'I', link: 'L3'},
];

export function KirchhoffLab(): React.JSX.Element {
  const KEY = '1.7.55';
  const [seed, newKit] = useKitSeed(KEY);
  const nominal = useRng(seed, (rnd) => ({R1: pick(rnd, [470, 560, 680, 820, 1000]), R2: pick(rnd, [1000, 1200, 1500, 1800, 2200]), R3: pick(rnd, [1500, 2200, 2700, 3300, 4700])}));
  const actual = useRng(seed + 7, (rnd) => makeValues(nominal, rnd));
  const bench = useNetworkBench({key: KEY, def: KIRCHHOFF, nominal, actual, quantities: KQ});
  const [ans, setAns] = useStoredState<Record<string, string>>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const laws: Law[] = [
    {id: 'kvl', label: 'KVL: V1 + V2 = Vs', sum: ['V1', 'V2'], equals: 'Vs', unit: 'V'},
    {id: 'kcl', label: 'KCL: I2 + I3 = I1', sum: ['I2', 'I3'], equals: 'I1', unit: 'mA'},
  ];
  const rec = bench.records;
  const same = oneSetting(rec, KQ.map((q) => q.id));

  return (
    <PracticalSheet
      number={KEY}
      title="Verify Kirchhoff’s Current and Voltage Laws"
      aim="To measure currents and voltages in a DC circuit and verify Kirchhoff’s current law (KCL) and voltage law (KVL)."
      apparatus={['DC supply 0–12 V', `Resistors: ${valueList(nominal)}`, 'Breadboard with links L1–L3', 'Digital multimeter']}
      procedure={[
        'Set the supply (e.g. 6 V) and switch on.',
        'Measure Vs, V1, V2 and V3 on DC V: red probe on the + side.',
        'For each current: switch off, pull the link, put the probes in its two sockets, select DC mA, switch on and read.',
        'Refit the link after each current reading.',
        'Add the readings and compare.',
      ]}
      precautions={['Switch off before pulling or fitting a link.', 'Never put the meter on mA across a part.', 'Start on the higher current range.']}
      viva={[
        {q: 'State KCL.', a: 'The total current entering a junction equals the total current leaving it.'},
        {q: 'State KVL.', a: 'In any closed loop, the sum of the voltage drops equals the sum of the source EMFs.'},
        {q: 'Why is V2 equal to V3 here?', a: 'R2 and R3 are in parallel: both are connected between the same two points.'},
        {q: 'Why is an ammeter connected in series?', a: 'The current to be measured must flow through it.'},
      ]}
      steps={[
        {
          label: 'Set the supply to about 6 V and switch ON.',
          hint: 'Take every reading at this one setting.',
          done: bench.power || Object.keys(rec).length > 0,
        },
        {
          label: 'Measure Vs, V1, V2 and V3 on DC V.',
          hint: 'Red probe on the + side, then Note reading.',
          done: ['Vs', 'V1', 'V2', 'V3'].every((k) => rec[k]),
        },
        {
          label: 'Measure I1, I2 and I3 at the links.',
          hint: 'Supply OFF, pull the link, probes in its sockets, DC mA.',
          done: ['I1', 'I2', 'I3'].every((k) => rec[k]),
        },
        {
          label: 'Add the readings in the Result table.',
          hint: 'KVL: V1 + V2 = Vs. KCL: I2 + I3 = I1.',
          done: same && lawDone(laws, rec, ans),
        },
        {label: 'Enter your details and print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">{bench.view}</Section>
      <Section title="Observation table">
        <Readings quantities={KQ} records={rec} truth={bench.truth} />
      </Section>
      <Section title="Result">
        {!same && <p className={styles.no}>{SAME_V}</p>}
        <LawTable laws={laws} records={rec} ans={ans} setAns={setAns} />
        <ResetKit
          onReset={() => {
            bench.setRecords({});
            setAns({});
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// 1.7.56 Laws of series and parallel circuits
// ---------------------------------------------------------------------------

const SERIES: NetDef = {
  w: 640,
  h: 300,
  wires: 'M150 70 H216 M244 70 H284 M356 70 H394 M466 70 H486 M514 70 H560 V114 M560 186 V260 H200 V230 H150',
  parts: [
    {id: 'L1', kind: 'link', a: 'P', b: 'P1', x: 230, y: 70},
    {id: 'R1', kind: 'R', a: 'P1', b: 'A', x: 320, y: 70},
    {id: 'R2', kind: 'R', a: 'A', b: 'B', x: 430, y: 70},
    {id: 'L2', kind: 'link', a: 'B', b: 'C', x: 500, y: 70},
    {id: 'R3', kind: 'R', a: 'C', b: 'N', x: 560, y: 150, vertical: true},
  ],
  pads: [
    {node: 'P1', x: 284, y: 70, label: 'R1 left end'},
    {node: 'A', x: 356, y: 70, label: 'R1 right end'},
    {node: 'A', x: 394, y: 70, label: 'R2 left end'},
    {node: 'B', x: 466, y: 70, label: 'R2 right end'},
    {node: 'C', x: 560, y: 114, label: 'R3 top end'},
    {node: 'N', x: 560, y: 186, label: 'R3 bottom end'},
  ],
};
const SQ: Quantity[] = [
  {id: 'Vs', label: 'Vs (supply)', kind: 'V', pairs: [['P', 'N']]},
  {id: 'V1', label: 'V1 (across R1)', kind: 'V', pairs: [['P1', 'A']]},
  {id: 'V2', label: 'V2 (across R2)', kind: 'V', pairs: [['A', 'B']]},
  {id: 'V3', label: 'V3 (across R3)', kind: 'V', pairs: [['C', 'N']]},
  {id: 'I1', label: 'I at L1', kind: 'I', link: 'L1'},
  {id: 'I2', label: 'I at L2', kind: 'I', link: 'L2'},
];

const PARALLEL: NetDef = {
  w: 640,
  h: 300,
  wires: 'M150 70 H216 M244 70 H580 V96 M340 70 V96 M460 70 V96 M340 124 V144 M460 124 V144 M580 124 V144 M340 216 V260 M460 216 V260 M580 216 V260 H200 V230 H150',
  parts: [
    {id: 'L0', kind: 'link', a: 'P', b: 'A', x: 230, y: 70},
    {id: 'L1', kind: 'link', a: 'A', b: 'B1', x: 340, y: 110, vertical: true},
    {id: 'R1', kind: 'R', a: 'B1', b: 'N', x: 340, y: 180, vertical: true},
    {id: 'L2', kind: 'link', a: 'A', b: 'B2', x: 460, y: 110, vertical: true},
    {id: 'R2', kind: 'R', a: 'B2', b: 'N', x: 460, y: 180, vertical: true},
    {id: 'L3', kind: 'link', a: 'A', b: 'B3', x: 580, y: 110, vertical: true},
    {id: 'R3', kind: 'R', a: 'B3', b: 'N', x: 580, y: 180, vertical: true},
  ],
  pads: [1, 2, 3].flatMap((k) => [
    {node: `B${k}`, x: 220 + k * 120, y: 144, label: `R${k} top end`},
    {node: 'N', x: 220 + k * 120, y: 216, label: `R${k} bottom end`},
  ]),
};
const PQ: Quantity[] = [
  {id: 'Vs', label: 'Vs (supply)', kind: 'V', pairs: [['P', 'N']]},
  {id: 'V1', label: 'V1 (across R1)', kind: 'V', pairs: [['B1', 'N']]},
  {id: 'V2', label: 'V2 (across R2)', kind: 'V', pairs: [['B2', 'N']]},
  {id: 'V3', label: 'V3 (across R3)', kind: 'V', pairs: [['B3', 'N']]},
  {id: 'I', label: 'I total (link L0)', kind: 'I', link: 'L0'},
  {id: 'I1', label: 'I1 (link L1)', kind: 'I', link: 'L1'},
  {id: 'I2', label: 'I2 (link L2)', kind: 'I', link: 'L2'},
  {id: 'I3', label: 'I3 (link L3)', kind: 'I', link: 'L3'},
];

export function SeriesParallelLab(): React.JSX.Element {
  const KEY = '1.7.56';
  const [seed, newKit] = useKitSeed(KEY);
  const sNom = useRng(seed, (rnd) => ({R1: pick(rnd, [470, 680, 1000]), R2: pick(rnd, [1000, 1500, 2200]), R3: pick(rnd, [1200, 1800, 2700])}));
  const pNom = useRng(seed + 1, (rnd) => ({R1: pick(rnd, [1000, 1500, 2200]), R2: pick(rnd, [2200, 2700, 3300]), R3: pick(rnd, [3300, 4700, 6800])}));
  const sAct = useRng(seed + 2, (rnd) => makeValues(sNom, rnd));
  const pAct = useRng(seed + 3, (rnd) => makeValues(pNom, rnd));
  const sb = useNetworkBench({key: `${KEY}-s`, def: SERIES, nominal: sNom, actual: sAct, quantities: SQ});
  const pb = useNetworkBench({key: `${KEY}-p`, def: PARALLEL, nominal: pNom, actual: pAct, quantities: PQ});
  const [board, setBoard] = useState<'s' | 'p'>('s');
  const [ans, setAns] = useStoredState<Record<string, string>>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);

  const sLaws: Law[] = [{id: 'sv', label: 'V1 + V2 + V3 = Vs', sum: ['V1', 'V2', 'V3'], equals: 'Vs', unit: 'V'}];
  const pLaws: Law[] = [{id: 'pi', label: 'I1 + I2 + I3 = I', sum: ['I1', 'I2', 'I3'], equals: 'I', unit: 'mA'}];
  const sr = sb.records;
  const pr = pb.records;
  const sRt = sNom.R1 + sNom.R2 + sNom.R3;
  const pRt = 1 / (1 / pNom.R1 + 1 / pNom.R2 + 1 / pNom.R3);
  const sRtMeas = sr.Vs && sr.I1 ? sr.Vs.value / (sr.I1.value / 1000) : null;
  const pRtMeas = pr.Vs && pr.I ? pr.Vs.value / (pr.I.value / 1000) : null;
  const rtRow = (id: string, label: string, calc: number, meas: number | null) => {
    const e = num(ans[id]);
    return [
      label,
      <input className={styles.input} style={{maxWidth: '6rem'}} inputMode="decimal" aria-label={`${label} calculated, ohms`} value={ans[id] ?? ''} onChange={(ev) => setAns((a) => ({...a, [id]: ev.target.value}))} />,
      meas ? fmtOhms(meas) : '–',
      e == null ? '–' : <Verdict ok={near(e, calc, 0.01)} />,
    ];
  };
  const sameI = sr.I1 && sr.I2 && near(sr.I1.value, sr.I2.value, 0.02);
  const sameV = ['V1', 'V2', 'V3'].every((k) => pr[k] && pr.Vs && near(pr[k].value, pr.Vs.value, 0.03));

  return (
    <PracticalSheet
      number={KEY}
      title="Verify the Laws of Series and Parallel Circuits"
      aim="To verify that in a series circuit the current is the same and the voltages add up, and in a parallel circuit the voltage is the same and the currents add up."
      apparatus={['DC supply 0–12 V', `Series board: ${valueList(sNom)}`, `Parallel board: ${valueList(pNom)}`, 'Digital multimeter']}
      procedure={[
        'Series board: measure Vs, V1, V2, V3. Measure the current at L1 and at L2.',
        'Parallel board: measure Vs and the voltage across each resistor. Measure I at L0, L1, L2, L3.',
        'Current: switch off, pull the link, probes in its sockets, DC mA, switch on.',
        'Calculate the total resistance and compare with Vs ÷ I.',
      ]}
      precautions={['Switch off before pulling or fitting a link.', 'Never put the meter on mA across a part.', 'Keep the same supply setting for one set of readings.']}
      viva={[
        {q: 'Series: what is the same through all resistors?', a: 'The current.'},
        {q: 'Parallel: what is the same across all resistors?', a: 'The voltage.'},
        {q: 'Total resistance of 1 kΩ and 1 kΩ in parallel?', a: '500 Ω. Parallel total is always less than the smallest resistor.'},
        {q: 'Which resistor drops the most voltage in series?', a: 'The largest one (V = I × R, same I).'},
        {q: 'Which branch takes the most current in parallel?', a: 'The one with the smallest resistance (I = V ÷ R, same V).'},
      ]}
      steps={[
        {
          label: 'Series board: switch ON and measure Vs, V1, V2, V3.',
          hint: 'Tap Series board. DC V, red probe on the + side, Note reading.',
          done: ['Vs', 'V1', 'V2', 'V3'].every((k) => sr[k]),
        },
        {
          label: 'Series board: measure the current at L1 and L2.',
          hint: 'Supply OFF, pull the link, DC mA. Refit it after.',
          done: !!(sr.I1 && sr.I2),
        },
        {
          label: 'Series board: complete the Result table.',
          hint: 'V1 + V2 + V3 = Vs, and Rt = R1 + R2 + R3.',
          done: !!sameI && oneSetting(sr, SQ.map((q) => q.id)) && lawDone(sLaws, sr, ans) && near(num(ans.srt), sRt, 0.01),
        },
        {
          label: 'Parallel board: measure Vs, V1, V2, V3.',
          hint: 'Tap Parallel board. Switch ON, DC V.',
          done: ['Vs', 'V1', 'V2', 'V3'].every((k) => pr[k]),
        },
        {
          label: 'Parallel board: measure I, I1, I2, I3 at the links.',
          hint: 'Supply OFF, pull the link, DC mA. Refit it after.',
          done: ['I', 'I1', 'I2', 'I3'].every((k) => pr[k]),
        },
        {
          label: 'Parallel board: complete the Result table.',
          hint: 'I1 + I2 + I3 = I, and Rt = 1 ÷ (1/R1 + 1/R2 + 1/R3).',
          done: sameV && oneSetting(pr, PQ.map((q) => q.id)) && lawDone(pLaws, pr, ans) && near(num(ans.prt), pRt, 0.01),
        },
        {label: 'Enter your details and print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.seg} role="group" aria-label="Board" style={{marginBottom: '0.6rem'}}>
          <button type="button" aria-pressed={board === 's'} onClick={() => setBoard('s')}>
            Series board
          </button>
          <button type="button" aria-pressed={board === 'p'} onClick={() => setBoard('p')}>
            Parallel board
          </button>
        </div>
        <div hidden={board !== 's'}>{sb.view}</div>
        <div hidden={board !== 'p'}>{pb.view}</div>
      </Section>
      <Section title="Observation table: series">
        <Readings quantities={SQ} records={sr} truth={sb.truth} />
      </Section>
      <Section title="Observation table: parallel">
        <Readings quantities={PQ} records={pr} truth={pb.truth} />
      </Section>
      <Section title="Result">
        {(!oneSetting(sr, SQ.map((q) => q.id)) || !oneSetting(pr, PQ.map((q) => q.id))) && <p className={styles.no}>{SAME_V}</p>}
        <p>
          Series current same at L1 and L2: {sr.I1 && sr.I2 ? <Verdict ok={!!sameI} yes="✓ yes" no="✗ no" /> : '–'} · Parallel voltage same on all resistors:{' '}
          {['V1', 'V2', 'V3', 'Vs'].every((k) => pr[k]) ? <Verdict ok={sameV} yes="✓ yes" no="✗ no" /> : '–'}
        </p>
        <LawTable laws={sLaws} records={sr} ans={ans} setAns={setAns} />
        <LawTable laws={pLaws} records={pr} ans={ans} setAns={setAns} />
        <Table
          head={['Total resistance', 'Calculated (Ω)', 'Vs ÷ I (measured)', 'Check']}
          rows={[rtRow('srt', 'Series: R1 + R2 + R3', sRt, sRtMeas), rtRow('prt', 'Parallel: 1 ÷ (1/R1 + 1/R2 + 1/R3)', pRt, pRtMeas)]}
        />
        <ResetKit
          onReset={() => {
            sb.setRecords({});
            pb.setRecords({});
            setAns({});
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// 1.7.57 Measure R, V and I in a series–parallel network
// ---------------------------------------------------------------------------

const NETWORK: NetDef = {
  w: 660,
  h: 320,
  wires: 'M150 70 H216 M244 70 H284 M356 70 H580 V86 M440 70 V86 M440 114 V134 M440 206 V285 M580 186 V194 M580 266 V285 H190 V230 H150',
  parts: [
    {id: 'L1', kind: 'link', a: 'P', b: 'P1', x: 230, y: 70},
    {id: 'R1', kind: 'R', a: 'P1', b: 'A', x: 320, y: 70},
    {id: 'L2', kind: 'link', a: 'A', b: 'B2', x: 440, y: 100, vertical: true},
    {id: 'R2', kind: 'R', a: 'B2', b: 'N', x: 440, y: 170, vertical: true},
    {id: 'L3', kind: 'link', a: 'A', b: 'B3', x: 580, y: 100, vertical: true},
    {id: 'R3', kind: 'R', a: 'B3', b: 'B', x: 580, y: 150, vertical: true},
    {id: 'R4', kind: 'R', a: 'B', b: 'N', x: 580, y: 230, vertical: true},
  ],
  pads: [
    {node: 'P1', x: 284, y: 70, label: 'R1 left end'},
    {node: 'A', x: 356, y: 70, label: 'R1 right end'},
    {node: 'B2', x: 440, y: 134, label: 'R2 top end'},
    {node: 'N', x: 440, y: 206, label: 'R2 bottom end'},
    {node: 'B', x: 580, y: 190, label: 'R3–R4 junction'},
    {node: 'N', x: 580, y: 266, label: 'R4 bottom end'},
  ],
};
const NQ: Quantity[] = [
  {id: 'Rt', label: 'Rt (supply terminals, supply off)', kind: 'R', pairs: [['P', 'N']]},
  {id: 'R1', label: 'R1', kind: 'R', pairs: [['P1', 'A']]},
  {id: 'R2', label: 'R2', kind: 'R', pairs: [['B2', 'N']], isolate: ['L2', 'L3']},
  {id: 'R3', label: 'R3', kind: 'R', pairs: [['B3', 'B']], isolate: ['L3', 'L2']},
  {id: 'R4', label: 'R4', kind: 'R', pairs: [['B', 'N']], isolate: ['L3', 'L2']},
  {id: 'Vs', label: 'Vs (supply)', kind: 'V', pairs: [['P', 'N']]},
  {id: 'V1', label: 'V1 (across R1)', kind: 'V', pairs: [['P1', 'A']]},
  {id: 'V2', label: 'V2 (across R2)', kind: 'V', pairs: [['B2', 'N']]},
  {id: 'V3', label: 'V3 (across R3)', kind: 'V', pairs: [['B3', 'B']]},
  {id: 'V4', label: 'V4 (across R4)', kind: 'V', pairs: [['B', 'N']]},
  {id: 'I1', label: 'I1 (link L1)', kind: 'I', link: 'L1'},
  {id: 'I2', label: 'I2 (link L2)', kind: 'I', link: 'L2'},
  {id: 'I3', label: 'I3 (link L3)', kind: 'I', link: 'L3'},
];

export function NetworkLab(): React.JSX.Element {
  const KEY = '1.7.57';
  const [seed, newKit] = useKitSeed(KEY);
  const nominal = useRng(seed, (rnd) => ({
    R1: pick(rnd, [470, 680, 1000]),
    R2: pick(rnd, [1500, 2200, 3300]),
    R3: pick(rnd, [680, 1000, 1200]),
    R4: pick(rnd, [820, 1000, 1500]),
  }));
  const actual = useRng(seed + 7, (rnd) => makeValues(nominal, rnd));
  const bench = useNetworkBench({key: KEY, def: NETWORK, nominal, actual, quantities: NQ});
  const [ans, setAns] = useStoredState<Record<string, string>>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const rec = bench.records;
  const laws: Law[] = [
    {id: 'v', label: 'V1 + V2 = Vs', sum: ['V1', 'V2'], equals: 'Vs', unit: 'V'},
    {id: 'v34', label: 'V3 + V4 = V2', sum: ['V3', 'V4'], equals: 'V2', unit: 'V'},
    {id: 'i', label: 'I2 + I3 = I1', sum: ['I2', 'I3'], equals: 'I1', unit: 'mA'},
  ];
  const rtCalc = nominal.R1 + 1 / (1 / nominal.R2 + 1 / (nominal.R3 + nominal.R4));
  const rOne = (k: string) => !!rec[k] && near(rec[k].value, bench.truth(NQ.find((q) => q.id === k)!), 0.02);
  const vi = NQ.filter((q) => q.kind !== 'R').map((q) => q.id);

  return (
    <PracticalSheet
      number={KEY}
      title="Measure R, V and I in a Series–Parallel Network"
      aim="To measure resistance, voltage and current in a series–parallel resistor network with a multimeter and check them against calculation."
      apparatus={['DC supply 0–12 V', `Resistors: ${valueList(nominal)}`, 'Breadboard with links L1–L3', 'Digital multimeter']}
      procedure={[
        'Supply OFF. Measure Rt across the supply terminals on an Ω range.',
        'Measure each resistor. If another path is in parallel, pull a link to isolate it first.',
        'Refit all links. Switch on and measure every voltage.',
        'Measure I1, I2, I3 by putting the meter in place of each link.',
        'Calculate Rt and check the laws.',
      ]}
      precautions={['Never measure resistance with the supply on.', 'Isolate a resistor before measuring it, or the reading includes other paths.', 'Switch off before pulling or fitting a link.']}
      viva={[
        {q: 'Why does a resistor read low when measured in circuit?', a: 'Other parts of the circuit come in parallel with it.'},
        {q: 'Why switch off before measuring resistance?', a: 'The ohmmeter uses its own battery; the supply voltage gives a false reading and can damage the meter.'},
        {q: 'Formula for Rt of this network?', a: 'Rt = R1 + R2 ∥ (R3 + R4), where a ∥ b = a × b ÷ (a + b).'},
      ]}
      steps={[
        {label: 'Supply OFF: measure Rt across the supply terminals.', hint: 'Ω range. Never measure resistance with the supply on.', done: rOne('Rt')},
        {label: 'Measure R1, R2, R3 and R4 one by one.', hint: 'Pull a link first to isolate R2, R3 or R4.', done: ['R1', 'R2', 'R3', 'R4'].every(rOne)},
        {label: 'Calculate Rt and enter it in the Result table.', hint: 'Rt = R1 + R2 ∥ (R3 + R4).', done: near(num(ans.rt), rtCalc, 0.01)},
        {
          label: 'Refit all links, switch ON and measure Vs, V1 to V4.',
          hint: 'DC V, red probe on the + side, Note reading.',
          done: ['Vs', 'V1', 'V2', 'V3', 'V4'].every((k) => rec[k]),
        },
        {label: 'Measure I1, I2 and I3 at the links.', hint: 'Supply OFF, pull the link, DC mA.', done: ['I1', 'I2', 'I3'].every((k) => rec[k])},
        {
          label: 'Check the three laws in the Result table.',
          hint: 'V1 + V2 = Vs, V3 + V4 = V2, I2 + I3 = I1.',
          done: oneSetting(rec, vi) && lawDone(laws, rec, ans),
        },
        {label: 'Enter your details and print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">{bench.view}</Section>
      <Section title="Observation table">
        <Readings quantities={NQ} records={rec} truth={bench.truth} />
      </Section>
      <Section title="Result">
        {!oneSetting(rec, vi) && <p className={styles.no}>{SAME_V}</p>}
        <Table
          head={['Rt calculated (Ω)', 'Rt measured', 'Check']}
          rows={[
            [
              <input className={styles.input} style={{maxWidth: '7rem'}} inputMode="decimal" aria-label="Rt calculated in ohms" value={ans.rt ?? ''} onChange={(e) => setAns((a) => ({...a, rt: e.target.value}))} />,
              rec.Rt ? fmtOhms(rec.Rt.value) : '–',
              ans.rt ? <Verdict ok={near(num(ans.rt), rtCalc, 0.01)} /> : '–',
            ],
          ]}
        />
        <LawTable laws={laws} records={rec} ans={ans} setAns={setAns} />
        <ResetKit
          onReset={() => {
            bench.setRecords({});
            setAns({});
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}
