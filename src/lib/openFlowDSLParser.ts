
import { parseOpenFlowDslV2 } from './openFlowDslParserV2';
import type { FlowEdge, FlowNode } from './types';

export interface ParseDiagnostic {
    message: string;
    line?: number;
    snippet?: string;
    hint?: string;
}

export interface ParseResult {
    nodes: FlowNode[];
    edges: FlowEdge[];
    title?: string;
    error?: string;
    diagnostics?: ParseDiagnostic[];
}

function buildDiagnosticFromError(rawError: string, inputLines: string[]): ParseDiagnostic {
    const lineMatch = rawError.match(/^Line\s+(\d+):\s*(.+)$/);
    if (!lineMatch) {
        return { message: rawError };
    }

    const line = Number(lineMatch[1]);
    const message = lineMatch[2];
    const snippet = inputLines[line - 1]?.trim();
    let hint: string | undefined;
    const hasSpaceInId = snippet && /^\[?\w+\]?\s+\w+\s+\w/.test(snippet) && !snippet.includes(':');
    if (hasSpaceInId) {
        hint = 'Node IDs cannot contain spaces. Use underscores: my_node';
    } else if (snippet && /->/.test(snippet) && message.startsWith('Unexpected')) {
        hint = 'Edge syntax: source -> target or source -> target |label|';
    } else if (message.includes('expected identifier') || message.includes('Expected identifier')) {
        hint = 'Node format: [type] id: Label';
    } else if (message.startsWith('Unexpected')) {
        hint = 'Check block delimiters and remove extra closing braces.';
    } else if (message.startsWith('Unrecognized syntax')) {
        hint = 'Use DSL forms like `[type] id: Label`, `A -> B`, or `group "Name" { ... }`.';
    }

    return { message, line, snippet, hint };
}

function formatDiagnosticsError(diagnostics: ParseDiagnostic[]): string {
    if (diagnostics.length === 0) return 'Failed to parse DSL.';
    const first = diagnostics[0];
    const linePrefix = typeof first.line === 'number' ? `Line ${first.line}: ` : '';
    const hintSuffix = first.hint ? ` Hint: ${first.hint}` : '';
    return `${linePrefix}${first.message}${hintSuffix}`;
}

/**
 * Legacy wrapper for the V2 DSL Parser.
 * Ensures backward compatibility with the existing UI components.
 */
export const parseOpenFlowDSL = (input: string): ParseResult => {
    const result = parseOpenFlowDslV2(input);
    const inputLines = input.split('\n');
    const diagnostics = result.errors.map((error) => buildDiagnosticFromError(error, inputLines));

    if (result.nodes.length === 0 && result.errors.length === 0) {
        const noNodeDiagnostic: ParseDiagnostic = {
            message: 'No nodes found.',
            hint: 'Add at least one node, for example: [process] n1: Start',
        };
        return {
            nodes: [],
            edges: [],
            title: result.metadata?.flow || 'Untitled Flow',
            diagnostics: [noNodeDiagnostic],
            error: formatDiagnosticsError([noNodeDiagnostic]),
        };
    }

    // Map V2 result to V1 schema
    return {
        nodes: result.nodes,
        edges: result.edges,
        title: result.metadata?.flow || result.metadata?.title || 'Untitled Flow',
        diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
        error: diagnostics.length > 0 ? formatDiagnosticsError(diagnostics) : undefined,
    };
};
