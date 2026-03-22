import { useCallback } from 'react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useMindmapTopicActionRequest } from '@/hooks/mindmapTopicActionRequest';
import type { FlowEdge, FlowNode } from '@/lib/types';

interface UseFlowEditorInteractionBindingsParams {
    selectedNodeId: string | null;
    selectedEdgeId: string | null;
    selectedNodeType: string | null;
    deleteNode: (id: string) => void;
    deleteEdge: (id: string) => void;
    undo: () => void;
    redo: () => void;
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
