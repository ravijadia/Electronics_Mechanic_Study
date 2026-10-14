import React, {useEffect, useMemo, useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from './PracticalSheet';
import Multimeter from './Multimeter';
import VIGraph, {LegendMarker, type GraphSeries, type Marker} from './VIGraph';
import useStoredState from './useStoredState';
import {
  BAND_HEX,
  METER_FNS,
  METER_FUSE_A,
  RESISTORS,
  fitResistance,
  formatOhms,
  isAmpMode,
  isVoltMode,
  kitValues,
  solve,
  type MeterFn,
  type MeterState,
  type ResistorSpec,
  type SlotA,
  type SlotB,
} from './circuit';
import styles from './styles.module.css';

interface Reading {
  rid: string;
  setV: number;
  v: number;
  imA: number;
  /** Meter display text, kept so trailing zeros show as the meter showed them. */
  vText?: string;
  iText?: string;
}

interface Flags {
  wired: boolean;
  printed: boolean;
}

type Note = {kind: 'good' | 'warn' | 'bad' | 'info'; text: React.ReactNode} | null;
type MeterKey = 'm1' | 'm2';

const SERIES_COLOR = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)'];
const SERIES_MARKER: Marker[] = ['circle', 'square', 'triangle', 'diamond'];
const METER_NAME: Record<MeterKey, string> = {m1: 'DMM 1', m2: 'DMM 2'};
const MIN_READINGS = 5;

const NEW_METER: MeterState = {fn: 'off', reversed: false, fuseBlown: false};

const COLOUR_CHART: [string, number][] = [
  ['black', 0],
  ['brown', 1],
  ['red', 2],
  ['orange', 3],
  ['yellow', 4],
  ['green', 5],
  ['blue', 6],
  ['violet', 7],
  ['grey', 8],
  ['white', 9],
];

function ResistorIcon({spec, burnt}: {spec: ResistorSpec; burnt?: boolean}): React.JSX.Element {
  return (
    <svg viewBox="0 0 84 24" aria-hidden="true">
      <line x1="2" y1="12" x2="82" y2="12" stroke="#9aa3a8" strokeWidth="2" />
      <rect x="18" y="4" width="48" height="16" rx="6" fill={burnt ? '#3a2a20' : '#e8d7b0'} />
      {!burnt &&
        spec.bands.map((b, k) => (
          <rect
            key={k}
            x={k === 3 ? 56 : 25 + k * 8}
            y="4"
            width="4.5"
            height="16"
            fill={BAND_HEX[b]}
          />
        ))}
    </svg>
  );
}

/** The trainer-kit drawing: supply, switch, Slot A, resistor, Slot B. */
function Bench({
  spec,
  burnt,
  hot,
  powerOn,
  terminalVolts,
  current,
  slotA,
  slotB,
  meters,
  onTogglePower,
}: {
  spec: ResistorSpec;
  burnt: boolean;
  hot: boolean;
  powerOn: boolean;
  terminalVolts: number;
  current: number;
  slotA: SlotA;
  slotB: SlotB;
  meters: Record<MeterKey, MeterState>;
  onTogglePower: () => void;
}): React.JSX.Element {
  const meterSymbol = (k: MeterKey, cx: number, cy: number) => {
    const fn = meters[k].fn;
    const letter = isVoltMode(fn) ? 'V' : isAmpMode(fn) ? 'A' : 'off';
    return (
      <g>
        <circle cx={cx} cy={cy} r={19} fill="#f2c230" stroke="#c99a10" strokeWidth={2} />
        <text
          x={cx}
          y={cy + (letter === 'off' ? 4 : 6)}
          textAnchor="middle"
          style={{
            fontWeight: 800,
            fontSize: letter === 'off' ? 11 : 17,
            fill: '#1d1a10',
            fontFamily: 'var(--ifm-font-family-base)',
          }}>
          {letter}
        </text>
        <text x={cx} y={cy + 40} textAnchor="middle" className={clsx(styles.kitText, styles.small)}>
          {METER_NAME[k]}
        </text>
      </g>
    );
  };

  const pad = (x: number, y: number) => <circle cx={x} cy={y} r={4} fill="#c79a52" />;

  // Speed of the current-flow dashes grows with current (log scale).
  const showFlow = current > 2e-6;
  const flowDur = Math.min(3, Math.max(0.35, 2.6 - Math.log10(current * 1000 + 1) * 0.9));
  const loop =
    'M171 120 H200 V50 H370 H470 H600 V265 H200 V200 H171';

  return (
    <div className={styles.kit}>
      <svg viewBox="0 0 720 300" role="img" aria-label="Trainer kit circuit: DC supply, switch S1, Slot A in line, resistor, Slot B across the resistor">
        {/* Supply */}
        <rect x="14" y="70" width="150" height="160" rx="10" fill="#31414c" stroke="#4d5f6b" />
        <text x="89" y="92" textAnchor="middle" className={clsx(styles.kitText, styles.bold)}>
          DC SUPPLY 0–12 V
        </text>
        <rect x="34" y="102" width="110" height="38" rx="5" fill="#c8d7b4" />
        <text
          x="136"
          y="128"
          textAnchor="end"
          style={{fontFamily: 'var(--ifm-font-family-monospace)', fontSize: 20, fontWeight: 600, fill: '#1d2618'}}>
          {powerOn ? `${terminalVolts.toFixed(1)} V` : ''}
        </text>
        <circle cx="42" cy="166" r="6" fill={powerOn ? '#4cd964' : '#5b2b2b'} />
        <text x="54" y="170" className={clsx(styles.kitText, styles.small)}>
          {powerOn ? 'ON' : 'OFF'}
        </text>
        <circle cx="164" cy="120" r="7" fill="#d4302a" stroke="#fff" strokeWidth="1.5" />
        <text x="146" y="124" textAnchor="middle" className={clsx(styles.kitText, styles.bold)}>
          +
        </text>
        <circle cx="164" cy="200" r="7" fill="#1b1b1b" stroke="#fff" strokeWidth="1.5" />
        <text x="146" y="204" textAnchor="middle" className={clsx(styles.kitText, styles.bold)}>
          −
        </text>

        {/* Wires (gaps left for the switch, the slots and the resistor) */}
        <path className={styles.wire} d="M171 120 H200 V50 H262" />
        <path className={styles.wire} d="M310 50 H370" />
        <path className={styles.wire} d="M470 50 H600 V125" />
        <path className={styles.wire} d="M600 195 V265 H200 V200 H171" />
        <path className={styles.wire} d="M600 85 H660 V110" />
        <path className={styles.wire} d="M660 190 V235 H600" />
        <circle cx="600" cy="85" r="4.5" fill="var(--lab-wire)" />
        <circle cx="600" cy="235" r="4.5" fill="var(--lab-wire)" />

        {showFlow && (
          <path
            className={styles.flow}
            d={loop}
            style={{animationDuration: `${flowDur}s`}}
          />
        )}

        {/* Switch S1 */}
        <g
          className={styles.clickable}
          onClick={onTogglePower}
          role="button"
          tabIndex={0}
          aria-label={powerOn ? 'Switch S1 is on. Turn off' : 'Switch S1 is off. Turn on'}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onTogglePower();
            }
          }}>
          <rect x="250" y="18" width="72" height="56" fill="transparent" />
          <circle cx="262" cy="50" r="5" fill="var(--lab-wire)" />
          <circle cx="310" cy="50" r="5" fill="var(--lab-wire)" />
          <line
            x1="262"
            y1="50"
            x2={powerOn ? 308 : 300}
            y2={powerOn ? 50 : 24}
            stroke="var(--lab-wire)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <text x="286" y="88" textAnchor="middle" className={clsx(styles.kitText, styles.small)}>
            S1 (tap)
          </text>
        </g>

        {/* Slot A — in line */}
        <text x="420" y="18" textAnchor="middle" className={clsx(styles.kitText, styles.small)}>
          Slot A (in line)
        </text>
        <rect className={styles.slotBox} x="376" y="24" width="88" height="52" rx="6" />
        {pad(370, 50)}
        {pad(470, 50)}
        {slotA === 'link' && <path className={styles.wire} d="M370 50 H470" />}
        {(slotA === 'm1' || slotA === 'm2') && (
          <>
            <path className={styles.wire} d="M370 50 H401 M439 50 H470" />
            {meterSymbol(slotA, 420, 50)}
          </>
        )}

        {/* Resistor */}
        {hot && !burnt && (
          <rect x="580" y="117" width="40" height="86" rx="12" fill="#ff7a1a" opacity="0.45" />
        )}
        <rect x="588" y="125" width="24" height="70" rx="7" fill={burnt ? '#3a2a20' : '#e8d7b0'} />
        {!burnt &&
          spec.bands.map((b, k) => (
            <rect key={k} x="588" y={k === 3 ? 180 : 134 + k * 10} width="24" height="6" fill={BAND_HEX[b]} />
          ))}
        <text x="574" y="158" textAnchor="end" className={clsx(styles.kitText, styles.bold)}>
          {spec.id}
        </text>
        {burnt && (
          <text x="574" y="174" textAnchor="end" className={clsx(styles.kitText, styles.small)}>
            burnt open
          </text>
        )}

        {/* Slot B — across the resistor */}
        <rect className={styles.slotBox} x="636" y="116" width="48" height="68" rx="6" />
        {pad(660, 110)}
        {pad(660, 190)}
        {(slotB === 'm1' || slotB === 'm2') && (
          <>
            <path className={styles.wire} d="M660 110 V131 M660 169 V190" />
            {meterSymbol(slotB, 660, 150)}
          </>
        )}
        <text x="676" y="262" textAnchor="middle" className={clsx(styles.kitText, styles.small)}>
          Slot B
        </text>
        <text x="676" y="276" textAnchor="middle" className={clsx(styles.kitText, styles.small)}>
          (across R)
        </text>
      </svg>
    </div>
  );
}

export default function OhmsLawLab(): React.JSX.Element {
  // Each trainee gets their own "kit": actual resistor values within tolerance.
  const [seed, setSeed, seedLoaded] = useStoredState<number>('lab:7.2:seed', 0);
  const [readings, setReadings] = useStoredState<Reading[]>('lab:7.2:readings', []);
  const [codes, setCodes] = useStoredState<Record<string, string>>('lab:7.2:codes', {});
  const [flags, setFlags] = useStoredState<Flags>('lab:7.2:flags', {wired: false, printed: false});

  useEffect(() => {
    if (seedLoaded && !seed) setSeed(1 + Math.floor(Math.random() * 1e9));
  }, [seedLoaded, seed, setSeed]);

  const kit = useMemo(() => kitValues(seed || 1), [seed]);

  const [rid, setRid] = useState('R-B');
  const [burnt, setBurnt] = useState<Record<string, boolean>>({});
  const [setVolts, setSetVolts] = useState(0);
  const [powerOn, setPowerOn] = useState(false);
  const [slotA, setSlotA] = useState<SlotA>('open');
  const [slotB, setSlotB] = useState<SlotB>('empty');
  const [meters, setMeters] = useState<Record<MeterKey, MeterState>>({m1: NEW_METER, m2: NEW_METER});
  const [note, setNote] = useState<Note>(null);

  const spec = RESISTORS.find((r) => r.id === rid)!;
  const rActual = burnt[rid] ? Infinity : kit[rid];
  const result = solve({setVolts, powerOn, slotA, slotB, meters, rActual});
  const hot = result.pResistor > spec.rating;

  const ammeterKey: MeterKey | null =
    (slotA === 'm1' || slotA === 'm2') && isAmpMode(meters[slotA].fn) ? slotA : null;
  const voltmeterKey: MeterKey | null =
    (slotB === 'm1' || slotB === 'm2') && isVoltMode(meters[slotB].fn) ? slotB : null;
  const wiredOK = ammeterKey != null && voltmeterKey != null;

  // Damage: a meter's mA fuse, or the resistor itself.
  useEffect(() => {
    for (const k of ['m1', 'm2'] as MeterKey[]) {
      const m = meters[k];
      if (isAmpMode(m.fn) && !m.fuseBlown && result.readings[k].current > METER_FUSE_A) {
        const amps = result.readings[k].current;
        setMeters((ms) => ({...ms, [k]: {...ms[k], fuseBlown: true}}));
        setNote({
          kind: 'bad',
          text: (
            <>
              <b>Pop! {METER_NAME[k]}’s mA fuse blew</b> ({amps.toFixed(2)} A tried to flow through
              it). An ammeter has very low resistance, so connecting it <i>across</i> a component
              is nearly a short circuit. An ammeter always goes <b>in series</b>.
            </>
          ),
        });
        return;
      }
    }
    if (!burnt[rid] && result.pResistor > 2 * spec.rating) {
      setBurnt((b) => ({...b, [rid]: true}));
      setNote({
        kind: 'bad',
        text: (
          <>
            <b>{spec.id} burnt out.</b> It was dissipating {result.pResistor.toFixed(2)} W but is
            rated {spec.rating} W. Check P = V²/R before raising the voltage. Switch off and fit a
            new one.
          </>
        ),
      });
    }
  }, [result.readings, result.pResistor, meters, burnt, rid, spec]);

  useEffect(() => {
    if (wiredOK && powerOn && !flags.wired) setFlags((f) => ({...f, wired: true}));
  }, [wiredOK, powerOn, flags.wired, setFlags]);

  const mustBeOff = (): boolean => {
    if (!powerOn) return false;
    setNote({
      kind: 'warn',
      text: (
        <>
          <b>Switch OFF the supply first.</b> Never change connections or components on a live
          circuit.
        </>
      ),
    });
    return true;
  };

  const placeA = (v: SlotA) => {
    if (mustBeOff()) return;
    setNote(null);
    setSlotA(v);
    if (v === slotB) setSlotB('empty');
  };
  const placeB = (v: SlotB) => {
    if (mustBeOff()) return;
    setNote(null);
    setSlotB(v);
    if (v === slotA) setSlotA('open');
  };
  const pickResistor = (id: string) => {
    if (id === rid) return;
    if (mustBeOff()) return;
    setNote(null);
    setRid(id);
  };
  const replaceResistor = () => {
    if (mustBeOff()) return;
    setBurnt((b) => ({...b, [rid]: false}));
    setNote({kind: 'info', text: `New ${spec.id} fitted. Keep its power below ${spec.rating} W.`});
  };
  const setMeter = (k: MeterKey, patch: Partial<MeterState>) =>
    setMeters((ms) => ({...ms, [k]: {...ms[k], ...patch}}));

  const record = () => {
    if (!powerOn) {
      setNote({kind: 'warn', text: 'Switch ON the supply.'});
      return;
    }
    if (!wiredOK) {
      setNote({
        kind: 'warn',
        text: (
          <>
            Not ready to record. Put one DMM in <b>Slot A on DC mA</b> (ammeter, in series) and the
            other in <b>Slot B on DC V</b> (voltmeter, across R).
          </>
        ),
      });
      return;
    }
    const rv = result.readings[voltmeterKey!];
    const ri = result.readings[ammeterKey!];
    if (rv.value == null || ri.value == null) {
      setNote({
        kind: 'warn',
        text: 'OL: select a higher range.',
      });
      return;
    }
    if (rv.value < 0 || ri.value < 0) {
      setNote({
        kind: 'warn',
        text: 'Negative reading: probes reversed.',
      });
      return;
    }
    if (rv.value === 0 || ri.value === 0) {
      setNote({kind: 'warn', text: 'Raise the supply voltage first.'});
      return;
    }
    if (readings.some((r) => r.rid === rid && Math.abs(r.setV - setVolts) < 0.05)) {
      setNote({kind: 'warn', text: `You already have a reading at ${setVolts.toFixed(1)} V for ${rid}. Change the supply voltage.`});
      return;
    }
    setReadings((rs) => [...rs, {rid, setV: setVolts, v: rv.value!, imA: ri.value!, vText: rv.text, iText: ri.text}]);
    const tips: string[] = [];
    if (meters[voltmeterKey!].fn === 'V20' && rv.value < 2) tips.push('the 2 V range would show this voltage with one more digit');
    if (meters[ammeterKey!].fn === 'mA200' && ri.value < 20) tips.push('the 20 mA range would show this current with one more digit');
    setNote({
      kind: 'good',
      text: (
        <>
          Recorded: {rv.text} V, {ri.text} mA for {rid}.
          {tips.length > 0 && <> Tip: {tips.join('; ')}.</>}
        </>
      ),
    });
  };

  // Status line describing what the bench is doing right now.
  let status: Note = null;
  if (!powerOn) status = {kind: 'info', text: 'Supply OFF.'};
  else if (burnt[rid]) status = {kind: 'bad', text: `${rid} is burnt open, so no current flows. Switch off and replace it.`};
  else if (slotA === 'open') status = {kind: 'warn', text: 'Circuit open at Slot A.'};
  else if ((slotA === 'm1' || slotA === 'm2') && isVoltMode(meters[slotA].fn))
    status = {
      kind: 'warn',
      text: 'Voltmeter in series: it blocks the current.',
    };
  else if ((slotB === 'm1' || slotB === 'm2') && isAmpMode(meters[slotB].fn) && !meters[slotB].fuseBlown)
    status = {
      kind: 'bad',
      text: 'Ammeter across R: it shorts the resistor!',
    };
  else if ((slotA === 'm1' || slotA === 'm2') && meters[slotA].fn === 'off')
    status = {kind: 'warn', text: 'Meter in Slot A is OFF: circuit open.'};
  else if (hot)
    status = {
      kind: 'warn',
      text: `${rid} is getting hot: ${result.pResistor.toFixed(2)} W against a ${spec.rating} W rating. Reduce the voltage.`,
    };
  else if (wiredOK) status = {kind: 'good', text: 'Wiring correct ✓'};

  // Per-resistor analysis.
  const tested = RESISTORS.map((r, idx) => {
    const rows = readings.filter((x) => x.rid === r.id);
    const ratios = rows.map((x) => x.v / (x.imA / 1000));
    const fitR = fitResistance(rows.map((x) => ({v: x.v, iA: x.imA / 1000})));
    const mean = ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : null;
    const spread =
      mean && ratios.length > 1 ? ((Math.max(...ratios) - Math.min(...ratios)) / mean) * 100 : null;
    const typed = Number((codes[r.id] ?? '').replace(/[^\d.]/g, ''));
    const kOhm = /k/i.test(codes[r.id] ?? '');
    const typedOhms = typed ? (kOhm ? typed * 1000 : typed) : null;
    return {
      spec: r,
      idx,
      rows,
      ratios,
      fitR,
      mean,
      spread,
      typedOhms,
      codeOK: typedOhms != null && Math.abs(typedOhms - r.nominal) < 0.5,
    };
  }).filter((t) => t.rows.length > 0);

  const complete = tested.filter((t) => t.rows.length >= MIN_READINGS);
  const series: GraphSeries[] = tested.map((t) => ({
    id: t.spec.id,
    label: t.spec.id,
    color: SERIES_COLOR[t.idx],
    marker: SERIES_MARKER[t.idx],
    points: t.rows.map((x) => ({v: x.v, imA: x.imA})),
    fitR: t.rows.length >= 2 ? t.fitR : null,
  }));

  const partial = tested.find((t) => t.rows.length < MIN_READINGS)?.rows.length ?? 0;
  const steps = [
    {
      label: 'Put one DMM in Slot A and set it to DC mA.',
      hint: 'Ammeter: in line with R. Supply must be OFF to change slots.',
      done: ammeterKey != null,
    },
    {
      label: 'Put the other DMM in Slot B and set it to DC V.',
      hint: 'Voltmeter: across R.',
      done: voltmeterKey != null,
    },
    {
      label: 'Switch the supply ON.',
      hint: 'Press Power or tap S1 on the bench.',
      done: flags.wired || readings.length > 0,
    },
    {
      label: `Raise the supply 1–2 V at a time and press Record reading. Readings: ${complete.length >= 1 ? MIN_READINGS : partial}/${MIN_READINGS}`,
      hint: 'Use the lowest range that does not show OL. Keep R within its power rating.',
      done: complete.length >= 1,
    },
    {
      label: 'Switch OFF and pick a second resistor from the tray.',
      hint: 'Read its colour bands.',
      done: tested.length >= 2 || (complete.length >= 1 && !powerOn && !tested.some((t) => t.spec.id === rid)),
    },
    {
      label: `Record ${MIN_READINGS} readings for the second resistor. Readings: ${complete.length >= 2 ? MIN_READINGS : complete.length >= 1 ? partial : 0}/${MIN_READINGS}`,
      hint: 'Same wiring, switch ON, raise the supply in steps.',
      done: complete.length >= 2,
    },
    {
      label: 'Type the colour-code value (Ω) of each resistor in the Result table.',
      hint: 'The table is below the graph. Colour code chart is there too.',
      done: tested.length > 0 && tested.every((t) => t.codeOK),
    },
    {
      label: 'Enter your details and press Print / Save as PDF.',
      hint: 'Practical record, below the result.',
      done: flags.printed,
    },
  ];

  const deleteRow = (target: Reading) => setReadings((rs) => rs.filter((r) => r !== target));

  const resetAll = () => {
    if (!window.confirm('Clear all readings and get a new resistor kit?')) return;
    setReadings([]);
    setCodes({});
    setFlags({wired: false, printed: false});
    setSeed(1 + Math.floor(Math.random() * 1e9));
    setBurnt({});
    setNote(null);
  };

  const placement = (k: MeterKey) =>
    slotA === k ? 'Slot A (in line)' : slotB === k ? 'Slot B (across R)' : 'Not connected';

  const nudge = (d: number) => setSetVolts((v) => Math.min(12, Math.max(0, Math.round((v + d) * 10) / 10)));

  return (
    <PracticalSheet
      number="1.7.54"
      title="Verification of Ohm’s Law"
      aim="To verify Ohm’s law by measuring the current through a resistor at different voltages, and to find its resistance from the V–I graph."
      apparatus={[
        'Variable DC regulated power supply, 0–12 V',
        'Digital multimeters (2 nos.), one used as an ammeter and one as a voltmeter',
        'Carbon resistors: 100 Ω ½ W, 470 Ω ¼ W, 1 kΩ ¼ W, 2.2 kΩ ¼ W (±5 %)',
        'ON/OFF switch, connecting wires, trainer kit',
      ]}
      procedure={[
        'With the supply OFF, pick a resistor from the tray and read its colour code.',
        'Put one DMM in Slot A (in line with R) and set it to DC mA. This is the ammeter.',
        'Put the other DMM in Slot B (across R) and set it to DC V. This is the voltmeter.',
        'Switch ON. Raise the supply in steps (about 1–2 V) and press “Record reading” at each step.',
        'Use the lowest range that does not show OL, for better resolution.',
        'Switch OFF, change to a second resistor and repeat.',
        'Plot I against V, find R = V / I, and compare it with the colour-code value.',
      ]}
      precautions={[
        'Connect the ammeter in series and the voltmeter in parallel with the resistor.',
        'Switch OFF the supply before changing any connection or component.',
        'Start on a higher meter range and come down to a lower one.',
        'Keep the power in the resistor (P = V²/R) below its rating.',
        'Observe polarity: red probe to the + side.',
        'Let the reading settle before noting it down.',
      ]}
      viva={[
        {q: 'State Ohm’s law.', a: 'At constant temperature, the current through a conductor is directly proportional to the voltage across it: V = I × R.'},
        {q: 'Why is an ammeter always connected in series?', a: 'It must carry the same current as the component. Its resistance is very low, so in series it hardly changes the circuit current.'},
        {q: 'What happens if an ammeter is connected across a component?', a: 'Its very low resistance nearly shorts the component. A large current flows, and the meter fuse (or the meter) is damaged.'},
        {q: 'Why does a voltmeter have a very high resistance?', a: 'So that it draws almost no current from the circuit it is measuring and does not disturb the voltage (no “loading”).'},
        {q: 'What is the shape of the V–I graph of a resistor, and what does it tell you?', a: 'A straight line through the origin. The slope of V against I is the resistance (R = ΔV / ΔI).'},
        {q: 'Your measured R differs a little from the colour code. Why?', a: 'Resistor tolerance (±5 % for a gold band), meter accuracy and resolution, and heating of the resistor.'},
        {q: 'Write the colour code of a 470 Ω, ±5 % resistor.', a: 'Yellow, violet, brown, gold.'},
        {q: 'A 100 Ω resistor has 10 V across it. What power rating does it need?', a: 'P = V²/R = 100 / 100 = 1 W. Use a 2 W resistor for a safety margin.'},
        {q: 'Name two devices that do not obey Ohm’s law.', a: 'A diode and a filament lamp. Their V–I graphs are not straight lines.'},
      ]}
      steps={steps}
      onPrinted={(t) => {
        if (t.name.trim()) setFlags((f) => ({...f, printed: true}));
      }}>
      <div className={styles.section}>
        <h4>Circuit and bench</h4>
        <Bench
          spec={spec}
          burnt={!!burnt[rid]}
          hot={hot}
          powerOn={powerOn}
          terminalVolts={result.terminalVolts}
          current={result.current}
          slotA={slotA}
          slotB={slotB}
          meters={meters}
          onTogglePower={() => {
            setNote(null);
            setPowerOn((p) => !p);
          }}
        />

        <div className={clsx(styles.controls, styles.noPrint)}>
          <div className={styles.card}>
            <div className={styles.cardTitle}>
              <span>DC supply</span>
              <output>{setVolts.toFixed(1)} V</output>
            </div>
            <input
              className={styles.range}
              type="range"
              min={0}
              max={12}
              step={0.1}
              value={setVolts}
              onChange={(e) => setSetVolts(Number(e.target.value))}
              aria-label="Supply voltage"
            />
            <div className={styles.row}>
              <button type="button" className={styles.btn} onClick={() => nudge(-0.1)} aria-label="Decrease by 0.1 volt">
                −0.1
              </button>
              <button type="button" className={styles.btn} onClick={() => nudge(0.1)} aria-label="Increase by 0.1 volt">
                +0.1
              </button>
              <button
                type="button"
                className={clsx(styles.btn, styles.power)}
                aria-pressed={powerOn}
                onClick={() => {
                  setNote(null);
                  setPowerOn((p) => !p);
                }}>
                Power {powerOn ? 'ON' : 'OFF'}
              </button>
            </div>

            <span className={styles.label}>Resistor tray (read the colour code)</span>
            <div className={styles.tray} role="group" aria-label="Resistor tray">
              {RESISTORS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={styles.chip}
                  aria-pressed={rid === r.id}
                  onClick={() => pickResistor(r.id)}>
                  <ResistorIcon spec={r} burnt={!!burnt[r.id]} />
                  {r.id}
                </button>
              ))}
            </div>
            {burnt[rid] && (
              <div className={styles.row} style={{marginTop: '0.5rem'}}>
                <button type="button" className={clsx(styles.btn, styles.danger)} onClick={replaceResistor}>
                  Replace burnt {rid}
                </button>
              </div>
            )}

            <span className={styles.label}>Slot A (in line with R)</span>
            <div className={styles.seg} role="group" aria-label="Slot A">
              {(
                [
                  ['open', 'Open'],
                  ['link', 'Link wire'],
                  ['m1', 'DMM 1'],
                  ['m2', 'DMM 2'],
                ] as [SlotA, string][]
              ).map(([v, l]) => (
                <button key={v} type="button" aria-pressed={slotA === v} onClick={() => placeA(v)}>
                  {l}
                </button>
              ))}
            </div>
            <span className={styles.label}>Slot B (across R)</span>
            <div className={styles.seg} role="group" aria-label="Slot B">
              {(
                [
                  ['empty', 'Empty'],
                  ['m1', 'DMM 1'],
                  ['m2', 'DMM 2'],
                ] as [SlotB, string][]
              ).map(([v, l]) => (
                <button key={v} type="button" aria-pressed={slotB === v} onClick={() => placeB(v)}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div style={{display: 'grid', gap: '0.7rem', alignContent: 'start'}}>
            {(['m1', 'm2'] as MeterKey[]).map((k) => (
              <Multimeter
                key={k}
                name={METER_NAME[k]}
                fn={meters[k].fn}
                functions={METER_FNS}
                text={result.readings[k].text}
                unit={result.readings[k].unit}
                placement={placement(k)}
                onFunction={(fn) => setMeter(k, {fn: fn as MeterFn})}
                reversed={meters[k].reversed}
                onToggleReverse={() => setMeter(k, {reversed: !meters[k].reversed})}
                fault={meters[k].fuseBlown ? 'mA fuse blown' : null}
                onRepair={() => {
                  if (mustBeOff()) return;
                  setMeter(k, {fuseBlown: false});
                  setNote({kind: 'info', text: `${METER_NAME[k]} fuse replaced.`});
                }}
              />
            ))}
          </div>
        </div>

        <div className={styles.noPrint} aria-live="polite">
          {note && <div className={clsx(styles.message, styles[note.kind])}>{note.text}</div>}
          {status && <div className={clsx(styles.message, styles[status.kind])}>{status.text}</div>}
        </div>
        <div className={clsx(styles.row, styles.noPrint)} style={{marginTop: '0.8rem'}}>
          <button type="button" className={clsx(styles.btn, styles.primary)} onClick={record}>
            Record reading
          </button>
          <span className={styles.muted}>
            {rid}: {readings.filter((r) => r.rid === rid).length} reading(s)
          </span>
        </div>
      </div>

      <div className={styles.section}>
        <h4>Observation table</h4>
        {tested.length === 0 ? (
          <div className={styles.empty}>No readings yet. Wire the bench and press “Record reading”.</div>
        ) : (
          tested.map((t) => (
            <div key={t.spec.id} className={styles.tableWrap}>
              <table className={styles.table}>
                <caption style={{textAlign: 'left', fontWeight: 700, padding: '0.2rem 0'}}>
                  <span className={styles.swatch}>
                    <LegendMarker kind={SERIES_MARKER[t.idx]} color={SERIES_COLOR[t.idx]} />
                  </span>
                  Resistor {t.spec.id} ({t.spec.bands.join(', ')})
                </caption>
                <thead>
                  <tr>
                    <th>S. No.</th>
                    <th>Supply set (V)</th>
                    <th>Voltmeter, V (V)</th>
                    <th>Ammeter, I (mA)</th>
                    <th>R = V / I (Ω)</th>
                    <th className={styles.noPrint}>
                      <span className={styles.srOnly}>Delete</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {t.rows.map((r, k) => (
                    <tr key={k}>
                      <td>{k + 1}</td>
                      <td className={styles.num}>{r.setV.toFixed(1)}</td>
                      <td className={styles.num}>{r.vText ?? r.v}</td>
                      <td className={styles.num}>{r.iText ?? r.imA}</td>
                      <td className={styles.num}>{t.ratios[k].toFixed(0)}</td>
                      <td className={styles.noPrint}>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          onClick={() => deleteRow(r)}
                          aria-label={`Delete reading ${k + 1} of ${t.spec.id}`}>
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>

      <div className={styles.section}>
        <h4>Graph: current against voltage</h4>
        {tested.length === 0 ? (
          <div className={styles.empty}>Your graph will be drawn here from your readings.</div>
        ) : (
          <>
            <VIGraph series={series} />
            <p className={styles.muted}>
              Straight line through origin → I ∝ V.
            </p>
          </>
        )}
      </div>

      <div className={styles.section}>
        <h4>Result</h4>
        <details className={styles.noPrint} style={{marginBottom: '0.7rem'}}>
          <summary className={styles.muted} style={{cursor: 'pointer'}}>
            Colour code chart
          </summary>
          <div className={styles.tableWrap} style={{marginTop: '0.5rem'}}>
            <table className={styles.table}>
              <tbody>
                <tr>
                  {COLOUR_CHART.map(([c]) => (
                    <th key={c}>
                      <span
                        aria-hidden="true"
                        style={{
                          display: 'inline-block',
                          width: 14,
                          height: 14,
                          borderRadius: 3,
                          background: BAND_HEX[c],
                          border: '1px solid #8889',
                          verticalAlign: 'middle',
                          marginRight: 4,
                        }}
                      />
                      {c}
                    </th>
                  ))}
                </tr>
                <tr>
                  {COLOUR_CHART.map(([c, d]) => (
                    <td key={c}>{d}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className={styles.muted}>
            Bands 1–2: digits · Band 3: multiplier · Gold: ±5 %
          </p>
        </details>
        {tested.length === 0 ? (
          <div className={styles.empty}>Your results appear here once you have taken readings.</div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Resistor</th>
                    <th>Colour-code value (Ω), your reading</th>
                    <th>Mean V / I</th>
                    <th>R from graph</th>
                    <th>Difference from colour code</th>
                  </tr>
                </thead>
                <tbody>
                  {tested.map((t) => {
                    const diff =
                      t.typedOhms && t.fitR ? ((t.fitR - t.typedOhms) / t.typedOhms) * 100 : null;
                    return (
                      <tr key={t.spec.id}>
                        <td>
                          <div style={{width: 72, margin: '0 auto'}}>
                            <ResistorIcon spec={t.spec} />
                          </div>
                          {t.spec.id}
                        </td>
                        <td>
                          <input
                            className={styles.input}
                            inputMode="decimal"
                            placeholder="e.g. 220"
                            aria-label={`Colour-code value of ${t.spec.id} in ohms`}
                            value={codes[t.spec.id] ?? ''}
                            onChange={(e) => setCodes((c) => ({...c, [t.spec.id]: e.target.value}))}
                          />{' '}
                          {t.typedOhms != null &&
                            (t.codeOK ? (
                              <span className={styles.ok}>✓ correct</span>
                            ) : (
                              <span className={styles.no}>✗ check the bands</span>
                            ))}
                        </td>
                        <td className={styles.num}>{t.mean ? formatOhms(t.mean) : '–'}</td>
                        <td className={styles.num}>{t.fitR ? formatOhms(t.fitR) : '–'}</td>
                        <td className={styles.num}>
                          {diff == null ? (
                            '–'
                          ) : (
                            <>
                              {diff > 0 ? '+' : ''}
                              {diff.toFixed(1)} %{' '}
                              {Math.abs(diff) <= 5 ? (
                                <span className={styles.ok}>within ±5 %</span>
                              ) : (
                                <span className={styles.no}>outside ±5 %</span>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {complete.length > 0 ? (
              <p>
                <b>Conclusion: </b>
                {complete.map((t, k) => (
                  <span key={t.spec.id}>
                    {k > 0 && '; '}for {t.spec.id}, V/I stayed between{' '}
                    {formatOhms(Math.min(...t.ratios))} and {formatOhms(Math.max(...t.ratios))}{' '}
                    (spread {t.spread!.toFixed(1)} %)
                  </span>
                ))}
                . The ratio V/I is constant and the V–I graph is a straight line through the origin,
                so the current is directly proportional to the voltage. <b>Ohm’s law is verified.</b>
              </p>
            ) : (
              <p className={styles.muted}>
                Take at least {MIN_READINGS} readings on a resistor to draw a conclusion.
              </p>
            )}
          </>
        )}
        <div className={styles.noPrint}>
          <button type="button" className={clsx(styles.btn, styles.danger)} onClick={resetAll}>
            Start again with a new kit
          </button>
        </div>
      </div>
    </PracticalSheet>
  );
}
