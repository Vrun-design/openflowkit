import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, ErrorState, Progress, SystemRoot } from '../../design-system';
import type { MapModel } from '../../../../dsl/map/types';
import { githubEvidenceLink, parseRepoPath, RepoError } from '../../../../services/discovery/githubRepo';
import { loadRepoMap, type MapProgress } from '../../../../services/map/loadRepoMap';
import { useV2Appearance } from '../useV2Appearance';
import { useV2Preferences } from '../useV2Preferences';
import { V2StateHero } from '../V2StateHero';
import { V2StateShell } from '../V2StateShell';
import { cliCommand, describeRepoError, keepToken, RepoTokenForm, storedToken, type RepoProblemView } from '../v2RepoProblem';
import { MapSurface } from './MapSurface';
import './map.css';

const CLI = cliCommand('map');
type Reading = MapProgress & { status: 'reading'; model: MapModel | null; done: boolean };
type State = (Reading | RepoProblemView) & { key: string };
const fmt = (n: number) => n.toLocaleString('en-US');

/** `#/map/github/<owner>/<repo>[/tree/<ref>]`: the Living Map of a public repo. */
export function MapPage(): React.JSX.Element {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { preferences } = useV2Preferences();
  const appearance = useV2Appearance(preferences.theme);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({ key: '', status: 'reading', read: 0, total: 0, model: null, done: false });
  const key = `${pathname}/${attempt}`;
  const lastTick = useRef(0);
  const repo = useMemo(() => parseRepoPath(pathname.replace(/^\/map\/github\//, '')), [pathname]);

  useEffect(() => {
    if (!repo) return undefined;
    const controller = new AbortController();
    const set = (update: (s: State) => State) => { if (!controller.signal.aborted) setState((s) => update(s.key === key ? s : { key, status: 'reading', read: 0, total: 0, model: null, done: false })); };
    set((s) => s);
    const token = storedToken();
    loadRepoMap(repo, {
      signal: controller.signal,
      ...(token ? { token } : {}),
      onSnapshot: (model, p) => set((s) => (s.status === 'reading' ? { ...s, ...p, model } : s)),
      onProgress: (p) => {
        const now = performance.now();
        if (now - lastTick.current < 100 && p.read < p.total) return;
        lastTick.current = now;
        set((s) => (s.status === 'reading' ? { ...s, ...p } : s));
      },
    }).then((model) => set((s) => (s.status === 'reading' ? { ...s, model, done: true } : s)), (error: unknown) => {
      if (error instanceof RepoError && error.problem.kind === 'token-rejected') keepToken(null);
      set(() => ({ ...describeRepoError(error, 'map'), key }));
    });
    return () => controller.abort();
  }, [key, repo]);

  const fail = useCallback(() => setState({ ...describeRepoError(null, 'map'), key }), [key]);
  const current = state.key === key ? state : null;
  const evidenceLink = useMemo(() => { const link = repo ? githubEvidenceLink(repo) : null; return (file: string, line: number) => link?.({ file, line }) ?? null; }, [repo]);
  const home = (primary: boolean) => <Button variant={primary ? 'primary' : 'secondary'} onClick={() => navigate('/home')}>Back to home</Button>;
  const shell = (children: React.ReactNode) => <V2StateShell testId="v2-map">{children}</V2StateShell>;

  if (!repo) {
    return shell(<ErrorState hero={<V2StateHero kind="lost-link" />} title="That is not a GitHub repo address." description="Use /map/github/<owner>/<repo>, optionally followed by /tree/<branch>." action={home(true)} />);
  }
  if (current?.status === 'problem') {
    return shell(
      <ErrorState hero={<V2StateHero kind={current.hero} />} title={current.title} description={current.detail}
        {...(current.askToken
          ? { action: <RepoTokenForm home={home(false)} onSubmit={(token) => { if (token) keepToken(token); setAttempt((n) => n + 1); }} /> }
          : current.retry ? { onRetry: () => setAttempt((n) => n + 1), secondary: home(false) } : { action: home(true) })} />,
    );
  }
  const reading = current;
  if (reading?.done && reading.model && reading.model.stats.files === 0) {
    return shell(<ErrorState hero={<V2StateHero kind="no-canvas" />} title="Nothing to map here." description={`${repo.owner}/${repo.repo} has no TypeScript, JavaScript, Python or Go sources the map reads. ${CLI}`} action={home(true)} />);
  }
  if (!reading?.model || reading.model.stats.files === 0) {
    return shell(
      <div className="ofk-empty" role="status">
        <V2StateHero kind="no-canvas" busy />
        <p className="ofk-empty-title">{`Reading ${repo.owner}/${repo.repo}…`}</p>
        {reading && reading.total > 0 ? <Progress label={`Reading ${fmt(reading.read)} of ${fmt(reading.total)} files…`} value={reading.read} max={reading.total} /> : null}
        <div className="ofk-empty-actions">{home(false)}</div>
      </div>,
    );
  }
  return (
    <SystemRoot appearance={appearance} density={preferences.density} className="map-root" data-testid="v2-map">
      <MapSurface model={reading.model} storageKey={`${repo.owner}/${repo.repo}`} evidenceLink={evidenceLink} onError={fail} />
      <div className="map-status">
        {reading.sampled ? <div className="map-chip" role="note">{`Showing ${fmt(reading.sampled.read)} of ${fmt(reading.sampled.total)} files`}</div> : null}
        {reading.done ? null : <div className="map-chip" role="status"><Progress label={`Reading ${fmt(reading.read)} of ${fmt(reading.total)} files…`} value={reading.read} max={Math.max(1, reading.total)} /></div>}
      </div>
    </SystemRoot>
  );
}
