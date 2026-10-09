import { useCallback, useEffect, useRef, useState } from 'react';
import type { MapModel } from '../../../../dsl/map/types';
import { RepoError } from '../../../../services/discovery/githubRepo';
import { loadRepoMap, type LoadMapOptions, type MapProgress } from '../../../../services/map/loadRepoMap';
import type { RepoMapSource } from '../../../application/map/repoMapSource';
import { describeRepoError, keepToken, storedToken, type RepoProblemView } from '../v2RepoProblem';

export interface RepoMapState {
  readonly status: 'idle' | 'loading' | 'ready' | 'problem';
  /** While loading: the tree first, then the map as it fills in. */
  readonly model: MapModel | null;
  /** `sampled` is kept after the read finishes: the "Showing X of Y files" note outlives the counter. */
  readonly progress: MapProgress;
  readonly problem: RepoProblemView | null;
  readonly retry: () => void;
  /** Keeps a non-empty token for this tab, then reads again. */
  readonly submitToken: (token: string) => void;
}

type Loader = (ref: { owner: string; repo: string; ref: string }, opts: LoadMapOptions) => Promise<MapModel>;
type Answer = { key: string; status: 'loading' | 'ready'; model: MapModel | null; progress: MapProgress } | { key: string; status: 'problem'; problem: RepoProblemView };

const NO_PROGRESS: MapProgress = { read: 0, total: 0 };
// Finished maps, this session only: re-entering the document is instant. A reload re-reads the tree and then hits the IndexedDB cache, which needs the network for that one tree request (a known gap: offline shows the offline screen). The last few repos.
const KEEP = 3;
const finished = new Map<string, { model: MapModel; progress: MapProgress }>();
const remember = (key: string, entry: { model: MapModel; progress: MapProgress }): void => {
  finished.delete(key);
  finished.set(key, entry);
  for (const old of finished.keys()) { if (finished.size <= KEEP) break; finished.delete(old); }
};

/** Reads a repo's facts for the editor's map. `load` is a test seam. */
export function useRepoMap(source: RepoMapSource | null, load: Loader = loadRepoMap): RepoMapState {
  const [attempt, setAttempt] = useState(0);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const lastTick = useRef(0);
  const owner = source?.owner;
  const repo = source?.repo;
  const ref = source?.ref ?? 'HEAD';
  const memoKey = JSON.stringify([owner, repo, ref]);
  const key = source ? `${memoKey}#${attempt}` : '';

  useEffect(() => {
    if (!owner || !repo || finished.has(memoKey)) return undefined;
    const controller = new AbortController();
    const put = (next: (a: Answer | null) => Answer): void => { if (!controller.signal.aborted) setAnswer((a) => next(a)); };
    let sampled: MapProgress['sampled'];
    put(() => ({ key, status: 'loading', model: null, progress: NO_PROGRESS }));
    const token = storedToken();
    load({ owner, repo, ref }, {
      signal: controller.signal,
      ...(token ? { token } : {}),
      onSnapshot: (model, progress) => { sampled = progress.sampled; put(() => ({ key, status: 'loading', model, progress: { ...progress } })); },
      onProgress: (progress) => {
        const now = performance.now();
        if (now - lastTick.current < 100 && progress.read < progress.total) return; // ≤10 renders/s
        lastTick.current = now;
        sampled = progress.sampled ?? sampled;
        put((a) => ({ key, status: 'loading', model: a?.key === key && a.status === 'loading' ? a.model : null, progress: { ...progress } }));
      },
    }).then(
      (model) => {
        if (controller.signal.aborted) return;
        const progress: MapProgress = { read: model.stats.files, total: model.stats.files, ...(sampled ? { sampled } : {}) };
        remember(memoKey, { model, progress });
        put(() => ({ key, status: 'ready', model, progress }));
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof RepoError && error.problem.kind === 'token-rejected') keepToken(null);
        put(() => ({ key, status: 'problem', problem: describeRepoError(error, 'map') }));
      },
    );
    return () => controller.abort();
  }, [key, memoKey, owner, repo, ref, load]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const submitToken = useCallback((token: string) => { if (token) keepToken(token); setAttempt((n) => n + 1); }, []);
  const base = { retry, submitToken };
  const memo = source ? finished.get(memoKey) : undefined;
  const current = answer?.key === key ? answer : null;
  if (!source) return { status: 'idle', model: null, progress: NO_PROGRESS, problem: null, ...base };
  if (current?.status === 'problem') return { status: 'problem', model: null, progress: NO_PROGRESS, problem: current.problem, ...base };
  if (memo) return { status: 'ready', model: memo.model, progress: memo.progress, problem: null, ...base };
  return { status: current?.status ?? 'loading', model: current?.model ?? null, progress: current?.progress ?? NO_PROGRESS, problem: null, ...base };
}

/** For tests: forget finished maps. */
export const clearRepoMapMemory = (): void => finished.clear();
