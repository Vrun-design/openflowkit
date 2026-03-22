import type { InfraSyncResult, ParsedInfraEdge, ParsedInfraNode } from './types';

function sanitizeNodeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

export function infraSyncResultToDsl(result: InfraSyncResult, flowTitle?: string): string {
    const title = flowTitle ?? 'Infrastructure';
    const lines: string[] = [];

    lines.push(`flow: "${title}"`);
    lines.push('direction: LR');
    lines.push('');

    const sectionNodes = result.nodes.filter((n) => n.nodeType === 'section');
    const nonSectionNodes = result.nodes.filter((n) => n.nodeType !== 'section');

    // Build a set of children per section: non-section nodes that have an edge FROM a section TO them
    const sectionEdges = new Map<string, Set<string>>();
    for (const section of sectionNodes) {
        sectionEdges.set(section.id, new Set());
    }

    const sectionEdgeSet = new Set<string>();
    for (const edge of result.edges) {
        const fromNode = result.nodes.find((n) => n.id === edge.from);
        const toNode = result.nodes.find((n) => n.id === edge.to);
        if (fromNode?.nodeType === 'section' && toNode) {
            const children = sectionEdges.get(fromNode.id);
            if (children) {
                children.add(toNode.id);
                sectionEdgeSet.add(`${edge.from}->${edge.to}`);
            }
        }
    }

    // Render section nodes with their children
    const renderedNodeIds = new Set<string>();

    for (const section of sectionNodes) {
        const sectionId = sanitizeNodeId(section.id);
        lines.push(`[section] ${sectionId}: ${section.label}`);
        renderedNodeIds.add(section.id);

        const children = sectionEdges.get(section.id) ?? new Set();
        for (const childId of children) {
            const child = result.nodes.find((n) => n.id === childId);
            if (!child) continue;
            const childNodeId = sanitizeNodeId(child.id);
            lines.push(`  [${child.nodeType}] ${childNodeId}: ${child.label}`);
            renderedNodeIds.add(child.id);
        }

        lines.push('');
    }

    // Render remaining non-section nodes that haven't been rendered yet
    const remaining = nonSectionNodes.filter((n) => !renderedNodeIds.has(n.id));
    for (const node of remaining) {
        const nodeId = sanitizeNodeId(node.id);
        lines.push(`[${node.nodeType}] ${nodeId}: ${node.label}`);
        renderedNodeIds.add(node.id);
    }

    if (remaining.length > 0) {
        lines.push('');
    }

    // Render edges, skipping section→child edges (already implied by indentation)
    const edgeLines: string[] = [];
    for (const edge of result.edges) {
        const edgeKey = `${edge.from}->${edge.to}`;
        if (sectionEdgeSet.has(edgeKey)) continue;

        const from = sanitizeNodeId(edge.from);
        const to = sanitizeNodeId(edge.to);
        if (edge.label) {
            edgeLines.push(`${from} -> ${to} |${edge.label}|`);
        } else {
            edgeLines.push(`${from} -> ${to}`);
        }
    }

    if (edgeLines.length > 0) {
        lines.push(...edgeLines);
    }

    return lines.join('\n').trimEnd();
}

export function infraSyncResultSummary(result: InfraSyncResult): string {
    const typeCounts = new Map<string, number>();
    for (const node of result.nodes) {
        const count = typeCounts.get(node.resourceType) ?? 0;
        typeCounts.set(node.resourceType, count + 1);
    }

    const parts: string[] = [];
    for (const [type, count] of typeCounts) {
        const shortType = type.split('_').slice(-1)[0];
        parts.push(`${count} ${shortType}${count > 1 ? 's' : ''}`);
    }

    if (parts.length === 0) return 'No resources detected';
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
    const last = parts.pop();
    return `${parts.slice(0, 4).join(', ')}, and ${last}`;
}

export type { ParsedInfraNode, ParsedInfraEdge };
