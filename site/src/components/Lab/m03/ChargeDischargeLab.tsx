import React, {useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import {GU_1_3_31} from './gu';
import Multimeter from '../Multimeter';
import XYGraph from '../XYGraph';
import useStoredState from '../useStoredState';
import {Empty, NoteBox, ResetKit, Section, Table, Verdict, type Note} from '../kit';
import {L2, fmt} from '../solution';
import {CAPACITY_AH, CUTOFF_V, advance, charge, discharge, ocv} from '../battery';
import styles from '../styles.module.css';

const KEY = '1.3.31';
type Mode = 'idle' | 'discharge' | 'charge';

const LOADS = [
  {ohms: 24, label: '24 Ω (≈ 0.5 A)'},
  {ohms: 12, label: '12 Ω (≈ 1 A)'},
  {ohms: 6, label: '6 Ω (≈ 2 A)'},
];

interface Sim {
  soc: number;
  mode: Mode;
  load: number;
  /** Hours since the current discharge / charge started. */
  t: number;
  ahOut: number;
  ahIn: number;
  deep: boolean;
  cutoffSeen: boolean;
}
interface Row {
  mode: 'discharge' | 'charge';
  t: number;
  v: number;
  i: number;
}

const START: Sim = {soc: 1, mode: 'idle', load: 12, t: 0, ahOut: 0, ahIn: 0, deep: false, cutoffSeen: false};

/** 1.3.31 Charge and discharge a battery through a load resistor. */
export default function ChargeDischargeLab(): React.JSX.Element {
  const [sim, setSim] = useStoredState<Sim>(`lab:${KEY}:sim`, START);
  const [rows, setRows] = useStoredState<Row[]>(`lab:${KEY}:rows`, []);
  const [ahAns, setAhAns] = useStoredState(`lab:${KEY}:ah`, '');
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [clip, setClip] = useState<'+' | '-'>('+');
  const [note, setNote] = useState<Note>(null);

  const live =
    sim.mode === 'discharge' ? discharge(sim.soc, sim.load) : sim.mode === 'charge' ? charge(sim.soc) : {i: 0, v: ocv(sim.soc)};
  const amps = sim.mode === 'discharge' ? -live.i : live.i;

  const setMode = (mode: Mode) => {
    setNote(null);
    if (mode === 'charge' && clip === '-') {
      setNote({kind: 'bad', text: <b>Sparks! Charger connected in reverse. Its fuse blew. Red clip goes to +.</b>});
      return;
    }
    if (mode === sim.mode) return;
    // A new discharge/charge run starts its own clock.
    setSim((s) => ({...s, mode, t: mode === 'idle' ? s.t : 0, ...(mode === 'discharge' ? {ahOut: 0, cutoffSeen: false, deep: false} : {}), ...(mode === 'charge' ? {ahIn: 0} : {})}));
    if (mode !== 'idle') setRows((r) => r.filter((x) => x.mode !== mode));
  };

  const step = (h: number) => {
    if (sim.mode === 'idle') return setNote({kind: 'warn', text: 'Connect the load or the charger first.'});
    const res = advance(sim.soc, sim.mode, h, sim.load);
    const after = sim.mode === 'discharge' ? discharge(res.soc, sim.load) : charge(res.soc);
    const next: Sim = {
      ...sim,
      soc: res.soc,
      t: Number((sim.t + h).toFixed(2)),
      ahOut: sim.mode === 'discharge' ? sim.ahOut + res.ah : sim.ahOut,
      ahIn: sim.mode === 'charge' ? sim.ahIn + res.ah : sim.ahIn,
    };
    if (sim.mode === 'discharge' && after.v < CUTOFF_V) {
      if (sim.cutoffSeen) {
        next.deep = true;
        setNote({kind: 'bad', text: <b>Deep discharge! The battery is being damaged. Disconnect the load.</b>});
      } else setNote({kind: 'warn', text: `Below ${CUTOFF_V} V cut-off: note this reading and disconnect the load.`});
      next.cutoffSeen = true;
    } else if (sim.mode === 'charge' && after.i < 0.06) {
      setNote({kind: 'good', text: 'Charging current has tapered off: the battery is fully charged.'});
    } else setNote(null);
    setSim(next);
  };

  const record = () => {
    if (sim.mode === 'idle') return setNote({kind: 'warn', text: 'Connect the load or the charger first.'});
    const row = {mode: sim.mode, t: sim.t, v: Number(live.v.toFixed(2)), i: Number(live.i.toFixed(2))};
    if (rows.some((r) => r.mode === row.mode && r.t === row.t)) return setNote({kind: 'warn', text: 'Already noted at this time. Advance the clock.'});
    setRows((r) => [...r, row]);
    setNote({kind: 'good', text: `Noted: ${row.t} h, ${row.v} V, ${row.i} A`});
  };

  const dis = rows.filter((r) => r.mode === 'discharge').sort((a, b) => a.t - b.t);
  const chg = rows.filter((r) => r.mode === 'charge').sort((a, b) => a.t - b.t);
  const reachedCutoff = dis.some((r) => r.v < CUTOFF_V + 0.15);
  const ahN = Number(ahAns);
  const ahOk = ahAns.trim() !== '' && !Number.isNaN(ahN) && sim.ahOut > 0 ? Math.abs(ahN - sim.ahOut) <= sim.ahOut * 0.12 : null;
  const fullyCharged = chg.length > 0 && chg[chg.length - 1].i < 0.1;

  const pct = Math.round(sim.soc * 100);

  return (
    <PracticalSheet
      number={KEY}
      title="Charge and Discharge a Battery Through a Load Resistor"
      aim="To discharge a 12 V, 7 Ah battery through a load resistor down to its cut-off voltage, recharge it at C/10, and plot the voltage against time."
      apparatus={['12 V, 7 Ah lead-acid battery', 'Load resistors 24 Ω, 12 Ω, 6 Ω', 'Battery charger (constant current 0.7 A, max 14.4 V)', 'Voltmeter and ammeter']}
      procedure={[
        'Connect the load. Note V and I every hour until the voltage falls to 10.5 V, then disconnect.',
        'Ah delivered = current × hours.',
        'Connect the charger, red clip to +. Note V and I every 1–2 hours until the current tapers off.',
        'Plot V against time for both.',
      ]}
      precautions={['Never discharge below the cut-off voltage (10.5 V for 12 V).', 'Red clip to +, black to −, before switching on the charger.', 'Charge in a ventilated place: hydrogen gas is given off.']}
      viva={[
        {q: 'What is the cut-off voltage of a 12 V lead-acid battery?', a: 'About 10.5 V (1.75 V per cell).'},
        {q: 'Why is C/10 used for charging?', a: 'A charging current of capacity ÷ 10 (0.7 A for 7 Ah) charges fully without overheating or excessive gassing.'},
        {q: 'Why does the charging current fall near the end?', a: 'The battery voltage rises towards the charger’s maximum, so less current flows.'},
        {q: 'What damage does deep discharge cause?', a: 'Hard sulphation of the plates, which permanently reduces capacity.'},
      ]}
      steps={[
        {
          label: 'Choose a load resistor and connect the Load.',
          hint: 'Press Load under Connect. Change the load only when disconnected.',
          done: sim.mode === 'discharge' || dis.length > 0,
        },
        {
          label: `Advance the clock and press Note reading. Discharge readings: ${Math.min(dis.length, 6)}/6`,
          hint: 'Use +1 h, then Note reading. Repeat.',
          done: dis.length >= 6,
        },
        {
          label: 'Note a reading at the 10.5 V cut-off.',
          hint: 'The cut-off warning appears below 10.5 V.',
          done: reachedCutoff,
        },
        {
          label: 'Disconnect the load at the cut-off.',
          hint: 'Going lower is deep discharge and damages the battery.',
          done: reachedCutoff && !sim.deep && sim.mode === 'idle',
        },
        {
          label: 'Calculate the Ah delivered and enter it.',
          hint: 'Ah = current × hours.',
          done: !!ahOk,
        },
        {
          label: 'Put the red clip on + and connect the Charger.',
          hint: 'Reversed clips blow the charger fuse.',
          done: sim.mode === 'charge' || chg.length > 0,
        },
        {
          label: `Charge, noting V and I every 1–2 h until the current tapers off. Charge readings: ${Math.min(chg.length, 6)}/6`,
          hint: 'Stop when the current falls below 0.1 A.',
          done: chg.length >= 6 && fullyCharged,
        },
        {label: 'Enter your details and print or save the record.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_3_31}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div>
            <div className={styles.kit}>
              <svg viewBox="0 0 600 230" role="img" aria-label="Battery with a load resistor and a charger">
                {/* battery */}
                <rect x="220" y="80" width="160" height="100" rx="8" fill="#3b3f44" />
                <rect x="240" y="66" width="20" height="16" rx="3" fill="#d4302a" />
                <rect x="340" y="66" width="20" height="16" rx="3" fill="#1b1b1b" stroke="#888" />
                <text x="300" y="122" textAnchor="middle" className={clsx(styles.kitText, styles.bold)}>
                  12 V 7 Ah
                </text>
                <rect x="250" y="138" width="100" height="14" rx="3" fill="#24313a" />
                <rect x="250" y="138" width={pct} height="14" rx="3" fill={pct > 30 ? '#3fbf7f' : pct > 10 ? '#f0a63a' : '#ff7466'} />
                <text x="300" y="170" textAnchor="middle" className={clsx(styles.kitText, styles.small)}>
                  charge {pct}%
                </text>
                {/* load */}
                <g opacity={sim.mode === 'discharge' ? 1 : 0.35}>
                  <rect x="40" y="96" width="110" height="34" rx="6" fill="#e8d7b0" />
                  <text x="95" y="118" textAnchor="middle" style={{fill: '#333', fontSize: 12, fontWeight: 700}}>
                    {sim.load} Ω load
                  </text>
                  <path d="M150 113 H190 V74 H240 M95 130 V200 H350 V82" className={styles.wire} fill="none" />
                </g>
                {/* charger */}
                <g opacity={sim.mode === 'charge' ? 1 : 0.35}>
                  <rect x="450" y="90" width="120" height="70" rx="8" fill="#31414c" stroke="#4d5f6b" />
                  <text x="510" y="120" textAnchor="middle" className={clsx(styles.kitText, styles.bold)}>
                    Charger
                  </text>
                  <text x="510" y="138" textAnchor="middle" className={clsx(styles.kitText, styles.small)}>
                    0.7 A / 14.4 V
                  </text>
                  <path d={clip === '+' ? 'M450 110 C 400 40, 280 30, 250 66' : 'M450 110 C 420 40, 370 40, 350 66'} stroke="#e0352b" strokeWidth="3" fill="none" />
                  <path d={clip === '+' ? 'M450 140 C 420 40, 380 40, 350 66' : 'M450 140 C 400 30, 280 30, 250 66'} stroke="#111" strokeWidth="3" fill="none" />
                </g>
                <text x="300" y="222" textAnchor="middle" className={clsx(styles.kitText, styles.small)}>
                  {sim.mode === 'idle' ? 'Nothing connected' : sim.mode === 'discharge' ? `Discharging · ${sim.t} h` : `Charging · ${sim.t} h`}
                </text>
              </svg>
            </div>
            <div className={clsx(styles.noPrint)} style={{display: 'grid', gap: '0.5rem', marginTop: '0.7rem'}}>
              <div className={styles.row}>
                <span className={styles.label} style={{margin: 0}}>
                  Connect:
                </span>
                <div className={styles.seg} role="group" aria-label="Connection">
                  <button type="button" aria-pressed={sim.mode === 'idle'} onClick={() => setMode('idle')}>
                    Nothing
                  </button>
                  <button type="button" aria-pressed={sim.mode === 'discharge'} onClick={() => setMode('discharge')}>
                    Load
                  </button>
                  <button type="button" aria-pressed={sim.mode === 'charge'} onClick={() => setMode('charge')}>
                    Charger
                  </button>
                </div>
              </div>
              <div className={styles.row}>
                <span className={styles.label} style={{margin: 0}}>
                  Load:
                </span>
                <div className={styles.seg} role="group" aria-label="Load resistor">
                  {LOADS.map((l) => (
                    <button
                      key={l.ohms}
                      type="button"
                      aria-pressed={sim.load === l.ohms}
                      onClick={() => (sim.mode === 'discharge' ? setNote({kind: 'warn', text: 'Disconnect before changing the load.'}) : setSim((s) => ({...s, load: l.ohms})))}>
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.row}>
                <span className={styles.label} style={{margin: 0}}>
                  Charger red clip on:
                </span>
                <div className={styles.seg} role="group" aria-label="Charger red clip">
                  <button type="button" aria-pressed={clip === '+'} disabled={sim.mode === 'charge'} onClick={() => setClip('+')}>
                    + terminal
                  </button>
                  <button type="button" aria-pressed={clip === '-'} disabled={sim.mode === 'charge'} onClick={() => setClip('-')}>
                    − terminal
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div style={{display: 'grid', gap: '0.6rem', alignContent: 'start'}}>
            <Multimeter name="Voltmeter" fn="v" functions={[]} text={live.v.toFixed(2)} unit="V DC" placement="Across battery" onFunction={() => {}} />
            <Multimeter name="Ammeter" fn="a" functions={[]} text={amps.toFixed(2)} unit="A DC" placement={amps < 0 ? 'Out of battery' : 'Into battery'} onFunction={() => {}} />
            <div className={clsx(styles.row, styles.noPrint)}>
              <span className={styles.label} style={{margin: 0}}>
                Clock:
              </span>
              {[0.5, 1, 2].map((h) => (
                <button key={h} type="button" className={styles.btn} onClick={() => step(h)}>
                  +{h} h
                </button>
              ))}
            </div>
            <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} onClick={record}>
              Note reading
            </button>
          </div>
        </div>
        <NoteBox note={note} />
      </Section>

      <Section title="Observation table">
        {rows.length === 0 ? (
          <Empty>No readings yet.</Empty>
        ) : (
          <div className={styles.twoCol}>
            {(
              [
                ['Discharge', dis],
                ['Charge', chg],
              ] as const
            ).map(([label, list]) => (
              <Table
                key={label}
                caption={label}
                head={['Time (h)', 'V (V)', 'I (A)']}
                rows={list.map((r) => [r.t, <span className={styles.num}>{r.v.toFixed(2)}</span>, <span className={styles.num}>{r.i.toFixed(2)}</span>])}
              />
            ))}
          </div>
        )}
      </Section>

      <Section title="Graph and result">
        {rows.length < 2 ? (
          <Empty>The graph appears after two readings.</Empty>
        ) : (
          <XYGraph
            xLabel="Time (hours)"
            yLabel="Battery voltage (V)"
            xUnit="h"
            yUnit="V"
            yRange={[8, 15]}
            series={[
              {id: 'd', label: 'Discharge', color: 'var(--s2)', marker: 'square' as const, points: dis.map((r) => ({x: r.t, y: r.v}))},
              {id: 'c', label: 'Charge', color: 'var(--s1)', marker: 'circle' as const, points: chg.map((r) => ({x: r.t, y: r.v}))},
            ].filter((s) => s.points.length > 0)}
          />
        )}
        <div className={styles.row} style={{marginTop: '0.6rem'}}>
          <label className={styles.field} style={{maxWidth: 260}}>
            Ah delivered to cut-off (I × t)
            <input className={styles.input} inputMode="decimal" value={ahAns} onChange={(e) => setAhAns(e.target.value)} />
          </label>
          <Verdict
            ok={ahOk}
            fix={{
              hint: L2('Ah = discharge current (A) × time (h) until cut-off. Use the ammeter value and the time shown in the table.', 'Ah = ડિસ્ચાર્જ કરંટ (A) × કટ-ઓફ સુધીનો સમય (h). એમીટરની કિંમત અને ટેબલનો સમય વાપરો.'),
              work: L2(`Ah delivered = ${fmt(sim.ahOut)} Ah (current × time, added up over the discharge). Allowed ±12 %.`, `મળેલા Ah = ${fmt(sim.ahOut)} Ah (ડિસ્ચાર્જ દરમિયાન કરંટ × સમયનો સરવાળો). ±12 % ચાલે.`),
              answer: `${fmt(sim.ahOut)} Ah`,
              entered: ahN,
              expected: sim.ahOut,
            }}
          />
          {ahOk && <span className={styles.muted}>Rated {CAPACITY_AH} Ah</span>}
        </div>
        <ResetKit
          onReset={() => {
            setSim(START);
            setRows([]);
            setAhAns('');
            setPrinted(false);
          }}
        />
      </Section>
    </PracticalSheet>
  );
}
