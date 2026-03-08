import type { TFunction } from 'i18next';
import type { FlowEdge, FlowNode } from '@/lib/types';
import { toMermaid, toPlantUML } from '@/services/exportService';
import { toFigmaSVG } from '@/services/figmaExportService';
import { getOpenFlowDSLExportDiagnostics, toOpenFlowDSL } from '@/services/openFlowDSLExporter';
import type { ExportSerializationMode } from '@/services/canonicalSerialization';
import { copyTextToClipboard } from './helpers';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ExportFlowTextParams {
    text: string;
    successMessage: string;
}

interface ExportFlowDiagramParams {
    nodes: FlowNode[];
    edges: FlowEdge[];
    t: TFunction;
}

interface ExportOpenFlowDSLParams extends ExportFlowDiagramParams {
    addToast: (message: string, type?: ToastType, duration?: number) => void;
    exportSerializationMode: ExportSerializationMode;
}

interface ExportFigmaParams extends ExportFlowDiagramParams {
    addToast: (message: string, type?: ToastType, duration?: number) => void;
}

async function exportFlowTextToClipboard({
    text,
    successMessage,
}: ExportFlowTextParams): Promise<void> {
    const copied = await copyTextToClipboard(text);
    if (copied) {
        alert(successMessage);
    }
}

export async function exportMermaidToClipboard({
    nodes,
    edges,
    t,
}: ExportFlowDiagramParams): Promise<void> {
    await exportFlowTextToClipboard({
        text: toMermaid(nodes, edges),
        successMessage: t('flowEditor.mermaidCopied'),
    });
}

export async function exportPlantUMLToClipboard({
    nodes,
    edges,
    t,
}: ExportFlowDiagramParams): Promise<void> {
    await exportFlowTextToClipboard({
        text: toPlantUML(nodes, edges),
        successMessage: t('flowEditor.plantUMLCopied'),
    });
}

export async function exportOpenFlowDSLToClipboard({
    nodes,
    edges,
    addToast,
    t,
    exportSerializationMode,
}: ExportOpenFlowDSLParams): Promise<void> {
    const exportDiagnostics = getOpenFlowDSLExportDiagnostics(nodes, edges);
    const text = toOpenFlowDSL(nodes, edges, { mode: exportSerializationMode });
    const copied = await copyTextToClipboard(text);
    if (copied) {
        addToast(t('flowEditor.dslCopied'), 'success');
        if (exportDiagnostics.length > 0) {
            const warningMessage = t(
                'flowEditor.dslExportSkippedEdges',
                { count: exportDiagnostics.length, defaultValue: '{{count}} invalid edge(s) were skipped in DSL export.' }
            );
            addToast(warningMessage, 'warning');
        }
        return;
    }

    addToast(t('flowEditor.dslCopyFailed'), 'error');
}

export async function exportFigmaToClipboard({
    nodes,
    edges,
    addToast,
    t,
}: ExportFigmaParams): Promise<void> {
    try {
        const svg = await toFigmaSVG(nodes, edges);
        await navigator.clipboard.writeText(svg);
        addToast(t('flowEditor.figmaCopied'), 'success');
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Failed to copy Figma SVG:', error);
        addToast(t('flowEditor.figmaExportFailed', { message }), 'error');
    }
}
