import type { BatchDocumentCommand, DocumentCommand, SetNodeCommand } from './types';
import type { SceneNode, ScenePage } from '../document/types';
import { alignNodes, distributeNodes, type AlignMode, type DistributeAxis } from '../transforms/arrangement';
import { buildNodeStateMap } from '../scene/nodeState';
import { buildNodeWorldMatrices, nodeWorldBounds } from '../scene/worldGeometry';
import { unionBounds } from '../geometry/bounds';
import { areStructurallyEqual } from './equality';

// Arrange commands for the style bar, keyboard and context menu
// (docs/plan/phase-1-style.md §3). Each is one batch per user intent, skips
// locked nodes and returns null when nothing would change.

function unlocked(page: ScenePage, nodeIds: readonly string[]): string[] {
  const states = buildNodeStateMap(page);
  return nodeIds.filter((id) => !states.get(id)?.locked);
}

function setNodes(page: ScenePage, id: string, label: string, after: readonly SceneNode[]): BatchDocumentCommand | null {
  const commands: SetNodeCommand[] = [];
  for (const next of after) {
    const before = page.nodes.find((node) => node.id === next.id);
    if (!before || areStructurallyEqual(before, next)) continue;
    commands.push({ kind: 'set-node', id: `${id}:${next.id}`, label, pageId: page.id, before, after: next });
  }
  return commands.length ? { kind: 'batch', id, label, commands } : null;
}

export function buildAlignCommand(page: ScenePage, nodeIds: readonly string[], mode: AlignMode): DocumentCommand | null {
  const ids = unlocked(page, nodeIds);
  if (ids.length < 2) return null;
  try {
    return setNodes(page, `align-${mode}`, 'Align', alignNodes(page, ids, mode).nodes);
  } catch {
    return null; // already aligned
  }
}

export function buildDistributeCommand(page: ScenePage, nodeIds: readonly string[], axis: DistributeAxis): DocumentCommand | null {
  const ids = unlocked(page, nodeIds);
  if (ids.length < 3) return null;
  try {
    return setNodes(page, `distribute-${axis}`, 'Distribute', distributeNodes(page, ids, axis).nodes);
  } catch {
    return null;
  }
}

/**
 * Mirror the selection about its union centre: each node's box reflects and
 * its rotation negates, so the arrangement mirrors.
 * ponytail: node glyphs themselves are not mirrored (no negative scale: the
 * transform bridge bakes scale into size). Add a `flipX/flipY` content flag
 * read by basicNodeOutline when asymmetric shapes need it.
 */
export function buildFlipCommand(page: ScenePage, nodeIds: readonly string[], axis: 'horizontal' | 'vertical'): DocumentCommand | null {
  const ids = new Set(unlocked(page, nodeIds));
  const matrices = buildNodeWorldMatrices(page);
  const chosen = page.nodes.filter((node) => ids.has(node.id) && !node.parentId);
  if (chosen.length === 0) return null;
  const boxes = chosen.map((node) => nodeWorldBounds(node, matrices.get(node.id)!));
  const union = boxes.slice(1).reduce(unionBounds, boxes[0]);
  const centre = { x: union.x + union.width / 2, y: union.y + union.height / 2 };
  const after = chosen.map((node, index) => {
    const box = boxes[index];
    const boxCentre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const delta = axis === 'horizontal'
      ? { x: 2 * (centre.x - boxCentre.x), y: 0 }
      : { x: 0, y: 2 * (centre.y - boxCentre.y) };
    const rotation = -node.transform.rotationRadians;
    if (delta.x === 0 && delta.y === 0 && rotation === node.transform.rotationRadians) return node;
    return {
      ...node,
      transform: {
        ...node.transform,
        translation: { x: node.transform.translation.x + delta.x, y: node.transform.translation.y + delta.y },
        rotationRadians: rotation,
      },
    };
  });
  return setNodes(page, `flip-${axis}`, axis === 'horizontal' ? 'Flip horizontal' : 'Flip vertical', after);
}

export interface NodeTransformPatch {
  readonly x?: number;
  readonly y?: number;
  readonly width?: number;
  readonly height?: number;
  /** Degrees. */
  readonly rotation?: number;
}

/** Position panel: absolute fields for one node; size is clamped to 1px. */
export function buildSetTransformCommand(page: ScenePage, nodeId: string, patch: NodeTransformPatch): DocumentCommand | null {
  const before = page.nodes.find((node) => node.id === nodeId);
  if (!before || buildNodeStateMap(page).get(nodeId)?.locked) return null;
  const finite = (value: number | undefined, fallback: number) => (value !== undefined && Number.isFinite(value) ? value : fallback);
  const after: SceneNode = {
    ...before,
    transform: {
      ...before.transform,
      translation: { x: finite(patch.x, before.transform.translation.x), y: finite(patch.y, before.transform.translation.y) },
      rotationRadians: patch.rotation === undefined ? before.transform.rotationRadians : (patch.rotation * Math.PI) / 180,
    },
    size: { width: Math.max(1, finite(patch.width, before.size.width)), height: Math.max(1, finite(patch.height, before.size.height)) },
  };
  return setNodes(page, `set-transform:${nodeId}`, 'Set position', [after]);
}

/** `⌘]` / `⌘[`: swap z with the nearest unselected sibling in that direction. */
export function buildStepOrderCommand(page: ScenePage, nodeIds: readonly string[], direction: 'forward' | 'backward'): DocumentCommand | null {
  const selected = new Set(nodeIds);
  const ordered = [...page.nodes].sort((left, right) => left.zIndex - right.zIndex);
  const commands: SetNodeCommand[] = [];
  const list = direction === 'forward' ? ordered : [...ordered].reverse();
  // Walk from the leading edge so a contiguous block moves as one.
  const zAt = new Map(ordered.map((node) => [node.id, node.zIndex]));
  for (let index = list.length - 2; index >= 0; index -= 1) {
    const node = list[index];
    const neighbour = list[index + 1];
    if (!selected.has(node.id) || selected.has(neighbour.id)) continue;
    const nodeZ = zAt.get(node.id)!;
    const neighbourZ = zAt.get(neighbour.id)!;
    zAt.set(node.id, neighbourZ);
    zAt.set(neighbour.id, nodeZ);
    list[index] = neighbour;
    list[index + 1] = node;
  }
  for (const node of page.nodes) {
    const z = zAt.get(node.id)!;
    if (z !== node.zIndex) {
      commands.push({ kind: 'set-node', id: `reorder:${node.id}`, label: 'Reorder', pageId: page.id, before: node, after: { ...node, zIndex: z } });
    }
  }
  return commands.length
    ? { kind: 'batch', id: `reorder-${direction}`, label: direction === 'forward' ? 'Bring forward' : 'Send backward', commands }
    : null;
}
