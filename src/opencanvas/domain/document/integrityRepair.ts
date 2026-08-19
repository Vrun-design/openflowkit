import type { SceneDocumentV1, ScenePage } from './types';
import { validateSceneDocumentV1, type DocumentValidationIssue } from './validation';

export interface IntegrityRepairAction {
  readonly kind: 'reset-layer' | 'detach-parent' | 'remove-connector' | 'reset-port';
  readonly pageId: string;
  readonly objectId: string;
  readonly detail: string;
}

export type DocumentIntegrityReport =
  | { readonly status: 'healthy'; readonly document: SceneDocumentV1; readonly issues: readonly [] }
  | { readonly status: 'repairable'; readonly document: SceneDocumentV1;
      readonly issues: readonly DocumentValidationIssue[]; readonly actions: readonly IntegrityRepairAction[] }
  | { readonly status: 'unrepairable'; readonly issues: readonly DocumentValidationIssue[] };

function repairPage(page: ScenePage): { page: ScenePage; actions: IntegrityRepairAction[] } {
  const actions: IntegrityRepairAction[] = [];
  const defaultLayerId = page.layers[0].id;
  const nodeIds = new Set(page.nodes.map(({ id }) => id));
  const originalById = new Map(page.nodes.map((node) => [node.id, node]));
  const cyclic = new Set<string>();
  for (const node of page.nodes) {
    const seen = new Set([node.id]); let parentId = node.parentId;
    while (parentId !== null) {
      if (seen.has(parentId)) { cyclic.add(node.id); break; }
      seen.add(parentId); parentId = originalById.get(parentId)?.parentId ?? null;
    }
  }
  const layerIds = new Set(page.layers.map(({ id }) => id));
  const nodes = page.nodes.map((node) => {
    let next = node;
    if (!layerIds.has(node.layerId)) {
      next = { ...next, layerId: defaultLayerId };
      actions.push({ kind: 'reset-layer', pageId: page.id, objectId: node.id,
        detail: `Moved to layer "${defaultLayerId}".` });
    }
    if (node.parentId === node.id || (node.parentId !== null && !nodeIds.has(node.parentId))
      || cyclic.has(node.id)) {
      next = { ...next, parentId: null };
      actions.push({ kind: 'detach-parent', pageId: page.id, objectId: node.id,
        detail: 'Detached invalid parent reference.' });
    }
    return next;
  });
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const connectors = page.connectors.flatMap((connector) => {
    const source = nodesById.get(connector.source.nodeId);
    const target = nodesById.get(connector.target.nodeId);
    if (!source || !target) {
      actions.push({ kind: 'remove-connector', pageId: page.id, objectId: connector.id,
        detail: 'Removed connector with a missing endpoint.' });
      return [];
    }
    let next = connector;
    if (connector.source.portId !== null
      && !source.ports.some(({ id }) => id === connector.source.portId)) {
      next = { ...next, source: { ...next.source, portId: null } };
      actions.push({ kind: 'reset-port', pageId: page.id, objectId: connector.id,
        detail: 'Reset missing source port to automatic anchoring.' });
    }
    if (connector.target.portId !== null
      && !target.ports.some(({ id }) => id === connector.target.portId)) {
      next = { ...next, target: { ...next.target, portId: null } };
      actions.push({ kind: 'reset-port', pageId: page.id, objectId: connector.id,
        detail: 'Reset missing target port to automatic anchoring.' });
    }
    return [next];
  });
  return { page: { ...page, nodes, connectors }, actions };
}

export function inspectDocumentIntegrity(value: unknown): DocumentIntegrityReport {
  const initial = validateSceneDocumentV1(value);
  if (initial.success === true) return { status: 'healthy', document: initial.document, issues: [] };
  if (!value || typeof value !== 'object' || !Array.isArray((value as { pages?: unknown }).pages)) {
    return { status: 'unrepairable', issues: initial.issues };
  }
  const candidate = structuredClone(value) as SceneDocumentV1;
  const results = candidate.pages.map(repairPage);
  const repaired = { ...candidate, pages: results.map(({ page }) => page) };
  const validation = validateSceneDocumentV1(repaired);
  if (!validation.success) return { status: 'unrepairable', issues: initial.issues };
  const actions = results.flatMap(({ actions: pageActions }) => pageActions);
  return actions.length > 0
    ? { status: 'repairable', document: validation.document, issues: initial.issues, actions }
    : { status: 'unrepairable', issues: initial.issues };
}
