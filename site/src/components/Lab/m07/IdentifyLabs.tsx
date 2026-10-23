import React, {useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import {GU_1_7_50, GU_1_7_52, GU_1_7_53} from './gu';
import Multimeter from '../Multimeter';
import useStoredState from '../useStoredState';
import {ProbeBar, ProbePoint, useProbes, type Probes} from '../Probes';
import {NoteBox, ResetKit, Section, Table, Verdict, shuffle, useKitSeed, useRng, type Note} from '../kit';
import {L2, fmt} from '../solution';
import {PINS, PartArt, type PartKind, type PartOpts} from './art';
import {AxialResistor, E12, bandsFor, fmtOhms, kitLabel, near} from './parts';
import {OHM_FNS, ohmText} from './ColourCodeLab';
import styles from '../styles.module.css';

const sel = (label: string, value: string | undefined, options: [string, string][], onChange: (v: string) => void) => (
  <select className={styles.select} aria-label={label} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
    <option value="">Choose…</option>
    {options.map(([v, t]) => (
      <option key={v} value={v}>
        {t}
      </option>
    ))}
  </select>
);

/** A grid of part cards, each 160 × 120 with its number above the drawing. */
export function PartGrid({
  parts,
  probes,
  label,
}: {
  parts: {kind: PartKind; o?: PartOpts}[];
  probes?: Probes;
  label: string;
}): React.JSX.Element {
  const cols = 4;
  const W = 160;
  const H = 130;
  const rows = Math.ceil(parts.length / cols);
  return (
    <div className={styles.kit}>
      <svg viewBox={`0 0 ${W * cols} ${H * rows}`} role="img" aria-label={label}>
        {parts.map((p, k) => {
          const ox = (k % cols) * W;
          const oy = Math.floor(k / cols) * H;
          const [x1, y1, x2, y2] = PINS[p.kind];
          return (
            <g key={k}>
              <rect x={ox + 3} y={oy + 3} width={W - 6} height={H - 6} rx={8} fill="#2c3a44" stroke="#3d4d58" />
              <text x={ox + 12} y={oy + 20} style={kitLabel}>
                {k + 1}
              </text>
              <g transform={`translate(${ox} ${oy + 16})`}>
                <PartArt kind={p.kind} o={p.o} />
              </g>
              {probes && (
                <>
                  <ProbePoint id={`${k}:a`} x={ox + x1} y={oy + 16 + y1} probes={probes} label={`Part ${k + 1} lead 1`} r={4} />
                  <ProbePoint id={`${k}:b`} x={ox + x2} y={oy + 16 + y2} probes={probes} label={`Part ${k + 1} lead 2`} r={4} />
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1.7.50 Identify the different types of active electronic components
// ---------------------------------------------------------------------------

interface Comp {
  id: string;
  name: string;
  kind: PartKind;
  mark?: string;
  active: boolean;
}

const COMPS: Comp[] = [
  {id: 'diode', name: 'PN junction diode', kind: 'diode', mark: '1N4007', active: true},
  {id: 'zener', name: 'Zener diode', kind: 'zener', mark: '5V1', active: true},
  {id: 'led', name: 'LED', kind: 'led', active: true},
  {id: 'bjt', name: 'Transistor (BJT)', kind: 'to92', mark: 'BC547', active: true},
  {id: 'power', name: 'Power transistor', kind: 'to3', mark: '2N3055', active: true},
  {id: 'mosfet', name: 'MOSFET', kind: 'to220', mark: 'IRF540 N-ch', active: true},
  {id: 'scr', name: 'SCR (thyristor)', kind: 'to220', mark: 'TYN612 SCR', active: true},
  {id: 'triac', name: 'TRIAC', kind: 'to220', mark: 'BT136 TRIAC', active: true},
  {id: 'reg', name: 'Voltage regulator IC', kind: 'to220', mark: 'LM7805 +5V', active: true},
  {id: 'timer', name: 'Integrated circuit (IC)', kind: 'dip8', mark: 'NE555', active: true},
  {id: 'res', name: 'Resistor', kind: 'resistor', active: false},
  {id: 'cer', name: 'Ceramic capacitor', kind: 'ceramic', active: false},
  {id: 'elec', name: 'Electrolytic capacitor', kind: 'electrolytic', active: false},
  {id: 'ind', name: 'Inductor', kind: 'toroid', active: false},
  {id: 'xfmr', name: 'Transformer', kind: 'transformer', active: false},
];

export function ActiveComponentsLab(): React.JSX.Element {
  const KEY = '1.7.50';
  const [seed, newKit] = useKitSeed(KEY);
  const items = useRng(seed, (rnd) => shuffle([...shuffle(COMPS.filter((c) => c.active), rnd).slice(0, 9), ...shuffle(COMPS.filter((c) => !c.active), rnd).slice(0, 3)], rnd));
  const [ans, setAns] = useStoredState<Record<number, {name?: string; cls?: string}>>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const set = (k: number, p: object) => setAns((a) => ({...a, [k]: {...a[k], ...p}}));
  const nameOk = (k: number) => ans[k]?.name === items[k].id;
  const clsOk = (k: number) => ans[k]?.cls === (items[k].active ? 'active' : 'passive');

  return (
    <PracticalSheet
      number={KEY}
      title="Identify Different Types of Active Electronic Components"
      aim="To identify active electronic components by their shape, package and markings, and tell them apart from passive components."
      apparatus={['Tray of 12 components (below)', 'Data book or datasheets']}
      procedure={['Look at the shape, the number of leads and the printed type number.', 'Name each component.', 'Mark it active (can amplify or control current) or passive.']}
      precautions={['Handle MOSFETs and ICs by the body: static can damage them.', 'Do not bend leads close to the body.']}
      viva={[
        {q: 'What is an active component?', a: 'One that can control the flow of current or amplify a signal, e.g. transistor, SCR, IC. It needs a power supply to work.'},
        {q: 'Name three passive components.', a: 'Resistor, capacitor, inductor (and transformer).'},
        {q: 'Many parts use the TO-220 package. How do you tell them apart?', a: 'By the type number printed on the body, checked in a data book.'},
        {q: 'Which lead of an LED is the anode?', a: 'The longer lead. The cathode side of the body is flat.'},
      ]}
      steps={[
        {label: 'Look at each component in the tray.', hint: 'Check its shape, leads and printed type number.', done: items.some((_, k) => ans[k]?.name || ans[k]?.cls)},
        {label: 'Name all 12 components.', hint: `Use the Component list in the table. Named: ${items.filter((_, k) => nameOk(k)).length}/${items.length}.`, done: items.every((_, k) => nameOk(k))},
        {label: 'Mark each one active or passive.', hint: 'Active parts can amplify or control current.', done: items.every((_, k) => clsOk(k))},
        {label: 'Enter your details and print or save the record.', done: printed},
      ]}
      gu={GU_1_7_50}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Component tray">
        <PartGrid parts={items.map((c) => ({kind: c.kind, o: {mark: c.mark}}))} label="Twelve electronic components, numbered" />
      </Section>
      <Section title="Observation table">
        <Table
          head={['No.', 'Marking', 'Component', 'Active / passive', 'Check']}
          rows={items.map((c, k) => [
            k + 1,
            <span className={styles.num}>{c.mark ?? '–'}</span>,
            sel(
              `Component ${k + 1} name`,
              ans[k]?.name,
              COMPS.map((x) => [x.id, x.name]),
              (v) => set(k, {name: v}),
            ),
            sel(
              `Component ${k + 1} class`,
              ans[k]?.cls,
              [
                ['active', 'Active'],
                ['passive', 'Passive'],
              ],
              (v) => set(k, {cls: v}),
            ),
            ans[k]?.name && ans[k]?.cls ? <Verdict
                ok={nameOk(k) && clsOk(k)}
                fix={{
                  hint: L2(
                    'Look at the shape, the number of leads and the printed type number. Active = can amplify or control current (transistor, SCR, IC, diode). Passive = resistor, capacitor, inductor.',
                    'આકાર, લીડની સંખ્યા અને છાપેલો ટાઇપ નંબર જુઓ. એક્ટિવ = એમ્પ્લિફાય કે કરંટ કંટ્રોલ કરે (ટ્રાન્ઝિસ્ટર, SCR, IC, ડાયોડ). પેસિવ = રેઝિસ્ટર, કેપેસિટર, ઇન્ડક્ટર.',
                  ),
                  answer: `${c.name}, ${c.active ? 'Active' : 'Passive'}`,
                }}
              /> : '–',
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

// ---------------------------------------------------------------------------
// 1.7.52 Identify resistors by their appearance and check physical defects
// ---------------------------------------------------------------------------

type Defect = 'good' | 'burnt' | 'cracked' | 'brokenLead' | 'open';
const DEFECT_NAME: Record<Defect, string> = {good: 'Good', burnt: 'Burnt / charred', cracked: 'Cracked body', brokenLead: 'Broken lead', open: 'Open (no reading)'};

interface RType {
  id: string;
  name: string;
  kind: PartKind;
  mark?: string;
  ohms: number;
  bands?: string[];
}
const RTYPES: RType[] = [
  {id: 'cf', name: 'Carbon film', kind: 'resistor', ohms: 2200, bands: bandsFor(2200, 5, false)},
  {id: 'mf', name: 'Metal film', kind: 'metalfilm', ohms: 10000, bands: bandsFor(10000, 1, true)},
  {id: 'cement', name: 'Wire-wound (cement)', kind: 'cement', mark: '5W 10ΩJ', ohms: 10},
  {id: 'vit', name: 'Wire-wound (vitreous enamel)', kind: 'vitreous', mark: '25W 100Ω', ohms: 100},
  {id: 'smd', name: 'SMD resistor', kind: 'smd', mark: '472', ohms: 4700},
  {id: 'pot', name: 'Potentiometer', kind: 'pot', mark: 'B10K', ohms: 10000},
  {id: 'preset', name: 'Preset (trimpot)', kind: 'preset', mark: '103', ohms: 10000},
  {id: 'ldr', name: 'LDR', kind: 'ldr', ohms: 8500},
  {id: 'ntc', name: 'Thermistor (NTC)', kind: 'ntc', mark: '10D-9', ohms: 10},
];

export function ResistorTypesLab(): React.JSX.Element {
  const KEY = '1.7.52';
  const [seed, newKit] = useKitSeed(KEY);
  const items = useRng(seed, (rnd) => {
    const types = shuffle(RTYPES, rnd).slice(0, 8);
    // Three visible defects and one hidden open circuit.
    const defects: Defect[] = shuffle(['burnt', 'cracked', 'brokenLead', 'open', 'good', 'good', 'good', 'good'], rnd);
    return types.map((t, k) => ({...t, defect: defects[k], actual: t.ohms * (0.97 + rnd() * 0.06)}));
  });
  const [ans, setAns] = useStoredState<Record<number, {type?: string; cond?: string; meas?: string}>>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [fn, setFn] = useState('off');
  const [note, setNote] = useState<Note>(null);
  const probes = useProbes();
  const set = (k: number, p: object) => setAns((a) => ({...a, [k]: {...a[k], ...p}}));

  const [ri, rt] = (probes.red ?? ':').split(':');
  const [bi, bt] = (probes.black ?? ':').split(':');
  const on = ri && ri === bi && rt !== bt ? Number(ri) : null;
  const it = on != null ? items[on] : null;
  const r = !it ? Infinity : it.defect === 'open' || it.defect === 'brokenLead' ? Infinity : it.defect === 'burnt' ? it.actual * 3.4 : it.actual;
  const {text, unit} = ohmText(fn, r);

  const noteIt = () => {
    if (on == null) return setNote({kind: 'warn', text: 'Probes on both leads of one resistor.'});
    if (fn === 'off') return setNote({kind: 'warn', text: 'Select an Ω range.'});
    if (text === 'OL' && fn !== 'r2M') return setNote({kind: 'warn', text: 'OL: try a higher range.'});
    set(on, {meas: text === 'OL' ? 'OL' : `${text} ${unit}`});
    setNote({kind: text === 'OL' ? 'info' : 'good', text: text === 'OL' ? `Part ${on + 1}: OL on the highest range` : `Part ${on + 1}: ${text} ${unit}`});
  };

  const typeOk = (k: number) => ans[k]?.type === items[k].id;
  const condOk = (k: number) => ans[k]?.cond === items[k].defect;

  return (
    <PracticalSheet
      number={KEY}
      title="Identify Resistors by Appearance and Check for Physical Defects"
      aim="To identify types of resistors by their appearance and find defective ones by inspection and by measuring with a multimeter."
      apparatus={['Tray of 8 resistors (below)', 'Digital multimeter', 'Magnifying glass']}
      procedure={['Name each resistor type from its look and markings.', 'Inspect for burns, cracks and broken leads.', 'Measure each one. OL on the highest range means it is open.', 'Write the condition.']}
      precautions={['Measure resistors out of circuit.', 'For a potentiometer, measure between the two outer terminals.', 'A burnt resistor must be replaced with one of higher wattage, after finding the cause.']}
      viva={[
        {q: 'Where are wire-wound resistors used?', a: 'Where high power is needed: power supplies, motor circuits, loads. They have low values and high wattage.'},
        {q: 'Why are metal film resistors used in measuring circuits?', a: 'They have close tolerance (1 %), low noise and are stable with temperature.'},
        {q: 'What does the SMD code 472 mean?', a: '47 × 10² = 4700 Ω = 4.7 kΩ.'},
        {q: 'What usually happens to a burnt resistor’s value?', a: 'It increases, or it goes fully open.'},
        {q: 'Can you find an open resistor by looking?', a: 'Not always. An internal break looks normal; only the meter shows OL.'},
      ]}
      steps={[
        {label: 'Name the type of all 8 resistors.', hint: 'Look at the shape and markings. Use the Type list.', done: items.every((_, k) => typeOk(k))},
        {
          label: 'Measure all 8 with the meter.',
          hint: `Probes on both leads, pick an Ω range, Note reading. Measured: ${items.filter((_, k) => !!ans[k]?.meas).length}/${items.length}.`,
          done: items.every((_, k) => !!ans[k]?.meas),
        },
        {label: 'Set the condition of all 8.', hint: 'Also inspect for burns and cracks. OL on the top range means open.', done: items.every((_, k) => condOk(k))},
        {label: 'Enter your details and print or save the record.', done: printed},
      ]}
      gu={GU_1_7_52}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div>
            <PartGrid
              parts={items.map((it) => ({
                kind: it.kind,
                o: {mark: it.mark, bands: it.bands, burnt: it.defect === 'burnt', cracked: it.defect === 'cracked', brokenLead: it.defect === 'brokenLead'},
              }))}
              probes={probes}
              label="Eight resistors with test points on their leads"
            />
            <ProbeBar probes={probes} />
          </div>
          <div style={{display: 'grid', gap: '0.6rem', alignContent: 'start'}}>
            <Multimeter name="Digital multimeter" fn={fn} functions={OHM_FNS} text={text} unit={unit} placement={on != null ? `Part ${on + 1}` : undefined} onFunction={(f) => (setNote(null), setFn(f))} />
            <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} onClick={noteIt}>
              Note reading
            </button>
          </div>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table">
        <Table
          head={['No.', 'Type', 'Measured', 'Condition', 'Check']}
          rows={items.map((it, k) => [
            k + 1,
            sel(
              `Part ${k + 1} type`,
              ans[k]?.type,
              RTYPES.map((t) => [t.id, t.name]),
              (v) => set(k, {type: v}),
            ),
            <span className={styles.num}>{ans[k]?.meas ?? '–'}</span>,
            sel(`Part ${k + 1} condition`, ans[k]?.cond, Object.entries(DEFECT_NAME), (v) => set(k, {cond: v})),
            ans[k]?.type && ans[k]?.cond ? <Verdict
                ok={typeOk(k) && condOk(k)}
                fix={{
                  hint: L2(
                    'Type: look at the body and markings. Condition: inspect for burns, cracks and broken leads; OL on the top range means open.',
                    'ટાઇપ: બોડી અને માર્કિંગ જુઓ. કન્ડિશન: બળવું, તિરાડ, તૂટેલી લીડ તપાસો; ટોચની રેન્જમાં OL એટલે ઓપન.',
                  ),
                  answer: `${RTYPES.find((t) => t.id === it.id)?.name ?? it.id}, ${DEFECT_NAME[it.defect as keyof typeof DEFECT_NAME] ?? it.defect}`,
                }}
              /> : '–',
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

// ---------------------------------------------------------------------------
// 1.7.53 Identify the power rating of carbon resistors by their size
// ---------------------------------------------------------------------------

/** Typical carbon film body sizes: length × diameter (mm). */
export const SIZES: {w: number; label: string; len: number; dia: number}[] = [
  {w: 0.125, label: '1/8 W', len: 3.4, dia: 1.8},
  {w: 0.25, label: '1/4 W', len: 6.3, dia: 2.4},
  {w: 0.5, label: '1/2 W', len: 9, dia: 3.2},
  {w: 1, label: '1 W', len: 11.5, dia: 4.5},
  {w: 2, label: '2 W', len: 15.5, dia: 5},
];

const PX_MM = 14;

function Ruler({x, y, mm}: {x: number; y: number; mm: number}): React.JSX.Element {
  return (
    <g>
      <rect x={x - 6} y={y} width={mm * PX_MM + 12} height={30} rx={3} fill="#f0dfa8" />
      {Array.from({length: mm + 1}, (_, k) => (
        <g key={k}>
          <line x1={x + k * PX_MM} y1={y} x2={x + k * PX_MM} y2={y + (k % 5 === 0 ? 14 : 8)} stroke="#3a2a0a" strokeWidth={1} />
          {k % 5 === 0 && (
            <text x={x + k * PX_MM} y={y + 25} textAnchor="middle" style={{fill: '#3a2a0a', fontSize: 9, fontFamily: 'var(--ifm-font-family-base)'}}>
              {k}
            </text>
          )}
          {k < mm && <line x1={x + (k + 0.5) * PX_MM} y1={y} x2={x + (k + 0.5) * PX_MM} y2={y + 5} stroke="#3a2a0a" strokeWidth={0.6} />}
        </g>
      ))}
      <text x={x + mm * PX_MM + 2} y={y + 25} style={{fill: '#3a2a0a', fontSize: 9}}>
        mm
      </text>
    </g>
  );
}

export function PowerRatingLab(): React.JSX.Element {
  const KEY = '1.7.53';
  const [seed, newKit] = useKitSeed(KEY);
  const items = useRng(seed, (rnd) =>
    shuffle(SIZES, rnd).map((s) => {
      const ohms = Number(((E12[Math.floor(rnd() * E12.length)] / 10) * 10 ** (2 + Math.floor(rnd() * 3))).toPrecision(2));
      return {...s, len: Math.round((s.len + (rnd() - 0.5) * 0.4) * 2) / 2, ohms, bands: bandsFor(ohms, 5, false)};
    }),
  );
  const [ans, setAns] = useStoredState<Record<number, {len?: string; w?: string; i?: string}>>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const set = (k: number, p: object) => setAns((a) => ({...a, [k]: {...a[k], ...p}}));
  const num = (s?: string) => (s && s.trim() !== '' && !Number.isNaN(Number(s)) ? Number(s) : null);
  const res = items.map((it, k) => {
    const a = ans[k] ?? {};
    const imax = Math.sqrt(it.w / it.ohms) * 1000;
    return {
      len: a.len ? Math.abs((num(a.len) ?? -9) - it.len) <= 0.5 : null,
      w: a.w ? Number(a.w) === it.w : null,
      i: a.i ? near(num(a.i), imax, 0.03) : null,
    };
  });
  const RW = 18 * PX_MM + 60;
  const RH = 130;

  return (
    <PracticalSheet
      number={KEY}
      title="Identify the Power Rating of Carbon Resistors by Their Size"
      aim="To identify the wattage of carbon film resistors from their body size, and find the maximum safe current for each."
      apparatus={['Five carbon film resistors of different sizes', 'Steel rule (mm)']}
      procedure={[
        'Place the resistor on the rule and read the body length (without leads).',
        'Compare with the size chart: bigger body = higher wattage.',
        'Read the value from the colour code.',
        'Maximum safe current I = √(P ÷ R).',
      ]}
      precautions={['Measure the body only, not the leads.', 'In use, keep the power to about half the rating.']}
      viva={[
        {q: 'Why is a 2 W resistor bigger than a 1/4 W one?', a: 'A larger surface gets rid of more heat, so it can safely dissipate more power.'},
        {q: 'What happens if a resistor dissipates more than its rating?', a: 'It overheats, changes value, discolours and can burn open.'},
        {q: 'Max current in a 1 kΩ, 1/4 W resistor?', a: 'I = √(0.25 ÷ 1000) = 0.0158 A ≈ 15.8 mA.'},
      ]}
      steps={[
        {label: 'Measure the body length of R1 to R5.', hint: 'Read the rule, body only (not the leads). Enter mm.', done: res.every((r) => r.len)},
        {label: 'Pick the wattage of each from the size chart.', hint: 'Bigger body means higher wattage.', done: res.every((r) => r.w)},
        {label: 'Calculate the maximum current of each.', hint: 'I = √(P ÷ R). Enter in mA.', done: res.every((r) => r.i)},
        {label: 'Enter your details and print or save the record.', done: printed},
      ]}
      gu={GU_1_7_53}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.kit}>
          <svg viewBox={`0 0 ${RW} ${RH * items.length}`} role="img" aria-label="Five resistors placed on millimetre rules">
            {items.map((it, k) => {
              const y = k * RH;
              const x0 = 40;
              const len = it.len * PX_MM;
              return (
                <g key={k}>
                  <text x={8} y={y + 16} style={kitLabel}>
                    R{k + 1}
                  </text>
                  <AxialResistor cx={x0 + len / 2} cy={y + 45} len={len} dia={it.dia * PX_MM} bands={it.bands} lead={30} />
                  <line x1={x0} y1={y + 45 + (it.dia * PX_MM) / 2} x2={x0} y2={y + 84} stroke="#ff8c1a" strokeDasharray="3 3" />
                  <line x1={x0 + len} y1={y + 45 + (it.dia * PX_MM) / 2} x2={x0 + len} y2={y + 84} stroke="#ff8c1a" strokeDasharray="3 3" />
                  <Ruler x={x0} y={y + 84} mm={18} />
                </g>
              );
            })}
          </svg>
        </div>
        <details className={styles.muted} style={{marginTop: '0.5rem'}}>
          <summary>Size chart (typical)</summary>
          <Table head={['Rating', 'Body length', 'Diameter']} rows={SIZES.map((s) => [s.label, `≈ ${s.len} mm`, `≈ ${s.dia} mm`])} />
        </details>
      </Section>
      <Section title="Observation table">
        <Table
          head={['R', 'Value', 'Length (mm)', 'Rating', 'Max current (mA)', 'Check']}
          rows={items.map((it, k) => [
            `R${k + 1}`,
            fmtOhms(it.ohms),
            <input className={styles.input} style={{maxWidth: '5rem'}} inputMode="decimal" aria-label={`R${k + 1} length`} value={ans[k]?.len ?? ''} onChange={(e) => set(k, {len: e.target.value})} />,
            sel(
              `R${k + 1} rating`,
              ans[k]?.w,
              SIZES.map((s) => [String(s.w), s.label]),
              (v) => set(k, {w: v}),
            ),
            <input className={styles.input} style={{maxWidth: '6rem'}} inputMode="decimal" aria-label={`R${k + 1} maximum current`} value={ans[k]?.i ?? ''} onChange={(e) => set(k, {i: e.target.value})} />,
            Object.values(res[k]).some((x) => x == null) ? '–' : <Verdict
              ok={Object.values(res[k]).every(Boolean)}
              fix={{
                hint: L2(
                  `Wrong: ${(['len', 'w', 'i'] as const).filter((q) => !res[k][q]).join(', ')}. Read the body length only (not the leads), match it to the size chart, then I(max) = √(P ÷ R).`,
                  `ખોટું: ${(['len', 'w', 'i'] as const).filter((q) => !res[k][q]).join(', ')}. ફક્ત બોડીની લંબાઈ વાંચો (લીડ નહીં), સાઇઝ ચાર્ટ સાથે મેળવો, પછી I(max) = √(P ÷ R).`,
                ),
                work: L2(
                  `Length ≈ ${it.len} mm → ${it.w} W. I(max) = √(${it.w} ÷ ${it.ohms}) = ${fmt(Math.sqrt(it.w / it.ohms) * 1000)} mA.`,
                  `લંબાઈ ≈ ${it.len} mm → ${it.w} W. I(max) = √(${it.w} ÷ ${it.ohms}) = ${fmt(Math.sqrt(it.w / it.ohms) * 1000)} mA.`,
                ),
                answer: `${it.len} mm, ${it.w} W, ${fmt(Math.sqrt(it.w / it.ohms) * 1000)} mA`,
                entered: num(ans[k]?.i),
                expected: Math.sqrt(it.w / it.ohms) * 1000,
              }}
            />,
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

