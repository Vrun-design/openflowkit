import { Container, Graphics } from 'pixi.js';
import { createBounds2d } from '../../domain/geometry/bounds';
import type { SceneNode } from '../../domain/document/types';
import type { Matrix2d } from '../../domain/geometry/types';
import type { PixiNodeDebugRecord } from './pixiNodeDebug';
import { PixiMediaLayer } from './PixiMediaLayer';
import { applyPixiNodeMatrix } from './pixiNodeTransform';
import { createPixiText, truncateTextToWidth } from './pixiText';
import {
  BROWSER_HEADER_HEIGHT,
  drawBrowserWireframeContent,
  drawMobileWireframeContent,
  drawWireframeRect,
  MOBILE_HOME_HEIGHT,
  MOBILE_STATUS_HEIGHT,
} from './wireframeNodeDrawing';
import { projectWireframeNodeVisual, type PixiWireframeNodeVisual } from './wireframeNodeVisual';

export interface PixiWireframeNodeDrawResult {
  readonly label: Container;
  readonly debug: PixiNodeDebugRecord;
}

export class PixiWireframeNodeRenderer {
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

  drawNode(
    node: SceneNode,
    matrix: Matrix2d,
    graphics: Graphics,
    generation: number
  ): PixiWireframeNodeDrawResult | null {
    const visual = projectWireframeNodeVisual(node);
    if (!visual) return null;
    const isBrowser = visual.presentation.kind === 'browser';
    drawWireframeRect(
      graphics,
      matrix,
      { x: 0, y: 0, width: node.size.width, height: node.size.height },
      visual.fill,
      visual.stroke,
      isBrowser ? 10 : Math.min(28, node.size.width / 8)
    );
    if (isBrowser) this.drawBrowserChrome(node, matrix, graphics, visual);
    else this.drawMobileChrome(node, matrix, graphics, visual);
    this.drawContent(node, matrix, graphics, generation, visual, isBrowser);
    const label = this.createLabel(node, visual);
    applyPixiNodeMatrix(label, matrix);
    return { label, debug: this.createDebug(node, visual, isBrowser) };
  }

  private drawContent(
    node: SceneNode,
    matrix: Matrix2d,
    graphics: Graphics,
    generation: number,
    visual: PixiWireframeNodeVisual,
    isBrowser: boolean
  ): void {
    if (visual.presentation.imageUrl) {
      const top = isBrowser ? BROWSER_HEADER_HEIGHT : MOBILE_STATUS_HEIGHT;
      const bottom = isBrowser ? 0 : MOBILE_HOME_HEIGHT;
      this.mediaLayer.load({
        nodeId: node.id,
        generation,
        matrix,
        bounds: createBounds2d(
          0,
          top,
          node.size.width,
          Math.max(1, node.size.height - top - bottom)
        ),
        resolveUrl: async () => visual.presentation.imageUrl ?? null,
      });
      return;
    }
    if (isBrowser) drawBrowserWireframeContent(graphics, matrix, node, visual);
    else drawMobileWireframeContent(graphics, matrix, node, visual);
  }

  private drawBrowserChrome(
    node: SceneNode,
    matrix: Matrix2d,
    graphics: Graphics,
    visual: PixiWireframeNodeVisual
  ): void {
    drawWireframeRect(
      graphics,
      matrix,
      { x: 0, y: 0, width: node.size.width, height: BROWSER_HEADER_HEIGHT },
      visual.fill,
      visual.stroke,
      10
    );
    for (let index = 0; index < 3; index += 1) {
      drawWireframeRect(
        graphics,
        matrix,
        { x: 12 + index * 12, y: 14, width: 7, height: 7 },
        visual.accentFill,
        undefined,
        4
      );
    }
    drawWireframeRect(
      graphics,
      matrix,
      { x: 54, y: 8, width: Math.max(24, node.size.width - 66), height: 20 },
      visual.groundFill,
      visual.stroke,
      5
    );
  }

  private drawMobileChrome(
    node: SceneNode,
    matrix: Matrix2d,
    graphics: Graphics,
    visual: PixiWireframeNodeVisual
  ): void {
    drawWireframeRect(
      graphics,
      matrix,
      { x: 0, y: 0, width: node.size.width, height: MOBILE_STATUS_HEIGHT },
      visual.fill,
      undefined,
      20
    );
    drawWireframeRect(
      graphics,
      matrix,
      { x: node.size.width * 0.32, y: 0, width: node.size.width * 0.36, height: 15 },
      visual.groundFill,
      visual.stroke,
      7
    );
    drawWireframeRect(
      graphics,
      matrix,
      {
        x: node.size.width * 0.34,
        y: node.size.height - 10,
        width: node.size.width * 0.32,
        height: 4,
      },
      visual.stroke,
      undefined,
      3
    );
  }

  private createLabel(node: SceneNode, visual: PixiWireframeNodeVisual): Container {
    const label = new Container();
    const isBrowser = visual.presentation.kind === 'browser';
    const text = createPixiText(
      truncateTextToWidth(visual.presentation.label, node.size.width - (isBrowser ? 84 : 36), 5.8),
      { size: isBrowser ? 10 : 9, weight: '600', fill: isBrowser ? visual.subText : visual.text }
    );
    text.position.set(isBrowser ? 64 : 18, isBrowser ? 12 : MOBILE_STATUS_HEIGHT + 9);
    label.addChild(text);
    if (isBrowser && visual.presentation.secure) {
      const lock = createPixiText('●', { size: 7, weight: '700', fill: visual.stroke });
      lock.position.set(58, 14);
      label.addChild(lock);
    }
    return label;
  }

  private createDebug(
    node: SceneNode,
    visual: PixiWireframeNodeVisual,
    isBrowser: boolean
  ): PixiNodeDebugRecord {
    const hasMedia = Boolean(visual.presentation.imageUrl || visual.presentation.imageAssetId);
    return {
      id: node.id,
      kind: visual.presentation.kind,
      shape: isBrowser ? 'browser-frame' : 'mobile-frame',
      fill: visual.fill,
      stroke: visual.stroke,
      mediaState: visual.presentation.imageUrl
        ? 'loading'
        : visual.presentation.imageAssetId
          ? 'missing'
          : 'none',
      wireframeVariant: visual.presentation.variant,
      wireframeSecure:
        visual.presentation.kind === 'browser' ? visual.presentation.secure : undefined,
      wireframeHasMedia: hasMedia,
    };
  }
}
