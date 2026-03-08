import type { Edge, Node } from '@/lib/reactflowCompat';
import { getNodeParentId } from '@/lib/nodeParent';
import { NODE_DEFAULTS } from '@/theme';
import { orderGraphForSerialization, type ExportSerializationMode } from './canonicalSerialization';

const TYPE_TO_DSL: Record<string, string> = {
    start: 'start',
    process: 'process',
    decision: 'decision',
    end: 'end',
    custom: 'system',
    annotation: 'note',
    section: 'section',
    browser: 'browser',
    mobile: 'mobile',
    container: 'container',
};

const NODE_ATTRIBUTE_KEYS = [
    'subLabel',
    'shape',
    'colorMode',
    'customColor',
    'align',
    'width',
    'height',
    'rotation',
    'fontSize',
    'fontFamily',
    'fontWeight',
    'fontStyle',
    'backgroundColor',
    'transparency',
    'variant',
    'layerId',
    'journeySection',
    'journeyActor',
    'journeyTask',
    'journeyScore',
    'mindmapSide',
    'mindmapBranchStyle',
    'archProvider',
    'archResourceType',
    'archEnvironment',
    'archBoundaryId',
    'archZone',
    'archTrustDomain',
] as const;

const EDGE_ATTRIBUTE_KEYS = [
    'condition',
    'strokeWidth',
    'dashPattern',
    'opacity',
    'archProtocol',
    'archPort',
    'archDirection',
    'archSourceSide',
    'archTargetSide',
    'classRelation',
    'classRelationLabel',
    'erRelation',
    'erRelationLabel',
] as const;

/**
 * Export FlowMind nodes/edges to our custom DSL V2 text format.
 */
export interface OpenFlowDSLExportOptions {
    mode?: ExportSerializationMode;
}

export interface OpenFlowDSLExportDiagnostic {
    edgeId: string;
    source: string;
    target: string;
    message: string;
}

function getStringField(data: Record<string, unknown> | undefined, key: string): string | undefined {
    const value = data?.[key];
    if (typeof value !== 'string') return undefined;
    return value;
}

function escapeDslString(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function formatDslScalar(value: string | number | boolean): string {
    if (typeof value === 'string') {
        return `"${escapeDslString(value)}"`;
    }
    return String(value);
}

function getScalarField(
    data: Record<string, unknown> | undefined,
    key: string
): string | number | boolean | undefined {
    const value = data?.[key];
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }
    return undefined;
}

export function getOpenFlowDSLExportDiagnostics(nodes: Node[], edges: Edge[]): OpenFlowDSLExportDiagnostic[] {
    const nodeIdSet = new Set(nodes.map((node) => node.id));
    const diagnostics: OpenFlowDSLExportDiagnostic[] = [];

    edges.forEach((edge) => {
        const sourceNodeExists = nodeIdSet.has(edge.source);
        const targetNodeExists = nodeIdSet.has(edge.target);
        if (sourceNodeExists && targetNodeExists) return;

        const missingParts: string[] = [];
        if (!sourceNodeExists) missingParts.push(`source "${edge.source}"`);
        if (!targetNodeExists) missingParts.push(`target "${edge.target}"`);

        diagnostics.push({
            edgeId: edge.id,
            source: edge.source,
            target: edge.target,
            message: `Edge "${edge.id}" skipped in DSL export (missing ${missingParts.join(' and ')}).`,
        });
    });

    return diagnostics;
}

export function toOpenFlowDSL(nodes: Node[], edges: Edge[], options: OpenFlowDSLExportOptions = {}): string {
    const lines: string[] = [];
    const mode = options.mode ?? 'deterministic';
    const { nodes: orderedNodes, edges: orderedEdges } = orderGraphForSerialization(nodes, edges, mode);
    const diagnosticsByEdgeId = new Set(getOpenFlowDSLExportDiagnostics(orderedNodes, orderedEdges).map((item) => item.edgeId));

    // Metadata
    lines.push('flow: "Untitled Flow"');
    lines.push('direction: TB');
    lines.push('');

    const formatAttributes = (entries: Array<[string, string | number | boolean]>): string => {
        const attrs: string[] = [];

        entries.forEach(([key, value]) => {
            attrs.push(`${key}: ${formatDslScalar(value)}`);
        });

        if (attrs.length === 0) return '';
        return ` { ${attrs.join(', ')} }`;
    };

    const collectNodeAttributeEntries = (node: Node): Array<[string, string | number | boolean]> => {
        const data = node.data as Record<string, unknown> | undefined;
        if (!data) return [];

        const entries: Array<[string, string | number | boolean]> = [];
        const defaults = NODE_DEFAULTS[node.type || 'process'] || NODE_DEFAULTS.process;

        const color = getStringField(data, 'color');
        if (color && color !== defaults.color) {
            entries.push(['color', color]);
        }

        const icon = getStringField(data, 'icon');
        if (icon && icon !== defaults.icon && icon !== 'none') {
            entries.push(['icon', icon]);
        }

        NODE_ATTRIBUTE_KEYS.forEach((key) => {
            const value = getScalarField(data, key);
            if (value === undefined) return;
            if (key === 'shape' && value === defaults.shape) return;
            entries.push([key, value]);
        });

        return entries;
    };

    const collectEdgeAttributeEntries = (edge: Edge): Array<[string, string | number | boolean]> => {
        const entries: Array<[string, string | number | boolean]> = [];
        const data = (edge.data ?? {}) as Record<string, unknown>;

        if (edge.type === 'smoothstep') {
            entries.push(['style', 'curved']);
        }

        const strokeDasharray = edge.style?.strokeDasharray;
        if (
            typeof strokeDasharray === 'string'
            && strokeDasharray.trim().length > 0
            && getScalarField(data, 'dashPattern') === undefined
        ) {
            entries.push(['style', 'dashed']);
        }

        EDGE_ATTRIBUTE_KEYS.forEach((key) => {
            const value = getScalarField(data, key);
            if (value === undefined) return;
            entries.push([key, value]);
        });

        return entries;
    };

    const parentNodes = orderedNodes.filter((n) => !getNodeParentId(n));
    const childrenByParent = new Map<string, Node[]>();
    for (const node of orderedNodes) {
        const parentId = getNodeParentId(node);
        if (!parentId) continue;
        const children = childrenByParent.get(parentId);
        if (children) {
            children.push(node);
        } else {
            childrenByParent.set(parentId, [node]);
        }
    }

    const renderedIds = new Set<string>();

    const renderNode = (node: Node, indent: string = '') => {
        if (renderedIds.has(node.id)) return;
        renderedIds.add(node.id);

        const children = childrenByParent.get(node.id) || [];

        if (children.length > 0) {
            const label = getStringField(node.data, 'label') || 'Group';
            lines.push(`${indent}group "${label}" {`);
            children.forEach((childNode) => renderNode(childNode, indent + '  '));
            lines.push(`${indent}}`);
        } else {
            const dslType = TYPE_TO_DSL[node.type || 'process'] || 'process';
            const label = getStringField(node.data, 'label') || 'Node';
            const attrs = formatAttributes(collectNodeAttributeEntries(node));

            lines.push(`${indent}[${dslType}] ${node.id}: ${label}${attrs}`);
        }
    };

    parentNodes.forEach((n) => renderNode(n));

    if (edges.length > 0) {
        lines.push('');
        lines.push('# Edges');
        for (const edge of orderedEdges) {
            if (diagnosticsByEdgeId.has(edge.id)) continue;

            const labelPart = edge.label ? `|${edge.label}|` : '';
            const attrs = formatAttributes(collectEdgeAttributeEntries(edge));
            lines.push(`${edge.source} ->${labelPart ? `${labelPart} ` : ' '}${edge.target}${attrs}`);
        }
    }

    return lines.join('\n');
}
