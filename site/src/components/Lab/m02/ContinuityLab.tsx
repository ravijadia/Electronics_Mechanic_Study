import React, {useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import {GU_1_2_26} from './gu';
import Multimeter from '../Multimeter';
import useStoredState from '../useStoredState';
import {ProbeBar, ProbePoint, useProbes} from '../Probes';
import {Empty, NoteBox, ResetKit, Section, Table, Verdict, shuffle, useKitSeed, useRng, type Note} from '../kit';
import {L2} from '../solution';
import styles from '../styles.module.css';

const KEY = '1.2.26';

interface Item {
  id: string;
  name: string;
  kind: 'wire' | 'fuse' | 'cartridge' | 'switch';
  good: boolean;
  /** Resistance when continuous (Ω). */
  ohms: number;
}

const FNS = [
  {fn: 'off', label: 'OFF'},
  {fn: 'cont', label: 'Continuity •))'},
  {fn: 'ohm200', label: 'Ω 200'},
  {fn: 'acv750', label: 'AC V 750'},
];

interface Obs {
  text: string;
  beep: boolean;
  /** For switches: position when tested. */
  pos?: 'on' | 'off';
}

/** 1.2.26 Check the continuity of wires, meter probes and fuses. */
export default function ContinuityLab(): React.JSX.Element {
  const [seed, newKit] = useKitSeed(KEY);
  const kit = useRng(seed, (rnd) => {
    const wiresBad = Math.floor(rnd() * 4);
    const fuseFlags = shuffle([true, false, rnd() < 0.5], rnd);
    const items: Item[] = [
      ...[0, 1, 2, 3].map((k) => ({id: `w${k + 1}`, name: `Wire W${k + 1}`, kind: 'wire' as const, good: k !== wiresBad, ohms: Number((0.1 + rnd() * 0.4).toFixed(1))})),
      {id: 'f1', name: 'Glass fuse F1', kind: 'fuse', good: fuseFlags[0], ohms: 0.2},
      {id: 'f2', name: 'Glass fuse F2', kind: 'fuse', good: fuseFlags[1], ohms: 0.3},
      {id: 'f3', name: 'Cartridge fuse F3', kind: 'cartridge', good: fuseFlags[2], ohms: 0.1},
      {id: 's1', name: 'Toggle switch S1', kind: 'switch', good: rnd() < 0.6, ohms: 0.1},
    ];
    return {items, leadsBroken: rnd() < 0.5};
  });
  const [obs, setObs] = useStoredState<Record<string, Obs>>(`lab:${KEY}:obs`, {});
  const [verdicts, setVerdicts] = useStoredState<Record<string, '' | 'good' | 'faulty'>>(`lab:${KEY}:v`, {});
  const [leadsChecked, setLeadsChecked] = useStoredState(`lab:${KEY}:leads`, false);
  const [leadsReplaced, setLeadsReplaced] = useStoredState(`lab:${KEY}:replaced`, false);
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [fn, setFn] = useState('off');
  const [switchOn, setSwitchOn] = useState(true);
  const [note, setNote] = useState<Note>(null);
  const probes = useProbes();

  const leadsOk = !kit.leadsBroken || leadsReplaced;
  const shorted = probes.red === 'short' && probes.black === 'short';
  const [ri, re] = (probes.red ?? ':').split(':');
  const [bi, be] = (probes.black ?? ':').split(':');
  const item = ri && ri === bi && re !== be ? kit.items.find((x) => x.id === ri) ?? null : null;

  // Path resistance seen by the meter.
  let ohms = Infinity;
  if (shorted) ohms = 0.1;
  else if (item) {
    const closed = item.kind === 'switch' ? switchOn && item.good : item.good;
    ohms = closed ? item.ohms : Infinity;
  }
  if (!leadsOk) ohms = Infinity;

  let text = '';
  let unit = '';
  let beep = false;
  if (fn === 'cont' || fn === 'ohm200') {
    unit = 'Ω';
    text = isFinite(ohms) ? ohms.toFixed(1) : 'OL';
    beep = fn === 'cont' && ohms < 30;
  } else if (fn === 'acv750') {
    unit = 'V AC';
    text = '0';
  }

  const touchProbes = () => {
    probes.set('short', 'short');
    if (fn !== 'cont') return setNote({kind: 'info', text: 'Select continuity first.'});
    setLeadsChecked(true);
    setNote(
      leadsOk
        ? {kind: 'good', text: 'Beep, 0.1 Ω: leads OK.'}
        : {kind: 'bad', text: 'No beep, OL with probes touching: a test lead is broken.'},
    );
  };

  const record = () => {
    if (!item) return setNote({kind: 'warn', text: 'Probes on both ends of one item.'});
    if (fn !== 'cont' && fn !== 'ohm200') return setNote({kind: 'warn', text: 'Select continuity.'});
    if (!leadsChecked)
      return setNote({kind: 'warn', text: 'Check the leads first: touch the probes together.'});
    if (!leadsOk)
      return setNote({kind: 'bad', text: 'Replace the faulty leads first.'});
    setObs((o) => ({...o, [item.id + (item.kind === 'switch' ? `:${switchOn ? 'on' : 'off'}` : '')]: {text, beep, pos: item.kind === 'switch' ? (switchOn ? 'on' : 'off') : undefined}}));
    setNote({kind: 'info', text: `${item.name}${item.kind === 'switch' ? ` (${switchOn ? 'ON' : 'OFF'})` : ''}: ${text} Ω${beep ? ', beep' : ', no beep'}. Noted.`});
  };

  const truthGood = (it: Item) => it.good;
  const tested = (it: Item) => (it.kind === 'switch' ? obs[`${it.id}:on`] && obs[`${it.id}:off`] : obs[it.id]);
  const allTested = kit.items.every(tested);
  const allJudged = kit.items.every((it) => verdicts[it.id]);
  const allRight = kit.items.every((it) => verdicts[it.id] === (truthGood(it) ? 'good' : 'faulty'));

  // drawing layout: 4 wires on the left column, 3 fuses + switch on the right
  const layout = kit.items.map((it, k) => ({it, x: k < 4 ? 30 : 340, y: 30 + (k % 4) * 62}));

  return (
    <PracticalSheet
      number={KEY}
      title="Check the Continuity of Wires, Meter Probes and Fuses"
      aim="To check the continuity of wires, test leads, fuses and a switch with a multimeter, and to find the faulty ones."
      apparatus={['Digital multimeter with continuity (buzzer) range', 'Four pieces of wire, three fuses, a toggle switch']}
      procedure={[
        'Set the meter to continuity. Touch the two probes together: it should beep and show nearly 0 Ω. This checks the meter and its leads.',
        'Put the probes on the two ends of each wire and fuse. Note the reading.',
        'Test the switch in both the ON and OFF positions.',
        'A beep / low reading means continuity (good). OL means open (broken wire or blown fuse).',
        'Decide whether each item is good or faulty.',
      ]}
      precautions={['Test continuity only on dead (disconnected) items.', 'Always check the leads first by touching the probes together.', 'Do not touch both probe tips with your fingers: your body resistance can confuse the reading.']}
      viva={[
        {q: 'What does continuity mean?', a: 'An unbroken, low-resistance path for current from one end to the other.'},
        {q: 'Why check the probes first?', a: 'A broken lead makes every item read OL, so good items would wrongly look open.'},
        {q: 'A glass fuse looks fine but reads OL. What does that tell you?', a: 'It has blown. Sometimes the break is too small to see, so always test it.'},
        {q: 'What should a good switch read in its ON and OFF positions?', a: 'ON: nearly 0 Ω with a beep. OFF: OL.'},
        {q: 'Why must continuity never be tested on a live circuit?', a: 'The meter sends its own small current. External voltage can damage the meter and give a false reading.'},
      ]}
      steps={[
        {label: 'Touch the probes together to check the meter and leads.', hint: 'Reading near 0 Ω means the leads are good.', done: leadsChecked && leadsOk},
        {label: 'Test every item. Test the switch in both positions.', hint: 'Items must not be connected to any supply.', done: allTested},
        {label: 'Mark each item good or faulty.', hint: 'Judge from your readings.', done: allJudged && allRight},
        {label: 'Enter your details and print or save the record.', hint: 'Practical record, below the result.', done: printed},
      ]}
      gu={GU_1_2_26}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div>
            <div className={styles.kit}>
              <svg viewBox="0 0 640 270" role="img" aria-label="Items to test: four wires, three fuses and a toggle switch">
                {layout.map(({it, x, y}) => {
                  const a = {x: x + 30, y: y + 22};
                  const b = {x: x + 240, y: y + 22};
                  return (
                    <g key={it.id}>
                      <text x={x + 135} y={y + 4} textAnchor="middle" className={clsx(styles.kitText, styles.small)}>
                        {it.name}
                      </text>
                      {it.kind === 'wire' && <path d={`M${a.x} ${a.y} C ${a.x + 70} ${a.y - 18}, ${b.x - 70} ${b.y + 18}, ${b.x} ${b.y}`} stroke={['#d4302a', '#2b5fd1', '#e8c21f', '#2f9a3c'][Number(it.id[1]) - 1]} strokeWidth="6" fill="none" strokeLinecap="round" />}
                      {(it.kind === 'fuse' || it.kind === 'cartridge') && (
                        <g>
                          <line x1={a.x} y1={a.y} x2={a.x + 50} y2={a.y} className={styles.wire} />
                          <line x1={b.x - 50} y1={b.y} x2={b.x} y2={b.y} className={styles.wire} />
                          <rect x={a.x + 50} y={a.y - 11} width={110} height={22} rx={it.kind === 'fuse' ? 4 : 11} fill={it.kind === 'fuse' ? 'rgba(220,235,245,0.35)' : '#e9e1cf'} stroke="#c9c9c9" />
                          {it.kind === 'fuse' && <line x1={a.x + 54} y1={a.y} x2={a.x + 156} y2={a.y} stroke="#c0c0c0" strokeWidth="1.2" />}
                          <rect x={a.x + 50} y={a.y - 12} width={14} height={24} fill="#b8b8b8" />
                          <rect x={a.x + 146} y={a.y - 12} width={14} height={24} fill="#b8b8b8" />
                        </g>
                      )}
                      {it.kind === 'switch' && (
                        <g>
                          <line x1={a.x} y1={a.y} x2={a.x + 70} y2={a.y} className={styles.wire} />
                          <line x1={b.x - 70} y1={b.y} x2={b.x} y2={b.y} className={styles.wire} />
                          <rect x={a.x + 70} y={a.y - 18} width={70} height={36} rx={6} fill="#3a3a3a" />
                          <rect x={a.x + (switchOn ? 106 : 76)} y={a.y - 12} width={28} height={24} rx={4} fill="#e8e8e8" />
                          <text x={a.x + 105} y={a.y + 34} textAnchor="middle" className={clsx(styles.kitText, styles.small)}>
                            {switchOn ? 'ON' : 'OFF'}
                          </text>
                        </g>
                      )}
                      <ProbePoint id={`${it.id}:a`} x={a.x} y={a.y} probes={probes} label={`${it.name} end A`} />
                      <ProbePoint id={`${it.id}:b`} x={b.x} y={b.y} probes={probes} label={`${it.name} end B`} />
                    </g>
                  );
                })}
              </svg>
            </div>
            <ProbeBar probes={probes} />
            <div className={clsx(styles.row, styles.noPrint)} style={{marginTop: '0.5rem'}}>
              <button type="button" className={styles.btn} onClick={touchProbes}>
                Touch probes together
              </button>
              <button type="button" className={styles.btn} aria-pressed={switchOn} onClick={() => setSwitchOn((s) => !s)}>
                Switch S1: {switchOn ? 'ON' : 'OFF'} (toggle)
              </button>
              {kit.leadsBroken && leadsChecked && !leadsReplaced && (
                <button
                  type="button"
                  className={clsx(styles.btn, styles.danger)}
                  onClick={() => {
                    setLeadsReplaced(true);
                    setLeadsChecked(false);
                    setNote({kind: 'info', text: 'New leads fitted. Check them again.'});
                  }}>
                  Replace test leads
                </button>
              )}
            </div>
          </div>
          <div style={{display: 'grid', gap: '0.7rem', alignContent: 'start'}}>
            <Multimeter
              name="Digital multimeter"
              fn={fn}
              functions={FNS}
              text={text}
              unit={unit}
              placement={shorted ? 'Probes touching' : item ? item.name : 'Not connected'}
              onFunction={(f) => {
                setNote(null);
                setFn(f);
              }}
              indicator={beep ? '•)) BEEP' : null}
            />
            <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} onClick={record}>
              Note reading
            </button>
          </div>
        </div>
        <NoteBox note={note} />
      </Section>
      <Section title="Observation table and result">
        {Object.keys(obs).length === 0 ? (
          <Empty>No readings yet.</Empty>
        ) : (
          <Table
            head={['Item', 'Reading', 'Beep?', 'Your verdict', 'Check']}
            rows={kit.items.map((it) => {
              const r =
                it.kind === 'switch'
                  ? [obs[`${it.id}:on`], obs[`${it.id}:off`]].map((o, j) => (o ? `${j ? 'OFF' : 'ON'}: ${o.text} Ω` : `${j ? 'OFF' : 'ON'}: –`)).join(' / ')
                  : obs[it.id]
                    ? `${obs[it.id].text} Ω`
                    : '–';
              const b = it.kind === 'switch' ? [obs[`${it.id}:on`]?.beep, obs[`${it.id}:off`]?.beep].map((x) => (x == null ? '–' : x ? 'Yes' : 'No')).join(' / ') : obs[it.id] ? (obs[it.id].beep ? 'Yes' : 'No') : '–';
              return [
                it.name,
                <span className={styles.num}>{r}</span>,
                b,
                <select className={styles.select} aria-label={`${it.name} verdict`} value={verdicts[it.id] ?? ''} onChange={(e) => setVerdicts((v) => ({...v, [it.id]: e.target.value as 'good'}))}>
                  <option value="">Choose…</option>
                  <option value="good">Good</option>
                  <option value="faulty">Faulty (open)</option>
                </select>,
                verdicts[it.id] ? <Verdict
                    ok={verdicts[it.id] === (it.good ? 'good' : 'faulty')}
                    fix={{
                      hint: L2(
                        'Good = beep and a reading near 0 Ω. Faulty (open) = OL and no beep. A switch should beep when ON and read OL when OFF.',
                        'સારું = બીપ અને 0 Ω ની નજીક રીડિંગ. ખરાબ (ઓપન) = OL અને બીપ નહીં. સ્વિચ ON હોય ત્યારે બીપ અને OFF હોય ત્યારે OL બતાવવું જોઈએ.',
                      ),
                      answer: it.good ? 'Good' : 'Faulty (open)',
                    }}
                  /> : '–',
              ];
            })}
          />
        )}
        <ResetKit
          onReset={() => {
            setObs({});
            setVerdicts({});
            setLeadsChecked(false);
            setLeadsReplaced(false);
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}
