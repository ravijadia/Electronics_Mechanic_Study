import {useSyncExternalStore} from 'react';
import {EMPTY, getProgress, subscribe, type Progress} from './store';
import manifest from '../data/progress-manifest.json';
import {PRACTICAL_MODULES} from '../data/practicals';

/** Live progress. Empty on the server and on first render, then the saved record. */
export default function useProgress(): Progress {
  return useSyncExternalStore(subscribe, getProgress, () => EMPTY);
}

export interface Totals {
  practicals: number;
  lessons: number;
  quizzes: number;
  practicalsDone: number;
  lessonsDone: number;
  quizzesDone: number;
}

export const ALL_PRACTICALS = PRACTICAL_MODULES.flatMap((m) => m.items.filter((x) => x.path).map((x) => ({...x, module: m.module})));
export const MODULES = manifest.modules;
const lessonCount = MODULES.reduce((n, m) => n + m.lessons.length, 0);

export function totals(p: Progress): Totals {
  const done = <T,>(keys: T[], has: (k: T) => boolean) => keys.filter(has).length;
  const lessons = MODULES.flatMap((m) => m.lessons);
  return {
    practicals: ALL_PRACTICALS.length,
    lessons: lessonCount,
    quizzes: lessonCount,
    practicalsDone: done(ALL_PRACTICALS, (x) => !!p.practicals[x.no]),
    lessonsDone: done(lessons, (l) => !!p.lessons[l.doc]),
    quizzesDone: done(lessons, (l) => !!p.quizzes[l.quiz]),
  };
}
