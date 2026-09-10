import { useMemo } from 'react';
import type { Node } from '@/lib/reactflowCompat';
import type { ContextMenuProps } from '@/components/ContextMenu';
import { useFlowStore } from '@/store';

interface UseFlowCanvasContextActionsParams {
  contextMenu: ContextMenuProps & { isOpen: boolean };
  onCloseContextMenu: () => void;
  screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
  copySelection: () => void;
  pasteSelection: (position: { x: number; y: number }) => void;
  pasteSelectionInPlace: () => void;
  copyStyleSelection: () => void;
  pasteStyleSelection: () => void;
  duplicateNode: (id: string) => void;
  deleteNode: (id: string) => void;
  deleteEdge: (id: string) => void;
  insertNodeOnEdge: (id: string) => void;
  updateNodeZIndex: (id: string, action: 'front' | 'back') => void;
  updateNodeType: (id: string, type: string) => void;
  updateNodeData: (id: string, updates: Record<string, unknown>) => void;
  fitSectionToContents: (id: string) => void;
  releaseFromSection: (id: string) => void;
  bringContentsIntoSection: (id: string) => void;
  handleAlignNodes: (direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  handleDistributeNodes: (direction: 'horizontal' | 'vertical') => void;
  handleGroupNodes: () => void;
  handleWrapInSection: () => void;
  handleUngroupSection: (id: string) => void;
  nodes: Node[];
}

export interface UseFlowCanvasContextActionsResult {
  selectedCount: number;
  onPaste: () => void;
  onPasteInPlace: () => void;
  onCopyStyle: () => void;
  onPasteStyle: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSendToBack: () => void;
  onReverseEdge: () => void;
  onInsertNodeOnEdge: () => void;
  onChangeNodeType: (type: string) => void;
  onEditLabel: () => void;
  onFitSectionToContents: () => void;
  onBringContentsIntoSection: () => void;
  onReleaseFromSection: () => void;
  onToggleSectionLock: () => void;
  onToggleSectionHidden: () => void;
  onTogglePinPosition: () => void;
  isPinPositionToggleApplicable: boolean;
  isCurrentNodePinned: boolean;
  onAlignNodes: (direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  onDistributeNodes: (direction: 'horizontal' | 'vertical') => void;
  onGroupSelected: () => void;
  onWrapInSection: () => void;
  onUngroupSection: () => void;
}

export function useFlowCanvasContextActions({
  contextMenu,
  onCloseContextMenu,
  screenToFlowPosition,
  pasteSelection,
  pasteSelectionInPlace,
  copyStyleSelection,
  pasteStyleSelection,
  duplicateNode,
  deleteNode,
  deleteEdge,
  insertNodeOnEdge,
  updateNodeZIndex,
  updateNodeType,
  updateNodeData,
  fitSectionToContents,
  releaseFromSection,
  bringContentsIntoSection,
  handleAlignNodes,
  handleDistributeNodes,
  handleGroupNodes,
  handleWrapInSection,
  handleUngroupSection,
  nodes,
}: UseFlowCanvasContextActionsParams): UseFlowCanvasContextActionsResult {
  const selectedCount = useMemo(() => nodes.filter((node) => node.selected).length, [nodes]);
  const contextNode = useMemo(
    () => nodes.find((node) => node.id === contextMenu.id) ?? null,
    [contextMenu.id, nodes]
  );

  function onPaste(): void {
    if (contextMenu.position) {
      pasteSelection(screenToFlowPosition(contextMenu.position));
    }
    onCloseContextMenu();
  }

  function onPasteInPlace(): void {
    pasteSelectionInPlace();
    onCloseContextMenu();
  }

  function onCopyStyle(): void {
    copyStyleSelection();
    onCloseContextMenu();
  }

  function onPasteStyle(): void {
    pasteStyleSelection();
    onCloseContextMenu();
  }

  function onDuplicate(): void {
    if (contextMenu.id) {
      duplicateNode(contextMenu.id);
    }
    onCloseContextMenu();
  }

  function onDelete(): void {
    if (contextMenu.type === 'multi') {
      const selectedIds = nodes.filter((n) => n.selected).map((n) => n.id);
      selectedIds.forEach((id) => deleteNode(id));
    } else if (contextMenu.id) {
      if (contextMenu.type === 'edge') {
        deleteEdge(contextMenu.id);
      } else {
        deleteNode(contextMenu.id);
      }
    }
    onCloseContextMenu();
  }

  function onSendToBack(): void {
    if (contextMenu.id) {
      updateNodeZIndex(contextMenu.id, 'back');
    }
    onCloseContextMenu();
  }

  function onReverseEdge(): void {
    if (contextMenu.id) {
      // The store command reverses the selected edges atomically with history,
      // so select the menu's edge first.
      const { setSelectedEdgeId, setEdges, runContextualEditorCommand } = useFlowStore.getState();
      const id = contextMenu.id;
      setEdges((edges) => edges.map((edge) => ({ ...edge, selected: edge.id === id })));
      setSelectedEdgeId(id);
      runContextualEditorCommand({ kind: 'reverse-connectors' });
    }
    onCloseContextMenu();
  }

  function onInsertNodeOnEdge(): void {
    if (contextMenu.id) insertNodeOnEdge(contextMenu.id);
    onCloseContextMenu();
  }

  function onChangeNodeType(type: string): void {
    if (contextMenu.id) {
      updateNodeType(contextMenu.id, type);
    }
    onCloseContextMenu();
  }

  function onAlignNodesAndClose(
    direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'
  ): void {
    handleAlignNodes(direction);
    onCloseContextMenu();
  }

  function onDistributeNodesAndClose(direction: 'horizontal' | 'vertical'): void {
    handleDistributeNodes(direction);
    onCloseContextMenu();
  }

  function onGroupSelected(): void {
    handleGroupNodes();
    onCloseContextMenu();
  }

  function onWrapInSection(): void {
    handleWrapInSection();
    onCloseContextMenu();
  }

  function onUngroupSection(): void {
    if (contextMenu.id) handleUngroupSection(contextMenu.id);
    onCloseContextMenu();
  }

  function onEditLabel(): void {
    onCloseContextMenu();
  }

  function onFitSectionToContents(): void {
    if (contextMenu.id) {
      fitSectionToContents(contextMenu.id);
    }
    onCloseContextMenu();
  }

  function onBringContentsIntoSection(): void {
    if (contextMenu.id) {
      bringContentsIntoSection(contextMenu.id);
    }
    onCloseContextMenu();
  }

  function onReleaseFromSection(): void {
    if (contextMenu.id) {
      releaseFromSection(contextMenu.id);
    }
    onCloseContextMenu();
  }

  function onToggleSectionLock(): void {
    if (contextMenu.id && contextNode?.type === 'section') {
      updateNodeData(contextMenu.id, {
        sectionLocked: contextNode.data?.sectionLocked !== true,
      });
    }
    onCloseContextMenu();
  }

  function onToggleSectionHidden(): void {
    if (contextMenu.id && contextNode?.type === 'section') {
      updateNodeData(contextMenu.id, {
        sectionHidden: contextNode.data?.sectionHidden !== true,
      });
    }
    onCloseContextMenu();
  }

  // Pin position: only meaningful for leaf nodes (sections derive bounds from
  // their children, so anchoring them would fight the layout engine).
  const isPinPositionToggleApplicable =
    Boolean(contextNode) && contextNode?.type !== 'section';
  const isCurrentNodePinned = contextNode?.data?.pinned === true;

  function onTogglePinPosition(): void {
    if (!contextMenu.id || !isPinPositionToggleApplicable) {
      onCloseContextMenu();
      return;
    }
    updateNodeData(contextMenu.id, { pinned: !isCurrentNodePinned });
    onCloseContextMenu();
  }

  return {
    selectedCount,
    onPaste,
    onPasteInPlace,
    onCopyStyle,
    onPasteStyle,
    onDuplicate,
    onDelete,
    onSendToBack,
    onReverseEdge,
    onInsertNodeOnEdge,
    onChangeNodeType,
    onEditLabel,
    onFitSectionToContents,
    onBringContentsIntoSection,
    onReleaseFromSection,
    onToggleSectionLock,
    onToggleSectionHidden,
    onTogglePinPosition,
    isPinPositionToggleApplicable,
    isCurrentNodePinned,
    onAlignNodes: onAlignNodesAndClose,
    onDistributeNodes: onDistributeNodesAndClose,
    onGroupSelected,
    onWrapInSection,
    onUngroupSection,
  };
}
