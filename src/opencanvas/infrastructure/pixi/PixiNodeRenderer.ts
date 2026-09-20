import { pixiPaintColor } from './pixiColor';
import { resolveNodeStroke } from '../../domain/nodes/nodeStroke';
import { basicNodeOutlinePoints } from '../../domain/nodes/basicNodeOutline';
import { drawDashedPath } from './PixiConnectorRenderer';
import { buildNodeStateMap } from '../../domain/scene/nodeState';
import { Container, Graphics, Text } from 'pixi.js';
import { applyMatrixToPoint } from '../../domain/geometry/matrix';
import type { SceneNode, ScenePage } from '../../domain/document/types';
import type { SceneIndex } from '../../domain/scene/types';
import { layoutNodeContent, resolveNodeContentLayout } from '../../domain/node-layout/model';
import type { Bounds2d } from '../../domain/geometry/types';
import { nodeWorldBounds } from '../../domain/scene/worldGeometry';
import { projectBasicNodeVisual } from './basicNodeVisual';
import { PixiArchitectureNodeRenderer } from './PixiArchitectureNodeRenderer';
import { PixiClassEntityNodeRenderer } from './PixiClassEntityNodeRenderer';
import { PixiFreeformNodeRenderer } from './PixiFreeformNodeRenderer';
import { PixiJourneyNodeRenderer } from './PixiJourneyNodeRenderer';
import { PixiMindmapNodeRenderer } from './PixiMindmapNodeRenderer';
import { PixiSequenceNodeRenderer } from './PixiSequenceNodeRenderer';
import { PixiWireframeNodeRenderer } from './PixiWireframeNodeRenderer';
import { drawPixiNodeOutline } from './pixiNodeOutline';
import type { PixiNodeDebugRecord } from './pixiNodeDebug';
import { isContainerNodeKind } from '../../domain/nodes/containerNodePresentation';
import { resolveNodeSizingPolicy } from '../../domain/node-sizing/model';
import { measurePortableText } from '../../domain/text/measurement';
import type { SemanticDetailLevel } from './viewportProjection';

const NODE_FILL = 0xffffff;
const NODE_STROKE = 0xcbd5e1;
const ICON_FILL = 0xfef4f0;
const ICON_STROKE = 0xe95420;
const DETAILED_OUTLINE_NODE_LIMIT = 1_000;

export type { PixiNodeDebugRecord } from './pixiNodeDebug';

function textPosition(bounds: Bounds2d, alignment: 'start' | 'center' | 'end'): number {
  if (alignment === 'start') return bounds.x;
  if (alignment === 'end') return bounds.x + bounds.width;
  return bounds.x + bounds.width / 2;
}

function textAnchor(alignment: 'start' | 'center' | 'end'): number {
  if (alignment === 'start') return 0;
  if (alignment === 'end') return 1;
  return 0.5;
}

function textKey(text: string, fontSize: unknown, fontWeight: unknown, fill: unknown): string {
  return `${String(fontSize)}|${String(fontWeight)}|${String(fill)}|${text}`;
}

function nodeOpacity(node: SceneNode): number {
  const value = node.appearance.opacity;
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 1;
}

export class PixiNodeRenderer {
  readonly graphics = new Graphics();
  readonly media = new Container();
  readonly labels = new Container();
  private readonly labelByNodeId = new Map<string, Container>();
  // Label Text objects rasterize to a texture on creation (~0.5–1 ms each), so
  // a redraw reuses last frame's instances with the same text and style
  // instead of destroying and re-creating every label.
  private textPool = new Map<string, Text[]>();
  private readonly textKeys = new WeakMap<Text, string>();
  private readonly freeformRenderer: PixiFreeformNodeRenderer;
  private readonly architectureRenderer: PixiArchitectureNodeRenderer;
  private readonly classEntityRenderer = new PixiClassEntityNodeRenderer();
  private readonly mindmapRenderer = new PixiMindmapNodeRenderer();
  private readonly journeyRenderer = new PixiJourneyNodeRenderer();
  private readonly sequenceRenderer = new PixiSequenceNodeRenderer();
  private readonly wireframeRenderer: PixiWireframeNodeRenderer;
  private debugRecords: readonly PixiNodeDebugRecord[] = [];

  constructor(onMediaReady: () => void = () => undefined) {
    this.freeformRenderer = new PixiFreeformNodeRenderer((nodeId) => {
      this.debugRecords = this.debugRecords.map((record) =>
        record.id === nodeId ? { ...record, mediaState: 'loaded' } : record
      );
      const label = this.labelByNodeId.get(nodeId);
      if (label) label.visible = false;
      onMediaReady();
    });
    this.architectureRenderer = new PixiArchitectureNodeRenderer((nodeId) => {
      this.debugRecords = this.debugRecords.map((record) =>
        record.id === nodeId ? { ...record, mediaState: 'loaded' } : record
      );
      onMediaReady();
    });
    this.wireframeRenderer = new PixiWireframeNodeRenderer((nodeId) => {
      this.debugRecords = this.debugRecords.map((record) =>
        record.id === nodeId ? { ...record, mediaState: 'loaded' } : record
      );
      onMediaReady();
    });
    this.media.addChild(
      this.freeformRenderer.media,
      this.architectureRenderer.media,
      this.wireframeRenderer.media
    );
  }

  draw(
    page: ScenePage,
    index: SceneIndex,
    nodeLayoutEnabled: boolean,
    basicNodesEnabled: boolean,
    freeformNodesEnabled: boolean,
    architectureNodesEnabled: boolean,
    containerNodesEnabled: boolean,
    classEntityNodesEnabled: boolean,
    mindmapJourneyNodesEnabled: boolean,
    sequenceNodesEnabled: boolean,
    wireframeNodesEnabled: boolean,
    renderedNodeIds: ReadonlySet<string> | null = null,
    detailLevel: SemanticDetailLevel = 'full'
  ): void {
    this.graphics.clear();
    this.textPool = new Map();
    for (const content of this.labels.removeChildren()) {
      for (const child of [...content.children]) {
        if (!(child instanceof Text)) continue;
        child.removeFromParent();
        const key = this.textKeys.get(child);
        if (key === undefined) { child.destroy(); continue; }
        this.textPool.set(key, [...(this.textPool.get(key) ?? []), child]);
      }
      content.destroy({ children: true });
    }
    const freeformMediaGeneration = this.freeformRenderer.beginDraw();
    const architectureMediaGeneration = this.architectureRenderer.beginDraw();
    const wireframeMediaGeneration = this.wireframeRenderer.beginDraw();
    this.mindmapRenderer.beginDraw(page.nodes);
    this.labelByNodeId.clear();
    const debugRecords: PixiNodeDebugRecord[] = [];
    const nodeStates = buildNodeStateMap(page);
    for (const node of page.nodes) {
      if (!nodeStates.get(node.id)?.visible) continue;
      if (renderedNodeIds && !renderedNodeIds.has(node.id)) continue;
      if (containerNodesEnabled && isContainerNodeKind(node.kind)) continue;
      const matrix = index.worldMatricesByNodeId.get(node.id);
      if (!matrix) continue;
      const showFamilyDetail = detailLevel !== 'overview';
      const architecture = showFamilyDetail && architectureNodesEnabled
        ? this.architectureRenderer.drawNode(
            node,
            matrix,
            this.graphics,
            architectureMediaGeneration
          )
        : null;
      const classEntity =
        !architecture && showFamilyDetail && classEntityNodesEnabled
          ? this.classEntityRenderer.drawNode(node, matrix, this.graphics)
          : null;
      const mindmap =
        !architecture && !classEntity && showFamilyDetail && mindmapJourneyNodesEnabled
          ? this.mindmapRenderer.drawNode(node, matrix, this.graphics)
          : null;
      const journey =
        !architecture && !classEntity && !mindmap && showFamilyDetail && mindmapJourneyNodesEnabled
          ? this.journeyRenderer.drawNode(node, matrix, this.graphics)
          : null;
      const sequence =
        !architecture && !classEntity && !mindmap && !journey && showFamilyDetail && sequenceNodesEnabled
          ? this.sequenceRenderer.drawNode(node, matrix, this.graphics)
          : null;
      const wireframe =
        !architecture && !classEntity && !mindmap && !journey && !sequence && showFamilyDetail && wireframeNodesEnabled
          ? this.wireframeRenderer.drawNode(node, matrix, this.graphics, wireframeMediaGeneration)
          : null;
      const freeform =
        !architecture &&
        !classEntity &&
        !mindmap &&
        !journey &&
        !sequence &&
        !wireframe &&
        showFamilyDetail && freeformNodesEnabled
          ? this.freeformRenderer.drawNode(node, matrix, this.graphics, freeformMediaGeneration)
          : null;
      const visual =
        !architecture &&
        !classEntity &&
        !mindmap &&
        !journey &&
        !sequence &&
        !wireframe &&
        !freeform &&
        basicNodesEnabled
          ? projectBasicNodeVisual(node)
          : null;
      if (architecture) {
        this.labels.addChild(architecture.label);
        this.labelByNodeId.set(node.id, architecture.label);
        debugRecords.push(architecture.debug);
        continue;
      }
      if (classEntity) {
        this.labels.addChild(classEntity.label);
        this.labelByNodeId.set(node.id, classEntity.label);
        debugRecords.push(classEntity.debug);
        continue;
      }
      if (mindmap) {
        this.labels.addChild(mindmap.label);
        this.labelByNodeId.set(node.id, mindmap.label);
        debugRecords.push(mindmap.debug);
        continue;
      }
      if (journey) {
        this.labels.addChild(journey.label);
        this.labelByNodeId.set(node.id, journey.label);
        debugRecords.push(journey.debug);
        continue;
      }
      if (sequence) {
        this.labels.addChild(sequence.label);
        this.labelByNodeId.set(node.id, sequence.label);
        debugRecords.push(sequence.debug);
        continue;
      }
      if (wireframe) {
        this.labels.addChild(wireframe.label);
        this.labelByNodeId.set(node.id, wireframe.label);
        debugRecords.push(wireframe.debug);
        continue;
      }
      if (freeform) {
        this.labels.addChild(freeform.label);
        this.labelByNodeId.set(node.id, freeform.label);
        debugRecords.push(freeform.debug);
        continue;
      }
      const shape = visual?.shape ?? 'rectangle';
      const renderedShape =
        page.nodes.length > DETAILED_OUTLINE_NODE_LIMIT && shape === 'rounded'
          ? 'rectangle'
          : shape;
      const fillPaint = pixiPaintColor(typeof node.appearance.fill === 'string' ? node.appearance.fill : '', visual?.fill ?? NODE_FILL);
      const strokePaint = pixiPaintColor(typeof node.appearance.stroke === 'string' ? node.appearance.stroke : '', visual?.stroke ?? NODE_STROKE);
      const fill = fillPaint.color;
      const stroke = strokePaint.color;
      const strokeStyle = resolveNodeStroke(node);
      // ponytail: opacity honoured for basic shapes only; family renderers
      // draw into the shared graphics and would each need an alpha argument.
      const alpha = nodeOpacity(node);
      drawPixiNodeOutline(this.graphics, renderedShape, node.size, matrix,
        typeof node.content.customSvgPath === 'string' ? node.content.customSvgPath : undefined);
      this.graphics.fill({ color: fill, alpha: alpha * fillPaint.alpha });
      if (strokeStyle.width > 0 && strokeStyle.dash.length) {
        const outline = basicNodeOutlinePoints(renderedShape, node.size,
          typeof node.content.customSvgPath === 'string' ? node.content.customSvgPath : undefined)
          .map((point) => applyMatrixToPoint(matrix, point));
        drawDashedPath(this.graphics, [...outline, outline[0]], {
          color: `#${stroke.toString(16).padStart(6, '0')}`, width: strokeStyle.width,
          opacity: alpha * strokePaint.alpha, dash: strokeStyle.dash,
        });
      } else if (strokeStyle.width > 0) {
        this.graphics.stroke({ color: stroke, width: strokeStyle.width, alpha: alpha * strokePaint.alpha });
      }
      debugRecords.push({
        id: node.id,
        kind: visual?.kind ?? node.kind,
        shape,
        fill,
        stroke,
        mediaState: 'none',
      });
      if (detailLevel === 'overview') continue;
      const labelText = typeof node.content.label === 'string' ? node.content.label : node.id;
      const sizing = resolveNodeSizingPolicy(node);
      const layout = resolveNodeContentLayout(node.content, nodeLayoutEnabled);
      const availableTextWidth = Math.max(1,
        node.size.width - layout.padding.left - layout.padding.right);
      const labelMeasurement = measurePortableText(labelText, {
        fontSize: 14, fontWeight: 600,
        ...(sizing.overflow === 'visible' ? {} : {
          maxWidth: availableTextWidth, maxLines: sizing.maxLines, overflow: sizing.overflow,
        }),
      });
      const label = this.acquireText(labelMeasurement.displayText, 14, '600', visual?.text ?? 0x1e293b);
      if (!nodeLayoutEnabled) {
        const bounds = nodeWorldBounds(node, matrix);
        label.position.set(bounds.x + 16, bounds.y + 25);
        const content = new Container();
        content.alpha = alpha;
        content.addChild(label);
        this.labels.addChild(content);
        this.labelByNodeId.set(node.id, content);
        continue;
      }
      const subLabel =
        typeof node.content.subLabel === 'string' && node.content.subLabel.length > 0
          ? this.acquireText(
              measurePortableText(node.content.subLabel, {
                fontSize: 11, fontWeight: 400,
                ...(sizing.overflow === 'visible' ? {} : {
                  maxWidth: availableTextWidth, maxLines: sizing.maxLines,
                  overflow: sizing.overflow,
                }),
              }).displayText,
              11, '400', visual?.subText ?? 0x64748b
            )
          : null;
      const hasIcon =
        (typeof node.content.icon === 'string' && node.content.icon !== 'none') ||
        typeof node.content.archIconShapeId === 'string';
      const geometry = layoutNodeContent(
        layout,
        {
          nodeSize: node.size,
          iconSize: hasIcon ? { width: 28, height: 28 } : null,
          labelSize: labelMeasurement,
          subLabelSize: subLabel ? measurePortableText(subLabel.text, {
            fontSize: 11, fontWeight: 400,
          }) : null,
        }
      );
      if (geometry.iconBounds) {
        const iconCorners = [
          { x: geometry.iconBounds.x, y: geometry.iconBounds.y },
          { x: geometry.iconBounds.x + geometry.iconBounds.width, y: geometry.iconBounds.y },
          {
            x: geometry.iconBounds.x + geometry.iconBounds.width,
            y: geometry.iconBounds.y + geometry.iconBounds.height,
          },
          { x: geometry.iconBounds.x, y: geometry.iconBounds.y + geometry.iconBounds.height },
        ].map((point) => applyMatrixToPoint(matrix, point));
        this.graphics
          .poly(iconCorners.flatMap((point) => [point.x, point.y]))
          .fill({ color: visual?.iconFill ?? ICON_FILL })
          .stroke({ color: visual?.iconStroke ?? ICON_STROKE, width: 1 });
      }
      const labelPoint = applyMatrixToPoint(matrix, {
        x: textPosition(geometry.labelBounds, geometry.labelAlignment),
        y: geometry.labelBounds.y,
      });
      label.anchor.set(textAnchor(geometry.labelAlignment), 0);
      label.position.set(labelPoint.x, labelPoint.y);
      const content = new Container();
      content.alpha = alpha;
      content.addChild(label);
      if (subLabel && geometry.subLabelBounds) {
        const subLabelPoint = applyMatrixToPoint(matrix, {
          x: textPosition(geometry.subLabelBounds, geometry.labelAlignment),
          y: geometry.subLabelBounds.y,
        });
        subLabel.anchor.set(textAnchor(geometry.labelAlignment), 0);
        subLabel.position.set(subLabelPoint.x, subLabelPoint.y);
        content.addChild(subLabel);
      }
      if (sizing.clipContent) {
        const corners = [
          { x: geometry.contentBounds.x, y: geometry.contentBounds.y },
          { x: geometry.contentBounds.x + geometry.contentBounds.width, y: geometry.contentBounds.y },
          { x: geometry.contentBounds.x + geometry.contentBounds.width,
            y: geometry.contentBounds.y + geometry.contentBounds.height },
          { x: geometry.contentBounds.x, y: geometry.contentBounds.y + geometry.contentBounds.height },
        ].map((point) => applyMatrixToPoint(matrix, point));
        const mask = new Graphics().poly(corners.flatMap((point) => [point.x, point.y])).fill(0xffffff);
        content.addChild(mask);
        content.mask = mask;
      }
      this.labels.addChild(content);
      this.labelByNodeId.set(node.id, content);
    }
    for (const leftovers of this.textPool.values()) leftovers.forEach((text) => text.destroy());
    this.textPool.clear();
    this.debugRecords = debugRecords;
  }

  private acquireText(text: string, fontSize: number, fontWeight: '400' | '600', fill: number | string): Text {
    const key = textKey(text, fontSize, fontWeight, fill);
    const cached = this.textPool.get(key)?.pop();
    if (cached) {
      cached.anchor.set(0, 0);
      return cached;
    }
    const created = new Text({
      text,
      style: { fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', fontSize, fontWeight, fill },
    });
    this.textKeys.set(created, key);
    return created;
  }

  getDebugSnapshot(): readonly PixiNodeDebugRecord[] {
    return this.debugRecords;
  }

  setLabelVisibility(visibleNodeIds: ReadonlySet<string> | null): void {
    this.labels.visible = visibleNodeIds !== null;
    if (!visibleNodeIds) return;
    for (const [nodeId, label] of this.labelByNodeId) {
      label.visible = visibleNodeIds.has(nodeId) && !this.freeformRenderer.isMediaLoaded(nodeId);
    }
  }
}
