import { describe, expect, it } from 'vitest';
import { beginFreeformOperation, finishFreeformOperation, freeformPreviewPoints,
  updateFreeformEdgeScrollOperation, updateFreeformOperation } from './pixiFreeformOperations';

describe('freeform pointer operations', () => {
  it('collects pen samples and normalizes the finished node', () => {
    let operation = beginFreeformOperation(7, 'pen', { x: 10, y: 20 });
    operation = updateFreeformOperation(operation, [{ x: 15, y: 25 }, { x: 30, y: 10 }]);
    expect(finishFreeformOperation(operation, 'stroke', 'default')).toMatchObject({
      kind: 'pen', transform: { translation: { x: 10, y: 10 } }, size: { width: 20, height: 15 },
      content: { points: [{ x: 0, y: 10 }, { x: 5, y: 15 }, { x: 20, y: 0 }] },
    });
  });

  it('keeps only line endpoints and drops tap-sized marks', () => {
    let operation = beginFreeformOperation(1, 'arrow', { x: 0, y: 0 });
    operation = updateFreeformOperation(operation, [{ x: 4, y: 5 }, { x: 20, y: 30 }]);
    expect(operation.points).toEqual([{ x: 0, y: 0 }, { x: 20, y: 30 }]);
    expect(finishFreeformOperation(beginFreeformOperation(1, 'pen', { x: 0, y: 0 }), 'x', 'default')).toBeNull();
  });

  it('keeps predictions transient and collapses straight-tool prediction to its endpoint', () => {
    const pen = updateFreeformOperation(beginFreeformOperation(1, 'pen', { x: 0, y: 0 }), [
      { x: 2, y: 2 },
    ]);
    expect(freeformPreviewPoints(pen, [{ x: 3, y: 3 }])).toEqual({
      confirmed: [{ x: 0, y: 0 }, { x: 2, y: 2 }],
      predicted: [{ x: 3, y: 3 }],
    });
    expect(pen.points).toHaveLength(2);

    const line = updateFreeformOperation(beginFreeformOperation(2, 'line', { x: 0, y: 0 }), [
      { x: 5, y: 5 },
    ]);
    expect(freeformPreviewPoints(line, [{ x: 7, y: 7 }, { x: 9, y: 9 }])).toEqual({
      confirmed: [{ x: 0, y: 0 }, { x: 5, y: 5 }],
      predicted: [{ x: 9, y: 9 }],
      predictionOrigin: { x: 0, y: 0 },
    });
  });

  it('persists bounded stylus input parallel to canonical points', () => {
    let operation = beginFreeformOperation(9, 'pen', {
      x: 10, y: 10, input: { pressure: 0.2, tiltX: 10, tiltY: -20, twist: 30 },
    });
    operation = updateFreeformOperation(operation, [{
      x: 20, y: 20, input: { pressure: 0.8, tiltX: 40, tiltY: -50, twist: 60 },
    }]);

    expect(finishFreeformOperation(operation, 'stylus', 'default')?.content).toMatchObject({
      points: [{ x: 0, y: 0 }, { x: 10, y: 10 }],
      inputSamples: [
        { pressure: 0.2, tiltX: 10, tiltY: -20, twist: 30 },
        { pressure: 0.8, tiltX: 40, tiltY: -50, twist: 60 },
      ],
    });
  });

  it('extends a stationary-pointer stroke during edge scroll without losing stylus input', () => {
    const input = { pressure: 0.7, tiltX: 20, tiltY: -30, twist: 40 };
    const pen = beginFreeformOperation(9, 'pen', { x: 10, y: 10, input });
    const scrolledPen = updateFreeformEdgeScrollOperation(pen, { x: 30, y: 10 });
    expect(scrolledPen.points).toEqual([
      { x: 10, y: 10, input },
      { x: 30, y: 10, input },
    ]);

    const line = beginFreeformOperation(10, 'line', { x: 5, y: 5 });
    expect(updateFreeformEdgeScrollOperation(line, { x: 50, y: 5 }).points).toEqual([
      { x: 5, y: 5 },
      { x: 50, y: 5 },
    ]);
  });
});
