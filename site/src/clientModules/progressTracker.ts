// Runs in the browser on every page change.
//  - remembers the last lesson, quiz or practical opened ("Continue")
//  - marks a lesson as read once the trainee has scrolled to its end and spent a little time on it
import type {ClientModule} from '@docusaurus/types';
import {markLesson, pageKey, practicalNo, setLast} from '../progress/store';
import manifest from '../data/progress-manifest.json';

const LESSONS = new Set(manifest.modules.flatMap((m) => m.lessons.map((l) => l.doc)));
const QUIZZES = new Set(manifest.modules.flatMap((m) => m.lessons.map((l) => l.quiz)));

const MIN_SECONDS = 10;
const NEAR_END_PX = 240;

let stop: (() => void) | null = null;

function watchReading(key: string): () => void {
  const opened = Date.now();
  let timer: number | undefined;
  const check = () => {
    const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - NEAR_END_PX;
    if (!atEnd) return;
    const wait = MIN_SECONDS * 1000 - (Date.now() - opened);
    if (wait > 0) {
      window.clearTimeout(timer);
      timer = window.setTimeout(check, wait + 50);
      return;
    }
    markLesson(key, true);
    cleanup();
  };
  const cleanup = () => {
    window.removeEventListener('scroll', check);
    window.clearTimeout(timer);
  };
  window.addEventListener('scroll', check, {passive: true});
  // A short page may already be fully on screen.
  timer = window.setTimeout(check, 500);
  return cleanup;
}

const module_: ClientModule = {
  onRouteDidUpdate({location}) {
    stop?.();
    stop = null;
    const key = pageKey(location.pathname);
    if (!key) return;

    if (LESSONS.has(key)) {
      stop = watchReading(key);
    }
    if (LESSONS.has(key) || QUIZZES.has(key) || practicalNo(key)) {
      // The page title is set just after the route changes.
      window.setTimeout(() => {
        if (pageKey(window.location.pathname) !== key) return;
        const title = document.title.replace(/\s*\|\s*[^|]*$/, '').trim() || key;
        setLast(key, title);
      }, 400);
    }
  },
};

export default module_;
