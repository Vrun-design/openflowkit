// The map load off the main thread: fetch, scan and build happen here, snapshots go up.
// Protocol: `load` in → `snapshot` and `progress` any number of times → one `done` or `error`.
// Abort is the caller terminating the worker, so there is no cancel message.
import { RepoError, type RepoProblem, type RepoRef } from '../discovery/githubRepo';
import type { MapModel } from '../../dsl/map/types';
import { createIdbStore } from './cache';
import { runMapPipeline, type MapProgress } from './pipeline';

export interface LoadMessage {
  type: 'load';
  ref: RepoRef;
  token?: string;
  hosts?: { api: string; raw: string };
  concurrency?: number;
}

export type WorkerAnswer =
  | { type: 'snapshot'; model: MapModel; progress: MapProgress }
  | { type: 'progress'; progress: MapProgress }
  | { type: 'done'; model: MapModel }
  | { type: 'error'; message: string; problem?: RepoProblem };

const post = (answer: WorkerAnswer): void => (self as unknown as Worker).postMessage(answer);

self.onmessage = async (event: MessageEvent<LoadMessage>) => {
  const { ref, token, hosts, concurrency } = event.data;
  try {
    await runMapPipeline(ref, {
      ...(token ? { token } : {}),
      ...(hosts ? { hosts } : {}),
      ...(concurrency ? { concurrency } : {}),
      cache: createIdbStore(),
      onSnapshot: (snapshot, progress) => post({ type: 'snapshot', model: snapshot, progress }),
      onProgress: (progress) => post({ type: 'progress', progress }),
      // Answer first; the cache write that follows must not delay the page.
      onDone: (finished) => post({ type: 'done', model: finished }),
    });
    // The main thread leaves this worker running after `done` so the write above can finish; then it closes itself.
    self.close();
  } catch (error) {
    post({ type: 'error', message: error instanceof Error ? error.message : String(error), ...(error instanceof RepoError ? { problem: error.problem } : {}) });
  }
};
