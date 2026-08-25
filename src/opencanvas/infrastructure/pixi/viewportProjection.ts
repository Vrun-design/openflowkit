import { visibleWorldBounds } from '../../domain/camera/camera';
import type { CanvasCamera } from '../../domain/camera/types';
import { createBounds2d } from '../../domain/geometry/bounds';
import type { Bounds2d, Size2d } from '../../domain/geometry/types';
import { querySceneBounds } from '../../domain/scene/queries';
import type { SceneIndex } from '../../domain/scene/types';

export type SemanticDetailLevel = 'overview' | 'compact' | 'full';

export interface ViewportSceneProjection {
  readonly bounds: Bounds2d | null;
  readonly nodeIds: ReadonlySet<string> | null;
  readonly connectorIds: ReadonlySet<string> | null;
  readonly detailLevel: SemanticDetailLevel;
}

export interface ViewportProjectionOptions {
  readonly cullingThreshold?: number;
  readonly overscanScreenPixels?: number;
  readonly retainedNodeIds?: readonly string[];
}

export const DEFAULT_VIEWPORT_CULLING_THRESHOLD = 250;
export const DEFAULT_VIEWPORT_OVERSCAN_SCREEN_PIXELS = 240;

export function semanticDetailLevel(zoom: number): SemanticDetailLevel {
  if (zoom < 0.35) return 'overview';
  if (zoom < 0.65) return 'compact';
  return 'full';
}

function expandBounds(bounds: Bounds2d, padding: number): Bounds2d {
  return createBounds2d(
    bounds.x - padding,
    bounds.y - padding,
    bounds.width + padding * 2,
    bounds.height + padding * 2
  );
}

export function projectSceneViewport(
  index: SceneIndex,
  camera: CanvasCamera,
  viewport: Size2d,
  options: ViewportProjectionOptions = {}
): ViewportSceneProjection {
  const detailLevel = semanticDetailLevel(camera.zoom);
  const sceneSize = index.page.nodes.length + index.page.connectors.length;
  const threshold = options.cullingThreshold ?? DEFAULT_VIEWPORT_CULLING_THRESHOLD;
  if (sceneSize <= threshold || viewport.width <= 0 || viewport.height <= 0) {
    return { bounds: null, nodeIds: null, connectorIds: null, detailLevel };
  }

  const overscan =
    (options.overscanScreenPixels ?? DEFAULT_VIEWPORT_OVERSCAN_SCREEN_PIXELS) / camera.zoom;
  const bounds = expandBounds(visibleWorldBounds(camera, viewport), overscan);
  const objects = querySceneBounds(index, bounds);
  const nodeIds = new Set<string>();
  const connectorIds = new Set<string>();
  for (const object of objects) {
    if (object.kind === 'connector') connectorIds.add(object.id);
    else nodeIds.add(object.id);
  }
  for (const nodeId of options.retainedNodeIds ?? []) {
    if (index.nodesById.has(nodeId)) nodeIds.add(nodeId);
  }
  return { bounds, nodeIds, connectorIds, detailLevel };
}

export function viewportProjectionEquals(
  left: ViewportSceneProjection | null,
  right: ViewportSceneProjection
): boolean {
  if (!left || left.detailLevel !== right.detailLevel) return false;
  if (left.nodeIds === null || right.nodeIds === null) {
    return left.nodeIds === right.nodeIds && left.connectorIds === right.connectorIds;
  }
  if (left.connectorIds === null || right.connectorIds === null) return false;
  if (left.nodeIds.size !== right.nodeIds.size || left.connectorIds.size !== right.connectorIds.size) {
    return false;
  }
  for (const id of left.nodeIds) if (!right.nodeIds.has(id)) return false;
  for (const id of left.connectorIds) if (!right.connectorIds.has(id)) return false;
  return true;
}
