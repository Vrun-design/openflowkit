import { useCallback, useMemo, type RefObject } from 'react';
import type { LaidRect } from '../../../../dsl/map/elk';
import type { Depth, MapModel } from '../../../../dsl/map/types';
import { canExpandOne, collapseAll, depthOf, expandOneLevel, presetOpen, sameOpen, siblingMove } from '../../../application/map/mapNavigation';
import type { Dir } from '../../../application/map/navigate';
import type { CanvasCamera } from '../../../domain/camera/types';
import type { ScenePage } from '../../../domain/document/types';
import type { PixiRendererHost } from '../../../infrastructure/pixi/PixiRendererHost';
import { visible } from '../../../../dsl/map/view';
import { pathToReveal } from '../../../application/map/mapFind';
import { BUDGET_NOTE, clearance, fitsBudget, inView, landOn, nearestDrawn, sceneExtent } from './mapMode';

interface Options {
  readonly model: MapModel | null;
  readonly open: ReadonlySet<string>;
  readonly setOpen: (open: ReadonlySet<string>) => void;
  /** Where the camera goes when the new layout lands: `id: null` re-fits the whole map. */
  readonly focusRef: RefObject<{ id: string | null } | null>;
  readonly shown: RefObject<{ page: ScenePage; rects: Map<string, LaidRect> } | null>;
  readonly hostRef: RefObject<PixiRendererHost | null>;
  readonly cameraRef: RefObject<CanvasCamera>;
  readonly updateCamera: (camera: CanvasCamera) => void;
  readonly primaryId: () => string | null;
  readonly select: (id: string) => void;
  readonly clearSelection: () => void;
  /** The box to select once its layout lands (a reveal opens boxes first). */
  readonly pendingRef: RefObject<string | null>;
  readonly notify: (message: string) => void;
}

const DIRS: Readonly<Record<string, Dir>> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };

/** What the Map toolbar does (depth, one level, collapse) and where an arrow key goes. The open set stays view state. */
export function useMapControls({ model, open, setOpen, focusRef, shown, hostRef, cameraRef, updateCamera, primaryId, select, clearSelection, pendingRef, notify }: Options) {
  const depth = useMemo(() => (model ? depthOf(model, open) : null), [model, open]);
  const canExpand = useMemo(() => (model ? canExpandOne(model, open) : false), [model, open]);
  const change = useCallback((next: ReadonlySet<string>, fit: boolean) => {
    if (sameOpen(next, open)) return;
    focusRef.current = fit ? { id: null } : null;
    // A selected box that is about to leave the map (collapsed away) hands the selection to the box around it, now,
    // while that box is still drawn: the editor drops a selection whose box vanishes.
    const id = primaryId();
    if (model && id && !visible(model, next).includes(id)) {
      const around = nearestDrawn(model, id, new Set(visible(model, next)));
      if (around) select(around); else clearSelection();
    }
    setOpen(next);
  }, [model, open, setOpen, focusRef, primaryId, select, clearSelection]);
  const setDepth = useCallback((value: Depth) => { if (model) change(presetOpen(model, value), true); }, [model, change]);
  // A level that would pass the budget leaves the set as it was: say why instead of doing nothing.
  const expandOne = useCallback(() => {
    if (!model) return;
    const next = expandOneLevel(model, open);
    if (sameOpen(next, open)) notify(BUDGET_NOTE); else change(next, false);
  }, [model, open, change, notify]);
  const collapse = useCallback(() => change(collapseAll(), false), [change]);

  /** The camera follows a drawn box only when it is off screen. */
  const follow = useCallback((id: string) => {
    const view = shown.current;
    const host = hostRef.current;
    const rect = view?.rects.get(id);
    const extent = view && sceneExtent(view.page);
    if (!host || !rect || !extent) return;
    const free = clearance(host);
    if (!inView(rect, cameraRef.current, free)) updateCamera(landOn(extent, rect, free, cameraRef.current));
  }, [shown, hostRef, cameraRef, updateCamera]);

  /** An arrow key: selects the box it points at (the first one when nothing is selected). True when the key is spent. */
  const arrow = useCallback((key: string): boolean => {
    const dir = DIRS[key];
    const view = shown.current;
    if (!dir || !model || !view) return false;
    const picked = primaryId();
    const from = picked && view.rects.has(picked) ? picked : null;
    const target = from
      ? siblingMove(model, open, from, dir, view.rects)
      : model.nodes[model.root].children.filter((id) => view.rects.has(id))
        .sort((a, b) => view.rects.get(a)!.y - view.rects.get(b)!.y || view.rects.get(a)!.x - view.rects.get(b)!.x)[0] ?? null;
    if (!target) return true;
    select(target);
    follow(target);
    return true;
  }, [model, open, shown, primaryId, select, follow]);

  /**
   * Find and the overview: open what hides `id` (keeping what is open), then select it and bring it into view.
   * False when the budget refuses. The boxes it opens are remembered like any others: what you last saw is what you get back.
   */
  const reveal = useCallback((id: string): boolean => {
    if (!model || !model.nodes[id]) return false;
    const next = new Set([...open, ...pathToReveal(model, id)]);
    if (sameOpen(next, open) && shown.current?.rects.has(id)) { pendingRef.current = null; select(id); follow(id); return true; }
    if (!sameOpen(next, open) && !fitsBudget(model, next)) { notify(BUDGET_NOTE); return false; }
    // The box is not drawn until its layout lands (a layout may still be on its way from an earlier reveal): the latest id wins.
    focusRef.current = { id };
    pendingRef.current = id;
    if (!sameOpen(next, open)) setOpen(next);
    return true;
  }, [shown, model, open, setOpen, focusRef, pendingRef, select, follow, notify]);

  return { depth, canExpand, setDepth, expandOne, collapse, arrow, reveal };
}
