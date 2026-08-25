import { Graphics } from 'pixi.js';
import type { Point2d } from '../../domain/geometry/types';
import { pressureTiltSegmentWidth, type StrokeInput } from '../../domain/nodes/strokeInput';

interface FreeformPreviewPoint extends Point2d {
  readonly input?: StrokeInput;
}

export interface FreeformPreviewFrame {
  readonly confirmed: readonly FreeformPreviewPoint[];
  readonly predicted: readonly FreeformPreviewPoint[];
  readonly predictionOrigin?: FreeformPreviewPoint;
  readonly color: number;
  readonly width: number;
  readonly alpha: number;
}

function tracePath(graphics: Graphics, points: readonly Point2d[]): void {
  const first = points[0];
  if (!first) return;
  graphics.moveTo(first.x, first.y);
  for (const point of points.slice(1)) graphics.lineTo(point.x, point.y);
}

function drawPath(
  graphics: Graphics,
  points: readonly FreeformPreviewPoint[],
  color: number,
  width: number,
  alpha: number
): void {
  if (points.length < 2) return;
  if (!points.some((point) => point.input)) {
    tracePath(graphics, points);
    graphics.stroke({ color, width, alpha, cap: 'round', join: 'round' });
    return;
  }
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const point = points[index];
    graphics.moveTo(previous.x, previous.y).lineTo(point.x, point.y).stroke({
      color,
      width: pressureTiltSegmentWidth(width, previous.input, point.input),
      alpha,
      cap: 'round',
    });
  }
}

export class PixiFreeformPreview {
  readonly graphics = new Graphics();

  clear(): void {
    this.graphics.clear();
  }

  draw(frame: FreeformPreviewFrame): void {
    this.graphics.clear();
    drawPath(this.graphics, frame.confirmed, frame.color, frame.width, frame.alpha);
    const predictionOrigin = frame.predictionOrigin ?? frame.confirmed.at(-1);
    if (!predictionOrigin || frame.predicted.length === 0) return;
    drawPath(
      this.graphics,
      [predictionOrigin, ...frame.predicted],
      frame.color,
      frame.width,
      Math.min(frame.alpha, 0.35)
    );
  }
}
