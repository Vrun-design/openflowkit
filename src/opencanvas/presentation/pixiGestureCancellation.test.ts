import { describe, expect, it, vi } from 'vitest';
import type { ProductionCanvasPointerOperation } from './pixiGestureCancellation';
import { cancelProductionCanvasGesture, operationPointerId } from './pixiGestureCancellation';

describe('production canvas gesture cancellation', () => {
  it('clears transient transform preview and releases capture', () => {
    const preview = {
      setTransformPreview: vi.fn(), setConnectorPreview: vi.fn(), setFreeformPreview: vi.fn(),
      setMarquee: vi.fn(),
    };
    const capture = { hasPointerCapture: vi.fn(() => true), releasePointerCapture: vi.fn() };
    const operation = { kind: 'transform', pointerId: 7 } as ProductionCanvasPointerOperation;

    expect(cancelProductionCanvasGesture(operation, preview, capture)).toBe(true);
    expect(preview.setTransformPreview).toHaveBeenCalledWith(null);
    expect(preview.setConnectorPreview).not.toHaveBeenCalled();
    expect(capture.releasePointerCapture).toHaveBeenCalledWith(7);
  });

  it('clears connector preview without releasing absent capture', () => {
    const preview = {
      setTransformPreview: vi.fn(), setConnectorPreview: vi.fn(), setFreeformPreview: vi.fn(),
      setMarquee: vi.fn(),
    };
    const capture = { hasPointerCapture: vi.fn(() => false), releasePointerCapture: vi.fn() };
    const operation = { kind: 'connector-edit', pointerId: 9 } as ProductionCanvasPointerOperation;

    cancelProductionCanvasGesture(operation, preview, capture);
    expect(preview.setConnectorPreview).toHaveBeenCalledWith(null);
    expect(capture.releasePointerCapture).not.toHaveBeenCalled();
  });

  it('supports camera pointer identity and null idempotence', () => {
    const camera = {
      kind: 'camera',
      gesture: {
        pointerId: 4,
        start: { x: 0, y: 0 },
        last: { x: 0, y: 0 },
        moved: false,
        axisLock: null,
        startEventAt: 0,
        lastEventAt: 0,
        velocity: { x: 0, y: 0 },
      },
      selectOnClick: true,
    } as ProductionCanvasPointerOperation;
    expect(operationPointerId(camera)).toBe(4);
    expect(cancelProductionCanvasGesture(null, null)).toBe(false);
  });

  it('clears freeform prediction without touching document state', () => {
    const preview = {
      setTransformPreview: vi.fn(), setConnectorPreview: vi.fn(), setFreeformPreview: vi.fn(),
      setMarquee: vi.fn(),
    };
    const operation = { kind: 'freeform', pointerId: 11 } as ProductionCanvasPointerOperation;

    cancelProductionCanvasGesture(operation, preview);
    expect(preview.setFreeformPreview).toHaveBeenCalledWith(null);
    expect(preview.setTransformPreview).not.toHaveBeenCalled();
    expect(preview.setConnectorPreview).not.toHaveBeenCalled();
  });

  it('clears marquee preview without mutating selection', () => {
    const preview = {
      setTransformPreview: vi.fn(), setConnectorPreview: vi.fn(), setFreeformPreview: vi.fn(),
      setMarquee: vi.fn(),
    };
    const operation = { kind: 'marquee', pointerId: 12 } as ProductionCanvasPointerOperation;

    cancelProductionCanvasGesture(operation, preview);
    expect(preview.setMarquee).toHaveBeenCalledWith(null);
  });
});
