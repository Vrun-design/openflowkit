import type { DslDiagram } from './ast';
import { parseDocument } from './document';
import { parseGraphStatements } from './families/graph/parse';

/**
 * Compatibility front door: the shared document parse plus the graph statement
 * parser. The code panel calls this for live diagnostics; families are
 * dispatched through `compile`.
 */
export function parse(input: string): DslDiagram {
  const document = parseDocument(input);
  const diagnostics = [...document.diagnostics];
  const statements = parseGraphStatements(document.segments, diagnostics);
  return {
    version: document.version,
    family: document.family,
    ...(document.direction ? { direction: document.direction } : {}),
    statements,
    comments: [...document.comments],
    diagnostics,
  };
}
