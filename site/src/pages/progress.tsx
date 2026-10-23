import React, {useRef, useState} from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';
import {ProgressSummary} from '@site/src/components/Progress';
import {exportProgress, importProgress, markLesson, resetProgress} from '@site/src/progress/store';
import useProgress, {ALL_PRACTICALS, MODULES} from '@site/src/progress/useProgress';
import styles from '@site/src/components/Progress/styles.module.css';

function Mark({done}: {done: boolean}) {
  return done ? <span className={styles.tick}>✓</span> : <span className={styles.dim}>–</span>;
}

export default function ProgressPage(): React.JSX.Element {
  const p = useProgress();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ok: boolean; text: string} | null>(null);

  const save = () => {
    const blob = new Blob([exportProgress()], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-progress-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    setMsg({ok: true, text: translate({id: 'progress.saved', message: 'File saved. Keep it safe, and load it on any phone to get your progress back.'})});
  };

  const load = async (file: File | undefined) => {
    if (!file) return;
    const ok = importProgress(await file.text());
    setMsg(
      ok
        ? {ok: true, text: translate({id: 'progress.loaded', message: 'Progress loaded and added to what is on this phone.'})}
        : {ok: false, text: translate({id: 'progress.loadFailed', message: 'This is not a progress file saved from this website.'})},
    );
    if (fileRef.current) fileRef.current.value = '';
  };

  const clear = () => {
    if (window.confirm(translate({id: 'progress.confirmClear', message: 'Clear all your progress on this phone? This cannot be undone.'}))) {
      resetProgress();
      setMsg(null);
    }
  };

  return (
    <Layout
      title={translate({id: 'progress.title', message: 'My progress'})}
      description="Practicals done, lessons read and tests attempted">
      <main className="container margin-vert--lg">
        <Heading as="h1">
          <Translate id="progress.title">My progress</Translate>
        </Heading>

        <ProgressSummary showLink={false} />

        <div className={clsx(styles.actions, styles.noPrint)}>
          <button type="button" className="button button--primary button--sm" onClick={save}>
            <Translate id="progress.save">Save my progress file</Translate>
          </button>
          <button type="button" className="button button--secondary button--sm" onClick={() => fileRef.current?.click()}>
            <Translate id="progress.load">Load a progress file</Translate>
          </button>
          <button type="button" className="button button--secondary button--sm" onClick={() => window.print()}>
            <Translate id="progress.print">Print</Translate>
          </button>
          <button type="button" className="button button--outline button--danger button--sm" onClick={clear}>
            <Translate id="progress.clear">Clear progress</Translate>
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => load(e.target.files?.[0])} />
        </div>
        {msg && (
          <p className={styles.message} role="status" style={{color: msg.ok ? 'var(--ifm-color-success-dark)' : 'var(--ifm-color-danger)'}}>
            {msg.text}
          </p>
        )}
        <p className={clsx(styles.note, styles.noPrint)}>
          <Translate id="progress.note">
            Your progress is saved on this phone or computer, in this browser only. To keep it on another phone, press Save, then Load on the other phone. Your practical readings stay on the device they were made on.
          </Translate>
        </p>

        {MODULES.map((m) => {
          const prac = ALL_PRACTICALS.filter((x) => x.module === m.module);
          const pDone = prac.filter((x) => p.practicals[x.no]).length;
          const lDone = m.lessons.filter((l) => p.lessons[l.doc]).length;
          const qDone = m.lessons.filter((l) => p.quizzes[l.quiz]).length;
          return (
            <details key={m.module} className={styles.module}>
              <summary>
                <span>
                  <Translate id="progress.module">Module</Translate> {m.module}: {m.title}
                </span>
                <span className={styles.moduleCounts}>
                  <Translate id="progress.counts" values={{p: pDone, pt: prac.length, l: lDone, lt: m.lessons.length, q: qDone, qt: m.lessons.length}}>
                    {'Practicals {p}/{pt} · Lessons {l}/{lt} · Tests {q}/{qt}'}
                  </Translate>
                </span>
              </summary>
              <div className={styles.moduleBody}>
                <div>
                  <h3>
                    <Translate id="progress.lessonsAndTests">Lessons and tests</Translate>
                  </h3>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>
                          <Translate id="progress.colLesson">Lesson</Translate>
                        </th>
                        <th>
                          <Translate id="progress.colRead">Read</Translate>
                        </th>
                        <th>
                          <Translate id="progress.colTest">Test</Translate>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.lessons.map((l) => {
                        const q = p.quizzes[l.quiz];
                        const read = !!p.lessons[l.doc];
                        return (
                          <tr key={l.doc}>
                            <td>
                              <Link to={l.doc}>{l.title}</Link>
                            </td>
                            <td>
                              <Mark done={read} />{' '}
                              <button type="button" className={clsx(styles.linkBtn, styles.noPrint)} onClick={() => markLesson(l.doc, !read)}>
                                {read ? <Translate id="progress.undo">Undo</Translate> : <Translate id="progress.tickIt">Tick</Translate>}
                              </button>
                            </td>
                            <td>
                              {q ? (
                                <span className={styles.tick}>
                                  ✓ {q.best}/{q.total}{' '}
                                  <span className={styles.dim}>
                                    (<Translate id="progress.attempts" values={{n: q.attempts}}>{'{n} attempts'}</Translate>)
                                  </span>
                                </span>
                              ) : (
                                <Link to={l.quiz}>
                                  <Translate id="progress.quizTakeShort">Take test</Translate>
                                </Link>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div>
                  <h3>
                    <Translate id="progress.practicalsHead">Virtual Lab practicals</Translate>
                  </h3>
                  {prac.length === 0 ? (
                    <p className={styles.practicalsNone}>
                      <Translate id="progress.noPracticals">No virtual practicals in this module.</Translate>
                    </p>
                  ) : (
                    <ul className={styles.practicals}>
                      {prac.map((x) => (
                        <li key={x.no}>
                          <Mark done={!!p.practicals[x.no]} />
                          <span className={styles.dim}>{x.no}</span>
                          <Link to={x.path!}>{x.title}</Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </details>
          );
        })}
      </main>
    </Layout>
  );
}
