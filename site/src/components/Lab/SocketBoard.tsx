import React from 'react';
import clsx from 'clsx';
import {ProbePoint, type Probes} from './Probes';
import type {Board, Hole} from './mains';
import styles from './styles.module.css';

export type MainsTool = 'dmm' | 'lamp' | 'neon';

const HOLES: Record<Hole, {x: number; y: number; r: number}> = {
  E: {x: 260, y: 92, r: 11},
  L: {x: 224, y: 168, r: 7.5},
  R: {x: 296, y: 168, r: 7.5},
};

const INK = '#2b2b2b';

/**
 * Switch-board drawing: MCB, 3-pin socket, and (depending on the tool) a
 * test lamp or a neon tester.
 */
export default function SocketBoard({
  board,
  mcbOn,
  onMcb,
  tool,
  probes,
  neonAt,
  neonGlow,
  onNeon,
  lampLevel,
}: {
  board: Board;
  mcbOn: boolean;
  onMcb: () => void;
  tool: MainsTool;
  probes: Probes;
  neonAt: Hole | null;
  neonGlow: boolean;
  onNeon: (h: Hole) => void;
  lampLevel: number;
}): React.JSX.Element {
  const key = (fn: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fn();
    }
  };
  return (
    <div className={clsx(styles.kit, styles.fit)}>
      <svg viewBox="0 0 520 260" role="img" aria-label={`Switch board ${board.id}: MCB and a 3-pin socket`}>
        <rect x="10" y="10" width="500" height="240" rx="14" fill="#ebe6d8" stroke="#b9b19c" strokeWidth="2" />
        <text x="496" y="32" textAnchor="end" style={{fill: INK, fontWeight: 800, fontSize: 14}}>
          Board {board.id}
        </text>

        {/* MCB */}
        <g
          className={styles.clickable}
          role="button"
          tabIndex={0}
          aria-label={mcbOn ? 'MCB is ON. Switch it off' : 'MCB is OFF. Switch it on'}
          onClick={onMcb}
          onKeyDown={key(onMcb)}>
          <rect x="40" y="56" width="70" height="140" rx="6" fill="#fafafa" stroke="#9a9a9a" strokeWidth="1.5" />
          <rect x="62" y="96" width="26" height="60" rx="4" fill="#d9d9d9" />
          <rect x="60" y={mcbOn ? 94 : 126} width="30" height="32" rx="4" fill={mcbOn ? '#1f6fd1' : '#555'} />
          <text x="75" y="76" textAnchor="middle" style={{fill: INK, fontSize: 11, fontWeight: 700}}>
            MCB 6 A
          </text>
          <text x="75" y="184" textAnchor="middle" style={{fill: mcbOn ? '#1f6fd1' : '#555', fontSize: 12, fontWeight: 800}}>
            {mcbOn ? 'ON' : 'OFF'}
          </text>
          <text x="75" y="216" textAnchor="middle" style={{fill: '#555', fontSize: 10}}>
            (tap)
          </text>
        </g>

        {/* Socket */}
        <rect x="170" y="44" width="180" height="180" rx="18" fill="#f8f6f0" stroke="#a9a28c" strokeWidth="2" />
        {(Object.keys(HOLES) as Hole[]).map((h) => {
          const p = HOLES[h];
          return (
            <g key={h}>
              {h === 'E' ? (
                <rect x={p.x - 8} y={p.y - 14} width="16" height="28" rx="6" fill="#262626" />
              ) : (
                <circle cx={p.x} cy={p.y} r={p.r} fill="#262626" />
              )}
            </g>
          );
        })}
        <text x="224" y="198" textAnchor="middle" style={{fill: '#666', fontSize: 10}}>
          left
        </text>
        <text x="296" y="198" textAnchor="middle" style={{fill: '#666', fontSize: 10}}>
          right
        </text>
        <text x="260" y="124" textAnchor="middle" style={{fill: '#666', fontSize: 10}}>
          earth
        </text>

        {/* Tool overlays */}
        {tool !== 'neon' &&
          (Object.keys(HOLES) as Hole[]).map((h) => (
            <ProbePoint key={h} id={h} x={HOLES[h].x} y={HOLES[h].y} probes={probes} label={`Socket ${h === 'E' ? 'earth' : h === 'L' ? 'left' : 'right'} hole`} r={4} />
          ))}
        {tool === 'neon' &&
          (Object.keys(HOLES) as Hole[]).map((h) => (
            <g
              key={h}
              className={styles.clickable}
              role="button"
              tabIndex={0}
              aria-label={`Touch the neon tester in the ${h === 'E' ? 'earth' : h === 'L' ? 'left' : 'right'} hole`}
              onClick={() => onNeon(h)}
              onKeyDown={key(() => onNeon(h))}>
              <circle cx={HOLES[h].x} cy={HOLES[h].y} r={18} fill="transparent" />
              <circle cx={HOLES[h].x} cy={HOLES[h].y} r={4} className={styles.probePoint} />
            </g>
          ))}
        {tool === 'neon' && neonAt && (
          <g pointerEvents="none">
            {/* screwdriver: blade in the hole, handle up-right, neon window in the handle */}
            <line x1={HOLES[neonAt].x} y1={HOLES[neonAt].y} x2={HOLES[neonAt].x + 40} y2={HOLES[neonAt].y - 40} stroke="#9aa3a8" strokeWidth="4" strokeLinecap="round" />
            <line x1={HOLES[neonAt].x + 40} y1={HOLES[neonAt].y - 40} x2={HOLES[neonAt].x + 92} y2={HOLES[neonAt].y - 92} stroke="#2a63c9" strokeWidth="14" strokeLinecap="round" opacity="0.9" />
            <circle cx={HOLES[neonAt].x + 60} cy={HOLES[neonAt].y - 60} r="6" fill={neonGlow ? '#ff7b1c' : '#7d5a4a'} />
            {neonGlow && <circle cx={HOLES[neonAt].x + 60} cy={HOLES[neonAt].y - 60} r="14" fill="#ff7b1c" opacity="0.35" />}
          </g>
        )}

        {/* Test lamp */}
        {tool === 'lamp' && (
          <g aria-hidden="true">
            {lampLevel > 0.02 && (
              <circle cx="440" cy="110" r={34 + 22 * lampLevel} fill="#ffd34d" opacity={0.15 + 0.45 * lampLevel} />
            )}
            <circle cx="440" cy="110" r="28" fill={lampLevel > 0.02 ? `rgba(255, 214, 80, ${0.35 + 0.65 * lampLevel})` : '#e9eef0'} stroke="#8a8a8a" strokeWidth="1.5" />
            <path d="M428 116 q6 -14 12 0 q6 14 12 0" fill="none" stroke={lampLevel > 0.02 ? '#b35b00' : '#888'} strokeWidth="1.6" />
            <rect x="426" y="138" width="28" height="22" rx="3" fill="#3a3a3a" />
            <path d="M432 160 C 430 200, 380 200, 360 225" fill="none" stroke="#e0352b" strokeWidth="2.5" />
            <path d="M448 160 C 452 205, 420 210, 400 232" fill="none" stroke="#111" strokeWidth="2.5" />
            <text x="440" y="66" textAnchor="middle" style={{fill: INK, fontSize: 11, fontWeight: 700}}>
              Test lamp 100 W
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

export function ToolPicker({
  tool,
  tools,
  onTool,
}: {
  tool: MainsTool;
  tools: MainsTool[];
  onTool: (t: MainsTool) => void;
}): React.JSX.Element {
  const label: Record<MainsTool, string> = {dmm: 'Multimeter', lamp: 'Test lamp', neon: 'Neon tester'};
  return (
    <div className={clsx(styles.seg)} role="group" aria-label="Tool">
      {tools.map((t) => (
        <button key={t} type="button" aria-pressed={tool === t} onClick={() => onTool(t)}>
          {label[t]}
        </button>
      ))}
    </div>
  );
}
