import { useCallback, useState } from 'react';
import type { TFunction } from 'i18next';
import type { FlowEdge, FlowNode } from '@/lib/types';
import type { FlowTemplate } from '@/services/templates';
import type { LayoutAlgorithm } from '@/services/elkLayout';
import type { ExportSerializationMode } from '@/services/canonicalSerialization';
import {
    exportFigmaToClipboard,
    exportMermaidToClipboard,
    exportOpenFlowDSLToClipboard,
    exportPlantUMLToClipboard,
} from './flow-editor-actions/exportHandlers';
import {
    buildTemplateInsertionResult,
    getAutoLayoutResult,
    scheduleFitView,
} from './flow-editor-actions/layoutHandlers';

interface UseFlowEditorActionsParams {
    nodes: FlowNode[];
    edges: FlowEdge[];
    recordHistory: () => void;
    setNodes: (nodes: FlowNode[] | ((nodes: FlowNode[]) => FlowNode[])) => void;
    setEdges: (edges: FlowEdge[] | ((edges: FlowEdge[]) => FlowEdge[])) => void;
    fitView: (options?: { duration?: number; padding?: number }) => void;
    t: TFunction;
    addToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning', duration?: number) => void;
    exportSerializationMode: ExportSerializationMode;
}

interface UseFlowEditorActionsResult {
    isLayouting: boolean;
    onLayout: (
        direction?: 'TB' | 'LR' | 'RL' | 'BT',
        algorithm?: LayoutAlgorithm,
        spacing?: 'compact' | 'normal' | 'loose',
        diagramType?: string
    ) => Promise<void>;
    handleInsertTemplate: (template: FlowTemplate) => void;
    handleExportMermaid: () => Promise<void>;
    handleExportPlantUML: () => Promise<void>;
    handleExportOpenFlowDSL: () => Promise<void>;
    handleExportFigma: () => Promise<void>;
}

export function useFlowEditorActions({
    nodes,
    edges,
    recordHistory,
    setNodes,
    setEdges,
    fitView,
    t,
    addToast,
    exportSerializationMode,
}: UseFlowEditorActionsParams): UseFlowEditorActionsResult {
    const [isLayouting, setIsLayouting] = useState(false);

    const onLayout = useCallback(async (
        direction: 'TB' | 'LR' | 'RL' | 'BT' = 'TB',
        algorithm: LayoutAlgorithm = 'layered',
        spacing: 'compact' | 'normal' | 'loose' = 'normal',
        diagramType?: string
    ): Promise<void> => {
        if (nodes.length === 0) return;
        setIsLayouting(true);
        recordHistory();

        try {
            const { nodes: layoutedNodes, edges: layoutedEdges } = await getAutoLayoutResult({
                nodes,
                edges,
                direction,
                algorithm,
                spacing,
                diagramType,
            });
            setNodes(layoutedNodes);
            setEdges(layoutedEdges);
            scheduleFitView(fitView, 800, 50);
        } catch (error) {
            console.error('ELK layout failed:', error);
        } finally {
            setIsLayouting(false);
        }
    }, [nodes, edges, recordHistory, setNodes, setEdges, fitView]);

    const handleInsertTemplate = useCallback((template: FlowTemplate): void => {
        recordHistory();
        const { nextNodes, newEdges } = buildTemplateInsertionResult({
            template,
            existingNodes: nodes,
        });

        setNodes(nextNodes);
        setEdges((existingEdges) => [...existingEdges, ...newEdges]);
        scheduleFitView(fitView, 800, 100);
    }, [nodes, recordHistory, setNodes, setEdges, fitView]);

    const handleExportMermaid = useCallback(async (): Promise<void> => {
        await exportMermaidToClipboard({ nodes, edges, t });
    }, [nodes, edges, t]);

    const handleExportPlantUML = useCallback(async (): Promise<void> => {
        await exportPlantUMLToClipboard({ nodes, edges, t });
    }, [nodes, edges, t]);

    const handleExportOpenFlowDSL = useCallback(async (): Promise<void> => {
        await exportOpenFlowDSLToClipboard({
            nodes,
            edges,
            addToast,
            t,
            exportSerializationMode,
        });
    }, [nodes, edges, addToast, t, exportSerializationMode]);

    const handleExportFigma = useCallback(async (): Promise<void> => {
        await exportFigmaToClipboard({ nodes, edges, addToast, t });
    }, [nodes, edges, addToast, t]);

    return {
        isLayouting,
        onLayout,
        handleInsertTemplate,
        handleExportMermaid,
        handleExportPlantUML,
        handleExportOpenFlowDSL,
        handleExportFigma,
    };
}
