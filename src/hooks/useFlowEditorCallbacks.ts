import { useCallback, useRef } from 'react';
import type { FlowEdge, FlowNode, FlowSnapshot } from '@/lib/types';
import { useFlowStore } from '@/store';
import { composeDiagramForDisplay } from '@/services/composeDiagramForDisplay';

interface UseFlowEditorCallbacksParams {
    addTab: () => string;
    closeTab: (tabId: string) => void;
    updateTab: (tabId: string, update: Partial<{ name: string }>) => void;
    navigate: (path: string) => void;
    tabsLength: number;
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
    handleSwitchTab: (tabId: string) => void;
    handleAddTab: () => void;
    handleCloseTab: (tabId: string) => void;
    handleRenameTab: (tabId: string, newName: string) => void;
    selectAll: () => void;
    handleRestoreSnapshot: (snapshot: FlowSnapshot) => void;
    handleCommandBarApply: (newNodes: FlowNode[], newEdges: FlowEdge[]) => void;
}

export function useFlowEditorCallbacks({
    addTab,
    closeTab,
    updateTab,
    navigate,
    tabsLength,
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

    const handleSwitchTab = useCallback((tabId: string) => {
        navigate(`/flow/${tabId}`);
    }, [navigate]);

    const handleAddTab = useCallback(() => {
        const newId = addTab();
        navigate(`/flow/${newId}`);
    }, [addTab, navigate]);

    const handleCloseTab = useCallback((tabId: string) => {
        if (tabsLength === 1) {
            alert(cannotCloseLastTabMessage);
            return;
        }
        closeTab(tabId);
    }, [cannotCloseLastTabMessage, closeTab, tabsLength]);

    const handleRenameTab = useCallback((tabId: string, newName: string) => {
        updateTab(tabId, { name: newName });
    }, [updateTab]);

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
        setNodes(newNodes.map((node, index) => ({
            ...node,
            data: { ...node.data, freshlyAdded: true, animateDelay: Math.min(index * 20, 400) },
        })));
        setEdges(newEdges);
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
        handleSwitchTab,
        handleAddTab,
        handleCloseTab,
        handleRenameTab,
        selectAll,
        handleRestoreSnapshot,
        handleCommandBarApply,
    };
}
