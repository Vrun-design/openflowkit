import { useCallback } from 'react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useMindmapTopicActionRequest } from '@/hooks/mindmapTopicActionRequest';
import type { FlowEdge, FlowNode } from '@/lib/types';
import { useNodeQuickCreateRequest } from '@/hooks/nodeQuickCreateRequest';

interface UseFlowEditorInteractionBindingsParams {
    selectedNodeId: string | null;
    selectedEdgeId: string | null;
    selectedNodeType: string | null;
    deleteNode: (id: string) => void;
    deleteEdge: (id: string) => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    onUndoUnavailable: () => void;
    onRedoUnavailable: () => void;
    duplicateNode: (id: string) => void;
    selectAll: () => void;
    handleAddMindmapChild: (nodeId: string, side?: 'left' | 'right' | null) => void;
    handleAddMindmapSibling: (nodeId: string) => void;
    openCommandBar: (view: 'root' | 'search' | 'assets' | 'templates' | 'layout' | 'design-system') => void;
    setShortcutsHelpOpen: (open: boolean) => void;
    enableSelectMode: () => void;
    enablePanMode: () => void;
    fitView: (options?: { duration?: number; padding?: number }) => void;
    zoomIn: (options?: { duration?: number }) => void;
    zoomOut: (options?: { duration?: number }) => void;
    copySelection: () => void;
    pasteSelection: () => void;
    copyStyleSelection: () => void;
    pasteStyleSelection: () => void;
    createConnectedNodeInDirection: (nodeId: string, direction: 'up' | 'right' | 'down' | 'left') => void;
    updateNodeData: (id: string, data: Partial<FlowNode['data']>) => void;
    setSelectedNodeId: (id: string | null) => void;
    setSelectedEdgeId: (id: string | null) => void;
    setNodes: (updater: (nodes: FlowNode[]) => FlowNode[]) => void;
    setEdges: (updater: (edges: FlowEdge[]) => FlowEdge[]) => void;
}

export function useFlowEditorInteractionBindings({
    selectedNodeId,
    selectedEdgeId,
    selectedNodeType,
    deleteNode,
    deleteEdge,
    undo,
    redo,
    canUndo,
    canRedo,
    onUndoUnavailable,
    onRedoUnavailable,
    duplicateNode,
    selectAll,
    handleAddMindmapChild,
    handleAddMindmapSibling,
    openCommandBar,
    setShortcutsHelpOpen,
    enableSelectMode,
    enablePanMode,
    fitView,
    zoomIn,
    zoomOut,
    copySelection,
    pasteSelection,
    copyStyleSelection,
    pasteStyleSelection,
    createConnectedNodeInDirection,
    updateNodeData,
    setSelectedNodeId,
    setSelectedEdgeId,
    setNodes,
    setEdges,
}: UseFlowEditorInteractionBindingsParams) {
    useKeyboardShortcuts({
        selectedNodeId,
        selectedEdgeId,
        deleteNode,
        deleteEdge,
        undo,
        redo,
        canUndo,
        canRedo,
        onUndoUnavailable,
        onRedoUnavailable,
        duplicateNode,
        selectAll,
        selectedNodeType,
        onAddMindmapChildShortcut: () => {
            if (selectedNodeId) {
                handleAddMindmapChild(selectedNodeId);
            }
        },
        onAddMindmapSiblingShortcut: () => {
            if (selectedNodeId) {
                handleAddMindmapSibling(selectedNodeId);
            }
        },
        onCommandBar: () => openCommandBar('root'),
        onSearch: () => openCommandBar('search'),
        onShortcutsHelp: () => setShortcutsHelpOpen(true),
        onSelectMode: enableSelectMode,
        onPanMode: enablePanMode,
        onFitView: () => fitView({ duration: 600, padding: 0.2 }),
        onZoomIn: () => zoomIn({ duration: 300 }),
        onZoomOut: () => zoomOut({ duration: 300 }),
        onCopy: copySelection,
        onPaste: pasteSelection,
        onCopyStyle: copyStyleSelection,
        onPasteStyle: pasteStyleSelection,
        onQuickCreateShortcut: (direction) => {
            if (selectedNodeId) {
                createConnectedNodeInDirection(selectedNodeId, direction);
            }
        },
        onAnnotationColorShortcut: (color) => {
            if (selectedNodeId) {
                updateNodeData(selectedNodeId, { color });
            }
        },
        onClearSelection: () => {
            setSelectedNodeId(null);
            setSelectedEdgeId(null);
            setNodes((nodes) => nodes.map((node) => ({ ...node, selected: false })));
            setEdges((edges) => edges.map((edge) => ({ ...edge, selected: false })));
        },
        onNudge: (dx, dy) => {
            setNodes((nodes) => nodes.map((node) =>
                node.selected
                    ? { ...node, position: { x: node.position.x + dx, y: node.position.y + dy } }
                    : node
            ));
        },
    });

    useNodeQuickCreateRequest(
        useCallback((nodeId, direction) => {
            createConnectedNodeInDirection(nodeId, direction);
        }, [createConnectedNodeInDirection])
    );

    useMindmapTopicActionRequest(
        useCallback(({ nodeId, action, side }) => {
            if (action === 'child') {
                handleAddMindmapChild(nodeId, side ?? null);
                return;
            }

            if (action === 'sibling') {
                handleAddMindmapSibling(nodeId);
            }
        }, [handleAddMindmapChild, handleAddMindmapSibling])
    );
}
