import type { NodeData } from './types';

export const SHAPE_OPENERS: Array<{ open: string; close: string; type: string; shape: NodeData['shape'] }> = [
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
const CLASS_DEF_RE = /^classDef\s+(\w+)\s+(.+)$/i;
const STYLE_RE = /^style\s+(\w+)\s+(.+)$/i;

export { CLASS_DEF_RE, STYLE_RE };

export function parseLinkStyleLine(line: string): { indices: number[]; style: Record<string, string> } | null {
    const match = line.match(LINK_STYLE_RE);
    if (!match) return null;

    const indices = match[1]
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !Number.isNaN(n));

    const styleParts = match[2].replace(/;$/, '').split(',');
    const style: Record<string, string> = {};

    for (const part of styleParts) {
        const [key, value] = part.split(':').map((s) => s.trim());
        if (key && value) {
            style[key] = value;
        }
    }

    return { indices, style };
}

export function normalizeMultilineStrings(input: string): string {
    let result = '';
    let inQuote = false;

    for (let i = 0; i < input.length; i++) {
        const char = input[i];
        if (char === '"' && input[i - 1] !== '\\') {
            inQuote = !inQuote;
        }

        if (inQuote && char === '\n') {
            result += '\\n';
            let nextIndex = i + 1;
            while (nextIndex < input.length && (input[nextIndex] === ' ' || input[nextIndex] === '\t')) {
                nextIndex++;
            }
            i = nextIndex - 1;
        } else {
            result += char;
        }
    }

    return result;
}

export function normalizeEdgeLabels(input: string): string {
    let result = input;
    result = result.replace(/==(?![>])\s*(.+?)\s*==>/g, ' ==>|$1|');
    result = result.replace(/--(?![>-])\s*(.+?)\s*-->/g, ' -->|$1|');
    result = result.replace(/-\.\s*(.+?)\s*\.->/g, ' -.->|$1|');
    result = result.replace(/--(?![>-])\s*(.+?)\s*---/g, ' ---|$1|');
    return result;
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
    const openIndex = input.indexOf(shape.open);
    if (openIndex < 1) return null;
    if (openIndex > 0 && input[openIndex - 1] === shape.open[0]) return null;

    const id = input.substring(0, openIndex).trim();
    if (!/^[a-zA-Z0-9_][\w-]*$/.test(id)) return null;

    const afterOpen = input.substring(openIndex + shape.open.length);
    const closeIndex = afterOpen.lastIndexOf(shape.close);
    if (closeIndex < 0) return null;

    const afterClose = afterOpen.substring(closeIndex + shape.close.length).trim();
    let classes: string[] = [];
    if (afterClose.startsWith(':::')) {
        classes = afterClose.substring(3).split(/,\s*/);
    } else if (afterClose) {
        return null;
    }

    let label = afterOpen.substring(0, closeIndex).trim();
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
        const index = line.indexOf(arrow);
        if (index >= 0) {
            return {
                arrow,
                before: line.substring(0, index).trim(),
                after: line.substring(index + arrow.length).trim(),
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

        let source = sourceRaw.trim();
        let target = targetRaw.trim();

        if (source.includes(':::')) source = source.split(':::')[0];
        if (target.includes(':::')) target = target.split(':::')[0];

        if (source && target) {
            edges.push({ sourceRaw: source, targetRaw: target, label, arrowType: arrow });
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
        const [key, value] = part.split(':').map((s) => s.trim());
        if (key && value) {
            styles[key] = value.replace(/;$/, '');
        }
    }

    return styles;
}
