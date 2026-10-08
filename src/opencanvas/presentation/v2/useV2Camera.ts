import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  fitCameraToBounds,
  zoomCameraAt,
  DEFAULT_CANVAS_CAMERA,
  DEFAULT_CAMERA_LIMITS,
} from '../../domain/camera/camera';
import { readableLanding, type LandingDirection } from '../../domain/camera/readableLanding';
import { foundation } from '../design-system/tokens';
import { visibleCanvasEdges } from './V2ContextBar';
import type { CanvasCamera } from '../../domain/camera/types';
import type { Bounds2d } from '../../domain/geometry/types';
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
  const glideRef = useRef<number | null>(null);
  const glidingRef = useRef(false);
  const [camera, setCamera] = useState<CanvasCamera>(DEFAULT_CANVAS_CAMERA);

  // Ref and renderer update per input event; the React state (which
  // re-renders the whole page) settles once per animation frame so a real
  // mouse/trackpad at 120–1000 events/s cannot starve the frame.
  const updateCamera = useCallback(
    (next: CanvasCamera) => {
      if (glidingRef.current) stopGlide();
      cameraRef.current = next;
      hostRef.current?.setCamera(next);
      if (frameRef.current !== null) return;
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        setCamera(cameraRef.current);
      });
    },
    // stopGlide is a stable ref-based function; keeping it out avoids rotating
    // the identity every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hostRef]
  );

  const stopGlide = useCallback(() => {
    if (glideRef.current !== null) cancelAnimationFrame(glideRef.current);
    glideRef.current = null;
    glidingRef.current = false;
  }, []);

  /** Frames update directly (one rAF, no per-frame React render). */
  const applyGlideFrame = useCallback((next: CanvasCamera) => {
    cameraRef.current = next;
    hostRef.current?.setCamera(next);
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      setCamera(cameraRef.current);
    });
  }, [hostRef]);

  /** Navigation motion: a short glide the user can interrupt by touching the canvas. */
  const animateTo = useCallback((destination: CanvasCamera, durationMs = foundation.motion.camera) => {
    stopGlide();
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const start = { ...cameraRef.current };
    if (reduced || durationMs <= 0) {
      applyGlideFrame(destination);
      return;
    }
    const startedAt = performance.now();
    glidingRef.current = true;
    const step = (now: number) => {
      const t = Math.min(1, (now - startedAt) / durationMs);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      applyGlideFrame({
        x: start.x + (destination.x - start.x) * eased,
        y: start.y + (destination.y - start.y) * eased,
        zoom: start.zoom + (destination.zoom - start.zoom) * eased,
      });
      if (t < 1) glideRef.current = requestAnimationFrame(step);
      else { glideRef.current = null; glidingRef.current = false; }
    };
    glideRef.current = requestAnimationFrame(step);
  }, [applyGlideFrame, stopGlide]);

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    if (glideRef.current !== null) cancelAnimationFrame(glideRef.current);
  }, []);

  const viewportCenter = useCallback(() => {
    const size = hostRef.current?.getViewportSize() ?? { width: 800, height: 600 };
    return { x: size.width / 2, y: size.height / 2 };
  }, [hostRef]);

  /** The camera that frames `bounds` in the canvas the side panels leave free, and that free region. */
  const fitInto = useCallback((bounds: Bounds2d, padding = 64, maxZoom = DEFAULT_CAMERA_LIMITS.maxZoom) => {
    const size = hostRef.current!.getViewportSize();
    // The canvas runs under the side panels: fit into what they leave free (a phone-width
    // panel covers it all, so that falls back to the whole viewport).
    const { left, right } = visibleCanvasEdges(document.querySelector<HTMLElement>('.ofk-v2'));
    const clear = right - left >= size.width / 2;
    const free = { left: clear ? left : 0, right: clear ? right : size.width, height: size.height };
    const fitted = fitCameraToBounds(bounds, { width: free.right - free.left, height: free.height }, padding, { ...DEFAULT_CAMERA_LIMITS, maxZoom });
    return { camera: { ...fitted, x: fitted.x + free.left }, free };
  }, [hostRef]);

  /** Drill-down / flow camera: frame the nodes without zooming in past readability. */
  const glideToNodes = useCallback((nodeIds: readonly string[], padding = 96) => {
    const host = hostRef.current;
    const bounds = host?.getContentBounds(nodeIds);
    if (!host || !bounds) return;
    animateTo(fitInto(bounds, padding, 1.4).camera);
  }, [animateTo, hostRef, fitInto]);

  /** After the assistant draws: the fit when readable, else a readable zoom on the diagram's start. True when it zoomed in. */
  const landReadable = useCallback((direction: LandingDirection) => {
    const bounds = hostRef.current?.getContentBounds();
    if (!bounds) return false;
    const { camera: fitted, free } = fitInto(bounds);
    const landing = readableLanding(bounds, { width: free.right - free.left, height: free.height }, direction);
    updateCamera(landing.zoomedIn ? { ...landing.camera, x: landing.camera.x + free.left } : fitted);
    return landing.zoomedIn;
  }, [hostRef, updateCamera, fitInto]);

  const fitView = useCallback((nodeIds?: readonly string[]) => {
    const bounds = hostRef.current?.getContentBounds(nodeIds);
    if (!bounds) return;
    updateCamera(fitInto(bounds).camera);
  }, [hostRef, updateCamera, fitInto]);

  /** Brings `bounds` into view, and leaves the camera alone when it is already fully visible. */
  const revealBounds = useCallback((bounds: Bounds2d) => {
    if (!hostRef.current) return;
    const { camera: target, free } = fitInto(bounds);
    const { x, y, zoom } = cameraRef.current;
    const inside = bounds.x * zoom + x >= free.left && (bounds.x + bounds.width) * zoom + x <= free.right
      && bounds.y * zoom + y >= 0 && (bounds.y + bounds.height) * zoom + y <= free.height;
    if (!inside) updateCamera(target);
  }, [hostRef, updateCamera, fitInto]);

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
    animateTo,
    glideToNodes,
    fitView,
    landReadable,
    revealBounds,
    zoomStep,
    zoomTo,
    resetZoom,
    fitOnOpen,
    resetFit,
  };
}
