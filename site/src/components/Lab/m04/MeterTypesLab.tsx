import React from 'react';
import PracticalSheet from '../PracticalSheet';
import useStoredState from '../useStoredState';
import {ResetKit, Section, Table, Verdict, shuffle, useKitSeed, useRng} from '../kit';
import styles from '../styles.module.css';

const KEY = '1.4.36';

const INSTRUMENTS: {name: string; supply: 'DC' | 'AC' | 'Both'}[] = [
  {name: 'PMMC (moving coil) meter', supply: 'DC'},
  {name: 'Moving iron meter', supply: 'Both'},
  {name: 'Dynamometer wattmeter', supply: 'Both'},
  {name: 'Rectifier-type voltmeter', supply: 'AC'},
  {name: 'Induction energy meter (kWh)', supply: 'AC'},
  {name: 'Clamp meter (basic AC type)', supply: 'AC'},
  {name: 'Digital multimeter', supply: 'Both'},
];

const JOBS: {job: string; best: string}[] = [
  {job: 'Panel meter showing 230 V AC on a distribution board', best: 'Moving iron voltmeter'},
  {job: 'Battery charger panel showing the DC charging current', best: 'PMMC ammeter with shunt'},
  {job: 'Current of a running motor, without disconnecting anything', best: 'Clamp meter'},
  {job: 'Power taken by a 1 kW heater', best: 'Dynamometer wattmeter'},
  {job: 'Units of electricity used by a house', best: 'Energy meter (kWh)'},
  {job: 'Frequency of a generator’s output', best: 'Frequency meter'},
  {job: 'Precise 12 V DC reading on a power-supply panel', best: 'PMMC voltmeter'},
  {job: 'Trainee checking V, I and R on many different circuits', best: 'Digital multimeter'},
];

/** 1.4.36 Identify the different types of meter for measuring AC & DC parameters. */
export default function MeterTypesLab(): React.JSX.Element {
  const [seed, newKit] = useKitSeed(KEY);
  const jobs = useRng(seed, (rnd) => shuffle(JOBS, rnd));
  const opts = useRng(seed, (rnd) => shuffle(JOBS.map((j) => j.best), rnd));
  const [sup, setSup] = useStoredState<Record<string, string>>(`lab:${KEY}:sup`, {});
  const [pick, setPick] = useStoredState<Record<string, string>>(`lab:${KEY}:pick`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);

  return (
    <PracticalSheet
      number={KEY}
      title="Identify Types of Meter for Measuring AC and DC Parameters"
      aim="To identify which instruments work on AC, DC or both, and choose the right instrument for a measuring job."
      apparatus={['Instruments listed below']}
      procedure={['Part A: mark each instrument DC, AC or both.', 'Part B: choose the best instrument for each job.']}
      precautions={['Use an instrument only on the supply marked on its dial.', 'Check the range before connecting.']}
      viva={[
        {q: 'Why does a PMMC meter work only on DC?', a: 'Its torque reverses with current direction, so on AC it averages to zero.'},
        {q: 'How does a rectifier-type meter measure AC with a PMMC movement?', a: 'A diode bridge converts AC to DC for the PMMC movement. The scale is calibrated in RMS for sine waves.'},
        {q: 'What does a wattmeter measure that a voltmeter and ammeter cannot?', a: 'True power, including the effect of power factor.'},
      ]}
      tasks={[
        {label: 'Mark the supply type of all seven instruments.', done: INSTRUMENTS.every((i) => sup[i.name] === i.supply)},
        {label: 'Choose the right instrument for all eight jobs.', done: JOBS.every((j) => pick[j.job] === j.best)},
        {label: 'Print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Part A: AC, DC or both?">
        <Table
          head={['Instrument', 'Works on', 'Check']}
          rows={INSTRUMENTS.map((i) => [
            i.name,
            <div className={styles.seg} role="group" aria-label={`${i.name} works on`}>
              {(['DC', 'AC', 'Both'] as const).map((s) => (
                <button key={s} type="button" aria-pressed={sup[i.name] === s} onClick={() => setSup((x) => ({...x, [i.name]: s}))}>
                  {s}
                </button>
              ))}
            </div>,
            sup[i.name] ? <Verdict ok={sup[i.name] === i.supply} /> : '–',
          ])}
        />
      </Section>
      <Section title="Part B: Choose the instrument">
        <Table
          head={['Job', 'Instrument', 'Check']}
          rows={jobs.map((j) => [
            j.job,
            <select className={styles.select} aria-label={j.job} value={pick[j.job] ?? ''} onChange={(e) => setPick((x) => ({...x, [j.job]: e.target.value}))}>
              <option value="">Choose…</option>
              {opts.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>,
            pick[j.job] ? <Verdict ok={pick[j.job] === j.best} /> : '–',
          ])}
        />
        <ResetKit
          onReset={() => {
            setSup({});
            setPick({});
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}
