import React from 'react';
import Link from '@docusaurus/Link';
import Translate from '@docusaurus/Translate';
import {useLocation} from '@docusaurus/router';
import {markLesson, pageKey} from '@site/src/progress/store';
import useProgress, {MODULES, totals} from '@site/src/progress/useProgress';
import styles from './styles.module.css';

function Tile({done, total, label}: {done: number; total: number; label: React.ReactNode}) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className={styles.tile}>
      <span className={styles.tileNum}>
        {done}
        <span className={styles.tileOf}> / {total}</span>
      </span>
      <span className={styles.tileLabel}>{label}</span>
      <span className={styles.bar} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <span className={styles.barFill} style={{width: `${pct}%`}} />
      </span>
    </div>
  );
}

/** Three counters (practicals, lessons, quizzes) and a "continue" link. */
export function ProgressSummary({showLink = true}: {showLink?: boolean}): React.JSX.Element {
  const p = useProgress();
  const t = totals(p);
  const any = t.practicalsDone + t.lessonsDone + t.quizzesDone > 0;
  return (
    <section className={styles.summary} aria-label="My progress">
      <div className={styles.summaryHead}>
        <h2 className={styles.summaryTitle}>
          <Translate id="progress.title">My progress</Translate>
        </h2>
        {showLink && (
          <Link to="/progress">
            <Translate id="progress.viewAll">See full progress →</Translate>
          </Link>
        )}
      </div>
      <div className={styles.tiles}>
        <Tile done={t.practicalsDone} total={t.practicals} label={<Translate id="progress.practicals">Practicals done</Translate>} />
        <Tile done={t.lessonsDone} total={t.lessons} label={<Translate id="progress.lessons">Lessons read</Translate>} />
        <Tile done={t.quizzesDone} total={t.quizzes} label={<Translate id="progress.quizzes">Tests attempted</Translate>} />
      </div>
      {p.last && (
        <p className={styles.continue}>
          <Translate id="progress.continue">Continue where you left off:</Translate> <Link to={p.last.path}>{p.last.title}</Link>
        </p>
      )}
      {!any && (
        <p className={styles.empty}>
          <Translate id="progress.empty">
            Your progress appears here as you read lessons, do practicals and take tests. It is saved on this phone or computer, in this browser.
          </Translate>
        </p>
      )}
    </section>
  );
}

/** Quiz result for one test, for tables: "✓ 8/11" or "–". */
export function QuizStatus({id}: {id: string}): React.JSX.Element {
  const q = useProgress().quizzes[id];
  if (!q) return <span className={styles.dim}> –</span>;
  return (
    <span className={styles.tick}>
      {' '}
      ✓ {q.best}/{q.total}
    </span>
  );
}

/** "3/5 tests attempted" for a module row. */
export function ModuleQuizStatus({module}: {module: number}): React.JSX.Element | null {
  const p = useProgress();
  const m = MODULES.find((x) => x.module === module);
  if (!m) return null;
  const done = m.lessons.filter((l) => p.quizzes[l.quiz]).length;
  return (
    <span className={done === m.lessons.length ? styles.tick : styles.dim}>
      {' '}
      {done}/{m.lessons.length}
    </span>
  );
}

/** Best score line at the top of a quiz page. */
export function QuizBest(): React.JSX.Element | null {
  const {pathname} = useLocation();
  const key = pageKey(pathname);
  const q = useProgress().quizzes[key ?? ''];
  if (!q) return null;
  return (
    <p className={styles.quizBest}>
      <span className={styles.tick}>✓</span>{' '}
      <Translate id="progress.quizBest" values={{best: q.best, total: q.total, attempts: q.attempts}}>
        {'Best score: {best} / {total} · Attempts: {attempts}'}
      </Translate>
    </p>
  );
}

/** Read / quiz status under a lesson. */
export function LessonStatus(): React.JSX.Element | null {
  const {pathname} = useLocation();
  const key = pageKey(pathname);
  const p = useProgress();
  const lesson = MODULES.flatMap((m) => m.lessons).find((l) => l.doc === key);
  if (!lesson || !key) return null;
  const read = !!p.lessons[key];
  const q = p.quizzes[lesson.quiz];
  return (
    <aside className={`${styles.lessonBox} ${read ? styles.lessonRead : ''}`} aria-label="Lesson progress">
      <div className={styles.lessonRow}>
        {read ? (
          <>
            <span className={styles.tick}>
              ✓ <Translate id="progress.lessonRead">You have read this lesson</Translate>
            </span>
            <button type="button" className={styles.linkBtn} onClick={() => markLesson(key, false)}>
              <Translate id="progress.markUnread">Mark as not read</Translate>
            </button>
          </>
        ) : (
          <>
            <span className={styles.dim}>
              <Translate id="progress.lessonNotRead">Not marked as read yet. It is marked when you reach the end of the page.</Translate>
            </span>
            <button type="button" className={styles.linkBtn} onClick={() => markLesson(key, true)}>
              <Translate id="progress.markRead">Mark as read</Translate>
            </button>
          </>
        )}
      </div>
      <div className={styles.lessonRow}>
        {q ? (
          <span className={styles.tick}>
            ✓{' '}
            <Translate id="progress.quizBest" values={{best: q.best, total: q.total, attempts: q.attempts}}>
              {'Best score: {best} / {total} · Attempts: {attempts}'}
            </Translate>
          </span>
        ) : (
          <span className={styles.dim}>
            <Translate id="progress.quizNone">Test for this lesson: not attempted yet.</Translate>
          </span>
        )}
        <Link to={lesson.quiz}>
          {q ? <Translate id="progress.quizAgain">Take the test again →</Translate> : <Translate id="progress.quizTake">Take the test →</Translate>}
        </Link>
      </div>
    </aside>
  );
}
