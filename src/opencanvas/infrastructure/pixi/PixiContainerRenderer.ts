import { Container, Graphics } from 'pixi.js';
import { createBounds2d } from '../../domain/geometry/bounds';
import type { SceneNode, ScenePage } from '../../domain/document/types';
import type { Matrix2d } from '../../domain/geometry/types';
import type { SceneIndex } from '../../domain/scene/types';
import { projectContainerNodeVisual, type PixiContainerNodeVisual } from './containerNodeVisual';
import { drawPixiLocalRect, drawPixiNodeOutline } from './pixiNodeOutline';
import type { PixiNodeDebugRecord } from './pixiNodeDebug';
import { applyPixiNodeMatrix } from './pixiNodeTransform';
import { createPixiText } from './pixiText';

function containerShape(kind: PixiContainerNodeVisual['presentation']['kind']): string {
  if (kind === 'group') return 'group-frame';
  if (kind === 'section') return 'section-frame';
  return 'swimlane';
}

function statusText(visual: PixiContainerNodeVisual): string {
  const states = [
    visual.presentation.locked ? 'Locked' : null,
    visual.presentation.hidden ? 'Hidden' : null,
    visual.presentation.collapsed ? 'Collapsed' : null,
  ].filter((state): state is string => state !== null);
  return states.join(' · ');
}

function drawStructuralGlyph(
  graphics: Graphics,
  matrix: Matrix2d,
  visual: PixiContainerNodeVisual
): void {
  const kind = visual.presentation.kind;
  if (kind === 'group') {
    drawPixiLocalRect(graphics, createBounds2d(12, 13, 17, 12), matrix, 3);
    graphics.stroke({ color: visual.title, width: 1.25 });
    drawPixiLocalRect(graphics, createBounds2d(14, 10, 8, 4), matrix, 2);
    graphics.fill({ color: visual.badgeFill }).stroke({ color: visual.title, width: 1.25 });
    return;
  }
  drawPixiLocalRect(graphics, createBounds2d(12, 11, 17, 16), matrix, 3);
  graphics.stroke({ color: visual.title, width: 1.25 });
  if (kind === 'swimlane') {
    drawPixiLocalRect(graphics, createBounds2d(15, 16, 11, 1), matrix);
    graphics.fill({ color: visual.title });
    drawPixiLocalRect(graphics, createBounds2d(15, 21, 11, 1), matrix);
    graphics.fill({ color: visual.title });
  }
}

export class PixiContainerRenderer {
  readonly graphics = new Graphics();
  readonly labels = new Container();
  private readonly labelByNodeId = new Map<string, Container>();
  private debugRecords: readonly PixiNodeDebugRecord[] = [];

  draw(page: ScenePage, index: SceneIndex, enabled: boolean): void {
    this.graphics.clear();
    this.labels.removeChildren().forEach((child) => child.destroy({ children: true }));
    this.labelByNodeId.clear();
    if (!enabled) {
      this.debugRecords = [];
      return;
    }
    const records: PixiNodeDebugRecord[] = [];
    const visibleLayerIds = new Set(page.layers.filter((layer) => layer.visible).map((layer) => layer.id));
    for (const node of page.nodes) {
      if (!visibleLayerIds.has(node.layerId)) continue;
      const visual = projectContainerNodeVisual(node);
      const matrix = index.worldMatricesByNodeId.get(node.id);
      if (!visual || !matrix) continue;
      const childCount = index.childIdsByParentId.get(node.id)?.length ?? 0;
      this.drawContainer(node, matrix, visual);
      const label = this.createLabel(node, visual, childCount);
      applyPixiNodeMatrix(label, matrix);
      this.labels.addChild(label);
      this.labelByNodeId.set(node.id, label);
      records.push({
        id: node.id,
        kind: visual.presentation.kind,
        shape: containerShape(visual.presentation.kind),
        fill: visual.fill.color,
        fillAlpha: visual.fill.alpha,
        stroke: visual.stroke,
        mediaState: 'none',
        childCount,
        parentId: node.parentId,
        structuralState: statusText(visual) || 'expanded',
      });
    }
    this.debugRecords = records;
  }

  getDebugSnapshot(): readonly PixiNodeDebugRecord[] {
    return this.debugRecords;
  }

  setLabelVisibility(visibleNodeIds: ReadonlySet<string> | null): void {
    this.labels.visible = visibleNodeIds !== null;
    if (!visibleNodeIds) return;
    for (const [nodeId, label] of this.labelByNodeId) {
      label.visible = visibleNodeIds.has(nodeId);
    }
  }

  private drawContainer(node: SceneNode, matrix: Matrix2d, visual: PixiContainerNodeVisual): void {
    drawPixiNodeOutline(this.graphics, 'rounded', node.size, matrix);
    this.graphics
      .fill({ color: visual.fill.color, alpha: visual.fill.alpha })
      .stroke({ color: visual.stroke, width: visual.presentation.kind === 'swimlane' ? 2 : 1.5 });
    if (visual.presentation.kind === 'section') {
      const titleWidth = Math.min(
        node.size.width - 16,
        Math.max(96, visual.presentation.label.length * 7 + 52)
      );
      drawPixiLocalRect(this.graphics, createBounds2d(8, 7, titleWidth, 27), matrix, 8);
      this.graphics.fill({ color: visual.badgeFill, alpha: 0.72 });
    } else {
      drawPixiLocalRect(this.graphics, createBounds2d(0, 0, node.size.width, 40), matrix, 12);
      this.graphics.fill({ color: visual.badgeFill, alpha: 0.48 });
      drawPixiLocalRect(this.graphics, createBounds2d(0, 39, node.size.width, 1), matrix);
      this.graphics.fill({ color: visual.stroke, alpha: 0.72 });
    }
    drawStructuralGlyph(this.graphics, matrix, visual);
  }

  private createLabel(
    node: SceneNode,
    visual: PixiContainerNodeVisual,
    childCount: number
  ): Container {
    const content = new Container();
    const title = createPixiText(visual.presentation.label, {
      size: visual.presentation.kind === 'swimlane' ? 13 : 14,
      weight: '700',
      fill: visual.title,
      wrapWidth: Math.max(1, node.size.width - 140),
    });
    title.position.set(37, 11);
    content.addChild(title);
    const count = createPixiText(`${childCount} ${childCount === 1 ? 'item' : 'items'}`, {
      size: 10,
      weight: '500',
      fill: visual.badgeText,
    });
    count.anchor.set(1, 0);
    count.position.set(node.size.width - 12, 14);
    content.addChild(count);
    const detail = [visual.presentation.subLabel, statusText(visual)]
      .filter((value): value is string => Boolean(value))
      .join(' · ');
    if (detail) {
      const metadata = createPixiText(detail, {
        size: 10,
        weight: '500',
        fill: visual.badgeText,
        wrapWidth: Math.max(1, node.size.width - 24),
      });
      metadata.position.set(12, node.size.height - 22);
      content.addChild(metadata);
    }
    return content;
  }
}
