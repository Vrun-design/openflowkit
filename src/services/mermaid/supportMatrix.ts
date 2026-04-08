import { DIAGRAM_TYPES, type DiagramType } from '@/lib/types';

export type MermaidConstructSupportStatus = 'editable' | 'partial' | 'unsupported';

export interface MermaidFamilySupportMatrixEntry {
  family: DiagramType;
  label: string;
  priorityRank: number;
  goal: 'flagship' | 'core' | 'broad';
  editableConstructs: string[];
  partialConstructs: string[];
  unsupportedConstructs: string[];
}

const MERMAID_FAMILY_SUPPORT_MATRIX: Record<DiagramType, MermaidFamilySupportMatrixEntry> = {
  flowchart: {
    family: 'flowchart',
    label: 'Flowchart',
    priorityRank: 1,
    goal: 'core',
    editableConstructs: [
      'basic nodes and edges',
      'direction headers',
      'subgraphs',
      'classDef/style directives',
      'chained edges',
    ],
    partialConstructs: [
      'edge syntax edge cases',
      'complex subgraph semantics',
      'official-valid but unusual arrow forms',
    ],
    unsupportedConstructs: [],
  },
  architecture: {
    family: 'architecture',
    label: 'Architecture',
    priorityRank: 2,
    goal: 'flagship',
    editableConstructs: [
      'services',
      'provider/resource typing',
      'official architecture edges',
      'strict mode validation',
      'provider-aware icon enrichment',
    ],
    partialConstructs: [
      'OpenFlowKit-specific labeled architecture edge extensions',
      'recovered implicit nodes',
      'title and metadata round-trip nuance',
    ],
    unsupportedConstructs: [],
  },
  sequence: {
    family: 'sequence',
    label: 'Sequence',
    priorityRank: 3,
    goal: 'core',
    editableConstructs: [
      'participants',
      'messages',
      'notes',
      'activations',
      'common fragments',
    ],
    partialConstructs: [
      'advanced fragment fidelity',
      'visual semantics for complex nested fragments',
    ],
    unsupportedConstructs: [],
  },
  stateDiagram: {
    family: 'stateDiagram',
    label: 'State Diagram',
    priorityRank: 4,
    goal: 'core',
    editableConstructs: [
      'states and transitions',
      'initial/final states',
      'direction headers',
      'notes',
      'composite blocks',
      'fork/join controls',
    ],
    partialConstructs: [
      'advanced state semantics beyond current editable model',
    ],
    unsupportedConstructs: [],
  },
  erDiagram: {
    family: 'erDiagram',
    label: 'ER Diagram',
    priorityRank: 5,
    goal: 'core',
    editableConstructs: [
      'entities',
      'relations',
      'field parsing',
      'key flags',
    ],
    partialConstructs: [
      'constraint richness',
      'reference-field fidelity',
      'official-valid field metadata variants',
    ],
    unsupportedConstructs: [],
  },
  classDiagram: {
    family: 'classDiagram',
    label: 'Class Diagram',
    priorityRank: 6,
    goal: 'core',
    editableConstructs: [
      'classes',
      'class members',
      'basic inheritance and relations',
    ],
    partialConstructs: [
      'generics',
      'visibility richness',
      'cardinality and advanced relation semantics',
    ],
    unsupportedConstructs: [],
  },
  mindmap: {
    family: 'mindmap',
    label: 'Mindmap',
    priorityRank: 7,
    goal: 'broad',
    editableConstructs: [
      'root/branch structure',
      'wrapper shapes',
      'depth-based editing',
    ],
    partialConstructs: [
      'formatting edge cases from indentation-driven syntax',
    ],
    unsupportedConstructs: [],
  },
  journey: {
    family: 'journey',
    label: 'Journey',
    priorityRank: 8,
    goal: 'broad',
    editableConstructs: [
      'title',
      'sections',
      'tasks',
      'scores',
      'actors',
    ],
    partialConstructs: [
      'visual differentiation depth',
      'advanced actor/task semantics',
    ],
    unsupportedConstructs: [],
  },
};

export function listMermaidFamilySupportMatrix(): MermaidFamilySupportMatrixEntry[] {
  return DIAGRAM_TYPES.map((family) => MERMAID_FAMILY_SUPPORT_MATRIX[family]).sort(
    (left, right) => left.priorityRank - right.priorityRank
  );
}

export function getMermaidFamilySupportMatrixEntry(
  family: DiagramType
): MermaidFamilySupportMatrixEntry {
  return MERMAID_FAMILY_SUPPORT_MATRIX[family];
}

