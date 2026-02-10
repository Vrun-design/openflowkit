import { Node, Edge, MarkerType } from 'reactflow';
import { EDGE_STYLE, EDGE_LABEL_STYLE, EDGE_LABEL_BG_STYLE } from '../constants';

interface ParseResult {
    nodes: Node[];
    edges: Edge[];
    error?: string;
}

// Maps Mermaid shapes to FlowMind node types
const SHAPE_TO_TYPE: Record<string, string> = {
    '([': 'start',   // stadium shape → start
    '])': 'start',
    '((': 'end',     // circle → end
    '))': 'end',
    '{': 'decision', // rhombus → decision
    '}': 'decision',
    '{{': 'custom',  // hexagon → custom
    '}}': 'custom',
    '[': 'process',  // rectangle → process
    ']': 'process',
    '>': 'process',  // asymmetric → process
};

const detectNodeType = (shapeOpen: string): string => {
    return SHAPE_TO_TYPE[shapeOpen] || 'process';
};

/**
 * Parse Mermaid flowchart syntax into FlowMind nodes and edges.
 * 
 * Supported subset:
 * - flowchart TD / LR / TB
 * - Node declarations: id[label], id([label]), id{label}, id((label))
 * - Edge declarations: A --> B, A -->|label| B, A --- B
 * - Inline declarations: A[Label A] --> B[Label B]
 */
export const parseMermaid = (input: string): ParseResult => {
    const lines = input.split('\n');
    const nodesMap = new Map<string, { id: string; label: string; type: string }>();
    const edges: Array<{ source: string; target: string; label: string }> = [];

    let direction: 'TB' | 'LR' = 'TB';
    let hasFlowchartDeclaration = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('%%')) continue; // skip empty lines and comments

        // Parse flowchart declaration
        const flowMatch = line.match(/^flowchart\s+(TD|TB|LR|RL|BT)\s*$/i);
        if (flowMatch) {
            hasFlowchartDeclaration = true;
            const dir = flowMatch[1].toUpperCase();
            direction = (dir === 'LR' || dir === 'RL') ? 'LR' : 'TB';
            continue;
        }

        // Skip 'graph' declarations too
        if (/^(graph|flowchart)\s*/i.test(line) && !flowMatch) {
            hasFlowchartDeclaration = true;
            continue;
        }

        if (!hasFlowchartDeclaration) continue;

        // Parse edges: A --> B, A -->|label| B, A -- text --> B
        // Also handles inline node declarations: A[Label] --> B[Label]
        const edgePattern = /^(.+?)\s*(-->|---|-\.->|==>|--)\s*(?:\|"?([^"|]*)"?\|\s*)?(.+)$/;
        const edgeMatch = line.match(edgePattern);

        if (edgeMatch) {
            const rawSource = edgeMatch[1].trim();
            const edgeLabel = edgeMatch[3]?.trim() || '';
            const rawTarget = edgeMatch[4].trim();

            const sourceNode = parseNodeDeclaration(rawSource);
            const targetNode = parseNodeDeclaration(rawTarget);

            // Register nodes
            if (sourceNode && !nodesMap.has(sourceNode.id)) {
                nodesMap.set(sourceNode.id, sourceNode);
            }
            if (targetNode && !nodesMap.has(targetNode.id)) {
                nodesMap.set(targetNode.id, targetNode);
            }

            edges.push({
                source: sourceNode?.id || rawSource,
                target: targetNode?.id || rawTarget,
                label: edgeLabel,
            });
            continue;
        }

        // Parse standalone node declaration: id[Label] or id([Label]) etc.
        const standalone = parseNodeDeclaration(line);
        if (standalone && !nodesMap.has(standalone.id)) {
            nodesMap.set(standalone.id, standalone);
        }
    }

    if (nodesMap.size === 0) {
        return { nodes: [], edges: [], error: 'No valid nodes found. Start with: flowchart TD' };
    }

    // Layout: assign positions
    const nodeArray = Array.from(nodesMap.values());
    const SPACING_X = direction === 'LR' ? 300 : 250;
    const SPACING_Y = direction === 'LR' ? 150 : 180;
    const nodesPerRow = direction === 'LR' ? 999 : 3; // LR = single row, TB = 3 per row

    const flowNodes: Node[] = nodeArray.map((n, i) => {
        const col = i % nodesPerRow;
        const row = Math.floor(i / nodesPerRow);
        return {
            id: n.id,
            type: n.type,
            position: {
                x: direction === 'LR' ? i * SPACING_X : col * SPACING_X,
                y: direction === 'LR' ? col * SPACING_Y : row * SPACING_Y,
            },
            data: { label: n.label, subLabel: '', color: getDefaultColor(n.type) },
        };
    });

    const flowEdges: Edge[] = edges.map((e, i) => ({
        id: `e-mermaid-${i}`,
        source: e.source,
        target: e.target,
        label: e.label || undefined,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed },
        animated: true,
        style: EDGE_STYLE,
        labelStyle: EDGE_LABEL_STYLE,
        labelBgStyle: EDGE_LABEL_BG_STYLE,
        labelBgPadding: [8, 4] as [number, number],
        labelBgBorderRadius: 4,
    }));

    return { nodes: flowNodes, edges: flowEdges };
};

/**
 * Parse a raw node string like "A[My Label]" or "B{Decision}" or "C((End))"
 * into { id, label, type }
 */
function parseNodeDeclaration(raw: string): { id: string; label: string; type: string } | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    // Try to match node with shape: id + shape chars + label + closing shape chars
    // Patterns: id[label], id([label]), id{label}, id{{label}}, id((label)), id>label]
    const patterns = [
        /^([a-zA-Z_][\w]*)(\(\[)"?([^"\]]*)"?\]\)$/,   // ([label])  - stadium
        /^([a-zA-Z_][\w]*)(\(\()"?([^"\)]*)"?\)\)$/,    // ((label))  - circle
        /^([a-zA-Z_][\w]*)({{)"?([^"{}]*)"?}}$/,        // {{label}}  - hexagon
        /^([a-zA-Z_][\w]*)({)"?([^"{}]*)"?}$/,          // {label}    - rhombus
        /^([a-zA-Z_][\w]*)(\[)"?([^"\]]*)"?\]$/,        // [label]    - rectangle
        /^([a-zA-Z_][\w]*)(>)"?([^"\]]*)"?\]$/,         // >label]    - asymmetric
    ];

    for (const pattern of patterns) {
        const match = trimmed.match(pattern);
        if (match) {
            const id = match[1];
            const shapeOpen = match[2];
            const label = match[3] || id;
            const type = detectNodeType(shapeOpen);
            return { id, label, type };
        }
    }

    // Plain id without shape declaration
    if (/^[a-zA-Z_][\w]*$/.test(trimmed)) {
        return { id: trimmed, label: trimmed, type: 'process' };
    }

    return null;
}

function getDefaultColor(type: string): string {
    switch (type) {
        case 'start': return 'emerald';
        case 'end': return 'red';
        case 'decision': return 'amber';
        case 'custom': return 'violet';
        default: return 'slate';
    }
}
