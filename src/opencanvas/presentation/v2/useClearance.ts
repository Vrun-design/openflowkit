import { useEffect, useRef, type RefObject } from 'react';
import type { LaidRect } from '../../../dsl/map/elk';
import type { CanvasCamera } from '../../domain/camera/types';
import type { PixiRendererHost } from '../../infrastructure/pixi/PixiRendererHost';
import { clearance, clearOfPanel, nudgeInto, type FreeArea } from './map/mapMode';

interface Options {
  /** Map mode: the selected box also keeps clear when the selection changes. */
  readonly active: boolean;
  readonly selectedId: string | null;
  /** Which panels are open, as one string: any panel opening, closing or swapping changes it. */
  readonly panelsKey: string;
  /** Canvas mode: the selected nodes right now. */
  readonly selectedIds: () => readonly string[];
  readonly shown: RefObject<{ rects: Map<string, LaidRect> } | null>;
  readonly hostRef: RefObject<PixiRendererHost | null>;
  readonly cameraRef: RefObject<CanvasCamera>;
  /** The editor's interruptible camera glide (instant under reduced motion). */
  readonly glide: (camera: CanvasCamera) => void;
  /** A layout or move is on its way: its own landing frames the camera, so this stays out of its way. */
  readonly busy: () => boolean;
}

/**
 * Opening a panel never hides what you were looking at. Map: the selected box stays clear of the chrome when the selection
 * changes or a panel opens. Canvas: when a panel opens, the selection (else the content that was fully visible and still fits)
 * pans the least it takes; zoom is kept, plain selection changes and closing a panel never move the camera. The glide stops at
 * the reader's first touch, and nothing re-pans until the panels change again, so a pan the reader makes afterwards stays.
 */
export function useClearance({ active, selectedId, panelsKey, selectedIds, shown, hostRef, cameraRef, glide, busy }: Options): void {
  // The free area as the last panels left it: what was visible before the panels changed.
  const before = useRef<{ key: string; free: FreeArea; seen: FreeArea } | null>(null);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const free = clearance(host);
    const previous = before.current;
    before.current = { key: panelsKey, free, seen: clearance(host, false) };
    if (busy()) return;
    if (active) {
      const rect = selectedId ? shown.current?.rects.get(selectedId) : undefined;
      const next = rect && nudgeInto(rect, cameraRef.current, free);
      if (next) glide(next);
      return;
    }
    if (!previous || previous.key === panelsKey) return;
    const ids = selectedIds();
    const next = clearOfPanel({
      selection: ids.length ? host.getContentBounds(ids) : null,
      content: ids.length ? null : host.getContentBounds(),
      cam: cameraRef.current, before: previous.free, seen: previous.seen, after: free,
    });
    if (next) glide(next);
    // The camera, glide and busy are read when the selection or the panels change, never as triggers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, selectedId, panelsKey]);
}
