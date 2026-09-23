import { Container, Graphics } from 'pixi.js';
import type { SceneNode, ScenePage } from '../../domain/document/types';
import type { SceneIndex } from '../../domain/scene/types';
import type { TransformResult } from '../../domain/transforms/types';
import { buildNodeWorldMatrices } from '../../domain/scene/worldGeometry';
import { getDescendantNodeIds } from '../../domain/scene/queries';
import { PixiContainerRenderer } from './PixiContainerRenderer';
import { PixiNodeRenderer } from './PixiNodeRenderer';
import { PixiConnectorRenderer } from './PixiConnectorRenderer';
import { drawTransformFrame } from './PixiTransformOverlay';

/** Transient selected objects only. Never writes or validates the document. */
export class PixiLiveTransformPreview {
  readonly container = new Container();
  private readonly containers = new PixiContainerRenderer();
  private readonly nodes = new PixiNodeRenderer();
  private readonly connectors = new PixiConnectorRenderer();
  private readonly frame = new Graphics();
  private sourcePage: ScenePage | null = null;
  private selectedIds: readonly string[] = [];
  private contextPage: ScenePage | null = null;

  private context(page: ScenePage, index: SceneIndex, nodes: readonly SceneNode[]): ScenePage {
    if (this.sourcePage === page && this.contextPage && nodes.length === this.selectedIds.length
      && nodes.every((node, i) => node.id === this.selectedIds[i])) return this.contextPage;
    const ids = new Set(nodes.flatMap((node) => [node.id, ...getDescendantNodeIds(index, node.id)]));
    const connectors = page.connectors.filter((edge) =>
      ids.has(edge.source.nodeId ?? '') || ids.has(edge.target.nodeId ?? ''));
    const contextNodes = new Map<string, SceneNode>();
    function include(id: string | null): void {
      if (!id || contextNodes.has(id)) return;
      const node = index.nodesById.get(id);
      if (!node) return;
      contextNodes.set(id, node);
      include(node.parentId);
    }
    ids.forEach(include);
    for (const edge of connectors) { include(edge.source.nodeId); include(edge.target.nodeId); }
    this.sourcePage = page;
    this.selectedIds = nodes.map((node) => node.id);
    this.contextPage = { ...page, nodes: [...contextNodes.values()], connectors };
    return this.contextPage;
  }

  constructor() {
    this.container.addChild(this.containers.graphics, this.connectors.container, this.nodes.graphics,
      this.nodes.media, this.nodes.labels, this.containers.labels, this.frame);
    this.container.visible = false;
  }

  draw(page: ScenePage, index: SceneIndex, result: TransformResult, zoom: number, canvasColor: number): void {
    const replacements = new Map(result.nodes.map((node) => [node.id, node]));
    const context = this.context(page, index, result.nodes);
    const preview = { ...context, nodes: context.nodes.map((node) => replacements.get(node.id) ?? node) };
    const matrices = buildNodeWorldMatrices(preview);
    // Members of a moved group ride along: same local transform, new parent matrix.
    const carried = new Set(result.nodes.flatMap((node) => [node.id, ...getDescendantNodeIds(index, node.id)]));
    const selectedPage = { ...preview, nodes: preview.nodes.filter((node) => carried.has(node.id)) };
    const previewIndex = { ...index, worldMatricesByNodeId: matrices };
    this.containers.draw(selectedPage, previewIndex, null, canvasColor);
    this.nodes.draw(selectedPage, previewIndex, null, 'full', canvasColor);
    this.connectors.setZoom(zoom);
    this.connectors.draw(preview, true);
    this.frame.clear();
    drawTransformFrame(this.frame, result.bounds, zoom);
    this.container.visible = true;
  }

  clear(): void {
    this.container.visible = false;
  }
}
