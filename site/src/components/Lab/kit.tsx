import React, {useContext, useEffect, useMemo, useState} from 'react';
import clsx from 'clsx';
import useStoredState from './useStoredState';
import {mulberry32} from './circuit';
import {ColumnHelp, NextStep, SheetGuideContext} from './guide';
import {diagnose, pick, type Fix} from './solution';
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
      {title.startsWith('Observation') && <NextStep />}
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
    <>
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
    <ColumnHelp heads={head} />
    </>
  );
}

const VERDICT_TEXT = {
  en: {hint: 'Hint', solution: 'Show solution', working: 'Working', answer: 'Correct answer', yours: 'Your answer'},
  gu: {hint: 'સંકેત', solution: 'ઉકેલ બતાવો', working: 'ગણતરી', answer: 'સાચો જવાબ', yours: 'તમારો જવાબ'},
};

/**
 * ✓ / ✗ beside a typed entry. With `fix`, a wrong entry offers a Hint (formula, no numbers)
 * and then the full solution worked with this trainee's own readings.
 */
export function Verdict({
  ok,
  yes = '✓ correct',
  no = '✗ check again',
  fix,
}: {
  ok: boolean | null;
  yes?: string;
  no?: string;
  fix?: Fix;
}): React.JSX.Element | null {
  const guide = useContext(SheetGuideContext);
  const [level, setLevel] = useState(0);
  if (ok == null) return null;
  if (ok) return <span className={styles.ok}>{yes}</span>;
  const lang = guide?.lang ?? 'en';
  const t = VERDICT_TEXT[lang];
  const gu = lang === 'gu';
  const hint = pick(fix?.hint, lang);
  const work = pick(fix?.work, lang);
  const slip = fix ? pick(diagnose(fix.entered, fix.expected) ?? undefined, lang) : undefined;
  const hasAnswer = fix != null && (fix.answer != null || work != null);
  return (
    <span className={clsx(styles.verdictBox, gu && styles.gu)} lang={gu ? 'gu' : undefined}>
      <span className={styles.no}>{no}</span>
      {fix && (
        <span className={clsx(styles.fixBtns, styles.noPrint)}>
          {hint && level < 1 && (
            <button type="button" className={styles.fixBtn} onClick={() => setLevel(1)}>
              {t.hint}
            </button>
          )}
          {hasAnswer && level < 2 && (
            <button type="button" className={styles.fixBtn} onClick={() => setLevel(2)}>
              {t.solution}
            </button>
          )}
        </span>
      )}
      {fix && level >= 1 && hint && <span className={clsx(styles.fixPanel, styles.noPrint)}>💡 {hint}</span>}
      {fix && level >= 2 && (
        <span className={clsx(styles.fixPanel, styles.fixSolution, styles.noPrint)}>
          {slip && <span className={styles.fixSlip}>⚠ {slip}</span>}
          {work && (
            <span className={styles.fixLine}>
              <b>{t.working}:</b> {work}
            </span>
          )}
          {fix.answer != null && (
            <span className={styles.fixLine}>
              <b>{t.answer}:</b> {fix.answer}
            </span>
          )}
        </span>
      )}
    </span>
  );
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
