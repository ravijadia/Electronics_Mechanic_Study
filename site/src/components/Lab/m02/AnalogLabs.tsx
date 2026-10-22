import React, {useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import {GU_1_2_22, GU_1_2_23, GU_1_2_24, GU_1_2_25} from './gu';
import AnalogMeter, {type DialSpec} from '../AnalogMeter';
import useStoredState from '../useStoredState';
import {Empty, NoteBox, ResetKit, Section, Table, Verdict, shuffle, useKitSeed, useRng, type Note} from '../kit';
import styles from '../styles.module.css';

const lc = (s: DialSpec) => s.fsd / s.divisions;
const num = (x: string) => {
  const n = Number(String(x).replace(/[^\d.+-]/g, ''));
  return x.trim() === '' || Number.isNaN(n) ? null : n;
};
/** A reading is right if it is within half a smallest division. */
const near = (ans: number | null, truth: number, spec: DialSpec, tol = 0.5) =>
  ans != null && Math.abs(ans - truth) <= lc(spec) * tol + 1e-9;

function Input({
  value,
  onChange,
  label,
  suffix,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  suffix?: string;
}): React.JSX.Element {
  return (
    <span style={{whiteSpace: 'nowrap'}}>
      <input className={styles.input} inputMode="decimal" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />
      {suffix && <span className={styles.muted}> {suffix}</span>}
    </span>
  );
}

// ---------------------------------------------------------------------------
// 1.2.22 Identify the type of meters by dial and scale marking / symbols
// ---------------------------------------------------------------------------

const MOVEMENT = {MC: 'Moving coil (PMMC)', MI: 'Moving iron'};
const CURRENT = {DC: 'DC only', AC: 'AC only', ACDC: 'AC and DC'};
const POSITION = {V: 'Vertical', H: 'Horizontal'};

interface SymAnswer {
  movement?: string;
  current?: string;
  position?: string;
  accuracy?: string;
  kv?: string;
}

export function DialSymbolsLab(): React.JSX.Element {
  const KEY = '1.2.22';
  const [seed, newKit] = useKitSeed(KEY);
  const meters = useRng(seed, (rnd) => {
    const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
    const base: Omit<DialSpec, 'position' | 'accuracy' | 'testKV'>[] = [
      {fsd: 30, unit: 'V', divisions: 30, perMajor: 5, movement: 'MC', current: 'DC'},
      {fsd: 300, unit: 'V', divisions: 30, perMajor: 5, movement: 'MI', current: 'ACDC'},
      {fsd: 5, unit: 'A', divisions: 50, perMajor: 10, movement: 'MI', current: 'AC'},
      {fsd: 500, unit: 'mA', divisions: 50, perMajor: 10, movement: 'MC', current: 'DC'},
    ];
    return shuffle(base, rnd).map((b) => ({
      ...b,
      position: pick<'V' | 'H'>(['V', 'H']),
      accuracy: pick(['1.0', '1.5', '2.5']),
      testKV: pick([2, 3]),
    })) as DialSpec[];
  });
  const [ans, setAns] = useStoredState<Record<number, SymAnswer>>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const set = (k: number, p: Partial<SymAnswer>) => setAns((a) => ({...a, [k]: {...a[k], ...p}}));

  const checks = meters.map((m, k) => {
    const a = ans[k] ?? {};
    return {
      movement: a.movement ? a.movement === m.movement : null,
      current: a.current ? a.current === m.current : null,
      position: a.position ? a.position === m.position : null,
      accuracy: a.accuracy ? num(a.accuracy) === Number(m.accuracy) : null,
      kv: a.kv ? num(a.kv) === m.testKV : null,
    };
  });
  const allOk = checks.every((c) => Object.values(c).every((v) => v === true));
  const answered = checks.filter((c) => Object.values(c).every((v) => v != null)).length;

  const sel = (k: number, field: keyof SymAnswer, opts: Record<string, string>) => (
    <select className={styles.select} aria-label={`Meter ${k + 1} ${field}`} value={ans[k]?.[field] ?? ''} onChange={(e) => set(k, {[field]: e.target.value})}>
      <option value="">Choose…</option>
      {Object.entries(opts).map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );

  return (
    <PracticalSheet
      number={KEY}
      title="Identify the Type of Meter by Dial Markings and Symbols"
      aim="To identify the type of an analog meter, the supply it is meant for, its position of use, accuracy class and test voltage from the symbols printed on its dial."
      apparatus={['Four analog panel meters (shown below)']}
      procedure={[
        'Look at the row of symbols at the bottom-left of each dial.',
        'Identify the operating principle (moving coil or moving iron) from the first symbol.',
        'Identify DC, AC or AC/DC from the second symbol, and the position of use from the third.',
        'Read the accuracy class (the number) and the test voltage (the number inside the star, in kV).',
        'Fill in the table and check your answers.',
      ]}
      precautions={['Handle meters gently; do not drop them.', 'Use a meter only in the position shown on its dial.']}
      viva={[
        {q: 'Why can a moving coil (PMMC) meter not measure AC directly?', a: 'Its deflecting torque reverses with the current. On AC the needle just vibrates around zero, because the average torque is zero.'},
        {q: 'Why does a moving iron meter work on both AC and DC?', a: 'Both iron pieces are magnetised in the same sense whatever the direction of the current, so the torque is always in one direction.'},
        {q: 'What does accuracy class 1.5 mean?', a: 'The error can be up to ±1.5 % of full-scale deflection.'},
        {q: 'What does a star with “2” inside mean?', a: 'The insulation has been tested at 2 kV.'},
        {q: 'Why does a PMMC meter have a uniform scale but a MI meter a cramped one?', a: 'PMMC deflection is proportional to current. MI deflection is roughly proportional to current squared, so the scale is crowded at the start.'},
      ]}
      steps={[
        {label: 'Answer the questions for each of the four meters.', hint: 'Read the dial symbols and scale first.', done: answered === meters.length},
        {label: 'Check your answers and correct any mistakes.', hint: 'All four meters must be right.', done: allOk},
        {label: 'Enter your details and print or save the record.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_2_22}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Meters">
        <div className={styles.meterGrid}>
          {meters.map((m, k) => (
            <figure key={k} style={{margin: 0, textAlign: 'center'}}>
              <AnalogMeter spec={m} value={0} title={`Meter ${k + 1}`} />
              <figcaption className={styles.muted}>Meter {k + 1}</figcaption>
            </figure>
          ))}
        </div>
      </Section>
      <Section title="Observation table">
        <Table
          head={['Meter', 'Operating principle', 'Supply', 'Position of use', 'Accuracy class', 'Test voltage (kV)', 'Check']}
          rows={meters.map((m, k) => [
            k + 1,
            sel(k, 'movement', MOVEMENT),
            sel(k, 'current', CURRENT),
            sel(k, 'position', POSITION),
            <Input label={`Meter ${k + 1} accuracy class`} value={ans[k]?.accuracy ?? ''} onChange={(v) => set(k, {accuracy: v})} />,
            <Input label={`Meter ${k + 1} test voltage`} value={ans[k]?.kv ?? ''} onChange={(v) => set(k, {kv: v})} />,
            Object.values(checks[k]).some((v) => v == null) ? '–' : <Verdict ok={Object.values(checks[k]).every(Boolean)} />,
          ])}
        />
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

// ---------------------------------------------------------------------------
// 1.2.23 Demonstrate various analog measuring instruments
// ---------------------------------------------------------------------------

const MC_V: DialSpec = {fsd: 30, unit: 'V', divisions: 60, perMajor: 10, movement: 'MC', current: 'DC', position: 'V', accuracy: '1.5', testKV: 2};
const MI_V: DialSpec = {fsd: 300, unit: 'V', divisions: 60, perMajor: 10, movement: 'MI', current: 'ACDC', position: 'V', accuracy: '2.5', testKV: 2};

interface DemoRow {
  inst: 'MC' | 'MI';
  src: string;
  reversed: boolean;
  shows: number;
  entered: number | null;
  remark: string;
}

export function AnalogDemoLab(): React.JSX.Element {
  const KEY = '1.2.23';
  const [seed, newKit] = useKitSeed(KEY);
  const sources = useRng(seed, (rnd) => [
    {id: 'dc24', name: 'DC supply 24 V', ac: false, v: Number((23.2 + rnd() * 1.4).toFixed(1))},
    {id: 'bat9', name: '9 V battery', ac: false, v: Number((8.2 + rnd() * 1.2).toFixed(1))},
    {id: 'ac12', name: 'Transformer 12 V AC', ac: true, v: Number((12.2 + rnd() * 1.2).toFixed(1))},
    {id: 'ac230', name: 'Mains 230 V AC', ac: true, v: Math.round(222 + rnd() * 16)},
  ]);
  const [inst, setInst] = useState<'MC' | 'MI'>('MC');
  const [srcId, setSrcId] = useState<string>('dc24');
  const [reversed, setReversed] = useState(false);
  const [entry, setEntry] = useState('');
  const [note, setNote] = useState<Note>(null);
  const [rows, setRows] = useStoredState<DemoRow[]>(`lab:${KEY}:rows`, []);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);

  const spec = inst === 'MC' ? MC_V : MI_V;
  const src = sources.find((s) => s.id === srcId)!;
  let value = 0;
  let vibrate = false;
  let remark = 'Reads correctly';
  if (inst === 'MC') {
    if (src.ac) {
      vibrate = true;
      remark = 'No reading: the needle only vibrates at zero (a MC meter cannot measure AC)';
    } else if (reversed) {
      value = -src.v;
      remark = 'Needle kicks back below zero: polarity reversed';
    } else value = src.v;
  } else {
    value = src.v;
    if (src.v < spec.fsd / 10) remark = 'Reads, but the deflection is too small to read accurately';
  }
  const shows = Math.max(0, Math.min(spec.fsd, value));

  const record = () => {
    const e = num(entry);
    if (e == null) return setNote({kind: 'warn', text: 'Type your reading (0 if no deflection).'});
    setRows((r) => [...r, {inst, src: src.id, reversed: !src.ac && reversed, shows, entered: e, remark}]);
    setEntry('');
    setNote(
      near(e, shows, spec)
        ? {kind: 'good', text: `Correct: ${shows} ${spec.unit}`}
        : {kind: 'warn', text: `Check again. 1 division = ${lc(spec)} ${spec.unit}`},
    );
  };

  const has = (f: (r: DemoRow, s: (typeof sources)[number]) => boolean) =>
    rows.some((r) => f(r, sources.find((s) => s.id === r.src)!));

  return (
    <PracticalSheet
      number={KEY}
      title="Demonstrate Various Analog Measuring Instruments"
      aim="To connect moving coil and moving iron voltmeters to AC and DC sources, observe how each behaves, and read the scale correctly."
      apparatus={['Moving coil voltmeter 0–30 V DC', 'Moving iron voltmeter 0–300 V AC/DC', 'DC supply, 9 V battery, 12 V AC transformer, 230 V mains']}
      procedure={[
        'Select an instrument and a source, and connect them.',
        'Look straight at the needle so that it hides its own reflection in the mirror strip (no parallax), and read the scale.',
        'Type your reading and press “Note reading”. Type 0 if there is no deflection.',
        'Try the moving coil meter on AC, and with the polarity reversed on DC. Write down what happens.',
        'Try the moving iron meter on both AC and DC.',
      ]}
      precautions={[
        'Connect a moving coil meter with the correct polarity: + to +.',
        'Choose an instrument whose range is above the expected voltage.',
        'Read with your eye directly over the needle, using the mirror strip.',
      ]}
      viva={[
        {q: 'What is parallax error, and how does the mirror strip remove it?', a: 'It is the error from viewing the needle at an angle. When the needle hides its own reflection, your eye is exactly above it.'},
        {q: 'What happens when a PMMC meter is connected with reversed polarity?', a: 'The needle deflects backwards against the zero stop, and it can bend.'},
        {q: 'Why did the 9 V reading on the 0–300 V meter look so small?', a: 'It is only 3 % of full scale. Always use a range where the reading falls in the upper part of the scale.'},
        {q: 'Which meter would you use on a 230 V AC panel: MC or MI?', a: 'Moving iron (or a rectifier-type meter), because a plain MC meter cannot read AC.'},
      ]}
      steps={[
        {label: 'Read the MC voltmeter on a DC source.', hint: 'Red probe to the + terminal. Enter the value you read.', done: has((r, s) => r.inst === 'MC' && !s.ac && !r.reversed && near(r.entered, r.shows, MC_V))},
        {label: 'Connect the MC voltmeter to AC and note what happens.', hint: 'Watch the needle.', done: has((r, s) => r.inst === 'MC' && s.ac)},
        {label: 'Reverse the polarity on the MC voltmeter and note what happens.', hint: 'Watch the needle.', done: has((r) => r.inst === 'MC' && r.reversed)},
        {label: 'Read the MI voltmeter on both AC and DC.', hint: 'MI works on both. Two readings.', done: has((r, s) => r.inst === 'MI' && s.ac && near(r.entered, r.shows, MI_V)) && has((r, s) => r.inst === 'MI' && !s.ac && near(r.entered, r.shows, MI_V))},
        {label: 'Enter your details and print or save the record.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_2_23}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <AnalogMeter spec={spec} value={value} vibrate={vibrate} title={`${inst === 'MC' ? 'Moving coil' : 'Moving iron'} voltmeter`} />
          <div className={clsx(styles.card, styles.noPrint)}>
            <span className={styles.label} style={{marginTop: 0}}>
              Instrument
            </span>
            <div className={styles.seg} role="group" aria-label="Instrument">
              <button type="button" aria-pressed={inst === 'MC'} onClick={() => setInst('MC')}>
                MC voltmeter 0–30 V
              </button>
              <button type="button" aria-pressed={inst === 'MI'} onClick={() => setInst('MI')}>
                MI voltmeter 0–300 V
              </button>
            </div>
            <span className={styles.label}>Connected to</span>
            <div className={styles.seg} role="group" aria-label="Source">
              {sources.map((s) => (
                <button key={s.id} type="button" aria-pressed={srcId === s.id} onClick={() => setSrcId(s.id)}>
                  {s.name}
                </button>
              ))}
            </div>
            {!src.ac && (
              <>
                <span className={styles.label}>Polarity</span>
                <div className={styles.seg} role="group" aria-label="Polarity">
                  <button type="button" aria-pressed={!reversed} onClick={() => setReversed(false)}>
                    + to +
                  </button>
                  <button type="button" aria-pressed={reversed} onClick={() => setReversed(true)}>
                    Reversed
                  </button>
                </div>
              </>
            )}
            <span className={styles.label}>Your reading ({spec.unit})</span>
            <div className={styles.row}>
              <Input label="Your reading" value={entry} onChange={setEntry} />
              <button type="button" className={clsx(styles.btn, styles.primary)} onClick={record}>
                Note reading
              </button>
            </div>
          </div>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {rows.length === 0 ? (
          <Empty>No readings yet.</Empty>
        ) : (
          <Table
            head={['S. No.', 'Instrument', 'Source', 'Your reading', 'Check', 'Observation']}
            rows={rows.map((r, k) => {
              const s = sources.find((x) => x.id === r.src)!;
              const sp = r.inst === 'MC' ? MC_V : MI_V;
              return [
                k + 1,
                r.inst === 'MC' ? 'MC voltmeter 0–30 V' : 'MI voltmeter 0–300 V',
                `${s.name}${r.reversed ? ' (reversed)' : ''}`,
                <span className={styles.num}>
                  {r.entered} {sp.unit}
                </span>,
                <Verdict ok={near(r.entered, r.shows, sp)} />,
                r.remark,
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

// ---------------------------------------------------------------------------
// 1.2.24 Find the minimum and maximum measurable range of the meter
// ---------------------------------------------------------------------------

const RANGE_DIALS: Omit<DialSpec, 'movement' | 'current' | 'position' | 'accuracy' | 'testKV'>[] = [
  {fsd: 10, unit: 'V', divisions: 50, perMajor: 10},
  {fsd: 300, unit: 'V', divisions: 30, perMajor: 5},
  {fsd: 5, unit: 'A', divisions: 50, perMajor: 10},
  {fsd: 500, unit: 'mA', divisions: 50, perMajor: 10},
  {fsd: 15, unit: 'V', divisions: 30, perMajor: 6},
  {fsd: 1, unit: 'A', divisions: 50, perMajor: 10},
];

interface RangeAns {
  max?: string;
  min?: string;
  read?: string;
}

export function MeterRangeLab(): React.JSX.Element {
  const KEY = '1.2.24';
  const [seed, newKit] = useKitSeed(KEY);
  const dials = useRng(seed, (rnd) =>
    shuffle(RANGE_DIALS, rnd)
      .slice(0, 4)
      .map((d) => {
        const spec: DialSpec = {...d, movement: 'MC', current: 'DC', position: 'V', accuracy: '1.5', testKV: 2};
        const div = 4 + Math.floor(rnd() * (d.divisions - 6));
        return {spec, value: Number((div * lc(spec)).toFixed(4))};
      }),
  );
  const [ans, setAns] = useStoredState<Record<number, RangeAns>>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const set = (k: number, p: Partial<RangeAns>) => setAns((a) => ({...a, [k]: {...a[k], ...p}}));

  const res = dials.map((d, k) => {
    const a = ans[k] ?? {};
    const eq = (x: string | undefined, t: number) => (x ? num(x) != null && Math.abs(num(x)! - t) < 1e-6 : null);
    return {
      max: eq(a.max, d.spec.fsd),
      min: eq(a.min, lc(d.spec)),
      read: a.read ? near(num(a.read), d.value, d.spec) : null,
    };
  });
  const all = (f: 'max' | 'min' | 'read') => res.every((r) => r[f] === true);

  return (
    <PracticalSheet
      number={KEY}
      title="Find the Minimum and Maximum Measurable Range of a Meter"
      aim="To find the maximum value (full-scale deflection), the minimum measurable value (least count) and the reading shown by analog meters."
      apparatus={['Four analog meters with different scales (shown below)']}
      procedure={[
        'Note the last number on the scale. This is the maximum measurable value (full scale).',
        'Count the smallest divisions between two numbered marks. Least count = difference between the numbered marks ÷ number of divisions.',
        'The least count is the smallest value the meter can show, so it is the minimum measurable value.',
        'Read where the needle points: count whole divisions from the nearest numbered mark.',
      ]}
      precautions={['Read with your eye straight above the needle.', 'Do not estimate finer than half a division.']}
      viva={[
        {q: 'What is the least count of a meter?', a: 'The value of one smallest division on its scale.'},
        {q: 'A 0–300 V meter has 30 divisions. What is its least count?', a: '300 ÷ 30 = 10 V.'},
        {q: 'Why should readings be taken in the upper half of the scale?', a: 'The error (a fixed % of full scale) is then a smaller % of the reading.'},
      ]}
      steps={[
        {label: 'Find the maximum value of each meter.', hint: 'Full-scale reading on the dial.', done: all('max')},
        {label: 'Find the least count of each meter.', hint: 'Value of the smallest scale division.', done: all('min')},
        {label: 'Read the needle of each meter.', hint: 'Look straight at the needle, not from the side.', done: all('read')},
        {label: 'Enter your details and print or save the record.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_2_24}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Meters">
        <div className={styles.meterGrid}>
          {dials.map((d, k) => (
            <figure key={k} style={{margin: 0, textAlign: 'center'}}>
              <AnalogMeter spec={d.spec} value={d.value} title={`Meter ${k + 1}`} />
              <figcaption className={styles.muted}>Meter {k + 1}</figcaption>
            </figure>
          ))}
        </div>
      </Section>
      <Section title="Observation table">
        <Table
          head={['Meter', 'Maximum (full scale)', 'Minimum measurable (least count)', 'Needle reading', 'Check']}
          rows={dials.map((d, k) => [
            k + 1,
            <Input label={`Meter ${k + 1} maximum`} value={ans[k]?.max ?? ''} onChange={(v) => set(k, {max: v})} suffix={d.spec.unit} />,
            <Input label={`Meter ${k + 1} least count`} value={ans[k]?.min ?? ''} onChange={(v) => set(k, {min: v})} suffix={d.spec.unit} />,
            <Input label={`Meter ${k + 1} reading`} value={ans[k]?.read ?? ''} onChange={(v) => set(k, {read: v})} suffix={d.spec.unit} />,
            Object.values(res[k]).some((v) => v == null) ? '–' : (
              <Verdict ok={Object.values(res[k]).every(Boolean)} no={`✗ ${['max', 'min', 'read'].filter((f) => !res[k][f as 'max']).join(', ')}`} />
            ),
          ])}
        />
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

// ---------------------------------------------------------------------------
// 1.2.25 Carry out mechanical zero setting of a meter
// ---------------------------------------------------------------------------

export function ZeroSettingLab(): React.JSX.Element {
  const KEY = '1.2.25';
  const [seed, newKit] = useKitSeed(KEY);
  const kit = useRng(seed, (rnd) => {
    const sign = rnd() < 0.5 ? -1 : 1;
    const steps = 2 + Math.floor(rnd() * 4); // 2–5 smallest divisions
    return {offset: sign * steps, v: Number((14 + rnd() * 10).toFixed(1))};
  });
  const spec = MC_V;
  const [offset, setOffset] = useStoredState<number | null>(`lab:${KEY}:offset`, null);
  const [connected, setConnected] = useState(false);
  const [vals, setVals] = useStoredState<{zero?: string; before?: string; after?: string}>(`lab:${KEY}:vals`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);
  const off = offset ?? kit.offset;
  const zeroed = Math.abs(off) < 0.13;
  const initialZero = kit.offset * lc(spec);

  const turn = (d: number) => {
    if (connected) return setNote({kind: 'warn', text: 'Disconnect the meter first.'});
    setNote(null);
    setOffset(Math.round((off + d) * 4) / 4);
  };

  const zeroOk = vals.zero ? near(num(vals.zero), initialZero, spec) : null;
  const beforeTruth = Math.max(0, Math.min(spec.fsd, kit.v + initialZero));
  const beforeOk = vals.before ? near(num(vals.before), beforeTruth, spec) : null;
  const afterOk = vals.after ? zeroed && near(num(vals.after), kit.v, spec) : null;
  const corrected = num(vals.before ?? '') != null && num(vals.zero ?? '') != null ? num(vals.before!)! - num(vals.zero!)! : null;

  return (
    <PracticalSheet
      number={KEY}
      title="Carry Out Mechanical Zero Setting of a Meter"
      aim="To find the zero error of an analog meter, correct a reading for it, and set the needle to zero with the zero-adjust screw."
      apparatus={['Moving coil voltmeter 0–30 V', 'DC supply', 'Small screwdriver']}
      procedure={[
        'With the meter disconnected and lying in its correct position, see where the needle rests.',
        'If it is not on zero, note the zero error: + if the needle is right of zero, − if left.',
        'Connect the supply and note the reading. Corrected reading = observed reading − zero error.',
        'Disconnect. Turn the zero-adjust screw gently until the needle is exactly on zero.',
        'Connect again and note the reading. It should match the corrected reading.',
      ]}
      precautions={['Set the zero only with the meter disconnected.', 'Turn the screw gently, a little at a time.', 'Keep the meter in its marked position (vertical/horizontal) while setting zero.']}
      viva={[
        {q: 'What is zero error?', a: 'A reading shown by the meter when the true value is zero.'},
        {q: 'The needle rests at +1 V. A reading shows 18 V. What is the true value?', a: '18 − (+1) = 17 V.'},
        {q: 'Why must zero be set with no supply connected?', a: 'Any current through the meter deflects the needle, so you could not tell the true zero.'},
      ]}
      steps={[
        {label: 'With the meter disconnected, note the zero error.', hint: '+ if the needle is right of zero, − if left.', done: !!zeroOk},
        {label: 'Connect the supply and note the reading before adjustment.', hint: 'Corrected reading = observed − zero error.', done: !!beforeOk},
        {label: 'Disconnect and turn the zero-adjust screw until the needle is on zero.', hint: 'Gently, a little at a time.', done: zeroed},
        {label: 'Connect again and note the reading after adjustment.', hint: 'It should match the corrected reading.', done: !!afterOk},
        {label: 'Enter your details and print or save the record.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_2_25}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <AnalogMeter spec={spec} value={connected ? kit.v : 0} zeroOffsetDiv={off} title="Moving coil voltmeter 0 to 30 V" />
          <div className={clsx(styles.card, styles.noPrint)}>
            <span className={styles.label} style={{marginTop: 0}}>
              Supply ({`DC, about ${Math.round(kit.v)} V`})
            </span>
            <div className={styles.seg} role="group" aria-label="Connection">
              <button type="button" aria-pressed={!connected} onClick={() => setConnected(false)}>
                Disconnected
              </button>
              <button type="button" aria-pressed={connected} onClick={() => setConnected(true)}>
                Connected
              </button>
            </div>
            <span className={styles.label}>Zero-adjust screw</span>
            <div className={styles.row}>
              <button type="button" className={styles.btn} onClick={() => turn(-0.25)}>
                ⟲ Anticlockwise
              </button>
              <button type="button" className={styles.btn} onClick={() => turn(0.25)}>
                Clockwise ⟳
              </button>
            </div>
            <p className={styles.muted} style={{marginBottom: 0, marginTop: '0.5rem'}}>
              {zeroed ? 'On zero ✓' : '¼ division per click'}
            </p>
          </div>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        <Table
          head={['Zero error (V)', 'Reading before adjustment (V)', 'Corrected reading (V)', 'Reading after zero setting (V)']}
          rows={[
            [
              <>
                <Input label="Zero error" value={vals.zero ?? ''} onChange={(v) => setVals((x) => ({...x, zero: v}))} /> <Verdict ok={zeroOk} />
              </>,
              <>
                <Input label="Reading before adjustment" value={vals.before ?? ''} onChange={(v) => setVals((x) => ({...x, before: v}))} /> <Verdict ok={beforeOk} />
              </>,
              corrected != null ? <span className={styles.num}>{corrected.toFixed(1)}</span> : '–',
              <>
                <Input label="Reading after adjustment" value={vals.after ?? ''} onChange={(v) => setVals((x) => ({...x, after: v}))} /> <Verdict ok={afterOk} />
              </>,
            ],
          ]}
        />
        {afterOk && corrected != null && (
          <p>
            <b>Result:</b> the corrected reading ({corrected.toFixed(1)} V) and the reading after zero
            setting ({vals.after} V) agree {Math.abs(corrected - num(vals.after!)!) <= lc(spec) ? 'within one division' : 'only roughly'}. Zero error must
            be removed, or corrected for, before any measurement.
          </p>
        )}
        <ResetKit
          onReset={() => {
            setVals({});
            setOffset(null);
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}
