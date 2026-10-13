import React, {useState} from 'react';
import clsx from 'clsx';
import useStoredState from '../useStoredState';
import type {Note} from '../kit';
import styles from '../styles.module.css';

// Tap-to-wire board for the mains control practicals. Terminals are points
// in an SVG; a wire joins two terminals. Nets are found with union–find.

export interface Terminal {
  id: string;
  x: number;
  y: number;
  label: string;
  /** Text drawn beside the terminal. */
  tag?: string;
  tagSide?: 'l' | 'r' | 't' | 'b';
}

export type Wire = [string, string];

const WIRE_COLOURS = ['#e0352b', '#2b5fd1', '#f2c230', '#2f9a3c', '#e9eef0', '#ef7d1a', '#8a3fc2'];

/** Union–find over terminal ids. Returns a function giving each id's net. */
export function netsOf(edges: Wire[]): (id: string) => string {
  const parent: Record<string, string> = {};
  const find = (x: string): string => {
    if (parent[x] == null) parent[x] = x;
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  for (const [a, b] of edges) parent[find(a)] = find(b);
  return find;
}

/** A load between two terminals is powered when one sits on L and the other on N. */
export function across(net: (id: string) => string, a: string, b: string, live: boolean): boolean {
  if (!live) return false;
  const L = net('L');
  const N = net('N');
  const x = net(a);
  const y = net(b);
  return (x === L && y === N) || (x === N && y === L);
}

export function useWiring(key: string, terminals: Terminal[], locked: boolean, onLocked: () => void) {
  const [wires, setWires] = useStoredState<Wire[]>(`lab:${key}:wires`, []);
  const [pick, setPick] = useState<string | null>(null);
  const byId = Object.fromEntries(terminals.map((t) => [t.id, t]));

  const tap = (id: string) => {
    if (locked) return onLocked();
    if (!pick) return setPick(id);
    if (pick === id) return setPick(null);
    const exists = wires.some(([a, b]) => (a === pick && b === id) || (a === id && b === pick));
    if (!exists) setWires((w) => [...w, [pick, id]]);
    setPick(null);
  };
  const cut = (k: number) => {
    if (locked) return onLocked();
    setWires((w) => w.filter((_, j) => j !== k));
  };

  const layer = (
    <g>
      {wires.map(([a, b], k) => {
        const p = byId[a];
        const q = byId[b];
        if (!p || !q) return null;
        const mx = (p.x + q.x) / 2;
        const my = (p.y + q.y) / 2 + Math.min(40, Math.abs(p.x - q.x) * 0.12) + 8;
        const d = `M${p.x} ${p.y} Q${mx} ${my} ${q.x} ${q.y}`;
        return (
          <g
            key={k}
            className={styles.clickable}
            role="button"
            tabIndex={0}
            aria-label={`Wire from ${p.label} to ${q.label}. Remove`}
            onClick={() => cut(k)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                cut(k);
              }
            }}>
            <path d={d} stroke="transparent" strokeWidth={14} fill="none" />
            <path d={d} stroke={WIRE_COLOURS[k % WIRE_COLOURS.length]} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.9} />
          </g>
        );
      })}
      {terminals.map((t) => {
        const sel = pick === t.id;
        const side = t.tagSide ?? 'r';
        const tx = side === 'l' ? t.x - 10 : side === 'r' ? t.x + 10 : t.x;
        const ty = side === 't' ? t.y - 10 : side === 'b' ? t.y + 18 : t.y + 4;
        return (
          <g
            key={t.id}
            className={styles.clickable}
            role="button"
            tabIndex={0}
            aria-label={`${t.label}${sel ? ', selected' : ''}. ${pick && !sel ? 'Connect wire here' : 'Start a wire'}`}
            onClick={() => tap(t.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                tap(t.id);
              }
            }}>
            <circle cx={t.x} cy={t.y} r={13} fill="transparent" />
            <circle cx={t.x} cy={t.y} r={6} fill={sel ? '#ffd34d' : '#c9a227'} stroke={sel ? '#fff' : '#6b5410'} strokeWidth={sel ? 2.5 : 1.5} />
            <circle cx={t.x} cy={t.y} r={2} fill="#3a2a0a" />
            {t.tag && (
              <text x={tx} y={ty} textAnchor={side === 'l' ? 'end' : side === 'r' ? 'start' : 'middle'} style={{fill: 'var(--lab-kit-ink)', fontSize: 11, fontWeight: 700, fontFamily: 'var(--ifm-font-family-base)'}}>
                {t.tag}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );

  const bar = (
    <div className={clsx(styles.probeBar, styles.noPrint)}>
      <span className={styles.muted}>{pick ? `From ${byId[pick]?.label}: tap the other end.` : 'Tap two terminals to run a wire. Tap a wire to remove it.'}</span>
      <button
        type="button"
        className={styles.btn}
        onClick={() => {
          if (locked) return onLocked();
          if (window.confirm('Remove all wires?')) setWires([]);
        }}>
        Remove all wires
      </button>
    </div>
  );

  return {wires, setWires, layer, bar};
}

export const LOCKED_NOTE: Note = {kind: 'bad', text: <b>Switch off the MCB before touching the wiring.</b>};

/** MCB drawn at (x, y); tap to toggle. */
export function Mcb({x, y, on, tripped, onToggle}: {x: number; y: number; on: boolean; tripped: boolean; onToggle: () => void}): React.JSX.Element {
  return (
    <g
      className={styles.clickable}
      role="button"
      tabIndex={0}
      aria-label={`MCB ${on ? 'ON. Switch off' : tripped ? 'tripped. Reset' : 'OFF. Switch on'}`}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}>
      <rect x={x} y={y} width={56} height={92} rx={4} fill="#f4f4f2" stroke="#c9c4b4" />
      <rect x={x + 16} y={y + 28} width={24} height={34} rx={3} fill="#3a3f45" />
      <rect x={x + 19} y={on ? y + 30 : y + 44} width={18} height={16} rx={2} fill="#2b5fd1" />
      <text x={x + 28} y={y + 18} textAnchor="middle" style={{fill: '#222', fontSize: 10, fontWeight: 700}}>
        C6
      </text>
      <text x={x + 28} y={y + 82} textAnchor="middle" style={{fill: on ? '#1f8a4c' : '#c8352a', fontSize: 10, fontWeight: 800}}>
        {on ? 'ON' : tripped ? 'TRIP' : 'OFF'}
      </text>
    </g>
  );
}

/** Lamp with two terminals below it. */
export function Lamp({x, y, lit, colour = '#ffd34d', label}: {x: number; y: number; lit: boolean; colour?: string; label: string}): React.JSX.Element {
  return (
    <g>
      {lit && <circle cx={x} cy={y} r={30} fill={colour} opacity={0.3} />}
      <circle cx={x} cy={y} r={18} fill={lit ? colour : '#4a5560'} stroke="#9aa3a8" strokeWidth={2} />
      <path d={`M${x - 10} ${y - 10} L${x + 10} ${y + 10} M${x + 10} ${y - 10} L${x - 10} ${y + 10}`} stroke={lit ? '#7a5a00' : '#2a3238'} strokeWidth={2} />
      <text x={x} y={y - 26} textAnchor="middle" style={{fill: 'var(--lab-kit-ink)', fontSize: 11, fontWeight: 700}}>
        {label}
      </text>
    </g>
  );
}
