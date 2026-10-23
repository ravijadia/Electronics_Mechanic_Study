// Talks to the trainer's Google Apps Script (trainer-setup/Code.gs).
// Requests are sent as text/plain so the browser does not need a CORS preflight, which Apps Script cannot answer.
import {SUBMIT_URL} from './config';
import type {SnapshotTable} from './snapshot';

export const submitEnabled = SUBMIT_URL.startsWith('https://');

export interface SubmitPayload {
  batchCode: string;
  trainee: {name: string; roll: string; batch: string; date: string};
  practical: {no: string; title: string};
  stepsDone: number;
  stepsTotal: number;
  correct: number;
  wrong: number;
  tables: SnapshotTable[];
  html: string;
}

export interface Submission {
  id: string;
  batch: string;
  roll: string;
  name: string;
  practical: string;
  title: string;
  date: string;
  submitted: number;
  attempts: number;
  stepsDone: number;
  stepsTotal: number;
  correct: number;
  wrong: number;
  pdf: string;
}

export interface RosterEntry {
  batch: string;
  roll: string;
  name: string;
}

export interface Listing {
  submissions: Submission[];
  roster: RosterEntry[];
  batches: string[];
}

type Reply<T> = ({ok: true} & T) | {ok: false; error: string};

async function call<T>(init: RequestInit, query = ''): Promise<Reply<T>> {
  try {
    const res = await fetch(SUBMIT_URL + query, {redirect: 'follow', ...init});
    const j = (await res.json()) as Reply<T>;
    return j && typeof j === 'object' && 'ok' in j ? j : {ok: false, error: 'Unexpected reply from the server.'};
  } catch {
    return {ok: false, error: 'Could not reach the server. Check the internet connection and try again.'};
  }
}

export function sendPractical(p: SubmitPayload): Promise<Reply<{submitted: number; attempts: number}>> {
  return call({method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'}, body: JSON.stringify({action: 'submit', ...p})});
}

const get = <T,>(params: Record<string, string>) => call<T>({method: 'GET'}, '?' + new URLSearchParams(params).toString());

export const listSubmissions = (key: string) => get<Listing>({action: 'list', key});
export const readingsOf = (key: string, id: string) => get<{tables: SnapshotTable[]}>({action: 'detail', key, id});
