import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

export interface MultimeterProps {
  name: string;
  /** Selected function id, e.g. "V20" or "acv750". "off" blanks the display. */
  fn: string;
  functions: {fn: string; label: string}[];
  /** Display text and unit. */
  text: string;
  unit: string;
  /** Where the meter is connected, e.g. "Slot A (in line)". */
  placement?: string;
  onFunction: (fn: string) => void;
  /** Probe polarity swap; omit to hide the button. */
  reversed?: boolean;
  onToggleReverse?: () => void;
  /** Blown-fuse / damaged state with a repair action. */
  fault?: string | null;
  repairLabel?: string;
  onRepair?: () => void;
  /** Extra indicator next to the reading, e.g. a continuity beep. */
  indicator?: React.ReactNode;
}

export default function Multimeter({
  name,
  fn,
  functions,
  text,
  unit,
  placement,
  onFunction,
  reversed,
  onToggleReverse,
  fault,
  repairLabel = 'Replace',
  onRepair,
  indicator,
}: MultimeterProps): React.JSX.Element {
  const off = fn === 'off';
  return (
    <div className={styles.dmm}>
      <div className={styles.dmmHead}>
        <span>{name}</span>
        {placement && <small>{placement}</small>}
      </div>
      <div className={clsx(styles.lcd, off && styles.off)} role="status" aria-label={`${name} display`}>
        {indicator && !off ? <span className={styles.lcdIndicator}>{indicator}</span> : null}
        <b>{off ? '' : text}</b>
        <span>{off ? '' : unit}</span>
      </div>
      <div className={styles.seg} role="group" aria-label={`${name} function`}>
        {functions.map((f) => (
          <button key={f.fn} type="button" aria-pressed={fn === f.fn} onClick={() => onFunction(f.fn)}>
            {f.label}
          </button>
        ))}
      </div>
      {(onToggleReverse || fault) && (
        <div className={styles.dmmFoot}>
          {onToggleReverse ? (
            <button type="button" className={styles.btn} aria-pressed={!!reversed} onClick={onToggleReverse}>
              {reversed ? 'Probes: black → +' : 'Probes: red → +'} ⇄
            </button>
          ) : (
            <span />
          )}
          {fault ? (
            <span>
              <span className={styles.blown}>{fault} </span>
              {onRepair && (
                <button type="button" className={styles.btn} onClick={onRepair}>
                  {repairLabel}
                </button>
              )}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
