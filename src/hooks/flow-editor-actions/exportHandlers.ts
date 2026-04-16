import type { TFunction } from 'i18next';
import { createLogger } from '@/lib/logger';
import type { FlowEdge, FlowNode } from '@/lib/types';
import { toMermaid, toPlantUML } from '@/services/exportService';
import { toFigmaSVG } from '@/services/figmaExportService';
import { getOpenFlowDSLExportDiagnostics, toOpenFlowDSL } from '@/services/openFlowDSLExporter';
import type { ExportSerializationMode } from '@/services/canonicalSerialization';
import { buildExportFileName, buildVariantExportFileName } from '@/lib/exportFileName';
import { copyTextToClipboard } from './helpers';

const logger = createLogger({ scope: 'exportHandlers' });

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ExportFlowTextParams {
    text: string;
    successMessage: string;
    processingMessage: string;
    errorMessage: string;
    addToast: (message: string, type?: ToastType, duration?: number) => void;
}

interface DownloadTextFileParams {
    text: string;
    fileName: string;
    mimeType?: string;
    processingMessage: string;
    successMessage: string;
    errorMessage: string;
    addToast: (message: string, type?: ToastType, duration?: number) => void;
}

interface ExportFlowDiagramParams {
    nodes: FlowNode[];
    edges: FlowEdge[];
    t: TFunction;
}

interface ExportOpenFlowDSLParams extends ExportFlowDiagramParams {
    addToast: (message: string, type?: ToastType, duration?: number) => void;
    exportSerializationMode: ExportSerializationMode;
    baseFileName?: string;
}

interface ExportFigmaParams extends ExportFlowDiagramParams {
    addToast: (message: string, type?: ToastType, duration?: number) => void;
    baseFileName?: string;
}

async function copySvgToClipboard(svg: string): Promise<boolean> {
    const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
    let clipboardError: unknown;

    if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
        try {
            await navigator.clipboard.write([
                new ClipboardItem({
                    'image/svg+xml': svgBlob,
                    'text/plain': new Blob([svg], { type: 'text/plain' }),
                }),
            ]);
            return true;
        } catch (error) {
            clipboardError = error;
        }
    }

    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(svg);
        return true;
    }

    if (clipboardError) {
        throw clipboardError;
    }

    return copyTextToClipboard(svg);
}

async function exportFlowTextToClipboard({
    text,
    successMessage,
    processingMessage,
    errorMessage,
    addToast,
}: ExportFlowTextParams): Promise<void> {
    addToast(processingMessage, 'info');
    const copied = await copyTextToClipboard(text);
    if (copied) {
        addToast(successMessage, 'success');
        return;
    }

    addToast(errorMessage, 'error');
}

function downloadTextFile({
    text,
    fileName,
    mimeType = 'text/plain;charset=utf-8',
    processingMessage,
    successMessage,
    errorMessage,
    addToast,
}: DownloadTextFileParams): void {
    addToast(processingMessage, 'info');

    try {
        const blob = new Blob([text], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = fileName;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        addToast(successMessage, 'success');
    } catch (error) {
        logger.error('Text file download failed.', { error, fileName });
        addToast(errorMessage, 'error');
    }
}

export async function exportMermaidToClipboard({
    nodes,
    edges,
    t,
    addToast,
}: ExportFlowDiagramParams & Pick<ExportOpenFlowDSLParams, 'addToast'>): Promise<void> {
    await exportFlowTextToClipboard({
        text: toMermaid(nodes, edges),
        successMessage: t('flowEditor.mermaidCopied'),
        processingMessage: 'Copying Mermaid…',
        errorMessage: 'Failed to copy Mermaid.',
        addToast,
    });
}

export function downloadMermaidToFile({
    nodes,
    edges,
    addToast,
    baseFileName,
}: Omit<ExportFlowDiagramParams, 't'> & Pick<ExportOpenFlowDSLParams, 'addToast' | 'baseFileName'>): void {
    downloadTextFile({
        text: toMermaid(nodes, edges),
        fileName: buildExportFileName(baseFileName, 'mmd'),
        processingMessage: 'Preparing Mermaid download…',
        successMessage: 'Mermaid downloaded.',
        errorMessage: 'Failed to download Mermaid.',
        addToast,
    });
}

export async function exportPlantUMLToClipboard({
    nodes,
    edges,
    t,
    addToast,
}: ExportFlowDiagramParams & Pick<ExportOpenFlowDSLParams, 'addToast'>): Promise<void> {
    await exportFlowTextToClipboard({
        text: toPlantUML(nodes, edges),
        successMessage: t('flowEditor.plantUMLCopied'),
        processingMessage: 'Copying PlantUML…',
        errorMessage: 'Failed to copy PlantUML.',
        addToast,
    });
}

export function downloadPlantUMLToFile({
    nodes,
    edges,
    addToast,
    baseFileName,
}: Omit<ExportFlowDiagramParams, 't'> & Pick<ExportOpenFlowDSLParams, 'addToast' | 'baseFileName'>): void {
    downloadTextFile({
        text: toPlantUML(nodes, edges),
        fileName: buildExportFileName(baseFileName, 'puml'),
        processingMessage: 'Preparing PlantUML download…',
        successMessage: 'PlantUML downloaded.',
        errorMessage: 'Failed to download PlantUML.',
        addToast,
    });
}

export async function exportOpenFlowDSLToClipboard({
    nodes,
    edges,
    addToast,
    t,
    exportSerializationMode,
}: ExportOpenFlowDSLParams): Promise<void> {
    addToast('Copying OpenFlow DSL…', 'info');
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

export function downloadOpenFlowDSLToFile({
    nodes,
    edges,
    exportSerializationMode,
    addToast,
    baseFileName,
}: Pick<ExportOpenFlowDSLParams, 'nodes' | 'edges' | 'exportSerializationMode' | 'addToast' | 'baseFileName'>): void {
    downloadTextFile({
        text: toOpenFlowDSL(nodes, edges, { mode: exportSerializationMode }),
        fileName: buildExportFileName(baseFileName, 'ofk'),
        processingMessage: 'Preparing OpenFlow DSL download…',
        successMessage: 'OpenFlow DSL downloaded.',
        errorMessage: 'Failed to download OpenFlow DSL.',
        addToast,
    });
}

export async function exportFigmaToClipboard({
    nodes,
    edges,
    addToast,
    t,
}: ExportFigmaParams): Promise<void> {
    try {
        addToast('Copying Figma SVG…', 'info');
        const svg = await toFigmaSVG(nodes, edges);
        const copied = await copySvgToClipboard(svg);
        if (!copied) {
            throw new Error('Clipboard access was unavailable.');
        }

        addToast(t('flowEditor.figmaCopied'), 'success');
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('Failed to copy Figma SVG.', { error });
        addToast(t('flowEditor.figmaExportFailed', { message }), 'error');
    }
}

export async function downloadFigmaToFile({
    nodes,
    edges,
    addToast,
    t,
    baseFileName,
}: ExportFigmaParams): Promise<void> {
    try {
        const svg = await toFigmaSVG(nodes, edges);
        downloadTextFile({
            text: svg,
            fileName: buildVariantExportFileName(baseFileName, 'figma', 'svg'),
            mimeType: 'image/svg+xml;charset=utf-8',
            processingMessage: 'Preparing Figma SVG download…',
            successMessage: 'Figma SVG downloaded.',
            errorMessage: 'Failed to download Figma SVG.',
            addToast,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('Failed to download Figma SVG.', { error });
        addToast(t('flowEditor.figmaExportFailed', { message }), 'error');
    }
}
