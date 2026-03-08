import type { DiagramType, FlowEdge, FlowNode } from '@/lib/types';
import type { LayoutAlgorithm, LayoutOptions } from '@/services/elkLayout';
import { relayoutMindmapComponent, syncMindmapEdges } from '@/lib/mindmapLayout';

interface ComposeDiagramForDisplayOptions extends Pick<LayoutOptions, 'spacing'> {
    direction?: LayoutOptions['direction'];
    algorithm?: LayoutAlgorithm;
    diagramType?: DiagramType | string;
}

function isMindmapDisplayTarget(nodes: FlowNode[], diagramType?: string): boolean {
    if (diagramType === 'mindmap') {
        return nodes.some((node) => node.type === 'mindmap');
    }

    const visibleNodes = nodes.filter((node) => !node.hidden);
    return visibleNodes.length > 0 && visibleNodes.every((node) => node.type === 'mindmap');
}

function relayoutAllMindmapComponents(nodes: FlowNode[], edges: FlowEdge[]): { nodes: FlowNode[]; edges: FlowEdge[] } {
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

export async function composeDiagramForDisplay(
    nodes: FlowNode[],
    edges: FlowEdge[],
    options: ComposeDiagramForDisplayOptions = {}
): Promise<{ nodes: FlowNode[]; edges: FlowEdge[] }> {
    if (nodes.length === 0) {
        return { nodes, edges };
    }

    if (isMindmapDisplayTarget(nodes, options.diagramType)) {
        return relayoutAllMindmapComponents(nodes, edges);
    }

    const { getElkLayout } = await import('@/services/elkLayout');
    return getElkLayout(nodes, edges, {
        direction: options.direction ?? 'TB',
        algorithm: options.algorithm ?? 'layered',
        spacing: options.spacing ?? 'normal',
        diagramType: options.diagramType,
    });
}
