import React, {useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import {GU_1_7_61} from './gu';
import Multimeter from '../Multimeter';
import useStoredState from '../useStoredState';
import {ProbeBar, ProbePoint, useProbes} from '../Probes';
import {NoteBox, ResetKit, Section, Table, Verdict, shuffle, useKitSeed, useRng, type Note} from '../kit';
import {kitLabel} from './parts';
import styles from '../styles.module.css';

const KEY = '1.7.61';

type Role = 'coil1' | 'coil2' | 'com' | 'nc' | 'no';
const ROLE_OPTS: [string, string][] = [
  ['coil', 'Coil'],
  ['com', 'Common (COM)'],
  ['nc', 'Normally closed (NC)'],
  ['no', 'Normally open (NO)'],
];
const roleKey = (r: Role) => (r === 'coil1' || r === 'coil2' ? 'coil' : r);

/** Dismantling order. */
const STEPS = ['cover', 'spring', 'armature', 'contacts', 'coil'] as const;
type Step = (typeof STEPS)[number];
const STEP_NAME: Record<Step, string> = {cover: 'Cover', spring: 'Return spring', armature: 'Armature', contacts: 'Fixed contacts (NO/NC)', coil: 'Coil with core'};

/** Parts to name, with callout positions on the drawing. */
const PARTS: {id: string; name: string; x: number; y: number; on?: Step}[] = [
  {id: 'coil', name: 'Coil', x: 112, y: 140, on: 'coil'},
  {id: 'core', name: 'Iron core', x: 112, y: 72, on: 'coil'},
  {id: 'yoke', name: 'Yoke (frame)', x: 46, y: 120},
  {id: 'armature', name: 'Armature', x: 150, y: 40, on: 'armature'},
  {id: 'spring', name: 'Return spring', x: 70, y: 46, on: 'spring'},
  {id: 'moving', name: 'Moving (common) contact', x: 262, y: 100, on: 'armature'},
  {id: 'nc', name: 'NC fixed contact', x: 292, y: 64, on: 'contacts'},
  {id: 'no', name: 'NO fixed contact', x: 292, y: 138, on: 'contacts'},
  {id: 'pins', name: 'Base pins', x: 200, y: 232},
];
/** Where each removed part is drawn in the tray (offset from its place). */
const TRAY: Record<Step, [number, number]> = {cover: [0, 0], spring: [486, 36], armature: [300, 150], contacts: [190, -16], coil: [304, -22]};

export default function RelayLab(): React.JSX.Element {
  const [seed, newKit] = useKitSeed(KEY);
  const kit = useRng(seed, (rnd) => ({pins: shuffle<Role>(['coil1', 'coil2', 'com', 'nc', 'no'], rnd), coilR: Math.round(360 + rnd() * 60)}));
  const [pinAns, setPinAns] = useStoredState<Record<number, string>>(`lab:${KEY}:pins`, {});
  const [clicked, setClicked] = useStoredState(`lab:${KEY}:clicked`, false);
  const [removed, setRemoved] = useStoredState<Step[]>(`lab:${KEY}:removed`, []);
  const [damage, setDamage] = useStoredState(`lab:${KEY}:damage`, 0);
  const [names, setNames] = useStoredState<Record<string, string>>(`lab:${KEY}:names`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [fn, setFn] = useState('off');
  const [energised, setEnergised] = useState(false);
  const [supply, setSupply] = useState<[string, string]>(['', '']);
  const [note, setNote] = useState<Note>(null);
  const [dNote, setDNote] = useState<Note>(null);
  const probes = useProbes();

  const role = (i: number) => kit.pins[i];
  const coilPins = [0, 1, 2, 3, 4].filter((i) => roleKey(role(i)) === 'coil');
  const a = probes.red?.startsWith('pin') ? Number(probes.red.slice(3)) : null;
  const b = probes.black?.startsWith('pin') ? Number(probes.black.slice(3)) : null;
  let r = Infinity;
  if (a != null && b != null && a !== b) {
    const pair = [role(a), role(b)].map(roleKey).sort().join('-');
    if (pair === 'coil-coil') r = kit.coilR;
    else if (pair === 'com-nc' && !energised) r = 0.1;
    else if (pair === 'com-no' && energised) r = 0.1;
  }
  const text = fn === 'off' ? '' : energised && r === kit.coilR ? 'Err' : !isFinite(r) ? 'OL' : fn === 'r2k' ? (r / 1000).toFixed(3) : r >= 200 ? 'OL' : (r + 0.3).toFixed(1);
  const unit = fn === 'r2k' ? 'kΩ' : fn === 'r200' ? 'Ω' : '';

  const energise = () => {
    if (energised) return (setEnergised(false), setNote({kind: 'info', text: 'Supply off. Contacts back to normal.'}));
    const [p, q] = supply.map(Number);
    if (supply.some((x) => x === '') || p === q) return setNote({kind: 'warn', text: 'Choose two pins for the 12 V supply.'});
    if (coilPins.includes(p) && coilPins.includes(q)) {
      setEnergised(true);
      setClicked(true);
      return setNote({kind: 'good', text: 'Click! Relay operated. Check COM–NO and COM–NC now.'});
    }
    const pair = [role(p), role(q)].map(roleKey).sort().join('-');
    setNote(pair === 'com-nc' ? {kind: 'bad', text: '12 V across closed contacts: supply shorted. Those are not coil pins.'} : {kind: 'warn', text: 'No click. Those are not the coil pins.'});
  };

  const remove = (s: Step) => {
    if (removed.includes(s)) return;
    const next = STEPS.find((x) => !removed.includes(x))!;
    if (s !== next) {
      setDamage((d) => d + 1);
      return setDNote({kind: 'bad', text: `Forced it: ${STEP_NAME[s].toLowerCase()} bent. Remove the ${STEP_NAME[next].toLowerCase()} first.`});
    }
    setRemoved((x) => [...x, s]);
    setDNote({kind: 'good', text: `${STEP_NAME[s]} removed.`});
  };
  const gone = (s: Step) => removed.includes(s);
  const step = (s: Step, children: React.ReactNode) => (
    <g
      className={clsx(!gone(s) && styles.clickable)}
      role="button"
      tabIndex={gone(s) ? -1 : 0}
      aria-label={`${STEP_NAME[s]}${gone(s) ? ' (removed)' : '. Remove'}`}
      onClick={() => remove(s)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          remove(s);
        }
      }}
      transform={gone(s) ? `translate(${TRAY[s][0]} ${TRAY[s][1]})` : undefined}
      opacity={gone(s) ? 0.85 : 1}>
      {children}
    </g>
  );

  const pinsOk = [0, 1, 2, 3, 4].every((i) => pinAns[i] === roleKey(role(i)));
  const namesOk = PARTS.every((p) => names[p.id] === p.id);
  const armTip = energised ? 116 : 96;

  return (
    <PracticalSheet
      number={KEY}
      title="Dismantle and Identify the Parts of a Relay"
      aim="To identify the pins of a relay with a multimeter, dismantle it in the correct order and identify its parts."
      apparatus={['12 V SPDT relay (5 pins)', 'Digital multimeter', '12 V DC supply', 'Small screwdriver, tweezers']}
      procedure={[
        'Find the coil pins: the only pair with a few hundred ohms.',
        'Find COM and NC: the pair that reads 0 Ω with the coil off.',
        'Apply 12 V to the coil. COM–NO should now read 0 Ω.',
        'Dismantle: cover → return spring → armature → fixed contacts → coil.',
        'Name each part.',
      ]}
      precautions={['Do not apply voltage to the contact pins.', 'Do not force parts: remove them in order.', 'Keep small parts (spring) in a tray.']}
      viva={[
        {q: 'How does a relay work?', a: 'Current in the coil magnetises the core. It pulls the armature, which moves the common contact from NC to NO.'},
        {q: 'What brings the armature back?', a: 'The return spring, when the coil is de-energised.'},
        {q: 'What is the coil resistance of a 12 V, 400 Ω relay used for?', a: 'To find the coil current: I = 12 ÷ 400 = 30 mA, so you can choose the driving transistor.'},
        {q: 'Why is a diode connected across a relay coil?', a: 'To absorb the high back-EMF when the coil is switched off, protecting the driver transistor.'},
      ]}
      steps={[
        {
          label: 'Find the two coil pins and mark them in the table.',
          hint: 'Ω 200 range. The coil pair reads a few hundred ohms.',
          done: [0, 1, 2, 3, 4].filter((i) => roleKey(role(i)) === 'coil').every((i) => pinAns[i] === 'coil'),
        },
        {
          label: 'Find COM and NC and mark them.',
          hint: 'With the coil off, COM–NC reads 0 Ω.',
          done: [0, 1, 2, 3, 4].filter((i) => roleKey(role(i)) === 'com' || roleKey(role(i)) === 'nc').every((i) => pinAns[i] === roleKey(role(i))),
        },
        {label: 'Apply 12 V to the coil pins and hear the click.', hint: 'Choose the two coil pins in the supply list.', done: clicked},
        {
          label: 'Find NO and mark it.',
          hint: 'With the coil energised, COM–NO reads 0 Ω.',
          done: [0, 1, 2, 3, 4].filter((i) => roleKey(role(i)) === 'no').every((i) => pinAns[i] === 'no'),
        },
        {
          label: 'Dismantle the relay in the correct order.',
          hint: `Cover, spring, armature, contacts, coil. Removed: ${removed.length}/${STEPS.length}.`,
          done: removed.length === STEPS.length,
        },
        {label: 'Name all nine parts.', hint: 'Use the part names in the table.', done: namesOk},
        {label: 'Enter your details and print or save the record.', done: printed},
      ]}
      gu={GU_1_7_61}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench: pin test">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div>
            <div className={styles.kit}>
              <svg viewBox="0 0 460 210" role="img" aria-label="Relay seen from below with five pins P1 to P5">
                <rect x={110} y={20} width={240} height={140} rx={8} fill="#1d1d1d" />
                <text x={230} y={50} textAnchor="middle" style={kitLabel}>
                  12VDC · SRD-12VDC-SL-C
                </text>
                <text x={230} y={68} textAnchor="middle" style={{...kitLabel, fill: '#9fb0ba', fontSize: 10}}>
                  10A 250VAC
                </text>
                {[0, 1, 2, 3, 4].map((i) => {
                  const x = 150 + i * 40;
                  return (
                    <g key={i}>
                      <rect x={x - 4} y={150} width={8} height={30} fill="#c9ced1" />
                      <text x={x} y={140} textAnchor="middle" style={kitLabel}>
                        P{i + 1}
                      </text>
                      <ProbePoint id={`pin${i}`} x={x} y={186} probes={probes} label={`Pin P${i + 1}`} r={5} />
                    </g>
                  );
                })}
                <text x={230} y={110} textAnchor="middle" style={{...kitLabel, fill: energised ? '#ffd34d' : '#9fb0ba'}}>
                  {energised ? 'COIL ENERGISED' : 'coil off'}
                </text>
              </svg>
            </div>
            <ProbeBar probes={probes} />
          </div>
          <div style={{display: 'grid', gap: '0.6rem', alignContent: 'start'}}>
            <Multimeter
              name="Digital multimeter"
              fn={fn}
              functions={[
                {fn: 'off', label: 'OFF'},
                {fn: 'r200', label: 'Ω 200'},
                {fn: 'r2k', label: 'Ω 2k'},
              ]}
              text={text}
              unit={unit}
              onFunction={(f) => (setNote(null), setFn(f))}
            />
            <div className={clsx(styles.card, styles.noPrint)}>
              <span className={styles.label} style={{marginTop: 0}}>
                12 V supply to pins
              </span>
              <div style={{display: 'flex', gap: '0.4rem'}}>
                {[0, 1].map((j) => (
                  <select key={j} className={styles.select} aria-label={`Supply lead ${j + 1} pin`} value={supply[j]} disabled={energised} onChange={(e) => setSupply((s) => (j ? [s[0], e.target.value] : [e.target.value, s[1]]))}>
                    <option value="">{j ? '−' : '+'}</option>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <option key={i} value={i}>
                        P{i + 1}
                      </option>
                    ))}
                  </select>
                ))}
              </div>
              <button type="button" className={styles.btn} style={{marginTop: '0.5rem'}} onClick={energise}>
                {energised ? 'Switch supply off' : 'Switch supply on'}
              </button>
            </div>
          </div>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table: pins">
        <Table
          head={['Pin', 'Function', 'Check']}
          rows={[0, 1, 2, 3, 4].map((i) => [
            `P${i + 1}`,
            <select className={styles.select} aria-label={`Pin P${i + 1} function`} value={pinAns[i] ?? ''} onChange={(e) => setPinAns((x) => ({...x, [i]: e.target.value}))}>
              <option value="">Choose…</option>
              {ROLE_OPTS.map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </select>,
            pinAns[i] ? <Verdict ok={pinAns[i] === roleKey(role(i))} /> : '–',
          ])}
        />
        <p className={styles.muted}>Coil resistance: {Object.values(pinAns).filter((x) => x === 'coil').length === 2 && pinsOk ? `${kit.coilR} Ω` : 'measure it'}.</p>
      </Section>
      <Section title="Bench: dismantle">
        <p className={styles.muted} style={{marginTop: 0}}>
          Tap a part to remove it. Removed parts go to the tray on the right.
        </p>
        <div className={styles.kit}>
          <svg viewBox="0 0 620 260" role="img" aria-label="Relay internals: coil, core, yoke, armature, spring, contacts, base">
            <rect x={380} y={10} width={230} height={240} rx={8} fill="#2c3a44" stroke="#3d4d58" strokeDasharray="5 4" />
            <text x={495} y={28} textAnchor="middle" style={kitLabel}>
              Parts tray
            </text>
            {/* Base and pins */}
            <rect x={20} y={196} width={330} height={20} rx={3} fill="#3a3f45" />
            {[80, 140, 200, 260, 320].map((x) => (
              <rect key={x} x={x - 3} y={214} width={6} height={22} fill="#c9ced1" />
            ))}
            {/* Yoke */}
            <path d="M40 196 V36 H86 V46 H52 V184 H160 V196 Z" fill="#8d969b" />
            {step(
              'coil',
              <g>
                <rect x={86} y={90} width={52} height={100} rx={4} fill="#b87333" />
                {Array.from({length: 14}, (_, k) => (
                  <path key={k} d={`M86 ${96 + k * 7} h52`} stroke="#8a5424" strokeWidth={1} />
                ))}
                <rect x={100} y={66} width={24} height={26} fill="#9aa3a8" />
                <rect x={96} y={62} width={32} height={6} fill="#b4babe" />
              </g>,
            )}
            {step(
              'contacts',
              <g>
                <rect x={300} y={56} width={8} height={140} fill="#c9ced1" />
                <rect x={270} y={56} width={34} height={8} fill="#c9ced1" />
                <circle cx={272} cy={68} r={5} fill="#d6b25e" />
                <rect x={322} y={128} width={8} height={68} fill="#c9ced1" />
                <rect x={270} y={136} width={60} height={8} fill="#c9ced1" />
                <circle cx={272} cy={132} r={5} fill="#d6b25e" />
              </g>,
            )}
            {step(
              'armature',
              <g>
                <path d={`M86 40 L180 50 L270 ${armTip - 4} L270 ${armTip + 4} L180 58 L86 48 Z`} fill="#a9b1b6" />
                <circle cx={270} cy={armTip} r={5} fill="#d6b25e" />
              </g>,
            )}
            {step(
              'spring',
              <path d="M70 46 l6 -8 l6 8 l6 -8 l6 8 l6 -8 l6 8" stroke="#e1e4e7" strokeWidth={2} fill="none" transform="translate(-16 -14)" />,
            )}
            {!gone('cover') && step('cover', <rect x={14} y={8} width={348} height={214} rx={10} fill="#bcd7ff" opacity={0.28} stroke="#8fb4ff" strokeWidth={2} />)}
            {gone('cover') &&
              PARTS.map((p, k) => (
                <g key={p.id} transform={p.on && gone(p.on) ? `translate(${TRAY[p.on][0]} ${TRAY[p.on][1]})` : undefined}>
                  <circle cx={p.x} cy={p.y} r={10} fill="#ff8c1a" />
                  <text x={p.x} y={p.y + 4} textAnchor="middle" style={{...kitLabel, fill: '#111'}}>
                    {k + 1}
                  </text>
                </g>
              ))}
          </svg>
        </div>
        <NoteBox note={dNote} />
        <p className={styles.muted}>
          Removed: {removed.map((s) => STEP_NAME[s]).join(' → ') || 'nothing yet'}
          {damage > 0 && <span className={styles.no}> · Parts bent by forcing: {damage}</span>}
        </p>
      </Section>
      <Section title="Observation table: parts">
        {!gone('cover') ? (
          <p className={styles.muted}>Remove the cover to see the numbered parts.</p>
        ) : (
          <Table
            head={['No.', 'Part', 'Check']}
            rows={PARTS.map((p, k) => [
              k + 1,
              <select className={styles.select} aria-label={`Part ${k + 1} name`} value={names[p.id] ?? ''} onChange={(e) => setNames((x) => ({...x, [p.id]: e.target.value}))}>
                <option value="">Choose…</option>
                {[...PARTS].sort((x, y) => x.name.localeCompare(y.name)).map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>,
              names[p.id] ? <Verdict ok={names[p.id] === p.id} /> : '–',
            ])}
          />
        )}
        <ResetKit
          onReset={() => {
            setPinAns({});
            setClicked(false);
            setRemoved([]);
            setDamage(0);
            setNames({});
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}

