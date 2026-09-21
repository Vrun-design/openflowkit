import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  fitCameraToBounds,
  zoomCameraAt,
  DEFAULT_CANVAS_CAMERA,
} from '../../domain/camera/camera';
import type { CanvasCamera } from '../../domain/camera/types';
import type { SceneDocumentV1 } from '../../domain/document/types';
import type { PixiRendererStatus } from '../../infrastructure/pixi/PixiRendererHost';
import type { PixiRendererHost } from '../../infrastructure/pixi/PixiRendererHost';

// Camera per I-12: wheel/trackpad pan-zoom anchored at the pointer, fit,
// Space-pan (owned by the keyboard hook), zoom to 100%. Canvas zoom is
// independent of browser zoom (I-32).
export function useV2Camera(hostRef: RefObject<PixiRendererHost | null>) {
  // The ref feeds gesture math mid-drag; the state re-renders screen-anchored
  // overlays (text editor, context bar) so they track pan and zoom.
  const cameraRef = useRef<CanvasCamera>(DEFAULT_CANVAS_CAMERA);
  const fittedRef = useRef<string | null>(null);
  const frameRef = useRef<number | null>(null);
  const [camera, setCamera] = useState<CanvasCamera>(DEFAULT_CANVAS_CAMERA);

  // Ref and renderer update per input event; the React state (which
  // re-renders the whole page) settles once per animation frame so a real
  // mouse/trackpad at 120–1000 events/s cannot starve the frame.
  const updateCamera = useCallback(
    (next: CanvasCamera) => {
      cameraRef.current = next;
      hostRef.current?.setCamera(next);
      if (frameRef.current !== null) return;
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        setCamera(cameraRef.current);
      });
    },
    [hostRef]
  );
  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
  }, []);

  const viewportCenter = useCallback(() => {
    const size = hostRef.current?.getViewportSize() ?? { width: 800, height: 600 };
    return { x: size.width / 2, y: size.height / 2 };
  }, [hostRef]);

  const fitView = useCallback((nodeIds?: readonly string[]) => {
    const host = hostRef.current;
    const bounds = host?.getContentBounds(nodeIds);
    if (!host || !bounds) return;
    updateCamera(fitCameraToBounds(bounds, host.getViewportSize(), 64));
  }, [hostRef, updateCamera]);

  const zoomStep = useCallback(
    (factor: number) => {
      updateCamera(zoomCameraAt(cameraRef.current, viewportCenter(), cameraRef.current.zoom * factor));
    },
    [updateCamera, viewportCenter]
  );

  const zoomTo = useCallback(
    (percent: number) => {
      updateCamera(zoomCameraAt(cameraRef.current, viewportCenter(), percent / 100));
    },
    [updateCamera, viewportCenter]
  );
  const resetZoom = useCallback(() => zoomTo(100), [zoomTo]);

  // First open of a non-empty doc fits with padding (I-32), including after
  // a reload. Empty docs keep the default camera; later edits never hijack
  // it. The host receives the page just after reporting ready, so a missing
  // content bounds means "not yet" rather than "empty": only auto-fit while
  // the session is still pristine (revision 0 — undo/redo advance it, so it
  // never returns to 0 after an edit).
  const fitOnOpen = useCallback(
    (
      status: PixiRendererStatus,
      document: SceneDocumentV1 | null,
      docId: string | undefined,
      revision: number
    ) => {
      if (status !== 'ready' || !document || fittedRef.current === docId) return;
      if (revision !== 0) {
        fittedRef.current = docId ?? null;
        return;
      }
      if (!hostRef.current?.getContentBounds()) return;
      fittedRef.current = docId ?? null;
      fitView();
    },
    [fitView, hostRef]
  );

  const resetFit = useCallback(() => {
    fittedRef.current = null;
  }, []);

  return {
    cameraRef,
    camera,
    zoom: Math.round(camera.zoom * 100),
    updateCamera,
    fitView,
    zoomStep,
    zoomTo,
    resetZoom,
    fitOnOpen,
    resetFit,
  };
}
