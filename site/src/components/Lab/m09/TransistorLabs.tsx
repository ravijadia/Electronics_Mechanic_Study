import React, {useEffect, useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import {GU_1_9_81, GU_1_9_82, GU_1_9_83} from './gu';
import Multimeter from '../Multimeter';
import useStoredState from '../useStoredState';
import {ProbeBar, ProbePoint, useProbes} from '../Probes';
import {Empty, NoteBox, ResetKit, Section, Table, Verdict, shuffle, useKitSeed, useRng, type Note} from '../kit';
import {L2, fmt} from '../solution';
import {PartGrid} from '../m07/IdentifyLabs';
import type {PartKind} from '../m07/art';
import {kitLabel, near} from '../m07/parts';
import {PanelMeter} from '../m08/ZenerRegLabs';
import {VBE, VCE_SAT} from './bjt';
import styles from '../styles.module.css';

const num = (s?: string) => (s && s.trim() !== '' && !Number.isNaN(Number(s)) ? Number(s) : null);
const sel = (label: string, value: string | undefined, options: [string, string][], onChange: (v: string) => void) => (
  <select className={styles.select} aria-label={label} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
    <option value="">Choose…</option>
    {options.map(([v, t]) => (
      <option key={v} value={v}>
        {t}
      </option>
    ))}
  </select>
);

// ---------------------------------------------------------------------------
// 1.9.81 Identify transistors: package, pins, power, switching, heat sink
// ---------------------------------------------------------------------------

interface Tr {
  mark: string;
  kind: PartKind;
  pol: 'npn' | 'pnp';
  use: 'small' | 'switch' | 'power' | 'darl';
  coll: '1' | '2' | '3' | 'case';
  hs: 'yes' | 'no';
}
const TRS: Tr[] = [
  {mark: 'BC547', kind: 'to92', pol: 'npn', use: 'small', coll: '1', hs: 'no'},
  {mark: 'BC557', kind: 'to92', pol: 'pnp', use: 'small', coll: '1', hs: 'no'},
  {mark: '2N2222A', kind: 'to92', pol: 'npn', use: 'switch', coll: '3', hs: 'no'},
  {mark: 'SL100', kind: 'to39', pol: 'npn', use: 'switch', coll: '3', hs: 'no'},
  {mark: 'BD139 NPN', kind: 'to220', pol: 'npn', use: 'power', coll: '2', hs: 'yes'},
  {mark: 'TIP31C NPN', kind: 'to220', pol: 'npn', use: 'power', coll: '2', hs: 'yes'},
  {mark: 'TIP127 PNP', kind: 'to220', pol: 'pnp', use: 'darl', coll: '2', hs: 'yes'},
  {mark: '2N3055', kind: 'to3', pol: 'npn', use: 'power', coll: 'case', hs: 'yes'},
];
const TR_DATA = [
  ['BC547 / BC557', 'NPN / PNP, small signal, 100 mA', 'TO-92', 'C B E (flat face towards you)'],
  ['2N2222A', 'NPN switching, 600 mA', 'TO-92', 'E B C'],
  ['SL100', 'NPN switching / driver, 500 mA', 'TO-39 metal can', 'E B C (tab is near E)'],
  ['BD139', 'NPN medium power, 1.5 A', 'TO-126', 'E C B'],
  ['TIP31C', 'NPN power, 3 A', 'TO-220', 'B C E (tab = C)'],
  ['TIP127', 'PNP Darlington power, 5 A', 'TO-220', 'B C E (tab = C)'],
  ['2N3055', 'NPN power, 15 A', 'TO-3', 'B and E pins, case = C'],
];
const USE: [string, string][] = [
  ['small', 'Small-signal (amplifier)'],
  ['switch', 'Switching / driver'],
  ['power', 'Power'],
  ['darl', 'Darlington power'],
];

export function TransistorTypesLab(): React.JSX.Element {
  const KEY = '1.9.81';
  const [seed, newKit] = useKitSeed(KEY);
  const items = useRng(seed, (rnd) => shuffle(TRS, rnd));
  const [ans, setAns] = useStoredState<Record<number, Partial<Record<'pol' | 'use' | 'coll' | 'hs', string>>>>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const set = (k: number, p: object) => setAns((a) => ({...a, [k]: {...a[k], ...p}}));
  const ok = (k: number) => (['pol', 'use', 'coll', 'hs'] as const).every((f) => ans[k]?.[f] === items[k][f]);

  return (
    <PracticalSheet
      number={KEY}
      title="Identify Transistors by Package, Pins, Power Rating and Use"
      aim="To identify transistors by their package and type number, and find their type (NPN / PNP), use, collector pin and need for a heat sink from a data book."
      apparatus={['Eight transistors (below)', 'Transistor data book extract']}
      procedure={['Read the type number.', 'Look it up: NPN or PNP, use, pin-out.', 'Pins are numbered 1, 2, 3 from the left with the printed face towards you.', 'Power transistors (TO-220, TO-126, TO-3) need a heat sink at high current.']}
      precautions={['Pin-outs differ between types: always check the data book.', 'Insulate the tab of a TO-220 from the heat sink with mica when the tab must not be grounded.']}
      viva={[
        {q: 'Which lead of a TO-3 transistor is the collector?', a: 'The metal case.'},
        {q: 'What is a Darlington transistor?', a: 'Two transistors in one package, giving a very high current gain (β1 × β2).'},
        {q: 'Why does a power transistor need a heat sink?', a: 'Power lost in it (Vce × Ic) heats the junction. The heat sink carries the heat away so the junction stays below its limit.'},
        {q: 'How do you tell NPN from PNP by the number?', a: 'From the data book (e.g. BC547 NPN, BC557 PNP). Many complementary pairs differ by one digit.'},
      ]}
      steps={[
        {label: 'Identify all eight transistors.', hint: 'Read the mark. Use the data book extract.', done: items.every((_, k) => ok(k))},
        {label: 'Enter your details and print or save the record.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_9_81}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Component tray">
        <PartGrid parts={items.map((it) => ({kind: it.kind, o: {mark: it.mark}}))} label="Eight transistors" />
        <details style={{marginTop: '0.6rem'}}>
          <summary className={styles.muted} style={{cursor: 'pointer'}}>
            Data book extract
          </summary>
          <Table head={['Type', 'Description', 'Package', 'Pins 1-2-3']} rows={TR_DATA} />
        </details>
      </Section>
      <Section title="Observation table">
        <Table
          head={['No.', 'Marking', 'NPN / PNP', 'Use', 'Collector', 'Heat sink?', 'Check']}
          rows={items.map((it, k) => [
            k + 1,
            <span className={styles.num}>{it.mark.split(' ')[0]}</span>,
            sel(
              `Transistor ${k + 1} type`,
              ans[k]?.pol,
              [
                ['npn', 'NPN'],
                ['pnp', 'PNP'],
              ],
              (v) => set(k, {pol: v}),
            ),
            sel(`Transistor ${k + 1} use`, ans[k]?.use, USE, (v) => set(k, {use: v})),
            sel(
              `Transistor ${k + 1} collector`,
              ans[k]?.coll,
              [
                ['1', 'Pin 1'],
                ['2', 'Pin 2'],
                ['3', 'Pin 3'],
                ['case', 'Case'],
              ],
              (v) => set(k, {coll: v}),
            ),
            sel(
              `Transistor ${k + 1} heat sink`,
              ans[k]?.hs,
              [
                ['yes', 'Yes'],
                ['no', 'No'],
              ],
              (v) => set(k, {hs: v}),
            ),
            Object.keys(ans[k] ?? {}).length === 4 ? (
              <Verdict
                ok={ok(k)}
                fix={{
                  hint: L2(
                    'Look the type number up in the data book: it gives NPN/PNP, use, the pin order (pins 1-2-3) and the package. Power packages (TO-220, TO-3) usually need a heat sink; the metal tab or case is the collector.',
                    'ડેટા બુકમાં ટાઇપ નંબર શોધો: તેમાં NPN/PNP, ઉપયોગ, પિન ક્રમ (પિન 1-2-3) અને પેકેજ હોય છે. પાવર પેકેજ (TO-220, TO-3) ને સામાન્ય રીતે હીટ સિંક જોઈએ; મેટલ ટેબ કે કેસ કલેક્ટર હોય છે.',
                  ),
                  answer: `${items[k].pol.toUpperCase()}, ${USE.find(([v]) => v === items[k].use)?.[1] ?? items[k].use}, collector ${items[k].coll === 'case' ? 'case' : `pin ${items[k].coll}`}, heat sink ${items[k].hs}`,
                }}
              />
            ) : (
              '–'
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
// 1.9.82 Test transistors with an ohmmeter / diode test
// ---------------------------------------------------------------------------

type TCond = 'good' | 'beOpen' | 'ceShort';
interface TT {
  pol: 'npn' | 'pnp';
  cond: TCond;
  /** Leads 1–3 → 'B' | 'C' | 'E'. */
  pins: ('B' | 'C' | 'E')[];
}

/** Diode-test or ohms reading between two pins (red on `a`). */
function trReading(t: TT, a: number, b: number, fn: string): string {
  if (fn === 'off') return '';
  const pa = t.pins[a];
  const pb = t.pins[b];
  const key = `${pa}${pb}`;
  // Forward-biased junction: red on P side.
  const fwd = t.pol === 'npn' ? key === 'BE' || key === 'BC' : key === 'EB' || key === 'CB';
  const isBE = key.includes('B') && key.includes('E');
  let v: number | null = null; // junction volts, or 0 for a short
  if (t.cond === 'ceShort' && key.includes('C') && key.includes('E')) v = 0;
  else if (fwd && !(t.cond === 'beOpen' && isBE)) v = isBE ? 0.662 : 0.641;
  if (v == null) return 'OL';
  if (fn === 'diode') return v.toFixed(3);
  // Ω 2k: 3 V behind 1 kΩ.
  const r = v === 0 ? 0.4 : (v / ((3 - v) / 1000)) * 1.02;
  return (r / 1000).toFixed(3);
}

export function TransistorTestLab(): React.JSX.Element {
  const KEY = '1.9.82';
  const [seed, newKit] = useKitSeed(KEY);
  const kit = useRng(seed, (rnd) =>
    shuffle<Omit<TT, 'pins'>>(
      [
        {pol: 'npn', cond: 'good'},
        {pol: 'pnp', cond: 'good'},
        {pol: 'npn', cond: 'beOpen'},
        {pol: rnd() < 0.5 ? 'npn' : 'pnp', cond: 'ceShort'},
      ],
      rnd,
    ).map((t) => ({...t, pins: shuffle(['B', 'C', 'E'] as ('B' | 'C' | 'E')[], rnd)})),
  );
  const [ans, setAns] = useStoredState<Record<number, {base?: string; pol?: string; emit?: string; cond?: string}>>(`lab:${KEY}:ans`, {});
  const [log, setLog] = useStoredState<{k: number; a: number; b: number; fn: string; text: string}[]>(`lab:${KEY}:log`, []);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [fn, setFn] = useState('off');
  const [note, setNote] = useState<Note>(null);
  const probes = useProbes();
  const set = (k: number, p: object) => setAns((x) => ({...x, [k]: {...x[k], ...p}}));

  const [ri, rt] = (probes.red ?? ':').split(':');
  const [bi, bt] = (probes.black ?? ':').split(':');
  const on = ri && ri === bi && rt !== bt ? Number(ri) : null;
  const text = on != null ? trReading(kit[on], Number(rt), Number(bt), fn) : fn === 'off' ? '' : 'OL';
  const unit = fn === 'diode' ? 'V' : fn === 'r2k' ? 'kΩ' : '';

  const noteIt = () => {
    if (on == null) return setNote({kind: 'warn', text: 'Probes on two leads of one transistor.'});
    if (fn === 'off') return setNote({kind: 'warn', text: 'Select diode test or Ω.'});
    setLog((l) => [...l.filter((x) => !(x.k === on && x.a === Number(rt) && x.b === Number(bt) && x.fn === fn)), {k: on, a: Number(rt), b: Number(bt), fn, text}]);
    setNote({kind: 'good', text: `Q${on + 1}: red ${Number(rt) + 1}, black ${Number(bt) + 1} → ${text}${text === 'OL' ? '' : ` ${unit}`}`});
  };

  const pinOf = (t: TT, p: 'B' | 'E') => String(t.pins.indexOf(p) + 1);
  const ok = (k: number) => {
    const t = kit[k];
    const a = ans[k] ?? {};
    if (a.cond !== t.cond) return false;
    // With B–E open only one junction conducts, so base and type cannot be told apart.
    if (t.cond === 'beOpen') return true;
    return a.base === pinOf(t, 'B') && a.pol === t.pol && (t.cond !== 'good' || a.emit === pinOf(t, 'E'));
  };
  const tested = (k: number) => new Set(log.filter((x) => x.k === k).map((x) => `${x.a}${x.b}`)).size >= 6;

  return (
    <PracticalSheet
      number={KEY}
      title="Test the Condition of a Transistor Using an Ohmmeter"
      aim="To find the base, the type (NPN / PNP) and the emitter of unmarked transistors with a multimeter, and decide whether each is good or faulty."
      apparatus={['Four unmarked TO-92 transistors, leads 1, 2, 3', 'Digital multimeter (diode test and Ω)']}
      procedure={[
        'Test all six probe combinations on each transistor (red/black on each pair).',
        'Base: the lead that conducts to both other leads with the same probe on it.',
        'Red on base conducts → NPN. Black on base conducts → PNP.',
        'The base–emitter junction reads slightly higher (in V) than base–collector.',
        'Collector–emitter must read OL both ways. 0 means shorted; a junction that reads OL both ways is open.',
      ]}
      precautions={['Test transistors out of circuit.', 'Do not touch the leads with your fingers while measuring.']}
      viva={[
        {q: 'A transistor behaves like what during an ohmmeter test?', a: 'Two diodes back to back, sharing the base.'},
        {q: 'How do you tell emitter from collector?', a: 'The B–E junction shows a slightly higher forward voltage than the B–C junction.'},
        {q: 'What does a low reading between C and E both ways mean?', a: 'A collector–emitter short: the transistor is faulty.'},
      ]}
      steps={[
        {label: 'Test all six lead combinations on each of the four.', hint: 'Ohmmeter, one pair of leads at a time.', done: kit.every((_, k) => tested(k))},
        {label: 'Give the base, type and condition of each transistor.', hint: 'Also the emitter of the good ones.', done: kit.every((_, k) => ok(k))},
        {label: 'Enter your details and print or save the record.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_9_82}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div>
            <div className={styles.kit}>
              <svg viewBox="0 0 560 170" role="img" aria-label="Four unmarked transistors, leads 1 to 3">
                {kit.map((_, k) => {
                  const ox = k * 140;
                  return (
                    <g key={k}>
                      <text x={ox + 20} y={22} style={kitLabel}>
                        Q{k + 1}
                      </text>
                      <path d={`M${ox + 45} 100 V46 a25 18 0 0 1 50 0 V100 Z`} fill="#1d1d1d" />
                      {[0, 1, 2].map((p) => (
                        <g key={p}>
                          <line x1={ox + 55 + p * 15} y1={100} x2={ox + 40 + p * 30} y2={138} stroke="#a9b1b6" strokeWidth={2} />
                          <text x={ox + 40 + p * 30} y={162} textAnchor="middle" style={{...kitLabel, fontSize: 10}}>
                            {p + 1}
                          </text>
                          <ProbePoint id={`${k}:${p}`} x={ox + 40 + p * 30} y={140} probes={probes} label={`Q${k + 1} lead ${p + 1}`} r={4} />
                        </g>
                      ))}
                    </g>
                  );
                })}
              </svg>
            </div>
            <ProbeBar probes={probes} />
          </div>
          <div style={{display: 'grid', gap: '0.6rem', alignContent: 'start'}}>
            <Multimeter
              name="Digital multimeter"
              fn={fn}
              functions={[
                {fn: 'off', label: 'OFF'},
                {fn: 'diode', label: '→| Diode'},
                {fn: 'r2k', label: 'Ω 2k'},
              ]}
              text={text}
              unit={text === 'OL' ? '' : unit}
              placement={on != null ? `Q${on + 1}` : undefined}
              onFunction={(f) => (setNote(null), setFn(f))}
            />
            <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} onClick={noteIt}>
              Note reading
            </button>
          </div>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {log.length === 0 ? (
          <Empty>No readings yet.</Empty>
        ) : (
          <Table
            head={['Transistor', 'Red', 'Black', 'Function', 'Reading']}
            rows={[...log].sort((x, y) => x.k - y.k || x.a - y.a || x.b - y.b).map((x) => [`Q${x.k + 1}`, x.a + 1, x.b + 1, x.fn === 'diode' ? 'Diode' : 'Ω 2k', x.text])}
          />
        )}
      </Section>
      <Section title="Result">
        <Table
          head={['Transistor', 'Base lead', 'NPN / PNP', 'Emitter lead', 'Condition', 'Check']}
          rows={kit.map((_, k) => {
            const leads: [string, string][] = [
              ['1', '1'],
              ['2', '2'],
              ['3', '3'],
            ];
            return [
              `Q${k + 1}`,
              sel(`Q${k + 1} base`, ans[k]?.base, leads, (v) => set(k, {base: v})),
              sel(
                `Q${k + 1} type`,
                ans[k]?.pol,
                [
                  ['npn', 'NPN'],
                  ['pnp', 'PNP'],
                ],
                (v) => set(k, {pol: v}),
              ),
              sel(`Q${k + 1} emitter`, ans[k]?.emit, leads, (v) => set(k, {emit: v})),
              sel(
                `Q${k + 1} condition`,
                ans[k]?.cond,
                [
                  ['good', 'Good'],
                  ['beOpen', 'B–E open'],
                  ['ceShort', 'C–E shorted'],
                ],
                (v) => set(k, {cond: v}),
              ),
              ans[k]?.cond ? (
                <Verdict
                  ok={ok(k)}
                  fix={{
                    hint: L2(
                      'A good NPN: red on base, black on collector or emitter reads about 0.6 V; the reverse reads OL; C–E reads OL both ways. The base is the pin that conducts to both others with the same probe colour. Red on the base = NPN, black on the base = PNP.',
                      'સારો NPN: લાલ બેઝ પર, કાળો કલેક્ટર કે ઇમિટર પર લગભગ 0.6 V; ઊલટું OL; C–E બંને દિશામાં OL. બંને પિન સાથે એક જ પ્રોબ કલરથી કન્ડક્શન કરતી પિન બેઝ છે. લાલ બેઝ પર = NPN, કાળો બેઝ પર = PNP.',
                    ),
                    answer: `${kit[k].cond === 'good' ? 'Good' : kit[k].cond === 'beOpen' ? 'B–E open' : 'C–E shorted'}, ${kit[k].pol.toUpperCase()}, base pin ${pinOf(kit[k], 'B')}, emitter pin ${pinOf(kit[k], 'E')}`,
                  }}
                />
              ) : (
                '–'
              ),
            ];
          })}
        />
        <p className={styles.muted}>Not checked: the emitter of a faulty transistor, or base and type when B–E is open.</p>
        <ResetKit
          onReset={() => {
            setAns({});
            setLog([]);
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// 1.9.83 Transistor switch driving a relay
// ---------------------------------------------------------------------------

const RBS = [1000, 4700, 10000, 47000, 100000];
const VCC = 12;
const R_COIL = 400;
const PICK_UP = 0.0225;
const DROP_OUT = 0.008;

type Flyback = 'none' | 'ok' | 'rev';
interface SwRow {
  rb: number;
  input: boolean;
  vbe: number;
  vce: number;
  ic: number;
  relay: boolean;
}

export function RelayDriverLab(): React.JSX.Element {
  const KEY = '1.9.83';
  const [seed, newKit] = useKitSeed(KEY);
  const beta = useRng(seed, (rnd) => Math.round(150 + rnd() * 100));
  const [rb, setRb] = useState(47000);
  const [fly, setFly] = useState<Flyback>('none');
  const [power, setPower] = useState(false);
  const [input, setInput] = useState(false);
  const [relay, setRelay] = useState(false);
  const [spikes, setSpikes] = useState(0);
  const [dead, setDead] = useState(false);
  const [goodSwitches, setGoodSwitches] = useStoredState(`lab:${KEY}:goodsw`, 0);
  const [rows, setRows] = useStoredState<SwRow[]>(`lab:${KEY}:rows`, []);
  const [rbCalc, setRbCalc] = useStoredState(`lab:${KEY}:rb`, '');
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);

  // DC state.
  const vin = power && input ? 5 : 0;
  const ib = vin > VBE ? (vin - VBE) / rb : 0;
  let ic = dead ? 0 : Math.min(beta * ib, (VCC - VCE_SAT) / R_COIL);
  let vce = power ? VCC - ic * R_COIL : 0;
  if (!power) ic = 0;
  const sat = vce <= VCE_SAT + 0.01;
  if (sat) vce = VCE_SAT - 0.05 + Math.min(0.08, 0.02 / Math.max(ib * 1000, 0.02));
  const vbe = ib > 0 ? VBE + 0.03 * Math.log10(ib * 1e5 + 1) : vin;
  const relayNow = relay ? ic > DROP_OUT : ic >= PICK_UP;
  useEffect(() => {
    if (relayNow !== relay) setRelay(relayNow);
  }, [relayNow, relay]);

  const change = (f: () => void) => {
    if (power) return setNote({kind: 'warn', text: 'Switch off before changing parts.'});
    setNote(null);
    f();
  };
  const flip = () => {
    if (!power) return setNote({kind: 'warn', text: 'Supply is off.'});
    if (dead) return setNote({kind: 'warn', text: 'The transistor is damaged. Replace it.'});
    const on = !input;
    setInput(on);
    if (on && fly === 'rev') {
      setDead(true);
      setPower(false);
      return setNote({kind: 'bad', text: <b>Bang! The diode was reversed: it shorted the supply through the transistor. Transistor burnt.</b>});
    }
    if (!on && relay) {
      if (fly === 'none') {
        const n = spikes + 1;
        setSpikes(n);
        if (n >= 3) {
          setDead(true);
          return setNote({kind: 'bad', text: <b>The coil’s back-EMF spike has destroyed the transistor. Fit a flyback diode across the coil.</b>});
        }
        return setNote({kind: 'warn', text: `Spark! About 100 V spike at the collector when the relay turned off (${n}/3).`});
      }
      setGoodSwitches((g) => g + 1);
      return setNote({kind: 'good', text: 'Relay off. The diode absorbed the spike ✓'});
    }
    setNote(null);
  };
  const noteIt = () => {
    if (!power) return setNote({kind: 'warn', text: 'Supply is off.'});
    const r: SwRow = {rb, input, vbe: Number(vbe.toFixed(2)), vce: Number(vce.toFixed(2)), ic: Number((ic * 1000).toFixed(1)), relay: relayNow};
    setRows((x) => [...x.filter((y) => !(y.rb === rb && y.input === input)), r]);
    setNote({kind: 'good', text: `Noted: Vce ${r.vce} V, Ic ${r.ic} mA, relay ${r.relay ? 'ON' : 'OFF'}.`});
  };
  const rbMax = (5 - VBE) / (((VCC - VCE_SAT) / R_COIL) / 100);

  return (
    <PracticalSheet
      number={KEY}
      title="Transistor Switching Circuit to Control a Relay"
      aim="To use an NPN transistor as a switch to operate a 12 V relay, choose the base resistor for saturation and protect the transistor with a flyback diode."
      apparatus={['12 V DC supply, 5 V input switch', 'Transistor SL100 / BC547', 'Base resistors 1 k – 100 kΩ', 'Relay 12 V, 400 Ω, lamp on its NO contact', 'Diode 1N4007', 'Panel meters: Vbe, Vce, Ic']}
      procedure={[
        'Calculate the base resistor: Ic = 12 V ÷ 400 Ω, Ib = Ic ÷ β(min = 100), Rb = (5 − 0.7) ÷ Ib.',
        'Fit the relay coil between +12 V and the collector, with the diode across the coil (cathode to +12 V).',
        'Switch on. Input OFF: note Vce and Ic. Input ON: note Vbe, Vce, Ic and the relay.',
        'Try a too-large Rb and note what happens.',
        'Switch the input on and off a few times.',
      ]}
      precautions={['Always fit a flyback diode across a relay coil, cathode to +.', 'Use a base resistor that saturates the transistor fully (Vce ≈ 0.2 V).', 'Switch off before changing parts.']}
      viva={[
        {q: 'Why must the transistor saturate?', a: 'In saturation Vce is about 0.2 V, so it wastes little power. Half-on, it heats up and the relay may not pull in.'},
        {q: 'What does the flyback diode do?', a: 'When the transistor switches off, the coil produces a high reverse voltage. The diode lets the coil current circulate and clamps the spike.'},
        {q: 'What happens if the diode is fitted the wrong way?', a: 'It is forward biased across the supply when the transistor turns on, and the transistor or diode burns.'},
        {q: 'Vce when the transistor is OFF?', a: 'Equal to the supply voltage (12 V), as no current flows through the coil.'},
      ]}
      steps={[
        {label: 'Calculate Rb (max) for saturation.', hint: 'Use the coil current and β from the procedure.', done: near(num(rbCalc), rbMax, 0.03)},
        {label: 'Note input OFF, then input ON (saturated, relay ON).', done: rows.some((r) => !r.input && r.vce > 11) && rows.some((r) => r.input && r.relay && r.vce < 0.3)},
        {label: 'Fit a too-large Rb and note that the relay does not operate.', done: rows.some((r) => r.input && !r.relay)},
        {label: 'Switch off 3 times safely with the flyback diode.', hint: 'Fit the diode the right way round.', done: goodSwitches >= 3},
        {label: 'Enter your details and print or save the record.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_9_83}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div className={styles.kit}>
            <svg viewBox="0 0 520 280" role="img" aria-label={`Relay driver: input switch, Rb ${rb} ohm, NPN transistor, relay coil with ${fly === 'none' ? 'no' : fly === 'ok' ? 'a correct' : 'a reversed'} diode, lamp`}>
              <path className={styles.wire} d="M60 150 H110 M170 150 H210 M250 120 V70 H330 V40 H250 V70 M250 180 V240 H60 M330 70 V110 M330 40 V20" fill="none" />
              <text x={250} y={16} textAnchor="middle" style={kitLabel}>
                +12 V
              </text>
              <rect x={110} y={140} width={60} height={20} rx={4} fill="#e8d7b0" />
              <text x={140} y={132} textAnchor="middle" style={kitLabel}>
                Rb {rb >= 1000 ? `${rb / 1000}k` : rb}
              </text>
              <circle cx={240} cy={150} r={30} fill="none" stroke="var(--lab-wire)" strokeWidth={2} />
              <path d="M210 150 H226 M226 132 V168 M226 140 L250 120 M226 160 L250 180 M250 180 L242 170 M250 180 L238 178" stroke={dead ? '#c8352a' : 'var(--lab-wire)'} strokeWidth={2.5} fill="none" />
              {/* coil */}
              <rect x={232} y={40} width={36} height={30} rx={3} fill={relayNow ? '#c87533' : '#8a5424'} />
              <text x={250} y={60} textAnchor="middle" style={{...kitLabel, fontSize: 9}}>
                COIL
              </text>
              {fly !== 'none' && (
                <g transform={fly === 'rev' ? 'rotate(180 330 55)' : undefined}>
                  <path d="M320 64 H340 L330 46 Z" fill="#e9eef0" />
                  <path d="M320 44 H340" stroke="#e9eef0" strokeWidth={3} />
                </g>
              )}
              <text x={348} y={60} style={{...kitLabel, fontSize: 10}}>
                {fly === 'none' ? 'no diode' : fly === 'ok' ? 'diode' : 'diode reversed'}
              </text>
              {/* contacts and lamp */}
              <path d="M400 70 V100" stroke="var(--lab-wire)" strokeWidth={2.5} />
              <path d={`M400 100 L${relayNow ? 424 : 416} ${relayNow ? 128 : 108}`} stroke="var(--lab-wire)" strokeWidth={2.5} />
              <circle cx={440} cy={170} r={18} fill={relayNow && power ? '#ffd34d' : '#4a5560'} stroke="#9aa3a8" strokeWidth={2} />
              <path className={styles.wire} d="M424 130 V150 M440 188 V240 H400 M400 70 V40 H330" fill="none" />
              <text x={440} y={210} textAnchor="middle" style={{...kitLabel, fontSize: 10}}>
                lamp
              </text>
              <text x={420} y={90} style={{...kitLabel, fontSize: 9, fill: relayNow ? '#4cd964' : '#9fb0ba'}}>
                {relayNow ? 'click' : 'NO'}
              </text>
              {/* input switch */}
              <g
                className={styles.clickable}
                role="button"
                tabIndex={0}
                aria-label={`Input switch ${input ? 'ON (5 V). Turn off' : 'OFF (0 V). Turn on'}`}
                onClick={flip}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    flip();
                  }
                }}>
                <rect x={14} y={120} width={46} height={60} rx={6} fill="#f2f0e8" />
                <rect x={27} y={input ? 128 : 150} width={20} height={22} rx={4} fill="#c9c4b4" stroke="#888" />
                <text x={37} y={196} textAnchor="middle" style={kitLabel}>
                  IN {input ? '5 V' : '0 V'}
                </text>
              </g>
            </svg>
          </div>
          <div style={{display: 'grid', gap: '0.5rem', gridTemplateColumns: '1fr 1fr 1fr', alignContent: 'start'}}>
            <PanelMeter label="Vbe" value={vbe.toFixed(2)} unit="V" off={!power} />
            <PanelMeter label="Vce" value={vce.toFixed(2)} unit="V" off={!power} />
            <PanelMeter label="Ic" value={(ic * 1000).toFixed(1)} unit="mA" off={!power} />
            <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} style={{gridColumn: '1 / -1'}} onClick={noteIt}>
              Note reading
            </button>
          </div>
        </div>
        <div className={clsx(styles.controls, styles.noPrint)}>
          <div className={styles.card}>
            <span className={styles.label} style={{marginTop: 0}}>
              Base resistor
            </span>
            <div className={styles.seg} role="group" aria-label="Base resistor">
              {RBS.map((x) => (
                <button key={x} type="button" aria-pressed={rb === x} onClick={() => change(() => setRb(x))}>
                  {x / 1000}k
                </button>
              ))}
            </div>
            <span className={styles.label}>Diode across the coil</span>
            <div className={styles.seg} role="group" aria-label="Flyback diode">
              {(['none', 'ok', 'rev'] as Flyback[]).map((x) => (
                <button key={x} type="button" aria-pressed={fly === x} onClick={() => change(() => setFly(x))}>
                  {x === 'none' ? 'None' : x === 'ok' ? 'Cathode to +12 V' : 'Anode to +12 V'}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.seg} role="group" aria-label="Supply">
              <button type="button" aria-pressed={power} onClick={() => (setPower((p) => !p), setInput(false), setNote(null))}>
                12 V supply {power ? 'ON' : 'OFF'}
              </button>
              {dead && (
                <button type="button" onClick={() => change(() => (setDead(false), setSpikes(0), setNote({kind: 'info', text: 'New transistor fitted.'})))}>
                  Replace transistor
                </button>
              )}
            </div>
            <p className={styles.muted} style={{margin: '0.4rem 0 0'}}>
              Tap the input switch to drive the base.
            </p>
          </div>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {rows.length === 0 ? (
          <Empty>No readings yet.</Empty>
        ) : (
          <Table head={['Rb', 'Input', 'Vbe (V)', 'Vce (V)', 'Ic (mA)', 'Relay']} rows={rows.map((r) => [`${r.rb / 1000} kΩ`, r.input ? '5 V' : '0 V', r.vbe.toFixed(2), r.vce.toFixed(2), r.ic.toFixed(1), r.relay ? 'ON' : 'OFF'])} />
        )}
      </Section>
      <Section title="Result">
        <Table
          head={['Rb (max) = (5 − 0.7) ÷ (Ic ÷ 100), Ic = 11.8 V ÷ 400 Ω', 'Your value (Ω)', 'Check']}
          rows={[['Base resistor', <input className={styles.input} style={{maxWidth: '6rem'}} inputMode="decimal" aria-label="Maximum base resistor in ohms" value={rbCalc} onChange={(e) => setRbCalc(e.target.value)} />, rbCalc ? (
                <Verdict
                  ok={near(num(rbCalc), rbMax, 0.03)}
                  fix={{
                    hint: L2('For saturation Ib must be at least Ic ÷ β. Ic(sat) = (Vcc − Vce(sat)) ÷ R(coil). Rb(max) = (Vin − Vbe) ÷ Ib.', 'સેચ્યુરેશન માટે Ib ઓછામાં ઓછો Ic ÷ β હોવો જોઈએ. Ic(sat) = (Vcc − Vce(sat)) ÷ R(કોઇલ). Rb(max) = (Vin − Vbe) ÷ Ib.'),
                    work: L2(
                      `Ic = (${VCC} − ${VCE_SAT}) ÷ ${R_COIL} = ${fmt(((VCC - VCE_SAT) / R_COIL) * 1000)} mA; Ib = Ic ÷ 100 = ${fmt(((VCC - VCE_SAT) / R_COIL / 100) * 1000)} mA; Rb = (5 − ${VBE}) ÷ Ib = ${fmt(rbMax)} Ω.`,
                      `Ic = (${VCC} − ${VCE_SAT}) ÷ ${R_COIL} = ${fmt(((VCC - VCE_SAT) / R_COIL) * 1000)} mA; Ib = Ic ÷ 100 = ${fmt(((VCC - VCE_SAT) / R_COIL / 100) * 1000)} mA; Rb = (5 − ${VBE}) ÷ Ib = ${fmt(rbMax)} Ω.`,
                    ),
                    answer: `${fmt(rbMax)} Ω`,
                    entered: num(rbCalc),
                    expected: rbMax,
                  }}
                />
              ) : (
                '–'
              ),
            ],
          ]}
        />
        <ResetKit
          onReset={() => {
            setRows([]);
            setRbCalc('');
            setGoodSwitches(0);
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}
