import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, ErrorState, Field, Progress } from '../design-system';
import { capUnits, discoverArchitecture, discoveryToDsl } from '../../../dsl/discovery/discovery';
import { fetchRepoFiles, githubEvidenceLink, parseRepoPath, RepoError, type RepoRef } from '../../../services/discovery/githubRepo';
import { mintV2Id, type V2StartIntent } from './v2Document';
import { V2StateHero, type V2StateHeroKind } from './V2StateHero';
import { V2StateShell } from './V2StateShell';
import './v2EditorPage.css';

const MAX_UNITS = 40;
const CLI = 'Try the CLI on a checkout: npx -p @vrun-design/openflowkit-mcp openflowkit discover .';

// The token lives in this tab's sessionStorage only: never logged, never in a URL.
const TOKEN_KEY = 'ofk.github-token';
const storedToken = (): string | undefined => { try { return sessionStorage.getItem(TOKEN_KEY) ?? undefined; } catch { return undefined; } };
const keepToken = (token: string | null): void => { try { if (token) sessionStorage.setItem(TOKEN_KEY, token); else sessionStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked: the token is used for this try only */ } };

type Outcome =
  | { readonly status: 'reading'; readonly done: number; readonly total: number }
  | { readonly status: 'problem'; readonly title: string; readonly detail: string; readonly retry: boolean; readonly hero: V2StateHeroKind; readonly askToken?: boolean }
  | { readonly status: 'notes'; readonly notes: readonly string[]; readonly source: string };

const plural = (count: number, one: string) => `${count} ${one}${count === 1 ? '' : 's'}`;

function describe(error: unknown): Extract<Outcome, { status: 'problem' }> {
  if (!(error instanceof RepoError)) return { status: 'problem', title: 'Something went wrong reading this repo.', detail: 'Try again, or use the CLI on a checkout.', retry: true, hero: 'torn-page' };
  switch (error.problem.kind) {
    case 'not-found': return { status: 'problem', title: 'This repo was not found, or it is private.', detail: `${error.message} Check the spelling, or use the CLI on a checkout.`, retry: false, hero: 'lost-link' };
    case 'rate-limited': return { status: 'problem', title: 'GitHub is limiting reads from your network.', detail: error.message, retry: false, hero: 'torn-page', askToken: true };
    case 'token-rejected': return { status: 'problem', title: 'That GitHub token was rejected.', detail: error.message, retry: false, hero: 'lost-link', askToken: true };
    case 'offline': return { status: 'problem', title: 'GitHub could not be reached.', detail: 'Check your connection and try again.', retry: true, hero: 'torn-page' };
    case 'empty': return { status: 'problem', title: 'This repo is empty.', detail: 'There is nothing in it to draw yet.', retry: false, hero: 'no-canvas' };
    default: return { status: 'problem', title: 'GitHub had a problem.', detail: error.message, retry: true, hero: 'torn-page' };
  }
}

/** The repo's text diagram, and what the editor cannot tell the user about it. */
async function readRepo(repo: RepoRef, signal: AbortSignal, onProgress: (done: number, total: number) => void): Promise<Outcome> {
  const token = storedToken();
  const read = await fetchRepoFiles(repo, { signal, onProgress, ...(token ? { token } : {}) }).catch((error: unknown) => {
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
  return { status: 'notes', notes, source: discoveryToDsl(result, repo.repo, githubEvidenceLink(repo)) };
}

function TokenForm({ onSubmit, home }: { readonly onSubmit: (token: string) => void; readonly home: React.ReactNode }): React.JSX.Element {
  const [token, setToken] = useState('');
  return (
    <form className="ofk-v2-state-token" onSubmit={(event) => { event.preventDefault(); onSubmit(token.trim()); }}>
      <Field label="GitHub token (optional)" type="password" autoComplete="new-password" spellCheck={false} value={token} onChange={(event) => setToken(event.target.value)}
        hint="A token raises the limit to 5,000/hour. Use a fine-grained token with public-repo read only. It stays in this browser tab." />
      <a className="ofk-caption" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">Create a fine-grained token on GitHub</a>
      <div className="ofk-empty-actions">
        <Button variant="primary" type="submit">Try with token</Button>
        {home}
      </div>
    </form>
  );
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
    readRepo(repo, controller.signal, (done, total) => setCounted({ request, done, total })).then(
      (outcome) => {
        if (controller.signal.aborted) return;
        // Nothing to say: straight to the editor, as home's Import does.
        if (outcome.status === 'notes' && outcome.notes.length === 0) navigate(`/d/${mintV2Id('doc')}`, { replace: true, state: { source: outcome.source } satisfies V2StartIntent });
        else publish(outcome);
      },
      (error: unknown) => { if (!controller.signal.aborted) publish(describe(error)); },
    );
    return () => controller.abort();
  }, [pathname, request, navigate]);
  const outcome = answer?.request === request ? answer.outcome : null;
  const home = (primary: boolean) => <Button variant={primary ? 'primary' : 'secondary'} onClick={() => navigate('/home')}>Back to home</Button>;
  const open = (outcome: Extract<Outcome, { status: 'notes' }>) => navigate(`/d/${mintV2Id('doc')}`, { replace: true, state: { source: outcome.source } satisfies V2StartIntent });
  const name = parseRepoPath(pathname.replace(/^\/from\/github\//, ''));

  return (
    <V2StateShell testId="v2-from-github">
      {outcome?.status === 'problem' ? (
        <ErrorState hero={<V2StateHero kind={outcome.hero} />} title={outcome.title} description={outcome.detail}
          {...(outcome.askToken
            ? { action: <TokenForm home={home(false)} onSubmit={(token) => { if (token) keepToken(token); setAttempt((count) => count + 1); }} /> }
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
