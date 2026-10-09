import { useEffect, type RefObject } from 'react';
import type { LaidRect } from '../../../../dsl/map/elk';
import type { CanvasCamera } from '../../../domain/camera/types';
import type { PixiRendererHost } from '../../../infrastructure/pixi/PixiRendererHost';
import { clearance, nudgeInto } from './mapMode';

interface Options {
  readonly active: boolean;
  readonly selectedId: string | null;
  /** A right panel is open: it covers part of the canvas, which `clearance` measures. */
  readonly panelOpen: boolean;
  readonly shown: RefObject<{ rects: Map<string, LaidRect> } | null>;
  readonly hostRef: RefObject<PixiRendererHost | null>;
  readonly cameraRef: RefObject<CanvasCamera>;
  /** The editor's interruptible camera glide (instant under reduced motion). */
  readonly glide: (camera: CanvasCamera) => void;
  /** A layout or move is on its way: its own landing frames the camera, so this stays out of its way. */
  readonly busy: () => boolean;
}

/**
 * The selected box stays clear of the chrome (rail, panel, bars): when the selection changes or a panel opens and the box
 * is not fully inside the free area, the camera pans the least it takes (zoom kept). The glide stops at the reader's first touch,
 * and nothing re-pans until the selection or the panel changes again, so a pan the reader makes afterwards stays.
 */
export function useMapClearance({ active, selectedId, panelOpen, shown, hostRef, cameraRef, glide, busy }: Options): void {
  useEffect(() => {
    const host = hostRef.current;
    const rect = selectedId ? shown.current?.rects.get(selectedId) : undefined;
    if (!active || !host || !rect || busy()) return;
    const next = nudgeInto(rect, cameraRef.current, clearance(host));
    if (next) glide(next);
    // The camera, glide and busy are read when the selection or the panel changes, never as triggers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, selectedId, panelOpen]);
}
