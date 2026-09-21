import type { DocumentCommand } from '../../domain/commands/types';
import type { SceneNode, ScenePage } from '../../domain/document/types';
import type { Point2d } from '../../domain/geometry/types';
import { createProductionSceneNode } from './productionNodeCatalog';

export type ProductionNodeMutation =
  | { readonly kind: 'rename'; readonly nodeId: string; readonly label: string }
  | { readonly kind: 'duplicate'; readonly nodeId: string; readonly newNodeId: string; readonly offset?: Point2d }
  | { readonly kind: 'insert'; readonly node: SceneNode }
  | { readonly kind: 'delete'; readonly nodeId: string };

function requireNode(page: ScenePage, nodeId: string): { node: SceneNode; index: number } {
  const index = page.nodes.findIndex((node) => node.id === nodeId);
  if (index < 0) throw new RangeError(`Node "${nodeId}" was not found.`);
  return { node: page.nodes[index], index };
}

function descendantIds(page: ScenePage, rootId: string): Set<string> {
  const ids = new Set([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of page.nodes) {
      if (node.parentId && ids.has(node.parentId) && !ids.has(node.id)) {
        ids.add(node.id);
        changed = true;
      }
    }
  }
  return ids;
}

export function buildProductionNodeMutationCommand(page: ScenePage, mutation: ProductionNodeMutation): {
  command: DocumentCommand | null;
  selectedNodeId: string | null;
} {
  switch (mutation.kind) {
    case 'rename': {
      const { node } = requireNode(page, mutation.nodeId);
      const label = mutation.label.trim();
      if (!label) throw new TypeError('Node label must not be empty.');
      if (node.content.label === label) return { command: null, selectedNodeId: node.id };
      return {
        command: {
          kind: 'set-node', id: `rename-node:${node.id}`, label: 'Rename node', pageId: page.id,
          before: node, after: { ...node, content: { ...node.content, label } },
        },
        selectedNodeId: node.id,
      };
    }
    case 'duplicate': {
      const { node, index } = requireNode(page, mutation.nodeId);
      if (!mutation.newNodeId || page.nodes.some((candidate) => candidate.id === mutation.newNodeId)) {
        throw new TypeError('Duplicate node requires a new unique id.');
      }
      const offset = mutation.offset ?? { x: 24, y: 24 };
      const duplicate: SceneNode = {
        ...node,
        id: mutation.newNodeId,
        zIndex: Math.max(0, ...page.nodes.map((candidate) => candidate.zIndex)) + 1,
        transform: {
          ...node.transform,
          translation: {
            x: node.transform.translation.x + offset.x,
            y: node.transform.translation.y + offset.y,
          },
        },
        content: { ...node.content }, appearance: { ...node.appearance },
        metadata: { ...node.metadata }, extensions: { ...node.extensions },
        ports: node.ports.map((port) => ({ ...port, metadata: { ...port.metadata } })),
      };
      return {
        command: {
          kind: 'insert-node', id: `duplicate-node:${node.id}`, label: 'Duplicate node',
          pageId: page.id, index: index + 1, node: duplicate,
        },
        selectedNodeId: duplicate.id,
      };
    }
    case 'insert':
      return {
        command: {
          kind: 'insert-node', id: `insert-node:${mutation.node.id}`, label: 'Insert node',
          pageId: page.id, index: page.nodes.length, node: mutation.node,
        },
        selectedNodeId: mutation.node.id,
      };
    case 'delete': {
      requireNode(page, mutation.nodeId);
      const removedIds = descendantIds(page, mutation.nodeId);
      const commands: DocumentCommand[] = [];
      for (let index = page.connectors.length - 1; index >= 0; index -= 1) {
        const connector = page.connectors[index];
        if (removedIds.has(connector.source.nodeId) || removedIds.has(connector.target.nodeId)) {
          commands.push({
            kind: 'remove-connector', id: `delete-connector:${connector.id}`,
            label: 'Delete attached connector', pageId: page.id, index, connector,
          });
        }
      }
      for (let index = page.nodes.length - 1; index >= 0; index -= 1) {
        const node = page.nodes[index];
        if (removedIds.has(node.id)) commands.push({
          kind: 'remove-node', id: `delete-node:${node.id}`, label: 'Delete node',
          pageId: page.id, index, node,
        });
      }
      return {
        command: { kind: 'batch', id: `delete-node-tree:${mutation.nodeId}`, label: 'Delete node', commands },
        selectedNodeId: null,
      };
    }
  }
}

export type ProductionFreeformKind = 'pen' | 'highlighter' | 'line' | 'arrow' | 'sticky' | 'callout';

export function createProductionProcessNode(
  id: string,
  point: Point2d,
  layerId: string,
  label = 'Process'
): SceneNode {
  return createProductionSceneNode('process', id, point, layerId, { label });
}

export function createProductionFreeformNode(
  id: string, kind: ProductionFreeformKind, point: Point2d, layerId: string
): SceneNode {
  return createProductionSceneNode(kind, id, point, layerId);
}
