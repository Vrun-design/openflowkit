import type { SceneNode, ScenePage } from '../../opencanvas/domain/document/types';
import { createDefaultSceneLayer } from '../../opencanvas/domain/document/defaults';
import type { Point2d, Size2d } from '../../opencanvas/domain/geometry/types';
import { boundaryNode, elementNode, relationConnector, type ElementContext } from '../families/architecture/scene';
import type { ArchElement, ArchModel } from '../model/types';
import type { LaidRect } from './elk';
import type { AggEdge, MapModel, MapNode } from './types';
import { edgeText, visible } from './view';

// The map as an ordinary ScenePage, so the editor's own renderers draw it. Derived from (model, open boxes, layout),
// never stored: closed boxes are the architecture family's nodes (same shapes, icons, palette as a Canvas page),
// open boxes are its boundary frames, arrows are its connectors with the aggregated count as the label.

/**
 * What the architecture node builders need that the map itself does not hold: the C4 elements (the map keeps only names)
 * and the compile's palette and icon resolvers, so a map draws exactly as a Canvas page of the same model.
 */
export interface MapLook extends Omit<ElementContext, 'origin'> {
  arch: ArchModel;
}

/** Where each visible box sits (absolute coordinates, as ELK hands them back) and which arrows are drawn. */
export interface MapLayout {
  rects: ReadonlyMap<string, LaidRect>;
  edges: readonly AggEdge[];
}

const ORIGIN: Point2d = { x: 0, y: 0 };

/** The boxes the engine invents (`#more`, alphabetical range groups) are no C4 element: they draw as a plain neutral box with no icon. */
const synthetic = (id: string, name: string, desc?: string): ArchElement =>
  ({ id, kind: 'container', name, ...(desc ? { desc } : {}), parent: null, tags: [], links: [], icon: 'none', color: 'gray' });

// The family's card names its kind under the title ("[Service]"); an invented box has none, only its description.
const unlabelled = (node: SceneNode): SceneNode => {
  const { subLabel: _kind, ...content } = node.content;
  const desc = typeof _kind === 'string' ? _kind.split('\n').slice(1).join('\n') : '';
  return { ...node, content: { ...content, ...(desc ? { subLabel: desc } : {}) } };
};

export const closedBoxSize = (look: MapLook, node: MapNode): Size2d => {
  const element = look.arch.elements.find((e) => e.id === node.id)
    ?? (node.kind === 'more' || node.kind === 'group' ? synthetic(node.id, node.name, node.desc) : undefined);
  if (!element) throw new Error(`map: no element ${node.id}`);
  return elementNode(element, null, 0, { ...look, origin: ORIGIN }).size;
};

export function mapScene(model: MapModel, open: ReadonlySet<string>, layout: MapLayout, look: MapLook): ScenePage {
  const elements = new Map(look.arch.elements.map((e) => [e.id, e]));
  const ctx = { ...look, origin: ORIGIN };
  const nodes: SceneNode[] = [];
  visible(model, open).forEach((id, i) => {
    const rect = layout.rects.get(id);
    const node = model.nodes[id];
    const element = elements.get(id) ?? (node.kind === 'more' || node.kind === 'group' ? synthetic(id, node.name, node.desc) : undefined);
    if (!rect || !element) throw new Error(`map: nothing to draw for ${id}`);
    const parent = node.parent;
    const parentRect = parent && parent !== model.root ? layout.rects.get(parent) : undefined;
    const isOpen = open.has(id) && node.children.length;
    const parentId = parentRect ? parent : null;
    const built = isOpen ? boundaryNode(element, parentId, i + 1, ctx) : elementNode(element, parentId, i + 1, ctx);
    nodes.push({
      ...(elements.has(id) ? built : unlabelled(built)),
      size: { width: rect.width, height: rect.height },
      // Scene positions are relative to the parent; ELK's are absolute.
      transform: { ...built.transform, translation: { x: rect.x - (parentRect?.x ?? 0), y: rect.y - (parentRect?.y ?? 0) } },
    });
  });

  for (const e of layout.edges) for (const end of [e.from, e.to]) if (!layout.rects.has(end)) throw new Error(`map: nothing to draw for ${end}`);
  const connectors = layout.edges.map((e) => {
    // Solid only where a relation joins exactly these two boxes: an arrow with at least one such relation is real, one that rides up from deeper boxes is implied.
    const direct = e.links.some((l) => (l.from === e.from && l.to === e.to) || (l.from === e.to && l.to === e.from));
    const connector = relationConnector({ id: e.key, from: e.from, to: e.to, label: edgeText(e), tags: [] }, e.from, e.to, e.inferred || !direct || !!e.minor);
    // fromArch makes each relation's id its evidence `file`, so the panel can list the relations behind this arrow.
    const relations = [...new Set(e.links.flatMap((l) => l.evidence.map((ev) => ev.file)))].sort();
    return { ...connector, metadata: { ...connector.metadata, map: { count: e.count, minor: !!e.minor, relations } } };
  });

  return {
    id: 'map', name: model.nodes[model.root].name, diagramKind: 'architecture',
    layers: [createDefaultSceneLayer()], nodes, connectors, metadata: {}, extensions: {},
  };
}
