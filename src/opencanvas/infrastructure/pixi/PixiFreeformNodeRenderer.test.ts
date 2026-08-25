import { Assets, type Graphics, Texture } from 'pixi.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Matrix2d } from '../../domain/geometry/types';
import { createTestNode } from '../../testing/builders/documentBuilder';
import { createPixiSpikePage } from './spikeFixture';
import { PixiFreeformNodeRenderer } from './PixiFreeformNodeRenderer';

const IDENTITY_MATRIX: Matrix2d = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };

function graphicsStub(): Graphics {
  const graphics = {
    roundRect: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
  };
  graphics.roundRect.mockReturnValue(graphics);
  graphics.moveTo.mockReturnValue(graphics);
  graphics.lineTo.mockReturnValue(graphics);
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

  it('renders pressure and tilt samples as variable-width segments', () => {
    const renderer = new PixiFreeformNodeRenderer(vi.fn());
    const graphics = graphicsStub();
    const pen = createTestNode('pen', {
      kind: 'pen',
      content: {
        points: [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 5 }],
        strokeWidth: 4,
        inputSamples: [
          { pressure: 0.1, tiltX: 0, tiltY: 0, twist: 0 },
          { pressure: 0.5, tiltX: 20, tiltY: 0, twist: 0 },
          { pressure: 0.9, tiltX: 60, tiltY: 0, twist: 0 },
        ],
      },
    });

    renderer.drawNode(pen, IDENTITY_MATRIX, graphics, renderer.beginDraw());

    const widths = vi.mocked(graphics.stroke).mock.calls.map(([style]) => (
      style as { width: number }
    ).width);
    expect(widths).toHaveLength(2);
    expect(widths[1]).toBeGreaterThan(widths[0]);
  });
});
