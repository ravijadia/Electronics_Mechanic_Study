import React, {useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import {GU_1_7_51} from './gu';
import Multimeter from '../Multimeter';
import useStoredState from '../useStoredState';
import {ProbeBar, ProbePoint, useProbes} from '../Probes';
import {NoteBox, ResetKit, Section, Table, Verdict, shuffle, useKitSeed, useRng, type Note} from '../kit';
import {L2, fmt} from '../solution';
import {BAND_HEX} from '../circuit';
import {AxialResistor, E12, E24, bandsFor, fmtOhms, kitLabel, near, parseOhms} from './parts';
import styles from '../styles.module.css';

const KEY = '1.7.51';

/** Ohm ranges: full scale (Ω), display units and decimals. */
export const OHM_FNS = [
  {fn: 'off', label: 'OFF', fs: 0, div: 1, unit: '', dp: 0},
  {fn: 'r200', label: 'Ω 200', fs: 200, div: 1, unit: 'Ω', dp: 1},
  {fn: 'r2k', label: 'Ω 2k', fs: 2e3, div: 1e3, unit: 'kΩ', dp: 3},
  {fn: 'r20k', label: 'Ω 20k', fs: 2e4, div: 1e3, unit: 'kΩ', dp: 2},
  {fn: 'r200k', label: 'Ω 200k', fs: 2e5, div: 1e3, unit: 'kΩ', dp: 1},
  {fn: 'r2M', label: 'Ω 2M', fs: 2e6, div: 1e6, unit: 'MΩ', dp: 3},
];
/** Test-lead resistance the 200 Ω range adds. */
export const LEAD_OHMS = 0.3;

export function ohmText(fn: string, r: number): {text: string; unit: string} {
  const f = OHM_FNS.find((x) => x.fn === fn)!;
  if (fn === 'off') return {text: '', unit: ''};
  const shown = fn === 'r200' ? r + LEAD_OHMS : r;
  if (!isFinite(shown) || shown >= f.fs) return {text: 'OL', unit: f.unit};
  return {text: (shown / f.div).toFixed(f.dp), unit: f.unit};
}
/** The range with the most digits that does not show OL. */
export function bestRange(r: number): string {
  return OHM_FNS.find((f) => f.fs > r + LEAD_OHMS && f.fn !== 'off')?.fn ?? 'r2M';
}

interface Res {
  nominal: number;
  tol: number;
  five: boolean;
  actual: number;
  bands: string[];
}

function makeKit(rnd: () => number): Res[] {
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const specs: {five: boolean; tol: number; decade: number}[] = shuffle(
    [
      {five: false, tol: 5, decade: 0}, // 1–8.2 Ω (gold multiplier)
      {five: false, tol: 5, decade: 2},
      {five: false, tol: 5, decade: 3},
      {five: false, tol: 10, decade: 4},
      {five: true, tol: 1, decade: 3},
      {five: true, tol: 2, decade: 5},
    ],
    rnd,
  );
  const bad = Math.floor(rnd() * 6); // one resistor has drifted out of tolerance
  return specs.map((s, k) => {
    const base = s.five ? pick(E24) : pick(E12);
    const nominal = Number(((base / 10) * 10 ** s.decade).toPrecision(3));
    const err = k === bad ? (rnd() < 0.5 ? -1 : 1) * s.tol * (1.6 + rnd()) : (rnd() * 2 - 1) * s.tol * 0.8;
    const actual = nominal * (1 + err / 100);
    return {nominal, tol: s.tol, five: s.five, actual, bands: bandsFor(nominal, s.tol, s.five)};
  });
}

interface Ans {
  val?: string;
  tol?: string;
  meas?: string;
  range?: string;
  within?: string;
}

const CW = 300;
const CH = 110;

export default function ColourCodeLab(): React.JSX.Element {
  const [seed, newKit] = useKitSeed(KEY);
  const kit = useRng(seed, makeKit);
  const [ans, setAns] = useStoredState<Record<number, Ans>>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [fn, setFn] = useState('off');
  const [fingers, setFingers] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const probes = useProbes();
  const set = (k: number, p: Ans) => setAns((a) => ({...a, [k]: {...a[k], ...p}}));

  const [ri, rt] = (probes.red ?? ':').split(':');
  const [bi, bt] = (probes.black ?? ':').split(':');
  const on = ri && ri === bi && rt !== bt ? Number(ri) : null;
  // Holding both leads puts your body (~100 kΩ) in parallel with the resistor.
  const rSeen = on == null ? Infinity : fingers ? (kit[on].actual * 1e5) / (kit[on].actual + 1e5) : kit[on].actual;
  const {text, unit} = ohmText(fn, rSeen);

  const noteIt = () => {
    if (on == null) return setNote({kind: 'warn', text: 'Probes on both leads of one resistor.'});
    if (fn === 'off') return setNote({kind: 'warn', text: 'Select an Ω range.'});
    if (text === 'OL') return setNote({kind: 'warn', text: 'OL: select a higher range.'});
    set(on, {meas: `${text} ${unit}`, range: fn});
    if (fingers) return setNote({kind: 'bad', text: 'Noted, but your fingers were on both leads. Hold one lead only.'});
    setNote(fn === bestRange(kit[on].actual) ? {kind: 'good', text: `R${on + 1}: ${text} ${unit} ✓`} : {kind: 'warn', text: 'Noted. A lower range gives more digits.'});
  };

  const res = kit.map((r, k) => {
    const a = ans[k] ?? {};
    const measured = a.meas ? parseOhms(a.meas) : null;
    const within = Math.abs(r.actual - r.nominal) <= (r.nominal * r.tol) / 100;
    return {
      val: a.val ? near(parseOhms(a.val), r.nominal, 0.001) : null,
      tol: a.tol ? Number(a.tol) === r.tol : null,
      meas: a.meas ? a.range === bestRange(r.actual) && measured != null && near(measured - (a.range === 'r200' ? LEAD_OHMS : 0), r.actual, 0.03) : null,
      within: a.within ? (a.within === 'yes') === within : null,
    };
  });
  const all = (f: keyof (typeof res)[number]) => res.every((r) => r[f]);

  return (
    <PracticalSheet
      number={KEY}
      title="Resistor Value by Colour Code, Verified with a Multimeter"
      aim="To find the value and tolerance of resistors from their colour bands, measure them with a multimeter and check that each is within tolerance."
      apparatus={['Six resistors (4-band and 5-band)', 'Digital multimeter with Ω ranges', 'Colour code chart']}
      procedure={[
        'Hold the resistor with the tolerance band (gold, silver, or the widely spaced band) on the right.',
        'Read the digit bands, then the multiplier. Write the value and tolerance.',
        'Measure: probes on the two leads, start at a high range and come down to the lowest range that does not show OL.',
        'Allowed range = value ± tolerance. Mark whether the measured value is within it.',
      ]}
      precautions={['Measure resistance only with the resistor out of circuit (or power off).', 'Do not hold both leads with your fingers.', 'On the 200 Ω range, subtract the lead resistance (touch probes together to see it).']}
      viva={[
        {q: 'What does a gold multiplier band mean?', a: 'Multiply by 0.1. For example yellow-violet-gold-gold = 4.7 Ω ±5 %.'},
        {q: 'How is a 5-band resistor read?', a: 'Three digit bands, a multiplier and a tolerance band. It is used for close-tolerance (1 %, 2 %) resistors.'},
        {q: 'Why should you not hold both leads while measuring?', a: 'Your body resistance comes in parallel and the meter reads less, especially for high values.'},
        {q: 'Why use the lowest range that does not show OL?', a: 'It gives the most digits, so the reading is most precise.'},
        {q: 'A 1 kΩ ±5 % resistor reads 1.08 kΩ. Is it good?', a: 'No. The allowed range is 950 Ω to 1050 Ω.'},
      ]}
      steps={[
        {label: 'Read the colour code value of all six.', hint: 'Tolerance band on the right. Digits, then multiplier.', done: all('val')},
        {label: 'Enter the tolerance of all six.', hint: 'Gold 5 %, silver 10 %, brown 1 %, red 2 %.', done: all('tol')},
        {
          label: 'Measure all six on the best range.',
          hint: `Hold one lead only. Lowest range without OL, then Note reading. Measured: ${res.filter((r) => r.meas).length}/${res.length}.`,
          done: all('meas'),
        },
        {label: 'Mark each within or out of tolerance.', hint: 'Allowed range = value ± tolerance.', done: all('within')},
        {label: 'Enter your details and print or save the record.', done: printed},
      ]}
      gu={GU_1_7_51}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div>
            <div className={styles.kit}>
              <svg viewBox={`0 0 ${CW * 2} ${CH * 3}`} role="img" aria-label="Six resistors with probe points on their leads">
                {kit.map((r, k) => {
                  const ox = (k % 2) * CW;
                  const oy = Math.floor(k / 2) * CH;
                  const cx = ox + CW / 2;
                  const cy = oy + 58;
                  return (
                    <g key={k}>
                      <text x={ox + 14} y={oy + 22} style={kitLabel}>
                        R{k + 1}
                      </text>
                      <AxialResistor cx={cx} cy={cy} len={120} dia={30} bands={r.bands} body={r.five ? '#7fb2d9' : '#e8d7b0'} lead={70} />
                      <ProbePoint id={`${k}:a`} x={cx - 128} y={cy} probes={probes} label={`R${k + 1} left lead`} r={5} />
                      <ProbePoint id={`${k}:b`} x={cx + 128} y={cy} probes={probes} label={`R${k + 1} right lead`} r={5} />
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
              functions={OHM_FNS}
              text={text}
              unit={unit}
              placement={on != null ? `R${on + 1}` : undefined}
              onFunction={(f) => {
                setNote(null);
                setFn(f);
              }}
            />
            <div className={clsx(styles.card, styles.noPrint)}>
              <div className={styles.seg} role="group" aria-label="How you hold the resistor">
                <button type="button" aria-pressed={!fingers} onClick={() => setFingers(false)}>
                  Hold one lead
                </button>
                <button type="button" aria-pressed={fingers} onClick={() => setFingers(true)}>
                  Fingers on both leads
                </button>
              </div>
            </div>
            <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} onClick={noteIt}>
              Note reading
            </button>
          </div>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        <Table
          head={['R', 'Colour bands', 'Value (Ω)', 'Tol. ±%', 'Measured', 'Within tol.?', 'Check']}
          rows={kit.map((r, k) => {
            const a = ans[k] ?? {};
            const rr = res[k];
            const filled = Object.values(rr).every((x) => x != null);
            return [
              `R${k + 1}`,
              <span style={{display: 'inline-flex', gap: 3, alignItems: 'center', flexWrap: 'wrap'}} aria-label={r.bands.join(', ')}>
                {r.bands.map((b, j) => (
                  <span key={j} title={b} style={{width: 12, height: 18, borderRadius: 3, background: BAND_HEX[b], border: '1px solid var(--lab-line)'}} />
                ))}
                <small className={styles.muted} style={{marginLeft: 4}}>
                  {r.bands.join('-')}
                </small>
              </span>,
              <input className={styles.input} style={{maxWidth: '6rem'}} aria-label={`R${k + 1} colour code value`} placeholder="e.g. 4.7k" value={a.val ?? ''} onChange={(e) => set(k, {val: e.target.value})} />,
              <select className={styles.select} aria-label={`R${k + 1} tolerance`} value={a.tol ?? ''} onChange={(e) => set(k, {tol: e.target.value})}>
                <option value="">–</option>
                {[1, 2, 5, 10, 20].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>,
              <span className={styles.num}>{a.meas ?? '–'}</span>,
              <select className={styles.select} aria-label={`R${k + 1} within tolerance`} value={a.within ?? ''} onChange={(e) => set(k, {within: e.target.value})}>
                <option value="">–</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>,
              filled ? <Verdict
                  ok={Object.values(rr).every(Boolean)}
                  fix={{
                    hint: L2(
                      `Wrong: ${(['val', 'tol', 'meas', 'within'] as const).filter((q) => !rr[q]).join(', ')}. Read the bands from the end nearest the edge: digits, then multiplier, then tolerance (gold ±5 %, silver ±10 %). Measure on the lowest range that does not show OL, holding only one lead.`,
                      `ખોટું: ${(['val', 'tol', 'meas', 'within'] as const).filter((q) => !rr[q]).join(', ')}. કિનારાની નજીકના છેડેથી બેન્ડ વાંચો: અંકો, પછી મલ્ટિપ્લાયર, પછી ટોલરન્સ (ગોલ્ડ ±5 %, સિલ્વર ±10 %). OL ન આવે તેવી સૌથી નીચી રેન્જમાં માપો અને ફક્ત એક લીડ પકડો.`,
                    ),
                    work: L2(
                      `${r.bands.join('-')} = ${fmtOhms(r.nominal)} ±${r.tol} %. Allowed range ${fmt(r.nominal * (1 - r.tol / 100))} – ${fmt(r.nominal * (1 + r.tol / 100))} Ω. Actual ${fmt(r.actual)} Ω → ${Math.abs(r.actual - r.nominal) <= (r.nominal * r.tol) / 100 ? 'within' : 'outside'} tolerance.`,
                      `${r.bands.join('-')} = ${fmtOhms(r.nominal)} ±${r.tol} %. માન્ય શ્રેણી ${fmt(r.nominal * (1 - r.tol / 100))} – ${fmt(r.nominal * (1 + r.tol / 100))} Ω. વાસ્તવિક ${fmt(r.actual)} Ω → ટોલરન્સ ${Math.abs(r.actual - r.nominal) <= (r.nominal * r.tol) / 100 ? 'અંદર' : 'બહાર'}.`,
                    ),
                    answer: `${fmtOhms(r.nominal)} ±${r.tol} %, ${Math.abs(r.actual - r.nominal) <= (r.nominal * r.tol) / 100 ? 'Yes' : 'No'}`,
                    entered: parseOhms(a.val ?? ''),
                    expected: r.nominal,
                  }}
                /> : '–',
            ];
          })}
        />
        <p className={styles.muted}>Value: type 470, 4.7k, 4k7 or 1M.</p>
      </Section>
      <Section title="Result">
        <p>
          {res.every((r) => r.within != null)
            ? `Out of tolerance: ${kit.map((r, k) => (ans[k]?.within === 'no' ? `R${k + 1} (${fmtOhms(r.nominal)})` : null)).filter(Boolean).join(', ') || 'none'}.`
            : 'Complete the table.'}
        </p>
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
