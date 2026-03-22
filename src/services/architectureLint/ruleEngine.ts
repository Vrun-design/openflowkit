import type { FlowEdge, FlowNode } from '@/lib/types';
import type { LintRule, LintViolation, NodeMatcher } from './types';

function matchesNode(node: FlowNode, matcher: NodeMatcher | undefined): boolean {
    if (!matcher) return true;

    if (matcher.id !== undefined && node.id !== matcher.id) return false;

    const label = typeof node.data.label === 'string' ? node.data.label : '';

    if (matcher.labelEquals !== undefined && label.toLowerCase() !== matcher.labelEquals.toLowerCase()) return false;

    if (matcher.labelContains !== undefined && !label.toLowerCase().includes(matcher.labelContains.toLowerCase())) return false;

    if (matcher.nodeType !== undefined && node.type !== matcher.nodeType) return false;

    return true;
}

function evaluateCannotConnect(rule: LintRule, nodes: FlowNode[], edges: FlowEdge[]): LintViolation[] {
    const violations: LintViolation[] = [];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    for (const edge of edges) {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (!source || !target) continue;
        if (matchesNode(source, rule.from) && matchesNode(target, rule.to)) {
            const fromLabel = source.data.label || source.id;
            const toLabel = target.data.label || target.id;
            violations.push({
                ruleId: rule.id,
                message: rule.description ?? `"${fromLabel}" cannot connect to "${toLabel}"`,
                severity: rule.severity,
                nodeIds: [source.id, target.id],
                edgeIds: [edge.id],
            });
        }
    }

    return violations;
}

function evaluateMustConnect(rule: LintRule, nodes: FlowNode[], edges: FlowEdge[]): LintViolation[] {
    const violations: LintViolation[] = [];
    const fromNodes = nodes.filter((n) => matchesNode(n, rule.from));

    for (const fromNode of fromNodes) {
        const hasConnection = edges.some((edge) => {
            if (edge.source !== fromNode.id) return false;
            const target = nodes.find((n) => n.id === edge.target);
            return target ? matchesNode(target, rule.to) : false;
        });

        if (!hasConnection) {
            const fromLabel = fromNode.data.label || fromNode.id;
            violations.push({
                ruleId: rule.id,
                message: rule.description ?? `"${fromLabel}" must connect to a matching node`,
                severity: rule.severity,
                nodeIds: [fromNode.id],
                edgeIds: [],
            });
        }
    }

    return violations;
}

export function evaluateRules(nodes: FlowNode[], edges: FlowEdge[], rules: LintRule[]): LintViolation[] {
    const violations: LintViolation[] = [];

    for (const rule of rules) {
        switch (rule.type) {
            case 'cannot-connect':
                violations.push(...evaluateCannotConnect(rule, nodes, edges));
                break;
            case 'must-connect':
                violations.push(...evaluateMustConnect(rule, nodes, edges));
                break;
        }
    }

    return violations;
}

export function parseRulesJson(json: string | undefined | null): { rules: LintRule[]; error: string | null } {
    if (!json?.trim()) return { rules: [], error: null };

    try {
        const parsed: unknown = JSON.parse(json);
        if (typeof parsed !== 'object' || parsed === null || !Array.isArray((parsed as { rules?: unknown }).rules)) {
            return { rules: [], error: 'Expected { "rules": [...] }' };
        }
        const rules = (parsed as { rules: LintRule[] }).rules;
        return { rules, error: null };
    } catch (e) {
        return { rules: [], error: e instanceof Error ? e.message : 'Invalid JSON' };
    }
}
