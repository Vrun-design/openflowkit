import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useFlowStore } from '@/store';
import { projectActiveDocument } from '../application/active-document/activeDocumentProjection';
import { projectSelectionToNodes } from '../application/active-document/productionSelectionBridge';
import {
  addToSelection,
  clearSelection,
  replaceSelection,
  EMPTY_CANVAS_SELECTION,
  type CanvasSelection,
} from '../application/selection/selection';
import {
  anchoredMarqueeBounds,
  selectionAfterClick,
  type AnchoredMarqueePointerOperation,
} from './pixiPointerOperations';
import { openCanvasRendererFamilyFlags } from '../application/renderer/rendererFamilyFlags';
import {
  beginCameraPan,
  moveCameraPan,
  zoomReadOnlyCamera,
  type CameraPanGesture,
} from '../application/renderer/readOnlyCameraInteraction';
import { DEFAULT_CANVAS_CAMERA, fitCameraToBounds } from '../domain/camera/camera';
import type { CanvasCamera } from '../domain/camera/types';
import { detectWebGlCapability } from '../infrastructure/pixi/capabilities';
import { PixiRendererHost } from '../infrastructure/pixi/PixiRendererHost';

function surfacePoint(event: React.PointerEvent<HTMLDivElement>): { x: number; y: number } {
  const bounds = event.currentTarget.getBoundingClientRect();
  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
}

interface OpenCanvasSurfaceProps {
  /** React Flow canvas rendered instead whenever OpenCanvas cannot draw. */
  readonly fallback: React.ReactNode;
}

/**
 * Draws the active page with the OpenCanvas renderer inside the production
 * editor chrome. Read-only: camera navigation only, no editing yet.
 */
export function OpenCanvasSurface({ fallback }: OpenCanvasSurfaceProps): React.JSX.Element {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<PixiRendererHost | null>(null);
  const cameraRef = useRef<CanvasCamera>(DEFAULT_CANVAS_CAMERA);
  const panRef = useRef<CameraPanGesture | null>(null);
  const marqueeRef = useRef<AnchoredMarqueePointerOperation | null>(null);
  const selectionRef = useRef<CanvasSelection>(EMPTY_CANVAS_SELECTION);
  const spacePanRef = useRef(false);
  const fittedRef = useRef<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'ready' | 'failed'>('idle');
  const capability = useMemo(() => detectWebGlCapability(), []);

  const state = useFlowStore(
    useShallow((current) => ({
      nodes: current.nodes,
      edges: current.edges,
      documents: current.documents,
      activeDocumentId: current.activeDocumentId,
      pages: current.tabs,
      activePageId: current.activeTabId,
      layers: current.layers,
      setNodes: current.setNodes,
      setSelectedNodeId: current.setSelectedNodeId,
    }))
  );
  const projection = useMemo(
    () => projectActiveDocument(state, new Date().toISOString()),
    [state]
  );

  const applyCamera = useCallback((camera: CanvasCamera) => {
    cameraRef.current = camera;
    hostRef.current?.setCamera(camera);
  }, []);

  const applySelection = useCallback((selection: CanvasSelection) => {
    selectionRef.current = selection;
    hostRef.current?.setSelection(selection.nodeIds, selection.primaryNodeId);
    const projected = projectSelectionToNodes(state.nodes, selection);
    if (projected.nodes) state.setNodes(projected.nodes);
    state.setSelectedNodeId(projected.selectedNodeId);
  }, [state]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.code === 'Space') spacePanRef.current = true;
      else if (event.key === 'Escape') applySelection(clearSelection());
    };
    const onKeyUp = (event: KeyboardEvent): void => {
      if (event.code === 'Space') spacePanRef.current = false;
    };
    const onBlur = (): void => { spacePanRef.current = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [applySelection]);

  const usable = capability.supported && projection.status !== 'invalid' && status !== 'failed';

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !usable) return;
    let disposed = false;
    const host = new PixiRendererHost({
      ...openCanvasRendererFamilyFlags(),
      onStatusChange: (next) => {
        if (disposed) return;
        if (next === 'context-lost') setStatus('failed');
        else if (next === 'ready') setStatus('ready');
      },
    });
    hostRef.current = host;
    void host.mount(viewport).catch(() => {
      if (!disposed) setStatus('failed');
    });
    const observer = new ResizeObserver(() => host.resize());
    observer.observe(viewport);
    return () => {
      disposed = true;
      observer.disconnect();
      host.destroy();
      hostRef.current = null;
    };
  }, [usable]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || status !== 'ready' || projection.status !== 'ready') return;
    const page = projection.document.pages.find(({ id }) => id === state.activePageId)
      ?? projection.document.pages[0];
    if (!page) return;
    host.setPage(page);
    // setPage rebuilds renderer objects, so the selection overlay is restated.
    host.setSelection(selectionRef.current.nodeIds, selectionRef.current.primaryNodeId);
    const fitKey = `${projection.document.id}:${page.id}`;
    if (fittedRef.current === fitKey) {
      host.setCamera(cameraRef.current);
      return;
    }
    fittedRef.current = fitKey;
    const bounds = host.getContentBounds();
    applyCamera(bounds ? fitCameraToBounds(bounds, host.getViewportSize()) : DEFAULT_CANVAS_CAMERA);
  }, [applyCamera, projection, state.activePageId, status]);

  if (!usable) return <>{fallback}</>;

  return (
    <div
      ref={viewportRef}
      data-testid="opencanvas-surface"
      className="h-full w-full"
      onPointerDown={(event) => {
        const host = hostRef.current;
        if (!host || (event.button !== 0 && event.button !== 1)) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        const screen = surfacePoint(event);
        if (event.button === 1 || spacePanRef.current) {
          panRef.current = beginCameraPan(event.pointerId, screen);
          return;
        }
        const additive = event.shiftKey || event.metaKey || event.ctrlKey;
        const nodeId = host.pickNode(screen);
        if (nodeId) {
          applySelection(selectionAfterClick(selectionRef.current, nodeId, additive));
          return;
        }
        marqueeRef.current = {
          kind: 'marquee',
          pointerId: event.pointerId,
          startScreen: screen,
          startWorld: host.screenToWorld(screen),
          currentScreen: screen,
          additive,
        };
      }}
      onPointerMove={(event) => {
        const host = hostRef.current;
        const screen = surfacePoint(event);
        const pan = panRef.current;
        if (pan && pan.pointerId === event.pointerId) {
          const next = moveCameraPan(cameraRef.current, pan, screen);
          panRef.current = next.gesture;
          applyCamera(next.camera);
          return;
        }
        const marquee = marqueeRef.current;
        if (!host || !marquee || marquee.pointerId !== event.pointerId) return;
        marqueeRef.current = { ...marquee, currentScreen: screen };
        host.setMarquee(anchoredMarqueeBounds(marqueeRef.current, cameraRef.current));
      }}
      onPointerUp={(event) => {
        if (panRef.current?.pointerId === event.pointerId) {
          panRef.current = null;
          return;
        }
        const host = hostRef.current;
        const marquee = marqueeRef.current;
        if (!host || !marquee || marquee.pointerId !== event.pointerId) return;
        marqueeRef.current = null;
        host.setMarquee(null);
        const bounds = anchoredMarqueeBounds(marquee, cameraRef.current);
        if (bounds.width < 4 && bounds.height < 4) {
          applySelection(selectionAfterClick(selectionRef.current, null, marquee.additive));
          return;
        }
        const ids = host.pickNodesInScreenBounds(bounds);
        applySelection(marquee.additive
          ? addToSelection(selectionRef.current, ids)
          : replaceSelection(ids));
      }}
      onPointerCancel={() => {
        panRef.current = null;
        marqueeRef.current = null;
        hostRef.current?.setMarquee(null);
      }}
      onWheel={(event) => {
        const host = hostRef.current;
        if (!host) return;
        const rect = event.currentTarget.getBoundingClientRect();
        applyCamera(zoomReadOnlyCamera(
          cameraRef.current,
          { x: event.clientX - rect.left, y: event.clientY - rect.top },
          event.deltaY
        ));
      }}
    />
  );
}
