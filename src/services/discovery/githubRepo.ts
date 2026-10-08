// Reads a public GitHub repo in the browser for discovery: one git-trees call
// (CORS *, 60/h per IP without a token) for the file list, then
// raw.githubusercontent.com (CORS *, not counted against that limit) for only
// the files discovery reads. Nothing is cloned; nothing leaves the browser.
import { acceptsArchitectureFile } from '../../dsl/discovery/discovery';
import { basename, type ScannedFile } from '../../dsl/discovery/rules';

export interface RepoRef {
  readonly owner: string;
  readonly repo: string;
  /** Branch, tag or commit; `HEAD` is the default branch. */
  readonly ref: string;
}

export type RepoProblem =
  | { readonly kind: 'not-found' }
  | { readonly kind: 'rate-limited'; readonly resetAt: Date | null }
  | { readonly kind: 'empty' }
  | { readonly kind: 'offline' }
  | { readonly kind: 'http'; readonly status: number };

export class RepoError extends Error {
  constructor(readonly problem: RepoProblem, message: string) {
    super(message);
    this.name = 'RepoError';
  }
}

export interface RepoFiles {
  readonly files: readonly ScannedFile[];
  /** Files discovery would read; more than `files` when capped. */
  readonly wanted: number;
  /** GitHub cut the listing short (over 100k entries or 7 MB). */
  readonly truncated: boolean;
  /** Wanted files past `maxFiles`, never fetched. */
  readonly unread: number;
  /** Files that would not load (rate limit, 404, a dropped connection). */
  readonly failed: number;
  /** Files left unread because the 8 MB total was spent. */
  readonly skipped: number;
}

const decoded = (segment: string): string | null => { try { return decodeURIComponent(segment); } catch { return null; } };
/** A segment that could climb out of the repo path or name a hidden file is never a name here. */
const plainSegment = (segment: string): boolean => segment !== '' && !segment.startsWith('.') && !segment.includes('\\');

/**
 * `owner/repo`, `owner/repo/tree/<ref>`, or the same as a github.com URL. A pasted
 * subfolder URL (`tree/<ref>/sub/path`) reads the whole repo at `<ref>`: the ref is
 * the first segment, because a branch with a slash cannot be told from a subfolder
 * (write it `release%2F2.0`). Null for anything else; GitLab is not read.
 */
export function parseRepoPath(input: string): RepoRef | null {
  const path = input.trim().replace(/^https?:\/\/(?:www\.)?github\.com\//i, '').replace(/[?#].*$/, '').replace(/\/+$/, '');
  const [owner, rawRepo, tree, ref, ...subpath] = path.split('/');
  const repo = rawRepo?.replace(/\.git$/, '');
  if (!owner || !repo || !/^[A-Za-z0-9-]+$/.test(owner) || !/^[A-Za-z0-9._-]+$/.test(repo) || !plainSegment(repo)) return null;
  if (tree === undefined) return { owner, repo, ref: 'HEAD' };
  // ponytail: slashed branch in a pasted tree URL reads as its first segment (release/2.0 → release) — resolve against the refs API if users hit it
  const name = tree === 'tree' && ref !== undefined && subpath.every(Boolean) ? decoded(ref) : null;
  if (name === null || !name.split('/').every(plainSegment)) return null;
  return { owner, repo, ref: name };
}

/** Where a piece of evidence lives on GitHub: `…/blob/<ref>/<file>#L<line>`, every segment encoded. */
export function githubEvidenceLink(ref: RepoRef): (evidence: { readonly file: string; readonly line: number }) => string {
  const encode = (path: string) => path.split('/').map(encodeURIComponent).join('/');
  return ({ file, line }) => `https://github.com/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}/blob/${encode(ref.ref)}/${encode(file)}#L${line}`;
}

/** Deploy manifests first: they define the units; source files only add edges. */
function priority(file: string): number {
  const name = basename(file);
  if (/^(?:Dockerfile|docker-compose|compose)|\.dockerfile$|\.ya?ml$|\.tf$/i.test(name)) return 0;
  if (/^(?:package\.json|go\.mod|requirements\.txt|pyproject\.toml|pom\.xml)$/.test(name)) return 1;
  return 2;
}

const MAX_FILE_BYTES = 256 * 1024;
const MAX_TOTAL_BYTES = 8 * 1024 * 1024;

export interface FetchRepoOptions {
  readonly fetch?: typeof fetch;
  readonly maxFiles?: number;
  readonly onProgress?: (done: number, total: number) => void;
  /** Abort on unmount: the scan stops and rejects with the signal's reason. */
  readonly signal?: AbortSignal;
  /** Per-request timeout, reported as offline. */
  readonly timeoutMs?: number;
  /** Where the two reads go. Exists so a test can fetch a real closed port (AGENTS rule 6). */
  readonly hosts?: { readonly api: string; readonly raw: string };
}

export async function fetchRepoFiles(ref: RepoRef, options: FetchRepoOptions = {}): Promise<RepoFiles> {
  const get = options.fetch ?? fetch;
  const { signal } = options;
  const hosts = options.hosts ?? { api: 'https://api.github.com', raw: 'https://raw.githubusercontent.com' };
  const call = async (url: string, init?: RequestInit): Promise<Response> => {
    try {
      const timeout = AbortSignal.timeout(options.timeoutMs ?? 20_000);
      // ponytail: AbortSignal.any is Safari 17.4+/Chrome 116+; older browsers keep the caller's signal and lose the timeout.
      const combined = !signal ? timeout : typeof AbortSignal.any === 'function' ? AbortSignal.any([signal, timeout]) : signal;
      return await get(url, { ...init, signal: combined });
    } catch (error) {
      if (signal?.aborted) throw signal.reason ?? error;
      throw new RepoError({ kind: 'offline' }, 'GitHub could not be reached. Check your connection and try again.');
    }
  };
  const repoPath = `${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}`;
  const treeResponse = await call(`${hosts.api}/repos/${repoPath}/git/trees/${encodeURIComponent(ref.ref)}?recursive=1`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!treeResponse.ok) throw await treeError(treeResponse, ref);
  const tree = await treeResponse.json() as { tree?: readonly { path: string; type: string; size?: number }[]; truncated?: boolean };
  const wanted = (tree.tree ?? [])
    .filter((entry) => entry.type === 'blob' && entry.path.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..') && (entry.size ?? 0) <= MAX_FILE_BYTES && acceptsArchitectureFile(entry.path))
    .sort((a, b) => priority(a.path) - priority(b.path) || a.path.localeCompare(b.path));
  const capped = wanted.slice(0, options.maxFiles ?? 400);
  // The byte budget is spent on the listed sizes, manifests first, before any file is fetched.
  let bytes = 0;
  const chosen = capped.filter((entry) => (bytes += entry.size ?? 0) <= MAX_TOTAL_BYTES).map((entry) => entry.path);
  const refPath = ref.ref.split('/').map(encodeURIComponent).join('/');

  const files: ScannedFile[] = [];
  let done = 0;
  let next = 0;
  let failed = 0;
  let lastFailure: RepoError | null = null;
  let stopped: unknown = null;
  // ponytail: 8 requests at a time from one browser; raise if big repos feel slow.
  const worker = async () => {
    while (next < chosen.length && stopped === null) {
      const path = chosen[next++]!;
      try {
        const response = await call(`${hosts.raw}/${repoPath}/${refPath}/${path.split('/').map(encodeURIComponent).join('/')}`);
        if (response.ok) files.push({ path, content: await response.text() });
        else {
          // A file that vanished or won't load is counted: discovery works on what it can read.
          failed++;
          lastFailure = rateLimit(response, 'raw') ?? new RepoError({ kind: 'http', status: response.status }, `GitHub answered ${response.status}. Try again in a minute.`);
        }
      } catch (error) {
        // The network is gone or the caller left: nothing more to fetch. Anything else costs one file.
        if (signal?.aborted || (error instanceof RepoError && error.problem.kind === 'offline')) stopped = error;
        else {
          failed++;
          lastFailure = error instanceof RepoError ? error : new RepoError({ kind: 'http', status: 0 }, 'A file could not be read. Try again in a minute.');
        }
      }
      done++;
      if (stopped === null) options.onProgress?.(done, chosen.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(8, chosen.length) }, worker));
  if (stopped !== null) throw stopped;
  if (failed * 2 > chosen.length && lastFailure) throw lastFailure;
  return {
    files: files.sort((a, b) => a.path.localeCompare(b.path)),
    wanted: wanted.length, truncated: tree.truncated === true, failed, unread: wanted.length - capped.length, skipped: capped.length - chosen.length,
  };
}

/** Any 429, or a 403 that says no calls are left or carries `retry-after` (a secondary limit). */
function rateLimit(response: Response, source: 'api' | 'raw' = 'api'): RepoError | null {
  if (response.status !== 403 && response.status !== 429) return null;
  if (response.status === 403 && response.headers.get('x-ratelimit-remaining') !== '0' && !response.headers.has('retry-after')) return null;
  if (source === 'raw') return new RepoError({ kind: 'rate-limited', resetAt: null }, 'GitHub is limiting file downloads from your network right now. Wait a minute and try again, or use the CLI on a checkout.');
  const reset = Number(response.headers.get('x-ratelimit-reset'));
  const resetAt = Number.isFinite(reset) && reset > 0 ? new Date(reset * 1000) : null;
  const when = resetAt ? ` It resets at ${resetAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.` : '';
  return new RepoError({ kind: 'rate-limited', resetAt }, `GitHub allows 60 repo reads an hour from your network, and they're used up.${when} The CLI reads a checkout with no limit.`);
}

async function treeError(response: Response, ref: RepoRef): Promise<RepoError> {
  const limited = rateLimit(response);
  if (limited) return limited;
  // GitHub answers 404 alike for a private repo, a missing one and a wrong branch.
  if (response.status === 404 || response.status === 422) {
    return new RepoError({ kind: 'not-found' }, `${ref.owner}/${ref.repo}${ref.ref === 'HEAD' ? '' : ` (${ref.ref})`} wasn't found. Private repos need the CLI on a checkout: npx -p @vrun-design/openflowkit-mcp openflowkit discover .`);
  }
  if (response.status === 409) return new RepoError({ kind: 'empty' }, `${ref.owner}/${ref.repo} is empty.`);
  return new RepoError({ kind: 'http', status: response.status }, `GitHub answered ${response.status}. Try again in a minute.`);
}
