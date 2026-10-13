import React, {useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import useStoredState from '../useStoredState';
import {NoteBox, ResetKit, Section, Table, Verdict, shuffle, useKitSeed, useRng, type Note} from '../kit';
import {si} from '../signals';
import {PartArt, type PartKind, type PartOpts} from './art';
import {bandsFor, near} from './parts';
import styles from '../styles.module.css';

// ---------------------------------------------------------------------------
// LCR meter
// ---------------------------------------------------------------------------

export type LcrMode = 'L' | 'C' | 'R';

export interface DUT {
  kind: 'L' | 'C';
  /** Henry or farad. */
  value: number;
  /** Series resistance (Ω). */
  esr: number;
}

/** What an LCR meter shows for a part at a test frequency. */
export function lcrRead(d: DUT | null, mode: LcrMode, f: number): {main: string; sub: string} {
  if (!d) return {main: mode === 'C' ? '0.000 pF' : 'OL', sub: ''};
  const w = 2 * Math.PI * f;
  if (mode === 'R') return {main: d.kind === 'L' ? si(d.esr, 'Ω', 4) : 'OL', sub: ''};
  if (d.kind !== mode) {
    // Wrong mode: the meter shows the "opposite" reactance as a negative value.
    const x = d.kind === 'L' ? w * d.value : 1 / (w * d.value);
    const eq = mode === 'C' ? 1 / (w * x) : x / w;
    return {main: `-${si(eq, mode === 'C' ? 'F' : 'H', 4)}`, sub: ''};
  }
  const x = d.kind === 'L' ? w * d.value : 1 / (w * d.value);
  const ratio = d.esr / x;
  return {main: si(d.value, d.kind === 'L' ? 'H' : 'F', 4), sub: d.kind === 'L' ? `Q ${(1 / ratio).toFixed(2)}` : `D ${ratio.toFixed(3)}`};
}

function LcrMeter({mode, f, main, sub, fault, onMode, onFreq, onRepair, placement}: {mode: LcrMode; f: number; main: string; sub: string; fault: boolean; onMode: (m: LcrMode) => void; onFreq: (f: number) => void; onRepair: () => void; placement?: string}) {
  return (
    <div className={styles.dmm} style={{background: '#33495a', borderColor: '#22313c'}}>
      <div className={styles.dmmHead} style={{color: '#e9eef0'}}>
        <span>LCR meter</span>
        {placement && <small>{placement}</small>}
      </div>
      <div className={styles.lcd} role="status" aria-label="LCR meter display" style={{display: 'grid', justifyItems: 'end'}}>
        <b>{fault ? '' : main}</b>
        <span>{fault ? '' : `${sub}${sub ? ' · ' : ''}${f >= 1000 ? `${f / 1000} kHz` : `${f} Hz`}`}</span>
      </div>
      <div className={styles.seg} role="group" aria-label="Mode">
        {(['L', 'C', 'R'] as LcrMode[]).map((m) => (
          <button key={m} type="button" aria-pressed={mode === m} onClick={() => onMode(m)}>
            {m}
          </button>
        ))}
      </div>
      <div className={styles.seg} role="group" aria-label="Test frequency" style={{marginTop: '0.4rem'}}>
        {[100, 1000, 10000].map((x) => (
          <button key={x} type="button" aria-pressed={f === x} onClick={() => onFreq(x)}>
            {x >= 1000 ? `${x / 1000} kHz` : `${x} Hz`}
          </button>
        ))}
      </div>
      {fault && (
        <div className={styles.dmmFoot}>
          <span className={styles.blown}>Meter damaged</span>
          <button type="button" className={styles.btn} onClick={onRepair}>
            New meter
          </button>
        </div>
      )}
    </div>
  );
}

/** Tray of parts; tap one to put it in the test clips. */
function Tray({parts, sel, onPick}: {parts: {kind: PartKind; o?: PartOpts}[]; sel: number | null; onPick: (k: number) => void}) {
  return (
    <div className={styles.kit} style={{padding: '0.5rem'}}>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.5rem'}}>
        {parts.map((p, k) => (
          <button key={k} type="button" className={styles.chip} aria-pressed={sel === k} onClick={() => onPick(k)} style={{background: '#2c3a44', color: '#e9eef0'}}>
            <svg viewBox="0 0 160 110" aria-hidden="true" style={{maxWidth: 140}}>
              <PartArt kind={p.kind} o={p.o} />
            </svg>
            <span>{k + 1}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

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

/** "100n", "0.1u", "4.7µF", "470p", "10mH", "47uH" → base units. */
export function parseSI(s: string): number | null {
  const t = s.trim().replace(/\s/g, '').replace(/[FH]$/i, '');
  const m = /^(\d*\.?\d+)([pnuµm]?)$/i.exec(t);
  if (!m) return null;
  const mult: Record<string, number> = {p: 1e-12, n: 1e-9, u: 1e-6, µ: 1e-6, m: 1e-3, '': 1};
  return Number(m[1]) * mult[m[2].toLowerCase()];
}

// ---------------------------------------------------------------------------
// 1.7.58 Identify inductors and measure with an LCR meter
// ---------------------------------------------------------------------------

interface Ind {
  id: string;
  name: string;
  kind: PartKind;
  /** Marked value (H), or null when unmarked. */
  marked: number | null;
  value: number;
  esr: number;
  o: PartOpts;
}

function makeInductors(rnd: () => number): Ind[] {
  const v = (x: number) => x * (0.92 + rnd() * 0.16);
  const axial = [10, 22, 47, 100, 220, 470][Math.floor(rnd() * 6)];
  const smd = [10, 22, 47, 100][Math.floor(rnd() * 4)];
  const smdCode = smd >= 100 ? `${String(smd).slice(0, 2)}1` : `${smd}0`;
  const choke = [0.5, 1, 2][Math.floor(rnd() * 3)];
  const list: Ind[] = [
    {id: 'axial', name: 'Colour-coded axial inductor', kind: 'axialInductor', marked: axial * 1e-6, value: v(axial * 1e-6), esr: 0.5 + axial / 100, o: {bands: bandsFor(axial, 10, false)}},
    {id: 'smd', name: 'SMD power inductor', kind: 'smdInductor', marked: smd * 1e-6, value: v(smd * 1e-6), esr: 0.05 + smd / 400, o: {mark: smdCode}},
    {id: 'toroid', name: 'Toroidal inductor', kind: 'toroid', marked: null, value: v(330e-6), esr: 0.2, o: {}},
    {id: 'rod', name: 'Ferrite rod (antenna) coil', kind: 'ferriteRod', marked: null, value: v(560e-6), esr: 4, o: {}},
    {id: 'air', name: 'Air-core coil', kind: 'airCore', marked: null, value: v(1.8e-6), esr: 0.02, o: {}},
    {id: 'choke', name: 'Iron-core choke', kind: 'ironChoke', marked: choke, value: v(choke), esr: 40 * choke, o: {mark: `${choke} H`}},
  ];
  return shuffle(list, rnd);
}

export function InductorLab(): React.JSX.Element {
  const KEY = '1.7.58';
  const [seed, newKit] = useKitSeed(KEY);
  const items = useRng(seed, makeInductors);
  const [ans, setAns] = useStoredState<Record<number, {type?: string; marked?: string; meas?: string}>>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [pick, setPick] = useState<number | null>(null);
  const [mode, setMode] = useState<LcrMode>('C');
  const [f, setF] = useState(1000);
  const [note, setNote] = useState<Note>(null);
  const set = (k: number, p: object) => setAns((a) => ({...a, [k]: {...a[k], ...p}}));
  const d = pick != null ? {kind: 'L' as const, value: items[pick].value, esr: items[pick].esr} : null;
  const r = lcrRead(d, mode, f);

  const noteIt = () => {
    if (pick == null) return setNote({kind: 'warn', text: 'Put an inductor in the test clips.'});
    if (mode !== 'L') return setNote({kind: 'warn', text: `Mode ${mode}: select L for an inductor.`});
    set(pick, {meas: `${r.main} (${r.sub})`});
    setNote({kind: 'good', text: `L${pick + 1}: ${r.main}, ${r.sub}`});
  };

  const typeOk = (k: number) => ans[k]?.type === items[k].id;
  const markOk = (k: number) => {
    const it = items[k];
    const a = ans[k]?.marked?.trim();
    if (!a) return null;
    if (it.marked == null) return /^(-|–|none|nil|no)$/i.test(a);
    return near(parseSI(a), it.marked, 0.001);
  };

  return (
    <PracticalSheet
      number={KEY}
      title="Identify Inductors and Measure Their Values with an LCR Meter"
      aim="To identify different types of inductors, read their marked values and measure their inductance with an LCR meter."
      apparatus={['Six inductors (below)', 'LCR meter with test clips', 'Inductor colour code chart']}
      procedure={[
        'Name each inductor from its construction.',
        'Read the marking. Colour code and SMD code are in µH (e.g. 101 = 100 µH). Write “–” if unmarked.',
        'Put the inductor in the clips, select L and 1 kHz, and note L and Q.',
        'Compare with the marked value.',
      ]}
      precautions={['Select the L mode: other modes give a wrong (often negative) reading.', 'Keep the test leads short.', 'Measure iron-core chokes at 100 Hz for a reading closer to mains use.']}
      viva={[
        {q: 'In what unit is the inductor colour code read?', a: 'Microhenry (µH). Brown-black-brown = 10 × 10 = 100 µH.'},
        {q: 'Why does an air-core coil have low inductance?', a: 'Air has low permeability. A ferrite or iron core concentrates the flux and raises L.'},
        {q: 'What is Q of an inductor?', a: 'Quality factor = XL ÷ R. A high Q means low losses.'},
        {q: 'Where is an iron-core choke used?', a: 'At low frequency: power-supply filters, fluorescent lamp ballasts.'},
      ]}
      tasks={[
        {label: 'Identify all six types.', done: items.every((_, k) => typeOk(k))},
        {label: 'Read the marked values.', done: items.every((_, k) => markOk(k) === true)},
        {label: 'Measure L of all six.', done: items.every((_, k) => !!ans[k]?.meas)},
        {label: 'Print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <Tray parts={items.map((i) => ({kind: i.kind, o: i.o}))} sel={pick} onPick={(k) => (setPick(k), setNote(null))} />
          <div style={{display: 'grid', gap: '0.6rem', alignContent: 'start'}}>
            <LcrMeter mode={mode} f={f} main={r.main} sub={r.sub} fault={false} onMode={setMode} onFreq={setF} onRepair={() => undefined} placement={pick != null ? `Part ${pick + 1}` : 'clips empty'} />
            <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} onClick={noteIt}>
              Note reading
            </button>
          </div>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        <Table
          head={['No.', 'Type', 'Marked value', 'Measured', 'Check']}
          rows={items.map((it, k) => [
            k + 1,
            sel(
              `Inductor ${k + 1} type`,
              ans[k]?.type,
              items.map((x) => [x.id, x.name] as [string, string]).sort((a, b) => a[1].localeCompare(b[1])),
              (v) => set(k, {type: v}),
            ),
            <input className={styles.input} style={{maxWidth: '7rem'}} aria-label={`Inductor ${k + 1} marked value`} placeholder="e.g. 47uH, –" value={ans[k]?.marked ?? ''} onChange={(e) => set(k, {marked: e.target.value})} />,
            <span className={styles.num}>{ans[k]?.meas ?? '–'}</span>,
            ans[k]?.type && ans[k]?.marked ? <Verdict ok={typeOk(k) && !!markOk(k)} /> : '–',
          ])}
        />
        <p className={styles.muted}>Marked value: 47uH, 0.1mH, 1H, or “–” if unmarked.</p>
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
// 1.7.59 Identify capacitors and measure with an LCR meter
// ---------------------------------------------------------------------------

interface Cap {
  id: string;
  name: string;
  kind: PartKind;
  mark: string;
  /** Value decoded from the marking (F). */
  marked: number;
  value: number;
  esr: number;
  polar: boolean;
  charged: boolean;
  faulty: boolean;
}

const CAP_TYPES: Omit<Cap, 'value' | 'esr' | 'charged' | 'faulty'>[] = [
  {id: 'ceramic', name: 'Ceramic disc', kind: 'ceramic', mark: '104', marked: 100e-9, polar: false},
  {id: 'film', name: 'Polyester film', kind: 'film', mark: '2A473J', marked: 47e-9, polar: false},
  {id: 'elec', name: 'Aluminium electrolytic', kind: 'electrolytic', mark: '470µF 25V', marked: 470e-6, polar: true},
  {id: 'elec2', name: 'Aluminium electrolytic (small)', kind: 'electrolytic', mark: '10µF 63V', marked: 10e-6, polar: true},
  {id: 'tant', name: 'Tantalum', kind: 'tantalum', mark: '106', marked: 10e-6, polar: true},
  {id: 'mica', name: 'Silver mica', kind: 'mica', mark: '471', marked: 470e-12, polar: false},
  {id: 'ceramic2', name: 'Ceramic disc (small)', kind: 'ceramic', mark: '222', marked: 2.2e-9, polar: false},
];

export function CapacitorLab(): React.JSX.Element {
  const KEY = '1.7.59';
  const [seed, newKit] = useKitSeed(KEY);
  const items = useRng(seed, (rnd) => {
    const pickd = shuffle(CAP_TYPES, rnd).slice(0, 6);
    const polar = pickd.map((c, k) => (c.polar ? k : -1)).filter((k) => k >= 0);
    const charged = polar.length ? polar[Math.floor(rnd() * polar.length)] : -1;
    const faulty = polar.length ? polar[Math.floor(rnd() * polar.length)] : 0;
    return pickd.map(
      (c, k): Cap => ({
        ...c,
        charged: k === charged,
        faulty: k === faulty,
        value: k === faulty ? c.marked * (0.35 + rnd() * 0.15) : c.marked * (c.polar ? 0.9 + rnd() * 0.25 : 0.95 + rnd() * 0.1),
        esr: k === faulty ? 12 : c.polar ? 0.3 / (c.marked * 1e4 + 0.2) : 0.01 / (c.marked * 1e6 + 1e-3),
      }),
    );
  });
  const [ans, setAns] = useStoredState<Record<number, {type?: string; marked?: string; meas?: string; cond?: string}>>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [discharged, setDischarged] = useState<number[]>([]);
  const [pick, setPick] = useState<number | null>(null);
  const [mode, setMode] = useState<LcrMode>('L');
  const [f, setF] = useState(1000);
  const [fault, setFault] = useState(false);
  const [tool, setTool] = useState<'clips' | 'discharge'>('clips');
  const [note, setNote] = useState<Note>(null);
  const set = (k: number, p: object) => setAns((a) => ({...a, [k]: {...a[k], ...p}}));

  const place = (k: number) => {
    setNote(null);
    if (tool === 'discharge') {
      setDischarged((d) => [...new Set([...d, k])]);
      return setNote({kind: 'info', text: `C${k + 1} discharged through 1 kΩ.`});
    }
    if (fault) return setNote({kind: 'warn', text: 'Meter damaged. Get a new one.'});
    if (items[k].charged && !discharged.includes(k)) {
      setFault(true);
      setPick(null);
      return setNote({kind: 'bad', text: <b>Spark! The capacitor was charged and it damaged the LCR meter. Discharge it first.</b>});
    }
    setPick(k);
  };

  const c = pick != null ? items[pick] : null;
  const r = lcrRead(c ? {kind: 'C', value: c.value, esr: c.esr} : null, mode, f);

  const noteIt = () => {
    if (fault) return setNote({kind: 'warn', text: 'Meter damaged.'});
    if (!c) return setNote({kind: 'warn', text: 'Put a capacitor in the test clips.'});
    if (mode !== 'C') return setNote({kind: 'warn', text: `Mode ${mode}: select C for a capacitor.`});
    set(pick!, {meas: `${r.main} (${r.sub})`});
    setNote({kind: 'good', text: `C${pick! + 1}: ${r.main}, ${r.sub}`});
  };

  const typeOk = (k: number) => ans[k]?.type === items[k].kind;
  const markOk = (k: number) => near(parseSI(ans[k]?.marked ?? ''), items[k].marked, 0.001);
  const condOk = (k: number) => ans[k]?.cond === (items[k].faulty ? 'faulty' : 'good');
  const kinds: [string, string][] = [
    ['ceramic', 'Ceramic disc'],
    ['film', 'Polyester film'],
    ['electrolytic', 'Aluminium electrolytic'],
    ['tantalum', 'Tantalum'],
    ['mica', 'Mica'],
  ];

  return (
    <PracticalSheet
      number={KEY}
      title="Identify Capacitors and Measure Their Capacitance with an LCR Meter"
      aim="To identify different types of capacitors, decode their markings and measure capacitance with an LCR meter."
      apparatus={['Six capacitors (below)', 'LCR meter with test clips', '1 kΩ discharge resistor']}
      procedure={[
        'Name each capacitor type.',
        'Decode the marking. 3-digit code is in pF: 104 = 10 × 10⁴ pF = 100 nF.',
        'Discharge every electrolytic / tantalum capacitor before testing.',
        'Clip it on, select C and 1 kHz (100 Hz for large electrolytics), note C and D.',
        'A capacitor far below its value, or with high D, is faulty.',
      ]}
      precautions={['Always discharge a capacitor before connecting a meter.', 'Never short a charged capacitor directly: use a resistor.', 'Electrolytics have tolerance of −20 % to +50 %.']}
      viva={[
        {q: 'Decode 473J.', a: '47 × 10³ pF = 47 nF, J = ±5 %.'},
        {q: 'Which capacitors are polarised?', a: 'Electrolytic and tantalum. The marked lead (− stripe on electrolytic, + on tantalum) must go to the correct polarity.'},
        {q: 'What does a high D (dissipation factor) mean?', a: 'High internal loss: the capacitor is drying out or failing.'},
        {q: 'Why discharge a capacitor before measuring?', a: 'Its stored charge can damage the meter and give a shock.'},
      ]}
      tasks={[
        {label: 'Identify all six types.', done: items.every((_, k) => typeOk(k))},
        {label: 'Decode all six markings.', done: items.every((_, k) => markOk(k))},
        {label: 'Measure all six (discharge first).', done: items.every((_, k) => !!ans[k]?.meas)},
        {label: 'Find the faulty capacitor.', done: items.every((_, k) => condOk(k))},
        {label: 'Print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <Tray parts={items.map((i) => ({kind: i.kind, o: {mark: i.mark, bulged: i.faulty && i.kind === 'electrolytic'}}))} sel={pick} onPick={place} />
          <div style={{display: 'grid', gap: '0.6rem', alignContent: 'start'}}>
            <LcrMeter
              mode={mode}
              f={f}
              main={r.main}
              sub={r.sub}
              fault={fault}
              onMode={setMode}
              onFreq={setF}
              onRepair={() => (setFault(false), setNote({kind: 'info', text: 'New meter issued.'}))}
              placement={pick != null ? `C${pick + 1}` : 'clips empty'}
            />
            <div className={clsx(styles.card, styles.noPrint)}>
              <span className={styles.label} style={{marginTop: 0}}>
                Tap a part to
              </span>
              <div className={styles.seg} role="group" aria-label="Tool">
                <button type="button" aria-pressed={tool === 'clips'} onClick={() => setTool('clips')}>
                  Put in clips
                </button>
                <button type="button" aria-pressed={tool === 'discharge'} onClick={() => (setTool('discharge'), setPick(null))}>
                  Discharge (1 kΩ)
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
          head={['No.', 'Marking', 'Type', 'Marked value', 'Measured', 'Condition', 'Check']}
          rows={items.map((it, k) => [
            k + 1,
            <span className={styles.num}>{it.mark}</span>,
            sel(`Capacitor ${k + 1} type`, ans[k]?.type, kinds, (v) => set(k, {type: v})),
            <input className={styles.input} style={{maxWidth: '6rem'}} aria-label={`Capacitor ${k + 1} marked value`} placeholder="e.g. 100n" value={ans[k]?.marked ?? ''} onChange={(e) => set(k, {marked: e.target.value})} />,
            <span className={styles.num}>{ans[k]?.meas ?? '–'}</span>,
            sel(
              `Capacitor ${k + 1} condition`,
              ans[k]?.cond,
              [
                ['good', 'Good'],
                ['faulty', 'Faulty'],
              ],
              (v) => set(k, {cond: v}),
            ),
            ans[k]?.type && ans[k]?.marked && ans[k]?.cond ? <Verdict ok={typeOk(k) && markOk(k) && condOk(k)} /> : '–',
          ])}
        />
        <p className={styles.muted}>Value: 470p, 100n, 0.1u, 470u.</p>
        <ResetKit
          onReset={() => {
            setAns({});
            setDischarged([]);
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}
