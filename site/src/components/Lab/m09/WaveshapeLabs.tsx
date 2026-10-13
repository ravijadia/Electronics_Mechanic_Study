import React, {useEffect, useMemo, useState} from 'react';
import clsx from 'clsx';
import PracticalSheet, {type VivaQuestion} from '../PracticalSheet';
import useStoredState from '../useStoredState';
import {Knob, useScope} from '../Scope';
import {fgVpp, useFunctionGenerator} from '../FunctionGenerator';
import {stats, type Sig} from '../signals';
import {Empty, NoteBox, ResetKit, Section, Table, Verdict, useKitSeed, useRng, type Note} from '../kit';
import {kitLabel} from '../m07/parts';
import styles from '../styles.module.css';

const num = (s?: string) => (s && s.trim() !== '' && !Number.isNaN(Number(s)) ? Number(s) : null);
const VD = 0.7;
const R = 1000;
const RD = 8; // diode on-resistance

type Draw = 'shunt' | 'series' | 'dual' | 'clamp' | 'zener' | 'zener2';
interface Cfg {
  id: string;
  name: string;
  draw: Draw;
  /** Diode points up (anode at ground side) or down. */
  up?: boolean;
  biased?: boolean;
  /** Instantaneous transfer; omitted for clampers. */
  xfer?: (v: number, vb: number, vz: number) => number;
  /** Clamper: output = input + shift(min, max, vb). */
  clamp?: (mn: number, mx: number, vb: number) => number;
  /** Shunt diode can be destroyed if the series resistor is left out. */
  shunt?: boolean;
}

/** Shunt diode clips above `lvl` (or below, if `below`) with a small slope. */
const clipAbove = (v: number, lvl: number) => (v > lvl ? lvl + ((v - lvl) * RD) / (R + RD) : v);
const clipBelow = (v: number, lvl: number) => (v < lvl ? lvl + ((v - lvl) * RD) / (R + RD) : v);

export const CFGS: Record<string, Cfg> = {
  shPos: {id: 'shPos', name: 'Shunt, clips + half', draw: 'shunt', up: false, shunt: true, xfer: (v) => clipAbove(v, VD)},
  shNeg: {id: 'shNeg', name: 'Shunt, clips − half', draw: 'shunt', up: true, shunt: true, xfer: (v) => clipBelow(v, -VD)},
  shPosB: {id: 'shPosB', name: 'Biased shunt, clips above +Vb', draw: 'shunt', up: false, biased: true, shunt: true, xfer: (v, vb) => clipAbove(v, vb + VD)},
  shNegB: {id: 'shNegB', name: 'Biased shunt, clips below −Vb', draw: 'shunt', up: true, biased: true, shunt: true, xfer: (v, vb) => clipBelow(v, -vb - VD)},
  sePos: {id: 'sePos', name: 'Series, removes + half', draw: 'series', up: true, xfer: (v) => Math.min(0, v + VD)},
  seNeg: {id: 'seNeg', name: 'Series, removes − half', draw: 'series', up: false, xfer: (v) => Math.max(0, v - VD)},
  dual: {id: 'dual', name: 'Dual (biased) clipper', draw: 'dual', biased: true, shunt: true, xfer: (v, vb) => clipBelow(clipAbove(v, vb + VD), -vb - VD)},
  clPos: {id: 'clPos', name: 'Positive clamper', draw: 'clamp', up: true, clamp: (mn) => -mn - VD},
  clNeg: {id: 'clNeg', name: 'Negative clamper', draw: 'clamp', up: false, clamp: (_mn, mx) => -mx + VD},
  clPosB: {id: 'clPosB', name: 'Biased positive clamper (+Vb)', draw: 'clamp', up: true, biased: true, clamp: (mn, _mx, vb) => -mn - VD + vb},
  zen: {id: 'zen', name: 'Zener peak clipper', draw: 'zener', shunt: true, xfer: (v, _vb, vz) => clipBelow(clipAbove(v, vz), -VD)},
  zen2: {id: 'zen2', name: 'Back-to-back zeners', draw: 'zener2', shunt: true, xfer: (v, _vb, vz) => clipBelow(clipAbove(v, vz + VD), -vz - VD)},
};

/** Output signal of a configuration. */
function shape(c: Cfg, vin: Sig, vb: number, vz: number, burnt: boolean): Sig {
  if (burnt) return c.draw === 'series' ? {fn: () => 0, period: vin.period} : vin;
  if (c.clamp) {
    const s = vin.period ? stats(vin) : {min: 0, max: 0};
    const k = c.clamp(s.min, s.max, vb);
    return {fn: (t) => vin.fn(t) + k, period: vin.period};
  }
  return {fn: (t) => c.xfer!(vin.fn(t), vb, vz), period: vin.period};
}

function Diode({x, y, up, zener}: {x: number; y: number; up: boolean; zener?: boolean}) {
  return (
    <g transform={`rotate(${up ? 180 : 0} ${x} ${y})`}>
      <path d={`M${x - 12} ${y - 10} H${x + 12} L${x} ${y + 10} Z`} fill="#e9eef0" />
      <path d={zener ? `M${x - 16} ${y + 6} L${x - 12} ${y + 10} H${x + 12} L${x + 16} ${y + 14}` : `M${x - 12} ${y + 10} H${x + 12}`} stroke="#e9eef0" strokeWidth={3} fill="none" />
    </g>
  );
}
function Battery({x, y}: {x: number; y: number}) {
  return (
    <g>
      <path d={`M${x - 14} ${y - 4} H${x + 14} M${x - 8} ${y + 4} H${x + 8}`} stroke="#e9eef0" strokeWidth={3} />
      <text x={x + 18} y={y + 4} style={{...kitLabel, fontSize: 10}}>
        Vb
      </text>
    </g>
  );
}

/** Schematic of the configuration: input left, output right, ground at the bottom. */
function Schematic({c, rFitted}: {c: Cfg; rFitted: boolean}) {
  const W = 'var(--lab-wire)';
  const res = (x: number, y: number) => <rect x={x - 22} y={y - 8} width={44} height={16} rx={3} fill="#e8d7b0" />;
  const series = c.draw === 'series' || c.draw === 'clamp';
  return (
    <svg viewBox="0 0 400 180" role="img" aria-label={`${c.name} circuit`}>
      <circle cx={30} cy={90} r={18} fill="#31414c" stroke="#4d5f6b" />
      <text x={30} y={95} textAnchor="middle" style={kitLabel}>
        ~
      </text>
      <path d="M30 72 V30 H110 M150 30 H370 M30 108 V150 H370" stroke={W} strokeWidth={2.5} fill="none" />
      {series ? (
        c.draw === 'series' ? (
          <g transform="rotate(-90 130 30)">
            <Diode x={130} y={30} up={!!c.up} />
          </g>
        ) : (
          <path d="M126 16 V44 M134 16 V44" stroke={W} strokeWidth={4} />
        )
      ) : rFitted ? (
        res(130, 30)
      ) : (
        <path d="M110 30 H150" stroke="#ff8c1a" strokeWidth={3} strokeDasharray="4 3" />
      )}
      <text x={130} y={14} textAnchor="middle" style={{...kitLabel, fontSize: 10}}>
        {c.draw === 'series' ? 'D' : c.draw === 'clamp' ? 'C' : rFitted ? 'R 1k' : 'no R!'}
      </text>
      {c.draw === 'series' && (
        <g>
          <path d="M260 30 V60 M260 120 V150" stroke={W} strokeWidth={2.5} />
          <g transform="rotate(90 260 90)">{res(260, 90)}</g>
          <text x={272} y={94} style={{...kitLabel, fontSize: 10}}>
            R
          </text>
        </g>
      )}
      {(c.draw === 'shunt' || c.draw === 'clamp') && (
        <g>
          <path d={`M230 30 V70 M230 110 V${c.biased ? 118 : 150} ${c.biased ? 'M230 132 V150' : ''}`} stroke={W} strokeWidth={2.5} />
          <Diode x={230} y={90} up={!!c.up} />
          {c.biased && <Battery x={230} y={125} />}
        </g>
      )}
      {c.draw === 'dual' &&
        [200, 280].map((x, k) => (
          <g key={x}>
            <path d={`M${x} 30 V70 M${x} 110 V118 M${x} 132 V150`} stroke={W} strokeWidth={2.5} />
            <Diode x={x} y={90} up={k === 1} />
            <Battery x={x} y={125} />
          </g>
        ))}
      {(c.draw === 'zener' || c.draw === 'zener2') && (
        <g>
          <path d={`M230 30 V${c.draw === 'zener' ? 70 : 52} M230 ${c.draw === 'zener' ? 110 : 128} V150`} stroke={W} strokeWidth={2.5} />
          {c.draw === 'zener' ? (
            <Diode x={230} y={90} up zener />
          ) : (
            <>
              <Diode x={230} y={70} up zener />
              <Diode x={230} y={110} up={false} zener />
            </>
          )}
        </g>
      )}
      <text x={370} y={22} textAnchor="end" style={{...kitLabel, fontSize: 10}}>
        OUT → CH2
      </text>
      <text x={60} y={22} style={{...kitLabel, fontSize: 10}}>
        CH1
      </text>
    </svg>
  );
}

interface Row {
  cfg: string;
  vb: number;
  vpp: number;
  max: number;
  min: number;
  emax?: string;
  emin?: string;
}

interface Spec {
  number: string;
  title: string;
  aim: string;
  apparatus: string[];
  procedure: string[];
  precautions: string[];
  viva: VivaQuestion[];
  cfgs: string[];
  /** Configs whose levels must be noted for the task list. */
  need: string[];
  zener?: number;
}

function WaveshapeLab({s}: {s: Spec}): React.JSX.Element {
  const KEY = s.number;
  const [seed, newKit] = useKitSeed(KEY);
  const vz = useRng(seed, (rnd) => (s.zener ?? 5.1) * (1 + (rnd() * 2 - 1) * 0.03));
  const [cfgId, setCfgId] = useState(s.cfgs[0]);
  const [vb, setVb] = useState(2);
  const [rFitted, setRFitted] = useState(true);
  const [burnt, setBurnt] = useState(false);
  const [rows, setRows] = useStoredState<Row[]>(`lab:${KEY}:rows`, []);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);
  const fg = useFunctionGenerator({wave: 'sine', range: 1000, dial: 1, amp: 10});
  const c = CFGS[cfgId];
  const vin = fg.signal;
  const out = useMemo(() => shape(c, vin, vb, vz, burnt), [cfgId, JSON.stringify(fg.state), vb, vz, burnt]); // eslint-disable-line react-hooks/exhaustive-deps
  const scope = useScope('cro', {ch1: vin, ch2: out}, {ch1: {vdiv: 2, pos: 0, coupling: 'DC', on: true}, ch2: {vdiv: 2, pos: 0, coupling: 'DC', on: true}, display: 'DUAL', tdiv: 2e-4});

  // A shunt diode with no series resistor shorts the generator.
  const st = stats(vin);
  const conducts = c.shunt && !rFitted && fg.state.on && Math.max(st.max, -st.min) > 0.8;
  useEffect(() => {
    if (!conducts || burnt) return;
    setBurnt(true);
    setNote({kind: 'bad', text: <b>Smoke! With no series resistor the diode shorted the generator and burnt open.</b>});
  }, [conducts, burnt]);

  const change = (f: () => void) => {
    if (fg.state.on) return setNote({kind: 'warn', text: 'Switch the generator output OFF before changing the circuit.'});
    setNote(null);
    f();
  };
  const addRow = () => {
    if (!fg.state.on) return setNote({kind: 'warn', text: 'Generator output is OFF.'});
    if (burnt) return setNote({kind: 'warn', text: 'Replace the burnt diode first.'});
    if (fg.state.wave !== 'sine') return setNote({kind: 'warn', text: 'Use a sine input.'});
    const o = stats(out);
    const vpp = fgVpp(fg.state);
    setRows((r) => [...r.filter((x) => !(x.cfg === cfgId && x.vb === vb && Math.abs(x.vpp - vpp) < 0.01)), {cfg: cfgId, vb, vpp, max: o.max, min: o.min}]);
    setNote({kind: 'good', text: 'Row added: read the output top and bottom levels on CH2.'});
  };
  const close = (e: string | undefined, t: number) => num(e) != null && Math.abs(num(e)! - t) <= Math.max(0.3, Math.abs(t) * 0.05);
  const ok = (r: Row) => close(r.emax, r.max) && close(r.emin, r.min);
  const usesVb = s.cfgs.some((id) => CFGS[id].biased);

  return (
    <PracticalSheet
      number={s.number}
      title={s.title}
      aim={s.aim}
      apparatus={s.apparatus}
      procedure={s.procedure}
      precautions={s.precautions}
      viva={s.viva}
      tasks={[
        ...s.need.map((id) => ({label: `${CFGS[id].name}: output levels read correctly.`, done: rows.some((r) => r.cfg === id && ok(r))})),
        {label: 'Print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={clsx(styles.seg, styles.noPrint)} role="group" aria-label="Circuit" style={{marginBottom: '0.5rem'}}>
          {s.cfgs.map((id) => (
            <button key={id} type="button" aria-pressed={cfgId === id} onClick={() => change(() => setCfgId(id))}>
              {CFGS[id].name}
            </button>
          ))}
        </div>
        <div className={styles.controls} style={{marginTop: 0}}>
          <div className={styles.kit}>
            <Schematic c={c} rFitted={rFitted} />
          </div>
          <div className={clsx(styles.card, styles.noPrint)} style={{alignSelf: 'start'}}>
            {usesVb && <Knob label="BIAS Vb" value={`${vb.toFixed(1)} V`} onDec={() => change(() => setVb((x) => Math.max(0, Math.round((x - 0.5) * 10) / 10)))} onInc={() => change(() => setVb((x) => Math.min(5, Math.round((x + 0.5) * 10) / 10)))} />}
            {s.cfgs.some((id) => CFGS[id].shunt) && (
              <div className={styles.seg} role="group" aria-label="Series resistor" style={{marginTop: '0.4rem'}}>
                <button type="button" aria-pressed={rFitted} onClick={() => change(() => setRFitted(true))}>
                  R fitted
                </button>
                <button type="button" aria-pressed={!rFitted} onClick={() => change(() => setRFitted(false))}>
                  No R
                </button>
              </div>
            )}
            <div className={styles.seg} role="group" aria-label="Actions" style={{marginTop: '0.4rem'}}>
              <button type="button" onClick={addRow}>
                Add row
              </button>
              {burnt && (
                <button type="button" onClick={() => change(() => (setBurnt(false), setNote({kind: 'info', text: 'New diode fitted.'})))}>
                  Replace diode
                </button>
              )}
            </div>
          </div>
        </div>
        <NoteBox note={note} />
        <div className={styles.controls}>
          <div>{scope.view}</div>
          <div>{fg.view}</div>
        </div>
      </Section>
      <Section title="Observation table">
        {rows.length === 0 ? (
          <Empty>No rows yet.</Empty>
        ) : (
          <Table
            head={['Circuit', ...(usesVb ? ['Vb (V)'] : []), 'Input (Vpp)', 'Output top (V)', 'Output bottom (V)', 'Check']}
            rows={rows.map((r, k) => {
              const set = (p: Partial<Row>) => setRows((x) => x.map((y, j) => (j === k ? {...y, ...p} : y)));
              const field = (f: 'emax' | 'emin', label: string) => <input className={styles.input} style={{maxWidth: '5rem'}} inputMode="decimal" aria-label={label} value={r[f] ?? ''} onChange={(e) => set({[f]: e.target.value})} />;
              return [CFGS[r.cfg].name, ...(usesVb ? [CFGS[r.cfg].biased ? r.vb.toFixed(1) : '–'] : []), r.vpp.toFixed(1), field('emax', `Row ${k + 1} output top`), field('emin', `Row ${k + 1} output bottom`), r.emax && r.emin ? <Verdict ok={ok(r)} /> : '–'];
            })}
          />
        )}
        <p className={styles.muted}>Read levels with CH2 on DC coupling. Use + and − signs.</p>
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

// ---------------------------------------------------------------------------
// 1.9.92 – 1.9.95
// ---------------------------------------------------------------------------

const COMMON_PRE = ['Common ground for generator and both CRO channels.', 'Keep CH2 on DC coupling to see the true levels.', 'Never connect a shunt diode across the generator without the series resistor.'];

export function ShuntClipperLab(): React.JSX.Element {
  return (
    <WaveshapeLab
      s={{
        number: '1.9.92',
        title: 'Construct and Test Shunt Clipper Circuits',
        aim: 'To build positive, negative and biased shunt clippers and measure the clipping levels on the CRO.',
        apparatus: ['Function generator (sine, 1 kHz, 10 Vpp)', 'Diode 1N4148, resistor 1 kΩ, bias battery 0–5 V', 'Dual-trace CRO'],
        procedure: ['Build the clipper. CH1 = input, CH2 = output, both DC coupled.', 'Note the top and bottom output levels.', 'Turn the diode round and repeat.', 'Add a bias battery: the clipping level moves to Vb + 0.7 V.'],
        precautions: COMMON_PRE,
        viva: [
          {q: 'At what level does an unbiased silicon diode clipper clip?', a: 'At about 0.7 V (the diode’s forward voltage).'},
          {q: 'Why is the diode in a shunt clipper placed after a resistor?', a: 'The resistor limits the current when the diode conducts and drops the clipped voltage.'},
          {q: 'How does a bias battery change the clipping level?', a: 'The diode conducts only when the output exceeds Vb + 0.7 V, so the clip level moves by Vb.'},
        ],
        cfgs: ['shPos', 'shNeg', 'shPosB', 'shNegB'],
        need: ['shPos', 'shNeg', 'shPosB', 'shNegB'],
      }}
    />
  );
}

export function SeriesDualClipperLab(): React.JSX.Element {
  return (
    <WaveshapeLab
      s={{
        number: '1.9.93',
        title: 'Construct and Test Series and Dual Clipper Circuits',
        aim: 'To build series clippers that remove one half of a sine wave, and a dual (biased) clipper that limits both peaks.',
        apparatus: ['Function generator', 'Diodes 1N4148 × 2, resistor 1 kΩ, two bias batteries', 'Dual-trace CRO'],
        procedure: ['Series clipper: diode in series, R across the output.', 'Note the output levels; turn the diode round and repeat.', 'Dual clipper: two shunt diodes with bias batteries, one each way.', 'Note how the levels change with Vb.'],
        precautions: COMMON_PRE,
        viva: [
          {q: 'Difference between series and shunt clippers?', a: 'In a series clipper the diode is in series with the load and passes one half; in a shunt clipper the diode is across the load and diverts the clipped part.'},
          {q: 'What does a dual clipper produce from a large sine wave?', a: 'A wave limited at both +(Vb + 0.7) and −(Vb + 0.7): nearly a square wave.'},
          {q: 'Where are clippers used?', a: 'To protect circuits from over-voltage, to shape waves, and in noise limiters.'},
        ],
        cfgs: ['sePos', 'seNeg', 'dual'],
        need: ['sePos', 'seNeg', 'dual'],
      }}
    />
  );
}

export function ClamperLab(): React.JSX.Element {
  return (
    <WaveshapeLab
      s={{
        number: '1.9.94',
        title: 'Construct and Test Clamper Circuits Using Diodes',
        aim: 'To build positive, negative and biased clampers and measure how they shift the DC level of a sine wave.',
        apparatus: ['Function generator', 'Capacitor 10 µF, diode 1N4148, bias battery', 'Dual-trace CRO (DC coupling)'],
        procedure: ['Build the clamper: capacitor in series, diode across the output.', 'CH2 on DC coupling. Note the top and bottom levels.', 'The peak-to-peak stays the same; only the DC level shifts.', 'Turn the diode round; then add the bias battery.'],
        precautions: [...COMMON_PRE.slice(0, 2), 'Fit an electrolytic coupling capacitor with the correct polarity.'],
        viva: [
          {q: 'Difference between a clipper and a clamper?', a: 'A clipper cuts off part of the wave; a clamper keeps the whole wave and shifts its DC level.'},
          {q: 'Where does a positive clamper hold the negative peak?', a: 'At about −0.7 V, so the wave sits almost entirely above zero.'},
          {q: 'Why must the CRO be on DC coupling?', a: 'AC coupling removes the DC shift that the clamper adds.'},
          {q: 'Where are clampers used?', a: 'DC restorers in TV receivers, voltage multipliers.'},
        ],
        cfgs: ['clPos', 'clNeg', 'clPosB'],
        need: ['clPos', 'clNeg', 'clPosB'],
      }}
    />
  );
}

export function ZenerClipperLab(): React.JSX.Element {
  return (
    <WaveshapeLab
      s={{
        number: '1.9.95',
        title: 'Zener Diode as a Peak Clipper',
        aim: 'To use a zener diode, and two zeners back to back, to clip the peaks of a sine wave, and measure the clipping levels.',
        apparatus: ['Function generator (up to 20 Vpp)', 'Zener diodes 5.1 V × 2, resistor 1 kΩ', 'Dual-trace CRO'],
        procedure: ['Single zener across the output: note the levels. + peak clips at Vz, − peak at −0.7 V.', 'Two zeners back to back: both peaks clip at ±(Vz + 0.7).', 'Raise the input amplitude: the clip levels stay the same.'],
        precautions: COMMON_PRE,
        viva: [
          {q: 'Why does a single zener clip the two halves at different levels?', a: 'In reverse it breaks down at Vz; in forward it conducts at 0.7 V like an ordinary diode.'},
          {q: 'Clip level of two 5.1 V zeners back to back?', a: 'About ±5.8 V (5.1 + 0.7).'},
          {q: 'Advantage over a biased diode clipper?', a: 'No bias battery is needed.'},
        ],
        cfgs: ['zen', 'zen2'],
        need: ['zen', 'zen2'],
        zener: 5.1,
      }}
    />
  );
}
