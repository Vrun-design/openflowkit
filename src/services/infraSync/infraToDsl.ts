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

    for (const node of result.nodes) {
        const nodeId = sanitizeNodeId(node.id);
        lines.push(`[${node.nodeType}] ${nodeId}: ${node.label}`);
    }

    if (result.nodes.length > 0) {
        lines.push('');
    }

    const edgeLines: string[] = [];
    for (const edge of result.edges) {
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
