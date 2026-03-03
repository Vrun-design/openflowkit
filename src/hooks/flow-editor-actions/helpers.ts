import { getRectOfNodes } from 'reactflow';
import { createId } from '@/lib/id';
import type { FlowEdge, FlowNode } from '@/lib/types';
import type { FlowTemplate } from '@/services/templates';

interface TemplateInsertionResult {
    newNodes: FlowNode[];
    newEdges: FlowEdge[];
}

export function buildInsertedTemplateData(
    template: FlowTemplate,
    existingNodes: FlowNode[]
): TemplateInsertionResult {
    const bounds = getRectOfNodes(existingNodes);
    const startX = (bounds.width || 0) + (bounds.x || 0) + 100;
    const startY = bounds.y || 0;

    const newNodes = template.nodes.map((node) => {
        return {
            ...node,
            id: createId(node.id),
            position: { x: node.position.x + startX, y: node.position.y + startY },
            selected: false,
        };
    });

    const idMap = new Map<string, string>();
    template.nodes.forEach((node, index) => {
        idMap.set(node.id, newNodes[index].id);
    });

    const newEdges = template.edges.map((edge) => {
        return {
            ...edge,
            id: createId(edge.id),
            source: idMap.get(edge.source) || edge.source,
            target: idMap.get(edge.target) || edge.target,
        };
    });

    return { newNodes, newEdges };
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}
