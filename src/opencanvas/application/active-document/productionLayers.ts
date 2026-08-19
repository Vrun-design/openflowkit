import type { DocumentCommand } from '../../domain/commands/types';
import type { SceneLayer, ScenePage } from '../../domain/document/types';

export interface ProductionLayerUpdates {
  readonly name?: string;
  readonly visible?: boolean;
  readonly locked?: boolean;
}

export function buildProductionInsertLayerCommand(
  page: ScenePage,
  layerId: string,
  name: string
): DocumentCommand {
  const nextName = name.trim();
  if (!layerId.trim() || page.layers.some((layer) => layer.id === layerId)) {
    throw new Error('Layer ID must be non-empty and unique.');
  }
  if (!nextName) throw new Error('Layer name must not be empty.');
  return {
    kind: 'insert-layer', id: `insert-layer:${layerId}`, label: 'Add layer',
    pageId: page.id, index: page.layers.length,
    layer: { id: layerId, name: nextName, visible: true, locked: false },
  };
}

export function buildProductionRemoveLayerCommand(
  page: ScenePage,
  layerId: string,
  fallbackLayerId: string
): DocumentCommand {
  const layer = requireLayer(page, layerId);
  requireLayer(page, fallbackLayerId);
  if (layerId === fallbackLayerId) throw new Error('Deleted and fallback layers must differ.');
  if (page.layers.length <= 1) throw new Error('A page must retain at least one layer.');
  const commands: DocumentCommand[] = page.nodes
    .filter((node) => node.layerId === layerId)
    .map((node) => ({
      kind: 'set-node' as const, id: `move-before-layer-delete:${node.id}`,
      label: 'Delete layer', pageId: page.id, before: node,
      after: { ...node, layerId: fallbackLayerId },
    }));
  commands.push({
    kind: 'remove-layer', id: `remove-layer:${layerId}`, label: 'Delete layer',
    pageId: page.id, index: page.layers.findIndex((candidate) => candidate.id === layerId), layer,
  });
  return { kind: 'batch', id: `delete-layer:${layerId}`, label: 'Delete layer', commands };
}

export function buildProductionReorderLayerCommand(
  page: ScenePage,
  layerId: string,
  direction: 'down' | 'up'
): DocumentCommand | null {
  const layer = requireLayer(page, layerId);
  const index = page.layers.findIndex((candidate) => candidate.id === layerId);
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= page.layers.length) return null;
  return {
    kind: 'batch', id: `reorder-layer:${layerId}:${direction}`, label: 'Reorder layer',
    commands: [
      { kind: 'remove-layer', id: `remove-layer:${layerId}`, label: 'Reorder layer',
        pageId: page.id, index, layer },
      { kind: 'insert-layer', id: `insert-layer:${layerId}`, label: 'Reorder layer',
        pageId: page.id, index: targetIndex, layer },
    ],
  };
}

function requireLayer(page: ScenePage, layerId: string): SceneLayer {
  const layer = page.layers.find((candidate) => candidate.id === layerId);
  if (!layer) throw new Error(`Layer "${layerId}" was not found.`);
  return layer;
}

export function buildProductionLayerCommand(
  page: ScenePage,
  layerId: string,
  updates: ProductionLayerUpdates
): DocumentCommand | null {
  const before = requireLayer(page, layerId);
  const name = updates.name === undefined ? before.name : updates.name.trim();
  if (!name) throw new Error('Layer name must not be empty.');
  const after = {
    ...before,
    name,
    visible: updates.visible ?? before.visible,
    locked: updates.locked ?? before.locked,
  };
  if (after.name === before.name && after.visible === before.visible && after.locked === before.locked) {
    return null;
  }
  return {
    kind: 'set-layer', id: `edit-layer:${layerId}`, label: 'Edit layer',
    pageId: page.id, before, after,
  };
}

export function buildProductionNodeLayerCommand(
  page: ScenePage,
  nodeId: string,
  layerId: string
): DocumentCommand | null {
  requireLayer(page, layerId);
  const before = page.nodes.find((node) => node.id === nodeId);
  if (!before) throw new Error(`Node "${nodeId}" was not found.`);
  if (before.layerId === layerId) return null;
  const descendants = new Set<string>([nodeId]);
  for (let index = 0; index < page.nodes.length; index += 1) {
    for (const node of page.nodes) {
      if (node.parentId && descendants.has(node.parentId)) descendants.add(node.id);
    }
  }
  const commands: DocumentCommand[] = page.nodes
    .filter((node) => descendants.has(node.id) && node.layerId !== layerId)
    .map((node) => ({
      kind: 'set-node' as const,
      id: `move-node-layer:${node.id}`,
      label: 'Move node to layer',
      pageId: page.id,
      before: node,
      after: { ...node, layerId },
    }));
  if (commands.length === 1) return commands[0];
  return { kind: 'batch', id: `move-node-layer:${nodeId}`, label: 'Move node to layer', commands };
}

export function isNodeEditableOnLayer(page: ScenePage, nodeId: string): boolean {
  const node = page.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) return false;
  const layer = page.layers.find((candidate) => candidate.id === node.layerId);
  return layer?.visible === true && layer.locked === false;
}
