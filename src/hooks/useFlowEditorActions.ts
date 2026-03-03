import { useCallback, useState } from 'react';
import type { TFunction } from 'i18next';
import type { FlowEdge, FlowNode } from '@/lib/types';
import type { FlowTemplate } from '@/services/templates';
import type { LayoutAlgorithm } from '@/services/elkLayout';
import { getElkLayout } from '@/services/elkLayout';
import { toMermaid, toPlantUML } from '@/services/exportService';
import { toFigmaSVG } from '@/services/figmaExportService';
import { toOpenFlowDSL } from '@/services/openFlowDSLExporter';
import { buildInsertedTemplateData, copyTextToClipboard } from './flow-editor-actions/helpers';

interface UseFlowEditorActionsParams {
    nodes: FlowNode[];
    edges: FlowEdge[];
    recordHistory: () => void;
    setNodes: (nodes: FlowNode[] | ((nodes: FlowNode[]) => FlowNode[])) => void;
    setEdges: (edges: FlowEdge[] | ((edges: FlowEdge[]) => FlowEdge[])) => void;
    fitView: (options?: { duration?: number; padding?: number }) => void;
    t: TFunction;
    addToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning', duration?: number) => void;
}

interface UseFlowEditorActionsResult {
    isLayouting: boolean;
    onLayout: (
        direction?: 'TB' | 'LR' | 'RL' | 'BT',
        algorithm?: LayoutAlgorithm,
        spacing?: 'compact' | 'normal' | 'loose'
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
}: UseFlowEditorActionsParams): UseFlowEditorActionsResult {
    const [isLayouting, setIsLayouting] = useState(false);

    const onLayout = useCallback(async (
        direction: 'TB' | 'LR' | 'RL' | 'BT' = 'TB',
        algorithm: LayoutAlgorithm = 'layered',
        spacing: 'compact' | 'normal' | 'loose' = 'normal'
    ): Promise<void> => {
        if (nodes.length === 0) return;
        setIsLayouting(true);
        recordHistory();

        try {
            const layoutedNodes = await getElkLayout(nodes, edges, {
                direction,
                algorithm,
                spacing,
            });
            setNodes(layoutedNodes);
            setTimeout(() => fitView({ duration: 800 }), 50);
        } catch (error) {
            console.error('ELK layout failed:', error);
        } finally {
            setIsLayouting(false);
        }
    }, [nodes, edges, recordHistory, setNodes, fitView]);

    const handleInsertTemplate = useCallback((template: FlowTemplate): void => {
        recordHistory();
        const { newNodes, newEdges } = buildInsertedTemplateData(template, nodes);

        setNodes((existingNodes) => [...existingNodes.map((node) => ({ ...node, selected: false })), ...newNodes]);
        setEdges((existingEdges) => [...existingEdges, ...newEdges]);
        setTimeout(() => fitView({ duration: 800 }), 100);
    }, [nodes, recordHistory, setNodes, setEdges, fitView]);

    const handleExportMermaid = useCallback(async (): Promise<void> => {
        const text = toMermaid(nodes, edges);
        const copied = await copyTextToClipboard(text);
        if (copied) {
            alert(t('flowEditor.mermaidCopied'));
        }
    }, [nodes, edges, t]);

    const handleExportPlantUML = useCallback(async (): Promise<void> => {
        const text = toPlantUML(nodes, edges);
        const copied = await copyTextToClipboard(text);
        if (copied) {
            alert(t('flowEditor.plantUMLCopied'));
        }
    }, [nodes, edges, t]);

    const handleExportOpenFlowDSL = useCallback(async (): Promise<void> => {
        const text = toOpenFlowDSL(nodes, edges);
        const copied = await copyTextToClipboard(text);
        if (copied) {
            addToast(t('flowEditor.dslCopied'), 'success');
        } else {
            addToast(t('flowEditor.dslCopyFailed'), 'error');
        }
    }, [nodes, edges, addToast, t]);

    const handleExportFigma = useCallback(async (): Promise<void> => {
        try {
            const svg = await toFigmaSVG(nodes, edges);
            await navigator.clipboard.writeText(svg);
            addToast(t('flowEditor.figmaCopied'), 'success');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            console.error('Failed to copy Figma SVG:', error);
            addToast(t('flowEditor.figmaExportFailed', { message }), 'error');
        }
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
