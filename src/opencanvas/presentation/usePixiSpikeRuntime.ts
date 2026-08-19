import { useEffect, type Dispatch, type RefObject, type SetStateAction } from 'react';
import type { DocumentHistoryState } from '../application/history/types';
import type { CanvasSelection } from '../application/selection/selection';
import type { CanvasCamera } from '../domain/camera/types';
import { PixiRendererHost, type PixiRendererStatus } from '../infrastructure/pixi/PixiRendererHost';
import type { CanvasMode } from './PixiSpikeControls';
import { projectSceneDocumentToReactFlow } from '../infrastructure/reactflow/toReactFlow';

interface RendererMountOptions {
  readonly supported: boolean;
  readonly connectorModelEnabled: boolean;
  readonly nodeLayoutModelEnabled: boolean;
  readonly basicNodesEnabled: boolean;
  readonly freeformNodesEnabled: boolean;
  readonly architectureNodesEnabled: boolean;
  readonly containerNodesEnabled: boolean;
  readonly classEntityNodesEnabled: boolean;
  readonly mindmapJourneyNodesEnabled: boolean;
  readonly sequenceNodesEnabled: boolean;
  readonly wireframeNodesEnabled: boolean;
  readonly viewportRef: RefObject<HTMLElement | null>;
  readonly hostRef: RefObject<PixiRendererHost | null>;
  readonly cameraRef: RefObject<CanvasCamera>;
  readonly historyRef: RefObject<DocumentHistoryState>;
  readonly fitView: () => void;
  readonly setStatus: Dispatch<SetStateAction<PixiRendererStatus>>;
  readonly setError: Dispatch<SetStateAction<string | null>>;
}

export function usePixiRendererMount(options: RendererMountOptions): void {
  const {
    cameraRef,
    connectorModelEnabled,
    nodeLayoutModelEnabled,
    basicNodesEnabled,
    freeformNodesEnabled,
    architectureNodesEnabled,
    containerNodesEnabled,
    classEntityNodesEnabled,
    mindmapJourneyNodesEnabled,
    sequenceNodesEnabled,
    wireframeNodesEnabled,
    fitView,
    historyRef,
    hostRef,
    setError,
    setStatus,
    supported,
    viewportRef,
  } = options;
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !supported) return;
    let disposed = false;
    const host = new PixiRendererHost({
      connectorModelEnabled,
      nodeLayoutModelEnabled,
      basicNodesEnabled,
      freeformNodesEnabled,
      architectureNodesEnabled,
      containerNodesEnabled,
      classEntityNodesEnabled,
      mindmapJourneyNodesEnabled,
      sequenceNodesEnabled,
      wireframeNodesEnabled,
      onStatusChange: (status) => {
        if (!disposed) setStatus(status);
      },
    });
    hostRef.current = host;
    void host
      .mount(viewport)
      .then(() => {
        if (disposed) return;
        host.setCamera(cameraRef.current);
        host.setPage(historyRef.current.present.pages[0]);
        requestAnimationFrame(fitView);
      })
      .catch((mountError: unknown) => {
        if (disposed) return;
        setError(mountError instanceof Error ? mountError.message : 'PixiJS could not start.');
        setStatus('unavailable');
      });
    const observer = new ResizeObserver(() => host.resize());
    observer.observe(viewport);
    return () => {
      disposed = true;
      observer.disconnect();
      host.destroy();
      hostRef.current = null;
    };
  }, [
    cameraRef,
    connectorModelEnabled,
    nodeLayoutModelEnabled,
    basicNodesEnabled,
    freeformNodesEnabled,
    architectureNodesEnabled,
    containerNodesEnabled,
    classEntityNodesEnabled,
    mindmapJourneyNodesEnabled,
    sequenceNodesEnabled,
    wireframeNodesEnabled,
    fitView,
    historyRef,
    hostRef,
    setError,
    setStatus,
    supported,
    viewportRef,
  ]);
}

interface BenchmarkApiOptions {
  readonly loadFixture: (nodeCount: number) => Promise<number>;
  readonly resetCamera: () => void;
  readonly status: PixiRendererStatus;
  readonly nodeCount: number;
  readonly mode: CanvasMode;
  readonly hostRef: RefObject<PixiRendererHost | null>;
  readonly cameraRef: RefObject<CanvasCamera>;
  readonly selectionRef: RefObject<CanvasSelection>;
  readonly historyRef: RefObject<DocumentHistoryState>;
  readonly connectorModelEnabled: boolean;
  readonly nodeLayoutModelEnabled: boolean;
  readonly basicNodesEnabled: boolean;
  readonly freeformNodesEnabled: boolean;
  readonly architectureNodesEnabled: boolean;
  readonly containerNodesEnabled: boolean;
  readonly classEntityNodesEnabled: boolean;
  readonly mindmapJourneyNodesEnabled: boolean;
  readonly sequenceNodesEnabled: boolean;
  readonly wireframeNodesEnabled: boolean;
}

export function usePixiBenchmarkApi(options: BenchmarkApiOptions): void {
  const {
    cameraRef,
    connectorModelEnabled,
    nodeLayoutModelEnabled,
    basicNodesEnabled,
    freeformNodesEnabled,
    architectureNodesEnabled,
    containerNodesEnabled,
    classEntityNodesEnabled,
    mindmapJourneyNodesEnabled,
    sequenceNodesEnabled,
    wireframeNodesEnabled,
    hostRef,
    historyRef,
    loadFixture,
    mode,
    nodeCount,
    resetCamera,
    selectionRef,
    status,
  } = options;
  useEffect(() => {
    const benchmarkWindow = window as typeof window & {
      __OPEN_CANVAS_PIXI_SPIKE__?: {
        loadFixture(nodeCount: number): Promise<number>;
        resetCamera(): void;
        getNodeScreenBounds(
          nodeId: string
        ): { x: number; y: number; width: number; height: number } | null;
        getConnectorState(): { connectors: number; labels: number; markers: number };
        getNodeState(): ReturnType<PixiRendererHost['getNodeDebugSnapshot']>;
        getConnectorEditState(): ReturnType<PixiRendererHost['getConnectorEditDebugSnapshot']>;
        getConnectorHandles(): ReturnType<PixiRendererHost['getConnectorHandleScreenPoints']>;
        exportLegacyGraph(): {
          nodes: unknown[];
          edges: unknown[];
          name: string;
          diagramType: string;
        };
        getState(): {
          status: PixiRendererStatus;
          nodes: number;
          zoom: number;
          selectedNodes: number;
          mode: CanvasMode;
          connectorModelEnabled: boolean;
          nodeLayoutModelEnabled: boolean;
          basicNodesEnabled: boolean;
          freeformNodesEnabled: boolean;
          architectureNodesEnabled: boolean;
          containerNodesEnabled: boolean;
          classEntityNodesEnabled: boolean;
          mindmapJourneyNodesEnabled: boolean;
          sequenceNodesEnabled: boolean;
          wireframeNodesEnabled: boolean;
        };
      };
    };
    benchmarkWindow.__OPEN_CANVAS_PIXI_SPIKE__ = {
      loadFixture,
      resetCamera,
      getNodeScreenBounds: (nodeId) => {
        const bounds = hostRef.current?.getNodeScreenBounds(nodeId);
        return bounds
          ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
          : null;
      },
      getConnectorState: () =>
        hostRef.current?.getConnectorDebugSnapshot() ?? { connectors: 0, labels: 0, markers: 0 },
      getNodeState: () => hostRef.current?.getNodeDebugSnapshot() ?? [],
      getConnectorEditState: () =>
        hostRef.current?.getConnectorEditDebugSnapshot() ?? {
          connectorId: null,
          activeHandle: null,
          routeKind: null,
          ownership: null,
          waypointCount: 0,
          waypoints: [],
          sourceNodeId: null,
          targetNodeId: null,
        },
      getConnectorHandles: () => hostRef.current?.getConnectorHandleScreenPoints() ?? [],
      exportLegacyGraph: () => {
        const document = historyRef.current.present;
        const projection = projectSceneDocumentToReactFlow(document, document.pages[0].id);
        return {
          nodes: projection.nodes,
          edges: projection.edges,
          name: document.name,
          diagramType: projection.diagramType,
        };
      },
      getState: () => ({
        status,
        nodes: nodeCount,
        zoom: cameraRef.current.zoom,
        selectedNodes: selectionRef.current.nodeIds.length,
        mode,
        connectorModelEnabled,
        nodeLayoutModelEnabled,
        basicNodesEnabled,
        freeformNodesEnabled,
        architectureNodesEnabled,
        containerNodesEnabled,
        classEntityNodesEnabled,
        mindmapJourneyNodesEnabled,
        sequenceNodesEnabled,
        wireframeNodesEnabled,
      }),
    };
    return () => {
      delete benchmarkWindow.__OPEN_CANVAS_PIXI_SPIKE__;
    };
  }, [
    cameraRef,
    connectorModelEnabled,
    nodeLayoutModelEnabled,
    basicNodesEnabled,
    freeformNodesEnabled,
    architectureNodesEnabled,
    containerNodesEnabled,
    classEntityNodesEnabled,
    mindmapJourneyNodesEnabled,
    sequenceNodesEnabled,
    wireframeNodesEnabled,
    hostRef,
    historyRef,
    loadFixture,
    mode,
    nodeCount,
    resetCamera,
    selectionRef,
    status,
  ]);
}
