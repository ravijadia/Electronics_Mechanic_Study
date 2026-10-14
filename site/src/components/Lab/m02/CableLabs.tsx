import React, {useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import Multimeter from '../Multimeter';
import useStoredState from '../useStoredState';
import {ProbeBar, ProbePoint, useProbes} from '../Probes';
import {NoteBox, ResetKit, Section, Table, Verdict, shuffle, useKitSeed, useRng, type Note} from '../kit';
import styles from '../styles.module.css';

// ---------------------------------------------------------------------------
// Cable cross-sections
// ---------------------------------------------------------------------------

type CableId = 'solid' | 'stranded' | 'flex2' | 'flex3' | 'flat' | 'armoured';

const CABLE_NAME: Record<CableId, string> = {
  solid: 'Single-core solid PVC wire',
  stranded: 'Single-core stranded PVC cable',
  flex2: '2-core flexible (twin) cable',
  flex3: '3-core flexible cable',
  flat: 'Flat twin-and-earth (TPS) cable',
  armoured: 'Armoured cable (3½ core)',
};

const CU = '#d08a3c';

function Strands({cx, cy, r, n = 7, s = 2.6}: {cx: number; cy: number; r: number; n?: number; s?: number}) {
  const pts = n === 7 ? [[0, 0], ...[0, 1, 2, 3, 4, 5].map((k) => [Math.cos((k * Math.PI) / 3), Math.sin((k * Math.PI) / 3)])] : Array.from({length: n}, (_, k) => [Math.cos((k * 2 * Math.PI) / n) * 0.6, Math.sin((k * 2 * Math.PI) / n) * 0.6]);
  return (
    <>
      {pts.map(([x, y], k) => (
        <circle key={k} cx={cx + x * (r - s)} cy={cy + y * (r - s)} r={s} fill={CU} stroke="#8c5a22" strokeWidth={0.4} />
      ))}
    </>
  );
}

function Core({cx, cy, colour, stripe}: {cx: number; cy: number; colour: string; stripe?: string}) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={13} fill={colour} />
      {stripe && <path d={`M${cx - 13} ${cy} A 13 13 0 0 1 ${cx + 13} ${cy}`} fill={stripe} />}
      <circle cx={cx} cy={cy} r={8.5} fill="#7a4a1f" />
      <Strands cx={cx} cy={cy} r={8.5} n={7} s={2.2} />
    </g>
  );
}

export function CableSection({id}: {id: CableId}): React.JSX.Element {
  return (
    <svg viewBox="0 0 120 120" width="100%" style={{maxWidth: 140}} role="img" aria-label="Cable cross-section">
      {id === 'solid' && (
        <>
          <circle cx="60" cy="60" r="30" fill="#d4302a" />
          <circle cx="60" cy="60" r="15" fill={CU} />
        </>
      )}
      {id === 'stranded' && (
        <>
          <circle cx="60" cy="60" r="30" fill="#e8c21f" />
          <circle cx="60" cy="60" r="16" fill="#7a4a1f" />
          <Strands cx={60} cy={60} r={16} n={7} s={5} />
        </>
      )}
      {id === 'flex2' && (
        <>
          <circle cx="60" cy="60" r="40" fill="#efefef" stroke="#aaa" />
          <Core cx={44} cy={60} colour="#8a4b20" />
          <Core cx={76} cy={60} colour="#2b5fd1" />
        </>
      )}
      {id === 'flex3' && (
        <>
          <circle cx="60" cy="60" r="42" fill="#efefef" stroke="#aaa" />
          <Core cx={60} cy={42} colour="#2f9a3c" stripe="#f2c81f" />
          <Core cx={44} cy={70} colour="#8a4b20" />
          <Core cx={76} cy={70} colour="#2b5fd1" />
        </>
      )}
      {id === 'flat' && (
        <>
          <rect x="8" y="38" width="104" height="44" rx="20" fill="#e3e3e3" stroke="#aaa" />
          <Core cx={32} cy={60} colour="#d4302a" />
          <circle cx="60" cy="60" r="5" fill={CU} />
          <Core cx={88} cy={60} colour="#1b1b1b" />
        </>
      )}
      {id === 'armoured' && (
        <>
          <circle cx="60" cy="60" r="52" fill="#1b1b1b" />
          {Array.from({length: 26}, (_, k) => (
            <circle key={k} cx={60 + Math.cos((k * 2 * Math.PI) / 26) * 44} cy={60 + Math.sin((k * 2 * Math.PI) / 26) * 44} r={5.2} fill="#a8a8a8" stroke="#666" strokeWidth={0.6} />
          ))}
          <circle cx="60" cy="60" r="38" fill="#4a4a4a" />
          <Core cx={60} cy={42} colour="#d4302a" />
          <Core cx={44} cy={68} colour="#e8c21f" />
          <Core cx={76} cy={68} colour="#2b5fd1" />
          <circle cx="60" cy="74" r="7" fill="#1b1b1b" stroke="#777" />
        </>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 1.2.16 Identify and test different AC mains cables
// ---------------------------------------------------------------------------

const CORES = ['L', 'N', 'E'] as const;
type CoreId = (typeof CORES)[number];
const CORE_NAME: Record<CoreId, string> = {L: 'Brown', N: 'Blue', E: 'Green/yellow'};

const FAULTS = [
  {id: 'openL', label: 'Brown core open'},
  {id: 'openN', label: 'Blue core open'},
  {id: 'openE', label: 'Green/yellow core open'},
  {id: 'shortLN', label: 'Short between brown and blue'},
  {id: 'shortLE', label: 'Short between brown and green/yellow'},
  {id: 'ok', label: 'No fault'},
];

const COLOUR_OPTS = ['Brown', 'Blue', 'Green/yellow', 'Red', 'Black', 'Green', 'Yellow'];
const COLOUR_TRUTH = {newL: 'Brown', newN: 'Blue', newE: 'Green/yellow', oldL: 'Red', oldN: 'Black', oldE: 'Green'};

function connected(fault: string, a: string, b: string): boolean {
  const [ca, ea] = a.split(':');
  const [cb] = b.split(':');
  // union of nets: each core is a net unless it is open; a short merges two cores.
  const net = (c: string, end: string) => {
    if (fault === `open${c}`) return `${c}${end}`;
    if ((fault === 'shortLN' && (c === 'L' || c === 'N')) || (fault === 'shortLE' && (c === 'L' || c === 'E'))) return 'S';
    return c;
  };
  return net(ca, ea) === net(cb, b.split(':')[1]);
}

export function CablesLab(): React.JSX.Element {
  const KEY = '1.2.16';
  const [seed, newKit] = useKitSeed(KEY);
  const kit = useRng(seed, (rnd) => ({
    order: shuffle(Object.keys(CABLE_NAME) as CableId[], rnd),
    fault: FAULTS[Math.floor(rnd() * (FAULTS.length - 1))].id,
  }));
  const [names, setNames] = useStoredState<Record<number, string>>(`lab:${KEY}:names`, {});
  const [colours, setColours] = useStoredState<Record<string, string>>(`lab:${KEY}:colours`, {});
  const [faultAns, setFaultAns] = useStoredState(`lab:${KEY}:fault`, '');
  const [tests, setTests] = useStoredState<string[]>(`lab:${KEY}:tests`, []);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [fn, setFn] = useState('off');
  const [note, setNote] = useState<Note>(null);
  const probes = useProbes();

  const both = probes.red && probes.black && probes.red !== probes.black;
  const isCont = both && connected(kit.fault, probes.red!, probes.black!);
  const text = fn === 'cont' ? (both && isCont ? '0.3' : 'OL') : '';
  const pairKey = both ? [probes.red, probes.black].sort().join('|') : null;

  const noteTest = () => {
    if (fn !== 'cont') return setNote({kind: 'warn', text: 'Set the meter to continuity.'});
    if (!pairKey) return setNote({kind: 'warn', text: 'Place both probes on core ends.'});
    if (!tests.includes(pairKey)) setTests((t) => [...t, pairKey]);
    setNote({kind: 'info', text: `${pairKey.replace('|', ' to ').replace(/([LNE]):([ab])/g, (_, c, e) => `${CORE_NAME[c as CoreId]} (end ${e.toUpperCase()})`)}: ${text === 'OL' ? 'OL, no continuity' : '0.3 Ω, continuity'}.`});
  };

  const endToEnd = CORES.every((c) => tests.includes([`${c}:a`, `${c}:b`].sort().join('|')));
  const between = ['L|N', 'E|L', 'E|N'].every((p) => {
    const [x, y] = p.split('|');
    return tests.some((t) => {
      const [a, b] = t.split('|').map((s) => s.split(':')[0]);
      return (a === x && b === y) || (a === y && b === x);
    });
  });
  const namesRight = kit.order.every((id, k) => names[k] === id);
  const coloursRight = Object.entries(COLOUR_TRUTH).every(([k, v]) => colours[k] === v);

  const colourSel = (k: keyof typeof COLOUR_TRUTH) => (
    <>
      <select className={styles.select} aria-label={k} value={colours[k] ?? ''} onChange={(e) => setColours((c) => ({...c, [k]: e.target.value}))}>
        <option value="">Choose…</option>
        {COLOUR_OPTS.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>{' '}
      {colours[k] && <Verdict ok={colours[k] === COLOUR_TRUTH[k]} yes="✓" no="✗" />}
    </>
  );

  const ends: {id: string; x: number; y: number}[] = CORES.flatMap((c, k) => [
    {id: `${c}:a`, x: 120, y: 60 + k * 55},
    {id: `${c}:b`, x: 520, y: 60 + k * 55},
  ]);

  return (
    <PracticalSheet
      number={KEY}
      title="Identify and Test Different AC Mains Cables"
      aim="To identify common AC mains cables from their construction, learn the core colour codes, and test a cable’s cores for continuity and insulation faults."
      apparatus={['Samples of six cable types', 'A 3-core flexible cable, 1 m', 'Digital multimeter with continuity range']}
      procedure={[
        'Study the cross-section of each cable sample and name it.',
        'Write the core colours used for phase, neutral and earth (new and old codes).',
        'Test the 3-core cable: check each core from end A to end B (should beep).',
        'Then test between different cores at the same end (should read OL).',
        'From your tests, say what fault the cable has, if any.',
      ]}
      precautions={['Test cables only when disconnected from the supply.', 'Check the meter by touching the probes together first.', 'Do not damage the insulation while handling samples.']}
      viva={[
        {q: 'Why are flexible cables made of many fine strands?', a: 'Fine strands bend easily without breaking, so they suit cords for portable appliances.'},
        {q: 'What are the new colour codes for phase, neutral and earth?', a: 'Brown is phase, blue is neutral, green/yellow is earth.'},
        {q: 'What does an armoured cable’s steel wire layer do?', a: 'It protects against mechanical damage (e.g. underground), and it can also serve as an earth path.'},
        {q: 'What fault do you suspect if two different cores show continuity?', a: 'An insulation failure or short between those cores.'},
      ]}
      steps={[
        {label: 'Name each of the six cable samples.', hint: 'Look at the cross-section of each.', done: namesRight},
        {label: 'Give the new and old colour codes.', hint: 'Phase, neutral and earth.', done: coloursRight},
        {label: 'Test every core end to end, then every pair of cores.', hint: 'Cable must be disconnected from the supply.', done: endToEnd && between},
        {label: 'Find the fault in the 3-core cable.', hint: 'Use your continuity results.', done: faultAns === kit.fault},
        {label: 'Enter your details and print or save the record.', hint: 'Practical record, below the result.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Part A: Identify the cables">
        <div className={styles.meterGrid} style={{gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))'}}>
          {kit.order.map((id, k) => (
            <div key={k} className={styles.card} style={{textAlign: 'center'}}>
              <CableSection id={id} />
              <div className={styles.muted}>Sample {k + 1}</div>
              <select className={styles.select} style={{width: '100%'}} aria-label={`Sample ${k + 1} name`} value={names[k] ?? ''} onChange={(e) => setNames((n) => ({...n, [k]: e.target.value}))}>
                <option value="">Name this cable…</option>
                {Object.entries(CABLE_NAME).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              <div style={{minHeight: '1.5em'}}>{names[k] && <Verdict ok={names[k] === id} />}</div>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Part B: Core colour codes">
        <Table
          head={['', 'Phase (L)', 'Neutral (N)', 'Earth (E)']}
          rows={[
            ['New code (IEC, now used)', colourSel('newL'), colourSel('newN'), colourSel('newE')],
            ['Old code (still found in old wiring)', colourSel('oldL'), colourSel('oldN'), colourSel('oldE')],
          ]}
        />
      </Section>
      <Section title="Part C: Test the 3-core flexible cable">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div>
            <div className={styles.kit}>
              <svg viewBox="0 0 640 210" role="img" aria-label="3-core cable with ends A and B for each core">
                <rect x="160" y="30" width="320" height="150" rx="20" fill="#cfcfcf" opacity="0.25" />
                <text x="120" y="22" textAnchor="middle" className={clsx(styles.kitText, styles.small)}>
                  End A
                </text>
                <text x="520" y="22" textAnchor="middle" className={clsx(styles.kitText, styles.small)}>
                  End B
                </text>
                {CORES.map((c, k) => (
                  <g key={c}>
                    <line x1="120" y1={60 + k * 55} x2="520" y2={60 + k * 55} stroke={c === 'L' ? '#8a4b20' : c === 'N' ? '#2b5fd1' : '#2f9a3c'} strokeWidth="9" strokeLinecap="round" />
                    {c === 'E' && <line x1="120" y1={170} x2="520" y2={170} stroke="#f2c81f" strokeWidth="3" strokeDasharray="10 10" />}
                    <text x="320" y={52 + k * 55} textAnchor="middle" className={clsx(styles.kitText, styles.small)}>
                      {CORE_NAME[c]}
                    </text>
                  </g>
                ))}
                {ends.map((e) => (
                  <ProbePoint key={e.id} id={e.id} x={e.x} y={e.y} probes={probes} label={`${CORE_NAME[e.id[0] as CoreId]} core end ${e.id.endsWith('a') ? 'A' : 'B'}`} />
                ))}
              </svg>
            </div>
            <ProbeBar probes={probes} />
          </div>
          <div style={{display: 'grid', gap: '0.7rem', alignContent: 'start'}}>
            <Multimeter name="Digital multimeter" fn={fn} functions={[{fn: 'off', label: 'OFF'}, {fn: 'cont', label: 'Continuity •))'}]} text={text} unit={fn === 'cont' ? 'Ω' : ''} onFunction={setFn} indicator={fn === 'cont' && text !== 'OL' && both ? '•)) BEEP' : null} />
            <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} onClick={noteTest}>
              Note test
            </button>
            <label className={styles.field}>
              Fault in this cable
              <select className={styles.select} value={faultAns} onChange={(e) => setFaultAns(e.target.value)}>
                <option value="">Choose…</option>
                {FAULTS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            {faultAns && <Verdict ok={faultAns === kit.fault} no="✗ check your tests again" />}
          </div>
        </div>
        <NoteBox note={note} />
        <p className={styles.muted}>Tests done: {tests.length}</p>
        <ResetKit
          onReset={() => {
            setNames({});
            setColours({});
            setFaultAns('');
            setTests([]);
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// 1.2.19 Refer table and find current-carrying capacity of wires
// ---------------------------------------------------------------------------

/** Example ratings used for this exercise (copper, PVC, 2 single-core cables in conduit). */
export const CAPACITY: {size: number; amps: number}[] = [
  {size: 1.0, amps: 11},
  {size: 1.5, amps: 14},
  {size: 2.5, amps: 18},
  {size: 4, amps: 24},
  {size: 6, amps: 31},
  {size: 10, amps: 42},
  {size: 16, amps: 57},
];

const JOBS = [
  {job: 'Lighting circuit: 4 tube lights of 40 W', p: 160, pf: 1},
  {job: 'Room heater, 2000 W', p: 2000, pf: 1},
  {job: 'Water heater (geyser), 3000 W', p: 3000, pf: 1},
  {job: 'Water pump motor, 1500 W, power factor 0.8', p: 1500, pf: 0.8},
  {job: 'Kitchen: induction cooktop 2000 W + oven 2000 W', p: 4000, pf: 1},
  {job: 'Workshop machine, 5000 W', p: 5000, pf: 1},
  {job: 'Electric kiln, 6500 W', p: 6500, pf: 1},
  {job: 'Supply to a small house, total load 8 kW', p: 8000, pf: 1},
];

export function CurrentCapacityLab(): React.JSX.Element {
  const KEY = '1.2.19';
  const [seed, newKit] = useKitSeed(KEY);
  const jobs = useRng(seed, (rnd) => shuffle(JOBS, rnd).slice(0, 6));
  const [ans, setAns] = useStoredState<Record<number, {i?: string; size?: string}>>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);

  const rows = jobs.map((j, k) => {
    const I = j.p / (230 * j.pf);
    const need = CAPACITY.find((c) => c.amps >= I)!;
    const a = ans[k] ?? {};
    const iv = a.i ? Number(a.i) : null;
    return {
      j,
      I,
      need,
      iOk: a.i ? iv != null && Math.abs(iv - I) <= Math.max(0.1, I * 0.02) : null,
      sizeOk: a.size ? Number(a.size) === need.size : null,
    };
  });

  return (
    <PracticalSheet
      number={KEY}
      title="Find the Current-Carrying Capacity of Wires from a Table"
      aim="To calculate the current drawn by a load and select a suitable cable size from a current-rating table."
      apparatus={['Current-rating table for copper PVC cables (below)', 'Calculator']}
      procedure={[
        'Calculate the load current: I = P ÷ (V × power factor), with V = 230 V.',
        'In the table, find the smallest cable size whose rating is equal to or more than this current.',
        'Write the current and the selected cable size.',
      ]}
      precautions={['Always round the cable size up, never down.', 'Use the table that matches the installation method (in conduit, clipped, buried).']}
      viva={[
        {q: 'What happens if a cable carries more than its rated current?', a: 'It overheats, the insulation deteriorates, and it can cause a fire.'},
        {q: 'Why does a motor draw more current than P/V?', a: 'Its power factor is less than 1, so I = P ÷ (V × pf).'},
        {q: 'Why does the rating of the same cable change with how it is installed?', a: 'Rating depends on how well heat escapes. Cables bunched in conduit cool less well than cables clipped in open air.'},
      ]}
      steps={[
        {label: 'Calculate the load current for each job.', hint: 'I = P ÷ V.', done: rows.every((r) => r.iOk)},
        {label: 'Select the correct cable size for each job.', hint: 'Use the current rating table.', done: rows.every((r) => r.sizeOk)},
        {label: 'Enter your details and print or save the record.', hint: 'Practical record, below the result.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Current-rating table">
        <Table
          caption="Copper conductor, PVC insulated, two single-core cables in conduit (example values for this exercise)"
          head={['Size (mm²)', ...CAPACITY.map((c) => c.size)]}
          rows={[['Current rating (A)', ...CAPACITY.map((c) => c.amps)]]}
        />
        <p className={styles.muted}>
          Example values. For exams, use your trade theory book’s table.
        </p>
      </Section>
      <Section title="Observation table">
        <Table
          head={['S. No.', 'Load', 'Current I (A)', 'Cable size (mm²)', 'Check']}
          rows={rows.map((r, k) => [
            k + 1,
            r.j.job,
            <input className={styles.input} inputMode="decimal" aria-label={`Job ${k + 1} current`} value={ans[k]?.i ?? ''} onChange={(e) => setAns((a) => ({...a, [k]: {...a[k], i: e.target.value}}))} />,
            <select className={styles.select} aria-label={`Job ${k + 1} cable size`} value={ans[k]?.size ?? ''} onChange={(e) => setAns((a) => ({...a, [k]: {...a[k], size: e.target.value}}))}>
              <option value="">Choose…</option>
              {CAPACITY.map((c) => (
                <option key={c.size} value={c.size}>
                  {c.size}
                </option>
              ))}
            </select>,
            r.iOk == null || r.sizeOk == null ? (
              '–'
            ) : (
              <Verdict ok={!!(r.iOk && r.sizeOk)} no={`✗ ${!r.iOk ? 'current' : ''}${!r.iOk && !r.sizeOk ? ' and ' : ''}${!r.sizeOk ? 'size' : ''}`} />
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
