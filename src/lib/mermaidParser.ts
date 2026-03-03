import { MarkerType } from 'reactflow';
import type React from 'react';
import { createId } from './id';
import {
    ARROW_PATTERNS,
    CLASS_DEF_RE,
    parseEdgeLine,
    parseLinkStyleLine,
    parseNodeDeclaration,
    parseStyleString,
    RawNode,
    SKIP_PATTERNS,
    STYLE_RE,
    normalizeEdgeLabels,
    normalizeMultilineStrings,
} from './mermaidParserHelpers';
import type { FlowEdge, FlowNode } from './types';

const EDGE_STYLE: React.CSSProperties = { stroke: '#94a3b8', strokeWidth: 2 };
const EDGE_LABEL_STYLE: React.CSSProperties = { fill: '#334155', fontWeight: 500, fontSize: 12 };
const EDGE_LABEL_BG_STYLE: React.CSSProperties = { fill: '#ffffff', stroke: '#cbd5e1', strokeWidth: 1 };

const DEFAULT_EDGE_OPTIONS = {
    type: 'smoothstep' as const,
    markerEnd: { type: MarkerType.ArrowClosed },
    animated: true,
    style: EDGE_STYLE,
    labelStyle: EDGE_LABEL_STYLE,
    labelBgStyle: EDGE_LABEL_BG_STYLE,
    labelBgPadding: [8, 4] as [number, number],
    labelBgBorderRadius: 4,
};

const NODE_TYPE_DEFAULTS: Record<string, string> = {
    start: 'emerald',
    end: 'red',
    decision: 'amber',
    custom: 'violet',
    process: 'slate',
};

function createDefaultEdge(source: string, target: string, label?: string, id?: string) {
    return {
        id: id || createId(`e-${source}-${target}`),
        source,
        target,
        label,
        ...DEFAULT_EDGE_OPTIONS,
    };
}

function getDefaultColor(type: string): string {
    return NODE_TYPE_DEFAULTS[type] || 'slate';
}

export interface ParseResult {
    nodes: FlowNode[];
    edges: FlowEdge[];
    error?: string;
    direction?: 'TB' | 'LR' | 'RL' | 'BT';
}

export function parseMermaid(input: string): ParseResult {
    let processed = input.replace(/\r\n/g, '\n');
    processed = normalizeMultilineStrings(processed);
    processed = normalizeEdgeLabels(processed);

    const lines = processed.split('\n');
    const nodesMap = new Map<string, RawNode>();
    const rawEdges: Array<{ source: string; target: string; label: string; arrowType: string }> = [];
    const linkStyles = new Map<number, Record<string, string>>();
    const classDefs = new Map<string, Record<string, string>>();

    let direction: 'TB' | 'LR' | 'RL' | 'BT' = 'TB';
    let diagramType: 'flowchart' | 'stateDiagram' | 'unknown' = 'unknown';
    const parentStack: string[] = [];
    let stateStartIdCounter = 0;

    function registerNode(raw: string, type: 'process' | 'state' = 'process', forceLabel?: string): string | null {
        let parsed = parseNodeDeclaration(raw);

        if (raw === '[*]') {
            const id = `state_start_${stateStartIdCounter++}`;
            parsed = { id, label: 'Start/End', type: 'start', shape: 'circle' };
        } else if (!parsed) {
            const id = raw.trim();
            if (id.includes(':::')) {
                const parts = id.split(':::');
                parsed = { id: parts[0], label: parts[0], type: 'process', classes: parts[1].split(/,\s*/) };
            } else {
                parsed = { id, label: id, type };
            }
        }

        const parentId = parentStack[parentStack.length - 1];
        const existing = nodesMap.get(parsed.id);

        if (!existing) {
            nodesMap.set(parsed.id, { ...parsed, parentId });
        } else {
            if (parsed.label !== parsed.id) existing.label = parsed.label;
            if (parsed.type !== 'process') existing.type = parsed.type;
            if (parsed.shape) existing.shape = parsed.shape;
            if (parsed.classes) existing.classes = [...(existing.classes || []), ...parsed.classes];
            if (!existing.parentId && parentId) existing.parentId = parentId;
        }

        if (forceLabel && nodesMap.has(parsed.id)) {
            nodesMap.get(parsed.id)!.label = forceLabel;
        }

        return parsed.id;
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || SKIP_PATTERNS.some((pattern) => pattern.test(line))) continue;

        const flowchartMatch = line.match(/^(?:flowchart|graph)\s+(TD|TB|LR|RL|BT)/i);
        if (flowchartMatch) {
            diagramType = 'flowchart';
            direction = (flowchartMatch[1].toUpperCase() === 'TD' ? 'TB' : flowchartMatch[1].toUpperCase()) as 'TB' | 'LR' | 'RL' | 'BT';
            continue;
        }

        if (line.match(/^stateDiagram(?:-v2)?/i)) {
            diagramType = 'stateDiagram';
            const dirMatch = lines[i + 1]?.trim().match(/^direction\s+(LR|TB)/i);
            if (dirMatch) direction = dirMatch[1].toUpperCase() as 'TB' | 'LR';
            continue;
        }

        if (line.match(/^end\s*$/i)) {
            parentStack.pop();
            continue;
        }

        const subgraphMatch = line.match(/^subgraph\s+([[]\w\s"'-]+)/i);
        const stateGroupMatch = line.match(/^state\s+"([^"]+)"\s+as\s+(\w+)\s+\{/i) || line.match(/^state\s+(\w+)\s+\{/i);

        if (subgraphMatch || stateGroupMatch) {
            let id: string;
            let label: string;

            if (subgraphMatch) {
                const col = subgraphMatch[1].trim();
                const titleMatch = col.match(/^(\w+)\s*\[(.+)\]$/);
                id = titleMatch ? titleMatch[1] : col.replace(/\s+/g, '_');
                label = titleMatch ? titleMatch[2] : col;
            } else {
                id = stateGroupMatch![2] || stateGroupMatch![1];
                label = stateGroupMatch![1];
            }

            nodesMap.set(id, { id, label, type: 'section', parentId: parentStack[parentStack.length - 1] });
            parentStack.push(id);
            continue;
        }

        const classDefMatch = line.match(CLASS_DEF_RE);
        if (classDefMatch) {
            classDefs.set(classDefMatch[1], parseStyleString(classDefMatch[2]));
            continue;
        }

        const styleMatch = line.match(STYLE_RE);
        if (styleMatch) {
            const [, id, styleStr] = styleMatch;
            const styles = parseStyleString(styleStr);
            const node = nodesMap.get(id);
            if (node) {
                node.styles = { ...node.styles, ...styles };
            } else {
                registerNode(id);
                const registeredNode = nodesMap.get(id);
                if (registeredNode) {
                    registeredNode.styles = styles;
                }
            }
            continue;
        }

        const linkStyleMatch = parseLinkStyleLine(line);
        if (linkStyleMatch) {
            linkStyleMatch.indices.forEach((index) => linkStyles.set(index, linkStyleMatch.style));
            continue;
        }

        if (ARROW_PATTERNS.some((arrow) => line.includes(arrow))) {
            const edgesFound = parseEdgeLine(line);
            edgesFound.forEach((edge) => {
                const type = diagramType === 'stateDiagram' ? 'state' : 'process';
                const sourceId = registerNode(edge.sourceRaw, type);
                const targetId = registerNode(edge.targetRaw, type);

                if (sourceId && targetId) {
                    rawEdges.push({
                        source: sourceId,
                        target: targetId,
                        label: edge.label,
                        arrowType: edge.arrowType,
                    });
                }
            });
            continue;
        }

        if (diagramType === 'stateDiagram') {
            const stateDefMatch = line.match(/^state\s+"([^"]+)"\s+as\s+(\w+)/i);
            if (stateDefMatch) {
                registerNode(stateDefMatch[2], 'state', stateDefMatch[1]);
                continue;
            }

            const stateDescMatch = line.match(/^(\w+)\s*:\s*(.+)/);
            if (stateDescMatch) {
                registerNode(stateDescMatch[1], 'state', stateDescMatch[2]);
                continue;
            }
        }

        const standalone = parseNodeDeclaration(line);
        if (standalone) {
            registerNode(line);
        }
    }

    if (diagramType === 'unknown') {
        return { nodes: [], edges: [], error: 'Missing chart type declaration. Start with "flowchart TD" or related.' };
    }

    if (nodesMap.size === 0) {
        return { nodes: [], edges: [], error: 'No valid nodes found.' };
    }

    const flowNodes: FlowNode[] = Array.from(nodesMap.values()).map((node, index) => {
        const flowNode: FlowNode = {
            id: node.id,
            type: node.type,
            position: { x: (index % 4) * 200, y: Math.floor(index / 4) * 150 },
            data: {
                label: node.label,
                subLabel: '',
                color: getDefaultColor(node.type),
                ...(node.shape ? { shape: node.shape } : {}),
            },
        };

        if (node.parentId) {
            flowNode.parentNode = node.parentId;
            flowNode.extent = 'parent';
        }

        if (node.type === 'section') {
            flowNode.className = 'bg-slate-50/50 border-2 border-dashed border-slate-300 rounded-lg';
            flowNode.style = { width: 600, height: 400 };
        }

        if (node.classes) {
            node.classes.forEach((cls) => {
                const styles = classDefs.get(cls);
                if (!styles) return;
                if (styles.fill) flowNode.style = { ...flowNode.style, backgroundColor: styles.fill };
                if (styles.stroke) flowNode.style = { ...flowNode.style, borderColor: styles.stroke };
                if (styles.color) flowNode.style = { ...flowNode.style, color: styles.color };
            });
        }

        if (node.styles) {
            if (node.styles.fill) flowNode.style = { ...flowNode.style, backgroundColor: node.styles.fill };
            if (node.styles.stroke) flowNode.style = { ...flowNode.style, borderColor: node.styles.stroke };
            if (node.styles.color) flowNode.style = { ...flowNode.style, color: node.styles.color };
        }

        if (diagramType === 'stateDiagram') {
            if (node.type === 'start') {
                flowNode.style = { ...flowNode.style, width: 20, height: 20, borderRadius: '50%', backgroundColor: '#000' };
                flowNode.data.label = '';
            }
            if (node.type === 'state') {
                flowNode.data.shape = 'rounded';
            }
        }

        return flowNode;
    });

    const flowEdges: FlowEdge[] = rawEdges.map((edge, index) => {
        const flowEdge = createDefaultEdge(edge.source, edge.target, edge.label || undefined, `e-mermaid-${index}`);

        if (edge.arrowType.includes('-.') || edge.arrowType.includes('-.-')) {
            flowEdge.style = { ...flowEdge.style, strokeDasharray: '5 3' };
        }
        if (edge.arrowType.includes('==')) {
            flowEdge.style = { ...flowEdge.style, strokeWidth: 4 };
        }
        if (!edge.arrowType.includes('>')) {
            flowEdge.markerEnd = undefined;
        }

        const style = linkStyles.get(index);
        if (style) {
            if (style.stroke) flowEdge.style = { ...flowEdge.style, stroke: style.stroke };
            if (style['stroke-width']) {
                flowEdge.style = { ...flowEdge.style, strokeWidth: parseInt(style['stroke-width'], 10) || 2 };
            }
        }

        return flowEdge;
    });

    return { nodes: flowNodes, edges: flowEdges, direction };
}
