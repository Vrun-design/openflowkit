import { describe, expect, it } from 'vitest';
import { canvasRendererLocation, requestedCanvasRenderer } from './rendererSelection';

describe('canvas renderer selection', () => {
  it('defaults unknown and absent values to React Flow', () => {
    expect(requestedCanvasRenderer('')).toBe('reactflow');
    expect(requestedCanvasRenderer('?renderer=unknown')).toBe('reactflow');
  });

  it('selects OpenCanvas only through the explicit canary value', () => {
    expect(requestedCanvasRenderer('?renderer=opencanvas')).toBe('opencanvas');
  });

  it('adds and removes renderer choice without losing unrelated route state', () => {
    const canary = canvasRendererLocation('/flow/document-1', '?panel=layers', 'opencanvas');
    expect(canary).toBe('/flow/document-1?panel=layers&renderer=opencanvas');
    expect(canvasRendererLocation('/flow/document-1', canary.split('?')[1], 'reactflow'))
      .toBe('/flow/document-1?panel=layers');
  });
});
