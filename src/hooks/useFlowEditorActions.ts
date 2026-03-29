import { startTransition, useCallback, useState } from 'react';
import type { TFunction } from 'i18next';
import { createLogger } from '@/lib/logger';
import type { FlowEdge, FlowNode } from '@/lib/types';
import { captureAnalyticsEvent } from '@/services/analytics/analytics';
import type { FlowTemplate } from '@/services/templates';
import type { LayoutAlgorithm } from '@/services/elkLayout';
import type { ExportSerializationMode } from '@/services/canonicalSerialization';
import {
    downloadFigmaToFile,
    downloadMermaidToFile,
    downloadOpenFlowDSLToFile,
    downloadPlantUMLToFile,
    exportFigmaToClipboard,
    exportMermaidToClipboard,
    exportOpenFlowDSLToClipboard,
    exportPlantUMLToClipboard,
} from './flow-editor-actions/exportHandlers';
import { toOpenFlowDSL } from '@/services/openFlowDSLExporter';
import { encodeDslForViewer } from '@/components/DiagramViewer';
import {
    buildTemplateInsertionResult,
    getAutoLayoutResult,
    scheduleFitView,
} from './flow-editor-actions/layoutHandlers';
import { recordOnboardingEvent } from '@/services/onboarding/events';

const logger = createLogger({ scope: 'useFlowEditorActions' });

interface UseFlowEditorActionsParams {
    nodes: FlowNode[];
    edges: FlowEdge[];
    activePageName?: string;
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
    handleDownloadMermaid: () => void;
    handleExportPlantUML: () => Promise<void>;
    handleDownloadPlantUML: () => void;
    handleExportOpenFlowDSL: () => Promise<void>;
    handleDownloadOpenFlowDSL: () => void;
    handleExportFigma: () => Promise<void>;
    handleDownloadFigma: () => Promise<void>;
    handleShare: () => void;
    shareViewerUrl: string | null;
    clearShareViewerUrl: () => void;
}

export function useFlowEditorActions({
    nodes,
    edges,
    activePageName,
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
            await new Promise<void>((resolve) => {
                window.requestAnimationFrame(() => resolve());
            });

            const { nodes: layoutedNodes, edges: layoutedEdges } = await getAutoLayoutResult({
                nodes,
                edges,
                direction,
                algorithm,
                spacing,
                diagramType,
            });
            startTransition(() => {
                setNodes(layoutedNodes);
                setEdges(layoutedEdges);
            });
            scheduleFitView(fitView, 800, 50);
        } catch (error) {
            logger.error('ELK layout failed.', { error });
        } finally {
            setIsLayouting(false);
        }
    }, [nodes, edges, recordHistory, setNodes, setEdges, fitView]);

    const handleInsertTemplate = useCallback((template: FlowTemplate): void => {
        recordHistory();
        recordOnboardingEvent('template_inserted', {
            templateId: template.id,
            category: template.category,
        });
        captureAnalyticsEvent('template_used', {
            template_id: template.id,
            template_category: template.category,
        });
        const { nextNodes, newEdges } = buildTemplateInsertionResult({
            template,
            existingNodes: nodes,
        });

        setNodes(nextNodes);
        setEdges((existingEdges) => [...existingEdges, ...newEdges]);
        scheduleFitView(fitView, 800, 100);
    }, [nodes, recordHistory, setNodes, setEdges, fitView]);

    const handleExportMermaid = useCallback(async (): Promise<void> => {
        await exportMermaidToClipboard({ nodes, edges, t, addToast });
    }, [nodes, edges, t, addToast]);

    const handleDownloadMermaid = useCallback((): void => {
        downloadMermaidToFile({ nodes, edges, addToast, baseFileName: activePageName });
    }, [nodes, edges, addToast, activePageName]);

    const handleExportPlantUML = useCallback(async (): Promise<void> => {
        await exportPlantUMLToClipboard({ nodes, edges, t, addToast });
    }, [nodes, edges, t, addToast]);

    const handleDownloadPlantUML = useCallback((): void => {
        downloadPlantUMLToFile({ nodes, edges, addToast, baseFileName: activePageName });
    }, [nodes, edges, addToast, activePageName]);

    const handleExportOpenFlowDSL = useCallback(async (): Promise<void> => {
        await exportOpenFlowDSLToClipboard({
            nodes,
            edges,
            addToast,
            t,
            exportSerializationMode,
        });
    }, [nodes, edges, addToast, t, exportSerializationMode]);

    const handleDownloadOpenFlowDSL = useCallback((): void => {
        downloadOpenFlowDSLToFile({
            nodes,
            edges,
            exportSerializationMode,
            addToast,
            baseFileName: activePageName,
        });
    }, [nodes, edges, exportSerializationMode, addToast, activePageName]);

    const handleExportFigma = useCallback(async (): Promise<void> => {
        await exportFigmaToClipboard({ nodes, edges, addToast, t });
    }, [nodes, edges, addToast, t]);

    const handleDownloadFigma = useCallback(async (): Promise<void> => {
        await downloadFigmaToFile({ nodes, edges, addToast, t, baseFileName: activePageName });
    }, [nodes, edges, addToast, t, activePageName]);

    const [shareViewerUrl, setShareViewerUrl] = useState<string | null>(null);

    const handleShare = useCallback((): void => {
        if (nodes.length === 0) return;
        const dsl = toOpenFlowDSL(nodes, edges, { mode: exportSerializationMode });
        const encoded = encodeDslForViewer(dsl);
        const url = `${window.location.origin}/#/view?flow=${encoded}`;
        setShareViewerUrl(url);
        recordOnboardingEvent('first_share_opened', { surface: 'editor' });
        captureAnalyticsEvent('share_opened', { surface: 'editor' });
    }, [nodes, edges, exportSerializationMode]);

    const clearShareViewerUrl = useCallback((): void => setShareViewerUrl(null), []);

    return {
        isLayouting,
        onLayout,
        handleInsertTemplate,
        handleExportMermaid,
        handleDownloadMermaid,
        handleExportPlantUML,
        handleDownloadPlantUML,
        handleExportOpenFlowDSL,
        handleDownloadOpenFlowDSL,
        handleExportFigma,
        handleDownloadFigma,
        handleShare,
        shareViewerUrl,
        clearShareViewerUrl,
    };
}
