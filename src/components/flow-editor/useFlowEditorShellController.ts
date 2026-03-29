import { useCallback, useEffect, useMemo, type RefObject } from 'react';
import { shouldOpenFlowEditorImportDialog } from '@/app/routeState';
import { useStoragePressureGuard } from '@/hooks/useStoragePressureGuard';
import { useAnimatedEdgePerformanceWarning } from '@/hooks/useAnimatedEdgePerformanceWarning';
import type { FlowEdge, FlowNode, FlowSnapshot } from '@/lib/types';
import type { DiagramType } from '@/lib/types';
import type { FlowEditorMode } from '@/hooks/useFlowEditorUIState';

interface LocationLike {
  pathname: string;
  search: string;
  hash: string;
  state: unknown;
}

interface NavigateLikeOptions {
  replace?: boolean;
  state?: unknown;
}

type NavigateLike = (
  to: { pathname: string; search: string; hash: string },
  options?: NavigateLikeOptions
) => void;

interface TabLike {
  id: string;
  diagramType?: DiagramType;
}

interface UseFlowEditorShellControllerParams {
  location: LocationLike;
  navigate: NavigateLike;
  fileInputRef: RefObject<HTMLInputElement | null>;
  pages: TabLike[];
  activePageId: string | null;
  snapshots: FlowSnapshot[];
  nodes: FlowNode[];
  edges: FlowEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  isCommandBarOpen: boolean;
  isHistoryOpen: boolean;
  editorMode: FlowEditorMode;
  handleExportJSON: () => void;
  onLayout: (
    direction?: 'TB' | 'LR' | 'RL' | 'BT',
    algorithm?: 'layered' | 'mrtree' | 'radial',
    spacing?: 'compact' | 'normal' | 'loose',
    diagramType?: DiagramType
  ) => Promise<void>;
}

interface UseFlowEditorShellControllerResult {
  activeTab: TabLike | undefined;
  handleLayoutWithContext: () => void;
  selectedNode: FlowNode | null;
  selectedNodes: FlowNode[];
  selectedEdge: FlowEdge | null;
  shouldRenderPanels: boolean;
}

export function useFlowEditorShellController({
  location,
  navigate,
  fileInputRef,
  pages,
  activePageId,
  snapshots,
  nodes,
  edges,
  selectedNodeId,
  selectedEdgeId,
  isCommandBarOpen,
  isHistoryOpen,
  editorMode,
  handleExportJSON,
  onLayout,
}: UseFlowEditorShellControllerParams): UseFlowEditorShellControllerResult {
  const storageGuardTrigger = useMemo(
    () => `${pages.length}:${snapshots.length}:${nodes.length}:${edges.length}`,
    [pages.length, snapshots.length, nodes.length, edges.length]
  );
  useStoragePressureGuard({
    trigger: storageGuardTrigger,
    onExportJSON: handleExportJSON,
  });
  useAnimatedEdgePerformanceWarning({
    nodeCount: nodes.length,
    edges,
  });

  useEffect(() => {
    if (!shouldOpenFlowEditorImportDialog(location.state)) {
      return;
    }

    fileInputRef.current?.click();
    navigate(
      {
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
      },
      { replace: true, state: null }
    );
  }, [fileInputRef, location.hash, location.pathname, location.search, location.state, navigate]);

  const activeTab = useMemo(
    () => pages.find((tab) => tab.id === activePageId),
    [pages, activePageId]
  );

  const handleLayoutWithContext = useCallback(() => {
    void onLayout('TB', 'layered', 'normal', activeTab?.diagramType);
  }, [onLayout, activeTab?.diagramType]);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );
  const selectedNodes = useMemo(() => nodes.filter((node) => node.selected), [nodes]);
  const selectedEdge = useMemo(
    () => edges.find((edge) => edge.id === selectedEdgeId) ?? null,
    [edges, selectedEdgeId]
  );
  const shouldRenderPanels =
    isCommandBarOpen ||
    isHistoryOpen ||
    editorMode === 'studio' ||
    Boolean(selectedNode || selectedEdge || selectedNodes.length > 1);

  return {
    activeTab,
    handleLayoutWithContext,
    selectedNode,
    selectedNodes,
    selectedEdge,
    shouldRenderPanels,
  };
}
