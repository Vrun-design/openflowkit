import { Container, Graphics } from 'pixi.js';
import { loadProviderShapePreview } from '@/services/shapeLibrary/providerCatalog';
import { createBounds2d } from '../../domain/geometry/bounds';
import type { SceneNode } from '../../domain/document/types';
import type { Matrix2d } from '../../domain/geometry/types';
import {
  projectArchitectureNodeVisual,
  type PixiArchitectureNodeVisual,
} from './architectureNodeVisual';
import { PixiMediaLayer } from './PixiMediaLayer';
import type { PixiNodeDebugRecord, PixiMediaState } from './pixiNodeDebug';
import { drawPixiLocalRect, drawPixiNodeOutline } from './pixiNodeOutline';
import { applyPixiNodeMatrix } from './pixiNodeTransform';
import { createPixiText } from './pixiText';

export interface PixiArchitectureNodeDrawResult {
  readonly label: Container;
  readonly debug: PixiNodeDebugRecord;
}

function iconSourceLabel(visual: PixiArchitectureNodeVisual): string {
  return visual.presentation.icon.kind;
}

function mediaState(visual: PixiArchitectureNodeVisual): PixiMediaState {
  if (visual.presentation.icon.kind === 'provider' || visual.presentation.icon.kind === 'url') {
    return 'loading';
  }
  return visual.presentation.icon.kind === 'asset' ? 'missing' : 'none';
}

function iconBounds(visual: PixiArchitectureNodeVisual, node: SceneNode) {
  return visual.presentation.display === 'provider-icon'
    ? createBounds2d((node.size.width - 72) / 2 + 6, 10, 60, 60)
    : createBounds2d(14, 12, 18, 18);
}

export class PixiArchitectureNodeRenderer {
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
  ): PixiArchitectureNodeDrawResult | null {
    const visual = projectArchitectureNodeVisual(node);
    if (!visual) return null;
    const bounds = iconBounds(visual, node);
    this.drawChrome(node, matrix, graphics, visual, bounds);
    const label = this.createLabel(node, visual);
    applyPixiNodeMatrix(label, matrix);
    this.loadIcon(node.id, generation, matrix, bounds, visual);
    return {
      label,
      debug: {
        id: node.id,
        kind: visual.presentation.kind,
        shape: visual.presentation.display,
        fill: visual.fill,
        stroke: visual.stroke,
        mediaState: mediaState(visual),
        provider: visual.presentation.provider,
        iconSource: iconSourceLabel(visual),
      },
    };
  }

  private drawChrome(
    node: SceneNode,
    matrix: Matrix2d,
    graphics: Graphics,
    visual: PixiArchitectureNodeVisual,
    bounds: ReturnType<typeof createBounds2d>
  ): void {
    if (visual.presentation.display === 'architecture-card') {
      drawPixiNodeOutline(graphics, 'rounded', node.size, matrix);
      graphics.fill({ color: visual.fill }).stroke({ color: visual.stroke, width: 1.5 });
      drawPixiLocalRect(graphics, createBounds2d(10, 8, node.size.width - 20, 26), matrix, 7);
      graphics.fill({ color: visual.iconFill });
      return;
    }
    drawPixiLocalRect(graphics, createBounds2d((node.size.width - 72) / 2, 4, 72, 72), matrix, 14);
    graphics.fill({ color: visual.iconFill }).stroke({ color: visual.stroke, width: 1 });
    drawPixiLocalRect(graphics, bounds, matrix, 8);
    graphics.stroke({ color: visual.iconStroke, width: 1 });
  }

  private createLabel(node: SceneNode, visual: PixiArchitectureNodeVisual): Container {
    const content = new Container();
    const { presentation } = visual;
    if (presentation.display === 'architecture-card') {
      const provider = createPixiText(presentation.providerLabel, {
        size: 10,
        weight: '700',
        fill: visual.subText,
      });
      provider.position.set(38, 15);
      const resource = createPixiText(presentation.resourceType, {
        size: 10,
        weight: '600',
        fill: visual.subText,
      });
      resource.anchor.set(1, 0);
      resource.position.set(node.size.width - 16, 15);
      const title = createPixiText(presentation.label, {
        size: 14,
        weight: '600',
        fill: visual.text,
        wrapWidth: Math.max(1, node.size.width - 24),
      });
      title.position.set(12, 43);
      content.addChild(provider, resource, title);
      if (presentation.metadata.length > 0) {
        const metadata = createPixiText(presentation.metadata.join(' · '), {
          size: 10,
          weight: '500',
          fill: visual.subText,
          wrapWidth: Math.max(1, node.size.width - 24),
        });
        metadata.position.set(12, 67);
        content.addChild(metadata);
      }
      return content;
    }
    if (presentation.label) {
      const title = createPixiText(presentation.label, {
        size: 12,
        weight: '600',
        fill: visual.text,
        wrapWidth: Math.max(1, node.size.width - 8),
      });
      title.anchor.set(0.5, 0);
      title.position.set(node.size.width / 2, 84);
      content.addChild(title);
    }
    return content;
  }

  private loadIcon(
    nodeId: string,
    generation: number,
    matrix: Matrix2d,
    bounds: ReturnType<typeof createBounds2d>,
    visual: PixiArchitectureNodeVisual
  ): void {
    const { icon } = visual.presentation;
    if (icon.kind !== 'provider' && icon.kind !== 'url') return;
    this.mediaLayer.load({
      nodeId,
      generation,
      matrix,
      bounds,
      resolveUrl: async () => {
        if (icon.kind === 'url') return icon.url;
        const preview = await loadProviderShapePreview(icon.packId, icon.shapeId);
        return preview?.previewUrl ?? null;
      },
    });
  }
}
