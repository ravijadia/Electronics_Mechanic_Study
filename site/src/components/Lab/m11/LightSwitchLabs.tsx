import React, {useEffect, useState} from 'react';
import clsx from 'clsx';
import PracticalSheet, {type VivaQuestion} from '../PracticalSheet';
import {GU_LIGHTSWITCH} from './gu';
import Multimeter from '../Multimeter';
import XYGraph from '../XYGraph';
import useStoredState from '../useStoredState';
import {Knob} from '../Scope';
import {Empty, NoteBox, ResetKit, Section, Table, Verdict, useKitSeed, useRng, type Note} from '../kit';
import {kitLabel, near} from '../m07/parts';
import {PanelMeter} from '../m08/ZenerRegLabs';
import {DROP_A, LUX_STEPS, PICK_A, pickLux, sensorDrive, type SensorSpec} from './opto';
import styles from '../styles.module.css';

const num = (s?: string) => (s && s.trim() !== '' && !Number.isNaN(Number(s)) ? Number(s) : null);

// ---------------------------------------------------------------------------
// 1.11.107 / 1.11.108 Switch a lamp with a photodiode / phototransistor
// ---------------------------------------------------------------------------

const RANGES: Record<string, {label: string; scale: number; fs: number; dp: number; unit: string}> = {
  uA200: {label: 'DC µA 200', scale: 1e6, fs: 200, dp: 1, unit: 'µA'},
  mA2: {label: 'DC mA 2', scale: 1e3, fs: 2, dp: 3, unit: 'mA'},
  mA20: {label: 'DC mA 20', scale: 1e3, fs: 20, dp: 2, unit: 'mA'},
};

interface Pt {
  lux: number;
  ua: number;
  relay: boolean;
  lamp: boolean;
}

interface Spec {
  number: string;
  title: string;
  aim: string;
  apparatus: string[];
  procedure: string[];
  precautions: string[];
  viva: VivaQuestion[];
  sensor: SensorSpec;
  ranges: string[];
}

function LightSwitchLab({s}: {s: Spec}): React.JSX.Element {
  const KEY = s.number;
  const [seed, newKit] = useKitSeed(KEY);
  const sen = useRng<SensorSpec>(seed, (rnd) => ({...s.sensor, sens: s.sensor.sens * (1 + (rnd() * 2 - 1) * 0.12), hfe: s.sensor.hfe * (1 + (rnd() * 2 - 1) * 0.2)}));
  const [li, setLi] = useState(LUX_STEPS.indexOf(100));
  const [pos, setPos] = useState(50);
  const [power, setPower] = useState(false);
  const [fn, setFn] = useState('off');
  const [diode, setDiode] = useState(true);
  const [nc, setNc] = useState(false);
  const [picked, setPicked] = useState(false);
  const [dead, setDead] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const [pts, setPts] = useStoredState<Pt[]>(`lab:${KEY}:pts`, []);
  const [seen, setSeen] = useStoredState<{pickPos?: number; ncDark?: boolean; ncBright?: boolean}>(`lab:${KEY}:seen`, {});
  const [ans, setAns] = useStoredState<{sens?: string; lux?: string}>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);

  const lux = LUX_STEPS[li];
  // A meter switched OFF in series opens the sensor circuit.
  const closed = power && fn !== 'off';
  const dr = closed ? sensorDrive(sen, lux, pos) : {is: 0, ic: 0};
  const ic = dead ? 0 : dr.ic;
  const lampOn = nc ? !picked : picked;

  useEffect(() => {
    if (!picked && ic >= PICK_A) {
      setPicked(true);
      setSeen((x) => ({...x, pickPos: pos}));
    } else if (picked && ic < DROP_A) {
      setPicked(false);
      if (!diode && power) {
        setDead(true);
        setNote({kind: 'bad', text: <b>Crack! The relay coil's back-EMF spike destroyed the {s.sensor.pt ? 'BC547' : 'driver transistor'}. Fit the freewheel diode.</b>});
      }
    }
  }, [ic]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!power || !nc) return;
    if (lampOn && lux <= 20) setSeen((x) => ({...x, ncDark: true}));
    if (!lampOn && picked) setSeen((x) => ({...x, ncBright: true}));
  }, [power, nc, lampOn, lux, picked]); // eslint-disable-line react-hooks/exhaustive-deps

  const change = (f: () => void) => {
    if (power) return setNote({kind: 'warn', text: 'Switch off first.'});
    setNote(null);
    f();
  };

  const R = RANGES[fn];
  const reading = dr.is * (R?.scale ?? 0);
  const text = !R ? '' : reading >= R.fs ? 'OL' : reading.toFixed(R.dp);

  const noteIt = () => {
    if (!power) return setNote({kind: 'warn', text: 'Supply is off.'});
    if (!R) return setNote({kind: 'warn', text: 'Select a meter range.'});
    if (text === 'OL') return setNote({kind: 'warn', text: 'OL: change range.'});
    const ua = R.unit === 'mA' ? Number(text) * 1000 : Number(text);
    setPts((p) => [...p.filter((x) => x.lux !== lux), {lux, ua, relay: picked, lamp: lampOn}].sort((a, b) => a.lux - b.lux));
    setNote({kind: 'good', text: `${lux} lx: ${text} ${R.unit}`});
  };

  const thr = pickLux(sen, pos);
  const sensOk = near(num(ans.sens), sen.sens * 1e6, 0.12);
  const luxOk = num(ans.lux) != null && Math.abs(num(ans.lux)! - thr) <= Math.max(15, thr * 0.1) && thr >= 150 && thr <= 250 && seen.pickPos === pos;
  const spread = pts.length >= 6 && pts.some((p) => p.lux === 0) && pts.some((p) => p.lux >= 800);
  const rays = lux / 1000;
  const pt = s.sensor.pt;

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
        {label: 'Choose a meter range and switch the supply ON.', hint: 'The meter is in series with the sensor. OFF opens the circuit.', done: power || pts.length > 0},
        {label: `Raise the LIGHT in steps and note each sensor current. Readings: ${Math.min(pts.length, 6)}/6`, hint: 'From dark (0 lx) up to 800 lx or more. Press Note reading each time.', done: spread},
        {label: 'Calculate the sensitivity (µA per lux) and enter it.', hint: 'ΔI ÷ Δlux, from the table.', done: sensOk},
        {label: 'Set PRESET VR so the relay picks up at 150–250 lx, and enter that level.', hint: 'Raise the light slowly and watch the relay pick up.', done: luxOk},
        {label: 'Street light: put the lamp on NC and check ON in the dark, OFF in bright light.', hint: 'Switch off to change NO/NC. Then vary the light.', done: !!seen.ncDark && !!seen.ncBright},
        {label: 'Enter your details and print or save the record.', done: printed},
      ]}
      gu={GU_LIGHTSWITCH[s.number]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div className={styles.kit}>
            <svg viewBox="0 0 520 260" role="img" aria-label={`${s.sensor.name} light switch: ${lux} lux, relay ${picked ? 'on' : 'off'}, lamp ${lampOn ? 'on' : 'off'}${dead ? ', driver transistor failed' : ''}`}>
              {/* Light source */}
              <circle cx={36} cy={130} r={16} fill={lux > 0 ? `rgba(255,211,77,${0.35 + 0.65 * rays})` : '#4a5560'} stroke="#9aa3a8" strokeWidth={2} />
              {lux > 0 && [-16, 0, 16].map((k) => <path key={k} d={`M58 ${130 + k * 0.6} L92 ${130 + k}`} stroke="#ffd34d" strokeWidth={2} opacity={0.3 + 0.7 * rays} />)}
              <text x={36} y={164} textAnchor="middle" style={{...kitLabel, fontSize: 9}}>
                light
              </text>
              {/* +12 V rail and ground */}
              <path className={styles.wire} d="M120 30 H300 M120 30 V44 M120 80 V100 M120 160 V200 M120 200 H230 M120 200 V210 M120 240 V246 H300 M300 30 V60 M300 110 V150 M300 190 V246" fill="none" />
              <text x={124} y={22} style={kitLabel}>
                +12 V {power ? 'ON' : 'OFF'}
              </text>
              <text x={240} y={258} style={{...kitLabel, fontSize: 9}}>
                0 V
              </text>
              {/* Series meter */}
              <circle cx={120} cy={62} r={18} fill="#f2c230" stroke="#c99a10" strokeWidth={2} />
              <text x={120} y={67} textAnchor="middle" style={{fill: '#222', fontWeight: 800, fontSize: 12}}>
                µA
              </text>
              {/* Sensor */}
              {pt ? (
                <g>
                  <circle cx={120} cy={130} r={20} fill="none" stroke="var(--lab-wire)" strokeWidth={2} />
                  <path d="M108 118 V142 M108 124 L122 112 V100 M108 136 L122 148 V160 M117 144 L122 148 L116 149" stroke="var(--lab-wire)" strokeWidth={2} fill="none" />
                </g>
              ) : (
                <g>
                  <path d="M120 100 V118 M108 118 H132 M108 140 L120 118 L132 140 Z M120 140 V160" stroke="var(--lab-wire)" strokeWidth={2} fill="none" />
                </g>
              )}
              <path d="M84 116 L100 124 M84 132 L100 140 M95 120 L100 124 L94 126 M95 136 L100 140 L94 142" stroke="#ffd34d" strokeWidth={1.6} fill="none" />
              <text x={146} y={126} style={{...kitLabel, fontSize: 10}}>
                {s.sensor.name}
              </text>
              {/* Preset */}
              <rect x={112} y={210} width={16} height={30} rx={3} fill="#e8d7b0" />
              <path d="M140 236 L104 214" stroke="#ff8c1a" strokeWidth={1.6} />
              <text x={88} y={232} textAnchor="end" style={{...kitLabel, fontSize: 9}}>
                VR
              </text>
              {/* Driver transistor */}
              <circle cx={252} cy={170} r={18} fill="none" stroke={dead ? '#c8352a' : 'var(--lab-wire)'} strokeWidth={2} />
              <path d="M230 200 V170 H244 M244 158 V182 M244 164 L300 150 M244 176 L300 190" stroke={dead ? '#c8352a' : 'var(--lab-wire)'} strokeWidth={2} fill="none" />
              <text x={200} y={164} textAnchor="end" style={{...kitLabel, fontSize: 9}}>
                {s.sensor.driver}
              </text>
              {/* Relay coil and freewheel diode */}
              <rect x={290} y={60} width={20} height={50} rx={3} fill={picked ? '#3a6ea5' : '#31414c'} stroke="#9aa3a8" />
              <text x={300} y={54} textAnchor="middle" style={{...kitLabel, fontSize: 9}}>
                relay
              </text>
              {diode ? (
                <path d="M300 56 H336 V114 H300 M326 78 H346 M326 96 L336 78 L346 96 Z" stroke="var(--lab-wire)" strokeWidth={1.8} fill="none" />
              ) : (
                <path d="M300 56 H336 M336 114 H300" stroke="#ff8c1a" strokeWidth={1.8} strokeDasharray="3 3" />
              )}
              <text x={352} y={90} style={{...kitLabel, fontSize: 9}}>
                {diode ? 'D' : 'no D'}
              </text>
              {/* Contacts and lamp */}
              <path d="M300 85 H380" stroke="#6b7a84" strokeDasharray="2 3" />
              <circle cx={400} cy={200} r={4} fill="#e9eef0" />
              <circle cx={380} cy={150} r={4} fill="#e9eef0" />
              <circle cx={420} cy={150} r={4} fill="#e9eef0" />
              <text x={380} y={140} textAnchor="middle" style={{...kitLabel, fontSize: 9}}>
                NC
              </text>
              <text x={420} y={140} textAnchor="middle" style={{...kitLabel, fontSize: 9}}>
                NO
              </text>
              <text x={400} y={218} textAnchor="middle" style={{...kitLabel, fontSize: 9}}>
                COM
              </text>
              <path d={picked ? 'M400 200 L420 154' : 'M400 200 L380 154'} stroke="#e9eef0" strokeWidth={3} />
              <path className={styles.wire} d={`M${nc ? 380 : 420} 150 V110 H470 V96 M470 64 V40 H500 V230 H400 V204`} fill="none" />
              <text x={504} y={140} style={{...kitLabel, fontSize: 9}} transform="rotate(90 504 140)">
                230 V AC
              </text>
              {lampOn && <circle cx={470} cy={80} r={30} fill="#ffd34d" opacity={0.35} />}
              <circle cx={470} cy={80} r={16} fill={lampOn ? '#ffd34d' : '#4a5560'} stroke="#9aa3a8" strokeWidth={2} />
            </svg>
          </div>
          <div style={{display: 'grid', gap: '0.5rem', alignContent: 'start'}}>
            <PanelMeter label="Lux meter" value={String(lux)} unit="lx" />
            <Multimeter
              name="Meter (in series with sensor)"
              fn={fn}
              functions={[{fn: 'off', label: 'OFF'}, ...s.ranges.map((r) => ({fn: r, label: RANGES[r].label}))]}
              text={power ? text : R ? (0).toFixed(R.dp) : ''}
              unit={R?.unit ?? ''}
              onFunction={(f) => (setNote(null), setFn(f))}
            />
            <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} onClick={noteIt}>
              Note reading
            </button>
          </div>
        </div>
        <div className={clsx(styles.controls, styles.noPrint)}>
          <div className={styles.card}>
            <Knob label="LIGHT" value={`${lux} lx`} onDec={() => setLi((x) => Math.max(0, x - 1))} onInc={() => setLi((x) => Math.min(LUX_STEPS.length - 1, x + 1))} />
            <Knob label="PRESET VR" value={`${pos} %`} onDec={() => setPos((x) => Math.max(0, x - 5))} onInc={() => setPos((x) => Math.min(100, x + 5))} />
          </div>
          <div className={styles.card}>
            <div className={styles.seg} role="group" aria-label="Circuit options">
              <button type="button" aria-pressed={diode} onClick={() => change(() => setDiode((x) => !x))}>
                Freewheel diode {diode ? 'fitted' : 'removed'}
              </button>
              <button type="button" aria-pressed={nc} onClick={() => change(() => setNc((x) => !x))}>
                Lamp on {nc ? 'NC' : 'NO'}
              </button>
              <button type="button" aria-pressed={power} onClick={() => (setPower((p) => !p), setNote(null))}>
                Supply {power ? 'ON' : 'OFF'}
              </button>
              {dead && (
                <button type="button" onClick={() => change(() => (setDead(false), setNote({kind: 'info', text: 'New transistor fitted.'})))}>
                  Replace transistor
                </button>
              )}
            </div>
          </div>
        </div>
        <NoteBox note={note} status={power && fn === 'off' ? {kind: 'warn', text: 'Meter OFF: the series circuit is open.'} : null} />
      </Section>
      <Section title="Observation table">
        {pts.length === 0 ? (
          <Empty>No readings yet.</Empty>
        ) : (
          <Table head={['Light (lx)', 'Sensor current (µA)', 'Relay', 'Lamp']} rows={pts.map((p) => [p.lux, p.ua.toFixed(p.ua < 200 ? 1 : 0), p.relay ? 'ON' : 'OFF', p.lamp ? 'ON' : 'OFF'])} />
        )}
        {pts.length > 1 && <XYGraph series={[{id: 'i', label: 'I', color: 'var(--s1)', marker: 'circle', points: pts.map((p) => ({x: p.lux, y: p.ua}))}]} xLabel="Light (lx)" yLabel="Sensor current (µA)" xUnit="lx" yUnit="µA" />}
      </Section>
      <Section title="Result">
        <Table
          head={['', 'Your value', 'Check']}
          rows={[
            ['Sensitivity = ΔI ÷ Δlux (µA/lx)', <input className={styles.input} style={{maxWidth: '5.5rem'}} inputMode="decimal" aria-label="Sensitivity" value={ans.sens ?? ''} onChange={(e) => setAns((a) => ({...a, sens: e.target.value}))} />, ans.sens ? <Verdict ok={sensOk} /> : '–'],
            [
              'Switching light level (lx)',
              <input className={styles.input} style={{maxWidth: '5.5rem'}} inputMode="decimal" aria-label="Switching light level" value={ans.lux ?? ''} onChange={(e) => setAns((a) => ({...a, lux: e.target.value}))} />,
              ans.lux ? seen.pickPos !== pos ? 'watch the relay pick up at this preset' : thr < 150 || thr > 250 ? 'set the preset for 150–250 lx' : <Verdict ok={luxOk} /> : '–',
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

export function PhotodiodeSwitchLab(): React.JSX.Element {
  return (
    <LightSwitchLab
      s={{
        number: '1.11.107',
        title: 'Switch a Lamp Load Using a Photodiode',
        aim: 'To measure the reverse (light) current of a photodiode at different light levels, and use it with a Darlington driver and relay to switch a lamp.',
        apparatus: ['Photodiode BPW34', 'Two BC547 (Darlington), preset 1 MΩ', '12 V relay (400 Ω) with freewheel diode 1N4007', '230 V lamp', 'Lux meter, digital multimeter (µA)'],
        procedure: [
          'Photodiode reverse biased: cathode to +12 V through the µA meter.',
          'Vary the light from dark to 1000 lx. Note the current each time.',
          'Adjust the preset until the relay picks up at about 200 lx. Note that light level.',
          'Move the lamp to the NC contact: it now lights in the dark (automatic street light).',
        ],
        precautions: ['Photodiode must be reverse biased.', 'Always fit the freewheel diode across the relay coil.', 'The lamp side is 230 V: switch off before touching it.'],
        viva: [
          {q: 'Why is a photodiode reverse biased?', a: 'Its reverse current is then almost all light current, proportional to light.'},
          {q: 'Why is a Darlington pair used after a photodiode?', a: 'The photodiode current is only a few µA; the Darlington gives enough gain to drive the relay.'},
          {q: 'What does the preset do?', a: 'It bleeds part of the photocurrent from the base, setting the light level at which the relay operates.'},
          {q: 'Why the diode across the relay coil?', a: 'It absorbs the high back-EMF when the coil switches off and protects the transistor.'},
        ],
        sensor: {pt: false, name: 'BPW34', sens: 0.05e-6, dark: 2e-9, vbe: 1.2, hfe: 30000, driver: 'BC547 ×2', rMin: 10e3},
        ranges: ['uA200', 'mA2'],
      }}
    />
  );
}

export function PhototransistorSwitchLab(): React.JSX.Element {
  return (
    <LightSwitchLab
      s={{
        number: '1.11.108',
        title: 'Switch a Lamp Load Using a Phototransistor',
        aim: 'To measure the collector current of a phototransistor at different light levels, and use it with a transistor driver and relay to switch a lamp.',
        apparatus: ['Phototransistor L14G2 (or similar)', 'BC547, preset 100 kΩ', '12 V relay (400 Ω) with freewheel diode 1N4007', '230 V lamp', 'Lux meter, digital multimeter'],
        procedure: [
          'Phototransistor collector to +12 V through the meter; emitter to the BC547 base and the preset.',
          'Vary the light from dark to 1000 lx. Note the current each time.',
          'Adjust the preset until the relay picks up at about 200 lx. Note that light level.',
          'Move the lamp to the NC contact: it now lights in the dark (automatic street light).',
        ],
        precautions: ['Check the collector and emitter leads before connecting.', 'Always fit the freewheel diode across the relay coil.', 'The lamp side is 230 V: switch off before touching it.'],
        viva: [
          {q: 'Why is a phototransistor more sensitive than a photodiode?', a: 'The light current at its collector-base junction is amplified by the transistor gain.'},
          {q: 'Which lead of a phototransistor is often missing?', a: 'The base; light does the job of base current.'},
          {q: 'What is the disadvantage of a phototransistor compared with a photodiode?', a: 'It is slower and less linear.'},
          {q: 'What happens without the freewheel diode?', a: 'The coil back-EMF can exceed VCE(max) and destroy the transistor.'},
        ],
        sensor: {pt: true, name: 'L14G2', sens: 2e-6, dark: 0.1e-6, vbe: 0.6, hfe: 200, driver: 'BC547', rMin: 1e3},
        ranges: ['uA200', 'mA2', 'mA20'],
      }}
    />
  );
}
