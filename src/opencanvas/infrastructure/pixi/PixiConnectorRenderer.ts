import { Container, Graphics, Text } from 'pixi.js';
import type { ScenePage } from '../../domain/document/types';
import { distanceBetweenPoints } from '../../domain/geometry/point';
import type { Point2d } from '../../domain/geometry/types';
import { projectPageConnectors } from '../../domain/connectors/routeProjection';
import type {
  ConnectorMarkerGlyph,
  ConnectorStrokePresentation,
} from '../../domain/connectors/types';
import { buildNodeWorldMatrices, nodeWorldCenter } from '../../domain/scene/worldGeometry';

const LEGACY_STROKE = 0x94a3b8;
const LABEL_DETAIL_ZOOM = 0.65;

function normalizedDirection(from: Point2d, to: Point2d): Point2d {
  const distance = distanceBetweenPoints(from, to);
  return distance > 1e-9
    ? { x: (to.x - from.x) / distance, y: (to.y - from.y) / distance }
    : { x: 1, y: 0 };
}

function offsetPoint(point: Point2d, direction: Point2d, distance: number): Point2d {
  return { x: point.x + direction.x * distance, y: point.y + direction.y * distance };
}

function perpendicular(direction: Point2d): Point2d {
  return { x: -direction.y, y: direction.x };
}

function drawOpenPolygon(
  graphics: Graphics,
  points: readonly Point2d[],
  color: string,
  width: number
): void {
  graphics
    .poly(points.flatMap((point) => [point.x, point.y]))
    .fill({ color: 0xffffff })
    .stroke({ color, width });
}

function drawMarker(
  graphics: Graphics,
  glyph: ConnectorMarkerGlyph,
  endpoint: Point2d,
  outward: Point2d,
  offset: number,
  stroke: ConnectorStrokePresentation
): void {
  const tip = offsetPoint(endpoint, outward, -offset);
  const back = offsetPoint(tip, outward, -9);
  const normal = perpendicular(outward);
  const left = offsetPoint(back, normal, 4.5);
  const right = offsetPoint(back, normal, -4.5);
  switch (glyph) {
    case 'arrow':
      graphics
        .moveTo(left.x, left.y)
        .lineTo(tip.x, tip.y)
        .lineTo(right.x, right.y)
        .stroke({ color: stroke.color, alpha: stroke.opacity, width: stroke.width });
      break;
    case 'triangle-open':
      drawOpenPolygon(graphics, [tip, left, right], stroke.color, stroke.width);
      break;
    case 'triangle-filled':
      graphics.poly([tip.x, tip.y, left.x, left.y, right.x, right.y]).fill({
        color: stroke.color,
        alpha: stroke.opacity,
      });
      break;
    case 'diamond-open':
    case 'diamond-filled': {
      const far = offsetPoint(tip, outward, -14);
      const middle = offsetPoint(tip, outward, -7);
      const diamondLeft = offsetPoint(middle, normal, 4.5);
      const diamondRight = offsetPoint(middle, normal, -4.5);
      const points = [tip, diamondLeft, far, diamondRight];
      if (glyph === 'diamond-open') {
        drawOpenPolygon(graphics, points, stroke.color, stroke.width);
      } else {
        graphics.poly(points.flatMap((point) => [point.x, point.y])).fill({ color: stroke.color });
      }
      break;
    }
    case 'circle': {
      const center = offsetPoint(tip, outward, -5);
      graphics
        .circle(center.x, center.y, 4)
        .fill({ color: 0xffffff })
        .stroke({ color: stroke.color, width: stroke.width });
      break;
    }
    case 'bar': {
      const center = offsetPoint(tip, outward, -3);
      const barStart = offsetPoint(center, normal, 5);
      const barEnd = offsetPoint(center, normal, -5);
      graphics
        .moveTo(barStart.x, barStart.y)
        .lineTo(barEnd.x, barEnd.y)
        .stroke({ color: stroke.color, width: stroke.width });
      break;
    }
    case 'crow-foot': {
      const root = offsetPoint(tip, outward, -9);
      graphics
        .moveTo(root.x, root.y)
        .lineTo(tip.x, tip.y)
        .moveTo(root.x, root.y)
        .lineTo(left.x, left.y)
        .moveTo(root.x, root.y)
        .lineTo(right.x, right.y)
        .stroke({ color: stroke.color, width: stroke.width });
      break;
    }
  }
}

function drawSolidPath(
  graphics: Graphics,
  samples: readonly Point2d[],
  stroke: ConnectorStrokePresentation
): void {
  const first = samples[0];
  if (!first) return;
  graphics.moveTo(first.x, first.y);
  for (const point of samples.slice(1)) graphics.lineTo(point.x, point.y);
  graphics.stroke({ color: stroke.color, alpha: stroke.opacity, width: stroke.width });
}

function drawDashedPath(
  graphics: Graphics,
  samples: readonly Point2d[],
  stroke: ConnectorStrokePresentation
): void {
  let patternIndex = 0;
  let remaining = stroke.dash[0];
  let drawing = true;
  for (let index = 1; index < samples.length; index += 1) {
    let start = samples[index - 1];
    const end = samples[index];
    let segmentLength = distanceBetweenPoints(start, end);
    const direction = normalizedDirection(start, end);
    while (segmentLength > 1e-9) {
      const step = Math.min(segmentLength, remaining);
      const next = offsetPoint(start, direction, step);
      if (drawing) {
        graphics
          .moveTo(start.x, start.y)
          .lineTo(next.x, next.y)
          .stroke({ color: stroke.color, alpha: stroke.opacity, width: stroke.width });
      }
      start = next;
      segmentLength -= step;
      remaining -= step;
      if (remaining <= 1e-9) {
        patternIndex = (patternIndex + 1) % stroke.dash.length;
        remaining = stroke.dash[patternIndex];
        drawing = !drawing;
      }
    }
  }
}

export class PixiConnectorRenderer {
  readonly container = new Container();
  private readonly paths = new Graphics();
  private readonly labelPlates = new Graphics();
  private readonly labels = new Container();
  private debugSnapshot = { connectors: 0, labels: 0, markers: 0 };

  constructor() {
    this.container.addChild(this.paths, this.labelPlates, this.labels);
  }

  draw(page: ScenePage, advanced: boolean): void {
    this.paths.clear();
    this.labelPlates.clear();
    this.labels.removeChildren().forEach((child) => child.destroy());
    const visibleLayerIds = new Set(page.layers.filter((layer) => layer.visible).map((layer) => layer.id));
    const nodesById = new Map(page.nodes.map((node) => [node.id, node]));
    const visiblePage = {
      ...page,
      connectors: page.connectors.filter((connector) => {
        const source = nodesById.get(connector.source.nodeId);
        const target = nodesById.get(connector.target.nodeId);
        return Boolean(source && target && visibleLayerIds.has(source.layerId) && visibleLayerIds.has(target.layerId));
      }),
    };
    if (!advanced) {
      this.drawLegacy(visiblePage);
      this.debugSnapshot = { connectors: visiblePage.connectors.length, labels: 0, markers: 0 };
      return;
    }
    const connectors = projectPageConnectors(visiblePage);
    let labelCount = 0;
    let markerCount = 0;
    for (const connector of connectors) {
      const { samples, presentation } = connector;
      if (presentation.stroke.dash.length > 0) {
        drawDashedPath(this.paths, samples, presentation.stroke);
      } else {
        drawSolidPath(this.paths, samples, presentation.stroke);
      }
      const first = samples[0];
      const last = samples.at(-1);
      if (first && samples[1]) {
        const outward = normalizedDirection(samples[1], first);
        connector.presentation.sourceMarkers.forEach((glyph, index) =>
          drawMarker(this.paths, glyph, first, outward, index * 9, presentation.stroke)
        );
        markerCount += connector.presentation.sourceMarkers.length;
      }
      if (last && samples.at(-2)) {
        const outward = normalizedDirection(samples.at(-2)!, last);
        connector.presentation.targetMarkers.forEach((glyph, index) =>
          drawMarker(this.paths, glyph, last, outward, index * 9, presentation.stroke)
        );
        markerCount += connector.presentation.targetMarkers.length;
      }
      for (const labelGeometry of connector.labels) this.drawLabel(labelGeometry);
      labelCount += connector.labels.length;
    }
    this.debugSnapshot = {
      connectors: connectors.length,
      labels: labelCount,
      markers: markerCount,
    };
  }

  getDebugSnapshot(): {
    readonly connectors: number;
    readonly labels: number;
    readonly markers: number;
  } {
    return this.debugSnapshot;
  }

  setZoom(zoom: number): void {
    const visible = zoom >= LABEL_DETAIL_ZOOM;
    this.labels.visible = visible;
    this.labelPlates.visible = visible;
  }

  private drawLegacy(page: ScenePage): void {
    const matrices = buildNodeWorldMatrices(page);
    const nodes = new Map(page.nodes.map((node) => [node.id, node]));
    for (const connector of page.connectors) {
      const source = nodes.get(connector.source.nodeId);
      const target = nodes.get(connector.target.nodeId);
      const sourceMatrix = source && matrices.get(source.id);
      const targetMatrix = target && matrices.get(target.id);
      if (!source || !target || !sourceMatrix || !targetMatrix) continue;
      const start = nodeWorldCenter(source, sourceMatrix);
      const end = nodeWorldCenter(target, targetMatrix);
      this.paths
        .moveTo(start.x, start.y)
        .lineTo(end.x, end.y)
        .stroke({ color: LEGACY_STROKE, width: 1.5 });
    }
  }

  private drawLabel(label: { readonly text: string; readonly point: Point2d }): void {
    const text = new Text({
      text: label.text,
      style: {
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        fontSize: 11,
        fontWeight: '600',
        fill: 0x334155,
      },
    });
    text.anchor.set(0.5);
    text.position.set(label.point.x, label.point.y);
    this.labelPlates
      .roundRect(label.point.x - text.width / 2 - 5, label.point.y - 9, text.width + 10, 18, 4)
      .fill({ color: 0xffffff, alpha: 0.96 })
      .stroke({ color: 0xe2e8f0, width: 1 });
    this.labels.addChild(text);
  }
}
