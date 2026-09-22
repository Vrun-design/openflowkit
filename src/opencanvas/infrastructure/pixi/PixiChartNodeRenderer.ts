import { Container, Graphics } from 'pixi.js';
import type { SceneNode } from '../../domain/document/types';
import type { Matrix2d } from '../../domain/geometry/types';
import { applyMatrixToPoint } from '../../domain/geometry/matrix';
import { resolveChartPresentation } from '../../domain/nodes/chartNodePresentation';
import { resolveNodeStyle, type NodeStyle } from '../../domain/nodes/nodeStyle';
import { pixiHexColor } from './pixiColor';
import { createStyledPixiText } from './pixiText';
import type { PixiNodeDebugRecord } from './pixiNodeDebug';

// One renderer for every chart kind: the presentation says what marks exist,
// this draws them. Nothing here decides data, scale or colour.
export class PixiChartNodeRenderer {
  drawNode(
    node: SceneNode,
    matrix: Matrix2d,
    graphics: Graphics,
    canvasColor: string
  ): { label: Container; debug: PixiNodeDebugRecord } | null {
    const presentation = resolveChartPresentation(node);
    if (!presentation) return null;
    const style = resolveNodeStyle(node, canvasColor);
    const textColor = pixiHexColor(style.textColor, 0x334155);

    // The card: the fill the ink adapts to, so labels read in every theme.
    // Rules and the table header are the ink at low alpha for the same reason.
    const corners = [
      { x: 0, y: 0 }, { x: node.size.width, y: 0 },
      { x: node.size.width, y: node.size.height }, { x: 0, y: node.size.height },
    ].map((point) => applyMatrixToPoint(matrix, point));
    graphics.poly(corners.flatMap((point) => [point.x, point.y]));
    if (style.fill !== 'transparent') graphics.fill({ color: pixiHexColor(style.fill, 0xffffff) });
    if (style.strokeWidth > 0 && style.stroke !== 'transparent') {
      graphics.stroke({ color: pixiHexColor(style.stroke, 0xe2e8f0), width: style.strokeWidth });
    }

    for (const mark of presentation.marks) {
      const color = pixiHexColor(mark.color, 0x60a5fa);
      const points = mark.points.map((point) => applyMatrixToPoint(matrix, point));
      if (mark.kind === 'line') {
        if (points.length >= 2) {
          graphics.moveTo(points[0]!.x, points[0]!.y);
          for (const point of points.slice(1)) graphics.lineTo(point.x, point.y);
          graphics.stroke({ color, width: 2, alpha: mark.opacity });
        }
      } else if (mark.kind === 'area') {
        if (points.length >= 3) {
          graphics.poly(points.flatMap((point) => [point.x, point.y]));
          graphics.fill({ color, alpha: 0.35 * mark.opacity });
          graphics.stroke({ color, width: mark.opacity < 0.9 ? 1.5 : 0, alpha: mark.opacity });
        }
      } else if (mark.kind === 'point') {
        for (const point of points) graphics.circle(point.x, point.y, 3.5);
        graphics.fill({ color, alpha: mark.opacity });
      } else if (mark.kind === 'bar') {
        const [first, second] = points;
        if (first && second) {
          graphics.rect(first.x, first.y, second.x - first.x, second.y - first.y);
          graphics.fill({ color, alpha: mark.opacity });
        }
      } else if (mark.kind === 'slice') {
        if (points.length >= 3) {
          graphics.poly(points.flatMap((point) => [point.x, point.y]));
          graphics.fill({ color, alpha: mark.opacity });
        }
      } else if (mark.kind === 'swatch') {
        const [first, second] = points;
        if (first && second) {
          graphics.roundRect(first.x, first.y, second.x - first.x, second.y - first.y, 2);
          graphics.fill({ color, alpha: mark.opacity });
        }
      } else if (mark.kind === 'cell') {
        const [first, second] = points;
        if (first && second) {
          graphics.rect(first.x, first.y, second.x - first.x, second.y - first.y);
          graphics.fill({ color, alpha: mark.opacity });
          graphics.stroke({ color: pixiHexColor(style.fill, 0xffffff), width: 1, alpha: 0.6 });
        }
      }
    }
    for (const rule of presentation.rules) {
      const points = rule.map((point) => applyMatrixToPoint(matrix, point));
      if (points.length < 2) continue;
      graphics.moveTo(points[0]!.x, points[0]!.y);
      for (const point of points.slice(1)) graphics.lineTo(point.x, point.y);
      graphics.stroke({ color: textColor, width: 1, alpha: 0.2 });
    }
    if (presentation.table) {
      const { columns, rows, headerHeight } = presentation.table;
      for (const x of columns) {
        graphics.moveTo(matrix.tx + x * matrix.a, matrix.ty + rows[0]! * matrix.d);
        graphics.lineTo(matrix.tx + x * matrix.a, matrix.ty + rows[rows.length - 1]! * matrix.d);
      }
      for (const y of rows) {
        graphics.moveTo(matrix.tx + columns[0]! * matrix.a, matrix.ty + y * matrix.d);
        graphics.lineTo(matrix.tx + columns[columns.length - 1]! * matrix.a, matrix.ty + y * matrix.d);
      }
      graphics.stroke({ color: textColor, width: 1, alpha: 0.2 });
      graphics.rect(matrix.tx + columns[0]! * matrix.a, matrix.ty + rows[0]! * matrix.d,
        (columns[columns.length - 1]! - columns[0]!) * matrix.a, headerHeight * matrix.d);
      graphics.fill({ color: textColor, alpha: 0.06 });
    }

    // A fresh container per draw: the node renderer destroys every label
    // container each frame, so nothing here may outlive one draw.
    const label = new Container();
    for (const entry of presentation.labels) {
      if (!entry.text) continue;
      const at = applyMatrixToPoint(matrix, entry.at);
      const labelStyle: NodeStyle = entry.role === 'title'
        ? { ...style, fontSize: style.fontSize + 2, fontWeight: 600 }
        : { ...style, fontSize: 11, fontWeight: 500 };
      const text = createStyledPixiText(entry.text, labelStyle, entry.color ? pixiHexColor(entry.color, textColor) : textColor, null);
      text.anchor.set(entry.anchor === 'start' ? 0 : entry.anchor === 'end' ? 1 : 0.5, 0.5);
      text.position.set(at.x, at.y);
      label.addChild(text);
    }
    return {
      label,
      debug: {
        id: node.id, kind: 'chart', shape: presentation.chart,
        fill: pixiHexColor(style.fill, 0xffffff), stroke: pixiHexColor(style.stroke, 0xe2e8f0), textColor,
        mediaState: 'none',
      },
    };
  }
}
