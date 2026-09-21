import { buildNodeStateMap } from '../../domain/scene/nodeState';
import { Container, Graphics } from 'pixi.js';
import { createBounds2d } from '../../domain/geometry/bounds';
import type { SceneNode, ScenePage } from '../../domain/document/types';
import type { Matrix2d } from '../../domain/geometry/types';
import type { SceneIndex } from '../../domain/scene/types';
import { resolveNodeStyle, type NodeStyle } from '../../domain/nodes/nodeStyle';
import { CONTAINER_TITLE_HEIGHT, nodeLabelBounds } from '../../domain/nodes/nodeLabelBounds';
import { basicNodeOutlinePoints } from '../../domain/nodes/basicNodeOutline';
import { applyMatrixToPoint } from '../../domain/geometry/matrix';
import { projectContainerNodeVisual, type PixiContainerNodeVisual } from './containerNodeVisual';
import { drawDashedPath } from './PixiConnectorRenderer';
import { pixiPaintColor } from './pixiColor';
import { drawPixiLocalRect, drawPixiNodeOutline } from './pixiNodeOutline';
import type { PixiNodeDebugRecord } from './pixiNodeDebug';
import { applyPixiNodeMatrix } from './pixiNodeTransform';
import { createPixiText, createStyledPixiText, decoratePixiText } from './pixiText';

function containerShape(kind: PixiContainerNodeVisual['presentation']['kind']): string {
  if (kind === 'group') return 'group-frame';
  if (kind === 'section') return 'section-frame';
  if (kind === 'frame') return 'frame';
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

/** ⌘G groups have no label and no paint until styled: the selection frame is their only chrome. */
function isQuietGroup(node: SceneNode): boolean {
  return node.kind === 'group' && node.content.label === ''
    && node.appearance.fill === undefined && node.appearance.stroke === undefined;
}

/** Diagram frames always draw their boundary; the title band appears with a title. */
function showsTitleBand(visual: PixiContainerNodeVisual): boolean {
  return visual.presentation.kind !== 'frame' || visual.presentation.label.length > 0;
}

export class PixiContainerRenderer {
  readonly graphics = new Graphics();
  readonly labels = new Container();
  private readonly labelByNodeId = new Map<string, Container>();
  private debugRecords: readonly PixiNodeDebugRecord[] = [];

  draw(
    page: ScenePage,
    index: SceneIndex,
    renderedNodeIds: ReadonlySet<string> | null = null
  ): void {
    this.graphics.clear();
    this.labels.removeChildren().forEach((child) => child.destroy({ children: true }));
    this.labelByNodeId.clear();
    const records: PixiNodeDebugRecord[] = [];
    const nodeStates = buildNodeStateMap(page);
    for (const node of page.nodes) {
      if (!nodeStates.get(node.id)?.visible) continue;
      if (renderedNodeIds && !renderedNodeIds.has(node.id)) continue;
      const visual = projectContainerNodeVisual(node);
      const matrix = index.worldMatricesByNodeId.get(node.id);
      if (!visual || !matrix) continue;
      const childCount = index.childIdsByParentId.get(node.id)?.length ?? 0;
      const style = resolveNodeStyle(node);
      this.drawContainer(node, matrix, visual, style);
      if (!isQuietGroup(node)) {
        const label = this.createLabel(node, visual, style, childCount);
        applyPixiNodeMatrix(label, matrix);
        this.labels.addChild(label);
        this.labelByNodeId.set(node.id, label);
      }
      records.push({
        id: node.id,
        kind: visual.presentation.kind,
        shape: containerShape(visual.presentation.kind),
        fill: pixiPaintColor(style.fill, visual.fill.color).color,
        fillAlpha: pixiPaintColor(style.fill, visual.fill.color).alpha,
        stroke: pixiPaintColor(style.stroke, visual.stroke).color,
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

  private drawContainer(node: SceneNode, matrix: Matrix2d, visual: PixiContainerNodeVisual, style: NodeStyle): void {
    if (isQuietGroup(node)) return;
    const fill = pixiPaintColor(style.fill, visual.fill.color);
    const stroke = pixiPaintColor(style.stroke, visual.stroke);
    const alpha = style.opacity;
    drawPixiNodeOutline(this.graphics, 'rounded', node.size, matrix, undefined, style.cornerRadius);
    this.graphics.fill({ color: fill.color, alpha: fill.alpha * alpha });
    if (style.strokeWidth > 0 && style.dash.length) {
      const outline = basicNodeOutlinePoints('rounded', node.size, undefined, style.cornerRadius)
        .map((point) => applyMatrixToPoint(matrix, point));
      drawDashedPath(this.graphics, [...outline, outline[0]], {
        color: `#${stroke.color.toString(16).padStart(6, '0')}`, width: style.strokeWidth,
        opacity: stroke.alpha * alpha, dash: style.dash,
      });
    } else if (style.strokeWidth > 0) {
      this.graphics.stroke({ color: stroke.color, width: style.strokeWidth, alpha: stroke.alpha * alpha });
    }
    if (!showsTitleBand(visual)) return;
    if (visual.presentation.kind === 'section') {
      const titleWidth = Math.min(
        node.size.width - 16,
        Math.max(96, visual.presentation.label.length * 7 + 52)
      );
      drawPixiLocalRect(this.graphics, createBounds2d(8, 7, titleWidth, 27), matrix, 8);
      this.graphics.fill({ color: visual.badgeFill, alpha: 0.72 * alpha });
    } else {
      drawPixiLocalRect(this.graphics, createBounds2d(0, 0, node.size.width, CONTAINER_TITLE_HEIGHT), matrix, style.cornerRadius);
      this.graphics.fill({ color: visual.badgeFill, alpha: 0.48 * alpha });
      drawPixiLocalRect(this.graphics, createBounds2d(0, CONTAINER_TITLE_HEIGHT - 1, node.size.width, 1), matrix);
      this.graphics.fill({ color: stroke.color, alpha: 0.72 * alpha });
    }
    if (visual.presentation.kind !== 'frame') drawStructuralGlyph(this.graphics, matrix, visual);
  }

  private createLabel(
    node: SceneNode,
    visual: PixiContainerNodeVisual,
    style: NodeStyle,
    childCount: number
  ): Container {
    const content = new Container();
    content.alpha = style.opacity;
    const frame = visual.presentation.kind === 'frame';
    const ink = pixiPaintColor(style.textColor, visual.title).color;
    const band = nodeLabelBounds(node);
    const title = createStyledPixiText(visual.presentation.label, style, ink, Math.max(1, band.width - style.textPadding * 2));
    // Anchored to the band's vertical centre so the editor and the label share one baseline.
    title.anchor.set(style.textAlign === 'end' ? 1 : style.textAlign === 'center' ? 0.5 : 0, 0.5);
    const x = style.textAlign === 'end' ? band.x + band.width - style.textPadding
      : style.textAlign === 'center' ? band.x + band.width / 2 : band.x + style.textPadding;
    title.position.set(x, band.y + band.height / 2);
    content.addChild(title);
    decoratePixiText(content, title, style, ink);
    if (!frame) {
      const count = createPixiText(`${childCount} ${childCount === 1 ? 'item' : 'items'}`, {
        size: 10,
        weight: '500',
        fill: visual.badgeText,
      });
      count.anchor.set(1, 0);
      count.position.set(node.size.width - 12, 14);
      content.addChild(count);
    }
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
