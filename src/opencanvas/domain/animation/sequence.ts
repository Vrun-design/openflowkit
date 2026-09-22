import type { ScenePage } from '../document/types';
import type { Matrix2d, Point2d } from '../geometry/types';
import { buildNodeWorldMatrices, nodeWorldBounds } from '../scene/worldGeometry';
import { isContainerNodeKind } from '../nodes/containerNodePresentation';
import { boundsOfNodes } from './bounds';
import { stepDuration } from './frame';
import type { AnimationStep, Timeline } from './types';

/**
 * Zero-config sequencing: topological order over the connector graph, one
 * step per node, each connector joining the step of its target. Containers
 * step before their children, roots first, cycles broken by position,
 * unconnected nodes last, ties by `y` then `x`.
 */

interface RankedNode {
  readonly id: string;
  readonly rank: number;
}

function centerOf(page: ScenePage, matrices: ReadonlyMap<string, Matrix2d>): Map<string, Point2d> {
  const centers = new Map<string, Point2d>();
  for (const node of page.nodes) {
    const matrix = matrices.get(node.id);
    if (!matrix) continue;
    const bounds = nodeWorldBounds(node, matrix);
    centers.set(node.id, { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 });
  }
  return centers;
}

function topoRanks(page: ScenePage, ids: readonly string[], centers: ReadonlyMap<string, Point2d>): Map<string, number> {
  const order = new Set(ids);
  const incoming = new Map<string, number>(ids.map((id) => [id, 0]));
  const outgoing = new Map<string, string[]>();
  for (const connector of page.connectors) {
    const from = connector.source.nodeId;
    const to = connector.target.nodeId;
    if (!from || !to || from === to || !order.has(from) || !order.has(to)) continue;
    incoming.set(to, (incoming.get(to) ?? 0) + 1);
    outgoing.set(from, [...(outgoing.get(from) ?? []), to]);
  }
  const center = (id: string): Point2d => centers.get(id) ?? { x: 0, y: 0 };
  const byPosition = (a: string, b: string): number =>
    center(a).y - center(b).y || center(a).x - center(b).x || a.localeCompare(b);
  const ranks = new Map<string, number>();
  const remaining = new Set(ids);
  // Kahn's with a position tie-break; when a cycle leaves nothing
  // in-degree-free, the topmost node breaks it (deterministic, no throw).
  while (remaining.size > 0) {
    const next = [...remaining].filter((id) => (incoming.get(id) ?? 0) === 0).sort(byPosition)[0]
      ?? [...remaining].sort(byPosition)[0]!;
    remaining.delete(next);
    ranks.set(next, ranks.size);
    for (const to of outgoing.get(next) ?? []) incoming.set(to, (incoming.get(to) ?? 1) - 1);
  }
  return ranks;
}

export function autoSequence(page: ScenePage, preset: Timeline['preset'] = 'build'): Timeline {
  const ids = page.nodes.filter((node) => node.kind !== 'frame').map((node) => node.id);
  if (ids.length === 0) {
    if (page.connectors.length === 0) return { steps: [], preset, loop: false, durationMs: 0 };
    const lone: AnimationStep = { nodeIds: [], connectorIds: page.connectors.map((connector) => connector.id) };
    return { steps: [lone], preset, loop: false, durationMs: stepDuration(lone) };
  }
  const ranks = topoRanks(page, ids, centerOf(page, buildNodeWorldMatrices(page)));
  const connected = new Set(page.connectors.flatMap((connector) => [connector.source.nodeId, connector.target.nodeId].filter((id): id is string => !!id)));
  const childrenOf = new Map<string, string[]>();
  for (const node of page.nodes) {
    if (node.parentId) childrenOf.set(node.parentId, [...(childrenOf.get(node.parentId) ?? []), node.id]);
  }
  const ranked: RankedNode[] = ids.map((id) => ({ id, rank: ranks.get(id) ?? 0 }));
  // Connected nodes first (stable), then containers ahead of their children.
  ranked.sort((a, b) => Number(connected.has(b.id)) - Number(connected.has(a.id)) || a.rank - b.rank);
  for (let moved = true; moved;) {
    moved = false;
    for (const node of page.nodes) {
      if (!isContainerNodeKind(node.kind)) continue;
      const at = ranked.findIndex((entry) => entry.id === node.id);
      const firstChild = Math.min(
        ...(childrenOf.get(node.id) ?? []).map((child) => ranked.findIndex((entry) => entry.id === child)).filter((index) => index >= 0),
        Number.POSITIVE_INFINITY,
      );
      if (at > firstChild) {
        const [entry] = ranked.splice(at, 1);
        ranked.splice(firstChild, 0, entry!);
        moved = true;
      }
    }
  }
  const stepOf = new Map(ranked.map((entry, index) => [entry.id, index]));
  const steps: AnimationStep[] = ranked.map((entry) => {
    const camera = boundsOfNodes(page, [entry.id]);
    return { nodeIds: [entry.id], connectorIds: [], ...(camera ? { camera } : {}) };
  });
  for (const connector of page.connectors) {
    const target = connector.target.nodeId && stepOf.has(connector.target.nodeId) ? stepOf.get(connector.target.nodeId)! : -1;
    const source = connector.source.nodeId && stepOf.has(connector.source.nodeId) ? stepOf.get(connector.source.nodeId)! : -1;
    const at = target >= 0 ? target : source >= 0 ? source : steps.length - 1;
    const step = steps[at]!;
    steps[at] = { ...step, connectorIds: [...step.connectorIds, connector.id] };
  }
  const durationMs = steps.reduce((sum, step) => sum + stepDuration(step), 0);
  return { steps, preset, loop: false, durationMs };
}
