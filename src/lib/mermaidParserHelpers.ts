import type { NodeData } from './types';

export const SHAPE_OPENERS: Array<{
  open: string;
  close: string;
  type: string;
  shape: NodeData['shape'];
}> = [
  { open: '([', close: '])', type: 'start', shape: 'capsule' },
  { open: '(((', close: ')))', type: 'end', shape: 'circle' },
  { open: '((', close: '))', type: 'end', shape: 'circle' },
  { open: '{{', close: '}}', type: 'custom', shape: 'hexagon' },
  { open: '[(', close: ')]', type: 'process', shape: 'cylinder' },
  { open: '[[', close: ']]', type: 'process', shape: 'rectangle' },
  // ponytail: mermaid's four slanted brackets all land on `parallelogram` —
  // the shape union has no trapezoid; add one when the renderer grows one.
  { open: '[/', close: '/]', type: 'process', shape: 'parallelogram' },
  { open: '[\\', close: '\\]', type: 'process', shape: 'parallelogram' },
  { open: '[/', close: '\\]', type: 'process', shape: 'parallelogram' },
  { open: '[\\', close: '/]', type: 'process', shape: 'parallelogram' },
  { open: '{', close: '}', type: 'decision', shape: 'diamond' },
  { open: '[', close: ']', type: 'process', shape: 'rectangle' },
  { open: '(', close: ')', type: 'process', shape: 'rounded' },
  { open: '>', close: ']', type: 'process', shape: 'parallelogram' },
];

export const SKIP_PATTERNS = [
  /^%%/,
  /^click\s/i,
  /^direction\s/i,
  /^accTitle\s/i,
  /^accDescr\s/i,
];

const LINK_STYLE_RE = /^linkStyle\s+([\d,\s]+)\s+(.+)$/i;
const MERMAID_NODE_ID_RE_SOURCE = '[a-zA-Z0-9_][\\w.-]*';
const CLASS_DEF_RE = /^classDef\s+([\w-]+)\s+(.+)$/i;
const STYLE_RE = new RegExp(`^style\\s+(${MERMAID_NODE_ID_RE_SOURCE})\\s+(.+)$`, 'i');
const MERMAID_NODE_ID_RE = new RegExp(`^${MERMAID_NODE_ID_RE_SOURCE}$`);

export { CLASS_DEF_RE, STYLE_RE };

export function parseClassAssignmentLine(
  line: string
): { nodeIds: string[]; classNames: string[] } | null {
  const trimmed = line.trim().replace(/;$/, '');
  const match = trimmed.match(/^class\s+(.+?)\s+([A-Za-z0-9_-]+(?:\s*,\s*[A-Za-z0-9_-]+)*)$/i);
  if (!match) return null;

  const nodeIds = match[1]
    .split(/\s*,\s*/)
    .map((value) => value.trim())
    .filter((value) => MERMAID_NODE_ID_RE.test(value));
  const classNames = match[2]
    .split(/\s*,\s*/)
    .map((value) => value.trim())
    .filter(Boolean);

  if (nodeIds.length === 0 || classNames.length === 0) {
    return null;
  }

  return { nodeIds, classNames };
}

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

/** Quoted newlines become `\n`; the swallowed lines come back as blanks after the line, so line numbers hold. */
export function normalizeMultilineStrings(input: string): string {
  let result = '';
  let inQuote = false;
  let swallowed = 0;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"' && input[i - 1] !== '\\') {
      inQuote = !inQuote;
    }

    if (!inQuote && char === '\n' && swallowed > 0) {
      result += '\n'.repeat(swallowed + 1);
      swallowed = 0;
    } else if (inQuote && char === '\n') {
      swallowed++;
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

/** Line by line: a pattern that crossed lines let a `%% ----` comment swallow the next statement. */
export function normalizeEdgeLabels(input: string): string {
  return input.split('\n').map((line) => (line.trim().startsWith('%%') ? line : normalizeLineEdgeLabels(line))).join('\n');
}

function normalizeLineEdgeLabels(line: string): string {
  let result = line;
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
  metadata?: {
    sectionMermaidId?: string;
    sectionMermaidTitle?: string;
    sectionMermaidDirection?: string;
  };
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
  rect: { type: 'process', shape: 'rectangle' },
  square: { type: 'process', shape: 'rectangle' },
  doublecircle: { type: 'end', shape: 'circle' },
};

interface ModernShapeAnnotation {
  shapeKey?: string;
  labelOverride?: string;
  cleanInput: string;
}

function extractModernAnnotation(input: string): ModernShapeAnnotation {
  const match = input.match(/^([a-zA-Z0-9_][\w.-]*)@\{([^}]+)\}/);
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

const NAMED_ENTITIES: Readonly<Record<string, string>> = { quot: '"', amp: '&', lt: '<', gt: '>', apos: "'", nbsp: ' ', hash: '#', semi: ';' };

/** Label text as Mermaid shows it: `\n` and `<br>`/`<br/>` break the line; `#quot;` and `#9829;` are entity codes. */
export function labelText(label: string): string {
  return label
    .replace(/\\n|<br\s*\/?>/gi, '\n')
    .replace(/#(\d+);/g, (code, digits: string) => (Number(digits) <= 0x10ffff ? String.fromCodePoint(Number(digits)) : code))
    .replace(/#([a-z]+);/gi, (code, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? code);
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
  if (!MERMAID_NODE_ID_RE.test(id)) return null;

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
  label = labelText(label);
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

  if (MERMAID_NODE_ID_RE.test(id)) {
    const override = annotation.shapeKey ? MODERN_SHAPE_MAP[annotation.shapeKey] : undefined;

    return {
      id,
      label: stripMarkdown(annotation.labelOverride ?? id),
      type: override?.type ?? 'process',
      shape: override?.shape,
      classes: classes.length ? classes : undefined,
    };
  }

  return null;
}

// Order matters at each position: longer and marker forms before the plain ones they start with.
export const ARROW_PATTERNS = [
  '~~~',
  'o--o',
  'x--x',
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
  '---o',
  '---x',
  '---',
  '==>',
  '-.-',
  '--o',
  '--x',
  '--',
];

function sanitizeEdgeEndpoint(raw: string): string {
  return raw.trim().replace(/;$/, '').trim();
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

function splitOnUnquotedAmpersand(input: string): string[] {
  const parts: string[] = [];
  let current = '';
  let quoteChar: string | null = null;
  let bracketDepth = 0;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoteChar) {
      if (char === quoteChar && input[i - 1] !== '\\') quoteChar = null;
      current += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quoteChar = char;
      current += char;
      continue;
    }
    if (char === '[' || char === '(' || char === '{') bracketDepth += 1;
    else if (char === ']' || char === ')' || char === '}') bracketDepth = Math.max(0, bracketDepth - 1);
    if (char === '&' && bracketDepth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  parts.push(current);
  return parts;
}

/**
 * A link statement as node groups and the links between them: `a --> b & c --> d` is
 * a→b, a→c, b→d, c→d. `&` splits a group only outside quotes and brackets, so a label
 * like "User & Auth" stays whole.
 */
export function parseEdgeLine(line: string): Array<{
  sourceRaw: string;
  targetRaw: string;
  label: string;
  arrowType: string;
}> {
  const groups: string[][] = [];
  const links: { arrow: string; label: string }[] = [];
  let remaining = line.trim();
  for (let match = findArrowInLine(remaining); match; match = findArrowInLine(remaining)) {
    groups.push(splitOnUnquotedAmpersand(remaining.slice(0, match.index)).map(sanitizeEdgeEndpoint).filter(Boolean));
    const { label, nextIndex } = parseEdgeLabelSegment(remaining, match.index + match.arrow.length);
    links.push({ arrow: match.arrow, label: labelText(label) });
    remaining = remaining.slice(nextIndex);
  }
  groups.push(splitOnUnquotedAmpersand(remaining).map(sanitizeEdgeEndpoint).filter(Boolean));
  return links.flatMap(({ arrow, label }, index) => groups[index]!.flatMap((sourceRaw) =>
    groups[index + 1]!.map((targetRaw) => ({ sourceRaw, targetRaw, label, arrowType: arrow }))));
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
