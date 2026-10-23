import React, {useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import {GU_1_3_30} from './gu';
import Multimeter from '../Multimeter';
import AnalogMeter, {type DialSpec} from '../AnalogMeter';
import useStoredState from '../useStoredState';
import {ProbeBar, ProbePoint, useProbes} from '../Probes';
import {Empty, NoteBox, ResetKit, Section, Table, Verdict, useKitSeed, useRng, type Note} from '../kit';
import {L2, fmt} from '../solution';
import styles from '../styles.module.css';

const KEY = '1.3.30';

interface Src {
  id: string;
  name: string;
  volts: number;
  draw: 'one' | 'series' | 'parallel' | 'block';
}

const DMM_FNS = [
  {fn: 'off', label: 'OFF'},
  {fn: 'dcv2', label: 'DC V 2'},
  {fn: 'dcv20', label: 'DC V 20'},
  {fn: 'dcv200', label: 'DC V 200'},
];
const DMM_R: Record<string, [number, number]> = {dcv2: [2, 3], dcv20: [20, 2], dcv200: [200, 1]};

const ANA: Record<string, DialSpec> = {
  a2_5: {fsd: 2.5, unit: 'V', divisions: 50, perMajor: 10, movement: 'MC', current: 'DC', position: 'H', accuracy: '2.5', testKV: 2},
  a10: {fsd: 10, unit: 'V', divisions: 50, perMajor: 10, movement: 'MC', current: 'DC', position: 'H', accuracy: '2.5', testKV: 2},
  a50: {fsd: 50, unit: 'V', divisions: 50, perMajor: 10, movement: 'MC', current: 'DC', position: 'H', accuracy: '2.5', testKV: 2},
};
const ANA_LABEL: Record<string, string> = {a2_5: 'DC V 2.5', a10: 'DC V 10', a50: 'DC V 50'};

interface Obs {
  dmm?: string;
  ana?: number;
  anaRange?: string;
  anaTruth?: number;
}

function makeSources(rnd: () => number): Src[] {
  const r = (a: number, b: number) => Number((a + rnd() * (b - a)).toFixed(3));
  const aa1 = r(1.55, 1.62);
  const aa2 = r(1.55, 1.62);
  return [
    {id: 'new', name: 'New AA cell', volts: aa1, draw: 'one'},
    {id: 'old', name: 'Used AA cell', volts: r(1.18, 1.34), draw: 'one'},
    {id: 'li', name: 'Li-ion cell', volts: r(3.7, 4.1), draw: 'one'},
    {id: 'nine', name: '9 V battery', volts: r(8.4, 9.4), draw: 'block'},
    {id: 'ser', name: '2 AA cells in series', volts: Number((aa1 + aa2).toFixed(3)), draw: 'series'},
    {id: 'par', name: '2 AA cells in parallel', volts: Number(((aa1 + aa2) / 2).toFixed(3)), draw: 'parallel'},
    {id: 'lead', name: '12 V battery', volts: r(12.3, 12.8), draw: 'block'},
  ];
}

const CW = 160;
const CH = 130;

/** 1.3.30 Measure the voltages of cells/battery with analog and digital multimeters. */
export default function CellVoltageLab(): React.JSX.Element {
  const [seed, newKit] = useKitSeed(KEY);
  const sources = useRng(seed, makeSources);
  const [obs, setObs] = useStoredState<Record<string, Obs>>(`lab:${KEY}:obs`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [meter, setMeter] = useState<'dmm' | 'ana'>('dmm');
  const [fn, setFn] = useState('off');
  const [anaRange, setAnaRange] = useState('a50');
  const [entry, setEntry] = useState('');
  const [note, setNote] = useState<Note>(null);
  const probes = useProbes();

  const [rs, rt] = (probes.red ?? ':').split(':');
  const [bs, bt] = (probes.black ?? ':').split(':');
  const src = rs && rs === bs && rt !== bt ? sources.find((s) => s.id === rs) ?? null : null;
  const v = src ? src.volts * (rt === '+' ? 1 : -1) : 0;

  let text = '';
  if (fn !== 'off') {
    const [max, dp] = DMM_R[fn];
    text = Math.abs(v) >= max ? 'OL' : v.toFixed(dp);
  }
  const spec = ANA[anaRange];
  const lc = spec.fsd / spec.divisions;
  const anaShows = Math.max(0, Math.min(spec.fsd, v));

  const patch = (id: string, o: Partial<Obs>) => setObs((all) => ({...all, [id]: {...all[id], ...o}}));

  const record = () => {
    if (!src) return setNote({kind: 'warn', text: 'Probes on + and − of one source.'});
    if (meter === 'dmm') {
      if (fn === 'off') return setNote({kind: 'warn', text: 'Select a DC V range.'});
      if (text === 'OL') return setNote({kind: 'warn', text: 'OL: select a higher range.'});
      if (v < 0) return setNote({kind: 'warn', text: 'Negative: probes reversed.'});
      patch(src.id, {dmm: text});
      return setNote({kind: 'good', text: `Noted: ${text} V`});
    }
    if (v < 0) return setNote({kind: 'bad', text: 'Needle kicked back: probes reversed!'});
    if (v > spec.fsd) return setNote({kind: 'bad', text: 'Needle hit the end stop: select a higher range!'});
    const e = Number(entry);
    if (entry.trim() === '' || Number.isNaN(e)) return setNote({kind: 'warn', text: 'Type your analog reading.'});
    patch(src.id, {ana: e, anaRange, anaTruth: anaShows});
    setEntry('');
    setNote(Math.abs(e - anaShows) <= lc / 2 + 1e-9 ? {kind: 'good', text: 'Analog reading noted ✓'} : {kind: 'warn', text: `Noted. Check again: 1 division = ${lc} V. Needle at ${fmt(anaShows / lc)} divisions → ${fmt(anaShows / lc)} × ${lc} = ${fmt(anaShows)} V`});
  };

  const anaOk = (o?: Obs) => o?.ana != null && o.anaTruth != null && o.anaRange != null && Math.abs(o.ana - o.anaTruth) <= ANA[o.anaRange].fsd / ANA[o.anaRange].divisions / 2 + 1e-9;

  const term = (s: Src, sign: '+' | '-', x: number, y: number) => (
    <g key={sign}>
      <circle cx={x} cy={y} r={7} fill={sign === '+' ? '#d4302a' : '#1b1b1b'} stroke="#fff" strokeWidth={1.2} />
      <ProbePoint id={`${s.id}:${sign}`} x={x} y={y} probes={probes} label={`${s.name} ${sign === '+' ? 'positive' : 'negative'}`} r={3.5} />
    </g>
  );
  const cell = (x: number, y: number, w = 70) => (
    <g>
      <rect x={x} y={y} width={w} height={22} rx={5} fill="#2b5fd1" />
      <rect x={x + w} y={y + 6} width={5} height={10} rx={1.5} fill="#9aa3a8" />
    </g>
  );

  return (
    <PracticalSheet
      number={KEY}
      title="Measure Cell and Battery Voltages with Analog and Digital Multimeters"
      aim="To measure the voltages of cells and batteries with digital and analog multimeters, including cells in series and parallel."
      apparatus={['Digital multimeter', 'Analog multimeter', 'AA cells (new and used), Li-ion cell, 9 V and 12 V batteries']}
      procedure={['Red probe to +, black to −.', 'Digital: choose the lowest DC V range that does not show OL.', 'Analog: choose a range above the expected voltage, then read the scale.', 'Compare series and parallel cells.']}
      precautions={['On the analog meter, start on a high range.', 'Observe polarity: a reversed analog meter kicks back.', 'Do not short the cell terminals.']}
      viva={[
        {q: 'Two 1.5 V cells in series give how many volts? In parallel?', a: 'Series: 3 V (voltages add). Parallel: 1.5 V (same voltage, more capacity).'},
        {q: 'Why does a used cell read lower?', a: 'Its chemicals are partly used up, and its internal resistance rises.'},
        {q: 'Why might analog and digital readings differ slightly?', a: 'Analog scale reading error, meter accuracy class, and the analog meter loading the cell.'},
      ]}
      steps={[
        {
          label: 'Set the digital meter to a DC V range.',
          hint: 'Start high, then use the lowest range that does not show OL.',
          done: fn !== 'off' || sources.some((s) => obs[s.id]?.dmm),
        },
        {
          label: 'Touch red to + and black to − of one source.',
          hint: 'Click the red and black probes on the two terminals.',
          done: !!src || sources.some((s) => obs[s.id]?.dmm),
        },
        {
          label: `Measure the five single cells and batteries, pressing Note reading. Done: ${['new', 'old', 'li', 'nine', 'lead'].filter((id) => obs[id]?.dmm).length}/5`,
          hint: 'Reversed probes show a minus sign.',
          done: ['new', 'old', 'li', 'nine', 'lead'].every((id) => obs[id]?.dmm),
        },
        {
          label: 'Measure 2 cells in series, then in parallel.',
          hint: 'Series adds the voltages. Parallel keeps one cell voltage.',
          done: !!(obs.ser?.dmm && obs.par?.dmm),
        },
        {
          label: 'Switch to Analog and pick a range above the voltage.',
          hint: 'Start on DC V 50 and come down. A reversed meter kicks back.',
          done: meter === 'ana' || sources.some((s) => obs[s.id]?.ana != null),
        },
        {
          label: `Read four sources on the analog meter. Correct: ${Math.min(4, sources.filter((s) => anaOk(obs[s.id])).length)}/4`,
          hint: 'Type the reading, then press Note reading. 1 division = range ÷ 50.',
          done: sources.filter((s) => anaOk(obs[s.id])).length >= 4,
        },
        {label: 'Enter your details and print or save the record.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_3_30}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div>
            <div className={styles.kit}>
              <svg viewBox={`0 0 ${CW * 4} ${CH * 2}`} role="img" aria-label="Cells and batteries with + and − terminals">
                {sources.map((s, k) => {
                  const ox = (k % 4) * CW;
                  const oy = Math.floor(k / 4) * CH;
                  return (
                    <g key={s.id}>
                      <text x={ox + CW / 2} y={oy + 20} textAnchor="middle" className={clsx(styles.kitText, styles.small)}>
                        {s.name}
                      </text>
                      {s.draw === 'one' && cell(ox + 42, oy + 50)}
                      {s.draw === 'block' && <rect x={ox + 45} y={oy + 38} width={70} height={46} rx={6} fill={s.id === 'lead' ? '#3b3f44' : '#2d2d2d'} />}
                      {s.draw === 'series' && (
                        <>
                          {cell(ox + 18, oy + 50, 56)}
                          {cell(ox + 80, oy + 50, 56)}
                        </>
                      )}
                      {s.draw === 'parallel' && (
                        <>
                          {cell(ox + 45, oy + 36, 60)}
                          {cell(ox + 45, oy + 66, 60)}
                          <path d={`M${ox + 45} ${oy + 47} H${ox + 36} V${oy + 77} H${ox + 45} M${ox + 110} ${oy + 47} H${ox + 120} V${oy + 77} H${ox + 110}`} className={styles.wire} />
                        </>
                      )}
                      {term(s, '+', ox + CW / 2 + 32, oy + 108)}
                      {term(s, '-', ox + CW / 2 - 32, oy + 108)}
                    </g>
                  );
                })}
              </svg>
            </div>
            <ProbeBar probes={probes} />
          </div>
          <div style={{display: 'grid', gap: '0.6rem', alignContent: 'start'}}>
            <div className={clsx(styles.seg, styles.noPrint)} role="group" aria-label="Meter">
              <button type="button" aria-pressed={meter === 'dmm'} onClick={() => setMeter('dmm')}>
                Digital
              </button>
              <button type="button" aria-pressed={meter === 'ana'} onClick={() => setMeter('ana')}>
                Analog
              </button>
            </div>
            {meter === 'dmm' ? (
              <Multimeter name="Digital multimeter" fn={fn} functions={DMM_FNS} text={text} unit={fn === 'off' ? '' : 'V DC'} placement={src?.name} onFunction={setFn} />
            ) : (
              <div className={styles.card}>
                <AnalogMeter spec={spec} value={src ? v : 0} title="Analog multimeter" />
                <div className={styles.seg} role="group" aria-label="Analog range" style={{marginTop: '0.5rem'}}>
                  {Object.keys(ANA).map((r) => (
                    <button key={r} type="button" aria-pressed={anaRange === r} onClick={() => setAnaRange(r)}>
                      {ANA_LABEL[r]}
                    </button>
                  ))}
                </div>
                <div className={styles.row} style={{marginTop: '0.5rem'}}>
                  <input className={styles.input} inputMode="decimal" aria-label="Your analog reading" placeholder="Reading (V)" value={entry} onChange={(e) => setEntry(e.target.value)} />
                </div>
              </div>
            )}
            <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} onClick={record}>
              Note reading
            </button>
          </div>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {Object.keys(obs).length === 0 ? (
          <Empty>No readings yet.</Empty>
        ) : (
          <Table
            head={['Source', 'Digital (V)', 'Analog (V)', 'Analog range', 'Check']}
            rows={sources.map((s) => {
              const o = obs[s.id];
              return [
                s.name,
                <span className={styles.num}>{o?.dmm ?? '–'}</span>,
                <span className={styles.num}>{o?.ana ?? '–'}</span>,
                o?.anaRange ? ANA_LABEL[o.anaRange] : '–',
                o?.ana != null ? <Verdict
                    ok={anaOk(o)}
                    fix={{
                      hint: L2(
                        `Reading = divisions crossed by the needle × value of 1 division (1 division = ${fmt(ANA[o.anaRange!].fsd / ANA[o.anaRange!].divisions)} V on this range).`,
                        `રીડિંગ = કાંટાએ પાર કરેલા ડિવિઝન × 1 ડિવિઝનની કિંમત (આ રેન્જમાં 1 ડિવિઝન = ${fmt(ANA[o.anaRange!].fsd / ANA[o.anaRange!].divisions)} V).`,
                      ),
                      work: L2(
                        `Needle at ${fmt(o.anaTruth! / (ANA[o.anaRange!].fsd / ANA[o.anaRange!].divisions))} divisions × ${fmt(ANA[o.anaRange!].fsd / ANA[o.anaRange!].divisions)} V = ${fmt(o.anaTruth)} V.`,
                        `કાંટો ${fmt(o.anaTruth! / (ANA[o.anaRange!].fsd / ANA[o.anaRange!].divisions))} ડિવિઝન પર × ${fmt(ANA[o.anaRange!].fsd / ANA[o.anaRange!].divisions)} V = ${fmt(o.anaTruth)} V.`,
                      ),
                      answer: `${fmt(o.anaTruth)} V`,
                      entered: o.ana,
                      expected: o.anaTruth,
                    }}
                  /> : '–',
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
