import { startTransition, useCallback, useRef } from 'react';
import type { FlowEdge, FlowNode, FlowSnapshot } from '@/lib/types';
import { useFlowStore } from '@/store';
import { composeDiagramForDisplay } from '@/services/composeDiagramForDisplay';

interface UseFlowEditorCallbacksParams {
    addPage: () => string;
    closePage: (pageId: string) => void;
    reorderPage: (draggedPageId: string, targetPageId: string) => void;
    updatePage: (pageId: string, update: Partial<{ name: string }>) => void;
    navigate: (path: string) => void;
    pagesLength: number;
    cannotCloseLastTabMessage: string;
    setNodes: (nodes: FlowNode[] | ((nodes: FlowNode[]) => FlowNode[])) => void;
    setEdges: (edges: FlowEdge[] | ((edges: FlowEdge[]) => FlowEdge[])) => void;
    restoreSnapshot: (snapshot: FlowSnapshot, setNodes: UseFlowEditorCallbacksParams['setNodes'], setEdges: UseFlowEditorCallbacksParams['setEdges']) => void;
    recordHistory: () => void;
    fitView: (options?: { duration?: number; padding?: number }) => void;
    screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
}

interface UseFlowEditorCallbacksResult {
    getCenter: () => { x: number; y: number };
    handleSwitchPage: (pageId: string) => void;
    handleAddPage: () => void;
    handleClosePage: (pageId: string) => void;
    handleRenamePage: (pageId: string, newName: string) => void;
    handleReorderPage: (draggedPageId: string, targetPageId: string) => void;
    selectAll: () => void;
    handleRestoreSnapshot: (snapshot: FlowSnapshot) => void;
    handleCommandBarApply: (newNodes: FlowNode[], newEdges: FlowEdge[]) => void;
}

export function useFlowEditorCallbacks({
    addPage,
    closePage,
    reorderPage,
    updatePage,
    navigate,
    pagesLength,
    cannotCloseLastTabMessage,
    setNodes,
    setEdges,
    restoreSnapshot,
    recordHistory,
    fitView,
    screenToFlowPosition,
}: UseFlowEditorCallbacksParams): UseFlowEditorCallbacksResult {
    const stabilizationRunIdRef = useRef(0);

    const getCenter = useCallback(() => {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        return screenToFlowPosition({ x: centerX, y: centerY });
    }, [screenToFlowPosition]);

    const handleSwitchPage = useCallback((pageId: string) => {
        navigate(`/flow/${pageId}`);
    }, [navigate]);

    const handleAddPage = useCallback(() => {
        const newId = addPage();
        navigate(`/flow/${newId}`);
    }, [addPage, navigate]);

    const handleClosePage = useCallback((pageId: string) => {
        if (pagesLength === 1) {
            alert(cannotCloseLastTabMessage);
            return;
        }
        closePage(pageId);
    }, [cannotCloseLastTabMessage, closePage, pagesLength]);

    const handleRenamePage = useCallback((pageId: string, newName: string) => {
        updatePage(pageId, { name: newName });
    }, [updatePage]);

    const handleReorderPage = useCallback((draggedPageId: string, targetPageId: string) => {
        reorderPage(draggedPageId, targetPageId);
    }, [reorderPage]);

    const selectAll = useCallback(() => {
        setNodes((nodes) => nodes.map((node) => ({ ...node, selected: true })));
        setEdges((edges) => edges.map((edge) => ({ ...edge, selected: true })));
    }, [setEdges, setNodes]);

    const handleRestoreSnapshot = useCallback((snapshot: FlowSnapshot) => {
        restoreSnapshot(snapshot, setNodes, setEdges);
        recordHistory();
    }, [recordHistory, restoreSnapshot, setEdges, setNodes]);

    const handleCommandBarApply = useCallback((newNodes: FlowNode[], newEdges: FlowEdge[]) => {
        recordHistory();
        startTransition(() => {
            setNodes(newNodes.map((node, index) => ({
                ...node,
                data: { ...node.data, freshlyAdded: true, animateDelay: Math.min(index * 20, 400) },
            })));
            setEdges(newEdges);
        });
        setTimeout(() => fitView({ duration: 800, padding: 0.2 }), 100);

        const runId = stabilizationRunIdRef.current + 1;
        stabilizationRunIdRef.current = runId;

        window.setTimeout(() => {
            void (async () => {
                if (stabilizationRunIdRef.current !== runId) {
                    return;
                }

                const state = useFlowStore.getState();
                const measuredNodes = state.nodes;
                const measuredEdges = state.edges;
                const hasMeasuredDimensions = measuredNodes.some((node) => {
                    const measured = (node as FlowNode & {
                        measured?: { width?: number; height?: number };
                    }).measured;
                    return typeof measured?.width === 'number' && typeof measured?.height === 'number';
                });

                if (!hasMeasuredDimensions) {
                    return;
                }

                const activeTab = state.tabs.find((tab) => tab.id === state.activeTabId);
                const { nodes: stabilizedNodes, edges: stabilizedEdges } = await composeDiagramForDisplay(
                    measuredNodes,
                    measuredEdges,
                    { diagramType: activeTab?.diagramType }
                );

                if (stabilizationRunIdRef.current !== runId) {
                    return;
                }

                setNodes(stabilizedNodes);
                setEdges(stabilizedEdges);
                fitView({ duration: 500, padding: 0.2 });
            })();
        }, 180);
    }, [fitView, recordHistory, setEdges, setNodes]);

    return {
        getCenter,
        handleSwitchPage,
        handleAddPage,
        handleClosePage,
        handleRenamePage,
        handleReorderPage,
        selectAll,
        handleRestoreSnapshot,
        handleCommandBarApply,
    };
}
