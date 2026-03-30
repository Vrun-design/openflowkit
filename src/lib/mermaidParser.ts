import { MarkerType } from '@/lib/reactflowCompat';
import { createDefaultEdge } from '@/constants';
import { setNodeParent } from './nodeParent';
import {
  createMermaidParseState,
  registerMermaidNode,
  toMermaidParseModel,
  type MermaidDirection,
  type MermaidParseModel,
} from './mermaidParserModel';
import {
    ARROW_PATTERNS,
    CLASS_DEF_RE,
    parseEdgeLine,
    parseLinkStyleLine,
    parseNodeDeclaration,
    parseStyleString,
    SKIP_PATTERNS,
    STYLE_RE,
    normalizeEdgeLabels,
    normalizeMultilineStrings,
} from './mermaidParserHelpers';
import type { FlowEdge, FlowNode } from './types';

const NODE_TYPE_DEFAULTS: Record<string, string> = {
    start: 'emerald',
    end: 'red',
    decision: 'amber',
    custom: 'violet',
    process: 'slate',
};

function getDefaultColor(type: string): string {
    return NODE_TYPE_DEFAULTS[type] || 'slate';
}

export interface ParseResult {
    nodes: FlowNode[];
    edges: FlowEdge[];
    error?: string;
    direction?: MermaidDirection;
}

function preprocessMermaidInput(input: string): string[] {
    const processed = normalizeEdgeLabels(normalizeMultilineStrings(input.replace(/\r\n/g, '\n')));
    return processed.split('\n');
}

function isSkippableLine(line: string): boolean {
    return !line || SKIP_PATTERNS.some((pattern) => pattern.test(line));
}

function parseFlowchartDeclaration(line: string): MermaidDirection | null {
    const flowchartMatch = line.match(/^(?:flowchart|graph)\s+(TD|TB|LR|RL|BT)/i);
    if (!flowchartMatch) {
        return null;
    }

    return (flowchartMatch[1].toUpperCase() === 'TD'
      ? 'TB'
      : flowchartMatch[1].toUpperCase()) as MermaidDirection;
}

function parseStateDiagramDirection(nextLine: string | undefined): MermaidDirection {
    const dirMatch = nextLine?.trim().match(/^direction\s+(LR|TB)/i);
    return (dirMatch?.[1].toUpperCase() ?? 'TB') as MermaidDirection;
}

function registerSectionNode(
    state: ReturnType<typeof createMermaidParseState>,
    line: string
): boolean {
    const subgraphMatch = line.match(/^subgraph\s+([[]\w\s"'-]+)/i);
    const stateGroupMatch =
      line.match(/^state\s+"([^"]+)"\s+as\s+(\w+)\s+\{/i) ||
      line.match(/^state\s+(\w+)\s+\{/i);

    if (!subgraphMatch && !stateGroupMatch) {
        return false;
    }

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

    state.nodesMap.set(id, {
        id,
        label,
        type: 'section',
        parentId: state.parentStack[state.parentStack.length - 1],
    });
    state.parentStack.push(id);
    return true;
}

function applyNodeStyleDirective(
    state: ReturnType<typeof createMermaidParseState>,
    line: string
): boolean {
    const styleMatch = line.match(STYLE_RE);
    if (!styleMatch) {
        return false;
    }

    const [, id, styleStr] = styleMatch;
    const styles = parseStyleString(styleStr);
    const node = state.nodesMap.get(id);
    if (node) {
        node.styles = { ...node.styles, ...styles };
    } else {
        registerMermaidNode(state, id);
        const registeredNode = state.nodesMap.get(id);
        if (registeredNode) {
            registeredNode.styles = styles;
        }
    }

    return true;
}

function parseEdgeDeclaration(
    state: ReturnType<typeof createMermaidParseState>,
    line: string
): boolean {
    if (!ARROW_PATTERNS.some((arrow) => line.includes(arrow))) {
        return false;
    }

    const edgesFound = parseEdgeLine(line);
    edgesFound.forEach((edge) => {
        const type = state.diagramType === 'stateDiagram' ? 'state' : 'process';
        const sourceId = registerMermaidNode(state, edge.sourceRaw, type);
        const targetId = registerMermaidNode(state, edge.targetRaw, type);

        if (sourceId && targetId) {
            state.rawEdges.push({
                source: sourceId,
                target: targetId,
                label: edge.label,
                arrowType: edge.arrowType,
            });
        }
    });

    return true;
}

function parseStateDiagramNodeDeclaration(
    state: ReturnType<typeof createMermaidParseState>,
    line: string
): boolean {
    if (state.diagramType !== 'stateDiagram') {
        return false;
    }

    const stateDefMatch = line.match(/^state\s+"([^"]+)"\s+as\s+(\w+)/i);
    if (stateDefMatch) {
        registerMermaidNode(state, stateDefMatch[2], 'state', stateDefMatch[1]);
        return true;
    }

    const stateDescMatch = line.match(/^(\w+)\s*:\s*(.+)/);
    if (stateDescMatch) {
        registerMermaidNode(state, stateDescMatch[1], 'state', stateDescMatch[2]);
        return true;
    }

    return false;
}

function buildMermaidParseModel(lines: string[]): MermaidParseModel {
    const state = createMermaidParseState();

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (isSkippableLine(line)) {
            continue;
        }

        const flowchartDirection = parseFlowchartDeclaration(line);
        if (flowchartDirection) {
            state.diagramType = 'flowchart';
            state.direction = flowchartDirection;
            continue;
        }

        if (line.match(/^stateDiagram(?:-v2)?/i)) {
            state.diagramType = 'stateDiagram';
            state.direction = parseStateDiagramDirection(lines[i + 1]);
            continue;
        }

        if (line.match(/^end\s*$/i) || line === '}') {
            state.parentStack.pop();
            continue;
        }

        if (registerSectionNode(state, line)) {
            continue;
        }

        const classDefMatch = line.match(CLASS_DEF_RE);
        if (classDefMatch) {
            state.classDefs.set(classDefMatch[1], parseStyleString(classDefMatch[2]));
            continue;
        }

        if (applyNodeStyleDirective(state, line)) {
            continue;
        }

        const linkStyleMatch = parseLinkStyleLine(line);
        if (linkStyleMatch) {
            linkStyleMatch.indices.forEach((index) => state.linkStyles.set(index, linkStyleMatch.style));
            continue;
        }

        if (parseEdgeDeclaration(state, line)) {
            continue;
        }

        if (parseStateDiagramNodeDeclaration(state, line)) {
            continue;
        }

        const standalone = parseNodeDeclaration(line);
        if (standalone) {
            registerMermaidNode(state, line);
        }
    }

    return toMermaidParseModel(state);
}

function createFlowNodes(model: MermaidParseModel): FlowNode[] {
    return Array.from(model.nodesMap.values()).map((node, index) => {
        let flowNode: FlowNode = {
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
            flowNode = setNodeParent(flowNode, node.parentId);
        }

        if (node.type === 'section') {
            flowNode.className = 'bg-slate-50/50 border-2 border-dashed border-slate-300 rounded-lg';
            flowNode.style = { width: 600, height: 400 };
        }

        if (node.classes) {
            node.classes.forEach((cls) => {
                const styles = model.classDefs.get(cls);
                if (!styles) {
                    return;
                }
                if (styles.fill) {
                    flowNode.style = { ...flowNode.style, backgroundColor: styles.fill };
                }
                if (styles.stroke) {
                    flowNode.style = { ...flowNode.style, borderColor: styles.stroke };
                }
                if (styles.color) {
                    flowNode.style = { ...flowNode.style, color: styles.color };
                }
            });
        }

        if (node.styles) {
            if (node.styles.fill) {
                flowNode.style = { ...flowNode.style, backgroundColor: node.styles.fill };
            }
            if (node.styles.stroke) {
                flowNode.style = { ...flowNode.style, borderColor: node.styles.stroke };
            }
            if (node.styles.color) {
                flowNode.style = { ...flowNode.style, color: node.styles.color };
            }
        }

        if (model.diagramType === 'stateDiagram') {
            if (node.type === 'start') {
                flowNode.style = {
                    ...flowNode.style,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    backgroundColor: '#000',
                };
                flowNode.data.label = '';
            }
            if (node.type === 'state') {
                flowNode.data.shape = 'rounded';
            }
        }

        return flowNode;
    });
}

function createFlowEdges(model: MermaidParseModel): FlowEdge[] {
    return model.rawEdges.map((edge, index) => {
        const flowEdge = createDefaultEdge(
          edge.source,
          edge.target,
          edge.label || undefined,
          `e-mermaid-${index}`
        );

        if (edge.arrowType.includes('-.') || edge.arrowType.includes('-.-')) {
            flowEdge.style = { ...flowEdge.style, strokeDasharray: '5 3' };
        }
        if (edge.arrowType.includes('==')) {
            flowEdge.style = { ...flowEdge.style, strokeWidth: 4 };
        }
        if (edge.arrowType.startsWith('<')) {
            flowEdge.markerStart = { type: MarkerType.ArrowClosed };
        }
        if (!edge.arrowType.includes('>')) {
            flowEdge.markerEnd = undefined;
        }

        const style = model.linkStyles.get(index);
        if (style) {
            if (style.stroke) {
                flowEdge.style = { ...flowEdge.style, stroke: style.stroke };
            }
            if (style['stroke-width']) {
                flowEdge.style = {
                    ...flowEdge.style,
                    strokeWidth: parseInt(style['stroke-width'], 10) || 2,
                };
            }
        }

        return flowEdge;
    });
}

export function parseMermaid(input: string): ParseResult {
    const model = buildMermaidParseModel(preprocessMermaidInput(input));

    if (model.diagramType === 'unknown') {
        return { nodes: [], edges: [], error: 'Missing chart type declaration. Start with "flowchart TD" or related.' };
    }

    if (model.nodesMap.size === 0) {
        return { nodes: [], edges: [], error: 'No valid nodes found.' };
    }

    return {
        nodes: createFlowNodes(model),
        edges: createFlowEdges(model),
        direction: model.direction,
    };
}
