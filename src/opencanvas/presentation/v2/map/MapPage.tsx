import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ErrorState, SystemRoot } from '../../design-system';
import { loadRepoMap } from '../../../../services/map/loadRepoMap';
import { parseRepoPath, RepoError } from '../../../../services/discovery/githubRepo';
import type { MapModel } from '../../../../dsl/map/types';
import { useV2Appearance } from '../useV2Appearance';
import { useV2Preferences } from '../useV2Preferences';
import { V2StateHero } from '../V2StateHero';
import { V2StateShell } from '../V2StateShell';
import { MapSurface } from './MapSurface';
import './map.css';

// Same session token the repo-to-diagram page keeps; read only.
const TOKEN_KEY = 'ofk.github-token';
const dropToken = (): void => { try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ } };
const storedToken = (): string | undefined => { try { return sessionStorage.getItem(TOKEN_KEY) ?? undefined; } catch { return undefined; } };

type State =
  | { status: 'reading'; read: number; total: number; model: MapModel | null; done?: boolean }
  | { status: 'error'; message: string };

/** `#/map/github/<owner>/<repo>[/tree/<ref>]`: the Living Map of a public repo. Full states are slice b3. */
export function MapPage(): React.JSX.Element {
  const { pathname } = useLocation();
  const { preferences } = useV2Preferences();
  const appearance = useV2Appearance(preferences.theme);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State & { key: string }>({ key: '', status: 'reading', read: 0, total: 0, model: null });
  const key = `${pathname}/${attempt}`;
  const lastTick = useRef(0);
  const repo = parseRepoPath(pathname.replace(/^\/map\/github\//, ''));

  useEffect(() => {
    if (!repo) return undefined;
    const controller = new AbortController();
    const set = (next: State) => { if (!controller.signal.aborted) setState({ ...next, key }); };
    set({ status: 'reading', read: 0, total: 0, model: null });
    loadRepoMap(repo, {
      signal: controller.signal,
      ...(storedToken() ? { token: storedToken()! } : {}),
      onSnapshot: (model, p) => set({ status: 'reading', ...p, model }),
      onProgress: (p) => {
        const now = performance.now();
        if (now - lastTick.current < 100 && p.read < p.total) return;
        lastTick.current = now;
        setState((s) => (s.key === key && s.status === 'reading' ? { ...s, ...p } : s));
      },
    }).then((model) => set({ status: 'reading', read: 0, total: 0, model, done: true }), (error: unknown) => {
      if (error instanceof RepoError && error.problem.kind === 'token-rejected') dropToken();
      set({ status: 'error', message: error instanceof RepoError ? error.message : 'Something went wrong reading this repo.' });
    });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `repo` is derived from pathname
  }, [key]);

  const fail = useCallback((message: string) => setState({ key, status: 'error', message }), [key]);
  const current = state.key === key ? state : null;
  if (!repo || current?.status === 'error') {
    return (
      <V2StateShell testId="v2-map">
        <ErrorState hero={<V2StateHero kind="torn-page" />} title={repo ? 'This map could not be drawn.' : 'That is not a GitHub repo address.'}
          description={repo ? (current as { message: string }).message : 'Use /map/github/<owner>/<repo>, optionally followed by /tree/<branch>.'}
          {...(repo ? { onRetry: () => setAttempt((n) => n + 1) } : {})} />
      </V2StateShell>
    );
  }
  if (!current?.model) {
    return (
      <V2StateShell testId="v2-map">
        <p className="ofk-empty-title" role="status">{`Reading ${repo.owner}/${repo.repo}…${current && current.total ? ` ${current.read} of ${current.total} files` : ''}`}</p>
      </V2StateShell>
    );
  }
  const busy = !current.done;
  return (
    <SystemRoot appearance={appearance} density={preferences.density} className="map-root" data-testid="v2-map">
      <MapSurface model={current.model} onError={fail} />
      {busy ? <div className="map-progress" role="status">{`Reading files ${current.read} of ${current.total}`}</div> : null}
    </SystemRoot>
  );
}
