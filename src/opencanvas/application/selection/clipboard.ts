import type { DocumentCommand } from '../../domain/commands/types';
import type { SceneConnector, SceneNode, ScenePage } from '../../domain/document/types';
import type { Point2d } from '../../domain/geometry/types';

export interface ProductionClipboardSnapshot {
  readonly version: 1;
  readonly nodes: readonly SceneNode[];
  readonly connectors: readonly SceneConnector[];
}

export type ClipboardIdFactory = (kind: 'node' | 'connector', sourceId: string) => string;

function selectedTreeIds(page: ScenePage, selectedNodeIds: readonly string[]): Set<string> {
  const ids = new Set(selectedNodeIds);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of page.nodes) {
      if (node.parentId && ids.has(node.parentId) && !ids.has(node.id)) {
        ids.add(node.id); changed = true;
      }
    }
  }
  return ids;
}

export function copyProductionSelection(
  page: ScenePage,
  selectedNodeIds: readonly string[]
): ProductionClipboardSnapshot {
  const ids = selectedTreeIds(page, selectedNodeIds);
  if (ids.size === 0) throw new TypeError('Copy requires at least one selected node.');
  const nodes = page.nodes.filter(({ id }) => ids.has(id));
  if (nodes.length !== ids.size) throw new RangeError('Copy selection contains an unknown node.');
  const connectors = page.connectors.filter(({ source, target }) =>
    ids.has(source.nodeId) && ids.has(target.nodeId));
  return { version: 1, nodes, connectors };
}

export function buildPasteProductionSelectionCommand(
  page: ScenePage,
  snapshot: ProductionClipboardSnapshot,
  createId: ClipboardIdFactory,
  offset: Point2d = { x: 24, y: 24 }
): { readonly command: DocumentCommand; readonly pastedNodeIds: readonly string[] } {
  if (snapshot.version !== 1 || snapshot.nodes.length === 0) throw new TypeError('Clipboard is empty or unsupported.');
  const occupied = new Set([
    ...page.nodes.map(({ id }) => id), ...page.connectors.map(({ id }) => id),
  ]);
  const nodeIds = new Map<string, string>();
  for (const node of snapshot.nodes) {
    const id = createId('node', node.id);
    if (!id || occupied.has(id) || [...nodeIds.values()].includes(id)) throw new TypeError('Paste ids must be unique.');
    nodeIds.set(node.id, id);
  }
  const commands: DocumentCommand[] = snapshot.nodes.map((node, index) => {
    const pastedParent = node.parentId && nodeIds.has(node.parentId) ? nodeIds.get(node.parentId)! : null;
    const pasted: SceneNode = {
      ...structuredClone(node), id: nodeIds.get(node.id)!,
      parentId: pastedParent,
      zIndex: Math.max(0, ...page.nodes.map(({ zIndex }) => zIndex)) + index + 1,
      // Members keep their local transform; only roots take the offset.
      transform: { ...node.transform, translation: pastedParent ? { ...node.transform.translation } : {
        x: node.transform.translation.x + offset.x, y: node.transform.translation.y + offset.y,
      } },
    };
    return { kind: 'insert-node', id: `paste-node:${pasted.id}`, label: 'Paste node',
      pageId: page.id, index: page.nodes.length + index, node: pasted };
  });
  for (const connector of snapshot.connectors) {
    const id = createId('connector', connector.id);
    if (!id || occupied.has(id)) throw new TypeError('Paste ids must be unique.');
    const pasted: SceneConnector = {
      ...structuredClone(connector), id,
      source: { ...connector.source, nodeId: nodeIds.get(connector.source.nodeId)! },
      target: { ...connector.target, nodeId: nodeIds.get(connector.target.nodeId)! },
    };
    commands.push({ kind: 'insert-connector', id: `paste-connector:${id}`, label: 'Paste connector',
      pageId: page.id, index: page.connectors.length + commands.length - snapshot.nodes.length,
      connector: pasted });
  }
  return { command: { kind: 'batch', id: 'paste-selection', label: 'Paste selection', commands },
    pastedNodeIds: [...nodeIds.values()] };
}
