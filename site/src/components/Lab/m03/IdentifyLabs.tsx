import React, {useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import Multimeter from '../Multimeter';
import useStoredState from '../useStoredState';
import {ProbeBar, ProbePoint, useProbes} from '../Probes';
import {NoteBox, ResetKit, Section, Table, Verdict, shuffle, useKitSeed, useRng, type Note} from '../kit';
import styles from '../styles.module.css';

// ---------------------------------------------------------------------------
// 1.3.28 Identify the +ve and −ve terminals of a battery
// ---------------------------------------------------------------------------

type Kind = 'aa' | 'li' | 'nine' | 'lead' | 'button';

interface Cell {
  kind: Kind;
  name: string;
  volts: number;
  /** Which drawn terminal (A or B) is positive. */
  plus: 'A' | 'B';
}

const W = 210;
const H = 150;

/** Draws one cell/battery in a 210×150 box and returns terminal positions. */
function cellArt(c: Cell, ox: number, oy: number) {
  const flip = (c.plus === 'A') !== (c.kind === 'lead' || c.kind === 'nine' || c.kind === 'button');
  const t: Record<'A' | 'B', {x: number; y: number}> = {A: {x: 0, y: 0}, B: {x: 0, y: 0}};
  let art: React.ReactNode = null;
  const label = (txt: string, x: number, y: number, fill = '#fff') => (
    <text x={x} y={y} textAnchor="middle" style={{fill, fontSize: 11, fontWeight: 700, fontFamily: 'var(--ifm-font-family-base)'}}>
      {txt}
    </text>
  );
  if (c.kind === 'aa' || c.kind === 'li') {
    // Horizontal cylinder; the nub (+) is on the right unless flipped.
    const len = c.kind === 'aa' ? 120 : 140;
    const x0 = ox + (W - len) / 2;
    const y0 = oy + 58;
    const nubRight = !flip;
    art = (
      <g>
        <rect x={x0} y={y0} width={len} height={34} rx={6} fill={c.kind === 'aa' ? '#2b5fd1' : '#3a8f5c'} />
        <rect x={x0 + (nubRight ? len - 22 : 0)} y={y0} width={22} height={34} rx={6} fill="#b9c0c5" />
        <rect x={nubRight ? x0 + len : x0 - 7} y={y0 + 10} width={7} height={14} rx={2} fill="#9aa3a8" />
        {label(c.kind === 'aa' ? 'AA 1.5 V' : '18650 3.7 V', x0 + len / 2, y0 + 21)}
      </g>
    );
    const nub = {x: nubRight ? x0 + len + 7 : x0 - 7, y: y0 + 17};
    const flat = {x: nubRight ? x0 : x0 + len, y: y0 + 17};
    t[c.plus] = nub;
    t[c.plus === 'A' ? 'B' : 'A'] = flat;
  } else if (c.kind === 'nine') {
    const x0 = ox + 70;
    const y0 = oy + 52;
    const roundLeft = flip; // the small round snap is +
    const round = {x: roundLeft ? x0 + 22 : x0 + 48, y: y0 + 10};
    const hex = {x: roundLeft ? x0 + 48 : x0 + 22, y: y0 + 10};
    art = (
      <g>
        <rect x={x0} y={y0 + 18} width={70} height={74} rx={6} fill="#2d2d2d" />
        <rect x={x0} y={y0 + 16} width={70} height={10} fill="#9aa3a8" />
        <circle cx={round.x} cy={round.y} r={6} fill="#b9c0c5" stroke="#777" />
        <path
          d={Array.from({length: 6}, (_, k) => {
            const a = (k * Math.PI) / 3;
            return `${k ? 'L' : 'M'}${hex.x + 9 * Math.cos(a)} ${hex.y + 9 * Math.sin(a)}`;
          }).join(' ') + 'Z'}
          fill="#b9c0c5"
          stroke="#777"
        />
        {label('9 V', x0 + 35, y0 + 66)}
      </g>
    );
    t[c.plus] = round;
    t[c.plus === 'A' ? 'B' : 'A'] = hex;
  } else if (c.kind === 'lead') {
    const x0 = ox + 30;
    const y0 = oy + 62;
    const bigLeft = flip; // the thicker post is +
    const big = {x: bigLeft ? x0 + 34 : x0 + 116, y: y0 - 6};
    const small = {x: bigLeft ? x0 + 116 : x0 + 34, y: y0 - 6};
    art = (
      <g>
        <rect x={x0} y={y0} width={150} height={78} rx={6} fill="#3b3f44" />
        <rect x={big.x - 9} y={big.y - 6} width={18} height={14} rx={3} fill="#9aa3a8" />
        <rect x={small.x - 6.5} y={small.y - 6} width={13} height={14} rx={3} fill="#9aa3a8" />
        <text x={big.x} y={y0 + 20} textAnchor="middle" style={{fill: '#c9c9c9', fontSize: 14, fontWeight: 800}}>
          +
        </text>
        <text x={small.x} y={y0 + 20} textAnchor="middle" style={{fill: '#c9c9c9', fontSize: 14, fontWeight: 800}}>
          −
        </text>
        {label('12 V lead-acid', x0 + 75, y0 + 54)}
      </g>
    );
    t[c.plus] = big;
    t[c.plus === 'A' ? 'B' : 'A'] = small;
  } else {
    // Button cell, side view: the wide can (+) and the smaller cap (−).
    const cx = ox + W / 2;
    const y0 = oy + 62;
    art = (
      <g>
        <rect x={cx - 42} y={y0 + 10} width={84} height={18} rx={4} fill="#b9c0c5" stroke="#777" />
        <rect x={cx - 32} y={y0} width={64} height={12} rx={3} fill="#d3d8db" stroke="#777" />
        {label('CR2032  3 V', cx, y0 + 50, 'var(--lab-kit-ink)')}
      </g>
    );
    const can = {x: cx + 42, y: y0 + 19};
    const cap = {x: cx, y: y0};
    t[c.plus] = can;
    t[c.plus === 'A' ? 'B' : 'A'] = cap;
  }
  return {art, t};
}

const CELLS: Omit<Cell, 'plus'>[] = [
  {kind: 'aa', name: 'AA cell', volts: 1.58},
  {kind: 'li', name: '18650 Li-ion cell', volts: 3.92},
  {kind: 'nine', name: '9 V battery', volts: 9.21},
  {kind: 'lead', name: '12 V lead-acid battery', volts: 12.64},
  {kind: 'button', name: 'Button cell', volts: 3.11},
];

export function TerminalsLab(): React.JSX.Element {
  const KEY = '1.3.28';
  const [seed, newKit] = useKitSeed(KEY);
  const cells = useRng(seed, (rnd) => CELLS.map((c) => ({...c, plus: rnd() < 0.5 ? 'A' : 'B'}) as Cell));
  const [ans, setAns] = useStoredState<Record<number, string>>(`lab:${KEY}:ans`, {});
  const [verified, setVerified] = useStoredState<number[]>(`lab:${KEY}:verified`, []);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [fn, setFn] = useState('off');
  const [note, setNote] = useState<Note>(null);
  const probes = useProbes();

  const layout = cells.map((c, k) => ({c, ox: (k % 3) * W, oy: Math.floor(k / 3) * H, ...cellArt(c, (k % 3) * W, Math.floor(k / 3) * H)}));
  const [ri, rt] = (probes.red ?? ':').split(':');
  const [bi, bt] = (probes.black ?? ':').split(':');
  const on = ri && ri === bi && rt !== bt ? Number(ri) : null;
  const v = on != null ? cells[on].volts * (cells[on].plus === rt ? 1 : -1) : 0;
  const text = fn === 'dcv20' ? (Math.abs(v) >= 20 ? 'OL' : v.toFixed(2)) : '';

  const noteIt = () => {
    if (on == null) return setNote({kind: 'warn', text: 'Probes on both terminals of one cell.'});
    if (fn !== 'dcv20') return setNote({kind: 'warn', text: 'Select DC V 20.'});
    if (!verified.includes(on)) setVerified((x) => [...x, on]);
    setNote({kind: v > 0 ? 'good' : 'info', text: v > 0 ? `+${text} V: red probe is on +` : `${text} V: minus sign, so the red probe is on −`});
  };

  return (
    <PracticalSheet
      number={KEY}
      title="Identify the +ve and −ve Terminals of a Battery"
      aim="To identify the positive and negative terminals of common cells and batteries, and confirm them with a multimeter."
      apparatus={['AA cell, 18650 Li-ion cell, 9 V battery, 12 V lead-acid battery, button cell', 'Digital multimeter']}
      procedure={['Look at each cell: shape, size and markings of its terminals.', 'Choose which terminal (A or B) is positive.', 'Confirm with the meter on DC V: red on your “+” terminal should give a positive reading.']}
      precautions={['Never short the two terminals together.', 'Keep the lead-acid battery upright.']}
      viva={[
        {q: 'How do you identify + on a cylindrical cell?', a: 'The end with the raised button (nub) is +. The flat end is −.'},
        {q: 'Which snap of a 9 V battery is +?', a: 'The small round one. The larger hexagonal one is −.'},
        {q: 'How is + marked on a lead-acid battery?', a: 'The + post is thicker, and it is marked “+” (often with a red cap).'},
        {q: 'What does a minus sign on the DMM mean?', a: 'The red probe is on the negative terminal.'},
      ]}
      tasks={[
        {label: 'Identify + on all five cells.', done: cells.every((c, k) => ans[k] === c.plus)},
        {label: 'Confirm at least three with the meter.', done: verified.length >= 3},
        {label: 'Print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div>
            <div className={styles.kit}>
              <svg viewBox={`0 0 ${W * 3} ${H * 2}`} role="img" aria-label="Five cells and batteries with terminals A and B">
                {layout.map(({c, ox, oy, art, t}, k) => (
                  <g key={k}>
                    <text x={ox + W / 2} y={oy + 20} textAnchor="middle" className={clsx(styles.kitText, styles.small)}>
                      {k + 1}. {c.name}
                    </text>
                    {art}
                    {(['A', 'B'] as const).map((n) => (
                      <g key={n}>
                        <text x={t[n].x} y={t[n].y + (c.kind === 'aa' || c.kind === 'li' ? 30 : -16)} textAnchor="middle" className={clsx(styles.kitText, styles.bold)}>
                          {n}
                        </text>
                        <ProbePoint id={`${k}:${n}`} x={t[n].x} y={t[n].y} probes={probes} label={`${c.name} terminal ${n}`} r={4} />
                      </g>
                    ))}
                  </g>
                ))}
              </svg>
            </div>
            <ProbeBar probes={probes} />
          </div>
          <div style={{display: 'grid', gap: '0.7rem', alignContent: 'start'}}>
            <Multimeter name="Digital multimeter" fn={fn} functions={[{fn: 'off', label: 'OFF'}, {fn: 'dcv20', label: 'DC V 20'}]} text={text} unit={fn === 'off' ? '' : 'V DC'} placement={on != null ? cells[on].name : undefined} onFunction={setFn} />
            <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} onClick={noteIt}>
              Note reading
            </button>
          </div>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        <Table
          head={['Cell', '+ terminal is', 'Confirmed with meter', 'Check']}
          rows={cells.map((c, k) => [
            c.name,
            <select className={styles.select} aria-label={`${c.name} positive terminal`} value={ans[k] ?? ''} onChange={(e) => setAns((a) => ({...a, [k]: e.target.value}))}>
              <option value="">Choose…</option>
              <option value="A">A</option>
              <option value="B">B</option>
            </select>,
            verified.includes(k) ? 'Yes' : '–',
            ans[k] ? <Verdict ok={ans[k] === c.plus} /> : '–',
          ])}
        />
        <ResetKit
          onReset={() => {
            setAns({});
            setVerified([]);
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// 1.3.29 Identify the rated output voltage and AH capacity of a battery
// ---------------------------------------------------------------------------

const LABELS = [
  {top: 'SMF / VRLA', main: '12V 7Ah', sub: 'Valve regulated lead-acid', v: 12, ah: 7, loadA: 0.5, colour: '#1c3d5a'},
  {top: 'NiMH rechargeable', main: '1.2V · 2500mAh', sub: 'Size AA', v: 1.2, ah: 2.5, loadA: 0.25, colour: '#2e6b3a'},
  {top: 'Alkaline', main: '9V · 550 mAh', sub: 'Type 6LR61', v: 9, ah: 0.55, loadA: 0.025, colour: '#5a2a1c'},
  {top: 'Li-ion 18650', main: '3.7V 2600mAh', sub: '9.62 Wh', v: 3.7, ah: 2.6, loadA: 0.65, colour: '#3a2e6b'},
  {top: 'Tubular inverter battery', main: '12V 150Ah', sub: 'C20 rating', v: 12, ah: 150, loadA: 7.5, colour: '#6b4a1c'},
  {top: 'Lead-acid cell', main: '2V 200Ah', sub: 'Stationary', v: 2, ah: 200, loadA: 10, colour: '#444'},
  {top: 'SMF', main: '6V 4.5Ah', sub: 'Emergency light', v: 6, ah: 4.5, loadA: 0.9, colour: '#1c5a55'},
];

export function RatingLab(): React.JSX.Element {
  const KEY = '1.3.29';
  const [seed, newKit] = useKitSeed(KEY);
  const items = useRng(seed, (rnd) => shuffle(LABELS, rnd).slice(0, 5));
  const [ans, setAns] = useStoredState<Record<number, {v?: string; ah?: string; h?: string}>>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const n = (x?: string) => (x && x.trim() !== '' && !Number.isNaN(Number(x)) ? Number(x) : null);
  const res = items.map((it, k) => {
    const a = ans[k] ?? {};
    const hours = it.ah / it.loadA;
    return {
      v: a.v ? n(a.v) === it.v : null,
      ah: a.ah ? n(a.ah) != null && Math.abs(n(a.ah)! - it.ah) < 1e-6 : null,
      h: a.h ? n(a.h) != null && Math.abs(n(a.h)! - hours) <= Math.max(0.05, hours * 0.02) : null,
    };
  });
  const inp = (k: number, f: 'v' | 'ah' | 'h', label: string) => (
    <input className={styles.input} inputMode="decimal" aria-label={label} value={ans[k]?.[f] ?? ''} onChange={(e) => setAns((x) => ({...x, [k]: {...x[k], [f]: e.target.value}}))} />
  );

  return (
    <PracticalSheet
      number={KEY}
      title="Identify the Rated Voltage and AH Capacity of a Battery"
      aim="To read the rated voltage and ampere-hour (AH) capacity from battery labels and estimate the backup time for a load."
      apparatus={['Five batteries with labels (below)']}
      procedure={['Read the rated voltage (V) from the label.', 'Read the capacity. Convert mAh to Ah (÷ 1000).', 'Backup time (h) = Ah ÷ load current (A).']}
      precautions={['Do not discharge a battery below its cut-off voltage.', 'AH capacity is for a stated rate (e.g. C20 = over 20 hours).']}
      viva={[
        {q: 'What does 7 Ah mean?', a: 'The battery can deliver 7 A for 1 hour, or 0.35 A for 20 hours (at its rated discharge rate).'},
        {q: 'Convert 2600 mAh to Ah.', a: '2600 ÷ 1000 = 2.6 Ah.'},
        {q: 'What is C20 rating?', a: 'The capacity when discharged evenly over 20 hours.'},
        {q: 'Why is real backup time often less than Ah ÷ A?', a: 'At high currents the usable capacity falls, and the battery is not discharged to zero.'},
      ]}
      tasks={[
        {label: 'Read the rated voltage of all five.', done: res.every((r) => r.v)},
        {label: 'Read the capacity in Ah of all five.', done: res.every((r) => r.ah)},
        {label: 'Calculate the backup time of all five.', done: res.every((r) => r.h)},
        {label: 'Print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Battery labels">
        <div className={styles.meterGrid} style={{gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))'}}>
          {items.map((it, k) => (
            <div key={k} className={styles.batteryLabel} style={{background: it.colour}}>
              <small>{it.top}</small>
              <b>{it.main}</b>
              <small>{it.sub}</small>
              <span className={styles.batteryNo}>{k + 1}</span>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Observation table">
        <Table
          head={['Battery', 'Rated voltage (V)', 'Capacity (Ah)', 'Load current', 'Backup time (h)', 'Check']}
          rows={items.map((it, k) => [
            k + 1,
            inp(k, 'v', `Battery ${k + 1} voltage`),
            inp(k, 'ah', `Battery ${k + 1} capacity`),
            <span className={styles.num}>{it.loadA < 0.1 ? `${it.loadA * 1000} mA` : `${it.loadA} A`}</span>,
            inp(k, 'h', `Battery ${k + 1} backup time`),
            Object.values(res[k]).some((x) => x == null) ? '–' : <Verdict ok={Object.values(res[k]).every(Boolean)} />,
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
