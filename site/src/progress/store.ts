// Trainee progress, kept in this browser's localStorage (no login, no server).
//   practicals  – practical number ("1.7.54") -> time completed
//   lessons     – lesson path ("/docs/module-05-.../x") -> time read
//   quizzes     – quiz path ("/tests/module-05-.../x") -> best score and attempts
//   last        – the last lesson, quiz or practical opened ("Continue where you left off")
// Paths are stored without the site address and without the /gu language prefix,
// so English and Gujarati pages share one record.

export interface QuizRecord {
  best: number;
  total: number;
  attempts: number;
  last: number;
}

export interface LastVisit {
  path: string;
  title: string;
  ts: number;
}

export interface Progress {
  v: 1;
  practicals: Record<string, number>;
  lessons: Record<string, number>;
  quizzes: Record<string, QuizRecord>;
  last?: LastVisit;
}

export const STORAGE_KEY = 'emt:progress:v1';
const EVENT = 'emt-progress-changed';

export const EMPTY: Progress = {v: 1, practicals: {}, lessons: {}, quizzes: {}};

/** "/Electronics_Mechanic_Study/gu/docs/x/y/" -> "/docs/x/y". Returns null for other pages. */
export function pageKey(pathname: string): string | null {
  const m = pathname.match(/\/(docs|tests|practicals)(\/[^?#]*)?$/);
  if (!m) return null;
  const rest = (m[2] ?? '').replace(/\/+$/, '').replace(/\.html$/, '');
  return `/${m[1]}${rest}`;
}

/** "/practicals/1-7-54" -> "1.7.54" */
export function practicalNo(key: string): string | null {
  const m = key.match(/^\/practicals\/(\d+-\d+-\d+)$/);
  return m ? m[1].replace(/-/g, '.') : null;
}

function clean(raw: unknown): Progress {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Partial<Progress>;
  const rec = <T,>(x: unknown, ok: (v: unknown) => boolean): Record<string, T> => {
    const out: Record<string, T> = {};
    if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) if (ok(v)) out[k] = v as T;
    return out;
  };
  const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
  const isQuiz = (v: unknown) => {
    const q = v as QuizRecord;
    return !!q && isNum(q.best) && isNum(q.total) && isNum(q.attempts) && isNum(q.last);
  };
  const last = o.last && typeof o.last.path === 'string' && typeof o.last.title === 'string' && isNum(o.last.ts) ? o.last : undefined;
  return {
    v: 1,
    practicals: rec<number>(o.practicals, isNum),
    lessons: rec<number>(o.lessons, isNum),
    quizzes: rec<QuizRecord>(o.quizzes, isQuiz),
    last,
  };
}

let cachedRaw: string | null | undefined;
let cached: Progress = EMPTY;

/** The current progress. Returns the same object until the stored data changes. */
export function getProgress(): Progress {
  if (typeof window === 'undefined') return EMPTY;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return cached;
  }
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  try {
    cached = raw ? clean(JSON.parse(raw)) : EMPTY;
  } catch {
    cached = EMPTY;
  }
  return cached;
}

function save(p: Progress): void {
  try {
    const raw = JSON.stringify(p);
    window.localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    // Storage blocked or full: keep it in memory for this visit.
    cached = p;
  }
  window.dispatchEvent(new Event(EVENT));
}

export function subscribe(fn: () => void): () => void {
  window.addEventListener(EVENT, fn);
  window.addEventListener('storage', fn);
  return () => {
    window.removeEventListener(EVENT, fn);
    window.removeEventListener('storage', fn);
  };
}

export function markPractical(no: string): void {
  const p = getProgress();
  if (p.practicals[no]) return;
  save({...p, practicals: {...p.practicals, [no]: Date.now()}});
}

export function markLesson(key: string, read: boolean): void {
  const p = getProgress();
  if (read === !!p.lessons[key]) return;
  const lessons = {...p.lessons};
  if (read) lessons[key] = Date.now();
  else delete lessons[key];
  save({...p, lessons});
}

export function recordQuiz(key: string, score: number, total: number): void {
  const p = getProgress();
  const old = p.quizzes[key];
  const better = !old || score / total > old.best / old.total;
  save({
    ...p,
    quizzes: {
      ...p.quizzes,
      [key]: {best: better ? score : old.best, total: better ? total : old.total, attempts: (old?.attempts ?? 0) + 1, last: Date.now()},
    },
  });
}

export function setLast(path: string, title: string): void {
  const p = getProgress();
  if (p.last?.path === path && p.last.title === title) return;
  save({...p, last: {path, title, ts: Date.now()}});
}

export function resetProgress(): void {
  save(EMPTY);
}

/** Combine two records: keep everything either one has, the earlier "done" time, the better quiz score. */
export function mergeProgress(a: Progress, b: Progress): Progress {
  const earlier = (x: Record<string, number>, y: Record<string, number>) => {
    const out = {...x};
    for (const [k, t] of Object.entries(y)) out[k] = k in out ? Math.min(out[k], t) : t;
    return out;
  };
  const quizzes = {...a.quizzes};
  for (const [k, q] of Object.entries(b.quizzes)) {
    const o = quizzes[k];
    if (!o) {
      quizzes[k] = q;
      continue;
    }
    const qBetter = q.best / q.total > o.best / o.total;
    quizzes[k] = {best: qBetter ? q.best : o.best, total: qBetter ? q.total : o.total, attempts: Math.max(o.attempts, q.attempts), last: Math.max(o.last, q.last)};
  }
  const last = a.last && b.last ? (a.last.ts >= b.last.ts ? a.last : b.last) : a.last ?? b.last;
  return {v: 1, practicals: earlier(a.practicals, b.practicals), lessons: earlier(a.lessons, b.lessons), quizzes, last};
}

/** The saved-progress file. */
export function exportProgress(): string {
  return JSON.stringify({app: 'emt-progress', saved: new Date().toISOString(), data: getProgress()}, null, 2);
}

/** Read a saved-progress file and merge it in. Returns false if the file is not a progress file. */
export function importProgress(text: string): boolean {
  try {
    const j = JSON.parse(text);
    if (!j || j.app !== 'emt-progress' || !j.data) return false;
    save(mergeProgress(getProgress(), clean(j.data)));
    return true;
  } catch {
    return false;
  }
}
