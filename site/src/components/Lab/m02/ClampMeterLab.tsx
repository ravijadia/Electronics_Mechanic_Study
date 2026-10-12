import React, {useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import Multimeter from '../Multimeter';
import useStoredState from '../useStoredState';
import {Empty, NoteBox, ResetKit, Section, Table, useKitSeed, useRng, type Note} from '../kit';
import styles from '../styles.module.css';

const KEY = '1.2.27';

const LOADS = [
  {id: 'lamp', name: 'Lamp 100 W', p: 100, pf: 1},
  {id: 'fan', name: 'Fan 60 W', p: 60, pf: 0.85},
  {id: 'iron', name: 'Iron 750 W', p: 750, pf: 1},
  {id: 'heater', name: 'Heater 1500 W', p: 1500, pf: 1},
];

type Pos = 'none' | 'cable' | 'phase' | 'neutral';
const POS_LABEL: Record<Pos, string> = {
  none: 'Not clamped',
  cable: 'Around the whole cable',
  phase: 'Around the phase wire only',
  neutral: 'Around the neutral wire only',
};

const FNS = [
  {fn: 'off', label: 'OFF'},
  {fn: 'aca2', label: 'AC A 2'},
  {fn: 'aca20', label: 'AC A 20'},
  {fn: 'aca200', label: 'AC A 200'},
  {fn: 'acv600', label: 'AC V 600'},
];
const FN_LABEL = Object.fromEntries(FNS.map((f) => [f.fn, f.label]));

interface Row {
  loads: string[];
  pos: Pos;
  fn: string;
  text: string;
}

/** 1.2.27 Measure voltage and current using a clamp meter. */
export default function ClampMeterLab(): React.JSX.Element {
  const [seed, newKit] = useKitSeed(KEY);
  const volts = useRng(seed, (rnd) => Math.round(226 + rnd() * 10));
  const [on, setOn] = useState<string[]>([]);
  const [pos, setPos] = useState<Pos>('none');
  const [fn, setFn] = useState('off');
  const [leads, setLeads] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const [rows, setRows] = useStoredState<Row[]>(`lab:${KEY}:rows`, []);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);

  const amps = LOADS.filter((l) => on.includes(l.id)).reduce((a, l) => a + l.p / (volts * l.pf), 0);
  const sensed = pos === 'phase' || pos === 'neutral' ? amps : pos === 'cable' && amps > 0 ? 0.004 : 0;

  let text = '';
  let unit = '';
  if (fn.startsWith('aca')) {
    unit = 'A AC';
    const max = fn === 'aca2' ? 2 : fn === 'aca20' ? 20 : 200;
    const dp = fn === 'aca2' ? 3 : fn === 'aca20' ? 2 : 1;
    text = sensed >= max ? 'OL' : sensed.toFixed(dp);
  } else if (fn === 'acv600') {
    unit = 'V AC';
    text = leads ? String(volts) : '0';
  }

  const toggle = (id: string) => {
    setNote(null);
    setOn((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const record = () => {
    if (fn === 'off') return setNote({kind: 'warn', text: 'Select a function.'});
    if (text === 'OL') return setNote({kind: 'warn', text: 'OL: select a higher range.'});
    if (fn.startsWith('aca') && pos === 'none') return setNote({kind: 'warn', text: 'Clamp a conductor first.'});
    if (fn === 'acv600' && !leads) return setNote({kind: 'warn', text: 'Put the test leads on the socket.'});
    if (fn.startsWith('aca') && on.length === 0) return setNote({kind: 'warn', text: 'Switch on a load.'});
    setRows((r) => [...r, {loads: fn === 'acv600' ? [] : [...on], pos: fn === 'acv600' ? 'none' : pos, fn, text}]);
    if (fn.startsWith('aca') && pos === 'cable')
      setNote({kind: 'info', text: 'Noted: ≈ 0 A. Phase and neutral currents cancel.'});
    else setNote({kind: 'good', text: `Noted: ${text} ${unit}.`});
  };

  const single = (id: string) =>
    rows.some((r) => r.fn.startsWith('aca') && (r.pos === 'phase' || r.pos === 'neutral') && r.loads.length === 1 && r.loads[0] === id);
  const calc = (ids: string[]) => ids.reduce((a, id) => a + LOADS.find((l) => l.id === id)!.p, 0) / volts;

  // geometry
  const clampAt = pos === 'cable' ? {x: 160, y: 120} : pos === 'phase' ? {x: 300, y: 92} : pos === 'neutral' ? {x: 300, y: 148} : null;
  const posBtn = (p: Pos, x: number, y: number, label: string) => (
    <g
      className={styles.clickable}
      role="button"
      tabIndex={0}
      aria-label={`Clamp ${label}`}
      onClick={() => setPos(p)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setPos(p);
        }
      }}>
      <rect x={x - 34} y={y - 18} width={68} height={36} fill="transparent" />
    </g>
  );

  return (
    <PracticalSheet
      number={KEY}
      title="Measure Voltage and Current Using a Clamp Meter"
      aim="To measure the current drawn by different loads with a clamp meter without breaking the circuit, and to measure the supply voltage."
      apparatus={['Digital clamp meter with test leads', 'Loads: 100 W lamp, 60 W fan, 750 W iron, 1500 W heater', 'Line splitter (separates phase and neutral of a flexible cable)']}
      procedure={[
        'Select AC A on the clamp meter, starting from the highest range.',
        'Open the jaws and clamp them around ONE conductor only (phase or neutral) at the line splitter.',
        'Switch on one load at a time and note the current. Then switch on all loads together.',
        'Clamp the whole cable (both conductors) and note what happens.',
        'Plug in the test leads, select AC V, and measure the socket voltage.',
        'Compare each reading with the calculated current I = P / V.',
      ]}
      precautions={[
        'Clamp only one conductor at a time.',
        'Keep the jaws fully closed, and the conductor in the centre of the jaws.',
        'Remove the test leads when measuring current with the jaws.',
        'Start on the highest range when the current is not known.',
      ]}
      viva={[
        {q: 'Why does the clamp meter read zero around the whole cable?', a: 'Phase and neutral carry the same current in opposite directions. Their magnetic fields cancel, so the jaws sense nothing.'},
        {q: 'What is the main advantage of a clamp meter?', a: 'Current is measured without breaking or disconnecting the circuit.'},
        {q: 'Why is the fan’s measured current a little more than P/V?', a: 'A fan motor has a power factor below 1, so I = P / (V × pf).'},
        {q: 'On what principle does an AC clamp meter work?', a: 'The jaws form the core of a current transformer. The conductor is a one-turn primary.'},
      ]}
      tasks={[
        {label: 'Measure the current of each load separately (one conductor clamped).', done: LOADS.every((l) => single(l.id))},
        {label: 'Measure the current with all loads on together.', done: rows.some((r) => r.fn.startsWith('aca') && r.pos !== 'cable' && r.loads.length === LOADS.length)},
        {label: 'Clamp the whole cable and note the reading.', done: rows.some((r) => r.pos === 'cable')},
        {label: 'Measure the supply voltage with the test leads.', done: rows.some((r) => r.fn === 'acv600')},
        {label: 'Fill in your details and print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div>
            <div className={styles.kit}>
              <svg viewBox="0 0 660 240" role="img" aria-label="Socket, flexible cable, line splitter with separate phase and neutral, and a load board">
                {/* socket */}
                <rect x="20" y="80" width="80" height="80" rx="10" fill="#ebe6d8" />
                <circle cx="60" cy="104" r="6" fill="#262626" />
                <circle cx="48" cy="136" r="4.5" fill="#262626" />
                <circle cx="72" cy="136" r="4.5" fill="#262626" />
                <text x="60" y="176" textAnchor="middle" className={clsx(styles.kitText, styles.small)}>
                  {leads ? 'Test leads in socket' : '230 V socket'}
                </text>
                {/* cable */}
                <path d="M100 120 H220" stroke="#8c8c8c" strokeWidth="14" strokeLinecap="round" />
                <path d="M220 120 C 240 120, 240 92, 260 92 H340 C 360 92, 360 120, 380 120" stroke="#8a4b20" strokeWidth="5" fill="none" />
                <path d="M220 120 C 240 120, 240 148, 260 148 H340 C 360 148, 360 120, 380 120" stroke="#2b5fd1" strokeWidth="5" fill="none" />
                <path d="M380 120 H450" stroke="#8c8c8c" strokeWidth="14" strokeLinecap="round" />
                <text x="300" y="80" textAnchor="middle" className={clsx(styles.kitText, styles.small)}>
                  phase
                </text>
                <text x="300" y="172" textAnchor="middle" className={clsx(styles.kitText, styles.small)}>
                  neutral
                </text>
                <text x="300" y="206" textAnchor="middle" className={clsx(styles.kitText, styles.small)}>
                  line splitter
                </text>
                {posBtn('cable', 160, 120, 'around the whole cable')}
                {posBtn('phase', 300, 92, 'around the phase wire')}
                {posBtn('neutral', 300, 148, 'around the neutral wire')}
                {/* clamp jaws */}
                {clampAt && (
                  <g pointerEvents="none">
                    <ellipse cx={clampAt.x} cy={clampAt.y} rx="18" ry="22" fill="none" stroke="#f2c230" strokeWidth="7" />
                    <rect x={clampAt.x - 12} y={clampAt.y + 20} width="24" height="34" rx="4" fill="#f2c230" />
                  </g>
                )}
                {/* load board */}
                <rect x="450" y="20" width="195" height="200" rx="10" fill="#31414c" stroke="#4d5f6b" />
                {LOADS.map((l, k) => {
                  const y = 46 + k * 46;
                  const isOn = on.includes(l.id);
                  return (
                    <g
                      key={l.id}
                      className={styles.clickable}
                      role="switch"
                      aria-checked={isOn}
                      tabIndex={0}
                      aria-label={`${l.name}: ${isOn ? 'on' : 'off'}`}
                      onClick={() => toggle(l.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggle(l.id);
                        }
                      }}>
                      <rect x="462" y={y - 18} width="172" height="36" rx="6" fill="transparent" />
                      <rect x="466" y={y - 10} width="30" height="20" rx="10" fill={isOn ? '#3fbf7f' : '#666'} />
                      <circle cx={isOn ? 486 : 476} cy={y} r="7" fill="#fff" />
                      <text x="506" y={y + 4} className={styles.kitText}>
                        {l.name}
                      </text>
                      <circle cx="622" cy={y} r="6" fill={isOn ? '#ffcf3f' : '#555'} />
                    </g>
                  );
                })}
              </svg>
            </div>
            <div className={clsx(styles.row, styles.noPrint)} style={{marginTop: '0.6rem'}}>
              <span className={styles.label} style={{margin: 0}}>
                Clamp:
              </span>
              <div className={styles.seg} role="group" aria-label="Clamp position">
                {(['none', 'phase', 'neutral', 'cable'] as Pos[]).map((p) => (
                  <button key={p} type="button" aria-pressed={pos === p} onClick={() => setPos(p)}>
                    {POS_LABEL[p]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div style={{display: 'grid', gap: '0.7rem', alignContent: 'start'}}>
            <Multimeter
              name="Clamp meter"
              fn={fn}
              functions={FNS}
              text={text}
              unit={unit}
              placement={fn === 'acv600' ? (leads ? 'Leads on socket' : 'Leads not connected') : POS_LABEL[pos]}
              onFunction={(f) => {
                setNote(null);
                setFn(f);
              }}
            />
            <div className={clsx(styles.row, styles.noPrint)}>
              <button type="button" className={styles.btn} aria-pressed={leads} onClick={() => setLeads((x) => !x)}>
                Test leads: {leads ? 'on socket' : 'removed'}
              </button>
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
            head={['S. No.', 'Loads on', 'Clamped', 'Function', 'Reading', 'Calculated I = P / V', '']}
            rows={rows.map((r, k) => [
              k + 1,
              r.fn === 'acv600' ? '–' : r.loads.map((id) => LOADS.find((l) => l.id === id)!.name).join(', '),
              r.fn === 'acv600' ? 'Test leads' : POS_LABEL[r.pos],
              FN_LABEL[r.fn],
              <span className={styles.num}>
                {r.text} {r.fn === 'acv600' ? 'V' : 'A'}
              </span>,
              r.fn === 'acv600' ? '–' : r.pos === 'cable' ? '(net current 0)' : <span className={styles.num}>{calc(r.loads).toFixed(2)} A</span>,
              <button type="button" className={clsx(styles.iconBtn, styles.noPrint)} aria-label={`Delete reading ${k + 1}`} onClick={() => setRows((x) => x.filter((_, j) => j !== k))}>
                ✕
              </button>,
            ])}
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
