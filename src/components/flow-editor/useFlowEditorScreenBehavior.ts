import { useMemo } from 'react';
import { useFlowOperations } from '@/hooks/useFlowOperations';
import { useFlowEditorCallbacks } from '@/hooks/useFlowEditorCallbacks';
import { useFlowEditorInteractionBindings } from './useFlowEditorInteractionBindings';
import type { TFunction } from 'i18next';
import type { useFlowEditorScreenState } from './useFlowEditorScreenState';

type ScreenState = ReturnType<typeof useFlowEditorScreenState>;

export function useFlowEditorScreenBehavior(params: {
  screenState: ScreenState;
  t: TFunction;
  addToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning', duration?: number) => void;
}) {
  const { screenState, t, addToast } = params;
  const operations = useFlowOperations(screenState.recordHistory);
  const selectedNodeType = useMemo(
    () => screenState.nodes.find((node) => node.id === screenState.selectedNodeId)?.type ?? null,
    [screenState.nodes, screenState.selectedNodeId],
  );

  const callbacks = useFlowEditorCallbacks({
    addPage: screenState.addPage,
    closePage: screenState.closePage,
    updatePage: screenState.updatePage,
    reorderPage: screenState.reorderPage,
    navigate: screenState.navigate,
    pagesLength: screenState.pages.length,
    cannotCloseLastTabMessage: t('flowEditor.cannotCloseLastTab'),
    setNodes: screenState.setNodes,
    setEdges: screenState.setEdges,
    restoreSnapshot: screenState.restoreSnapshot,
    recordHistory: screenState.recordHistory,
    fitView: screenState.fitView,
    screenToFlowPosition: screenState.screenToFlowPosition,
  });

  useFlowEditorInteractionBindings({
    selectedNodeId: screenState.selectedNodeId,
    selectedEdgeId: screenState.selectedEdgeId,
    selectedNodeType,
    deleteNode: operations.deleteNode,
    deleteEdge: operations.deleteEdge,
    undo: screenState.undo,
    redo: screenState.redo,
    canUndo: screenState.canUndo,
    canRedo: screenState.canRedo,
    onUndoUnavailable: () => {
      addToast(t('history.undoUnavailable', 'Nothing to undo yet.'), 'info', 2500);
    },
    onRedoUnavailable: () => {
      addToast(t('history.redoUnavailable', 'Nothing to redo right now.'), 'info', 2500);
    },
    duplicateNode: operations.duplicateNode,
    selectAll: callbacks.selectAll,
    handleAddMindmapChild: operations.handleAddMindmapChild,
    handleAddMindmapSibling: operations.handleAddMindmapSibling,
    openCommandBar: screenState.openCommandBar,
    setShortcutsHelpOpen: screenState.setShortcutsHelpOpen,
    enableSelectMode: screenState.enableSelectMode,
    enablePanMode: screenState.enablePanMode,
    fitView: screenState.fitView,
    zoomIn: screenState.zoomIn,
    zoomOut: screenState.zoomOut,
    copySelection: operations.copySelection,
    pasteSelection: operations.pasteSelection,
    copyStyleSelection: operations.copyStyleSelection,
    pasteStyleSelection: operations.pasteStyleSelection,
    createConnectedNodeInDirection: operations.createConnectedNodeInDirection,
    updateNodeData: operations.updateNodeData,
    setSelectedNodeId: screenState.setSelectedNodeId,
    setSelectedEdgeId: screenState.setSelectedEdgeId,
    setNodes: screenState.setNodes,
    setEdges: screenState.setEdges,
  });

  return {
    operations,
    selectedNodeType,
    callbacks,
  };
}
