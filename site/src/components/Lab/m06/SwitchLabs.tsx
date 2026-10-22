import React, {useEffect, useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import {GU_1_6_48, GU_1_6_49} from './gu';
import useStoredState from '../useStoredState';
import {ResetKit, Section, Table, Verdict, shuffle, useKitSeed, useRng} from '../kit';
import styles from '../styles.module.css';

const INK = '#d9dee2';
const LIT = '#ffd34d';

// ---------------------------------------------------------------------------
// Switch drawings
// ---------------------------------------------------------------------------

type Kind = 'toggle' | 'pushNO' | 'pushNC' | 'tumbler' | 'piano';

interface SwitchDef {
  id: string;
  name: string;
  kind: Kind;
  poles: number;
  throws: number;
}

const SWITCHES: SwitchDef[] = [
  {id: 'spst', name: 'Toggle switch (SPST)', kind: 'toggle', poles: 1, throws: 1},
  {id: 'spdt', name: 'Toggle switch (SPDT)', kind: 'toggle', poles: 1, throws: 2},
  {id: 'dpst', name: 'Toggle switch (DPST)', kind: 'toggle', poles: 2, throws: 1},
  {id: 'dpdt', name: 'Toggle switch (DPDT)', kind: 'toggle', poles: 2, throws: 2},
  {id: 'no', name: 'Push button (NO)', kind: 'pushNO', poles: 1, throws: 1},
  {id: 'nc', name: 'Push button (NC)', kind: 'pushNC', poles: 1, throws: 1},
  {id: 'tumbler', name: 'Tumbler switch (one-way)', kind: 'tumbler', poles: 1, throws: 1},
  {id: 'piano', name: 'Piano (DIP) switch, 4-way', kind: 'piano', poles: 4, throws: 1},
];

/** Which output of each pole is connected. -1 = open. */
function outputs(d: SwitchDef, on: boolean, keys: boolean[]): number[] {
  if (d.kind === 'piano') return keys.map((k) => (k ? 0 : -1));
  const closed = d.kind === 'pushNC' ? !on : on;
  return Array.from({length: d.poles}, () => (d.throws === 2 ? (on ? 1 : 0) : closed ? 0 : -1));
}

function Body({d, on, keys}: {d: SwitchDef; on: boolean; keys: boolean[]}): React.JSX.Element {
  if (d.kind === 'toggle')
    return (
      <g>
        <rect x="60" y="34" width="80" height="30" rx="4" fill="#3a3f45" />
        <circle cx="100" cy="34" r="10" fill="#b9c0c5" />
        <line x1="100" y1="34" x2={on ? 116 : 84} y2="6" stroke="#e1e4e7" strokeWidth="7" strokeLinecap="round" />
      </g>
    );
  if (d.kind === 'pushNO' || d.kind === 'pushNC')
    return (
      <g>
        <rect x="70" y="40" width="60" height="24" rx="4" fill="#3a3f45" />
        <circle cx="100" cy={on ? 36 : 30} r="16" fill={d.kind === 'pushNO' ? '#2f9a3c' : '#d4302a'} stroke="#222" />
      </g>
    );
  if (d.kind === 'tumbler')
    return (
      <g>
        <rect x="70" y="6" width="60" height="58" rx="6" fill="#f2f0e8" stroke="#aaa" />
        <rect x="92" y={on ? 18 : 30} width="16" height="22" rx="4" fill="#c9c4b4" stroke="#888" />
      </g>
    );
  return (
    <g>
      <rect x="40" y="18" width="120" height="40" rx="3" fill="#2b5fd1" />
      {keys.map((k, i) => (
        <g key={i}>
          <rect x={52 + i * 26} y="24" width="16" height="28" rx="2" fill="#1b2a55" />
          <rect x={52 + i * 26} y={k ? 24 : 38} width="16" height="14" rx="2" fill="#f2f2f2" />
          <text x={60 + i * 26} y="70" textAnchor="middle" style={{fill: INK, fontSize: 9}}>
            {i + 1}
          </text>
        </g>
      ))}
    </g>
  );
}

function Symbol({d, outs, on}: {d: SwitchDef; outs: number[]; on: boolean}): React.JSX.Element {
  if (d.kind === 'piano')
    return (
      <g>
        {outs.map((o, i) => {
          const x = 22 + i * 44;
          return (
            <g key={i}>
              <line x1={x} y1="40" x2={x} y2="50" stroke={INK} strokeWidth="2" />
              <circle cx={x} cy="50" r="2.5" fill={INK} />
              <line x1={x} y1="50" x2={o === 0 ? x : x + 14} y2={o === 0 ? 84 : 80} stroke={INK} strokeWidth="2" />
              <circle cx={x} cy="86" r="2.5" fill={INK} />
              <line x1={x} y1="86" x2={x} y2="96" stroke={INK} strokeWidth="2" />
              <circle cx={x} cy="104" r="5" fill={o === 0 ? LIT : '#555'} />
            </g>
          );
        })}
      </g>
    );
  if (d.kind === 'pushNO' || d.kind === 'pushNC') {
    const closed = outs[0] === 0;
    const y = 60;
    return (
      <g>
        <line x1="10" y1={y} x2="60" y2={y} stroke={INK} strokeWidth="2" />
        <line x1="120" y1={y} x2="150" y2={y} stroke={INK} strokeWidth="2" />
        <circle cx="60" cy={y} r="3" fill={INK} />
        <circle cx="120" cy={y} r="3" fill={INK} />
        <line x1="54" y1={d.kind === 'pushNO' ? (closed ? y - 3 : y - 14) : closed ? y + 3 : y + 14} x2="126" y2={d.kind === 'pushNO' ? (closed ? y - 3 : y - 14) : closed ? y + 3 : y + 14} stroke={INK} strokeWidth="3" />
        <line x1="90" y1={d.kind === 'pushNO' ? (closed ? y - 3 : y - 14) : closed ? y + 3 : y + 14} x2="90" y2={d.kind === 'pushNO' ? y - 34 : y - 34} stroke={INK} strokeWidth="2" strokeDasharray={d.kind === 'pushNC' ? '3 3' : undefined} />
        <line x1="78" y1={y - 34} x2="102" y2={y - 34} stroke={INK} strokeWidth="2" />
        <circle cx="168" cy={y} r="7" fill={closed ? LIT : '#555'} />
        <text x="100" y={y + 36} textAnchor="middle" style={{fill: INK, fontSize: 10}}>
          {on ? 'pressed' : 'released'}
        </text>
      </g>
    );
  }
  const rows = Array.from({length: d.poles}, (_, i) => (d.poles === 1 ? 60 : 36 + i * 50));
  return (
    <g>
      {rows.map((y, i) => {
        const o = outs[i];
        const tipY = d.throws === 2 ? (o === 1 ? y + 14 : y - 14) : o === 0 ? y : y - 22;
        return (
          <g key={i}>
            <line x1="10" y1={y} x2="45" y2={y} stroke={INK} strokeWidth="2" />
            <circle cx="45" cy={y} r="3" fill={INK} />
            <line x1="45" y1={y} x2={d.throws === 1 && o !== 0 ? 108 : 115} y2={tipY} stroke={INK} strokeWidth="2.5" />
            {(d.throws === 2 ? [y - 14, y + 14] : [y]).map((cy, j) => (
              <g key={j}>
                <circle cx="120" cy={cy} r="3" fill={INK} />
                <line x1="120" y1={cy} x2="155" y2={cy} stroke={INK} strokeWidth="2" />
                <circle cx="168" cy={cy} r="6" fill={o === j ? LIT : '#555'} />
              </g>
            ))}
          </g>
        );
      })}
      {d.poles === 2 && <line x1="80" y1={rows[0] + (d.throws === 2 ? 0 : -6)} x2="80" y2={rows[1] + (d.throws === 2 ? 0 : -6)} stroke={INK} strokeWidth="1.5" strokeDasharray="4 3" />}
    </g>
  );
}

function SwitchCard({d, n, children}: {d: SwitchDef; n: number; children?: React.ReactNode}): React.JSX.Element {
  const [on, setOn] = useState(false);
  const [keys, setKeys] = useState([true, false, true, false]);
  const push = d.kind === 'pushNO' || d.kind === 'pushNC';
  const outs = outputs(d, on, keys);
  const act = () => {
    if (d.kind === 'piano') return;
    if (!push) setOn((x) => !x);
  };
  return (
    <div className={styles.card} style={{padding: '0.5rem'}}>
      <div className={styles.kit} style={{padding: 0}}>
        <svg viewBox="0 0 200 74" role="img" aria-label={`Switch ${n}`}>
          <g
            className={styles.clickable}
            role="button"
            tabIndex={0}
            aria-label={push ? `Switch ${n}: press and hold` : `Switch ${n}: operate`}
            onClick={(e) => {
              if (d.kind === 'piano') {
                const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                const x = ((e.clientX - box.left) / box.width) * 200;
                const i = Math.floor((x - 48) / 26);
                if (i >= 0 && i < 4) setKeys((k) => k.map((v, j) => (j === i ? !v : v)));
              } else act();
            }}
            onPointerDown={() => push && setOn(true)}
            onPointerUp={() => push && setOn(false)}
            onPointerLeave={() => push && setOn(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (push) setOn(true);
                else act();
              }
            }}
            onKeyUp={() => push && setOn(false)}>
            <rect width="200" height="74" fill="transparent" />
            <Body d={d} on={on} keys={keys} />
          </g>
        </svg>
        <svg viewBox="0 0 200 120" aria-hidden="true">
          <Symbol d={d} outs={outs} on={on} />
        </svg>
      </div>
      <div className={styles.muted} style={{textAlign: 'center', margin: '0.3rem 0'}}>
        Switch {n} · {push ? 'press and hold' : d.kind === 'piano' ? 'tap a key' : 'tap to operate'}
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1.6.48 Identify and use SPST, SPDT, DPST, DPDT, push button, tumbler, piano switches
// ---------------------------------------------------------------------------

export function SwitchesLab(): React.JSX.Element {
  const KEY = '1.6.48';
  const [seed, newKit] = useKitSeed(KEY);
  const order = useRng(seed, (rnd) => shuffle(SWITCHES, rnd));
  const [ans, setAns] = useStoredState<Record<string, {name?: string; p?: string; t?: string}>>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const ok = (d: SwitchDef) => {
    const a = ans[d.id] ?? {};
    return a.name === d.id && Number(a.p) === d.poles && Number(a.t) === d.throws;
  };

  return (
    <PracticalSheet
      number="1.6.48"
      title="Identify and Use Different Types of Switches"
      aim="To identify SPST, SPDT, DPST, DPDT, push-button, tumbler and piano switches, and find their number of poles and throws by operating them."
      apparatus={['Eight switches (below), each wired to indicator lamps']}
      procedure={['Operate each switch and watch which lamps light.', 'Poles = separate circuits the switch controls at once. Throws = outputs each pole can connect to.', 'Name each switch and write its poles and throws.']}
      precautions={['Check the current and voltage rating before using a switch.', 'Do not operate switches with wet hands.']}
      viva={[
        {q: 'What do SPDT and DPDT mean?', a: 'Single-pole double-throw: one circuit, two outputs. Double-pole double-throw: two circuits switched together, each with two outputs.'},
        {q: 'Difference between NO and NC push buttons?', a: 'NO (normally open) closes only while pressed. NC (normally closed) opens only while pressed.'},
        {q: 'Where is a DPDT switch used?', a: 'For example, to reverse a DC motor, or to change over between two supplies.'},
      ]}
      steps={[
        {
          label: 'Operate each switch and watch which lamps light.',
          hint: 'Tap toggles, press and hold push buttons, tap piano keys.',
          done: Object.keys(ans).length > 0,
        },
        {
          label: `Choose the name of each switch. Correct: ${SWITCHES.filter((d) => ans[d.id]?.name === d.id).length}/${SWITCHES.length}`,
          hint: 'Use the Name drop-down in the table.',
          done: SWITCHES.every((d) => ans[d.id]?.name === d.id),
        },
        {
          label: `Type the poles and throws of each switch. Correct: ${SWITCHES.filter((d) => Number(ans[d.id]?.p) === d.poles && Number(ans[d.id]?.t) === d.throws).length}/${SWITCHES.length}`,
          hint: 'Poles = circuits switched together. Throws = outputs per pole.',
          done: SWITCHES.every((d) => Number(ans[d.id]?.p) === d.poles && Number(ans[d.id]?.t) === d.throws),
        },
        {label: 'Enter your details and print or save the record.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_6_48}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.meterGrid} style={{gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'}}>
          {order.map((d, k) => (
            <SwitchCard key={d.id} d={d} n={k + 1} />
          ))}
        </div>
      </Section>
      <Section title="Observation table">
        <Table
          head={['Switch', 'Name', 'Poles', 'Throws', 'Check']}
          rows={order.map((d, k) => {
            const a = ans[d.id] ?? {};
            const set = (p: object) => setAns((x) => ({...x, [d.id]: {...x[d.id], ...p}}));
            return [
              k + 1,
              <select className={styles.select} aria-label={`Switch ${k + 1} name`} value={a.name ?? ''} onChange={(e) => set({name: e.target.value})}>
                <option value="">Choose…</option>
                {SWITCHES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>,
              <input className={styles.input} style={{maxWidth: '4rem'}} inputMode="numeric" aria-label={`Switch ${k + 1} poles`} value={a.p ?? ''} onChange={(e) => set({p: e.target.value})} />,
              <input className={styles.input} style={{maxWidth: '4rem'}} inputMode="numeric" aria-label={`Switch ${k + 1} throws`} value={a.t ?? ''} onChange={(e) => set({t: e.target.value})} />,
              a.name && a.p && a.t ? <Verdict ok={ok(d)} /> : '–',
            ];
          })}
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
// 1.6.49 Make a panel board using different switches for a given application
// ---------------------------------------------------------------------------

const CHOICES = ['One-way switch (SPST)', 'Two-way switch (SPDT) × 2', 'DPDT switch', 'Push button (NO)', 'Push button (NC)'];
const APPS: {id: string; job: string; right: string; why: string}[] = [
  {id: 'room', job: 'Light one lamp from one place', right: 'One-way switch (SPST)', why: 'One circuit, on or off.'},
  {id: 'stair', job: 'Staircase lamp, controlled from top and bottom', right: 'Two-way switch (SPDT) × 2', why: 'Either switch must be able to change the lamp.'},
  {id: 'motor', job: 'Run a DC motor forward and in reverse', right: 'DPDT switch', why: 'Both motor leads must swap at the same time.'},
  {id: 'bell', job: 'Calling bell at the door', right: 'Push button (NO)', why: 'The bell must ring only while the button is pressed.'},
];

type Node = 'P' | 'Acom' | 'AL1' | 'AL2' | 'Bcom' | 'BL1' | 'BL2' | 'Lamp' | 'N';
const WIRES: {from: Node; label: string; options: Node[]}[] = [
  {from: 'P', label: 'Phase goes to', options: ['Acom', 'AL1', 'Lamp']},
  {from: 'AL1', label: 'Switch A, L1 goes to', options: ['BL1', 'Bcom', 'Lamp']},
  {from: 'AL2', label: 'Switch A, L2 goes to', options: ['BL2', 'Bcom', 'N']},
  {from: 'Bcom', label: 'Switch B, common goes to', options: ['Lamp', 'P', 'Acom']},
];
const NODE_NAME: Record<Node, string> = {P: 'Phase', Acom: 'Switch A common', AL1: 'Switch A L1', AL2: 'Switch A L2', Bcom: 'Switch B common', BL1: 'Switch B L1', BL2: 'Switch B L2', Lamp: 'Lamp', N: 'Neutral'};

function lampLit(wires: Record<string, Node | ''>, a: number, b: number): boolean {
  const edges: [Node, Node][] = [];
  for (const w of WIRES) {
    const to = wires[w.from];
    if (to) edges.push([w.from, to]);
  }
  edges.push(['Acom', a ? 'AL2' : 'AL1']);
  edges.push(['Bcom', b ? 'BL2' : 'BL1']);
  const seen = new Set<Node>(['P']);
  let grew = true;
  while (grew) {
    grew = false;
    for (const [x, y] of edges) {
      if (seen.has(x) && !seen.has(y)) (seen.add(y), (grew = true));
      if (seen.has(y) && !seen.has(x)) (seen.add(x), (grew = true));
    }
  }
  // A path from phase to the lamp that does not also short to neutral.
  return seen.has('Lamp') && !seen.has('N');
}

export function PanelBoardLab(): React.JSX.Element {
  const KEY = '1.6.49';
  const [pick, setPick] = useStoredState<Record<string, string>>(`lab:${KEY}:pick`, {});
  const [wires, setWires] = useStoredState<Record<string, Node | ''>>(`lab:${KEY}:wires`, {});
  const [combos, setCombos] = useStoredState<string[]>(`lab:${KEY}:combos`, []);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const [motor, setMotor] = useState<'off' | 'fwd' | 'rev'>('off');
  const [bell, setBell] = useState(false);
  const [room, setRoom] = useState(false);

  const stairOk = pick.stair === 'Two-way switch (SPDT) × 2';
  const lit = stairOk && lampLit(wires, a, b);
  const wiringOk = [0, 1].every((x) => [0, 1].every((y) => lampLit(wires, x, y) === (x === y)));
  useEffect(() => {
    if (!stairOk || !wiringOk) return;
    const key = `${a}${b}`;
    if (!combos.includes(key)) setCombos((c) => [...c, key]);
  }, [a, b, stairOk, wiringOk, combos, setCombos]);

  const chosen = (id: string) => pick[id] === APPS.find((x) => x.id === id)!.right;

  return (
    <PracticalSheet
      number="1.6.49"
      title="Make a Panel Board Using Different Switches for Given Applications"
      aim="To choose the correct type of switch for different applications, wire a two-way (staircase) circuit, and test each on a panel board."
      apparatus={['Panel board, one-way and two-way switches, DPDT switch, push button', 'Lamp, DC motor, bell, wires']}
      procedure={['For each job, choose the switch.', 'Wire the staircase circuit using the two-way switches.', 'Test each circuit, and all four positions of the staircase switches.']}
      precautions={['Switch off the supply while wiring.', 'Switches always go in the phase wire, never the neutral.', 'Tighten every terminal.']}
      viva={[
        {q: 'Why must a switch be in the phase wire?', a: 'When the switch is off, the lamp holder is then dead and safe to touch.'},
        {q: 'In staircase wiring, what connects the two switches?', a: 'Two “traveller” wires, L1 to L1 and L2 to L2.'},
        {q: 'How does a DPDT switch reverse a DC motor?', a: 'It swaps the + and − connections to the motor, so the current through it reverses.'},
      ]}
      steps={[
        {
          label: `Choose the right switch for each of the four jobs. Correct: ${APPS.filter((x) => chosen(x.id)).length}/${APPS.length}`,
          hint: 'The reason appears under each choice.',
          done: APPS.every((x) => chosen(x.id)),
        },
        {
          label: 'Switch off, then set all four staircase connections.',
          hint: 'Switches go in the phase wire. Travellers join L1 to L1 and L2 to L2.',
          done: stairOk && WIRES.every((w) => !!wires[w.from]),
        },
        {label: 'Make the lamp follow both staircase switches.', hint: 'Fix any connection marked ✗.', done: stairOk && wiringOk},
        {
          label: `Test all four positions of switches A and B. Positions: ${combos.length}/4`,
          hint: 'Press Switch A and Switch B to change position.',
          done: combos.length === 4,
        },
        {label: 'Enter your details and print or save the record.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_6_49}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.meterGrid} style={{gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))'}}>
          {APPS.map((app) => (
            <div key={app.id} className={styles.card}>
              <b>{app.job}</b>
              <label className={styles.field} style={{marginTop: '0.4rem'}}>
                Switch
                <select className={styles.select} value={pick[app.id] ?? ''} onChange={(e) => setPick((x) => ({...x, [app.id]: e.target.value}))}>
                  <option value="">Choose…</option>
                  {CHOICES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              {pick[app.id] && (
                <div style={{margin: '0.4rem 0'}}>
                  <Verdict ok={chosen(app.id)} yes={`✓ ${app.why}`} no={`✗ ${app.why}`} />
                </div>
              )}
              {chosen(app.id) && app.id === 'room' && (
                <div className={styles.row}>
                  <button type="button" className={styles.btn} aria-pressed={room} onClick={() => setRoom((x) => !x)}>
                    Switch {room ? 'ON' : 'OFF'}
                  </button>
                  <span className={clsx(styles.lampDot, room && styles.lampOn)} aria-label={room ? 'Lamp on' : 'Lamp off'} />
                </div>
              )}
              {chosen(app.id) && app.id === 'motor' && (
                <div className={styles.row}>
                  <div className={styles.seg} role="group" aria-label="DPDT position">
                    {(['fwd', 'off', 'rev'] as const).map((m) => (
                      <button key={m} type="button" aria-pressed={motor === m} onClick={() => setMotor(m)}>
                        {m === 'fwd' ? 'Up' : m === 'off' ? 'Centre' : 'Down'}
                      </button>
                    ))}
                  </div>
                  <span className={styles.muted}>Motor: {motor === 'fwd' ? '⟳ forward' : motor === 'rev' ? '⟲ reverse' : 'stopped'}</span>
                </div>
              )}
              {chosen(app.id) && app.id === 'bell' && (
                <div className={styles.row}>
                  <button
                    type="button"
                    className={styles.btn}
                    onPointerDown={() => setBell(true)}
                    onPointerUp={() => setBell(false)}
                    onPointerLeave={() => setBell(false)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setBell(true)}
                    onKeyUp={() => setBell(false)}>
                    Press and hold
                  </button>
                  <span className={styles.muted}>{bell ? '🔔 Ringing' : 'Silent'}</span>
                </div>
              )}
              {app.id === 'stair' && stairOk && (
                <div style={{display: 'grid', gap: '0.4rem', marginTop: '0.3rem'}}>
                  {WIRES.map((w) => (
                    <label key={w.from} className={styles.field}>
                      {w.label}
                      <select className={styles.select} value={wires[w.from] ?? ''} onChange={(e) => setWires((x) => ({...x, [w.from]: e.target.value as Node}))}>
                        <option value="">Choose…</option>
                        {w.options.map((o) => (
                          <option key={o} value={o}>
                            {NODE_NAME[o]}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                  <span className={styles.muted}>Lamp’s other end is wired to neutral.</span>
                  <div className={styles.row}>
                    <button type="button" className={styles.btn} onClick={() => setA((x) => 1 - x)}>
                      Switch A: {a ? 'L2' : 'L1'}
                    </button>
                    <button type="button" className={styles.btn} onClick={() => setB((x) => 1 - x)}>
                      Switch B: {b ? 'L2' : 'L1'}
                    </button>
                    <span className={clsx(styles.lampDot, lit && styles.lampOn)} aria-label={lit ? 'Lamp on' : 'Lamp off'} />
                  </div>
                  {Object.keys(wires).length === WIRES.length && <Verdict ok={wiringOk} yes="✓ Staircase wiring works" no="✗ Lamp does not follow both switches: check the wiring" />}
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>
      <Section title="Observation table">
        <Table
          caption="Staircase circuit"
          head={['Switch A', 'Switch B', 'Lamp']}
          rows={['00', '01', '10', '11'].map((c) => [c[0] === '0' ? 'L1' : 'L2', c[1] === '0' ? 'L1' : 'L2', combos.includes(c) ? (c[0] === c[1] ? 'ON' : 'OFF') : '–'])}
        />
        <ResetKit
          onReset={() => {
            setPick({});
            setWires({});
            setCombos([]);
            setPrinted(false);
          }}
        />
      </Section>
    </PracticalSheet>
  );
}
