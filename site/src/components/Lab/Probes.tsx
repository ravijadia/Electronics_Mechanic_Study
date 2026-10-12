import React, {useState} from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

export type ProbeColor = 'red' | 'black';

export interface Probes {
  red: string | null;
  black: string | null;
  /** Probe that the next tap on a terminal will place. */
  active: ProbeColor;
  setActive: (c: ProbeColor) => void;
  /** Put the active probe on a terminal, then switch to the other probe. */
  place: (point: string) => void;
  clear: () => void;
  /** Set both probes at once (e.g. "touch probes together"). */
  set: (red: string | null, black: string | null) => void;
}

export function useProbes(): Probes {
  const [red, setRed] = useState<string | null>(null);
  const [black, setBlack] = useState<string | null>(null);
  const [active, setActive] = useState<ProbeColor>('red');
  return {
    red,
    black,
    active,
    setActive,
    place: (point) => {
      if (active === 'red') {
        setRed(point);
        if (black === point) setBlack(null);
        setActive('black');
      } else {
        setBlack(point);
        if (red === point) setRed(null);
        setActive('red');
      }
    },
    clear: () => {
      setRed(null);
      setBlack(null);
      setActive('red');
    },
    set: (r, b) => {
      setRed(r);
      setBlack(b);
    },
  };
}

/**
 * A tappable terminal inside an SVG. Shows the red / black probe tip when a
 * probe sits on it.
 */
export function ProbePoint({
  id,
  x,
  y,
  probes,
  label,
  disabled,
  r = 6,
}: {
  id: string;
  x: number;
  y: number;
  probes: Probes;
  label: string;
  disabled?: boolean;
  r?: number;
}): React.JSX.Element {
  const onRed = probes.red === id;
  const onBlack = probes.black === id;
  const act = () => !disabled && probes.place(id);
  return (
    <g
      className={clsx(!disabled && styles.clickable)}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={`${label}${onRed ? ', red probe here' : ''}${onBlack ? ', black probe here' : ''}. Place ${probes.active} probe`}
      onClick={act}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          act();
        }
      }}>
      <circle cx={x} cy={y} r={16} fill="transparent" />
      <circle cx={x} cy={y} r={r} className={styles.probePoint} />
      {(onRed || onBlack) && (
        <g pointerEvents="none">
          <line
            x1={x}
            y1={y}
            x2={x + (onRed ? -10 : 10)}
            y2={y - 26}
            stroke={onRed ? '#e0352b' : '#111'}
            strokeWidth={5}
            strokeLinecap="round"
          />
          <circle
            cx={x + (onRed ? -10 : 10)}
            cy={y - 30}
            r={7}
            fill={onRed ? '#e0352b' : '#111'}
            stroke="#fff"
            strokeWidth={1.5}
          />
        </g>
      )}
    </g>
  );
}

/** HTML control row: which probe to place next, and a clear button. */
export function ProbeBar({probes, hint}: {probes: Probes; hint?: string}): React.JSX.Element {
  return (
    <div className={styles.probeBar}>
      <span className={styles.label} style={{margin: 0}}>
        Tap a terminal to place:
      </span>
      <div className={styles.seg} role="group" aria-label="Probe to place">
        <button type="button" aria-pressed={probes.active === 'red'} onClick={() => probes.setActive('red')}>
          <span className={styles.probeDot} style={{background: '#e0352b'}} /> Red probe
        </button>
        <button type="button" aria-pressed={probes.active === 'black'} onClick={() => probes.setActive('black')}>
          <span className={styles.probeDot} style={{background: '#111'}} /> Black probe
        </button>
        <button type="button" onClick={probes.clear}>
          Remove probes
        </button>
      </div>
      {hint && <span className={styles.muted}>{hint}</span>}
    </div>
  );
}
