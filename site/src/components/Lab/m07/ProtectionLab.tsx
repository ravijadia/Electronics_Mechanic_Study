import React, {useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import {GU_1_7_60} from './gu';
import Multimeter from '../Multimeter';
import useStoredState from '../useStoredState';
import {ProbeBar, ProbePoint, useProbes} from '../Probes';
import {Empty, NoteBox, ResetKit, Section, Table, Verdict, shuffle, useKitSeed, useRng, type Note} from '../kit';
import {kitLabel} from './parts';
import styles from '../styles.module.css';

const KEY = '1.7.60';

type DevKind = 'glass' | 'hrc' | 'kitkat' | 'mcb' | 'rccb' | 'ptc';
interface Dev {
  kind: DevKind;
  name: string;
  mark: string;
  /** Defective: open when it should conduct. */
  bad: boolean;
  /** Can the fault be seen? */
  visible: boolean;
}

const DEVS: Omit<Dev, 'bad' | 'visible'>[] = [
  {kind: 'glass', name: 'Glass cartridge fuse', mark: 'T2A 250V'},
  {kind: 'hrc', name: 'HRC fuse', mark: '16A 415V'},
  {kind: 'kitkat', name: 'Rewireable (kit-kat) fuse', mark: '16A'},
  {kind: 'mcb', name: 'MCB', mark: 'C16'},
  {kind: 'rccb', name: 'RCCB', mark: '25A 30mA'},
  {kind: 'ptc', name: 'PTC resettable fuse', mark: '0.5A'},
];
const W = 200;
const H = 150;
const PIN: Record<DevKind, [number, number, number, number]> = {
  glass: [22, 80, 178, 80],
  hrc: [30, 80, 170, 80],
  kitkat: [40, 112, 160, 112],
  mcb: [100, 24, 100, 136],
  rccb: [86, 24, 86, 136],
  ptc: [88, 136, 112, 136],
};

function DevArt({d, closed}: {d: Dev; closed: boolean}) {
  const t = (x: number, y: number, s: string, fill = '#222', size = 10) => (
    <text x={x} y={y} textAnchor="middle" style={{fill, fontSize: size, fontWeight: 700, fontFamily: 'var(--ifm-font-family-monospace)'}}>
      {s}
    </text>
  );
  switch (d.kind) {
    case 'glass':
      return (
        <g>
          <rect x={22} y={66} width={26} height={28} rx={3} fill="#c9ced1" />
          <rect x={152} y={66} width={26} height={28} rx={3} fill="#c9ced1" />
          <rect x={46} y={68} width={108} height={24} fill="#dfeff7" opacity={0.5} stroke="#a9c4d2" />
          {d.bad && d.visible ? (
            <g stroke="#555" strokeWidth={1.5} fill="none">
              <path d="M48 80 H92" />
              <path d="M108 80 H152" />
              <ellipse cx={100} cy={80} rx={16} ry={9} fill="#3a3a3a" opacity={0.35} stroke="none" />
            </g>
          ) : (
            <path d="M48 80 H152" stroke="#555" strokeWidth={1.5} />
          )}
          {t(100, 116, d.mark, '#e9eef0')}
        </g>
      );
    case 'hrc':
      return (
        <g>
          <rect x={30} y={70} width={20} height={20} fill="#c9ced1" />
          <rect x={150} y={70} width={20} height={20} fill="#c9ced1" />
          <rect x={48} y={58} width={104} height={44} rx={4} fill="#efe9dc" />
          <circle cx={100} cy={58} r={5} fill={d.bad ? '#d4302a' : '#9aa3a8'} />
          {d.bad && <rect x={97} y={46} width={6} height={8} fill="#d4302a" />}
          {t(100, 86, d.mark)}
          {t(100, 124, 'indicator ↑', '#9fb0ba', 9)}
        </g>
      );
    case 'kitkat':
      return (
        <g>
          <rect x={40} y={34} width={120} height={64} rx={8} fill="#f1efe8" />
          <rect x={52} y={88} width={14} height={24} fill="#c9a227" />
          <rect x={134} y={88} width={14} height={24} fill="#c9a227" />
          <path d={d.bad && d.visible ? 'M59 88 V74 H92 M108 74 H141 V88' : 'M59 88 V74 H141 V88'} stroke="#b87333" strokeWidth={1.4} fill="none" />
          {t(100, 58, d.mark)}
        </g>
      );
    case 'mcb':
    case 'rccb': {
      const w = d.kind === 'mcb' ? 50 : 84;
      const x0 = (d.kind === 'mcb' ? 100 : 86) - 25;
      return (
        <g>
          <rect x={x0} y={30} width={w} height={100} rx={4} fill="#f4f4f2" stroke="#c9c4b4" />
          <rect x={x0 + 13} y={64} width={24} height={34} rx={3} fill="#3a3f45" />
          <rect x={x0 + 16} y={closed ? 66 : 80} width={18} height={16} rx={2} fill={d.kind === 'mcb' ? '#2b5fd1' : '#2f9a3c'} />
          {t(x0 + 25, 50, d.mark.split(' ')[0], '#222', 10)}
          {t(x0 + 25, 120, closed ? 'ON' : 'OFF', closed ? '#1f8a4c' : '#c8352a', 9)}
          {d.kind === 'rccb' && (
            <g>
              <rect x={x0 + 52} y={70} width={20} height={20} rx={3} fill="#f2c230" stroke="#c99a10" />
              {t(x0 + 62, 84, 'T', '#222', 11)}
              {t(x0 + 62, 50, '30mA', '#222', 8)}
            </g>
          )}
        </g>
      );
    }
    case 'ptc':
      return (
        <g>
          <path d="M92 104 V136 M108 104 V136" stroke="#a9b1b6" strokeWidth={2} />
          <ellipse cx={100} cy={78} rx={26} ry={30} fill="#e6b422" />
          {t(100, 82, d.mark, '#3a2a0a', 10)}
        </g>
      );
  }
}

const DEV_FNS = [
  {fn: 'off', label: 'OFF'},
  {fn: 'buzz', label: '•))) Buzzer'},
  {fn: 'r200', label: 'Ω 200'},
];

/** Contact resistance when good and closed (Ω). */
const R_GOOD: Record<DevKind, number> = {glass: 0.08, hrc: 0.01, kitkat: 0.02, mcb: 0.01, rccb: 0.01, ptc: 0.6};

// MCB trip model (C curve). Thermal: t = 60 / (m² − 1) s above 1.13 × In.
function mcbTrip(m: number, magnetic: number): number | null {
  if (m >= magnetic) return 0.01;
  if (m < 1.13) return null;
  return 60 / (m * m - 1);
}

export default function ProtectionLab(): React.JSX.Element {
  const [seed, newKit] = useKitSeed(KEY);
  const kit = useRng(seed, (rnd) => {
    const order = shuffle(DEVS, rnd);
    // Two defective devices: one you can see, one only the meter finds.
    const cand = shuffle(order.map((d, k) => (['glass', 'hrc', 'kitkat', 'ptc'].includes(d.kind) ? k : -1)).filter((k) => k >= 0), rnd);
    const devs: Dev[] = order.map((d, k) => ({...d, bad: k === cand[0] || k === cand[1], visible: k === cand[0] && d.kind !== 'hrc' && d.kind !== 'ptc'}));
    return {devs, magnetic: 5 + rnd() * 4, rcd: 18 + rnd() * 8};
  });
  const devs = kit.devs;
  const [ans, setAns] = useStoredState<Record<number, {name?: string; cond?: string; meas?: string}>>(`lab:${KEY}:ans`, {});
  const [trips, setTrips] = useStoredState<{m: number; t: number | null}[]>(`lab:${KEY}:trips`, []);
  const [rcd, setRcd] = useStoredState<{leak: number; trip: boolean}[]>(`lab:${KEY}:rcd`, []);
  const [rcdTest, setRcdTest] = useStoredState(`lab:${KEY}:rcdtest`, false);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [closed, setClosed] = useState<Record<number, boolean>>({});
  const [fn, setFn] = useState('off');
  const [mult, setMult] = useState(2);
  const [leak, setLeak] = useState(10);
  const [panelMcb, setPanelMcb] = useState(true);
  const [panelRcd, setPanelRcd] = useState(true);
  const [note, setNote] = useState<Note>(null);
  const [panelNote, setPanelNote] = useState<Note>(null);
  const probes = useProbes();
  const set = (k: number, p: object) => setAns((a) => ({...a, [k]: {...a[k], ...p}}));

  const isOn = (k: number) => (devs[k].kind === 'mcb' || devs[k].kind === 'rccb' ? (closed[k] ?? false) : true);
  const [ri, rt] = (probes.red ?? ':').split(':');
  const [bi, bt] = (probes.black ?? ':').split(':');
  const on = ri && ri === bi && rt !== bt ? Number(ri) : null;
  const r = on == null ? Infinity : devs[on].bad || !isOn(on) ? Infinity : R_GOOD[devs[on].kind];
  const text = fn === 'off' ? '' : !isFinite(r) ? 'OL' : (r + 0.3).toFixed(1);
  const beep = fn === 'buzz' && isFinite(r);

  const noteIt = () => {
    if (on == null) return setNote({kind: 'warn', text: 'Probes on both terminals of one device.'});
    if (fn === 'off') return setNote({kind: 'warn', text: 'Select buzzer or Ω.'});
    const d = devs[on];
    const sw = d.kind === 'mcb' || d.kind === 'rccb';
    const prev = ans[on]?.meas ?? '';
    const tag = sw ? `${isOn(on) ? 'ON' : 'OFF'}: ${text}` : text;
    const meas = sw ? [...new Set([...prev.split(' · ').filter(Boolean).filter((x) => !x.startsWith(isOn(on) ? 'ON' : 'OFF')), tag])].sort().join(' · ') : tag;
    set(on, {meas});
    setNote({kind: 'good', text: `Device ${on + 1}: ${tag} ${text === 'OL' ? '' : 'Ω'}${beep ? ' (beep)' : ''}`});
  };

  const tested = (k: number) => {
    const m = ans[k]?.meas ?? '';
    const sw = devs[k].kind === 'mcb' || devs[k].kind === 'rccb';
    return sw ? m.includes('ON:') && m.includes('OFF:') : !!m;
  };
  const nameOk = (k: number) => ans[k]?.name === devs[k].kind;
  const condOk = (k: number) => ans[k]?.cond === (devs[k].bad ? 'bad' : 'good');

  const applyLoad = () => {
    if (!panelMcb) return setPanelNote({kind: 'warn', text: 'MCB is OFF. Switch it on first.'});
    const t = mcbTrip(mult, kit.magnetic);
    setTrips((x) => [...x.filter((y) => y.m !== mult), {m: mult, t}].sort((a, b) => a.m - b.m));
    if (t != null) setPanelMcb(false);
    setPanelNote(t == null ? {kind: 'info', text: `${mult} × In: no trip in 5 minutes.`} : t < 0.1 ? {kind: 'bad', text: `${mult} × In: instant trip (magnetic).`} : {kind: 'warn', text: `${mult} × In: tripped after ${t.toFixed(1)} s (thermal).`});
  };
  const applyLeak = () => {
    if (!panelRcd) return setPanelNote({kind: 'warn', text: 'RCCB is OFF. Switch it on first.'});
    const trip = leak >= kit.rcd;
    setRcd((x) => [...x.filter((y) => y.leak !== leak), {leak, trip}].sort((a, b) => a.leak - b.leak));
    if (trip) setPanelRcd(false);
    setPanelNote(trip ? {kind: 'bad', text: `${leak} mA leakage: RCCB tripped.`} : {kind: 'info', text: `${leak} mA leakage: no trip.`});
  };

  return (
    <PracticalSheet
      number={KEY}
      title="Identify and Test Circuit Breakers and Other Protective Devices"
      aim="To identify fuses, MCB, RCCB and PTC fuse, test them for continuity, and test the tripping of an MCB on overload and an RCCB on earth leakage."
      apparatus={['Fuses: glass, HRC, rewireable; MCB, RCCB, PTC resettable fuse', 'Digital multimeter', 'MCB/RCCB test panel with load and leakage selector']}
      procedure={[
        'Name each device and read its rating.',
        'Continuity test (supply off): a good fuse reads near 0 Ω and beeps; a blown one reads OL.',
        'Test the MCB and RCCB in both ON and OFF positions.',
        'Test panel: apply 1.5, 2, 3, 5 and 10 × In to the MCB and note the trip time.',
        'Press the RCCB T button, then apply leakage currents and note where it trips.',
      ]}
      precautions={['Test fuses only with the supply off.', 'Replace a fuse only with one of the same rating and type.', 'Never bypass a fuse or MCB with wire.', 'Test an RCCB with its T button once a month.']}
      viva={[
        {q: 'Why does an MCB trip faster at 10 × In than at 2 × In?', a: 'High current operates the magnetic (instant) trip. Small overloads operate the slower thermal (bimetal) trip.'},
        {q: 'What does an RCCB protect against?', a: 'Earth leakage and electric shock. It trips when phase and neutral currents differ by about 30 mA.'},
        {q: 'What does HRC mean?', a: 'High Rupturing Capacity: it can safely break very large fault currents.'},
        {q: 'How does a PTC resettable fuse work?', a: 'On overcurrent it heats up and its resistance rises sharply; it resets when it cools.'},
        {q: 'What does C16 on an MCB mean?', a: 'Type C curve (magnetic trip at 5–10 × In), rated current 16 A.'},
      ]}
      steps={[
        {label: 'Name each of the six devices.', hint: 'Read the marking, use the Type list in the table.', done: devs.every((_, k) => nameOk(k))},
        {
          label: 'Continuity test all six devices.',
          hint: `Probes on both terminals, Note reading. Switch MCB and RCCB ON and OFF. Tested: ${devs.filter((_, k) => tested(k)).length}/${devs.length}.`,
          done: devs.every((_, k) => tested(k)),
        },
        {label: 'Mark each device good or defective.', hint: 'A blown fuse reads OL.', done: devs.every((_, k) => condOk(k))},
        {
          label: 'Test panel: load the MCB and note the trip time.',
          hint: `Five levels from 1.5 to 10 × In, incl. an instant trip. Levels: ${trips.length}/5.`,
          done: trips.length >= 5 && trips.some((x) => x.t != null && x.t < 0.1),
        },
        {label: 'Press the RCCB T button.', hint: 'Switch the RCCB ON first.', done: rcdTest},
        {
          label: 'Apply leakage currents to the RCCB.',
          hint: 'Find one level that trips and one that does not.',
          done: rcd.some((x) => x.trip) && rcd.some((x) => !x.trip),
        },
        {label: 'Enter your details and print or save the record.', done: printed},
      ]}
      gu={GU_1_7_60}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench: continuity test">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div>
            <div className={styles.kit}>
              <svg viewBox={`0 0 ${W * 3} ${H * 2}`} role="img" aria-label="Six protective devices with test points">
                {devs.map((d, k) => {
                  const ox = (k % 3) * W;
                  const oy = Math.floor(k / 3) * H;
                  const [x1, y1, x2, y2] = PIN[d.kind];
                  const sw = d.kind === 'mcb' || d.kind === 'rccb';
                  return (
                    <g key={k} transform={`translate(${ox} ${oy})`}>
                      <rect x={4} y={4} width={W - 8} height={H - 8} rx={8} fill="#2c3a44" stroke="#3d4d58" />
                      <text x={14} y={22} style={kitLabel}>
                        {k + 1}
                      </text>
                      <g
                        className={clsx(sw && styles.clickable)}
                        role={sw ? 'button' : undefined}
                        tabIndex={sw ? 0 : undefined}
                        aria-label={sw ? `Device ${k + 1}: ${isOn(k) ? 'ON. Switch off' : 'OFF. Switch on'}` : undefined}
                        onClick={() => sw && setClosed((c) => ({...c, [k]: !isOn(k)}))}
                        onKeyDown={(e) => {
                          if (sw && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            setClosed((c) => ({...c, [k]: !isOn(k)}));
                          }
                        }}>
                        <DevArt d={d} closed={isOn(k)} />
                      </g>
                      <ProbePoint id={`${k}:a`} x={x1} y={y1} probes={probes} label={`Device ${k + 1} terminal 1`} r={4} />
                      <ProbePoint id={`${k}:b`} x={x2} y={y2} probes={probes} label={`Device ${k + 1} terminal 2`} r={4} />
                    </g>
                  );
                })}
              </svg>
            </div>
            <ProbeBar probes={probes} hint="Tap an MCB / RCCB lever to switch it." />
          </div>
          <div style={{display: 'grid', gap: '0.6rem', alignContent: 'start'}}>
            <Multimeter name="Digital multimeter" fn={fn} functions={DEV_FNS} text={text} unit={text && text !== 'OL' ? 'Ω' : ''} placement={on != null ? `Device ${on + 1}` : undefined} onFunction={(f) => (setNote(null), setFn(f))} indicator={beep ? '•)))' : null} />
            <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} onClick={noteIt}>
              Note reading
            </button>
          </div>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table: devices">
        <Table
          head={['No.', 'Device', 'Rating', 'Reading', 'Condition', 'Check']}
          rows={devs.map((d, k) => [
            k + 1,
            <select className={styles.select} aria-label={`Device ${k + 1} name`} value={ans[k]?.name ?? ''} onChange={(e) => set(k, {name: e.target.value})}>
              <option value="">Choose…</option>
              {DEVS.map((x) => (
                <option key={x.kind} value={x.kind}>
                  {x.name}
                </option>
              ))}
            </select>,
            <span className={styles.num}>{d.mark}</span>,
            <span className={styles.num}>{ans[k]?.meas ?? '–'}</span>,
            <select className={styles.select} aria-label={`Device ${k + 1} condition`} value={ans[k]?.cond ?? ''} onChange={(e) => set(k, {cond: e.target.value})}>
              <option value="">Choose…</option>
              <option value="good">Good</option>
              <option value="bad">Defective</option>
            </select>,
            ans[k]?.name && ans[k]?.cond ? <Verdict ok={nameOk(k) && condOk(k)} /> : '–',
          ])}
        />
      </Section>
      <Section title="Test panel: MCB C16 and RCCB 30 mA">
        <div className={styles.twoCol}>
          <div className={styles.card}>
            <b>MCB load test</b> · MCB is <b className={panelMcb ? styles.ok : styles.no}>{panelMcb ? 'ON' : 'TRIPPED'}</b>
            <span className={styles.label}>Load current</span>
            <div className={styles.seg} role="group" aria-label="Load as multiple of rated current">
              {[1, 1.5, 2, 3, 5, 7, 10].map((m) => (
                <button key={m} type="button" aria-pressed={mult === m} onClick={() => setMult(m)}>
                  {m} × In
                </button>
              ))}
            </div>
            <div className={styles.seg} role="group" aria-label="MCB actions" style={{marginTop: '0.5rem'}}>
              <button type="button" onClick={applyLoad}>
                Apply load ({mult * 16} A)
              </button>
              <button type="button" onClick={() => (setPanelMcb(true), setPanelNote(null))}>
                Reset MCB (ON)
              </button>
            </div>
          </div>
          <div className={styles.card}>
            <b>RCCB test</b> · RCCB is <b className={panelRcd ? styles.ok : styles.no}>{panelRcd ? 'ON' : 'TRIPPED'}</b>
            <span className={styles.label}>Leakage to earth</span>
            <div className={styles.seg} role="group" aria-label="Leakage current">
              {[5, 10, 15, 20, 25, 30, 40].map((l) => (
                <button key={l} type="button" aria-pressed={leak === l} onClick={() => setLeak(l)}>
                  {l} mA
                </button>
              ))}
            </div>
            <div className={styles.seg} role="group" aria-label="RCCB actions" style={{marginTop: '0.5rem'}}>
              <button type="button" onClick={applyLeak}>
                Apply leakage
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!panelRcd) return setPanelNote({kind: 'warn', text: 'RCCB is OFF. Switch it on first.'});
                  setPanelRcd(false);
                  setRcdTest(true);
                  setPanelNote({kind: 'good', text: 'T button: RCCB tripped ✓'});
                }}>
                Press T
              </button>
              <button type="button" onClick={() => (setPanelRcd(true), setPanelNote(null))}>
                Reset RCCB (ON)
              </button>
            </div>
          </div>
        </div>
        <NoteBox note={panelNote} />
      </Section>
      <Section title="Observation table: trip tests">
        {trips.length === 0 && rcd.length === 0 ? (
          <Empty>No tests yet.</Empty>
        ) : (
          <div className={styles.twoCol}>
            <Table head={['MCB load', 'Current (A)', 'Trip time']} rows={trips.map((x) => [`${x.m} × In`, x.m * 16, x.t == null ? 'no trip' : x.t < 0.1 ? 'instant (< 0.1 s)' : `${x.t.toFixed(1)} s`])} />
            <Table head={['Leakage (mA)', 'RCCB']} rows={[...(rcdTest ? [['T button', 'tripped']] : []), ...rcd.map((x) => [x.leak, x.trip ? 'tripped' : 'no trip'])]} />
          </div>
        )}
        <ResetKit
          onReset={() => {
            setAns({});
            setTrips([]);
            setRcd([]);
            setRcdTest(false);
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}
