import { compile } from '../../../dsl/compile';
import type { SceneDocumentV1 } from '../../domain/document/types';
import { createEmptyV2Document } from './v2Document';

export const EXPORT_FIXTURE_DSL = '%% ofk 1\nflowchart\n\n  Client [blue] -> API [emerald, bold]\n  API -> Store [cylinder, red, bold]';

/** A one-page document holding a real compiled diagram, for export tests. */
export async function buildCanonicalFixtureDocument(name = 'Diagram'): Promise<SceneDocumentV1> {
  const document = createEmptyV2Document('doc-1', name);
  const compiled = await compile(EXPORT_FIXTURE_DSL);
  const page = document.pages[0]!;
  return {
    ...document,
    pages: [{
      ...page,
      diagramKind: compiled.meta.family,
      nodes: [compiled.frame, ...compiled.groups, ...compiled.nodes],
      connectors: compiled.connectors,
    }],
  };
}
