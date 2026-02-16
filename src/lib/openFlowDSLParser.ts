import { Node, Edge } from 'reactflow';
import { createDefaultEdge } from '@/constants';
import { NODE_DEFAULTS } from '@/theme';

interface ParseResult {
    nodes: Node[];
    edges: Edge[];
    title?: string;
    error?: string;
}

const NODE_TYPE_MAP: Record<string, string> = {
    start: 'start',
    process: 'process',
    decision: 'decision',
    end: 'end',
    system: 'custom',
    note: 'annotation',
    section: 'section',
    browser: 'browser',
    mobile: 'mobile',
    button: 'wireframe_button',
    input: 'wireframe_input',
    icon: 'icon',
    placeholder: 'wireframe_image',
};

/**
 * Parse FlowMind DSL text into nodes and edges.
 *
 * Syntax:
 *   flow: "Title"
 *   direction: TB | LR
 *   # comment
 *   [type] Label
 *   Source Label -> Target Label
 *   Source Label ->|edge label| Target Label
 */
const parseDirection = (line: string): 'TB' | 'LR' | null => {
    const dirMatch = line.match(/^direction:\s*(TB|LR|TD|RL|BT)\s*$/i);
    if (!dirMatch) return null;
    const d = dirMatch[1].toUpperCase();
    return (d === 'LR' || d === 'RL') ? 'LR' : 'TB';
};

const parseFlowTitle = (line: string): string | null => {
    const match = line.match(/^flow:\s*"?([^"]*)"?\s*$/i);
    return match ? match[1].trim() : null;
};

const parseEdge = (line: string): { source: string, target: string, label: string } | null => {
    const match = line.match(/^(.+?)\s*->\s*(?:\|([^|]*)\|\s*)?(.+)$/);
    if (!match) return null;
    return {
        source: match[1].trim(),
        target: match[3].trim(),
        label: match[2]?.trim() || ''
    };
};

const parseNode = (line: string): { label: string, type: string } | null => {
    const match = line.match(/^\[(\w+)\]\s+(.+)$/);
    if (!match) return null;
    const rawType = match[1].toLowerCase();
    return {
        label: match[2].trim(),
        type: NODE_TYPE_MAP[rawType] || 'process'
    };
};

export const parseOpenFlowDSL = (input: string): ParseResult => {
    const declaredNodes = new Map<string, string>(); // label -> type
    const declaredEdges: Array<{ sourceLabel: string; targetLabel: string; label: string }> = [];
    let title = 'Untitled Flow';
    let direction: 'TB' | 'LR' = 'TB';

    const lines = input.split('\n');

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;

        // 1. Metadata
        const newTitle = parseFlowTitle(line);
        if (newTitle) {
            title = newTitle;
            continue;
        }

        const newDir = parseDirection(line);
        if (newDir) {
            direction = newDir;
            continue;
        }

        // 2. Edges
        const edge = parseEdge(line);
        if (edge) {
            declaredEdges.push({ sourceLabel: edge.source, targetLabel: edge.target, label: edge.label });
            if (!declaredNodes.has(edge.source)) declaredNodes.set(edge.source, 'process');
            if (!declaredNodes.has(edge.target)) declaredNodes.set(edge.target, 'process');
            continue;
        }

        // 3. Nodes
        const node = parseNode(line);
        if (node) {
            declaredNodes.set(node.label, node.type);
            continue;
        }
    }

    if (declaredNodes.size === 0) {
        return { nodes: [], edges: [], error: 'No nodes found. Use: [type] Label' };
    }

    // Build Nodes
    const labelToId = new Map<string, string>();
    const nodes: Node[] = [];

    // Layout Constants
    const SPACING_X = direction === 'LR' ? 300 : 250;
    const SPACING_Y = direction === 'LR' ? 150 : 180;
    const cols = direction === 'LR' ? 999 : 3;

    let i = 0;
    for (const [label, type] of declaredNodes.entries()) {
        const id = `fm-${i}-${Date.now()}`;
        labelToId.set(label, id);

        const col = i % cols;
        const row = Math.floor(i / cols);

        nodes.push({
            id,
            type,
            position: {
                x: direction === 'LR' ? i * SPACING_X : col * SPACING_X,
                y: direction === 'LR' ? 0 : row * SPACING_Y,
            },
            data: {
                label,
                subLabel: '',
                color: NODE_DEFAULTS[type]?.color || 'slate',
            },
        });
        i++;
    }

    // Build Edges
    const edges: Edge[] = declaredEdges
        .filter((e) => labelToId.has(e.sourceLabel) && labelToId.has(e.targetLabel))
        .map((e, index) =>
            createDefaultEdge(
                labelToId.get(e.sourceLabel)!,
                labelToId.get(e.targetLabel)!,
                e.label || undefined,
                `fe-${index}-${Date.now()}`
            )
        );

    return { nodes, edges, title };
};
