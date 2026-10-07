import { parseNodeDeclaration, type RawNode } from './mermaidParserHelpers';

export type MermaidDiagramType = 'flowchart' | 'stateDiagram' | 'unknown';
export type MermaidDirection = 'TB' | 'LR' | 'RL' | 'BT';

export interface MermaidRawEdge {
  source: string;
  target: string;
  label: string;
  arrowType: string;
  /** `e1@{ animate: true }` on the edge declared as `A e1@--> B`. */
  animate?: boolean;
}

export interface MermaidParseModel {
  nodesMap: Map<string, RawNode>;
  rawEdges: MermaidRawEdge[];
  linkStyles: Map<number, Record<string, string>>;
  classDefs: Map<string, Record<string, string>>;
  diagnostics: string[];
  direction: MermaidDirection;
  diagramType: MermaidDiagramType;
}

export interface MermaidParseState {
  nodesMap: Map<string, RawNode>;
  rawEdges: MermaidRawEdge[];
  /** Edge ids (`A e1@--> B`), so `e1@{ … }` sets the edge instead of declaring a node. */
  edgeIds: Map<string, MermaidRawEdge>;
  linkStyles: Map<number, Record<string, string>>;
  classDefs: Map<string, Record<string, string>>;
  diagnostics: string[];
  direction: MermaidDirection;
  diagramType: MermaidDiagramType;
  parentStack: string[];
  stateStartIdCounter: number;
}

export function createMermaidParseState(): MermaidParseState {
  return {
    nodesMap: new Map<string, RawNode>(),
    rawEdges: [],
    edgeIds: new Map<string, MermaidRawEdge>(),
    linkStyles: new Map<number, Record<string, string>>(),
    classDefs: new Map<string, Record<string, string>>(),
    diagnostics: [],
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
    // Only re-parent if this reference is an explicit declaration (has a distinct label
    // or shape), not a bare ID reference from an edge. A bare edge reference like
    // `VEC --> RETRIEVE` inside a subgraph should NOT pull VEC into that subgraph if
    // VEC was already declared outside it — that violates Mermaid's actual membership
    // semantics where only explicit subgraph-interior declarations create membership.
    if (!existing.parentId && parentId && parsed.label !== parsed.id) {
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
    diagnostics: state.diagnostics,
    direction: state.direction,
    diagramType: state.diagramType,
  };
}
