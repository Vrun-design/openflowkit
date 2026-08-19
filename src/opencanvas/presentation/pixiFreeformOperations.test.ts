import { describe, expect, it } from 'vitest';
import { beginFreeformOperation, finishFreeformOperation, updateFreeformOperation } from './pixiFreeformOperations';

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
});
