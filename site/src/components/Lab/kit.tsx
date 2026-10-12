import React, {useEffect, useMemo} from 'react';
import clsx from 'clsx';
import useStoredState from './useStoredState';
import {mulberry32} from './circuit';
import styles from './styles.module.css';

export type NoteKind = 'good' | 'warn' | 'bad' | 'info';
export type Note = {kind: NoteKind; text: React.ReactNode} | null;

export function NoteBox({note, status}: {note?: Note; status?: Note}): React.JSX.Element {
  return (
    <div className={styles.noPrint} aria-live="polite">
      {note && <div className={clsx(styles.message, styles[note.kind])}>{note.text}</div>}
      {status && <div className={clsx(styles.message, styles[status.kind])}>{status.text}</div>}
    </div>
  );
}

/**
 * A per-trainee random "kit" for a practical: a stored seed, so each trainee's
 * faults and component values differ but stay the same when they come back.
 */
export function useKitSeed(key: string): [number, () => void] {
  const [seed, setSeed, loaded] = useStoredState<number>(`lab:${key}:seed`, 0);
  useEffect(() => {
    if (loaded && !seed) setSeed(1 + Math.floor(Math.random() * 1e9));
  }, [loaded, seed, setSeed]);
  return [seed || 1, () => setSeed(1 + Math.floor(Math.random() * 1e9))];
}

export function useRng<T>(seed: number, make: (rnd: () => number) => T): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => make(mulberry32(seed)), [seed]);
}

export function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function Section({
  title,
  children,
  noPrint,
}: {
  title: string;
  children: React.ReactNode;
  noPrint?: boolean;
}): React.JSX.Element {
  return (
    <div className={clsx(styles.section, noPrint && styles.noPrint)}>
      <h4>{title}</h4>
      {children}
    </div>
  );
}

export function Empty({children}: {children: React.ReactNode}): React.JSX.Element {
  return <div className={styles.empty}>{children}</div>;
}

/** A simple bordered table used for observation and result tables. */
export function Table({
  head,
  rows,
  caption,
}: {
  head: React.ReactNode[];
  rows: React.ReactNode[][];
  caption?: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        {caption && <caption style={{textAlign: 'left', fontWeight: 700, padding: '0.2rem 0'}}>{caption}</caption>}
        <thead>
          <tr>
            {head.map((h, k) => (
              <th key={k}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, k) => (
            <tr key={k}>
              {r.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Verdict({ok, yes = '✓ correct', no = '✗ check again'}: {ok: boolean | null; yes?: string; no?: string}): React.JSX.Element | null {
  if (ok == null) return null;
  return ok ? <span className={styles.ok}>{yes}</span> : <span className={styles.no}>{no}</span>;
}

/** Reset button shared by every practical. */
export function ResetKit({onReset}: {onReset: () => void}): React.JSX.Element {
  return (
    <div className={styles.noPrint} style={{marginTop: '0.8rem'}}>
      <button
        type="button"
        className={clsx(styles.btn, styles.danger)}
        onClick={() => {
          if (window.confirm('Clear your readings and get a new kit?')) onReset();
        }}>
        Start again with a new kit
      </button>
    </div>
  );
}
