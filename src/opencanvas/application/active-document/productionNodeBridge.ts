import { applyDocumentCommand } from '../../domain/commands/execute';
import type { DocumentCommand } from '../../domain/commands/types';
import type { SceneDocumentV1, SceneNode, ScenePage } from '../../domain/document/types';
import type { Point2d } from '../../domain/geometry/types';
import type { ReactFlowProjection } from '../../infrastructure/reactflow/contracts';
import { projectSceneDocumentToReactFlow } from '../../infrastructure/reactflow/toReactFlow';

export type ProductionNodeMutation =
  | { readonly kind: 'rename'; readonly nodeId: string; readonly label: string }
  | { readonly kind: 'duplicate'; readonly nodeId: string; readonly newNodeId: string; readonly offset?: Point2d }
  | { readonly kind: 'insert'; readonly node: SceneNode }
  | { readonly kind: 'delete'; readonly nodeId: string };

export interface ProductionNodeMutationResult {
  readonly changed: boolean;
  readonly selectedNodeId: string | null;
  readonly projection: ReactFlowProjection;
}

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

export function createProductionProcessNode(
  id: string,
  point: Point2d,
  layerId: string,
  label = 'Process'
): SceneNode {
  if (!id) throw new TypeError('Node id must not be empty.');
  return {
    id, kind: 'process', parentId: null, layerId, zIndex: 0,
    transform: { translation: point, rotationRadians: 0, scale: { x: 1, y: 1 } },
    size: { width: 168, height: 72 }, content: { label }, appearance: {}, ports: [],
    metadata: {}, extensions: {},
  };
}

export type ProductionFreeformKind = 'pen' | 'highlighter' | 'line' | 'arrow' | 'sticky' | 'callout';

export function createProductionFreeformNode(
  id: string, kind: ProductionFreeformKind, point: Point2d, layerId: string
): SceneNode {
  const stroke = kind === 'pen' || kind === 'highlighter' || kind === 'line' || kind === 'arrow';
  return {
    id, kind, parentId: null, layerId, zIndex: 0,
    transform: { translation: point, rotationRadians: 0, scale: { x: 1, y: 1 } },
    size: stroke ? { width: 180, height: 80 } : { width: 180, height: 120 },
    content: stroke ? {
      points: kind === 'pen' || kind === 'highlighter'
        ? [{ x: 0, y: 50 }, { x: 35, y: 20 }, { x: 70, y: 60 }, { x: 110, y: 25 }, { x: 180, y: 45 }]
        : [{ x: 0, y: 40 }, { x: 180, y: 40 }],
      strokeColor: kind === 'highlighter' ? '#fde047' : '#334155',
      strokeWidth: kind === 'highlighter' ? 16 : 3,
      transparency: kind === 'highlighter' ? 0.45 : 1,
    } : { label: kind === 'sticky' ? 'Sticky note' : 'Callout', subLabel: 'Add a note…' },
    appearance: {}, ports: [], metadata: {}, extensions: {},
  };
}

export function applyProductionNodeMutation(
  document: SceneDocumentV1,
  pageId: string,
  mutation: ProductionNodeMutation,
  updatedAt: string
): ProductionNodeMutationResult {
  const page = document.pages.find((candidate) => candidate.id === pageId);
  if (!page) throw new RangeError(`OpenCanvas page "${pageId}" was not found.`);
  const { command, selectedNodeId } = buildProductionNodeMutationCommand(page, mutation);
  if (!command) {
    return { changed: false, selectedNodeId, projection: projectSceneDocumentToReactFlow(document, pageId) };
  }
  const applied = applyDocumentCommand(document, command).document;
  const nextDocument = { ...applied, updatedAt };
  return {
    changed: true,
    selectedNodeId,
    projection: projectSceneDocumentToReactFlow(nextDocument, pageId),
  };
}
