import { useState } from 'react';
import { Button, Field } from '../design-system';
import { RepoError } from '../../../services/discovery/githubRepo';
import type { V2StateHeroKind } from './V2StateHero';

// What the two GitHub pages (repo -> diagram, repo -> map) say when a read fails, and the token form they share.

// The token lives in this tab's sessionStorage only: never logged, never in a URL.
export const TOKEN_KEY = 'ofk.github-token';
export const storedToken = (): string | undefined => { try { return sessionStorage.getItem(TOKEN_KEY) ?? undefined; } catch { return undefined; } };
export const keepToken = (token: string | null): void => { try { if (token) sessionStorage.setItem(TOKEN_KEY, token); else sessionStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked: the token is used for this try only */ } };


export interface RepoProblemView {
  readonly status: 'problem';
  readonly title: string;
  readonly detail: string;
  readonly retry: boolean;
  readonly hero: V2StateHeroKind;
  readonly askToken?: boolean;
}

/** The CLI command a page names in its error screens: exactly once, with its own subcommand. */
export const cliCommand = (sub: 'discover' | 'map'): string => `npx -p @vrun-design/openflowkit-mcp openflowkit ${sub} .`;

export function describeRepoError(error: unknown, sub: 'discover' | 'map'): RepoProblemView {
  const cli = cliCommand(sub);
  if (!(error instanceof RepoError)) return { status: 'problem', title: 'Something went wrong reading this repo.', detail: `Try again, or use the CLI on a checkout: ${cli}`, retry: true, hero: 'torn-page' };
  switch (error.problem.kind) {
    case 'not-found': return { status: 'problem', title: 'This repo was not found, or it is private.', detail: `${error.message} Check the spelling, or read a private repo with the CLI on a checkout: ${cli}`, retry: false, hero: 'lost-link' };
    case 'rate-limited': return { status: 'problem', title: 'GitHub is limiting reads from your network.', detail: `${error.message} The CLI reads a checkout with no limit: ${cli}`, retry: false, hero: 'torn-page', askToken: true };
    case 'token-rejected': return { status: 'problem', title: 'That GitHub token was rejected.', detail: error.message, retry: false, hero: 'lost-link', askToken: true };
    case 'offline': return { status: 'problem', title: 'GitHub could not be reached.', detail: 'Check your connection and try again.', retry: true, hero: 'torn-page' };
    case 'empty': return { status: 'problem', title: 'This repo is empty.', detail: 'There is nothing in it to draw yet.', retry: false, hero: 'no-canvas' };
    default: return { status: 'problem', title: 'GitHub had a problem.', detail: error.message, retry: true, hero: 'torn-page' };
  }
}


export function RepoTokenForm({ onSubmit, home }: { readonly onSubmit: (token: string) => void; readonly home: React.ReactNode }): React.JSX.Element {
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

