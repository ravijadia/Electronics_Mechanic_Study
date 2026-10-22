import React, {useEffect, useState} from 'react';
import clsx from 'clsx';
import PracticalSheet, {type VivaQuestion} from '../PracticalSheet';
import XYGraph from '../XYGraph';
import useStoredState from '../useStoredState';
import {Knob} from '../Scope';
import {Empty, NoteBox, ResetKit, Section, Table, Verdict, useKitSeed, useRng, type Note} from '../kit';
import {kitLabel, near} from '../m07/parts';
import {PanelMeter} from '../m08/ZenerRegLabs';
import styles from '../styles.module.css';

const num = (s?: string) => (s && s.trim() !== '' && !Number.isNaN(Number(s)) ? Number(s) : null);

interface Dev {
  igbt: boolean;
  name: string;
  vth: number;
  k: number; // A/V²
  ron: number; // MOSFET Rds(on) (Ω)
  vsat: number; // IGBT knee voltage (V)
  rsat: number; // IGBT slope resistance (Ω)
  vmaxG: number;
}

/** Switch in series with a lamp load: returns current and voltage across the switch. */
function operate(d: Dev, vs: number, rl: number, vg: number): {i: number; v: number} {
  const ov = vg - d.vth;
  if (ov <= 0) return {i: 0, v: vs};
  const iSat = d.k * ov * ov;
  // Fully on (ohmic / saturated) current:
  const iOn = d.igbt ? Math.max(0, (vs - d.vsat) / (rl + d.rsat)) : vs / (rl + d.ron);
  const i = Math.min(iSat, iOn);
  return {i, v: vs - i * rl};
}

interface Pt {
  vg: number;
  i: number;
  v: number;
}

interface Spec {
  number: string;
  title: string;
  aim: string;
  apparatus: string[];
  procedure: string[];
  precautions: string[];
  viva: VivaQuestion[];
  dev: Dev;
  vs: number;
  rl: number;
  load: string;
  /** Thermal resistance without / with heat sink (°C/W). */
  theta: [number, number];
}

function SwitchLoadLab({s}: {s: Spec}): React.JSX.Element {
  const KEY = s.number;
  const [seed, newKit] = useKitSeed(KEY);
  const dev = useRng(seed, (rnd) => ({...s.dev, vth: s.dev.vth + (rnd() * 2 - 1) * 0.4}));
  const [vgSet, setVgSet] = useState(0);
  const [connected, setConnected] = useState(true);
  const [pulldown, setPulldown] = useState(true);
  const [heatsink, setHeatsink] = useState(false);
  const [power, setPower] = useState(false);
  const [held, setHeld] = useState(0); // gate voltage left on a floating gate
  const [dead, setDead] = useState(false);
  const [tj, setTj] = useState(30);
  const [pts, setPts] = useStoredState<Pt[]>(`lab:${KEY}:pts`, []);
  const [seen, setSeen] = useStoredState<Record<string, boolean>>(`lab:${KEY}:seen`, {});
  const [ans, setAns] = useStoredState<{vth?: string; on?: string}>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);

  const vg = !power ? 0 : connected ? vgSet : pulldown ? 0 : held;
  const o = dead ? {i: s.vs / s.rl, v: 0} : power ? operate(dev, s.vs, s.rl, vg) : {i: 0, v: 0};
  const pd = o.i * o.v;
  const level = Math.min(1, ((o.i * s.rl) / s.vs) ** 2);
  // 0.5 V steps up to a whole-volt boundary just above the threshold, then 1 V steps, so 10 V and 15 V can be set exactly.
  const fine = Math.ceil(dev.vth + 2);

  // Junction temperature settles towards Tamb + P·θ.
  useEffect(() => {
    const id = window.setInterval(() => {
      setTj((t) => {
        const target = 30 + pd * s.theta[heatsink ? 1 : 0];
        return t + (target - t) * 0.12;
      });
    }, 200);
    return () => window.clearInterval(id);
  }, [pd, heatsink, s.theta]);

  useEffect(() => {
    if (tj > 160 && !dead) {
      setDead(true);
      setSeen((x) => ({...x, hot: true}));
      setNote({kind: 'bad', text: <b>Overheated: the device failed short-circuit and the lamp is stuck ON. Drive the gate fully and fit a heat sink.</b>});
    } else if (tj > 100 && !seen.hot) setSeen((x) => ({...x, hot: true}));
  }, [tj]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (power && connected && vgSet > dev.vmaxG && !dead) {
      setDead(true);
      setNote({kind: 'bad', text: <b>Gate voltage above {dev.vmaxG} V: the gate oxide punctured. The device is destroyed.</b>});
    }
  }, [power, connected, vgSet]); // eslint-disable-line react-hooks/exhaustive-deps

  const disconnect = () => {
    if (!power) return setConnected((c) => !c);
    if (connected) {
      setHeld(vgSet);
      setConnected(false);
      if (!pulldown && vgSet > dev.vth + 1) {
        setSeen((x) => ({...x, floating: true}));
        setNote({kind: 'warn', text: 'Input removed but the lamp stays ON: the gate holds its charge. Fit a pull-down resistor.'});
      } else if (pulldown) {
        setSeen((x) => ({...x, pulldownOk: vgSet > dev.vth + 1 ? true : x.pulldownOk}));
        setNote({kind: 'info', text: 'Input removed: the pull-down discharges the gate and the device turns off.'});
      } else setNote({kind: 'info', text: 'Gate was below the threshold: nothing changes. Raise the drive first.'});
    } else setConnected(true);
  };
  const noteIt = () => {
    if (!power) return setNote({kind: 'warn', text: 'Supply is off.'});
    if (!connected) return setNote({kind: 'warn', text: 'Reconnect the gate drive for the transfer table.'});
    if (dead) return setNote({kind: 'warn', text: 'Replace the device first.'});
    setPts((p) => [...p.filter((x) => Math.abs(x.vg - vgSet) > 0.01), {vg: vgSet, i: Number(o.i.toFixed(3)), v: Number(o.v.toFixed(3))}].sort((a, b) => a.vg - b.vg));
    setNote({kind: 'good', text: `VG ${vgSet.toFixed(1)} V: I ${o.i.toFixed(3)} A, V ${o.v.toFixed(2)} V`});
  };

  const S = s.dev.igbt ? {g: 'VGE', d: 'VCE', i: 'IC'} : {g: 'VGS', d: 'VDS', i: 'ID'};
  const full = pts.find((p) => p.vg >= (s.dev.igbt ? 15 : 10));
  const onTrue = full ? (s.dev.igbt ? full.v : (full.v / full.i) * 1000) : null;
  const vthOk = num(ans.vth) != null && Math.abs(num(ans.vth)! - dev.vth) <= 0.5;
  const onOk = onTrue != null && near(num(ans.on), onTrue, 0.05);
  const spread = pts.length >= 8 && pts.some((p) => p.i === 0) && !!full;

  return (
    <PracticalSheet
      number={s.number}
      title={s.title}
      aim={s.aim}
      apparatus={s.apparatus}
      procedure={s.procedure}
      precautions={s.precautions}
      viva={s.viva}
      steps={[
        {label: 'Switch the supply ON.', hint: 'Pull-down fitted, drive connected, gate drive at 0 V.', done: power || pts.length > 0},
        {
          label: `Raise the gate drive in steps and note each reading. Readings: ${Math.min(pts.length, 8)}/8`,
          hint: `From OFF to fully ON: include 0 V and ${S.g} = ${s.dev.igbt ? 15 : 10} V.`,
          done: spread,
        },
        {label: `Find the threshold ${S.g}(th) and enter it.`, hint: `The ${S.g} where ${S.i} starts to flow.`, done: vthOk},
        {
          label: s.dev.igbt ? 'Find VCE(sat) at VGE = 15 V and enter it.' : 'Find RDS(on) at VGS = 10 V and enter it (mΩ).',
          hint: s.dev.igbt ? 'Use the reading at 15 V.' : 'RDS(on) = VDS ÷ ID, from the reading at 10 V.',
          done: onOk,
        },
        ...(s.dev.igbt
          ? [
              {
                label: 'Hold the gate just above the threshold, with no heat sink, and watch the temperature.',
                hint: 'About 1 V above threshold. It overheats: switch off, then Replace device.',
                done: !!seen.hot,
              },
            ]
          : []),
        {label: 'Remove the pull-down, drive the gate ON, then remove the drive.', hint: 'Switch OFF before removing the pull-down. The lamp stays ON.', done: !!seen.floating},
        {label: 'Refit the pull-down and remove the drive again.', hint: 'Drive the gate above threshold first. The lamp turns off.', done: !!seen.pulldownOk},
        {label: 'Enter your details and print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div className={styles.kit}>
            <svg viewBox="0 0 340 230" role="img" aria-label={`${s.dev.name} switching a ${s.load}`}>
              <path className={styles.wire} d="M230 20 V46 M230 100 V112 M230 150 V200 H40 M40 20 H230 M120 130 H170 M150 130 V160 M150 190 V200" fill="none" />
              <text x={40} y={14} style={kitLabel}>
                +{s.vs} V {power ? 'ON' : 'OFF'}
              </text>
              {level > 0.02 && <circle cx={230} cy={72} r={34} fill="#ffd34d" opacity={0.35 * level} />}
              <circle cx={230} cy={72} r={22} fill={level > 0.02 ? `rgba(255,211,77,${0.35 + 0.65 * level})` : '#4a5560'} stroke="#9aa3a8" strokeWidth={2} />
              <text x={262} y={76} style={{...kitLabel, fontSize: 10}}>
                {s.load}
              </text>
              <path d="M200 112 V148 M210 112 V148 M210 120 H230 M210 140 H230 M190 130 H200" stroke={dead ? '#c8352a' : 'var(--lab-wire)'} strokeWidth={2.5} />
              <text x={240} y={136} style={{...kitLabel, fontSize: 10}}>
                {s.dev.name}
              </text>
              <rect x={130} y={120} width={40} height={20} rx={3} fill="#e8d7b0" />
              <text x={150} y={114} textAnchor="middle" style={{...kitLabel, fontSize: 9}}>
                Rg
              </text>
              {pulldown ? <rect x={142} y={160} width={16} height={30} rx={3} fill="#e8d7b0" /> : <path d="M150 160 V170 M150 180 V190" stroke="#ff8c1a" strokeWidth={2} strokeDasharray="3 3" />}
              <text x={164} y={180} style={{...kitLabel, fontSize: 9}}>
                {pulldown ? '100k' : 'no pull-down'}
              </text>
              <path d={connected ? 'M60 130 H120' : 'M60 130 L100 112'} stroke="#e9eef0" strokeWidth={3} />
              <circle cx={60} cy={130} r={4} fill="#e9eef0" />
              <text x={56} y={156} textAnchor="middle" style={{...kitLabel, fontSize: 9}}>
                gate drive
              </text>
              <text x={300} y={220} textAnchor="end" style={{...kitLabel, fontSize: 10, fill: tj > 100 ? '#ff6b5a' : '#9fb0ba'}}>
                {heatsink ? 'heat sink · ' : ''}
                {Math.round(tj)} °C
              </text>
            </svg>
          </div>
          <div style={{display: 'grid', gap: '0.5rem', gridTemplateColumns: '1fr 1fr', alignContent: 'start'}}>
            <PanelMeter label={S.g} value={vg.toFixed(1)} unit="V" off={!power} />
            <PanelMeter label={S.i} value={o.i.toFixed(3)} unit="A" off={!power} />
            <PanelMeter label={S.d} value={o.v.toFixed(3)} unit="V" off={!power} />
            <PanelMeter label="P in device" value={pd.toFixed(1)} unit="W" off={!power} />
            <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} style={{gridColumn: '1 / -1'}} onClick={noteIt}>
              Note reading
            </button>
          </div>
        </div>
        <div className={clsx(styles.controls, styles.noPrint)}>
          <div className={styles.card}>
            <Knob label="GATE DRIVE" value={`${vgSet.toFixed(1)} V`} onDec={() => setVgSet((x) => Math.max(0, Math.round((x - (x <= fine ? 0.5 : 1)) * 10) / 10))} onInc={() => setVgSet((x) => Math.min(24, Math.round((x + (x < fine ? 0.5 : 1)) * 10) / 10))} />
            <div className={styles.seg} role="group" aria-label="Gate drive lead" style={{marginTop: '0.4rem'}}>
              <button type="button" aria-pressed={connected} onClick={disconnect}>
                Drive {connected ? 'connected' : 'removed'}
              </button>
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.seg} role="group" aria-label="Circuit options">
              <button type="button" aria-pressed={pulldown} onClick={() => (power ? setNote({kind: 'warn', text: 'Switch off first.'}) : setPulldown((p) => !p))}>
                Pull-down {pulldown ? 'fitted' : 'removed'}
              </button>
              <button type="button" aria-pressed={heatsink} onClick={() => (power ? setNote({kind: 'warn', text: 'Switch off first.'}) : setHeatsink((h) => !h))}>
                Heat sink {heatsink ? 'fitted' : 'off'}
              </button>
              <button type="button" aria-pressed={power} onClick={() => (setPower((p) => !p), setConnected(true), setNote(null))}>
                Supply {power ? 'ON' : 'OFF'}
              </button>
              {dead && (
                <button type="button" onClick={() => (power ? setNote({kind: 'warn', text: 'Switch off first.'}) : (setDead(false), setTj(30), setNote({kind: 'info', text: 'New device fitted.'})))}>
                  Replace device
                </button>
              )}
            </div>
          </div>
        </div>
        <NoteBox note={note} status={power && pd > 3 && !dead ? {kind: 'warn', text: `Device dissipating ${pd.toFixed(1)} W: it is half-on.`} : null} />
      </Section>
      <Section title="Observation table">
        {pts.length === 0 ? (
          <Empty>No readings yet.</Empty>
        ) : (
          <Table head={[`${S.g} (V)`, `${S.i} (A)`, `${S.d} (V)`]} rows={pts.map((p) => [p.vg.toFixed(1), p.i.toFixed(3), p.v.toFixed(3)])} />
        )}
        {pts.length > 1 && <XYGraph series={[{id: 't', label: S.i, color: 'var(--s1)', marker: 'circle', points: pts.map((p) => ({x: p.vg, y: p.i}))}]} xLabel={`${S.g} (V)`} yLabel={`${S.i} (A)`} xUnit="V" yUnit="A" />}
      </Section>
      <Section title="Result">
        <Table
          head={['', 'Your value', 'Check']}
          rows={[
            [`Threshold ${S.g}(th) (V)`, <input className={styles.input} style={{maxWidth: '5rem'}} inputMode="decimal" aria-label="Threshold voltage" value={ans.vth ?? ''} onChange={(e) => setAns((a) => ({...a, vth: e.target.value}))} />, ans.vth ? <Verdict ok={vthOk} /> : '–'],
            [
              s.dev.igbt ? 'VCE(sat) at VGE = 15 V (V)' : 'RDS(on) at VGS = 10 V (mΩ)',
              <input className={styles.input} style={{maxWidth: '5rem'}} inputMode="decimal" aria-label="On-state value" value={ans.on ?? ''} onChange={(e) => setAns((a) => ({...a, on: e.target.value}))} />,
              ans.on ? onTrue == null ? `note a reading at ${s.dev.igbt ? 15 : 10} V first` : <Verdict ok={onOk} /> : '–',
            ],
          ]}
        />
        <ResetKit
          onReset={() => {
            setPts([]);
            setSeen({});
            setAns({});
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}

export function MosfetLoadLab(): React.JSX.Element {
  return (
    <SwitchLoadLab
      s={{
        number: '1.10.102',
        title: 'MOSFET Test Circuit with a Small Load',
        aim: 'To switch a 12 V lamp with an N-channel power MOSFET, plot ID against VGS, find the threshold voltage and RDS(on), and see why a gate pull-down resistor is needed.',
        apparatus: ['IRFZ44N MOSFET', '12 V supply, 12 V 5 W lamp', 'Gate drive 0–24 V through Rg 1 kΩ, pull-down 100 kΩ', 'Panel meters VGS, ID, VDS'],
        procedure: [
          'Increase VGS in 0.5 V steps from 0. Note ID and VDS each time.',
          'Threshold: the VGS where ID starts to flow.',
          'At VGS = 10 V the MOSFET is fully on: RDS(on) = VDS ÷ ID.',
          'Remove the gate drive with and without the pull-down resistor and watch the lamp.',
        ],
        precautions: ['Never exceed ±20 V between gate and source.', 'Always fit a gate pull-down resistor.', 'Do not leave the MOSFET half-on: it gets hot.'],
        viva: [
          {q: 'Why does the lamp stay on when the gate is left open?', a: 'The gate capacitance keeps its charge. A pull-down resistor discharges it.'},
          {q: 'What is RDS(on)?', a: 'The drain–source resistance when the MOSFET is fully on; a few milliohms for power MOSFETs.'},
          {q: 'Why is a MOSFET called voltage-controlled?', a: 'Its drain current is controlled by VGS; almost no gate current flows.'},
        ],
        dev: {igbt: false, name: 'IRFZ44N', vth: 3, k: 2.5, ron: 0.022, vsat: 0, rsat: 0, vmaxG: 20},
        vs: 12,
        rl: 28.8,
        load: '12 V 5 W',
        theta: [62, 6],
      }}
    />
  );
}

export function IgbtLoadLab(): React.JSX.Element {
  return (
    <SwitchLoadLab
      s={{
        number: '1.10.104',
        title: 'IGBT Test Circuit with a Small Load',
        aim: 'To switch a 24 V lamp with an IGBT, plot IC against VGE, find the threshold and VCE(sat), and see the heating when it is driven only half-on.',
        apparatus: ['IGBT FGA25N120 (or IRG4BC30U)', '24 V supply, 24 V 25 W lamp', 'Gate drive 0–24 V, Rg 1 kΩ, pull-down 100 kΩ', 'Heat sink', 'Panel meters VGE, IC, VCE'],
        procedure: [
          'Increase VGE in steps from 0. Note IC and VCE.',
          'Threshold: where IC starts. Fully on at VGE = 15 V: note VCE(sat).',
          'Hold VGE just above the threshold for a while without the heat sink: watch the temperature.',
          'Remove the gate drive with and without the pull-down resistor.',
        ],
        precautions: ['Never exceed ±20 V on the gate.', 'Drive the gate fully (15 V) for switching; half-on means high losses.', 'Fit a heat sink.'],
        viva: [
          {q: 'Why is VCE(sat) of an IGBT about 1–2 V?', a: 'It has a PN junction in its output (like a BJT), so there is always a junction drop.'},
          {q: 'Why does an IGBT need 15 V on the gate?', a: 'Its threshold is about 5–6 V; 15 V makes sure it is fully on with low VCE.'},
          {q: 'Why does the IGBT get hot when half-on?', a: 'Both VCE and IC are large at the same time, so P = VCE × IC is high.'},
        ],
        dev: {igbt: true, name: 'IGBT', vth: 5.5, k: 0.6, ron: 0, vsat: 0.85, rsat: 0.15, vmaxG: 20},
        vs: 24,
        rl: 23,
        load: '24 V 25 W',
        theta: [40, 5],
      }}
    />
  );
}
