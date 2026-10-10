import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, ErrorState, Progress } from '../design-system';
import { capUnits, discoverArchitecture, discoveryToDsl } from '../../../dsl/discovery/discovery';
import { fetchRepoFiles, githubEvidenceLink, parseRepoPath, RepoError, type RepoRef } from '../../../services/discovery/githubRepo';
import { repoMapDocumentId } from '../../application/map/repoMapSource';
import { createV2Repository } from '../../../services/storage/v2/v2Repository';
import type { V2StartIntent } from './v2Document';
import { V2StateHero } from './V2StateHero';
import { CliText, cliCommand, describeRepoError, keepToken, RepoTokenForm, storedToken, type RepoProblemView } from './v2RepoProblem';
import { V2StateShell } from './V2StateShell';
import './v2EditorPage.css';

const MAX_UNITS = 40;
const CLI = `Try the CLI on a checkout: ${cliCommand('discover')}`;

type Outcome =
  | { readonly status: 'reading'; readonly done: number; readonly total: number }
  | RepoProblemView
  | { readonly status: 'notes'; readonly notes: readonly string[]; readonly source: string };

/** One diagram per repo (and ref), like a repo map: a revisit or a bookmark reopens it instead of piling up copies. */
export const fromGithubDocumentId = (repo: RepoRef): string =>
  repoMapDocumentId({ owner: repo.owner, repo: repo.repo, ...(repo.ref !== 'HEAD' ? { ref: repo.ref } : {}) }).replace(/^map-/, 'gh-');

/**
 * Whether this repo's diagram is already stored here; an archived one is brought back to Recents (its edits are the
 * reader's). Storage trouble reads as no: the repo is read afresh.
 */
async function stored(id: string): Promise<boolean> {
  try {
    const repository = createV2Repository(indexedDB);
    const found = await repository.loadDocument(id);
    if (found.status === 'missing') return false;
    if ('record' in found && found.record.archivedAt) await repository.restoreDocuments([id]);
    return true;
  } catch { return false; }
}

const plural = (count: number, one: string) => `${count} ${one}${count === 1 ? '' : 's'}`;

/** The repo's text diagram, and what the editor cannot tell the user about it. */
async function readRepo(repo: RepoRef, signal: AbortSignal, onProgress: (done: number, total: number) => void): Promise<Outcome> {
  const token = storedToken();
  // Pinned to the commit: the evidence links are saved in the document, so they must name what was read, not HEAD.
  const read = await fetchRepoFiles(repo, { signal, onProgress, pinCommit: true, ...(token ? { token } : {}) }).catch((error: unknown) => {
    if (error instanceof RepoError && error.problem.kind === 'token-rejected') keepToken(null);
    throw error;
  });
  // ponytail: discovery runs on the main thread; fine for the 400-file cap — move to a worker if it janks.
  const { result, dropped } = capUnits(discoverArchitecture(read.files, repo.repo), MAX_UNITS);
  if (result.units.length === 0) {
    return { status: 'problem', retry: false, hero: 'no-canvas', title: 'Nothing deployable found.',
      detail: read.truncated ? `This repo is too big for the browser to list in full. ${CLI}` : `No services, Dockerfiles or compose files were found. ${CLI}` };
  }
  const notes = [
    ...(read.truncated ? ['GitHub cut this repo\'s file list short, so some services may be missing.'] : []),
    ...(dropped ? [`Showing ${MAX_UNITS} of ${result.units.length + dropped} services and stores; ${dropped} left out.`] : []),
    ...(read.failed ? [`${plural(read.failed, 'file')} could not be read.`] : []),
    ...(read.unread + read.skipped ? [`Read ${read.files.length + read.failed} of ${read.wanted} relevant files; the rest were left out to keep this quick.`] : []),
  ];
  return { status: 'notes', notes, source: discoveryToDsl(result, repo.repo, githubEvidenceLink({ ...repo, ref: read.commit ?? repo.ref })) };
}

/** `#/from/github/<owner>/<repo>[/tree/<ref>]`: read a public repo in the browser and open its architecture in the editor. */
export function V2FromGithubPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [attempt, setAttempt] = useState(0);
  const request = `${pathname}/${attempt}`;
  const [answer, setAnswer] = useState<{ request: string; outcome: Outcome } | null>(null);
  // Progress carries the request it belongs to, so a retry starts from zero without a reset.
  const [counted, setCounted] = useState<{ request: string; done: number; total: number } | null>(null);
  const progress = counted?.request === request ? counted : { done: 0, total: 0 };
  useEffect(() => {
    const repo = parseRepoPath(pathname.replace(/^\/from\/github\//, ''));
    const publish = (outcome: Outcome) => setAnswer({ request, outcome });
    if (!repo) {
      publish({ status: 'problem', retry: false, hero: 'lost-link', title: 'That is not a GitHub repo address.', detail: 'Use /from/github/<owner>/<repo>, optionally followed by /tree/<branch>.' });
      return undefined;
    }
    const controller = new AbortController();
    const id = fromGithubDocumentId(repo);
    // ponytail: a stored diagram always wins; regenerating it means deleting it first — add a "Read again" if readers ask
    stored(id).then((exists): Promise<Outcome | 'stored'> | 'stored' => (exists ? 'stored' : readRepo(repo, controller.signal, (done, total) => setCounted({ request, done, total })))).then(
      (outcome) => {
        if (controller.signal.aborted) return;
        if (outcome === 'stored') navigate(`/d/${id}`, { replace: true });
        // Nothing to say: straight to the editor, as home's Import does.
        else if (outcome.status === 'notes' && outcome.notes.length === 0) navigate(`/d/${id}`, { replace: true, state: { source: outcome.source } satisfies V2StartIntent });
        else publish(outcome);
      },
      (error: unknown) => { if (!controller.signal.aborted) publish(describeRepoError(error, 'discover')); },
    );
    return () => controller.abort();
  }, [pathname, request, navigate]);
  const outcome = answer?.request === request ? answer.outcome : null;
  const home = (primary: boolean) => <Button variant={primary ? 'primary' : 'secondary'} onClick={() => navigate('/home')}>Back to home</Button>;
  const name = parseRepoPath(pathname.replace(/^\/from\/github\//, ''));
  const open = (outcome: Extract<Outcome, { status: 'notes' }>) => navigate(`/d/${name ? fromGithubDocumentId(name) : 'gh'}`, { replace: true, state: { source: outcome.source } satisfies V2StartIntent });

  return (
    <V2StateShell testId="v2-from-github">
      {outcome?.status === 'problem' ? (
        <ErrorState hero={<V2StateHero kind={outcome.hero} />} title={outcome.title} description={<CliText text={outcome.detail} />}
          {...(outcome.askToken
            ? { action: <RepoTokenForm home={home(false)} onSubmit={(token) => { if (token) keepToken(token); setAttempt((count) => count + 1); }} /> }
            : outcome.retry ? { onRetry: () => setAttempt((count) => count + 1), secondary: home(false) } : { action: home(true) })} />
      ) : outcome?.status === 'notes' ? (
        <div className="ofk-empty" data-hero="" role="status">
          <span className="ofk-empty-icon" aria-hidden="true"><V2StateHero kind="no-canvas" /></span>
          <p className="ofk-empty-title">Your diagram is ready.</p>
          <ul className="ofk-v2-state-notes">{outcome.notes.map((note) => <li key={note}>{note}</li>)}</ul>
          <div className="ofk-empty-actions">
            <Button variant="primary" autoFocus onClick={() => open(outcome)}>Open diagram</Button>
            {home(false)}
          </div>
        </div>
      ) : (
        <div className="ofk-empty">
          <V2StateHero kind="no-canvas" busy />
          <p className="ofk-empty-title" role="status">{name ? `Reading ${name.owner}/${name.repo}…` : 'Reading the repo…'}</p>
          {progress.total > 0
            ? <Progress label={`Reading files ${progress.done} of ${progress.total}`} value={progress.done} max={progress.total} />
            : null}
          <div className="ofk-empty-actions"><Button onClick={() => navigate('/home')}>Cancel</Button></div>
        </div>
      )}
    </V2StateShell>
  );
}
