import type { FlowEdge, FlowNode } from '@/lib/types';
import type { FlowTemplate } from '@/services/templates';
import type { LayoutAlgorithm } from '@/services/elkLayout';
import { relayoutMindmapComponent, syncMindmapEdges } from '@/lib/mindmapLayout';
import { buildInsertedTemplateData } from './helpers';

interface FitViewLike {
    (options?: { duration?: number; padding?: number }): void;
}

interface AutoLayoutParams {
    nodes: FlowNode[];
    edges: FlowEdge[];
    direction?: 'TB' | 'LR' | 'RL' | 'BT';
    algorithm?: LayoutAlgorithm;
    spacing?: 'compact' | 'normal' | 'loose';
    diagramType?: string;
}

interface AutoLayoutResult {
    nodes: FlowNode[];
    edges: FlowEdge[];
}

interface InsertTemplateParams {
    template: FlowTemplate;
    existingNodes: FlowNode[];
}

interface InsertedTemplateResult {
    nextNodes: FlowNode[];
    newEdges: FlowEdge[];
}

export function isMindmapAutoLayoutTarget(nodes: FlowNode[], diagramType?: string): boolean {
    if (diagramType === 'mindmap') {
        return nodes.some((node) => node.type === 'mindmap');
    }

    const visibleNodes = nodes.filter((node) => !node.hidden);
    return visibleNodes.length > 0 && visibleNodes.every((node) => node.type === 'mindmap');
}

export function relayoutAllMindmapComponents(nodes: FlowNode[], edges: FlowEdge[]): AutoLayoutResult {
    const mindmapRootIds = nodes
        .filter((node) => node.type === 'mindmap' && typeof node.data.mindmapParentId !== 'string')
        .map((node) => node.id);

    const fallbackRootIds = mindmapRootIds.length > 0
        ? mindmapRootIds
        : nodes.filter((node) => node.type === 'mindmap').map((node) => node.id);

    const layoutedNodes = fallbackRootIds.reduce(
        (currentNodes, rootId) => relayoutMindmapComponent(currentNodes, edges, rootId),
        nodes
    );

    return {
        nodes: layoutedNodes,
        edges: syncMindmapEdges(layoutedNodes, edges),
    };
}

function getLayoutHintsForDiagramType(diagramType: string | undefined): Partial<Pick<AutoLayoutParams, 'algorithm' | 'direction'>> {
    switch (diagramType) {
        case 'architecture':
        case 'infrastructure':
            return { direction: 'LR' };
        case 'org-chart':
            return { algorithm: 'mrtree', direction: 'TB' };
        default:
            return {};
    }
}

export async function getAutoLayoutResult({
    nodes,
    edges,
    direction,
    algorithm,
    spacing = 'normal',
    diagramType,
}: AutoLayoutParams): Promise<AutoLayoutResult> {
    if (isMindmapAutoLayoutTarget(nodes, diagramType)) {
        return relayoutAllMindmapComponents(nodes, edges);
    }

    const hints = getLayoutHintsForDiagramType(diagramType);
    const { getElkLayout } = await import('@/services/elkLayout');
    return getElkLayout(nodes, edges, {
        direction: direction ?? hints.direction ?? 'TB',
        algorithm: algorithm ?? hints.algorithm ?? 'layered',
        spacing,
        diagramType,
    });
}

export function buildTemplateInsertionResult({
    template,
    existingNodes,
}: InsertTemplateParams): InsertedTemplateResult {
    const { newNodes, newEdges } = buildInsertedTemplateData(template, existingNodes);
    return {
        nextNodes: [
            ...existingNodes.map((node) => ({ ...node, selected: false })),
            ...newNodes,
        ],
        newEdges,
    };
}

export function scheduleFitView(fitView: FitViewLike, duration: number, delayMs: number): void {
    window.setTimeout(() => fitView({ duration }), delayMs);
}
