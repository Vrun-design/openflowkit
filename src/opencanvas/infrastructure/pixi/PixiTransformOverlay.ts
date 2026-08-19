import { Graphics } from 'pixi.js';
import type { CanvasCamera } from '../../domain/camera/types';
import type { SceneNode, ScenePage } from '../../domain/document/types';
import type { Bounds2d, Point2d } from '../../domain/geometry/types';
import { applyMatrixToPoint } from '../../domain/geometry/matrix';
import { buildNodeWorldMatrices } from '../../domain/scene/worldGeometry';
import type { TransformHandle } from '../../domain/transforms/types';

const ORANGE = 0xe95420;
const WHITE = 0xffffff;
const HANDLE_PIXELS = 8;
const ROTATE_OFFSET_PIXELS = 28;

interface HandlePoint {
  readonly handle: TransformHandle;
  readonly point: Point2d;
}

export function transformHandlePoints(bounds: Bounds2d, zoom: number): readonly HandlePoint[] {
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const right = bounds.x + bounds.width;
  const bottom = bounds.y + bounds.height;
  return [
    { handle: 'north-west', point: { x: bounds.x, y: bounds.y } },
    { handle: 'north', point: { x: centerX, y: bounds.y } },
    { handle: 'north-east', point: { x: right, y: bounds.y } },
    { handle: 'east', point: { x: right, y: centerY } },
    { handle: 'south-east', point: { x: right, y: bottom } },
    { handle: 'south', point: { x: centerX, y: bottom } },
    { handle: 'south-west', point: { x: bounds.x, y: bottom } },
    { handle: 'west', point: { x: bounds.x, y: centerY } },
    { handle: 'rotate', point: { x: centerX, y: bounds.y - ROTATE_OFFSET_PIXELS / zoom } },
  ];
}

export function pickTransformHandle(
  bounds: Bounds2d,
  screenPoint: Point2d,
  camera: CanvasCamera
): TransformHandle | null {
  const worldPoint = {
    x: (screenPoint.x - camera.x) / camera.zoom,
    y: (screenPoint.y - camera.y) / camera.zoom,
  };
  const radius = 7 / camera.zoom;
  return (
    transformHandlePoints(bounds, camera.zoom).find(
      ({ point }) => Math.hypot(point.x - worldPoint.x, point.y - worldPoint.y) <= radius
    )?.handle ?? null
  );
}

export function drawTransformFrame(
  graphics: Graphics,
  bounds: Bounds2d,
  zoom: number,
  showHandles = true
): void {
  const width = 2 / zoom;
  graphics.rect(bounds.x, bounds.y, bounds.width, bounds.height).stroke({ color: ORANGE, width });
  if (!showHandles) return;
  const handles = transformHandlePoints(bounds, zoom);
  const rotate = handles.at(-1)!;
  graphics
    .moveTo(bounds.x + bounds.width / 2, bounds.y)
    .lineTo(rotate.point.x, rotate.point.y)
    .stroke({ color: ORANGE, width: 1.5 / zoom });
  for (const { handle, point } of handles) {
    if (handle === 'rotate') {
      graphics
        .circle(point.x, point.y, HANDLE_PIXELS / 2 / zoom)
        .fill({ color: WHITE })
        .stroke({ color: ORANGE, width: 1.5 / zoom });
    } else {
      const size = HANDLE_PIXELS / zoom;
      graphics
        .rect(point.x - size / 2, point.y - size / 2, size, size)
        .fill({ color: WHITE })
        .stroke({ color: ORANGE, width: 1.5 / zoom });
    }
  }
}

export class PixiTransformOverlay {
  readonly graphics = new Graphics();

  clear(): void {
    this.graphics.clear();
  }

  draw(
    page: ScenePage,
    nodes: readonly SceneNode[],
    bounds: Bounds2d,
    camera: CanvasCamera,
    snappedX: boolean,
    snappedY: boolean
  ): void {
    this.graphics.clear();
    const replacements = new Map(nodes.map((node) => [node.id, node]));
    const previewPage = {
      ...page,
      nodes: page.nodes.map((node) => replacements.get(node.id) ?? node),
    };
    const matrices = buildNodeWorldMatrices(previewPage);
    for (const node of nodes) {
      const matrix = matrices.get(node.id)!;
      const points = [
        { x: 0, y: 0 },
        { x: node.size.width, y: 0 },
        { x: node.size.width, y: node.size.height },
        { x: 0, y: node.size.height },
      ].map((point) => applyMatrixToPoint(matrix, point));
      this.graphics
        .poly(points.flatMap((point) => [point.x, point.y]))
        .fill({ color: WHITE, alpha: 0.92 })
        .stroke({ color: ORANGE, width: 1.5 / camera.zoom });
    }
    drawTransformFrame(this.graphics, bounds, camera.zoom);
    const viewport = {
      left: -camera.x / camera.zoom,
      top: -camera.y / camera.zoom,
      right: (camera.x + 100_000) / camera.zoom,
      bottom: (camera.y + 100_000) / camera.zoom,
    };
    if (snappedX) {
      this.graphics
        .moveTo(bounds.x, viewport.top)
        .lineTo(bounds.x, viewport.bottom)
        .stroke({ color: ORANGE, alpha: 0.55, width: 1 / camera.zoom });
    }
    if (snappedY) {
      this.graphics
        .moveTo(viewport.left, bounds.y)
        .lineTo(viewport.right, bounds.y)
        .stroke({ color: ORANGE, alpha: 0.55, width: 1 / camera.zoom });
    }
  }
}
