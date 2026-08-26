import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useFlowStore } from '@/store';
import { projectActiveDocument } from '../application/active-document/activeDocumentProjection';
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
        panRef.current = beginCameraPan(event.pointerId, { x: event.clientX, y: event.clientY });
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const gesture = panRef.current;
        if (!gesture || gesture.pointerId !== event.pointerId) return;
        const next = moveCameraPan(cameraRef.current, gesture, {
          x: event.clientX,
          y: event.clientY,
        });
        panRef.current = next.gesture;
        applyCamera(next.camera);
      }}
      onPointerUp={(event) => {
        if (panRef.current?.pointerId === event.pointerId) panRef.current = null;
      }}
      onPointerCancel={() => { panRef.current = null; }}
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
