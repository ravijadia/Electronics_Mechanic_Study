import React, {useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import {GU_1_7_66} from './gu';
import Multimeter from '../Multimeter';
import XYGraph from '../XYGraph';
import useStoredState from '../useStoredState';
import {ProbeBar, ProbePoint, useProbes} from '../Probes';
import {fgFreq, fgVpp, useFunctionGenerator} from '../FunctionGenerator';
import {si} from '../signals';
import {Empty, NoteBox, ResetKit, Section, Table, Verdict, useKitSeed, useRng, type Note} from '../kit';
import {L2, fmt} from '../solution';
import {fmtOhms, kitLabel, near} from './parts';
import styles from '../styles.module.css';

const KEY = '1.7.66';

// Complex numbers as [re, im].
type Cx = [number, number];
const add = (a: Cx, b: Cx): Cx => [a[0] + b[0], a[1] + b[1]];
const sub = (a: Cx, b: Cx): Cx => [a[0] - b[0], a[1] - b[1]];
const mul = (a: Cx, b: Cx): Cx => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const div = (a: Cx, b: Cx): Cx => {
  const d = b[0] * b[0] + b[1] * b[1];
  return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
};
const abs = (a: Cx) => Math.hypot(a[0], a[1]);

const R_GEN = 50;
const R_SER = 100;
const R_PAR = 10e3;
const LS = [10e-3, 22e-3];
const CS = [47e-9, 100e-9];

interface Kit {
  L: number;
  rL: number;
  C: number;
}

/** Complex node voltages (rms) for the circuit at frequency f. */
function nodes(circuit: 's' | 'p', k: Kit, f: number, vg: number): Record<string, Cx> {
  const w = 2 * Math.PI * f;
  const zL: Cx = [k.rL, w * k.L];
  const zC: Cx = [0, -1 / (w * k.C)];
  const V: Cx = [vg, 0];
  if (circuit === 's') {
    const z = add(add([R_GEN + R_SER, 0], zL), zC);
    const i = div(V, z);
    const vc = mul(i, zC);
    const vl = mul(i, zL);
    const b = add(vc, vl);
    return {A: add(b, mul(i, [R_SER, 0])), B: b, C: vc, G: [0, 0]};
  }
  const zp = div(mul(zL, zC), add(zL, zC));
  const i = div(V, add([R_GEN + R_PAR, 0], zp));
  const t = mul(i, zp);
  return {A: add(t, mul(i, [R_PAR, 0])), T: t, G: [0, 0]};
}

const RANGES = [
  {fn: 'off', label: 'OFF', fs: 0},
  {fn: 'm30', label: '30 mV', fs: 0.03},
  {fn: 'm300', label: '300 mV', fs: 0.3},
  {fn: 'v3', label: '3 V', fs: 3},
  {fn: 'v30', label: '30 V', fs: 30},
];

const QTY: Record<'s' | 'p', {id: string; label: string; a: string; b: string}[]> = {
  s: [
    {id: 'VS', label: 'Vs (input)', a: 'A', b: 'G'},
    {id: 'VR', label: 'VR (across R)', a: 'A', b: 'B'},
    {id: 'VL', label: 'VL (across L)', a: 'B', b: 'C'},
    {id: 'VC', label: 'VC (across C)', a: 'C', b: 'G'},
  ],
  p: [
    {id: 'VS', label: 'Vs (input)', a: 'A', b: 'G'},
    {id: 'VRs', label: 'VRs (across series R)', a: 'A', b: 'T'},
    {id: 'VT', label: 'VT (across LC tank)', a: 'T', b: 'G'},
  ],
};

interface Rd {
  c: 's' | 'p';
  q: string;
  f: number;
  v: number;
}

export default function ResonanceLab(): React.JSX.Element {
  const [seed, newKit] = useKitSeed(KEY);
  const choice = useRng(seed, (rnd) => ({li: Math.floor(rnd() * 2), ci: Math.floor(rnd() * 2), lt: 1 + (rnd() * 2 - 1) * 0.05, ct: 1 + (rnd() * 2 - 1) * 0.05, rL: 18 + rnd() * 20}));
  const kit: Kit = {L: LS[choice.li] * choice.lt, rL: choice.rL, C: CS[choice.ci] * choice.ct};
  const frNom = 1 / (2 * Math.PI * Math.sqrt(LS[choice.li] * CS[choice.ci]));
  const frTrue = 1 / (2 * Math.PI * Math.sqrt(kit.L * kit.C));
  const [rds, setRds] = useStoredState<Rd[]>(`lab:${KEY}:rds`, []);
  const [ans, setAns] = useStoredState<{calc?: string; frs?: string; frp?: string}>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [circuit, setCircuit] = useState<'s' | 'p'>('s');
  const [fn, setFn] = useState('off');
  const [note, setNote] = useState<Note>(null);
  const probes = useProbes();
  const fg = useFunctionGenerator({wave: 'sine', range: 1000, dial: 1, amp: 2});

  const f = fgFreq(fg.state);
  const vg = fg.state.on && fg.state.wave === 'sine' ? fgVpp(fg.state) / (2 * Math.SQRT2) : 0;
  const nv = nodes(circuit, kit, f, vg);
  const red = probes.red?.split('@')[0] ?? null;
  const black = probes.black?.split('@')[0] ?? null;
  const both = red && black && red !== black && nv[red] && nv[black];
  const v = both ? abs(sub(nv[red!], nv[black!])) : 0;
  const range = RANGES.find((r) => r.fn === fn)!;
  const text = fn === 'off' ? '' : v >= range.fs ? 'OL' : range.fs < 1 ? (v * 1000).toFixed(range.fs < 0.1 ? 2 : 1) : v.toFixed(range.fs < 10 ? 3 : 2);
  const unit = fn === 'off' ? '' : range.fs < 1 ? 'mV' : 'V';
  const q = both ? QTY[circuit].find((x) => (x.a === red && x.b === black) || (x.a === black && x.b === red)) : undefined;

  const switchCircuit = (c: 's' | 'p') => {
    if (fg.state.on) return setNote({kind: 'warn', text: 'Switch the generator output OFF before rewiring.'});
    probes.clear();
    setNote(null);
    setCircuit(c);
  };

  const noteIt = () => {
    if (fn === 'off') return setNote({kind: 'warn', text: 'Select a range.'});
    if (!fg.state.on) return setNote({kind: 'warn', text: 'Generator output is OFF.'});
    if (fg.state.wave !== 'sine') return setNote({kind: 'warn', text: 'Use a sine wave for resonance.'});
    if (!q) return setNote({kind: 'warn', text: 'Probes across one part (or the input).'});
    if (text === 'OL') return setNote({kind: 'warn', text: 'OL: higher range.'});
    const val = unit === 'mV' ? Number(text) / 1000 : Number(text);
    const fr = Math.round(f);
    setRds((r) => [...r.filter((x) => !(x.c === circuit && x.q === q.id && x.f === fr)), {c: circuit, q: q.id, f: fr, v: val}]);
    setNote({kind: 'good', text: `${si(f, 'Hz')}: ${q.label} = ${text} ${unit}`});
  };

  const pts = (c: 's' | 'p', id: string) => rds.filter((r) => r.c === c && r.q === id).sort((a, b) => a.f - b.f);
  const sPts = pts('s', 'VR');
  const pPts = pts('p', 'VT');
  const spread = (p: Rd[]) => p.length >= 8 && p.some((x) => x.f < frTrue * 0.8) && p.some((x) => x.f > frTrue * 1.2) && p.some((x) => Math.abs(x.f - frTrue) < frTrue * 0.05);
  // Voltage magnification: VL and VC both noted at one frequency near resonance.
  const mag = rds.filter((r) => r.c === 's' && r.q === 'VL' && Math.abs(r.f - frTrue) < frTrue * 0.05).some((l) => rds.some((c) => c.c === 's' && c.q === 'VC' && c.f === l.f));
  const num = (s?: string) => (s && s.trim() !== '' && !Number.isNaN(Number(s)) ? Number(s) : null);
  const frOk = (s?: string) => near(num(s) != null ? num(s)! * 1000 : null, frTrue, 0.05);

  const pad = (node: string, x: number, y: number, label: string) => <ProbePoint key={`${node}${x}`} id={`${node}@${x}`} x={x} y={y} probes={probes} label={label} r={5} />;

  return (
    <PracticalSheet
      number={KEY}
      title="Construct and Test Series and Parallel Resonance Circuits"
      aim="To find the resonant frequency of series and parallel LC circuits by plotting their frequency response, and compare it with fr = 1 ÷ (2π√LC)."
      apparatus={['Function generator (sine, with frequency counter)', 'AC millivoltmeter', `Inductor ${si(LS[choice.li], 'H')}, capacitor ${si(CS[choice.ci], 'F')}`, `Resistors ${R_SER} Ω (series circuit), ${fmtOhms(R_PAR)} (parallel circuit)`]}
      procedure={[
        'Series circuit: generator → R → L → C → ground. Keep the input level constant.',
        'Vary the frequency (e.g. 1–10 kHz) and note VR at each step. Current I = VR ÷ R.',
        'Take more readings near the peak. At the peak, also note VL and VC.',
        'Parallel circuit: generator → 10 kΩ → L ∥ C → ground. Note VT across the tank at each frequency.',
        'Plot both graphs and read fr at the peak.',
      ]}
      precautions={['Switch the generator output off before rewiring.', 'Keep the generator amplitude the same for every reading.', 'Take closer frequency steps near resonance.']}
      viva={[
        {q: 'At series resonance, what is the impedance and the current?', a: 'Impedance is minimum (= R only) and the current is maximum.'},
        {q: 'At parallel resonance?', a: 'The tank impedance is maximum, so the line current is minimum and the voltage across the tank is maximum.'},
        {q: 'Why can VL and VC be larger than the supply at series resonance?', a: 'They are equal and opposite, so they cancel. Each can be Q times the supply: voltage magnification.'},
        {q: 'Where are resonant circuits used?', a: 'Tuning circuits in radio receivers, filters, oscillators.'},
        {q: 'What happens to fr if C is made four times bigger?', a: 'fr halves, since fr ∝ 1 ÷ √C.'},
      ]}
      steps={[
        {label: 'Calculate fr = 1 ÷ (2π√LC) and enter it.', hint: 'Use L and C from the apparatus list. Answer in kHz.', done: near(num(ans.calc) != null ? num(ans.calc)! * 1000 : null, frNom, 0.01)},
        {
          label: 'Series circuit: note VR at 8+ frequencies.',
          hint: `Sine wave, output ON, same level. Include points below, near and above fr. Readings: ${sPts.length}.`,
          done: spread(sPts),
        },
        {label: 'Series circuit: note VL and VC at the peak.', hint: 'Both at the same frequency, near fr.', done: mag},
        {
          label: 'Parallel circuit: note VT at 8+ frequencies.',
          hint: `Generator OFF, tap Parallel LC (tank), then repeat. Readings: ${pPts.length}.`,
          done: spread(pPts),
        },
        {label: 'Read fr from both graphs and enter them.', hint: 'fr is at the peak of each graph. Answer in kHz.', done: frOk(ans.frs) && frOk(ans.frp)},
        {label: 'Enter your details and print or save the record.', done: printed},
      ]}
      gu={GU_1_7_66(si(LS[choice.li], 'H'), si(CS[choice.ci], 'F'), `${R_SER} Ω`, fmtOhms(R_PAR))}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={clsx(styles.seg, styles.noPrint)} role="group" aria-label="Circuit" style={{marginBottom: '0.6rem'}}>
          <button type="button" aria-pressed={circuit === 's'} onClick={() => switchCircuit('s')}>
            Series RLC
          </button>
          <button type="button" aria-pressed={circuit === 'p'} onClick={() => switchCircuit('p')}>
            Parallel LC (tank)
          </button>
        </div>
        <div className={styles.controls} style={{marginTop: 0}}>
          <div>
            <div className={styles.kit}>
              {circuit === 's' ? (
                <svg viewBox="0 0 560 220" role="img" aria-label="Series circuit: generator, R, L, C to ground">
                  <circle cx={50} cy={110} r={26} fill="#31414c" stroke="#4d5f6b" />
                  <text x={50} y={115} textAnchor="middle" style={kitLabel}>
                    FG
                  </text>
                  <path className={styles.wire} d="M50 84 V50 H150 M210 50 H280 M380 50 H470 V92 M470 128 V180 H50 V136" fill="none" />
                  <rect x={150} y={40} width={60} height={20} rx={4} fill="#e8d7b0" />
                  <text x={180} y={32} textAnchor="middle" style={kitLabel}>
                    R {R_SER} Ω
                  </text>
                  <path d="M280 50 q10 -16 20 0 q10 -16 20 0 q10 -16 20 0 q10 -16 20 0 q10 -16 20 0" stroke="#d08a3c" strokeWidth={3} fill="none" />
                  <text x={330} y={26} textAnchor="middle" style={kitLabel}>
                    L {si(LS[choice.li], 'H')}
                  </text>
                  <path d="M450 92 H490 M450 128 H490" stroke="var(--lab-wire)" strokeWidth={4} />
                  <text x={500} y={114} style={kitLabel}>
                    C {si(CS[choice.ci], 'F')}
                  </text>
                  {pad('A', 120, 50, 'Input, R side')}
                  {pad('B', 245, 50, 'R–L junction')}
                  {pad('C', 420, 50, 'L–C junction')}
                  {pad('G', 300, 180, 'Ground')}
                </svg>
              ) : (
                <svg viewBox="0 0 560 220" role="img" aria-label="Parallel circuit: generator, series resistor, L and C in parallel to ground">
                  <circle cx={50} cy={110} r={26} fill="#31414c" stroke="#4d5f6b" />
                  <text x={50} y={115} textAnchor="middle" style={kitLabel}>
                    FG
                  </text>
                  <path className={styles.wire} d="M50 84 V50 H150 M210 50 H480 V96 M360 50 V70 M360 150 V180 M480 124 V180 H50 V136" fill="none" />
                  <rect x={150} y={40} width={60} height={20} rx={4} fill="#e8d7b0" />
                  <text x={180} y={32} textAnchor="middle" style={kitLabel}>
                    Rs {fmtOhms(R_PAR)}
                  </text>
                  <path d="M360 70 q-16 10 0 20 q-16 10 0 20 q-16 10 0 20 q-16 10 0 20" stroke="#d08a3c" strokeWidth={3} fill="none" />
                  <text x={330} y={115} textAnchor="end" style={kitLabel}>
                    L
                  </text>
                  <path d="M460 96 H500 M460 124 H500" stroke="var(--lab-wire)" strokeWidth={4} />
                  <text x={508} y={114} style={kitLabel}>
                    C
                  </text>
                  {pad('A', 120, 50, 'Input')}
                  {pad('T', 280, 50, 'Tank top')}
                  {pad('G', 420, 180, 'Ground')}
                </svg>
              )}
            </div>
            <ProbeBar probes={probes} />
          </div>
          <div style={{display: 'grid', gap: '0.6rem', alignContent: 'start'}}>
            <Multimeter name="AC millivoltmeter" fn={fn} functions={RANGES} text={text} unit={unit} placement={q?.label} onFunction={(x) => (setNote(null), setFn(x))} />
            <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} onClick={noteIt}>
              Note reading
            </button>
          </div>
        </div>
        <div style={{marginTop: '0.6rem', maxWidth: 420}}>{fg.view}</div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table: series">
        {rds.filter((r) => r.c === 's').length === 0 ? (
          <Empty>No readings yet.</Empty>
        ) : (
          <Table
            head={['f (Hz)', 'Quantity', 'Reading', 'I = VR ÷ R (mA)']}
            rows={rds
              .filter((r) => r.c === 's')
              .sort((a, b) => a.f - b.f)
              .map((r) => [r.f, QTY.s.find((x) => x.id === r.q)!.label, si(r.v, 'V'), r.q === 'VR' ? ((r.v / R_SER) * 1000).toFixed(2) : '–'])}
          />
        )}
        {sPts.length > 1 && <XYGraph series={[{id: 's', label: 'Current', color: 'var(--s1)', marker: 'circle', points: sPts.map((p) => ({x: p.f / 1000, y: (p.v / R_SER) * 1000}))}]} xLabel="Frequency (kHz)" yLabel="I (mA)" xUnit="kHz" yUnit="mA" />}
      </Section>
      <Section title="Observation table: parallel">
        {rds.filter((r) => r.c === 'p').length === 0 ? (
          <Empty>No readings yet.</Empty>
        ) : (
          <Table
            head={['f (Hz)', 'Quantity', 'Reading']}
            rows={rds
              .filter((r) => r.c === 'p')
              .sort((a, b) => a.f - b.f)
              .map((r) => [r.f, QTY.p.find((x) => x.id === r.q)!.label, si(r.v, 'V')])}
          />
        )}
        {pPts.length > 1 && <XYGraph series={[{id: 'p', label: 'Tank voltage', color: 'var(--s2)', marker: 'square', points: pPts.map((p) => ({x: p.f / 1000, y: p.v * 1000}))}]} xLabel="Frequency (kHz)" yLabel="VT (mV)" xUnit="kHz" yUnit="mV" />}
      </Section>
      <Section title="Result">
        <Table
          head={['', 'fr (kHz)', 'Check']}
          rows={(
            [
              ['calc', `Calculated: 1 ÷ (2π√(${si(LS[choice.li], 'H')} × ${si(CS[choice.ci], 'F')}))`, near(num(ans.calc) != null ? num(ans.calc)! * 1000 : null, frNom, 0.01)],
              ['frs', 'Series graph (peak current)', frOk(ans.frs)],
              ['frp', 'Parallel graph (peak VT)', frOk(ans.frp)],
            ] as const
          ).map(([id, label, ok]) => [
            label,
            <input className={styles.input} style={{maxWidth: '6rem'}} inputMode="decimal" aria-label={`${label}, kilohertz`} value={ans[id] ?? ''} onChange={(e) => setAns((a) => ({...a, [id]: e.target.value}))} />,
            ans[id] ? <Verdict
              ok={ok}
              fix={{
                hint:
                  id === 'calc'
                    ? L2('fr = 1 ÷ (2π√(L × C)), with L in H and C in F. Answer in kHz.', 'fr = 1 ÷ (2π√(L × C)), L H માં અને C F માં. જવાબ kHz માં.')
                    : L2('Series: fr is where the current is maximum. Parallel: fr is where the tank voltage is maximum. Read the peak on your graph.', 'શ્રેણી: જ્યાં કરંટ મહત્તમ ત્યાં fr. સમાંતર: જ્યાં ટેન્ક વોલ્ટેજ મહત્તમ ત્યાં fr. ગ્રાફનું પીક વાંચો.'),
                work:
                  id === 'calc'
                    ? L2(`fr = 1 ÷ (2π√(${si(LS[choice.li], 'H')} × ${si(CS[choice.ci], 'F')})) = ${fmt(frNom / 1000)} kHz.`, `fr = 1 ÷ (2π√(${si(LS[choice.li], 'H')} × ${si(CS[choice.ci], 'F')})) = ${fmt(frNom / 1000)} kHz.`)
                    : L2(`The real resonant frequency of your kit is ${fmt(frTrue / 1000)} kHz (±5 % is accepted).`, `તમારી કિટની વાસ્તવિક રેઝોનન્ટ ફ્રીક્વન્સી ${fmt(frTrue / 1000)} kHz છે (±5 % ચાલે).`),
                answer: `${fmt((id === 'calc' ? frNom : frTrue) / 1000)} kHz`,
                entered: num(ans[id]),
                expected: (id === 'calc' ? frNom : frTrue) / 1000,
              }}
            /> : '–',
          ])}
        />
        <ResetKit
          onReset={() => {
            setRds([]);
            setAns({});
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}
