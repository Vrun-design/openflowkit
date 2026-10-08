import type { ScenePage } from '../../domain/document/types';

/** What stays bright when a box or an arrow is focused in Map mode; everything else dims. */
export interface MapFocus {
  readonly nodeIds: readonly string[];
  readonly connectorIds: readonly string[];
}

/**
 * The focus for one selected box or arrow of a map scene, or null when the id is not drawn.
 * - A box: itself, what it holds (an open box stays whole), every drawn arrow that touches it or a box drawn inside it (an open box talks through its parts),
 *   and the far end of each. The SVG map's `neighbours` rule, on the drawn arrows.
 * - An arrow: itself and its two ends.
 * Ids come back sorted, so the same selection always gives the same focus.
 */
export function mapFocus(page: ScenePage, selected: { readonly nodeId?: string | null; readonly connectorId?: string | null }): MapFocus | null {
  const nodes = new Map(page.nodes.map((node) => [node.id, node]));
  const result = (nodeIds: Iterable<string>, connectorIds: Iterable<string>): MapFocus =>
    ({ nodeIds: [...new Set(nodeIds)].sort(), connectorIds: [...new Set(connectorIds)].sort() });
  const connector = selected.connectorId ? page.connectors.find((candidate) => candidate.id === selected.connectorId) : undefined;
  if (connector) {
    return result([connector.source.nodeId, connector.target.nodeId].filter((id): id is string => id !== null && nodes.has(id)), [connector.id]);
  }
  const id = selected.nodeId;
  if (!id || !nodes.has(id)) return null;
  const inside = (nodeId: string | null): boolean => {
    for (let at = nodeId, hops = 0; at && hops < 64; at = nodes.get(at)?.parentId ?? null, hops += 1) if (at === id) return true;
    return false;
  };
  const arrows = page.connectors.filter((c) => inside(c.source.nodeId) || inside(c.target.nodeId));
  const ends = arrows.flatMap((c) => [c.source.nodeId, c.target.nodeId]).filter((end): end is string => end !== null && nodes.has(end));
  return result([id, ...page.nodes.filter((node) => node.id !== id && inside(node.id)).map((node) => node.id), ...ends], arrows.map((c) => c.id));
}
