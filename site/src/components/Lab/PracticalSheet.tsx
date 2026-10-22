import React, {createContext, useContext, useRef, useState} from 'react';
import clsx from 'clsx';
import useStoredState from './useStoredState';
import styles from './styles.module.css';

export interface PracticalTask {
  label: React.ReactNode;
  done: boolean;
}

export interface PracticalStep {
  /** One short instruction. */
  label: React.ReactNode;
  /** Extra detail, shown only while this is the current step. */
  hint?: React.ReactNode;
  done: boolean;
}

export interface VivaQuestion {
  q: string;
  a: React.ReactNode;
}

/** Gujarati text for the instruction parts of a practical. Bench labels stay in English. */
export interface PracticalGu {
  title?: string;
  aim: React.ReactNode;
  apparatus: React.ReactNode[];
  procedure: React.ReactNode[];
  precautions: React.ReactNode[];
  viva: VivaQuestion[];
  /** Matched to `steps` by position; the `done` flags come from the English steps. */
  steps?: {label: React.ReactNode; hint?: React.ReactNode}[];
}

export type LabLang = 'en' | 'gu';

const UI = {
  en: {
    steps: 'Steps',
    tasks: 'Tasks',
    hide: 'Hide ▴',
    show: 'Show ▾',
    done: 'Done: ',
    current: 'Current step: ',
    todo: 'To do: ',
    allSteps: 'All steps done ✓',
    allTasks: 'All tasks done ✓',
    record: 'Practical record',
    name: 'Trainee name',
    roll: 'Roll No.',
    batch: 'Batch / Unit',
    date: 'Date',
    print: 'Print / Save as PDF',
    aimHead: 'Aim, apparatus and procedure',
    aim: 'Aim:',
    apparatus: 'Apparatus',
    procedure: 'Procedure',
    precautions: 'Precautions',
    viva: 'Viva questions',
  },
  gu: {
    steps: 'પગલાં',
    tasks: 'કાર્યો',
    hide: 'છુપાવો ▴',
    show: 'બતાવો ▾',
    done: 'પૂર્ણ: ',
    current: 'હાલનું પગલું: ',
    todo: 'કરવાનું: ',
    allSteps: 'બધાં પગલાં પૂર્ણ ✓',
    allTasks: 'બધાં કાર્યો પૂર્ણ ✓',
    record: 'પ્રેક્ટિકલ રેકોર્ડ',
    name: 'તાલીમાર્થીનું નામ',
    roll: 'રોલ નં.',
    batch: 'બેચ / યુનિટ',
    date: 'તારીખ',
    print: 'પ્રિન્ટ / PDF સેવ કરો',
    aimHead: 'હેતુ, સાધનો અને પદ્ધતિ',
    aim: 'હેતુ:',
    apparatus: 'સાધનો',
    procedure: 'પદ્ધતિ',
    precautions: 'સાવચેતીઓ',
    viva: 'મૌખિક પ્રશ્નો',
  },
};

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
  /** Side checklist. Ignored when `steps` is given. */
  tasks?: PracticalTask[];
  /** Numbered steps shown above the bench in place of the task panel. */
  steps?: PracticalStep[];
  /** Gujarati instructions. When given, an English | ગુજરાતી toggle appears. */
  gu?: PracticalGu;
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
  tasks = [],
  steps,
  gu,
  onPrinted,
  children,
}: PracticalSheetProps): React.JSX.Element {
  const standalone = useContext(LabPageContext);
  const rootRef = useRef<HTMLElement>(null);
  const [showTasks, setShowTasks] = useState(false);
  // Shared across practicals so the choice is made once.
  const [storedLang, setLang] = useStoredState<LabLang>('lab:lang', 'en');
  const lang: LabLang = gu ? storedLang : 'en';
  const isGu = lang === 'gu';
  const t = UI[lang];
  const g = isGu ? gu : undefined;
  const shownSteps = steps?.map((s, k) => {
    const x = g?.steps?.[k];
    return x ? {...s, label: x.label, hint: x.hint} : s;
  });
  const hasSteps = !!steps && steps.length > 0;
  const currentStep = steps ? steps.findIndex((s) => !s.done) : -1;
  // Shared across practicals so the trainee types their details once.
  const [trainee, setTrainee] = useStoredState<Trainee>('lab:trainee', EMPTY_TRAINEE);
  const items = hasSteps ? steps! : tasks;
  const doneCount = items.filter((x) => x.done).length;
  const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0;
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
        <div className={styles.headRow}>
          <div className={styles.kicker}>Exercise {number}</div>
          {gu && (
            <div className={clsx(styles.langToggle, styles.noPrint)} role="group" aria-label="Instruction language">
              <button type="button" className={clsx(styles.langBtn, !isGu && styles.langOn)} aria-pressed={!isGu} onClick={() => setLang('en')}>
                English
              </button>
              <button type="button" lang="gu" className={clsx(styles.langBtn, styles.gu, isGu && styles.langOn)} aria-pressed={isGu} onClick={() => setLang('gu')}>
                ગુજરાતી
              </button>
            </div>
          )}
        </div>
        <Title className={clsx(styles.title, g?.title && styles.gu)} lang={g?.title ? 'gu' : undefined}>
          {g?.title ?? title}
        </Title>
        <p className={styles.printOnly}>
          <b>Name:</b> {trainee.name || '__________'} &nbsp; <b>Roll No.:</b> {trainee.roll || '______'} &nbsp;{' '}
          <b>Batch:</b> {trainee.batch || '______'} &nbsp; <b>Date:</b> {trainee.date || '______'}
        </p>
      </header>

      <div className={clsx(styles.body, hasSteps && styles.hasSteps)}>
        <aside hidden={items.length === 0} className={clsx(styles.taskPanel, styles.noPrint, isGu && styles.gu)} lang={isGu ? 'gu' : undefined} aria-label={hasSteps ? t.steps : t.tasks}>
          <div className={styles.taskHead}>
            <b>{hasSteps ? t.steps : t.tasks}</b>
            <span>
              {doneCount}/{items.length}
            </span>
            <button type="button" className={styles.taskToggle} aria-expanded={showTasks} onClick={() => setShowTasks((x) => !x)}>
              {showTasks ? t.hide : t.show}
            </button>
          </div>
          <span className={styles.pbar} aria-hidden="true">
            <span style={{transform: `scaleX(${pct / 100})`}} />
          </span>
          {hasSteps ? (
            <ol className={styles.steps}>
              {shownSteps!.map((s, k) => {
                const current = k === currentStep;
                return (
                  <li
                    key={k}
                    className={clsx(styles.step, current && styles.stepCurrent, s.done && styles.stepDone, !current && !showTasks && styles.stepOff)}
                    aria-current={current ? 'step' : undefined}>
                    <span className={clsx(styles.stepNo, s.done && styles.done)} aria-hidden="true">
                      {s.done ? '✓' : k + 1}
                    </span>
                    <span>
                      <span className={styles.srOnly}>{s.done ? t.done : current ? t.current : t.todo}</span>
                      {s.label}
                      {current && s.hint && <span className={styles.stepHint}>{s.hint}</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <ul className={clsx(styles.tasks, !showTasks && styles.tasksCollapsed)}>
              {tasks.map((tk, k) => (
                <li key={k} className={clsx(tk.done && styles.taskDone)}>
                  <span className={clsx(styles.check, tk.done && styles.done)} aria-hidden="true">
                    {tk.done ? '✓' : ''}
                  </span>
                  <span>
                    <span className={styles.srOnly}>{tk.done ? t.done : t.todo}</span>
                    {tk.label}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {pct === 100 && <div className={styles.allDone}>{hasSteps ? t.allSteps : t.allTasks}</div>}
        </aside>

        <div className={styles.main}>
          {children}

          <div className={clsx(styles.section, styles.noPrint, isGu && styles.gu)} lang={isGu ? 'gu' : undefined}>
            <h4>{t.record}</h4>
            <div className={styles.fields}>
              {field('name', t.name)}
              {field('roll', t.roll)}
              {field('batch', t.batch)}
              {field('date', t.date, 'date')}
            </div>
            <button type="button" className={clsx(styles.btn, styles.primary)} onClick={print}>
              {t.print}
            </button>
          </div>

          <details className={clsx(styles.section, isGu && styles.gu)} lang={isGu ? 'gu' : undefined}>
            <summary>{t.aimHead}</summary>
            <p>
              <b>{t.aim}</b> {g ? g.aim : aim}
            </p>
            <div className={styles.twoCol}>
              <div>
                <b>{t.apparatus}</b>
                <ul>
                  {(g ? g.apparatus : apparatus).map((a, k) => (
                    <li key={k}>{a}</li>
                  ))}
                </ul>
              </div>
              <div>
                <b>{t.procedure}</b>
                <ol>
                  {(g ? g.procedure : procedure).map((p, k) => (
                    <li key={k}>{p}</li>
                  ))}
                </ol>
              </div>
            </div>
          </details>

          <details className={clsx(styles.section, isGu && styles.gu)} lang={isGu ? 'gu' : undefined}>
            <summary>{t.precautions}</summary>
            <ol>
              {(g ? g.precautions : precautions).map((p, k) => (
                <li key={k}>{p}</li>
              ))}
            </ol>
          </details>

          <details className={clsx(styles.section, styles.noPrint, isGu && styles.gu)} lang={isGu ? 'gu' : undefined}>
            <summary>
              {t.viva} ({viva.length})
            </summary>
            <div className={styles.viva}>
              {(g ? g.viva : viva).map((v, k) => (
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
