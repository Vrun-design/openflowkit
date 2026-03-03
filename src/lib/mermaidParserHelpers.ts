import { MarkerType } from 'reactflow';
import type React from 'react';
import type { NodeData } from './types';

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

export function createDefaultEdge(source: string, target: string, label?: string, id?: string) {
    return {
        id: id || `e-${source}-${target}-${crypto.randomUUID()}`,
        source,
        target,
        label,
        ...DEFAULT_EDGE_OPTIONS,
    };
}

const NODE_TYPE_DEFAULTS: Record<string, string> = {
    start: 'emerald',
    end: 'red',
    decision: 'amber',
    custom: 'violet',
    process: 'slate',
};

export function getDefaultColor(type: string): string {
    return NODE_TYPE_DEFAULTS[type] || 'slate';
}

const SHAPE_OPENERS: Array<{ open: string; close: string; type: string; shape: NodeData['shape'] }> = [
    { open: '([', close: '])', type: 'start', shape: 'capsule' },
    { open: '((', close: '))', type: 'end', shape: 'circle' },
    { open: '{{', close: '}}', type: 'custom', shape: 'hexagon' },
    { open: '[(', close: ')]', type: 'process', shape: 'cylinder' },
    { open: '{', close: '}', type: 'decision', shape: 'diamond' },
    { open: '[', close: ']', type: 'process', shape: 'rounded' },
    { open: '(', close: ')', type: 'process', shape: 'rounded' },
    { open: '>', close: ']', type: 'process', shape: 'parallelogram' },
];

export const SKIP_PATTERNS = [
    /^%%/,
    /^class\s/i,
    /^click\s/i,
    /^direction\s/i,
    /^accTitle\s/i,
    /^accDescr\s/i,
];

const LINK_STYLE_RE = /^linkStyle\s+([\d,\s]+)\s+(.+)$/i;
export const CLASS_DEF_RE = /^classDef\s+(\w+)\s+(.+)$/i;
export const STYLE_RE = /^style\s+(\w+)\s+(.+)$/i;

export function parseLinkStyleLine(line: string): { indices: number[]; style: Record<string, string> } | null {
    const m = line.match(LINK_STYLE_RE);
    if (!m) return null;

    const indices = m[1].split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
    const styleParts = m[2].replace(/;$/, '').split(',');
    const style: Record<string, string> = {};
    for (const part of styleParts) {
        const [key, val] = part.split(':').map((s) => s.trim());
        if (key && val) style[key] = val;
    }
    return { indices, style };
}

export function normalizeMultilineStrings(input: string): string {
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

export function normalizeEdgeLabels(input: string): string {
    let s = input;
    s = s.replace(/==(?![>])\s*(.+?)\s*==>/g, ' ==>|$1|');
    s = s.replace(/--(?![>-])\s*(.+?)\s*-->/g, ' -->|$1|');
    s = s.replace(/-\.\s*(.+?)\s*\.->/g, ' -.->|$1|');
    s = s.replace(/--(?![>-])\s*(.+?)\s*---/g, ' ---|$1|');
    return s;
}

export interface RawNode {
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

    if (openIdx > 0 && input[openIdx - 1] === shape.open[0]) return null;

    const id = input.substring(0, openIdx).trim();
    if (!/^[a-zA-Z0-9_][\w-]*$/.test(id)) return null;

    const afterOpen = input.substring(openIdx + shape.open.length);
    const closeIdx = afterOpen.lastIndexOf(shape.close);
    if (closeIdx < 0) return null;

    const afterClose = afterOpen.substring(closeIdx + shape.close.length).trim();
    let classes: string[] = [];
    if (afterClose.startsWith(':::')) {
        classes = afterClose.substring(3).split(/,\s*/);
    } else if (afterClose) {
        return null;
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

export function parseNodeDeclaration(raw: string): RawNode | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    for (const shape of SHAPE_OPENERS) {
        const result = tryParseWithShape(trimmed, shape);
        if (result) return result;
    }

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

export const ARROW_PATTERNS = ['===>', '-.->', '--->', '-->', '===', '---', '==>', '-.-', '--'];

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

export function parseEdgeLine(line: string): Array<{
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

        let s = sourceRaw.trim();
        let t = targetRaw.trim();

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

export function parseStyleString(styleStr: string): Record<string, string> {
    const styles: Record<string, string> = {};
    const parts = styleStr.split(',');
    for (const part of parts) {
        const [key, val] = part.split(':').map((s) => s.trim());
        if (key && val) styles[key] = val.replace(/;$/, '');
    }
    return styles;
}
