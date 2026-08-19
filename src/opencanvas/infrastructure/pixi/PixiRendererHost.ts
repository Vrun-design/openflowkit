import { Application, Container, Graphics } from 'pixi.js';
import { screenToWorld, visibleWorldBounds, worldToScreen } from '../../domain/camera/camera';
import type { CanvasCamera } from '../../domain/camera/types';
import { createBounds2d, unionBounds } from '../../domain/geometry/bounds';
import type { Bounds2d, Point2d, Size2d } from '../../domain/geometry/types';
import type { SceneConnector, ScenePage } from '../../domain/document/types';
import {
  connectorEditHandles,
  pickConnectorAtPoint,
  pickConnectorEditHandle as pickEditHandle,
  type ConnectorEditHandle,
} from '../../domain/connectors/editing';
import { querySceneBounds } from '../../domain/scene/queries';
import { createSceneIndex } from '../../domain/scene/spatialIndex';
import { nodeWorldBounds } from '../../domain/scene/worldGeometry';
import type { TransformHandle, TransformResult } from '../../domain/transforms/types';
import { pickTransformHandle as pickHandle, PixiTransformOverlay } from './PixiTransformOverlay';
import { PixiConnectorRenderer } from './PixiConnectorRenderer';
import { PixiContainerRenderer } from './PixiContainerRenderer';
import { PixiConnectorEditOverlay } from './PixiConnectorEditOverlay';
import {
  inspectConnectorEdit,
  inspectConnectorHandleScreenPoints,
  inspectConnectorSamples,
  type ConnectorEditDebugSnapshot,
  type ConnectorHandleScreenPoint,
} from './PixiConnectorInspection';
import { PixiNodeRenderer } from './PixiNodeRenderer';
import { PixiSelectionOverlay, selectionWorldBounds } from './PixiSelectionOverlay';
import { shouldRedrawNodes } from './sceneInvalidation';

export type PixiRendererStatus =
  | 'unavailable'
  | 'initializing'
  | 'ready'
  | 'context-lost'
  | 'destroyed';

export interface PixiRenderDiagnostics {
  readonly renderCount: number;
  readonly renderRequests: number;
  readonly coalescedRequests: number;
  readonly lastRenderDurationMs: number;
  readonly nodeCount: number;
  readonly connectorCount: number;
  readonly pendingFrame: boolean;
  readonly continuousTickerRunning: boolean;
}

interface PixiRendererHostOptions {
  readonly onStatusChange?: (status: PixiRendererStatus) => void;
  readonly connectorModelEnabled?: boolean;
  readonly nodeLayoutModelEnabled?: boolean;
  readonly basicNodesEnabled?: boolean;
  readonly freeformNodesEnabled?: boolean;
  readonly architectureNodesEnabled?: boolean;
  readonly containerNodesEnabled?: boolean;
  readonly classEntityNodesEnabled?: boolean;
  readonly mindmapJourneyNodesEnabled?: boolean;
  readonly sequenceNodesEnabled?: boolean;
  readonly wireframeNodesEnabled?: boolean;
}

const SELECTION_STROKE = 0xe95420;
const MARQUEE_FILL = 0xe95420;
const LABEL_DETAIL_ZOOM = 0.55;
// Pixi 8 CanvasText can throw while returning pooled textures during stage-tree
// destruction across overlapping React StrictMode lifecycles. The renderer owns
// and releases GPU resources; display children can be reclaimed with the host.
export const PIXI_HOST_STAGE_DESTROY_OPTIONS = { children: false } as const;

function abandonInitializedApplication(app: Application): void {
  app.stop();
  const canvas = app.canvas as HTMLCanvasElement;
  const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
  context?.getExtension('WEBGL_lose_context')?.loseContext();
  canvas.remove();
}

export class PixiRendererHost {
  private readonly app = new Application();
  private readonly world = new Container();
  private readonly precisionGrid = new Graphics();
  private readonly connectorRenderer = new PixiConnectorRenderer();
  private readonly containerRenderer = new PixiContainerRenderer();
  private readonly connectorEditOverlay = new PixiConnectorEditOverlay();
  private readonly nodeRenderer = new PixiNodeRenderer(() => this.requestRender());
  private readonly selectionOverlay = new PixiSelectionOverlay();
  private readonly transformOverlay = new PixiTransformOverlay();
  private readonly marquee = new Graphics();
  private readonly onStatusChange?: PixiRendererHostOptions['onStatusChange'];
  private readonly connectorModelEnabled: boolean;
  private readonly nodeLayoutModelEnabled: boolean;
  private readonly basicNodesEnabled: boolean;
  private readonly freeformNodesEnabled: boolean;
  private readonly architectureNodesEnabled: boolean;
  private readonly containerNodesEnabled: boolean;
  private readonly classEntityNodesEnabled: boolean;
  private readonly mindmapJourneyNodesEnabled: boolean;
  private readonly sequenceNodesEnabled: boolean;
  private readonly wireframeNodesEnabled: boolean;
  private camera: CanvasCamera = { x: 64, y: 64, zoom: 1 };
  private page: ScenePage | null = null;
  private index: ReturnType<typeof createSceneIndex> | null = null;
  private selectedNodeIds: readonly string[] = [];
  private primaryNodeId: string | null = null;
  private selectedConnectorId: string | null = null;
  private activeConnectorHandle: ConnectorEditHandle | null = null;
  private destroyed = false;
  private renderFrame: number | null = null;
  private renderCount = 0;
  private renderRequests = 0;
  private coalescedRequests = 0;
  private lastRenderDurationMs = 0;

  constructor(options: PixiRendererHostOptions = {}) {
    this.onStatusChange = options.onStatusChange;
    this.connectorModelEnabled = options.connectorModelEnabled === true;
    this.nodeLayoutModelEnabled = options.nodeLayoutModelEnabled === true;
    this.basicNodesEnabled = options.basicNodesEnabled === true;
    this.freeformNodesEnabled = options.freeformNodesEnabled === true;
    this.architectureNodesEnabled = options.architectureNodesEnabled === true;
    this.containerNodesEnabled = options.containerNodesEnabled === true;
    this.classEntityNodesEnabled = options.classEntityNodesEnabled === true;
    this.mindmapJourneyNodesEnabled = options.mindmapJourneyNodesEnabled === true;
    this.sequenceNodesEnabled = options.sequenceNodesEnabled === true;
    this.wireframeNodesEnabled = options.wireframeNodesEnabled === true;
  }

  async mount(container: HTMLElement): Promise<HTMLCanvasElement> {
    this.emitStatus('initializing');
    await this.app.init({
      preference: 'webgl',
      preferWebGLVersion: 2,
      autoStart: false,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      powerPreference: 'high-performance',
      backgroundColor: 0xf8fafc,
      resizeTo: container,
    });
    if (this.destroyed) {
      // React StrictMode can start the replacement host before this async init
      // resolves. Pixi renderer destruction here tears down shared CanvasText
      // pools used by that live host, so release only this abandoned GL context.
      abandonInitializedApplication(this.app);
      throw new Error('Pixi renderer was destroyed during initialization.');
    }

    this.world.addChild(
      this.precisionGrid,
      this.containerRenderer.graphics,
      this.connectorRenderer.container,
      this.nodeRenderer.graphics,
      this.nodeRenderer.media,
      this.nodeRenderer.labels,
      this.containerRenderer.labels,
      this.selectionOverlay.graphics,
      this.transformOverlay.graphics,
      this.connectorEditOverlay.graphics
    );
    this.app.stage.addChild(this.world, this.marquee);
    const canvas = this.app.canvas as HTMLCanvasElement;
    canvas.className = 'pixi-spike__canvas';
    canvas.setAttribute('aria-label', 'PixiJS OpenCanvas renderer spike');
    canvas.addEventListener('webglcontextlost', this.handleContextLost);
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
    container.appendChild(canvas);
    this.applyCamera();
    this.emitStatus('ready');
    return canvas;
  }

  setPage(page: ScenePage): void {
    const redrawNodes = shouldRedrawNodes(this.page, page);
    this.page = page;
    this.index = createSceneIndex(page);
    this.selectedNodeIds = [];
    this.primaryNodeId = null;
    this.selectedConnectorId = null;
    this.activeConnectorHandle = null;
    this.rebuildScene(redrawNodes);
  }

  setCamera(camera: CanvasCamera): void {
    this.camera = camera;
    this.applyCamera();
    this.connectorRenderer.setZoom(camera.zoom);
    this.drawConnectorEditOverlay();
    this.updateLabelVisibility();
    this.requestRender();
  }

  getConnectorDebugSnapshot(): ReturnType<PixiConnectorRenderer['getDebugSnapshot']> {
    return this.connectorRenderer.getDebugSnapshot();
  }

  getNodeDebugSnapshot(): ReturnType<PixiNodeRenderer['getDebugSnapshot']> {
    const recordsById = new Map(
      [...this.nodeRenderer.getDebugSnapshot(), ...this.containerRenderer.getDebugSnapshot()].map(
        (record) => [record.id, record]
      )
    );
    return (
      this.page?.nodes.flatMap((node) => {
        const record = recordsById.get(node.id);
        return record ? [record] : [];
      }) ?? []
    );
  }

  getConnectorSamples(connectorId: string): readonly Point2d[] | null {
    return inspectConnectorSamples(this.page, connectorId);
  }

  getConnectorEditDebugSnapshot(): ConnectorEditDebugSnapshot {
    return inspectConnectorEdit(this.page, this.selectedConnectorId, this.activeConnectorHandle);
  }

  getConnectorHandleScreenPoints(): readonly ConnectorHandleScreenPoint[] {
    return inspectConnectorHandleScreenPoints(this.page, this.selectedConnectorId, this.camera);
  }

  screenToWorld(point: Point2d): Point2d {
    return screenToWorld(this.camera, point);
  }

  pickNode(screenPoint: Point2d): string | null {
    if (!this.index) return null;
    const point = this.screenToWorld(screenPoint);
    const hits = querySceneBounds(this.index, createBounds2d(point.x, point.y, 0, 0), {
      kinds: new Set(['node']),
    });
    return [...hits].reverse().find((hit) => {
      const layer = this.page?.layers.find((candidate) => candidate.id === hit.layerId);
      return layer?.locked === false;
    })?.id ?? null;
  }

  pickConnector(screenPoint: Point2d): string | null {
    if (!this.page || !this.connectorModelEnabled) return null;
    const unlockedLayerIds = new Set(
      this.page.layers.filter((layer) => layer.visible && !layer.locked).map((layer) => layer.id)
    );
    const nodesById = new Map(this.page.nodes.map((node) => [node.id, node]));
    const editablePage = {
      ...this.page,
      connectors: this.page.connectors.filter((connector) => {
        const source = nodesById.get(connector.source.nodeId);
        const target = nodesById.get(connector.target.nodeId);
        return Boolean(source && target && unlockedLayerIds.has(source.layerId) && unlockedLayerIds.has(target.layerId));
      }),
    };
    return pickConnectorAtPoint(editablePage, this.screenToWorld(screenPoint), 10 / this.camera.zoom);
  }

  pickConnectorHandle(screenPoint: Point2d): ConnectorEditHandle | null {
    const connector = this.getSelectedConnector();
    if (!this.page || !connector) return null;
    return pickEditHandle(
      connectorEditHandles(this.page, connector),
      this.screenToWorld(screenPoint),
      9 / this.camera.zoom
    );
  }

  setConnectorSelection(
    connectorId: string | null,
    handle: ConnectorEditHandle | null = null
  ): void {
    this.selectedConnectorId = connectorId;
    this.activeConnectorHandle = handle;
    this.drawConnectorEditOverlay();
    this.requestRender();
  }

  setConnectorPreview(connector: SceneConnector | null): void {
    if (!this.page) return;
    if (!connector) {
      this.drawConnectorEditOverlay();
    } else {
      const previewPage = {
        ...this.page,
        connectors: this.page.connectors.map((item) =>
          item.id === connector.id ? connector : item
        ),
      };
      this.connectorEditOverlay.draw(
        previewPage,
        connector,
        this.camera.zoom,
        this.activeConnectorHandle
      );
    }
    this.requestRender();
  }

  setSelection(nodeIds: readonly string[], primaryNodeId: string | null): void {
    this.selectedNodeIds = nodeIds;
    this.primaryNodeId = primaryNodeId;
    this.drawSelection();
    this.drawConnectorEditOverlay();
    this.requestRender();
  }

  getSelectionWorldBounds(): Bounds2d | null {
    if (!this.index) return null;
    return selectionWorldBounds(this.index, this.selectedNodeIds);
  }

  pickTransformHandle(screenPoint: Point2d): TransformHandle | null {
    const bounds = this.getSelectionWorldBounds();
    return bounds ? pickHandle(bounds, screenPoint, this.camera) : null;
  }

  setTransformPreview(result: TransformResult | null): void {
    if (!result || !this.page) this.transformOverlay.clear();
    else
      this.transformOverlay.draw(
        this.page,
        result.nodes,
        result.bounds,
        this.camera,
        result.snappedX,
        result.snappedY
      );
    this.selectionOverlay.graphics.visible = result === null;
    this.requestRender();
  }

  pickNodesInScreenBounds(screenBounds: Bounds2d): readonly string[] {
    if (!this.index) return [];
    const topLeft = this.screenToWorld(screenBounds);
    const bottomRight = this.screenToWorld({
      x: screenBounds.x + screenBounds.width,
      y: screenBounds.y + screenBounds.height,
    });
    const worldBounds = createBounds2d(
      Math.min(topLeft.x, bottomRight.x),
      Math.min(topLeft.y, bottomRight.y),
      Math.abs(bottomRight.x - topLeft.x),
      Math.abs(bottomRight.y - topLeft.y)
    );
    return querySceneBounds(this.index, worldBounds, { kinds: new Set(['node']) }).map(
      (object) => object.id
    );
  }

  setMarquee(screenBounds: Bounds2d | null): void {
    this.marquee.clear();
    if (screenBounds) {
      this.marquee
        .rect(screenBounds.x, screenBounds.y, screenBounds.width, screenBounds.height)
        .fill({ color: MARQUEE_FILL, alpha: 0.08 })
        .stroke({ color: SELECTION_STROKE, alpha: 0.8, width: 1 });
    }
    this.requestRender();
  }

  getViewportSize(): Size2d {
    if (!this.app.renderer) return { width: 0, height: 0 };
    return { width: this.app.screen.width, height: this.app.screen.height };
  }

  getContentBounds(): Bounds2d | null {
    if (!this.index) return null;
    const nodeBounds = [...this.index.objectsByKey.values()]
      .filter((object) => object.kind === 'node' || object.kind === 'container')
      .map((object) => object.bounds);
    return nodeBounds.reduce<Bounds2d | null>(
      (combined, bounds) => (combined ? unionBounds(combined, bounds) : bounds),
      null
    );
  }

  getNodeScreenBounds(nodeId: string): DOMRect | null {
    if (!this.page || !this.index) return null;
    const node = this.index.nodesById.get(nodeId);
    const matrix = this.index.worldMatricesByNodeId.get(nodeId);
    if (!node || !matrix) return null;
    const bounds = nodeWorldBounds(node, matrix);
    const topLeft = worldToScreen(this.camera, bounds);
    return new DOMRect(
      topLeft.x,
      topLeft.y,
      bounds.width * this.camera.zoom,
      bounds.height * this.camera.zoom
    );
  }

  resize(): void {
    if (this.destroyed || !this.app.renderer) return;
    this.app.resize();
    this.updateLabelVisibility();
    this.requestRender();
  }

  renderNow(): void {
    if (this.destroyed || !this.app.renderer) return;
    const startedAt = performance.now();
    this.app.render();
    this.lastRenderDurationMs = performance.now() - startedAt;
    this.renderCount += 1;
  }

  getRenderDiagnostics(): PixiRenderDiagnostics {
    return { renderCount: this.renderCount, renderRequests: this.renderRequests,
      coalescedRequests: this.coalescedRequests, lastRenderDurationMs: this.lastRenderDurationMs,
      nodeCount: this.page?.nodes.length ?? 0, connectorCount: this.page?.connectors.length ?? 0,
      pendingFrame: this.renderFrame !== null, continuousTickerRunning: this.app.ticker.started };
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.renderFrame !== null) cancelAnimationFrame(this.renderFrame);
    if (this.app.renderer) {
      const canvas = this.app.canvas as HTMLCanvasElement;
      canvas.removeEventListener('webglcontextlost', this.handleContextLost);
      canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
      this.app.destroy(true, PIXI_HOST_STAGE_DESTROY_OPTIONS);
    }
    this.emitStatus('destroyed');
  }

  private rebuildScene(redrawNodes = true): void {
    if (!this.page || !this.index) return;
    this.drawPrecisionGrid();
    this.connectorRenderer.draw(this.page, this.connectorModelEnabled);
    if (redrawNodes) {
      this.containerRenderer.draw(this.page, this.index, this.containerNodesEnabled);
      this.nodeRenderer.draw(
        this.page,
        this.index,
        this.nodeLayoutModelEnabled,
        this.basicNodesEnabled,
        this.freeformNodesEnabled,
        this.architectureNodesEnabled,
        this.containerNodesEnabled,
        this.classEntityNodesEnabled,
        this.mindmapJourneyNodesEnabled,
        this.sequenceNodesEnabled,
        this.wireframeNodesEnabled
      );
    }
    this.updateLabelVisibility();
    this.drawSelection();
    this.requestRender();
  }

  private drawPrecisionGrid(): void {
    this.precisionGrid.clear();
    if (!this.page) return;
    const raw = this.page.extensions.openCanvasPrecision;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return;
    const settings = raw as Record<string, unknown>;
    const gridSize = typeof settings.gridSize === 'number' && Number.isFinite(settings.gridSize)
      ? Math.min(1000, Math.max(1, settings.gridSize)) : 20;
    const bounds = this.getContentBounds() ?? createBounds2d(0, 0, 1000, 1000);
    const left = Math.floor((bounds.x - 500) / gridSize) * gridSize;
    const top = Math.floor((bounds.y - 500) / gridSize) * gridSize;
    const right = bounds.x + bounds.width + 500;
    const bottom = bounds.y + bounds.height + 500;
    if (settings.gridEnabled === true) {
      for (let x = left; x <= right; x += gridSize) this.precisionGrid.moveTo(x, top).lineTo(x, bottom);
      for (let y = top; y <= bottom; y += gridSize) this.precisionGrid.moveTo(left, y).lineTo(right, y);
      this.precisionGrid.stroke({ color: 0xcbd5e1, width: 1, alpha: 0.35 });
    }
    const guides = Array.isArray(settings.guides) ? settings.guides : [];
    for (const guide of guides) {
      if (!guide || typeof guide !== 'object' || Array.isArray(guide)) continue;
      if (guide.axis === 'x' && typeof guide.position === 'number') {
        this.precisionGrid.moveTo(guide.position, top).lineTo(guide.position, bottom);
      } else if (guide.axis === 'y' && typeof guide.position === 'number') {
        this.precisionGrid.moveTo(left, guide.position).lineTo(right, guide.position);
      }
    }
    if (guides.length > 0) this.precisionGrid.stroke({ color: 0x2563eb, width: 1, alpha: 0.8 });
  }

  private drawSelection(): void {
    if (!this.index) return;
    this.selectionOverlay.draw(
      this.index,
      this.selectedNodeIds,
      this.primaryNodeId,
      this.camera.zoom
    );
  }

  private getSelectedConnector(): SceneConnector | null {
    return (
      this.page?.connectors.find((connector) => connector.id === this.selectedConnectorId) ?? null
    );
  }

  private drawConnectorEditOverlay(): void {
    const connector = this.getSelectedConnector();
    if (!this.page || !connector) {
      this.connectorEditOverlay.clear();
      return;
    }
    this.connectorEditOverlay.draw(
      this.page,
      connector,
      this.camera.zoom,
      this.activeConnectorHandle
    );
  }

  private applyCamera(): void {
    this.world.position.set(this.camera.x, this.camera.y);
    this.world.scale.set(this.camera.zoom);
  }

  private updateLabelVisibility(): void {
    if (!this.index || !this.app.renderer) return;
    if (this.camera.zoom < LABEL_DETAIL_ZOOM) {
      this.nodeRenderer.setLabelVisibility(null);
      return;
    }
    const visibleIds = new Set(
      querySceneBounds(this.index, visibleWorldBounds(this.camera, this.getViewportSize()), {
        kinds: new Set(['node', 'container']),
      }).map((object) => object.id)
    );
    this.nodeRenderer.setLabelVisibility(visibleIds);
    this.containerRenderer.setLabelVisibility(visibleIds);
  }

  private requestRender(): void {
    if (this.destroyed) return;
    this.renderRequests += 1;
    if (this.renderFrame !== null) {
      this.coalescedRequests += 1;
      return;
    }
    this.renderFrame = requestAnimationFrame(() => {
      this.renderFrame = null;
      this.renderNow();
    });
  }

  private readonly handleContextLost = (event: Event): void => {
    event.preventDefault();
    this.emitStatus('context-lost');
  };

  private readonly handleContextRestored = (): void => {
    this.emitStatus('ready');
    this.requestRender();
  };

  private emitStatus(status: PixiRendererStatus): void {
    this.onStatusChange?.(status);
  }
}
