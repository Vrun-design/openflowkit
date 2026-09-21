import type { FlowEdge, FlowNode } from '@/lib/types';
import type { DiagramPlugin } from './plugin';

interface ParsedMindmapNode {
  depth: number;
  label: string;
  lineNumber: number;
  alias?: string;
  wrapper?: NonNullable<FlowNode['data']['mindmapWrapper']>;
}

interface StructuredNode extends ParsedMindmapNode {
  id: string;
  parentIndex: number | null;
}

const X_GAP = 260;
const Y_GAP = 110;
const ROOT_GAP = 80;
const MINDMAP_ALIAS_PATTERN = '[A-Za-z_][\\w.-]*';

function createWrappedMindmapPattern(open: string, close: string): RegExp {
  return new RegExp(`^(${MINDMAP_ALIAS_PATTERN})?\\s*${open}(.+)${close}$`);
}

function getIndentDepth(rawLine: string): number {
  return Math.floor(getLeadingIndentUnits(rawLine) / 2);
}

function getLeadingIndentUnits(rawLine: string): number {
  let indentUnits = 0;
  for (const char of rawLine) {
    if (char === ' ') {
      indentUnits += 1;
      continue;
    }
    if (char === '\t') {
      indentUnits += 2;
      continue;
    }
    break;
  }
  return indentUnits;
}

function extractMindmapLabel(
  rawContent: string
): {
  label: string;
  alias?: string;
  wrapper?: NonNullable<FlowNode['data']['mindmapWrapper']>;
} | null {
  const trimmed = rawContent.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('%%')) return null;
  if (trimmed.startsWith('::')) return null;

  const withoutDirective = trimmed.replace(/\s*::.+$/, '').trim();
  if (!withoutDirective) return null;

  const wrapperDefinitions: Array<{
    wrapper: NonNullable<FlowNode['data']['mindmapWrapper']>;
    pattern: RegExp;
  }> = [
    { wrapper: 'double-circle', pattern: createWrappedMindmapPattern('\\(\\(', '\\)\\)') },
    { wrapper: 'double-square', pattern: createWrappedMindmapPattern('\\[\\[', '\\]\\]') },
    { wrapper: 'stadium', pattern: createWrappedMindmapPattern('\\(\\[', '\\]\\)') },
    { wrapper: 'subroutine', pattern: createWrappedMindmapPattern('\\[\\(', '\\)\\]') },
    { wrapper: 'square', pattern: createWrappedMindmapPattern('\\[', '\\]') },
    { wrapper: 'rounded', pattern: createWrappedMindmapPattern('\\(', '\\)') },
    { wrapper: 'hexagon', pattern: createWrappedMindmapPattern('\\{\\{', '\\}\\}') },
  ];

  for (const definition of wrapperDefinitions) {
    const wrappedMatch = withoutDirective.match(definition.pattern);
    const alias = wrappedMatch?.[1]?.trim();
    const value = wrappedMatch?.[2]?.trim();
    if (value) {
      return { label: value, alias, wrapper: definition.wrapper };
    }
  }

  return { label: withoutDirective };
}

function hasMalformedWrappedLabel(rawContent: string): boolean {
  const trimmed = rawContent.trim();
  const compact = trimmed.replace(new RegExp(`^${MINDMAP_ALIAS_PATTERN}\\s*`), '');
  const wrappers: Array<{ open: string; close: string }> = [
    { open: '((', close: '))' },
    { open: '[[', close: ']]' },
    { open: '([', close: '])' },
    { open: '[(', close: ')]' },
    { open: '{{', close: '}}' },
  ];

  const matchedWrapper = wrappers.find((wrapper) => compact.startsWith(wrapper.open));
  if (!matchedWrapper) return false;
  return !compact.endsWith(matchedWrapper.close);
}

function parseMindmap(input: string): { nodes: FlowNode[]; edges: FlowEdge[]; error?: string; diagnostics?: string[] } {
  const lines = input.replace(/\r\n/g, '\n').split('\n');
  const parsedNodes: ParsedMindmapNode[] = [];
  const diagnostics: string[] = [];
  let hasHeader = false;
  let previousDepth = 0;
  let isFirstContentNode = true;

  for (const [index, rawLine] of lines.entries()) {
    const lineNumber = index + 1;
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('%%')) continue;

    if (/^mindmap\b/i.test(trimmed)) {
      hasHeader = true;
      continue;
    }

    if (!hasHeader) continue;

    if (hasMalformedWrappedLabel(rawLine)) {
      diagnostics.push(`Malformed mindmap wrapper syntax at line ${lineNumber}: "${trimmed}"`);
      continue;
    }

    const parsedLabel = extractMindmapLabel(rawLine);
    if (!parsedLabel) continue;

    const indentUnits = getLeadingIndentUnits(rawLine);
    if (indentUnits % 2 !== 0) {
      diagnostics.push(`Odd indentation width at line ${lineNumber}; mindmap expects 2-space indentation steps.`);
    }

    const depth = getIndentDepth(rawLine);
    if (!isFirstContentNode && depth > previousDepth + 1) {
      diagnostics.push(
        `Mindmap indentation jump at line ${lineNumber}: depth ${depth} follows depth ${previousDepth}.`
      );
    }
    previousDepth = depth;
    isFirstContentNode = false;

    parsedNodes.push({
      depth,
      label: parsedLabel.label,
      alias: parsedLabel.alias,
      lineNumber,
      wrapper: parsedLabel.wrapper,
    });
  }

  if (!hasHeader) {
    return {
      nodes: [],
      edges: [],
      error: 'Missing mindmap header.',
    };
  }

  if (parsedNodes.length === 0) {
    return {
      nodes: [],
      edges: [],
      error: 'No valid mindmap nodes found.',
    };
  }

  const baselineDepth = Math.min(...parsedNodes.map((node) => node.depth));
  const normalizedParsedNodes = parsedNodes.map((node) => ({
    ...node,
    depth: Math.max(0, node.depth - baselineDepth),
  }));

  const structuredNodes: StructuredNode[] = [];
  const stack: Array<{ depth: number; index: number }> = [];

  normalizedParsedNodes.forEach((parsedNode, index) => {
    while (stack.length > 0 && stack[stack.length - 1].depth >= parsedNode.depth) {
      stack.pop();
    }

    const parentIndex = stack.length > 0 ? stack[stack.length - 1].index : null;
    structuredNodes.push({
      id: `mm-${index + 1}`,
      depth: parsedNode.depth,
      label: parsedNode.label,
      alias: parsedNode.alias,
      lineNumber: parsedNode.lineNumber,
      wrapper: parsedNode.wrapper,
      parentIndex,
    });
    stack.push({ depth: parsedNode.depth, index });
  });

  const childrenByIndex = new Map<number, number[]>();
  const rootIndices: number[] = [];

  structuredNodes.forEach((node, index) => {
    if (node.parentIndex === null) {
      rootIndices.push(index);
      return;
    }

    const siblings = childrenByIndex.get(node.parentIndex) ?? [];
    siblings.push(index);
    childrenByIndex.set(node.parentIndex, siblings);
  });

  const leafCountMemo = new Map<number, number>();
  const getLeafCount = (index: number): number => {
    const cached = leafCountMemo.get(index);
    if (typeof cached === 'number') return cached;

    const children = childrenByIndex.get(index) ?? [];
    if (children.length === 0) {
      leafCountMemo.set(index, 1);
      return 1;
    }

    const count = children.reduce((sum, childIndex) => sum + getLeafCount(childIndex), 0);
    leafCountMemo.set(index, count);
    return count;
  };

  const yByIndex = new Map<number, number>();
  const assignSubtreeY = (index: number, startY: number): number => {
    const children = childrenByIndex.get(index) ?? [];
    if (children.length === 0) {
      yByIndex.set(index, startY);
      return startY + Y_GAP;
    }

    let cursorY = startY;
    for (const childIndex of children) {
      cursorY = assignSubtreeY(childIndex, cursorY);
    }

    const endY = cursorY - Y_GAP;
    yByIndex.set(index, (startY + endY) / 2);
    return cursorY;
  };

  let rootStartY = 0;
  for (const rootIndex of rootIndices) {
    assignSubtreeY(rootIndex, rootStartY);
    rootStartY += getLeafCount(rootIndex) * Y_GAP + ROOT_GAP;
  }

  const nodes: FlowNode[] = structuredNodes.map((node, index) => ({
    id: node.id,
    type: 'mindmap',
    position: {
      x: node.depth * X_GAP,
      y: yByIndex.get(index) ?? 0,
    },
    data: {
      label: node.label,
      color: 'slate',
      shape: node.depth === 0 ? 'rounded' : 'rectangle',
      mindmapDepth: node.depth,
      mindmapParentId: node.parentIndex === null ? undefined : structuredNodes[node.parentIndex].id,
      mindmapAlias: node.alias,
      mindmapWrapper: node.wrapper,
    },
  }));

  const edges: FlowEdge[] = structuredNodes
    .filter((node) => node.parentIndex !== null)
    .map((node, edgeIndex) => ({
      id: `e-mindmap-${edgeIndex + 1}`,
      source: structuredNodes[node.parentIndex as number].id,
      target: node.id,
      type: 'smoothstep',
    }));

  return diagnostics.length > 0 ? { nodes, edges, diagnostics } : { nodes, edges };
}

export const MINDMAP_PLUGIN: DiagramPlugin = {
  id: 'mindmap',
  displayName: 'Mindmap',
  parseMermaid: parseMindmap,
};
