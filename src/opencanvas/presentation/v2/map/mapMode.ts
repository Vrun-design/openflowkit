import { isInside } from '../../../../dsl/map/tree';
import type { MapModel } from '../../../../dsl/map/types';
import { visible } from '../../../../dsl/map/view';
import { canOpen } from '../../../application/map/navigate';
import { frameBox, READABLE, type Viewport } from '../../../application/map/geometry';
import type { CanvasCamera } from '../../../domain/camera/types';
import type { ScenePage } from '../../../domain/document/types';
import type { Bounds2d } from '../../../domain/geometry/types';

// The pure rules of Map mode in the editor: what a click opens, what Escape closes, which keys still act, where the
// camera lands. The hook (useV2MapMode) holds the state and the async layout; nothing here touches React or Pixi.

/**
 * A click on a box: a shut box with children opens; an open one closes along with everything inside it.
 * Nothing to do (a leaf) returns `open` itself, so the caller can tell "no change" by identity and skip the relayout.
 */
export function toggleBox(model: MapModel, open: ReadonlySet<string>, id: string): ReadonlySet<string> {
  if (open.has(id)) return new Set([...open].filter((at) => !isInside(model, at, id)));
  return canOpen(model, id) ? new Set(open).add(id) : open;
}

// The SVG map's budget (MapSurface): 300 boxes x 1.4. Past it the scene is too heavy to lay out and draw at once.
export const BOX_BUDGET = 420;
export const BUDGET_NOTE = 'That opens too many boxes at once. Open a smaller part first.';

/** Whether opening to `open` stays within the box budget. */
export const fitsBudget = (model: MapModel, open: ReadonlySet<string>): boolean => visible(model, open).length <= BOX_BUDGET;

// A second click on a box inside this window is the second half of a double-click: it must not undo the first flip.
// ponytail: fixed 400 ms — a slower double-click flips again; read the OS double-click interval if it matters.
export const DOUBLE_CLICK_MS = 400;
export const isDoubleClick = (lastFlipAt: number, now: number): boolean => now - lastFlipAt < DOUBLE_CLICK_MS;

/** The scene built for one model; it may be shown only while that model is still the page's. */
export interface TaggedScene<M> { readonly model: M; readonly page: ScenePage }
export const sceneFor = <M>(tagged: TaggedScene<M> | null, model: M | null, empty: ScenePage): ScenePage =>
  tagged && model !== null && tagged.model === model ? tagged.page : empty;

/** Escape on a selected box closes the open box around it (never the root); null means there is nothing to close. */
export function parentToClose(model: MapModel, open: ReadonlySet<string>, selectedId: string): string | null {
  const parent = model.nodes[selectedId]?.parent;
  return parent && parent !== model.root && open.has(parent) ? parent : null;
}

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

/**
 * The camera a map opens at: everything when that stays readable (scale 0.6), else the map's top-left corner at 0.6,
 * so the reader starts at a known place. `free` is the canvas the side panels leave.
 */
export function mapCamera(extent: Bounds2d, free: { left: number; width: number; height: number }): CanvasCamera {
  const view: Viewport = { width: free.width, height: free.height, top: 56, bottom: 72, pad: 48 };
  const all = frameBox(extent, view);
  const cam = all.k >= READABLE ? all
    : { k: READABLE, x: view.pad - extent.x * READABLE, y: view.top + view.pad - extent.y * READABLE };
  return { zoom: cam.k, x: free.left + cam.x, y: cam.y };
}
