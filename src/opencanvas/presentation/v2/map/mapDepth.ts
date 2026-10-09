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
