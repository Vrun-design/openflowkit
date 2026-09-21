import type { CompileResult } from '../../../dsl/compile';
import type { DocumentCommand } from '../../domain/commands/types';
import type { SceneNode, ScenePage } from '../../domain/document/types';

function descendants(page: ScenePage, rootId: string): Set<string> {
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

function remapFrame(node: SceneNode, generatedId: string, frameId: string): SceneNode {
  return {
    ...node,
    id: node.id === generatedId ? frameId : node.id,
    parentId: node.parentId === generatedId ? frameId : node.parentId,
  };
}

/** Creates one reversible page replacement for one Generate intent. */
export function buildDslPageCommand(page: ScenePage, compiled: CompileResult, boundFrameId?: string): DocumentCommand {
  const frameId = boundFrameId ?? compiled.frame.id;
  const generated = [compiled.frame, ...compiled.groups, ...compiled.nodes].map((node) => remapFrame(node, compiled.frame.id, frameId));
  let retainedNodes = [...page.nodes];
  let retainedConnectors = [...page.connectors];
  if (boundFrameId) {
    const removed = descendants(page, boundFrameId);
    retainedNodes = retainedNodes.filter((node) => !removed.has(node.id));
    retainedConnectors = retainedConnectors.filter((connector) => !removed.has(connector.source.nodeId ?? '') && !removed.has(connector.target.nodeId ?? ''));
  }
  const after: ScenePage = {
    ...page,
    diagramKind: compiled.meta.family,
    nodes: [...retainedNodes, ...generated],
    connectors: [...retainedConnectors, ...compiled.connectors],
  };
  return { kind: 'set-page', id: `dsl-generate:${frameId}`, label: boundFrameId ? 'Regenerate diagram' : 'Generate diagram', pageId: page.id, before: page, after };
}

export function nextDslFrameOrigin(page: ScenePage): { x: number; y: number } {
  const right = page.nodes.reduce((maximum, node) => Math.max(maximum, node.transform.translation.x + node.size.width), 0);
  return { x: right + 160, y: 80 };
}
