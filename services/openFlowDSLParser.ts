import { Node, Edge } from 'reactflow';
import { createDefaultEdge } from '../constants';
import { NODE_DEFAULTS } from '../theme';

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
export const parseOpenFlowDSL = (input: string): ParseResult => {
    const lines = input.split('\n');
    const declaredNodes: Array<{ label: string; type: string }> = [];
    const declaredEdges: Array<{ sourceLabel: string; targetLabel: string; label: string }> = [];
    let title = 'Untitled Flow';
    let direction: 'TB' | 'LR' = 'TB';

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;

        // Parse flow title
        const titleMatch = line.match(/^flow:\s*"?([^"]*)"?\s*$/i);
        if (titleMatch) {
            title = titleMatch[1].trim();
            continue;
        }

        // Parse direction
        const dirMatch = line.match(/^direction:\s*(TB|LR|TD|RL|BT)\s*$/i);
        if (dirMatch) {
            const d = dirMatch[1].toUpperCase();
            if (d === 'LR' || d === 'RL') {
                direction = 'LR';
            } else {
                direction = 'TB';
            }
            continue;
        }

        // Parse edge: "Source Label -> Target Label" or "Source ->|label| Target"
        const edgeMatch = line.match(/^(.+?)\s*->\s*(?:\|([^|]*)\|\s*)?(.+)$/);
        if (edgeMatch) {
            const sourceLabel = edgeMatch[1].trim();
            const edgeLabel = edgeMatch[2]?.trim() || '';
            const targetLabel = edgeMatch[3].trim();

            declaredEdges.push({ sourceLabel, targetLabel, label: edgeLabel });

            // Auto-register nodes from edges if not already declared
            if (!declaredNodes.find((n) => n.label === sourceLabel)) {
                declaredNodes.push({ label: sourceLabel, type: 'process' });
            }
            if (!declaredNodes.find((n) => n.label === targetLabel)) {
                declaredNodes.push({ label: targetLabel, type: 'process' });
            }
            continue;
        }

        // Parse node declaration: [type] Label
        const nodeMatch = line.match(/^\[(\w+)\]\s+(.+)$/);
        if (nodeMatch) {
            const rawType = nodeMatch[1].toLowerCase();
            const label = nodeMatch[2].trim();
            const type = NODE_TYPE_MAP[rawType] || 'process';

            // Update existing (auto-registered from edge) or add new
            const existing = declaredNodes.find((n) => n.label === label);
            if (existing) {
                existing.type = type;
            } else {
                declaredNodes.push({ label, type });
            }
            continue;
        }
    }

    if (declaredNodes.length === 0) {
        return { nodes: [], edges: [], error: 'No nodes found. Use: [type] Label' };
    }

    // Build lookup: label → id
    const labelToId = new Map<string, string>();
    declaredNodes.forEach((n, i) => {
        const id = `fm-${i}-${Date.now()}`;
        labelToId.set(n.label, id);
    });

    // Layout
    const SPACING_X = direction === 'LR' ? 300 : 250;
    const SPACING_Y = direction === 'LR' ? 150 : 180;
    const cols = direction === 'LR' ? 999 : 3;

    const nodes: Node[] = declaredNodes.map((n, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        return {
            id: labelToId.get(n.label)!,
            type: n.type,
            position: {
                x: direction === 'LR' ? i * SPACING_X : col * SPACING_X,
                y: direction === 'LR' ? 0 : row * SPACING_Y,
            },
            data: {
                label: n.label,
                subLabel: '',
                color: NODE_DEFAULTS[n.type]?.color || 'slate',
            },
        };
    });

    const edges: Edge[] = declaredEdges
        .filter((e) => labelToId.has(e.sourceLabel) && labelToId.has(e.targetLabel))
        .map((e, i) =>
            createDefaultEdge(
                labelToId.get(e.sourceLabel)!,
                labelToId.get(e.targetLabel)!,
                e.label || undefined,
                `fe-${i}-${Date.now()}`
            )
        );

    return { nodes, edges, title };
};
