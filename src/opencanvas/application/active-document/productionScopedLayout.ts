import type { FlowEdge, FlowNode } from '@/lib/types';
import { getElkLayout, type LayoutOptions } from '@/services/elkLayout';
import { areStructurallyEqual } from '../../domain/commands/equality';
import type { DocumentCommand } from '../../domain/commands/types';
import type { SceneDocumentV1 } from '../../domain/document/types';
import { projectSceneDocumentToReactFlow } from '../../infrastructure/reactflow/toReactFlow';

export type CanonicalLayoutRunner = (
  nodes: FlowNode[], edges: FlowEdge[], options: LayoutOptions
) => Promise<{ nodes: FlowNode[]; edges: FlowEdge[] }>;

function scopeIds(document: SceneDocumentV1, pageId: string, selectedNodeIds: readonly string[]): Set<string> {
  const page = document.pages.find(({ id }) => id === pageId);
  if (!page) throw new RangeError(`OpenCanvas page "${pageId}" was not found.`);
  const ids = new Set(selectedNodeIds);
  if (ids.size === 0) for (const node of page.nodes) ids.add(node.id);
  if ([...ids].some((id) => !page.nodes.some((node) => node.id === id))) {
    throw new RangeError('Layout scope contains an unknown node.');
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of page.nodes) if (node.parentId && ids.has(node.parentId) && !ids.has(node.id)) {
      ids.add(node.id); changed = true;
    }
  }
  return ids;
}

export async function buildProductionScopedLayoutCommand(
  document: SceneDocumentV1,
  pageId: string,
  selectedNodeIds: readonly string[],
  options: LayoutOptions = {},
  runLayout: CanonicalLayoutRunner = getElkLayout
): Promise<DocumentCommand | null> {
  const page = document.pages.find(({ id }) => id === pageId);
  if (!page) throw new RangeError(`OpenCanvas page "${pageId}" was not found.`);
  const ids = scopeIds(document, pageId, selectedNodeIds);
  const projection = projectSceneDocumentToReactFlow(document, pageId);
  const nodes = projection.nodes.filter(({ id }) => ids.has(id)).map((node) => {
    const canonical = page.nodes.find(({ id }) => id === node.id)!;
    return { ...node, data: { ...node.data, pinned: canonical.content.pinned === true } };
  });
  const edges = projection.edges.filter(({ source, target }) => ids.has(source) && ids.has(target));
  const laidOut = await runLayout(nodes, edges, { ...options, diagramType: page.diagramKind });
  const byId = new Map(laidOut.nodes.map((node) => [node.id, node]));
  const commands: DocumentCommand[] = [];
  for (const before of page.nodes) {
    if (!ids.has(before.id) || before.content.pinned === true) continue;
    const result = byId.get(before.id);
    if (!result || !Number.isFinite(result.position.x) || !Number.isFinite(result.position.y)) {
      throw new TypeError(`Layout did not return finite geometry for "${before.id}".`);
    }
    const after = { ...before, transform: { ...before.transform,
      translation: { x: result.position.x, y: result.position.y } } };
    if (!areStructurallyEqual(before, after)) commands.push({ kind: 'set-node',
      id: `scoped-layout:${before.id}`, label: 'Apply scoped layout', pageId, before, after });
  }
  return commands.length === 0 ? null : {
    kind: 'batch', id: `scoped-layout:${pageId}`, label: 'Apply scoped layout', commands,
  };
}
