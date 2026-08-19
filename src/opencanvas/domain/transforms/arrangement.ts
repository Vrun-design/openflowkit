import { unionBounds } from '../geometry/bounds';
import { applyMatrixToPoint, invertMatrix } from '../geometry/matrix';
import type { Bounds2d, Point2d } from '../geometry/types';
import type { SceneNode, ScenePage } from '../document/types';
import { buildNodeWorldMatrices, nodeWorldBounds } from '../scene/worldGeometry';
import type { TransformResult } from './types';

export type AlignMode = 'bottom' | 'center-x' | 'center-y' | 'left' | 'right' | 'top';
export type DistributeAxis = 'horizontal' | 'vertical';
export type StackAxis = 'horizontal' | 'vertical';

interface ArrangedNode {
  readonly node: SceneNode;
  readonly bounds: Bounds2d;
}

function selectedRoots(page: ScenePage, nodeIds: readonly string[]): SceneNode[] {
  const selected = new Set(nodeIds);
  if (selected.size !== nodeIds.length) throw new Error('Selection contains duplicate node IDs.');
  const nodesById = new Map(page.nodes.map((node) => [node.id, node]));
  const nodes = nodeIds.map((id) => {
    const node = nodesById.get(id);
    if (!node) throw new Error(`Selected node "${id}" was not found.`);
    return node;
  });
  return nodes.filter((node) => {
    let parentId = node.parentId;
    while (parentId) {
      if (selected.has(parentId)) return false;
      parentId = nodesById.get(parentId)?.parentId ?? null;
    }
    return true;
  });
}

function arrangedNodes(page: ScenePage, nodeIds: readonly string[]): ArrangedNode[] {
  const matrices = buildNodeWorldMatrices(page);
  return selectedRoots(page, nodeIds).map((node) => ({
    node,
    bounds: nodeWorldBounds(node, matrices.get(node.id)!),
  }));
}

function worldDeltaToLocal(page: ScenePage, node: SceneNode, delta: Point2d): Point2d {
  if (!node.parentId) return delta;
  const parentMatrix = buildNodeWorldMatrices(page).get(node.parentId);
  const inverse = parentMatrix && invertMatrix(parentMatrix);
  if (!inverse) throw new Error('Parent transform is not invertible.');
  const origin = applyMatrixToPoint(inverse, { x: 0, y: 0 });
  const point = applyMatrixToPoint(inverse, delta);
  return { x: point.x - origin.x, y: point.y - origin.y };
}

function applyPositions(
  page: ScenePage,
  arranged: readonly ArrangedNode[],
  positions: ReadonlyMap<string, Point2d>
): TransformResult {
  const projectedNodes = arranged.map(({ node, bounds }) => {
    const target = positions.get(node.id) ?? { x: bounds.x, y: bounds.y };
    const localDelta = worldDeltaToLocal(page, node, {
      x: target.x - bounds.x,
      y: target.y - bounds.y,
    });
    return {
      ...node,
      transform: {
        ...node.transform,
        translation: {
          x: node.transform.translation.x + localDelta.x,
          y: node.transform.translation.y + localDelta.y,
        },
      },
    };
  });
  const nodes = projectedNodes.filter((node) => {
    const before = page.nodes.find(({ id }) => id === node.id)!;
    return Math.abs(node.transform.translation.x - before.transform.translation.x) > 1e-9
      || Math.abs(node.transform.translation.y - before.transform.translation.y) > 1e-9;
  });
  if (nodes.length === 0) throw new Error('Arrangement would not move any nodes.');
  const preview = {
    ...page,
    nodes: page.nodes.map((node) => projectedNodes.find(({ id }) => id === node.id) ?? node),
  };
  const matrices = buildNodeWorldMatrices(preview);
  const bounds = projectedNodes.map((node) => nodeWorldBounds(node, matrices.get(node.id)!));
  const combined = bounds.slice(1).reduce(unionBounds, bounds[0]);
  return { nodes, bounds: combined, snappedX: false, snappedY: false };
}

export function alignNodes(
  page: ScenePage,
  nodeIds: readonly string[],
  mode: AlignMode
): TransformResult {
  const arranged = arrangedNodes(page, nodeIds);
  if (arranged.length < 2) throw new Error('Align requires at least two top-level selections.');
  const total = arranged.map(({ bounds }) => bounds).slice(1)
    .reduce(unionBounds, arranged[0].bounds);
  const positions = new Map<string, Point2d>();
  for (const { node, bounds } of arranged) {
    let x = bounds.x;
    let y = bounds.y;
    if (mode === 'left') x = total.x;
    if (mode === 'right') x = total.x + total.width - bounds.width;
    if (mode === 'center-x') x = total.x + (total.width - bounds.width) / 2;
    if (mode === 'top') y = total.y;
    if (mode === 'bottom') y = total.y + total.height - bounds.height;
    if (mode === 'center-y') y = total.y + (total.height - bounds.height) / 2;
    positions.set(node.id, { x, y });
  }
  return applyPositions(page, arranged, positions);
}

export function distributeNodes(
  page: ScenePage,
  nodeIds: readonly string[],
  axis: DistributeAxis
): TransformResult {
  const arranged = arrangedNodes(page, nodeIds);
  if (arranged.length < 3) throw new Error('Distribute requires at least three top-level selections.');
  const horizontal = axis === 'horizontal';
  const sorted = [...arranged].sort((a, b) => (
    (horizontal ? a.bounds.x - b.bounds.x : a.bounds.y - b.bounds.y)
    || a.node.id.localeCompare(b.node.id)
  ));
  const start = horizontal ? sorted[0].bounds.x : sorted[0].bounds.y;
  const endBounds = sorted.at(-1)!.bounds;
  const end = horizontal ? endBounds.x + endBounds.width : endBounds.y + endBounds.height;
  const totalSize = sorted.reduce((sum, item) => sum + (horizontal ? item.bounds.width : item.bounds.height), 0);
  const gap = (end - start - totalSize) / (sorted.length - 1);
  const positions = new Map<string, Point2d>();
  let cursor = start;
  for (const item of sorted) {
    positions.set(item.node.id, horizontal
      ? { x: cursor, y: item.bounds.y }
      : { x: item.bounds.x, y: cursor });
    cursor += (horizontal ? item.bounds.width : item.bounds.height) + gap;
  }
  return applyPositions(page, arranged, positions);
}

export function stackNodes(
  page: ScenePage,
  nodeIds: readonly string[],
  axis: StackAxis,
  gap = 24
): TransformResult {
  if (!Number.isFinite(gap) || gap < 0) throw new Error('Stack gap must be finite and non-negative.');
  const arranged = arrangedNodes(page, nodeIds);
  if (arranged.length < 2) throw new Error('Stack requires at least two top-level selections.');
  const horizontal = axis === 'horizontal';
  const sorted = [...arranged].sort((a, b) => (
    (horizontal ? a.bounds.x - b.bounds.x : a.bounds.y - b.bounds.y)
    || a.node.id.localeCompare(b.node.id)
  ));
  const anchor = sorted[0].bounds;
  const positions = new Map<string, Point2d>();
  let cursor = horizontal ? anchor.x : anchor.y;
  for (const item of sorted) {
    positions.set(item.node.id, horizontal
      ? { x: cursor, y: anchor.y }
      : { x: anchor.x, y: cursor });
    cursor += (horizontal ? item.bounds.width : item.bounds.height) + gap;
  }
  return applyPositions(page, arranged, positions);
}

export function gridNodes(
  page: ScenePage,
  nodeIds: readonly string[],
  columns = Math.ceil(Math.sqrt(nodeIds.length)),
  gap = 24
): TransformResult {
  const arranged = arrangedNodes(page, nodeIds);
  if (arranged.length < 2) throw new Error('Grid requires at least two top-level selections.');
  if (!Number.isInteger(columns) || columns < 1) throw new Error('Grid columns must be a positive integer.');
  if (!Number.isFinite(gap) || gap < 0) throw new Error('Grid gap must be finite and non-negative.');
  const sorted = [...arranged].sort((a, b) => (
    a.bounds.y - b.bounds.y || a.bounds.x - b.bounds.x || a.node.id.localeCompare(b.node.id)
  ));
  const origin = sorted.map(({ bounds }) => bounds).slice(1).reduce(unionBounds, sorted[0].bounds);
  const columnWidths = Array.from({ length: columns }, (_, column) => Math.max(
    0, ...sorted.filter((_, index) => index % columns === column).map(({ bounds }) => bounds.width)
  ));
  const rows = Math.ceil(sorted.length / columns);
  const rowHeights = Array.from({ length: rows }, (_, row) => Math.max(
    0, ...sorted.slice(row * columns, (row + 1) * columns).map(({ bounds }) => bounds.height)
  ));
  const positions = new Map<string, Point2d>();
  for (let index = 0; index < sorted.length; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    positions.set(sorted[index].node.id, {
      x: origin.x + columnWidths.slice(0, column).reduce((sum, width) => sum + width + gap, 0),
      y: origin.y + rowHeights.slice(0, row).reduce((sum, height) => sum + height + gap, 0),
    });
  }
  return applyPositions(page, arranged, positions);
}

export function tidyNodes(page: ScenePage, nodeIds: readonly string[], gap = 24): TransformResult {
  return gridNodes(page, nodeIds, Math.ceil(Math.sqrt(nodeIds.length)), gap);
}

export function packNodes(page: ScenePage, nodeIds: readonly string[], gap = 8): TransformResult {
  if (!Number.isFinite(gap) || gap < 0) throw new Error('Pack gap must be finite and non-negative.');
  const arranged = arrangedNodes(page, nodeIds);
  if (arranged.length < 2) throw new Error('Pack requires at least two top-level selections.');
  const origin = arranged.map(({ bounds }) => bounds).slice(1).reduce(unionBounds, arranged[0].bounds);
  const sorted = [...arranged].sort((a, b) => (
    b.bounds.height - a.bounds.height
    || b.bounds.width - a.bounds.width
    || a.node.id.localeCompare(b.node.id)
  ));
  const area = sorted.reduce((sum, { bounds }) => sum + bounds.width * bounds.height, 0);
  const widest = Math.max(...sorted.map(({ bounds }) => bounds.width));
  const targetWidth = Math.max(widest, Math.sqrt(area) * 1.25);
  const positions = new Map<string, Point2d>();
  let x = origin.x;
  let y = origin.y;
  let rowHeight = 0;
  for (const item of sorted) {
    if (x > origin.x && x + item.bounds.width > origin.x + targetWidth) {
      x = origin.x;
      y += rowHeight + gap;
      rowHeight = 0;
    }
    positions.set(item.node.id, { x, y });
    x += item.bounds.width + gap;
    rowHeight = Math.max(rowHeight, item.bounds.height);
  }
  return applyPositions(page, arranged, positions);
}
