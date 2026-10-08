import type { MapModel } from '../../dsl/map/types';
import { RepoError, type FetchRepoOptions, type RepoRef } from '../discovery/githubRepo';
import { createIdbStore, type CacheStore } from './cache';
import { runMapPipeline, type MapProgress } from './pipeline';
import type { LoadMessage, WorkerAnswer } from './map.worker';

export { mapPriority, selectMapFile } from './select';
export type { MapProgress } from './pipeline';

export interface LoadMapOptions {
  token?: string;
  signal?: AbortSignal;
  /** Called with the tree alone (loc 0, no links), then with the map as it fills in, then with the finished map. */
  onSnapshot: (model: MapModel, progress: MapProgress) => void;
  /** Files read so far, for a counter. */
  onProgress?: (progress: MapProgress) => void;
  /** Where the reads go; a test passes a fake. A fake fetch cannot cross into a worker, so it runs inline. */
  fetch?: FetchRepoOptions['fetch'];
  hosts?: FetchRepoOptions['hosts'];
  /** Requests in flight (default 16). */
  concurrency?: number;
  /** Test seam: an in-memory cache, or null for none. Defaults to IndexedDB. */
  cache?: CacheStore | null;
}

/** Unit tests (no real Worker) and a caller-supplied fetch run the pipeline on this thread; the app uses the worker. */
const canUseWorker = (opts: LoadMapOptions): boolean =>
  typeof Worker !== 'undefined' && !opts.fetch && opts.cache === undefined && (import.meta as { env?: { MODE?: string } }).env?.MODE !== 'test';

export function loadRepoMap(ref: RepoRef, opts: LoadMapOptions): Promise<MapModel> {
  if (!canUseWorker(opts)) {
    return runMapPipeline(ref, { ...opts, cache: opts.cache === undefined ? createIdbStore() : opts.cache });
  }
  return new Promise<MapModel>((resolve, reject) => {
    if (opts.signal?.aborted) return reject(opts.signal.reason);
    const worker = new Worker(new URL('./map.worker.ts', import.meta.url), { type: 'module' });
    const finish = (settle: () => void, keepRunning = false): void => {
      opts.signal?.removeEventListener('abort', onAbort);
      // After `done` the worker is still writing the cache and closes itself; the timer is only a backstop.
      if (keepRunning) setTimeout(() => worker.terminate(), 30_000); else worker.terminate();
      settle();
    };
    const onAbort = (): void => finish(() => reject(opts.signal!.reason));
    opts.signal?.addEventListener('abort', onAbort, { once: true });
    worker.onmessage = (event: MessageEvent<WorkerAnswer>) => {
      const answer = event.data;
      if (answer.type === 'snapshot') opts.onSnapshot(answer.model, answer.progress);
      else if (answer.type === 'progress') opts.onProgress?.(answer.progress);
      else if (answer.type === 'done') finish(() => resolve(answer.model), true);
      else finish(() => reject(answer.problem ? new RepoError(answer.problem, answer.message) : new Error(answer.message)));
    };
    worker.onerror = (event) => finish(() => reject(new Error(event.message || 'The map worker failed.')));
    // A snapshot that cannot be cloned back must fail the load, not hang it.
    worker.onmessageerror = () => finish(() => reject(new Error('The map worker sent something unreadable.')));
    const message: LoadMessage = { type: 'load', ref, ...(opts.token ? { token: opts.token } : {}), ...(opts.hosts ? { hosts: opts.hosts } : {}), ...(opts.concurrency ? { concurrency: opts.concurrency } : {}) };
    worker.postMessage(message);
  });
}
