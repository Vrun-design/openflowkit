import { Container, Graphics } from 'pixi.js';
import type { SceneNode } from '../../domain/document/types';
import { applyMatrixToPoint } from '../../domain/geometry/matrix';
import type { Matrix2d, Size2d } from '../../domain/geometry/types';
import {
  mindmapNodeOutlinePoints,
  type MindmapOutlineShape,
} from '../../domain/nodes/mindmapNodeOutline';
import {
  createMindmapHierarchySnapshot,
  type MindmapHierarchySnapshot,
  type MindmapWrapper,
} from '../../domain/nodes/mindmapNodePresentation';
import { projectMindmapNodeVisual, type PixiMindmapNodeVisual } from './mindmapNodeVisual';
import type { PixiNodeDebugRecord } from './pixiNodeDebug';
import { drawPixiLocalRect } from './pixiNodeOutline';
import { applyPixiNodeMatrix } from './pixiNodeTransform';
import { createPixiText, truncateTextToWidth } from './pixiText';

export interface PixiMindmapNodeDrawResult {
  readonly label: Container;
  readonly debug: PixiNodeDebugRecord;
}

function wrapperShape(wrapper: MindmapWrapper | undefined, depth: number): MindmapOutlineShape {
  if (wrapper === 'double-circle') return 'ellipse';
  if (wrapper === 'stadium') return 'capsule';
  if (wrapper === 'rounded') return 'rounded';
  if (wrapper === 'hexagon') return 'hexagon';
  if (wrapper === 'double-square' || wrapper === 'subroutine' || wrapper === 'square') {
    return 'rectangle';
  }
  return depth === 0 ? 'rounded' : 'capsule';
}

function drawLocalOutline(
  graphics: Graphics,
  shape: MindmapOutlineShape,
  size: Size2d,
  matrix: Matrix2d,
  inset = 0
): void {
  const innerSize = {
    width: Math.max(1, size.width - inset * 2),
    height: Math.max(1, size.height - inset * 2),
  };
  const points = mindmapNodeOutlinePoints(shape, innerSize).map((point) =>
    applyMatrixToPoint(matrix, { x: point.x + inset, y: point.y + inset })
  );
  graphics.poly(points.flatMap((point) => [point.x, point.y]));
}

function wrapperName(wrapper: MindmapWrapper | undefined, depth: number): string {
  return wrapper ?? (depth === 0 ? 'root-topic' : 'branch-topic');
}

export class PixiMindmapNodeRenderer {
  private hierarchy: MindmapHierarchySnapshot = {
    childCountByNodeId: new Map(),
    descendantCountByNodeId: new Map(),
  };

  beginDraw(nodes: readonly SceneNode[]): void {
    this.hierarchy = createMindmapHierarchySnapshot(nodes);
  }

  drawNode(
    node: SceneNode,
    matrix: Matrix2d,
    graphics: Graphics
  ): PixiMindmapNodeDrawResult | null {
    const visual = projectMindmapNodeVisual(node);
    if (!visual) return null;
    const shape = wrapperShape(visual.presentation.wrapper, visual.presentation.depth);
    this.drawChrome(node, matrix, graphics, visual, shape);
    const label = this.createLabel(node, visual);
    applyPixiNodeMatrix(label, matrix);
    return {
      label,
      debug: {
        id: node.id,
        kind: 'mindmap',
        shape: wrapperName(visual.presentation.wrapper, visual.presentation.depth),
        fill: visual.fill,
        stroke: visual.stroke,
        mediaState: 'none',
        depth: visual.presentation.depth,
        parentId: visual.presentation.parentId ?? null,
        branchSide: visual.presentation.side ?? null,
        structuralState: visual.presentation.collapsed ? 'collapsed' : 'expanded',
        childCount: this.hierarchy.childCountByNodeId.get(node.id) ?? 0,
        descendantCount: this.hierarchy.descendantCountByNodeId.get(node.id) ?? 0,
      },
    };
  }

  private drawChrome(
    node: SceneNode,
    matrix: Matrix2d,
    graphics: Graphics,
    visual: PixiMindmapNodeVisual,
    shape: MindmapOutlineShape
  ): void {
    drawLocalOutline(graphics, shape, node.size, matrix);
    graphics
      .fill({ color: visual.fill })
      .stroke({ color: visual.stroke, width: visual.presentation.depth === 0 ? 2 : 1.5 });
    if (visual.presentation.wrapper === 'double-circle') {
      drawLocalOutline(graphics, 'ellipse', node.size, matrix, 5);
      graphics.stroke({ color: visual.stroke, width: 1 });
    }
    if (visual.presentation.wrapper === 'double-square') {
      drawLocalOutline(graphics, 'rectangle', node.size, matrix, 5);
      graphics.stroke({ color: visual.stroke, width: 1 });
    }
    if (visual.presentation.wrapper === 'subroutine') {
      drawPixiLocalRect(graphics, { x: 8, y: 0, width: 1, height: node.size.height }, matrix);
      graphics.fill({ color: visual.stroke });
      drawPixiLocalRect(
        graphics,
        { x: node.size.width - 9, y: 0, width: 1, height: node.size.height },
        matrix
      );
      graphics.fill({ color: visual.stroke });
    }
    if (visual.presentation.collapsed) {
      drawPixiLocalRect(
        graphics,
        { x: node.size.width - 31, y: node.size.height - 17, width: 24, height: 13 },
        matrix,
        6
      );
      graphics.fill({ color: visual.accent });
    }
  }

  private createLabel(node: SceneNode, visual: PixiMindmapNodeVisual): Container {
    const content = new Container();
    const isRoot = visual.presentation.depth === 0;
    const label = createPixiText(
      truncateTextToWidth(visual.presentation.label, node.size.width - (isRoot ? 40 : 28), 7),
      {
        size: isRoot ? 14 : Math.max(11, 13 - Math.min(2, visual.presentation.depth - 1)),
        weight: isRoot ? '700' : visual.presentation.depth === 1 ? '600' : '500',
        fill: visual.text,
      }
    );
    const alignment = isRoot ? 'center' : visual.presentation.side === 'left' ? 'right' : 'left';
    label.anchor.set(alignment === 'center' ? 0.5 : alignment === 'right' ? 1 : 0, 0.5);
    label.position.set(
      alignment === 'center'
        ? node.size.width / 2
        : alignment === 'right'
          ? node.size.width - 14
          : 14,
      node.size.height / 2
    );
    content.addChild(label);
    if (visual.presentation.collapsed) {
      const count = this.hierarchy.descendantCountByNodeId.get(node.id) ?? 0;
      const badge = createPixiText(`+${count}`, { size: 8, weight: '700', fill: visual.fill });
      badge.anchor.set(0.5, 0.5);
      badge.position.set(node.size.width - 19, node.size.height - 10.5);
      content.addChild(badge);
    }
    return content;
  }
}
