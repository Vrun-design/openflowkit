import type { Node } from '@/lib/reactflowCompat';
import { useFlowCanvasContextActions } from './useFlowCanvasContextActions';
import { useFlowCanvasMenus } from './useFlowCanvasMenus';

interface UseFlowCanvasMenusAndActionsParams {
    onPaneSelectionClear?: () => void;
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

export function useFlowCanvasMenusAndActions({
    onPaneSelectionClear,
    screenToFlowPosition,
    copySelection,
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
}: UseFlowCanvasMenusAndActionsParams) {
    const menus = useFlowCanvasMenus({
        onPaneSelectionClear,
    });
    const contextActions = useFlowCanvasContextActions({
        contextMenu: menus.contextMenu,
        onCloseContextMenu: menus.onCloseContextMenu,
        screenToFlowPosition,
        copySelection,
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
    });

    return {
        ...menus,
        contextActions,
    };
}
