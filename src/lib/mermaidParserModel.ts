import { parseNodeDeclaration, type RawNode } from './mermaidParserHelpers';

export type MermaidDiagramType = 'flowchart' | 'stateDiagram' | 'unknown';
export type MermaidDirection = 'TB' | 'LR' | 'RL' | 'BT';

export interface MermaidRawEdge {
  source: string;
  target: string;
  label: string;
  arrowType: string;
}

export interface MermaidParseModel {
  nodesMap: Map<string, RawNode>;
  rawEdges: MermaidRawEdge[];
  linkStyles: Map<number, Record<string, string>>;
  classDefs: Map<string, Record<string, string>>;
  direction: MermaidDirection;
  diagramType: MermaidDiagramType;
}

export interface MermaidParseState {
  nodesMap: Map<string, RawNode>;
  rawEdges: MermaidRawEdge[];
  linkStyles: Map<number, Record<string, string>>;
  classDefs: Map<string, Record<string, string>>;
  direction: MermaidDirection;
  diagramType: MermaidDiagramType;
  parentStack: string[];
  stateStartIdCounter: number;
}

export function createMermaidParseState(): MermaidParseState {
  return {
    nodesMap: new Map<string, RawNode>(),
    rawEdges: [],
    linkStyles: new Map<number, Record<string, string>>(),
    classDefs: new Map<string, Record<string, string>>(),
    direction: 'TB',
    diagramType: 'unknown',
    parentStack: [],
    stateStartIdCounter: 0,
  };
}

function createFallbackRawNode(
  raw: string,
  type: 'process' | 'state'
): RawNode {
  const id = raw.trim();
  if (id.includes(':::')) {
    const parts = id.split(':::');
    return {
      id: parts[0],
      label: parts[0],
      type: 'process',
      classes: parts[1].split(/,\s*/),
    };
  }

  return { id, label: id, type };
}

function createStartStateNode(id: string): RawNode {
  return { id, label: 'Start/End', type: 'start', shape: 'circle' };
}

export function registerMermaidNode(
  state: MermaidParseState,
  raw: string,
  type: 'process' | 'state' = 'process',
  forceLabel?: string
): string | null {
  let parsed = parseNodeDeclaration(raw);

  if (raw === '[*]') {
    parsed = createStartStateNode(`state_start_${state.stateStartIdCounter++}`);
  } else if (!parsed) {
    parsed = createFallbackRawNode(raw, type);
  }

  const parentId = state.parentStack[state.parentStack.length - 1];
  const existing = state.nodesMap.get(parsed.id);

  if (!existing) {
    state.nodesMap.set(parsed.id, { ...parsed, parentId });
  } else {
    if (parsed.label !== parsed.id) {
      existing.label = parsed.label;
    }
    if (parsed.type !== 'process') {
      existing.type = parsed.type;
    }
    if (parsed.shape) {
      existing.shape = parsed.shape;
    }
    if (parsed.classes) {
      existing.classes = [...(existing.classes || []), ...parsed.classes];
    }
    if (!existing.parentId && parentId) {
      existing.parentId = parentId;
    }
  }

  if (forceLabel && state.nodesMap.has(parsed.id)) {
    state.nodesMap.get(parsed.id)!.label = forceLabel;
  }

  return parsed.id;
}

export function toMermaidParseModel(state: MermaidParseState): MermaidParseModel {
  return {
    nodesMap: state.nodesMap,
    rawEdges: state.rawEdges,
    linkStyles: state.linkStyles,
    classDefs: state.classDefs,
    direction: state.direction,
    diagramType: state.diagramType,
  };
}
