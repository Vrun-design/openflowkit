import { parseRepoPath } from '../../../services/discovery/githubRepo';
import type { SceneDocumentV1 } from '../../domain/document/types';

/** Where a repo-map document reads its facts from. Only the address is stored: facts are re-read (cache hit when unchanged). */
export interface RepoMapSource {
  readonly owner: string;
  readonly repo: string;
  /** Branch, tag or commit; absent means the default branch. */
  readonly ref?: string;
  /** A commit sha, when one is known (never the tree sha: that 404s in blob links). */
  readonly sha?: string;
}

const MAX = { owner: 39, repo: 100, ref: 255 };

/**
 * Stored metadata and router state are untrusted: an address is only valid when it survives a round trip through
 * the same parser the URL goes through (which refuses `.`/`..` and odd characters), at sane lengths.
 */
export function isRepoMapAddress(a: { readonly owner?: unknown; readonly repo?: unknown; readonly ref?: unknown }): a is { owner: string; repo: string; ref?: string } {
  const { owner, repo, ref } = a;
  if (typeof owner !== 'string' || typeof repo !== 'string') return false;
  const name = ref === undefined ? 'HEAD' : ref;
  if (typeof name !== 'string' || name === '' || owner.length > MAX.owner || repo.length > MAX.repo || name.length > MAX.ref) return false;
  const parsed = parseRepoPath(`${owner}/${repo}${name !== 'HEAD' ? `/tree/${encodeURIComponent(name)}` : ''}`);
  return parsed !== null && parsed.owner === owner && parsed.repo === repo && parsed.ref === name;
}

export function repoMapSourceOf(document: SceneDocumentV1): RepoMapSource | null {
  const map = document.metadata['map'];
  if (typeof map !== 'object' || map === null || Array.isArray(map)) return null;
  const source = (map as { source?: unknown }).source;
  if (typeof source !== 'object' || source === null) return null;
  const { owner, repo, ref, sha } = source as Record<string, unknown>;
  if (!isRepoMapAddress({ owner, repo, ref })) return null;
  return { owner: owner as string, repo: repo as string, ...(ref ? { ref: ref as string } : {}), ...(typeof sha === 'string' && /^[0-9a-f]{40}$/.test(sha) ? { sha } : {}) };
}

/**
 * The page that is the repo's own map, as recorded when the document was made (null for a document saved before that:
 * the caller falls back to its first page). Document metadata is no command's target, so nothing in the editor can forge it.
 */
export function repoMapPageOf(document: SceneDocumentV1): string | null {
  const map = document.metadata['map'];
  if (typeof map !== 'object' || map === null || Array.isArray(map)) return null;
  const page = (map as { page?: unknown }).page;
  return typeof page === 'string' && page !== '' && page.length <= 200 ? page : null;
}

/** The document with its source and its map page recorded. Not an undo step: the editor applies it when it creates the document. */
export function withRepoMapSource(document: SceneDocumentV1, source: RepoMapSource): SceneDocumentV1 {
  const { owner, repo, ref, sha } = source;
  const page = document.pages[0]?.id;
  return { ...document, metadata: { ...document.metadata, map: { source: { owner, repo, ...(ref ? { ref } : {}), ...(sha ? { sha } : {}) }, ...(page ? { page } : {}) } } };
}

/**
 * The same repo always opens the same document: bookmarks and revisits do not pile up copies. Ids are free-form keys.
 * `_` cannot appear in an owner and `@` cannot appear in a repo, so no two addresses share an id (`a-b/c` vs `a/b-c`).
 */
export function repoMapDocumentId({ owner, repo, ref }: RepoMapSource): string {
  const id = `map-${owner}_${repo}`;
  if (!ref || ref === 'HEAD') return id;
  let h = 0x811c9dc5; // FNV-1a over the ref: it may hold characters an id should not
  for (let i = 0; i < ref.length; i++) h = Math.imul(h ^ ref.charCodeAt(i), 0x01000193);
  return `${id}@${(h >>> 0).toString(36)}`;
}

export const sameRepoMapAddress = (a: RepoMapSource, b: RepoMapSource): boolean =>
  a.owner === b.owner && a.repo === b.repo && (a.ref ?? 'HEAD') === (b.ref ?? 'HEAD');
