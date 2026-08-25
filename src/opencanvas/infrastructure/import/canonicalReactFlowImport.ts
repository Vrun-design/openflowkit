import { isDiagramType, type DiagramType, type FlowEdge, type FlowNode } from '@/lib/types';
import { SCENE_DOCUMENT_FORMAT } from '../../domain/document/types';
import { projectSceneDocumentToReactFlow } from '../reactflow/toReactFlow';
import { importCanonicalJson, type CanonicalImportOptions } from './canonicalJson';

export interface CanonicalReactFlowImport {
  readonly nodes: FlowNode[];
  readonly edges: FlowEdge[];
  readonly diagramType: DiagramType;
  readonly warnings: readonly string[];
}

export function isCanonicalJsonDocument(value: unknown): boolean {
  return Boolean(
    value
    && typeof value === 'object'
    && !Array.isArray(value)
    && (value as Record<string, unknown>).format === SCENE_DOCUMENT_FORMAT
  );
}

export function importCanonicalJsonToReactFlow(
  source: string,
  options: CanonicalImportOptions = {}
): CanonicalReactFlowImport {
  const imported = importCanonicalJson(source, options);
  const page = imported.document.pages[0];
  const projection = projectSceneDocumentToReactFlow(imported.document, page.id);
  const warnings: string[] = imported.migrations.map(
    (migration) => `Canonical document migration applied: ${migration}.`
  );
  warnings.push(...imported.repairs.map((repair) => (
    `Canonical integrity repair for ${repair.pageId}/${repair.objectId}: ${repair.detail}`
  )));

  if (imported.document.pages.length > 1) {
    warnings.push(
      `Canonical document contains ${imported.document.pages.length} pages; imported the first page "${page.name}" into the current workspace.`
    );
  }

  const diagramType = isDiagramType(projection.diagramType)
    ? projection.diagramType
    : 'flowchart';
  if (diagramType !== projection.diagramType) {
    warnings.push(
      `Canonical diagram kind "${projection.diagramType}" is not supported by the current workspace; using flowchart.`
    );
  }

  return {
    nodes: projection.nodes,
    edges: projection.edges,
    diagramType,
    warnings,
  };
}
