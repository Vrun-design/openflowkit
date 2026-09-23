import { buildNodeStateMap } from '../../domain/scene/nodeState';
import { Container, Graphics } from 'pixi.js';
import { createBounds2d } from '../../domain/geometry/bounds';
import type { SceneNode, ScenePage } from '../../domain/document/types';
import type { Matrix2d } from '../../domain/geometry/types';
import type { SceneIndex } from '../../domain/scene/types';
import { resolveNodeStyle, type NodeStyle } from '../../domain/nodes/nodeStyle';
import { numericColorToHex } from '../../domain/color/adaptiveColor';
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

function drawSwimlaneGlyph(graphics: Graphics, matrix: Matrix2d, visual: PixiContainerNodeVisual): void {
  drawPixiLocalRect(graphics, createBounds2d(12, 11, 17, 16), matrix, 3);
  graphics.stroke({ color: visual.title, width: 1.25 });
  drawPixiLocalRect(graphics, createBounds2d(15, 16, 11, 1), matrix);
  graphics.fill({ color: visual.title });
  drawPixiLocalRect(graphics, createBounds2d(15, 21, 11, 1), matrix);
  graphics.fill({ color: visual.title });
}

/** ⌘G groups are invisible (Figma): the selection frame is their only chrome. */
function isQuietGroup(node: SceneNode): boolean {
  return node.kind === 'group';
}

export class PixiContainerRenderer {
  readonly graphics = new Graphics();
  readonly labels = new Container();
  private readonly labelByNodeId = new Map<string, Container>();
  private debugRecords: readonly PixiNodeDebugRecord[] = [];
  private editingNodeId: string | null = null;

  draw(
    page: ScenePage,
    index: SceneIndex,
    renderedNodeIds: ReadonlySet<string> | null = null,
    canvasColor?: number
  ): void {
    this.graphics.clear();
    const canvas = canvasColor === undefined ? undefined : numericColorToHex(canvasColor);
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
      const style = resolveNodeStyle(node, canvas);
      this.drawContainer(node, matrix, visual, style);
      if (!isQuietGroup(node) && visual.presentation.header) {
        const label = this.createLabel(node, visual, style);
        label.visible = node.id !== this.editingNodeId;
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
      label.visible = visibleNodeIds.has(nodeId) && nodeId !== this.editingNodeId;
    }
  }

  /** The DOM editor replaces this container's title while it is open. */
  setEditingNode(nodeId: string | null): void {
    const previous = this.editingNodeId;
    this.editingNodeId = nodeId;
    if (previous) { const label = this.labelByNodeId.get(previous); if (label) label.visible = true; }
    if (nodeId) { const label = this.labelByNodeId.get(nodeId); if (label) label.visible = false; }
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
    if (!visual.presentation.header) return;
    // Sections title like Figma: plain text in the top-left, no band or pill,
    // so the DOM editor is the same text in the same place.
    if (visual.presentation.kind !== 'section') {
      drawPixiLocalRect(this.graphics, createBounds2d(0, 0, node.size.width, CONTAINER_TITLE_HEIGHT), matrix, style.cornerRadius);
      // Never louder than the body wash, so a dark-canvas frame keeps a faint band.
      this.graphics.fill({ color: visual.badgeFill, alpha: Math.min(0.48, fill.alpha) * alpha });
      drawPixiLocalRect(this.graphics, createBounds2d(0, CONTAINER_TITLE_HEIGHT - 1, node.size.width, 1), matrix);
      this.graphics.fill({ color: stroke.color, alpha: 0.72 * alpha });
    }
    if (visual.presentation.kind === 'swimlane') drawSwimlaneGlyph(this.graphics, matrix, visual);
  }

  private createLabel(node: SceneNode, visual: PixiContainerNodeVisual, style: NodeStyle): Container {
    const content = new Container();
    content.alpha = style.opacity;
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
