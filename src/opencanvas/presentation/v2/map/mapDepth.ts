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

// Canvas or Map, as the reader last chose it for a document: this browser only, never the document or undo.
const modeKey = (documentId: string): string => `ofk.map-mode:${documentId}`;

// A saved 'map' stays dormant while the document has no model (Map is not available there); it applies once one exists.
export function savedMode(documentId: string): 'canvas' | 'map' | null {
  try {
    const v = localStorage.getItem(modeKey(documentId));
    return v === 'canvas' || v === 'map' ? v : null;
  } catch { return null; }
}

export function saveMode(documentId: string, mode: 'canvas' | 'map'): void {
  try { localStorage.setItem(modeKey(documentId), mode); } catch { /* storage blocked: the choice lasts this visit */ }
}

const seenKey = (documentId: string): string => `ofk.map-seen:${documentId}`;

/** True the first time a document's map is entered in this browser (then never again): its overview opens once. */
export function firstMapVisit(documentId: string): boolean {
  try {
    if (localStorage.getItem(seenKey(documentId)) !== null) return false;
    localStorage.setItem(seenKey(documentId), '1');
    return true;
  } catch { return false; }
}

/** A deleted document leaves no choice behind: neither its mode, its first visit nor any page's open boxes. */
export function forgetMapMode(documentId: string): void {
  try {
    localStorage.removeItem(modeKey(documentId));
    localStorage.removeItem(seenKey(documentId));
    const pages = openKey(documentId, '');
    const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i));
    for (const key of keys) if (key?.startsWith(pages)) localStorage.removeItem(key);
  } catch { /* storage blocked */ }
}
