import { useMemo } from 'react';
import type { Node } from 'reactflow';
import type { ContextMenuProps } from '@/components/ContextMenu';

interface UseFlowCanvasContextActionsParams {
    contextMenu: ContextMenuProps & { isOpen: boolean };
    onCloseContextMenu: () => void;
    screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
    copySelection: () => void;
    pasteSelection: (position: { x: number; y: number }) => void;
    duplicateNode: (id: string) => void;
    deleteNode: (id: string) => void;
    deleteEdge: (id: string) => void;
    updateNodeZIndex: (id: string, action: 'front' | 'back') => void;
    handleAlignNodes: (direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
    handleDistributeNodes: (direction: 'horizontal' | 'vertical') => void;
    handleGroupNodes: () => void;
    nodes: Node[];
}

interface UseFlowCanvasContextActionsResult {
    selectedCount: number;
    onPaste: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
    onSendToBack: () => void;
    onAlignNodes: (direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
    onDistributeNodes: (direction: 'horizontal' | 'vertical') => void;
    onGroupSelected: () => void;
}

export function useFlowCanvasContextActions({
    contextMenu,
    onCloseContextMenu,
    screenToFlowPosition,
    copySelection,
    pasteSelection,
    duplicateNode,
    deleteNode,
    deleteEdge,
    updateNodeZIndex,
    handleAlignNodes,
    handleDistributeNodes,
    handleGroupNodes,
    nodes,
}: UseFlowCanvasContextActionsParams): UseFlowCanvasContextActionsResult {
    const selectedCount = useMemo(() => nodes.filter((node) => node.selected).length, [nodes]);

    function onPaste(): void {
        if (contextMenu.position) {
            pasteSelection(screenToFlowPosition(contextMenu.position));
        }
        onCloseContextMenu();
    }

    function onDuplicate(): void {
        if (contextMenu.id) {
            duplicateNode(contextMenu.id);
        }
        onCloseContextMenu();
    }

    function onDelete(): void {
        if (contextMenu.id) {
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

    function onAlignNodesAndClose(direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'): void {
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

    return {
        selectedCount,
        onPaste,
        onDuplicate,
        onDelete,
        onSendToBack,
        onAlignNodes: onAlignNodesAndClose,
        onDistributeNodes: onDistributeNodesAndClose,
        onGroupSelected,
    };
}
