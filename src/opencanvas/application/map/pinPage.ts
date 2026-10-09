import type { DocumentCommand } from '../../domain/commands/types';
import { createDefaultSceneLayer } from '../../domain/document/defaults';
import type { SceneDocumentV1, SceneNode, ScenePage } from '../../domain/document/types';

// "Pin as page": the Map view frozen into an ordinary Canvas page, one insert-page = one undo step. It is a plain
// snapshot: no model/dsl/map metadata anywhere, so nothing (modelPages, regenerate, Add element, autosave) can
// ever tie it back to the model and bring old data back. Cost: a later rename does not reach it.

const MARGIN = 40;

export function buildPinPageCommand(
  document: SceneDocumentV1,
  mapPage: ScenePage,
  opts: { pageId: string; name: string; index?: number },
): DocumentCommand {
  if (!opts.pageId.trim() || document.pages.some((page) => page.id === opts.pageId)) throw new Error('Page ID must be non-empty and unique.');
  const name = opts.name.trim();
  if (!name) throw new Error('Page name must not be empty.');

  // Bounds of the top-level boxes only (children are parent-relative); not seeded with 0, so the content sits tight on the margin.
  const tops = mapPage.nodes.filter((node) => node.parentId === null);
  const left = tops.length ? Math.min(...tops.map((n) => n.transform.translation.x)) : 0;
  const top = tops.length ? Math.min(...tops.map((n) => n.transform.translation.y)) : 0;
  const dx = MARGIN - left;
  const dy = MARGIN - top;

  const nodes = mapPage.nodes.map((node): SceneNode => ({
    ...node,
    metadata: {},
    transform: node.parentId !== null ? node.transform
      : { ...node.transform, translation: { x: node.transform.translation.x + dx, y: node.transform.translation.y + dy } },
  }));
  const connectors = mapPage.connectors.map((connector) => ({
    ...connector,
    metadata: {},
    waypoints: connector.waypoints.map((p) => ({ x: p.x + dx, y: p.y + dy })),
  }));

  const page: ScenePage = {
    id: opts.pageId, name, diagramKind: 'architecture',
    layers: [createDefaultSceneLayer()], nodes, connectors, metadata: {}, extensions: {},
  };
  return {
    kind: 'insert-page', id: `pin-map:${opts.pageId}`, label: 'Edit map as drawing',
    index: opts.index ?? document.pages.length, page: structuredClone(page),
  };
}
