import React, {useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import {GU_1_2_18} from './gu';
import useStoredState from '../useStoredState';
import {NoteBox, ResetKit, Section, Table, Verdict, shuffle, useKitSeed, useRng, type Note} from '../kit';
import styles from '../styles.module.css';

const KEY = '1.2.18';

/** Standard Wire Gauge diameters (mm). */
const SWG: {g: number; d: number}[] = [
  {g: 12, d: 2.642},
  {g: 14, d: 2.032},
  {g: 16, d: 1.626},
  {g: 18, d: 1.219},
  {g: 20, d: 0.914},
  {g: 22, d: 0.711},
  {g: 24, d: 0.559},
  {g: 26, d: 0.457},
];

const PX_PER_MM = 120;
const X0 = 60;

/** Close-up of a 0–25 mm micrometer's sleeve and thimble at a reading (mm). */
function MicrometerScale({reading}: {reading: number}): React.JSX.Element {
  const edge = X0 + reading * PX_PER_MM;
  const msr = Math.floor(reading / 0.5 + 1e-9) * 0.5;
  const cur = (reading - msr) * 100; // thimble division at the index line
  const ink = '#1f1f1f';
  const mm = Array.from({length: 6}, (_, k) => k);
  return (
    <svg viewBox="0 0 620 210" role="img" aria-label="Micrometer sleeve and thimble scale" className={styles.micro}>
      <rect x="0" y="0" width="620" height="210" rx="10" fill="#e7ebee" />
      {/* sleeve */}
      <rect x="30" y="80" width={Math.max(0, edge - 30)} height="60" fill="#d6dadd" stroke="#9aa3a8" />
      <line x1="30" y1="110" x2={edge} y2="110" stroke={ink} strokeWidth="1.4" />
      {mm.map((k) => {
        const x = X0 + k * PX_PER_MM;
        const hx = x + PX_PER_MM / 2;
        return (
          <g key={k}>
            {x <= edge && <line x1={x} y1="110" x2={x} y2={k % 5 === 0 ? 88 : 96} stroke={ink} strokeWidth="1.3" />}
            {x <= edge && (
              <text x={x} y="80" textAnchor="middle" style={{fill: ink, fontSize: 15, fontWeight: 700}}>
                {k}
              </text>
            )}
            {hx <= edge && <line x1={hx} y1="110" x2={hx} y2="122" stroke={ink} strokeWidth="1.1" />}
          </g>
        );
      })}
      {/* thimble */}
      <path d={`M${edge} 60 L${edge + 16} 50 H600 V170 H${edge + 16} L${edge} 160 Z`} fill="#c9ced2" stroke="#8a9399" />
      <clipPath id="thimbleClip">
        <rect x={edge} y="54" width="70" height="112" />
      </clipPath>
      <g clipPath="url(#thimbleClip)">
        {Array.from({length: 17}, (_, j) => {
          const d = Math.round(cur) - 8 + j;
          const y = 110 - (d - cur) * 12;
          const div = ((d % 50) + 50) % 50;
          return (
            <g key={j}>
              <line x1={edge} y1={y} x2={edge + (div % 5 === 0 ? 26 : 15)} y2={y} stroke={ink} strokeWidth="1.4" />
              {div % 5 === 0 && (
                <text x={edge + 30} y={y + 5} style={{fill: ink, fontSize: 14, fontWeight: 700}}>
                  {div}
                </text>
              )}
            </g>
          );
        })}
      </g>
      <text x="310" y="196" textAnchor="middle" style={{fill: '#555', fontSize: 11}}>
        Sleeve: mm above the line, half-mm below · Thimble: 50 divisions, 0.01 mm each
      </text>
    </svg>
  );
}

interface Ans {
  swg?: string;
  msr?: string;
  td?: string;
  dia?: string;
}

/** 1.2.18 Measure the gauge of the wire using SWG and outside micrometer. */
export default function WireGaugeLab(): React.JSX.Element {
  const [seed, newKit] = useKitSeed(KEY);
  const samples = useRng(seed, (rnd) => shuffle(SWG.slice(1, 8), rnd).slice(0, 4));
  const [ans, setAns] = useStoredState<Record<number, Ans>>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [sel, setSel] = useState(0);
  const [closed, setClosed] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const set = (k: number, p: Partial<Ans>) => setAns((a) => ({...a, [k]: {...a[k], ...p}}));

  const w = samples[sel];
  const dia = Math.round(w.d * 100) / 100; // what a 0.01 mm micrometer shows
  const reading = closed ? dia : 6.5;

  const tryGauge = (slot: (typeof SWG)[number]) => {
    if (slot.d + 1e-9 < w.d) return setNote({kind: 'warn', text: `Slot ${slot.g}: the wire will not go in. Too narrow.`});
    if (slot.g === w.g)
      return setNote({kind: 'good', text: `Slot ${slot.g}: the wire slides in snugly with no play. This is its gauge.`});
    return setNote({kind: 'info', text: `Slot ${slot.g}: the wire goes in but is loose. Try a smaller slot (higher number).`});
  };

  const res = samples.map((s, k) => {
    const a = ans[k] ?? {};
    const d = Math.round(s.d * 100) / 100;
    const msr = Math.floor(d / 0.5 + 1e-9) * 0.5;
    const td = Math.round((d - msr) * 100);
    const n = (x?: string) => (x && x.trim() !== '' && !Number.isNaN(Number(x)) ? Number(x) : null);
    return {
      d,
      swg: a.swg ? n(a.swg) === s.g : null,
      msr: a.msr ? n(a.msr) != null && Math.abs(n(a.msr)! - msr) < 1e-6 : null,
      td: a.td ? n(a.td) === td : null,
      dia: a.dia ? n(a.dia) != null && Math.abs(n(a.dia)! - d) <= 0.0051 : null,
    };
  });

  return (
    <PracticalSheet
      number={KEY}
      title="Measure the Gauge of a Wire Using an SWG Gauge and Outside Micrometer"
      aim="To find the gauge of wires with a standard wire gauge (SWG) and to measure their diameter with an outside micrometer."
      apparatus={['Standard wire gauge (SWG) plate', 'Outside micrometer, 0–25 mm, least count 0.01 mm', 'Four copper wire samples']}
      procedure={[
        'Clean and straighten the wire. Try it in the slots of the SWG plate. The gauge is the slot it fits snugly, without force and without play.',
        'Place the wire between the anvil and spindle of the micrometer, and turn the ratchet until it clicks.',
        'Main scale reading (MSR): the last visible sleeve mark (mm above the line, plus 0.5 mm if a half-mm mark below is visible).',
        'Thimble division (TD): the thimble mark in line with the sleeve’s index line.',
        'Diameter = MSR + TD × 0.01 mm. Compare it with the SWG table.',
      ]}
      precautions={['Always use the ratchet: do not over-tighten the spindle.', 'Check the micrometer for zero error before use.', 'Never force a wire into an SWG slot.']}
      viva={[
        {q: 'What is the least count of an outside micrometer?', a: 'Pitch ÷ number of thimble divisions = 0.5 mm ÷ 50 = 0.01 mm.'},
        {q: 'Why is a ratchet used on a micrometer?', a: 'It slips at a fixed pressure, so every measurement uses the same force and the wire is not squeezed.'},
        {q: 'As the SWG number increases, does the wire get thicker or thinner?', a: 'Thinner. For example, 14 SWG is about 2.03 mm and 22 SWG is about 0.71 mm.'},
        {q: 'Why measure wire gauge in an electrical trade?', a: 'The diameter decides the current-carrying capacity and the resistance of the wire.'},
      ]}
      steps={[
        {label: 'Find the SWG of each wire sample.', hint: 'Select each sample with the sample buttons.', done: res.every((r) => r.swg)},
        {label: 'Read the micrometer for each sample.', hint: 'Diameter = main scale + thimble reading.', done: res.every((r) => r.msr && r.td && r.dia)},
        {label: 'Enter your details and print or save the record.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_2_18}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <span className={styles.label} style={{marginTop: 0}}>
          Wire sample
        </span>
        <div className={clsx(styles.seg, styles.noPrint)} role="group" aria-label="Wire sample">
          {samples.map((_, k) => (
            <button
              key={k}
              type="button"
              aria-pressed={sel === k}
              onClick={() => {
                setSel(k);
                setClosed(false);
                setNote(null);
              }}>
              Sample {k + 1}
            </button>
          ))}
        </div>

        <span className={styles.label}>SWG plate: tap a slot to try the wire in it</span>
        <div className={styles.kit}>
          <svg viewBox="0 0 620 120" role="img" aria-label="SWG gauge plate">
            <rect x="10" y="14" width="600" height="96" rx="12" fill="#b9c0c5" />
            {SWG.map((s, k) => {
              const x = 40 + k * 72;
              const wpx = s.d * 9;
              return (
                <g
                  key={s.g}
                  className={styles.clickable}
                  role="button"
                  tabIndex={0}
                  aria-label={`Try slot ${s.g} SWG`}
                  onClick={() => tryGauge(s)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      tryGauge(s);
                    }
                  }}>
                  <rect x={x - 26} y="14" width="52" height="96" fill="transparent" />
                  <rect x={x - wpx / 2} y="14" width={wpx} height="38" fill="#24313a" />
                  <circle cx={x} cy="56" r={wpx / 2 + 4} fill="#24313a" />
                  <text x={x} y="96" textAnchor="middle" style={{fill: '#1f1f1f', fontSize: 15, fontWeight: 800}}>
                    {s.g}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <span className={styles.label}>Outside micrometer (scale close-up)</span>
        <MicrometerScale reading={reading} />
        <div className={clsx(styles.row, styles.noPrint)} style={{marginTop: '0.5rem'}}>
          <button type="button" className={clsx(styles.btn, styles.primary)} onClick={() => setClosed(true)}>
            Place sample {sel + 1} and turn the ratchet until it clicks
          </button>
          <button type="button" className={styles.btn} onClick={() => setClosed(false)}>
            Open the spindle
          </button>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        <Table
          head={['Sample', 'SWG (from gauge)', 'MSR (mm)', 'TD', 'Diameter = MSR + TD × 0.01 (mm)', 'Check']}
          rows={samples.map((s, k) => {
            const inp = (f: keyof Ans, label: string) => (
              <input className={styles.input} inputMode="decimal" aria-label={`Sample ${k + 1} ${label}`} value={ans[k]?.[f] ?? ''} onChange={(e) => set(k, {[f]: e.target.value})} />
            );
            const r = res[k];
            const all = [r.swg, r.msr, r.td, r.dia];
            return [
              k + 1,
              inp('swg', 'SWG'),
              inp('msr', 'main scale reading'),
              inp('td', 'thimble division'),
              inp('dia', 'diameter'),
              all.some((x) => x == null) ? '–' : <Verdict ok={all.every(Boolean)} no={`✗ ${(['SWG', 'MSR', 'TD', 'diameter'] as const).filter((_, j) => !all[j]).join(', ')}`} />,
            ];
          })}
        />
        <details className={styles.noPrint}>
          <summary className={styles.muted} style={{cursor: 'pointer'}}>
            SWG table
          </summary>
          <Table head={['SWG', ...SWG.map((s) => s.g)]} rows={[['Diameter (mm)', ...SWG.map((s) => s.d)]]} />
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
