import React, {useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import {GU_1_11_106} from './gu';
import Multimeter from '../Multimeter';
import XYGraph from '../XYGraph';
import useStoredState from '../useStoredState';
import {Knob} from '../Scope';
import {Empty, NoteBox, ResetKit, Section, Table, Verdict, useKitSeed, useRng, type Note} from '../kit';
import {kitLabel, near} from '../m07/parts';
import {pvOperate, type PvSpec} from './opto';
import styles from '../styles.module.css';

const num = (s?: string) => (s && s.trim() !== '' && !Number.isNaN(Number(s)) ? Number(s) : null);

// ---------------------------------------------------------------------------
// 1.11.106 Test a photovoltaic (solar) cell
// ---------------------------------------------------------------------------

const R_AMM = 1;
/** Load box settings (Ω): Infinity = open, 0 = short (ammeter only). */
const LOADS = [Infinity, 1000, 470, 220, 150, 100, 68, 47, 33, 22, 10, 0];
const fmtLoad = (r: number) => (!isFinite(r) ? 'Open' : r === 0 ? 'Short' : `${r} Ω`);

const V_FNS = [
  {fn: 'off', label: 'OFF'},
  {fn: 'V2', label: 'DC V 2'},
  {fn: 'V20', label: 'DC V 20'},
];
const I_FNS = [
  {fn: 'off', label: 'OFF'},
  {fn: 'mA20', label: 'DC mA 20'},
  {fn: 'mA200', label: 'DC mA 200'},
];

/** Lamp irradiance on the cell at a distance (cm), W/m². */
const irradiance = (d: number) => 600 * (20 / d) ** 2;

interface LightRow {
  voc?: number;
  isc?: number;
}
interface LoadPt {
  d: number;
  rl: number;
  v: number;
  ima: number;
}

export function SolarCellLab(): React.JSX.Element {
  const KEY = '1.11.106';
  const [seed, newKit] = useKitSeed(KEY);
  const pv = useRng<PvSpec>(seed, (rnd) => ({isc: 0.12 * (1 + (rnd() * 2 - 1) * 0.08), voc: 7.2 * (1 + (rnd() * 2 - 1) * 0.03), cells: 12, rs: 3, rsh: 2000}));
  const [d, setD] = useState(40);
  const [lamp, setLamp] = useState(false);
  const [covered, setCovered] = useState(false);
  const [load, setLoad] = useState(0); // index into LOADS
  const [vfn, setVfn] = useState('off');
  const [ifn, setIfn] = useState('off');
  const [note, setNote] = useState<Note>(null);
  const [light, setLight] = useStoredState<Record<string, LightRow>>(`lab:${KEY}:light`, {});
  const [pts, setPts] = useStoredState<LoadPt[]>(`lab:${KEY}:pts`, []);
  const [ans, setAns] = useStoredState<{p?: string; r?: string}>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);

  const g = covered ? 0 : lamp ? irradiance(d) : 3;
  const rl = LOADS[load];
  // The ammeter is always in series: its 1 Ω burden adds to the load.
  const o = pvOperate(pv, g, isFinite(rl) ? rl + R_AMM : Infinity);
  const vCell = o.v;
  const vText = vfn === 'off' ? '' : Math.abs(vCell) >= (vfn === 'V2' ? 2 : 20) ? 'OL' : vCell.toFixed(vfn === 'V2' ? 3 : 2);
  const ma = o.i * 1000;
  const iText = ifn === 'off' ? '' : ma >= (ifn === 'mA20' ? 20 : 200) ? 'OL' : ma.toFixed(ifn === 'mA20' ? 2 : 1);

  const noteIt = () => {
    if (covered) return setNote({kind: 'warn', text: 'The cell is covered.'});
    if (!lamp) return setNote({kind: 'warn', text: 'Switch the lamp on.'});
    const need = !isFinite(rl) ? ['v'] : rl === 0 ? ['i'] : ['v', 'i'];
    if ((need.includes('v') && vfn === 'off') || (need.includes('i') && ifn === 'off')) return setNote({kind: 'warn', text: need.length === 2 ? 'Switch both meters on.' : need[0] === 'v' ? 'Switch the voltmeter on.' : 'Switch the ammeter on.'});
    if ((need.includes('v') && vText === 'OL') || (need.includes('i') && iText === 'OL')) return setNote({kind: 'warn', text: 'OL: change range.'});
    if (!isFinite(rl)) {
      setLight((x) => ({...x, [d]: {...x[d], voc: Number(vText)}}));
      return setNote({kind: 'good', text: `${d} cm: Voc = ${vText} V`});
    }
    if (rl === 0) {
      setLight((x) => ({...x, [d]: {...x[d], isc: Number(iText)}}));
      return setNote({kind: 'good', text: `${d} cm: Isc = ${iText} mA`});
    }
    if (pts.length && pts[0].d !== d) return setNote({kind: 'warn', text: `Load test: keep the lamp at ${pts[0].d} cm.`});
    setPts((p) => [...p.filter((x) => x.rl !== rl), {d, rl, v: Number(vText), ima: Number(iText)}].sort((a, b) => b.rl - a.rl));
    setNote({kind: 'good', text: `${rl} Ω: ${vText} V, ${iText} mA`});
  };

  const lrows = Object.entries(light)
    .map(([k, x]) => ({d: Number(k), ...x}))
    .sort((a, b) => a.d - b.d);
  const both = lrows.filter((x) => x.voc != null && x.isc != null);
  const best = pts.reduce<LoadPt | null>((b, p) => (!b || p.v * p.ima > b.v * b.ima ? p : b), null);
  const pOk = best != null && near(num(ans.p), best.v * best.ima, 0.03);
  const rOk = best != null && num(ans.r) === best.rl;
  const glow = lamp ? Math.min(1, irradiance(d) / 600) : 0;
  const lampX = 150 - (d - 20) * 1.6;

  return (
    <PracticalSheet
      number={KEY}
      title="Test a Photovoltaic (Solar) Cell"
      aim="To measure the open-circuit voltage and short-circuit current of a solar cell module at different light levels, and find its maximum power point with a load."
      apparatus={['Solar module 6 V (12 cells)', '100 W lamp on a scale (20–80 cm)', 'Load box 10 Ω – 1 kΩ', 'Two digital multimeters']}
      procedure={[
        'Voltmeter across the module, ammeter in series with the load box.',
        'Load open: note Voc. Load short: note Isc. Repeat at four or more lamp distances.',
        'Keep the lamp at one distance. Note V and I for each load from 1 kΩ down to 10 Ω.',
        'P = V × I. The load with the largest P is the maximum power point.',
      ]}
      precautions={['Do not touch the hot lamp.', 'Keep the cell at a fixed angle to the lamp.', 'Start the ammeter on the highest range.']}
      viva={[
        {q: 'What happens to Isc when the light doubles?', a: 'It roughly doubles: short-circuit current is proportional to light.'},
        {q: 'Does Voc change much with light?', a: 'Only a little; it rises slowly (logarithmically).'},
        {q: 'Why is the power zero at open circuit and at short circuit?', a: 'At open circuit I = 0; at short circuit V = 0. So P = V × I = 0.'},
        {q: 'Why are solar cells connected in series in a module?', a: 'One silicon cell gives only about 0.5–0.6 V.'},
      ]}
      steps={[
        {label: 'Switch the lamp ON and switch both meters on.', hint: 'Voltmeter across the module, ammeter in series. Ammeter on the high range first.', done: lamp || lrows.length > 0 || pts.length > 0},
        {
          label: `Note Voc (load Open) and Isc (load Short) at four lamp distances. Distances: ${Math.min(both.length, 4)}/4`,
          hint: 'Change LAMP DISTANCE, then LOAD BOX to Open and to Short. Press Note reading each time.',
          done: both.length >= 4,
        },
        {
          label: `Keep the lamp at one distance and note V and I for six loads. Loads: ${Math.min(pts.length, 6)}/6`,
          hint: 'Step the load box from 1 kΩ down to 10 Ω. Do not move the lamp.',
          done: pts.length >= 6,
        },
        {label: 'Find the maximum power and its load, and enter both.', hint: 'P = V × I. Take the largest P in your table.', done: pOk && rOk},
        {label: 'Enter your details and print or save the record.', done: printed},
      ]}
      gu={GU_1_11_106}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div className={styles.kit}>
            <svg viewBox="0 0 520 240" role="img" aria-label={`Lamp ${lamp ? 'on' : 'off'} at ${d} cm from the solar module${covered ? ', module covered' : ''}, load ${fmtLoad(rl)}`}>
              <path d="M20 200 H300" stroke="#9fb0ba" strokeWidth={2} />
              {[20, 30, 40, 50, 60, 70, 80].map((x) => (
                <g key={x}>
                  <line x1={150 - (x - 20) * 1.6} y1={196} x2={150 - (x - 20) * 1.6} y2={204} stroke="#9fb0ba" />
                  <text x={150 - (x - 20) * 1.6} y={218} textAnchor="middle" style={{...kitLabel, fontSize: 9}}>
                    {x}
                  </text>
                </g>
              ))}
              <text x={20} y={234} style={{...kitLabel, fontSize: 9}}>
                cm
              </text>
              {glow > 0 && <path d={`M${lampX + 10} 84 L${210} 60 L${210} 160 Z`} fill="#ffd34d" opacity={0.18 * glow} />}
              <circle cx={lampX} cy={110} r={18} fill={lamp ? '#ffd34d' : '#4a5560'} stroke="#9aa3a8" strokeWidth={2} />
              <path d={`M${lampX} 128 V196`} stroke="#6b7a84" strokeWidth={4} />
              <rect x={210} y={60} width={70} height={100} rx={3} fill={covered ? '#2b2b2b' : '#1c3d7a'} stroke="#9aa3a8" />
              {!covered &&
                [0, 1, 2].map((c) =>
                  [0, 1, 2, 3].map((k) => <rect key={`${c}${k}`} x={214 + c * 22} y={64 + k * 24} width={20} height={22} fill="#24529e" stroke="#7ea0d8" strokeWidth={0.5} />),
                )}
              <text x={245} y={176} textAnchor="middle" style={{...kitLabel, fontSize: 10}}>
                {covered ? 'covered' : 'solar module'}
              </text>
              <path className={styles.wire} d="M280 80 H360 M400 80 H470 V110 M470 150 V190 H300 V140 H280" fill="none" />
              <circle cx={380} cy={80} r={18} fill="#f2c230" stroke="#c99a10" strokeWidth={2} />
              <text x={380} y={86} textAnchor="middle" style={{fill: '#222', fontWeight: 800, fontSize: 14}}>
                A
              </text>
              <rect x={450} y={110} width={40} height={40} rx={4} fill="#31414c" stroke="#4d5f6b" />
              <text x={470} y={134} textAnchor="middle" style={{...kitLabel, fontSize: 9}}>
                {fmtLoad(rl)}
              </text>
              <circle cx={320} cy={135} r={18} fill="#f2c230" stroke="#c99a10" strokeWidth={2} />
              <text x={320} y={141} textAnchor="middle" style={{fill: '#222', fontWeight: 800, fontSize: 14}}>
                V
              </text>
              <path d="M320 117 V80 M320 153 V190" stroke="#e9eef0" strokeWidth={1.4} strokeDasharray="3 2" />
              <text x={286} y={76} style={kitLabel}>
                +
              </text>
            </svg>
          </div>
          <div style={{display: 'grid', gap: '0.6rem', alignContent: 'start'}}>
            <Multimeter name="Voltmeter (across module)" fn={vfn} functions={V_FNS} text={vText} unit={vfn === 'off' ? '' : 'V'} onFunction={setVfn} />
            <Multimeter name="Ammeter (in series)" fn={ifn} functions={I_FNS} text={iText} unit={ifn === 'off' ? '' : 'mA'} onFunction={setIfn} />
            <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} onClick={noteIt}>
              Note reading
            </button>
          </div>
        </div>
        <div className={clsx(styles.controls, styles.noPrint)}>
          <div className={styles.card}>
            <Knob label="LAMP DISTANCE" value={`${d} cm`} onDec={() => setD((x) => Math.max(20, x - 5))} onInc={() => setD((x) => Math.min(80, x + 5))} />
            <div className={styles.seg} role="group" aria-label="Light" style={{marginTop: '0.4rem'}}>
              <button type="button" aria-pressed={lamp} onClick={() => (setLamp((x) => !x), setNote(null))}>
                Lamp {lamp ? 'ON' : 'OFF'}
              </button>
              <button type="button" aria-pressed={covered} onClick={() => setCovered((x) => !x)}>
                {covered ? 'Uncover cell' : 'Cover cell'}
              </button>
            </div>
          </div>
          <div className={styles.card}>
            <Knob label="LOAD BOX" value={fmtLoad(rl)} onDec={() => setLoad((x) => Math.max(0, x - 1))} onInc={() => setLoad((x) => Math.min(LOADS.length - 1, x + 1))} />
          </div>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {lrows.length === 0 && pts.length === 0 ? (
          <Empty>No readings yet.</Empty>
        ) : (
          <div className={styles.twoCol}>
            {lrows.length > 0 && <Table caption="Light test" head={['Distance (cm)', 'Voc (V)', 'Isc (mA)']} rows={lrows.map((x) => [x.d, x.voc?.toFixed(2) ?? '–', x.isc?.toFixed(1) ?? '–'])} />}
            {pts.length > 0 && <Table caption={`Load test at ${pts[0].d} cm`} head={['Load (Ω)', 'V (V)', 'I (mA)', 'P (mW)']} rows={pts.map((p) => [p.rl, p.v.toFixed(2), p.ima.toFixed(1), (p.v * p.ima).toFixed(1)])} />}
          </div>
        )}
        {pts.length > 1 && <XYGraph series={[{id: 'vi', label: 'I', color: 'var(--s1)', marker: 'circle', points: pts.map((p) => ({x: p.v, y: p.ima}))}]} xLabel="Module voltage (V)" yLabel="Current (mA)" xUnit="V" yUnit="mA" />}
      </Section>
      <Section title="Result">
        <Table
          head={['', 'Your value', 'Check']}
          rows={[
            ['Maximum power (mW)', <input className={styles.input} style={{maxWidth: '5.5rem'}} inputMode="decimal" aria-label="Maximum power" value={ans.p ?? ''} onChange={(e) => setAns((a) => ({...a, p: e.target.value}))} />, ans.p ? best ? <Verdict ok={pOk} /> : 'do the load test first' : '–'],
            ['Load at maximum power (Ω)', <input className={styles.input} style={{maxWidth: '5.5rem'}} inputMode="decimal" aria-label="Load at maximum power" value={ans.r ?? ''} onChange={(e) => setAns((a) => ({...a, r: e.target.value}))} />, ans.r ? best ? <Verdict ok={rOk} /> : '–' : '–'],
          ]}
        />
        <ResetKit
          onReset={() => {
            setLight({});
            setPts([]);
            setAns({});
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}
