import React, {useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import useStoredState from '../useStoredState';
import {NoteBox, ResetKit, Section, Table, Verdict, useKitSeed, useRng, type Note} from '../kit';
import styles from '../styles.module.css';

const KEY = '1.3.33';
const REF_T = 27; // °C reference temperature
const CORR = 0.0007; // per °C

/** Example state-of-charge table (12 V lead-acid, at 27 °C). */
const SOC_TABLE: {sg: number; label: string}[] = [
  {sg: 1.265, label: 'Fully charged (100 %)'},
  {sg: 1.235, label: '75 %'},
  {sg: 1.205, label: '50 %'},
  {sg: 1.17, label: '25 %'},
  {sg: 1.14, label: 'Discharged'},
];
const socLabel = (sg: number) => SOC_TABLE.reduce((best, r) => (Math.abs(r.sg - sg) < Math.abs(best.sg - sg) ? r : best)).label;

const round5 = (x: number) => Math.round(x * 200) / 200;

/** Zoomed hydrometer float stem at the liquid surface. Values increase downward. */
function Stem({sg, drawn}: {sg: number; drawn: boolean}): React.JSX.Element {
  const surface = 130;
  const k = 2400; // px per SG unit
  const marks: number[] = [];
  for (let v = round5(sg - 0.05); v <= sg + 0.05 + 1e-9; v = Number((v + 0.005).toFixed(3))) marks.push(v);
  return (
    <svg viewBox="0 0 260 260" className={styles.micro} style={{maxWidth: 320, margin: '0 auto'}} role="img" aria-label="Hydrometer float scale at the liquid surface">
      <rect width="260" height="260" rx="10" fill="#e7ebee" />
      {/* glass barrel */}
      <rect x="60" y="10" width="140" height="222" rx="18" fill="rgba(200,225,240,0.45)" stroke="#8aa" />
      {drawn && <rect x="62" y={surface} width="136" height={230 - surface} rx="4" fill="rgba(240,200,80,0.35)" />}
      {/* float stem */}
      <rect x="110" y="10" width="40" height="222" fill="#fbfaf3" stroke="#999" />
      {drawn ? (
        marks.map((v) => {
          const y = surface + (v - sg) * k;
          const big = Math.abs(v * 100 - Math.round(v * 100)) < 1e-6;
          return (
            <g key={v}>
              <line x1="110" y1={y} x2={110 + (big ? 22 : 12)} y2={y} stroke="#222" strokeWidth={big ? 1.6 : 1} />
              {big && (
                <text x="136" y={y + 4} style={{fill: '#222', fontSize: 11, fontWeight: 700}}>
                  {v.toFixed(2)}
                </text>
              )}
            </g>
          );
        })
      ) : (
        <text x="130" y="135" textAnchor="middle" style={{fill: '#666', fontSize: 12}}>
          empty
        </text>
      )}
      {drawn && <path d={`M62 ${surface} Q 105 ${surface} 110 ${surface - 5} M150 ${surface - 5} Q 155 ${surface} 198 ${surface}`} stroke="#b88a10" strokeWidth="2" fill="none" />}
      <text x="130" y="254" textAnchor="middle" style={{fill: '#555', fontSize: 10}}>
        small marks = 0.005
      </text>
    </svg>
  );
}

interface Ans {
  obs?: string;
  cor?: string;
}

/** 1.3.33 Measure the specific gravity of electrolyte using a hydrometer. */
export default function HydrometerLab(): React.JSX.Element {
  const [seed, newKit] = useKitSeed(KEY);
  const kit = useRng(seed, (rnd) => {
    const temp = 30 + Math.floor(rnd() * 11); // 30–40 °C
    const base = 1.2 + rnd() * 0.06; // corrected SG of good cells
    const weak = Math.floor(rnd() * 6);
    const cells = Array.from({length: 6}, (_, k) => {
      const corrected = base + (rnd() - 0.5) * 0.008 - (k === weak ? 0.06 + rnd() * 0.02 : 0);
      return round5(corrected - (temp - REF_T) * CORR); // what the hydrometer shows
    });
    return {temp, weak, cells};
  });
  const [ans, setAns] = useStoredState<Record<number, Ans>>(`lab:${KEY}:ans`, {});
  const [weakAns, setWeakAns] = useStoredState(`lab:${KEY}:weak`, '');
  const [stateAns, setStateAns] = useStoredState(`lab:${KEY}:state`, '');
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [cell, setCell] = useState(0);
  const [drawn, setDrawn] = useState(false);
  const [note, setNote] = useState<Note>(null);

  const corrOf = (obs: number) => obs + (kit.temp - REF_T) * CORR;
  const n = (x?: string) => (x && x.trim() !== '' && !Number.isNaN(Number(x)) ? Number(x) : null);
  const res = kit.cells.map((sg, k) => {
    const a = ans[k] ?? {};
    return {
      obs: a.obs ? n(a.obs) != null && Math.abs(n(a.obs)! - sg) <= 0.0026 : null,
      cor: a.cor ? n(a.cor) != null && Math.abs(n(a.cor)! - corrOf(sg)) <= 0.003 : null,
    };
  });
  const good = kit.cells.filter((_, k) => k !== kit.weak);
  const avgGood = good.reduce((a, b) => a + corrOf(b), 0) / good.length;
  const stateTruth = socLabel(avgGood);

  return (
    <PracticalSheet
      number={KEY}
      title="Measure the Specific Gravity of Electrolyte Using a Hydrometer"
      aim="To measure the specific gravity of each cell with a hydrometer, correct it for temperature, and judge the battery’s state of charge."
      apparatus={['12 V lead-acid battery (6 cells)', 'Syringe hydrometer', 'Thermometer']}
      procedure={[
        'Remove the vent plug. Squeeze the bulb, dip the nozzle, and release to draw electrolyte until the float is free.',
        'Read the scale where the liquid surface cuts the stem, with your eye level with the surface.',
        `Corrected SG = observed + 0.0007 × (temperature − ${REF_T} °C).`,
        'Return the electrolyte to the same cell. Repeat for all six cells.',
      ]}
      precautions={['Wear goggles and gloves: electrolyte is acid.', 'Return the electrolyte to the same cell.', 'Do not take readings just after topping up with water.', 'Hold the hydrometer upright with the float free.']}
      viva={[
        {q: 'What is specific gravity?', a: 'The ratio of the density of a liquid to that of water.'},
        {q: 'Why does SG fall as a battery discharges?', a: 'The sulphuric acid is used up to form lead sulphate on the plates, so the electrolyte becomes more watery.'},
        {q: 'Why is a temperature correction needed?', a: 'Electrolyte expands when warm, so it reads low. Add 0.0007 for each °C above 27 °C.'},
        {q: 'What does one cell much lower than the others indicate?', a: 'A weak or faulty cell (internal short, sulphation, or leakage).'},
      ]}
      steps={[
        {
          label: 'Pick a cell, squeeze the bulb and draw electrolyte.',
          hint: 'Read the stem where the liquid surface cuts it.',
          done: drawn || Object.keys(ans).length > 0,
        },
        {
          label: `Type the observed SG of all six cells. Correct: ${res.filter((r) => r.obs).length}/6`,
          hint: 'Return the electrolyte to the same cell each time. Small mark = 0.005.',
          done: res.every((r) => r.obs),
        },
        {
          label: `Correct each SG for temperature. Correct: ${res.filter((r) => r.cor).length}/6`,
          hint: `Add 0.0007 per °C above ${REF_T} °C.`,
          done: res.every((r) => r.cor),
        },
        {label: 'Choose the weak cell.', hint: 'It reads much lower than the others.', done: Number(weakAns) === kit.weak + 1},
        {label: 'Choose the battery’s state of charge.', hint: 'Use the corrected SG of the good cells.', done: stateAns === stateTruth},
        {label: 'Enter your details and print or save the record.', hint: 'Practical record, below the result.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div>
            <span className={styles.label} style={{marginTop: 0}}>
              Cell
            </span>
            <div className={clsx(styles.seg, styles.noPrint)} role="group" aria-label="Cell">
              {kit.cells.map((_, k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={cell === k}
                  onClick={() => {
                    setCell(k);
                    setDrawn(false);
                    setNote(null);
                  }}>
                  Cell {k + 1}
                </button>
              ))}
            </div>
            <div className={clsx(styles.row, styles.noPrint)} style={{marginTop: '0.6rem'}}>
              <button
                type="button"
                className={clsx(styles.btn, styles.primary)}
                onClick={() => {
                  setDrawn(true);
                  setNote({kind: 'info', text: `Electrolyte drawn from cell ${cell + 1}. Read the stem at the liquid surface.`});
                }}>
                Squeeze bulb and draw electrolyte
              </button>
              <button type="button" className={styles.btn} onClick={() => setDrawn(false)}>
                Return to cell
              </button>
            </div>
            <div className={styles.card} style={{marginTop: '0.7rem'}}>
              <b>Electrolyte temperature: {kit.temp} °C</b>
              <div className={styles.muted}>Reference {REF_T} °C · correction 0.0007 per °C</div>
            </div>
          </div>
          <Stem sg={kit.cells[cell]} drawn={drawn} />
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        <Table
          head={['Cell', 'Observed SG', 'Corrected SG', 'Check']}
          rows={kit.cells.map((_, k) => [
            k + 1,
            <input className={styles.input} inputMode="decimal" aria-label={`Cell ${k + 1} observed SG`} value={ans[k]?.obs ?? ''} onChange={(e) => setAns((a) => ({...a, [k]: {...a[k], obs: e.target.value}}))} />,
            <input className={styles.input} inputMode="decimal" aria-label={`Cell ${k + 1} corrected SG`} value={ans[k]?.cor ?? ''} onChange={(e) => setAns((a) => ({...a, [k]: {...a[k], cor: e.target.value}}))} />,
            res[k].obs == null || res[k].cor == null ? '–' : <Verdict ok={!!(res[k].obs && res[k].cor)} no={`✗ ${!res[k].obs ? 'observed' : 'corrected'}`} />,
          ])}
        />
      </Section>
      <Section title="Result">
        <Table caption="State of charge (example table, at 27 °C)" head={['SG', ...SOC_TABLE.map((r) => r.sg.toFixed(3))]} rows={[['Charge', ...SOC_TABLE.map((r) => r.label)]]} />
        <div className={styles.fields}>
          <label className={styles.field}>
            Weak cell number
            <select className={styles.select} value={weakAns} onChange={(e) => setWeakAns(e.target.value)}>
              <option value="">Choose…</option>
              {kit.cells.map((_, k) => (
                <option key={k} value={k + 1}>
                  Cell {k + 1}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            State of charge (good cells)
            <select className={styles.select} value={stateAns} onChange={(e) => setStateAns(e.target.value)}>
              <option value="">Choose…</option>
              {SOC_TABLE.map((r) => (
                <option key={r.label}>{r.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div className={styles.row}>
          {weakAns && <Verdict ok={Number(weakAns) === kit.weak + 1} yes="✓ weak cell" no="✗ weak cell" />}
          {stateAns && <Verdict ok={stateAns === stateTruth} yes="✓ state of charge" no="✗ state of charge" />}
        </div>
        <ResetKit
          onReset={() => {
            setAns({});
            setWeakAns('');
            setStateAns('');
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}
