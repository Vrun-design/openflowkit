import type { Placement } from '../design-system/Popover';

export type V2TipId = 'code' | 'connect' | 'assistant' | 'motion' | 'mermaid';

export interface V2TipCopy {
  readonly title: string;
  readonly text: string;
  /** The control the tip points at. */
  readonly anchor: string;
  readonly placement: Placement;
  readonly action?: string;
}

const RAIL = '[role="toolbar"][aria-label="Workspace"]';
export const V2_TIPS: Readonly<Record<V2TipId, V2TipCopy>> = {
  code: { title: 'Draw it from text', text: 'A few lines in Diagram as code lay out a whole diagram — and stay editable.',
    anchor: `${RAIL} button[aria-label="Diagram as code"]`, placement: 'left-start', action: 'Open Diagram as code' },
  connect: { title: 'Connect them', text: 'Press A, then drag from one shape to the other.',
    anchor: '[role="toolbar"][aria-label="Create"] button[aria-label^="Connector"]', placement: 'right-start' },
  assistant: { title: 'Ask for changes in plain words', text: 'Bring your own key: the assistant drafts the edit, you review it.',
    anchor: `${RAIL} button[aria-label="AI assistant"]`, placement: 'left-start', action: 'Open the assistant' },
  motion: { title: 'Make it move', text: 'Export → Animate this page turns it into a GIF, MP4 or animated SVG.',
    anchor: 'button[aria-label="Canvas menu"]', placement: 'bottom-start', action: 'Animate this page' },
  mermaid: { title: 'That’s Mermaid', text: 'Diagram as code reads it and draws it.',
    anchor: `${RAIL} button[aria-label="Diagram as code"]`, placement: 'left-start', action: 'Draw it' },
};

/** A trigger must hold this long before its tip shows (a label editor opening a render later sweeps it). */
export const TIP_QUIET_MS = 700;

const SEEN_KEY = 'ofk.tips.seen';
const SESSION_KEY = 'ofk.tips.shown';

/** Per-viewer convenience: storage that throws (private mode, blocked) just means "show nothing twice this page". */
function read(storage: () => Storage, key: string): string | null {
  try { return storage().getItem(key); } catch { return null; }
}
function write(storage: () => Storage, key: string, value: string): void {
  try { storage().setItem(key, value); } catch { /* this page load still remembers */ }
}

let shownThisLoad = false;
const seenThisLoad = new Set<string>();

export function tipSeen(id: V2TipId): boolean {
  if (seenThisLoad.has(id)) return true;
  try { return (JSON.parse(read(() => localStorage, SEEN_KEY) ?? '[]') as unknown[]).includes(id); } catch { return false; }
}

/** Seen forever: shown once, or the feature was used first. */
export function markTipSeen(id: V2TipId): void {
  if (tipSeen(id)) return;
  seenThisLoad.add(id);
  let seen: unknown[] = [];
  try { seen = JSON.parse(read(() => localStorage, SEEN_KEY) ?? '[]') as unknown[]; } catch { /* start over */ }
  write(() => localStorage, SEEN_KEY, JSON.stringify([...(Array.isArray(seen) ? seen : []), id]));
}

/** At most one tip per session, each at most once ever. */
export function mayShowTip(id: V2TipId): boolean {
  return !shownThisLoad && read(() => sessionStorage, SESSION_KEY) === null && !tipSeen(id);
}

export function recordTipShown(id: V2TipId): void {
  shownThisLoad = true;
  write(() => sessionStorage, SESSION_KEY, id);
  markTipSeen(id);
}

/** Test seam: a fresh page load. */
export function resetTipsForTest(): void {
  shownThisLoad = false;
  seenThisLoad.clear();
}
