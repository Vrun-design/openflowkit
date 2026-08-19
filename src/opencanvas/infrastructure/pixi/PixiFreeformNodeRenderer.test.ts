import { Assets, type Graphics, Texture } from 'pixi.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Matrix2d } from '../../domain/geometry/types';
import { createPixiSpikePage } from './spikeFixture';
import { PixiFreeformNodeRenderer } from './PixiFreeformNodeRenderer';

const IDENTITY_MATRIX: Matrix2d = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };

function graphicsStub(): Graphics {
  const graphics = {
    roundRect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
  };
  graphics.roundRect.mockReturnValue(graphics);
  graphics.fill.mockReturnValue(graphics);
  graphics.stroke.mockReturnValue(graphics);
  return graphics as unknown as Graphics;
}

afterEach(() => vi.restoreAllMocks());

describe('Pixi freeform node renderer', () => {
  it('ignores an image load from an obsolete scene generation', async () => {
    let resolveTexture: (texture: Texture) => void = () => undefined;
    const pendingTexture = new Promise<Texture>((resolve) => {
      resolveTexture = resolve;
    });
    vi.spyOn(Assets, 'load').mockImplementation(() => pendingTexture as never);
    const onMediaReady = vi.fn();
    const renderer = new PixiFreeformNodeRenderer(onMediaReady);
    const imageNode = createPixiSpikePage(7).nodes[6];

    renderer.drawNode(imageNode, IDENTITY_MATRIX, graphicsStub(), renderer.beginDraw());
    renderer.beginDraw();
    resolveTexture(new Texture());
    await pendingTexture;
    await Promise.resolve();

    expect(renderer.media.children).toHaveLength(0);
    expect(onMediaReady).not.toHaveBeenCalled();
  });

  it('adds current image media and reports readiness', async () => {
    vi.spyOn(Assets, 'load').mockResolvedValue(new Texture() as never);
    const onMediaReady = vi.fn();
    const renderer = new PixiFreeformNodeRenderer(onMediaReady);
    const imageNode = createPixiSpikePage(7).nodes[6];

    renderer.drawNode(imageNode, IDENTITY_MATRIX, graphicsStub(), renderer.beginDraw());
    await Promise.resolve();
    await Promise.resolve();

    expect(renderer.media.children).toHaveLength(1);
    expect(onMediaReady).toHaveBeenCalledWith(imageNode.id);
  });
});
