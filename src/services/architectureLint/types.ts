export type LintSeverity = 'error' | 'warning' | 'info';

export type LintRuleType = 'cannot-connect' | 'must-connect';

export interface NodeMatcher {
    /** Matches node.id exactly */
    id?: string;
    /** Matches node.data.label (case-insensitive contains) */
    labelContains?: string;
    /** Matches node.data.label (case-insensitive exact) */
    labelEquals?: string;
    /** Matches the React Flow node type (e.g. 'process', 'decision', 'start', 'end', 'section', 'group') */
    nodeType?: string;
}

export interface LintRule {
    id: string;
    description?: string;
    severity: LintSeverity;
    type: LintRuleType;
    /** For cannot-connect / must-connect: the source node matcher */
    from?: NodeMatcher;
    /** For cannot-connect / must-connect: the target node matcher */
    to?: NodeMatcher;
}

export interface LintRuleFile {
    rules: LintRule[];
}

export interface LintViolation {
    ruleId: string;
    message: string;
    severity: LintSeverity;
    /** IDs of nodes implicated in this violation */
    nodeIds: string[];
    /** IDs of edges implicated in this violation */
    edgeIds: string[];
}
