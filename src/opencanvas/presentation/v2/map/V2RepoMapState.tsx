import { useNavigate } from 'react-router-dom';
import { Button, ErrorState, Progress } from '../../design-system';
import type { RepoMapSource } from '../../../application/map/repoMapSource';
import { V2StateHero } from '../V2StateHero';
import { V2StateShell } from '../V2StateShell';
import { cliCommand, RepoTokenForm } from '../v2RepoProblem';
import type { RepoMapState } from './useRepoMap';
import './map.css';

/** A crowded level: the strongest arrows are drawn; the rest wait for "Show all". */
export interface RepoLinks { readonly shown: number; readonly total: number; readonly all: boolean; readonly onToggle: () => void }
const fmt = (n: number) => n.toLocaleString('en-US');

export function BadRepoAddress(): React.JSX.Element {
  const navigate = useNavigate();
  return (
    <V2StateShell testId="v2-map">
      <ErrorState hero={<V2StateHero kind="lost-link" />} title="That is not a GitHub repo address." description="Use /map/github/<owner>/<repo>, optionally followed by /tree/<branch>."
        action={<Button variant="primary" onClick={() => navigate('/home')}>Back to home</Button>} />
    </V2StateShell>
  );
}

/** What the editor frame shows instead of the map while there is none to draw: reading, a problem, or an empty repo. Null once the map can show. */
export function V2RepoMapState({ source, map }: { readonly source: RepoMapSource; readonly map: RepoMapState }): React.JSX.Element | null {
  const navigate = useNavigate();
  const home = (primary: boolean) => <Button variant={primary ? 'primary' : 'secondary'} onClick={() => navigate('/home')}>Back to home</Button>;
  const name = `${source.owner}/${source.repo}`;
  const { problem } = map;
  if (map.status === 'problem' && problem) {
    return (
      <V2StateShell testId="v2-map">
        <ErrorState hero={<V2StateHero kind={problem.hero} />} title={problem.title} description={problem.detail}
          {...(problem.askToken
            ? { action: <RepoTokenForm home={home(false)} onSubmit={map.submitToken} /> }
            : problem.retry ? { onRetry: map.retry, secondary: home(false) } : { action: home(true) })} />
      </V2StateShell>
    );
  }
  const files = map.model?.stats.files ?? 0;
  if (map.status === 'ready' && files === 0) {
    return (
      <V2StateShell testId="v2-map">
        <ErrorState hero={<V2StateHero kind="no-canvas" />} title="Nothing to map here." description={`${name} has no TypeScript, JavaScript, Python or Go sources the map reads. ${cliCommand('map')}`} action={home(true)} />
      </V2StateShell>
    );
  }
  if (map.status === 'loading' && files === 0) {
    const { read, total } = map.progress;
    return (
      <V2StateShell testId="v2-map">
        <div className="ofk-empty" role="status">
          <V2StateHero kind="no-canvas" busy />
          <p className="ofk-empty-title">{`Reading ${name}…`}</p>
          {total > 0 ? <Progress label={`Reading ${fmt(read)} of ${fmt(total)} files…`} value={read} max={total} /> : null}
          <div className="ofk-empty-actions">{home(false)}</div>
        </div>
      </V2StateShell>
    );
  }
  return null;
}

/** Notes over the drawn map: a sampled big repo, and the reading counter while it fills in. */
export function V2RepoMapChips({ map, links }: { readonly map: RepoMapState; readonly links?: RepoLinks | null }): React.JSX.Element | null {
  const { sampled, read, total } = map.progress;
  // Before a map is drawn the state screen has its own counter; an unknown total would read "0 of 0".
  const counting = map.status === 'loading' && (map.model?.stats.files ?? 0) > 0 && total > 0;
  if (map.status === 'idle' || (!sampled && !links && !counting)) return null;
  return (
    <div className="map-status">
      {sampled ? <div className="map-chip" role="note">{`Showing ${fmt(sampled.read)} of ${fmt(sampled.total)} files`}</div> : null}
      {links ? (
        <div className="map-chip" role="group" aria-label="Arrows shown">
          <span>{links.all ? `Showing all ${fmt(links.total)} links` : `Showing ${fmt(links.shown)} of ${fmt(links.total)} links`}</span>
          <Button variant="quiet" selected={links.all} onClick={links.onToggle}>{links.all ? 'Show fewer' : 'Show all'}</Button>
        </div>
      ) : null}
      {counting ? <div className="map-chip" role="status"><Progress label={`Reading ${fmt(read)} of ${fmt(total)} files…`} value={read} max={total} /></div> : null}
    </div>
  );
}

/** What goes over the canvas of a repo map: the state screen while there is no map to draw, and the notes over it once there is. */
export function V2RepoMapOverlay({ source, map, links }: { readonly source: RepoMapSource; readonly map: RepoMapState; readonly links?: RepoLinks | null }): React.JSX.Element {
  return (
    <>
      <div className="ofk-v2-map-state"><V2RepoMapState source={source} map={map} /></div>
      <V2RepoMapChips map={map} links={links} />
    </>
  );
}
