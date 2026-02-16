import { Node, Edge } from 'reactflow';

const TYPE_TO_DSL: Record<string, string> = {
    start: 'start',
    process: 'process',
    decision: 'decision',
    end: 'end',
    custom: 'system',
    annotation: 'note',
    section: 'section',
};

/**
 * Export FlowMind nodes/edges to our custom DSL text format.
 */
export const toOpenFlowDSL = (nodes: Node[], edges: Edge[]): string => {
    const lines: string[] = [];

    lines.push('flow: "Untitled Flow"');
    lines.push('direction: TB');
    lines.push('');

    // Node declarations
    for (const node of nodes) {
        if (node.type === 'section') continue; // skip sections in DSL for now
        const dslType = TYPE_TO_DSL[node.type || 'process'] || 'process';
        const label = node.data?.label || 'Node';
        lines.push(`[${dslType}] ${label}`);
    }

    if (edges.length > 0) {
        lines.push('');
        // Edge declarations
        for (const edge of edges) {
            const sourceNode = nodes.find((n) => n.id === edge.source);
            const targetNode = nodes.find((n) => n.id === edge.target);
            if (!sourceNode || !targetNode) continue;

            const sourceLabel = sourceNode.data?.label || 'Node';
            const targetLabel = targetNode.data?.label || 'Node';

            if (edge.label) {
                lines.push(`${sourceLabel} ->|${edge.label}| ${targetLabel}`);
            } else {
                lines.push(`${sourceLabel} -> ${targetLabel}`);
            }
        }
    }

    return lines.join('\n');
};
