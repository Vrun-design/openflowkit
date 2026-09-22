import type { DslDiagram, DslFamily } from './ast';
import { isReservedFamily, parseDocument } from './document';
import { parseGraphStatements } from './families/graph/parse';

/** Families whose statements the graph parser reads without rewriting. */
const GRAPH_FAMILIES: readonly DslFamily[] = ['flowchart', 'architecture'];

/**
 * Compatibility front door: the shared document parse plus the graph statement
 * parser. The code panel calls this for live diagnostics; families are
 * dispatched through `compile`. Non-graph families (sequence, class, …) get
 * the shared diagnostics only — running the graph parser over them reports
 * valid lines as dropped.
 * ponytail: header-level diagnostics only for those families — compile with
 * `deterministicLayout` off the main thread when the panel wants full ones.
 */
export function parse(input: string): DslDiagram {
  const document = parseDocument(input);
  const diagnostics = [...document.diagnostics];
  const graphSyntax = GRAPH_FAMILIES.includes(document.family) || isReservedFamily(document.family);
  const statements = graphSyntax ? parseGraphStatements(document.segments, diagnostics) : [];
  return {
    version: document.version,
    family: document.family,
    ...(document.direction ? { direction: document.direction } : {}),
    statements,
    comments: [...document.comments],
    diagnostics,
  };
}
