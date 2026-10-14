import React, {useEffect, useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import Multimeter from '../Multimeter';
import useStoredState from '../useStoredState';
import {ProbeBar, ProbePoint, useProbes} from '../Probes';
import {Empty, NoteBox, ResetKit, Section, Table, Verdict, useKitSeed, useRng, type Note} from '../kit';
import styles from '../styles.module.css';

const KEY = '1.4.35';

type Jack = 'VmA' | '10A';
type Fn = 'off' | 'dcv20' | 'acv750' | 'ohm20k' | 'dcma200' | 'dca10' | 'aca10';

const FNS: {fn: Fn; label: string}[] = [
  {fn: 'off', label: 'OFF'},
  {fn: 'dcv20', label: 'DC V 20'},
  {fn: 'acv750', label: 'AC V 750'},
  {fn: 'ohm20k', label: 'Ω 20k'},
  {fn: 'dcma200', label: 'DC mA 200'},
  {fn: 'dca10', label: 'DC A 10'},
  {fn: 'aca10', label: 'AC A 10'},
];
const FN_LABEL = Object.fromEntries(FNS.map((f) => [f.fn, f.label]));
const isV = (f: Fn) => f === 'dcv20' || f === 'acv750';
const isA = (f: Fn) => f === 'dcma200' || f === 'dca10' || f === 'aca10';
const fnAC = (f: Fn) => f === 'acv750' || f === 'aca10';
const needJack = (f: Fn): Jack => (f === 'dca10' || f === 'aca10' ? '10A' : 'VmA');

interface Item {
  id: string;
  name: string;
  kind: 'src' | 'res' | 'gap';
  ac: boolean;
  volts: number;
  ohms?: number;
  amps?: number;
  /** The quantity this item is for, and the function that measures it. */
  quantity: string;
  fn: Fn;
  x: number;
  y: number;
}

function makeItems(rnd: () => number): Item[] {
  const r = (a: number, b: number, dp = 2) => Number((a + rnd() * (b - a)).toFixed(dp));
  return [
    {id: 'bat', name: '9 V battery', kind: 'src', ac: false, volts: r(8.6, 9.4), quantity: 'DC voltage', fn: 'dcv20', x: 0, y: 0},
    {id: 'sock', name: 'Mains socket', kind: 'src', ac: true, volts: Math.round(r(224, 238)), quantity: 'AC voltage', fn: 'acv750', x: 210, y: 0},
    {id: 'res', name: 'Resistor (unpowered)', kind: 'res', ac: false, volts: 0, ohms: Math.round(r(4520, 4880, 0)), quantity: 'Resistance', fn: 'ohm20k', x: 420, y: 0},
    {id: 'led', name: 'LED circuit (9 V DC)', kind: 'gap', ac: false, volts: 9, amps: r(0.016, 0.02, 4), quantity: 'DC current (mA)', fn: 'dcma200', x: 0, y: 140},
    {id: 'lamp', name: 'Lamp circuit (12 V DC)', kind: 'gap', ac: false, volts: 12, amps: r(0.8, 0.86, 3), quantity: 'DC current (A)', fn: 'dca10', x: 210, y: 140},
    {id: 'acl', name: 'Lamp circuit (230 V AC)', kind: 'gap', ac: true, volts: 230, amps: r(0.25, 0.27, 3), quantity: 'AC current', fn: 'aca10', x: 420, y: 140},
  ];
}

type Fault = 'mA fuse blown' | '10 A fuse blown' | 'Meter damaged' | null;

interface Row {
  item: string;
  fn: Fn;
  jack: Jack;
  text: string;
  ok: boolean;
}

/** 1.4.35 Use the multimeter to measure AC V, DC V, AC I, DC I and R. */
export default function MultimeterLab(): React.JSX.Element {
  const [seed, newKit] = useKitSeed(KEY);
  const items = useRng(seed, makeItems);
  const [rows, setRows] = useStoredState<Row[]>(`lab:${KEY}:rows`, []);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [fn, setFn] = useState<Fn>('off');
  const [jack, setJack] = useState<Jack>('VmA');
  const [fault, setFault] = useState<Fault>(null);
  const [note, setNote] = useState<Note>(null);
  const probes = useProbes();

  const [ri, rt] = (probes.red ?? ':').split(':');
  const [bi, bt] = (probes.black ?? ':').split(':');
  const it = ri && ri === bi && rt !== bt ? items.find((x) => x.id === ri) ?? null : null;
  const sign = rt === 'a' ? 1 : -1; // terminal "a" is + / the supply side

  // What the meter does to the item and what it shows.
  let text = '';
  let unit = '';
  let closed = false; // does the meter complete a gap circuit?
  let event: Fault = null;
  if (fault === 'Meter damaged' || fn === 'off') {
    text = '';
  } else if (it) {
    if (isV(fn)) {
      unit = fnAC(fn) ? 'V AC' : 'V DC';
      if (jack === '10A') {
        // Voltage selected but the lead is in the 10 A jack: a dead short.
        if (it.kind === 'src') event = it.ac ? 'Meter damaged' : fault === '10 A fuse blown' ? null : '10 A fuse blown';
        if (it.kind === 'gap') closed = fault !== '10 A fuse blown';
        text = '0.00';
      } else {
        const v = it.kind === 'res' ? 0 : it.volts;
        const shown = fnAC(fn) === it.ac ? v * (it.ac ? 1 : sign) : 0;
        text = fn === 'acv750' ? Math.round(shown).toString() : Math.abs(shown) >= 20 ? 'OL' : shown.toFixed(2);
      }
    } else if (isA(fn)) {
      unit = fnAC(fn) ? 'A AC' : fn === 'dcma200' ? 'mA DC' : 'A DC';
      const blown = (fn === 'dcma200' && fault === 'mA fuse blown') || (fn !== 'dcma200' && fault === '10 A fuse blown');
      if (jack !== needJack(fn) || blown) {
        text = fn === 'dcma200' ? '0.0' : '0.00';
      } else if (it.kind === 'src') {
        event = it.ac ? 'Meter damaged' : fn === 'dcma200' ? 'mA fuse blown' : '10 A fuse blown';
        text = '0.0';
      } else if (it.kind === 'res') {
        text = fn === 'dcma200' ? '0.0' : '0.00';
      } else {
        closed = true;
        const i = fnAC(fn) === it.ac ? it.amps! * (it.ac ? 1 : sign) : 0;
        if (fn === 'dcma200') {
          if (Math.abs(i) > 0.2) event = 'mA fuse blown';
          text = Math.abs(i * 1000) >= 200 ? 'OL' : (i * 1000).toFixed(1);
        } else text = i.toFixed(2);
      }
    } else if (fn === 'ohm20k') {
      unit = 'kΩ';
      if (it.kind === 'res') text = (it.ohms! / 1000).toFixed(2);
      else if (it.ac) event = 'Meter damaged';
      else text = 'Err';
    }
  } else {
    unit = isV(fn) ? (fnAC(fn) ? 'V AC' : 'V DC') : isA(fn) ? (fn === 'dcma200' ? 'mA DC' : fnAC(fn) ? 'A AC' : 'A DC') : 'kΩ';
    text = fn === 'ohm20k' ? 'OL' : '0.00';
  }

  useEffect(() => {
    if (!event || fault === event || fault === 'Meter damaged') return;
    setFault(event);
    setNote({
      kind: 'bad',
      text:
        event === 'Meter damaged' ? (
          <b>Bang! Short circuit on mains. The MCB tripped and the meter is damaged.</b>
        ) : (
          <b>Pop! {event}. Current ranges have almost zero resistance: never put them across a source.</b>
        ),
    });
  }, [event, fault]);

  const record = () => {
    if (!it) return setNote({kind: 'warn', text: 'Probes on both points of one item.'});
    if (fn === 'off' || fault === 'Meter damaged') return setNote({kind: 'warn', text: 'Select a function.'});
    if (text === 'OL' || text === 'Err') return setNote({kind: 'warn', text: `${text}: check function and range.`});
    const ok = fn === it.fn && jack === needJack(fn) && !text.startsWith('-') && Number(text) !== 0;
    setRows((r) => [...r, {item: it.id, fn, jack, text, ok}]);
    setNote(ok ? {kind: 'good', text: `Noted: ${text} ${unit} ✓`} : {kind: 'warn', text: `Noted, but this is not a correct measurement of ${it.quantity}. Check function, jack and polarity.`});
  };

  const right = (id: string) => rows.some((r) => r.item === id && r.ok);
  const lampOn = (id: string) => it?.id === id && closed;

  return (
    <PracticalSheet
      number={KEY}
      title="Use the Multimeter to Measure AC V, DC V, AC I, DC I and R"
      aim="To measure AC and DC voltage, AC and DC current, and resistance with a digital multimeter, choosing the right function, range and input jack."
      apparatus={['Digital multimeter (jacks: COM, VΩmA, 10A)', '9 V battery, mains socket, resistor', 'LED circuit, 12 V lamp circuit, 230 V lamp circuit (each with a test gap)']}
      procedure={[
        'Black lead always in COM.',
        'Voltage and resistance: red lead in VΩmA, probes ACROSS the item.',
        'Current: break the circuit at the gap and put the meter IN SERIES. Red lead in mA (small current) or 10A (large current).',
        'Measure resistance only with the power off.',
      ]}
      precautions={['Check the function AND the jack before touching a circuit.', 'Never connect a current range across a source.', 'Use the 10 A jack when the current may exceed 200 mA.', 'Never use Ω on a live circuit.']}
      viva={[
        {q: 'Why must an ammeter never be connected across a battery?', a: 'Its resistance is nearly zero, so it short-circuits the battery: a huge current flows and the fuse blows.'},
        {q: 'When do you use the 10 A jack?', a: 'When the current is (or may be) more than the mA range, about 200 mA.'},
        {q: 'What does the meter read across an open gap in a live circuit?', a: 'Almost the full supply voltage, because no current flows and nothing drops voltage.'},
        {q: 'Why is resistance measured only with power off?', a: 'The ohmmeter uses its own battery. An external voltage gives a false reading and can damage it.'},
      ]}
      steps={[
        {
          label: 'Measure the 9 V battery: DC V 20, probes across it.',
          hint: 'Red lead in VΩmA, red probe on +. Press Note reading.',
          done: right('bat'),
        },
        {
          label: 'Measure the mains socket: AC V 750, probes across L and N.',
          hint: 'Mains is live. Touch only the two socket points.',
          done: right('sock'),
        },
        {
          label: 'Measure the resistor: Ω 20k.',
          hint: 'The resistor is unpowered. Never use Ω on a live circuit.',
          done: right('res'),
        },
        {
          label: 'Measure the LED circuit current: DC mA 200, meter in the gap.',
          hint: 'Meter in series, red lead in VΩmA.',
          done: right('led'),
        },
        {
          label: 'Measure the 12 V lamp circuit current: DC A 10, red lead in 10A.',
          hint: 'Large current needs the 10A jack and meter in the gap.',
          done: right('lamp'),
        },
        {
          label: 'Measure the 230 V lamp circuit current: AC A 10, red lead in 10A.',
          hint: 'Meter in the gap. Never across the mains.',
          done: right('acl'),
        },
        {label: 'Enter your details and print or save the record.', hint: 'Practical record, below the result.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div>
            <div className={styles.kit}>
              <svg viewBox="0 0 630 280" role="img" aria-label="Six items to measure">
                {items.map((x) => {
                  const a = {x: x.x + 70, y: x.y + 100};
                  const b = {x: x.x + 140, y: x.y + 100};
                  const glow = lampOn(x.id) && x.kind === 'gap';
                  return (
                    <g key={x.id}>
                      <rect x={x.x + 8} y={x.y + 8} width={194} height={124} rx={8} fill="#31414c" stroke="#4d5f6b" />
                      <text x={x.x + 105} y={x.y + 28} textAnchor="middle" className={clsx(styles.kitText, styles.small)}>
                        {x.name}
                      </text>
                      {x.kind === 'src' && !x.ac && <rect x={x.x + 80} y={x.y + 40} width={50} height={36} rx={4} fill="#2d2d2d" stroke="#888" />}
                      {x.kind === 'src' && x.ac && (
                        <g>
                          <rect x={x.x + 80} y={x.y + 38} width={50} height={44} rx={8} fill="#ebe6d8" />
                          <circle cx={x.x + 105} cy={x.y + 50} r={4} fill="#262626" />
                        </g>
                      )}
                      {x.kind === 'res' && (
                        <g>
                          <line x1={a.x} y1={x.y + 58} x2={b.x} y2={x.y + 58} stroke="#aaa" strokeWidth={2} />
                          <rect x={x.x + 85} y={x.y + 50} width={40} height={16} rx={6} fill="#e8d7b0" />
                          <rect x={x.x + 92} y={x.y + 50} width={4} height={16} fill="#e8c21f" />
                          <rect x={x.x + 99} y={x.y + 50} width={4} height={16} fill="#8a3fc2" />
                          <rect x={x.x + 106} y={x.y + 50} width={4} height={16} fill="#d4302a" />
                          <path d={`M${a.x} ${x.y + 58} V${a.y} M${b.x} ${x.y + 58} V${b.y}`} stroke="#aaa" strokeWidth={2} />
                        </g>
                      )}
                      {x.kind === 'gap' && (
                        <g>
                          <path d={`M${a.x} ${a.y} H${x.x + 30} V${x.y + 50} H${x.x + 180} V${a.y} H${b.x}`} className={styles.wire} fill="none" />
                          <circle cx={x.x + 105} cy={x.y + 50} r={12} fill={glow ? '#ffd34d' : '#555'} stroke="#999" />
                          {glow && <circle cx={x.x + 105} cy={x.y + 50} r={22} fill="#ffd34d" opacity={0.3} />}
                          <text x={x.x + 105} y={a.y + 4} textAnchor="middle" className={clsx(styles.kitText, styles.small)}>
                            gap
                          </text>
                        </g>
                      )}
                      {x.kind !== 'gap' && x.kind !== 'res' && (
                        <>
                          <text x={a.x} y={a.y + 24} textAnchor="middle" className={clsx(styles.kitText, styles.small)}>
                            {x.ac ? 'L' : '+'}
                          </text>
                          <text x={b.x} y={b.y + 24} textAnchor="middle" className={clsx(styles.kitText, styles.small)}>
                            {x.ac ? 'N' : '−'}
                          </text>
                        </>
                      )}
                      <ProbePoint id={`${x.id}:a`} x={a.x} y={a.y} probes={probes} label={`${x.name} point 1`} />
                      <ProbePoint id={`${x.id}:b`} x={b.x} y={b.y} probes={probes} label={`${x.name} point 2`} />
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
              functions={FNS}
              text={text}
              unit={fn === 'off' ? '' : unit}
              placement={it?.name}
              onFunction={(f) => {
                setNote(null);
                setFn(f as Fn);
              }}
              fault={fault}
              repairLabel={fault === 'Meter damaged' ? 'New meter' : 'Replace fuse'}
              onRepair={() => {
                setFault(null);
                setNote(null);
              }}
            />
            <div className={clsx(styles.card, styles.noPrint)}>
              <span className={styles.label} style={{marginTop: 0}}>
                Red lead in jack
              </span>
              <div className={styles.seg} role="group" aria-label="Red lead jack">
                <button type="button" aria-pressed={jack === 'VmA'} onClick={() => setJack('VmA')}>
                  VΩmA
                </button>
                <button type="button" aria-pressed={jack === '10A'} onClick={() => setJack('10A')}>
                  10A
                </button>
              </div>
              <span className={styles.muted}>Black lead: COM</span>
            </div>
            <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} onClick={record}>
              Note reading
            </button>
          </div>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {rows.length === 0 ? (
          <Empty>No readings yet.</Empty>
        ) : (
          <Table
            head={['S. No.', 'Item', 'Function', 'Red lead jack', 'Reading', 'Check']}
            rows={rows.map((r, k) => {
              const x = items.find((i) => i.id === r.item)!;
              return [k + 1, x.name, FN_LABEL[r.fn], r.jack === 'VmA' ? 'VΩmA' : '10A', <span className={styles.num}>{r.text}</span>, <Verdict ok={r.ok} />];
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
