import React, {createContext, useContext, useRef, useState} from 'react';
import clsx from 'clsx';
import useStoredState from './useStoredState';
import styles from './styles.module.css';

export interface PracticalTask {
  label: React.ReactNode;
  done: boolean;
}

export interface VivaQuestion {
  q: string;
  a: React.ReactNode;
}

export interface Trainee {
  name: string;
  roll: string;
  batch: string;
  date: string;
}

export interface PracticalSheetProps {
  /** Exercise number shown in the header, e.g. "1.7.54". */
  number: string;
  title: string;
  aim: React.ReactNode;
  apparatus: React.ReactNode[];
  procedure: React.ReactNode[];
  precautions: React.ReactNode[];
  viva: VivaQuestion[];
  tasks: PracticalTask[];
  /** Called after the trainee prints / saves the record. */
  onPrinted?: (trainee: Trainee) => void;
  /** Bench, observation table and result sections, in that order. */
  children: React.ReactNode;
}

/** Set by <LabPage> so the sheet title becomes the page's h1. */
export const LabPageContext = createContext(false);

const EMPTY_TRAINEE: Trainee = {name: '', roll: '', batch: '', date: ''};

/**
 * Frame shared by every virtual practical. Layout:
 *   [bench → observations → result → practical record → reference]  [tasks]
 * The task panel sits beside the practical (sticky) when there is room,
 * and above it on narrow screens.
 */
export default function PracticalSheet({
  number,
  title,
  aim,
  apparatus,
  procedure,
  precautions,
  viva,
  tasks,
  onPrinted,
  children,
}: PracticalSheetProps): React.JSX.Element {
  const standalone = useContext(LabPageContext);
  const rootRef = useRef<HTMLElement>(null);
  const [showTasks, setShowTasks] = useState(false);
  // Shared across practicals so the trainee types their details once.
  const [trainee, setTrainee] = useStoredState<Trainee>('lab:trainee', EMPTY_TRAINEE);
  const doneCount = tasks.filter((t) => t.done).length;
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  const Title = standalone ? 'h1' : 'h3';

  const print = () => {
    const html = document.documentElement;
    // Closed <details> would print empty, so open them for the printout.
    const closed = [...(rootRef.current?.querySelectorAll('details:not([open])') ?? [])] as HTMLDetailsElement[];
    closed.forEach((d) => (d.open = true));
    html.classList.add('lab-printing');
    const done = () => {
      html.classList.remove('lab-printing');
      closed.forEach((d) => (d.open = false));
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    window.print();
    // Some mobile browsers never fire afterprint.
    window.setTimeout(done, 60000);
    onPrinted?.(trainee);
  };

  const field = (key: keyof Trainee, label: string, type = 'text') => (
    <label className={styles.field}>
      {label}
      <input className={styles.input} type={type} value={trainee[key]} onChange={(e) => setTrainee((t) => ({...t, [key]: e.target.value}))} />
    </label>
  );

  return (
    <section ref={rootRef} className={clsx(styles.root, 'lab-print-root')} aria-label={`Virtual practical ${number}`}>
      <header className={styles.header}>
        <div className={styles.kicker}>Exercise {number}</div>
        <Title className={styles.title}>{title}</Title>
        <p className={styles.printOnly}>
          <b>Name:</b> {trainee.name || '__________'} &nbsp; <b>Roll No.:</b> {trainee.roll || '______'} &nbsp;{' '}
          <b>Batch:</b> {trainee.batch || '______'} &nbsp; <b>Date:</b> {trainee.date || '______'}
        </p>
      </header>

      <div className={styles.body}>
        <aside className={clsx(styles.taskPanel, styles.noPrint)} aria-label="Tasks">
          <div className={styles.taskHead}>
            <b>Tasks</b>
            <span>
              {doneCount}/{tasks.length}
            </span>
            <button type="button" className={styles.taskToggle} aria-expanded={showTasks} onClick={() => setShowTasks((x) => !x)}>
              {showTasks ? 'Hide ▴' : 'Show ▾'}
            </button>
          </div>
          <span className={styles.pbar} aria-hidden="true">
            <span style={{transform: `scaleX(${pct / 100})`}} />
          </span>
          <ul className={clsx(styles.tasks, !showTasks && styles.tasksCollapsed)}>
            {tasks.map((t, k) => (
              <li key={k} className={clsx(t.done && styles.taskDone)}>
                <span className={clsx(styles.check, t.done && styles.done)} aria-hidden="true">
                  {t.done ? '✓' : ''}
                </span>
                <span>
                  <span className={styles.srOnly}>{t.done ? 'Done: ' : 'To do: '}</span>
                  {t.label}
                </span>
              </li>
            ))}
          </ul>
          {pct === 100 && <div className={styles.allDone}>All tasks done ✓</div>}
        </aside>

        <div className={styles.main}>
          {children}

          <div className={clsx(styles.section, styles.noPrint)}>
            <h4>Practical record</h4>
            <div className={styles.fields}>
              {field('name', 'Trainee name')}
              {field('roll', 'Roll No.')}
              {field('batch', 'Batch / Unit')}
              {field('date', 'Date', 'date')}
            </div>
            <button type="button" className={clsx(styles.btn, styles.primary)} onClick={print}>
              Print / Save as PDF
            </button>
          </div>

          <details className={styles.section}>
            <summary>Aim, apparatus and procedure</summary>
            <p>
              <b>Aim:</b> {aim}
            </p>
            <div className={styles.twoCol}>
              <div>
                <b>Apparatus</b>
                <ul>
                  {apparatus.map((a, k) => (
                    <li key={k}>{a}</li>
                  ))}
                </ul>
              </div>
              <div>
                <b>Procedure</b>
                <ol>
                  {procedure.map((p, k) => (
                    <li key={k}>{p}</li>
                  ))}
                </ol>
              </div>
            </div>
          </details>

          <details className={styles.section}>
            <summary>Precautions</summary>
            <ol>
              {precautions.map((p, k) => (
                <li key={k}>{p}</li>
              ))}
            </ol>
          </details>

          <details className={clsx(styles.section, styles.noPrint)}>
            <summary>Viva questions ({viva.length})</summary>
            <div className={styles.viva}>
              {viva.map((v, k) => (
                <details key={k}>
                  <summary>
                    {k + 1}. {v.q}
                  </summary>
                  <p>{v.a}</p>
                </details>
              ))}
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}

/** Wraps a practical on its own page: full-width layout and an h1 title. */
export function LabPage({children}: {children: React.ReactNode}): React.JSX.Element {
  return <LabPageContext.Provider value>{children}</LabPageContext.Provider>;
}
