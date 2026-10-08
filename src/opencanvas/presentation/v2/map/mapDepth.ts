import type { Depth } from '../../../../dsl/map/types';
import type { RepoRef } from '../../../../services/discovery/githubRepo';

// The depth preset a reader last chose for a repo, kept in this browser only.
const key = (repo: RepoRef): string => `ofk.map.depth.${repo.owner}/${repo.repo}`;

export function savedDepth(repo: RepoRef): Depth | null {
  try {
    const v = localStorage.getItem(key(repo));
    return v === 'overview' || v === 'detailed' || v === 'everything' ? v : null;
  } catch { return null; }
}

export function saveDepth(repo: RepoRef, depth: Depth): void {
  try { localStorage.setItem(key(repo), depth); } catch { /* storage blocked: the choice lasts this visit */ }
}
