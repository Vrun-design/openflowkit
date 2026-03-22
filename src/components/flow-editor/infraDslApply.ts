import { parseDslOrThrow } from '@/hooks/ai-generation/graphComposer';
import type { FlowEdge, FlowNode } from '@/lib/types';

export type InfraDslApplyResult =
    | {
        status: 'success';
        nodes: FlowNode[];
        edges: FlowEdge[];
    }
    | {
        status: 'error';
        message: string;
    };

export function parseInfraDslApplyInput(dsl: string): InfraDslApplyResult {
    try {
        const { nodes, edges } = parseDslOrThrow(dsl);
        return {
            status: 'success',
            nodes,
            edges,
        };
    } catch (error) {
        const message = error instanceof Error && error.message.trim().length > 0
            ? error.message
            : 'The generated infrastructure DSL could not be parsed.';
        return {
            status: 'error',
            message,
        };
    }
}
