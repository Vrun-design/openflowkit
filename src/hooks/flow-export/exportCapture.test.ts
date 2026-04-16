import { describe, expect, it, vi } from 'vitest';
import { createExportOptions, renderDecodedFrame } from './exportCapture';

function createMockContext() {
  return {
    fillStyle: '',
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe('renderDecodedFrame', () => {
  it('clears the frame when no background is provided', () => {
    const context = createMockContext();
    const image = {} as CanvasImageSource;

    renderDecodedFrame(context, 640, 360, image);

    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 640, 360);
    expect(context.drawImage).toHaveBeenCalledWith(image, 0, 0, 640, 360);
  });

  it('fills a solid background when a background color is provided', () => {
    const context = createMockContext();
    const image = {} as CanvasImageSource;

    renderDecodedFrame(context, 800, 600, image, '#ffffff');

    expect(context.fillStyle).toBe('#ffffff');
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 800, 600);
    expect(context.clearRect).not.toHaveBeenCalled();
  });

  it('prefers a custom background painter over transparent compositing', () => {
    const context = createMockContext();
    const image = {} as CanvasImageSource;
    const backgroundPainter = vi.fn();

    renderDecodedFrame(context, 960, 540, image, '#ffffff', backgroundPainter);

    expect(backgroundPainter).toHaveBeenCalledWith(context, 960, 540);
    expect(context.fillRect).not.toHaveBeenCalled();
    expect(context.clearRect).not.toHaveBeenCalled();
    expect(context.drawImage).toHaveBeenCalledWith(image, 0, 0, 960, 540);
  });

  it('uses a solid background for PNG exports unless transparency is explicitly requested', () => {
    const nodes = [
      {
        id: 'node-1',
        position: { x: 0, y: 0 },
        data: { label: 'Node 1' },
      },
    ] as never[];

    expect(createExportOptions(nodes, 'png').options.backgroundColor).toBe('#ffffff');
    expect(
      createExportOptions(nodes, 'png', { transparentBackground: true }).options.backgroundColor
    ).toBeNull();
    expect(createExportOptions(nodes, 'jpeg').options.backgroundColor).toBe('#ffffff');
  });
});
