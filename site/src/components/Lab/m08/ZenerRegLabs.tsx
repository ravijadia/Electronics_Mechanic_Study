import React, {useEffect, useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import XYGraph from '../XYGraph';
import useStoredState from '../useStoredState';
import {Knob} from '../Scope';
import {Empty, NoteBox, ResetKit, Section, Table, Verdict, useKitSeed, useRng, type Note} from '../kit';
import {fmtOhms, kitLabel, near} from '../m07/parts';
import styles from '../styles.module.css';

const num = (s?: string) => (s && s.trim() !== '' && !Number.isNaN(Number(s)) ? Number(s) : null);

/** A fixed panel meter: label, value, unit. */
export function PanelMeter({label, value, unit, off}: {label: string; value: string; unit: string; off?: boolean}) {
  return (
    <div className={styles.dmm} style={{padding: '0.45rem 0.6rem'}}>
      <div className={styles.dmmHead}>
        <span>{label}</span>
      </div>
      <div className={clsx(styles.lcd, off && styles.off)} role="status" aria-label={`${label} reading`}>
        <b>{off ? '' : value}</b>
        <span>{off ? '' : unit}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1.8.75 Zener diode voltage regulator
// ---------------------------------------------------------------------------

const RS = [100, 220, 470, 1000];
const RLS = [Infinity, 2200, 1000, 470, 220];

/** Shunt zener regulator: returns output voltage and zener / load currents. */
export function zenerReg(vin: number, rs: number, rl: number, vz: number, rz: number, open = false) {
  const gl = isFinite(rl) ? 1 / rl : 0;
  const v0 = vin / (1 + rs * gl);
  if (open || v0 <= vz) return {v: v0, iz: 0, il: v0 * gl};
  const v = (vin / rs + vz / rz) / (1 / rs + 1 / rz + gl);
  return {v, iz: (v - vz) / rz, il: v * gl};
}

interface ZPt {
  kind: 'line' | 'load';
  vin: number;
  rl: number;
  vout: number;
  il: number;
  iz: number;
}

export function ZenerRegulatorLab(): React.JSX.Element {
  const KEY = '1.8.75';
  const [seed, newKit] = useKitSeed(KEY);
  const vz = useRng(seed, (rnd) => 9.1 * (1 + (rnd() * 2 - 1) * 0.03));
  const rz = 7;
  const pmax = 0.5;
  const [vin, setVin] = useState(12);
  const [rs, setRs] = useState(470);
  const [rl, setRl] = useState(1000);
  const [power, setPower] = useState(false);
  const [burnt, setBurnt] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const [pts, setPts] = useStoredState<ZPt[]>(`lab:${KEY}:pts`, []);
  const [rsCalc, setRsCalc] = useStoredState(`lab:${KEY}:rs`, '');
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);

  const r = power ? zenerReg(vin, rs, rl, vz, rz, burnt) : {v: 0, iz: 0, il: 0};
  const hot = r.iz * r.v > pmax;
  useEffect(() => {
    if (!hot || burnt) return;
    setBurnt(true);
    setNote({kind: 'bad', text: <b>Smoke! Zener power {(r.iz * r.v).toFixed(2)} W is above 0.5 W. Rs is too small for this input.</b>});
  }, [hot]); // eslint-disable-line react-hooks/exhaustive-deps

  const change = (f: () => void) => {
    if (power) return setNote({kind: 'warn', text: 'Switch off before changing a resistor.'});
    setNote(null);
    f();
  };
  const noteIt = (kind: 'line' | 'load') => {
    if (!power) return setNote({kind: 'warn', text: 'Supply is off.'});
    if (burnt) return setNote({kind: 'warn', text: 'Replace the zener first.'});
    if (kind === 'line' && rl !== 1000) return setNote({kind: 'warn', text: 'Line regulation: keep RL = 1 kΩ.'});
    if (kind === 'load' && vin !== 15) return setNote({kind: 'warn', text: 'Load regulation: keep Vin = 15 V.'});
    const p: ZPt = {kind, vin, rl, vout: Number(r.v.toFixed(2)), il: Number((r.il * 1000).toFixed(2)), iz: Number((r.iz * 1000).toFixed(2))};
    setPts((x) => [...x.filter((y) => !(y.kind === kind && (kind === 'line' ? y.vin === vin : y.rl === rl))), p]);
    setNote({kind: 'good', text: `Vin ${vin} V, RL ${isFinite(rl) ? fmtOhms(rl) : 'open'}: Vout ${p.vout} V`});
  };

  const line = pts.filter((p) => p.kind === 'line').sort((a, b) => a.vin - b.vin);
  const load = pts.filter((p) => p.kind === 'load').sort((a, b) => a.il - b.il);
  const rsTrue = (15 - 9.1) / (0.02 + 0.005);

  return (
    <PracticalSheet
      number={KEY}
      title="Construct and Test a Zener Diode Voltage Regulator"
      aim="To build a zener shunt regulator, and test how its output changes with input voltage (line regulation) and with load current (load regulation)."
      apparatus={['DC supply 0–20 V', 'Zener diode 9.1 V, 0.5 W', 'Series resistors 100, 220, 470 Ω, 1 kΩ', 'Load resistors 2.2 kΩ, 1 kΩ, 470 Ω, 220 Ω', 'Panel meters: Vin, Vout, IL, IZ']}
      procedure={[
        'Calculate Rs for Vin = 15 V, IL(max) = 20 mA, IZ(min) = 5 mA: Rs = (Vin − Vz) ÷ (IL + IZ).',
        'Line regulation: RL = 1 kΩ. Vary Vin from 4 V to 20 V; note Vout.',
        'Load regulation: Vin = 15 V. Change RL from open to 220 Ω; note Vout and IL.',
        'Plot both graphs.',
      ]}
      precautions={['Check zener power (Vz × Iz) stays below its rating.', 'Never use a small Rs with a high input voltage.', 'Switch off before changing resistors.']}
      viva={[
        {q: 'Why is Rs needed?', a: 'It drops the extra input voltage and limits the zener current.'},
        {q: 'What happens to Iz when the load current rises?', a: 'Iz falls by the same amount; the total current through Rs stays nearly constant.'},
        {q: 'When does the regulator stop regulating?', a: 'When Vin is too low or the load current is so high that Iz falls below its minimum (knee) current.'},
        {q: 'Disadvantage of a zener regulator?', a: 'Poor efficiency, and only suitable for small load currents.'},
      ]}
      tasks={[
        {label: 'Calculate Rs.', done: near(num(rsCalc), rsTrue, 0.02)},
        {label: 'Line regulation: 6+ readings from below to above Vz.', done: line.length >= 6 && line.some((p) => p.vin < 9) && line.some((p) => p.vin >= 15)},
        {label: 'Load regulation: 4+ loads incl. open.', done: load.length >= 4 && load.some((p) => p.rl === null || !isFinite(p.rl) || p.il === 0)},
        {label: 'Print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div className={styles.kit}>
            <svg viewBox="0 0 520 220" role="img" aria-label={`Zener regulator: supply, Rs ${fmtOhms(rs)}, 9.1 V zener, load ${isFinite(rl) ? fmtOhms(rl) : 'open'}`}>
              <rect x={14} y={50} width={100} height={120} rx={8} fill="#31414c" stroke="#4d5f6b" />
              <text x={64} y={80} textAnchor="middle" style={kitLabel}>
                DC {power ? `${vin} V` : 'OFF'}
              </text>
              <path className={styles.wire} d="M114 70 H170 M240 70 H440 V100 M300 70 V100 M300 150 V190 M440 150 V190 H64 V170" fill="none" />
              <rect x={170} y={60} width={70} height={20} rx={4} fill="#e8d7b0" />
              <text x={205} y={52} textAnchor="middle" style={kitLabel}>
                Rs {fmtOhms(rs)}
              </text>
              <path d="M286 140 L314 140 L300 110 Z" fill={burnt ? '#3a2416' : '#e9eef0'} />
              <path d="M286 110 H314 M286 110 l-6 -5 M314 110 l6 5" stroke={burnt ? '#3a2416' : '#e9eef0'} strokeWidth={3} />
              <path d="M300 100 V110 M300 140 V150" stroke="var(--lab-wire)" strokeWidth={2.5} />
              <text x={320} y={130} style={kitLabel}>
                {burnt ? 'BURNT' : 'Vz 9.1 V'}
              </text>
              {isFinite(rl) ? <rect x={430} y={100} width={20} height={50} rx={3} fill="#e8d7b0" /> : <path d="M440 100 V115 M440 135 V150" stroke="var(--lab-wire)" strokeWidth={2.5} />}
              <text x={458} y={130} style={kitLabel}>
                RL {isFinite(rl) ? fmtOhms(rl) : 'open'}
              </text>
            </svg>
          </div>
          <div style={{display: 'grid', gap: '0.5rem', gridTemplateColumns: '1fr 1fr', alignContent: 'start'}}>
            <PanelMeter label="Vin" value={vin.toFixed(1)} unit="V" off={!power} />
            <PanelMeter label="Vout" value={r.v.toFixed(2)} unit="V" off={!power} />
            <PanelMeter label="IL" value={(r.il * 1000).toFixed(1)} unit="mA" off={!power} />
            <PanelMeter label="IZ" value={(r.iz * 1000).toFixed(1)} unit="mA" off={!power} />
          </div>
        </div>
        <div className={clsx(styles.controls, styles.noPrint)}>
          <div className={styles.card}>
            <Knob label="INPUT VOLTS" value={`${vin} V`} onDec={() => setVin((x) => Math.max(0, x - 1))} onInc={() => setVin((x) => Math.min(20, x + 1))} />
            <div className={styles.seg} role="group" aria-label="Supply" style={{marginTop: '0.4rem'}}>
              <button type="button" aria-pressed={power} onClick={() => (setPower((p) => !p), setNote(null))}>
                Supply {power ? 'ON' : 'OFF'}
              </button>
              {burnt && (
                <button type="button" onClick={() => change(() => (setBurnt(false), setNote({kind: 'info', text: 'New zener fitted.'})))}>
                  Replace zener
                </button>
              )}
            </div>
          </div>
          <div className={styles.card}>
            <span className={styles.label} style={{marginTop: 0}}>
              Rs
            </span>
            <div className={styles.seg} role="group" aria-label="Series resistor">
              {RS.map((x) => (
                <button key={x} type="button" aria-pressed={rs === x} onClick={() => change(() => setRs(x))}>
                  {fmtOhms(x)}
                </button>
              ))}
            </div>
            <span className={styles.label}>Load RL</span>
            <div className={styles.seg} role="group" aria-label="Load resistor">
              {RLS.map((x) => (
                <button key={x} type="button" aria-pressed={rl === x} onClick={() => setRl(x)}>
                  {isFinite(x) ? fmtOhms(x) : 'Open'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className={clsx(styles.seg, styles.noPrint)} role="group" aria-label="Note reading" style={{marginTop: '0.6rem'}}>
          <button type="button" onClick={() => noteIt('line')}>
            Note: line regulation
          </button>
          <button type="button" onClick={() => noteIt('load')}>
            Note: load regulation
          </button>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        {pts.length === 0 ? (
          <Empty>No readings yet.</Empty>
        ) : (
          <div className={styles.twoCol}>
            <Table head={['Vin (V)', 'Vout (V)', 'IZ (mA)']} caption="Line regulation (RL = 1 kΩ)" rows={line.map((p) => [p.vin, p.vout.toFixed(2), p.iz.toFixed(1)])} />
            <Table head={['RL', 'IL (mA)', 'Vout (V)', 'IZ (mA)']} caption="Load regulation (Vin = 15 V)" rows={load.map((p) => [p.rl && isFinite(p.rl) ? fmtOhms(p.rl) : 'Open', p.il.toFixed(1), p.vout.toFixed(2), p.iz.toFixed(1)])} />
          </div>
        )}
        {line.length > 1 && <XYGraph series={[{id: 'l', label: 'Vout', color: 'var(--s1)', marker: 'circle', points: line.map((p) => ({x: p.vin, y: p.vout}))}]} xLabel="Vin (V)" yLabel="Vout (V)" xUnit="V" yUnit="V" />}
        {load.length > 1 && <XYGraph series={[{id: 'd', label: 'Vout', color: 'var(--s2)', marker: 'square', points: load.map((p) => ({x: p.il, y: p.vout}))}]} xLabel="Load current (mA)" yLabel="Vout (V)" xUnit="mA" yUnit="V" yRange={[0, 12]} />}
      </Section>
      <Section title="Result">
        <Table
          head={['Rs = (15 − 9.1) ÷ (20 mA + 5 mA)', 'Your value (Ω)', 'Check']}
          rows={[['Series resistor', <input className={styles.input} style={{maxWidth: '6rem'}} inputMode="decimal" aria-label="Calculated Rs in ohms" value={rsCalc} onChange={(e) => setRsCalc(e.target.value)} />, rsCalc ? <Verdict ok={near(num(rsCalc), rsTrue, 0.02)} /> : '–']]}
        />
        <ResetKit
          onReset={() => {
            setPts([]);
            setRsCalc('');
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}

// ---------------------------------------------------------------------------
// 1.8.76 Percentage regulation of a regulated power supply
// ---------------------------------------------------------------------------

const LOAD_STEPS = [0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2];

interface Psu {
  vnl: number;
  rout: number;
  ilim: number;
}

function psuOut(p: Psu, iset: number): {v: number; i: number} {
  // The load is a rheostat set for `iset` at the nominal voltage.
  const rl = iset ? 12 / iset : Infinity;
  let v = isFinite(rl) ? p.vnl * (rl / (rl + p.rout)) : p.vnl;
  let i = isFinite(rl) ? v / rl : 0;
  if (i > p.ilim) {
    i = p.ilim;
    v = i * rl;
  }
  return {v, i};
}

interface PRow {
  psu: 'reg' | 'unreg';
  iset: number;
  v: number;
  i: number;
}

export function PercentRegulationLab(): React.JSX.Element {
  const KEY = '1.8.76';
  const [seed, newKit] = useKitSeed(KEY);
  const psus = useRng(seed, (rnd) => ({
    reg: {vnl: 12 + (rnd() - 0.5) * 0.1, rout: 0.04 + rnd() * 0.04, ilim: 1.1} as Psu,
    unreg: {vnl: 16.5 + rnd(), rout: 3.5 + rnd(), ilim: 3} as Psu,
  }));
  const [which, setWhich] = useState<'reg' | 'unreg'>('reg');
  const [iset, setIset] = useState(0);
  const [rows, setRows] = useStoredState<PRow[]>(`lab:${KEY}:rows`, []);
  const [ans, setAns] = useStoredState<{reg?: string; unreg?: string}>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);
  const o = psuOut(psus[which], iset);
  const limited = iset > psus[which].ilim;

  const noteIt = () => {
    const row: PRow = {psu: which, iset, v: Number(o.v.toFixed(2)), i: Number(o.i.toFixed(2))};
    setRows((r) => [...r.filter((x) => !(x.psu === which && x.iset === iset)), row]);
    setNote(limited ? {kind: 'warn', text: 'Current limit: the supply is overloaded and the voltage collapsed. Full load is 1 A.'} : {kind: 'good', text: `${row.i.toFixed(2)} A: ${row.v.toFixed(2)} V`});
  };

  const of = (p: 'reg' | 'unreg') => rows.filter((r) => r.psu === p).sort((a, b) => a.iset - b.iset);
  const pct = (p: 'reg' | 'unreg') => {
    const nl = of(p).find((r) => r.iset === 0);
    const fl = of(p).find((r) => r.iset === 1);
    return nl && fl ? ((nl.v - fl.v) / fl.v) * 100 : null;
  };
  const ok = (p: 'reg' | 'unreg') => {
    const t = pct(p);
    return t != null && num(ans[p]) != null && Math.abs(num(ans[p])! - t) <= Math.max(0.05, Math.abs(t) * 0.03);
  };

  return (
    <PracticalSheet
      number={KEY}
      title="Calculate the Percentage Regulation of a Regulated Power Supply"
      aim="To measure the output voltage of a regulated and an unregulated 12 V supply from no load to full load, and calculate their percentage regulation."
      apparatus={['Regulated power supply 12 V, 1 A', 'Unregulated 12 V adapter (transformer, bridge, capacitor)', 'Rheostat load, DC ammeter, DC voltmeter']}
      procedure={[
        'Connect the supply to the rheostat through the ammeter; voltmeter across the output.',
        'Note the output voltage at no load (rheostat open).',
        'Increase the load in steps up to full load (1 A); note V and I each time.',
        '% regulation = (V no-load − V full-load) ÷ V full-load × 100.',
        'Repeat for the unregulated adapter and compare.',
      ]}
      precautions={['Do not load the supply above its rated current.', 'Start with the rheostat at maximum resistance.', 'Use meters of suitable range.']}
      viva={[
        {q: 'What does a low percentage regulation mean?', a: 'The output voltage hardly changes with load: a good (stiff) supply.'},
        {q: 'Why does an unregulated supply’s voltage fall with load?', a: 'Drops in the transformer winding resistance and diodes, and more ripple as the capacitor discharges faster.'},
        {q: 'What is current limiting?', a: 'Protection that stops the current rising above a set value; the output voltage falls instead.'},
      ]}
      tasks={[
        {label: 'Regulated: no load to full load (5+ readings).', done: of('reg').filter((r) => r.iset <= 1).length >= 5 && !!pct('reg')},
        {label: 'Unregulated: no load to full load (5+ readings).', done: of('unreg').filter((r) => r.iset <= 1).length >= 5 && !!pct('unreg')},
        {label: 'Calculate % regulation of both.', done: ok('reg') && ok('unreg')},
        {label: 'Print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div className={styles.card}>
            <span className={styles.label} style={{marginTop: 0}}>
              Supply under test
            </span>
            <div className={styles.seg} role="group" aria-label="Supply under test">
              <button type="button" aria-pressed={which === 'reg'} onClick={() => (setWhich('reg'), setNote(null))}>
                Regulated PSU
              </button>
              <button type="button" aria-pressed={which === 'unreg'} onClick={() => (setWhich('unreg'), setNote(null))}>
                Unregulated adapter
              </button>
            </div>
            <span className={styles.label}>Rheostat load (set for)</span>
            <div className={styles.seg} role="group" aria-label="Load">
              {LOAD_STEPS.map((x) => (
                <button key={x} type="button" aria-pressed={iset === x} onClick={() => setIset(x)}>
                  {x === 0 ? 'No load' : `${x} A`}
                </button>
              ))}
            </div>
          </div>
          <div style={{display: 'grid', gap: '0.5rem', gridTemplateColumns: '1fr 1fr', alignContent: 'start'}}>
            <PanelMeter label="Voltmeter" value={o.v.toFixed(2)} unit="V" />
            <PanelMeter label="Ammeter" value={o.i.toFixed(2)} unit="A" />
            <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} style={{gridColumn: '1 / -1'}} onClick={noteIt}>
              Note reading
            </button>
          </div>
        </div>
        <NoteBox note={note} status={limited ? {kind: 'warn', text: 'Overload: current limited.'} : null} />
      </Section>
      <Section title="Observation table">
        {rows.length === 0 ? (
          <Empty>No readings yet.</Empty>
        ) : (
          <div className={styles.twoCol}>
            <Table caption="Regulated PSU" head={['I (A)', 'V (V)']} rows={of('reg').map((r) => [r.i.toFixed(2), r.v.toFixed(2)])} />
            <Table caption="Unregulated adapter" head={['I (A)', 'V (V)']} rows={of('unreg').map((r) => [r.i.toFixed(2), r.v.toFixed(2)])} />
          </div>
        )}
        {rows.length > 1 && (
          <XYGraph
            series={[
              {id: 'r', label: 'Regulated', color: 'var(--s1)', marker: 'circle', points: of('reg').map((r) => ({x: r.i, y: r.v}))},
              {id: 'u', label: 'Unregulated', color: 'var(--s2)', marker: 'square', points: of('unreg').map((r) => ({x: r.i, y: r.v}))},
            ]}
            xLabel="Load current (A)"
            yLabel="Output voltage (V)"
            xUnit="A"
            yUnit="V"
          />
        )}
      </Section>
      <Section title="Result">
        <Table
          head={['Supply', 'V no load', 'V full load', '% regulation', 'Check']}
          rows={(['reg', 'unreg'] as const).map((p) => [
            p === 'reg' ? 'Regulated' : 'Unregulated',
            of(p).find((r) => r.iset === 0)?.v.toFixed(2) ?? '–',
            of(p).find((r) => r.iset === 1)?.v.toFixed(2) ?? '–',
            <input className={styles.input} style={{maxWidth: '5rem'}} inputMode="decimal" aria-label={`${p} percentage regulation`} value={ans[p] ?? ''} onChange={(e) => setAns((a) => ({...a, [p]: e.target.value}))} />,
            ans[p] ? <Verdict ok={ok(p)} /> : '–',
          ])}
        />
        <ResetKit
          onReset={() => {
            setRows([]);
            setAns({});
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}
