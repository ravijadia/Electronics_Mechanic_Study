import React, {useEffect, useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import {GU_1_2_21} from './gu';
import Multimeter from '../Multimeter';
import useStoredState from '../useStoredState';
import {ProbeBar, ProbePoint, useProbes} from '../Probes';
import {Empty, NoteBox, ResetKit, Section, Table, Verdict, useKitSeed, useRng, type Note} from '../kit';
import styles from '../styles.module.css';

const KEY = '1.2.21';

interface Source {
  id: string;
  name: string;
  ac: boolean;
  nominal: string;
  volts: number;
  best: string;
  x: number;
  y: number;
}

const FNS = [
  {fn: 'off', label: 'OFF'},
  {fn: 'dcv2', label: 'DC V 2'},
  {fn: 'dcv20', label: 'DC V 20'},
  {fn: 'dcv200', label: 'DC V 200'},
  {fn: 'dcv1000', label: 'DC V 1000'},
  {fn: 'acv200', label: 'AC V 200'},
  {fn: 'acv750', label: 'AC V 750'},
  {fn: 'ohm', label: 'Ω 2k'},
];
const RANGE: Record<string, {max: number; dp: number; ac: boolean}> = {
  dcv2: {max: 2, dp: 3, ac: false},
  dcv20: {max: 20, dp: 2, ac: false},
  dcv200: {max: 200, dp: 1, ac: false},
  dcv1000: {max: 1000, dp: 0, ac: false},
  acv200: {max: 200, dp: 1, ac: true},
  acv750: {max: 750, dp: 0, ac: true},
};
const FN_LABEL = Object.fromEntries(FNS.map((f) => [f.fn, f.label]));

function makeSources(rnd: () => number): Source[] {
  const r = (a: number, b: number, dp = 2) => Number((a + rnd() * (b - a)).toFixed(dp));
  return [
    {id: 'cell', name: 'Dry cell', ac: false, nominal: '1.5 V DC', volts: r(1.42, 1.61, 3), best: 'dcv2', x: 20, y: 20},
    {id: 'bat9', name: '9 V battery', ac: false, nominal: '9 V DC', volts: r(8.1, 9.5), best: 'dcv20', x: 230, y: 20},
    {id: 'psu', name: 'DC power supply', ac: false, nominal: '24 V DC', volts: r(23.8, 24.3), best: 'dcv200', x: 440, y: 20},
    {id: 'tx6', name: 'Transformer 6 V', ac: true, nominal: '6 V AC', volts: r(6.1, 6.9), best: 'acv200', x: 20, y: 150},
    {id: 'tx12', name: 'Transformer 12 V', ac: true, nominal: '12 V AC', volts: r(12.3, 13.4), best: 'acv200', x: 230, y: 150},
    {id: 'mains', name: 'Mains socket', ac: true, nominal: '230 V AC', volts: Math.round(r(224, 238)), best: 'acv750', x: 440, y: 150},
  ];
}

interface Row {
  src: string;
  fn: string;
  text: string;
}

function reading(fn: string, src: Source | null, sign: number): {text: string; unit: string} {
  if (fn === 'off') return {text: '', unit: ''};
  if (fn === 'ohm') return {text: 'OL', unit: 'Ω'};
  const r = RANGE[fn];
  const unit = r.ac ? 'V AC' : 'V DC';
  if (!src) return {text: (0).toFixed(r.dp), unit};
  // An AC range blocks DC, and a DC range averages AC to about zero.
  const v = r.ac === src.ac ? src.volts * (src.ac ? 1 : sign) : 0;
  if (Math.abs(v) >= r.max) return {text: 'OL', unit};
  return {text: v.toFixed(r.dp), unit};
}

/** 1.2.21 Measure AC and DC voltages using a multimeter. */
export default function VoltageLab(): React.JSX.Element {
  const [seed, newKit] = useKitSeed(KEY);
  const sources = useRng(seed, makeSources);
  const [rows, setRows] = useStoredState<Row[]>(`lab:${KEY}:rows`, []);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [fn, setFn] = useState('off');
  const [damaged, setDamaged] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const probes = useProbes();

  const [rs, rt] = (probes.red ?? ':').split(':');
  const [bs, bt] = (probes.black ?? ':').split(':');
  const src = rs && rs === bs && rt !== bt ? sources.find((s) => s.id === rs) ?? null : null;
  const sign = src && rt === '+' ? 1 : -1;
  let shown = reading(fn, src, sign);
  if (damaged && fn !== 'off') shown = {text: '', unit: ''};
  const crossed = probes.red && probes.black && rs !== bs;

  useEffect(() => {
    if (fn === 'ohm' && src && src.volts > 30 && !damaged) {
      setDamaged(true);
      setNote({kind: 'bad', text: <><b>Meter damaged!</b> Ω range on a live source.</>});
    }
  }, [fn, src, damaged]);

  const record = () => {
    if (!src) return setNote({kind: 'warn', text: 'Place both probes on one source.'});
    if (fn === 'off' || fn === 'ohm' || damaged)
      return setNote({kind: 'warn', text: 'Select a voltage range.'});
    if (shown.text === 'OL') return setNote({kind: 'warn', text: 'OL: select a higher range.'});
    setRows((r) => [...r, {src: src.id, fn, text: shown.text}]);
    const r = RANGE[fn];
    if (r.ac !== src.ac)
      setNote({kind: 'warn', text: <>Wrong range type: this source is <b>{src.ac ? 'AC' : 'DC'}</b>.</>});
    else if (shown.text.startsWith('-'))
      setNote({kind: 'warn', text: 'Minus sign: probes reversed.'});
    else if (fn !== src.best)
      setNote({kind: 'info', text: 'Noted. A lower range gives more digits.'});
    else setNote({kind: 'good', text: `Noted: ${shown.text} ${shown.unit} ✓ best range`});
  };

  const good = (r: Row) => {
    const s = sources.find((x) => x.id === r.src)!;
    return RANGE[r.fn].ac === s.ac && !r.text.startsWith('-');
  };
  const doneCorrect = sources.filter((s) => rows.some((r) => r.src === s.id && good(r)));
  const doneBest = sources.filter((s) => rows.some((r) => r.src === s.id && good(r) && r.fn === s.best));

  return (
    <PracticalSheet
      number={KEY}
      title="Measure AC and DC Voltages Using a Multimeter"
      aim="To measure AC and DC voltages of different sources with a digital multimeter, selecting the correct function and range."
      apparatus={['Digital multimeter', '1.5 V cell, 9 V battery, 24 V DC supply', 'Step-down transformer (6 V and 12 V)', '230 V mains socket']}
      procedure={[
        'Identify whether the source gives AC or DC, and its expected voltage.',
        'Set the meter to the correct function (AC V or DC V) and a range higher than the expected voltage.',
        'Put the red probe on + and the black probe on − (for AC, either way).',
        'Read the display. If it shows OL, go to a higher range. If it shows few digits, go to a lower range that does not show OL.',
        'Press “Note reading”. Measure every source.',
      ]}
      precautions={[
        'Select the function and range before the probes touch the source.',
        'Start on the highest range if the voltage is unknown.',
        'Never use the Ω or current ranges to measure voltage.',
        'For mains, use the AC 750 V range and keep fingers behind the probe guards.',
      ]}
      viva={[
        {q: 'What happens if you measure AC on a DC range?', a: 'Most digital meters read about zero, because the AC averages out to zero over a cycle.'},
        {q: 'What does a minus sign on the display mean on a DC range?', a: 'The probes are reversed: the red probe is on the negative terminal.'},
        {q: 'Why should you choose the lowest range that does not show OL?', a: 'It gives the most digits (best resolution) for that reading.'},
        {q: 'What does the multimeter show for mains AC: peak or RMS value?', a: 'The RMS value (230 V). The peak is about 325 V.'},
        {q: 'Why is a new “1.5 V” cell sometimes 1.6 V, and an old one 1.3 V?', a: 'A fresh cell’s open-circuit voltage is slightly above nominal. It falls as the cell discharges.'},
      ]}
      steps={[
        {label: 'Set AC or DC to match each source and measure it.', hint: 'Check the source label first.', done: doneCorrect.length === sources.length},
        {label: 'Use the best range for at least four sources.', hint: 'Lowest range above the voltage.', done: doneBest.length >= 4},
        {label: 'Enter your details and print or save the record.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_2_21}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div>
            <div className={styles.kit}>
              <svg viewBox="0 0 650 280" role="img" aria-label="Six voltage sources, each with two terminals">
                {sources.map((s) => (
                  <g key={s.id}>
                    <rect x={s.x} y={s.y} width={190} height={110} rx={10} fill="#31414c" stroke="#4d5f6b" />
                    <text x={s.x + 95} y={s.y + 24} textAnchor="middle" className={clsx(styles.kitText, styles.bold)}>
                      {s.name}
                    </text>
                    <text x={s.x + 95} y={s.y + 42} textAnchor="middle" className={clsx(styles.kitText, styles.small)}>
                      {s.ac ? 'AC' : 'DC'}
                    </text>
                    {[
                      {t: '+', dx: 60, fill: s.ac ? '#c79a52' : '#d4302a'},
                      {t: '-', dx: 130, fill: s.ac ? '#c79a52' : '#1b1b1b'},
                    ].map((term) => (
                      <g key={term.t}>
                        <circle cx={s.x + term.dx} cy={s.y + 80} r={11} fill={term.fill} stroke="#fff" strokeWidth={1.5} />
                        <text x={s.x + term.dx} y={s.y + 104} textAnchor="middle" className={clsx(styles.kitText, styles.small)}>
                          {s.ac ? '~' : term.t === '+' ? '+' : '−'}
                        </text>
                        <ProbePoint id={`${s.id}:${term.t}`} x={s.x + term.dx} y={s.y + 80} probes={probes} label={`${s.name} ${s.ac ? 'terminal' : term.t === '+' ? 'positive' : 'negative'} ${term.t === '+' ? 1 : 2}`} r={4} />
                      </g>
                    ))}
                  </g>
                ))}
              </svg>
            </div>
            <ProbeBar probes={probes} />
          </div>
          <div style={{display: 'grid', gap: '0.7rem', alignContent: 'start'}}>
            <Multimeter
              name="Digital multimeter"
              fn={fn}
              functions={FNS}
              text={shown.text}
              unit={shown.unit}
              placement={src ? src.name : crossed ? 'Probes on two different sources' : 'Not connected'}
              onFunction={(f) => {
                setNote(null);
                setFn(f);
              }}
              fault={damaged ? 'Meter damaged' : null}
              repairLabel="Get a new meter"
              onRepair={() => {
                setDamaged(false);
                setFn('off');
                setNote(null);
              }}
            />
            <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} onClick={record}>
              Note reading
            </button>
          </div>
        </div>
        <NoteBox
          note={note}
          status={
            crossed
              ? {kind: 'warn', text: 'Probes on two different sources: no circuit.'}
              : null
          }
        />
      </Section>

      <Section title="Observation table">
        {rows.length === 0 ? (
          <Empty>No readings yet.</Empty>
        ) : (
          <Table
            head={['S. No.', 'Source', 'Expected', 'Function & range', 'Reading', 'Check', '']}
            rows={rows.map((r, k) => {
              const s = sources.find((x) => x.id === r.src)!;
              const unit = RANGE[r.fn].ac ? 'V AC' : 'V DC';
              return [
                k + 1,
                s.name,
                s.nominal,
                FN_LABEL[r.fn],
                <span className={styles.num}>
                  {r.text} {unit}
                </span>,
                <Verdict ok={good(r)} yes={r.fn === s.best ? '✓ best range' : '✓'} no="✗ wrong function / polarity" />,
                <button type="button" className={clsx(styles.iconBtn, styles.noPrint)} aria-label={`Delete reading ${k + 1}`} onClick={() => setRows((x) => x.filter((_, j) => j !== k))}>
                  ✕
                </button>,
              ];
            })}
          />
        )}
        <ResetKit
          onReset={() => {
            setRows([]);
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}
