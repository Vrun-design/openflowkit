import { describe, expect, it } from 'vitest';
import { projectPointerSamples } from './pointerSampleProjection';

describe('pointer sample projection', () => {
  it('projects coalesced and predicted samples into world space separately', () => {
    const result = projectPointerSamples({
      clientX: 99,
      clientY: 99,
      getCoalescedEvents: () => [
        { clientX: 20, clientY: 30 },
        { clientX: 22, clientY: 32 },
      ],
      getPredictedEvents: () => [{ clientX: 24, clientY: 34 }],
    }, { x: 10, y: 20 }, (point) => ({ x: point.x / 2, y: point.y / 2 }));

    expect(result).toEqual({
      confirmed: [{ x: 5, y: 5 }, { x: 6, y: 6 }],
      predicted: [{ x: 7, y: 7 }],
    });
  });

  it('falls back to the dispatched event and drops invalid or duplicate samples', () => {
    const result = projectPointerSamples({
      clientX: 12,
      clientY: 14,
      getCoalescedEvents: () => [],
      getPredictedEvents: () => [
        { clientX: 20, clientY: 22 },
        { clientX: 20, clientY: 22 },
        { clientX: Number.NaN, clientY: 1 },
      ],
    }, { x: 2, y: 4 }, (point) => point);

    expect(result).toEqual({
      confirmed: [{ x: 10, y: 10 }],
      predicted: [{ x: 18, y: 18 }],
    });
  });

  it('carries normalized pen pressure, tilt, and twist through coalesced samples', () => {
    const result = projectPointerSamples({
      clientX: 0,
      clientY: 0,
      pointerType: 'pen',
      pressure: 0.4,
      tiltX: 20,
      tiltY: -30,
      twist: 25,
      getCoalescedEvents: () => [{ clientX: 12, clientY: 14, pressure: 2, tiltX: 120 }],
    }, { x: 2, y: 4 }, (point) => point);

    expect(result.confirmed).toEqual([{
      x: 10,
      y: 10,
      input: { pressure: 1, tiltX: 90, tiltY: -30, twist: 25 },
    }]);
  });
});
