import { MarkerType } from '@/lib/reactflowCompat';
import { createDefaultEdge } from '@/constants';
import { SECTION_MIN_HEIGHT, SECTION_MIN_WIDTH } from '@/hooks/node-operations/sectionBounds';
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
  parseClassAssignmentLine,
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
  diagnostics?: string[];
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

  return (
    flowchartMatch[1].toUpperCase() === 'TD' ? 'TB' : flowchartMatch[1].toUpperCase()
  ) as MermaidDirection;
}

function parseStateDiagramDirection(nextLine: string | undefined): MermaidDirection {
  const dirMatch = nextLine?.trim().match(/^direction\s+(LR|TB)/i);
  return (dirMatch?.[1].toUpperCase() ?? 'TB') as MermaidDirection;
}

function createSectionIdFromLabel(label: string): string {
  return `subgraph_${label.replace(/[^a-zA-Z0-9_]/g, '_')}`;
}

function parseSubgraphDeclaration(
  line: string
): { sectionId: string; sectionLabel: string } | null {
  const subgraphMatch = line.match(/^subgraph\s+(.+)$/i);
  if (!subgraphMatch) {
    return null;
  }

  const remainder = subgraphMatch[1].trim();
  if (!remainder) {
    return null;
  }

  const parsedNodeDeclaration = parseNodeDeclaration(remainder);
  if (parsedNodeDeclaration) {
    return {
      sectionId: parsedNodeDeclaration.id,
      sectionLabel: parsedNodeDeclaration.label,
    };
  }

  const quotedLabelMatch = remainder.match(/^"([^"]+)"$/) || remainder.match(/^'([^']+)'$/);
  const sectionLabel = quotedLabelMatch?.[1]?.trim() ?? remainder;
  if (!sectionLabel) {
    return null;
  }

  return {
    sectionId: createSectionIdFromLabel(sectionLabel),
    sectionLabel,
  };
}

function registerSectionNode(
  state: ReturnType<typeof createMermaidParseState>,
  line: string
): boolean {
  const subgraphDeclaration = parseSubgraphDeclaration(line);
  const stateGroupMatch =
    line.match(/^state\s+"([^"]+)"\s+as\s+(\w+)\s+\{/i) || line.match(/^state\s+(\w+)\s+\{/i);

  if (!subgraphDeclaration && !stateGroupMatch) {
    return false;
  }

  let sectionId: string;
  let sectionLabel: string;

  if (subgraphDeclaration) {
    sectionLabel = subgraphDeclaration.sectionLabel;
    sectionId = subgraphDeclaration.sectionId;
  } else if (stateGroupMatch) {
    sectionId = stateGroupMatch[2] ?? stateGroupMatch[1];
    sectionLabel = stateGroupMatch[1] ?? stateGroupMatch[2];
  } else {
    return false;
  }

  let attempts = 0;
  let finalId = sectionId;
  while (state.nodesMap.has(finalId)) {
    finalId = `${sectionId}_${++attempts}`;
  }

  const parentId = state.parentStack[state.parentStack.length - 1];
  state.nodesMap.set(finalId, {
    id: finalId,
    label: sectionLabel,
    type: 'section',
    parentId,
  });
  state.parentStack.push(finalId);

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

function applyClassAssignmentDirective(
  state: ReturnType<typeof createMermaidParseState>,
  line: string
): boolean {
  const assignment = parseClassAssignmentLine(line);
  if (!assignment) {
    return false;
  }

  assignment.nodeIds.forEach((nodeId) => {
    registerMermaidNode(state, nodeId);
    const node = state.nodesMap.get(nodeId);
    if (!node) {
      return;
    }

    const existingClasses = new Set(node.classes ?? []);
    assignment.classNames.forEach((className) => existingClasses.add(className));
    node.classes = [...existingClasses];
  });

  return true;
}

function parseEdgeDeclaration(
  state: ReturnType<typeof createMermaidParseState>,
  line: string,
  lineNumber: number
): boolean {
  if (!ARROW_PATTERNS.some((arrow) => line.includes(arrow))) {
    return false;
  }

  const edgesFound = parseEdgeLine(line);
  if (edgesFound.length === 0) {
    state.diagnostics.push(`Invalid Mermaid edge syntax at line ${lineNumber}: "${line}"`);
    return true;
  }

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

  const stateDefMatch = line.match(/^state\s+"([^"]+)"\s+as\s+([A-Za-z_][\w.-]*)/i);
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
    const lineNumber = i + 1;
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
      if (state.parentStack.length > 0) {
        state.parentStack.pop();
      } else if (state.diagramType === 'flowchart') {
        state.diagnostics.push(`Unexpected flowchart block closer at line ${lineNumber}: "${line}"`);
      }
      continue;
    }

    if (state.diagramType === 'flowchart' && /^subgraph\b/i.test(line) && !parseSubgraphDeclaration(line)) {
      state.diagnostics.push(`Invalid flowchart subgraph declaration at line ${lineNumber}: "${line}"`);
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

    if (applyClassAssignmentDirective(state, line)) {
      continue;
    }

    const linkStyleMatch = parseLinkStyleLine(line);
    if (linkStyleMatch) {
      linkStyleMatch.indices.forEach((index) => state.linkStyles.set(index, linkStyleMatch.style));
      continue;
    }

    if (parseEdgeDeclaration(state, line, lineNumber)) {
      continue;
    }

    if (parseStateDiagramNodeDeclaration(state, line)) {
      continue;
    }

    const standalone = parseNodeDeclaration(line);
    if (standalone) {
      registerMermaidNode(state, line);
      continue;
    }

    if (state.diagramType === 'flowchart') {
      state.diagnostics.push(`Unrecognized flowchart line at line ${lineNumber}: "${line}"`);
    }
  }

  if (state.diagramType === 'flowchart' && state.parentStack.length > 0) {
    state.diagnostics.push(
      `Unclosed flowchart block detected (${state.parentStack.length} block(s) not closed).`
    );
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
      ...(node.type === 'section'
        ? {
            style: { width: SECTION_MIN_WIDTH, height: SECTION_MIN_HEIGHT },
          }
        : {}),
    };

    if (node.parentId) {
      flowNode = setNodeParent(flowNode, node.parentId, {
        constrainToParent: false,
      });
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
    return {
      nodes: [],
      edges: [],
      error: 'Missing chart type declaration. Start with "flowchart TD" or related.',
    };
  }

  if (model.nodesMap.size === 0) {
    return { nodes: [], edges: [], error: 'No valid nodes found.' };
  }

  return {
    nodes: createFlowNodes(model),
    edges: createFlowEdges(model),
    direction: model.direction,
    diagnostics: model.diagnostics.length > 0 ? model.diagnostics : undefined,
  };
}
