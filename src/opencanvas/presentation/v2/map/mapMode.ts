import { isInside, pathTo } from '../../../../dsl/map/tree';
import type { MapModel } from '../../../../dsl/map/types';
import { visible } from '../../../../dsl/map/view';
import { MAP_BOX_BUDGET } from '../../../application/map/mapNavigation';
import { canOpen } from '../../../application/map/navigate';
import { keepInView, landing, type Cam, type Rect, type Viewport } from '../../../application/map/geometry';
import type { CanvasCamera } from '../../../domain/camera/types';
import type { ScenePage } from '../../../domain/document/types';
import type { Bounds2d } from '../../../domain/geometry/types';
import { visibleCanvasEdges } from '../V2ContextBar';

// The rules of Map mode in the editor: what a click opens, what Escape closes, which keys still act, where the
// camera lands. The hook (useV2MapMode) holds the state and the async layout; nothing here touches React or Pixi
// (`clearance` alone reads the DOM, to measure the chrome).

/**
 * A click on a box: a shut box with children opens; an open one closes along with everything inside it.
 * Nothing to do (a leaf) returns `open` itself, so the caller can tell "no change" by identity and skip the relayout.
 */
export function toggleBox(model: MapModel, open: ReadonlySet<string>, id: string): ReadonlySet<string> {
  if (open.has(id)) return new Set([...open].filter((at) => !isInside(model, at, id)));
  return canOpen(model, id) ? new Set(open).add(id) : open;
}

// Past the budget the scene is too heavy to lay out and draw at once.
export const BUDGET_NOTE = 'That opens too many boxes at once. Open a smaller part first.';

/** Whether opening to `open` stays within the box budget. */
export const fitsBudget = (model: MapModel, open: ReadonlySet<string>): boolean => visible(model, open).length <= MAP_BOX_BUDGET;

// A second click on a box inside this window is the second half of a double-click: it must not undo the first flip.
// ponytail: fixed 400 ms — a slower double-click flips again; read the OS double-click interval if it matters.
export const DOUBLE_CLICK_MS = 400;
export const isDoubleClick = (lastFlipAt: number, now: number): boolean => now - lastFlipAt < DOUBLE_CLICK_MS;

/**
 * The scene built for one model; it may be shown only while that model is still the page's. `lineage` (the page it was
 * built for) also keeps it up through an edit, which makes a new model: the map then moves to the edited layout instead
 * of blanking while it is laid out. Another page's model never matches.
 */
export interface TaggedScene<M> { readonly model: M; readonly page: ScenePage; readonly lineage?: string; /** Which run of related maps it belongs to (an edit continues a run; another page's model starts one). */ readonly chain?: number }
export const sceneFor = <M>(tagged: TaggedScene<M> | null, model: M | null, empty: ScenePage, lineage?: string): ScenePage =>
  tagged && model !== null && (tagged.model === model || (lineage !== undefined && tagged.lineage === lineage)) ? tagged.page : empty;

/** Escape on a selected box closes the open box around it (never the root); null means there is nothing to close. */
export function parentToClose(model: MapModel, open: ReadonlySet<string>, selectedId: string): string | null {
  const parent = model.nodes[selectedId]?.parent;
  return parent && parent !== model.root && open.has(parent) ? parent : null;
}

/** The open set a map starts from: what this browser remembers when it still fits the budget (a model that grew may not), else the preset. */
export const startOpen = (model: MapModel, stored: ReadonlySet<string> | null, preset: ReadonlySet<string>): ReadonlySet<string> => {
  const kept = stored ? prune(model, stored) : null;
  return kept && fitsBudget(model, kept) ? kept : preset;
};

/** Only ids that are still boxes of the model: an edit may remove an element the reader had open. */
export const prune = (model: MapModel, open: ReadonlySet<string>): Set<string> =>
  new Set([...open].filter((id) => canOpen(model, id)));

interface KeyLike { key: string; code: string; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }

/**
 * Map mode is read-only for the drawing, so only the keys that look, zoom, switch panels or undo reach the editor's
 * shortcuts. Everything else (delete, duplicate, paste, nudge, tools, typing a label) is swallowed rather than gated
 * one by one: a new shortcut cannot start editing the Canvas page behind the map by being forgotten here.
 */
export function mapKeyAllowed(e: KeyLike): boolean {
  const command = e.metaKey || e.ctrlKey;
  const key = e.key.toLowerCase();
  if (e.key === ' ') return true;
  if (command) return !e.altKey && ['z', 'y', 'f', 'j', '0', '1', '=', '+', '-'].includes(key);
  if (e.altKey) return !e.shiftKey && ['KeyD', 'KeyM', 'KeyI'].includes(e.code);
  if (e.shiftKey) return e.code === 'Digit1' || e.code === 'Digit2';
  return ['v', 'h', 'l', 'm'].includes(key);
}

/** Whether `box` (scene space) is on screen at `cam` inside `free`: a box bigger than the free area counts once its top-left is. */
export function inView(box: Rect, cam: CanvasCamera, free: FreeArea): boolean {
  const axis = (at: number, size: number, lo: number, hi: number) => at >= lo && (at + size <= hi || size > hi - lo);
  return axis(box.x * cam.zoom + cam.x, box.width * cam.zoom, free.left, free.left + free.width)
    && axis(box.y * cam.zoom + cam.y, box.height * cam.zoom, free.top, free.top + free.height);
}

/** The top-level boxes' union: the map's absolute extent (children sit inside their parent). */
export function sceneExtent(page: ScenePage): Bounds2d | null {
  const top = page.nodes.filter((node) => node.parentId === null);
  if (top.length === 0) return null;
  const x0 = Math.min(...top.map((n) => n.transform.translation.x));
  const y0 = Math.min(...top.map((n) => n.transform.translation.y));
  const x1 = Math.max(...top.map((n) => n.transform.translation.x + n.size.width));
  const y1 = Math.max(...top.map((n) => n.transform.translation.y + n.size.height));
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

/** The nearest box around `id` (never the root) that is drawn; null when none is, so the selection should clear. */
export function nearestDrawn(model: MapModel, id: string, drawn: ReadonlySet<string>): string | null {
  const chain = pathTo(model, id).slice(1);
  if (chain.length === 0) return null;
  return chain.reverse().find((at) => drawn.has(at)) ?? null;
}

const PAD = 48;
/** Space kept between the free canvas and the chrome that floats over it. */
const CHROME_GAP = 8;

/** The part of the canvas the map may use, in canvas pixels. */
export interface FreeArea { left: number; top: number; width: number; height: number }

/**
 * The canvas the floating chrome leaves: `edges` are what the side panels leave (left, right), `chrome` where the
 * document bar ends (`top`), the right rail begins (`rail`), the camera controls begin (`bottom`) and the creation rail
 * ends (`tools`), all measured in
 * canvas pixels. A chrome so large it would leave under a third of the canvas (a phone) is ignored.
 */
export function freeArea(size: { width: number; height: number }, edges: { left: number; right: number }, chrome: { top?: number; rail?: number; bottom?: number; tools?: number }): FreeArea {
  const clear = edges.right - edges.left >= size.width / 2;
  const left = Math.max(clear ? edges.left : 0, chrome.tools === undefined ? 0 : chrome.tools + CHROME_GAP);
  const right = Math.min(clear ? edges.right : size.width, chrome.rail === undefined ? size.width : chrome.rail - CHROME_GAP);
  const top = chrome.top === undefined ? 0 : Math.max(0, chrome.top + CHROME_GAP);
  const bottom = chrome.bottom === undefined ? size.height : Math.min(size.height, chrome.bottom - CHROME_GAP);
  const area = { left, top, width: right - left, height: bottom - top };
  return area.width < size.width / 3 || area.height < size.height / 3 ? { left, top: 0, width: clear ? edges.right - left : size.width, height: size.height } : area;
}

/** The canvas the side panels and the floating chrome leave: the document bar, the right rail and the camera controls are measured now. */
export function clearance(host: { getViewportSize(): { width: number; height: number } }, withTools = true): FreeArea {
  const size = host.getViewportSize();
  const root = document.querySelector<HTMLElement>('.ofk-v2');
  const origin = document.querySelector<HTMLElement>('[data-testid="v2-canvas"]')?.getBoundingClientRect();
  const at = (label: string) => root?.querySelector<HTMLElement>(`[role="toolbar"][aria-label="${label}"]`)?.getBoundingClientRect();
  const [bar, rail, controls, tools] = [at('Document'), at('Workspace'), at('View'), at('Create')];
  const { left, right } = visibleCanvasEdges(root);
  const [ox, oy] = [origin?.left ?? 0, origin?.top ?? 0];
  return freeArea(size, { left, right: right - ox }, {
    ...(bar ? { top: bar.bottom - oy } : {}), ...(rail ? { rail: rail.left - ox } : {}), ...(controls ? { bottom: controls.top - oy } : {}),
    // The creation rail floats at the left (a left panel shifts it); hidden on a phone, where it has no width.
    ...(withTools && tools?.width ? { tools: tools.right - ox } : {}),
  });
}

/**
 * The camera that puts `box` (scene space) fully inside `free`, panning the least and keeping the zoom; a box larger than
 * `free` on an axis is aligned to its start there. Null when it already is inside.
 */
export function nudgeInto(box: Rect, cam: CanvasCamera, free: FreeArea): CanvasCamera | null {
  const axis = (at: number, size: number, lo: number, hi: number): number =>
    size > hi - lo ? lo - at : at < lo ? lo - at : at + size > hi ? hi - at - size : 0;
  const m = CHROME_GAP * 2;
  const dx = axis(box.x * cam.zoom + cam.x, box.width * cam.zoom, free.left + m, free.left + free.width - m);
  const dy = axis(box.y * cam.zoom + cam.y, box.height * cam.zoom, free.top + m, free.top + free.height - m);
  return Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 ? null : { zoom: cam.zoom, x: cam.x + dx, y: cam.y + dy };
}

/**
 * Canvas mode, a panel just opened (the free area shrank from `before` to `after`): the camera that keeps what you were
 * looking at clear of it, zoom kept. The selection if there is
 * one; else the content whose start was in view in `seen` (the canvas the panels left, before the tool rail), aligned to the free
 * area's start when it no longer fits. Null when nothing needs to move, and always null when the free area did not shrink
 * (closing never pans).
 */
export function clearOfPanel({ selection, content, cam, before, seen, after }: {
  selection?: Rect | null; content?: Rect | null; cam: CanvasCamera; before: FreeArea; seen: FreeArea; after: FreeArea;
}): CanvasCamera | null {
  const shrank = after.left > before.left + 0.5 || after.left + after.width < before.left + before.width - 0.5;
  if (!shrank) return null;
  if (selection) return nudgeInto(selection, cam, after);
  // Seen means its start was: a diagram a previous panel already pushed half under the next one counts too.
  const [x, y] = content ? [content.x * cam.zoom + cam.x, content.y * cam.zoom + cam.y] : [0, 0];
  const seenStart = x >= seen.left && x < seen.left + seen.width && y >= seen.top && y < seen.top + seen.height;
  return content && seenStart ? nudgeInto(content, cam, after) : null;
}

/**
 * The camera a map opens at: everything when that stays readable (READABLE), else the map's top-left corner at READABLE,
 * so the reader starts at a known place. `free` is the canvas the panels and floating chrome leave.
 */
export function mapCamera(extent: Bounds2d, free: FreeArea): CanvasCamera {
  return landOn(extent, undefined, free);
}

/**
 * Where the camera goes when `focus` (the box just opened or closed) changes the map. With a camera already at a readable
 * scale it stays there and pans only until the whole box is in `free` (zooming out, never in, when the box does not fit);
 * otherwise, never below READABLE: everything when it fits, else `focus` fitted, else its header and first row.
 */
export function landOn(extent: Bounds2d, focus: Rect | undefined, free: FreeArea, current?: CanvasCamera): CanvasCamera {
  const view: Viewport = { width: free.width, height: free.height, top: 0, bottom: 0, pad: PAD };
  const place = (cam: Cam): CanvasCamera => ({ zoom: cam.k, x: free.left + cam.x, y: free.top + cam.y });
  if (focus && current) {
    const kept = keepInView(focus, { k: current.zoom, x: current.x - free.left, y: current.y - free.top }, view);
    if (kept) return place(kept);
  }
  // `landing` frames a map that starts at the origin; shift the focus there and the result back.
  const cam = landing(extent, focus && { ...focus, x: focus.x - extent.x, y: focus.y - extent.y }, view);
  return place({ ...cam, x: cam.x - extent.x * cam.k, y: cam.y - extent.y * cam.k });
}
