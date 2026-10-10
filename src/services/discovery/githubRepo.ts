// Reads a public GitHub repo in the browser for discovery: one git-trees call (and one commits call when pinned)
// (CORS *, 60/h per IP without a token) for the file list, then
// raw.githubusercontent.com (CORS *, not counted against that limit) for only
// the files discovery reads. Nothing is cloned; nothing leaves the browser.
import { acceptsArchitectureFile, definesUnit } from '../../dsl/discovery/discovery';
import type { ScannedFile } from '../../dsl/discovery/rules';

export interface RepoRef {
  readonly owner: string;
  readonly repo: string;
  /** Branch, tag or commit; `HEAD` is the default branch. */
  readonly ref: string;
}

export type RepoProblem =
  | { readonly kind: 'not-found' }
  | { readonly kind: 'rate-limited'; readonly resetAt: Date | null }
  /** A secondary limit or a raw-download 429: a token does not help, waiting does (`retryAfter` seconds when GitHub said). */
  | { readonly kind: 'slow-down'; readonly retryAfter: number | null }
  /** A token listed the tree but the files 404: raw downloads never carry the token, so a private repo cannot be read here. */
  | { readonly kind: 'private' }
  | { readonly kind: 'empty' }
  | { readonly kind: 'offline' }
  | { readonly kind: 'token-rejected' }
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
  /** The commit everything was read at, when `pinCommit` resolved it. */
  readonly commit?: string;
}

const decoded = (segment: string): string | null => { try { return decodeURIComponent(segment); } catch { return null; } };
/** A segment that could climb out of the repo path or name a hidden file is never a name here. */
const plainSegment = (segment: string): boolean => segment !== '' && !segment.startsWith('.') && !segment.includes('\\');
/** An owner or repo name: a repo may start with a dot (`acme/.github`), but `.` and `..` would climb out of the URL. */
const safeName = (name: string): boolean => name !== '' && name !== '.' && name !== '..' && !name.includes('\\');
/** github.com pages that look like `owner/repo` but are not a repo. */
const RESERVED = new Set(['settings', 'marketplace', 'orgs', 'sponsors', 'notifications', 'login', 'explore', 'topics', 'collections', 'features', 'about', 'pricing', 'apps']);

/**
 * `owner/repo`, `owner/repo/tree/<ref>` or `/blob/<ref>/<file>`, the same as a github.com URL (with or without
 * `https://` and `www.`), or an ssh remote (`git@github.com:owner/repo.git`). A pasted subfolder or file URL reads the
 * whole repo at `<ref>`: the ref is the first segment, because a branch with a slash cannot be told from a subfolder
 * (write it `release%2F2.0`). Null for anything else; GitLab is not read.
 */
export function parseRepoPath(input: string): RepoRef | null {
  const path = input.trim().replace(/^(?:(?:(?:https?|ssh):\/\/)?(?:[^@/\s]+@)?(?:www\.)?github\.com\/|git@github\.com:)/i, '').replace(/[?#].*$/, '').replace(/\/+$/, '');
  const [owner, rawRepo, tree, ref, ...subpath] = path.split('/');
  const repo = rawRepo?.replace(/\.git$/, '');
  if (!owner || !repo || !/^[A-Za-z0-9-]+$/.test(owner) || RESERVED.has(owner.toLowerCase()) || !/^[A-Za-z0-9._-]+$/.test(repo) || !safeName(repo)) return null;
  if (tree === undefined) return { owner, repo, ref: 'HEAD' };
  // ponytail: slashed branch in a pasted tree URL reads as its first segment (release/2.0 → release) — resolve against the refs API if users hit it
  const name = (tree === 'tree' || tree === 'blob') && ref !== undefined && subpath.every(Boolean) ? decoded(ref) : null;
  if (name === null || !name.split('/').every(plainSegment)) return null;
  return { owner, repo, ref: name };
}

/** A ref that could climb out of `blob/` or the tree path (`..`, `.`, empty segments) is never sent anywhere. */
const safeRef = (ref: string): string => (ref.split('/').every((s) => s !== '' && s !== '.' && s !== '..') ? ref : 'HEAD');

/** Where a piece of evidence lives on GitHub: `…/blob/<ref>/<file>#L<line>`, every segment encoded. */
export function githubEvidenceLink(ref: RepoRef): (evidence: { readonly file: string; readonly line: number }) => string {
  const encode = (path: string) => path.split('/').map(encodeURIComponent).join('/');
  // owner/repo of `..` would climb out of the repo on the URL; there is no such repo, so no link.
  if (!safeName(ref.owner) || !safeName(ref.repo)) return () => 'https://github.com/';
  return ({ file, line }) => `https://github.com/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}/blob/${encode(safeRef(ref.ref))}/${encode(file)}#L${line}`;
}

/** Where a file (`blob`) or folder (`tree`) lives on GitHub at the ref; the repo's front page when owner or repo is unsafe. */
export function githubPathLink(ref: RepoRef, path: string, folder: boolean): string {
  if (!safeName(ref.owner) || !safeName(ref.repo)) return 'https://github.com/';
  const encode = (p: string) => p.split('/').map(encodeURIComponent).join('/');
  return `https://github.com/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}/${folder ? 'tree' : 'blob'}/${encode(safeRef(ref.ref))}/${encode(path)}`;
}

/** The files that define units first (discovery's own list); source files only add edges. */
const priority = (file: string): number => (definesUnit(file) ? 0 : 1);

const MAX_FILE_BYTES = 256 * 1024;
const MAX_TOTAL_BYTES = 8 * 1024 * 1024;

export interface FetchRepoOptions {
  readonly fetch?: typeof fetch;
  readonly maxFiles?: number;
  /** Which tree paths to read; the default is what architecture discovery reads. */
  readonly select?: (path: string) => boolean;
  /** Read order, lowest first; the default puts deploy manifests first. */
  readonly priority?: (path: string) => number;
  /** Called once with every selected path (before the size filter and the `maxFiles` cap), as soon as the tree is in. */
  readonly onTree?: (paths: readonly string[], treeSha?: string) => void | boolean | Promise<void | boolean>;
  /** The paths that will actually be fetched (after the size filter, the cap and the byte budget), in read order, and the readable ones the cap or budget left out. */
  readonly onChosen?: (paths: readonly string[], left: readonly string[]) => void;
  /** Each file as it arrives (completion order), so a caller can work while the rest download. */
  readonly onFile?: (file: ScannedFile) => void;
  /** A file that would not load, so a caller waiting on specific files knows they will never come. */
  readonly onFail?: (path: string) => void;
  /** Requests in flight; the default is 8. */
  readonly concurrency?: number;
  readonly onProgress?: (done: number, total: number) => void;
  /** Abort on unmount: the scan stops and rejects with the signal's reason. */
  readonly signal?: AbortSignal;
  /** Per-request timeout, reported as offline. */
  readonly timeoutMs?: number;
  /** A GitHub token: sent as a Bearer header to the API host only, never to raw file downloads. */
  readonly token?: string;
  /**
   * Resolve the ref to its commit first (one more API call) and read the tree and files at it, so links saved from
   * this read never drift. A commit that will not resolve reads at the ref; the tree call names any problem.
   */
  readonly pinCommit?: boolean;
  /** Where the two reads go. Exists so a test can fetch a real closed port (AGENTS rule 6). */
  readonly hosts?: { readonly api: string; readonly raw: string };
}

export async function fetchRepoFiles(ref: RepoRef, options: FetchRepoOptions = {}): Promise<RepoFiles> {
  const get = options.fetch ?? fetch;
  const { signal } = options;
  const hosts = options.hosts ?? { api: 'https://api.github.com', raw: 'https://raw.githubusercontent.com' };
  const token = options.token?.trim() || null;
  const call = async (url: string, init: RequestInit = {}): Promise<Response> => {
    // Raw downloads are not counted against the API limit, so the token never leaves for them.
    const headers = token && url.startsWith(`${hosts.api}/`) ? { ...init.headers, Authorization: `Bearer ${token}` } : init.headers;
    try {
      const timeout = AbortSignal.timeout(options.timeoutMs ?? 20_000);
      // ponytail: AbortSignal.any is Safari 17.4+/Chrome 116+; older browsers keep the caller's signal and lose the timeout.
      const combined = !signal ? timeout : typeof AbortSignal.any === 'function' ? AbortSignal.any([signal, timeout]) : signal;
      return await get(url, { ...init, ...(headers ? { headers } : {}), signal: combined });
    } catch (error) {
      if (signal?.aborted) throw signal.reason ?? error;
      throw new RepoError({ kind: 'offline' }, 'GitHub could not be reached. Check your connection and try again.');
    }
  };
  const repoPath = `${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}`;
  const commit = !options.pinCommit ? undefined : SHA.test(ref.ref) ? ref.ref
    : await resolveCommit(call, `${hosts.api}/repos/${repoPath}/commits/${encodeURIComponent(safeRef(ref.ref))}`);
  const at = commit ?? safeRef(ref.ref);
  const treeResponse = await call(`${hosts.api}/repos/${repoPath}/git/trees/${encodeURIComponent(at)}?recursive=1`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!treeResponse.ok) throw await treeError(treeResponse, ref, token !== null);
  const tree = await treeResponse.json() as { sha?: string; tree?: readonly { path: string; type: string; size?: number }[]; truncated?: boolean };
  const selected = (tree.tree ?? [])
    .filter((entry) => entry.type === 'blob' && entry.path.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..') && (options.select ?? acceptsArchitectureFile)(entry.path));
  // Listed before the size filter: a file too big to read is still a file the caller may want to show.
  // `false` from onTree means "stop here" (a cache hit): nothing is fetched and the result is empty.
  if ((await options.onTree?.(selected.map((entry) => entry.path), tree.sha)) === false) {
    return { files: [], wanted: selected.length, truncated: tree.truncated === true, failed: 0, unread: 0, skipped: 0, ...(commit ? { commit } : {}) };
  }
  const rank = options.priority ?? priority;
  const wanted = selected.filter((entry) => (entry.size ?? 0) <= MAX_FILE_BYTES).sort((a, b) => rank(a.path) - rank(b.path) || a.path.localeCompare(b.path));
  const capped = wanted.slice(0, options.maxFiles ?? 400);
  // The byte budget is spent on the listed sizes, manifests first, before any file is fetched.
  let bytes = 0;
  const chosen = capped.filter((entry) => (bytes += entry.size ?? 0) <= MAX_TOTAL_BYTES).map((entry) => entry.path);
  options.onChosen?.(chosen, wanted.slice(chosen.length).map((entry) => entry.path));
  const refPath = at.split('/').map(encodeURIComponent).join('/');

  const files: ScannedFile[] = [];
  let done = 0;
  let next = 0;
  let failed = 0;
  let notFound = 0;
  let lastFailure: RepoError | null = null;
  let stopped: unknown = null;
  const worker = async () => {
    while (next < chosen.length && stopped === null) {
      const path = chosen[next++]!;
      let received: ScannedFile | null = null;
      try {
        const response = await call(`${hosts.raw}/${repoPath}/${refPath}/${path.split('/').map(encodeURIComponent).join('/')}`);
        if (response.ok) {
          received = { path, content: await response.text() };
          files.push(received);
        } else {
          options.onFail?.(path);
          // A file that vanished or won't load is counted: discovery works on what it can read.
          failed++;
          if (response.status === 404) notFound++;
          lastFailure = rateLimit(response, 'raw') ?? new RepoError({ kind: 'http', status: response.status }, `GitHub answered ${response.status}. Try again in a minute.`);
        }
      } catch (error) {
        // The network is gone or the caller left: nothing more to fetch. Anything else costs one file.
        if (signal?.aborted || (error instanceof RepoError && error.problem.kind === 'offline')) stopped = error;
        else {
          failed++;
          options.onFail?.(path);
          lastFailure = error instanceof RepoError ? error : new RepoError({ kind: 'http', status: 0 }, 'A file could not be read. Try again in a minute.');
        }
      }
      // Outside the fetch try: a caller's own error stops the run instead of being miscounted as a failed file.
      if (received) {
        try { options.onFile?.(received); } catch (error) { stopped ??= error; }
      }
      done++;
      if (stopped === null) options.onProgress?.(done, chosen.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(options.concurrency ?? 8, chosen.length) }, worker));
  if (stopped !== null) throw stopped;
  // Pinned, the token must also have resolved the commit: then the repo is surely there and only the downloads are refused.
  if (token && (!options.pinCommit || commit) && notFound * 2 > chosen.length) {
    throw new RepoError({ kind: 'private' }, `${ref.owner}/${ref.repo} looks private: the token lists its files, but the browser downloads files without it.`);
  }
  if (failed * 2 > chosen.length && lastFailure) throw lastFailure;
  return {
    files: files.sort((a, b) => a.path.localeCompare(b.path)),
    wanted: wanted.length, truncated: tree.truncated === true, failed, unread: wanted.length - capped.length, skipped: capped.length - chosen.length,
    ...(commit ? { commit } : {}),
  };
}

const SHA = /^[0-9a-f]{40}$/;

/** The commit a ref names, or undefined: the tree call that follows says what is wrong. Offline and the caller's abort throw. */
async function resolveCommit(call: (url: string, init?: RequestInit) => Promise<Response>, url: string): Promise<string | undefined> {
  const response = await call(url, { headers: { Accept: 'application/vnd.github.sha' } });
  const sha = response.ok ? (await response.text().catch(() => '')).trim() : '';
  return SHA.test(sha) ? sha : undefined;
}

/**
 * The hourly limit (no calls left: `x-ratelimit-remaining: 0`), else a pause GitHub asked for: a 429, a 403 with
 * `retry-after` (a secondary limit) or any raw-download limit. A token helps the first only.
 */
function rateLimit(response: Response, source: 'api' | 'raw' = 'api', hadToken = false): RepoError | null {
  if (response.status !== 403 && response.status !== 429) return null;
  const spent = source === 'api' && response.headers.get('x-ratelimit-remaining') === '0';
  if (response.status === 403 && !spent && !response.headers.has('retry-after')) return null;
  if (!spent) {
    const seconds = Number(response.headers.get('retry-after'));
    const retryAfter = response.headers.has('retry-after') && Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : null;
    const wait = retryAfter === null ? 'a minute' : retryAfter < 120 ? `${retryAfter} seconds` : `${Math.ceil(retryAfter / 60)} minutes`;
    const who = source === 'raw' ? 'GitHub is limiting file downloads from your network right now.' : 'GitHub asked for a pause between reads.';
    return new RepoError({ kind: 'slow-down', retryAfter }, `${who} Wait ${wait} and try again.`);
  }
  const reset = Number(response.headers.get('x-ratelimit-reset'));
  const resetAt = Number.isFinite(reset) && reset > 0 ? new Date(reset * 1000) : null;
  const when = resetAt ? ` It resets at ${resetAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.` : '';
  if (hadToken) return new RepoError({ kind: 'rate-limited', resetAt }, `That token's GitHub limit (5,000 reads an hour) was reached.${when}`);
  return new RepoError({ kind: 'rate-limited', resetAt }, `GitHub's hourly limit for reads from your network is used up.${when}`);
}

async function treeError(response: Response, ref: RepoRef, hadToken: boolean): Promise<RepoError> {
  if (response.status === 401 && hadToken) return new RepoError({ kind: 'token-rejected' }, 'GitHub rejected that token. It may be expired or mistyped; it has been cleared.');
  const limited = rateLimit(response, 'api', hadToken);
  if (limited) return limited;
  // GitHub answers 404 alike for a private repo, a missing one and a wrong branch.
  if (response.status === 404 || response.status === 422) {
    return new RepoError({ kind: 'not-found' }, `${ref.owner}/${ref.repo}${ref.ref === 'HEAD' ? '' : ` (${ref.ref})`} wasn't found.`);
  }
  if (response.status === 409) return new RepoError({ kind: 'empty' }, `${ref.owner}/${ref.repo} is empty.`);
  return new RepoError({ kind: 'http', status: response.status }, `GitHub answered ${response.status}. Try again in a minute.`);
}
