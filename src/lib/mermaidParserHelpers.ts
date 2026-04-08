import type { NodeData } from './types';

export const SHAPE_OPENERS: Array<{
  open: string;
  close: string;
  type: string;
  shape: NodeData['shape'];
}> = [
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

export function parseLinkStyleLine(
  line: string
): { indices: number[]; style: Record<string, string> } | null {
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
  // Collapse extended arrows: ---> → -->, ====> → ==>, -..-> → -.->
  // Mermaid spec allows any number of repeated chars in the arrow body.
  result = result.replace(/={3,}>/g, '==>');
  result = result.replace(/-{3,}>/g, '-->');
  result = result.replace(/-\.{2,}->/g, '-.->');
  result = result.replace(/<-{3,}>/g, '<-->');
  result = result.replace(/<={3,}>/g, '<==>');
  result = result.replace(/<-\.{2,}->/g, '<-.->');
  // Inline-label arrow forms: == text ==> and -- text -->
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

const MODERN_SHAPE_MAP: Record<string, { type: string; shape: NodeData['shape'] }> = {
  cyl: { type: 'process', shape: 'cylinder' },
  cylinder: { type: 'process', shape: 'cylinder' },
  circle: { type: 'end', shape: 'circle' },
  circle2: { type: 'end', shape: 'circle' },
  cloud: { type: 'process', shape: 'rounded' },
  diamond: { type: 'decision', shape: 'diamond' },
  hexagon: { type: 'custom', shape: 'hexagon' },
  'lean-r': { type: 'process', shape: 'parallelogram' },
  'lean-l': { type: 'process', shape: 'parallelogram' },
  stadium: { type: 'start', shape: 'capsule' },
  rounded: { type: 'process', shape: 'rounded' },
  rect: { type: 'process', shape: 'rounded' },
  square: { type: 'process', shape: 'rounded' },
  doublecircle: { type: 'end', shape: 'circle' },
};

interface ModernShapeAnnotation {
  shapeKey?: string;
  labelOverride?: string;
  cleanInput: string;
}

function extractModernAnnotation(input: string): ModernShapeAnnotation {
  const match = input.match(/^(\w+)@\{([^}]+)\}/);
  if (!match) return { cleanInput: input };

  const id = match[1];
  const attrs = match[2];
  const rest = input.substring(match[0].length);

  const shapeMatch = attrs.match(/\bshape:\s*(\w+)/);
  const labelMatch = attrs.match(/\blabel:\s*"([^"]+)"/);

  return {
    shapeKey: shapeMatch?.[1]?.toLowerCase(),
    labelOverride: labelMatch?.[1],
    cleanInput: `${id}${rest}`,
  };
}

function stripMarkdown(label: string): string {
  return label
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/`(.+?)`/g, '$1');
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
  if (
    (label.startsWith('"') && label.endsWith('"')) ||
    (label.startsWith("'") && label.endsWith("'"))
  ) {
    label = label.slice(1, -1);
  }
  label = label.replace(/\\n/g, '\n');
  label = stripFaIcons(label);
  label = stripMarkdown(label);
  if (!label) label = id;

  return {
    id,
    label,
    type: shape.type,
    shape: shape.shape,
    classes: classes.length ? classes : undefined,
  };
}

export function parseNodeDeclaration(raw: string): RawNode | null {
  const trimmed = raw.trim().replace(/;$/, '');
  if (!trimmed) return null;

  const annotation = extractModernAnnotation(trimmed);
  const input = annotation.cleanInput;

  for (const shape of SHAPE_OPENERS) {
    const result = tryParseWithShape(input, shape);
    if (result) {
      if (annotation.shapeKey && MODERN_SHAPE_MAP[annotation.shapeKey]) {
        const override = MODERN_SHAPE_MAP[annotation.shapeKey];
        result.type = override.type;
        result.shape = override.shape;
      }
      if (annotation.labelOverride) {
        result.label = annotation.labelOverride;
      }
      result.label = stripMarkdown(result.label);
      return result;
    }
  }

  let id = input;
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

export const ARROW_PATTERNS = [
  '<==>',
  '<-.->',
  '<-->',
  '<==',
  '<-.',
  '<--',
  '===>',
  '-.->',
  '--->',
  '-->',
  '===',
  '---',
  '==>',
  '-.-',
  '--',
];

function sanitizeEdgeEndpoint(raw: string): string {
  return raw.trim().replace(/;$/, '').replace(/:::.*$/, '').trim();
}

function findArrowInLine(
  line: string
): { arrow: string; index: number; before: string; after: string } | null {
  let quoteChar: '"' | "'" | null = null;
  let pipeOpen = false;
  let squareDepth = 0;
  let roundDepth = 0;
  let curlyDepth = 0;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    const previousChar = line[index - 1];

    if (quoteChar) {
      if (char === quoteChar && previousChar !== '\\') {
        quoteChar = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quoteChar = char;
      continue;
    }

    if (char === '|') {
      pipeOpen = !pipeOpen;
      continue;
    }
    if (pipeOpen) {
      continue;
    }

    if (char === '[') {
      squareDepth += 1;
      continue;
    }
    if (char === ']') {
      squareDepth = Math.max(0, squareDepth - 1);
      continue;
    }
    if (char === '(') {
      roundDepth += 1;
      continue;
    }
    if (char === ')') {
      roundDepth = Math.max(0, roundDepth - 1);
      continue;
    }
    if (char === '{') {
      curlyDepth += 1;
      continue;
    }
    if (char === '}') {
      curlyDepth = Math.max(0, curlyDepth - 1);
      continue;
    }

    if (squareDepth > 0 || roundDepth > 0 || curlyDepth > 0) {
      continue;
    }

    for (const arrow of ARROW_PATTERNS) {
      if (line.startsWith(arrow, index)) {
        return {
          arrow,
          index,
          before: line.substring(0, index).trim(),
          after: line.substring(index + arrow.length).trim(),
        };
      }
    }
  }

  return null;
}

function parseEdgeLabelSegment(
  line: string,
  startIndex: number
): { label: string; nextIndex: number } {
  let index = startIndex;
  while (index < line.length && /\s/.test(line[index])) {
    index += 1;
  }

  if (line[index] !== '|') {
    return { label: '', nextIndex: index };
  }

  let label = '';
  let quoteChar: '"' | "'" | null = null;
  index += 1;

  while (index < line.length) {
    const char = line[index];
    const previousChar = line[index - 1];

    if (quoteChar) {
      if (char === quoteChar && previousChar !== '\\') {
        quoteChar = null;
      } else {
        label += char;
      }
      index += 1;
      continue;
    }

    if (char === '"' || char === "'") {
      quoteChar = char;
      index += 1;
      continue;
    }

    if (char === '|') {
      return { label: label.trim(), nextIndex: index + 1 };
    }

    label += char;
    index += 1;
  }

  return { label: label.trim(), nextIndex: index };
}

function expandAmpersandEdges(line: string): string[] {
  if (!line.includes('&')) return [line];
  const arrowMatch = findArrowInLine(line);
  if (!arrowMatch) return [line];

  const { arrow, index } = arrowMatch;
  const sourcePart = line.substring(0, index).trim();
  const afterArrow = line.substring(index + arrow.length).trim();

  // Parse optional pipe label after arrow
  const labelMatch = afterArrow.match(/^\|([^|]*)\|(.*)/);
  const label = labelMatch ? `|${labelMatch[1]}|` : '';
  const targetPart = labelMatch ? labelMatch[2].trim() : afterArrow;

  const sources = sourcePart.split('&').map((s) => s.trim()).filter(Boolean);
  const targets = targetPart.split('&').map((s) => s.trim()).filter(Boolean);

  if (sources.length <= 1 && targets.length <= 1) return [line];

  const lines: string[] = [];
  for (const src of sources) {
    for (const tgt of targets) {
      lines.push(`${src} ${arrow}${label} ${tgt}`);
    }
  }
  return lines;
}

export function parseEdgeLine(line: string): Array<{
  sourceRaw: string;
  targetRaw: string;
  label: string;
  arrowType: string;
}> {
  const expanded = expandAmpersandEdges(line);
  if (expanded.length > 1) {
    return expanded.flatMap(parseEdgeLine);
  }

  const edges: Array<{ sourceRaw: string; targetRaw: string; label: string; arrowType: string }> =
    [];
  let remaining = line.trim();
  let lastNodeRaw: string | null = null;

  while (remaining.trim()) {
    const arrowMatch = findArrowInLine(remaining);
    if (!arrowMatch) break;

    const { arrow } = arrowMatch;
    const sourceRaw = sanitizeEdgeEndpoint(lastNodeRaw || arrowMatch.before);
    const sourceOffset = arrowMatch.index + arrow.length;
    const { label, nextIndex } = parseEdgeLabelSegment(remaining, sourceOffset);
    const targetSegment = remaining.slice(nextIndex).trim();
    const nextArrowMatch = findArrowInLine(targetSegment);
    const targetRaw = sanitizeEdgeEndpoint(
      nextArrowMatch ? targetSegment.slice(0, nextArrowMatch.index) : targetSegment
    );

    if (sourceRaw && targetRaw) {
      edges.push({ sourceRaw, targetRaw, label, arrowType: arrow });
    }

    lastNodeRaw = targetRaw;
    remaining = nextArrowMatch ? targetSegment.slice(nextArrowMatch.index) : '';
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
