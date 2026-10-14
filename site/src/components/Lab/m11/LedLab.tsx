import React, {useEffect, useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import Multimeter from '../Multimeter';
import useStoredState from '../useStoredState';
import {ProbeBar, ProbePoint, useProbes} from '../Probes';
import {Knob} from '../Scope';
import {Empty, NoteBox, ResetKit, Section, Table, Verdict, useKitSeed, useRng, type Note} from '../kit';
import {solveNodes, resistanceBetween, type Branch, type CurrentSource} from '../m07/network';
import {AxialResistor, bandsFor, kitLabel, near} from '../m07/parts';
import {solveSeries} from '../m08/diode';
import {LEDS, LED_IMAX, LED_VRMAX, ledSpec} from './opto';
import styles from '../styles.module.css';

const num = (s?: string) => (s && s.trim() !== '' && !Number.isNaN(Number(s)) ? Number(s) : null);

// ---------------------------------------------------------------------------
// 1.11.105 Test LEDs with a DC supply: voltage drop and current
// ---------------------------------------------------------------------------

const R_INT = 0.5;
const R_LINK = 0.01;
const R_AMM = 1;
const FUSE_A = 0.2;
const RS = [1000, 470, 330, 0];

const FNS = [
  {fn: 'off', label: 'OFF'},
  {fn: 'V20', label: 'DC V 20'},
  {fn: 'mA20', label: 'DC mA 20'},
  {fn: 'mA200', label: 'DC mA 200'},
];

interface Row {
  setV: number;
  r: number;
  vf?: number;
  ifm?: number;
  vr?: number;
}

/** Which measurement a probe pair is, by node. */
const QTY: Record<string, string> = {'A|N': 'VF', 'P|X': 'VR', 'N|P': 'VS'};

export function LedTestLab(): React.JSX.Element {
  const KEY = '1.11.105';
  const [seed, newKit] = useKitSeed(KEY);
  const kit = useRng(seed, (rnd) => ({
    vf: Object.fromEntries(LEDS.map((l) => [l.id, l.vf + (rnd() * 2 - 1) * 0.1])),
    r: Object.fromEntries(RS.map((r) => [r, r * (1 + (rnd() * 2 - 1) * 0.04)])),
  }));
  const [led, setLed] = useState('red');
  const [rev, setRev] = useState(false);
  const [r, setR] = useState(1000);
  const [linkIn, setLinkIn] = useState(true);
  const [volts, setVolts] = useState(5);
  const [power, setPower] = useState(false);
  const [fn, setFn] = useState('off');
  const [fuse, setFuse] = useState(true);
  const [dead, setDead] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState<Note>(null);
  const probes = useProbes();
  const [rows, setRows] = useStoredState<Record<string, Row>>(`lab:${KEY}:rows`, {});
  const [revRow, setRevRow] = useStoredState<{v?: number; ima?: number}>(`lab:${KEY}:rev`, {});
  const [ans, setAns] = useStoredState<{r?: string}>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);

  const L = LEDS.find((l) => l.id === led)!;
  const burnt = !!dead[led];
  const spec = burnt ? {...ledSpec(kit.vf[led]), is: 0, rrev: Infinity} : ledSpec(kit.vf[led]);

  const node = (id: string | null) => (id ? id.split('@')[0] : null);
  const red = node(probes.red);
  const black = node(probes.black);
  const both = !!red && !!black && red !== black;
  const isV = fn === 'V20';
  const isA = fn === 'mA20' || fn === 'mA200';

  // Linear part of the circuit, then the LED solved against its Thevenin equivalent.
  const lin: Branch[] = [
    {a: 'P', b: 'X', ohms: r ? kit.r[r] : R_LINK},
    {a: 'X', b: 'A', ohms: linkIn ? R_LINK : Infinity},
    ...(power ? [{a: 'P', b: 'N', ohms: R_INT}] : []),
    ...(both && (isV || (isA && fuse)) ? [{a: red!, b: black!, ohms: isV ? 10e6 : R_AMM}] : []),
  ];
  const src: CurrentSource[] = power ? [{from: 'N', to: 'P', amps: volts / R_INT}] : [];
  const vth = solveNodes(lin, src).A ?? 0;
  const rth = resistanceBetween(lin, 'A', 'N');
  const sgn = rev ? -1 : 1;
  const d = isFinite(rth) ? solveSeries(spec, sgn * vth, rth) : {i: 0, vd: 0};
  const iLed = d.i; // + = forward through the LED
  const v = solveNodes(lin, [...src, {from: 'A', to: 'N', amps: sgn * iLed}]);
  const vm = both ? (v[red!] ?? 0) - (v[black!] ?? 0) : 0;
  const iMeter = isA && fuse && both ? vm / R_AMM : 0;
  const vLedRev = rev ? (v.A ?? 0) : 0;

  let text = '';
  let unit = '';
  if (fn !== 'off') {
    if (isV) {
      unit = 'V';
      text = Math.abs(vm) >= 20 ? 'OL' : vm.toFixed(2);
    } else {
      unit = 'mA';
      const ma = iMeter * 1000;
      const fs = fn === 'mA20' ? 20 : 200;
      text = !fuse ? (fn === 'mA20' ? '0.00' : '0.0') : Math.abs(ma) >= fs ? 'OL' : ma.toFixed(fn === 'mA20' ? 2 : 1);
    }
  }

  const blowFuse = isA && fuse && Math.abs(iMeter) > FUSE_A;
  const overI = !burnt && iLed > LED_IMAX;
  const overV = !burnt && rev && vLedRev > LED_VRMAX;
  useEffect(() => {
    if (blowFuse) {
      setFuse(false);
      setNote({kind: 'bad', text: <b>Pop! Meter fuse blown. On mA the meter is a short: never put it across a voltage.</b>});
    } else if (overI) {
      setDead((x) => ({...x, [led]: true}));
      setNote({kind: 'bad', text: <b>Flash, then dark: {Math.round(iLed * 1000)} mA burnt the LED open. Keep a series resistor.</b>});
    } else if (overV) {
      setDead((x) => ({...x, [led]: true}));
      setNote({kind: 'bad', text: <b>Reverse voltage above {LED_VRMAX} V: the LED is damaged.</b>});
    }
  }, [blowFuse, overI, overV]); // eslint-disable-line react-hooks/exhaustive-deps

  const change = (f: () => void) => {
    if (power) return setNote({kind: 'warn', text: 'Switch off first.'});
    setNote(null);
    f();
  };

  const pair = both ? [red!, black!].sort().join('|') : '';
  const atLink = both && !linkIn && pair === 'A|X';

  const noteIt = () => {
    if (fn === 'off') return setNote({kind: 'warn', text: 'Select a function.'});
    if (!both) return setNote({kind: 'warn', text: 'Place both probes.'});
    if (!power) return setNote({kind: 'warn', text: 'Supply is off.'});
    if (isA && !fuse) return setNote({kind: 'warn', text: 'Replace the fuse first.'});
    if (burnt) return setNote({kind: 'warn', text: 'This LED is burnt. Replace it.'});
    const q = isV ? QTY[pair] : atLink ? 'IF' : null;
    if (!q) return setNote({kind: 'warn', text: isA ? 'For current: pull the link and put the probes in its two sockets.' : 'Probes across the LED, the resistor or the supply.'});
    if (text === 'OL') return setNote({kind: 'warn', text: 'OL: change range.'});
    const val = Number(text);
    if (val < 0) return setNote({kind: 'warn', text: 'Minus sign: swap the probes (red to the + side).'});
    if (rev) {
      if (q === 'VF') setRevRow((x) => ({...x, v: val}));
      else if (q === 'IF') setRevRow((x) => ({...x, ima: val}));
      else return setNote({kind: 'warn', text: 'Reverse test: measure across the LED and the current.'});
      return setNote({kind: 'good', text: `Reverse ${q === 'VF' ? 'V' : 'I'} = ${text} ${unit}`});
    }
    if (q === 'VS') return setNote({kind: 'info', text: `Supply = ${text} V`});
    setRows((rs) => {
      const old = rs[led];
      const base: Row = old && old.setV === volts && old.r === r ? old : {setV: volts, r};
      return {...rs, [led]: {...base, [q === 'VF' ? 'vf' : q === 'IF' ? 'ifm' : 'vr']: val}};
    });
    setNote({kind: 'good', text: `${L.name}: ${q} = ${text} ${unit}`});
  };

  const done = LEDS.filter((l) => rows[l.id]?.vf != null && rows[l.id]?.ifm != null);
  const redVf = rows.red?.vf;
  const rTrue = redVf != null ? (12 - redVf) / 0.02 : null;
  const rOk = rTrue != null && near(num(ans.r), rTrue, 0.03);
  const glow = !burnt && iLed > 1e-4 ? Math.min(1, iLed / 0.02) : 0;
  const lx = 410;

  return (
    <PracticalSheet
      number={KEY}
      title="Test LEDs: Voltage Drop and Current"
      aim="To forward bias LEDs of different colours from a DC supply through a series resistor, and measure the voltage drop and the current with a multimeter."
      apparatus={['DC supply 0–12 V', 'LEDs 5 mm: red, yellow, green, blue, white', 'Resistors 1 kΩ, 470 Ω, 330 Ω', 'Digital multimeter', 'Breadboard and links']}
      procedure={[
        'Supply off. Build: supply + → R → link → LED anode (long lead); cathode (flat side) → supply −.',
        'Switch on. Multimeter on DC V: measure across the LED (VF) and across R (VR).',
        'Switch off, pull the link, set the meter to DC mA and put the probes in the link sockets. Switch on: read IF.',
        'Repeat for each colour. Then reverse the LED (supply 5 V or less) and check that no current flows.',
      ]}
      precautions={['Never connect an LED without a series resistor.', 'Do not exceed 5 V reverse voltage.', 'On mA the meter must be in series, never across a voltage.', 'Switch off before changing the circuit.']}
      viva={[
        {q: 'Why does a blue LED drop more voltage than a red one?', a: 'Blue light needs a wider bandgap material, so a higher forward voltage.'},
        {q: 'Why is a series resistor needed?', a: 'Above VF the LED current rises steeply; the resistor limits it.'},
        {q: 'How do you find the cathode of an LED?', a: 'Shorter lead, and the flat edge on the body.'},
        {q: 'Series R for 20 mA from 5 V with VF = 2 V?', a: '(5 − 2) ÷ 0.02 = 150 Ω.'},
      ]}
      tasks={[
        {label: 'VF and IF of three LED colours.', done: done.length >= 3},
        {label: 'Reverse bias: LED dark, IF ≈ 0.', done: revRow.v != null && revRow.ima != null && revRow.ima < 0.05},
        {label: 'Series R for 20 mA from 12 V with your red-LED VF.', done: rOk},
        {label: 'Print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={clsx(styles.controls, styles.noPrint)} style={{marginTop: 0, marginBottom: '0.6rem'}}>
          <div className={styles.seg} role="group" aria-label="LED">
            {LEDS.map((l) => (
              <button key={l.id} type="button" aria-pressed={led === l.id} onClick={() => change(() => setLed(l.id))}>
                {l.name}
              </button>
            ))}
            <button type="button" aria-pressed={rev} onClick={() => change(() => setRev((x) => !x))}>
              {rev ? 'Reversed' : 'Forward'} ⇄
            </button>
            {burnt && (
              <button type="button" onClick={() => change(() => (setDead((x) => ({...x, [led]: false})), setNote({kind: 'info', text: 'New LED fitted.'})))}>
                Replace LED
              </button>
            )}
          </div>
          <div className={styles.seg} role="group" aria-label="Series resistor">
            {RS.map((x) => (
              <button key={x} type="button" aria-pressed={r === x} onClick={() => change(() => setR(x))}>
                {x ? `${x} Ω` : 'No R (wire)'}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.controls} style={{marginTop: 0}}>
          <div>
            <div className={styles.kit}>
              <svg viewBox="0 0 520 250" role="img" aria-label={`DC supply, ${r ? `${r} Ω resistor` : 'wire'}, link ${linkIn ? 'fitted' : 'removed'}, ${L.name} LED ${rev ? 'reversed' : 'forward'}${burnt ? ', burnt' : ''}`}>
                <rect x={14} y={60} width={110} height={140} rx={8} fill="#31414c" stroke="#4d5f6b" />
                <text x={69} y={84} textAnchor="middle" style={kitLabel}>
                  DC 0–12 V
                </text>
                <rect x={28} y={94} width={82} height={30} rx={4} fill="#c8d7b4" />
                <text x={104} y={115} textAnchor="end" style={{fontFamily: 'var(--ifm-font-family-monospace)', fontSize: 16, fontWeight: 600, fill: '#1d2618'}}>
                  {power ? volts.toFixed(1) : ''}
                </text>
                <g
                  className={styles.clickable}
                  role="button"
                  tabIndex={0}
                  aria-label={power ? 'Supply on. Switch off' : 'Supply off. Switch on'}
                  onClick={() => (setPower((p) => !p), setNote(null))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setPower((p) => !p);
                    }
                  }}>
                  <rect x={34} y={140} width={70} height={34} rx={6} fill={power ? '#2f7d4a' : '#5b2b2b'} />
                  <text x={69} y={162} textAnchor="middle" style={kitLabel}>
                    {power ? 'ON' : 'OFF'}
                  </text>
                </g>
                <path className={styles.wire} d={`M124 90 H170 M240 90 H300 M340 90 H${lx} V118 M${lx} 172 V220 H150 V180 H124`} fill="none" />
                {r ? <AxialResistor cx={205} cy={90} len={40} dia={13} lead={15} bands={bandsFor(r, 5, false)} /> : <path d="M170 90 H240" stroke="#2b5fd1" strokeWidth={3} />}
                <text x={205} y={70} textAnchor="middle" style={kitLabel}>
                  {r ? `R ${r} Ω` : 'wire'}
                </text>
                <g
                  className={styles.clickable}
                  role="button"
                  tabIndex={0}
                  aria-label={`Link: ${linkIn ? 'fitted. Remove' : 'removed. Fit'}`}
                  onClick={() => change(() => setLinkIn((x) => !x))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      change(() => setLinkIn((x) => !x));
                    }
                  }}>
                  <rect x={292} y={64} width={56} height={44} fill="transparent" />
                  {linkIn && <path d="M300 90 Q320 72 340 90" stroke="#2b5fd1" strokeWidth={4} fill="none" strokeLinecap="round" />}
                </g>
                <text x={320} y={116} textAnchor="middle" style={{...kitLabel, fill: '#8fb4ff'}}>
                  link
                </text>
                {/* LED, anode up when forward */}
                {glow > 0 && <circle cx={lx} cy={140} r={34} fill={L.colour} opacity={0.45 * glow} />}
                <path d={`M${lx - 4} 118 V136 M${lx + 4} 118 V136 M${lx - 4} 118 H${lx + 4}`} stroke="#a9b1b6" strokeWidth={2} />
                <path d={`M${lx - 12} 168 V146 A12 12 0 0 1 ${lx + 12} 146 V168 Z`} fill={burnt ? '#2a1d17' : L.colour} opacity={burnt ? 1 : 0.35 + 0.65 * glow} stroke="#9aa3a8" />
                <rect x={lx - 15} y={166} width={30} height={5} rx={1} fill={burnt ? '#2a1d17' : L.colour} opacity={0.8} />
                                <text x={lx + 22} y={132} style={kitLabel}>
                  {rev ? 'K' : 'A'} (+)
                </text>
                <text x={lx + 22} y={186} style={kitLabel}>
                  {rev ? 'A' : 'K'}
                </text>
                <text x={lx + 22} y={150} style={{...kitLabel, fontSize: 10}}>
                  {L.name} LED
                </text>
                <text x={130} y={86} style={kitLabel}>
                  +
                </text>
                <text x={130} y={196} style={kitLabel}>
                  −
                </text>
                <ProbePoint id="P@sup" x={150} y={90} probes={probes} label="Supply +" r={5} />
                <ProbePoint id="N@sup" x={150} y={200} probes={probes} label="Supply −" r={5} />
                <ProbePoint id="X@r" x={260} y={90} probes={probes} label="Resistor right end" r={4} />
                <ProbePoint id="X@l" x={300} y={90} probes={probes} label="Link socket 1" r={4} />
                <ProbePoint id="A@l" x={340} y={90} probes={probes} label="Link socket 2" r={4} />
                <ProbePoint id="A@led" x={lx} y={108} probes={probes} label="LED top lead" r={5} />
                <ProbePoint id="N@led" x={lx} y={196} probes={probes} label="LED bottom lead" r={5} />
              </svg>
            </div>
            <ProbeBar probes={probes} hint="Tap the blue link to pull or fit it." />
          </div>
          <div style={{display: 'grid', gap: '0.6rem', alignContent: 'start'}}>
            <div className={clsx(styles.card, styles.noPrint)}>
              <Knob label="SUPPLY" value={`${volts.toFixed(1)} V`} onDec={() => setVolts((x) => Math.max(0, x - 0.5))} onInc={() => setVolts((x) => Math.min(12, x + 0.5))} />
            </div>
            <Multimeter
              name="Digital multimeter"
              fn={fn}
              functions={FNS}
              text={text}
              unit={unit}
              placement={isV && QTY[pair] ? `across ${QTY[pair] === 'VF' ? 'LED' : QTY[pair] === 'VR' ? 'R' : 'supply'}` : atLink && isA ? 'in series (link)' : undefined}
              onFunction={(f) => (setNote(null), setFn(f))}
              fault={fuse ? null : 'Fuse blown'}
              repairLabel="Replace fuse"
              onRepair={() => (setFuse(true), setNote(null))}
            />
            <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} onClick={noteIt}>
              Note reading
            </button>
          </div>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {done.length === 0 && Object.keys(rows).length === 0 ? (
          <Empty>No readings yet.</Empty>
        ) : (
          <Table
            head={['LED', 'Supply (V)', 'R (Ω)', 'VR (V)', 'VF (V)', 'IF (mA)']}
            rows={LEDS.filter((l) => rows[l.id]).map((l) => {
              const x = rows[l.id];
              return [l.name, x.setV.toFixed(1), x.r || '–', x.vr?.toFixed(2) ?? '–', x.vf?.toFixed(2) ?? '–', x.ifm?.toFixed(2) ?? '–'];
            })}
          />
        )}
        {(revRow.v != null || revRow.ima != null) && <Table head={['Reverse bias', 'V across LED (V)', 'I (mA)']} rows={[['LED reversed', revRow.v?.toFixed(2) ?? '–', revRow.ima?.toFixed(2) ?? '–']]} />}
      </Section>
      <Section title="Result">
        <Table
          head={['', 'Your value', 'Check']}
          rows={[
            [
              'R = (12 − VF red) ÷ 20 mA (Ω)',
              <input className={styles.input} style={{maxWidth: '5.5rem'}} inputMode="decimal" aria-label="Series resistor" value={ans.r ?? ''} onChange={(e) => setAns({r: e.target.value})} />,
              ans.r ? rTrue == null ? 'measure the red LED VF first' : <Verdict ok={rOk} /> : '–',
            ],
          ]}
        />
        <ResetKit
          onReset={() => {
            setRows({});
            setRevRow({});
            setAns({});
            setPrinted(false);
            setDead({});
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}
