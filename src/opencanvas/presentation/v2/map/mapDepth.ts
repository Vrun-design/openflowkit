import type { Depth } from '../../../../dsl/map/types';

// The depth preset a reader last chose for a repo, kept in this browser only.
const key = (storageKey: string): string => `ofk.map.depth.${storageKey}`;

export function savedDepth(storageKey: string): Depth | null {
  try {
    const v = localStorage.getItem(key(storageKey));
    return v === 'overview' || v === 'detailed' || v === 'everything' ? v : null;
  } catch { return null; }
}

export function saveDepth(storageKey: string, depth: Depth): void {
  try { localStorage.setItem(key(storageKey), depth); } catch { /* storage blocked: the choice lasts this visit */ }
}
