import React, {useEffect, useState} from 'react';
import clsx from 'clsx';
import Multimeter from './Multimeter';
import SocketBoard, {ToolPicker, type MainsTool} from './SocketBoard';
import {ProbeBar, useProbes} from './Probes';
import {NoteBox, type Note} from './kit';
import {
  DMM_OHMS,
  GLOW_LABEL,
  HOLE_NAME,
  LAMP_OHMS,
  MAINS_DMM_FNS,
  dmmText,
  lampGlow,
  measure,
  neonGlows,
  pairOf,
  type Board,
  type Glow,
  type Hole,
} from './mains';
import styles from './styles.module.css';

export interface MainsReading {
  board: Board;
  tool: MainsTool;
  mcbOn: boolean;
  /** Pair of holes the probes are on, if both are placed. */
  pair: ReturnType<typeof pairOf>;
  dmmFn: string;
  dmmText: string;
  /** Volts shown by the DMM when it is on an AC V range and not over-range. */
  dmmVolts: number | null;
  glow: Glow | null;
  neonAt: Hole | null;
  neon: boolean | null;
}

/**
 * Shared mains bench: board picker, MCB, tool choice, neon / test lamp /
 * multimeter, with the meter-abuse safety lessons built in.
 */
export function useMainsBench(boards: Board[], tools: MainsTool[]) {
  const [idx, setIdx] = useState(0);
  const [mcb, setMcb] = useState<Record<number, boolean>>({});
  const [tool, setTool] = useState<MainsTool>(tools[0]);
  const [dmmFn, setDmmFn] = useState('off');
  const [damaged, setDamaged] = useState(false);
  const [neonAt, setNeonAt] = useState<Hole | null>(null);
  const [note, setNote] = useState<Note>(null);
  const probes = useProbes();

  const board = boards[Math.min(idx, boards.length - 1)];
  const mcbOn = mcb[board.id] ?? true;
  const pair = tool !== 'neon' ? pairOf(probes.red, probes.black) : null;

  let text = '';
  let unit = '';
  let dmmVolts: number | null = null;
  let liveVolts = 0;
  if (tool === 'dmm' && pair) {
    const m = measure(board, pair.a, pair.b, DMM_OHMS, mcbOn);
    liveVolts = m.volts;
    ({text, unit} = dmmText(dmmFn, m.volts));
    if ((dmmFn === 'acv750' || dmmFn === 'acv200') && text !== 'OL') dmmVolts = Number(text);
  } else if (tool === 'dmm') {
    ({text, unit} = dmmText(dmmFn, 0));
  }
  if (damaged && dmmFn !== 'off') {
    text = '';
    unit = '';
  }
  const lamp = tool === 'lamp' && pair ? lampGlow(measure(board, pair.a, pair.b, LAMP_OHMS, mcbOn).volts) : null;
  const neon = tool === 'neon' && neonAt ? neonGlows(board, neonAt, mcbOn) : null;

  // Ohms range on a live socket: the classic way to destroy a meter.
  useEffect(() => {
    if (tool === 'dmm' && dmmFn === 'ohm' && liveVolts > 30 && !damaged) {
      setDamaged(true);
      setNote({
        kind: 'bad',
        text: (
          <>
            <b>Meter damaged!</b> Ω range on a live socket. Check the selector before touching mains.
          </>
        ),
      });
    }
  }, [tool, dmmFn, liveVolts, damaged]);

  const reading: MainsReading = {
    board,
    tool,
    mcbOn,
    pair,
    dmmFn,
    dmmText: text,
    dmmVolts: damaged ? null : dmmVolts,
    glow: lamp?.glow ?? null,
    neonAt,
    neon,
  };

  const switchBoard = (k: number) => {
    setIdx(k);
    setNeonAt(null);
    setNote(null);
  };

  const view = (
    <>
      <div className={styles.controls} style={{marginTop: 0}}>
        <div>
          <SocketBoard
            board={board}
            mcbOn={mcbOn}
            onMcb={() => {
              setNote(null);
              setMcb((m) => ({...m, [board.id]: !mcbOn}));
            }}
            tool={tool}
            probes={probes}
            neonAt={neonAt}
            neonGlow={!!neon}
            onNeon={(h) => setNeonAt(h)}
            lampLevel={lamp?.level ?? 0}
          />
          {tool !== 'neon' && <ProbeBar probes={probes} />}
        </div>
        <div style={{display: 'grid', gap: '0.7rem', alignContent: 'start'}}>
          <div className={styles.card}>
            <span className={styles.label} style={{marginTop: 0}}>
              Switch board
            </span>
            <div className={styles.seg} role="group" aria-label="Switch board">
              {boards.map((b, k) => (
                <button key={b.id} type="button" aria-pressed={k === idx} onClick={() => switchBoard(k)}>
                  Board {b.id}
                </button>
              ))}
            </div>
            <span className={styles.label}>Tool</span>
            <ToolPicker
              tool={tool}
              tools={tools}
              onTool={(t) => {
                setTool(t);
                setNeonAt(null);
                setNote(null);
              }}
            />
            <p className={styles.muted} style={{marginTop: '0.6rem', marginBottom: 0}}>
              {tool === 'neon' &&
                (neonAt
                  ? `Neon in ${HOLE_NAME[neonAt]}: ${neon ? 'GLOWS' : 'no glow'}`
                  : 'Tap a hole to test it.')}
              {tool === 'lamp' &&
                (pair ? `${pair.label}: ${GLOW_LABEL[lamp!.glow]}` : 'Place both prods in two holes.')}
              {tool === 'dmm' && !pair && 'Place both probes in two holes.'}
              {tool === 'dmm' && pair && `Probes across ${pair.label}.`}
            </p>
          </div>
          {tool === 'dmm' && (
            <Multimeter
              name="Digital multimeter"
              fn={dmmFn}
              functions={MAINS_DMM_FNS}
              text={text}
              unit={unit}
              onFunction={(fn) => {
                setNote(null);
                setDmmFn(fn);
              }}
              fault={damaged ? 'Meter damaged' : null}
              repairLabel="Get a new meter"
              onRepair={() => {
                setDamaged(false);
                setDmmFn('off');
                setNote({kind: 'info', text: 'New meter issued.'});
              }}
            />
          )}
        </div>
      </div>
      <NoteBox
        note={note}
        status={
          !mcbOn
            ? {kind: 'info', text: 'MCB OFF: socket is dead.'}
            : tool === 'dmm' && dmmFn === 'acv200' && text === 'OL'
              ? {kind: 'warn', text: 'OL: use AC V 750 for mains.'}
              : tool === 'dmm' && dmmFn === 'dcv1000' && pair
                ? {kind: 'warn', text: 'DC range reads ~0 on AC. Use AC V.'}
                : null
        }
      />
    </>
  );

  return {reading, view, setNote, mcbOn, board, idx, probes};
}

export function GlowText({glow}: {glow: Glow | null | undefined}): React.JSX.Element {
  if (!glow) return <span className={styles.muted}>–</span>;
  return <span className={clsx(glow === 'full' && styles.ok)}>{GLOW_LABEL[glow]}</span>;
}
