import { Container, Graphics } from 'pixi.js';
import { createBounds2d } from '../../domain/geometry/bounds';
import { applyMatrixToPoint } from '../../domain/geometry/matrix';
import type { SceneNode } from '../../domain/document/types';
import type { Matrix2d, Size2d } from '../../domain/geometry/types';
import { projectFreeformNodeVisual, type PixiFreeformNodeVisual } from './freeformNodeVisual';
import { drawPixiNodeOutline } from './pixiNodeOutline';
import type { PixiNodeDebugRecord } from './pixiNodeDebug';
import { PixiMediaLayer } from './PixiMediaLayer';
import { applyPixiNodeMatrix } from './pixiNodeTransform';
import { createPixiText } from './pixiText';

export interface PixiFreeformNodeDrawResult {
  readonly label: Container;
  readonly debug: PixiNodeDebugRecord;
}

function drawChrome(
  graphics: Graphics,
  visual: PixiFreeformNodeVisual,
  size: Size2d,
  matrix: Matrix2d
): void {
  if (visual.kind === 'pen' || visual.kind === 'highlighter'
    || visual.kind === 'line' || visual.kind === 'arrow') return;
  if (visual.kind === 'text') {
    if (!visual.hasBackground) return;
    drawPixiNodeOutline(graphics, 'rounded', size, matrix);
    graphics.fill({ color: visual.fill }).stroke({ color: visual.stroke, width: 1 });
    return;
  }
  drawPixiNodeOutline(graphics, 'rounded', size, matrix);
  graphics.fill({ color: visual.fill }).stroke({ color: visual.stroke, width: 1.5 });
  if (visual.kind !== 'annotation' && visual.kind !== 'sticky' && visual.kind !== 'callout') return;
  const foldSize = Math.min(28, size.width / 4, size.height / 3);
  const fold = [
    { x: size.width - foldSize, y: size.height },
    { x: size.width, y: size.height - foldSize },
    { x: size.width, y: size.height },
  ].map((point) => applyMatrixToPoint(matrix, point));
  graphics
    .poly(fold.flatMap((point) => [point.x, point.y]))
    .fill({ color: visual.foldFill })
    .stroke({ color: visual.foldStroke, width: 1 });
}

export class PixiFreeformNodeRenderer {
  private readonly mediaLayer: PixiMediaLayer;

  constructor(onMediaReady: (nodeId: string) => void) {
    this.mediaLayer = new PixiMediaLayer(onMediaReady);
  }

  get media(): Container {
    return this.mediaLayer.container;
  }

  beginDraw(): number {
    return this.mediaLayer.beginDraw();
  }

  isMediaLoaded(nodeId: string): boolean {
    return this.mediaLayer.isLoaded(nodeId);
  }

  drawNode(
    node: SceneNode,
    matrix: Matrix2d,
    graphics: Graphics,
    generation: number
  ): PixiFreeformNodeDrawResult | null {
    const visual = projectFreeformNodeVisual(node);
    if (!visual) return null;
    if (visual.kind === 'pen' || visual.kind === 'highlighter'
      || visual.kind === 'line' || visual.kind === 'arrow') {
      const points = visual.presentation.points.map((point) => applyMatrixToPoint(matrix, point));
      graphics.moveTo(points[0].x, points[0].y);
      for (const point of points.slice(1)) graphics.lineTo(point.x, point.y);
      graphics.stroke({ color: visual.stroke, width: visual.presentation.width,
        alpha: visual.presentation.opacity, cap: 'round', join: 'round' });
      if (visual.kind === 'arrow') {
        const end = points.at(-1)!; const previous = points.at(-2)!;
        const angle = Math.atan2(end.y - previous.y, end.x - previous.x);
        const length = Math.max(8, visual.presentation.width * 3);
        graphics.moveTo(end.x, end.y)
          .lineTo(end.x - Math.cos(angle - Math.PI / 6) * length,
            end.y - Math.sin(angle - Math.PI / 6) * length)
          .moveTo(end.x, end.y)
          .lineTo(end.x - Math.cos(angle + Math.PI / 6) * length,
            end.y - Math.sin(angle + Math.PI / 6) * length)
          .stroke({ color: visual.stroke, width: visual.presentation.width,
            alpha: visual.presentation.opacity, cap: 'round' });
      }
    }
    drawChrome(graphics, visual, node.size, matrix);
    const label = this.createLabel(visual, node.size);
    applyPixiNodeMatrix(label, matrix);
    if (visual.kind === 'image' && visual.presentation.sourceUrl) {
      this.mediaLayer.load({
        nodeId: node.id,
        generation,
        matrix,
        bounds: createBounds2d(0, 0, node.size.width, node.size.height),
        opacity: visual.presentation.opacity,
        resolveUrl: async () => visual.presentation.sourceUrl,
      });
    }
    return {
      label,
      debug: {
        id: node.id,
        kind: visual.kind,
        shape: visual.kind,
        fill: visual.fill,
        stroke: visual.stroke,
        mediaState:
          visual.kind !== 'image' ? 'none' : visual.presentation.sourceUrl ? 'loading' : 'missing',
      },
    };
  }

  private createLabel(visual: PixiFreeformNodeVisual, size: Size2d): Container {
    const content = new Container();
    if (visual.kind === 'text') {
      const text = createPixiText(visual.presentation.label, {
        size: visual.presentation.fontSizePx,
        weight: visual.presentation.fontWeight,
        fill: visual.text,
        family: visual.presentation.fontFamily,
        style: visual.presentation.fontStyle,
        wrapWidth: Math.max(1, size.width - 16),
      });
      text.anchor.set(0.5);
      text.position.set(size.width / 2, size.height / 2);
      content.addChild(text);
      return content;
    }
    if (visual.kind === 'annotation' || visual.kind === 'sticky' || visual.kind === 'callout') {
      const title = visual.presentation.title
        ? createPixiText(visual.presentation.title, {
            size: 14,
            weight: '700',
            fill: visual.text,
            wrapWidth: Math.max(1, size.width - 24),
          })
        : null;
      const body = createPixiText(visual.presentation.body, {
        size: 12,
        weight: '500',
        fill: visual.subText,
        wrapWidth: Math.max(1, size.width - 24),
      });
      if (title) {
        title.position.set(12, 10);
        body.position.set(12, 34);
        content.addChild(title);
      } else {
        body.position.set(12, 12);
      }
      content.addChild(body);
      return content;
    }
    if (visual.kind === 'pen' || visual.kind === 'highlighter'
      || visual.kind === 'line' || visual.kind === 'arrow') return content;
    if (visual.kind !== 'image') return content;
    const placeholder = createPixiText(
      visual.presentation.sourceUrl ? 'Loading image…' : 'No Image',
      {
        size: 12,
        weight: '600',
        fill: visual.text,
      }
    );
    placeholder.anchor.set(0.5);
    placeholder.position.set(size.width / 2, size.height / 2);
    content.addChild(placeholder);
    return content;
  }
}
