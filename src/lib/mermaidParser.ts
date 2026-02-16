import { createDefaultEdge } from '@/constants';
import { getDefaultColor } from '@/theme';
import { FlowNode, FlowEdge, NodeData } from './types';

export interface ParseResult {
    nodes: FlowNode[];
    edges: FlowEdge[];
    error?: string;
    direction?: 'TB' | 'LR' | 'RL' | 'BT';
}

// ---- Shape detection ----

const SHAPE_OPENERS: Array<{ open: string; close: string; type: string; shape: NodeData['shape'] }> = [
    { open: '([', close: '])', type: 'start', shape: 'capsule' },    // stadium
    { open: '((', close: '))', type: 'end', shape: 'circle' },       // double-circle
    { open: '{{', close: '}}', type: 'custom', shape: 'hexagon' },   // hexagon
    { open: '[(', close: ')]', type: 'process', shape: 'cylinder' },  // cylinder
    { open: '{', close: '}', type: 'decision', shape: 'diamond' }, // rhombus
    { open: '[', close: ']', type: 'process', shape: 'rounded' },  // rectangle
    { open: '(', close: ')', type: 'process', shape: 'rounded' },  // rounded // Must be after (( and ([
    { open: '>', close: ']', type: 'process', shape: 'parallelogram' }, // asymmetric
];

// ---- Directive lines to skip ----
const SKIP_PATTERNS = [
    /^%%/,                          // comments
    /^class\s/i,
    /^click\s/i,
    // /^style\s/i, // We want to parse styles now
    /^direction\s/i,
    /^accTitle\s/i,
    /^accDescr\s/i,
];

// ---- linkStyle parsing ----
// linkStyle 0,1,2 stroke-width:2px,fill:none,stroke:red;
const LINK_STYLE_RE = /^linkStyle\s+([\d,\s]+)\s+(.+)$/i;
const CLASS_DEF_RE = /^classDef\s+(\w+)\s+(.+)$/i;
const STYLE_RE = /^style\s+(\w+)\s+(.+)$/i;

function parseLinkStyleLine(line: string): { indices: number[]; style: Record<string, string> } | null {
    const m = line.match(LINK_STYLE_RE);
    if (!m) return null;

    const indices = m[1].split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    const styleParts = m[2].replace(/;$/, '').split(',');
    const style: Record<string, string> = {};
    for (const part of styleParts) {
        const [key, val] = part.split(':').map(s => s.trim());
        if (key && val) style[key] = val;
    }
    return { indices, style };
}

// ---- Preprocessing ----

function normalizeMultilineStrings(input: string): string {
    let result = '';
    let inQuote = false;
    for (let i = 0; i < input.length; i++) {
        const c = input[i];
        if (c === '"' && input[i - 1] !== '\\') {
            inQuote = !inQuote;
        }

        if (inQuote && c === '\n') {
            result += '\\n';
            let j = i + 1;
            while (j < input.length && (input[j] === ' ' || input[j] === '\t')) {
                j++;
            }
            i = j - 1;
        } else {
            result += c;
        }
    }
    return result;
}

function normalizeEdgeLabels(input: string): string {
    let s = input;
    s = s.replace(/==(?![>])\s*(.+?)\s*==>/g, ' ==>|$1|');
    s = s.replace(/--(?![>-])\s*(.+?)\s*-->/g, ' -->|$1|');
    s = s.replace(/-\.\s*(.+?)\s*\.->/g, ' -.->|$1|');
    s = s.replace(/--(?![>-])\s*(.+?)\s*---/g, ' ---|$1|');
    return s;
}

// ---- Node parsing ----

interface RawNode {
    id: string;
    label: string;
    type: string;
    shape?: NodeData['shape'];
    parentId?: string;
    styles?: Record<string, string>;
    classes?: string[];
}

function stripFaIcons(label: string): string {
    const stripped = label.replace(/fa:fa-[\w-]+\s*/g, '').trim();
    if (stripped) return stripped;
    const iconMatch = label.match(/fa:fa-([\w-]+)/);
    return iconMatch ? iconMatch[1].replace(/-/g, ' ') : label;
}

function tryParseWithShape(
    input: string,
    shape: { open: string; close: string; type: string; shape: NodeData['shape'] }
): RawNode | null {
    const openIdx = input.indexOf(shape.open);
    if (openIdx < 1) return null;

    // Verify it's not part of a longer opener
    if (openIdx > 0 && input[openIdx - 1] === shape.open[0]) return null;

    const id = input.substring(0, openIdx).trim();
    if (!/^[a-zA-Z0-9_][\w-]*$/.test(id)) return null;

    const afterOpen = input.substring(openIdx + shape.open.length);
    const closeIdx = afterOpen.lastIndexOf(shape.close);
    if (closeIdx < 0) return null;

    const afterClose = afterOpen.substring(closeIdx + shape.close.length).trim();
    // Allow for class defs after: A[Label]:::className
    let classes: string[] = [];
    if (afterClose.startsWith(':::')) {
        classes = afterClose.substring(3).split(/,\s*/);
    } else if (afterClose) {
        return null; // Unexpected content after close
    }

    let label = afterOpen.substring(0, closeIdx).trim();
    if ((label.startsWith('"') && label.endsWith('"')) || (label.startsWith("'") && label.endsWith("'"))) {
        label = label.slice(1, -1);
    }
    label = label.replace(/\\n/g, '\n');
    label = stripFaIcons(label);
    if (!label) label = id;

    return { id, label, type: shape.type, shape: shape.shape, classes: classes.length ? classes : undefined };
}

function parseNodeDeclaration(raw: string): RawNode | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    // Try each shape
    for (const shape of SHAPE_OPENERS) {
        const result = tryParseWithShape(trimmed, shape);
        if (result) return result;
    }

    // Simple node: A
    // Or A:::className
    let id = trimmed;
    let classes: string[] = [];
    if (id.includes(':::')) {
        const parts = id.split(':::');
        id = parts[0];
        classes = parts[1].split(/,\s*/);
    }

    if (/^[a-zA-Z0-9_][\w-]*$/.test(id)) {
        return { id, label: id, type: 'process', classes: classes.length ? classes : undefined };
    }

    return null;
}

// ---- Edge parsing ----

const ARROW_PATTERNS = [
    '===>', '-.->', '--->', '-->', '===', '---', '==>', '-.-', '--'
];

function findArrowInLine(line: string): { arrow: string; before: string; after: string } | null {
    for (const arrow of ARROW_PATTERNS) {
        const idx = line.indexOf(arrow);
        if (idx >= 0) {
            return {
                arrow,
                before: line.substring(0, idx).trim(),
                after: line.substring(idx + arrow.length).trim(),
            };
        }
    }
    return null;
}

function parseEdgeLine(line: string): Array<{
    sourceRaw: string;
    targetRaw: string;
    label: string;
    arrowType: string;
}> {
    const edges: Array<{ sourceRaw: string; targetRaw: string; label: string; arrowType: string }> = [];
    let remaining = line;
    let lastNodeRaw: string | null = null;

    while (remaining.trim()) {
        const arrowMatch = findArrowInLine(remaining);
        if (!arrowMatch) break;

        const { arrow, before, after } = arrowMatch;
        const sourceRaw = lastNodeRaw || before;
        let label = '';
        let targetAndRest = after;

        const labelMatch = targetAndRest.match(/^\|"?([^"|]*)"?\|\s*/);
        if (labelMatch) {
            label = labelMatch[1].trim();
            targetAndRest = targetAndRest.substring(labelMatch[0].length);
        }

        const nextArrowMatch = findArrowInLine(targetAndRest);
        let targetRaw: string;

        if (nextArrowMatch) {
            targetRaw = nextArrowMatch.before;
            remaining = targetAndRest;
        } else {
            targetRaw = targetAndRest;
            remaining = '';
        }

        // Handle State Digram [*] syntax
        let s = sourceRaw.trim();
        let t = targetRaw.trim();

        // Remove :::class from edge definition if present (rare but possible)
        if (s.includes(':::')) s = s.split(':::')[0];
        if (t.includes(':::')) t = t.split(':::')[0];

        if (s && t) {
            edges.push({ sourceRaw: s, targetRaw: t, label, arrowType: arrow });
        }
        lastNodeRaw = targetRaw.trim();
        if (!nextArrowMatch) break;
    }
    return edges;
}

// ---- Helper to parse style strings ----
// fill:#f9f,stroke:#333 -> { fill: '#f9f', stroke: '#333' }
function parseStyleString(styleStr: string): Record<string, string> {
    const styles: Record<string, string> = {};
    const parts = styleStr.split(',');
    for (const part of parts) {
        const [key, val] = part.split(':').map(s => s.trim());
        if (key && val) styles[key] = val.replace(/;$/, '');
    }
    return styles;
}

// ---- Main parser ----

export const parseMermaid = (input: string): ParseResult => {
    let processed = input.replace(/\r\n/g, '\n');
    processed = normalizeMultilineStrings(processed);
    processed = normalizeEdgeLabels(processed);

    const lines = processed.split('\n');
    const nodesMap = new Map<string, RawNode>();
    const rawEdges: Array<{ source: string; target: string; label: string; arrowType: string }> = [];
    const linkStyles: Map<number, Record<string, string>> = new Map();
    const classDefs: Map<string, Record<string, string>> = new Map();

    // Directives
    let direction: 'TB' | 'LR' | 'RL' | 'BT' = 'TB';
    let diagramType: 'flowchart' | 'stateDiagram' | 'unknown' = 'unknown';

    // Subgraph Stack
    const parentStack: string[] = [];

    // State Diagram Helper
    let stateStartIdCounter = 0;

    const registerNode = (raw: string, type: 'process' | 'state' = 'process', forceLabel?: string): string | null => {
        let parsed = parseNodeDeclaration(raw);
        let id = raw; // default

        // Handle [*] for State Diagrams
        if (raw === '[*]') {
            id = `state_start_${stateStartIdCounter++}`;
            parsed = { id, label: 'Start/End', type: 'start', shape: 'circle' };
        } else if (!parsed) {
            // Fallback for state descriptions that might not match node regex perfectly
            id = raw.trim();
            if (id.includes(':::')) {
                const parts = id.split(':::');
                id = parts[0];
                parsed = { id, label: id, type: 'process', classes: parts[1].split(/,\s*/) };
            } else {
                parsed = { id, label: id, type: type };
            }
        }

        const existing = nodesMap.get(parsed.id);
        const parentId = parentStack.length > 0 ? parentStack[parentStack.length - 1] : undefined;

        if (!existing) {
            nodesMap.set(parsed.id, { ...parsed, parentId });
        } else {
            // Update existing if we capture more info (like label or shape)
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
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || SKIP_PATTERNS.some(p => p.test(line))) continue;

        // 1. Helper: Check & Parse Directives
        if (line.match(/^(?:flowchart|graph)\s+(TD|TB|LR|RL|BT)/i)) {
            diagramType = 'flowchart';
            const match = line.match(/^(?:flowchart|graph)\s+(TD|TB|LR|RL|BT)/i);
            if (match) direction = (match[1].toUpperCase() === 'TD' ? 'TB' : match[1].toUpperCase()) as any;
            continue;
        }

        if (line.match(/^stateDiagram(?:-v2)?/i)) {
            diagramType = 'stateDiagram';
            const match = lines[i + 1]?.trim().match(/^direction\s+(LR|TB)/i);
            if (match) direction = match[1].toUpperCase() as 'TB' | 'LR';
            continue;
        }

        if (line.match(/^end\s*$/i)) {
            parentStack.pop();
            continue;
        }

        // 2. Subgraphs / Composite States
        const subgraphMatch = line.match(/^subgraph\s+([[]\w\s"'-]+)/i);
        const stateGroupMatch = line.match(/^state\s+"([^"]+)"\s+as\s+(\w+)\s+\{/i) || line.match(/^state\s+(\w+)\s+\{/i);

        if (subgraphMatch || stateGroupMatch) {
            let id, label;
            if (subgraphMatch) {
                const col = subgraphMatch[1].trim();
                const titleMatch = col.match(/^(\w+)\s*\[(.+)\]$/);
                id = titleMatch ? titleMatch[1] : col.replace(/\s+/g, '_');
                label = titleMatch ? titleMatch[2] : col;
            } else {
                // stateGroupMatch
                id = stateGroupMatch![2] || stateGroupMatch![1];
                label = stateGroupMatch![1];
            }

            nodesMap.set(id, { id, label, type: 'group', parentId: parentStack[parentStack.length - 1] });
            parentStack.push(id);
            continue;
        }

        // 3. Styles (ClassDefs & Style)
        const classDefMatch = line.match(CLASS_DEF_RE);
        if (classDefMatch) {
            classDefs.set(classDefMatch[1], parseStyleString(classDefMatch[2]));
            continue;
        }

        const styleMatch = line.match(STYLE_RE);
        if (styleMatch) {
            const [_, id, styleStr] = styleMatch;
            const styles = parseStyleString(styleStr);
            const node = nodesMap.get(id);
            if (node) {
                node.styles = { ...node.styles, ...styles };
            } else {
                registerNode(id);
                if (nodesMap.get(id)) nodesMap.get(id)!.styles = styles;
            }
            continue;
        }

        const linkStyleMatch = parseLinkStyleLine(line);
        if (linkStyleMatch) {
            linkStyleMatch.indices.forEach(idx => linkStyles.set(idx, linkStyleMatch.style));
            continue;
        }

        // 4. Edges & Connected Nodes
        if (ARROW_PATTERNS.some(a => line.includes(a))) {
            const edgesFound = parseEdgeLine(line);
            edgesFound.forEach(e => {
                const type = diagramType === 'stateDiagram' ? 'state' : 'process';
                const sourceId = registerNode(e.sourceRaw, type);
                const targetId = registerNode(e.targetRaw, type);

                if (sourceId && targetId) {
                    rawEdges.push({
                        source: sourceId,
                        target: targetId,
                        label: e.label,
                        arrowType: e.arrowType,
                    });
                }
            });
            continue;
        }

        // 5. Standalone Nodes
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
        if (standalone) registerNode(line);
    }



    if (diagramType === 'unknown') {
        return { nodes: [], edges: [], error: 'Missing chart type declaration. Start with "flowchart TD" or related.' };
    }

    if (nodesMap.size === 0) {
        return { nodes: [], edges: [], error: 'No valid nodes found.' };
    }

    const flowNodes: FlowNode[] = Array.from(nodesMap.values()).map((n, i) => {
        const flowNode: FlowNode = {
            id: n.id,
            type: n.type,
            position: { x: (i % 4) * 200, y: Math.floor(i / 4) * 150 }, // Initial positions, elk will layout
            data: {
                label: n.label,
                subLabel: '',
                color: getDefaultColor(n.type),
                ...(n.shape ? { shape: n.shape } : {}),
            },
        };

        // Apply Parent
        if (n.parentId) {
            flowNode.parentNode = n.parentId;
            flowNode.extent = 'parent';
        }

        // Apply Group Styling
        if (n.type === 'group') {
            flowNode.className = 'bg-slate-50/50 border-2 border-dashed border-slate-300 rounded-lg';
            flowNode.style = { width: 600, height: 400 }; // Default size, user resizes or layout engine handles
        }

        // Apply Classes custom styles
        if (n.classes) {
            n.classes.forEach(cls => {
                const styles = classDefs.get(cls);
                if (styles) {
                    // Mapping simple styles
                    if (styles.fill) flowNode.style = { ...flowNode.style, backgroundColor: styles.fill };
                    if (styles.stroke) flowNode.style = { ...flowNode.style, borderColor: styles.stroke };
                    if (styles.color) flowNode.style = { ...flowNode.style, color: styles.color };
                }
            });
        }

        // Apply Inline Styles
        if (n.styles) {
            if (n.styles.fill) flowNode.style = { ...flowNode.style, backgroundColor: n.styles.fill };
            if (n.styles.stroke) flowNode.style = { ...flowNode.style, borderColor: n.styles.stroke };
            if (n.styles.color) flowNode.style = { ...flowNode.style, color: n.styles.color };
        }

        // State Diagram specific defaults
        if (diagramType === 'stateDiagram') {
            if (n.type === 'start') {
                flowNode.style = { ...flowNode.style, width: 20, height: 20, borderRadius: '50%', backgroundColor: '#000' };
                flowNode.data.label = ''; // Start node usually empty
            }
            if (n.type === 'state') {
                flowNode.data.shape = 'rounded';
            }
        }

        return flowNode;
    });

    const flowEdges: FlowEdge[] = rawEdges.map((e, i) => {
        const edge = createDefaultEdge(e.source, e.target, e.label || undefined, `e-mermaid-${i}`);

        if (e.arrowType.includes('-.') || e.arrowType.includes('-.-')) {
            edge.style = { ...edge.style, strokeDasharray: '5 3' };
        }
        if (e.arrowType.includes('==')) {
            edge.style = { ...edge.style, strokeWidth: 4 };
        }
        if (!e.arrowType.includes('>')) {
            edge.markerEnd = undefined;
        }

        const ls = linkStyles.get(i);
        if (ls) {
            const stroke = ls['stroke'];
            if (stroke) edge.style = { ...edge.style, stroke };
            const strokeWidth = ls['stroke-width'];
            if (strokeWidth) edge.style = { ...edge.style, strokeWidth: parseInt(strokeWidth, 10) || 2 };
        }

        return edge;
    });

    return { nodes: flowNodes, edges: flowEdges, direction };
};
