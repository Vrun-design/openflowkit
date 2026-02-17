
import { Node, Edge } from 'reactflow';
import { parseFlowMindDSL } from './flowmindDSLParserV2';

export interface ParseResult {
    nodes: Node[];
    edges: Edge[];
    title?: string;
    error?: string;
}

/**
 * Legacy wrapper for the V2 DSL Parser.
 * Ensures backward compatibility with the existing UI components.
 */
export const parseOpenFlowDSL = (input: string): ParseResult => {
    const result = parseFlowMindDSL(input);

    if (result.nodes.length === 0 && result.errors.length === 0) {
        return {
            nodes: [],
            edges: [],
            title: result.metadata?.flow || 'Untitled Flow',
            error: 'No nodes found. Use: [type] Label'
        };
    }

    // Map V2 result to V1 schema
    return {
        nodes: result.nodes,
        edges: result.edges,
        title: result.metadata?.flow || result.metadata?.title || 'Untitled Flow',
        error: result.errors.length > 0 ? result.errors.join('\n') : undefined
    };
};
