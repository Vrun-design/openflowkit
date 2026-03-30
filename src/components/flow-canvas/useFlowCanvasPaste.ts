import { useCallback } from 'react';
import { useFlowStore } from '@/store';
import type { FlowEdge, FlowNode } from '@/lib/types';
import type { MermaidDiagnosticsSnapshot } from '@/store/types';
import { createPastedTextNode, isEditablePasteTarget, resolveLayoutDirection } from './pasteHelpers';
import { detectMermaidDiagramType } from '@/services/mermaid/detectDiagramType';
import { normalizeParseDiagnostics } from '@/services/mermaid/diagnosticFormatting';
import { parseMermaidByType } from '@/services/mermaid/parseMermaidByType';
import { assignSmartHandles } from '@/services/smartEdgeRouting';

type SetFlowNodes = (payload: FlowNode[] | ((nodes: FlowNode[]) => FlowNode[])) => void;
type SetFlowEdges = (payload: FlowEdge[] | ((edges: FlowEdge[]) => FlowEdge[])) => void;
type AddToast = (message: string, type?: 'success' | 'error' | 'info' | 'warning', duration?: number) => void;

interface UseFlowCanvasPasteParams {
    architectureStrictMode: boolean;
    activeTabId: string;
    fitView: (options?: { duration?: number; padding?: number }) => void;
    updateTab: (tabId: string, updates: Partial<{ diagramType: string }>) => void;
    recordHistory: () => void;
    setNodes: SetFlowNodes;
    setEdges: SetFlowEdges;
    setSelectedNodeId: (id: string | null) => void;
    setMermaidDiagnostics: (payload: MermaidDiagnosticsSnapshot | null) => void;
    clearMermaidDiagnostics: () => void;
    addToast: AddToast;
    strictModePasteBlockedMessage: string;
    pasteSelection: (center?: { x: number; y: number }) => void;
    getLastInteractionFlowPosition: () => { x: number; y: number } | null;
    getCanvasCenterFlowPosition: () => { x: number; y: number };
}

export function useFlowCanvasPaste({
    architectureStrictMode,
    activeTabId,
    fitView,
    updateTab,
    recordHistory,
    setNodes,
    setEdges,
    setSelectedNodeId,
    setMermaidDiagnostics,
    clearMermaidDiagnostics,
    addToast,
    strictModePasteBlockedMessage,
    pasteSelection,
    getLastInteractionFlowPosition,
    getCanvasCenterFlowPosition,
}: UseFlowCanvasPasteParams) {
    const handleCanvasPaste = useCallback(async (event: React.ClipboardEvent<HTMLDivElement>): Promise<void> => {
        if (isEditablePasteTarget(event.target)) return;

        const rawText = event.clipboardData.getData('text/plain');
        const pastedText = rawText.trim();

        if (!pastedText) {
            pasteSelection(getLastInteractionFlowPosition() ?? getCanvasCenterFlowPosition());
            return;
        }

        event.preventDefault();

        const maybeMermaidType = detectMermaidDiagramType(pastedText);
        if (maybeMermaidType) {
            const result = parseMermaidByType(pastedText, { architectureStrictMode });
            const diagnostics = normalizeParseDiagnostics(result.diagnostics);

            if (!result.error) {
                if (diagnostics.length > 0) {
                    setMermaidDiagnostics({
                        source: 'paste',
                        diagramType: result.diagramType,
                        diagnostics,
                        updatedAt: Date.now(),
                    });
                    addToast(`Imported with ${diagnostics.length} diagnostic warning(s).`, 'warning');
                } else {
                    clearMermaidDiagnostics();
                }

                recordHistory();

                if (result.nodes.length > 0) {
                    try {
                        const { getElkLayout } = await import('@/services/elkLayout');
                        const layoutDirection = resolveLayoutDirection(result);
                        const { nodes: layoutedNodes, edges: layoutedEdges } = await getElkLayout(result.nodes, result.edges, {
                            direction: layoutDirection,
                            algorithm: 'layered',
                            spacing: 'normal',
                        });
                        const smartEdges = assignSmartHandles(layoutedNodes, layoutedEdges);
                        setNodes(layoutedNodes);
                        setEdges(smartEdges);
                    } catch {
                        setNodes(result.nodes);
                        setEdges(result.edges);
                    }
                } else {
                    setNodes(result.nodes);
                    setEdges(result.edges);
                }

                if ('diagramType' in result && result.diagramType) {
                    updateTab(activeTabId, { diagramType: result.diagramType });
                }

                window.setTimeout(() => fitView({ duration: 600, padding: 0.2 }), 80);
                return;
            }

            setMermaidDiagnostics({
                source: 'paste',
                diagramType: result.diagramType ?? maybeMermaidType,
                diagnostics,
                error: result.error,
                updatedAt: Date.now(),
            });

            if (maybeMermaidType === 'architecture' && architectureStrictMode && result.error.includes('strict mode rejected')) {
                addToast(strictModePasteBlockedMessage, 'error');
                return;
            }

            addToast(result.error, 'error');
            return;
        }

        const pasteFlowPosition =
            getLastInteractionFlowPosition() ?? getCanvasCenterFlowPosition();

        recordHistory();
        const { activeLayerId } = useFlowStore.getState();
        const newTextNode = createPastedTextNode(pastedText, pasteFlowPosition, activeLayerId);

        setNodes((existingNodes) => [
            ...existingNodes.map((node) => ({ ...node, selected: false })),
            { ...newTextNode, selected: true },
        ]);
        setSelectedNodeId(newTextNode.id);
    }, [
        activeTabId,
        addToast,
        architectureStrictMode,
        clearMermaidDiagnostics,
        fitView,
        getCanvasCenterFlowPosition,
        pasteSelection,
        getLastInteractionFlowPosition,
        recordHistory,
        setEdges,
        setMermaidDiagnostics,
        setNodes,
        setSelectedNodeId,
        strictModePasteBlockedMessage,
        updateTab,
    ]);

    return {
        handleCanvasPaste,
    };
}
