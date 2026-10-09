import type { Depth } from '../../../../dsl/map/types';

// The depth preset a reader last chose for a repo, kept in this browser only.
const key = (storageKey: string): string => `ofk.map.depth.${storageKey}`;

export function savedDepth(storageKey: string): Depth | null {
  try {
    const v = localStorage.getItem(key(storageKey));
    return v === 'overview' || v === 'detailed' || v === 'everything' ? v : null;
  } catch { return null; }
}

/** Whether the reader asked for every arrow, including the minor ones the map leaves out by default. */
export function savedAllLinks(storageKey: string): boolean {
  try { return localStorage.getItem(`ofk.map.links.${storageKey}`) === 'all'; } catch { return false; }
}

export function saveAllLinks(storageKey: string, all: boolean): void {
  try { if (all) localStorage.setItem(`ofk.map.links.${storageKey}`, 'all'); else localStorage.removeItem(`ofk.map.links.${storageKey}`); } catch { /* storage blocked */ }
}

export function saveDepth(storageKey: string, depth: Depth): void {
  try { localStorage.setItem(key(storageKey), depth); } catch { /* storage blocked: the choice lasts this visit */ }
}

// The boxes a reader left open on a Map-mode page, kept in this browser only (never in the document or undo).
const openKey = (documentId: string, pageId: string): string => `ofk.map-open:${documentId}:${pageId}`;
const MAX_OPEN_IDS = 2000;

/** The saved open ids, or null when nothing usable is stored (missing, garbled, blocked storage). Unknown ids are pruned by the caller. */
export function savedOpen(documentId: string, pageId: string): ReadonlySet<string> | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(openKey(documentId, pageId)) ?? 'null');
    return Array.isArray(parsed) && parsed.length <= MAX_OPEN_IDS && parsed.every((id) => typeof id === 'string') ? new Set(parsed) : null;
  } catch { return null; }
}

export function saveOpen(documentId: string, pageId: string, open: ReadonlySet<string>): void {
  if (open.size > MAX_OPEN_IDS) return;
  try { localStorage.setItem(openKey(documentId, pageId), JSON.stringify([...open].sort())); } catch { /* storage blocked or full: the choice lasts this visit */ }
}
