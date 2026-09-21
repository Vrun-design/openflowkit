export const DSL_FAMILIES = [
  'architecture', 'flowchart', 'gitgraph', 'sequence', 'state', 'erd', 'class',
  'mindmap', 'bpmn', 'org', 'gantt', 'wireframe', 'chart', 'sankey', 'journey',
  'timeline',
] as const;

export type DslFamily = typeof DSL_FAMILIES[number];
export type DslDirection = 'down' | 'right' | 'left' | 'up';

export interface SourceLocation {
  line: number;
  col: number;
  endCol: number;
}

export interface DslDiagnostic extends SourceLocation {
  code: `I${number}` | `W${number}` | `E${number}`;
  severity: 'info' | 'warning' | 'error';
  message: string;
  hint?: string;
  source: 'parse';
}

export interface DslAttribute extends SourceLocation {
  key?: string;
  value: string;
}

export interface DslReference extends SourceLocation {
  id?: string;
  label: string;
  attributes: DslAttribute[];
}

interface LocatedStatement extends SourceLocation {
  raw: string;
}

export interface DslNode extends LocatedStatement {
  kind: 'node';
  node: DslReference;
  reservedKind?: string;
}

export interface DslEdge extends LocatedStatement {
  kind: 'edge';
  from: DslReference;
  to: DslReference;
  arrow: '->' | '-->' | '<->' | '<-->' | '--';
  label?: string;
  attributes: DslAttribute[];
}

export interface DslGroup extends LocatedStatement {
  kind: 'group';
  group: DslReference;
  reservedKind?: string;
  statements: DslStatement[];
}

export interface DslDirective extends LocatedStatement {
  kind: 'directive';
  name: 'title' | 'direction' | 'autonumber' | 'align' | 'note' | 'legend';
  value: string;
}

export interface DslReserved extends LocatedStatement {
  kind: 'reserved';
  keyword: string;
  value: string;
  statements?: DslStatement[];
}

export type DslStatement = DslNode | DslEdge | DslGroup | DslDirective | DslReserved;

export interface DslDiagram {
  version: number;
  family: DslFamily;
  direction?: DslDirection;
  statements: DslStatement[];
  comments: Array<{ text: string; line: number }>;
  diagnostics: DslDiagnostic[];
}
